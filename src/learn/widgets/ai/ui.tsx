"use client";

import React from "react";

/** The AI-systems widgets share the networking module's small kit, plus a labelled slider. */
export { Caption, Note, Pill, Readout, Segmented, noise, shuffle, sameSet } from "../net/ui";

/** A labelled range input with a live value, 40px tall target. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled,
  format,
  className = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  format?: (v: number) => string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="flex items-baseline justify-between gap-2 text-xs text-ink-3">
        <span>{label}</span>
        <span className="font-mono text-[12.5px] font-semibold tabular-nums text-ink">{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 h-10 w-full cursor-pointer accent-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  );
}

/** A thin horizontal meter: filled share of a track, accent or warning colour. */
export function Meter({ frac, tone = "brand", label }: { frac: number; tone?: "brand" | "bad" | "warn" | "muted"; label?: string }) {
  const colour = tone === "bad" ? "var(--bad)" : tone === "warn" ? "#d9a21b" : tone === "muted" ? "var(--ink-3)" : "var(--brand)";
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--line-strong)]" role="img" aria-label={label}>
      <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(1, frac)) * 100}%`, background: colour }} />
    </div>
  );
}
