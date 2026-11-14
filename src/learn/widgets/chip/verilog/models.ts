/**
 * Reference ("golden") models for the self-checking testbench widget. Pure; no UI.
 *
 * A model names its input and output ports (with widths). The DUT under test must have ports of the same names.
 * Combinational models are a function of the inputs only. Clocked models keep a state number: each test vector is
 * one clock cycle, applied in order starting from the all-zero reset state, and the model output is what a correct
 * design shows just after that cycle's rising edge (the same sampling point as the simulator's `values`).
 */

export interface PortDef {
  name: string;
  width: number;
}

export interface ModelDef {
  key: string;
  label: string;
  /** One-line description for the UI. */
  blurb: string;
  inputs: PortDef[];
  outputs: PortDef[];
  /** Name of the clock input when the model is clocked. */
  clock?: string;
  /** (inputs, state) -> (outputs, next state). Combinational models ignore `state`. */
  step: (inp: Record<string, number>, state: number) => { out: Record<string, number>; state: number };
}

const comb = (f: (i: Record<string, number>) => Record<string, number>) => (inp: Record<string, number>, state: number) => ({ out: f(inp), state });

export const MODELS: Record<string, ModelDef> = {
  adder4: {
    key: "adder4",
    label: "4-bit adder with carry",
    blurb: "sum = (a + b + cin) mod 16, cout = the carry out of bit 3",
    inputs: [{ name: "a", width: 4 }, { name: "b", width: 4 }, { name: "cin", width: 1 }],
    outputs: [{ name: "sum", width: 4 }, { name: "cout", width: 1 }],
    step: comb((i) => {
      const t = i.a + i.b + i.cin;
      return { sum: t & 15, cout: t >> 4 };
    }),
  },
  mux2: {
    key: "mux2",
    label: "2:1 multiplexer (4 bits wide)",
    blurb: "y = b when sel is 1, otherwise a",
    inputs: [{ name: "a", width: 4 }, { name: "b", width: 4 }, { name: "sel", width: 1 }],
    outputs: [{ name: "y", width: 4 }],
    step: comb((i) => ({ y: i.sel ? i.b : i.a })),
  },
  max2: {
    key: "max2",
    label: "maximum of two 4-bit numbers",
    blurb: "y = the larger of a and b",
    inputs: [{ name: "a", width: 4 }, { name: "b", width: 4 }],
    outputs: [{ name: "y", width: 4 }],
    step: comb((i) => ({ y: Math.max(i.a, i.b) })),
  },
  parity4: {
    key: "parity4",
    label: "4-bit even-parity generator",
    blurb: "p = 1 when an odd number of the bits of a are 1 (so a plus p always has an even number of 1s)",
    inputs: [{ name: "a", width: 4 }],
    outputs: [{ name: "p", width: 1 }],
    step: comb((i) => ({ p: (i.a ^ (i.a >> 1) ^ (i.a >> 2) ^ (i.a >> 3)) & 1 })),
  },
  cmp4: {
    key: "cmp4",
    label: "4-bit comparator",
    blurb: "lt = a < b, eq = a == b, gt = a > b",
    inputs: [{ name: "a", width: 4 }, { name: "b", width: 4 }],
    outputs: [{ name: "lt", width: 1 }, { name: "eq", width: 1 }, { name: "gt", width: 1 }],
    step: comb((i) => ({ lt: i.a < i.b ? 1 : 0, eq: i.a === i.b ? 1 : 0, gt: i.a > i.b ? 1 : 0 })),
  },
  counter4: {
    key: "counter4",
    label: "4-bit counter with synchronous reset and enable",
    blurb: "q goes up by 1 each clock edge while en is 1, wraps from 15 to 0, and rst (checked at the edge) sets it to 0",
    inputs: [{ name: "rst", width: 1 }, { name: "en", width: 1 }],
    outputs: [{ name: "q", width: 4 }],
    clock: "clk",
    step: (i, s) => {
      const q = i.rst ? 0 : i.en ? (s + 1) & 15 : s;
      return { out: { q }, state: q };
    },
  },
};

/** Run a model over a list of vectors (one per cycle for clocked models). */
export function runModel(m: ModelDef, vectors: Record<string, number>[]): Record<string, number>[] {
  let s = 0;
  return vectors.map((v) => {
    const full: Record<string, number> = {};
    for (const p of m.inputs) full[p.name] = (v[p.name] ?? 0) & (2 ** p.width - 1);
    const r = m.step(full, s);
    s = r.state;
    return r.out;
  });
}

/** Small deterministic PRNG (mulberry32) so "random" vectors are reproducible. Returns floats in [0, 1). */
export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `n` random vectors for a model's inputs (constrained to each port's width). */
export function randomVectors(m: ModelDef, n: number, seed: number): Record<string, number>[] {
  const r = prng(seed);
  return Array.from({ length: n }, () => Object.fromEntries(m.inputs.map((p) => [p.name, Math.floor(r() * 2 ** p.width)])));
}
