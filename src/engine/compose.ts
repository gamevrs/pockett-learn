import { flattenLessons, type Project } from "./types.ts";

/**
 * The learner edits ONE growing file per project. Each lesson appends to it, so the
 * Python they wrote in lesson 3 is still what drives the demo in lesson 8.
 */

function join(parts: string[]): string {
  return parts.map((p) => p.trimEnd()).filter(Boolean).join("\n\n") + "\n";
}

/** Reference solution for the whole file as it should stand after lesson `index`. */
export function solutionThrough(project: Project, index: number): string {
  const lessons = flattenLessons(project);
  return join(lessons.slice(0, index + 1).map((l) => l.solutionAdd));
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
  return join([base, lesson.starterAdd]);
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
