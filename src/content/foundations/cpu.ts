import type { Module } from "../../learn/types.ts";
import { cpuLessonsA } from "./cpu-a.ts";
import { cpuLessonsB } from "./cpu-b.ts";
import { cpuIsaLesson, cpuSecurityLesson } from "./cpu-c.ts";

/**
 * Module: How a CPU runs your code. Spec: docs/HARDWARE_PATH.md (lesson list, levels, accuracy rules).
 *
 * Lessons live in cpu-a.ts (1 to 5), cpu-b.ts (6 to 10) and cpu-c.ts (later additions placed by level).
 * Lesson ids are `fnd-cpu-N-slug` and never change; the array position below decides the order.
 * Each lesson sets `level` ("Beginner" | "Intermediate" | "Advanced" | "Professional"), and levels must never go
 * backwards within the module (the validator checks it).
 * Widgets: register them in src/learn/widgets/cpuarch/index.ts with keys prefixed "cpuarch-".
 */
export const cpuModule: Module = {
  id: "cpu",
  part: "hardware",
  title: "How a CPU runs your code",
  blurb:
    "From logic gates to an adder, the instruction set and privilege, then pipelines, branch prediction, out-of-order execution, many cores and SIMD, measuring a real CPU, and how speed tricks can leak secrets.",
  icon: "microchip",
  // fnd-cpu-12 (instruction set and privilege) sits after lesson 3; fnd-cpu-11 (hardware security) closes the module
  lessons: [...cpuLessonsA.slice(0, 3), cpuIsaLesson, ...cpuLessonsA.slice(3), ...cpuLessonsB, cpuSecurityLesson],
};
