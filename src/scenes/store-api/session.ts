import type { ProgramHandle } from "@/engine/program";

/**
 * The scene plays the HTTP client. An ApiSession is a tiny external store (usable with
 * useSyncExternalStore) holding everything the three panes share: the request log, the signed-in
 * user, cached responses and the request being edited in the console. It talks to the learner's
 * program only through `program.call("handle", request)`.
 *
 * Request  : {method, path, headers, body}   body is the raw text of the request (JSON text or null)
 * Response : {status, headers, body}         whatever the learner's handle() returns, validated here
 */

export type Source = "console" | "shop" | "cart" | "admin" | "account" | "docs";

export interface ApiRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: string | null;
}

export interface ApiResult {
  /** True when handle() returned a well-formed response. */
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  body: unknown;
  ms: number;
  size: number;
  /** Why there is no usable response (the handler crashed, returned the wrong type...). */
  problem?: string;
}

export interface ServerError {
  type: string;
  message: string;
}

export interface LogEntry {
  id: number;
  at: number;
  source: Source;
  req: ApiRequest;
  result: ApiResult;
  /** What the learner's recent_errors() hook reported right after a 5xx. */
  server?: ServerError;
}

export interface SessionUser {
  id: number;
  email: string;
  role: string;
}

export interface Draft {
  nonce: number;
  entryId: number | null;
  method: string;
  path: string;
  headers: string;
  body: string;
  auth: boolean;
}

export interface CacheSlot<T = unknown> {
  key: string;
  epoch: number;
  value: T;
}

export interface TestRow {
  name: string;
  passed: boolean;
  error: string | null;
}

export interface Snapshot {
  /** Bumped whenever data changed on the server, so views reload. */
  epoch: number;
  log: LogEntry[];
  token: string | null;
  user: SessionUser | null;
  draft: Draft;
  cache: Record<string, CacheSlot>;
  tests: { rows: TestRow[]; at: number; problem?: string } | null;
  notice: { text: string; tone: "ok" | "warn" | "bad"; nonce: number } | null;
}

const STATUS_TEXT: Record<number, string> = {
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No Content",
  301: "Moved Permanently",
  304: "Not Modified",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  412: "Precondition Failed",
  415: "Unsupported Media Type",
  422: "Unprocessable Content",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
};

export const statusText = (status: number) => STATUS_TEXT[status] ?? (status >= 500 ? "Server Error" : status >= 400 ? "Client Error" : status >= 300 ? "Redirect" : "Success");

export type Tone = "ok" | "info" | "warn" | "bad";

export const statusTone = (status: number): Tone => (status >= 500 || status <= 0 ? "bad" : status >= 400 ? "warn" : status >= 300 ? "info" : "ok");

export const TONE_TEXT: Record<Tone, string> = {
  ok: "text-[#d3f3a4]",
  info: "text-white/60",
  warn: "text-[#fbbf24]",
  bad: "text-[#f87171]",
};

export const TONE_CHIP: Record<Tone, string> = {
  ok: "border-[#c5ee8a]/35 bg-[#c5ee8a]/10 text-[#d3f3a4]",
  info: "border-white/15 bg-white/[0.05] text-white/70",
  warn: "border-[#fbbf24]/35 bg-[#fbbf24]/10 text-[#fbbf24]",
  bad: "border-[#f87171]/40 bg-[#f87171]/10 text-[#f87171]",
};

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Case-insensitive header lookup. */
export function header(headers: Record<string, string>, name: string): string | undefined {
  const wanted = name.toLowerCase();
  for (const [k, v] of Object.entries(headers)) if (k.toLowerCase() === wanted) return v;
  return undefined;
}

function describeType(v: unknown): string {
  if (v === null || v === undefined) return "None";
  if (Array.isArray(v)) return "a list";
  if (typeof v === "object") return "a dict";
  return typeof v === "string" ? "a str" : typeof v === "number" ? "a number" : "a bool";
}

/** Turn whatever handle() returned into an ApiResult, explaining anything that is not a response. */
export function toResult(value: unknown, ms: number, lastError: string | null): ApiResult {
  const none = (problem: string): ApiResult => ({ ok: false, status: 0, headers: {}, body: null, ms, size: 0, problem });
  if (value === undefined) return none(lastError ?? "handle() did not return a response.");
  if (!isRecord(value)) {
    return none(`handle() returned ${describeType(value)}, not a response dict. A response looks like {"status": 200, "headers": {...}, "body": {...}}. (If the body holds a sqlite3.Row, a set or a datetime, convert it to plain data first.)`);
  }
  const status = value.status;
  if (typeof status !== "number" || !Number.isFinite(status) || status < 100 || status > 599) {
    return none(`The response needs an integer "status" between 100 and 599 (got ${JSON.stringify(status) ?? "nothing"}).`);
  }
  const headers: Record<string, string> = {};
  if (isRecord(value.headers)) for (const [k, v] of Object.entries(value.headers)) headers[k] = String(v);
  let size = 0;
  try {
    size = value.body === null || value.body === undefined ? 0 : JSON.stringify(value.body).length;
  } catch {
    size = 0;
  }
  return { ok: true, status: Math.trunc(status), headers, body: value.body ?? null, ms, size };
}

const EMPTY_DRAFT: Draft = { nonce: 0, entryId: null, method: "GET", path: "/health", headers: "", body: "", auth: true };

export class ApiSession {
  readonly program: ProgramHandle | null;
  private state: Snapshot;
  private listeners = new Set<() => void>();
  private nextId = 1;
  private noticeNonce = 0;
  private captureServerErrors = false;

  constructor(program: ProgramHandle | null) {
    this.program = program;
    this.state = { epoch: 0, log: [], token: null, user: null, draft: EMPTY_DRAFT, cache: {}, tests: null, notice: null };
  }

  // ── store plumbing ──
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.state;

  private set(patch: Partial<Snapshot>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  /** Called from an effect when the "error shield" feature unlocks. */
  setCaptureServerErrors(on: boolean) {
    this.captureServerErrors = on;
  }

  get hasHandle() {
    return !!this.program && this.program.hasHook("handle");
  }

  hasHook(name: string) {
    return !!this.program && this.program.hasHook(name);
  }

  // ── HTTP ──
  /** Send one request through the learner's handle() and log it. Never throws. */
  call(req: ApiRequest, source: Source): LogEntry {
    const started = performance.now();
    let value: unknown;
    let lastError: string | null = null;
    if (!this.program || !this.program.hasHook("handle")) {
      value = undefined;
      lastError = "Your program has no handle(request) function yet.";
    } else {
      value = this.program.call("handle", { method: req.method, path: req.path, headers: req.headers, body: req.body });
      lastError = this.program.lastError;
    }
    const result = toResult(value, Math.round((performance.now() - started) * 10) / 10, lastError);
    const entry: LogEntry = { id: this.nextId++, at: Date.now(), source, req, result };
    if (result.status >= 500 && this.captureServerErrors && this.program?.hasHook("recent_errors")) {
      const recent = this.program.call<unknown[]>("recent_errors");
      const last = Array.isArray(recent) ? recent[recent.length - 1] : undefined;
      if (isRecord(last)) entry.server = { type: String(last.type ?? "Error"), message: String(last.message ?? "") };
    }
    this.set({ log: [entry, ...this.state.log].slice(0, 300) });
    return entry;
  }

  /** Build and send a request, adding the bearer token (unless `auth` is false). */
  request(
    method: string,
    path: string,
    opts: { json?: unknown; rawBody?: string | null; headers?: Record<string, string>; auth?: boolean; source: Source },
  ): LogEntry {
    const headers: Record<string, string> = { Accept: "application/json", ...(opts.headers ?? {}) };
    let body: string | null = null;
    if (opts.rawBody !== undefined) body = opts.rawBody;
    else if (opts.json !== undefined) body = JSON.stringify(opts.json);
    if (body !== null && !Object.keys(headers).some((k) => k.toLowerCase() === "content-type")) headers["Content-Type"] = "application/json";
    if ((opts.auth ?? true) && this.state.token && !Object.keys(headers).some((k) => k.toLowerCase() === "authorization")) {
      headers["Authorization"] = `Bearer ${this.state.token}`;
    }
    return this.call({ method, path, headers, body }, opts.source);
  }

  /** POST /auth/login through handle(); on success remember the token for the shop and console. */
  login(email: string, password: string, source: Source): LogEntry {
    const entry = this.request("POST", "/auth/login", { json: { email, password }, source, auth: false });
    const body = entry.result.body;
    if (entry.result.status === 200 && isRecord(body) && typeof body.token === "string") {
      const u = isRecord(body.user) ? body.user : null;
      const user = u && typeof u.email === "string" ? { id: Number(u.id), email: u.email, role: String(u.role ?? "") } : null;
      this.setSession(body.token, user);
    }
    return entry;
  }

  /** Load a response into the cache slot unless that exact request was already loaded for this epoch. */
  load(slot: string, req: { method?: string; path: string; auth?: boolean }, source: Source) {
    const key = `${req.method ?? "GET"} ${req.path} ${req.auth === false ? "anon" : this.state.token ? "t" : "anon"}`;
    const cur = this.state.cache[slot];
    if (cur && cur.key === key && cur.epoch === this.state.epoch) return;
    const entry = this.request(req.method ?? "GET", req.path, { source, auth: req.auth });
    this.set({ cache: { ...this.state.cache, [slot]: { key, epoch: this.state.epoch, value: entry.result } } });
  }

  /** Same idea for a plain hook such as list_products(); not an HTTP call, so it is not logged. */
  loadHook(slot: string, hook: string) {
    const key = `hook ${hook}`;
    const cur = this.state.cache[slot];
    if (cur && cur.key === key && cur.epoch === this.state.epoch) return;
    let value: unknown;
    let problem: string | null = null;
    if (!this.program || !this.program.hasHook(hook)) problem = `Define ${hook}() to see this.`;
    else {
      value = this.program.call(hook);
      if (value === undefined) problem = this.program.lastError ?? `${hook}() did not return anything.`;
    }
    this.set({ cache: { ...this.state.cache, [slot]: { key, epoch: this.state.epoch, value: { value, problem } } } });
  }

  /** The data changed on the server (a write succeeded): views should reload. */
  bump() {
    this.set({ epoch: this.state.epoch + 1 });
  }

  setSession(token: string, user: SessionUser | null) {
    this.set({ token, user, epoch: this.state.epoch + 1 });
  }

  signOut() {
    this.set({ token: null, user: null, epoch: this.state.epoch + 1 });
    this.notify("Signed out (the token is forgotten here; the server still knows it until it expires).", "ok");
  }

  notify(text: string, tone: "ok" | "warn" | "bad" = "ok") {
    this.set({ notice: { text, tone, nonce: ++this.noticeNonce } });
  }

  clearNotice() {
    if (this.state.notice) this.set({ notice: null });
  }

  clearLog() {
    this.set({ log: [] });
  }

  // ── console draft ──
  openInConsole(draft: Partial<Omit<Draft, "nonce">>) {
    const base = this.state.draft;
    this.set({ draft: { ...base, entryId: null, ...draft, nonce: base.nonce + 1 } });
  }

  // ── hooks that are not HTTP ──
  /** Rebuild the learner's database with their reset_db(). */
  resetData(): boolean {
    if (!this.program || !this.program.hasHook("reset_db")) {
      this.notify("Define reset_db() (lesson 4) to rebuild the database.", "warn");
      return false;
    }
    const out = this.program.call("reset_db");
    if (out === undefined && this.program.lastError) {
      this.notify(this.program.lastError, "bad");
      return false;
    }
    this.set({ token: null, user: null, cache: {}, epoch: this.state.epoch + 1 });
    this.notify("Database rebuilt from scratch. Signed out.", "ok");
    return true;
  }

  runTests() {
    const at = Date.now();
    if (!this.program || !this.program.hasHook("run_tests")) {
      this.set({ tests: { rows: [], at, problem: "Define run_tests() (lesson 13) to run your suite here." } });
      return;
    }
    const raw = this.program.call<unknown>("run_tests");
    if (!Array.isArray(raw)) {
      this.set({ tests: { rows: [], at, problem: this.program.lastError ?? "run_tests() must return a list of {name, passed, error}." } });
      return;
    }
    const rows: TestRow[] = raw.flatMap((r) => {
      if (!isRecord(r)) return [];
      return [{ name: String(r.name ?? "test"), passed: r.passed === true, error: r.error == null ? null : String(r.error) }];
    });
    this.set({ tests: { rows, at } });
    // tests rebuild the database, so everything on screen is stale
    this.set({ token: null, user: null, cache: {}, epoch: this.state.epoch + 1 });
  }
}

// ───────────────────────── value helpers ─────────────────────────

export interface Product {
  id: number;
  sku: string;
  name: string;
  description: string;
  category: string;
  price_cents: number;
  stock: number;
}

export function toProduct(v: unknown): Product | null {
  if (!isRecord(v)) return null;
  const id = Number(v.id);
  if (!Number.isFinite(id)) return null;
  const cents = Number(v.price_cents);
  const stock = Number(v.stock);
  return {
    id,
    sku: typeof v.sku === "string" ? v.sku : "",
    name: typeof v.name === "string" && v.name ? v.name : `Product ${id}`,
    description: typeof v.description === "string" ? v.description : "",
    category: typeof v.category === "string" ? v.category : "",
    price_cents: Number.isFinite(cents) ? cents : 0,
    stock: Number.isFinite(stock) ? stock : 0,
  };
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number | null;
  pages: number | null;
  perPage: number | null;
}

/** Accepts {"items": [...]} or a bare list; anything else gives null. */
export function toProductPage(body: unknown): ProductPage | null {
  const rawItems = Array.isArray(body) ? body : isRecord(body) && Array.isArray(body.items) ? body.items : null;
  if (!rawItems) return null;
  const items = rawItems.flatMap((p) => {
    const product = toProduct(p);
    return product ? [product] : [];
  });
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const rec = isRecord(body) ? body : {};
  return { items, total: num(rec.total) ?? items.length, page: num(rec.page), pages: num(rec.pages), perPage: num(rec.per_page) };
}

export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** {"error": {"code", "message", "details"}} -> the pieces, tolerant of other shapes. */
export function readError(body: unknown): { code: string; message: string; details: { field: string; message: string }[] } | null {
  if (!isRecord(body)) return null;
  const err = body.error;
  if (!isRecord(err)) return null;
  const details = Array.isArray(err.details)
    ? err.details.flatMap((d) => (isRecord(d) ? [{ field: String(d.field ?? ""), message: String(d.message ?? "") }] : []))
    : [];
  return { code: String(err.code ?? ""), message: String(err.message ?? ""), details };
}

/** A short sentence describing a failed result for UI banners. */
export function describeFailure(result: ApiResult): string {
  if (!result.ok) return result.problem ?? "No response from handle().";
  const err = readError(result.body);
  if (err) return `${result.status} ${err.code || statusText(result.status)}: ${err.message}`;
  return `${result.status} ${statusText(result.status)}`;
}

export function prettyJson(value: unknown): string {
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2) ?? "";
  } catch {
    return String(value);
  }
}

export const timeLabel = (at: number) => new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

export { isRecord };
