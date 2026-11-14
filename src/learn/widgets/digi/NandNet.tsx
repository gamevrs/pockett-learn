"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { BitBtn, Note, Readout, Seg } from "./ui";
import { NAND_NETS, ROWS, evalNand, nandOut, type Bit, type NandMode } from "./sim";

export interface NandNetProps {
  /** which gate to build from NANDs (default "not") */
  mode?: NandMode;
  /** show the selector so the learner can switch between NOT, AND, OR and XOR */
  pick?: boolean;
}

export interface NandNetState {
  mode: NandMode;
  a: Bit;
  b: Bit;
  out: Bit;
  nands: number;
}

const TARGET: Record<NandMode, { name: string; fn: (a: Bit, b: Bit) => Bit }> = {
  not: { name: "NOT A", fn: (a) => (1 - a) as Bit },
  and: { name: "A AND B", fn: (a, b) => (a & b) as Bit },
  or: { name: "A OR B", fn: (a, b) => (a | b) as Bit },
  xor: { name: "A XOR B", fn: (a, b) => (a ^ b) as Bit },
};

const GW = 62;
const GH = 38;

/** Gate-level diagram of a gate built only from NANDs, with live wire values. */
export function NandNet({ props, onChange }: WidgetProps<NandNetProps>) {
  const [mode, setMode] = useState<NandMode>(props.mode ?? "not");
  const [a, setA] = useState<Bit>(0);
  const [b, setB] = useState<Bit>(0);
  const net = NAND_NETS[mode];
  const v = evalNand(mode, a, b);
  const lastId = net[net.length - 1].id;
  const out = v[lastId];
  const report = (m: NandMode, x: Bit, y: Bit) => onChange?.({ mode: m, a: x, b: y, out: nandOut(m, x, y), nands: NAND_NETS[m].length } satisfies NandNetState);

  // layout: depth layers
  const depth: Record<string, number> = { A: 0, B: 0 };
  for (const g of net) depth[g.id] = 1 + Math.max(depth[g.in[0]], depth[g.in[1]]);
  const maxD = Math.max(...net.map((g) => depth[g.id]));
  const H = mode === "xor" ? 190 : mode === "or" ? 150 : 110;
  const pos: Record<string, { x: number; y: number }> = {};
  const usesB = net.some((g) => g.in.includes("B"));
  pos.A = { x: 18, y: usesB ? H * 0.28 : H / 2 };
  pos.B = { x: 18, y: H * 0.72 };
  for (let d = 1; d <= maxD; d++) {
    const layer = net.filter((g) => depth[g.id] === d);
    layer.forEach((g, i) => {
      pos[g.id] = { x: 18 + 26 + (d - 1) * ((360 - 18 - 26 - GW - 56) / Math.max(1, maxD - 1 || 1)), y: ((i + 1) * H) / (layer.length + 1) };
    });
  }
  const wire = (from: string, to: string, slot: 0 | 1) => {
    const f = pos[from];
    const t = pos[to];
    const x1 = from === "A" || from === "B" ? f.x + 18 : f.x + GW;
    const y1 = f.y;
    const x2 = t.x;
    const y2 = t.y + (slot === 0 ? -9 : 9);
    const on = v[from] === 1;
    return <path key={`${from}-${to}-${slot}`} d={`M${x1} ${y1} C${x1 + 22} ${y1} ${x2 - 22} ${y2} ${x2} ${y2}`} fill="none" stroke={on ? "var(--brand)" : "var(--line-strong)"} strokeWidth={on ? 2.4 : 1.6} />;
  };
  const final = pos[lastId];
  const allMatch = ROWS.every(([x, y]) => nandOut(mode, x, y) === TARGET[mode].fn(x, y));
  const toggle = (which: "a" | "b") => {
    const x = which === "a" ? ((1 - a) as Bit) : a;
    const y = which === "b" ? ((1 - b) as Bit) : b;
    setA(x);
    setB(y);
    report(mode, x, y);
  };

  return (
    <div className="w-full" data-widget="digi-nand-net">
      {props.pick && (
        <div className="mb-2 flex justify-center">
          <Seg
            label="Gate to build from NANDs"
            value={mode}
            onChange={(m) => {
              setMode(m);
              report(m, a, b);
            }}
            options={[
              { value: "not", label: "NOT" },
              { value: "and", label: "AND" },
              { value: "or", label: "OR" },
              { value: "xor", label: "XOR" },
            ]}
          />
        </div>
      )}
      <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
        <BitBtn label="A" value={a} onClick={() => toggle("a")} />
        {mode !== "not" && <BitBtn label="B" value={b} onClick={() => toggle("b")} />}
      </div>
      <div className="mx-auto max-w-[26rem] rounded-xl border border-line bg-surface p-1.5">
        <svg viewBox={`0 0 360 ${H}`} role="img" aria-label={`${TARGET[mode].name} built from ${net.length} NAND gate${net.length > 1 ? "s" : ""}. With A = ${a}${mode === "not" ? "" : ` and B = ${b}`} the output is ${out}.`} className="block w-full">
          {net.flatMap((g) => [wire(g.in[0], g.id, 0), wire(g.in[1], g.id, 1)])}
          <path d={`M${final.x + GW} ${final.y} L${340 - 22} ${final.y}`} fill="none" stroke={out ? "var(--brand)" : "var(--line-strong)"} strokeWidth={out ? 2.4 : 1.6} />
          {["A", ...(usesB ? ["B"] : [])].map((n) => (
            <g key={n}>
              <circle cx={pos[n].x + 10} cy={pos[n].y} r={11} fill={v[n] ? "var(--tint)" : "var(--surface-2)"} stroke={v[n] ? "var(--brand)" : "var(--line-strong)"} strokeWidth={1.6} />
              <text x={pos[n].x + 10} y={pos[n].y + 5} textAnchor="middle" fontSize={14} fill="var(--ink)" fontFamily="var(--font-mono, monospace)">
                {n}
              </text>
            </g>
          ))}
          {net.map((g) => {
            const p = pos[g.id];
            const val = v[g.id];
            return (
              <g key={g.id}>
                <rect x={p.x} y={p.y - GH / 2} width={GW} height={GH} rx={9} fill={val ? "var(--tint)" : "var(--surface-2)"} stroke={val ? "var(--brand)" : "var(--line-strong)"} strokeWidth={1.8} />
                <text x={p.x + GW / 2 - 5} y={p.y + 5} textAnchor="middle" fontSize={14} fill="var(--ink)" fontFamily="var(--font-mono, monospace)">
                  NAND
                </text>
                <circle cx={p.x + GW} cy={p.y} r={4} fill="var(--surface)" stroke={val ? "var(--brand)" : "var(--line-strong)"} strokeWidth={1.6} />
              </g>
            );
          })}
          <text x={344} y={final.y + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill="var(--ink)" fontFamily="var(--font-mono, monospace)">
            {out}
          </text>
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="NAND gates used" value={net.length} />
        <Readout label={TARGET[mode].name} value={out} accent />
      </div>
      <div className="mt-3">
        <Note>
          {allMatch ? `Checked against all four input rows: this network of ${net.length} NAND gate${net.length > 1 ? "s" : ""} always matches ${TARGET[mode].name}.` : "Mismatch."} A lit wire carries a 1.
        </Note>
      </div>
    </div>
  );
}

/** goal: any of { mode, a, b, out } */
export function checkNandNet(state: unknown, goal: Record<string, unknown>) {
  const s = state as NandNetState | undefined;
  if (!s) return false;
  for (const k of ["mode", "a", "b", "out"] as const) if (k in goal && s[k] !== goal[k]) return false;
  return Object.keys(goal).length > 0;
}
