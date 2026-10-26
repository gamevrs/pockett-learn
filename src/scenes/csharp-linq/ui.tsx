"use client";

import React from "react";
import { Lock, Play } from "lucide-react";
import { clamp } from "./data";

/**
 * Shared building blocks of the Halyard Port board: panel frames, the dashed ghosts shown for
 * systems that are still locked, stat tiles, pills, bars and a few tiny helpers.
 * Colour follows the Pockett Stage system: neutral greys for structure, lime for values the
 * learner's code produced, amber for caution, red for failure.
 */

export const CSS = `
@keyframes hp-scan { from { transform: translateX(-100%); opacity: 0.85; } to { transform: translateX(100%); opacity: 0; } }
.hp-scan { animation: hp-scan 1.2s ease-out both; }
@keyframes hp-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.hp-grow { transform-origin: left center; animation: hp-grow 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) both; animation-delay: calc(var(--i, 0) * 45ms); }
@keyframes hp-flip { from { transform: perspective(240px) rotateX(-70deg); opacity: 0; } to { transform: none; opacity: 1; } }
.hp-flip { transform-origin: top center; animation: hp-flip 0.34s ease-out both; animation-delay: calc(var(--i, 0) * 28ms); }
@keyframes hp-blink { 50% { opacity: 0.35; } }
.hp-blink { animation: hp-blink 1.8s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .hp-scan, .hp-grow, .hp-flip, .hp-blink { animation: none !important; }
}
`;

export const C = { lime: "#c5ee8a", limeSoft: "#d3f3a4", amber: "#fbbf24", red: "#f87171", grey: "#c8c8c8" } as const;

export type Tone = "plain" | "accent" | "warning" | "danger";
export const toneClass = (t: Tone) => (t === "accent" ? "hud-accent" : t === "warning" ? "hud-warning" : t === "danger" ? "hud-danger" : "");
export const toneFill = (t: Tone) => (t === "accent" ? C.lime : t === "warning" ? C.amber : t === "danger" ? C.red : "rgba(255,255,255,0.42)");

export const dash = "—";

// ───────────────────────── frames ─────────────────────────

export function Frame({
  id,
  title,
  icon,
  meta,
  focus,
  flash,
  className = "",
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  meta?: React.ReactNode;
  focus?: boolean;
  flash?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section data-panel={id} className={`hud-panel flex min-w-0 flex-col px-3 py-2.5 ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""} ${className}`}>
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[#c5ee8a]">{icon}</span>
        <h3 className="hud-title min-w-0 flex-1 truncate">{title}</h3>
        {meta && <span className="hud-value hud-muted shrink-0 text-[10px]">{meta}</span>}
      </header>
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </section>
  );
}

export type GhostKind = "table" | "bars" | "tiles" | "chips" | "lanes" | "timeline" | "compare" | "cards" | "json" | "rows" | "inbox" | "console";

export function Ghost({ kind }: { kind: GhostKind }) {
  const bar = "rounded-sm bg-white/[0.05]";
  const box = "rounded-md border border-dashed border-white/10";
  switch (kind) {
    case "table":
      return (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            {[10, 24, 12, 8].map((w, i) => (
              <div key={i} className={`${bar} h-1.5`} style={{ width: `${w}%` }} />
            ))}
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`${bar} h-2 w-[10%]`} />
              <div className={`${bar} h-2`} style={{ width: `${34 - (i % 3) * 6}%` }} />
              <div className={`${bar} h-2 w-[14%]`} />
              <div className={`${bar} ml-auto h-2 w-[8%]`} />
            </div>
          ))}
        </div>
      );
    case "bars":
      return (
        <div className="space-y-2">
          {[92, 74, 55, 38].map((w) => (
            <div key={w} className="flex items-center gap-2">
              <div className={`${bar} h-1.5 w-10 shrink-0`} />
              <div className={`${bar} h-1.5`} style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      );
    case "tiles":
      return (
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`${box} p-2`}>
              <div className={`${bar} h-1.5 w-8`} />
              <div className={`${bar} mt-2 h-3 w-10`} />
            </div>
          ))}
        </div>
      );
    case "chips":
      return (
        <div className="space-y-2">
          {[4, 3].map((n, r) => (
            <div key={r} className="flex flex-wrap gap-1.5">
              {Array.from({ length: n }, (_, i) => (
                <div key={i} className={`${box} h-5`} style={{ width: 34 + ((i * 11 + r * 7) % 22) }} />
              ))}
            </div>
          ))}
        </div>
      );
    case "lanes":
      return (
        <div className="grid grid-cols-4 gap-1.5">
          {[3, 2, 2, 4].map((n, i) => (
            <div key={i} className="space-y-1.5">
              <div className={`${bar} h-1.5 w-8`} />
              {Array.from({ length: n }, (_, j) => (
                <div key={j} className={`${box} h-4`} />
              ))}
            </div>
          ))}
        </div>
      );
    case "timeline":
      return (
        <div className="space-y-2">
          {[0, 28, 56, 28, 28].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 shrink-0 rounded-full border border-dashed border-white/20" />
              <div className={`${bar} h-1.5 w-12 shrink-0`} />
              <div className={`${bar} h-1.5`} style={{ width: `${Math.max(w, 6)}%` }} />
            </div>
          ))}
        </div>
      );
    case "compare":
      return (
        <div className="grid grid-cols-2 gap-1.5">
          {[0, 1].map((i) => (
            <div key={i} className={`${box} space-y-1.5 p-2`}>
              <div className={`${bar} h-2 w-10`} />
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className={`${bar} h-1.5`} style={{ width: `${90 - j * 14}%` }} />
              ))}
            </div>
          ))}
        </div>
      );
    case "cards":
      return (
        <div className="grid grid-cols-3 gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${box} p-2`}>
              <div className={`${bar} h-2 w-10`} />
              <div className={`${bar} mt-2 h-1 w-full`} />
              <div className={`${bar} mt-1.5 h-1 w-2/3`} />
            </div>
          ))}
        </div>
      );
    case "json":
      return (
        <div className={`${box} space-y-1.5 p-2`}>
          {[30, 56, 44, 62, 40, 24].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`${bar} h-1.5 w-2 shrink-0`} />
              <div className={`${bar} h-1.5`} style={{ width: `${w}%`, marginLeft: i === 0 || i === 5 ? 0 : 8 }} />
            </div>
          ))}
        </div>
      );
    case "inbox":
      return (
        <div className="space-y-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${box} flex items-center gap-2 p-1.5`}>
              <div className={`${bar} h-2 w-6 shrink-0`} />
              <div className={`${bar} h-2 flex-1`} />
              <div className={`${bar} h-3 w-10 shrink-0 rounded-full`} />
            </div>
          ))}
        </div>
      );
    case "console":
      return (
        <div className="space-y-1.5">
          {[70, 45, 85, 30].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`${bar} h-1.5 w-2 shrink-0`} />
              <div className={`${bar} h-1.5`} style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      );
    default:
      return (
        <div className="space-y-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`${bar} h-1.5 w-5 shrink-0`} />
              <div className={`${bar} h-1.5 flex-1`} />
              <div className={`${bar} h-1.5 w-8 shrink-0`} />
            </div>
          ))}
        </div>
      );
  }
}

export function LockedPanel({ id, title, kind, lesson, clause, spot, className = "" }: { id: string; title: string; kind: GhostKind; lesson: number; clause: string; spot: boolean; className?: string }) {
  return (
    <section data-panel={id} data-locked="" className={`min-w-0 rounded-[10px] border border-dashed px-3 py-2.5 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"} ${className}`}>
      <header className="mb-2.5 flex min-w-0 items-center gap-2">
        <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
        <h3 className="hud-label min-w-0 flex-1 truncate">{title}</h3>
        <span className="hud-label shrink-0 text-white/30">L{lesson}</span>
      </header>
      <Ghost kind={kind} />
      <p className="mt-2.5 truncate font-mono text-[10px] text-white/40">
        {spot ? <span className="hud-accent">Your code powers this · </span> : "Locked · "}
        {clause}
      </p>
    </section>
  );
}

/** Unlocked, but there is no build yet (the learner has not pressed Run on this page). */
export function WaitingPanel({ id, title, kind, lesson, className = "" }: { id: string; title: string; kind: GhostKind; lesson: number; className?: string }) {
  return (
    <section data-panel={id} data-waiting="" className={`min-w-0 rounded-[10px] border border-white/10 bg-white/[0.02] px-3 py-2.5 ${className}`}>
      <header className="mb-2.5 flex min-w-0 items-center gap-2">
        <Play className="h-3 w-3 shrink-0 text-[#c5ee8a]/70" aria-hidden />
        <h3 className="hud-label min-w-0 flex-1 truncate">{title}</h3>
        <span className="hud-label shrink-0 text-white/30">L{lesson}</span>
      </header>
      <Ghost kind={kind} />
      <p className="mt-2.5 truncate font-mono text-[10px] text-white/40">Press Run to build and fill it in.</p>
    </section>
  );
}

// ───────────────────────── small parts ─────────────────────────

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="hud-log hud-muted py-1 text-[11px]">{children}</p>;
}

export function Tile({ label, value, tone = "plain", unit, className = "" }: { label: string; value: React.ReactNode; tone?: Tone; unit?: string; className?: string }) {
  const missing = value === dash;
  return (
    <div className={`min-w-0 rounded-md bg-white/[0.04] px-2.5 py-2 ${className}`}>
      <dt className="hud-label truncate">{label}</dt>
      <dd className={`hud-value mt-0.5 truncate text-[15px] leading-tight tabular-nums ${missing ? "text-white/30" : toneClass(tone)}`}>
        {value}
        {unit && !missing && <span className="hud-muted ml-1 text-[10px]">{unit}</span>}
      </dd>
    </div>
  );
}

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-6 shrink-0 rounded-full border px-2.5 text-[10px] font-medium transition-colors ${
        active ? "border-transparent bg-[#c5ee8a] text-[#0a0a0a]" : "border-white/12 bg-white/[0.04] text-white/70 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
  );
}

/** A small rounded status label. */
export function Pill({ tone = "plain", children, title, className = "" }: { tone?: Tone; children: React.ReactNode; title?: string; className?: string }) {
  const edge = tone === "accent" ? "border-[#c5ee8a]/40 bg-[#c5ee8a]/10" : tone === "warning" ? "border-[#fbbf24]/45 bg-[#fbbf24]/10" : tone === "danger" ? "border-[#f87171]/45 bg-[#f87171]/10" : "border-white/12 bg-white/[0.05]";
  return (
    <span title={title} className={`inline-flex h-[18px] max-w-full shrink-0 items-center gap-1 rounded-full border px-2 text-[10px] font-semibold leading-none ${edge} ${toneClass(tone)} ${className}`}>
      {children}
    </span>
  );
}

/** A shipment id, vessel id or other short identifier in monospace. */
export function IdChip({ children, tone = "plain", dim = false, title }: { children: React.ReactNode; tone?: Tone; dim?: boolean; title?: string }) {
  const edge = tone === "accent" ? "border-[#c5ee8a]/30 text-[#d3f3a4]" : tone === "warning" ? "border-[#fbbf24]/40 text-[#fbbf24]" : tone === "danger" ? "border-[#f87171]/40 text-[#f87171]" : "border-white/10 text-white/80";
  return (
    <span title={title} className={`inline-flex max-w-full items-center truncate rounded border bg-white/[0.045] px-1.5 py-[1px] font-mono text-[10.5px] leading-[1.35] ${edge} ${dim ? "opacity-45" : ""}`}>
      {children}
    </span>
  );
}

/** A small caption above a group of content. */
export function Cap({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-1 flex min-w-0 items-baseline gap-2">
      <span className="hud-label min-w-0 flex-1 truncate">{children}</span>
      {right !== undefined && <span className="hud-muted shrink-0 font-mono text-[10px]">{right}</span>}
    </div>
  );
}

/** Thin horizontal bar. `index` staggers the grow-in. */
export function Bar({ pct, tone = "accent", h = 6, index = 0 }: { pct: number; tone?: Tone; h?: number; index?: number }) {
  return (
    <div className="hud-bar" style={{ height: h }}>
      <span className="hp-grow" style={{ width: `${clamp(pct, 0, 100)}%`, background: toneFill(tone), ["--i" as string]: index }} />
    </div>
  );
}

/** A labelled bar with a value on the right: the basic row of every chart on the board. */
export function BarRow({ label, pct, text, tone = "accent", sub, index = 0 }: { label: React.ReactNode; pct: number; text: React.ReactNode; tone?: Tone; sub?: React.ReactNode; index?: number }) {
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="min-w-0 flex-1 truncate text-[11px] text-white/85">{label}</span>
        <span className="hud-value shrink-0 text-[10.5px] text-white/70">{text}</span>
      </div>
      <Bar pct={pct} tone={tone} index={index} />
      {sub && <div className="hud-muted mt-0.5 truncate font-mono text-[10px]">{sub}</div>}
    </div>
  );
}

/** A little status lamp: lime when good, red when bad, grey when unknown. */
export function Lamp({ on, bad = false, size = 8, blink = false }: { on: boolean | undefined; bad?: boolean; size?: number; blink?: boolean }) {
  const color = on === undefined ? "bg-white/25" : on ? (bad ? "bg-[#f87171]" : "bg-[#c5ee8a]") : "bg-white/20";
  const glow = on ? (bad ? "shadow-[0_0_8px_1px_rgba(248,113,113,0.55)]" : "shadow-[0_0_8px_1px_rgba(197,238,138,0.5)]") : "";
  return <span aria-hidden className={`inline-block shrink-0 rounded-full ${color} ${glow} ${blink && on ? "hp-blink" : ""}`} style={{ width: size, height: size }} />;
}

/** A stacked segmented bar with a legend. Segments are lime at stepped opacities (or the given tones). */
export function Segments({ items, unit = "" }: { items: { label: string; value: number; tone?: Tone }[]; unit?: string }) {
  const total = items.reduce((a, b) => a + b.value, 0);
  if (total <= 0) return <p className="hud-muted text-[10.5px]">Nothing counted yet.</p>;
  const shade = (i: number, n: number) => 1 - (i / Math.max(n, 1)) * 0.62;
  return (
    <div>
      <div className="flex h-2.5 gap-px overflow-hidden rounded-full bg-white/10">
        {items.map((it, i) =>
          it.value > 0 ? (
            <span key={it.label} className="hp-grow block h-full" style={{ width: `${(it.value / total) * 100}%`, background: it.tone ? toneFill(it.tone) : C.lime, opacity: it.tone ? 1 : shade(i, items.length), ["--i" as string]: i }} />
          ) : null,
        )}
      </div>
      <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
        {items.map((it, i) => (
          <li key={it.label} className="flex min-w-0 items-center gap-1.5 text-[10.5px] text-white/65">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-[2px]" style={{ background: it.tone ? toneFill(it.tone) : C.lime, opacity: it.tone ? 1 : shade(i, items.length) }} />
            <span className="truncate">{it.label}</span>
            <span className="hud-value text-[10.5px]">
              {it.value.toLocaleString("en-US")}
              {unit}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Lines of monospaced text (a raw record, a JSON snippet) in a dark inset. */
export function Mono({ children, className = "", title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <div title={title} className={`min-w-0 rounded-md bg-black/40 px-2 py-1 font-mono text-[10.5px] leading-[1.5] ${className}`}>
      {children}
    </div>
  );
}
