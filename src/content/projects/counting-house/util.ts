/**
 * Authoring helpers for the Counting House course.
 *
 *  - `sql` is String.raw: SQL source goes through untouched.
 *  - `md` is String.raw too, plus `\`` becomes a plain backtick, so lesson prose can contain inline
 *    code without escaping tricks. Neither may contain a bare backtick or the characters `${`.
 *  - `t` builds a check: String.raw with a small toolbox of helpers in front, so every test finds the
 *    learner's result set by its columns instead of by its position in the file (learners add their own
 *    exploratory queries), and can probe the finished database with writes that are rolled back.
 */
export const sql = String.raw;

export function md(strings: TemplateStringsArray, ...values: unknown[]): string {
  return String.raw(strings, ...values).replace(/\`/g, "`");
}

/**
 * Helpers available inside every check, on top of result / rows / results / query / log / assert...
 *
 *   find(cols, re, notRe)   latest result set that has all `cols` and whose SQL (comments removed)
 *                           matches `re` and not `notRe`; null when there is none
 *   need(cols, hint, re, notRe)  the same, but fails with `hint` when it is missing; returns the set
 *   data(...)               = objs(need(...)): rows as objects
 *   sqlOf(rs)               the statement without comments, lower-cased
 *   one(sql)                the first row of a query on the finished database
 *   num(sql)                the first column of the first row, as a number (0 when there is no row)
 *   probe(stmt)             runs a write inside a savepoint, always rolls it back, and returns the error
 *                           message it raised (or null when it was accepted)
 *   sqlText(name)           the CREATE statement stored for a table, view, index or trigger (or "")
 *   has(type, name)         whether sqlite_master holds an object of that type and name
 *   cols(table)             column names of a table or view
 *   plan(sql)               the EXPLAIN QUERY PLAN detail lines of a statement, joined with newlines
 *   refused(re)             statements the learner marked with "-- expect error" that the database refused
 *                           (optionally only those whose message matches re); entries of the statement diary
 *   accepted()              statements marked "-- expect error" that the database accepted (a bug in the learner's rules)
 *   match(got, want, key, columns, label, tol)  every wanted row exists with equal values in `columns`
 */
export const HELPERS = String.raw`
const objs = (rs) => rs.rows.map((r) => Object.fromEntries(rs.columns.map((c, i) => [c, r[i]])));
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
const sqlOf = (rs) => strip(rs.sql).toLowerCase();
const find = (cols, re, notRe) => {
  const hits = results.filter((r) => cols.every((c) => r.columns.includes(c)) && (!re || re.test(sqlOf(r))) && (!notRe || !notRe.test(sqlOf(r))));
  return hits.length ? hits[hits.length - 1] : null;
};
const need = (cols, hint, re, notRe) => {
  const rs = find(cols, re, notRe);
  assert(rs, hint || ("Add a query that returns the columns: " + cols.join(", ")));
  return rs;
};
const data = (cols, hint, re, notRe) => objs(need(cols, hint, re, notRe));
const one = (s) => query(s)[0];
const num = (s) => { const r = query(s)[0]; return r ? Number(Object.values(r)[0]) : 0; };
const probe = (stmt) => {
  query("SAVEPOINT probe");
  let err = null;
  try { query(stmt); } catch (e) { err = String(e && e.message ? e.message : e); }
  query("ROLLBACK TO probe");
  query("RELEASE probe");
  return err;
};
const sqlText = (name) => { const r = query("SELECT sql FROM sqlite_master WHERE name = '" + name + "'")[0]; return r && r.sql ? r.sql : ""; };
const has = (type, name) => query("SELECT 1 AS x FROM sqlite_master WHERE type = '" + type + "' AND name = '" + name + "'").length > 0;
const cols = (table) => query("PRAGMA table_xinfo(" + table + ")").map((c) => c.name);
const plan = (s) => query("EXPLAIN QUERY PLAN " + s).map((r) => r.detail).join("\n");
const refused = (re) => log.filter((e) => e.expected && e.error && (!re || re.test(e.error)));
const accepted = () => log.filter((e) => e.expected && !e.error);
const eq = (a, b, tol) => (typeof a === "number" && typeof b === "number" ? Math.abs(a - b) <= (tol || 1e-9) : a === b);
const keyOf = (key) => (r) => [].concat(key).map((k) => r[k]).join(" / ");
const match = (got, want, key, columns, label, tol) => {
  const kf = keyOf(key);
  assertEqual(got.length, want.length, "Number of rows" + (label ? " in " + label : ""));
  for (const w of want) {
    const g = got.find((r) => kf(r) === kf(w));
    assert(g, (label || "Your result") + " has no row for " + [].concat(key).join("/") + " = " + kf(w));
    for (const c of columns) assert(eq(g[c], w[c], tol), (label || "Your result") + ": " + c + " for " + kf(w) + " is " + g[c] + ", expected " + w[c]);
  }
};
`;

/** Builds a check: helpers first, then the test body. */
export function t(strings: TemplateStringsArray, ...values: unknown[]): string {
  return HELPERS + String.raw(strings, ...values);
}
