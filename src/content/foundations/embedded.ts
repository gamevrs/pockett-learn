import type { ConceptLesson, Module } from "../../learn/types.ts";
import { embeddedLessonsA } from "./embedded-a.ts";
import { embeddedLessonsB } from "./embedded-b.ts";
import { emb11CFirmware } from "./embedded-c.ts";
import { emb12Links } from "./embedded-d.ts";
import { emb13DriversAccel } from "./embedded-e.ts";

/**
 * Module: Programming chips: firmware, MCUs and SoCs. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels, accuracy rules).
 *
 * Thirteen lessons from Beginner to Professional: microcontrollers, registers and memory-mapped I/O, firmware in C (registers,
 * toolchain, faults), GPIO, timers and PWM, interrupts, UART/I²C/SPI, links between chips (SerDes, PCIe, USB, Ethernet, CAN),
 * DMA, boot and the linker map, RTOS and low power, SoCs running Linux, and drivers and accelerators on an SoC.
 * Widgets: src/learn/widgets/emb/ (keys prefixed "emb-"), sharing a toy MCU model in emb/sim.ts.
 */
const [mcu, registers, gpio, timers, interrupts] = embeddedLessonsA;
const [protocols, dma, boot, rtos, soc] = embeddedLessonsB;
// Ids never change; array position decides the order (lessons 11 to 13 were added later, so their numbers are out of order).
const lessons: ConceptLesson[] = [
  mcu,
  registers,
  emb11CFirmware,
  gpio,
  timers,
  interrupts,
  protocols,
  emb12Links,
  dma,
  boot,
  rtos,
  soc,
  emb13DriversAccel,
].filter((l): l is ConceptLesson => l !== null);

export const embeddedModule: Module = {
  id: "embedded",
  part: "electronics",
  title: "Programming chips: firmware, MCUs and SoCs",
  blurb:
    "Microcontrollers and memory-mapped registers, GPIO, timers and PWM, interrupts, UART, I²C and SPI, DMA, boot and the memory map, an RTOS and low power, up to SoCs running Linux.",
  icon: "cpu",
  lessons,
};
