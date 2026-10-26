"use client";

import React from "react";
import { Lock } from "lucide-react";

/** Shared building blocks for the Event Arena scene (Pockett Stage look: neutral greys, lime = your code). */

export const BTN =
  "inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-white/12 bg-white/[0.05] px-2.5 text-[11px] font-medium text-white/85 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/[0.05]";

export const BTN_ON =
  "inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-transparent bg-[#c5ee8a] px-3 text-[11px] font-semibold text-[#0a0a0a] transition-colors hover:bg-[#d3f3a4] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#c5ee8a]";

export const INPUT =
  "h-7 min-w-0 rounded-md border border-white/12 bg-white/[0.04] px-2 text-[11px] text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#c5ee8a]/60 disabled:cursor-not-allowed disabled:opacity-50";

/** Which lesson unlocks each feature (shown on locked blueprints). */
export const LESSON_OF: Record<string, number> = {
  "arena-feed": 1,
  "arena-scoreboard": 2,
  "arena-clock": 3,
  "arena-highlights": 4,
  "arena-standings": 5,
  "arena-stats": 6,
  "arena-bus": 7,
  "arena-resilience": 8,
  "arena-loop": 9,
  "arena-network": 10,
  "arena-cancel": 11,
  "arena-retry": 12,
  "arena-replay": 13,
  "arena-pipeline": 14,
};

/** A blueprint placeholder: says which function of yours this part of the arena is waiting for. */
export function Locked({
  feature,
  title,
  need,
  spot,
  compact = false,
  className = "",
  children,
}: {
  feature: string;
  title: string;
  need: string;
  spot: boolean;
  compact?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div data-locked="" className={`rounded-[10px] border border-dashed ${compact ? "px-3 py-2" : "px-3 py-3"} ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"} ${className}`}>
      <div className="flex min-w-0 items-center gap-2">
        <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
        <h4 className="hud-label min-w-0 flex-1 truncate">{title}</h4>
        <span className="hud-label shrink-0 text-white/30">L{LESSON_OF[feature] ?? "?"}</span>
      </div>
      {children}
      <p className="mt-1.5 text-[11px] leading-snug text-white/45">
        {spot ? <span className="hud-accent">Pass this lesson to switch it on · </span> : "Locked · "}
        needs <code className="rounded bg-white/[0.06] px-1 py-px font-mono text-[10.5px] text-white/70">{need}</code>
      </p>
    </div>
  );
}

export function Panel({
  title,
  icon,
  meta,
  actions,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: string;
  icon?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`hud-panel @container flex min-h-0 min-w-0 flex-col !p-0 ${className}`}>
      <header className="flex min-w-0 shrink-0 items-center gap-2 border-b border-white/[0.07] px-3 py-2">
        {icon && <span className="shrink-0 text-[#c5ee8a]">{icon}</span>}
        <h3 className="hud-title min-w-0 truncate">{title}</h3>
        {meta && <span className="hud-value hud-muted min-w-0 truncate text-[10px]">{meta}</span>}
        {actions && <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions}</div>}
      </header>
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function Notice({ tone, children }: { tone: "ok" | "warn" | "bad"; children: React.ReactNode }) {
  const cls =
    tone === "bad"
      ? "border-[#f87171]/40 bg-[#f87171]/10 text-[#fca5a5]"
      : tone === "warn"
        ? "border-[#fbbf24]/35 bg-[#fbbf24]/10 text-[#fcd34d]"
        : "border-[#c5ee8a]/30 bg-[#c5ee8a]/10 text-[#e0f6c1]";
  return <div className={`rounded-md border px-2.5 py-1.5 text-[11px] leading-snug ${cls}`}>{children}</div>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-1 py-2 text-[11px] leading-snug text-white/45">{children}</p>;
}

export const TYPE_STYLE: Record<string, { label: string; dot: string; text: string }> = {
  goal: { label: "Goal", dot: "bg-[#c5ee8a]", text: "text-[#e0f6c1]" },
  foul: { label: "Foul", dot: "bg-[#fbbf24]", text: "text-[#fcd34d]" },
  timeout: { label: "Timeout", dot: "bg-[#9ca3af]", text: "text-white/70" },
  card: { label: "Card", dot: "bg-[#f87171]", text: "text-[#fca5a5]" },
};

export function TypeDot({ type, className = "" }: { type: string; className?: string }) {
  return <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${TYPE_STYLE[type]?.dot ?? "bg-white/40"} ${className}`} aria-hidden />;
}

export function Chip({ children, tone = "plain", className = "" }: { children: React.ReactNode; tone?: "plain" | "ok" | "warn" | "bad"; className?: string }) {
  const cls =
    tone === "ok"
      ? "border-[#c5ee8a]/30 text-[#e0f6c1]"
      : tone === "warn"
        ? "border-[#fbbf24]/35 text-[#fcd34d]"
        : tone === "bad"
          ? "border-[#f87171]/40 text-[#fca5a5]"
          : "border-white/12 text-white/60";
  return <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-px font-mono text-[10px] font-semibold tabular-nums ${cls} ${className}`}>{children}</span>;
}

export const fmtMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${Math.round(ms)}ms`);
