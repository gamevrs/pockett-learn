/**
 * SI-prefix formatting and parsing for electronics values. Pure, runs in Node.
 *
 *   formatSI(0.0047, "F")  → "4.7 mF"       formatSI(4700, "Ω")   → "4.7 kΩ"
 *   formatSI(1e-7, "F")    → "100 nF"       formatSI(0.5, "A")    → "500 mA"
 *   parseSI("4k7") → 4700   parseSI("100n") → 1e-7   parseSI("2.2u") → 2.2e-6   parseSI("4R7") → 4.7
 *   parseSI("10 kΩ") → 10000   parseSI("1M") → 1e6 (mega)   parseSI("1m") → 0.001 (milli)
 */

const PREFIXES: [number, string][] = [
  [1e12, "T"],
  [1e9, "G"],
  [1e6, "M"],
  [1e3, "k"],
  [1, ""],
  [1e-3, "m"],
  [1e-6, "µ"],
  [1e-9, "n"],
  [1e-12, "p"],
  [1e-15, "f"],
];

/** U+2212, the typographic minus used for negative values */
export const MINUS = "−";

export interface FormatOptions {
  /** significant digits (default 3): 4.7 k, 47.5 k, 1.23 M; trailing zeros are dropped */
  digits?: number;
  /** a space between the number and the prefix+unit (default true) */
  space?: boolean;
  /** use this prefix instead of choosing one, e.g. "m" to always show mA */
  prefix?: string;
}

/** Format a value with an SI prefix so the number shown is between 1 and 999. */
export function formatSI(value: number, unit = "", opts: FormatOptions = {}): string {
  const digits = Math.max(1, opts.digits ?? 3);
  const gap = opts.space === false ? "" : " ";
  if (Number.isNaN(value)) return "—";
  if (!Number.isFinite(value)) return `${value < 0 ? MINUS : ""}∞${gap}${unit}`.trimEnd();
  const sign = value < 0 ? MINUS : "";
  const abs = Math.abs(value);
  let mult: number;
  let pre: string;
  if (opts.prefix !== undefined) {
    const hit = PREFIXES.find(([, p]) => p === opts.prefix || (opts.prefix === "u" && p === "µ"));
    [mult, pre] = hit ?? [1, ""];
  } else if (abs === 0) {
    [mult, pre] = [1, ""];
  } else {
    // round to the requested significant digits first, so 999.96 becomes "1 k", not "1000"
    const rounded = Number(abs.toPrecision(digits));
    const hit = PREFIXES.find(([m]) => rounded >= m * (1 - 1e-12)) ?? PREFIXES[PREFIXES.length - 1];
    [mult, pre] = hit;
  }
  const mant = abs / mult;
  let text: string;
  if (opts.prefix !== undefined) {
    // fixed prefix: keep `digits` significant digits but never use exponent notation
    const intDigits = mant >= 1 ? Math.floor(Math.log10(mant)) + 1 : 1;
    text = trimZeros(mant.toFixed(Math.max(0, digits - intDigits)));
  } else {
    text = trimZeros(Number(mant.toPrecision(digits)).toString());
  }
  if (text === "0") return `0${gap}${pre}${unit}`.trimEnd();
  return `${sign}${text}${gap}${pre}${unit}`.trimEnd();
}

function trimZeros(s: string): string {
  return s.includes(".") && !s.includes("e") ? s.replace(/\.?0+$/, "") : s;
}

const PARSE_PREFIX: Record<string, number> = {
  T: 1e12,
  G: 1e9,
  M: 1e6,
  meg: 1e6,
  MEG: 1e6,
  Meg: 1e6,
  k: 1e3,
  K: 1e3,
  R: 1,
  r: 1,
  m: 1e-3,
  u: 1e-6,
  "µ": 1e-6,
  "μ": 1e-6,
  n: 1e-9,
  p: 1e-12,
  f: 1e-15,
};

const UNITS = ["ohms", "ohm", "Ω", "Hz", "F", "H", "V", "A", "W", "s"];

/**
 * Parse "4k7", "4.7k", "100n", "2.2u", "2u2", "4R7", "1M" (mega), "1m" (milli), "1meg", "10 kΩ", "100nF",
 * "3.3V", "−5", "1e-3". Prefix letters are case-sensitive (M mega, m milli) except K for kilo. A letter between
 * digits is the decimal point (RKM code, as printed on resistors and in schematics). Returns null if the text
 * is not a number.
 */
export function parseSI(input: string): number | null {
  let s = input.trim().replace(/−/g, "-").replace(/\s+/g, "");
  if (!s) return null;
  // strip a trailing unit (longest first, case-insensitive for "ohm")
  for (const u of UNITS) {
    const tail = s.slice(-u.length);
    if (tail === u || (u.startsWith("ohm") && tail.toLowerCase() === u)) {
      const rest = s.slice(0, -u.length);
      // "1F" is a farad, "1f" femto; only strip if a number (or prefix) is left
      if (/[\d.]$|[a-zA-Zµμ]$/.test(rest)) {
        s = rest;
        break;
      }
    }
  }
  const m = /^([+-]?)(\d+(?:\.\d*)?|\.\d+)(?:[eE]([+-]?\d+))?(meg|MEG|Meg|[TGMkKRrmuµμnpf])?(\d*)$/.exec(s);
  if (!m) return null;
  const [, sign, num, exp, pre, frac] = m;
  if (frac && (num.includes(".") || exp || !pre)) return null;
  const base = Number(frac ? `${num}.${frac}` : num) * (exp ? 10 ** Number(exp) : 1);
  const v = base * (pre ? PARSE_PREFIX[pre] : 1) * (sign === "-" ? -1 : 1);
  return Number.isFinite(v) ? v : null;
}

/** Round-trippable short form for inputs, e.g. 4700 → "4.7k", 1e-7 → "100n" (no unit, ASCII "u" for micro). */
export function toInputSI(value: number, digits = 3): string {
  return formatSI(value, "", { digits, space: false }).replace("µ", "u").replace(MINUS, "-");
}
