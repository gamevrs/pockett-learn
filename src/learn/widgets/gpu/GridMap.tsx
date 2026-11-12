"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { blocksNeeded, globalIndex } from "./sim";
import { Caption, Note, Readout, Seg, Stepper } from "./ui";

export interface GridMapProps {
  /** Number of data elements (default 20). */
  n?: number;
  /** Starting block size (4, 8 or 16; default 8). */
  blockSize?: number;
  /** Hide the controls for n and block size. */
  fixed?: boolean;
}

export interface GridMapState {
  n: number;
  blockSize: number;
  blocks: number;
  totalThreads: number;
  /** Threads past the end of the data (they must bounds-check). */
  idle: number;
  /** The global index of the clicked thread, or -1. */
  picked: number;
  pickedBlock: number;
  pickedThread: number;
}

/** A 1-D grid of blocks of threads laid over an array: click a thread to see its global index and the element it works on. */
export function GridMap({ props, onChange }: WidgetProps<GridMapProps>) {
  const [n, setN] = useState(Math.max(5, Math.min(30, props.n ?? 20)));
  const [bs, setBs] = useState(props.blockSize ?? 8);
  const [pick, setPick] = useState<{ b: number; t: number } | null>(null);

  const blocks = blocksNeeded(n, bs);
  const total = blocks * bs;
  const stateOf = (nn: number, size: number, p: { b: number; t: number } | null): GridMapState => {
    const bl = blocksNeeded(nn, size);
    return {
      n: nn,
      blockSize: size,
      blocks: bl,
      totalThreads: bl * size,
      idle: bl * size - nn,
      picked: p ? globalIndex(p.b, size, p.t) : -1,
      pickedBlock: p ? p.b : -1,
      pickedThread: p ? p.t : -1,
    };
  };
  const update = (nn: number, size: number, p: { b: number; t: number } | null) => {
    setN(nn);
    setBs(size);
    setPick(p);
    onChange?.(stateOf(nn, size, p));
  };

  const i = pick ? globalIndex(pick.b, bs, pick.t) : -1;
  const live = pick !== null && i < n;

  return (
    <div className="w-full" data-widget>
      {!props.fixed && (
        <div className="mb-3 flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <Caption className="mb-1">Block size (threads per block)</Caption>
            <Seg label="Block size" value={bs} onChange={(v) => update(n, v, null)} options={[4, 8, 16].map((v) => ({ value: v, label: String(v) }))} />
          </div>
          <div>
            <Caption className="mb-1">Elements in the array</Caption>
            <Stepper label="Elements" value={n} min={5} max={30} onChange={(v) => update(v, bs, null)} />
          </div>
        </div>
      )}

      <Caption className="mb-1.5">The data · {n} elements</Caption>
      <div className="mb-3 flex flex-wrap gap-1" aria-label={`Array of ${n} elements`}>
        {Array.from({ length: n }, (_, k) => (
          <span
            key={k}
            className={`grid h-8 min-w-8 place-items-center rounded-md border font-mono text-xs font-semibold ${
              k === i ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface-2 text-ink-2"
            }`}
          >
            {k}
          </span>
        ))}
      </div>

      <Caption className="mb-1.5">
        The grid · {blocks} {blocks === 1 ? "block" : "blocks"} × {bs} threads = {total} threads
      </Caption>
      <div className="space-y-2">
        {Array.from({ length: blocks }, (_, b) => (
          <div key={b} className="rounded-xl border border-line bg-surface p-2">
            <p className="mb-1 font-mono text-[11px] text-ink-3">blockIdx.x = {b}</p>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: bs }, (_, t) => {
                const g = globalIndex(b, bs, t);
                const extra = g >= n;
                const on = pick?.b === b && pick?.t === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update(n, bs, { b, t })}
                    aria-pressed={on}
                    aria-label={`Block ${b}, thread ${t}${extra ? ", past the end of the data" : ""}`}
                    className={`grid h-10 min-w-10 place-items-center rounded-lg border font-mono text-xs font-semibold transition-colors ${
                      on ? "border-transparent bg-primary text-primary-ink" : extra ? "border-dashed border-[var(--line-strong)] bg-surface text-ink-3 hover:bg-surface-2" : "border-line bg-surface-2 text-ink hover:border-[var(--line-strong)]"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-ink-3">Number on each button = threadIdx.x. Dashed = past the end of the data.</p>

      <div className="mt-3">
        <Note tone={pick ? "accent" : "plain"}>
          {pick ? (
            <>
              <span className="font-mono">
                i = blockIdx.x × blockDim.x + threadIdx.x = {pick.b} × {bs} + {pick.t} = <b>{i}</b>
              </span>
              <br />
              {live ? (
                <>
                  This thread works on <b>element {i}</b>.
                </>
              ) : (
                <>
                  <b>{i}</b> is not less than n = {n}, so the bounds check <span className="font-mono">if (i &lt; n)</span> makes this thread do nothing.
                </>
              )}
            </>
          ) : (
            "Tap any thread to see which element it handles."
          )}
        </Note>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Blocks" value={blocks} />
        <Readout label="Threads" value={total} />
        <Readout label="Idle" value={total - n} accent={total - n > 0} />
      </div>
    </div>
  );
}

/** goal: any of { blocks, blockSize, n, idle, picked } must equal the state's value (a clicked thread sets `picked`). */
export function checkGridMap(state: unknown, goal: Record<string, unknown>) {
  const s = state as GridMapState | undefined;
  if (!s) return false;
  let any = false;
  for (const k of ["blocks", "blockSize", "n", "idle", "picked"] as const) {
    if (!(k in goal)) continue;
    any = true;
    if (s[k] !== goal[k]) return false;
  }
  return any;
}
