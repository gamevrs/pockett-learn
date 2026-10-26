import { klassOf, type Bucket, type Exchange, type LedgerRow, type Snap, type TokenInfo } from "./state";
import { asNum, asStr, isRecord, problemSlug, readProblem, type Bike, type Station } from "./types";
import { decodeJwt, matchRoute, parseMs } from "./util";

/**
 * What one finished request teaches the scene. Pure: it takes the previous snapshot and the exchange
 * and returns the fields that changed. Everything here is read from the learner's response (status,
 * headers, body, trace), never invented.
 */

const FORECAST = /^\/stations\/[^/]+\/forecast$/;
const STATION_BIKES = /^\/stations\/([^/]+)\/bikes$/;

const riderOf = (authorization: string | undefined): string => {
  const token = authorization?.replace(/^Bearer\s+/i, "") ?? "";
  const sub = decodeJwt(token).payload?.sub;
  return typeof sub === "string" ? sub : "anonymous";
};

export function observe(s: Snap, ex: Exchange): Partial<Snap> {
  const klass = klassOf(ex);
  const patch: Partial<Snap> = {
    total: s.total + 1,
    exchanges: [...s.exchanges, ex].slice(-240),
    dots: [...s.dots, ex].slice(-8),
    counts: { ...s.counts, [klass]: s.counts[klass] + 1 },
  };
  if (ex.outcome !== "ok") return patch;

  const header = parseMs(ex.headers["x-response-time"]);
  patch.latencies = [...s.latencies, header ?? ex.ms].slice(-80);
  patch.latencySource = header !== null ? "header" : "measured";

  // middleware lanes: where each request stopped
  const lanes = s.hooks.middleware ?? ex.trace;
  if (ex.trace.length > 0) {
    const early = ex.trace.length < lanes.length || ex.status === 304;
    const laneStats = { ...s.laneStats };
    ex.trace.forEach((name, i) => {
      const prev = laneStats[name] ?? { passed: 0, stopped: 0 };
      const last = i === ex.trace.length - 1;
      laneStats[name] = last && early ? { passed: prev.passed, stopped: prev.stopped + 1 } : { passed: prev.passed + 1, stopped: prev.stopped };
    });
    patch.laneStats = laneStats;
  }

  // problems
  if (ex.status >= 400) {
    const doc = readProblem(ex.body);
    const slug = doc ? problemSlug(doc.type) : "no problem document";
    patch.problemTypes = { ...s.problemTypes, [slug]: (s.problemTypes[slug] ?? 0) + 1 };
    if (doc) patch.problems = [...s.problems, { ex, doc }].slice(-6);
  }

  // routes
  if (s.hooks.routes) {
    const { hit } = matchRoute(s.hooks.routes, ex.req.method.toUpperCase(), ex.path);
    if (hit) {
      const key = `${hit.method} ${hit.path}`;
      patch.routeHits = { ...s.routeHits, [key]: (s.routeHits[key] ?? 0) + 1 };
    } else {
      patch.misses = [...s.misses, { method: ex.req.method.toUpperCase(), path: ex.path, status: ex.status, at: ex.at }].slice(-6);
    }
  }

  // rate-limit buckets, keyed by client
  const limit = ex.headers["ratelimit-limit"];
  const remaining = ex.headers["ratelimit-remaining"];
  if ((limit !== undefined && remaining !== undefined) || ex.status === 429) {
    const ip = ex.req.ip ?? "unknown";
    const prev: Bucket = s.buckets[ip] ?? { ip, limit: 0, remaining: 0, sent: 0, blocked: 0, retryUntil: 0, retryAfter: 0, at: 0 };
    const retryAfter = ex.status === 429 ? asNum(Number(ex.headers["retry-after"]), 1) : 0;
    patch.buckets = {
      ...s.buckets,
      [ip]: {
        ip,
        limit: limit !== undefined ? asNum(Number(limit), prev.limit) : prev.limit,
        remaining: remaining !== undefined ? asNum(Number(remaining), 0) : 0,
        sent: prev.sent + 1,
        blocked: prev.blocked + (ex.status === 429 ? 1 : 0),
        retryAfter,
        retryUntil: ex.status === 429 ? ex.at + ex.ms + retryAfter * 1000 : 0,
        at: ex.at,
      },
    };
  }

  // conditional GETs
  if (ex.req.method === "GET" && (ex.status === 304 || (ex.status === 200 && ex.headers.etag))) {
    const bytes = ex.status === 200 ? JSON.stringify(ex.body ?? null).length : 0;
    patch.cache = {
      full: s.cache.full + (ex.status === 200 ? 1 : 0),
      notModified: s.cache.notModified + (ex.status === 304 ? 1 : 0),
      etag: ex.headers.etag ?? s.cache.etag,
      cacheControl: ex.headers["cache-control"] ?? s.cache.cacheControl,
      url: ex.req.url,
      last: ex.status,
      bytes: s.cache.bytes + bytes,
    };
  }

  if (FORECAST.test(ex.path)) patch.forecasts = [...s.forecasts, ex].slice(-8);
  if (ex.path === "/graphql") patch.lastGraph = ex;

  // rider tokens
  if (ex.path === "/auth/token" && ex.status === 200 && isRecord(ex.body) && typeof ex.body.token === "string") {
    const riderId = isRecord(ex.req.body) ? asStr(ex.req.body.riderId) : "";
    const { header: head, payload } = decodeJwt(ex.body.token);
    const info: TokenInfo = { riderId: riderId || asStr(payload?.sub), token: ex.body.token, expiresIn: asNum(ex.body.expiresIn, 900), at: ex.at + ex.ms, payload, header: head };
    patch.tokens = { ...s.tokens, [info.riderId]: info };
  }

  // idempotency ledger
  const key = ex.req.headers?.["idempotency-key"] ?? ex.req.headers?.["Idempotency-Key"];
  if (ex.req.method === "POST" && ex.path === "/rentals" && key) {
    const bikeId = isRecord(ex.req.body) ? asStr(ex.req.body.bikeId) : "";
    const prev = s.ledger.find((r) => r.key === key);
    const replay = ex.headers["x-idempotent-replay"] === "true";
    const rentalId = ex.status < 300 && isRecord(ex.body) && typeof ex.body.id === "string" ? ex.body.id : (prev?.rentalId ?? null);
    const row: LedgerRow = {
      key,
      riderId: prev?.riderId ?? riderOf(ex.req.headers?.authorization ?? ex.req.headers?.Authorization),
      bikeId: prev?.bikeId || bikeId,
      attempts: (prev?.attempts ?? 0) + 1,
      status: ex.status,
      replay: replay || (prev?.replay ?? false),
      conflict: ex.status === 422 || (prev?.conflict ?? false),
      rentalId,
      at: ex.at,
    };
    patch.ledger = [...s.ledger.filter((r) => r.key !== key), row].slice(-12);
  }

  // the station board
  const bikes = STATION_BIKES.exec(ex.path);
  if (bikes && ex.status === 200 && Array.isArray(ex.body)) {
    const list = ex.body.filter(isRecord) as unknown as Bike[];
    patch.board = { ...s.board, bikes: { ...s.board.bikes, [decodeURIComponent(bikes[1])]: list }, at: ex.at };
  } else if (ex.label === "board-stations" && ex.status === 200 && isRecord(ex.body) && Array.isArray(ex.body.items)) {
    const stations = ex.body.items.filter(isRecord) as unknown as Station[];
    const known = new Set(stations.map((st) => st.id));
    patch.board = { stations, bikes: Object.fromEntries(Object.entries(s.board.bikes).filter(([id]) => known.has(id))), at: ex.at };
  }
  return patch;
}
