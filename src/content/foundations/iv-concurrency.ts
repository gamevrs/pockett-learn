import type { Module } from "../../learn/types.ts";
import { concurrencyLessonsA } from "./iv-concurrency-a.ts";
import { concurrencyLessonsB } from "./iv-concurrency-b.ts";

export const ivConcurrencyModule: Module = {
  id: "iv-concurrency",
  part: "interview",
  title: "Concurrency",
  blurb: "Races, ordering, locks, semaphores, producer and consumer queues, deadlock and barriers, in JavaScript async.",
  icon: "zap",
  lessons: [...concurrencyLessonsA, ...concurrencyLessonsB],
};
