"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import {
  Schematic,
  type PartSpec,
  type WireSpec,
  type TextSpec,
} from "../elec-kit/Schematic";
import {
  Btn,
  MINUS,
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
  E12,
  RAILS,
  idealGain,
  opPoint,
  opWave,
  outLimits,
  type OpMode,
  type OpParams,
  type Rails,
} from "./opampsim";

export interface OpAmpLabProps {
  /** Modes the learner can pick, in order. Default all four. */
  modes?: OpMode[];
  mode?: OpMode;
  /** Starting feedback resistor, ohms (nearest E12 value). Default 10 k. */
  rf?: number;
  /** Starting Rin (inverting) or Rg (non-inverting), ohms. Default 10 k. */
  rin?: number;
  vin?: number;
  vref?: number;
  rails?: Rails;
  railToRail?: boolean;
  /** Hide the supply and rail-to-rail controls. */
  hideSupply?: boolean;
  /** Hide the DC / sine switch. */
  hideInputType?: boolean;
}

export interface OpAmpLabState {
  mode: OpMode;
  rf: number;
  rin: number;
  /** DC input, or the sine amplitude when input is "sine" */
  vin: number;
  vout: number;
  /** closed-loop gain from the golden rules (NaN for the comparator) */
  gain: number;
  clipped: boolean;
  vref: number;
  input: "dc" | "sine";
  rails: Rails;
  railToRail: boolean;
}

const MODE_LABEL: Record<OpMode, string> = {
  inverting: "Inverting",
  noninv: "Non-inverting",
  buffer: "Buffer",
  comparator: "Comparator",
};
const nearest = (ohms: number) =>
  E12.reduce(
    (best, v, i) =>
      Math.abs(Math.log(v / ohms)) < Math.abs(Math.log(E12[best] / ohms))
        ? i
        : best,
    0,
  );
const volts = (v: number) =>
  Math.abs(v) < 0.005 ? "0 V" : formatSI(Math.round(v * 100) / 100, "V");
const gainText = (g: number) =>
  Number.isNaN(g)
    ? "open loop"
    : `${g < 0 ? MINUS : "+"}${Math.abs(g)
        .toFixed(Math.abs(g) < 10 ? 2 : 1)
        .replace(/\.?0+$/, "")}`;

/** Drawing for each mode (all share one 18 × 11 grid, op-amp at [8, 5]). */
function circuit(p: OpParams, vinTxt: string, pt: ReturnType<typeof opPoint>) {
  const parts: PartSpec[] = [];
  const wires: WireSpec[] = [];
  const texts: TextSpec[] = [
    { at: [0, 3.3], text: "Vin" },
    { at: [0, 4.9], text: vinTxt, muted: true },
    { at: [14.2, 4.4], text: "Vout" },
    { at: [14.2, 6.1], text: volts(pt.vout), muted: true },
  ];
  const rfTxt = formatSI(p.rf, "Ω");
  const rinTxt = formatSI(p.rin, "Ω");
  const iF = (pt.vminus - pt.vout) / p.rf;
  if (p.mode === "inverting") {
    parts.push(
      { kind: "opamp", id: "U1", at: [8, 5] },
      { kind: "resistor", id: "Rin", at: [4, 4], label: "Rin", value: rinTxt },
      { kind: "resistor", id: "Rf", at: [8, 2], label: `Rf ${rfTxt}` },
      { kind: "ground", id: "G1", at: [7, 8] },
    );
    wires.push(
      { points: [[1, 4], "Rin.a"], flow: pt.iR },
      { points: ["Rin.b", "U1.minus"] },
      { points: [[7, 4], [7, 2], "Rf.a"], flow: iF },
      { points: ["Rf.b", [13, 2], [13, 5]], flow: iF },
      { points: ["U1.out", [14, 5]] },
      { points: ["U1.plus", [7, 6], "G1.a"] },
    );
  } else if (p.mode === "noninv") {
    const iFeed = (pt.vout - pt.vminus) / p.rf;
    parts.push(
      { kind: "opamp", id: "U1", at: [8, 5], flip: true },
      {
        kind: "resistor",
        id: "Rg",
        at: [5, 6],
        rot: 90,
        label: "Rg",
        value: rinTxt,
        labelFlip: true,
      },
      { kind: "resistor", id: "Rf", at: [8, 8], label: "Rf", value: rfTxt },
      { kind: "ground", id: "G1", at: [5, 9] },
    );
    wires.push(
      { points: [[1, 4], "U1.plus"] },
      { points: ["U1.minus", "Rg.a"] },
      { points: ["Rf.a", [7, 8], [7, 6]], flow: iFeed },
      { points: [[13, 5], [13, 8], "Rf.b"], flow: iFeed },
      { points: ["U1.out", [14, 5]] },
    );
  } else if (p.mode === "buffer") {
    parts.push({ kind: "opamp", id: "U1", at: [8, 5], flip: true });
    wires.push(
      { points: [[1, 4], "U1.plus"] },
      { points: ["U1.minus", [6, 6], [6, 9], [13, 9], [13, 5]] },
      { points: ["U1.out", [14, 5]] },
    );
  } else {
    parts.push({ kind: "opamp", id: "U1", at: [8, 5], flip: true });
    wires.push(
      { points: [[1, 4], "U1.plus"] },
      { points: ["U1.minus", [1, 6]] },
      { points: ["U1.out", [14, 5]] },
    );
    texts.push(
      { at: [0, 6.7], text: "Vref" },
      { at: [0, 8.2], text: volts(p.vref), muted: true },
    );
  }
  return { parts, wires, texts };
}

/** First E12 pair giving ratio r = Rf/Rin (for the solution hint). */
function pairFor(r: number): [number, number] | null {
  for (const rin of E12)
    for (const rf of E12) if (Math.abs(rf / rin - r) < 1e-6) return [rf, rin];
  return null;
}

/** Ideal op-amp playground: inverting, non-inverting, buffer and comparator, with rails and a rail-to-rail switch. */
export function OpAmpLab({
  props,
  onChange,
  status,
  goal,
}: WidgetProps<OpAmpLabProps>) {
  const modes = props.modes ?? ["inverting", "noninv", "buffer", "comparator"];
  const [mode, setMode] = useState<OpMode>(props.mode ?? modes[0]);
  const [rfI, setRfI] = useState(nearest(props.rf ?? 10000));
  const [rinI, setRinI] = useState(nearest(props.rin ?? 10000));
  const [vin, setVin] = useState(props.vin ?? 0.5);
  const [amp, setAmp] = useState(1);
  const [vref, setVref] = useState(props.vref ?? 0);
  const [input, setInput] = useState<"dc" | "sine">("dc");
  const [rails, setRails] = useState<Rails>(props.rails ?? "pm5");
  const [rr, setRr] = useState(props.railToRail ?? false);

  const rf = E12[rfI];
  const rin = E12[rinI];
  const p: OpParams = { mode, rf, rin, rails, railToRail: rr, vref };
  const drive = input === "dc" ? vin : amp;
  const pt = opPoint(p, drive);
  const gain = idealGain(p);
  const { lo, hi } = outLimits(rails, rr);
  const clipped =
    input === "sine" && mode !== "comparator"
      ? opPoint(p, amp).clipped || opPoint(p, -amp).clipped
      : pt.clipped;

  const report = (
    next: Partial<{
      mode: OpMode;
      rfI: number;
      rinI: number;
      vin: number;
      amp: number;
      vref: number;
      input: "dc" | "sine";
      rails: Rails;
      rr: boolean;
    }>,
  ) => {
    const n = { mode, rfI, rinI, vin, amp, vref, input, rails, rr, ...next };
    const q: OpParams = {
      mode: n.mode,
      rf: E12[n.rfI],
      rin: E12[n.rinI],
      rails: n.rails,
      railToRail: n.rr,
      vref: n.vref,
    };
    const d = n.input === "dc" ? n.vin : n.amp;
    const r = opPoint(q, d);
    const c =
      n.input === "sine" && n.mode !== "comparator"
        ? opPoint(q, n.amp).clipped || opPoint(q, -n.amp).clipped
        : r.clipped;
    onChange?.({
      mode: n.mode,
      rf: q.rf,
      rin: q.rin,
      vin: d,
      vout: r.vout,
      gain: idealGain(q),
      clipped: c,
      vref: n.vref,
      input: n.input,
      rails: n.rails,
      railToRail: n.rr,
    } satisfies OpAmpLabState);
  };

  const sch = circuit(p, input === "dc" ? volts(vin) : `${volts(amp)} pk`, pt);
  const curve: [number, number][] = [];
  if (mode === "comparator") {
    curve.push([-2, lo], [vref, lo], [vref, hi], [2, hi]);
  } else {
    for (let i = 0; i <= 80; i++) {
      const v = -2 + (i / 80) * 4;
      curve.push([v, opPoint(p, v).vout]);
    }
  }
  const wave = opWave(p, amp);

  const r = RAILS[rails];
  const yR: [number, number] = [r.vneg - 1, r.vpos + 1];
  const yTicks = [r.vneg, 0, r.vpos].map((v) => ({ value: v, label: `${v}` }));

  const hasR = mode === "inverting" || mode === "noninv";
  const rule =
    mode === "comparator"
      ? "No feedback here, so the golden rules do not apply: any tiny difference between the inputs pushes the output to a limit."
      : clipped
        ? `The output has hit its limit (${volts(pt.vout)}), so it can no longer make V− = V+. The golden rules have stopped working.`
        : `Golden rule 1 holds: the output is whatever makes V− = V+ (${volts(pt.vminus)} each). Rule 2: no current enters the inputs.`;

  let solution: string | null = null;
  if (status === "revealed" && goal) {
    if (
      typeof goal.gain === "number" &&
      (goal.mode === "inverting" || goal.mode === "noninv")
    ) {
      const ratio = goal.mode === "inverting" ? -goal.gain : goal.gain - 1;
      const pair = ratio > 0 ? pairFor(ratio) : null;
      if (pair)
        solution = `One answer: ${MODE_LABEL[goal.mode]} mode with Rf = ${formatSI(pair[0], "Ω")} and ${goal.mode === "inverting" ? "Rin" : "Rg"} = ${formatSI(pair[1], "Ω")} (the ratio Rf/${goal.mode === "inverting" ? "Rin" : "Rg"} is ${ratio}).`;
    } else if (goal.clipped === true) {
      solution =
        "One answer: inverting mode, Rf = 100 kΩ, Rin = 10 kΩ and Vin = 1 V. The ideal output would be −10 V, far outside the supply, so it stops at the limit.";
    }
  }

  return (
    <div data-widget="analog-opamp" className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        {modes.length > 1 && (
          <Seg
            label="Circuit"
            value={mode}
            options={modes.map((m) => ({ value: m, label: MODE_LABEL[m] }))}
            onChange={(v) => {
              setMode(v);
              report({ mode: v });
            }}
          />
        )}
        {!props.hideInputType && (
          <Seg
            label="Input signal"
            value={input}
            options={[
              { value: "dc", label: "DC level" },
              { value: "sine", label: "Sine wave" },
            ]}
            onChange={(v) => {
              setInput(v);
              report({ input: v });
            }}
          />
        )}
      </div>
      {!props.hideSupply && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Seg
            label="Supply rails"
            value={rails}
            options={(Object.keys(RAILS) as Rails[]).map((k) => ({
              value: k,
              label: RAILS[k].label,
            }))}
            onChange={(v) => {
              setRails(v);
              report({ rails: v });
            }}
          />
          <Btn
            on={rr}
            onClick={() => {
              setRr(!rr);
              report({ rr: !rr });
            }}
          >
            Rail-to-rail output
          </Btn>
        </div>
      )}

      <div className="mx-auto mt-3 w-full max-w-[420px] space-y-2">
        <Schematic
          cols={18}
          rows={11}
          parts={sch.parts}
          wires={sch.wires}
          texts={sch.texts}
          ariaLabel={`${MODE_LABEL[mode]} op-amp circuit${hasR ? ` with Rf ${formatSI(rf, "Ω")} and ${mode === "inverting" ? "Rin" : "Rg"} ${formatSI(rin, "Ω")}` : ""}. Input ${volts(drive)}, output ${volts(pt.vout)}.`}
        />
        {input === "dc" ? (
          <Plot
            x={[-2, 2]}
            y={yR}
            xTicks={[-2, -1, 0, 1, 2].map((v) => ({ value: v, label: `${v}` }))}
            yTicks={yTicks}
            markers={[
              { y: hi, color: "var(--ink-3)", label: "limit" },
              { y: lo, color: "var(--ink-3)" },
              { x: vin, color: SECOND },
              { y: pt.vout, color: SECOND },
            ]}
            series={[{ points: curve }]}
            xLabel="input Vin (V)"
            ariaLabel={`Output against input. The output follows the line until it reaches the limits at ${volts(lo)} and ${volts(hi)}. Now: input ${volts(vin)}, output ${volts(pt.vout)}.`}
          />
        ) : (
          <Plot
            x={[0, 2]}
            y={yR}
            yTicks={yTicks}
            markers={[
              { y: hi, color: "var(--ink-3)", label: "limit" },
              { y: lo, color: "var(--ink-3)" },
            ]}
            series={[{ points: wave.vin, color: SECOND }, { points: wave.out }]}
            xLabel="time (two cycles)"
            ariaLabel={`Input and output sine waves over two cycles. Input amplitude ${volts(amp)}. The output is ${clipped ? "flattened at the limits" : "a clean sine"}.`}
          />
        )}
      </div>
      <p className="mt-1 text-center text-xs text-ink-3">
        {input === "dc"
          ? "Vertical axis: Vout in volts. Line: output for every input · orange crosshair: where you are now"
          : "Vertical axis: volts. Orange: input · solid: output · dashed: the output limits"}
      </p>

      <div className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2">
        {input === "dc" ? (
          <Slider
            label="Input voltage Vin (DC)"
            value={vin}
            min={-2}
            max={2}
            step={0.05}
            format={(v) => volts(v)}
            onChange={(v) => {
              const x = Math.round(v * 100) / 100;
              setVin(x);
              report({ vin: x });
            }}
          />
        ) : (
          <Slider
            label="Sine amplitude (peak)"
            value={amp}
            min={0.1}
            max={2}
            step={0.05}
            format={(v) => volts(v)}
            onChange={(v) => {
              const x = Math.round(v * 100) / 100;
              setAmp(x);
              report({ amp: x });
            }}
          />
        )}
        {mode === "comparator" && (
          <Slider
            label="Reference Vref (− input)"
            value={vref}
            min={-2}
            max={2}
            step={0.05}
            format={(v) => volts(v)}
            onChange={(v) => {
              const x = Math.round(v * 100) / 100;
              setVref(x);
              report({ vref: x });
            }}
          />
        )}
        {hasR && (
          <Slider
            label="Feedback resistor Rf"
            value={rfI}
            min={0}
            max={E12.length - 1}
            format={(i) => formatSI(E12[i], "Ω")}
            onChange={(v) => {
              setRfI(v);
              report({ rfI: v });
            }}
          />
        )}
        {hasR && (
          <Slider
            label={
              mode === "inverting" ? "Input resistor Rin" : "Ground resistor Rg"
            }
            value={rinI}
            min={0}
            max={E12.length - 1}
            format={(i) => formatSI(E12[i], "Ω")}
            onChange={(v) => {
              setRinI(v);
              report({ rinI: v });
            }}
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Ideal gain" value={gainText(gain)} accent />
        <Readout
          label={input === "dc" ? "Vout" : "Vout (positive peak)"}
          value={volts(pt.vout)}
        />
        <Readout label="V−" value={volts(pt.vminus)} />
        <Readout label="V+" value={volts(pt.vplus)} />
        <Readout
          label="Output"
          value={
            mode === "comparator"
              ? "at a limit (by design)"
              : clipped
                ? "clipped at a limit"
                : "inside its range"
          }
        />
        {hasR && (
          <Readout
            label={mode === "inverting" ? "Current in Rin" : "Current in Rg"}
            value={formatSI(Math.abs(pt.iR), "A")}
          />
        )}
      </div>
      <div className="mt-3">
        <Note tone={clipped && mode !== "comparator" ? "plain" : "accent"}>
          {rule}
        </Note>
      </div>
      {solution && (
        <div className="mt-2">
          <Note tone="accent">{solution}</Note>
        </div>
      )}
      <div className="mt-3">
        <ToyNote>
          Ideal op-amp (golden-rule model): infinite gain with feedback, no
          input current, no bandwidth or slew limit. Output limits are typical:
          about 1.5 V inside each rail, or about 0.1 V if rail-to-rail.
        </ToyNote>
      </div>
    </div>
  );
}

/** goal: { mode, gain (+ tol, default 0.01), clipped, vout (+ voutTol), rails, railToRail, input }. */
export function checkOpAmp(state: unknown, goal: Record<string, unknown>) {
  const s = state as OpAmpLabState | undefined;
  if (!s) return false;
  if (typeof goal.mode === "string" && s.mode !== goal.mode) return false;
  if (typeof goal.gain === "number") {
    const tol = typeof goal.tol === "number" ? goal.tol : 0.01;
    if (!(Math.abs(s.gain - goal.gain) <= tol)) return false;
  }
  if (typeof goal.clipped === "boolean" && s.clipped !== goal.clipped)
    return false;
  if (typeof goal.vout === "number") {
    const tol = typeof goal.voutTol === "number" ? goal.voutTol : 0.05;
    if (!(Math.abs(s.vout - goal.vout) <= tol)) return false;
  }
  if (typeof goal.rails === "string" && s.rails !== goal.rails) return false;
  if (typeof goal.railToRail === "boolean" && s.railToRail !== goal.railToRail)
    return false;
  if (typeof goal.input === "string" && s.input !== goal.input) return false;
  return true;
}
