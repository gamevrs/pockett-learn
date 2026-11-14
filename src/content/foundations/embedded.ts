import type { ConceptLesson, Module } from "../../learn/types.ts";
import { embeddedLessonsA } from "./embedded-a.ts";
import { embeddedLessonsB } from "./embedded-b.ts";

/**
 * Module: Programming chips: firmware, MCUs and SoCs. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels, accuracy rules).
 *
 * Ten lessons from Beginner to Professional: microcontrollers, registers and memory-mapped I/O, GPIO, timers and PWM,
 * interrupts, UART/I²C/SPI, DMA, boot and the linker map, RTOS and low power, and SoCs running Linux.
 * Widgets: src/learn/widgets/emb/ (keys prefixed "emb-"), sharing a toy MCU model in emb/sim.ts.
 */
const lessons: ConceptLesson[] = [...embeddedLessonsA, ...embeddedLessonsB];

export const embeddedModule: Module = {
  id: "embedded",
  part: "electronics",
  title: "Programming chips: firmware, MCUs and SoCs",
  blurb:
    "Microcontrollers and memory-mapped registers, GPIO, timers and PWM, interrupts, UART, I²C and SPI, DMA, boot and the memory map, an RTOS and low power, up to SoCs running Linux.",
  icon: "cpu",
  lessons,
};
