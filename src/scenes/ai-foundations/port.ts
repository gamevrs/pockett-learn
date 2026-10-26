/**
 * A plain TypeScript twin of the finished Orchard Vision program (the Python reference solution).
 *
 * It does two jobs: the landing-page demo runs on it (see demo.ts), and the belt uses its sensor rig
 * to produce tomorrow's batch of fruit (`readSensors(99)`, the same batch the capstone lesson uses
 * as its "fresh fruit" check). The sensor rig mirrors the Python one exactly: a tiny seeded LCG whose
 * state stays below 2^53, so JS doubles reproduce it bit for bit.
 */

export const FEATURE_NAMES = ["weight", "diameter", "hue", "sugar"] as const;
export const KIND_ORDER = ["apple", "pear", "plum"] as const;

export type PortKind = (typeof KIND_ORDER)[number];

export interface PortRow {
  weight: number;
  diameter: number;
  hue: number;
  sugar: number;
  kind: PortKind;
  ripe: number;
  price: number;
}

export class Rng {
  state: number;
  constructor(seed: number) {
    this.state = seed % 4294967296;
  }
  uniform(): number {
    this.state = (this.state * 1664525 + 1013904223) % 4294967296;
    return this.state / 4294967296;
  }
  normal(mean: number, spread: number): number {
    const total = this.uniform() + this.uniform() + this.uniform() + this.uniform();
    return mean + spread * (total - 2.0) * 1.732;
  }
  below(n: number): number {
    return Math.floor(this.uniform() * n);
  }
}

/** Python-style round(x, digits) for ordinary values (exact decimal expansion of the double). */
const pyRound = (x: number, digits: number) => Number(x.toFixed(digits));

const ORCHARD: Record<PortKind, [number, number, number, number, number, number]> = {
  apple: [110, 72.0, 4.4e-4, 55.0, 30.0, 0.0],
  pear: [80, 70.0, 6.4e-4, 62.0, 28.0, -2.0],
  plum: [50, 52.0, 5.6e-4, 235.0, 55.0, 2.0],
};

export function readSensors(seed = 2024): PortRow[] {
  const rng = new Rng(seed);
  const batch: PortRow[] = [];
  for (const kind of KIND_ORDER) {
    const [count, diameter, density, hue, hueSpread, shift] = ORCHARD[kind];
    for (let n = 0; n < count; n++) {
      const ripe = rng.uniform() < 0.6 ? 1 : 0;
      const width = rng.normal(diameter, 7.0);
      const weight = density * width * width * width * rng.normal(1.0, 0.16);
      const colour = rng.normal(hue, hueSpread) + (ripe ? -6 : 6) * (kind !== "plum" ? 1 : 0);
      const sugar = rng.normal(12.0 + shift + (ripe ? 2.2 : -2.2), 1.5);
      const price = 0.05 + 0.0028 * weight + 0.03 * sugar + rng.normal(0.0, 0.06);
      batch.push({
        weight: pyRound(weight, 1),
        diameter: pyRound(width, 1),
        hue: Math.round(Math.min(Math.max(colour, 0.0), 359.0)),
        sugar: pyRound(sugar, 1),
        kind,
        ripe,
        price: pyRound(price, 2),
      });
    }
  }
  return batch;
}

// ───────────────────────── small numeric helpers ─────────────────────────

type Matrix = number[][];

const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const std = (v: number[]) => {
  const c = mean(v);
  return Math.sqrt(v.reduce((a, b) => a + (b - c) * (b - c), 0) / v.length);
};
const colOf = (m: Matrix, j: number) => m.map((r) => r[j]);

function fitScaler(X: Matrix): [number[], number[]] {
  const cols = X[0].map((_, j) => colOf(X, j));
  const centre = cols.map(mean);
  const spread = cols.map((c) => {
    const s = std(c);
    return s === 0 ? 1 : s;
  });
  return [centre, spread];
}
const applyScaler = (X: Matrix, centre: number[], spread: number[]) => X.map((r) => r.map((v, j) => (v - centre[j]) / spread[j]));
const dist = (a: number[], b: number[]) => {
  let s = 0;
  for (let j = 0; j < a.length; j++) s += (a[j] - b[j]) * (a[j] - b[j]);
  return Math.sqrt(s);
};
const orderByDistance = (ref: Matrix, q: number[]) =>
  ref
    .map((r, i) => ({ i, d: dist(r, q) }))
    .sort((p, r) => p.d - r.d || p.i - r.i)
    .map((p) => p.i);

function majority(labels: string[]): string {
  const counts = new Map<string, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  let best = "";
  let bestN = -1;
  for (const [l, n] of counts) {
    if (n > bestN) {
      best = l;
      bestN = n;
    }
  }
  return best;
}
const voteCounts = (labels: string[]) => {
  const out: Record<string, number> = {};
  for (const l of labels) out[l] = (out[l] ?? 0) + 1;
  return out;
};
const accuracy = (a: unknown[], b: unknown[]) => a.reduce<number>((n, v, i) => n + (v === b[i] ? 1 : 0), 0) / a.length;

function shuffledIndices(n: number, seed: number): number[] {
  const rng = new Rng(seed);
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = rng.below(i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
function splitIndices(n: number, testFraction: number, seed: number): [number[], number[]] {
  const order = shuffledIndices(n, seed);
  const nTest = Math.round(n * testFraction);
  return [order.slice(nTest), order.slice(0, nTest)];
}

const sigmoid = (t: number) => 1 / (1 + Math.exp(-Math.min(30, Math.max(-30, t))));
const mse = (t: number[], p: number[]) => t.reduce((a, v, i) => a + (p[i] - v) * (p[i] - v), 0) / t.length;
const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
const addBias = (Z: Matrix) => Z.map((r) => [...r, 1]);

function trainLinear(Zb: Matrix, t: number[], lr: number, epochs: number) {
  let weights = new Array(Zb[0].length).fill(0);
  const history: number[] = [];
  for (let e = 0; e < epochs; e++) {
    const errors = Zb.map((r, i) => dot(r, weights) - t[i]);
    const grad = weights.map((_, j) => (2 * Zb.reduce((s, r, i) => s + r[j] * errors[i], 0)) / t.length);
    weights = weights.map((w, j) => w - lr * grad[j]);
    history.push(errors.reduce((s, v) => s + v * v, 0) / t.length);
  }
  return { weights, history };
}

function trainLogistic(Zb: Matrix, t: number[], lr: number, epochs: number) {
  let weights = new Array(Zb[0].length).fill(0);
  const history: number[] = [];
  const logLoss = (p: number[]) =>
    -p.reduce((s, v, i) => {
      const q = Math.min(1 - 1e-9, Math.max(1e-9, v));
      return s + t[i] * Math.log(q) + (1 - t[i]) * Math.log(1 - q);
    }, 0) / p.length;
  for (let e = 0; e < epochs; e++) {
    const p = Zb.map((r) => sigmoid(dot(r, weights)));
    const grad = weights.map((_, j) => Zb.reduce((s, r, i) => s + r[j] * (p[i] - t[i]), 0) / t.length);
    weights = weights.map((w, j) => w - lr * grad[j]);
    history.push(logLoss(p));
  }
  return { weights, history };
}

function precisionRecallAt(probs: number[], truth: number[], threshold: number): [number, number] {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  probs.forEach((p, i) => {
    const guess = p >= threshold;
    if (guess && truth[i]) tp++;
    else if (guess) fp++;
    else if (truth[i]) fn++;
  });
  return [tp + fp ? tp / (tp + fp) : 0, tp + fn ? tp / (tp + fn) : 0];
}

const bandOf = (hue: number) => (hue < 35 ? "warm" : hue < 150 ? "green" : "purple");
export const engineerFeatures = (f: number[]): number[] => {
  const [weight, diameter, hue, sugar] = f;
  const density = (weight / (diameter * diameter * diameter)) * 10000;
  return [weight, diameter, hue, sugar, density, ...["warm", "green", "purple"].map((b) => (bandOf(hue) === b ? 1 : 0))];
};

// ───────────────────────── the whole program ─────────────────────────

export const LABELS: PortKind[] = ["apple", "pear", "plum"];

export interface PortProgram {
  vars: Record<string, unknown>;
  hooks: Record<string, (...args: never[]) => unknown>;
}

/** Runs the finished reference program and returns every top-level variable and hook the scene can read. */
export function buildReferenceProgram(seed = 11): PortProgram {
  const rows = readSensors();
  const featuresOf = (r: PortRow) => [r.weight, r.diameter, r.hue, r.sugar];
  const X = rows.map(featuresOf);
  const y = rows.map((r) => r.kind as string);
  const prices = rows.map((r) => r.price);
  const ripeFlags = rows.map((r) => r.ripe);

  const kindCounts: Record<string, number> = {};
  for (const r of rows) kindCounts[r.kind] = (kindCounts[r.kind] ?? 0) + 1;

  const describe = (v: number[]) => ({ mean: mean(v), min: Math.min(...v), max: Math.max(...v), std: std(v) });
  const stats = Object.fromEntries(FEATURE_NAMES.map((n, j) => [n, describe(colOf(X, j))]));
  const columns = X[0].map((_, j) => colOf(X, j));
  const columnMeans = columns.map(mean);
  const columnStds = columns.map(std);

  const [m0, s0] = fitScaler(X);
  const Xs0 = applyScaler(X, m0, s0);
  const r3 = (v: number) => Number(v.toFixed(3));
  const scaledSample = Xs0.filter((_, i) => i % 20 === 0).map((r) => r.map(r3));
  const scaledCols = Xs0[0].map((_, j) => colOf(Xs0, j));
  const scaledMeans = scaledCols.map((c) => Number(mean(c).toFixed(6)));
  const scaledStds = scaledCols.map((c) => Number(std(c).toFixed(6)));

  // lesson 7: split and refit the scaler on the training fruit only
  const [trainIdx, testIdx] = splitIndices(X.length, 0.25, seed);
  const Xtrain = trainIdx.map((i) => X[i]);
  const Xtest = testIdx.map((i) => X[i]);
  const yTrain = trainIdx.map((i) => y[i]);
  const yTest = testIdx.map((i) => y[i]);
  const [scalerMean, scalerStd] = fitScaler(Xtrain);
  const Xtr = applyScaler(Xtrain, scalerMean, scalerStd);
  const Xte = applyScaler(Xtest, scalerMean, scalerStd);
  const scaleOne = (f: number[]) => f.map((v, j) => (v - scalerMean[j]) / scalerStd[j]);

  const knn = (q: number[], k: number) => majority(orderByDistance(Xtr, q).slice(0, k).map((i) => yTrain[i]));
  const predictAll = (Q: Matrix, k: number) => Q.map((q) => knn(q, k));

  const K5 = 5;
  const trainAccuracy = accuracy(yTrain, predictAll(Xtr, K5));
  const testPredictions = predictAll(Xte, K5);
  const testAccuracy = accuracy(yTest, testPredictions);

  const confusionOf = (truth: string[], guess: string[]) => {
    const m = LABELS.map(() => LABELS.map(() => 0));
    truth.forEach((t, i) => {
      m[LABELS.indexOf(t as PortKind)][LABELS.indexOf(guess[i] as PortKind)]++;
    });
    return m;
  };
  const confusion = confusionOf(yTest, testPredictions);
  const precisionBy: Record<string, number> = {};
  const recallBy: Record<string, number> = {};
  LABELS.forEach((name, i) => {
    const colTotal = confusion.reduce((s, r) => s + r[i], 0);
    const rowTotal = confusion[i].reduce((s, v) => s + v, 0);
    precisionBy[name] = colTotal ? confusion[i][i] / colTotal : 0;
    recallBy[name] = rowTotal ? confusion[i][i] / rowTotal : 0;
  });
  const majorityAccuracy = Math.max(...Object.values(voteCounts(yTest))) / yTest.length;

  // lessons 9-10: a line for price
  const WEIGHT_UNIT = 100;
  const priceTrain = trainIdx.map((i) => prices[i]);
  const priceTest = testIdx.map((i) => prices[i]);
  const xTrain = Xtrain.map((r) => r[0] / WEIGHT_UNIT);
  const xTest = Xtest.map((r) => r[0] / WEIGHT_UNIT);
  let searchMse = Infinity;
  for (let sw = 0; sw < 13; sw++) {
    for (let sb = 0; sb < 21; sb++) {
      const e = mse(priceTrain, xTrain.map((x) => sw * 0.05 * x + sb * 0.05));
      if (e < searchMse) searchMse = e;
    }
  }
  let lineW = 0;
  let lineB = 0;
  const fitHistory: { epoch: number; loss: number; w: number; b: number }[] = [];
  for (let epoch = 0; epoch < 150; epoch++) {
    const errors = xTrain.map((x, i) => lineW * x + lineB - priceTrain[i]);
    const dw = mean(errors.map((e, i) => 2 * e * xTrain[i]));
    const db = mean(errors.map((e) => 2 * e));
    lineW -= 0.1 * dw;
    lineB -= 0.1 * db;
    fitHistory.push({ epoch: epoch + 1, loss: mse(priceTrain, xTrain.map((x) => lineW * x + lineB)), w: lineW, b: lineB });
  }
  const lossHistory = fitHistory.map((s) => s.loss);
  const lineTestMse = mse(priceTest, xTest.map((x) => lineW * x + lineB));

  // lesson 11: all four measurements
  const Ztr = addBias(Xtr);
  const Zte = addBias(Xte);
  const priceFit = trainLinear(Ztr, priceTrain, 0.1, 400);
  const priceWeights = priceFit.weights;
  const priceTrainMse = mse(priceTrain, Ztr.map((r) => dot(r, priceWeights)));
  const priceTestMse = mse(priceTest, Zte.map((r) => dot(r, priceWeights)));
  const priceFor = (f: number[]) => dot([...scaleOne(f), 1], priceWeights);

  // lesson 12-13: ripeness
  const SUGAR = 3;
  const ripeTrain = trainIdx.map((i) => ripeFlags[i]);
  const ripeTest = testIdx.map((i) => ripeFlags[i]);
  const Str = addBias(Xtr.map((r) => [r[SUGAR]]));
  const Ste = addBias(Xte.map((r) => [r[SUGAR]]));
  const ripeFit = trainLogistic(Str, ripeTrain, 0.5, 300);
  const ripeWeights = ripeFit.weights;
  const ripeProbability = (sugar: number) => sigmoid(ripeWeights[0] * ((sugar - scalerMean[SUGAR]) / scalerStd[SUGAR]) + ripeWeights[1]);
  const pTest = Ste.map((r) => sigmoid(dot(r, ripeWeights)));
  const pTrain = Str.map((r) => sigmoid(dot(r, ripeWeights)));
  const ripeAccuracy = accuracy(ripeTest, pTest.map((p) => (p >= 0.5 ? 1 : 0)));
  let ripeThreshold = 0.05;
  let bestPrecision = -1;
  for (let step = 1; step < 20; step++) {
    const th = step * 0.05;
    const [p, r] = precisionRecallAt(pTrain, ripeTrain, th);
    if (r >= 0.85 && p > bestPrecision) {
      ripeThreshold = Number(th.toFixed(2));
      bestPrecision = p;
    }
  }
  const thresholdTable = Array.from({ length: 9 }, (_, i) => {
    const threshold = (i + 1) / 10;
    const [precision, recall] = precisionRecallAt(pTest, ripeTest, threshold);
    return { threshold, precision, recall };
  });

  // lesson 14: choosing k
  const trainOrder = Xtr.map((q) => orderByDistance(Xtr, q));
  const testOrder = Xte.map((q) => orderByDistance(Xtr, q));
  const kAcc = (order: number[][], truth: string[], k: number) => accuracy(truth, order.map((row) => majority(row.slice(0, k).map((i) => yTrain[i]))));
  const K_VALUES = [1, 3, 5, 9, 15, 25, 45, 90, 180];
  const fitCurve = K_VALUES.map((k) => ({
    k,
    train: kAcc(trainOrder, yTrain, k),
    val: kAcc(
      trainOrder.map((row) => row.slice(1)),
      yTrain,
      k,
    ),
    test: kAcc(testOrder, yTest, k),
  }));
  let bestK = 1;
  let bestVal = -1;
  for (const row of fitCurve) {
    if (row.val > bestVal) {
      bestVal = row.val;
      bestK = row.k;
    }
  }
  const K = bestK;
  const classify = (f: number[]) => knn(scaleOne(f), K);

  // lesson 15: engineered features
  const Xeng = X.map(engineerFeatures);
  const accWith = (F: Matrix, k: number) => {
    const [c, s] = fitScaler(trainIdx.map((i) => F[i]));
    const A = applyScaler(trainIdx.map((i) => F[i]), c, s);
    const B = applyScaler(testIdx.map((i) => F[i]), c, s);
    return accuracy(yTest, B.map((q) => majority(orderByDistance(A, q).slice(0, k).map((i) => yTrain[i]))));
  };
  const baselineAccuracy = accWith(X, K);
  const engineeredAccuracy = accWith(Xeng, K);

  // lesson 16
  const evaluatePipeline = (batch: PortRow[], k: number) => {
    const Xb = batch.map(featuresOf);
    const yb = batch.map((r) => r.kind as string);
    const [train, test] = splitIndices(Xb.length, 0.25, seed);
    const [c, s] = fitScaler(train.map((i) => Xb[i]));
    const A = applyScaler(train.map((i) => Xb[i]), c, s);
    const B = applyScaler(test.map((i) => Xb[i]), c, s);
    const guesses = B.map((q) => majority(orderByDistance(A, q).slice(0, k).map((i) => yb[train[i]])));
    return { accuracy: accuracy(test.map((i) => yb[i]), guesses), confusion: confusionOf(test.map((i) => yb[i]), guesses), train_size: train.length, test_size: test.length };
  };
  const report = evaluatePipeline(rows, K);
  const freshReport = evaluatePipeline(readSensors(99), K);

  const vars: Record<string, unknown> = {
    FEATURE_NAMES: [...FEATURE_NAMES],
    rows,
    kind_counts: kindCounts,
    X_list: X,
    stats,
    n_rows: X.length,
    n_features: 4,
    column_means: columnMeans,
    column_stds: columnStds,
    scaled_sample: scaledSample,
    scaled_means: scaledMeans,
    scaled_stds: scaledStds,
    K,
    SEED: seed,
    train_idx: trainIdx,
    test_idx: testIdx,
    train_accuracy: trainAccuracy,
    test_accuracy: testAccuracy,
    LABELS,
    confusion,
    precision_by_kind: precisionBy,
    recall_by_kind: recallBy,
    majority_accuracy: majorityAccuracy,
    WEIGHT_UNIT,
    line_w: lineW,
    line_b: lineB,
    search_mse: searchMse,
    loss_history: lossHistory,
    fit_history: fitHistory,
    line_test_mse: lineTestMse,
    price_weights: priceWeights,
    price_train_mse: priceTrainMse,
    price_test_mse: priceTestMse,
    price_loss_history: priceFit.history,
    ripe_weights: ripeWeights,
    ripe_loss_history: ripeFit.history,
    ripe_accuracy: ripeAccuracy,
    RIPE_THRESHOLD: ripeThreshold,
    threshold_table: thresholdTable,
    K_VALUES,
    fit_curve: fitCurve,
    best_k: bestK,
    baseline_accuracy: baselineAccuracy,
    engineered_accuracy: engineeredAccuracy,
    report,
    fresh_report: freshReport,
  };

  const hooks: PortProgram["hooks"] = {
    features: (row: PortRow) => featuresOf(row),
    label: (row: PortRow) => row.kind,
    classify_1nn: (f: number[]) => y[orderByDistance(Xs0, applyScaler([f], m0, s0)[0])[0]],
    classify,
    votes: (f: number[]) => voteCounts(orderByDistance(Xtr, scaleOne(f)).slice(0, K).map((i) => yTrain[i])),
    price_for: priceFor,
    ripe_probability: ripeProbability,
    is_ripe: (sugar: number) => ripeProbability(sugar) >= ripeThreshold,
    engineer: engineerFeatures,
    sort_fruit: (f: number[]) => {
      const p = ripeProbability(f[SUGAR]);
      return { kind: classify(f), ripe_probability: p, ripe: p >= ripeThreshold, price: priceFor(f) };
    },
    classify_many: (list: number[][]) => list.map(classify),
  };
  return { vars, hooks };
}
