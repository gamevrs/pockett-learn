import type { Module } from "../../learn/types.ts";
import { ivGraphsLessonsA } from "./iv-graphs-a.ts";
import { ivGraphsLessonsB } from "./iv-graphs-b.ts";

/**
 * Module: interview graphs. Representations and components, topological sort, union-find, shortest paths,
 * minimum spanning trees, strongly connected components, bridges and articulation points, Eulerian paths.
 */
export const ivGraphsModule: Module = {
  id: "iv-graphs",
  part: "interview",
  title: "Graphs",
  blurb: "Topological sort, union-find, shortest paths, spanning trees, strongly connected and biconnected components, Eulerian circuits.",
  icon: "network",
  lessons: [...ivGraphsLessonsA, ...ivGraphsLessonsB],
};
