"use client";

import React, { useState } from "react";
import { CheckCircle2, ListOrdered, Sparkles } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Pill, Readout, Segmented, Slider } from "./ui";
import { ARTICLES, HYBRID_QUERIES, fuse, goldRank, type FuseMethod } from "./hybrid-core";

/**
 * Hybrid search on a bike help desk. Each article has a keyword score and a meaning (vector)
 * score for the query. A slider mixes them (0 = keywords only, 1 = meaning only), either by
 * adding normalised scores or by fusing *ranks* (reciprocal rank fusion). An optional reranker
 * then re-reads the top four with the query beside each article and reorders them.
 */

export interface HybridProps {
  query?: string;
  /** Offer only some fusion methods (default both). */
  methods?: FuseMethod[];
  /** Hide the reranker switch. */
  noRerank?: boolean;
}

export interface HybridState {
  query: string;
  method: FuseMethod;
  alpha: number;
  rerank: boolean;
  goldRank: number;
  top: string;
}

export function HybridSearch({ props, onChange, revealed }: WidgetProps<HybridProps>) {
  const methods = props.methods ?? (["weighted", "rrf"] as FuseMethod[]);
  const [qid, setQid] = useState(props.query ?? HYBRID_QUERIES[0].id);
  const [method, setMethod] = useState<FuseMethod>(methods[0]);
  const [alpha, setAlpha] = useState(5);
  const [rerank, setRerank] = useState(false);

  const q = HYBRID_QUERIES.find((x) => x.id === qid)!;
  const rows = fuse(q, method, alpha / 10, rerank);
  const gr = goldRank(rows, q.gold);

  const report = (qq: string, m: FuseMethod, a: number, r: boolean) => {
    const qu = HYBRID_QUERIES.find((x) => x.id === qq)!;
    const rs = fuse(qu, m, a / 10, r);
    onChange?.({ query: qq, method: m, alpha: a / 10, rerank: r, goldRank: goldRank(rs, qu.gold), top: rs[0].id } satisfies HybridState);
  };
  const upd = (qq: string, m: FuseMethod, a: number, r: boolean) => {
    if (revealed) return;
    setQid(qq);
    setMethod(m);
    setAlpha(a);
    setRerank(r);
    report(qq, m, a, r);
  };

  const title = (id: string) => ARTICLES.find((a) => a.id === id)!.title;
  const maxFused = Math.max(...rows.map((r) => r.fused), 1e-9);

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-xs text-ink-3">Query</span>
        {HYBRID_QUERIES.map((x, i) => (
          <Pill key={x.id} on={qid === x.id} disabled={revealed} onClick={() => upd(x.id, method, alpha, rerank)} label={`Query ${i + 1}`} className="!min-w-10 !px-3">
            {i + 1}
          </Pill>
        ))}
      </div>
      <p className="mt-2 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink">
        <span className="font-mono">&ldquo;{q.text}&rdquo;</span>
        <span className="block text-[12px] text-ink-3">{q.why}</span>
      </p>

      <div className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
        <div>
          <Slider label="Keywords  ←  mix  →  Meaning" value={alpha} min={0} max={10} disabled={revealed} onChange={(v) => upd(qid, method, v, rerank)} format={(v) => (v === 0 ? "keywords only" : v === 10 ? "meaning only" : `${10 - v}:${v}`)} />
        </div>
        <div className="flex flex-wrap items-end gap-2">
          {methods.length > 1 && (
            <Segmented
              label="How scores are combined"
              value={method}
              disabled={revealed}
              options={methods.map((m) => ({ id: m, label: m === "weighted" ? "Add scores" : "Fuse ranks" }))}
              onChange={(m) => upd(qid, m, alpha, rerank)}
            />
          )}
          {!props.noRerank && (
            <Pill on={rerank} disabled={revealed} onClick={() => upd(qid, method, alpha, !rerank)}>
              <Sparkles className="h-4 w-4" /> Rerank top 4
            </Pill>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-2">
        <div className="px-1.5 pb-1.5">
          <Caption className="!mb-0">Result order</Caption>
          <p className="text-[11px] text-ink-3">Under each title: its place in the keyword list, in the meaning list{rerank ? ", and the reranker's score" : ""}.</p>
        </div>
        <ol className="grid gap-1">
          {rows.slice(0, 6).map((r, i) => {
            const gold = r.id === q.gold;
            return (
              <li key={r.id} className={`grid grid-cols-[1.6rem_minmax(0,1fr)] items-start gap-x-2 rounded-lg border px-1.5 py-1.5 ${gold ? "border-[var(--brand)] bg-tint" : "border-line bg-surface"}`}>
                <span className="font-mono text-sm font-semibold tabular-nums text-ink-2">{i + 1}</span>
                <div className="min-w-0">
                  <p className="flex items-start gap-1.5 text-[13px] leading-tight text-ink">
                    <span className="min-w-0">{title(r.id)}</span>
                    {gold && <CheckCircle2 className="mt-px h-3.5 w-3.5 shrink-0 text-brand" aria-label="This is the article that answers the query" />}
                  </p>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--line-strong)]">
                    <div className="h-full rounded-full" style={{ width: `${(r.fused / maxFused) * 100}%`, background: gold ? "var(--brand)" : "var(--ink-3)" }} />
                  </div>
                  <p className="mt-1 font-mono text-[11px] tabular-nums text-ink-3">
                    keyword #{r.kwRank} · meaning #{r.vecRank}
                    {rerank && r.rerank !== null ? ` · reranker ${r.rerank.toFixed(2)}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Readout label="Answering article is at" value={`#${gr}`} accent={gr === 1} />
        <ListOrdered className="h-4 w-4 text-ink-3" aria-hidden />
        <span className="text-[12px] text-ink-3">{method === "rrf" ? "score = weight ÷ (60 + rank), summed over both lists" : "score = weighted sum of each list's 0 to 1 scores"}</span>
      </div>
      <Note tone={gr === 1 ? "good" : "bad"} className="mt-2">
        {gr === 1 ? "The right article comes first." : `The right article is only #${gr}. The model will mostly read what is on top, so this query is being failed.`}
      </Note>
    </div>
  );
}

export function checkHybridSearch(state: unknown, goal: Record<string, unknown>) {
  const st = state as HybridState | undefined;
  if (!st) return false;
  if (typeof goal.query === "string" && st.query !== goal.query) return false;
  if (typeof goal.method === "string" && st.method !== goal.method) return false;
  if (typeof goal.goldRank === "number" && st.goldRank !== goal.goldRank) return false;
  if (typeof goal.rerank === "boolean" && st.rerank !== goal.rerank) return false;
  if (typeof goal.minAlpha === "number" && st.alpha < goal.minAlpha) return false;
  if (typeof goal.maxAlpha === "number" && st.alpha > goal.maxAlpha) return false;
  return true;
}
