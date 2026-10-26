"use client";

import React from "react";
import { Lock, Play } from "lucide-react";
import { FeatureIcon } from "@/components/ui/icons";
import { fmtNum, type Desk } from "./data";
import { C, Lamp } from "./ui";

/**
 * The compact overview: what the board shows when its stage is short and wide (the project hub,
 * the landing page), so the whole desk reads at a glance without scrolling. It is drawn at a
 * fixed logical size and scaled to fit by the scene.
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

const some = (...v: unknown[]) => v.some((x) => x !== undefined);

/** One status chip per system: what it found, in a few words. */
export function chipSpecs(d: Desk, consoleLines: number): ChipSpec[] {
  const trailEnd = d.chain.trail && d.chain.trail.length > 0 ? d.chain.trail[d.chain.trail.length - 1] : undefined;
  const goFailed = d.go.failures?.length ?? 0;
  const states = d.breaker.finalState;
  return [
    { id: "fl-console", title: "Console", lesson: 1, value: `${consoleLines} line${consoleLines === 1 ? "" : "s"} printed`, tone: "accent" },
    { id: "fl-cues", title: "Cue sheet", lesson: 1, value: d.cues.sheet ? `${d.cues.sheet.length} cues${d.cues.label ? ` · ${d.cues.label}` : ""}` : d.cues.label, tone: "accent" },
    { id: "fl-faders", title: "Fader bank", lesson: 2, value: d.faders.levels ? d.faders.levels.join(" · ") : undefined, tone: "accent" },
    { id: "fl-chain", title: "Sound chain", lesson: 3, value: d.chain.stageNames ? `${d.chain.stageNames.length} stages${trailEnd !== undefined ? ` → ${fmtNum(trailEnd)}` : ""}` : undefined, tone: "accent" },
    { id: "fl-go", title: "GO button", lesson: 4, value: d.go.handlers ? `${d.go.handlers.length} handlers${goFailed ? ` · ${goFailed} failed` : ""}` : undefined, tone: goFailed ? "warning" : "accent" },
    { id: "fl-bus", title: "Event bus", lesson: 5, value: d.bus.log ? `${d.bus.log.length} deliveries` : undefined, tone: "accent" },
    { id: "fl-observers", title: "Light meters", lesson: 6, value: d.observers.meter ? `meter ${d.observers.meter.length} · alarm ${d.observers.alarm?.length ?? 0}` : undefined, tone: "plain" },
    { id: "fl-props", title: "Prop shelves", lesson: 7, value: d.props.heaviest ? `${d.props.heaviest} heaviest` : undefined, tone: "plain" },
    { id: "fl-iter", title: "Fade steps", lesson: 8, value: d.iter.fade ? `${d.iter.fade.length} steps` : undefined, tone: "plain" },
    { id: "fl-linq", title: "Query bench", lesson: 9, value: d.query.pages ? `${d.query.pages.length} pages · ${d.query.pulls?.first ?? "?"} pulled` : undefined, tone: "plain" },
    { id: "fl-runsheet", title: "Run sheet", lesson: 10, value: d.runSheet.endsAt !== undefined ? `${fmtNum(d.runSheet.endsAt)} min · ${d.runSheet.overlaps?.length ?? 0} clash` : undefined, tone: (d.runSheet.overlaps?.length ?? 0) > 0 ? "warning" : "plain" },
    { id: "fl-timeline", title: "Task timeline", lesson: 11, value: d.timeline.spans ? `${d.timeline.spans.length} tasks` : undefined, tone: "plain" },
    { id: "fl-hold", title: "Hold and timeout", lesson: 12, value: d.hold.state, tone: d.hold.state === "Canceled" ? "warning" : "plain" },
    { id: "fl-channel", title: "Backstage channel", lesson: 13, value: d.channel.handled ? `${d.channel.handled.length}/${d.channel.sent ?? d.channel.handled.length} handled` : undefined, tone: "plain" },
    { id: "fl-retry", title: "Retry ladder", lesson: 14, value: d.retry.fog ? `${d.retry.fog.length} attempts` : undefined, tone: "plain" },
    { id: "fl-breaker", title: "Breaker", lesson: 15, value: states, tone: states === "Open" ? "danger" : "accent" },
    { id: "fl-lifetimes", title: "Lifetimes", lesson: 16, value: d.lifetimes.free !== undefined ? `${d.lifetimes.free} lamps free` : undefined, tone: "plain" },
    { id: "fl-wiring", title: "Wiring", lesson: 17, value: d.wiring.nodes ? `${d.wiring.nodes.length} parts · ${d.wiring.edges?.length ?? 0} links` : undefined, tone: "plain" },
    { id: "fl-show", title: "Show report", lesson: 18, value: d.show.report?.fired !== undefined ? `${d.show.report.fired} fired` : undefined, tone: "accent" },
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
        <div className="hud-value truncate text-[11.5px] leading-tight" style={{ color: spec.value === undefined ? "rgba(255,255,255,0.3)" : toneColor(spec.tone) }}>
          {!built ? "Press Run" : (spec.value ?? "—")}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── hero strips ─────────────────────────

function HeroFrame({ id, title, unlocked, lesson, spot, flash, right, children }: { id: string; title: string; unlocked: boolean; lesson: number; spot: boolean; flash: boolean; right?: React.ReactNode; children: React.ReactNode }) {
  if (!unlocked) {
    return (
      <div data-panel={id} data-locked="" className={`flex min-w-0 flex-col rounded-[10px] border border-dashed px-3 py-2 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}>
        <div className="flex items-center gap-2">
          <Lock className="h-3 w-3 text-white/35" aria-hidden />
          <span className="hud-label flex-1 truncate">{title}</span>
          <span className="hud-label !text-[10px] text-white/30">L{lesson}</span>
        </div>
        <div className="grid flex-1 place-items-center">
          <svg viewBox="0 0 200 60" className="w-full max-w-[16rem]" aria-hidden>
            <path d="M10 30 H190" stroke="rgba(255,255,255,0.12)" strokeDasharray="3 5" />
            {[30, 80, 130, 175].map((x) => (
              <circle key={x} cx={x} cy="30" r="7" fill="none" stroke="rgba(255,255,255,0.14)" strokeDasharray="3 3" />
            ))}
          </svg>
        </div>
      </div>
    );
  }
  return (
    <div data-panel={id} className={`hud-panel flex min-w-0 flex-col !px-3 !py-2 ${flash ? "pop-in" : ""}`}>
      <div className="mb-1.5 flex min-w-0 items-center gap-2">
        <span className="shrink-0 text-[#c5ee8a]">
          <FeatureIcon id={id} className="h-3.5 w-3.5" />
        </span>
        <span className="hud-title min-w-0 flex-1 truncate">{title}</span>
        {right && <span className="hud-value hud-muted shrink-0 text-[10px]">{right}</span>}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

/** Deliveries grouped by subscriber, drawn as one publisher fanning out to bars. */
export function MiniBus({ d, unlocked, built, spot, flash }: { d: Desk["bus"]; unlocked: boolean; built: boolean; spot: boolean; flash: boolean }) {
  const log = d.log ?? [];
  const counts = new Map<string, number>();
  for (const row of log) counts.set(row.subscriber, (counts.get(row.subscriber) ?? 0) + 1);
  const subs = [...counts.entries()].slice(0, 4);
  const max = Math.max(1, ...subs.map(([, n]) => n));
  const publishers = new Set(log.map((r) => r.publisher));
  return (
    <HeroFrame id="fl-bus" title="Event bus" unlocked={unlocked} lesson={5} spot={spot} flash={flash} right={built && d.log ? `${log.length} deliveries` : undefined}>
      {!built ? (
        <p className="hud-muted text-[11px]">Press Run to watch events flow.</p>
      ) : subs.length === 0 ? (
        <p className="hud-muted text-[11px]">No deliveries yet. Raise an event with a subscriber attached.</p>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1">
            <div className="grid h-10 w-10 place-items-center rounded-full border-2 border-[#c5ee8a]/70 bg-white/[0.03]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#c5ee8a]" aria-hidden />
            </div>
            <span className="hud-value max-w-full truncate text-[9px] leading-none text-[#d3f3a4]">{publishers.size > 1 ? `${publishers.size} publishers` : ([...publishers][0] ?? "")}</span>
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            {subs.map(([name, n]) => (
              <div key={name} className="flex min-w-0 items-center gap-2">
                <span className="hud-value w-[5.5rem] shrink-0 truncate text-[10px] text-white/75">{name}</span>
                <div className="hud-bar !h-2 flex-1">
                  <span style={{ width: `${(n / max) * 100}%` }} />
                </div>
                <span className="hud-value w-4 shrink-0 text-right text-[10px] text-[#d3f3a4]">{n}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </HeroFrame>
  );
}

const SPAN_COLOR: Record<string, string> = { done: C.lime, failed: C.red, cancelled: C.amber };

/** The async spans as thin bars on a shared time axis. */
export function MiniTimeline({ d, unlocked, built, spot, flash }: { d: Desk["timeline"]; unlocked: boolean; built: boolean; spot: boolean; flash: boolean }) {
  const spans = (d.spans ?? []).slice(0, 8);
  const end = Math.max(1, ...spans.map((s) => s.end));
  return (
    <HeroFrame id="fl-timeline" title="Task timeline" unlocked={unlocked} lesson={11} spot={spot} flash={flash} right={built && d.spans ? `${(d.spans ?? []).length} tasks` : undefined}>
      {!built ? (
        <p className="hud-muted text-[11px]">Press Run to draw the task bars.</p>
      ) : spans.length === 0 ? (
        <p className="hud-muted text-[11px]">No tasks recorded yet.</p>
      ) : (
        <svg viewBox="0 0 320 84" className="block h-full w-full" preserveAspectRatio="none" role="img" aria-label="Task timeline">
          {spans.map((s, i) => (
            <rect key={`${s.name}-${i}`} x={4 + (s.start / end) * 312} y={3 + i * 10} width={Math.max(3, ((s.end - s.start) / end) * 312)} height="6" rx="3" fill={SPAN_COLOR[s.state] ?? "#9f9f9f"} opacity={0.9} />
          ))}
        </svg>
      )}
    </HeroFrame>
  );
}

/** Shown instead of the report strip when the program failed to build or crashed. */
export function ErrorStrip({ error }: { error: NonNullable<Desk["error"]> }) {
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

/** The show-report strip: the capstone's numbers on one line. */
export function ReportStrip({ d, unlocked, built, spot, flash }: { d: Desk["show"]; unlocked: boolean; built: boolean; spot: boolean; flash: boolean }) {
  if (!unlocked) {
    return (
      <div data-panel="fl-show-strip" data-locked="" className={`flex min-w-0 items-center gap-2 rounded-[10px] border border-dashed px-3 py-2.5 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}>
        <Lock className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />
        <span className="hud-label min-w-0 flex-1 truncate !text-[11px]">Show report</span>
        <span className="hud-label shrink-0 !text-[10px] text-white/30">L18 · your whole program</span>
      </div>
    );
  }
  const r = d.report;
  return (
    <div data-panel="fl-show-strip" className={`hud-panel flex min-w-0 items-center gap-3 !px-3 !py-2 ${flash ? "pop-in" : ""}`}>
      <span className="flex shrink-0 items-center gap-2 text-[#c5ee8a]">
        <FeatureIcon id="fl-show" className="h-3.5 w-3.5" />
        <span className="hud-title">Show report</span>
      </span>
      {!built ? (
        <span className="hud-muted truncate text-[11px]">Press Run to run Act One.</span>
      ) : !r ? (
        <span className="hud-muted truncate text-[11px]">No report yet.</span>
      ) : (
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-0.5 font-mono text-[11px]">
          <span className="text-[#d3f3a4]">{r.fired ?? 0} fired</span>
          <span style={{ color: (r.failed ?? 0) > 0 ? C.red : "rgba(255,255,255,0.6)" }}>{r.failed ?? 0} failed</span>
          <span style={{ color: (r.skipped ?? 0) > 0 ? C.amber : "rgba(255,255,255,0.6)" }}>{r.skipped ?? 0} skipped</span>
          <span className="text-white/70">{r.retries ?? 0} retries</span>
          <span className="text-white/70">peak {r.peakLevel ?? "—"}</span>
        </div>
      )}
    </div>
  );
}

export function OverviewHeader({ fault, stateLabel, liveCount, total, generation, built }: { fault: boolean; stateLabel: string; liveCount: number; total: number; generation: number; built: boolean }) {
  return (
    <div className="relative flex min-w-0 shrink-0 items-center gap-2 px-0.5">
      <Lamp on={built ? true : undefined} bad={fault} size={9} />
      <h2 className="hud-title !text-[14px]">Lantern Hall show desk</h2>
      <span className={`hud-label min-w-0 truncate !text-[11px] ${fault ? "hud-danger" : "text-white/55"}`}>· {stateLabel}</span>
      <span className="hud-label ml-auto shrink-0 !text-[11px]">
        <span className={`hud-value ${liveCount > 0 ? "hud-accent" : "text-white/45"}`}>{liveCount}</span>/{total} systems live
      </span>
      {built && <span key={generation} aria-hidden className="fl-scan pointer-events-none absolute inset-x-0 -bottom-1 h-px bg-gradient-to-r from-transparent via-[#c5ee8a] to-transparent" />}
    </div>
  );
}

export { some };
