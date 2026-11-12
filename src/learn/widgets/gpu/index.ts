import type { WidgetRegistry } from "@/learn/widget";

/**
 * Widgets for the "GPUs: thousands of small cores" module. Every key MUST be prefixed "gpu-" so it stays unique
 * across the per-module registries.
 *
 * The validator finds widget types with a regex over this file, so register each one in exactly this
 * literal form (one per line, no computed keys, spreads or shorthand):
 *
 *   "gpu-name": { Component: Name, check: checkName },
 */
export const GPU_WIDGETS: WidgetRegistry = {};
