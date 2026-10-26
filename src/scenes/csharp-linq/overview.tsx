"use client";

import React from "react";
import { Lock, Play } from "lucide-react";
import { FeatureIcon } from "@/components/ui/icons";
import { fmtNum, parseDiagnostics, type BuildError, type PortData } from "./data";
import { C, Tile, toneFill, type Tone } from "./ui";

/**
 * The compact overview: what the board shows when its stage is short and wide (the project hub,
 * the landing page), so the whole port reads at a glance without scrolling. It is drawn at a
 * fixed logical size and scaled to fit by the scene.
 */

export const OVERVIEW_W = 780;
export const OVERVIEW_H = 504;

export interface ChipSpec {
  id: string;
  title: string;
  lesson: number;
  value: string | undefined;
  tone: Tone;
  wide?: boolean;
}

const toneColor = (t: Tone) => (t === "accent" ? "#d3f3a4" : t === "warning" ? C.amber : t === "danger" ? C.red : "#f4f4f4");

/** One status chip per small system: what it found, in a few words. */
export function chipSpecs(p: PortData, consoleLines: number, allLive: boolean): ChipSpec[] {
  const s = p.structures;
  const g = p.groups;
  const top = g.stats?.[0];
  const lz = p.lazy;
  const am = p.records.amendment;
  const lanes = Object.entries(p.lanes.laneCounts ?? {});
  const gen = p.generics;
  const look = p.lookup.vesselLookups;
  const f = p.faults;
  const j = p.json;
  const ib = p.inbox;
  const rp = p.report.portReport;
  const maxTrace = lz.trace && lz.trace.length > 0 ? Math.max(...lz.trace.map((t) => t.evaluations)) : undefined;
  const priChange = am?.before?.priority !== undefined && am.after?.priority !== undefined && am.before.priority !== am.after.priority ? `P${am.before.priority} → P${am.after.priority}` : undefined;
  const counts = f.loadLog ? { l: f.loadLog.filter((e) => e.outcome === "loaded").length, d: f.loadLog.filter((e) => e.outcome === "deferred").length, r: f.loadLog.filter((e) => e.outcome === "rejected").length } : undefined;
  return [
    { id: "hp-console", title: "Console", lesson: 1, value: `${consoleLines} line${consoleLines === 1 ? "" : "s"} printed`, tone: "accent" },
    {
      id: "hp-structures",
      title: "Structures",
      lesson: 1,
      value: s.docked !== undefined ? `${s.docked}${s.dockQueue ? ` · ${s.dockQueue.length} queued` : " docked"}` : s.origins ? `${s.origins.length} origins` : undefined,
      tone: "accent",
    },
    { id: "hp-groups", title: "Categories", lesson: 3, value: top ? `${top.category} ${top.totalKg === undefined ? "" : fmtNum(top.totalKg) + " kg"}`.trim() : g.totals?.totalKg !== undefined ? `${fmtNum(g.totals.totalKg)} kg total` : undefined, tone: "accent" },
    { id: "hp-lazy", title: "Tracer", lesson: 5, value: lz.passes?.naive !== undefined && lz.passes.snapshot !== undefined ? `${lz.passes.naive} → ${lz.passes.snapshot} passes` : maxTrace !== undefined ? `peak ${maxTrace} evaluations` : undefined, tone: "plain" },
    { id: "hp-records", title: "Amendments", lesson: 6, value: priChange ?? (p.records.berthCompare?.equal !== undefined ? (p.records.berthCompare.equal ? "equal by value" : "not equal") : undefined), tone: priChange ? "accent" : "plain" },
    { id: "hp-lanes", title: "Lanes", lesson: 7, value: lanes.length > 0 ? `${lanes.length} lanes · ${lanes.reduce((a, [, v]) => a + v, 0)} routed` : p.lanes.lanes ? `${p.lanes.lanes.length} routed` : undefined, tone: "plain" },
    { id: "hp-contracts", title: "Contracts", lesson: 8, value: p.contracts.boardingKg !== undefined ? `${fmtNum(p.contracts.boardingKg)} kg boarding` : p.contracts.heaviestCrates?.[0] ? `heaviest ${p.contracts.heaviestCrates[0]}` : undefined, tone: "plain" },
    { id: "hp-generics", title: "Generics", lesson: 9, value: gen.largest?.crate ? `largest ${gen.largest.crate}` : gen.hold?.accepted ? `${gen.hold.accepted.length} in hold` : undefined, tone: "plain" },
    { id: "hp-ext", title: "Extensions", lesson: 10, value: p.ext.perishableIds ? `${p.ext.perishableIds.length} perishable` : p.ext.tonnes ? `${p.ext.tonnes.length} in tonnes` : p.ext.summaryLine, tone: "plain" },
    { id: "hp-lookup", title: "Lookup", lesson: 11, value: look ? `${look.filter((l) => l.found === true).length}/${look.length} found` : undefined, tone: "plain" },
    {
      id: "hp-parser",
      title: "Telegrams",
      lesson: 12,
      value: p.parser.telegrams || p.parser.telegramRejects ? `${p.parser.telegrams?.length ?? 0} parsed · ${p.parser.telegramRejects?.length ?? 0} bad` : undefined,
      tone: (p.parser.telegramRejects?.length ?? 0) > 0 ? "warning" : "accent",
    },
    { id: "hp-faults", title: "Incidents", lesson: 13, value: counts ? `${counts.l} ok · ${counts.d} held · ${counts.r} out` : f.loadAttempts !== undefined ? `${f.loadAttempts} attempts` : undefined, tone: counts && counts.r > 0 ? "warning" : "plain" },
    {
      id: "hp-json",
      title: "JSON",
      lesson: 14,
      value: j.jsonError ? `error${j.jsonError.line !== undefined ? ` line ${j.jsonError.line}` : ""}` : j.notice ? `${j.notice.vesselId ?? "?"} · ${j.notice.shipments ?? "?"} shipments` : j.exportJson ? `${j.exportJson.split("\n").length} lines` : undefined,
      tone: j.jsonError ? "warning" : "accent",
    },
    {
      id: "hp-inbox",
      title: "Inbox",
      lesson: 15,
      value: ib.importReport ? `${ib.importReport.accepted ?? 0} in · ${ib.importReport.rejected ?? 0} out` : undefined,
      tone: (ib.importReport?.rejected ?? 0) > 0 ? "warning" : "accent",
    },
    {
      id: "hp-report",
      title: "Report",
      lesson: 16,
      value: allLive ? "All systems live" : rp ? `${rp.shipments ?? "?"} shipments · ${rp.totalKg !== undefined ? fmtNum(rp.totalKg) : "?"} kg · ${rp.rejected ?? 0} rejected` : undefined,
      tone: "accent",
      wide: true,
    },
  ];
}

export function StatusChip({ spec, unlocked, built, spot, flash }: { spec: ChipSpec; unlocked: boolean; built: boolean; spot: boolean; flash: boolean }) {
  const span = spec.wide ? "col-span-2" : "";
  if (!unlocked) {
    return (
      <div data-panel={spec.id} data-locked="" className={`flex min-w-0 items-center gap-2 rounded-lg border border-dashed px-2.5 py-2 ${span} ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}>
        <Lock className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />
        <span className="hud-label min-w-0 flex-1 truncate !text-[11px]">{spec.title}</span>
        <span className="hud-label shrink-0 !text-[10px] text-white/30">L{spec.lesson}</span>
      </div>
    );
  }
  return (
    <div data-panel={spec.id} className={`flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 ${span} ${flash ? "pop-in" : ""}`}>
      {built ? <FeatureIcon id={spec.id} className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]" /> : <Play className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]/70" aria-hidden />}
      <div className="min-w-0 flex-1">
        <div className="hud-label truncate !text-[10px]">{spec.title}</div>
        <div className="hud-value truncate text-[11px] leading-tight" style={{ color: spec.value === undefined ? "rgba(255,255,255,0.3)" : toneColor(spec.tone) }}>
          {!built ? "Press Run" : (spec.value ?? "—")}
        </div>
      </div>
    </div>
  );
}

/** The manifest at a glance: the first rows of the board with urgent and heavy marked. */
export function BoardSnippet({ d }: { d: PortData["board"] }) {
  const rows = d.rows ?? [];
  const urgent = new Set(d.urgentIds ?? []);
  const heavy = new Set(d.heavyIds ?? []);
  const shown = rows.slice(0, 8);
  const maxMass = Math.max(1, ...rows.map((r) => r.massKg ?? 0));
  if (rows.length === 0 && !hasAnyBoard(d)) return <p className="hud-muted py-1 text-[11px]">Nothing yet. Send the board with Port.Show.</p>;
  return (
    <div className="flex min-h-0 flex-col gap-1.5">
      <div className="overflow-hidden rounded-md border border-white/[0.07] bg-black/25">
        {shown.map((r, i) => {
          const pct = r.massKg === undefined ? 0 : Math.max(2, (r.massKg / maxMass) * 100);
          return (
            <div
              key={r.id}
              className={`flex min-w-0 items-center gap-2 px-2 py-[3px] text-[11px] ${i > 0 ? "border-t border-white/[0.06]" : ""} ${urgent.has(r.id) ? "shadow-[inset_2px_0_0_#fbbf24]" : ""}`}
              style={{ background: `linear-gradient(90deg, rgba(197,238,138,${heavy.has(r.id) ? 0.16 : 0.06}) ${pct}%, transparent ${pct}%)` }}
            >
              <span className={`w-[3.3rem] shrink-0 font-mono text-[10.5px] ${urgent.has(r.id) ? "text-[#fde68a]" : "text-white/75"}`}>{r.id}</span>
              <span className="min-w-0 flex-1 truncate text-white/90">{r.cargo}</span>
              {heavy.has(r.id) && <span className="shrink-0 rounded border border-white/20 px-1 text-[8px] font-semibold uppercase leading-[12px] text-white/65">heavy</span>}
              <span className="hud-muted w-[3rem] shrink-0 truncate text-right text-[10px]">{r.category}</span>
              <span className={`w-9 shrink-0 text-right font-mono text-[10.5px] tabular-nums ${heavy.has(r.id) ? "font-semibold text-[#d3f3a4]" : "text-white/70"}`}>{r.massKg === undefined ? "—" : fmtNum(r.massKg)}</span>
              <span className={`w-5 shrink-0 text-right font-mono text-[10px] ${r.priority === 1 ? "font-semibold text-[#fbbf24]" : "text-white/45"}`}>{r.priority === undefined ? "" : `P${r.priority}`}</span>
            </div>
          );
        })}
      </div>
      <div className="flex min-w-0 items-center gap-3 text-[10px] text-white/50">
        {rows.length > shown.length && <span className="font-mono">+{rows.length - shown.length} more</span>}
        <span className="ml-auto flex items-center gap-3 font-mono">
          {d.medicalCount !== undefined && <span>medical <b className="hud-accent font-medium">{d.medicalCount}</b></span>}
          {d.firstFuel && <span>fuel <b className="hud-accent font-medium">{d.firstFuel}</b></span>}
          {d.anyMail !== undefined && <span>mail <b className="hud-accent font-medium">{d.anyMail ? "yes" : "no"}</b></span>}
        </span>
      </div>
    </div>
  );
}

const hasAnyBoard = (d: PortData["board"]) => Object.values(d).some((v) => v !== undefined);

/** Vessel loads as slim capacity bars. */
export function LoadsSnippet({ d }: { d: PortData["joins"] }) {
  const loads = d.vesselLoads ?? [];
  if (loads.length === 0) return <p className="hud-muted py-1 text-[11px]">Nothing yet. Send vesselLoads with Port.Show.</p>;
  return (
    <div className="space-y-2">
      {loads.map((v) => {
        const pct = v.usedPct ?? (v.loadKg !== undefined && v.capacityKg ? (v.loadKg / v.capacityKg) * 100 : 0);
        const tone: Tone = pct > 100 ? "danger" : pct >= 85 ? "warning" : "accent";
        return (
          <div key={v.vessel} className="min-w-0">
            <div className="flex min-w-0 items-baseline gap-2 text-[11px]">
              <span className="min-w-0 flex-1 truncate text-white/85">{v.vessel}</span>
              <span className="hud-value shrink-0 text-[10.5px] text-white/65">{v.loadKg === undefined ? "—" : fmtNum(v.loadKg)}<span className="text-white/35"> / {v.capacityKg === undefined ? "—" : fmtNum(v.capacityKg)}</span></span>
            </div>
            <div className="hud-bar" style={{ height: 5 }}>
              <span style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: toneFill(tone) }} />
            </div>
          </div>
        );
      })}
      {d.crewCount !== undefined && (
        <dl className="pt-0.5">
          <Tile label="Crew on rosters" value={fmtNum(d.crewCount)} tone="accent" />
        </dl>
      )}
    </div>
  );
}

/** Shown instead of the quiet strip when the program failed to build or crashed. */
export function ErrorStrip({ error }: { error: BuildError }) {
  const compile = error.type === "CompileError";
  const first = compile ? (parseDiagnostics(error.message).find((d) => d.severity === "error")?.text ?? "") : (error.message.split("\n").find((l) => l.trim().length > 0) ?? "");
  return (
    <div role="alert" className="flex min-w-0 items-center gap-2 rounded-[10px] border border-[#f87171]/40 bg-[#2a0f0f]/70 px-3 py-2.5">
      <span className="hud-title hud-danger shrink-0">{compile ? "Build failed" : "The program crashed"}</span>
      {error.line !== null && <span className="hud-tag hud-danger shrink-0 border-[#f87171]/40">line {error.line}</span>}
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-[#fecaca]">{first}</span>
    </div>
  );
}
