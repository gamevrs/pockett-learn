import { trackLessons, type ConceptLesson, type Module, type Track } from "../../learn/types.ts";
import { bitsModule } from "./bits.ts";
import { programsModule } from "./programs.ts";
import { oopModule } from "./oop.ts";
import { patternsModule } from "./patterns.ts";

/** The Foundations track: from a single bit to design patterns, every step interactive. */
export const FOUNDATIONS: Track = {
  slug: "foundations",
  title: "Foundations",
  tagline: "How code really works, from a single bit to design patterns.",
  modules: [bitsModule, programsModule, oopModule, patternsModule],
};

export interface ConceptContext {
  lesson: ConceptLesson;
  module: Module;
  index: number;
  total: number;
  prev: ConceptLesson | null;
  next: ConceptLesson | null;
}

export function getConceptContext(lessonId: string): ConceptContext | undefined {
  const lessons = trackLessons(FOUNDATIONS);
  const index = lessons.findIndex((l) => l.id === lessonId);
  if (index < 0) return undefined;
  const owner = FOUNDATIONS.modules.find((m) => m.lessons.some((l) => l.id === lessonId))!;
  return { lesson: lessons[index], module: owner, index, total: lessons.length, prev: lessons[index - 1] ?? null, next: lessons[index + 1] ?? null };
}
