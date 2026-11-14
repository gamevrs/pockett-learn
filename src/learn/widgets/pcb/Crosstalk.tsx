"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { XT_MAX_PCT, XT_SAT_CM, XT_W_OVER_H, crosstalkPct, threeW } from "./si";
import { Caption, Meter, Note, ORANGE, Readout, Seg, Slider, ToyNote } from "./ui";

// ───────────────────────────── pcb-crosstalk: two traces side by side ─────────────────────────────

export interface CrosstalkProps {
  spacingH?: number;
  lengthCm?: number;
  plane?: boolean;
}

export interface CrosstalkState {
  /** Gap between the traces in multiples of the height above the plane, h. */
  spacingH: number;
  lengthCm: number;
  plane: boolean;
  /** Toy noise on the quiet trace, percent of the aggressor swing. */
  noisePct: number;
}

const PLANE_OPTS = [
  { value: "yes", label: "Plane under both" },
  { value: "no", label: "No nearby plane" },
];

export function Crosstalk({ props, onChange }: WidgetProps<CrosstalkProps>) {
  const [spacing, setSpacing] = useState(props.spacingH ?? 1);
  const [len, setLen] = useState(props.lengthCm ?? 20);
  const [plane, setPlane] = useState(props.plane ?? true);
  const noise = crosstalkPct(spacing, len, plane);
  const w3 = threeW(spacing);

  const report = (s: number, l: number, p: boolean) => {
    onChange?.({ spacingH: s, lengthCm: l, plane: p, noisePct: Math.round(crosstalkPct(s, l, p) * 10) / 10 } satisfies CrosstalkState);
  };

  // drawing (top view): 1 h = 8 px, trace width 1.5 h = 12 px
  const U = 8;
  const tw = XT_W_OVER_H * U;
  const x0 = 24;
  const x1 = x0 + 6 + (len / 30) * 300;
  const yA = 44;
  const yV = yA + tw + spacing * U;
  const planeBottom = 128;
  const tone = noise < 3 ? "brand" : noise < 8 ? "warn" : "bad";
  const bump = Math.min(30, (noise / XT_MAX_PCT) * 30 * 1.6);

  return (
    <div className="w-full">
      <div className="flex justify-center">
        <Seg
          label="Ground plane"
          value={plane ? "yes" : "no"}
          onChange={(v) => {
            const p = v === "yes";
            setPlane(p);
            report(spacing, len, p);
          }}
          options={PLANE_OPTS}
        />
      </div>
      <div className="mt-2 grid gap-1 sm:grid-cols-2 sm:gap-4">
        <Slider
          label="Gap between the traces"
          value={spacing}
          min={1}
          max={5}
          step={0.5}
          onChange={(v) => {
            setSpacing(v);
            report(v, len, plane);
          }}
          format={(v) => `${v} h`}
        />
        <Slider
          label="Length side by side"
          value={len}
          min={1}
          max={30}
          step={1}
          onChange={(v) => {
            setLen(v);
            report(spacing, v, plane);
          }}
          format={(v) => `${v} cm`}
        />
      </div>

      <svg viewBox="0 0 360 214" className="mt-3 w-full rounded-xl border border-line bg-surface" role="img" aria-label={`Two parallel traces ${spacing} h apart, ${len} centimetres long, ${plane ? "over a ground plane" : "with no nearby plane"}. Noise on the quiet trace about ${noise.toFixed(1)} percent of the aggressor swing, toy scale.`}>
        {plane ? <rect x={10} y={yA - 18} width={340} height={planeBottom - yA + 18} rx={4} fill="color-mix(in srgb, var(--ink-3) 22%, transparent)" /> : <rect x={10} y={yA - 18} width={340} height={planeBottom - yA + 18} rx={4} fill="none" stroke="var(--line-strong)" strokeDasharray="4 3" />}
        <rect x={x0} y={yA} width={x1 - x0} height={tw} rx={2} fill="var(--brand)" />
        <rect x={x0} y={yV} width={x1 - x0} height={tw} rx={2} fill={ORANGE} />
        <text x={14} y={planeBottom + 18} fontSize={14} fill="var(--ink-2)">
          {plane ? "ground plane under both" : "no plane nearby"}
        </text>
        {/* what each trace carries */}
        <text x={14} y={planeBottom + 44} fontSize={14} fill="var(--ink)">
          Aggressor
        </text>
        <path d={`M110 ${planeBottom + 44} H190 V${planeBottom + 26} H350`} fill="none" stroke="var(--brand)" strokeWidth={2.5} strokeLinejoin="round" />
        <text x={14} y={planeBottom + 78} fontSize={14} fill="var(--ink)">
          Victim
        </text>
        <path d={`M110 ${planeBottom + 78} H190 L196 ${planeBottom + 78 - bump} L212 ${planeBottom + 78} H350`} fill="none" stroke={ORANGE} strokeWidth={2.5} strokeLinejoin="round" />
      </svg>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <Caption className="mb-1.5">Noise on the quiet trace (toy scale)</Caption>
        <Meter frac={noise / XT_MAX_PCT} tone={tone} label={`Noise ${noise.toFixed(1)} percent of the aggressor swing`} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Noise" value={`${noise.toFixed(1)}%`} accent />
        <Readout label="Centre to centre" value={`${(w3.centreH / XT_W_OVER_H).toFixed(1)} W`} />
        <Readout label="3W rule" value={w3.ok ? "met" : "not met"} />
      </div>
      <div className="mt-3">
        <Note>
          {plane ? (
            <>
              With a plane close below, most field lines end on the plane instead of the neighbour, and the coupling falls off fast as the gap grows (roughly 1 / (1 + (gap/h)²)). Going from 1 h to 3 h takes the toy noise from about {crosstalkPct(1, len, true).toFixed(0)}% to {crosstalkPct(3, len, true).toFixed(0)}%.
            </>
          ) : (
            <>Without a plane close by, the fields spread out and reach the neighbour from much further away, so moving the traces apart helps far less (and there is no tight return path either).</>
          )}{" "}
          A longer run couples more, up to about {XT_SAT_CM} cm for a 1 ns edge, then it stops growing.
        </Note>
      </div>
      <ToyNote>
        Toy scale, not a field solver: noise ≈ {XT_MAX_PCT}% × 1/(1 + (gap/h)²) × (1 − e^(−length/{XT_SAT_CM} cm)), a commonly quoted shape for near-end coupling over a plane. h is the trace-to-plane height, and the traces are 1.5 h wide. 3W rule: centre-to-centre spacing of at least 3× the trace width, a rule of thumb.
      </ToyNote>
    </div>
  );
}

/** goal: { maxNoisePct, minSpacingH, minLengthCm, plane } */
export function checkCrosstalk(state: unknown, goal: Record<string, unknown>) {
  const s = state as CrosstalkState | undefined;
  if (!s) return false;
  if (typeof goal.maxNoisePct === "number" && s.noisePct > goal.maxNoisePct) return false;
  if (typeof goal.minSpacingH === "number" && s.spacingH < goal.minSpacingH) return false;
  if (typeof goal.minLengthCm === "number" && s.lengthCm < goal.minLengthCm) return false;
  if (typeof goal.plane === "boolean" && s.plane !== goal.plane) return false;
  return true;
}
