import type { RExpr, RLPart, RStmt } from "./types.ts";

/**
 * Expression evaluation with (simplified) Verilog width rules. Everything is unsigned, at most 32 bits.
 *
 *  - Every node has a self-determined width `w`: literals their size (32 if unsized), signals their width,
 *    `+ - * & | ^ ~^` and `?:` the max of their operands, `<< >>` the left operand, comparisons / `!` / `&&` / `||`
 *    / reductions 1 bit, a concatenation the sum of its parts, a bit select 1, a part select its span.
 *  - The context width W of an assignment is max(width of the right side, width of the left side). Operands of
 *    `+ - * & | ^ ~ ?:` and the left operand of a shift are evaluated at W, so `{cout, sum} = a + b + cin` keeps the
 *    carry (W = 5) and `a + b` into a 4-bit target wraps (W = 4).
 *  - Operands of comparisons are evaluated at the max of the two sides; conditions, reduction operands, shift
 *    amounts, indices and concatenation parts are self-determined.
 *  Simplification: no signed arithmetic, no x/z, a dynamic bit index out of range reads 0 and writes nothing.
 */

/** Truncate a (possibly out-of-range) JS number to an unsigned `w`-bit value. */
export const mk = (v: number, w: number): number => (w >= 32 ? v >>> 0 : (v & (2 ** w - 1)) >>> 0);

const popParity = (v: number) => {
  let x = v >>> 0;
  let p = 0;
  while (x) {
    p ^= x & 1;
    x >>>= 1;
  }
  return p;
};

export function evalE(e: RExpr, W: number, vals: ArrayLike<number>): number {
  switch (e.k) {
    case "num":
      return mk(e.v, W);
    case "sig":
      return mk(vals[e.s], W);
    case "idx": {
      const i = evalE(e.i, e.i.w, vals);
      return i >= e.sw ? 0 : (vals[e.s] >>> i) & 1;
    }
    case "part":
      return mk(vals[e.s] >>> e.lsb, e.w);
    case "un": {
      switch (e.op) {
        case "~":
          return mk(~evalE(e.e, W, vals), W);
        case "-":
          return mk(-evalE(e.e, W, vals), W);
        case "+":
          return evalE(e.e, W, vals);
        case "!":
          return evalE(e.e, e.e.w, vals) === 0 ? 1 : 0;
        default: {
          const v = evalE(e.e, e.e.w, vals);
          const full = mk(0xffffffff, e.e.w);
          switch (e.op) {
            case "r&":
              return v === full ? 1 : 0;
            case "r~&":
              return v === full ? 0 : 1;
            case "r|":
              return v !== 0 ? 1 : 0;
            case "r~|":
              return v !== 0 ? 0 : 1;
            case "r^":
              return popParity(v);
            default:
              return popParity(v) ^ 1;
          }
        }
      }
    }
    case "bin": {
      switch (e.op) {
        case "&&":
          return evalE(e.l, e.l.w, vals) !== 0 && evalE(e.r, e.r.w, vals) !== 0 ? 1 : 0;
        case "||":
          return evalE(e.l, e.l.w, vals) !== 0 || evalE(e.r, e.r.w, vals) !== 0 ? 1 : 0;
        case "==":
        case "!=":
        case "<":
        case "<=":
        case ">":
        case ">=": {
          const cw = Math.max(e.l.w, e.r.w);
          const a = evalE(e.l, cw, vals);
          const b = evalE(e.r, cw, vals);
          const t = e.op === "==" ? a === b : e.op === "!=" ? a !== b : e.op === "<" ? a < b : e.op === "<=" ? a <= b : e.op === ">" ? a > b : a >= b;
          return t ? 1 : 0;
        }
        case "<<":
        case ">>": {
          const a = evalE(e.l, W, vals);
          const n = evalE(e.r, e.r.w, vals);
          if (n >= 32) return 0;
          return mk(e.op === "<<" ? a << n : a >>> n, W);
        }
        default: {
          const a = evalE(e.l, W, vals);
          const b = evalE(e.r, W, vals);
          switch (e.op) {
            case "+":
              return mk(a + b, W);
            case "-":
              return mk(a - b, W);
            case "*":
              return mk(Math.imul(a, b), W);
            case "&":
              return mk(a & b, W);
            case "|":
              return mk(a | b, W);
            case "^":
              return mk(a ^ b, W);
            default:
              return mk(~(a ^ b), W); // ~^
          }
        }
      }
    }
    case "cond":
      return evalE(e.c, e.c.w, vals) !== 0 ? evalE(e.t, W, vals) : evalE(e.f, W, vals);
    case "cat": {
      let acc = 0;
      for (const p of e.parts) acc = acc * 2 ** p.w + evalE(p, p.w, vals);
      return mk(acc, W);
    }
  }
}

/** A queued non-blocking write. */
export interface Pending {
  s: number;
  lo: number;
  w: number;
  v: number;
}

export function writeBits(vals: number[], s: number, lo: number, w: number, v: number) {
  const m = w >= 32 ? 0xffffffff : ((2 ** w - 1) << lo) >>> 0;
  vals[s] = ((vals[s] & ~m) | ((mk(v, w) << lo) & m)) >>> 0;
}

function store(parts: RLPart[], value: number, vals: number[], nba: Pending[] | null) {
  // parts[0] is the most significant piece; peel pieces off from the least significant end
  let v = value;
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    const pv = mk(v, p.w);
    v = Math.floor(v / 2 ** p.w);
    let lo = p.lo;
    if (p.dyn) {
      lo = evalE(p.dyn, p.dyn.w, vals);
      if (lo >= p.sw) continue;
    }
    if (nba) nba.push({ s: p.s, lo, w: p.w, v: pv });
    else writeBits(vals, p.s, lo, p.w, pv);
  }
}

/** Run a statement. Blocking assigns update `vals` at once; with `nba` given, non-blocking ones are queued instead. */
export function exec(s: RStmt, vals: number[], nba: Pending[] | null): void {
  switch (s.k) {
    case "assign": {
      const v = evalE(s.rhs, s.W, vals);
      store(s.parts, mk(v, s.lw), vals, s.nb ? nba : null);
      return;
    }
    case "block":
      for (const x of s.stmts) exec(x, vals, nba);
      return;
    case "if":
      if (evalE(s.c, s.c.w, vals) !== 0) exec(s.t, vals, nba);
      else if (s.e) exec(s.e, vals, nba);
      return;
    case "case": {
      let dflt: RStmt | undefined;
      for (const it of s.items) {
        if (it.labels === null) {
          dflt = it.body;
          continue;
        }
        for (const l of it.labels) {
          const cw = Math.max(s.sel.w, l.w);
          if (evalE(s.sel, cw, vals) === evalE(l, cw, vals)) {
            exec(it.body, vals, nba);
            return;
          }
        }
      }
      if (dflt) exec(dflt, vals, nba);
      return;
    }
  }
}
