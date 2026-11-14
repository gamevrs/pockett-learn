"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { FORMATS, decodeTokensPerSec } from "./sim";
import { Caption, Note, Readout, Seg, Slider, BLUE, ORANGE } from "./ui";

export interface FormatsProps {
  /** Starting model size in billions of parameters (default 8). */
  params?: number;
  format?: string;
}

export interface FormatsState {
  format: string;
  bits: number;
  paramsB: number;
  /** Memory the weights need, in GB. */
  gb: number;
  /** Upper bound on decode speed from memory bandwidth alone (tokens per second, batch 1). */
  tokensPerSec: number;
}

const BW_TBS = 1; // example card: 1 TB/s of memory bandwidth

/** The number formats GPUs use for AI: how the bits are split, and what they mean for model size and decode speed. */
export function Formats({ props, onChange }: WidgetProps<FormatsProps>) {
  const [fid, setFid] = useState(props.format ?? "fp32");
  const [params, setParams] = useState(props.params ?? 8);

  const f = FORMATS.find((x) => x.id === fid)!;
  const whole = f.sign === 0 && f.exp === 0;
  const gb = (params * f.bits) / 8;
  const tps = decodeTokensPerSec(params, f.bits, BW_TBS);

  const upd = (id: string, p: number) => {
    setFid(id);
    setParams(p);
    const x = FORMATS.find((q) => q.id === id)!;
    onChange?.({ format: id, bits: x.bits, paramsB: p, gb: (p * x.bits) / 8, tokensPerSec: decodeTokensPerSec(p, x.bits, BW_TBS) } satisfies FormatsState);
  };

  const box = (label: string, n: number, colour: string) =>
    n === 0 ? null : (
      <div key={label} className="flex min-w-14 flex-col items-stretch" style={{ flex: n }}>
        <div className="h-9 rounded-md" style={{ background: colour }} role="img" aria-label={`${n} ${label} bits`} />
        <p className="mt-1 break-words text-center font-mono text-[11px] leading-tight text-ink-2">
          <span className="block">{n}</span>
          <span className="block">{label}</span>
        </p>
      </div>
    );

  return (
    <div className="w-full" data-widget>
      <div className="mb-3 space-y-3">
        <Seg label="Number format" value={fid} onChange={(v) => upd(v, params)} options={FORMATS.map((x) => ({ value: x.id, label: x.label }))} className="max-w-full" />
        <Slider label="Model size (billions of parameters)" value={params} min={1} max={70} onChange={(v) => upd(fid, v)} format={(v) => `${v} B`} />
      </div>

      <Caption className="mb-1.5">
        {f.label} · {f.bits} bits
      </Caption>
      <div className="flex gap-1" style={{ minWidth: 0 }}>
        {f.sign ? box("sign", f.sign, "var(--ink-3)") : null}
        {box(whole ? "whole-number bits" : "exponent", whole ? f.bits : f.exp, ORANGE)}
        {box("mantissa", f.man, BLUE)}
      </div>
      <p className="mt-1.5 text-xs text-ink-3">
        {whole ? `No exponent: a whole number from ${f.id === "int4" ? "−8 to 7" : "−128 to 127"}, scaled back to a real value with a stored scale factor.` : "Exponent bits set how big or small the number can be (its range). Mantissa bits set how finely it can be told apart from its neighbours (its precision)."}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-surface px-2.5 py-1.5">
          <p className="text-[11px] text-ink-3">Largest value</p>
          <p className="font-mono text-sm font-semibold text-ink">{f.max}</p>
        </div>
        <div className="rounded-lg border border-line bg-surface px-2.5 py-1.5">
          <p className="text-[11px] text-ink-3">Weights need</p>
          <p className="font-mono text-sm font-semibold text-ink">{+gb.toFixed(1)} GB</p>
        </div>
        <div className="rounded-lg border border-line bg-surface px-2.5 py-1.5">
          <p className="text-[11px] text-ink-3">Decode speed cap</p>
          <p className="font-mono text-sm font-semibold text-ink">{+tps.toPrecision(3)} tokens/s</p>
        </div>
      </div>

      <div className="mt-3">
        <Note tone="accent">
          {f.id === "bf16" ? (
            <>
              <b>BF16 keeps FP32&apos;s exponent</b> (8 bits), so it covers the same huge range, but only 7 mantissa bits, so it is coarser. Training likes the range; FP16 has more precision but overflows above 65,504.
            </>
          ) : f.id === "fp16" ? (
            <>
              <b>FP16</b> is more precise than BF16 (10 mantissa bits) but its 5-bit exponent tops out at 65,504, so large values overflow unless you scale them.
            </>
          ) : f.id === "fp32" ? (
            <>
              <b>FP32</b> is the safe default for general computing. Half the bits would halve the memory and, for decode, roughly double the speed.
            </>
          ) : f.id === "fp8" ? (
            <>
              <b>FP8</b> (here the E4M3 layout) is a quarter of FP32: very coarse, so values share a scale factor per tensor or per block (see FP4). Newer GPU generations run it fast.
            </>
          ) : f.id === "fp4" ? (
            <>
              <b>FP4</b> (E2M1) can hold only 16 values (0, ±0.5, ±1, ±1.5, ±2, ±3, ±4, ±6), so it only works with <b>block scaling</b>: each small block of values shares one stored scale factor (for example 32 values in the OCP MXFP4 format, 16 in NVIDIA&apos;s NVFP4; formats are vendor- and standard-specific). The scales cost a little extra memory, about 0.25 to 0.5 bits per value, which this widget ignores.
            </>
          ) : f.id === "int4" ? (
            <>
              <b>INT4</b> is a 4-bit whole number from −8 to 7. Run-time weights are often stored this way with one scale per group of weights (for example 32 or 128), and unpacked to 16 bits for the maths (weight-only quantisation).
            </>
          ) : (
            <>
              <b>INT8</b> is a plain 8-bit whole number from −128 to 127, scaled back to a real value with a stored scale factor. After training, weights are often squeezed to it (quantised) for inference.
            </>
          )}
        </Note>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Bytes per number" value={f.bits / 8} />
        <Readout label="Weights" value={`${+gb.toFixed(1)} GB`} accent />
      </div>
      <p className="mt-2 text-xs text-ink-3">Decode cap = {BW_TBS} TB/s ÷ weight bytes (batch 1: every token streams all the weights once). Ignores the KV cache and other overheads; real speeds are lower. 4-bit formats&apos; block scales are ignored.</p>
    </div>
  );
}

/** goal: { maxGb?: number, format?: string, minBits?: number, maxBits?: number, paramsB?: number }. */
export function checkFormats(state: unknown, goal: Record<string, unknown>) {
  const s = state as FormatsState | undefined;
  if (!s) return false;
  if (typeof goal.maxGb === "number" && s.gb > goal.maxGb) return false;
  if (typeof goal.format === "string" && s.format !== goal.format) return false;
  if (typeof goal.minBits === "number" && s.bits < goal.minBits) return false;
  if (typeof goal.maxBits === "number" && s.bits > goal.maxBits) return false;
  if (typeof goal.paramsB === "number" && s.paramsB !== goal.paramsB) return false;
  return true;
}
