import { flattenLessons, type Project } from "./types.ts";

/**
 * The learner edits ONE growing file per project. Each lesson appends to it, so the
 * Python they wrote in lesson 3 is still what drives the demo in lesson 8.
 *
 * Some languages need a file's parts in a fixed order. In C# with top-level statements, every
 * statement must come BEFORE the first type declaration. A lesson's text may therefore contain
 * TYPES_DIVIDER on a line of its own: what is above it joins the file's statements, what is below
 * it joins the declarations at the bottom, and the divider stays between them. Lessons without
 * the divider append to the statements once the file has one. Projects that never use it compose
 * exactly as before.
 *
 * C++, Go and Rust want the opposite shape: declarations (includes/imports, structs, functions)
 * at the TOP and a `main()` whose BODY grows lesson after lesson. Once the file is "main-shaped"
 * (a main opener line, and the closing brace of main is the last line), each lesson's text may
 * contain MAIN_DIVIDER on a line of its own: what is above it joins the declarations before
 * main, what is below it (or the whole text when there is no divider) goes at the end of main's
 * body. Lesson 1 carries the whole skeleton, so this only kicks in from lesson 2. The divider
 * itself never appears in the composed file.
 */
export const TYPES_DIVIDER = "// ───── type declarations go below this line ─────";
export const MAIN_DIVIDER = "// ───── code inside main() goes below this line ─────";

const MAIN_OPENER = /^(int main\([^)]*\)|func main\(\)|fn main\(\)) \{$/;
const NL = String.fromCharCode(10);
const BACKSLASH = String.fromCharCode(92);

/** Number of lines that look like a main opener (used by the validator's self-checks). */
export function countMainOpeners(text: string): number {
  return text.split(NL).filter((l) => MAIN_OPENER.test(l.trim())).length;
}

const isWordChar = (ch: string | undefined) => ch !== undefined && /[A-Za-z0-9_]/.test(ch);

/**
 * Index of the line holding the closing brace of the block opened on line `open`, or -1.
 * A small scanner: skips // and block comments, "strings" with escapes, Go `raw` strings,
 * Rust r#"raw"# strings, C++ R"x(raw)x" strings and char literals (a quoted brace is not a brace).
 */
function closingLine(lines: string[], open: number): number {
  const text = lines.slice(open).join(NL);
  let line = open;
  let depth = 0;
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1];
    if (c === "/" && n === "/") {
      while (i < text.length && text[i] !== NL) i++;
    } else if (c === "/" && n === "*") {
      const end = text.indexOf("*/", i + 2);
      const stop = end === -1 ? text.length : end + 2;
      for (; i < stop; i++) if (text[i] === NL) line++;
    } else if (c === "`" || (c === "r" && !isWordChar(text[i - 1]) && /^r#*"/.test(text.slice(i, i + 40))) || (c === "R" && n === '"' && !isWordChar(text[i - 1]))) {
      // raw strings: find the matching terminator, counting the lines they span
      let terminator = "`";
      let from = i + 1;
      if (c === "r") {
        const hashes = /^r(#*)"/.exec(text.slice(i, i + 40))![1];
        terminator = `"${hashes}`;
        from = i + 2 + hashes.length;
      } else if (c === "R") {
        const m = /^R"([^() ]{0,16})\(/.exec(text.slice(i, i + 24));
        if (m) {
          terminator = `)${m[1]}"`;
          from = i + m[0].length;
        } else from = i + 2;
      }
      const end = text.indexOf(terminator, from);
      const stop = end === -1 ? text.length : end + terminator.length;
      for (; i < stop; i++) if (text[i] === NL) line++;
    } else if (c === '"') {
      i++;
      while (i < text.length && text[i] !== '"' && text[i] !== NL) i += text[i] === BACKSLASH ? 2 : 1;
      i++;
    } else if (c === "'") {
      // 'x' and an escaped char are char literals; anything else (a Rust lifetime like 'a) is just a tick.
      if (n === BACKSLASH) {
        const end = text.indexOf("'", i + 3);
        i = end === -1 ? i + 1 : end + 1;
      } else if (text[i + 2] === "'") i += 3;
      else i++;
    } else {
      if (c === NL) line++;
      else if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) return line;
      }
      i++;
    }
  }
  return -1;
}

interface MainLocation {
  open: number;
  close: number;
  lines: string[];
}

/**
 * Where main sits in a main-shaped file: the opener line, the line closing it, and that line is
 * the last non-blank one. Null when the file is not main-shaped.
 */
function locateMain(text: string): MainLocation | null {
  const lines = text.split(NL).map((l) => l.replace(/\r$/, ""));
  const open = lines.findIndex((l) => MAIN_OPENER.test(l.trim()));
  if (open === -1) return null;
  const close = closingLine(lines, open);
  if (close === -1 || lines[close].trim() !== "}") return null;
  if (lines.slice(close + 1).some((l) => l.trim() !== "")) return null;
  return { open, close, lines };
}

/** True when `text` is a C++/Go/Rust file whose last block is a complete main(). */
export function isMainShaped(text: string): boolean {
  return locateMain(text) !== null;
}

function trimBlankEdges(lines: string[]): string[] {
  let a = 0;
  let b = lines.length;
  while (a < b && lines[a].trim() === "") a++;
  while (b > a && lines[b - 1].trim() === "") b--;
  return lines.slice(a, b);
}

/** Adds one indent level (4 spaces; a tab in Go, as gofmt writes it) to a block unless it is already indented. */
function indentBlock(lines: string[], unit: string): string[] {
  const filled = lines.filter((l) => l.trim() !== "");
  if (filled.length === 0) return [];
  const minIndent = Math.min(...filled.map((l) => /^[ \t]*/.exec(l)![0].length));
  return minIndent > 0 ? lines : lines.map((l) => (l.trim() === "" ? "" : `${unit}${l}`));
}

/** Appends `add` to a main-shaped file: declarations above main, statements at the end of main's body. */
function appendToMain(add: string, at: MainLocation): string {
  const addLines = add.split(NL).map((l) => l.replace(/\r$/, ""));
  const divider = addLines.findIndex((l) => l.trim() === MAIN_DIVIDER);
  const decls = trimBlankEdges(divider === -1 ? [] : addLines.slice(0, divider));
  const unit = at.lines[at.open].trim().startsWith("func ") ? "\t" : "    ";
  const body = trimBlankEdges(indentBlock(trimBlankEdges(divider === -1 ? addLines : addLines.slice(divider + 1)), unit));
  const before = trimBlankEdges(at.lines.slice(0, at.open));
  const inside = trimBlankEdges(at.lines.slice(at.open + 1, at.close));
  const out: string[] = [];
  const declArea = decls.length ? (before.length ? [...before, "", ...decls] : decls) : before;
  if (declArea.length) out.push(...declArea, "");
  out.push(at.lines[at.open], ...inside);
  if (body.length) {
    if (inside.length) out.push("");
    out.push(...body);
  }
  out.push(at.lines[at.close]);
  return out.join(NL) + NL;
}

function join(parts: string[]): string {
  return parts.map((p) => p.trimEnd()).filter(Boolean).join("\n\n") + "\n";
}

function splitAtDivider(text: string): { top: string; bottom: string | null } {
  const lines = text.split("\n");
  const at = lines.findIndex((l) => l.trim() === TYPES_DIVIDER);
  if (at === -1) return { top: text, bottom: null };
  // Blank lines around the divider are re-created on join, so drop them here or they pile up.
  return { top: lines.slice(0, at).join("\n").trimEnd(), bottom: lines.slice(at + 1).join("\n").replace(/^\s*\n/, "") };
}

/**
 * Appends `add` to `base`. A main-shaped base grows main's body (declarations go above main);
 * otherwise statements stay above the types divider and declarations below it.
 */
export function appendSource(base: string, add: string): string {
  const main = locateMain(base);
  if (main) return appendToMain(add, main);
  const b = splitAtDivider(base);
  const a = splitAtDivider(add);
  if (b.bottom === null && a.bottom === null) return join([base, add]);
  const top = join([b.top, a.top]).trimEnd();
  const bottom = join([b.bottom ?? "", a.bottom ?? ""]).trimEnd();
  return `${top}\n\n${TYPES_DIVIDER}\n\n${bottom}\n`;
}

/** Reference solution for the whole file as it should stand after lesson `index`. */
export function solutionThrough(project: Project, index: number): string {
  const lessons = flattenLessons(project);
  return lessons.slice(0, index + 1).reduce((file, l) => (file === "" ? join([l.solutionAdd]) : appendSource(file, l.solutionAdd)), "");
}

/**
 * What the editor opens with for lesson `index`: the learner's own passing code from the
 * previous lesson (or the reference if they skipped ahead) plus this lesson's new TODO.
 */
export function starterFor(project: Project, index: number, submitted: Record<string, string>): string {
  const lessons = flattenLessons(project);
  const lesson = lessons[index];
  if (index === 0) return join([lesson.starterAdd]);
  const prev = lessons[index - 1];
  const base = submitted[prev.id] ?? solutionThrough(project, index - 1);
  return appendSource(base, lesson.starterAdd);
}

/** The best "current build" for a project: the learner's latest passing code. */
export function latestBuild(project: Project, submitted: Record<string, string>): { code: string; lessonId: string; index: number } | null {
  const lessons = flattenLessons(project);
  for (let i = lessons.length - 1; i >= 0; i--) {
    const code = submitted[lessons[i].id];
    if (code) return { code, lessonId: lessons[i].id, index: i };
  }
  return null;
}
