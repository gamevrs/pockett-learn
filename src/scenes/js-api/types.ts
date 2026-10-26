/**
 * The shapes Dockline talks in, and tolerant readers for them. Whatever the learner's program
 * returns is untrusted: every reader accepts junk and answers with a safe default.
 */

export interface RawRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  ip?: string;
}

export interface ApiResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  trace: string[];
}

export interface Station {
  id: string;
  name: string;
  zone: string;
  capacity: number;
  x?: number;
  y?: number;
}

export interface Bike {
  id: string;
  stationId: string;
  kind: "classic" | "electric";
  battery: number | null;
  status: "available" | "rented" | "service";
}

export interface Rental {
  id: string;
  riderId: string;
  bikeId: string;
  fromStationId: string;
  toStationId: string | null;
  startedAt: string;
  returnedAt: string | null;
}

export interface LogEntry {
  time: string;
  level: "info" | "warn" | "error";
  msg: string;
  reqId: string;
  method: string;
  path: string;
  status: number;
  ms: number;
}

export interface BreakerInfo {
  state: "closed" | "open" | "half-open";
  failures: number;
  threshold: number;
  openedAt: number | null;
  cooldownMs: number;
}

export interface LifecycleInfo {
  state: "running" | "draining" | "closed";
  inFlight: number;
}

export interface ShutdownResult {
  drained: boolean;
  abandoned: number;
  closed: string[];
}

export interface SuiteCase {
  name: string;
  ok: boolean;
  failures: string[];
}

export interface SuiteResult {
  total: number;
  passed: number;
  results: SuiteCase[];
}

export interface GraphSelection {
  name: string;
  args: Record<string, string | number | boolean>;
  selections: GraphSelection[];
}

export interface GraphDocument {
  operation: string;
  selections: GraphSelection[];
}

export interface RouteInfo {
  method: string;
  path: string;
}

export interface ProblemDoc {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  requestId: string;
  errors?: { field: string; code: string; message: string }[];
}

// ───────────────────────── tolerant readers ─────────────────────────

export const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export const asStr = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
export const asNum = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

export function readHeaders(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isRecord(v)) return out;
  for (const [k, val] of Object.entries(v)) {
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") out[k.toLowerCase()] = String(val);
  }
  return out;
}

/** A response as the learner's handle() returned it, or null when it is not an object with a numeric status. */
export function readResponse(v: unknown): ApiResponse | null {
  if (!isRecord(v) || typeof v.status !== "number" || !Number.isFinite(v.status)) return null;
  return {
    status: Math.round(v.status),
    headers: readHeaders(v.headers),
    body: v.body ?? null,
    trace: Array.isArray(v.trace) ? v.trace.filter((t): t is string => typeof t === "string") : [],
  };
}

export function readStrings(v: unknown): string[] | null {
  return Array.isArray(v) ? v.filter((t): t is string => typeof t === "string") : null;
}

export function readRoutes(v: unknown): RouteInfo[] | null {
  if (!Array.isArray(v)) return null;
  const out: RouteInfo[] = [];
  for (const r of v) {
    if (isRecord(r) && typeof r.path === "string") out.push({ method: asStr(r.method, "GET").toUpperCase(), path: r.path });
  }
  return out;
}

export function readLogs(v: unknown): LogEntry[] | null {
  if (!Array.isArray(v)) return null;
  const out: LogEntry[] = [];
  for (const r of v) {
    if (!isRecord(r)) continue;
    const level = r.level === "error" || r.level === "warn" ? r.level : "info";
    out.push({ time: asStr(r.time), level, msg: asStr(r.msg), reqId: asStr(r.reqId), method: asStr(r.method), path: asStr(r.path), status: asNum(r.status), ms: asNum(r.ms) });
  }
  return out;
}

export function readBreaker(v: unknown): BreakerInfo | null {
  if (!isRecord(v)) return null;
  const state = v.state === "open" || v.state === "half-open" ? v.state : "closed";
  return {
    state,
    failures: asNum(v.failures),
    threshold: Math.max(1, asNum(v.threshold, 3)),
    openedAt: typeof v.openedAt === "number" ? v.openedAt : null,
    cooldownMs: Math.max(0, asNum(v.cooldownMs)),
  };
}

export function readLifecycle(v: unknown): LifecycleInfo | null {
  if (!isRecord(v)) return null;
  const state = v.state === "draining" || v.state === "closed" ? v.state : "running";
  return { state, inFlight: Math.max(0, asNum(v.inFlight)) };
}

export function readShutdown(v: unknown): ShutdownResult | null {
  if (!isRecord(v)) return null;
  return { drained: v.drained === true, abandoned: asNum(v.abandoned), closed: readStrings(v.closed) ?? [] };
}

export function readSuite(v: unknown): SuiteResult | null {
  if (!isRecord(v) || !Array.isArray(v.results)) return null;
  const results: SuiteCase[] = [];
  for (const r of v.results) {
    if (isRecord(r)) results.push({ name: asStr(r.name, "case"), ok: r.ok === true, failures: readStrings(r.failures) ?? [] });
  }
  return { total: asNum(v.total, results.length), passed: asNum(v.passed, results.filter((r) => r.ok).length), results };
}

function readSelection(v: unknown, depth: number): GraphSelection | null {
  if (!isRecord(v) || typeof v.name !== "string" || depth > 8) return null;
  const args: GraphSelection["args"] = {};
  if (isRecord(v.args)) {
    for (const [k, a] of Object.entries(v.args)) if (typeof a === "string" || typeof a === "number" || typeof a === "boolean") args[k] = a;
  }
  const selections = Array.isArray(v.selections) ? v.selections.map((s) => readSelection(s, depth + 1)).filter((s): s is GraphSelection => s !== null) : [];
  return { name: v.name, args, selections };
}

export function readGraph(v: unknown): GraphDocument | null {
  if (!isRecord(v) || !Array.isArray(v.selections)) return null;
  return { operation: asStr(v.operation, "query"), selections: v.selections.map((s) => readSelection(s, 0)).filter((s): s is GraphSelection => s !== null) };
}

export function readProblem(body: unknown): ProblemDoc | null {
  if (!isRecord(body) || typeof body.type !== "string" || typeof body.status !== "number") return null;
  const errors = Array.isArray(body.errors)
    ? body.errors.filter(isRecord).map((e) => ({ field: asStr(e.field), code: asStr(e.code), message: asStr(e.message) }))
    : undefined;
  return {
    type: body.type,
    title: asStr(body.title),
    status: body.status,
    detail: asStr(body.detail),
    instance: asStr(body.instance),
    requestId: asStr(body.requestId),
    errors,
  };
}

export const problemSlug = (type: string): string => type.split("/").filter(Boolean).pop() ?? type;
