"use client";

/**
 * The compact overview: what the lab shows when its stage is short and wide (the project hub card,
 * the landing page), so the belt, the plot and the headline numbers read at a glance without
 * scrolling. It is drawn at a fixed logical size and scaled to fit by the scene.
 */
import React from "react";
import { Lock } from "lucide-react";
import { KINDS, KIND_COLOR, LIME, pct } from "./data.ts";
import type { View } from "./store.ts";
import { Spark } from "./panels-b.tsx";
import { Meter, PANEL } from "./ui.tsx";

export const OVERVIEW_W = 780;
export const OVERVIEW_H = 460;

/** Short and wide stages get the overview (same thresholds as the other scenes). */
export const isCompactStage = (box: { w: number; h: number } | null) => box !== null && box.w >= 420 && box.h <= 600 && box.w / box.h >= 1.2;

function MiniLocked({ id, title, spot }: { id: string; title?: string; spot: boolean }) {
  const def = PANEL[id];
  return (
    <div data-panel={id} data-locked="" className={`flex min-w-0 items-center gap-2 rounded-[10px] border border-dashed px-2.5 py-2 ${spot ? "pulse-ring border-[#c5ee8a]/60" : "border-white/15"}`}>
      <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />
      <span className="hud-label min-w-0 flex-1 truncate !text-[10.5px]">{title ?? def.title}</span>
      <span className="hud-label shrink-0 !text-[10px] text-white/30">L{def.lesson}</span>
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
        {meta && <span className="hud-value hud-muted shrink-0 text-[10px]">{meta}</span>}
      </header>
      {children}
    </section>
  );
}

export function OverviewSide({ view, alive, focus, flash }: { view: View; alive: (id: string) => boolean; focus: string | null; flash: Set<string> }) {
  const v = view.vars;
  const m = v.confusion;
  const loss = v.lossHistory.length > 1 ? { id: "oa-descent", values: v.lossHistory, label: "loss (mse)" } : v.ripeLoss.length > 1 ? { id: "oa-ripeness", values: v.ripeLoss, label: "log loss" } : null;
  const hits = m ? m.reduce((a, row, i) => a + row[i], 0) : 0;
  const total = m ? m.flat().reduce((a, b) => a + b, 0) || 1 : 1;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5">
      <div className="grid grid-cols-2 items-stretch gap-2.5">
      {alive("oa-split") && v.trainAcc !== null && v.testAcc !== null && !view.missing["oa-split"] ? (
        <Card id="oa-split" title="Accuracy" flash={flash.has("oa-split")} focus={focus === "oa-split"} meta={`seed ${v.seed ?? "?"}`}>
          <div className="space-y-1.5">
            {[
              { label: "train", value: v.trainAcc, color: "#9f9f9f" },
              { label: "test", value: v.testAcc, color: LIME },
            ].map((r) => (
              <div key={r.label} className="grid grid-cols-[2rem_1fr_2.6rem] items-center gap-2">
                <span className="hud-label">{r.label}</span>
                <Meter value={r.value} color={r.color} height={6} />
                <span className="hud-value text-right text-[11px]">{pct(r.value)}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <MiniLocked id="oa-split" title="Accuracy" spot={focus === "oa-split"} />
      )}

      {loss && alive(loss.id) && !view.missing[loss.id] ? (
        <Card id={loss.id} title="Loss" flash={flash.has(loss.id)} focus={focus === loss.id} meta={loss.values[loss.values.length - 1].toFixed(4)}>
          <Spark values={loss.values} height={34} />
        </Card>
      ) : (
        <MiniLocked id="oa-descent" title="Loss" spot={focus === "oa-descent"} />
      )}

      </div>

      {alive("oa-confusion") && m && !view.missing["oa-confusion"] ? (
        <Card id="oa-confusion" flash={flash.has("oa-confusion")} focus={focus === "oa-confusion"} meta={`${pct(hits / total)} right`}>
          <div className="grid grid-cols-[1rem_repeat(3,minmax(0,1fr))] gap-[3px]">
            {m.map((row, i) => {
              const rowTotal = row.reduce((a, b) => a + b, 0) || 1;
              return (
                <React.Fragment key={KINDS[i]}>
                  <span className="grid place-items-center">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ background: KIND_COLOR[KINDS[i]] }} />
                  </span>
                  {row.map((c, j) => (
                    <div
                      key={j}
                      className="hud-value grid h-[22px] place-items-center rounded text-[11px]"
                      style={{
                        background: c === 0 ? "rgba(255,255,255,0.03)" : i === j ? `rgba(197,238,138,${0.12 + (c / rowTotal) * 0.5})` : `rgba(248,113,113,${0.18 + Math.min(1, (c / rowTotal) * 2) * 0.5})`,
                        color: c === 0 ? "rgba(255,255,255,0.25)" : "#f4f4f4",
                      }}
                    >
                      {c}
                    </div>
                  ))}
                </React.Fragment>
              );
            })}
          </div>
        </Card>
      ) : (
        <MiniLocked id="oa-confusion" spot={focus === "oa-confusion"} />
      )}
    </div>
  );
}
