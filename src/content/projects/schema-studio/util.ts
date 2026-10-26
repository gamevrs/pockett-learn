/**
 * Authoring helpers for the Schema Studio course.
 *
 *  - `sql` is String.raw: SQL source goes through untouched.
 *  - `md` is String.raw too, plus `\`` becomes a plain backtick, so lesson prose can contain inline
 *    code without escaping tricks. Neither may contain a bare backtick or the characters `${`.
 *  - `t` builds a check: String.raw with a toolbox in front. Checks look at the FINISHED database
 *    (catalog pragmas, row counts, probes that try a bad row inside a savepoint and roll it back)
 *    rather than at the learner's exact wording, so any correct design passes.
 */
export const sql = String.raw;

export function md(strings: TemplateStringsArray, ...values: unknown[]): string {
  return String.raw(strings, ...values).replace(/\\`/g, "`");
}

/**
 * Helpers available inside every check, on top of result / rows / results / query / log / assert...
 *
 * result sets
 *   find(cols, re, notRe)   latest result set that has all `cols` and whose SQL (comments removed)
 *                           matches `re` and not `notRe`; null when there is none
 *   need(cols, hint, re, notRe)  the same, but fails with `hint` when it is missing
 *   data(...)               = objs(need(...)): rows as objects
 *   plans()                 every EXPLAIN QUERY PLAN result as { sql, details: [text...] }
 *   planFor(re)             the latest plan whose statement matches `re`, as one string of details
 * the finished database
 *   one(sql) / all(sql) / num(sql)   first row, all rows, first cell
 *   cols(t) / col(t, c)     PRAGMA table_xinfo rows (name, type, notnull, dflt_value, pk, hidden)
 *   ddl(name)               the CREATE statement SQLite stored (lower-cased, whitespace squeezed)
 *   exists(name)            is there a table, view, index or trigger with that name?
 *   fks(t) / indexes(t) / indexCols(name)   foreign keys, indexes, the columns of one index
 *   probe(stmt)             run a statement that should be refused; returns the error message, or
 *                           null when it was accepted. Always rolled back.
 *   sandbox(fn)             run fn() inside a savepoint that is always rolled back; returns fn's value
 * the statement diary (`log`)
 *   refused(re)             probes the learner wrote with "-- expect error" that failed with a message matching re
 *   accepted()              ones the learner expected to fail but the database allowed
 */
export const HELPERS = String.raw`
const objs = (rs) => rs.rows.map((r) => Object.fromEntries(rs.columns.map((c, i) => [c, r[i]])));
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
const sqlOf = (rs) => strip(rs.sql).toLowerCase();
const find = (cs, re, notRe) => {
  const hits = results.filter((r) => cs.every((c) => r.columns.includes(c)) && (!re || re.test(sqlOf(r))) && (!notRe || !notRe.test(sqlOf(r))));
  return hits.length ? hits[hits.length - 1] : null;
};
const need = (cs, hint, re, notRe) => {
  const rs = find(cs, re, notRe);
  assert(rs, hint || ("Add a query that returns the columns: " + cs.join(", ")));
  return rs;
};
const data = (cs, hint, re, notRe) => objs(need(cs, hint, re, notRe));
const isPlan = (r) => r.columns.includes("detail") && r.columns.includes("parent");
const plans = () => results.filter(isPlan).map((r) => ({ sql: sqlOf(r), details: r.rows.map((x) => String(x[r.columns.indexOf("detail")])) }));
const planFor = (re) => {
  const hits = plans().filter((p) => re.test(p.sql));
  return hits.length ? hits[hits.length - 1].details.join(" | ") : "";
};
const one = (s) => query(s)[0];
const all = (s) => query(s);
const num = (s) => { const r = query(s)[0]; return r ? Object.values(r)[0] : undefined; };
const cols = (tb) => query("PRAGMA table_xinfo(" + tb + ")");
const col = (tb, c) => cols(tb).find((x) => x.name === c);
const exists = (name) => !!one("SELECT 1 AS x FROM sqlite_master WHERE name = '" + name + "'");
const ddl = (name) => ((one("SELECT sql FROM sqlite_master WHERE name = '" + name + "'") || {}).sql || "").replace(/\s+/g, " ").toLowerCase();
const fks = (tb) => query("PRAGMA foreign_key_list(" + tb + ")");
const indexes = (tb) => query("PRAGMA index_list(" + tb + ")");
const indexCols = (name) => query("PRAGMA index_info(" + name + ")").map((r) => r.name);
const probe = (stmt) => {
  query("SAVEPOINT probe");
  let err = null;
  try { query(stmt); } catch (e) { err = String((e && e.message) || e); }
  query("ROLLBACK TO probe");
  query("RELEASE probe");
  return err;
};
const sandbox = (fn) => {
  query("SAVEPOINT sandbox");
  try { return fn(); } finally { query("ROLLBACK TO sandbox"); query("RELEASE sandbox"); }
};
const refused = (re) => log.filter((e) => e.expected && e.error && (!re || re.test(e.error)));
const accepted = () => log.filter((e) => e.expected && !e.error);
const eq = (a, b, tol) => (typeof a === "number" && typeof b === "number" ? Math.abs(a - b) <= (tol || 1e-9) : a === b);
const keyOf = (key) => (r) => [].concat(key).map((k) => r[k]).join(" / ");
const match = (got, want, key, cs, label, tol) => {
  const kf = keyOf(key);
  assertEqual(got.length, want.length, "Number of rows" + (label ? " in " + label : ""));
  for (const w of want) {
    const g = got.find((r) => kf(r) === kf(w));
    assert(g, (label || "Your result") + " has no row for " + [].concat(key).join("/") + " = " + kf(w));
    for (const c of cs) assert(eq(g[c], w[c], tol), (label || "Your result") + ": " + c + " for " + kf(w) + " is " + g[c] + ", expected " + w[c]);
  }
};
`;

/** Builds a check: helpers first, then the test body. */
export function t(strings: TemplateStringsArray, ...values: unknown[]): string {
  return HELPERS + String.raw(strings, ...values);
}
