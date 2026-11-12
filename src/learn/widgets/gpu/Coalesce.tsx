"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { WARP, WORDS_PER_SEGMENT, coalesce, type Pattern } from "./sim";
import { Caption, Meter, Note, Readout, Seg, Stepper } from "./ui";

export interface CoalesceProps {
  pattern?: Pattern;
  stride?: number;
  /** Hide the controls. */
  fixed?: boolean;
}

export interface CoalesceState {
  pattern: Pattern;
  stride: number;
  offset: number;
  transactions: number;
  /** Percent of the moved bytes the warp actually uses. */
  efficiency: number;
}

const PATTERNS: { value: Pattern; label: string }[] = [
  { value: "contiguous", label: "Side by side" },
  { value: "stride", label: "Strided" },
  { value: "reverse", label: "Reversed" },
  { value: "random", label: "Scattered" },
];

const MAX_SHOWN = 36;

/** 32 threads of a warp each read one 4-byte number: how many 128-byte memory transactions does that take? */
export function Coalesce({ props, onChange }: WidgetProps<CoalesceProps>) {
  const [pattern, setPattern] = useState<Pattern>(props.pattern ?? "contiguous");
  const [stride, setStride] = useState(props.stride ?? 2);
  const [offset, setOffset] = useState(0);

  const r = coalesce(pattern, stride, offset);
  const upd = (p: Pattern, s: number, o: number) => {
    setPattern(p);
    setStride(s);
    setOffset(o);
    const x = coalesce(p, s, o);
    onChange?.({ pattern: p, stride: s, offset: o, transactions: x.transactions, efficiency: Math.round(x.efficiency * 100) } satisfies CoalesceState);
  };

  const pct = Math.round(r.efficiency * 100);
  const shown = r.segments.slice(0, MAX_SHOWN);
  const usedPerSeg = (seg: number) => r.addrs.filter((a) => Math.floor(a / WORDS_PER_SEGMENT) === seg).length;

  return (
    <div className="w-full" data-widget>
      {!props.fixed && (
        <div className="mb-3 space-y-3">
          <div>
            <Caption className="mb-1">Which numbers do the 32 threads read?</Caption>
            <Seg label="Access pattern" value={pattern} onChange={(v) => upd(v, stride, offset)} options={PATTERNS} className="max-w-full" />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {pattern === "stride" && (
              <div>
                <Caption className="mb-1">Stride (thread t reads t × stride)</Caption>
                <Seg label="Stride" value={stride} onChange={(v) => upd(pattern, v, offset)} options={[2, 4, 8, 32].map((v) => ({ value: v, label: String(v) }))} />
              </div>
            )}
            {(pattern === "contiguous" || pattern === "stride") && (
              <div>
                <Caption className="mb-1">Start at element</Caption>
                <Stepper label="Start offset" value={offset} min={0} max={31} onChange={(v) => upd(pattern, stride, v)} />
              </div>
            )}
          </div>
        </div>
      )}

      <Caption className="mb-1.5">
        Memory in 128-byte segments (32 numbers each){r.segments.length > MAX_SHOWN ? ` · first ${MAX_SHOWN} of ${r.segments.length} touched` : ""}
      </Caption>
      <div className="flex flex-wrap gap-1.5" aria-label={`${r.transactions} segments touched`}>
        {shown.map((seg) => {
          const used = usedPerSeg(seg);
          return (
            <div key={seg} className="w-[3.4rem] rounded-lg border border-[var(--brand)]/60 bg-surface p-1" title={`segment ${seg}: ${used} of 32 numbers used`}>
              <div className="grid gap-px" style={{ gridTemplateColumns: "repeat(8, 1fr)" }} aria-hidden>
                {Array.from({ length: WORDS_PER_SEGMENT }, (_, w) => {
                  const hit = r.addrs.includes(seg * WORDS_PER_SEGMENT + w);
                  return <span key={w} className="aspect-square rounded-[1px]" style={{ background: hit ? "var(--brand)" : "var(--line-strong)" }} />;
                })}
              </div>
              <p className="mt-0.5 text-center font-mono text-[11px] leading-none text-ink-2">{used}/32</p>
            </div>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs text-ink-3">Each box is one segment the warp had to fetch. Green squares are numbers a thread asked for; grey squares came along for the ride.</p>

      <div className="mt-3 space-y-1">
        <div className="flex items-baseline justify-between text-xs text-ink-3">
          <span>Useful share of the bytes moved</span>
          <span className="font-mono text-[12.5px] font-semibold tabular-nums text-ink">{pct}%</span>
        </div>
        <Meter frac={r.efficiency} tone={pct >= 90 ? "brand" : "warn"} label={`${pct} percent of moved bytes used`} />
      </div>
      <div className="mt-3">
        <Note tone={r.transactions === 1 ? "plain" : "accent"}>
          {r.transactions === 1 ? (
            <>
              <b>Coalesced.</b> All {WARP} reads fall inside one 128-byte segment: <b>1 transaction</b>, nothing wasted.
            </>
          ) : (
            <>
              <b>{r.transactions} transactions</b> to deliver {r.usefulBytes} useful bytes: the memory moved {r.movedBytes.toLocaleString("en-US")} bytes, so {100 - pct}% of the trip was wasted.
            </>
          )}
        </Note>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Transactions" value={r.transactions} accent />
        <Readout label="Bytes moved" value={r.movedBytes.toLocaleString("en-US")} />
      </div>
      <p className="mt-2 text-xs text-ink-3">Simplified: real GPUs fetch 32-byte sectors inside 128-byte lines and have caches, but the lesson is the same: neighbours reading neighbours is cheap.</p>
    </div>
  );
}

/** goal: { transactions?: number, maxTransactions?: number, pattern?: Pattern, stride?: number }. */
export function checkCoalesce(state: unknown, goal: Record<string, unknown>) {
  const s = state as CoalesceState | undefined;
  if (!s) return false;
  if (typeof goal.transactions === "number" && s.transactions !== goal.transactions) return false;
  if (typeof goal.maxTransactions === "number" && s.transactions > goal.maxTransactions) return false;
  if (typeof goal.pattern === "string" && s.pattern !== goal.pattern) return false;
  if (typeof goal.stride === "number" && s.stride !== goal.stride) return false;
  return true;
}
