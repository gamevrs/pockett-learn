"use client";

import React, { useState } from "react";
import { Shuffle } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { chipletCost, costPerGoodDie, defects, dieGrid, diesPerWaferFormula, poissonYield } from "./phys";
import { Btn, Note, Readout, Seg, Slider, Toy, ORANGE, usd, whole } from "./ui";

// ───────────────────────────── semi-yield: a wafer map and the Poisson yield model ─────────────────────────────

export interface YieldProps {
  side?: number;
  d0?: number;
  waferCost?: number;
  /** Show the wafer cost slider and cost per good die. */
  cost?: boolean;
}

export interface YieldState {
  side: number;
  /** mm² */
  area: number;
  d0: number;
  /** Whole dies that fit on this map. */
  dpw: number;
  dpwFormula: number;
  /** Poisson prediction, percent. */
  yieldPct: number;
  /** Dies with no defect on this particular wafer, percent. */
  observedPct: number;
  costPerGood: number;
}

const DIAM = 300;
const EDGE = 3;
const S = 300 / 312;
const C = 150;
const mm = (v: number) => Math.round((C + v * S) * 100) / 100;

function compute(side: number, d0: number, seed: number, waferCost: number) {
  const grid = dieGrid(DIAM, side, EDGE);
  const defs = defects(DIAM, d0, seed);
  const bad = grid.dies.map((d) => defs.some((p) => p.x >= d.x && p.x < d.x + side && p.y >= d.y && p.y < d.y + side));
  const nBad = bad.filter(Boolean).length;
  const area = side * side;
  const y = poissonYield(area / 100, d0);
  return {
    grid,
    defs,
    bad,
    dpw: grid.dies.length,
    dpwFormula: diesPerWaferFormula(DIAM, area),
    y,
    observed: grid.dies.length ? (grid.dies.length - nBad) / grid.dies.length : 0,
    goodHere: grid.dies.length - nBad,
    cost: costPerGoodDie(waferCost, grid.dies.length, y),
    area,
  };
}

export function Yield({ props, onChange }: WidgetProps<YieldProps>) {
  const [side, setSide] = useState(props.side ?? 10);
  const [d0, setD0] = useState(props.d0 ?? 0.1);
  const [seed, setSeed] = useState(1);
  const [waferCost, setWaferCost] = useState(props.waferCost ?? 10000);
  const r = compute(side, d0, seed, waferCost);

  const report = (sd: number, dd: number, se: number, wc: number) => {
    const x = compute(sd, dd, se, wc);
    onChange?.({
      side: sd,
      area: x.area,
      d0: dd,
      dpw: x.dpw,
      dpwFormula: x.dpwFormula,
      yieldPct: x.y * 100,
      observedPct: x.observed * 100,
      costPerGood: x.cost,
    } satisfies YieldState);
  };

  return (
    <div className="w-full" data-widget>
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider
          label="Die size (square)"
          value={side}
          min={5}
          max={29}
          step={1}
          onChange={(v) => {
            setSide(v);
            report(v, d0, seed, waferCost);
          }}
          format={(v) => `${v} × ${v} mm = ${v * v} mm²`}
        />
        <Slider
          label="Defect density D0"
          value={d0}
          min={0.05}
          max={1}
          step={0.05}
          onChange={(v) => {
            const x = Math.round(v * 100) / 100;
            setD0(x);
            report(side, x, seed, waferCost);
          }}
          format={(v) => `${v.toFixed(2)} per cm²`}
        />
        {props.cost && (
          <Slider
            label="Wafer cost (illustrative)"
            value={waferCost}
            min={2000}
            max={20000}
            step={1000}
            onChange={(v) => {
              setWaferCost(v);
              report(side, d0, seed, v);
            }}
            format={(v) => usd(v)}
          />
        )}
      </div>

      <div className="mt-3 flex justify-center">
        <svg viewBox="0 0 300 300" className="block h-auto w-full max-w-[22rem]" role="img" aria-label={`300 millimetre wafer with ${r.dpw} dies of ${side} by ${side} millimetres. ${r.defs.length} random defects; ${r.goodHere} dies have none.`}>
          <circle cx={C} cy={C} r={(DIAM / 2) * S} fill="var(--surface-2)" stroke="var(--line-strong)" strokeWidth={1.5} />
          {r.grid.dies.map((d, i) => (
            <rect
              key={i}
              x={mm(d.x)}
              y={mm(-d.y - side)}
              width={Math.round(side * S * 100) / 100}
              height={Math.round(side * S * 100) / 100}
              fill={r.bad[i] ? "var(--bad)" : "var(--brand)"}
              opacity={r.bad[i] ? 0.85 : 0.55}
              stroke="var(--surface)"
              strokeWidth={side < 8 ? 0.3 : 0.8}
            />
          ))}
          {r.defs.map((p, i) => (
            <circle key={i} cx={mm(p.x)} cy={mm(-p.y)} r={2.2} fill={ORANGE} stroke="var(--ink)" strokeWidth={0.6} />
          ))}
          <path d={`M${C - 6} ${C + (DIAM / 2) * S} L${C} ${C + (DIAM / 2) * S - 7} L${C + 6} ${C + (DIAM / 2) * S}`} fill="var(--surface)" stroke="var(--line-strong)" />
        </svg>
      </div>
      <p className="mt-1 text-center text-xs text-ink-3">Filled squares: working dies · red: dies hit by a defect · orange dots: the defects. 300 mm wafer, 3 mm edge excluded.</p>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Whole dies on the wafer" value={whole(r.dpw)} />
        <Readout label="Formula estimate" value={whole(r.dpwFormula)} />
        <Readout label="Defects on this wafer" value={r.defs.length} />
        <Readout label="Good dies here" value={`${whole(r.goodHere)} (${(r.observed * 100).toFixed(0)} %)`} />
        <Readout label="Poisson yield e^(−A·D0)" value={`${(r.y * 100).toFixed(1)} %`} accent />
        {props.cost && <Readout label="Cost per good die" value={usd(r.cost)} accent />}
      </div>
      <div className="mt-3 flex justify-center">
        <Btn
          onClick={() => {
            setSeed(seed + 1);
            report(side, d0, seed + 1, waferCost);
          }}
        >
          <Shuffle className="h-4 w-4" aria-hidden /> Another wafer
        </Btn>
      </div>
      <div className="mt-3">
        <Note tone="accent">
          {`A ${side * side} mm² die is ${(side * side) / 100} cm², so it collects on average ${((side * side) / 100 * d0).toFixed(2)} defects. The chance it gets none is e^(−${((side * side) / 100 * d0).toFixed(2)}) = ${(r.y * 100).toFixed(1)} %. `}
          {r.y < 0.6 ? "Big dies lose out twice: fewer fit on the wafer, and each is more likely to catch a defect." : "Small dies dodge most defects: a defect only kills the one die it lands on."}
        </Note>
      </div>
      <Toy>
        Toy wafer: defects scattered uniformly at random (real ones cluster), and a die dies from any defect it touches. Dies per wafer is counted on the drawn grid; the formula estimate is π·(d/2)²/A − π·d/√(2A). Costs are illustrative round numbers{props.cost ? ", with the cost per good die = wafer cost / (dies × Poisson yield)" : ""}.
      </Toy>
    </div>
  );
}

/** goal: { d0, minYieldPct, maxYieldPct, minSide, maxSide, maxCost, minArea } */
export function checkYield(state: unknown, goal: Record<string, unknown>) {
  const s = state as YieldState | undefined;
  if (!s) return false;
  if (typeof goal.d0 === "number" && Math.abs(s.d0 - goal.d0) > 1e-9) return false;
  if (typeof goal.minYieldPct === "number" && s.yieldPct < goal.minYieldPct) return false;
  if (typeof goal.maxYieldPct === "number" && s.yieldPct > goal.maxYieldPct) return false;
  if (typeof goal.minSide === "number" && s.side < goal.minSide) return false;
  if (typeof goal.maxSide === "number" && s.side > goal.maxSide) return false;
  if (typeof goal.maxCost === "number" && s.costPerGood > goal.maxCost) return false;
  return true;
}

// ───────────────────────────── semi-chiplet: one big die or several small ones ─────────────────────────────

export interface ChipletProps {
  area?: number;
  d0?: number;
}
export interface ChipletState {
  n: number;
  d0: number;
  perProduct: number;
}

const WAFER = 10000;

export function Chiplet({ props, onChange }: WidgetProps<ChipletProps>) {
  const area = props.area ?? 600;
  const [n, setN] = useState(1);
  const [d0, setD0] = useState(props.d0 ?? 0.1);
  const c = chipletCost(area, n, d0, WAFER);
  const one = chipletCost(area, 1, d0, WAFER);
  const report = (nn: number, dd: number) => onChange?.({ n: nn, d0: dd, perProduct: chipletCost(area, nn, dd, WAFER).perProduct } satisfies ChipletState);
  const cols = n === 8 ? 4 : n === 1 ? 1 : 2;
  const rows = Math.ceil(n / cols);

  return (
    <div className="w-full" data-widget>
      <Seg
        label="Split the design into"
        value={n}
        onChange={(v) => {
          setN(v);
          report(v, d0);
        }}
        options={[1, 2, 4, 8].map((k) => ({ value: k, label: k === 1 ? "1 big die" : `${k} chiplets` }))}
      />
      <div className="mt-3">
        <Slider
          label="Defect density D0"
          value={d0}
          min={0.05}
          max={0.5}
          step={0.05}
          onChange={(v) => {
            const x = Math.round(v * 100) / 100;
            setD0(x);
            report(n, x);
          }}
          format={(v) => `${v.toFixed(2)} per cm²`}
        />
      </div>
      <div className="mt-3 flex justify-center">
        <svg viewBox="0 0 200 130" className="block h-auto w-full max-w-[16rem]" role="img" aria-label={`The product drawn as ${n === 1 ? "one die" : `${n} chiplets`} on a package.`}>
          <rect x={4} y={4} width={192} height={122} rx={8} fill="var(--surface-2)" stroke="var(--line-strong)" />
          {Array.from({ length: n }, (_, i) => {
            const cw = 160 / cols;
            const ch = 90 / rows;
            const x = 20 + (i % cols) * cw;
            const y = 20 + Math.floor(i / cols) * ch;
            return <rect key={i} x={Math.round(x + 3)} y={Math.round(y + 3)} width={Math.round(cw - 6)} height={Math.round(ch - 6)} rx={3} fill="var(--brand)" opacity={0.7} />;
          })}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label={n === 1 ? "Die area" : "Each chiplet"} value={`${Math.round(c.each)} mm²`} />
        <Readout label="Per wafer" value={whole(c.dpw)} />
        <Readout label="Yield" value={`${(c.y * 100).toFixed(1)} %`} accent={n > 1} />
        <Readout label="Cost per good die" value={usd(c.perDie)} />
        <Readout label="Silicon per product" value={usd(c.perProduct)} accent />
      </div>
      <div className="mt-3">
        <Note tone={n > 1 ? "accent" : "plain"}>
          {n === 1
            ? `One ${area} mm² die: only ${(one.y * 100).toFixed(0)} % come out working, so each good one costs ${usd(one.perProduct)} of silicon.`
            : `${n} chiplets of ${Math.round(c.each)} mm² each: a defect now ruins one small chiplet instead of the whole design. Silicon per product drops from ${usd(one.perProduct)} to ${usd(c.perProduct)} (${Math.round((1 - c.perProduct / one.perProduct) * 100)} % less), before paying for the more complex package.`}
        </Note>
      </div>
      <Toy>
        Toy numbers: a {area} mm² design, an illustrative $10,000 wafer, Poisson yield, dies per wafer from the formula. Each chiplet gets 10% extra area for the links between chiplets. Packaging and testing several chiplets costs extra and is not included.
      </Toy>
    </div>
  );
}

export function checkChiplet(state: unknown, goal: Record<string, unknown>) {
  const s = state as ChipletState | undefined;
  if (!s) return false;
  if (typeof goal.d0 === "number" && Math.abs(s.d0 - goal.d0) > 1e-9) return false;
  if (typeof goal.maxPerProduct === "number" && s.perProduct > goal.maxPerProduct) return false;
  if (typeof goal.minN === "number" && s.n < goal.minN) return false;
  return true;
}
