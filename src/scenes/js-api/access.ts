import type { DocklineDriver } from "./driver";
import type { Exchange } from "./state";
import { RIDERS } from "./sim-data";
import type { RawRequest } from "./types";

/** Requests, rider tokens and a few small builders shared by the traffic mix and the panel actions. */

export const IPS = ["10.0.0.7", "10.0.0.8", "10.0.0.9"] as const;
export const SEED_STATION_IDS = ["st-01", "st-02", "st-03", "st-04", "st-05", "st-06", "st-07", "st-08"];
export const SEED_BIKE_IDS = Array.from({ length: 24 }, (_, i) => `bk-${101 + i}`);

export const riderById = (id: string) => RIDERS.find((r) => r.id === id);

export function req(method: string, url: string, o: { body?: unknown; headers?: Record<string, string>; ip?: string } = {}): RawRequest {
  const headers: Record<string, string> = { ...(o.headers ?? {}) };
  if (o.body !== undefined && typeof o.body !== "string") headers["content-type"] = "application/json";
  const out: RawRequest = { method, url, headers, ip: o.ip ?? IPS[Math.random() < 0.5 ? 0 : 1] };
  if (o.body !== undefined) out.body = o.body;
  return out;
}

/** A still-valid token for this rider, from the logins the scene has already made. */
export function tokenFor(d: DocklineDriver, riderId: string): string | null {
  const t = d.getSnapshot().tokens[riderId];
  return t && Date.now() < t.at + t.expiresIn * 1000 - 8000 ? t.token : null;
}

export async function login(d: DocklineDriver, riderId: string, pin?: string, source: "auto" | "user" = "user"): Promise<Exchange> {
  const rider = riderById(riderId);
  return d.send(req("POST", "/auth/token", { body: { riderId, pin: pin ?? rider?.pin ?? "" }, ip: "10.0.2.1" }), "login", source);
}

/** Log in if needed. Resolves to null when logging in does not work (the learner's code is not ready yet). */
export async function ensureToken(d: DocklineDriver, riderId: string, source: "auto" | "user" = "auto"): Promise<string | null> {
  const have = tokenFor(d, riderId);
  if (have) return have;
  await login(d, riderId, undefined, source);
  return tokenFor(d, riderId);
}

export const bearer = (token: string | null): Record<string, string> => (token ? { authorization: `Bearer ${token}` } : {});

export function stationIds(d: DocklineDriver): string[] {
  const ids = d.getSnapshot().board.stations.map((s) => s.id);
  return ids.length > 0 ? ids : SEED_STATION_IDS;
}

export function availableBikes(d: DocklineDriver): string[] {
  const out: string[] = [];
  for (const list of Object.values(d.getSnapshot().board.bikes)) for (const b of list) if (b.status === "available") out.push(b.id);
  return out.length > 0 ? out : SEED_BIKE_IDS;
}

const guards = new WeakMap<DocklineDriver, Set<string>>();

/** Run `fn` unless the same named scenario is already running for this driver. */
export async function once<T>(d: DocklineDriver, name: string, fn: () => Promise<T>): Promise<T | undefined> {
  const set = guards.get(d) ?? new Set<string>();
  guards.set(d, set);
  if (set.has(name)) return undefined;
  set.add(name);
  try {
    return await fn();
  } finally {
    set.delete(name);
  }
}
