"use client";

import React, { useEffect, useReducer, useRef } from "react";
import { Keyboard, Pause, Play, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Readout, Seg } from "./ui";

export interface InterruptsProps {
  /** "polling", "interrupt", or "choose" (the learner switches). Default "choose". */
  mode?: "polling" | "interrupt" | "choose";
  /** Polling: check the keyboard every n ticks. Default 4. */
  pollEvery?: number;
  /** Let the learner change how often polling checks. */
  tunePolling?: boolean;
  /** Letters the key button types, in turn. Default "HELLO". */
  text?: string;
}

type Kind = "work" | "check" | "handle";

interface Sim {
  mode: "polling" | "interrupt";
  pollEvery: number;
  ticks: number;
  line: Kind[];
  pending: { ch: string; at: number }[];
  found: { ch: string; at: number }[];
  sincePoll: number;
  handled: number;
  wasted: number;
  work: number;
  waitSum: number;
  typed: string;
  presses: number;
  status: string;
  /** Keep an event message on screen until this tick. */
  holdUntil: number;
  running: boolean;
  version: number;
}

export interface InterruptsState {
  mode: "polling" | "interrupt";
  handled: number;
  wasted: number;
  ticks: number;
  /** Average ticks a key waited before the program got it. */
  avgWait: number;
  /** Share of ticks spent on useful work (0–1). */
  useful: number;
}

const LINE = 32;

function freshSim(mode: Sim["mode"], pollEvery: number, version: number): Sim {
  return { mode, pollEvery, ticks: 0, line: [], pending: [], found: [], sincePoll: 0, handled: 0, wasted: 0, work: 0, waitSum: 0, typed: "", presses: 0, status: "Working on its main job.", holdUntil: 0, running: true, version };
}

function tick(s: Sim): Sim {
  const t = s.ticks + 1;
  const push = (k: Kind) => [...s.line, k].slice(-LINE);
  // a key that was found (polling) or that raised an interrupt gets handled this tick
  const queue = s.mode === "interrupt" ? s.pending : s.found;
  if (queue.length > 0) {
    const [k, ...rest] = queue;
    const base = { ...s, ticks: t, holdUntil: t + 4, line: push("handle"), handled: s.handled + 1, waitSum: s.waitSum + (t - k.at), typed: (s.typed + k.ch).slice(-14), version: s.version + 1 };
    return s.mode === "interrupt"
      ? { ...base, pending: rest, status: `Interrupt! The keyboard signalled, so the CPU paused its work, ran the key handler for “${k.ch}”, and went straight back.` }
      : { ...base, found: rest, status: `Handling “${k.ch}”, found on the last check. It waited ${t - k.at} ticks.` };
  }
  if (s.mode === "polling" && s.sincePoll >= s.pollEvery - 1) {
    const got = s.pending.length > 0;
    return {
      ...s,
      ticks: t,
      line: push("check"),
      sincePoll: 0,
      holdUntil: got ? t + 1 : s.holdUntil,
      wasted: s.wasted + (got ? 0 : 1),
      found: got ? [...s.found, ...s.pending] : s.found,
      pending: got ? [] : s.pending,
      status: got ? "Checking the keyboard: a key is waiting!" : "Checking the keyboard… nothing. That tick was wasted.",
    };
  }
  return { ...s, ticks: t, line: push("work"), work: s.work + 1, sincePoll: s.sincePoll + 1, status: s.pending.length ? "Working, unaware a key is waiting." : t <= s.holdUntil ? s.status : "Working on its main job." };
}

type Action = { type: "tick" } | { type: "press"; ch: string } | { type: "mode"; mode: Sim["mode"] } | { type: "poll"; n: number } | { type: "run"; on: boolean } | { type: "reset" };

function reducer(s: Sim, a: Action): Sim {
  switch (a.type) {
    case "tick":
      return s.running ? tick(s) : s;
    case "press":
      return { ...s, pending: [...s.pending, { ch: a.ch, at: s.ticks }], presses: s.presses + 1, version: s.version + 1 };
    case "mode":
      return freshSim(a.mode, s.pollEvery, s.version + 1);
    case "poll":
      return freshSim(s.mode, a.n, s.version + 1);
    case "run":
      return { ...s, running: a.on };
    case "reset":
      return freshSim(s.mode, s.pollEvery, s.version + 1);
  }
}

const report = (s: Sim): InterruptsState => ({ mode: s.mode, handled: s.handled, wasted: s.wasted, ticks: s.ticks, avgWait: s.handled ? s.waitSum / s.handled : 0, useful: s.ticks ? s.work / s.ticks : 1 });

/** Polling vs interrupts: a CPU doing work while you press keys. Watch the wasted checks and the waiting. */
export function Interrupts({ props, onChange, revealed }: WidgetProps<InterruptsProps>) {
  const choose = (props.mode ?? "choose") === "choose";
  const text = props.text ?? "HELLO";
  const [s, dispatch] = useReducer(reducer, null, () => freshSim(props.mode === "interrupt" ? "interrupt" : "polling", props.pollEvery ?? 4, 0));
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });
  // report only when something meaningful happened (not on every tick)
  const reported = useRef(0);
  useEffect(() => {
    if (s.version === reported.current) return;
    reported.current = s.version;
    cb.current?.(report(s));
  }, [s]);

  useEffect(() => {
    if (!s.running) return;
    const id = setInterval(() => dispatch({ type: "tick" }), 220);
    return () => clearInterval(id);
  }, [s.running]);

  const locked = Boolean(revealed);
  const r = report(s);
  const waiting = s.pending.length + s.found.length;
  const colour: Record<Kind, string> = {
    work: "bg-primary",
    check: "bg-[var(--line-strong)]",
    handle: "bg-[var(--ink)]",
  };

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
        {choose && (
          <Seg
            label="How the CPU finds out about keys"
            value={s.mode}
            onChange={(mode) => dispatch({ type: "mode", mode })}
            options={[
              { value: "polling", label: "Polling" },
              { value: "interrupt", label: "Interrupts" },
            ]}
          />
        )}
        {props.tunePolling && s.mode === "polling" && (
          <Seg label="Check every" value={s.pollEvery} onChange={(n) => dispatch({ type: "poll", n })} options={[2, 4, 8].map((n) => ({ value: n, label: `every ${n}` }))} />
        )}
      </div>

      <div className="rounded-xl border border-line bg-surface-2 p-3">
        <div className="flex items-baseline justify-between">
          <Caption>CPU timeline · newest on the right</Caption>
          <span className="font-mono text-[10.5px] text-ink-3">tick {s.ticks}</span>
        </div>
        <div className="mt-2 flex h-8 gap-[2px]" aria-hidden>
          {Array.from({ length: LINE }, (_, i) => {
            const k = s.line[i - (LINE - s.line.length)];
            return <span key={i} className={`flex-1 rounded-[3px] ${k ? colour[k] : "border border-dashed border-line"}`} />;
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-2">
          <Legend c="bg-primary" t="useful work" />
          {s.mode === "polling" && <Legend c="bg-[var(--line-strong)]" t="checking the keyboard" />}
          <Legend c="bg-[var(--ink)]" t="handling a key" />
        </div>
        <p className="mt-2 min-h-[2.6rem] text-[0.86rem] leading-snug text-ink" aria-live="polite">
          {s.status}
        </p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
          <button
            type="button"
            disabled={locked}
            onClick={() => dispatch({ type: "press", ch: text[s.presses % text.length] })}
            className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border-b-4 border-[var(--line-strong)] bg-surface-2 font-mono text-lg font-semibold text-ink transition-all active:translate-y-0.5 active:border-b-2 disabled:opacity-50"
            aria-label={`Press key ${text[s.presses % text.length]}`}
          >
            {text[s.presses % text.length]}
          </button>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
              <Keyboard className="h-4 w-4 text-brand" /> Keyboard
            </p>
            <p className="text-xs text-ink-3">{waiting ? `${waiting} key${waiting === 1 ? "" : "s"} waiting in its buffer` : "Press the key."}</p>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-surface p-3">
          <Caption>Your program received</Caption>
          <p className="mt-1 flex h-8 items-center overflow-hidden rounded-md bg-[#0a0a0a] px-2 font-mono text-[0.95rem] font-semibold tracking-wider text-[#a3e635]">
            {s.typed}
            <span className="ml-px inline-block h-4 w-2 animate-pulse bg-[#a3e635]/70" />
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Useful work" value={`${Math.round(r.useful * 100)}%`} accent />
        {s.mode === "polling" && <Readout label="Wasted checks" value={s.wasted} />}
        <Readout label="Keys handled" value={s.handled} />
        <Readout label="Avg. wait" value={s.handled ? `${r.avgWait.toFixed(1)} ticks` : "–"} />
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <Btn onClick={() => dispatch({ type: "run", on: !s.running })}>
          {s.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {s.running ? "Pause" : "Resume"}
        </Btn>
        <Btn onClick={() => dispatch({ type: "reset" })} disabled={s.ticks === 0}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Btn>
      </div>
    </div>
  );
}

function Legend({ c, t }: { c: string; t: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${c}`} /> {t}
    </span>
  );
}

/** goal: { mode, minHandled } (and optionally { maxWait }: average wait in ticks). */
export function checkInterrupts(state: unknown, goal: Record<string, unknown>) {
  const s = state as InterruptsState | undefined;
  if (!s) return false;
  if (goal.mode !== undefined && s.mode !== goal.mode) return false;
  if (typeof goal.minHandled === "number" && s.handled < goal.minHandled) return false;
  if (typeof goal.maxWait === "number" && s.avgWait > goal.maxWait) return false;
  return true;
}
