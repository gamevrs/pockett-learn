/**
 * Pure toy model behind chip-coverage: functional-coverage bins for an 8-bit ALU, seeded constrained-random vectors,
 * directed vectors, and an exhaustive "formal" check of a 4-bit saturating adder. No React.
 */

export const OPS = ["add", "sub", "and", "xor"] as const;
export type Op = (typeof OPS)[number];
export const OP_LABEL: Record<Op, string> = { add: "ADD", sub: "SUB", and: "AND", xor: "XOR" };

export const CLASSES = ["zero", "small", "mid", "large", "max"] as const;
export type Cls = (typeof CLASSES)[number];
export const CLASS_HELP: Record<Cls, string> = {
  zero: "an operand is 0",
  small: "both operands 1 to 15",
  mid: "everything else",
  large: "both operands 240 to 254",
  max: "an operand is 255",
};

/** Cross bins: corner cases of one operation. */
export const CROSS_BINS = ["add:carry", "add:wrap0", "sub:borrow", "sub:equal", "xor:equal"] as const;
export const CROSS_HELP: Record<string, string> = {
  "add:carry": "ADD whose sum overflows 8 bits (carry out = 1)",
  "add:wrap0": "ADD that wraps to exactly 0 (a + b = 256)",
  "sub:borrow": "SUB with a < b (borrow)",
  "sub:equal": "SUB of two equal operands (result 0)",
  "xor:equal": "XOR of two equal operands (result 0)",
};

export const ALL_BINS: string[] = [...OPS.flatMap((o) => CLASSES.map((c) => `${o}:${c}`)), ...CROSS_BINS];
export const TOTAL_BINS = ALL_BINS.length;

export interface Vec {
  op: Op;
  a: number;
  b: number;
}

function classOf(a: number, b: number): Cls {
  if (a === 0 || b === 0) return "zero";
  if (a === 255 || b === 255) return "max";
  if (a <= 15 && b <= 15) return "small";
  if (a >= 240 && b >= 240) return "large";
  return "mid";
}

/** Every bin this vector lands in. */
export function binsOf(v: Vec): string[] {
  const out = [`${v.op}:${classOf(v.a, v.b)}`];
  if (v.op === "add" && v.a + v.b > 255) out.push("add:carry");
  if (v.op === "add" && v.a + v.b === 256) out.push("add:wrap0");
  if (v.op === "sub" && v.a < v.b) out.push("sub:borrow");
  if (v.op === "sub" && v.a === v.b) out.push("sub:equal");
  if (v.op === "xor" && v.a === v.b) out.push("xor:equal");
  return out;
}

/** What the DUT computes: result and a flag (carry for ADD, borrow for SUB). */
export function aluRun(v: Vec): { result: number; flag: boolean } {
  switch (v.op) {
    case "add":
      return { result: (v.a + v.b) & 255, flag: v.a + v.b > 255 };
    case "sub":
      return { result: (v.a - v.b) & 255, flag: v.a < v.b };
    case "and":
      return { result: v.a & v.b, flag: false };
    default:
      return { result: v.a ^ v.b, flag: false };
  }
}

/** One vector per bin that a hand-written (directed) test would use. */
export function directedVector(bin: string): Vec | null {
  const table: Record<string, [number, number]> = {
    zero: [0, 37],
    small: [3, 9],
    mid: [100, 50],
    large: [250, 245],
    max: [255, 3],
    "add:carry": [200, 100],
    "add:wrap0": [200, 56],
    "sub:borrow": [50, 200],
    "sub:equal": [77, 77],
    "xor:equal": [77, 77],
  };
  const [op, rest] = bin.split(":") as [Op, string];
  if (!OPS.includes(op)) return null;
  const e = table[bin] ?? table[rest];
  return e ? { op, a: e[0], b: e[1] } : null;
}

// ───────────── seeded random vectors ─────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CORNERS = [0, 1, 15, 128, 240, 254, 255];

/** The i-th random vector of a seeded stream. Pure: the same (seed, i, biased) always gives the same vector. */
export function randomVector(seed: number, i: number, biased: boolean): Vec {
  const r = mulberry32((Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(i + 1, 0x85ebca6b)) >>> 0);
  r();
  const op = OPS[Math.floor(r() * 4)];
  const pick = () => (biased && r() < 0.35 ? CORNERS[Math.floor(r() * CORNERS.length)] : Math.floor(r() * 256));
  const a = pick();
  let b = pick();
  if (biased && r() < 0.12) b = a;
  return { op, a, b };
}

/** Coverage as a fraction after random vectors 0..n-1 (helper for tests and "tests to reach" tables). */
export function testsToReach(seed: number, biased: boolean, target: number, max = 100000): number {
  const hit = new Set<string>();
  for (let i = 0; i < max; i++) {
    for (const b of binsOf(randomVector(seed, i, biased))) hit.add(b);
    if (hit.size / TOTAL_BINS >= target) return i + 1;
  }
  return Infinity;
}

// ───────────── formal ─────────────

/** 4-bit saturating adder. With `bug` the saturation test is off by one (compares the sum with 16, not 15). */
export function satAdd(a: number, b: number, bug: boolean): number {
  const s = a + b;
  return s > (bug ? 16 : 15) ? 15 : s & 15;
}

/** Property: the saturating sum is never smaller than either operand. */
export const FORMAL_PROPERTY = "sat_add(a, b) >= a and sat_add(a, b) >= b";

export interface FormalResult {
  checked: number;
  failures: number;
  first?: { a: number; b: number; out: number };
}

/** Exhaustive check over all 2^8 = 256 input pairs. */
export function formalCheck(bug: boolean): FormalResult {
  let failures = 0;
  let first: FormalResult["first"];
  for (let a = 0; a < 16; a++)
    for (let b = 0; b < 16; b++) {
      const out = satAdd(a, b, bug);
      if (out < a || out < b) {
        failures++;
        first ??= { a, b, out };
      }
    }
  return { checked: 256, failures, first };
}

// ───────────── check ─────────────

/** goal: { minCoverage?: 0..1, maxTests?: n, formalRun?: true }. Coverage is recomputed from binsHit. */
export function checkCoverage(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as { binsHit?: unknown; testsRun?: unknown; formalRun?: unknown } | undefined;
  if (!s || !Array.isArray(s.binsHit)) return false;
  let any = false;
  if (typeof goal.minCoverage === "number") {
    any = true;
    const valid = new Set((s.binsHit as unknown[]).filter((b): b is string => typeof b === "string" && ALL_BINS.includes(b)));
    if (valid.size / TOTAL_BINS < goal.minCoverage - 1e-9) return false;
  }
  if (typeof goal.maxTests === "number") {
    any = true;
    if (typeof s.testsRun !== "number" || s.testsRun > goal.maxTests) return false;
  }
  if (goal.formalRun === true) {
    any = true;
    if (s.formalRun !== true) return false;
  }
  return any;
}
