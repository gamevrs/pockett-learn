"use client";

import React from "react";
import { Lock } from "lucide-react";
import { TONE_CHIP, statusText, statusTone } from "./session";

/** Shared building blocks for the Pocket Store scene (Pockett Stage look: neutral greys, lime = your code). */

export const INPUT =
  "h-7 min-w-0 rounded-md border border-white/12 bg-white/[0.04] px-2 text-[11px] text-white placeholder:text-white/30 outline-none transition-colors focus:border-[#c5ee8a]/60 disabled:cursor-not-allowed disabled:opacity-50";

export const BTN =
  "inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-white/12 bg-white/[0.05] px-2.5 text-[11px] font-medium text-white/85 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white/[0.05]";

export const BTN_ON =
  "inline-flex h-7 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-transparent bg-[#c5ee8a] px-3 text-[11px] font-semibold text-[#0a0a0a] transition-colors hover:bg-[#d3f3a4] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#c5ee8a]";

export function StatusChip({ status, withText = true }: { status: number; withText?: boolean }) {
  const tone = statusTone(status);
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-1.5 py-px font-mono text-[10px] font-semibold tabular-nums ${TONE_CHIP[tone]}`}>
      {status > 0 ? status : "ERR"}
      {withText && status > 0 && <span className="font-medium opacity-80">{statusText(status)}</span>}
    </span>
  );
}

const METHOD_TONE: Record<string, string> = {
  GET: "text-white/65",
  POST: "text-[#d3f3a4]",
  PUT: "text-[#fbbf24]",
  PATCH: "text-[#fbbf24]",
  DELETE: "text-[#f87171]",
};

export function MethodTag({ method, className = "" }: { method: string; className?: string }) {
  return <span className={`shrink-0 font-mono text-[10px] font-semibold ${METHOD_TONE[method] ?? "text-white/65"} ${className}`}>{method}</span>;
}

/** Pretty JSON with light syntax colour. Keys white, strings pale lime (it is your data), numbers amber. */
export function JsonView({ text, className = "" }: { text: string; className?: string }) {
  const parts: React.ReactNode[] = [];
  const re = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b/g;
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) parts.push(text.slice(last, idx));
    const [tok, str, colon, num, lit] = m;
    if (str && colon) {
      parts.push(
        <span key={i++} className="text-white">
          {str}
        </span>,
        <span key={i++} className="text-white/45">
          {colon}
        </span>,
      );
    } else if (str) parts.push(<span key={i++} className="text-[#e0f6c1]">{tok}</span>);
    else if (num) parts.push(<span key={i++} className="text-[#fcd34d]">{tok}</span>);
    else if (lit) parts.push(<span key={i++} className="text-white/50">{tok}</span>);
    last = idx + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <pre className={`whitespace-pre-wrap break-words font-mono text-[10.5px] leading-[1.5] text-white/70 ${className}`}>{parts}</pre>;
}

/** A blueprint placeholder: says which request this part of the shop is waiting for. */
export function Locked({
  title,
  need,
  lesson,
  spot,
  compact = false,
  children,
}: {
  title: string;
  need: string;
  lesson: number;
  spot: boolean;
  compact?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      data-locked=""
      className={`rounded-[10px] border border-dashed ${compact ? "px-3 py-2" : "px-3 py-3.5"} ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
        <h4 className="hud-label min-w-0 flex-1 truncate">{title}</h4>
        <span className="hud-label shrink-0 text-white/30">L{lesson}</span>
      </div>
      {children}
      <p className="mt-2 text-[11px] leading-snug text-white/45">
        {spot ? <span className="hud-accent">Pass this lesson to switch it on · </span> : "Locked · "}
        this needs <code className="rounded bg-white/[0.06] px-1 py-px font-mono text-[10.5px] text-white/70">{need}</code>
      </p>
    </div>
  );
}

export function GhostRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mt-2.5 space-y-1.5" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="h-1.5 w-8 rounded-sm bg-white/[0.06]" />
          <div className="h-1.5 flex-1 rounded-sm bg-white/[0.05]" />
          <div className="h-1.5 w-10 rounded-sm bg-white/[0.06]" />
        </div>
      ))}
    </div>
  );
}

export function GhostGrid({ cards = 4 }: { cards?: number }) {
  return (
    <div className="mt-2.5 grid grid-cols-2 gap-2 @sm:grid-cols-4" aria-hidden>
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="rounded-lg border border-dashed border-white/10 p-1.5">
          <div className="aspect-[4/3] rounded-md bg-white/[0.04]" />
          <div className="mt-1.5 h-1.5 w-3/4 rounded-sm bg-white/[0.06]" />
          <div className="mt-1 h-1.5 w-1/3 rounded-sm bg-white/[0.05]" />
        </div>
      ))}
    </div>
  );
}

export function PaneFrame({
  title,
  icon,
  meta,
  actions,
  children,
  className = "",
}: {
  title: string;
  icon: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`hud-panel @container flex min-h-0 min-w-0 flex-1 flex-col !p-0 ${className}`}>
      <header className="flex min-w-0 shrink-0 items-center gap-2 border-b border-white/[0.07] px-3 py-2">
        <span className="shrink-0 text-[#c5ee8a]">{icon}</span>
        <h3 className="hud-title min-w-0 truncate">{title}</h3>
        {meta && <span className="hud-value hud-muted min-w-0 truncate text-[10px]">{meta}</span>}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">{actions}</div>
      </header>
      {children}
    </div>
  );
}

/** Tab strip used inside panes. `locked` tabs show a padlock and are not clickable. */
export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  fresh,
}: {
  tabs: { id: T; label: string; locked?: boolean; badge?: string | number }[];
  value: T;
  onChange: (id: T) => void;
  fresh?: ReadonlySet<string>;
}) {
  return (
    <div role="tablist" className="flex min-w-0 shrink-0 gap-0.5 overflow-x-auto border-b border-white/[0.07] px-2 pt-1.5 [scrollbar-width:none]">
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={`relative flex shrink-0 items-center gap-1.5 rounded-t-md px-2.5 pb-1.5 pt-1 text-[11px] font-medium transition-colors ${
              active ? "text-white" : t.locked ? "text-white/30 hover:text-white/50" : "text-white/55 hover:text-white/80"
            }`}
          >
            {t.locked && <Lock className="h-2.5 w-2.5" aria-hidden />}
            {t.label}
            {t.badge !== undefined && t.badge !== 0 && <span className="hud-value rounded-full bg-white/10 px-1.5 text-[9.5px] text-white/70">{t.badge}</span>}
            {fresh?.has(t.id) && <span className="h-1.5 w-1.5 rounded-full bg-[#c5ee8a]" aria-label="new" />}
            {active && <span className="absolute inset-x-1.5 -bottom-px h-[2px] rounded-full bg-[#c5ee8a]" />}
          </button>
        );
      })}
    </div>
  );
}

export function Empty({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "bad" | "warn" }) {
  const cls = tone === "bad" ? "text-[#f87171]" : tone === "warn" ? "text-[#fbbf24]" : "text-white/50";
  return <p className={`px-1 py-2 text-[11px] leading-snug ${cls}`}>{children}</p>;
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
