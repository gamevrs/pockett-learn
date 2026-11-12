import type { Module } from "../../learn/types.ts";

/**
 * Module: GPUs: thousands of small cores. Spec: docs/HARDWARE_PATH.md (lesson list, levels, accuracy rules).
 *
 * Authors: put the lessons in the `lessons` array below (or, if the file grows large, split them into
 * gpu-a.ts / gpu-b.ts exporting ConceptLesson[] and spread them here, like ai-systems.ts).
 * Lesson ids are `fnd-gpu-N-slug`, each lesson sets `level` ("Beginner" | "Intermediate" | "Advanced" |
 * "Professional"), and levels must never go backwards within the module (the validator checks it).
 * Widgets: register them in src/learn/widgets/gpu/index.ts with keys prefixed "gpu-".
 */
export const gpuModule: Module = {
  id: "gpu",
  part: "hardware",
  title: "GPUs: thousands of small cores",
  blurb:
    "Why GPUs exist, the graphics pipeline, kernels, warps, GPU memory, coalescing, tiled matrix multiply, and how GPUs run AI, up to profiling and scaling.",
  icon: "circuit",
  lessons: [],
};
