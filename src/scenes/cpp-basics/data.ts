import type { ProgramHandle } from "@/engine/program";

/**
 * What the Helios-1 control-room board reads from the learner's C++ program. A compiled program
 * can't be called back, so the board works from the values the program printed with
 * `scene("key", value)` (each one an `@scene {json}` line). Every value may be missing or the
 * wrong type: the readers below return `undefined` instead of guessing.
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

export const isRec = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
export const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
export const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);
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
/** A one-letter code: first character, upper case. */
const letter = (v: unknown): string | undefined => {
  const s = str(v)?.trim();
  return s ? s.charAt(0).toUpperCase() : undefined;
};

// ───────────────────────── the model ─────────────────────────

export interface BuildError {
  type: string;
  message: string;
  line: number | null;
}

export interface Reactor {
  core: { name?: string; temp?: number; max?: number; rods?: number; plasma?: boolean; mode?: string; pressure?: number; loops?: number; alarmLevel?: string; state?: string };
  power: { pellets?: number; trayCapacity?: number; trays?: number; emptySlots?: number; thermalKw?: number; electricKw?: number; efficiency?: number; netKw?: number; refills?: number; deviation?: number; fluxGain?: number; wrapped?: number; energyJ?: number };
  operator: { name?: string; clearance?: number; setpoint?: number; shift?: string; nameLength?: number; initial?: string; welcome?: string };
  interlocks: { probeTemp?: number; maxTemp?: number; alarmLevel?: string; flowLpm?: number; minFlow?: number; coolantOk?: boolean; canStart?: boolean; modeName?: string; scramNeeded?: boolean };
  ramp: { start?: number; ticks?: number; peak?: number; primeCycles?: number; skipped?: number; lastTick?: number; heatTotal?: number; coreMap?: string };
  rods: { levels?: number[]; count?: number; avg?: number; min?: number; minIndex?: number; max?: number };
  coolant: { names?: string[]; temps?: number[]; flows?: number[]; pumpRpm?: number; totalFlow?: number; avgFlow?: number };
  telemetry: { packet?: string; temp?: number; pressure?: number; state?: string; rods?: number; good?: number; bad?: number; logLine?: string };
  sensors: { names?: string[]; values?: number[]; limits?: number[]; overCount?: number; closest?: string };
  tally: { tally?: Record<string, number>; mostCommon?: string; mostCommonCount?: number; distinct?: number; pressureLimit?: number };
  analysis: { ranked?: string[]; firstWarning?: string; warnCount?: number; median?: number };
  control: { names?: string[]; insertions?: number[]; reactivity?: number[]; total?: number; fullyInserted?: number };
  state: { state?: string; code?: number; history?: string[]; rejected?: number };
  alarms: { codes?: string[]; messages?: string[]; count?: number; accepted?: number };
  shift: { log?: string[]; peak?: number; average?: number; warnings?: number; bad?: number; grade?: string; state?: string; levels?: Record<string, number>; operator?: string; shiftName?: string };
  error: BuildError | null;
}

/** The keys shown on the "Scene data" tab, in lesson order. */
export const SCENE_KEYS = [
  "reactorName", "coreTemp", "maxTemp", "fuelRods", "plasmaOn", "mode", "pressure", "loops",
  "pellets", "trayCapacity", "trays", "emptySlots", "thermalKw", "electricKw", "efficiency", "netKw", "refills", "deviation", "fluxGain", "wrapped", "energyJ",
  "operatorName", "clearance", "setpoint", "shift", "nameLength", "initial", "welcome",
  "probeTemp", "alarmLevel", "flowLpm", "minFlow", "coolantOk", "canStart", "modeName", "scramNeeded",
  "rampStart", "rampTicks", "rampPeak", "primeCycles", "skipped", "lastTick", "heatTotal", "coreMap",
  "rodLevels", "rodCount", "avgLevel", "minLevel", "minIndex", "maxLevel",
  "loopNames", "loopTemps", "loopFlows", "pumpRpm", "totalFlow", "avgFlow",
  "packet", "packetTemp", "packetPressure", "packetState", "packetRods", "goodPackets", "badPackets", "logLine",
  "sensorNames", "sensorValues", "sensorLimits", "overCount", "closestName",
  "tally", "mostCommon", "mostCommonCount", "distinctEvents", "pressureLimit",
  "rankedNames", "firstWarning", "warnCount", "medianRod",
  "controlNames", "controlInsertions", "controlReactivity", "totalReactivity", "fullyInserted",
  "state", "stateCode", "history", "rejected",
  "alarmCodes", "alarmMessages", "alarmCount", "acceptedReadings",
  "shiftLog", "shiftPeak", "shiftAverage", "shiftWarnings", "shiftBadReadings", "shiftGrade", "shiftState", "shiftLevels",
] as const;

export function readReactor(p: ProgramHandle | null): Reactor {
  const g = (k: string): unknown => (p ? readAny(p, k) : undefined);

  const err = g("build_error");
  const error: BuildError | null = isRec(err)
    ? { type: str(err.type) ?? "Error", message: str(err.message) ?? "", line: num(err.line) ?? null }
    : null;

  return {
    core: {
      name: str(g("reactorName")),
      temp: num(g("coreTemp")),
      max: num(g("maxTemp")),
      rods: num(g("fuelRods")),
      plasma: bool(g("plasmaOn")),
      mode: letter(g("mode")),
      pressure: num(g("pressure")),
      loops: num(g("loops")),
      alarmLevel: str(g("alarmLevel"))?.toUpperCase(),
      state: str(g("state")),
    },
    power: {
      pellets: num(g("pellets")), trayCapacity: num(g("trayCapacity")), trays: num(g("trays")), emptySlots: num(g("emptySlots")),
      thermalKw: num(g("thermalKw")), electricKw: num(g("electricKw")), efficiency: num(g("efficiency")), netKw: num(g("netKw")),
      refills: num(g("refills")), deviation: num(g("deviation")), fluxGain: num(g("fluxGain")), wrapped: num(g("wrapped")), energyJ: num(g("energyJ")),
    },
    operator: {
      name: str(g("operatorName")), clearance: num(g("clearance")), setpoint: num(g("setpoint")), shift: str(g("shift")),
      nameLength: num(g("nameLength")), initial: str(g("initial")), welcome: str(g("welcome")),
    },
    interlocks: {
      probeTemp: num(g("probeTemp")), maxTemp: num(g("maxTemp")), alarmLevel: str(g("alarmLevel"))?.toUpperCase(), flowLpm: num(g("flowLpm")),
      minFlow: num(g("minFlow")), coolantOk: bool(g("coolantOk")), canStart: bool(g("canStart")), modeName: str(g("modeName")), scramNeeded: bool(g("scramNeeded")),
    },
    ramp: {
      start: num(g("rampStart")), ticks: num(g("rampTicks")), peak: num(g("rampPeak")), primeCycles: num(g("primeCycles")),
      skipped: num(g("skipped")), lastTick: num(g("lastTick")), heatTotal: num(g("heatTotal")), coreMap: str(g("coreMap")),
    },
    rods: { levels: numList(g("rodLevels")), count: num(g("rodCount")), avg: num(g("avgLevel")), min: num(g("minLevel")), minIndex: num(g("minIndex")), max: num(g("maxLevel")) },
    coolant: {
      names: strList(g("loopNames")), temps: numList(g("loopTemps")), flows: numList(g("loopFlows")),
      pumpRpm: num(g("pumpRpm")), totalFlow: num(g("totalFlow")), avgFlow: num(g("avgFlow")),
    },
    telemetry: {
      packet: str(g("packet")), temp: num(g("packetTemp")), pressure: num(g("packetPressure")), state: str(g("packetState")),
      rods: num(g("packetRods")), good: num(g("goodPackets")), bad: num(g("badPackets")), logLine: str(g("logLine")),
    },
    sensors: { names: strList(g("sensorNames")), values: numList(g("sensorValues")), limits: numList(g("sensorLimits")), overCount: num(g("overCount")), closest: str(g("closestName")) },
    tally: { tally: numRec(g("tally")), mostCommon: str(g("mostCommon")), mostCommonCount: num(g("mostCommonCount")), distinct: num(g("distinctEvents")), pressureLimit: num(g("pressureLimit")) },
    analysis: { ranked: strList(g("rankedNames")), firstWarning: str(g("firstWarning")), warnCount: num(g("warnCount")), median: num(g("medianRod")) },
    control: { names: strList(g("controlNames")), insertions: numList(g("controlInsertions")), reactivity: numList(g("controlReactivity")), total: num(g("totalReactivity")), fullyInserted: num(g("fullyInserted")) },
    state: { state: str(g("state")), code: num(g("stateCode")), history: strList(g("history")), rejected: num(g("rejected")) },
    alarms: { codes: strList(g("alarmCodes")), messages: strList(g("alarmMessages")), count: num(g("alarmCount")), accepted: num(g("acceptedReadings")) },
    shift: {
      log: strList(g("shiftLog")), peak: num(g("shiftPeak")), average: num(g("shiftAverage")), warnings: num(g("shiftWarnings")), bad: num(g("shiftBadReadings")),
      grade: letter(g("shiftGrade")), state: str(g("shiftState")), levels: numRec(g("shiftLevels")), operator: str(g("operatorName")), shiftName: str(g("shift")),
    },
    error,
  };
}

/** True when the program sent at least one value for this panel. */
export const hasValues = (o: object): boolean => Object.values(o).some((v) => v !== undefined);

// ───────────────────────── formatting ─────────────────────────

export function fmtNum(v: number, digits = 2): string {
  if (Number.isInteger(v)) return Math.abs(v) >= 100000 ? v.toLocaleString("en-US") : String(v);
  return String(Number(v.toFixed(digits)));
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Output lines for the console, trimmed of a trailing empty line but keeping blank lines inside. */
export function outputLines(stdout: string): string[] {
  const lines = stdout.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines;
}

// ───────────────────────── colour ─────────────────────────

export const C = {
  lime: "#c5ee8a",
  limeSoft: "#abd373",
  limeDeep: "#4b7411",
  amber: "#fbbf24",
  red: "#f87171",
  heat: "#ffb26b",
  cool: "#8fb3c9",
  grey: "#9f9f9f",
} as const;

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function mix(a: string, b: string, t: number): string {
  const k = clamp(t, 0, 1);
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const ch = (x: number, y: number) => Math.round(x + (y - x) * k).toString(16).padStart(2, "0");
  return `#${ch(ar, br)}${ch(ag, bg)}${ch(ab, bb)}`;
}

/** Cool blue-grey up to warm heat, then amber and red as it nears dangerous temperatures. */
export function tempColor(t: number | undefined): string {
  if (t === undefined) return C.grey;
  if (t <= 250) return C.cool;
  if (t <= 450) return mix(C.cool, C.heat, (t - 250) / 200);
  if (t <= 560) return mix(C.heat, C.amber, (t - 450) / 110);
  return mix(C.amber, C.red, (t - 560) / 120);
}

// ───────────────────────── compiler and crash messages ─────────────────────────

export interface Diagnostic {
  /** "12:5", or "" when the message has no position. */
  where: string;
  severity: "error" | "warning" | "note";
  text: string;
  /** Source excerpt lines the compiler printed under the message. */
  excerpt: string[];
}

/** Parses gcc output like `main.cpp:12:5: error: expected ';' before '}' token`. */
export function parseDiagnostics(message: string): Diagnostic[] {
  const out: Diagnostic[] = [];
  for (const raw of message.split("\n")) {
    const l = raw.replace(/\r$/, "");
    if (l.trim().length === 0) continue;
    const m = /:(\d+):(\d+):\s*(fatal error|error|warning|note):\s*(.*)$/.exec(l);
    if (m) {
      out.push({ where: `${m[1]}:${m[2]}`, severity: m[3] === "warning" ? "warning" : m[3] === "note" ? "note" : "error", text: m[4], excerpt: [] });
    } else if (/^\s*\d*\s*\|/.test(l) && out.length > 0) {
      out[out.length - 1].excerpt.push(l);
    } else if (!/^(In function|In member function|In constructor|At global scope|In file included)/.test(l.trim())) {
      out.push({ where: "", severity: "error", text: l.trim(), excerpt: [] });
    }
  }
  return out;
}

const COMPILE_ADVICE: [RegExp, string][] = [
  [/expected '[;,]' (before|after)|expected ';'/, "A semicolon is missing. Look at the end of the line the compiler points to, or the line just above it."],
  [/'(cout|cin|cerr|endl)' (was not declared|is not a member of 'std')|forget to '#include <iostream>'/, "cout, cin and endl live in the <iostream> header. Add #include <iostream> at the top of the file and write std:: in front of the name."],
  [/forget to '#include <(\w+)>'|is not a member of 'std'/, "That name comes from a standard header you have not included. The compiler's note names the #include line to add."],
  [/was not declared in this scope|not declared/, "The compiler does not know that name here. Check the spelling and capital letters, and that it is declared above this line."],
  [/no matching function for call/, "No version of that function accepts these arguments. Check how many you pass and what types they are."],
  [/no match for 'operator<<'/, "The << operator does not know how to print that type. Print its fields one by one instead."],
  [/narrowing conversion/, "Curly-brace initialisation refuses to lose information silently (a double into an int, for example). Use the right type, or convert on purpose with static_cast."],
  [/invalid conversion from|cannot convert|could not convert/, "The value's type does not fit where you use it. Check the types on both sides, and convert on purpose with static_cast if you mean to."],
  [/control reaches end of non-void function/, "A function that promises to return a value must return one on every path. Add a return at the end."],
  [/redeclaration|redeclared|conflicting declaration|previous declaration/, "That name is already used in this scope. Choose a different name, or assign to the existing variable."],
  [/is private within this context|is protected within this context/, "Private members can only be used inside the class. Call a public member function instead."],
  [/assignment of read-only|read-only variable|read-only location/, "A const value (or a const method's data) cannot be changed. Remove the const or stop assigning to it."],
  [/uninitiali[sz]ed/, "A variable is read before it was given a value. Assign it first."],
  [/expected '\}' at end of input|expected declaration before '\}'/, "A closing brace } is missing or one too many. Check that every { has a matching }."],
  [/expected '\)'|expected '\('/, "A parenthesis is missing or misplaced. Check that every ( has a matching )."],
  [/missing terminating/, "A string is not closed. Add the closing double quote."],
  [/undefined reference to .?main|undefined reference to .?WinMain/, "The program needs a main function: int main() { ... }."],
  [/undefined reference to/, "A function was declared but never defined. Write its body, or check that the name and parameters match."],
  [/use of deleted function/, "That operation is not allowed for this type."],
  [/jump to case label|crosses initiali[sz]ation/, "A case that declares a variable needs its own braces: case X: { ... break; }."],
  [/cannot bind non-const lvalue reference|lvalue required/, "A reference (&) parameter needs a real variable, not a literal or a temporary value."],
  [/expected primary-expression|expected expression/, "Something is missing in this expression. Check for a stray operator or a missing value."],
  [/expected unqualified-id/, "A name is expected here. Check for a stray symbol, a missing semicolon above, or code outside of a function."],
];

export function compileAdvice(texts: string[]): string | undefined {
  const joined = texts.join("\n");
  for (const [re, advice] of COMPILE_ADVICE) if (re.test(joined)) return advice;
  return undefined;
}

/** Extra advice for crashes, from the first lines of the program's error output. */
export function runtimeAdvice(message: string): string | undefined {
  if (/std::out_of_range/.test(message)) return "An index or key was out of range (for example vector::at or map::at). Check the size first, or catch std::out_of_range.";
  if (/std::invalid_argument/.test(message)) return "A conversion such as std::stoi or std::stod received text that is not a number. Wrap it in try / catch.";
  if (/std::runtime_error/.test(message)) return "Your code threw a runtime_error that nothing caught. Wrap the call in try { ... } catch (const std::exception& e) { ... }.";
  if (/bad_alloc/.test(message)) return "The program asked for more memory than it could get. Look for a vector or string growing without limit.";
  if (/terminate called after throwing/.test(message)) return "An exception was thrown and nothing caught it. Add a try / catch around the code that can throw.";
  if (/Segmentation fault|SIGSEGV|exit(ed)? (with )?code 139/i.test(message)) return "The program touched memory it does not own. The usual cause is an index past the end of a vector or string: check the size, or use .at().";
  if (/Floating point exception|SIGFPE|exit(ed)? (with )?code 136/i.test(message)) return "An integer was divided by zero. Check the divisor first.";
  if (/Aborted|SIGABRT|exit(ed)? (with )?code 134/i.test(message)) return "The program stopped itself because something went badly wrong. Read the message above it.";
  if (/ran for too long|time limit|timed out|never ends/i.test(message)) return "The program ran for too long. Look for a loop whose condition never becomes false.";
  return undefined;
}
