/**
 * Pure DC circuit solver (modified nodal analysis) for the electronics widgets. No React, no DOM: it runs in
 * Node too (scripts/test-elec-kit.mjs checks it against hand-computed answers).
 *
 * Elements: resistors, independent voltage and current sources, ideal switches (open or closed) and an
 * optional piecewise-linear diode (forward drop + small on-resistance, solved by trying on/off states).
 * Nodes are plain strings; the ground node (default "gnd") is 0 V.
 *
 * Sign conventions are SPICE's:
 *  - `V` source: `a` is the + terminal. Its reported current `i` flows from a to b THROUGH the source, so a
 *    battery that is delivering power reports a negative current (current leaves its + terminal).
 *  - `I` source: pushes `amps` from a to b through itself, so the current leaves the source at node b.
 *  - Every element reports `v = V(a) − V(b)`, `i` = current from a to b through the element, and
 *    `p = v·i` = power ABSORBED. A source that is delivering power has negative `p`.
 *
 * Problems that would make the matrix singular are reported as errors with a plain-language message instead
 * of returning NaN: a floating node, a loop of ideal voltage sources, a closed switch (or wire) shorting a
 * source, a current source with nowhere to push its current, an invalid value.
 */

export type DcElement =
  | { kind: "R"; id: string; a: string; b: string; ohms: number }
  | { kind: "V"; id: string; a: string; b: string; volts: number }
  | { kind: "I"; id: string; a: string; b: string; amps: number }
  | { kind: "S"; id: string; a: string; b: string; closed: boolean }
  | DiodeElement;

/**
 * Piecewise-linear diode, anode `a`, cathode `b`. On: i = (V(a) − V(b) − vf) / ron. Off: a tiny leakage
 * (1e-9 S, i.e. 1 GΩ, so an isolated node still has a defined voltage). Typical vf: silicon ~0.6–0.7 V, red LED
 * ~1.8–2.2 V, blue/white LED ~2.8–3.3 V.
 */
export interface DiodeElement {
  kind: "D";
  id: string;
  a: string;
  b: string;
  /** forward drop in volts (default 0.7) */
  vf?: number;
  /** on-resistance in ohms (default 0.001, small enough not to matter next to real resistors) */
  ron?: number;
}

export type ElecErrorKind =
  | "invalid-value"
  | "no-ground"
  | "floating-node"
  | "voltage-loop"
  | "short-circuit"
  | "current-source-open"
  | "diode-convergence"
  | "singular";

export interface ElecError {
  ok: false;
  error: ElecErrorKind;
  /** a sentence a learner can read */
  message: string;
  /** the element ids or node names involved */
  involved: string[];
}

export interface ElementReading {
  /** V(a) − V(b), volts */
  v: number;
  /** current from a to b through the element, amps */
  i: number;
  /** power absorbed, watts (negative = delivering) */
  p: number;
  /** diodes only: conducting? */
  on?: boolean;
}

export interface DcSolution {
  ok: true;
  /** node voltages relative to ground (ground included, 0) */
  v: Record<string, number>;
  /** per-element readings keyed by element id */
  el: Record<string, ElementReading>;
  /** nodes that had no path to ground and were pinned to 0 V (only with allowFloating) */
  floating: string[];
}

export type DcResult = DcSolution | ElecError;

export interface DcOptions {
  /** ground node name (default "gnd") */
  ground?: string;
  /**
   * When a group of nodes has no path to ground (e.g. cut off by an open switch), pin one of its nodes to 0 V
   * instead of failing with "floating-node". Its internal voltage differences and currents stay correct.
   */
  allowFloating?: boolean;
}

/* ───────────────────────── shared MNA core (also used by transient.ts) ───────────────────────── */

/**
 * A linear stamp. `G`: conductance between a and b. `J`: current source pushing `i` from a to b through
 * itself. `E`: voltage branch V(a) − V(b) − r·i = v with its own current unknown i (a→b); r = 0 is an ideal
 * source or closed switch, r > 0 is used for inductor companions. `role` drives error classification.
 */
export type Stamp =
  | { t: "G"; a: string; b: string; g: number; owner: string }
  | { t: "J"; a: string; b: string; i: number; owner: string }
  | { t: "E"; a: string; b: string; v: number; r: number; owner: string; role: "source" | "switch" | "other" };

export interface LinearSolution {
  ok: true;
  v: Record<string, number>;
  /** branch current of every E stamp, keyed by owner */
  branch: Record<string, number>;
  floating: string[];
}

class UF {
  private p = new Map<string, string>();
  find(x: string): string {
    let r = x;
    while (this.p.has(r) && this.p.get(r) !== r) r = this.p.get(r)!;
    let c = x;
    while (c !== r) {
      const n = this.p.get(c) ?? c;
      this.p.set(c, r);
      c = n;
    }
    if (!this.p.has(r)) this.p.set(r, r);
    return r;
  }
  union(a: string, b: string): boolean {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return false;
    this.p.set(ra, rb);
    return true;
  }
  same(a: string, b: string): boolean {
    return this.find(a) === this.find(b);
  }
}

export function fail(error: ElecErrorKind, message: string, involved: string[]): ElecError {
  return { ok: false, error, message, involved };
}

const quote = (s: string) => `"${s}"`;

/** Solve a set of linear stamps. Checks the topology first so a singular matrix becomes a readable error. */
export interface StampOptions {
  ground: string;
  allowFloating: boolean;
  /** element id → readable name for messages, e.g. `voltage source "V1"` */
  names?: Record<string, string>;
  /** nodes that exist even if no stamp touches them (e.g. the far side of an open switch) */
  extraNodes?: string[];
}

export function solveStamps(stamps: Stamp[], { ground, allowFloating, names, extraNodes = [] }: StampOptions): LinearSolution | ElecError {
  const label = (owner: string) => names?.[owner] ?? quote(owner);
  const nodes = new Set<string>(extraNodes);
  for (const s of stamps) {
    nodes.add(s.a);
    nodes.add(s.b);
  }
  if (!nodes.has(ground)) return fail("no-ground", `No element connects to the ground node ${quote(ground)}, so there is no 0 V reference to measure voltages from.`, [ground]);

  // 1) zero-resistance branches: closed switches first (a loop of switches only is harmless: the extra
  //    switch is dropped and carries 0 A), then ideal sources (a loop through one is a short or a conflict).
  const swUF = new UF();
  const hardUF = new UF();
  const dropped = new Set<Stamp>();
  for (const s of stamps) {
    if (s.t !== "E" || s.r !== 0 || s.role !== "switch") continue;
    if (!swUF.union(s.a, s.b)) dropped.add(s);
    hardUF.union(s.a, s.b);
  }
  for (const s of stamps) {
    if (s.t !== "E" || s.r !== 0 || s.role === "switch") continue;
    if (s.a === s.b || swUF.same(s.a, s.b)) {
      if (s.a === s.b && s.v === 0) {
        dropped.add(s);
        continue;
      }
      return fail("short-circuit", `${label(s.owner)} is shorted: a closed switch or wire joins its two terminals, so an ideal source would push an unlimited current. (In a real circuit something gets hot or a fuse blows.)`, [s.owner]);
    }
    if (!hardUF.union(s.a, s.b)) {
      const others = stamps.filter((o) => o !== s && o.t === "E" && o.r === 0 && o.role !== "switch" && hardUF.same(o.a, s.a)).map((o) => o.owner);
      return fail("voltage-loop", `${label(s.owner)} forms a loop with other ideal voltage sources (${others.map(label).join(", ")}). Ideal sources in a loop either disagree or leave the current undecided; put a resistor in the loop.`, [s.owner, ...others]);
    }
  }

  // 2) islands: nodes joined by anything that conducts (everything except current sources)
  const conn = new UF();
  for (const n of nodes) conn.find(n);
  for (const s of stamps) if (s.t !== "J" && !dropped.has(s)) conn.union(s.a, s.b);
  const islands = new Map<string, string[]>();
  for (const n of nodes) {
    const r = conn.find(n);
    if (!islands.has(r)) islands.set(r, []);
    islands.get(r)!.push(n);
  }
  const groundRoot = conn.find(ground);
  const pins: string[] = [];
  for (const [root, members] of islands) {
    if (root === groundRoot) continue;
    // a current source feeding an island with no way back
    let net = 0;
    const via: string[] = [];
    for (const s of stamps) {
      if (s.t !== "J") continue;
      const inA = conn.find(s.a) === root;
      const inB = conn.find(s.b) === root;
      if (inA === inB) continue;
      net += inB ? s.i : -s.i;
      via.push(s.owner);
    }
    if (Math.abs(net) > 1e-15) return fail("current-source-open", `${via.map(label).join(", ")} has nowhere to push its current: node${members.length > 1 ? "s" : ""} ${members.map(quote).join(", ")} ${members.length > 1 ? "have" : "has"} no other path back. Close the loop.`, [...via, ...members]);
    if (!allowFloating) return fail("floating-node", `Node${members.length > 1 ? "s" : ""} ${members.map(quote).join(", ")} ${members.length > 1 ? "are" : "is"} not connected to ground through any part, so there is no reference to measure ${members.length > 1 ? "their" : "its"} voltage from.`, members);
    pins.push(members[0]);
  }
  const floating = pins.length ? [...islands.entries()].filter(([r]) => r !== groundRoot).flatMap(([, m]) => m) : [];

  // 3) build and solve the MNA system
  const idx = new Map<string, number>();
  for (const n of nodes) if (n !== ground) idx.set(n, idx.size);
  const live = stamps.filter((s) => !dropped.has(s));
  const branches = live.filter((s): s is Extract<Stamp, { t: "E" }> => s.t === "E");
  const nN = idx.size;
  const size = nN + branches.length + pins.length;
  const A: number[][] = Array.from({ length: size }, () => new Array<number>(size).fill(0));
  const z = new Array<number>(size).fill(0);
  const at = (n: string) => (n === ground ? -1 : idx.get(n)!);
  for (const s of live) {
    const a = at(s.a);
    const b = at(s.b);
    if (s.t === "G") {
      if (a >= 0) A[a][a] += s.g;
      if (b >= 0) A[b][b] += s.g;
      if (a >= 0 && b >= 0) {
        A[a][b] -= s.g;
        A[b][a] -= s.g;
      }
    } else if (s.t === "J") {
      if (a >= 0) z[a] -= s.i;
      if (b >= 0) z[b] += s.i;
    }
  }
  branches.forEach((s, k) => {
    const row = nN + k;
    const a = at(s.a);
    const b = at(s.b);
    if (a >= 0) {
      A[a][row] += 1;
      A[row][a] += 1;
    }
    if (b >= 0) {
      A[b][row] -= 1;
      A[row][b] -= 1;
    }
    A[row][row] -= s.r;
    z[row] = s.v;
  });
  pins.forEach((n, k) => {
    const row = nN + branches.length + k;
    const a = at(n);
    A[a][row] += 1;
    A[row][a] += 1;
  });
  const x = gauss(A, z);
  if (!x) return fail("singular", "This circuit can't be solved as drawn (the equations have no single answer). Check for parts that are connected to nothing on one side.", []);
  const v: Record<string, number> = { [ground]: 0 };
  for (const [n, k] of idx) v[n] = x[k];
  const branch: Record<string, number> = {};
  branches.forEach((s, k) => (branch[s.owner] = x[nN + k]));
  for (const s of dropped) if (s.t === "E") branch[s.owner] = 0;
  return { ok: true, v, branch, floating };
}

/** Dense Gaussian elimination with partial pivoting. Returns null when the matrix is (numerically) singular. */
export function gauss(Ain: number[][], bin: number[]): number[] | null {
  const n = bin.length;
  const A = Ain.map((r) => r.slice());
  const b = bin.slice();
  // Structural singularity (floating nodes, source loops, current-source cut sets) is caught by the topology
  // checks in solveStamps before we get here, so this only guards against an exactly-zero pivot. A looser
  // threshold would wrongly reject legitimate circuits with a wide range of values (a 1 GΩ off-diode next to
  // the huge conductance of a capacitor's companion model at t = 0). Pivots compare to their row's size.
  const rowScale = A.map((r) => r.reduce((m, c) => Math.max(m, Math.abs(c)), 0) || 1);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) / rowScale[r] > Math.abs(A[p][c]) / rowScale[p]) p = r;
    if (Math.abs(A[p][c]) < 1e-18 * rowScale[p]) return null;
    if (p !== c) {
      [A[p], A[c]] = [A[c], A[p]];
      [b[p], b[c]] = [b[c], b[p]];
      [rowScale[p], rowScale[c]] = [rowScale[c], rowScale[p]];
    }
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / A[c][c];
      if (f === 0) continue;
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k];
    x[r] = s / A[r][r];
  }
  return x.every(Number.isFinite) ? x : null;
}

/* ───────────────────────── diodes (shared with transient.ts) ───────────────────────── */

export const DIODE_GOFF = 1e-9;

export function diodeParams(d: DiodeElement) {
  return { vf: d.vf ?? 0.7, ron: d.ron ?? 0.001 };
}

export function diodeStamps(d: DiodeElement, on: boolean): Stamp[] {
  const { vf, ron } = diodeParams(d);
  if (!on) return [{ t: "G", a: d.a, b: d.b, g: DIODE_GOFF, owner: d.id }];
  // i = (Vd − vf)/ron  →  conductance 1/ron plus a source pushing vf/ron from b to a
  return [
    { t: "G", a: d.a, b: d.b, g: 1 / ron, owner: d.id },
    { t: "J", a: d.b, b: d.a, i: vf / ron, owner: d.id },
  ];
}

export function diodeCurrent(d: DiodeElement, on: boolean, vd: number) {
  const { vf, ron } = diodeParams(d);
  return on ? (vd - vf) / ron : vd * DIODE_GOFF;
}

/**
 * Solve with diodes by trying states: start from `guess` (default all off), solve, then flip the single most
 * inconsistent diode (on but carrying reverse current, or off but forward-biased beyond vf) until every diode
 * agrees with its state. Gives up with "diode-convergence" instead of looping forever.
 */
export function solveWithDiodes(
  build: (on: Record<string, boolean>) => Stamp[],
  diodes: DiodeElement[],
  opts: StampOptions,
  guess?: Record<string, boolean>,
): { sol: LinearSolution; on: Record<string, boolean> } | ElecError {
  const on: Record<string, boolean> = {};
  for (const d of diodes) on[d.id] = guess?.[d.id] ?? false;
  const seen = new Set<string>();
  const limit = 8 * diodes.length + 16;
  for (let iter = 0; iter <= limit; iter++) {
    const sol = solveStamps(build(on), opts);
    if (!sol.ok) return sol;
    let worst: DiodeElement | null = null;
    let worstBy = 0;
    for (const d of diodes) {
      const { vf } = diodeParams(d);
      const vd = sol.v[d.a] - sol.v[d.b];
      const tol = 1e-9 * (1 + Math.abs(vf));
      // volts by which the diode disagrees with its state: on but reverse-biased below vf (current would
      // flow backwards), or off but forward-biased beyond vf
      const by = on[d.id] ? vf - vd : vd - vf;
      if (by > tol && by > worstBy) {
        worst = d;
        worstBy = by;
      }
    }
    if (!worst) return { sol, on };
    on[worst.id] = !on[worst.id];
    const key = diodes.map((d) => (on[d.id] ? "1" : "0")).join("");
    if (seen.has(key) && iter > diodes.length * 2) break;
    seen.add(key);
  }
  return fail("diode-convergence", "The diodes in this circuit couldn't settle on which ones conduct. Try adding a resistor in series with each diode.", diodes.map((d) => d.id));
}

/* ───────────────────────── public DC API ───────────────────────── */

const ELEMENT_NAMES: Record<DcElement["kind"], string> = { R: "resistor", V: "voltage source", I: "current source", S: "switch", D: "diode" };

/** Plain-language name for messages: `voltage source "V1"`. */
export function elementName(kind: string, id: string) {
  return `${(ELEMENT_NAMES as Record<string, string>)[kind] ?? "element"} ${quote(id)}`;
}

export function validateValue(id: string, kind: string, value: number | undefined, what: string, positive: boolean): ElecError | null {
  if (value === undefined) return null;
  if (!Number.isFinite(value) || (positive && value <= 0)) {
    return fail("invalid-value", `${elementName(kind, id)} needs a ${positive ? "positive " : ""}finite ${what} (got ${value}).${kind === "R" && value === 0 ? " Use a closed switch for a plain wire." : ""}`, [id]);
  }
  return null;
}

function checkIds(elements: { id: string }[]): ElecError | null {
  const ids = new Set<string>();
  for (const e of elements) {
    if (ids.has(e.id)) return fail("invalid-value", `Two elements share the id ${quote(e.id)}; every element needs its own id.`, [e.id]);
    ids.add(e.id);
  }
  return null;
}

/** Solve a DC circuit. */
export function solveDC(elements: DcElement[], opts: DcOptions = {}): DcResult {
  const ground = opts.ground ?? "gnd";
  const dup = checkIds(elements);
  if (dup) return dup;
  for (const e of elements) {
    const bad =
      e.kind === "R" ? validateValue(e.id, "R", e.ohms, "resistance", true)
      : e.kind === "V" ? validateValue(e.id, "V", e.volts, "voltage", false)
      : e.kind === "I" ? validateValue(e.id, "I", e.amps, "current", false)
      : e.kind === "D" ? validateValue(e.id, "D", e.vf, "forward drop", false) ?? validateValue(e.id, "D", e.ron, "on-resistance", true)
      : null;
    if (bad) return bad;
  }
  const names: Record<string, string> = {};
  for (const e of elements) names[e.id] = elementName(e.kind, e.id);
  const diodes = elements.filter((e): e is DiodeElement => e.kind === "D");
  const build = (on: Record<string, boolean>): Stamp[] =>
    elements.flatMap((e): Stamp[] => {
      switch (e.kind) {
        case "R":
          return [{ t: "G", a: e.a, b: e.b, g: 1 / e.ohms, owner: e.id }];
        case "V":
          return [{ t: "E", a: e.a, b: e.b, v: e.volts, r: 0, owner: e.id, role: "source" }];
        case "I":
          return [{ t: "J", a: e.a, b: e.b, i: e.amps, owner: e.id }];
        case "S":
          return e.closed ? [{ t: "E", a: e.a, b: e.b, v: 0, r: 0, owner: e.id, role: "switch" }] : [];
        case "D":
          return diodeStamps(e, on[e.id]);
      }
    });
  // the far side of an open switch is still a node (floating unless something else holds it)
  const so: StampOptions = { ground, allowFloating: !!opts.allowFloating, names, extraNodes: elements.flatMap((e) => [e.a, e.b]) };
  const res = diodes.length
    ? solveWithDiodes(build, diodes, so)
    : (() => {
        const sol = solveStamps(build({}), so);
        return sol.ok ? { sol, on: {} as Record<string, boolean> } : sol;
      })();
  if ("error" in res) return res;
  const { sol, on } = res;
  const el: Record<string, ElementReading> = {};
  for (const e of elements) {
    const v = sol.v[e.a] - sol.v[e.b];
    let i = 0;
    if (e.kind === "R") i = v / e.ohms;
    else if (e.kind === "V" || e.kind === "S") i = sol.branch[e.id] ?? 0;
    else if (e.kind === "I") i = e.amps;
    else if (e.kind === "D") i = diodeCurrent(e, on[e.id], v);
    el[e.id] = { v, i, p: e.kind === "S" ? 0 : v * i, ...(e.kind === "D" ? { on: on[e.id] } : {}) };
  }
  const v: Record<string, number> = {};
  for (const [n, x] of Object.entries(sol.v)) v[n] = x;
  return { ok: true, v, el, floating: sol.floating };
}

/** Voltage between two nodes of a solution: V(a) − V(b). */
export function voltageBetween(sol: DcSolution, a: string, b: string): number {
  return (sol.v[a] ?? 0) - (sol.v[b] ?? 0);
}
