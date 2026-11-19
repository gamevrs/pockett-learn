import type { ConceptLesson, Module } from "../../learn/types.ts";
import { ivDpLessonsA } from "./iv-dp-a.ts";
import { ivDpLessonsB } from "./iv-dp-b.ts";

const lessons: ConceptLesson[] = [...ivDpLessonsA, ...ivDpLessonsB];

export const ivDpModule: Module = {
  id: "iv-dp",
  part: "interview",
  title: "Dynamic programming, greedy and search",
  blurb: "Memoization, dynamic programming, greedy choices, backtracking, bitmasks, meet in the middle, game theory and minimax.",
  icon: "puzzle",
  lessons,
};
