import type { Module } from "../../learn/types.ts";

/**
 * Module: Building real products. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels, accuracy rules).
 *
 * Authors: put the lessons in the `lessons` array below (or, if the file grows large, split them into
 * products-a.ts / products-b.ts exporting ConceptLesson[] and spread them here, like ai-systems.ts).
 * Lesson ids are `fnd-prod-N-slug`, each lesson sets `level` ("Beginner" | "Intermediate" | "Advanced" |
 * "Professional"), and levels must never go backwards within the module (the validator checks it).
 * Widgets: register them in src/learn/widgets/prod/index.ts with keys prefixed "prod-".
 * Shared circuit kit (schematic symbols, DC and transient solvers, SI formatting): src/learn/widgets/elec-kit/.
 */
export const productsModule: Module = {
  id: "products",
  part: "electronics",
  title: "Building real products",
  blurb:
    "From an idea to requirements and an architecture, prototyping, firmware structure, bring-up, debugging, testing, certification and safety, to shipping and supporting a product in the field.",
  icon: "package",
  lessons: [],
};
