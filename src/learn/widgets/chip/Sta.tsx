"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Note, Readout, Seg, Slider, Toy } from "../semi/ui";
import { Stepper } from "../computer/ui";
import { BUF_PS, STA_PRESETS, UPSIZE_FACTOR, analyzeSta, checkSta, defaultConfig, gateDelay, normalize, staPreset, stateOfSta, type StaConfig } from "./sta-model.ts";

// ───────────── chip-sta: a static-timing explorer ─────────────

export interface StaProps {
  /** "basic" (default), "pipeline" or "hold". */
  preset?: "basic" | "pipeline" | "hold";
  /** Starting clock period in ns (default depends on the preset). */
  periodNs?: number;
  /** Starting clock skew in ps (capture clock later than launch clock). */
  skewPs?: number;
  /** Show a clock-skew slider (default false: the skew is whatever the preset gives). */
  showSkew?: boolean;
  /** Show the preset picker (default true). */
  choosePreset?: boolean;
  /** Show the fix controls: pipeline register, retime, upsize, buffers (default true). */
  fixes?: boolean;
  title?: string;
}

export { checkSta };

const ps = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(Math.round(v * 10) / 10)} ps`;
const slackPs = (v: number) => `${v < 0 ? "−" : "+"}${Math.abs(Math.round(v * 10) / 10)} ps`;

function Bars({ cfg }: { cfg: StaConfig }) {
  const a = analyzeSta(cfg);
  const p = staPreset(cfg.preset);
  const required = a.rows[0].requiredPs;
  const maxT = Math.max(required, ...a.rows.map((r) => r.arrivalPs)) * 1.04;
  const x0 = 34;
  const w = 322;
  const rowH = 28;
  const H = a.rows.length * rowH + 40;
  const sx = (t: number) => x0 + (Math.max(0, t) / maxT) * w;
  return (
    <svg viewBox={`0 0 360 ${H}`} className="block h-auto w-full" role="img" aria-label={`Arrival time of each path against the required time of ${Math.round(required)} ps. Worst slack ${Math.round(a.wnsPs)} ps.`}>
      {a.rows.map((r, i) => {
        const y = 6 + i * rowH;
        const bad = r.setupSlackPs < 0;
        return (
          <g key={r.key}>
            <text x={2} y={y + 17} fontSize={14} fontFamily="ui-monospace, monospace" fill="var(--ink)">
              {r.key}
            </text>
            <rect x={x0} y={y + 3} width={sx(p.tcq) - x0} height={18} fill="var(--ink-3)" opacity={0.55} />
            <rect x={sx(p.tcq)} y={y + 3} width={Math.max(0, sx(r.arrivalPs) - sx(p.tcq))} height={18} fill={bad ? "var(--bad)" : "var(--brand)"} opacity={0.85} />
          </g>
        );
      })}
      <line x1={sx(required)} x2={sx(required)} y1={0} y2={H - 26} stroke="var(--ink)" strokeWidth={2} strokeDasharray="5 3" />
      <text x={Math.min(sx(required), 300)} y={H - 8} textAnchor={sx(required) > 300 ? "end" : "middle"} fontSize={14} fill="var(--ink)">
        required {Math.round(required)} ps
      </text>
    </svg>
  );
}

export function Sta({ props, onChange }: WidgetProps<StaProps>) {
  const [cfg, setCfg] = useState<StaConfig>(() => normalize(defaultConfig(props.preset ?? "basic", { periodNs: props.periodNs, skewPs: props.skewPs })));
  const [sel, setSel] = useState<string>("");
  const p = staPreset(cfg.preset);
  const a = analyzeSta(cfg);
  const base = analyzeSta({ ...cfg, regAfter: { ...p.regAfter }, upsized: [], buffers: {} });
  // default: the path with the worst setup slack, or, when setup is fine but hold fails, the path with the worst hold slack
  const holdWorst = a.setupMet && !a.holdMet ? a.rows.reduce((w, r) => (r.holdSlackPs < w.holdSlackPs ? r : w), a.rows[0]) : undefined;
  const selId = p.paths.some((x) => x.id === sel) ? sel : (p.paths.find((x) => x.id === (holdWorst ?? a.rows.find((r) => r.key === a.worstKey))?.pathId) ?? p.paths[0]).id;
  const path = p.paths.find((x) => x.id === selId) ?? p.paths[0];
  const k = cfg.regAfter[path.id];
  const n = path.gates.length;
  const nb = cfg.buffers[path.id] ?? 0;
  const fixes = props.fixes !== false;

  const apply = (next: StaConfig) => {
    const c = normalize(next);
    setSel(selId); // keep editing the same path after a fix changes which one is "worst"
    setCfg(c);
    onChange?.(stateOfSta(c));
  };
  const setReg = (v: number | undefined) => {
    const r = { ...cfg.regAfter };
    if (v === undefined) delete r[path.id];
    else r[path.id] = v;
    apply({ ...cfg, regAfter: r });
  };
  const toggleUp = (id: string) => apply({ ...cfg, upsized: cfg.upsized.includes(id) ? cfg.upsized.filter((x) => x !== id) : [...cfg.upsized, id] });
  const worst = a.rows.find((r) => r.key === a.worstKey);
  const changed = JSON.stringify(cfg.regAfter) !== JSON.stringify(p.regAfter) || cfg.upsized.length > 0 || Object.keys(cfg.buffers).length > 0;

  return (
    <div className="w-full" data-widget>
      {props.title && <Caption className="mb-1.5">{props.title}</Caption>}
      {props.choosePreset !== false && (
        <div className="mb-2 flex justify-center">
          <Seg
            label="Scenario"
            value={cfg.preset}
            options={STA_PRESETS.map((x) => ({ value: x.id, label: x.label }))}
            onChange={(id) => {
              apply(defaultConfig(id, { skewPs: props.showSkew ? props.skewPs : undefined }));
              setSel("");
            }}
            className="flex-wrap"
          />
        </div>
      )}
      <p className="text-[0.88rem] leading-snug text-ink-2">{p.blurb}</p>

      <div className="mt-3 flex flex-col gap-1">
        <Slider label="Clock period" value={cfg.periodNs} min={1} max={4} step={0.1} onChange={(v) => apply({ ...cfg, periodNs: Math.round(v * 10) / 10 })} format={(v) => `${v.toFixed(1)} ns (${Math.round(1000 / v)} MHz)`} />
        {props.showSkew && <Slider label="Clock skew (capture later than launch)" value={cfg.skewPs} min={-300} max={600} step={50} onChange={(v) => apply({ ...cfg, skewPs: v })} format={(v) => `${v >= 0 ? "+" : "−"}${Math.abs(v)} ps`} />}
      </div>

      <div className="mt-2 rounded-xl border border-line bg-surface-2 p-2.5 text-[0.88rem] leading-snug text-ink-2">
        <p>
          <span className="font-semibold text-ink">Setup:</span> arrival = tcq + gate delays; required = T + skew − tsu = {Math.round(cfg.periodNs * 1000)} {cfg.skewPs >= 0 ? "+" : "−"} {Math.abs(cfg.skewPs)} − {p.tsu} = <span className="font-mono font-semibold text-ink">{Math.round(a.rows[0].requiredPs)} ps</span>; slack = required − arrival.
        </p>
        <p className="mt-1">
          <span className="font-semibold text-ink">Hold:</span> slack = (tcq + path) − (thold + skew) = (tcq + path) − {p.th + cfg.skewPs} ps. It does not contain T.
        </p>
        <p className="mt-1">
          <span className="font-semibold text-ink">Library:</span> tcq {p.tcq} ps, tsu {p.tsu} ps, thold {p.th} ps. fmax = 1 / (tcq + longest path + tsu − skew) = 1 / {Math.round(a.minPeriodPs)} ps.
        </p>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <Bars cfg={cfg} />
        <p className="text-xs text-ink-3">Grey: clock-to-Q. Coloured: the gates. Bars that cross the dashed line miss setup.</p>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-line">
        <table className="w-full border-collapse text-left text-[0.86rem]">
          <caption className="sr-only">Timing paths with arrival time, setup slack and hold slack</caption>
          <thead>
            <tr className="bg-surface-2 text-xs text-ink-3">
              <th className="px-2 py-1.5 font-medium">Path</th>
              <th className="px-2 py-1.5 font-medium">Arrival</th>
              <th className="px-2 py-1.5 font-medium">Setup slack</th>
              <th className="px-2 py-1.5 font-medium">Hold slack</th>
            </tr>
          </thead>
          <tbody>
            {a.rows.map((r) => (
              <tr key={r.key} className="border-t border-line">
                <td className="px-2 py-1.5 text-ink">
                  <button type="button" onClick={() => setSel(r.pathId)} className="min-h-10 text-left font-medium underline-offset-2 hover:underline" aria-label={`Edit path ${r.pathId}`}>
                    {r.label}
                  </button>
                </td>
                <td className="px-2 py-1.5 font-mono text-ink">{Math.round(r.arrivalPs)}</td>
                <td className={`px-2 py-1.5 font-mono font-semibold ${r.setupSlackPs < 0 ? "text-bad" : "text-good"}`}>
                  {slackPs(r.setupSlackPs)} {r.setupSlackPs < 0 ? "VIOLATED" : "ok"}
                </td>
                <td className={`px-2 py-1.5 font-mono font-semibold ${r.holdSlackPs < 0 ? "text-bad" : "text-good"}`}>
                  {slackPs(r.holdSlackPs)} {r.holdSlackPs < 0 ? "VIOLATED" : "ok"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Readout label="WNS" value={ps(a.wnsPs)} accent={!a.setupMet} />
        <Readout label="TNS" value={ps(a.tnsPs)} />
        <Readout label="hold WNS" value={ps(a.holdWnsPs)} accent={!a.holdMet} />
        <Readout label="fmax" value={`${Math.round(a.fmaxMhz)} MHz`} />
        <Readout label="area" value={`${a.areaUm2} µm²`} />
      </div>
      <div className="mt-2">
        <Note tone={a.setupMet && a.holdMet ? "accent" : "plain"}>
          {!a.setupMet && worst && (
            <>
              Setup fails on {worst.label} by {Math.abs(Math.round(a.wnsPs))} ps. Slow the clock (the period is {cfg.periodNs.toFixed(1)} ns now) or shorten that path.{" "}
            </>
          )}
          {!a.holdMet && <>Hold fails by {Math.abs(Math.round(a.holdWnsPs))} ps: slowing the clock does not help, because the same edge launches and captures. The short path must be made slower. </>}
          {a.setupMet && a.holdMet && <>All checks pass at {cfg.periodNs.toFixed(1)} ns. </>}
          {changed && <>fmax: {Math.round(base.fmaxMhz)} MHz before your changes, {Math.round(a.fmaxMhz)} MHz now.</>}
        </Note>
      </div>

      {fixes && (
        <div className="mt-3 rounded-xl border border-line bg-surface p-2.5">
          <Caption className="mb-1.5">Fix a path</Caption>
          <Seg label="Path to edit" value={path.id} options={p.paths.map((x) => ({ value: x.id, label: `${x.id} ${x.label}` }))} onChange={(v) => setSel(v)} className="flex-wrap" />

          <div className="mt-2 flex flex-wrap items-center gap-1.5" aria-label={`Gates on path ${path.id}`}>
            {path.gates.map((g, i) => {
              const id = `${path.id}${i}`;
              const up = cfg.upsized.includes(id);
              return (
                <React.Fragment key={id}>
                  <button
                    type="button"
                    aria-pressed={up}
                    onClick={() => toggleUp(id)}
                    aria-label={`${g.name} ${gateDelay(g, id, cfg)} ps${up ? ", upsized" : ""}. Toggle upsizing`}
                    disabled={g.area === 0}
                    className={`min-h-10 rounded-lg border px-2.5 text-sm ${up ? "border-[var(--brand)] bg-tint font-semibold text-ink" : "border-line bg-surface-2 text-ink"} disabled:opacity-60`}
                  >
                    {g.name} <span className="font-mono">{gateDelay(g, id, cfg)}</span>
                    {up && <span className="text-xs"> (big)</span>}
                  </button>
                  {k === i + 1 && (
                    <span className="rounded-md border border-ink bg-surface px-2 py-1 font-mono text-xs font-bold text-ink" aria-label="pipeline register">
                      REG
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-ink-3">Gate delays in ps. Tap a gate to upsize it: delay × {UPSIZE_FACTOR}, area × 2.</p>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {k === undefined ? (
              <Btn onClick={() => setReg(Math.max(1, Math.floor(n / 2)))} disabled={n < 2} label={`Insert pipeline register on path ${path.id}`}>
                Insert pipeline register
              </Btn>
            ) : (
              <>
                <Btn onClick={() => setReg(k - 1)} disabled={k <= 1} label="Retime: move the register one gate earlier">
                  {"◀ Retime"}
                </Btn>
                <Btn onClick={() => setReg(k + 1)} disabled={k >= n - 1} label="Retime: move the register one gate later">
                  {"Retime ▶"}
                </Btn>
                <Btn onClick={() => setReg(undefined)}>Remove register</Btn>
              </>
            )}
          </div>
          {k !== undefined && (
            <p className="mt-1 text-[0.88rem] leading-snug text-ink-2">
              Register after gate {k} of {n}: two stages, so this path now takes 2 cycles (one more cycle of latency) but each stage is shorter. Retiming moves the register across a gate to balance the stages.
            </p>
          )}
          {n < 2 && <p className="mt-1 text-xs text-ink-3">A one-gate path cannot be split.</p>}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-2">Delay buffers ({BUF_PS} ps each)</span>
            <Stepper label={`Buffers on path ${path.id}`} value={nb} min={0} max={6} onChange={(v) => apply({ ...cfg, buffers: { ...cfg.buffers, [path.id]: v } })} />
          </div>
          <div className="mt-2">
            <Btn onClick={() => apply({ ...cfg, regAfter: { ...p.regAfter }, upsized: [], buffers: {} })} disabled={!changed}>
              Undo all fixes
            </Btn>
          </div>
        </div>
      )}
      <Toy>Toy timing model: one delay per gate, no wires, one clock edge, the same skew for every path, and made-up numbers (tcq {p.tcq} ps, tsu {p.tsu} ps, thold {p.th} ps). Real signoff analyses millions of paths at several process, voltage and temperature corners.</Toy>
    </div>
  );
}
