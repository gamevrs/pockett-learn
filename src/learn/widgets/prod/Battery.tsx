"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { avgCurrentMa, batteryDays, cycleCharge, monthsOf, type BatteryModel } from "./logic";
import { Caption, Meter, Note, Readout, Seg, Slider, Toy } from "./ui";

export interface BatteryProps {
  /** Starting cell: "coin" (CR2032-style) or "aa" (two AA in series). */
  cell?: "coin" | "aa";
  sleepUa?: number;
  intervalMin?: number;
  radioMs?: number;
}

export interface BatteryState {
  cell: "coin" | "aa";
  sleepUa: number;
  intervalMin: number;
  radioMs: number;
  avgUa: number;
  months: number;
  /** which cost is biggest: "sleep" | "measure" | "radio" */
  biggest: string;
  sleepShare: number;
}

const CELLS = {
  coin: { label: "Coin cell", mah: 225, note: "CR2032-size, typically about 225 mAh" },
  aa: { label: "2 × AA", mah: 2500, note: "two AA alkaline in series, typically about 2,500 mAh (series does not add capacity)" },
};
const INTERVALS = [1, 5, 15, 30, 60];

const model = (cell: "coin" | "aa", sleepUa: number, intervalMin: number, radioMs: number): BatteryModel => ({
  capacityMah: CELLS[cell].mah,
  usable: 0.8,
  sleepUa,
  intervalS: intervalMin * 60,
  measureMs: 100,
  measureMa: 2,
  radioMs,
  radioMa: 10,
});

/** Average current and battery life for Sprout: sleep current, report interval and radio time. */
export function Battery({ props, onChange }: WidgetProps<BatteryProps>) {
  const [cell, setCell] = useState<"coin" | "aa">(props.cell ?? "coin");
  const [sleepUa, setSleepUa] = useState(props.sleepUa ?? 8);
  const [ii, setIi] = useState(Math.max(0, INTERVALS.indexOf(props.intervalMin ?? 15)));
  const [radioMs, setRadioMs] = useState(props.radioMs ?? 300);

  const intervalMin = INTERVALS[ii];
  const m = model(cell, sleepUa, intervalMin, radioMs);
  const c = cycleCharge(m);
  const avgUa = avgCurrentMa(m) * 1000;
  const days = batteryDays(m);
  const months = monthsOf(days);
  const parts = [
    { id: "sleep", label: "Asleep", v: c.sleep },
    { id: "measure", label: "Measuring", v: c.measure },
    { id: "radio", label: "Radio", v: c.radio },
  ];
  const biggest = parts.reduce((a, b) => (b.v > a.v ? b : a)).id;

  const emit = (cl: "coin" | "aa", s: number, i: number, r: number) => {
    const mm = model(cl, s, INTERVALS[i], r);
    const cc = cycleCharge(mm);
    const big = [
      ["sleep", cc.sleep],
      ["measure", cc.measure],
      ["radio", cc.radio],
    ].reduce((a, b) => ((b[1] as number) > (a[1] as number) ? b : a));
    onChange?.({
      cell: cl,
      sleepUa: s,
      intervalMin: INTERVALS[i],
      radioMs: r,
      avgUa: avgCurrentMa(mm) * 1000,
      months: monthsOf(batteryDays(mm)),
      biggest: big[0] as string,
      sleepShare: cc.sleep / cc.total,
    } satisfies BatteryState);
  };

  const fmtMonths = months >= 120 ? "10+ years" : months >= 24 ? `${(months / 12).toFixed(1)} years` : `${months.toFixed(1)} months`;

  return (
    <div className="w-full" data-widget>
      <div className="space-y-3">
        <div>
          <Caption>Power source</Caption>
          <Seg
            label="Power source"
            value={cell}
            onChange={(v) => {
              setCell(v);
              emit(v, sleepUa, ii, radioMs);
            }}
            options={(Object.keys(CELLS) as ("coin" | "aa")[]).map((k) => ({ value: k, label: `${CELLS[k].label} (${CELLS[k].mah} mAh)` }))}
            className="mt-1"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Slider label="Sleep current (everything that stays on)" value={sleepUa} min={1} max={200} onChange={(v) => { setSleepUa(v); emit(cell, v, ii, radioMs); }} format={(v) => `${v} µA`} />
          <Slider label="Report every" value={ii} min={0} max={INTERVALS.length - 1} onChange={(v) => { setIi(v); emit(cell, sleepUa, v, radioMs); }} format={() => `${intervalMin} min`} />
        </div>
        <Slider label="Radio on-time per report (connect and send)" value={radioMs} min={20} max={3000} step={20} onChange={(v) => { setRadioMs(v); emit(cell, sleepUa, ii, v); }} format={(v) => `${v} ms`} />
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Readout label="Average current" value={`${avgUa.toFixed(1)} µA`} />
        <Readout label="Battery life" value={fmtMonths} accent />
        <Readout label="Target 12 months" value={months >= 12 ? "met" : "missed"} />
      </div>

      <div className="mt-4 space-y-2" aria-label="Where the charge goes in one report cycle">
        <Caption>Charge spent per report cycle (mA·s)</Caption>
        {parts.map((p) => (
          <div key={p.id}>
            <div className="flex justify-between text-xs text-ink-3">
              <span>{p.label}</span>
              <span className="font-mono tabular-nums text-ink">{p.v.toFixed(2)} ({Math.round((p.v / c.total) * 100)}%)</span>
            </div>
            <Meter frac={p.v / c.total} tone={p.id === biggest ? "brand" : "muted"} label={`${p.label} share`} />
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Note>
          {biggest === "sleep"
            ? "Most of the charge goes to simply being asleep. Every microamp of sleep current counts, because it runs all the time."
            : biggest === "radio"
              ? "Most of the charge goes to the radio. Report less often or keep each burst shorter."
              : "The measurement is the biggest cost here."}
        </Note>
      </div>
      <Toy>
        A toy model: {CELLS[cell].note}; 80% of it counted as usable; a 100 ms measurement at 2 mA and a radio burst at 10 mA average (typical-order numbers). It ignores self-discharge, temperature and a coin cell&apos;s weak pulse capability.
      </Toy>
    </div>
  );
}

/** goal: { minMonths?, maxMonths?, cell?, biggest? }. */
export function checkBattery(state: unknown, goal: Record<string, unknown>) {
  const s = state as BatteryState | undefined;
  if (!s) return false;
  if (typeof goal.minMonths === "number" && s.months < goal.minMonths) return false;
  if (typeof goal.maxMonths === "number" && s.months > goal.maxMonths) return false;
  if (typeof goal.cell === "string" && s.cell !== goal.cell) return false;
  if (typeof goal.biggest === "string" && s.biggest !== goal.biggest) return false;
  if (typeof goal.minIntervalMin === "number" && s.intervalMin < goal.minIntervalMin) return false;
  return true;
}
