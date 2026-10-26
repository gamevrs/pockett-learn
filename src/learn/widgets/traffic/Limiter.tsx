"use client";

import React, { useState } from "react";
import { Eraser } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Pill, Readout, useInitialReport } from "../reliability/ui";
import { HORIZON, patternTimes, runLimiter, worstSpan, type Algo, type Pattern } from "./sim";

/**
 * Five rate limiters, one contract: "5 requests per 10 seconds". Pick an algorithm and a pattern
 * of requests; every request is drawn green (let through) or red (refused). The shaded band is
 * the busiest 10-second span of requests that actually got through.
 */

const ALGOS: { id: Algo; label: string; blurb: string }[] = [
  { id: "fixed", label: "Fixed window", blurb: "Count requests in each clock-aligned 10-second block (0–10, 10–20, …). A new block starts the count from zero." },
  { id: "slog", label: "Sliding log", blurb: "Remember the time of every allowed request. A new one is allowed if fewer than 5 are left in the last 10 seconds." },
  { id: "scount", label: "Sliding counter", blurb: "Keep only two counters: this block and the last. Estimate the last 10 seconds as the last block's count, weighted by how much of it still overlaps, plus this block's count." },
  { id: "token", label: "Token bucket", blurb: "A bucket holds up to 5 tokens and gains one every 2 seconds. Each request takes one token; with none left, the request is refused." },
  { id: "leaky", label: "Leaky bucket", blurb: "Accepted requests wait in a queue of 5 and leave at a steady one per 2 seconds. A full queue refuses new ones." },
];

const PATTERNS: { id: Pattern; label: string }[] = [
  { id: "slow", label: "A bit too fast" },
  { id: "edge", label: "Edge of a window" },
  { id: "spiky", label: "Spiky" },
  { id: "flood", label: "Flood" },
  { id: "own", label: "Draw my own" },
];

const W = 360;
const H = 108;
const PAD = 14;
const px = (t: number) => PAD + (t / HORIZON) * (W - PAD * 2);

export interface LimiterState {
  algo: Algo;
  pattern: Pattern;
  allowed: number;
  blocked: number;
  worst: number;
}

export function Limiter({ props, onChange }: WidgetProps<{ algos?: Algo[]; algo?: Algo; pattern?: Pattern; limit?: number; window?: number }>) {
  const limit = props.limit ?? 5;
  const win = props.window ?? 10;
  const algos = ALGOS.filter((a) => !props.algos || props.algos.includes(a.id));
  const [algo, setAlgo] = useState<Algo>(props.algo ?? algos[0].id);
  const [pattern, setPattern] = useState<Pattern>(props.pattern ?? "edge");
  const [own, setOwn] = useState<number[]>([]);

  const times = pattern === "own" ? own : patternTimes(pattern);
  const verdicts = runLimiter(algo, limit, win, times);
  const through = verdicts.filter((v) => v.allowed);
  const worst = worstSpan(through.map((v) => v.at), win);
  // where the busiest span starts
  const ts = through.map((v) => v.at).sort((a, b) => a - b);
  let bandStart = 0;
  let best = 0;
  for (let i = 0; i < ts.length; i++) {
    const n = ts.filter((x) => x >= ts[i] && x < ts[i] + win - 1e-9).length;
    if (n > best) {
      best = n;
      bandStart = ts[i];
    }
  }
  const info = ALGOS.find((a) => a.id === algo) ?? ALGOS[0];

  const report = (a: Algo, p: Pattern, t: number[]) => {
    const vs = runLimiter(a, limit, win, t);
    const ok = vs.filter((v) => v.allowed);
    onChange?.({ algo: a, pattern: p, allowed: ok.length, blocked: vs.length - ok.length, worst: worstSpan(ok.map((v) => v.at), win) } satisfies LimiterState);
  };

  useInitialReport(() => report(algo, pattern, times));

  const addAt = (e: React.MouseEvent<SVGSVGElement>) => {
    if (pattern !== "own") return;
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) / box.width) * W;
    const t = Math.max(0, Math.min(HORIZON - 0.5, Math.round(((x - PAD) / (W - PAD * 2)) * HORIZON * 4) / 4));
    const next = [...own, t].sort((a, b) => a - b).slice(0, 60);
    setOwn(next);
    report(algo, "own", next);
  };

  return (
    <div className="w-full max-w-2xl">
      <Caption>The contract: {limit} requests per {win} seconds</Caption>
      <div className="mt-2 flex flex-wrap gap-2">
        {algos.map((a) => (
          <Pill
            key={a.id}
            on={algo === a.id}
            onClick={() => {
              setAlgo(a.id);
              report(a.id, pattern, times);
            }}
          >
            {a.label}
          </Pill>
        ))}
      </div>
      <p className="mt-2 text-sm text-ink-2">{info.blurb}</p>

      <Caption className="mt-3">Requests arriving</Caption>
      <div className="mt-2 flex flex-wrap gap-2">
        {PATTERNS.map((p) => (
          <Pill
            key={p.id}
            on={pattern === p.id}
            onClick={() => {
              setPattern(p.id);
              report(algo, p.id, p.id === "own" ? own : patternTimes(p.id));
            }}
          >
            {p.label}
          </Pill>
        ))}
        {pattern === "own" && (
          <Pill
            onClick={() => {
              setOwn([]);
              report(algo, "own", []);
            }}
            label="Clear my requests"
          >
            <Eraser className="h-4 w-4" /> Clear
          </Pill>
        )}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={`mx-auto w-full max-w-[480px] ${pattern === "own" ? "cursor-crosshair" : ""}`}
          onClick={addAt}
          role="img"
          aria-label={`${through.length} of ${verdicts.length} requests let through. The busiest ${win}-second span let through ${worst}.`}
        >
          {worst > 0 && <rect x={px(bandStart)} y={14} width={px(bandStart + win) - px(bandStart)} height={70} rx={4} fill="var(--brand)" opacity="0.16" />}
          {worst > 0 && (
            <text x={px(bandStart) + 4} y={11} fontSize="10" fill="var(--ink-2)" fontFamily="var(--font-mono), monospace">
              busiest {win} s: {worst}
            </text>
          )}
          {(algo === "fixed" || algo === "scount") &&
            Array.from({ length: Math.floor(HORIZON / win) + 1 }, (_, i) => (
              <line key={i} x1={px(i * win)} x2={px(i * win)} y1={14} y2={86} stroke="var(--ink-3)" strokeDasharray="3 3" strokeWidth="1" />
            ))}
          <line x1={PAD} x2={W - PAD} y1={86} y2={86} stroke="var(--line-strong)" strokeWidth="1" />
          {Array.from({ length: 7 }, (_, i) => (
            <text key={i} x={px(i * 5)} y={100} textAnchor="middle" fontSize="10" fill="var(--ink-3)" fontFamily="var(--font-mono), monospace">
              {i * 5}s
            </text>
          ))}
          {verdicts.map((v, i) => (
            <g key={i}>
              {algo === "leaky" && v.allowed && v.at - v.t > 0.05 && <line x1={px(v.t)} x2={px(v.at)} y1={72} y2={72} stroke="var(--brand)" strokeWidth="1.4" opacity="0.6" />}
              <rect x={px(v.t) - 1.5} y={v.allowed ? 34 : 42} width={3} height={v.allowed ? 44 : 36} rx={1.2} fill={v.allowed ? "var(--primary)" : "var(--bad)"} stroke={v.allowed ? "var(--brand)" : "none"} strokeWidth="0.8" />
              {algo === "leaky" && v.allowed && v.at - v.t > 0.05 && <circle cx={px(v.at)} cy={72} r="2.4" fill="var(--brand)" />}
            </g>
          ))}
          {pattern === "own" && own.length === 0 && (
            <text x={W / 2} y={56} textAnchor="middle" fontSize="12" fill="var(--ink-2)">
              Tap the timeline to send requests
            </text>
          )}
        </svg>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] text-ink-2">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-1.5 rounded-sm bg-primary ring-1 ring-[var(--brand)]" /> let through</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-1.5 rounded-sm bg-[var(--bad)]" /> refused</span>
          {algo === "leaky" && <span>line: waiting in the queue</span>}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Let through" value={`${through.length}/${verdicts.length}`} />
        <Readout label={`Busiest ${win} s`} value={worst} accent={worst <= limit} />
        <Readout label="Promise" value={`≤ ${limit}`} />
      </div>
      <div className="mt-3" aria-live="polite">
        {worst > limit && algo === "scount" ? (
          <Note>The sliding counter works from an estimate, so it can let one extra request slip through. Compare that with the fixed window&apos;s double.</Note>
        ) : worst > limit ? (
          <Note tone="bad">{worst} requests were let through inside one {win}-second span, though the contract says {limit}. Look at where the burst sits relative to the window boundaries.</Note>
        ) : verdicts.length > 0 && through.length === verdicts.length ? (
          <Note>Every request fit. Try a faster pattern.</Note>
        ) : verdicts.length > 0 ? (
          <Note tone="good">The limit held: never more than {worst} in any {win} seconds.</Note>
        ) : null}
      </div>
    </div>
  );
}

export function checkLimiter(state: unknown, goal: Record<string, unknown>) {
  const st = state as LimiterState | undefined;
  if (!st) return false;
  if (goal.algo !== undefined && st.algo !== goal.algo) return false;
  if (goal.pattern !== undefined && st.pattern !== goal.pattern) return false;
  if (typeof goal.minWorst === "number" && st.worst < goal.minWorst) return false;
  if (typeof goal.maxWorst === "number" && st.worst > goal.maxWorst) return false;
  if (typeof goal.minBlocked === "number" && st.blocked < goal.minBlocked) return false;
  if (typeof goal.maxBlocked === "number" && st.blocked > goal.maxBlocked) return false;
  return true;
}
