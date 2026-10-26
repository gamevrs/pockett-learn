"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Slider, useInitialReport } from "../reliability/ui";
import { r1, responseFactor } from "./sim";

/**
 * The hockey stick: for one server taking requests that arrive at random, the average response
 * time is the work itself divided by (1 − utilisation). Drag utilisation up and watch the curve
 * turn vertical.
 */

const W = 400;
const H = 190;
const X0 = 44;
const X1 = 384;
const Y0 = 16;
const Y1 = 160;
const YMAX = 20;
const px = (u: number) => X0 + u * (X1 - X0);
const py = (v: number) => Y1 - (Math.min(v, YMAX) / YMAX) * (Y1 - Y0);

export interface UtilState {
  util: number;
  factor: number;
}

export function Util({ props, onChange }: WidgetProps<{ util?: number; workMs?: number; target?: number }>) {
  const [util, setUtil] = useState(props.util ?? 50);
  const work = props.workMs ?? 100;
  const factor = responseFactor(util / 100);
  const queue = ((util / 100) ** 2) / (1 - Math.min(0.995, util / 100));

  const pts: string[] = [];
  for (let u = 0; u <= 95; u += 1) pts.push(`${r1(px(u / 100))},${r1(py(responseFactor(u / 100)))}`);

  useInitialReport(() => onChange?.({ util, factor: r1(factor) } satisfies UtilState));

  return (
    <div className="w-full max-w-2xl">
      <Caption>One server, requests arriving at random</Caption>
      <Slider
        className="mt-2"
        label="How busy the server is"
        value={util}
        min={5}
        max={98}
        onChange={(v) => {
          setUtil(v);
          onChange?.({ util: v, factor: r1(responseFactor(v / 100)) } satisfies UtilState);
        }}
        format={(v) => `${v}%`}
      />
      <div className="mt-2 rounded-xl border border-line bg-surface p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`At ${util}% busy, a request takes ${r1(factor)} times its own work time.`}>
          {[5, 10, 15, 20].map((v) => (
            <g key={v}>
              <line x1={X0} x2={X1} y1={py(v)} y2={py(v)} stroke="var(--line)" strokeWidth="1" />
              <text x={X0 - 6} y={py(v) + 3.5} textAnchor="end" fontSize="10" fill="var(--ink-3)" fontFamily="var(--font-mono), monospace">{v}×</text>
            </g>
          ))}
          {[0, 25, 50, 75, 100].map((u) => (
            <text key={u} x={px(u / 100)} y={Y1 + 14} textAnchor="middle" fontSize="10" fill="var(--ink-3)" fontFamily="var(--font-mono), monospace">{u}%</text>
          ))}
          {props.target && (
            <g>
              <line x1={X0} x2={X1} y1={py(props.target)} y2={py(props.target)} stroke="var(--ink-2)" strokeDasharray="4 3" strokeWidth="1.2" />
              <text x={X1} y={py(props.target) - 4} textAnchor="end" fontSize="10" fill="var(--ink-2)" fontFamily="var(--font-mono), monospace">my limit: {props.target}×</text>
            </g>
          )}
          <polyline points={pts.join(" ")} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinejoin="round" />
          <line x1={px(util / 100)} x2={px(util / 100)} y1={py(factor)} y2={Y1} stroke="var(--ink-2)" strokeDasharray="3 3" />
          <circle cx={px(util / 100)} cy={py(factor)} r="6" fill={factor > 5 ? "var(--bad)" : "var(--primary)"} stroke="var(--ink)" strokeWidth="1.5" />
          <text x={X0 + (X1 - X0) / 2} y={H - 4} textAnchor="middle" fontSize="10.5" fill="var(--ink-2)">how busy the server is</text>
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="One request takes" value={`${Math.round(factor * 10) / 10}× its work`} accent={factor <= 5} />
        <Readout label={`If the work is ${work} ms`} value={`${Math.round(work * factor)} ms`} />
        <Readout label="Typical queue" value={r1(queue)} />
      </div>
      <div className="mt-3" aria-live="polite">
        {util >= 90 ? (
          <Note tone="bad">At {util}% a tiny extra bit of traffic multiplies the waiting. The server is &ldquo;up&rdquo;, but nobody would call it fast.</Note>
        ) : util <= 60 ? (
          <Note tone="good">Plenty of slack: requests rarely find the server busy, so they wait very little.</Note>
        ) : (
          <Note>Waiting is climbing quickly. The last 20% of capacity is the expensive part.</Note>
        )}
      </div>
    </div>
  );
}

export function checkUtil(state: unknown, goal: Record<string, unknown>) {
  const st = state as UtilState | undefined;
  if (!st) return false;
  if (typeof goal.maxFactor === "number" && st.factor > goal.maxFactor) return false;
  if (typeof goal.minUtil === "number" && st.util < goal.minUtil) return false;
  if (typeof goal.minFactor === "number" && st.factor < goal.minFactor) return false;
  return true;
}
