"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Note, Readout, Seg, Slider, ToyNote } from "./ui";
import { regulate } from "./psusim";

export interface RegulatorProps {
  kind?: "linear" | "switching";
  vin?: number;
  vout?: number;
  /** Load current, amps. */
  i?: number;
  linearPart?: "standard" | "ldo";
}

export interface RegulatorState {
  kind: "linear" | "switching";
  part: "standard" | "ldo";
  vin: number;
  vout: number;
  i: number;
  pin: number;
  pout: number;
  heatW: number;
  eff: number;
  inRegulation: boolean;
}

/** Typical dropout voltages: a 7805-class linear part about 2 V, a low-dropout (LDO) part about 0.3 V. */
const DROPOUT = { standard: 2, ldo: 0.3 };
/** Typical thermal resistance of a TO-220 package in free air, °C per watt. */
const THETA = 50;

/** Linear vs switching regulator: power in, power out and the heat difference. */
export function Regulator({ props, onChange }: WidgetProps<RegulatorProps>) {
  const [kind, setKind] = useState<"linear" | "switching">(props.kind ?? "linear");
  const [part, setPart] = useState<"standard" | "ldo">(props.linearPart ?? "standard");
  const [vin, setVin] = useState(props.vin ?? 12);
  const [vout, setVout] = useState(props.vout ?? 5);
  const [i, setI] = useState(props.i ?? 0.5);
  const [swEff, setSwEff] = useState(90);

  const make = (k: "linear" | "switching", p: "standard" | "ldo", vi: number, vo: number, ii: number, se: number): RegulatorState => {
    const r = regulate({ kind: k, vin: vi, vout: vo, i: ii, dropout: DROPOUT[p], switchingEff: se / 100 });
    return { kind: k, part: p, vin: vi, vout: vo, i: ii, pin: r.pin, pout: r.pout, heatW: r.heatW, eff: r.eff, inRegulation: r.inRegulation };
  };
  const report = (k: "linear" | "switching", p: "standard" | "ldo", vi: number, vo: number, ii: number, se: number) => onChange?.(make(k, p, vi, vo, ii, se));
  const r = regulate({ kind, vin, vout, i, dropout: DROPOUT[part], switchingEff: swEff / 100 });

  const hot = kind === "linear" && r.inRegulation && r.heatW > 1;
  const rise = r.heatW * THETA;

  return (
    <div data-widget="analog-regulator" className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        <Seg label="Regulator type" options={[{ value: "linear", label: "Linear" }, { value: "switching", label: "Switching (buck)" }]} value={kind} onChange={(k) => { setKind(k); report(k, part, vin, vout, i, swEff); }} />
        {kind === "linear" && (
          <Seg label="Linear part" options={[{ value: "standard", label: "7805-class (~2 V dropout)" }, { value: "ldo", label: "LDO (~0.3 V dropout)" }]} value={part} onChange={(p) => { setPart(p); report(kind, p, vin, vout, i, swEff); }} />
        )}
      </div>
      <div className="mt-2 grid gap-x-4 sm:grid-cols-2">
        <Slider label="Input voltage Vin" value={vin} min={5} max={24} step={0.5} onChange={(v) => { setVin(v); report(kind, part, v, vout, i, swEff); }} format={(v) => `${v.toFixed(1)} V`} />
        <Slider label="Output voltage Vout" value={vout} min={1.8} max={12} step={0.1} onChange={(v) => { setVout(v); report(kind, part, vin, v, i, swEff); }} format={(v) => `${v.toFixed(1)} V`} />
        <Slider label="Load current" value={i} min={0.05} max={2} step={0.05} onChange={(v) => { setI(v); report(kind, part, vin, vout, v, swEff); }} format={(v) => `${v.toFixed(2)} A`} />
        {kind === "switching" && (
          <Slider label="Switching efficiency (typical: 80 to 95%)" value={swEff} min={70} max={95} step={1} onChange={(v) => { setSwEff(v); report(kind, part, vin, vout, i, v); }} format={(v) => `${v}%`} />
        )}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
        <p className="mb-1.5 text-xs text-ink-3">Where the input power goes</p>
        <div className="flex h-5 w-full overflow-hidden rounded-full bg-[var(--line-strong)]" role="img" aria-label={`Of ${r.pin.toFixed(2)} watts going in, ${r.pout.toFixed(2)} watts reach the load and ${r.heatW.toFixed(2)} watts become heat.`}>
          <div style={{ width: `${r.pin > 0 ? (r.pout / r.pin) * 100 : 0}%`, background: "var(--brand)" }} />
          <div style={{ width: `${r.pin > 0 ? (r.heatW / r.pin) * 100 : 0}%`, background: "#d9731b" }} />
        </div>
        <p className="mt-1.5 flex flex-wrap gap-x-4 text-xs text-ink-2">
          <span><span aria-hidden className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: "var(--brand)" }} />to the load</span>
          <span><span aria-hidden className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: "#d9731b" }} />heat in the regulator</span>
        </p>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="power in" value={`${r.pin.toFixed(2)} W`} />
        <Readout label="power out" value={`${r.pout.toFixed(2)} W`} />
        <Readout label="heat" value={`${r.heatW.toFixed(2)} W`} accent />
        <Readout label="efficiency" value={`${(r.eff * 100).toFixed(0)}%`} accent />
      </div>

      <div className="mt-3 space-y-2">
        {kind === "linear" && !r.inRegulation && (
          <Note>Vin is below Vout plus the dropout ({vout.toFixed(1)} + {DROPOUT[part]} = {(vout + DROPOUT[part]).toFixed(1)} V), so the regulator cannot hold the output: it sags to about {r.voutActual.toFixed(1)} V. Raise Vin, lower Vout or choose the LDO.</Note>
        )}
        {kind === "switching" && !r.inRegulation && <Note>A buck converter only steps down, so Vin must be above Vout (with a little headroom). Raise Vin or lower Vout. (A boost converter steps up, but that is a different circuit.)</Note>}
        {hot && (
          <Note tone="accent">
            {r.heatW.toFixed(2)} W of heat: this needs a heatsink. A TO-220 package with none is typically good for roughly 1 W; at about {THETA} °C per watt (typical, free air) the toy sum gives {Math.round(rise)} °C above the room, which a real part would never reach: it would overheat, shut down or fail. Never touch a hot regulator.
          </Note>
        )}
        {kind === "linear" && r.inRegulation && !hot && (
          <Note>
            A linear regulator passes the same current in and out, and burns the voltage difference as heat: P = (Vin {"−"} Vout) × I = ({vin.toFixed(1)} {"−"} {vout.toFixed(1)}) × {i.toFixed(2)} A = {r.heatW.toFixed(2)} W. Efficiency is about Vout / Vin = {(r.eff * 100).toFixed(0)}%.
          </Note>
        )}
        {kind === "switching" && r.inRegulation && (
          <Note>
            A buck converter stores energy in an inductor and switches it thousands of times a second, so the heat depends on its efficiency, not on the voltage gap. Real ones are typically 80 to 95% efficient, but they add switching noise that sensitive analog circuits may need filtered.
          </Note>
        )}
        <ToyNote>Toy model: a constant load current, the dropout and thermal figures as typical values (check the datasheet), and the small standby current of the regulator ignored. The switching efficiency is a typical value you choose, not a calculation.</ToyNote>
      </div>
    </div>
  );
}

/** goal: { kind, part, heatMax, heatMin, effMin, effMax, vin, vout, i, inRegulation }. */
export function checkRegulator(state: unknown, goal: Record<string, unknown>) {
  const s = state as RegulatorState | undefined;
  if (!s) return false;
  if (goal.kind !== undefined && s.kind !== goal.kind) return false;
  if (goal.part !== undefined && s.part !== goal.part) return false;
  if (typeof goal.heatMax === "number" && !(s.heatW <= goal.heatMax)) return false;
  if (typeof goal.heatMin === "number" && !(s.heatW >= goal.heatMin)) return false;
  if (typeof goal.effMin === "number" && !(s.eff >= goal.effMin)) return false;
  if (typeof goal.effMax === "number" && !(s.eff <= goal.effMax)) return false;
  if (typeof goal.vin === "number" && Math.abs(s.vin - goal.vin) > 1e-6) return false;
  if (typeof goal.vout === "number" && Math.abs(s.vout - goal.vout) > 1e-6) return false;
  if (typeof goal.i === "number" && Math.abs(s.i - goal.i) > 1e-6) return false;
  if (typeof goal.inRegulation === "boolean" && s.inRegulation !== goal.inRegulation) return false;
  return true;
}
