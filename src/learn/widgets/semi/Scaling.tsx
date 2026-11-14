"use client";

import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { CHIPS, PD_LIMIT, SHRINK, mooreCount, mooreError, powerDensity, relEnergy, relLeak, relSpeed } from "./phys";
import { Btn, Meter, Note, Readout, Seg, Slider, Toy, ORANGE, sci, whole } from "./ui";

const r1 = (v: number) => Math.round(v * 10) / 10;

// ───────────────────────────── semi-moore: transistor counts on a log scale ─────────────────────────────

export interface MooreProps {
  period?: number;
}
export interface MooreState {
  period: number;
  /** RMS miss in powers of ten. */
  err: number;
}

const MX0 = 50;
const MX1 = 346;
const MY0 = 12;
const MY1 = 196;
const Y_LO = 3;
const Y_HI = 12;
const mx = (year: number) => MX0 + ((year - 1970) / 55) * (MX1 - MX0);
const my = (count: number) => MY1 - ((Math.log10(count) - Y_LO) / (Y_HI - Y_LO)) * (MY1 - MY0);

export function Moore({ props, onChange }: WidgetProps<MooreProps>) {
  const [period, setPeriod] = useState(props.period ?? 1);
  const err = mooreError(period);
  const miss = 10 ** err;
  const line: string[] = [];
  for (let y = 1971; y <= 2025; y += 0.5) {
    const c = mooreCount(y, period);
    if (Math.log10(c) > Y_HI) {
      // clip the line at the top edge
      const yTop = 1971 + period * Math.log2(10 ** Y_HI / CHIPS[0].count);
      line.push(`${r1(mx(yTop))} ${MY0}`);
      break;
    }
    line.push(`${r1(mx(y))} ${r1(my(c))}`);
  }

  return (
    <div className="w-full" data-widget>
      <Slider
        label="Doubling period of the prediction"
        value={period}
        min={1}
        max={4}
        step={0.25}
        onChange={(v) => {
          setPeriod(v);
          onChange?.({ period: v, err: mooreError(v) } satisfies MooreState);
        }}
        format={(v) => `every ${v} year${v === 1 ? "" : "s"}`}
      />
      <svg viewBox="0 0 360 222" className="mt-3 block h-auto w-full rounded-xl border border-line bg-surface" role="img" aria-label={`Transistors per chip from 1971 to 2022 on a log scale, with a line doubling every ${period} years. On average the line misses by a factor of ${miss.toFixed(1)}.`}>
        {[3, 6, 9, 12].map((e) => (
          <g key={e}>
            <line x1={MX0} y1={r1(my(10 ** e))} x2={MX1} y2={r1(my(10 ** e))} stroke="var(--line-strong)" strokeWidth={0.7} />
            <text x={MX0 - 4} y={r1(my(10 ** e)) + 5} textAnchor="end" fontSize={14} fill="var(--ink-3)">
              {e === 3 ? "1k" : e === 6 ? "1M" : e === 9 ? "1B" : "1T"}
            </text>
          </g>
        ))}
        {[1970, 1990, 2010].map((y) => (
          <text key={y} x={r1(mx(y))} y={MY1 + 18} textAnchor="middle" fontSize={14} fill="var(--ink-3)">
            {y}
          </text>
        ))}
        <polyline points={line.join(" ")} fill="none" stroke={ORANGE} strokeWidth={2.5} />
        {CHIPS.map((c) => (
          <circle key={c.name} cx={r1(mx(c.year))} cy={r1(my(c.count))} r={5.5} fill="var(--brand)" stroke="var(--surface)" strokeWidth={1.5} />
        ))}
        <text x={MX1} y={MY1 + 18} textAnchor="end" fontSize={14} fill="var(--ink-2)">
          year
        </text>
      </svg>
      <p className="mt-1 text-xs text-ink-3">Dots: transistors per chip (approximate published figures). Orange: 2,300 in 1971, doubling every {period} years. Log scale: each grid line is 1,000 times the one below.</p>
      <ul className="mt-2 grid gap-x-4 gap-y-0.5 text-[13px] text-ink-2 sm:grid-cols-2">
        {CHIPS.map((c) => (
          <li key={c.name}>
            <span className="font-mono text-ink">{c.year}</span> {c.name}: {sci(c.count)} <span className="text-ink-3">(line: {sci(mooreCount(c.year, period))})</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Typical miss" value={`× ${miss < 100 ? miss.toFixed(1) : sci(miss, 1)}`} accent={err < 0.3} />
      </div>
      <div className="mt-3">
        <Note tone={err < 0.3 ? "accent" : "plain"}>
          {err < 0.3
            ? `Doubling every ${period} years tracks half a century of chips to within about a factor of ${miss.toFixed(1)}: that is Moore's law.`
            : `A doubling every ${period} year${period === 1 ? "" : "s"} misses the real chips by a factor of ${miss < 100 ? miss.toFixed(0) : sci(miss, 1)} on average.`}
        </Note>
      </div>
    </div>
  );
}

export function checkMoore(state: unknown, goal: Record<string, unknown>) {
  const s = state as MooreState | undefined;
  if (!s) return false;
  if (typeof goal.period === "number" && s.period !== goal.period) return false;
  if (typeof goal.maxErr === "number" && s.err > goal.maxErr) return false;
  return true;
}

// ───────────────────────────── semi-dennard: power density per generation ─────────────────────────────

export interface DennardProps {
  voltageScales?: boolean;
  clockScales?: boolean;
  /** Hide the voltage switch (fixed at voltageScales). */
  lockVoltage?: boolean;
}
export interface DennardState {
  gen: number;
  voltageScales: boolean;
  clockScales: boolean;
  pd: number;
  over: boolean;
}

const GENS = 6;

export function Dennard({ props, onChange }: WidgetProps<DennardProps>) {
  const [vs, setVs] = useState(props.voltageScales ?? true);
  const [cs, setCs] = useState(props.clockScales ?? true);
  const [gen, setGen] = useState(0);

  const pds = Array.from({ length: gen + 1 }, (_, g) => powerDensity(g, vs, cs));
  const pd = pds[gen];
  const over = pds.some((p) => p > PD_LIMIT + 1e-9);
  const report = (g: number, v: boolean, c: boolean) => {
    const list = Array.from({ length: g + 1 }, (_, k) => powerDensity(k, v, c));
    onChange?.({ gen: g, voltageScales: v, clockScales: c, pd: list[g], over: list.some((p) => p > PD_LIMIT + 1e-9) } satisfies DennardState);
  };
  const pick = (v: boolean, c: boolean) => {
    setVs(v);
    setCs(c);
    setGen(0);
    report(0, v, c);
  };

  const BX0 = 46;
  const BX1 = 346;
  const BY1 = 176;
  const BY0 = 14;
  const maxShown = 700;
  const by = (p: number) => BY1 - (Math.log10(Math.max(p, 1)) / Math.log10(maxShown)) * (BY1 - BY0);
  const bw = (BX1 - BX0) / (GENS + 1);

  return (
    <div className="w-full" data-widget>
      <div className="grid gap-2 sm:grid-cols-2">
        {!props.lockVoltage && (
          <div>
            <p className="mb-1 text-xs text-ink-3">Supply voltage each generation</p>
            <Seg
              label="Supply voltage each generation"
              value={vs ? "y" : "n"}
              onChange={(x) => pick(x === "y", cs)}
              options={[
                { value: "y", label: "Shrinks with size" },
                { value: "n", label: "Stuck near 1 V" },
              ]}
            />
          </div>
        )}
        <div>
          <p className="mb-1 text-xs text-ink-3">Clock speed each generation</p>
          <Seg
            label="Clock speed each generation"
            value={cs ? "y" : "n"}
            onChange={(x) => pick(vs, x === "y")}
            options={[
              { value: "y", label: "Speeds up ×1.4" },
              { value: "n", label: "Stays the same" },
            ]}
          />
        </div>
      </div>
      <svg viewBox="0 0 360 200" className="mt-3 block h-auto w-full rounded-xl border border-line bg-surface" role="img" aria-label={`Power density after ${gen} generations: ${whole(pd)} watts per square centimetre. Cooling limit ${PD_LIMIT}.`}>
        {[1, 10, 100].map((p) => (
          <g key={p}>
            <line x1={BX0} y1={r1(by(p))} x2={BX1} y2={r1(by(p))} stroke={p === PD_LIMIT ? "var(--bad)" : "var(--line-strong)"} strokeWidth={p === PD_LIMIT ? 1.8 : 0.7} strokeDasharray={p === PD_LIMIT ? "5 4" : undefined} />
            <text x={BX0 - 4} y={r1(by(p)) + 5} textAnchor="end" fontSize={14} fill="var(--ink-3)">
              {p}
            </text>
          </g>
        ))}
        <text x={BX1} y={r1(by(PD_LIMIT)) - 6} textAnchor="end" fontSize={14} fill="var(--bad)">
          cooling limit
        </text>
        {pds.map((p, g) => (
          <rect key={g} x={r1(BX0 + g * bw + 6)} y={r1(by(p))} width={r1(bw - 12)} height={r1(BY1 - by(p))} rx={3} fill={p > PD_LIMIT ? "var(--bad)" : "var(--brand)"} />
        ))}
        {Array.from({ length: GENS + 1 }, (_, g) => (
          <text key={g} x={r1(BX0 + g * bw + bw / 2)} y={BY1 + 17} textAnchor="middle" fontSize={14} fill="var(--ink-3)">
            {g}
          </text>
        ))}
        <text x={8} y={BY0 + 4} fontSize={14} fill="var(--ink-2)">
          W/cm²
        </text>
      </svg>
      <p className="mt-1 text-xs text-ink-3">Bars: power density per generation (log scale). Below: generation number.</p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Generation" value={`${gen} of ${GENS}`} />
        <Readout label="Transistors per mm²" value={`× ${whole(2 ** gen)}`} />
        <Readout label="Clock" value={`× ${cs ? (SHRINK ** gen).toFixed(1) : "1"}`} />
        <Readout label="Power density" value={`${pd < 10 ? pd.toFixed(1) : whole(pd)} W/cm²`} accent={over} />
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Btn
          primary
          onClick={() => {
            const g = Math.min(GENS, gen + 1);
            setGen(g);
            report(g, vs, cs);
          }}
          disabled={gen >= GENS}
        >
          Next generation
        </Btn>
        <Btn
          onClick={() => {
            setGen(0);
            report(0, vs, cs);
          }}
        >
          <RotateCcw className="h-4 w-4" aria-hidden /> Start again
        </Btn>
      </div>
      <div className="mt-3">
        <Note tone={over ? "accent" : "plain"}>
          {over
            ? "Over the cooling limit: this chip would cook itself. Something has to give: slower clocks, lower voltage, or parts of the chip switched off."
            : vs && cs
              ? "Dennard scaling: everything shrinks by the same factor, voltage too. Each generation doubles the transistors and speeds up the clock, yet the power per square centimetre stays the same."
              : !vs && cs
                ? "With the voltage stuck, each faster, denser generation doubles the power per square centimetre."
                : `Power density ${gen ? "after " + gen + " generation" + (gen > 1 ? "s" : "") : "at the start"}: ${pd < 10 ? pd.toFixed(1) : whole(pd)} W/cm².`}
        </Note>
      </div>
      <Toy>
        Toy model: each generation shrinks every length by √2 ≈ 1.4, so twice the transistors fit. Dynamic power per transistor P = C·V²·f, with capacitance shrinking by 1.4. Start at 10 W/cm²; a cooling limit of about 100 W/cm² is an order-of-magnitude figure, not a hard law.
      </Toy>
    </div>
  );
}

export function checkDennard(state: unknown, goal: Record<string, unknown>) {
  const s = state as DennardState | undefined;
  if (!s) return false;
  if (typeof goal.gen === "number" && s.gen < goal.gen) return false;
  if (typeof goal.voltageScales === "boolean" && s.voltageScales !== goal.voltageScales) return false;
  if (typeof goal.clockScales === "boolean" && s.clockScales !== goal.clockScales) return false;
  if (goal.notOver === true && s.over) return false;
  if (goal.over === true && !s.over) return false;
  return true;
}

// ───────────────────────────── semi-leak: supply, threshold, speed and leakage ─────────────────────────────

export interface LeakProps {
  vdd?: number;
  vth?: number;
}
export interface LeakState {
  vdd: number;
  vth: number;
  speed: number;
  leak: number;
  energy: number;
}

export function Leak({ props, onChange }: WidgetProps<LeakProps>) {
  const [vdd, setVdd] = useState(props.vdd ?? 1);
  const [vth, setVth] = useState(props.vth ?? 0.45);
  const speed = relSpeed(vdd, vth);
  const leak = relLeak(vth);
  const energy = relEnergy(vdd);
  const report = (a: number, b: number) => onChange?.({ vdd: a, vth: b, speed: relSpeed(a, b), leak: relLeak(b), energy: relEnergy(a) } satisfies LeakState);

  const rows = [
    { label: "Switching speed", v: speed, frac: speed / 1.6, text: `× ${speed.toFixed(2)}`, tone: speed < 0.95 ? "warn" : "brand" },
    { label: "Energy per switch (∝ V²)", v: energy, frac: energy / 1.5, text: `× ${energy.toFixed(2)}`, tone: "brand" },
    { label: "Leakage when off (log bar)", v: leak, frac: Math.log10(Math.max(leak, 0.01)) / 3 + 0.33, text: `× ${leak < 10 ? leak.toFixed(1) : whole(leak)}`, tone: leak > 20 ? "bad" : "brand" },
  ] as const;

  return (
    <div className="w-full" data-widget>
      <div className="grid gap-3 sm:grid-cols-2">
        <Slider
          label="Supply voltage Vdd"
          value={vdd}
          min={0.6}
          max={1.2}
          step={0.05}
          onChange={(v) => {
            const x = Math.round(v * 100) / 100;
            setVdd(x);
            report(x, vth);
          }}
          format={(v) => `${v.toFixed(2)} V`}
        />
        <Slider
          label="Threshold voltage Vth"
          value={vth}
          min={0.2}
          max={0.5}
          step={0.01}
          onChange={(v) => {
            const x = Math.round(v * 100) / 100;
            setVth(x);
            report(vdd, x);
          }}
          format={(v) => `${v.toFixed(2)} V`}
        />
      </div>
      <div className="mt-4 space-y-3">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-[13px]">
              <span className="text-ink-2">{r.label}</span>
              <span className="font-mono font-semibold tabular-nums text-ink">{r.text}</span>
            </div>
            <Meter frac={r.frac} tone={r.tone} label={`${r.label}: ${r.text}`} />
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Note tone={leak > 20 || speed < 0.95 ? "accent" : "plain"}>
          {vdd - vth < 0.15
            ? "The supply is barely above the threshold: the transistor hardly turns on, so it switches very slowly."
            : leak > 20
              ? `Every 90 mV off the threshold lets about ten times more current leak through transistors that are meant to be off. At ${vth.toFixed(2)} V that is ${whole(leak)}×: a chip of billions of transistors burns power doing nothing.`
              : speed < 0.95
                ? "Lowering the supply saves energy (it goes as V²), but with the threshold where it was, the transistor turns on less hard and the chip gets slower."
                : "A balance: lower supply for less energy per switch, a threshold just low enough to keep the speed, and leakage kept in check."}
        </Note>
      </div>
      <Toy>
        Toy model, relative to Vdd 1.0 V and Vth 0.45 V: speed ∝ (Vdd − Vth)^1.3 / Vdd, energy ∝ Vdd², leakage ×10 for every 90 mV the threshold drops (a typical subthreshold swing; physics sets about 60 mV per decade at room temperature as the best a normal transistor can do).
      </Toy>
    </div>
  );
}

export function checkLeak(state: unknown, goal: Record<string, unknown>) {
  const s = state as LeakState | undefined;
  if (!s) return false;
  if (typeof goal.maxEnergy === "number" && s.energy > goal.maxEnergy + 1e-9) return false;
  if (typeof goal.minSpeed === "number" && s.speed < goal.minSpeed) return false;
  if (typeof goal.maxLeak === "number" && s.leak > goal.maxLeak) return false;
  return true;
}

// ───────────────────────────── semi-gates: planar, FinFET, gate-all-around ─────────────────────────────

export type Structure = "planar" | "finfet" | "gaa";
export interface GatesProps {
  structure?: Structure;
}
export interface GatesState {
  structure: Structure;
  sheets: number;
}

const INFO: Record<Structure, { name: string; sides: string; control: number; when: string; text: string }> = {
  planar: {
    name: "Planar",
    sides: "1 (top only)",
    control: 0.35,
    when: "the only kind from the 1960s until about 2011",
    text: "The gate sits on top of a flat channel. When the channel gets very short, the drain starts to pull on the channel from below, where the gate cannot reach: the transistor no longer turns fully off and leaks.",
  },
  finfet: {
    name: "FinFET",
    sides: "3 (top and both sides)",
    control: 0.75,
    when: "in volume production from 2011; leading-edge standard through the 2010s",
    text: "The channel is a thin vertical fin and the gate drapes over it on three sides. The gate now controls almost the whole channel, so it switches off much more cleanly. Taller fins carry more current in the same footprint.",
  },
  gaa: {
    name: "Gate-all-around",
    sides: "4 (all the way round)",
    control: 0.95,
    when: "in volume production from about 2022; spreading to the leading edge (as of 2025)",
    text: "The channel is a stack of thin horizontal sheets, and the gate fills the space around every one of them. Full wrap-around gives the best control yet. Designers can also choose the sheet width to trade current against size.",
  },
};

function GateDrawing({ s, sheets }: { s: Structure; sheets: number }) {
  const GATE = "var(--brand)";
  const CH = ORANGE;
  return (
    <svg viewBox="0 0 360 190" className="block h-auto w-full rounded-xl border border-line bg-surface" role="img" aria-label={`${INFO[s].name} transistor cut across the channel: the gate touches ${INFO[s].sides} of the channel.`}>
      <rect x={20} y={150} width={320} height={30} fill="var(--surface-2)" stroke="var(--line-strong)" />
      <text x={180} y={171} textAnchor="middle" fontSize={14} fill="var(--ink-2)">
        silicon substrate
      </text>
      {s === "planar" && (
        <>
          <rect x={90} y={134} width={180} height={16} fill={CH} />
          <rect x={90} y={126} width={180} height={8} fill="var(--line-strong)" />
          <rect x={90} y={76} width={180} height={50} rx={3} fill={GATE} opacity={0.9} />
        </>
      )}
      {s === "finfet" && (
        <>
          <rect x={160} y={56} width={40} height={94} fill={CH} />
          <path d="M140 150 V44 H220 V150 H210 V54 H150 V150 Z" fill={GATE} opacity={0.9} />
          <rect x={100} y={140} width={160} height={10} fill="var(--line-strong)" />
        </>
      )}
      {s === "gaa" && (
        <>
          <rect x={110} y={34} width={140} height={116} rx={4} fill={GATE} opacity={0.9} />
          {Array.from({ length: sheets }, (_, i) => {
            const y = 134 - i * (96 / sheets) - 8;
            return <rect key={i} x={130} y={r1(y - 4)} width={100} height={12} rx={2} fill={CH} stroke="var(--surface)" strokeWidth={1.5} />;
          })}
        </>
      )}
      <rect x={20} y={10} width={14} height={14} fill={GATE} />
      <text x={40} y={22} fontSize={14} fill="var(--ink)">
        gate
      </text>
      <rect x={96} y={10} width={14} height={14} fill={CH} />
      <text x={116} y={22} fontSize={14} fill="var(--ink)">
        channel (current flows into the page)
      </text>
    </svg>
  );
}

export function Gates({ props, onChange }: WidgetProps<GatesProps>) {
  const [s, setS] = useState<Structure>(props.structure ?? "planar");
  const [sheets, setSheets] = useState(3);
  const info = INFO[s];
  const report = (x: Structure, n: number) => onChange?.({ structure: x, sheets: n } satisfies GatesState);
  return (
    <div className="w-full" data-widget>
      <Seg
        label="Transistor structure"
        value={s}
        onChange={(x) => {
          setS(x);
          report(x, sheets);
        }}
        options={[
          { value: "planar", label: "Planar" },
          { value: "finfet", label: "FinFET" },
          { value: "gaa", label: "Gate-all-around" },
        ]}
      />
      <div className="mt-3">
        <GateDrawing s={s} sheets={sheets} />
      </div>
      {s === "gaa" && (
        <div className="mt-2">
          <Seg
            label="Stacked sheets"
            value={sheets}
            onChange={(n) => {
              setSheets(n);
              report(s, n);
            }}
            options={[2, 3, 4].map((n) => ({ value: n, label: `${n} sheets` }))}
          />
        </div>
      )}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Sides the gate touches" value={info.sides} accent={s !== "planar"} />
      </div>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[13px] text-ink-2">
          <span>Gate control over the channel (qualitative)</span>
        </div>
        <Meter frac={info.control} label={`Gate control: ${Math.round(info.control * 100)} percent of the way to ideal`} />
      </div>
      <div className="mt-3">
        <Note>
          <strong className="text-ink">{info.name}</strong>, {info.when}. {info.text}
        </Note>
      </div>
      <Toy>Schematic cross-sections, not to scale. Dates are approximate first volume production at the leading edge; many chips are still made on older planar processes.</Toy>
    </div>
  );
}

export function checkGates(state: unknown, goal: Record<string, unknown>) {
  const s = state as GatesState | undefined;
  if (!s) return false;
  if (typeof goal.structure === "string" && s.structure !== goal.structure) return false;
  if (typeof goal.minSheets === "number" && s.sheets < goal.minSheets) return false;
  return true;
}
