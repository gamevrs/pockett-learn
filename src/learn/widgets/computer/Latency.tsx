"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Seg } from "./ui";

export type LevelId = "reg" | "l1" | "l2" | "l3" | "ram" | "ssd" | "hdd" | "net";

interface Level {
  id: LevelId;
  name: string;
  /** Typical time to fetch something, in nanoseconds. */
  ns: number;
  size: string;
  human: string;
  where: string;
  keeps: boolean;
}

/** Typical, rounded figures for a modern desktop; real chips vary by a factor of 2 or so. */
const LEVELS: Level[] = [
  { id: "reg", name: "Registers", ns: 0.3, size: "a few hundred bytes", human: "a third of a second", where: "Inside the CPU core itself. The CPU computes directly on these.", keeps: false },
  { id: "l1", name: "L1 cache", ns: 1, size: "32–64 KB per core", human: "1 second", where: "On the chip, right next to each core.", keeps: false },
  { id: "l2", name: "L2 cache", ns: 4, size: "1–2 MB per core", human: "4 seconds", where: "On the chip, a little further from the core.", keeps: false },
  { id: "l3", name: "L3 cache", ns: 15, size: "8–64 MB, shared", human: "15 seconds", where: "On the chip, shared by all the cores.", keeps: false },
  { id: "ram", name: "Memory (RAM)", ns: 100, size: "8–64 GB", human: "almost 2 minutes", where: "Separate chips on the motherboard, reached over the memory bus.", keeps: false },
  { id: "ssd", name: "SSD", ns: 100_000, size: "0.5–4 TB", human: "about a day", where: "Flash storage. Keeps data without power.", keeps: true },
  { id: "hdd", name: "Hard disk", ns: 10_000_000, size: "2–20 TB", human: "about 4 months", where: "Spinning platters and a moving arm: it has to physically wait for the right spot.", keeps: true },
  { id: "net", name: "Server overseas", ns: 150_000_000, size: "the whole internet", human: "almost 5 years", where: "A round trip across the world, limited by the speed of light in fibre.", keeps: true },
];

export interface LatencyProps {
  /** Show only these rungs, in order. Default all. */
  levels?: LevelId[];
  /** Start in "real" time or "human" time (1 ns becomes 1 s). Default "real". */
  scale?: "real" | "human";
}

export interface LatencyState {
  selected: LevelId | null;
  scale: "real" | "human";
}

const realTime = (ns: number) => (ns < 1000 ? `${ns} ns` : ns < 1_000_000 ? `${ns / 1000} µs` : `${ns / 1_000_000} ms`);

/** The memory hierarchy as a ladder of access times, on a log scale, in real or human time. */
export function Latency({ props, onChange, revealed }: WidgetProps<LatencyProps>) {
  const levels = props.levels ? LEVELS.filter((l) => props.levels!.includes(l.id)) : LEVELS;
  const [scale, setScale] = useState<"real" | "human">(props.scale ?? "real");
  const [selected, setSelected] = useState<LevelId | null>(null);
  const locked = Boolean(revealed);
  const lo = Math.log10(0.3);
  const hi = Math.log10(150_000_000);
  const width = (ns: number) => 6 + (94 * (Math.log10(ns) - lo)) / (hi - lo);

  const pick = (id: LevelId) => {
    if (locked) return;
    const next = selected === id ? null : id;
    setSelected(next);
    onChange?.({ selected: next, scale } satisfies LatencyState);
  };
  const pickScale = (s: "real" | "human") => {
    setScale(s);
    onChange?.({ selected, scale: s } satisfies LatencyState);
  };
  const sel = LEVELS.find((l) => l.id === selected);

  return (
    <div className="w-full">
      <div className="mb-3 flex justify-center">
        <Seg
          label="Time scale"
          value={scale}
          onChange={pickScale}
          options={[
            { value: "real", label: "Real time" },
            { value: "human", label: "If 1 ns were 1 second" },
          ]}
        />
      </div>
      <div className="grid gap-1.5">
        {levels.map((l) => {
          const on = selected === l.id;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => pick(l.id)}
              disabled={locked}
              aria-pressed={on}
              className={`grid min-h-11 grid-cols-[6.4rem_1fr] items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-colors disabled:cursor-default sm:grid-cols-[8.5rem_1fr] ${
                on ? "border-[var(--brand)] bg-tint" : "border-line bg-surface hover:border-[var(--line-strong)]"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-[0.8rem] font-semibold text-ink sm:text-sm">{l.name}</span>
                <span className="block truncate text-[10.5px] text-ink-3">{l.size}</span>
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <span className="h-3 rounded-full bg-primary transition-all" style={{ width: `${width(l.ns) * 0.62}%`, opacity: l.keeps ? 0.55 : 1 }} />
                <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-ink sm:text-xs">{scale === "real" ? realTime(l.ns) : l.human}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[11px] text-ink-3">Bars are on a log scale: each step right is 10× slower. Faded bars keep data without power.</p>
      {sel && (
        <p className="mt-2 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-[0.88rem] text-ink-2" aria-live="polite">
          <b className="text-ink">{sel.name}:</b> {sel.where} Typical access: <b className="font-mono text-ink">{realTime(sel.ns)}</b>
          {sel.ns > 1 && (
            <>
              , about <b className="font-mono text-ink">{(sel.ns / 1).toLocaleString("en-US")}×</b> an L1 read
            </>
          )}
          .
        </p>
      )}
    </div>
  );
}

/** goal: { selected } (tap that rung) or { scale }. */
export function checkLatency(state: unknown, goal: Record<string, unknown>) {
  const s = state as LatencyState | undefined;
  if (!s) return false;
  if (goal.selected !== undefined && s.selected !== goal.selected) return false;
  if (goal.scale !== undefined && s.scale !== goal.scale) return false;
  return goal.selected !== undefined || goal.scale !== undefined;
}
