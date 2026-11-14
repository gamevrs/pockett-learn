import type { Module } from "../../learn/types.ts";

/**
 * Module: Designing chips: from RTL to tape-out. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels, accuracy rules).
 *
 * Authors: put the lessons in the `lessons` array below (or, if the file grows large, split them into
 * chipdesign-a.ts / chipdesign-b.ts exporting ConceptLesson[] and spread them here, like ai-systems.ts).
 * Lesson ids are `fnd-chip-N-slug`, each lesson sets `level` ("Beginner" | "Intermediate" | "Advanced" |
 * "Professional"), and levels must never go backwards within the module (the validator checks it).
 * Widgets: register them in src/learn/widgets/chip/index.ts with keys prefixed "chip-".
 */
export const chipdesignModule: Module = {
  id: "chipdesign",
  part: "semiconductors",
  title: "Designing chips: from RTL to tape-out",
  blurb:
    "The chip design flow, hardware vs software thinking, Verilog for combinational and sequential logic, testbenches, synthesis, timing analysis, physical design, verification and test, FPGA vs ASIC and tape-out.",
  icon: "microchip",
  lessons: [],
};
