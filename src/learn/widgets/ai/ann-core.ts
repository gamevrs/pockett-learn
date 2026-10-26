/**
 * Pure maths behind the vector-search widgets: a small deterministic point cloud, exact search,
 * a layered proximity graph (the idea behind HNSW) and a cluster index (the idea behind IVF).
 * No DOM, no React, so it can be tested in Node.
 */

export interface Pt {
  id: number;
  x: number;
  y: number;
  /** Which cluster the point was generated in (0-based); only used for colouring. */
  group: number;
}

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CENTRES: [number, number][] = [
  [22, 24],
  [70, 20],
  [48, 54],
  [18, 76],
  [78, 72],
];

/** 80 points in five loose clumps inside a 0..100 square. */
export function makePoints(n = 80, seed = 11): Pt[] {
  const r = rng(seed);
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const g = i % CENTRES.length;
    const [cx, cy] = CENTRES[g];
    // sum of two uniforms: a soft bell shape
    const dx = (r() + r() - 1) * 26;
    const dy = (r() + r() - 1) * 26;
    pts.push({ id: i, x: Math.min(97, Math.max(3, cx + dx)), y: Math.min(97, Math.max(3, cy + dy)), group: g });
  }
  return pts;
}

export const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

/** Brute force: the true k nearest ids to q, nearest first. */
export function exactTopK(pts: Pt[], q: { x: number; y: number }, k: number): number[] {
  return pts
    .map((p) => ({ id: p.id, d: dist(p, q) }))
    .sort((a, b) => a.d - b.d || a.id - b.id)
    .slice(0, k)
    .map((p) => p.id);
}

export function recallOf(found: number[], truth: number[]): number {
  if (truth.length === 0) return 1;
  const set = new Set(truth);
  return found.filter((id) => set.has(id)).length / truth.length;
}

// ───────────────────────── layered graph ─────────────────────────

export interface Graph {
  /** layers[0] is the base layer holding every point; higher layers hold fewer. */
  layers: Map<number, number[]>[];
  entry: number;
}

/** Spread-out sample: start at `first`, then repeatedly add the point farthest from those chosen. */
function spread(pts: Pt[], pool: number[], count: number, first: number): number[] {
  const chosen = [first];
  while (chosen.length < count) {
    let best = -1;
    let bestD = -1;
    for (const id of pool) {
      if (chosen.includes(id)) continue;
      const d = Math.min(...chosen.map((c) => dist(pts[id], pts[c])));
      if (d > bestD) {
        bestD = d;
        best = id;
      }
    }
    chosen.push(best);
  }
  return chosen;
}

function buildLayer(pts: Pt[], ids: number[], m: number): Map<number, number[]> {
  const adj = new Map<number, Set<number>>();
  for (const id of ids) adj.set(id, new Set());
  for (const id of ids) {
    const near = ids
      .filter((o) => o !== id)
      .sort((a, b) => dist(pts[id], pts[a]) - dist(pts[id], pts[b]) || a - b)
      .slice(0, m);
    for (const o of near) {
      adj.get(id)!.add(o);
      adj.get(o)!.add(id);
    }
  }
  // join separate islands with their shortest bridge, so a walk can always cross
  for (;;) {
    const comp = new Map<number, number>();
    let c = 0;
    for (const id of ids) {
      if (comp.has(id)) continue;
      const stack = [id];
      comp.set(id, c);
      while (stack.length) {
        const cur = stack.pop()!;
        for (const nb of adj.get(cur)!) {
          if (comp.has(nb)) continue;
          comp.set(nb, c);
          stack.push(nb);
        }
      }
      c++;
    }
    if (c === 1) break;
    let best: [number, number] | null = null;
    let bestD = Infinity;
    for (const a of ids)
      for (const b of ids) {
        if (comp.get(a) === comp.get(b)) continue;
        const d = dist(pts[a], pts[b]);
        if (d < bestD) {
          bestD = d;
          best = [a, b];
        }
      }
    adj.get(best![0])!.add(best![1]);
    adj.get(best![1])!.add(best![0]);
  }
  const out = new Map<number, number[]>();
  for (const [id, set] of adj) out.set(id, [...set].sort((a, b) => a - b));
  return out;
}

export function buildGraph(pts: Pt[], m = 3): Graph {
  const all = pts.map((p) => p.id);
  const top = spread(pts, all, 5, 0);
  const mid = spread(pts, all, 18, 0);
  return { layers: [buildLayer(pts, all, m), buildLayer(pts, mid, m), buildLayer(pts, top, m)], entry: top[0] };
}

export interface GraphSearch {
  ids: number[];
  /** every point whose distance to the query was computed */
  visited: number[];
  /** the walk, in order: which layer, which point we stood on */
  path: { layer: number; node: number }[];
}

export function graphSearch(g: Graph, pts: Pt[], q: { x: number; y: number }, k: number, ef: number, useLayers = true): GraphSearch {
  const seen = new Map<number, number>();
  const d = (id: number) => {
    let v = seen.get(id);
    if (v === undefined) {
      v = dist(pts[id], q);
      seen.set(id, v);
    }
    return v;
  };
  const path: { layer: number; node: number }[] = [];
  let cur = g.entry;
  path.push({ layer: g.layers.length - 1, node: cur });
  if (useLayers) {
    for (let l = g.layers.length - 1; l >= 1; l--) {
      let moved = true;
      while (moved) {
        moved = false;
        for (const nb of g.layers[l].get(cur) ?? []) {
          if (d(nb) < d(cur)) {
            cur = nb;
            moved = true;
            path.push({ layer: l, node: cur });
          }
        }
      }
      if (l > 1) path.push({ layer: l - 1, node: cur });
    }
  } else {
    // no upper layers: start from an arbitrary fixed point, as a plain proximity graph would
    cur = g.entry;
  }
  path.push({ layer: 0, node: cur });
  // best-first search on the base layer, keeping the `ef` best found
  const base = g.layers[0];
  const cand: number[] = [cur];
  const found: number[] = [cur];
  const inSet = new Set<number>([cur]);
  d(cur);
  while (cand.length) {
    cand.sort((a, b) => d(a) - d(b) || a - b);
    const c = cand.shift()!;
    found.sort((a, b) => d(a) - d(b) || a - b);
    const worst = found[Math.min(found.length, ef) - 1];
    if (found.length >= ef && d(c) > d(worst)) break;
    path.push({ layer: 0, node: c });
    for (const nb of base.get(c) ?? []) {
      if (inSet.has(nb)) continue;
      inSet.add(nb);
      const dn = d(nb);
      found.sort((a, b) => d(a) - d(b) || a - b);
      if (found.length < ef || dn < d(found[Math.min(found.length, ef) - 1])) {
        cand.push(nb);
        found.push(nb);
      }
    }
  }
  found.sort((a, b) => d(a) - d(b) || a - b);
  return { ids: found.slice(0, k), visited: [...seen.keys()], path };
}

// ───────────────────────── clusters ─────────────────────────

export interface Clusters {
  centres: { x: number; y: number }[];
  members: number[][];
}

export function buildClusters(pts: Pt[], nlist = 6): Clusters {
  const all = pts.map((p) => p.id);
  let centres = spread(pts, all, nlist, 0).map((id) => ({ x: pts[id].x, y: pts[id].y }));
  let members: number[][] = [];
  for (let it = 0; it < 12; it++) {
    members = centres.map(() => []);
    for (const p of pts) {
      let bi = 0;
      for (let i = 1; i < centres.length; i++) if (dist(p, centres[i]) < dist(p, centres[bi])) bi = i;
      members[bi].push(p.id);
    }
    centres = centres.map((c, i) => {
      const m = members[i];
      if (!m.length) return c;
      return { x: m.reduce((s, id) => s + pts[id].x, 0) / m.length, y: m.reduce((s, id) => s + pts[id].y, 0) / m.length };
    });
  }
  return { centres, members };
}

export interface ClusterSearch {
  ids: number[];
  visited: number[];
  probed: number[];
}

export function clusterSearch(c: Clusters, pts: Pt[], q: { x: number; y: number }, k: number, nprobe: number): ClusterSearch {
  const order = c.centres.map((ctr, i) => ({ i, d: dist(ctr, q) })).sort((a, b) => a.d - b.d || a.i - b.i);
  const probed = order.slice(0, nprobe).map((o) => o.i);
  const scanned = probed.flatMap((i) => c.members[i]);
  const ids = scanned
    .map((id) => ({ id, d: dist(pts[id], q) }))
    .sort((a, b) => a.d - b.d || a.id - b.id)
    .slice(0, k)
    .map((o) => o.id);
  return { ids, visited: scanned, probed };
}
