import type { WidgetRegistry } from "@/learn/widget";

/**
 * Widgets for the "Programming chips: firmware, MCUs and SoCs" module. Every key MUST be prefixed "emb-" so it stays unique
 * across the per-module registries.
 *
 * The validator finds widget types with a regex over this file, so register each one in exactly this
 * literal form (one per line, no computed keys, spreads or shorthand):
 *
 *   "emb-name": { Component: Name, check: checkName },
 */
export const EMB_WIDGETS: WidgetRegistry = {};
