"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Note, Readout, Seg, Slider, Toy, ORANGE, usd, whole } from "../semi/ui";
import { RESPIN_FRACTION, crossState, crossover, effectiveNreAsic, perUnitAsic, perUnitFpga, totalAsic, totalFpga, type CostInput, type CrossState } from "./cost.ts";

export { checkCrossover } from "./cost.ts";

// ───────────── chip-crossover: when does an ASIC beat an FPGA? ─────────────

export interface CrossoverProps {
  title?: string;
  /** Starting values (illustrative defaults: ASIC NRE $5M, ASIC $5 each, FPGA $50 each, FPGA NRE $20k, 30,000 units). */
  nreAsic?: number;
  unitAsic?: number;
  unitFpga?: number;
  nreFpga?: number;
  volume?: number;
}

const money = (v: number) => (!isFinite(v) ? "–" : v >= 1e9 ? `$${+(v / 1e9).toPrecision(3)}B` : v >= 1e6 ? `$${+(v / 1e6).toPrecision(3)}M` : v >= 1e4 ? `$${+(v / 1e3).toPrecision(3)}k` : usd(v));
const vol = (v: number) => (v >= 1e6 ? `${+(v / 1e6).toPrecision(3)}M` : v >= 1e4 ? `${+(v / 1e3).toPrecision(3)}k` : whole(v));
const MULT = [1, 1.5, 2, 3, 4, 5, 7];

/** 1, 1.5, 2, 3, 4, 5, 7 times each power of ten from lo to hi, plus any extra values (and 0 when withZero). */
function ladder(lo: number, hi: number, extra: number, withZero = false): number[] {
  const out = new Set<number>(withZero ? [0] : []);
  for (let e = Math.floor(Math.log10(lo)); e <= Math.ceil(Math.log10(hi)); e++)
    for (const m of MULT) {
      const v = Number((m * 10 ** e).toPrecision(3));
      if (v >= lo * 0.999 && v <= hi * 1.001) out.add(v);
    }
  out.add(extra);
  return [...out].sort((a, b) => a - b);
}
const nearest = (l: number[], v: number) => l.reduce((bi, x, i) => (Math.abs(x - v) < Math.abs(l[bi] - v) ? i : bi), 0);

const PRESETS: { key: string; label: string; nre: number; unit: number }[] = [
  { key: "shuttle", label: "Open shuttle", nre: 5e4, unit: 20 },
  { key: "mature", label: "Mature node", nre: 1e6, unit: 4 },
  { key: "mid", label: "Mid node", nre: 2e7, unit: 10 },
  { key: "adv", label: "Advanced node", nre: 3e8, unit: 30 },
];

const VMIN = 100;
const VMAX = 1e7;

export function Crossover({ props, onChange, goal, status }: WidgetProps<CrossoverProps>) {
  const d = { nreAsic: props.nreAsic ?? 5e6, unitAsic: props.unitAsic ?? 5, unitFpga: props.unitFpga ?? 50, nreFpga: props.nreFpga ?? 2e4, volume: props.volume ?? 3e4 };
  const lNa = useMemo(() => ladder(1e4, 1e9, d.nreAsic), [d.nreAsic]);
  const lUa = useMemo(() => ladder(0.1, 100, d.unitAsic), [d.unitAsic]);
  const lUf = useMemo(() => ladder(1, 1000, d.unitFpga), [d.unitFpga]);
  const lNf = useMemo(() => ladder(1e3, 1e6, d.nreFpga, true), [d.nreFpga]);

  const [nreAsic, setNreAsic] = useState(d.nreAsic);
  const [unitAsic, setUnitAsic] = useState(d.unitAsic);
  const [unitFpga, setUnitFpga] = useState(d.unitFpga);
  const [nreFpga, setNreFpga] = useState(d.nreFpga);
  const [volume, setVolume] = useState(Math.min(VMAX, Math.max(VMIN, d.volume)));
  const [respin, setRespin] = useState(false);

  const c: CostInput = { nreAsic, unitAsic, unitFpga, nreFpga, respin };
  const vStar = crossover(c);
  const tA = totalAsic(c, volume);
  const tF = totalFpga(c, volume);
  const st = useMemo<CrossState>(() => crossState({ nreAsic, unitAsic, unitFpga, nreFpga, respin }, volume), [nreAsic, unitAsic, unitFpga, nreFpga, respin, volume]);
  const cb = useRef(onChange);
  useEffect(() => {
    cb.current = onChange;
  });
  useEffect(() => {
    cb.current?.(st);
  }, [st]);

  const preset = PRESETS.find((p) => p.nre === nreAsic && p.unit === unitAsic)?.key ?? "custom";

  // ── chart (log-log) ──
  const yLo = Math.floor(Math.log10(Math.max(1, Math.min(totalAsic(c, VMIN), totalFpga(c, VMIN)))));
  const yHi = Math.ceil(Math.log10(Math.max(totalAsic(c, VMAX), totalFpga(c, VMAX))));
  const L = 50, R = 348, T = 14, B = 122;
  const X = (v: number) => L + ((Math.log10(v) - Math.log10(VMIN)) / (Math.log10(VMAX) - Math.log10(VMIN))) * (R - L);
  const Y = (t: number) => B - ((Math.log10(Math.max(1, t)) - yLo) / Math.max(1, yHi - yLo)) * (B - T);
  const pts = (f: (v: number) => number) => Array.from({ length: 81 }, (_, i) => {
    const v = 10 ** (2 + (i / 80) * 5);
    return `${X(v).toFixed(1)},${Y(f(v)).toFixed(1)}`;
  }).join(" ");
  const yTicks: number[] = [];
  const step = yHi - yLo > 6 ? 2 : 1;
  for (let e = yLo; e <= yHi; e += step) yTicks.push(e);
  const cheaperTxt = st.cheaper === "tie" ? "a tie" : st.cheaper === "asic" ? "the ASIC" : "the FPGA";

  const jump = () => {
    if (vStar !== null) setVolume(Math.min(VMAX, Math.max(VMIN, Number(vStar.toPrecision(3)))));
  };
  const goalHint = goal && (goal.findCrossover === true || goal.volumeAtLeastCrossover === true || goal.cheaper === "asic" || goal.cheaper === "fpga");

  return (
    <div className="w-full" data-widget>
      {props.title && <Caption className="mb-1.5">{props.title}</Caption>}
      <p className="text-[0.88rem] leading-snug text-ink-2">
        Total cost = one-off cost (NRE, non-recurring engineering) + units × cost per unit. An FPGA has little NRE but a high price per chip; an ASIC has a large NRE (design team, tools, verification and a mask set) and a low price per chip.
      </p>

      <div className="mt-3 flex justify-center">
        <Seg
          label="Illustrative ASIC process presets"
          value={preset}
          onChange={(k) => {
            const p = PRESETS.find((x) => x.key === k);
            if (p) {
              setNreAsic(p.nre);
              setUnitAsic(p.unit);
            }
          }}
          options={[...PRESETS.map((p) => ({ value: p.key, label: p.label })), { value: "custom", label: "Custom" }]}
        />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Slider label="ASIC NRE (design + masks + tools)" value={nearest(lNa, nreAsic)} min={0} max={lNa.length - 1} onChange={(i) => setNreAsic(lNa[i])} format={(i) => money(lNa[i])} />
        <Slider label="ASIC cost per unit" value={nearest(lUa, unitAsic)} min={0} max={lUa.length - 1} onChange={(i) => setUnitAsic(lUa[i])} format={(i) => usd(lUa[i])} />
        <Slider label="FPGA cost per unit" value={nearest(lUf, unitFpga)} min={0} max={lUf.length - 1} onChange={(i) => setUnitFpga(lUf[i])} format={(i) => usd(lUf[i])} />
        <Slider label="FPGA NRE (boards, tools)" value={nearest(lNf, nreFpga)} min={0} max={lNf.length - 1} onChange={(i) => setNreFpga(lNf[i])} format={(i) => money(lNf[i])} />
      </div>
      <Slider
        className="mt-3"
        label="Volume (units, log scale)"
        value={Math.log10(volume)}
        min={2}
        max={7}
        step={0.01}
        onChange={(v) => setVolume(Number((10 ** v).toPrecision(3)))}
        format={() => whole(volume)}
      />

      <div className="mx-auto mt-3 max-w-[30rem] rounded-xl border border-line bg-surface p-2">
        <svg viewBox="0 0 360 172" className="block h-auto w-full" role="img" aria-label={`Total cost against units shipped on log scales. At ${whole(volume)} units the ASIC costs ${money(tA)} and the FPGA ${money(tF)}. ${vStar === null ? "There is no crossover for these numbers." : `The ASIC becomes cheaper above ${whole(vStar)} units.`}`}>
          {yTicks.map((e) => (
            <g key={e}>
              <line x1={L} x2={R} y1={Y(10 ** e)} y2={Y(10 ** e)} stroke="var(--line)" />
              <text x={L - 4} y={Y(10 ** e) + 5} textAnchor="end" fontSize={14} fill="var(--ink-3)">
                {money(10 ** e).replace(".00", "")}
              </text>
            </g>
          ))}
          {[2, 3, 4, 5, 6, 7].map((e) => (
            <g key={e}>
              <line x1={X(10 ** e)} x2={X(10 ** e)} y1={T} y2={B} stroke="var(--line)" />
              <text x={X(10 ** e)} y={B + 17} textAnchor={e === 7 ? "end" : e === 2 ? "start" : "middle"} fontSize={14} fill="var(--ink-3)">
                {vol(10 ** e)}
              </text>
            </g>
          ))}
          <text x={(L + R) / 2} y={168} textAnchor="middle" fontSize={14} fill="var(--ink-2)">
            units shipped
          </text>
          <polyline points={pts((v) => totalFpga(c, v))} fill="none" stroke={ORANGE} strokeWidth={2.75} strokeLinejoin="round" />
          <polyline points={pts((v) => totalAsic(c, v))} fill="none" stroke="var(--brand)" strokeWidth={2.75} strokeLinejoin="round" />
          {vStar !== null && vStar >= VMIN && vStar <= VMAX && (
            <g>
              <line x1={X(vStar)} x2={X(vStar)} y1={T} y2={B} stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="5 4" />
              <circle cx={X(vStar)} cy={Y(totalAsic(c, vStar))} r={5} fill="var(--surface)" stroke="var(--ink)" strokeWidth={2} />
              <text x={X(vStar) + (X(vStar) > 250 ? -6 : 6)} y={T + 14} textAnchor={X(vStar) > 250 ? "end" : "start"} fontSize={14} fontWeight={600} fill="var(--ink)" stroke="var(--surface)" strokeWidth={4} paintOrder="stroke">
                V* {vol(vStar)}
              </text>
            </g>
          )}
          <line x1={X(volume)} x2={X(volume)} y1={T} y2={B} stroke="var(--ink-2)" strokeWidth={1.5} />
          <circle cx={X(volume)} cy={Y(tA)} r={4.5} fill="var(--brand)" stroke="var(--surface)" strokeWidth={1.5} />
          <circle cx={X(volume)} cy={Y(tF)} r={4.5} fill={ORANGE} stroke="var(--surface)" strokeWidth={1.5} />
          <text x={R - 2} y={Y(totalAsic(c, VMAX)) + (totalAsic(c, VMAX) < totalFpga(c, VMAX) ? 18 : -6)} textAnchor="end" fontSize={14} fontWeight={600} fill="var(--ink)" stroke="var(--surface)" strokeWidth={4} paintOrder="stroke">
            ASIC
          </text>
          <text x={R - 2} y={Y(totalFpga(c, VMAX)) + (totalFpga(c, VMAX) < totalAsic(c, VMAX) ? 18 : -6)} textAnchor="end" fontSize={14} fontWeight={600} fill="var(--ink)" stroke="var(--surface)" strokeWidth={4} paintOrder="stroke">
            FPGA
          </text>
        </svg>
        <p className="text-xs text-ink-3">Both axes are logarithmic. Blue: ASIC total cost. Orange: FPGA total cost. Dashed line: the crossover V*. Solid line: your chosen volume.</p>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Crossover V*" value={vStar === null ? "none" : `${whole(vStar)} units`} accent />
        <Readout label={`Cheaper at ${whole(volume)} units`} value={st.cheaper === "tie" ? "tie" : st.cheaper.toUpperCase()} accent />
        <Readout label="ASIC total" value={money(tA)} />
        <Readout label="FPGA total" value={money(tF)} />
        <Readout label="ASIC per unit (NRE included)" value={usd(perUnitAsic(c, volume))} />
        <Readout label="FPGA per unit (NRE included)" value={usd(perUnitFpga(c, volume))} />
      </div>

      <div className="mt-3">
        <Note tone="accent">
          {vStar === null
            ? unitFpga <= unitAsic
              ? "The FPGA is no dearer per chip than the ASIC here, so the ASIC's big NRE never pays back: there is no crossover."
              : "The ASIC's NRE is not above the FPGA's, so the ASIC is cheaper at every volume: there is no crossover."
            : `At ${whole(volume)} units ${cheaperTxt} is cheaper. The crossover is where the two totals are equal: V* = (NRE_ASIC − NRE_FPGA) / (unit_FPGA − unit_ASIC) = (${money(effectiveNreAsic(c))} − ${money(nreFpga)}) / (${usd(unitFpga)} − ${usd(unitAsic)}) = ${whole(vStar)} units.`}
        </Note>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Btn on={respin} onClick={() => setRespin((r) => !r)}>
          {respin ? `Bug escaped: respin included (+${Math.round(RESPIN_FRACTION * 100)} % ASIC NRE)` : "What if a bug escapes? Add a respin"}
        </Btn>
        {status === "revealed" && goalHint && vStar !== null && <Btn onClick={jump}>Jump to the crossover</Btn>}
      </div>
      <p className="mt-2 text-[0.86rem] leading-snug text-ink-2">
        <strong className="text-ink">Risk and schedule.</strong> An FPGA bug is fixed by loading a new bitstream. An ASIC bug that escapes verification means a respin: a new set of masks, plus months of waiting for fabrication. That is why the verification effort of the previous lessons matters, and why many products prototype on an FPGA first.
      </p>
      <details className="mt-2 rounded-xl border border-line bg-surface">
        <summary className="flex min-h-10 cursor-pointer items-center px-3 text-sm font-medium text-ink">Where the ASIC NRE comes from</summary>
        <p className="px-3 pb-3 pt-1 text-[0.86rem] leading-snug text-ink-2">
          A design team, EDA tool licences, verification, IP licences, and a mask set. Mask sets cost millions of dollars at advanced nodes (order of magnitude; it varies widely), and far less at mature nodes. Shuttle or multi-project-wafer runs, such as the open-source programs on SkyWater SKY130, share one mask set between many designs and cut the cost for small runs by orders of magnitude.
        </p>
      </details>
      <Toy>
        Illustrative numbers, not quotes: real NRE and unit prices vary enormously with process node, die size, packaging, yield, volume discounts and the FPGA family. The model ignores time to market, power and performance differences, and the cost of money; it only compares NRE + units × unit cost.
      </Toy>
    </div>
  );
}
