"use client";

import React from "react";
import { Lock } from "lucide-react";
import { C, fmtCell, type GhostKind, type ResultSet } from "./model";

/** Shared building blocks of the Counting House console (Pockett Stage styling). */

export const CSS = `
@keyframes ch-relay { 0% { transform: translateX(0); opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { transform: translateX(var(--ch-dx, 60px)); opacity: 0; } }
.ch-relay { animation: ch-relay 2.4s linear infinite; animation-delay: calc(var(--i, 0) * 0.35s); }
@keyframes ch-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(197,238,138,0.0); } 50% { box-shadow: 0 0 14px 1px rgba(197,238,138,0.28); } }
.ch-glow { animation: ch-glow 3.2s ease-in-out infinite; }
@keyframes ch-stamp { from { transform: scale(1.5) rotate(-9deg); opacity: 0; } to { transform: scale(1) rotate(-4deg); opacity: 1; } }
.ch-stamp { animation: ch-stamp 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.2) both; }
@keyframes ch-scan { from { transform: translateX(-100%); opacity: 0.85; } to { transform: translateX(100%); opacity: 0; } }
.ch-scan { animation: ch-scan 1.2s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .ch-relay, .ch-glow, .ch-stamp, .ch-scan { animation: none !important; }
}
`;

export function PanelFrame({
  id,
  title,
  icon,
  meta,
  focus,
  flash,
  wide,
  children,
}: {
  id: string;
  title: string;
  icon: React.ReactNode;
  meta?: React.ReactNode;
  focus?: boolean;
  flash?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section data-panel={id} className={`hud-panel min-w-0 px-3 py-2.5 ${wide ? "@2xl:col-span-2" : ""} ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""}`}>
      <header className="mb-2 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[#c5ee8a]">{icon}</span>
        <h3 className="hud-title min-w-0 flex-1 truncate">{title}</h3>
        {meta && <span className="hud-value hud-muted shrink-0 text-[10px]">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

const bar = "rounded-sm bg-white/[0.05]";

export function Ghost({ kind }: { kind: GhostKind }) {
  switch (kind) {
    case "beam":
      return (
        <svg viewBox="0 0 240 60" className="block h-14 w-full" aria-hidden>
          <path d="M120 14 V52 M104 52 H136" stroke="rgba(255,255,255,0.14)" strokeWidth="2" strokeLinecap="round" />
          <path d="M40 14 H200" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeDasharray="3 3" />
          {[40, 200].map((x) => (
            <g key={x}>
              <path d={`M${x} 14 L${x - 14} 34 M${x} 14 L${x + 14} 34`} stroke="rgba(255,255,255,0.12)" />
              <path d={`M${x - 18} 34 H${x + 18} c0 7 -8 10 -18 10 s-18 -3 -18 -10 Z`} fill="none" stroke="rgba(255,255,255,0.16)" strokeDasharray="3 3" />
            </g>
          ))}
        </svg>
      );
    case "tiles":
      return (
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-md border border-dashed border-white/10 p-2">
              <div className={`${bar} h-1.5 w-8`} />
              <div className={`${bar} mt-2 h-3 w-12`} />
            </div>
          ))}
        </div>
      );
    case "bars":
      return (
        <div className="space-y-1.5">
          {[92, 78, 54, 38].map((w) => (
            <div key={w} className="flex items-center gap-2">
              <div className={`${bar} h-1.5 w-6 shrink-0`} />
              <div className={`${bar} h-1.5`} style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      );
    case "stream":
      return (
        <div className="flex flex-wrap gap-1.5">
          {[14, 9, 9, 12, 9, 14, 9, 12].map((w, i) => (
            <div key={i} className="h-5 rounded-md border border-dashed border-white/10" style={{ width: `${w * 4}px` }} />
          ))}
        </div>
      );
    case "lanes":
      return (
        <div className="grid grid-cols-4 gap-2">
          {[3, 2, 4, 1].map((k, i) => (
            <div key={i} className="space-y-1.5 rounded-md border border-dashed border-white/10 p-1.5">
              <div className={`${bar} h-1.5 w-8`} />
              {Array.from({ length: k }).map((_, j) => (
                <div key={j} className="h-4 rounded-sm border border-dashed border-white/10" />
              ))}
            </div>
          ))}
        </div>
      );
    case "timeline":
      return (
        <div className="space-y-2 border-l border-dashed border-white/15 pl-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1">
              <div className={`${bar} h-1.5 w-1/2`} />
              <div className={`${bar} h-1.5 w-3/4`} />
            </div>
          ))}
        </div>
      );
    case "plan":
      return (
        <div className="grid grid-cols-2 gap-2">
          {["before", "after"].map((k) => (
            <div key={k} className="space-y-1.5 rounded-md border border-dashed border-white/10 p-2">
              <div className={`${bar} h-1.5 w-8`} />
              <div className={`${bar} h-1.5 w-full`} />
              <div className={`${bar} h-1.5 w-2/3`} />
            </div>
          ))}
        </div>
      );
    case "chart":
      return (
        <svg viewBox="0 0 240 60" preserveAspectRatio="none" className="block h-14 w-full" aria-hidden>
          {[14, 30, 46].map((y) => (
            <path key={y} d={`M0 ${y} H240`} stroke="rgba(255,255,255,0.05)" />
          ))}
          <path d="M4 50 L40 44 L80 46 L120 30 L160 34 L200 18 L236 12" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        </svg>
      );
    case "stamp":
      return (
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-20 -rotate-6 place-items-center rounded-md border-2 border-dashed border-white/15 text-[9px] font-bold tracking-widest text-white/20">BALANCED</div>
          <div className="flex-1 space-y-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`${bar} h-1.5`} style={{ width: `${90 - i * 18}%` }} />
            ))}
          </div>
        </div>
      );
    case "tenants":
      return (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-5 w-16 rounded-full border border-dashed border-white/10" />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-md border border-dashed border-white/10 p-2">
                <div className={`${bar} h-1.5 w-8`} />
                <div className={`${bar} mt-2 h-3 w-10`} />
              </div>
            ))}
          </div>
        </div>
      );
    case "console":
      return (
        <div className="space-y-1.5">
          <div className={`${bar} h-6 w-full`} />
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${bar} h-1.5`} style={{ width: `${88 - i * 20}%` }} />
          ))}
        </div>
      );
    case "schema":
    case "table":
    case "list":
    default:
      return (
        <div className="space-y-1.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`${bar} h-1.5 w-5 shrink-0`} />
              <div className={`${bar} h-1.5 flex-1`} />
              <div className={`${bar} h-1.5 w-10 shrink-0`} />
            </div>
          ))}
        </div>
      );
  }
}

export function LockedPanel({
  id,
  title,
  kind,
  lesson,
  clause,
  spot,
  wide,
}: {
  id: string;
  title: string;
  kind: GhostKind;
  lesson?: number;
  clause: string;
  spot: boolean;
  wide?: boolean;
}) {
  return (
    <section
      data-panel={id}
      data-locked=""
      className={`min-w-0 rounded-[10px] border border-dashed px-3 py-2.5 ${wide ? "@2xl:col-span-2" : ""} ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}
    >
      <header className="mb-2.5 flex min-w-0 items-center gap-2">
        <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
        <h3 className="hud-label min-w-0 flex-1 truncate">{title}</h3>
        {lesson !== undefined && <span className="hud-label shrink-0 text-white/30">L{lesson}</span>}
      </header>
      <Ghost kind={kind} />
      <p className="mt-2.5 truncate font-mono text-[10px] text-white/40">
        {spot ? <span className="hud-accent">Your query powers this · </span> : "Locked · "}
        {clause}
      </p>
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="hud-log hud-muted py-1 text-[11px]">{children}</p>;
}

export function More({ shown, total }: { shown: number; total: number }) {
  if (total <= shown) return null;
  return <p className="hud-label mt-1.5 text-white/35">+{total - shown} more</p>;
}

export type Tone = "plain" | "accent" | "warning" | "danger" | "steel";

export const toneColor = (t: Tone) => (t === "accent" ? C.limeText : t === "warning" ? C.amber : t === "danger" ? C.red : t === "steel" ? C.steel : "#f4f4f4");

/** A labelled number in a bordered tile. */
export function Tile({ label, value, tone = "plain", sub, className = "" }: { label: string; value: React.ReactNode; tone?: Tone; sub?: React.ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-1.5 ${className}`}>
      <div className="hud-label truncate !text-[9.5px]">{label}</div>
      <div className="hud-value truncate text-[15px] leading-tight" style={{ color: toneColor(tone) }}>
        {value}
      </div>
      {sub && <div className="hud-muted mt-0.5 truncate text-[10px]">{sub}</div>}
    </div>
  );
}

/** A small outlined status chip. */
export function Pill({ tone = "plain", children, title, solid }: { tone?: Tone; children: React.ReactNode; title?: string; solid?: boolean }) {
  const color = toneColor(tone);
  return (
    <span
      title={title}
      className="inline-flex h-[18px] shrink-0 items-center gap-1 rounded-full border px-1.5 font-mono text-[9.5px] font-semibold uppercase leading-none tracking-wide"
      style={solid ? { background: color, borderColor: color, color: "#0a0a0a" } : { borderColor: `${color}55`, background: `${color}14`, color }}
    >
      {children}
    </span>
  );
}

/** A horizontal proportion bar. `value` and `max` are in the same unit. */
export function Meter({ value, max, tone = "accent", className = "" }: { value: number; max: number; tone?: Tone; className?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-white/[0.08] ${className}`}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tone === "plain" ? "#c8c8c8" : toneColor(tone) }} />
    </div>
  );
}

function numericCols(rs: ResultSet): Set<number> {
  const out = new Set<number>();
  rs.columns.forEach((_, i) => {
    const vals = rs.rows.map((r) => r[i]).filter((v) => v !== null && v !== undefined);
    if (vals.length > 0 && vals.every((v) => typeof v === "number")) out.add(i);
  });
  return out;
}

/** Any result set as a scrollable grid. Numbers right-aligned and tabular. */
export function DataGrid({ rs, maxRows = 12, interactive }: { rs: ResultSet; maxRows?: number; interactive: boolean }) {
  const numeric = numericCols(rs);
  const shown = rs.rows.slice(0, maxRows);
  return (
    <>
      <div className={`-mx-1 ${interactive ? "overflow-x-auto" : "overflow-hidden"}`}>
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr>
              {rs.columns.map((c, i) => (
                <th key={`${i}:${c}`} scope="col" className={`whitespace-nowrap px-1 pb-1 font-mono text-[10px] font-medium text-white/45 ${numeric.has(i) ? "text-right" : "text-left"}`}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="hud-value">
            {shown.map((row, ri) => (
              <tr key={ri} className="border-t border-white/[0.06]">
                {rs.columns.map((c, ci) => {
                  const v = row[ci];
                  const isNull = v === null || v === undefined;
                  return (
                    <td key={ci} className={`max-w-[11rem] truncate whitespace-nowrap px-1 py-[3px] tabular-nums ${numeric.has(ci) ? "text-right" : "text-left"} ${isNull ? "italic text-white/35" : ""}`}>
                      {fmtCell(v, c)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rs.rows.length === 0 && <Empty>0 rows. Your WHERE or JOIN may be filtering everything out.</Empty>}
      <More shown={shown.length} total={rs.rows.length} />
    </>
  );
}

/** Ref callback that reports an element's width as it changes. */
export function useWidth(): [number, (el: HTMLElement | null) => void | (() => void)] {
  const [w, setW] = React.useState(0);
  const ref = React.useCallback((el: HTMLElement | null) => {
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = Math.round(entries[0]?.contentRect.width ?? 0);
      setW((prev) => (prev === width ? prev : width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [w, ref];
}
