"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { BLUE } from "../gpu/ui";
import { Btn, Note, Readout, Slider } from "./ui";
import { BOUNCE_SAMPLE_MS, BOUNCE_TOTAL_MS, PRESS_AT_MS, RELEASE_AT_MS, bounceTrace, debounce, risingEdges, type Bit } from "./sim";

export interface BounceState {
  seed: number;
  debounceMs: number;
  /** presses a naive edge counter sees on the raw contact */
  rawPresses: number;
  /** presses seen after debouncing */
  presses: number;
  /** length of the press bounce burst, ms */
  burstMs: number;
  ok: boolean;
}

const W = 360;
const PL = 6;
const PW = W - 2 * PL;
const x = (i: number, n: number) => PL + (i / (n - 1)) * PW;

function stepPath(s: Bit[], top: number, bottom: number): string {
  const n = s.length;
  let d = "";
  let prev: number | null = null;
  s.forEach((v, i) => {
    const y = v ? top : bottom;
    if (prev === null) d = `M${x(i, n).toFixed(1)} ${y}`;
    else if (y !== prev) d += ` L${x(i, n).toFixed(1)} ${prev} L${x(i, n).toFixed(1)} ${y}`;
    prev = y;
  });
  return `${d} L${x(n - 1, n).toFixed(1)} ${prev}`;
}

/** Longest burst: time from the first to the last edge of the press bounce. */
function burstLength(raw: Bit[]): number {
  const from = Math.round(PRESS_AT_MS / BOUNCE_SAMPLE_MS);
  const to = Math.round((RELEASE_AT_MS - 2) / BOUNCE_SAMPLE_MS);
  let first = -1;
  let lastEdge = -1;
  for (let i = from; i < to; i++) {
    if (raw[i] !== raw[i - 1]) {
      if (first < 0) first = i;
      lastEdge = i;
    }
  }
  return first < 0 ? 0 : (lastEdge - first) * BOUNCE_SAMPLE_MS;
}

/** A mechanical button pressed once, its bouncing contact, and a counter-based debouncer. */
export function Bounce({ onChange }: WidgetProps<Record<string, never>>) {
  const [seed, setSeed] = useState(4);
  const [ms, setMs] = useState(0);
  const raw = bounceTrace(seed);
  const deb = debounce(raw, Math.max(1, Math.round(ms / BOUNCE_SAMPLE_MS)));
  const rawPresses = risingEdges(raw);
  const outSeq = ms === 0 ? raw : deb;
  const presses = risingEdges(outSeq);
  const burst = burstLength(raw);
  const snap = (sd: number, m: number): BounceState => {
    const r = bounceTrace(sd);
    const d = m === 0 ? r : debounce(r, Math.max(1, Math.round(m / BOUNCE_SAMPLE_MS)));
    return { seed: sd, debounceMs: m, rawPresses: risingEdges(r), presses: risingEdges(d), burstMs: burstLength(r), ok: risingEdges(d) === 1 };
  };
  const set = (sd = seed, m = ms) => {
    setSeed(sd);
    setMs(m);
    onChange?.(snap(sd, m));
  };
  // when does the debounced output first rise? (latency)
  const firstRise = outSeq.findIndex((v, i) => v === 1 && (i === 0 || outSeq[i - 1] === 0));
  const firstRaw = raw.findIndex((v) => v === 1);
  const latency = firstRise >= 0 && firstRaw >= 0 ? (firstRise - firstRaw) * BOUNCE_SAMPLE_MS : 0;

  return (
    <div className="w-full" data-widget="digi-bounce">
      <div className="rounded-xl border border-line bg-surface p-2">
        <svg viewBox="0 0 360 150" role="img" aria-label={`A button pressed at ${PRESS_AT_MS} ms and released at ${RELEASE_AT_MS} ms. The raw contact signal bounces: a naive edge counter sees ${rawPresses} presses. After debouncing with ${ms} ms it sees ${presses}.`} className="block w-full">
          <text x={PL} y={14} fontSize={14} fill="var(--ink-2)" fontFamily="var(--font-mono, monospace)">raw contact</text>
          <path d={stepPath(raw, 20, 56)} fill="none" stroke={BLUE} strokeWidth={1.8} strokeLinejoin="round" />
          <text x={PL} y={88} fontSize={14} fill="var(--ink-2)" fontFamily="var(--font-mono, monospace)">{ms === 0 ? "no debouncing (same as raw)" : `debounced: stable for ${ms} ms`}</text>
          <path d={stepPath(outSeq, 94, 130)} fill="none" stroke="var(--brand)" strokeWidth={2.4} strokeLinejoin="round" />
          {[0, 10, 20, 30, 40, 50, 60].map((t) => (
            <g key={t}>
              <line x1={x((t / BOUNCE_TOTAL_MS) * (raw.length - 1), raw.length)} x2={x((t / BOUNCE_TOTAL_MS) * (raw.length - 1), raw.length)} y1={136} y2={141} stroke="var(--line-strong)" />
            </g>
          ))}
          <text x={PL} y={149} fontSize={14} fill="var(--ink-3)" fontFamily="var(--font-mono, monospace)">0 ms</text>
          <text x={W - PL} y={149} textAnchor="end" fontSize={14} fill="var(--ink-3)" fontFamily="var(--font-mono, monospace)">60 ms</text>
        </svg>
      </div>
      <div className="mt-3">
        <Slider label="Debounce time: the signal must stay the same this long" value={ms} min={0} max={30} step={1} onChange={(v) => set(seed, v)} format={(v) => (v === 0 ? "off" : `${v} ms`)} />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Btn onClick={() => set(seed + 1, ms)}>New press (different bounce)</Btn>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Presses a naive counter sees" value={rawPresses} />
        <Readout label="Presses after debouncing" value={presses} accent />
        <Readout label="This bounce lasted" value={`${burst.toFixed(1)} ms`} />
        {ms > 0 && presses >= 1 && <Readout label="Added delay" value={`${latency.toFixed(1)} ms`} />}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <Note tone={presses === 1 ? "plain" : "accent"}>
          {ms === 0
            ? `One physical press, ${rawPresses} rising edges: the metal contacts spring apart and touch again several times. Software or hardware that counts edges sees ${rawPresses} presses.`
            : presses === 1
              ? `Debounced: one press. The output waits until the contact has been stable for ${ms} ms, so every bounce shorter than that is ignored. The price is ${latency.toFixed(1)} ms of delay.`
              : `Still ${presses} presses: a pause inside the bounce lasted longer than ${ms} ms, so the output followed it. Raise the debounce time above the longest gap between bounces.`}
        </Note>
        <p className="text-center text-xs text-ink-3">Toy model: random bursts of up to a few milliseconds, sampled every {BOUNCE_SAMPLE_MS} ms. Real buttons vary from well under 1 ms to tens of ms; check the datasheet or look at it on an oscilloscope.</p>
      </div>
    </div>
  );
}

/** goal: any of { presses, rawPresses, ok } plus minMs / maxMs for the debounce time */
export function checkBounce(state: unknown, goal: Record<string, unknown>) {
  const s = state as BounceState | undefined;
  if (!s) return false;
  for (const k of ["presses", "ok"] as const) if (k in goal && s[k] !== goal[k]) return false;
  if (typeof goal.minMs === "number" && s.debounceMs < goal.minMs) return false;
  if (typeof goal.maxMs === "number" && s.debounceMs > goal.maxMs) return false;
  return Object.keys(goal).length > 0;
}
