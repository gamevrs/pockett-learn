import type { ConceptLesson, Module } from "../../learn/types.ts";
import { circuitsLessonsA } from "./circuits-a.ts";
import { circuitsLessonsB } from "./circuits-b.ts";
import { circuitsLessonsC } from "./circuits-c.ts";

/**
 * Module: Electronics from zero: circuits. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels, accuracy rules).
 *
 * Ten lessons, Beginner to Intermediate: what electricity is, Ohm's law, power and heat, series and parallel, Kirchhoff's laws, the
 * voltage divider and loading, reading schematics and measuring, real sources (internal resistance, current limits, fuses), and the bench
 * skills (breadboards and soldering, then the oscilloscope).
 * Widgets: src/learn/widgets/circ/ (keys prefixed "circ-"), built on the shared kit in src/learn/widgets/elec-kit/.
 */
const lessons: ConceptLesson[] = [...circuitsLessonsA, ...circuitsLessonsB, ...circuitsLessonsC];

export const circuitsModule: Module = {
  id: "circuits",
  part: "electronics",
  title: "Electronics from zero: circuits",
  blurb:
    "What electricity is, Ohm's law, power and heat, series and parallel, Kirchhoff's laws, voltage dividers, reading schematics and measuring, the limits of real sources, and bench skills: breadboards, soldering and the oscilloscope.",
  icon: "zap",
  lessons,
};
