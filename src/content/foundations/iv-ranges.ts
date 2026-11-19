import type { ConceptLesson, Module } from "../../learn/types.ts";
import { ivRangesLessonsA } from "./iv-ranges-a.ts";
import { ivRangesLessonsB } from "./iv-ranges-b.ts";

const lessons: ConceptLesson[] = [...ivRangesLessonsA, ...ivRangesLessonsB];

export const ivRangesModule: Module = {
  id: "iv-ranges",
  part: "interview",
  title: "Range queries and design",
  blurb: "Segment trees, Fenwick trees, and designing caches, iterators, data streams and interactive solutions.",
  icon: "cpu",
  lessons,
};
