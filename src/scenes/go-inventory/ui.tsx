"use client";

import React from "react";

/**
 * Small building blocks shared by the ledger board's panels. Colour follows the Pockett Stage
 * system: neutral greys for structure, lime only for values the learner's code produced, amber for
 * caution, red for failure.
 */

export { Frame, LockedPanel, WaitingPanel } from "../go-basics/panels";
export type { GhostKind } from "../go-basics/panels";

export const LIME = "#c5ee8a";
export const AMBER = "#fbbf24";
export const RED = "#f87171";

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const dash = "—";

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="hud-log hud-muted py-1 text-[11px]">{children}</p>;
}

export type Tone = "plain" | "accent" | "warning" | "danger" | "mute";

const PILL: Record<Tone, string> = {
  accent: "border-[#c5ee8a]/50 bg-[#c5ee8a]/10 text-[#e0f6c1]",
  warning: "border-[#fbbf24]/45 bg-[#fbbf24]/10 text-[#fde68a]",
  danger: "border-[#f87171]/45 bg-[#f87171]/10 text-[#fecaca]",
  mute: "border-white/10 text-white/60",
  plain: "border-white/15 bg-white/[0.04] text-white/80",
};

/** A small read-only pill. */
export function Pill({ children, tone = "plain", title, solid }: { children: React.ReactNode; tone?: Tone; title?: string; solid?: boolean }) {
  const solidCls =
    tone === "accent" ? "border-transparent bg-[#c5ee8a] text-[#0a0a0a]" : tone === "danger" ? "border-transparent bg-[#f87171] text-[#0a0a0a]" : tone === "warning" ? "border-transparent bg-[#fbbf24] text-[#0a0a0a]" : PILL[tone];
  return (
    <span title={title} className={`inline-flex h-5 max-w-full items-center rounded-full border px-2 font-mono text-[10px] ${solid ? solidCls : PILL[tone]}`}>
      <span className="truncate">{children}</span>
    </span>
  );
}

export function Tile({ label, value, tone = "plain", unit }: { label: string; value: React.ReactNode; tone?: Tone; unit?: string }) {
  const color = tone === "accent" ? "hud-accent" : tone === "warning" ? "hud-warning" : tone === "danger" ? "hud-danger" : "";
  return (
    <div className="min-w-0 rounded-md bg-white/[0.04] px-2.5 py-2">
      <dt className="hud-label break-words">{label}</dt>
      <dd className={`hud-value mt-0.5 break-words text-[15px] leading-tight tabular-nums ${value === dash ? "text-white/45" : color}`}>
        {value}
        {unit && value !== dash && <span className="hud-muted ml-1 text-[10px]">{unit}</span>}
      </dd>
    </div>
  );
}

export function Lamp({ on, label, bad }: { on: boolean | undefined; label: string; bad?: boolean }) {
  const color = on === undefined ? "bg-white/25" : on ? (bad ? "bg-[#f87171]" : "bg-[#c5ee8a]") : "bg-white/25";
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-[10.5px] text-white/75">
      <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function BarRow({ label, value, max, text, tone = "accent", labelWidth = "5.5rem" }: { label: string; value: number; max: number; text?: string; tone?: Tone; labelWidth?: string }) {
  const pct = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 truncate font-mono text-[10.5px] text-white/65" style={{ width: labelWidth }} title={label}>
        {label}
      </span>
      <div className="hud-bar h-2 min-w-0 flex-1">
        <span style={{ width: `${pct}%`, background: tone === "warning" ? AMBER : tone === "danger" ? RED : undefined }} />
      </div>
      <span className="hud-value min-w-7 shrink-0 whitespace-nowrap text-right text-[10.5px]">{text ?? String(value)}</span>
    </div>
  );
}

/** A monospace snippet on a dark inset. */
export function Code({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <pre className={`overflow-x-auto whitespace-pre rounded-md bg-black/40 px-2 py-1.5 font-mono text-[10.5px] leading-[1.55] text-white/85 ${className}`}>{children}</pre>;
}

/** Concrete-type pill: "main.Receiver" is shown as Receiver with its package faded, "*main.Retirer" keeps its star. */
export function TypePill({ type, tone = "accent" }: { type: string; tone?: Tone }) {
  const pointer = type.startsWith("*");
  const bare = pointer ? type.slice(1) : type;
  const dot = bare.indexOf(".");
  const pkg = dot >= 0 ? bare.slice(0, dot + 1) : "";
  const name = dot >= 0 ? bare.slice(dot + 1) : bare;
  return (
    <span title={type} className={`inline-flex h-5 max-w-full items-center rounded-md border px-1.5 font-mono text-[10.5px] ${PILL[tone]}`}>
      <span className="truncate">
        {pointer && <span className="font-semibold">*</span>}
        {pkg && <span className="opacity-60">{pkg}</span>}
        {name}
      </span>
    </span>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="hud-label mb-1">{children}</p>;
}

export function safeJson(v: unknown): string {
  try {
    const s = JSON.stringify(v);
    return s === undefined ? String(v) : s;
  } catch {
    return String(v);
  }
}
