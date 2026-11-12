import type { Module } from "../../learn/types.ts";
import { cpuLessonsA } from "./cpu-a.ts";
import { cpuLessonsB } from "./cpu-b.ts";

/**
 * Module: How a CPU runs your code. Spec: docs/HARDWARE_PATH.md (lesson list, levels, accuracy rules).
 *
 * Authors: put the lessons in the `lessons` array below (or, if the file grows large, split them into
 * cpu-a.ts / cpu-b.ts exporting ConceptLesson[] and spread them here, like ai-systems.ts).
 * Lesson ids are `fnd-cpu-N-slug`, each lesson sets `level` ("Beginner" | "Intermediate" | "Advanced" |
 * "Professional"), and levels must never go backwards within the module (the validator checks it).
 * Widgets: register them in src/learn/widgets/cpuarch/index.ts with keys prefixed "cpuarch-".
 */
export const cpuModule: Module = {
  id: "cpu",
  part: "hardware",
  title: "How a CPU runs your code",
  blurb:
    "From logic gates to an adder, then pipelines, branch prediction, out-of-order execution, many cores and SIMD, ending with how to measure a real CPU.",
  icon: "microchip",
  lessons: [...cpuLessonsA, ...cpuLessonsB],
};
