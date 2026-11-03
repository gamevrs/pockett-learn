/**
 * Everything the Pebble Beach scene reads from the learner's program, parsed defensively.
 *
 * The learner's file grows lesson by lesson, so any name may be missing, the wrong type or full of
 * nulls. `readData` turns the program's top-level variables into one typed object where "missing" is
 * `null` or empty, never an exception. The module is pure (no React, no DOM).
 */
import type { ProgramHandle } from "@/engine/program";

export const KINDS = ["skipper", "roller", "sparkler"] as const;
export type Kind = (typeof KINDS)[number];

export const KIND_COLOR: Record<Kind, string> = { skipper: "#7cc4ff", roller: "#ffb86b", sparkler: "#c9a7ff" };
export const LIME = "#c5ee8a";
export const BAD = "#f87171";

export interface Pebble {
  flat: number;
  shine: number;
  kind: Kind | null;
}

export interface FitRow {
  k: number;
  train: number;
  test: number;
}

export interface Report {
  k: number | null;
  testScore: number | null;
  basketScore: number | null;
  mysteryGuess: string | null;
}

export type Counts = Partial<Record<Kind, number>>;

export interface Data {
  mystery: Pebble | null;
  truth: string | null;
  handGuess: string | null;
  handCorrect: boolean | null;
  pebbles: Pebble[];
  kindCounts: Counts | null;
  firstFeatures: number[] | null;
  toFirst: number | null;
  toOther: number | null;
  nnPebble: Pebble | null;
  nnGuess: string | null;
  near3: Pebble[];
  tricky: Pebble | null;
  trickyTruth: string | null;
  trickyNear: Pebble[];
  trickyVotes: Counts | null;
  trickyGuess: string | null;
  trickyK1: string | null;
  k: number | null;
  basketAccuracy: number | null;
  lazyAccuracy: number | null;
  trainSet: Pebble[];
  testSet: Pebble[];
  trainAccuracy: number | null;
  testAccuracy: number | null;
  memoTrain: number | null;
  memoTest: number | null;
  fitTable: FitRow[];
  bestK: number | null;
  coveCounts: Counts | null;
  coveShare: number | null;
  coveAccuracy: number | null;
  combinedCounts: Counts | null;
  fairCounts: Counts | null;
  fairAccuracy: number | null;
  confusion: Record<Kind, Record<Kind, number>> | null;
  tableRight: number | null;
  report: Report | null;
}

export const EMPTY_DATA: Data = {
  mystery: null,
  truth: null,
  handGuess: null,
  handCorrect: null,
  pebbles: [],
  kindCounts: null,
  firstFeatures: null,
  toFirst: null,
  toOther: null,
  nnPebble: null,
  nnGuess: null,
  near3: [],
  tricky: null,
  trickyTruth: null,
  trickyNear: [],
  trickyVotes: null,
  trickyGuess: null,
  trickyK1: null,
  k: null,
  basketAccuracy: null,
  lazyAccuracy: null,
  trainSet: [],
  testSet: [],
  trainAccuracy: null,
  testAccuracy: null,
  memoTrain: null,
  memoTest: null,
  fitTable: [],
  bestK: null,
  coveCounts: null,
  coveShare: null,
  coveAccuracy: null,
  combinedCounts: null,
  fairCounts: null,
  fairAccuracy: null,
  confusion: null,
  tableRight: null,
  report: null,
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
export const asKind = (v: unknown): Kind | null => (typeof v === "string" && (KINDS as readonly string[]).includes(v) ? (v as Kind) : null);

function pebble(v: unknown): Pebble | null {
  if (!isObj(v)) return null;
  const flat = num(v.flat);
  const shine = num(v.shine);
  if (flat === null || shine === null || flat < 0 || flat > 10 || shine < 0 || shine > 10) return null;
  return { flat, shine, kind: asKind(v.kind) };
}

function pebbles(v: unknown): Pebble[] {
  if (!Array.isArray(v)) return [];
  const out: Pebble[] = [];
  for (const item of v) {
    const p = pebble(item);
    if (p) out.push(p);
  }
  return out;
}

function counts(v: unknown): Counts | null {
  if (!isObj(v)) return null;
  const out: Counts = {};
  let any = false;
  for (const kind of KINDS) {
    const n = num(v[kind]);
    if (n !== null) {
      out[kind] = n;
      any = true;
    }
  }
  return any ? out : null;
}

function confusion(v: unknown): Data["confusion"] {
  if (!isObj(v)) return null;
  const out = {} as Record<Kind, Record<Kind, number>>;
  for (const truth of KINDS) {
    const row = v[truth];
    if (!isObj(row)) return null;
    out[truth] = {} as Record<Kind, number>;
    for (const guess of KINDS) out[truth][guess] = num(row[guess]) ?? 0;
  }
  return out;
}

function fitTable(v: unknown): FitRow[] {
  if (!Array.isArray(v)) return [];
  const out: FitRow[] = [];
  for (const row of v) {
    if (!isObj(row)) continue;
    const k = num(row.k);
    const train = num(row.train);
    const test = num(row.test);
    if (k !== null && train !== null && test !== null) out.push({ k, train, test });
  }
  return out;
}

function report(v: unknown): Report | null {
  if (!isObj(v)) return null;
  const r = { k: num(v.k), testScore: num(v.test_score), basketScore: num(v.basket_score), mysteryGuess: str(v.mystery_guess) };
  return r.k === null && r.testScore === null && r.basketScore === null && r.mysteryGuess === null ? null : r;
}

/** How many steps apart two pebbles are (the lesson's distance), for drawing only. */
export const steps = (a: Pebble, b: Pebble) => Math.abs(a.flat - b.flat) + Math.abs(a.shine - b.shine);

export function readData(program: ProgramHandle | null): Data {
  if (!program) return EMPTY_DATA;
  const get = (name: string): unknown => {
    if (!program.has(name)) return undefined;
    // The handle exposes typed readers only; `list` and `dict` return [] / {} for the wrong shape,
    // `str`, `num` and `bool` fall back to the given default. Each is tried so any shape is readable.
    const asList = program.list(name);
    if (asList.length) return asList;
    const asDict = program.dict(name);
    if (Object.keys(asDict).length) return asDict;
    const n = program.num(name, Number.NaN);
    if (Number.isFinite(n)) return n;
    const s = program.str(name, "\u0000");
    if (s !== "\u0000") return s;
    return undefined;
  };
  // A real boolean reads the same whatever the fallback is; anything else follows the fallback.
  const bool = (name: string): boolean | null => {
    if (!program.has(name)) return null;
    const asTrue = program.bool(name, true);
    return asTrue === program.bool(name, false) ? asTrue : null;
  };
  const n = (name: string) => num(get(name));
  const s = (name: string) => str(get(name));
  const confusionTable = confusion(get("confusion_table"));
  return {
    mystery: pebble(get("mystery")),
    truth: s("truth"),
    handGuess: s("hand_guess"),
    handCorrect: bool("hand_correct"),
    pebbles: pebbles(get("PEBBLES")),
    kindCounts: counts(get("kind_counts")),
    firstFeatures: Array.isArray(get("first_features")) ? (get("first_features") as unknown[]).map((x) => num(x) ?? 0) : null,
    toFirst: n("to_first"),
    toOther: n("to_other"),
    nnPebble: pebble(get("nn_pebble")),
    nnGuess: s("nn_guess"),
    near3: pebbles(get("near3")),
    tricky: pebble(get("tricky")),
    trickyTruth: s("tricky_truth"),
    trickyNear: pebbles(get("tricky_near")),
    trickyVotes: counts(get("tricky_votes")),
    trickyGuess: s("tricky_guess"),
    trickyK1: s("tricky_k1"),
    k: n("K"),
    basketAccuracy: n("basket_accuracy"),
    lazyAccuracy: n("lazy_accuracy"),
    trainSet: pebbles(get("train_set")),
    testSet: pebbles(get("test_set")),
    trainAccuracy: n("train_accuracy"),
    testAccuracy: n("test_accuracy"),
    memoTrain: n("memo_train_accuracy"),
    memoTest: n("memo_test_accuracy"),
    fitTable: fitTable(get("fit_table")),
    bestK: n("best_k"),
    coveCounts: counts(get("cove_counts")),
    coveShare: n("cove_roller_share"),
    coveAccuracy: n("cove_accuracy"),
    combinedCounts: counts(get("combined_counts")),
    fairCounts: counts(get("fair_counts")),
    fairAccuracy: n("fair_accuracy"),
    confusion: confusionTable,
    tableRight: n("table_right"),
    report: report(get("report")),
  };
}
