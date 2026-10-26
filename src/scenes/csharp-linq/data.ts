import type { ProgramHandle } from "@/engine/program";

/**
 * What the Halyard Port board reads from the learner's C# program. A compiled program can't be
 * called back, so the board works from the values the program printed with
 * `Port.Show("key", value)` (each one an `@scene {json}` line). Every value may be missing or the
 * wrong type: the readers below return `undefined` instead of guessing, and never throw.
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
  return list; // an empty array (or an empty object / null we cannot tell apart from one)
}

export const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
export const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
export const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);
const arr = (v: unknown): unknown[] | undefined => (Array.isArray(v) ? v : undefined);
const scalar = (x: unknown): string => (typeof x === "string" ? x : x === null || x === undefined ? "" : typeof x === "object" ? safeJson(x) : String(x));
const strList = (v: unknown): string[] | undefined => arr(v)?.map(scalar);
const numRec = (v: unknown): Record<string, number> | undefined => {
  // an empty JSON object comes through readAny as an empty array
  if (Array.isArray(v) && v.length === 0) return {};
  if (!isRec(v)) return undefined;
  const out: Record<string, number> = {};
  for (const [k, x] of Object.entries(v)) {
    const n = num(x);
    if (n !== undefined) out[k] = n;
  }
  return out;
};
const rows = <T>(v: unknown, fn: (r: Record<string, unknown>) => T): T[] | undefined => arr(v)?.flatMap((x) => (isRec(x) ? [fn(x)] : []));

export function safeJson(v: unknown): string {
  try {
    const s = JSON.stringify(v);
    return s === undefined ? String(v) : s;
  } catch {
    return String(v);
  }
}

// ───────────────────────── the model ─────────────────────────

export interface BuildError {
  type: string;
  message: string;
  line: number | null;
}

export interface Shipment {
  id?: string;
  cargo?: string;
  category?: string;
  origin?: string;
  vesselId?: string;
  massKg?: number;
  priority?: number;
}

export interface BoardRow {
  id: string;
  cargo: string;
  category: string;
  massKg: number | undefined;
  priority: number | undefined;
}

export interface CategoryStat {
  category: string;
  count: number | undefined;
  totalKg: number | undefined;
  avgKg: number | undefined;
  heaviest: string | undefined;
}

export interface ManifestRow {
  id: string;
  vessel: string;
  massKg: number | undefined;
}

export interface VesselLoad {
  vessel: string;
  shipments: number | undefined;
  loadKg: number | undefined;
  capacityKg: number | undefined;
  usedPct: number | undefined;
}

export interface TraceStep {
  step: string;
  evaluations: number;
}

export interface LaneRow {
  id: string;
  lane: string;
}

export interface Loadable {
  label: string;
  massKg: number | undefined;
}

export interface Lookup {
  id: string;
  found: boolean | undefined;
  name: string | null;
  captain: string | undefined;
}

export interface Telegram {
  id: string;
  cargo: string;
  massKg: number | undefined;
  priority: number | undefined;
}

export interface TelegramReject {
  line: string;
  reason: string;
}

export interface LoadEntry {
  id: string;
  outcome: string;
  detail: string;
}

export interface JsonErrorInfo {
  message: string;
  line: number | undefined;
  position: number | undefined;
  path: string | null;
}

export interface InboxReject {
  line: number | undefined;
  raw: string;
  reasons: string[];
}

export interface PortData {
  structures: { origins?: string[]; docked?: string; dockQueue?: string[]; unloadOrder?: string[]; tonnageByCategory?: Record<string, number> };
  board: { rows?: BoardRow[]; urgentIds?: string[]; heavyIds?: string[]; medicalCount?: number; firstFuel?: string; hazmatFound?: boolean; anyMail?: boolean };
  groups: { stats?: CategoryStat[]; originTotals?: Record<string, number>; perVessel?: Record<string, number>; totals?: { count?: number; totalKg?: number; avgKg?: number; heaviest?: string } };
  joins: { manifest?: ManifestRow[]; vesselLoads?: VesselLoad[]; crew?: string[]; crewCount?: number };
  lazy: { trace?: TraceStep[]; sourceChange?: { before?: number; after?: number; snapshot?: number }; passes?: { naive?: number; snapshot?: number } };
  records: {
    berthCompare?: { equal?: boolean; sameReference?: boolean; text?: string };
    berthMove?: { before?: string; after?: string };
    berthKeys?: { distinct?: number; occupant?: string };
    amendment?: { before?: Shipment; after?: Shipment };
  };
  lanes: { lanes?: LaneRow[]; laneCounts?: Record<string, number>; bandCounts?: Record<string, number>; handlingCounts?: Record<string, number>; routeSummaries?: string[] };
  contracts: { loadables?: Loadable[]; boardingKg?: number; heaviestCrates?: string[]; crateDedupe?: { offered?: number; kept?: number } };
  generics: {
    largest?: { number?: number; name?: string; crate?: string };
    hold?: { capacityKg?: number; accepted?: string[]; refused?: string[]; totalKg?: number };
    recent?: string[];
    grouped?: Record<string, number>;
  };
  ext: { tonnes?: string[]; perishableIds?: string[]; pageTwo?: string[]; summaryLine?: string };
  lookup: { vesselLookups?: Lookup[]; bangCrash?: string };
  parser: { telegrams?: Telegram[]; telegramRejects?: TelegramReject[]; regexParts?: { id?: string; mass?: string; unit?: string }; mentionedIds?: string[] };
  faults: { loadLog?: LoadEntry[]; loadAttempts?: number };
  json: { exportJson?: string; notice?: { vesselId?: string; shipments?: number; totalKg?: number }; jsonError?: JsonErrorInfo; jsonRejects?: { id: string; reason: string }[] };
  inbox: { importReport?: { accepted?: number; rejected?: number }; acceptedIds?: string[]; rejects?: InboxReject[]; rejectSummary?: Record<string, number> };
  report: { portReport?: { shipments?: number; totalKg?: number; rejected?: number; busiestVessel?: string; topCategory?: string; overloaded?: string[] }; reportJson?: string };
  error: BuildError | null;
}

/** The keys shown on the "Scene data" tab, in lesson order. */
export const SCENE_KEYS = [
  "origins", "docked", "dockQueue", "unloadOrder", "tonnageByCategory",
  "board", "urgentIds", "heavyIds", "medicalCount", "firstFuel", "hazmatFound", "anyMail",
  "categoryStats", "originTotals", "perVessel", "totals",
  "manifest", "vesselLoads", "crew", "crewCount",
  "executionTrace", "sourceChange", "passes",
  "berthCompare", "berthMove", "berthKeys", "amendment",
  "lanes", "laneCounts", "bandCounts", "handlingCounts", "routeSummaries",
  "loadables", "boardingKg", "heaviestCrates", "crateDedupe",
  "largest", "hold", "recent", "grouped",
  "tonnes", "perishableIds", "pageTwo", "summaryLine",
  "vesselLookups", "bangCrash",
  "telegrams", "telegramRejects", "regexParts", "mentionedIds",
  "loadLog", "loadAttempts",
  "exportJson", "notice", "jsonError", "jsonRejects",
  "importReport", "acceptedIds", "rejects", "rejectSummary",
  "portReport", "reportJson",
] as const;

function readShipment(v: unknown): Shipment | undefined {
  if (!isRec(v)) return undefined;
  return { id: str(v.id), cargo: str(v.cargo), category: str(v.category), origin: str(v.origin), vesselId: str(v.vesselId), massKg: num(v.massKg), priority: num(v.priority) };
}

export function readPort(p: ProgramHandle | null): PortData {
  const g = (k: string): unknown => {
    if (!p) return undefined;
    try {
      return readAny(p, k);
    } catch {
      return undefined;
    }
  };

  const board = rows(g("board"), (r): BoardRow => ({ id: str(r.id) ?? "?", cargo: str(r.cargo) ?? "", category: str(r.category) ?? "", massKg: num(r.massKg), priority: num(r.priority) }));
  const stats = rows(g("categoryStats"), (r): CategoryStat => ({ category: str(r.category) ?? "?", count: num(r.count), totalKg: num(r.totalKg), avgKg: num(r.avgKg), heaviest: str(r.heaviest) }));
  const tot = g("totals");
  const manifest = rows(g("manifest"), (r): ManifestRow => ({ id: str(r.id) ?? "?", vessel: str(r.vessel) ?? "", massKg: num(r.massKg) }));
  const vesselLoads = rows(g("vesselLoads"), (r): VesselLoad => ({ vessel: str(r.vessel) ?? "?", shipments: num(r.shipments), loadKg: num(r.loadKg), capacityKg: num(r.capacityKg), usedPct: num(r.usedPct) }));
  const trace = rows(g("executionTrace"), (r): TraceStep => ({ step: str(r.step) ?? "?", evaluations: num(r.evaluations) ?? 0 }));
  const sc = g("sourceChange");
  const ps = g("passes");
  const bc = g("berthCompare");
  const bm = g("berthMove");
  const bk = g("berthKeys");
  const am = g("amendment");
  const lanes = rows(g("lanes"), (r): LaneRow => ({ id: str(r.id) ?? "?", lane: str(r.lane) ?? "?" }));
  const loadables = rows(g("loadables"), (r): Loadable => ({ label: str(r.label) ?? "?", massKg: num(r.massKg) }));
  const dd = g("crateDedupe");
  const largest = g("largest");
  const hold = g("hold");
  const lookups = rows(g("vesselLookups"), (r): Lookup => ({ id: str(r.id) ?? "?", found: bool(r.found), name: str(r.name) ?? null, captain: str(r.captain) }));
  const telegrams = rows(g("telegrams"), (r): Telegram => ({ id: str(r.id) ?? "?", cargo: str(r.cargo) ?? "", massKg: num(r.massKg), priority: num(r.priority) }));
  const telegramRejects = rows(g("telegramRejects"), (r): TelegramReject => ({ line: scalar(r.line), reason: scalar(r.reason) }));
  const rp = g("regexParts");
  const loadLog = rows(g("loadLog"), (r): LoadEntry => ({ id: str(r.id) ?? "?", outcome: (str(r.outcome) ?? "").toLowerCase(), detail: str(r.detail) ?? "" }));
  const notice = g("notice");
  const je = g("jsonError");
  const jsonRejects = rows(g("jsonRejects"), (r) => ({ id: str(r.id) ?? "?", reason: scalar(r.reason) }));
  const ir = g("importReport");
  const rejects = rows(g("rejects"), (r): InboxReject => ({ line: num(r.line), raw: scalar(r.raw), reasons: strList(r.reasons) ?? [] }));
  const pr = g("portReport");
  const err = g("build_error");

  return {
    structures: { origins: strList(g("origins")), docked: str(g("docked")), dockQueue: strList(g("dockQueue")), unloadOrder: strList(g("unloadOrder")), tonnageByCategory: numRec(g("tonnageByCategory")) },
    board: { rows: board, urgentIds: strList(g("urgentIds")), heavyIds: strList(g("heavyIds")), medicalCount: num(g("medicalCount")), firstFuel: str(g("firstFuel")), hazmatFound: bool(g("hazmatFound")), anyMail: bool(g("anyMail")) },
    groups: {
      stats,
      originTotals: numRec(g("originTotals")),
      perVessel: numRec(g("perVessel")),
      totals: isRec(tot) ? { count: num(tot.count), totalKg: num(tot.totalKg), avgKg: num(tot.avgKg), heaviest: str(tot.heaviest) } : undefined,
    },
    joins: { manifest, vesselLoads, crew: strList(g("crew")), crewCount: num(g("crewCount")) },
    lazy: {
      trace,
      sourceChange: isRec(sc) ? { before: num(sc.before), after: num(sc.after), snapshot: num(sc.snapshot) } : undefined,
      passes: isRec(ps) ? { naive: num(ps.naive), snapshot: num(ps.snapshot) } : undefined,
    },
    records: {
      berthCompare: isRec(bc) ? { equal: bool(bc.equal), sameReference: bool(bc.sameReference), text: str(bc.text) } : undefined,
      berthMove: isRec(bm) ? { before: str(bm.before), after: str(bm.after) } : undefined,
      berthKeys: isRec(bk) ? { distinct: num(bk.distinct), occupant: str(bk.occupant) } : undefined,
      amendment: isRec(am) ? { before: readShipment(am.before), after: readShipment(am.after) } : undefined,
    },
    lanes: { lanes, laneCounts: numRec(g("laneCounts")), bandCounts: numRec(g("bandCounts")), handlingCounts: numRec(g("handlingCounts")), routeSummaries: strList(g("routeSummaries")) },
    contracts: { loadables, boardingKg: num(g("boardingKg")), heaviestCrates: strList(g("heaviestCrates")), crateDedupe: isRec(dd) ? { offered: num(dd.offered), kept: num(dd.kept) } : undefined },
    generics: {
      largest: isRec(largest) ? { number: num(largest.number), name: str(largest.name), crate: str(largest.crate) } : undefined,
      hold: isRec(hold) ? { capacityKg: num(hold.capacityKg), accepted: strList(hold.accepted), refused: strList(hold.refused), totalKg: num(hold.totalKg) } : undefined,
      recent: strList(g("recent")),
      grouped: numRec(g("grouped")),
    },
    ext: { tonnes: strList(g("tonnes")), perishableIds: strList(g("perishableIds")), pageTwo: strList(g("pageTwo")), summaryLine: str(g("summaryLine")) },
    lookup: { vesselLookups: lookups, bangCrash: str(g("bangCrash")) },
    parser: {
      telegrams,
      telegramRejects,
      regexParts: isRec(rp) ? { id: scalar(rp.id) || undefined, mass: scalar(rp.mass) || undefined, unit: scalar(rp.unit) || undefined } : undefined,
      mentionedIds: strList(g("mentionedIds")),
    },
    faults: { loadLog, loadAttempts: num(g("loadAttempts")) },
    json: {
      exportJson: str(g("exportJson")),
      notice: isRec(notice) ? { vesselId: str(notice.vesselId), shipments: num(notice.shipments), totalKg: num(notice.totalKg) } : undefined,
      jsonError: isRec(je) ? { message: str(je.message) ?? "", line: num(je.line), position: num(je.position), path: str(je.path) ?? null } : undefined,
      jsonRejects,
    },
    inbox: { importReport: isRec(ir) ? { accepted: num(ir.accepted), rejected: num(ir.rejected) } : undefined, acceptedIds: strList(g("acceptedIds")), rejects, rejectSummary: numRec(g("rejectSummary")) },
    report: {
      portReport: isRec(pr) ? { shipments: num(pr.shipments), totalKg: num(pr.totalKg), rejected: num(pr.rejected), busiestVessel: str(pr.busiestVessel), topCategory: str(pr.topCategory), overloaded: strList(pr.overloaded) } : undefined,
      reportJson: str(g("reportJson")),
    },
    error: isRec(err) ? { type: str(err.type) ?? "Error", message: str(err.message) ?? "", line: num(err.line) ?? null } : null,
  };
}

// ───────────────────────── formatting ─────────────────────────

export function fmtNum(v: number, digits = 1): string {
  if (Number.isInteger(v)) return Math.abs(v) >= 1000 ? v.toLocaleString("en-US") : String(v);
  return Number(v.toFixed(digits)).toLocaleString("en-US", { maximumFractionDigits: digits });
}

export const fmtKg = (v: number | undefined): string => (v === undefined ? "—" : `${fmtNum(v)} kg`);

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** "Ada Ruiz (Pelican Run)" -> name + vessel. Anything else is just a name. */
export function splitCrew(entry: string): { name: string; vessel: string | undefined } {
  const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(entry);
  return m ? { name: m[1], vessel: m[2] } : { name: entry, vessel: undefined };
}

/** Output lines for the console, trimmed of a trailing empty line but keeping blank lines inside. */
export function outputLines(stdout: string): string[] {
  const lines = stdout.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

/** Sum of the values of a record. */
export const sumValues = (r: Record<string, number> | undefined): number => (r ? Object.values(r).reduce((a, b) => a + b, 0) : 0);

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

/** Plain-language advice for the compiler errors a LINQ and generics course runs into most. */
const ADVICE: Record<string, string> = {
  CS1002: "A semicolon is missing. Look at the end of this line, or the line above it.",
  CS1001: "The compiler expected a name here. Check for a missing word or a stray symbol.",
  CS1003: "A symbol is missing (often a comma, parenthesis or quote). Check this spot and the one before it.",
  CS1026: "A closing parenthesis ) is missing.",
  CS1513: "A closing brace } is missing. Check that every { has a matching }.",
  CS1022: "There is an extra brace }, or a type or statement in the wrong place.",
  CS1010: "A string is not closed: add the closing double quote.",
  CS1525: "Something is out of place in this expression. Look for a missing operand, a stray comma, or a lambda arrow (=>) typed wrongly.",
  CS1597: "A statement is missing its closing semicolon after a block or lambda.",
  CS0103: "That name does not exist here. Check the spelling and capital letters, and that it is declared above this line (inside a lambda, the parameter name must match the one before =>).",
  CS0117: "That type has no member with this name. Check the spelling and capitals (C# is case-sensitive).",
  CS0246: "That type name is not known. Check the spelling and capitals, that it is declared, and that the right using line is at the top (LINQ needs using System.Linq;).",
  CS0234: "That namespace has no such type or sub-namespace. Check the using line and the spelling.",
  CS1061: "That object has no member with this name. For LINQ methods (Where, Select, OrderBy ...) check the spelling and that using System.Linq; is at the top. For your own type, check the property name.",
  CS1929: "This extension method does not apply to this type. LINQ works on sequences (List<T>, arrays, IEnumerable<T>), not on a single item or a number. Check what you are calling it on.",
  CS1928: "No overload of this method fits the receiver and arguments. Compare them with what the method declares.",
  CS0411: "The compiler cannot work out the type argument from the call. Give it more to go on: name the type explicitly (Method<int>(...)) or pass an argument of the type you mean.",
  CS0305: "A generic type needs a different number of type arguments, such as List<int> or Dictionary<string, int>.",
  CS0308: "That type is not generic, so it cannot take <...> type arguments.",
  CS0314: "The type you passed does not meet the where T : constraint. It must be convertible to the constraint (for example it must implement IComparable<T>). Add the interface to the type, or pick a type that has it.",
  CS0311: "The type you passed does not satisfy the where T : constraint (no implicit conversion to the constraint type). Implement the interface, or use a type that does.",
  CS0315: "The type you passed does not satisfy the where T : constraint (boxing is not allowed here). Check what the constraint requires.",
  CS0452: "A where T : class constraint needs a reference type, not an int or other value type.",
  CS0453: "A where T : struct constraint needs a value type, not a class.",
  CS0310: "A where T : new() constraint needs a type with a public parameterless constructor.",
  CS0029: "The value's type does not fit the variable's type. A string cannot go in an int, and so on.",
  CS0266: "The result has a wider type than the variable (for example a double or an IEnumerable<T> going into an int or a List<T>). Cast on purpose, or finish with ToList() / ToArray() / Sum() as needed.",
  CS0037: "A null cannot be stored in a non-nullable type like int. Make the type nullable (int?) or give it a real value.",
  CS1662: "A lambda's body returns a type that does not match what the method expects. Check what the lambda is supposed to return (a bool for Where, a key for OrderBy).",
  CS1660: "A lambda needs a delegate type to become. Pass it to a method that expects one, or declare Func<...> yourself.",
  CS1593: "The lambda has the wrong number of parameters for this method.",
  CS1503: "An argument has the wrong type for this method. Check what the method expects.",
  CS1501: "No version of this method takes that many arguments.",
  CS7036: "A required argument is missing from this call (or a constructor was called without its arguments).",
  CS0019: "This operator cannot be used with these two types.",
  CS0021: "Square brackets [ ] cannot index this type. Convert it with ToList() or ToArray() first, or use ElementAt.",
  CS0165: "This variable is read before it was given a value. Assign it first.",
  CS0128: "That name is already used in this scope. Choose a different name, or assign to the existing variable.",
  CS0136: "A name used inside this block (often a lambda parameter) is also declared in the code around it. Pick a different name.",
  CS0161: "Not every path through this method returns a value. Add a return at the end.",
  CS8509: "The switch expression does not cover every possible value. Add a final discard arm: _ => ...",
  CS8510: "A switch arm can never match because an earlier arm already catches everything it would. Reorder: specific patterns first, general ones last.",
  CS8120: "This switch case can never be reached because an earlier case already handles it. Put specific cases before general ones.",
  CS8121: "That pattern cannot match a value of this type.",
  CS8070: "A switch expression arm is not allowed to fall through. Every arm needs a value after =>.",
  CS0535: "The class says it implements an interface but is missing one of its members. Add the method or property the interface asks for.",
  CS0738: "The member has the right name but the wrong return type for the interface. Match the interface's signature exactly.",
  CS0508: "The override must return the same type as the member it overrides.",
  CS0111: "Two methods in the same type have the same name and parameters. Rename one or change its parameters.",
  CS0121: "The call is ambiguous: two overloads fit equally well. Make an argument's type clearer.",
  CS1106: "Extension methods must be in a non-generic static class, as static methods whose first parameter starts with this.",
  CS1100: "An extension method's first parameter must start with the this keyword.",
  CS0120: "An instance member is being used without an object. Create the object with new first.",
  CS0200: "That property is read-only (get; only). Use a record's with expression, or add a setter / init.",
  CS8852: "An init-only property can only be set while the object is being created. Use a with expression to copy it with changes.",
  CS8618: "A non-nullable property or field is never given a value. Set it in the constructor, give it a default, or mark it required.",
  CS8600: "A possibly-null value is going into a non-nullable variable. Check for null, or make the variable nullable (string?).",
  CS8602: "This value might be null where it is used. Check for null first (?., ??, is not null).",
  CS8604: "A possibly-null value is being passed where null is not allowed.",
  CS8603: "A possibly-null value is being returned from a method that says it never returns null.",
  CS8629: "A nullable int? is used without checking it has a value. Use .Value after a check, ?? fallback, or TryGet-style code.",
  CS0201: "Only a call, assignment or increment can be a statement. A bare value or expression does nothing.",
  CS0160: "A catch for a broader exception type comes before this one. Order catches from most specific to most general.",
  CS1009: "An unknown escape sequence in a string. Use a verbatim string (@\"...\") for regex patterns, or double the backslash.",
  CS8858: "Only a record (or a struct) can be copied with a with expression. Check the type on the left.",
  CS0155: "Only types derived from Exception can be thrown or caught.",
  CS1626: "A yield return cannot be inside a try block with a catch.",
  CS0220: "This arithmetic overflows at compile time. The result does not fit the type.",
  CS8803: "Top-level statements must come BEFORE any class, record or enum. Move this line above the divider.",
  CS8801: "Top-level statements cannot see variables declared inside a class, or the other way round. Pass values as parameters.",
  CS5001: "The file has no statements to run. Add at least one statement above the divider line.",
};

export function adviceFor(code: string): string | undefined {
  return ADVICE[code];
}

/** Advice for the first error that has some, falling back to the wording of the message. */
export function compileAdvice(diags: Diagnostic[]): string | undefined {
  const errors = diags.filter((d) => d.severity === "error");
  for (const d of errors.length > 0 ? errors : diags) {
    const a = adviceFor(d.code);
    if (a) return a;
  }
  const text = (errors.length > 0 ? errors : diags).map((d) => d.text).join(" ");
  if (/does not contain a definition for/i.test(text)) return ADVICE.CS1061;
  if (/cannot be inferred|type arguments .* cannot be inferred/i.test(text)) return ADVICE.CS0411;
  if (/not exhaustive/i.test(text)) return ADVICE.CS8509;
  return undefined;
}

/** Extra advice for runtime exceptions, from the first lines of the stack trace. */
export function runtimeAdvice(message: string): string | undefined {
  if (/Sequence contains no matching element/i.test(message)) return "First() or Single() found nothing that matches. Use FirstOrDefault() and check for null, or Any() before you ask.";
  if (/Sequence contains no elements/i.test(message)) return "The sequence was empty when First(), Single(), Max() or Average() needed an item. Check Any() first, or use the OrDefault version.";
  if (/Sequence contains more than one/i.test(message)) return "Single() found two or more matches. Use First() if any one will do, or fix the condition so only one matches.";
  if (/Collection was modified/i.test(message)) return "A list was changed while a loop or query was reading it. Take a snapshot with ToList() before you modify the source.";
  if (/SwitchExpressionException/.test(message)) return "No arm of the switch expression matched this value. Add a final discard arm (_ => ...) so every value is covered.";
  if (/KeyNotFoundException/.test(message)) return "That key is not in the dictionary. Check with TryGetValue or ContainsKey first.";
  if (/NullReferenceException|Object reference not set/.test(message)) return "Something was null when you used it. Check for null (?., ??, is null) before using a value that may be missing.";
  if (/JsonException|JsonReaderException|is invalid after a property name|not a valid JSON/i.test(message)) return "The JSON text is malformed or does not match the type. Catch JsonException and read its LineNumber and Path to find the spot.";
  if (/FormatException/.test(message)) return "Text was not in the expected format. Use TryParse for input you do not control.";
  if (/InvalidCastException/.test(message)) return "A value was cast to a type it is not. Use pattern matching (is Crate c) or the as operator and check the result.";
  if (/OverflowException/.test(message)) return "A number did not fit its type. Use a larger type (long) or check the range first.";
  if (/ArgumentNullException/.test(message)) return "A null was passed to a method that does not accept it (often a LINQ call on a null list). Check the source before the query.";
  if (/ArgumentException/.test(message)) return "An argument was not acceptable: read the message for which one. A duplicate key in ToDictionary is a common cause.";
  if (/IndexOutOfRangeException/.test(message)) return "An array index was outside 0 to Length - 1. Check your loop bounds (< Length, not <=).";
  if (/ArgumentOutOfRangeException/.test(message)) return "An index or length was out of range, for example in a List, Skip/Take or Substring.";
  if (/DivideByZeroException/.test(message)) return "An integer was divided by zero. Check the divisor first.";
  if (/InvalidOperationException/.test(message)) return "The operation is not valid in the current state. Read the message for what to check.";
  if (/TimeLimit|timed out|too long/i.test(message)) return "The program ran for too long. Look for a loop that never ends.";
  return undefined;
}
