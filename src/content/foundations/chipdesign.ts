import type { ConceptLesson, Module } from "../../learn/types.ts";
import { chipdesignLessonsA } from "./chipdesign-a.ts";
import { chipdesignLessonsB } from "./chipdesign-b.ts";

/**
 * Module: Designing chips: from RTL to tape-out. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels, accuracy rules).
 *
 * Ten lessons from Beginner to Professional: the design flow; hardware is not software; Verilog basics; sequential
 * logic in Verilog; testbenches; synthesis; static timing analysis; physical design and power; verification at
 * scale and design for test; FPGA vs ASIC and tape-out.
 * Widgets: src/learn/widgets/chip/ (keys prefixed "chip-"), centred on a toy Verilog subset simulator.
 */
const lessons: ConceptLesson[] = [...chipdesignLessonsA, ...chipdesignLessonsB];

export const chipdesignModule: Module = {
  id: "chipdesign",
  part: "semiconductors",
  title: "Designing chips: from RTL to tape-out",
  blurb:
    "The chip design flow, hardware vs software thinking, Verilog for combinational and sequential logic, testbenches, synthesis, timing analysis, physical design, verification and test, FPGA vs ASIC and tape-out.",
  icon: "microchip",
  lessons,
};
