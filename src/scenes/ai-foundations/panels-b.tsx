"use client";

/**
 * Panels for chapter 3: fitting numbers. A line through price against weight, the gradient descent
 * that finds it, the four-measurement price model and the sigmoid ripeness model.
 */
import React, { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { BAD, FEATS, KIND_COLOR, LIME, RIPE_COLOR, UNRIPE_COLOR, featureRange, niceTicks, pct, type Row } from "./data.ts";
import type { View } from "./store.ts";
import { Axis, Chip, Dot, GRID, Note, pathOf, scale, signed, useActive } from "./ui.tsx";

const W = 360;
const H = 170;
const M = { l: 34, r: 8, t: 8, b: 22 };

export function Spark({ values, color = LIME, height = 26, cursor }: { values: number[]; color?: string; height?: number; cursor?: number }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const sx = scale(0, values.length - 1, 1, 99);
  const sy = scale(lo, hi === lo ? lo + 1 : hi, height - 2, 2);
  const d = pathOf(values.map((v, i) => [sx(i), sy(v)]));
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="block w-full" style={{ height }} aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      {cursor !== undefined && <line x1={sx(cursor)} x2={sx(cursor)} y1={0} y2={height} stroke="rgba(255,255,255,0.4)" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

// ───────────────────────── price against weight ─────────────────────────

function priceRange(rows: Row[]) {
  const prices = rows.map((r) => r.price);
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  return { lo: Math.max(0, Math.floor((lo - 0.05) * 10) / 10), hi: Math.ceil((hi + 0.05) * 10) / 10 };
}

function LineFit({ rows, w, b, unit, sticks, tint = LIME }: { rows: Row[]; w: number; b: number; unit: number; sticks?: boolean; tint?: string }) {
  if (!rows.length) return null;
  const rx = featureRange(rows, "weight");
  const ry = priceRange(rows);
  const sx = scale(rx.lo, rx.hi, M.l, W - M.r);
  const sy = scale(ry.lo, ry.hi, H - M.b, M.t);
  const at = (weight: number) => w * (weight / unit) + b;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Price against weight with a fitted line">
      <Axis x0={M.l} x1={W - M.r} y0={M.t} y1={H - M.b} xTicks={niceTicks(rx, 5)} yTicks={niceTicks(ry, 4)} sx={sx} sy={sy} fy={(v) => `$${v.toFixed(1)}`} />
      <text x={(M.l + W - M.r) / 2} y={H - 2} textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill="rgba(255,255,255,0.5)">
        weight (g)
      </text>
      {rows.map((r, i) => (
        <g key={i}>
          {sticks && i % 3 === 0 && <line x1={sx(r.weight)} x2={sx(r.weight)} y1={sy(r.price)} y2={sy(Math.min(ry.hi, Math.max(ry.lo, at(r.weight))))} stroke={BAD} strokeOpacity={0.45} strokeWidth={0.8} />}
          <circle cx={sx(r.weight)} cy={sy(r.price)} r={2.2} fill={KIND_COLOR[r.kind]} fillOpacity={0.7} />
        </g>
      ))}
      <line x1={sx(rx.lo)} y1={sy(Math.min(ry.hi, Math.max(ry.lo, at(rx.lo))))} x2={sx(rx.hi)} y2={sy(Math.min(ry.hi, Math.max(ry.lo, at(rx.hi))))} stroke={tint} strokeWidth={2} strokeLinecap="round" />
    </svg>
  );
}

function trainRows(view: View): Row[] {
  const v = view.vars;
  return v.trainIdx ? v.trainIdx.map((i) => v.rows[i]).filter(Boolean) : v.rows;
}

export function LineBody({ view }: { view: View }) {
  const v = view.vars;
  if (v.lineW === null || v.lineB === null) return null;
  const rows = trainRows(view);
  return (
    <div className="space-y-2">
      <LineFit rows={rows} w={v.lineW} b={v.lineB} unit={v.weightUnit} sticks />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="hud-value text-[11px]">
          price = <span className="hud-accent">{v.lineW.toFixed(3)}</span> × weight/{v.weightUnit} + <span className="hud-accent">{v.lineB.toFixed(3)}</span>
        </p>
        {v.searchMse !== null && <Chip tone="lime">mse {v.searchMse.toFixed(4)}</Chip>}
      </div>
      <p className="text-[10px] leading-snug text-white/45">Red sticks are the errors. Mean squared error is their average square: the smaller, the better the line.</p>
    </div>
  );
}

// ───────────────────────── gradient descent ─────────────────────────

/** Steps a replay counter on a timer; `pause` freezes it. Pure UI state, no learner calls. */
function useReplay(length: number, speed: number) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const active = useActive();
  useEffect(() => {
    if (!playing || !active || length < 2) return;
    const id = setInterval(() => setT((cur) => (cur >= length - 1 + 18 ? 0 : cur + speed)), 50);
    return () => clearInterval(id);
  }, [playing, active, length, speed]);
  return { t: Math.min(length - 1, Math.floor(t)), setT, playing, setPlaying };
}

export function DescentBody({ view, interactive }: { view: View; interactive: boolean }) {
  const v = view.vars;
  const steps = v.fitHistory;
  const replay = useReplay(steps.length, Math.max(1, steps.length / 90));
  if (steps.length < 2) return null;
  const rows = trainRows(view);
  const step = steps[replay.t];
  const losses = v.lossHistory.length === steps.length ? v.lossHistory : steps.map((s) => s.loss);
  return (
    <div className="space-y-2">
      <LineFit rows={rows} w={step.w} b={step.b} unit={v.weightUnit} tint={replay.t >= steps.length - 2 ? LIME : "#fbbf24"} />
      <div className="flex items-center gap-2">
        <button type="button" disabled={!interactive} onClick={() => replay.setPlaying(!replay.playing)} className="hud-btn !h-6 !px-2 disabled:opacity-60" aria-label={replay.playing ? "Pause" : "Play"}>
          {replay.playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </button>
        <input
          type="range"
          min={0}
          max={steps.length - 1}
          value={replay.t}
          disabled={!interactive}
          onChange={(e) => {
            replay.setPlaying(false);
            replay.setT(Number(e.target.value));
          }}
          className="min-w-0 flex-1 accent-[#c5ee8a]"
          aria-label="Training epoch"
        />
        <span className="hud-value w-16 shrink-0 text-right text-[10px] text-white/60">epoch {step.epoch}</span>
      </div>
      <div>
        <div className="mb-0.5 flex items-baseline justify-between">
          <span className="hud-label">loss (mse)</span>
          <span className="hud-value text-[10.5px]">{step.loss.toFixed(4)}</span>
        </div>
        <Spark values={losses} cursor={replay.t} height={34} />
      </div>
      <p className="hud-value text-[10.5px] text-white/60">
        w {step.w.toFixed(3)} · b {step.b.toFixed(3)}
        {v.lineTestMse !== null && <span className="ml-2 text-white/40">test mse {v.lineTestMse.toFixed(4)}</span>}
      </p>
    </div>
  );
}

// ───────────────────────── four measurements ─────────────────────────

export function PriceBody({ view }: { view: View }) {
  const v = view.vars;
  const pts = view.priceCompare;
  if (!pts) return <Note>Asking your price_for() about the test fruit…</Note>;
  const prices = pts.flatMap((p) => [p.actual, p.pred]);
  const r = { lo: Math.floor(Math.min(...prices) * 10) / 10, hi: Math.ceil(Math.max(...prices) * 10) / 10 };
  const sq = { w: 150, h: 142, l: 30, b: 20, t: 6, rr: 6 };
  const sx = scale(r.lo, r.hi, sq.l, sq.w - sq.rr);
  const sy = scale(r.lo, r.hi, sq.h - sq.b, sq.t);
  const ticks = niceTicks(r, 3);
  const weights = v.priceWeights;
  const names = [...FEATS, "bias"];
  const top = weights ? Math.max(...weights.map(Math.abs), 1e-9) : 1;
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="w-1/2 min-w-0">
        <svg viewBox={`0 0 ${sq.w} ${sq.h}`} className="block w-full" role="img" aria-label="Predicted price against real price">
          <Axis x0={sq.l} x1={sq.w - sq.rr} y0={sq.t} y1={sq.h - sq.b} xTicks={ticks} yTicks={ticks} sx={sx} sy={sy} fx={(t) => t.toFixed(1)} fy={(t) => t.toFixed(1)} />
          <line x1={sx(r.lo)} y1={sy(r.lo)} x2={sx(r.hi)} y2={sy(r.hi)} stroke="rgba(255,255,255,0.35)" strokeDasharray="3 3" />
          {pts.map((p, i) => (
            <circle key={i} cx={sx(p.pred)} cy={sy(p.actual)} r={2.3} fill={KIND_COLOR[p.kind]} fillOpacity={0.8} />
          ))}
          <text x={(sq.l + sq.w) / 2} y={sq.h - 2} textAnchor="middle" fontSize="7.5" fontFamily="var(--font-mono)" fill="rgba(255,255,255,0.5)">
            predicted ($)
          </text>
        </svg>
        <p className="text-center text-[9.5px] text-white/40">dashed line = perfect guess</p>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {weights && (
          <div className="space-y-1">
            <p className="hud-label">what moves the price</p>
            {weights.slice(0, 5).map((w, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className="w-9 shrink-0 font-mono text-[8.5px] uppercase text-white/40">{names[i]?.slice(0, 4)}</span>
                <div className="relative h-1.5 min-w-0 flex-1 rounded-full bg-white/[0.06]">
                  <div className="absolute inset-y-0 w-px bg-white/25" style={{ left: "50%" }} />
                  <div
                    className="absolute inset-y-0 rounded-full"
                    style={{ background: w >= 0 ? LIME : "#b794f6", left: w >= 0 ? "50%" : `${50 - (Math.abs(w) / top) * 50}%`, width: `${(Math.abs(w) / top) * 50}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {v.priceTrainMse !== null && <Chip>train {v.priceTrainMse.toFixed(4)}</Chip>}
          {v.priceTestMse !== null && <Chip tone="lime">test {v.priceTestMse.toFixed(4)}</Chip>}
        </div>
        {v.lineTestMse !== null && v.priceTestMse !== null && (
          <p className="text-[10px] leading-snug text-white/50">
            One measurement gave {v.lineTestMse.toFixed(4)}. Four cut the error by <span className="hud-accent">{pct(1 - v.priceTestMse / v.lineTestMse)}</span>.
          </p>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── ripeness ─────────────────────────

export function RipeBody({ view }: { view: View }) {
  const v = view.vars;
  const curve = view.ripeCurve;
  if (!curve) return <Note>Asking your ripe_probability() across the sugar range…</Note>;
  const lo = curve[0].x;
  const hi = curve[curve.length - 1].x;
  const sx = scale(lo, hi, M.l, W - M.r);
  const sy = scale(0, 1, H - M.b, M.t);
  const d = pathOf(curve.map((p) => [sx(p.x), sy(p.y)]));
  const area = `${d} L${sx(hi).toFixed(1)} ${sy(0)} L${sx(lo).toFixed(1)} ${sy(0)}Z`;
  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Probability of being ripe against sugar">
        <Axis x0={M.l} x1={W - M.r} y0={M.t} y1={H - M.b} xTicks={niceTicks({ lo, hi }, 5)} yTicks={[0, 0.5, 1]} sx={sx} sy={sy} fy={(t) => t.toFixed(1)} />
        <text x={(M.l + W - M.r) / 2} y={H - 2} textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill="rgba(255,255,255,0.5)">
          sugar (Brix)
        </text>
        <line x1={M.l} x2={W - M.r} y1={sy(0.5)} y2={sy(0.5)} stroke={GRID} strokeDasharray="3 3" />
        <path d={area} fill={LIME} fillOpacity={0.07} />
        {v.rows.map((r, i) => {
          const jitter = ((i * 37) % 11) / 11;
          return <circle key={i} cx={sx(r.sugar)} cy={r.ripe ? sy(1) + 2 + jitter * 7 : sy(0) - 2 - jitter * 7} r={1.9} fill={r.ripe ? RIPE_COLOR : UNRIPE_COLOR} fillOpacity={0.55} />;
        })}
        <path d={d} fill="none" stroke={LIME} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="hud-label flex items-center gap-1.5">
          <Dot color={RIPE_COLOR} />
          ripe
        </span>
        <span className="hud-label flex items-center gap-1.5">
          <Dot color={UNRIPE_COLOR} />
          not yet
        </span>
        <span className="ml-auto flex gap-1.5">
          {v.ripeAcc !== null && <Chip tone="lime">accuracy {pct(v.ripeAcc)}</Chip>}
          {v.ripeWeights && <Chip>w {signed(v.ripeWeights[0], 2)}</Chip>}
        </span>
      </div>
      {v.ripeLoss.length > 1 && (
        <div>
          <div className="flex items-baseline justify-between">
            <span className="hud-label">log loss</span>
            <span className="hud-value text-[10.5px]">
              {v.ripeLoss[0].toFixed(2)} → {v.ripeLoss[v.ripeLoss.length - 1].toFixed(2)}
            </span>
          </div>
          <Spark values={v.ripeLoss} height={24} />
        </div>
      )}
    </div>
  );
}

