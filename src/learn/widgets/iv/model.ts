/**
 * Data model of the `iv-trace` widget (a step-through animation of an algorithm), kept free of React so the
 * content validator can check lesson data with it.
 *
 * A trace is a list of frames. Each frame may show an array, a grid, a tree, a graph, stacks/queues, a variables
 * table and pseudo-code, plus a note. The structure (array, grid, tree nodes, graph nodes and edges, stacks, vars,
 * code) carries over from the previous frame when a frame leaves it out, so authors only write what changes;
 * the per-frame marks (pointers, highlight, range, done, cells, active, activeEdges, line, pick) never carry over.
 */

export type Cell = number | string | null;
export type CellTone = "active" | "done" | "path" | "wall";

export interface TreeNode {
  id: string;
  label: string;
  /** Parent id; nodes without one are roots. */
  parent?: string;
  /** Binary trees: which child of the parent this is. Leaving every side out lays the tree out as n-ary. */
  side?: "L" | "R";
}

export interface TraceTree {
  nodes?: TreeNode[];
  active?: string[];
  done?: string[];
}

export interface TraceGraph {
  /** x and y in 0–100. */
  nodes?: { id: string; x: number; y: number }[];
  /** [from, to] or [from, to, weight]. */
  edges?: [string, string, number?][];
  directed?: boolean;
  active?: string[];
  done?: string[];
  activeEdges?: [string, string][];
}

export interface TraceStack {
  label: string;
  items: (number | string)[];
  /** stack: drawn upright, top first. queue: front on the left. heap: as a row, root first. Default stack. */
  kind?: "stack" | "queue" | "heap";
}

export interface TracePick {
  /** What to tap, e.g. "Where does `mid` land next?". Mini-markdown. */
  prompt: string;
  /** Array index (number), or a tree node id, graph node id, or grid "r,c" (string). */
  answer: number | string;
  /** Which picture to tap when the frame has several; inferred otherwise. */
  on?: PickTarget;
}

export type PickTarget = "array" | "grid" | "tree" | "graph";

/** How a trace's `code` is highlighted. "text" is plain (pseudo-code). */
export type TraceLang = "python" | "javascript" | "sql" | "shell" | "text";
export const TRACE_LANGS: readonly TraceLang[] = ["python", "javascript", "sql", "shell", "text"];

export interface TraceFrame {
  array?: Cell[];
  /** Labelled arrows under array cells: { lo: 0, hi: 7 }. */
  pointers?: Record<string, number>;
  highlight?: number[];
  /** Shaded window [from, to], inclusive. */
  range?: [number, number];
  /** Greyed-out (settled) cells. */
  done?: number[];
  grid?: (number | string)[][];
  cells?: { r: number; c: number; tone: CellTone }[];
  tree?: TraceTree;
  graph?: TraceGraph;
  stacks?: TraceStack[];
  vars?: Record<string, string | number | boolean | null>;
  code?: string[];
  /** 1-based line of `code` to highlight. */
  line?: number;
  /** Highlighting for this frame's `code` (carries over like `code`); defaults to the trace's `lang`. */
  lang?: TraceLang;
  /** What is happening in this frame. Mini-markdown (`code`, **bold**). */
  note: string;
  /** Stop here until the learner taps the right cell or node. */
  pick?: TracePick;
}

export interface TraceProps {
  title?: string;
  /** Highlighting for the frames' `code`. Default "python". */
  lang?: TraceLang;
  frames: TraceFrame[];
  /** Optional instruction shown above the trace (e.g. "Step through, then answer below."). */
  ask?: { prompt: string };
}

export interface TraceState {
  frame: number;
  seenAll: boolean;
  /** Every pick in the trace was answered correctly (true when there are none). */
  picked: boolean;
  /** How many picks were answered correctly, out of how many. */
  answered: number;
  picks: number;
  /** The last thing tapped: an array index, node id or "r,c". */
  choice?: number | string;
}

/** A frame with everything carried over filled in. */
export interface ResolvedFrame extends Omit<TraceFrame, "tree" | "graph"> {
  tree?: TraceTree & { nodes: TreeNode[] };
  graph?: TraceGraph & { nodes: { id: string; x: number; y: number }[]; edges: [string, string, number?][] };
}

export function resolveFrames(frames: TraceFrame[]): ResolvedFrame[] {
  const out: ResolvedFrame[] = [];
  let prev: ResolvedFrame | null = null;
  for (const f of frames) {
    const { tree: _tree, graph: _graph, ...rest } = f;
    const r: ResolvedFrame = rest;
    if (prev) {
      if (r.array === undefined) r.array = prev.array;
      if (r.grid === undefined) r.grid = prev.grid;
      if (r.stacks === undefined) r.stacks = prev.stacks;
      if (r.vars === undefined) r.vars = prev.vars;
      if (r.code === undefined) r.code = prev.code;
      if (r.lang === undefined) r.lang = prev.lang;
    }
    const tree = _tree ?? (prev?.tree ? {} : undefined);
    if (tree) {
      const nodes = tree.nodes ?? prev?.tree?.nodes ?? [];
      r.tree = { ...tree, nodes };
    }
    const graph = _graph ?? (prev?.graph ? {} : undefined);
    if (graph) {
      r.graph = {
        ...graph,
        nodes: graph.nodes ?? prev?.graph?.nodes ?? [],
        edges: graph.edges ?? prev?.graph?.edges ?? [],
        directed: graph.directed ?? prev?.graph?.directed,
      };
    }
    out.push(r);
    prev = r;
  }
  return out;
}

/** What a frame's pick is answered on: given by `on`, or inferred from the answer and what the frame shows. */
export function pickTarget(f: ResolvedFrame): PickTarget | null {
  const p = f.pick;
  if (!p) return null;
  if (p.on) return p.on;
  if (typeof p.answer === "number") return f.array ? "array" : null;
  if (f.grid && /^\d+,\d+$/.test(p.answer)) return "grid";
  if (f.tree?.nodes.some((n) => n.id === p.answer)) return "tree";
  if (f.graph?.nodes.some((n) => n.id === p.answer)) return "graph";
  return null;
}

/** Problems with a trace's props, in plain words (empty when it is fine). Used by scripts/validate-content.mjs. */
export function traceProblems(props: unknown): string[] {
  const problems: string[] = [];
  const p = props as Partial<TraceProps> | undefined;
  if (!p || !Array.isArray(p.frames) || p.frames.length === 0) return ["iv-trace needs a non-empty `frames` list"];
  if (p.lang !== undefined && !TRACE_LANGS.includes(p.lang)) problems.push(`lang "${p.lang}" must be one of ${TRACE_LANGS.join(", ")}`);
  const frames = resolveFrames(p.frames);
  frames.forEach((f, i) => {
    const at = `frame ${i + 1}`;
    if (f.lang !== undefined && !TRACE_LANGS.includes(f.lang)) problems.push(`${at}: lang "${f.lang}" must be one of ${TRACE_LANGS.join(", ")}`);
    if (typeof f.note !== "string" || !f.note.trim()) problems.push(`${at}: every frame needs a note`);
    const n = f.array?.length ?? 0;
    for (const [name, idx] of Object.entries(f.pointers ?? {})) {
      if (!f.array) problems.push(`${at}: pointer "${name}" without an array`);
      else if (!Number.isInteger(idx) || idx < -1 || idx > n) problems.push(`${at}: pointer "${name}" = ${idx} is outside the array (0..${n - 1}; -1 and ${n} are allowed for "just outside")`);
    }
    for (const key of ["highlight", "done"] as const) {
      for (const idx of f[key] ?? []) if (!Number.isInteger(idx) || idx < 0 || idx >= n) problems.push(`${at}: ${key} index ${idx} is outside the array`);
    }
    if (f.range && (!f.array || f.range[0] < 0 || f.range[1] >= n || f.range[0] > f.range[1])) problems.push(`${at}: range [${f.range}] is not a window of the array`);
    if (f.grid && !f.grid.every((row) => Array.isArray(row))) problems.push(`${at}: grid must be a list of rows`);
    for (const c of f.cells ?? []) {
      if (!f.grid || c.r < 0 || c.r >= f.grid.length || c.c < 0 || c.c >= (f.grid[c.r]?.length ?? 0)) problems.push(`${at}: cell ${c.r},${c.c} is outside the grid`);
      if (!["active", "done", "path", "wall"].includes(c.tone)) problems.push(`${at}: cell tone "${c.tone}" must be active, done, path or wall`);
    }
    if (f.tree) {
      const ids = new Set(f.tree.nodes.map((t) => t.id));
      if (ids.size !== f.tree.nodes.length) problems.push(`${at}: tree node ids must be unique`);
      for (const t of f.tree.nodes) if (t.parent !== undefined && !ids.has(t.parent)) problems.push(`${at}: tree node "${t.id}" has unknown parent "${t.parent}"`);
      for (const id of [...(f.tree.active ?? []), ...(f.tree.done ?? [])]) if (!ids.has(id)) problems.push(`${at}: tree marks unknown node "${id}"`);
    }
    if (f.graph) {
      const ids = new Set(f.graph.nodes.map((g) => g.id));
      for (const g of f.graph.nodes) if (!(g.x >= 0 && g.x <= 100 && g.y >= 0 && g.y <= 100)) problems.push(`${at}: graph node "${g.id}" must have x and y in 0–100`);
      for (const [a, b] of [...f.graph.edges, ...(f.graph.activeEdges ?? [])]) if (!ids.has(a) || !ids.has(b)) problems.push(`${at}: graph edge ${a}-${b} uses an unknown node`);
      for (const id of [...(f.graph.active ?? []), ...(f.graph.done ?? [])]) if (!ids.has(id)) problems.push(`${at}: graph marks unknown node "${id}"`);
    }
    if (f.line !== undefined && (!f.code || f.line < 1 || f.line > f.code.length)) problems.push(`${at}: line ${f.line} is not a line of the code`);
    if (f.pick) {
      if (typeof f.pick.prompt !== "string" || !f.pick.prompt.trim()) problems.push(`${at}: pick needs a prompt`);
      const target = pickTarget(f);
      if (!target) problems.push(`${at}: pick answer ${JSON.stringify(f.pick.answer)} is not an array index, tree node, graph node or grid "r,c" shown in this frame`);
      else if (target === "array" && !(typeof f.pick.answer === "number" && f.pick.answer >= 0 && f.pick.answer < n)) problems.push(`${at}: pick answer ${f.pick.answer} is outside the array`);
      else if (target === "tree" && !f.tree?.nodes.some((t) => t.id === f.pick?.answer)) problems.push(`${at}: pick answer "${f.pick.answer}" is not a tree node`);
      else if (target === "graph" && !f.graph?.nodes.some((g) => g.id === f.pick?.answer)) problems.push(`${at}: pick answer "${f.pick.answer}" is not a graph node`);
      else if (target === "grid" && !/^\d+,\d+$/.test(String(f.pick.answer))) problems.push(`${at}: grid pick answers are "r,c" strings`);
    }
  });
  return problems;
}

/** Goal check: { seenAll: true } stepped to the last frame; { picked: true } every pick answered; { frame: N } reached frame N (1-based). */
export function checkTrace(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as TraceState | undefined;
  if (!s) return false;
  const known = ["seenAll", "picked", "frame"].filter((k) => k in goal);
  if (!known.length) return false;
  if (goal.seenAll === true && !s.seenAll) return false;
  if (goal.picked === true && !s.picked) return false;
  if (typeof goal.frame === "number" && s.frame + 1 < goal.frame) return false;
  return true;
}
