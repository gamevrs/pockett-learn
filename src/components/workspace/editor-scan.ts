/**
 * Cheap, line-based symbol scanning for the editor's completion, hover, go-to-definition and rename.
 * No parser: strings and comments are masked out, then each line is matched against a few regexes.
 * Results are cached per model version by the caller, so typing never re-scans more than once per pause.
 */

export type SymKind = "variable" | "constant" | "function" | "method" | "class" | "parameter" | "field" | "import" | "table" | "column";

export interface Sym {
  name: string;
  kind: SymKind;
  /** 1-based position of the declaration. */
  line: number;
  col: number;
  /** Simplified type id used for member completion, e.g. "str", "list", "class:Car", "module:math". */
  type?: string;
  /** Signature text for functions: "move(self, dx, dy)". */
  sig?: string;
  /** Class (or table) this belongs to. */
  owner?: string;
  /** Extra text for the completion list. */
  detail?: string;
  /** Lines (inclusive) where a local is visible; null = whole file. */
  scope: [number, number] | null;
}

export interface Scan {
  language: string;
  lines: string[];
  masked: string[];
  syms: Sym[];
}

const identRe = /^[A-Za-z_][A-Za-z0-9_]*$/;

// ───────────────────────────── masking ─────────────────────────────

/** Same-length copy of every line with string contents and comments blanked (quotes stay, so a literal is still visible). */
export function maskLines(language: string, lines: string[]): string[] {
  const out: string[] = [];
  let triple: string | null = null; // python ''' / """
  let block = false; // C-style /* */
  const lineComment = language === "python" ? "#" : language === "sql" ? "--" : "//";
  for (const line of lines) {
    let res = "";
    let quote: string | null = null;
    let i = 0;
    while (i < line.length) {
      const c = line[i];
      if (block) {
        if (c === "*" && line[i + 1] === "/") {
          block = false;
          res += "  ";
          i += 2;
        } else {
          res += " ";
          i++;
        }
        continue;
      }
      if (triple) {
        if (line.startsWith(triple, i)) {
          res += triple;
          triple = null;
          i += 3;
        } else {
          res += c === "\\" ? "  " : " ";
          i += c === "\\" ? 2 : 1;
        }
        continue;
      }
      if (quote) {
        if (c === "\\" && language !== "sql") {
          res += "  ";
          i += 2;
        } else if (c === quote) {
          res += c;
          quote = null;
          i++;
        } else {
          res += " ";
          i++;
        }
        continue;
      }
      if (language === "python" && (line.startsWith('"""', i) || line.startsWith("'''", i))) {
        triple = line.slice(i, i + 3);
        res += triple;
        i += 3;
        continue;
      }
      if (line.startsWith(lineComment, i)) {
        res += " ".repeat(line.length - i);
        break;
      }
      if (language !== "python" && language !== "sql" && c === "/" && line[i + 1] === "*") {
        block = true;
        res += "  ";
        i += 2;
        continue;
      }
      if (language === "sql" && c === "/" && line[i + 1] === "*") {
        block = true;
        res += "  ";
        i += 2;
        continue;
      }
      // Rust lifetimes and C/Go char literals: only treat ' as a quote when it plausibly closes
      if (c === "'" && (language === "rust" || language === "cpp" || language === "go" || language === "csharp")) {
        const close = line.indexOf("'", i + 1);
        if (close > i && close - i <= 4) {
          res += "'" + " ".repeat(close - i - 1) + "'";
          i = close + 1;
          continue;
        }
        res += c;
        i++;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        quote = c;
        res += c;
        i++;
        continue;
      }
      res += c;
      i++;
    }
    // single-line strings never continue past the line (except Go/JS backticks, which we do not scan)
    out.push(res);
  }
  return out;
}

const indentOf = (s: string) => {
  let n = 0;
  for (const ch of s) {
    if (ch === " ") n++;
    else if (ch === "\t") n += 4;
    else break;
  }
  return n;
};

/** Splits at commas that are not inside (), [], {} or <> . */
export function splitTop(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if ("([{<".includes(c)) depth++;
    else if (")]}>".includes(c) && !(c === ">" && s[i - 1] === "-")) depth = Math.max(0, depth - 1);
    if (c === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += c;
  }
  if (cur.trim()) parts.push(cur);
  return parts.map((p) => p.trim()).filter(Boolean);
}

// ───────────────────────────── entry ─────────────────────────────

export function scanSource(language: string, text: string, extra?: string): Scan {
  const lines = text.split("\n");
  const masked = maskLines(language, lines);
  const scan: Scan = { language, lines, masked, syms: [] };
  switch (language) {
    case "python":
      scanPython(scan);
      break;
    case "csharp":
      scanCSharp(scan);
      break;
    case "go":
      scanGo(scan);
      break;
    case "rust":
      scanRust(scan);
      break;
    case "cpp":
      scanCpp(scan);
      break;
    case "sql":
      scanSql(scan, extra ? `${extra}\n${text}` : text);
      break;
  }
  return scan;
}

/** Symbols that can be referred to from this 1-based line. */
export function visibleAt(scan: Scan, line: number): Sym[] {
  return scan.syms.filter((s) => s.scope === null || (line >= s.scope[0] && line <= s.scope[1]));
}

const add = (scan: Scan, s: Omit<Sym, "scope"> & { scope?: [number, number] | null }) => {
  scan.syms.push({ scope: null, ...s });
};

// ───────────────────────────── Python ─────────────────────────────

const PY_KEYWORDS = new Set("and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield True False None".split(" "));

function pyRhsType(rhs: string, classes: Set<string>): string | undefined {
  const r = rhs.trim();
  if (!r) return undefined;
  if (/^[rRbBuU]*[fF]?[rR]?["']/.test(r)) return /^[bB]/.test(r) ? "bytes" : "str";
  if (/^\[/.test(r)) return "list";
  if (/^\{\s*\}/.test(r)) return "dict";
  if (/^\{/.test(r)) return /^\{[^}]*?\bfor\b/.test(r) ? (/:/.test(r.split(" for ")[0] ?? "") ? "dict" : "set") : /^\{[^}:]*:[^}]/.test(r) ? "dict" : "set";
  if (/^\(/.test(r)) return "tuple";
  if (/^-?\d+\.\d*|^-?\.\d+|^-?\d+[eE]/.test(r)) return "float";
  if (/^-?\d/.test(r)) return "int";
  if (/^(True|False)\b/.test(r)) return "bool";
  const call = /^([A-Za-z_][\w.]*)\s*\(/.exec(r);
  if (call) {
    const fn = call[1];
    if (["str", "input", "repr", "format", "chr", "hex", "bin"].includes(fn)) return "str";
    if (["list", "sorted"].includes(fn)) return "list";
    if (fn === "dict") return "dict";
    if (["set", "frozenset"].includes(fn)) return "set";
    if (fn === "tuple") return "tuple";
    if (["int", "len", "ord", "round"].includes(fn)) return "int";
    if (fn === "float") return "float";
    if (fn === "open") return "file";
    if (classes.has(fn)) return `class:${fn}`;
    // method chain on a literal: "a b".split() / name.strip().upper()
    const tail = /\.\s*([a-z_]+)\s*\([^()]*\)\s*$/.exec(r);
    if (tail && /^[rRfF]*["']/.test(r)) return tail[1] === "split" || tail[1] === "splitlines" ? "list" : "str";
  }
  const sm = /^[rRfF]*["'][^"']*["']\s*\.\s*([a-z_]+)\s*\(/.exec(r);
  if (sm) return sm[1] === "split" || sm[1] === "splitlines" ? "list" : "str";
  return undefined;
}

function scanPython(scan: Scan) {
  const { masked } = scan;
  interface Block {
    kind: "class" | "def";
    name: string;
    indent: number;
    start: number;
    end: number;
    syms: Sym[];
  }
  const stack: Block[] = [];
  const classes = new Set<string>();
  for (const l of masked) {
    const m = /^\s*class\s+([A-Za-z_]\w*)/.exec(l);
    if (m) classes.add(m[1]);
  }
  const close = (b: Block, endLine: number) => {
    b.end = endLine;
    for (const s of b.syms) s.scope = [b.start, b.end];
  };
  let lastCode = 0;
  const innerDef = () => [...stack].reverse().find((b) => b.kind === "def");
  const innerClass = () => [...stack].reverse().find((b) => b.kind === "class");
  const declare = (name: string, line: number, col: number, kind: SymKind, extra: Partial<Sym> = {}) => {
    if (!identRe.test(name) || PY_KEYWORDS.has(name)) return;
    const def = innerDef();
    const sym: Sym = { name, kind, line, col, scope: null, ...extra };
    if (def) def.syms.push(sym);
    scan.syms.push(sym);
    return sym;
  };

  for (let i = 0; i < masked.length; i++) {
    const line = masked[i];
    if (!line.trim()) continue;
    const ln = i + 1;
    const ind = indentOf(line);
    while (stack.length && ind <= stack[stack.length - 1].indent) close(stack.pop()!, lastCode);
    lastCode = ln;

    const cls = /^(\s*)class\s+([A-Za-z_]\w*)\s*(?:\(([^)]*)\))?\s*:/.exec(line);
    if (cls) {
      add(scan, { name: cls[2], kind: "class", line: ln, col: cls[1].length + 7, detail: cls[3] ? `(${cls[3].trim()})` : undefined, sig: `class ${cls[2]}${cls[3] ? `(${cls[3].trim()})` : ""}` });
      stack.push({ kind: "class", name: cls[2], indent: ind, start: ln, end: ln, syms: [] });
      continue;
    }

    const def = /^(\s*)(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/.exec(line);
    if (def) {
      // the parameter list may continue on following lines
      let sigText = line.slice(line.indexOf("(", def[0].length - 1) + 1);
      let j = i;
      while (!sigText.includes(")") && j + 1 < masked.length && j - i < 12) sigText += " " + masked[++j].trim();
      const params = splitTop(sigText.slice(0, sigText.indexOf(")") >= 0 ? sigText.indexOf(")") : sigText.length));
      const owner = innerClass()?.name;
      const kind: SymKind = owner && stack[stack.length - 1]?.kind === "class" ? "method" : "function";
      const names = params.map((p) => p.replace(/^\*{1,2}/, "").split(/[:=]/)[0].trim());
      const sig = `${def[2]}(${params.map((p) => p.replace(/\s+/g, " ")).join(", ")})`;
      add(scan, { name: def[2], kind, line: ln, col: def[1].length + (line.includes("async") ? 11 : 5), sig, owner: kind === "method" ? owner : undefined });
      const block: Block = { kind: "def", name: def[2], indent: ind, start: ln, end: ln, syms: [] };
      stack.push(block);
      names.forEach((n) => {
        if (!identRe.test(n)) return;
        const sym: Sym = { name: n, kind: "parameter", line: ln, col: line.indexOf(n) + 1, scope: null, owner: n === "self" || n === "cls" ? owner : undefined, type: n === "self" && owner ? `class:${owner}` : undefined };
        block.syms.push(sym);
        scan.syms.push(sym);
      });
      i = j; // skip continuation lines
      continue;
    }

    const imp = /^\s*import\s+(.+)$/.exec(line);
    if (imp) {
      for (const part of imp[1].split(",")) {
        const [mod, alias] = part.trim().split(/\s+as\s+/);
        const name = (alias ?? mod.split(".")[0]).trim();
        if (name) declare(name, ln, line.indexOf(name) + 1, "import", { type: `module:${mod.trim().split(".")[0]}`, detail: `import ${mod.trim()}` });
      }
      continue;
    }
    const frm = /^\s*from\s+([\w.]+)\s+import\s+\(?(.+?)\)?\s*$/.exec(line);
    if (frm) {
      for (const part of frm[2].split(",")) {
        const [nm, alias] = part.trim().split(/\s+as\s+/);
        const name = (alias ?? nm).trim();
        if (name && name !== "*") declare(name, ln, line.indexOf(name) + 1, "import", { detail: `from ${frm[1]}` });
      }
      continue;
    }

    const selfAttr = /^\s*self\.([A-Za-z_]\w*)\s*(?::[^=]+)?=(?!=)\s*(.*)$/.exec(line);
    if (selfAttr) {
      const owner = innerClass()?.name;
      if (owner) add(scan, { name: selfAttr[1], kind: "field", line: ln, col: line.indexOf("self.") + 6, owner, type: pyRhsType(selfAttr[2], classes), detail: `self.${selfAttr[1]}` });
    }

    // plain / annotated / tuple-unpacking assignment
    const asg = /^\s*((?:\*?[A-Za-z_]\w*)(?:\s*,\s*\*?[A-Za-z_]\w*)*|\(\s*[\w\s,*]+\)|\[\s*[\w\s,*]+\])\s*(?::\s*[^=]+?)?\s*(=|\+=|-=|\*=|\/=|\/\/=|%=)(?!=)\s*(.*)$/.exec(line);
    if (asg && !selfAttr) {
      const targets = asg[1].split(/[\s,()[\]*]+/).filter(Boolean);
      if (asg[2] === "=") {
        const single = targets.length === 1;
        const cls = innerClass();
        const inDef = innerDef();
        for (const t of targets) {
          const kind: SymKind = /^[A-Z][A-Z0-9_]+$/.test(t) ? "constant" : cls && !inDef ? "field" : "variable";
          declare(t, ln, line.indexOf(t) + 1, kind, { type: single ? pyRhsType(asg[3], classes) : undefined, owner: kind === "field" ? cls?.name : undefined });
        }
      }
    }

    for (const m of line.matchAll(/\bfor\s+(\(?\s*[A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*\s*\)?)\s+in\b/g)) {
      for (const t of m[1].split(/[\s,()]+/).filter(Boolean)) declare(t, ln, line.indexOf(t, m.index) + 1, "variable");
    }
    if (/^\s*(?:async\s+)?(?:with|except)\b/.test(line)) {
      for (const m of line.matchAll(/\bas\s+([A-Za-z_]\w*)/g)) declare(m[1], ln, m.index! + 4, "variable", { type: /\bopen\s*\(/.test(line) ? "file" : undefined });
    }
    for (const m of line.matchAll(/\(\s*([A-Za-z_]\w*)\s*:=/g)) declare(m[1], ln, m.index! + 2, "variable");
  }
  while (stack.length) close(stack.pop()!, masked.length);
}

// ───────────────────────────── C-like helpers ─────────────────────────────

/** For every line holding a "{", the line of the matching "}" (first brace on the line wins). */
function braceRanges(masked: string[]): Map<number, number> {
  const ranges = new Map<number, number>();
  const stack: number[] = [];
  for (let i = 0; i < masked.length; i++) {
    for (const c of masked[i]) {
      if (c === "{") stack.push(i + 1);
      else if (c === "}") {
        const open = stack.pop();
        if (open !== undefined && !ranges.has(open)) ranges.set(open, i + 1);
        else if (open !== undefined) ranges.set(open, Math.max(ranges.get(open)!, i + 1));
      }
    }
  }
  for (const open of stack) if (!ranges.has(open)) ranges.set(open, masked.length);
  return ranges;
}

/** Body range of a declaration on `line` whose "{" is on that line or the next. */
function bodyRange(masked: string[], ranges: Map<number, number>, line: number): [number, number] | null {
  for (const l of [line, line + 1]) {
    if (masked[l - 1]?.includes("{") && (l === line || /^\s*\{/.test(masked[l - 1]))) {
      const end = ranges.get(l);
      if (end) return [line, end];
    }
  }
  return null;
}

const within = (r: [number, number] | null, line: number) => !!r && line >= r[0] && line <= r[1];

interface FnInfo {
  name: string;
  range: [number, number];
  owner?: string;
}

// ───────────────────────────── C# ─────────────────────────────

const CS_NOT_TYPES = new Set("return new else throw using case goto await yield break continue namespace if while for foreach switch lock catch try finally do in is as out ref params base this typeof sizeof default".split(" "));
const CS_TYPE = "[A-Za-z_][\\w<>\\[\\],.?]*";

function csType(raw: string | undefined, rhs?: string, classes?: Set<string>): string | undefined {
  let t = raw?.trim();
  if (!t || t === "var") {
    const r = (rhs ?? "").trim();
    const nw = /^new\s+([\w.]+)(<[^>]*>)?\s*(\[|\(|\{)?/.exec(r);
    if (nw) t = nw[1] + (nw[3] === "[" ? "[]" : "");
    else if (/^\$?@?"/.test(r)) t = "string";
    else if (/^-?\d+\.\d|^-?\d+[fFdDmM]\b/.test(r)) t = "double";
    else if (/^-?\d/.test(r)) t = "int";
    else if (/^(true|false)\b/.test(r)) t = "bool";
    else if (/^\[/.test(r)) t = "list";
    else if (/^Console\.ReadLine/.test(r)) t = "string";
    else return undefined;
  }
  const base = t.replace(/\?$/, "");
  if (/\[\]$/.test(base)) return "array";
  const head = base.replace(/<.*$/, "");
  if (/^(string|String)$/.test(head)) return "string";
  if (/^(List|IList|IEnumerable|HashSet|Queue|Stack|ICollection|ReadOnlyCollection)$/.test(head)) return "list";
  if (/^(Dictionary|IDictionary|SortedDictionary)$/.test(head)) return "dict";
  if (/^(int|long|short|byte|uint|ulong)$/.test(head)) return "int";
  if (/^(double|float|decimal)$/.test(head)) return "double";
  if (classes?.has(head)) return `class:${head}`;
  return head;
}

function scanCSharp(scan: Scan) {
  const { masked } = scan;
  const ranges = braceRanges(masked);
  const classes = new Set<string>();
  const classRanges: { name: string; range: [number, number] }[] = [];
  const fns: FnInfo[] = [];

  masked.forEach((l, i) => {
    const m = /\b(class|struct|interface|enum|record)\s+([A-Za-z_]\w*)/.exec(l);
    if (m && !/^\s*(\/\/|using)/.test(l)) {
      classes.add(m[2]);
      const r = bodyRange(masked, ranges, i + 1);
      if (r) classRanges.push({ name: m[2], range: r });
      add(scan, { name: m[2], kind: "class", line: i + 1, col: m.index! + m[1].length + 2, sig: `${m[1]} ${m[2]}` });
    }
  });
  const ownerAt = (line: number) => [...classRanges].reverse().find((c) => within(c.range, line) && c.range[0] !== line)?.name;
  const fnAt = (line: number) => fns.filter((f) => within(f.range, line)).sort((a, b) => b.range[0] - a.range[0])[0];

  const fnRe = new RegExp(`^\\s*(?:(?:public|private|protected|internal|static|async|virtual|override|abstract|sealed|extern|unsafe|new|partial)\\s+)*(${CS_TYPE})\\s+([A-Za-z_]\\w*)\\s*(?:<[^>]*>)?\\s*\\(([^)]*)\\)\\s*(?:where[^{]*)?(\\{|=>|;|$)`);
  masked.forEach((l, i) => {
    const m = fnRe.exec(l);
    if (!m || CS_NOT_TYPES.has(m[1]) || CS_NOT_TYPES.has(m[2]) || /^\s*(if|while|for|foreach|switch|using|lock|catch)\b/.test(l)) return;
    if (/=\s*[^=]/.test(l.slice(0, l.indexOf(m[2]))) ) return;
    const range = bodyRange(masked, ranges, i + 1) ?? [i + 1, i + 1];
    const owner = ownerAt(i + 1);
    fns.push({ name: m[2], range, owner });
    add(scan, { name: m[2], kind: owner ? "method" : "function", line: i + 1, col: l.indexOf(m[2], m.index) + 1, sig: `${m[1]} ${m[2]}(${m[3].trim()})`, owner, type: csType(m[1], undefined, classes) });
    for (const p of splitTop(m[3])) {
      const pm = /(?:(?:ref|out|in|params|this)\s+)?(\S+(?:<[^>]*>)?(?:\[\])?)\s+([A-Za-z_]\w*)\s*(?:=.*)?$/.exec(p);
      if (pm) add(scan, { name: pm[2], kind: "parameter", line: i + 1, col: l.indexOf(pm[2]) + 1, type: csType(pm[1], undefined, classes), scope: range });
    }
  });

  const declRe = new RegExp(`^\\s*(?:(?:public|private|protected|internal|static|readonly|const|volatile)\\s+)*(${CS_TYPE})\\s+([A-Za-z_]\\w*)\\s*(=(?!=)|;|,)(.*)$`);
  masked.forEach((l, i) => {
    const ln = i + 1;
    const fn = fnAt(ln);
    const scope = fn ? fn.range : null;
    const m = declRe.exec(l);
    if (m && !CS_NOT_TYPES.has(m[1]) && !CS_NOT_TYPES.has(m[2])) {
      const owner = !fn ? ownerAt(ln) : undefined;
      const isConst = /\bconst\b/.test(l) || /^[A-Z][A-Z0-9_]+$/.test(m[2]);
      add(scan, { name: m[2], kind: owner ? "field" : isConst ? "constant" : "variable", line: ln, col: l.indexOf(m[2], m.index) + 1, type: csType(m[1], m[3] === "=" ? m[4] : undefined, classes), owner, scope });
      // `int a = 1, b = 2;`
      for (const extra of m[4].matchAll(/,\s*([A-Za-z_]\w*)\s*=/g)) add(scan, { name: extra[1], kind: "variable", line: ln, col: l.indexOf(extra[1], m.index) + 1, type: csType(m[1], undefined, classes), scope });
    }
    for (const f of l.matchAll(/\b(?:foreach|for)\s*\(\s*(?:var|[\w<>\[\],.?]+)\s+([A-Za-z_]\w*)\s*(?:in\b|=)/g)) add(scan, { name: f[1], kind: "variable", line: ln, col: l.indexOf(f[1], f.index) + 1, scope: fn ? fn.range : [ln, ln + 20] });
    for (const o of l.matchAll(/\b(?:out|using)\s+(?:var|[\w<>\[\],.?]+)\s+([A-Za-z_]\w*)/g)) add(scan, { name: o[1], kind: "variable", line: ln, col: l.indexOf(o[1], o.index) + 1, scope });
    const c = /\bcatch\s*\(\s*[\w.]+\s+([A-Za-z_]\w*)\s*\)/.exec(l);
    if (c) add(scan, { name: c[1], kind: "variable", line: ln, col: l.indexOf(c[1]) + 1, scope, type: "class:Exception" });
  });
}

// ───────────────────────────── Go ─────────────────────────────

function goType(rhs: string | undefined, declared: string | undefined, types: Set<string>): string | undefined {
  const d = declared?.trim();
  if (d) {
    if (d.startsWith("[]")) return "slice";
    if (d.startsWith("map[")) return "map";
    const base = d.replace(/^\*/, "");
    if (base === "string") return "string";
    if (types.has(base)) return `struct:${base}`;
    return base;
  }
  const r = (rhs ?? "").trim();
  if (/^[`"]/.test(r)) return "string";
  if (/^\[\]/.test(r) || /^make\(\s*\[\]/.test(r)) return "slice";
  if (/^make\(\s*map\[|^map\[/.test(r)) return "map";
  if (/^-?\d+\.\d/.test(r)) return "float64";
  if (/^-?\d/.test(r)) return "int";
  const st = /^&?([A-Z]\w*)\s*\{/.exec(r) ?? /^&?([A-Za-z_]\w*)\s*\{/.exec(r);
  if (st && types.has(st[1])) return `struct:${st[1]}`;
  if (/^(true|false)\b/.test(r)) return "bool";
  return undefined;
}

function scanGo(scan: Scan) {
  const { masked } = scan;
  const ranges = braceRanges(masked);
  const types = new Set<string>();
  const structRanges: { name: string; range: [number, number] }[] = [];
  masked.forEach((l, i) => {
    const m = /^\s*type\s+([A-Za-z_]\w*)\s+(struct|interface)\b/.exec(l);
    if (m) {
      types.add(m[1]);
      const r = bodyRange(masked, ranges, i + 1);
      if (r) structRanges.push({ name: m[1], range: r });
      add(scan, { name: m[1], kind: "class", line: i + 1, col: l.indexOf(m[1]) + 1, sig: `type ${m[1]} ${m[2]}` });
    }
  });
  const fns: FnInfo[] = [];
  masked.forEach((l, i) => {
    const m = /^\s*func\s+(?:\(\s*(\w+)\s+\*?(\w+)\s*\)\s*)?([A-Za-z_]\w*)\s*(?:\[[^\]]*\])?\s*\(([^)]*)\)\s*(.*?)\s*\{?\s*$/.exec(l);
    if (!m) return;
    const range = bodyRange(masked, ranges, i + 1) ?? [i + 1, i + 1];
    fns.push({ name: m[3], range, owner: m[2] });
    add(scan, { name: m[3], kind: m[2] ? "method" : "function", line: i + 1, col: l.indexOf(m[3], l.indexOf("func")) + 1, sig: `func ${m[3]}(${m[4].trim()})${m[5] ? " " + m[5].replace(/\s*\{$/, "") : ""}`, owner: m[2] });
    if (m[1]) add(scan, { name: m[1], kind: "parameter", line: i + 1, col: l.indexOf(m[1]) + 1, type: `struct:${m[2]}`, scope: range });
    // params: "a, b int, c string" (names share the type that follows them)
    let carry: string | undefined;
    const segs = splitTop(m[4]).reverse();
    for (const seg of segs) {
      const parts = seg.split(/\s+/);
      const name = parts[0];
      if (parts.length > 1) carry = parts.slice(1).join(" ");
      if (identRe.test(name)) add(scan, { name, kind: "parameter", line: i + 1, col: l.indexOf(name, l.indexOf("(")) + 1, type: goType(undefined, carry, types), scope: range });
    }
  });
  const fnAt = (line: number) => fns.filter((f) => within(f.range, line)).sort((a, b) => b.range[0] - a.range[0])[0];

  masked.forEach((l, i) => {
    const ln = i + 1;
    const fn = fnAt(ln);
    const scope = fn ? fn.range : null;
    const st = structRanges.find((s) => within(s.range, ln) && s.range[0] !== ln);
    if (st) {
      const f = /^\s+([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)\s+([\w.*[\]]+)/.exec(l);
      if (f) for (const n of f[1].split(/\s*,\s*/)) add(scan, { name: n, kind: "field", line: ln, col: l.indexOf(n) + 1, owner: st.name, type: goType(undefined, f[2], types), detail: f[2] });
      return;
    }
    for (const m of l.matchAll(/(?:^|[\s;(])([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)\s*:=\s*([^;{]*)/g)) {
      const names = m[1].split(/\s*,\s*/);
      for (const n of names) if (n !== "_") add(scan, { name: n, kind: "variable", line: ln, col: l.indexOf(n, m.index) + 1, type: names.length === 1 ? goType(m[2], undefined, types) : undefined, scope });
    }
    const v = /^\s*(var|const)\s+([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)\s*([\w.*[\]]+)?\s*(?:=\s*(.*))?$/.exec(l);
    if (v) for (const n of v[2].split(/\s*,\s*/)) add(scan, { name: n, kind: v[1] === "const" ? "constant" : "variable", line: ln, col: l.indexOf(n) + 1, type: goType(v[4], v[3] && v[3] !== "=" ? v[3] : undefined, types), scope });
    const r = /\bfor\s+([A-Za-z_]\w*)\s*,\s*([A-Za-z_]\w*)\s*:?=\s*range\b/.exec(l);
    if (r) for (const n of [r[1], r[2]]) if (n !== "_") add(scan, { name: n, kind: "variable", line: ln, col: l.indexOf(n) + 1, scope: fn ? fn.range : [ln, ln + 30] });
  });
}

// ───────────────────────────── Rust ─────────────────────────────

function rustType(rhs: string | undefined, declared: string | undefined): string | undefined {
  const d = declared?.trim().replace(/^&(mut\s+)?/, "");
  if (d) {
    const head = d.replace(/<.*$/, "").replace(/^\[.*$/, "Vec").trim();
    if (head === "str" || head === "String") return head === "String" ? "String" : "str";
    if (/^(i|u)(8|16|32|64|128|size)$|^f(32|64)$/.test(head)) return "number";
    return head;
  }
  const r = (rhs ?? "").trim();
  if (/^String::|\.to_string\(\)|\.to_owned\(\)|^format!/.test(r)) return "String";
  if (/^&?"/.test(r)) return "str";
  if (/^vec!|^Vec::/.test(r)) return "Vec";
  if (/^HashMap::/.test(r)) return "HashMap";
  if (/^(Some\(|None\b)/.test(r)) return "Option";
  if (/^(Ok\(|Err\()/.test(r)) return "Result";
  if (/^-?\d/.test(r)) return "number";
  const st = /^([A-Z]\w*)\s*(\{|::new\b)/.exec(r);
  if (st) return `struct:${st[1]}`;
  if (/\.(iter|into_iter|chars|lines)\(\)/.test(r) && !/\.collect|\.sum|\.count/.test(r)) return "iter";
  return undefined;
}

function scanRust(scan: Scan) {
  const { masked } = scan;
  const ranges = braceRanges(masked);
  const structRanges: { name: string; range: [number, number] }[] = [];
  const implRanges: { name: string; range: [number, number] }[] = [];
  masked.forEach((l, i) => {
    const m = /^\s*(?:pub(?:\([^)]*\))?\s+)?(struct|enum|trait|union)\s+([A-Za-z_]\w*)/.exec(l);
    if (m) {
      const r = bodyRange(masked, ranges, i + 1);
      if (r) structRanges.push({ name: m[2], range: r });
      add(scan, { name: m[2], kind: "class", line: i + 1, col: l.indexOf(m[2]) + 1, sig: `${m[1]} ${m[2]}` });
    }
    const im = /^\s*impl(?:<[^>]*>)?\s+(?:[\w:<>]+\s+for\s+)?([A-Za-z_]\w*)/.exec(l);
    if (im) {
      const r = bodyRange(masked, ranges, i + 1);
      if (r) implRanges.push({ name: im[1], range: r });
    }
  });
  const fns: FnInfo[] = [];
  for (let i = 0; i < masked.length; i++) {
    const l = masked[i];
    const m = /^\s*(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?(?:unsafe\s+)?fn\s+([A-Za-z_]\w*)\s*(?:<[^>]*>)?\s*\(/.exec(l);
    if (!m) continue;
    let text = l.slice(m[0].length);
    let j = i;
    while (!text.includes(")") && j + 1 < masked.length && j - i < 12) text += " " + masked[++j].trim();
    const close = text.indexOf(")");
    const paramText = close >= 0 ? text.slice(0, close) : text;
    const ret = /->\s*([^{]+?)\s*(?:where.*)?\{?\s*$/.exec(text.slice(close + 1));
    const range = bodyRange(masked, ranges, j + 1) ?? [i + 1, j + 1];
    const owner = implRanges.find((r) => within(r.range, i + 1) && r.range[0] !== i + 1)?.name;
    fns.push({ name: m[1], range: [i + 1, range[1]], owner });
    add(scan, { name: m[1], kind: owner ? "method" : "function", line: i + 1, col: l.indexOf(m[1], l.indexOf("fn")) + 1, sig: `fn ${m[1]}(${paramText.trim().replace(/\s+/g, " ")})${ret ? ` -> ${ret[1]}` : ""}`, owner, type: rustType(undefined, ret?.[1]) });
    for (const p of splitTop(paramText)) {
      if (/^&?(mut\s+)?self$/.test(p)) {
        add(scan, { name: "self", kind: "parameter", line: i + 1, col: l.indexOf("self") + 1, type: owner ? `struct:${owner}` : undefined, scope: [i + 1, range[1]], owner });
        continue;
      }
      const pm = /^(?:mut\s+)?([A-Za-z_]\w*)\s*:\s*(.+)$/.exec(p);
      if (pm) add(scan, { name: pm[1], kind: "parameter", line: i + 1, col: l.indexOf(pm[1], l.indexOf("(")) + 1, type: rustType(undefined, pm[2]), scope: [i + 1, range[1]], detail: pm[2] });
    }
    i = j;
  }
  const fnAt = (line: number) => fns.filter((f) => within(f.range, line)).sort((a, b) => b.range[0] - a.range[0])[0];

  masked.forEach((l, i) => {
    const ln = i + 1;
    const fn = fnAt(ln);
    const scope = fn ? fn.range : null;
    const st = structRanges.find((s) => within(s.range, ln) && s.range[0] !== ln);
    if (st && !fn) {
      const f = /^\s*(?:pub(?:\([^)]*\))?\s+)?([A-Za-z_]\w*)\s*:\s*(.+?),?\s*$/.exec(l);
      if (f) add(scan, { name: f[1], kind: "field", line: ln, col: l.indexOf(f[1]) + 1, owner: st.name, type: rustType(undefined, f[2]), detail: f[2] });
      return;
    }
    const let_ = /^\s*let\s+(?:mut\s+)?(\(?\s*[A-Za-z_]\w*(?:\s*,\s*(?:mut\s+)?[A-Za-z_]\w*)*\s*\)?)\s*(?::\s*([^=;]+?))?\s*(?:=\s*(.*?))?;?\s*$/.exec(l);
    if (let_) {
      const names = let_[1].replace(/[()]/g, "").split(/\s*,\s*/).map((n) => n.replace(/^mut\s+/, "").trim());
      for (const n of names) if (identRe.test(n)) add(scan, { name: n, kind: "variable", line: ln, col: l.indexOf(n) + 1, type: names.length === 1 ? rustType(let_[3], let_[2]) : undefined, scope });
    }
    const k = /^\s*(?:pub(?:\([^)]*\))?\s+)?(?:const|static)\s+(?:mut\s+)?([A-Za-z_]\w*)\s*:\s*([^=]+)=/.exec(l);
    if (k) add(scan, { name: k[1], kind: "constant", line: ln, col: l.indexOf(k[1]) + 1, type: rustType(undefined, k[2]), scope });
    for (const f of l.matchAll(/\bfor\s+(\(?\s*[A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*\s*\)?)\s+in\b/g)) {
      for (const n of f[1].replace(/[()]/g, "").split(/\s*,\s*/)) if (identRe.test(n.trim())) add(scan, { name: n.trim(), kind: "variable", line: ln, col: l.indexOf(n.trim(), f.index) + 1, scope: fn ? fn.range : [ln, ln + 30] });
    }
    for (const f of l.matchAll(/\blet\s+(?:Some|Ok|Err)\(\s*(?:mut\s+)?([A-Za-z_]\w*)\s*\)/g)) add(scan, { name: f[1], kind: "variable", line: ln, col: l.indexOf(f[1], f.index) + 1, scope: fn ? fn.range : [ln, ln + 30] });
  });
}

// ───────────────────────────── C++ ─────────────────────────────

const CPP_NOT_TYPES = new Set("return else new delete throw using namespace case goto co_return co_await typedef if while for switch do break continue public private protected include define".split(" "));

function cppType(rawType: string | undefined, rhs: string | undefined, classes: Set<string>): string | undefined {
  let t = (rawType ?? "").replace(/\b(const|static|constexpr|volatile|mutable|unsigned|signed)\b/g, "").replace(/[&*]/g, "").trim();
  if (!t || t === "auto") {
    const r = (rhs ?? "").trim();
    if (/^"/.test(r) || /^std::string\b|^std::to_string/.test(r)) return "string";
    if (/^-?\d+\.\d/.test(r)) return "double";
    if (/^-?\d/.test(r)) return "int";
    if (/^(true|false)\b/.test(r)) return "bool";
    const vec = /^std::(vector|map|unordered_map|set|unordered_set|string)\b/.exec(r) ?? /^(vector|map|string)\b/.exec(r);
    if (vec) return vec[1];
    const cl = /^([A-Z]\w*)\s*[({]/.exec(r);
    if (cl && classes.has(cl[1])) return `class:${cl[1]}`;
    return undefined;
  }
  t = t.replace(/^std::/, "");
  const head = t.replace(/<.*$/, "").trim();
  if (head === "string" || head === "wstring") return "string";
  if (["vector", "map", "unordered_map", "set", "unordered_set", "deque", "list", "array"].includes(head)) return head === "deque" || head === "array" || head === "list" ? "vector" : head;
  if (classes.has(head)) return `class:${head}`;
  return head;
}

function scanCpp(scan: Scan) {
  const { masked } = scan;
  const ranges = braceRanges(masked);
  const classes = new Set<string>();
  const classRanges: { name: string; range: [number, number] }[] = [];
  masked.forEach((l, i) => {
    const m = /^\s*(?:typedef\s+)?(class|struct|enum(?:\s+class)?)\s+([A-Za-z_]\w*)/.exec(l);
    if (m && !/;\s*$/.test(l.replace(/\{.*$/, ""))) {
      classes.add(m[2]);
      const r = bodyRange(masked, ranges, i + 1);
      if (r) classRanges.push({ name: m[2], range: r });
      add(scan, { name: m[2], kind: "class", line: i + 1, col: l.indexOf(m[2]) + 1, sig: `${m[1]} ${m[2]}` });
    }
  });
  const ownerAt = (line: number) => [...classRanges].reverse().find((c) => within(c.range, line) && c.range[0] !== line)?.name;
  const fns: FnInfo[] = [];
  const fnRe = /^\s*(?:template\s*<[^>]*>\s*)?(?:(?:static|inline|virtual|constexpr|explicit|friend|extern)\s+)*([\w:<>,*&\s]+?[\s*&])([A-Za-z_]\w*(?:::~?\w+)?)\s*\(([^;{)]*)\)\s*(?:const\s*)?(?:noexcept\s*)?(?:override\s*)?(\{|$)/;
  masked.forEach((l, i) => {
    const m = fnRe.exec(l);
    if (!m) return;
    const ret = m[1].trim();
    if (CPP_NOT_TYPES.has(ret.split(/\s+/)[0]) || CPP_NOT_TYPES.has(m[2]) || /^\s*#/.test(l)) return;
    const range = bodyRange(masked, ranges, i + 1) ?? [i + 1, i + 1];
    const owner = ownerAt(i + 1);
    fns.push({ name: m[2], range, owner });
    add(scan, { name: m[2].replace(/^.*::/, ""), kind: owner ? "method" : "function", line: i + 1, col: l.indexOf(m[2]) + 1, sig: `${ret} ${m[2]}(${m[3].trim()})`, owner, type: cppType(ret, undefined, classes) });
    for (const p of splitTop(m[3])) {
      const pm = /^(.*?[\s*&])([A-Za-z_]\w*)\s*(?:=.*)?(\[\])?$/.exec(p);
      if (pm) add(scan, { name: pm[2], kind: "parameter", line: i + 1, col: l.indexOf(pm[2], l.indexOf("(")) + 1, type: cppType(pm[1], undefined, classes), scope: range });
    }
  });
  const fnAt = (line: number) => fns.filter((f) => within(f.range, line)).sort((a, b) => b.range[0] - a.range[0])[0];
  const declRe = /^\s*(?:(?:const|static|constexpr|volatile|mutable|register|inline|extern)\s+)*((?:unsigned\s+|signed\s+|long\s+)*(?:[A-Za-z_][\w:]*)(?:<[^;=()]*>)?)\s*([*&]*)\s+([*&]*)([A-Za-z_]\w*)\s*(?:\[[^\]]*\])?\s*(=(?!=)|;|\{|\(|,|:)(.*)$/;
  masked.forEach((l, i) => {
    const ln = i + 1;
    const fn = fnAt(ln);
    const scope = fn ? fn.range : null;
    if (/^\s*#/.test(l)) return;
    const m = declRe.exec(l);
    const head = m?.[1].split(/\s+/)[0] ?? "";
    if (m && !CPP_NOT_TYPES.has(head) && !fns.some((f) => f.range[0] === ln) && !(m[5] === "(" && !/^\s*(?:std::)?\w+(?:<.*>)?\s+\w+\s*\(\s*[\w"'.]/.test(l))) {
      const owner = !fn ? ownerAt(ln) : undefined;
      add(scan, { name: m[4], kind: owner ? "field" : /^[A-Z][A-Z0-9_]+$/.test(m[4]) || /\bconst(expr)?\b/.test(l.slice(0, l.indexOf(m[4]))) && !fn ? "constant" : "variable", line: ln, col: l.indexOf(m[4], m.index) + 1, type: cppType(m[1], m[5] === "=" || m[5] === "{" ? m[6] : undefined, classes), owner, scope });
    }
    for (const f of l.matchAll(/\bfor\s*\(\s*(?:const\s+)?(auto|[\w:<>]+)\s*[&*]*\s*([A-Za-z_]\w*)\s*(?::|=)/g)) add(scan, { name: f[2], kind: "variable", line: ln, col: l.indexOf(f[2], f.index) + 1, scope: fn ? fn.range : [ln, ln + 30], type: f[1] === "auto" ? undefined : cppType(f[1], undefined, classes) });
  });
}

// ───────────────────────────── SQL ─────────────────────────────

function scanSql(scan: Scan, text: string) {
  const clean = text.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
  for (const m of clean.matchAll(/\bCREATE\s+(?:TEMP(?:ORARY)?\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"[]?([A-Za-z_]\w*)[`"\]]?\s*\(/gi)) {
    const start = m.index! + m[0].length;
    let depth = 1;
    let end = start;
    while (end < clean.length && depth > 0) {
      if (clean[end] === "(") depth++;
      else if (clean[end] === ")") depth--;
      end++;
    }
    const table = m[1];
    const line = scan.lines.findIndex((l) => new RegExp(`\\b${table}\\b`, "i").test(l)) + 1;
    add(scan, { name: table, kind: "table", line: Math.max(1, line), col: 1, sig: `table ${table}` });
    const cols: string[] = [];
    for (const def of splitTop(clean.slice(start, end - 1))) {
      const cm = /^[`"[]?([A-Za-z_]\w*)[`"\]]?\s*([A-Za-z]+(?:\([^)]*\))?)?/.exec(def.trim());
      if (!cm || /^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT|KEY)$/i.test(cm[1])) continue;
      cols.push(cm[1]);
      add(scan, { name: cm[1], kind: "column", line: Math.max(1, line), col: 1, owner: table, detail: cm[2]?.toUpperCase() ?? "", type: cm[2]?.toUpperCase() });
    }
    scan.syms.find((s) => s.kind === "table" && s.name === table)!.detail = cols.join(", ");
  }
}

/** Tables mentioned in the SQL statement around `offset` (FROM/JOIN, with aliases). */
export function sqlStatementTables(text: string, offset: number): { table: string; alias?: string }[] {
  const start = text.lastIndexOf(";", offset - 1) + 1;
  const endIdx = text.indexOf(";", offset);
  const stmt = text.slice(start, endIdx < 0 ? text.length : endIdx);
  const out: { table: string; alias?: string }[] = [];
  for (const m of stmt.matchAll(/\b(?:FROM|JOIN|UPDATE|INTO)\s+[`"[]?([A-Za-z_]\w*)[`"\]]?(?:\s+(?:AS\s+)?([A-Za-z_]\w*))?/gi)) {
    const alias = m[2] && !/^(WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|CROSS|FULL|ON|GROUP|ORDER|LIMIT|HAVING|UNION|SET|VALUES|USING|NATURAL|SELECT)$/i.test(m[2]) ? m[2] : undefined;
    out.push({ table: m[1], alias });
  }
  return out;
}

// ───────────────────────────── receivers ─────────────────────────────

export interface Receiver {
  /** Text of the dotted chain before the "." (or "::"), e.g. "self.items" or "name.strip()". */
  chain: string;
  /** Head identifier of the chain, when it is a plain name. */
  head?: string;
  /** Type id when it could be inferred. */
  type?: string;
}

/** Finds and types the expression right before a "." at the end of `prefix` (text of the line up to the dot). */
export function receiverBefore(scan: Scan, prefix: string, line: number): Receiver | null {
  const p = prefix.replace(/\s+$/, "");
  const last = p[p.length - 1];
  if (!last) return null;
  if (last === '"' || last === "'") return { chain: last, type: scan.language === "python" ? "str" : scan.language === "csharp" ? "string" : scan.language === "go" ? "string" : scan.language === "rust" ? "str" : "string" };
  if (last === "]") {
    // literal list vs indexing: a name or ")" right before "[" means indexing
    let depth = 0;
    let k = p.length - 1;
    for (; k >= 0; k--) {
      if (p[k] === "]") depth++;
      else if (p[k] === "[") {
        depth--;
        if (depth === 0) break;
      }
    }
    if (k > 0 && /[\w)\]]/.test(p[k - 1]) ) return null;
    return { chain: "[]", type: scan.language === "python" ? "list" : "list" };
  }
  if (last === "}" && scan.language === "python") return { chain: "{}", type: "dict" };
  const m = /([A-Za-z_]\w*(?:\([^()]*\))?(?:\s*\.\s*[A-Za-z_]\w*(?:\([^()]*\))?)*)$/.exec(p);
  if (!m) return null;
  const chain = m[1];
  const segs = chain.split(/\s*\.\s*/);
  const headName = segs[0].replace(/\(.*$/, "");
  const vis = visibleAt(scan, line);
  const sym = [...vis].reverse().find((s) => s.name === headName && s.kind !== "method" && s.kind !== "field");
  let type = sym?.type;
  if (!sym && ["self", "this"].includes(headName)) {
    const owner = enclosingOwner(scan, line);
    if (owner) type = `class:${owner}`;
  }
  const isCall = (s: string) => /\(/.test(s);
  if (segs.length === 1) {
    if (isCall(segs[0]) && sym?.kind === "function") type = sym.type;
    return { chain, head: headName, type: sym || ["self", "this"].includes(headName) ? type : undefined };
  }
  // walk members: self.items -> field type; name.strip() -> return type table
  for (let i = 1; i < segs.length && type; i++) {
    const seg = segs[i].replace(/\(.*$/, "");
    if (type.startsWith("class:") || type.startsWith("struct:")) {
      const owner = type.slice(type.indexOf(":") + 1);
      const f = scan.syms.find((s) => s.owner === owner && s.name === seg && (s.kind === "field" || s.kind === "method"));
      type = f?.type;
    } else if (scan.language === "python") {
      type = PY_RETURN_TABLE[`${type}.${seg}`];
    } else type = undefined;
  }
  return { chain, head: headName, type: type };
}

const PY_RETURN_TABLE: Record<string, string> = {
  "str.upper": "str", "str.lower": "str", "str.strip": "str", "str.lstrip": "str", "str.rstrip": "str", "str.replace": "str", "str.title": "str",
  "str.capitalize": "str", "str.join": "str", "str.format": "str", "str.center": "str", "str.zfill": "str", "str.split": "list", "str.splitlines": "list",
  "dict.keys": "list", "dict.values": "list", "dict.items": "list", "list.copy": "list", "dict.copy": "dict", "set.union": "set", "set.intersection": "set", "set.difference": "set",
};

/** Name of the class whose body (or method) contains `line`. */
export function enclosingOwner(scan: Scan, line: number): string | undefined {
  if (scan.language === "python") {
    let best: { name: string; line: number } | undefined;
    const lineIndent = indentOf(scan.masked[line - 1] || "x");
    for (const s of scan.syms) {
      if (s.kind !== "class" || s.line > line) continue;
      const clsIndent = indentOf(scan.masked[s.line - 1]);
      // everything after the class header that is indented deeper (or blank) belongs to it
      let belongs = true;
      for (let k = s.line + 1; k <= line; k++) {
        const t = scan.masked[k - 1];
        if (t.trim() && indentOf(t) <= clsIndent) {
          belongs = false;
          break;
        }
      }
      if (belongs && lineIndent > clsIndent && (!best || s.line > best.line)) best = { name: s.name, line: s.line };
    }
    return best?.name;
  }
  // C-like: the class/struct/impl whose braces contain the line (approximated through method owners)
  const m = [...scan.syms].reverse().find((s) => s.owner && s.kind === "method" && s.line <= line);
  const fnEnd = m ? scan.syms.find((s) => s === m) : undefined;
  void fnEnd;
  return m?.owner;
}
