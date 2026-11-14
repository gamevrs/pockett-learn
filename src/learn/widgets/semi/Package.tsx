"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { BINS, PACKS, TEST, maxConnections, pack, runTest, type PackId } from "./phys";
import { Note, Readout, Seg, Slider, Toy, BLUE, ORANGE, usd, whole } from "./ui";

// ───────────────────────────── semi-pack: how a die connects to the world ─────────────────────────────

export interface PackProps {
  style?: PackId;
  side?: number;
}
export interface PackState {
  style: PackId;
  side: number;
  connections: number;
}

const DIE = "var(--brand)";
const SUB = "var(--surface-2)";
const LINE = "var(--line-strong)";
const INK = "var(--ink)";
const SOLDER = "#a7adb4";

function Balls({ y, x0 = 40, x1 = 320, r = 6 }: { y: number; x0?: number; x1?: number; r?: number }) {
  const n = Math.floor((x1 - x0) / (r * 3.2));
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <circle key={i} cx={Math.round(x0 + r + (i * (x1 - x0 - 2 * r)) / Math.max(1, n - 1))} cy={y} r={r} fill={SOLDER} stroke={INK} strokeWidth={0.8} />
      ))}
    </>
  );
}

function Text({ x, y, children, anchor = "start" }: { x: number; y: number; children: React.ReactNode; anchor?: "start" | "middle" | "end" }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={14} fill={INK}>
      {children}
    </text>
  );
}

function Drawing({ style }: { style: PackId }) {
  return (
    <svg viewBox="0 0 360 180" className="block h-auto w-full rounded-xl border border-line bg-surface" role="img" aria-label={`${pack(style).name} package, cut through.`}>
      {style === "wire" && (
        <>
          <rect x={30} y={120} width={300} height={20} rx={3} fill={SUB} stroke={LINE} />
          <rect x={120} y={96} width={120} height={24} rx={2} fill={DIE} opacity={0.85} />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <path d={`M${126 + i * 8} 98 Q ${96 - i * 10} ${60 + i * 6} ${70 - i * 14} 120`} fill="none" stroke="#c9a227" strokeWidth={1.6} />
              <path d={`M${234 - i * 8} 98 Q ${264 + i * 10} ${60 + i * 6} ${290 + i * 14} 120`} fill="none" stroke="#c9a227" strokeWidth={1.6} />
            </g>
          ))}
          <path d="M40 120 V50 H320 V120" fill="none" stroke="var(--ink-3)" strokeDasharray="4 4" />
          <Balls y={147} />
          <Text x={180} y={40} anchor="middle">plastic mould (dashed) protects the wires</Text>
          <Text x={180} y={90} anchor="middle">die, face up</Text>
          <Text x={180} y={174} anchor="middle">fine gold or copper wires to the edge pads</Text>
        </>
      )}
      {style === "flip" && (
        <>
          <rect x={30} y={112} width={300} height={22} rx={3} fill={SUB} stroke={LINE} />
          <rect x={100} y={70} width={160} height={30} rx={2} fill={DIE} opacity={0.85} />
          <Balls y={106} x0={104} x1={256} r={4} />
          <Balls y={141} />
          <Text x={180} y={58} anchor="middle">die face down, bumps over its whole face</Text>
          <Text x={180} y={172} anchor="middle">package substrate, then solder balls to the board</Text>
        </>
      )}
      {style === "interposer" && (
        <>
          <rect x={20} y={128} width={320} height={20} rx={3} fill={SUB} stroke={LINE} />
          <rect x={36} y={106} width={288} height={14} rx={2} fill={BLUE} opacity={0.6} stroke={LINE} />
          <Balls y={124} x0={40} x1={320} r={3} />
          <rect x={54} y={64} width={130} height={38} rx={2} fill={DIE} opacity={0.85} />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={214} y={92 - i * 10} width={90} height={9} rx={1} fill={ORANGE} stroke="var(--surface)" />
          ))}
          <Balls y={104} x0={58} x1={180} r={2} />
          <Text x={119} y={58} anchor="middle">GPU or CPU die</Text>
          <Text x={259} y={46} anchor="middle">HBM stack</Text>
          <Text x={180} y={170} anchor="middle">silicon interposer (blue) carries thousands of wires</Text>
        </>
      )}
      {style === "stack" && (
        <>
          <rect x={60} y={136} width={240} height={20} rx={3} fill={SUB} stroke={LINE} />
          <rect x={110} y={114} width={140} height={20} rx={2} fill={DIE} opacity={0.85} />
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={110} y={102 - i * 11} width={140} height={10} rx={1} fill={ORANGE} stroke="var(--surface)" />
          ))}
          {[140, 180, 220].map((x) => (
            <line key={x} x1={x} y1={26} x2={x} y2={134} stroke={INK} strokeWidth={1.4} strokeDasharray="2 2" />
          ))}
          <Text x={258} y={60}>8 thinned</Text>
          <Text x={258} y={78}>memory dies</Text>
          <Text x={258} y={128}>base die</Text>
          <Text x={180} y={176} anchor="middle">dashed: through-silicon vias (TSVs)</Text>
        </>
      )}
    </svg>
  );
}

const USE: Record<PackId, string> = {
  wire: "Cheap and proven: most microcontrollers, sensors and memory chips. Long thin wires limit speed, and pads only fit round the edge.",
  flip: "The die is flipped and soldered face-down through bumps across its whole face: many more connections, short paths and a back side free for a heat spreader. Standard for CPUs and GPUs.",
  interposer: "\"2.5D\": dies sit side by side on a slice of silicon full of fine wiring, so a processor and its memory talk over thousands of short wires. This is how HBM sits next to AI accelerators.",
  stack: "\"3D\": dies are thinned and stacked, joined by vertical through-silicon vias. HBM stacks memory dies this way (8 to 12 high is typical as of 2024). Heat has to escape through the whole stack.",
};

export function Pack({ props, onChange }: WidgetProps<PackProps>) {
  const [style, setStyle] = useState<PackId>(props.style ?? "wire");
  const [side, setSide] = useState(props.side ?? 10);
  const p = pack(style);
  const conn = maxConnections(style, side);
  const report = (s: PackId, d: number) => onChange?.({ style: s, side: d, connections: maxConnections(s, d) } satisfies PackState);

  return (
    <div className="w-full" data-widget>
      <Seg
        label="Packaging style"
        value={style}
        onChange={(v) => {
          setStyle(v);
          report(v, side);
        }}
        options={PACKS.map((x) => ({ value: x.id, label: x.name }))}
      />
      <div className="mt-3">
        <Drawing style={style} />
      </div>
      <div className="mt-3">
        <Slider
          label="Die edge length"
          value={side}
          min={5}
          max={20}
          step={1}
          onChange={(v) => {
            setSide(v);
            report(style, v);
          }}
          format={(v) => `${v} mm`}
        />
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Connection pitch (typical)" value={`${p.pitchUm} µm`} />
        <Readout label="Where" value={p.layout === "edge" ? "edge only" : "whole face"} />
        <Readout label="Most connections" value={whole(conn)} accent />
      </div>
      <p className="mt-2 text-center text-xs text-ink-3">
        {p.layout === "edge" ? `4 × edge ÷ pitch = 4 × ${side} mm ÷ ${p.pitchUm} µm` : `(edge ÷ pitch)² = (${side} mm ÷ ${p.pitchUm} µm)²`}, rounded down. Pitch: {p.pitchNote}.
      </p>
      <div className="mt-3">
        <Note tone="accent">{USE[style]}</Note>
      </div>
      <Toy>Typical pitches only, as of the mid-2020s; real packages mix styles, keep some area for power and ground, and the leading edge keeps shrinking. Drawings are not to scale.</Toy>
    </div>
  );
}

export function checkPack(state: unknown, goal: Record<string, unknown>) {
  const s = state as PackState | undefined;
  if (!s) return false;
  if (typeof goal.side === "number" && s.side !== goal.side) return false;
  if (typeof goal.minConnections === "number" && s.connections < goal.minConnections) return false;
  if (typeof goal.style === "string" && s.style !== goal.style) return false;
  if (Array.isArray(goal.notStyle) && goal.notStyle.includes(s.style)) return false;
  return true;
}

// ───────────────────────────── semi-test: sort, package, final test, burn-in, bins ─────────────────────────────

export interface TestState {
  sort: boolean;
  burnIn: boolean;
  fieldFails: number;
  wastedPackages: number;
  costPerGood: number;
}

function Stage({ name, detail, tone = "plain" }: { name: string; detail: string; tone?: "plain" | "skip" | "bad" }) {
  return (
    <li className={`rounded-xl border px-3 py-2 text-[13px] leading-snug ${tone === "skip" ? "border-dashed border-line text-ink-3" : tone === "bad" ? "border-[var(--bad)] bg-surface text-ink" : "border-line bg-surface text-ink-2"}`}>
      <span className="font-semibold text-ink">{name}</span> · {detail}
    </li>
  );
}

/** Parts per bin; the last bin takes the rounding remainder so the bins add up. */
function binCounts(total: number): number[] {
  const head = BINS.slice(0, -1).map((b) => Math.round(total * b.share));
  return [...head, total - head.reduce((a, b) => a + b, 0)];
}

export function TestFlow({ onChange }: WidgetProps) {
  const [sort, setSort] = useState(false);
  const [burnIn, setBurnIn] = useState(false);
  const r = runTest(sort, burnIn);
  const good = Math.round(TEST.dies * TEST.waferYield);
  const report = (a: boolean, b: boolean) => {
    const x = runTest(a, b);
    onChange?.({ sort: a, burnIn: b, fieldFails: x.fieldFails, wastedPackages: x.wastedPackages, costPerGood: x.costPerGood } satisfies TestState);
  };

  return (
    <div className="w-full" data-widget>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-ink-3">Wafer sort (probe every die before dicing)</p>
          <Seg
            label="Wafer sort"
            value={sort ? "on" : "off"}
            onChange={(v) => {
              setSort(v === "on");
              report(v === "on", burnIn);
            }}
            options={[
              { value: "off", label: "Skip" },
              { value: "on", label: "Probe every die" },
            ]}
          />
        </div>
        <div>
          <p className="mb-1 text-xs text-ink-3">Burn-in (hot, high-voltage stress for hours)</p>
          <Seg
            label="Burn-in"
            value={burnIn ? "on" : "off"}
            onChange={(v) => {
              setBurnIn(v === "on");
              report(sort, v === "on");
            }}
            options={[
              { value: "off", label: "Skip" },
              { value: "on", label: "Burn in" },
            ]}
          />
        </div>
      </div>
      <ol className="mt-3 space-y-1.5">
        <Stage name="Fab" detail={`${whole(TEST.dies)} dies, of which ${good} work (${TEST.waferYield * 100} % yield)`} />
        <Stage name="Wafer sort" detail={sort ? `probe needles test each die: ${TEST.dies - good} failures marked and never packaged` : "skipped: bad dies go on to packaging"} tone={sort ? "plain" : "skip"} />
        <Stage name="Dice and package" detail={`${whole(r.packaged)} dies packaged${r.wastedPackages ? `, ${r.wastedPackages} of them already dead` : ""}; about 1 % are damaged on the way`} tone={r.wastedPackages ? "bad" : "plain"} />
        <Stage name="Final test" detail={`rejects ${r.finalRejects} (${r.wastedPackages ? "dead dies plus " : ""}packaging damage)`} />
        <Stage name="Burn-in" detail={burnIn ? `${r.burnInRejects} weak parts fail early here, in the factory` : "skipped: weak parts pass every test today"} tone={burnIn ? "plain" : "skip"} />
        <Stage name="Ship" detail={`${r.shipped} parts, sorted into speed bins: ${binCounts(r.shipped).map((n, i) => `${n} ${BINS[i].name.toLowerCase()}`).join(", ")}`} />
        <Stage name="In customers' hands" detail={r.fieldFails ? `${r.fieldFails} fail within months and come back` : "no early failures"} tone={r.fieldFails ? "bad" : "plain"} />
      </ol>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Wasted packages" value={r.wastedPackages} accent={r.wastedPackages > 0} />
        <Readout label="Field failures" value={r.fieldFails} accent={r.fieldFails > 0} />
        <Readout label="Total cost" value={usd(r.totalCost)} />
        <Readout label="Cost per working part" value={usd(r.costPerGood)} accent />
      </div>
      <div className="mt-3">
        <Note tone={r.fieldFails === 0 && !r.wastedPackages ? "accent" : "plain"}>
          {!sort
            ? `Without wafer sort, ${TEST.dies - good} dead dies get a ${usd(TEST.packageCost)} package and a final test each. Probing costs only ${usd(TEST.sortCost)} per die.`
            : !burnIn
              ? `Cheapest per part, but ${r.fieldFails} customers get a chip that dies early. Each return is counted at ${usd(TEST.returnCost)} here, and a car maker or a data centre would not accept that rate at any price.`
              : "Every dead die caught before packaging and every weak one caught before shipping: no field failures, at the price of the burn-in step."}
        </Note>
      </div>
      <Toy>
        Toy lot with illustrative numbers: {whole(TEST.dies)} dies, $10 each to make, ${TEST.sortCost.toFixed(2)} to probe, $4 to package, $0.50 to final-test, $2 to burn in, $50 per field return. 2 % of good parts are weak. Every hard failure is caught by the first test that sees it; real tests miss a few.
      </Toy>
    </div>
  );
}

/** goal: { sort, burnIn, maxFieldFails, maxWasted } */
export function checkTestFlow(state: unknown, goal: Record<string, unknown>) {
  const s = state as TestState | undefined;
  if (!s) return false;
  if (typeof goal.sort === "boolean" && s.sort !== goal.sort) return false;
  if (typeof goal.burnIn === "boolean" && s.burnIn !== goal.burnIn) return false;
  if (typeof goal.maxFieldFails === "number" && s.fieldFails > goal.maxFieldFails) return false;
  if (typeof goal.maxWasted === "number" && s.wastedPackages > goal.maxWasted) return false;
  return true;
}
