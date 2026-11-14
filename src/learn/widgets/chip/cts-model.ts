/**
 * Pure toy model behind chip-cts: clock arrival times at flip-flop sinks for three distribution styles.
 *
 * Toy delay model: arrival at a node = arrival at its parent + WIRE_PS per grid unit of Manhattan wire + BUF_PS if the
 * node is a clock buffer. (Real wires are RC: delay grows faster than length, and buffers have load-dependent delay.)
 */

export type Arch = "daisy" | "unbalanced" | "htree";
export const ARCHS: Arch[] = ["daisy", "unbalanced", "htree"];

export const WIRE_PS = 25;
export const BUF_PS = 35;
/** Flip-flop clock-to-Q, setup, hold and the fastest path between two flops (toy numbers, ps). */
export const T_CQ = 50;
export const T_SU = 30;
export const T_HOLD = 20;
export const MIN_PATH = 40;

export interface Pt {
  x: number;
  y: number;
}

export interface TreeNode extends Pt {
  parent: number;
  buf: boolean;
  /** Index of the sink for a leaf, else -1. */
  sink: number;
}

/** Sinks sit on a 4-column grid, one unit apart: 8 sinks = 4 × 2, 16 sinks = 4 × 4. Index = row * 4 + col. */
export function sinkPositions(n: 8 | 16): Pt[] {
  return Array.from({ length: n }, (_, i) => ({ x: i % 4, y: Math.floor(i / 4) }));
}

const dist = (a: Pt, b: Pt) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function bboxCentre(ids: number[], pos: Pt[]): Pt {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const i of ids) {
    x0 = Math.min(x0, pos[i].x);
    x1 = Math.max(x1, pos[i].x);
    y0 = Math.min(y0, pos[i].y);
    y1 = Math.max(y1, pos[i].y);
  }
  return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
}

export function buildTree(arch: Arch, n: 8 | 16): TreeNode[] {
  const pos = sinkPositions(n);
  const nodes: TreeNode[] = [];
  const add = (p: Pt, parent: number, buf: boolean, sink: number) => {
    nodes.push({ x: p.x, y: p.y, parent, buf, sink });
    return nodes.length - 1;
  };
  const ids = pos.map((_, i) => i);

  if (arch === "daisy") {
    // one buffer at the source, then a single wire snaking past every flop (boustrophedon order)
    let prev = add({ x: -0.5, y: -0.5 }, -1, true, -1);
    const order: number[] = [];
    for (let r = 0; r < n / 4; r++) for (let c = 0; c < 4; c++) order.push(r * 4 + (r % 2 === 0 ? c : 3 - c));
    for (const s of order) prev = add(pos[s], prev, false, s);
    return nodes;
  }

  if (arch === "unbalanced") {
    // Halve the flops in row-major order but drop each buffer at the first flop of its group instead of the middle: same depth, unequal wire.
    const build = (group: number[], parent: number) => {
      if (group.length === 1) {
        add(pos[group[0]], parent, false, group[0]);
        return;
      }
      const me = add(pos[group[0]], parent, true, -1);
      const k = group.length / 2;
      build(group.slice(0, k), me);
      build(group.slice(k), me);
    };
    const root = add({ x: -0.5, y: -0.5 }, -1, true, -1);
    build(ids, root);
    return nodes;
  }

  // H-tree: halve the flops across the longer side, put a buffer at the middle of every group.
  const build = (group: number[], parent: number) => {
    if (group.length === 1) {
      add(pos[group[0]], parent, false, group[0]);
      return;
    }
    const c = bboxCentre(group, pos);
    const me = add(c, parent, true, -1);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const i of group) {
      x0 = Math.min(x0, pos[i].x);
      x1 = Math.max(x1, pos[i].x);
      y0 = Math.min(y0, pos[i].y);
      y1 = Math.max(y1, pos[i].y);
    }
    const byX = x1 - x0 >= y1 - y0;
    const sorted = [...group].sort((a, b) => (byX ? pos[a].x - pos[b].x || pos[a].y - pos[b].y : pos[a].y - pos[b].y || pos[a].x - pos[b].x));
    build(sorted.slice(0, sorted.length / 2), me);
    build(sorted.slice(sorted.length / 2), me);
  };
  build(ids, -1);
  return nodes;
}

/** Clock arrival time (ps) at each node of the tree, and at each sink. */
export function treeArrivals(nodes: TreeNode[]): { node: number[]; sink: number[] } {
  const node: number[] = [];
  const sink: number[] = [];
  nodes.forEach((nd, i) => {
    const p = nd.parent >= 0 ? nodes[nd.parent] : null;
    const base = p ? node[nd.parent] + WIRE_PS * dist(nd, p) : 0;
    node[i] = base + (nd.buf ? BUF_PS : 0);
    if (nd.sink >= 0) sink[nd.sink] = node[i];
  });
  return { node, sink };
}

export function arrivals(arch: Arch, n: 8 | 16): number[] {
  return treeArrivals(buildTree(arch, n)).sink;
}

export const skewOf = (arr: number[]) => Math.max(...arr) - Math.min(...arr);
export const latencyOf = (arr: number[]) => Math.max(...arr);

export interface PairTiming {
  /** capture arrival − launch arrival (positive: capture clock is later). */
  skewPs: number;
  setupSlack: number;
  holdSlack: number;
}

/** setup = T − (tcq + path + tsu) + (capture − launch); hold = (tcq + minPath) − thold − (capture − launch). */
export function pairTiming(arr: number[], launch: number, capture: number, periodPs: number, pathPs: number): PairTiming {
  const sk = arr[capture] - arr[launch];
  return {
    skewPs: sk,
    setupSlack: periodPs - (T_CQ + pathPs + T_SU) + sk,
    holdSlack: T_CQ + MIN_PATH - T_HOLD - sk,
  };
}

/** goal: { maxSkewPs } and/or { arch }, and optionally { maxLatencyPs }. Recomputes from state.arch and state.sinks. */
export function checkCts(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as { arch?: string; sinks?: number } | undefined;
  if (!s || !ARCHS.includes(s.arch as Arch)) return false;
  const n = s.sinks === 8 ? 8 : 16;
  const arr = arrivals(s.arch as Arch, n);
  let any = false;
  if (typeof goal.arch === "string") {
    any = true;
    if (s.arch !== goal.arch) return false;
  }
  if (typeof goal.maxSkewPs === "number") {
    any = true;
    if (skewOf(arr) > goal.maxSkewPs) return false;
  }
  if (typeof goal.maxLatencyPs === "number") {
    any = true;
    if (latencyOf(arr) > goal.maxLatencyPs) return false;
  }
  return any;
}
