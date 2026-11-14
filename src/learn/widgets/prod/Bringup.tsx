"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Schematic } from "../elec-kit/Schematic";
import { solveDC, type DcElement } from "../elec-kit/solve";
import { formatSI } from "../elec-kit/format";
import { SUPPLY_V, board, regulatorOut, supplyResponse, type Fault } from "./logic";
import { Btn, Caption, Note, Readout, Seg, Toy } from "./ui";

export interface BringupProps {
  /** Which mystery boards to offer, in order. Default: all four. */
  boards?: Fault[];
}

export interface BringupState {
  board: Fault;
  powered: boolean;
  limitMa: number;
  solved: Fault[];
  /** true if the learner ever powered the short with no useful current limit */
  overdrove: boolean;
}

const ORDER: Fault[] = ["wrongreg", "good", "short", "noclock"];
const LIMITS = [
  { value: 10, label: "10 mA" },
  { value: 50, label: "50 mA" },
  { value: 500, label: "500 mA" },
  { value: 3000, label: "No limit (3 A)" },
];

const PROBES: { id: string; label: string; need: "off" | "on" }[] = [
  { id: "rtg", label: "Ω: 3V3 rail to ground", need: "off" },
  { id: "fb", label: "Ω: regulator resistors R1, R2", need: "off" },
  { id: "rail", label: "V: 3V3 rail", need: "on" },
  { id: "xtal", label: "Scope: crystal pin", need: "on" },
  { id: "swd", label: "Debugger: connect (SWD)", need: "on" },
];

const DIAG: { value: Fault; label: string }[] = [
  { value: "short", label: "Short on the 3V3 rail" },
  { value: "wrongreg", label: "Wrong regulator voltage" },
  { value: "noclock", label: "Crystal not oscillating" },
  { value: "good", label: "Board is fine" },
];

const FAULT_NAME: Record<Fault, string> = {
  good: "a healthy board",
  short: "a short on the 3V3 rail",
  wrongreg: "wrong feedback resistors on the regulator (1.6 V instead of 3.3 V)",
  noclock: "a crystal that is not oscillating",
};

/** A bench bring-up of mystery Sprout boards: set a current limit, power on, read the supply, probe, and diagnose. */
export function Bringup({ props, onChange }: WidgetProps<BringupProps>) {
  const boards = props.boards ?? ORDER;
  const [idx, setIdx] = useState(0);
  const [limitMa, setLimitMa] = useState(50);
  const [powered, setPowered] = useState(false);
  const [readings, setReadings] = useState<Record<string, string>>({});
  const [verdict, setVerdict] = useState<string>("");
  const [solved, setSolved] = useState<Fault[]>([]);
  const [overdrove, setOverdrove] = useState(false);
  const [diag, setDiag] = useState<Fault | null>(null);

  const fault = boards[idx];
  const b = board(fault);
  const sup = supplyResponse(SUPPLY_V, limitMa, b.loadOhms);
  const emit = (f: Fault, pw: boolean, lim: number, sv: Fault[], od: boolean) => onChange?.({ board: f, powered: pw, limitMa: lim, solved: sv, overdrove: od } satisfies BringupState);

  // the electrical picture, solved with the shared DC solver: a voltage source, or a current source when the supply is in current limit
  const elements: DcElement[] = [
    sup.mode === "CV" ? { kind: "V", id: "PSU", a: "top", b: "gnd", volts: SUPPLY_V } : { kind: "I", id: "PSU", a: "gnd", b: "top", amps: sup.amps },
    { kind: "R", id: "BOARD", a: "top", b: "gnd", ohms: b.loadOhms },
  ];
  const sol = powered ? solveDC(elements) : null;
  const vTop = sol && sol.ok ? sol.v.top : 0;
  const iBoard = sol && sol.ok ? sol.el.BOARD.i : 0;
  const power = iBoard * iBoard * b.loadOhms;

  const resetBoard = (i: number) => {
    setIdx(i);
    setPowered(false);
    setReadings({});
    setVerdict("");
    setDiag(null);
  };

  const togglePower = () => {
    const next = !powered;
    setPowered(next);
    let od = overdrove;
    if (next && sup.wanted > 1 && limitMa >= 500) od = true;
    setOverdrove(od);
    emit(fault, next, limitMa, solved, od);
  };

  const probe = (id: string, need: "off" | "on") => {
    if (need === "on" && !powered) return setReadings((r) => ({ ...r, [id]: "Power the board first." }));
    if (need === "off" && powered) return setReadings((r) => ({ ...r, [id]: "Power it off first: a resistance reading on a live board is meaningless and can upset the meter." }));
    let text = "";
    switch (id) {
      case "rtg":
        text = `Resistance 3V3 to GND: ${b.railToGnd}${fault === "short" ? ". That is a dead short." : ""}`;
        break;
      case "fb":
        text = `R1 = ${formatSI(b.r1, "Ω")}, R2 = ${formatSI(b.r2, "Ω")}. The regulator makes Vout = 0.8 V × (1 + R1/R2) = ${formatSI(regulatorOut(b.r1, b.r2), "V")} (0.8 V is a typical reference; check the datasheet).`;
        break;
      case "rail":
        text = fault === "short" ? `3V3 rail: ${formatSI(vTop, "V")}. The supply is holding the rail down.` : `3V3 rail: ${formatSI(regulatorOut(b.r1, b.r2), "V")}.`;
        break;
      case "xtal":
        text =
          fault === "noclock"
            ? "Flat line near 1.6 V: the crystal is not oscillating."
            : fault === "short"
              ? "Nothing: the chip has no supply."
              : fault === "wrongreg"
                ? "A weak, small oscillation at about 32 MHz."
                : "A steady oscillation at 32 MHz.";
        break;
      case "swd":
        text =
          fault === "good"
            ? "Connected. Chip ID read, firmware loaded, LED blinks."
            : fault === "noclock"
              ? "Connects and reads the chip ID, but the core never runs: a clock-failure flag is set."
              : fault === "wrongreg"
                ? "Target voltage reads 1.60 V, below the MCU's minimum supply (typically 1.8 V; check the datasheet). Connection is unreliable."
                : "No target voltage seen. Cannot connect.";
        break;
    }
    setReadings((r) => ({ ...r, [id]: text }));
  };

  const submit = () => {
    if (diag === null) return;
    if (diag === fault) {
      const sv = solved.includes(fault) ? solved : [...solved, fault];
      setSolved(sv);
      setVerdict(`Correct: this board has ${FAULT_NAME[fault]}.`);
      emit(fault, powered, limitMa, sv, overdrove);
    } else {
      setVerdict("Not this one. Check your readings against what a good board would show.");
    }
  };

  const supplyText =
    !powered ? "Off" : sup.mode === "CV" ? `Constant voltage: ${formatSI(SUPPLY_V, "V")}, ${formatSI(sup.amps, "A")}` : `CURRENT LIMIT: ${formatSI(vTop, "V")}, ${formatSI(sup.amps, "A")}`;
  const flow = powered ? iBoard : 0;
  const unsafe = powered && fault === "short" && limitMa >= 500;

  return (
    <div className="w-full" data-widget>
      <Seg label="Mystery board" value={idx} onChange={resetBoard} options={boards.map((_, i) => ({ value: i, label: `Board ${i + 1}${solved.includes(boards[i]) ? " ✓" : ""}` }))} />

      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <Schematic
          cols={18}
          rows={7}
          ariaLabel={`A bench supply set to 3.0 volts feeds the board, which acts like a ${formatSI(b.loadOhms, "Ω")} resistor. The supply is ${powered ? "on" : "off"}.`}
          parts={[
            { kind: "dc-source", id: "PSU", at: [3, 2], rot: 90, label: "Supply", value: "3.0 V" },
            { kind: "resistor", id: "BRD", at: [14, 2], rot: 90, label: "Board", value: powered ? formatSI(b.loadOhms, "Ω") : "?" },
          ]}
          wires={[
            { points: ["PSU.a", [3, 1], [14, 1], "BRD.a"], flow },
            { points: ["BRD.b", [14, 6], [3, 6], "PSU.b"], flow },
          ]}
          texts={[{ at: [9, 6.8], text: "0 V", anchor: "middle", muted: true }]}
        />
      </div>

      <div className="mt-3 space-y-3">
        <div>
          <Caption>Supply current limit</Caption>
          <Seg label="Supply current limit" value={limitMa} onChange={(v) => { setLimitMa(v); setPowered(false); emit(fault, false, v, solved, overdrove); }} options={LIMITS} className="mt-1" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn primary={!powered} on={powered} onClick={togglePower}>
            {powered ? "Power off" : "Power on"}
          </Btn>
          <Readout label="Supply" value={supplyText} accent={powered && sup.mode === "CC"} />
        </div>
        {unsafe && (
          <Note tone="accent">
            With almost no limit, a {formatSI(b.loadOhms, "Ω")} short pulls whatever the supply can give: about {power.toFixed(1)} W of heat in a pinhead-sized spot. Traces lift, parts crack. Always start low.
          </Note>
        )}
        {powered && sup.mode === "CC" && !unsafe && (
          <Note>The board wants {formatSI(sup.wanted, "A")} but the supply only allows {formatSI(sup.amps, "A")}, so the voltage collapses to {formatSI(vTop, "V")}. The limit just saved the board.</Note>
        )}
      </div>

      <div className="mt-3">
        <Caption>Probe it</Caption>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {PROBES.map((p) => (
            <Btn key={p.id} onClick={() => probe(p.id, p.need)} className="!px-3 text-xs">
              {p.label}
            </Btn>
          ))}
        </div>
        {Object.keys(readings).length > 0 && (
          <ul className="mt-2 space-y-1 rounded-xl border border-line bg-surface-2 p-3 text-[0.84rem] leading-snug text-ink-2" aria-live="polite">
            {PROBES.filter((p) => readings[p.id]).map((p) => (
              <li key={p.id}>
                <strong className="text-ink">{p.label}:</strong> {readings[p.id]}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3">
        <Caption>Your diagnosis for Board {idx + 1}</Caption>
        <Seg label="Diagnosis" value={diag ?? ("none" as Fault)} onChange={(v) => setDiag(v)} options={DIAG} className="mt-1" />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Btn primary onClick={submit} disabled={diag === null}>
            Submit diagnosis
          </Btn>
          {verdict && <span className="text-[0.86rem] text-ink-2" aria-live="polite">{verdict}</span>}
        </div>
      </div>
      <Toy>A toy bench: the board is modelled as one resistor, the supply as an ideal source with a current limit, and the readings are example values. Real boards draw current in bursts and have capacitors that charge on power-up.</Toy>
    </div>
  );
}

/** goal: { solved: [fault ids] } and/or { limitedFirst: true } (never overdrove). */
export function checkBringup(state: unknown, goal: Record<string, unknown>) {
  const s = state as BringupState | undefined;
  if (!s) return false;
  if (Array.isArray(goal.solved)) for (const f of goal.solved) if (!s.solved.includes(f as Fault)) return false;
  if (goal.safe === true && s.overdrove) return false;
  return true;
}
