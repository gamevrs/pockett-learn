import { Sandbox } from "@vercel/sandbox";
import { checkAdmin } from "@/server/runner/auth";
import { pastSweepLookback, sweepDecision } from "@/server/runner/cost";

/**
 * Stale-sandbox sweeper (defense in depth for cost): lists this project's sandboxes and stops any live
 * one that has outlived its kind's limit (see SWEEP_MAX_AGE_MS in src/server/runner/config.ts: run 2 min,
 * pool 6.5 min, setup and anything unrecognised 25 min). Normal operation never needs it: every sandbox
 * has a hard platform timeout and is stopped by the request that made it. This catches the cases where
 * those failed (function killed mid-run, a stop call that errored, a leaked pool VM).
 *
 * Called by Vercel Cron every 10 minutes (vercel.json). Cron sends `Authorization: Bearer $CRON_SECRET`;
 * with CRON_SECRET unset the route answers 404, with a wrong token 401.
 */
export const maxDuration = 60;

const MAX_PAGES = 20;
// The sandboxes API rejects pages larger than 50.
const PAGE_SIZE = 50;
const STOP_BATCH = 10;

export async function GET(request: Request) {
  const access = checkAdmin(request.headers.get("authorization"), process.env.CRON_SECRET);
  if (access === "disabled") return new Response(null, { status: 404 });
  if (access === "denied") return Response.json({ error: "Unauthorized." }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });

  const now = Date.now();
  const doomed: { name: string; kind: string; ageSeconds: number }[] = [];
  let seen = 0;
  let live = 0;
  try {
    const first = await Sandbox.list({ limit: PAGE_SIZE, sortBy: "createdAt", sortOrder: "desc", signal: AbortSignal.timeout(20_000) });
    let pages = 0;
    scan: for await (const page of first.pages()) {
      for (const sb of page.sandboxes) {
        // Newest first: anything this old that is still "running" would long since have hit its timeout.
        if (pastSweepLookback(sb.createdAt, now)) break scan;
        seen++;
        if (sb.status === "running" || sb.status === "pending") live++;
        const decision = sweepDecision({ name: sb.name, status: sb.status, createdAt: sb.createdAt }, now);
        if (decision.stop) doomed.push({ name: sb.name, kind: decision.kind, ageSeconds: Math.round(decision.ageMs / 1000) });
      }
      if (++pages >= MAX_PAGES) break;
    }
  } catch (err) {
    console.error("[runner:sweep] listing failed", err);
    return Response.json({ ok: false, error: "Could not list sandboxes." }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  const stopped: string[] = [];
  const failed: string[] = [];
  for (let i = 0; i < doomed.length; i += STOP_BATCH) {
    const batch = doomed.slice(i, i + STOP_BATCH);
    await Promise.all(
      batch.map(async (d) => {
        try {
          const sandbox = await Sandbox.get({ name: d.name, signal: AbortSignal.timeout(20_000) });
          await sandbox.stop({ signal: AbortSignal.timeout(20_000) });
          stopped.push(d.name);
          console.log(`[runner:sweep] stopped ${d.name} (kind=${d.kind}, age=${d.ageSeconds}s)`);
        } catch (err) {
          failed.push(d.name);
          console.error(`[runner:sweep] could not stop ${d.name}`, err);
        }
      }),
    );
  }

  console.log(`[runner:sweep] checked=${seen} live=${live} stopped=${stopped.length} failed=${failed.length}`);
  return Response.json({ ok: failed.length === 0, checked: seen, live, stopped, failed }, { headers: { "Cache-Control": "no-store" } });
}
