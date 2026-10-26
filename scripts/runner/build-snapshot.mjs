// Builds the code-runner toolchain snapshot from a developer machine (same routine as POST /api/run/setup).
//
//   vercel link && vercel env pull .env.local     # gives the SDK a short-lived Vercel OIDC token
//   node scripts/runner/build-snapshot.mjs
//
// Prints the snapshot id. Set it as RUNNER_SNAPSHOT_ID in the project's environment variables and redeploy.
// The OIDC token from `vercel env pull` expires after 12 hours; pull again if you see auth errors.
// Without a linked project you can pass an access token instead:
//   VERCEL_TOKEN=... VERCEL_TEAM_ID=... VERCEL_PROJECT_ID=... node scripts/runner/build-snapshot.mjs
import { existsSync } from "node:fs";
import { buildSnapshot } from "../../src/server/runner/provision.ts";

process.env.NODE_NO_WARNINGS ??= "1";
for (const file of [".env.local", ".env"]) {
  if (existsSync(file)) process.loadEnvFile(file);
}

if (!process.env.VERCEL_OIDC_TOKEN && !process.env.VERCEL_TOKEN) {
  console.error("No Vercel credentials found. Run `vercel link` and `vercel env pull .env.local` first (or set VERCEL_TOKEN, VERCEL_TEAM_ID, VERCEL_PROJECT_ID).");
  process.exit(2);
}

try {
  const report = await buildSnapshot((line) => console.log(line));
  console.log("\nSteps:");
  for (const s of report.steps) console.log(`  ${(s.ms / 1000).toFixed(1).padStart(6)}s  ${s.name}`);
  console.log("\nSelf-test (fresh sandbox per run, network denied):");
  for (const r of report.selfTest) {
    console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.language.padEnd(6)} ${r.sample.padEnd(14)} create ${String(r.createMs).padStart(5)}ms  total ${String(r.totalMs).padStart(5)}ms${r.ok ? "" : "\n        " + r.problems.join("\n        ")}`);
  }
  console.log(`\nMedian sandbox create: ${report.latency.createMsMedian}ms. Hello-world total by language: ${JSON.stringify(report.latency.helloTotalMsMedian)}`);
  console.log(`\nSnapshot id: ${report.snapshotId}`);
  if (report.ok) {
    console.log(`Next: set RUNNER_SNAPSHOT_ID=${report.snapshotId} (Vercel project settings > Environment Variables) and redeploy.`);
  } else {
    console.log("The self-test failed, so don't use this snapshot yet.");
    process.exitCode = 1;
  }
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
