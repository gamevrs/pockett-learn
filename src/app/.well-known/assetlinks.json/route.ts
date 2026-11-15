import { connection } from "next/server";
import { androidAssetLinks, parseFingerprints } from "@/lib/app-links";

/**
 * The Digital Asset Links file Android checks before it lets the app open www.pockett.ai links (the intent filter in
 * mobile/android/app/src/main/AndroidManifest.xml carries autoVerify). The package and paths are in src/lib/app-links.ts;
 * the signing certificate fingerprints are ANDROID_CERT_SHA256 on Vercel, comma separated, as Play Console shows them
 * (Setup → App signing).
 *
 * Without a fingerprint this answers 404, so Android leaves the links in the browser instead of verifying against a file
 * that names no certificate.
 */
export async function GET() {
  await connection(); // read the env at request time, not baked in at build
  const fingerprints = parseFingerprints(process.env.ANDROID_CERT_SHA256);
  if (!fingerprints.length) return new Response("Not configured", { status: 404 });
  return Response.json(androidAssetLinks(fingerprints), {
    headers: { "cache-control": "public, max-age=3600" },
  });
}
