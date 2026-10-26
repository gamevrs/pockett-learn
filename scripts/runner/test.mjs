// Offline checks for the code runner (no Vercel credentials needed).
//   node scripts/runner/test.mjs
// Covers: result parsing, rate limiting, the concurrency gate, admin auth, the embedded shell scripts
// (syntax), and, when the .NET SDK is on PATH, the real Roslyn host against the C# samples.
process.env.NODE_NO_WARNINGS = "1";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PCH_SH, RUNNER_CS, RUNNER_CSPROJ, RUN_SH } from "../../src/server/runner/assets.ts";
import { checkAdmin, safeEqual } from "../../src/server/runner/auth.ts";
import { TIMEOUT_MESSAGE } from "../../src/server/runner/config.ts";
import { ConcurrencyGate, DEFAULT_MAX_CREATES_PER_MIN, RunnerBusyError, SlidingWindowLimiter, clientIp, takeCreateSlot } from "../../src/server/runner/limits.ts";
import { RunnerProtocolError, cleanToolOutput, parseRunnerOutput } from "../../src/server/runner/result.ts";
import { SAMPLES, checkSample } from "../../src/server/runner/samples.ts";
import { LANGUAGES, LIMITS, POOL_MAX_AGE_MS, POOL_SANDBOX_TIMEOUT_MS, RUN_COMMAND_TIMEOUT_MS, RUN_SANDBOX_TIMEOUT_MS, SETUP_SANDBOX_TIMEOUT_MS, SWEEP_MAX_AGE_ANY_MS, SWEEP_MAX_AGE_MS } from "../../src/server/runner/config.ts";
import { parseIdList, pastSweepLookback, positiveInt, runnerDisabled, sandboxKind, sandboxName, selectSnapshotsToDelete, slotExpired, sweepDecision } from "../../src/server/runner/cost.ts";
import { lineFrom, parseRustPanic, parseRustcError, toError } from "../../src/engine/runtimes/remote-output.ts";

let n = 0;
const check = (name, fn) => {
  fn();
  n++;
  console.log("ok  ", name);
};

// ---- result parsing ----
const M = "abc123";
const report = (o) => {
  const kv = (k, v) => `\n${M}:${k}=${v}\n`;
  let s = kv("compile_code", o.compileCode ?? 0) + kv("compile_timed_out", o.compileTimedOut ? 1 : 0);
  s += `${M}:compile_begin\n${o.compile ?? ""}\n${M}:compile_end\n`;
  if ((o.compileCode ?? 0) !== 0) return s;
  s += kv("run_code", o.runCode ?? 0) + kv("timed_out", o.timedOut ? 1 : 0) + kv("stdout_bytes", (o.stdout ?? "").length) + kv("stderr_bytes", (o.stderr ?? "").length);
  s += `${M}:stdout_begin\n${o.stdout ?? ""}\n${M}:stdout_end\n${M}:stderr_begin\n${o.stderr ?? ""}\n${M}:stderr_end\n`;
  return s;
};

check("parse: clean run keeps stdout exactly (including a missing trailing newline)", () => {
  const r = parseRunnerOutput(report({ stdout: "Hello\nno newline" }), M);
  assert.equal(r.stdout, "Hello\nno newline");
  assert.equal(r.stderr, "");
  assert.equal(r.exitCode, 0);
  assert.equal(r.compileError, null);
  assert.equal(r.timedOut, false);
});

check("parse: empty output sections", () => {
  const r = parseRunnerOutput(report({}), M);
  assert.equal(r.stdout, "");
  assert.equal(r.stderr, "");
});

check("parse: compile error keeps file/line/column and strips tool banners and temp paths", () => {
  const r = parseRunnerOutput(report({ compileCode: 1, compile: "# command-line-arguments\n./main.go:6:2: declared and not used: x" }), M);
  assert.equal(r.compileError, "./main.go:6:2: declared and not used: x");
  assert.equal(r.exitCode, null);
  assert.equal(r.stdout, "");
  const roslyn = parseRunnerOutput(report({ compileCode: 1, compile: "Program.cs(3,9): error CS0029: Cannot implicitly convert type 'string' to 'int'" }), M);
  assert.match(roslyn.compileError, /^Program\.cs\(3,9\): error CS0029/);
  const gcc = parseRunnerOutput(report({ compileCode: 1, compile: "main.cpp: In function 'int main()':\nmain.cpp:4:18: error: 'y' was not declared in this scope" }), M);
  assert.match(gcc.compileError, /main\.cpp:4:18: error/);
});

check("parse: compile timeout gets a friendly message", () => {
  const r = parseRunnerOutput(report({ compileCode: 124, compileTimedOut: true }), M);
  assert.match(r.compileError, /Compiling took too long/);
});

check("parse: failed compile with no output still says something", () => {
  assert.equal(parseRunnerOutput(report({ compileCode: 1 }), M).compileError, "Compilation failed.");
});

check("parse: run timeout becomes the friendly message, exit 137, partial stdout kept", () => {
  const r = parseRunnerOutput(report({ runCode: 124, timedOut: true, stdout: "tick\ntick" }), M);
  assert.equal(r.timedOut, true);
  assert.equal(r.exitCode, 137);
  assert.equal(r.stderr, TIMEOUT_MESSAGE);
  assert.equal(r.stdout, "tick\ntick");
});

check("parse: runtime errors keep stderr and the exit code; paths are scrubbed", () => {
  const r = parseRunnerOutput(report({ runCode: 2, stderr: "panic: boom\n\ngoroutine 1 [running]:\nmain.main()\n\t/tmp/pk-build.Ab12Cd/main.go:9 +0x1d" }), M);
  assert.equal(r.exitCode, 2);
  assert.match(r.stderr, /\tmain\.go:9 \+0x1d/);
  assert.doesNotMatch(r.stderr, /pk-build/);
});

check("parse: silent crashes get an explanation", () => {
  assert.match(parseRunnerOutput(report({ runCode: 139 }), M).stderr, /Segmentation fault/);
  assert.match(parseRunnerOutput(report({ runCode: 136 }), M).stderr, /divided by zero/);
  assert.equal(parseRunnerOutput(report({ runCode: 134, stderr: "terminate called ..." }), M).stderr, "terminate called ...");
  assert.match(parseRunnerOutput(report({ runCode: 153, stderr: "x" }), M).stderr, /too much output/);
});

check("parse: oversized output is flagged", () => {
  const r = parseRunnerOutput(report({ stdout: "x".repeat(10) }).replace(`stdout_bytes=10`, `stdout_bytes=500000`), M);
  assert.match(r.stdout, /\[output truncated\]/);
});

check("parse: output that mentions another marker can't forge a report", () => {
  const forged = `${"other"}:run_code=0`;
  const r = parseRunnerOutput(report({ runCode: 3, stdout: forged }), M);
  assert.equal(r.exitCode, 3);
});

check("parse: missing or truncated reports raise a protocol error", () => {
  assert.throws(() => parseRunnerOutput("", M), RunnerProtocolError);
  assert.throws(() => parseRunnerOutput(`\n${M}:compile_code=0\n${M}:compile_begin\n\n${M}:compile_end\n`, M), RunnerProtocolError);
});

check("cleanToolOutput normalises CRLF and temp paths", () => {
  assert.equal(cleanToolOutput("/tmp/pk-build.x1/main.go:1:1: a\r\n"), "main.go:1:1: a\n");
});

// ---- limits ----
check("rate limiter: allows up to max per window, then reports retry-after, then recovers", () => {
  let t = 1000;
  const lim = new SlidingWindowLimiter(3, 60_000, () => t);
  assert.ok(lim.hit("a").ok && lim.hit("a").ok && lim.hit("a").ok);
  const blocked = lim.hit("a");
  assert.equal(blocked.ok, false);
  assert.ok(blocked.retryAfterMs > 0 && blocked.retryAfterMs <= 60_000);
  assert.ok(lim.hit("b").ok, "other keys unaffected");
  t += 60_001;
  assert.ok(lim.hit("a").ok, "window slid");
});

check("rate limiter: blocked attempts don't extend the block, and memory stays bounded", () => {
  let t = 0;
  const lim = new SlidingWindowLimiter(1, 1000, () => t, 50);
  lim.hit("x");
  for (let i = 0; i < 100; i++) assert.equal(lim.hit("x").ok, false);
  t = 1001;
  assert.ok(lim.hit("x").ok);
  for (let i = 0; i < 500; i++) lim.hit(`ip${i}`);
  assert.ok(lim.size <= 50 + 1, `size ${lim.size}`);
});

check("concurrency gate: caps, releases once, refills", () => {
  const gate = new ConcurrencyGate(2);
  const a = gate.tryAcquire();
  const b = gate.tryAcquire();
  assert.ok(a && b);
  assert.equal(gate.tryAcquire(), null);
  a();
  a();
  assert.equal(gate.inFlight, 1);
  assert.ok(gate.tryAcquire());
});

check("clientIp prefers x-real-ip, then the first x-forwarded-for entry", () => {
  const h = (o) => ({ get: (k) => o[k] ?? null });
  assert.equal(clientIp(h({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" })), "1.1.1.1");
  assert.equal(clientIp(h({ "x-forwarded-for": "2.2.2.2, 3.3.3.3" })), "2.2.2.2");
  assert.equal(clientIp(h({})), "unknown");
});

// ---- auth ----
check("admin auth: disabled without a token, 'denied' for anything but the exact bearer token", () => {
  assert.equal(checkAdmin("Bearer x", undefined), "disabled");
  assert.equal(checkAdmin("Bearer x", ""), "disabled");
  assert.equal(checkAdmin(null, "secret"), "denied");
  assert.equal(checkAdmin("Basic secret", "secret"), "denied");
  assert.equal(checkAdmin("Bearer secre", "secret"), "denied");
  assert.equal(checkAdmin("Bearer secrett", "secret"), "denied");
  assert.equal(checkAdmin("Bearer secret", "secret"), "ok");
  assert.equal(checkAdmin("bearer   secret ", "secret"), "ok");
  assert.ok(safeEqual("a", "a") && !safeEqual("a", "b") && !safeEqual("", "a"));
});

// ---- samples ----
check("sample checker accepts good responses and rejects bad ones", () => {
  const go = SAMPLES.find((s) => s.language === "go" && s.id === "compile-error");
  assert.deepEqual(checkSample(go, { stdout: "", stderr: "", exitCode: null, compileError: "./main.go:6:2: declared and not used: x" }), []);
  assert.equal(checkSample(go, { stdout: "", stderr: "", exitCode: null, compileError: "./main.go:7:2: declared and not used: x" }).length, 1);
  assert.equal(checkSample(go, { stdout: "ok", stderr: "", exitCode: 0, compileError: null }).length, 1);
  const cs = SAMPLES.find((s) => s.language === "csharp" && s.id === "runtime-error");
  assert.deepEqual(checkSample(cs, { stdout: "before\n", stderr: "Unhandled exception. System.DivideByZeroException: x\n   at Program.<Main>$(String[] args) in Program.cs:line 3", exitCode: 134, compileError: null }), []);
  const loop = SAMPLES.find((s) => s.language === "cpp" && s.id === "infinite-loop");
  assert.deepEqual(checkSample(loop, { stdout: "", stderr: TIMEOUT_MESSAGE, exitCode: 137, compileError: null, timedOut: true }), []);
});

// ---- Rust ----
const RUSTC_E0382 = [
  "error[E0382]: borrow of moved value: `s`",
  " --> main.rs:12:20",
  "   |",
  "10 |     let s = String::from(\"hi\");",
  "   |         - move occurs because `s` has type `String`, which does not implement the `Copy` trait",
  "11 |     let t = s;",
  "   |             - value moved here",
  "12 |     println!(\"{}\", s);",
  "   |                    ^ value borrowed here after move",
  "",
  "error: aborting due to 1 previous error",
  "",
  "For more information about this error, try `rustc --explain E0382`.",
].join("\n");

check("rustc: error code, headline and line of the first error", () => {
  assert.deepEqual(parseRustcError(RUSTC_E0382), { type: "E0382", message: "borrow of moved value: `s`", line: 12 });
  assert.deepEqual(toError({ stdout: "", stderr: "", exitCode: null, compileError: RUSTC_E0382 }), { type: "E0382", message: "borrow of moved value: `s`", line: 12 });
});

check("rustc: errors without a code are CompileError; warnings and the summary line are skipped", () => {
  const text = "warning: unused variable: `x`\n --> main.rs:2:9\n\nerror: expected one of `!` or `::`, found `}`\n --> main.rs:5:1\n  |\n5 | }\n  | ^\n\nerror: aborting due to 1 previous error\n";
  assert.deepEqual(parseRustcError(text), { type: "CompileError", message: "expected one of `!` or `::`, found `}`", line: 5 });
  assert.equal(parseRustcError("error: aborting due to 1 previous error"), null);
  assert.equal(parseRustcError("main.cpp:4:18: error: 'y' was not declared in this scope"), null);
  assert.equal(parseRustcError("./main.go:6:2: declared and not used: x"), null);
});

check("rustc: several errors report the first one; a missing location gives line null", () => {
  const two = "error[E0308]: mismatched types\n --> main.rs:2:18\n\nerror[E0425]: cannot find value `y` in this scope\n --> main.rs:3:20\n";
  assert.deepEqual(parseRustcError(two), { type: "E0308", message: "mismatched types", line: 2 });
  assert.deepEqual(parseRustcError("error: linking with `cc` failed: exit status: 1"), { type: "CompileError", message: "linking with `cc` failed: exit status: 1", line: null });
});

check("rust panic: modern and legacy formats give type Panic, the line and the message", () => {
  const modern = "thread 'main' panicked at main.rs:7:5:\nindex out of bounds: the len is 3 but the index is 5\nnote: run with `RUST_BACKTRACE=1` environment variable to display a backtrace\n";
  assert.deepEqual(parseRustPanic(modern), { type: "Panic", message: "index out of bounds: the len is 3 but the index is 5", line: 7 });
  assert.deepEqual(toError({ stdout: "before", stderr: modern, exitCode: 101, compileError: null }), { type: "Panic", message: "index out of bounds: the len is 3 but the index is 5", line: 7 });
  const unwrap = "thread 'main' panicked at main.rs:3:9:\ncalled `Result::unwrap()` on an `Err` value: ParseIntError { kind: InvalidDigit }\nnote: run with `RUST_BACKTRACE=1` environment variable to display a backtrace\n";
  assert.equal(parseRustPanic(unwrap).line, 3);
  assert.match(parseRustPanic(unwrap).message, /^called `Result::unwrap\(\)` on an `Err` value/);
  assert.deepEqual(parseRustPanic("thread 'main' panicked at 'boom', main.rs:4:5\nnote: run with RUST_BACKTRACE=1"), { type: "Panic", message: "boom", line: 4 });
  assert.deepEqual(parseRustPanic("thread 'main' panicked at main.rs:9:5:\nexplicit panic"), { type: "Panic", message: "explicit panic", line: 9 });
  assert.equal(parseRustPanic("panic: boom\n\ngoroutine 1 [running]:"), null);
});

check("rust: other languages' errors keep their old shape; lineFrom reads rustc arrows", () => {
  assert.deepEqual(toError({ stdout: "", stderr: "", exitCode: null, compileError: "main.cpp:4:18: error: 'y' was not declared" }), { type: "CompileError", message: "main.cpp:4:18: error: 'y' was not declared", line: 4 });
  assert.equal(toError({ stdout: "", stderr: "panic: boom\n\ngoroutine 1 [running]:\nmain.go:9 +0x1d", exitCode: 2, compileError: null }).type, "RuntimeError");
  assert.equal(lineFrom(" --> main.rs:12:5"), 12);
  assert.equal(toError({ stdout: "", stderr: "", exitCode: 0, compileError: null }), null);
});

check("rust samples: the checker accepts rustc and panic output and rejects wrong lines", () => {
  for (const id of ["hello", "stdin", "compile-error", "infinite-loop", "runtime-error"]) assert.ok(SAMPLES.some((s) => s.language === "rust" && s.id === id), `rust sample ${id}`);
  const ce = SAMPLES.find((s) => s.language === "rust" && s.id === "compile-error");
  assert.deepEqual(checkSample(ce, { stdout: "", stderr: "", exitCode: null, compileError: "error[E0308]: mismatched types\n --> main.rs:2:18\n" }), []);
  assert.equal(checkSample(ce, { stdout: "", stderr: "", exitCode: null, compileError: "error[E0308]: mismatched types\n --> main.rs:3:18\n" }).length, 1);
  const rt = SAMPLES.find((s) => s.language === "rust" && s.id === "runtime-error");
  assert.deepEqual(checkSample(rt, { stdout: "before\n", stderr: "thread 'main' panicked at main.rs:5:20:\nindex out of bounds: the len is 3 but the index is 5\n", exitCode: 101, compileError: null }), []);
  assert.equal(checkSample(rt, { stdout: "before\n", stderr: "thread 'main' panicked at main.rs:6:20:\nindex out of bounds: x\n", exitCode: 101, compileError: null }).length, 1);
});

check("rust: config and run.sh know the language", () => {
  assert.deepEqual(LANGUAGES.rust, { file: "main.rs", label: "Rust" });
  assert.match(RUN_SH, /rust\) SRC=main\.rs/);
  assert.match(RUN_SH, /rustc --edition 2021 -C opt-level=1 -C debuginfo=0 -C codegen-units=4/);
  assert.match(RUN_SH, /RUSTUP_HOME=\/opt\/rust\/rustup CARGO_HOME=\/opt\/rust\/cargo/);
});

// ---- cost controls ----
check("lifetimes: run sandbox is compile + run + 12 s, command backstop sits below it, pool/setup are bounded", () => {
  assert.equal(RUN_SANDBOX_TIMEOUT_MS, (LIMITS.compileSeconds + LIMITS.runSeconds + 12) * 1000);
  assert.ok(RUN_SANDBOX_TIMEOUT_MS <= 30_000, "per-run ceiling stays small");
  assert.ok(RUN_COMMAND_TIMEOUT_MS < RUN_SANDBOX_TIMEOUT_MS);
  assert.ok(RUN_COMMAND_TIMEOUT_MS > (LIMITS.compileSeconds + LIMITS.runSeconds) * 1000, "backstop above the in-VM budgets");
  assert.equal(POOL_SANDBOX_TIMEOUT_MS, POOL_MAX_AGE_MS + 30_000);
  assert.ok(SETUP_SANDBOX_TIMEOUT_MS <= SWEEP_MAX_AGE_MS.setup, "sweeper never beats the setup VM's own lifetime");
  assert.ok(SWEEP_MAX_AGE_MS.run > RUN_SANDBOX_TIMEOUT_MS && SWEEP_MAX_AGE_MS.pool > POOL_SANDBOX_TIMEOUT_MS, "sweeper is only a backstop");
});

check("names: sandboxName/sandboxKind round-trip, unknown names are not ours", () => {
  for (const kind of ["run", "pool", "setup"]) {
    const name = sandboxName(kind);
    assert.match(name, new RegExp("^pk-" + kind + "-[0-9a-f]{12}$"));
    assert.equal(sandboxKind(name), kind);
  }
  assert.notEqual(sandboxName("run"), sandboxName("run"));
  assert.equal(sandboxKind("pk-weird-abc"), null);
  assert.equal(sandboxKind("pk-runner"), null);
  assert.equal(sandboxKind("sb-123"), null);
  assert.equal(sandboxKind(""), null);
});

check("sweep: per-kind age thresholds, only live sandboxes are stopped", () => {
  const now = 1_000_000_000_000;
  const at = (name, status, ageMs) => sweepDecision({ name, status, createdAt: now - ageMs }, now);
  assert.equal(at("pk-run-aaaaaaaaaaaa", "running", 119_000).stop, false);
  assert.equal(at("pk-run-aaaaaaaaaaaa", "running", 121_000).stop, true);
  assert.equal(at("pk-run-aaaaaaaaaaaa", "pending", 121_000).stop, true);
  assert.equal(at("pk-run-aaaaaaaaaaaa", "stopped", 3_600_000).stop, false);
  assert.equal(at("pk-run-aaaaaaaaaaaa", "stopping", 3_600_000).stop, false);
  assert.equal(at("pk-pool-aaaaaaaaaaaa", "running", SWEEP_MAX_AGE_MS.pool - 1000).stop, false);
  assert.equal(at("pk-pool-aaaaaaaaaaaa", "running", SWEEP_MAX_AGE_MS.pool + 1000).stop, true);
  // The 20-minute setup VM is not killed while it legitimately runs, but is after 25 minutes.
  assert.equal(at("pk-setup-aaaaaaaaaaaa", "running", 20 * 60_000).stop, false);
  assert.equal(at("pk-setup-aaaaaaaaaaaa", "running", 26 * 60_000).stop, true);
  // Unrecognised names (older code): the 25-minute cap.
  assert.equal(at("random-name", "running", 10 * 60_000).stop, false);
  assert.equal(at("random-name", "running", SWEEP_MAX_AGE_ANY_MS + 1000).stop, true);
  assert.equal(at("random-name", "running", SWEEP_MAX_AGE_ANY_MS + 1000).kind, "any");
  assert.equal(at("pk-run-aaaaaaaaaaaa", "running", -5000).stop, false, "clock skew never counts as old");
});

check("sweep: lookback ends paging past 24 h", () => {
  const now = 2_000_000_000_000;
  assert.equal(pastSweepLookback(now - 3_600_000, now), false);
  assert.equal(pastSweepLookback(now - 25 * 3_600_000, now), true);
});

check("pool: idle, age and use limits retire only idle slots", () => {
  const limits = { maxAgeMs: 240_000, maxUses: 40, idleMs: 40_000 };
  const now = 10_000_000;
  const slot = (o) => ({ busy: false, bornAt: now - 10_000, lastUsedAt: now - 5_000, uses: 3, ...o });
  assert.equal(slotExpired(slot({}), now, limits), false);
  assert.equal(slotExpired(slot({ lastUsedAt: now - 40_000 }), now, limits), true, "idle too long");
  assert.equal(slotExpired(slot({ bornAt: now - 240_000 }), now, limits), true, "too old");
  assert.equal(slotExpired(slot({ uses: 40 }), now, limits), true, "used up");
  assert.equal(slotExpired(slot({ busy: true, bornAt: now - 999_999, lastUsedAt: 0, uses: 99 }), now, limits), false, "never retire a busy slot");
});

check("snapshots: keep the new and the live one, delete the rest, skip already-deleted", () => {
  const snaps = [
    { id: "snap_new", status: "created" },
    { id: "snap_live", status: "created" },
    { id: "snap_old1", status: "created" },
    { id: "snap_old2", status: "failed" },
    { id: "snap_gone", status: "deleted" },
    { id: "snap_old1", status: "created" },
  ];
  assert.deepEqual(selectSnapshotsToDelete(snaps, ["snap_new", "snap_live"]), ["snap_old1", "snap_old2"]);
  assert.deepEqual(selectSnapshotsToDelete(snaps, ["snap_new", undefined]), ["snap_live", "snap_old1", "snap_old2"]);
  assert.deepEqual(selectSnapshotsToDelete(snaps, snaps.map((s) => s.id)), []);
  assert.deepEqual(selectSnapshotsToDelete([], ["snap_new"]), []);
  assert.deepEqual(parseIdList(" a, b  c,,"), ["a", "b", "c"]);
  assert.deepEqual(parseIdList(undefined), []);
});

check("kill switch: RUNNER_DISABLED parsing", () => {
  for (const v of ["1", "true", "TRUE", " yes ", "on"]) assert.equal(runnerDisabled(v), true, v);
  for (const v of [undefined, "", "0", "false", "no", "off"]) assert.equal(runnerDisabled(v), false, String(v));
  assert.equal(positiveInt("7", 3), 7);
  assert.equal(positiveInt("0", 3), 3);
  assert.equal(positiveInt("abc", 3), 3);
  assert.equal(positiveInt(undefined, 3), 3);
});

check("creation guard: global per-minute cap throws RunnerBusyError with a retry hint", () => {
  process.env.RUNNER_MAX_CREATES_PER_MIN = "3";
  try {
    // The guard reads the env once, on first use.
    for (let i = 0; i < 3; i++) takeCreateSlot();
    assert.throws(() => takeCreateSlot(), (err) => err instanceof RunnerBusyError && err.retryAfterMs > 0 && err.retryAfterMs <= 60_000);
  } finally {
    delete process.env.RUNNER_MAX_CREATES_PER_MIN;
  }
  assert.equal(DEFAULT_MAX_CREATES_PER_MIN, 120);
});

// ---- embedded scripts ----
check("embedded shell scripts have valid bash syntax", () => {
  const dir = mkdtempSync(join(tmpdir(), "pk-sh-"));
  try {
    for (const [name, text] of [["run.sh", RUN_SH], ["pch.sh", PCH_SH]]) {
      const file = join(dir, name);
      writeFileSync(file, text);
      const r = spawnSync("bash", ["-n", file], { encoding: "utf8" });
      assert.equal(r.status, 0, `${name}: ${r.stderr}`);
    }
    assert.ok(!RUN_SH.includes("\r"), "run.sh must use LF endings");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ---- Roslyn host (needs the .NET SDK; skipped otherwise) ----
const sdk = spawnSync("dotnet", ["--version"], { encoding: "utf8" });
if (sdk.status !== 0 || !/^10\./.test(sdk.stdout.trim()) || process.argv.includes("--skip-dotnet")) {
  console.log(`skip  Roslyn host (needs the .NET 10 SDK; found ${sdk.status === 0 ? sdk.stdout.trim() : "none"})`);
} else {
  const dir = mkdtempSync(join(tmpdir(), "pk-roslyn-"));
  // No shell: a timeout must kill dotnet itself, not a wrapper around it.
  const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: "utf8", ...opts });
  try {
    const hostDir = join(dir, "host");
    mkdirSync(hostDir);
    writeFileSync(join(hostDir, "Runner.csproj"), RUNNER_CSPROJ);
    writeFileSync(join(hostDir, "Runner.cs"), RUNNER_CS);
    const build = run("dotnet", ["publish", "Runner.csproj", "-c", "Release", "-o", join(dir, "runner"), "-nologo", "-v", "q"], { cwd: hostDir });
    assert.equal(build.status, 0, `dotnet publish failed:\n${build.stdout}\n${build.stderr}`);
    const runnerDll = join(dir, "runner", "Runner.dll");

    for (const sample of SAMPLES.filter((s) => s.language === "csharp")) {
      const work = join(dir, `work-${sample.id}-${n}`);
      mkdirSync(work);
      writeFileSync(join(work, "Program.cs"), sample.source);
      const t0 = performance.now();
      const compiled = run("dotnet", [runnerDll, "Program.cs", work], { cwd: work });
      const compileMs = Math.round(performance.now() - t0);
      let res;
      if (compiled.status !== 0) {
        res = { stdout: "", stderr: "", exitCode: null, compileError: compiled.stdout.trim() || "Compilation failed.", timedOut: false };
      } else {
        const t1 = performance.now();
        const ran = run("dotnet", [join(work, "program.dll")], { cwd: work, input: sample.stdin ?? "", timeout: 3000, killSignal: "SIGKILL" });
        const runMs = Math.round(performance.now() - t1);
        const timedOut = ran.error?.code === "ETIMEDOUT" || ran.signal === "SIGKILL";
        res = { stdout: ran.stdout ?? "", stderr: timedOut ? TIMEOUT_MESSAGE : (ran.stderr ?? ""), exitCode: timedOut ? 137 : ran.status, compileError: null, timedOut };
        console.log(`      c# ${sample.id}: compile ${compileMs} ms, run ${runMs} ms`);
      }
      const problems = checkSample(sample, res);
      assert.deepEqual(problems, [], `csharp/${sample.id}: ${problems.join("; ")}\n${JSON.stringify(res, null, 1).slice(0, 600)}`);
      n++;
      console.log("ok   Roslyn host: csharp", sample.id, sample.expect.compileError ? "(" + res.compileError.split("\n")[0] + ")" : "");
    }
    // Several diagnostics keep their own lines, and a classic Main in a namespace works too.
    const work = join(dir, "work-extra");
    mkdirSync(work);
    writeFileSync(join(work, "Program.cs"), "namespace Demo\n{\n    class Program\n    {\n        static void Main(string[] args)\n        {\n            int a = \"x\";\n            string b = 5;\n        }\n    }\n}\n");
    const bad = run("dotnet", [runnerDll, "Program.cs", work], { cwd: work });
    assert.equal(bad.status, 1);
    assert.match(bad.stdout, /Program\.cs\(7,\d+\): error CS0029/);
    assert.match(bad.stdout, /Program\.cs\(8,\d+\): error CS0029/);
    n++;
    console.log("ok   Roslyn host: multiple diagnostics keep their line numbers");
  } finally {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

console.log(`\n${n} checks passed`);
