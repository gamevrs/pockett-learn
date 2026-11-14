/**
 * Pure model behind chip-scan: four scan flops feeding a six-net combinational block, with an optional stuck-at fault.
 * Q0..Q3 are the flop outputs (the scan chain runs SI -> Q0 -> Q1 -> Q2 -> Q3 -> SO). No React.
 *
 *   n1 = Q0 AND Q1        n4 = NAND(Q1, Q2)      n6 = n2 AND n4
 *   n2 = Q2 XOR Q3        n5 = n1 XOR n4
 *   n3 = n1 OR n2         D0 = n3, D1 = n4, D2 = n5, D3 = n6
 */

export const NETS = ["n1", "n2", "n3", "n4", "n5", "n6"] as const;
export type NetId = (typeof NETS)[number];
export interface Fault {
  net: NetId;
  value: 0 | 1;
}

export const ALL_FAULTS: Fault[] = NETS.flatMap((net) => [{ net, value: 0 as const }, { net, value: 1 as const }]);

/** Bits as [Q0, Q1, Q2, Q3]. Returns the values captured into the flops (D0..D3) with an optional stuck net. */
export function captureOf(q: number[], fault?: Fault | null): number[] {
  const f = (name: NetId, v: number) => (fault && fault.net === name ? fault.value : v);
  const n1 = f("n1", q[0] & q[1]);
  const n2 = f("n2", q[2] ^ q[3]);
  const n3 = f("n3", n1 | n2);
  const n4 = f("n4", 1 - (q[1] & q[2]));
  const n5 = f("n5", n1 ^ n4);
  const n6 = f("n6", n2 & n4);
  return [n3, n4, n5, n6];
}

export const patternBits = (p: number): number[] => [(p >> 3) & 1, (p >> 2) & 1, (p >> 1) & 1, p & 1];
export const patternStr = (bits: number[]) => bits.join("");

/** Pattern 0..15 as a string "Q0Q1Q2Q3". */
export function expectedResponse(p: number): string {
  return patternStr(captureOf(patternBits(p)));
}

export function observedResponse(p: number, fault?: Fault | null): string {
  return patternStr(captureOf(patternBits(p), fault));
}

export const sameFault = (a: Fault | undefined | null, b: Fault | undefined | null) => !!a && !!b && a.net === b.net && a.value === b.value;

/** Faults whose responses match what was observed for every pattern applied so far. */
export function consistentFaults(history: { pattern: number; observed: string }[]): Fault[] {
  return ALL_FAULTS.filter((f) => history.every((h) => observedResponse(h.pattern, f) === h.observed));
}

/** Fraction of the 12 modelled faults that at least one of these patterns exposes. */
export function faultCoverage(patterns: number[]): { detected: number; total: number } {
  const detected = ALL_FAULTS.filter((f) => patterns.some((p) => observedResponse(p, f) !== expectedResponse(p))).length;
  return { detected, total: ALL_FAULTS.length };
}

/** A tiny ATPG: the pattern that splits the still-possible faults into the most distinct responses (ties: lowest). */
export function suggestPattern(history: { pattern: number; observed: string }[]): number {
  const cands = consistentFaults(history);
  let best = 0;
  let bestScore = -1;
  for (let p = 0; p < 16; p++) {
    const kinds = new Set(cands.map((f) => observedResponse(p, f)));
    kinds.add(expectedResponse(p));
    if (kinds.size > bestScore) {
      bestScore = kinds.size;
      best = p;
    }
  }
  return best;
}

/** Deterministic pick from a seed. */
export function faultFromSeed(seed: number): Fault {
  const i = ((Math.imul(seed | 0, 0x9e3779b1) >>> 0) >>> 8) % ALL_FAULTS.length;
  return ALL_FAULTS[i];
}

const isFault = (f: unknown): f is Fault => {
  const x = f as Fault | undefined;
  return !!x && (NETS as readonly string[]).includes(x.net) && (x.value === 0 || x.value === 1);
};

/**
 * goal: { fault: {net, value}, findFault: true } (guessed net and value must match the fault, after at least one pattern was applied)
 *       or { detect: true } (at least one mismatching pattern was observed).
 */
export function checkScan(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as { patternsApplied?: number; mismatches?: number; guessed?: string; guessedValue?: number } | undefined;
  if (!s) return false;
  let any = false;
  if (goal.detect === true) {
    any = true;
    if (!((s.mismatches ?? 0) >= 1)) return false;
  }
  if (goal.findFault === true) {
    any = true;
    if (!isFault(goal.fault)) return false;
    if (!((s.patternsApplied ?? 0) >= 1)) return false;
    if (s.guessed !== goal.fault.net || s.guessedValue !== goal.fault.value) return false;
  }
  return any;
}
