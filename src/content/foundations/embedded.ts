import type { Module } from "../../learn/types.ts";

/**
 * Module: Programming chips: firmware, MCUs and SoCs. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels, accuracy rules).
 *
 * Authors: put the lessons in the `lessons` array below (or, if the file grows large, split them into
 * embedded-a.ts / embedded-b.ts exporting ConceptLesson[] and spread them here, like ai-systems.ts).
 * Lesson ids are `fnd-emb-N-slug`, each lesson sets `level` ("Beginner" | "Intermediate" | "Advanced" |
 * "Professional"), and levels must never go backwards within the module (the validator checks it).
 * Widgets: register them in src/learn/widgets/emb/index.ts with keys prefixed "emb-".
 */
export const embeddedModule: Module = {
  id: "embedded",
  part: "electronics",
  title: "Programming chips: firmware, MCUs and SoCs",
  blurb:
    "Microcontrollers and memory-mapped registers, GPIO, timers and PWM, interrupts, UART, I²C and SPI, DMA, boot and the memory map, an RTOS and low power, up to SoCs running Linux.",
  icon: "cpu",
  lessons: [],
};
