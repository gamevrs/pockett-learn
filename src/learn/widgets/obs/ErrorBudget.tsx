"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Segmented, Toggle, useReport } from "./kit";

/**
 * An error budget over a 30-day window. A storm-alert API sends a million alerts a day. An
 * SLO of 99.9% means 1 request in 1,000 may fail, so over the month about 30,000 may. Bad things
 * (small ambient errors plus four incidents) spend that allowance; the chart shows what is left.
 */

const DAYS = 30;
const PER_DAY = 1_000_000;
const AMBIENT = 60;

export interface Incident {
  id: string;
  day: number;
  bad: number;
  label: string;
}
const INCIDENTS: Incident[] = [
  { id: "deploy", day: 6, bad: 9000, label: "Day 6: bad deploy, rolled back in 12 min" },
  { id: "provider", day: 13, bad: 14000, label: "Day 13: SMS gateway outage, 40 min" },
  { id: "failover", day: 19, bad: 4000, label: "Day 19: slow database failover" },
  { id: "deploy2", day: 25, bad: 7000, label: "Day 25: a second bad deploy" },
];
const SLOS = [99, 99.5, 99.9, 99.99];

export function spent(active: string[], upToDay: number): number {
  return AMBIENT * upToDay + INCIDENTS.filter((i) => active.includes(i.id) && i.day <= upToDay).reduce((a, b) => a + b.bad, 0);
}

export interface BudgetState {
  slo: number;
  active: string[];
  allowed: number;
  used: number;
  remainingPct: number;
  exhausted: boolean;
  exhaustedDay: number | null;
}

export function ErrorBudget({ props, onChange, revealed }: WidgetProps<{ slo?: number }>) {
  const [slo, setSlo] = useState(props.slo ?? 99.9);
  const [active, setActive] = useState<string[]>(INCIDENTS.map((i) => i.id));
  const total = DAYS * PER_DAY;
  const allowed = Math.round(total * (1 - slo / 100));
  const used = spent(active, DAYS);
  const remainingPct = Math.round((1 - used / allowed) * 100);
  const exhaustedDay = (() => {
    for (let d = 0; d <= DAYS; d++) if (spent(active, d) > allowed) return d;
    return null;
  })();
  const exhausted = exhaustedDay !== null;
  const minutes = Math.round(DAYS * 24 * 60 * (1 - slo / 100) * 10) / 10;
  useReport(onChange, { slo, active, allowed, used, remainingPct, exhausted, exhaustedDay } satisfies BudgetState, `${slo}|${active.join(",")}`);

  const W = 360;
  const H = 180;
  const left = 36;
  const top = 10;
  const bottom = 22;
  const yMin = -60;
  const x = (d: number) => left + (d / DAYS) * (W - left - 8);
  const y = (v: number) => top + (1 - (Math.max(yMin, Math.min(100, v)) - yMin) / (100 - yMin)) * (H - top - bottom);
  const line: string[] = [];
  for (let d = 0; d <= DAYS; d++) {
    const before = 100 - (spent(active, d - 1 < 0 ? 0 : d - 1) / allowed) * 100;
    const after = 100 - (spent(active, d) / allowed) * 100;
    if (d > 0 && before !== after && INCIDENTS.some((i) => i.day === d && active.includes(i.id))) line.push(`${x(d)},${y(before)}`);
    line.push(`${x(d)},${y(after)}`);
  }

  const tone = remainingPct > 50 ? "good" : remainingPct > 0 ? "accent" : "bad";
  const toggle = (id: string) => setActive(active.includes(id) ? active.filter((a) => a !== id) : [...active, id]);

  return (
    <div className="w-full max-w-2xl">
      <div className="flex justify-center">
        <Segmented label="Availability target (SLO)" value={slo} disabled={revealed} onChange={setSlo} options={SLOS.map((s) => ({ id: s, label: `${s}%` }))} />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
        {INCIDENTS.map((i) => (
          <Toggle key={i.id} on={active.includes(i.id)} onClick={() => toggle(i.id)} disabled={revealed}>
            {i.label}
          </Toggle>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <Caption className="px-1">Error budget remaining over the 30-day window</Caption>
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Burn-down of the error budget: ${remainingPct}% remaining at day 30${exhausted ? `, exhausted on day ${exhaustedDay}` : ""}`}>
          {[100, 50, 0, -50].map((t) => (
            <g key={t}>
              <line x1={left} x2={W - 6} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--bad)" : "var(--line)"} strokeDasharray={t === 0 ? "4 3" : ""} />
              <text x={left - 5} y={y(t) + 3} textAnchor="end" fontSize={9} fill="var(--ink-3)" fontFamily="var(--font-mono, monospace)">
                {t}%
              </text>
            </g>
          ))}
          <polyline points={line.join(" ")} fill="none" stroke={exhausted ? "var(--bad)" : "var(--brand)"} strokeWidth={2.2} strokeLinejoin="round" />
          {INCIDENTS.filter((i) => active.includes(i.id)).map((i) => (
            <circle key={i.id} cx={x(i.day)} cy={y(100 - (spent(active, i.day) / allowed) * 100)} r={3.2} fill="var(--surface)" stroke={exhausted ? "var(--bad)" : "var(--brand)"} strokeWidth={2} />
          ))}
          <text x={left} y={H - 5} fontSize={9} fill="var(--ink-3)">
            day 0
          </text>
          <text x={W - 6} y={H - 5} fontSize={9} fill="var(--ink-3)" textAnchor="end">
            day 30
          </text>
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" aria-live="polite">
        <Readout label="Allowed failures" value={allowed.toLocaleString("en-US")} />
        <Readout label="Spent" value={used.toLocaleString("en-US")} />
        <Readout label="Left" value={`${remainingPct}%`} accent={remainingPct > 0} />
        <Readout label="Same as downtime" value={`${minutes} min`} />
      </div>
      <Note tone={tone} className="mt-2">
        {remainingPct > 50
          ? "Plenty of budget left: this is room to ship quickly and try risky things."
          : remainingPct > 0
            ? "The budget is getting thin. Slow down on risky changes and pay attention to reliability work."
            : `The budget ran out on day ${exhaustedDay}. The usual policy kicks in: pause feature launches and spend the team's time on reliability until the window recovers.`}
      </Note>
    </div>
  );
}

/** goal: { slo, exhausted, allIncidents } */
export function checkErrorBudget(state: unknown, goal: Record<string, unknown>) {
  const s = state as BudgetState | undefined;
  if (!s) return false;
  if (typeof goal.slo === "number" && s.slo !== goal.slo) return false;
  if (typeof goal.exhausted === "boolean" && s.exhausted !== goal.exhausted) return false;
  if (goal.allIncidents === true && s.active.length < INCIDENTS.length) return false;
  if (typeof goal.minRemaining === "number" && s.remainingPct < goal.minRemaining) return false;
  return ["slo", "exhausted", "allIncidents", "minRemaining"].some((k) => k in goal);
}
