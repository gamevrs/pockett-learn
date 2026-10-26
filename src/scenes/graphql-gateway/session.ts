import type { ProgramHandle } from "@/engine/program";
import { ADD_REVIEW_MUTATION, BROWSE_QUERY, INTROSPECTION_CHUNK, INTROSPECTION_HEAD, PLACE_ORDER_MUTATION, introspectionTypesQuery } from "./operations";

/**
 * The scene plays the GraphQL client. A GqlSession is a tiny external store (usable with
 * useSyncExternalStore) holding what every pane shares: the request log, the chosen identity,
 * cached responses, the Explorer draft, the cart and the Browse list. It talks to the learner's
 * program only through hooks: execute(request) and the optional reset_db, recent_errors,
 * set_introspection, run_tests and compare_rest.
 *
 * Request  : {query, variables, operationName, headers}
 * Response : {data, errors?, extensions?: {stats?}}   whatever execute() returns, parsed here
 */

export type Source = "explorer" | "app" | "plan" | "docs" | "lab";

export const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export interface GqlRequest {
  query: string;
  variables: Record<string, unknown> | null;
  operationName: string | null;
  headers: Record<string, string>;
}

export interface GqlError {
  message: string;
  path: (string | number)[];
  line: number | null;
  column: number | null;
  code: string | null;
  extensions: Record<string, unknown>;
}

export interface Stats {
  resolvers: number;
  sql: number;
  queries: string[];
  ms: number | null;
}

export interface GqlResult {
  /** True when execute() returned a response dict. */
  ok: boolean;
  /** Why there is no usable response (the hook crashed, returned the wrong type...). */
  problem?: string;
  hasData: boolean;
  data: unknown;
  errors: GqlError[];
  stats: Stats | null;
  ms: number;
  size: number;
  raw: unknown;
}

export interface LogEntry {
  id: number;
  at: number;
  source: Source;
  name: string;
  req: GqlRequest;
  result: GqlResult;
}

export type IdentityId = "anon" | "sam" | "priya" | "ada";

export interface Identity {
  id: IdentityId;
  label: string;
  token: string | null;
  role: string | null;
}

export const IDENTITIES: Identity[] = [
  { id: "anon", label: "Anonymous", token: null, role: null },
  { id: "sam", label: "Sam Carter", token: "sam-token", role: "CUSTOMER" },
  { id: "priya", label: "Priya Nair", token: "priya-token", role: "CUSTOMER" },
  { id: "ada", label: "Ada Admin", token: "admin-token", role: "ADMIN" },
];

export interface Draft {
  nonce: number;
  query: string;
  variables: string;
  operationName: string;
}

export interface CacheSlot {
  key: string;
  epoch: number;
  value: GqlResult;
}

export interface CartLine {
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
}

export interface BrowseItem {
  id: string;
  name: string;
  priceCents: number;
  category: string;
  cursor: string;
}

export interface BrowseFilter {
  category: string;
  search: string;
  maxPriceCents: number | null;
  inStock: boolean;
  sort: string;
}

export const BROWSE_PAGE = 6;

export const DEFAULT_FILTER: BrowseFilter = { category: "", search: "", maxPriceCents: null, inStock: false, sort: "NAME" };

export interface BrowseState {
  filter: BrowseFilter;
  key: string;
  items: BrowseItem[];
  total: number | null;
  endCursor: string | null;
  hasNext: boolean;
  result: GqlResult | null;
  pages: number;
}

export interface TestRow {
  name: string;
  passed: boolean;
  error: string | null;
}

export interface RestCall {
  path: string;
  bytes: number;
}

export interface RestCompare {
  productId: number;
  rest: { requests: number; bytes: number; calls: RestCall[] };
  graphql: { requests: number; bytes: number };
}

export interface ServerLogRow {
  type: string;
  message: string;
}

export interface Snapshot {
  /** Bumped whenever data changed on the server, so views reload. */
  epoch: number;
  log: LogEntry[];
  identity: IdentityId;
  draft: Draft;
  cache: Record<string, CacheSlot>;
  cart: CartLine[];
  browse: BrowseState;
  tests: { rows: TestRow[]; at: number; problem?: string } | null;
  compare: { value: RestCompare | null; problem?: string } | null;
  serverLog: { rows: ServerLogRow[]; at: number; problem?: string } | null;
  introspection: boolean;
  notice: { text: string; tone: "ok" | "warn" | "bad"; nonce: number } | null;
}

const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

function describeType(v: unknown): string {
  if (v === null || v === undefined) return "None";
  if (Array.isArray(v)) return "a list";
  if (typeof v === "object") return "a dict";
  return typeof v === "string" ? "a str" : typeof v === "number" ? "a number" : "a bool";
}

function parseStats(ext: unknown): Stats | null {
  if (!isRecord(ext) || !isRecord(ext.stats)) return null;
  const s = ext.stats;
  const queries = Array.isArray(s.queries) ? s.queries.map((x) => (isRecord(x) ? String(x.sql ?? "") : String(x))) : [];
  const sql = typeof s.sql === "number" && Number.isFinite(s.sql) ? s.sql : Array.isArray(s.sql) ? s.sql.length : queries.length;
  return {
    resolvers: Math.max(0, Math.round(num(s.resolvers))),
    sql: Math.max(0, Math.round(sql)),
    queries,
    ms: typeof s.ms === "number" && Number.isFinite(s.ms) ? s.ms : null,
  };
}

function parseError(e: unknown): GqlError {
  if (!isRecord(e)) return { message: String(e), path: [], line: null, column: null, code: null, extensions: {} };
  const loc = Array.isArray(e.locations) && isRecord(e.locations[0]) ? e.locations[0] : null;
  const extensions = isRecord(e.extensions) ? e.extensions : {};
  return {
    message: typeof e.message === "string" ? e.message : String(e.message ?? "Unknown error"),
    path: Array.isArray(e.path) ? e.path.filter((p): p is string | number => typeof p === "string" || typeof p === "number") : [],
    line: loc && typeof loc.line === "number" ? loc.line : null,
    column: loc && typeof loc.column === "number" ? loc.column : null,
    code: typeof extensions.code === "string" ? extensions.code : null,
    extensions,
  };
}

/** Turn whatever execute() returned into a GqlResult, explaining anything that is not a response. */
export function toResult(value: unknown, ms: number, lastError: string | null): GqlResult {
  const none = (problem: string): GqlResult => ({ ok: false, problem, hasData: false, data: null, errors: [], stats: null, ms, size: 0, raw: null });
  if (value === undefined) return none(lastError ?? "execute() did not return a response.");
  if (!isRecord(value)) {
    return none(`execute() returned ${describeType(value)}, not a response dict. A GraphQL response looks like {"data": {...}} or {"data": None, "errors": [{"message": "..."}]}.`);
  }
  const errors = Array.isArray(value.errors) ? value.errors.map(parseError) : [];
  const hasData = isRecord(value.data);
  if (!hasData && errors.length === 0 && !("data" in value)) {
    return none('The response needs a "data" key, or an "errors" list. Return result.formatted (or a dict like it).');
  }
  let size = 0;
  try {
    size = JSON.stringify(value).length;
  } catch {
    size = 0;
  }
  return { ok: true, hasData, data: hasData ? value.data : null, errors, stats: parseStats(value.extensions), ms, size, raw: value };
}

/** The data at a dotted path, tolerant of anything. */
export function dig(value: unknown, ...keys: (string | number)[]): unknown {
  let cur = value;
  for (const k of keys) {
    if (Array.isArray(cur) && typeof k === "number") cur = cur[k];
    else if (isRecord(cur) && typeof k === "string") cur = cur[k];
    else return undefined;
  }
  return cur;
}

export const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
export const asStr = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : fallback);
export const asNum = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function prettyJson(value: unknown): string {
  if (value === null || value === undefined) return "";
  try {
    return JSON.stringify(value, null, 2) ?? "";
  } catch {
    return String(value);
  }
}

export const timeLabel = (at: number) => new Date(at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

/** Replace literals so identical SQL shapes group together. */
export function normalizeSql(sql: string): string {
  return sql
    .replace(/\s+/g, " ")
    .replace(/'(?:[^']|'')*'/g, "?")
    .replace(/\b\d+(?:\.\d+)?\b/g, "?")
    .replace(/\(\s*\?(?:\s*,\s*\?)+\s*\)/g, "(?, …)")
    .trim();
}

/** Group a request's SQL statements by shape, most repeated first. */
export function groupSql(queries: string[]): { sql: string; count: number }[] {
  const map = new Map<string, number>();
  for (const q of queries) {
    const key = normalizeSql(q);
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([sql, count]) => ({ sql, count })).sort((a, b) => b.count - a.count);
}

const EMPTY_BROWSE: BrowseState = { filter: DEFAULT_FILTER, key: "", items: [], total: null, endCursor: null, hasNext: false, result: null, pages: 0 };
const EMPTY_DRAFT: Draft = { nonce: 0, query: "", variables: "", operationName: "" };

export class GqlSession {
  readonly program: ProgramHandle | null;
  private state: Snapshot;
  private listeners = new Set<() => void>();
  private nextId = 1;
  private noticeNonce = 0;
  private identityOn = false;

  constructor(program: ProgramHandle | null) {
    this.program = program;
    this.state = {
      epoch: 0,
      log: [],
      identity: "anon",
      draft: EMPTY_DRAFT,
      cache: {},
      cart: [],
      browse: EMPTY_BROWSE,
      tests: null,
      compare: null,
      serverLog: null,
      introspection: true,
      notice: null,
    };
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

  /** Called from an effect when the identity feature unlocks (before that, no header is sent). */
  setIdentityEnabled(on: boolean) {
    this.identityOn = on;
  }

  get hasExecute() {
    return !!this.program && this.program.hasHook("execute");
  }

  hasHook(name: string) {
    return !!this.program && this.program.hasHook(name);
  }

  get identity(): Identity {
    return IDENTITIES.find((i) => i.id === this.state.identity) ?? IDENTITIES[0];
  }

  private headers(): Record<string, string> {
    const id = this.identityOn ? this.identity : IDENTITIES[0];
    return id.token ? { Authorization: `Bearer ${id.token}` } : {};
  }

  // ── GraphQL ──
  /** Send one operation through the learner's execute() and log it. Never throws. */
  run(
    op: { query: string; variables?: Record<string, unknown> | null; operationName?: string | null; name?: string; headers?: Record<string, string> },
    source: Source,
  ): LogEntry {
    const req: GqlRequest = {
      query: op.query,
      variables: op.variables ?? null,
      operationName: op.operationName ?? null,
      headers: op.headers ?? this.headers(),
    };
    const started = performance.now();
    let value: unknown;
    let lastError: string | null = null;
    if (!this.program || !this.program.hasHook("execute")) {
      lastError = "Your program has no execute(request) function yet.";
    } else {
      value = this.program.call("execute", req);
      lastError = this.program.lastError;
    }
    const result = toResult(value, Math.round((performance.now() - started) * 10) / 10, lastError);
    const entry: LogEntry = { id: this.nextId++, at: Date.now(), source, name: op.name ?? op.operationName ?? firstWord(op.query), req, result };
    this.set({ log: [entry, ...this.state.log].slice(0, 200) });
    return entry;
  }

  /** Run an operation without logging it (used to assemble the Docs browser from several small requests). */
  private quiet(op: { query: string; headers?: Record<string, string> }): GqlResult {
    const started = performance.now();
    let value: unknown;
    let lastError: string | null = null;
    if (!this.program || !this.program.hasHook("execute")) {
      lastError = "Your program has no execute(request) function yet.";
    } else {
      value = this.program.call("execute", { query: op.query, variables: null, operationName: null, headers: op.headers ?? this.headers() });
      lastError = this.program.lastError;
    }
    return toResult(value, Math.round((performance.now() - started) * 10) / 10, lastError);
  }

  /**
   * Docs browser data. One huge introspection query can take longer than a hook call may run, so the
   * schema is read like real docs tools do: first the type names, then the details in small chunks.
   * The merged result looks exactly like a single introspection response.
   */
  loadIntrospection(slot: string) {
    const key = JSON.stringify(["introspection", this.state.identity, this.identityOn]);
    const cur = this.state.cache[slot];
    if (cur && cur.key === key && cur.epoch === this.state.epoch) return;
    const head = this.quiet({ query: INTROSPECTION_HEAD });
    let value = head;
    const schemaData = dig(head.data, "__schema");
    const names = asArray(dig(schemaData, "types")).flatMap((t) => {
      const n = asStr(dig(t, "name"));
      return n && !n.startsWith("__") ? [n] : [];
    });
    if (head.ok && names.length) {
      const types: unknown[] = [];
      let ms = head.ms;
      let failed: GqlResult | null = null;
      for (let i = 0; i < names.length && !failed; i += INTROSPECTION_CHUNK) {
        const part = names.slice(i, i + INTROSPECTION_CHUNK);
        const chunk = this.quiet({ query: introspectionTypesQuery(part) });
        ms += chunk.ms;
        if (!chunk.ok || !isRecord(chunk.data)) failed = chunk;
        else types.push(...Object.values(chunk.data).filter(isRecord));
      }
      value = failed ?? {
        ...head,
        data: { __schema: { queryType: dig(schemaData, "queryType"), mutationType: dig(schemaData, "mutationType"), types } },
        ms: Math.round(ms * 10) / 10,
      };
    }
    this.set({ cache: { ...this.state.cache, [slot]: { key, epoch: this.state.epoch, value } } });
  }

  /** Load a response into a cache slot unless this exact operation was already loaded for this epoch. */
  load(slot: string, op: { query: string; variables?: Record<string, unknown> | null; operationName?: string | null; name?: string }, source: Source) {
    const key = JSON.stringify([op.query, op.variables ?? null, this.state.identity, this.identityOn]);
    const cur = this.state.cache[slot];
    if (cur && cur.key === key && cur.epoch === this.state.epoch) return;
    const entry = this.run({ ...op, operationName: op.operationName ?? op.name ?? null }, source);
    this.set({ cache: { ...this.state.cache, [slot]: { key, epoch: this.state.epoch, value: entry.result } } });
  }

  invalidate() {
    this.set({ epoch: this.state.epoch + 1 });
  }

  setIdentity(id: IdentityId) {
    if (id === this.state.identity) return;
    this.set({ identity: id, epoch: this.state.epoch + 1, browse: { ...EMPTY_BROWSE, filter: this.state.browse.filter } });
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

  // ── explorer draft ──
  openInExplorer(draft: { query: string; variables?: unknown; operationName?: string }) {
    const base = this.state.draft;
    const vars = draft.variables === undefined || draft.variables === null ? "" : JSON.stringify(draft.variables, null, 2);
    this.set({ draft: { nonce: base.nonce + 1, query: draft.query, variables: vars, operationName: draft.operationName ?? "" } });
  }

  // ── cart ──
  addToCart(line: { productId: string; name: string; priceCents: number }) {
    const cart = [...this.state.cart];
    const i = cart.findIndex((l) => l.productId === line.productId);
    if (i >= 0) cart[i] = { ...cart[i], quantity: cart[i].quantity + 1 };
    else cart.push({ ...line, quantity: 1 });
    this.set({ cart });
  }

  changeQuantity(productId: string, delta: number) {
    const cart = this.state.cart.flatMap((l) => (l.productId === productId ? (l.quantity + delta > 0 ? [{ ...l, quantity: l.quantity + delta }] : []) : [l]));
    this.set({ cart });
  }

  clearCart() {
    this.set({ cart: [] });
  }

  /** placeOrder with the cart's lines. */
  placeOrder(): LogEntry | null {
    if (this.state.cart.length === 0) return null;
    const lines = this.state.cart.map((l) => ({ productId: l.productId, quantity: l.quantity }));
    const entry = this.run({ query: PLACE_ORDER_MUTATION, variables: { input: { lines } }, operationName: "PlaceOrder" }, "app");
    const payload = dig(entry.result.data, "placeOrder");
    const noUserErrors = asArray(dig(payload, "userErrors")).length === 0;
    if (entry.result.errors.length === 0 && isRecord(dig(payload, "order")) && noUserErrors) {
      this.set({ cart: [], epoch: this.state.epoch + 1 });
    }
    return entry;
  }

  createReview(input: { productId: string; rating: number; body: string }): LogEntry {
    const entry = this.run({ query: ADD_REVIEW_MUTATION, variables: { input }, operationName: "AddReview" }, "app");
    const payload = dig(entry.result.data, "createReview");
    if (isRecord(dig(payload, "review")) && asArray(dig(payload, "userErrors")).length === 0) this.invalidate();
    return entry;
  }

  // ── browse (cursor pagination) ──
  browseRun(filter: BrowseFilter, first: number, append: boolean) {
    const prev = this.state.browse;
    const key = JSON.stringify(filter);
    const after = append && prev.key === key ? prev.endCursor : null;
    if (append && !after) return;
    const f: Record<string, unknown> = {};
    if (filter.category) f.category = filter.category;
    if (filter.search.trim()) f.search = filter.search.trim();
    if (filter.maxPriceCents !== null) f.maxPriceCents = filter.maxPriceCents;
    if (filter.inStock) f.inStock = true;
    const variables: Record<string, unknown> = { first, sort: filter.sort || "NAME" };
    if (after) variables.after = after;
    if (Object.keys(f).length) variables.filter = f;
    const entry = this.run({ query: BROWSE_QUERY, variables, operationName: "Browse" }, "app");
    const conn = dig(entry.result.data, "productsConnection");
    const edges = asArray(dig(conn, "edges"));
    const items: BrowseItem[] = edges.flatMap((e) => {
      const node = dig(e, "node");
      if (!isRecord(node)) return [];
      return [
        {
          id: asStr(node.id),
          name: asStr(node.name, "Product"),
          priceCents: asNum(node.priceCents),
          category: asStr(dig(node, "category", "name")),
          cursor: asStr(dig(e, "cursor")),
        },
      ];
    });
    const pageInfo = dig(conn, "pageInfo");
    const endCursor = dig(pageInfo, "endCursor");
    this.set({
      browse: {
        filter,
        key,
        items: append && prev.key === key ? [...prev.items, ...items] : items,
        total: typeof dig(conn, "totalCount") === "number" ? (dig(conn, "totalCount") as number) : null,
        endCursor: typeof endCursor === "string" ? endCursor : null,
        hasNext: dig(pageInfo, "hasNextPage") === true,
        result: entry.result,
        pages: append && prev.key === key ? prev.pages + 1 : 1,
      },
    });
  }

  // ── hooks that are not GraphQL ──
  resetData(): boolean {
    if (!this.program || !this.program.hasHook("reset_db")) {
      this.notify("Define reset_db() to rebuild the database.", "warn");
      return false;
    }
    const out = this.program.call("reset_db");
    if (out === undefined && this.program.lastError) {
      this.notify(this.program.lastError, "bad");
      return false;
    }
    this.set({ cache: {}, cart: [], browse: { ...EMPTY_BROWSE, filter: this.state.browse.filter }, epoch: this.state.epoch + 1 });
    this.notify("Database rebuilt from the seed data.", "ok");
    return true;
  }

  refreshServerLog() {
    const at = Date.now();
    if (!this.program || !this.program.hasHook("recent_errors")) {
      this.set({ serverLog: { rows: [], at, problem: "Define recent_errors() to see the server-side log here." } });
      return;
    }
    const raw = this.program.call<unknown>("recent_errors");
    if (!Array.isArray(raw)) {
      this.set({ serverLog: { rows: [], at, problem: this.program.lastError ?? "recent_errors() must return a list of {type, message}." } });
      return;
    }
    const rows = raw.flatMap((r) => (isRecord(r) ? [{ type: String(r.type ?? "Error"), message: String(r.message ?? "") }] : [String(r)].map((message) => ({ type: "Error", message }))));
    this.set({ serverLog: { rows, at } });
  }

  setIntrospection(enabled: boolean) {
    if (!this.program || !this.program.hasHook("set_introspection")) {
      this.notify("Define set_introspection(enabled) to switch introspection off for production.", "warn");
      return;
    }
    const out = this.program.call("set_introspection", enabled);
    if (out === undefined && this.program.lastError) {
      this.notify(this.program.lastError, "bad");
      return;
    }
    this.set({ introspection: enabled, epoch: this.state.epoch + 1 });
  }

  runTests() {
    const at = Date.now();
    if (!this.program || !this.program.hasHook("run_tests")) {
      this.set({ tests: { rows: [], at, problem: "Define run_tests() (lesson 14) to run your suite here." } });
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
    // tests rebuild the database, so everything on screen is stale
    this.set({ tests: { rows, at }, cache: {}, browse: { ...EMPTY_BROWSE, filter: this.state.browse.filter }, epoch: this.state.epoch + 1 });
  }

  compareRest(productId: number) {
    if (!this.program || !this.program.hasHook("compare_rest")) {
      this.set({ compare: { value: null, problem: "Define compare_rest(product_id) (lesson 14) to compare here." } });
      return;
    }
    const raw = this.program.call<unknown>("compare_rest", productId);
    const rest = dig(raw, "rest");
    const gql = dig(raw, "graphql");
    if (!isRecord(rest) || !isRecord(gql)) {
      this.set({ compare: { value: null, problem: this.program.lastError ?? 'compare_rest() must return {"rest": {...}, "graphql": {...}}.' } });
      return;
    }
    const calls: RestCall[] = asArray(rest.calls).flatMap((c) => (isRecord(c) ? [{ path: asStr(c.path, "/"), bytes: asNum(c.bytes) }] : []));
    this.set({
      compare: {
        value: {
          productId,
          rest: { requests: asNum(rest.requests, calls.length), bytes: asNum(rest.bytes, calls.reduce((s, c) => s + c.bytes, 0)), calls },
          graphql: { requests: asNum(gql.requests, 1), bytes: asNum(gql.bytes) },
        },
      },
    });
  }
}

function firstWord(query: string): string {
  const m = /(?:query|mutation)\s+(\w+)/.exec(query);
  if (m) return m[1];
  return query.trim().startsWith("mutation") ? "mutation" : "query";
}
