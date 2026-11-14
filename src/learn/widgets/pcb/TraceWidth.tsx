"use client";

import { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { areaMil2, milToMm, MIL_PER_OZ, riseForWidth, traceResistance, traceWidthMil } from "./board";
import { BLUE, Caption, Note, ORANGE, Readout, Seg, Slider, ToyNote } from "./ui";

export interface TraceWidthProps {
  /** "calc": the width a current needs. "check": also a width slider that shows the temperature rise it gives. */
  mode?: "calc" | "check";
  current?: number;
  rise?: number;
  oz?: 0.5 | 1 | 2;
  external?: boolean;
  /** Starting width (mil) of the "your trace" slider in check mode. */
  myWidth?: number;
}

export interface TraceWidthState {
  current: number;
  rise: number;
  oz: number;
  external: boolean;
  widthMil: number;
  widthMm: number;
  areaMil2: number;
  myWidthMil?: number;
  myRise?: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

function build(current: number, rise: number, oz: number, external: boolean, my: number | undefined): TraceWidthState {
  const widthMil = traceWidthMil(current, rise, oz, external);
  const s: TraceWidthState = {
    current,
    rise,
    oz,
    external,
    widthMil: r3(widthMil),
    widthMm: r3(milToMm(widthMil)),
    areaMil2: r3(areaMil2(current, rise, external)),
  };
  if (my !== undefined) {
    s.myWidthMil = my;
    s.myRise = r1(riseForWidth(current, my, oz, external));
  }
  return s;
}

const NICE = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20];
const fmtMm = (mm: number) => (mm < 1 ? mm.toFixed(2) : mm < 10 ? mm.toFixed(1) : mm.toFixed(0));
const fmtMil = (mil: number) => (mil < 10 ? mil.toFixed(1) : mil.toFixed(0));

export function TraceWidth({ props, onChange, revealed }: WidgetProps<TraceWidthProps>) {
  const check = props.mode === "check";
  const [current, setCurrent] = useState(props.current ?? 1);
  const [rise, setRise] = useState(props.rise ?? 20);
  const [oz, setOz] = useState<number>(props.oz ?? 1);
  const [external, setExternal] = useState(props.external ?? true);
  const [my, setMy] = useState(props.myWidth ?? 20);
  const locked = Boolean(revealed);

  const report = (c: number, t: number, z: number, e: boolean, m: number) => onChange?.(build(c, t, z, e, check ? m : undefined));
  const s = build(current, rise, oz, external, check ? my : undefined);

  const reqMm = milToMm(traceWidthMil(current, rise, oz, external));
  const myMm = milToMm(my);
  const biggest = Math.max(reqMm, check ? myMm : 0, 0.05);
  const k = Math.min(24, 84 / biggest); // px per mm in the drawing
  const bar = [...NICE].reverse().find((n) => n * k <= 120) ?? NICE[0];
  const reqH = Math.max(reqMm * k, 1.5);
  const myH = Math.max(myMm * k, 1.5);
  const cy = 52;

  const myRise = s.myRise ?? 0;
  const ok = check && myRise <= rise;
  const tiny = s.widthMil < 6;
  const k1 = external ? "0.048" : "0.024";
  const thick = oz * MIL_PER_OZ;
  const resPer10cm = traceResistance(100, s.widthMil, oz);

  return (
    <div className="w-full">
      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        <Slider label="Current" value={current} min={0.1} max={10} step={0.1} onChange={(v) => { setCurrent(v); report(v, rise, oz, external, my); }} disabled={locked} format={(v) => `${v.toFixed(1)} A`} />
        <Slider label="Allowed temperature rise ΔT" value={rise} min={5} max={60} step={1} onChange={(v) => { setRise(v); report(current, v, oz, external, my); }} disabled={locked} format={(v) => `${v} °C`} />
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
        <div>
          <Caption className="mb-1">Copper weight</Caption>
          <Seg label="Copper weight" value={oz} options={[{ value: 0.5, label: "0.5 oz" }, { value: 1, label: "1 oz" }, { value: 2, label: "2 oz" }]} onChange={(v) => { if (locked) return; setOz(v); report(current, rise, v, external, my); }} />
        </div>
        <div>
          <Caption className="mb-1">Layer</Caption>
          <Seg label="Layer" value={external ? "ext" : "int"} options={[{ value: "ext", label: "External" }, { value: "int", label: "Internal" }]} onChange={(v) => { if (locked) return; setExternal(v === "ext"); report(current, rise, oz, v === "ext", my); }} />
        </div>
      </div>
      {check && (
        <div className="mt-2">
          <Slider label="Your trace width" value={my} min={2} max={400} step={1} onChange={(v) => { setMy(v); report(current, rise, oz, external, v); }} disabled={locked} format={(v) => `${v} mil (${fmtMm(milToMm(v))} mm)`} />
        </div>
      )}

      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <svg viewBox="0 0 300 132" className="block w-full" role="img" aria-label={`Top view of a trace. The width needed for ${current.toFixed(1)} amps is ${fmtMil(s.widthMil)} mil, ${fmtMm(reqMm)} millimetres.${check ? ` Your trace is ${my} mil wide.` : ""}`}>
          <rect x={2} y={4} width={296} height={98} rx={6} fill="var(--surface-2)" />
          {check && <rect x={16} y={cy - myH / 2} width={268} height={myH} fill={BLUE} fillOpacity={0.3} stroke={BLUE} strokeWidth={1.5} />}
          <rect x={16} y={cy - reqH / 2} width={268} height={reqH} fill={ORANGE} fillOpacity={check ? 0.55 : 0.9} stroke={check ? "var(--ink)" : "none"} strokeWidth={check ? 1 : 0} strokeDasharray={check ? "5 3" : undefined} />
          <g fill="var(--ink-2)" fontSize={14}>
            <text x={20} y={20}>{check ? "orange = needed, blue = yours" : `needed: ${fmtMil(s.widthMil)} mil = ${fmtMm(reqMm)} mm`}</text>
          </g>
          <line x1={16} y1={114} x2={16 + bar * k} y2={114} stroke="var(--ink)" strokeWidth={2} />
          <line x1={16} y1={109} x2={16} y2={119} stroke="var(--ink)" strokeWidth={2} />
          <line x1={16 + bar * k} y1={109} x2={16 + bar * k} y2={119} stroke="var(--ink)" strokeWidth={2} />
          <text x={24 + bar * k} y={120} fill="var(--ink-2)" fontSize={14}>{bar} mm</text>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Area A" value={`${s.areaMil2.toFixed(1)} mil²`} />
        <Readout label="Width" value={`${fmtMil(s.widthMil)} mil · ${fmtMm(reqMm)} mm`} accent />
        {check && <Readout label="Your rise" value={myRise > 300 ? "> 300 °C" : `${myRise.toFixed(1)} °C`} accent={ok} />}
      </div>

      {check && (
        <div className="mt-3">
          <Note tone={ok ? "accent" : "plain"}>
            {ok ? (
              <>Your {my} mil trace stays within the {rise} °C limit at {current.toFixed(1)} A: it needs only {fmtMil(s.widthMil)} mil.</>
            ) : (
              <>At {current.toFixed(1)} A your {my} mil trace would rise about <b>{myRise > 300 ? "far more than 300" : myRise.toFixed(0)} °C</b>, above your {rise} °C limit. Widen it to at least {fmtMil(s.widthMil)} mil.</>
            )}
          </Note>
        </div>
      )}
      {tiny && (
        <p className="mt-2 text-[0.82rem] leading-snug text-ink-2">
          Thermally that is tiny. In practice the fab&apos;s minimum width decides (typical: 6 mil / 0.15 mm for a cheap service), and you go wider anyway for robustness.
        </p>
      )}

      <div className="mt-3 rounded-xl border border-line bg-surface p-3 text-[0.85rem] leading-relaxed text-ink-2">
        <p className="font-mono text-[0.82rem] text-ink">I = k · ΔT<sup>0.44</sup> · A<sup>0.725</sup></p>
        <p className="mt-1">
          k = {k1} ({external ? "external layer" : "internal layer"}), A in mil², ΔT in °C, I in A. So A = (I / (k · ΔT<sup>0.44</sup>))<sup>1/0.725</sup> = <b className="font-mono text-ink">{s.areaMil2.toFixed(1)} mil²</b>, and width = A / thickness = {s.areaMil2.toFixed(1)} / ({oz} oz × 1.378 mil = {thick.toFixed(2)} mil) = <b className="font-mono text-ink">{fmtMil(s.widthMil)} mil</b>. DC resistance of 10 cm of it: about {resPer10cm < 1 ? `${(resPer10cm * 1000).toFixed(0)} mΩ` : `${resPer10cm.toFixed(2)} Ω`} (copper at 20 °C).
        </p>
      </div>
      <div className="mt-2">
        <Note>
          IPC-2221 curves date from the 1950s and are simplified; IPC-2152 is the modern reference and gives different numbers (it accounts for board material, planes nearby and thickness). Real designs add margin, and online calculators often use this same formula.
        </Note>
      </div>
      <ToyNote>Simplified: steady DC current, one trace in still air, no nearby copper. The curves are fitted for roughly up to 35 A, 0.5 to 3 oz.</ToyNote>
    </div>
  );
}

/** goal: { current, external, oz, minRise, maxRise, rise, maxWidthMil, minCurrent, myOk, maxMyRise } */
export function checkTraceWidth(state: unknown, goal: Record<string, unknown>) {
  const s = state as TraceWidthState | undefined;
  if (!s) return false;
  const num = (k: string) => (typeof goal[k] === "number" ? (goal[k] as number) : undefined);
  const c = num("current");
  if (c !== undefined && Math.abs(s.current - c) > 0.05) return false;
  const rise = num("rise");
  if (rise !== undefined && Math.abs(s.rise - rise) > 0.5) return false;
  if (typeof goal.external === "boolean" && s.external !== goal.external) return false;
  const oz = num("oz");
  if (oz !== undefined && s.oz !== oz) return false;
  const minRise = num("minRise");
  if (minRise !== undefined && s.rise < minRise) return false;
  const maxRise = num("maxRise");
  if (maxRise !== undefined && s.rise > maxRise) return false;
  const maxW = num("maxWidthMil");
  if (maxW !== undefined && s.widthMil > maxW) return false;
  const minC = num("minCurrent");
  if (minC !== undefined && s.current < minC) return false;
  const maxMy = num("maxMyRise");
  if (maxMy !== undefined && (s.myRise === undefined || s.myRise > maxMy)) return false;
  if (goal.myOk === true && (s.myRise === undefined || s.myRise > s.rise)) return false;
  return true;
}
