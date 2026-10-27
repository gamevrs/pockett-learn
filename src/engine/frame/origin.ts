/**
 * Where the code frame is served from. Learner Python and JavaScript run in a page on a DIFFERENT origin than the signed-in
 * site, so they can't read the site's storage (where the session lives).
 *
 *  - NEXT_PUBLIC_CODE_FRAME_ORIGIN, when set, always wins.
 *  - The live site uses a second hostname of the same deployment (pockett-zeta.vercel.app). It only ever serves /frame.
 *  - On a developer machine, localhost and 127.0.0.1 count as different origins, so each hosts the frame for the other.
 *  - Anywhere else (preview deployments) there is no second origin: the caller falls back to the same host in a sandbox
 *    without allow-same-origin, which gives the frame an opaque origin and is isolated just the same.
 */

const SITE_HOSTS = new Set(["www.pockett.ai", "pockett.ai"]);
const PRODUCTION_FRAME_ORIGIN = "https://pockett-zeta.vercel.app";

/** Origins allowed to host the page that embeds the frame (the frame refuses messages from anywhere else). */
export function isTrustedParentOrigin(origin: string, frameLocation: Pick<Location, "origin" | "hostname">): boolean {
  if (origin === frameLocation.origin) return true; // the opaque fallback is served by the same host as the page
  if (origin === "https://www.pockett.ai" || origin === "https://pockett.ai") return true;
  if (frameLocation.hostname === "localhost" || frameLocation.hostname === "127.0.0.1") {
    try {
      const u = new URL(origin);
      return u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1");
    } catch {
      return false;
    }
  }
  return false;
}

export function codeFrameOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_CODE_FRAME_ORIGIN;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      /* a malformed setting is ignored */
    }
  }
  if (typeof window === "undefined") return null;
  const { hostname, protocol, port } = window.location;
  if (SITE_HOSTS.has(hostname)) return PRODUCTION_FRAME_ORIGIN;
  const suffix = port ? `:${port}` : "";
  if (hostname === "localhost") return `${protocol}//127.0.0.1${suffix}`;
  if (hostname === "127.0.0.1") return `${protocol}//localhost${suffix}`;
  return null;
}
