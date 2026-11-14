"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { SOURCES, depthOfFocus, rayleighCd, source, type SourceId } from "./phys";
import { Note, Readout, Seg, Slider, Toy } from "./ui";

// ───────────────────────────── semi-litho: Rayleigh resolution and multi-patterning ─────────────────────────────

export interface LithoProps {
  source?: SourceId;
  k1?: number;
  /** Offer multi-patterning. */
  split?: boolean;
  /** Only offer these sources. */
  sources?: SourceId[];
}

export interface LithoState {
  source: SourceId;
  k1: number;
  /** 1, 2 or 4 exposures (or spacer steps) per layer. */
  split: number;
  /** Half-pitch of one exposure, nm. */
  single: number;
  /** Half-pitch after splitting, nm. */
  hp: number;
}

const FIELD_NM = 400;
const SX0 = 10;
const SX1 = 350;
const nmPx = (SX1 - SX0) / FIELD_NM;

export function Litho({ props, onChange }: WidgetProps<LithoProps>) {
  const [src, setSrc] = useState<SourceId>(props.source ?? "arfi");
  const [k1, setK1] = useState(props.k1 ?? 0.4);
  const [split, setSplit] = useState(1);
  const s = source(src);
  const single = rayleighCd(k1, s.nm, s.na);
  const hp = single / split;
  const dof = depthOfFocus(s.nm, s.na);

  const report = (a: SourceId, b: number, c: number) => {
    const ss = source(a);
    const one = rayleighCd(b, ss.nm, ss.na);
    onChange?.({ source: a, k1: b, split: c, single: one, hp: one / c } satisfies LithoState);
  };

  const list = props.sources ? SOURCES.filter((x) => props.sources!.includes(x.id)) : SOURCES;
  const pitch = 2 * hp;
  const nLines = Math.min(60, Math.floor(FIELD_NM / pitch));
  const wPx = Math.max(0.8, hp * nmPx);

  return (
    <div className="w-full" data-widget>
      <Seg
        label="Exposure light"
        value={src}
        onChange={(v) => {
          setSrc(v);
          report(v, k1, split);
        }}
        options={list.map((x) => ({ value: x.id, label: x.short }))}
      />
      <div className="mt-3">
        <Slider
          label="k1: how hard the process is pushed (0.25 is the theoretical floor)"
          value={k1}
          min={0.25}
          max={0.6}
          step={0.01}
          onChange={(v) => {
            const x = Math.round(v * 100) / 100;
            setK1(x);
            report(src, x, split);
          }}
          format={(v) => v.toFixed(2)}
        />
      </div>
      {props.split && (
        <div className="mt-2">
          <p className="mb-1 text-xs text-ink-3">Patterning</p>
          <Seg
            label="Patterning"
            value={split}
            onChange={(v) => {
              setSplit(v);
              report(src, k1, v);
            }}
            options={[
              { value: 1, label: "Single exposure" },
              { value: 2, label: "Double (pitch ÷ 2)" },
              { value: 4, label: "Quadruple (pitch ÷ 4)" },
            ]}
          />
        </div>
      )}

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3 text-center font-mono text-[0.95rem] text-ink">
        CD = k1 × λ / NA = {k1.toFixed(2)} × {s.nm} nm / {s.na} = <strong>{single.toFixed(1)} nm</strong>
        {split > 1 && (
          <>
            {" "}
            → ÷ {split} = <strong>{hp.toFixed(1)} nm</strong>
          </>
        )}
      </div>

      <svg viewBox="0 0 360 96" className="mt-3 block h-auto w-full rounded-xl border border-line bg-surface" role="img" aria-label={`Lines and spaces at a half-pitch of ${hp.toFixed(1)} nanometres across a 400 nanometre field.`}>
        {Array.from({ length: nLines }, (_, i) => (
          <rect key={i} x={Math.round((SX0 + i * pitch * nmPx) * 10) / 10} y={10} width={Math.round(wPx * 10) / 10} height={46} fill="var(--brand)" />
        ))}
        <line x1={SX0} y1={74} x2={SX0 + 100 * nmPx} y2={74} stroke="var(--ink)" strokeWidth={2} />
        <line x1={SX0} y1={68} x2={SX0} y2={80} stroke="var(--ink)" strokeWidth={2} />
        <line x1={SX0 + 100 * nmPx} y1={68} x2={SX0 + 100 * nmPx} y2={80} stroke="var(--ink)" strokeWidth={2} />
        <text x={SX0 + 100 * nmPx + 8} y={79} fontSize={14} fill="var(--ink-2)">
          100 nm
        </text>
        <text x={SX1} y={92} textAnchor="end" fontSize={14} fill="var(--ink-3)">
          lines and spaces, to scale
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Wavelength" value={`${s.nm} nm`} />
        <Readout label="NA" value={s.na} />
        <Readout label="Half-pitch" value={`${hp.toFixed(1)} nm`} accent />
        <Readout label="Depth of focus" value={`≈ ${Math.round(dof)} nm`} />
        {props.split && <Readout label="Exposures per layer" value={split} />}
      </div>
      <div className="mt-3">
        <Note tone={split > 1 ? "accent" : "plain"}>
          {split > 1
            ? `Splitting the pattern into ${split} interleaved parts reaches a ${hp.toFixed(1)} nm half-pitch, below what one exposure can print (${single.toFixed(1)} nm). The cost: ${split === 2 ? "about twice" : "several times"} the lithography and etch steps for this layer, and every part must line up with the others to within a few nanometres.`
            : k1 < 0.3
              ? `k1 = ${k1.toFixed(2)} is close to the 0.25 floor: it takes tricks like shaped illumination and corrected masks, and the process window gets very small.`
              : `${s.name}: one exposure prints lines and spaces down to about ${single.toFixed(1)} nm each. Shorter wavelength, a bigger NA or a lower k1 makes it smaller.`}
        </Note>
      </div>
      <Toy>
        Rayleigh&apos;s formula for the smallest half-pitch, CD = k1·λ/NA, with typical NA values for each kind of tool; depth of focus ≈ λ/NA² (k2 = 1). Real resolution also depends on the resist, the pattern and the illumination.
      </Toy>
    </div>
  );
}

/** goal: { source, sources, maxHp, minHp, split, maxSplit } */
export function checkLitho(state: unknown, goal: Record<string, unknown>) {
  const s = state as LithoState | undefined;
  if (!s) return false;
  if (typeof goal.source === "string" && s.source !== goal.source) return false;
  if (Array.isArray(goal.sources) && !goal.sources.includes(s.source)) return false;
  if (typeof goal.maxHp === "number" && s.hp > goal.maxHp) return false;
  if (typeof goal.minHp === "number" && s.hp < goal.minHp) return false;
  if (typeof goal.split === "number" && s.split !== goal.split) return false;
  if (typeof goal.maxSplit === "number" && s.split > goal.maxSplit) return false;
  return true;
}
