"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Readout, Seg, Slider, Toy } from "../semi/ui";
import { IR_DROP_V, NOM, PROCS, TEMPS, VOLTS, analyzeCorner, checkCorners, type CornerInput, type CornersState, type Proc, type Temp, type Volt } from "./corners-model.ts";

// ───────────── chip-corners: one path timed at PVT corners, with an OCV derate and IR drop ─────────────

export interface CornersProps {
  /** OCV derate at the start, in percent (default 5). */
  deratePct?: number;
  title?: string;
}

export { checkCorners };

const PROC_LABEL: Record<Proc, string> = { SS: "Slow (SS)", TT: "Typical (TT)", FF: "Fast (FF)" };
const slack = (v: number) => `${v < 0 ? "−" : "+"}${Math.abs(v).toFixed(1)} ps`;
const ps = (v: number) => `${v.toFixed(0)} ps`;

export function Corners({ props, onChange }: WidgetProps<CornersProps>) {
  const [s, setS] = useState<CornerInput>(() => ({ proc: "TT", v: 0.8, t: 25, derate: (props.deratePct ?? 5) / 100, ir: false }));
  const r = analyzeCorner(s);
  const apply = (patch: Partial<CornerInput>) => {
    const next = { ...s, ...patch };
    setS(next);
    const a = analyzeCorner(next);
    onChange?.({ ...next, setupSlackPs: a.setupSlackPs, holdSlackPs: a.holdSlackPs } satisfies CornersState);
  };
  const setupBad = r.setupSlackPs < 0;
  const holdBad = r.holdSlackPs < 0;

  return (
    <div className="w-full" data-widget>
      {props.title && <Caption className="mb-1.5">{props.title}</Caption>}
      <p className="text-[0.88rem] leading-snug text-ink-2">
        One flip-flop-to-flip-flop path with a long route (setup) and a short one (hold), clocked every {NOM.periodPs} ps. Pick a corner: every cell delay is its typical value times a factor k.
      </p>
      <div className="mt-2 flex flex-col items-center gap-2">
        <Seg label="Process" value={s.proc} options={PROCS.map((p) => ({ value: p, label: PROC_LABEL[p] }))} onChange={(proc) => apply({ proc })} />
        <Seg label="Supply voltage" value={s.v} options={VOLTS.map((v) => ({ value: v, label: `${v.toFixed(2)} V` }))} onChange={(v) => apply({ v: v as Volt })} />
        <Seg label="Temperature" value={s.t} options={TEMPS.map((t) => ({ value: t, label: `${t} °C` }))} onChange={(t) => apply({ t: t as Temp })} />
      </div>
      <div className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-[1fr_auto] sm:items-end">
        <Slider label="On-chip variation (OCV) derate" value={Math.round(s.derate * 100)} min={0} max={10} step={1} onChange={(v) => apply({ derate: v / 100 })} format={(v) => `±${v}%`} />
        <Btn on={s.ir} onClick={() => apply({ ir: !s.ir })} label="Local IR drop">
          {s.ir ? `IR drop on (−${IR_DROP_V * 1000} mV)` : "IR drop off"}
        </Btn>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-2.5 text-[0.88rem] leading-snug text-ink-2">
        <p>
          Delay factor <span className="font-mono font-semibold text-ink">k = {r.k.toFixed(3)}</span>
          {s.ir ? ` (the cells see ${r.vEff.toFixed(2)} V)` : ""}. Late paths × {(1 + s.derate).toFixed(2)}, early paths × {(1 - s.derate).toFixed(2)}.
        </p>
        <p className="mt-1">
          <span className="font-semibold text-ink">Setup:</span> {NOM.periodPs} + capture clock {ps(r.captureEarly)} − launch clock {ps(r.launchLate)} − (tcq + logic) {ps(r.dataLate)} − tsu {NOM.tsu} ps
        </p>
        <p className="mt-1">
          <span className="font-semibold text-ink">Hold:</span> launch clock {ps(r.launchEarly)} + (tcq + logic) {ps(r.dataEarly)} − capture clock {ps(r.captureLate)} − thold {NOM.thold} ps
        </p>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Readout label="Setup slack" value={<span className={setupBad ? "text-bad" : ""}>{slack(r.setupSlackPs)}</span>} accent />
        <Readout label="Hold slack" value={<span className={holdBad ? "text-bad" : ""}>{slack(r.holdSlackPs)}</span>} accent />
      </div>
      <p className="mt-1.5 text-center text-xs text-ink-3">A negative slack is a violation at this corner. Sign-off needs every path to pass at every corner it can meet.</p>
      <Toy>
        Toy corner model: k = process × voltage × temperature factors (SS 1.2, FF 0.83; an alpha-power-law voltage curve; 125 °C × 1.10 and −40 °C × 0.94, so hot is slow, as at older nodes; at advanced low-voltage nodes cold can be slower, called temperature inversion). The derate is applied only to the clock branches the two flops don&apos;t share. Real sign-off uses libraries characterised at each corner and statistical variation models.
      </Toy>
    </div>
  );
}
