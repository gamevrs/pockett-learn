"use client";

import React, { useLayoutEffect, useRef, useState } from "react";
import { Caption } from "../computer/ui";

export interface GridCell {
  /** Long text (wide layout) and short text (compact layout). */
  long: string;
  short: string;
  cls: string;
}

export interface GridRow {
  label: string;
  sub?: string;
  cells: GridCell[];
  /** Extra controls shown beside the label (e.g. reorder buttons). */
  extra?: React.ReactNode;
}

/**
 * Instructions down the side, cycles across the top. Each row is its label on a line of its own with the cells
 * under it, so the whole grid is visible on a phone: cells are full size when they fit, compact single letters when
 * that fits, and only when even that does not fit does the grid scroll sideways (with a visible cue and a fade edge).
 */
export function CycleGrid({ rows, cols, label }: { rows: GridRow[]; cols: number; label: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [avail, setAvail] = useState(0);
  const [atEnd, setAtEnd] = useState(false);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setAvail(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const full = 40;
  const compact = 15;
  const fitsFull = avail > 0 && cols * (full + 2) <= avail;
  const fitsCompact = avail > 0 && cols * (compact + 1) <= avail;
  const isCompact = !fitsFull;
  const GAP = isCompact ? 1 : 2;
  const scrolls = avail > 0 && !fitsCompact && !fitsFull;
  const cell = isCompact ? compact : full;
  const template = fitsFull || fitsCompact ? `repeat(${cols}, minmax(0, 1fr))` : `repeat(${cols}, ${cell}px)`;
  const minW = scrolls ? cols * (cell + GAP) : undefined;

  return (
    <div className="relative">
      <div
        ref={box}
        className="overflow-x-auto rounded-xl border border-line bg-surface-2 p-2"
        tabIndex={scrolls ? 0 : undefined}
        aria-label={label}
        onScroll={(e) => {
          const t = e.currentTarget;
          setAtEnd(t.scrollLeft + t.clientWidth >= t.scrollWidth - 4);
        }}
      >
        <div style={{ minWidth: minW }} className="font-mono text-[11px]">
          <div className="grid items-end" style={{ gridTemplateColumns: template, gap: GAP }}>
            {Array.from({ length: cols }, (_, c) => (
              <span key={c} className="text-center text-[10px] text-ink-3">
                {c + 1}
              </span>
            ))}
          </div>
          <Caption className="mt-0.5 !text-[9.5px]">Cycle</Caption>
          {rows.map((r, i) => (
            <div key={`${r.label}-${i}`} className="mt-1.5">
              <div className="flex items-center gap-1.5">
                <span className="min-w-0 truncate text-[12px] text-ink" title={r.label}>
                  {r.label}
                </span>
                {r.sub && <span className="shrink-0 text-[10px] text-ink-3">{r.sub}</span>}
                {r.extra && <span className="ml-auto shrink-0">{r.extra}</span>}
              </div>
              <div className="mt-0.5 grid" style={{ gridTemplateColumns: template, gap: GAP }}>
                {r.cells.map((c, k) => (
                  <span key={k} className={`grid ${isCompact ? "h-6" : "h-9"} place-items-center rounded-md border text-center ${c.cls}`}>
                    {isCompact ? c.short : c.long}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {scrolls && (
        <>
          <div aria-hidden className={`pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-xl bg-gradient-to-l from-[var(--surface-2)] to-transparent transition-opacity ${atEnd ? "opacity-0" : "opacity-100"}`} />
          <p className="mt-1 text-center text-xs font-medium text-ink-2">Scroll sideways to see every cycle →</p>
        </>
      )}
    </div>
  );
}
