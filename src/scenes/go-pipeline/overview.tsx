"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import type { Board, BuildErr } from "./data";
import { LIME } from "../go-inventory/ui";

/**
 * The one-screen overview the project hub and the landing page show: the whole Tidewatch line in a
 * single picture. Parts light up as their lessons are passed. Motion is CSS only (and switched off for
 * people who ask for less motion), so nothing needs cleaning up when the scene unmounts.
 */

export const OVERVIEW_W = 640;
export const OVERVIEW_H = 320;

const DIM = "rgba(255,255,255,0.16)";
const TEXT = "rgba(255,255,255,0.62)";

function Node({ x, y, w, label, sub, on, lit }: { x: number; y: number; w: number; label: string; sub?: string; on: boolean; lit?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={46} rx={9} fill={lit ? "rgba(197,238,138,0.08)" : "rgba(255,255,255,0.03)"} stroke={on ? LIME : DIM} strokeDasharray={on ? undefined : "4 4"} strokeOpacity={on ? 0.7 : 1} />
      <text x={x + w / 2} y={y + 20} textAnchor="middle" fontSize="11.5" fontWeight="600" fill={on ? "#e0f6c1" : TEXT}>{label}</text>
      <text x={x + w / 2} y={y + 36} textAnchor="middle" fontSize="9.5" fill={TEXT} fontFamily="monospace">{sub ?? ""}</text>
    </g>
  );
}

export function ErrorStrip({ error }: { error: BuildErr }) {
  return (
    <div role="alert" className="flex h-full min-w-0 items-center gap-2 rounded-md border border-[#f87171]/40 bg-[#2a0f0f]/70 px-3 py-2">
      <AlertTriangle className="hud-danger h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="hud-title hud-danger truncate">{error.type === "CompileError" ? "Build failed" : "The program crashed"}{error.line !== null ? ` · line ${error.line}` : ""}</p>
        <p className="mt-0.5 line-clamp-3 font-mono text-[11px] text-[#fecaca]">{error.message.split("\n")[0]}</p>
      </div>
    </div>
  );
}

export function Overview({ board, unlocked, built, flashing }: { board: Board; unlocked: ReadonlySet<string>; built: boolean; focus: string | null; flashing: Set<string> }) {
  const on = (id: string) => unlocked.has(id);
  const has = (id: string) => on(id) && built;
  const ticks = board.ticks?.runs;
  const bestRun = ticks?.find((r) => r.workers === board.ticks?.best) ?? ticks?.[ticks.length - 1];
  const nodes: { id: string; label: string; sub: string; w: number }[] = [
    { id: "gp-lanes", label: "Buoys", sub: board.lanes ? `${board.lanes.length} lanes` : "6 lanes", w: 82 },
    { id: "gp-stream", label: "Channel", sub: board.waves ? `${board.waves.length} passed` : "hatch", w: 82 },
    { id: "gp-pipeline", label: "Stages", sub: board.pipeline ? `${board.pipeline.in}→${board.pipeline.out}` : "chain", w: 82 },
    { id: "gp-pool", label: "Pool", sub: board.pool ? `${board.pool.workers} workers` : "workers", w: 82 },
    { id: "gp-fan", label: "Merge", sub: board.fan ? `${board.fan.total} readings` : "fan-in", w: 82 },
    { id: "gp-shutdown", label: "Desk", sub: board.shutdown ? `lost ${(board.shutdown.accepted ?? 0) - (board.shutdown.processed ?? 0)}` : "report", w: 82 },
  ];
  const gap = (OVERVIEW_W - 24 - nodes.length * 82) / (nodes.length - 1);
  const xs = nodes.map((_, i) => 12 + i * (82 + gap));
  const chips: { id: string; text: string; bad?: boolean }[] = [
    { id: "gp-race", text: board.race ? `race: ${board.lostRuns ?? "?"} of ${board.race.length} orders lose an update` : "race replay", bad: true },
    { id: "gp-tally", text: board.tally ? `mutex tally ${board.tally.match ? "matches" : "differs"}` : "mutex tally" },
    { id: "gp-cancel", text: board.cancel ? `cancel: took ${board.cancel.took} of ${board.cancel.asked?.toLocaleString("en-US")}` : "cancel" },
    { id: "gp-deadline", text: board.deadlines?.statuses ? `deadline: ${board.deadlines.statuses.filter((s) => s !== "ok").length} timed out` : "deadline", bad: true },
    { id: "gp-group", text: board.group ? `first error: ${board.group.first ?? "?"}` : "error group" },
  ];
  return (
    <div className="relative h-full w-full">
      <style>{`
        @keyframes gp-flow { to { stroke-dashoffset: -20; } }
        .gp-flow { animation: gp-flow 1.1s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .gp-flow { animation: none; } }
      `}</style>
      <svg viewBox={`0 0 ${OVERVIEW_W} ${OVERVIEW_H - 40}`} className="h-full w-full" role="img" aria-label="Tidewatch pipeline overview">
        {nodes.slice(0, -1).map((n, i) => {
          const live = has(n.id) && has(nodes[i + 1].id);
          return <line key={n.id} x1={xs[i] + 84} y1={36} x2={xs[i + 1] - 2} y2={36} stroke={live ? LIME : DIM} strokeWidth="2" strokeDasharray="5 5" className={live ? "gp-flow" : undefined} />;
        })}
        {nodes.map((n, i) => (
          <g key={n.id} className={flashing.has(n.id) ? "pop-in" : undefined}>
            <Node x={xs[i]} y={14} w={n.w} label={n.label} sub={has(n.id) ? n.sub : undefined} on={on(n.id)} lit={has(n.id)} />
          </g>
        ))}
        {/* the workers, busy and idle, in logical ticks */}
        <text x={12} y={96} fontSize="10" fill={TEXT} fontFamily="monospace">WORKERS · busy / idle in ticks</text>
        {on("gp-gantt") && built && bestRun ? (
          <g>
            {Array.from({ length: bestRun.workers }, (_, w) => (
              <g key={w}>
                <rect x={12} y={106 + w * 22} width={OVERVIEW_W - 24} height={18} rx={4} fill="rgba(255,255,255,0.05)" />
                {bestRun.slots.filter((s) => s.worker === w).map((s) => (
                  <rect key={s.job} x={12 + (s.start / bestRun.makespan) * (OVERVIEW_W - 24) + 1} y={108 + w * 22} width={Math.max(((s.end - s.start) / bestRun.makespan) * (OVERVIEW_W - 24) - 2, 2)} height={14} rx={3} fill={LIME} opacity={0.75} />
                ))}
              </g>
            ))}
            <text x={OVERVIEW_W - 12} y={106 + bestRun.workers * 22 + 10} textAnchor="end" fontSize="10" fill={TEXT} fontFamily="monospace">done at tick {bestRun.makespan} · peak queue {bestRun.peakQueue}</text>
          </g>
        ) : (
          <g>
            {[0, 1, 2].map((w) => <rect key={w} x={12} y={106 + w * 22} width={OVERVIEW_W - 24} height={18} rx={4} fill="none" stroke={DIM} strokeDasharray="4 4" />)}
          </g>
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1.5 px-1">
        {chips.map((c) => (
          <span
            key={c.id}
            className={`inline-flex h-6 max-w-full items-center rounded-full border px-2.5 font-mono text-[10.5px] ${has(c.id) ? (c.bad ? "border-[#f87171]/45 bg-[#f87171]/10 text-[#fecaca]" : "border-[#c5ee8a]/45 bg-[#c5ee8a]/10 text-[#e0f6c1]") : on(c.id) ? "border-white/15 text-white/55" : "border-dashed border-white/15 text-white/35"}`}
          >
            <span className="truncate">{c.text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
