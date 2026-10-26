"use client";

/**
 * Panels for chapters 1 and 2: describing the data (statistics, the feature matrix, normalising)
 * and judging a classifier (the train/test split and the confusion matrix).
 */
import React from "react";
import { FEATS, FEAT_UNIT, KINDS, KIND_COLOR, KIND_NAME, LIME, featsOf, pct, scaleOf } from "./data.ts";
import type { View } from "./store.ts";
import { Dot, Gauge, Meter } from "./ui.tsx";

const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2));

// ───────────────────────── lesson 2: statistics ─────────────────────────

export function StatsBody({ view }: { view: View }) {
  const stats = view.vars.stats;
  if (!stats) return null;
  return (
    <div className="space-y-2.5">
      {FEATS.map((f) => {
        const s = stats[f];
        const span = s.max - s.min || 1;
        const at = (v: number) => `${Math.min(100, Math.max(0, ((v - s.min) / span) * 100))}%`;
        const lo = Math.max(s.min, s.mean - s.std);
        const hi = Math.min(s.max, s.mean + s.std);
        return (
          <div key={f}>
            <div className="mb-1 flex items-baseline gap-2">
              <span className="hud-label w-[4.5rem] shrink-0">{f}</span>
              <span className="hud-value ml-auto text-[10.5px]">
                {fmt(s.mean)} <span className="text-white/35">± {fmt(s.std)}</span>
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-white/[0.07]">
              <div className="absolute inset-y-0 rounded-full bg-[#c5ee8a]/30" style={{ left: at(lo), width: `calc(${at(hi)} - ${at(lo)})` }} />
              <div className="absolute -inset-y-0.5 w-[2px] rounded bg-[#c5ee8a]" style={{ left: at(s.mean) }} />
            </div>
            <div className="mt-0.5 flex justify-between font-mono text-[9px] text-white/35">
              <span>
                {fmt(s.min)} {FEAT_UNIT[f]}
              </span>
              <span>
                {fmt(s.max)} {FEAT_UNIT[f]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ───────────────────────── lesson 3: the matrix ─────────────────────────

export function MatrixBody({ view }: { view: View }) {
  const v = view.vars;
  const matrix = v.xList ?? (v.rows.length ? v.rows.map((r) => [...featsOf(r)]) : null);
  if (!matrix || !v.colMeans) return null;
  const { mean, std } = scaleOf(v);
  const shown = 24;
  const step = Math.max(1, Math.floor(matrix.length / shown));
  const picks = Array.from({ length: Math.min(shown, matrix.length) }, (_, i) => i * step);
  const cw = 26;
  const ch = 6.4;
  const color = (z: number) => {
    const t = Math.min(1, Math.abs(z) / 2.4);
    return z >= 0 ? `rgba(197,238,138,${0.1 + t * 0.85})` : `rgba(183,148,246,${0.1 + t * 0.85})`;
  };
  return (
    <div className="flex min-w-0 items-start gap-3">
      <svg viewBox={`0 0 ${cw * 4 + 10} ${picks.length * ch + 14}`} className="w-[56%] max-w-[190px] shrink-0" role="img" aria-label="Heat map of the feature matrix">
        {FEATS.map((f, j) => (
          <text key={f} x={10 + j * cw + cw / 2} y={8} textAnchor="middle" fontSize="5.6" fontFamily="var(--font-mono)" fill="rgba(255,255,255,0.5)">
            {f.slice(0, 4)}
          </text>
        ))}
        {picks.map((idx, i) => {
          const kind = v.rows[idx]?.kind;
          return (
            <g key={idx}>
              {kind && <rect x={2} y={12 + i * ch} width={4} height={ch - 1} rx={1} fill={KIND_COLOR[kind]} />}
              {matrix[idx].slice(0, 4).map((val, j) => (
                <rect key={j} x={10 + j * cw + 0.5} y={12 + i * ch} width={cw - 1} height={ch - 0.8} rx={1} fill={color((val - mean[j]) / std[j])} />
              ))}
            </g>
          );
        })}
      </svg>
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="hud-label">shape</p>
          <p className="hud-value text-[15px]">
            ({v.nRows ?? matrix.length}, {v.nFeatures ?? 4})
          </p>
          <p className="hud-muted text-[10px]">rows × features</p>
        </div>
        <div>
          <p className="hud-label">column means</p>
          {FEATS.map((f, j) => (
            <p key={f} className="hud-value flex justify-between text-[10.5px]">
              <span className="text-white/45">{f}</span>
              <span>{fmt(v.colMeans?.[j] ?? mean[j])}</span>
            </p>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-[9.5px] text-white/45">
          <span className="inline-block h-1.5 w-3 rounded-sm" style={{ background: "rgba(183,148,246,.8)" }} />
          below
          <span className="inline-block h-1.5 w-3 rounded-sm" style={{ background: "rgba(197,238,138,.85)" }} />
          above average
        </p>
      </div>
    </div>
  );
}

// ───────────────────────── lesson 4: normalising ─────────────────────────

export function ScaleBody({ view }: { view: View }) {
  const v = view.vars;
  if (!v.scaledSample) return null;
  const { std } = scaleOf(v);
  const before = v.colStds ?? std;
  const after = v.scaledStds ?? [1, 1, 1, 1];
  const top = Math.max(...before, 1e-9);
  const sample = v.scaledSample[Math.min(7, v.scaledSample.length - 1)];
  const sampleKind = v.rows[Math.min(7, v.scaledSample.length - 1) * 20]?.kind;
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-[4.2rem_1fr_1fr] items-center gap-x-2 gap-y-1.5">
        <span />
        <span className="hud-label">spread before</span>
        <span className="hud-label">after</span>
        {FEATS.map((f, j) => (
          <React.Fragment key={f}>
            <span className="hud-label truncate">{f}</span>
            <div className="flex items-center gap-1.5">
              <div className="min-w-0 flex-1">
                <Meter value={before[j] / top} color="#9f9f9f" />
              </div>
              <span className="hud-value w-8 shrink-0 text-right text-[10px] text-white/55">{fmt(before[j])}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="min-w-0 flex-1">
                <Meter value={Math.min(1, (after[j] ?? 1) / 1.2)} color={LIME} />
              </div>
              <span className="hud-value w-8 shrink-0 text-right text-[10px] text-[#d3f3a4]">{fmt(after[j] ?? 1)}</span>
            </div>
          </React.Fragment>
        ))}
      </div>
      <div>
        <p className="hud-label mb-1 flex items-center gap-1.5">
          one {sampleKind ?? "fruit"}, scaled {sampleKind && <Dot color={KIND_COLOR[sampleKind]} />}
        </p>
        <div className="grid grid-cols-4 gap-1">
          {FEATS.map((f, j) => {
            const z = sample?.[j] ?? 0;
            return (
              <div key={f} className="rounded-md border border-white/10 px-1.5 py-1 text-center">
                <p className="hud-value text-[11px]" style={{ color: z >= 0 ? "#d3f3a4" : "#cdb6fb" }}>
                  {z >= 0 ? "+" : "−"}
                  {Math.abs(z).toFixed(2)}
                </p>
                <p className="font-mono text-[8.5px] uppercase tracking-wide text-white/35">{f.slice(0, 4)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── lesson 7: train / test ─────────────────────────

export function SplitBody({ view }: { view: View }) {
  const v = view.vars;
  if (!v.trainIdx || !v.testIdx || v.trainAcc === null || v.testAcc === null) return null;
  const n = v.rows.length || v.trainIdx.length + v.testIdx.length;
  const test = new Set(v.testIdx);
  const cols = 24;
  const cell = 5.4;
  const gap = v.trainAcc - v.testAcc;
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2">
        <Gauge value={v.trainAcc} label="train" sub={`${v.trainIdx.length} fruit`} color="#9f9f9f" />
        <Gauge value={v.testAcc} label="test" sub={`${v.testIdx.length} unseen`} color={LIME} marker={v.trainAcc} />
      </div>
      <p className="hud-log text-[10.5px] leading-snug">
        {gap > 0.015 ? (
          <>
            <span className="hud-warning">{(gap * 100).toFixed(1)} points</span> better on fruit it has seen. Only the test score is honest.
          </>
        ) : (
          <>Train and test agree, so the score can be trusted.</>
        )}
      </p>
      <svg viewBox={`0 0 ${cols * cell} ${Math.ceil(n / cols) * cell}`} className="block w-full" role="img" aria-label="Which fruit were held back for the test">
        {Array.from({ length: n }).map((_, i) => {
          const isTest = test.has(i);
          return (
            <rect
              key={i}
              x={(i % cols) * cell + 0.5}
              y={Math.floor(i / cols) * cell + 0.5}
              width={cell - 1}
              height={cell - 1}
              rx={1}
              fill={isTest ? "none" : "rgba(197,238,138,0.28)"}
              stroke={isTest ? LIME : "none"}
              strokeWidth={0.8}
            />
          );
        })}
      </svg>
      <p className="flex items-center gap-3 text-[9.5px] text-white/45">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-[2px] bg-[#c5ee8a]/30" />
          train
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-[2px] border border-[#c5ee8a]" />
          test
        </span>
        <span className="ml-auto font-mono">seed {v.seed ?? "?"}</span>
      </p>
    </div>
  );
}

// ───────────────────────── lesson 8: confusion matrix ─────────────────────────

export function ConfusionBody({ view }: { view: View }) {
  const v = view.vars;
  const m = v.confusion;
  if (!m) return null;
  const total = m.flat().reduce((a, b) => a + b, 0) || 1;
  const hits = m.reduce((a, row, i) => a + row[i], 0);
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-[1.6rem_repeat(3,minmax(0,1fr))] gap-1">
        <span />
        {KINDS.map((k) => (
          <span key={k} className="hud-label text-center" style={{ color: KIND_COLOR[k] }}>
            {k.slice(0, 3)}
          </span>
        ))}
        {m.map((row, i) => {
          const rowTotal = row.reduce((a, b) => a + b, 0) || 1;
          return (
            <React.Fragment key={KINDS[i]}>
              <span className="hud-label grid place-items-center" style={{ color: KIND_COLOR[KINDS[i]] }}>
                {KINDS[i].slice(0, 3)}
              </span>
              {row.map((c, j) => {
                const t = c / rowTotal;
                const diag = i === j;
                return (
                  <div
                    key={j}
                    className="hud-value grid h-9 place-items-center rounded-md text-[13px]"
                    style={{
                      background: c === 0 ? "rgba(255,255,255,0.03)" : diag ? `rgba(197,238,138,${0.12 + t * 0.5})` : `rgba(248,113,113,${0.18 + Math.min(1, t * 2) * 0.5})`,
                      color: c === 0 ? "rgba(255,255,255,0.25)" : "#f4f4f4",
                    }}
                    title={`${KINDS[i]} predicted as ${KINDS[j]}: ${c}`}
                  >
                    {c}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
      <p className="font-mono text-[9px] uppercase tracking-wide text-white/35">rows: what it really was · columns: what we guessed</p>
      <div className="space-y-1.5">
        {KINDS.map((k) => (
          <div key={k} className="grid grid-cols-[3.4rem_1fr_1fr] items-center gap-2">
            <span className="hud-label flex items-center gap-1.5 truncate">
              <Dot color={KIND_COLOR[k]} />
              {KIND_NAME[k].toLowerCase()}
            </span>
            <MiniStat label="prec" value={v.precision?.[k]} />
            <MiniStat label="recall" value={v.recall?.[k]} />
          </div>
        ))}
      </div>
      <p className="hud-log text-[10.5px]">
        accuracy <span className="hud-accent">{pct(hits / total)}</span>
        {v.majorityAcc !== null && (
          <>
            {" "}
            <span className="hud-muted">vs {pct(v.majorityAcc)} for always guessing the commonest kind</span>
          </>
        )}
      </p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number | undefined }) {
  const low = value !== undefined && value < 0.8;
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-7 shrink-0 font-mono text-[8.5px] uppercase text-white/35">{label}</span>
      <div className="min-w-0 flex-1">
        <Meter value={value ?? 0} color={low ? "#fbbf24" : LIME} height={4} />
      </div>
      <span className="hud-value w-8 shrink-0 text-right text-[10px]" style={{ color: low ? "#fbbf24" : undefined }}>
        {value === undefined ? "–" : value.toFixed(2)}
      </span>
    </div>
  );
}

