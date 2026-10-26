/**
 * Authoring helper for Form Forge. Every string in this course (lesson prose, learner code, test
 * code) is written with `t`, a raw template tag, because the content is full of backslashes
 * (regexes) and backticks (template literals):
 *
 *   - backslashes stay exactly as typed, so a regex like \d{3} needs no doubling;
 *   - `^^` stands for a backtick (so prose can say ^^inline code^^ and code can use ^^templates^^);
 *   - `$\{` stands for `${` (a real ${ would start an interpolation in this file);
 *   - `~^` stands for a literal caret, for the rare case where a caret touches a ^^ marker:
 *     write ^^~^^^ to get a backtick, a caret and a backtick (plain ^^^^^ would parse as ^^ ^^ ^).
 *
 * Never write `^^` or a lone backtick for any other purpose inside course text.
 */
const CARET = "\u0001";

export function t(strings: TemplateStringsArray, ...values: unknown[]): string {
  return String.raw(strings, ...values)
    .replaceAll("~^", CARET)
    .replaceAll("^^", "`")
    .replaceAll("$\\{", "${")
    .replaceAll(CARET, "^");
}
