/**
 * Authoring helpers for the C++ "Lantern Bay" course.
 *
 *  - `cpp` is String.raw: C++ source goes through untouched, so \n, \" and \t stay exactly as written.
 *  - `md` is String.raw too, plus \` becomes a plain backtick, so lesson prose can show C++ with single
 *    backslashes and still contain inline code.
 *  - `js` is the same tag for the JavaScript check code (checks run over stdout, lines and scene).
 *
 * None of the tags may contain a bare backtick or the two characters ${.
 */
export const cpp = String.raw;

export function md(strings: TemplateStringsArray, ...values: unknown[]): string {
  return String.raw(strings, ...values).replace(/\`/g, "`");
}

export const js = String.raw;
