"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Meter, Note, Readout, Seg, Slider, Toy, formatSI } from "../semi/ui";
import { BLOCK_SHARE, HOT_FACTOR, POWER_DEFAULTS, VT_LABEL, checkPower, computePower, fMaxMhz, stateOfPower, voltageTable, type PowerInputs, type Vt } from "./power-model.ts";

// ───────────── chip-power: dynamic power, leakage, clock gating and voltage scaling ─────────────

export interface PowerProps {
  /** Activity factor 0 to 1 (default 0.1). */
  alpha?: number;
  /** Switched capacitance in nF (default 1). */
  cNf?: number;
  /** Supply voltage in V (default 1.0). */
  v?: number;
  /** Clock in MHz (default 1000). */
  fMhz?: number;
  /** Clock gating on at the start (default false). */
  gating?: boolean;
  /** Percent of the time the gated block is idle (default 60). */
  idlePct?: number;
  /** "high" | "std" | "low" threshold-voltage option (default "std"). */
  vt?: Vt;
  /** Hot chip (100 °C): leakage x4 (default false). */
  hot?: boolean;
  title?: string;
}

export { checkPower };

const W = (x: number) => formatSI(x, "W", { digits: 3 });

export function Power({ props, onChange }: WidgetProps<PowerProps>) {
  const [s, setS] = useState<PowerInputs>(() => ({
    alpha: props.alpha ?? POWER_DEFAULTS.alpha,
    cNf: props.cNf ?? POWER_DEFAULTS.cNf,
    v: props.v ?? POWER_DEFAULTS.v,
    fMhz: props.fMhz ?? POWER_DEFAULTS.fMhz,
    gating: props.gating ?? POWER_DEFAULTS.gating,
    idlePct: props.idlePct ?? POWER_DEFAULTS.idlePct,
    vt: props.vt ?? POWER_DEFAULTS.vt,
    hot: props.hot ?? POWER_DEFAULTS.hot,
  }));
  const r = computePower(s);
  const apply = (patch: Partial<PowerInputs>) => {
    const next = { ...s, ...patch };
    setS(next);
    onChange?.(stateOfPower(next));
  };
  const table = voltageTable(s);
  const f = formatSI(s.fMhz * 1e6, "Hz", { digits: 3 });
  const cStr = formatSI(s.cNf * 1e-9, "F", { digits: 3 });
  const cur = table.find((t) => t.v === s.v);

  return (
    <div className="w-full" data-widget>
      {props.title && <Caption className="mb-1.5">{props.title}</Caption>}
      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        <Slider label="Activity factor α (share of the capacitance that switches each cycle)" value={s.alpha} min={0.01} max={1} step={0.01} onChange={(v) => apply({ alpha: v })} format={(v) => v.toFixed(2)} />
        <Slider label="Switched capacitance C" value={s.cNf} min={0.1} max={10} step={0.1} onChange={(v) => apply({ cNf: v })} format={(v) => `${v.toFixed(1)} nF`} />
        <Slider label="Supply voltage V" value={s.v} min={0.6} max={1.2} step={0.05} onChange={(v) => apply({ v: Math.round(v * 100) / 100 })} format={(v) => `${v.toFixed(2)} V`} />
        <Slider label="Clock frequency f" value={s.fMhz} min={100} max={3000} step={50} onChange={(v) => apply({ fMhz: v })} format={(v) => formatSI(v * 1e6, "Hz", { digits: 3 })} />
      </div>

      {!r.timingOk && (
        <div className="mt-2 flex flex-col items-start gap-2">
          <Note>
            At {s.v.toFixed(2)} V this toy logic can run at most {formatSI(r.fMaxMhz * 1e6, "Hz", { digits: 3 })}, so {f} would fail timing. Lower voltage makes transistors switch more slowly, so the clock has to come down with it.
          </Note>
          <Btn onClick={() => apply({ fMhz: Math.max(100, Math.floor(r.fMaxMhz / 50) * 50) })}>Set f to what {s.v.toFixed(2)} V allows</Btn>
        </div>
      )}

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-2.5 font-mono text-[0.86rem] leading-relaxed text-ink">
        <p>
          P_dyn = α · C · V² · f
          <br />= {s.alpha.toFixed(2)} × {cStr} × ({s.v.toFixed(2)} V)² × {f}
          <br />= <span className="font-bold">{W(r.pDynUngatedW)}</span>
          {s.gating && (
            <>
              <br />
              with clock gating: × (1 − {BLOCK_SHARE} × {(s.idlePct / 100).toFixed(2)}) = <span className="font-bold">{W(r.pDynW)}</span>
            </>
          )}
        </p>
        <p className="mt-2">
          P_leak = V · I_leak = {s.v.toFixed(2)} V × {formatSI(r.iLeakA, "A", { digits: 3 })} = <span className="font-bold">{W(r.pLeakW)}</span>
        </p>
        <p className="mt-2">
          P_total = <span className="font-bold">{W(r.pTotalW)}</span>
        </p>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Readout label="dynamic" value={W(r.pDynW)} accent />
        <Readout label="leakage" value={W(r.pLeakW)} />
        <Readout label="total" value={W(r.pTotalW)} accent />
      </div>
      <div className="mt-2">
        <Meter frac={r.pTotalW > 0 ? r.pDynW / r.pTotalW : 0} label={`Dynamic power is ${Math.round(r.pTotalW > 0 ? (r.pDynW / r.pTotalW) * 100 : 0)} percent of the total`} />
        <p className="mt-0.5 text-xs text-ink-3">Bar: dynamic share of the total ({Math.round(r.pTotalW > 0 ? (r.pDynW / r.pTotalW) * 100 : 0)}%); the rest is leakage.</p>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2.5">
        <Caption className="mb-1.5">Leakage (the cost of simply being powered)</Caption>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Seg label="Threshold voltage option" value={s.vt} options={(["high", "std", "low"] as Vt[]).map((v) => ({ value: v, label: v === "std" ? "Standard-Vt" : v === "high" ? "High-Vt" : "Low-Vt" }))} onChange={(vt) => apply({ vt })} className="flex-wrap" />
          <Seg label="Temperature" value={s.hot ? "hot" : "cool"} options={[{ value: "cool", label: "25 °C" }, { value: "hot", label: "100 °C" }]} onChange={(v) => apply({ hot: v === "hot" })} />
        </div>
        <p className="mt-1.5 text-[0.88rem] leading-snug text-ink-2">
          {VT_LABEL[s.vt]}. Leakage flows even when nothing switches, and it grows steeply with temperature (toy: ×{HOT_FACTOR} at 100 °C). A lower threshold makes faster transistors that leak more.
        </p>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2.5">
        <Caption className="mb-1.5">Clock gating</Caption>
        <div className="flex flex-wrap items-center gap-2">
          <Btn on={s.gating} onClick={() => apply({ gating: !s.gating })} label="Clock gating">
            {s.gating ? "Gating on" : "Gating off"}
          </Btn>
          <span className="text-[0.88rem] text-ink-2">A block with {Math.round(BLOCK_SHARE * 100)}% of the capacitance is idle part of the time.</span>
        </div>
        <Slider label="Idle share of the time for that block" value={s.idlePct} min={0} max={95} step={5} onChange={(v) => apply({ idlePct: v })} format={(v) => `${v}%`} className="mt-1" />
        <div className="mt-1 grid gap-1.5 text-[0.88rem]">
          <div>
            <div className="flex justify-between text-ink-2">
              <span>Before (clock always toggles)</span>
              <span className="font-mono text-ink">{W(r.pDynUngatedW)}</span>
            </div>
            <Meter frac={1} tone="muted" label="Dynamic power without gating" />
          </div>
          <div>
            <div className="flex justify-between text-ink-2">
              <span>After (idle block&apos;s clock stopped)</span>
              <span className="font-mono text-ink">{W(r.pDynUngatedW * (1 - BLOCK_SHARE * (s.idlePct / 100)))}</span>
            </div>
            <Meter frac={1 - BLOCK_SHARE * (s.idlePct / 100)} label="Dynamic power with gating" />
          </div>
        </div>
        <p className="mt-1.5 text-[0.88rem] leading-snug text-ink-2">
          {s.gating ? `Saves ${r.savedPct.toFixed(0)}% of the dynamic power (${W(r.savedW)}).` : `With gating on it would save ${(BLOCK_SHARE * s.idlePct).toFixed(0)}% of the dynamic power.`} Gating stops the clock but leaves the supply on, so leakage does not change; turning the supply off (power gating) is what removes leakage.
        </p>
      </div>

      <div className="mt-3 overflow-x-auto rounded-xl border border-line">
        <table className="w-full min-w-[19rem] border-collapse text-left text-[0.86rem]">
          <caption className="sr-only">Power at different supply voltages, with the clock limited to what each voltage allows</caption>
          <thead>
            <tr className="bg-surface-2 text-xs text-ink-3">
              <th className="px-2 py-1.5 font-medium">Supply</th>
              <th className="px-2 py-1.5 font-medium">Fastest clock</th>
              <th className="px-2 py-1.5 font-medium">Clock used</th>
              <th className="px-2 py-1.5 font-medium">Dynamic</th>
            </tr>
          </thead>
          <tbody>
            {table.map((t) => (
              <tr key={t.v} className={`border-t border-line ${t.v === s.v ? "bg-tint" : ""}`}>
                <td className="px-2 py-1.5 font-mono text-ink">{t.v.toFixed(1)} V</td>
                <td className="px-2 py-1.5 font-mono text-ink">{formatSI(t.fMaxMhz * 1e6, "Hz", { digits: 3 })}</td>
                <td className="px-2 py-1.5 font-mono text-ink">{formatSI(t.fUsedMhz * 1e6, "Hz", { digits: 3 })}</td>
                <td className="px-2 py-1.5 font-mono text-ink">{W(t.pDynW)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[0.88rem] leading-snug text-ink-2">
        Voltage enters squared: from 1.0 V to 0.7 V the power at the same clock falls to 49%. But lower voltage usually forces a lower clock too{cur ? ` (fastest at ${s.v.toFixed(1)} V: ${formatSI(fMaxMhz(s.v) * 1e6, "Hz", { digits: 3 })})` : ""}, so the speed is paid for.
      </p>
      <Toy>Toy power model: one lumped capacitance and activity factor, a made-up leakage current per nF, and a made-up speed limit (3 GHz at 1.0 V, threshold 0.4 V). Real chips have many blocks with their own activity, voltage and clock.</Toy>
    </div>
  );
}
