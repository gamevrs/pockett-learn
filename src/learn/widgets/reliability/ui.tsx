"use client";

import React, { useEffect, useRef } from "react";
import { Caption, Note, Pill, Readout, Segmented } from "../net/ui";

/**
 * Shared pieces for the "production systems" widgets (reliability and traffic): the networking
 * module's captions, pills and notes, plus a labelled slider and a small bar chart.
 */
export { Caption, Note, Pill, Readout, Segmented };
export { num, rng } from "./sim";

/** A labelled range input with a live value, 40px tall touch area. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  disabled,
  className = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="flex items-baseline justify-between gap-2 text-xs text-ink-2">
        <span>{label}</span>
        <span className="font-mono text-sm font-semibold tabular-nums text-ink">{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 block h-8 w-full cursor-pointer accent-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  );
}

/** Colour of a bar: lime accent, red when over a limit, or muted. */
export type BarTone = "ok" | "bad" | "muted" | "warn";
const TONE: Record<BarTone, string> = {
  ok: "bg-[var(--brand)]",
  bad: "bg-[var(--bad)]",
  muted: "bg-[var(--line-strong)]",
  warn: "bg-[#d99a2b]",
};

/**
 * A responsive bar chart made of divs. `values` are drawn from the left; `limit` draws a dashed
 * line; `tone` picks each bar's colour. Height in px.
 */
export function Bars({
  values,
  max,
  limit,
  limitLabel,
  tone,
  height = 120,
  label,
  axis,
}: {
  values: number[];
  max?: number;
  limit?: number;
  limitLabel?: string;
  tone?: (v: number, i: number) => BarTone;
  height?: number;
  label: string;
  /** Tick labels under the chart: [text, fraction 0..1 along the width]. */
  axis?: [string, number][];
}) {
  const top = Math.max(1, max ?? Math.max(...values, limit ?? 0, 1));
  return (
    <div role="img" aria-label={label}>
      <div className="relative flex items-end gap-px rounded-lg border border-line bg-surface px-1.5 pt-1.5" style={{ height }}>
        {values.map((v, i) => (
          <div
            key={i}
            className={`min-w-px flex-1 rounded-t-[2px] ${TONE[tone ? tone(v, i) : limit !== undefined && v > limit ? "bad" : "ok"]}`}
            style={{ height: `${Math.min(100, (v / top) * 100)}%`, minHeight: v > 0 ? 2 : 0 }}
          />
        ))}
        {limit !== undefined && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 top-1.5">
            <div className="absolute inset-x-0 border-t border-dashed border-ink-2" style={{ bottom: `${Math.min(100, (limit / top) * 100)}%` }}>
              {limitLabel && <span className="absolute -top-5 right-1 rounded bg-surface/90 px-1 font-mono text-[10px] text-ink-2">{limitLabel}</span>}
            </div>
          </div>
        )}
      </div>
      {axis && (
        <div className="relative mt-1 h-4">
          {axis.map(([t, at]) => (
            <span key={t + at} className="absolute -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-ink-3" style={{ left: `${at * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Reports a widget's starting state once, so Check works whichever control the learner touches first. */
export function useInitialReport(report: () => void) {
  const saved = useRef(report);
  useEffect(() => {
    saved.current();
  }, []);
}

/** Calls `fn` every `ms` while `active`. The latest `fn` is always used. */
export function useTicker(active: boolean, ms: number, fn: () => void) {
  const saved = useRef(fn);
  useEffect(() => {
    saved.current = fn;
  });
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => saved.current(), ms);
    return () => clearInterval(t);
  }, [active, ms]);
}
