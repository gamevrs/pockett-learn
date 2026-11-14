"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { DECAP, DECAP_PLACE_MM, DECAP_VIA_MM, decap, decapWave, type DecapPlace, type DecapValue, type DecapVia } from "./si";
import { Caption, Note, ORANGE, Readout, Seg, ToyNote } from "./ui";

// ───────────────────────────── pcb-decap: where the decoupling capacitor goes ─────────────────────────────

export interface DecapProps {
  place?: DecapPlace;
  via?: DecapVia;
  cap?: DecapValue;
}

export interface DecapState {
  place: DecapPlace;
  via: DecapVia;
  cap: DecapValue;
  L_nH: number;
  droop_mV: number;
  ok: boolean;
}

const PLACES: { value: DecapPlace; label: string }[] = [
  { value: "1mm", label: "Next to the pin (1 mm)" },
  { value: "5mm", label: "5 mm away" },
  { value: "20mm", label: "20 mm away (far side)" },
];
const VIAS: { value: DecapVia; label: string }[] = [
  { value: "pad", label: "Via in the pad" },
  { value: "5mm", label: "Via after a 5 mm trace" },
  { value: "shared", label: "Shared via, far away" },
];
const CAPS: { value: DecapValue; label: string }[] = [
  { value: "100nF", label: "100 nF" },
  { value: "1uF", label: "1 µF" },
  { value: "10uF", label: "10 µF" },
];
const CAP_NAME: Record<DecapValue, string> = { "100nF": "100 nF", "1uF": "1 µF", "10uF": "10 µF" };

// cross-section geometry (px)
const CW = 360;
const CH = 148;
const SURF = 56;
const PLANE_Y = 116;
const PIN_X = 76;
const PX_PER_MM = 8;
// waveform plot
const PH = 150;
const PL = 44;
const PR = 8;
const PT = 8;
const PB = 30;
const VMIN = 2.6;
const VMAX = 3.5;
const TEND = 40e-9;

export function Decap({ props, onChange }: WidgetProps<DecapProps>) {
  const [place, setPlace] = useState<DecapPlace>(props.place ?? "5mm");
  const [via, setVia] = useState<DecapVia>(props.via ?? "5mm");
  const [cap, setCap] = useState<DecapValue>(props.cap ?? "100nF");
  const r = decap(place, via, cap);
  const droopMv = Math.round(r.dipV * 1000);

  const report = (p: DecapPlace, v: DecapVia, c: DecapValue) => {
    const x = decap(p, v, c);
    onChange?.({ place: p, via: v, cap: c, L_nH: Math.round(x.loopNh * 100) / 100, droop_mV: Math.round(x.dipV * 1000), ok: x.ok } satisfies DecapState);
  };

  const pickPlace = (p: DecapPlace) => {
    setPlace(p);
    report(p, via, cap);
  };
  const pickVia = (v: DecapVia) => {
    setVia(v);
    report(place, v, cap);
  };
  const pickCap = (c: DecapValue) => {
    setCap(c);
    report(place, via, c);
  };

  // drawing
  const dMm = DECAP_PLACE_MM[place];
  const padL = PIN_X + dMm * PX_PER_MM;
  const padR = padL + 16;
  const viaX = Math.min(padR + DECAP_VIA_MM[via] * PX_PER_MM, CW - 14);
  const gndX = 30;
  const loop = `M${PIN_X} ${SURF} L${padL} ${SURF} L${padR} ${SURF} L${viaX} ${SURF} L${viaX} ${PLANE_Y} L${gndX} ${PLANE_Y} L${gndX} ${SURF} Z`;

  const wave = decapWave(place, via, cap);
  const xOf = (t: number) => PL + (t / TEND) * (CW - PL - PR);
  const yOf = (v: number) => PT + (1 - (Math.min(VMAX, Math.max(VMIN, v)) - VMIN) / (VMAX - VMIN)) * (PH - PT - PB);
  const wavePath = wave.map((p, i) => `${i ? "L" : "M"}${xOf(p.t).toFixed(1)} ${yOf(p.v).toFixed(1)}`).join(" ");
  const minV = Math.min(...wave.map((p) => p.v));
  const bandTop = yOf(DECAP.vdd + DECAP.budgetV);
  const bandBot = yOf(DECAP.vdd - DECAP.budgetV);

  const label = `Decoupling capacitor ${CAP_NAME[cap]} placed ${PLACES.find((p) => p.value === place)!.label}, ground ${VIAS.find((v) => v.value === via)!.label}. Loop inductance ${r.loopNh.toFixed(1)} nanohenries, supply dip ${droopMv} millivolts, ${r.ok ? "inside" : "over"} the budget.`;

  return (
    <div className="w-full">
      <div className="flex flex-col items-center gap-2">
        <Seg label="Capacitor placement" value={place} onChange={pickPlace} options={PLACES} />
        <Seg label="Ground via" value={via} onChange={pickVia} options={VIAS} />
        <Seg label="Capacitor value" value={cap} onChange={pickCap} options={CAPS} />
      </div>

      <svg viewBox={`0 0 ${CW} ${CH}`} className="mt-3 w-full rounded-xl border border-line bg-surface" role="img" aria-label={label}>
        {/* board body and ground plane (side view, not to scale) */}
        <rect x={0} y={SURF} width={CW} height={PLANE_Y + 10 - SURF} fill="color-mix(in srgb, var(--ink-3) 10%, transparent)" />
        <rect x={0} y={PLANE_Y - 4} width={CW} height={8} fill="color-mix(in srgb, var(--ink-3) 45%, transparent)" />
        <line x1={0} x2={CW} y1={SURF} y2={SURF} stroke="var(--line-strong)" strokeWidth={1.5} />
        <text x={4} y={CH - 6} fontSize={14} fill="var(--ink-2)">
          ground plane (side view)
        </text>
        {/* the current loop */}
        <path d={loop} fill={ORANGE} opacity={0.22} stroke={ORANGE} strokeWidth={2} strokeLinejoin="round" />
        {/* chip */}
        <rect x={4} y={20} width={PIN_X - 4} height={SURF - 20} rx={3} fill="var(--surface-2)" stroke="var(--ink-2)" strokeWidth={1.5} />
        <text x={10} y={38} fontSize={14} fontWeight={600} fill="var(--ink)">
          IC
        </text>
        <text x={PIN_X - 4} y={50} textAnchor="end" fontSize={14} fill="var(--ink-2)">
          VDD
        </text>
        <text x={gndX - 22} y={50} fontSize={14} fill="var(--ink-2)">
          GND
        </text>
        <circle cx={PIN_X} cy={SURF} r={3.5} fill={ORANGE} />
        {/* capacitor */}
        <rect x={padL} y={SURF - 18} width={16} height={18} rx={2} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
        <text x={padL - 2} y={SURF - 26} fontSize={14} fontWeight={600} fill="var(--ink)">
          {CAP_NAME[cap]}
        </text>
        {/* vias */}
        <line x1={gndX} x2={gndX} y1={SURF} y2={PLANE_Y} stroke="var(--ink)" strokeWidth={3} />
        <line x1={viaX} x2={viaX} y1={SURF} y2={PLANE_Y} stroke="var(--ink)" strokeWidth={3} />
        <circle cx={viaX} cy={SURF} r={3.5} fill="var(--ink)" />
      </svg>
      <p className="mt-1 text-center text-[0.8rem] text-ink-3">Side view, vertical size not to scale. The shaded loop is the path the fast current takes.</p>

      <svg viewBox={`0 0 ${CW} ${PH}`} className="mt-3 w-full rounded-xl border border-line bg-surface" role="img" aria-label={`Supply voltage at the chip: dips to ${(minV).toFixed(2)} volts for a 50 milliamp step. Budget 3.135 to 3.465 volts.`}>
        <rect x={PL} y={bandTop} width={CW - PL - PR} height={bandBot - bandTop} fill="var(--brand)" opacity={0.14} />
        {[3.0, 3.3].map((v) => (
          <g key={v}>
            <line x1={PL} x2={CW - PR} y1={yOf(v)} y2={yOf(v)} stroke="var(--line-strong)" strokeWidth={0.8} />
            <text x={PL - 4} y={yOf(v) + 5} textAnchor="end" fontSize={14} fill="var(--ink-3)">
              {v.toFixed(1)}
            </text>
          </g>
        ))}
        <path d={wavePath} fill="none" stroke={r.ok ? "var(--brand)" : "var(--bad)"} strokeWidth={2.5} strokeLinejoin="round" />
        {minV < VMIN && (
          <text x={xOf(10e-9)} y={PH - PB - 8} fontSize={14} fill="var(--bad)">
            dips below {VMIN} V
          </text>
        )}
        {[0, 10, 20, 30, 40].map((n) => (
          <text key={n} x={xOf(n * 1e-9)} y={PH - 10} textAnchor={n === 0 ? "start" : n === 40 ? "end" : "middle"} fontSize={14} fill="var(--ink-3)">
            {n}
          </text>
        ))}
        <text x={CW - PR} y={PH - 28} textAnchor="end" fontSize={14} fill="var(--ink-3)">
          ns
        </text>
      </svg>
      <p className="mt-1 text-center text-[0.8rem] text-ink-3">Volts at the chip pin. The shaded band is the example ±5 % budget (3.135 to 3.465 V).</p>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Loop L" value={`${r.loopNh.toFixed(1)} nH`} accent />
        <Readout label="Supply dip" value={`${droopMv} mV`} />
        <Readout label="Budget" value={`${Math.round(DECAP.budgetV * 1000)} mV`} />
        <span className={`inline-flex min-h-8 items-center rounded-full border px-3 text-sm font-medium ${r.ok ? "border-[var(--brand)]/50 bg-tint text-ink" : "border-[var(--bad)]/60 text-[var(--bad)]"}`}>{r.ok ? "Inside budget" : "Over budget"}</span>
      </div>
      <div className="mt-3">
        <Note>
          The fast edge makes the loop inductance drop <b>{Math.round(r.inductiveV * 1000)} mV</b> (L × di/dt = {r.loopNh.toFixed(1)} nH × 50 mA / 1 ns). The charge the capacitor gives away costs only <b>{(r.chargeV * 1000).toFixed(r.chargeV < 0.0095 ? 1 : 0)} mV</b> ({CAP_NAME[cap]}).{" "}
          {cap !== "100nF" ? "Check what the bigger value bought you: almost nothing for the fast edge, because the loop sets the dip. " : ""}
          Above its self-resonant frequency (about <b>{(r.srfHz / 1e6).toFixed(r.srfHz < 1e7 ? 1 : 0)} MHz</b> here) the capacitor acts like the loop inductance.
        </Note>
      </div>
      <Caption className="mt-2 text-center">Toy model</Caption>
      <ToyNote>
        About 1 nH per mm of loop path, plus 0.8 to 1.1 nH for the capacitor body, pad and via (typical, bigger values sit in bigger packages). Load step 50 mA in 1 ns, held for 20 ns. First-order only: real supplies also ring. 3.3 V ± 5 % is an example budget.
      </ToyNote>
    </div>
  );
}

/** goal: { place, via, cap, maxL (nH), maxDroop (mV), ok } */
export function checkDecap(state: unknown, goal: Record<string, unknown>) {
  const s = state as DecapState | undefined;
  if (!s) return false;
  if (typeof goal.place === "string" && s.place !== goal.place) return false;
  if (typeof goal.via === "string" && s.via !== goal.via) return false;
  if (typeof goal.cap === "string" && s.cap !== goal.cap) return false;
  if (typeof goal.maxL === "number" && s.L_nH > goal.maxL) return false;
  if (typeof goal.maxDroop === "number" && s.droop_mV > goal.maxDroop) return false;
  if (typeof goal.ok === "boolean" && s.ok !== goal.ok) return false;
  return true;
}
