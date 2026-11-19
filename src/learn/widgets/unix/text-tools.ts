/**
 * The text tools of the simulated shell: tr, sed, cut, awk, paste, rev, tac, seq and printf. Pure TypeScript, no
 * React, no shell state: each tool gets its arguments, standard input and a way to read (and, for `sed -i`, write)
 * files, and returns an exit status. Behaviour and error messages follow GNU coreutils, GNU sed and gawk, in a
 * small subset that covers the classic one-liners (word counts, field picking, line ranges, transposing a file).
 */

export interface ToolIo {
  /** The name the tool was called by, for error messages. */
  name: string;
  argv: string[];
  stdin: string | null;
  /** Read a file operand ("-" is standard input). Reports its own error and returns null when it can't. */
  read(path: string): string | null;
  /** Replace a file's contents (sed -i). Reports its own error and returns false when it can't. */
  write?(path: string, content: string): boolean;
  out(text: string): void;
  /** One line of standard error (a newline is added when missing). */
  err(line: string): void;
}

type Tool = (io: ToolIo) => number;

// ───────────────────────────── Shared helpers ─────────────────────────────

export const splitLines = (s: string) => {
  if (s === "") return [];
  const lines = s.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
};

interface Parsed {
  flags: Set<string>;
  vals: Record<string, string[]>;
  rest: string[];
  bad: string | null;
}

/**
 * GNU-style short options: -cs is -c -s; `valued` options take a value (-d, or -d ,). Long options in `longs` map
 * "--name" or "--name=value" to a short letter. A lone "-" is an operand; "--" ends the options.
 */
function getopts(args: string[], allowed: string, valued = "", longs: Record<string, string> = {}): Parsed {
  const flags = new Set<string>();
  const vals: Record<string, string[]> = {};
  const rest: string[] = [];
  let bad: string | null = null;
  const put = (k: string, v: string) => (vals[k] ??= []).push(v);
  let i = 0;
  for (; i < args.length; i++) {
    const a = args[i];
    if (a === "--") {
      i++;
      break;
    }
    if (a.startsWith("--")) {
      const [name, value] = a.includes("=") ? [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)] : [a, undefined];
      const short = longs[name];
      if (!short) bad = bad ?? name;
      else if (valued.includes(short)) {
        const v = value ?? args[++i];
        if (v === undefined) bad = bad ?? `-${short}`;
        else put(short, v);
      } else flags.add(short);
      continue;
    }
    if (!a.startsWith("-") || a === "-" || /^-\d/.test(a)) {
      rest.push(a);
      continue;
    }
    for (let j = 1; j < a.length; j++) {
      const ch = a[j];
      if (valued.includes(ch)) {
        const v = j + 1 < a.length ? a.slice(j + 1) : args[++i];
        if (v === undefined) bad = bad ?? `-${ch}`;
        else put(ch, v);
        break;
      }
      if (!allowed.includes(ch)) {
        bad = bad ?? ch;
        continue;
      }
      flags.add(ch);
    }
  }
  rest.push(...args.slice(i));
  return { flags, vals, rest, bad };
}

function badOption(io: ToolIo, bad: string, code = 1): number {
  if (bad.startsWith("--")) io.err(`${io.name}: unrecognized option '${bad}'`);
  else if (bad.startsWith("-")) io.err(`${io.name}: option requires an argument -- '${bad.slice(1)}'`);
  else io.err(`${io.name}: invalid option -- '${bad}'`);
  io.err(`Try '${io.name} --help' for more information.`);
  return code;
}

/** Concatenate the input files (standard input when there are none). */
function readAll(io: ToolIo, files: string[]): { text: string; code: number } {
  let text = "";
  let code = 0;
  for (const f of files.length ? files : ["-"]) {
    const t = f === "-" ? io.stdin ?? "" : io.read(f);
    if (t === null) {
      code = 1;
      continue;
    }
    text += t;
  }
  return { text, code };
}

/** C-style escapes: \n \t \r \\ \a \b \f \v \0NNN / \NNN octal. Unknown escapes keep their backslash. */
export function unescapeC(s: string, keepUnknown = true): string {
  return s.replace(/\\([0-7]{1,3}|.)/g, (m, ch: string) => {
    if (/^[0-7]+$/.test(ch)) return String.fromCharCode(parseInt(ch, 8));
    const map: Record<string, string> = { n: "\n", t: "\t", r: "\r", "\\": "\\", a: "\x07", b: "\b", f: "\f", v: "\v", '"': '"', "/": "/" };
    return map[ch] ?? (keepUnknown ? m : ch);
  });
}

// ───────────────────────────── Regular expressions ─────────────────────────────

const POSIX_CLASSES: Record<string, string> = {
  alpha: "a-zA-Z",
  digit: "0-9",
  alnum: "a-zA-Z0-9",
  upper: "A-Z",
  lower: "a-z",
  space: " \\t\\n\\r\\f\\v",
  blank: " \\t",
  punct: "!-\\/:-@\\[-`{-~",
  xdigit: "0-9A-Fa-f",
  cntrl: "\\x00-\\x1f\\x7f",
  print: " -~",
  graph: "!-~",
};

/**
 * A POSIX regular expression (basic, as grep and sed use by default, or extended, as with -E and in awk) turned
 * into JavaScript regex source. In a basic regex + ? | ( ) { } are plain characters and \+ \? \| \( \) \{ \} are
 * the operators. Bracket classes like [[:digit:]] and the word edges \< \> work in both.
 */
export function posixToJs(pattern: string, mode: "basic" | "extended"): string {
  let s = "";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "[") {
      // a bracket expression: copy it, expanding [:class:] and escaping what JavaScript would read differently
      let j = i + 1;
      let body = "";
      if (pattern[j] === "^") {
        body += "^";
        j++;
      }
      if (pattern[j] === "]") {
        body += "\\]";
        j++;
      }
      let closed = false;
      while (j < pattern.length) {
        if (pattern[j] === "]") {
          closed = true;
          break;
        }
        const cls = /^\[:([a-z]+):\]/.exec(pattern.slice(j));
        if (cls && POSIX_CLASSES[cls[1]]) {
          body += POSIX_CLASSES[cls[1]];
          j += cls[0].length;
          continue;
        }
        if (pattern[j] === "\\") {
          // inside brackets a backslash is an ordinary character in POSIX; keep the common \n \t \] spellings working
          const next = pattern[j + 1];
          if (next === "n" || next === "t" || next === "]" || next === "\\" || next === "-") {
            body += "\\" + next;
            j += 2;
            continue;
          }
          body += "\\\\";
          j++;
          continue;
        }
        if (pattern[j] === "[") body += "\\[";
        else body += pattern[j];
        j++;
      }
      if (!closed) {
        s += "\\[";
        i++;
        continue;
      }
      s += `[${body}]`;
      i = j + 1;
      continue;
    }
    if (ch === "\\" && i + 1 < pattern.length) {
      const next = pattern[i + 1];
      if (next === "<" || next === ">") s += "\\b";
      else if (mode === "basic" && "+?|(){}".includes(next)) s += next;
      else s += ch + next;
      i += 2;
      continue;
    }
    if (mode === "basic" && "+?|(){}".includes(ch)) s += "\\" + ch;
    else if (mode === "basic" && ch === "*" && (s === "" || s === "^")) s += "\\*";
    else s += ch;
    i++;
  }
  return s;
}

function compile(pattern: string, mode: "basic" | "extended", flags = ""): RegExp | null {
  try {
    return new RegExp(posixToJs(pattern, mode), flags);
  } catch {
    return null;
  }
}

// ───────────────────────────── printf formatting ─────────────────────────────

interface Spec {
  flags: string;
  width: number | null;
  prec: number | null;
  conv: string;
}

/** One printf argument: as a number, as a string, and whether it is a number for %c. */
interface Arg {
  num(): number;
  str(): string;
  isNum: boolean;
}

function pad(body: string, sign: string, spec: Spec, numeric: boolean): string {
  const width = spec.width ?? 0;
  const len = sign.length + body.length;
  if (len >= width) return sign + body;
  if (spec.flags.includes("-")) return sign + body + " ".repeat(width - len);
  if (numeric && spec.flags.includes("0") && (spec.prec === null || !"diouxX".includes(spec.conv))) return sign + "0".repeat(width - len) + body;
  return " ".repeat(width - len) + sign + body;
}

/** C's %e: at least two exponent digits. */
function expForm(n: number, prec: number, upper: boolean): string {
  const [mant, exp] = n.toExponential(prec).split("e");
  const e = Number(exp);
  const s = `${mant}e${e < 0 ? "-" : "+"}${String(Math.abs(e)).padStart(2, "0")}`;
  return upper ? s.toUpperCase() : s;
}

/** C's %g: the shorter of %e and %f, trailing zeros removed (unless #). */
function gForm(n: number, prec: number, alt: boolean, upper: boolean): string {
  const p = prec === 0 ? 1 : prec;
  if (n === 0) return alt ? (0).toFixed(p - 1) : "0";
  const x = Math.floor(Math.log10(Math.abs(Number(n.toExponential(p - 1)))));
  let s = x < -4 || x >= p ? expForm(n, p - 1, upper) : n.toFixed(Math.max(0, p - 1 - x));
  if (!alt) {
    if (s.includes("e") || s.includes("E")) s = s.replace(/\.?0+(?=[eE])/, "");
    else if (s.includes(".")) s = s.replace(/\.?0+$/, "");
  }
  return s;
}

function formatOne(spec: Spec, arg: Arg): string {
  const { conv, flags } = spec;
  if (conv === "s" || conv === "b") {
    // %b (the shell's printf): the argument's own backslash escapes are expanded
    let s = conv === "b" ? unescapeC(arg.str()) : arg.str();
    if (spec.prec !== null) s = s.slice(0, spec.prec);
    return pad(s, "", spec, false);
  }
  if (conv === "c") {
    const s = arg.isNum ? String.fromCharCode(Math.trunc(arg.num())) : arg.str().slice(0, 1);
    return pad(s, "", spec, false);
  }
  const n = arg.num();
  if (!Number.isFinite(n)) return pad(Number.isNaN(n) ? "nan" : "inf", n < 0 ? "-" : flags.includes("+") ? "+" : "", { ...spec, flags: spec.flags.replace("0", "") }, true);
  const sign = n < 0 ? "-" : flags.includes("+") ? "+" : flags.includes(" ") ? " " : "";
  const a = Math.abs(n);
  let body: string;
  switch (conv) {
    case "d":
    case "i":
    case "u": {
      body = Math.trunc(a).toFixed(0);
      if (spec.prec !== null) body = body.padStart(spec.prec, "0");
      break;
    }
    case "o":
      body = Math.trunc(a).toString(8);
      if (flags.includes("#") && !body.startsWith("0")) body = "0" + body;
      break;
    case "x":
    case "X":
      body = Math.trunc(a).toString(16);
      if (conv === "X") body = body.toUpperCase();
      if (flags.includes("#") && a !== 0) body = (conv === "X" ? "0X" : "0x") + body;
      break;
    case "f":
    case "F":
      body = a.toFixed(spec.prec ?? 6);
      if (flags.includes("#") && !body.includes(".")) body += ".";
      break;
    case "e":
    case "E":
      body = expForm(a, spec.prec ?? 6, conv === "E");
      break;
    default:
      body = gForm(a, spec.prec ?? 6, flags.includes("#"), conv === "G");
  }
  return pad(body, sign, spec, true);
}

/**
 * Format with C printf rules. `next` hands out the arguments; `star` reads a * width. Returns the text and
 * whether the format used any argument (the shell's printf repeats the format while arguments are left).
 */
function formatC(fmt: string, next: () => Arg | null): { text: string; used: boolean; bad: string | null } {
  let out = "";
  let used = false;
  let i = 0;
  while (i < fmt.length) {
    const ch = fmt[i];
    if (ch !== "%") {
      out += ch;
      i++;
      continue;
    }
    if (fmt[i + 1] === "%") {
      out += "%";
      i += 2;
      continue;
    }
    const m = /^%([-+ #0]*)(\*|\d+)?(?:\.(\*|\d*))?([diouxXeEfFgGcsb])/.exec(fmt.slice(i));
    if (!m) return { text: out, used, bad: fmt.slice(i, i + 2) };
    const take = () => {
      used = true;
      return next();
    };
    const width = m[2] === "*" ? Math.trunc(take()?.num() ?? 0) : m[2] ? Number(m[2]) : null;
    const prec = m[3] === "*" ? Math.trunc(take()?.num() ?? 0) : m[3] !== undefined ? Number(m[3] || 0) : null;
    const spec: Spec = { flags: m[1] + (width !== null && width < 0 ? "-" : ""), width: width === null ? null : Math.abs(width), prec, conv: m[4] };
    const arg = take() ?? { num: () => 0, str: () => "", isNum: false };
    out += formatOne(spec, arg);
    i += m[0].length;
  }
  return { text: out, used, bad: null };
}

// ───────────────────────────── tr ─────────────────────────────

function charRange(a: number, b: number): string[] {
  const out: string[] = [];
  for (let c = a; c <= b; c++) out.push(String.fromCharCode(c));
  return out;
}

const TR_CLASSES: Record<string, () => string[]> = {
  alpha: () => [...charRange(65, 90), ...charRange(97, 122)],
  digit: () => charRange(48, 57),
  alnum: () => [...charRange(48, 57), ...charRange(65, 90), ...charRange(97, 122)],
  upper: () => charRange(65, 90),
  lower: () => charRange(97, 122),
  space: () => [" ", "\t", "\n", "\r", "\f", "\v"],
  blank: () => [" ", "\t"],
  punct: () => charRange(33, 126).filter((c) => !/[a-zA-Z0-9]/.test(c)),
  xdigit: () => [...charRange(48, 57), ...charRange(65, 70), ...charRange(97, 102)],
  cntrl: () => [...charRange(0, 31), "\x7f"],
  print: () => charRange(32, 126),
  graph: () => charRange(33, 126),
};

/** Expand a tr set ("a-z", "[:upper:]", "\n", "[x*]") into its characters. A "[c*]" fill is returned as a marker. */
function trSet(spec: string, io: ToolIo): { chars: string[]; fill: string | null } | null {
  const chars: string[] = [];
  let fill: string | null = null;
  const one = (s: string, i: number): [string, number] => {
    if (s[i] !== "\\" || i + 1 >= s.length) return [s[i], i + 1];
    const oct = /^[0-7]{1,3}/.exec(s.slice(i + 1));
    if (oct) return [String.fromCharCode(parseInt(oct[0], 8)), i + 1 + oct[0].length];
    const map: Record<string, string> = { n: "\n", t: "\t", r: "\r", a: "\x07", b: "\b", f: "\f", v: "\v", "\\": "\\" };
    return [map[s[i + 1]] ?? s[i + 1], i + 2];
  };
  let i = 0;
  while (i < spec.length) {
    const cls = /^\[:([a-z]+):\]/.exec(spec.slice(i));
    if (cls) {
      const f = TR_CLASSES[cls[1]];
      if (!f) {
        io.err(`tr: invalid character class '${cls[1]}'`);
        return null;
      }
      chars.push(...f());
      i += cls[0].length;
      continue;
    }
    const rep = /^\[(\\?.)\*(\d*)\]/.exec(spec.slice(i));
    if (rep) {
      const [c] = one(rep[1], 0);
      const n = rep[2] ? parseInt(rep[2], rep[2].startsWith("0") ? 8 : 10) : 0;
      if (n > 0) for (let k = 0; k < n; k++) chars.push(c);
      else fill = c;
      i += rep[0].length;
      continue;
    }
    const [c, j] = one(spec, i);
    if (spec[j] === "-" && j + 1 < spec.length) {
      const [d, k] = one(spec, j + 1);
      if (d.charCodeAt(0) < c.charCodeAt(0)) {
        io.err(`tr: range-endpoints of '${c}-${d}' are in reverse collating sequence order`);
        return null;
      }
      chars.push(...charRange(c.charCodeAt(0), d.charCodeAt(0)));
      i = k;
      continue;
    }
    chars.push(c);
    i = j;
  }
  return { chars, fill };
}

const tr: Tool = (io) => {
  const p = getopts(io.argv, "cCds", "", { "--complement": "c", "--delete": "d", "--squeeze-repeats": "s" });
  if (p.bad) return badOption(io, p.bad);
  const complement = p.flags.has("c") || p.flags.has("C");
  const del = p.flags.has("d");
  const squeeze = p.flags.has("s");
  const ops = p.rest;
  if (ops.length === 0) {
    io.err("tr: missing operand");
    io.err("Try 'tr --help' for more information.");
    return 1;
  }
  const translating = !del && ops.length >= 2;
  if (!del && !squeeze && ops.length < 2) {
    io.err(`tr: missing operand after '${ops[0]}'`);
    io.err("Two strings must be given when translating.");
    io.err("Try 'tr --help' for more information.");
    return 1;
  }
  if (ops.length > 2 || (del && !squeeze && ops.length > 1)) {
    io.err(`tr: extra operand '${ops[del && !squeeze ? 1 : 2]}'`);
    if (del && !squeeze) io.err("Only one string may be given when deleting without squeezing repeats.");
    io.err("Try 'tr --help' for more information.");
    return 1;
  }
  const s1 = trSet(ops[0], io);
  const s2 = ops[1] !== undefined ? trSet(ops[1], io) : { chars: [], fill: null };
  if (!s1 || !s2) return 1;
  const set1 = new Set(s1.chars);
  const in1 = (ch: string) => (complement ? !set1.has(ch) : set1.has(ch));
  const map = new Map<string, string>();
  let toLast: string | null = null;
  if (translating) {
    let two = s2.chars;
    if (s2.fill !== null) two = [...two, ...Array(Math.max(0, s1.chars.length - two.length)).fill(s2.fill)];
    if (two.length === 0) {
      io.err("tr: when not truncating set1, string2 must be non-empty");
      return 1;
    }
    if (complement) toLast = two[two.length - 1];
    else s1.chars.forEach((ch, i) => map.set(ch, two[Math.min(i, two.length - 1)]));
  }
  // characters squeezed: the last set given (set2 when there are two)
  const squeezeSet = squeeze ? (ops.length === 2 ? new Set(s2.chars.length ? s2.chars : s2.fill ? [s2.fill] : []) : null) : null;
  const squeezes = (ch: string) => (squeezeSet ? squeezeSet.has(ch) : in1(ch));
  let out = "";
  let last: string | null = null;
  for (const ch of io.stdin ?? "") {
    if (del && in1(ch)) continue;
    let c = ch;
    if (translating) c = toLast !== null ? (in1(ch) ? toLast : ch) : map.get(ch) ?? ch;
    if (squeeze && c === last && squeezes(c)) continue;
    out += c;
    last = c;
  }
  io.out(out);
  return 0;
};

// ───────────────────────────── cut ─────────────────────────────

function parseList(list: string): ((n: number) => boolean) | null {
  const ranges: [number, number][] = [];
  for (const part of list.split(",")) {
    const m = /^(\d*)(-?)(\d*)$/.exec(part.trim());
    if (!m || (!m[1] && !m[3]) || (!m[2] && !m[1])) return null;
    const a = m[1] ? Number(m[1]) : 1;
    const b = m[2] ? (m[3] ? Number(m[3]) : Infinity) : a;
    if (a < 1 || b < a) return null;
    ranges.push([a, b]);
  }
  return (n) => ranges.some(([a, b]) => n >= a && n <= b);
}

const cut: Tool = (io) => {
  const p = getopts(io.argv, "sn", "bcdfo", { "--delimiter": "d", "--fields": "f", "--characters": "c", "--bytes": "b", "--only-delimited": "s", "--output-delimiter": "o" });
  if (p.bad) return badOption(io, p.bad);
  const mode = p.vals.f ? "f" : p.vals.c ? "c" : p.vals.b ? "c" : null;
  if (!mode) {
    io.err("cut: you must specify a list of bytes, characters, or fields");
    io.err("Try 'cut --help' for more information.");
    return 1;
  }
  const listText = (p.vals.f ?? p.vals.c ?? p.vals.b)[0];
  const inList = parseList(listText);
  if (!inList) {
    io.err(`cut: invalid field range`);
    io.err("Try 'cut --help' for more information.");
    return 1;
  }
  const delim = p.vals.d ? unescapeC(p.vals.d[p.vals.d.length - 1]) : "\t";
  if (delim.length !== 1) {
    io.err("cut: the delimiter must be a single character");
    io.err("Try 'cut --help' for more information.");
    return 1;
  }
  if (p.vals.d && mode !== "f") {
    io.err("cut: an input delimiter may be specified only when operating on fields");
    io.err("Try 'cut --help' for more information.");
    return 1;
  }
  const outDelim = p.vals.o ? p.vals.o[0] : mode === "f" ? delim : "";
  const { text, code } = readAll(io, p.rest);
  let out = "";
  for (const line of splitLines(text)) {
    if (mode === "c") {
      out += [...line].filter((_, i) => inList(i + 1)).join(outDelim) + "\n";
      continue;
    }
    if (!line.includes(delim)) {
      if (!p.flags.has("s")) out += line + "\n";
      continue;
    }
    out += line.split(delim).filter((_, i) => inList(i + 1)).join(outDelim) + "\n";
  }
  io.out(out);
  return code;
};

// ───────────────────────────── paste, rev, tac ─────────────────────────────

const paste: Tool = (io) => {
  const p = getopts(io.argv, "s", "d", { "--serial": "s", "--delimiters": "d" });
  if (p.bad) return badOption(io, p.bad);
  // "\0" in the list means "no delimiter"
  const delims = p.vals.d ? [...unescapeC(p.vals.d[0])].map((d) => (d === "\u0000" ? "" : d)) : ["\t"];
  if (delims.length === 0) delims.push("");
  const files = p.rest.length ? p.rest : ["-"];
  const cols: string[][] = [];
  let code = 0;
  let stdinUsed = false;
  for (const f of files) {
    let t: string | null;
    if (f === "-") {
      // "-" twice reads alternate lines from standard input in GNU; here the second "-" just gets nothing
      t = stdinUsed ? "" : io.stdin ?? "";
      stdinUsed = true;
    } else t = io.read(f);
    if (t === null) {
      code = 1;
      continue;
    }
    cols.push(splitLines(t));
  }
  let out = "";
  if (p.flags.has("s")) {
    for (const lines of cols) out += lines.map((l, i) => (i ? delims[(i - 1) % delims.length] : "") + l).join("") + "\n";
  } else {
    const rows = Math.max(0, ...cols.map((c) => c.length));
    for (let r = 0; r < rows; r++) out += cols.map((c, j) => (j ? delims[(j - 1) % delims.length] : "") + (c[r] ?? "")).join("") + "\n";
  }
  io.out(out);
  return code;
};

const rev: Tool = (io) => {
  const { text, code } = readAll(io, io.argv);
  io.out(splitLines(text).map((l) => [...l].reverse().join("") + "\n").join(""));
  return code;
};

const tac: Tool = (io) => {
  const { text, code } = readAll(io, io.argv);
  io.out(splitLines(text).reverse().map((l) => l + "\n").join(""));
  return code;
};

// ───────────────────────────── seq ─────────────────────────────

const seq: Tool = (io) => {
  const p = getopts(io.argv, "w", "sf", { "--separator": "s", "--equal-width": "w" });
  if (p.bad) return badOption(io, p.bad);
  const nums = p.rest;
  if (nums.length === 0) {
    io.err("seq: missing operand");
    io.err("Try 'seq --help' for more information.");
    return 1;
  }
  if (nums.length > 3) {
    io.err(`seq: extra operand '${nums[3]}'`);
    io.err("Try 'seq --help' for more information.");
    return 1;
  }
  for (const n of nums) {
    if (!/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(n)) {
      io.err(`seq: invalid floating point argument: '${n}'`);
      io.err("Try 'seq --help' for more information.");
      return 1;
    }
  }
  const [first, step, last] = nums.length === 1 ? ["1", "1", nums[0]] : nums.length === 2 ? [nums[0], "1", nums[1]] : nums;
  const decimals = Math.max(...[first, step].map((n) => (n.includes(".") && !/[eE]/.test(n) ? n.length - n.indexOf(".") - 1 : 0)));
  const a = Number(first);
  const d = Number(step);
  const b = Number(last);
  if (d === 0) {
    io.err(`seq: invalid Zero increment value: '${step}'`);
    io.err("Try 'seq --help' for more information.");
    return 1;
  }
  const sep = p.vals.s ? unescapeC(p.vals.s[0]) : "\n";
  const vals: string[] = [];
  for (let k = 0; vals.length < 100_000; k++) {
    const v = a + k * d;
    if (d > 0 ? v > b + 1e-9 : v < b - 1e-9) break;
    vals.push(v.toFixed(decimals));
  }
  let shown = vals;
  if (p.flags.has("w")) {
    const width = Math.max(...vals.map((v) => v.replace("-", "").length));
    shown = vals.map((v) => (v.startsWith("-") ? "-" + v.slice(1).padStart(width, "0") : v.padStart(width, "0")));
  }
  if (p.vals.f) {
    const fmt = p.vals.f[0];
    shown = vals.map((v) => formatC(fmt, () => ({ num: () => Number(v), str: () => v, isNum: true })).text);
  }
  io.out(shown.length ? shown.join(sep) + "\n" : "");
  return 0;
};

// ───────────────────────────── printf (the command) ─────────────────────────────

const printfCmd: Tool = (io) => {
  if (io.argv.length === 0) {
    io.err("printf: missing operand");
    io.err("Try 'printf --help' for more information.");
    return 1;
  }
  const fmt = unescapeC(io.argv[0]);
  const args = io.argv.slice(1);
  let ai = 0;
  let code = 0;
  const next = (): Arg | null => {
    if (ai >= args.length) return null;
    const a = args[ai++];
    return {
      isNum: false,
      str: () => a,
      num: () => {
        if (/^['"]./.test(a)) return a.charCodeAt(1);
        const n = Number(a);
        if (a.trim() === "" || !Number.isFinite(n)) {
          io.err(`printf: '${a}': expected a numeric value`);
          code = 1;
          return 0;
        }
        return n;
      },
    };
  };
  let out = "";
  // the format is reused while arguments are left
  for (let round = 0; round < 1000; round++) {
    const r = formatC(fmt, next);
    if (r.bad) {
      io.err(`printf: ${r.bad}: invalid conversion specification`);
      return 1;
    }
    out += r.text;
    if (!r.used || ai >= args.length) break;
  }
  io.out(out);
  return code;
};

// ───────────────────────────── sed ─────────────────────────────

type SedAddr = { k: "line"; n: number } | { k: "last" } | { k: "re"; re: RegExp | null } | { k: "step"; first: number; step: number } | { k: "plus"; n: number };

interface SedCmd {
  a1?: SedAddr;
  a2?: SedAddr;
  neg: boolean;
  cmd: string;
  /** s: the regex (null: reuse the last one), replacement and flags. */
  re?: RegExp | null;
  rep?: string;
  global?: boolean;
  nth?: number;
  print?: boolean;
  /** a / i / c text, b / t label, q exit code. */
  text?: string;
  /** y: character map. */
  map?: Map<string, string>;
  /** "{": index of the matching "}" (jump past the block when the address does not match). */
  end?: number;
}

class SedError extends Error {}

function parseSed(script: string, ere: boolean): SedCmd[] {
  const cmds: SedCmd[] = [];
  const opens: number[] = [];
  let i = 0;
  const fail = (msg: string): never => {
    throw new SedError(`sed: -e expression #1, char ${Math.min(i + 1, script.length)}: ${msg}`);
  };
  const regexFlags = (ci: boolean) => (ci ? "i" : "");
  /** Read up to an unescaped delimiter; `\delim` becomes delim (or stays escaped when it is a regex operator). */
  const until = (delim: string, what: string, forRegex: boolean): string => {
    let s = "";
    let inBracket = false;
    for (; i < script.length; i++) {
      const ch = script[i];
      if (forRegex && ch === "[" && !inBracket) inBracket = true;
      else if (forRegex && ch === "]" && inBracket) inBracket = false;
      if (ch === "\\" && i + 1 < script.length) {
        const next = script[i + 1];
        // \<delim> is the delimiter as a plain character
        if (next === delim) {
          if (!forRegex) s += delim === "&" ? "\\&" : delim;
          else if (".*[]^$\\".includes(delim)) s += "\\" + delim;
          else if ("+?|(){}".includes(delim)) s += ere ? "\\" + delim : delim;
          else s += delim;
        } else s += ch + next;
        i++;
        continue;
      }
      if (ch === delim && !(forRegex && inBracket)) {
        i++;
        return s;
      }
      if (ch === "\n" && !forRegex) {
        s += "\n";
        continue;
      }
      s += ch;
    }
    return fail(`unterminated ${what}`);
  };
  const number = () => {
    const m = /^\d+/.exec(script.slice(i));
    if (!m) return null;
    i += m[0].length;
    return Number(m[0]);
  };
  const addr = (second: boolean): SedAddr | undefined => {
    const ch = script[i];
    if (ch === "$") {
      i++;
      return { k: "last" };
    }
    if (second && ch === "+") {
      i++;
      const n = number();
      if (n === null) fail("expected newer version of sed");
      return { k: "plus", n: n as number };
    }
    if (/\d/.test(ch ?? "")) {
      const n = number() as number;
      if (script[i] === "~") {
        i++;
        const step = number() ?? 0;
        return { k: "step", first: n, step };
      }
      return { k: "line", n };
    }
    if (ch === "/" || ch === "\\") {
      let delim = "/";
      if (ch === "\\") {
        delim = script[i + 1];
        i++;
      }
      i++;
      const src = until(delim, "address regex", true);
      let ci = false;
      while (script[i] === "I") {
        ci = true;
        i++;
      }
      if (src === "") return { k: "re", re: null };
      const re = compile(src, ere ? "extended" : "basic", regexFlags(ci));
      if (!re) fail("Invalid regular expression");
      return { k: "re", re };
    }
    return undefined;
  };
  const skipSpace = () => {
    while (i < script.length && (script[i] === " " || script[i] === "\t")) i++;
  };
  const endOfCommand = () => {
    skipSpace();
    if (i >= script.length || script[i] === ";" || script[i] === "\n" || script[i] === "}" || script[i] === "#") return;
    fail(`extra characters after command`);
  };
  const restOfLine = () => {
    const nl = script.indexOf("\n", i);
    const text = script.slice(i, nl < 0 ? script.length : nl);
    i = nl < 0 ? script.length : nl;
    return text;
  };
  while (i < script.length) {
    const ch = script[i];
    if (ch === " " || ch === "\t" || ch === "\n" || ch === ";") {
      i++;
      continue;
    }
    if (ch === "#") {
      restOfLine();
      continue;
    }
    const c: SedCmd = { neg: false, cmd: "" };
    c.a1 = addr(false);
    if (c.a1 && script[i] === ",") {
      i++;
      c.a2 = addr(true);
      if (!c.a2) fail("unexpected `,'");
    }
    skipSpace();
    while (script[i] === "!") {
      c.neg = true;
      i++;
      skipSpace();
    }
    const cmd = script[i];
    if (cmd === undefined) fail("missing command");
    i++;
    c.cmd = cmd;
    switch (cmd) {
      case "{":
        opens.push(cmds.length);
        cmds.push(c);
        continue;
      case "}": {
        if (c.a1) fail("} doesn't want any addresses");
        const at = opens.pop();
        if (at === undefined) fail("unexpected `}'");
        cmds[at as number].end = cmds.length;
        endOfCommand();
        continue;
      }
      case "s": {
        const delim = script[i];
        if (!delim || delim === "\n" || delim === "\\") fail("unterminated `s' command");
        i++;
        const src = until(delim, "`s' command", true);
        const rep = until(delim, "`s' command", false);
        let ci = false;
        for (;;) {
          const f = script[i];
          if (f === "g") c.global = true;
          else if (f === "p") c.print = true;
          else if (f === "i" || f === "I") ci = true;
          else if (f !== undefined && /\d/.test(f)) {
            c.nth = number() as number;
            if (c.nth === 0) fail("number option to `s' command may not be zero");
            continue;
          } else break;
          i++;
        }
        const groups = (src.match(ere ? /(^|[^\\])\((?!\?)/g : /\\\(/g) ?? []).length;
        for (const m of rep.matchAll(/\\(\d)/g)) if (Number(m[1]) > groups) fail(`invalid reference \\${m[1]} on \`s' command's RHS`);
        c.re = src === "" ? null : compile(src, ere ? "extended" : "basic", ci ? "gi" : "g");
        if (src !== "" && !c.re) fail("Invalid regular expression");
        c.rep = rep;
        endOfCommand();
        break;
      }
      case "y": {
        const delim = script[i];
        i++;
        const a = unescapeC(until(delim, "`y' command", false), false);
        const b = unescapeC(until(delim, "`y' command", false), false);
        if ([...a].length !== [...b].length) fail("strings for `y' command are different lengths");
        const bs = [...b];
        c.map = new Map([...a].map((x, k) => [x, bs[k]]));
        endOfCommand();
        break;
      }
      case "a":
      case "i":
      case "c": {
        skipSpace();
        if (script[i] === "\\") {
          i++;
          if (script[i] === "\n") i++;
        }
        c.text = unescapeC(restOfLine(), false);
        break;
      }
      case ":": {
        skipSpace();
        c.text = restOfLine().replace(/;.*$/, "").trim();
        if (!c.text) fail("\":\" lacks a label");
        break;
      }
      case "b":
      case "t":
      case "T": {
        skipSpace();
        const m = /^[^;\n}]*/.exec(script.slice(i));
        c.text = (m?.[0] ?? "").trim();
        i += m?.[0].length ?? 0;
        endOfCommand();
        break;
      }
      case "q":
      case "Q": {
        skipSpace();
        c.text = String(number() ?? 0);
        endOfCommand();
        break;
      }
      case "p":
      case "P":
      case "d":
      case "D":
      case "n":
      case "N":
      case "g":
      case "G":
      case "h":
      case "H":
      case "x":
      case "=":
        endOfCommand();
        break;
      default:
        i--;
        fail(`unknown command: \`${cmd}'`);
    }
    cmds.push(c);
  }
  if (opens.length) {
    i = script.length - 1;
    fail("unmatched `{'");
  }
  return cmds;
}

/** Build an s/// replacement: & is the match, \1-\9 the groups, \n a newline, \U \L \E change case. */
function sedReplacement(rep: string, m: RegExpExecArray | string[]): string {
  let out = "";
  let mode: "" | "U" | "L" = "";
  let once: "" | "u" | "l" = "";
  const put = (s: string) => {
    for (const ch of s) {
      let c = mode === "U" ? ch.toUpperCase() : mode === "L" ? ch.toLowerCase() : ch;
      if (once) {
        c = once === "u" ? c.toUpperCase() : c.toLowerCase();
        once = "";
      }
      out += c;
    }
  };
  for (let i = 0; i < rep.length; i++) {
    const ch = rep[i];
    if (ch === "&") put(m[0]);
    else if (ch === "\\" && i + 1 < rep.length) {
      const n = rep[++i];
      if (/\d/.test(n)) put(m[Number(n)] ?? "");
      else if (n === "n") put("\n");
      else if (n === "t") put("\t");
      else if (n === "U" || n === "L") mode = n;
      else if (n === "E") mode = "";
      else if (n === "u" || n === "l") once = n;
      else put(n);
    } else put(ch);
  }
  return out;
}

function runSed(cmds: SedCmd[], input: string, quiet: boolean): { out: string; code: number } {
  const lines = splitLines(input);
  const endsNl = input.endsWith("\n") || input === "";
  let out = "";
  let hold = "";
  let lineNo = 0;
  let li = 0;
  let lastRe: RegExp | null = null;
  const active = new Map<number, { until?: number }>();
  const labels = new Map<string, number>();
  cmds.forEach((c, k) => c.cmd === ":" && labels.set(c.text ?? "", k));
  for (const c of cmds) if ((c.cmd === "b" || c.cmd === "t" || c.cmd === "T") && c.text && !labels.has(c.text)) throw new SedError(`sed: -e expression #1, char 0: can't find label for jump to \`${c.text}'`);
  const isLast = () => li >= lines.length;
  const test = (re: RegExp | null, s: string) => {
    const r = re ?? lastRe;
    if (!r) throw new SedError("sed: no previous regular expression");
    lastRe = r;
    r.lastIndex = 0;
    const plain = new RegExp(r.source, r.flags.replace("g", ""));
    return plain.test(s);
  };
  let ps = "";
  const matchOne = (a: SedAddr) => {
    switch (a.k) {
      case "line":
        return lineNo === a.n;
      case "last":
        return isLast();
      case "re":
        return test(a.re, ps);
      case "step":
        return a.step <= 0 ? lineNo === a.first : lineNo >= a.first && (lineNo - a.first) % a.step === 0;
      default:
        return false;
    }
  };
  const selected = (k: number, c: SedCmd) => {
    let hit: boolean;
    if (!c.a1) hit = true;
    else if (!c.a2) hit = matchOne(c.a1);
    else {
      const st = active.get(k);
      if (!st) {
        hit = matchOne(c.a1);
        if (hit) {
          const a2 = c.a2;
          if (a2.k === "line") {
            if (a2.n > lineNo) active.set(k, {});
          } else if (a2.k === "plus") {
            if (a2.n > 0) active.set(k, { until: lineNo + a2.n });
          } else if (!(a2.k === "last" && isLast())) active.set(k, {});
        }
      } else {
        hit = true;
        const a2 = c.a2;
        const done = a2.k === "line" ? lineNo >= a2.n : a2.k === "plus" ? lineNo >= (st.until ?? 0) : a2.k === "last" ? isLast() : a2.k === "re" ? test(a2.re, ps) : false;
        if (done) active.delete(k);
      }
    }
    return c.neg ? !hit : hit;
  };
  let code = 0;
  let quit = false;
  let steps = 0;
  const newline = (last: boolean) => (last && !endsNl ? "" : "\n");
  let restart = false;
  while (!quit && (restart || li < lines.length)) {
    if (!restart) {
      ps = lines[li++];
      lineNo++;
    }
    restart = false;
    let deleted = false;
    let tFlag = false;
    const append: string[] = [];
    for (let k = 0; k < cmds.length; k++) {
      if (++steps > 200_000) throw new SedError("sed: the script ran too long (is there a loop that never ends?)");
      const c = cmds[k];
      if (c.cmd === "}" || c.cmd === ":") continue;
      if (!selected(k, c)) {
        if (c.cmd === "{") k = c.end ?? k;
        continue;
      }
      switch (c.cmd) {
        case "{":
          break;
        case "p":
          out += ps + "\n";
          break;
        case "P":
          out += ps.split("\n")[0] + "\n";
          break;
        case "=":
          out += lineNo + "\n";
          break;
        case "d":
          deleted = true;
          break;
        case "D": {
          const nl = ps.indexOf("\n");
          if (nl < 0) deleted = true;
          else {
            ps = ps.slice(nl + 1);
            restart = true;
            deleted = true;
          }
          break;
        }
        case "n":
          if (isLast()) {
            quit = true;
            k = cmds.length;
            break;
          }
          if (!quiet) out += ps + "\n";
          ps = lines[li++];
          lineNo++;
          break;
        case "N":
          if (isLast()) {
            quit = true;
            k = cmds.length;
            break;
          }
          ps += "\n" + lines[li++];
          lineNo++;
          break;
        case "h":
          hold = ps;
          break;
        case "H":
          hold += "\n" + ps;
          break;
        case "g":
          ps = hold;
          break;
        case "G":
          ps += "\n" + hold;
          break;
        case "x":
          [ps, hold] = [hold, ps];
          break;
        case "y":
          ps = [...ps].map((ch) => c.map?.get(ch) ?? ch).join("");
          break;
        case "a":
          append.push(c.text ?? "");
          break;
        case "i":
          out += (c.text ?? "") + "\n";
          break;
        case "c":
          deleted = true;
          if (!c.a2 || !active.has(k)) out += (c.text ?? "") + "\n";
          break;
        case "q":
          code = Number(c.text);
          quit = true;
          k = cmds.length;
          break;
        case "Q":
          code = Number(c.text);
          quit = true;
          deleted = true;
          break;
        case "b":
        case "t":
        case "T": {
          const jump = c.cmd === "b" || (c.cmd === "t" ? tFlag : !tFlag);
          if (c.cmd !== "b") tFlag = false;
          if (jump) k = c.text ? (labels.get(c.text) as number) : cmds.length;
          break;
        }
        case "s": {
          const re0: RegExp | null = c.re ?? (lastRe ? new RegExp(lastRe.source, lastRe.flags.includes("g") ? lastRe.flags : lastRe.flags + "g") : null);
          if (!re0) throw new SedError("sed: no previous regular expression");
          lastRe = re0;
          const re = new RegExp(re0.source, re0.flags.includes("g") ? re0.flags : re0.flags + "g");
          let n = 0;
          let did = false;
          const from = c.nth ?? 1;
          ps = ps.replace(re, (...args) => {
            n++;
            const groups = args.slice(0, -2).map((g) => (g === undefined ? "" : String(g)));
            if (n < from || (n > from && !c.global)) return groups[0];
            did = true;
            return sedReplacement(c.rep ?? "", groups);
          });
          if (did) {
            tFlag = true;
            if (c.print) out += ps + "\n";
          }
          break;
        }
      }
      if (deleted) break;
    }
    if (!deleted && !quiet) out += ps + newline(isLast() && !restart);
    for (const a of append) out += a + "\n";
  }
  return { out, code };
}

const sed: Tool = (io) => {
  const p = getopts(io.argv, "nErsiz", "ef", { "--quiet": "n", "--silent": "n", "--regexp-extended": "E", "--expression": "e", "--in-place": "i", "--separate": "s", "--file": "f" });
  if (p.bad) return badOption(io, p.bad);
  const rest = [...p.rest];
  let script: string;
  if (p.vals.e || p.vals.f) {
    const parts = [...(p.vals.e ?? [])];
    for (const f of p.vals.f ?? []) {
      const t = io.read(f);
      if (t === null) return 1;
      parts.push(t);
    }
    script = parts.join("\n");
  } else {
    const s = rest.shift();
    if (s === undefined) {
      io.err("Usage: sed [OPTION]... {script-only-if-no-other-script} [input-file]...");
      return 1;
    }
    script = s;
  }
  const ere = p.flags.has("E") || p.flags.has("r");
  let cmds: SedCmd[];
  try {
    cmds = parseSed(script, ere);
  } catch (e) {
    if (e instanceof SedError) {
      io.err(e.message);
      return 1;
    }
    throw e;
  }
  const quiet = p.flags.has("n");
  try {
    if (p.flags.has("i")) {
      if (!rest.length) {
        io.err("sed: no input files");
        return 1;
      }
      let code = 0;
      for (const f of rest) {
        const t = io.read(f);
        if (t === null) {
          code = 1;
          continue;
        }
        const r = runSed(cmds, t, quiet);
        if (!io.write?.(f, r.out)) code = 4;
      }
      return code;
    }
    const { text, code } = readAll(io, rest);
    const r = runSed(cmds, text, quiet);
    io.out(r.out);
    return code || r.code;
  } catch (e) {
    if (e instanceof SedError) {
      io.err(e.message);
      return 1;
    }
    throw e;
  }
};

// ───────────────────────────── awk ─────────────────────────────
//
// A small but real awk: BEGIN/END, patterns (expressions, /regex/, ranges), fields and NF/NR/FNR, assignment to
// fields, associative arrays (with SUBSEP for a[i,j]), for/for-in/while/do, if/else, next/exit, user functions,
// print/printf (no output redirection), and the usual built-ins. Values follow awk's rules: fields that look like
// numbers compare as numbers, everything else as strings.

/** A field or other input text: a string that also compares as a number when it looks like one. */
class StrNum {
  s: string;
  n: number | null;
  constructor(s: string) {
    this.s = s;
    this.n = /^[ \t\n]*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?[ \t\n]*$/.test(s) ? Number(s.trim()) : null;
  }
}
type Val = number | string | StrNum | undefined;
type AwkArray = Map<string, Val>;

class AwkError extends Error {}
class NextRecord {}
class ExitProgram {
  code: number;
  constructor(code: number) {
    this.code = code;
  }
}
class BreakLoop {}
class ContinueLoop {}
class ReturnValue {
  v: Val;
  constructor(v: Val) {
    this.v = v;
  }
}

/** awk's strtod: the longest leading number, or 0. */
function strtod(s: string): number {
  const m = /^[ \t\n]*[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(s);
  return m ? Number(m[0].trim()) : 0;
}

type Tok = { t: string; v?: string | number; line: number };

const KEYWORDS = new Set(["BEGIN", "END", "function", "func", "if", "else", "while", "for", "do", "break", "continue", "next", "nextfile", "exit", "return", "delete", "in", "getline", "print", "printf"]);
const BUILTINS = new Set(["length", "substr", "index", "split", "sub", "gsub", "match", "sprintf", "toupper", "tolower", "int", "sqrt", "exp", "log", "sin", "cos", "atan2", "rand", "srand", "system", "close", "fflush"]);

function lexAwk(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  let line = 1;
  const regexOk = () => {
    const last = toks[toks.length - 1];
    if (!last) return true;
    return !["num", "str", "ere", "name", "builtin", ")", "]", "$", "++", "--"].includes(last.t);
  };
  const ops = ["**=", "+=", "-=", "*=", "/=", "%=", "^=", "==", "<=", ">=", "!=", "!~", "++", "--", "&&", "||", ">>", "**", "{", "}", "(", ")", "[", "]", ";", ",", "+", "-", "*", "/", "%", "^", "!", ">", "<", "|", "?", ":", "~", "$", "="];
  while (i < src.length) {
    const ch = src[i];
    if (ch === "\\" && src[i + 1] === "\n") {
      i += 2;
      line++;
      continue;
    }
    if (ch === " " || ch === "\t" || ch === "\r") {
      i++;
      continue;
    }
    if (ch === "\n") {
      toks.push({ t: "nl", line });
      line++;
      i++;
      continue;
    }
    if (ch === "#") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      let s = "";
      while (j < src.length && src[j] !== '"') {
        if (src[j] === "\\" && j + 1 < src.length) {
          s += src[j] + src[j + 1];
          j += 2;
        } else if (src[j] === "\n") throw new AwkError(`awk: line ${line}: runaway string constant "${s.slice(0, 10)} ...`);
        else s += src[j++];
      }
      if (j >= src.length) throw new AwkError(`awk: line ${line}: runaway string constant "${s.slice(0, 10)} ...`);
      toks.push({ t: "str", v: unescapeC(s), line });
      i = j + 1;
      continue;
    }
    if (ch === "/" && regexOk()) {
      let j = i + 1;
      let s = "";
      let inBracket = false;
      while (j < src.length && (src[j] !== "/" || inBracket)) {
        if (src[j] === "\n") throw new AwkError(`awk: line ${line}: runaway regular expression /${s.slice(0, 10)} ...`);
        if (src[j] === "\\" && j + 1 < src.length) {
          s += src[j + 1] === "/" ? "/" : src[j] + src[j + 1];
          j += 2;
          continue;
        }
        if (src[j] === "[") inBracket = true;
        else if (src[j] === "]") inBracket = false;
        s += src[j++];
      }
      if (j >= src.length) throw new AwkError(`awk: line ${line}: runaway regular expression /${s.slice(0, 10)} ...`);
      toks.push({ t: "ere", v: s, line });
      i = j + 1;
      continue;
    }
    const num = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(src.slice(i));
    if (num) {
      toks.push({ t: "num", v: Number(num[0]), line });
      i += num[0].length;
      continue;
    }
    const name = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i));
    if (name) {
      const w = name[0];
      i += w.length;
      if (KEYWORDS.has(w)) toks.push({ t: w === "func" ? "function" : w, line });
      else if (BUILTINS.has(w)) toks.push({ t: "builtin", v: w, line });
      else if (src[i] === "(") toks.push({ t: "funcname", v: w, line });
      else toks.push({ t: "name", v: w, line });
      continue;
    }
    const op = ops.find((o) => src.startsWith(o, i));
    if (!op) throw new AwkError(`awk: line ${line}: invalid char '${ch}' in expression`);
    toks.push({ t: op, line });
    i += op.length;
  }
  toks.push({ t: "eof", line });
  return toks;
}

type Expr =
  | { k: "num"; v: number }
  | { k: "str"; v: string }
  | { k: "re"; src: string }
  | { k: "var"; name: string }
  | { k: "idx"; name: string; subs: Expr[] }
  | { k: "field"; e: Expr }
  | { k: "assign"; op: string; target: Expr; e: Expr }
  | { k: "cond"; c: Expr; a: Expr; b: Expr }
  | { k: "and" | "or"; l: Expr; r: Expr }
  | { k: "in"; subs: Expr[]; name: string }
  | { k: "match"; neg: boolean; l: Expr; r: Expr }
  | { k: "bin"; op: string; l: Expr; r: Expr }
  | { k: "cat"; l: Expr; r: Expr }
  | { k: "un"; op: string; e: Expr }
  | { k: "incdec"; op: string; prefix: boolean; target: Expr }
  | { k: "call"; name: string; args: Expr[] }
  | { k: "builtin"; name: string; args: Expr[] | null }
  | { k: "group"; e: Expr; list?: Expr[] };

type Stmt =
  | { k: "print"; args: Expr[]; printf: boolean }
  | { k: "expr"; e: Expr }
  | { k: "if"; c: Expr; t: Stmt; f?: Stmt }
  | { k: "while"; c: Expr; body: Stmt }
  | { k: "do"; body: Stmt; c: Expr }
  | { k: "for"; init?: Expr; c?: Expr; step?: Expr; body: Stmt }
  | { k: "forin"; v: Expr; name: string; body: Stmt }
  | { k: "block"; body: Stmt[] }
  | { k: "next" }
  | { k: "exit"; e?: Expr }
  | { k: "break" }
  | { k: "continue" }
  | { k: "return"; e?: Expr }
  | { k: "delete"; name: string; subs?: Expr[] };

interface Rule {
  pattern?: Expr;
  range?: [Expr, Expr];
  action: Stmt[] | null;
}

interface AwkProgram {
  begin: Stmt[][];
  end: Stmt[][];
  rules: Rule[];
  funcs: Map<string, { params: string[]; body: Stmt[] }>;
}

function parseAwk(src: string): AwkProgram {
  const toks = lexAwk(src);
  let p = 0;
  const peek = (o = 0) => toks[Math.min(p + o, toks.length - 1)];
  const is = (t: string) => peek().t === t;
  const fail = (tok = peek()): never => {
    const near = tok.t === "eof" ? "end of file" : tok.t === "nl" ? "end of line" : tok.v !== undefined ? String(tok.v) : tok.t;
    throw new AwkError(`awk: line ${tok.line}: syntax error at or near ${near}`);
  };
  const eat = (t: string) => {
    if (!is(t)) fail();
    return toks[p++];
  };
  const opt = (t: string) => {
    if (is(t)) {
      p++;
      return true;
    }
    return false;
  };
  const nls = () => {
    while (is("nl")) p++;
  };
  const isLvalue = (e: Expr) => e.k === "var" || e.k === "idx" || e.k === "field";

  const exprList = (noGt = false): Expr[] => {
    const list = [expr(noGt)];
    while (opt(",")) {
      nls();
      list.push(expr(noGt));
    }
    return list;
  };

  const expr = (noGt = false, noIn = false): Expr => {
    const left = ternary(noGt, noIn);
    const t = peek().t;
    if (["=", "+=", "-=", "*=", "/=", "%=", "^=", "**="].includes(t) && isLvalue(left)) {
      p++;
      nls();
      return { k: "assign", op: t === "**=" ? "^=" : t, target: left, e: expr(noGt, noIn) };
    }
    return left;
  };
  const ternary = (noGt: boolean, noIn: boolean): Expr => {
    const c = orExpr(noGt, noIn);
    if (opt("?")) {
      nls();
      const a = expr(noGt, noIn);
      nls();
      eat(":");
      nls();
      const b = expr(noGt, noIn);
      return { k: "cond", c, a, b };
    }
    return c;
  };
  const orExpr = (noGt: boolean, noIn: boolean): Expr => {
    let l = andExpr(noGt, noIn);
    while (opt("||")) {
      nls();
      l = { k: "or", l, r: andExpr(noGt, noIn) };
    }
    return l;
  };
  const andExpr = (noGt: boolean, noIn: boolean): Expr => {
    let l = inExpr(noGt, noIn);
    while (opt("&&")) {
      nls();
      l = { k: "and", l, r: inExpr(noGt, noIn) };
    }
    return l;
  };
  const inExpr = (noGt: boolean, noIn: boolean): Expr => {
    let l = matchExpr(noGt, noIn);
    while (!noIn && is("in")) {
      p++;
      const name = eat("name").v as string;
      l = { k: "in", subs: l.k === "group" && l.list ? l.list : [l], name };
    }
    return l;
  };
  const matchExpr = (noGt: boolean, noIn: boolean): Expr => {
    let l = relExpr(noGt, noIn);
    while (is("~") || is("!~")) {
      const neg = toks[p++].t === "!~";
      l = { k: "match", neg, l, r: relExpr(noGt, noIn) };
    }
    return l;
  };
  const relExpr = (noGt: boolean, noIn: boolean): Expr => {
    const l = concatExpr(noIn);
    const t = peek().t;
    if (["<", "<=", "!=", "==", ">=", ">"].includes(t) && !(noGt && t === ">")) {
      p++;
      return { k: "bin", op: t, l, r: concatExpr(noIn) };
    }
    return l;
  };
  const concatExpr = (noIn: boolean): Expr => {
    let l = addExpr();
    // juxtaposition is concatenation; "-" and "+" were already taken as arithmetic by addExpr
    while (["num", "str", "name", "funcname", "builtin", "$", "(", "++", "--"].includes(peek().t) && !(noIn && is("in"))) {
      l = { k: "cat", l, r: addExpr() };
    }
    return l;
  };
  const addExpr = (): Expr => {
    let l = mulExpr();
    while (is("+") || is("-")) {
      const op = toks[p++].t;
      l = { k: "bin", op, l, r: mulExpr() };
    }
    return l;
  };
  const mulExpr = (): Expr => {
    let l = unary();
    while (is("*") || is("/") || is("%")) {
      const op = toks[p++].t;
      l = { k: "bin", op, l, r: unary() };
    }
    return l;
  };
  const unary = (): Expr => {
    if (is("!") || is("-") || is("+")) {
      const op = toks[p++].t;
      return { k: "un", op, e: unary() };
    }
    return pow();
  };
  const pow = (): Expr => {
    const base = postfix();
    if (is("^") || is("**")) {
      p++;
      return { k: "bin", op: "^", l: base, r: unaryPow() };
    }
    return base;
  };
  // the exponent may carry a sign (2^-1) and is right-associative (2^3^2 = 2^9)
  const unaryPow = (): Expr => {
    if (is("-") || is("+") || is("!")) {
      const op = toks[p++].t;
      return { k: "un", op, e: unaryPow() };
    }
    return pow();
  };
  const postfix = (): Expr => {
    if (is("++") || is("--")) {
      const op = toks[p++].t;
      const target = postfix();
      if (!isLvalue(target)) fail();
      return { k: "incdec", op, prefix: true, target };
    }
    const e = primary();
    if ((is("++") || is("--")) && isLvalue(e)) {
      const op = toks[p++].t;
      return { k: "incdec", op, prefix: false, target: e };
    }
    return e;
  };
  const primary = (): Expr => {
    const tok = peek();
    switch (tok.t) {
      case "num":
        p++;
        return { k: "num", v: tok.v as number };
      case "str":
        p++;
        return { k: "str", v: tok.v as string };
      case "ere":
        p++;
        return { k: "re", src: tok.v as string };
      case "$": {
        p++;
        if (is("++") || is("--")) {
          const op = toks[p++].t;
          const target = primary();
          return { k: "field", e: { k: "incdec", op, prefix: true, target } };
        }
        if (is("-")) {
          p++;
          return { k: "field", e: { k: "un", op: "-", e: primary() } };
        }
        return { k: "field", e: primary() };
      }
      case "(": {
        p++;
        nls();
        const list = exprList();
        nls();
        eat(")");
        if (list.length > 1) {
          // (i, j) in arr
          if (!is("in")) fail();
          return { k: "group", e: list[0], list };
        }
        return { k: "group", e: list[0] };
      }
      case "name": {
        p++;
        const name = tok.v as string;
        if (opt("[")) {
          const subs = exprList();
          eat("]");
          return { k: "idx", name, subs };
        }
        return { k: "var", name };
      }
      case "funcname": {
        p++;
        eat("(");
        nls();
        const args = is(")") ? [] : exprList();
        nls();
        eat(")");
        return { k: "call", name: tok.v as string, args };
      }
      case "builtin": {
        p++;
        const name = tok.v as string;
        if (opt("(")) {
          nls();
          const args = is(")") ? [] : exprList();
          nls();
          eat(")");
          return { k: "builtin", name, args };
        }
        if (name !== "length") fail();
        return { k: "builtin", name, args: null };
      }
      case "getline":
        throw new AwkError(`awk: line ${tok.line}: getline is not available in this terminal`);
      default:
        return fail();
    }
  };

  const terminator = () => {
    if (is(";") || is("nl")) {
      p++;
      nls();
      return;
    }
    if (is("}") || is("eof")) return;
    fail();
  };
  const simpleOrBlock = (): Stmt => {
    nls();
    if (opt(";")) return { k: "block", body: [] };
    return statement();
  };
  const printArgs = (): Expr[] => {
    if (is(";") || is("nl") || is("}") || is("eof") || is(">") || is(">>") || is("|")) return [];
    if (is("(")) {
      // print (a, b) is an argument list, unless the parenthesis is only the start of a longer expression
      const save = p;
      try {
        p++;
        nls();
        const list = exprList();
        nls();
        if (opt(")") && (is(";") || is("nl") || is("}") || is("eof") || is(">") || is(">>") || is("|"))) return list;
      } catch (e) {
        if (!(e instanceof AwkError)) throw e;
      }
      p = save;
    }
    return exprList(true);
  };
  const statement = (): Stmt => {
    const tok = peek();
    switch (tok.t) {
      case "{": {
        p++;
        const body = stmts();
        eat("}");
        nls();
        return { k: "block", body };
      }
      case "if": {
        p++;
        eat("(");
        const c = expr();
        eat(")");
        const t = simpleOrBlock();
        const save = p;
        while (is("nl") || is(";")) p++;
        if (opt("else")) return { k: "if", c, t, f: simpleOrBlock() };
        p = save;
        return { k: "if", c, t };
      }
      case "while": {
        p++;
        eat("(");
        const c = expr();
        eat(")");
        if (is(";")) {
          p++;
          return { k: "while", c, body: { k: "block", body: [] } };
        }
        return { k: "while", c, body: simpleOrBlock() };
      }
      case "do": {
        p++;
        const body = simpleOrBlock();
        while (is("nl") || is(";")) p++;
        eat("while");
        eat("(");
        const c = expr();
        eat(")");
        terminator();
        return { k: "do", body, c };
      }
      case "for": {
        p++;
        eat("(");
        if (peek().t === "name" && peek(1).t === "in" && peek(2).t === "name" && peek(3).t === ")") {
          const v: Expr = { k: "var", name: peek().v as string };
          const name = peek(2).v as string;
          p += 4;
          return { k: "forin", v, name, body: simpleOrBlock() };
        }
        const init = is(";") ? undefined : expr();
        eat(";");
        nls();
        const c = is(";") ? undefined : expr();
        eat(";");
        nls();
        const step = is(")") ? undefined : expr();
        eat(")");
        if (is(";")) {
          p++;
          return { k: "for", init, c, step, body: { k: "block", body: [] } };
        }
        return { k: "for", init, c, step, body: simpleOrBlock() };
      }
      case ";":
        p++;
        return { k: "block", body: [] };
    }
    const s = simple();
    terminator();
    return s;
  };
  const simple = (): Stmt => {
    const tok = peek();
    switch (tok.t) {
      case "print":
      case "printf": {
        p++;
        const args = printArgs();
        if (is(">") || is(">>") || is("|")) throw new AwkError(`awk: line ${tok.line}: output redirection (> >> |) is not available in this terminal; print to the screen and redirect the whole command instead`);
        if (tok.t === "printf" && args.length === 0) fail();
        return { k: "print", args, printf: tok.t === "printf" };
      }
      case "next":
        p++;
        return { k: "next" };
      case "nextfile":
        p++;
        return { k: "next" };
      case "exit": {
        p++;
        const e = is(";") || is("nl") || is("}") || is("eof") ? undefined : expr();
        return { k: "exit", e };
      }
      case "return": {
        p++;
        const e = is(";") || is("nl") || is("}") || is("eof") ? undefined : expr();
        return { k: "return", e };
      }
      case "break":
        p++;
        return { k: "break" };
      case "continue":
        p++;
        return { k: "continue" };
      case "delete": {
        p++;
        const name = eat("name").v as string;
        if (opt("[")) {
          const subs = exprList();
          eat("]");
          return { k: "delete", name, subs };
        }
        return { k: "delete", name };
      }
    }
    return { k: "expr", e: expr() };
  };
  const stmts = (): Stmt[] => {
    const body: Stmt[] = [];
    for (;;) {
      while (is("nl") || is(";")) p++;
      if (is("}") || is("eof")) return body;
      body.push(statement());
    }
  };
  const block = (): Stmt[] => {
    eat("{");
    const body = stmts();
    eat("}");
    return body;
  };

  const prog: AwkProgram = { begin: [], end: [], rules: [], funcs: new Map() };
  for (;;) {
    while (is("nl") || is(";")) p++;
    if (is("eof")) break;
    if (opt("BEGIN")) {
      prog.begin.push(block());
      continue;
    }
    if (opt("END")) {
      prog.end.push(block());
      continue;
    }
    if (opt("function")) {
      const name = (is("funcname") || is("name") ? toks[p++] : fail()).v as string;
      eat("(");
      const params: string[] = [];
      while (!is(")")) {
        params.push(eat("name").v as string);
        if (!opt(",")) break;
        nls();
      }
      eat(")");
      nls();
      prog.funcs.set(name, { params, body: block() });
      continue;
    }
    if (is("{")) {
      prog.rules.push({ action: block() });
      continue;
    }
    const pattern = expr();
    let range: [Expr, Expr] | undefined;
    if (opt(",")) {
      nls();
      range = [pattern, expr()];
    }
    const action = is("{") ? block() : null;
    prog.rules.push(range ? { range, action } : { pattern, action });
    // a pattern without an action must end its line
    if (!action && !(is("nl") || is(";") || is("eof"))) fail();
  }
  return prog;
}

/** Runs a parsed awk program over its inputs. */
class AwkRun {
  prog: AwkProgram;
  io: ToolIo;
  out = "";
  vars = new Map<string, Val>();
  arrays = new Map<string, AwkArray>();
  frames: Map<string, Val | { arr: AwkArray }>[] = [];
  fields: string[] = [];
  record = "";
  nf = 0;
  steps = 0;
  seed = 0;
  prevSeed = 0;
  rngState = 1;
  reCache = new Map<string, RegExp>();
  rangeOn = new Map<Rule, boolean>();

  constructor(prog: AwkProgram, io: ToolIo) {
    this.prog = prog;
    this.io = io;
    for (const [k, v] of Object.entries({ FS: " ", OFS: " ", ORS: "\n", RS: "\n", NR: 0, FNR: 0, SUBSEP: "\x1c", CONVFMT: "%.6g", OFMT: "%.6g", RSTART: 0, RLENGTH: -1, FILENAME: "" })) {
      this.vars.set(k, v);
    }
  }

  tick() {
    if (++this.steps > 2_000_000) throw new AwkError("awk: the program ran too long (is there a loop that never ends?)");
  }

  // ── values ──
  num(v: Val): number {
    if (typeof v === "number") return v;
    if (v === undefined) return 0;
    if (v instanceof StrNum) return v.n ?? strtod(v.s);
    return strtod(v);
  }
  numStr(n: number, fmt: string): string {
    if (Number.isInteger(n)) return Math.abs(n) < 1e21 ? n.toFixed(0) : String(n);
    if (Number.isNaN(n)) return "nan";
    if (!Number.isFinite(n)) return n < 0 ? "-inf" : "inf";
    return this.sprintf(fmt, [n]);
  }
  str(v: Val): string {
    if (typeof v === "number") return this.numStr(v, this.str(this.vars.get("CONVFMT")));
    if (v === undefined) return "";
    if (v instanceof StrNum) return v.s;
    return v;
  }
  outStr(v: Val): string {
    return typeof v === "number" ? this.numStr(v, this.str(this.vars.get("OFMT"))) : this.str(v);
  }
  bool(v: Val): boolean {
    if (typeof v === "number") return v !== 0;
    if (v === undefined) return false;
    if (v instanceof StrNum) return v.n !== null ? v.n !== 0 : v.s !== "";
    return v !== "";
  }
  isNumeric(v: Val) {
    return typeof v === "number" || v === undefined || (v instanceof StrNum && v.n !== null);
  }
  compare(a: Val, b: Val): number {
    if (this.isNumeric(a) && this.isNumeric(b)) {
      const x = this.num(a);
      const y = this.num(b);
      return x < y ? -1 : x > y ? 1 : 0;
    }
    const x = this.str(a);
    const y = this.str(b);
    return x < y ? -1 : x > y ? 1 : 0;
  }
  regex(src: string): RegExp {
    let re = this.reCache.get(src);
    if (!re) {
      const c = compile(src, "extended");
      if (!c) throw new AwkError(`awk: invalid regular expression /${src}/`);
      re = c;
      this.reCache.set(src, re);
    }
    re.lastIndex = 0;
    return re;
  }
  /** The regex an argument stands for: a /literal/, or any value used as a dynamic regex. */
  regexOf(e: Expr): RegExp {
    return e.k === "re" ? this.regex(e.src) : this.regex(this.str(this.eval(e)));
  }

  // ── records and fields ──
  splitFields(s: string, fs: string): string[] {
    // the default FS (one space) splits on runs of blanks and ignores leading and trailing ones
    if (fs === " ") return s.split(/[ \t\n]+/).filter(Boolean);
    if (s === "") return [];
    if (fs.length === 1 && fs !== "\\") return s.split(fs);
    if (fs === "") return [...s];
    return s.split(this.regexNoGroups(fs));
  }
  regexNoGroups(src: string): RegExp {
    // String.split would include capture groups in the result; make them non-capturing
    return new RegExp(posixToJs(src, "extended").replace(/\((?!\?)/g, "(?:"), "");
  }
  setRecord(s: string) {
    this.record = s;
    this.fields = this.splitFields(s, this.str(this.vars.get("FS")));
    this.nf = this.fields.length;
  }
  rebuild() {
    this.record = this.fields.join(this.str(this.vars.get("OFS")));
  }
  getField(i: number): Val {
    if (i < 0) throw new AwkError(`awk: trying to access out of range field ${i}`);
    if (i === 0) return new StrNum(this.record);
    return i <= this.nf ? new StrNum(this.fields[i - 1] ?? "") : undefined;
  }
  setField(i: number, v: Val) {
    if (i < 0) throw new AwkError(`awk: trying to access out of range field ${i}`);
    if (i === 0) {
      this.setRecord(this.str(v));
      return;
    }
    while (this.fields.length < i) this.fields.push("");
    this.fields[i - 1] = this.str(v);
    this.nf = Math.max(this.nf, i);
    this.fields.length = this.nf;
    this.rebuild();
  }

  // ── variables ──
  frame() {
    return this.frames[this.frames.length - 1];
  }
  getVar(name: string): Val {
    const f = this.frame();
    if (f?.has(name)) {
      const v = f.get(name);
      if (v && typeof v === "object" && "arr" in v) throw new AwkError(`awk: attempt to use array \`${name}' in a scalar context`);
      return v as Val;
    }
    if (name === "NF") return this.nf;
    if (this.arrays.has(name)) throw new AwkError(`awk: attempt to use array \`${name}' in a scalar context`);
    return this.vars.get(name);
  }
  setVar(name: string, v: Val) {
    const f = this.frame();
    if (f?.has(name)) {
      f.set(name, v);
      return;
    }
    if (name === "NF") {
      const n = Math.max(0, Math.trunc(this.num(v)));
      while (this.fields.length < n) this.fields.push("");
      this.fields.length = n;
      this.nf = n;
      this.rebuild();
      return;
    }
    if (this.arrays.has(name)) throw new AwkError(`awk: attempt to use array \`${name}' in a scalar context`);
    this.vars.set(name, v);
  }
  array(name: string): AwkArray {
    const f = this.frame();
    if (f?.has(name)) {
      const v = f.get(name);
      if (v && typeof v === "object" && "arr" in v) return v.arr;
      if (v !== undefined) throw new AwkError(`awk: attempt to use scalar \`${name}' as an array`);
      const arr: AwkArray = new Map();
      f.set(name, { arr });
      return arr;
    }
    let arr = this.arrays.get(name);
    if (!arr) {
      if (this.vars.get(name) !== undefined) throw new AwkError(`awk: attempt to use scalar \`${name}' as an array`);
      arr = new Map();
      this.arrays.set(name, arr);
    }
    return arr;
  }
  key(subs: Expr[]): string {
    return subs.map((s) => this.str(this.eval(s))).join(this.str(this.vars.get("SUBSEP")));
  }

  get(target: Expr): Val {
    if (target.k === "var") return this.getVar(target.name);
    if (target.k === "idx") {
      const arr = this.array(target.name);
      const k = this.key(target.subs);
      if (!arr.has(k)) arr.set(k, undefined); // referencing an element creates it, as in every awk
      return arr.get(k);
    }
    if (target.k === "field") return this.getField(Math.trunc(this.num(this.eval(target.e))));
    return this.eval(target);
  }
  set(target: Expr, v: Val) {
    if (target.k === "var") this.setVar(target.name, v);
    else if (target.k === "idx") this.array(target.name).set(this.key(target.subs), v);
    else if (target.k === "field") this.setField(Math.trunc(this.num(this.eval(target.e))), v);
  }

  // ── expressions ──
  eval(e: Expr): Val {
    this.tick();
    switch (e.k) {
      case "num":
        return e.v;
      case "str":
        return e.v;
      case "re":
        return this.regex(e.src).test(this.record) ? 1 : 0;
      case "group":
        return this.eval(e.e);
      case "var":
      case "idx":
      case "field":
        return this.get(e);
      case "assign": {
        if (e.op === "=") {
          // a field assigned to a variable stays a "string that looks like a number"
          const v = this.eval(e.e);
          this.set(e.target, v);
          return v;
        }
        const r = this.num(this.eval(e.e));
        const l = this.num(this.get(e.target));
        const v = this.arith(e.op.slice(0, -1), l, r);
        this.set(e.target, v);
        return v;
      }
      case "cond":
        return this.bool(this.eval(e.c)) ? this.eval(e.a) : this.eval(e.b);
      case "and":
        return this.bool(this.eval(e.l)) && this.bool(this.eval(e.r)) ? 1 : 0;
      case "or":
        return this.bool(this.eval(e.l)) || this.bool(this.eval(e.r)) ? 1 : 0;
      case "in":
        return this.array(e.name).has(this.key(e.subs)) ? 1 : 0;
      case "match": {
        const s = this.str(this.eval(e.l));
        const hit = this.regexOf(e.r).test(s);
        return hit !== e.neg ? 1 : 0;
      }
      case "bin": {
        const l = this.eval(e.l);
        const r = this.eval(e.r);
        switch (e.op) {
          case "<":
            return this.compare(l, r) < 0 ? 1 : 0;
          case "<=":
            return this.compare(l, r) <= 0 ? 1 : 0;
          case ">":
            return this.compare(l, r) > 0 ? 1 : 0;
          case ">=":
            return this.compare(l, r) >= 0 ? 1 : 0;
          case "==":
            return this.compare(l, r) === 0 ? 1 : 0;
          case "!=":
            return this.compare(l, r) !== 0 ? 1 : 0;
        }
        return this.arith(e.op, this.num(l), this.num(r));
      }
      case "cat":
        return this.str(this.eval(e.l)) + this.str(this.eval(e.r));
      case "un": {
        const v = this.eval(e.e);
        if (e.op === "!") return this.bool(v) ? 0 : 1;
        return e.op === "-" ? -this.num(v) : this.num(v);
      }
      case "incdec": {
        const old = this.num(this.get(e.target));
        const v = e.op === "++" ? old + 1 : old - 1;
        this.set(e.target, v);
        return e.prefix ? v : old;
      }
      case "call":
        return this.call(e.name, e.args);
      case "builtin":
        return this.builtin(e.name, e.args);
    }
  }
  arith(op: string, l: number, r: number): number {
    switch (op) {
      case "+":
        return l + r;
      case "-":
        return l - r;
      case "*":
        return l * r;
      case "/":
        if (r === 0) throw new AwkError("awk: division by zero");
        return l / r;
      case "%":
        if (r === 0) throw new AwkError("awk: division by zero in %");
        return l % r;
      default:
        return Math.pow(l, r);
    }
  }

  call(name: string, args: Expr[]): Val {
    const fn = this.prog.funcs.get(name);
    if (!fn) throw new AwkError(`awk: calling undefined function ${name}`);
    if (args.length > fn.params.length) throw new AwkError(`awk: function \`${name}' called with more arguments than declared`);
    if (this.frames.length > 200) throw new AwkError(`awk: function \`${name}' calls itself too deeply`);
    const frame = new Map<string, Val | { arr: AwkArray }>();
    fn.params.forEach((param, i) => {
      const a = args[i];
      if (!a) {
        frame.set(param, undefined);
        return;
      }
      // arrays are passed by reference, everything else by value
      if (a.k === "var") {
        const f = this.frame();
        const local = f?.get(a.name);
        if (local && typeof local === "object" && "arr" in local) return frame.set(param, local);
        if (!f?.has(a.name) && this.arrays.has(a.name)) return frame.set(param, { arr: this.arrays.get(a.name) as AwkArray });
      }
      frame.set(param, this.eval(a));
    });
    this.frames.push(frame);
    try {
      this.exec(fn.body);
      return undefined;
    } catch (x) {
      if (x instanceof ReturnValue) return x.v;
      throw x;
    } finally {
      this.frames.pop();
    }
  }

  builtin(name: string, args: Expr[] | null): Val {
    const a = args ?? [];
    const arg = (i: number) => this.eval(a[i]);
    switch (name) {
      case "length": {
        if (!args || a.length === 0) return [...this.record].length;
        const x = a[0];
        if (x.k === "var" && (this.arrays.has(x.name) || (this.frame()?.get(x.name) as { arr?: AwkArray } | undefined)?.arr)) return this.array(x.name).size;
        return [...this.str(arg(0))].length;
      }
      case "substr": {
        const s = this.str(arg(0));
        const chars = [...s];
        const m = this.num(arg(1));
        let start = Math.round(m);
        let end = a.length > 2 ? start + Math.round(this.num(arg(2))) : chars.length + 1;
        if (start < 1) start = 1;
        if (end > chars.length + 1) end = chars.length + 1;
        return end > start ? chars.slice(start - 1, end - 1).join("") : "";
      }
      case "index":
        return this.str(arg(0)).indexOf(this.str(arg(1))) + 1;
      case "split": {
        const s = this.str(arg(0));
        const target = a[1];
        if (!target || target.k !== "var") throw new AwkError("awk: split: second argument is not an array");
        const arr = this.array(target.name);
        arr.clear();
        let parts: string[];
        if (a.length < 3) parts = this.splitFields(s, this.str(this.vars.get("FS")));
        else if (a[2].k === "re") parts = s === "" ? [] : s.split(this.regexNoGroups(a[2].src));
        else parts = this.splitFields(s, this.str(arg(2)));
        parts.forEach((x, i) => arr.set(String(i + 1), new StrNum(x)));
        return parts.length;
      }
      case "sub":
      case "gsub": {
        const re0 = this.regexOf(a[0]);
        const re = new RegExp(re0.source, name === "gsub" ? "g" : "");
        const rep = this.str(arg(1));
        const target: Expr = a[2] ?? { k: "field", e: { k: "num", v: 0 } };
        const s = this.str(this.get(target));
        let n = 0;
        const out = s.replace(re, (m0: string) => {
          n++;
          let r = "";
          for (let i = 0; i < rep.length; i++) {
            if (rep[i] === "\\" && (rep[i + 1] === "&" || rep[i + 1] === "\\")) r += rep[++i];
            else if (rep[i] === "&") r += m0;
            else r += rep[i];
          }
          return r;
        });
        if (n) this.set(target, out);
        return n;
      }
      case "match": {
        const s = this.str(arg(0));
        const m = new RegExp(this.regexOf(a[1]).source).exec(s);
        const start = m ? [...s.slice(0, m.index)].length + 1 : 0;
        const len = m ? [...m[0]].length : -1;
        this.vars.set("RSTART", start);
        this.vars.set("RLENGTH", len);
        return start;
      }
      case "sprintf": {
        if (!a.length) throw new AwkError("awk: sprintf: no format");
        return this.sprintf(this.str(arg(0)), a.slice(1).map((x) => this.eval(x)));
      }
      case "toupper":
        return this.str(arg(0)).toUpperCase();
      case "tolower":
        return this.str(arg(0)).toLowerCase();
      case "int":
        return Math.trunc(this.num(arg(0)));
      case "sqrt":
        return Math.sqrt(this.num(arg(0)));
      case "exp":
        return Math.exp(this.num(arg(0)));
      case "log":
        return Math.log(this.num(arg(0)));
      case "sin":
        return Math.sin(this.num(arg(0)));
      case "cos":
        return Math.cos(this.num(arg(0)));
      case "atan2":
        return Math.atan2(this.num(arg(0)), this.num(arg(1)));
      case "rand": {
        // a fixed sequence, so lessons that use rand() are repeatable
        this.rngState = (this.rngState * 1103515245 + 12345) % 2147483648;
        return this.rngState / 2147483648;
      }
      case "srand": {
        const prev = this.seed;
        this.seed = a.length ? this.num(arg(0)) : 0;
        this.rngState = Math.trunc(this.seed) || 1;
        return prev;
      }
      case "close":
      case "fflush":
        return 0;
      default:
        throw new AwkError(`awk: ${name}() is not available in this terminal`);
    }
  }

  sprintf(fmt: string, vals: Val[]): string {
    let k = 0;
    const r = formatC(fmt, () => {
      if (k >= vals.length) return null;
      const v = vals[k++];
      return { num: () => this.num(v), str: () => this.str(v), isNum: typeof v === "number" || (v instanceof StrNum && v.n !== null) };
    });
    if (r.bad) throw new AwkError(`awk: invalid format "${fmt}"`);
    return r.text;
  }

  // ── statements ──
  exec(body: Stmt[]) {
    for (const s of body) this.stmt(s);
  }
  stmt(s: Stmt) {
    this.tick();
    switch (s.k) {
      case "print": {
        if (s.printf) {
          const vals = s.args.map((x) => this.eval(x));
          this.write(this.sprintf(this.str(vals[0]), vals.slice(1)));
        } else {
          const text = s.args.length ? s.args.map((x) => this.outStr(this.eval(x))).join(this.str(this.vars.get("OFS"))) : this.record;
          this.write(text + this.str(this.vars.get("ORS")));
        }
        return;
      }
      case "expr":
        this.eval(s.e);
        return;
      case "if":
        if (this.bool(this.eval(s.c))) this.stmt(s.t);
        else if (s.f) this.stmt(s.f);
        return;
      case "while":
        while (this.bool(this.eval(s.c))) if (this.loopBody(s.body)) break;
        return;
      case "do":
        do {
          if (this.loopBody(s.body)) break;
        } while (this.bool(this.eval(s.c)));
        return;
      case "for":
        if (s.init) this.eval(s.init);
        while (!s.c || this.bool(this.eval(s.c))) {
          if (this.loopBody(s.body)) break;
          if (s.step) this.eval(s.step);
        }
        return;
      case "forin": {
        const arr = this.array(s.name);
        for (const k of [...arr.keys()]) {
          if (!arr.has(k)) continue;
          this.set(s.v, new StrNum(k));
          if (this.loopBody(s.body)) break;
        }
        return;
      }
      case "block":
        this.exec(s.body);
        return;
      case "next":
        throw new NextRecord();
      case "exit":
        throw new ExitProgram(s.e ? Math.trunc(this.num(this.eval(s.e))) : -1);
      case "break":
        throw new BreakLoop();
      case "continue":
        throw new ContinueLoop();
      case "return":
        throw new ReturnValue(s.e ? this.eval(s.e) : undefined);
      case "delete": {
        const arr = this.array(s.name);
        if (s.subs) arr.delete(this.key(s.subs));
        else arr.clear();
        return;
      }
    }
  }
  /** Run one loop iteration; true means break. */
  loopBody(body: Stmt): boolean {
    try {
      this.stmt(body);
    } catch (x) {
      if (x instanceof BreakLoop) return true;
      if (x instanceof ContinueLoop) return false;
      throw x;
    }
    return false;
  }
  write(text: string) {
    if (this.out.length > 500_000) throw new AwkError("awk: too much output");
    this.out += text;
  }

  matches(rule: Rule): boolean {
    if (rule.range) {
      if (!this.rangeOn.get(rule)) {
        if (!this.bool(this.eval(rule.range[0]))) return false;
        this.rangeOn.set(rule, !this.bool(this.eval(rule.range[1])));
        return true;
      }
      if (this.bool(this.eval(rule.range[1]))) this.rangeOn.set(rule, false);
      return true;
    }
    return rule.pattern ? this.bool(this.eval(rule.pattern)) : true;
  }

  /** Split an input into records by RS: newline by default, "" for paragraphs, any other text as a separator. */
  records(text: string): string[] {
    const rs = this.str(this.vars.get("RS"));
    if (rs === "\n") return splitLines(text);
    if (rs === "") return text.replace(/^\n+/, "").split(/\n\n+/).map((r) => r.replace(/\n+$/, "")).filter((r) => r !== "");
    const parts = text.split(rs.length === 1 ? rs : this.regexNoGroups(rs));
    if (parts[parts.length - 1] === "" || parts[parts.length - 1] === "\n") parts.pop();
    return parts;
  }
}

/** Command-line assignments (-v x=1, or x=1 between files): the value gets escape processing and is a strnum. */
function assignment(arg: string): [string, string] | null {
  const m = /^([A-Za-z_][A-Za-z0-9_]*)=([\s\S]*)$/.exec(arg);
  return m ? [m[1], unescapeC(m[2])] : null;
}

const awk: Tool = (io) => {
  const argv = [...io.argv];
  const assigns: [string, string][] = [];
  let fs: string | null = null;
  let source: string | null = null;
  while (argv.length && argv[0].startsWith("-") && argv[0] !== "-") {
    const a = argv.shift() as string;
    if (a === "--") break;
    if (a.startsWith("-F")) {
      const v = a.length > 2 ? a.slice(2) : argv.shift();
      if (v === undefined) {
        io.err("awk: option requires an argument -- F");
        return 2;
      }
      fs = v === "t" ? "\t" : unescapeC(v);
    } else if (a.startsWith("-v")) {
      const v = a.length > 2 ? a.slice(2) : argv.shift();
      const as = v === undefined ? null : assignment(v);
      if (!as) {
        io.err(`awk: invalid -v argument: ${v ?? ""}`);
        return 2;
      }
      assigns.push(as);
    } else if (a.startsWith("-f")) {
      const f = a.length > 2 ? a.slice(2) : argv.shift();
      const t = f === undefined ? null : io.read(f);
      if (t === null) return 2;
      source = (source ?? "") + t + "\n";
    } else if (a === "--help") {
      io.out("Usage: awk [-F fs] [-v var=value] 'program' [file ...]\n");
      return 0;
    } else {
      io.err(`awk: not an option: ${a}`);
      return 2;
    }
  }
  if (source === null) {
    const s = argv.shift();
    if (s === undefined) {
      io.err("usage: awk [-F fs][-v var=value][prog | -f progfile][file ...]");
      return 2;
    }
    source = s;
  }
  let prog: AwkProgram;
  try {
    prog = parseAwk(source);
  } catch (e) {
    if (e instanceof AwkError) {
      io.err(e.message);
      return 2;
    }
    throw e;
  }
  const run = new AwkRun(prog, io);
  if (fs !== null) run.vars.set("FS", fs);
  for (const [k, v] of assigns) run.vars.set(k, new StrNum(v));
  let code = 0;
  let exitCode = -1;
  const finish = () => {
    io.out(run.out);
    return exitCode >= 0 ? exitCode : code;
  };
  const guard = (fn: () => void): "ok" | "exit" | "error" => {
    try {
      fn();
      return "ok";
    } catch (x) {
      if (x instanceof ExitProgram) {
        if (x.code >= 0) exitCode = x.code;
        return "exit";
      }
      if (x instanceof AwkError) {
        io.out(run.out);
        run.out = "";
        io.err(x.message);
        code = 2;
        return "error";
      }
      if (x instanceof NextRecord) {
        io.err("awk: `next' used in BEGIN or END action");
        code = 2;
        return "error";
      }
      throw x;
    }
  };
  let r = guard(() => prog.begin.forEach((b) => run.exec(b)));
  if (r === "error") return finish();
  if (r === "ok" && (prog.rules.length || prog.end.length)) {
    const operands = argv.length ? argv : ["-"];
    const files = operands.filter((o) => !assignment(o));
    outer: for (const op of files.length ? operands : [...operands, "-"]) {
      const as = assignment(op);
      if (as) {
        run.vars.set(as[0], new StrNum(as[1]));
        continue;
      }
      const text = op === "-" ? io.stdin ?? "" : io.read(op);
      if (text === null) {
        code = 2;
        continue;
      }
      run.vars.set("FILENAME", op === "-" ? "" : op);
      run.vars.set("FNR", 0);
      for (const rec of run.records(text)) {
        run.vars.set("NR", run.num(run.vars.get("NR")) + 1);
        run.vars.set("FNR", run.num(run.vars.get("FNR")) + 1);
        run.setRecord(rec);
        r = guard(() => {
          try {
            for (const rule of prog.rules) {
              if (!run.matches(rule)) continue;
              if (rule.action) run.exec(rule.action);
              else run.write(run.record + run.str(run.vars.get("ORS")));
            }
          } catch (x) {
            if (!(x instanceof NextRecord)) throw x;
          }
        });
        if (r === "error") return finish();
        if (r === "exit") break outer;
      }
    }
  }
  // END still runs after `exit` in BEGIN or a rule (an exit inside END stops it)
  guard(() => prog.end.forEach((b) => run.exec(b)));
  return finish();
};

/** Every tool, by program name. */
export const TEXT_TOOLS: Record<string, Tool> = { tr, sed, cut, awk, gawk: awk, paste, rev, tac, seq, printf: printfCmd };
