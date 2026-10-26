"use client";

import React from "react";
import { Lock, Play } from "lucide-react";
import { FeatureIcon } from "@/components/ui/icons";
import { C, fmtNum, type Reactor } from "./data";

/**
 * The compact overview: what the board shows when its stage is short and wide (the project hub,
 * the landing page), so the whole control room reads at a glance without scrolling. It is drawn
 * at a fixed logical size and scaled to fit by the scene.
 */

export const OVERVIEW_W = 780;
export const OVERVIEW_H = 520;

export type ChipTone = "plain" | "accent" | "warning" | "danger";

export interface ChipSpec {
  id: string;
  title: string;
  lesson: number;
  value: string | undefined;
  tone: ChipTone;
}

const toneColor = (t: ChipTone) => (t === "accent" ? "#d3f3a4" : t === "warning" ? C.amber : t === "danger" ? C.red : "#f4f4f4");
const levelTone = (level: string | undefined): ChipTone => (level === "CRITICAL" ? "danger" : level === "WARNING" ? "warning" : level ? "accent" : "plain");

/** One status chip per small system: what it found, in a few words. */
export function chipSpecs(r: Reactor, consoleLines: number): ChipSpec[] {
  const eff = r.power.efficiency;
  const net = r.power.netKw;
  return [
    { id: "rc-console", title: "Console", lesson: 1, value: `${consoleLines} line${consoleLines === 1 ? "" : "s"} printed`, tone: "accent" },
    { id: "rc-power", title: "Power", lesson: 3, value: eff !== undefined ? `${fmtNum(eff, 1)}% efficient` : net !== undefined ? `${fmtNum(net)} kW net` : undefined, tone: "accent" },
    { id: "rc-operator", title: "Operator", lesson: 4, value: r.operator.name ? `${r.operator.name}${r.operator.clearance !== undefined ? ` · L${fmtNum(r.operator.clearance)}` : ""}` : undefined, tone: "plain" },
    { id: "rc-interlocks", title: "Interlocks", lesson: 5, value: r.interlocks.alarmLevel, tone: levelTone(r.interlocks.alarmLevel) },
    { id: "rc-ramp", title: "Warm-up", lesson: 6, value: r.ramp.ticks !== undefined ? `${fmtNum(r.ramp.ticks)} ticks${r.ramp.peak !== undefined ? ` → ${fmtNum(r.ramp.peak)} °C` : ""}` : undefined, tone: "plain" },
    { id: "rc-telemetry", title: "Telemetry", lesson: 9, value: r.telemetry.good !== undefined || r.telemetry.bad !== undefined ? `${fmtNum(r.telemetry.good ?? 0)} good · ${fmtNum(r.telemetry.bad ?? 0)} bad` : undefined, tone: (r.telemetry.bad ?? 0) > 0 ? "warning" : "accent" },
    { id: "rc-sensors", title: "Sensors", lesson: 10, value: r.sensors.closest ? `${r.sensors.closest} closest` : r.sensors.names ? `${r.sensors.names.length} sensors` : undefined, tone: (r.sensors.overCount ?? 0) > 0 ? "warning" : "plain" },
    { id: "rc-tally", title: "Events", lesson: 11, value: r.tally.mostCommon ? `${r.tally.mostCommon} ×${fmtNum(r.tally.mostCommonCount ?? 0)}` : undefined, tone: "plain" },
    { id: "rc-analysis", title: "Analysis", lesson: 12, value: r.analysis.median !== undefined || r.analysis.warnCount !== undefined ? `median ${r.analysis.median === undefined ? "—" : fmtNum(r.analysis.median)} · ${fmtNum(r.analysis.warnCount ?? 0)} hot` : undefined, tone: "plain" },
    { id: "rc-control", title: "Control rods", lesson: 13, value: r.control.names ? `${fmtNum(r.control.fullyInserted ?? 0)}/${r.control.names.length} fully in` : undefined, tone: "plain" },
    { id: "rc-state", title: "State", lesson: 14, value: r.state.state, tone: r.state.state === "Scram" ? "danger" : "accent" },
    { id: "rc-shift", title: "Shift", lesson: 16, value: r.shift.grade ? `Grade ${r.shift.grade}${r.shift.average !== undefined ? ` · ${fmtNum(r.shift.average, 1)} avg` : ""}` : undefined, tone: "accent" },
  ];
}

export function StatusChip({ spec, unlocked, built, spot, flash }: { spec: ChipSpec; unlocked: boolean; built: boolean; spot: boolean; flash: boolean }) {
  if (!unlocked) {
    return (
      <div data-panel={spec.id} data-locked="" className={`flex min-w-0 items-center gap-2 rounded-lg border border-dashed px-2.5 py-2 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}>
        <Lock className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />
        <span className="hud-label min-w-0 flex-1 truncate !text-[11px]">{spec.title}</span>
        <span className="hud-label shrink-0 !text-[10px] text-white/30">L{spec.lesson}</span>
      </div>
    );
  }
  return (
    <div data-panel={spec.id} className={`flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 ${flash ? "pop-in" : ""}`}>
      {built ? <FeatureIcon id={spec.id} className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]" /> : <Play className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]/70" aria-hidden />}
      <div className="min-w-0 flex-1">
        <div className="hud-label truncate !text-[10px]">{spec.title}</div>
        <div className="hud-value truncate text-[12px] leading-tight" style={{ color: spec.value === undefined ? "rgba(255,255,255,0.3)" : toneColor(spec.tone) }}>
          {!built ? "Press Run" : (spec.value ?? "—")}
        </div>
      </div>
    </div>
  );
}

const codeColor = (code: string) => (code.includes("OVER") ? C.red : C.amber);

/** The alarm strip: how many alarms were raised and the first few messages. */
export function AlarmStrip({ d, unlocked, built, spot, flash }: { d: Reactor["alarms"]; unlocked: boolean; built: boolean; spot: boolean; flash: boolean }) {
  const count = d.count ?? d.codes?.length;
  const shown = (d.messages ?? []).slice(0, 2);
  if (!unlocked) {
    return (
      <div data-panel="rc-alarms" data-locked="" className={`flex min-w-0 items-center gap-2 rounded-[10px] border border-dashed px-3 py-2.5 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}>
        <Lock className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />
        <span className="hud-label min-w-0 flex-1 truncate !text-[11px]">Alarms</span>
        <span className="hud-label shrink-0 !text-[10px] text-white/30">L15 · throw · try · catch</span>
      </div>
    );
  }
  return (
    <div data-panel="rc-alarms" className={`hud-panel flex min-w-0 items-center gap-3 !px-3 !py-2 ${flash ? "pop-in" : ""}`}>
      <span className="flex shrink-0 items-center gap-2 text-[#c5ee8a]">
        <FeatureIcon id="rc-alarms" className="h-3.5 w-3.5" />
        <span className="hud-title">Alarms</span>
      </span>
      {!built ? (
        <span className="hud-muted truncate text-[11px]">Press Run to read the alarm log.</span>
      ) : count === undefined ? (
        <span className="hud-muted truncate text-[11px]">No alarm data yet.</span>
      ) : (
        <>
          <span className="hud-tag shrink-0" style={{ color: count > 0 ? C.amber : C.lime }}>
            {count} raised
          </span>
          <div className="min-w-0 flex-1 space-y-0.5">
            {shown.length === 0 && <div className="hud-muted truncate text-[11px]">All readings were within limits.</div>}
            {shown.map((m, i) => (
              <div key={i} className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] text-white/75">
                <span className="shrink-0 rounded px-1 text-[9px] font-semibold" style={{ color: codeColor(d.codes?.[i] ?? ""), background: "rgba(255,255,255,0.06)" }}>
                  {d.codes?.[i] ?? "ALARM"}
                </span>
                <span className="min-w-0 truncate">{m}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Shown instead of the alarm strip when the program failed to build or crashed. */
export function ErrorStrip({ error }: { error: NonNullable<Reactor["error"]> }) {
  const compile = error.type === "CompileError";
  const first = error.message.split("\n").find((l) => l.trim().length > 0) ?? "";
  return (
    <div role="alert" className="flex min-w-0 items-center gap-2 rounded-[10px] border border-[#f87171]/40 bg-[#2a0f0f]/70 px-3 py-2.5">
      <span className="hud-title hud-danger shrink-0">{compile ? "Build failed" : "The program crashed"}</span>
      {error.line !== null && <span className="hud-tag hud-danger shrink-0 border-[#f87171]/40">line {error.line}</span>}
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#fecaca]">{first}</span>
    </div>
  );
}
