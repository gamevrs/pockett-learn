/**
 * Pure logic for the part-marking widgets: resistor colour bands, E-series values and SMD resistor codes
 * (3-digit, 4-digit, R notation and EIA-96). No React, runs in Node.
 */

/* ───────────────────────── colour bands ───────────────────────── */

export interface BandColor {
  name: string;
  /** body colour used when drawing the band */
  hex: string;
  /** significant digit, or null when the colour is not a digit (gold, silver) */
  digit: number | null;
  /** multiplier */
  mult: number;
  /** tolerance in percent, or null when the colour is not a tolerance colour */
  tol: number | null;
}

/** Standard colour code. Multiplier of the digit colours is 10^digit. */
export const COLORS: BandColor[] = [
  { name: "black", hex: "#111111", digit: 0, mult: 1, tol: null },
  { name: "brown", hex: "#7a4a21", digit: 1, mult: 10, tol: 1 },
  { name: "red", hex: "#d62828", digit: 2, mult: 100, tol: 2 },
  { name: "orange", hex: "#f08a24", digit: 3, mult: 1e3, tol: null },
  { name: "yellow", hex: "#f2cc0c", digit: 4, mult: 1e4, tol: null },
  { name: "green", hex: "#2f9e44", digit: 5, mult: 1e5, tol: 0.5 },
  { name: "blue", hex: "#1c6fd1", digit: 6, mult: 1e6, tol: 0.25 },
  { name: "violet", hex: "#8a3fc4", digit: 7, mult: 1e7, tol: 0.1 },
  { name: "grey", hex: "#8b8b8b", digit: 8, mult: 1e8, tol: 0.05 },
  { name: "white", hex: "#f5f5f5", digit: 9, mult: 1e9, tol: null },
  { name: "gold", hex: "#c9a227", digit: null, mult: 0.1, tol: 5 },
  { name: "silver", hex: "#c4c4c4", digit: null, mult: 0.01, tol: 10 },
];

export const colorOf = (name: string): BandColor => COLORS.find((c) => c.name === name) ?? COLORS[0];

export type BandRole = "digit" | "mult" | "tol";

/** What each band position means for a 4- or 5-band resistor. */
export function bandRoles(count: 4 | 5): BandRole[] {
  return count === 4 ? ["digit", "digit", "mult", "tol"] : ["digit", "digit", "digit", "mult", "tol"];
}

/** Colours a band of the given role may take. */
export function allowedColors(role: BandRole): BandColor[] {
  if (role === "digit") return COLORS.filter((c) => c.digit !== null);
  if (role === "mult") return COLORS;
  return COLORS.filter((c) => c.tol !== null);
}

export interface BandReading {
  ok: boolean;
  ohms: number;
  tolerancePct: number;
  /** why not ok */
  error?: string;
}

/** Read a 4-band (two digits, multiplier, tolerance) or 5-band (three digits, multiplier, tolerance) resistor. */
export function decodeBands(bands: string[]): BandReading {
  const count = bands.length;
  if (count !== 4 && count !== 5) return { ok: false, ohms: NaN, tolerancePct: NaN, error: "A resistor has 4 or 5 bands." };
  const roles = bandRoles(count);
  let sig = 0;
  let mult = 1;
  let tol = NaN;
  for (let i = 0; i < count; i++) {
    const c = COLORS.find((x) => x.name === bands[i]);
    if (!c) return { ok: false, ohms: NaN, tolerancePct: NaN, error: `Unknown colour "${bands[i]}".` };
    if (roles[i] === "digit") {
      if (c.digit === null) return { ok: false, ohms: NaN, tolerancePct: NaN, error: `${c.name} is not a digit colour.` };
      sig = sig * 10 + c.digit;
    } else if (roles[i] === "mult") {
      mult = c.mult;
    } else {
      if (c.tol === null) return { ok: false, ohms: NaN, tolerancePct: NaN, error: `${c.name} is not a tolerance colour.` };
      tol = c.tol;
    }
  }
  return { ok: true, ohms: roundSig(sig * mult), tolerancePct: tol };
}

/** Clean up floating-point noise like 4700.000000000001. */
function roundSig(v: number): number {
  return Number(v.toPrecision(12));
}

/** Colour name for a tolerance in percent, or null. */
export function toleranceColor(pct: number): string | null {
  return COLORS.find((c) => c.tol !== null && Math.abs((c.tol as number) - pct) < 1e-9)?.name ?? null;
}

/**
 * The bands that show `ohms` and `tolerancePct`, or null if the value cannot be written with that many digits
 * (e.g. 4.75 kΩ needs 3 digits, so 4 bands cannot show it).
 */
export function encodeBands(ohms: number, tolerancePct: number, count: 4 | 5): string[] | null {
  const n = count === 4 ? 2 : 3;
  const tolName = toleranceColor(tolerancePct);
  if (!tolName || !(ohms > 0)) return null;
  for (let exp = -2; exp <= 9; exp++) {
    const sig = ohms / 10 ** exp;
    const r = Math.round(sig);
    if (Math.abs(sig - r) > 1e-9 * Math.max(1, sig)) continue;
    if (r < 10 ** (n - 1) || r >= 10 ** n) continue;
    const digits = String(r).split("").map((d) => COLORS[Number(d)].name);
    const multName = exp >= 0 ? COLORS[exp].name : exp === -1 ? "gold" : "silver";
    return [...digits, multName, tolName];
  }
  return null;
}

/** Re-draw a resistor with a different band count, keeping its value when that is possible. */
export function convertBands(bands: string[], count: 4 | 5): string[] {
  if (bands.length === count) return bands;
  const r = decodeBands(bands);
  if (r.ok) {
    const e = encodeBands(r.ohms, r.tolerancePct, count);
    if (e) return e;
  }
  return count === 4 ? ["brown", "black", "red", "gold"] : ["brown", "black", "black", "brown", "brown"];
}

/* ───────────────────────── E series ───────────────────────── */

/** Preferred values per decade, as 2-digit mantissas ×10 (E6/E12/E24: 10..91 means 1.0..9.1). */
export const E6 = [10, 15, 22, 33, 47, 68];
export const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
export const E24 = [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91];

/** EIA-96 / E96 values (3 significant digits, 100..976). Index 1 is 100, index 96 is 976. */
export const E96 = [
  100, 102, 105, 107, 110, 113, 115, 118, 121, 124, 127, 130, 133, 137, 140, 143, 147, 150, 154, 158, 162, 165, 169, 174, 178, 182, 187, 191, 196, 200, 205, 210, 215,
  221, 226, 232, 237, 243, 249, 255, 261, 267, 274, 280, 287, 294, 301, 309, 316, 324, 332, 340, 348, 357, 365, 374, 383, 392, 402, 412, 422, 432, 442, 453, 464, 475,
  487, 499, 511, 523, 536, 549, 562, 576, 590, 604, 619, 634, 649, 665, 681, 698, 715, 732, 750, 768, 787, 806, 825, 845, 866, 887, 909, 931, 953, 976,
];

export type ESeriesName = "E6" | "E12" | "E24" | "E96";

/** Typical tolerance usually sold with each series (typical, not a rule). */
export const SERIES_TOL: Record<ESeriesName, string> = { E6: "20 %", E12: "10 %", E24: "5 %", E96: "1 %" };

/** Which E series contain this value (mantissa compared to the series, any decade). */
export function eSeriesOf(ohms: number): ESeriesName[] {
  if (!(ohms > 0) || !Number.isFinite(ohms)) return [];
  const exp = Math.floor(Math.log10(ohms) + 1e-12);
  const m = ohms / 10 ** exp; // 1.0 .. 9.99
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6 * Math.max(1, b);
  const out: ESeriesName[] = [];
  if (E6.some((v) => near(m * 10, v))) out.push("E6");
  if (E12.some((v) => near(m * 10, v))) out.push("E12");
  if (E24.some((v) => near(m * 10, v))) out.push("E24");
  if (E96.some((v) => near(m * 100, v))) out.push("E96");
  return out;
}

/** The nearest standard value of a series (nearest on a log scale). */
export function nearestE(series: ESeriesName, ohms: number): number {
  if (!(ohms > 0)) return NaN;
  const exp = Math.floor(Math.log10(ohms) + 1e-12);
  const m = ohms / 10 ** exp;
  const list = series === "E96" ? E96.map((v) => v / 100) : (series === "E24" ? E24 : series === "E12" ? E12 : E6).map((v) => v / 10);
  const cand = [...list, 10]; // 10 = next decade's 1.0
  let best = cand[0];
  for (const c of cand) if (Math.abs(Math.log(c / m)) < Math.abs(Math.log(best / m))) best = c;
  return roundSig(best * 10 ** exp);
}

/* ───────────────────────── SMD resistor codes ───────────────────────── */

export type SmdScheme = "3-digit" | "4-digit" | "R" | "EIA-96" | "zero";

export const SMD_SCHEME_NAMES: Record<SmdScheme, string> = {
  "3-digit": "3-digit code",
  "4-digit": "4-digit code",
  R: "R notation (R is the decimal point)",
  "EIA-96": "EIA-96 (two digits and a letter)",
  zero: "zero-ohm jumper",
};

/** EIA-96 multiplier letters. */
export const EIA96_MULT: Record<string, number> = { Z: 0.001, Y: 0.01, R: 0.01, X: 0.1, S: 0.1, A: 1, B: 10, H: 10, C: 100, D: 1e3, E: 1e4, F: 1e5 };

export interface SmdReading {
  ok: boolean;
  ohms: number | null;
  scheme: SmdScheme | "";
  /** one line that shows the working (when ok) */
  working: string;
  /** learner-readable reason (when not ok) */
  error: string;
  /** an alternative reading of an ambiguous code, if any */
  alt?: string;
}

const bad = (error: string): SmdReading => ({ ok: false, ohms: null, scheme: "", working: "", error });

/** Normalise what the learner typed: trim, upper-case, drop spaces and a trailing "Ω"/"OHM". */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "").replace(/Ω$/, "");
}

/** Decode a printed SMD resistor code. */
export function decodeSmd(raw: string): SmdReading {
  const code = normalizeCode(raw);
  if (!code) return bad("Type the code printed on the chip, for example 472.");
  if (/^(0|00|000|0000|0R0|0R00)$/.test(code)) return { ok: true, ohms: 0, scheme: "zero", working: "all zeros: a zero-ohm link (a jumper), 0 Ω", error: "" };

  // EIA-96: two digits and a multiplier letter (not R, which is ambiguous with R notation: see below)
  let m = /^(\d\d)([ZYXSABHCDEF])$/.exec(code);
  if (m) {
    const idx = Number(m[1]);
    if (idx < 1 || idx > 96) return bad(`In EIA-96 the first two digits are an index from 01 to 96. "${m[1]}" is outside that table.`);
    const base = E96[idx - 1];
    const mult = EIA96_MULT[m[2]];
    return { ok: true, ohms: roundSig(base * mult), scheme: "EIA-96", working: `index ${m[1]} = ${base}, letter ${m[2]} = ×${mult}  →  ${base} × ${mult}`, error: "" };
  }
  // two digits then R: R notation (47R = 47 Ω); on a 1 % chip it could be EIA-96 with the ×0.01 letter
  m = /^(\d\d)R$/.exec(code);
  if (m) {
    const ohms = Number(m[1]);
    const idx = ohms;
    const alt = idx >= 1 && idx <= 96 ? `If this is a 1 % chip it could instead be EIA-96: index ${m[1]} = ${E96[idx - 1]}, R = ×0.01, so ${roundSig(E96[idx - 1] * 0.01)} Ω.` : undefined;
    return { ok: true, ohms, scheme: "R", working: `${m[1]}R: the R sits where the decimal point would be, so ${ohms} Ω`, error: "", alt };
  }
  // R notation: 4R7, R47, 1R0, 100R, 0R22
  m = /^(\d*)R(\d*)$/.exec(code);
  if (m && (m[1] || m[2])) {
    const text = `${m[1] || "0"}.${m[2] || "0"}`;
    const ohms = Number(text);
    return { ok: true, ohms, scheme: "R", working: `R is the decimal point: ${ohms} Ω`, error: "" };
  }
  if (/^\d{3}$/.test(code)) {
    const a = Number(code.slice(0, 2));
    const e = Number(code[2]);
    if (e > 6) return bad(`The last digit is the number of zeros to add, and ${e} would be a huge value. For a 3-digit code the last digit is normally 0 to 6.`);
    return { ok: true, ohms: a * 10 ** e, scheme: "3-digit", working: `${code.slice(0, 2)} followed by ${e} zero${e === 1 ? "" : "s"}  →  ${a} × 10^${e}`, error: "" };
  }
  if (/^\d{4}$/.test(code)) {
    const a = Number(code.slice(0, 3));
    const e = Number(code[3]);
    if (e > 6) return bad(`The last digit is the number of zeros to add, and ${e} would be a huge value. For a 4-digit code the last digit is normally 0 to 6.`);
    return { ok: true, ohms: a * 10 ** e, scheme: "4-digit", working: `${code.slice(0, 3)} followed by ${e} zero${e === 1 ? "" : "s"}  →  ${a} × 10^${e}`, error: "" };
  }
  if (/^\d\d$/.test(code)) return bad("Two digits alone are not a standard code. Chips print 3 or 4 characters: digits plus a zero count, an R, or an EIA-96 letter.");
  if (/^\d{5,}$/.test(code)) return bad("That is too many digits. SMD resistor codes have 3 or 4 characters.");
  if (/^\d{2}[A-Z]$/.test(code)) return bad(`"${code[2]}" is not an EIA-96 multiplier letter. The letters are Z, Y/R, X/S, A, B/H, C, D, E and F.`);
  if (/^[A-Z]/.test(code) && !code.includes("R")) return bad("A code starts with digits. EIA-96 is two digits and then one letter, like 01C.");
  return bad(`"${code}" does not match 3-digit, 4-digit, R notation or EIA-96.`);
}

/** Does a state decode to the goal's ohms (relative 1e-6)? */
export function sameOhms(a: number | null | undefined, b: number): boolean {
  if (a === null || a === undefined || !Number.isFinite(a)) return false;
  if (b === 0) return a === 0;
  return Math.abs(a - b) <= 1e-6 * Math.abs(b);
}

/** Example codes for the quick-pick chips, with a short label. */
export const SMD_EXAMPLES: { code: string; note: string }[] = [
  { code: "472", note: "3-digit" },
  { code: "4701", note: "4-digit" },
  { code: "4R7", note: "R notation" },
  { code: "R47", note: "R notation" },
  { code: "01C", note: "EIA-96" },
  { code: "68B", note: "EIA-96" },
  { code: "000", note: "jumper" },
];
