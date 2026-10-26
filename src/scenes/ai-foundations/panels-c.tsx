"use client";

/**
 * Panels for chapter 4: trusting the model. The decision threshold trade-off, under- and overfitting
 * across k, engineered features, and the finished pipeline.
 */
import React, { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { BAD, KINDS, KIND_COLOR, KIND_NAME, LIME, RIPE_COLOR, pct } from "./data.ts";
import type { View } from "./store.ts";
import { Axis, Chip, Dot, Gauge, Meter, Note, pathOf, scale, useActive } from "./ui.tsx";

const W = 360;
const H = 170;
const M = { l: 30, r: 8, t: 8, b: 22 };

// ───────────────────────── lesson 13: threshold ─────────────────────────

function at(rows: { threshold: number; precision: number; recall: number }[], t: number) {
  if (t <= rows[0].threshold) return rows[0];
  for (let i = 1; i < rows.length; i++) {
    if (t <= rows[i].threshold) {
      const a = rows[i - 1];
      const b = rows[i];
      const f = (t - a.threshold) / (b.threshold - a.threshold || 1);
      return { threshold: t, precision: a.precision + (b.precision - a.precision) * f, recall: a.recall + (b.recall - a.recall) * f };
    }
  }
  return rows[rows.length - 1];
}

export function ThresholdBody({ view, interactive, autoplay }: { view: View; interactive: boolean; autoplay: boolean }) {
  const v = view.vars;
  const rows = v.thresholds;
  const [picked, setPicked] = useState<number | null>(null);
  const [sweep, setSweep] = useState(0.5);
  const active = useActive();
  useEffect(() => {
    if (!autoplay || !active) return;
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setSweep(0.5 + 0.38 * Math.sin(n / 14));
    }, 90);
    return () => clearInterval(id);
  }, [autoplay, active]);
  if (rows.length < 2) return null;
  const learner = v.ripeThreshold ?? 0.5;
  const t = autoplay ? sweep : (picked ?? learner);
  const now = at(rows, t);
  const sx = scale(0, 1, M.l, W - M.r);
  const sy = scale(0, 1, H - M.b, M.t);
  const line = (key: "precision" | "recall") => pathOf(rows.map((r) => [sx(r.threshold), sy(r[key])]));
  const mood = t < 0.4 ? "Lenient: nearly every ripe fruit is found, but green ones slip into the ripe crate." : t > 0.7 ? "Strict: the ripe crate is almost all ripe, but good fruit gets left behind." : "Balanced: a fair trade between missed fruit and false alarms.";
  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Precision and recall against the decision threshold">
        <Axis x0={M.l} x1={W - M.r} y0={M.t} y1={H - M.b} xTicks={[0, 0.25, 0.5, 0.75, 1]} yTicks={[0, 0.5, 1]} sx={sx} sy={sy} fx={(x) => x.toFixed(2).replace(/0$/, "")} fy={(y) => y.toFixed(1)} />
        <text x={(M.l + W - M.r) / 2} y={H - 2} textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill="rgba(255,255,255,0.5)">
          threshold
        </text>
        <path d={line("precision")} fill="none" stroke={LIME} strokeWidth={2} strokeLinecap="round" />
        <path d={line("recall")} fill="none" stroke={RIPE_COLOR} strokeWidth={2} strokeLinecap="round" />
        <path d={`M${sx(learner)} ${M.t} V${H - M.b}`} stroke={LIME} strokeOpacity={0.35} strokeDasharray="2 3" />
        <text x={sx(learner)} y={M.t + 7} textAnchor="middle" fontSize="7.5" fontFamily="var(--font-mono)" fill={LIME} opacity={0.8}>
          yours
        </text>
        <line x1={sx(t)} x2={sx(t)} y1={M.t} y2={H - M.b} stroke="#ffffff" strokeOpacity={0.75} />
        <circle cx={sx(t)} cy={sy(now.precision)} r={3.4} fill={LIME} stroke="#0a0a0a" />
        <circle cx={sx(t)} cy={sy(now.recall)} r={3.4} fill={RIPE_COLOR} stroke="#0a0a0a" />
      </svg>
      <input
        type="range"
        min={0.05}
        max={0.95}
        step={0.01}
        value={t}
        disabled={!interactive || autoplay}
        onChange={(e) => setPicked(Number(e.target.value))}
        className="w-full accent-[#c5ee8a]"
        aria-label="Decision threshold"
      />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="hud-value text-[11px]">t = {t.toFixed(2)}</span>
        <span className="hud-label flex items-center gap-1.5">
          <Dot color={LIME} />
          precision <span className="hud-value text-[10.5px] normal-case tracking-normal text-white/85">{now.precision.toFixed(2)}</span>
        </span>
        <span className="hud-label flex items-center gap-1.5">
          <Dot color={RIPE_COLOR} />
          recall <span className="hud-value text-[10.5px] normal-case tracking-normal text-white/85">{now.recall.toFixed(2)}</span>
        </span>
      </div>
      <p className="text-[10px] leading-snug text-white/50">{mood}</p>
    </div>
  );
}

// ───────────────────────── lesson 14: fit ─────────────────────────

export function FitBody({ view }: { view: View }) {
  const v = view.vars;
  const rows = v.fitCurve;
  if (rows.length < 2) return null;
  const n = rows.length;
  const lows = rows.flatMap((r) => [r.train, r.test, r.val ?? r.test]);
  const lo = Math.max(0, Math.floor(Math.min(...lows) * 10) / 10 - 0.05);
  const sx = scale(0, n - 1, M.l + 6, W - M.r - 6);
  const sy = scale(lo, 1, H - M.b, M.t);
  const series = (key: "train" | "val" | "test") => pathOf(rows.map((r, i) => [sx(i), sy(key === "val" ? (r.val ?? r.test) : r[key])]));
  const best = v.bestK !== null ? rows.findIndex((r) => r.k === v.bestK) : -1;
  const first = rows[0];
  const hasVal = rows.some((r) => r.val !== null);
  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Training, validation and test accuracy for each k">
        <Axis x0={M.l} x1={W - M.r} y0={M.t} y1={H - M.b} xTicks={[]} yTicks={[lo + 0.05, 0.6, 0.8, 1].filter((y) => y >= lo)} sx={sx} sy={sy} fy={(y) => `${Math.round(y * 100)}`} />
        {rows.map((r, i) => (
          <text key={r.k} x={sx(i)} y={H - M.b + 10} textAnchor="middle" fontSize="7.5" fontFamily="var(--font-mono)" fill="rgba(255,255,255,0.45)">
            {r.k}
          </text>
        ))}
        <text x={(M.l + W - M.r) / 2} y={H - 2} textAnchor="middle" fontSize="8" fontFamily="var(--font-mono)" fill="rgba(255,255,255,0.5)">
          k (neighbours that vote)
        </text>
        <text x={M.l + 8} y={H - M.b - 6} fontSize="7.5" fontFamily="var(--font-mono)" fill="#fbbf24" opacity={0.85}>
          memorises
        </text>
        <text x={W - M.r - 4} y={H - M.b - 6} textAnchor="end" fontSize="7.5" fontFamily="var(--font-mono)" fill="#b794f6" opacity={0.85}>
          too vague
        </text>
        {best >= 0 && (
          <g>
            <rect x={sx(best) - 9} y={M.t} width={18} height={H - M.b - M.t} fill={LIME} fillOpacity={0.07} />
            <line x1={sx(best)} x2={sx(best)} y1={M.t} y2={H - M.b} stroke={LIME} strokeOpacity={0.55} strokeDasharray="3 3" />
          </g>
        )}
        <path d={series("train")} fill="none" stroke="#9f9f9f" strokeWidth={1.6} strokeDasharray="4 3" />
        {hasVal && <path d={series("val")} fill="none" stroke="#b794f6" strokeWidth={1.6} />}
        <path d={series("test")} fill="none" stroke={LIME} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        {rows.map((r, i) => (
          <circle key={r.k} cx={sx(i)} cy={sy(r.test)} r={2.4} fill={LIME} stroke="#0a0a0a" strokeWidth={0.8} />
        ))}
      </svg>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="hud-label flex items-center gap-1.5">
          <span className="inline-block h-0 w-3 border-t border-dashed border-[#9f9f9f]" />
          train
        </span>
        {hasVal && (
          <span className="hud-label flex items-center gap-1.5">
            <Dot color="#b794f6" />
            validation
          </span>
        )}
        <span className="hud-label flex items-center gap-1.5">
          <Dot color={LIME} />
          test
        </span>
        {v.bestK !== null && <Chip tone="lime">best k = {v.bestK}</Chip>}
      </div>
      <p className="text-[10px] leading-snug text-white/50">
        With k = {first.k} it scores <span className="text-white/85">{pct(first.train)}</span> on fruit it has seen but <span className="text-white/85">{pct(first.test)}</span> on new ones.
      </p>
    </div>
  );
}

// ───────────────────────── lesson 15: features ─────────────────────────

const NEW_COLUMNS = ["weight", "diameter", "hue", "sugar", "density", "warm", "green", "purple"];

export function FeaturesBody({ view }: { view: View }) {
  const v = view.vars;
  const dens = view.density;
  const base = v.baselineAcc;
  const eng = v.engineeredAcc;
  const values = dens?.map((d) => d.value) ?? [];
  const lo = values.length ? Math.min(...values) : 0;
  const hi = values.length ? Math.max(...values) : 1;
  const sx = scale(lo, hi, 4, 356);
  return (
    <div className="space-y-2.5">
      {base !== null && eng !== null && (
        <div className="space-y-1.5">
          {(
            [
              ["raw only", base, "#9f9f9f"],
              ["+ engineered", eng, LIME],
            ] as const
          ).map(([label, val, color]) => (
            <div key={label} className="grid grid-cols-[5.6rem_1fr_2.4rem] items-center gap-2">
              <span className="hud-label truncate">{label}</span>
              <Meter value={val} color={color} />
              <span className="hud-value text-right text-[10.5px]">{pct(val)}</span>
            </div>
          ))}
          <p className="hud-log text-[10.5px]">
            {eng > base ? <span className="hud-accent">+{((eng - base) * 100).toFixed(1)} points</span> : eng < base ? <span style={{ color: BAD }}>{((eng - base) * 100).toFixed(1)} points</span> : <span className="hud-muted">no change</span>}
            <span className="hud-muted"> from the new columns</span>
          </p>
        </div>
      )}
      <div>
        <p className="hud-label mb-1">density = weight ÷ diameter³</p>
        {dens ? (
          <svg viewBox="0 0 360 66" className="block w-full" role="img" aria-label="Density of each fruit, by kind">
            {KINDS.map((k, row) => (
              <g key={k}>
                <line x1={4} x2={356} y1={13 + row * 21} y2={13 + row * 21} stroke="rgba(255,255,255,0.07)" />
                {dens
                  .filter((d) => d.kind === k)
                  .map((d, i) => (
                    <circle key={i} cx={sx(d.value)} cy={13 + row * 21 + (((i * 53) % 7) - 3) * 1.2} r={2} fill={KIND_COLOR[k]} fillOpacity={0.6} />
                  ))}
                <text x={4} y={13 + row * 21 - 9} fontSize="7" fontFamily="var(--font-mono)" fill="rgba(255,255,255,0.4)">
                  {KIND_NAME[k].toLowerCase()}
                </text>
              </g>
            ))}
          </svg>
        ) : (
          <Note>Asking your engineer() about every fruit…</Note>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {NEW_COLUMNS.map((c, i) => (
          <Chip key={c} tone={i >= 4 ? "lime" : "muted"}>
            {c}
          </Chip>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────── lesson 16: the pipeline ─────────────────────────

export function SorterBody({ view }: { view: View }) {
  const v = view.vars;
  const report = v.report;
  if (!report) return null;
  const m = report.confusion;
  const steps = ["normalise", "train", "evaluate", "predict"];
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-1">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <Chip tone="lime">{s}</Chip>
            {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-white/30" aria-hidden />}
          </React.Fragment>
        ))}
      </div>
      <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
        <Gauge value={report.accuracy} label="this batch" sub={report.testSize ? `${report.testSize} unseen` : undefined} />
        {v.fresh ? <Gauge value={v.fresh.accuracy} label="fresh batch" sub={v.fresh.testSize ? `${v.fresh.testSize} unseen` : undefined} color="#b794f6" marker={report.accuracy} /> : <span />}
        {m && (
          <div className="grid grid-cols-3 gap-[3px]" aria-label="Confusion matrix of this batch">
            {m.flatMap((row, i) =>
              row.map((c, j) => (
                <span key={`${i}${j}`} className="hud-value grid h-[18px] w-[18px] place-items-center rounded-[3px] text-[8.5px]" style={{ background: c === 0 ? "rgba(255,255,255,0.04)" : i === j ? "rgba(197,238,138,0.35)" : "rgba(248,113,113,0.5)", color: c === 0 ? "rgba(255,255,255,0.2)" : "#f4f4f4" }}>
                  {c}
                </span>
              )),
            )}
          </div>
        )}
      </div>
      <p className="text-[10px] leading-snug text-white/50">
        Same pipeline, fruit it has never seen: {v.fresh ? <span className="text-white/85">{pct(v.fresh.accuracy)}</span> : "—"} on tomorrow&apos;s batch. Every fruit on the belt now gets a kind, a ripeness call and a price.
      </p>
    </div>
  );
}
