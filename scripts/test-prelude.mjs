// Unit tests for the hidden-prelude line mapping in src/engine/runtimes/remote-output.ts, replayed against real
// runner replies recorded for C#, Go and Rust (scripts/fixtures/prelude-runner.json). No network.
//   node scripts/test-prelude.mjs
process.env.NODE_NO_WARNINGS = "1";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PRELUDE_NAME, prepareSource, shiftResult, toError } from "../src/engine/runtimes/remote-output.ts";

const cases = JSON.parse(readFileSync(new URL("./fixtures/prelude-runner.json", import.meta.url), "utf8"));
let n = 0;
for (const c of cases) {
  const prepared = prepareSource(c.prelude, c.source, c.language);
  // the prelude goes after the learner's code for C# (top-level statements first), in front otherwise
  if (c.language === "csharp") assert.ok(prepared.source.startsWith(c.source), `${c.id}: C# prelude is appended`);
  else assert.ok(prepared.source.endsWith(c.source), `${c.id}: prelude is prepended`);
  const shifted = shiftResult(c.raw, prepared);
  const error = toError(shifted);
  const text = `${shifted.compileError ?? ""}\n${shifted.stderr ?? ""}`;
  if (c.expect.stdout !== undefined) assert.equal(c.raw.stdout.trim(), c.expect.stdout, `${c.id}: output`);
  if (c.expect.line !== undefined) assert.equal(error?.line, c.expect.line, `${c.id}: learner line`);
  if (c.expect.mentionsPrelude) assert.ok(text.includes(PRELUDE_NAME), `${c.id}: names the provided code`);
  const userLines = c.source.split("\n").length - 1;
  for (const m of text.matchAll(/\b(?:main\.go|main\.rs|main\.cpp|Program\.cs)(?::|\(|:line )(\d+)/g)) {
    assert.ok(Number(m[1]) >= 1 && Number(m[1]) <= userLines, `${c.id}: "${m[0]}" is not one of the learner's ${userLines} lines`);
  }
  n++;
  console.log("ok  ", c.id);
}
assert.deepEqual(prepareSource(undefined, "x\n", "go"), { source: "x\n", offset: 0 });
assert.equal(shiftResult({ stdout: "", stderr: "main.go:3", exitCode: 1, compileError: null }, { offset: 0 }).stderr, "main.go:3");
console.log(`\n${n + 2} prelude checks passed`);
