"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { BitBtn, Btn, Caption, Lamp, Note, Readout, Seg, Wave } from "./ui";
import { bitsToInt, counterStep, shiftIn, type Bit } from "./sim";

type Mode = "reg" | "shift" | "count";

export interface SeqProps {
  mode?: Mode;
  /** register / shift register width (default 4); counter width (default 3) */
  bits?: number;
  /** show a selector between register, shift register and counter */
  pick?: boolean;
}

export interface SeqState {
  mode: Mode;
  /** stored bits, MSB first */
  q: number[];
  value: number;
  /** clock pulses so far */
  pulses: number;
  /** the stored value differs from the data inputs (register mode) */
  loaded: boolean;
  /** counter has wrapped from all ones back to zero */
  wrapped: boolean;
}

const SLOTS = 16;

interface Row {
  clk: Bit;
  q: Bit[];
}

const NOTE: Record<Mode, string> = {
  reg: "A register is a row of flip-flops sharing one clock. On each rising edge, if LOAD is 1 every flip-flop copies its D input at the same instant; otherwise it keeps its value. Change the data and pulse the clock to see it load.",
  shift: "In a shift register each flip-flop's D input is the output of its neighbour. On every clock edge the whole row moves one place and a new bit enters at the end. Shifting right halves the number; the bit pushed off the end is lost.",
  count: "A binary counter adds 1 on every clock edge: a bit flips when all the bits below it are 1. So Q0 flips every clock (half the clock's frequency), Q1 every second clock (a quarter), Q2 every fourth (an eighth). That is a divider.",
};

/** Register, shift register and binary counter with a clock you step by hand, plus a waveform of the clock and outputs. */
export function Seq({ props, onChange }: WidgetProps<SeqProps>) {
  const [mode, setMode] = useState<Mode>(props.mode ?? "reg");
  const width = mode === "count" ? (props.bits ?? 3) : (props.bits ?? 4);
  const [q, setQ] = useState<Bit[]>(new Array(8).fill(0)); // LSB first; only the first `width` are used
  const [d, setD] = useState<Bit[]>([1, 0, 1, 1, 0, 0, 0, 0]); // register data inputs, LSB first
  const [ld, setLd] = useState<Bit>(1);
  const [sin, setSin] = useState<Bit>(1);
  const [pulses, setPulses] = useState(0);
  const [wrapped, setWrapped] = useState(false);
  const [hist, setHist] = useState<Row[]>([{ clk: 0, q: new Array(8).fill(0) }]);

  const w = (mode === "count" ? Math.min(width, 3) : width) || 4;
  const cur = q.slice(0, w);

  const report = (m: Mode, qq: Bit[], dd: Bit[], p: number, wr: boolean) => {
    const bits = qq.slice(0, w);
    onChange?.({
      mode: m,
      q: [...bits].reverse(),
      value: bitsToInt(bits),
      pulses: p,
      loaded: m === "reg" && bitsToInt(bits) === bitsToInt(dd.slice(0, w)),
      wrapped: wr,
    } satisfies SeqState);
  };

  const nextQ = (m: Mode, qq: Bit[], dd: Bit[], l: Bit, s: Bit): Bit[] => {
    const bits = qq.slice(0, w);
    const rest = qq.slice(w);
    if (m === "reg") return [...(l ? dd.slice(0, w) : bits), ...rest];
    if (m === "shift") return [...shiftIn([...bits].reverse() as Bit[], s).reverse(), ...rest];
    return [...counterStep(bits), ...rest];
  };

  const pulse = (n = 1) => {
    let qq = q;
    let hh = hist;
    let wr = wrapped;
    let p = pulses;
    for (let i = 0; i < n; i++) {
      const before = bitsToInt(qq.slice(0, w));
      qq = nextQ(mode, qq, d, ld, sin);
      if (mode === "count" && before === 2 ** w - 1 && bitsToInt(qq.slice(0, w)) === 0) wr = true;
      hh = [...hh, { clk: 1 as Bit, q: qq }, { clk: 0 as Bit, q: qq }].slice(-SLOTS);
      p++;
    }
    setQ(qq);
    setHist(hh);
    setPulses(p);
    setWrapped(wr);
    report(mode, qq, d, p, wr);
  };

  const reset = (m: Mode = mode) => {
    const z = new Array(8).fill(0) as Bit[];
    setQ(z);
    setHist([{ clk: 0, q: z }]);
    setPulses(0);
    setWrapped(false);
    report(m, z, d, 0, false);
  };
  const flipD = (i: number) => {
    const dd = d.map((v, k) => (k === i ? ((1 - v) as Bit) : v));
    setD(dd);
    report(mode, q, dd, pulses, wrapped);
  };

  const value = bitsToInt(cur);
  const qNames = Array.from({ length: w }, (_, i) => `Q${i}`);
  const signals = [
    { name: "CLK", v: hist.map((r) => r.clk) as (Bit | "?")[] },
    ...qNames.map((n, i) => ({ name: n, v: hist.map((r) => r.q[i]) as (Bit | "?")[], hot: i === 0 })),
  ];

  return (
    <div className="w-full" data-widget="digi-seq">
      {props.pick && (
        <div className="mb-2 flex justify-center">
          <Seg
            label="Sequential circuit"
            value={mode}
            onChange={(m) => {
              setMode(m);
              reset(m);
            }}
            options={[
              { value: "reg", label: "Register" },
              { value: "shift", label: "Shift register" },
              { value: "count", label: "Counter" },
            ]}
          />
        </div>
      )}

      <div className="rounded-xl border border-line bg-surface-2 p-3">
        {mode === "reg" && (
          <>
            <Caption>Data inputs D (tap to flip)</Caption>
            <div className="mt-1 flex flex-wrap gap-2">
              {Array.from({ length: w }, (_, k) => w - 1 - k).map((i) => (
                <BitBtn key={i} label={`D${i}`} value={d[i]} onClick={() => flipD(i)} />
              ))}
              <BitBtn label="LOAD" value={ld} wide onClick={() => {
                setLd((1 - ld) as Bit);
              }} />
            </div>
          </>
        )}
        {mode === "shift" && (
          <>
            <Caption>Serial input (the bit that enters next)</Caption>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <BitBtn label="IN" value={sin} onClick={() => setSin((1 - sin) as Bit)} />
              <span className="text-xs text-ink-3">enters at the left, moves right</span>
            </div>
          </>
        )}
        {mode === "count" && <Caption>A {w}-bit counter: counts 0 to {2 ** w - 1}, then wraps to 0</Caption>}
        <Caption className="mt-3">Stored bits Q (most significant first)</Caption>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {Array.from({ length: w }, (_, k) => w - 1 - k).map((i) => (
            <span key={i} className="flex flex-col items-center gap-0.5">
              <Lamp v={cur[i]} label={`Q${i}`} />
              <span className="font-mono text-[11px] text-ink-3">Q{i}</span>
            </span>
          ))}
          <span className="ml-1 font-mono text-sm text-ink-2">= {value}</span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Btn primary onClick={() => pulse(1)}>Clock pulse</Btn>
        {mode === "count" && <Btn onClick={() => pulse(2 ** w)}>Run {2 ** w} clocks</Btn>}
        <Btn onClick={() => reset()}>Reset to 0</Btn>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <Wave signals={signals} slots={SLOTS} mark={hist.length - 1} label={`Waveforms of the clock and the ${w} stored bits`} labelW={52} />
        <p className="mt-1 text-center text-xs text-ink-3">Each clock pulse takes two columns (high, then low). The flip-flops change on the rising edge.</p>
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Readout label="Value" value={value} accent />
        <Readout label="Clock pulses" value={pulses} />
        {mode === "count" && <Readout label="Q0 toggles" value="every clock" />}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <Note>{NOTE[mode]}</Note>
        <p className="text-center text-xs text-ink-3">Toy model: ideal flip-flops that all see the clock at the same instant (real counters need care with timing: see the Timing lesson).</p>
      </div>
    </div>
  );
}

/** goal: any of { mode, value, pulses, loaded, wrapped } */
export function checkSeq(state: unknown, goal: Record<string, unknown>) {
  const s = state as SeqState | undefined;
  if (!s) return false;
  for (const k of ["mode", "value", "wrapped", "loaded"] as const) if (k in goal && s[k] !== goal[k]) return false;
  if (typeof goal.minPulses === "number" && s.pulses < goal.minPulses) return false;
  return Object.keys(goal).length > 0;
}
