import type { WidgetRegistry } from "@/learn/widget";

/**
 * Widgets for the "How a CPU runs your code" module. Every key MUST be prefixed "cpuarch-" so it stays unique
 * across the per-module registries.
 *
 * The validator finds widget types with a regex over this file, so register each one in exactly this
 * literal form (one per line, no computed keys, spreads or shorthand):
 *
 *   "cpuarch-name": { Component: Name, check: checkName },
 */
export const CPUARCH_WIDGETS: WidgetRegistry = {};
