import { lex, type Tok } from "./lexer.ts";
import { CompileError, type Dir, type Expr, type Item, type LPart, type LV, type Module, type Range, type Stmt } from "./types.ts";

/** Words that can't be used as signal names. */
const RESERVED = new Set([
  "module", "endmodule", "input", "output", "inout", "wire", "reg", "assign", "always", "always_ff", "always_comb", "always_latch", "initial",
  "begin", "end", "if", "else", "case", "casez", "casex", "endcase", "default", "posedge", "negedge", "or", "parameter", "localparam",
  "integer", "real", "time", "for", "while", "repeat", "forever", "generate", "endgenerate", "genvar", "function", "endfunction", "task",
  "endtask", "signed", "unsigned", "logic", "bit", "defparam", "specify", "fork", "join", "wait", "disable", "force", "release", "deassign",
  "tri", "supply0", "supply1", "wand", "wor", "do", "int", "byte", "enum", "struct", "typedef", "interface", "package", "class",
]);

const UNSUPPORTED: Record<string, string> = {
  initial: "this toy simulator doesn't support `initial` blocks (they're for simulation; most ASIC flows ignore them, see the 'synthesisable?' note). Use a reset input instead.",
  for: "loops aren't supported here: hardware doesn't loop, a `for` in synthesisable code just copies the logic several times. Write the copies out.",
  while: "loops aren't supported here: hardware doesn't loop. Write the logic out.",
  repeat: "`repeat` loops aren't supported in this toy simulator.",
  forever: "`forever` loops aren't supported in this toy simulator.",
  do: "loops aren't supported in this toy simulator.",
  generate: "`generate` blocks aren't supported in this toy simulator.",
  endgenerate: "`generate` blocks aren't supported in this toy simulator.",
  genvar: "`genvar` and `generate` aren't supported in this toy simulator.",
  function: "`function` isn't supported in this toy simulator: write the logic inline.",
  task: "`task` isn't supported in this toy simulator: write the logic inline.",
  integer: "`integer` isn't supported in this toy simulator: declare a `reg [N:0]` of the width you need.",
  real: "`real` numbers aren't supported (hardware logic is whole-number bits).",
  time: "`time` isn't supported in this toy simulator.",
  inout: "`inout` (bidirectional) ports aren't supported in this toy simulator.",
  signed: "`signed` isn't supported: this toy simulator treats every value as unsigned.",
  logic: "SystemVerilog `logic` isn't supported: use `wire` or `reg`.",
  casez: "`casez` isn't supported (it needs don't-care bits); use `case`.",
  casex: "`casex` isn't supported (it needs x/z values); use `case`.",
  always_latch: "`always_latch` isn't supported in this toy simulator.",
  defparam: "`defparam` isn't supported (one module only).",
  fork: "`fork`/`join` are simulation-only and aren't supported.",
  wait: "`wait` is simulation-only and isn't supported.",
  force: "`force` is simulation-only and isn't supported.",
  specify: "`specify` blocks aren't supported.",
};

const PREC: Record<string, number> = {
  "||": 1, "&&": 2, "|": 3, "^": 4, "~^": 4, "^~": 4, "&": 5, "==": 6, "!=": 6, "===": 6, "!==": 6,
  "<": 7, "<=": 7, ">": 7, ">=": 7, "<<": 8, ">>": 8, "<<<": 8, ">>>": 8, "+": 9, "-": 9, "*": 10, "/": 10, "%": 10, "**": 11,
};

const MAX_DEPTH = 120;

class Parser {
  toks: Tok[];
  p = 0;
  depth = 0;
  constructor(toks: Tok[]) {
    this.toks = toks;
  }

  get cur(): Tok {
    return this.toks[this.p];
  }
  get prev(): Tok {
    return this.toks[Math.max(0, this.p - 1)];
  }
  peek(k = 1): Tok {
    return this.toks[Math.min(this.toks.length - 1, this.p + k)];
  }
  next(): Tok {
    const t = this.cur;
    if (t.t !== "eof") this.p++;
    return t;
  }

  fail(t: Tok, message: string): never {
    throw new CompileError({ line: t.line, col: t.col, message });
  }
  failAfterPrev(message: string): never {
    const t = this.prev;
    throw new CompileError({ line: t.endLine, col: t.endCol, message });
  }

  isSym(s: string, t: Tok = this.cur) {
    return t.t === "sym" && t.s === s;
  }
  isKw(s: string, t: Tok = this.cur) {
    return t.t === "id" && t.s === s;
  }
  desc(t: Tok) {
    return t.t === "eof" ? "the end of the file" : t.t === "num" ? "a number" : `\`${t.s}\``;
  }

  /** Eat symbol `s` or fail with "expected `s` <ctx>". Missing `;`/`)`/`]`/`}` are reported at the end of the previous token. */
  expect(s: string, ctx: string) {
    if (this.isSym(s)) return this.next();
    const msg = `expected \`${s}\` ${ctx}`;
    if ((s === ";" || s === ")" || s === "]" || s === "}") && this.p > 0) this.failAfterPrev(msg);
    this.fail(this.cur, `${msg} (found ${this.desc(this.cur)}).`);
  }
  expectKw(s: string, ctx: string) {
    if (this.isKw(s)) return this.next();
    this.fail(this.cur, `expected \`${s}\` ${ctx} (found ${this.desc(this.cur)}).`);
  }

  /** Throws a friendly error when `t` is a keyword/system token this simulator doesn't support. */
  unsupported(t: Tok) {
    if (t.t === "sys") this.fail(t, `this toy simulator doesn't support \`${t.s}\` or any other \`$\` system task: read values off the waveform instead.`);
    if (t.t === "sym" && t.s === "#") this.fail(t, "delays like `#10` are simulation-only and aren't supported: this toy simulator moves one clock cycle per step.");
    if (t.t === "str") this.fail(t, "strings aren't supported in this toy simulator (they're only used by `$display`).");
    if (t.t === "id" && Object.prototype.hasOwnProperty.call(UNSUPPORTED, t.s)) this.fail(t, UNSUPPORTED[t.s]);
    if (t.t === "id" && t.s === "module") this.fail(t, "this toy simulator supports one module only (no module instantiation or second module).");
  }

  ident(what: string): Tok {
    const t = this.cur;
    this.unsupported(t);
    if (t.t !== "id") this.fail(t, `expected ${what} (found ${this.desc(t)}).`);
    if (RESERVED.has(t.s)) this.fail(t, `\`${t.s}\` is a Verilog keyword, so it can't be used as ${what}.`);
    this.p++;
    return t;
  }

  // ───────────────────────────── module ─────────────────────────────

  parseModule(): Module {
    const m = this.cur;
    if (!this.isKw("module")) {
      this.unsupported(m);
      this.fail(m, "expected the design to start with `module name(...);`.");
    }
    this.next();
    const nameTok = this.ident("a module name");
    const items: Item[] = [];
    const ports: Module["ports"] = [];
    let ansiStyle = false;
    if (this.isSym("#")) this.fail(this.cur, "module parameters in the header (`#(...)`) aren't supported: use `parameter` inside the module.");
    if (this.isSym("(")) {
      this.next();
      if (!this.isSym(")")) {
        const ansi = this.cur.t === "id" && (this.cur.s === "input" || this.cur.s === "output" || this.cur.s === "inout");
        ansiStyle = ansi;
        if (ansi) this.parseAnsiPorts(items, ports);
        else {
          for (;;) {
            const t = this.ident("a port name");
            ports.push({ name: t.s, line: t.line, col: t.col });
            if (this.isSym(",")) this.next();
            else break;
          }
        }
      }
      this.expect(")", "to close the port list");
    }
    this.expect(";", "after the module header");
    for (;;) {
      const t = this.cur;
      if (t.t === "eof") this.fail(t, "expected `endmodule` to finish the module (found the end of the file).");
      if (this.isKw("endmodule")) {
        this.next();
        break;
      }
      items.push(this.parseItem());
    }
    if (this.cur.t !== "eof") {
      if (this.isKw("module")) this.fail(this.cur, "this toy simulator supports one module only.");
      this.fail(this.cur, `unexpected ${this.desc(this.cur)} after \`endmodule\`.`);
    }
    return { name: nameTok.s, ansi: ansiStyle, ports, items, line: m.line, col: m.col };
  }

  parseAnsiPorts(items: Item[], ports: Module["ports"]) {
    let dir: Dir | undefined;
    let net: "wire" | "reg" | undefined;
    let range: Range | undefined;
    for (;;) {
      const t = this.cur;
      if (this.isKw("input") || this.isKw("output") || this.isKw("inout")) {
        this.unsupported(t);
        dir = t.s as Dir;
        this.next();
        net = undefined;
        range = undefined;
        if (this.isKw("wire") || this.isKw("reg")) {
          net = this.next().s as "wire" | "reg";
        }
        if (dir === "input" && net === "reg") this.fail(t, "an `input` can't be a `reg`: inputs are driven from outside.");
        this.unsupported(this.cur);
        if (this.isSym("[")) range = this.parseRange();
      } else if (!dir) {
        this.fail(t, "expected `input` or `output` here.");
      }
      const n = this.ident("a port name");
      ports.push({ name: n.s, line: n.line, col: n.col });
      items.push({ k: "decl", dir, net, range, names: [{ name: n.s, line: n.line, col: n.col }], line: n.line, col: n.col });
      if (this.isSym(",")) this.next();
      else break;
    }
  }

  parseRange(): Range {
    this.expect("[", "to start a range");
    const a = this.parseExpr();
    if (!this.isSym(":")) this.fail(this.cur, `expected \`:\` in the range like [3:0] (found ${this.desc(this.cur)}).`);
    this.next();
    const b = this.parseExpr();
    this.expect("]", "to close the range");
    return [a, b];
  }

  parseItem(): Item {
    const t = this.cur;
    this.unsupported(t);
    if (t.t !== "id") this.fail(t, `unexpected ${this.desc(t)} in the module body.`);
    switch (t.s) {
      case "input":
      case "output":
      case "wire":
      case "reg":
        return this.parseDecl();
      case "parameter":
      case "localparam":
        return this.parseParam();
      case "assign": {
        this.next();
        this.unsupported(this.cur);
        const lv = this.parseLV();
        if (!this.isSym("=")) this.fail(this.cur, `expected \`=\` in the assign (found ${this.desc(this.cur)}).`);
        this.next();
        const rhs = this.parseExpr();
        this.expect(";", "after the assign");
        return { k: "assign", lv, rhs, line: t.line, col: t.col };
      }
      case "always":
      case "always_ff":
      case "always_comb":
        return this.parseAlways();
      case "endmodule":
        this.fail(t, "unexpected `endmodule`.");
        break;
      default:
        break;
    }
    // `foo u1 (...)` or `and g1 (...)`: an instantiation.
    if (!RESERVED.has(t.s) && (this.peek().t === "id" || this.isSym("#", this.peek()))) {
      this.fail(t, `\`${t.s}\` looks like a module instantiation. This toy simulator supports one module only (no sub-modules or gate primitives).`);
    }
    this.fail(t, `didn't expect \`${t.s}\` here: a module body holds declarations, \`assign\` statements and \`always\` blocks.`);
  }

  parseDecl(): Item {
    const t = this.next();
    let dir: Dir | undefined;
    let net: "wire" | "reg" | undefined;
    if (t.s === "input" || t.s === "output") dir = t.s;
    else net = t.s as "wire" | "reg";
    if (dir && (this.isKw("wire") || this.isKw("reg"))) net = this.next().s as "wire" | "reg";
    if (dir === "input" && net === "reg") this.fail(t, "an `input` can't be a `reg`: inputs are driven from outside.");
    this.unsupported(this.cur);
    let range: Range | undefined;
    if (this.isSym("[")) range = this.parseRange();
    const names: { name: string; line: number; col: number; init?: Expr }[] = [];
    for (;;) {
      const n = this.ident("a signal name");
      let init: Expr | undefined;
      if (this.isSym("=")) {
        this.next();
        init = this.parseExpr();
      } else if (this.isSym("[")) {
        this.fail(this.cur, "arrays (memories) aren't supported in this toy simulator.");
      }
      names.push({ name: n.s, line: n.line, col: n.col, init });
      if (this.isSym(",")) this.next();
      else break;
    }
    this.expect(";", `after the ${t.s} declaration`);
    return { k: "decl", dir, net, range, names, line: t.line, col: t.col };
  }

  parseParam(): Item {
    const t = this.next();
    this.unsupported(this.cur);
    let range: Range | undefined;
    if (this.isSym("[")) range = this.parseRange();
    const defs: { name: string; value: Expr; line: number; col: number }[] = [];
    for (;;) {
      const n = this.ident("a constant name");
      if (!this.isSym("=")) this.fail(this.cur, `expected \`=\` and a value for \`${n.s}\` (found ${this.desc(this.cur)}).`);
      this.next();
      defs.push({ name: n.s, value: this.parseExpr(), line: n.line, col: n.col });
      if (this.isSym(",")) this.next();
      else break;
    }
    this.expect(";", `after the ${t.s}`);
    return { k: "param", range, defs, line: t.line, col: t.col };
  }

  parseAlways(): Item {
    const t = this.next();
    let star = false;
    const edges: { edge: "pos" | "neg"; sig: string; line: number; col: number }[] = [];
    if (t.s === "always_comb") {
      star = true;
    } else {
      this.unsupported(this.cur);
      if (!this.isSym("@")) this.fail(this.cur, `expected \`@(...)\` after \`${t.s}\`, like \`always @(posedge clk)\` or \`always @*\` (found ${this.desc(this.cur)}).`);
      this.next();
      if (this.isSym("*")) {
        this.next();
        star = true;
      } else {
        this.expect("(", "after `@`");
        if (this.isSym("*")) {
          this.next();
          star = true;
        } else {
          let levels = 0;
          for (;;) {
            let edge: "pos" | "neg" | undefined;
            if (this.isKw("posedge")) {
              this.next();
              edge = "pos";
            } else if (this.isKw("negedge")) {
              this.next();
              edge = "neg";
            }
            const n = this.ident("a signal name");
            if (edge) edges.push({ edge, sig: n.s, line: n.line, col: n.col });
            else levels++;
            if (this.isKw("or") || this.isSym(",")) this.next();
            else break;
          }
          if (edges.length && levels) this.fail(t, "an always block can't mix edges (posedge/negedge) with plain signals in its sensitivity list.");
          if (!edges.length) star = true;
        }
        this.expect(")", "to close the sensitivity list");
      }
    }
    if (t.s === "always_ff" && !edges.length) this.fail(t, "`always_ff` needs an edge, like `always_ff @(posedge clk)`.");
    const body = this.parseStmt();
    return { k: "always", star, edges, body, kw: t.s, line: t.line, col: t.col };
  }

  // ───────────────────────────── statements ─────────────────────────────

  parseStmt(): Stmt {
    const t = this.cur;
    if (++this.depth > MAX_DEPTH) this.fail(t, "this is nested too deeply for the toy simulator.");
    try {
      this.unsupported(t);
      if (this.isSym(";")) {
        this.next();
        return { k: "nop", line: t.line, col: t.col };
      }
      if (t.t === "id") {
        switch (t.s) {
          case "begin": {
            this.next();
            if (this.isSym(":")) {
              this.next();
              this.ident("a block name");
            }
            const stmts: Stmt[] = [];
            while (!this.isKw("end")) {
              if (this.cur.t === "eof") this.fail(this.cur, `expected \`end\` to close the \`begin\` on line ${t.line} (found the end of the file).`);
              if (this.isKw("endmodule")) this.fail(this.cur, `expected \`end\` to close the \`begin\` on line ${t.line} (found \`endmodule\`).`);
              stmts.push(this.parseStmt());
            }
            this.next();
            return { k: "block", stmts, line: t.line, col: t.col };
          }
          case "if": {
            this.next();
            this.expect("(", "after `if`");
            const c = this.parseExpr();
            this.expect(")", "to close the `if` condition");
            const th = this.parseStmt();
            let e: Stmt | undefined;
            if (this.isKw("else")) {
              this.next();
              e = this.parseStmt();
            }
            return { k: "if", c, t: th, e, line: t.line, col: t.col };
          }
          case "case": {
            this.next();
            this.expect("(", "after `case`");
            const sel = this.parseExpr();
            this.expect(")", "to close the `case` expression");
            const items: { labels: Expr[] | null; body: Stmt }[] = [];
            while (!this.isKw("endcase")) {
              if (this.cur.t === "eof" || this.isKw("endmodule") || this.isKw("end")) this.fail(this.cur, `expected \`endcase\` to close the \`case\` on line ${t.line}.`);
              if (this.isKw("default")) {
                this.next();
                if (this.isSym(":")) this.next();
                items.push({ labels: null, body: this.parseStmt() });
              } else {
                const labels = [this.parseExpr()];
                while (this.isSym(",")) {
                  this.next();
                  labels.push(this.parseExpr());
                }
                if (!this.isSym(":")) this.fail(this.cur, `expected \`:\` after the case value (found ${this.desc(this.cur)}).`);
                this.next();
                items.push({ labels, body: this.parseStmt() });
              }
            }
            this.next();
            return { k: "case", sel, items, line: t.line, col: t.col };
          }
          case "else":
            this.fail(t, "`else` without a matching `if` (check the `;` before it: `if (c) x = 1; else ...` is fine, but a stray `;` or `end` isn't).");
            break;
          case "end":
            this.fail(t, "`end` without a matching `begin`.");
            break;
          case "assign":
            this.fail(t, "`assign` can't be used inside an always block: write `y = ...;` (or `y <= ...;`) directly.");
            break;
          case "reg":
          case "wire":
          case "input":
          case "output":
          case "parameter":
          case "localparam":
            this.fail(t, `declarations like \`${t.s}\` go at the top of the module, not inside an always block.`);
            break;
          default:
            if (RESERVED.has(t.s)) this.fail(t, `didn't expect \`${t.s}\` here.`);
        }
      }
      if (t.t !== "id" && !this.isSym("{")) this.fail(t, `expected a statement (found ${this.desc(t)}).`);
      const lv = this.parseLV();
      let nb: boolean;
      if (this.isSym("<=")) nb = true;
      else if (this.isSym("=")) nb = false;
      else this.fail(this.cur, `expected \`<=\` or \`=\` after \`${lv.parts.map((p) => p.name).join(", ")}\` (found ${this.desc(this.cur)}).`);
      this.next();
      if (this.isSym("#")) this.unsupported(this.cur);
      const rhs = this.parseExpr();
      this.expect(";", "after the assignment");
      return { k: "assign", lv, rhs, nb, line: t.line, col: t.col };
    } finally {
      this.depth--;
    }
  }

  parseLV(): LV {
    const t = this.cur;
    if (this.isSym("{")) {
      this.next();
      const parts: LPart[] = [];
      for (;;) {
        const sub = this.parseLV();
        parts.push(...sub.parts);
        if (this.isSym(",")) this.next();
        else break;
      }
      this.expect("}", "to close the concatenation");
      return { parts, line: t.line, col: t.col };
    }
    const n = this.ident("a signal name");
    const part: LPart = { name: n.s, line: n.line, col: n.col };
    if (this.isSym("[")) {
      this.next();
      const a = this.parseExpr();
      if (this.isSym(":")) {
        this.next();
        part.range = [a, this.parseExpr()];
      } else if (this.isSym("+:") || this.isSym("-:")) this.fail(this.cur, "indexed part selects (`+:`/`-:`) aren't supported: use a constant range like a[3:1].");
      else part.idx = a;
      this.expect("]", "to close the bit select");
    }
    return { parts: [part], line: t.line, col: t.col };
  }

  // ───────────────────────────── expressions ─────────────────────────────

  parseExpr(): Expr {
    if (++this.depth > MAX_DEPTH) this.fail(this.cur, "this expression is nested too deeply for the toy simulator.");
    try {
      const c = this.parseBin(1);
      if (this.isSym("?")) {
        const q = this.next();
        const t = this.parseExpr();
        if (!this.isSym(":")) this.fail(this.cur, `expected \`:\` in the \`?:\` expression (found ${this.desc(this.cur)}).`);
        this.next();
        const f = this.parseExpr();
        return { k: "cond", c, t, f, line: q.line, col: q.col };
      }
      return c;
    } finally {
      this.depth--;
    }
  }

  parseBin(minPrec: number): Expr {
    let l = this.parseUnary();
    for (;;) {
      const t = this.cur;
      if (t.t !== "sym") break;
      const pr = PREC[t.s];
      if (pr === undefined || pr < minPrec) break;
      if (t.s === "/" || t.s === "%") this.fail(t, "division and remainder aren't supported (they're huge circuits); this toy simulator has + - * only.");
      if (t.s === "**") this.fail(t, "`**` (power) isn't supported in this toy simulator.");
      if (t.s === "===" || t.s === "!==") this.fail(t, `\`${t.s}\` compares x/z values, which this toy simulator doesn't have: use \`${t.s === "===" ? "==" : "!="}\`.`);
      if (t.s === "<<<" || t.s === ">>>") this.fail(t, "arithmetic shifts (`<<<`, `>>>`) need signed numbers, which aren't supported: use `<<` or `>>`.");
      this.next();
      if (++this.depth > MAX_DEPTH) this.fail(t, "this expression is nested too deeply for the toy simulator.");
      const r = this.parseBin(pr + 1);
      this.depth--;
      l = { k: "bin", op: t.s === "^~" ? "~^" : t.s, l, r, line: t.line, col: t.col };
    }
    return l;
  }

  parseUnary(): Expr {
    const t = this.cur;
    if (t.t === "sym" && ["~", "!", "-", "+", "&", "|", "^", "~&", "~|", "~^", "^~"].includes(t.s)) {
      this.next();
      if (++this.depth > MAX_DEPTH) this.fail(t, "this expression is nested too deeply for the toy simulator.");
      const e = this.parseUnary();
      this.depth--;
      return { k: "un", op: t.s === "^~" ? "~^" : t.s, e, line: t.line, col: t.col };
    }
    return this.parsePrimary();
  }

  parsePrimary(): Expr {
    const t = this.cur;
    this.unsupported(t);
    if (t.t === "num") {
      this.next();
      return { k: "num", v: t.v ?? 0, w: t.w, line: t.line, col: t.col };
    }
    if (this.isSym("(")) {
      this.next();
      const e = this.parseExpr();
      this.expect(")", "to close the parenthesis");
      return e;
    }
    if (this.isSym("{")) {
      this.next();
      const first = this.parseExpr();
      if (this.isSym("{")) {
        this.next();
        const parts = [this.parseExpr()];
        while (this.isSym(",")) {
          this.next();
          parts.push(this.parseExpr());
        }
        this.expect("}", "to close the replication");
        this.expect("}", "to close the replication");
        return { k: "rep", n: first, parts, line: t.line, col: t.col };
      }
      const parts = [first];
      while (this.isSym(",")) {
        this.next();
        parts.push(this.parseExpr());
      }
      this.expect("}", "to close the concatenation");
      return { k: "cat", parts, line: t.line, col: t.col };
    }
    if (t.t === "id") {
      const n = this.ident("a signal name");
      if (this.isSym("(")) this.fail(this.cur, `\`${n.s}(...)\` looks like a function call; functions aren't supported in this toy simulator.`);
      if (this.isSym("[")) {
        this.next();
        const a = this.parseExpr();
        if (this.isSym(":")) {
          this.next();
          const b = this.parseExpr();
          this.expect("]", "to close the part select");
          return { k: "part", name: n.s, msb: a, lsb: b, line: n.line, col: n.col };
        }
        if (this.isSym("+:") || this.isSym("-:")) this.fail(this.cur, "indexed part selects (`+:`/`-:`) aren't supported: use a constant range like a[3:1].");
        this.expect("]", "to close the bit select");
        return { k: "idx", name: n.s, i: a, line: n.line, col: n.col };
      }
      return { k: "id", name: n.s, line: n.line, col: n.col };
    }
    this.fail(t, `expected a value or signal name here (found ${this.desc(t)}).`);
  }
}

/** Source text -> module AST. Throws CompileError (first problem only). */
export function parse(src: string): Module {
  const toks = lex(src);
  return new Parser(toks).parseModule();
}
