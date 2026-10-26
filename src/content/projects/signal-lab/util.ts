/**
 * Authoring helpers for the Signal Lab course.
 *
 *  - `py` is String.raw: Python source and Python test code go through it untouched.
 *  - `md` is String.raw too, plus `\`` becomes a plain backtick, so lesson prose can show
 *    regular expressions like `\d+` with single backslashes and still contain inline code.
 *
 * Neither tag may contain a bare backtick or the two characters `${`.
 */
export const py = String.raw;

export function md(strings: TemplateStringsArray, ...values: unknown[]): string {
  return String.raw(strings, ...values).replace(/\\`/g, "`");
}
