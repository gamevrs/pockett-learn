import type { ConceptLesson, Module } from "../../learn/types.ts";
import { circuitsLessonsA } from "./circuits-a.ts";
import { circuitsLessonsB } from "./circuits-b.ts";

/**
 * Module: Electronics from zero: circuits. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels, accuracy rules).
 *
 * Eight lessons, Beginner to Intermediate: what electricity is, Ohm's law, power and heat, series and parallel, Kirchhoff's laws, the
 * voltage divider and loading, reading schematics and measuring, and real sources (internal resistance, current limits, fuses).
 * Widgets: src/learn/widgets/circ/ (keys prefixed "circ-"), built on the shared kit in src/learn/widgets/elec-kit/.
 */
const lessons: ConceptLesson[] = [...circuitsLessonsA, ...circuitsLessonsB];

export const circuitsModule: Module = {
  id: "circuits",
  part: "electronics",
  title: "Electronics from zero: circuits",
  blurb:
    "What electricity is, Ohm's law, power and heat, series and parallel, Kirchhoff's laws, voltage dividers, reading schematics and measuring, and the limits of real sources.",
  icon: "zap",
  lessons,
};
