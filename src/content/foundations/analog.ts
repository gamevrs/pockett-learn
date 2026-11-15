import type { ConceptLesson, Module } from "../../learn/types.ts";
import { analogLessonsA } from "./analog-a.ts";
import { analogLessonsB } from "./analog-b.ts";
import { analogLessonsC } from "./analog-c.ts";
import { analogLessonsD } from "./analog-d.ts";
import { analogLessonsE } from "./analog-e.ts";
import { analogLessonsF } from "./analog-f.ts";
import { analogLessonsG } from "./analog-g.ts";

/**
 * Module: Components in action: capacitors to op-amps. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels, accuracy rules).
 *
 * Fourteen lessons: analog-a.ts (lessons 1-4), analog-b.ts (5-7), analog-c.ts (8-10), and the later additions
 * analog-d.ts (11, protection), analog-e.ts (12, batteries), analog-f.ts (13, switching converters) and analog-g.ts
 * (14, motors), each exporting ConceptLesson[]. Array position decides the order (ids never change), so the
 * additions are spliced in where their level fits: 1, 2, 11, 3-6, 12, 7, 13, 14, 8-10.
 * Lesson ids are `fnd-analog-N-slug`, each lesson sets `level` ("Beginner" | "Intermediate" | "Advanced" |
 * "Professional"), and levels must never go backwards within the module (the validator checks it).
 * Widgets: register them in src/learn/widgets/analog/index.ts with keys prefixed "analog-".
 * Shared circuit kit (schematic symbols, DC and transient solvers, SI formatting): src/learn/widgets/elec-kit/.
 */
const [capacitors, diodes, inductors, ac] = analogLessonsA;
const [filters, supplies, switches] = analogLessonsB;
const lessons: ConceptLesson[] = [
  capacitors,
  diodes,
  ...analogLessonsD, // Intermediate: protecting a circuit
  inductors,
  ac,
  filters,
  supplies,
  ...analogLessonsE, // Intermediate: batteries and power management
  switches,
  ...analogLessonsF, // Advanced: switching converters in depth
  ...analogLessonsG, // Advanced: motors, actuators and drivers
  ...analogLessonsC,
];

export const analogModule: Module = {
  id: "analog",
  part: "electronics",
  title: "Components in action: capacitors to op-amps",
  blurb:
    "Capacitors, diodes and LEDs, inductors, alternating current, filters, power supplies, transistors as switches and amplifiers, op-amps, and converting between analog and digital.",
  icon: "activity",
  lessons,
};
