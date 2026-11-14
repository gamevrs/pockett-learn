"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Schematic, type PartSpec, type WireSpec } from "../elec-kit/Schematic";
import { solveDC } from "../elec-kit/solve";
import { Btn, Note, Readout, Sch, Seg, ToyNote, ohms, volts } from "./ui";

interface SymbolInfo {
  id: string;
  name: string;
  part: PartSpec;
  what: string;
  real: string;
}

const SYMBOLS: SymbolInfo[] = [
  { id: "battery", name: "Battery", part: { kind: "battery", id: "x", at: [1, 1], label: "" }, what: "The push. The longer line is the + side.", real: "A cell or a battery pack. Several lines mean several cells in a row." },
  { id: "resistor", name: "Resistor", part: { kind: "resistor", id: "x", at: [1, 1] }, what: "Limits the current. The zigzag is the American style; a plain rectangle means the same in Europe.", real: "A small striped cylinder or a tiny black chip on a board." },
  { id: "switch", name: "Switch", part: { kind: "switch", id: "x", at: [1, 1], closed: false }, what: "Opens or closes a gap in the loop. Open: no current.", real: "A button, a toggle, a slider. Anything that makes or breaks a connection." },
  { id: "lamp", name: "Lamp", part: { kind: "lamp", id: "x", at: [1, 1] }, what: "Turns current into light (and heat). A circle with a cross.", real: "A bulb. LEDs have their own symbol, a triangle with a bar." },
  { id: "ground", name: "Ground", part: { kind: "ground", id: "x", at: [2, 0.5] }, what: "The 0 V reference every other voltage is measured from. Also a handy shortcut: every ground symbol is connected to every other.", real: "The negative side of a battery, or a board's ground wire or plane." },
  { id: "led", name: "LED", part: { kind: "led", id: "x", at: [1, 1], on: false }, what: "A one-way light. Current may only go the direction the triangle points.", real: "A little light on a gadget. It needs a resistor in series, which the Analog lessons explain." },
  { id: "capacitor", name: "Capacitor", part: { kind: "capacitor", id: "x", at: [1, 1] }, what: "Two plates close together: it stores a little charge. Two parallel lines.", real: "A small ceramic disc or a canned electrolytic. The next module meets it properly." },
  { id: "source", name: "Voltage source", part: { kind: "dc-source", id: "x", at: [1, 1] }, what: "An ideal supply that holds its voltage. A circle with + and −.", real: "A bench power supply, or a regulator on a board." },
];

export interface SymbolsProps {
  /** Hide the detail panel so a question can ask about the symbols instead. */
  quiz?: boolean;
}

export interface SymbolsState {
  selected: string | null;
}

/** goal: { selected: "ground" } (the id of the symbol the learner tapped). */
export function checkSymbols(state: unknown, goal: Record<string, unknown>) {
  const s = state as SymbolsState | undefined;
  if (!s) return false;
  return typeof goal.selected === "string" && s.selected === goal.selected;
}

/** A symbol gallery: tap a symbol to see its name, what it does and what it looks like for real. */
export function Symbols({ props, onChange }: WidgetProps<SymbolsProps>) {
  const [sel, setSel] = useState<string | null>(null);
  const info = SYMBOLS.find((s) => s.id === sel);
  const hide = !!props.quiz;
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Schematic symbols">
        {SYMBOLS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={sel === s.id}
            aria-label={hide ? `Symbol ${SYMBOLS.indexOf(s) + 1}` : s.name}
            onClick={() => {
              setSel(s.id);
              onChange?.({ selected: s.id } satisfies SymbolsState);
            }}
            className={`flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 transition-colors ${sel === s.id ? "border-[var(--brand)] bg-tint" : "border-line bg-surface hover:bg-surface-2"}`}
          >
            <Schematic cols={4} rows={2.2} className="h-10 w-20" animate={false} ariaLabel={s.name} parts={[{ ...s.part, at: s.id === "ground" ? [2, 0.4] : [0.5, 1] }]} />
            {!hide && <span className="text-xs font-medium text-ink">{s.name}</span>}
          </button>
        ))}
      </div>
      <div className="mt-3">
        {info && !hide ? (
          <Note tone="accent">
            <strong>{info.name}.</strong> {info.what} <span className="text-ink-2">In real life: {info.real}</span>
          </Note>
        ) : (
          <Note>{hide ? "Tap the symbol that answers the question." : "Tap a symbol to meet it."}</Note>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── nets ───────────────────────── */

export interface NetsState {
  net: "top" | "mid" | "gnd" | null;
  groundSymbols: boolean;
  /** voltage of the chosen net, volts */
  volts: number | null;
}

/** goal: { net: "mid" }, { groundSymbols: true }. */
export function checkNets(state: unknown, goal: Record<string, unknown>) {
  const s = state as NetsState | undefined;
  if (!s) return false;
  if (typeof goal.net === "string" && s.net !== goal.net) return false;
  if (typeof goal.groundSymbols === "boolean" && s.groundSymbols !== goal.groundSymbols) return false;
  return true;
}

const NET_NAME = { top: "The + rail", mid: "The middle", gnd: "Ground" } as const;

/** Wires with the same electrical connection form a net, and every point on a net is at the same voltage. Pick a net to light it up. */
export function Nets({ onChange }: WidgetProps<Record<string, never>>) {
  const [net, setNet] = useState<NetsState["net"]>(null);
  const [gs, setGs] = useState(false);

  const sol = solveDC([
    { kind: "V", id: "B1", a: "top", b: "gnd", volts: 9 },
    { kind: "R", id: "R1", a: "top", b: "mid", ohms: 1000 },
    { kind: "R", id: "R2", a: "mid", b: "gnd", ohms: 2000 },
  ]);
  const v = sol.ok ? sol.v : { top: 9, mid: 6, gnd: 0 };
  const emit = (n: NetsState["net"], g: boolean) => onChange?.({ net: n, groundSymbols: g, volts: n ? v[n] : null } satisfies NetsState);
  const hl = (n: "top" | "mid" | "gnd") => net === n;

  const parts: PartSpec[] = [
    { kind: "battery", id: "B1", at: [3, 3], rot: 90, label: "B1", value: "9 V" },
    { kind: "resistor", id: "R1", at: [6, 2], label: "R1", value: ohms(1000) },
    { kind: "resistor", id: "R2", at: [12, 3], rot: 90, label: "R2", value: ohms(2000) },
  ];
  const wires: WireSpec[] = [
    { points: ["B1.a", [3, 2], "R1.a"], highlight: hl("top") },
    { points: ["R1.b", [12, 2], "R2.a"], highlight: hl("mid") },
  ];
  if (gs) {
    parts.push({ kind: "ground", id: "G1", at: [3, 6], highlight: hl("gnd") }, { kind: "ground", id: "G2", at: [12, 6], highlight: hl("gnd") });
  } else {
    wires.push({ points: ["R2.b", [12, 7], [3, 7], "B1.b"], highlight: hl("gnd") });
  }
  const label = (n: "top" | "mid" | "gnd") => (net === n ? `${NET_NAME[n]}: ${volts(v[n])}` : "");

  return (
    <div className="w-full">
      <Sch
        cols={18}
        rows={9}
        ariaLabel={`A 9 volt battery feeding two resistors in series. ${gs ? "Ground symbols stand in for the return wire." : "A wire returns to the battery."} ${net ? `${NET_NAME[net]} is lit: ${volts(v[net])}.` : ""}`}
        parts={parts}
        wires={wires}
        texts={net ? [{ at: [1, 8.6], text: label(net), anchor: "start" }] : []}
      />
      <div className="mt-2 flex flex-col items-center gap-2">
        <Seg
          label="Which net"
          value={net ?? "none"}
          options={[
            { value: "top", label: "+ rail" },
            { value: "mid", label: "Middle" },
            { value: "gnd", label: "Ground" },
          ]}
          onChange={(n) => {
            setNet(n as "top" | "mid" | "gnd");
            emit(n as "top" | "mid" | "gnd", gs);
          }}
        />
        <Btn
          on={gs}
          label={gs ? "Draw the return wire instead of ground symbols" : "Replace the return wire with ground symbols"}
          onClick={() => {
            setGs(!gs);
            emit(net, !gs);
          }}
        >
          {gs ? "Ground symbols: on" : "Ground symbols: off"}
        </Btn>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {(["top", "mid", "gnd"] as const).map((n) => (
          <Readout key={n} label={NET_NAME[n]} value={net === n ? volts(v[n]) : "tap to see"} accent={net === n} />
        ))}
      </div>
      <div className="mt-2">
        <Note>
          {gs
            ? "Both ground symbols mean the same net, so no wire is needed between them. Schematics use this to stay tidy."
            : "A wire joins everything it touches into one net: every point on it is at the same voltage."}
        </Note>
      </div>
      <ToyNote />
    </div>
  );
}
