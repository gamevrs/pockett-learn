import type { ConceptLesson, Module } from "../../learn/types.ts";

const lessons: ConceptLesson[] = [];

export const ivSortingModule: Module = {
  id: "iv-sorting",
  part: "interview",
  title: "Sorting, searching and divide and conquer",
  blurb: "Merge sort, quickselect, counting, bucket and radix sort, binary search, divide and conquer and sweep lines.",
  icon: "gauge",
  lessons,
};
