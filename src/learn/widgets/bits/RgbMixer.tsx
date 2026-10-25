"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { clamp, toBin, toHex } from "./shared";

type RGB = [number, number, number];

export interface RgbMixerProps {
  /** Starting colour. Default [40, 40, 40]. */
  initial?: RGB;
  /** A colour to match: shows a target swatch and a closeness meter. */
  target?: RGB;
  /** Show the hex code (#RRGGBB). Default true. */
  showHex?: boolean;
  /** Show each channel as 8 bits too. Default false. */
  showBinary?: boolean;
  /** Hide the swatch until the step is answered ("predict the colour"). */
  hideSwatch?: boolean;
  locked?: boolean;
}

export interface RgbMixerState {
  r: number;
  g: number;
  b: number;
}

const CHANNELS = [
  { key: 0, name: "Red", dot: "#ef4444" },
  { key: 1, name: "Green", dot: "#22c55e" },
  { key: 2, name: "Blue", dot: "#3b82f6" },
] as const;

const css = (c: RGB) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
const hex = (c: RGB) => `#${toHex(c[0])}${toHex(c[1])}${toHex(c[2])}`;
/** Perceived lightness, to pick a readable label colour on top of a swatch. */
const light = (c: RGB) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] > 150;

const THUMB =
  "[&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[var(--thumb)] [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.35),0_2px_6px_rgba(0,0,0,0.3)] " +
  "[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[var(--thumb)] [&::-moz-range-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.35)] [&::-moz-range-track]:bg-transparent";

/** Three bytes make a colour: mix red, green and blue light from 0 to 255. */
export function RgbMixer({ props, onChange, revealed }: WidgetProps<RgbMixerProps>) {
  const [rgb, setRgb] = useState<RGB>(() => (props.initial ?? [40, 40, 40]).map((v) => clamp(Math.round(v), 0, 255)) as RGB);
  const locked = Boolean(props.locked || revealed);
  const hidden = Boolean(props.hideSwatch && !revealed);
  const target = props.target;

  const set = (i: number, v: number) => {
    if (locked) return;
    const next = rgb.slice() as RGB;
    next[i] = clamp(v, 0, 255);
    setRgb(next);
    onChange?.({ r: next[0], g: next[1], b: next[2] } satisfies RgbMixerState);
  };

  const closeness = target ? Math.round(100 - (Math.abs(rgb[0] - target[0]) + Math.abs(rgb[1] - target[1]) + Math.abs(rgb[2] - target[2])) / 7.65) : 0;

  return (
    <div className="mx-auto w-full max-w-md">
      <div className={`grid gap-2 ${target ? "grid-cols-2" : "grid-cols-1"}`}>
        {target && <Swatch color={target} label="Target" showHex={props.showHex ?? true} />}
        {hidden ? (
          <div className="flex h-28 flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--line-strong)] bg-surface-2 text-ink-3 sm:h-32">
            <span className="font-display text-3xl">?</span>
            <span className="mt-1 text-xs">Answer to see the colour</span>
          </div>
        ) : (
          <Swatch color={rgb} label={target ? "Yours" : undefined} showHex={props.showHex ?? true} />
        )}
      </div>

      {target && (
        <div className="mt-3 flex items-center gap-3" aria-live="polite">
          <span className="text-xs text-ink-3">Match</span>
          <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
            <span className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width]" style={{ width: `${clamp(closeness, 0, 100)}%` }} />
          </span>
          <span className="w-10 text-right font-mono text-xs font-semibold tabular-nums text-ink">{clamp(closeness, 0, 100)}%</span>
        </div>
      )}

      <div className="mt-4 grid gap-3">
        {CHANNELS.map((ch) => {
          const v = rgb[ch.key];
          // each track shows one light on its own, from off (black) to full brightness
          const full: RGB = [0, 0, 0];
          full[ch.key] = 255;
          const solo: RGB = [0, 0, 0];
          solo[ch.key] = v;
          return (
            <div key={ch.key}>
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: ch.dot }} aria-hidden />
                <span className="font-medium text-ink">{ch.name}</span>
                <span className="ml-auto font-mono font-semibold tabular-nums text-ink">{v}</span>
                <span className="chip !font-mono">{toHex(v)}</span>
                {props.showBinary && <span className="chip hidden !font-mono sm:inline-flex">{toBin(v)}</span>}
              </div>
              <div className="relative mt-1 h-10">
                <span
                  className="pointer-events-none absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full border border-line"
                  style={{ background: hidden ? "var(--surface-2)" : `linear-gradient(90deg, #000, ${css(full)})` }}
                  aria-hidden
                />
                <input
                  type="range"
                  min={0}
                  max={255}
                  step={1}
                  value={v}
                  disabled={locked}
                  onChange={(e) => set(ch.key, Number(e.target.value))}
                  aria-label={`${ch.name}, 0 to 255`}
                  className={`relative h-10 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-default ${THUMB}`}
                  style={{ "--thumb": hidden ? "var(--ink-3)" : css(solo) } as React.CSSProperties}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Swatch({ color, label, showHex }: { color: RGB; label?: string; showHex: boolean }) {
  const ink = light(color) ? "#0a0a0a" : "#fafafa";
  return (
    <div className="relative flex h-28 flex-col justify-between rounded-2xl border border-line p-3 transition-colors sm:h-32" style={{ background: css(color), color: ink }}>
      <span className="text-xs font-medium opacity-80">{label ?? ""}</span>
      <span className="font-mono text-sm font-semibold sm:text-base">
        {showHex ? hex(color) : ""}
        <span className="block text-[11px] font-normal opacity-75">
          {color[0]}, {color[1]}, {color[2]}
        </span>
      </span>
    </div>
  );
}

/**
 * goal: { target: [r, g, b], tolerance? } (each channel within tolerance, default 24),
 * or { grey: true, tolerance? } (r, g and b within tolerance of each other, default 10, not black or white).
 */
export function checkRgbMixer(state: unknown, goal: Record<string, unknown>) {
  const s = state as RgbMixerState | undefined;
  if (!s) return false;
  const c = [s.r, s.g, s.b];
  if (Array.isArray(goal.target)) {
    const tol = typeof goal.tolerance === "number" ? goal.tolerance : 24;
    return (goal.target as number[]).every((t, i) => Math.abs(c[i] - t) <= tol);
  }
  if (goal.grey === true) {
    const tol = typeof goal.tolerance === "number" ? goal.tolerance : 10;
    const avg = (c[0] + c[1] + c[2]) / 3;
    return Math.max(...c) - Math.min(...c) <= tol && avg >= 30 && avg <= 225;
  }
  return false;
}
