"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Plot, Readout, SECOND, Seg, Slider, ToyNote, formatSI } from "./ui";
import { AC_AMPS, AC_FREQS, AC_MAINS_AMPS, AC_PERIODS, rmsFormula, rmsFromSamples, wavePoints, type AcShape } from "./acsim";

export interface AcLabProps {
  /** Starting frequency, Hz (snaps to a slider stop). Default 50. */
  freq?: number;
  /** Starting peak voltage. Default 5. */
  amp?: number;
  shape?: AcShape;
  /** Starting phase of the second signal, degrees. Default 0. */
  phase?: number;
  /** Show the second signal. Default true. */
  second?: boolean;
  /** Add the two mains preset buttons and their peak voltages to the amplitude slider. */
  mains?: boolean;
  /** Lock any of these controls. */
  lock?: ("freq" | "amp" | "shape" | "phase")[];
}

export interface AcLabState {
  freq: number;
  /** peak voltage */
  amp: number;
  shape: AcShape;
  /** phase of signal B relative to A, degrees (positive = B leads) */
  phase: number;
  second: boolean;
  period: number;
  /** peak-to-peak */
  pp: number;
  /** RMS computed from samples */
  rms: number;
  /** RMS from the closed form for this shape */
  rmsFormula: number;
}

const num = (x: number) => String(Number(x.toPrecision(3)));
const nearestIdx = (list: number[], x: number) => list.reduce((best, v, i) => (Math.abs(Math.log(v / x)) < Math.abs(Math.log(list[best] / x)) ? i : best), 0);
const volts = (v: number) => (v >= 100 ? `${v.toFixed(1)} V` : formatSI(v, "V"));

const SHAPES: { value: AcShape; label: string }[] = [
  { value: "sine", label: "Sine" },
  { value: "square", label: "Square" },
  { value: "triangle", label: "Triangle" },
];

function make(freq: number, amp: number, shape: AcShape, phase: number, second: boolean): AcLabState {
  return { freq, amp, shape, phase, second, period: 1 / freq, pp: 2 * amp, rms: rmsFromSamples(shape, amp, freq), rmsFormula: rmsFormula(shape, amp) };
}

/** AC explorer: a wave and a second, phase-shifted wave on a scope, with period, peak, peak-to-peak and RMS readouts. */
export function AcLab({ props, onChange }: WidgetProps<AcLabProps>) {
  const lock = props.lock ?? [];
  const amps = props.mains ? [...AC_AMPS, ...AC_MAINS_AMPS] : AC_AMPS;
  const [fi, setFi] = useState(() => nearestIdx(AC_FREQS, props.freq ?? 50));
  const [ai, setAi] = useState(() => nearestIdx(amps, props.amp ?? 5));
  const [shape, setShape] = useState<AcShape>(props.shape ?? "sine");
  const [phase, setPhase] = useState(props.phase ?? 0);
  const [second, setSecond] = useState(props.second ?? true);

  const freq = AC_FREQS[fi];
  const amp = amps[ai];
  const st = make(freq, amp, shape, phase, second);
  const T = 1 / freq;

  const update = (nfi: number, nai: number, ns: AcShape, nph: number, nsec: boolean) => {
    setFi(nfi);
    setAi(nai);
    setShape(ns);
    setPhase(nph);
    setSecond(nsec);
    onChange?.(make(AC_FREQS[nfi], amps[nai], ns, nph, nsec));
  };

  const ms = (t: number) => num(t * 1000);
  const high = amp >= 100;
  const agree = Math.abs(st.rms - st.rmsFormula) <= 1e-3 * st.rmsFormula;
  const lead = phase === 0 ? "in phase" : phase > 0 ? `B leads A by ${phase}°` : `B lags A by ${-phase}°`;
  const yMax = amp * 1.18;

  return (
    <div data-widget="analog-ac" className="w-full">
      <Plot
        ariaLabel={`A ${shape} wave of ${formatSI(amp, "V")} peak at ${formatSI(freq, "Hz")}, two periods of ${formatSI(T, "s")} each${second ? `, with a second wave: ${lead}` : ""}. Its RMS value is ${num(st.rms)} volts.`}
        height={220}
        x={[0, AC_PERIODS * T]}
        y={[-yMax, yMax]}
        xTicks={[0, 0.5, 1, 1.5, 2].map((k) => ({ value: k * T, label: ms(k * T) }))}
        yTicks={[-amp, 0, amp].map((v) => ({ value: v, label: num(v) }))}
        markers={[
          { y: st.rms, color: "var(--ink-2)", label: "RMS" },
          { y: -st.rms, color: "var(--ink-2)" },
        ]}
        series={[
          ...(second ? [{ points: wavePoints(shape, amp, freq, phase), color: SECOND }] : []),
          { points: wavePoints(shape, amp, freq, 0) },
        ]}
        xLabel="time (ms)"
        yLabel="volts"
      />
      <p className="mt-1 text-center text-xs text-ink-3">
        <span className="font-semibold text-ink-2">Signal A</span> in the accent colour{second ? (
          <>
            , <span className="font-semibold" style={{ color: SECOND }}>signal B</span> in orange
          </>
        ) : null}. Dashed lines: ±RMS.
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Caption>Wave</Caption>
        {lock.includes("shape") ? <Readout label="shape" value={shape} /> : <Seg label="Waveform shape" value={shape} options={SHAPES} onChange={(v) => update(fi, ai, v, phase, second)} />}
        <Btn on={second} onClick={() => update(fi, ai, shape, phase, !second)}>
          {second ? "Second signal on" : "Second signal off"}
        </Btn>
      </div>
      {props.mains && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Caption>Presets</Caption>
          <Btn onClick={() => update(AC_FREQS.indexOf(50), amps.indexOf(325.3), shape, phase, second)}>230 V, 50 Hz mains</Btn>
          <Btn onClick={() => update(AC_FREQS.indexOf(60), amps.indexOf(169.7), shape, phase, second)}>120 V, 60 Hz mains</Btn>
          <Btn onClick={() => update(AC_FREQS.indexOf(1000), amps.indexOf(1), shape, phase, second)}>1 kHz audio test tone</Btn>
        </div>
      )}
      {high && <p className="mt-1 text-xs font-semibold text-bad">Mains-level voltage can kill. This is only a picture: never experiment with mains. All our circuits use low-voltage signals.</p>}

      <div className="mt-2 grid gap-x-4 sm:grid-cols-2">
        <Slider label="Frequency" value={fi} min={0} max={AC_FREQS.length - 1} disabled={lock.includes("freq")} format={(k) => formatSI(AC_FREQS[k], "Hz")} onChange={(k) => update(k, ai, shape, phase, second)} />
        <Slider label="Amplitude (peak voltage)" value={ai} min={0} max={amps.length - 1} disabled={lock.includes("amp")} format={(k) => `${amps[k]} V`} onChange={(k) => update(fi, k, shape, phase, second)} />
        {second && (
          <Slider
            className="sm:col-span-2"
            label="Phase of signal B (positive = B leads A)"
            value={phase}
            min={-180}
            max={180}
            step={15}
            disabled={lock.includes("phase")}
            format={(v) => `${v}°`}
            onChange={(v) => update(fi, ai, shape, v, second)}
          />
        )}
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Readout label="Period T = 1 ÷ f" value={formatSI(T, "s")} accent />
        <Readout label="Peak" value={volts(amp)} />
        <Readout label="Peak-to-peak" value={volts(2 * amp)} />
        <Readout label="RMS (from samples)" value={volts(st.rms)} accent />
        <Readout label={`RMS (${shape === "sine" ? "peak ÷ √2" : shape === "square" ? "= peak" : "peak ÷ √3"})`} value={`${volts(st.rmsFormula)}${agree ? " ✓" : ""}`} />
        {second && <Readout label="Phase" value={lead} />}
      </div>
      <p className="mt-2 text-center text-xs text-ink-3">
        RMS is the steady DC voltage that would heat a resistor equally. The √2 rule belongs to the <strong>sine</strong> only: a square wave&apos;s RMS equals its peak and a triangle&apos;s is peak ÷ √3.
      </p>

      <div className="mt-3">
        <ToyNote>Toy model: perfect mathematical waves with no distortion, no noise and no DC offset. Real mains is within a few percent of its nominal voltage and frequency.</ToyNote>
      </div>
    </div>
  );
}

/**
 * goal: { period, tol } (seconds, relative tolerance tol default 0.02), { freq }, { amp }, { phase }, { shape },
 * { second } , { rms, tol } (volts, relative tolerance default 0.02).
 */
export function checkAcLab(state: unknown, goal: Record<string, unknown>) {
  const s = state as AcLabState | undefined;
  if (!s) return false;
  const tol = typeof goal.tol === "number" ? goal.tol : 0.02;
  const near = (got: number, want: number) => Math.abs(got - want) <= tol * Math.abs(want);
  if (typeof goal.period === "number" && !near(s.period, goal.period)) return false;
  if (typeof goal.freq === "number" && !near(s.freq, goal.freq)) return false;
  if (typeof goal.amp === "number" && !near(s.amp, goal.amp)) return false;
  if (typeof goal.rms === "number" && !near(s.rms, goal.rms)) return false;
  if (typeof goal.phase === "number" && s.phase !== goal.phase) return false;
  if (typeof goal.shape === "string" && s.shape !== goal.shape) return false;
  if (typeof goal.second === "boolean" && s.second !== goal.second) return false;
  return true;
}
