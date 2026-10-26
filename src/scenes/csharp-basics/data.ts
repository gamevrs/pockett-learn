import type { ProgramHandle } from "@/engine/program";

/**
 * What the depot board reads from the learner's C# program. A compiled program can't be called
 * back, so the board works from the values the program printed with `Depot.Show("key", value)`
 * (each one an `@scene {json}` line). Every value may be missing or the wrong type: the readers
 * below return `undefined` instead of guessing.
 *
 * Pure module (no React) so it can be reasoned about and tested on its own.
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

// ───────────────────────── the model ─────────────────────────

export interface FleetRobot {
  name: string;
  battery: number;
  meters: number;
  needsCharge: boolean;
}

export interface ParcelRow {
  id: string;
  destination: string;
  kg: number | undefined;
  status: string;
}

export interface Incident {
  kind: string;
  message: string;
}

export interface BuildError {
  type: string;
  message: string;
  line: number | null;
}

export interface Depot {
  robot: { name?: string; battery?: number; maxBattery?: number; speed?: number; online?: boolean; grade?: string; cycles?: number };
  dispatch: { parcels?: number; crateSize?: number; trips?: number; leftover?: number; avgKg?: number; fee?: number; wrapped?: number; safe?: number };
  label: { customer?: string; destination?: string; weightKg?: number; code?: string; extraText?: string; extraOk?: boolean };
  rules: { tier?: string; shiftName?: string; chargeState?: string; canDeliver?: boolean; hours?: string };
  patrol: { floorMap?: string; meters?: number; lapsOnCharge?: number; docksVisited?: number };
  shelves: { slots?: (string | null)[]; filled?: number; queue?: string[]; weights?: number[]; heaviest?: number; totalWeight?: number };
  stock: { stock?: Record<string, number>; lowStock?: string[] };
  routes: { legs?: string[]; totalMeters?: number; totalMinutes?: number; fastMinutes?: number };
  scanner: { scans?: string[]; unclaimed?: number; noteLength?: number };
  fleet: { fleet?: FleetRobot[] };
  parcels: { list?: ParcelRow[]; statusCounts?: Record<string, number>; sameValues?: boolean };
  safety: { incidents?: Incident[]; loaded?: number };
  shift: { report?: { delivered?: number; rejected?: number; revenue?: number; busiestStop?: string } };
  error: BuildError | null;
}

/** The keys shown on the "Scene data" tab, in lesson order. */
export const SCENE_KEYS = [
  "robotName", "battery", "maxBattery", "speed", "online", "grade", "chargeCycles",
  "parcels", "crateSize", "trips", "leftover", "avgKg", "fee", "wrapped", "safe",
  "customer", "destination", "weightKg", "code", "extraText", "extraOk",
  "tier", "shiftName", "chargeState", "canDeliver", "hours",
  "meters", "lapsOnCharge", "floorMap", "docksVisited",
  "slots", "filled", "queue", "weights", "heaviest", "totalWeight",
  "stock", "lowStock",
  "legs", "totalMeters", "totalMinutes", "fastMinutes",
  "scans", "unclaimed", "noteLength",
  "fleet",
  "parcelList", "statusCounts", "sameValues",
  "incidents", "loaded",
  "report",
] as const;

export function readDepot(p: ProgramHandle | null): Depot {
  const g = (k: string): unknown => (p ? readAny(p, k) : undefined);

  const fleet = arr(g("fleet"))?.flatMap((r): FleetRobot[] => {
    if (!isRec(r)) return [];
    return [{ name: str(r.name) ?? "?", battery: num(r.battery) ?? 0, meters: num(r.meters) ?? 0, needsCharge: bool(r.needsCharge) ?? (num(r.battery) ?? 100) < 20 }];
  });

  const list = arr(g("parcelList"))?.flatMap((r): ParcelRow[] => {
    if (!isRec(r)) return [];
    return [{ id: str(r.id) ?? "?", destination: str(r.destination) ?? "", kg: num(r.kg), status: str(r.status) ?? "Unknown" }];
  });

  const incidents = arr(g("incidents"))?.flatMap((r): Incident[] => {
    if (!isRec(r)) return [];
    return [{ kind: str(r.kind) ?? "Incident", message: str(r.message) ?? "" }];
  });

  const rep = g("report");
  const report = isRec(rep)
    ? { delivered: num(rep.delivered), rejected: num(rep.rejected), revenue: num(rep.revenue), busiestStop: str(rep.busiestStop) }
    : undefined;

  const err = g("build_error");
  const error: BuildError | null = isRec(err)
    ? { type: str(err.type) ?? "Error", message: str(err.message) ?? "", line: num(err.line) ?? null }
    : null;

  const slots = arr(g("slots"))?.map((x) => (typeof x === "string" && x !== "" ? x : null));

  return {
    robot: { name: str(g("robotName")), battery: num(g("battery")), maxBattery: num(g("maxBattery")), speed: num(g("speed")), online: bool(g("online")), grade: str(g("grade")), cycles: num(g("chargeCycles")) },
    dispatch: { parcels: num(g("parcels")), crateSize: num(g("crateSize")), trips: num(g("trips")), leftover: num(g("leftover")), avgKg: num(g("avgKg")), fee: num(g("fee")), wrapped: num(g("wrapped")), safe: num(g("safe")) },
    label: { customer: str(g("customer")), destination: str(g("destination")), weightKg: num(g("weightKg")), code: str(g("code")), extraText: str(g("extraText")), extraOk: bool(g("extraOk")) },
    rules: { tier: str(g("tier")), shiftName: str(g("shiftName")), chargeState: str(g("chargeState")), canDeliver: bool(g("canDeliver")), hours: str(g("hours")) },
    patrol: { floorMap: str(g("floorMap")), meters: num(g("meters")), lapsOnCharge: num(g("lapsOnCharge")), docksVisited: num(g("docksVisited")) },
    shelves: { slots, filled: num(g("filled")), queue: strList(g("queue")), weights: numList(g("weights")), heaviest: num(g("heaviest")), totalWeight: num(g("totalWeight")) },
    stock: { stock: numRec(g("stock")), lowStock: strList(g("lowStock")) },
    routes: { legs: strList(g("legs")), totalMeters: num(g("totalMeters")), totalMinutes: num(g("totalMinutes")), fastMinutes: num(g("fastMinutes")) },
    scanner: { scans: strList(g("scans")), unclaimed: num(g("unclaimed")), noteLength: num(g("noteLength")) },
    fleet: { fleet },
    parcels: { list, statusCounts: numRec(g("statusCounts")), sameValues: bool(g("sameValues")) },
    safety: { incidents, loaded: num(g("loaded")) },
    shift: { report },
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

export function fmtMoney(v: number): string {
  return v.toFixed(2);
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// ───────────────────────── console output ─────────────────────────

/** Output lines for the console, trimmed of a trailing empty line but keeping blank lines inside. */
export function outputLines(stdout: string): string[] {
  const lines = stdout.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

// ───────────────────────── compiler messages ─────────────────────────

export interface Diagnostic {
  /** "12:5", or "" when the message has no position. */
  where: string;
  code: string;
  text: string;
  severity: "error" | "warning";
}

/** Parses Roslyn lines like `Program.cs(12,5): error CS1002: ; expected`. Other lines pass through as plain text. */
export function parseDiagnostics(message: string): Diagnostic[] {
  return message
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l): Diagnostic => {
      const m = /^(?:.*?)\((\d+),(\d+)\):\s*(error|warning)\s+(\w+):\s*(.*)$/.exec(l);
      if (m) return { where: `${m[1]}:${m[2]}`, code: m[4], text: m[5], severity: m[3] === "warning" ? "warning" : "error" };
      return { where: "", code: "", text: l, severity: "error" };
    });
}

/** Plain-language advice for the compiler errors a beginner meets most. */
const ADVICE: Record<string, string> = {
  CS1002: "A semicolon is missing. Look at the end of this line, or the line above it.",
  CS1001: "The compiler expected a name here. Check for a missing word or a stray symbol.",
  CS1003: "A symbol is missing (often a comma, parenthesis or quote). Check this spot and the one before it.",
  CS1026: "A closing parenthesis ) is missing.",
  CS1513: "A closing brace } is missing. Check that every { has a matching }.",
  CS1022: "There is an extra brace }, or a type or statement in the wrong place.",
  CS1010: "A string is not closed: add the closing double quote.",
  CS0103: "That name does not exist here. Check the spelling and capital letters, and that it is declared above this line.",
  CS0117: "That type has no member with this name. Check the spelling and capitals (C# is case-sensitive).",
  CS0029: "The value's type does not fit the variable's type. A string cannot go in an int, and so on.",
  CS0266: "A double cannot be stored in an int without losing the fraction. Cast on purpose, or use a double.",
  CS0165: "This variable is read before it was given a value. Assign it first.",
  CS0128: "That name is already used in this scope. Choose a different name, or assign to the existing variable.",
  CS0136: "A name used inside this block is also declared in the code around it. Pick a different name.",
  CS0161: "Not every path through this method returns a value. Add a return at the end.",
  CS0220: "This arithmetic overflows at compile time. The result does not fit the type.",
  CS1503: "An argument has the wrong type for this method. Check what the method expects.",
  CS1501: "No version of this method takes that many arguments.",
  CS7036: "A required argument is missing from this call.",
  CS8803: "Top-level statements must come BEFORE any class, record or enum. Move this line above the divider.",
  CS8801: "Top-level statements cannot see variables declared inside a class, or the other way round. Pass values as parameters.",
  CS5001: "The file has no statements to run. Add at least one statement above the divider line.",
  CS0246: "That type name is not known. Check the spelling, the capital letters, and that the type is declared.",
  CS0120: "An instance member is being used without an object. Create the object with new first.",
  CS1061: "That object has no member with this name. Check the spelling and capital letters.",
  CS0019: "This operator cannot be used with these two types.",
  CS0201: "Only a call, assignment or increment can be a statement. A bare value or expression does nothing.",
  CS0160: "A catch for a broader exception type comes before this one. Order catches from most specific to most general.",
};

export function adviceFor(code: string): string | undefined {
  return ADVICE[code];
}

/** Extra advice for runtime exceptions, from the first line of the stack trace. */
export function runtimeAdvice(message: string): string | undefined {
  if (/NullReferenceException/.test(message)) return "Something was null when you used it. Check for null (?., ??, is null) before using a value that may be missing.";
  if (/IndexOutOfRangeException/.test(message)) return "An array index was outside 0 to Length - 1. Check your loop bounds (< Length, not <=).";
  if (/ArgumentOutOfRangeException/.test(message)) return "An index or length was out of range, for example in a List or Substring.";
  if (/KeyNotFoundException/.test(message)) return "That key is not in the dictionary. Check with TryGetValue or ContainsKey first.";
  if (/FormatException/.test(message)) return "Text was not in the expected format. Use TryParse for input you do not control.";
  if (/DivideByZeroException/.test(message)) return "An integer was divided by zero. Check the divisor first.";
  if (/InvalidCastException/.test(message)) return "A value was cast to a type it is not.";
  if (/InvalidOperationException/.test(message)) return "The operation is not valid in the current state. Read the message for what to check.";
  if (/TimeLimit|timed out|too long/i.test(message)) return "The program ran for too long. Look for a loop that never ends.";
  return undefined;
}

// ───────────────────────── the patrol floor ─────────────────────────

export interface FloorGrid {
  rows: string[];
  width: number;
  height: number;
  /** Lane cells in walking order (clockwise around the middle of the map). */
  lane: { x: number; y: number }[];
}

const MAX_GRID = 24;

export function parseFloor(map: string | undefined): FloorGrid | null {
  if (!map) return null;
  const rows = map
    .split("\n")
    .map((r) => r.replace(/\r/g, ""))
    .filter((r) => r.length > 0)
    .slice(0, MAX_GRID)
    .map((r) => r.slice(0, MAX_GRID));
  if (rows.length === 0) return null;
  const width = Math.max(...rows.map((r) => r.length));
  const height = rows.length;
  const lane: { x: number; y: number }[] = [];
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) if (r[x] !== "." && r[x] !== " ") lane.push({ x, y });
  });
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  // 0 at the top-left corner, growing clockwise (screen y points down, so atan2 grows clockwise)
  const startAngle = Math.atan2(-cy, -cx);
  const angle = (c: { x: number; y: number }) => {
    let a = Math.atan2(c.y - cy, c.x - cx) - startAngle;
    while (a < -1e-9) a += 2 * Math.PI;
    return a;
  };
  lane.sort((a, b) => angle(a) - angle(b) || a.y - b.y || a.x - b.x);
  return { rows, width, height, lane };
}
