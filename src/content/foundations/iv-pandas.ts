import type { Module } from "../../learn/types.ts";
import { ivPandasLessonsA } from "./iv-pandas-a.ts";
import { ivPandasLessonsB } from "./iv-pandas-b.ts";

/**
 * Interview practice: pandas problems. Creating and inspecting DataFrames, selecting, cleaning, sorting and
 * ranking, groupby, merging, reshaping, and string and date columns. Code steps load pandas in Pyodide
 * (`packages: ["pandas"]`, pandas 2.2) and usually get their DataFrame from a hidden `setup`.
 */
export const ivPandasModule: Module = {
  id: "iv-pandas",
  part: "interview",
  title: "Pandas interview problems",
  blurb: "Selecting, cleaning, grouping, merging and reshaping data with pandas.",
  icon: "database",
  lessons: [...ivPandasLessonsA, ...ivPandasLessonsB],
};
