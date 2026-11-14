"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Schematic, type WireSpec } from "../elec-kit/Schematic";
import { Btn, Caption, Readout, Seg, Slider, ToyNote, formatSI } from "./ui";
import { LED_COLOURS, LED_MAX_MA, LED_R_STOPS, LED_TYPICAL_MA, NO_RESISTOR_OHMS, RESISTOR_WATTS, nextE12, requiredR, solveLed, type LedColourId } from "./ledsim";

export interface LedBenchProps {
  /** Starting supply, volts. Default 5. */
  vs?: number;
  /** Supplies offered. Default 3.3, 5, 9, 12. */
  supplies?: number[];
  colour?: LedColourId;
  /** Starting resistor, ohms (snaps to the nearest stop; 0 = none). Default 330. */
  r?: number;
  reversed?: boolean;
  /** Lock any of these controls. */
  lock?: ("vs" | "colour" | "r" | "flip")[];
  /** Show the worked "what resistor for this current?" line. */
  showCalc?: boolean;
  /** Target current for the worked line, mA. Default 10. */
  targetMa?: number;
}

export interface LedBenchState {
  vs: number;
  colour: LedColourId;
  vf: number;
  /** ohms; 0 = no resistor */
  r: number;
  /** amps through the LED (0 when off or reversed) */
  i: number;
  /** resistor power, watts */
  p: number;
  reversed: boolean;
  lit: boolean;
  /** above the typical absolute maximum for a small LED */
  tooMuch: boolean;
}

const nearestStop = (x: number) => LED_R_STOPS.reduce((best, v, k) => (Math.abs(v - x) < Math.abs(LED_R_STOPS[best] - x) ? k : best), 0);
const rLabel = (ohms: number) => (ohms > 0 ? formatSI(ohms, "Ω") : "none");
const mA = (a: number) => `${(a * 1000).toFixed(a * 1000 < 100 ? 1 : 0)} mA`;

function make(vs: number, colour: LedColourId, ohms: number, reversed: boolean): LedBenchState {
  const c = LED_COLOURS.find((x) => x.id === colour) ?? LED_COLOURS[0];
  const s = solveLed(vs, c.vf, ohms, reversed);
  const i = s?.i ?? 0;
  return { vs, colour, vf: c.vf, r: ohms, i, p: s?.pR ?? 0, reversed, lit: i >= 0.0005, tooMuch: i * 1000 > LED_MAX_MA };
}

/** LED bench: supply, LED colour, series resistor and direction; the solved current, brightness, resistor power and warnings. */
export function LedBench({ props, onChange, status, goal }: WidgetProps<LedBenchProps>) {
  const supplies = props.supplies ?? [3.3, 5, 9, 12];
  const lock = props.lock ?? [];
  const [vs, setVs] = useState(props.vs ?? 5);
  const [colour, setColour] = useState<LedColourId>(props.colour ?? "red");
  const [ri, setRi] = useState(() => nearestStop(props.r ?? 330));
  const [reversed, setReversed] = useState(props.reversed ?? false);

  const ohms = LED_R_STOPS[ri];
  const st = make(vs, colour, ohms, reversed);
  const col = LED_COLOURS.find((x) => x.id === colour) ?? LED_COLOURS[0];
  const bright = st.lit ? Math.min(1, st.i / (LED_TYPICAL_MA / 1000)) : 0;

  const update = (v: number, c: LedColourId, k: number, rev: boolean) => {
    setVs(v);
    setColour(c);
    setRi(k);
    setReversed(rev);
    onChange?.(make(v, c, LED_R_STOPS[k], rev));
  };

  const flow = st.lit ? 1 : 0;
  const topPin = reversed ? "D1.b" : "D1.a";
  const botPin = reversed ? "D1.a" : "D1.b";
  const wires: WireSpec[] = [
    { points: ["B1.a", "R1.a"], flow },
    { points: ["R1.b", [14, 2], topPin], flow },
    { points: [botPin, [14, 7], [2, 7], "B1.b"], flow },
  ];

  const message = (() => {
    if (reversed) return { tone: vs > 5 ? "bad" : "info", text: `Reverse biased: the diode blocks, so almost no current flows and the LED stays dark.${vs > 5 ? " But a small LED usually breaks down in reverse at only about 5 V (typical), so this supply could damage it." : ""}` };
    if (vs <= st.vf) return { tone: "info", text: `Won't light: the supply (${vs} V) is not above this LED's typical forward drop (${st.vf.toFixed(1)} V), so it never turns on. Try a bigger supply or a red LED.` };
    if (st.tooMuch) return { tone: "bad", text: `Too much current! ${mA(st.i)} is above the ~${LED_MAX_MA} mA a small LED can usually take (typical; check the datasheet). It would overheat and die${ohms > 0 ? "" : ", and with no resistor that happens in a flash"}.` };
    if (st.i * 1000 > LED_TYPICAL_MA) return { tone: "warn", text: `Bright, but ${mA(st.i)} is over the usual ~${LED_TYPICAL_MA} mA for an indicator. Fine for a moment, wasteful and hot for good.` };
    if (!st.lit) return { tone: "info", text: "Almost no current: the LED is off." };
    return { tone: "ok", text: `Lit, with ${mA(st.i)} flowing. Brightness follows current, not voltage.` };
  })();

  const need = requiredR(vs, st.vf, (props.targetMa ?? 10) / 1000);
  const goalI = status === "revealed" && typeof goal?.iMin === "number" && typeof goal?.iMax === "number" ? ((goal.iMin + goal.iMax) / 2) : null;

  return (
    <div data-widget="analog-led" className="w-full" style={{ ["--elec-glow" as string]: col.glow }}>
      <div className="mx-auto max-w-[460px]">
        <Schematic
          cols={18}
          rows={9}
          ariaLabel={`A ${vs} volt battery drives a ${rLabel(ohms)} resistor and a ${col.label.toLowerCase()} LED${reversed ? " fitted backwards" : ""} in series. Current ${mA(st.i)}.`}
          parts={[
            { kind: "battery", id: "B1", at: [2, 2], rot: 90, label: "B1", value: `${vs} V` },
            { kind: "resistor", id: "R1", at: [5, 2], label: "R1", value: rLabel(ohms) },
            reversed
              ? { kind: "led", id: "D1", at: [14, 5], rot: 270, label: "D1", on: st.lit }
              : { kind: "led", id: "D1", at: [14, 2], rot: 90, label: "D1", on: st.lit },
          ]}
          wires={wires}
          texts={[
            { at: [12.5, 3.1], text: reversed ? "cathode" : "anode", anchor: "end", muted: true },
            { at: [12.5, 4.9], text: reversed ? "anode" : "cathode", anchor: "end", muted: true },
          ]}
        />
      </div>

      <div className="mt-2 flex items-center justify-center gap-3" role="status" aria-live="polite">
        <span
          aria-hidden
          className="inline-block h-10 w-10 shrink-0 rounded-full border border-[var(--line-strong)]"
          style={{ background: st.lit ? col.glow : "var(--surface-2)", opacity: st.lit ? 0.35 + 0.65 * bright : 1, boxShadow: st.lit ? `0 0 ${Math.round(6 + 22 * bright)}px ${col.glow}` : undefined }}
        />
        <p className={`text-sm leading-snug ${message.tone === "bad" ? "font-semibold text-bad" : "text-ink-2"}`}>{message.text}</p>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Caption>Supply</Caption>
          {lock.includes("vs") ? (
            <Readout label="Vs" value={`${vs} V`} />
          ) : (
            <Seg label="Supply voltage" value={vs} options={supplies.map((v) => ({ value: v, label: `${v} V` }))} onChange={(v) => update(v, colour, ri, reversed)} />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Caption>LED</Caption>
          {lock.includes("colour") ? (
            <Readout label="colour" value={`${col.label} ~${col.vf.toFixed(1)} V`} />
          ) : (
            <Seg label="LED colour (typical forward voltage)" value={colour} options={LED_COLOURS.map((c) => ({ value: c.id, label: `${c.label} ~${c.vf.toFixed(1)} V` }))} onChange={(v) => update(vs, v, ri, reversed)} />
          )}
          <Btn on={reversed} disabled={lock.includes("flip")} onClick={() => update(vs, colour, ri, !reversed)}>
            {reversed ? "Backwards (tap to flip)" : "Flip the LED"}
          </Btn>
        </div>
        <Slider
          label={ohms > 0 ? "Series resistor (E12 values)" : `Series resistor (E12 values) · none leaves only the battery's own ~${NO_RESISTOR_OHMS} Ω`}
          value={ri}
          min={0}
          max={LED_R_STOPS.length - 1}
          disabled={lock.includes("r")}
          format={(k) => rLabel(LED_R_STOPS[k])}
          onChange={(k) => update(vs, colour, k, reversed)}
        />
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Readout label="Current" value={reversed || !st.lit ? "0 mA" : mA(st.i)} accent />
        <Readout label="LED drop" value={st.lit ? `${st.vf.toFixed(1)} V` : "off"} />
        <Readout label="Resistor drop" value={st.lit ? `${(st.i * (ohms > 0 ? ohms : NO_RESISTOR_OHMS)).toFixed(2)} V` : "0 V"} />
        <Readout label="Resistor heat P = I²R" value={formatSI(st.p, "W")} />
      </div>
      {st.p > RESISTOR_WATTS && (
        <p className="mt-1 text-center text-xs font-semibold text-bad">That is more than the 1/4 W a common small resistor is rated for (typical): it would run too hot.</p>
      )}

      {props.showCalc && (
        <p className="mt-2 rounded-xl bg-tint px-3 py-2 text-center text-sm text-ink-2">
          {vs > st.vf
            ? `For ${props.targetMa ?? 10} mA: R = (Vs − Vf) ÷ I = (${vs} − ${st.vf.toFixed(1)}) ÷ ${((props.targetMa ?? 10) / 1000).toFixed(3)} = ${formatSI(need, "Ω")}, so use the next E12 value up: ${formatSI(nextE12(need), "Ω")}.`
            : "The supply is not above the LED's forward drop, so there is no resistor value that lights it."}
        </p>
      )}
      {goalI !== null && <p className="mt-1 text-center text-xs text-ink-3">Goal: about {mA(goalI)}.</p>}

      <div className="mt-3">
        <ToyNote>Toy model: the LED is a fixed-drop switch (real ones glow gradually from about 1.5 V and the drop creeps up with current and temperature), the battery is ideal, and the brightness is just current ÷ {LED_TYPICAL_MA} mA.</ToyNote>
      </div>
    </div>
  );
}

/**
 * goal: { iMin, iMax } (amps, LED current window), { reversed }, { colour }, { vs }, { lit }, { tooMuch },
 * { rMin, rMax } (ohms).
 */
export function checkLedBench(state: unknown, goal: Record<string, unknown>) {
  const s = state as LedBenchState | undefined;
  if (!s) return false;
  if (typeof goal.iMin === "number" && s.i < goal.iMin) return false;
  if (typeof goal.iMax === "number" && s.i > goal.iMax) return false;
  if (typeof goal.reversed === "boolean" && s.reversed !== goal.reversed) return false;
  if (typeof goal.colour === "string" && s.colour !== goal.colour) return false;
  if (typeof goal.vs === "number" && s.vs !== goal.vs) return false;
  if (typeof goal.lit === "boolean" && s.lit !== goal.lit) return false;
  if (typeof goal.tooMuch === "boolean" && s.tooMuch !== goal.tooMuch) return false;
  if (typeof goal.rMin === "number" && s.r < goal.rMin) return false;
  if (typeof goal.rMax === "number" && s.r > goal.rMax) return false;
  return true;
}
