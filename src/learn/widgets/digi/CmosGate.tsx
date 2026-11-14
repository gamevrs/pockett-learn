"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { BitBtn, Note, Readout, Seg } from "./ui";
import { cmosName, cmosRow, cmosTable, type Bit, type Network } from "./sim";

export interface CmosGateProps {
  /** starting networks */
  pu?: Network;
  pd?: Network;
}

export interface CmosGateState {
  pu: Network;
  pd: Network;
  a: Bit;
  b: Bit;
  /** "NAND" | "NOR" | "short" | "float" for the whole table */
  name: "NAND" | "NOR" | "short" | "float";
  /** result of the CURRENT row */
  result: "1" | "0" | "short" | "float";
}

const BW = 84;
const BH = 30;

function Box({ cx, y, label, on }: { cx: number; y: number; label: string; on: boolean }) {
  return (
    <g>
      <rect x={cx - BW / 2} y={y} width={BW} height={BH} rx={8} fill={on ? "var(--tint)" : "var(--surface-2)"} stroke={on ? "var(--brand)" : "var(--line-strong)"} strokeWidth={on ? 2.4 : 1.4} />
      <text x={cx} y={y + BH / 2 + 5} textAnchor="middle" fontSize={14} fill={on ? "var(--ink)" : "var(--ink-3)"} fontFamily="var(--font-mono, monospace)">
        {label}
      </text>
    </g>
  );
}

/** One network (two switches in series or parallel) between a rail (y = 16 or 276) and the output node (y = 146). */
function Net({ kind, up, aOn, bOn, conducts }: { kind: Network; up: boolean; aOn: boolean; bOn: boolean; conducts: boolean }) {
  const f = (y: number) => (up ? y : 292 - y);
  const col = conducts ? "var(--brand)" : "var(--line-strong)";
  const sw = conducts ? 2.6 : 1.6;
  const fam = up ? "P" : "N";
  const rail = f(16);
  const out = 146;
  const line = (x1: number, y1: number, x2: number, y2: number) => <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={sw} strokeLinecap="round" />;
  if (kind === "series") {
    const b1 = up ? 38 : 292 - 38 - BH;
    const b2 = up ? 92 : 292 - 92 - BH;
    return (
      <g>
        {line(180, rail, 180, f(38))}
        <Box cx={180} y={b1} label={`${fam}: A ${aOn ? "on" : "off"}`} on={aOn} />
        {line(180, f(68), 180, f(92))}
        <Box cx={180} y={b2} label={`${fam}: B ${bOn ? "on" : "off"}`} on={bOn} />
        {line(180, f(122), 180, out)}
      </g>
    );
  }
  const by = up ? 62 : 292 - 62 - BH;
  return (
    <g>
      {line(180, rail, 180, f(40))}
      {line(110, f(40), 250, f(40))}
      {line(110, f(40), 110, f(62))}
      {line(250, f(40), 250, f(62))}
      <Box cx={110} y={by} label={`${fam}: A ${aOn ? "on" : "off"}`} on={aOn} />
      <Box cx={250} y={by} label={`${fam}: B ${bOn ? "on" : "off"}`} on={bOn} />
      {line(110, f(92), 110, f(114))}
      {line(250, f(92), 250, f(114))}
      {line(110, f(114), 250, f(114))}
      {line(180, f(114), 180, out)}
    </g>
  );
}

/** Build a two-input CMOS gate from a pull-up and a pull-down network; see its truth table and any short circuit. */
export function CmosGate({ props, onChange }: WidgetProps<CmosGateProps>) {
  const [pu, setPu] = useState<Network>(props.pu ?? "parallel");
  const [pd, setPd] = useState<Network>(props.pd ?? "parallel");
  const [a, setA] = useState<Bit>(0);
  const [b, setB] = useState<Bit>(0);
  const cur = cmosRow(pu, pd, a, b);
  const name = cmosName(pu, pd);
  const table = cmosTable(pu, pd);
  const report = (p: Network, d: Network, x: Bit, y: Bit) => onChange?.({ pu: p, pd: d, a: x, b: y, name: cmosName(p, d), result: cmosRow(p, d, x, y).result } satisfies CmosGateState);
  const shortRow = table.find((r) => r.result === "short");
  const floatRow = table.find((r) => r.result === "float");
  const outTxt = cur.result === "short" ? "SHORT" : cur.result === "float" ? "floats" : cur.result;
  const outColour = cur.result === "short" ? "var(--bad)" : "var(--brand)";

  return (
    <div className="w-full" data-widget="digi-cmos-gate">
      <div className="mb-2 grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col items-start gap-1">
          <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-3">Pull-up (the two PMOS)</span>
          <Seg
            label="Pull-up network"
            value={pu}
            onChange={(v) => {
              setPu(v);
              report(v, pd, a, b);
            }}
            options={[
              { value: "parallel", label: "In parallel" },
              { value: "series", label: "In series" },
            ]}
          />
        </div>
        <div className="flex flex-col items-start gap-1">
          <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-3">Pull-down (the two NMOS)</span>
          <Seg
            label="Pull-down network"
            value={pd}
            onChange={(v) => {
              setPd(v);
              report(pu, v, a, b);
            }}
            options={[
              { value: "series", label: "In series" },
              { value: "parallel", label: "In parallel" },
            ]}
          />
        </div>
      </div>
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <BitBtn
          label="A"
          value={a}
          onClick={() => {
            const x = (1 - a) as Bit;
            setA(x);
            report(pu, pd, x, b);
          }}
        />
        <BitBtn
          label="B"
          value={b}
          onClick={() => {
            const y = (1 - b) as Bit;
            setB(y);
            report(pu, pd, a, y);
          }}
        />
      </div>
      <div className="mx-auto max-w-[26rem] rounded-xl border border-line bg-surface p-1.5">
        <svg viewBox="0 0 360 292" role="img" aria-label={`Pull-up network of two PMOS ${pu === "series" ? "in series" : "in parallel"} above the output, pull-down network of two NMOS ${pd === "series" ? "in series" : "in parallel"} below it. With A = ${a} and B = ${b} the pull-up ${cur.pullUp ? "conducts" : "does not conduct"} and the pull-down ${cur.pullDown ? "conducts" : "does not conduct"}.`} className="block w-full">
          <line x1={30} y1={16} x2={330} y2={16} stroke="var(--ink)" strokeWidth={2} />
          <text x={34} y={12} fontSize={14} fill="var(--ink-2)" fontFamily="var(--font-mono, monospace)">VDD</text>
          <line x1={30} y1={276} x2={330} y2={276} stroke="var(--ink)" strokeWidth={2} />
          <text x={34} y={290} fontSize={14} fill="var(--ink-2)" fontFamily="var(--font-mono, monospace)">GND</text>
          <Net kind={pu} up aOn={cur.pA} bOn={cur.pB} conducts={cur.pullUp} />
          <Net kind={pd} up={false} aOn={cur.nA} bOn={cur.nB} conducts={cur.pullDown} />
          <circle cx={180} cy={146} r={5} fill={outColour} />
          <line x1={180} y1={146} x2={300} y2={146} stroke={outColour} strokeWidth={2} />
          <text x={304} y={151} fontSize={14} fill="var(--ink)" fontFamily="var(--font-mono, monospace)">OUT</text>
          <text x={188} y={138} fontSize={14} fill={outColour} fontFamily="var(--font-mono, monospace)" fontWeight={700}>
            {outTxt}
          </text>
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Pull-up" value={cur.pullUp ? "conducts" : "open"} />
        <Readout label="Pull-down" value={cur.pullDown ? "conducts" : "open"} />
        <Readout label="This gate is" value={name === "short" ? "not a gate (shorts)" : name === "float" ? "not a gate (floats)" : name} accent />
      </div>
      <details className="mt-3 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink-2" open>
        <summary className="min-h-10 cursor-pointer py-2 text-ink">Truth table of what you built</summary>
        <table className="mt-1 w-full text-center font-mono text-xs">
          <thead className="text-ink-3">
            <tr>
              <th>A</th>
              <th>B</th>
              <th>Pull-up</th>
              <th>Pull-down</th>
              <th>OUT</th>
            </tr>
          </thead>
          <tbody>
            {table.map((r) => (
              <tr key={`${r.a}${r.b}`} className={r.a === a && r.b === b ? "bg-tint font-semibold text-ink" : "text-ink-2"}>
                <td>{r.a}</td>
                <td>{r.b}</td>
                <td>{r.pullUp ? "on" : "off"}</td>
                <td>{r.pullDown ? "on" : "off"}</td>
                <td>{r.result === "short" ? "SHORT" : r.result === "float" ? "float" : r.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <div className="mt-3">
        <Note tone={shortRow ? "accent" : "plain"}>
          {shortRow
            ? `Short circuit when A = ${shortRow.a} and B = ${shortRow.b}: the pull-up and the pull-down both conduct, so current runs from VDD straight to ground. A real gate must never do this.`
            : floatRow
              ? `Floating output when A = ${floatRow.a} and B = ${floatRow.b}: neither network conducts, so the output is connected to nothing. A real gate must always drive its output.`
              : `A working gate: in every row exactly one network conducts. This one is a ${name}.`}
        </Note>
      </div>
      <p className="mt-2 text-center text-xs text-ink-3">Toy model: ideal switches. A PMOS conducts when its input is 0, an NMOS when its input is 1.</p>
    </div>
  );
}

/** goal: any of { name, pu, pd, result } */
export function checkCmosGate(state: unknown, goal: Record<string, unknown>) {
  const s = state as CmosGateState | undefined;
  if (!s) return false;
  for (const k of ["name", "pu", "pd", "result", "a", "b"] as const) if (k in goal && s[k] !== goal[k]) return false;
  return Object.keys(goal).length > 0;
}
