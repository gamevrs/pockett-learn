"use client";

import React, { useMemo, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import {
  Note,
  Plot,
  Readout,
  SECOND,
  Seg,
  Slider,
  ToyNote,
  formatSI,
} from "./ui";
import { VSAT, ampAnalyse, ampWave, gainDb, type Clipping } from "./ampsim";

export interface AmpStageProps {
  /** Starting supply, V (5, 9 or 12). Default 9. */
  vcc?: number;
  /** Starting gain (1 to 50). Default 10. */
  gain?: number;
  /** Starting bias as a percent of the supply (10 to 90). Default 50. */
  biasPct?: number;
  /** Starting input amplitude, mV (5 to 200). Default 50. */
  vinMv?: number;
}

export interface AmpStageState {
  gain: number;
  /** quiescent output as a fraction of the supply */
  bias: number;
  /** input peak amplitude, V */
  vinAmp: number;
  clipping: Clipping;
  vcc: number;
  vpp: number;
}

/** The input is drawn this many times larger, centred on the middle of the supply, so its shape can be compared. */
const INPUT_ZOOM = 10;

const clipText: Record<Clipping, string> = {
  none: "none",
  top: "top (cut off)",
  bottom: "bottom (saturated)",
  both: "both sides",
};

/** Behavioural single-stage amplifier: bias, gain, input size, clipping. Not a transistor simulation. */
export function AmpStage({
  props,
  onChange,
  status,
  goal,
}: WidgetProps<AmpStageProps>) {
  const [vcc, setVcc] = useState(props.vcc ?? 9);
  const [gain, setGain] = useState(props.gain ?? 10);
  const [biasPct, setBiasPct] = useState(props.biasPct ?? 50);
  const [vinMv, setVinMv] = useState(props.vinMv ?? 50);

  const params = { vcc, bias: biasPct / 100, gain, vinAmp: vinMv / 1000 };
  const res = useMemo(() => ampAnalyse(params), [vcc, biasPct, gain, vinMv]); // eslint-disable-line react-hooks/exhaustive-deps
  const wave = useMemo(() => ampWave(params), [vcc, biasPct, gain, vinMv]); // eslint-disable-line react-hooks/exhaustive-deps

  const report = (v: number, g: number, b: number, mv: number) => {
    const p = { vcc: v, bias: b / 100, gain: g, vinAmp: mv / 1000 };
    const r = ampAnalyse(p);
    onChange?.({
      gain: g,
      bias: p.bias,
      vinAmp: p.vinAmp,
      clipping: r.clipping,
      vcc: v,
      vpp: r.vpp,
    } satisfies AmpStageState);
  };

  const mid = vcc / 2;
  const inputDrawn = wave.vin.map(
    ([t, v]) => [t, mid + INPUT_ZOOM * v] as [number, number],
  );
  const q = res.q;

  let solution: string | null = null;
  if (status === "revealed" && goal) {
    if (goal.clipping === "none") {
      const g =
        typeof goal.gainMin === "number" ? Math.max(goal.gainMin, 1) : 20;
      solution = `One answer: bias 50%, gain ${g}, input at most ${Math.floor(((vcc / 2 - VSAT) / g) * 1000)} mV. The swing stays between the floor and the supply.`;
    } else if (goal.clipping === "bottom") {
      solution =
        "One answer: lower the bias to about 20% (the output rests close to the floor), so the bottom runs out of room first.";
    } else if (goal.clipping === "top") {
      solution =
        "One answer: raise the bias to about 80%, so the top runs out of room first.";
    }
  }

  return (
    <div data-widget="analog-amp" className="w-full">
      <div className="mx-auto w-full max-w-[480px]">
        <Plot
          height={210}
          x={[0, 2]}
          y={[0, vcc * 1.12]}
          yTicks={[0, vcc / 2, vcc].map((v) => ({ value: v, label: `${v}` }))}
          markers={[
            { y: vcc, label: "supply (top rail)", color: "var(--ink-3)" },
            { y: VSAT, label: "floor ≈ 0.2 V", color: "var(--ink-3)" },
            { y: q, color: "var(--ink-3)" },
          ]}
          series={[
            { points: wave.ideal, color: "var(--ink-3)", dashed: true },
            { points: inputDrawn, color: SECOND },
            { points: wave.out },
          ]}
          xLabel="time (two cycles)"
          ariaLabel={`Amplifier output over two cycles. Gain ${gain}, bias ${biasPct} percent of a ${vcc} volt supply, input ${vinMv} millivolts peak. Clipping: ${clipText[res.clipping]}.`}
        />
      </div>
      <p className="mt-1 text-center text-xs text-ink-3">
        Vertical axis: volts.{" "}
        <span style={{ color: SECOND }} aria-hidden>
          ●
        </span>{" "}
        Input, drawn ×{INPUT_ZOOM} around mid-supply (shape only) · solid:
        output · dashed: output with unlimited headroom
      </p>

      <div className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
        <Slider
          label="Input amplitude (peak)"
          value={vinMv}
          min={5}
          max={200}
          step={5}
          format={(v) => `${v} mV`}
          onChange={(v) => {
            setVinMv(v);
            report(vcc, gain, biasPct, v);
          }}
        />
        <Slider
          label="Gain (the stage inverts)"
          value={gain}
          min={1}
          max={50}
          format={(v) => `×${v}`}
          onChange={(v) => {
            setGain(v);
            report(vcc, v, biasPct, vinMv);
          }}
        />
        <Slider
          label="Bias: output at rest, as a share of the supply"
          value={biasPct}
          min={10}
          max={90}
          format={(v) => `${v}% = ${formatSI((v / 100) * vcc, "V")}`}
          onChange={(v) => {
            setBiasPct(v);
            report(vcc, gain, v, vinMv);
          }}
        />
        <div className="flex flex-col justify-end gap-1">
          <span className="text-xs text-ink-3">Supply</span>
          <Seg
            label="Supply voltage"
            value={vcc}
            options={[5, 9, 12].map((v) => ({ value: v, label: `${v} V` }))}
            onChange={(v) => {
              setVcc(v);
              report(v, gain, biasPct, vinMv);
            }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout
          label="Gain"
          value={`×${gain} (${gainDb(gain).toFixed(1)} dB)`}
          accent
        />
        <Readout label="Output peak-to-peak" value={formatSI(res.vpp, "V")} />
        <Readout label="Clipping" value={clipText[res.clipping]} />
        <Readout
          label="Biggest clean input"
          value={`${(res.maxClean * 1000).toFixed(res.maxClean < 0.01 ? 1 : 0)} mV peak`}
        />
      </div>
      {solution && (
        <div className="mt-3">
          <Note tone="accent">{solution}</Note>
        </div>
      )}
      <div className="mt-3">
        <ToyNote>
          Behavioural sketch, not a transistor simulation: the output is bias −
          gain × input, clipped at about 0.2 V (saturation) and at the supply
          (cut-off). A real stage also distorts a little before it clips.
        </ToyNote>
      </div>
    </div>
  );
}

/** goal: { clipping: "none"|"top"|"bottom"|"both", gainMin, gainMax, biasMin, biasMax, vinMin, vcc }. */
export function checkAmp(state: unknown, goal: Record<string, unknown>) {
  const s = state as AmpStageState | undefined;
  if (!s) return false;
  if (typeof goal.clipping === "string" && s.clipping !== goal.clipping)
    return false;
  if (typeof goal.gainMin === "number" && s.gain < goal.gainMin) return false;
  if (typeof goal.gainMax === "number" && s.gain > goal.gainMax) return false;
  if (typeof goal.biasMin === "number" && s.bias < goal.biasMin) return false;
  if (typeof goal.biasMax === "number" && s.bias > goal.biasMax) return false;
  if (typeof goal.vinMin === "number" && s.vinAmp < goal.vinMin - 1e-9)
    return false;
  if (typeof goal.vcc === "number" && s.vcc !== goal.vcc) return false;
  return true;
}
