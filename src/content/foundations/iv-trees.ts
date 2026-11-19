import type { ConceptLesson, Module } from "../../learn/types.ts";

const lessons: ConceptLesson[] = [];

export const ivTreesModule: Module = {
  id: "iv-trees",
  part: "interview",
  title: "Trees, heaps and tries",
  blurb: "Binary trees, recursion, depth-first and breadth-first search, BSTs, heaps, tries and ordered sets.",
  icon: "tree",
  lessons,
};
