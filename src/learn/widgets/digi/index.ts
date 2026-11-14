import type { WidgetRegistry } from "@/learn/widget";

/**
 * Widgets for the "Digital logic from transistors" module. Every key MUST be prefixed "digi-" so it stays unique
 * across the per-module registries.
 *
 * The validator finds widget types with a regex over this file, so register each one in exactly this
 * literal form (one per line, no computed keys, spreads or shorthand):
 *
 *   "digi-name": { Component: Name, check: checkName },
 */
export const DIGI_WIDGETS: WidgetRegistry = {};
