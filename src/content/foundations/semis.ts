import type { Module } from "../../learn/types.ts";

/**
 * Module: Semiconductors: physics to fab. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels, accuracy rules).
 *
 * Authors: put the lessons in the `lessons` array below (or, if the file grows large, split them into
 * semis-a.ts / semis-b.ts exporting ConceptLesson[] and spread them here, like ai-systems.ts).
 * Lesson ids are `fnd-semi-N-slug`, each lesson sets `level` ("Beginner" | "Intermediate" | "Advanced" |
 * "Professional"), and levels must never go backwards within the module (the validator checks it).
 * Widgets: register them in src/learn/widgets/semi/index.ts with keys prefixed "semi-".
 */
export const semisModule: Module = {
  id: "semis",
  part: "semiconductors",
  title: "Semiconductors: physics to fab",
  blurb:
    "Why silicon conducts, doping, the PN junction and the MOSFET, scaling and node names, making wafers, the fab process loop, lithography, yield and cost, packaging and test.",
  icon: "atom",
  lessons: [],
};
