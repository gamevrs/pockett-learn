import { checkAdmin } from "@/server/runner/auth";
import { buildSnapshot } from "@/server/runner/provision";

/**
 * Admin-only: builds the runner's toolchain snapshot (see src/server/runner/provision.ts) and
 * returns its id. Set that id as RUNNER_SNAPSHOT_ID and redeploy.
 *
 *   curl -X POST -H "Authorization: Bearer $RUNNER_ADMIN_TOKEN" https://<your-domain>/api/run/setup
 *
 * Cost: the build sandbox is stopped when this finishes (and has a 20-minute platform lifetime); a snapshot
 * that fails its self-test is deleted, and after a good build older snapshots are deleted except the new one
 * and the current RUNNER_SNAPSHOT_ID. The report's `cleanup` lists every deletion.
 *
 * Answers 404 when RUNNER_ADMIN_TOKEN isn't set, so the route doesn't advertise itself.
 * The install downloads toolchains and takes several minutes: 800 s is the Pro / Fluid compute maximum.
 */
export const maxDuration = 800;

let building = false;

export async function POST(request: Request) {
  const access = checkAdmin(request.headers.get("authorization"), process.env.RUNNER_ADMIN_TOKEN);
  if (access === "disabled") return new Response(null, { status: 404 });
  if (access === "denied") return Response.json({ error: "Unauthorized." }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });

  if (building) return Response.json({ error: "A snapshot build is already running on this instance." }, { status: 409 });
  building = true;
  const log: string[] = [];
  try {
    const report = await buildSnapshot((line) => {
      log.push(line);
      console.log(`[runner:setup] ${line}`);
    });
    return Response.json(
      {
        ...report,
        next: report.ok
          ? `Set RUNNER_SNAPSHOT_ID=${report.snapshotId} in the project's environment variables and redeploy.`
          : report.cleanup.newSnapshotDeleted
            ? `The snapshot ${report.snapshotId} failed its self-test (see selfTest) and was deleted. Keep RUNNER_SNAPSHOT_ID as it is.`
            : `The snapshot ${report.snapshotId} failed its self-test (see selfTest) and could not be deleted automatically (see cleanup.errors): delete it by hand and don't use it.`,
        log,
      },
      { status: report.ok ? 200 : 500, headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[runner:setup] failed", err);
    return Response.json({ ok: false, error: err instanceof Error ? err.message : String(err), log }, { status: 500, headers: { "Cache-Control": "no-store" } });
  } finally {
    building = false;
  }
}
