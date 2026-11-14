import type { ConceptLesson, Module } from "../../learn/types.ts";
import { analogLessonsA } from "./analog-a.ts";
import { analogLessonsB } from "./analog-b.ts";
import { analogLessonsC } from "./analog-c.ts";

/**
 * Module: Components in action: capacitors to op-amps. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels, accuracy rules).
 *
 * Ten lessons split across three files: analog-a.ts (lessons 1-4), analog-b.ts (5-7), analog-c.ts (8-10), each exporting
 * ConceptLesson[] that are spread into `lessons` below (like memory.ts).
 * Lesson ids are `fnd-analog-N-slug`, each lesson sets `level` ("Beginner" | "Intermediate" | "Advanced" |
 * "Professional"), and levels must never go backwards within the module (the validator checks it).
 * Widgets: register them in src/learn/widgets/analog/index.ts with keys prefixed "analog-".
 * Shared circuit kit (schematic symbols, DC and transient solvers, SI formatting): src/learn/widgets/elec-kit/.
 */
const lessons: ConceptLesson[] = [...analogLessonsA, ...analogLessonsB, ...analogLessonsC];

export const analogModule: Module = {
  id: "analog",
  part: "electronics",
  title: "Components in action: capacitors to op-amps",
  blurb:
    "Capacitors, diodes and LEDs, inductors, alternating current, filters, power supplies, transistors as switches and amplifiers, op-amps, and converting between analog and digital.",
  icon: "activity",
  lessons,
};
