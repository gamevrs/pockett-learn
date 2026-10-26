"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Segmented, Slider } from "./ui";

/**
 * A pretend embedding space with two dimensions (real ones have hundreds or thousands). Every
 * phrase is an arrow from the origin; what a phrase *means* is the direction it points in. Pick a
 * query and see who is closest, by cosine similarity (angle) or by straight-line distance, and
 * how many neighbours you keep (k).
 */

type Topic = "bike" | "library" | "clinic" | "mixed";
interface Entry {
  id: string;
  topic: Topic;
  /** direction in degrees, and length of the arrow */
  deg: number;
  len: number;
}

export const VOCAB: Entry[] = [
  { id: "flat tyre", topic: "bike", deg: 30, len: 8.5 },
  { id: "puncture patch", topic: "bike", deg: 36, len: 6.5 },
  { id: "inner tube", topic: "bike", deg: 21, len: 7.5 },
  { id: "brake pads", topic: "bike", deg: 11, len: 8 },
  { id: "chain oil", topic: "bike", deg: 45, len: 5 },
  { id: "repair fee", topic: "mixed", deg: 64, len: 6.5 },
  { id: "damaged book", topic: "mixed", deg: 84, len: 7 },
  { id: "late fee", topic: "library", deg: 99, len: 6 },
  { id: "overdue book", topic: "library", deg: 112, len: 8.5 },
  { id: "borrow a novel", topic: "library", deg: 119, len: 4 },
  { id: "renew a loan", topic: "library", deg: 126, len: 7 },
  { id: "library card", topic: "library", deg: 138, len: 5.5 },
  { id: "book appointment", topic: "clinic", deg: 203, len: 8.5 },
  { id: "reschedule a visit", topic: "clinic", deg: 214, len: 6.5 },
  { id: "flu symptoms", topic: "clinic", deg: 232, len: 7.5 },
  { id: "repeat prescription", topic: "clinic", deg: 224, len: 5 },
];

// rounded so the server and the browser print identical numbers (Math.cos can differ in the last digit)
const r3 = (v: number) => Math.round(v * 1000) / 1000;
const xy = (e: Entry) => ({ x: r3(e.len * Math.cos((e.deg * Math.PI) / 180)), y: r3(e.len * Math.sin((e.deg * Math.PI) / 180)) });
export function cosine(a: { x: number; y: number }, b: { x: number; y: number }) {
  return (a.x * b.x + a.y * b.y) / (Math.hypot(a.x, a.y) * Math.hypot(b.x, b.y));
}

const TOPIC_COLOUR: Record<Topic, string> = { bike: "var(--brand)", library: "#4fa3df", clinic: "#e8924a", mixed: "var(--ink-3)" };
const TOPIC_NAME: Record<Topic, string> = { bike: "bike repair", library: "library", clinic: "clinic", mixed: "could be either" };

export interface EmbeddingSpaceProps {
  /** Starting query phrase (default none picked). */
  query?: string;
  k?: number;
  /** Offer the cosine / distance switch. */
  metricToggle?: boolean;
  /** Hide the k slider and fix k. */
  fixedK?: boolean;
}

export interface EmbeddingSpaceState {
  query: string | null;
  k: number;
  metric: "cosine" | "distance";
  top: string[];
  /** every neighbour kept has the same topic as the query */
  pure: boolean;
  nearest: string | null;
}

const compute = (query: string | null, k: number, metric: "cosine" | "distance") => {
  const q = VOCAB.find((v) => v.id === query);
  if (!q) return { rows: [], top: [] as string[], pure: false, nearest: null as string | null };
  const qp = xy(q);
  const rows = VOCAB.filter((v) => v.id !== q.id)
    .map((v) => ({ v, cos: cosine(qp, xy(v)), d: Math.hypot(qp.x - xy(v).x, qp.y - xy(v).y) }))
    .sort((a, b) => (metric === "cosine" ? b.cos - a.cos : a.d - b.d));
  const top = rows.slice(0, k).map((r) => r.v.id);
  return { rows, top, pure: rows.slice(0, k).every((r) => r.v.topic === q.topic), nearest: top[0] ?? null };
};

export function EmbeddingSpace({ props, onChange, revealed }: WidgetProps<EmbeddingSpaceProps>) {
  const [query, setQuery] = useState<string | null>(props.query ?? null);
  const [k, setK] = useState(props.k ?? 3);
  const [metric, setMetric] = useState<"cosine" | "distance">("cosine");

  const { rows, top, pure, nearest } = compute(query, k, metric);
  const q = VOCAB.find((v) => v.id === query);

  const report = (qq: string | null, kk: number, m: "cosine" | "distance") => {
    const c = compute(qq, kk, m);
    onChange?.({ query: qq, k: kk, metric: m, top: c.top, pure: c.pure, nearest: c.nearest } satisfies EmbeddingSpaceState);
  };
  const pick = (id: string) => {
    if (revealed) return;
    setQuery(id);
    report(id, k, metric);
  };
  const setKk = (v: number) => {
    if (revealed) return;
    setK(v);
    report(query, v, metric);
  };
  const setMm = (m: "cosine" | "distance") => {
    if (revealed) return;
    setMetric(m);
    report(query, k, m);
  };

  const topSet = new Set(top);
  const maxCos = 1;

  return (
    <div className="w-full max-w-2xl">
      <div className="grid items-start gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
        <div className="rounded-xl border border-line bg-surface-2 p-2">
          <svg viewBox="-10 -10 20 20" className="aspect-square w-full touch-manipulation" role="img" aria-label="Phrases drawn as arrows from the centre. Tap a dot to make it the query. Numbered dots are its nearest neighbours.">
            {[3, 6, 9].map((r) => (
              <circle key={r} cx={0} cy={0} r={r} fill="none" stroke="var(--line-strong)" strokeWidth={0.05} />
            ))}
            <line x1={-10} y1={0} x2={10} y2={0} stroke="var(--line-strong)" strokeWidth={0.05} />
            <line x1={0} y1={-10} x2={0} y2={10} stroke="var(--line-strong)" strokeWidth={0.05} />
            {VOCAB.map((v) => {
              const p = xy(v);
              const isQ = v.id === query;
              const inTop = topSet.has(v.id);
              const dim = query !== null && !isQ && !inTop;
              return (
                <g key={v.id} opacity={dim ? 0.4 : 1}>
                  <line x1={0} y1={0} x2={p.x} y2={-p.y} stroke={TOPIC_COLOUR[v.topic]} strokeWidth={isQ ? 0.14 : inTop ? 0.1 : 0.05} strokeOpacity={isQ || inTop ? 0.9 : 0.5} />
                  <circle cx={p.x} cy={-p.y} r={isQ ? 0.55 : inTop ? 0.78 : 0.3} fill={TOPIC_COLOUR[v.topic]} stroke={isQ ? "var(--ink)" : inTop ? "var(--surface-2)" : "none"} strokeWidth={isQ ? 0.14 : 0.1} />
                  {inTop && (
                    <text x={p.x} y={-p.y + 0.3} textAnchor="middle" fontSize={0.9} fontWeight={700} fill="#111" style={{ pointerEvents: "none" }}>
                      {top.indexOf(v.id) + 1}
                    </text>
                  )}
                  {/* a roomy invisible target so a thumb can hit it */}
                  <circle cx={p.x} cy={-p.y} r={1.3} fill="transparent" className="cursor-pointer" onClick={() => pick(v.id)}>
                    <title>{v.id}</title>
                  </circle>
                  {isQ && (
                    <text x={p.x} y={-p.y - 0.95} textAnchor="middle" fontSize={0.85} fontWeight={700} fill="var(--ink)" stroke="var(--surface-2)" strokeWidth={0.25} paintOrder="stroke" style={{ pointerEvents: "none" }}>
                      {v.id}
                    </text>
                  )}
                </g>
              );
            })}
            <circle cx={0} cy={0} r={0.25} fill="var(--ink)" />
          </svg>
          <div className="flex flex-wrap gap-x-3 gap-y-1 px-1 pt-1 text-[11px] text-ink-3">
            {(["bike", "library", "clinic", "mixed"] as Topic[]).map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: TOPIC_COLOUR[t] }} />
                {TOPIC_NAME[t]}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <label className="block">
            <Caption className="mb-1">Query phrase</Caption>
            <select
              value={query ?? ""}
              disabled={revealed}
              onChange={(e) => e.target.value && pick(e.target.value)}
              className="h-10 w-full rounded-lg border border-line bg-surface px-2 text-sm text-ink"
            >
              <option value="">Pick a phrase, or tap a dot</option>
              {VOCAB.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id}
                </option>
              ))}
            </select>
          </label>
          {props.metricToggle && (
            <div>
              <Caption className="mb-1">Closeness measured by</Caption>
              <Segmented
                label="Closeness"
                value={metric}
                disabled={revealed}
                options={[
                  { id: "cosine", label: "Angle" },
                  { id: "distance", label: "Distance" },
                ]}
                onChange={setMm}
              />
            </div>
          )}
          {!props.fixedK && <Slider label="Neighbours kept (k)" value={k} min={1} max={6} disabled={revealed} onChange={setKk} />}
          <div className="rounded-lg border border-line bg-surface p-2">
            {rows.length === 0 ? (
              <p className="px-1 py-2 text-sm text-ink-3">Pick a query to rank the other phrases.</p>
            ) : (
              <ol className="grid gap-1">
                {rows.slice(0, 8).map((r, i) => (
                  <li key={r.v.id} className={`rounded-md px-1.5 py-1 ${i < k ? "bg-tint" : ""}`}>
                    <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                      <span className={i < k ? "font-semibold text-ink" : "text-ink-3"}>{r.v.id}</span>
                      <span className="font-mono tabular-nums text-ink-2">{metric === "cosine" ? r.cos.toFixed(2) : r.d.toFixed(1)}</span>
                    </div>
                    <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-[var(--line-strong)]">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(0, metric === "cosine" ? r.cos / maxCos : 1 - r.d / 20) * 100}%`, background: TOPIC_COLOUR[r.v.topic] }} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Metric" value={metric === "cosine" ? "cosine similarity" : "straight-line distance"} />
        {q && <Readout label="Query" value={q.id} accent />}
        {q && nearest && <Readout label="Nearest" value={nearest} />}
      </div>
      {q && (
        <Note tone={pure ? "good" : "neutral"} className="mt-2">
          {pure
            ? `All ${k} neighbours are about ${TOPIC_NAME[q.topic]}.`
            : `With k = ${k}, at least one neighbour drifts into another topic: ${rows
                .slice(0, k)
                .filter((r) => r.v.topic !== q.topic)
                .map((r) => r.v.id)
                .join(", ")}.`}
        </Note>
      )}
    </div>
  );
}

export function checkEmbeddingSpace(state: unknown, goal: Record<string, unknown>) {
  const st = state as EmbeddingSpaceState | undefined;
  if (!st) return false;
  if (typeof goal.query === "string" && st.query !== goal.query) return false;
  if (typeof goal.k === "number" && st.k !== goal.k) return false;
  if (typeof goal.minK === "number" && st.k < goal.minK) return false;
  if (goal.pure === true && !st.pure) return false;
  if (goal.pure === false && st.pure) return false;
  if (typeof goal.nearest === "string" && st.nearest !== goal.nearest) return false;
  if (typeof goal.metric === "string" && st.metric !== goal.metric) return false;
  return true;
}
