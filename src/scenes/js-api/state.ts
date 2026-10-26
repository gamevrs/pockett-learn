import type { BreakerInfo, Bike, LifecycleInfo, LogEntry, ProblemDoc, RawRequest, RouteInfo, Station, SuiteResult, ShutdownResult } from "./types";

/** Everything the scene remembers about the traffic. Snapshots are replaced, never mutated. */

export type Klass = "2xx" | "3xx" | "4xx" | "5xx" | "timeout";
export const KLASSES: Klass[] = ["2xx", "3xx", "4xx", "5xx", "timeout"];

export interface Exchange {
  id: number;
  /** When it was sent (epoch ms). */
  at: number;
  label: string;
  source: "auto" | "user";
  req: RawRequest;
  /** Pathname only. */
  path: string;
  /** 0 when there is no usable response. */
  status: number;
  outcome: "ok" | "timeout" | "junk";
  headers: Record<string, string>;
  body: unknown;
  trace: string[];
  /** Measured round trip in ms. */
  ms: number;
}

export interface TokenInfo {
  riderId: string;
  token: string;
  expiresIn: number;
  /** Local time of the login (epoch ms). */
  at: number;
  payload: Record<string, unknown> | null;
  header: Record<string, unknown> | null;
}

export interface Bucket {
  ip: string;
  limit: number;
  remaining: number;
  sent: number;
  blocked: number;
  /** Local epoch ms until which the server asked the client to wait (0 when not blocked). */
  retryUntil: number;
  retryAfter: number;
  at: number;
}

export interface LedgerRow {
  key: string;
  riderId: string;
  bikeId: string;
  attempts: number;
  status: number;
  replay: boolean;
  conflict: boolean;
  rentalId: string | null;
  at: number;
}

export interface MatrixCell {
  status: number | null;
  note?: string;
}

export interface Board {
  stations: Station[];
  bikes: Record<string, Bike[]>;
  at: number;
}

export interface CacheStats {
  full: number;
  notModified: number;
  etag: string | null;
  cacheControl: string | null;
  url: string | null;
  last: number | null;
  bytes: number;
}

export interface Hooks {
  middleware: string[] | null;
  routes: RouteInfo[] | null;
  logs: LogEntry[] | null;
  breaker: BreakerInfo | null;
  lifecycle: LifecycleInfo | null;
}

export interface Snap {
  hasProgram: boolean;
  running: boolean;
  speed: number;
  generation: number;
  exchanges: Exchange[];
  total: number;
  inFlight: number;
  /** Exchanges whose dots are still travelling the lanes. */
  dots: Exchange[];
  counts: Record<Klass, number>;
  problemTypes: Record<string, number>;
  problems: { ex: Exchange; doc: ProblemDoc }[];
  laneStats: Record<string, { passed: number; stopped: number }>;
  routeHits: Record<string, number>;
  misses: { method: string; path: string; status: number; at: number }[];
  latencies: number[];
  latencySource: "header" | "measured";
  hooks: Hooks;
  breakerTrail: { t: number; state: BreakerInfo["state"] }[];
  board: Board;
  tokens: Record<string, TokenInfo>;
  matrix: Record<string, MatrixCell>;
  matrixBusy: boolean;
  ledger: LedgerRow[];
  buckets: Record<string, Bucket>;
  cache: CacheStats;
  forecasts: Exchange[];
  lastGraph: Exchange | null;
  slow: boolean;
  shutdown: { phase: "idle" | "draining" | "closed"; result: ShutdownResult | null; rejected: number };
  suite: SuiteResult | null;
  suiteBusy: boolean;
  tampered: { riderId: string; status: number } | null;
  error: string | null;
}

export const EMPTY_COUNTS: Record<Klass, number> = { "2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0, timeout: 0 };

export function initialSnap(hasProgram: boolean, generation: number): Snap {
  return {
    hasProgram,
    running: true,
    speed: 1,
    generation,
    exchanges: [],
    total: 0,
    inFlight: 0,
    dots: [],
    counts: { ...EMPTY_COUNTS },
    problemTypes: {},
    problems: [],
    laneStats: {},
    routeHits: {},
    misses: [],
    latencies: [],
    latencySource: "measured",
    hooks: { middleware: null, routes: null, logs: null, breaker: null, lifecycle: null },
    breakerTrail: [],
    board: { stations: [], bikes: {}, at: 0 },
    tokens: {},
    matrix: {},
    matrixBusy: false,
    ledger: [],
    buckets: {},
    cache: { full: 0, notModified: 0, etag: null, cacheControl: null, url: null, last: null, bytes: 0 },
    forecasts: [],
    lastGraph: null,
    slow: false,
    shutdown: { phase: "idle", result: null, rejected: 0 },
    suite: null,
    suiteBusy: false,
    tampered: null,
    error: null,
  };
}

export const klassOf = (ex: Pick<Exchange, "status" | "outcome">): Klass => (ex.outcome !== "ok" ? "timeout" : ex.status >= 500 ? "5xx" : ex.status >= 400 ? "4xx" : ex.status >= 300 ? "3xx" : "2xx");
