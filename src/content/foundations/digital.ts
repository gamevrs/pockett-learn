import type { Module } from "../../learn/types.ts";

/**
 * Module: Digital logic from transistors. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels, accuracy rules).
 *
 * Authors: put the lessons in the `lessons` array below (or, if the file grows large, split them into
 * digital-a.ts / digital-b.ts exporting ConceptLesson[] and spread them here, like ai-systems.ts).
 * Lesson ids are `fnd-digi-N-slug`, each lesson sets `level` ("Beginner" | "Intermediate" | "Advanced" |
 * "Professional"), and levels must never go backwards within the module (the validator checks it).
 * Widgets: register them in src/learn/widgets/digi/index.ts with keys prefixed "digi-".
 */
export const digitalModule: Module = {
  id: "digital",
  part: "electronics",
  title: "Digital logic from transistors",
  blurb:
    "From a transistor switch to CMOS gates, multiplexers and decoders, latches and flip-flops, registers and counters, state machines, timing, and crossing clock domains safely.",
  icon: "binary",
  lessons: [],
};
