import type { Module } from "../../learn/types.ts";
import { mathLessonsA } from "./iv-math-a.ts";
import { mathLessonsB } from "./iv-math-b.ts";

export const ivMathModule: Module = {
  id: "iv-math",
  part: "interview",
  title: "Maths for coding interviews",
  blurb: "Number theory, bit tricks, combinatorics, geometry, probability, randomized algorithms, sampling and brainteasers.",
  icon: "atom",
  lessons: [...mathLessonsA, ...mathLessonsB],
};
