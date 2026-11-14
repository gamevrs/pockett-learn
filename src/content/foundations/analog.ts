import type { Module } from "../../learn/types.ts";

/**
 * Module: Components in action: capacitors to op-amps. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels, accuracy rules).
 *
 * Authors: put the lessons in the `lessons` array below (or, if the file grows large, split them into
 * analog-a.ts / analog-b.ts exporting ConceptLesson[] and spread them here, like ai-systems.ts).
 * Lesson ids are `fnd-analog-N-slug`, each lesson sets `level` ("Beginner" | "Intermediate" | "Advanced" |
 * "Professional"), and levels must never go backwards within the module (the validator checks it).
 * Widgets: register them in src/learn/widgets/analog/index.ts with keys prefixed "analog-".
 * Shared circuit kit (schematic symbols, DC and transient solvers, SI formatting): src/learn/widgets/elec-kit/.
 */
export const analogModule: Module = {
  id: "analog",
  part: "electronics",
  title: "Components in action: capacitors to op-amps",
  blurb:
    "Capacitors, diodes and LEDs, inductors, alternating current, filters, power supplies, transistors as switches and amplifiers, op-amps, and converting between analog and digital.",
  icon: "activity",
  lessons: [],
};
