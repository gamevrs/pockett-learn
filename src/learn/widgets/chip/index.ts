import type { WidgetRegistry } from "@/learn/widget";

/**
 * Widgets for the "Designing chips: from RTL to tape-out" module. Every key MUST be prefixed "chip-" so it stays unique
 * across the per-module registries.
 *
 * The validator finds widget types with a regex over this file, so register each one in exactly this
 * literal form (one per line, no computed keys, spreads or shorthand):
 *
 *   "chip-name": { Component: Name, check: checkName },
 */
export const CHIP_WIDGETS: WidgetRegistry = {};
