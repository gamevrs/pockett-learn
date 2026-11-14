"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { firstPassYield } from "./logic";
import { Meter, Note, Readout, Slider, Toy } from "./ui";

// ───────────────────────── where is the bug caught ─────────────────────────

type LayerId = "host" | "hil" | "env" | "prod";

const LAYERS: { id: LayerId; label: string; sub: string }[] = [
  { id: "host", label: "Host tests", sub: "On a laptop, no hardware. Thousands, in seconds." },
  { id: "hil", label: "Hardware in the loop", sub: "Real board on a rig, scripted. Dozens, in minutes." },
  { id: "env", label: "Environmental and life", sub: "Chambers, drops, long runs. A few, over days or weeks." },
  { id: "prod", label: "Production test", sub: "Every single unit, a few seconds each." },
];

const BUGS: { id: string; text: string; answer: LayerId; why: string }[] = [
  { id: "conv", text: "The moisture-to-percent conversion rounds wrongly at the dry end.", answer: "host", why: "Pure arithmetic: feed it numbers on a laptop and check the output. No board needed, so this is the cheapest place to catch it." },
  { id: "i2c", text: "Reads from the real light sensor fail at 400 kHz because of its timing.", answer: "hil", why: "A fake sensor would not have the real chip's timing. You need the real chip on a real board, driven by a script." },
  { id: "cold", text: "Radio range halves in a cold, damp chamber.", answer: "env", why: "Only a chamber that recreates temperature and humidity shows this. Neither a laptop nor a quick bench test will." },
  { id: "joint", text: "Unit 417 has a cold solder joint on the light sensor.", answer: "prod", why: "A one-off manufacturing defect on a single board. Only a test of every unit catches it before it ships." },
  { id: "parse", text: "The settings loader crashes when the saved data is cut short.", answer: "host", why: "Feed the loader truncated data in a unit test, on the laptop. It is a software logic bug, so it needs no hardware." },
];

export interface PyramidState {
  assigned: Record<string, LayerId>;
  correct: number;
  total: number;
  allCorrect: boolean;
}

/** Match each bug to the cheapest test layer that would catch it first. */
export function Pyramid({ onChange }: WidgetProps<Record<string, never>>) {
  const [assigned, setAssigned] = useState<Record<string, LayerId>>({});

  const stateOf = (a: Record<string, LayerId>): PyramidState => {
    const correct = BUGS.filter((b) => a[b.id] === b.answer).length;
    return { assigned: a, correct, total: BUGS.length, allCorrect: correct === BUGS.length };
  };
  const st = stateOf(assigned);
  const pick = (bug: string, l: LayerId) => {
    const next = { ...assigned, [bug]: l };
    setAssigned(next);
    onChange?.(stateOf(next));
  };

  return (
    <div className="w-full" data-widget>
      <ul className="mb-3 space-y-1 text-xs leading-snug text-ink-2">
        {LAYERS.map((l) => (
          <li key={l.id}>
            <strong className="text-ink">{l.label}.</strong> {l.sub}
          </li>
        ))}
      </ul>
      <div className="space-y-3">
        {BUGS.map((b) => {
          const a = assigned[b.id];
          return (
            <div key={b.id} className="rounded-xl border border-line bg-surface p-2.5">
              <p className="text-[0.88rem] leading-snug text-ink">{b.text}</p>
              <div role="radiogroup" aria-label={`Where is this caught first: ${b.text}`} className="mt-2 flex flex-wrap gap-1.5">
                {LAYERS.map((l) => {
                  const on = a === l.id;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => pick(b.id, l.id)}
                      className={`min-h-10 flex-auto rounded-full border px-3 text-xs font-medium transition-colors ${
                        on ? (l.id === b.answer ? "border-[var(--good)] bg-tint text-ink" : "border-[var(--bad)] bg-tint text-ink") : "border-line bg-surface text-ink-2 hover:bg-surface-2"
                      }`}
                    >
                      {l.label}
                    </button>
                  );
                })}
              </div>
              {a && (
                <p className={`mt-1.5 text-xs leading-snug ${a === b.answer ? "text-[var(--good)]" : "text-[var(--bad)]"}`} aria-live="polite">
                  {a === b.answer ? `Right. ${b.why}` : "Not the cheapest place to catch it. Think about what the bug needs in order to show up."}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-center">
        <Readout label="Placed correctly" value={`${st.correct} / ${st.total}`} accent />
      </div>
      <Toy>Four layers, as one common way to split testing. Real teams add more (integration, system, field trials) and argue over where some bugs belong.</Toy>
    </div>
  );
}

export function checkPyramid(state: unknown, goal: Record<string, unknown>) {
  const s = state as PyramidState | undefined;
  if (!s) return false;
  if (goal.allCorrect === true) return s.allCorrect;
  if (typeof goal.minCorrect === "number") return s.correct >= goal.minCorrect;
  return true;
}

// ───────────────────────── production test flow ─────────────────────────

export interface TestFlowProps {
  rates?: number[];
}

export interface TestFlowState {
  rates: number[];
  fpy: number;
  perThousandGood: number;
  perThousandRework: number;
  worstStation: number;
}

const STATIONS = [
  { name: "Visual and solder inspection", catches: "Missing parts, bridges, parts on backwards. A camera (AOI) does this on a real line.", seconds: 4 },
  { name: "Power-on current check", catches: "Shorts and wrong-value parts: the board draws too much or too little current.", seconds: 3 },
  { name: "Program and boot", catches: "Bad flash, no clock, a chip that will not start. Loads the firmware and checks it runs.", seconds: 12 },
  { name: "Sensors respond", catches: "The moisture and light sensors answer and read plausible values.", seconds: 4 },
  { name: "Radio check", catches: "The radio advertises and a reference receiver hears it at a sensible signal level.", seconds: 8 },
];

const fmtPct = (x: number) => `${(x * 100).toFixed(1)}%`;

/** A five-station production test line: pass rates multiply into first-pass yield. */
export function TestFlow({ props, onChange }: WidgetProps<TestFlowProps>) {
  const [rates, setRates] = useState<number[]>(props.rates ?? [99, 98.5, 99.5, 99, 98]);

  const stateOf = (r: number[]): TestFlowState => {
    const f = firstPassYield(r.map((x) => x / 100));
    const worst = r.reduce((wi, x, i, a) => (x < a[wi] ? i : wi), 0);
    return { rates: r, fpy: f, perThousandGood: Math.round(f * 1000), perThousandRework: 1000 - Math.round(f * 1000), worstStation: worst };
  };
  const st = stateOf(rates);
  const set = (i: number, v: number) => {
    const next = rates.slice();
    next[i] = v;
    setRates(next);
    onChange?.(stateOf(next));
  };

  // boards remaining after each station, out of 1000 that start
  const rows = STATIONS.map((s, i) => {
    const before = rates.slice(0, i).reduce((a, r) => a * (r / 100), 1000);
    const after = before * (rates[i] / 100);
    return { ...s, before, after, lost: before - after };
  });
  const seconds = STATIONS.reduce((a, s) => a + s.seconds, 0);

  return (
    <div className="w-full" data-widget>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={r.name} className={`rounded-xl border p-2.5 ${i === st.worstStation ? "border-[var(--brand)]" : "border-line"} bg-surface`}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-[0.88rem] font-medium text-ink">
                {i + 1}. {r.name}
              </p>
              <span className="shrink-0 font-mono text-xs tabular-nums text-ink-3">{r.seconds} s</span>
            </div>
            <p className="mt-0.5 text-xs leading-snug text-ink-3">{r.catches}</p>
            <Slider label="Pass rate at this station" value={rates[i]} min={90} max={100} step={0.5} onChange={(v) => set(i, v)} format={(v) => `${v.toFixed(1)}%`} />
            <div className="mt-1 flex items-center gap-2 text-xs text-ink-3">
              <span className="w-24 shrink-0">{Math.round(r.after)} of 1000 left</span>
              <div className="flex-1">
                <Meter frac={r.after / 1000} tone={i === st.worstStation ? "brand" : "muted"} label={`Boards remaining after station ${i + 1}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Readout label="First-pass yield" value={fmtPct(st.fpy)} accent />
        <Readout label="Good first time (of 1,000)" value={st.perThousandGood} />
        <Readout label="Sent to rework" value={st.perThousandRework} />
        <Readout label="Test time per board" value={`${seconds} s`} />
      </div>
      <div className="mt-3">
        <Note>First-pass yield is the share of boards that pass every station the first time: all the pass rates multiplied. Five stations at 98 to 99.5% already lose about {Math.round((1 - st.fpy) * 100)} boards in every hundred.</Note>
      </div>
      <Toy>Made-up pass rates and times for a made-up line. Real yields come from measuring a real line, and they differ by station, by shift and by supplier lot.</Toy>
    </div>
  );
}

/** goal: { minFpy } (0 to 1). */
export function checkTestFlow(state: unknown, goal: Record<string, unknown>) {
  const s = state as TestFlowState | undefined;
  if (!s) return false;
  if (typeof goal.minFpy === "number" && s.fpy < goal.minFpy) return false;
  if (typeof goal.maxFpy === "number" && s.fpy > goal.maxFpy) return false;
  return true;
}
