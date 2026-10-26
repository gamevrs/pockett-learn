"use client";

import React, { useState } from "react";
import { FastForward, RotateCcw, StepForward } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Segmented, Slider, fmt } from "../dsa/ui";

/**
 * Looking up one ticket by its order number, two ways. A full scan reads the table's pages one
 * after another until it meets the key. A B-tree index reads one page per level: the root says
 * which child covers the key, that child says which leaf, and the leaf holds the row.
 * 64 rows, 4 rows per page, 4 children per node: three levels.
 */

const KEYS = Array.from({ length: 64 }, (_, i) => 120 + i * 9);
const PER_PAGE = 4;
const LEAVES = Array.from({ length: 16 }, (_, j) => KEYS.slice(j * PER_PAGE, j * PER_PAGE + PER_PAGE));
const MIDS = Array.from({ length: 4 }, (_, m) => LEAVES.slice(m * 4, m * 4 + 4));

/** Keys offered as chips: some present, one that is not in the table. */
const CHIPS = [147, 336, 480, 651, 340];

export interface BtreeProps {
  /** Start in this mode. */
  mode?: "scan" | "index";
  /** Hide the Scan/Index switch. */
  fixedMode?: boolean;
  /** Show the "how deep does it get" scale panel under the tree. */
  scale?: boolean;
  /** Key to start with (default 480). */
  key0?: number;
}

export interface BtreeState {
  mode: "scan" | "index";
  key: number;
  pages: number;
  done: boolean;
  found: boolean;
}

/** The pages read, in order, for a lookup. Each entry is [level, index]. Level 3 = leaf pages. */
function path(mode: "scan" | "index", key: number): [number, number][] {
  if (mode === "scan") {
    const out: [number, number][] = [];
    for (let j = 0; j < LEAVES.length; j++) {
      out.push([3, j]);
      if (LEAVES[j].includes(key)) break;
    }
    return out;
  }
  const m = Math.min(3, Math.max(0, MIDS.findIndex((leaves) => key <= leaves[leaves.length - 1][PER_PAGE - 1])));
  const mid = MIDS[m];
  const l = Math.min(3, Math.max(0, mid.findIndex((leaf) => key <= leaf[PER_PAGE - 1])));
  return [
    [1, 0],
    [2, m],
    [3, m * 4 + l],
  ];
}

const depthFor = (rows: number, fanout: number) => Math.max(1, Math.ceil(Math.log(Math.max(2, rows)) / Math.log(fanout)));

export function Btree({ props, onChange, revealed }: WidgetProps<BtreeProps>) {
  const [mode, setMode] = useState<"scan" | "index">(props.mode ?? "index");
  const [key, setKey] = useState(props.key0 ?? 480);
  const [read, setRead] = useState(0);
  const [exp, setExp] = useState(6);
  const [fan, setFan] = useState(200);

  const steps = path(mode, key);
  const found = KEYS.includes(key);
  const done = read >= steps.length;
  const report = (m: "scan" | "index", k: number, r: number) => {
    const s = path(m, k);
    onChange?.({ mode: m, key: k, pages: r, done: r >= s.length, found: KEYS.includes(k) } satisfies BtreeState);
  };
  const reset = (m = mode, k = key) => {
    setRead(0);
    report(m, k, 0);
  };
  const pickMode = (m: "scan" | "index") => {
    if (revealed) return;
    setMode(m);
    reset(m, key);
  };
  const pickKey = (k: number) => {
    if (revealed) return;
    setKey(k);
    reset(mode, k);
  };
  const step = () => {
    if (revealed || done) return;
    setRead(read + 1);
    report(mode, key, read + 1);
  };
  const run = () => {
    if (revealed || done) return;
    setRead(steps.length);
    report(mode, key, steps.length);
  };

  const seen = new Set(steps.slice(0, read).map(([lv, i]) => `${lv}-${i}`));
  const last = read > 0 ? steps[read - 1] : null;
  const isSeen = (lv: number, i: number) => seen.has(`${lv}-${i}`);
  const isLast = (lv: number, i: number) => last !== null && last[0] === lv && last[1] === i;

  const rows = 10 ** exp;
  const scanPages = Math.ceil(rows / 100);
  const depth = depthFor(rows, fan);

  const node = (lv: number, i: number, label: React.ReactNode, wide?: boolean) => (
    <div
      key={`${lv}-${i}`}
      className={`rounded-lg border px-2 py-1 text-center font-mono text-[11px] leading-tight tabular-nums transition-colors ${wide ? "w-full" : ""} ${
        isLast(lv, i) ? "border-transparent bg-primary font-semibold text-primary-ink" : isSeen(lv, i) ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface text-ink-2"
      }`}
    >
      {label}
    </div>
  );

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {props.fixedMode ? <Caption className="!mb-0">{mode === "scan" ? "Full table scan" : "B-tree index lookup"}</Caption> : (
          <Segmented label="How to look it up" value={mode} onChange={pickMode} disabled={revealed} options={[{ id: "scan", label: "Scan the table" }, { id: "index", label: "Use the index" }]} />
        )}
        <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" onClick={() => reset()} disabled={revealed || read === 0} aria-label="Start over" title="Start over">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <Caption className="mt-4">Find order number…</Caption>
      <div className="flex flex-wrap gap-1.5">
        {CHIPS.map((k) => (
          <button
            key={k}
            type="button"
            disabled={revealed}
            onClick={() => pickKey(k)}
            className={`min-h-10 rounded-full border px-3.5 font-mono text-sm transition-colors disabled:cursor-default ${key === k ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink hover:border-[var(--brand)] hover:bg-tint"}`}
          >
            {k}
            {!KEYS.includes(k) && <span className="ml-1 font-sans text-[10px] opacity-70">(no such order)</span>}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-line bg-surface-2 p-2.5">
        <div className={`mx-auto w-40 ${mode === "scan" ? "opacity-40" : ""}`}>{node(1, 0, <>root · 4 children</>, true)}</div>
        <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-4">
          {MIDS.map((leaves, m) => (
            <div key={m} className="min-w-0">
              <div className={mode === "scan" ? "opacity-40" : ""}>{node(2, m, <>{leaves[0][0]}–{leaves[3][3]}</>, true)}</div>
              <div className="mt-1 grid gap-1">
                {leaves.map((leaf, l) => {
                  const j = m * 4 + l;
                  const hit = isLast(3, j) && done && found && leaf.includes(key);
                  return (
                    <div
                      key={j}
                      className={`flex justify-between gap-0.5 rounded-md border px-1.5 py-1 font-mono text-[10.5px] leading-none tabular-nums transition-colors ${
                        isLast(3, j) ? "border-[var(--brand)] bg-tint text-ink" : isSeen(3, j) ? "border-[var(--brand)]/50 bg-surface text-ink-2" : "border-line bg-surface text-ink-3"
                      }`}
                    >
                      {leaf.map((v) => (
                        <span key={v} className={hit && v === key ? "rounded bg-primary px-0.5 font-semibold text-primary-ink" : ""}>
                          {v}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary !h-10" onClick={step} disabled={revealed || done}>
          <StepForward className="h-4 w-4" /> Read next page
        </button>
        <button type="button" className="btn !h-10" onClick={run} disabled={revealed || done}>
          <FastForward className="h-4 w-4" /> Run to the end
        </button>
        <Readout label="Pages read" value={read} accent={done} />
      </div>
      <Note tone={done ? (found ? "good" : "plain") : "plain"}>
        {read === 0
          ? mode === "index"
            ? "Pages are read from the top: root, then a middle node, then one leaf."
            : "The table is read page by page from the start, 4 rows per page."
          : done
            ? found
              ? `Found ${key} after reading ${read} ${read === 1 ? "page" : "pages"}.`
              : `${key} is not in the table. ${mode === "scan" ? "Only after reading every page can the scan be sure." : "The leaf where it would be did not contain it: three pages were enough to know."}`
            : `Read ${read} so far…`}
      </Note>

      {props.scale && (
        <div className="mt-5 border-t border-line pt-4">
          <Caption>Now scale it up</Caption>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <Slider value={exp} min={2} max={10} onChange={setExp} label="Rows in the table, as a power of ten" />
              <p className="text-center font-mono text-sm tabular-nums text-ink">{fmt(rows)} rows</p>
            </div>
            <Segmented label="Keys per index page" value={String(fan)} onChange={(v) => setFan(Number(v))} options={[{ id: "50", label: "50" }, { id: "200", label: "200" }, { id: "500", label: "500" }]} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Readout label="Full scan (100 rows/page)" value={`${fmt(scanPages)} pages`} />
            <Readout label="Index lookup" value={`${depth} ${depth === 1 ? "page" : "pages"}`} accent />
          </div>
        </div>
      )}
    </div>
  );
}

export function checkBtree(state: unknown, goal: Record<string, unknown>) {
  const s = state as BtreeState | undefined;
  if (!s) return false;
  if (goal.done === true && !s.done) return false;
  if (typeof goal.mode === "string" && s.mode !== goal.mode) return false;
  if (typeof goal.pagesMax === "number" && s.pages > goal.pagesMax) return false;
  if (typeof goal.pagesMin === "number" && s.pages < goal.pagesMin) return false;
  if (typeof goal.key === "number" && s.key !== goal.key) return false;
  if (goal.found === false && s.found) return false;
  return true;
}
