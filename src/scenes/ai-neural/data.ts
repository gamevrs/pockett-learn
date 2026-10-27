/**
 * Glyph Greenhouse: reading the learner's program. Everything that comes back from the program is
 * untrusted (wrong types, nulls, missing names), so every reader here degrades to "nothing to show".
 * The names match the published variables listed in src/content/projects/ai-neural.ts.
 */
import type { ProgramHandle } from "@/engine/program";

export const SIZE = 10;
export const PIXELS = SIZE * SIZE;
export const LIME = "#c5ee8a";
export const LIME_SOFT = "#d3f3a4";
export const POS = "#c5ee8a"; // positive weight / evidence for
export const NEG = "#a78bfa"; // negative weight / evidence against
export const BAD = "#f87171";
export const WARN = "#fbbf24";
export const INK = "#f4f4f4";

export const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export function nums(v: unknown): number[] {
  return Array.isArray(v) ? v.filter(finite) : [];
}

/** A rectangular list of lists of numbers, or null. */
export function matrix(v: unknown, rows?: number, cols?: number): number[][] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const out: number[][] = [];
  for (const r of v) {
    if (!Array.isArray(r) || r.length === 0 || !r.every(finite)) return null;
    out.push(r as number[]);
  }
  const w = out[0].length;
  if (out.some((r) => r.length !== w)) return null;
  if (rows !== undefined && out.length !== rows) return null;
  if (cols !== undefined && w !== cols) return null;
  return out;
}

export const pct = (v: number, d = 0) => `${(v * 100).toFixed(d)}%`;
export const fmt = (v: number, d = 3) => (Math.abs(v) >= 1000 || (Math.abs(v) < 0.001 && v !== 0) ? v.toExponential(1) : v.toFixed(d));

export interface Net {
  W1: number[][]; // [100][H]
  b1: number[];
  W2: number[][]; // [H][10]
  b2: number[];
  hidden: number;
}

export interface History {
  loss: number[];
  trainAcc: number[];
  evalAcc: number[];
  valLoss: number[];
  lr: number[];
  penalty: number[];
  updates: number | null;
  bestEpoch: number | null;
  stoppedEpoch: number | null;
}

export interface Report {
  testAccuracy: number | null;
  valAccuracy: number | null;
  epochs: number | null;
  bestEpoch: number | null;
  learningRate: number | null;
}

export interface Curves {
  z: number[];
  sigmoid: number[];
  tanh: number[];
  relu: number[];
  dSigmoid: number[];
  dTanh: number[];
  dRelu: number[];
}

export interface Vars {
  gallery: number[][];
  galleryLabels: number[];
  digitCounts: number[] | null;
  stemImage: number[][] | null;
  stemRates: number[] | null;
  curves: Curves | null;
  xorTable: number[][] | null;
  net: Net | null;
  shapeReport: Record<string, number[]> | null;
  chanceLoss: number | null;
  startProbs: number[] | null;
  initReport: { name: string; hiddenStd: number; logitStd: number; distinct: number }[];
  chain: { z: number; a: number; loss: number; dLossDa: number; dADz: number } | null;
  neuronLosses: number[];
  neuronImage: number[][] | null;
  gradNorms: { name: string; value: number }[];
  checkRows: { name: string; analytic: number; numeric: number }[];
  checkError: number | null;
  bugError: number | null;
  runs: { id: string; label: string; history: History }[];
  batchStudy: { size: string; updates: number; loss: number; accuracy: number }[];
  confusion: number[][] | null;
  recalls: number[];
  worstPairs: number[][];
  mistakes: { pixels: number[]; truth: number; guess: number }[];
  free: History | null;
  decay: History | null;
  gapFree: number | null;
  gapDecay: number | null;
  weightSize: { free: number; decay: number } | null;
  lrCurves: { name: string; values: number[] }[];
  scheduleStudy: { name: string; loss: number; accuracy: number }[];
  lrScores: { lr: string; score: number }[];
  bestLr: number | null;
  stopInfo: { best: number; stopped: number } | null;
  report: Report | null;
  hasPredict: boolean;
}

export const EMPTY_VARS: Vars = {
  gallery: [],
  galleryLabels: [],
  digitCounts: null,
  stemImage: null,
  stemRates: null,
  curves: null,
  xorTable: null,
  net: null,
  shapeReport: null,
  chanceLoss: null,
  startProbs: null,
  initReport: [],
  chain: null,
  neuronLosses: [],
  neuronImage: null,
  gradNorms: [],
  checkRows: [],
  checkError: null,
  bugError: null,
  runs: [],
  batchStudy: [],
  confusion: null,
  recalls: [],
  worstPairs: [],
  mistakes: [],
  free: null,
  decay: null,
  gapFree: null,
  gapDecay: null,
  weightSize: null,
  lrCurves: [],
  scheduleStudy: [],
  lrScores: [],
  bestLr: null,
  stopInfo: null,
  report: null,
  hasPredict: false,
};

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const numOrNull = (v: unknown) => (finite(v) ? v : null);

function readHistory(program: ProgramHandle, name: string): History | null {
  const d = program.dict<unknown>(name);
  const loss = nums(d.loss);
  if (loss.length < 2) return null;
  return {
    loss,
    trainAcc: nums(d.train_acc),
    evalAcc: nums(d.eval_acc),
    valLoss: nums(d.val_loss),
    lr: nums(d.lr),
    penalty: nums(d.penalty),
    updates: numOrNull(d.updates),
    bestEpoch: numOrNull(d.best_epoch),
    stoppedEpoch: numOrNull(d.stopped_epoch),
  };
}

export function readNet(v: unknown): Net | null {
  const d = rec(v);
  const W1 = matrix(d.W1, PIXELS);
  if (!W1) return null;
  const hidden = W1[0].length;
  const W2 = matrix(d.W2, hidden, 10);
  const b1 = nums(d.b1);
  const b2 = nums(d.b2);
  if (!W2 || b1.length !== hidden || b2.length !== 10) return null;
  return { W1, b1, W2, b2, hidden };
}

export function readVars(program: ProgramHandle | null): Vars {
  if (!program) return EMPTY_VARS;
  const gallery = (program.list<unknown>("gallery").map((r) => nums(r)).filter((r) => r.length === PIXELS));
  const galleryLabels = program.list<unknown>("gallery_labels").filter(finite) as number[];

  const c = program.dict<unknown>("curves");
  const z = nums(c.z);
  const curves: Curves | null =
    z.length > 2
      ? { z, sigmoid: nums(c.sigmoid), tanh: nums(c.tanh), relu: nums(c.relu), dSigmoid: nums(c.d_sigmoid), dTanh: nums(c.d_tanh), dRelu: nums(c.d_relu) }
      : null;
  const okCurves = curves && [curves.sigmoid, curves.tanh, curves.relu, curves.dSigmoid, curves.dTanh, curves.dRelu].every((a) => a.length === z.length) ? curves : null;

  const ir = program.dict<unknown>("init_report");
  const initReport = Object.entries(ir)
    .map(([name, v]) => {
      const r = rec(v);
      return finite(r.hidden_std) && finite(r.logit_std) ? { name, hiddenStd: r.hidden_std, logitStd: r.logit_std, distinct: finite(r.distinct_units) ? r.distinct_units : 0 } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const ch = program.dict<unknown>("chain_report");
  const chain = finite(ch.z) && finite(ch.a) && finite(ch.loss) && finite(ch.dloss_da) && finite(ch.da_dz) ? { z: ch.z, a: ch.a, loss: ch.loss, dLossDa: ch.dloss_da, dADz: ch.da_dz } : null;

  const gradNorms = Object.entries(program.dict<unknown>("grad_norms"))
    .filter(([, v]) => finite(v))
    .map(([name, value]) => ({ name, value: value as number }));

  const checkRows = program
    .list<unknown>("check_rows")
    .map((r) => (Array.isArray(r) && typeof r[0] === "string" && finite(r[1]) && finite(r[2]) ? { name: r[0] as string, analytic: r[1] as number, numeric: r[2] as number } : null))
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const runDefs: [string, string, string][] = [
    ["full", "history_full", "full batch"],
    ["batch", "history_batch", "mini-batch"],
    ["sched", "history_sched", "with momentum"],
    ["stop", "history_stop", "early stopping"],
    ["final", "history_final", "finished reader"],
  ];
  const runs: Vars["runs"] = [];
  for (const [id, name, label] of runDefs) {
    const h = readHistory(program, name);
    if (h) runs.push({ id, label, history: h });
  }

  const batchStudy = Object.entries(program.dict<unknown>("batch_study"))
    .map(([size, v]) => {
      const r = rec(v);
      return finite(r.updates) && finite(r.loss) && finite(r.accuracy) ? { size, updates: r.updates, loss: r.loss, accuracy: r.accuracy } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const confusion = matrix(program.list("final_confusion"), 10, 10) ?? matrix(program.list("confusion"), 10, 10);

  const mp = program.list<unknown>("mistake_pixels").map((r) => nums(r));
  const mt = program.list<unknown>("mistake_truth").filter(finite) as number[];
  const mg = program.list<unknown>("mistake_guess").filter(finite) as number[];
  const mistakes = mp.map((pixels, i) => ({ pixels, truth: mt[i], guess: mg[i] })).filter((m) => m.pixels.length === PIXELS && finite(m.truth) && finite(m.guess));

  const ws = program.dict<unknown>("weight_size");
  const weightSize = finite(ws.free) && finite(ws.decay) ? { free: ws.free, decay: ws.decay } : null;

  const lrCurves = Object.entries(program.dict<unknown>("lr_curves"))
    .map(([name, v]) => ({ name, values: nums(v) }))
    .filter((c2) => c2.values.length > 1);

  const scheduleStudy = Object.entries(program.dict<unknown>("schedule_study"))
    .map(([name, v]) => {
      const r = rec(v);
      return finite(r.loss) && finite(r.accuracy) ? { name, loss: r.loss, accuracy: r.accuracy } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const lrScores = Object.entries(program.dict<unknown>("lr_scores"))
    .filter(([, v]) => finite(v))
    .map(([lr, score]) => ({ lr, score: score as number }))
    .sort((a, b) => parseFloat(a.lr) - parseFloat(b.lr));

  const si = program.dict<unknown>("stop_info");
  const rp = program.dict<unknown>("report");
  const hasReport = finite(rp.test_accuracy);

  return {
    gallery,
    galleryLabels,
    digitCounts: (() => {
      const d = nums(program.list("digit_counts"));
      return d.length === 10 ? d : null;
    })(),
    stemImage: matrix(program.list("stem_image"), SIZE, SIZE),
    stemRates: (() => {
      const r = nums(program.list("stem_rates"));
      return r.length === 10 ? r : null;
    })(),
    curves: okCurves,
    xorTable: matrix(program.list("xor_table"), 4, 3),
    net: readNet(program.dict("net_view")),
    shapeReport: (() => {
      const d = program.dict<unknown>("shape_report");
      const out: Record<string, number[]> = {};
      for (const [k, v] of Object.entries(d)) if (Array.isArray(v) && v.every(finite)) out[k] = v as number[];
      return Object.keys(out).length ? out : null;
    })(),
    chanceLoss: numOrNull(program.num("chance_loss", NaN)),
    startProbs: (() => {
      const p = nums(program.list("start_probs"));
      return p.length === 10 ? p : null;
    })(),
    initReport,
    chain,
    neuronLosses: nums(program.list("neuron_losses")),
    neuronImage: matrix(program.list("neuron_image"), SIZE, SIZE),
    gradNorms,
    checkRows,
    checkError: numOrNull(program.num("check_error", NaN)),
    bugError: numOrNull(program.num("bug_error", NaN)),
    runs,
    batchStudy,
    confusion,
    recalls: nums(program.list("recalls")),
    worstPairs: program
      .list<unknown>("worst_pairs")
      .map((r) => nums(r))
      .filter((r) => r.length === 3),
    mistakes,
    free: readHistory(program, "history_free"),
    decay: readHistory(program, "history_decay"),
    gapFree: numOrNull(program.num("gap_free", NaN)),
    gapDecay: numOrNull(program.num("gap_decay", NaN)),
    weightSize,
    lrCurves,
    scheduleStudy,
    lrScores,
    bestLr: numOrNull(program.num("best_lr", NaN)),
    stopInfo: finite(si.best_epoch) && finite(si.stopped_epoch) ? { best: si.best_epoch, stopped: si.stopped_epoch } : null,
    report: hasReport
      ? {
          testAccuracy: numOrNull(rp.test_accuracy),
          valAccuracy: numOrNull(rp.val_accuracy),
          epochs: numOrNull(rp.epochs),
          bestEpoch: numOrNull(rp.best_epoch),
          learningRate: numOrNull(rp.learning_rate),
        }
      : null,
    hasPredict: program.hasHook("predict"),
  };
}

// ───────────────────────── the network, evaluated in the scene ─────────────────────────

export interface Pass {
  z1: number[];
  h: number[];
  z2: number[];
  probs: number[];
  guess: number;
}

/** The forward pass on one picture, computed from the published weights. */
export function forwardPass(net: Net, x: number[]): Pass {
  const H = net.hidden;
  const z1 = new Array<number>(H);
  for (let j = 0; j < H; j++) z1[j] = net.b1[j];
  for (let i = 0; i < PIXELS; i++) {
    const xi = x[i] ?? 0;
    if (xi === 0) continue;
    const row = net.W1[i];
    for (let j = 0; j < H; j++) z1[j] += xi * row[j];
  }
  const h = z1.map((v) => (v > 0 ? v : 0));
  const z2 = new Array<number>(10);
  for (let k = 0; k < 10; k++) z2[k] = net.b2[k];
  for (let j = 0; j < H; j++) {
    if (h[j] === 0) continue;
    const row = net.W2[j];
    for (let k = 0; k < 10; k++) z2[k] += h[j] * row[k];
  }
  const m = Math.max(...z2);
  const e = z2.map((v) => Math.exp(v - m));
  const s = e.reduce((a, b) => a + b, 0) || 1;
  const probs = e.map((v) => v / s);
  let guess = 0;
  for (let k = 1; k < 10; k++) if (probs[k] > probs[guess]) guess = k;
  return { z1, h, z2, probs, guess };
}

/** The first-layer weights of hidden unit j as a 10 x 10 grid. */
export function weightImage(net: Net, j: number): number[] {
  return net.W1.map((row) => row[j]);
}

export function toPercent(v: number | null | undefined): string {
  return finite(v) ? pct(v, 1) : "-";
}
