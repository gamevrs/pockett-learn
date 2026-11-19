import type { ConceptLesson, Module } from "../../learn/types.ts";

const lessons: ConceptLesson[] = [];

export const ivDatabaseModule: Module = {
  id: "iv-database",
  part: "interview",
  title: "Database (SQL) interview problems",
  blurb: "Joins, grouping, subqueries, window functions, ranking and recursive queries in SQL.",
  icon: "database",
  lessons,
};
