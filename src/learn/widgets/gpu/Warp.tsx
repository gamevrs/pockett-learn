"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { WARP, warp, type Branch } from "./sim";
import { Caption, Meter, Note, Readout, Seg, Slider, Stepper, BLUE, ORANGE } from "./ui";

export interface WarpProps {
  /** Which condition the `if` tests (default "below"). */
  branch?: Branch;
  /** Hide the controls: show the starting condition only. */
  fixed?: boolean;
}

export interface WarpState {
  branch: Branch;
  k: number;
  nIf: number;
  nElse: number;
  cycles: number;
  /** Percent of lane-cycles doing useful work, rounded. */
  utilisation: number;
  /** The lanes disagreed, so the warp ran both sides. */
  diverged: boolean;
}

const BRANCHES: { value: Branch; label: string; code: (k: number) => string }[] = [
  { value: "below", label: "lane < k", code: (k) => `if (lane < ${k})` },
  { value: "even", label: "even lanes", code: () => "if (lane % 2 == 0)" },
  { value: "every8", label: "every 8th", code: () => "if (lane % 8 == 0)" },
  { value: "uniform", label: "all agree", code: () => "if (n > 0)  // same for everyone" },
];

/** One warp of 32 lanes meets an if/else: lanes that disagree make the warp run both paths, one after the other. */
export function Warp({ props, onChange }: WidgetProps<WarpProps>) {
  const [branch, setBranch] = useState<Branch>(props.branch ?? "below");
  const [k, setK] = useState(16);
  const [ifC, setIfC] = useState(4);
  const [elseC, setElseC] = useState(4);

  const w = warp(branch, k, ifC, elseC);
  const report = (b: Branch, kk: number, a: number, e: number) => {
    const x = warp(b, kk, a, e);
    onChange?.({ branch: b, k: kk, nIf: x.nIf, nElse: x.nElse, cycles: x.cycles, utilisation: Math.round(x.utilisation * 100), diverged: x.nIf > 0 && x.nElse > 0 } satisfies WarpState);
  };
  const upd = (b: Branch, kk: number, a: number, e: number) => {
    setBranch(b);
    setK(kk);
    setIfC(a);
    setElseC(e);
    report(b, kk, a, e);
  };

  const diverged = w.nIf > 0 && w.nElse > 0;
  const pct = Math.round(w.utilisation * 100);
  const spec = BRANCHES.find((b) => b.value === branch)!;

  const row = (title: string, active: (lane: number) => boolean, colour: string, cycles: number, skipped: boolean) => (
    <div className={`rounded-xl border border-line bg-surface p-2 ${skipped ? "opacity-60" : ""}`}>
      <p className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-ink-3">
        <span className="font-semibold text-ink">{title}</span>
        <span>{skipped ? "skipped: no lane needs it" : `${cycles} cycles · coloured lanes work, grey lanes wait`}</span>
      </p>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }} aria-hidden>
        {Array.from({ length: WARP }, (_, l) => (
          <span key={l} className="aspect-square rounded-[4px]" style={{ background: active(l) && !skipped ? colour : "var(--line-strong)", opacity: active(l) && !skipped ? 1 : 0.5 }} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full" data-widget>
      {!props.fixed && (
        <div className="mb-3 space-y-3">
          <div>
            <Caption className="mb-1">The condition each lane tests</Caption>
            <Seg label="Condition" value={branch} onChange={(v) => upd(v, k, ifC, elseC)} options={BRANCHES.map((b) => ({ value: b.value, label: b.label }))} className="max-w-full" />
          </div>
          {branch === "below" && <Slider label="k (lanes below k take the if side)" value={k} min={0} max={32} onChange={(v) => upd(branch, v, ifC, elseC)} />}
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <div>
              <Caption className="mb-1">if side costs (cycles)</Caption>
              <Stepper label="If cycles" value={ifC} min={1} max={9} onChange={(v) => upd(branch, k, v, elseC)} />
            </div>
            <div>
              <Caption className="mb-1">else side costs (cycles)</Caption>
              <Stepper label="Else cycles" value={elseC} min={1} max={9} onChange={(v) => upd(branch, k, ifC, v)} />
            </div>
          </div>
        </div>
      )}

      <p className="mb-2 rounded-lg bg-surface-2 px-3 py-2 font-mono text-[13px] text-ink">
        {spec.code(k)} {"{ A } else { B }"}
      </p>
      <div className="space-y-2">
        {row(`Pass 1: side A (${w.nIf} lanes)`, (l) => w.lanes[l], BLUE, ifC, w.nIf === 0)}
        {row(`Pass 2: side B (${w.nElse} lanes)`, (l) => !w.lanes[l], ORANGE, elseC, w.nElse === 0)}
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-baseline justify-between text-xs text-ink-3">
          <span>Lane utilisation</span>
          <span className="font-mono text-[12.5px] font-semibold tabular-nums text-ink">{pct}%</span>
        </div>
        <Meter frac={w.utilisation} tone={pct >= 90 ? "brand" : "warn"} label={`Lane utilisation ${pct} percent`} />
      </div>
      <div className="mt-3">
        <Note tone={diverged ? "accent" : "plain"}>
          {diverged ? (
            <>
              <b>Divergence.</b> The lanes disagree, so the warp runs side A with {w.nIf} lanes, then side B with {w.nElse}: {w.cycles} cycles in all, even though each lane only needed its own side.
            </>
          ) : (
            <>
              <b>No divergence.</b> All 32 lanes agree, so only one side runs: {w.cycles} cycles and every lane is busy.
            </>
          )}
        </Note>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Cycles" value={w.cycles} />
        <Readout label="Utilisation" value={`${pct}%`} accent />
      </div>
    </div>
  );
}

/** goal: { diverged?: boolean, minUtilisation?: number, maxUtilisation?: number, maxCycles?: number, branch?: Branch } on the current condition. */
export function checkWarp(state: unknown, goal: Record<string, unknown>) {
  const s = state as WarpState | undefined;
  if (!s) return false;
  if (typeof goal.diverged === "boolean" && s.diverged !== goal.diverged) return false;
  if (typeof goal.minUtilisation === "number" && s.utilisation < goal.minUtilisation) return false;
  if (typeof goal.maxUtilisation === "number" && s.utilisation > goal.maxUtilisation) return false;
  if (typeof goal.maxCycles === "number" && s.cycles > goal.maxCycles) return false;
  if (typeof goal.branch === "string" && s.branch !== goal.branch) return false;
  return true;
}
