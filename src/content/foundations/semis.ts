import type { ConceptLesson, Module } from "../../learn/types.ts";
import { semisLessonsA } from "./semis-a.ts";
import { semisLessonsB } from "./semis-b.ts";

/**
 * Module: Semiconductors: physics to fab. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels, accuracy rules).
 *
 * Ten lessons from Beginner to Professional: conductors, insulators and semiconductors; doping; the PN junction; the MOSFET;
 * scaling and Moore's law; making a wafer; the fab process loop; lithography; yield and cost; packaging and test.
 * Widgets: src/learn/widgets/semi/ (keys prefixed "semi-").
 */
const lessons: ConceptLesson[] = [...semisLessonsA, ...semisLessonsB];

export const semisModule: Module = {
  id: "semis",
  part: "semiconductors",
  title: "Semiconductors: physics to fab",
  blurb:
    "Why silicon conducts, doping, the PN junction and the MOSFET, scaling and node names, making wafers, the fab process loop, lithography, yield and cost, packaging and test.",
  icon: "atom",
  lessons,
};
