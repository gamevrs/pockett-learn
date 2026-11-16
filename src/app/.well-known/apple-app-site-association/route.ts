import { connection } from "next/server";
import { DEFAULT_APPLE_TEAM_ID, appleAppSiteAssociation, parseAppleTeamId } from "@/lib/app-links";

/**
 * The file iOS fetches (through Apple's CDN) to learn which www.pockett.ai links open the app. The paths and bundle id are
 * in src/lib/app-links.ts; the team id is APPLE_TEAM_ID when set on Vercel, else the team that signs the app.
 *
 * It must be served as JSON at exactly this path, with no extension and no redirect, which a file in public/ cannot
 * promise: a file without an extension goes out as application/octet-stream.
 */
export async function GET() {
  await connection(); // read the env at request time, not baked in at build
  const teamId = parseAppleTeamId(process.env.APPLE_TEAM_ID) ?? DEFAULT_APPLE_TEAM_ID;
  return Response.json(appleAppSiteAssociation(teamId), {
    headers: { "cache-control": "public, max-age=3600" },
  });
}
