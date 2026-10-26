"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Pill, Readout, Segmented } from "./ui";

/**
 * Serving a language model from one GPU. A request has a cold start (if the service had scaled
 * to zero), a prefill (reading the prompt) and a decode (one token per step). Batching shares each
 * decode step between several users: the GPU gets more total work done and each dollar goes
 * further, but every user's tokens arrive a little more slowly. Streaming does not make the
 * whole answer faster; it makes the *first* word arrive sooner.
 *
 * Numbers are a simple model (illustrative), not a benchmark.
 */

const BATCHES = [1, 2, 4, 8, 16, 32];
const PROMPT_TOKENS = 1000;
const OUT_TOKENS = 300;
const PREFILL_S = 0.35;
const COLD_S = 25;
const GPU_PER_HOUR = 2.5;
const stepS = (b: number) => (20 + 1.5 * b) / 1000;

export interface InferProps {
  /** Requirements for the "meets" flag. */
  minRate?: number;
  maxCost?: number;
  maxFirstS?: number;
  /** Fix some controls for focused questions. */
  startMode?: "warm" | "cold";
  hideBatch?: boolean;
  hideStart?: boolean;
  hideStreaming?: boolean;
}

export interface InferState {
  batch: number;
  streaming: boolean;
  cold: boolean;
  firstS: number;
  fullS: number;
  rate: number;
  throughput: number;
  cost: number;
  ok: boolean;
  /** what the user waits before seeing anything */
  seesFirstS: number;
}

function model(batch: number, streaming: boolean, cold: boolean, p: InferProps) {
  const t = stepS(batch);
  const coldS = cold ? COLD_S : 0;
  const firstS = coldS + PREFILL_S + t;
  const fullS = coldS + PREFILL_S + OUT_TOKENS * t;
  const rate = 1 / t;
  const throughput = batch / t;
  const cost = (GPU_PER_HOUR / (throughput * 3600)) * 1e6;
  const seesFirstS = streaming ? firstS : fullS;
  const ok = (p.minRate === undefined || rate >= p.minRate) && (p.maxCost === undefined || cost <= p.maxCost) && (p.maxFirstS === undefined || seesFirstS <= p.maxFirstS);
  return { t, coldS, firstS, fullS, rate, throughput, cost, ok, seesFirstS };
}

const fmtS = (s: number) => (s < 10 ? `${s.toFixed(2)} s` : `${s.toFixed(1)} s`);

export function InferenceLab({ props, onChange, revealed }: WidgetProps<InferProps>) {
  const [batch, setBatch] = useState(1);
  const [streaming, setStreaming] = useState(props.hideStreaming ? true : false);
  const [cold, setCold] = useState(props.startMode === "cold");

  const m = model(batch, streaming, cold, props);

  const report = (b: number, s: boolean, c: boolean) => {
    const mm = model(b, s, c, props);
    onChange?.({ batch: b, streaming: s, cold: c, firstS: mm.firstS, fullS: mm.fullS, rate: mm.rate, throughput: mm.throughput, cost: mm.cost, ok: mm.ok, seesFirstS: mm.seesFirstS } satisfies InferState);
  };
  const upd = (b: number, s: boolean, c: boolean) => {
    if (revealed) return;
    setBatch(b);
    setStreaming(s);
    setCold(c);
    report(b, s, c);
  };

  const total = m.fullS;
  const seg = (s: number) => `${Math.max(0.6, (s / total) * 100)}%`;

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        {!props.hideBatch && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-ink-3">Requests sharing the GPU</span>
            <Segmented label="Batch size" value={batch} disabled={revealed} options={BATCHES.map((b) => ({ id: b, label: String(b) }))} onChange={(b) => upd(b, streaming, cold)} />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {!props.hideStreaming && (
            <Pill on={streaming} disabled={revealed} onClick={() => upd(batch, !streaming, cold)}>
              Stream tokens
            </Pill>
          )}
          {!props.hideStart && (
            <Segmented
              label="Service state"
              value={cold ? "cold" : "warm"}
              disabled={revealed}
              options={[
                { id: "warm", label: "Warm" },
                { id: "cold", label: "Cold start" },
              ]}
              onChange={(v) => upd(batch, streaming, v === "cold")}
            />
          )}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
        <Caption className="mb-1">One request, start to finish</Caption>
        <div className="flex h-7 w-full overflow-hidden rounded-md bg-[var(--line-strong)]/50">
          {cold && <div title="Cold start" style={{ width: seg(COLD_S), background: "var(--bad)" }} className="opacity-80" />}
          <div title="Prefill" style={{ width: seg(PREFILL_S), background: "#4fa3df" }} />
          <div title="Decode" style={{ width: seg(OUT_TOKENS * m.t), background: "var(--brand)" }} />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[11.5px] text-ink-3">
          {cold && (
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-sm bg-[var(--bad)]" /> loading the model into GPU memory {COLD_S} s
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: "#4fa3df" }} /> reading the {PROMPT_TOKENS}-token prompt {PREFILL_S} s
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: "var(--brand)" }} /> writing {OUT_TOKENS} tokens, one every {Math.round(m.t * 1000)} ms
          </span>
        </div>

        <Caption className="mb-1 mt-3">What the user sees</Caption>
        <div className="relative h-7 w-full overflow-hidden rounded-md bg-[var(--line-strong)]/50">
          {streaming ? (
            <div className="absolute inset-y-0 rounded-md" style={{ left: `${(m.firstS / total) * 100}%`, right: 0, background: "linear-gradient(90deg, var(--brand), var(--brand))", opacity: 0.85 }} />
          ) : (
            <div className="absolute inset-y-0 right-0 w-1.5 rounded-md" style={{ background: "var(--brand)" }} />
          )}
        </div>
        <p className="mt-1.5 text-[12px] text-ink-2">
          {streaming ? `Words start appearing after ${fmtS(m.firstS)} and keep coming.` : `A blank screen for ${fmtS(m.fullS)}, then the whole answer at once.`}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="First word after" value={fmtS(m.seesFirstS)} accent={props.maxFirstS !== undefined && m.seesFirstS <= props.maxFirstS} />
        <Readout label="Whole answer after" value={fmtS(m.fullS)} />
        <Readout label="Per user" value={`${m.rate.toFixed(0)} tok/s`} accent={props.minRate !== undefined && m.rate >= props.minRate} />
        <Readout label="GPU total" value={`${m.throughput.toFixed(0)} tok/s`} />
        <Readout label="Cost" value={`$${m.cost.toFixed(2)} / M tokens`} accent={props.maxCost !== undefined && m.cost <= props.maxCost} />
      </div>
      {(props.minRate !== undefined || props.maxCost !== undefined || props.maxFirstS !== undefined) && (
        <Note tone={m.ok ? "good" : "bad"} className="mt-2">
          {"Goal: "}
          {[props.minRate !== undefined && `at least ${props.minRate} tok/s per user`, props.maxCost !== undefined && `at most $${props.maxCost.toFixed(2)} per million tokens`, props.maxFirstS !== undefined && `first words within ${props.maxFirstS} s`]
            .filter(Boolean)
            .join(", ")}
          {" — "}
          {m.ok ? "all met." : "not met yet."}
        </Note>
      )}
      <p className="mt-2 text-center text-[11px] text-ink-3">A ${GPU_PER_HOUR.toFixed(2)}/hour GPU in a simple model. Illustrative, not a benchmark.</p>
    </div>
  );
}

export function checkInferenceLab(state: unknown, goal: Record<string, unknown>) {
  const st = state as InferState | undefined;
  if (!st) return false;
  if (goal.ok === true && !st.ok) return false;
  if (typeof goal.cold === "boolean" && st.cold !== goal.cold) return false;
  if (typeof goal.streaming === "boolean" && st.streaming !== goal.streaming) return false;
  if (typeof goal.minBatch === "number" && st.batch < goal.minBatch) return false;
  return true;
}
