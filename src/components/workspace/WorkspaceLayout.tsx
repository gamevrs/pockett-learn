"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Resizable lesson workspace.
 *  - phone (<1024px): one panel at a time (the tab bar picks which)
 *  - stacked (1024-1359px): lesson | stage over editor over console
 *  - columns (>=1360px): lesson | editor over console | stage
 * Panels are absolutely positioned from measured rectangles, so dragging a splitter (or crossing a
 * breakpoint) never remounts the editor or the 3D stage. Sizes persist per browser.
 */

export type LayoutMode = "phone" | "stacked" | "columns";
export type PanelId = "lesson" | "editor" | "results" | "stage";

const STORAGE_KEY = "pockett_ws_layout_v1";
const GAP = 12;
const RESULTS_COLLAPSED = 46;
// Minimums the solver guarantees; the console gives way first, then the stage.
const MIN_EDITOR = 200;
const MIN_STAGE = 200;
const MIN_RESULTS = 120;

interface Sizes {
  lesson: number; // px
  stageFrac: number; // columns: share of the width
  stageTopFrac: number; // stacked: share of the height
  results: number; // px
}
const DEFAULTS: Sizes = { lesson: 360, stageFrac: 0.36, stageTopFrac: 0.42, results: 230 };

function loadSizes(): Sizes {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Sizes>) };
  } catch {
    /* ignore */
  }
  return DEFAULTS;
}

function saveSizes(s: Sizes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

const queries = { columns: "(min-width: 1360px)", stacked: "(min-width: 1024px)" };
function subscribeMode(cb: () => void) {
  const mqs = Object.values(queries).map((q) => window.matchMedia(q));
  mqs.forEach((m) => m.addEventListener("change", cb));
  return () => mqs.forEach((m) => m.removeEventListener("change", cb));
}
function readMode(): LayoutMode {
  if (window.matchMedia(queries.columns).matches) return "columns";
  if (window.matchMedia(queries.stacked).matches) return "stacked";
  return "phone";
}
export function useLayoutMode(): LayoutMode {
  return useSyncExternalStore(subscribeMode, readMode, () => "columns");
}

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

interface Layout {
  panels: Record<PanelId, Rect>;
  splitters: { id: "lesson" | "stage" | "stageTop" | "results"; axis: "x" | "y"; rect: Rect }[];
}

function computeLayout(mode: LayoutMode, W: number, H: number, s: Sizes, collapsed: boolean): Layout {
  const full = { left: 0, top: 0, width: W, height: H };
  if (mode === "phone") return { panels: { lesson: full, editor: full, results: full, stage: full }, splitters: [] };

  const L = clamp(s.lesson, 260, W * 0.4);
  const wantResults = collapsed ? RESULTS_COLLAPSED : Math.max(MIN_RESULTS, s.results);

  if (mode === "columns") {
    const S = clamp(s.stageFrac * W, 300, W - L - 2 * GAP - 380);
    const cx = L + GAP;
    const cw = W - L - S - 2 * GAP;
    const R = collapsed ? RESULTS_COLLAPSED : clamp(wantResults, MIN_RESULTS, H - MIN_EDITOR - GAP);
    return {
      panels: {
        lesson: { left: 0, top: 0, width: L, height: H },
        editor: { left: cx, top: 0, width: cw, height: H - R - GAP },
        results: { left: cx, top: H - R, width: cw, height: R },
        stage: { left: cx + cw + GAP, top: 0, width: S, height: H },
      },
      splitters: [
        { id: "lesson", axis: "x", rect: { left: L, top: 0, width: GAP, height: H } },
        { id: "stage", axis: "x", rect: { left: cx + cw, top: 0, width: GAP, height: H } },
        { id: "results", axis: "y", rect: { left: cx, top: H - R - GAP, width: cw, height: GAP } },
      ],
    };
  }

  // stacked
  const rx = L + GAP;
  const rw = W - L - GAP;
  const R = collapsed ? RESULTS_COLLAPSED : clamp(wantResults, MIN_RESULTS, H - MIN_STAGE - MIN_EDITOR - 2 * GAP);
  const T = clamp(s.stageTopFrac * H, MIN_STAGE, H - R - MIN_EDITOR - 2 * GAP);
  return {
    panels: {
      lesson: { left: 0, top: 0, width: L, height: H },
      stage: { left: rx, top: 0, width: rw, height: T },
      editor: { left: rx, top: T + GAP, width: rw, height: H - T - R - 2 * GAP },
      results: { left: rx, top: H - R, width: rw, height: R },
    },
    splitters: [
      { id: "lesson", axis: "x", rect: { left: L, top: 0, width: GAP, height: H } },
      { id: "stageTop", axis: "y", rect: { left: rx, top: T, width: rw, height: GAP } },
      { id: "results", axis: "y", rect: { left: rx, top: H - R - GAP, width: rw, height: GAP } },
    ],
  };
}

interface WorkspaceLayoutProps {
  mode: LayoutMode;
  /** Phone only: which panel is visible. */
  active: PanelId;
  resultsCollapsed: boolean;
  onExpandResults: () => void;
  panels: Record<PanelId, React.ReactNode>;
}

export function WorkspaceLayout({ mode, active, resultsCollapsed, onExpandResults, panels }: WorkspaceLayoutProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [sizes, setSizes] = useState<Sizes>(loadSizes);
  const sizesRef = useRef(sizes);
  useEffect(() => {
    sizesRef.current = sizes;
  });

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox({ width: Math.round(width), height: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const layout = computeLayout(mode, box.width, box.height, sizes, resultsCollapsed);

  const adjust = (id: Layout["splitters"][number]["id"], delta: number) => {
    setSizes((s) => {
      const W = Math.max(1, box.width);
      const H = Math.max(1, box.height);
      if (id === "lesson") return { ...s, lesson: s.lesson + delta };
      if (id === "stage") return { ...s, stageFrac: clamp((s.stageFrac * W - delta) / W, 0.15, 0.7) };
      if (id === "stageTop") return { ...s, stageTopFrac: clamp((s.stageTopFrac * H + delta) / H, 0.15, 0.8) };
      return { ...s, results: s.results - delta };
    });
    if (id === "results" && resultsCollapsed && delta < 0) onExpandResults();
  };

  const settle = () => {
    // clamp to what was actually shown, so a later bigger window doesn't jump
    const shown = computeLayout(mode, box.width, box.height, sizesRef.current, false);
    const next: Sizes = {
      lesson: shown.panels.lesson.width,
      stageFrac: mode === "columns" ? shown.panels.stage.width / Math.max(1, box.width) : sizesRef.current.stageFrac,
      stageTopFrac: mode === "stacked" ? shown.panels.stage.height / Math.max(1, box.height) : sizesRef.current.stageTopFrac,
      results: shown.panels.results.height,
    };
    setSizes(next);
    saveSizes(next);
  };

  const resetSizes = () => {
    setSizes(DEFAULTS);
    saveSizes(DEFAULTS);
  };

  return (
    <div ref={boxRef} className="relative min-h-0 flex-1">
      {box.width > 0 &&
        (Object.keys(panels) as PanelId[]).map((id) => {
          const r = layout.panels[id];
          const hidden = mode === "phone" && id !== active;
          return (
            <div
              key={id}
              className="absolute flex min-h-0 min-w-0 flex-col"
              style={{ left: r.left, top: r.top, width: r.width, height: r.height, display: hidden ? "none" : undefined }}
            >
              {panels[id]}
            </div>
          );
        })}
      {layout.splitters.map((sp) => (
        <Splitter key={sp.id} axis={sp.axis} rect={sp.rect} onDrag={(d) => adjust(sp.id, d)} onEnd={settle} onReset={resetSizes} />
      ))}
    </div>
  );
}

function Splitter({
  axis,
  rect,
  onDrag,
  onEnd,
  onReset,
}: {
  axis: "x" | "y";
  rect: Rect;
  onDrag: (delta: number) => void;
  onEnd: () => void;
  onReset: () => void;
}) {
  const last = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <div
      role="separator"
      aria-orientation={axis === "x" ? "vertical" : "horizontal"}
      aria-label="Resize panels (double-click to reset)"
      tabIndex={0}
      className={`group absolute z-10 flex items-center justify-center outline-none ${axis === "x" ? "cursor-col-resize" : "cursor-row-resize"}`}
      style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height, touchAction: "none" }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        last.current = axis === "x" ? e.clientX : e.clientY;
        setDragging(true);
      }}
      onPointerMove={(e) => {
        if (last.current === null) return;
        const pos = axis === "x" ? e.clientX : e.clientY;
        const delta = pos - last.current;
        if (delta !== 0) {
          last.current = pos;
          onDrag(delta);
        }
      }}
      onPointerUp={() => {
        last.current = null;
        setDragging(false);
        onEnd();
      }}
      onPointerCancel={() => {
        last.current = null;
        setDragging(false);
        onEnd();
      }}
      onDoubleClick={onReset}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 64 : 24;
        const keys = axis === "x" ? { ArrowLeft: -step, ArrowRight: step } : { ArrowUp: -step, ArrowDown: step };
        const d = keys[e.key as keyof typeof keys];
        if (d) {
          e.preventDefault();
          onDrag(d);
          onEnd();
        }
      }}
    >
      <span
        className={`rounded-full transition-colors ${axis === "x" ? "h-10 w-1" : "h-1 w-10"} ${
          dragging ? "bg-brand" : "bg-line group-hover:bg-brand group-focus-visible:bg-brand"
        }`}
      />
    </div>
  );
}
