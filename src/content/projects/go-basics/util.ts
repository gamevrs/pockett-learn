/**
 * Authoring helpers for the Gopher Post (Go Foundations) course.
 *
 *  - `go` is String.raw: Go source and the JavaScript check code go through it untouched, so `\n`,
 *    `\t` and `\"` stay exactly as written. Go struct tags need backticks, which a template literal
 *    cannot contain, so write them as `${BT}json:"id"${BT}`.
 *  - `md` is String.raw too, plus `\`` becomes a plain backtick, so lesson prose can show Go
 *    escapes with single backslashes and still contain inline code.
 *  - `js` is the same String.raw, used for the check code (JavaScript over `stdout`, `lines`, `scene`).
 *
 * None of the tags may contain a bare backtick or the two characters `${` (except `${BT}`).
 */
export const go = String.raw;

/** A backtick, for Go struct tags and raw strings inside `go` templates. */
export const BT = "`";

export function md(strings: TemplateStringsArray, ...values: unknown[]): string {
  return String.raw(strings, ...values).replace(/\\`/g, "`");
}

export const js = String.raw;
