import type { ConceptLesson, Module } from "../../learn/types.ts";

const lessons: ConceptLesson[] = [];

export const ivDpModule: Module = {
  id: "iv-dp",
  part: "interview",
  title: "Dynamic programming, greedy and search",
  blurb: "Memoization, dynamic programming, greedy choices, backtracking, bitmasks, meet in the middle, game theory and minimax.",
  icon: "puzzle",
  lessons,
};
