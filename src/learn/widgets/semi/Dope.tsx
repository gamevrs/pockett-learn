"use client";

import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { doped, NI_300 } from "./phys";
import { Btn, Note, Readout, Seg, Slider, Toy, ORANGE, sci, whole } from "./ui";

// ───────────────────────────── semi-dope: n-type and p-type ─────────────────────────────

export interface DopeProps {
  /** "lattice": tap atoms in a small crystal; "calc": real concentrations and conductivity. */
  mode?: "lattice" | "calc";
  /** Calc mode: starting type and log10 of the concentration. */
  type?: "n" | "p";
  exp?: number;
}

export type Atom = "si" | "p" | "b";

export interface DopeLatticeState {
  mode: "lattice";
  p: number;
  b: number;
  /** Free electrons (one per phosphorus) and holes (one per boron) before they cancel. */
  electrons: number;
  holes: number;
  type: "intrinsic" | "n" | "p" | "compensated";
}

export interface DopeCalcState {
  mode: "calc";
  type: "n" | "p";
  exp: number;
  /** Conductivity relative to pure silicon. */
  ratio: number;
  rho: number;
  minority: number;
}

const COLS = 5;
const ROWS = 4;

const kindOf = (p: number, b: number): DopeLatticeState["type"] => (p === 0 && b === 0 ? "intrinsic" : p > b ? "n" : b > p ? "p" : "compensated");

function Lattice({ onChange }: { onChange?: (s: unknown) => void }) {
  const [atoms, setAtoms] = useState<Atom[]>(() => Array(COLS * ROWS).fill("si"));
  const [tool, setTool] = useState<Atom>("p");
  const [msg, setMsg] = useState("Every silicon atom shares its four outer electrons with four neighbours: all bonds full, nothing free to move. Pick an atom to add and tap a silicon atom to swap it.");

  const p = atoms.filter((a) => a === "p").length;
  const b = atoms.filter((a) => a === "b").length;
  const type = kindOf(p, b);

  const put = (i: number) => {
    const next = atoms.slice();
    next[i] = atoms[i] === tool ? "si" : tool;
    const np = next.filter((a) => a === "p").length;
    const nb = next.filter((a) => a === "b").length;
    setAtoms(next);
    setMsg(
      next[i] === "p"
        ? "Phosphorus has five outer electrons. Four fill the bonds; the fifth is barely held and wanders off at room temperature: a free electron."
        : next[i] === "b"
          ? "Boron has only three outer electrons, so one bond is missing an electron: a hole. A neighbour's electron can hop in, which moves the hole along."
          : "Back to a plain silicon atom.",
    );
    onChange?.({ mode: "lattice", p: np, b: nb, electrons: np, holes: nb, type: kindOf(np, nb) } satisfies DopeLatticeState);
  };
  const reset = () => {
    setAtoms(Array(COLS * ROWS).fill("si"));
    setMsg("Pure silicon again: no free electrons, no holes (at this scale).");
    onChange?.({ mode: "lattice", p: 0, b: 0, electrons: 0, holes: 0, type: "intrinsic" } satisfies DopeLatticeState);
  };

  const label = (a: Atom) => (a === "si" ? "silicon" : a === "p" ? "phosphorus" : "boron");
  const typeText =
    type === "intrinsic" ? "pure (intrinsic)" : type === "n" ? "n-type (extra electrons)" : type === "p" ? "p-type (extra holes)" : "compensated (they cancel)";

  return (
    <div className="w-full" data-widget>
      <Seg
        label="Atom to add"
        value={tool}
        onChange={setTool}
        options={[
          { value: "p", label: "Phosphorus (5 outer e⁻)" },
          { value: "b", label: "Boron (3 outer e⁻)" },
          { value: "si", label: "Silicon (4)" },
        ]}
      />
      <div className="relative mx-auto mt-3 w-full max-w-[22rem]">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {Array.from({ length: ROWS }, (_, r) =>
            Array.from({ length: COLS }, (_, c) => {
              const x = ((c + 0.5) * 100) / COLS;
              const y = ((r + 0.5) * 100) / ROWS;
              return (
                <g key={`${r}-${c}`}>
                  {c < COLS - 1 && <line x1={x} y1={y} x2={x + 100 / COLS} y2={y} stroke="var(--line-strong)" strokeWidth={3} vectorEffect="non-scaling-stroke" />}
                  {r < ROWS - 1 && <line x1={x} y1={y} x2={x} y2={y + 100 / ROWS} stroke="var(--line-strong)" strokeWidth={3} vectorEffect="non-scaling-stroke" />}
                </g>
              );
            }),
          )}
        </svg>
        <div className="relative grid gap-y-3" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
          {atoms.map((a, i) => (
            <div key={i} className="flex items-center justify-center py-1">
              <button
                type="button"
                onClick={() => put(i)}
                aria-label={`Atom ${i + 1}: ${label(a)}${a === "p" ? ", gives a free electron" : a === "b" ? ", leaves a hole" : ""}. Tap to make it ${label(atoms[i] === tool ? "si" : tool)}.`}
                className={`relative grid h-11 w-11 place-items-center rounded-full border-2 font-mono text-[0.95rem] font-bold transition-colors ${
                  a === "si" ? "border-line bg-surface-2 text-ink" : a === "p" ? "border-[var(--brand)] bg-primary text-primary-ink" : "border-[#e8924a] bg-surface text-ink"
                }`}
              >
                {a === "si" ? "Si" : a === "p" ? "P" : "B"}
                {a === "p" && (
                  <span aria-hidden className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-ink ring-2 ring-[var(--surface)]">
                    e⁻
                  </span>
                )}
                {a === "b" && <span aria-hidden className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full border-2 border-dashed bg-surface" style={{ borderColor: ORANGE }} />}
              </button>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Free electrons" value={p} accent={p > b} />
        <Readout label="Holes" value={b} accent={b > p} />
        <Readout label="Silicon is now" value={typeText} />
      </div>
      <div className="mt-3">
        <Note tone={type === "n" || type === "p" ? "accent" : "plain"}>
          {type === "compensated" ? "Equal numbers of phosphorus and boron: each free electron falls into a hole, and the crystal behaves almost like pure silicon again. " : ""}
          {msg}
        </Note>
      </div>
      <div className="mt-2 flex justify-center">
        <Btn onClick={reset}>
          <RotateCcw className="h-4 w-4" aria-hidden /> Reset
        </Btn>
      </div>
      <Toy>
        Toy picture: a flat grid instead of silicon&apos;s 3D diamond lattice, and one dopant in every few atoms where real chips use about one in a million. At room temperature practically every dopant gives up its electron or hole, as shown.
      </Toy>
    </div>
  );
}

/** Log-scale ruler of resistivity, Ω·cm, from copper to glass. */
const RULER = { lo: -6, hi: 16 };
const rx = (rho: number) => 12 + ((Math.log10(rho) - RULER.lo) / (RULER.hi - RULER.lo)) * 336;

function Calc({ props, onChange }: { props: DopeProps; onChange?: (s: unknown) => void }) {
  const [type, setType] = useState<"n" | "p">(props.type ?? "n");
  const [exp, setExp] = useState(props.exp ?? 13);
  const N = 10 ** exp;
  const d = type === "n" ? doped(N, 0) : doped(0, N);
  const majority = type === "n" ? d.n : d.p;
  const minority = type === "n" ? d.p : d.n;

  const report = (t: "n" | "p", e: number) => {
    const dd = t === "n" ? doped(10 ** e, 0) : doped(0, 10 ** e);
    onChange?.({ mode: "calc", type: t, exp: e, ratio: dd.ratio, rho: dd.rho, minority: t === "n" ? dd.p : dd.n } satisfies DopeCalcState);
  };
  const pure = doped(0, 0);
  const marks = [
    { rho: 1.7e-6, label: "copper", up: true },
    { rho: pure.rho, label: "pure Si", up: true },
    { rho: 1e14, label: "glass", up: true },
  ];

  return (
    <div className="w-full" data-widget>
      <Seg
        label="Dopant"
        value={type}
        onChange={(v) => {
          setType(v);
          report(v, exp);
        }}
        options={[
          { value: "n", label: "Phosphorus → n-type" },
          { value: "p", label: "Boron → p-type" },
        ]}
      />
      <div className="mt-3">
        <Slider
          label="Dopant atoms per cm³"
          value={exp}
          min={13}
          max={19}
          step={1}
          onChange={(v) => {
            setExp(v);
            report(type, v);
          }}
          format={(v) => sci(10 ** v, 1)}
        />
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Dopant share" value={`1 per ${sci(d.atomsPerDopant, 1)} Si atoms`} />
        <Readout label={type === "n" ? "Free electrons" : "Holes"} value={`${sci(majority)} /cm³`} accent />
        <Readout label={type === "n" ? "Holes" : "Free electrons"} value={`${sci(minority)} /cm³`} />
        <Readout label="Resistivity" value={`${sci(d.rho)} Ω·cm`} />
        <Readout label="Conducts better than pure Si by" value={`${d.ratio >= 1e4 ? sci(d.ratio) : whole(d.ratio)} ×`} accent />
      </div>
      <svg viewBox="0 0 360 92" className="mt-3 block h-auto w-full rounded-xl border border-line bg-surface" role="img" aria-label={`Resistivity scale: this silicon is ${sci(d.rho)} ohm centimetres, between copper and pure silicon.`}>
        <line x1={12} y1={52} x2={348} y2={52} stroke="var(--line-strong)" strokeWidth={6} strokeLinecap="round" />
        {marks.map((m) => (
          <g key={m.label}>
            <line x1={Math.round(rx(m.rho))} y1={42} x2={Math.round(rx(m.rho))} y2={62} stroke="var(--ink-3)" strokeWidth={1.5} />
            <text x={Math.round(rx(m.rho))} y={34} textAnchor={m.label === "copper" ? "start" : m.label === "glass" ? "end" : "middle"} fontSize={14} fill="var(--ink-2)">
              {m.label}
            </text>
          </g>
        ))}
        <circle cx={Math.round(rx(d.rho))} cy={52} r={8} fill="var(--brand)" stroke="var(--surface)" strokeWidth={2} />
        <text x={Math.round(Math.min(300, Math.max(60, rx(d.rho))))} y={84} textAnchor="middle" fontSize={14} fontWeight={600} fill="var(--ink)">
          this silicon
        </text>
      </svg>
      <p className="mt-1 text-xs text-ink-3">Resistivity on a log scale (each tick of the bar is a big factor): lower means it conducts better.</p>
      <div className="mt-3">
        <Note tone="accent">
          {`One ${type === "n" ? "phosphorus" : "boron"} atom per ${sci(d.atomsPerDopant, 1)} silicon atoms makes it conduct about ${d.ratio >= 1e4 ? sci(d.ratio, 1) : whole(d.ratio)} times better. The minority carriers drop to ${sci(minority, 1)} per cm³, because electrons × holes stays at ni² = ${sci(NI_300 * NI_300, 1)}.`}
        </Note>
      </div>
      <Toy>Model: silicon at 300 K, every dopant ionised, n · p = ni² with ni = 1 × 10¹⁰ per cm³, typical textbook mobilities that fall as doping rises. Real wafers differ in detail.</Toy>
    </div>
  );
}

export function Dope({ props, onChange }: WidgetProps<DopeProps>) {
  return props.mode === "calc" ? <Calc props={props} onChange={onChange} /> : <Lattice onChange={onChange} />;
}

/** goal: lattice { electrons, holes, type, minElectrons, minHoles }; calc { type, minRatio, maxRatio, exp, maxRho } */
export function checkDope(state: unknown, goal: Record<string, unknown>) {
  const s = state as DopeLatticeState | DopeCalcState | undefined;
  if (!s) return false;
  if (typeof goal.type === "string" && s.type !== goal.type) return false;
  if (s.mode === "lattice") {
    if (typeof goal.electrons === "number" && s.electrons !== goal.electrons) return false;
    if (typeof goal.holes === "number" && s.holes !== goal.holes) return false;
    if (typeof goal.minElectrons === "number" && s.electrons < goal.minElectrons) return false;
    if (typeof goal.minHoles === "number" && s.holes < goal.minHoles) return false;
    if (typeof goal.minDopants === "number" && s.p + s.b < goal.minDopants) return false;
    return true;
  }
  if (typeof goal.minRatio === "number" && s.ratio < goal.minRatio) return false;
  if (typeof goal.maxRatio === "number" && s.ratio > goal.maxRatio) return false;
  if (typeof goal.exp === "number" && s.exp !== goal.exp) return false;
  if (typeof goal.maxRho === "number" && s.rho > goal.maxRho) return false;
  return true;
}
