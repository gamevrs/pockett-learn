/**
 * Authoring helpers for the C++ Reactor Core course.
 *
 *  - `cpp` is String.raw: C++ source and the JavaScript check code go through it untouched, so
 *    `\n`, `\"` and `\t` stay exactly as written.
 *  - `md` is String.raw too, plus `\`` becomes a plain backtick, so lesson prose can show C++
 *    escapes with single backslashes and still contain inline code.
 *
 * Neither tag may contain a bare backtick or the two characters `${`.
 */
export const cpp = String.raw;

export function md(strings: TemplateStringsArray, ...values: unknown[]): string {
  return String.raw(strings, ...values).replace(/\\`/g, "`");
}

/** The check code runs as JavaScript over `stdout`, `lines` and `scene`; same tag, clearer intent. */
export const js = String.raw;
