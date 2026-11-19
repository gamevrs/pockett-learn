import type { Module } from "../../learn/types.ts";
import { ivDatabaseLessonsA } from "./iv-database-a.ts";
import { ivDatabaseLessonsB } from "./iv-database-b.ts";

/**
 * Interview practice: SQL problems in SQLite. Filtering and NULLs, joins, grouping, subqueries and CTEs,
 * window functions, top-N per group, dates and pivots, recursive CTEs. Every code step runs against hidden
 * seed tables (`setup`) that the lesson shows as text.
 */
export const ivDatabaseModule: Module = {
  id: "iv-database",
  part: "interview",
  title: "Database (SQL) interview problems",
  blurb: "Joins, grouping, subqueries, window functions, ranking and recursive queries in SQL.",
  icon: "database",
  lessons: [...ivDatabaseLessonsA, ...ivDatabaseLessonsB],
};
