/** Pure coherence and memory-ordering simulations: MESI for a few lines on two cores, false sharing, litmus tests. No UI. */

export type Mesi = "M" | "E" | "S" | "I";

export interface CoreCopy {
  state: Mesi;
  value: number;
}

export interface Line {
  copies: [CoreCopy, CoreCopy];
  mem: number;
}

export interface CohEvent {
  core: 0 | 1;
  op: "read" | "write";
  hit: boolean;
  bus: string[];
  text: string;
}

export const newLine = (): Line => ({ copies: [{ state: "I", value: 0 }, { state: "I", value: 0 }], mem: 0 });

/** One read or write by `core` on a line; mutates the line and returns what happened (textbook MESI, snooping, write-back). */
export function access(line: Line, core: 0 | 1, op: "read" | "write"): CohEvent {
  const me = line.copies[core];
  const other = line.copies[core === 0 ? 1 : 0];
  const bus: string[] = [];
  const name = `Core ${core === 0 ? "A" : "B"}`;
  const oname = core === 0 ? "B" : "A";
  if (op === "read") {
    if (me.state !== "I") return { core, op, hit: true, bus, text: `${name} reads: hit in its own cache (${me.state}). No bus traffic.` };
    bus.push("BusRd");
    let text = `${name} reads: miss (I).`;
    if (other.state === "M") {
      line.mem = other.value;
      other.state = "S";
      bus.push("Writeback");
      me.value = other.value;
      me.state = "S";
      text += ` Core ${oname} holds the line modified, so it writes it back and both go to Shared.`;
    } else if (other.state === "E" || other.state === "S") {
      other.state = "S";
      me.value = other.value;
      me.state = "S";
      text += ` Core ${oname} has a clean copy; both are now Shared.`;
    } else {
      me.value = line.mem;
      me.state = "E";
      text += " Nobody else has it, so the line comes from memory and is Exclusive.";
    }
    return { core, op, hit: false, bus, text };
  }
  // write
  if (me.state === "M") {
    me.value += 1;
    return { core, op, hit: true, bus, text: `${name} writes: the line is already Modified here. Hit, no bus traffic.` };
  }
  if (me.state === "E") {
    me.state = "M";
    me.value += 1;
    return { core, op, hit: true, bus, text: `${name} writes: Exclusive means nobody else has it, so it silently becomes Modified. No bus traffic.` };
  }
  if (me.state === "S") {
    bus.push("Invalidate");
    other.state = "I";
    me.state = "M";
    me.value += 1;
    return { core, op, hit: false, bus, text: `${name} writes: the line is Shared, so it broadcasts an invalidate. Core ${oname} drops its copy. ${name} becomes Modified.` };
  }
  bus.push("BusRdX");
  let text = `${name} writes: miss (I), so it asks for the line with intent to modify.`;
  if (other.state === "M") {
    line.mem = other.value;
    bus.push("Writeback");
    me.value = other.value;
    text += ` Core ${oname} had the only up-to-date copy, so it hands it over.`;
  } else me.value = other.state === "I" ? line.mem : other.value;
  other.state = "I";
  me.state = "M";
  me.value += 1;
  return { core, op, hit: false, bus, text: text + ` Core ${oname}'s copy is invalidated; ${name} is Modified.` };
}

export interface ShareRun {
  rounds: number;
  /** Writes that had to go to the bus (any miss or invalidate). */
  busWrites: number;
  /** Rough elapsed time in ns for all writes (toy costs). */
  totalNs: number;
}

/** Core A keeps incrementing counter X, core B counter Y, alternating. Same line (false sharing) or padded onto two lines. */
export function falseSharing(rounds: number, padded: boolean, hitNs = 1, busNs = 30): ShareRun {
  const lines: Line[] = padded ? [newLine(), newLine()] : [newLine()];
  let bus = 0;
  for (let i = 0; i < rounds; i++) {
    for (const core of [0, 1] as const) {
      const ev = access(lines[padded ? core : 0], core, "write");
      if (!ev.hit || ev.bus.length > 0) bus++;
    }
  }
  const writes = rounds * 2;
  return { rounds, busWrites: bus, totalNs: bus * busNs + (writes - bus) * hitNs };
}

// ───────────────────────── litmus tests ─────────────────────────

export type Model = "sc" | "tso" | "weak";
export type Order = "relaxed" | "acqrel" | "seqcst";

export interface Op {
  kind: "load" | "store" | "fence";
  addr?: string;
  /** Value stored. */
  val?: number;
  /** Register a load writes. */
  reg?: string;
  order: Order;
}

export interface Litmus {
  id: string;
  title: string;
  threads: Op[][];
  /** Registers shown in the outcome, in order. */
  regs: string[];
  /** The outcome that surprises people (shown highlighted). */
  surprising: number[];
  note: string;
}

const st = (addr: string, val: number, order: Order = "relaxed"): Op => ({ kind: "store", addr, val, order });
const ld = (addr: string, reg: string, order: Order = "relaxed"): Op => ({ kind: "load", addr, reg, order });

export const LITMUS: Litmus[] = [
  {
    id: "sb",
    title: "Store buffering",
    threads: [
      [st("x", 1), ld("y", "r1")],
      [st("y", 1), ld("x", "r2")],
    ],
    regs: ["r1", "r2"],
    surprising: [0, 0],
    note: "Each thread writes its own flag, then looks at the other's. Can both see 0?",
  },
  {
    id: "mp",
    title: "Message passing",
    threads: [
      [st("data", 1), st("flag", 1)],
      [ld("flag", "r1"), ld("data", "r2")],
    ],
    regs: ["r1", "r2"],
    surprising: [1, 0],
    note: "Thread 1 writes data, then raises a flag. Thread 2 reads the flag, then the data. Can it see the flag up but the data missing?",
  },
  {
    id: "lb",
    title: "Load buffering",
    threads: [
      [ld("y", "r1"), st("x", 1)],
      [ld("x", "r2"), st("y", 1)],
    ],
    regs: ["r1", "r2"],
    surprising: [1, 1],
    note: "Each thread reads first, then writes. Can both reads see the other thread's later write?",
  },
];

/** Must op `a` take effect before later op `b` of the same thread? */
function ordered(model: Model, a: Op, b: Op): boolean {
  if (a.kind === "fence" || b.kind === "fence") return true;
  if (a.addr === b.addr) return true; // same address: a thread always sees its own program order
  if (model === "sc") return true;
  if (a.order === "seqcst" && b.order === "seqcst") return true;
  if (model === "tso") {
    // x86-TSO: only store -> load may be reordered; a seq_cst store (xchg / mfence) drains the store buffer first
    if (a.kind === "store" && b.kind === "load") return a.order === "seqcst";
    return true;
  }
  // weak (ARM-like): reordering allowed unless an acquire load or a release store (or fence) pins it
  if (a.kind === "load" && a.order !== "relaxed") return true; // acquire: later ops stay after it
  if (b.kind === "store" && b.order !== "relaxed") return true; // release: earlier ops stay before it
  return false;
}

function permutations(ops: Op[], model: Model): number[][] {
  const n = ops.length;
  const out: number[][] = [];
  const used: boolean[] = Array(n).fill(false);
  const cur: number[] = [];
  const rec = () => {
    if (cur.length === n) {
      out.push(cur.slice());
      return;
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      // i may go next only if every earlier op that must stay before it has already gone
      let ok = true;
      for (let j = 0; j < i; j++) if (!used[j] && ordered(model, ops[j], ops[i])) ok = false;
      if (!ok) continue;
      used[i] = true;
      cur.push(i);
      rec();
      cur.pop();
      used[i] = false;
    }
  };
  rec();
  return out;
}

export interface Outcome {
  key: string;
  values: number[];
  /** One execution that produces it: list of [thread, opIndex] in global order. */
  witness: [number, number][];
}

/** Every outcome the model allows: all per-thread orders consistent with the model, interleaved on a single shared memory. */
export function outcomes(test: Litmus, model: Model): Outcome[] {
  const perThread = test.threads.map((t) => permutations(t, model));
  const found = new Map<string, Outcome>();
  const memInit: Record<string, number> = {};
  for (const t of test.threads) for (const o of t) if (o.addr) memInit[o.addr] = 0;
  const walk = (orders: number[][]) => {
    const pos = orders.map(() => 0);
    const mem = { ...memInit };
    const regs: Record<string, number> = {};
    const trace: [number, number][] = [];
    const go = (m: Record<string, number>, r: Record<string, number>, p: number[], tr: [number, number][]) => {
      let any = false;
      for (let t = 0; t < orders.length; t++) {
        if (p[t] >= orders[t].length) continue;
        any = true;
        const oi = orders[t][p[t]];
        const op = test.threads[t][oi];
        const m2 = { ...m };
        const r2 = { ...r };
        if (op.kind === "store") m2[op.addr!] = op.val!;
        else if (op.kind === "load") r2[op.reg!] = m[op.addr!];
        const p2 = p.slice();
        p2[t]++;
        go(m2, r2, p2, [...tr, [t, oi]]);
      }
      if (!any) {
        const values = test.regs.map((k) => r[k]);
        const key = values.join(",");
        if (!found.has(key)) found.set(key, { key, values, witness: tr });
      }
    };
    go(mem, regs, pos, trace);
  };
  const combos = (i: number, acc: number[][]) => {
    if (i === perThread.length) return walk(acc);
    for (const p of perThread[i]) combos(i + 1, [...acc, p]);
  };
  combos(0, []);
  return [...found.values()].sort((a, b) => a.key.localeCompare(b.key));
}
