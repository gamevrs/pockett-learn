/** Shared types for the toy Verilog simulator (pure, no UI). */

export interface Diag {
  line: number;
  col?: number;
  message: string;
}

/** Thrown inside the compiler and always caught in compile(); never escapes. */
export class CompileError extends Error {
  diag: Diag;
  constructor(diag: Diag) {
    super(diag.message);
    this.diag = diag;
  }
}

// ───────────────────────────── parsed (raw) syntax tree ─────────────────────────────

interface Pos {
  line: number;
  col: number;
}

export type Expr =
  | ({ k: "num"; v: number; w?: number } & Pos)
  | ({ k: "id"; name: string } & Pos)
  | ({ k: "idx"; name: string; i: Expr } & Pos)
  | ({ k: "part"; name: string; msb: Expr; lsb: Expr } & Pos)
  | ({ k: "un"; op: string; e: Expr } & Pos)
  | ({ k: "bin"; op: string; l: Expr; r: Expr } & Pos)
  | ({ k: "cond"; c: Expr; t: Expr; f: Expr } & Pos)
  | ({ k: "cat"; parts: Expr[] } & Pos)
  | ({ k: "rep"; n: Expr; parts: Expr[] } & Pos);

export interface LPart extends Pos {
  name: string;
  /** `a[i]` */
  idx?: Expr;
  /** `a[msb:lsb]` */
  range?: [Expr, Expr];
}

export interface LV extends Pos {
  parts: LPart[];
}

export type Stmt =
  | ({ k: "assign"; lv: LV; rhs: Expr; nb: boolean } & Pos)
  | ({ k: "if"; c: Expr; t: Stmt; e?: Stmt } & Pos)
  | ({ k: "case"; sel: Expr; items: { labels: Expr[] | null; body: Stmt }[] } & Pos)
  | ({ k: "block"; stmts: Stmt[] } & Pos)
  | ({ k: "nop" } & Pos);

export type Dir = "input" | "output";
export type Range = [Expr, Expr];

export type Item =
  | ({ k: "decl"; dir?: Dir; net?: "wire" | "reg"; range?: Range; names: { name: string; line: number; col: number; init?: Expr }[] } & Pos)
  | ({ k: "param"; range?: Range; defs: { name: string; value: Expr; line: number; col: number }[] } & Pos)
  | ({ k: "assign"; lv: LV; rhs: Expr } & Pos)
  | ({ k: "always"; star: boolean; edges: { edge: "pos" | "neg"; sig: string; line: number; col: number }[]; body: Stmt; kw: string } & Pos);

export interface Module extends Pos {
  name: string;
  /** True when the port directions were declared in the header (ANSI style). */
  ansi: boolean;
  /** Port names in header order. */
  ports: { name: string; line: number; col: number }[];
  items: Item[];
}

// ───────────────────────────── resolved (elaborated) tree ─────────────────────────────

/** Every node carries its self-determined width `w` (Verilog rules, see sim.ts). */
export type RExpr =
  | { k: "num"; v: number; w: number; sized: boolean }
  | { k: "sig"; s: number; w: number }
  | { k: "idx"; s: number; i: RExpr; w: 1; sw: number }
  | { k: "part"; s: number; lsb: number; w: number }
  | { k: "un"; op: string; e: RExpr; w: number }
  | { k: "bin"; op: string; l: RExpr; r: RExpr; w: number }
  | { k: "cond"; c: RExpr; t: RExpr; f: RExpr; w: number }
  | { k: "cat"; parts: RExpr[]; w: number };

export interface RLPart {
  s: number;
  lo: number;
  w: number;
  /** dynamic single-bit index, evaluated when the write happens */
  dyn?: RExpr;
  sw: number;
}

export type RStmt =
  | { k: "assign"; parts: RLPart[]; lw: number; rhs: RExpr; W: number; nb: boolean }
  | { k: "if"; c: RExpr; t: RStmt; e?: RStmt }
  | { k: "case"; sel: RExpr; items: { labels: RExpr[] | null; body: RStmt }[] }
  | { k: "block"; stmts: RStmt[] };

export type SigKind = "input" | "output" | "wire" | "reg";

export interface Signal {
  name: string;
  width: number;
  /** Shown kind: an `output reg` is "output". */
  kind: SigKind;
  /** Declared as `reg` (can be assigned in always blocks). */
  isReg: boolean;
}

export interface CombNode {
  kind: "assign" | "always";
  line: number;
  reads: number[];
  writes: number[];
  body: RStmt;
}

export interface SeqBlock {
  line: number;
  triggers: { sig: number; edge: "pos" | "neg" }[];
  body: RStmt;
}

export interface Design {
  name: string;
  signals: Signal[];
  /** Combinational nodes in dependency order (each runs once per settle). */
  comb: CombNode[];
  seq: SeqBlock[];
  /** Name of the first posedge signal, a sensible default clock. */
  clock?: string;
}

// ───────────────────────────── stimulus and traces ─────────────────────────────

export interface Stimulus {
  clock?: string;
  steps: Record<string, number>[];
}

export interface Trace {
  signals: { name: string; width: number; kind: SigKind }[];
  /** One value per step per signal, sampled just AFTER the rising edge has settled (combinational-only designs: after settling). */
  values: Record<string, number[]>;
  /** One value per step per signal, sampled just BEFORE the rising edge (inputs applied, clock low, combinational logic settled, registers still old). */
  pre: Record<string, number[]>;
  clock?: string;
}
