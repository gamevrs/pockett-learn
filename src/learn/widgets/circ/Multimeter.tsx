"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { partPins, type PartSpec, type WireSpec } from "../elec-kit/Schematic";
import { formatSI } from "../elec-kit/format";
import { METER, readMeter, type MeterMode, type MeterPlace, type MeterReading } from "./logic";
import { Btn, Note, Readout, Sch, Seg, ToyNote, ohms, volts } from "./ui";

export interface MultimeterProps {
  mode?: MeterMode;
  place?: MeterPlace;
  power?: boolean;
  battery?: number;
  r1?: number;
  r2?: number;
}

export interface MultimeterState {
  mode: MeterMode;
  place: MeterPlace;
  power: boolean;
  /** the number shown (null when the display shows a word) */
  value: number | null;
  display: string;
  /** a sensible way to use the meter (right mode, right place, power state) */
  correct: boolean;
  fuseBlown: boolean;
  /** has the fuse been blown at any point this session */
  everBlown: boolean;
}

/** goal: { mode, place, power, correct, everBlown, minValue, maxValue } (value in volts, amps or ohms to match the mode). */
export function checkMultimeter(state: unknown, goal: Record<string, unknown>) {
  const s = state as MultimeterState | undefined;
  if (!s) return false;
  const g = goal as { mode?: string; place?: string; power?: boolean; correct?: boolean; everBlown?: boolean; minValue?: number; maxValue?: number };
  if (g.mode !== undefined && s.mode !== g.mode) return false;
  if (g.place !== undefined && s.place !== g.place) return false;
  if (g.power !== undefined && s.power !== g.power) return false;
  if (g.correct !== undefined && s.correct !== g.correct) return false;
  if (g.everBlown !== undefined && s.everBlown !== g.everBlown) return false;
  if (g.minValue !== undefined && (s.value === null || s.value < g.minValue)) return false;
  if (g.maxValue !== undefined && (s.value === null || s.value > g.maxValue)) return false;
  return true;
}

const PLACES: { value: MeterPlace; label: string }[] = [
  { value: "r1", label: "Across R1" },
  { value: "r2", label: "Across R2" },
  { value: "battery", label: "Across battery" },
  { value: "series", label: "In the loop" },
];
const MODES: { value: MeterMode; label: string }[] = [
  { value: "V", label: "Volts (V)" },
  { value: "A", label: "Amps (A)" },
  { value: "ohm", label: "Ohms (Ω)" },
];

function isCorrect(mode: MeterMode, place: MeterPlace, power: boolean) {
  if (mode === "V") return place !== "series" && power;
  if (mode === "A") return place === "series" && power;
  return place !== "series" && !power;
}

function showValue(r: MeterReading, mode: MeterMode): string {
  if (r.value === null) return r.display;
  return formatSI(r.value, mode === "V" ? "V" : mode === "A" ? "A" : "Ω", { digits: 3 });
}

/** A virtual multimeter on a two-resistor circuit. Pick the dial and where the probes go; wrong choices show what would really happen. */
export function Multimeter({ props, onChange }: WidgetProps<MultimeterProps>) {
  const sc = { battery: props.battery ?? 9, r1: props.r1 ?? 1000, r2: props.r2 ?? 2000 };
  const [mode, setMode] = useState<MeterMode>(props.mode ?? "V");
  const [place, setPlace] = useState<MeterPlace>(props.place ?? "r1");
  const [power, setPower] = useState(props.power ?? true);
  const [fuseBlown, setFuseBlown] = useState(false);
  const [everBlown, setEverBlown] = useState(false);

  const reading0 = readMeter({ ...sc, power }, place, mode);
  const dead = mode === "A" && fuseBlown;
  const reading: MeterReading = dead ? { value: null, display: "FUSE", tone: "bad", note: "The meter's amps fuse has blown, so the amps setting is dead until it is replaced. Volts and ohms still work.", fuseBlown: true } : reading0;
  const correct = !dead && isCorrect(mode, place, power);

  const apply = (m: MeterMode, p: MeterPlace, pw: boolean) => {
    const was = fuseBlown;
    const r = readMeter({ ...sc, power: pw }, p, m);
    const blownNow = was || (m === "A" && !!r.fuseBlown);
    setMode(m);
    setPlace(p);
    setPower(pw);
    if (blownNow && !was) {
      setFuseBlown(true);
      setEverBlown(true);
    }
    const deadNow = m === "A" && blownNow;
    onChange?.({
      mode: m,
      place: p,
      power: pw,
      value: deadNow ? null : r.value,
      display: deadNow ? "FUSE" : r.display,
      correct: !deadNow && isCorrect(m, p, pw),
      fuseBlown: blownNow,
      everBlown: everBlown || (blownNow && !was),
    } satisfies MultimeterState);
  };

  const parts: PartSpec[] = [
    { kind: "battery", id: "B1", at: [3, 3], rot: 90, label: "Battery", value: volts(sc.battery) },
    { kind: "switch", id: "S1", at: [5, 2], label: "Switch", closed: power },
    { kind: "resistor", id: "R1", at: [10, 2], label: "R1", value: ohms(sc.r1), highlight: place === "r1" },
    { kind: "resistor", id: "R2", at: [15, 3], rot: 90, label: "R2", value: ohms(sc.r2), highlight: place === "r2" },
  ];
  const flow = power ? Math.sqrt(sc.battery / (sc.r1 + sc.r2)) : 0;
  const wires: WireSpec[] = [
    { points: ["B1.a", [3, 2], "S1.a"], flow },
    ...(place === "series" ? [] : [{ points: ["S1.b", [9, 2], "R1.a"] as never, flow }]),
    { points: ["R1.b", [15, 2], "R2.a"], flow },
    { points: ["R2.b", [15, 7], [3, 7], "B1.b"], flow },
  ];
  const pins = partPins(parts);
  const probe = (p: [number, number], red: boolean, key: string) => (
    <g key={key}>
      <circle cx={p[0]} cy={p[1]} r={7} fill={red ? "#d64545" : "#2b2b2b"} stroke="var(--surface)" strokeWidth={2} />
    </g>
  );
  let overlay: React.ReactNode = null;
  const ends: Record<Exclude<MeterPlace, "series">, [[number, number], [number, number]]> = {
    r1: [pins["R1.a"], pins["R1.b"]],
    r2: [pins["R2.a"], pins["R2.b"]],
    battery: [pins["B1.a"], pins["B1.b"]],
  };
  if (place === "series") {
    const a = pins["S1.b"];
    const b = pins["R1.a"];
    const cx = (a[0] + b[0]) / 2;
    overlay = (
      <g>
        <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="var(--brand)" strokeWidth={3} strokeDasharray="5 4" />
        <circle cx={cx} cy={a[1]} r={13} fill="var(--surface)" stroke="var(--brand)" strokeWidth={2.5} />
        <text x={cx} y={a[1] + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--ink)">
          {mode === "A" ? "A" : mode === "V" ? "V" : "Ω"}
        </text>
        {probe(a, true, "pa")}
        {probe(b, false, "pb")}
      </g>
    );
  } else {
    const [pa, pb] = ends[place];
    overlay = (
      <g>
        {probe(pa, true, "pa")}
        {probe(pb, false, "pb")}
      </g>
    );
  }

  const unitShown = mode === "ohm" ? "Ω" : mode;
  const toneBorder = reading.tone === "bad" ? "border-[var(--bad)]/60" : reading.tone === "good" ? "border-[var(--good)]/60" : "border-line";

  return (
    <div className="w-full">
      <Sch
        cols={18}
        rows={9}
        flowRef={Math.sqrt(sc.battery / (sc.r1 + sc.r2))}
        ariaLabel={`A ${volts(sc.battery)} battery, a switch and two resistors in a loop, with the meter ${place === "series" ? "inserted in the loop" : `across ${place === "battery" ? "the battery" : place.toUpperCase()}`}. The switch is ${power ? "closed" : "open"}.`}
        parts={parts}
        wires={wires}
        overlay={overlay}
      />
      <div className={`mx-auto mt-2 max-w-[22rem] rounded-2xl border-2 bg-surface-2 px-4 py-3 text-center ${toneBorder}`} aria-live="polite">
        <p className="text-xs text-ink-3">
          Meter on {unitShown === "Ω" ? "Ω (ohms)" : unitShown === "V" ? "V (volts)" : "A (amps)"}, probes {place === "series" ? "in the loop" : `across ${place === "battery" ? "the battery" : place.toUpperCase()}`}
        </p>
        <p className="font-mono text-3xl font-semibold tabular-nums text-ink">{showValue(reading, mode)}</p>
      </div>
      <div className="mt-2">
        <Note tone={reading.tone === "bad" ? "bad" : reading.tone === "good" ? "good" : "neutral"}>{reading.note}</Note>
      </div>
      <div className="mt-3 flex flex-col items-center gap-2">
        <Seg label="Dial" value={mode} options={MODES} onChange={(m) => apply(m, place, power)} />
        <Seg label="Probes" value={place} options={PLACES} onChange={(p) => apply(mode, p, power)} />
        <div className="flex flex-wrap justify-center gap-2">
          <Btn on={power} label={power ? "Switch the circuit off" : "Switch the circuit on"} onClick={() => apply(mode, place, !power)}>
            {power ? "Circuit: on" : "Circuit: off"}
          </Btn>
          {fuseBlown && (
            <Btn
              label="Replace the meter's fuse"
              onClick={() => {
                setFuseBlown(false);
                const r = readMeter({ ...sc, power }, place, mode);
                onChange?.({ mode, place, power, value: r.value, display: r.display, correct: isCorrect(mode, place, power), fuseBlown: false, everBlown } satisfies MultimeterState);
              }}
            >
              Replace fuse
            </Btn>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Readout label="Voltmeter input" value="10 MΩ" />
        <Readout label="Ammeter fuse" value={`${METER.fuseA} A`} />
        {correct && <Readout label="Placement" value="correct" accent />}
      </div>
      <ToyNote>A toy meter: a typical 10 MΩ voltmeter input and a 0.5 A fuse (real meters differ). Never do this on mains voltage.</ToyNote>
    </div>
  );
}
