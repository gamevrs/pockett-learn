"use client";

/**
 * The compact overview: what the greenhouse shows when its stage is short and wide (the project hub card,
 * the landing page), so the network, the headline numbers and the confusion matrix read at a glance
 * without scrolling. It is drawn at a fixed logical size and scaled to fit by the scene.
 */
import React from "react";
import { Lock } from "lucide-react";
import { BAD, LIME, NEG, pct, type Vars } from "./data.ts";
import type { PanelCtx } from "./ctx.ts";
import { ConfusionBody } from "./panels-c.tsx";
import { GlyphsBody } from "./panels-a.tsx";
import { LineChart, Meter, PANEL, PixelGrid } from "./ui.tsx";

export const OVERVIEW_W = 820;
export const OVERVIEW_H = 500;

/** Short and wide stages get the overview (same thresholds as the other scenes). */
export const isCompactStage = (box: { w: number; h: number } | null) => box !== null && box.w >= 420 && box.h <= 600 && box.w / box.h >= 1.2;

function MiniLocked({ id, title, spot }: { id: string; title?: string; spot: boolean }) {
  const def = PANEL[id];
  return (
    <div data-panel={id} data-locked="" className={`flex min-w-0 items-center gap-2 rounded-[10px] border border-dashed px-2.5 py-2 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}>
      <Lock className="h-3 w-3 shrink-0 text-white/50" aria-hidden />
      <span className="hud-label min-w-0 flex-1 truncate !text-[10.5px] !text-white/60">{title ?? def.title}</span>
      <span className="hud-label shrink-0 !text-[10px] !text-white/50">L{def.lesson}</span>
    </div>
  );
}

function Card({ id, title, flash, focus, meta, children }: { id: string; title?: string; flash: boolean; focus: boolean; meta?: React.ReactNode; children: React.ReactNode }) {
  const def = PANEL[id];
  const Icon = def.icon;
  return (
    <section data-panel={id} className={`hud-panel min-w-0 !px-2.5 !py-2 ${focus ? "border-[#c5ee8a]/40" : ""} ${flash ? "pop-in" : ""}`}>
      <header className="mb-1.5 flex min-w-0 items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]" aria-hidden />
        <h3 className="hud-title min-w-0 flex-1 truncate">{title ?? def.title}</h3>
        {meta && <span className="hud-value shrink-0 text-[10px] text-white/60">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

/** The latest training run's numbers, whichever lesson produced it. */
function latest(v: Vars) {
  const run = v.runs.length ? v.runs[v.runs.length - 1] : null;
  const h = run?.history ?? null;
  const train = h && h.trainAcc.length ? h.trainAcc[h.trainAcc.length - 1] : null;
  const held = v.report?.testAccuracy ?? (h && h.evalAcc.length ? h.evalAcc[h.evalAcc.length - 1] : null);
  return { h, train, held, label: v.report ? "test" : run?.id === "stop" || run?.id === "final" ? "validation" : "held out" };
}

export function OverviewSide({ ctx, alive, focus, flash }: { ctx: PanelCtx; alive: (id: string) => boolean; focus: string | null; flash: Set<string> }) {
  const v = ctx.vars;
  const { h, train, held, label } = latest(v);
  const haveCurves = alive("gn-training") && h !== null;
  const haveConfusion = alive("gn-confusion") && v.confusion;
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5">
      <div className="grid grid-cols-2 items-stretch gap-2.5">
        {haveCurves && held !== null ? (
          <Card id="gn-training" title="Accuracy" flash={flash.has("gn-training")} focus={focus === "gn-training"} meta={`${h.loss.length} epochs`}>
            <div className="space-y-1.5">
              {[
                { label: "train", value: train ?? 0, color: "#9f9f9f" },
                { label: label, value: held, color: LIME },
              ].map((r) => (
                <div key={r.label} className="grid grid-cols-[3.4rem_1fr_2.6rem] items-center gap-2">
                  <span className="hud-label !text-white/60">{r.label}</span>
                  <Meter value={r.value} color={r.color} height={6} />
                  <span className="hud-value text-right text-[11px]">{pct(r.value)}</span>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <MiniLocked id="gn-training" title="Accuracy" spot={focus === "gn-training"} />
        )}
        {haveCurves ? (
          <Card id="gn-training" title="Loss" flash={flash.has("gn-training")} focus={focus === "gn-training"} meta={h.loss[h.loss.length - 1].toFixed(3)}>
            <LineChart ariaLabel="Loss per epoch" height={44} yMin={0} yTicks={2} yFmt={(x) => x.toFixed(1)} series={[{ values: h.loss, color: LIME, width: 1.8 }]} />
          </Card>
        ) : (
          <MiniLocked id="gn-training" title="Loss" spot={focus === "gn-training"} />
        )}
      </div>
      {haveConfusion ? (
        <Card id="gn-confusion" flash={flash.has("gn-confusion")} focus={focus === "gn-confusion"}>
          <ConfusionBody vars={v} compact />
        </Card>
      ) : alive("gn-glyphs") && v.gallery.length > 0 ? (
        <Card id="gn-glyphs" flash={flash.has("gn-glyphs")} focus={focus === "gn-glyphs"} meta={`${v.gallery.length} test glyphs`}>
          <GlyphsBody ctx={ctx} compact />
        </Card>
      ) : (
        <MiniLocked id="gn-glyphs" spot={focus === "gn-glyphs"} />
      )}
    </div>
  );
}

/** The bottom row of the overview: predictions, curves, the learning-rate seasons and the draw pad, one small tile each. */
export function OverviewBottom({ ctx, alive, focus, flash }: { ctx: PanelCtx; alive: (id: string) => boolean; focus: string | null; flash: Set<string> }) {
  const v = ctx.vars;
  const { h } = latest(v);
  const over = alive("gn-overfit") && v.free && v.decay ? v : null;
  const seasons = alive("gn-schedule") && v.lrCurves.length > 0 ? v.lrCurves : null;
  const padOn = alive("gn-pad") && v.hasPredict;
  // twelve glyphs: the first test glyphs, then real mistakes so the wrong ones are visible
  const tiles: { pixels: number[]; truth: number | undefined; guess: number | null | undefined; wrong: boolean }[] = [];
  v.gallery.slice(0, v.mistakes.length ? 8 : 12).forEach((px, i) => {
    const guess = ctx.guesses[i];
    tiles.push({ pixels: px, truth: v.galleryLabels[i], guess, wrong: guess !== null && guess !== undefined && guess !== v.galleryLabels[i] });
  });
  if (alive("gn-confusion")) v.mistakes.slice(0, 4).forEach((m) => tiles.push({ pixels: m.pixels, truth: m.truth, guess: m.guess, wrong: true }));
  const probe = ctx.probe;
  return (
    <div className="grid h-[140px] shrink-0 grid-cols-[1.35fr_1fr_1fr_0.8fr] gap-2.5">
      {alive("gn-glyphs") && tiles.length > 0 ? (
        <Card id="gn-glyphs" title="Predictions" flash={flash.has("gn-glyphs")} focus={focus === "gn-glyphs"} meta={ctx.guesses.some((g) => g !== null) ? "wrong ones in red" : undefined}>
          <ul className="grid grid-cols-6 gap-1">
            {tiles.slice(0, 12).map((t, i) => (
              <li key={i} className={`min-w-0 rounded-[4px] border p-[1.5px] ${t.wrong ? "border-[#f87171]/80 bg-[#f87171]/10" : "border-white/10 bg-white/[0.03]"}`}>
                <PixelGrid values={t.pixels} label={`glyph ${t.truth ?? "?"}`} />
                <span className="mt-[1px] flex justify-between font-mono text-[8px] leading-none text-white/80">
                  <span>{t.truth ?? "?"}</span>
                  {t.guess !== null && t.guess !== undefined && <span style={{ color: t.wrong ? BAD : LIME }}>{t.wrong ? `→${t.guess}` : "✓"}</span>}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <MiniLocked id="gn-glyphs" title="Predictions" spot={focus === "gn-glyphs"} />
      )}
      {alive("gn-training") && h && h.evalAcc.length > 1 ? (
        <Card id="gn-training" title="Train vs held out" flash={flash.has("gn-training")} focus={focus === "gn-training"}>
          <LineChart ariaLabel="Training and held-out accuracy" height={70} yMin={0} yMax={1} yTicks={2} yFmt={(x) => `${Math.round(x * 100)}%`} series={[{ values: h.trainAcc, color: "#9f9f9f" }, { values: h.evalAcc, color: LIME, width: 2 }]} />
        </Card>
      ) : (
        <MiniLocked id="gn-training" title="Train vs held out" spot={focus === "gn-training"} />
      )}
      {seasons ? (
        <Card id="gn-schedule" title="LR seasons" flash={flash.has("gn-schedule")} focus={focus === "gn-schedule"} meta={over ? `gap ${pct(over.gapFree ?? 0)}→${pct(over.gapDecay ?? 0)}` : undefined}>
          <LineChart
            ariaLabel="Learning rate per epoch for each schedule"
            height={70}
            yMin={0}
            yTicks={2}
            yFmt={(x) => x.toFixed(1)}
            series={seasons.map((c, i) => ({ values: c.values, color: [LIME, NEG, "#fbbf24", "#9f9f9f"][i % 4], width: 1.6 }))}
          />
        </Card>
      ) : (
        <MiniLocked id="gn-schedule" title="LR seasons" spot={focus === "gn-schedule"} />
      )}
      {padOn ? (
        <Card id="gn-pad" title="Draw pad" flash={flash.has("gn-pad")} focus={focus === "gn-pad"}>
          <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-lg border border-[#c5ee8a]/40 bg-[#c5ee8a]/10 font-mono text-[26px] font-semibold leading-none text-[#d3f3a4]">{probe?.pass ? probe.pass.guess : "·"}</div>
            <p className="font-mono text-[9px] leading-tight text-white/75">predict() is ready</p>
          </div>
        </Card>
      ) : (
        <MiniLocked id="gn-pad" title="Draw pad" spot={focus === "gn-pad"} />
      )}
    </div>
  );
}
