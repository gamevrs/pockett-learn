import type { ProgramHandle } from "@/engine/program";

/**
 * What the Gopher Post sorting floor reads from the learner's Go program. A compiled program can't
 * be called back, so the floor works from the values the program printed with `scene("key", value)`
 * (each one an `@scene {json}` line) plus its plain output. Every value may be missing or the wrong
 * type: the readers below return `undefined` instead of guessing and never throw.
 *
 * Pure module (no React) so it can be reasoned about on its own.
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

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => !!v && typeof v === "object" && !Array.isArray(v);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);
const arr = (v: unknown): unknown[] | undefined => (Array.isArray(v) ? v : undefined);
const strList = (v: unknown): string[] | undefined => arr(v)?.map((x) => (typeof x === "string" ? x : x === null || x === undefined ? "" : String(x)));
const numList = (v: unknown): number[] | undefined => arr(v)?.flatMap((x) => (num(x) === undefined ? [] : [x as number]));
const numRec = (v: unknown): Record<string, number> | undefined => {
  if (!isRec(v)) return undefined;
  const out: Record<string, number> = {};
  for (const [k, x] of Object.entries(v)) {
    const n = num(x);
    if (n !== undefined) out[k] = n;
  }
  return out;
};
const strRec = (v: unknown): Record<string, string> | undefined => {
  if (!isRec(v)) return undefined;
  const out: Record<string, string> = {};
  for (const [k, x] of Object.entries(v)) if (typeof x === "string") out[k] = x;
  return out;
};

/** Field of a decoded Go struct/map, matched case-insensitively (Go sends `ID`, tagged structs send `id`). */
function field(o: Rec, name: string): unknown {
  if (name in o) return o[name];
  const want = name.toLowerCase();
  for (const k of Object.keys(o)) if (k.toLowerCase() === want) return o[k];
  return undefined;
}

// ───────────────────────── the model ─────────────────────────

export interface RejectRow {
  id: string;
  reason: string;
  message: string;
}

export interface ParcelRow {
  id: string;
  region: string;
  grams: number | undefined;
}

export interface VanRow {
  name: string;
  region: string;
  limit: number;
  loaded: number;
  parcels: string[];
}

export interface RouteRow {
  id: string;
  chute: string;
  lane: string;
}

export interface EntryRow {
  id: string;
  chute: string;
  lane: string;
  kg: number | undefined;
}

export interface BuildError {
  type: string;
  message: string;
  line: number | null;
}

export interface Hub {
  plate: {
    hubName?: string;
    shift?: number;
    beltSpeed?: number;
    open?: boolean;
    maxGrams?: number;
    regionCount?: number;
    regionCodes?: Record<string, number>;
    processed?: number;
    rejected?: number;
    note?: string;
    jammed?: boolean;
    kinds?: Record<string, string>;
  };
  bay: { bayParcels?: number; vanSize?: number; vansNeeded?: number; lastLoad?: number; avgKg?: number; feeCents?: number; feeText?: string; tiny?: number; floatSum?: number };
  scanner: { parcelID?: string; region?: string; grams?: number; badText?: string; badError?: string };
  gate: { handling?: string; class?: string; chute?: string; lane?: string; accepted?: boolean };
  belt: { processed?: number; unreadable?: number; totalGrams?: number; heaviest?: number; digits?: number; rampSteps?: number };
  queue: { rows?: number; queue?: string[]; weights?: number[]; capSteps?: number[]; chuteLabels?: string[]; backupFirst?: string; leaked?: number; untouched?: number };
  chutes: { tally?: Record<string, number>; gramsBy?: Record<string, number>; unknown?: Record<string, number>; sortedNames?: string[]; missing?: number; known?: boolean };
  weigh: { classCounts?: Record<string, number>; batchCount?: number; batchTotal?: number; batchHeaviest?: number; batchKg?: number; firstOK?: boolean; badOK?: boolean };
  rejects: { rejects?: RejectRow[]; reasons?: Record<string, number>; rejected?: number; passed?: number; sameDirect?: boolean; sameIs?: boolean };
  vans: { parcels?: ParcelRow[]; vans?: VanRow[]; overflow?: string[]; trialLoaded?: number; trialLoadedPtr?: number };
  routers: { routes?: RouteRow[]; regionNames?: string[] };
  sorter: { byWeight?: string[]; byRegion?: string[]; tags?: string[]; bigIDs?: string[] };
  safety: { closeSteps?: string[]; caught?: string[] };
  manifest: { manifest?: unknown; entries?: EntryRow[]; jsonBytes?: number; roundTrip?: boolean; compact?: string };
  shift: { report?: Report; balanced?: boolean };
  error: BuildError | null;
}

export interface Report {
  hub?: string;
  shift?: number;
  sorted?: number;
  rejected?: number;
  overflow?: number;
  revenue?: string;
  heaviest?: string;
  perChute?: Record<string, number>;
  reasons?: Record<string, number>;
}

/** The keys shown on the "Scene data" tab, in lesson order. */
export const SCENE_KEYS = [
  "hubName", "shift", "beltSpeed", "open", "maxGrams", "regionCount", "regionCodes", "processed", "rejected", "note", "jammed", "kinds",
  "bayParcels", "vanSize", "vansNeeded", "lastLoad", "avgKg", "feeCents", "feeText", "tiny", "floatSum",
  "parcelID", "region", "grams", "badText", "badError",
  "handling", "class", "chute", "lane", "accepted",
  "unreadable", "totalGrams", "heaviest", "digits", "rampSteps",
  "rows", "queue", "weights", "capSteps", "chuteLabels", "backupFirst", "leaked", "untouched",
  "tally", "gramsBy", "unknown", "sortedNames", "missing", "known",
  "classCounts", "batchCount", "batchTotal", "batchHeaviest", "batchKg", "firstOK", "badOK",
  "rejects", "reasons", "passed", "sameDirect", "sameIs",
  "parcels", "vans", "overflow", "trialLoaded", "trialLoadedPtr",
  "routes", "regionNames",
  "byWeight", "byRegion", "tags", "bigIDs",
  "closeSteps", "caught",
  "manifest", "jsonBytes", "roundTrip", "compact",
  "report", "balanced",
] as const;

export function readHub(p: ProgramHandle | null): Hub {
  const g = (k: string): unknown => (p ? readAny(p, k) : undefined);

  const rejects = arr(g("rejects"))?.flatMap((r): RejectRow[] => {
    if (!isRec(r)) return [];
    return [{ id: str(field(r, "id")) ?? "?", reason: str(field(r, "reason")) ?? "other", message: str(field(r, "message")) ?? "" }];
  });

  const parcels = arr(g("parcels"))?.flatMap((r): ParcelRow[] => {
    if (!isRec(r)) return [];
    return [{ id: str(field(r, "id")) ?? "?", region: str(field(r, "region")) ?? "", grams: num(field(r, "grams")) }];
  });

  const vans = arr(g("vans"))?.flatMap((r): VanRow[] => {
    if (!isRec(r)) return [];
    return [
      {
        name: str(field(r, "name")) ?? "Van",
        region: (str(field(r, "region")) ?? "").toLowerCase(),
        limit: num(field(r, "limit")) ?? 0,
        loaded: num(field(r, "loaded")) ?? 0,
        parcels: strList(field(r, "parcels")) ?? [],
      },
    ];
  });

  const routes = arr(g("routes"))?.flatMap((r): RouteRow[] => {
    if (!isRec(r)) return [];
    return [{ id: str(field(r, "id")) ?? "?", chute: str(field(r, "chute")) ?? "?", lane: str(field(r, "lane")) ?? "" }];
  });

  const m = g("manifest");
  const entries = isRec(m)
    ? arr(field(m, "entries"))?.flatMap((r): EntryRow[] => {
        if (!isRec(r)) return [];
        return [{ id: str(field(r, "id")) ?? "?", chute: str(field(r, "chute")) ?? "?", lane: str(field(r, "lane")) ?? "", kg: num(field(r, "kg")) }];
      })
    : undefined;

  const rep = g("report");
  const report: Report | undefined = isRec(rep)
    ? {
        hub: str(field(rep, "hub")),
        shift: num(field(rep, "shift")),
        sorted: num(field(rep, "sorted")),
        rejected: num(field(rep, "rejected")),
        overflow: num(field(rep, "overflow")),
        revenue: str(field(rep, "revenue")),
        heaviest: str(field(rep, "heaviest")),
        perChute: numRec(field(rep, "perChute")),
        reasons: numRec(field(rep, "reasons")),
      }
    : undefined;

  const err = g("build_error");
  const error: BuildError | null = isRec(err)
    ? { type: str(err.type) ?? "Error", message: str(err.message) ?? "", line: num(err.line) ?? null }
    : null;

  return {
    plate: {
      hubName: str(g("hubName")),
      shift: num(g("shift")),
      beltSpeed: num(g("beltSpeed")),
      open: bool(g("open")),
      maxGrams: num(g("maxGrams")),
      regionCount: num(g("regionCount")),
      regionCodes: numRec(g("regionCodes")),
      processed: num(g("processed")),
      rejected: num(g("rejected")),
      note: str(g("note")),
      jammed: bool(g("jammed")),
      kinds: strRec(g("kinds")),
    },
    bay: {
      bayParcels: num(g("bayParcels")), vanSize: num(g("vanSize")), vansNeeded: num(g("vansNeeded")), lastLoad: num(g("lastLoad")),
      avgKg: num(g("avgKg")), feeCents: num(g("feeCents")), feeText: str(g("feeText")), tiny: num(g("tiny")), floatSum: num(g("floatSum")),
    },
    scanner: { parcelID: str(g("parcelID")), region: str(g("region")), grams: num(g("grams")), badText: str(g("badText")), badError: str(g("badError")) },
    gate: { handling: str(g("handling")), class: str(g("class")), chute: str(g("chute")), lane: str(g("lane")), accepted: bool(g("accepted")) },
    belt: {
      processed: num(g("processed")), unreadable: num(g("unreadable")), totalGrams: num(g("totalGrams")),
      heaviest: num(g("heaviest")), digits: num(g("digits")), rampSteps: num(g("rampSteps")),
    },
    queue: {
      rows: num(g("rows")), queue: strList(g("queue")), weights: numList(g("weights")), capSteps: numList(g("capSteps")),
      chuteLabels: strList(g("chuteLabels")), backupFirst: str(g("backupFirst")), leaked: num(g("leaked")), untouched: num(g("untouched")),
    },
    chutes: { tally: numRec(g("tally")), gramsBy: numRec(g("gramsBy")), unknown: numRec(g("unknown")), sortedNames: strList(g("sortedNames")), missing: num(g("missing")), known: bool(g("known")) },
    weigh: {
      classCounts: numRec(g("classCounts")), batchCount: num(g("batchCount")), batchTotal: num(g("batchTotal")), batchHeaviest: num(g("batchHeaviest")),
      batchKg: num(g("batchKg")), firstOK: bool(g("firstOK")), badOK: bool(g("badOK")),
    },
    rejects: { rejects, reasons: numRec(g("reasons")), rejected: num(g("rejected")), passed: num(g("passed")), sameDirect: bool(g("sameDirect")), sameIs: bool(g("sameIs")) },
    vans: { parcels, vans, overflow: strList(g("overflow")), trialLoaded: num(g("trialLoaded")), trialLoadedPtr: num(g("trialLoadedPtr")) },
    routers: { routes, regionNames: strList(g("regionNames")) },
    sorter: { byWeight: strList(g("byWeight")), byRegion: strList(g("byRegion")), tags: strList(g("tags")), bigIDs: strList(g("bigIDs")) },
    safety: { closeSteps: strList(g("closeSteps")), caught: strList(g("caught")) },
    manifest: { manifest: m, entries, jsonBytes: num(g("jsonBytes")), roundTrip: bool(g("roundTrip")), compact: str(g("compact")) },
    shift: { report, balanced: bool(g("balanced")) },
    error,
  };
}

/** True when the program printed at least one of these keys' worth of data. */
export const hasValues = (o: object): boolean => Object.values(o).some((v) => v !== undefined);

// ───────────────────────── formatting ─────────────────────────

export function fmtNum(v: number, digits = 2): string {
  if (Number.isInteger(v)) return Math.abs(v) >= 100000 ? v.toLocaleString("en-US") : String(v);
  return String(Number(v.toFixed(digits)));
}

export const kgText = (grams: number): string => `${fmtNum(grams / 1000)} kg`;

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Output lines for the console, trimmed of a trailing empty line but keeping blank lines inside. */
export function outputLines(stdout: string): string[] {
  const lines = stdout.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

// ───────────────────────── floor geometry helpers ─────────────────────────

export const DEFAULT_LABELS = ["A", "B", "C", "D"];
export const DEFAULT_REGIONS = ["North", "South", "East", "West"];

/** Region names ordered by their iota code, from regionNames or regionCodes, else the defaults. */
export function regionNamesOf(h: Hub): string[] {
  const names = h.routers.regionNames;
  if (names && names.length > 0) return names.slice(0, 4);
  const codes = h.plate.regionCodes;
  if (codes && Object.keys(codes).length > 0) {
    return Object.entries(codes)
      .sort((a, b) => a[1] - b[1])
      .map(([k]) => k)
      .slice(0, 4);
  }
  return DEFAULT_REGIONS;
}

export function chuteLabelsOf(h: Hub): string[] {
  const l = h.queue.chuteLabels;
  return l && l.length >= 4 ? l.slice(0, 4) : DEFAULT_LABELS;
}

// ───────────────────────── compiler messages ─────────────────────────

export interface Diagnostic {
  /** "12:5", or "" when the message has no position. */
  where: string;
  text: string;
}

/** Parses Go lines like `./main.go:12:5: declared and not used: x`. Banner lines such as `# command-line-arguments` are dropped. */
export function parseDiagnostics(message: string): Diagnostic[] {
  return message
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"))
    .map((l): Diagnostic => {
      const m = /^(?:.*?)[\w.-]*\.go:(\d+):(\d+):\s*(.*)$/.exec(l);
      if (m) return { where: `${m[1]}:${m[2]}`, text: m[3] };
      return { where: "", text: l };
    });
}

const ADVICE: [RegExp, string][] = [
  [/declared and not used/, "Go refuses variables that are declared but never used. Use the value (print it, pass it to scene) or delete the line."],
  [/imported and not used/, "An import nobody uses is an error. Remove the import, or use the package."],
  [/undefined: /, "That name does not exist here. Check the spelling and capital letters, and that it is declared above this line and in scope."],
  [/no new variables on left side of :=/, "The := form needs at least one NEW name. Use = to assign to a variable that already exists."],
  [/missing return/, "Not every path through this function returns a value. End it with a return."],
  [/mismatched types/, "Go never mixes types silently. Convert one side on purpose, for example float64(count)."],
  [/cannot use .* as .* value/, "The value's type does not fit where you are putting it. Convert it, or change the declaration."],
  [/cannot convert/, "That conversion is not allowed. Check both types."],
  [/non-boolean condition/, "An if or for condition must be a bool. Compare with ==, !=, < and so on."],
  [/assignment mismatch/, "The number of names on the left does not match the values the right-hand side returns."],
  [/not enough arguments|too many arguments/, "The call has the wrong number of arguments. Check the function's signature."],
  [/does not implement/, "A type only satisfies an interface when it has every method with the exact signature. Check the receiver and spelling."],
  [/syntax error/, "The compiler could not read this line. Look for a missing brace, parenthesis, comma or quote on this line or the one above."],
  [/expected .*, found|unexpected /, "A symbol is missing or in the wrong place. Check this line and the one before it."],
  [/redeclared|already declared/, "That name is already used in this scope. Choose another name, or assign with =."],
  [/invalid operation/, "That operator cannot be used with these types."],
  [/has no field or method|undefined \(type/, "That value has no field or method with that name. Check spelling and capitals: only capitalised names are visible outside a package."],
  [/cannot assign to|cannot take the address/, "That value cannot be changed or addressed. Assign to a variable instead."],
  [/invalid argument: index/, "A constant index is outside the array's size."],
];

export function adviceFor(text: string): string | undefined {
  return ADVICE.find(([re]) => re.test(text))?.[1];
}

/** Extra advice for runtime panics, from the first lines of the crash report. */
export function runtimeAdvice(message: string): string | undefined {
  if (/nil pointer dereference/.test(message)) return "A pointer was nil when you used it. Check for nil first, or make sure the value is created before the call.";
  if (/index out of range/.test(message)) return "An index was outside 0 to len-1. Check your loop bounds (< len, not <=) before indexing.";
  if (/slice bounds out of range/.test(message)) return "A slice expression went past the end. Check lo <= hi <= cap.";
  if (/assignment to entry in nil map/.test(message)) return "Writing to a nil map panics. Create it first with make(map[K]V) or a literal.";
  if (/integer divide by zero/.test(message)) return "An integer was divided by zero. Check the divisor first.";
  if (/all goroutines are asleep/.test(message)) return "Every goroutine is blocked waiting. Something never sends or never receives.";
  if (/interface conversion/.test(message)) return "A value was asserted to a type it does not hold. Use the two-value form v, ok := x.(T).";
  if (/TimeLimit|timed out|too long/i.test(message)) return "The program ran for too long. Look for a loop that never ends.";
  if (/^panic:/m.test(message)) return "The program called panic (or hit a runtime error). The first line says why; the line number points at the code.";
  return undefined;
}
