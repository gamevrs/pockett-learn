"use client";

import React, { useEffect, useRef, useState } from "react";

/** Shared pieces for the "Getting code to production" widgets: the networking UI kit plus a slider, a ticker and a reporter. */
export { Caption, Note, Pill, Readout, noise, shuffle, sameSet } from "../net/ui";

/**
 * Segmented switch that stays inside a narrow card: columns share the width equally and a long
 * label wraps onto a second line instead of pushing the control off the screen.
 */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  disabled,
  label,
  className = "",
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-grid max-w-full grid-flow-col auto-cols-fr gap-0.5 rounded-[1.4rem] border border-line bg-surface-2 p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          disabled={disabled}
          onClick={() => onChange(o.id)}
          className={`min-h-10 min-w-0 rounded-full px-3 py-1 text-center text-[13px] font-medium leading-tight transition-colors disabled:cursor-not-allowed sm:text-sm ${
            value === o.id ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.12)] ring-1 ring-[var(--line-strong)]" : "text-ink-2 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Range slider with a label and a mono readout, 40px tall. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  disabled?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="flex items-baseline justify-between gap-2 text-xs text-ink-3">
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
        className="mt-0.5 h-10 w-full cursor-pointer accent-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  );
}

/** A two-state switch button with a label, 40px tall. */
export function Toggle({ on, onClick, disabled, children }: { on: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        on ? "border-[var(--brand)]/60 bg-tint text-ink" : "border-line bg-surface text-ink-2 hover:text-ink"
      }`}
    >
      <span className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${on ? "bg-primary" : "bg-[var(--line-strong)]"}`}>
        <span className={`absolute top-0.5 h-3 w-3 rounded-full transition-all ${on ? "left-3.5 bg-[#0a0a0a]" : "left-0.5 bg-white"}`} />
      </span>
      {children}
    </button>
  );
}

/**
 * Tell the lesson player the widget's state. Reports once on mount and whenever `key` changes
 * (pass a string that changes exactly when the state does), through refs so a new `onChange`
 * function on every parent render never retriggers it.
 */
export function useReport(onChange: ((state: unknown) => void) | undefined, state: unknown, key: string) {
  const cb = useRef(onChange);
  const latest = useRef(state);
  useEffect(() => {
    cb.current = onChange;
    latest.current = state;
  });
  useEffect(() => {
    cb.current?.(latest.current);
  }, [key]);
}

/** A step counter that can also play itself: `t` runs from 0 to `total`. */
export function useTicker(total: number, ms: number) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const running = playing && t < total;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setT((p) => Math.min(total, p + 1)), ms);
    return () => clearInterval(id);
  }, [running, total, ms]);
  return {
    t: Math.min(t, total),
    playing: running,
    set: (n: number) => {
      setPlaying(false);
      setT(Math.max(0, Math.min(total, n)));
    },
    play: () => {
      if (t >= total) setT(0);
      setPlaying(true);
    },
    pause: () => setPlaying(false),
  };
}

/** "2m 05s" / "45s" / "820ms" */
export function fmtSecs(s: number): string {
  if (s < 1) return `${Math.round(s * 1000)}ms`;
  if (s < 60) return `${Math.round(s * 10) / 10}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${String(Math.round(s - m * 60)).padStart(2, "0")}s`;
}
