import type { Module } from "../../learn/types.ts";
import { aiLessonsA } from "./ai-systems-a.ts";
import { aiLessonsB } from "./ai-systems-b.ts";
import { aiLessonsC } from "./ai-systems-c.ts";

/**
 * Module: shipping AI features. Embeddings and vector search, indexes and filters, RAG, hybrid
 * search and reranking, evaluation, inference and cost, agents, and tool servers (MCP).
 * Scenarios: a school library assistant, a bike help desk and a clinic booking system.
 */
export const aiSystemsModule: Module = {
  id: "ai-systems",
  part: "systems",
  title: "Shipping AI features",
  blurb: "Embeddings and vector search, RAG, evaluation, inference and cost, agents, and tool servers.",
  icon: "bot",
  lessons: [...aiLessonsA, ...aiLessonsB, ...aiLessonsC],
};
