import type { Module } from "../../learn/types.ts";

/**
 * Module: Electronics from zero: circuits. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels, accuracy rules).
 *
 * Authors: put the lessons in the `lessons` array below (or, if the file grows large, split them into
 * circuits-a.ts / circuits-b.ts exporting ConceptLesson[] and spread them here, like ai-systems.ts).
 * Lesson ids are `fnd-circ-N-slug`, each lesson sets `level` ("Beginner" | "Intermediate" | "Advanced" |
 * "Professional"), and levels must never go backwards within the module (the validator checks it).
 * Widgets: register them in src/learn/widgets/circ/index.ts with keys prefixed "circ-".
 * Shared circuit kit (schematic symbols, DC and transient solvers, SI formatting): src/learn/widgets/elec-kit/.
 */
export const circuitsModule: Module = {
  id: "circuits",
  part: "electronics",
  title: "Electronics from zero: circuits",
  blurb:
    "What electricity is, Ohm's law, power and heat, series and parallel, Kirchhoff's laws, voltage dividers, reading schematics and measuring, and the limits of real sources.",
  icon: "zap",
  lessons: [],
};
