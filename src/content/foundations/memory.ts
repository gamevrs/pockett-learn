import type { ConceptLesson, Module } from "../../learn/types.ts";
import { memoryLessonsA } from "./memory-a.ts";
import { memoryLessonsB } from "./memory-b.ts";
import { memoryLessonsC } from "./memory-c.ts";
import { memoryLessonD } from "./memory-d.ts";

/**
 * Module: Memory: from bytes to the hierarchy. Spec: docs/HARDWARE_PATH.md (lesson list, levels, accuracy rules).
 *
 * Thirteen lessons from Beginner to Professional: inside a memory chip, the hierarchy, latency vs bandwidth, cache lines and
 * locality, how a cache finds data (and write policies), the three kinds of miss, alignment and layout, virtual memory, the TLB
 * and page faults, memory and storage technologies (fnd-mem-13, placed after lesson 9 so levels never go backwards), cache
 * coherence, memory ordering and atomics, and memory performance in practice.
 * Widgets: src/learn/widgets/memsys/ (keys prefixed "memsys-").
 */
const [tlbLesson, ...memoryLessonsCRest] = memoryLessonsC;
const lessons: ConceptLesson[] = [...memoryLessonsA, ...memoryLessonsB, tlbLesson, memoryLessonD, ...memoryLessonsCRest];

export const memoryModule: Module = {
  id: "memory",
  part: "hardware",
  title: "Memory: from bytes to the hierarchy",
  blurb:
    "What a memory chip is, why caches exist, cache lines and locality, virtual memory, DRAM, ECC and flash, coherence and memory ordering, and how to measure memory performance.",
  icon: "memory",
  lessons,
};
