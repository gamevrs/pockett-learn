import type { ConceptLesson, Module } from "../../learn/types.ts";

const lessons: ConceptLesson[] = [];

export const ivConcurrencyModule: Module = {
  id: "iv-concurrency",
  part: "interview",
  title: "Concurrency",
  blurb: "Races, ordering, locks, semaphores, producer and consumer queues, deadlock and barriers, in JavaScript async.",
  icon: "zap",
  lessons,
};
