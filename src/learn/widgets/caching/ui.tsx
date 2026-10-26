"use client";

import React from "react";

/** Wrapping pill group (the shared Segmented switch never wraps, so long labels overflow at 320 px). */
export function Choice<T extends string>({
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
    <div role="radiogroup" aria-label={label} className={`flex max-w-full flex-wrap gap-1.5 ${className}`}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          disabled={disabled}
          onClick={() => onChange(o.id)}
          className={`min-h-10 rounded-full border px-3.5 text-[0.8rem] font-medium transition-colors disabled:cursor-default ${
            value === o.id ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface text-ink-3 hover:border-[var(--line-strong)] hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** An on/off pill (several can be on at once). */
export function Toggle({ on, onClick, disabled, children }: { on: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-[0.8rem] font-medium transition-colors disabled:cursor-default ${
        on ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface text-ink-3 hover:border-[var(--line-strong)] hover:text-ink"
      }`}
    >
      <span className={`grid h-4 w-4 place-items-center rounded border text-[10px] leading-none ${on ? "border-transparent bg-primary text-primary-ink" : "border-[var(--line-strong)]"}`}>{on ? "✓" : ""}</span>
      {children}
    </button>
  );
}

/** 0.4 ms, 12 ms, 1.2 s, 3.5 min … */
export function dur(ms: number): string {
  if (ms < 1) return `${+ms.toFixed(2)} ms`;
  if (ms < 1000) return `${+ms.toFixed(ms < 10 ? 1 : 0)} ms`;
  const s = ms / 1000;
  if (s < 60) return `${+s.toFixed(s < 10 ? 1 : 0)} s`;
  const m = s / 60;
  if (m < 60) return `${+m.toFixed(m < 10 ? 1 : 0)} min`;
  const h = m / 60;
  if (h < 48) return `${+h.toFixed(h < 10 ? 1 : 0)} hours`;
  const d = h / 24;
  if (d < 365) return `${+d.toFixed(d < 10 ? 1 : 0)} days`;
  return `${+(d / 365).toFixed(1)} years`;
}
