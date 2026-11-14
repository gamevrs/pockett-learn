/**
 * Pure fixed-step transient solver for R, C, L circuits with DC, step, sine and square sources, ideal switches
 * (fixed or switching over time) and the same piecewise-linear diode as solve.ts. No React, no DOM.
 *
 * Method: backward Euler by default. It is first-order accurate (error shrinks in proportion to the step),
 * but it is L-stable: it never rings or overshoots after a step, a square edge or a switch opening, whatever
 * step size a widget picks, and it turns an inductor whose current is suddenly cut into one big (finite)
 * flyback spike instead of an oscillating artefact. At 100 steps per time constant it matches the analytic
 * RC/RL curves to well under 1% (tests: scripts/test-elec-kit.mjs). `method: "trapezoidal"` is offered for
 * steady-state sine work, where it is second-order accurate (better amplitude at fewer steps per period),
 * but it can ring on sharp edges, so widgets that switch or use square waves should keep backward Euler.
 *
 * Companion models (h = step):
 *   capacitor   BE: i = (C/h)(v − v_prev)                 trap: i = (2C/h)(v − v_prev) − i_prev
 *   inductor    BE: v = (L/h)(i − i_prev)                 trap: v = (2L/h)(i − i_prev) − v_prev
 * Each step is a linear DC solve (solve.ts's MNA core), so the same readable errors apply.
 *
 * Sign conventions are solve.ts's (SPICE): every element reports v = V(a) − V(b) and i flowing a→b through it.
 */
import {
  diodeCurrent,
  diodeStamps,
  elementName,
  fail,
  solveStamps,
  solveWithDiodes,
  validateValue,
  type DiodeElement,
  type ElecError,
  type LinearSolution,
  type Stamp,
  type StampOptions,
} from "./solve.ts";

/** A source value over time. A plain number is DC. Times in seconds, phase in degrees. */
export type Waveform =
  | number
  | { kind: "dc"; value: number }
  /** `from` before `at`, `to` from `at` on (at defaults to 0, so a step at t = 0 is already `to` at t = 0) */
  | { kind: "step"; from: number; to: number; at?: number }
  /** offset + amplitude·sin(2π·freq·t + phase) */
  | { kind: "sine"; amplitude: number; freq: number; offset?: number; phase?: number }
  /** `high` for the first `duty` fraction (default 0.5) of each period, `low` otherwise; `low` before `delay` */
  | { kind: "square"; low: number; high: number; freq: number; duty?: number; delay?: number };

export type TranElement =
  | { kind: "R"; id: string; a: string; b: string; ohms: number }
  /** capacitor; `v0` = initial V(a) − V(b) (default 0) */
  | { kind: "C"; id: string; a: string; b: string; farads: number; v0?: number }
  /** inductor; `i0` = initial current a→b (default 0) */
  | { kind: "L"; id: string; a: string; b: string; henries: number; i0?: number }
  | { kind: "V"; id: string; a: string; b: string; volts: Waveform }
  | { kind: "I"; id: string; a: string; b: string; amps: Waveform }
  /** switch: fixed, or a function of time (e.g. `(t) => t >= 1e-3` closes it at 1 ms) */
  | { kind: "S"; id: string; a: string; b: string; closed: boolean | ((t: number) => boolean) }
  | DiodeElement;

export interface TranOptions {
  /** end time, seconds */
  tStop: number;
  /** number of steps (default 1000); the step is tStop / steps */
  steps?: number;
  method?: "backward-euler" | "trapezoidal";
  ground?: string;
  allowFloating?: boolean;
}

export interface TranSolution {
  ok: true;
  /** sample times, steps + 1 of them, t[0] = 0 */
  t: number[];
  /** node voltage traces */
  v: Record<string, number[]>;
  /** per-element traces: v = V(a) − V(b), i = current a→b, p = v·i (absorbed) */
  el: Record<string, { v: number[]; i: number[]; p: number[] }>;
  /** the step used, seconds */
  dt: number;
}

export type TranResult = TranSolution | (ElecError & { at?: number });

/** Value of a waveform at time t. */
export function waveAt(w: Waveform, t: number): number {
  if (typeof w === "number") return w;
  switch (w.kind) {
    case "dc":
      return w.value;
    case "step":
      return t >= (w.at ?? 0) ? w.to : w.from;
    case "sine":
      return (w.offset ?? 0) + w.amplitude * Math.sin(2 * Math.PI * w.freq * t + ((w.phase ?? 0) * Math.PI) / 180);
    case "square": {
      const delay = w.delay ?? 0;
      if (t < delay) return w.low;
      const period = 1 / w.freq;
      const phase = ((t - delay) % period) / period;
      // tiny tolerance so t = k·period lands on the rising edge despite floating-point remainders
      return phase < (w.duty ?? 0.5) - 1e-12 || phase > 1 - 1e-12 ? w.high : w.low;
    }
  }
}

function waveOk(w: Waveform): boolean {
  if (typeof w === "number") return Number.isFinite(w);
  return Object.values(w).every((x) => typeof x === "string" || Number.isFinite(x)) && (!("freq" in w) || w.freq > 0);
}

/** Run a transient simulation from t = 0 to tStop. */
export function simulate(elements: TranElement[], opts: TranOptions): TranResult {
  const ground = opts.ground ?? "gnd";
  const steps = Math.max(1, Math.round(opts.steps ?? 1000));
  const trap = opts.method === "trapezoidal";
  if (!(opts.tStop > 0) || !Number.isFinite(opts.tStop)) return fail("invalid-value", `The simulation needs a positive end time (got ${opts.tStop}).`, []);
  const ids = new Set<string>();
  for (const e of elements) {
    if (ids.has(e.id)) return fail("invalid-value", `Two elements share the id "${e.id}"; every element needs its own id.`, [e.id]);
    ids.add(e.id);
    const bad =
      e.kind === "R" ? validateValue(e.id, "R", e.ohms, "resistance", true)
      : e.kind === "C" ? validateValue(e.id, "C", e.farads, "capacitance", true) ?? validateValue(e.id, "C", e.v0, "starting voltage", false)
      : e.kind === "L" ? validateValue(e.id, "L", e.henries, "inductance", true) ?? validateValue(e.id, "L", e.i0, "starting current", false)
      : e.kind === "D" ? validateValue(e.id, "D", e.vf, "forward drop", false) ?? validateValue(e.id, "D", e.ron, "on-resistance", true)
      : null;
    if (bad) return bad;
    if ((e.kind === "V" && !waveOk(e.volts)) || (e.kind === "I" && !waveOk(e.amps))) {
      return fail("invalid-value", `${tranName(e.kind, e.id)} has a waveform with a missing or invalid number (frequencies must be positive).`, [e.id]);
    }
  }
  const names: Record<string, string> = {};
  for (const e of elements) names[e.id] = tranName(e.kind, e.id);
  const so: StampOptions = { ground, allowFloating: !!opts.allowFloating, names, extraNodes: elements.flatMap((e) => [e.a, e.b]) };
  const diodes = elements.filter((e): e is DiodeElement => e.kind === "D");

  // state carried between steps
  const vC: Record<string, number> = {};
  const iC: Record<string, number> = {};
  const iL: Record<string, number> = {};
  const vL: Record<string, number> = {};
  for (const e of elements) {
    if (e.kind === "C") {
      vC[e.id] = e.v0 ?? 0;
      iC[e.id] = 0;
    } else if (e.kind === "L") {
      iL[e.id] = e.i0 ?? 0;
      vL[e.id] = 0;
    }
  }
  let on: Record<string, boolean> = {};

  const dt = opts.tStop / steps;
  const isClosed = (e: Extract<TranElement, { kind: "S" }>, t: number) => (typeof e.closed === "function" ? e.closed(t) : e.closed);

  /** stamps for one step ending at time t with step h; `useTrap` selects the companion */
  const build = (t: number, h: number, useTrap: boolean) => (dOn: Record<string, boolean>) =>
    elements.flatMap((e): Stamp[] => {
      switch (e.kind) {
        case "R":
          return [{ t: "G", a: e.a, b: e.b, g: 1 / e.ohms, owner: e.id }];
        case "C": {
          const g = (useTrap ? 2 : 1) * (e.farads / h);
          // i = g(v − v_prev) − (trap ? i_prev : 0)  →  G plus a source pushing g·v_prev (+ i_prev) from b to a
          const j = g * vC[e.id] + (useTrap ? iC[e.id] : 0);
          return [
            { t: "G", a: e.a, b: e.b, g, owner: e.id },
            { t: "J", a: e.b, b: e.a, i: j, owner: e.id },
          ];
        }
        case "L": {
          const r = (useTrap ? 2 : 1) * (e.henries / h);
          // v − r·i = −r·i_prev (− v_prev for trap)
          return [{ t: "E", a: e.a, b: e.b, v: -r * iL[e.id] - (useTrap ? vL[e.id] : 0), r, owner: e.id, role: "other" }];
        }
        case "V":
          return [{ t: "E", a: e.a, b: e.b, v: waveAt(e.volts, t), r: 0, owner: e.id, role: "source" }];
        case "I":
          return [{ t: "J", a: e.a, b: e.b, i: waveAt(e.amps, t), owner: e.id }];
        case "S":
          return isClosed(e, t) ? [{ t: "E", a: e.a, b: e.b, v: 0, r: 0, owner: e.id, role: "switch" }] : [];
        case "D":
          return diodeStamps(e, dOn[e.id]);
      }
    });

  const solveAt = (t: number, h: number, useTrap: boolean): { sol: LinearSolution; on: Record<string, boolean> } | ElecError => {
    const b = build(t, h, useTrap);
    if (diodes.length) return solveWithDiodes(b, diodes, so, on);
    const sol = solveStamps(b({}), so);
    return sol.ok ? { sol, on } : sol;
  };

  const tOut: number[] = [];
  const vOut: Record<string, number[]> = {};
  const elOut: Record<string, { v: number[]; i: number[]; p: number[] }> = {};
  for (const e of elements) elOut[e.id] = { v: [], i: [], p: [] };

  /** after a solve: read every element, update the state, record a sample */
  const commit = (t: number, h: number, useTrap: boolean, sol: LinearSolution, dOn: Record<string, boolean>) => {
    tOut.push(t);
    for (const [n, x] of Object.entries(sol.v)) (vOut[n] ??= []).push(x);
    for (const e of elements) {
      const v = sol.v[e.a] - sol.v[e.b];
      let i = 0;
      switch (e.kind) {
        case "R":
          i = v / e.ohms;
          break;
        case "C": {
          const g = (useTrap ? 2 : 1) * (e.farads / h);
          i = g * (v - vC[e.id]) - (useTrap ? iC[e.id] : 0);
          vC[e.id] = v;
          iC[e.id] = i;
          break;
        }
        case "L":
          i = sol.branch[e.id];
          iL[e.id] = i;
          vL[e.id] = v;
          break;
        case "V":
        case "S":
          i = sol.branch[e.id] ?? 0;
          break;
        case "I":
          i = waveAt(e.amps, t);
          break;
        case "D":
          i = diodeCurrent(e, dOn[e.id], v);
          break;
      }
      const o = elOut[e.id];
      o.v.push(v);
      o.i.push(i);
      o.p.push(e.kind === "S" ? 0 : v * i);
    }
  };

  // t = 0: an infinitesimal backward-Euler step, so capacitors hold their starting voltage and inductors their
  // starting current while everything else (resistor currents, node voltages) takes its consistent value.
  // A capacitor wired straight across a source jumps to the source's voltage, as an ideal one would.
  const h0 = dt * 1e-6;
  const first = solveAt(0, h0, false);
  if ("error" in first) return { ...first, at: 0 };
  on = first.on;
  commit(0, h0, false, first.sol, first.on);

  for (let k = 1; k <= steps; k++) {
    const t = k * dt;
    const r = solveAt(t, dt, trap);
    if ("error" in r) return { ...r, at: t };
    on = r.on;
    commit(t, dt, trap, r.sol, r.on);
  }
  return { ok: true, t: tOut, v: vOut, el: elOut, dt };
}

function tranName(kind: TranElement["kind"], id: string) {
  if (kind === "C") return `capacitor "${id}"`;
  if (kind === "L") return `inductor "${id}"`;
  return elementName(kind, id);
}

/** Largest |value| over the samples with t ≥ from (e.g. the steady-state amplitude of a sine). */
export function peakAfter(res: TranSolution, trace: number[], from: number): number {
  let m = 0;
  for (let k = 0; k < res.t.length; k++) if (res.t[k] >= from) m = Math.max(m, Math.abs(trace[k]));
  return m;
}

/** Linear interpolation of a trace at time t. */
export function sampleAt(res: TranSolution, trace: number[], t: number): number {
  const k = Math.min(res.t.length - 2, Math.max(0, Math.floor(t / res.dt)));
  const f = (t - res.t[k]) / res.dt;
  return trace[k] + (trace[k + 1] - trace[k]) * Math.min(1, Math.max(0, f));
}
