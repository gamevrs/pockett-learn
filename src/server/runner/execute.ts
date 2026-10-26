import { randomBytes } from "node:crypto";
import { Sandbox } from "@vercel/sandbox";
import { LANGUAGES, LIMITS, POOL_IDLE_MS, POOL_MAX_AGE_MS, POOL_MAX_USES, POOL_SANDBOX_TIMEOUT_MS, RUN_COMMAND_TIMEOUT_MS, RUN_SANDBOX_TIMEOUT_MS, SNAPSHOT_PATHS } from "./config.ts";
import type { RunResponse, RunnerLanguage, SandboxKind } from "./config.ts";
import { sandboxName, slotExpired } from "./cost.ts";
import { takeCreateSlot } from "./limits.ts";
import { RunnerUnavailableError, parseRunnerOutput } from "./result.ts";

/**
 * Runs one program in a Vercel Sandbox (Firecracker microVM) created from the toolchain snapshot.
 * Authentication is the Vercel OIDC token the SDK finds on its own (VERCEL_OIDC_TOKEN, injected on
 * deployments, pulled by `vercel env pull` locally), so there are no long-lived secrets here.
 *
 * Two strategies, chosen with RUNNER_MODE:
 *  - "fresh" (default): a new microVM per run, destroyed right after. Strongest isolation: nothing
 *    one learner does can be seen by the next.
 *  - "pool": a few warm microVMs per server instance, reused for a few minutes. Saves the create
 *    cost on every run; see docs/ARCHITECTURE.md for the isolation trade-off. Trades a small idle cost
 *    (a warm VM bills until it is retired, at most POOL_IDLE_MS after its last run, and never past
 *    POOL_SANDBOX_TIMEOUT_MS) for latency. Off by default.
 *
 * Cost safety: every sandbox gets a hard platform `timeout` and a `pk-<kind>-<random>` name, and
 * /api/run/sweep stops stragglers (see cost.ts and docs/ARCHITECTURE.md, "Cost controls").
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

function vcpus(): number {
  const n = Number(process.env.RUNNER_VCPUS);
  return Number.isInteger(n) && n >= 1 ? n : 2;
}

export function runnerMode(): "fresh" | "pool" {
  return process.env.RUNNER_MODE === "pool" ? "pool" : "fresh";
}

async function createSandbox(snapshotId: string, kind: SandboxKind, timeoutMs: number): Promise<Sandbox> {
  // Global cost guard: throws RunnerBusyError (the route answers 429) when too many creations per minute.
  takeCreateSlot();
  return Sandbox.create({
    name: sandboxName(kind),
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
    // Backstop above the in-VM `timeout`s (compile + run + kill grace + overhead), below the sandbox's own lifetime.
    timeoutMs: RUN_COMMAND_TIMEOUT_MS,
  });
  // run.sh exits 64 for a language it was not built with: the snapshot predates it.
  if (finished.exitCode === 64) throw new RunnerUnavailableError();
  return parseRunnerOutput(await finished.stdout(), marker);
}

/** One microVM per run. */
export async function runFresh(snapshotId: string, req: RunRequest, defer: Defer = noDefer): Promise<RunOutcome> {
  const t0 = performance.now();
  const sandbox = await createSandbox(snapshotId, "run", RUN_SANDBOX_TIMEOUT_MS);
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
  lastUsedAt: number;
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

const POOL_LIMITS = { maxAgeMs: POOL_MAX_AGE_MS, maxUses: POOL_MAX_USES, idleMs: POOL_IDLE_MS };

/** Stops every idle slot that is too old, over-used or unused for POOL_IDLE_MS. */
function retireExpired(defer: Defer) {
  const now = Date.now();
  for (const s of [...slots]) {
    if (slotExpired(s, now, POOL_LIMITS)) retire(s, defer);
  }
}

/**
 * Idle VMs are only noticed when a request arrives, so after each run a deferred task wakes up just
 * past the idle limit and retires whatever is still idle. The last run on an instance therefore always
 * schedules the check that stops its VM. (It runs inside after(), so it must finish within the route's
 * maxDuration: POOL_IDLE_MS + 1 s stays far below it.)
 */
function scheduleIdleCheck(defer: Defer) {
  defer(
    new Promise<void>((resolve) => {
      setTimeout(() => {
        try {
          retireExpired(defer);
        } finally {
          resolve();
        }
      }, POOL_IDLE_MS + 1000);
    }),
  );
}

export async function runPooled(snapshotId: string, req: RunRequest, defer: Defer = noDefer): Promise<RunOutcome> {
  const t0 = performance.now();
  for (let attempt = 0; ; attempt++) {
    retireExpired(defer);

    let slot = slots.find((s) => !s.busy);
    const reused = Boolean(slot);
    if (slot) {
      slot.busy = true; // claimed synchronously so no other request takes it
    } else {
      const sandbox = await createSandbox(snapshotId, "pool", POOL_SANDBOX_TIMEOUT_MS);
      slot = { sandbox, bornAt: Date.now(), lastUsedAt: Date.now(), uses: 0, busy: true, tracked: slots.length < poolSize() };
      if (slot.tracked) slots.push(slot);
    }
    const ready = performance.now();
    slot.uses++;

    try {
      const result = await execOnSandbox(slot.sandbox, req);
      const end = performance.now();
      slot.busy = false;
      slot.lastUsedAt = Date.now();
      if (!slot.tracked || slot.uses >= POOL_MAX_USES) retire(slot, defer);
      else scheduleIdleCheck(defer);
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
