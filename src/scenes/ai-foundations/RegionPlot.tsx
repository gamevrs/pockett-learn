"use client";

/**
 * The feature-space plot: every measured fruit as a dot, and behind them the regions the learner's
 * classifier paints when it is asked about a coarse grid of imaginary fruit. Lesson 5 draws the
 * nearest-neighbour regions, lesson 6 the voting ones, lesson 7 marks which dots were held back for
 * the test. The fruit on the belt shows up as a ring with lines to the neighbours that decided it.
 */
import React, { useEffect, useRef } from "react";
import { Lock } from "lucide-react";
import {
  AXIS_PRESETS,
  BAD,
  FEAT_TITLE,
  FEAT_UNIT,
  KINDS,
  KIND_COLOR,
  KIND_NAME,
  LIME,
  featureRange,
  featsOf,
  niceTicks,
  type AxisPair,
  type FeatName,
  type Kind,
} from "./data.ts";
import type { OrchardStore, View } from "./store.ts";
import { Chip, NeedsHook, PANEL, scale, GRID, AXIS_TEXT } from "./ui.tsx";

const M = { l: 46, r: 12, t: 8, b: 30 };

function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const sameAxes = (a: AxisPair, b: AxisPair) => a.x === b.x && a.y === b.y;
const axisLabel = (f: FeatName) => `${FEAT_TITLE[f].toLowerCase()}${FEAT_UNIT[f] === "°" ? " (°)" : ` (${FEAT_UNIT[f]})`}`;

export function RegionPlot({
  view,
  store,
  interactive,
  autoplay,
  alive,
  focus,
  narrow,
  fill = false,
}: {
  view: View;
  store: OrchardStore;
  interactive: boolean;
  autoplay: boolean;
  alive: boolean;
  focus: string | null;
  narrow: boolean;
  /** Fill the height of the stage (landing page) instead of following the width. */
  fill?: boolean;
}) {
  const W = fill ? 520 : narrow ? 420 : 600;
  const H = fill ? 400 : narrow ? 340 : 330;
  const { vars, unlocked, axes, grid, preds, probe } = view;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rows = vars.rows;
  const hasData = alive && rows.length > 0;
  const rx = featureRange(rows, axes.x);
  const ry = featureRange(rows, axes.y);
  const sx = scale(rx.lo, rx.hi, M.l, W - M.r);
  const sy = scale(ry.lo, ry.hi, H - M.b, M.t);
  const splitOn = unlocked.has("oa-split") && !!vars.testIdx;
  const testSet = splitOn ? new Set(vars.testIdx) : null;
  const knnOn = unlocked.has("oa-knn");
  const nnOn = unlocked.has("oa-neighbour");
  const mode = view.classifier?.hook === "classify" ? `k = ${Math.round(vars.k ?? 3)} votes` : view.classifier ? "nearest neighbour" : null;
  const missing = view.missing["oa-neighbour"] ?? view.missing["oa-knn"];

  // Paint the region raster (one pixel per grid cell; the browser smooths it up and CSS blurs the seams).
  const rev = grid?.rev ?? -1;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (!grid) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    if (canvas.width !== grid.gw || canvas.height !== grid.gh) {
      canvas.width = grid.gw;
      canvas.height = grid.gh;
    }
    const img = ctx.createImageData(grid.gw, grid.gh);
    grid.data.forEach((kind, i) => {
      if (!kind) return;
      const [r, g, b] = rgbOf(KIND_COLOR[kind]);
      img.data.set([r, g, b, 78], i * 4);
    });
    ctx.putImageData(img, 0, 0);
  }, [grid, rev]);

  // The landing demo flips through the three views of the same fruit by itself.
  useEffect(() => {
    if (!autoplay) return;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % AXIS_PRESETS.length;
      store.setAxes(AXIS_PRESETS[i]);
    }, 9000);
    return () => clearInterval(id);
  }, [autoplay, store]);

  const xTicks = niceTicks(rx, 5);
  const yTicks = niceTicks(ry, 4);
  const counts = KINDS.map((k) => rows.filter((r) => r.kind === k).length);
  const probeFeats = probe ? (probe.insp.feats ?? featsOf(probe.insp.row)) : null;
  const probeAt = probeFeats ? { x: sx(probeFeats[["weight", "diameter", "hue", "sugar"].indexOf(axes.x)]), y: sy(probeFeats[["weight", "diameter", "hue", "sugar"].indexOf(axes.y)]) } : null;
  const probeKind: Kind | null = probe ? (probe.insp.predicted ?? probe.insp.label) : null;
  const def = PANEL["oa-neighbour"];
  const rangeOk = (p: { x: number; y: number }) => p.x >= M.l - 4 && p.x <= W - M.r + 4 && p.y >= M.t - 4 && p.y <= H - M.b + 4;

  return (
    <section data-panel="oa-neighbour" className={`hud-panel min-w-0 px-3 py-2.5 ${fill ? "flex h-full min-h-0 flex-col" : ""} ${focus === "oa-neighbour" || focus === "oa-knn" || focus === "oa-split" ? "border-[#c5ee8a]/40" : ""} ${hasData ? "" : "border-dashed"}`}>
      <header className="mb-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5">
        {hasData ? <def.icon className="h-3.5 w-3.5 shrink-0 text-[#c5ee8a]" aria-hidden /> : <Lock className="h-3 w-3 shrink-0 text-white/35" aria-hidden />}
        <h3 className="hud-title shrink-0">Feature space</h3>
        {mode && <Chip tone="lime">{mode}</Chip>}
        <div className="ml-auto flex flex-wrap items-center gap-1" role="group" aria-label="Choose the two measurements to plot">
          {AXIS_PRESETS.map((a) => {
            const on = sameAxes(a, axes);
            return (
              <button
                key={`${a.x}-${a.y}`}
                type="button"
                disabled={!interactive || !hasData}
                aria-pressed={on}
                onClick={() => store.setAxes(a)}
                className={`h-[22px] rounded-full border px-2 font-mono text-[9.5px] uppercase tracking-wide transition-colors ${
                  on ? "border-transparent bg-[#c5ee8a] text-[#0a0a0a]" : "border-white/12 text-white/55 enabled:hover:border-white/30 enabled:hover:text-white/85"
                } disabled:cursor-default`}
              >
                {a.x.slice(0, 4)} × {a.y.slice(0, 4)}
              </button>
            );
          })}
        </div>
      </header>

      <div className={fill ? "min-h-0 flex-1" : undefined} style={fill ? { containerType: "size" } : undefined}>
      <div className="relative mx-auto" style={fill ? { aspectRatio: `${W} / ${H}`, width: `min(100cqw, calc(100cqh * ${W / H}))` } : { aspectRatio: `${W} / ${H}`, width: "100%" }}>
        <div className="absolute overflow-hidden rounded-[3px]" style={{ left: `${(M.l / W) * 100}%`, top: `${(M.t / H) * 100}%`, width: `${((W - M.l - M.r) / W) * 100}%`, height: `${((H - M.t - M.b) / H) * 100}%` }}>
          <canvas
            ref={canvasRef}
            width={28}
            height={18}
            aria-hidden
            className="block h-full w-full"
            style={{ imageRendering: "auto", filter: "blur(7px)", transform: "scale(1.06)", opacity: grid && (nnOn || knnOn) ? 1 : 0, transition: "opacity 0.4s" }}
          />
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" role="img" aria-label="Scatter plot of measured fruit with the classifier's decision regions">
          <g fontSize={narrow ? 10 : 9} fontFamily="var(--font-mono)" fill={AXIS_TEXT}>
            {yTicks.map((t) => (
              <g key={`y${t}`}>
                <line x1={M.l} x2={W - M.r} y1={sy(t)} y2={sy(t)} stroke={GRID} />
                <text x={M.l - 5} y={sy(t) + 3} textAnchor="end">
                  {t}
                </text>
              </g>
            ))}
            {xTicks.map((t) => (
              <g key={`x${t}`}>
                <line x1={sx(t)} x2={sx(t)} y1={M.t} y2={H - M.b} stroke={GRID} />
                <text x={sx(t)} y={H - M.b + 12} textAnchor="middle">
                  {t}
                </text>
              </g>
            ))}
            <text x={(M.l + W - M.r) / 2} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.55)">
              {axisLabel(axes.x)}
            </text>
            <text transform={`translate(10 ${(M.t + H - M.b) / 2}) rotate(-90)`} textAnchor="middle" fill="rgba(255,255,255,0.55)">
              {axisLabel(axes.y)}
            </text>
          </g>
          <rect x={M.l} y={M.t} width={W - M.l - M.r} height={H - M.t - M.b} fill="none" stroke={hasData ? "rgba(255,255,255,0.12)" : "rgba(197,238,138,0.28)"} strokeDasharray={hasData ? undefined : "4 4"} />

          {hasData &&
            rows.map((r, i) => {
              const inTest = testSet?.has(i) ?? false;
              const p = { x: sx(r[axes.x]), y: sy(r[axes.y]) };
              const miss = inTest && !!preds?.data[i] && preds.data[i] !== r.kind;
              const color = KIND_COLOR[r.kind];
              return (
                <g key={i}>
                  {inTest ? <circle cx={p.x} cy={p.y} r={narrow ? 3.5 : 3.9} fill="rgba(10,10,10,0.5)" stroke={color} strokeWidth={1.6} /> : <circle cx={p.x} cy={p.y} r={narrow ? 2.4 : 2.7} fill={color} fillOpacity={0.82} stroke="rgba(10,10,10,0.6)" strokeWidth={0.6} />}
                  {miss && <circle cx={p.x} cy={p.y} r={7.5} fill="none" stroke={BAD} strokeWidth={1.4} />}
                  <title>{`${r.kind} · ${r.weight} g · ${r.diameter} mm · hue ${r.hue}° · ${r.sugar} Brix`}</title>
                </g>
              );
            })}

          {hasData && probe && probeAt && rangeOk(probeAt) && (
            <g>
              {probe.neighbours.map((i) => {
                const r = rows[i];
                if (!r) return null;
                const x = sx(r[axes.x]);
                const y = sy(r[axes.y]);
                return (
                  <g key={i}>
                    <line x1={probeAt.x} y1={probeAt.y} x2={x} y2={y} stroke={LIME} strokeOpacity={0.7} strokeWidth={1.2} strokeDasharray="3 3" />
                    <circle cx={x} cy={y} r={6} fill="none" stroke={LIME} strokeWidth={1.4} />
                  </g>
                );
              })}
              <circle cx={probeAt.x} cy={probeAt.y} r={5.5} fill={probeKind ? KIND_COLOR[probeKind] : "#fff"} stroke="#ffffff" strokeWidth={1.8}>
                <animate attributeName="r" values="5.5;8;5.5" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <circle cx={probeAt.x} cy={probeAt.y} r={11} fill="none" stroke="#ffffff" strokeOpacity={0.35} />
            </g>
          )}

          {!hasData && (
            <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="12" fontFamily="var(--font-mono)" fill="rgba(255,255,255,0.45)">
              {alive ? "Waiting for rows in your file…" : "Lesson 1 puts the fruit on the plot"}
            </text>
          )}
        </svg>
      </div>
      </div>

      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        {KINDS.map((k, i) => (
          <span key={k} className="hud-label flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: KIND_COLOR[k] }} />
            {KIND_NAME[k]}
            {hasData && <span className="hud-value hud-muted text-[10px] normal-case tracking-normal">{counts[i]}</span>}
          </span>
        ))}
        {splitOn && (
          <span className="hud-label flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full border-[1.5px] border-white/70" />
            held back for testing
          </span>
        )}
        <span className="ml-auto flex flex-wrap items-center gap-1.5">
          <Hint id="oa-neighbour" on={nnOn} text="1-NN regions" />
          <Hint id="oa-knn" on={knnOn} text="voting k" />
          <Hint id="oa-split" on={splitOn} text="test fruit" />
        </span>
      </div>
      {missing && <NeedsHook name={missing} />}
    </section>
  );
}

function Hint({ id, on, text }: { id: string; on: boolean; text: string }) {
  const def = PANEL[id];
  return (
    <span className={`inline-flex h-[18px] items-center gap-1 rounded-full border px-1.5 font-mono text-[9.5px] uppercase tracking-wide ${on ? "border-[#c5ee8a]/40 text-[#d3f3a4]" : "border-dashed border-white/15 text-white/35"}`}>
      {!on && <Lock className="h-2.5 w-2.5" aria-hidden />}
      {text}
      {!on && <span className="text-white/30">L{def.lesson}</span>}
    </span>
  );
}
