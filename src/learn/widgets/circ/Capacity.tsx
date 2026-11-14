"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { energyWh, runtimeHours } from "./logic";
import { Meter, Note, Readout, Seg, Slider, ToyNote } from "./ui";

/** Typical capacities, labelled as typical (they depend on make, age, temperature and how hard the load pulls). */
const CELLS = [
  { id: "coin", label: "Coin cell", mah: 220, v: 3 },
  { id: "aa", label: "AA", mah: 2500, v: 1.5 },
  { id: "li", label: "18650 Li-ion", mah: 3000, v: 3.7 },
  { id: "phone", label: "Phone pack", mah: 4500, v: 3.85 },
] as const;

export interface CapacityProps {
  cell?: (typeof CELLS)[number]["id"];
  drawMa?: number;
}

export interface CapacityState {
  cell: string;
  mah: number;
  volts: number;
  drawMa: number;
  hours: number;
  wh: number;
}

/** goal: { minHours, maxHours }, { minWh, maxWh }. */
export function checkCapacity(state: unknown, goal: Record<string, unknown>) {
  const s = state as CapacityState | undefined;
  if (!s) return false;
  const g = goal as { minHours?: number; maxHours?: number; minWh?: number; maxWh?: number; cell?: string };
  if (g.minHours !== undefined && s.hours < g.minHours) return false;
  if (g.maxHours !== undefined && s.hours > g.maxHours) return false;
  if (g.minWh !== undefined && s.wh < g.minWh) return false;
  if (g.maxWh !== undefined && s.wh > g.maxWh) return false;
  if (g.cell !== undefined && s.cell !== g.cell) return false;
  return true;
}

function duration(h: number): string {
  if (h >= 48) return `${+(h / 24).toFixed(1)} days`;
  if (h >= 1) return `${+h.toFixed(1)} hours`;
  return `${Math.round(h * 60)} minutes`;
}

/** How long does a battery last? mAh divided by the draw, and why watt-hours compare different voltages fairly. */
export function Capacity({ props, onChange }: WidgetProps<CapacityProps>) {
  const [cellId, setCellId] = useState<string>(props.cell ?? "aa");
  const [draw, setDraw] = useState(props.drawMa ?? 100);
  const cell = CELLS.find((c) => c.id === cellId) ?? CELLS[1];

  const make = (c: (typeof CELLS)[number], d: number): CapacityState => ({ cell: c.id, mah: c.mah, volts: c.v, drawMa: d, hours: runtimeHours(c.mah, d), wh: energyWh(c.mah, c.v) });
  const st = make(cell, draw);
  const emit = (c: (typeof CELLS)[number], d: number) => onChange?.(make(c, d));
  const frac = Math.min(1, Math.log10(st.hours * 60 + 1) / Math.log10(24 * 30 * 60));

  return (
    <div className="w-full">
      <div className="flex justify-center">
        <Seg
          label="Battery type"
          value={cellId}
          options={CELLS.map((c) => ({ value: c.id, label: c.label }))}
          onChange={(id) => {
            setCellId(id);
            emit(CELLS.find((c) => c.id === id) ?? CELLS[1], draw);
          }}
        />
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Capacity" value={`${cell.mah.toLocaleString("en-US")} mAh`} />
        <Readout label="Voltage" value={`${cell.v} V`} />
        <Readout label="Energy" value={`${st.wh.toFixed(2)} Wh`} />
      </div>
      <div className="mt-2">
        <Slider label="What the device draws" value={draw} min={1} max={1000} step={1} onChange={(d) => { setDraw(d); emit(cell, d); }} format={(x) => `${x} mA`} />
      </div>
      <div className="mt-2 text-center">
        <p className="text-sm text-ink-3">Runs for about</p>
        <p className="font-mono text-2xl font-semibold text-ink" aria-live="polite">
          {duration(st.hours)}
        </p>
        <p className="mt-1 font-mono text-xs text-ink-3">
          {cell.mah.toLocaleString("en-US")} mAh ÷ {draw} mA = {+st.hours.toFixed(1)} h
        </p>
      </div>
      <div className="mt-2 px-1">
        <Meter frac={frac} label={`Runs for about ${duration(st.hours)}`} />
      </div>
      <div className="mt-3">
        <Note>Capacities are typical figures. Real cells give less when they are cold, old or asked for a lot of current at once, so treat this as a best case.</Note>
      </div>
      <ToyNote>A toy model: a steady draw and a perfectly full battery that is emptied to zero.</ToyNote>
    </div>
  );
}
