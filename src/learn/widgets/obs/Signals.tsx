"use client";

import React, { useState } from "react";
import { Activity, FileText, GitBranch } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Segmented, useReport } from "./kit";

/**
 * One incident, three ways of looking at it. The boarding-pass service has become slow for some
 * travellers. Logs hold the story of individual events, metrics hold counted and averaged numbers
 * over time, traces follow one request across services. Each tab shows what that signal is good
 * for and what it cannot tell you.
 */

type Tab = "logs" | "metrics" | "traces";

const LOGS = [
  { t: "14:04:58", lvl: "INFO", text: "check-in ok booking=BK-2290 seat=14C 212ms" },
  { t: "14:05:02", lvl: "INFO", text: "check-in ok booking=BK-2291 seat=22A 198ms" },
  { t: "14:05:07", lvl: "WARN", text: "seat-service slow: 2411ms booking=BK-4402" },
  { t: "14:05:11", lvl: "ERROR", text: "seat-service timeout after 3000ms booking=BK-4410" },
  { t: "14:05:11", lvl: "INFO", text: "retrying seat-service attempt=2 booking=BK-4410" },
  { t: "14:05:15", lvl: "ERROR", text: "seat-service timeout after 3000ms booking=BK-4417" },
  { t: "14:05:16", lvl: "INFO", text: "check-in ok booking=BK-2292 seat=9F 205ms" },
];

// p95 latency per minute across 30 minutes, with trouble from minute 18
const P95 = Array.from({ length: 30 }, (_, i) => (i < 18 ? 210 + ((i * 37) % 40) : 210 + (i - 17) * 240 + ((i * 53) % 90)));

const SPANS = [
  { name: "check-in (api-gateway)", start: 0, dur: 3420, depth: 0 },
  { name: "auth", start: 8, dur: 36, depth: 1 },
  { name: "booking-db read", start: 50, dur: 58, depth: 1 },
  { name: "seat-service reserve", start: 118, dur: 3000, depth: 1, slow: true },
  { name: "write boarding pass", start: 3130, dur: 270, depth: 1 },
];

const TABS: { id: Tab; label: string; icon: typeof FileText; good: string; weak: string }[] = [
  { id: "logs", label: "Logs", icon: FileText, good: "The detailed story of one specific event: what happened to booking BK-4410, in what order.", weak: "Counting. To learn how many travellers were affected you would have to search and add up millions of lines." },
  { id: "metrics", label: "Metrics", icon: Activity, good: "Whether something is wrong, how bad, and since when. Numbers are aggregated, so they are cheap to keep and fast to graph.", weak: "Which request, and why. A graph of p95 latency says the seat step is slow for someone; it cannot name them." },
  { id: "traces", label: "Traces", icon: GitBranch, good: "Where the time went inside one request that crossed several services.", weak: "The big picture. A trace is one example (and many are sampled away), so it explains a slow request without proving how common it is." },
];

export interface SignalsState {
  visited: Tab[];
  tab: Tab;
}

export function Signals({ props, onChange, revealed }: WidgetProps<{ tab?: Tab }>) {
  const [tab, setTab] = useState<Tab>(props.tab ?? "logs");
  const [visited, setVisited] = useState<Tab[]>([props.tab ?? "logs"]);
  useReport(onChange, { visited, tab } satisfies SignalsState, `${tab}|${visited.join(",")}`);
  const pick = (t: Tab) => {
    if (revealed) return;
    setTab(t);
    if (!visited.includes(t)) setVisited([...visited, t]);
  };
  const info = TABS.find((t) => t.id === tab)!;

  const W = 360;
  const H = 120;
  const max = 3600;
  const pts = P95.map((v, i) => `${(i / (P95.length - 1)) * (W - 40) + 34},${H - 16 - (v / max) * (H - 28)}`).join(" ");
  const total = 3420;

  return (
    <div className="w-full max-w-2xl">
      <p className="text-center text-xs text-ink-3">Boarding-pass service, 14:05. Travellers report that check-in hangs.</p>
      <div className="mt-2 flex justify-center">
        <Segmented label="Signal" value={tab} onChange={pick} disabled={revealed} options={TABS.map((t) => ({ id: t.id, label: t.label }))} />
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        {tab === "logs" && (
          <div>
            <Caption>Application log, one line per event</Caption>
            <div className="mt-2 grid gap-1 font-mono text-[11.5px] leading-snug">
              {LOGS.map((l, i) => (
                <p key={i} className="break-words text-ink-2">
                  <span className="text-ink-3">{l.t}</span>{" "}
                  <span className={l.lvl === "ERROR" ? "font-bold text-bad" : l.lvl === "WARN" ? "font-bold text-[#d97706]" : "text-ink-3"}>{l.lvl}</span> {l.text}
                </p>
              ))}
            </div>
          </div>
        )}
        {tab === "metrics" && (
          <div>
            <Caption>Check-in latency, 95th percentile, per minute (ms)</Caption>
            <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 block w-full" role="img" aria-label="Line chart: p95 latency stays near 200 milliseconds, then climbs steeply after minute 18">
              {[0, 1800, 3600].map((v) => (
                <g key={v}>
                  <line x1={34} x2={W - 6} y1={H - 16 - (v / max) * (H - 28)} y2={H - 16 - (v / max) * (H - 28)} stroke="var(--line)" />
                  <text x={30} y={H - 13 - (v / max) * (H - 28)} textAnchor="end" fontSize={9} fill="var(--ink-3)">
                    {v}
                  </text>
                </g>
              ))}
              <polyline points={pts} fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinejoin="round" />
              <text x={34} y={H - 2} fontSize={9} fill="var(--ink-3)">14:00</text>
              <text x={W - 6} y={H - 2} fontSize={9} fill="var(--ink-3)" textAnchor="end">14:30</text>
            </svg>
          </div>
        )}
        {tab === "traces" && (
          <div>
            <Caption>One slow request, followed through the system (3.4 s)</Caption>
            <div className="mt-2 grid gap-1.5">
              {SPANS.map((s) => (
                <div key={s.name} className="grid grid-cols-[minmax(6rem,9.5rem)_1fr] items-center gap-2">
                  <span className="truncate text-[11.5px] text-ink-2" style={{ paddingLeft: `${s.depth * 0.6}rem` }}>
                    {s.name}
                  </span>
                  <div className="relative h-4 rounded bg-surface-2">
                    <div className={`absolute inset-y-0 rounded ${s.slow ? "bg-[#f59e0b]" : "bg-primary"}`} style={{ left: `${(s.start / total) * 100}%`, width: `${Math.max((s.dur / total) * 100, 1.5)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 grid gap-2 min-[560px]:grid-cols-2" aria-live="polite">
        <Note tone="good">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-3">Good at</span>
          {info.good}
        </Note>
        <Note tone="bad">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-ink-3">Cannot tell you</span>
          {info.weak}
        </Note>
      </div>
      <p className="mt-2 text-center text-[11.5px] text-ink-3">Looked at {visited.length} of 3 signals</p>
    </div>
  );
}

/** goal: { all: true } (opened every tab) or { tab } */
export function checkSignals(state: unknown, goal: Record<string, unknown>) {
  const s = state as SignalsState | undefined;
  if (!s) return false;
  if (goal.all === true && s.visited.length < 3) return false;
  if (typeof goal.tab === "string" && s.tab !== goal.tab) return false;
  return ["all", "tab"].some((k) => k in goal);
}
