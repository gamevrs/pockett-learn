"use client";

import React from "react";
import { Lock, Play } from "lucide-react";
import { FeatureIcon } from "@/components/ui/icons";
import { PANELS, tileValue, type BuildError, type Panel, type Peak } from "./data";

/**
 * The compact overview: what the observatory shows when its stage is short and wide (the project
 * hub, the landing page), so the whole board reads at a glance without scrolling. It is drawn at a
 * fixed logical size and scaled to fit by the scene.
 */

export const OVERVIEW_W = 780;
export const OVERVIEW_H = 520;

export function StatusChip({ panel, unlocked, built, spot, flash, value }: { panel: Panel; unlocked: boolean; built: boolean; spot: boolean; flash: boolean; value: string | undefined }) {
  if (!unlocked) {
    return (
      <div data-panel={panel.id} data-locked="" className={`flex min-w-0 items-center gap-2 rounded-lg border border-dashed px-2.5 py-2 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/20"}`}>
        <Lock className="h-3.5 w-3.5 shrink-0 text-white/55" aria-hidden />
        <span className="hud-label min-w-0 flex-1 truncate !text-[11px] !text-white/65">{panel.short}</span>
        <span className="hud-label shrink-0 !text-[10px] !text-white/55">L{panel.lesson}</span>
      </div>
    );
  }
  return (
    <div data-panel={panel.id} className={`flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 ${flash ? "pop-in" : ""}`}>
      {built ? <FeatureIcon id={panel.id} className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]" /> : <Play className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]/80" aria-hidden />}
      <div className="min-w-0 flex-1">
        <div className="hud-label truncate !text-[10px] !text-white/65">{panel.short}</div>
        <div className="hud-value truncate text-[12px] leading-tight" style={{ color: value === undefined ? "rgba(255,255,255,0.55)" : "#d3f3a4" }}>
          {!built ? "Press Run" : (value ?? "—")}
        </div>
      </div>
    </div>
  );
}

export function ChipGrid({ peak, unlocked, built, focus, flashing }: { peak: Peak; unlocked: ReadonlySet<string>; built: boolean; focus: string | null; flashing: ReadonlySet<string> }) {
  return (
    <div className="grid shrink-0 grid-cols-4 gap-2">
      {PANELS.map((p) => (
        <StatusChip key={p.id} panel={p} unlocked={unlocked.has(p.id)} built={built} spot={focus === p.id} flash={flashing.has(p.id)} value={tileValue(p.id, peak)} />
      ))}
    </div>
  );
}

/** Shown instead of the console strip when the program failed to build or crashed. */
export function ErrorStrip({ error }: { error: BuildError }) {
  const compile = error.type !== "Panic";
  const first = error.message.split("\n").find((l) => l.trim().length > 0) ?? "";
  return (
    <div role="alert" className="flex min-w-0 items-center gap-2 rounded-[10px] border border-[#f87171]/40 bg-[#2a0f0f]/70 px-3 py-2.5">
      <span className="hud-title hud-danger shrink-0">{compile ? "Build failed" : "The program panicked"}</span>
      <span className="hud-tag hud-danger shrink-0 border-[#f87171]/40 font-mono">{/^E\d{4}$/.test(error.type) ? error.type : error.type === "Panic" ? "panic" : "error"}</span>
      {error.line !== null && <span className="hud-tag hud-danger shrink-0 border-[#f87171]/40">line {error.line}</span>}
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#fecaca]">{first}</span>
    </div>
  );
}

/** The last few output lines, as a one-glance strip. */
export function OutputStrip({ lines, built, locked }: { lines: string[]; built: boolean; locked: boolean }) {
  const tail = lines.slice(-4);
  return (
    <div className="hud-panel min-w-0 !px-3 !py-2">
      <div className="mb-1 flex items-center gap-2">
        <FeatureIcon id="ob-console" className="h-3.5 w-3.5 text-[#c5ee8a]" />
        <span className="hud-title">Observer console</span>
        <span className="hud-tag ml-auto shrink-0 !text-white/70">{built ? `${lines.length} lines` : locked ? "locked · L1" : "idle"}</span>
      </div>
      <div className="hud-log space-y-0 truncate">
        {locked ? (
          <p className="truncate text-white/60">println!(…) lights this up.</p>
        ) : !built ? (
          <p className="truncate text-white/60">Press Run to build and run.</p>
        ) : tail.length === 0 ? (
          <p className="truncate text-white/60">Nothing printed yet.</p>
        ) : (
          tail.map((l, i) => (
            <div key={i} className="hud-log-line truncate">
              {l === "" ? " " : l}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
