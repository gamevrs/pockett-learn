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

export interface TableInfo {
  name: string;
  columns: { name: string; type: string }[];
  rowCount: number;
}

export interface SqlRun {
  db: Database;
  results: ResultSet[];
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

export function executeSql(SQL: SqlJsStatic, source: string, setup = ""): SqlRun {
  const db = new SQL.Database();
  if (setup) db.exec(setup);
  const results: ResultSet[] = [];
  let stdout = "";
  let error: RunError | null = null;
  let consumed = 0;
  const it = db.iterateStatements(source);
  try {
    for (const stmt of it) {
      const start = statementStart(source, consumed);
      consumed = source.length - it.getRemainingSQL().length;
      try {
        const columns = stmt.getColumnNames();
        const rows: SqlValue[][] = [];
        while (stmt.step()) if (rows.length < MAX_ROWS) rows.push(stmt.get());
        const sql = stmt.getSQL().trim();
        if (columns.length > 0) {
          const rs = { sql, columns, rows };
          results.push(rs);
          stdout += formatTable(rs) + "\n\n";
        } else {
          const changed = db.getRowsModified();
          stdout += `${sql.slice(statementStart(sql, 0)).split(/\s+/)[0].toUpperCase()} ok${changed ? ` · ${changed} row${changed === 1 ? "" : "s"} changed` : ""}\n\n`;
        }
      } catch (err) {
        error = { type: "SQLError", message: (err as Error).message, line: lineAt(source, start) };
        break;
      } finally {
        stmt.free();
      }
    }
  } catch (err) {
    // a statement that doesn't even parse is reported by the iterator itself
    const start = statementStart(source, consumed);
    error = { type: "SQLError", message: (err as Error).message, line: lineAt(source, start) };
  }
  return { db, results, stdout: stdout.trimEnd() + (stdout ? "\n" : ""), error };
}

export function describeTables(db: Database): TableInfo[] {
  const names = db.exec("SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%' ORDER BY name")[0]?.values ?? [];
  return names.map(([n]) => {
    const name = String(n);
    const quoted = `"${name.replace(/"/g, '""')}"`;
    const cols = db.exec(`PRAGMA table_info(${quoted})`)[0]?.values ?? [];
    const count = db.exec(`SELECT COUNT(*) FROM ${quoted}`)[0]?.values[0]?.[0] ?? 0;
    return { name, columns: cols.map((c) => ({ name: String(c[1]), type: String(c[2] || "") })), rowCount: Number(count) };
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
 */
export function runSqlTests(run: SqlRun, tests: TestCase[]): TestResult[] {
  const last = run.results[run.results.length - 1];
  const query = (sql: string) => {
    const r = run.db.exec(sql)[0];
    return r ? asObjects({ sql, columns: r.columns, rows: r.values }) : [];
  };
  return tests.map((t) => {
    try {
      const fn = new Function("result", "rows", "results", "query", "stdout", "assert", "assertEqual", "assertClose", t.assertionCode);
      fn(last ?? null, asObjects(last), run.results, query, run.stdout, testHelpers.assert, testHelpers.assertEqual, testHelpers.assertClose);
      return { testId: t.id, description: t.description, passed: true };
    } catch (err) {
      return { testId: t.id, description: t.description, passed: false, error: describeFailure(err) };
    }
  });
}
