/**
 * Pure logic for the digital-logic widgets: switch-level CMOS, gate networks, latches, flip-flops, registers,
 * counters, state machines, timing and metastability maths, button bounce. No React, so it runs in Node too.
 * Every model here is a deliberately simple toy (ideal switches, no analogue effects) and the widgets say so.
 */

export type Bit = 0 | 1;

// ───────────────────────────── CMOS at switch level ─────────────────────────────

/** Typical-looking numbers for the toy inverter: a 3.3 V supply and thresholds of 0.7 V (illustrative, not a real process). */
export const VDD = 3.3;
export const VT = 0.7;

export interface InverterState {
  vin: number;
  /** NMOS conducts when the gate is more than Vt above the source (ground). */
  nOn: boolean;
  /** PMOS conducts when the gate is more than Vt below the source (VDD). */
  pOn: boolean;
  /** 1 or 0 when exactly one device conducts; null when both do (briefly, mid-switch) or neither. */
  out: Bit | null;
  /** Both on: a current path straight from VDD to ground. */
  shootThrough: boolean;
}

export function inverterAt(vin: number): InverterState {
  const nOn = vin > VT;
  const pOn = vin < VDD - VT;
  const out: Bit | null = pOn && !nOn ? 1 : nOn && !pOn ? 0 : null;
  return { vin, nOn, pOn, out, shootThrough: nOn && pOn };
}

export type Network = "series" | "parallel";

export type GateResult = "1" | "0" | "short" | "float";

export interface CmosRow {
  a: Bit;
  b: Bit;
  /** PMOS devices on (gate low) */
  pA: boolean;
  pB: boolean;
  /** NMOS devices on (gate high) */
  nA: boolean;
  nB: boolean;
  pullUp: boolean;
  pullDown: boolean;
  result: GateResult;
}

/** One input row of a two-input static CMOS gate whose pull-up (PMOS) and pull-down (NMOS) networks are series or parallel. */
export function cmosRow(pu: Network, pd: Network, a: Bit, b: Bit): CmosRow {
  const pA = a === 0;
  const pB = b === 0;
  const nA = a === 1;
  const nB = b === 1;
  const pullUp = pu === "series" ? pA && pB : pA || pB;
  const pullDown = pd === "series" ? nA && nB : nA || nB;
  const result: GateResult = pullUp && pullDown ? "short" : pullUp ? "1" : pullDown ? "0" : "float";
  return { a, b, pA, pB, nA, nB, pullUp, pullDown, result };
}

export const ROWS: [Bit, Bit][] = [[0, 0], [0, 1], [1, 0], [1, 1]];

export function cmosTable(pu: Network, pd: Network): CmosRow[] {
  return ROWS.map(([a, b]) => cmosRow(pu, pd, a, b));
}

/** What the gate is called, or why it is not a gate. */
export function cmosName(pu: Network, pd: Network): "NAND" | "NOR" | "short" | "float" {
  const t = cmosTable(pu, pd);
  if (t.some((r) => r.result === "short")) return "short";
  if (t.some((r) => r.result === "float")) return "float";
  return pu === "parallel" ? "NAND" : "NOR";
}

// ───────────────────────────── gate networks (NAND only) ─────────────────────────────

export const nand = (a: number, b: number): Bit => (a && b ? 0 : 1);

export type NandMode = "not" | "and" | "or" | "xor";

export interface NandGate {
  id: string;
  /** names of inputs: "A", "B" or the id of an earlier gate */
  in: [string, string];
}

export const NAND_NETS: Record<NandMode, NandGate[]> = {
  not: [{ id: "n1", in: ["A", "A"] }],
  and: [
    { id: "n1", in: ["A", "B"] },
    { id: "n2", in: ["n1", "n1"] },
  ],
  or: [
    { id: "n1", in: ["A", "A"] },
    { id: "n2", in: ["B", "B"] },
    { id: "n3", in: ["n1", "n2"] },
  ],
  xor: [
    { id: "n1", in: ["A", "B"] },
    { id: "n2", in: ["A", "n1"] },
    { id: "n3", in: ["B", "n1"] },
    { id: "n4", in: ["n2", "n3"] },
  ],
};

export function evalNand(mode: NandMode, a: Bit, b: Bit): Record<string, Bit> {
  const v: Record<string, Bit> = { A: a, B: b };
  for (const g of NAND_NETS[mode]) v[g.id] = nand(v[g.in[0]], v[g.in[1]]);
  return v;
}

export const nandOut = (mode: NandMode, a: Bit, b: Bit): Bit => {
  const net = NAND_NETS[mode];
  return evalNand(mode, a, b)[net[net.length - 1].id];
};

// ───────────────────────────── multiplexers, decoders, encoders ─────────────────────────────

export const mux = (sel: number, data: number[]): Bit => (data[sel] ? 1 : 0);

/** One-hot decoder output with an enable. */
export function decode(sel: number, n: number, enable: boolean): Bit[] {
  return Array.from({ length: n }, (_, i) => (enable && i === sel ? 1 : 0));
}

/** Priority encoder: the highest-numbered active input wins. `valid` is 0 when no input is active. */
export function priorityEncode(inputs: number[]): { code: number; valid: Bit } {
  for (let i = inputs.length - 1; i >= 0; i--) if (inputs[i]) return { code: i, valid: 1 };
  return { code: 0, valid: 0 };
}

// ───────────────────────────── latches and flip-flops ─────────────────────────────

export type Q = Bit | "?";

export interface SrState {
  q: Q;
  qn: Q;
}

/**
 * Cross-coupled NOR SR latch (active-high inputs). S=1,R=0 sets, S=0,R=1 resets, 0/0 holds, 1/1 is forbidden: both
 * outputs are forced to 0, and if both inputs then drop together the outputs race and the result is unpredictable ("?").
 */
export function srNext(prev: SrState, prevS: Bit, prevR: Bit, s: Bit, r: Bit): SrState {
  if (s && r) return { q: 0, qn: 0 };
  if (s) return { q: 1, qn: 0 };
  if (r) return { q: 0, qn: 1 };
  if (prevS && prevR) return { q: "?", qn: "?" };
  return prev;
}

export interface FfRow {
  clk: Bit;
  d: Bit;
  /** gated D latch (transparent while clk is 1) */
  latch: Q;
  /** edge-triggered D flip-flop (copies d on the 0 to 1 edge only) */
  ff: Q;
}

/** Advance one time slot: the inputs may have changed. Returns the new row. */
export function ffStep(prev: FfRow, clk: Bit, d: Bit): FfRow {
  const rising = prev.clk === 0 && clk === 1;
  return { clk, d, latch: clk ? d : prev.latch, ff: rising ? d : prev.ff };
}

// ───────────────────────────── registers and counters ─────────────────────────────

/** Shift right: the new bit enters at index 0 (the left end of the display); the last bit falls off. */
export function shiftIn(bits: Bit[], inBit: Bit): Bit[] {
  return [inBit, ...bits.slice(0, bits.length - 1)];
}

/** Binary counter step, LSB first: a bit toggles when every bit below it is 1. */
export function counterStep(bits: number[]): Bit[] {
  let carry = 1;
  return bits.map((b) => {
    const nb = (b ^ carry) as Bit;
    carry = carry & b;
    return nb;
  });
}

export const bitsToInt = (bitsLsbFirst: number[]) => bitsLsbFirst.reduce((n, b, i) => n + (b ? 2 ** i : 0), 0);
export const intToBits = (n: number, width: number): Bit[] => Array.from({ length: width }, (_, i) => (((n >> i) & 1) as Bit));

// ───────────────────────────── state machines ─────────────────────────────

export interface FsmState {
  id: string;
  label: string;
  /** Moore output (depends on the state alone) */
  out?: string;
  x: number;
  y: number;
}
export interface FsmTrans {
  from: string;
  input: string;
  to: string;
  /** Mealy output (depends on state and input) */
  out?: string;
  /** drawing hint: bend the arrow (positive = to the left of the direction of travel, in 2 px units) */
  bend?: number;
}
export interface Fsm {
  id: string;
  title: string;
  style: "Moore" | "Mealy";
  start: string;
  states: FsmState[];
  inputs: { id: string; label: string }[];
  trans: FsmTrans[];
  outputName: string;
  note: string;
}

export const FSMS: Record<string, Fsm> = {
  traffic: {
    id: "traffic",
    title: "Traffic light",
    style: "Moore",
    start: "ns-go",
    outputName: "Lights",
    note: "Moore: the lights depend only on the state. The input is the timer: 'wait' while it runs, 'timer done' when it expires.",
    inputs: [
      { id: "wait", label: "Timer running" },
      { id: "done", label: "Timer done" },
    ],
    states: [
      { id: "ns-go", label: "N-S green", out: "N-S green, E-W red", x: 76, y: 44 },
      { id: "ns-stop", label: "N-S amber", out: "N-S amber, E-W red", x: 284, y: 44 },
      { id: "ew-go", label: "E-W green", out: "E-W green, N-S red", x: 284, y: 150 },
      { id: "ew-stop", label: "E-W amber", out: "E-W amber, N-S red", x: 76, y: 150 },
    ],
    trans: [
      ...["ns-go", "ns-stop", "ew-go", "ew-stop"].map((s) => ({ from: s, input: "wait", to: s })),
      { from: "ns-go", input: "done", to: "ns-stop" },
      { from: "ns-stop", input: "done", to: "ew-go" },
      { from: "ew-go", input: "done", to: "ew-stop" },
      { from: "ew-stop", input: "done", to: "ns-go" },
    ],
  },
  vending: {
    id: "vending",
    title: "Vending machine (15¢)",
    style: "Moore",
    start: "c0",
    outputName: "Output",
    note: "Moore: the machine dispenses while it is in the 'Pay' state. Coins: nickel = 5¢, dime = 10¢. Overpaying is not refunded in this toy.",
    inputs: [
      { id: "N", label: "Nickel" },
      { id: "D", label: "Dime" },
      { id: "-", label: "No coin" },
    ],
    states: [
      { id: "c0", label: "0¢", out: "waiting", x: 56, y: 44 },
      { id: "c5", label: "5¢", out: "waiting", x: 180, y: 44 },
      { id: "c10", label: "10¢", out: "waiting", x: 304, y: 44 },
      { id: "pay", label: "15¢ Pay", out: "DISPENSE", x: 180, y: 156 },
    ],
    trans: [
      { from: "c0", input: "N", to: "c5" },
      { from: "c0", input: "D", to: "c10", bend: -22 },
      { from: "c0", input: "-", to: "c0" },
      { from: "c5", input: "N", to: "c10" },
      { from: "c5", input: "D", to: "pay" },
      { from: "c5", input: "-", to: "c5" },
      { from: "c10", input: "N", to: "pay" },
      { from: "c10", input: "D", to: "pay" },
      { from: "c10", input: "-", to: "c10" },
      { from: "pay", input: "N", to: "c0" },
      { from: "pay", input: "D", to: "c0" },
      { from: "pay", input: "-", to: "c0" },
    ],
  },
  "detect-mealy": {
    id: "detect-mealy",
    title: "Detect 1-0-1 (Mealy)",
    style: "Mealy",
    start: "a",
    outputName: "Output",
    note: "Mealy: the output depends on the state AND the input, so it can react in the same cycle the last 1 arrives. Edge labels read input / output. Three states.",
    inputs: [
      { id: "0", label: "Input 0" },
      { id: "1", label: "Input 1" },
    ],
    states: [
      { id: "a", label: "A: nothing", x: 62, y: 100 },
      { id: "b", label: "B: saw 1", x: 180, y: 38 },
      { id: "c", label: "C: saw 10", x: 298, y: 100 },
    ],
    trans: [
      { from: "a", input: "0", to: "a", out: "0" },
      { from: "a", input: "1", to: "b", out: "0" },
      { from: "b", input: "0", to: "c", out: "0" },
      { from: "b", input: "1", to: "b", out: "0" },
      { from: "c", input: "0", to: "a", out: "0" },
      { from: "c", input: "1", to: "b", out: "1" },
    ],
  },
  "detect-moore": {
    id: "detect-moore",
    title: "Detect 1-0-1 (Moore)",
    style: "Moore",
    start: "a",
    outputName: "Output",
    note: "Moore: the output belongs to the state, so a fourth state, D: 'found 101', is needed. The output goes high one clock later than the Mealy version's.",
    inputs: [
      { id: "0", label: "Input 0" },
      { id: "1", label: "Input 1" },
    ],
    states: [
      { id: "a", label: "A: nothing", out: "0", x: 62, y: 44 },
      { id: "b", label: "B: saw 1", out: "0", x: 298, y: 44 },
      { id: "c", label: "C: saw 10", out: "0", x: 298, y: 156 },
      { id: "d", label: "D: found", out: "1", x: 62, y: 156 },
    ],
    trans: [
      { from: "a", input: "0", to: "a" },
      { from: "a", input: "1", to: "b" },
      { from: "b", input: "0", to: "c" },
      { from: "b", input: "1", to: "b" },
      { from: "c", input: "0", to: "a", bend: 16 },
      { from: "c", input: "1", to: "d" },
      { from: "d", input: "0", to: "c" },
      { from: "d", input: "1", to: "b", bend: 16 },
    ],
  },
};

export function fsmStep(m: Fsm, state: string, input: string): { to: string; out: string } {
  const t = m.trans.find((x) => x.from === state && x.input === input);
  if (!t) return { to: state, out: "" };
  const target = m.states.find((s) => s.id === t.to);
  return { to: t.to, out: m.style === "Mealy" ? (t.out ?? "") : (target?.out ?? "") };
}

// ───────────────────────────── timing ─────────────────────────────

export interface TimingInput {
  /** clock-to-Q of the launching flop, ns */
  tcq: number;
  /** gate delays g1..g4, ns. Paths: g1 → g2 → g4 (long) and g3 → g4 (short) */
  g: [number, number, number, number];
  tsu: number;
  thold: number;
  /** how much LATER the capturing flop's clock arrives than the launching flop's, ns (negative = earlier) */
  skew: number;
  /** clock period, ns */
  period: number;
}

export interface TimingResult {
  pathLong: number;
  pathShort: number;
  /** longest combinational delay (critical path) */
  tlogic: number;
  setupSlack: number;
  holdSlack: number;
  /** maximum clock frequency in MHz, from the setup relation (skew included) */
  fmaxMhz: number;
  critical: "long" | "short";
}

export function timing(i: TimingInput): TimingResult {
  const [g1, g2, g3, g4] = i.g;
  const pathLong = g1 + g2 + g4;
  const pathShort = g3 + g4;
  const tlogic = Math.max(pathLong, pathShort);
  const tmin = Math.min(pathLong, pathShort);
  const setupSlack = i.period + i.skew - (i.tcq + tlogic + i.tsu);
  const holdSlack = i.tcq + tmin - i.thold - i.skew;
  const minPeriod = i.tcq + tlogic + i.tsu - i.skew;
  return { pathLong, pathShort, tlogic, setupSlack, holdSlack, fmaxMhz: minPeriod > 0 ? 1000 / minPeriod : Infinity, critical: pathLong >= pathShort ? "long" : "short" };
}

/** Maximum frequency in MHz from delays in ns (no skew). */
export const maxFreqMhz = (tcq: number, tlogic: number, tsu: number) => 1000 / (tcq + tlogic + tsu);

// ───────────────────────────── metastability ─────────────────────────────

/** Probability that a flop that went metastable is STILL unresolved after `t` (same units as tau): e^(−t/τ). */
export const unresolved = (t: number, tau: number) => Math.exp(-t / tau);

/** MTBF in seconds = e^(tr/τ) / (Tw · fclk · fdata). tr and τ and Tw in seconds. */
export function mtbfSeconds(tr: number, tau: number, tw: number, fclk: number, fdata: number): number {
  return Math.exp(tr / tau) / (tw * fclk * fdata);
}

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Inverse-CDF sample of a metastable resolution time (exponential, mean tau). */
export const sampleResolution = (rand: () => number, tau: number) => -tau * Math.log(1 - rand());

// ───────────────────────────── button bounce ─────────────────────────────

export const BOUNCE_SAMPLE_MS = 0.1;
export const BOUNCE_TOTAL_MS = 60;
export const PRESS_AT_MS = 6;
export const RELEASE_AT_MS = 38;

/** Raw contact signal sampled every 0.1 ms: press at 6 ms and release at 38 ms, each with a burst of bounces. */
export function bounceTrace(seed: number): Bit[] {
  const rand = mulberry32(seed);
  const n = Math.round(BOUNCE_TOTAL_MS / BOUNCE_SAMPLE_MS);
  const out: Bit[] = new Array(n).fill(0);
  const burst = (startMs: number, to: Bit) => {
    // an odd number of flips ends on the new level
    const flips = 2 * (1 + Math.floor(rand() * 4)) + 1;
    let t = startMs;
    let level: Bit = to === 1 ? 0 : 1;
    for (let k = 0; k < flips; k++) {
      level = (1 - level) as Bit;
      const dur = 0.2 + rand() * 0.9;
      const a = Math.round(t / BOUNCE_SAMPLE_MS);
      const b = k === flips - 1 ? n : Math.min(n, Math.round((t + dur) / BOUNCE_SAMPLE_MS));
      for (let i = a; i < b; i++) out[i] = level;
      t += dur;
    }
  };
  burst(PRESS_AT_MS, 1);
  burst(RELEASE_AT_MS, 0);
  return out;
}

/** Counter debounce: the output follows the input only after it has stayed the same for `stable` samples in a row. */
export function debounce(samples: number[], stable: number): Bit[] {
  let out: Bit = (samples[0] ? 1 : 0) as Bit;
  let run = 0;
  let last = samples[0] ? 1 : 0;
  const res: Bit[] = [];
  for (const s of samples) {
    const v = s ? 1 : 0;
    run = v === last ? run + 1 : 1;
    last = v;
    if (v !== out && run >= stable) out = v as Bit;
    res.push(out);
  }
  return res;
}

export const risingEdges = (s: number[]) => s.reduce((n, v, i) => n + (i > 0 && v === 1 && s[i - 1] === 0 ? 1 : 0), 0);
