import type { ConceptLesson, Module } from "../../learn/types.ts";
import { aiLessonsA } from "./ai-systems-a.ts";
import { aiLessonsB } from "./ai-systems-b.ts";
import { aiLessonsC } from "./ai-systems-c.ts";
import { aiLessonsD } from "./ai-systems-d.ts";

/**
 * Module: shipping AI features. A language-model primer, embeddings and vector search, indexes,
 * tokens and the context window, filters, RAG, hybrid search and reranking, evaluation, agents,
 * and tool servers (MCP).
 * Scenarios: a school library assistant, a bike help desk and a clinic booking system.
 *
 * Teaching order differs from file order: the tokens and context-window lesson (fnd-ai-8) comes
 * before filters and RAG, which rely on those words. Lesson ids never change.
 */
const byId = new Map<string, ConceptLesson>([...aiLessonsA, ...aiLessonsB, ...aiLessonsC, ...aiLessonsD].map((l) => [l.id, l]));
const ORDER = [
  "fnd-ai-0-llm-primer",
  "fnd-ai-0b-inside",
  "fnd-ai-1-meaning",
  "fnd-ai-2-searching",
  "fnd-ai-3-index",
  "fnd-ai-8-inference",
  "fnd-ai-4-filters",
  "fnd-ai-5-rag",
  "fnd-ai-6-hybrid",
  "fnd-ai-7-eval",
  "fnd-ai-9-agents",
  "fnd-ai-10-mcp",
];
const lessons = ORDER.map((id) => {
  const lesson = byId.get(id);
  if (!lesson) throw new Error(`ai-systems: missing lesson ${id}`);
  return lesson;
});
if (lessons.length !== byId.size) throw new Error("ai-systems: lesson order does not cover every lesson");

export const aiSystemsModule: Module = {
  id: "ai-systems",
  part: "systems",
  title: "Shipping AI features",
  blurb: "Embeddings and vector search, RAG, evaluation, inference and cost, agents, and tool servers.",
  icon: "bot",
  lessons,
};
