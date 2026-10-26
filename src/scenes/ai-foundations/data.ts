/**
 * Everything the Orchard Vision scene reads from the learner's program, parsed defensively.
 *
 * The learner's file grows lesson by lesson, so any name may be missing, the wrong type or full of
 * nulls. `readVars` turns the program's top-level variables into one typed object where "missing"
 * is `null`/empty, never an exception. The module is pure (no React, no DOM).
 */
import type { ProgramHandle } from "@/engine/program";

export const KINDS = ["apple", "pear", "plum"] as const;
export type Kind = (typeof KINDS)[number];
export const FEATS = ["weight", "diameter", "hue", "sugar"] as const;
export type FeatName = (typeof FEATS)[number];

export const KIND_COLOR: Record<Kind, string> = { apple: "#ff8a65", pear: "#c5ee8a", plum: "#b794f6" };
export const KIND_NAME: Record<Kind, string> = { apple: "Apple", pear: "Pear", plum: "Plum" };
export const FEAT_UNIT: Record<FeatName, string> = { weight: "g", diameter: "mm", hue: "°", sugar: "Brix" };
export const FEAT_TITLE: Record<FeatName, string> = { weight: "Weight", diameter: "Diameter", hue: "Hue", sugar: "Sugar" };
export const RIPE_COLOR = "#fbbf24";
export const UNRIPE_COLOR = "#7dd3a8";
export const BAD = "#f87171";
export const LIME = "#c5ee8a";

export interface Row {
  weight: number;
  diameter: number;
  hue: number;
  sugar: number;
  kind: Kind;
  ripe: number;
  price: number;
}

export type Feats = [number, number, number, number];
export const featsOf = (r: Row): Feats => [r.weight, r.diameter, r.hue, r.sugar];

export interface StatRow {
  mean: number;
  min: number;
  max: number;
  std: number;
}
export interface FitStep {
  epoch: number;
  loss: number;
  w: number;
  b: number;
}
export interface ThresholdRow {
  threshold: number;
  precision: number;
  recall: number;
}
export interface FitRow {
  k: number;
  train: number;
  val: number | null;
  test: number;
}
export interface Report {
  accuracy: number;
  confusion: number[][] | null;
  trainSize: number | null;
  testSize: number | null;
}

export interface Vars {
  rows: Row[];
  stats: Record<FeatName, StatRow> | null;
  nRows: number | null;
  nFeatures: number | null;
  colMeans: number[] | null;
  colStds: number[] | null;
  xList: number[][] | null;
  scaledSample: number[][] | null;
  scaledMeans: number[] | null;
  scaledStds: number[] | null;
  k: number | null;
  trainIdx: number[] | null;
  testIdx: number[] | null;
  trainAcc: number | null;
  testAcc: number | null;
  seed: number | null;
  confusion: number[][] | null;
  precision: Record<string, number> | null;
  recall: Record<string, number> | null;
  majorityAcc: number | null;
  lineW: number | null;
  lineB: number | null;
  weightUnit: number;
  searchMse: number | null;
  lossHistory: number[];
  fitHistory: FitStep[];
  lineTestMse: number | null;
  priceWeights: number[] | null;
  priceTrainMse: number | null;
  priceTestMse: number | null;
  ripeWeights: number[] | null;
  ripeLoss: number[];
  ripeAcc: number | null;
  ripeThreshold: number | null;
  thresholds: ThresholdRow[];
  fitCurve: FitRow[];
  bestK: number | null;
  baselineAcc: number | null;
  engineeredAcc: number | null;
  report: Report | null;
  fresh: Report | null;
}

// ───────────────────────── tolerant parsing ─────────────────────────

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const numOrNull = (v: unknown): number | null => (finite(v) ? v : null);

export function asKind(v: unknown): Kind | null {
  if (typeof v !== "string") return null;
  const s = v.trim().toLowerCase();
  return (KINDS as readonly string[]).includes(s) ? (s as Kind) : null;
}

export function numList(v: unknown, min = 1): number[] | null {
  if (!Array.isArray(v) || v.length < min) return null;
  const out = v.map((x) => (finite(x) ? x : NaN));
  return out.some((x) => Number.isNaN(x)) ? null : out;
}

function matrix(v: unknown, cols?: number): number[][] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const out: number[][] = [];
  for (const r of v) {
    const row = numList(r);
    if (!row || (cols !== undefined && row.length !== cols)) return null;
    out.push(row);
  }
  return out;
}

export function parseRows(v: unknown): Row[] {
  if (!Array.isArray(v)) return [];
  const out: Row[] = [];
  for (const r of v) {
    if (!isObj(r)) continue;
    const kind = asKind(r.kind);
    if (!kind || !finite(r.weight) || !finite(r.diameter) || !finite(r.hue) || !finite(r.sugar)) continue;
    out.push({
      weight: r.weight,
      diameter: r.diameter,
      hue: r.hue,
      sugar: r.sugar,
      kind,
      ripe: r.ripe ? 1 : 0,
      price: finite(r.price) ? r.price : 0,
    });
  }
  return out;
}

function parseStats(v: unknown): Record<FeatName, StatRow> | null {
  if (!isObj(v)) return null;
  const out = {} as Record<FeatName, StatRow>;
  for (const f of FEATS) {
    const s = v[f];
    if (!isObj(s) || !finite(s.mean) || !finite(s.min) || !finite(s.max) || !finite(s.std)) return null;
    out[f] = { mean: s.mean, min: s.min, max: s.max, std: s.std };
  }
  return out;
}

function parseNumDict(v: unknown): Record<string, number> | null {
  if (!isObj(v)) return null;
  const out: Record<string, number> = {};
  for (const [k, x] of Object.entries(v)) if (finite(x)) out[k] = x;
  return Object.keys(out).length ? out : null;
}

function parseSteps(v: unknown): FitStep[] {
  if (!Array.isArray(v)) return [];
  const out: FitStep[] = [];
  for (const s of v) if (isObj(s) && finite(s.loss) && finite(s.w) && finite(s.b)) out.push({ epoch: finite(s.epoch) ? s.epoch : out.length + 1, loss: s.loss, w: s.w, b: s.b });
  return out;
}

function parseThresholds(v: unknown): ThresholdRow[] {
  if (!Array.isArray(v)) return [];
  const out: ThresholdRow[] = [];
  for (const s of v) if (isObj(s) && finite(s.threshold) && finite(s.precision) && finite(s.recall)) out.push({ threshold: s.threshold, precision: s.precision, recall: s.recall });
  return out.sort((a, b) => a.threshold - b.threshold);
}

function parseFit(v: unknown): FitRow[] {
  if (!Array.isArray(v)) return [];
  const out: FitRow[] = [];
  for (const s of v) if (isObj(s) && finite(s.k) && finite(s.train) && finite(s.test)) out.push({ k: s.k, train: s.train, val: numOrNull(s.val), test: s.test });
  return out.sort((a, b) => a.k - b.k);
}

function parseReport(v: unknown): Report | null {
  if (!isObj(v) || !finite(v.accuracy)) return null;
  return { accuracy: v.accuracy, confusion: matrix(v.confusion, 3), trainSize: numOrNull(v.train_size), testSize: numOrNull(v.test_size) };
}

function indexList(v: unknown, max: number): number[] | null {
  const l = numList(v);
  if (!l) return null;
  const ok = l.filter((i) => Number.isInteger(i) && i >= 0 && i < max);
  return ok.length ? ok : null;
}

const cache = new WeakMap<ProgramHandle, Vars>();
export const EMPTY_VARS: Vars = readVars(null);

/** One typed snapshot of everything the scene can read; memoised per program. */
export function readVars(program: ProgramHandle | null): Vars {
  if (program) {
    const hit = cache.get(program);
    if (hit) return hit;
  }
  const num = (name: string) => (program ? numOrNull(safe(() => program.num(name, NaN))) : null);
  const list = (name: string): unknown[] => (program ? (safe(() => program.list(name)) ?? []) : []);
  const dict = (name: string): Record<string, unknown> => (program ? (safe(() => program.dict(name)) ?? {}) : {});
  const rows = parseRows(list("rows"));
  const n = rows.length;
  const hist = parseSteps(list("fit_history"));
  const out: Vars = {
    rows,
    stats: parseStats(dict("stats")),
    nRows: num("n_rows"),
    nFeatures: num("n_features"),
    colMeans: numList(list("column_means")),
    colStds: numList(list("column_stds")),
    xList: matrix(list("X_list"), 4),
    scaledSample: matrix(list("scaled_sample"), 4),
    scaledMeans: numList(list("scaled_means")),
    scaledStds: numList(list("scaled_stds")),
    k: num("K"),
    trainIdx: indexList(list("train_idx"), n),
    testIdx: indexList(list("test_idx"), n),
    trainAcc: num("train_accuracy"),
    testAcc: num("test_accuracy"),
    seed: num("SEED"),
    confusion: matrix(list("confusion"), 3),
    precision: parseNumDict(dict("precision_by_kind")),
    recall: parseNumDict(dict("recall_by_kind")),
    majorityAcc: num("majority_accuracy"),
    lineW: num("line_w"),
    lineB: num("line_b"),
    weightUnit: (() => {
      const u = num("WEIGHT_UNIT");
      return u && u > 0 ? u : 100;
    })(),
    searchMse: num("search_mse"),
    lossHistory: numList(list("loss_history")) ?? [],
    fitHistory: hist,
    lineTestMse: num("line_test_mse"),
    priceWeights: numList(list("price_weights")),
    priceTrainMse: num("price_train_mse"),
    priceTestMse: num("price_test_mse"),
    ripeWeights: numList(list("ripe_weights"), 2),
    ripeLoss: numList(list("ripe_loss_history")) ?? [],
    ripeAcc: num("ripe_accuracy"),
    ripeThreshold: num("RIPE_THRESHOLD"),
    thresholds: parseThresholds(list("threshold_table")),
    fitCurve: parseFit(list("fit_curve")),
    bestK: num("best_k"),
    baselineAcc: num("baseline_accuracy"),
    engineeredAcc: num("engineered_accuracy"),
    report: parseReport(dict("report")),
    fresh: parseReport(dict("fresh_report")),
  };
  if (program) cache.set(program, out);
  return out;
}

function safe<T>(fn: () => T): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

// ───────────────────────── geometry of the feature space ─────────────────────────

export interface AxisPair {
  x: FeatName;
  y: FeatName;
}
export const AXIS_PRESETS: AxisPair[] = [
  { x: "diameter", y: "weight" },
  { x: "diameter", y: "hue" },
  { x: "weight", y: "hue" },
];

export interface Range {
  lo: number;
  hi: number;
}

export function featureRange(rows: Row[], f: FeatName): Range {
  if (!rows.length) return f === "hue" ? { lo: 0, hi: 360 } : { lo: 0, hi: 1 };
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of rows) {
    lo = Math.min(lo, r[f]);
    hi = Math.max(hi, r[f]);
  }
  if (f === "hue") return { lo: 0, hi: 360 };
  const pad = (hi - lo) * 0.06;
  return { lo: f === "weight" ? 0 : Math.max(0, lo - pad), hi: hi + pad };
}

export function niceTicks(r: Range, count = 5): number[] {
  const span = r.hi - r.lo;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const out: number[] = [];
  for (let v = Math.ceil(r.lo / step) * step; v <= r.hi + 1e-9; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

/** Column means/stds the scene uses to put raw measurements on a common scale (the learner's own when it has them). */
export function scaleOf(vars: Vars): { mean: number[]; std: number[] } {
  if (vars.colMeans?.length === 4 && vars.colStds?.length === 4) return { mean: vars.colMeans, std: vars.colStds.map((s) => s || 1) };
  const rows = vars.rows;
  if (!rows.length) return { mean: [0, 0, 0, 0], std: [1, 1, 1, 1] };
  const mean = FEATS.map((f) => rows.reduce((a, r) => a + r[f], 0) / rows.length);
  const std = FEATS.map((f, j) => Math.sqrt(rows.reduce((a, r) => a + (r[f] - mean[j]) ** 2, 0) / rows.length) || 1);
  return { mean, std };
}

export interface PlaneFill {
  /** Per-feature fill vector for every grid cell, flattened row by row (y from the top). */
  cells: Feats[];
}

/**
 * For each grid cell of the plotted plane, the two features that are NOT on the axes are filled with
 * the average of the nearest few data rows in that plane, so the slice follows where fruit really is. A generator, so the
 * caller can spend a few milliseconds at a time on it.
 */
export function* planeGrid(rows: Row[], axes: AxisPair, rx: Range, ry: Range, gw: number, gh: number): Generator<void, Feats[], void> {
  const cells: Feats[] = [];
  const near = 8;
  const pts = rows.map((r) => ({ u: (r[axes.x] - rx.lo) / (rx.hi - rx.lo), v: (r[axes.y] - ry.lo) / (ry.hi - ry.lo), r }));
  const best: { d: number; i: number }[] = [];
  for (let j = 0; j < gh; j++) {
    for (let i = 0; i < gw; i++) {
      const u = (i + 0.5) / gw;
      const v = 1 - (j + 0.5) / gh;
      best.length = 0;
      pts.forEach((p, idx) => {
        const d = (p.u - u) ** 2 + (p.v - v) ** 2;
        if (best.length < near || d < best[best.length - 1].d) {
          best.push({ d, i: idx });
          best.sort((a, b) => a.d - b.d);
          if (best.length > near) best.pop();
        }
      });
      const f: Feats = [0, 0, 0, 0];
      FEATS.forEach((name, fi) => {
        if (name === axes.x) f[fi] = rx.lo + u * (rx.hi - rx.lo);
        else if (name === axes.y) f[fi] = ry.lo + v * (ry.hi - ry.lo);
        else f[fi] = best.length ? best.reduce((a, b) => a + pts[b.i].r[name], 0) / best.length : 0;
      });
      cells.push(f);
    }
    if (j % 2 === 1) yield;
  }
  return cells;
}

/** Indices of the k rows (from `pool`) closest to `q` once every measurement is put on a common scale. */
export function nearestRows(rows: Row[], pool: number[], q: number[], k: number, scale: { mean: number[]; std: number[] }): number[] {
  const z = (v: number, j: number) => (v - scale.mean[j]) / scale.std[j];
  const scored = pool.map((i) => {
    const f = featsOf(rows[i]);
    let d = 0;
    for (let j = 0; j < 4; j++) d += (z(f[j], j) - z(q[j], j)) ** 2;
    return { i, d };
  });
  scored.sort((a, b) => a.d - b.d || a.i - b.i);
  return scored.slice(0, Math.max(1, k)).map((s) => s.i);
}

export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
