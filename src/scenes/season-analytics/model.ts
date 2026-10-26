import type { ProgramHandle } from "@/engine/program";

/**
 * Season Analytics: reading the learner's result sets.
 *
 * The SQL runtime hands the scene plain data: every result set the query file produced
 * (`results`) and the database's tables and views (`tables`). Each dashboard panel picks "its"
 * result set by the COLUMNS it returns (the lessons ask for exact column names), which is far
 * more robust than counting statements: the learner can add exploratory queries, reorder things
 * or break one lesson without scrambling the others. Everything is read defensively.
 */

export type Cell = unknown;

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

export type PanelId =
  | "standings"
  | "championship"
  | "progression"
  | "pace"
  | "pointsgrid"
  | "leaders"
  | "benchmarks"
  | "form"
  | "record"
  | "qualifying"
  | "calendar"
  | "stewards"
  | "honours"
  | "h2h"
  | "movers"
  | "strategy"
  | "plan";

export type GhostKind = "bars" | "table" | "lines" | "heat" | "tiles" | "chips" | "plan";

export interface PanelDef {
  id: PanelId;
  /** Feature id unlocked by the lesson. */
  feature: string;
  title: string;
  lesson: number;
  /** The SQL idea this panel is about, shown on the ghost. */
  clause: string;
  /** Spans two columns in a wide layout. */
  wide?: boolean;
  ghost: GhostKind;
}

export const PANELS: PanelDef[] = [
  { id: "standings", feature: "sa-standings", title: "Championship standings", lesson: 12, clause: "LAG · LEAD · RANK", wide: true, ghost: "table" },
  { id: "progression", feature: "sa-progression", title: "Points progression", lesson: 11, clause: "SUM() OVER (… ORDER BY round)", wide: true, ghost: "lines" },
  { id: "championship", feature: "sa-championship", title: "Final championship", lesson: 14, clause: "count-back tiebreaks", wide: true, ghost: "table" },
  { id: "pace", feature: "sa-pace", title: "Race pace heatmap", lesson: 11, clause: "frames · moving average", wide: true, ghost: "heat" },
  { id: "pointsgrid", feature: "sa-grid", title: "Points by round", lesson: 8, clause: "WITH RECURSIVE", wide: true, ghost: "heat" },
  { id: "leaders", feature: "sa-leaders", title: "Points table", lesson: 3, clause: "WITH … AS (…)", ghost: "bars" },
  { id: "benchmarks", feature: "sa-benchmarks", title: "Season benchmarks", lesson: 1, clause: "(SELECT …) subqueries", ghost: "tiles" },
  { id: "form", feature: "sa-form", title: "Form guide", lesson: 2, clause: "correlated subqueries · EXISTS", ghost: "table" },
  { id: "record", feature: "sa-record", title: "Win · podium · DNF record", lesson: 4, clause: "COUNT(CASE WHEN …)", ghost: "bars" },
  { id: "qualifying", feature: "sa-qualifying", title: "Qualifying ladder", lesson: 5, clause: "COUNT(col) · COALESCE · NULLIF", ghost: "bars" },
  { id: "calendar", feature: "sa-calendar", title: "Season calendar", lesson: 6, clause: "julianday() · strftime()", ghost: "bars" },
  { id: "stewards", feature: "sa-stewards", title: "Steward reports", lesson: 6, clause: "lower() · LIKE · CASE", ghost: "bars" },
  { id: "honours", feature: "sa-honours", title: "Honours board", lesson: 7, clause: "UNION ALL · INTERSECT · EXCEPT", ghost: "chips" },
  { id: "h2h", feature: "sa-h2h", title: "Teammate head-to-head", lesson: 9, clause: "CREATE VIEW · self-join", ghost: "bars" },
  { id: "movers", feature: "sa-movers", title: "Drivers of the day", lesson: 10, clause: "ROW_NUMBER() OVER (PARTITION BY …)", ghost: "table" },
  { id: "strategy", feature: "sa-strategy", title: "Pit strategy", lesson: 13, clause: "pre-aggregate before you JOIN", ghost: "bars" },
  { id: "plan", feature: "sa-plan", title: "Query plan", lesson: 13, clause: "EXPLAIN QUERY PLAN", ghost: "plan" },
];

// ───────────────────────── reading the program ─────────────────────────

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
    const rowCount = typeof t.rowCount === "number" && Number.isFinite(t.rowCount) ? t.rowCount : 0;
    return [{ name: t.name, columns, rowCount }];
  });
}

/** Tables the hidden setup creates; anything else in the database list was made by the learner. */
export const SEED_TABLES = new Set(["teams", "drivers", "circuits", "races", "results", "qualifying", "laps", "pit_stops", "penalties", "points_rules"]);

// ───────────────────────── small helpers ─────────────────────────

export const isNum = (v: Cell): v is number => typeof v === "number" && Number.isFinite(v);

/** Index of a column by (case-insensitive) name, or -1. */
export function ci(rs: ResultSet, name: string): number {
  const n = name.toLowerCase();
  return rs.columns.findIndex((c) => c.toLowerCase() === n);
}

export const hasCols = (rs: ResultSet, ...names: string[]) => names.every((n) => ci(rs, n) >= 0);

export function num(row: Cell[], i: number): number | null {
  if (i < 0) return null;
  const v = row[i];
  if (isNum(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

export function str(row: Cell[], i: number): string {
  if (i < 0) return "";
  const v = row[i];
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
    .map((l) => (/^\s*--/.test(l) ? "" : l.replace(/\s+--[^']*$/, "")))
    .filter((l) => l.trim().length > 0)
    .join("\n")
    .trim();
}

/** 93535 → "1:33.535", 2380 → "2.38s". */
export function fmtMs(ms: number): string {
  const sign = ms < 0 ? "-" : "";
  const a = Math.abs(ms);
  if (a < 60000) return `${sign}${(a / 1000).toFixed(2)}s`;
  const m = Math.floor(a / 60000);
  const s = ((a % 60000) / 1000).toFixed(3).padStart(6, "0");
  return `${sign}${m}:${s}`;
}

export function fmtNum(v: number): string {
  if (Number.isInteger(v)) return Math.abs(v) >= 100000 ? v.toLocaleString("en-US") : String(v);
  return String(Number(v.toFixed(3)));
}

const isMsCol = (name: string) => /_ms\b|^ms$/i.test(name);

export function fmt(v: Cell, col = ""): string {
  if (v === null || v === undefined) return "NULL";
  if (isNum(v)) return isMsCol(col) ? fmtMs(v) : fmtNum(v);
  if (typeof v === "string") return v;
  if (typeof v === "boolean" || typeof v === "bigint") return String(v);
  if (v instanceof Uint8Array) return `<${v.length} bytes>`;
  try {
    return JSON.stringify(v) ?? String(v);
  } catch {
    return String(v);
  }
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// ───────────────────────── which result feeds which panel ─────────────────────────

export interface Bundle {
  standings: ResultSet | null;
  championship: ResultSet | null;
  constructors: ResultSet | null;
  progression: ResultSet | null;
  pace: ResultSet | null;
  pointsgrid: ResultSet | null;
  leaders: ResultSet | null;
  benchmarks: ResultSet | null;
  winners: ResultSet | null;
  form: ResultSet | null;
  record: ResultSet | null;
  qualifying: ResultSet | null;
  sheet: ResultSet | null;
  calendar: ResultSet | null;
  stewards: ResultSet | null;
  honours: ResultSet | null;
  h2h: ResultSet | null;
  movers: ResultSet | null;
  strategy: ResultSet | null;
  audit: ResultSet | null;
  /** Every EXPLAIN QUERY PLAN result, oldest first. */
  plans: ResultSet[];
}

const lastWhere = (results: ResultSet[], test: (rs: ResultSet) => boolean): ResultSet | null => {
  for (let i = results.length - 1; i >= 0; i--) if (test(results[i])) return results[i];
  return null;
};

export function assign(results: ResultSet[]): Bundle {
  const isPlan = (r: ResultSet) => hasCols(r, "detail", "parent") || /^\s*explain\b/i.test(bareSql(r.sql).trim());
  return {
    championship: lastWhere(results, (r) => hasCols(r, "pos", "code", "wins", "tied_on_points")),
    constructors: lastWhere(results, (r) => hasCols(r, "pos", "team", "points", "tied_on_points") && ci(r, "code") < 0),
    standings: lastWhere(results, (r) => hasCols(r, "pos", "code", "points", "change")),
    progression: lastWhere(results, (r) => hasCols(r, "code", "round", "total")),
    pace: lastWhere(results, (r) => hasCols(r, "code", "round", "gap_pct")),
    pointsgrid: lastWhere(results, (r) => hasCols(r, "code", "round", "points", "entered") && ci(r, "total") < 0),
    leaders: lastWhere(results, (r) => hasCols(r, "code", "points", "gap") && ci(r, "pos") < 0),
    benchmarks: lastWhere(results, (r) => hasCols(r, "rounds", "entries")),
    winners: lastWhere(results, (r) => hasCols(r, "code", "name") && ci(r, "best_finish") < 0 && /\bin\s*\(\s*select/.test(bareSql(r.sql))),
    form: lastWhere(results, (r) => hasCols(r, "best_finish", "last_points")),
    record: lastWhere(results, (r) => hasCols(r, "wins", "podiums", "dnfs")),
    qualifying: lastWhere(results, (r) => hasCols(r, "code", "reached_q2", "reached_q3")),
    sheet: lastWhere(results, (r) => hasCols(r, "grid", "code", "session", "best_ms")),
    calendar: lastWhere(results, (r) => hasCols(r, "round", "days_since_prev")),
    stewards: lastWhere(results, (r) => hasCols(r, "category", "penalties")),
    honours: lastWhere(results, (r) => hasCols(r, "honour", "code", "total")),
    h2h: lastWhere(results, (r) => hasCols(r, "driver_a", "driver_b")),
    movers: lastWhere(results, (r) => hasCols(r, "round", "code", "gained")),
    strategy: lastWhere(results, (r) => hasCols(r, "stops", "entries", "avg_points")),
    audit: lastWhere(results, (r) => hasCols(r, "joined_points", "true_points")),
    plans: results.filter(isPlan).slice(-2),
  };
}

// ───────────────────────── driver palette ─────────────────────────

/** Colour roles for chart series. Lime is the learner's accent; the others are for comparison only. */
export const SERIES = {
  first: "#c5ee8a",
  second: "#f4f4f4",
  third: "#7dd3fc",
  dim: "rgba(255,255,255,0.28)",
} as const;
