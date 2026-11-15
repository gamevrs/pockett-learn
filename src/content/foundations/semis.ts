import type { ConceptLesson, Module } from "../../learn/types.ts";
import { semisLessonsA } from "./semis-a.ts";
import { semisLessonsB } from "./semis-b.ts";
import { semiProcessControl, semiReliability } from "./semis-c.ts";

/**
 * Module: Semiconductors: physics to fab. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels and accuracy rules).
 *
 * Twelve lessons from Beginner to Professional: conductors, insulators and semiconductors; doping; the PN junction; the MOSFET;
 * scaling and Moore's law (with wide-band-gap and RF materials); making a wafer; the fab process loop; lithography; measuring
 * and controlling the process; yield and cost; why chips wear out; packaging and test.
 * Lesson ids never change; array position sets the order, so lessons 11 and 12 sit where their level fits.
 * Widgets: src/learn/widgets/semi/ (keys prefixed "semi-").
 */
const insertAfter = (list: ConceptLesson[], id: string, lesson: ConceptLesson) => {
  const i = list.findIndex((l) => l.id === id);
  if (i < 0) throw new Error(`semis: no lesson ${id}`);
  return [...list.slice(0, i + 1), lesson, ...list.slice(i + 1)];
};

const lessons: ConceptLesson[] = insertAfter(
  insertAfter([...semisLessonsA, ...semisLessonsB], "fnd-semi-8-lithography", semiProcessControl),
  "fnd-semi-9-yield",
  semiReliability,
);

export const semisModule: Module = {
  id: "semis",
  part: "semiconductors",
  title: "Semiconductors: physics to fab",
  blurb:
    "Why silicon conducts, doping, the PN junction and the MOSFET, scaling and materials beyond silicon, making wafers, the fab process loop, lithography, process control, yield and cost, reliability, packaging and test.",
  icon: "atom",
  lessons,
};
