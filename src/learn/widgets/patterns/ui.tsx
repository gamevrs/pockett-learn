"use client";

import React from "react";
import { CodeBlock } from "@/components/ui/Prose";

/** Shared bits for the design-pattern widgets: code panes, toggle buttons, labels. */

/** A small dark code pane (same look as lesson code blocks) with optional highlighted lines. */
export function CodePane({
  code,
  title,
  badge,
  highlight = [],
  className = "",
}: {
  code: string;
  title?: string;
  /** Short note on the right of the title bar, e.g. "never edited". */
  badge?: React.ReactNode;
  /** 0-based line numbers to mark with the accent bar. */
  highlight?: number[];
  className?: string;
}) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <div className={`min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0a] text-[#e5e5e5] ${className}`}>
      {(title || badge) && (
        <div className="flex min-h-8 items-center justify-between gap-2 border-b border-white/10 px-3 py-1 font-mono text-[11px] text-white/55">
          <span className="truncate">{title}</span>
          {badge && <span className="shrink-0">{badge}</span>}
        </div>
      )}
      <pre className="overflow-x-auto py-2 font-mono text-[12px] leading-[1.6]">
        {lines.map((line, i) => {
          const on = highlight.includes(i);
          return (
            <div key={i} className={`border-l-2 pl-2.5 pr-3 ${on ? "border-[#a3e635] bg-[#a3e635]/[0.12]" : "border-transparent"}`}>
              {line === "" ? " " : <CodeBlock code={line} language="python" />}
            </div>
          );
        })}
      </pre>
    </div>
  );
}

/** Pill toggle button, 40px tall. `on` fills it with the accent. */
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

/** Two-option segmented switch (e.g. Without factory / With factory). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex w-full max-w-sm rounded-full border border-line bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          disabled={disabled}
          onClick={() => onChange(o.id)}
          className={`min-h-10 flex-1 rounded-full px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed ${
            value === o.id ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.12)] ring-1 ring-[var(--line-strong)]" : "text-ink-2 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Small uppercase caption. */
export function Caption({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-3 ${className}`}>{children}</p>;
}

/** Inline readout pill: label + mono value. */
export function Readout({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <span className={`inline-flex items-baseline gap-2 rounded-full border px-3 py-1 text-sm ${accent ? "border-[var(--brand)]/50 bg-tint" : "border-line bg-surface"}`}>
      <span className="text-xs text-ink-3">{label}</span>
      <span className="font-mono font-semibold tabular-nums text-ink">{value}</span>
    </span>
  );
}

export const money = (n: number) => `$${n.toFixed(2)}`;

/** Order-insensitive comparison of two string lists. */
export function sameSet(a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  const x = [...a].map(String).sort();
  const y = [...b].map(String).sort();
  return x.length === y.length && x.every((v, i) => v === y[i]);
}
