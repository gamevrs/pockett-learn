"use client";

import React, { useMemo, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import {
  Btn,
  Note,
  Plot,
  Readout,
  SECOND,
  Seg,
  Slider,
  ToyNote,
  formatSI,
} from "./ui";
import {
  adcView,
  aliasFreq,
  idealSnr,
  isAliased,
  levels,
  lsb as lsbOf,
} from "./adcsim";

export interface AdcSamplerProps {
  /** Starting input frequency, Hz. Default 1000. */
  f?: number;
  /** Starting sample rate, Hz. Default 8000. */
  fs?: number;
  bits?: number;
  vref?: number;
  /** Show the ideal anti-alias filter switch. */
  filter?: boolean;
  /** Hide the bits control (fix the resolution). */
  lockBits?: boolean;
  /** Hide the Vref control. */
  lockVref?: boolean;
}

export interface AdcSamplerState {
  f: number;
  fs: number;
  bits: number;
  vref: number;
  aliased: boolean;
  /** the frequency the ADC output appears to have, Hz (f when there is no aliasing) */
  aliasF: number;
  /** one step of the converter, V */
  lsb: number;
  filter: boolean;
}

// Layout shared with Plot (same viewBox and margins) so the dot overlay lines up.
const W = 360;
const H = 220;
const L = 44;
const R = 10;
const T = 10;
const B = 34;

const hz = (v: number) => formatSI(v, "Hz");

/** Sampler: a sine, its samples, the quantised staircase, and the frequency the ADC output seems to have. */
export function AdcSampler({
  props,
  onChange,
  status,
  goal,
}: WidgetProps<AdcSamplerProps>) {
  const [f, setF] = useState(props.f ?? 1000);
  const [fs, setFs] = useState(props.fs ?? 8000);
  const [bits, setBits] = useState(props.bits ?? 8);
  const [vref, setVref] = useState(props.vref ?? 3.3);
  const [filter, setFilter] = useState(false);

  const view = useMemo(
    () => adcView({ f, fs, bits, vref }, 4, filter),
    [f, fs, bits, vref, filter],
  );
  const alias = isAliased(f, fs);
  const dropped = filter && alias;
  const aliasedNow = alias && !filter;
  const fa = aliasFreq(f, fs);
  const step = lsbOf(vref, bits);
  const atEdge = Math.abs(f - fs / 2) < 1e-9;

  const report = (
    n: Partial<{
      f: number;
      fs: number;
      bits: number;
      vref: number;
      filter: boolean;
    }>,
  ) => {
    const m = { f, fs, bits, vref, filter, ...n };
    const a = isAliased(m.f, m.fs) && !m.filter;
    onChange?.({
      f: m.f,
      fs: m.fs,
      bits: m.bits,
      vref: m.vref,
      aliased: a,
      aliasF: a ? aliasFreq(m.f, m.fs) : m.f,
      lsb: lsbOf(m.vref, m.bits),
      filter: m.filter,
    } satisfies AdcSamplerState);
  };

  const pw = W - L - R;
  const ph = H - T - B;
  const y0 = -0.05 * vref;
  const y1 = 1.05 * vref;
  const px = (t: number) => L + (t / view.W) * pw;
  const py = (v: number) => T + ph - ((v - y0) / (y1 - y0)) * ph;
  const showDots = view.samples.length <= 200;

  let solution: string | null = null;
  if (status === "revealed" && goal) {
    if (goal.aliased === true)
      solution =
        "One answer: input 3 kHz with a 4 kHz sample rate. The ADC reports |3000 − 4000| = 1000 Hz.";
    else if (typeof goal.lsbMax === "number") {
      const n = Math.ceil(Math.log2(vref / goal.lsbMax) - 1e-9);
      solution = `One answer: ${n} bits. With Vref = ${vref} V that gives a step of ${formatSI(lsbOf(vref, n), "V")}.`;
    } else if (goal.aliased === false)
      solution =
        "One answer: raise the sample rate until it is more than twice the input frequency (or turn on the anti-alias filter).";
  }

  const note = dropped
    ? `The anti-alias filter removes the ${hz(f)} tone before it reaches the sampler: nothing left to alias. (An ideal brick-wall filter; a real RC filter only fades it.)`
    : aliasedNow
      ? `Aliasing! ${hz(f)} is above half the sample rate (${hz(fs / 2)}). The samples are exactly what a ${hz(fa)} sine would give, so the ADC reports ${hz(fa)}.`
      : atEdge
        ? `Right at the limit: ${hz(f)} is exactly fs/2. Nyquist needs fs strictly more than 2f. Here the samples can land on the zero crossings, so the tone can vanish.`
        : `No aliasing: ${hz(fs)} is more than twice ${hz(f)}, so the samples pin down the sine.`;

  return (
    <div data-widget="analog-adc" className="w-full">
      <div className="relative mx-auto w-full max-w-[480px]">
        <Plot
          height={H}
          x={[0, view.W]}
          y={[y0, y1]}
          yTicks={[0, vref / 2, vref].map((v) => ({
            value: v,
            label: `${Math.round(v * 100) / 100}`,
          }))}
          series={[
            { points: view.cont, color: SECOND },
            { points: view.stair },
            ...(aliasedNow
              ? [{ points: view.alias, color: "var(--ink)", dashed: true }]
              : []),
          ]}
          xLabel="time: 4 periods of the input"
          ariaLabel={`A ${hz(f)} sine sampled at ${hz(fs)} with ${bits} bits and a ${vref} volt reference. ${aliasedNow ? `It aliases and appears as ${hz(fa)}.` : "No aliasing."}`}
        />
        {showDots && (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            className="pointer-events-none absolute left-0 top-0"
            aria-hidden
            style={{ height: "100%" }}
          >
            {view.samples.map((s, i) => (
              <circle
                key={i}
                cx={px(s.t)}
                cy={py(s.q)}
                r={3.4}
                fill="var(--brand)"
                stroke="var(--surface)"
                strokeWidth={1.2}
              />
            ))}
          </svg>
        )}
      </div>
      <p className="mt-1 text-center text-xs text-ink-3">
        Vertical axis: volts.{" "}
        <span style={{ color: SECOND }} aria-hidden>
          ●
        </span>{" "}
        The real signal · dots and steps: what the ADC outputs
        {aliasedNow ? " · dashed: the false sine it looks like" : ""}
        {!showDots ? " · (dots hidden: too many samples)" : ""}
      </p>

      <div className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
        <Slider
          label="Input frequency f"
          value={f}
          min={100}
          max={5000}
          step={100}
          format={hz}
          onChange={(v) => {
            setF(v);
            report({ f: v });
          }}
        />
        <Slider
          label="Sample rate fs"
          value={fs}
          min={500}
          max={20000}
          step={500}
          format={hz}
          onChange={(v) => {
            setFs(v);
            report({ fs: v });
          }}
        />
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        {!props.lockBits && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-ink-3">Resolution</span>
            <Seg
              label="Bits"
              value={bits}
              options={[1, 2, 3, 4, 6, 8, 10, 12].map((b) => ({
                value: b,
                label: `${b}`,
              }))}
              onChange={(v) => {
                setBits(v);
                report({ bits: v });
              }}
            />
          </div>
        )}
        {!props.lockVref && (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-ink-3">Reference Vref</span>
            <Seg
              label="Reference voltage"
              value={vref}
              options={[1, 3.3, 5].map((v) => ({ value: v, label: `${v} V` }))}
              onChange={(v) => {
                setVref(v);
                report({ vref: v });
              }}
            />
          </div>
        )}
        {props.filter && (
          <Btn
            on={filter}
            onClick={() => {
              setFilter(!filter);
              report({ filter: !filter });
            }}
          >
            Anti-alias filter
          </Btn>
        )}
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="LSB (one step)" value={formatSI(step, "V")} accent />
        <Readout label="Levels" value={levels(bits).toLocaleString("en-US")} />
        <Readout label="Nyquist fs/2" value={hz(fs / 2)} />
        <Readout
          label="ADC sees"
          value={
            dropped
              ? "nothing (filtered)"
              : aliasedNow
                ? `${hz(fa)} (false!)`
                : hz(f)
          }
        />
        <Readout label="Ideal SNR" value={`${idealSnr(bits).toFixed(1)} dB`} />
      </div>
      <div className="mt-3">
        <Note tone={aliasedNow ? "plain" : "accent"}>{note}</Note>
      </div>
      {solution && (
        <div className="mt-2">
          <Note tone="accent">{solution}</Note>
        </div>
      )}
      <div className="mt-3">
        <ToyNote>
          Ideal converter: perfect sample times, a full-scale sine (Vref/2
          amplitude on a Vref/2 offset), only quantisation error, rounding down
          then plotting the middle of each step. SNR = 6.02 n + 1.76 dB assumes
          exactly that.
        </ToyNote>
      </div>
    </div>
  );
}

/** goal: { aliased, aliasF (+ tol, default 1 Hz), bits, bitsMin, lsbMax, fsMin, fsMax, fMin, fMax, filter }. */
export function checkAdc(state: unknown, goal: Record<string, unknown>) {
  const s = state as AdcSamplerState | undefined;
  if (!s) return false;
  if (typeof goal.aliased === "boolean" && s.aliased !== goal.aliased)
    return false;
  if (typeof goal.aliasF === "number") {
    const tol = typeof goal.tol === "number" ? goal.tol : 1;
    if (!(Math.abs(s.aliasF - goal.aliasF) <= tol)) return false;
  }
  if (typeof goal.bits === "number" && s.bits !== goal.bits) return false;
  if (typeof goal.bitsMin === "number" && s.bits < goal.bitsMin) return false;
  if (typeof goal.lsbMax === "number" && s.lsb > goal.lsbMax) return false;
  if (typeof goal.fsMin === "number" && s.fs < goal.fsMin) return false;
  if (typeof goal.fsMax === "number" && s.fs > goal.fsMax) return false;
  if (typeof goal.fMin === "number" && s.f < goal.fMin) return false;
  if (typeof goal.fMax === "number" && s.f > goal.fMax) return false;
  if (typeof goal.filter === "boolean" && s.filter !== goal.filter)
    return false;
  if (typeof goal.vref === "number" && s.vref !== goal.vref) return false;
  return true;
}
