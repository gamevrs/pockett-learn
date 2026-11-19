import type { ConceptLesson, Module } from "../../learn/types.ts";

const lessons: ConceptLesson[] = [];

export const ivStringsModule: Module = {
  id: "iv-strings",
  part: "interview",
  title: "String algorithms and hashing",
  blurb: "Hash functions, rolling hashes, string matching and suffix arrays.",
  icon: "binary",
  lessons,
};
