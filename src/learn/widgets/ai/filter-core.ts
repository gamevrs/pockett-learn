import { dist, makePoints, rng, type Pt } from "./ann-core.ts";

/** A shared help-centre index: four bike shops' articles live in one collection. */
export const TENANTS = [
  { id: "orchard", name: "Orchard Cycles", share: 60, colour: "var(--brand)" },
  { id: "riverside", name: "Riverside Bikes", share: 36, colour: "#4fa3df" },
  { id: "hilltop", name: "Hilltop Hub", share: 18, colour: "#e8924a" },
  { id: "quarry", name: "Quarry Road Co-op", share: 6, colour: "#e0679c" },
] as const;

export type TenantId = (typeof TENANTS)[number]["id"];

export interface Doc extends Pt {
  tenant: TenantId;
}

function build(): Doc[] {
  const r = rng(5);
  const pts = makePoints(120, 29);
  const labels: TenantId[] = TENANTS.flatMap((t) => Array.from({ length: t.share }, () => t.id));
  for (let i = labels.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [labels[i], labels[j]] = [labels[j], labels[i]];
  }
  return pts.map((p, i) => ({ ...p, tenant: labels[i] }));
}

export const DOCS: Doc[] = build();
export const FILTER_K = 5;
export const QUERY_PRESETS: Record<string, { x: number; y: number }> = { A: { x: 24, y: 30 }, B: { x: 62, y: 62 }, C: { x: 48, y: 28 } };

export type FilterMode = "none" | "post" | "pre";

export interface FilterRun {
  ids: number[];
  /** how many documents the vector search had to hand back before the filter ran */
  fetched: number;
  leaked: number;
}

export function runFilter(mode: FilterMode, tenant: TenantId, overfetch: number, q: { x: number; y: number }): FilterRun {
  const byDist = (list: Doc[]) => list.slice().sort((a, b) => dist(a, q) - dist(b, q) || a.id - b.id);
  if (mode === "none") {
    const ids = byDist(DOCS).slice(0, FILTER_K);
    return { ids: ids.map((d) => d.id), fetched: FILTER_K, leaked: ids.filter((d) => d.tenant !== tenant).length };
  }
  if (mode === "post") {
    const pool = byDist(DOCS).slice(0, FILTER_K * overfetch);
    const kept = pool.filter((d) => d.tenant === tenant).slice(0, FILTER_K);
    return { ids: kept.map((d) => d.id), fetched: pool.length, leaked: 0 };
  }
  const own = byDist(DOCS.filter((d) => d.tenant === tenant)).slice(0, FILTER_K);
  return { ids: own.map((d) => d.id), fetched: DOCS.filter((d) => d.tenant === tenant).length, leaked: 0 };
}
