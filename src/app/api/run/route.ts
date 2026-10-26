import { after } from "next/server";
import { APIError } from "@vercel/sandbox";
import { LIMITS, UNAVAILABLE_MESSAGE, isRunnerLanguage } from "@/server/runner/config";
import { runSandboxed, runnerMode } from "@/server/runner/execute";
import { runnerDisabled } from "@/server/runner/cost";
import { ConcurrencyGate, RunnerBusyError, SlidingWindowLimiter, clientIp } from "@/server/runner/limits";
import { RunnerProtocolError, RunnerUnavailableError } from "@/server/runner/result";

/**
 * Sandboxed code runner for compiled languages (C#, C++, Go, Rust).
 *
 * Each request runs in a Vercel Sandbox (Firecracker microVM, no network) created from the toolchain
 * snapshot in RUNNER_SNAPSHOT_ID. Build that snapshot with POST /api/run/setup or
 * scripts/runner/build-snapshot.mjs. Auth is the deployment's Vercel OIDC token (picked up by the SDK).
 *
 * POST { language, source, stdin? } -> { stdout, stderr, exitCode, compileError, timedOut }
 *   or { error } with a non-2xx status. The browser side is src/engine/runtimes/remote.ts.
 */

// Compile (<= 10 s) + run (<= 3 s) + sandbox create/teardown, with headroom.
export const maxDuration = 60;

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

// Per server instance (best effort on serverless; see src/server/runner/limits.ts).
const perIp = new SlidingWindowLimiter(envInt("RUNNER_RATE_PER_MIN", 30), 60_000);
const inFlight = new ConcurrencyGate(envInt("RUNNER_MAX_CONCURRENCY", 8));

function reply(body: Record<string, unknown>, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

function tooBusy(retryAfterSeconds: number, why: "fast" | "busy" = "busy") {
  const error = why === "fast"
    ? "You're running code very quickly. Wait a few seconds and try again."
    : "Busy right now. Wait a few seconds and run again.";
  return reply({ error }, 429, { "Retry-After": String(retryAfterSeconds) });
}

export async function POST(request: Request) {
  // Kill switch: RUNNER_DISABLED=1 stops all spending at once, before anything (even parsing) happens.
  if (runnerDisabled(process.env.RUNNER_DISABLED)) return reply({ error: UNAVAILABLE_MESSAGE }, 503, { "Retry-After": "300" });

  const snapshotId = process.env.RUNNER_SNAPSHOT_ID;
  if (!snapshotId) return reply({ error: "Running code isn't available yet. Please try again later." }, 503);

  // Browsers on other sites have no business calling this.
  if (request.headers.get("sec-fetch-site") === "cross-site") return reply({ error: "Not allowed." }, 403);

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > 4 * (LIMITS.maxSource + LIMITS.maxStdin)) {
    return reply({ error: "That program is too large to run." }, 413);
  }

  let body: { language?: unknown; source?: unknown; stdin?: unknown };
  try {
    body = await request.json();
  } catch {
    return reply({ error: "Invalid request." }, 400);
  }
  if (typeof body !== "object" || body === null || !isRunnerLanguage(body.language) || typeof body.source !== "string") {
    return reply({ error: "Unsupported language." }, 400);
  }
  const stdin = typeof body.stdin === "string" ? body.stdin : "";
  if (Buffer.byteLength(body.source, "utf8") > LIMITS.maxSource || Buffer.byteLength(stdin, "utf8") > LIMITS.maxStdin) {
    return reply({ error: "That program is too large to run." }, 413);
  }

  const limited = perIp.hit(clientIp(request.headers));
  if (!limited.ok) return tooBusy(Math.ceil(limited.retryAfterMs / 1000), "fast");
  const release = inFlight.tryAcquire();
  if (!release) return tooBusy(3);

  try {
    const { result, timings } = await runSandboxed(
      snapshotId,
      { language: body.language, source: body.source, stdin },
      (work) => after(() => work),
    );
    console.log(`[runner] ${body.language} mode=${runnerMode()} create=${timings.createMs}ms exec=${timings.execMs}ms total=${timings.totalMs}ms reused=${timings.reused} exit=${result.exitCode} compileError=${Boolean(result.compileError)} timedOut=${result.timedOut}`);
    return reply({ ...result });
  } catch (err) {
    console.error("[runner] run failed", err);
    if (err instanceof RunnerBusyError) return tooBusy(Math.max(1, Math.ceil(err.retryAfterMs / 1000)));
    if (err instanceof RunnerUnavailableError) return reply({ error: UNAVAILABLE_MESSAGE }, 503);
    if (err instanceof RunnerProtocolError) {
      return reply({ error: "Something unexpected happened. Try again in a moment." }, 502);
    }
    if (err instanceof APIError) {
      const status = err.response.status;
      if (status === 429) return tooBusy(5);
      if (status === 404 || status === 410) return reply({ error: "Running code isn't available right now. Please try again later." }, 503);
    }
    return reply({ error: "Your code didn't run. Try again in a moment." }, 502);
  } finally {
    release();
  }
}
