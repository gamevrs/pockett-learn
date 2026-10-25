"use client";

import React from "react";
import {
  Camera,
  Cpu,
  HardDrive,
  Keyboard,
  MemoryStick,
  Microchip,
  Mic,
  Monitor,
  Mouse,
  Power,
  Globe,
  Speaker,
  Usb,
  Cog,
  AppWindow,
  Zap,
  LayoutGrid,
  Hand,
  type LucideIcon,
} from "lucide-react";

/** Shared bits for the "Inside the computer" widgets. */

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const hex = (n: number, digits = 2) => n.toString(16).toUpperCase().padStart(digits, "0");
export const bin = (n: number, digits = 8) => n.toString(2).padStart(digits, "0");

/** Icon names usable from lesson data (journeys, parts). */
export const ICONS: Record<string, LucideIcon> = {
  cpu: Cpu,
  ram: MemoryStick,
  storage: HardDrive,
  keyboard: Keyboard,
  mouse: Mouse,
  mic: Mic,
  camera: Camera,
  screen: Monitor,
  speaker: Speaker,
  firmware: Microchip,
  power: Power,
  network: Globe,
  usb: Usb,
  kernel: Cog,
  app: AppWindow,
  interrupt: Zap,
  desktop: LayoutGrid,
  finger: Hand,
};

export function Icon({ name, className = "h-5 w-5" }: { name: string; className?: string }) {
  const I = ICONS[name] ?? Cpu;
  return <I className={className} aria-hidden strokeWidth={1.9} />;
}

/** Small uppercase caption. */
export function Caption({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-3 ${className}`}>{children}</p>;
}

/** Label + mono value pill. */
export function Readout({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <span className={`inline-flex items-baseline gap-2 rounded-full border px-3 py-1 text-sm ${accent ? "border-[var(--brand)]/50 bg-tint" : "border-line bg-surface"}`}>
      <span className="text-xs text-ink-3">{label}</span>
      <span className="font-mono font-semibold tabular-nums text-ink">{value}</span>
    </span>
  );
}

/** Round button, 40px tall. `primary` fills it with the accent. */
export function Btn({
  onClick,
  disabled,
  primary,
  on,
  children,
  label,
  className = "",
}: {
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  /** Toggle look (pressed). */
  on?: boolean;
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  const filled = primary || on;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={on === undefined ? undefined : on}
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
        filled ? "border-transparent bg-primary text-primary-ink hover:bg-[var(--primary-hover)]" : "border-line bg-surface text-ink hover:border-[var(--line-strong)] hover:bg-surface-2"
      } ${className}`}
    >
      {children}
    </button>
  );
}

/** Segmented control, 40px tall. */
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
    <div role="radiogroup" aria-label={label} className={`inline-flex rounded-full border border-line bg-surface-2 p-0.5 ${className}`}>
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
            className={`min-h-10 flex-1 whitespace-nowrap rounded-full px-3 text-xs font-medium transition-colors sm:text-[0.8rem] ${
              on ? "bg-surface text-ink shadow-[0_0_0_1px_var(--line-strong)]" : "text-ink-3 hover:text-ink"
            } disabled:cursor-not-allowed`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** − value + number picker, 40px buttons. */
export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  format = String,
  disabled,
  wide,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  format?: (v: number) => string;
  disabled?: boolean;
  wide?: boolean;
}) {
  const btn =
    "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-lg font-medium text-ink transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(clamp(value - 1, min, max))} disabled={disabled || value <= min} aria-label={`${label}: down`}>
        −
      </button>
      <span className={`text-center font-mono text-[0.95rem] font-semibold tabular-nums text-ink ${wide ? "min-w-[4.5rem]" : "min-w-[2.75rem]"}`} aria-live="polite">
        {format(value)}
      </span>
      <button type="button" className={btn} onClick={() => onChange(clamp(value + 1, min, max))} disabled={disabled || value >= max} aria-label={`${label}: up`}>
        +
      </button>
    </div>
  );
}

/** A labelled field row used in control panels. */
export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <Caption>{label}</Caption>
      {children}
    </div>
  );
}

/** Note line under a widget (what just happened). */
export function Note({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "accent" }) {
  return (
    <p
      className={`rounded-xl border px-3.5 py-2.5 text-[0.88rem] leading-snug ${tone === "accent" ? "border-[var(--brand)]/40 bg-tint text-ink" : "border-line bg-surface-2 text-ink-2"}`}
      aria-live="polite"
    >
      {children}
    </p>
  );
}

/** Shallow "every key in goal matches state" check, with nested record support for maps like { cells: { 5: 42 } }. */
export function matchesGoal(state: Record<string, unknown> | undefined, goal: Record<string, unknown>, keys: string[]): boolean {
  if (!state) return false;
  let any = false;
  for (const k of keys) {
    if (!(k in goal)) continue;
    any = true;
    const want = goal[k];
    const got = state[k];
    if (want && typeof want === "object" && !Array.isArray(want)) {
      const g = got as Record<string, unknown> | unknown[] | undefined;
      if (!g) return false;
      for (const [kk, vv] of Object.entries(want as Record<string, unknown>)) {
        if ((g as Record<string, unknown>)[kk] !== vv) return false;
      }
    } else if (got !== want) return false;
  }
  return any;
}
