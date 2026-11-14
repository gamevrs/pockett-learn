// Pure model for chip-synth: a toy standard-cell library, gate-level netlists for a few small designs in several
// architectures, and a longest-path timing walk. No UI, runs in Node.

export type CellType = "INV" | "NAND2" | "AND2" | "OR2" | "XOR2" | "MUX2" | "AO21";

export interface CellDef {
  /** Area in µm² (toy, made up but plausible relative values). */
  area: number;
  /** Delay in ps, the same from every input pin (toy). */
  delay: number;
  /** Pins, in order. */
  pins: string;
  /** What it computes. */
  fn: string;
  eval: (i: number[]) => number;
}

export const LIB: Record<CellType, CellDef> = {
  INV: { area: 1.0, delay: 10, pins: "A", fn: "!A", eval: (i) => 1 - i[0] },
  NAND2: { area: 1.3, delay: 15, pins: "A B", fn: "!(A & B)", eval: (i) => 1 - (i[0] & i[1]) },
  AND2: { area: 1.6, delay: 25, pins: "A B", fn: "A & B", eval: (i) => i[0] & i[1] },
  OR2: { area: 1.6, delay: 25, pins: "A B", fn: "A | B", eval: (i) => i[0] | i[1] },
  XOR2: { area: 2.6, delay: 40, pins: "A B", fn: "A ^ B", eval: (i) => i[0] ^ i[1] },
  MUX2: { area: 3.0, delay: 45, pins: "A B S", fn: "S ? B : A", eval: (i) => (i[2] ? i[1] : i[0]) },
  AO21: { area: 2.0, delay: 30, pins: "A B C", fn: "(A & B) | C", eval: (i) => (i[0] & i[1]) | i[2] },
};

export const CELL_TYPES = Object.keys(LIB) as CellType[];

export interface Cell {
  id: string;
  type: CellType;
  ins: string[];
  out: string;
}

export interface Netlist {
  inputs: string[];
  outputs: { name: string; net: string }[];
  cells: Cell[];
}

class Builder {
  cells: Cell[] = [];
  g(type: CellType, ins: string[], out: string): string {
    this.cells.push({ id: `U${this.cells.length + 1}`, type, ins, out });
    return out;
  }
}

const bits = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}${i}`);

// ───────────── the designs ─────────────

function buildAo(arch: string): Netlist {
  const b = new Builder();
  if (arch === "ao21") b.g("AO21", ["a", "b", "c"], "y");
  else {
    b.g("AND2", ["a", "b"], "ab");
    b.g("OR2", ["ab", "c"], "y");
  }
  return { inputs: ["a", "b", "c"], outputs: [{ name: "y", net: "y" }], cells: b.cells };
}

function buildMux(arch: string): Netlist {
  const b = new Builder();
  if (arch === "cell") b.g("MUX2", ["a", "b", "s"], "y");
  else {
    b.g("INV", ["s"], "sn");
    b.g("NAND2", ["b", "s"], "t1");
    b.g("NAND2", ["a", "sn"], "t2");
    b.g("NAND2", ["t1", "t2"], "y");
  }
  return { inputs: ["a", "b", "s"], outputs: [{ name: "y", net: "y" }], cells: b.cells };
}

/** Ripple chain over bits lo..hi-1 starting from carry `c` (null = no carry in). Returns sum nets and the carry out. */
function ripple(b: Builder, lo: number, hi: number, c: string | null): { sums: string[]; cout: string } {
  const sums: string[] = [];
  let carry = c;
  for (let i = lo; i < hi; i++) {
    const p = b.g("XOR2", [`a${i}`, `b${i}`], `p${i}`);
    const gg = b.g("AND2", [`a${i}`, `b${i}`], `g${i}`);
    if (carry === null) {
      sums.push(p);
      carry = gg;
    } else {
      sums.push(b.g("XOR2", [p, carry], `s${i}`));
      carry = b.g("AO21", [carry, p, gg], `c${i + 1}`);
    }
  }
  return { sums, cout: carry as string };
}

function adderIO(n: number): Pick<Netlist, "inputs"> {
  return { inputs: [...bits("a", n), ...bits("b", n)] };
}

function buildRipple(n: number): Netlist {
  const b = new Builder();
  const r = ripple(b, 0, n, null);
  return { ...adderIO(n), outputs: [...r.sums.map((net, i) => ({ name: `s${i}`, net })), { name: "cout", net: r.cout }], cells: b.cells };
}

/** Carry-select: the low half ripples; the high half is built twice (carry in 0 and 1) and a mux per bit picks one. */
function buildSelect(n: number): Netlist {
  const b = new Builder();
  const h = n / 2;
  const low = ripple(b, 0, h, null);
  const out = low.sums.map((net, i) => ({ name: `s${i}`, net }));
  // shared propagate / generate for the high half
  for (let i = h; i < n; i++) {
    b.g("XOR2", [`a${i}`, `b${i}`], `p${i}`);
    b.g("AND2", [`a${i}`, `b${i}`], `g${i}`);
  }
  // carry in 0
  const s0: string[] = [`p${h}`];
  let c0 = `g${h}`;
  for (let i = h + 1; i < n; i++) {
    s0.push(b.g("XOR2", [`p${i}`, c0], `s0_${i}`));
    c0 = b.g("AO21", [c0, `p${i}`, `g${i}`], `c0_${i + 1}`);
  }
  // carry in 1
  const s1: string[] = [b.g("INV", [`p${h}`], `s1_${h}`)];
  let c1 = b.g("OR2", [`a${h}`, `b${h}`], `c1_${h + 1}`);
  for (let i = h + 1; i < n; i++) {
    s1.push(b.g("XOR2", [`p${i}`, c1], `s1_${i}`));
    c1 = b.g("AO21", [c1, `p${i}`, `g${i}`], `c1_${i + 1}`);
  }
  for (let i = h; i < n; i++) out.push({ name: `s${i}`, net: b.g("MUX2", [s0[i - h], s1[i - h], low.cout], `s${i}`) });
  out.push({ name: "cout", net: b.g("MUX2", [c0, c1, low.cout], "cout") });
  return { ...adderIO(n), outputs: out, cells: b.cells };
}

/** Kogge-Stone parallel prefix: log2(n) levels of (generate, propagate) combining. */
function buildPrefix(n: number): Netlist {
  const b = new Builder();
  let G: string[] = [];
  let P: string[] = [];
  for (let i = 0; i < n; i++) {
    P.push(b.g("XOR2", [`a${i}`, `b${i}`], `p${i}`));
    G.push(b.g("AND2", [`a${i}`, `b${i}`], `g${i}`));
  }
  const p0 = P.slice();
  let level = 1;
  for (let d = 1; d < n; d *= 2, level++) {
    const nG = G.slice();
    const nP = P.slice();
    for (let i = d; i < n; i++) {
      nG[i] = b.g("AO21", [P[i], G[i - d], G[i]], `G${level}_${i}`);
      if (i >= 2 * d && 2 * d < n) nP[i] = b.g("AND2", [P[i], P[i - d]], `P${level}_${i}`);
    }
    G = nG;
    P = nP;
  }
  const out = [{ name: "s0", net: p0[0] }];
  for (let i = 1; i < n; i++) out.push({ name: `s${i}`, net: b.g("XOR2", [p0[i], G[i - 1]], `s${i}`) });
  out.push({ name: "cout", net: G[n - 1] });
  return { ...adderIO(n), outputs: out, cells: b.cells };
}

export interface ArchDef {
  id: string;
  label: string;
  note: string;
}

export interface SynthPreset {
  id: string;
  label: string;
  rtl: string;
  archs: ArchDef[];
  build: (arch: string) => Netlist;
}

const addRtl = (n: number) => `module add${n} (\n  input  [${n - 1}:0] a, b,\n  output [${n - 1}:0] sum,\n  output       cout\n);\n  assign {cout, sum} = a + b;\nendmodule`;

const ADDER_ARCHS: ArchDef[] = [
  { id: "ripple", label: "Ripple-carry", note: "One small cell chain: the carry ripples through every bit, so delay grows with the width." },
  { id: "select", label: "Carry-select", note: "The upper half is computed twice (carry-in 0 and 1) and a mux picks the right copy once the lower half's carry arrives." },
  { id: "prefix", label: "Parallel prefix", note: "Kogge-Stone: carries are combined in log2(width) levels. Fast for wide adders, but many more cells." },
];

export const SYNTH_PRESETS: SynthPreset[] = [
  {
    id: "ao",
    label: "y = (a & b) | c",
    rtl: "assign y = (a & b) | c;",
    archs: [
      { id: "gates", label: "AND2 + OR2", note: "Two simple cells in series." },
      { id: "ao21", label: "One AO21", note: "A single complex cell that does AND then OR in one stage." },
    ],
    build: buildAo,
  },
  {
    id: "mux",
    label: "2:1 mux",
    rtl: "assign y = s ? b : a;",
    archs: [
      { id: "cell", label: "MUX2 cell", note: "One library mux cell: compact, but a bit slow." },
      { id: "nand", label: "NAND gates", note: "Inverter plus three NAND2: faster, but bigger." },
    ],
    build: buildMux,
  },
  { id: "add4", label: "4-bit adder", rtl: addRtl(4), archs: ADDER_ARCHS, build: (a) => (a === "select" ? buildSelect(4) : a === "prefix" ? buildPrefix(4) : buildRipple(4)) },
  { id: "add8", label: "8-bit adder", rtl: addRtl(8), archs: ADDER_ARCHS, build: (a) => (a === "select" ? buildSelect(8) : a === "prefix" ? buildPrefix(8) : buildRipple(8)) },
];

export function presetById(id: string): SynthPreset | undefined {
  return SYNTH_PRESETS.find((p) => p.id === id);
}

export function buildNetlist(preset: string, arch: string): Netlist | undefined {
  const p = presetById(preset);
  if (!p || !p.archs.some((a) => a.id === arch)) return undefined;
  return p.build(arch);
}

// ───────────── functional evaluation (to prove the netlist is right) ─────────────

export function evalNetlist(nl: Netlist, inputs: Record<string, number>): Record<string, number> {
  const v: Record<string, number> = { ...inputs };
  for (const c of nl.cells) v[c.out] = LIB[c.type].eval(c.ins.map((n) => v[n]));
  const out: Record<string, number> = {};
  for (const o of nl.outputs) out[o.name] = v[o.net];
  return out;
}

// ───────────── timing and area ─────────────

export interface Analysis {
  cells: number;
  area: number;
  delayPs: number;
  /** Cell ids on the longest path, from input to output. */
  path: string[];
  /** Output net that ends the longest path. */
  endpoint: string;
  byType: Partial<Record<CellType, number>>;
  /** Arrival time of every net, in ps. */
  arrival: Record<string, number>;
}

const round1 = (x: number) => Math.round(x * 10) / 10;

export function analyze(nl: Netlist): Analysis {
  const arrival: Record<string, number> = {};
  const via: Record<string, Cell | undefined> = {};
  const from: Record<string, string | undefined> = {};
  for (const i of nl.inputs) arrival[i] = 0;
  let area = 0;
  const byType: Partial<Record<CellType, number>> = {};
  for (const c of nl.cells) {
    let worst = c.ins[0];
    for (const n of c.ins) if (arrival[n] > arrival[worst]) worst = n;
    arrival[c.out] = arrival[worst] + LIB[c.type].delay;
    via[c.out] = c;
    from[c.out] = worst;
    area += LIB[c.type].area;
    byType[c.type] = (byType[c.type] ?? 0) + 1;
  }
  let end = nl.outputs[0].net;
  for (const o of nl.outputs) if (arrival[o.net] > arrival[end]) end = o.net;
  const path: string[] = [];
  let net: string | undefined = end;
  while (net && via[net]) {
    path.unshift(via[net]!.id);
    net = from[net];
  }
  return { cells: nl.cells.length, area: round1(area), delayPs: arrival[end], path, endpoint: end, byType, arrival };
}

export function analyzeChoice(preset: string, arch: string): Analysis | undefined {
  const nl = buildNetlist(preset, arch);
  return nl ? analyze(nl) : undefined;
}

/** Every architecture of a preset with its numbers: the trade-off table. */
export function tradeoffs(preset: string): { arch: string; label: string; cells: number; area: number; delayPs: number }[] {
  const p = presetById(preset);
  if (!p) return [];
  return p.archs.map((a) => {
    const r = analyze(p.build(a.id));
    return { arch: a.id, label: a.label, cells: r.cells, area: r.area, delayPs: r.delayPs };
  });
}

/** The architecture with the least area among those meeting the delay target (undefined: none meets it). */
export function bestArch(preset: string, maxDelayPs?: number): string | undefined {
  const rows = tradeoffs(preset).filter((r) => maxDelayPs === undefined || r.delayPs <= maxDelayPs);
  if (rows.length === 0) return undefined;
  return rows.reduce((a, b) => (b.area < a.area ? b : a)).arch;
}

// ───────────── the "what isn't synthesisable" panel ─────────────

export interface SynthRule {
  code: string;
  becomes: string;
  tone: "ok" | "ignored" | "no" | "warn";
  text: string;
}

export const SYNTH_RULES: SynthRule[] = [
  { code: "always @(posedge clk) q <= d;", becomes: "flip-flops", tone: "ok", text: "A clocked block with non-blocking assignments becomes edge-triggered flip-flops." },
  { code: "always @* if (s) y = b; else y = a;", becomes: "gates", tone: "ok", text: "A combinational block where every path assigns the output becomes plain logic (here a mux)." },
  { code: "always @* if (en) y = d;", becomes: "a latch (usually a bug)", tone: "warn", text: "No else branch: y must remember its old value when en is 0, so the tool infers a latch. Add an else or a default value." },
  { code: "assign #5 y = a & b;", becomes: "the #5 is ignored", tone: "ignored", text: "Delays in the code are for simulation only. The real delay comes from the cells and wires the tool picks." },
  { code: "initial q = 0;", becomes: "usually ignored (ASIC)", tone: "ignored", text: "Standard-cell flip-flops have no power-up value, so use a reset signal. FPGAs can use an initial value to set the power-up state." },
  { code: '$display("q = %d", q);', becomes: "dropped", tone: "ignored", text: "System tasks are for simulation and debugging; they produce no hardware." },
  { code: "while (x != 0) x = x - 1;", becomes: "cannot be built", tone: "no", text: "A loop with no fixed count has no fixed amount of hardware. Use a counter and a state machine instead. (A loop with a fixed count is unrolled into repeated hardware.)" },
];

// ───────────── widget state and check ─────────────

export interface SynthState {
  preset: string;
  arch: string;
  cells: number;
  area: number;
  delayPs: number;
}

export function stateFor(preset: string, arch: string): SynthState | undefined {
  const r = analyzeChoice(preset, arch);
  return r ? { preset, arch, cells: r.cells, area: r.area, delayPs: r.delayPs } : undefined;
}

/**
 * goal: { preset?: string, arch?: string, maxDelayPs?: number, maxArea?: number, minimiseArea?: boolean }.
 * Recomputes the numbers from state.preset and state.arch (the cells/area/delayPs in state are never trusted).
 * minimiseArea: the chosen architecture must have the least area among those that meet maxDelayPs (all of them if there is no target).
 * Example: { preset: "add8", maxDelayPs: 200, minimiseArea: true } is satisfied only by "select".
 */
export function checkSynth(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as Partial<SynthState> | undefined;
  if (!s || typeof s.preset !== "string" || typeof s.arch !== "string") return false;
  const r = analyzeChoice(s.preset, s.arch);
  if (!r) return false;
  let any = false;
  if (typeof goal.preset === "string") {
    any = true;
    if (s.preset !== goal.preset) return false;
  }
  if (typeof goal.arch === "string") {
    any = true;
    if (s.arch !== goal.arch) return false;
  }
  const maxD = typeof goal.maxDelayPs === "number" ? goal.maxDelayPs : undefined;
  if (maxD !== undefined) {
    any = true;
    if (r.delayPs > maxD) return false;
  }
  if (typeof goal.maxArea === "number") {
    any = true;
    if (r.area > goal.maxArea + 1e-9) return false;
  }
  if (goal.minimiseArea === true) {
    any = true;
    if (bestArch(s.preset, maxD) !== s.arch) return false;
  }
  return any;
}
