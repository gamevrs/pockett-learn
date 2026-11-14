import type { Module } from "../../learn/types.ts";
import { productsLessonsA } from "./products-a.ts";
import { productsLessonsB } from "./products-b.ts";

/**
 * Module: Building real products. Spec: docs/ELECTRONICS_PATH.md (lesson list, levels, accuracy rules).
 *
 * One running example, "Sprout" (a battery-powered plant monitor), goes from requirements to a hardware revision
 * across nine lessons: products-a.ts holds lessons 1 to 5, products-b.ts lessons 6 to 9.
 * Widgets: src/learn/widgets/prod/index.ts (keys prefixed "prod-"). Shared circuit kit: src/learn/widgets/elec-kit/.
 */
export const productsModule: Module = {
  id: "products",
  part: "electronics",
  title: "Building real products",
  blurb:
    "From an idea to requirements and an architecture, prototyping, firmware structure, bring-up, debugging, testing, certification and safety, to shipping and supporting a product in the field.",
  icon: "package",
  lessons: [...productsLessonsA, ...productsLessonsB],
};
