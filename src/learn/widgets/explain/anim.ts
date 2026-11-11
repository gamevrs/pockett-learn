/** Small animation helpers for explainer scenes. Every scene is a pure function of progress t in 0..1. */

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Progress of t inside the window [a, b], clamped to 0..1. */
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

/** Smooth start and stop. */
export const ease = (u: number) => u * u * (3 - 2 * u);

export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

// rounded so the server and the browser print identical numbers (Math.sin can differ in the last digit)
export const r2 = (v: number) => Math.round(v * 100) / 100;
