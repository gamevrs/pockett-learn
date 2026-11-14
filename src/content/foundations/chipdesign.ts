import type { ConceptLesson, Module } from "../../learn/types.ts";
import { chipdesignLessonsA } from "./chipdesign-a.ts";
import { chipdesignLessonsB } from "./chipdesign-b.ts";
import { chipLowPowerLesson } from "./chipdesign-c.ts";

/**
 * Module: Designing chips: from RTL to tape-out. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels, accuracy rules).
 *
 * Twelve lessons from Beginner to Professional: the design flow (and who makes what); hardware is not software;
 * Verilog basics; sequential logic in Verilog; testbenches; synthesis; static timing analysis; physical design and
 * power; low power and sign-off variation (fnd-chip-11, after physical design); verification at scale and design for
 * test; FPGA vs ASIC and tape-out; FPGA hands-on (fnd-chip-12, last). Ids never change; array position sets the order.
 * Widgets: src/learn/widgets/chip/ (keys prefixed "chip-"), centred on a toy Verilog subset simulator.
 */
const byId = (id: string): ConceptLesson => {
  const l = chipdesignLessonsB.find((x) => x.id === id);
  if (!l) throw new Error(`chipdesign: missing lesson ${id}`);
  return l;
};

const lessons: ConceptLesson[] = [
  ...chipdesignLessonsA,
  byId("fnd-chip-6-synthesis"),
  byId("fnd-chip-7-timing"),
  byId("fnd-chip-8-physical-design"),
  chipLowPowerLesson,
  byId("fnd-chip-9-verification-dft"),
  byId("fnd-chip-10-fpga-asic-tapeout"),
];

export const chipdesignModule: Module = {
  id: "chipdesign",
  part: "semiconductors",
  title: "Designing chips: from RTL to tape-out",
  blurb:
    "The chip design flow, hardware vs software thinking, Verilog for combinational and sequential logic, testbenches, synthesis, timing analysis, physical design, low power and sign-off, verification and test, FPGA vs ASIC and tape-out, and an FPGA hands-on.",
  icon: "microchip",
  lessons,
};
