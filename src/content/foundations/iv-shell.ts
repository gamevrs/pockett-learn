import type { ConceptLesson, Module } from "../../learn/types.ts";

const lessons: ConceptLesson[] = [];

export const ivShellModule: Module = {
  id: "iv-shell",
  part: "interview",
  title: "Shell one-liners",
  blurb: "Reading lines, matching patterns, counting words and reshaping columns with grep, sed, awk and friends.",
  icon: "terminal",
  lessons,
};
