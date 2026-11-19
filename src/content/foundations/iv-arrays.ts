import type { ConceptLesson, Module } from "../../learn/types.ts";
import { ivArraysLessonsA } from "./iv-arrays-a.ts";
import { ivArraysLessonsB } from "./iv-arrays-b.ts";

const lessons: ConceptLesson[] = [...ivArraysLessonsA, ...ivArraysLessonsB];

export const ivArraysModule: Module = {
  id: "iv-arrays",
  part: "interview",
  title: "Arrays, strings and hashing",
  blurb: "Arrays, strings, hash tables, counting, enumeration, simulation, matrices and prefix sums.",
  icon: "boxes",
  lessons,
};
