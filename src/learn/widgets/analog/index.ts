import type { WidgetRegistry } from "@/learn/widget";

// --- lessons 1–4 (analog-a) imports ---

// --- lessons 5–7 (analog-b) imports ---

// --- lessons 8–10 (analog-c) imports ---

/**
 * Widgets for the "Components in action: capacitors to op-amps" module. Every key MUST be prefixed "analog-" so it stays unique
 * across the per-module registries.
 *
 * The validator finds widget types with a regex over this file, so register each one in exactly this
 * literal form (one per line, no computed keys, spreads or shorthand):
 *
 *   "analog-name": { Component: Name, check: checkName },
 */
export const ANALOG_WIDGETS: WidgetRegistry = {
  // --- lessons 1–4 (analog-a) ---

  // --- lessons 5–7 (analog-b) ---

  // --- lessons 8–10 (analog-c) ---
};
