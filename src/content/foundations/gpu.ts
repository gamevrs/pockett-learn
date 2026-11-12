import type { Module } from "../../learn/types.ts";
import { gpuLessonsA } from "./gpu-a.ts";
import { gpuLessonsB } from "./gpu-b.ts";

/**
 * Module: GPUs: thousands of small cores. Spec: docs/HARDWARE_PATH.md (lesson list, levels, accuracy rules).
 *
 * CUDA is the main vocabulary (it is the most widely taught); OpenCL, Metal, Vulkan and HIP equivalents are named where terms first
 * appear. Widgets live in src/learn/widgets/gpu/ (keys "gpu-*"). Lesson ids are `fnd-gpu-N-slug`.
 */
export const gpuModule: Module = {
  id: "gpu",
  part: "hardware",
  title: "GPUs: thousands of small cores",
  blurb:
    "Why GPUs exist, the graphics pipeline, kernels, warps, GPU memory, coalescing, tiled matrix multiply, and how GPUs run AI, up to profiling and scaling.",
  icon: "circuit",
  lessons: [...gpuLessonsA, ...gpuLessonsB],
};
