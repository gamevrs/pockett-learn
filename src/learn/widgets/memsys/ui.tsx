"use client";

import React from "react";

/** Shared kit for the memory-system widgets: the "Inside the computer" controls plus a slider, and number formatting. */
export { Btn, Caption, Field, Note, Readout, Stepper, clamp } from "../computer/ui";
export { Slider, Meter } from "../ai/ui";

/** Nanoseconds as a readable time ("85 ns", "12 µs", "3.2 ms", "1.5 s"). */
export function fmtNs(ns: number): string {
  if (!isFinite(ns)) return "∞";
  const a = Math.abs(ns);
  if (a < 1) return `${+ns.toFixed(2)} ns`;
  if (a < 10) return `${+ns.toFixed(1)} ns`;
  if (a < 1000) return `${Math.round(ns)} ns`;
  if (a < 1e4) return `${+(ns / 1e3).toFixed(1)} µs`;
  if (a < 1e6) return `${Math.round(ns / 1e3)} µs`;
  if (a < 1e7) return `${+(ns / 1e6).toFixed(1)} ms`;
  if (a < 1e9) return `${Math.round(ns / 1e6)} ms`;
  if (a < 6e10) return `${+(ns / 1e9).toFixed(1)} s`;
  return `${+(ns / 6e10).toFixed(1)} min`;
}

/** A human duration in seconds ("45 seconds", "3 minutes", "2 hours", "5 days", "4 months", "5 years"). */
export function fmtHuman(sec: number): string {
  const r = (n: number) => (n < 10 ? +n.toFixed(1) : Math.round(n));
  if (sec < 1) return `${r(sec)} seconds`;
  if (sec < 90) return `${r(sec)} seconds`;
  if (sec < 5400) return `${r(sec / 60)} minutes`;
  if (sec < 172800) return `${r(sec / 3600)} hours`;
  if (sec < 86400 * 60) return `${r(sec / 86400)} days`;
  if (sec < 86400 * 365 * 2) return `${r(sec / (86400 * 30))} months`;
  return `${r(sec / (86400 * 365))} years`;
}

/** Bytes as KiB/MiB/GiB. */
export function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${+(b / 1024).toFixed(1)} KiB`.replace(".0", "");
  if (b < 1024 ** 3) return `${+(b / 1024 ** 2).toFixed(1)} MiB`.replace(".0", "");
  return `${+(b / 1024 ** 3).toFixed(1)} GiB`.replace(".0", "");
}

export const hex = (n: number, digits = 4) => `0x${(n >>> 0).toString(16).toUpperCase().padStart(digits, "0")}`;

/** A small labelled tile used by several widgets. */
export function Chip({ children, tone = "plain", className = "" }: { children: React.ReactNode; tone?: "plain" | "brand" | "bad" | "muted"; className?: string }) {
  const t =
    tone === "brand"
      ? "border-transparent bg-primary text-primary-ink"
      : tone === "bad"
        ? "border-[var(--bad)]/60 bg-surface text-bad"
        : tone === "muted"
          ? "border-line bg-surface-2 text-ink-3"
          : "border-line bg-surface text-ink";
  return <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 font-mono text-[0.78rem] font-semibold ${t} ${className}`}>{children}</span>;
}

/** Choice pills that wrap onto several lines on narrow screens (radio group, every pill at least 40 x 40). */
export function Seg<T extends string | number>({
  options,
  value,
  onChange,
  label,
  disabled,
  className = "",
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={`flex flex-wrap justify-center gap-1.5 ${className}`}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`min-h-10 min-w-10 rounded-full border px-3.5 text-[0.82rem] font-medium transition-colors disabled:cursor-not-allowed ${
              on ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink-2 hover:border-[var(--line-strong)] hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
