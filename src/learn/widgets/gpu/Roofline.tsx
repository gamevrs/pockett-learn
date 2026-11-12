"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { attainable, ridge } from "./sim";
import { Caption, Note, Readout, Seg, Slider, BLUE, ORANGE } from "./ui";

export interface RooflineProps {
  /** Start on this preset: "dc" (data-centre example) or "pc" (gaming-card example). */
  preset?: "dc" | "pc";
  batch?: number;
  tokens?: number;
}

export interface RooflineState {
  preset: "dc" | "pc";
  batch: number;
  tokens: number;
  ridge: number;
  /** Decode at this batch size is limited by memory bandwidth. */
  decodeMemoryBound: boolean;
  /** Prefill at this prompt length is limited by compute. */
  prefillComputeBound: boolean;
  /** Decode's share of the peak maths speed, percent. */
  decodeOfPeak: number;
}

const PRESETS = {
  dc: { label: "Data-centre card", peak: 1000, bw: 3 },
  pc: { label: "Gaming card", peak: 80, bw: 1 },
};

const BATCHES = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
const TOKENS = [32, 128, 512, 2048, 8192];

const W = 360;
const H = 250;
const L = 40;
const R = 348;
const T = 12;
const B = 212;
const XMIN = 0.05;
const XMAX = 5000;
const YMIN = 0.05;
const YMAX = 3000;
const lx = (v: number) => L + ((Math.log10(v) - Math.log10(XMIN)) / (Math.log10(XMAX) - Math.log10(XMIN))) * (R - L);
const ly = (v: number) => B - ((Math.log10(v) - Math.log10(YMIN)) / (Math.log10(YMAX) - Math.log10(YMIN))) * (B - T);
const r1 = (v: number) => Math.round(v * 10) / 10;

/** A roofline plot with round example numbers: bandwidth slope, compute ceiling, and where some kernels and LLM decode / prefill land. */
export function Roofline({ props, onChange }: WidgetProps<RooflineProps>) {
  const [preset, setPreset] = useState<"dc" | "pc">(props.preset ?? "dc");
  const [bi, setBi] = useState(Math.max(0, BATCHES.indexOf(props.batch ?? 1)));
  const [ti, setTi] = useState(Math.max(0, TOKENS.indexOf(props.tokens ?? 2048)));

  const { peak, bw } = PRESETS[preset];
  const rg = ridge(peak, bw);
  const batch = BATCHES[bi];
  const tokens = TOKENS[ti];

  const upd = (p: "dc" | "pc", b: number, t: number) => {
    setPreset(p);
    setBi(b);
    setTi(t);
    const pk = PRESETS[p].peak;
    const bwv = PRESETS[p].bw;
    onChange?.({
      preset: p,
      batch: BATCHES[b],
      tokens: TOKENS[t],
      ridge: ridge(pk, bwv),
      decodeMemoryBound: BATCHES[b] < ridge(pk, bwv),
      prefillComputeBound: TOKENS[t] >= ridge(pk, bwv),
      decodeOfPeak: Math.round((attainable(BATCHES[b], pk, bwv) / pk) * 100),
    } satisfies RooflineState);
  };

  const kernels = [
    { id: "A", name: "Vector add (1 FLOP per 12 bytes)", i: 1 / 12, colour: ORANGE },
    { id: "B", name: "Naive matmul", i: 0.25, colour: ORANGE },
    { id: "C", name: "Tiled matmul (32 × 32 tiles)", i: 8, colour: ORANGE },
    { id: "D", name: `LLM decode, batch ${batch}`, i: batch, colour: BLUE },
    { id: "E", name: `LLM prefill, ${tokens.toLocaleString("en-US")}-token prompt`, i: tokens, colour: "var(--primary)" },
  ];
  const decode = kernels[3];
  const prefill = kernels[4];
  const decodeAtt = attainable(decode.i, peak, bw);
  const prefillAtt = attainable(prefill.i, peak, bw);
  const roof = `M${r1(lx(XMIN))} ${r1(ly(XMIN * bw))} L${r1(lx(rg))} ${r1(ly(peak))} L${r1(lx(XMAX))} ${r1(ly(peak))}`;
  const xt = [0.1, 1, 10, 100, 1000];
  const yt = [0.1, 1, 10, 100, 1000];

  return (
    <div className="w-full" data-widget>
      <div className="mb-3 space-y-3">
        <Seg label="Example GPU" value={preset} onChange={(v) => upd(v, bi, ti)} options={(Object.keys(PRESETS) as ("dc" | "pc")[]).map((k) => ({ value: k, label: PRESETS[k].label }))} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Slider label="Decode batch size (users served together)" value={bi} min={0} max={BATCHES.length - 1} onChange={(v) => upd(preset, v, ti)} format={() => String(batch)} />
          <Slider label="Prefill prompt length (tokens)" value={ti} min={0} max={TOKENS.length - 1} onChange={(v) => upd(preset, bi, v)} format={() => tokens.toLocaleString("en-US")} />
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full rounded-xl border border-line bg-surface" role="img" aria-label={`Roofline plot. Ridge point at ${Math.round(rg)} FLOP per byte. Decode at batch ${batch} reaches ${r1(decodeAtt)} TFLOP per second; prefill reaches ${r1(prefillAtt)}.`}>
        {xt.map((v) => (
          <g key={`x${v}`}>
            <line x1={r1(lx(v))} y1={T} x2={r1(lx(v))} y2={B} stroke="var(--line-strong)" strokeWidth={0.7} />
            <text x={r1(lx(v))} y={B + 17} textAnchor="middle" fontSize={14} fill="var(--ink-3)">
              {v}
            </text>
          </g>
        ))}
        {yt.map((v) => (
          <g key={`y${v}`}>
            <line x1={L} y1={r1(ly(v))} x2={R} y2={r1(ly(v))} stroke="var(--line-strong)" strokeWidth={0.7} />
            <text x={L - 4} y={r1(ly(v)) + 5} textAnchor="end" fontSize={14} fill="var(--ink-3)">
              {v}
            </text>
          </g>
        ))}
        <path d={roof} fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" />
        <line x1={r1(lx(rg))} y1={r1(ly(peak))} x2={r1(lx(rg))} y2={B} stroke="var(--ink-3)" strokeWidth={1} strokeDasharray="3 4" />
        {kernels.map((k) => {
          const y = attainable(k.i, peak, bw);
          return (
            <g key={k.id}>
              <circle cx={r1(lx(k.i))} cy={r1(ly(y))} r={10} fill={k.colour} stroke="var(--surface)" strokeWidth={1.5} />
              <text x={r1(lx(k.i))} y={r1(ly(y)) + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill="#0a0a0a">
                {k.id}
              </text>
            </g>
          );
        })}
        <text x={(L + R) / 2} y={H - 4} textAnchor="middle" fontSize={14} fill="var(--ink-2)">
          FLOP per byte moved →
        </text>
      </svg>
      <p className="mt-1 text-xs text-ink-3">Vertical axis: TFLOP/s achieved (log scale). Dashed line: the ridge point, {Math.round(rg)} FLOP per byte on this card.</p>

      <ul className="mt-2 grid gap-1 text-[13px] text-ink-2 sm:grid-cols-2">
        {kernels.map((k) => (
          <li key={k.id} className="flex items-baseline gap-2">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold text-[#0a0a0a]" style={{ background: k.colour }}>
              {k.id}
            </span>
            <span>
              {k.name}: {+k.i.toPrecision(2)} FLOP/B, {k.i < rg ? "memory-bound" : "compute-bound"}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3">
        <Note tone="accent">
          Decode at batch {batch} reaches <b>{+decodeAtt.toPrecision(2)} TFLOP/s</b>, {Math.round((decodeAtt / peak) * 100)}% of the peak: the maths units mostly wait for weights to arrive. Prefill of {tokens.toLocaleString("en-US")} tokens reaches {+prefillAtt.toPrecision(3)} TFLOP/s ({Math.round((prefillAtt / peak) * 100)}% of the peak).
        </Note>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Peak" value={`${peak} TFLOP/s`} />
        <Readout label="Bandwidth" value={`${bw} TB/s`} />
        <Readout label="Ridge" value={`${Math.round(rg)} FLOP/B`} accent />
      </div>
      <Caption className="mt-2">Round example numbers, not any product&apos;s spec</Caption>
    </div>
  );
}

/** goal: { decodeMemoryBound?: boolean, prefillComputeBound?: boolean, minDecodeOfPeak?: number, preset?: string }. */
export function checkRoofline(state: unknown, goal: Record<string, unknown>) {
  const s = state as RooflineState | undefined;
  if (!s) return false;
  if (typeof goal.decodeMemoryBound === "boolean" && s.decodeMemoryBound !== goal.decodeMemoryBound) return false;
  if (typeof goal.prefillComputeBound === "boolean" && s.prefillComputeBound !== goal.prefillComputeBound) return false;
  if (typeof goal.minDecodeOfPeak === "number" && s.decodeOfPeak < goal.minDecodeOfPeak) return false;
  if (typeof goal.preset === "string" && s.preset !== goal.preset) return false;
  return true;
}
