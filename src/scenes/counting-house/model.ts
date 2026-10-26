import type { ProgramHandle } from "@/engine/program";

/**
 * Counting House: reading the learner's result sets.
 *
 * The runtime hands the scene every result set the query file produced (`results`), the database's
 * tables (`tables`) and, when a statement failed, `error`. Each panel finds its own result set by
 * the COLUMNS it returns (see `assign`), so a panel lights up when the learner's query has the shape
 * the lesson asks for. Everything is read defensively: any result may be missing, partial or carry
 * extra columns, and nothing here throws.
 */

export type Cell = string | number | null;

export interface ResultSet {
  sql: string;
  columns: string[];
  rows: Cell[][];
}

export interface TableInfo {
  name: string;
  columns: { name: string; type: string }[];
  rowCount: number;
}

export interface SqlErr {
  type: string;
  message: string;
  line: number | null;
}

export type Row = Record<string, Cell>;

// ───────────────────────── panels ─────────────────────────

export type GhostKind = "beam" | "tiles" | "table" | "bars" | "stream" | "lanes" | "timeline" | "plan" | "chart" | "list" | "stamp" | "tenants" | "console" | "schema";

export interface PanelDef {
  id: string;
  title: string;
  lesson: number;
  clause: string;
  ghost: GhostKind;
  wide?: boolean;
}

export const PANELS: PanelDef[] = [
  { id: "ch-trial", title: "Trial balance", lesson: 1, clause: "CREATE TABLE · CHECK · generated column · view", ghost: "beam", wide: true },
  { id: "ch-posting", title: "Posting run", lesson: 2, clause: "INSERT … SELECT … UNION ALL", ghost: "bars" },
  { id: "ch-guards", title: "Invariant guards", lesson: 3, clause: "CREATE TRIGGER … RAISE(ABORT)", ghost: "list" },
  { id: "ch-money", title: "Money desk", lesson: 4, clause: "integer cents · largest remainder", ghost: "tiles" },
  { id: "ch-idem", title: "Idempotency desk", lesson: 5, clause: "INSERT … ON CONFLICT DO NOTHING", ghost: "stream" },
  { id: "ch-outbox", title: "Outbox relay", lesson: 6, clause: "BEGIN · COMMIT · UPDATE … RETURNING", ghost: "stream" },
  { id: "ch-queue", title: "Job queue", lesson: 7, clause: "UPDATE … RETURNING with a guard", ghost: "lanes", wide: true },
  { id: "ch-dead", title: "Dead letters", lesson: 8, clause: "lease expiry · backoff · dead-lettering", ghost: "list" },
  { id: "ch-audit", title: "Audit trail", lesson: 9, clause: "AFTER UPDATE trigger · json_object()", ghost: "timeline" },
  { id: "ch-retention", title: "Retention sweep", lesson: 10, clause: "batched DELETE · changes()", ghost: "bars" },
  { id: "ch-tenants", title: "Tenant isolation", lesson: 11, clause: "views over session_ctx · composite FK", ghost: "tenants", wide: true },
  { id: "ch-plans", title: "Query plans", lesson: 12, clause: "EXPLAIN QUERY PLAN · CREATE INDEX", ghost: "plan", wide: true },
  { id: "ch-pages", title: "Pages without N+1", lesson: 13, clause: "keyset: WHERE (a, b) < (?, ?)", ghost: "list" },
  { id: "ch-statement", title: "Statements & trends", lesson: 14, clause: "SUM() OVER · LAG()", ghost: "chart" },
  { id: "ch-rollup", title: "Roll-ups & late data", lesson: 15, clause: "ON CONFLICT DO UPDATE · watermark", ghost: "chart", wide: true },
  { id: "ch-quality", title: "Data quality", lesson: 16, clause: "FULL OUTER JOIN · invariant queries", ghost: "list", wide: true },
  { id: "ch-migrations", title: "Safe migrations", lesson: 17, clause: "expand · backfill · contract", ghost: "timeline" },
  { id: "ch-close", title: "Month-end close", lesson: 18, clause: "settle · lock the period · prove", ghost: "stamp" },
];

export const PANEL_IDS = PANELS.map((p) => p.id);

// ───────────────────────── reading the program ─────────────────────────

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function readResults(program: ProgramHandle | null): ResultSet[] {
  if (!program) return [];
  return program.list<unknown>("results").flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const r = raw as Record<string, unknown>;
    const columns = Array.isArray(r.columns) ? r.columns.map((c) => String(c)) : [];
    if (columns.length === 0) return [];
    const rows = Array.isArray(r.rows) ? (r.rows.filter((row) => Array.isArray(row)) as Cell[][]) : [];
    return [{ sql: typeof r.sql === "string" ? r.sql : "", columns, rows }];
  });
}

export function readTables(program: ProgramHandle | null): TableInfo[] {
  if (!program) return [];
  return program.list<unknown>("tables").flatMap((raw) => {
    if (!raw || typeof raw !== "object") return [];
    const t = raw as Record<string, unknown>;
    if (typeof t.name !== "string") return [];
    const columns = Array.isArray(t.columns)
      ? t.columns.flatMap((c) => {
          if (!c || typeof c !== "object") return [];
          const col = c as Record<string, unknown>;
          return [{ name: String(col.name ?? "?"), type: String(col.type ?? "") }];
        })
      : [];
    return [{ name: t.name, columns, rowCount: isNum(t.rowCount) ? t.rowCount : 0 }];
  });
}

export function readError(program: ProgramHandle | null): SqlErr | null {
  if (!program) return null;
  const e = program.dict<unknown>("error");
  if (typeof e.message !== "string") return null;
  return { type: typeof e.type === "string" ? e.type : "SQLError", message: e.message, line: isNum(e.line) ? e.line : null };
}

/** Tables the hidden setup creates; anything else in the database list was made by the learner. */
export const SEED_TABLES = new Set(["tenants", "currencies", "clock", "session_ctx", "members", "accounts", "orders", "topups", "processor_settlements", "payout_requests", "card_attempts", "jobs"]);

// ───────────────────────── small helpers ─────────────────────────

export const ci = (rs: ResultSet, name: string) => rs.columns.findIndex((c) => c.toLowerCase() === name.toLowerCase());
export const hasCols = (rs: ResultSet, ...names: string[]) => names.every((n) => ci(rs, n) >= 0);

/** Rows as objects keyed by lower-cased column name. */
export function objs(rs: ResultSet | null | undefined): Row[] {
  if (!rs) return [];
  const keys = rs.columns.map((c) => c.toLowerCase());
  return rs.rows.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? null])));
}

export function n(v: Cell | undefined): number | null {
  if (isNum(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export const n0 = (v: Cell | undefined) => n(v) ?? 0;

export function s(v: Cell | undefined): string {
  if (v === null || v === undefined) return "";
  return typeof v === "string" ? v : String(v);
}

/** The statement without comments or string literals, lower-cased, for keyword checks. */
export function bareSql(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?(\*\/|$)/g, " ")
    .replace(/--[^\n]*/g, " ")
    .replace(/'(?:[^']|'')*'/g, "''")
    .toLowerCase();
}

/** The statement as the learner wrote it, minus comments. */
export function displaySql(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?(\*\/|$)/g, "")
    .split("\n")
    .map((l) => (/^\s*--/.test(l) ? "" : l))
    .filter((l) => l.trim().length > 0)
    .join("\n")
    .trim();
}

export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** 123456 → "$1,234.56"; negative amounts keep their sign in front. */
export function money(cents: number | null | undefined, opts: { sign?: boolean; compact?: boolean } = {}): string {
  if (cents === null || cents === undefined || !Number.isFinite(cents)) return "—";
  const neg = cents < 0;
  const abs = Math.abs(Math.round(cents));
  const dollars = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, "0");
  let body: string;
  if (opts.compact && dollars >= 10000) body = `${(dollars / 1000).toFixed(dollars >= 100000 ? 0 : 1)}k`;
  else body = `${dollars.toLocaleString("en-US")}.${rest}`;
  return `${neg ? "−" : opts.sign && cents > 0 ? "+" : ""}$${body}`;
}

export function fmtInt(v: number): string {
  return Math.round(v).toLocaleString("en-US");
}

/** "2026-03-02 09:15:00" → "03-02 09:15" */
export function shortStamp(v: string): string {
  const m = /^\d{4}-(\d{2}-\d{2})[ T](\d{2}:\d{2})/.exec(v);
  return m ? `${m[1]} ${m[2]}` : v;
}

export const shortDay = (v: string) => (/^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(5, 10) : v);

export function fmtCell(v: Cell, col = ""): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isInteger(v) ? (Math.abs(v) >= 100000 ? v.toLocaleString("en-US") : String(v)) : String(Number(v.toFixed(3)));
  if (/_cents$/.test(col) && typeof v === "string" && n(v) !== null) return money(n(v));
  return String(v);
}

// ───────────────────────── which result feeds which panel ─────────────────────────

export interface PlanLine {
  text: string;
  depth: number;
}

export interface PlanGroup {
  key: string;
  /** The statement, minus "EXPLAIN QUERY PLAN" and comments. */
  statement: string;
  before: PlanLine[];
  /** Null while only one plan has been run for this statement. */
  after: PlanLine[] | null;
}

export interface Bundle {
  trial: ResultSet | null;
  beam: ResultSet | null;
  posting: ResultSet | null;
  guards: ResultSet | null;
  feeAudit: ResultSet | null;
  shortfall: ResultSet | null;
  split: ResultSet | null;
  display: ResultSet | null;
  idemStream: ResultSet | null;
  idemSummary: ResultSet | null;
  outbox: ResultSet | null;
  claim: ResultSet | null;
  board: ResultSet | null;
  dead: ResultSet | null;
  audit: ResultSet | null;
  retention: ResultSet | null;
  /** One result per tenant, in tenant order. */
  tenants: ResultSet[];
  lookup: ResultSet | null;
  plans: PlanGroup[];
  nplus1: ResultSet | null;
  /** Keyset pages, one per page number, in page order. */
  pages: ResultSet[];
  statement: ResultSet | null;
  mom: ResultSet | null;
  stages: ResultSet[];
  daily: ResultSet | null;
  late: ResultSet | null;
  checks: ResultSet | null;
  recon: ResultSet | null;
  migrations: ResultSet | null;
  progress: ResultSet | null;
  proofs: ResultSet | null;
}

const lastWhere = (results: ResultSet[], test: (rs: ResultSet) => boolean): ResultSet | null => {
  for (let i = results.length - 1; i >= 0; i--) if (test(results[i])) return results[i];
  return null;
};

/** The matching result with the most rows (the latest of equals): the full table beats a RETURNING slice. */
const biggestWhere = (results: ResultSet[], test: (rs: ResultSet) => boolean): ResultSet | null => {
  let best: ResultSet | null = null;
  for (const r of results) if (test(r) && (!best || r.rows.length >= best.rows.length)) best = r;
  return best;
};

const isPlan = (r: ResultSet) => hasCols(r, "detail", "parent") || /^\s*explain\b/.test(bareSql(r.sql).trim());

function planLines(rs: ResultSet): PlanLine[] {
  const iId = ci(rs, "id");
  const iParent = ci(rs, "parent");
  const iDetail = ci(rs, "detail") >= 0 ? ci(rs, "detail") : rs.columns.length - 1;
  const depthOf = new Map<number, number>();
  return rs.rows.map((row) => {
    const id = iId >= 0 ? n(row[iId]) : null;
    const parent = iParent >= 0 ? n(row[iParent]) : null;
    const depth = parent === null ? 0 : (depthOf.get(parent) ?? 0) + (parent === 0 ? 0 : 1);
    if (id !== null) depthOf.set(id, depth);
    return { text: s(row[iDetail]), depth };
  });
}

function planGroups(results: ResultSet[]): PlanGroup[] {
  const groups = new Map<string, { statement: string; plans: ResultSet[] }>();
  for (const r of results.filter(isPlan)) {
    const statement = displaySql(r.sql).replace(/^\s*explain\s+query\s+plan\s*/i, "").replace(/\s+/g, " ").replace(/;$/, "").trim();
    const key = statement.toLowerCase();
    const g = groups.get(key) ?? { statement, plans: [] };
    g.plans.push(r);
    groups.set(key, g);
  }
  return [...groups.entries()].map(([key, g]) => ({
    key,
    statement: g.statement,
    before: planLines(g.plans[0]),
    after: g.plans.length > 1 ? planLines(g.plans[g.plans.length - 1]) : null,
  }));
}

export function assign(results: ResultSet[]): Bundle {
  const tenants = new Map<number, ResultSet>();
  for (const r of results) {
    if (!hasCols(r, "as_tenant", "entries")) continue;
    const t = n(r.rows[0]?.[ci(r, "as_tenant")]);
    if (t !== null) tenants.set(t, r);
  }
  const pages = new Map<number, ResultSet>();
  for (const r of results) {
    if (!hasCols(r, "page", "entry_id")) continue;
    const p = n(r.rows[0]?.[ci(r, "page")]);
    if (p !== null) pages.set(p, r);
  }
  const stages = new Map<string, ResultSet>();
  for (const r of results) if (hasCols(r, "stage", "hours", "attempts") && r.rows[0]) stages.set(s(r.rows[0][ci(r, "stage")]), r);

  return {
    trial: lastWhere(results, (r) => hasCols(r, "code", "account", "debit_cents", "credit_cents")),
    beam: lastWhere(results, (r) => hasCols(r, "total_debits", "total_credits")),
    posting: lastWhere(results, (r) => hasCols(r, "source", "entries", "lines", "total_cents")),
    guards: lastWhere(results, (r) => hasCols(r, "rule", "violations")),
    feeAudit: lastWhere(results, (r) => hasCols(r, "order_id", "stored_fee_cents", "correct_fee_cents")),
    shortfall: lastWhere(results, (r) => hasCols(r, "orders_wrong", "shortfall_cents")),
    split: lastWhere(results, (r) => hasCols(r, "seller", "share_cents")),
    display: lastWhere(results, (r) => hasCols(r, "currency", "amount_cents", "display")),
    idemStream: lastWhere(results, (r) => hasCols(r, "req_id", "idem_key", "outcome")),
    idemSummary: lastWhere(results, (r) => hasCols(r, "outcome", "requests", "cents")),
    outbox: biggestWhere(results, (r) => hasCols(r, "event_id", "topic", "status")),
    claim: lastWhere(results, (r) => hasCols(r, "event_id", "claimed_by") && ci(r, "status") < 0),
    board: biggestWhere(results, (r) => hasCols(r, "job_id", "kind", "state")),
    dead: lastWhere(results, (r) => hasCols(r, "job_id", "last_error", "attempts", "max_attempts") && ci(r, "state") < 0),
    audit: lastWhere(results, (r) => hasCols(r, "audit_id", "actor", "field", "new_value")),
    retention: lastWhere(results, (r) => hasCols(r, "store", "purged", "kept")),
    tenants: [...tenants.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r),
    lookup: lastWhere(results, (r) => hasCols(r, "lookup", "rows_returned")),
    plans: planGroups(results),
    nplus1: lastWhere(results, (r) => hasCols(r, "entry_id", "line_count", "total_cents")),
    pages: [...pages.entries()].sort((a, b) => a[0] - b[0]).map(([, r]) => r),
    statement: lastWhere(results, (r) => hasCols(r, "posted_at", "balance_cents", "credit_cents")),
    mom: lastWhere(results, (r) => hasCols(r, "month", "fees_cents")),
    stages: [...stages.values()],
    daily: lastWhere(results, (r) => hasCols(r, "day", "attempts", "approval_pct")),
    late: lastWhere(results, (r) => hasCols(r, "day", "late_events")),
    checks: lastWhere(results, (r) => hasCols(r, "check_name", "violations")),
    recon: lastWhere(results, (r) => hasCols(r, "processor_ref", "status")),
    migrations: lastWhere(results, (r) => hasCols(r, "version", "name", "phase")),
    progress: lastWhere(results, (r) => hasCols(r, "remaining", "backfilled")),
    proofs: lastWhere(results, (r) => hasCols(r, "proof", "expected_cents", "actual_cents")),
  };
}

/** Number of rows each panel's main result has, for the header meta. */
export function rowsFor(id: string, b: Bundle): number | undefined {
  const rs: ResultSet | null | undefined = {
    "ch-trial": b.trial,
    "ch-posting": b.posting,
    "ch-guards": b.guards,
    "ch-money": b.feeAudit ?? b.split ?? b.display,
    "ch-idem": b.idemStream,
    "ch-outbox": b.outbox,
    "ch-queue": b.board,
    "ch-dead": b.dead ?? b.board,
    "ch-audit": b.audit,
    "ch-retention": b.retention,
    "ch-statement": b.statement,
    "ch-rollup": b.daily,
    "ch-quality": b.checks,
    "ch-migrations": b.migrations,
    "ch-close": b.proofs,
  }[id];
  return rs ? rs.rows.length : undefined;
}

/** Everything a panel needs to know it has data. */
export function hasData(id: string, b: Bundle): boolean {
  switch (id) {
    case "ch-money":
      return !!(b.feeAudit || b.shortfall || b.split || b.display);
    case "ch-tenants":
      return b.tenants.length > 0 || !!b.lookup;
    case "ch-plans":
      return b.plans.length > 0;
    case "ch-pages":
      return !!b.nplus1 || b.pages.length > 0;
    case "ch-statement":
      return !!(b.statement || b.mom);
    case "ch-rollup":
      return !!(b.daily || b.late || b.stages.length);
    case "ch-quality":
      return !!(b.checks || b.recon);
    case "ch-migrations":
      return !!(b.migrations || b.progress);
    case "ch-idem":
      return !!(b.idemStream || b.idemSummary);
    case "ch-dead":
      return !!(b.dead || (b.board && objs(b.board).some((r) => s(r.state) === "dead")));
    case "ch-trial":
      return !!(b.trial || b.beam);
    default:
      return rowsFor(id, b) !== undefined;
  }
}

// ───────────────────────── tenants ─────────────────────────

export const TENANT_NAMES: Record<number, { name: string; short: string; currency: string }> = {
  1: { name: "Fernhollow Co-op Market", short: "Fernhollow", currency: "USD" },
  2: { name: "Saltmarsh Mutual Market", short: "Saltmarsh", currency: "EUR" },
  3: { name: "Kiln Street Makers", short: "Kiln Street", currency: "GBP" },
};

// ───────────────────────── palette ─────────────────────────

export const C = {
  lime: "#c5ee8a",
  limeText: "#d3f3a4",
  amber: "#fbbf24",
  red: "#f87171",
  /** For "seen before, harmlessly caught": neither good nor bad. */
  steel: "#8fb8d4",
  dim: "rgba(255,255,255,0.28)",
} as const;
