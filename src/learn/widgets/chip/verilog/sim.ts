import { exec, writeBits, type Pending } from "./eval.ts";
import type { Design, Diag, SeqBlock, Stimulus, Trace } from "./types.ts";

/**
 * Cycle-based simulator for the toy Verilog subset (2-state: every signal is 0 or 1, all regs start at 0).
 *
 * One stimulus step is one clock cycle. For a clocked design (stimulus names a clock input) a step does:
 *
 *   1. The clock is low. Apply this step's inputs (missing inputs keep their previous value; start 0).
 *      If an input that is an edge trigger other than the clock changed (e.g. async `posedge rst`), the blocks it
 *      triggers run now.
 *   2. Settle the combinational logic (assigns and `always @*`, run once each in dependency order).
 *   3. SAMPLE "pre": inputs for this cycle, combinational outputs reacting to them, registers still holding the
 *      value from the previous edge.
 *   4. Rising clock edge: every `posedge clk` block runs in source order. Blocking `=` updates at once (visible to
 *      later statements and later blocks, as in a real simulator, where this is a race); non-blocking `<=` samples
 *      its right side right now and the writes are applied together after all blocks have run.
 *   5. Settle the combinational logic again.
 *   6. SAMPLE "values": this is the per-cycle value used by `traces` and checks, "just after the rising edge has
 *      settled". A counter that starts at 0 therefore reads 1, 2, 3, ... after edges 1, 2, 3 (the clock reads 1).
 *   7. Clock falls; `negedge clk` blocks (if any) run and logic settles, ready for the next step.
 *
 * Waveform drawing: each cycle is a low half (the "pre" values) then a high half (the "values"): registers change
 * right after the rising edge, inputs and the logic they feed change at the start of the cycle.
 *
 * A combinational-only design (no clock) applies the inputs, settles, and samples once ("pre" equals "values").
 * Combinational nodes are sorted at compile time so one pass settles them; loops are rejected there.
 */

export const MAX_STEPS = 2000;

export function simulate(design: Design, stim: Stimulus, opts?: { maxSteps?: number }): { ok: true; trace: Trace; warnings: Diag[] } | { ok: false; errors: Diag[] } {
  try {
    return simulateInner(design, stim, opts?.maxSteps ?? MAX_STEPS);
  } catch (e) {
    return { ok: false, errors: [{ line: 0, message: `simulation failed: ${e instanceof Error ? e.message : String(e)}` }] };
  }
}

function simulateInner(design: Design, stim: Stimulus, maxSteps: number): { ok: true; trace: Trace; warnings: Diag[] } | { ok: false; errors: Diag[] } {
  const sigs = design.signals;
  const idx = new Map(sigs.map((s, i) => [s.name, i]));
  const fail = (message: string): { ok: false; errors: Diag[] } => ({ ok: false, errors: [{ line: 0, message }] });

  if (!stim || !Array.isArray(stim.steps)) return fail("the stimulus has no steps.");
  if (stim.steps.length > maxSteps) return fail(`too many steps (${stim.steps.length}); the limit is ${maxSteps}.`);

  let clk = -1;
  if (stim.clock !== undefined) {
    const c = idx.get(stim.clock);
    if (c === undefined || sigs[c].kind !== "input") return fail(`the clock \`${stim.clock}\` isn't an input of this module.`);
    clk = c;
  } else if (design.seq.length) {
    return fail("this design has clocked logic (`always @(posedge ...)`) but the stimulus names no clock.");
  }
  for (const step of stim.steps) {
    for (const k of Object.keys(step)) {
      if (k === stim.clock) continue;
      const i = idx.get(k);
      if (i === undefined) return fail(`the stimulus drives \`${k}\`, which isn't a signal in this module.`);
      if (sigs[i].kind !== "input") return fail(`the stimulus drives \`${k}\`, which isn't an input (only inputs can be set).`);
    }
  }

  const vals = new Array<number>(sigs.length).fill(0);
  const settle = () => {
    for (const n of design.comb) exec(n.body, vals, null);
  };
  const runBlocks = (blocks: SeqBlock[]) => {
    if (!blocks.length) return;
    const nba: Pending[] = [];
    for (const b of blocks) exec(b.body, vals, nba);
    for (const p of nba) writeBits(vals, p.s, p.lo, p.w, p.v);
  };
  const edgeBlocks = (sig: number, edge: "pos" | "neg") => design.seq.filter((b) => b.triggers.some((t) => t.sig === sig && t.edge === edge));

  const values: Record<string, number[]> = {};
  const pre: Record<string, number[]> = {};
  for (const s of sigs) {
    values[s.name] = [];
    pre[s.name] = [];
  }
  const sample = (into: Record<string, number[]>) => sigs.forEach((s, i) => into[s.name].push(vals[i]));
  const hasNeg = clk >= 0 && edgeBlocks(clk, "neg").length > 0;

  settle(); // so e.g. `assign y = ~a;` is right before the first step

  for (const step of stim.steps) {
    if (clk >= 0) vals[clk] = 0;
    const old = vals.slice();
    for (const [k, v] of Object.entries(step)) {
      if (k === stim.clock) continue;
      const i = idx.get(k)!;
      vals[i] = Number.isFinite(v) ? (sigs[i].width >= 32 ? v >>> 0 : (v & (2 ** sigs[i].width - 1)) >>> 0) : 0;
    }
    // edges on other input triggers (async reset style)
    const fired = new Set<SeqBlock>();
    for (const b of design.seq) {
      for (const t of b.triggers) {
        if (t.sig === clk) continue;
        const was = old[t.sig] & 1;
        const now = vals[t.sig] & 1;
        if ((t.edge === "pos" && !was && now) || (t.edge === "neg" && was && !now)) fired.add(b);
      }
    }
    if (fired.size) {
      settle();
      runBlocks(design.seq.filter((b) => fired.has(b)));
    }
    settle();
    sample(pre);
    if (clk >= 0) {
      vals[clk] = 1;
      runBlocks(edgeBlocks(clk, "pos"));
      settle();
      sample(values);
      vals[clk] = 0;
      if (hasNeg) {
        runBlocks(edgeBlocks(clk, "neg"));
        settle();
      }
    } else {
      sample(values);
    }
  }

  return {
    ok: true,
    warnings: [],
    trace: { signals: sigs.map((s) => ({ name: s.name, width: s.width, kind: s.kind })), values, pre, clock: stim.clock },
  };
}
