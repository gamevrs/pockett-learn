"use client";

/** Shared kit for the GPU widgets: the Hardware path reuses the computer module's controls and the AI module's slider. */
export { Btn, Caption, Field, Note, Readout, Seg, Stepper } from "../computer/ui";
export { Meter, Slider } from "../ai/ui";

/** Second data hue that reads on both themes (checked on dark and light). */
export const ORANGE = "#e8924a";
export const BLUE = "#4fa3df";

/** Compact number: 1,234 / 12.3 k / 4.5 M. */
export function compact(n: number): string {
  if (n >= 1e9) return `${+(n / 1e9).toFixed(2)} G`;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(2)} M`;
  if (n >= 1e4) return `${+(n / 1e3).toFixed(1)} k`;
  return n.toLocaleString("en-US");
}

/** Seconds as a friendly unit. */
export function fmtTime(s: number): string {
  if (s >= 1) return `${+s.toFixed(2)} s`;
  if (s >= 1e-3) return `${+(s * 1e3).toFixed(2)} ms`;
  if (s >= 1e-6) return `${+(s * 1e6).toFixed(2)} µs`;
  return `${+(s * 1e9).toFixed(1)} ns`;
}
