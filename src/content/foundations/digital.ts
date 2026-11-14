import type { Module } from "../../learn/types.ts";
import { digitalLessonsA } from "./digital-a.ts";
import { digitalLessonsB } from "./digital-b.ts";

/**
 * Module: Digital logic from transistors. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels, accuracy rules).
 *
 * Lessons 1 to 4 are in digital-a.ts and 5 to 8 in digital-b.ts. Lesson ids are `fnd-digi-N-slug`, each lesson sets `level`,
 * and levels never go backwards within the module (the validator checks it). Widgets live in src/learn/widgets/digi/
 * with keys prefixed "digi-".
 */
export const digitalModule: Module = {
  id: "digital",
  part: "electronics",
  title: "Digital logic from transistors",
  blurb:
    "From a transistor switch to CMOS gates, multiplexers and decoders, latches and flip-flops, registers and counters, state machines, timing, and crossing clock domains safely.",
  icon: "binary",
  lessons: [...digitalLessonsA, ...digitalLessonsB],
};
