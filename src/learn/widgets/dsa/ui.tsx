"use client";

import React from "react";
import { CodeBlock } from "@/components/ui/Prose";

/** Shared bits for the data-structures widgets: labels, readouts, steppers, code panes, sliders. */

/** Small uppercase caption above a panel. */
export function Caption({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-ink-3 ${className}`}>{children}</p>;
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

/** A status line under a widget: a soft panel with live text. */
export function Note({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "good" | "bad" }) {
  const toneCls = tone === "good" ? "border-[var(--brand)]/50 bg-tint" : tone === "bad" ? "border-[var(--bad)]/40 bg-[var(--bad)]/[0.06]" : "border-line bg-surface-2";
  return (
    <div className={`mt-4 flex min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm text-ink-2 ${toneCls}`} aria-live="polite">
      {children}
    </div>
  );
}

/** A − value + stepper with 40px targets. */
export function Stepper({
  label,
  value,
  onDec,
  onInc,
  canDec,
  canInc,
  disabled,
}: {
  label: string;
  value: React.ReactNode;
  onDec: () => void;
  onInc: () => void;
  canDec: boolean;
  canInc: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface p-0.5">
      <button type="button" className="grid h-10 w-10 place-items-center rounded-full text-lg text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-30" onClick={onDec} disabled={disabled || !canDec} aria-label={`Decrease ${label}`}>
        −
      </button>
      <span className="min-w-[3.25rem] text-center">
        <span className="block text-[0.65rem] leading-none text-ink-3">{label}</span>
        <span className="font-mono text-base font-semibold tabular-nums text-ink">{value}</span>
      </span>
      <button type="button" className="grid h-10 w-10 place-items-center rounded-full text-lg text-ink-2 hover:bg-surface-2 hover:text-ink disabled:opacity-30" onClick={onInc} disabled={disabled || !canInc} aria-label={`Increase ${label}`}>
        +
      </button>
    </div>
  );
}

/** Two to five option segmented switch, 40px tall. */
export function Segmented<T extends string>({
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
    <div role="radiogroup" aria-label={label} className={`inline-flex max-w-full rounded-full border border-line bg-surface-2 p-0.5 ${className}`}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          disabled={disabled}
          onClick={() => onChange(o.id)}
          className={`min-h-10 flex-1 rounded-full px-3 text-[0.8rem] font-medium whitespace-nowrap transition-colors disabled:cursor-default ${
            value === o.id ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)]" : "text-ink-3 hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Dark code surface that matches lesson code blocks in both themes. */
export const CODE_SURFACE = "rounded-xl border border-white/10 bg-[#0a0a0a] text-[#e5e5e5]";

/** A small dark Python code pane with optional highlighted lines (0-based). */
export function CodePane({ code, highlight = [], title, className = "" }: { code: string; highlight?: number[]; title?: React.ReactNode; className?: string }) {
  const lines = code.replace(/\n$/, "").split("\n");
  return (
    <div className={`min-w-0 overflow-hidden ${CODE_SURFACE} ${className}`}>
      {title && <div className="border-b border-white/10 px-3 py-1.5 font-mono text-[11px] text-white/55">{title}</div>}
      <pre className="overflow-x-auto py-2 font-mono text-[12.5px] leading-[1.6]">
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

const THUMB =
  "[&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-[3px] [&::-webkit-slider-thumb]:border-[var(--surface)] [&::-webkit-slider-thumb]:bg-[var(--brand)] [&::-webkit-slider-thumb]:shadow-[0_0_0_1px_var(--line-strong),0_2px_6px_rgba(0,0,0,0.25)] " +
  "[&::-moz-range-thumb]:h-6 [&::-moz-range-thumb]:w-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-[3px] [&::-moz-range-thumb]:border-[var(--surface)] [&::-moz-range-thumb]:bg-[var(--brand)] [&::-moz-range-track]:bg-transparent";

/** A range slider with a filled track, 40px tall. */
export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
  disabled?: boolean;
}) {
  const pct = max === min ? 0 : ((value - min) / (max - min)) * 100;
  return (
    <div className="relative h-10 w-full">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-surface-2 ring-1 ring-inset ring-[var(--line)]">
        <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className={`relative h-10 w-full cursor-pointer appearance-none bg-transparent disabled:cursor-default ${THUMB}`}
      />
    </div>
  );
}

/** 1,234,567 */
export const fmt = (n: number) => (Number.isFinite(n) ? Math.round(n).toLocaleString("en-US") : "∞");

/** Exact list equality for goal checks. */
export function sameList(a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  return a.length === b.length && a.every((v, i) => String(v) === String(b[i]));
}
