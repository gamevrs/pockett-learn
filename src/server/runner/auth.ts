import { createHash, timingSafeEqual } from "node:crypto";

/** Constant-time string comparison (hashes first so lengths never leak and never throw). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export type AdminCheck = "disabled" | "denied" | "ok";

/**
 * Bearer-token guard for admin routes. "disabled" means the token env var isn't set: the route
 * should answer 404 so it doesn't even advertise itself.
 */
export function checkAdmin(authorization: string | null, expected: string | undefined): AdminCheck {
  if (!expected) return "disabled";
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? "");
  if (!match) return "denied";
  return safeEqual(match[1].trim(), expected) ? "ok" : "denied";
}
