"use client";

import React from "react";
import { Lock } from "lucide-react";
import { fmt, isNum, type GhostKind, type ResultSet } from "./model";

/** Shared building blocks of the Season Analytics dashboard (Pockett Stage styling). */

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
    <section
      data-panel={id}
      className={`hud-panel min-w-0 px-3 py-2.5 ${wide ? "@2xl:col-span-2" : ""} ${focus ? "border-[#c5ee8a]/35" : ""} ${flash ? "pop-in" : ""}`}
    >
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

export function Ghost({ kind }: { kind: GhostKind | "console" | "schema" }) {
  if (kind === "tiles") {
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
  }
  if (kind === "bars") {
    return (
      <div className="space-y-1.5">
        {[92, 78, 66, 51, 38].map((w) => (
          <div key={w} className="flex items-center gap-2">
            <div className={`${bar} h-1.5 w-6 shrink-0`} />
            <div className={`${bar} h-1.5`} style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    );
  }
  if (kind === "lines") {
    return (
      <svg viewBox="0 0 240 70" preserveAspectRatio="none" className="block h-16 w-full" aria-hidden>
        {[10, 30, 50].map((y) => (
          <path key={y} d={`M0 ${y} H240`} stroke="rgba(255,255,255,0.05)" />
        ))}
        {[
          "M4 62 C40 56 70 50 100 40 S170 18 236 8",
          "M4 64 C50 60 80 52 120 46 S180 30 236 22",
          "M4 66 C40 64 90 58 130 54 S190 42 236 36",
        ].map((d, i) => (
          <path key={i} d={d} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={i === 0 ? 2 : 1.2} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
    );
  }
  if (kind === "heat") {
    return (
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(10, minmax(0, 1fr))" }}>
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="h-3 rounded-[3px] border border-dashed border-white/10" style={{ opacity: 0.4 + ((i * 7) % 5) * 0.12 }} />
        ))}
      </div>
    );
  }
  if (kind === "chips") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {[10, 14, 9, 12, 8, 11].map((w, i) => (
          <div key={i} className="h-5 rounded-full border border-dashed border-white/10" style={{ width: `${w * 4}px` }} />
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
  kind: GhostKind | "console" | "schema";
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

/** A small button-looking chip for filters and toggles. */
export function Chip({ active, onClick, children, title }: { active?: boolean; onClick?: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-5 shrink-0 items-center rounded-full border px-2 font-mono text-[10px] font-semibold tracking-wide transition-colors ${
        active ? "border-transparent bg-[#c5ee8a] text-[#0a0a0a]" : "border-white/12 bg-white/[0.04] text-white/75 hover:bg-white/10"
      }`}
    >
      {children}
    </button>
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
                <th
                  key={`${i}:${c}`}
                  scope="col"
                  className={`whitespace-nowrap px-1 pb-1 font-mono text-[10px] font-medium text-white/45 ${numeric.has(i) ? "text-right" : "text-left"}`}
                >
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
                    <td
                      key={ci}
                      className={`max-w-[11rem] truncate whitespace-nowrap px-1 py-[3px] tabular-nums ${numeric.has(ci) ? "text-right" : "text-left"} ${isNull ? "italic text-white/35" : ""}`}
                    >
                      {fmt(v, c)}
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

/**
 * Ref callback that reports an element's width as it changes (a ResizeObserver, cleaned up by
 * React 19's ref cleanup). Use for SVG charts that draw at real pixel size so text stays readable.
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

// ───────────────────────── shared driver highlight ─────────────────────────

interface PickValue {
  /** The driver code the learner clicked, highlighted across every panel. */
  pick: string | null;
  setPick: (code: string | null) => void;
  interactive: boolean;
}

export const PickContext = React.createContext<PickValue>({ pick: null, setPick: () => {}, interactive: false });

export const usePick = () => React.useContext(PickContext);

/** A driver code. In an interactive scene it is a button that highlights the driver everywhere. */
export function Code({ code, className = "" }: { code: string; className?: string }) {
  const { pick, setPick, interactive } = usePick();
  const on = pick !== null && pick === code;
  const cls = `hud-value text-[11.5px] font-semibold ${on ? "hud-accent" : ""} ${className}`;
  if (!interactive || !code) return <span className={cls}>{code}</span>;
  return (
    <button type="button" aria-pressed={on} title={on ? "Clear highlight" : `Highlight ${code}`} onClick={() => setPick(on ? null : code)} className={`${cls} rounded-sm text-left hover:underline hover:decoration-white/30 hover:underline-offset-2`}>
      {code}
    </button>
  );
}
