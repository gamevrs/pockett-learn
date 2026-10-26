"use client";

import React from "react";
import { Lock } from "lucide-react";
import { fmt, isNum, type ResultSet } from "./model";

/** Shared building blocks of the Schema Studio board (Pockett Stage styling). */

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

export type GhostKind = "table" | "bars" | "plan" | "console" | "timeline" | "feed" | "grid" | "chips" | "map" | "er";

const bar = "rounded-sm bg-white/[0.05]";

export function Ghost({ kind }: { kind: GhostKind }) {
  if (kind === "er") {
    return (
      <svg viewBox="0 0 360 120" preserveAspectRatio="xMidYMid meet" className="block h-28 w-full" aria-hidden>
        {[
          [10, 10],
          [10, 70],
          [130, 38],
          [250, 10],
          [250, 70],
        ].map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="96" height="38" rx="5" fill="none" stroke="rgba(197,238,138,0.35)" strokeDasharray="4 4" />
        ))}
        {["M106 29 C118 29 118 57 130 57", "M106 89 C118 89 118 57 130 57", "M226 57 C238 57 238 29 250 29", "M226 57 C238 57 238 89 250 89"].map((d, i) => (
          <path key={i} d={d} fill="none" stroke="rgba(197,238,138,0.3)" strokeDasharray="3 4" />
        ))}
      </svg>
    );
  }
  if (kind === "bars") {
    return (
      <div className="space-y-1.5">
        {[92, 70, 54, 38].map((w) => (
          <div key={w} className="flex items-center gap-2">
            <div className={`${bar} h-1.5 w-6 shrink-0`} />
            <div className={`${bar} h-1.5`} style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    );
  }
  if (kind === "plan" || kind === "console") {
    return (
      <div className="space-y-1.5 font-mono">
        {[78, 52, 66].map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`${bar} h-1.5 ${kind === "plan" ? "w-8" : "w-3"} shrink-0`} />
            <div className={`${bar} h-1.5`} style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    );
  }
  if (kind === "timeline") {
    return (
      <div className="flex items-center gap-0 px-1 py-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <React.Fragment key={i}>
            <div className="h-3 w-3 shrink-0 rounded-full border border-dashed border-white/20" />
            {i < 4 && <div className="h-px flex-1 border-t border-dashed border-white/15" />}
          </React.Fragment>
        ))}
      </div>
    );
  }
  if (kind === "chips") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {[10, 14, 9, 12, 8].map((w, i) => (
          <div key={i} className="h-5 rounded-full border border-dashed border-white/10" style={{ width: `${w * 5}px` }} />
        ))}
      </div>
    );
  }
  if (kind === "map") {
    return (
      <div className="space-y-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`${bar} h-3 flex-1`} />
            <div className="h-px w-5 border-t border-dashed border-white/20" />
            <div className="h-3 w-16 shrink-0 rounded-sm border border-dashed border-white/12" />
          </div>
        ))}
      </div>
    );
  }
  if (kind === "grid") {
    return (
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="h-2.5 rounded-[3px] border border-dashed border-white/10" />
        ))}
      </div>
    );
  }
  if (kind === "feed") {
    return (
      <div className="space-y-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/10" />
            <div className={`${bar} h-1.5 flex-1`} />
          </div>
        ))}
      </div>
    );
  }
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
        {spot ? <span className="hud-accent">Your SQL powers this · </span> : "Locked · "}
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

/** A small pill. */
export function Pill({ children, tone = "plain", title, className = "" }: { children: React.ReactNode; tone?: "plain" | "accent" | "warning" | "danger" | "ghost"; title?: string; className?: string }) {
  const cls =
    tone === "accent"
      ? "border-[#c5ee8a]/35 bg-[#c5ee8a]/10 text-[#d3f3a4]"
      : tone === "warning"
        ? "border-[#fbbf24]/35 bg-[#fbbf24]/10 text-[#fbbf24]"
        : tone === "danger"
          ? "border-[#f87171]/40 bg-[#f87171]/10 text-[#fca5a5]"
          : tone === "ghost"
            ? "border-dashed border-white/20 text-white/50"
            : "border-white/12 bg-white/[0.05] text-white/70";
  return (
    <span title={title} className={`inline-flex h-[17px] max-w-full shrink-0 items-center truncate rounded-full border px-1.5 font-mono text-[10px] font-semibold leading-none tracking-wide ${cls} ${className}`}>
      {children}
    </span>
  );
}

function numericCols(rs: ResultSet): Set<number> {
  const out = new Set<number>();
  rs.columns.forEach((_, i) => {
    const vals = rs.rows.map((r) => r[i]).filter((v) => v !== null && v !== undefined);
    if (vals.length > 0 && vals.every(isNum)) out.add(i);
  });
  return out;
}

/** Any result set as a compact grid. */
export function DataGrid({ rs, maxRows = 6, maxCell = 26 }: { rs: ResultSet; maxRows?: number; maxCell?: number }) {
  const numeric = numericCols(rs);
  const shown = rs.rows.slice(0, maxRows);
  return (
    <>
      <div className="-mx-1 overflow-x-auto">
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
                  const text = fmt(v);
                  return (
                    <td key={ci} title={text.length > maxCell ? text : undefined} className={`whitespace-nowrap px-1 py-[3px] tabular-nums ${numeric.has(ci) ? "text-right" : "text-left"} ${isNull ? "italic text-white/35" : ""}`}>
                      {text.length > maxCell ? text.slice(0, maxCell - 1) + "…" : text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <More shown={shown.length} total={rs.rows.length} />
    </>
  );
}

/**
 * Ref callback that reports an element's width as it changes (a ResizeObserver, cleaned up by
 * React 19's ref cleanup).
 */
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
