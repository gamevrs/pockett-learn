import type { Module } from "../../learn/types.ts";
import { ivSortingLessonsA } from "./iv-sorting-a.ts";
import { ivSortingLessonsB } from "./iv-sorting-b.ts";

export const ivSortingModule: Module = {
  id: "iv-sorting",
  part: "interview",
  title: "Sorting, searching and divide and conquer",
  blurb: "Merge sort, quickselect, counting, bucket and radix sort, binary search, divide and conquer and sweep lines.",
  icon: "gauge",
  lessons: [...ivSortingLessonsA, ...ivSortingLessonsB],
};
