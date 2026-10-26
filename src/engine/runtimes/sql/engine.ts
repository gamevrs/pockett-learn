import type { Database, SqlJsStatic, SqlValue } from "sql.js";
import { describeFailure, testHelpers } from "../assert.ts";
import type { RunError, TestCase, TestResult } from "../../types.ts";

/**
 * Core of the SQL runtime: runs the learner's statements one by one against a fresh SQLite
 * database (built from the project's hidden `setup`), and captures every result set.
 * No browser APIs, so Node can use it for content validation with the npm build of sql.js.
 */

export interface ResultSet {
  /** The statement that produced it, trimmed. */
  sql: string;
  columns: string[];
  rows: SqlValue[][];
}

export interface ColumnInfo {
  name: string;
  type: string;
  /** Present for tables and views built from the schema; older callers only read name and type. */
  notNull?: boolean;
  /** The DEFAULT expression as written, or null. */
  dflt?: string | null;
  /** 0 when not part of the primary key, otherwise the column's 1-based place in it. */
  pk?: number;
  /** A generated column (virtual or stored). */
  generated?: boolean;
}

export interface ForeignKeyInfo {
  table: string;
  from: string[];
  to: string[];
  onUpdate: string;
  onDelete: string;
}

export interface IndexInfo {
  name: string;
  unique: boolean;
  /** "c" = CREATE INDEX, "u" = a UNIQUE constraint, "pk" = the PRIMARY KEY. */
  origin: string;
  partial: boolean;
  /** Indexed columns in order; an expression shows as "<expr>". */
  columns: string[];
  /** The CREATE INDEX text for explicit indexes. */
  sql: string | null;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
  kind?: "table" | "view";
  /** The CREATE statement as stored by SQLite. */
  sql?: string;
  strict?: boolean;
  withoutRowid?: boolean;
  foreignKeys?: ForeignKeyInfo[];
  indexes?: IndexInfo[];
  triggers?: { name: string; sql: string }[];
}

/**
 * One line of the statement diary: every statement that does not return rows (DDL, DML, PRAGMA,
 * BEGIN/COMMIT...), plus any statement the learner marked with an `-- expect error` comment.
 */
export interface StatementLog {
  /** 1-based line of the statement's first character. */
  line: number;
  /** First keyword, upper-cased: INSERT, CREATE, BEGIN, ROLLBACK... */
  verb: string;
  /** The statement on one line, shortened. */
  sql: string;
  /** Rows the statement itself changed. */
  changes: number;
  /** Rows changed indirectly (triggers, ON DELETE CASCADE / SET NULL). */
  side: number;
  /** The database's message when the statement was refused. */
  error?: string;
  /** The learner announced this statement should be refused (`-- expect error` right above it). */
  expected?: boolean;
}

export interface SqlRun {
  db: Database;
  results: ResultSet[];
  log: StatementLog[];
  stdout: string;
  error: RunError | null;
}

const MAX_ROWS = 500;

function lineAt(source: string, offset: number): number {
  return source.slice(0, Math.max(0, offset)).split("\n").length;
}

/** Index of the first non-space, non-comment character at or after `from`. */
function statementStart(source: string, from: number): number {
  let i = from;
  while (i < source.length) {
    if (/\s/.test(source[i])) i++;
    else if (source.startsWith("--", i)) {
      const nl = source.indexOf("\n", i);
      i = nl === -1 ? source.length : nl + 1;
    } else if (source.startsWith("/*", i)) {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 2;
    } else break;
  }
  return i;
}

export function formatTable(rs: ResultSet, limit = 20): string {
  if (rs.columns.length === 0) return "";
  const shown = rs.rows.slice(0, limit).map((r) => r.map((v) => (v === null ? "NULL" : v instanceof Uint8Array ? `<${v.length} bytes>` : String(v))));
  const widths = rs.columns.map((c, i) => Math.min(28, Math.max(c.length, ...shown.map((r) => r[i].length))));
  const cell = (s: string, i: number) => (s.length > widths[i] ? s.slice(0, widths[i] - 1) + "…" : s.padEnd(widths[i]));
  const lines = [
    rs.columns.map(cell).join(" │ "),
    widths.map((w) => "─".repeat(w)).join("─┼─"),
    ...shown.map((r) => r.map(cell).join(" │ ")),
  ];
  const n = rs.rows.length;
  lines.push(`(${n} row${n === 1 ? "" : "s"}${n > limit ? `, first ${limit} shown` : ""})`);
  return lines.join("\n");
}

/** Statements whose effect is reported as "N rows changed". Everything else (CREATE, DROP, PRAGMA…) is just "ok". */
const DML_VERBS = new Set(["INSERT", "UPDATE", "DELETE", "REPLACE", "WITH"]);

/** SQLite's running count of rows changed by INSERT/UPDATE/DELETE since the connection opened. */
function totalChanges(db: Database): number {
  return Number(db.exec("SELECT total_changes()")[0]?.values[0]?.[0] ?? 0);
}

const MAX_LOG = 600;

/** A comment such as `-- expect error` (or "expect: rejected") right above a statement. */
const EXPECT_ERROR = /--[ \t]*expect(?:ed|s)?[ \t]*[:-]?[ \t]*(?:an?[ \t]+)?(?:error|rejection|rejected|failure|refusal)\b/i;

function oneLine(sql: string, max = 160): string {
  const flat = sql.replace(/--[^\n]*/g, " ").replace(/\s+/g, " ").trim();
  return flat.length > max ? flat.slice(0, max - 1) + "…" : flat;
}

function verbOf(sql: string): string {
  return sql.slice(statementStart(sql, 0)).split(/[\s(;]+/)[0].toUpperCase();
}

/**
 * Where the statement that starts at `from` ends, for a statement SQLite could not even parse (so
 * the iterator cannot say). Quotes and comments are skipped; a CREATE TRIGGER runs to its END.
 */
function statementEnd(source: string, from: number): number {
  const isTrigger = /^create\s+(?:temp(?:orary)?\s+)?trigger\b/i.test(source.slice(from, from + 60));
  let i = from;
  while (i < source.length) {
    const c = source[i];
    if (c === "'" || c === '"' || c === "`") {
      const close = source.indexOf(c, i + 1);
      i = close === -1 ? source.length : close + 1;
    } else if (source.startsWith("--", i)) {
      const nl = source.indexOf("\n", i);
      i = nl === -1 ? source.length : nl + 1;
    } else if (source.startsWith("/*", i)) {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 2;
    } else if (c === ";") {
      if (!isTrigger || /\bend\s*$/i.test(source.slice(Math.max(from, i - 12), i))) return i + 1;
      i++;
    } else i++;
  }
  return source.length;
}

/**
 * `onStatement(line)` is called just before each statement runs (1-based line of its first
 * character), so a host that has to give up on a runaway query can say where it was stuck.
 *
 * A comment `-- expect error` right above a statement says "the database should refuse this": the
 * refusal is recorded in `log` (and printed) instead of stopping the run, so a lesson can show a
 * constraint turning a bad row away. If the statement is accepted after all, the log says so.
 */
export function executeSql(SQL: SqlJsStatic, source: string, setup = "", onStatement?: (line: number) => void): SqlRun {
  const db = new SQL.Database();
  if (setup) db.exec(setup);
  const results: ResultSet[] = [];
  const log: StatementLog[] = [];
  let stdout = "";
  let error: RunError | null = null;
  const note = (entry: StatementLog) => {
    if (log.length < MAX_LOG) log.push(entry);
  };
  /** Absolute offset just after the last statement the iterator handed out. */
  let consumed = 0;
  /** Where the current iterator started: it restarts after an expected-to-fail statement that would not even parse. */
  let base = 0;
  while (!error) {
    const it = db.iterateStatements(source.slice(base));
    let restart = -1;
    try {
      for (const stmt of it) {
        const start = statementStart(source, consumed);
        const expected = EXPECT_ERROR.test(source.slice(consumed, start));
        consumed = source.length - it.getRemainingSQL().length;
        const line = lineAt(source, start);
        try {
          onStatement?.(line);
          const columns = stmt.getColumnNames();
          const rows: SqlValue[][] = [];
          const before = totalChanges(db);
          while (stmt.step()) if (rows.length < MAX_ROWS) rows.push(stmt.get());
          const sql = stmt.getSQL().trim();
          const verb = verbOf(sql);
          const delta = totalChanges(db) - before;
          // total_changes() only moves when this very statement wrote rows; getRowsModified() is then fresh
          // (it reports the last INSERT/UPDATE/DELETE, which for a CREATE VIEW would be a stale number).
          const changed = DML_VERBS.has(verb) && delta > 0 ? db.getRowsModified() : 0;
          const side = Math.max(0, delta - changed);
          // ALTER TABLE ... ADD COLUMN runs a hidden verification query that reports a column but no rows: not a result
          if (columns.length > 0 && !(rows.length === 0 && (verb === "ALTER" || verb === "CREATE" || verb === "DROP"))) {
            const rs = { sql, columns, rows };
            results.push(rs);
            stdout += formatTable(rs) + "\n\n";
            if (expected || changed > 0) note({ line, verb, sql: oneLine(sql), changes: changed, side, expected: expected || undefined });
          } else {
            stdout += `${verb} ok${changed ? ` · ${changed} row${changed === 1 ? "" : "s"} changed` : ""}\n\n`;
            note({ line, verb, sql: oneLine(sql), changes: changed, side, expected: expected || undefined });
          }
          if (expected) stdout += "⚠ You expected this statement to be refused, but the database accepted it.\n\n";
        } catch (err) {
          const message = (err as Error).message;
          if (!expected) {
            error = { type: "SQLError", message, line };
            break;
          }
          const sql = stmt.getSQL().trim();
          note({ line, verb: verbOf(sql), sql: oneLine(sql), changes: 0, side: 0, error: message, expected: true });
          stdout += `REJECTED, as expected · ${message}\n\n`;
        } finally {
          stmt.free();
        }
      }
    } catch (err) {
      // a statement that doesn't even parse is reported by the iterator itself
      const start = statementStart(source, consumed);
      const line = lineAt(source, start);
      const message = (err as Error).message;
      if (EXPECT_ERROR.test(source.slice(consumed, start))) {
        const end = statementEnd(source, start);
        const sql = source.slice(start, end).trim();
        note({ line, verb: verbOf(sql), sql: oneLine(sql), changes: 0, side: 0, error: message, expected: true });
        stdout += `REJECTED, as expected · ${message}\n\n`;
        restart = end;
      } else error = { type: "SQLError", message, line };
    }
    if (restart === -1) break;
    base = consumed = restart;
  }
  return { db, results, log, stdout: stdout.trimEnd() + (stdout ? "\n" : ""), error };
}

const quote = (name: string) => `"${name.replace(/"/g, '""')}"`;

function rowsOf(db: Database, sql: string): SqlValue[][] {
  try {
    return db.exec(sql)[0]?.values ?? [];
  } catch {
    return [];
  }
}

export function describeTables(db: Database): TableInfo[] {
  const objects = rowsOf(db, "SELECT name, type, sql FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name");
  const flags = new Map<string, { strict: boolean; withoutRowid: boolean }>();
  for (const r of rowsOf(db, "PRAGMA table_list")) flags.set(String(r[1]), { withoutRowid: Number(r[4]) === 1, strict: Number(r[5]) === 1 });
  const triggers = rowsOf(db, "SELECT name, tbl_name, sql FROM sqlite_master WHERE type = 'trigger' ORDER BY name");
  return objects.map(([n, type, ddl]) => {
    const name = String(n);
    const q = quote(name);
    const cols = rowsOf(db, `PRAGMA table_xinfo(${q})`).filter((c) => Number(c[6]) !== 1);
    const count = db.exec(`SELECT COUNT(*) FROM ${q}`)[0]?.values[0]?.[0] ?? 0;
    const fks = new Map<number, ForeignKeyInfo>();
    for (const f of rowsOf(db, `PRAGMA foreign_key_list(${q})`)) {
      const id = Number(f[0]);
      const fk = fks.get(id) ?? { table: String(f[2]), from: [], to: [], onUpdate: String(f[5]), onDelete: String(f[6]) };
      fk.from.push(String(f[3]));
      fk.to.push(f[4] === null ? "" : String(f[4]));
      fks.set(id, fk);
    }
    const indexes: IndexInfo[] = rowsOf(db, `PRAGMA index_list(${q})`).map((ix) => {
      const iname = String(ix[1]);
      const keyCols = rowsOf(db, `PRAGMA index_xinfo(${quote(iname)})`)
        .filter((c) => Number(c[5]) === 1)
        .map((c) => (c[2] === null ? "<expr>" : String(c[2])));
      const def = rowsOf(db, `SELECT sql FROM sqlite_master WHERE type = 'index' AND name = '${iname.replace(/'/g, "''")}'`)[0]?.[0];
      return { name: iname, unique: Number(ix[2]) === 1, origin: String(ix[3]), partial: Number(ix[4]) === 1, columns: keyCols, sql: typeof def === "string" ? def : null };
    });
    return {
      name,
      kind: type === "view" ? "view" : "table",
      sql: typeof ddl === "string" ? ddl : undefined,
      strict: flags.get(name)?.strict || undefined,
      withoutRowid: flags.get(name)?.withoutRowid || undefined,
      columns: cols.map((c) => ({
        name: String(c[1]),
        type: String(c[2] || ""),
        notNull: Number(c[3]) === 1,
        dflt: c[4] === null ? null : String(c[4]),
        pk: Number(c[5]),
        generated: Number(c[6]) === 2 || Number(c[6]) === 3,
      })),
      rowCount: Number(count),
      foreignKeys: [...fks.values()],
      indexes,
      triggers: triggers.filter((t) => String(t[1]) === name).map((t) => ({ name: String(t[0]), sql: String(t[2] ?? "") })),
    };
  });
}

/** Rows as objects keyed by column name, which reads better in checks. */
export function asObjects(rs: ResultSet | undefined): Record<string, SqlValue>[] {
  if (!rs) return [];
  return rs.rows.map((r) => Object.fromEntries(rs.columns.map((c, i) => [c, r[i]])));
}

/**
 * Checks are JavaScript with these names in scope:
 *   result  — the last result set { columns, rows } (rows as arrays), or null
 *   rows    — the last result set's rows as objects ({ column: value })
 *   results — every result set, in order
 *   query(sql) — rows (as objects) from a query against the database after the learner's code
 *   stdout, assert, assertEqual, assertClose
 *   log     — the statement diary (see StatementLog): DDL, DML, transactions and refused statements
 */
export function runSqlTests(run: SqlRun, tests: TestCase[]): TestResult[] {
  const last = run.results[run.results.length - 1];
  const query = (sql: string) => {
    const r = run.db.exec(sql)[0];
    return r ? asObjects({ sql, columns: r.columns, rows: r.values }) : [];
  };
  return tests.map((t) => {
    try {
      const fn = new Function("result", "rows", "results", "query", "stdout", "assert", "assertEqual", "assertClose", "log", t.assertionCode);
      fn(last ?? null, asObjects(last), run.results, query, run.stdout, testHelpers.assert, testHelpers.assertEqual, testHelpers.assertClose, run.log);
      return { testId: t.id, description: t.description, passed: true };
    } catch (err) {
      return { testId: t.id, description: t.description, passed: false, error: describeFailure(err) };
    }
  });
}
