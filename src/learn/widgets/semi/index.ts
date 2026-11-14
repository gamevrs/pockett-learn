import type { WidgetRegistry } from "@/learn/widget";

/**
 * Widgets for the "Semiconductors: physics to fab" module. Every key MUST be prefixed "semi-" so it stays unique
 * across the per-module registries.
 *
 * The validator finds widget types with a regex over this file, so register each one in exactly this
 * literal form (one per line, no computed keys, spreads or shorthand):
 *
 *   "semi-name": { Component: Name, check: checkName },
 */
export const SEMI_WIDGETS: WidgetRegistry = {};
