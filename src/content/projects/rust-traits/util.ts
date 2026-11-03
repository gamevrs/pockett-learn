/**
 * Authoring helpers for the Drone Fleet course.
 *
 *  - `rs` is String.raw: Rust source goes through it untouched, so `\n`, `\"` and `\` stay as written.
 *  - `md` is String.raw too, plus `\`` becomes a plain backtick, so lesson prose can contain inline code.
 *  - `js` is the same tag again for the check code, which runs as JavaScript over `stdout`, `lines` and `scene`.
 *
 * None of them may contain a bare backtick or the two characters `${`.
 */
export const rs = String.raw;

export function md(strings: TemplateStringsArray, ...values: unknown[]): string {
  return String.raw(strings, ...values).replace(/\\`/g, "`");
}

export const js = String.raw;
