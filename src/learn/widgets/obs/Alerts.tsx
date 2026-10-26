"use client";

import React, { useState } from "react";
import { BellRing } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Segmented, Slider, noise, useReport } from "./kit";

/**
 * One day of a checkout service, sampled every five minutes, with one real incident (a payment
 * provider failing) and a few harmless wobbles. Pick what to alert on (CPU, a cause, or the error
 * rate, a symptom), a threshold, and how long the condition must hold. The tally says how many
 * times a person would be woken, how many of those were false, and whether the real incident
 * paged anyone at all.
 */

type Signal = "cpu" | "errors";
const POINTS = 288;
const STEP_MIN = 5;
const INCIDENT_FROM = 24;
const INCIDENT_TO = 33;

const BLIPS: Record<number, number> = { 60: 3.8, 130: 3.1, 175: 4.2, 240: 3.6 };
const INCIDENT = [4, 8.6, 9.2, 8.8, 9.4, 9.0, 8.7, 9.1, 6.5, 2.0];

export function errorSeries(): number[] {
  return Array.from({ length: POINTS }, (_, i) => {
    if (i >= INCIDENT_FROM && i <= INCIDENT_TO) return INCIDENT[i - INCIDENT_FROM];
    if (BLIPS[i]) return BLIPS[i];
    return Math.round((0.15 + 0.2 * noise(3, i)) * 100) / 100;
  });
}
export function cpuSeries(): number[] {
  return Array.from({ length: POINTS }, (_, i) => {
    const batch = (i >= 48 && i <= 51) || (i >= 150 && i <= 153) || (i >= 210 && i <= 213);
    if (batch) return Math.round(90 + 6 * noise(6, i));
    if (i === 70) return 86;
    return Math.round(30 + 18 * noise(5, i));
  });
}
const ERR = errorSeries();
const CPU = cpuSeries();

/** indexes at which the alert starts firing */
export function firings(series: number[], threshold: number, k: number): number[] {
  const out: number[] = [];
  let armed = true;
  for (let i = k - 1; i < series.length; i++) {
    const hold = series.slice(i - k + 1, i + 1).every((v) => v > threshold);
    if (hold && armed) {
      out.push(i);
      armed = false;
    } else if (!hold) armed = true;
  }
  return out;
}

export interface AlertsProps {
  signal?: Signal;
  threshold?: number;
  k?: number;
  lockSignal?: boolean;
}

export interface AlertsState {
  signal: Signal;
  threshold: number;
  k: number;
  pages: number;
  falsePages: number;
  caught: boolean;
  delayMin: number | null;
}

export function Alerts({ props, onChange, revealed }: WidgetProps<AlertsProps>) {
  const [signal, setSignal] = useState<Signal>(props.signal ?? "cpu");
  const [thr, setThr] = useState<Record<Signal, number>>({ cpu: props.signal === "cpu" || !props.signal ? props.threshold ?? 80 : 80, errors: props.signal === "errors" ? props.threshold ?? 2 : 2 });
  const [k, setK] = useState(props.k ?? 1);
  const threshold = thr[signal];
  const series = signal === "cpu" ? CPU : ERR;
  const fired = firings(series, threshold, k);
  const real = fired.filter((i) => i >= INCIDENT_FROM && i <= INCIDENT_TO + 2);
  const falsePages = fired.length - real.length;
  const caught = real.length > 0;
  const delayMin = caught ? (real[0] - INCIDENT_FROM) * STEP_MIN : null;
  useReport(onChange, { signal, threshold, k, pages: fired.length, falsePages, caught, delayMin } satisfies AlertsState, `${signal}|${threshold}|${k}`);

  const W = 360;
  const H = 150;
  const left = 30;
  const top = 8;
  const bottom = 20;
  const max = signal === "cpu" ? 100 : 12;
  const x = (i: number) => left + (i / (POINTS - 1)) * (W - left - 6);
  const y = (v: number) => top + (1 - Math.min(v, max) / max) * (H - top - bottom);
  const pts = series.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const unit = signal === "cpu" ? "%" : "%";

  return (
    <div className="w-full max-w-2xl">
      {!props.lockSignal && (
        <div className="flex justify-center">
          <Segmented
            label="What to alert on"
            value={signal}
            disabled={revealed}
            onChange={setSignal}
            options={[
              { id: "cpu", label: "CPU usage (a cause)" },
              { id: "errors", label: "Checkout error rate (a symptom)" },
            ]}
          />
        </div>
      )}
      <div className="mt-2 grid gap-x-4 min-[560px]:grid-cols-[1.3fr_1fr] min-[560px]:items-end">
        <Slider
          label={`Page me when it is above`}
          value={threshold}
          min={signal === "cpu" ? 50 : 0.5}
          max={signal === "cpu" ? 100 : 10}
          step={signal === "cpu" ? 5 : 0.5}
          format={(v) => `${v}${unit}`}
          onChange={(v) => setThr({ ...thr, [signal]: v })}
          disabled={revealed}
        />
        <div>
          <p className="text-xs text-ink-3">…and has stayed above for</p>
          <Segmented
            label="How long the condition must hold"
            value={k}
            disabled={revealed}
            onChange={setK}
            className="mt-1"
            options={[
              { id: 1, label: "5 min" },
              { id: 2, label: "10" },
              { id: 3, label: "15" },
              { id: 4, label: "20" },
            ]}
          />
        </div>
      </div>

      <div className="mt-2 rounded-xl border border-line bg-surface p-2">
        <Caption className="px-1">{signal === "cpu" ? "CPU usage" : "Checkout error rate"} over 24 hours</Caption>
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`24-hour chart with ${fired.length} alert pages, ${falsePages} of them false`}>
          <rect x={x(INCIDENT_FROM)} y={top} width={x(INCIDENT_TO + 1) - x(INCIDENT_FROM)} height={H - top - bottom} fill="var(--bad)" opacity={0.12} />
          <text x={x(INCIDENT_TO + 1) + 4} y={top + 9} fontSize={8.5} fill="var(--bad)">
            real incident
          </text>
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line x1={left} x2={W - 6} y1={y(max * f)} y2={y(max * f)} stroke="var(--line)" />
              <text x={left - 4} y={y(max * f) + 3} textAnchor="end" fontSize={9} fill="var(--ink-3)" fontFamily="var(--font-mono, monospace)">
                {Math.round(max * f)}
              </text>
            </g>
          ))}
          {[0, 6, 12, 18, 24].map((h) => (
            <text key={h} x={left + (h / 24) * (W - left - 6)} y={H - 6} fontSize={9} fill="var(--ink-3)" textAnchor={h === 24 ? "end" : h === 0 ? "start" : "middle"}>
              {String(h % 24).padStart(2, "0")}:00
            </text>
          ))}
          <polyline points={pts} fill="none" stroke="var(--brand)" strokeWidth={1.4} strokeLinejoin="round" />
          <line x1={left} x2={W - 6} y1={y(threshold)} y2={y(threshold)} stroke="var(--ink)" strokeDasharray="5 3" strokeWidth={1.2} />
          {fired.map((i) => {
            const isReal = i >= INCIDENT_FROM && i <= INCIDENT_TO + 2;
            return <line key={i} x1={x(i)} x2={x(i)} y1={top} y2={H - bottom} stroke={isReal ? "var(--good)" : "var(--bad)"} strokeWidth={2} />;
          })}
        </svg>
        <p className="px-1 pb-1 text-[11px] text-ink-3">Vertical bars are pages: red = woke someone for nothing, green = the real incident.</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" aria-live="polite">
        <Readout label="Pages" value={fired.length} />
        <Readout label="False alarms" value={falsePages} accent={falsePages === 0} />
        <Readout label="Real incident" value={caught ? `paged after ${delayMin} min` : "never paged"} accent={caught} />
      </div>
      <Note tone={!caught ? "bad" : falsePages > 0 ? "neutral" : "good"} className="mt-2">
        <span className="flex items-start gap-2">
          <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" />
          {!caught
            ? signal === "cpu"
              ? "CPU never moved: the payment provider was failing, and the servers were just waiting. An alert on a cause you guessed in advance missed the outage entirely."
              : "The threshold is too high for this incident, so nobody heard about it. Lower it, or this is a real outage with silent alarms."
            : falsePages > 0
              ? `The incident was caught, but ${falsePages} other page${falsePages === 1 ? "" : "s"} woke someone for something harmless. After a few weeks of that, people start ignoring the pager.`
              : `Only the real incident paged, ${delayMin === 0 ? "immediately" : `${delayMin} minutes in`}. That is a pager people trust.`}
        </span>
      </Note>
    </div>
  );
}

/** goal: { caught: true, maxFalse: 0, signal? } */
export function checkAlerts(state: unknown, goal: Record<string, unknown>) {
  const s = state as AlertsState | undefined;
  if (!s) return false;
  if (goal.caught === true && !s.caught) return false;
  if (typeof goal.maxFalse === "number" && s.falsePages > goal.maxFalse) return false;
  if (typeof goal.signal === "string" && s.signal !== goal.signal) return false;
  if (typeof goal.maxDelay === "number" && (s.delayMin === null || s.delayMin > goal.maxDelay)) return false;
  return ["caught", "maxFalse", "signal", "maxDelay"].some((k) => k in goal);
}
