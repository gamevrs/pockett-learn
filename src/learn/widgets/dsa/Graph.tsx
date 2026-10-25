"use client";

import React, { useState } from "react";
import { ChevronRight, RotateCcw, Undo2 } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Readout, Segmented } from "./ui";

/**
 * A small graph: dots (nodes) joined by lines (edges). Two modes:
 * - "route": build a path from `start` by tapping neighbours one at a time.
 * - "bfs": expand breadth-first search one layer at a time; each node shows how many edges away it is.
 * Tapping a node in either mode also shows its neighbour list, the way a Python dict stores it.
 */
export interface GraphProps {
  /** x and y in 0–100 (y is drawn at 0.62 scale). */
  nodes: { id: string; x: number; y: number }[];
  edges: [string, string][];
  start: string;
  target?: string;
  modes?: ("route" | "bfs")[];
}

export interface GraphState {
  mode: "route" | "bfs";
  path: string[];
  layer: number;
  distances: Record<string, number>;
}

const SY = 0.62;

function neighbours(edges: [string, string][]) {
  const adj = new Map<string, string[]>();
  for (const [a, b] of edges) {
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  }
  for (const [k, v] of adj) adj.set(k, [...v].sort());
  return adj;
}

function distancesFrom(start: string, adj: Map<string, string[]>) {
  const dist: Record<string, number> = { [start]: 0 };
  const q = [start];
  for (let h = 0; h < q.length; h++) {
    for (const nb of adj.get(q[h]) ?? []) {
      if (nb in dist) continue;
      dist[nb] = dist[q[h]] + 1;
      q.push(nb);
    }
  }
  return dist;
}

export function Graph({ props, onChange, revealed }: WidgetProps<GraphProps>) {
  const modes = props.modes ?? ["route"];
  const adj = neighbours(props.edges);
  const dist = distancesFrom(props.start, adj);
  const [mode, setMode] = useState<"route" | "bfs">(modes[0]);
  const [path, setPath] = useState<string[]>([props.start]);
  const [layer, setLayer] = useState(0);
  const [focus, setFocus] = useState<string>(props.start);
  const [bump, setBump] = useState<string | null>(null);
  const maxLayer = Math.max(...Object.values(dist));
  const byId = new Map(props.nodes.map((n) => [n.id, n]));
  const lastNode = path[path.length - 1];

  const report = (p: string[], l: number, m = mode) =>
    onChange?.({ mode: m, path: p, layer: l, distances: Object.fromEntries(Object.entries(dist).filter(([, d]) => d <= l)) } satisfies GraphState);

  const tap = (id: string) => {
    setFocus(id);
    if (revealed || mode !== "route") return;
    if (id === lastNode && path.length > 1) {
      const p = path.slice(0, -1);
      setPath(p);
      report(p, layer);
      return;
    }
    if (path.includes(id)) return;
    if (!(adj.get(lastNode) ?? []).includes(id)) {
      setBump(id);
      return;
    }
    setBump(null);
    const p = [...path, id];
    setPath(p);
    report(p, layer);
  };
  const undo = () => {
    if (path.length <= 1) return;
    const p = path.slice(0, -1);
    setPath(p);
    report(p, layer);
  };
  const reset = () => {
    setPath([props.start]);
    setLayer(0);
    setBump(null);
    onChange?.(undefined);
  };
  const nextLayer = () => {
    const l = Math.min(maxLayer, layer + 1);
    setLayer(l);
    report(path, l);
  };

  const pathEdges = new Set(path.slice(1).map((id, i) => [path[i], id].sort().join("|")));
  const edgesDone = path.length - 1;

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        {modes.length > 1 && (
          <Segmented
            label="Mode"
            value={mode}
            onChange={(m) => {
              setMode(m);
              report(path, layer, m);
            }}
            disabled={revealed}
            options={modes.map((m) => ({ id: m, label: m === "route" ? "Find a route" : "Breadth-first" }))}
          />
        )}
        {mode === "route" ? (
          <>
            <Readout label="Edges used" value={edgesDone} accent />
            {props.target && <span className="text-sm text-ink-2">{lastNode === props.target ? `Reached ${props.target}.` : `Get from ${props.start} to ${props.target}.`}</span>}
          </>
        ) : (
          <Readout label="Layer" value={layer} accent />
        )}
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-line bg-surface-2">
        <svg viewBox={`0 0 100 ${100 * SY}`} className="block h-auto w-full" role="img" aria-label="Graph of nodes and edges">
          {props.edges.map(([a, b]) => {
            const na = byId.get(a)!;
            const nb = byId.get(b)!;
            const on = mode === "route" ? pathEdges.has([a, b].sort().join("|")) : (dist[a] ?? 99) <= layer && (dist[b] ?? 99) <= layer && Math.abs(dist[a] - dist[b]) === 1;
            return <line key={`${a}-${b}`} x1={na.x} y1={na.y * SY} x2={nb.x} y2={nb.y * SY} stroke={on ? "var(--brand)" : "var(--line-strong)"} strokeWidth={on ? 1.3 : 0.6} strokeLinecap="round" />;
          })}
          {props.nodes.map((n) => {
            const inPath = mode === "route" && path.includes(n.id);
            const isLast = mode === "route" && n.id === lastNode;
            const d = dist[n.id];
            const seen = mode === "bfs" && d !== undefined && d <= layer;
            const front = mode === "bfs" && d === layer;
            const canStep = mode === "route" && !revealed && (adj.get(lastNode) ?? []).includes(n.id) && !inPath;
            const fill = isLast || front ? "var(--primary)" : inPath || seen ? "var(--tint)" : "var(--surface)";
            const stroke = inPath || seen ? "var(--brand)" : canStep ? "var(--brand)" : bump === n.id ? "var(--bad)" : "var(--line-strong)";
            return (
              <g key={n.id} onClick={() => tap(n.id)} className="cursor-pointer" role="button" aria-label={`Node ${n.id}`}>
                <circle cx={n.x} cy={n.y * SY} r={7} fill="transparent" />
                <circle cx={n.x} cy={n.y * SY} r={4.6} fill={fill} stroke={stroke} strokeWidth={canStep ? 0.8 : 0.55} strokeDasharray={canStep ? "1.4 0.9" : undefined} />
                <text x={n.x} y={n.y * SY + 1.5} textAnchor="middle" fontSize={4} fontWeight={700} fontFamily="var(--font-mono)" fill={isLast || front ? "var(--primary-ink)" : "var(--ink)"}>
                  {n.id}
                </text>
                {seen && (
                  <text x={n.x + 5.2} y={n.y * SY - 4} fontSize={3} fontWeight={700} fontFamily="var(--font-mono)" fill="var(--brand)">
                    {d}
                  </text>
                )}
                {(n.id === props.target || n.id === props.start) && mode === "route" && (
                  <text x={n.x} y={n.y * SY + 9.6} textAnchor="middle" fontSize={2.6} fontFamily="var(--font-sans)" fill="var(--ink-3)">
                    {n.id === props.start ? "start" : "goal"}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 rounded-xl bg-surface-2 px-3 py-2 font-mono text-[0.78rem] text-ink-2" aria-live="polite">
        {mode === "route" && bump ? (
          <span className="font-sans text-sm">
            {bump} isn&apos;t joined to {lastNode}. From {lastNode} you can go to {(adj.get(lastNode) ?? []).join(", ")}.
          </span>
        ) : mode === "route" ? (
          <>
            <span className="text-ink-3">route = </span>
            {JSON.stringify(path).replace(/,/g, ", ")}
            <br />
            <span className="text-ink-3">graph[&quot;{lastNode}&quot;] = </span>
            {JSON.stringify(adj.get(lastNode) ?? []).replace(/,/g, ", ")}
          </>
        ) : (
          <>
            graph[&quot;{focus}&quot;] = {JSON.stringify(adj.get(focus) ?? []).replace(/,/g, ", ")}
          </>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {mode === "route" ? (
          <button type="button" className="btn !h-10" onClick={undo} disabled={revealed || path.length <= 1}>
            <Undo2 className="h-4 w-4" /> Back one
          </button>
        ) : (
          <button type="button" className={`btn ${layer >= maxLayer ? "" : "btn-primary"} !h-10 flex-1 sm:flex-none sm:!px-5`} onClick={nextLayer} disabled={layer >= maxLayer}>
            Next layer <ChevronRight className="h-4 w-4" />
          </button>
        )}
        <button type="button" className="btn btn-ghost ml-auto !h-10 !w-10 !p-0" onClick={reset} disabled={revealed || (path.length === 1 && layer === 0)} aria-label="Start over" title="Start over">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function checkGraph(state: unknown, goal: Record<string, unknown>) {
  const s = state as GraphState | undefined;
  if (!s) return false;
  if (typeof goal.to === "string" && s.path[s.path.length - 1] !== goal.to) return false;
  if (typeof goal.maxEdges === "number" && s.path.length - 1 > goal.maxEdges) return false;
  if (typeof goal.layer === "number" && s.layer < goal.layer) return false;
  return true;
}
