"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { BLUE, Caption, ORANGE, Note, Readout, Seg, Slider, Stepper, ToyNote, fmtAmps, fmtSec } from "./ui";
import { SLEEP_MODES, powerPlan, simulateRtos, type RtosTask } from "./sim";

// ───────────────────────────── emb-rtos: priority inversion and inheritance ─────────────────────────────

const TOTAL = 20;
const COLORS: Record<string, string> = { H: "var(--brand)", M: ORANGE, L: BLUE };
const WORDS: Record<string, string> = { H: "High", M: "Medium", L: "Low", idle: "idle" };
const ROWS = ["H", "M", "L"] as const;

export interface RtosProps {
  inherit?: boolean;
  mediumWork?: number;
  /** Ticks after High arrives. */
  deadline?: number;
  task?: string;
}

export interface RtosState {
  inherit: boolean;
  mediumWork: number;
  highResponse: number | null;
  meetsDeadline: boolean;
  run: string[];
}

function buildTasks(mediumWork: number): RtosTask[] {
  return [
    { id: "L", name: "Low: logger", prio: 1, arrive: 0, work: 5, lock: [1, 4] },
    { id: "M", name: "Medium: display", prio: 2, arrive: 3, work: mediumWork },
    { id: "H", name: "High: motor control", prio: 3, arrive: 2, work: 3, lock: [0, 2] },
  ];
}

function evaluate(inherit: boolean, mediumWork: number, deadline: number) {
  const tasks = buildTasks(mediumWork);
  const r = simulateRtos(tasks, { inherit, total: TOTAL });
  const highResponse = r.response.H;
  const meets = highResponse !== null && highResponse <= deadline;
  return { tasks, r, highResponse, meets };
}

/** Ticks as contiguous [from, to) ranges where pred holds. */
function ranges(n: number, pred: (i: number) => boolean): [number, number][] {
  const out: [number, number][] = [];
  let s = -1;
  for (let i = 0; i <= n; i++) {
    const on = i < n && pred(i);
    if (on && s < 0) s = i;
    if (!on && s >= 0) {
      out.push([s, i]);
      s = -1;
    }
  }
  return out;
}

export function Rtos({ props, onChange, revealed }: WidgetProps<RtosProps>) {
  const deadline = props.deadline ?? 7;
  const [inherit, setInherit] = useState(Boolean(props.inherit));
  const [mediumWork, setMediumWork] = useState(Math.max(0, Math.min(10, props.mediumWork ?? 6)));
  const locked = Boolean(revealed);

  const { tasks, r, highResponse, meets } = evaluate(inherit, mediumWork, deadline);
  const report = (i: boolean, m: number) => {
    const e = evaluate(i, m, deadline);
    onChange?.({ inherit: i, mediumWork: m, highResponse: e.highResponse, meetsDeadline: e.meets, run: e.r.run } satisfies RtosState);
  };
  const pickInherit = (v: boolean) => {
    setInherit(v);
    report(v, mediumWork);
  };
  const pickMedium = (v: number) => {
    setMediumWork(v);
    report(inherit, v);
  };

  // SVG geometry
  const X0 = 34;
  const TW = 16;
  const BAR = 24;
  const rowY: Record<string, number> = { H: 28, M: 64, L: 100 };
  const xOf = (t: number) => +(X0 + t * TW).toFixed(1);

  // Mutex holding: ticks where a lock-owning task runs inside its locked work range.
  const holds: Record<string, boolean[]> = { H: [], M: [], L: [] };
  const doneCount: Record<string, number> = { H: 0, M: 0, L: 0 };
  r.run.forEach((id, t) => {
    for (const k of ROWS) holds[k][t] = false;
    if (id === "idle") return;
    const task = tasks.find((x) => x.id === id);
    if (task?.lock && doneCount[id] >= task.lock[0] && doneCount[id] < task.lock[1]) holds[id][t] = true;
    doneCount[id]++;
  });

  const absDeadline = 2 + deadline;
  const blockedRanges = ranges(TOTAL, (t) => r.states.H[t] === "blocked");
  const boostRanges = ranges(TOTAL, (t) => r.states.L[t] !== "done" && r.states.L[t] !== "-" && r.effPrio.L[t] > 1);

  const parts: string[] = [];
  let s0 = 0;
  for (let t = 1; t <= TOTAL; t++) {
    if (t === TOTAL || r.run[t] !== r.run[s0]) {
      parts.push(`ticks ${s0} to ${t}: ${WORDS[r.run[s0]] ?? r.run[s0]}`);
      s0 = t;
    }
  }
  const aria = `Schedule over ${TOTAL} ticks, ${inherit ? "with" : "without"} priority inheritance. ${parts.join("; ")}. High finishes ${highResponse === null ? "never" : `${highResponse} ticks after it arrives`}; deadline ${deadline} ticks.`;

  const missedBy = highResponse === null ? null : highResponse - deadline;

  return (
    <div className="w-full">
      {props.task && <p className="mb-2 text-[0.92rem] leading-snug text-ink">{props.task}</p>}
      <fieldset disabled={locked} className="m-0 flex min-w-0 flex-wrap items-end gap-x-4 gap-y-3 border-0 p-0">
        <div className="flex flex-col items-start gap-1">
          <Caption>Mutex protocol</Caption>
          <Seg
            label="Mutex protocol"
            value={inherit ? "inherit" : "plain"}
            onChange={(v) => pickInherit(v === "inherit")}
            options={[
              { value: "plain", label: "Plain mutex" },
              { value: "inherit", label: "Priority inheritance" },
            ]}
          />
        </div>
        <div className="flex flex-col items-start gap-1">
          <Caption>Medium&apos;s work (ticks)</Caption>
          <Stepper label="Medium's work" value={mediumWork} min={0} max={10} onChange={pickMedium} disabled={locked} />
        </div>
      </fieldset>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <svg viewBox="0 0 360 214" className="w-full" role="img" aria-label={aria}>
          {ROWS.map((k) => (
            <text key={k} x={4} y={rowY[k] + 17} fontSize={14} fontWeight={600} fill="var(--ink)" fontFamily="var(--font-mono, monospace)">
              {k}
            </text>
          ))}
          {Array.from({ length: TOTAL + 1 }, (_, t) => (
            <line key={t} x1={xOf(t)} x2={xOf(t)} y1={22} y2={130} stroke="var(--line-strong)" strokeWidth={t % 5 === 0 ? 1 : 0.5} opacity={t % 5 === 0 ? 0.8 : 0.4} />
          ))}
          {ROWS.map((k) =>
            r.states[k].map((s, t) => {
              if (s === "-" || s === "done") return null;
              const x = xOf(t) + 1;
              const w = TW - 2;
              if (s === "run") return <rect key={`${k}${t}`} x={x} y={rowY[k]} width={w} height={BAR} rx={3} fill={COLORS[k]} />;
              if (s === "ready") return <rect key={`${k}${t}`} x={x} y={rowY[k]} width={w} height={BAR} rx={3} fill={COLORS[k]} fillOpacity={0.16} stroke={COLORS[k]} strokeWidth={1.5} />;
              return <rect key={`${k}${t}`} x={x} y={rowY[k]} width={w} height={BAR} rx={3} fill="var(--bad)" fillOpacity={0.14} stroke="var(--bad)" strokeWidth={1.5} strokeDasharray="3 2" />;
            }),
          )}
          {ROWS.map((k) =>
            holds[k].map((h, t) => (h ? <line key={`l${k}${t}`} x1={xOf(t) + 1} x2={xOf(t + 1) - 1} y1={rowY[k] + BAR + 4} y2={rowY[k] + BAR + 4} stroke="var(--ink)" strokeWidth={4} strokeLinecap="round" /> : null)),
          )}
          {absDeadline > 0 && absDeadline <= TOTAL && (
            <g>
              <line x1={xOf(absDeadline)} x2={xOf(absDeadline)} y1={20} y2={132} stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="4 3" />
              <text x={Math.max(48, Math.min(312, xOf(absDeadline)))} y={15} fontSize={14} textAnchor="middle" fill="var(--ink)">
                H deadline
              </text>
            </g>
          )}
          <line x1={X0} x2={X0 + TOTAL * TW} y1={136} y2={136} stroke="var(--ink-3)" strokeWidth={1} />
          {[0, 5, 10, 15].map((t) => (
            <text key={t} x={Math.max(X0 + 4, xOf(t))} y={154} fontSize={14} textAnchor="middle" fill="var(--ink-2)">
              {t}
            </text>
          ))}
          <text x={Math.min(356, xOf(20) + 4)} y={154} fontSize={14} textAnchor="end" fill="var(--ink-2)">
            20 ticks
          </text>
          {blockedRanges.length > 0 && (
            <g>
              <line x1={xOf(blockedRanges[0][0]) + 1} x2={xOf(blockedRanges[0][1]) - 1} y1={165} y2={165} stroke="var(--bad)" strokeWidth={3} />
              <text x={Math.min(xOf(blockedRanges[0][0]), 176)} y={183} fontSize={14} fill="var(--ink)">
                H waits for the mutex
              </text>
            </g>
          )}
          {inherit && boostRanges.length > 0 && (
            <g>
              <line x1={xOf(boostRanges[0][0]) + 1} x2={xOf(boostRanges[0][1]) - 1} y1={192} y2={192} stroke={BLUE} strokeWidth={3} />
              <text x={Math.min(xOf(boostRanges[0][0]), 150)} y={210} fontSize={14} fill="var(--ink)">
                L runs at High&apos;s priority
              </text>
            </g>
          )}
        </svg>
        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[0.8rem] text-ink-2">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3 w-3 rounded-sm bg-ink-3" />
            running
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3 w-3 rounded-sm border border-ink-3" />
            ready, waiting for the CPU
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-3 w-3 rounded-sm border border-dashed" style={{ borderColor: "var(--bad)" }} />
            blocked on the mutex
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-1 w-4 rounded-full bg-ink" />
            holds the mutex
          </li>
        </ul>
        <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[0.8rem] text-ink-2">
          {tasks
            .slice()
            .sort((a, b) => b.prio - a.prio)
            .map((t) => (
              <li key={t.id} className="flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-3 w-3 rounded-sm" style={{ background: COLORS[t.id] }} />
                {t.id} = {t.name} (priority {t.prio})
              </li>
            ))}
        </ul>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="H response" value={highResponse === null ? "never" : `${highResponse} ticks`} accent />
        <Readout label="Deadline" value={`${deadline} ticks`} />
        <Readout label="Result" value={meets ? "Deadline met" : highResponse === null ? "Missed" : `Missed by ${missedBy} ticks`} />
      </div>
      <div className="mt-3">
        <Note tone={meets ? "accent" : "plain"}>
          {inherit
            ? "Priority inheritance: while High waits for the mutex, Low is boosted to High's priority, so Medium cannot push in front. Low finishes its short critical section, lets go, and High runs."
            : mediumWork === 0
              ? "With no Medium task, Low simply finishes its critical section and High runs soon after. Raise Medium's work to see the inversion."
              : "Priority inversion: High waits for Low, and Medium, which needs no mutex at all, runs ahead of both. Low cannot finish its critical section while Medium has the CPU, so High is stuck behind a less important task."}
        </Note>
      </div>
      <ToyNote>Toy scheduler: one tick = one time slice, no context-switch cost. Higher number = higher priority here (as in FreeRTOS); some RTOSes use the opposite.</ToyNote>
    </div>
  );
}

/** goal: { inherit, meetsDeadline, minMediumWork } */
export function checkRtos(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as RtosState | undefined;
  if (!s) return false;
  if (typeof goal.inherit === "boolean" && s.inherit !== goal.inherit) return false;
  if (typeof goal.meetsDeadline === "boolean" && s.meetsDeadline !== goal.meetsDeadline) return false;
  if (typeof goal.minMediumWork === "number" && !(s.mediumWork >= goal.minMediumWork)) return false;
  return true;
}

// ───────────────────────────── emb-power: sleep modes vs battery life ─────────────────────────────

const WAKE_OPTIONS = [
  { value: 0.1, label: "0.1 s" },
  { value: 1, label: "1 s" },
  { value: 10, label: "10 s" },
  { value: 60, label: "60 s" },
];

const BATTERIES = [
  { value: 220, label: "Coin cell CR2032 (220 mAh, typical)" },
  { value: 2500, label: "2 × AA (2500 mAh, typical)" },
  { value: 1000, label: "LiPo 1000 mAh" },
];

const ACTIVE_MA = 5;

export interface PowerProps {
  modeId?: string;
  activeMs?: number;
  periodS?: number;
  capacityMah?: number;
  task?: string;
}

export interface PowerState {
  modeId: string;
  activeMs: number;
  periodS: number;
  capacityMah: number;
  avgMa: number;
  days: number;
}

function fmtLife(days: number): string {
  if (!Number.isFinite(days)) return "forever";
  const hours = days * 24;
  if (hours < 48) return `${+hours.toFixed(1)} hours`;
  if (days >= 730) return `${(days / 365).toFixed(1)} years`;
  return `${+days.toFixed(1)} days`;
}

function fmtPct(f: number): string {
  const p = f * 100;
  if (p >= 10) return `${p.toFixed(0)}%`;
  if (p >= 0.1) return `${p.toFixed(1)}%`;
  return `${+p.toPrecision(2)}%`;
}

export function Power({ props, onChange, revealed }: WidgetProps<PowerProps>) {
  const [modeId, setModeId] = useState(SLEEP_MODES.some((m) => m.id === props.modeId) ? (props.modeId as string) : "run");
  const [activeMs, setActiveMs] = useState(Math.max(1, Math.min(200, props.activeMs ?? 20)));
  const [periodS, setPeriodS] = useState(props.periodS ?? 1);
  const [capacityMah, setCapacityMah] = useState(props.capacityMah ?? 220);
  const locked = Boolean(revealed);

  const mode = SLEEP_MODES.find((m) => m.id === modeId) ?? SLEEP_MODES[0];
  const plan = (id: string, a: number, p: number, c: number) => powerPlan({ modeId: id, activeMs: a, periodS: p, capacityMah: c, activeMa: ACTIVE_MA });
  const res = plan(modeId, activeMs, periodS, capacityMah);

  const report = (id: string, a: number, p: number, c: number) => {
    const x = plan(id, a, p, c);
    onChange?.({ modeId: id, activeMs: a, periodS: p, capacityMah: c, avgMa: x.avgMa, days: x.days } satisfies PowerState);
  };

  const awakeMs = modeId === "run" ? periodS * 1000 : Math.min(periodS * 1000, activeMs + mode.wakeMs);
  const sleepMa = modeId === "run" ? ACTIVE_MA : mode.mA;

  // Strip: two wake periods, compressed (not to scale). Currents on a log scale.
  const yBase = 96;
  const yOfMa = (ma: number) => {
    const lo = Math.log10(0.0005);
    const hi = Math.log10(ACTIVE_MA);
    return +(yBase - ((Math.log10(Math.max(ma, 0.0005)) - lo) / (hi - lo)) * 56).toFixed(1);
  };
  const ySleep = yOfMa(sleepMa);
  const yAct = yOfMa(ACTIVE_MA);
  const X0 = 30;
  const PW = 160;
  const blockW = modeId === "run" ? PW : 28;

  const aria = `Current over two wake-ups, compressed and not to scale: ${fmtAmps(ACTIVE_MA / 1000)} while awake for ${fmtSec(awakeMs / 1000)}, ${modeId === "run" ? "never sleeping" : `${fmtAmps(mode.mA / 1000)} while asleep`}. Average ${fmtAmps(res.avgMa / 1000)}, battery life ${fmtLife(res.days)}.`;

  return (
    <div className="w-full">
      {props.task && <p className="mb-2 text-[0.92rem] leading-snug text-ink">{props.task}</p>}
      <fieldset disabled={locked} className="m-0 flex min-w-0 flex-col gap-3 border-0 p-0">
        <div className="flex flex-col items-start gap-1">
          <Caption>Sleep mode</Caption>
          <Seg
            label="Sleep mode"
            value={modeId}
            onChange={(v) => {
              setModeId(v);
              report(v, activeMs, periodS, capacityMah);
            }}
            options={SLEEP_MODES.map((m) => ({ value: m.id, label: m.name }))}
          />
        </div>
        <Slider
          label="Awake per wake-up"
          value={activeMs}
          min={1}
          max={200}
          step={1}
          format={(v) => `${v} ms`}
          onChange={(v) => {
            setActiveMs(v);
            report(modeId, v, periodS, capacityMah);
          }}
          disabled={locked}
        />
        <div className="flex flex-col items-start gap-1">
          <Caption>Wake every</Caption>
          <Seg
            label="Wake every"
            value={periodS}
            onChange={(v) => {
              setPeriodS(v);
              report(modeId, activeMs, v, capacityMah);
            }}
            options={WAKE_OPTIONS}
          />
        </div>
        <div className="flex flex-col items-start gap-1">
          <Caption>Battery</Caption>
          <Seg
            label="Battery"
            value={capacityMah}
            onChange={(v) => {
              setCapacityMah(v);
              report(modeId, activeMs, periodS, v);
            }}
            options={BATTERIES}
          />
        </div>
      </fieldset>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {SLEEP_MODES.map((m) => {
          const on = m.id === modeId;
          return (
            <div key={m.id} className={`rounded-xl border p-2.5 text-[0.82rem] leading-snug ${on ? "border-[var(--brand)] bg-tint" : "border-line bg-surface"}`} aria-current={on ? "true" : undefined}>
              <p className="flex flex-wrap items-baseline justify-between gap-x-2 font-semibold text-ink">
                <span>{m.name}</span>
                <span className="font-mono tabular-nums">{fmtAmps(m.mA / 1000)} (typical)</span>
              </p>
              <p className="mt-0.5 text-ink-2">Keeps: {m.keeps}</p>
              <p className="text-ink-2">Wakes on: {m.wakes}</p>
              <p className="text-ink-2">Wake-up time: {m.wakeMs === 0 ? "none" : fmtSec(m.wakeMs / 1000)}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <svg viewBox="0 0 360 150" className="w-full" role="img" aria-label={aria}>
          <line x1={X0} x2={X0} y1={20} y2={yBase} stroke="var(--ink-3)" strokeWidth={1} />
          <line x1={X0} x2={350} y1={yBase} y2={yBase} stroke="var(--ink-3)" strokeWidth={1} />
          {[0, 1].map((k) => {
            const x = X0 + 4 + k * PW;
            return (
              <g key={k}>
                {modeId !== "run" && <line x1={x} x2={x + PW} y1={ySleep} y2={ySleep} stroke="var(--ink-3)" strokeWidth={2.5} />}
                <rect x={x} y={yAct} width={blockW} height={+(yBase - yAct).toFixed(1)} fill="var(--brand)" />
              </g>
            );
          })}
          {modeId !== "run" && (
            <text x={X0 + 4} y={yAct - 6} fontSize={14} fill="var(--ink)">
              {fmtAmps(ACTIVE_MA / 1000)} awake
            </text>
          )}
          {modeId !== "run" && (
            <text x={X0 + 4 + blockW + 6} y={ySleep < 60 ? ySleep + 18 : ySleep - 6} fontSize={14} fill="var(--ink)">
              {fmtAmps(mode.mA / 1000)} asleep
            </text>
          )}
          <text x={X0 + 4} y={yBase + 20} fontSize={14} fill="var(--ink-2)">
            awake {fmtSec(awakeMs / 1000)}
          </text>
          <text x={X0 + 4 + PW} y={yBase + 20} fontSize={14} fill="var(--ink-2)">
            next wake-up
          </text>
          <text x={4} y={14} fontSize={14} fill="var(--ink-2)">
            current (log scale){modeId === "run" ? `: always ${fmtAmps(ACTIVE_MA / 1000)}` : ""}
          </text>
          <text x={350} y={142} fontSize={14} textAnchor="end" fill="var(--ink-3)">
            not to scale
          </text>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Awake" value={fmtPct(res.duty)} />
        <Readout label="Average current" value={fmtAmps(res.avgMa / 1000)} />
        <Readout label="Battery life" value={fmtLife(res.days)} accent />
        <Readout label="Charge used asleep" value={fmtPct(res.sleepShare)} />
      </div>
      <div className="mt-3">
        <Note>Battery life here is ideal: capacity ÷ average current. Real cells lose capacity to self-discharge, cold and high pulse currents, and the regulator and sensors draw current too.</Note>
      </div>
      <ToyNote>Typical figures for a small 32-bit MCU; real parts differ by several times.</ToyNote>
    </div>
  );
}

/** goal: { minDays, modeId, maxAvgMa } */
export function checkPower(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as PowerState | undefined;
  if (!s) return false;
  if (typeof goal.minDays === "number" && !(s.days >= goal.minDays)) return false;
  if (typeof goal.modeId === "string" && s.modeId !== goal.modeId) return false;
  if (typeof goal.maxAvgMa === "number" && !(s.avgMa <= goal.maxAvgMa)) return false;
  return true;
}
