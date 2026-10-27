"use client";

import React, { useEffect, useState } from "react";
import { BAD, LIME, NEG, WARN, pct, type Vars } from "./data.ts";
import { Chip, Label, Legend, LineChart, Meter, Note, PixelGrid, Stat, useActive } from "./ui.tsx";

// ───────────────────────── 12 · Confusion matrix and mistakes ─────────────────────────

export function ConfusionBody({ vars, compact = false }: { vars: Vars; compact?: boolean }) {
  const m = vars.confusion;
  if (!m) return <Note>Waiting for <span className="hud-warning">confusion</span> in your file.</Note>;
  const total = m.flat().reduce((a, b) => a + b, 0) || 1;
  const hits = m.reduce((a, row, i) => a + row[i], 0);
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2.5"}>
      <div role="table" aria-label="Confusion matrix: rows are the true digit, columns are the network's guess">
        <div className="grid items-center gap-[2px]" style={{ gridTemplateColumns: "0.9rem repeat(10, minmax(0, 1fr))" }} role="row">
          <span />
          {Array.from({ length: 10 }, (_, d) => (
            <span key={d} className="text-center font-mono text-[9px] text-white/70" role="columnheader">
              {d}
            </span>
          ))}
        </div>
        {m.map((row, i) => {
          const rowTotal = row.reduce((a, b) => a + b, 0) || 1;
          return (
            <div key={i} className="mt-[2px] grid items-center gap-[2px]" style={{ gridTemplateColumns: "0.9rem repeat(10, minmax(0, 1fr))" }} role="row">
              <span className="text-center font-mono text-[9px] text-white/70" role="rowheader">
                {i}
              </span>
              {row.map((c, j) => (
                <div
                  key={j}
                  role="cell"
                  title={`true ${i}, guessed ${j}: ${c}`}
                  className={`grid place-items-center rounded-[3px] font-mono ${compact ? "h-[12px] text-[8px]" : "h-[20px] text-[10px]"}`}
                  style={{
                    background: c === 0 ? "rgba(255,255,255,0.035)" : i === j ? `rgba(197,238,138,${0.16 + (c / rowTotal) * 0.55})` : `rgba(248,113,113,${0.25 + Math.min(1, (c / rowTotal) * 2.5) * 0.5})`,
                    color: c === 0 ? "rgba(255,255,255,0.3)" : "#f4f4f4",
                  }}
                >
                  {c === 0 ? "·" : c}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip tone="lime">{pct(hits / total, 1)} right</Chip>
        {vars.worstPairs.slice(0, compact ? 2 : 4).map((p) => (
          <Chip key={`${p[0]}-${p[1]}`} tone="danger" title={`${p[2]} glyphs of digit ${p[0]} were read as ${p[1]}`}>
            {p[0]}→{p[1]} ×{p[2]}
          </Chip>
        ))}
      </div>
      {!compact && vars.mistakes.length > 0 && (
        <div className="border-t border-white/10 pt-2">
          <Label>some of the mistakes</Label>
          <ul className="mt-1.5 grid grid-cols-6 gap-1.5">
            {vars.mistakes.slice(0, 12).map((mk, i) => (
              <li key={i} className="min-w-0 rounded-[5px] border border-[#f87171]/60 bg-[#f87171]/10 p-[2px]">
                <PixelGrid values={mk.pixels} label={`a ${mk.truth} that was read as ${mk.guess}`} />
                <span className="mt-[2px] block text-center font-mono text-[9px] leading-none text-white/85">
                  {mk.truth}
                  <span style={{ color: BAD }}>→{mk.guess}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 13 · Overfitting gap ─────────────────────────

export function OverfitBody({ vars }: { vars: Vars }) {
  const a = vars.free;
  const b = vars.decay;
  if (!a || !b) return <Note>Waiting for <span className="hud-warning">history_free</span> and <span className="hud-warning">history_decay</span> in your file.</Note>;
  return (
    <div className="space-y-2">
      <LineChart
        ariaLabel="Training and held-out accuracy with and without weight decay"
        height={112}
        yMin={0}
        yMax={1}
        yFmt={(v) => `${Math.round(v * 100)}%`}
        xLabel="epoch"
        series={[
          { values: a.trainAcc, color: NEG, dash: "4 3" },
          { values: a.evalAcc, color: NEG, width: 2 },
          { values: b.trainAcc, color: "#9f9f9f", dash: "4 3" },
          { values: b.evalAcc, color: LIME, width: 2 },
        ]}
      />
      <Legend
        items={[
          { color: NEG, label: "no decay · train", dash: true },
          { color: NEG, label: "no decay · held out" },
          { color: "#9f9f9f", label: "decay · train", dash: true },
          { color: LIME, label: "decay · held out" },
        ]}
      />
      <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-2">
        <Stat label="gap without decay" value={vars.gapFree !== null ? pct(vars.gapFree, 1) : "-"} tone="warn" />
        <Stat label="gap with decay" value={vars.gapDecay !== null ? pct(vars.gapDecay, 1) : "-"} tone="lime" />
        {vars.weightSize && <Stat label="weight size, no decay" value={vars.weightSize.free.toFixed(1)} />}
        {vars.weightSize && <Stat label="weight size, decay" value={vars.weightSize.decay.toFixed(1)} />}
      </div>
    </div>
  );
}

// ───────────────────────── 14 · Learning-rate seasons ─────────────────────────

const SCHEDULE_COLORS: Record<string, string> = { constant: "#9f9f9f", step: LIME, exp: NEG, warmup: WARN };
const colorFor = (name: string, i: number) => SCHEDULE_COLORS[name] ?? ["#7dd3fc", "#f0abfc", "#fdba74"][i % 3];

export function ScheduleBody({ vars, interactive, autoplay }: { vars: Vars; interactive: boolean; autoplay: boolean }) {
  const curves = vars.lrCurves;
  const n = curves[0]?.values.length ?? 0;
  const [cursor, setCursor] = useState(Math.min(3, Math.max(0, n - 1)));
  const active = useActive();
  useEffect(() => {
    if (!autoplay || !active || n < 2) return;
    const id = setInterval(() => setCursor((c) => (c + 1) % n), 700);
    return () => clearInterval(id);
  }, [autoplay, active, n]);
  if (curves.length === 0) return <Note>Waiting for <span className="hud-warning">lr_curves</span> in your file.</Note>;
  const at = Math.min(cursor, n - 1);
  const hi = Math.max(...curves.flatMap((c) => c.values));
  const study = vars.scheduleStudy;
  const bestAcc = Math.max(0, ...study.map((s) => s.accuracy));
  return (
    <div className="space-y-2">
      <LineChart
        ariaLabel="Learning rate per epoch for each schedule"
        height={104}
        yMin={0}
        yMax={hi * 1.08}
        yFmt={(v) => v.toFixed(2)}
        xLabel="epoch"
        cursor={at}
        series={curves.map((c, i) => ({ values: c.values, color: colorFor(c.name, i), width: c.name === "step" ? 2 : 1.6 }))}
      />
      <Legend items={curves.map((c, i) => ({ color: colorFor(c.name, i), label: `${c.name} ${c.values[at] !== undefined ? c.values[at].toFixed(3) : ""}` }))} />
      {interactive && n > 1 && (
        <label className="flex items-center gap-2 font-mono text-[10px] text-white/70">
          epoch {at}
          <input type="range" min={0} max={n - 1} value={at} onChange={(e) => setCursor(Number(e.target.value))} className="h-1 min-w-0 flex-1 accent-[#c5ee8a]" aria-label="Scrub through the epochs" />
        </label>
      )}
      {study.length > 0 && (
        <div className="space-y-1.5 border-t border-white/10 pt-2">
          <Label>held-out accuracy after the same short run</Label>
          {study.map((s) => (
            <div key={s.name} className="grid grid-cols-[6.6rem_1fr_2.8rem] items-center gap-2">
              <span className="truncate font-mono text-[10px] text-white/85">{s.name}</span>
              <Meter value={Math.max(0, (s.accuracy - 0.5) / 0.5)} color={s.accuracy === bestAcc ? LIME : "rgba(255,255,255,0.45)"} height={6} />
              <span className="hud-value text-right text-[10px]">{pct(s.accuracy, 1)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 15 · Early stopping ─────────────────────────

export function ValidationBody({ vars }: { vars: Vars }) {
  const scores = vars.lrScores;
  const run = vars.runs.find((r) => r.id === "stop")?.history ?? null;
  if (scores.length === 0 && !run) return <Note>Waiting for <span className="hud-warning">lr_scores</span> and <span className="hud-warning">history_stop</span> in your file.</Note>;
  const best = scores.length ? Math.max(...scores.map((s) => s.score)) : 0;
  const info = vars.stopInfo;
  return (
    <div className="space-y-2.5">
      {scores.length > 0 && (
        <div>
          <Label>validation accuracy for each learning rate</Label>
          <div className="mt-1.5 space-y-1.5">
            {scores.map((s) => {
              const isBest = s.score === best;
              return (
                <div key={s.lr} className="grid grid-cols-[2.6rem_1fr_2.8rem] items-center gap-2">
                  <span className="font-mono text-[10.5px]" style={{ color: isBest ? LIME : "rgba(255,255,255,0.85)" }}>
                    {s.lr}
                  </span>
                  <Meter value={s.score} color={isBest ? LIME : "rgba(255,255,255,0.4)"} height={7} />
                  <span className="hud-value text-right text-[10.5px]">{pct(s.score)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {run && run.valLoss.length > 1 && (
        <div className="border-t border-white/10 pt-2">
          <Label>training loss against validation loss</Label>
          <LineChart
            ariaLabel="Training loss and validation loss per epoch with the best epoch marked"
            height={104}
            yMin={0}
            yFmt={(v) => v.toFixed(1)}
            xLabel="epoch"
            markers={info ? [{ x: info.best, label: "best", color: LIME }] : []}
            series={[
              { values: run.loss, color: "#9f9f9f", dash: "4 3" },
              { values: run.valLoss, color: LIME, width: 2 },
            ]}
          />
          <Legend items={[{ color: "#9f9f9f", label: "training", dash: true }, { color: LIME, label: "validation" }]} />
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-2">
        <Stat label="chosen rate" value={vars.bestLr !== null ? String(vars.bestLr) : "-"} tone="lime" />
        <Stat label="best epoch" value={info ? info.best : "-"} />
        <Stat label="stopped at" value={info ? info.stopped : "-"} />
      </div>
      <p className="text-[10px] leading-snug text-white/65">Choose with the validation split. The test set stays sealed until the very end.</p>
    </div>
  );
}

