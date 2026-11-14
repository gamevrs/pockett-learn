"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { MINUS, Note, Plot, Readout, SECOND, Seg, ToyNote } from "./ui";
import { CHARGE_CAPACITIES, CHARGE_RATES, CHARGE_TEMPS, CHARGE_T_MAX, CHARGE_T_MIN, CHARGE_V, runCharge } from "./chargesim";

export interface ChargeLabProps {
  /** Starting cell capacity, mAh: 1000, 2000 or 3000. Default 2000. */
  capacityMah?: number;
  /** Starting charge rate as a multiple of C: 0.2, 0.5, 1 or 2. Default 0.5. */
  cRate?: number;
  /** Starting temperature, °C: -10, 5, 25 or 50. Default 25. */
  tempC?: number;
}

export interface ChargeLabState {
  capacityMah: number;
  cRate: number;
  tempC: number;
  /** the charger accepts this temperature */
  allowed: boolean;
  /** hours until the current fell to C/10 (null if refused or unfinished) */
  totalH: number | null;
  /** hours of constant-current charging (null if refused) */
  ccH: number | null;
  /** state of charge at termination, 0 to 1 */
  finalSoc: number;
}

const pick = <T extends number>(list: T[], want: number | undefined, fallback: T): T => (want !== undefined && list.includes(want as T) ? (want as T) : fallback);
const tempLabel = (t: number) => `${t < 0 ? MINUS : ""}${Math.abs(t)} °C`;
const rateLabel = (r: number) => `${r}C`;
/** Smallest "round" number (1, 1.5, 2, 2.5, 3, 4, 5, 6, 8 times a power of ten) that is at least x. */
function niceMax(x: number): number {
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  return p * ([1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((m) => m * p >= x * (1 - 1e-9)) ?? 10);
}
const hours = (h: number | null) => (h === null ? "none" : `${h.toFixed(2)} h`);

/** Li-ion charge profile toy: constant current until 4.20 V, then constant voltage while the current tapers to C/10. */
export function ChargeLab({ props, onChange }: WidgetProps<ChargeLabProps>) {
  const [cap, setCap] = useState(() => pick(CHARGE_CAPACITIES, props.capacityMah, 2000));
  const [rate, setRate] = useState(() => pick(CHARGE_RATES, props.cRate, 0.5));
  const [temp, setTemp] = useState(() => pick(CHARGE_TEMPS, props.tempC, 25));
  const run = useMemo(() => runCharge(cap, rate, temp), [cap, rate, temp]);

  const stateOf = (c: number, r: number, t: number): ChargeLabState => {
    const x = runCharge(c, r, t);
    return { capacityMah: c, cRate: r, tempC: t, allowed: x.allowed, totalH: x.totalH, ccH: x.ccH, finalSoc: x.finalSoc };
  };
  const setAll = (c: number, r: number, t: number) => {
    setCap(c);
    setRate(r);
    setTemp(t);
    onChange?.(stateOf(c, r, t));
  };
  // report the starting state once
  const first = useRef(onChange);
  useEffect(() => {
    first.current?.(stateOf(cap, rate, temp));
    // mount only: later changes are reported by setAll
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finished = run.allowed && run.totalH !== null;
  const xMax = finished ? Math.max(1, Math.ceil((run.totalH as number) * 1.1 * 2) / 2) : run.allowed ? 8 : 3;
  const step = xMax <= 3 ? 0.5 : 1;
  const xTicks = Array.from({ length: Math.floor(xMax / step) + 1 }, (_, k) => k * step).map((v) => ({ value: v, label: String(v) }));
  const iMax = niceMax(run.iSet * 1.1);
  const iStopA = cap / 1000 / 10;
  const vPts = run.t.map((t, k) => [t, run.v[k]] as [number, number]);
  const iPts = run.t.map((t, k) => [t, run.i[k]] as [number, number]);
  const ccMarker = run.ccH !== null ? [{ x: run.ccH, color: "var(--ink-3)", label: "CV" }] : [];
  const amps = (a: number) => `${Number(a.toFixed(2))} A`;

  return (
    <div data-widget="analog-charger" className="w-full">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Seg label="Cell capacity" value={cap} options={CHARGE_CAPACITIES.map((c) => ({ value: c, label: `${c} mAh` }))} onChange={(c) => setAll(c, rate, temp)} />
        <Seg label="Charge rate" value={rate} options={CHARGE_RATES.map((r) => ({ value: r, label: rateLabel(r) }))} onChange={(r) => setAll(cap, r, temp)} />
        <Seg label="Cell temperature" value={temp} options={CHARGE_TEMPS.map((t) => ({ value: t, label: tempLabel(t) }))} onChange={(t) => setAll(cap, rate, t)} />
      </div>

      <div className="mt-3">
        <p className="text-xs text-ink-3">Terminal voltage while charging (hours)</p>
        <Plot
          height={180}
          ariaLabel={
            run.allowed
              ? `Terminal voltage against time: it climbs at constant current to 4.20 volts after ${hours(run.ccH)}, then stays at 4.20 volts.`
              : "No charging: the charger refuses this temperature, so there is no curve."
          }
          x={[0, xMax]}
          y={[3, 4.4]}
          xTicks={xTicks}
          yTicks={[3, 3.5, 4].map((v) => ({ value: v, label: v.toFixed(1) }))}
          markers={[{ y: CHARGE_V, color: "var(--ink-2)", label: "4.20 V" }, ...ccMarker]}
          series={[{ points: vPts }]}
          xLabel="hours"
          yLabel="volts"
        />
      </div>
      <div className="mt-2">
        <p className="text-xs text-ink-3">Charge current while charging (hours)</p>
        <Plot
          height={180}
          ariaLabel={
            run.allowed
              ? `Charge current against time: flat at ${amps(run.iSet)} during constant current, then tapering towards ${amps(iStopA)}, where the charger stops.`
              : "No charging: the charger refuses this temperature, so there is no curve."
          }
          x={[0, xMax]}
          y={[0, iMax]}
          xTicks={xTicks}
          yTicks={[0, 0.5, 1].map((f) => ({ value: f * iMax, label: String(Number((f * iMax).toPrecision(2))) }))}
          markers={[{ y: iStopA, color: "var(--ink-2)", label: "C/10 stop" }, ...ccMarker]}
          series={[{ points: iPts, color: SECOND }]}
          xLabel="hours"
          yLabel="amps"
        />
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Readout label="set current" value={amps(run.iSet)} />
        <Readout label="constant-current time" value={hours(run.ccH)} />
        <Readout label="total time" value={hours(run.totalH)} accent />
        <Readout label="charge at the end" value={run.allowed ? `${Math.round(run.finalSoc * 100)}%` : "none"} />
        <Readout label="energy in" value={run.allowed ? `${run.wh.toFixed(1)} Wh` : "none"} />
      </div>

      <div className="mt-3 space-y-2">
        {!run.allowed && (
          <Note tone="accent">
            The charger refuses: {tempLabel(temp)} is outside its {CHARGE_T_MIN} to {CHARGE_T_MAX} °C window (typical). {run.reason === "cold" ? "Charging a frozen cell plates metallic lithium onto the anode, which can short the cell from the inside later." : "A hot cell ages fast and is closer to thermal runaway."} Real chargers read a thermistor on the cell and wait.
          </Note>
        )}
        {run.allowed && rate > 1 && (
          <Note tone="accent">
            {rateLabel(rate)} is above the charge rate most Li-ion cells allow (typically 0.5C to 1C; only the datasheet decides). The toy lets you run it, but a real cell would wear out or be damaged.
          </Note>
        )}
        {run.allowed && temp <= 5 && (
          <Note>
            Cold cell: its internal resistance is about 3 times higher (typical), so the terminal voltage reaches 4.20 V sooner, the constant-voltage phase starts earlier, and the cell ends a few percent less full when the current falls to C/10. Real chargers also cut the current below about 10 °C (typical JEITA-style rules).
          </Note>
        )}
        {run.allowed && (
          <Note>
            Constant current at {amps(run.iSet)} for {hours(run.ccH)}, then the charger holds 4.20 V and the current tapers until it falls to C/10 = {amps(iStopA)}. Then it stops: it does not float at 4.20 V.
          </Note>
        )}
        <ToyNote>Toy model: a typical NMC-like open-circuit curve plus an internal resistance of 0.1 Ω × (2000 mAh ÷ capacity) at 25 °C and 3 times that at 5 °C. 100% charge efficiency, no diffusion limits, no self-heating, no pre-charge: real cells take somewhat longer. Energy is measured at the terminals. Never charge a real cell this way without a proper charger IC.</ToyNote>
      </div>
    </div>
  );
}

/** goal: { allowed, maxC, maxHours, minSoc, tempC, cRate, capacityMah }. */
export function checkCharge(state: unknown, goal: Record<string, unknown>) {
  const s = state as ChargeLabState | undefined;
  if (!s) return false;
  if (typeof goal.allowed === "boolean" && s.allowed !== goal.allowed) return false;
  if (typeof goal.maxC === "number" && !(s.cRate <= goal.maxC + 1e-9)) return false;
  if (typeof goal.maxHours === "number" && !(s.totalH !== null && s.totalH <= goal.maxHours)) return false;
  if (typeof goal.minSoc === "number" && !(s.allowed && s.finalSoc >= goal.minSoc)) return false;
  if (typeof goal.tempC === "number" && s.tempC !== goal.tempC) return false;
  if (typeof goal.cRate === "number" && Math.abs(s.cRate - goal.cRate) > 1e-9) return false;
  if (typeof goal.capacityMah === "number" && s.capacityMah !== goal.capacityMah) return false;
  return true;
}
