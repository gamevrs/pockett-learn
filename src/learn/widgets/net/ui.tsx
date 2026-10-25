"use client";

import React from "react";

/** Shared pieces for the networking widgets: captions, pills, segmented switches, readouts. */

/** Small uppercase caption. */
export function Caption({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-3 ${className}`}>{children}</p>;
}

/** Inline readout pill: label + mono value. */
export function Readout({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <span className={`inline-flex items-baseline gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-sm ${accent ? "border-[var(--brand)]/50 bg-tint" : "border-line bg-surface"}`}>
      <span className="text-xs text-ink-3">{label}</span>
      <span className="font-mono font-semibold tabular-nums text-ink">{value}</span>
    </span>
  );
}

/** Pill button, 40px tall. `on` fills it with the accent. */
export function Pill({
  on,
  onClick,
  disabled,
  children,
  label,
  className = "",
}: {
  on?: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      aria-label={label}
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
        on ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink hover:border-[var(--line-strong)] hover:bg-surface-2"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** Segmented switch (two to five options), 40px tall. */
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
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-full border border-line bg-surface-2 p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          disabled={disabled}
          onClick={() => onChange(o.id)}
          className={`min-h-10 flex-1 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
            value === o.id ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.12)] ring-1 ring-[var(--line-strong)]" : "text-ink-2 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A status line under a widget: neutral, good or bad. */
export function Note({ tone = "neutral", children, className = "" }: { tone?: "neutral" | "good" | "bad" | "accent"; children: React.ReactNode; className?: string }) {
  const tones = {
    neutral: "border-line bg-surface-2 text-ink-2",
    good: "border-[var(--good)]/40 bg-[var(--good)]/[0.08] text-ink",
    bad: "border-[var(--bad)]/40 bg-[var(--bad)]/[0.07] text-ink",
    accent: "border-[var(--brand)]/45 bg-tint text-ink",
  } as const;
  return <div className={`rounded-xl border px-3 py-2 text-sm ${tones[tone]} ${className}`}>{children}</div>;
}

/** Deterministic pseudo-random number in [0, 1) from integers (no Math.random during render). */
export function noise(...parts: number[]): number {
  let h = 2166136261;
  for (const p of parts) {
    h = Math.imul(h ^ (p & 0xffff), 16777619);
    h = Math.imul(h ^ (p >>> 16), 16777619);
  }
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Deterministic shuffle by integer seed. */
export function shuffle<T>(items: T[], seed: number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(noise(seed, i) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Order-insensitive comparison of two string lists. */
export function sameSet(a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  const x = [...a].map(String).sort();
  const y = [...b].map(String).sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
}
