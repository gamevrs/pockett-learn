import type { ConceptLesson, Module } from "../../learn/types.ts";
import { memoryLessonsA } from "./memory-a.ts";
import { memoryLessonsB } from "./memory-b.ts";
import { memoryLessonsC } from "./memory-c.ts";

/**
 * Module: Memory: from bytes to the hierarchy. Spec: docs/HARDWARE_PATH.md (lesson list, levels, accuracy rules).
 *
 * Twelve lessons from Beginner to Professional: inside a memory chip, the hierarchy, latency vs bandwidth, cache lines and
 * locality, how a cache finds data, the three kinds of miss, alignment and layout, virtual memory, the TLB and page faults,
 * cache coherence, memory ordering and atomics, and memory performance in practice.
 * Widgets: src/learn/widgets/memsys/ (keys prefixed "memsys-").
 */
const lessons: ConceptLesson[] = [...memoryLessonsA, ...memoryLessonsB, ...memoryLessonsC];

export const memoryModule: Module = {
  id: "memory",
  part: "hardware",
  title: "Memory: from bytes to the hierarchy",
  blurb:
    "What a memory chip is, why caches exist, cache lines and locality, virtual memory, coherence and memory ordering, and how to measure memory performance.",
  icon: "memory",
  lessons,
};
