// Pure model for chip-sta: a tiny static-timing analysis between flip-flops. All times in ps, toy numbers. No UI.
//
//   arrival        = tcq + (sum of gate delays on the path)
//   setup required = T + skew - tsu           setup slack = required - arrival
//   hold slack     = (tcq + path delay) - (th + skew)       (same clock edge: it does not depend on T)
//   fmax           = 1 / max over paths (arrival + tsu - skew)

export interface Gate {
  name: string;
  ps: number;
  area: number;
}

export interface PathDef {
  id: string;
  label: string;
  gates: Gate[];
}

export interface StaPreset {
  id: "basic" | "pipeline" | "hold";
  label: string;
  blurb: string;
  tcq: number;
  tsu: number;
  th: number;
  /** Capture clock arrives this much later than the launch clock (ps). */
  skewPs: number;
  periodNs: number;
  regAfter: Record<string, number>;
  paths: PathDef[];
}

export const UPSIZE_FACTOR = 0.75;
export const UPSIZE_AREA_FACTOR = 2;
export const BUF_PS = 100;
export const BUF_AREA = 1.5;
export const FF_AREA = 5;

const G = (name: string, ps: number, area: number): Gate => ({ name, ps, area });

const LOGIC_PATHS: PathDef[] = [
  { id: "A", label: "decode", gates: [G("NAND", 240, 1.3), G("NOR", 320, 1.3)] },
  { id: "B", label: "ALU add", gates: [G("XOR", 360, 2.6), G("AO21", 300, 2), G("AO21", 300, 2), G("XOR", 340, 2.6)] },
  { id: "C", label: "select", gates: [G("MUX", 400, 3)] },
  { id: "D", label: "multiply", gates: [G("AND", 300, 1.6), G("FA", 600, 6), G("FA", 600, 6), G("XOR", 400, 2.6)] },
];

export const STA_PRESETS: StaPreset[] = [
  {
    id: "basic",
    label: "Basic",
    blurb: "Four paths between two flip-flops. One of them is too slow for a 2 ns clock.",
    tcq: 400,
    tsu: 200,
    th: 100,
    skewPs: 0,
    periodNs: 2.0,
    regAfter: {},
    paths: LOGIC_PATHS,
  },
  {
    id: "pipeline",
    label: "Pipeline",
    blurb: "The multiply path already has a pipeline register, but it sits in the wrong place. Retime it.",
    tcq: 400,
    tsu: 200,
    th: 100,
    skewPs: 0,
    periodNs: 2.0,
    regAfter: { D: 1 },
    paths: LOGIC_PATHS,
  },
  {
    id: "hold",
    label: "Hold",
    blurb: "A flip-flop feeds the next one almost directly, and the capture clock arrives late. Setup is fine; hold is not.",
    tcq: 400,
    tsu: 200,
    th: 100,
    skewPs: 500,
    periodNs: 2.0,
    regAfter: {},
    paths: [
      { id: "A", label: "shift bit", gates: [G("wire", 48, 0)] },
      { id: "B", label: "counter", gates: [G("XOR", 400, 2.6), G("AO21", 340, 2), G("XOR", 400, 2.6)] },
    ],
  },
];

export function staPreset(id: string): StaPreset {
  return STA_PRESETS.find((p) => p.id === id) ?? STA_PRESETS[0];
}

export interface StaConfig {
  preset: string;
  periodNs: number;
  skewPs: number;
  /** Pipeline register inserted after this many gates of the path (1 .. n-1). */
  regAfter: Record<string, number>;
  /** Upsized gates, as `${pathId}${gateIndex}`, e.g. "D1". */
  upsized: string[];
  /** Delay buffers added at the start of the path. */
  buffers: Record<string, number>;
}

export function defaultConfig(presetId: string, over: { periodNs?: number; skewPs?: number } = {}): StaConfig {
  const p = staPreset(presetId);
  return { preset: p.id, periodNs: over.periodNs ?? p.periodNs, skewPs: over.skewPs ?? p.skewPs, regAfter: { ...p.regAfter }, upsized: [], buffers: {} };
}

/** Clean a config that came from outside (state): drop unknown paths, clamp positions, ignore bad numbers. */
export function normalize(cfg: StaConfig): StaConfig {
  const p = staPreset(cfg.preset);
  const regAfter: Record<string, number> = {};
  const buffers: Record<string, number> = {};
  for (const path of p.paths) {
    const k = cfg.regAfter?.[path.id];
    if (typeof k === "number" && Number.isInteger(k) && k >= 1 && k <= path.gates.length - 1) regAfter[path.id] = k;
    const b = cfg.buffers?.[path.id];
    if (typeof b === "number" && Number.isInteger(b) && b > 0) buffers[path.id] = Math.min(b, 20);
  }
  const valid = new Set(p.paths.flatMap((path) => path.gates.map((_, i) => `${path.id}${i}`)));
  const upsized = Array.from(new Set((cfg.upsized ?? []).filter((g) => valid.has(g))));
  const periodNs = typeof cfg.periodNs === "number" && isFinite(cfg.periodNs) ? cfg.periodNs : p.periodNs;
  const skewPs = typeof cfg.skewPs === "number" && isFinite(cfg.skewPs) ? cfg.skewPs : p.skewPs;
  return { preset: p.id, periodNs, skewPs, regAfter, upsized, buffers };
}

export interface Row {
  key: string;
  pathId: string;
  label: string;
  /** 0: no register inserted, 1 or 2: the stage of a split path. */
  stage: 0 | 1 | 2;
  /** Delay of the gates on this segment (upsizing and buffers included). */
  gatesPs: number;
  arrivalPs: number;
  requiredPs: number;
  setupSlackPs: number;
  holdSlackPs: number;
}

export interface Analysis {
  rows: Row[];
  /** Worst setup slack over all rows (negative = violation; it can also be positive). */
  wnsPs: number;
  /** Sum of the negative setup slacks (0 when none). */
  tnsPs: number;
  holdWnsPs: number;
  holdTnsPs: number;
  setupMet: boolean;
  holdMet: boolean;
  /** Smallest period at which every setup check passes. */
  minPeriodPs: number;
  fmaxMhz: number;
  areaUm2: number;
  /** The row with the worst setup slack. */
  worstKey: string;
  /** Cycles from launch to capture for each path (2 once a register is inserted). */
  latency: Record<string, number>;
}

export function gateDelay(g: Gate, id: string, cfg: StaConfig): number {
  return cfg.upsized.includes(id) ? g.ps * UPSIZE_FACTOR : g.ps;
}

export function analyzeSta(raw: StaConfig): Analysis {
  const cfg = normalize(raw);
  const p = staPreset(cfg.preset);
  const periodPs = Math.round(cfg.periodNs * 1000 * 1e6) / 1e6;
  const rows: Row[] = [];
  const latency: Record<string, number> = {};
  let area = 0;
  for (const path of p.paths) {
    const k = cfg.regAfter[path.id];
    const nb = cfg.buffers[path.id] ?? 0;
    area += nb * BUF_AREA;
    path.gates.forEach((g, i) => (area += cfg.upsized.includes(`${path.id}${i}`) ? g.area * UPSIZE_AREA_FACTOR : g.area));
    const seg = (from: number, to: number, extra: number) => {
      let s = extra;
      for (let i = from; i < to; i++) s += gateDelay(path.gates[i], `${path.id}${i}`, cfg);
      return s;
    };
    const mk = (key: string, label: string, stage: 0 | 1 | 2, gatesPs: number): Row => {
      const arrivalPs = p.tcq + gatesPs;
      const requiredPs = periodPs + cfg.skewPs - p.tsu;
      return { key, pathId: path.id, label, stage, gatesPs, arrivalPs, requiredPs, setupSlackPs: requiredPs - arrivalPs, holdSlackPs: arrivalPs - (p.th + cfg.skewPs) };
    };
    if (k !== undefined) {
      area += FF_AREA;
      latency[path.id] = 2;
      rows.push(mk(`${path.id}1`, `${path.id} ${path.label}, stage 1`, 1, seg(0, k, nb * BUF_PS)));
      rows.push(mk(`${path.id}2`, `${path.id} ${path.label}, stage 2`, 2, seg(k, path.gates.length, 0)));
    } else {
      latency[path.id] = 1;
      rows.push(mk(path.id, `${path.id} ${path.label}`, 0, seg(0, path.gates.length, nb * BUF_PS)));
    }
  }
  let worst = rows[0];
  let tns = 0;
  let holdTns = 0;
  let holdWns = Infinity;
  let minPeriod = -Infinity;
  for (const r of rows) {
    if (r.setupSlackPs < worst.setupSlackPs) worst = r;
    if (r.setupSlackPs < 0) tns += r.setupSlackPs;
    if (r.holdSlackPs < 0) holdTns += r.holdSlackPs;
    holdWns = Math.min(holdWns, r.holdSlackPs);
    minPeriod = Math.max(minPeriod, r.arrivalPs + p.tsu - cfg.skewPs);
  }
  return {
    rows,
    wnsPs: worst.setupSlackPs,
    tnsPs: tns,
    holdWnsPs: holdWns,
    holdTnsPs: holdTns,
    setupMet: worst.setupSlackPs >= 0,
    holdMet: holdWns >= 0,
    minPeriodPs: minPeriod,
    fmaxMhz: minPeriod > 0 ? 1e6 / minPeriod : Infinity,
    areaUm2: Math.round(area * 10) / 10,
    worstKey: worst.key,
    latency,
  };
}

export interface StaState {
  preset: string;
  periodNs: number;
  skewPs: number;
  regAfter: Record<string, number>;
  upsized: string[];
  buffers: Record<string, number>;
  pipelined: boolean;
  bufferCount: number;
  wnsPs: number;
  tnsPs: number;
  holdWnsPs: number;
  fmaxMhz: number;
}

export function stateOfSta(cfg: StaConfig): StaState {
  const c = normalize(cfg);
  const a = analyzeSta(c);
  return {
    ...c,
    pipelined: Object.keys(c.regAfter).length > 0,
    bufferCount: Object.values(c.buffers).reduce((x, y) => x + y, 0),
    wnsPs: a.wnsPs,
    tnsPs: a.tnsPs,
    holdWnsPs: a.holdWnsPs,
    fmaxMhz: Math.round(a.fmaxMhz * 10) / 10,
  };
}

/**
 * goal: { preset?: string, setupMet?: boolean, holdMet?: boolean, periodNs?: number, minFmaxMhz?: number, minBuffers?: number, pipelined?: boolean }.
 * Everything is recomputed from state.preset / periodNs / skewPs / regAfter / upsized / buffers; the wns/fmax fields in state are never trusted.
 * periodNs is a requirement on the clock: the learner's period must be at most this long (so slowing the clock cannot satisfy it).
 */
export function checkSta(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as Partial<StaState> | undefined;
  if (!s || typeof s.preset !== "string" || typeof s.periodNs !== "number") return false;
  const cfg = normalize({ preset: s.preset, periodNs: s.periodNs, skewPs: s.skewPs ?? 0, regAfter: s.regAfter ?? {}, upsized: s.upsized ?? [], buffers: s.buffers ?? {} });
  const a = analyzeSta(cfg);
  let any = false;
  if (typeof goal.preset === "string") {
    any = true;
    if (cfg.preset !== goal.preset) return false;
  }
  if (typeof goal.periodNs === "number") {
    any = true;
    if (cfg.periodNs > goal.periodNs + 1e-9) return false;
  }
  if (goal.setupMet === true) {
    any = true;
    if (!a.setupMet) return false;
  }
  if (goal.holdMet === true) {
    any = true;
    if (!a.holdMet) return false;
  }
  if (typeof goal.minFmaxMhz === "number") {
    any = true;
    if (a.fmaxMhz < goal.minFmaxMhz) return false;
  }
  if (typeof goal.minBuffers === "number") {
    any = true;
    if (Object.values(cfg.buffers).reduce((x, y) => x + y, 0) < goal.minBuffers) return false;
  }
  if (typeof goal.pipelined === "boolean") {
    any = true;
    if (Object.keys(cfg.regAfter).length > 0 !== goal.pipelined) return false;
  }
  return any;
}
