/**
 * A simulated network for learner code: `fetch(url, init)` returns real Promises, but nothing
 * ever leaves the browser. Requests are answered by a small route table after a configurable
 * latency, and faults (HTTP 5xx, dropped connections, hanging requests, offline) can be injected.
 *
 * Time comes from the sandbox scheduler, so in tests latency is virtual (instant, exact) and in
 * the live scene it is real. Free of browser-only APIs so Node can use it for content validation.
 */

export type NetStatus = "pending" | "ok" | "http-error" | "failed" | "aborted";

export interface NetEntry {
  id: number;
  method: string;
  /** Path and query, e.g. "/api/matches/3?x=1". */
  url: string;
  status: NetStatus;
  /** HTTP status code once a response arrived. */
  code: number | null;
  startedAt: number;
  endedAt: number | null;
  /** How long this request will take (or took) when nothing interrupts it, in ms. */
  latency: number;
  /** 1 for a first request; 2+ when the same URL was requested again after a failure (a retry). */
  attempt: number;
  /** Short human note: "dropped", "hung", "cancelled", "503". */
  note: string;
}

export type FaultKind = number | "network" | "hang";

interface Rule {
  match: string;
  times: number;
  kind: FaultKind;
}

export interface RouteRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  body: unknown;
  /** Per-sandbox scratch state for stateful routes (reset with the network). */
  state: Record<string, number>;
}

export interface RouteReply {
  status?: number;
  body: unknown;
  headers?: Record<string, string>;
}

export interface Route {
  method: string;
  /** Path pattern; `:name` segments match anything. */
  path: string;
  latency: number;
  handle(req: RouteRequest, params: Record<string, string>): RouteReply;
}

export interface TimeSource {
  now(): number;
  setTimeout(cb: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

const STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  408: "Request Timeout",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

export const statusText = (code: number) => STATUS_TEXT[code] ?? (code >= 500 ? "Server Error" : code >= 400 ? "Client Error" : "OK");

/** The Response object learner code receives (a small subset of the real one). */
export class SimResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly url: string;
  readonly headers: { get(name: string): string | null; has(name: string): boolean };
  readonly redirected = false;
  readonly type = "basic";
  private raw: string;
  private used = false;

  constructor(url: string, status: number, body: unknown, headers: Record<string, string> = {}) {
    this.url = url;
    this.status = status;
    this.ok = status >= 200 && status < 300;
    this.statusText = statusText(status);
    this.raw = typeof body === "string" ? body : JSON.stringify(body ?? null);
    const h: Record<string, string> = { "content-type": typeof body === "string" ? "text/plain" : "application/json", ...headers };
    const lower = Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), v]));
    this.headers = {
      get: (name) => lower[String(name).toLowerCase()] ?? null,
      has: (name) => String(name).toLowerCase() in lower,
    };
  }

  get bodyUsed() {
    return this.used;
  }

  private consume(): string {
    if (this.used) throw new TypeError("Body has already been consumed. Read it once, then reuse the value (or call response.clone() first).");
    this.used = true;
    return this.raw;
  }

  async json(): Promise<unknown> {
    const text = this.consume();
    try {
      return JSON.parse(text);
    } catch {
      throw new SyntaxError(`Unexpected token in JSON: the response body is not valid JSON`);
    }
  }

  async text(): Promise<string> {
    return this.consume();
  }

  clone(): SimResponse {
    if (this.used) throw new TypeError("Cannot clone a response whose body was already read.");
    const copy = new SimResponse(this.url, this.status, this.raw);
    copy.raw = this.raw;
    return copy;
  }
}

function abortError(signal?: AbortSignal | null): unknown {
  if (signal && signal.reason !== undefined) return signal.reason;
  return new DOMException("This operation was aborted", "AbortError");
}

function matchRoute(routes: Route[], method: string, path: string): { route: Route; params: Record<string, string> } | null {
  const segs = path.split("/").filter(Boolean);
  for (const route of routes) {
    if (route.method !== method) continue;
    const pat = route.path.split("/").filter(Boolean);
    if (pat.length !== segs.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < pat.length; i++) {
      if (pat[i].startsWith(":")) params[pat[i].slice(1)] = decodeURIComponent(segs[i]);
      else if (pat[i] !== segs[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return { route, params };
  }
  return null;
}

const MAX_ENTRIES = 300;

export class SimNetwork {
  private entriesList: NetEntry[] = [];
  private listeners = new Set<() => void>();
  private rules: Rule[] = [];
  private latencyOverrides: { match: string; ms: number }[] = [];
  private state: Record<string, number> = {};
  private nextId = 1;
  private offlineFlag = false;
  private scale = 1;
  private time: TimeSource;
  private routes: Route[];

  constructor(time: TimeSource, routes: Route[]) {
    this.time = time;
    this.routes = routes;
  }

  // ── what the scene and tests use ──
  entries(): readonly NetEntry[] {
    return this.entriesList;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** `offline` makes every request fail fast; `slow` multiplies every latency. */
  configure(opts: { offline?: boolean; slow?: number }) {
    if (opts.offline !== undefined) this.offlineFlag = opts.offline;
    if (opts.slow !== undefined) this.scale = Math.max(0.1, opts.slow);
    this.emit();
  }

  get offline() {
    return this.offlineFlag;
  }

  /** The next `times` requests whose URL starts with `match` fail: an HTTP status, "network" (dropped) or "hang" (never answers). */
  failNext(match: string, times = 1, kind: FaultKind = 503) {
    this.rules.push({ match, times, kind });
  }

  /** Every request whose URL starts with `match` takes `ms` milliseconds. */
  setLatency(match: string, ms: number) {
    this.latencyOverrides = this.latencyOverrides.filter((o) => o.match !== match);
    this.latencyOverrides.push({ match, ms });
  }

  /** Forget faults, latency overrides, offline mode, route state and the request log. */
  reset() {
    this.rules = [];
    this.latencyOverrides = [];
    this.state = {};
    this.offlineFlag = false;
    this.scale = 1;
    this.entriesList = [];
    this.emit();
  }

  clearLog() {
    this.entriesList = this.entriesList.filter((e) => e.status === "pending");
    this.emit();
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  private patch(entry: NetEntry, change: Partial<NetEntry>) {
    Object.assign(entry, change);
    // new object each time so snapshot-based subscribers (useSyncExternalStore) notice
    this.entriesList = this.entriesList.slice();
    this.emit();
  }

  // ── what learner code calls ──
  fetch = (input: unknown, init: { method?: string; body?: unknown; signal?: AbortSignal | null; headers?: unknown } = {}): Promise<SimResponse> => {
    return new Promise<SimResponse>((resolve, reject) => {
      let raw: string;
      if (typeof input === "string") raw = input;
      else if (input instanceof URL) raw = input.href;
      else if (input && typeof (input as { url?: unknown }).url === "string") raw = (input as { url: string }).url;
      else {
        reject(new TypeError("fetch() needs a URL string, for example fetch(\"/api/matches\")"));
        return;
      }
      const method = String(init?.method ?? (typeof input === "object" && input && "method" in input ? (input as { method: string }).method : "GET")).toUpperCase();
      let url: URL;
      try {
        url = new URL(raw, "https://arena.test");
      } catch {
        reject(new TypeError(`Failed to parse URL from ${raw}`));
        return;
      }
      const shown = url.pathname + url.search;
      const signal = init?.signal ?? null;

      const previous = [...this.entriesList].reverse().find((e) => e.method === method && e.url === shown);
      const attempt = previous && (previous.status === "failed" || previous.status === "http-error" || previous.status === "aborted") ? previous.attempt + 1 : 1;
      const entry: NetEntry = { id: this.nextId++, method, url: shown, status: "pending", code: null, startedAt: this.time.now(), endedAt: null, latency: 0, attempt, note: "" };

      const route = url.host === "arena.test" ? matchRoute(this.routes, method, url.pathname) : null;
      const override = this.latencyOverrides.find((o) => shown.startsWith(o.match));
      const baseLatency = override ? override.ms : route ? route.route.latency : 120;
      let latency = Math.round(baseLatency * this.scale);

      let rule: Rule | undefined;
      for (const r of this.rules) {
        if (r.times > 0 && shown.startsWith(r.match)) {
          rule = r;
          break;
        }
      }
      if (rule) rule.times--;
      if (this.offlineFlag || (rule && rule.kind === "network") || url.host !== "arena.test") latency = Math.min(latency, 40);
      entry.latency = rule?.kind === "hang" && !this.offlineFlag ? 0 : latency;

      this.entriesList = [...this.entriesList, entry].slice(-MAX_ENTRIES);
      this.emit();

      if (signal?.aborted) {
        this.patch(entry, { status: "aborted", endedAt: this.time.now(), note: "cancelled" });
        reject(abortError(signal));
        return;
      }

      let timer: number | null = null;
      const onAbort = () => {
        if (timer !== null) this.time.clearTimeout(timer);
        this.patch(entry, { status: "aborted", endedAt: this.time.now(), note: "cancelled" });
        reject(abortError(signal));
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      const done = () => signal?.removeEventListener("abort", onAbort);

      const hang = rule?.kind === "hang" && !this.offlineFlag;
      if (hang) {
        this.patch(entry, { note: "no answer…" });
        return; // never answers; only an abort ends it
      }

      timer = this.time.setTimeout(() => {
        done();
        const ended = this.time.now();
        if (this.offlineFlag || (rule && rule.kind === "network") || url.host !== "arena.test") {
          this.patch(entry, { status: "failed", endedAt: ended, note: this.offlineFlag ? "offline" : "dropped" });
          reject(new TypeError("Failed to fetch"));
          return;
        }
        let reply: RouteReply;
        if (rule && typeof rule.kind === "number") {
          reply = { status: rule.kind, body: { error: statusText(rule.kind) } };
        } else if (!route) {
          reply = { status: 404, body: { error: `No route for ${method} ${url.pathname}` } };
        } else {
          let body: unknown = undefined;
          if (typeof init?.body === "string") {
            try {
              body = JSON.parse(init.body);
            } catch {
              body = init.body;
            }
          }
          try {
            reply = route.route.handle({ method, path: url.pathname, query: url.searchParams, body, state: this.state }, route.params);
          } catch (e) {
            reply = { status: 500, body: { error: (e as Error).message } };
          }
        }
        const status = reply.status ?? 200;
        this.patch(entry, { status: status >= 400 ? "http-error" : "ok", code: status, endedAt: ended, note: status >= 400 ? String(status) : "" });
        resolve(new SimResponse(shown, status, reply.body, reply.headers));
      }, latency);
    });
  };
}
