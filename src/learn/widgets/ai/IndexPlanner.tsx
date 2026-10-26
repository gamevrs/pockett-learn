"use client";

import React, { useState } from "react";
import { Check, X } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Segmented } from "./ui";

/**
 * A back-of-the-envelope planner for a vector collection. Four ways to store and search it, and
 * a rough model of what each costs in latency, memory, recall and build time. The numbers are
 * order-of-magnitude, not benchmarks, but their *shape* is real: exact scans grow with the data,
 * graphs cost memory, clusters cost recall, compression costs a little of both.
 */

export type IndexKind = "exact" | "hnsw" | "ivf" | "ivfpq";

export interface Estimate {
  ms: number;
  bytes: number;
  recall: number;
  buildS: number;
}

export function estimate(kind: IndexKind, n: number, dims: number): Estimate {
  const raw = n * dims * 4;
  const ivfMs = 0.5 + (8 * Math.sqrt(n) * dims) / 4e6;
  switch (kind) {
    case "exact":
      return { ms: (n * dims) / 4e6, bytes: raw, recall: 1, buildS: 0 };
    case "hnsw":
      return { ms: (0.6 + 0.35 * Math.log2(Math.max(2, n / 1000))) * (0.7 + (0.3 * dims) / 768), bytes: n * (dims * 4 + 128), recall: 0.97, buildS: n / 1500 };
    case "ivf":
      return { ms: ivfMs, bytes: raw * 1.01, recall: 0.92, buildS: n / 20000 };
    case "ivfpq":
      return { ms: ivfMs * 0.8 + 1, bytes: n * 72 + 4e6, recall: 0.85, buildS: n / 8000 };
  }
}

const NAMES: Record<IndexKind, { title: string; sub: string }> = {
  exact: { title: "Plain column, exact scan", sub: "compare with every row" },
  hnsw: { title: "Graph index (HNSW)", sub: "walk a layered graph" },
  ivf: { title: "Cluster index (IVF)", sub: "visit the nearest clusters" },
  ivfpq: { title: "Clusters + compression", sub: "IVF with product quantization" },
};

const fmtMs = (ms: number) => (ms < 1 ? `${ms.toFixed(2)} ms` : ms < 100 ? `${ms.toFixed(1)} ms` : ms < 10000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(0)} s`);
const fmtBytes = (b: number) => (b >= 1e12 ? `${(b / 1e12).toFixed(1)} TB` : b >= 1e9 ? `${(b / 1e9).toFixed(b >= 1e10 ? 0 : 1)} GB` : `${Math.max(1, Math.round(b / 1e6))} MB`);
const fmtBuild = (s: number) => (s < 1 ? "none" : s < 90 ? `${Math.round(s)} s` : s < 5400 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`);
const fmtN = (n: number) => (n >= 1e6 ? `${n / 1e6}M` : `${n / 1e3}k`);

const N_CHOICES = [10_000, 100_000, 1_000_000, 10_000_000, 50_000_000];
const D_CHOICES = [384, 768, 1536];

export interface IndexPlannerProps {
  /** Fix the collection size / dimensions instead of offering a switch. */
  n?: number;
  dims?: number;
  /** Latency budget per query, memory the box has, minimum recall (0..1). */
  budgetMs: number;
  ramGb: number;
  minRecall: number;
}

export interface IndexPlannerState {
  method: IndexKind | null;
  n: number;
  dims: number;
  meets: boolean;
  failing: string[];
}

function failures(e: Estimate, p: IndexPlannerProps): string[] {
  const out: string[] = [];
  if (e.ms > p.budgetMs) out.push("too slow");
  if (e.bytes > p.ramGb * 1e9) out.push("too big for memory");
  if (e.recall < p.minRecall) out.push("recall too low");
  return out;
}

export function IndexPlanner({ props, onChange, revealed }: WidgetProps<IndexPlannerProps>) {
  const [n, setN] = useState(props.n ?? 1_000_000);
  const [dims, setDims] = useState(props.dims ?? 768);
  const [method, setMethod] = useState<IndexKind | null>(null);

  const report = (m: IndexKind | null, nn: number, dd: number) => {
    const f = m ? failures(estimate(m, nn, dd), props) : ["nothing chosen"];
    onChange?.({ method: m, n: nn, dims: dd, meets: m !== null && f.length === 0, failing: f } satisfies IndexPlannerState);
  };

  const pick = (m: IndexKind) => {
    if (revealed) return;
    setMethod(m);
    report(m, n, dims);
  };
  const pickN = (v: number) => {
    if (revealed) return;
    setN(v);
    report(method, v, dims);
  };
  const pickD = (v: number) => {
    if (revealed) return;
    setDims(v);
    report(method, n, v);
  };

  const sel = method ? estimate(method, n, dims) : null;
  const selFail = sel ? failures(sel, props) : [];

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {props.n === undefined ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-3">Vectors</span>
            <Segmented label="Number of vectors" value={n} disabled={revealed} options={N_CHOICES.map((v) => ({ id: v, label: fmtN(v) }))} onChange={pickN} />
          </div>
        ) : (
          <Readout label="Vectors" value={fmtN(n)} />
        )}
        {props.dims === undefined ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-3">Dimensions</span>
            <Segmented label="Dimensions per vector" value={dims} disabled={revealed} options={D_CHOICES.map((v) => ({ id: v, label: String(v) }))} onChange={pickD} />
          </div>
        ) : (
          <Readout label="Dimensions" value={dims} />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Caption className="!text-ink-2">Must hold</Caption>
        <Readout label="Latency" value={`≤ ${props.budgetMs} ms`} accent />
        <Readout label="Memory" value={`≤ ${props.ramGb} GB`} accent />
        <Readout label="Recall" value={`≥ ${Math.round(props.minRecall * 100)}%`} accent />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {(Object.keys(NAMES) as IndexKind[]).map((kind) => {
          const e = estimate(kind, n, dims);
          const f = failures(e, props);
          const on = method === kind;
          const cell = (bad: boolean, label: string, value: string) => (
            <div className="min-w-0">
              <p className="text-[10.5px] uppercase tracking-[0.06em] text-ink-3">{label}</p>
              <p className={`font-mono text-[13px] font-semibold tabular-nums ${bad ? "text-bad" : "text-ink"}`}>{value}</p>
            </div>
          );
          return (
            <button
              key={kind}
              type="button"
              disabled={revealed}
              aria-pressed={on}
              onClick={() => pick(kind)}
              className={`rounded-xl border p-3 text-left transition-colors ${on ? "border-[var(--brand)] bg-tint ring-1 ring-[var(--brand)]" : "border-line bg-surface hover:border-[var(--line-strong)] hover:bg-surface-2"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{NAMES[kind].title}</p>
                  <p className="text-[12px] text-ink-3">{NAMES[kind].sub}</p>
                </div>
                {f.length === 0 ? <Check className="h-4 w-4 shrink-0 text-good" aria-label="Meets every requirement" /> : <X className="h-4 w-4 shrink-0 text-bad" aria-label="Misses a requirement" />}
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {cell(e.ms > props.budgetMs, "Latency", fmtMs(e.ms))}
                {cell(e.bytes > props.ramGb * 1e9, "Memory", fmtBytes(e.bytes))}
                {cell(e.recall < props.minRecall, "Recall", `${Math.round(e.recall * 100)}%`)}
                {cell(false, "Build", fmtBuild(e.buildS))}
              </div>
            </button>
          );
        })}
      </div>

      <Note tone={method === null ? "neutral" : selFail.length === 0 ? "good" : "bad"} className="mt-3">
        {method === null
          ? "Tap a design to check it against the requirements. Red numbers break a requirement."
          : selFail.length === 0
            ? `${NAMES[method].title} meets every requirement.`
            : `${NAMES[method].title}: ${selFail.join(", ")}.`}
      </Note>
      <p className="mt-2 text-center text-[11px] text-ink-3">Rough model for one query on one machine: orders of magnitude, not benchmarks.</p>
    </div>
  );
}

export function checkIndexPlanner(state: unknown, goal: Record<string, unknown>) {
  const st = state as IndexPlannerState | undefined;
  if (!st) return false;
  if (goal.meets === true && !st.meets) return false;
  if (typeof goal.method === "string" && st.method !== goal.method) return false;
  return true;
}
