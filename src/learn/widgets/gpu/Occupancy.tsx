"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { SM, occupancy, warpsToHide } from "./sim";
import { Caption, Meter, Note, Readout, Seg, Slider } from "./ui";

export interface OccupancyProps {
  blockSize?: number;
  regs?: number;
  sharedKb?: number;
  /** Hide the latency-hiding part. */
  noLatency?: boolean;
}

export interface OccupancyState {
  blockSize: number;
  regs: number;
  sharedKb: number;
  blocksPerSm: number;
  warpsPerSm: number;
  /** Percent of the SM's warp slots in use. */
  occupancy: number;
  limiter: string;
  /** Enough resident warps per scheduler to cover the memory wait. */
  hidesLatency: boolean;
}

const LATENCY = 400; // cycles, a typical order of magnitude for a trip to GPU global memory

/** One streaming multiprocessor with a few limits: how many warps can be resident, and is that enough to hide memory waits? */
export function Occupancy({ props, onChange }: WidgetProps<OccupancyProps>) {
  const [bs, setBs] = useState(props.blockSize ?? 256);
  const [regs, setRegs] = useState(props.regs ?? 32);
  const [kb, setKb] = useState(props.sharedKb ?? 0);
  const [math, setMath] = useState(40);

  const r = occupancy(bs, regs, kb * 1024);
  const perSched = r.warpsPerSm / SM.schedulers;
  const need = warpsToHide(LATENCY, math);
  const hides = perSched >= need;

  const upd = (b: number, g: number, k: number, m: number) => {
    setBs(b);
    setRegs(g);
    setKb(k);
    setMath(m);
    const x = occupancy(b, g, k * 1024);
    onChange?.({
      blockSize: b,
      regs: g,
      sharedKb: k,
      blocksPerSm: x.blocksPerSm,
      warpsPerSm: x.warpsPerSm,
      occupancy: Math.round(x.occupancy * 100),
      limiter: x.limiter,
      hidesLatency: x.warpsPerSm / SM.schedulers >= warpsToHide(LATENCY, m),
    } satisfies OccupancyState);
  };

  const pct = Math.round(r.occupancy * 100);
  const limit = (name: string, v: number, unit: string) => (
    <div className={`rounded-lg border px-2.5 py-1.5 ${r.limiter === name ? "border-[var(--brand)] bg-tint" : "border-line bg-surface"}`}>
      <p className="text-[11px] text-ink-3">{name}</p>
      <p className="font-mono text-sm font-semibold tabular-nums text-ink">{Number.isFinite(v) ? `${v} ${unit}` : "no limit"}</p>
    </div>
  );

  return (
    <div className="w-full" data-widget>
      <div className="mb-3 space-y-3">
        <div>
          <Caption className="mb-1">Threads per block</Caption>
          <Seg label="Block size" value={bs} onChange={(v) => upd(v, regs, kb, math)} options={[64, 128, 256, 512, 1024].map((v) => ({ value: v, label: String(v) }))} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Slider label="Registers per thread" value={regs} min={16} max={128} step={8} onChange={(v) => upd(bs, v, kb, math)} />
          <Slider label="Shared memory per block" value={kb} min={0} max={96} step={4} onChange={(v) => upd(bs, regs, v, math)} format={(v) => `${v} KB`} />
        </div>
        {!props.noLatency && <Slider label="Maths cycles a warp does between memory loads" value={math} min={10} max={200} step={10} onChange={(v) => upd(bs, regs, kb, v)} />}
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
        {limit("threads", r.byThreads, "blocks")}
        {limit("registers", r.byRegisters, "blocks")}
        {limit("shared memory", r.byShared, "blocks")}
        {limit("blocks", r.byBlocks, "blocks")}
      </div>
      <p className="mt-1 text-xs text-ink-3">How many blocks each limit would allow on one SM. The smallest wins and caps the SM.</p>

      <div className="mt-3 space-y-1">
        <div className="flex items-baseline justify-between text-xs text-ink-3">
          <span>
            Resident warps: {r.warpsPerSm} of {SM.maxWarps}
          </span>
          <span className="font-mono text-[12.5px] font-semibold tabular-nums text-ink">{pct}% occupancy</span>
        </div>
        <Meter frac={r.occupancy} tone={pct >= 50 ? "brand" : "warn"} label={`Occupancy ${pct} percent`} />
      </div>

      {!props.noLatency && (
        <div className="mt-3">
          <Note tone={hides ? "plain" : "accent"}>
            {r.blocksPerSm === 0 ? (
              <>
                <b>Not even one block fits:</b> {bs} threads × {regs} registers is more than the SM has, so a real launch would fail. Lower the block size or the registers.
              </>
            ) : (
              <>
            A trip to global memory takes about {LATENCY} cycles. With {math} cycles of maths between loads, each of the SM&apos;s {SM.schedulers} schedulers needs about <b>{need}</b> warps ready to stay busy. This SM gives each <b>{+perSched.toFixed(1)}</b>:{" "}
            {hides ? "enough to hide the wait." : "not enough, so schedulers will sit idle waiting on memory."}
              </>
            )}
          </Note>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Blocks per SM" value={r.blocksPerSm} />
        <Readout label="Limited by" value={r.limiter} accent />
      </div>
      <p className="mt-2 text-xs text-ink-3">
        A simplified SM: {SM.maxThreads} threads, {SM.maxBlocks} blocks, 64K registers and 96 KB of shared memory max. Real GPUs differ by generation and also round allocations up; use your vendor&apos;s occupancy calculator for real numbers. Higher occupancy is not always faster.
      </p>
    </div>
  );
}

/** goal: { minOccupancy?: number, maxOccupancy?: number, limiter?: string, hidesLatency?: boolean, blockSize?: number }. */
export function checkOccupancy(state: unknown, goal: Record<string, unknown>) {
  const s = state as OccupancyState | undefined;
  if (!s) return false;
  if (typeof goal.minOccupancy === "number" && s.occupancy < goal.minOccupancy) return false;
  if (typeof goal.maxOccupancy === "number" && s.occupancy > goal.maxOccupancy) return false;
  if (typeof goal.limiter === "string" && s.limiter !== goal.limiter) return false;
  if (typeof goal.hidesLatency === "boolean" && s.hidesLatency !== goal.hidesLatency) return false;
  if (typeof goal.blockSize === "number" && s.blockSize !== goal.blockSize) return false;
  return true;
}
