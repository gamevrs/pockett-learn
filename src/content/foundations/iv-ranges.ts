import type { ConceptLesson, Module } from "../../learn/types.ts";

const lessons: ConceptLesson[] = [];

export const ivRangesModule: Module = {
  id: "iv-ranges",
  part: "interview",
  title: "Range queries and design",
  blurb: "Segment trees, Fenwick trees, and designing caches, iterators, data streams and interactive solutions.",
  icon: "cpu",
  lessons,
};
