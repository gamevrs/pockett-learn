import type { Module } from "../../learn/types.ts";

/**
 * Module: Components and PCB design. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels, accuracy rules).
 *
 * Authors: put the lessons in the `lessons` array below (or, if the file grows large, split them into
 * pcb-a.ts / pcb-b.ts exporting ConceptLesson[] and spread them here, like ai-systems.ts).
 * Lesson ids are `fnd-pcb-N-slug`, each lesson sets `level` ("Beginner" | "Intermediate" | "Advanced" |
 * "Professional"), and levels must never go backwards within the module (the validator checks it).
 * Widgets: register them in src/learn/widgets/pcb/index.ts with keys prefixed "pcb-".
 * Shared circuit kit (schematic symbols, DC and transient solvers, SI formatting): src/learn/widgets/elec-kit/.
 */
export const pcbModule: Module = {
  id: "pcb",
  part: "electronics",
  title: "Components and PCB design",
  blurb:
    "Meet the parts and read their datasheets, draw a schematic, then lay out a board: footprints, placement and routing, power and ground, signal integrity, EMC and manufacturing files.",
  icon: "circuit",
  lessons: [],
};
