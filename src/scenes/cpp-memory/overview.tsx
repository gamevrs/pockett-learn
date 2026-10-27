"use client";

import React from "react";
import { Lock, Play } from "lucide-react";
import { FeatureIcon } from "@/components/ui/icons";
import { totals, type BuildError, type Lab, type Shot } from "./data";
import { VaultMap, WorkbenchView } from "./memory";
import type { ChipSpec, ChipTone } from "./specs";
import { COL, Pill } from "./ui";

/**
 * The compact overview: what the board shows when its stage is short and wide (the project hub, the
 * landing page), so the memory room reads at a glance without scrolling. It is drawn at a fixed logical
 * size and scaled to fit by the scene.
 */

export const OVERVIEW_W = 780;
export const OVERVIEW_H = 540;

const toneColor = (t: ChipTone) => (t === "accent" ? "#d3f3a4" : t === "warning" ? COL.raw : t === "danger" ? COL.bad : "#f4f4f4");

export function StatusChip({ spec, unlocked, built, spot, flash }: { spec: ChipSpec; unlocked: boolean; built: boolean; spot: boolean; flash: boolean }) {
  if (!unlocked) {
    return (
      <div data-panel={spec.id} data-locked="" className={`flex min-w-0 items-center gap-2 rounded-lg border border-dashed px-2.5 py-1.5 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}>
        <Lock className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />
        <span className="hud-label min-w-0 flex-1 truncate !text-[11px]">{spec.title}</span>
        <span className="hud-label shrink-0 !text-[10px] text-white/30">L{spec.lesson}</span>
      </div>
    );
  }
  return (
    <div data-panel={spec.id} className={`flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 ${flash ? "pop-in" : ""}`}>
      {built ? <FeatureIcon id={spec.id} className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]" /> : <Play className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]/70" aria-hidden />}
      <div className="min-w-0 flex-1">
        <div className="hud-label truncate !text-[10px]">{spec.title}</div>
        <div className="hud-value truncate text-[11.5px] leading-tight" style={{ color: spec.value === undefined ? "rgba(255,255,255,0.3)" : toneColor(spec.tone) }}>
          {!built ? "Press Run" : (spec.value ?? "—")}
        </div>
      </div>
    </div>
  );
}

export function ErrorStrip({ error }: { error: BuildError }) {
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

/** The most telling photo for the overview: the newest one that shows heap bays, else the newest with variables. */
export function overviewShot(lab: Lab, vaultOn: boolean): Shot | null {
  const withHeap = [...lab.shots].reverse().find((s) => s.blocks.some((b) => b.live) && s.entries.some((e) => e.targetBlock !== undefined));
  if (vaultOn && withHeap) return withHeap;
  return [...lab.shots].reverse().find((s) => s.entries.length > 0) ?? null;
}

export function MapStrip({ lab, vaultOn, benchOn, built }: { lab: Lab; vaultOn: boolean; benchOn: boolean; built: boolean }) {
  const shot = overviewShot(lab, vaultOn);
  const showVault = vaultOn && shot !== null && shot.entries.some((e) => e.targetBlock !== undefined);
  return (
    <div className="hud-panel flex min-h-0 flex-1 flex-col overflow-hidden !px-3 !py-2">
      <div className="mb-1.5 flex min-w-0 items-center gap-2">
        <FeatureIcon id={showVault ? "pv-vault" : "pv-bench"} className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]" />
        <h3 className="hud-title shrink-0">{showVault ? "Workbench and vault" : "Workbench"}</h3>
        {shot && <span className="hud-label min-w-0 flex-1 truncate !normal-case !tracking-normal !text-[11px] !text-white/60">photo · {shot.caption}</span>}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {!benchOn ? (
          <p className="hud-muted text-[11px]">Locked until lesson 1: your variables, cells and arrows appear here.</p>
        ) : !built ? (
          <p className="hud-muted text-[11px]">Press Run to build your program. The photos you take with snap() are drawn here.</p>
        ) : !shot ? (
          <p className="hud-muted text-[11px]">No photo yet. Put a variable on the camera with peek(&quot;name&quot;, x); and call snap(&quot;caption&quot;);</p>
        ) : showVault ? (
          <VaultMap lab={lab} shot={shot} compact />
        ) : (
          <WorkbenchView lab={lab} shot={shot} compact />
        )}
      </div>
    </div>
  );
}

export function CounterStrip({ lab, vaultOn }: { lab: Lab; vaultOn: boolean }) {
  const a = lab.audit;
  const t = totals(lab);
  const leaks = a?.leakCount;
  return (
    <div className="hud-panel flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1 !px-3 !py-2 text-[11px]">
      {vaultOn ? (
        <>
          <span className="hud-label">audit</span>
          <span>
            bays taken <b className="hud-value text-white/90">{a?.counters.allocs ?? 0}</b>
          </span>
          <span>
            returned <b className="hud-value text-white/90">{a?.counters.frees ?? 0}</b>
          </span>
          <span style={{ color: leaks === undefined ? COL.dim : leaks > 0 ? COL.bad : COL.owner }}>
            {leaks === undefined ? "leaks —" : leaks > 0 ? `${leaks} leaked` : "0 leaks"}
          </span>
        </>
      ) : (
        <span className="hud-muted">The audit counts every new and delete once the vault is unlocked (lesson 4).</span>
      )}
      <span className="ml-auto flex items-center gap-3">
        <span style={{ color: t.copies > 0 ? COL.raw : COL.dim }}>
          copies <b className="hud-value">{t.copies}</b>
        </span>
        <span style={{ color: t.moves > 0 ? COL.owner : COL.dim }}>
          moves <b className="hud-value">{t.moves}</b>
        </span>
        {a && a.counters.badFrees > 0 && <Pill kind="freed" label={`${a.counters.badFrees} double free stopped`} />}
      </span>
    </div>
  );
}
