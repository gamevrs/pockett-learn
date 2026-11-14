import { parse } from "./parser.ts";
import {
  CompileError,
  type CombNode,
  type Design,
  type Diag,
  type Expr,
  type Item,
  type LV,
  type RExpr,
  type RLPart,
  type RStmt,
  type SeqBlock,
  type Signal,
  type Stmt,
} from "./types.ts";
import { evalE } from "./eval.ts";

const MAX_SRC = 40000;

interface Info {
  name: string;
  width: number;
  explicitRange: boolean;
  dir?: "input" | "output";
  net?: "wire" | "reg";
  line: number;
  idx: number;
}

function lev(a: string, b: string): number {
  const d: number[] = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0];
    d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return d[b.length];
}

function bad(line: number, col: number | undefined, message: string): never {
  throw new CompileError({ line, col, message });
}

/** Parse + check a design. Returns the elaborated Design (or throws CompileError / collects into `errors`). */
export function elaborate(src: string, warnings: Diag[]): { design?: Design; errors: Diag[] } {
  if (src.length > MAX_SRC) return { errors: [{ line: 1, message: "this source is too long for the toy simulator." }] };
  let mod;
  try {
    mod = parse(src);
  } catch (e) {
    if (e instanceof CompileError) return { errors: [e.diag] };
    throw e;
  }

  const errors: Diag[] = [];
  const guard = (f: () => void) => {
    try {
      f();
    } catch (e) {
      if (e instanceof CompileError) errors.push(e.diag);
      else throw e;
    }
  };

  const syms = new Map<string, Info>();
  const order: Info[] = [];
  const params = new Map<string, { v: number; w?: number }>();
  const portNames = new Set(mod.ports.map((p) => p.name));
  const portOrder = mod.ports.map((p) => p.name);
  const ansi = mod.ansi;

  function suggest(name: string): string {
    let best = "";
    let bd = 3;
    for (const n of [...syms.keys(), ...params.keys()]) {
      const d = lev(name.toLowerCase(), n.toLowerCase());
      if (d < bd) {
        bd = d;
        best = n;
      }
    }
    return best && bd <= Math.max(1, Math.floor(name.length / 3) + 1) ? ` Did you mean \`${best}\`?` : "";
  }

  // ───────── constants (parameters, ranges) ─────────
  function constExpr(e: Expr): { v: number; w?: number } {
    const r = prep(e, true);
    return { v: evalE(r, 32, []), w: r.k === "num" && r.sized ? r.w : undefined };
  }

  function widthOf(range: [Expr, Expr] | undefined): { width: number; explicit: boolean } {
    if (!range) return { width: 1, explicit: false };
    const msb = constExpr(range[0]).v;
    const lsb = constExpr(range[1]).v;
    const at = range[0] as { line: number; col: number };
    if (lsb !== 0) bad(at.line, at.col, `this toy simulator only supports ranges that end at 0, like [${msb}:0] (not [${msb}:${lsb}]).`);
    if (msb < 0 || msb > 31) bad(at.line, at.col, `[${msb}:0] is ${msb + 1} bits wide: this toy simulator supports 1 to 32 bits.`);
    return { width: msb + 1, explicit: true };
  }

  // ───────── pass 1: declarations and parameters ─────────
  const listed = new Set<string>();
  for (const p of mod.ports) {
    if (listed.has(p.name)) errors.push({ line: p.line, col: p.col, message: `port \`${p.name}\` is listed twice.` });
    listed.add(p.name);
  }

  const declare = (it: Extract<Item, { k: "decl" }>) => {
    const { width, explicit } = widthOf(it.range);
    for (const n of it.names) {
      guard(() => {
        const old = syms.get(n.name);
        if (params.has(n.name)) bad(n.line, n.col, `\`${n.name}\` is already used as a parameter.`);
        if (old && !((old.dir && !it.dir && it.net && !old.net) || (!old.dir && it.dir && !ansi && portNames.has(n.name)))) bad(n.line, n.col, `\`${n.name}\` is declared twice.`);
        if (it.dir && !ansi && !portNames.has(n.name)) bad(n.line, n.col, `\`${n.name}\` is declared as ${it.dir === "input" ? "an input" : "an output"} but isn't in the module's port list.`);
        if (old) {
          if (explicit && old.explicitRange && old.width !== width) bad(n.line, n.col, `\`${n.name}\` is declared with two different widths (${old.width} and ${width} bits).`);
          if (explicit) {
            old.width = width;
            old.explicitRange = true;
          }
          if (it.dir) old.dir = it.dir;
          if (it.net) {
            if (old.dir === "input" && it.net === "reg") bad(n.line, n.col, "an `input` can't be a `reg`: inputs are driven from outside.");
            old.net = it.net;
          }
          return;
        }
        const info: Info = { name: n.name, width, explicitRange: explicit, dir: it.dir, net: it.net, line: n.line, idx: -1 };
        syms.set(n.name, info);
        order.push(info);
        if (n.init) {
          if (it.net === "reg") bad(n.line, n.col, "regs can't have an initial value in a declaration (real chips don't power up in a known state): drive them from a reset input instead.");
        }
      });
    }
  };

  for (const it of mod.items) {
    guard(() => {
      if (it.k === "decl") declare(it);
      else if (it.k === "param") {
        const { width, explicit } = widthOf(it.range);
        for (const d of it.defs) {
          if (syms.has(d.name) || params.has(d.name)) bad(d.line, d.col, `\`${d.name}\` is declared twice.`);
          const c = constExpr(d.value);
          const w = explicit ? width : c.w;
          params.set(d.name, { v: w !== undefined && w < 32 ? (c.v & (2 ** w - 1)) >>> 0 : c.v >>> 0, w });
        }
      }
    });
  }

  for (const p of mod.ports) {
    const s = syms.get(p.name);
    if (!s || !s.dir) errors.push({ line: p.line, col: p.col, message: `port \`${p.name}\` needs an \`input\` or \`output\` declaration in the module body.` });
  }

  // port order first, then the rest in declaration order
  const finalOrder = [...portOrder.map((n) => syms.get(n)).filter((x): x is Info => !!x), ...order.filter((i) => !portNames.has(i.name))];
  const seen = new Set<Info>();
  const infos = finalOrder.filter((i) => (seen.has(i) ? false : (seen.add(i), true)));
  infos.forEach((s, i) => (s.idx = i));
  const signals: Signal[] = infos.map((s) => ({
    name: s.name,
    width: s.width,
    kind: s.dir === "input" ? "input" : s.dir === "output" ? "output" : s.net === "reg" ? "reg" : "wire",
    isReg: s.net === "reg",
  }));

  // ───────── expressions ─────────
  function lookup(name: string, line: number, col: number): Info {
    const s = syms.get(name);
    if (!s || s.idx < 0) bad(line, col, `\`${name}\` isn't declared.${suggest(name)} Declare it with \`wire\` or \`reg\` (or as a port) first.`);
    return s;
  }

  function prep(e: Expr, isConst = false): RExpr {
    switch (e.k) {
      case "num":
        return { k: "num", v: e.v, w: e.w ?? 32, sized: e.w !== undefined };
      case "id": {
        const p = params.get(e.name);
        if (p) return { k: "num", v: p.v, w: p.w ?? 32, sized: p.w !== undefined };
        if (isConst) bad(e.line, e.col, `\`${e.name}\` isn't a constant: only numbers and parameters can be used here.`);
        const s = lookup(e.name, e.line, e.col);
        return { k: "sig", s: s.idx, w: s.width };
      }
      case "idx": {
        if (isConst) bad(e.line, e.col, "bit selects aren't constants.");
        const s = lookup(e.name, e.line, e.col);
        const i = prep(e.i);
        if (i.k === "num" && i.v >= s.width) bad(e.line, e.col, `\`${e.name}[${i.v}]\` is out of range: \`${e.name}\` is only ${s.width} bit${s.width === 1 ? "" : "s"} wide (bits ${s.width - 1} down to 0).`);
        return { k: "idx", s: s.idx, i, w: 1, sw: s.width };
      }
      case "part": {
        if (isConst) bad(e.line, e.col, "part selects aren't constants.");
        const s = lookup(e.name, e.line, e.col);
        const msb = constExpr(e.msb).v;
        const lsb = constExpr(e.lsb).v;
        if (msb < lsb) bad(e.line, e.col, `\`${e.name}[${msb}:${lsb}]\`: write the larger bit number first, like [${lsb}:${msb}].`);
        if (msb >= s.width) bad(e.line, e.col, `\`${e.name}[${msb}:${lsb}]\` is out of range: \`${e.name}\` is only ${s.width} bit${s.width === 1 ? "" : "s"} wide (bits ${s.width - 1} down to 0).`);
        return { k: "part", s: s.idx, lsb, w: msb - lsb + 1 };
      }
      case "un": {
        const x = prep(e.e, isConst);
        const reduce = ["&", "|", "^", "~&", "~|", "~^"].includes(e.op);
        return { k: "un", op: reduce ? "r" + e.op : e.op, e: x, w: e.op === "!" || reduce ? 1 : x.w };
      }
      case "bin": {
        const l = prep(e.l, isConst);
        const r = prep(e.r, isConst);
        const op = e.op;
        const w = ["==", "!=", "<", "<=", ">", ">=", "&&", "||"].includes(op) ? 1 : op === "<<" || op === ">>" ? l.w : Math.max(l.w, r.w);
        return { k: "bin", op, l, r, w };
      }
      case "cond": {
        const c = prep(e.c, isConst);
        const t = prep(e.t, isConst);
        const f = prep(e.f, isConst);
        return { k: "cond", c, t, f, w: Math.max(t.w, f.w) };
      }
      case "cat":
      case "rep": {
        const base = e.parts.map((p) => prep(p, isConst));
        for (let i = 0; i < base.length; i++) {
          const b = base[i];
          if (b.k === "num" && !b.sized) {
            const src = e.parts[i];
            bad(src.line, src.col, "an unsized number can't go inside `{ }`: Verilog wouldn't know how many bits it takes. Give it a width, like 1'b0 or 4'd3.");
          }
        }
        let n = 1;
        if (e.k === "rep") {
          n = constExpr(e.n).v;
          if (n < 1) bad(e.line, e.col, "a replication count must be at least 1.");
        }
        const one = base.reduce((a, p) => a + p.w, 0);
        if (one * n > 32) bad(e.line, e.col, `this concatenation is ${one * n} bits wide: this toy simulator supports at most 32 bits.`);
        const parts: RExpr[] = [];
        for (let i = 0; i < n; i++) parts.push(...base);
        return { k: "cat", parts, w: one * n };
      }
    }
  }

  // ───────── statements ─────────
  type Ctx = { kind: "assign" | "comb" | "seq"; id: number; reads: Set<number>; writes: Set<number>; usesNb: boolean; usesBlocking: boolean; firstNb?: number; firstBlocking?: number };

  const assignBits = new Map<number, number>(); // continuous-assign bit masks per signal
  const alwaysOwner = new Map<number, number>(); // signal -> always block id

  function collectReads(r: RExpr, out: Set<number>) {
    switch (r.k) {
      case "sig":
      case "part":
        out.add(r.s);
        break;
      case "idx":
        out.add(r.s);
        collectReads(r.i, out);
        break;
      case "un":
        collectReads(r.e, out);
        break;
      case "bin":
        collectReads(r.l, out);
        collectReads(r.r, out);
        break;
      case "cond":
        collectReads(r.c, out);
        collectReads(r.t, out);
        collectReads(r.f, out);
        break;
      case "cat":
        r.parts.forEach((p) => collectReads(p, out));
        break;
      default:
        break;
    }
  }

  function prepLV(lv: LV, ctx: Ctx, line: number): { parts: RLPart[]; lw: number } {
    const parts: RLPart[] = [];
    for (const p of lv.parts) {
      if (params.has(p.name)) bad(p.line, p.col, `\`${p.name}\` is a constant (parameter), not a signal, so it can't be assigned.`);
      const s = lookup(p.name, p.line, p.col);
      let lo = 0;
      let w = s.width;
      let dyn: RExpr | undefined;
      if (p.range) {
        const msb = constExpr(p.range[0]).v;
        const lsb = constExpr(p.range[1]).v;
        if (msb < lsb || msb >= s.width) bad(p.line, p.col, `\`${p.name}[${msb}:${lsb}]\` is out of range: \`${p.name}\` is ${s.width} bit${s.width === 1 ? "" : "s"} wide.`);
        lo = lsb;
        w = msb - lsb + 1;
      } else if (p.idx) {
        const i = prep(p.idx);
        w = 1;
        if (i.k === "num") {
          if (i.v >= s.width) bad(p.line, p.col, `\`${p.name}[${i.v}]\` is out of range: \`${p.name}\` is only ${s.width} bit${s.width === 1 ? "" : "s"} wide.`);
          lo = i.v;
        } else {
          dyn = i;
          collectReads(i, ctx.reads);
        }
      }
      // driver rules
      if (s.dir === "input") bad(p.line, p.col, `\`${p.name}\` is an input: the module can read it but can't drive it.`);
      if (ctx.kind === "assign") {
        if (s.net === "reg")
          bad(p.line, p.col, `\`${p.name}\` is a \`reg\`, and \`assign\` can only drive a \`wire\` (or an output that isn't \`reg\`). A reg is assigned inside an always block; or make \`${p.name}\` a wire.`);
        const mask = dyn ? (w >= 32 ? 0xffffffff : 2 ** s.width - 1) : ((w >= 32 ? 0xffffffff : 2 ** w - 1) * 2 ** lo) >>> 0;
        const prev = assignBits.get(s.idx) ?? 0;
        if ((prev & mask) !== 0) bad(p.line, p.col, `\`${p.name}\` is driven by two assigns: a wire can only have one driver (two drivers would fight).`);
        assignBits.set(s.idx, (prev | mask) >>> 0);
      } else {
        if (s.net !== "reg")
          bad(p.line, p.col, `\`${p.name}\` is a wire${s.dir === "output" ? " (an output is a wire unless you write `output reg`)" : ""}, and an always block can only assign a \`reg\`. Declare it \`reg\`, or drive it with \`assign\` outside the block.`);
        const own = alwaysOwner.get(s.idx);
        if (own !== undefined && own !== ctx.id) bad(p.line, p.col, `\`${p.name}\` is driven by two always blocks: a reg can only be assigned in one block.`);
        alwaysOwner.set(s.idx, ctx.id);
      }
      ctx.writes.add(s.idx);
      parts.push({ s: s.idx, lo, w, dyn, sw: s.width });
    }
    const lw = parts.reduce((a, p) => a + p.w, 0);
    if (lw > 32) bad(line, undefined, "this concatenation is wider than 32 bits.");
    return { parts, lw };
  }

  function prepStmt(st: Stmt, ctx: Ctx): RStmt {
    switch (st.k) {
      case "nop":
        return { k: "block", stmts: [] };
      case "block": {
        const stmts: RStmt[] = [];
        for (const s of st.stmts) guard(() => stmts.push(prepStmt(s, ctx)));
        return { k: "block", stmts };
      }
      case "assign": {
        const rhs = prep(st.rhs);
        collectReads(rhs, ctx.reads);
        const { parts, lw } = prepLV(st.lv, ctx, st.line);
        if (st.nb) {
          ctx.usesNb = true;
          ctx.firstNb ??= st.line;
        } else {
          ctx.usesBlocking = true;
          ctx.firstBlocking ??= st.line;
        }
        return { k: "assign", parts, lw, rhs, W: Math.max(rhs.w, lw), nb: st.nb };
      }
      case "if": {
        const c = prep(st.c);
        collectReads(c, ctx.reads);
        return { k: "if", c, t: prepStmt(st.t, ctx), e: st.e ? prepStmt(st.e, ctx) : undefined };
      }
      case "case": {
        const sel = prep(st.sel);
        collectReads(sel, ctx.reads);
        let defaults = 0;
        const items = st.items.map((it) => {
          if (it.labels === null && ++defaults > 1) bad(st.line, st.col, "a `case` can only have one `default`.");
          const labels = it.labels ? it.labels.map((l) => prep(l)) : null;
          labels?.forEach((l) => collectReads(l, ctx.reads));
          return { labels, body: prepStmt(it.body, ctx) };
        });
        return { k: "case", sel, items };
      }
    }
  }

  /** Signals assigned on every path through a statement (for latch detection). */
  function assignedAll(s: RStmt): Set<number> {
    switch (s.k) {
      case "assign":
        return new Set(s.parts.map((p) => p.s));
      case "block": {
        const out = new Set<number>();
        s.stmts.forEach((x) => assignedAll(x).forEach((v) => out.add(v)));
        return out;
      }
      case "if": {
        if (!s.e) return new Set();
        const a = assignedAll(s.t);
        const b = assignedAll(s.e);
        return new Set([...a].filter((x) => b.has(x)));
      }
      case "case": {
        if (!s.items.some((i) => i.labels === null)) return new Set();
        const sets = s.items.map((i) => assignedAll(i.body));
        return new Set([...sets[0]].filter((x) => sets.every((q) => q.has(x))));
      }
    }
  }

  // ───────── pass 2: assigns and always blocks ─────────
  const comb: CombNode[] = [];
  const seq: SeqBlock[] = [];
  let blockId = 0;
  let clock: string | undefined;

  const run = (items: Item[]) => {
    for (const it of items) {
      guard(() => {
        if (it.k === "assign") {
          const ctx: Ctx = { kind: "assign", id: blockId++, reads: new Set(), writes: new Set(), usesNb: false, usesBlocking: false };
          const rhs = prep(it.rhs);
          collectReads(rhs, ctx.reads);
          const { parts, lw } = prepLV(it.lv, ctx, it.line);
          comb.push({ kind: "assign", line: it.line, reads: [...ctx.reads], writes: [...ctx.writes], body: { k: "assign", parts, lw, rhs, W: Math.max(rhs.w, lw), nb: false } });
        } else if (it.k === "decl") {
          for (const n of it.names) {
            if (!n.init) continue;
            if (it.net === "reg") continue; // already reported
            const ctx: Ctx = { kind: "assign", id: blockId++, reads: new Set(), writes: new Set(), usesNb: false, usesBlocking: false };
            const rhs = prep(n.init);
            collectReads(rhs, ctx.reads);
            const { parts, lw } = prepLV({ parts: [{ name: n.name, line: n.line, col: n.col }], line: n.line, col: n.col }, ctx, n.line);
            comb.push({ kind: "assign", line: n.line, reads: [...ctx.reads], writes: [...ctx.writes], body: { k: "assign", parts, lw, rhs, W: Math.max(rhs.w, lw), nb: false } });
          }
        } else if (it.k === "always") {
          const isSeq = !it.star;
          const ctx: Ctx = { kind: isSeq ? "seq" : "comb", id: blockId++, reads: new Set(), writes: new Set(), usesNb: false, usesBlocking: false };
          const body = prepStmt(it.body, ctx);
          if (isSeq) {
            const triggers = it.edges.map((e) => {
              const s = lookup(e.sig, e.line, e.col);
              if (s.dir !== "input") bad(e.line, e.col, `\`${e.edge === "pos" ? "posedge" : "negedge"} ${e.sig}\`: this toy simulator only supports edges on input ports (clock/reset), not on internal signals.`);
              if (s.width !== 1) bad(e.line, e.col, `\`${e.sig}\` is ${s.width} bits wide: an edge trigger needs a 1-bit signal.`);
              return { sig: s.idx, edge: e.edge };
            });
            clock ??= it.edges.find((e) => e.edge === "pos")?.sig ?? it.edges[0].sig;
            seq.push({ line: it.line, triggers, body });
            if (ctx.usesBlocking && !ctx.usesNb)
              warnings.push({ line: ctx.firstBlocking ?? it.line, message: "this clocked block uses blocking `=`. It works, but good practice is non-blocking `<=` for registers (it avoids order-dependent surprises)." });
            else if (ctx.usesBlocking && ctx.usesNb) warnings.push({ line: ctx.firstBlocking ?? it.line, message: "this clocked block mixes `=` and `<=`. Mixing styles makes results depend on statement order; prefer `<=` for registers." });
          } else {
            if (ctx.usesNb) warnings.push({ line: ctx.firstNb ?? it.line, message: "non-blocking `<=` in a combinational always block: use `=` here (`<=` is for clocked registers). This toy simulator treats it like `=`." });
            const all = assignedAll(body);
            for (const w of ctx.writes) {
              if (!all.has(w)) warnings.push({ line: it.line, message: `\`${signals[w].name}\` isn't assigned on every path through this combinational always block, so real hardware would need a latch (a memory element) to remember it. Add an \`else\` or a \`default\`.` });
            }
            comb.push({ kind: "always", line: it.line, reads: [...ctx.reads].filter((r) => !ctx.writes.has(r)), writes: [...ctx.writes], body });
          }
        }
      });
    }
  };
  run(mod.items);
  if (errors.length) return { errors: errors.sort((a, b) => a.line - b.line) };

  // ───────── combinational ordering and loop detection ─────────
  const writer = new Map<number, number[]>();
  comb.forEach((n, i) => n.writes.forEach((w) => writer.set(w, [...(writer.get(w) ?? []), i])));
  const deps: number[][] = comb.map((n) => {
    const d = new Set<number>();
    n.reads.forEach((r) => writer.get(r)?.forEach((w) => d.add(w)));
    return [...d];
  });
  const state: number[] = comb.map(() => 0);
  const sorted: number[] = [];
  let cycle: number[] | null = null;
  const stack: number[] = [];
  const visit = (i: number) => {
    if (cycle) return;
    if (state[i] === 2) return;
    if (state[i] === 1) {
      cycle = stack.slice(stack.indexOf(i));
      return;
    }
    state[i] = 1;
    stack.push(i);
    for (const d of deps[i]) visit(d);
    stack.pop();
    state[i] = 2;
    sorted.push(i);
  };
  for (let i = 0; i < comb.length && !cycle; i++) visit(i);
  if (cycle) {
    const cyc: number[] = cycle;
    const names: string[] = [];
    for (const ni of cyc) for (const w of comb[ni].writes) if (!names.includes(signals[w].name)) names.push(signals[w].name);
    const line = Math.min(...cyc.map((i) => comb[i].line));
    return { errors: [{ line, message: `combinational loop through ${names.join(", ")}: the values never settle (the output feeds back into its own input with no register in the loop).` }] };
  }

  return { design: { name: mod.name, signals, comb: sorted.map((i) => comb[i]), seq, clock } , errors: [] };
}
