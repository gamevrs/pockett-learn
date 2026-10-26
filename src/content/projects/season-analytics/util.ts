/**
 * Authoring helpers for the Season Analytics course.
 *
 *  - `sql` is String.raw: SQL source goes through untouched.
 *  - `md` is String.raw too, plus `\`` becomes a plain backtick, so lesson prose can contain inline
 *    code without escaping tricks. Neither may contain a bare backtick or the characters `${`.
 *  - `t` builds a check: it is String.raw with a small toolbox of helpers in front, so every test
 *    can find the learner's result set by its columns instead of by its position in the file.
 *    (Learners add exploratory queries; the check should not care.)
 */
export const sql = String.raw;

export function md(strings: TemplateStringsArray, ...values: unknown[]): string {
  return String.raw(strings, ...values).replace(/\\`/g, "`");
}

/**
 * Helpers available inside every check, on top of result / rows / results / query / assert...
 *
 *   find(cols, re, notRe)   latest result set that has all `cols` and whose SQL (comments removed)
 *                           matches `re` and not `notRe`; null when there is none
 *   need(cols, hint, re, notRe)  the same, but fails with `hint` when it is missing; returns the set
 *   data(...)               = objs(need(...)): rows as objects
 *   sqlOf(rs)               the statement without comments, lower-cased
 *   match(got, want, key, cols, label, tol)  every wanted row exists with equal values in `cols`
 *   one(sql)                the first row of a query on the finished database
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
const eq = (a, b, tol) => (typeof a === "number" && typeof b === "number" ? Math.abs(a - b) <= (tol || 1e-9) : a === b);
const keyOf = (key) => (r) => [].concat(key).map((k) => r[k]).join(" / ");
const match = (got, want, key, cols, label, tol) => {
  const kf = keyOf(key);
  assertEqual(got.length, want.length, "Number of rows" + (label ? " in " + label : ""));
  for (const w of want) {
    const g = got.find((r) => kf(r) === kf(w));
    assert(g, (label || "Your result") + " has no row for " + [].concat(key).join("/") + " = " + kf(w));
    for (const c of cols) assert(eq(g[c], w[c], tol), (label || "Your result") + ": " + c + " for " + kf(w) + " is " + g[c] + ", expected " + w[c]);
  }
};
`;

/** Builds a check: helpers first, then the test body. */
export function t(strings: TemplateStringsArray, ...values: unknown[]): string {
  return HELPERS + String.raw(strings, ...values);
}
