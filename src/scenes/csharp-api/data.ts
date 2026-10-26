import type { ProgramHandle } from "@/engine/program";
import { readAny } from "../csharp-basics/data";

/**
 * What the Crux operations console reads from the learner's C# program. The program can't be called
 * back, so the console works from the values it printed with `Board.Show("key", value)` (each one an
 * `@scene` line). Every value may be missing or odd: the readers below return `undefined` or empty
 * lists instead of guessing, and nothing here throws.
 *
 * Pure module (no React).
 */

export { readAny };

const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strs = (v: unknown): string[] => arr(v).map((x) => (typeof x === "string" ? x : String(x ?? "")));
const nums = (v: unknown): number[] => arr(v).flatMap((x) => (num(x) === undefined ? [] : [x as number]));
const rec = (v: unknown): Record<string, unknown> => (isRec(v) ? v : {});

// ───────────────────────── model ─────────────────────────

export interface Exchange {
  at: number;
  method: string;
  path: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  trace: string[] | null;
}

export interface BuildError {
  type: string;
  message: string;
  line: number | null;
}

export interface LogLine {
  at: number;
  level: string;
  message: string;
  props: Record<string, unknown>;
}

export interface ApiData {
  requests: { at: number; method: string; path: string; queries: number; headers: number; body: string }[];
  response: { status?: number; body?: string; lookup?: string };
  routes: { table: { method: string; template: string }[]; matches: { method: string; path: string; outcome: string; template?: string; allow: string[] }[] };
  pipeline: Exchange[];
  di: {
    services: { service: string; lifetime: string; dependsOn: string[] }[];
    facts: [string, boolean][];
    errors: [string, string][];
  };
  endpointTable: { method: string; template: string; kind: string }[];
  endpoints: Exchange[];
  problems: Exchange[];
  bookings: Exchange[];
  rows: { id: number; slotId: number; climbers: number; name: string; status: string; version: number }[];
  auth: Exchange[];
  minted?: { memberId?: number; role?: string; ttlMs?: number };
  ratelimit: Exchange[];
  buckets: { key: string; tokens: number }[];
  idempotency: Exchange[];
  ledger: { stored: string[]; bookings?: number; concurrent: string[] };
  caching: Exchange[];
  ops: Exchange[];
  telemetry: { logs: LogLine[]; counters: Record<string, number>; bounds: number[]; counts: number[]; p50?: number; p95?: number };
  health: Exchange[];
  resilience: { calls: { i: number; at: number; result: string; attempts: number; spentMs: number; breaker: string }[]; upstreamCalls?: number };
  outboxQueue: { stages: [string, { id: number; payload: string; status: string; attempts: number }[]][]; calls?: number };
  rollout: { steps: { percent: number; on: number }[]; stable?: boolean };
  flags: Exchange[];
  tests: { name: string; passed: boolean; failure?: string }[];
  versions: Exchange[];
  day: Exchange[];
  report?: {
    requests?: number;
    byStatus: Record<string, number>;
    p50?: number;
    p95?: number;
    counts: [string, number][];
    outbox: Record<string, number>;
    failures: { path: string; correlationId: string; trail: string[] }[];
  };
  error: BuildError | null;
}

export const SCENE_KEYS = [
  "requests", "response", "routes", "pipeline", "di", "endpointTable", "endpoints", "problems", "bookings", "rows", "minted",
  "auth", "ratelimit", "buckets", "idempotency", "ledger", "caching", "ops", "telemetry", "health", "resilience", "outbox",
  "outboxQueue", "rollout", "flags", "tests", "testProof", "versions", "day", "report",
] as const;

function exchanges(v: unknown): Exchange[] {
  return arr(v).flatMap((e): Exchange[] => {
    if (!isRec(e)) return [];
    const headers: Record<string, string> = {};
    for (const [k, x] of Object.entries(rec(e.headers))) headers[k] = String(x);
    return [{ at: num(e.at) ?? 0, method: str(e.method) ?? "GET", path: str(e.path) ?? "", status: num(e.status) ?? 0, headers, body: str(e.body) ?? "", trace: isRec(e) && Array.isArray(e.trace) ? strs(e.trace) : null }];
  });
}

export function readApi(p: ProgramHandle | null): ApiData {
  const g = (k: string): unknown => (p ? readAny(p, k) : undefined);

  const requests = arr(g("requests")).flatMap((r) => {
    if (!isRec(r)) return [];
    return [{ at: num(r.at) ?? 0, method: str(r.method) ?? "GET", path: str(r.path) ?? "", queries: Object.keys(rec(r.query)).length, headers: Object.keys(rec(r.headers)).length, body: str(r.body) ?? "" }];
  });

  const routes = rec(g("routes"));
  const di = rec(g("di"));
  const factNames: [string, string][] = [
    ["sameSingleton", "singleton shared"],
    ["sameWithinScope", "scoped: same in a scope"],
    ["sameAcrossScopes", "scoped: shared across scopes"],
    ["sharedWithQuote", "injected instance is the scope's"],
    ["transientsDiffer", "transient: always new"],
  ];
  const facts = factNames.flatMap(([k, label]): [string, boolean][] => (bool(di[k]) === undefined ? [] : [[label, bool(di[k]) as boolean]]));
  const errors = (["rootScoped", "captive"] as const).flatMap((k): [string, string][] => (str(di[k]) && di[k] !== "ok" ? [[k === "rootScoped" ? "scoped from the root" : "captive dependency", str(di[k]) as string]] : []));

  const tele = rec(g("telemetry"));
  const queue = rec(g("outboxQueue"));
  const stageNames: [string, string][] = [["before", "Booked"], ["afterShutdown", "Worker stopped"], ["duringOutage", "Mailer down"], ["final", "Recovered"]];
  const stages = stageNames.flatMap(([k, label]): [string, { id: number; payload: string; status: string; attempts: number }[]][] => {
    const rows = arr(queue[k]).flatMap((m) => (isRec(m) ? [{ id: num(m.id) ?? 0, payload: str(m.payload) ?? "", status: str(m.status) ?? "Pending", attempts: num(m.attempts) ?? 0 }] : []));
    return rows.length > 0 ? [[label, rows]] : [];
  });

  const res = rec(g("resilience"));
  const rollout = rec(g("rollout"));
  const rep = g("report");
  const r = isRec(rep) ? rep : undefined;
  const byStatus: Record<string, number> = {};
  for (const [k, v] of Object.entries(rec(r?.byStatus))) if (num(v) !== undefined) byStatus[k] = v as number;
  const outbox: Record<string, number> = {};
  for (const [k, v] of Object.entries(rec(r?.outbox))) if (num(v) !== undefined) outbox[k] = v as number;
  const countNames: [string, string][] = [["rateLimited", "rate limited"], ["replayed", "replayed"], ["notModified", "304 not modified"], ["conflicts", "conflicts"], ["denied", "denied"]];

  const err = g("build_error");
  const error: BuildError | null = isRec(err) ? { type: str(err.type) ?? "Error", message: str(err.message) ?? "", line: num(err.line) ?? null } : null;

  return {
    requests,
    response: { status: num(rec(g("response")).status), body: str(rec(g("response")).body), lookup: str(rec(g("response")).lookup) },
    routes: {
      table: arr(routes.table).flatMap((t) => (isRec(t) ? [{ method: str(t.method) ?? "", template: str(t.template) ?? "" }] : [])),
      matches: arr(routes.matches).flatMap((m) => (isRec(m) ? [{ method: str(m.method) ?? "", path: str(m.path) ?? "", outcome: str(m.outcome) ?? "", template: str(m.template), allow: strs(m.allow) }] : [])),
    },
    pipeline: exchanges(g("pipeline")),
    di: {
      services: arr(di.services).flatMap((s) => (isRec(s) ? [{ service: str(s.service) ?? "?", lifetime: str(s.lifetime) ?? "", dependsOn: strs(s.dependsOn) }] : [])),
      facts,
      errors,
    },
    endpointTable: arr(g("endpointTable")).flatMap((e) => (isRec(e) ? [{ method: str(e.method) ?? "", template: str(e.template) ?? "", kind: str(e.kind) ?? "" }] : [])),
    endpoints: exchanges(g("endpoints")),
    problems: exchanges(g("problems")),
    bookings: exchanges(g("bookings")),
    rows: arr(g("rows")).flatMap((b) => (isRec(b) ? [{ id: num(b.id) ?? 0, slotId: num(b.slotId) ?? 0, climbers: num(b.climbers) ?? 0, name: str(b.name) ?? "", status: str(b.status) ?? "", version: num(b.version) ?? 0 }] : [])),
    auth: exchanges(g("auth")),
    minted: isRec(g("minted")) ? { memberId: num(rec(g("minted")).memberId), role: str(rec(g("minted")).role), ttlMs: num(rec(g("minted")).ttlMs) } : undefined,
    ratelimit: exchanges(g("ratelimit")),
    buckets: arr(g("buckets")).flatMap((b) => (isRec(b) ? [{ key: str(b.key) ?? "?", tokens: num(b.tokens) ?? 0 }] : [])),
    idempotency: exchanges(g("idempotency")),
    ledger: { stored: strs(rec(g("ledger")).stored), bookings: num(rec(g("ledger")).bookings), concurrent: strs(rec(g("ledger")).concurrent) },
    caching: exchanges(g("caching")),
    ops: exchanges(g("ops")),
    telemetry: {
      logs: arr(tele.logs).flatMap((l) => (isRec(l) ? [{ at: num(l.at) ?? 0, level: str(l.level) ?? "Info", message: str(l.message) ?? "", props: rec(l.props) }] : [])),
      counters: Object.fromEntries(Object.entries(rec(tele.counters)).flatMap(([k, v]) => (num(v) === undefined ? [] : [[k, v as number]]))),
      bounds: nums(tele.bounds),
      counts: nums(tele.counts),
      p50: num(tele.p50),
      p95: num(tele.p95),
    },
    health: exchanges(g("health")),
    resilience: {
      calls: arr(res.calls).flatMap((c) => (isRec(c) ? [{ i: num(c.i) ?? 0, at: num(c.at) ?? 0, result: str(c.result) ?? "", attempts: num(c.attempts) ?? 0, spentMs: num(c.spentMs) ?? 0, breaker: str(c.breaker) ?? "" }] : [])),
      upstreamCalls: num(res.upstreamCalls),
    },
    outboxQueue: { stages, calls: num(queue.calls) },
    rollout: { steps: arr(rollout.steps).flatMap((s) => (isRec(s) ? [{ percent: num(s.percent) ?? 0, on: num(s.on) ?? 0 }] : [])), stable: bool(rollout.stable) },
    flags: exchanges(g("flags")),
    tests: arr(g("tests")).flatMap((t) => (isRec(t) ? [{ name: str(t.name) ?? "?", passed: t.passed === true, failure: str(t.failure) }] : [])),
    versions: exchanges(g("versions")),
    day: exchanges(g("day")),
    report: r && {
      requests: num(r.requests),
      byStatus,
      p50: num(r.p50),
      p95: num(r.p95),
      counts: countNames.flatMap(([k, label]): [string, number][] => (num(r[k]) === undefined ? [] : [[label, r[k] as number]])),
      outbox,
      failures: arr(r.failures).flatMap((f) => (isRec(f) ? [{ path: str(f.path) ?? "", correlationId: str(f.correlationId) ?? "", trail: strs(f.trail) }] : [])),
    },
    error,
  };
}

// ───────────────────────── helpers ─────────────────────────

export const hasRows = (...lists: unknown[][]): boolean => lists.some((l) => l.length > 0);

/** Parses a JSON response body, or null when it is empty or not JSON. */
export function bodyJson(body: string): unknown {
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

/** Colour for an HTTP status, as a CSS colour. */
export function statusColor(status: number): string {
  if (status >= 500) return "#f87171";
  if (status >= 400) return "#fbbf24";
  if (status === 304) return "#93c5fd";
  if (status >= 200 && status < 300) return "#c5ee8a";
  return "rgba(255,255,255,0.55)";
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
