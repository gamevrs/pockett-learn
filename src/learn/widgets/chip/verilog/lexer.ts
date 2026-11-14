import { CompileError } from "./types.ts";

export interface Tok {
  t: "id" | "num" | "sym" | "sys" | "str" | "eof";
  s: string;
  line: number;
  col: number;
  endLine: number;
  endCol: number;
  /** numeric value and (for sized literals) width */
  v?: number;
  w?: number;
}

const SYM3 = ["===", "!==", "<<<", ">>>"];
const SYM2 = ["<=", ">=", "==", "!=", "&&", "||", "<<", ">>", "~&", "~|", "~^", "^~", "+:", "-:", "**"];

function err(line: number, col: number, message: string): never {
  throw new CompileError({ line, col, message });
}

const MAXV = 0xffffffff;

/** Turn source text into tokens. Throws CompileError on the first problem. */
export function lex(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  let line = 1;
  let col = 1;
  const n = src.length;
  const adv = () => {
    if (src[i] === "\n") {
      line++;
      col = 1;
    } else col++;
    i++;
  };
  const to = (j: number) => {
    while (i < j) adv();
  };
  const push = (t: Tok["t"], s: string, l: number, c: number, extra?: { v?: number; w?: number }) => toks.push({ t, s, line: l, col: c, endLine: line, endCol: col, ...extra });

  while (i < n) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\r" || c === "\n") {
      adv();
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < n && src[i] !== "\n") adv();
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const l0 = line;
      const c0 = col;
      adv();
      adv();
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) adv();
      if (i >= n) err(l0, c0, "this `/*` comment is never closed (add `*/`).");
      adv();
      adv();
      continue;
    }
    const l0 = line;
    const c0 = col;
    if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j++;
      const s = src.slice(i, j);
      to(j);
      push("id", s, l0, c0);
      continue;
    }
    if (c === "$") {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j++;
      const s = src.slice(i, j);
      to(j);
      push("sys", s, l0, c0);
      continue;
    }
    if (c === "`") err(l0, c0, "compiler directives like `timescale, `define and `include aren't supported in this toy simulator.");
    if (c === '"') {
      let j = i + 1;
      while (j < n && src[j] !== '"' && src[j] !== "\n") j++;
      if (src[j] !== '"') err(l0, c0, "this string is never closed (add a closing quote).");
      j++;
      const s = src.slice(i, j);
      to(j);
      push("str", s, l0, c0);
      continue;
    }
    if (/[0-9]/.test(c) || c === "'") {
      let j = i;
      while (j < n && /[0-9_]/.test(src[j])) j++;
      const sizeStr = src.slice(i, j).replace(/_/g, "");
      if (src[j] === "'") {
        let k = j + 1;
        if (src[k] === "s" || src[k] === "S") err(l0, c0, "signed numbers aren't supported: this toy simulator is unsigned only.");
        const base = src[k];
        if (!base || !/[bBoOdDhH]/.test(base)) err(l0, c0, "expected a base letter (b, o, d or h) after the `'`, like 4'b1010 or 8'hFF.");
        k++;
        const vs = k;
        while (k < n && /[0-9a-zA-Z_?]/.test(src[k])) k++;
        const digits = src.slice(vs, k).replace(/_/g, "");
        if (digits === "") err(l0, c0, "this number has no digits after its base letter.");
        if (/[xXzZ?]/.test(digits)) err(l0, c0, "this toy simulator has no x/z values (only 0 and 1).");
        const radix = ({ b: 2, o: 8, d: 10, h: 16 } as const)[base.toLowerCase() as "b" | "o" | "d" | "h"];
        const okRe = { 2: /^[01]+$/, 8: /^[0-7]+$/, 10: /^[0-9]+$/, 16: /^[0-9a-fA-F]+$/ }[radix];
        if (!okRe.test(digits)) err(l0, c0, `\`${digits}\` isn't a valid base-${radix} number.`);
        let w: number | undefined;
        if (sizeStr !== "") {
          w = parseInt(sizeStr, 10);
          if (w < 1) err(l0, c0, "a number's width must be at least 1 bit.");
          if (w > 32) err(l0, c0, `${w}-bit numbers are too wide: this toy simulator supports at most 32 bits.`);
        }
        let v = parseInt(digits, radix);
        if (!(v <= MAXV)) err(l0, c0, "this number doesn't fit in 32 bits (the toy simulator's maximum width).");
        if (w !== undefined && w < 32) v = (v & (2 ** w - 1)) >>> 0;
        to(k);
        push("num", "number", l0, c0, { v, w });
        continue;
      }
      if (sizeStr === "") err(l0, c0, "unexpected `'`.");
      const v = parseInt(sizeStr, 10);
      if (!(v <= MAXV)) err(l0, c0, "this number doesn't fit in 32 bits (the toy simulator's maximum width).");
      to(j);
      if (src[i] === ".") err(line, col, "fractional numbers aren't supported in Verilog logic.");
      push("num", "number", l0, c0, { v });
      continue;
    }
    const s3 = src.slice(i, i + 3);
    const s2 = src.slice(i, i + 2);
    let s: string;
    if (SYM3.includes(s3)) s = s3;
    else if (SYM2.includes(s2)) s = s2;
    else if ("()[]{}<>;:,.=+-*/%&|^~!?@#".includes(c)) s = c;
    else err(l0, c0, `unexpected character \`${c}\`.`);
    to(i + s.length);
    push("sym", s, l0, c0);
  }
  toks.push({ t: "eof", s: "end of file", line, col, endLine: line, endCol: col });
  return toks;
}
