import type { ConceptLesson, Module } from "../../learn/types.ts";
import { pcbLessonsA } from "./pcb-a.ts";
import { pcbLessonsB } from "./pcb-b.ts";
import { pcbLessonsC } from "./pcb-c.ts";
import { pcbLessonsD } from "./pcb-d.ts";

/**
 * Module: Components and PCB design. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels, accuracy rules).
 *
 * Authors: put the lessons in the `lessons` array below (or, if the file grows large, split them into
 * pcb-a.ts / pcb-b.ts exporting ConceptLesson[] and spread them here, like ai-systems.ts).
 * Lesson ids are `fnd-pcb-N-slug`, each lesson sets `level` ("Beginner" | "Intermediate" | "Advanced" |
 * "Professional"), and levels must never go backwards within the module (the validator checks it).
 * Widgets: register them in src/learn/widgets/pcb/index.ts with keys prefixed "pcb-".
 * Shared circuit kit (schematic symbols, DC and transient solvers, SI formatting): src/learn/widgets/elec-kit/.
 *
 * Lessons 1-2 live in pcb-a.ts, 3-5 in pcb-b.ts, 6-7 in pcb-c.ts and 8-9 in pcb-d.ts.
 */
const lessons: ConceptLesson[] = [...pcbLessonsA, ...pcbLessonsB, ...pcbLessonsC, ...pcbLessonsD];

export const pcbModule: Module = {
  id: "pcb",
  part: "electronics",
  title: "Components and PCB design",
  blurb:
    "Meet the parts and read their datasheets, draw a schematic, then lay out a board: footprints, placement and routing, power and ground, signal integrity, EMC and manufacturing files.",
  icon: "circuit",
  lessons,
};
