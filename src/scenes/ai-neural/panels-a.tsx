"use client";

import React, { useState } from "react";
import { BAD, LIME, NEG, fmt, pct, type Vars } from "./data.ts";
import type { PanelCtx } from "./ctx.ts";
import { Label, LineChart, Legend, Note, PixelGrid, Toggle, Stat } from "./ui.tsx";

// ───────────────────────── 1 · Glyph bed ─────────────────────────

export function GlyphsBody({ ctx, compact = false }: { ctx: PanelCtx; compact?: boolean }) {
  const { vars, probe, guesses } = ctx;
  const g = vars.gallery;
  if (g.length === 0) return <Note>Waiting for <span className="hud-warning">gallery</span> in your file. Run again once it is defined.</Note>;
  const max = Math.max(1, ...(vars.digitCounts ?? [1]));
  return (
    <div className="space-y-2.5">
      <ul className={`grid gap-1.5 ${compact ? "grid-cols-9" : "grid-cols-6 @md:grid-cols-9"}`} aria-label="Test glyphs">
        {g.map((px, i) => {
          const truth = vars.galleryLabels[i];
          const guess = guesses[i];
          const wrong = guess !== null && guess !== undefined && truth !== undefined && guess !== truth;
          const selected = probe?.source === "gallery" && probe.index === i;
          return (
            <li key={i} className="min-w-0">
              <button
                type="button"
                disabled={!ctx.interactive}
                onClick={() => ctx.selectGallery(i)}
                aria-label={`Test glyph ${i + 1}, a ${truth}${guess !== null && guess !== undefined ? `, the network says ${guess}` : ""}`}
                aria-pressed={selected}
                className={`block w-full rounded-[5px] border p-[2px] text-left transition-colors ${selected ? "border-[#c5ee8a] bg-[#c5ee8a]/10" : wrong ? "border-[#f87171]/70 bg-[#f87171]/10" : "border-white/10 bg-white/[0.03] hover:border-white/30"} ${ctx.interactive ? "cursor-pointer" : "cursor-default"}`}
              >
                <PixelGrid values={px} label={`glyph ${i + 1}`} />
                <span className="mt-[2px] flex items-center justify-between font-mono text-[9px] leading-none">
                  <span className="text-white/75">{truth ?? "?"}</span>
                  {guess !== null && guess !== undefined && <span style={{ color: wrong ? BAD : LIME }}>{wrong ? `→${guess}` : "✓"}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {vars.digitCounts && !compact && (
        <div>
          <Label>pictures per digit</Label>
          <div className="mt-1 grid grid-cols-10 items-end gap-1" style={{ height: 36 }}>
            {vars.digitCounts.map((c, d) => (
              <div key={d} className="flex h-full min-w-0 flex-col justify-end" title={`${d}: ${c}`}>
                <div className="rounded-sm bg-[#c5ee8a]/80" style={{ height: `${Math.max(6, (c / max) * 100)}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-0.5 grid grid-cols-10 gap-1 text-center font-mono text-[9px] text-white/65">
            {vars.digitCounts.map((c, d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────── 2 · One neuron ─────────────────────────

export function NeuronBody({ vars }: { vars: Vars }) {
  if (!vars.stemImage || !vars.stemRates) return <Note>Waiting for <span className="hud-warning">stem_image</span> and <span className="hud-warning">stem_rates</span> in your file.</Note>;
  const flat = vars.stemImage.flat();
  const rates = vars.stemRates;
  return (
    <div className="flex items-end gap-3">
      <div className="w-[34%] max-w-[120px] shrink-0">
        <PixelGrid values={flat} mode="diverge" max={1} label="the stem detector's weights" />
        <div className="mt-1 flex items-center justify-between font-mono text-[9px] text-white/70">
          <span style={{ color: NEG }}>− against</span>
          <span style={{ color: LIME }}>+ for</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <Label>fires for each digit</Label>
        <div className="mt-1 grid grid-cols-10 items-end gap-1" style={{ height: 64 }}>
          {rates.map((r, d) => (
            <div key={d} className="flex h-full min-w-0 flex-col justify-end" title={`digit ${d}: ${pct(r)}`}>
              <div className="rounded-sm" style={{ height: `${Math.max(3, r * 100)}%`, background: d === 1 ? LIME : "rgba(255,255,255,0.4)" }} />
            </div>
          ))}
        </div>
        <div className="mt-0.5 grid grid-cols-10 gap-1 text-center font-mono text-[9px] text-white/70">
          {rates.map((_, d) => (
            <span key={d} style={d === 1 ? { color: LIME } : undefined}>
              {d}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── 3 · Activation lab ─────────────────────────

type ActId = "relu" | "sigmoid" | "tanh";

export function ActivationsBody({ vars }: { vars: Vars }) {
  const [act, setAct] = useState<ActId>("relu");
  const c = vars.curves;
  if (!c) return <Note>Waiting for <span className="hud-warning">curves</span> in your file.</Note>;
  const f = act === "relu" ? c.relu : act === "sigmoid" ? c.sigmoid : c.tanh;
  const d = act === "relu" ? c.dRelu : act === "sigmoid" ? c.dSigmoid : c.dTanh;
  const x = vars.xorTable;
  const solved = x ? x.filter((r) => Math.round(r[2]) === ((r[0] + r[1]) % 2)).length : 0;
  return (
    <div className="space-y-2">
      <Toggle<ActId> label="Activation function" value={act} onChange={setAct} options={[{ id: "relu", label: "ReLU" }, { id: "sigmoid", label: "sigmoid" }, { id: "tanh", label: "tanh" }]} />
      <LineChart
        ariaLabel={`${act} and its slope for z from ${c.z[0]} to ${c.z[c.z.length - 1]}`}
        height={104}
        yMin={-1}
        yMax={act === "relu" ? 6 : 1}
        yFmt={(v) => v.toFixed(1)}
        yTicks={3}
        xEnds={[String(c.z[0]), String(c.z[c.z.length - 1])]}
        xLabel="z (the neuron's score)"
        series={[
          { values: f, color: LIME, width: 2 },
          { values: d, color: NEG, dash: "4 3" },
        ]}
      />
      <Legend items={[{ color: LIME, label: act }, { color: NEG, label: "slope", dash: true }]} />
            {x ? (
        <div className="flex items-center gap-3 border-t border-white/10 pt-2">
          <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0" role="img" aria-label={`XOR network answers: ${x.map((r) => `${r[0]},${r[1]} gives ${r[2].toFixed(1)}`).join("; ")}`}>
            <rect x="8" y="8" width="48" height="48" rx="4" fill="none" stroke="rgba(255,255,255,0.15)" />
            <line x1="8" y1="56" x2="56" y2="8" stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
            {x.map((r) => (
              <g key={`${r[0]}${r[1]}`}>
                <circle cx={8 + r[0] * 48} cy={56 - r[1] * 48} r="8" fill={r[2] > 0.5 ? LIME : "#1c1c1c"} stroke={r[2] > 0.5 ? LIME : "rgba(255,255,255,0.45)"} strokeWidth="1.5" />
                <text x={8 + r[0] * 48} y={56 - r[1] * 48 + 3.5} textAnchor="middle" fontSize="9" fontFamily="var(--font-mono)" fontWeight="600" fill={r[2] > 0.5 ? "#0a0a0a" : "#f4f4f4"}>
                  {Math.round(r[2])}
                </text>
              </g>
            ))}
          </svg>
          <div className="min-w-0 text-[11px] leading-snug text-white/75">
            <p className="hud-title">XOR with a bend</p>
            <p>{solved}/4 right: the points (0,1) and (1,0) say 1, the others say 0. No single straight line can do that.</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ───────────────────────── 5 · Softmax & loss ─────────────────────────

export function SoftmaxBody({ ctx }: { ctx: PanelCtx }) {
  const { vars, probe } = ctx;
  const probs = probe?.pass?.probs ?? vars.startProbs;
  if (!probs) return <Note>Waiting for <span className="hud-warning">start_probs</span> in your file.</Note>;
  const truth = probe?.truth ?? null;
  const loss = truth !== null && probs[truth] !== undefined ? -Math.log(probs[truth] + 1e-12) : null;
  const guess = probs.indexOf(Math.max(...probs));
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-10 items-end gap-1" style={{ height: 76 }} role="img" aria-label={`Probabilities for digits 0 to 9; the biggest is ${guess}`}>
        {probs.map((p, d) => (
          <div key={d} className="flex h-full min-w-0 flex-col justify-end" title={`${d}: ${pct(p, 1)}`}>
            <div className="rounded-sm transition-[height] duration-500" style={{ height: `${Math.max(2, p * 100)}%`, background: d === guess ? LIME : "rgba(255,255,255,0.4)", outline: d === truth ? `1.5px solid #f4f4f4` : undefined, outlineOffset: 1 }} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-10 gap-1 text-center font-mono text-[9px] text-white/70">
        {probs.map((_, d) => (
          <span key={d} style={d === truth ? { color: "#f4f4f4", fontWeight: 700 } : undefined}>
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-2">
        <Stat label="this glyph" value={loss !== null ? loss.toFixed(3) : "-"} tone={loss !== null && loss < 0.3 ? "lime" : loss !== null && loss > 1.5 ? "danger" : undefined} />
        <Stat label="untrained" value={vars.chanceLoss !== null ? vars.chanceLoss.toFixed(3) : "-"} />
        <Stat label="chance" value="2.303" />
      </div>
      <p className="text-[10px] leading-snug text-white/60">Losses: the ringed digit is the truth, and this glyph’s loss is −ln of the probability it was given.</p>
    </div>
  );
}

// ───────────────────────── 6 · Seed weights ─────────────────────────

export function InitBody({ ctx }: { ctx: PanelCtx }) {
  const { vars } = ctx;
  const rows = vars.initReport;
  const net = vars.net;
  if (rows.length === 0 && !net) return <Note>Waiting for <span className="hud-warning">init_report</span> in your file.</Note>;
  const maxH = Math.max(1e-9, ...rows.map((r) => r.hiddenStd));
  const units = net ? Math.min(net.hidden, 24) : 0;
  const wmax = net ? Math.max(1e-9, ...net.W1.flat().map((v) => Math.abs(v))) : 1;
  return (
    <div className="space-y-2.5">
      {rows.length > 0 && (
        <div role="table" aria-label="Signal size for each starting scheme" className="space-y-1">
          <div className="grid grid-cols-[3.4rem_1fr_3.2rem_2.2rem] items-center gap-2 text-[9px]" role="row">
            <Label>scheme</Label>
            <Label>hidden spread</Label>
            <Label className="text-right">logits</Label>
            <Label className="text-right">units</Label>
          </div>
          {rows.map((r) => (
            <div key={r.name} role="row" className="grid grid-cols-[3.4rem_1fr_3.2rem_2.2rem] items-center gap-2">
              <span className="truncate font-mono text-[10.5px] text-white/85">{r.name}</span>
              <div className="h-[6px] overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full" style={{ width: `${Math.max(r.hiddenStd > 0 ? 3 : 0, (r.hiddenStd / maxH) * 100)}%`, background: r.distinct <= 1 ? BAD : LIME }} />
              </div>
              <span className="hud-value text-right text-[10px]">{fmt(r.logitStd, 3)}</span>
              <span className="hud-value text-right text-[10px]" style={r.distinct <= 1 ? { color: BAD } : undefined}>
                {r.distinct}
              </span>
            </div>
          ))}
          <p className="text-[10px] leading-snug text-white/60">units = how many hidden sprouts are different from each other. 1 means clones.</p>
        </div>
      )}
      {net && (
        <div className="border-t border-white/10 pt-2">
          <Label>first-layer weights, one picture per sprout</Label>
          <div className="mt-1.5 grid grid-cols-8 gap-1.5">
            {Array.from({ length: units }, (_, j) => (
              <PixelGrid key={j} values={net.W1.map((row) => row[j])} mode="diverge" max={wmax} label={`weights of hidden sprout ${j + 1}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

