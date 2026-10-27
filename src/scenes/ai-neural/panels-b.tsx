"use client";

import React, { useEffect, useState } from "react";
import { BAD, LIME, NEG, WARN, fmt, pct, type History, type Vars } from "./data.ts";
import { Chip, Label, Legend, LineChart, Meter, Note, PixelGrid, Stat, Toggle, useActive } from "./ui.tsx";

// ───────────────────────── 7 · Chain rule graph ─────────────────────────

const num = (v: number) => (Math.abs(v) < 0.001 && v !== 0 ? v.toExponential(1) : v.toFixed(Math.abs(v) < 0.1 ? 4 : 3));

export function ChainBody({ vars }: { vars: Vars }) {
  const c = vars.chain;
  if (!c) return <Note>Waiting for <span className="hud-warning">chain_report</span> in your file.</Note>;
  const dz = c.dLossDa * c.dADz;
  const node = (x: number, name: string, value: string) => (
    <g>
      <rect x={x - 30} y="30" width="60" height="38" rx="9" fill="#161616" stroke="rgba(255,255,255,0.22)" />
      <text x={x} y="44" textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fill="rgba(255,255,255,0.7)">
        {name}
      </text>
      <text x={x} y="59" textAnchor="middle" fontSize="11.5" fontFamily="var(--font-mono)" fontWeight="600" fill="#f4f4f4">
        {value}
      </text>
    </g>
  );
  return (
    <div className="space-y-2.5">
      <svg viewBox="0 0 270 118" className="block h-auto w-full" role="img" aria-label={`Computation graph: z is ${num(c.z)}, a is ${num(c.a)}, loss is ${num(c.loss)}; blame ${num(dz)} flows back to z`}>
        <defs>
          <marker id="gn-arrow-f" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0 L8 4 L0 8 z" fill={LIME} />
          </marker>
          <marker id="gn-arrow-b" viewBox="0 0 8 8" refX="6" refY="4" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0 L8 4 L0 8 z" fill={NEG} />
          </marker>
        </defs>
        {node(40, "z = w·x + b", num(c.z))}
        {node(135, "a = σ(z)", num(c.a))}
        {node(230, "loss", num(c.loss))}
        <path d="M70 41 H105" stroke={LIME} strokeWidth="1.6" markerEnd="url(#gn-arrow-f)" />
        <path d="M165 41 H200" stroke={LIME} strokeWidth="1.6" markerEnd="url(#gn-arrow-f)" />
        <path d="M200 58 H165" stroke={NEG} strokeWidth="1.6" markerEnd="url(#gn-arrow-b)" />
        <path d="M105 58 H70" stroke={NEG} strokeWidth="1.6" markerEnd="url(#gn-arrow-b)" />
        <text x="183" y="82" textAnchor="middle" fontSize="8.5" fontFamily="var(--font-mono)" fill={NEG}>
          ∂L/∂a {num(c.dLossDa)}
        </text>
        <text x="88" y="82" textAnchor="middle" fontSize="8.5" fontFamily="var(--font-mono)" fill={NEG}>
          ∂a/∂z {num(c.dADz)}
        </text>
        <text x="40" y="104" textAnchor="start" fontSize="9.5" fontFamily="var(--font-mono)" fill="#f4f4f4">
          ∂L/∂z = {num(c.dLossDa)} × {num(c.dADz)} = {num(dz)}
        </text>
      </svg>
      <div className="flex items-end gap-3 border-t border-white/10 pt-2">
        {vars.neuronImage && (
          <div className="w-[26%] max-w-[88px] shrink-0">
            <PixelGrid values={vars.neuronImage.flat()} mode="diverge" label="weights the neuron learned for 'is it a 1'" />
            <p className="mt-1 font-mono text-[9px] text-white/70">learned weights</p>
          </div>
        )}
        {vars.neuronLosses.length > 1 && (
          <div className="min-w-0 flex-1">
            <Label>loss while it learns</Label>
            <LineChart ariaLabel="Loss of the single neuron per step" height={70} yMin={0} yFmt={(v) => v.toFixed(2)} yTicks={2} series={[{ values: vars.neuronLosses, color: LIME }]} />
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── 8 · Gradient flow ─────────────────────────

export function GradsBody({ vars }: { vars: Vars }) {
  if (vars.gradNorms.length === 0) return <Note>Waiting for <span className="hud-warning">grad_norms</span> in your file.</Note>;
  const max = Math.max(1e-9, ...vars.gradNorms.map((g) => g.value));
  return (
    <div className="space-y-2">
      <div className="space-y-1.5">
        {vars.gradNorms.map((g) => (
          <div key={g.name} className="grid grid-cols-[1.6rem_1fr_3.2rem_4.4rem] items-center gap-2">
            <span className="font-mono text-[11px] text-white/90">{g.name}</span>
            <Meter value={g.value / max} color={g.name.startsWith("W") ? LIME : NEG} height={6} />
            <span className="hud-value text-right text-[10.5px]">{g.value.toFixed(3)}</span>
            <span className="truncate text-right font-mono text-[10px] text-white/60">{vars.shapeReport?.[g.name] ? `(${vars.shapeReport[g.name].join(", ")})` : ""}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] leading-snug text-white/65">Bars are the size of each gradient on the first 64 glyphs. Every gradient has the same shape as the weights it belongs to.</p>
    </div>
  );
}

// ───────────────────────── 9 · Gradient check ─────────────────────────

export function CheckBody({ vars }: { vars: Vars }) {
  const rows = vars.checkRows;
  if (rows.length === 0 && vars.checkError === null) return <Note>Waiting for <span className="hud-warning">check_rows</span> in your file.</Note>;
  // two entries per parameter keeps the table short
  const seen: Record<string, number> = {};
  const shown = rows.filter((r) => ((seen[r.name] = (seen[r.name] ?? 0) + 1) <= 2));
  const err = (a: number, b: number) => Math.abs(a - b) / Math.max(1e-6, Math.abs(a) + Math.abs(b));
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="your backprop" value={vars.checkError !== null ? fmt(vars.checkError, 3) : "-"} tone={vars.checkError !== null && vars.checkError < 1e-4 ? "lime" : "danger"} />
        <Stat label="the buggy copy" value={vars.bugError !== null ? fmt(vars.bugError, 3) : "-"} tone={vars.bugError !== null && vars.bugError > 0.1 ? "warn" : undefined} />
      </div>
      {shown.length > 0 && (
        <div role="table" aria-label="Analytic and numeric gradient entries" className="space-y-1">
          <div role="row" className="grid grid-cols-[1.6rem_1fr_1fr_3.4rem] gap-2">
            <Label>entry</Label>
            <Label className="text-right">backprop</Label>
            <Label className="text-right">finite diff</Label>
            <Label className="text-right">error</Label>
          </div>
          {shown.map((r, i) => {
            const e = err(r.analytic, r.numeric);
            return (
              <div key={i} role="row" className="grid grid-cols-[1.6rem_1fr_1fr_3.4rem] items-center gap-2 font-mono text-[10px]">
                <span className="text-white/90">{r.name}</span>
                <span className="truncate text-right text-white/85">{r.analytic.toExponential(3)}</span>
                <span className="truncate text-right text-white/85">{r.numeric.toExponential(3)}</span>
                <span className="text-right" style={{ color: e < 1e-4 ? LIME : BAD }}>
                  {e < 1e-12 ? "0" : e.toExponential(0)}
                </span>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[10px] leading-snug text-white/65">Two numbers per entry should agree to many digits. A bug shows up as an error far above 1e-4.</p>
    </div>
  );
}

// ───────────────────────── 10 · Growth curves ─────────────────────────

function Curves({ h }: { h: History }) {
  const active = useActive();
  const n = h.loss.length;
  const [shown, setShown] = useState(1);
  useEffect(() => {
    if (!active || shown >= n) return;
    const id = setTimeout(() => setShown((s) => Math.min(n, s + Math.max(1, Math.ceil(n / 40)))), 40);
    return () => clearTimeout(id);
  }, [active, shown, n]);
  const cut = (v: number[]) => v.slice(0, shown);
  const lastEval = h.evalAcc[Math.min(shown, h.evalAcc.length) - 1];
  const lastTrain = h.trainAcc[Math.min(shown, h.trainAcc.length) - 1];
  return (
    <div className="space-y-2">
      <div>
        <Label>loss per epoch</Label>
        <LineChart ariaLabel="Training loss per epoch" height={84} yMin={0} yFmt={(v) => v.toFixed(1)} xCount={n} markers={h.bestEpoch !== null ? [{ x: h.bestEpoch, label: "best", color: "#d3f3a4" }] : []} series={[{ values: cut(h.loss), color: LIME, width: 2 }]} xLabel="epoch" />
      </div>
      {h.evalAcc.length > 1 && (
        <div>
          <Label>accuracy per epoch</Label>
          <LineChart
            ariaLabel="Accuracy per epoch"
            height={84}
            yMin={0}
            yMax={1}
            yFmt={(v) => `${Math.round(v * 100)}%`}
            xCount={n}
            series={[
              { values: cut(h.trainAcc), color: "#9f9f9f" },
              { values: cut(h.evalAcc), color: LIME, width: 2 },
            ]}
            xLabel="epoch"
          />
          <Legend items={[{ color: "#9f9f9f", label: "train" }, { color: LIME, label: "held out" }]} />
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-2">
        <Stat label="epochs" value={n} />
        <Stat label="train" value={lastTrain !== undefined ? pct(lastTrain, 1) : "-"} />
        <Stat label="held out" value={lastEval !== undefined ? pct(lastEval, 1) : "-"} tone="lime" />
      </div>
    </div>
  );
}

export function TrainingBody({ vars, interactive }: { vars: Vars; interactive: boolean }) {
  const runs = vars.runs;
  const [pick, setPick] = useState<string | null>(null);
  const [replay, setReplay] = useState(0);
  if (runs.length === 0) return <Note>Waiting for <span className="hud-warning">history_full</span> in your file.</Note>;
  const current = runs.find((r) => r.id === pick) ?? runs[runs.length - 1];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {runs.length > 1 ? <Toggle<string> label="Training run" value={current.id} onChange={setPick} options={runs.map((r) => ({ id: r.id, label: r.label }))} /> : <Chip tone="lime">{current.label}</Chip>}
        {interactive && (
          <button type="button" className="hud-btn !h-6 !px-2.5 !text-[10px]" onClick={() => setReplay((r) => r + 1)}>
            Replay
          </button>
        )}
      </div>
      <Curves key={`${current.id}:${replay}`} h={current.history} />
    </div>
  );
}

// ───────────────────────── 11 · Batch sizes ─────────────────────────

export function BatchesBody({ vars }: { vars: Vars }) {
  const rows = vars.batchStudy;
  if (rows.length === 0) return <Note>Waiting for <span className="hud-warning">batch_study</span> in your file.</Note>;
  return (
    <div className="space-y-2">
      <div role="table" aria-label="Same three epochs with different batch sizes" className="space-y-2">
        <div role="row" className="grid grid-cols-[3.6rem_1fr_3.2rem] gap-2">
          <Label>batch size</Label>
          <Label>held-out accuracy</Label>
          <Label className="text-right">updates</Label>
        </div>
        {rows.map((r) => (
          <div key={r.size} role="row" className="grid grid-cols-[3.6rem_1fr_3.2rem] items-center gap-2">
            <span className="font-mono text-[11px] text-white/90">{r.size}</span>
            <div className="grid grid-cols-[1fr_2.8rem] items-center gap-2">
              <Meter value={r.accuracy} color={r.accuracy > 0.85 ? LIME : r.accuracy > 0.5 ? WARN : BAD} height={7} />
              <span className="hud-value text-right text-[10.5px]">{pct(r.accuracy)}</span>
            </div>
            <span className="hud-value text-right text-[10.5px]">{r.updates}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] leading-snug text-white/65">Every row saw the data for the same short run. Smaller batches take more steps, and more steps learn more.</p>
    </div>
  );
}

