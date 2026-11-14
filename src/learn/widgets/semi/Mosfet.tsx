"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { MOS, channelState, drainCurrent, type MosType } from "./phys";
import { Note, Readout, Seg, Slider, Toy, ORANGE, formatSI } from "./ui";

// ───────────────────────────── semi-mosfet: gate, channel, threshold ─────────────────────────────

export interface MosfetProps {
  type?: MosType;
  /** Offer the NMOS / PMOS switch. */
  both?: boolean;
  /** Starting |Vgs| in volts. */
  vgs?: number;
}

export interface MosfetState {
  type: MosType;
  /** Signed gate–source voltage (negative for PMOS). */
  vgs: number;
  idA: number;
  on: boolean;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

function Section({ type, mag }: { type: MosType; mag: number }) {
  const st = channelState(type, mag);
  const { vth } = MOS[type];
  const n = type === "nmos";
  const carrier = n ? "var(--brand)" : ORANGE;
  const ov = Math.max(0, mag - vth);
  const depth = st === "accumulation" ? 0 : r1(Math.min(1, mag / vth) * 22);
  const dots = st === "inversion" ? Math.min(10, 2 + Math.round(ov * 3)) : 0;
  const on = st === "inversion";
  const sign = n ? "+" : "−";

  return (
    <svg viewBox="0 0 360 214" className="block h-auto w-full rounded-xl border border-line bg-surface" role="img" aria-label={`${n ? "NMOS" : "PMOS"} cross-section. Gate at ${n ? "" : "minus "}${mag.toFixed(1)} volts: ${on ? "a channel connects source and drain" : st === "depletion" ? "carriers pushed away, no channel yet" : "no channel"}.`}>
      {/* body */}
      <rect x={14} y={100} width={332} height={88} rx={4} fill="var(--surface-2)" stroke="var(--line-strong)" />
      <text x={180} y={180} textAnchor="middle" fontSize={14} fill="var(--ink-2)">
        {n ? "p-type body (holes)" : "n-type body (electrons)"}
      </text>
      {/* source and drain */}
      <rect x={28} y={100} width={88} height={40} rx={4} fill="var(--tint)" stroke="var(--line-strong)" />
      <rect x={244} y={100} width={88} height={40} rx={4} fill="var(--tint)" stroke="var(--line-strong)" />
      <text x={72} y={126} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--ink)">
        {n ? "n+" : "p+"} source
      </text>
      <text x={288} y={126} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--ink)">
        {n ? "n+" : "p+"} drain
      </text>
      {/* depletion under the gate */}
      {depth > 0 && <rect x={116} y={100} width={128} height={depth} fill="var(--surface)" stroke="var(--ink-3)" strokeDasharray="4 3" />}
      {/* channel */}
      {on && <rect x={112} y={100} width={136} height={7} fill={carrier} opacity={r1(Math.min(1, 0.35 + ov / 2.6))} />}
      {Array.from({ length: dots }, (_, i) => (
        <circle key={i} cx={r1(122 + (116 * (i + 0.5)) / dots)} cy={104} r={3} fill={n ? "var(--surface)" : "var(--ink)"} />
      ))}
      {/* oxide and gate */}
      <rect x={112} y={90} width={136} height={10} fill="var(--line-strong)" />
      <rect x={112} y={58} width={136} height={32} rx={3} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5} />
      <text x={180} y={79} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--ink)">
        gate {mag > 0.05 ? `${sign}${mag.toFixed(1)} V` : "0 V"}
      </text>
      <line x1={296} y1={70} x2={250} y2={94} stroke="var(--ink-3)" strokeWidth={1} />
      <text x={300} y={74} fontSize={14} fill="var(--ink-2)">
        oxide
      </text>
      {/* terminals */}
      {[
        { x: 72, y: 100, l: "S" },
        { x: 180, y: 58, l: "G" },
        { x: 288, y: 100, l: "D" },
      ].map((t) => (
        <g key={t.l}>
          <line x1={t.x} y1={t.y} x2={t.x} y2={26} stroke="var(--ink)" strokeWidth={1.5} />
          <circle cx={t.x} cy={22} r={4} fill="var(--surface)" stroke="var(--ink)" strokeWidth={1.5} />
          <text x={t.x + 10} y={27} fontSize={14} fontWeight={700} fill="var(--ink)">
            {t.l}
          </text>
        </g>
      ))}
      <text x={280} y={48} textAnchor="end" fontSize={14} fill="var(--ink-2)">
        {n ? "+3.3 V" : "−3.3 V"}
      </text>
      {/* flow */}
      {on && (
        <g>
          <line x1={128} y1={200} x2={232} y2={200} stroke={carrier} strokeWidth={2.5} />
          <path d="M224 194 L233 200 L224 206" fill="none" stroke={carrier} strokeWidth={2.5} />
          <text x={120} y={205} textAnchor="end" fontSize={14} fill="var(--ink)">
            {n ? "electrons" : "holes"}
          </text>
        </g>
      )}
    </svg>
  );
}

const PX0 = 44;
const PX1 = 346;
const PY0 = 14;
const PY1 = 140;
const IMAX = 7e-3;
const px = (v: number) => PX0 + (v / MOS.vdd) * (PX1 - PX0);
const py = (i: number) => PY1 - (i / IMAX) * (PY1 - PY0);

function Curve({ type, mag }: { type: MosType; mag: number }) {
  const pts = Array.from({ length: 67 }, (_, k) => {
    const v = (MOS.vdd * k) / 66;
    return `${r1(px(v))} ${r1(py(drainCurrent(type, v)))}`;
  }).join(" ");
  const { vth } = MOS[type];
  const neg = type === "pmos" ? "−" : "";
  return (
    <svg viewBox="0 0 360 172" className="mt-3 block h-auto w-full rounded-xl border border-line bg-surface" role="img" aria-label={`Drain current against gate voltage. Zero below the ${vth} volt threshold, rising as a square above it.`}>
      {[0, 2, 4, 6].map((ma) => (
        <g key={ma}>
          <line x1={PX0} y1={r1(py(ma / 1000))} x2={PX1} y2={r1(py(ma / 1000))} stroke="var(--line-strong)" strokeWidth={0.7} />
          <text x={PX0 - 4} y={r1(py(ma / 1000)) + 5} textAnchor="end" fontSize={14} fill="var(--ink-3)">
            {ma}
          </text>
        </g>
      ))}
      {[0, 1, 2, 3].map((v) => (
        <text key={v} x={r1(px(v))} y={PY1 + 17} textAnchor="middle" fontSize={14} fill="var(--ink-3)">
          {v === 0 ? "0" : `${neg}${v}`}
        </text>
      ))}
      <line x1={r1(px(vth))} y1={PY0} x2={r1(px(vth))} y2={PY1} stroke="var(--ink-3)" strokeDasharray="3 4" />
      <text x={r1(px(vth)) + 4} y={PY0 + 14} fontSize={14} fill="var(--ink-2)">
        threshold
      </text>
      <polyline points={pts} fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" />
      <circle cx={r1(px(mag))} cy={r1(py(drainCurrent(type, mag)))} r={7} fill="var(--brand)" stroke="var(--surface)" strokeWidth={2} />
      <text x={PX0 + 4} y={PY1 - 6} fontSize={14} fill="var(--ink-2)">
        mA
      </text>
      <text x={PX1} y={168} textAnchor="end" fontSize={14} fill="var(--ink-2)">
        gate voltage Vgs (V) →
      </text>
    </svg>
  );
}

export function Mosfet({ props, onChange }: WidgetProps<MosfetProps>) {
  const [type, setType] = useState<MosType>(props.type ?? "nmos");
  const [mag, setMag] = useState(props.vgs ?? 0);
  const { vth } = MOS[type];
  const id = drainCurrent(type, mag);
  const st = channelState(type, mag);
  const n = type === "nmos";

  const report = (t: MosType, m: number) => onChange?.({ type: t, vgs: t === "pmos" ? -m : m, idA: drainCurrent(t, m), on: drainCurrent(t, m) > 0 } satisfies MosfetState);

  const note =
    st === "accumulation"
      ? `Gate at 0 V. Source and drain are ${n ? "n-type islands in p-type" : "p-type islands in n-type"} silicon: two PN junctions back to back, one of them always reverse-biased. No current flows. The transistor is off.`
      : st === "depletion"
        ? `The ${n ? "positive" : "negative"} gate pushes the body's ${n ? "holes" : "electrons"} away, leaving a depleted layer under the oxide, but ${mag.toFixed(1)} V is still below the ${vth} V threshold: no channel, practically no current.`
        : `Past the ${vth} V threshold the gate pulls a thin layer of ${n ? "electrons" : "holes"} to the surface: a channel joins source and drain. ${formatSI(id, "A")} flows, and the gate itself draws no steady current through its insulating oxide.`;

  return (
    <div className="w-full" data-widget>
      {props.both && (
        <Seg
          label="Transistor type"
          value={type}
          onChange={(t) => {
            setType(t);
            report(t, mag);
          }}
          options={[
            { value: "nmos", label: "NMOS" },
            { value: "pmos", label: "PMOS" },
          ]}
        />
      )}
      <div className="mt-3">
        <Slider
          label={`Gate voltage Vgs${n ? "" : " (negative for PMOS)"}`}
          value={mag}
          min={0}
          max={MOS.vdd}
          step={0.1}
          onChange={(v) => {
            const m = Math.round(v * 10) / 10;
            setMag(m);
            report(type, m);
          }}
          format={(v) => (v === 0 ? "0 V" : `${n ? "" : "−"}${v.toFixed(1)} V`)}
        />
      </div>
      <div className="mt-3">
        <Section type={type} mag={mag} />
      </div>
      <Curve type={type} mag={mag} />
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Threshold" value={`${n ? "" : "−"}${vth} V`} />
        <Readout label="Drain current" value={id > 0 ? formatSI(id, "A") : "≈ 0"} accent={id > 0} />
        <Readout label="Switch" value={id > 0 ? "on" : "off"} accent={id > 0} />
      </div>
      <div className="mt-3">
        <Note tone={id > 0 ? "accent" : "plain"}>{note}</Note>
      </div>
      <Toy>
        Toy model: threshold {vth} V, drain held at the 3.3 V supply, current from the square law I = ½·k·(|Vgs| − |Vth|)² with k = {MOS[type].k * 1000} mA/V² ({n ? "NMOS" : "PMOS; holes move more slowly, so it is weaker"}). Real transistors leak a little below threshold, and modern logic ones have lower thresholds.
      </Toy>
    </div>
  );
}

/** goal: { type, on, minIdA, maxIdA } */
export function checkMosfet(state: unknown, goal: Record<string, unknown>) {
  const s = state as MosfetState | undefined;
  if (!s) return false;
  if (typeof goal.type === "string" && s.type !== goal.type) return false;
  if (typeof goal.on === "boolean" && s.on !== goal.on) return false;
  if (typeof goal.minIdA === "number" && s.idA < goal.minIdA) return false;
  if (typeof goal.maxIdA === "number" && s.idA > goal.maxIdA) return false;
  if (typeof goal.minVgs === "number" && Math.abs(s.vgs) < goal.minVgs) return false;
  return true;
}
