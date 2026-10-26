import { fingerprint, signJwt, verifyJwt, type Claims } from "./sim-crypto.ts";
import { RIDERS, Store, ZONES } from "./sim-data.ts";
import { executeGraph, parseGraph } from "./sim-graph.ts";
import type { ApiResponse, BreakerInfo, LifecycleInfo, LogEntry, RawRequest, RouteInfo, ShutdownResult, Station } from "./types.ts";

/**
 * Dockline as a plain TypeScript program: a small HTTP framework plus the bike-share REST API,
 * with no sockets. It is the stand-in for a finished learner program (landing page, project hub
 * card) and it backs the suite runner. Pure TS, no DOM, so Node can test it.
 *
 * Framework behaviour: routing with 404/405, a middleware chain that records a trace, validation
 * with field errors, problem+json, pagination, HS256 tokens, roles, idempotency keys, a token
 * bucket per client, ETag/304, retries with a circuit breaker around an upstream call, graceful
 * shutdown, and a small graph query language over the same data.
 */

export interface SimOptions {
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  /** The upstream forecast feed. Rejects on a dropped connection; may answer any status. */
  upstream?: (path: string) => Promise<{ status: number; body: unknown }>;
  secret?: string;
  /** Pretend work per request, in ms (0 for tests). */
  work?: number;
}

export const MIDDLEWARE = ["requestId", "accessLog", "rateLimit", "authenticate", "idempotency", "cache"];
const RATE_LIMIT = 12;
const REFILL_PER_SECOND = 0.75;
const TOKEN_TTL = 900;
const BREAKER_THRESHOLD = 2;
const BREAKER_COOLDOWN = 4000;

interface Ctx {
  method: string;
  path: string;
  query: URLSearchParams;
  headers: Record<string, string>;
  body: unknown;
  bodyError: boolean;
  ip: string;
  reqId: string;
  user: Claims | null;
  params: Record<string, string>;
  extra: Record<string, string>;
}

interface Reply {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

type Auth = "user" | "staff" | "admin";

interface RouteDef {
  method: string;
  path: string;
  auth?: Auth;
  cache?: boolean;
  work: number;
  run: (c: Ctx) => Promise<Reply> | Reply;
}

type FieldError = { field: string; code: string; message: string };

const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export class DocklineSim {
  readonly store: Store;
  private now: () => number;
  private sleep: (ms: number) => Promise<void>;
  private upstream: NonNullable<SimOptions["upstream"]>;
  private secret: string;
  private work: number;
  private logs: LogEntry[] = [];
  private reqCount = 0;
  private buckets = new Map<string, { tokens: number; at: number }>();
  private idem = new Map<string, { fp: string; reply: Reply }>();
  private state: LifecycleInfo["state"] = "running";
  private inFlight = 0;
  private breaker = { state: "closed" as BreakerInfo["state"], failures: 0, openedAt: null as number | null };
  private lastForecast = new Map<string, unknown>();
  private routes: RouteDef[];
  private lcg = 7;

  constructor(opts: SimOptions = {}) {
    this.now = opts.now ?? (() => Date.now());
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.upstream = opts.upstream ?? (async () => ({ status: 503, body: { error: "no upstream" } }));
    this.secret = opts.secret ?? "dockline-dev-secret";
    this.work = opts.work ?? 1;
    this.store = new Store(this.now());
    this.routes = this.buildRoutes();
  }

  // ── hooks ──
  listMiddleware(): string[] {
    return [...MIDDLEWARE];
  }

  listRoutes(): RouteInfo[] {
    return this.routes.map((r) => ({ method: r.method, path: r.path }));
  }

  recentLogs(n = 10): LogEntry[] {
    return this.logs.slice(-Math.max(0, Math.floor(n)));
  }

  breakerState(): BreakerInfo {
    const b = this.breaker;
    if (b.state === "open" && b.openedAt !== null && this.now() - b.openedAt >= BREAKER_COOLDOWN) b.state = "half-open";
    return { state: b.state, failures: b.failures, threshold: BREAKER_THRESHOLD, openedAt: b.openedAt, cooldownMs: BREAKER_COOLDOWN };
  }

  lifecycleState(): LifecycleInfo {
    return { state: this.state, inFlight: this.inFlight };
  }

  async shutdown(): Promise<ShutdownResult> {
    if (this.state === "closed") return { drained: true, abandoned: 0, closed: ["http", "database"] };
    this.state = "draining";
    const deadline = this.now() + 2500;
    while (this.inFlight > 0 && this.now() < deadline) await this.sleep(20);
    const abandoned = this.inFlight;
    this.state = "closed";
    return { drained: abandoned === 0, abandoned, closed: ["http", "database"] };
  }

  restart(): void {
    this.state = "running";
  }

  // ── the request pipeline ──
  async handle(raw: RawRequest): Promise<ApiResponse> {
    const started = this.now();
    const method = String(raw?.method ?? "GET").toUpperCase();
    const url = new URL(String(raw?.url ?? "/"), "http://dockline.local");
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw?.headers ?? {})) headers[k.toLowerCase()] = String(v);
    let body = raw?.body;
    let bodyError = false;
    if (typeof body === "string" && body.trim() !== "") {
      try {
        body = JSON.parse(body);
      } catch {
        bodyError = true;
      }
    }
    const reqId = `req_${(++this.reqCount).toString(36).padStart(4, "0")}${fingerprint(String(this.reqCount)).slice(0, 3)}`;
    const ctx: Ctx = { method, path: url.pathname, query: url.searchParams, headers, body, bodyError, ip: String(raw?.ip ?? "0.0.0.0"), reqId, user: null, params: {}, extra: { "x-request-id": reqId } };
    const trace: string[] = [];
    let reply: Reply;
    this.inFlight++;
    try {
      reply = await this.pipeline(ctx, trace);
    } catch (err) {
      reply = this.problem(ctx, 500, "internal-error", "Internal Server Error", err instanceof Error ? err.message : "Unexpected failure");
    } finally {
      this.inFlight--;
    }
    const ms = Math.max(0, Math.round(this.now() - started));
    const out: Record<string, string> = { ...ctx.extra, ...(reply.headers ?? {}), "x-response-time": `${ms}ms` };
    if (reply.body !== undefined && !out["content-type"]) out["content-type"] = "application/json";
    this.logs.push({
      time: new Date(this.now()).toISOString(),
      level: reply.status >= 500 ? "error" : reply.status >= 400 ? "warn" : "info",
      msg: reply.status >= 400 ? "request failed" : "request completed",
      method,
      path: ctx.path,
      status: reply.status,
      ms,
      reqId,
    });
    if (this.logs.length > 300) this.logs.splice(0, this.logs.length - 300);
    return { status: reply.status, headers: out, body: reply.body ?? null, trace };
  }

  private async pipeline(ctx: Ctx, trace: string[]): Promise<Reply> {
    const health = ctx.path.startsWith("/health/");
    if (this.state !== "running" && !(health && this.state === "draining")) {
      ctx.extra["retry-after"] = "1";
      ctx.extra.connection = "close";
      return this.problem(ctx, 503, "shutting-down", "Service Unavailable", "The server is shutting down and no longer accepts new requests.");
    }
    trace.push("requestId", "accessLog");

    trace.push("rateLimit");
    if (!health) {
      const limited = this.rateLimit(ctx);
      if (limited) return limited;
    }

    const found = this.resolve(ctx.method, ctx.path);
    const route = found.route;
    if (route) ctx.params = found.params;

    trace.push("authenticate");
    const denied = this.authenticate(ctx, route);
    if (denied) return denied;

    trace.push("idempotency");
    let idemKey: string | null = null;
    let idemFp = "";
    if (route && ctx.method === "POST" && route.path === "/rentals") {
      const key = ctx.headers["idempotency-key"];
      if (!key) return this.problem(ctx, 400, "idempotency-key-required", "Idempotency-Key required", "POST /rentals needs an Idempotency-Key header so retries cannot rent twice.");
      idemKey = `${ctx.user?.sub ?? "anon"}:${key}`;
      idemFp = fingerprint(JSON.stringify(ctx.body ?? null));
      const seen = this.idem.get(idemKey);
      if (seen) {
        if (seen.fp !== idemFp) return this.problem(ctx, 422, "idempotency-key-reused", "Idempotency-Key reused", "That key was already used with a different request body.");
        return { ...seen.reply, headers: { ...seen.reply.headers, "x-idempotent-replay": "true" } };
      }
    }

    trace.push("cache");
    let reply: Reply;
    if (!route) reply = found.allow.length > 0 ? this.methodNotAllowed(ctx, found.allow) : this.problem(ctx, 404, "route-not-found", "Not Found", `No route for ${ctx.method} ${ctx.path}`);
    else {
      if (this.work > 0 && route.work > 0) await this.sleep(this.jitter(route.work));
      reply = await route.run(ctx);
    }
    if (idemKey && reply.status < 500) this.idem.set(idemKey, { fp: idemFp, reply });
    if (route?.cache && reply.status === 200) {
      const etag = `"${fingerprint(JSON.stringify(reply.body))}"`;
      const headers = { ...reply.headers, etag, "cache-control": "private, max-age=0, must-revalidate" };
      const inm = ctx.headers["if-none-match"];
      if (inm && inm.split(",").some((t) => t.trim() === etag)) return { status: 304, headers: { etag, "cache-control": headers["cache-control"] } };
      return { ...reply, headers };
    }
    return reply;
  }

  private jitter(base: number): number {
    this.lcg = (this.lcg * 1103515245 + 12345) & 0x7fffffff;
    return Math.round(base * (0.6 + (this.lcg / 0x7fffffff) * 0.9));
  }

  private rateLimit(ctx: Ctx): Reply | null {
    const t = this.now();
    const b = this.buckets.get(ctx.ip) ?? { tokens: RATE_LIMIT, at: t };
    b.tokens = Math.min(RATE_LIMIT, b.tokens + ((t - b.at) / 1000) * REFILL_PER_SECOND);
    b.at = t;
    this.buckets.set(ctx.ip, b);
    ctx.extra["ratelimit-limit"] = String(RATE_LIMIT);
    if (b.tokens < 1) {
      ctx.extra["ratelimit-remaining"] = "0";
      ctx.extra["retry-after"] = String(Math.max(1, Math.ceil((1 - b.tokens) / REFILL_PER_SECOND)));
      return this.problem(ctx, 429, "rate-limited", "Too Many Requests", `Slow down: ${RATE_LIMIT} requests per client, refilling ${REFILL_PER_SECOND} per second.`);
    }
    b.tokens -= 1;
    ctx.extra["ratelimit-remaining"] = String(Math.floor(b.tokens));
    return null;
  }

  private authenticate(ctx: Ctx, route: RouteDef | null): Reply | null {
    const header = ctx.headers.authorization;
    if (header) {
      const m = /^Bearer\s+(\S+)$/i.exec(header);
      const check = m ? verifyJwt(m[1], this.secret, this.now() / 1000) : null;
      if (!check || !check.ok) {
        ctx.extra["www-authenticate"] = `Bearer realm="dockline", error="invalid_token"`;
        const reason = check && !check.ok ? check.reason : "malformed";
        return this.problem(ctx, 401, "invalid-token", "Unauthorized", reason === "expired" ? "That token has expired." : reason === "signature" ? "The token signature does not match." : "The Authorization header must be: Bearer <token>.");
      }
      ctx.user = check.claims;
    }
    if (!route?.auth) return null;
    if (!ctx.user) {
      ctx.extra["www-authenticate"] = `Bearer realm="dockline"`;
      return this.problem(ctx, 401, "authentication-required", "Unauthorized", "Send a Bearer token from POST /auth/token.");
    }
    const role = ctx.user.role;
    const allowed = route.auth === "user" || (route.auth === "staff" && (role === "mechanic" || role === "admin")) || (route.auth === "admin" && role === "admin");
    return allowed ? null : this.problem(ctx, 403, "forbidden", "Forbidden", `Your role (${role}) may not do this.`);
  }

  // ── routing ──
  private resolve(method: string, path: string): { route: RouteDef | null; params: Record<string, string>; allow: string[] } {
    const segs = path.split("/").filter(Boolean);
    const allow: string[] = [];
    for (const r of this.routes) {
      const pat = r.path.split("/").filter(Boolean);
      if (pat.length !== segs.length) continue;
      const params: Record<string, string> = {};
      const ok = pat.every((p, i) => {
        if (p.startsWith(":")) {
          params[p.slice(1)] = decodeURIComponent(segs[i]);
          return true;
        }
        return p === segs[i];
      });
      if (!ok) continue;
      if (r.method === method) return { route: r, params, allow };
      allow.push(r.method);
    }
    return { route: null, params: {}, allow };
  }

  // ── replies ──
  private problem(ctx: Ctx, status: number, slug: string, title: string, detail: string, errors?: FieldError[]): Reply {
    return {
      status,
      headers: { "content-type": "application/problem+json" },
      body: { type: `https://dockline.example/problems/${slug}`, title, status, detail, instance: ctx.path, requestId: ctx.reqId, ...(errors ? { errors } : {}) },
    };
  }

  private invalid(ctx: Ctx, errors: FieldError[]): Reply {
    return this.problem(ctx, 400, "validation-failed", "Bad Request", `${errors.length} field${errors.length === 1 ? "" : "s"} failed validation.`, errors);
  }

  private methodNotAllowed(ctx: Ctx, allow: string[]): Reply {
    const r = this.problem(ctx, 405, "method-not-allowed", "Method Not Allowed", `${ctx.method} is not allowed here. Try: ${allow.join(", ")}.`);
    return { ...r, headers: { ...r.headers, allow: allow.join(", ") } };
  }

  private etagOf(value: unknown): string {
    return `"${fingerprint(JSON.stringify(value))}"`;
  }

  // ── routes ──
  private buildRoutes(): RouteDef[] {
    const s = this.store;
    const R = (method: string, path: string, run: RouteDef["run"], o: Partial<RouteDef> = {}): RouteDef => ({ method, path, work: 14, run, ...o });
    const station = (c: Ctx) => s.stations.find((x) => x.id === c.params.id);
    const notFound = (c: Ctx, what: string) => this.problem(c, 404, "not-found", "Not Found", `${what} ${c.params.id} does not exist.`);
    const isStaff = (c: Ctx) => c.user?.role === "mechanic" || c.user?.role === "admin";

    return [
      R("GET", "/health/live", () => ({ status: 200, body: { status: "ok" } }), { work: 2 }),
      R("GET", "/health/ready", (c) => (this.state === "running" ? { status: 200, body: { status: "ready", database: "up" } } : this.problem(c, 503, "not-ready", "Service Unavailable", "Draining: not accepting new work.")), { work: 2 }),
      R("POST", "/auth/token", (c) => {
        const b = isRec(c.body) ? c.body : {};
        const errors: FieldError[] = [];
        if (typeof b.riderId !== "string" || !b.riderId) errors.push({ field: "riderId", code: "required", message: "riderId is required" });
        if (typeof b.pin !== "string" || !b.pin) errors.push({ field: "pin", code: "required", message: "pin is required" });
        if (errors.length) return this.invalid(c, errors);
        const rider = RIDERS.find((r) => r.id === b.riderId);
        if (!rider || rider.pin !== b.pin) return this.problem(c, 401, "invalid-credentials", "Unauthorized", "Unknown rider or wrong PIN.");
        const iat = Math.floor(this.now() / 1000);
        const token = signJwt({ sub: rider.id, role: rider.role, name: rider.name, iat, exp: iat + TOKEN_TTL }, this.secret);
        return { status: 200, body: { token, tokenType: "Bearer", expiresIn: TOKEN_TTL } };
      }),
      R("GET", "/stations", (c) => this.listStations(c), { cache: true }),
      R("POST", "/stations", (c) => this.createStation(c), { auth: "admin" }),
      R("GET", "/stations/:id", (c) => {
        const st = station(c);
        return st ? { status: 200, body: st } : notFound(c, "Station");
      }, { cache: true }),
      R("PATCH", "/stations/:id", (c) => {
        const st = station(c);
        if (!st) return notFound(c, "Station");
        const match = c.headers["if-match"];
        if (match && match !== this.etagOf(st)) return this.problem(c, 412, "precondition-failed", "Precondition Failed", "The station changed since you read it. Fetch it again.");
        const b = isRec(c.body) ? c.body : null;
        if (!b) return this.invalid(c, [{ field: "body", code: "required", message: "send a JSON object" }]);
        const errors = this.checkStation(b, true);
        if (errors.length) return this.invalid(c, errors);
        if (typeof b.name === "string") st.name = b.name.trim();
        if (typeof b.zone === "string") st.zone = b.zone;
        if (typeof b.capacity === "number") st.capacity = b.capacity;
        return { status: 200, body: st, headers: { etag: this.etagOf(st) } };
      }, { auth: "staff" }),
      R("DELETE", "/stations/:id", (c) => {
        const i = s.stations.findIndex((x) => x.id === c.params.id);
        if (i < 0) return notFound(c, "Station");
        s.stations.splice(i, 1);
        return { status: 204 };
      }, { auth: "admin" }),
      R("GET", "/stations/:id/bikes", (c) => (station(c) ? { status: 200, body: s.bikes.filter((b) => b.stationId === c.params.id && b.status !== "rented") } : notFound(c, "Station"))),
      R("GET", "/stations/:id/forecast", async (c) => {
        const st = station(c);
        if (!st) return notFound(c, "Station");
        return { status: 200, body: { ...(await this.forecast(st.zone)) } };
      }, { work: 0 }),
      R("GET", "/bikes", (c) => this.listBikes(c)),
      R("GET", "/rentals", (c) => {
        const mine = s.rentals.filter((r) => c.user?.role === "admin" || r.riderId === c.user?.sub);
        return this.cursorPage(c, mine, (r) => r.id);
      }, { auth: "user" }),
      R("POST", "/rentals", (c) => {
        if (c.bodyError) return this.problem(c, 400, "malformed-json", "Bad Request", "The request body is not valid JSON.");
        const b = isRec(c.body) ? c.body : {};
        if (typeof b.bikeId !== "string" || !b.bikeId) return this.invalid(c, [{ field: "bikeId", code: "required", message: "bikeId is required" }]);
        const bike = s.bikes.find((x) => x.id === b.bikeId);
        if (!bike) return this.problem(c, 404, "not-found", "Not Found", `Bike ${b.bikeId} does not exist.`);
        if (bike.status !== "available") return this.problem(c, 409, "bike-unavailable", "Conflict", `Bike ${bike.id} is ${bike.status}.`);
        bike.status = "rented";
        const rental = { id: `rt-${s.nextRental++}`, riderId: c.user!.sub, bikeId: bike.id, fromStationId: bike.stationId, toStationId: null, startedAt: new Date(this.now()).toISOString(), returnedAt: null };
        s.rentals.push(rental);
        return { status: 201, body: rental, headers: { location: `/rentals/${rental.id}` } };
      }, { auth: "user" }),
      R("GET", "/rentals/:id", (c) => {
        const r = s.rentals.find((x) => x.id === c.params.id);
        return r && (r.riderId === c.user?.sub || isStaff(c)) ? { status: 200, body: r } : notFound(c, "Rental");
      }, { auth: "user" }),
      R("POST", "/rentals/:id/return", (c) => {
        const r = s.rentals.find((x) => x.id === c.params.id);
        if (!r || (r.riderId !== c.user?.sub && !isStaff(c))) return notFound(c, "Rental");
        const b = isRec(c.body) ? c.body : {};
        const dock = s.stations.find((x) => x.id === b.stationId);
        if (!dock) return this.invalid(c, [{ field: "stationId", code: "unknown", message: "stationId must be an existing station" }]);
        if (r.returnedAt) return this.problem(c, 409, "already-returned", "Conflict", `Rental ${r.id} was already returned.`);
        r.returnedAt = new Date(this.now()).toISOString();
        r.toStationId = dock.id;
        const bike = s.bikes.find((x) => x.id === r.bikeId);
        if (bike) Object.assign(bike, { stationId: dock.id, status: "available" });
        return { status: 200, body: r };
      }, { auth: "user" }),
      R("POST", "/graphql", (c) => {
        const b = isRec(c.body) ? c.body : {};
        if (typeof b.query !== "string") return this.invalid(c, [{ field: "query", code: "required", message: "send { \"query\": \"{ ... }\" }" }]);
        let doc;
        try {
          doc = parseGraph(b.query);
        } catch (err) {
          return { status: 400, body: { errors: [{ message: (err as Error).message }] } };
        }
        const { data, errors } = executeGraph(doc, s);
        return { status: 200, body: errors.length ? { data, errors } : { data } };
      }),
    ];
  }

  private checkStation(b: Record<string, unknown>, partial: boolean): FieldError[] {
    const errors: FieldError[] = [];
    const has = (k: string) => b[k] !== undefined;
    if (!partial || has("name")) {
      if (typeof b.name !== "string" || b.name.trim() === "") errors.push({ field: "name", code: "required", message: "name is required" });
      else if (b.name.trim().length < 2 || b.name.trim().length > 40) errors.push({ field: "name", code: "length", message: "name must be 2 to 40 characters" });
    }
    if (!partial || has("zone")) {
      if (typeof b.zone !== "string" || !(ZONES as readonly string[]).includes(b.zone)) errors.push({ field: "zone", code: "one_of", message: `zone must be one of: ${ZONES.join(", ")}` });
    }
    if (!partial || has("capacity")) {
      if (typeof b.capacity !== "number" || !Number.isInteger(b.capacity)) errors.push({ field: "capacity", code: "type", message: "capacity must be a whole number" });
      else if (b.capacity < 4 || b.capacity > 40) errors.push({ field: "capacity", code: "range", message: "capacity must be between 4 and 40" });
    }
    for (const k of ["x", "y"]) {
      if (has(k) && (typeof b[k] !== "number" || (b[k] as number) < 0 || (b[k] as number) > 100)) errors.push({ field: k, code: "range", message: `${k} must be a number from 0 to 100` });
    }
    return errors;
  }

  private createStation(c: Ctx): Reply {
    if (c.bodyError) return this.problem(c, 400, "malformed-json", "Bad Request", "The request body is not valid JSON.");
    const b = isRec(c.body) ? c.body : null;
    if (!b) return this.invalid(c, [{ field: "body", code: "required", message: "send a JSON object" }]);
    const errors = this.checkStation(b, false);
    if (errors.length) return this.invalid(c, errors);
    const st: Station = { id: `st-${String(this.store.nextStation++).padStart(2, "0")}`, name: String(b.name).trim(), zone: String(b.zone), capacity: Number(b.capacity) };
    if (typeof b.x === "number") st.x = b.x;
    if (typeof b.y === "number") st.y = b.y;
    this.store.stations.push(st);
    return { status: 201, body: st, headers: { location: `/stations/${st.id}` } };
  }

  private intParam(c: Ctx, name: string, min: number, max: number, fallback: number, errors: FieldError[]): number {
    const raw = c.query.get(name);
    if (raw === null || raw === "") return fallback;
    const n = Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) {
      errors.push({ field: name, code: "range", message: `${name} must be a whole number from ${min} to ${max}` });
      return fallback;
    }
    return n;
  }

  private listStations(c: Ctx): Reply {
    const errors: FieldError[] = [];
    const limit = this.intParam(c, "limit", 1, 50, 5, errors);
    const offset = this.intParam(c, "offset", 0, 10_000, 0, errors);
    const minCapacity = this.intParam(c, "minCapacity", 0, 100, 0, errors);
    const sortKeys = (c.query.get("sort") ?? "name").split(",").filter(Boolean);
    const fields = ["id", "name", "zone", "capacity"];
    for (const k of sortKeys) if (!fields.includes(k.replace(/^-/, ""))) errors.push({ field: "sort", code: "one_of", message: `sort fields: ${fields.join(", ")}` });
    if (errors.length) return this.invalid(c, errors);
    const zone = c.query.get("zone");
    const rows = this.store.stations.filter((st) => (!zone || st.zone === zone) && st.capacity >= minCapacity);
    rows.sort((a, b) => {
      for (const k of sortKeys) {
        const f = k.replace(/^-/, "") as "id" | "name" | "zone" | "capacity";
        const d = a[f] < b[f] ? -1 : a[f] > b[f] ? 1 : 0;
        if (d) return k.startsWith("-") ? -d : d;
      }
      return 0;
    });
    return { status: 200, body: { items: rows.slice(offset, offset + limit), page: { total: rows.length, limit, offset } } };
  }

  private listBikes(c: Ctx): Reply {
    const errors: FieldError[] = [];
    const kind = c.query.get("kind");
    const status = c.query.get("status");
    if (kind && kind !== "classic" && kind !== "electric") errors.push({ field: "kind", code: "one_of", message: "kind must be classic or electric" });
    if (status && !["available", "rented", "service"].includes(status)) errors.push({ field: "status", code: "one_of", message: "status must be available, rented or service" });
    if (errors.length) return this.invalid(c, errors);
    const stationId = c.query.get("stationId");
    const rows = this.store.bikes.filter((b) => (!stationId || b.stationId === stationId) && (!kind || b.kind === kind) && (!status || b.status === status));
    return this.cursorPage(c, rows, (b) => b.id);
  }

  private cursorPage<T>(c: Ctx, rows: T[], idOf: (r: T) => string): Reply {
    const errors: FieldError[] = [];
    const limit = this.intParam(c, "limit", 1, 50, 5, errors);
    if (errors.length) return this.invalid(c, errors);
    const after = c.query.get("after");
    let start = 0;
    if (after) {
      const i = rows.findIndex((r) => idOf(r) === after);
      if (i < 0) return this.invalid(c, [{ field: "after", code: "invalid", message: "after is not a cursor from this list" }]);
      start = i + 1;
    }
    const items = rows.slice(start, start + limit);
    const next = start + limit < rows.length && items.length > 0 ? idOf(items[items.length - 1]) : null;
    return { status: 200, body: { items, next } };
  }

  // ── the upstream call: retries, then a circuit breaker ──
  private async forecast(zone: string): Promise<Record<string, unknown>> {
    const b = this.breaker;
    const info = this.breakerState();
    if (info.state === "open") return this.fallback(zone);
    const attempts = info.state === "half-open" ? 1 : 3;
    for (let i = 1; i <= attempts; i++) {
      try {
        const res = await this.upstream(`/upstream/forecast/${encodeURIComponent(zone)}`);
        if (res.status === 200 && isRec(res.body)) {
          b.state = "closed";
          b.failures = 0;
          b.openedAt = null;
          this.lastForecast.set(zone, res.body);
          return { ...res.body, source: "live" };
        }
      } catch {
        // dropped: fall through to retry
      }
      if (i < attempts) await this.sleep(80 * 2 ** (i - 1));
    }
    b.failures += 1;
    if (info.state === "half-open" || b.failures >= BREAKER_THRESHOLD) {
      b.state = "open";
      b.openedAt = this.now();
    }
    return this.fallback(zone);
  }

  private fallback(zone: string): Record<string, unknown> {
    const last = this.lastForecast.get(zone);
    return { ...(isRec(last) ? last : { zone, tempC: 12, rain: false, windKph: 10 }), source: "fallback" };
  }
}
