"use client";

/** Shared kit for the GPU widgets: the Hardware path reuses the computer module's controls and the AI module's slider. */
import React from "react";

export { Btn, Caption, Field, Note, Readout, Stepper } from "../computer/ui";
export { Meter, Slider } from "../ai/ui";

/** Second data hue that reads on both themes (checked on dark and light). */
export const ORANGE = "#e8924a";
export const BLUE = "#4fa3df";

/** Compact number: 1,234 / 12.3 k / 4.5 M. */
export function compact(n: number): string {
  if (n >= 1e9) return `${+(n / 1e9).toFixed(2)} G`;
  if (n >= 1e6) return `${+(n / 1e6).toFixed(2)} M`;
  if (n >= 1e4) return `${+(n / 1e3).toFixed(1)} k`;
  return n.toLocaleString("en-US");
}

/** Seconds as a friendly unit. */
export function fmtTime(s: number): string {
  if (s >= 1) return `${+s.toFixed(2)} s`;
  if (s >= 1e-3) return `${+(s * 1e3).toFixed(2)} ms`;
  if (s >= 1e-6) return `${+(s * 1e6).toFixed(2)} µs`;
  return `${+(s * 1e9).toFixed(1)} ns`;
}

/** Segmented control like computer/ui Seg, but every segment is at least 40px wide so short labels ("4", "8") stay easy to tap. */
export function Seg<T extends string | number>({
  options,
  value,
  onChange,
  label,
  className = "",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`inline-flex max-w-full flex-wrap rounded-3xl border border-line bg-surface-2 p-0.5 ${className}`}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`min-h-10 min-w-10 flex-auto whitespace-nowrap rounded-full px-3 text-xs font-medium transition-colors sm:text-[0.8rem] ${
              on ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)]" : "text-ink-3 hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
