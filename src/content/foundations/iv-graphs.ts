import type { ConceptLesson, Module } from "../../learn/types.ts";

const lessons: ConceptLesson[] = [];

export const ivGraphsModule: Module = {
  id: "iv-graphs",
  part: "interview",
  title: "Graphs",
  blurb: "Topological sort, union-find, shortest paths, spanning trees, strongly connected and biconnected components, Eulerian circuits.",
  icon: "network",
  lessons,
};
