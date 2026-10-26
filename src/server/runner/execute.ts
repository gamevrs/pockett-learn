import { randomBytes } from "node:crypto";
import { Sandbox } from "@vercel/sandbox";
import { LANGUAGES, LIMITS, SNAPSHOT_PATHS } from "./config.ts";
import type { RunResponse, RunnerLanguage } from "./config.ts";
import { parseRunnerOutput } from "./result.ts";

/**
 * Runs one program in a Vercel Sandbox (Firecracker microVM) created from the toolchain snapshot.
 * Authentication is the Vercel OIDC token the SDK finds on its own (VERCEL_OIDC_TOKEN, injected on
 * deployments, pulled by `vercel env pull` locally), so there are no long-lived secrets here.
 *
 * Two strategies, chosen with RUNNER_MODE:
 *  - "fresh" (default): a new microVM per run, destroyed right after. Strongest isolation: nothing
 *    one learner does can be seen by the next.
 *  - "pool": a few warm microVMs per server instance, reused for a few minutes. Saves the create
 *    cost on every run; see docs/ARCHITECTURE.md for the isolation trade-off.
 */

export interface RunRequest {
  language: RunnerLanguage;
  source: string;
  stdin: string;
}

export interface RunTimings {
  /** Time to get a ready sandbox (0 when a warm one was reused). */
  createMs: number;
  /** Time to write files, compile and run (includes the 3 s / 10 s budgets when they are hit). */
  execMs: number;
  totalMs: number;
  reused: boolean;
}

export interface RunOutcome {
  result: RunResponse;
  timings: RunTimings;
}

/** Schedules background work that must outlive the response (route passes next/server's `after`). */
export type Defer = (work: Promise<unknown>) => void;

const noDefer: Defer = (work) => {
  void work;
};

const DEFAULT_CWD = "/vercel/sandbox";
const POOL_MAX_AGE_MS = 4 * 60_000;
const POOL_MAX_USES = 40;

function vcpus(): number {
  const n = Number(process.env.RUNNER_VCPUS);
  return Number.isInteger(n) && n >= 1 ? n : 2;
}

export function runnerMode(): "fresh" | "pool" {
  return process.env.RUNNER_MODE === "pool" ? "pool" : "fresh";
}

async function createSandbox(snapshotId: string, timeoutMs: number): Promise<Sandbox> {
  return Sandbox.create({
    source: { type: "snapshot", snapshotId },
    resources: { vcpus: vcpus() },
    timeout: timeoutMs,
    // No egress at all, DNS included: learner code can't reach the internet or anything internal.
    networkPolicy: "deny-all",
    // Throwaway: don't snapshot on stop.
    persistent: false,
    signal: AbortSignal.timeout(30_000),
  });
}

function stopQuietly(sandbox: Sandbox): Promise<void> {
  return sandbox.stop().then(
    () => undefined,
    (err: unknown) => {
      console.error("[runner] failed to stop sandbox", sandbox.name, err);
    },
  );
}

/** Writes the program and runs run.sh inside an already-running sandbox. */
export async function execOnSandbox(sandbox: Sandbox, req: RunRequest): Promise<RunResponse> {
  const cwd = sandbox.cwd || DEFAULT_CWD;
  const marker = randomBytes(12).toString("hex");
  await sandbox.writeFiles([
    { path: LANGUAGES[req.language].file, content: Buffer.from(req.source, "utf8") },
    { path: "stdin.txt", content: Buffer.from(req.stdin, "utf8") },
  ]);
  const finished = await sandbox.runCommand({
    cmd: "bash",
    args: [SNAPSHOT_PATHS.runScript, req.language, cwd, marker, String(LIMITS.compileSeconds), String(LIMITS.runSeconds), String(LIMITS.maxOutput)],
    sudo: true,
    // Backstop above the in-VM `timeout`s (compile + run + kill grace + overhead).
    timeoutMs: (LIMITS.compileSeconds + LIMITS.runSeconds + 10) * 1000,
  });
  return parseRunnerOutput(await finished.stdout(), marker);
}

/** One microVM per run. */
export async function runFresh(snapshotId: string, req: RunRequest, defer: Defer = noDefer): Promise<RunOutcome> {
  const t0 = performance.now();
  const sandbox = await createSandbox(snapshotId, 60_000);
  const created = performance.now();
  try {
    const result = await execOnSandbox(sandbox, req);
    const end = performance.now();
    return { result, timings: { createMs: Math.round(created - t0), execMs: Math.round(end - created), totalMs: Math.round(end - t0), reused: false } };
  } finally {
    // Always stopped; the response doesn't wait for the VM to finish shutting down.
    defer(stopQuietly(sandbox));
  }
}

// ---- warm pool ----

interface Slot {
  sandbox: Sandbox;
  bornAt: number;
  uses: number;
  busy: boolean;
  tracked: boolean;
}

const slots: Slot[] = [];

function poolSize(): number {
  const n = Number(process.env.RUNNER_POOL_SIZE);
  return Number.isInteger(n) && n >= 1 ? n : 3;
}

function retire(slot: Slot, defer: Defer) {
  const at = slots.indexOf(slot);
  if (at >= 0) slots.splice(at, 1);
  defer(stopQuietly(slot.sandbox));
}

export async function runPooled(snapshotId: string, req: RunRequest, defer: Defer = noDefer): Promise<RunOutcome> {
  const t0 = performance.now();
  for (let attempt = 0; ; attempt++) {
    const now = Date.now();
    for (const s of [...slots]) {
      if (!s.busy && (now - s.bornAt >= POOL_MAX_AGE_MS || s.uses >= POOL_MAX_USES)) retire(s, defer);
    }

    let slot = slots.find((s) => !s.busy);
    const reused = Boolean(slot);
    if (slot) {
      slot.busy = true; // claimed synchronously so no other request takes it
    } else {
      const sandbox = await createSandbox(snapshotId, POOL_MAX_AGE_MS + 2 * 60_000);
      slot = { sandbox, bornAt: Date.now(), uses: 0, busy: true, tracked: slots.length < poolSize() };
      if (slot.tracked) slots.push(slot);
    }
    const ready = performance.now();
    slot.uses++;

    try {
      const result = await execOnSandbox(slot.sandbox, req);
      const end = performance.now();
      slot.busy = false;
      if (!slot.tracked || slot.uses >= POOL_MAX_USES) retire(slot, defer);
      return { result, timings: { createMs: reused ? 0 : Math.round(ready - t0), execMs: Math.round(end - ready), totalMs: Math.round(end - t0), reused } };
    } catch (err) {
      // A warm VM can have expired or died between requests: drop it and retry once on a new one.
      retire(slot, defer);
      if (!reused || attempt >= 1) throw err;
    }
  }
}

export function runSandboxed(snapshotId: string, req: RunRequest, defer: Defer = noDefer): Promise<RunOutcome> {
  return runnerMode() === "pool" ? runPooled(snapshotId, req, defer) : runFresh(snapshotId, req, defer);
}
