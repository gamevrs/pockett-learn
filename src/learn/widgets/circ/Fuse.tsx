"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { shortCircuit } from "./logic";
import { Btn, Note, Readout, Sch, Seg, ToyNote, amps, ohms, watts } from "./ui";

const LOADS = [
  { id: "lamp", label: "Lamp", r: 24 },
  { id: "motor", label: "Motor", r: 6 },
  { id: "stuck", label: "Stuck motor", r: 1 },
  { id: "short", label: "Short circuit", r: 0.02 },
] as const;
const FUSES = [
  { id: "none", label: "No fuse", a: null },
  { id: "1", label: "1 A", a: 1 },
  { id: "2", label: "2 A", a: 2 },
  { id: "5", label: "5 A", a: 5 },
] as const;

const VOC = 12;
const RI = 0.1;

export interface FuseProps {
  load?: (typeof LOADS)[number]["id"];
  fuse?: (typeof FUSES)[number]["id"];
}

export interface FuseState {
  load: string;
  fuse: string;
  connected: boolean;
  blown: boolean;
  everBlown: boolean;
  /** current that flowed (the would-be current if the fuse is blown) */
  amps: number;
}

/** goal: { blown }, { everBlown }, { load }, { fuse }, { connected }. */
export function checkFuse(state: unknown, goal: Record<string, unknown>) {
  const s = state as FuseState | undefined;
  if (!s) return false;
  const g = goal as { blown?: boolean; everBlown?: boolean; load?: string; fuse?: string; connected?: boolean };
  if (g.blown !== undefined && s.blown !== g.blown) return false;
  if (g.everBlown !== undefined && s.everBlown !== g.everBlown) return false;
  if (g.load !== undefined && s.load !== g.load) return false;
  if (g.fuse !== undefined && s.fuse !== g.fuse) return false;
  if (g.connected !== undefined && s.connected !== g.connected) return false;
  return true;
}

/** A 12 V battery with a little resistance inside, a fuse and a load. Connect a load that pulls too much and the fuse opens (or, with no fuse, the heat has nowhere to go). */
export function Fuse({ props, onChange }: WidgetProps<FuseProps>) {
  const [loadId, setLoadId] = useState<string>(props.load ?? "lamp");
  const [fuseId, setFuseId] = useState<string>(props.fuse ?? "2");
  const [connected, setConnected] = useState(false);
  const [blown, setBlown] = useState(false);
  const [everBlown, setEverBlown] = useState(false);

  const load = LOADS.find((l) => l.id === loadId) ?? LOADS[0];
  const fuse = FUSES.find((f) => f.id === fuseId) ?? FUSES[1];
  const sc = shortCircuit(VOC, RI, load.r, fuse.a);
  const live = connected && !blown;
  const flowing = live;

  const emit = (patch: Partial<{ l: string; f: string; c: boolean; b: boolean; e: boolean }>) => {
    const n = { l: loadId, f: fuseId, c: connected, b: blown, e: everBlown, ...patch };
    const ld = LOADS.find((x) => x.id === n.l) ?? LOADS[0];
    const fu = FUSES.find((x) => x.id === n.f) ?? FUSES[1];
    onChange?.({ load: n.l, fuse: n.f, connected: n.c, blown: n.b, everBlown: n.e, amps: shortCircuit(VOC, RI, ld.r, fu.a).i } satisfies FuseState);
  };
  /** Try to connect or change something; a fuse that sees too much current opens straight away. */
  const apply = (l: string, f: string, c: boolean) => {
    const ld = LOADS.find((x) => x.id === l) ?? LOADS[0];
    const fu = FUSES.find((x) => x.id === f) ?? FUSES[1];
    const s = shortCircuit(VOC, RI, ld.r, fu.a);
    const nowBlown = blown || (c && s.blown);
    setLoadId(l);
    setFuseId(f);
    setConnected(c);
    if (nowBlown && !blown) setBlown(true);
    const e = everBlown || (nowBlown && !blown);
    if (e !== everBlown) setEverBlown(e);
    emit({ l, f, c, b: nowBlown, e });
  };

  const flow = flowing ? Math.sqrt(sc.i) : 0;
  const danger = connected && !blown && sc.i > 5;
  const note = blown
    ? `The fuse opened: the current would have been ${amps(sc.i)}, over its ${fuse.label} rating. The circuit is now safely dead. Replace the fuse after you remove the fault.`
    : !connected
      ? "Nothing is connected yet. Pick a load and connect it."
      : fuse.a === null && sc.i > 5
        ? `No fuse: ${amps(sc.i)} flows, and ${watts(sc.lostInCell)} is dumped as heat inside the battery and its wiring. In real life that means hot wires, a melted battery or a fire.`
        : `${amps(sc.i)} flows, which the circuit can handle.`;

  return (
    <div className="w-full">
      <Sch
        cols={18}
        rows={9}
        flowRef={Math.sqrt(2)}
        ariaLabel={`A 12 volt battery with ${ohms(RI)} inside, a ${fuse.label} fuse and a ${load.label} load of ${ohms(load.r)}. ${blown ? "The fuse has blown." : connected ? `${amps(sc.i)} flows.` : "The load is disconnected."}`}
        parts={[
          { kind: "battery", id: "B1", at: [3, 3], rot: 90, label: "12 V cell", value: `Ri ${ohms(RI)}` },
          { kind: "resistor", id: "F1", at: [6, 2], label: "Fuse", value: fuse.a === null ? "none" : fuse.label, variant: "box", highlight: blown },
          { kind: "resistor", id: "RL", at: [12, 3], rot: 90, label: load.label, value: ohms(load.r), highlight: danger },
        ]}
        wires={[
          { points: ["B1.a", [3, 2], "F1.a"], flow },
          { points: ["F1.b", [12, 2], "RL.a"], flow },
          { points: ["RL.b", [12, 7], [3, 7], "B1.b"], flow },
        ]}
        overlay={
          blown ? (
            <g stroke="var(--bad)" strokeWidth={3} strokeLinecap="round">
              <line x1={146} y1={20} x2={166} y2={60} />
              <line x1={166} y1={20} x2={146} y2={60} />
            </g>
          ) : undefined
        }
      />
      <div className="mt-2 flex flex-col items-center gap-2">
        <Seg label="Load" value={loadId} options={LOADS.map((l) => ({ value: l.id, label: l.label }))} onChange={(l) => apply(l, fuseId, connected)} />
        <Seg label="Fuse" value={fuseId} options={FUSES.map((f) => ({ value: f.id, label: f.label }))} onChange={(f) => apply(loadId, f, connected)} />
        <div className="flex flex-wrap justify-center gap-2">
          <Btn on={connected} label={connected ? "Disconnect the load" : "Connect the load"} onClick={() => apply(loadId, fuseId, !connected)}>
            {connected ? "Load: connected" : "Load: disconnected"}
          </Btn>
          {blown && (
            <Btn
              label="Replace the fuse"
              onClick={() => {
                setBlown(false);
                setConnected(false);
                emit({ b: false, c: false });
              }}
            >
              Replace fuse
            </Btn>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Readout label="Would draw" value={amps(sc.i)} accent />
        <Readout label="Fuse" value={fuse.a === null ? "none" : blown ? "blown" : "intact"} />
        <Readout label="Heat in battery" value={blown || !connected ? "0 W" : watts(sc.lostInCell)} />
      </div>
      <div className="mt-2">
        <Note tone={blown ? "good" : danger || (fuse.a === null && connected && sc.i > 5) ? "bad" : "neutral"}>{note}</Note>
      </div>
      <ToyNote>
        A toy model: a 12 V pack with a typical {ohms(RI)} inside, and a fuse that opens the moment the current passes its rating. Real fuses take longer for small overloads (check a datasheet), and a real short can reach even higher currents.
      </ToyNote>
      <p className="mt-1 text-center text-xs text-ink-3">Safety: never short a real battery to test this. Lithium packs especially can overheat and burn.</p>
    </div>
  );
}
