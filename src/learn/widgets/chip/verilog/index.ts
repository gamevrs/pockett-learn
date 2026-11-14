import { elaborate } from "./elab.ts";
import { simulate } from "./sim.ts";
import type { Design, Diag, Stimulus, Trace } from "./types.ts";

export { simulate, MAX_STEPS } from "./sim.ts";
export type { Design, Diag, Stimulus, Trace, Signal, SigKind } from "./types.ts";

export type CompileResult = { ok: true; design: Design; warnings: Diag[] } | { ok: false; errors: Diag[] };

/** Parse and check a Verilog source. Never throws. */
export function compile(src: string): CompileResult {
  try {
    const warnings: Diag[] = [];
    const r = elaborate(String(src ?? ""), warnings);
    if (!r.design || r.errors.length) return { ok: false, errors: r.errors.length ? r.errors : [{ line: 1, message: "couldn't compile this design." }] };
    return { ok: true, design: r.design, warnings: warnings.sort((a, b) => a.line - b.line) };
  } catch (e) {
    return { ok: false, errors: [{ line: 1, message: `internal error: ${e instanceof Error ? e.message : String(e)}` }] };
  }
}

export type RunResult = { ok: true; design: Design; trace: Trace; warnings: Diag[] } | { ok: false; errors: Diag[] };

/** compile + simulate in one call. */
export function runVerilog(src: string, stim: Stimulus): RunResult {
  const c = compile(src);
  if (!c.ok) return c;
  const r = simulate(c.design, stim);
  if (!r.ok) return r;
  return { ok: true, design: c.design, trace: r.trace, warnings: c.warnings };
}

export interface Mismatch {
  signal: string;
  step: number;
  got: number | null;
  want: number;
}

/** Compare per-step sampled values with the expected ones: `trace.values` (just after the edge, the default) or `trace.pre` (just before it, for Mealy-style outputs). The earliest differing step wins. */
export function compareTrace(trace: Pick<Trace, "values" | "pre">, expect: Record<string, number[]>, sample: "post" | "pre" = "post"): { ok: boolean; firstMismatch?: Mismatch } {
  let best: Mismatch | undefined;
  for (const [sig, want] of Object.entries(expect)) {
    const got = (sample === "pre" ? trace.pre : trace.values)[sig];
    if (!got) {
      const m = { signal: sig, step: 0, got: null, want: want[0] ?? 0 };
      if (!best || m.step < best.step) best = m;
      continue;
    }
    for (let i = 0; i < want.length; i++) {
      const g = i < got.length ? got[i] : null;
      if (g !== want[i]) {
        if (!best || i < best.step) best = { signal: sig, step: i, got: g, want: want[i] };
        break;
      }
    }
  }
  return best ? { ok: false, firstMismatch: best } : { ok: true };
}

export type Radix = "hex" | "dec" | "bin";

/** hex: uppercase digits padded to the width (no prefix); bin: padded to the width; dec: plain. */
export function formatValue(v: number, width: number, radix: Radix): string {
  const u = v >>> 0;
  if (radix === "dec") return String(u);
  if (radix === "hex") return u.toString(16).toUpperCase().padStart(Math.ceil(width / 4), "0");
  return u.toString(2).padStart(width, "0");
}

/** A stimulus for designs the lesson gave none: inputs count up in binary over 8 steps (clocked designs get their first posedge input as the clock). */
export function defaultStimulus(design: Design, steps = 8): Stimulus {
  const ins = design.signals.filter((s) => s.kind === "input" && s.name !== design.clock);
  const out: Record<string, number>[] = [];
  for (let i = 0; i < steps; i++) {
    const row: Record<string, number> = {};
    let off = 0;
    for (const s of ins) {
      row[s.name] = Math.floor(i / 2 ** off) % 2 ** Math.min(s.width, 31);
      off += s.width;
    }
    out.push(row);
  }
  return { clock: design.clock, steps: out };
}

/** "Line 3: message" */
export function formatDiag(d: Diag): string {
  return d.line > 0 ? `Line ${d.line}: ${d.message}` : d.message;
}
