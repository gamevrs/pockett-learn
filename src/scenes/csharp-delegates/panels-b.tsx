"use client";

import React, { useState } from "react";
import { clamp, fmtNum, hasValues, type Desk, type SpanRow } from "./data";
import { C, Chip, Empty, Lamp, Tile } from "./ui";

/**
 * Board panels for lessons 10 to 18 of the Footlight scene: run sheet, task timeline, hold and
 * timeout, backstage channel, retry ladder, breaker and bulkhead, lifetimes, wiring and the show
 * report. Each panel draws only its own slice of the desk data, tolerates missing or odd values and
 * never throws. Lime marks values the learner's code produced, amber is caution, red is failure.
 */

/** Local keyframes for the two panels that move things. Disabled for reduced motion. */
const CSS_B = `
@keyframes flb-slide { 0% { transform: translateX(0); opacity: 0; } 12% { opacity: 1; } 88% { opacity: 1; } 100% { transform: translateX(118px); opacity: 0; } }
.flb-slide { animation: flb-slide 1.8s ease-in-out infinite; animation-delay: calc(var(--i, 0) * 0.6s); }
@media (prefers-reduced-motion: reduce) { .flb-slide { animation: none !important; opacity: 1; } }
`;

const AMBER_SOFT = "rgba(251,191,36,0.16)";
const HATCH = "repeating-linear-gradient(45deg, rgba(251,191,36,0.85) 0 2px, rgba(251,191,36,0.15) 2px 5px)";
const LABEL_W = "4.75rem";

// ───────────────────────── shared Gantt parts ─────────────────────────

/** A tick step that gives at most about six ticks across the axis. */
function niceStep(max: number): number {
  const options = [1, 2, 5, 10, 15, 20, 25, 50, 100, 200, 250, 500, 1000];
  return options.find((s) => max / s <= 6) ?? 1000;
}

function tickList(max: number, step: number): number[] {
  const out: number[] = [];
  for (let t = 0; t <= max + 1e-9 && out.length < 40; t += step) out.push(t);
  return out;
}

function AxisLabels({ max, step, unit }: { max: number; step: number; unit: string }) {
  return (
    <div className="relative mb-0.5 h-3" style={{ marginLeft: LABEL_W }} aria-hidden>
      {tickList(max, step).map((t) => {
        const pct = (t / max) * 100;
        return (
          <span key={t} className="hud-value absolute top-0 text-[9px] leading-3 text-white/40" style={{ left: `${pct}%`, transform: pct > 92 ? "translateX(-100%)" : pct < 4 ? undefined : "translateX(-50%)" }}>
            {t}
            {t === 0 ? ` ${unit}` : ""}
          </span>
        );
      })}
    </div>
  );
}

function GridLines({ max, step }: { max: number; step: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0" style={{ left: LABEL_W }}>
      {tickList(max, step).map((t) => (
        <span key={t} className="absolute inset-y-0 w-px bg-white/[0.07]" style={{ left: `${(t / max) * 100}%` }} />
      ))}
    </div>
  );
}

const spanColor = (state: string) => (state === "done" ? C.lime : state === "failed" ? C.red : state === "cancelled" ? C.amber : "#9f9f9f");

// ───────────────────────── lesson 10: run sheet ─────────────────────────

export function RunSheet({ d }: { d: Desk["runSheet"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send runSheet with Desk.Show.</Empty>;
  const segs = d.segments ?? [];
  const max = Math.max(1, d.endsAt ?? 0, ...segs.map((s) => s.end));
  const step = niceStep(max);
  const byName = new Map(segs.map((s) => [s.name, s]));
  const bands = new Map<string, { from: number; to: number }[]>();
  for (const pair of d.overlaps ?? []) {
    const [an, bn] = pair.split(" / ").map((x) => x.trim());
    const a = byName.get(an);
    const b = byName.get(bn);
    if (!a || !b) continue;
    const from = Math.max(a.start, b.start);
    const to = Math.min(a.end, b.end);
    if (to <= from) continue;
    for (const n of [an, bn]) bands.set(n, [...(bands.get(n) ?? []), { from, to }]);
  }
  const overlapMinutes = d.totalMinutes !== undefined && d.endsAt !== undefined ? d.totalMinutes - d.endsAt : undefined;
  const clashes = d.overlaps ?? [];

  return (
    <div>
      {segs.length > 0 && (
        <div>
          <AxisLabels max={max} step={step} unit="min" />
          <div className="relative space-y-1" role="img" aria-label={`Run sheet with ${segs.length} segments over ${fmtNum(max)} minutes${clashes.length ? `, ${clashes.length} overlapping` : ""}`}>
            <GridLines max={max} step={step} />
            {segs.map((s, i) => (
              <div key={`${s.name}-${i}`} className="relative flex items-center">
                <span className="hud-value truncate pr-1.5 text-[10px] text-white/70" style={{ width: LABEL_W }} title={s.name}>
                  {s.name}
                </span>
                <div className="relative h-4 flex-1">
                  <span className="fl-grow absolute top-[3px] h-2.5 rounded-full bg-[#c5ee8a]" style={{ left: `${(s.start / max) * 100}%`, width: `${Math.max(0.8, ((s.end - s.start) / max) * 100)}%`, ["--i" as string]: i }} />
                  {(bands.get(s.name) ?? []).map((b, j) => (
                    <span key={j} className="absolute top-[1px] h-3.5 rounded-sm border border-[#fbbf24]" style={{ left: `${(b.from / max) * 100}%`, width: `${((b.to - b.from) / max) * 100}%`, background: HATCH }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <dl className="mt-3 grid grid-cols-3 gap-1.5">
        <Tile label="On the sheet" value={d.totalMinutes === undefined ? "—" : fmtNum(d.totalMinutes)} unit="min" tone="accent" />
        <Tile label="Show ends" value={d.endsAt === undefined ? "—" : fmtNum(d.endsAt)} unit="min" tone="accent" />
        <Tile label="Overlap" value={overlapMinutes === undefined ? "—" : fmtNum(Math.max(0, overlapMinutes))} unit="min" tone={overlapMinutes !== undefined && overlapMinutes > 0 ? "warning" : "plain"} />
      </dl>
      {clashes.length > 0 && (
        <ul className="mt-2 space-y-1">
          {clashes.map((c) => (
            <li key={c} className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1 font-mono text-[10.5px] text-[#fde68a]" style={{ background: AMBER_SOFT }}>
              <span className="hud-label shrink-0 !text-[9px] !text-[#fbbf24]">clash</span>
              <span className="min-w-0 truncate">{c}</span>
            </li>
          ))}
        </ul>
      )}
      {(d.lazyCheck !== undefined || d.eagerCheck !== undefined) && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {d.lazyCheck !== undefined && <span className="hud-tag text-white/75">lazy: {d.lazyCheck}</span>}
          {d.eagerCheck !== undefined && <span className="hud-tag hud-accent">eager: {d.eagerCheck}</span>}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 11: task timeline ─────────────────────────

const ROW_H = 14;

function Legend() {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Legend">
      {[
        ["done", C.lime],
        ["failed", C.red],
        ["cancelled", C.amber],
      ].map(([name, color]) => (
        <span key={name} className="hud-label flex items-center gap-1 !text-[9px]">
          <span className="inline-block h-2 w-3 rounded-full" style={{ background: color }} />
          {name}
        </span>
      ))}
    </div>
  );
}

export function TaskTimeline({ d }: { d: Desk["timeline"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send spans (and timeline) with Desk.Show.</Empty>;
  const spans = d.spans ?? [];
  const max = Math.max(1, ...spans.map((s) => s.end));
  const step = niceStep(max);
  return (
    <div>
      {d.winner !== undefined && (
        <p className="mb-2 flex min-w-0 items-center gap-2">
          <span className="hud-label shrink-0">first home</span>
          <span className="hud-tag hud-accent min-w-0 truncate">{d.winner}</span>
        </p>
      )}
      {spans.length > 0 && (
        <div>
          <AxisLabels max={max} step={step} unit="ms" />
          <div className="max-h-[11.5rem] overflow-y-auto overscroll-contain rounded-sm" tabIndex={spans.length * ROW_H > 184 ? 0 : undefined} aria-label="Task bars">
            <div className="relative" style={{ height: spans.length * ROW_H }} role="img" aria-label={`${spans.length} task bars over ${fmtNum(max)} milliseconds`}>
              <GridLines max={max} step={step} />
              {spans.map((s, i) => (
                <div key={`${s.name}-${i}`} className="absolute inset-x-0 flex items-center" style={{ top: i * ROW_H, height: ROW_H }}>
                  <span className="hud-value truncate pr-1.5 text-[9.5px] text-white/65" style={{ width: LABEL_W }} title={`${s.name} (${s.state}, ${s.start} to ${s.end} ms)`}>
                    {s.name}
                  </span>
                  <div className="relative h-full flex-1">
                    <span className="fl-grow absolute top-[3px] h-2 rounded-full" style={{ left: `${(s.start / max) * 100}%`, width: `${Math.max(0.8, ((s.end - s.start) / max) * 100)}%`, background: spanColor(s.state), ["--i" as string]: i }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Legend />
        </div>
      )}
      {d.rethrown !== undefined && (
        <p className="hud-log mt-2 text-[11px] text-white/75">
          await rethrew: <span className="hud-danger">{d.rethrown}</span>
          {d.failedCount !== undefined && <span className="hud-muted"> ({d.failedCount} tasks failed)</span>}
        </p>
      )}
    </div>
  );
}

// ───────────────────────── lesson 12: hold and timeout ─────────────────────────

function RaceChip({ label, won }: { label: string; won: boolean }) {
  return (
    <span className={`hud-tag ${won ? "hud-accent" : "text-white/45"}`} style={won ? { borderColor: "rgba(197,238,138,0.6)" } : undefined}>
      {label}
      {won ? " · first" : ""}
    </span>
  );
}

export function HoldPanel({ d, spans }: { d: Desk["hold"]; spans?: SpanRow[] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send hold with Desk.Show.</Empty>;
  const total = clamp(Math.round(d.stepsTotal ?? 0), 0, 40);
  const done = total > 0 ? clamp(Math.round(d.stepsDone ?? 0), 0, total) : 0;
  const cut = total > 0 && done < total;
  const cancelled = (spans ?? []).filter((s) => s.state === "cancelled");
  const longest = Math.max(1, ...cancelled.map((s) => s.end - s.start));
  const outcome = (d.guardedOutcome ?? "").toLowerCase();
  const holdWon = outcome.includes("hold");
  const timeoutWon = outcome.includes("timeout");
  const stateTone = d.state === "Canceled" ? { color: C.amber, borderColor: "rgba(251,191,36,0.4)" } : undefined;

  return (
    <div>
      <div className="mb-2 flex min-w-0 items-center gap-2">
        <span className="hud-label shrink-0">backdrop flight</span>
        {d.state !== undefined && (
          <span className="hud-tag" style={stateTone}>
            {d.state}
          </span>
        )}
        {total > 0 && (
          <span className="hud-value hud-muted ml-auto shrink-0 text-[10px]">
            step {done} of {total}
          </span>
        )}
      </div>
      {total > 0 && (
        <div className="relative pt-4" role="img" aria-label={`The flight completed ${done} of ${total} steps${cut ? " and was stopped" : ""}`}>
          {cut && (
            <span className="absolute top-0 flex -translate-x-1/2 flex-col items-center" style={{ left: `${((done + 0.5) / total) * 100}%` }}>
              <span className="hud-value text-[9px] leading-none text-[#fbbf24]">HOLD</span>
              <span className="mt-0.5 h-1.5 w-px bg-[#fbbf24]" />
            </span>
          )}
          <div className="flex gap-[2px]">
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`h-3 flex-1 rounded-[2px] ${i < done ? "fl-pop bg-[#c5ee8a]" : i === done && cut ? "bg-[#fbbf24]" : "border border-dashed border-white/20"}`}
                style={i < done ? { ["--i" as string]: i * 0.15 } : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {d.timeoutMessage !== undefined && (
        <p className="hud-log mt-3 flex min-w-0 gap-2 text-[11px]">
          <span className="hud-label shrink-0 !leading-[1.55]">deadline</span>
          <span className="min-w-0 break-words text-white/80">{d.timeoutMessage}</span>
        </p>
      )}
      {d.guardedOutcome !== undefined && (
        <div className="mt-2">
          <p className="hud-label mb-1">who won the race</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <RaceChip label="Stage hold (token)" won={holdWon} />
            <span className="hud-muted text-[10px]">vs</span>
            <RaceChip label="Deadline" won={timeoutWon} />
          </div>
          <p className="hud-log mt-1 text-[11px] text-white/70">{d.guardedOutcome}</p>
        </div>
      )}
      {cancelled.length > 0 && (
        <div className="mt-3 border-t border-white/10 pt-2">
          <p className="hud-label mb-1">{cancelled.length} cancelled on the timeline</p>
          <ul className="space-y-1">
            {cancelled.slice(0, 5).map((s, i) => (
              <li key={i} className="flex min-w-0 items-center gap-2">
                <span className="hud-value w-[4.75rem] shrink-0 truncate text-[10px] text-white/60">{s.name}</span>
                <span className="h-1.5 rounded-full bg-[#fbbf24]" style={{ width: `${clamp(((s.end - s.start) / longest) * 70, 6, 70)}%` }} />
                <span className="hud-value hud-muted shrink-0 text-[10px]">{s.end - s.start} ms</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 13: backstage channel ─────────────────────────

export function ChannelPanel({ d, generation }: { d: Desk["channel"]; generation: number }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send channel with Desk.Show.</Empty>;
  const cap = clamp(Math.round(d.capacity ?? 2), 1, 8);
  const deepest = d.deepest ?? 0;
  const filled = clamp(Math.round(deepest), 0, cap);
  const handled = d.handled ?? [];
  const slotW = (116 - (cap - 1) * 4) / cap;
  const over = d.capacity !== undefined && d.deepest !== undefined && d.deepest > d.capacity;
  const waits = d.waits;

  return (
    <div>
      <style>{CSS_B}</style>
      <svg key={generation} viewBox="0 0 320 84" className="block w-full" role="img" aria-label={`Producer, a pipe holding ${cap} calls, and the crew. The queue got ${deepest} deep.`}>
        <rect x="4" y="22" width="64" height="40" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.18)" />
        <text x="36" y="39" textAnchor="middle" fontSize="8.5" fill="#c8c8c8" fontFamily="var(--font-mono)">stage</text>
        <text x="36" y="51" textAnchor="middle" fontSize="8.5" fill="#c8c8c8" fontFamily="var(--font-mono)">manager</text>

        <rect x="96" y="28" width="128" height="28" rx="14" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.2)" />
        {Array.from({ length: cap }, (_, i) => {
          const on = i < filled;
          return (
            <rect
              key={i}
              x={102 + i * (slotW + 4)}
              y="33"
              width={slotW}
              height="18"
              rx="9"
              fill={on ? "#c5ee8a" : "none"}
              fillOpacity={on ? 0.85 : 0}
              stroke={on ? "#c5ee8a" : "rgba(255,255,255,0.22)"}
              strokeDasharray={on ? undefined : "3 3"}
            />
          );
        })}
        <path d="M68 42 H96" stroke="#c5ee8a" strokeOpacity=".6" strokeWidth="1.5" className="fl-flow" />
        <path d="M224 42 H252" stroke="#c5ee8a" strokeOpacity=".6" strokeWidth="1.5" className="fl-flow" />
        {[0, 1].map((i) => (
          <circle key={i} cx="102" cy="42" r="3" fill="#d3f3a4" className="flb-slide" style={{ ["--i" as string]: i }} />
        ))}

        <rect x="252" y="22" width="64" height="40" rx="8" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.18)" />
        <text x="284" y="46" textAnchor="middle" fontSize="8.5" fill="#c8c8c8" fontFamily="var(--font-mono)">crew</text>

        <text x="160" y="18" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.45)" fontFamily="var(--font-mono)">
          capacity {cap}
        </text>
        <text x="160" y="72" textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.45)" fontFamily="var(--font-mono)">
          deepest {fmtNum(deepest)}
        </text>
      </svg>

      <dl className="mt-2 grid grid-cols-3 gap-1.5">
        <Tile label="Sent" value={d.sent === undefined ? "—" : d.sent} tone="accent" />
        <Tile label="Handled" value={d.handled === undefined ? "—" : handled.length} tone="accent" />
        <Tile label="Waits" value={waits === undefined ? "—" : waits} tone={waits !== undefined && waits > 0 ? "warning" : "plain"} />
      </dl>
      {waits !== undefined && waits > 0 && <p className="hud-muted mt-1.5 text-[10.5px]">The producer waited {waits} times because the pipe was full. That wait is backpressure.</p>}

      <div className="mt-2">
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <span className="hud-label">Queue depth</span>
          <span className={`hud-value text-[11px] ${over ? "hud-danger" : ""}`}>
            {d.deepest === undefined ? "—" : `${fmtNum(d.deepest)} of ${cap}`}
          </span>
        </div>
        <div className="hud-bar !h-2">
          <span style={{ width: `${clamp((deepest / cap) * 100, 0, 100)}%`, background: over ? C.red : undefined }} />
        </div>
      </div>

      {handled.length > 0 && (
        <ol className="mt-2 flex flex-wrap gap-1" aria-label="Calls in the order the crew handled them">
          {handled.map((h, i) => (
            <li key={i} className="fl-pop flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-white/80" style={{ ["--i" as string]: i * 0.4 }}>
              <span className="text-white/40">{i + 1}</span>
              {h}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ───────────────────────── lesson 14: retry ladder ─────────────────────────

const BASE_MS = 4;

function Ladder({ rows, small }: { rows: NonNullable<Desk["retry"]["fog"]>; small?: boolean }) {
  const ceilings = rows.map((r) => BASE_MS * 2 ** (r.number - 1));
  const scale = Math.max(1, ...ceilings, ...rows.map((r) => r.waitMs));
  return (
    <ol className={small ? "space-y-1.5" : "space-y-2"}>
      {rows.map((r, i) => {
        const ok = r.outcome === "ok";
        const failed = r.outcome.startsWith("failed");
        const exhausted = failed && r.waitMs === 0;
        const ceiling = ceilings[i];
        const detail = failed ? r.outcome.replace(/^failed:\s*/, "") : "";
        return (
          <li key={`${r.number}-${i}`}>
            <div className="flex min-w-0 items-center gap-2">
              <span className="hud-value w-4 shrink-0 text-[10px] text-white/45">#{r.number}</span>
              <span className="hud-tag shrink-0 !h-[1.1rem]" style={ok ? { color: C.lime, borderColor: "rgba(197,238,138,0.5)" } : { color: exhausted ? C.red : C.amber, borderColor: exhausted ? "rgba(248,113,113,0.5)" : "rgba(251,191,36,0.45)" }}>
                {ok ? "ok" : failed ? "failed" : r.outcome || "?"}
              </span>
              {detail && <span className="min-w-0 truncate font-mono text-[10px] text-white/55" title={detail}>{detail}</span>}
            </div>
            {!ok && !exhausted && (
              <div className="mt-1 flex items-center gap-2 pl-6" role="img" aria-label={`Waited ${r.waitMs} ms; the un-jittered ceiling is assumed to be ${ceiling} ms, so the wait lands between ${ceiling / 2} and ${ceiling} ms`}>
                <div className="relative h-2.5 flex-1">
                  <span className="absolute inset-y-0 left-0 rounded-sm border border-dashed border-white/25" style={{ width: `${(ceiling / scale) * 100}%` }} />
                  <span className="absolute inset-y-0 rounded-sm bg-white/[0.08]" style={{ left: `${(ceiling / 2 / scale) * 100}%`, width: `${(ceiling / 2 / scale) * 100}%` }} />
                  <span className="fl-grow absolute top-[2px] h-[6px] rounded-full bg-[#fbbf24]" style={{ width: `${(r.waitMs / scale) * 100}%` }} />
                </div>
                <span className="hud-value w-12 shrink-0 text-right text-[10px] text-white/75">{r.waitMs} ms</span>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function RetryLadder({ d }: { d: Desk["retry"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send retry with Desk.Show.</Empty>;
  return (
    <div>
      {d.fog && d.fog.length > 0 && (
        <div>
          <div className="mb-1.5 flex min-w-0 items-center gap-2">
            <span className="hud-label shrink-0">fog machine</span>
            {d.fogResult !== undefined && <span className="hud-tag hud-accent min-w-0 truncate">{d.fogResult}</span>}
          </div>
          <Ladder rows={d.fog} />
          <p className="hud-muted mt-1.5 text-[10px]">Dashed box: the backoff ceiling, doubling each rung. Shaded half: where jitter lets the wait land.</p>
        </div>
      )}
      {d.slow && d.slow.length > 0 && (
        <div className={d.fog && d.fog.length > 0 ? "mt-3 border-t border-white/10 pt-2" : ""}>
          <div className="mb-1.5 flex min-w-0 items-center gap-2">
            <span className="hud-label shrink-0">slow fly bar</span>
            {d.slowOutcome !== undefined && <span className="hud-tag min-w-0 truncate" style={{ color: C.red, borderColor: "rgba(248,113,113,0.45)" }}>{d.slowOutcome}</span>}
          </div>
          <Ladder rows={d.slow} small />
        </div>
      )}
      {!(d.fog && d.fog.length > 0) && !(d.slow && d.slow.length > 0) && <Empty>No attempts yet. Send fog and slow attempt lists in retry.</Empty>}
    </div>
  );
}

// ───────────────────────── lesson 15: breaker and bulkhead ─────────────────────────

type StateName = "Closed" | "Open" | "HalfOpen";

const NODE: Record<StateName, { x: number; y: number; label: string }> = {
  Closed: { x: 54, y: 40, label: "Closed" },
  Open: { x: 266, y: 40, label: "Open" },
  HalfOpen: { x: 160, y: 118, label: "Half-open" },
};

interface EdgeDef {
  key: string;
  d: string;
  /** control point for the bezier midpoint label */
  mid: [number, number];
}

const EDGES: EdgeDef[] = [
  { key: "Closed -> Open", d: "M 76 31 Q 160 4 244 31", mid: [160, 17.5] },
  { key: "Open -> HalfOpen", d: "M 262 62 Q 258 116 184 120", mid: [237, 102.5] },
  { key: "HalfOpen -> Open", d: "M 180 102 Q 236 90 250 62", mid: [224, 86.5] },
  { key: "HalfOpen -> Closed", d: "M 136 104 Q 80 98 62 64", mid: [92, 91] },
];

const normalise = (t: string) => t.replace(/\s*->\s*/g, " -> ").replace(/Half-open/i, "HalfOpen").trim();

export function BreakerPanel({ d, generation }: { d: Desk["breaker"]; generation: number }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send breaker with Desk.Show.</Empty>;
  const transitions = (d.transitions ?? []).map(normalise);
  const steps = new Map<string, number[]>();
  transitions.forEach((t, i) => steps.set(t, [...(steps.get(t) ?? []), i + 1]));
  const outcomes = d.outcomes ?? [];
  const final = d.finalState === "Open" || d.finalState === "HalfOpen" || d.finalState === "Closed" ? d.finalState : undefined;
  const reached = d.serviceCalls;
  const bulk = d.bulkhead ?? [];
  const slots = bulk.filter((b) => b !== "rejected").length;
  const outColor = (o: string) => (o === "ok" ? C.lime : o === "failed" ? C.red : o === "rejected" ? C.amber : "#9f9f9f");

  return (
    <div>
      {transitions.length > 0 || final ? (
        <svg key={generation} viewBox="0 0 320 150" className="block w-full" role="img" aria-label={`Circuit breaker states. ${transitions.length} transitions${final ? `, ending ${final}` : ""}.`}>
          <defs>
            <marker id="fl-arrow" viewBox="0 0 8 8" refX="6.5" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L8 4 L0 8 z" fill="rgba(255,255,255,0.3)" />
            </marker>
            <marker id="fl-arrow-on" viewBox="0 0 8 8" refX="6.5" refY="4" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M0 0 L8 4 L0 8 z" fill="#c5ee8a" />
            </marker>
          </defs>
          {EDGES.map((e) => {
            const used = steps.get(e.key);
            return (
              <g key={e.key}>
                <path d={e.d} fill="none" stroke={used ? "#c5ee8a" : "rgba(255,255,255,0.2)"} strokeWidth={used ? 1.8 : 1.2} strokeDasharray={used ? undefined : "3 4"} markerEnd={used ? "url(#fl-arrow-on)" : "url(#fl-arrow)"} />
                {used && (
                  <g transform={`translate(${e.mid[0]} ${e.mid[1]})`}>
                    <rect x={-4 - used.length * 3.5} y="-7" width={8 + used.length * 7} height="14" rx="7" fill="#121212" stroke="#c5ee8a" strokeOpacity=".7" />
                    <text x="0" y="3" textAnchor="middle" fontSize="9" fill="#d3f3a4" fontFamily="var(--font-mono)">
                      {used.join(",")}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          {(Object.keys(NODE) as StateName[]).map((n) => {
            const p = NODE[n];
            const isFinal = final === n;
            return (
              <g key={n}>
                {isFinal && <circle cx={p.x} cy={p.y} r="26" fill="none" stroke="#c5ee8a" strokeOpacity=".55" strokeWidth="1.5" />}
                <circle cx={p.x} cy={p.y} r="21" fill={isFinal ? "rgba(197,238,138,0.12)" : "rgba(255,255,255,0.04)"} stroke={isFinal ? "#c5ee8a" : "rgba(255,255,255,0.28)"} strokeWidth="1.5" />
                <text x={p.x} y={p.y + 3} textAnchor="middle" fontSize={p.label.length > 6 ? 7.5 : 9} fill={isFinal ? "#d3f3a4" : "#e5e5e5"} fontFamily="var(--font-mono)">
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      ) : (
        <p className="hud-muted text-[11px]">No transitions yet. Send transitions and finalState.</p>
      )}
      {transitions.length > 0 && (
        <ol className="mt-1 space-y-0.5">
          {transitions.map((t, i) => (
            <li key={i} className="flex items-center gap-2 font-mono text-[10.5px] text-white/70">
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full border border-[#c5ee8a]/60 text-[9px] text-[#d3f3a4]">{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
      )}

      {outcomes.length > 0 && (
        <div className="mt-3">
          <p className="hud-label mb-1">Projector presses, in order</p>
          <div className="flex flex-wrap gap-1" role="img" aria-label={`Outcomes: ${outcomes.join(", ")}`}>
            {outcomes.map((o, i) => (
              <span key={i} className="fl-pop grid h-5 w-5 place-items-center rounded-[4px] font-mono text-[9px] text-[#0a0a0a]" style={{ background: outColor(o), ["--i" as string]: i } as React.CSSProperties} title={o}>
                {o === "ok" ? "ok" : o === "failed" ? "x" : o === "rejected" ? "-" : "?"}
              </span>
            ))}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {[
              ["ok", C.lime],
              ["failed", C.red],
              ["rejected", C.amber],
            ].map(([n, c]) => (
              <span key={n} className="hud-label flex items-center gap-1 !text-[9px]">
                <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: c }} />
                {n}
              </span>
            ))}
          </div>
        </div>
      )}
      {reached !== undefined && (
        <p className="hud-log mt-2 text-[11px] text-white/75">
          {outcomes.length > 0 ? `${outcomes.length} presses, only ` : ""}
          <span className="hud-accent">{reached}</span> reached the projector
          {outcomes.length > 0 && reached < outcomes.length ? <span className="hud-muted">. The open breaker turned the rest away without calling it.</span> : "."}
        </p>
      )}

      {bulk.length > 0 && (
        <div className="mt-3 border-t border-white/10 pt-2">
          <p className="hud-label mb-1.5">Bulkhead: {slots} slot{slots === 1 ? "" : "s"} used, three callers at once</p>
          <div className="flex items-center gap-3" role="img" aria-label={`Bulkhead outcomes: ${bulk.join(", ")}`}>
            {bulk.map((b, i) => {
              const rejected = b === "rejected";
              return (
                <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span
                    className="grid h-6 w-6 place-items-center rounded-full border-2 font-mono text-[10px]"
                    style={rejected ? { borderColor: C.amber, color: C.amber, background: AMBER_SOFT } : { borderColor: C.lime, color: "#0a0a0a", background: C.lime }}
                  >
                    {rejected ? "x" : i + 1}
                  </span>
                  <span className="hud-value text-[9.5px]" style={{ color: rejected ? C.amber : "#d3f3a4" }}>
                    {b}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 16: lifetimes ─────────────────────────

interface LifeRow {
  text: string;
  kind: "open" | "close" | "note";
  depth: number;
  /** an opened bracket that was never closed */
  dangling: boolean;
}

function lifeRows(log: string[]): LifeRow[] {
  const rows: LifeRow[] = [];
  const open: { key: string; row: number }[] = [];
  for (const line of log) {
    const borrow = /^borrow\s+(.+)$/i.exec(line);
    const ret = /^return\s+(.+)$/i.exec(line);
    if (borrow || /powered up$/i.test(line)) {
      const key = borrow ? borrow[1] : "rack";
      rows.push({ text: line, kind: "open", depth: open.length, dangling: true });
      open.push({ key, row: rows.length - 1 });
    } else if (ret || /powered down$/i.test(line)) {
      const key = ret ? ret[1] : "rack";
      let at = -1;
      for (let i = open.length - 1; i >= 0; i--) {
        if (open[i].key === key) {
          at = i;
          break;
        }
      }
      if (at >= 0) {
        rows[open[at].row].dangling = false;
        rows.push({ text: line, kind: "close", depth: at, dangling: false });
        open.splice(at, 1);
      } else {
        rows.push({ text: line, kind: "note", depth: open.length, dangling: false });
      }
    } else {
      rows.push({ text: line, kind: "note", depth: open.length, dangling: false });
    }
  }
  return rows;
}

export function Lifetimes({ d }: { d: Desk["lifetimes"] }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send lifetimes with Desk.Show.</Empty>;
  const rows = lifeRows(d.log ?? []);
  const POOL = 2;
  const free = d.free === undefined ? undefined : clamp(Math.round(d.free), 0, POOL);
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="hud-label shrink-0">spotlight pool</span>
        <span className="flex items-center gap-1.5" role="img" aria-label={free === undefined ? "free lamps unknown" : `${free} of ${POOL} lamps free`}>
          {Array.from({ length: POOL }, (_, i) => (
            <Lamp key={i} on={free !== undefined && i < free} size={11} />
          ))}
        </span>
        <span className={`hud-value ml-auto text-[10.5px] ${free === POOL ? "hud-accent" : "hud-warning"}`}>{free === undefined ? "—" : `${free} of ${POOL} free`}</span>
      </div>
      {rows.length > 0 ? (
        <ol className="rounded-md bg-black/40 px-2 py-1.5" aria-label="Resource log in order">
          {rows.map((r, i) => (
            <li key={i} className="flex min-w-0 items-stretch font-mono text-[10.5px] leading-[1.55]">
              {Array.from({ length: r.depth }, (_, g) => (
                <span key={g} aria-hidden className="w-3 shrink-0 border-l border-white/20" />
              ))}
              <span
                aria-hidden
                className="mr-1.5 mt-[0.4rem] h-2 w-2 shrink-0 rounded-full border"
                style={
                  r.kind === "note"
                    ? { borderColor: "rgba(255,255,255,0.25)" }
                    : r.dangling
                      ? { borderColor: C.amber, background: "transparent" }
                      : { borderColor: C.lime, background: r.kind === "close" ? C.lime : "transparent" }
                }
              />
              <span className={`min-w-0 truncate ${r.kind === "note" ? "text-white/50 italic" : r.dangling ? "text-[#fbbf24]" : r.kind === "close" ? "text-[#d3f3a4]" : "text-white/85"}`} title={r.text}>
                {r.text}
                {r.dangling && " (never returned)"}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="hud-muted text-[11px]">No log lines yet. Send log with Desk.Show.</p>
      )}
      {rows.length > 0 && <p className="hud-muted mt-1.5 text-[10px]">Each borrow opens a bracket and its return closes it. Inner brackets close first.</p>}
    </div>
  );
}

// ───────────────────────── lesson 17: wiring ─────────────────────────

interface Placed {
  name: string;
  lifetime: string | undefined;
  col: number;
  row: number;
}

function layout(nodes: { name: string; lifetime: string }[], edges: { from: string; to: string }[]): { placed: Placed[]; cols: number; rows: number } {
  const info = new Map<string, string | undefined>();
  for (const n of nodes) info.set(n.name, n.lifetime);
  for (const e of edges) {
    if (!info.has(e.from)) info.set(e.from, undefined);
    if (!info.has(e.to)) info.set(e.to, undefined);
  }
  const names = [...info.keys()];
  const depth = new Map(names.map((n) => [n, 0]));
  // longest path from the consumers; bounded passes keep a cycle from running away
  for (let pass = 0; pass < names.length; pass++) {
    for (const e of edges) {
      if (e.from === e.to) continue;
      const next = (depth.get(e.from) ?? 0) + 1;
      if (next < names.length && next > (depth.get(e.to) ?? 0)) depth.set(e.to, next);
    }
  }
  const perCol = new Map<number, number>();
  const placed = names.map((name) => {
    const col = depth.get(name) ?? 0;
    const row = perCol.get(col) ?? 0;
    perCol.set(col, row + 1);
    return { name, lifetime: info.get(name), col, row };
  });
  return { placed, cols: Math.max(1, ...placed.map((p) => p.col + 1)), rows: Math.max(1, ...perCol.values()) };
}

function WiringGraph({ nodes, edges }: { nodes: { name: string; lifetime: string }[]; edges: { from: string; to: string }[] }) {
  const { placed, cols, rows } = layout(nodes, edges);
  const W = 320;
  const NODE_W = cols > 3 ? 70 : 88;
  const NODE_H = 34;
  const ROW_GAP = 46;
  const H = rows * ROW_GAP + 14;
  const colX = (c: number) => (cols === 1 ? W / 2 : NODE_W / 2 + 6 + (c * (W - NODE_W - 12)) / (cols - 1));
  const rowY = (r: number, colRows: number) => H / 2 + (r - (colRows - 1) / 2) * ROW_GAP;
  const colCount = new Map<number, number>();
  for (const p of placed) colCount.set(p.col, (colCount.get(p.col) ?? 0) + 1);
  const pos = new Map(placed.map((p) => [p.name, { x: colX(p.col), y: rowY(p.row, colCount.get(p.col) ?? 1) }]));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Dependency graph: ${placed.length} parts and ${edges.length} links. An arrow points from a part to what it depends on.`}>
      <defs>
        <marker id="fl-dep-arrow" viewBox="0 0 8 8" refX="6.5" refY="4" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L8 4 L0 8 z" fill="rgba(211,243,164,0.85)" />
        </marker>
      </defs>
      {edges.map((e, i) => {
        const a = pos.get(e.from);
        const b = pos.get(e.to);
        if (!a || !b || e.from === e.to) return null;
        const forward = b.x > a.x;
        const x1 = a.x + (forward ? NODE_W / 2 : -NODE_W / 2);
        const x2 = b.x + (forward ? -NODE_W / 2 - 2 : NODE_W / 2 + 2);
        const mx = (x1 + x2) / 2;
        return <path key={i} d={`M ${x1} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${x2} ${b.y}`} fill="none" stroke="rgba(211,243,164,0.55)" strokeWidth="1.3" markerEnd="url(#fl-dep-arrow)" />;
      })}
      {placed.map((p) => {
        const at = pos.get(p.name)!;
        const known = p.lifetime !== undefined;
        return (
          <g key={p.name}>
            <rect
              x={at.x - NODE_W / 2}
              y={at.y - NODE_H / 2}
              width={NODE_W}
              height={NODE_H}
              rx="8"
              fill="#121212"
              stroke={known ? "#c5ee8a" : "rgba(255,255,255,0.3)"}
              strokeOpacity={known ? 0.85 : 1}
              strokeWidth="1.4"
              strokeDasharray={p.lifetime === "transient" ? "4 3" : undefined}
            />
            <text x={at.x} y={at.y - 2} textAnchor="middle" fontSize={p.name.length > 12 ? 8 : 9} fill="#f4f4f4" fontFamily="var(--font-mono)">
              {p.name}
            </text>
            <text x={at.x} y={at.y + 10} textAnchor="middle" fontSize="7.5" fill="rgba(255,255,255,0.45)" fontFamily="var(--font-mono)">
              {p.lifetime ?? "unresolved"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function Wiring({ d }: { d: Desk["wiring"] }) {
  const [tab, setTab] = useState<"live" | "rehearsal">("live");
  if (!hasValues(d)) return <Empty>Nothing yet. Send wiring with Desk.Show.</Empty>;
  const nodes = d.nodes ?? [];
  const edges = d.edges ?? [];
  const hasGraph = nodes.length > 0 || edges.length > 0;
  const live = d.liveLog ?? [];
  const rehearsal = d.rehearsalLog ?? [];
  const showTabs = live.length > 0 || rehearsal.length > 0;
  const lines = tab === "live" ? live : rehearsal;
  const cycle = d.cycleMessage !== undefined && /circular/i.test(d.cycleMessage) ? d.cycleMessage : undefined;

  return (
    <div>
      {hasGraph ? <WiringGraph nodes={nodes} edges={edges} /> : <p className="hud-muted text-[11px]">No parts resolved yet. Send nodes and edges in wiring.</p>}
      {hasGraph && (
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="hud-label flex items-center gap-1.5 !text-[9px]">
            <span className="inline-block h-2.5 w-5 rounded-[3px] border border-[#c5ee8a]/85" />
            singleton
          </span>
          <span className="hud-label flex items-center gap-1.5 !text-[9px]">
            <span className="inline-block h-2.5 w-5 rounded-[3px] border border-dashed border-[#c5ee8a]/85" />
            transient
          </span>
          <span className="hud-muted ml-auto text-[10px]">arrow: depends on</span>
        </div>
      )}
      {cycle && (
        <div role="note" className="mt-2 rounded-md border border-[#fbbf24]/40 px-2.5 py-1.5" style={{ background: AMBER_SOFT }}>
          <p className="hud-label !text-[#fbbf24]">cycle caught</p>
          <p className="mt-0.5 break-words font-mono text-[10.5px] text-[#fde68a]">{cycle}</p>
        </div>
      )}
      {showTabs && (
        <div className="mt-3">
          <div className="mb-1.5 flex gap-1.5" role="tablist" aria-label="Which container's log">
            <Chip active={tab === "live"} onClick={() => setTab("live")}>
              Live desk · {live.length}
            </Chip>
            <Chip active={tab === "rehearsal"} onClick={() => setTab("rehearsal")}>
              Rehearsal (fake clock) · {rehearsal.length}
            </Chip>
          </div>
          <div className="hud-log rounded-md bg-black/40 px-2 py-1.5" role="log" aria-label={tab === "live" ? "Live container log" : "Rehearsal container log"}>
            {lines.length === 0 ? (
              <p className="hud-muted">Nothing logged by this container.</p>
            ) : (
              lines.map((l, i) => (
                <div key={i} className="hud-log-line whitespace-pre-wrap break-words">
                  {l}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── lesson 18: show report ─────────────────────────

const DEVICE_COLOR: Record<string, string> = { lights: "#c5ee8a", fog: "#c8c8c8", fly: "#9f9f9f", sound: "#e5e5e5" };
const deviceColor = (device: string) => DEVICE_COLOR[device] ?? "#777777";

export function ShowReport({ d, allLive, total }: { d: Desk["show"]; allLive: boolean; total: number }) {
  if (!hasValues(d)) return <Empty>Nothing yet. Send show with Desk.Show.</Empty>;
  const r = d.report;
  const cues = d.cues ?? [];
  const devices = [...new Set(cues.map((c) => c.device))];
  const show = (v: number | undefined) => (v === undefined ? "—" : fmtNum(v));
  return (
    <div>
      {allLive && (
        <div className="fl-pop mb-2.5 flex items-center gap-2 rounded-md border border-[#c5ee8a]/40 bg-[#c5ee8a]/10 px-2.5 py-1.5">
          <Lamp on size={9} />
          <span className="hud-title hud-accent">All {total} systems live</span>
        </div>
      )}
      {r ? (
        <dl className="grid grid-cols-3 gap-1.5">
          <Tile label="Fired" value={show(r.fired)} tone="accent" />
          <Tile label="Failed" value={show(r.failed)} tone={(r.failed ?? 0) > 0 ? "danger" : "plain"} />
          <Tile label="Skipped" value={show(r.skipped)} tone={(r.skipped ?? 0) > 0 ? "warning" : "plain"} />
          <Tile label="Retries" value={show(r.retries)} />
          <Tile label="Peak level" value={show(r.peakLevel)} tone="accent" />
          <Tile label="Spots free" value={show(r.spotsFree)} unit="of 2" tone={r.spotsFree === 2 ? "accent" : "plain"} />
        </dl>
      ) : (
        <p className="hud-muted text-[11px]">No report yet. Send report in show.</p>
      )}
      {cues.length > 0 && (
        <div className="mt-3">
          <p className="hud-label mb-1.5">Act One cues</p>
          <ol className="flex flex-wrap gap-1" aria-label="Cues in script order">
            {cues.map((c, i) => (
              <li
                key={`${c.number}-${i}`}
                className="fl-pop flex items-center gap-1 rounded-md border bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-white/80"
                style={{ borderColor: deviceColor(c.device), ["--i" as string]: i * 0.5 } as React.CSSProperties}
                title={`${c.name} on ${c.device}`}
              >
                <span style={{ color: deviceColor(c.device) }}>{c.number}</span>
                {c.name}
              </li>
            ))}
          </ol>
          {devices.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5">
              {devices.map((dv) => (
                <span key={dv} className="hud-label flex items-center gap-1 !text-[9px]">
                  <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: deviceColor(dv) }} />
                  {dv || "device"}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
