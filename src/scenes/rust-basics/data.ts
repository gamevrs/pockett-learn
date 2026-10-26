import type { ProgramHandle } from "@/engine/program";

/**
 * What Halcyon Reef Station reads from the learner's Rust program. A compiled program can't be
 * called back, so the station works from the values the program printed with
 * `scene("key", value)` (each one an `@scene {json}` line). Every value may be missing or the
 * wrong type: the readers below return `undefined` instead of guessing.
 *
 * A failed build arrives as `build_error` ({ type, message, line }) where `type` is the rustc error
 * code ("E0382"), "CompileError" for a syntax error without a code, or "Panic" for a crash while
 * running. `explainError` turns those into something a beginner can act on.
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
export const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
export const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
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

export interface DroneCard {
  name: string;
  battery: number;
  depthM: number;
  active: boolean;
  needsCharge: boolean;
}

export interface SampleCard {
  id: number | undefined;
  name: string;
  depthM: number | undefined;
  /** undefined when the weight is missing (Rust's None, sent as null) */
  weightG: number | undefined;
}

export interface BuildError {
  type: string;
  message: string;
  line: number | null;
}

export interface Station {
  oxygen: { station?: string; crew?: number; depthM?: number; oxygenPct?: number; pumpsOnline?: boolean; hatch?: string; tanks?: number; wrappedLevel?: number; cappedLevel?: number };
  pressure: { pressureBar?: number; hours?: number; minutes?: number; litresEach?: number; cutOff?: number; wrappedByte?: number; negativeWrap?: number };
  airlock: { diver?: string; plannedDepth?: number; site?: string; badText?: string; bonusDepth?: number };
  alarms: { zone?: string; o2Status?: string; watch?: string; cleared?: boolean; verdict?: string };
  pumps: { markersPassed?: number; hoursToReserve?: number; reservePct?: number; fullAfter?: number; checked?: number; leakRow?: number; leakSeal?: number };
  sensors: { readings?: number[]; highest?: number; lowest?: number; average?: number; beacon?: number[] };
  divelog: { diveLog?: number[]; diveCount?: number; deepest?: number; shallowest?: number };
  vault: { sealedChars?: number; stamped?: string; originalLen?: number; extendedLen?: number; copiedDepth?: number };
  tether: { avgBefore?: number; avgAfter?: number };
  radio: { message?: string; sender?: string; wordCount?: number; shout?: string; allClear?: boolean; readingBytes?: number; readingChars?: number; summary?: string };
  drones: { fleet?: DroneCard[] };
  orders: { commands?: string[]; reports?: string[]; pipHealth?: string; mantaBattery?: number };
  catalogue: { catalogue?: SampleCard[]; totalWeightG?: number; unweighed?: number };
  intake: { intake?: SampleCard[]; problems?: string[]; acceptedCount?: number };
  report: { zoneCounts?: Record<string, number>; needsCharge?: string[]; report?: { dives?: number; deepest?: number; meanDepth?: number; samples?: number; weighedG?: number; deepSamples?: number; needsCharge?: number } };
  error: BuildError | null;
}

/** The keys shown on the "Scene data" tab, in lesson order. */
export const SCENE_KEYS = [
  "station", "crew", "depthM", "oxygenPct", "pumpsOnline", "hatch", "tanks", "wrappedLevel", "cappedLevel",
  "pressureBar", "hours", "minutes", "litresEach", "cutOff", "wrappedByte", "negativeWrap",
  "diver", "plannedDepth", "site", "badText", "bonusDepth",
  "zone", "o2Status", "watch", "cleared", "verdict",
  "markersPassed", "hoursToReserve", "reservePct", "fullAfter", "checked", "leakRow", "leakSeal",
  "readings", "highest", "lowest", "average", "beacon",
  "diveLog", "diveCount", "deepest", "shallowest",
  "sealedChars", "stamped", "originalLen", "extendedLen", "copiedDepth",
  "avgBefore", "avgAfter",
  "message", "sender", "wordCount", "shout", "allClear", "readingBytes", "readingChars", "summary",
  "fleet",
  "commands", "reports", "pipHealth", "mantaBattery",
  "catalogue", "totalWeightG", "unweighed",
  "intake", "problems", "acceptedCount",
  "zoneCounts", "needsCharge", "report",
] as const;

function readDrone(r: unknown): DroneCard[] {
  if (!isRec(r)) return [];
  const battery = num(r.battery) ?? 0;
  return [{ name: str(r.name) ?? "?", battery, depthM: num(r.depthM) ?? 0, active: bool(r.active) ?? false, needsCharge: bool(r.needsCharge) ?? battery < 20 }];
}

function readSample(r: unknown): SampleCard[] {
  if (!isRec(r)) return [];
  return [{ id: num(r.id), name: str(r.name) ?? "?", depthM: num(r.depthM), weightG: num(r.weightG) }];
}

export function readStation(p: ProgramHandle | null): Station {
  const g = (k: string): unknown => (p ? readAny(p, k) : undefined);

  const rep = g("report");
  const report = isRec(rep)
    ? {
        dives: num(rep.dives),
        deepest: num(rep.deepest),
        meanDepth: num(rep.meanDepth),
        samples: num(rep.samples),
        weighedG: num(rep.weighedG),
        deepSamples: num(rep.deepSamples),
        needsCharge: num(rep.needsCharge),
      }
    : undefined;

  const err = g("build_error");
  const error: BuildError | null = isRec(err)
    ? { type: str(err.type) ?? "Error", message: str(err.message) ?? "", line: num(err.line) ?? null }
    : null;

  const beacon = numList(g("beacon"));

  return {
    oxygen: {
      station: str(g("station")),
      crew: num(g("crew")),
      depthM: num(g("depthM")),
      oxygenPct: num(g("oxygenPct")),
      pumpsOnline: bool(g("pumpsOnline")),
      hatch: str(g("hatch")),
      tanks: num(g("tanks")),
      wrappedLevel: num(g("wrappedLevel")),
      cappedLevel: num(g("cappedLevel")),
    },
    pressure: {
      pressureBar: num(g("pressureBar")),
      hours: num(g("hours")),
      minutes: num(g("minutes")),
      litresEach: num(g("litresEach")),
      cutOff: num(g("cutOff")),
      wrappedByte: num(g("wrappedByte")),
      negativeWrap: num(g("negativeWrap")),
    },
    airlock: { diver: str(g("diver")), plannedDepth: num(g("plannedDepth")), site: str(g("site")), badText: str(g("badText")), bonusDepth: num(g("bonusDepth")) },
    alarms: { zone: str(g("zone")), o2Status: str(g("o2Status")), watch: str(g("watch")), cleared: bool(g("cleared")), verdict: str(g("verdict")) },
    pumps: {
      markersPassed: num(g("markersPassed")),
      hoursToReserve: num(g("hoursToReserve")),
      reservePct: num(g("reservePct")),
      fullAfter: num(g("fullAfter")),
      checked: num(g("checked")),
      leakRow: num(g("leakRow")),
      leakSeal: num(g("leakSeal")),
    },
    sensors: { readings: numList(g("readings")), highest: num(g("highest")), lowest: num(g("lowest")), average: num(g("average")), beacon: beacon && beacon.length > 0 ? beacon : undefined },
    divelog: { diveLog: numList(g("diveLog")), diveCount: num(g("diveCount")), deepest: num(g("deepest")), shallowest: num(g("shallowest")) },
    vault: { sealedChars: num(g("sealedChars")), stamped: str(g("stamped")), originalLen: num(g("originalLen")), extendedLen: num(g("extendedLen")), copiedDepth: num(g("copiedDepth")) },
    tether: { avgBefore: num(g("avgBefore")), avgAfter: num(g("avgAfter")) },
    radio: {
      message: str(g("message")),
      sender: str(g("sender")),
      wordCount: num(g("wordCount")),
      shout: str(g("shout")),
      allClear: bool(g("allClear")),
      readingBytes: num(g("readingBytes")),
      readingChars: num(g("readingChars")),
      summary: str(g("summary")),
    },
    drones: { fleet: arr(g("fleet"))?.flatMap(readDrone) },
    orders: { commands: strList(g("commands")), reports: strList(g("reports")), pipHealth: str(g("pipHealth")), mantaBattery: num(g("mantaBattery")) },
    catalogue: { catalogue: arr(g("catalogue"))?.flatMap(readSample), totalWeightG: num(g("totalWeightG")), unweighed: num(g("unweighed")) },
    intake: { intake: arr(g("intake"))?.flatMap(readSample), problems: strList(g("problems")), acceptedCount: num(g("acceptedCount")) },
    report: { zoneCounts: numRec(g("zoneCounts")), needsCharge: strList(g("needsCharge")), report },
    error,
  };
}

/** True when the program printed at least one value for this section. */
export const hasValues = (o: object): boolean => Object.values(o).some((v) => v !== undefined);

// ───────────────────────── formatting ─────────────────────────

export function fmtNum(v: number, digits = 2): string {
  if (Number.isInteger(v)) return Math.abs(v) >= 100000 ? v.toLocaleString("en-US") : String(v);
  return String(Number(v.toFixed(digits)));
}

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Output lines for the console, trimmed of a trailing empty line but keeping blank lines inside. */
export function outputLines(stdout: string): string[] {
  const lines = stdout.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

// ───────────────────────── the station's rooms ─────────────────────────

export interface Room {
  id: string;
  title: string;
  /** Fits a small tile in the cutaway. */
  short: string;
  lesson: number;
  /** 0 = top deck. The cutaway has four decks, one per chapter. */
  floor: 0 | 1 | 2 | 3;
  /** The Rust idea behind the module, shown on locked rooms. */
  clause: string;
}

export const ROOMS: Room[] = [
  { id: "rs-console", title: "Control room", short: "Control", lesson: 1, floor: 0, clause: "println! · {} · {:?}" },
  { id: "rs-oxygen", title: "Oxygen plant", short: "Oxygen", lesson: 2, floor: 0, clause: "let · mut · types" },
  { id: "rs-pressure", title: "Pressure gauge", short: "Pressure", lesson: 3, floor: 0, clause: "arithmetic · as" },
  { id: "rs-airlock", title: "Airlock desk", short: "Airlock", lesson: 4, floor: 1, clause: "stdin · parse · Result" },
  { id: "rs-alarms", title: "Alarm board", short: "Alarms", lesson: 5, floor: 1, clause: "if · match" },
  { id: "rs-pumps", title: "Ballast pumps", short: "Pumps", lesson: 6, floor: 1, clause: "loop · while · for" },
  { id: "rs-sensors", title: "Sensor array", short: "Sensors", lesson: 7, floor: 1, clause: "tuples · arrays" },
  { id: "rs-divelog", title: "Dive log", short: "Dive log", lesson: 8, floor: 2, clause: "Vec<T>" },
  { id: "rs-vault", title: "Sample vault", short: "Vault", lesson: 9, floor: 2, clause: "ownership · move" },
  { id: "rs-tether", title: "Tether line", short: "Tether", lesson: 10, floor: 2, clause: "&T · &mut T" },
  { id: "rs-radio", title: "Radio mast", short: "Radio", lesson: 11, floor: 2, clause: "String · &str" },
  { id: "rs-drones", title: "Drone bay", short: "Drones", lesson: 12, floor: 3, clause: "struct · impl" },
  { id: "rs-orders", title: "Mission orders", short: "Orders", lesson: 13, floor: 3, clause: "enum · match" },
  { id: "rs-catalogue", title: "Sample catalogue", short: "Samples", lesson: 14, floor: 3, clause: "Option<T>" },
  { id: "rs-intake", title: "Intake desk", short: "Intake", lesson: 15, floor: 3, clause: "Result · ?" },
  { id: "rs-report", title: "Station report", short: "Report", lesson: 16, floor: 3, clause: "HashMap · iterators" },
];

export const FLOOR_COUNTS = [3, 4, 4, 5] as const;

/** A short live value for a room's tile in the cutaway, or undefined when there is nothing to say yet. */
export function tileValue(id: string, s: Station): string | undefined {
  switch (id) {
    case "rs-oxygen":
      return s.oxygen.oxygenPct !== undefined ? `${fmtNum(s.oxygen.oxygenPct, 1)}%` : undefined;
    case "rs-pressure":
      return s.pressure.pressureBar !== undefined ? `${fmtNum(s.pressure.pressureBar, 2)} bar` : undefined;
    case "rs-airlock":
      return s.airlock.diver ? s.airlock.diver.split(" ")[0] : undefined;
    case "rs-alarms":
      return s.alarms.verdict;
    case "rs-pumps":
      return s.pumps.fullAfter !== undefined ? `${s.pumps.fullAfter} cycles` : undefined;
    case "rs-sensors":
      return s.sensors.average !== undefined ? `avg ${fmtNum(s.sensors.average, 1)} m` : undefined;
    case "rs-divelog":
      return s.divelog.diveLog ? `${s.divelog.diveLog.length} dives` : s.divelog.diveCount !== undefined ? `${s.divelog.diveCount} dives` : undefined;
    case "rs-vault":
      return s.vault.stamped ? "sealed" : undefined;
    case "rs-tether":
      return s.tether.avgAfter !== undefined ? `${fmtNum(s.tether.avgAfter, 1)} m avg` : undefined;
    case "rs-radio":
      return s.radio.wordCount !== undefined ? `${s.radio.wordCount} words` : undefined;
    case "rs-drones":
      return s.drones.fleet ? `${s.drones.fleet.length} drones` : undefined;
    case "rs-orders":
      return s.orders.commands ? `${s.orders.commands.length} orders` : undefined;
    case "rs-catalogue":
      return s.catalogue.catalogue ? `${s.catalogue.catalogue.length} samples` : undefined;
    case "rs-intake":
      return s.intake.acceptedCount !== undefined ? `${s.intake.acceptedCount} in` : undefined;
    case "rs-report":
      return s.report.report?.samples !== undefined ? "filed" : undefined;
    default:
      return undefined;
  }
}

// ───────────────────────── compiler and panic messages ─────────────────────────

export type DiagramKind = "move" | "borrow" | "types" | "match" | "scope";

export interface Explained {
  kind: "compile" | "panic" | "other";
  /** "E0382", "Panic", or "" */
  code: string;
  headline: string;
  /** What the compiler message says, in plain words. */
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
  E0382: {
    headline: "Used after it moved",
    meaning: "A value has one owner. Assigning it to another variable, passing it to a function or looping over it by value moves it, and the old name stops working.",
    fixes: ["Lend it instead: pass &value (or &mut value) so the owner keeps it", "Call .clone() if you really need a second, independent copy", "Use the value for the last time in the place that moves it"],
    diagram: "move",
  },
  E0505: {
    headline: "Moved while borrowed",
    meaning: "Something still holds a reference to the value, and you moved the value away. The reference would point at nothing.",
    fixes: ["Finish using the reference before the move", "Borrow instead of moving", "Clone the value so the borrow and the move involve different copies"],
    diagram: "move",
  },
  E0507: {
    headline: "Cannot move out of a borrow",
    meaning: "You tried to take ownership of something you only borrow, such as an item inside a Vec or a field behind a reference.",
    fixes: ["Borrow the item: &list[0]", "Clone it: list[0].clone()", "Take it out for real with remove(), pop() or swap"],
    diagram: "move",
  },
  E0499: {
    headline: "Two mutable borrows at once",
    meaning: "A value may have only one &mut reference at a time. Two writers could overwrite each other or invalidate each other's view.",
    fixes: ["Finish with the first &mut before you take the second", "Pass the one reference along instead of creating another", "Split the data so each writer has its own part"],
    diagram: "borrow",
  },
  E0502: {
    headline: "Read and write at the same time",
    meaning: "Many readers or one writer, never both. A shared reference is still in use while you try to change the value (push may even move the whole Vec).",
    fixes: ["Use the reference before you mutate, not after", "Copy the value out (let first = list[0];) instead of keeping a reference", "Clone the part you need"],
    diagram: "borrow",
  },
  E0506: {
    headline: "Assigned while borrowed",
    meaning: "You changed a variable while a reference to it was still going to be used.",
    fixes: ["Use the reference first, assign afterwards", "Copy the value instead of borrowing it"],
    diagram: "borrow",
  },
  E0596: {
    headline: "Not declared mutable",
    meaning: "You tried to change something through a name that was declared without mut, or lent it as &mut from an immutable variable.",
    fixes: ["Add mut to the let: let mut name = ...", "For a parameter, ask for &mut T and pass &mut value"],
    diagram: "borrow",
  },
  E0594: {
    headline: "Assigned to something immutable",
    meaning: "A field or variable that is not mutable was assigned to.",
    fixes: ["Declare the owner with mut", "If it is behind a reference, the reference must be &mut"],
  },
  E0384: {
    headline: "Assigned twice to an immutable variable",
    meaning: "let bindings are read-only by default. A second assignment needs the variable to be declared with mut.",
    fixes: ["Write let mut name = ...", "Or shadow it with a new let if you want a fresh value"],
  },
  E0381: {
    headline: "Used before it has a value",
    meaning: "A variable was declared but not assigned on every path before it was read.",
    fixes: ["Give it a value at the let", "Make sure every if / match branch assigns it"],
  },
  E0515: {
    headline: "Returning a reference to a local",
    meaning: "The local variable is freed when the function ends, so a reference to it would dangle.",
    fixes: ["Return the owned value instead (String, not &str)", "Return a reference to something the caller passed in"],
    diagram: "scope",
  },
  E0597: {
    headline: "Does not live long enough",
    meaning: "A reference outlives the value it points to. The value is dropped at the end of its block while the reference is still used.",
    fixes: ["Declare the value in an outer scope", "Move or clone the value instead of borrowing it"],
    diagram: "scope",
  },
  E0106: {
    headline: "Missing lifetime specifier",
    meaning: "A function returns a reference, but the compiler cannot tell which input it borrows from (or there is none to borrow from).",
    fixes: ["Return an owned value (String instead of &str)", "Use one reference parameter so the lifetime is obvious", "'static is only for text that lives for the whole program"],
    diagram: "scope",
  },
  E0308: {
    headline: "Mismatched types",
    meaning: "A value of one type was used where another type is expected. Rust never converts between types silently.",
    fixes: ["Convert on purpose: as f64, .to_string(), Some(x)", "Check both branches of an if / match give the same type", "Look for a stray semicolon turning a value into ()"],
    diagram: "types",
  },
  E0277: {
    headline: "Trait not satisfied",
    meaning: "The operation needs a capability the type does not have: adding f64 to u32, indexing with the wrong type, printing a type with no Display, or ? in a function that returns ().",
    fixes: ["Convert one side (value as f64)", "Use {:?} if the type has Debug", "Make the function return Result or Option if you use ?"],
    diagram: "types",
  },
  E0369: {
    headline: "Operator not supported",
    meaning: "The + , == or other operator is not implemented for this type.",
    fixes: ["Derive PartialEq to compare your own types", "Unwrap an Option / Result before doing arithmetic with it", "Add Strings with format! or push_str"],
    diagram: "types",
  },
  E0599: {
    headline: "No such method",
    meaning: "The type has no method (or associated function) with that name, or you called a method on a type that lacks the trait.",
    fixes: ["Check spelling and capital letters", "A method on Option / Result may need unwrapping first", "Call associated functions as Type::name(...)"],
  },
  E0425: {
    headline: "Name not found",
    meaning: "The compiler cannot find a variable or function with that name in this scope.",
    fixes: ["Check spelling", "Declare it above the line that uses it", "A variable made inside { } is gone after the closing brace", "Inside an impl, fields need self."],
    diagram: "scope",
  },
  E0433: {
    headline: "Unknown type or module",
    meaning: "A path starts with something the compiler does not know, such as HashMap without its use line.",
    fixes: ["Add use std::collections::HashMap; above main", "Check the spelling of the type"],
  },
  E0432: {
    headline: "Unresolved import",
    meaning: "A use line points to something that does not exist.",
    fixes: ["Check the path and the spelling", "Only the standard library is available in this course"],
  },
  E0423: {
    headline: "Expected something else",
    meaning: "A name was used as a function or value but it is a macro or a struct. A missing ! on println is the classic case.",
    fixes: ["Macros end in !: println!(...)", "Build a struct with Name { field: value }"],
  },
  E0424: {
    headline: "self is missing",
    meaning: "A method used self but its first parameter does not declare it.",
    fixes: ["Add &self or &mut self as the first parameter"],
  },
  E0004: {
    headline: "match must cover every case",
    meaning: "Some possible values have no arm. Rust checks this at compile time, so no case can slip through unhandled.",
    fixes: ["Add an arm for each missing variant or range", "Add _ => ... for everything else, if that is really what you want"],
    diagram: "match",
  },
  E0023: {
    headline: "Wrong number of fields in the pattern",
    meaning: "The pattern names a different number of fields than the variant carries.",
    fixes: ["Match the variant's shape: Variant(a, b) for two fields", "Use _ or .. to skip fields you do not need"],
    diagram: "match",
  },
  E0026: { headline: "Pattern names a missing field", meaning: "A struct pattern mentions a field that does not exist.", fixes: ["Check the field names of the variant or struct"], diagram: "match" },
  E0027: { headline: "Pattern skips fields", meaning: "A struct pattern does not mention every field.", fixes: ["List every field, or add .. at the end"], diagram: "match" },
  E0061: {
    headline: "Wrong number of arguments",
    meaning: "The call passes more or fewer values than the function declares.",
    fixes: ["Compare the call with the function's parameter list", "For a method, self is passed automatically"],
  },
  E0063: { headline: "Missing struct field", meaning: "A struct literal has to give every field a value.", fixes: ["Add the missing field", "Or build the struct with a new() function that fills defaults"] },
  E0560: { headline: "Struct has no such field", meaning: "A struct literal names a field the struct does not have.", fixes: ["Check the field names in the struct definition"] },
  E0609: { headline: "No such field", meaning: "The type has no field with that name.", fixes: ["Check spelling", "Tuples use .0 .1 .2, structs use names"] },
  E0614: { headline: "Cannot dereference", meaning: "The * operator needs a reference or a smart pointer, not a plain value.", fixes: ["Remove the *", "Check whether the value is already a plain number"] },
  E0282: { headline: "Type annotations needed", meaning: "The compiler cannot work out a type from context.", fixes: ["Annotate the variable: let n: i32 = ...", "Use the turbofish: parse::<i32>()"], diagram: "types" },
  E0283: { headline: "Type annotations needed", meaning: "Several types would fit, so you have to choose one.", fixes: ["Annotate the result: let total: u32 = ....sum();", "Use the turbofish: .sum::<u32>()"], diagram: "types" },
  E0284: { headline: "Type annotations needed", meaning: "The compiler cannot decide which type an operation produces.", fixes: ["Annotate the result", "Use the turbofish: parse::<i32>()"], diagram: "types" },
  E0689: { headline: "Method on an ambiguous number", meaning: "A bare literal like 2.0 does not yet have a concrete type, so methods on it are ambiguous.", fixes: ["Give it a type: 2.0_f64.sqrt() or let x: f64 = 2.0;"], diagram: "types" },
  E0605: { headline: "Invalid cast", meaning: "as only converts between compatible primitive types.", fixes: ["Use .to_string(), parse() or From for other conversions"], diagram: "types" },
  E0606: { headline: "Invalid cast", meaning: "That cast between these types is not allowed.", fixes: ["Dereference first, or convert in two steps"], diagram: "types" },
  E0268: { headline: "break outside a loop", meaning: "break and continue only work inside loop, while or for.", fixes: ["Move the break into the loop", "Use return to leave a function"] },
  E0317: { headline: "if without else used as a value", meaning: "An if that produces a value needs an else for the other case.", fixes: ["Add an else branch of the same type"], diagram: "match" },
  E0618: { headline: "Not a function", meaning: "Something that is not a function was called with ().", fixes: ["Check the name; a variable shadowing the function is a common cause"] },
  E0373: { headline: "Closure may outlive its borrow", meaning: "A closure borrows a local variable but could be used after the function returns.", fixes: ["Add move before the closure to take ownership"], diagram: "scope" },
  E0716: { headline: "Temporary dropped too early", meaning: "A reference to a value that is dropped at the end of the statement was kept.", fixes: ["Store the value in a let first, then borrow it"], diagram: "scope" },
};

const PANICS: { test: RegExp; headline: string; meaning: string; fixes: string[] }[] = [
  {
    test: /index out of bounds/i,
    headline: "Index out of bounds",
    meaning: "The program asked for an item beyond the end of an array, Vec or slice. Rust checks every index and stops instead of reading stray memory.",
    fixes: ["Use .get(i) and match on the Option", "Loop with for item in &list instead of counting", "Check list.len() before indexing"],
  },
  {
    test: /called `Option::unwrap\(\)` on a `None` value|called `Option::expect|`None` value/i,
    headline: "unwrap on None",
    meaning: "The code assumed a value would be there and it was missing.",
    fixes: ["Handle both cases with match or if let", "Use unwrap_or(default) when a default makes sense"],
  },
  {
    test: /called `Result::unwrap\(\)` on an `Err` value|called `Result::expect|Err value/i,
    headline: "unwrap on an Err",
    meaning: "A Result held an error, and unwrap or expect turned it into a crash.",
    fixes: ["match on Ok / Err and handle the failure", "Return the error to the caller with ?"],
  },
  {
    test: /attempt to (add|subtract|multiply|negate|shift) .*overflow/i,
    headline: "Arithmetic overflow",
    meaning: "A number went past the largest or smallest value its type can hold. Debug builds stop instead of quietly wrapping around.",
    fixes: ["Use a wider type (u64, i64)", "Say what you mean: wrapping_add, saturating_add or checked_add"],
  },
  {
    test: /divide by zero|remainder with a divisor of zero/i,
    headline: "Division by zero",
    meaning: "An integer was divided by zero, which has no answer.",
    fixes: ["Check the divisor first", "Use checked_div, which returns an Option"],
  },
  {
    test: /char boundary/i,
    headline: "Cut through a character",
    meaning: "A string slice started or ended inside a multi-byte character. Strings are UTF-8, and slices count bytes.",
    fixes: ["Slice only at positions you got from find or char_indices", "Use .chars() for character-by-character work"],
  },
  {
    test: /already (borrowed|mutably borrowed)/i,
    headline: "Borrowed twice at run time",
    meaning: "A RefCell was borrowed in a way that breaks the one-writer rule while the program was running.",
    fixes: ["Drop the first borrow before taking the next"],
  },
];

const SYNTAX: { test: RegExp; headline: string; meaning: string; fixes: string[] }[] = [
  { test: /expected `;`|expected one of .*`;`/i, headline: "A semicolon is missing", meaning: "Statements end with ;. The error is often reported on the line after the one that needs it.", fixes: ["Look at the end of this line and the line above it"] },
  { test: /unclosed delimiter|unexpected closing delimiter/i, headline: "Unbalanced braces", meaning: "A { ( or [ has no partner, or there is an extra closing one.", fixes: ["Match every opener with a closer", "Check the line the error points to and the block above it"] },
  { test: /cannot find macro/i, headline: "Unknown macro", meaning: "Macros end in !. Check the spelling.", fixes: ["println!, print!, format!, vec!, panic!"] },
  { test: /character literal may only contain one codepoint|unterminated character literal/i, headline: "Single quotes hold one character", meaning: "'a' is a char. Text needs double quotes.", fixes: ["Use \"text\" for strings and 'c' for a single char"] },
  { test: /unterminated double quote|unknown start of token|unterminated/i, headline: "A string is not closed", meaning: "A double quote is missing its partner, or a stray character is in the code.", fixes: ["Close the string with a second \"", "Remove the unexpected character"] },
  { test: /positional argument|argument never used|format string/i, headline: "Format string and values do not match", meaning: "Each {} needs one value after the string, and every value needs a {}.", fixes: ["Count the {} holes and the values", "Write {{ and }} for literal braces"] },
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
          meaning: `rustc reported error ${type}. Read the message, check the line number, and look the code up in the Rust error index if the wording is not enough.`,
          fixes: ["Fix the first error first: later ones are often a result of it", `Search the Rust error index for ${type}`],
        };
  }
  if (type === "Panic") {
    const p = PANICS.find((x) => x.test.test(error.message));
    return p
      ? { kind: "panic", code: "Panic", headline: p.headline, meaning: p.meaning, fixes: p.fixes }
      : { kind: "panic", code: "Panic", headline: "The program panicked", meaning: "Rust stopped the program on purpose because something went wrong. The message above says what, and the line number says where.", fixes: ["Read the message", "Find the unwrap(), expect(), index or arithmetic on that line"] };
  }
  if (type === "CompileError") {
    const s = SYNTAX.find((x) => x.test.test(error.message));
    return s
      ? { kind: "compile", code: "", headline: s.headline, meaning: s.meaning, fixes: s.fixes }
      : { kind: "compile", code: "", headline: "The compiler stopped here", meaning: "The code could not be read as Rust. Look at the line number, and at the line before it.", fixes: ["Check for a missing ; , brace or quote", "Fix the first error first"] };
  }
  if (/time|too long|timed out/i.test(error.message)) {
    return { kind: "other", code: "", headline: "The program ran for too long", meaning: "It did not finish in time. Look for a loop that never ends.", fixes: ["Check that loop and while conditions change", "Make sure break is reachable"] };
  }
  return { kind: "other", code: "", headline: "The program stopped", meaning: "It ended with an error before it finished.", fixes: ["Read the message", "Check the line number"] };
}
