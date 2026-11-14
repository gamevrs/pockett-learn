import type { WidgetRegistry } from "@/learn/widget";

/**
 * Widgets for the "Building real products" module. Every key MUST be prefixed "prod-" so it stays unique
 * across the per-module registries.
 *
 * The validator finds widget types with a regex over this file, so register each one in exactly this
 * literal form (one per line, no computed keys, spreads or shorthand):
 *
 *   "prod-name": { Component: Name, check: checkName },
 */
export const PROD_WIDGETS: WidgetRegistry = {};
