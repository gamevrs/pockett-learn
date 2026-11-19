import type { Module } from "../../learn/types.ts";
import { ivTreesLessonsA } from "./iv-trees-a.ts";
import { ivTreesLessonsB } from "./iv-trees-b.ts";

export const ivTreesModule: Module = {
  id: "iv-trees",
  part: "interview",
  title: "Trees, heaps and tries",
  blurb: "Binary trees, recursion, depth-first and breadth-first search, BSTs, heaps, tries and ordered sets.",
  icon: "tree",
  lessons: [...ivTreesLessonsA, ...ivTreesLessonsB],
};
