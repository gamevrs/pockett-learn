"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { batteryDays, bomCost, monthsOf, type PartLine } from "./logic";
import { Caption, Choice, Note, Readout, Toy, money } from "./ui";

export interface ArchitectureProps {
  radio?: RadioId;
  sensor?: SensorId;
  power?: PowerId;
}

type RadioId = "module" | "chipdown" | "wifi";
type SensorId = "cap" | "res";
type PowerId = "coin" | "aa" | "usb";

export interface ArchitectureState {
  radio: RadioId;
  sensor: SensorId;
  power: PowerId;
  bom1k: number;
  bom10k: number;
  preCertified: boolean;
  /** battery life in months at one report per 15 minutes; 999 when mains powered */
  months: number;
}

const RADIOS: Record<RadioId, { title: string; sub: string; part: PartLine; sleepUa: number; radioMs: number; radioMa: number; certified: boolean }> = {
  module: {
    title: "Pre-certified BLE module",
    sub: "MCU, radio and antenna on one small board. Buy it, solder it down.",
    part: { name: "BLE module", count: 1, breaks: [[1, 7.2], [1000, 4.8], [10000, 4.1]] },
    sleepUa: 3,
    radioMs: 300,
    radioMa: 10,
    certified: true,
  },
  chipdown: {
    title: "Chip-down BLE SoC with your own antenna",
    sub: "Cheapest part. You do the radio layout, the matching and the radio certification.",
    part: { name: "BLE SoC + RF parts", count: 1, breaks: [[1, 3.4], [1000, 2.1], [10000, 1.75]] },
    sleepUa: 2,
    radioMs: 300,
    radioMa: 10,
    certified: false,
  },
  wifi: {
    title: "Wi-Fi module",
    sub: "Talks straight to the router, no phone needed. Joining a network takes much more power.",
    part: { name: "Wi-Fi module", count: 1, breaks: [[1, 5.6], [1000, 3.9], [10000, 3.4]] },
    sleepUa: 20,
    radioMs: 2000,
    radioMa: 150,
    certified: true,
  },
};

const SENSORS: Record<SensorId, { title: string; sub: string; part: PartLine }> = {
  cap: { title: "Capacitive moisture sensor", sub: "Copper pads under a coating plus a small chip. No bare metal in the soil.", part: { name: "Moisture sensor", count: 1, breaks: [[1, 0.9], [1000, 0.6], [10000, 0.45]] } },
  res: { title: "Resistive probe", sub: "Two bare metal prongs. Very cheap, but bare metal in wet soil corrodes.", part: { name: "Resistive probe", count: 1, breaks: [[1, 0.2], [1000, 0.15], [10000, 0.12]] } },
};

const POWERS: Record<PowerId, { title: string; sub: string; part: PartLine; mah: number }> = {
  coin: { title: "Coin cell", sub: "Small and cheap. Weak at delivering sudden bursts of current.", part: { name: "Coin cell + holder", count: 1, breaks: [[1, 0.6], [1000, 0.35], [10000, 0.28]] }, mah: 225 },
  aa: { title: "2 × AA cells", sub: "Bigger, heavier, about ten times the energy. Handles bursts well.", part: { name: "AA holder + cells", count: 1, breaks: [[1, 0.9], [1000, 0.6], [10000, 0.48]] }, mah: 2500 },
  usb: { title: "USB-C power", sub: "No battery to run out, but it needs a cable and a 5 V to 3.3 V regulator.", part: { name: "USB-C + regulator", count: 1, breaks: [[1, 1.4], [1000, 0.95], [10000, 0.8]] }, mah: 0 },
};

const ALWAYS: PartLine[] = [
  { name: "Ambient light sensor", count: 1, breaks: [[1, 0.7], [1000, 0.45], [10000, 0.38]] },
  { name: "PCB, passives, connectors and case", count: 1, breaks: [[1, 3.6], [1000, 2.65], [10000, 1.85]] },
];

function compute(radio: RadioId, sensor: SensorId, power: PowerId): ArchitectureState {
  const lines = [RADIOS[radio].part, SENSORS[sensor].part, POWERS[power].part, ...ALWAYS];
  const r = RADIOS[radio];
  const months =
    power === "usb"
      ? 999
      : monthsOf(
          batteryDays({ capacityMah: POWERS[power].mah, usable: 0.8, sleepUa: r.sleepUa + 5, intervalS: 900, measureMs: 100, measureMa: 2, radioMs: r.radioMs, radioMa: r.radioMa }),
        );
  return { radio, sensor, power, bom1k: bomCost(lines, 1000), bom10k: bomCost(lines, 10000), preCertified: r.certified, months };
}

const BOX = "fill-[var(--surface)] stroke-[var(--line-strong)]";

/** Pick the radio, sensor and power source for Sprout and watch the block diagram, parts cost at 1k and 10k units, certification burden and battery life. */
export function Architecture({ props, onChange }: WidgetProps<ArchitectureProps>) {
  const [radio, setRadio] = useState<RadioId>(props.radio ?? "module");
  const [sensor, setSensor] = useState<SensorId>(props.sensor ?? "cap");
  const [power, setPower] = useState<PowerId>(props.power ?? "coin");
  const st = compute(radio, sensor, power);

  const set = (r: RadioId, s: SensorId, p: PowerId) => {
    setRadio(r);
    setSensor(s);
    setPower(p);
    onChange?.(compute(r, s, p));
  };
  const life = st.months >= 999 ? "mains" : st.months >= 24 ? `${(st.months / 12).toFixed(1)} years` : `${st.months.toFixed(1)} months`;
  const cert = st.preCertified;

  return (
    <div className="w-full" data-widget>
      <svg viewBox="0 0 360 170" className="block h-auto w-full rounded-xl border border-line bg-surface" role="img" aria-label={`Block diagram: ${SENSORS[sensor].title} and a light sensor feed the ${RADIOS[radio].title}, powered by ${POWERS[power].title}, which talks to the phone app.`}>
        <defs>
          <marker id="prod-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--ink-3)" />
          </marker>
        </defs>
        {[
          [78, 30, 8],
          [78, 90, 8],
        ].map(([x, y]) => (
          <line key={y} x1={x} y1={y + 16} x2={128} y2={y === 30 ? 62 : 90} stroke="var(--ink-3)" strokeWidth={1.5} markerEnd="url(#prod-arrow)" />
        ))}
        <rect x={8} y={10} width={70} height={40} rx={8} className={BOX} />
        <text x={43} y={36} textAnchor="middle" fontSize={14} fill="var(--ink)">Soil</text>
        <rect x={8} y={70} width={70} height={40} rx={8} className={BOX} />
        <text x={43} y={96} textAnchor="middle" fontSize={14} fill="var(--ink)">Light</text>
        <rect x={128} y={36} width={104} height={70} rx={10} style={{ fill: "var(--surface)", stroke: cert ? "var(--good)" : "var(--bad)", strokeWidth: 2.5 }} />
        <text x={180} y={64} textAnchor="middle" fontSize={14} fill="var(--ink)">{radio === "wifi" ? "MCU + Wi-Fi" : "MCU + BLE"}</text>
        <text x={180} y={86} textAnchor="middle" fontSize={14} fill={cert ? "var(--good)" : "var(--bad)"}>{cert ? "pre-certified" : "you certify"}</text>
        <line x1={232} y1={71} x2={274} y2={71} stroke="var(--ink-3)" strokeWidth={1.5} strokeDasharray="4 3" markerEnd="url(#prod-arrow)" />
        <rect x={276} y={46} width={76} height={50} rx={8} style={{ fill: "var(--surface)", stroke: "var(--line-strong)", strokeDasharray: "4 3" }} />
        <text x={314} y={76} textAnchor="middle" fontSize={14} fill="var(--ink)">Phone</text>
        <line x1={180} y1={126} x2={180} y2={108} stroke="var(--ink-3)" strokeWidth={1.5} markerEnd="url(#prod-arrow)" />
        <rect x={110} y={126} width={140} height={34} rx={8} className={BOX} />
        <text x={180} y={148} textAnchor="middle" fontSize={14} fill="var(--ink)">{POWERS[power].title}</text>
      </svg>

      <div className="mt-4 space-y-4">
        <div>
          <Caption>Radio and brain</Caption>
          <div role="radiogroup" aria-label="Radio and brain" className="mt-1 grid gap-1.5">
            {(Object.keys(RADIOS) as RadioId[]).map((k) => (
              <Choice key={k} selected={radio === k} onClick={() => set(k, sensor, power)} title={RADIOS[k].title} sub={RADIOS[k].sub} />
            ))}
          </div>
        </div>
        <div>
          <Caption>Soil moisture sensing</Caption>
          <div role="radiogroup" aria-label="Soil moisture sensing" className="mt-1 grid gap-1.5 sm:grid-cols-2">
            {(Object.keys(SENSORS) as SensorId[]).map((k) => (
              <Choice key={k} selected={sensor === k} onClick={() => set(radio, k, power)} title={SENSORS[k].title} sub={SENSORS[k].sub} />
            ))}
          </div>
        </div>
        <div>
          <Caption>Power</Caption>
          <div role="radiogroup" aria-label="Power" className="mt-1 grid gap-1.5 sm:grid-cols-3">
            {(Object.keys(POWERS) as PowerId[]).map((k) => (
              <Choice key={k} selected={power === k} onClick={() => set(radio, sensor, k)} title={POWERS[k].title} sub={POWERS[k].sub} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Readout label="Parts at 1,000 units" value={money(st.bom1k)} accent />
        <Readout label="at 10,000" value={money(st.bom10k)} />
        <Readout label="Battery life (15 min)" value={life} />
      </div>
      <div className="mt-3">
        <Note tone={cert ? "plain" : "accent"}>
          {cert
            ? "The radio module arrives with its radio test results, so you re-use them instead of testing a new radio design."
            : "A chip-down radio is the cheapest part but a new design: antenna layout, matching and radio certification are now your job (see the certification lesson)."}
          {sensor === "res" ? " Bare prongs in wet soil corrode: cheap now, expensive in the field." : ""}
        </Note>
      </div>
      <Toy>Prices are made-up round numbers for a made-up product, to show how choices trade against each other. Real quotes vary by supplier, date and quantity. Battery life uses the same toy model as the lesson on requirements.</Toy>
    </div>
  );
}

/** goal: { maxBom1k?, preCertified?, minMonths?, power?, radio?, sensor? }. */
export function checkArchitecture(state: unknown, goal: Record<string, unknown>) {
  const s = state as ArchitectureState | undefined;
  if (!s) return false;
  if (typeof goal.maxBom1k === "number" && s.bom1k > goal.maxBom1k) return false;
  if (typeof goal.preCertified === "boolean" && s.preCertified !== goal.preCertified) return false;
  if (typeof goal.minMonths === "number" && s.months < goal.minMonths) return false;
  for (const k of ["radio", "sensor", "power"] as const) if (typeof goal[k] === "string" && s[k] !== goal[k]) return false;
  return true;
}
