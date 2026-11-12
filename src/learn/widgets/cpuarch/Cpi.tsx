"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Slider } from "../ai/ui";
import { Caption, Note, Readout } from "../computer/ui";
import { avgCpi, runTimeMs, type CpiClass } from "./sim";

export interface CpiProps {
  /** Instruction classes with their typical cycles each. Default: simple, load that hits the cache, multiply, divide. */
  classes?: CpiClass[];
  /** Starting share (percent) of each class; must sum to 100. */
  shares?: number[];
  /** The job, in millions of instructions. Default 1000 (a billion). */
  millions?: number;
  /** Starting clock in GHz. */
  ghz?: number;
  /** Which sliders to show: the mix, the clock. Default both. */
  controls?: ("mix" | "clock")[];
}

export interface CpiState {
  cpi: number;
  ipc: number;
  ghz: number;
  ms: number;
  shares: number[];
}

const DEFAULT_CLASSES: CpiClass[] = [
  { id: "simple", label: "Simple (add, compare, move)", cycles: 1 },
  { id: "load", label: "Load that hits the cache", cycles: 4 },
  { id: "mul", label: "Multiply", cycles: 3 },
  { id: "div", label: "Divide", cycles: 20 },
];

/** Run time = instructions × cycles per instruction ÷ clock. Change the instruction mix and the clock and watch the time. */
export function Cpi({ props, onChange }: WidgetProps<CpiProps>) {
  const classes = props.classes ?? DEFAULT_CLASSES;
  const controls = props.controls ?? ["mix", "clock"];
  const millions = props.millions ?? 1000;
  const [shares, setShares] = useState<number[]>(props.shares ?? [70, 20, 8, 2]);
  const [ghz, setGhz] = useState(props.ghz ?? 3);

  const make = (sh: number[], g: number): CpiState => {
    const cpi = avgCpi(classes, sh);
    return { cpi, ipc: 1 / cpi, ghz: g, ms: runTimeMs(millions * 1e6, cpi, g), shares: sh };
  };
  const st = make(shares, ghz);

  // moving one slider rebalances the "simple" class (index 0) so the mix always adds up to 100
  const setShare = (i: number, v: number) => {
    const sh = shares.slice();
    const others = sh.reduce((a, x, j) => (j === 0 || j === i ? a : a + x), 0);
    const capped = Math.min(v, 100 - others);
    sh[i] = capped;
    sh[0] = 100 - others - capped;
    setShares(sh);
    onChange?.(make(sh, ghz));
  };
  const setClock = (g: number) => {
    setGhz(g);
    onChange?.(make(shares, g));
  };

  const msText = st.ms >= 1000 ? `${(st.ms / 1000).toFixed(2)} s` : `${st.ms.toFixed(0)} ms`;
  return (
    <div className="w-full">
      <div className="rounded-xl border border-line bg-surface-2 p-3 text-center font-mono text-sm text-ink-2">
        <Caption className="mb-1">Run time</Caption>
        <p>
          {millions >= 1000 ? `${millions / 1000} billion` : `${millions} million`} instructions × <b className="text-ink">{st.cpi.toFixed(2)}</b> cycles each ÷ <b className="text-ink">{ghz} GHz</b> = <b className="text-ink">{msText}</b>
        </p>
      </div>
      {controls.includes("mix") && (
        <div className="mt-3 grid gap-x-4 sm:grid-cols-2">
          {classes.map((c, i) => (
            <div key={c.id}>
              {i === 0 ? (
                <div className="py-2 text-xs text-ink-3">
                  <div className="flex justify-between gap-2">
                    <span>
                      {c.label} · {c.cycles} cycle{c.cycles > 1 ? "s" : ""}
                    </span>
                    <span className="font-mono text-[12.5px] font-semibold tabular-nums text-ink">{shares[0]}%</span>
                  </div>
                  <p className="mt-0.5">(the rest of the mix)</p>
                </div>
              ) : (
                <Slider label={`${c.label} · ${c.cycles} cycles`} value={shares[i]} min={0} max={100} onChange={(v) => setShare(i, v)} format={(v) => `${v}%`} />
              )}
            </div>
          ))}
        </div>
      )}
      {controls.includes("clock") && <Slider className="mt-1" label="Clock speed" value={ghz} min={1} max={5} step={0.5} onChange={setClock} format={(v) => `${v} GHz`} />}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Average CPI" value={st.cpi.toFixed(2)} accent />
        <Readout label="IPC" value={st.ipc.toFixed(2)} />
        <Readout label="Time" value={msText} accent />
      </div>
      <div className="mt-3">
        <Note>Cycle counts are typical textbook values for the latency of each kind of instruction. Real chips differ, and overlapping work (the next lessons) changes the picture.</Note>
      </div>
    </div>
  );
}

/** goal: { maxMs } and/or { maxCpi }, { minGhz }. */
export function checkCpi(state: unknown, goal: Record<string, unknown>) {
  const s = state as CpiState | undefined;
  if (!s) return false;
  if (typeof goal.maxMs === "number" && s.ms > goal.maxMs) return false;
  if (typeof goal.minMs === "number" && s.ms < goal.minMs) return false;
  if (typeof goal.maxCpi === "number" && s.cpi > goal.maxCpi) return false;
  if (typeof goal.minCpi === "number" && s.cpi < goal.minCpi) return false;
  if (typeof goal.ghz === "number" && s.ghz !== goal.ghz) return false;
  return true;
}
