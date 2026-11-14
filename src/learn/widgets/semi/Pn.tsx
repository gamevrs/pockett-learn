"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { builtIn, depletionUm, diodeCurrent } from "./phys";
import { Note, Readout, Slider, Toy, ORANGE, formatSI } from "./ui";

// ───────────────────────────── semi-pn: the PN junction and the diode curve ─────────────────────────────

export interface PnProps {
  /** Starting bias, volts (positive = forward: + on the p side). */
  v?: number;
  /** Lowest bias on the slider (default −5 V). */
  min?: number;
  /** Hide the I–V curve (first steps). */
  noCurve?: boolean;
}

export interface PnState {
  v: number;
  widthUm: number;
  currentA: number;
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/** Fixed pseudo-random spots for carriers in a region (deterministic, so server and browser agree). */
const SPOTS = Array.from({ length: 14 }, (_, i) => ({ fx: ((i * 37) % 100) / 100, fy: ((i * 61 + 17) % 100) / 100 }));

function Junction({ v, w }: { v: number; w: number }) {
  const X0 = 20;
  const X1 = 340;
  const MID = 180;
  const Y0 = 34;
  const Y1 = 118;
  const half = Math.min(150, (w * 90) / 2);
  const dl = MID - half;
  const dr = MID + half;
  const forward = v > 0.05;
  const i = diodeCurrent(v);
  const flowing = forward && i > 1e-5;

  return (
    <svg viewBox="0 0 360 150" className="block h-auto w-full rounded-xl border border-line bg-surface" role="img" aria-label={`PN junction at ${v.toFixed(2)} volts. Depletion region ${w.toFixed(2)} micrometres wide.`}>
      <rect x={X0} y={Y0} width={MID - X0} height={Y1 - Y0} fill="var(--surface-2)" stroke="var(--line-strong)" />
      <rect x={MID} y={Y0} width={X1 - MID} height={Y1 - Y0} fill="var(--tint)" stroke="var(--line-strong)" />
      {/* depletion region */}
      <rect x={r1(dl)} y={Y0} width={r1(dr - dl)} height={Y1 - Y0} fill="var(--surface)" stroke="var(--ink-3)" strokeDasharray="4 3" />
      {/* fixed ions inside the depletion region */}
      {[0.2, 0.5, 0.8].map((fy) =>
        [0.3, 0.75].map((fx) => (
          <g key={`${fx}-${fy}`}>
            {half > 10 && (
              <>
                <text x={r1(dl + (MID - dl) * fx)} y={r1(Y0 + (Y1 - Y0) * fy + 5)} textAnchor="middle" fontSize={14} fontWeight={700} fill={ORANGE}>
                  −
                </text>
                <text x={r1(MID + (dr - MID) * (1 - fx))} y={r1(Y0 + (Y1 - Y0) * fy + 5)} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--brand)">
                  +
                </text>
              </>
            )}
          </g>
        )),
      )}
      {/* free carriers outside the depletion region: holes (open) on the p side, electrons (filled) on the n side */}
      {SPOTS.map((s, k) => {
        const hx = X0 + 8 + s.fx * (dl - X0 - 16);
        const ex = dr + 8 + (1 - s.fx) * (X1 - dr - 16);
        const y = Y0 + 10 + s.fy * (Y1 - Y0 - 20);
        return (
          <g key={k}>
            {dl - X0 > 24 && <circle cx={r1(hx)} cy={r1(y)} r={4.5} fill="var(--surface)" stroke={ORANGE} strokeWidth={2} />}
            {X1 - dr > 24 && <circle cx={r1(ex)} cy={r1(y)} r={4.5} fill="var(--brand)" />}
          </g>
        );
      })}
      <text x={X0 + 4} y={24} fontSize={14} fontWeight={600} fill="var(--ink)">
        p-type
      </text>
      <text x={X1 - 4} y={24} textAnchor="end" fontSize={14} fontWeight={600} fill="var(--ink)">
        n-type
      </text>
      <text x={MID} y={24} textAnchor="middle" fontSize={14} fill="var(--ink-2)">
        depletion
      </text>
      {/* terminals */}
      <text x={X0} y={140} fontSize={14} fill="var(--ink-2)">
        {v > 0.001 ? "+" : v < -0.001 ? "−" : "0"} {Math.abs(v) > 0.001 ? `${Math.abs(v).toFixed(2)} V` : "V"}
      </text>
      <text x={X1} y={140} textAnchor="end" fontSize={14} fill="var(--ink-2)">
        {v > 0.001 ? "−" : v < -0.001 ? "+" : "0"}
      </text>
      {flowing && (
        <g>
          <line x1={110} y1={135} x2={250} y2={135} stroke="var(--brand)" strokeWidth={2.5} />
          <path d="M242 129 L251 135 L242 141" fill="none" stroke="var(--brand)" strokeWidth={2.5} />
          <text x={180} y={130} textAnchor="middle" fontSize={14} fill="var(--ink)">
            current
          </text>
        </g>
      )}
    </svg>
  );
}

const PX0 = 44;
const PX1 = 346;
const PY0 = 12;
const PY1 = 150;
const VMIN = -1;
const VMAX = 0.8;
const IMAX = 20e-3;
const px = (v: number) => PX0 + ((v - VMIN) / (VMAX - VMIN)) * (PX1 - PX0);
const py = (i: number) => PY1 - (Math.max(-0.05 * IMAX, Math.min(IMAX, i)) / IMAX) * (PY1 - PY0);

function Curve({ v }: { v: number }) {
  const pts: string[] = [];
  for (let k = 0; k <= 180; k++) {
    const vv = VMIN + ((VMAX - VMIN) * k) / 180;
    const i = diodeCurrent(vv);
    if (i > IMAX * 1.02) break;
    pts.push(`${r1(px(vv))} ${r1(py(i))}`);
  }
  const shownV = Math.max(VMIN, v);
  const i = diodeCurrent(v);
  const off = i > IMAX;
  return (
    <svg viewBox="0 0 360 182" className="mt-3 block h-auto w-full rounded-xl border border-line bg-surface" role="img" aria-label={`Diode current against voltage. At ${v.toFixed(2)} volts the current is ${formatSI(i, "A")}.`}>
      {[0, 5, 10, 15, 20].map((ma) => (
        <g key={ma}>
          <line x1={PX0} y1={r1(py(ma / 1000))} x2={PX1} y2={r1(py(ma / 1000))} stroke="var(--line-strong)" strokeWidth={0.7} />
          <text x={PX0 - 4} y={r1(py(ma / 1000)) + 5} textAnchor="end" fontSize={14} fill="var(--ink-3)">
            {ma}
          </text>
        </g>
      ))}
      {[-1, -0.5, 0, 0.5].map((vv) => (
        <text key={vv} x={r1(px(vv))} y={PY1 + 17} textAnchor="middle" fontSize={14} fill="var(--ink-3)">
          {vv === 0 ? "0" : vv.toFixed(1).replace("-", "−")}
        </text>
      ))}
      <line x1={r1(px(0))} y1={PY0} x2={r1(px(0))} y2={PY1} stroke="var(--ink-3)" strokeWidth={1} />
      <polyline points={pts.join(" ")} fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" />
      {!off && <circle cx={r1(px(shownV))} cy={r1(py(i))} r={7} fill="var(--brand)" stroke="var(--surface)" strokeWidth={2} />}
      <text x={PX0 + 4} y={PY0 + 14} fontSize={14} fill="var(--ink-2)">
        mA
      </text>
      <text x={PX1} y={178} textAnchor="end" fontSize={14} fill="var(--ink-2)">
        volts →
      </text>
      {v < VMIN && (
        <text x={PX0 + 4} y={PY1 - 8} fontSize={14} fill="var(--ink)">
          ← {v.toFixed(1).replace("-", "−")} V: still about 0
        </text>
      )}
      {off && (
        <text x={PX1} y={PY0 + 14} textAnchor="end" fontSize={14} fill="var(--ink)">
          {formatSI(i, "A")} ↑ off the chart
        </text>
      )}
    </svg>
  );
}

export function Pn({ props, onChange }: WidgetProps<PnProps>) {
  const [v, setV] = useState(props.v ?? 0);
  const w = depletionUm(v);
  const i = diodeCurrent(v);
  const vbi = builtIn();

  const set = (nv: number) => {
    const x = Math.round(nv * 100) / 100;
    setV(x);
    onChange?.({ v: x, widthUm: depletionUm(x), currentA: diodeCurrent(x) } satisfies PnState);
  };

  const note =
    Math.abs(v) < 0.001
      ? `No battery. Electrons from the n side and holes from the p side met in the middle and cancelled, leaving a ${w.toFixed(2)} µm layer of fixed charged atoms (the depletion region). Its built-in voltage, about ${vbi.toFixed(2)} V here, holds the rest back.`
      : v < 0
        ? `Reverse bias: the battery pulls electrons and holes away from the junction, so the depletion region widens to ${w.toFixed(2)} µm. Only a tiny leakage flows (${formatSI(Math.abs(i), "A")}): the diode blocks.`
        : i < 1e-4
          ? `Forward bias of ${v.toFixed(2)} V narrows the depletion region to ${w.toFixed(2)} µm, but the barrier is still there: only ${formatSI(i, "A")} flows.`
          : `Forward bias of ${v.toFixed(2)} V nearly flattens the barrier. Carriers pour across and ${formatSI(i, "A")} flows. Every extra 60 mV or so multiplies it by ten.`;

  return (
    <div className="w-full" data-widget>
      <Slider label="Battery voltage across the junction (+ on the p side is forward)" value={v} min={props.min ?? -5} max={0.75} step={0.05} onChange={set} format={(x) => `${x > 0 ? "+" : ""}${x.toFixed(2).replace("-", "−")} V`} />
      <div className="mt-3">
        <Junction v={v} w={w} />
      </div>
      {!props.noCurve && <Curve v={v} />}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Depletion width" value={`${w.toFixed(2)} µm`} accent={v < 0} />
        <Readout label="Current" value={formatSI(i, "A")} accent={i > 1e-4} />
      </div>
      <div className="mt-3">
        <Note tone={i > 1e-4 ? "accent" : "plain"}>{note}</Note>
      </div>
      <Toy>
        Ideal model, stated parameters: 10¹⁶ dopants per cm³ on each side, room temperature, Shockley diode I = Is·(e^(V/0.0259) − 1) with Is = 10 fA. No series resistance and no breakdown (a real diode breaks down at some reverse voltage). Near full forward bias the depletion width is drawn as a sliver.
      </Toy>
    </div>
  );
}

/** goal: { minV, maxV, minWidthUm, maxWidthUm, minCurrentA, maxCurrentA } */
export function checkPn(state: unknown, goal: Record<string, unknown>) {
  const s = state as PnState | undefined;
  if (!s) return false;
  const n = (k: string) => (typeof goal[k] === "number" ? (goal[k] as number) : undefined);
  if (n("minV") !== undefined && s.v < n("minV")!) return false;
  if (n("maxV") !== undefined && s.v > n("maxV")!) return false;
  if (n("minWidthUm") !== undefined && s.widthUm < n("minWidthUm")!) return false;
  if (n("maxWidthUm") !== undefined && s.widthUm > n("maxWidthUm")!) return false;
  if (n("minCurrentA") !== undefined && s.currentA < n("minCurrentA")!) return false;
  if (n("maxCurrentA") !== undefined && s.currentA > n("maxCurrentA")!) return false;
  return true;
}
