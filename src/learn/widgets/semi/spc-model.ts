// Pure logic for the semi-spc widget: Western Electric rules on a hardcoded control chart. No UI imports.

export const SPC_TARGET_NM = 20;
export const SPC_SIGMA_NM = 0.4;
export const SPC_MAX = 30;

/** z-scores (in sigma) of the hardcoded lots. */
export const SERIES = {
  // 20 lots; lot 12 is the +3.4 sigma spike
  spike: [0.4, -0.7, 0.9, -0.3, 1.2, -1.1, 0.2, -0.5, 0.8, -1.4, 0.6, 3.4, -0.4, 1.0, -0.9, 0.3, -0.6, 1.3, -0.2, 0.5],
  // 30 lots; noise to lot 16, drift from lot 17
  drift: [
    0.3, -0.6, 0.8, -0.2, 1.1, -0.9, 0.4, -1.2, 0.7, -0.4, 1.0, -0.8, 0.2, -0.5, 0.9, -0.7,
    0.6, 0.9, 0.4, 1.2, 0.7, 1.5, 0.8, 1.1,
    1.9, 2.4, 1.7, 3.3, 2.6, 3.1,
  ],
};

export const RULES = [
  { id: 1, text: "one point beyond 3σ" },
  { id: 2, text: "2 of 3 in a row beyond 2σ, same side" },
  { id: 3, text: "4 of 5 in a row beyond 1σ, same side" },
  { id: 4, text: "8 in a row on one side of the centre line" },
];

export function nm(z: number): number {
  return SPC_TARGET_NM + SPC_SIGMA_NM * z;
}

/** Does the point at 0-based index i (the last of a window) complete a violation of rule r? */
export function violates(z: number[], i: number, r: number): boolean {
  if (r === 1) return Math.abs(z[i]) > 3;
  const win = (n: number) => (i - n + 1 >= 0 ? z.slice(i - n + 1, i + 1) : null);
  if (r === 2) {
    const w = win(3);
    return !!w && [1, -1].some((s) => w.filter((v) => v * s > 2).length >= 2 && z[i] * s > 2);
  }
  if (r === 3) {
    const w = win(5);
    return !!w && [1, -1].some((s) => w.filter((v) => v * s > 1).length >= 4 && z[i] * s > 1);
  }
  if (r === 4) {
    const w = win(8);
    return !!w && (w.every((v) => v > 0) || w.every((v) => v < 0));
  }
  return false;
}

/** Rule numbers broken at each lot (0-based array of arrays). */
export function violationsAt(z: number[]): number[][] {
  return z.map((_, i) => [1, 2, 3, 4].filter((r) => violates(z, i, r)));
}

/** First lot (1-based) completing rule r, or null. */
export function firstOfRule(z: number[], r: number): number | null {
  for (let i = 0; i < z.length; i++) if (violates(z, i, r)) return i + 1;
  return null;
}

export function firstByRule(z: number[]): Record<number, number | null> {
  return { 1: firstOfRule(z, 1), 2: firstOfRule(z, 2), 3: firstOfRule(z, 3), 4: firstOfRule(z, 4) };
}

/** Earliest lot (1-based) breaking any rule, or null. */
export function firstViolation(z: number[]): number | null {
  const f = Object.values(firstByRule(z)).filter((v): v is number => v != null);
  return f.length ? Math.min(...f) : null;
}
