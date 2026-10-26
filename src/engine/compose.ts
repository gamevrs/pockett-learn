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
 */
export const TYPES_DIVIDER = "// ───── type declarations go below this line ─────";

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

/** Appends `add` to `base`, keeping statements above the divider and declarations below it. */
function append(base: string, add: string): string {
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
  return lessons.slice(0, index + 1).reduce((file, l) => (file === "" ? join([l.solutionAdd]) : append(file, l.solutionAdd)), "");
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
  return append(base, lesson.starterAdd);
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
