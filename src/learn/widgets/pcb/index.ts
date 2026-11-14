import type { WidgetRegistry } from "@/learn/widget";

/**
 * Widgets for the "Components and PCB design" module. Every key MUST be prefixed "pcb-" so it stays unique
 * across the per-module registries.
 *
 * The validator finds widget types with a regex over this file, so register each one in exactly this
 * literal form (one per line, no computed keys, spreads or shorthand):
 *
 *   "pcb-name": { Component: Name, check: checkName },
 */
export const PCB_WIDGETS: WidgetRegistry = {};
