"use client";

import React, { useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { clamp, toHex } from "./shared";

export interface PixelGridProps {
  width?: number;
  height?: number;
  /** Let the learner change the width and height. Default false. */
  resizable?: boolean;
  /** Largest width/height when resizable (1–8). Default 6. */
  maxSize?: number;
  /** Paint colours as #RRGGBB. The first one is the starting colour of every pixel. */
  palette?: string[];
  /** Bytes per pixel. Default 3 (one each for red, green, blue). */
  bytesPerPixel?: number;
  /** Show the first bytes of the image as a stream of numbers. Default true. */
  showStream?: boolean;
  locked?: boolean;
}

export interface PixelGridState {
  width: number;
  height: number;
  pixels: number;
  bytes: number;
  /** Pixels that are not the starting colour. */
  painted: number;
}

const DEFAULT_PALETTE = ["#FFFFFF", "#0A0A0A", "#A3E635", "#EF4444", "#3B82F6", "#FACC15", "#F97316"];

const bytesOf = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** A tiny image you can paint and resize: every pixel is three bytes. */
export function PixelGrid({ props, onChange, revealed }: WidgetProps<PixelGridProps>) {
  const palette = props.palette?.length ? props.palette : DEFAULT_PALETTE;
  const maxSize = clamp(props.maxSize ?? 6, 1, 8);
  const bpp = props.bytesPerPixel ?? 3;
  const [w, setW] = useState(() => clamp(props.width ?? 4, 1, maxSize));
  const [h, setH] = useState(() => clamp(props.height ?? 4, 1, maxSize));
  // colours by "x,y" so resizing keeps what's already painted
  const [cells, setCells] = useState<Record<string, number>>({});
  const [brush, setBrush] = useState(palette.length > 1 ? 2 % palette.length : 0);
  const locked = Boolean(props.locked || revealed);

  const colourAt = (x: number, y: number) => cells[`${x},${y}`] ?? 0;
  const report = (nw: number, nh: number, nc: Record<string, number>) => {
    let painted = 0;
    for (let y = 0; y < nh; y++) for (let x = 0; x < nw; x++) if ((nc[`${x},${y}`] ?? 0) !== 0) painted++;
    onChange?.({ width: nw, height: nh, pixels: nw * nh, bytes: nw * nh * bpp, painted } satisfies PixelGridState);
  };

  const paint = (x: number, y: number) => {
    if (locked) return;
    const key = `${x},${y}`;
    const next = { ...cells, [key]: colourAt(x, y) === brush ? 0 : brush };
    setCells(next);
    report(w, h, next);
  };
  const resize = (dw: number, dh: number) => {
    if (locked) return;
    const nw = clamp(w + dw, 1, maxSize);
    const nh = clamp(h + dh, 1, maxSize);
    setW(nw);
    setH(nh);
    report(nw, nh, cells);
  };

  const stream: number[] = [];
  for (let y = 0; y < h && stream.length < 12; y++) for (let x = 0; x < w && stream.length < 12; x++) stream.push(...bytesOf(palette[colourAt(x, y)]).slice(0, bpp));
  const pixels = w * h;

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="flex justify-center">
        <div
          className="grid gap-[3px] rounded-xl border border-line bg-[var(--line-strong)] p-[3px]"
          style={{ gridTemplateColumns: `repeat(${w}, minmax(0, 1fr))`, width: `min(100%, ${w * 52}px)` }}
          role="grid"
          aria-label={`${w} by ${h} pixel image`}
        >
          {Array.from({ length: h }, (_, y) =>
            Array.from({ length: w }, (_, x) => {
              const c = palette[colourAt(x, y)];
              return (
                <button
                  key={`${x},${y}`}
                  type="button"
                  onClick={() => paint(x, y)}
                  disabled={locked}
                  aria-label={`Pixel ${x + 1}, ${y + 1}: ${c}`}
                  className="aspect-square min-h-9 w-full rounded-[5px] transition-colors disabled:cursor-default"
                  style={{ background: c }}
                />
              );
            }),
          )}
        </div>
      </div>

      {!locked && (
        <div className="mt-4 flex flex-wrap justify-center gap-1.5" role="radiogroup" aria-label="Paint colour">
          {palette.map((c, i) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={brush === i}
              aria-label={`Colour ${c}`}
              onClick={() => setBrush(i)}
              className={`grid h-10 w-10 place-items-center rounded-full border transition-shadow ${brush === i ? "border-transparent shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--ink)]" : "border-line"}`}
              style={{ background: c }}
            />
          ))}
        </div>
      )}

      {props.resizable && (
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Stepper label="Width" value={w} onMinus={() => resize(-1, 0)} onPlus={() => resize(1, 0)} min={1} max={maxSize} disabled={locked} />
          <Stepper label="Height" value={h} onMinus={() => resize(0, -1)} onPlus={() => resize(0, 1)} min={1} max={maxSize} disabled={locked} />
        </div>
      )}

      <p className="mt-4 text-center text-sm text-ink-2" aria-live="polite">
        <span className="font-mono tabular-nums text-ink">{w}</span> × <span className="font-mono tabular-nums text-ink">{h}</span> = {pixels} {pixels === 1 ? "pixel" : "pixels"} × {bpp} bytes ={" "}
        <span className="rounded-md bg-primary px-1.5 py-0.5 font-mono font-semibold tabular-nums text-primary-ink">{pixels * bpp} bytes</span>
      </p>

      {(props.showStream ?? true) && (
        <p className="mt-3 text-center font-mono text-[11px] leading-relaxed text-ink-3">
          <span className="text-ink-2">File: </span>
          {stream.map((b, i) => (
            <span key={i} className={i % bpp === 0 && i > 0 ? "ml-2" : "ml-1"}>
              {toHex(b)}
            </span>
          ))}
          {pixels * bpp > stream.length && <span className="ml-1 whitespace-nowrap">… ({pixels * bpp - stream.length} more)</span>}
        </p>
      )}
    </div>
  );
}

function Stepper({ label, value, onMinus, onPlus, min, max, disabled }: { label: string; value: number; onMinus: () => void; onPlus: () => void; min: number; max: number; disabled: boolean }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface-2 p-1">
      <span className="pl-2.5 pr-1 text-xs text-ink-3">{label}</span>
      <button type="button" className="btn !h-10 !w-10 !p-0" onClick={onMinus} disabled={disabled || value <= min} aria-label={`Decrease ${label.toLowerCase()}`}>
        <Minus className="h-4 w-4" />
      </button>
      <span className="w-6 text-center font-mono font-semibold tabular-nums text-ink">{value}</span>
      <button type="button" className="btn !h-10 !w-10 !p-0" onClick={onPlus} disabled={disabled || value >= max} aria-label={`Increase ${label.toLowerCase()}`}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

/** goal: any of { bytes, width, height, minPainted }; all given ones must hold. */
export function checkPixelGrid(state: unknown, goal: Record<string, unknown>) {
  const s = state as PixelGridState | undefined;
  if (!s) return false;
  const checks: boolean[] = [];
  if (typeof goal.bytes === "number") checks.push(s.bytes === goal.bytes);
  if (typeof goal.width === "number") checks.push(s.width === goal.width);
  if (typeof goal.height === "number") checks.push(s.height === goal.height);
  if (typeof goal.minPainted === "number") checks.push(s.painted >= goal.minPainted);
  return checks.length > 0 && checks.every(Boolean);
}
