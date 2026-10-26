import { isRecord, type RouteInfo } from "./types";

export function decodeJwt(token: string): { header: Record<string, unknown> | null; payload: Record<string, unknown> | null; parts: string[] } {
  const parts = token.split(".");
  const read = (s: string | undefined): Record<string, unknown> | null => {
    if (!s) return null;
    try {
      const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
      const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
      const text = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
      const v: unknown = JSON.parse(text);
      return isRecord(v) ? v : null;
    } catch {
      return null;
    }
  };
  return { header: read(parts[0]), payload: read(parts[1]), parts };
}

/** Flip a few characters of the signature so it no longer matches; payload and header stay. */
export function tamperToken(token: string): string {
  const parts = token.split(".");
  if (parts.length !== 3) return token + "x";
  const { payload } = decodeJwt(token);
  const forged = btoa(JSON.stringify({ ...(payload ?? {}), role: "admin" })).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${parts[0]}.${forged}.${parts[2]}`;
}

export function matchRoute(routes: RouteInfo[], method: string, path: string): { hit: RouteInfo | null; pathKnown: boolean } {
  const segs = path.split("/").filter(Boolean);
  let pathKnown = false;
  for (const r of routes) {
    const pat = r.path.split("/").filter(Boolean);
    if (pat.length !== segs.length) continue;
    if (!pat.every((p, i) => p.startsWith(":") || p === segs[i])) continue;
    pathKnown = true;
    if (r.method === method) return { hit: r, pathKnown };
  }
  return { hit: null, pathKnown };
}

export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];
}

/** "12ms" -> 12, anything else -> null. */
export function parseMs(header: string | undefined): number | null {
  const m = header ? /^\s*(\d+(?:\.\d+)?)\s*ms\s*$/i.exec(header) : null;
  return m ? Number(m[1]) : null;
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

export function clock(epoch: number): string {
  const d = new Date(epoch);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function isoClock(iso: string): string {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? iso.slice(11, 19) : clock(t);
}

export function pretty(value: unknown, max = 900): string {
  let text: string;
  try {
    text = JSON.stringify(value, null, 2) ?? "undefined";
  } catch {
    text = String(value);
  }
  return text.length > max ? `${text.slice(0, max)}\n…` : text;
}

export const fmtMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`);

export const pathOf = (url: string): string => {
  const i = url.indexOf("?");
  return i < 0 ? url : url.slice(0, i);
};

export const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const countdown = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return s >= 60 ? `${Math.floor(s / 60)}m ${pad2(s % 60)}s` : `${s}s`;
};
