/**
 * Authored scores for the hybrid-search widget: a bike help desk's knowledge base, three queries,
 * and for each a keyword score, a vector (meaning) score and a reranker score per article.
 * Pure data and maths so it can be tested in Node.
 */

export interface Article {
  id: string;
  title: string;
}

export const ARTICLES: Article[] = [
  { id: "d1", title: "Error E-17: motor controller overheated" },
  { id: "d2", title: "Why the motor cuts out on steep hills" },
  { id: "d3", title: "Fitting a new battery pack" },
  { id: "d4", title: "Display flashing: pairing and reset" },
  { id: "d5", title: "Charging: how long, which charger" },
  { id: "d6", title: "Error E-71: wheel speed sensor misaligned" },
  { id: "d7", title: "Range: how far a battery will take you" },
  { id: "d8", title: "Updating the display firmware" },
];

export interface HybridQuery {
  id: string;
  text: string;
  gold: string;
  why: string;
  kw: Record<string, number>;
  vec: Record<string, number>;
  rerank: Record<string, number>;
}

export const HYBRID_QUERIES: HybridQuery[] = [
  {
    id: "code",
    text: "E-17",
    gold: "d1",
    why: "An exact code. Meaning-vectors blur digits, so E-71 looks almost the same as E-17.",
    kw: { d1: 9.0, d6: 1.1, d4: 0.6, d8: 0.4, d2: 0, d3: 0, d5: 0, d7: 0 },
    vec: { d6: 0.84, d1: 0.81, d4: 0.62, d8: 0.58, d5: 0.41, d7: 0.39, d2: 0.36, d3: 0.33 },
    rerank: { d1: 0.97, d6: 0.22, d4: 0.1, d8: 0.08, d2: 0.05, d3: 0.03, d5: 0.03, d7: 0.02 },
  },
  {
    id: "paraphrase",
    text: "my bike loses power going uphill",
    gold: "d2",
    why: "No shared words with the right article: only meaning connects them.",
    kw: { d5: 2.4, d7: 1.9, d3: 1.6, d1: 0.9, d4: 0.5, d6: 0.4, d2: 0, d8: 0 },
    vec: { d2: 0.88, d7: 0.61, d5: 0.52, d3: 0.5, d1: 0.47, d6: 0.4, d4: 0.3, d8: 0.22 },
    rerank: { d2: 0.96, d7: 0.3, d1: 0.2, d5: 0.15, d3: 0.1, d6: 0.08, d4: 0.05, d8: 0.02 },
  },
  {
    id: "mixed",
    text: "error E-71, wheel sensor, only on hills",
    gold: "d6",
    why: "A code and a symptom. Each method alone prefers a different near-miss.",
    kw: { d1: 6.4, d6: 6.0, d2: 3.1, d4: 1.0, d8: 0.6, d3: 0, d5: 0, d7: 0 },
    vec: { d2: 0.83, d6: 0.79, d1: 0.64, d7: 0.5, d3: 0.41, d5: 0.38, d4: 0.3, d8: 0.2 },
    rerank: { d6: 0.95, d1: 0.4, d2: 0.35, d4: 0.1, d7: 0.06, d3: 0.04, d5: 0.03, d8: 0.02 },
  },
];

export type FuseMethod = "weighted" | "rrf";

export interface Row {
  id: string;
  kwRank: number;
  vecRank: number;
  fused: number;
  rerank: number | null;
}

const rankOf = (scores: Record<string, number>) => {
  const order = ARTICLES.map((a) => a.id).sort((a, b) => scores[b] - scores[a] || a.localeCompare(b));
  return Object.fromEntries(order.map((id, i) => [id, i + 1])) as Record<string, number>;
};

const norm = (scores: Record<string, number>) => {
  const vals = Object.values(scores);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  return (id: string) => (hi === lo ? 0 : (scores[id] - lo) / (hi - lo));
};

/** alpha 0 = keyword only, 1 = meaning only. Rerank re-sorts the top 4 of the fused list. */
export function fuse(q: HybridQuery, method: FuseMethod, alpha: number, rerank: boolean): Row[] {
  const kr = rankOf(q.kw);
  const vr = rankOf(q.vec);
  const nk = norm(q.kw);
  const nv = norm(q.vec);
  const rows: Row[] = ARTICLES.map((a) => ({
    id: a.id,
    kwRank: kr[a.id],
    vecRank: vr[a.id],
    fused: method === "weighted" ? (1 - alpha) * nk(a.id) + alpha * nv(a.id) : (1 - alpha) / (60 + kr[a.id]) + alpha / (60 + vr[a.id]),
    rerank: null,
  }));
  // at the extremes a signal alone decides; ties fall back to the other signal so order is stable
  rows.sort((a, b) => b.fused - a.fused || a.kwRank - b.kwRank || a.id.localeCompare(b.id));
  if (rerank) {
    const head = rows.slice(0, 4).map((r) => ({ ...r, rerank: q.rerank[r.id] }));
    head.sort((a, b) => b.rerank! - a.rerank!);
    return [...head, ...rows.slice(4)];
  }
  return rows;
}

export const goldRank = (rows: Row[], gold: string) => rows.findIndex((r) => r.id === gold) + 1;
