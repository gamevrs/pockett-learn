"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { EM_TARGET_Y, HTOL_HOURS, USE_C, currentDensity, emLifeYears, htolAF, htolYears, sig, voidCount } from "./reliab-model";
import { Note, Readout, Seg, Slider, Toy, ORANGE, BLUE } from "./ui";

// ───────────────────────────── semi-reliab: electromigration (Black's equation) and HTOL acceleration ─────────────────────────────

export interface ReliabProps {
  mode?: "em" | "htol";
  /** em: starting wire width, µm. */
  widthUm?: number;
  /** em: starting temperature, °C. */
  tempC?: number;
  /** em: fix the temperature (hide the slider, show it as a readout). */
  lockTemp?: boolean;
  /** htol: starting stress temperature, °C. */
  stressC?: number;
  /** htol: starting activation energy, eV. */
  ea?: number;
}

export type ReliabState =
  | { mode: "em"; widthUm: number; tempC: number; jMAcm2: number; lifeY: number }
  | { mode: "htol"; stressC: number; ea: number; af: number; years: number };

const r2 = (v: number) => Math.round(v * 100) / 100;
const lifeText = (y: number) => (y > 1000 ? "> 1,000 years" : `${sig(y)} years`);

export function Reliab({ props, onChange }: WidgetProps<ReliabProps>) {
  return props.mode === "htol" ? <Htol props={props} onChange={onChange} /> : <Em props={props} onChange={onChange} />;
}

type Inner = { props: ReliabProps; onChange?: (s: unknown) => void };

function Em({ props, onChange }: Inner) {
  const [w, setW] = useState(props.widthUm ?? 0.5);
  const [temp, setTemp] = useState(props.tempC ?? 105);
  const lock = !!props.lockTemp;
  const j = currentDensity(w);
  const life = emLifeYears(w, temp);
  const ok = life >= EM_TARGET_Y;
  const nVoids = voidCount(life);

  const report = (ww: number, tt: number) =>
    onChange?.({ mode: "em", widthUm: ww, tempC: tt, jMAcm2: currentDensity(ww), lifeY: emLifeYears(ww, tt) } satisfies ReliabState);

  // drawn wire: height tracks the width, clamped to the picture
  const hh = Math.min(96, 8 + w * 30);
  const cy = 90;
  const top = cy - hh / 2;
  const x0 = 20;
  const x1 = 340;
  const voidXs = [52, 94, 134, 172].slice(0, nVoids);

  return (
    <div className="w-full" data-widget>
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider
          label="Wire width (thickness fixed at 0.2 µm)"
          value={w}
          min={0.2}
          max={3}
          step={0.05}
          onChange={(v) => {
            const x = r2(v);
            setW(x);
            report(x, temp);
          }}
          format={(v) => `${v.toFixed(2)} µm`}
        />
        {lock ? (
          <div className="flex items-end">
            <Readout label="Chip temperature (fixed)" value={`${temp} °C`} />
          </div>
        ) : (
          <Slider
            label="Chip temperature"
            value={temp}
            min={25}
            max={150}
            step={5}
            onChange={(v) => {
              setTemp(v);
              report(w, v);
            }}
            format={(v) => `${v} °C`}
          />
        )}
      </div>

      <div className="mt-3 flex justify-center">
        <svg
          viewBox="0 0 360 180"
          className="block h-auto w-full max-w-[26rem]"
          role="img"
          aria-label={`Top view of a copper wire ${w.toFixed(2)} micrometres wide carrying 2 milliamps. ${nVoids ? `${nVoids} voids have opened near the upstream end and a hillock has grown downstream.` : "The wire is intact."}`}
        >
          <rect x={x0} y={top} width={x1 - x0} height={hh} rx={3} fill={ORANGE} opacity={0.55} stroke="var(--line-strong)" strokeWidth={1.5} />
          {nVoids > 0 && (
            <path d={`M${x1 - 70} ${top} q22 -${Math.min(18, hh / 2 + 6)} 44 0 z`} fill="var(--bad)" opacity={0.85} stroke="var(--ink)" strokeWidth={1} />
          )}
          {voidXs.map((vx, i) => (
            <ellipse key={i} cx={vx} cy={cy + (i % 2 ? 1 : -1) * Math.min(hh / 5, 6)} rx={9} ry={Math.max(3, Math.min(hh / 2 - 1, 12))} fill="var(--surface)" stroke="var(--bad)" strokeWidth={2} />
          ))}
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <line x1={x0 + 30 + i * 100} y1={28} x2={x0 + 82 + i * 100} y2={28} stroke="var(--ink-2)" strokeWidth={2} />
              <path d={`M${x0 + 82 + i * 100} 28 l-8 -5 m8 5 l-8 5`} fill="none" stroke="var(--ink-2)" strokeWidth={2} />
            </g>
          ))}
          <text x={180} y={18} textAnchor="middle" fontSize={14} fill="var(--ink)">
            electrons flow →
          </text>
          {nVoids > 0 && (
            <>
              <text x={x0 + 4} y={170} fontSize={14} fill="var(--ink)">
                voids
              </text>
              <text x={x1 - 4} y={170} textAnchor="end" fontSize={14} fill="var(--ink)">
                hillock
              </text>
            </>
          )}
          {nVoids === 0 && (
            <text x={180} y={170} textAnchor="middle" fontSize={14} fill="var(--ink)">
              wire intact
            </text>
          )}
          <text x={x1} y={cy + hh / 2 + 16} textAnchor="end" fontSize={14} fill="var(--ink)">
            {w.toFixed(2)} µm
          </text>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Current 2 mA, density J" value={`${sig(j)} MA/cm²`} />
        <Readout label="Median lifetime" value={lifeText(life)} accent />
        <Readout label="10-year target" value={ok ? "met" : "missed"} />
      </div>
      <div className="mt-3">
        <Note tone={ok ? "accent" : "plain"}>
          {ok
            ? `${lifeText(life)} at ${temp} °C clears the 10-year target. Lifetime goes as 1/J², so doubling the width (halving J) makes the wire live four times longer.`
            : `Only ${lifeText(life)} at ${temp} °C. Narrow wires carry a higher current density J, and lifetime falls as 1/J²; heat shortens it further (Black's equation, Ea = 0.85 eV).`}
        </Note>
      </div>
      <Toy>
        Simplified model with illustrative numbers: lifetime = 10 years × J⁻² × exp[(Ea/k)(1/T − 1/T_ref)], anchored at 10 years for 1 MA/cm² and 105 °C. Real wires differ in grain structure, length, barrier layers and the current direction; the void and hillock drawing is only a cartoon.
      </Toy>
    </div>
  );
}

const EA_OPTIONS = [
  { value: 0.5, label: "0.5 eV" },
  { value: 0.7, label: "0.7 eV (a common assumption)" },
  { value: 0.9, label: "0.9 eV" },
];

function Htol({ props, onChange }: Inner) {
  const [stress, setStress] = useState(props.stressC ?? 105);
  const [ea, setEa] = useState(props.ea ?? 0.7);
  const af = htolAF(stress, ea);
  const years = htolYears(stress, ea);

  const report = (s: number, e: number) =>
    onChange?.({ mode: "htol", stressC: s, ea: e, af: htolAF(s, e), years: htolYears(s, e) } satisfies ReliabState);

  const barFrac = Math.max(0, Math.min(1, years / 30));
  const bx0 = 20;
  const bx1 = 340;

  return (
    <div className="w-full" data-widget>
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider
          label={`Stress temperature (use: ${USE_C} °C)`}
          value={stress}
          min={85}
          max={175}
          step={5}
          onChange={(v) => {
            setStress(v);
            report(v, ea);
          }}
          format={(v) => `${v} °C`}
        />
        <div>
          <span className="text-xs text-ink-3">Activation energy</span>
          <Seg
            label="Activation energy"
            value={ea}
            onChange={(v) => {
              setEa(v);
              report(stress, v);
            }}
            options={EA_OPTIONS}
            className="mt-1"
          />
        </div>
      </div>

      <div className="mt-3 flex justify-center">
        <svg
          viewBox="0 0 360 170"
          className="block h-auto w-full max-w-[26rem]"
          role="img"
          aria-label="Bathtub curve of failure rate over time: a falling infant-mortality section that burn-in screens, a flat useful-life section and a rising wear-out section that the high-temperature operating-life test estimates."
        >
          <path d="M20 34 C34 96 58 104 100 104 L250 104 C292 104 316 74 340 26" fill="none" stroke="var(--brand)" strokeWidth={3} />
          <line x1={20} y1={128} x2={340} y2={128} stroke="var(--line-strong)" strokeWidth={1.5} />
          <line x1={100} y1={22} x2={100} y2={128} stroke="var(--line-strong)" strokeDasharray="4 4" />
          <rect x={20} y={125} width={80} height={6} fill={BLUE} />
          <rect x={100} y={125} width={240} height={6} fill={ORANGE} />
          <text x={22} y={18} fontSize={14} fill="var(--ink)">
            burn-in screens these
          </text>
          <text x={220} y={120} textAnchor="middle" fontSize={14} fill="var(--ink)">
            HTOL estimates this
          </text>
          <text x={20} y={156} fontSize={14} fill="var(--ink-2)">
            failure rate ↑
          </text>
          <text x={340} y={156} textAnchor="end" fontSize={14} fill="var(--ink-2)">
            time →
          </text>
        </svg>
      </div>

      <div className="mt-2 flex justify-center">
        <svg
          viewBox="0 0 360 70"
          className="block h-auto w-full max-w-[26rem]"
          role="img"
          aria-label={`Bar from 0 to 30 years of use: ${HTOL_HOURS.toLocaleString("en-US")} hours of stress stand for ${sig(years, 2)} years.`}
        >
          <rect x={bx0} y={14} width={bx1 - bx0} height={16} rx={4} fill="var(--surface-2)" stroke="var(--line-strong)" />
          <rect x={bx0} y={14} width={Math.max(2, (bx1 - bx0) * barFrac)} height={16} rx={4} fill="var(--brand)" />
          {[0, 10, 20, 30].map((t) => (
            <g key={t}>
              <line x1={bx0 + ((bx1 - bx0) * t) / 30} y1={30} x2={bx0 + ((bx1 - bx0) * t) / 30} y2={36} stroke="var(--ink-2)" />
              <text x={bx0 + ((bx1 - bx0) * t) / 30} y={54} textAnchor={t === 0 ? "start" : t === 30 ? "end" : "middle"} fontSize={14} fill="var(--ink-2)">
                {t === 30 ? "30 years" : t}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Acceleration factor" value={`${sig(af)}×`} accent />
        <Readout label={`${HTOL_HOURS.toLocaleString("en-US")} h of stress ≈`} value={`${sig(years, 2)} years of use`} accent />
      </div>
      <div className="mt-3">
        <Note>
          {`At ${stress} °C and Ea = ${ea} eV each hour on the test bench ages the chip like ${sig(af)} hours at ${USE_C} °C. A higher activation energy makes heat count for more, so the same test then claims a longer life.`}
        </Note>
      </div>
      <Toy>
        Simplified model with illustrative numbers: AF = exp[(Ea/k)(1/T_use − 1/T_stress)] with one failure mechanism and one activation energy. Real qualification mixes several mechanisms, voltage acceleration and statistics on hundreds of parts.
      </Toy>
    </div>
  );
}

/** goal (em): { tempC (exact), minLifeY, maxWidthUm, minWidthUm }; goal (htol): { ea (exact), minYears, maxStressC }; optional mode must match. */
export function checkReliab(state: unknown, goal: Record<string, unknown>) {
  const s = state as ReliabState | undefined;
  if (!s) return false;
  if (typeof goal.mode === "string" && s.mode !== goal.mode) return false;
  if (s.mode === "em") {
    if (typeof goal.tempC === "number" && Math.abs(s.tempC - goal.tempC) > 1e-9) return false;
    if (typeof goal.minLifeY === "number" && s.lifeY < goal.minLifeY) return false;
    if (typeof goal.maxWidthUm === "number" && s.widthUm > goal.maxWidthUm + 1e-9) return false;
    if (typeof goal.minWidthUm === "number" && s.widthUm < goal.minWidthUm - 1e-9) return false;
    return true;
  }
  if (typeof goal.ea === "number" && Math.abs(s.ea - goal.ea) > 1e-9) return false;
  if (typeof goal.minYears === "number" && s.years < goal.minYears) return false;
  if (typeof goal.maxStressC === "number" && s.stressC > goal.maxStressC) return false;
  return true;
}
