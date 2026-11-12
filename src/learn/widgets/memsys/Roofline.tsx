"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Seg, Slider, fmtNs } from "./ui";

// ───────────────────────────── memsys-roofline: memory-bound or compute-bound? ─────────────────────────────

interface Kernel {
  id: string;
  name: string;
  /** FLOP per byte moved to/from memory. */
  ai: number;
  code: string;
  note: string;
}

const KERNELS: Kernel[] = [
  { id: "add", name: "Vector add", ai: 1 / 12, code: "c[i] = a[i] + b[i]", note: "1 add per 12 bytes (read a, read b, write c, 4 bytes each)." },
  { id: "saxpy", name: "a·x + y", ai: 2 / 12, code: "y[i] = a * x[i] + y[i]", note: "2 operations per 12 bytes (read x, read y, write y)." },
  { id: "dot", name: "Dot product", ai: 2 / 8, code: "sum += a[i] * b[i]", note: "2 operations per 8 bytes (read a, read b)." },
  { id: "mm16", name: "Matmul, 16×16 tiles", ai: 16 / 4, code: "tiled matrix multiply", note: "A T×T tile does 2T³ operations on 8T² bytes: T/4 per byte, so 4 here." },
  { id: "mm128", name: "Matmul, 128×128 tiles", ai: 128 / 4, code: "tiled matrix multiply", note: "Same tiling with T = 128: 32 operations per byte." },
];

export interface RooflineProps {
  /** Peak compute in GFLOP/s (single precision). Default 1000. */
  peak?: number;
  /** Memory bandwidth in GB/s. Default 50. */
  bw?: number;
  /** Starting kernel id. */
  kernel?: string;
  /** Kernels offered. */
  kernels?: string[];
  /** Offer a free slider for the intensity as well. */
  free?: boolean;
}

export interface RooflineState {
  kernel: string;
  ai: number;
  attainable: number;
  bound: "memory" | "compute";
  /** Share of peak compute reached. */
  utilisation: number;
}

const W = 360;
const H = 200;
const PL = 42;
const PR = 10;
const PT = 12;
const PB = 34;
const AX0 = Math.log10(1 / 32);
const AX1 = Math.log10(256);

export function Roofline({ props, onChange, revealed }: WidgetProps<RooflineProps>) {
  const peak = props.peak ?? 1000;
  const bw = props.bw ?? 50;
  const kernels = props.kernels ? KERNELS.filter((k) => props.kernels!.includes(k.id)) : KERNELS;
  const [kernel, setKernel] = useState(props.kernel ?? kernels[0].id);
  const [freeExp, setFreeExp] = useState(0);
  const locked = Boolean(revealed);
  const useFree = kernel === "free";
  const K = KERNELS.find((k) => k.id === kernel);
  const ai = useFree ? 2 ** freeExp : K!.ai;
  const attainable = Math.min(peak, bw * ai);
  const bound = bw * ai < peak ? "memory" : "compute";
  const ridge = peak / bw;
  const YLO = Math.log10(peak / 1000);
  const YHI = Math.log10(peak * 2);
  const xOf = (v: number) => PL + ((Math.log10(v) - AX0) / (AX1 - AX0)) * (W - PL - PR);
  const yOf = (v: number) => PT + (1 - (Math.log10(Math.max(v, peak / 1000)) - YLO) / (YHI - YLO)) * (H - PT - PB);

  const report = (id: string, e: number) => {
    const a = id === "free" ? 2 ** e : KERNELS.find((k) => k.id === id)!.ai;
    const att = Math.min(peak, bw * a);
    onChange?.({ kernel: id, ai: a, attainable: att, bound: bw * a < peak ? "memory" : "compute", utilisation: att / peak } satisfies RooflineState);
  };
  const pick = (id: string) => {
    setKernel(id);
    report(id, freeExp);
  };
  const pickFree = (e: number) => {
    setFreeExp(e);
    report("free", e);
  };

  const roof = `M${xOf(1 / 32)} ${yOf(bw / 32)} L${xOf(ridge)} ${yOf(peak)} L${xOf(256)} ${yOf(peak)}`;
  const xt = [1 / 16, 1 / 4, 1, 4, 16, 64, 256];
  const fmtAi = (v: number) => (v < 1 ? `1/${Math.round(1 / v)}` : String(v));
  const gflops = (v: number) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}T` : String(Math.round(v)));
  const items = 1e9;
  // time to stream 1e9 elements: compute-limited vs memory-limited, from work per element
  const flopPerItem = useFree ? ai * 12 : K!.id === "dot" ? 2 : K!.id === "saxpy" ? 2 : K!.id === "add" ? 1 : 0;
  const showTime = flopPerItem > 0;
  const timeNs = showTime ? ((items * flopPerItem) / attainable) : 0; // GFLOP/s = FLOP/ns

  return (
    <div className="w-full">
      <div className="flex flex-wrap justify-center gap-1.5">
        <Seg
          label="Kernel"
          value={kernel}
          onChange={pick}
          disabled={locked}
          options={[...kernels.map((k) => ({ value: k.id, label: k.name })), ...(props.free ? [{ value: "free", label: "Your own" }] : [])]}
        />
      </div>
      <p className="mt-2 text-center font-mono text-[0.82rem] text-ink-2">{useFree ? "your own loop" : K!.code}</p>
      <p className="mt-0.5 text-center text-xs text-ink-3">{useFree ? "Slide the operations-per-byte yourself." : K!.note}</p>
      {useFree && <Slider className="mt-1" label="Operations per byte moved" value={freeExp} min={-5} max={8} step={1} onChange={pickFree} disabled={locked} format={(v) => fmtAi(2 ** v)} />}

      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label={`Roofline chart. This kernel does ${fmtAi(ai)} operations per byte and can reach ${gflops(attainable)} GFLOP/s of a ${gflops(peak)} peak: ${bound}-bound.`}>
        <line x1={PL} x2={W - PR} y1={yOf(peak)} y2={yOf(peak)} stroke="var(--line-strong)" strokeWidth={0.6} />
        {xt.map((v) => (
          <text key={v} x={xOf(v)} y={H - PB + 17} textAnchor="middle" fontSize={14} fill="var(--ink-3)">
            {fmtAi(v)}
          </text>
        ))}
        {[peak / 100, peak / 10, peak].map((v) => (
          <g key={v}>
            <line x1={PL} x2={W - PR} y1={yOf(v)} y2={yOf(v)} stroke="var(--line-strong)" strokeWidth={0.6} />
            <text x={PL - 4} y={yOf(v) + 5} textAnchor="end" fontSize={14} fill="var(--ink-3)">
              {gflops(v)}
            </text>
          </g>
        ))}
        <path d={roof} fill="none" stroke="var(--ink-2)" strokeWidth={2.4} strokeLinejoin="round" />
        <line x1={xOf(ridge)} x2={xOf(ridge)} y1={yOf(peak)} y2={H - PB} stroke="var(--ink-3)" strokeDasharray="3 3" strokeWidth={1} />
        <line x1={xOf(ai)} x2={xOf(ai)} y1={yOf(attainable)} y2={H - PB} stroke="var(--brand)" strokeWidth={1.5} />
        <circle cx={xOf(ai)} cy={yOf(attainable)} r={6} fill="var(--primary)" stroke="var(--ink)" strokeWidth={1.6} />
        <text x={PL + 2} y={H - 4} fontSize={14} fill="var(--ink-3)">
          operations per byte (log) →
        </text>
        <text x={xOf(ridge) + 4} y={PT + 28} fontSize={14} fill="var(--ink-2)">
          ridge {fmtAi(Math.round(ridge))}
        </text>
      </svg>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Reachable" value={`${gflops(attainable)} GFLOP/s`} accent />
        <Readout label="Of peak" value={`${Math.round((attainable / peak) * 100)}%`} />
        <Readout label="Limit" value={bound === "memory" ? "memory-bound" : "compute-bound"} />
      </div>
      <div className="mt-3">
        <Note>
          Machine (toy, desktop-like): peak <b>{gflops(peak)} GFLOP/s</b>, memory <b>{bw} GB/s</b>, so the ridge is at <b>{Math.round(ridge)}</b> operations per byte.{" "}
          {bound === "memory" ? (
            <>
              This kernel does {fmtAi(ai)}, left of the ridge: the memory pipe, not the arithmetic, sets the speed. Faster arithmetic would change nothing.
              {showTime ? ` A billion elements take about ${fmtNs(timeNs)}.` : ""}
            </>
          ) : (
            <>This kernel does {fmtAi(ai)}, right of the ridge: the arithmetic units are the limit, and a faster memory would change nothing.</>
          )}
        </Note>
      </div>
      <Caption className="mt-2 text-center">Operations = single-precision floating-point operations</Caption>
    </div>
  );
}

/** goal: { bound, kernel, minUtilisation } */
export function checkRoofline(state: unknown, goal: Record<string, unknown>) {
  const s = state as RooflineState | undefined;
  if (!s) return false;
  if (typeof goal.bound === "string" && s.bound !== goal.bound) return false;
  if (typeof goal.kernel === "string" && s.kernel !== goal.kernel) return false;
  if (typeof goal.minUtilisation === "number" && s.utilisation < goal.minUtilisation) return false;
  return true;
}
