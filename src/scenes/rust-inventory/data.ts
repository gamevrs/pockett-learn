import type { ProgramHandle } from "@/engine/program";

/**
 * What Corvid Peak Observatory reads from the learner's Rust program. A compiled program can't be
 * called back, so the observatory works from the values the program printed with
 * `scene("key", value)` (each one an `@scene {json}` line). Every value may be missing or the wrong
 * type: the readers below return `undefined` / empty lists instead of guessing, and never throw.
 *
 * A failed build arrives as `build_error` ({ type, message, line }) where `type` is the rustc error
 * code ("E0106"), "CompileError" for a syntax error without a code, or "Panic" for a crash.
 *
 * Pure module (no React).
 */

// ───────────────────────── safe readers ─────────────────────────

const SENTINEL = "\u0000__missing__";

/** The raw value for a key, or undefined. (ProgramHandle only has typed getters, so probe them.) */
export function readAny(p: ProgramHandle, key: string): unknown {
  if (!p.has(key)) return undefined;
  const n = p.num(key, Number.NaN);
  if (!Number.isNaN(n)) return n;
  const s = p.str(key, SENTINEL);
  if (s !== SENTINEL) return s;
  if (p.bool(key, true) === p.bool(key, false)) return p.bool(key, true);
  const list = p.list(key);
  if (list.length > 0) return list;
  const dict = p.dict(key);
  if (Object.keys(dict).length > 0) return dict;
  return list; // an empty array (or a null we cannot tell apart from one)
}

const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
export const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);
const arr = (v: unknown): unknown[] | undefined => (Array.isArray(v) ? v : undefined);
const strList = (v: unknown): string[] | undefined => arr(v)?.map((x) => (typeof x === "string" ? x : x === null || x === undefined ? "" : String(x)));
const numList = (v: unknown): number[] | undefined => arr(v)?.flatMap((x) => (num(x) === undefined ? [] : [x as number]));

// ───────────────────────── the model ─────────────────────────

export interface Slice {
  label: string;
  /** Byte offset into the buffer, or undefined when the text is NOT a slice of it (null in the data). */
  start: number | undefined;
  len: number;
}

export interface StarRec {
  name: string;
  constellation: string;
  ra: number;
  dec: number;
  mag: number;
  dist: number | undefined;
  nameStart: number | undefined;
  conStart: number | undefined;
}

export interface ErrSample {
  kind: string;
  message: string;
  debug: string;
  hasSource: boolean;
}

export type Via = "From" | "built" | "none";

export interface FunnelRow {
  input: string;
  variant: string;
  via: Via;
  message: string;
}

export interface QuickCheck {
  label: string;
  ok: boolean;
  text: string;
}

export interface LineResult {
  line: number;
  text: string;
  ok: boolean;
  error: string | undefined;
}

export type ClosureKind = "Fn" | "FnMut" | "FnOnce";

export interface ClosureCard {
  name: string;
  kind: ClosureKind | string;
  captures: string;
  result: string;
}

export interface Stage {
  stage: string;
  count: number;
}

export interface RankRow {
  rank: number;
  name: string;
  band: string;
  mag: number | undefined;
  dist: number | undefined;
}

export interface TestRow {
  name: string;
  ok: boolean;
  message: string;
}

export type LineKind = "comment" | "blank" | "record" | "error";

export interface FileLine {
  n: number;
  kind: LineKind;
  text: string;
}

export interface BuildError {
  type: string;
  message: string;
  line: number | null;
}

export interface Peak {
  // L1
  buffer?: string;
  /** L16: the whole stdin file; the records' offsets are relative to it (else to `buffer`) */
  fileText?: string;
  slices?: Slice[];
  copies?: string[];
  label?: string;
  // L2
  lifetime?: { first?: string; second?: string; winner?: string; winnerStart?: number; scratch?: string; kept?: string };
  // L3
  records?: StarRec[];
  // L4
  modules?: string[];
  moduleChecks?: string[];
  // L5
  errorSamples?: ErrSample[];
  // L6
  funnel?: FunnelRow[];
  quickChecks?: QuickCheck[];
  // L7
  lineResults?: LineResult[];
  // L8
  closures?: ClosureCard[];
  rack?: { filter: string; matches: number }[];
  // L9
  chain?: Stage[];
  shortlist?: string[];
  // L10
  totalLy?: number;
  nearest?: string;
  faintest?: string;
  byConstellation?: Record<string, string[]>;
  brightNames?: string[];
  dimNames?: string[];
  allOrNothing?: { tidy?: string; smudged?: string };
  // L11
  sweepHours?: number[];
  hourStars?: { hour: number; stars: number }[];
  // L12
  rows?: string[];
  summaryCard?: string;
  debugLine?: string;
  // L13
  ranking?: RankRow[];
  farthest?: string[];
  totals?: { stars?: number; totalLy?: number; nearest?: string; brilliant?: number; notes?: number };
  // L14
  tests?: TestRow[];
  testSummary?: { passed?: number; failed?: number };
  // L15
  fileLines?: FileLine[];
  intake?: { read?: number; comments?: number; blanks?: number; accepted?: number; rejected?: number };
  problems?: string[];
  // L16
  report?: {
    night?: number;
    read?: number;
    accepted?: number;
    rejected?: number;
    nearest?: string;
    faintest?: string;
    meanLy?: number;
    constellations?: Record<string, number>;
  };
  error: BuildError | null;
}

/** The keys shown on the "Scene data" tab, in lesson order. */
export const SCENE_KEYS = [
  "buffer", "slices", "copies", "label",
  "lifetimeDemo",
  "records",
  "modules", "moduleChecks",
  "errorSamples",
  "funnel", "quickChecks",
  "lineResults",
  "closures", "rack",
  "chain", "shortlist",
  "totalLy", "nearest", "faintest", "byConstellation", "brightNames", "dimNames", "allOrNothing",
  "sweepHours", "hourStars",
  "rows", "summaryCard", "debugLine",
  "ranking", "farthest", "totals",
  "tests", "testSummary", "fileText",
  "fileLines", "intake", "problems",
  "report",
] as const;

const optNum = (v: unknown): number | undefined => num(v);

function readRecs(v: unknown): StarRec[] | undefined {
  const list = arr(v);
  if (!list) return undefined;
  return list.flatMap((r): StarRec[] => {
    if (!isRec(r)) return [];
    const name = str(r.name);
    if (name === undefined) return [];
    return [
      {
        name,
        constellation: str(r.constellation) ?? "",
        ra: num(r.ra) ?? 0,
        dec: num(r.dec) ?? 0,
        mag: num(r.mag) ?? 5,
        dist: optNum(r.dist),
        nameStart: optNum(r.nameStart),
        conStart: optNum(r.conStart),
      },
    ];
  });
}

function readVia(v: unknown): Via {
  return v === "From" || v === "built" ? v : "none";
}

function readGroups(v: unknown): Record<string, string[]> | undefined {
  if (!isRec(v)) return undefined;
  const out: Record<string, string[]> = {};
  for (const [k, x] of Object.entries(v)) out[k] = strList(x) ?? [];
  return out;
}

function readCounts(v: unknown): Record<string, number> | undefined {
  if (!isRec(v)) return undefined;
  const out: Record<string, number> = {};
  for (const [k, x] of Object.entries(v)) {
    const n = num(x);
    if (n !== undefined) out[k] = n;
  }
  return out;
}

export function readPeak(p: ProgramHandle | null): Peak {
  const g = (k: string): unknown => (p ? readAny(p, k) : undefined);

  const err = g("build_error");
  const error: BuildError | null = isRec(err) ? { type: str(err.type) ?? "Error", message: str(err.message) ?? "", line: num(err.line) ?? null } : null;

  const lt = g("lifetimeDemo");
  const lifetime = isRec(lt)
    ? { first: str(lt.first), second: str(lt.second), winner: str(lt.winner), winnerStart: optNum(lt.winnerStart), scratch: str(lt.scratch), kept: str(lt.kept) }
    : undefined;

  const aon = g("allOrNothing");
  const tot = g("totals");
  const ts = g("testSummary");
  const ik = g("intake");
  const rp = g("report");

  return {
    buffer: str(g("buffer")),
    fileText: str(g("fileText")),
    slices: arr(g("slices"))?.flatMap((s): Slice[] => (isRec(s) ? [{ label: str(s.label) ?? "slice", start: optNum(s.start), len: Math.max(0, Math.floor(num(s.len) ?? 0)) }] : [])),
    copies: strList(g("copies")),
    label: str(g("label")),
    lifetime,
    records: readRecs(g("records")),
    modules: strList(g("modules")),
    moduleChecks: strList(g("moduleChecks")),
    errorSamples: arr(g("errorSamples"))?.flatMap((e): ErrSample[] =>
      isRec(e) ? [{ kind: str(e.kind) ?? "?", message: str(e.message) ?? "", debug: str(e.debug) ?? "", hasSource: bool(e.hasSource) ?? false }] : [],
    ),
    funnel: arr(g("funnel"))?.flatMap((f): FunnelRow[] => (isRec(f) ? [{ input: str(f.input) ?? "", variant: str(f.variant) ?? "?", via: readVia(f.via), message: str(f.message) ?? "" }] : [])),
    quickChecks: arr(g("quickChecks"))?.flatMap((q): QuickCheck[] => (isRec(q) ? [{ label: str(q.label) ?? "?", ok: bool(q.ok) ?? false, text: str(q.text) ?? "" }] : [])),
    lineResults: arr(g("lineResults"))?.flatMap((l): LineResult[] =>
      isRec(l) ? [{ line: num(l.line) ?? 0, text: str(l.text) ?? "", ok: bool(l.ok) ?? false, error: str(l.error) }] : [],
    ),
    closures: arr(g("closures"))?.flatMap((c): ClosureCard[] =>
      isRec(c) ? [{ name: str(c.name) ?? "closure", kind: str(c.kind) ?? "Fn", captures: str(c.captures) ?? "", result: str(c.result) ?? "" }] : [],
    ),
    rack: arr(g("rack"))?.flatMap((r) => (isRec(r) ? [{ filter: str(r.filter) ?? "filter", matches: num(r.matches) ?? 0 }] : [])),
    chain: arr(g("chain"))?.flatMap((s): Stage[] => (isRec(s) ? [{ stage: str(s.stage) ?? "?", count: Math.max(0, num(s.count) ?? 0) }] : [])),
    shortlist: strList(g("shortlist")),
    totalLy: num(g("totalLy")),
    nearest: str(g("nearest")),
    faintest: str(g("faintest")),
    byConstellation: readGroups(g("byConstellation")),
    brightNames: strList(g("brightNames")),
    dimNames: strList(g("dimNames")),
    allOrNothing: isRec(aon) ? { tidy: str(aon.tidy), smudged: str(aon.smudged) } : undefined,
    sweepHours: numList(g("sweepHours")),
    hourStars: arr(g("hourStars"))?.flatMap((h) => (isRec(h) && num(h.hour) !== undefined ? [{ hour: num(h.hour) as number, stars: num(h.stars) ?? 0 }] : [])),
    rows: strList(g("rows")),
    summaryCard: str(g("summaryCard")),
    debugLine: str(g("debugLine")),
    ranking: arr(g("ranking"))?.flatMap((r, i): RankRow[] =>
      isRec(r) ? [{ rank: num(r.rank) ?? i + 1, name: str(r.name) ?? "?", band: str(r.band) ?? "", mag: optNum(r.mag), dist: optNum(r.dist) }] : [],
    ),
    farthest: strList(g("farthest")),
    totals: isRec(tot)
      ? { stars: optNum(tot.stars), totalLy: optNum(tot.totalLy), nearest: str(tot.nearest), brilliant: optNum(tot.brilliant), notes: optNum(tot.notes) }
      : undefined,
    tests: arr(g("tests"))?.flatMap((t): TestRow[] => (isRec(t) ? [{ name: str(t.name) ?? "test", ok: bool(t.ok) ?? false, message: str(t.message) ?? "" }] : [])),
    testSummary: isRec(ts) ? { passed: optNum(ts.passed), failed: optNum(ts.failed) } : undefined,
    fileLines: arr(g("fileLines"))?.flatMap((l, i): FileLine[] => {
      if (!isRec(l)) return [];
      const k = str(l.kind);
      const kind: LineKind = k === "comment" || k === "blank" || k === "error" ? k : "record";
      return [{ n: num(l.n) ?? i + 1, kind, text: str(l.text) ?? "" }];
    }),
    intake: isRec(ik)
      ? { read: optNum(ik.read), comments: optNum(ik.comments), blanks: optNum(ik.blanks), accepted: optNum(ik.accepted), rejected: optNum(ik.rejected) }
      : undefined,
    problems: strList(g("problems")),
    report: isRec(rp)
      ? {
          night: optNum(rp.night),
          read: optNum(rp.read),
          accepted: optNum(rp.accepted),
          rejected: optNum(rp.rejected),
          nearest: str(rp.nearest),
          faintest: str(rp.faintest),
          meanLy: optNum(rp.meanLy),
          constellations: readCounts(rp.constellations),
        }
      : undefined,
    error,
  };
}

// ───────────────────────── formatting ─────────────────────────

export function fmtNum(v: number, digits = 2): string {
  if (Number.isInteger(v)) return Math.abs(v) >= 100000 ? v.toLocaleString("en-US") : String(v);
  return String(Number(v.toFixed(digits)));
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Output lines for the console, trimmed of a trailing empty line but keeping blank lines inside. */
export function outputLines(stdout: string): string[] {
  const lines = stdout.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** Splits `text` into [plain, slice, plain, ...] pieces by BYTE ranges (the program reports byte offsets). */
export interface Piece {
  text: string;
  /** index into the ranges array, or -1 for plain text */
  range: number;
}

export function sliceByBytes(text: string, ranges: { start: number; len: number }[]): Piece[] {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const bytes = enc.encode(text);
  const order = ranges
    .map((r, i) => ({ ...r, i }))
    .filter((r) => Number.isInteger(r.start) && r.start >= 0 && r.len > 0 && r.start + r.len <= bytes.length)
    .sort((a, b) => a.start - b.start || b.len - a.len);
  const out: Piece[] = [];
  let at = 0;
  for (const r of order) {
    if (r.start < at) continue; // overlapping: the earlier one wins
    if (r.start > at) out.push({ text: dec.decode(bytes.slice(at, r.start)), range: -1 });
    out.push({ text: dec.decode(bytes.slice(r.start, r.start + r.len)), range: r.i });
    at = r.start + r.len;
  }
  if (at < bytes.length) out.push({ text: dec.decode(bytes.slice(at)), range: -1 });
  return out;
}

export function textAtBytes(text: string, start: number, len: number): string | undefined {
  const bytes = new TextEncoder().encode(text);
  if (!Number.isInteger(start) || start < 0 || len < 0 || start + len > bytes.length) return undefined;
  return new TextDecoder().decode(bytes.slice(start, start + len));
}

// ───────────────────────── the panels ─────────────────────────

export interface Panel {
  id: string;
  title: string;
  short: string;
  lesson: number;
  /** The Rust idea behind the panel, shown on locked ghosts. */
  clause: string;
}

export const PANELS: Panel[] = [
  { id: "ob-buffer", title: "Input buffer", short: "Buffer", lesson: 1, clause: "&str · String · slices" },
  { id: "ob-lifetimes", title: "Lifetime scopes", short: "Lifetimes", lesson: 2, clause: "'a · E0106" },
  { id: "ob-records", title: "Parse pipeline", short: "Pipeline", lesson: 3, clause: "struct Record<'a>" },
  { id: "ob-modules", title: "Module map", short: "Modules", lesson: 4, clause: "mod · pub · use · super" },
  { id: "ob-variants", title: "Error ledger", short: "Errors", lesson: 5, clause: "enum · Display · Error" },
  { id: "ob-funnel", title: "Error funnel", short: "Funnel", lesson: 6, clause: "From · ? · Box<dyn Error>" },
  { id: "ob-lines", title: "Line desk", short: "Lines", lesson: 7, clause: "FromStr · line numbers" },
  { id: "ob-closures", title: "Instrument rack", short: "Closures", lesson: 8, clause: "Fn · FnMut · FnOnce" },
  { id: "ob-chain", title: "Adaptor chain", short: "Chain", lesson: 9, clause: "map · filter · enumerate" },
  { id: "ob-groups", title: "Aggregates", short: "Groups", lesson: 10, clause: "fold · collect · partition" },
  { id: "ob-sweep", title: "Drift scan", short: "Sweep", lesson: 11, clause: "impl Iterator" },
  { id: "ob-cards", title: "Report cards", short: "Cards", lesson: 12, clause: "Display · {:>8.2}" },
  { id: "ob-order", title: "Sort desk", short: "Sorting", lesson: 13, clause: "derive · sort_by · cmp" },
  { id: "ob-tests", title: "Test results", short: "Tests", lesson: 14, clause: "#[test] · assert_eq!" },
  { id: "ob-intake", title: "Intake bench", short: "Intake", lesson: 15, clause: "stdin · lines() · trim" },
  { id: "ob-report", title: "Night report", short: "Report", lesson: 16, clause: "your whole program" },
];

export const CONSOLE_ID = "ob-buffer";

/** A short live value for a panel's chip in the overview, or undefined when there is nothing to say yet. */
export function tileValue(id: string, s: Peak): string | undefined {
  switch (id) {
    case "ob-buffer":
      return s.buffer !== undefined ? `${new TextEncoder().encode(s.buffer).length} bytes` : undefined;
    case "ob-lifetimes":
      return s.lifetime?.winner ? `picked ${s.lifetime.winner}` : undefined;
    case "ob-records":
      return s.records ? plural(s.records.length, "record") : undefined;
    case "ob-modules":
      return s.modules ? plural(s.modules.length, "module") : undefined;
    case "ob-variants":
      return s.errorSamples ? plural(s.errorSamples.length, "variant") : undefined;
    case "ob-funnel": {
      if (!s.funnel) return undefined;
      const from = s.funnel.filter((f) => f.via === "From").length;
      return `${from} via From`;
    }
    case "ob-lines":
      return s.lineResults ? `${s.lineResults.filter((l) => l.ok).length}/${s.lineResults.length} ok` : undefined;
    case "ob-closures":
      return s.closures ? plural(s.closures.length, "closure") : undefined;
    case "ob-chain": {
      const c = s.chain;
      return c && c.length > 1 ? `${c[0].count} → ${c[c.length - 1].count}` : undefined;
    }
    case "ob-groups":
      return s.byConstellation ? plural(Object.keys(s.byConstellation).length, "group") : s.totalLy !== undefined ? `${fmtNum(s.totalLy)} ly` : undefined;
    case "ob-sweep":
      return s.sweepHours ? `${s.sweepHours.length} h swept` : undefined;
    case "ob-cards":
      return s.rows ? plural(s.rows.length, "row") : undefined;
    case "ob-order":
      return s.ranking && s.ranking[0] ? `#1 ${s.ranking[0].name}` : undefined;
    case "ob-tests": {
      const t = s.testSummary;
      if (t?.passed !== undefined) return `${t.passed}/${t.passed + (t.failed ?? 0)} ok`;
      return s.tests ? `${s.tests.filter((x) => x.ok).length}/${s.tests.length} ok` : undefined;
    }
    case "ob-intake":
      return s.intake?.accepted !== undefined ? `${s.intake.accepted} in · ${s.intake.rejected ?? 0} out` : undefined;
    case "ob-report":
      return s.report?.accepted !== undefined ? `${s.report.accepted} stars filed` : undefined;
    default:
      return undefined;
  }
}

/** Bands used for colouring stars everywhere. */
export type BandName = "brilliant" | "bright" | "dim";
export function bandOf(mag: number): BandName {
  return mag < 0.5 ? "brilliant" : mag < 1.5 ? "bright" : "dim";
}

// ───────────────────────── the module map ─────────────────────────

export interface ModItem {
  name: string;
  /** false = private to the module (and its children) */
  pub: boolean;
  note?: string;
}

/** Items per module are fixed by the lesson, so the map draws them statically. */
export const MODULE_ITEMS: Record<string, ModItem[]> = {
  main: [
    { name: "mod rules", pub: false },
    { name: "mod sky", pub: false },
    { name: "fn main", pub: false },
  ],
  "main::rules": [
    { name: "MAX_RA_HOURS", pub: true },
    { name: "ra_ok", pub: true },
    { name: "dec_ok", pub: true },
    { name: "mag_ok", pub: true },
    { name: "here", pub: true },
  ],
  "main::sky": [
    { name: "mod coords", pub: true },
    { name: "mod light", pub: true },
    { name: "here", pub: true },
  ],
  "main::sky::coords": [
    { name: "hours_to_degrees", pub: true },
    { name: "here", pub: true },
  ],
  "main::sky::light": [
    { name: "NAKED_EYE_LIMIT", pub: false, note: "private: only this module and its children can name it" },
    { name: "band", pub: true },
    { name: "naked_eye", pub: true, note: "reaches NAKED_EYE_LIMIT with self::" },
    { name: "bearing_for", pub: true, note: "calls super::coords::hours_to_degrees" },
    { name: "here", pub: true },
  ],
};

/** The tree the lesson builds, as the full list of paths (ghost nodes are drawn for the ones not yet reported). */
export const MODULE_TREE = ["main", "main::rules", "main::sky", "main::sky::coords", "main::sky::light"];

// ───────────────────────── compiler and panic messages ─────────────────────────

export type DiagramKind = "scope" | "borrow" | "move" | "path" | "closure" | "trait" | "types";

export interface Explained {
  kind: "compile" | "panic" | "other";
  /** "E0382", "Panic", or "" */
  code: string;
  headline: string;
  meaning: string;
  fixes: string[];
  diagram?: DiagramKind;
}

interface CodeInfo {
  headline: string;
  meaning: string;
  fixes: string[];
  diagram?: DiagramKind;
}

const CODES: Record<string, CodeInfo> = {
  E0106: {
    headline: "Missing lifetime specifier",
    meaning: "A function or struct hands out a reference, but the compiler cannot tell which input it borrows from. With two reference inputs (or none) it will not guess.",
    fixes: ["Name the lifetime and tie the result to the input it comes from: fn f<'a>(x: &'a str, y: &str) -> &'a str", "A struct that holds a &str needs its own parameter: struct Record<'a> { name: &'a str }", "Or return an owned String and skip the question"],
    diagram: "scope",
  },
  E0597: {
    headline: "Does not live long enough",
    meaning: "A reference is still being used after the value it points into was dropped at the end of its block.",
    fixes: ["Declare the owner in an outer scope so it outlives the reference", "Copy the part you need out with .to_string() before the block ends", "Move the code that uses the reference inside the block"],
    diagram: "scope",
  },
  E0515: {
    headline: "Returning a reference to a local",
    meaning: "The local variable is freed when the function returns, so a reference to it would dangle.",
    fixes: ["Return the owned value (String instead of &str)", "Return a slice of one of the arguments, which the caller still owns"],
    diagram: "scope",
  },
  E0621: {
    headline: "Explicit lifetime required",
    meaning: "The function promises to return something borrowed for 'a, but one of the arguments it might return has no 'a on its type.",
    fixes: ["Give the parameter the same lifetime: b: &'a str", "Or do not return that argument"],
    diagram: "scope",
  },
  E0716: {
    headline: "Temporary dropped too early",
    meaning: "A reference to a value that disappears at the end of the statement was kept for later.",
    fixes: ["Store the value in a let first, then borrow that variable"],
    diagram: "scope",
  },
  E0502: {
    headline: "Changing text that is still borrowed",
    meaning: "A record holds a slice of the buffer, and you tried to change the buffer (clear, push_str, ...) while that slice is still used afterwards.",
    fixes: ["Use the borrowed slice before you change the buffer", "Copy what you need into a String first", "Rebuild the records after the buffer changes"],
    diagram: "borrow",
  },
  E0505: {
    headline: "Moved while borrowed",
    meaning: "Something still holds a reference into the value, and you moved or dropped the value. The reference would point at nothing.",
    fixes: ["Finish using the reference before the move", "Borrow instead of moving", "Clone the part you need"],
    diagram: "move",
  },
  E0499: {
    headline: "Two mutable borrows at once",
    meaning: "A value may have only one &mut reference at a time.",
    fixes: ["Finish with the first &mut before taking the second", "Pass the one reference along"],
    diagram: "borrow",
  },
  E0382: {
    headline: "Used after it moved",
    meaning: "A value has one owner. Passing it by value (or calling a FnOnce closure) moves it, and the old name stops working.",
    fixes: ["Lend it instead: pass &value", "Call .clone() for a second independent copy", "A FnOnce closure can be called only once: call it a single time"],
    diagram: "move",
  },
  E0507: {
    headline: "Cannot move out of a borrow",
    meaning: "You tried to take ownership of something you only borrow, such as a captured variable inside a Fn closure or an item behind a reference.",
    fixes: ["Borrow it: &name", "Clone it: name.clone()", "If the closure must consume the value, it is FnOnce: accept FnOnce, not Fn"],
    diagram: "closure",
  },
  E0596: {
    headline: "Not declared mutable",
    meaning: "Changing something through a name declared without mut. A closure that changes a captured variable is FnMut, and calling it needs a mutable binding.",
    fixes: ["Write let mut bump = || count += 1;", "Add mut to the variable you change"],
    diagram: "closure",
  },
  E0373: {
    headline: "Closure may outlive its borrow",
    meaning: "A closure borrows a local variable but is returned or stored somewhere that outlives the function. The variable would be gone.",
    fixes: ["Add move before the closure: Box::new(move |x| x * factor)"],
    diagram: "closure",
  },
  E0603: {
    headline: "That item is private",
    meaning: "Things inside a module are private by default. Code outside the module can only name what is marked pub.",
    fixes: ["Mark the item pub inside its module", "Or call it through a pub function of that module"],
    diagram: "path",
  },
  E0616: {
    headline: "That field is private",
    meaning: "A struct field is private to its module unless it is marked pub.",
    fixes: ["Mark the field pub", "Or add a pub method that returns it"],
    diagram: "path",
  },
  E0624: {
    headline: "That method is private",
    meaning: "A method in an impl is private to its module unless marked pub.",
    fixes: ["Mark the method pub fn", "Call it from inside the module"],
    diagram: "path",
  },
  E0425: {
    headline: "Name not found",
    meaning: "No variable or function with that name is in scope. A function inside a module needs its path (module::name) or a use line.",
    fixes: ["Check spelling", "Write the path: sky::coords::hours_to_degrees(...)", "Or bring it in: use sky::coords::hours_to_degrees;"],
    diagram: "path",
  },
  E0433: {
    headline: "Unknown module or type",
    meaning: "A path starts with a name the compiler does not know: a module you did not declare, or a type that needs a use line.",
    fixes: ["Declare the module: mod report { ... }", "Add the use line for std types (use std::collections::BTreeMap;)", "Check capital letters and spelling"],
    diagram: "path",
  },
  E0432: {
    headline: "Unresolved import",
    meaning: "A use line points to something that does not exist (or is not pub).",
    fixes: ["Compare the path with the module's items", "Check spelling: the compiler often suggests the near name"],
    diagram: "path",
  },
  E0412: {
    headline: "Unknown type",
    meaning: "The type name is not in scope here. Types inside a module need a path or a use line.",
    fixes: ["Write the full path or add use", "Check spelling"],
    diagram: "path",
  },
  E0277: {
    headline: "Trait not satisfied",
    meaning: "The code needs a capability the type lacks. Common cases here: ? cannot convert the error (implement From), {} needs Display, {:?} needs Debug, f64 has no Ord (use total_cmp), collect needs matching item types.",
    fixes: ["impl From<ParseIntError> for CatalogError so ? can convert", "impl fmt::Display (and Error) for your error type", "#[derive(Debug)] for {:?}", "Sort floats with total_cmp, not sort() or max()"],
    diagram: "trait",
  },
  E0369: {
    headline: "Operator not supported",
    meaning: "== , + or another operator is not implemented for this type.",
    fixes: ["#[derive(PartialEq)] to compare your own types", "Or write impl PartialEq by hand"],
    diagram: "trait",
  },
  E0046: {
    headline: "Trait item missing",
    meaning: "An impl block must supply everything the trait requires. For Iterator that is type Item and fn next.",
    fixes: ["Add type Item = u32;", "Add fn next(&mut self) -> Option<Self::Item>"],
    diagram: "trait",
  },
  E0053: { headline: "Signature differs from the trait", meaning: "The method does not match the trait's declaration.", fixes: ["Copy the signature from the trait: fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result"], diagram: "trait" },
  E0599: {
    headline: "No such method",
    meaning: "The type has no method with that name, or the trait that provides it is not in scope (for example Error::source needs use std::error::Error).",
    fixes: ["Check spelling", "Bring the trait into scope with use", "A method on Option / Result may need unwrapping first"],
    diagram: "trait",
  },
  E0282: { headline: "Type annotations needed", meaning: "The compiler cannot work out a type, usually the target of collect() or parse().", fixes: ["Annotate: let names: Vec<&str> = ...collect();", "Or use the turbofish: .collect::<Vec<_>>()"], diagram: "types" },
  E0283: { headline: "Type annotations needed", meaning: "Several types would fit, so choose one.", fixes: ["let total: u32 = ....sum();", "Or .sum::<u32>()"], diagram: "types" },
  E0308: {
    headline: "Mismatched types",
    meaning: "A value of one type was used where another is expected. Rust never converts silently.",
    fixes: ["Convert on purpose: as f64, .to_string(), Some(x)", "Check both branches give the same type", "Look for a stray semicolon turning a value into ()"],
    diagram: "types",
  },
  E0061: { headline: "Wrong number of arguments", meaning: "The call passes more or fewer values than the function declares.", fixes: ["Compare the call with the parameter list"] },
  E0063: { headline: "Missing struct field", meaning: "A struct literal has to give every field a value.", fixes: ["Add the missing field", "Or finish with ..Default::default() if the type derives Default"] },
  E0560: { headline: "Struct has no such field", meaning: "A struct literal names a field the struct does not have.", fixes: ["Check the field names"] },
  E0609: { headline: "No such field", meaning: "The type has no field with that name.", fixes: ["Check spelling", "Tuple structs use .0"] },
  E0004: { headline: "match must cover every case", meaning: "Some variants have no arm.", fixes: ["Add the missing arms", "Or add _ => ..."] },
  E0384: { headline: "Assigned twice to an immutable variable", meaning: "let bindings are read-only unless declared with mut.", fixes: ["Write let mut name = ..."] },
  E0381: { headline: "Used before it has a value", meaning: "A variable declared without a value was read before every path assigned it.", fixes: ["Assign it on every branch before using it"] },
  E0423: { headline: "Expected something else", meaning: "A macro or struct name was used like a function. A missing ! is the classic case.", fixes: ["println!(...) needs the !"] },
  E0614: { headline: "Cannot dereference", meaning: "The * operator needs a reference.", fixes: ["Remove the *"] },
  E0600: { headline: "Operator on the wrong type", meaning: "! or - was used on a type that does not support it.", fixes: ["Check the type of the operand"] },
};

const PANICS: { test: RegExp; headline: string; meaning: string; fixes: string[] }[] = [
  {
    test: /called `Result::unwrap\(\)` on an `Err` value|called `Result::expect|Err value/i,
    headline: "unwrap on an Err",
    meaning: "A Result held an error and unwrap (or expect) turned it into a crash. The Debug text after the colon is the error value.",
    fixes: ["match on Ok / Err and report the failure", "Return the error to the caller with ?", "In tests, unwrap is fine: the failing test is the signal"],
  },
  {
    test: /called `Option::unwrap\(\)` on a `None` value|`None` value/i,
    headline: "unwrap on None",
    meaning: "The code assumed a value would be there and it was missing.",
    fixes: ["Handle both cases with match or if let", "unwrap_or(default) when a default makes sense"],
  },
  {
    test: /byte index .*(is not a char boundary|is out of bounds)|char boundary|out of range for slice|begin <= end/i,
    headline: "Slice cut in the wrong place",
    meaning: "A text slice started or ended inside a multi-byte character, or past the end. Slices count bytes, not characters.",
    fixes: ["Take offsets from find / split_once / char_indices", "Use .get(a..b), which returns an Option instead of panicking"],
  },
  {
    test: /index out of bounds/i,
    headline: "Index out of bounds",
    meaning: "The program asked for an item beyond the end of a Vec or slice. Rust checks every index.",
    fixes: ["Use .get(i) and match the Option", "Check .len() first"],
  },
  {
    test: /attempt to (add|subtract|multiply|negate|shift) .*overflow/i,
    headline: "Arithmetic overflow",
    meaning: "A number went past the largest or smallest value its type holds. Subtracting from a usize that is too small is a common cause.",
    fixes: ["Use checked_sub / saturating_sub", "Use a wider type"],
  },
  {
    test: /divide by zero|remainder with a divisor of zero/i,
    headline: "Division by zero",
    meaning: "An integer was divided by zero.",
    fixes: ["Check the divisor first", "Use checked_div"],
  },
  {
    test: /assertion/i,
    headline: "An assertion failed",
    meaning: "assert! or assert_eq! saw a false condition. In a test, this is exactly how a failure is reported.",
    fixes: ["Compare the left and right values printed above", "Fix the code under test, or the expectation if it was wrong"],
  },
];

const SYNTAX: { test: RegExp; headline: string; meaning: string; fixes: string[] }[] = [
  { test: /expected `;`|expected one of .*`;`/i, headline: "A semicolon is missing", meaning: "Statements end with ;. The error is often reported on the line after the one that needs it.", fixes: ["Look at the end of this line and the one above it"] },
  { test: /unclosed delimiter|unexpected closing delimiter/i, headline: "Unbalanced braces", meaning: "A { ( or [ has no partner, or there is an extra closing one.", fixes: ["Match every opener with a closer", "Check the block above the reported line"] },
  { test: /cannot find macro/i, headline: "Unknown macro", meaning: "Macros end in !. Check the spelling.", fixes: ["println!, format!, write!, vec!, matches!"] },
  { test: /unterminated double quote|unknown start of token|unterminated/i, headline: "A string is not closed", meaning: "A double quote is missing its partner, or a stray character is in the code.", fixes: ["Close the string with a second \"", "Remove the unexpected character"] },
  { test: /positional argument|argument never used|format string/i, headline: "Format string and values do not match", meaning: "Each {} needs one value after the string, and every value needs a {}.", fixes: ["Count the {} holes and the values", "Write {{ and }} for literal braces"] },
  { test: /expected item|expected identifier|unexpected token/i, headline: "The code could not be read here", meaning: "A word or symbol is in a place where Rust did not expect it.", fixes: ["Look at the line number and the one before", "Check braces and commas"] },
];

/** Explains a build_error for the compiler panel: plain meaning, usual fixes, optional diagram. */
export function explainError(error: BuildError): Explained {
  const type = error.type;
  if (/^E\d{4}$/.test(type)) {
    const info = CODES[type];
    return info
      ? { kind: "compile", code: type, ...info }
      : {
          kind: "compile",
          code: type,
          headline: "The compiler stopped here",
          meaning: `rustc reported error ${type}. Read the message, check the line number, and open the Rust error index if the wording is not enough.`,
          fixes: ["Fix the first error first: later ones are often a result of it", `Search the Rust error index for ${type}`],
        };
  }
  if (type === "Panic") {
    const p = PANICS.find((x) => x.test.test(error.message));
    return p
      ? { kind: "panic", code: "Panic", headline: p.headline, meaning: p.meaning, fixes: p.fixes }
      : { kind: "panic", code: "Panic", headline: "The program panicked", meaning: "Rust stopped the program on purpose because something went wrong. The message says what, and the line number says where.", fixes: ["Read the message", "Find the unwrap(), expect(), index or arithmetic on that line"] };
  }
  if (type === "CompileError") {
    const s = SYNTAX.find((x) => x.test.test(error.message));
    return s
      ? { kind: "compile", code: "", headline: s.headline, meaning: s.meaning, fixes: s.fixes }
      : { kind: "compile", code: "", headline: "The compiler stopped here", meaning: "The code could not be read as Rust. Look at the line number, and at the line before it.", fixes: ["Check for a missing ; , brace or quote", "Fix the first error first"] };
  }
  if (/time|too long|timed out/i.test(error.message)) {
    return { kind: "other", code: "", headline: "The program ran for too long", meaning: "It did not finish in time. Look for a loop that never ends.", fixes: ["Check that loop conditions change", "Make sure break is reachable"] };
  }
  return { kind: "other", code: "", headline: "The program stopped", meaning: "It could not finish. The message above says why.", fixes: ["Read the message", "Press Run again after a change"] };
}
