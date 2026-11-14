// Pure model for chip-hwsw: one computation, run as a CPU program and as a hardware datapath. Toy numbers, no UI.
//
// Every preset has the same shape:  y = op3( op1(a, b), op2(c, d) ).

export type Op = "add" | "sub" | "mul";
export type InputName = "a" | "b" | "c" | "d";
export const INPUT_NAMES: InputName[] = ["a", "b", "c", "d"];
export type Inputs = Record<InputName, number>;

export interface HwPreset {
  id: string;
  label: string;
  /** Expression as text. */
  expr: string;
  ops: [Op, Op, Op];
  start: Inputs;
  /** Four input vectors used by "stream next input". */
  stream: Inputs[];
}

const v = (a: number, b: number, c: number, d: number): Inputs => ({ a, b, c, d });

export const HW_PRESETS: HwPreset[] = [
  { id: "mulsub", label: "(a + b) × (c − d)", expr: "y = (a + b) * (c - d)", ops: ["add", "sub", "mul"], start: v(3, 4, 9, 5), stream: [v(1, 2, 5, 3), v(2, 2, 6, 1), v(4, 1, 3, 3), v(0, 5, 8, 2)] },
  { id: "sum4", label: "(a + b) + (c + d)", expr: "y = (a + b) + (c + d)", ops: ["add", "add", "add"], start: v(3, 4, 9, 5), stream: [v(1, 2, 5, 3), v(2, 2, 6, 1), v(4, 1, 3, 3), v(0, 5, 8, 2)] },
  { id: "dot", label: "a × b + c × d", expr: "y = a * b + c * d", ops: ["mul", "mul", "add"], start: v(3, 4, 2, 5), stream: [v(1, 2, 5, 3), v(2, 2, 6, 1), v(4, 1, 3, 3), v(0, 5, 8, 2)] },
];

export function presetById(id: string): HwPreset {
  return HW_PRESETS.find((p) => p.id === id) ?? HW_PRESETS[0];
}

/** Toy operator delays in ns, and the flip-flop overhead. */
export const OP_DELAY_NS: Record<Op, number> = { add: 1.0, sub: 1.2, mul: 3.0 };
export const TCQ_NS = 0.4;
export const TSU_NS = 0.2;
export const OP_SYMBOL: Record<Op, string> = { add: "+", sub: "−", mul: "×" };
const OP_MNEMONIC: Record<Op, string> = { add: "ADD", sub: "SUB", mul: "MUL" };

export function applyOp(op: Op, x: number, y: number): number {
  return op === "add" ? x + y : op === "sub" ? x - y : x * y;
}

/** Combinational value of the whole expression, and of the two first-level results. */
export function evalComb(p: HwPreset, i: Inputs): { n1: number; n2: number; y: number } {
  const n1 = applyOp(p.ops[0], i.a, i.b);
  const n2 = applyOp(p.ops[1], i.c, i.d);
  return { n1, n2, y: applyOp(p.ops[2], n1, n2) };
}

export interface Timing {
  /** Delays of the three operators. */
  d1: number;
  d2: number;
  d3: number;
  /** Critical combinational path: the slower first-level operator, then the last one. */
  critical: ["n1" | "n2", "n3"];
  combNs: number;
  /** Minimum clock period, unpipelined: tcq + comb + tsu. */
  periodNs: number;
  stage1Ns: number;
  stage2Ns: number;
  /** Minimum clock period with registers between the levels: tcq + slower stage + tsu. */
  pipelinedPeriodNs: number;
}

const r1 = (x: number) => Math.round(x * 10) / 10;

export function timingOf(p: HwPreset): Timing {
  const d1 = OP_DELAY_NS[p.ops[0]];
  const d2 = OP_DELAY_NS[p.ops[1]];
  const d3 = OP_DELAY_NS[p.ops[2]];
  const stage1Ns = Math.max(d1, d2);
  const combNs = r1(stage1Ns + d3);
  return {
    d1,
    d2,
    d3,
    critical: [d1 >= d2 ? "n1" : "n2", "n3"],
    combNs,
    periodNs: r1(TCQ_NS + combNs + TSU_NS),
    stage1Ns,
    stage2Ns: d3,
    pipelinedPeriodNs: r1(TCQ_NS + Math.max(stage1Ns, d3) + TSU_NS),
  };
}

// ───────────── the CPU: a tiny accumulator-style machine, one instruction per clock cycle ─────────────

export interface Instr {
  text: string;
  /** What the instruction does, in plain words. */
  gloss: string;
}

export function program(p: HwPreset): Instr[] {
  const [o1, o2, o3] = p.ops;
  return [
    { text: "LOAD r1, a", gloss: "r1 = a" },
    { text: `${OP_MNEMONIC[o1]} r1, b`, gloss: `r1 = r1 ${OP_SYMBOL[o1]} b` },
    { text: "LOAD r2, c", gloss: "r2 = c" },
    { text: `${OP_MNEMONIC[o2]} r2, d`, gloss: `r2 = r2 ${OP_SYMBOL[o2]} d` },
    { text: `${OP_MNEMONIC[o3]} r1, r2`, gloss: `r1 = r1 ${OP_SYMBOL[o3]} r2` },
    { text: "STORE y, r1", gloss: "y = r1" },
  ];
}

export interface CpuState {
  pc: number;
  r1: number | null;
  r2: number | null;
  y: number | null;
}

export const CPU_INIT: CpuState = { pc: 0, r1: null, r2: null, y: null };

export function cpuStep(p: HwPreset, i: Inputs, s: CpuState): CpuState {
  const n = program(p).length;
  if (s.pc >= n) return s;
  const [o1, o2, o3] = p.ops;
  const r1v = s.r1 ?? 0;
  const r2v = s.r2 ?? 0;
  switch (s.pc) {
    case 0: return { ...s, pc: 1, r1: i.a };
    case 1: return { ...s, pc: 2, r1: applyOp(o1, r1v, i.b) };
    case 2: return { ...s, pc: 3, r2: i.c };
    case 3: return { ...s, pc: 4, r2: applyOp(o2, r2v, i.d) };
    case 4: return { ...s, pc: 5, r1: applyOp(o3, r1v, r2v) };
    default: return { ...s, pc: 6, y: r1v };
  }
}

// ───────────── the hardware: combinational logic between registers, all clocked together ─────────────

export interface LogRow {
  tick: number;
  inputs: Inputs;
  /** The output register after this tick (null: nothing valid yet). */
  q: number | null;
  /** Which tick's inputs that value belongs to. */
  forTick: number | null;
}

export interface HwState {
  ticks: number;
  /** Output register. */
  q: number | null;
  qFor: number | null;
  /** Pipeline registers between the two levels (only when pipelined). */
  s1: { n1: number; n2: number; tick: number } | null;
  log: LogRow[];
}

export const HW_INIT: HwState = { ticks: 0, q: null, qFor: null, s1: null, log: [] };

/** One rising clock edge: every register samples what its input shows right now. */
export function hwTick(p: HwPreset, i: Inputs, h: HwState, pipelined: boolean): HwState {
  const ticks = h.ticks + 1;
  const c = evalComb(p, i);
  let q: number | null;
  let qFor: number | null;
  let s1: HwState["s1"] = null;
  if (!pipelined) {
    q = c.y;
    qFor = ticks;
  } else {
    q = h.s1 ? applyOp(p.ops[2], h.s1.n1, h.s1.n2) : null;
    qFor = h.s1 ? h.s1.tick : null;
    s1 = { n1: c.n1, n2: c.n2, tick: ticks };
  }
  const row: LogRow = { tick: ticks, inputs: { ...i }, q, forTick: qFor };
  return { ticks, q, qFor, s1, log: [...h.log, row].slice(-6) };
}

// ───────────── the whole widget model ─────────────

export interface HwSwModel {
  preset: string;
  inputs: Inputs;
  pipelined: boolean;
  cpu: CpuState;
  hw: HwState;
  softwareSteps: number;
  inputsChanged: number;
  streamIdx: number;
}

export function initModel(presetId: string, pipelined = false): HwSwModel {
  const p = presetById(presetId);
  return { preset: p.id, inputs: { ...p.start }, pipelined, cpu: CPU_INIT, hw: HW_INIT, softwareSteps: 0, inputsChanged: 0, streamIdx: 0 };
}

/** Reset the runs but keep the inputs and the mode. */
export function resetModel(m: HwSwModel): HwSwModel {
  return { ...m, cpu: CPU_INIT, hw: HW_INIT, softwareSteps: 0 };
}

/** One shared clock cycle: the CPU executes one instruction, the hardware takes one tick. */
export function stepModel(m: HwSwModel): HwSwModel {
  const p = presetById(m.preset);
  const cpu = cpuStep(p, m.inputs, m.cpu);
  return { ...m, cpu, softwareSteps: m.softwareSteps + (cpu === m.cpu ? 0 : 1), hw: hwTick(p, m.inputs, m.hw, m.pipelined) };
}

/** New inputs: the hardware's combinational output follows at once; the program has to start over. */
export function setInputs(m: HwSwModel, inputs: Inputs): HwSwModel {
  return { ...m, inputs, cpu: CPU_INIT, softwareSteps: 0, inputsChanged: m.inputsChanged + 1 };
}

export function setPipelined(m: HwSwModel, pipelined: boolean): HwSwModel {
  if (m.pipelined === pipelined) return m;
  return { ...m, pipelined, hw: HW_INIT, cpu: CPU_INIT, softwareSteps: 0 };
}

/** Stream: load the next stored input vector, then clock once (CPU included). */
export function streamNext(m: HwSwModel): HwSwModel {
  const p = presetById(m.preset);
  const next = p.stream[m.streamIdx % p.stream.length];
  return { ...stepModel({ ...setInputs(m, { ...next }) }), streamIdx: m.streamIdx + 1 };
}

export interface HwSwState {
  preset: string;
  softwareSteps: number;
  hardwareTicks: number;
  inputsChanged: number;
  pipelined: boolean;
  yComb: number;
  q: number | null;
}

export function stateOf(m: HwSwModel): HwSwState {
  const p = presetById(m.preset);
  return { preset: m.preset, softwareSteps: m.softwareSteps, hardwareTicks: m.hw.ticks, inputsChanged: m.inputsChanged, pipelined: m.pipelined, yComb: evalComb(p, m.inputs).y, q: m.hw.q };
}

/**
 * goal: { minTicks?: number, pipelined?: boolean, minInputsChanged?: number, minSoftwareSteps?: number, preset?: string }.
 * Example solvable goals: { minTicks: 1 } or { pipelined: true, minTicks: 3 }.
 */
export function checkHwSw(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as HwSwState | undefined;
  if (!s || typeof s.hardwareTicks !== "number") return false;
  let any = false;
  const num = (k: string) => (typeof goal[k] === "number" ? (goal[k] as number) : undefined);
  if (typeof goal.preset === "string") {
    any = true;
    if (s.preset !== goal.preset) return false;
  }
  if (typeof goal.pipelined === "boolean") {
    any = true;
    if (s.pipelined !== goal.pipelined) return false;
  }
  if (num("minTicks") !== undefined) {
    any = true;
    if (s.hardwareTicks < num("minTicks")!) return false;
  }
  if (num("minInputsChanged") !== undefined) {
    any = true;
    if (s.inputsChanged < num("minInputsChanged")!) return false;
  }
  if (num("minSoftwareSteps") !== undefined) {
    any = true;
    if (s.softwareSteps < num("minSoftwareSteps")!) return false;
  }
  return any;
}
