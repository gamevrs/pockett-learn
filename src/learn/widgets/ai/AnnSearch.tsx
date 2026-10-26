"use client";

import React, { useMemo, useState } from "react";
import { Footprints, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Pill, Readout, Segmented, Slider } from "./ui";
import { buildClusters, buildGraph, clusterSearch, exactTopK, graphSearch, makePoints, recallOf } from "./ann-core";

/**
 * Three ways to find the 5 nearest neighbours of a query in an 80-point cloud: scan everything
 * (exact), walk a layered proximity graph (the idea behind HNSW) or visit only the nearest few
 * clusters (the idea behind IVF). The readouts count distance checks and recall against the exact
 * answer, so the speed/accuracy trade-off is something you can steer.
 */

const POINTS = makePoints();
const GRAPH = buildGraph(POINTS);
const CLUSTERS = buildClusters(POINTS);
const K = 5;
const QUERIES: Record<string, { x: number; y: number }> = { A: { x: 70, y: 50 }, B: { x: 30, y: 50 }, C: { x: 50, y: 30 } };
const EFS = [1, 2, 4, 8, 16];
const TOTAL = POINTS.length;

type Method = "brute" | "hnsw" | "ivf";

export interface AnnProps {
  /** Which method switches to offer (default all three). */
  methods?: Method[];
  method?: Method;
  /** Show the graph edges of this layer (0 = base, 1, 2). Default off. */
  showLayer?: number;
}

export interface AnnState {
  method: Method;
  query: string;
  ef: number;
  nprobe: number;
  recall: number;
  checks: number;
  total: number;
  /** distance checks as a share of the whole cloud */
  share: number;
}

const LABEL: Record<Method, string> = { brute: "Scan everything", hnsw: "Layered graph", ivf: "Clusters" };
const CLUSTER_TINT = ["#5fb8e0", "#f0a060", "#e88aa8", "#e3c84a", "#4fc9a4", "#9aa6d8"];

export function AnnSearch({ props, onChange, revealed }: WidgetProps<AnnProps>) {
  const methods = props.methods ?? ["brute", "hnsw", "ivf"];
  const [method, setMethod] = useState<Method>(props.method ?? methods[0]);
  const [query, setQuery] = useState<string>("A");
  const [q, setQ] = useState(QUERIES.A);
  const [ef, setEf] = useState(1);
  const [nprobe, setNprobe] = useState(1);
  const [layer, setLayer] = useState<number>(props.showLayer ?? -1);
  const [upto, setUpto] = useState<number | null>(null);

  const truth = useMemo(() => exactTopK(POINTS, q, K), [q]);
  const result = useMemo(() => {
    if (method === "brute") return { ids: truth, visited: POINTS.map((p) => p.id), path: [] as { layer: number; node: number }[], probed: [] as number[] };
    if (method === "hnsw") return { ...graphSearch(GRAPH, POINTS, q, K, ef), probed: [] as number[] };
    const r = clusterSearch(CLUSTERS, POINTS, q, K, nprobe);
    return { ids: r.ids, visited: r.visited, path: [] as { layer: number; node: number }[], probed: r.probed };
  }, [method, q, ef, nprobe, truth]);

  const recall = recallOf(result.ids, truth);
  // IVF also compares the query with every centroid before scanning
  const checks = method === "ivf" ? result.visited.length + CLUSTERS.centres.length : result.visited.length;

  const report = (m: Method, qq: string, e: number, n: number, qpt: { x: number; y: number }) => {
    const t = exactTopK(POINTS, qpt, K);
    let ids = t;
    let c = TOTAL;
    if (m === "hnsw") {
      const r = graphSearch(GRAPH, POINTS, qpt, K, e);
      ids = r.ids;
      c = r.visited.length;
    } else if (m === "ivf") {
      const r = clusterSearch(CLUSTERS, POINTS, qpt, K, n);
      ids = r.ids;
      c = r.visited.length + CLUSTERS.centres.length;
    }
    onChange?.({ method: m, query: qq, ef: e, nprobe: n, recall: recallOf(ids, t), checks: c, total: TOTAL, share: c / TOTAL } satisfies AnnState);
  };

  const pickMethod = (m: Method) => {
    if (revealed) return;
    setMethod(m);
    setUpto(null);
    report(m, query, ef, nprobe, q);
  };
  const pickQuery = (name: string, pt: { x: number; y: number }) => {
    if (revealed) return;
    setQuery(name);
    setQ(pt);
    setUpto(null);
    report(method, name, ef, nprobe, pt);
  };
  const pickEf = (v: number) => {
    if (revealed) return;
    setEf(EFS[v]);
    setUpto(null);
    report(method, query, EFS[v], nprobe, q);
  };
  const pickProbe = (v: number) => {
    if (revealed) return;
    setNprobe(v);
    report(method, query, ef, v, q);
  };
  const clickPlot = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const pt = { x: Math.max(2, Math.min(98, ((e.clientX - r.left) / r.width) * 100)), y: Math.max(2, Math.min(98, ((e.clientY - r.top) / r.height) * 100)) };
    pickQuery("custom", pt);
  };

  const visitedSet = new Set(result.visited);
  const foundSet = new Set(result.ids);
  const truthSet = new Set(truth);
  const shownPath = method === "hnsw" ? (upto === null ? result.path : result.path.slice(0, upto)) : [];
  const edges: [number, number][] = [];
  if (method === "hnsw" && layer >= 0) {
    for (const [a, nbs] of GRAPH.layers[layer]) for (const b of nbs) if (a < b) edges.push([a, b]);
  }
  const recallPct = Math.round(recall * 100);

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {methods.length > 1 && (
          <Segmented label="Search method" value={method} disabled={revealed} options={methods.map((m) => ({ id: m, label: LABEL[m] }))} onChange={pickMethod} />
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-ink-3">Query</span>
          {Object.keys(QUERIES).map((name) => (
            <Pill key={name} on={query === name} disabled={revealed} onClick={() => pickQuery(name, QUERIES[name])} label={`Query ${name}`} className="!min-w-10 !px-3">
              {name}
            </Pill>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,220px)]">
        <div className="rounded-xl border border-line bg-surface-2 p-2">
          <svg viewBox="0 0 100 100" className="aspect-square w-full cursor-crosshair touch-manipulation" onClick={clickPlot} role="img" aria-label="Points in a plane. Tap to place the query.">
            {method === "ivf" &&
              CLUSTERS.centres.map((c, i) => {
                const probed = result.probed.includes(i);
                return (
                  <g key={i}>
                    {probed && <line x1={q.x} y1={q.y} x2={c.x} y2={c.y} stroke={CLUSTER_TINT[i]} strokeWidth={0.4} strokeDasharray="1.2 1" />}
                    <rect x={c.x - 1.9} y={c.y - 1.9} width={3.8} height={3.8} transform={`rotate(45 ${c.x} ${c.y})`} fill={CLUSTER_TINT[i]} fillOpacity={probed ? 1 : 0.45} stroke="var(--surface-2)" strokeWidth={0.4} />
                  </g>
                );
              })}
            {edges.map(([a, b]) => (
              <line key={`${a}-${b}`} x1={POINTS[a].x} y1={POINTS[a].y} x2={POINTS[b].x} y2={POINTS[b].y} stroke="var(--ink-3)" strokeOpacity={layer === 0 ? 0.3 : 0.55} strokeWidth={layer === 0 ? 0.25 : 0.4} />
            ))}
            {shownPath.slice(1).map((s, i) => {
              const a = POINTS[shownPath[i].node];
              const b = POINTS[s.node];
              if (a.id === b.id) return null;
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--brand)" strokeWidth={0.9} strokeLinecap="round" />;
            })}
            {POINTS.map((p) => {
              const isFound = foundSet.has(p.id);
              const isTruth = truthSet.has(p.id);
              const seen = visitedSet.has(p.id);
              const missed = method !== "brute" && isTruth && !isFound;
              const cl = method === "ivf" ? CLUSTERS.members.findIndex((m) => m.includes(p.id)) : -1;
              const probedCl = cl >= 0 && result.probed.includes(cl);
              return (
                <g key={p.id}>
                  {isTruth && <circle cx={p.x} cy={p.y} r={3.4} fill="none" stroke={missed ? "var(--bad)" : "var(--ink)"} strokeWidth={0.55} strokeDasharray={missed ? undefined : "1.2 1"} />}
                  <circle cx={p.x} cy={p.y} r={isFound ? 1.9 : 1.3} fill={isFound ? "var(--brand)" : probedCl ? CLUSTER_TINT[cl] : seen && method !== "brute" ? "var(--ink-2)" : "var(--ink-3)"} fillOpacity={isFound ? 1 : probedCl ? 0.9 : seen && method !== "brute" ? 0.85 : 0.45} />
                </g>
              );
            })}
            {method === "hnsw" && shownPath.length > 0 && (() => {
              const here = POINTS[shownPath[shownPath.length - 1].node];
              return <circle cx={here.x} cy={here.y} r={2.8} fill="none" stroke="var(--brand)" strokeWidth={0.9} />;
            })()}
            <g stroke="var(--ink)" strokeWidth={1} strokeLinecap="round">
              <line x1={q.x - 2.6} y1={q.y - 2.6} x2={q.x + 2.6} y2={q.y + 2.6} />
              <line x1={q.x - 2.6} y1={q.y + 2.6} x2={q.x + 2.6} y2={q.y - 2.6} />
            </g>
          </svg>
          <p className="mt-1 px-1 text-[11px] leading-snug text-ink-3">
            <span className="font-semibold text-ink">×</span> your query (tap the plot to move it). Dashed rings: the true 5 nearest. Lime: what this method returned.
            {method === "ivf" ? " Diamonds are cluster centres; coloured dots belong to the clusters that were visited." : method === "hnsw" ? " Grey dots were compared; the lime line is the walk." : ""}
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          {method === "hnsw" && (
            <>
              <Slider label="Candidates kept (ef)" value={EFS.indexOf(ef)} min={0} max={EFS.length - 1} disabled={revealed} onChange={pickEf} format={() => String(ef)} />
              <div>
                <Caption className="mb-1">Show graph layer</Caption>
                <Segmented
                  label="Graph layer"
                  value={layer}
                  disabled={revealed}
                  options={[
                    { id: -1, label: "Off" },
                    { id: 2, label: "Top" },
                    { id: 1, label: "Mid" },
                    { id: 0, label: "Base" },
                  ]}
                  onChange={(v) => setLayer(v)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn !h-10" disabled={revealed || (upto !== null && upto >= result.path.length)} onClick={() => setUpto(upto === null ? 1 : Math.min(result.path.length, upto + 1))}>
                  <Footprints className="h-4 w-4" /> {upto === null ? "Walk step by step" : "Next hop"}
                </button>
                {upto !== null && (
                  <button type="button" className="btn !h-10" onClick={() => setUpto(null)} aria-label="Show the whole walk">
                    <RotateCcw className="h-4 w-4" /> All
                  </button>
                )}
              </div>
            </>
          )}
          {method === "ivf" && <Slider label="Clusters visited (nprobe)" value={nprobe} min={1} max={4} disabled={revealed} onChange={pickProbe} />}
          {method === "brute" && <p className="text-sm text-ink-2">Every point is compared with the query. Always right; the cost grows with the size of the collection.</p>}
          <div className="flex flex-wrap gap-2">
            <Readout label="Distance checks" value={`${checks} / ${TOTAL}`} accent={method !== "brute"} />
            <Readout label="Recall@5" value={`${recallPct}%`} accent={recall === 1} />
          </div>
        </div>
      </div>

      <Note tone={recall === 1 ? "good" : "bad"} className="mt-3">
        {method === "brute"
          ? `All ${TOTAL} points checked: perfect recall, the slowest way.`
          : recall === 1
            ? `All 5 true neighbours found after ${checks} checks, ${Math.round((1 - checks / TOTAL) * 100)}% fewer than scanning everything.`
            : `${Math.round(recall * 5)} of the 5 true neighbours found (red rings were missed). Fewer checks, a worse answer: raise ${method === "hnsw" ? "ef" : "nprobe"} to trade speed for recall.`}
      </Note>
    </div>
  );
}

export function checkAnn(state: unknown, goal: Record<string, unknown>) {
  const st = state as AnnState | undefined;
  if (!st) return false;
  if (typeof goal.method === "string" && st.method !== goal.method) return false;
  if (typeof goal.query === "string" && st.query !== goal.query) return false;
  if (typeof goal.recall === "number" && st.recall < goal.recall) return false;
  if (typeof goal.maxChecks === "number" && st.checks > goal.maxChecks) return false;
  if (typeof goal.minNprobe === "number" && st.nprobe < goal.minNprobe) return false;
  if (typeof goal.missed === "boolean" && (st.recall < 1) !== goal.missed) return false;
  return true;
}
