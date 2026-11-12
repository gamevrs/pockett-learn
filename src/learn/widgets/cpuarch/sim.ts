/**
 * Pure simulation logic for the "How a CPU runs your code" widgets. No imports and no UI, so it can be
 * checked under plain Node. Everything here is a teaching toy: classic textbook models, not a real core.
 */

// ───────────────────────────── adders and the ALU ─────────────────────────────

export const halfAdder = (a: number, b: number) => ({ sum: a ^ b, carry: a & b });

export function fullAdder(a: number, b: number, cin: number) {
  const s1 = a ^ b;
  return { sum: s1 ^ cin, carry: (a & b) | (s1 & cin) };
}

export interface Ripple {
  /** Result bits, least significant first. */
  sum: number[];
  /** carries[i] is the carry going INTO bit i; carries[bits] is the carry out of the top bit. */
  carries: number[];
  value: number;
  carryOut: number;
}

/** A ripple-carry adder: `bits` full adders in a row, the carry passing from each to the next. */
export function ripple(a: number, b: number, bits: number, cin = 0): Ripple {
  const sum: number[] = [];
  const carries: number[] = [];
  let c = cin;
  for (let i = 0; i < bits; i++) {
    const r = fullAdder((a >> i) & 1, (b >> i) & 1, c);
    carries.push(c);
    sum.push(r.sum);
    c = r.carry;
  }
  carries.push(c);
  return { sum, carries, value: sum.reduce((v, bit, i) => v | (bit << i), 0), carryOut: c };
}

export type AluOp = "add" | "sub" | "cmp";

export interface AluResult extends Ripple {
  /** The B input after the optional inversion (for subtract: B flipped bit by bit). */
  bUsed: number;
  cin: number;
  zero: boolean;
}

/** A 4-bit-style ALU: add, subtract (A + NOT B + 1) or compare (subtract, keep only the flags). */
export function alu(a: number, b: number, op: AluOp, bits = 4): AluResult {
  const mask = (1 << bits) - 1;
  const sub = op !== "add";
  const bUsed = sub ? ~b & mask : b;
  const r = ripple(a, bUsed, bits, sub ? 1 : 0);
  return { ...r, bUsed, cin: sub ? 1 : 0, zero: r.value === 0 };
}

// ───────────────────────────── datapath stepper ─────────────────────────────

export type DpInstr =
  | { op: "MOV"; rd: number; imm: number }
  | { op: "ADD"; rd: number; rs: number }
  | { op: "SUB"; rd: number; rs: number }
  | { op: "LOAD"; rd: number; addr: number }
  | { op: "STORE"; rs: number; addr: number };

export const dpText = (i: DpInstr): string => {
  switch (i.op) {
    case "MOV":
      return `MOV R${i.rd}, #${i.imm}`;
    case "ADD":
    case "SUB":
      return `${i.op} R${i.rd}, R${i.rs}`;
    case "LOAD":
      return `LOAD R${i.rd}, [${i.addr}]`;
    case "STORE":
      return `STORE R${i.rs}, [${i.addr}]`;
  }
};

export const PHASES = ["Fetch", "Decode", "Execute", "Memory", "Write back"] as const;
export type Phase = (typeof PHASES)[number];

export interface DpState {
  pc: number;
  regs: number[];
  mem: number[];
  /** Index into PHASES for the instruction being run, or -1 between instructions. */
  phase: number;
  /** The instruction currently held in the instruction register (after fetch). */
  ir: DpInstr | null;
  /** Value on the ALU output / loaded from memory, once computed. */
  alu: number | null;
  loaded: number | null;
  halted: boolean;
  /** How many instructions have fully finished. */
  retired: number;
}

export function dpStart(mem: number[]): DpState {
  return { pc: 0, regs: [0, 0, 0, 0], mem: mem.slice(), phase: -1, ir: null, alu: null, loaded: null, halted: false, retired: 0 };
}

/** Advance one phase. Returns a new state. */
export function dpStep(s: DpState, program: DpInstr[]): DpState {
  if (s.halted) return s;
  const n: DpState = { ...s, regs: s.regs.slice(), mem: s.mem.slice() };
  const next = s.phase + 1;
  if (next === 0) {
    if (s.pc >= program.length) return { ...n, halted: true };
    n.phase = 0;
    n.ir = program[s.pc];
    n.alu = null;
    n.loaded = null;
    return n;
  }
  const ins = s.ir!;
  n.phase = next;
  if (next === 2) {
    if (ins.op === "MOV") n.alu = ins.imm;
    else if (ins.op === "ADD") n.alu = s.regs[ins.rd] + s.regs[ins.rs];
    else if (ins.op === "SUB") n.alu = s.regs[ins.rd] - s.regs[ins.rs];
    else n.alu = ins.addr; // LOAD / STORE: the ALU works out the address
  } else if (next === 3) {
    if (ins.op === "LOAD") n.loaded = s.mem[ins.addr];
    if (ins.op === "STORE") n.mem[ins.addr] = s.regs[ins.rs];
  } else if (next === 4) {
    if (ins.op === "MOV" || ins.op === "ADD" || ins.op === "SUB") n.regs[ins.rd] = s.alu!;
    if (ins.op === "LOAD") n.regs[ins.rd] = s.loaded!;
    n.pc = s.pc + 1;
    n.retired = s.retired + 1;
  }
  if (next === 5) {
    // wrap around to the next instruction's fetch
    n.phase = -1;
    return dpStep({ ...n, ir: null }, program);
  }
  return n;
}

// ───────────────────────────── cycles per instruction ─────────────────────────────

export interface CpiClass {
  id: string;
  label: string;
  cycles: number;
}

export function avgCpi(classes: CpiClass[], shares: number[]): number {
  const total = shares.reduce((a, b) => a + b, 0) || 1;
  return classes.reduce((sum, c, i) => sum + (c.cycles * shares[i]) / total, 0);
}

/** run time in milliseconds = instructions × CPI ÷ clock (Hz) × 1000 */
export const runTimeMs = (instructions: number, cpi: number, ghz: number) => ((instructions * cpi) / (ghz * 1e9)) * 1000;

// ───────────────────────────── the 5-stage pipeline ─────────────────────────────

export type InsKind = "alu" | "load" | "store" | "branch";

export interface PipeIns {
  text: string;
  kind: InsKind;
  /** Destination register number, if it writes one. */
  dst?: number;
  /** Source registers it reads. */
  src: number[];
}

export const STAGES = ["IF", "ID", "EX", "MEM", "WB"] as const;

export interface Cell {
  label: string;
  /** True for a cycle spent waiting (a stall bubble in place of useful work). */
  stall?: boolean;
}

export interface PipeResult {
  /** rows[i][c] is what instruction i does in cycle c+1 (null = nothing). */
  rows: (Cell | null)[][];
  total: number;
  /** Cycles instruction i spent held back (a data stall). */
  stalls: number[];
  /** Total bubbles inserted after branches. */
  branchBubbles: number;
}

export interface PipeOpts {
  forwarding: boolean;
  /** When true, fetching waits after every branch until the branch has been worked out (in EX). */
  branchStall?: boolean;
}

/**
 * Schedule instructions through a classic 5-stage pipeline: IF ID EX MEM WB.
 * Register file writes in the first half of WB and reads in the second half of ID, so an instruction may
 * read in the same cycle its producer writes back. With forwarding, a result goes straight from the end of
 * EX (ALU result) or the end of MEM (loaded value) to the EX stage that needs it.
 */
export function schedulePipeline(ins: PipeIns[], opts: PipeOpts): PipeResult {
  const n = ins.length;
  const ifS: number[] = [];
  const idS: number[] = [];
  const idE: number[] = [];
  const ex: number[] = [];
  const mem: number[] = [];
  const wb: number[] = [];
  let branchBubbles = 0;
  for (let i = 0; i < n; i++) {
    const prev = i - 1;
    let fetch = i === 0 ? 1 : idS[prev];
    if (opts.branchStall && i > 0 && ins[prev].kind === "branch") {
      const resume = ex[prev] + 1;
      if (resume > fetch) {
        branchBubbles += resume - fetch;
        fetch = resume;
      }
    }
    ifS[i] = fetch;
    idS[i] = Math.max(fetch + 1, i === 0 ? 0 : idE[prev] + 1);
    let end = idS[i];
    for (const r of ins[i].src) {
      let p = -1;
      for (let j = i - 1; j >= 0; j--) if (ins[j].dst === r) { p = j; break; }
      if (p < 0) continue;
      if (opts.forwarding) {
        const ready = ins[p].kind === "load" ? mem[p] + 1 : ex[p] + 1; // cycle the consumer's EX may start
        end = Math.max(end, ready - 1);
      } else {
        end = Math.max(end, wb[p]);
      }
    }
    idE[i] = end;
    ex[i] = end + 1;
    mem[i] = ex[i] + 1;
    wb[i] = mem[i] + 1;
  }
  const total = n ? wb[n - 1] : 0;
  const rows: (Cell | null)[][] = [];
  const stalls: number[] = [];
  for (let i = 0; i < n; i++) {
    const row: (Cell | null)[] = Array.from({ length: total }, () => null);
    for (let c = ifS[i]; c < idS[i]; c++) row[c - 1] = { label: "IF", stall: c > ifS[i] };
    for (let c = idS[i]; c <= idE[i]; c++) row[c - 1] = { label: "ID", stall: c < idE[i] };
    row[ex[i] - 1] = { label: "EX" };
    row[mem[i] - 1] = { label: "MEM" };
    row[wb[i] - 1] = { label: "WB" };
    rows.push(row);
    stalls.push(idE[i] - idS[i]);
  }
  return { rows, total, stalls, branchBubbles };
}

/** Cycles with no overlap at all: each instruction runs all five stages before the next starts. */
export const unpipelinedCycles = (n: number) => n * STAGES.length;

/** Ideal pipelined cycles for n independent instructions: n + stages − 1. */
export const idealCycles = (n: number, stages = STAGES.length) => (n === 0 ? 0 : n + stages - 1);

/** Can instructions at index i and i+1 trade places without changing what the program computes? */
export function canSwap(ins: PipeIns[], i: number): boolean {
  const a = ins[i];
  const b = ins[i + 1];
  if (!a || !b) return false;
  if (a.kind === "branch" || b.kind === "branch") return false;
  if (a.dst !== undefined && (b.src.includes(a.dst) || b.dst === a.dst)) return false;
  if (b.dst !== undefined && a.src.includes(b.dst)) return false;
  // keep loads and stores in order (they might touch the same memory)
  if ((a.kind === "store" && (b.kind === "load" || b.kind === "store")) || (a.kind === "load" && b.kind === "store")) return false;
  return true;
}

// ───────────────────────────── branch prediction ─────────────────────────────

export type PredictorKind = "static-not" | "static-taken" | "one-bit" | "two-bit" | "history";

export interface PredictRun {
  preds: boolean[];
  correct: boolean[];
  hits: number;
  misses: number;
}

/** Run one predictor over a list of real outcomes (true = branch taken). */
export function runPredictor(kind: PredictorKind, outcomes: boolean[]): PredictRun {
  const preds: boolean[] = [];
  const correct: boolean[] = [];
  let last = false; // one-bit state: what happened last time
  let counter = 1; // two-bit saturating counter 0..3; 0-1 predict not taken, 2-3 predict taken
  // history predictor: the last 4 outcomes pick one of 16 two-bit counters
  const table = Array.from({ length: 16 }, () => 1);
  let hist = 0;
  for (const actual of outcomes) {
    let p: boolean;
    if (kind === "static-not") p = false;
    else if (kind === "static-taken") p = true;
    else if (kind === "one-bit") p = last;
    else if (kind === "two-bit") p = counter >= 2;
    else p = table[hist] >= 2;
    preds.push(p);
    correct.push(p === actual);
    table[hist] = actual ? Math.min(3, table[hist] + 1) : Math.max(0, table[hist] - 1);
    hist = ((hist << 1) | (actual ? 1 : 0)) & 15;
    last = actual;
    counter = actual ? Math.min(3, counter + 1) : Math.max(0, counter - 1);
  }
  const hits = correct.filter(Boolean).length;
  return { preds, correct, hits, misses: outcomes.length - hits };
}

/** Small deterministic random numbers (mulberry32), so every learner sees the same "random" data. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type PatternId = "loop" | "alternate" | "random" | "sorted" | "unsorted";

/** Branch outcomes for each named pattern (length 64). `if (x >= 128)` over sorted or shuffled bytes for the data ones. */
export function patternOutcomes(id: PatternId, length = 64): boolean[] {
  const out: boolean[] = [];
  if (id === "loop") {
    // a loop that runs 8 times, over and over: taken 7 times, then falls out once
    for (let i = 0; i < length; i++) out.push(i % 8 !== 7);
    return out;
  }
  if (id === "alternate") {
    for (let i = 0; i < length; i++) out.push(i % 2 === 0);
    return out;
  }
  const r = rng(id === "random" ? 7 : 11);
  const data = Array.from({ length }, () => Math.floor(r() * 256));
  if (id === "sorted") data.sort((x, y) => x - y);
  return data.map((x) => x >= 128);
}

// ───────────────────────────── out-of-order execution ─────────────────────────────

export interface OooIns {
  text: string;
  /** Cycles until its result is ready. */
  lat: number;
  /** Indexes of earlier instructions it needs. */
  deps: number[];
}

export interface OooResult {
  issue: number[];
  done: number[];
  total: number;
}

/**
 * Issue instructions onto `width` execution slots per cycle. In order: stop at the first instruction that is
 * not ready. Out of order: any instruction within the next `window` waiting ones may go if its inputs are ready.
 */
export function scheduleIssue(ins: OooIns[], width: number, outOfOrder: boolean, window = 8): OooResult {
  const n = ins.length;
  const issue: number[] = Array(n).fill(-1);
  const done: number[] = Array(n).fill(-1);
  let left = n;
  let cycle = 1;
  while (left > 0 && cycle < 1000) {
    let slots = width;
    let seen = 0;
    for (let i = 0; i < n && slots > 0; i++) {
      if (issue[i] >= 0) continue;
      seen++;
      if (seen > window && outOfOrder) break;
      const ready = ins[i].deps.every((d) => issue[d] >= 0 && done[d] <= cycle);
      if (ready) {
        issue[i] = cycle;
        done[i] = cycle + ins[i].lat;
        slots--;
        left--;
      } else if (!outOfOrder) break;
    }
    cycle++;
  }
  // `done` is the first cycle the result may be used; the last instruction finishes one cycle before that
  const total = n ? Math.max(...done) - 1 : 0;
  return { issue, done, total };
}

// ───────────────────────────── Amdahl, SIMD ─────────────────────────────

/** Amdahl's law: speedup with a parallel fraction p on n cores. */
export const amdahl = (p: number, n: number) => 1 / (1 - p + p / n);

export interface SimdRun {
  vectorPasses: number;
  tail: number;
  scalarInstr: number;
  simdInstr: number;
  speedup: number;
}

/** c[i] = a[i] + b[i] over n numbers with `lanes` per vector. Per pass: 2 loads, 1 add, 1 store, 2 loop-bookkeeping. */
export function simdRun(n: number, lanes: number): SimdRun {
  const per = 6;
  const vectorPasses = Math.floor(n / lanes);
  const tail = n % lanes;
  const scalarInstr = n * per;
  const simdInstr = (lanes === 1 ? n : vectorPasses + tail) * per;
  return { vectorPasses, tail, scalarInstr, simdInstr, speedup: simdInstr ? scalarInstr / simdInstr : 1 };
}
