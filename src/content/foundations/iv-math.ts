import type { ConceptLesson, Module } from "../../learn/types.ts";

const lessons: ConceptLesson[] = [];

export const ivMathModule: Module = {
  id: "iv-math",
  part: "interview",
  title: "Maths for coding interviews",
  blurb: "Number theory, bit tricks, combinatorics, geometry, probability, randomized algorithms, sampling and brainteasers.",
  icon: "atom",
  lessons,
};
