"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { BLUE, ORANGE } from "../gpu/ui";
import { Btn, Note, Readout, Seg, Slider } from "./ui";
import { mtbfSeconds, mulberry32, sampleResolution } from "./sim";

/* ───────────────────────── metastability: what happens inside the setup/hold window ───────────────────────── */

const TSU = 0.3; // ns, illustrative
const THOLD = 0.1; // ns, illustrative
const TAU = 0.1; // ns, illustrative resolution time constant
const T_NEXT = 1.0; // ns, the next clock edge

export interface MetaState {
  /** data edge position relative to the clock edge, ns (negative = before) */
  edge: number;
  inWindow: boolean;
  samples: number;
  /** how many samples landed in the window and went metastable */
  metastable: number;
  /** slowest resolution seen, ns */
  worst: number;
  /** the slowest one was still unresolved when the next stage sampled it */
  escaped: boolean;
}

interface Sample {
  meta: boolean;
  tres: number;
  value: 0 | 1;
}

const W = 360;
const H = 128;
const PL = 8;
const PR = 8;
const T0 = -0.5; // ns shown to the left of the clock edge
const T1 = 1.5; // ns shown to the right
const px = (t: number) => PL + ((t - T0) / (T1 - T0)) * (W - PL - PR);
const qy = (v: number) => 60 + (1 - v) * 56;

/** A clocked flip-flop sampling a data edge: inside the setup/hold window the output can hover before it resolves. */
export function Meta({ onChange }: WidgetProps<Record<string, never>>) {
  const [edge, setEdge] = useState(-0.45);
  const [n, setN] = useState(0);
  const [stat, setStat] = useState({ meta: 0, worst: 0, escaped: false });
  const [last, setLast] = useState<Sample | null>(null);
  const [worstS, setWorstS] = useState<Sample | null>(null);

  const inWindow = edge > -TSU && edge < THOLD;
  const report = (e: number, count: number, s: typeof stat) => onChange?.({ edge: e, inWindow: e > -TSU && e < THOLD, samples: count, metastable: s.meta, worst: s.worst, escaped: s.escaped } satisfies MetaState);

  const run = (k: number) => {
    let meta = stat.meta;
    let worst = stat.worst;
    let escaped = stat.escaped;
    let lastS: Sample | null = last;
    let worstSample: Sample | null = worstS;
    for (let i = 0; i < k; i++) {
      const rand = mulberry32(9001 + (n + i) * 7919);
      let s: Sample;
      if (edge <= -TSU) s = { meta: false, tres: 0, value: 1 };
      else if (edge >= THOLD) s = { meta: false, tres: 0, value: 0 };
      else s = { meta: true, tres: sampleResolution(rand, TAU), value: rand() < 0.5 ? 0 : 1 };
      lastS = s;
      if (s.meta) {
        meta++;
        if (s.tres > worst) {
          worst = s.tres;
          worstSample = s;
          escaped = s.tres > T_NEXT - TSU;
        }
      }
    }
    const ns = { meta, worst, escaped };
    setStat(ns);
    setN(n + k);
    setLast(lastS);
    setWorstS(worstSample);
    report(edge, n + k, ns);
  };

  const shown = last && last.meta ? last : worstS;

  const curve = (s: Sample) => {
    const pts: string[] = [];
    const tr = Math.max(0.05, s.tres);
    const tauD = tr / Math.log(50);
    for (let i = 0; i <= 80; i++) {
      const t = (T1 * i) / 80;
      const dev = Math.min(1, 0.02 * Math.exp(t / tauD));
      const v = 0.5 + (s.value === 1 ? 0.5 : -0.5) * dev;
      pts.push(`${i ? "L" : "M"}${px(t).toFixed(1)} ${qy(v).toFixed(1)}`);
    }
    return pts.join(" ");
  };

  return (
    <div className="w-full" data-widget="digi-meta">
      <Slider
        label="When the data edge arrives relative to the clock edge (negative = earlier)"
        value={edge}
        min={-0.5}
        max={0.5}
        step={0.02}
        onChange={(v) => {
          const e = Math.round(v * 100) / 100;
          setEdge(e);
          report(e, n, stat);
        }}
        format={(v) => `${v < -0.0001 ? "−" : v > 0.0001 ? "+" : ""}${Math.abs(v).toFixed(2)} ns`}
      />
      <div className="mt-2 rounded-xl border border-line bg-surface p-2">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Timing of one clock edge at 0 ns. Data changes from 0 to 1 at ${edge.toFixed(2)} ns. The unsafe window runs from ${-TSU} ns before to ${THOLD} ns after the edge. ${inWindow ? "The data edge is inside the window." : edge <= -TSU ? "The data edge is early enough: the flip-flop captures the new value." : "The data edge is late enough: the flip-flop keeps the old value."}`} className="block w-full">
          <rect x={px(-TSU)} y={4} width={px(THOLD) - px(-TSU)} height={118} fill={ORANGE} opacity={0.4} />
          {/* data row */}
          <path d={`M${px(T0)} 32 L${px(edge)} 32 L${px(edge)} 10 L${px(T1)} 10`} fill="none" stroke={BLUE} strokeWidth={2.4} strokeLinejoin="round" />
          {/* clock edges */}
          <line x1={px(0)} x2={px(0)} y1={2} y2={124} stroke="var(--ink)" strokeWidth={2} />
          <line x1={px(T_NEXT)} x2={px(T_NEXT)} y1={2} y2={124} stroke="var(--ink-3)" strokeWidth={1.4} strokeDasharray="4 3" />
          <line x1={PL} x2={W - PR} y1={qy(0.5)} y2={qy(0.5)} stroke="var(--line-strong)" strokeWidth={0.8} strokeDasharray="2 4" />
          {shown && shown.meta ? (
            <path d={curve(shown)} fill="none" stroke="var(--brand)" strokeWidth={2.6} strokeLinecap="round" />
          ) : last ? (
            <path d={`M${px(0)} ${qy(last.value)} L${px(T1)} ${qy(last.value)}`} stroke="var(--brand)" strokeWidth={2.6} fill="none" />
          ) : (
            <path d={`M${px(0)} ${qy(0)} L${px(T1)} ${qy(0)}`} stroke="var(--line-strong)" strokeWidth={1.6} fill="none" strokeDasharray="3 3" />
          )}
        </svg>
        <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-ink-2">
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: BLUE }} />data input (top)</span>
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[var(--brand)] align-middle" />flip-flop output (bottom)</span>
          <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: ORANGE }} />setup + hold window</span>
          <span>solid line: clock edge · dashed line: next clock edge</span>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Btn primary onClick={() => run(1)}>Clock it once</Btn>
        <Btn onClick={() => run(100)}>Clock it 100 times</Btn>
        <Btn
          onClick={() => {
            setN(0);
            setStat({ meta: 0, worst: 0, escaped: false });
            setLast(null);
            setWorstS(null);
            report(edge, 0, { meta: 0, worst: 0, escaped: false });
          }}
        >
          Reset
        </Btn>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Data edge is" value={inWindow ? "inside the window" : edge <= -TSU ? "early (safe)" : "late (safe)"} accent />
        <Readout label="Clocked" value={n} />
        <Readout label="Went metastable" value={stat.meta} />
        <Readout label="Slowest to resolve" value={stat.meta ? `${stat.worst.toFixed(2)} ns` : "—"} />
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <Note tone={inWindow ? "accent" : "plain"}>
          {n === 0
            ? "Move the data edge, then clock it. Outside the window the result is clean. Inside it, the output can hover near the middle for a random time before it falls to 0 or 1."
            : inWindow
              ? stat.escaped
                ? "The slowest one was still hovering when the NEXT stage sampled it: that stage could now see an in-between level. This is a metastability failure."
                : "Inside the window the output hovered, then picked 0 or 1 at random. Every case here settled before the next edge, but the tail of the distribution never quite ends."
              : "Clean: setup and hold were respected, so the result is the new value (early edge) or the old one (late edge) and it is decided at once."}
        </Note>
        <p className="text-center text-xs text-ink-3">Toy model: illustrative window ({TSU} ns before to {THOLD} ns after the edge), resolution time constant {TAU} ns, random outcomes. Real values depend on the process.</p>
      </div>
    </div>
  );
}

export function checkMeta(state: unknown, goal: Record<string, unknown>) {
  const s = state as MetaState | undefined;
  if (!s) return false;
  for (const k of ["inWindow", "escaped"] as const) if (k in goal && s[k] !== goal[k]) return false;
  if (typeof goal.minMeta === "number" && s.metastable < goal.minMeta) return false;
  if (typeof goal.minSamples === "number" && s.samples < goal.minSamples) return false;
  return Object.keys(goal).length > 0;
}

/* ───────────────────────── MTBF of a synchroniser ───────────────────────── */

const TCQ = 0.15; // ns
const TSU2 = 0.05; // ns
const TLOGIC = 0.4; // ns
const MTBF_TAU = 0.03; // ns (30 ps)
const MTBF_TW = 0.03; // ns (30 ps)

export interface MtbfState {
  stages: number;
  fclkMhz: number;
  fdataMhz: number;
  resolutionNs: number;
  seconds: number;
  years: number;
}

const YEAR = 31557600;

export function formatMtbf(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds > 1e300) return "effectively never";
  if (seconds < 1e-3) return `${(seconds * 1e6).toFixed(1)} µs`;
  if (seconds < 1) return `${(seconds * 1e3).toFixed(0)} ms`;
  if (seconds < 120) return `${seconds.toFixed(1)} seconds`;
  if (seconds < 7200) return `${(seconds / 60).toFixed(0)} minutes`;
  if (seconds < 172800) return `${(seconds / 3600).toFixed(1)} hours`;
  if (seconds < YEAR) return `${(seconds / 86400).toFixed(0)} days`;
  const y = seconds / YEAR;
  if (y < 1000) return `${y.toFixed(1)} years`;
  if (y < 1e6) return `${(y / 1e3).toFixed(0)} thousand years`;
  if (y < 1e9) return `${(y / 1e6).toFixed(0)} million years`;
  if (y < 1.4e10) return `${(y / 1e9).toFixed(1)} billion years`;
  return "far longer than the age of the universe";
}

export function resolutionNs(stages: number, fclkMhz: number): number {
  const T = 1000 / fclkMhz;
  const stage = T - TCQ - TSU2;
  return stages <= 1 ? Math.max(0, T - TCQ - TLOGIC - TSU2) : Math.max(0, (stages - 1) * stage);
}

/** MTBF of a flop sampling an asynchronous signal, and how adding synchroniser stages multiplies it. */
export function Mtbf({ onChange }: WidgetProps<Record<string, never>>) {
  const [stages, setStages] = useState(1);
  const [fclk, setFclk] = useState(1000);
  const [fdata, setFdata] = useState(100);
  const snapOf = (s: number, fc: number, fd: number): MtbfState => {
    const tr = resolutionNs(s, fc);
    const sec = mtbfSeconds(tr * 1e-9, MTBF_TAU * 1e-9, MTBF_TW * 1e-9, fc * 1e6, fd * 1e6);
    return { stages: s, fclkMhz: fc, fdataMhz: fd, resolutionNs: tr, seconds: sec, years: sec / YEAR };
  };
  const st = snapOf(stages, fclk, fdata);
  const set = (s = stages, fc = fclk, fd = fdata) => {
    setStages(s);
    setFclk(fc);
    setFdata(fd);
    onChange?.(snapOf(s, fc, fd));
  };
  const T = 1000 / fclk;
  const good = st.years >= 100;
  return (
    <div className="w-full" data-widget="digi-mtbf">
      <div className="mb-2 flex justify-center">
        <Seg
          label="Synchroniser"
          value={stages}
          onChange={(s) => set(s)}
          options={[
            { value: 1, label: "No synchroniser" },
            { value: 2, label: "Two flops" },
            { value: 3, label: "Three flops" },
          ]}
        />
      </div>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Slider label="Receiving clock" value={fclk} min={100} max={2000} step={50} onChange={(v) => set(undefined, v)} format={(v) => (v >= 1000 ? `${(v / 1000).toFixed(2)} GHz` : `${v} MHz`)} />
        <Slider label="Rate of the asynchronous data changing" value={fdata} min={1} max={400} step={1} onChange={(v) => set(undefined, undefined, v)} format={(v) => `${v} MHz`} />
      </div>
      <div className="mt-2 rounded-xl border border-line bg-surface p-3 text-sm text-ink-2">
        <p>
          Clock period T = <b className="text-ink">{T.toFixed(2)} ns</b>. Time the first flop has to settle before something uses its output:{" "}
          <b className="text-ink">{st.resolutionNs.toFixed(2)} ns</b>
          {stages === 1 ? ` (T − clock-to-Q ${TCQ} − logic ${TLOGIC} − setup ${TSU2})` : stages === 2 ? ` (a whole stage: T − clock-to-Q ${TCQ} − setup ${TSU2})` : ` (two whole stages)`}.
        </p>
        <p className="mt-1 font-mono text-xs text-ink-3">MTBF = e^(t/τ) / (Tw · f_clk · f_data), with τ = {MTBF_TAU * 1000} ps and Tw = {MTBF_TW * 1000} ps</p>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Settling time t" value={`${st.resolutionNs.toFixed(2)} ns`} />
        <Readout label="Mean time between failures" value={formatMtbf(st.seconds)} accent />
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <Note tone={good ? "plain" : "accent"}>
          {good
            ? "Failures are now so rare that they are a non-issue for the product's lifetime. Note: never zero. The tail of the exponential only shrinks."
            : stages === 1
              ? "With no synchroniser the unsettled output runs straight into logic, and there is little time to settle. A failure every few seconds or days is a real, intermittent bug."
              : "Better, but at this clock speed still short of a safe margin. Each extra stage gives a whole extra clock period to settle, which multiplies the MTBF enormously. Or slow the receiving clock."}
        </Note>
        <p className="text-center text-xs text-ink-3">Illustrative numbers (τ and Tw are of the order of tens of picoseconds in modern processes, but vary widely). Only the shape is the point: MTBF grows exponentially with settling time.</p>
      </div>
    </div>
  );
}

export function checkMtbf(state: unknown, goal: Record<string, unknown>) {
  const s = state as MtbfState | undefined;
  if (!s) return false;
  if (typeof goal.stages === "number" && s.stages !== goal.stages) return false;
  if (typeof goal.minYears === "number" && s.years < goal.minYears) return false;
  if (typeof goal.maxYears === "number" && s.years > goal.maxYears) return false;
  if (typeof goal.minFclkMhz === "number" && s.fclkMhz < goal.minFclkMhz) return false;
  return Object.keys(goal).length > 0;
}
