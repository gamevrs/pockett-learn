import type { Module } from "../../learn/types.ts";

/**
 * Module: Memory: from bytes to the hierarchy. Spec: docs/HARDWARE_PATH.md (lesson list, levels, accuracy rules).
 *
 * Authors: put the lessons in the `lessons` array below (or, if the file grows large, split them into
 * memory-a.ts / memory-b.ts exporting ConceptLesson[] and spread them here, like ai-systems.ts).
 * Lesson ids are `fnd-mem-N-slug`, each lesson sets `level` ("Beginner" | "Intermediate" | "Advanced" |
 * "Professional"), and levels must never go backwards within the module (the validator checks it).
 * Widgets: register them in src/learn/widgets/memsys/index.ts with keys prefixed "memsys-".
 */
export const memoryModule: Module = {
  id: "memory",
  part: "hardware",
  title: "Memory: from bytes to the hierarchy",
  blurb:
    "What a memory chip is, why caches exist, cache lines and locality, virtual memory, coherence and memory ordering, and how to measure memory performance.",
  icon: "memory",
  lessons: [],
};
