import type { ConceptLesson, Module } from "../../learn/types.ts";

const lessons: ConceptLesson[] = [];

export const ivPandasModule: Module = {
  id: "iv-pandas",
  part: "interview",
  title: "Pandas interview problems",
  blurb: "Selecting, cleaning, grouping, merging and reshaping data with pandas.",
  icon: "database",
  lessons,
};
