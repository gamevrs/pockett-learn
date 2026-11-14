"use client";

import React, { useMemo, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Schematic, type WireSpec } from "../elec-kit/Schematic";
import {
  Btn,
  Caption,
  Note,
  Plot,
  Readout,
  SECOND,
  Slider,
  ToyNote,
  formatSI,
} from "./ui";
import {
  RC_C_VALUES,
  RC_R_VALUES,
  RC_SPAN,
  rcCurve,
  type RcMode,
} from "./rcsim";

export interface RcScopeProps {
  /** Starting resistance, ohms (snaps to the nearest slider stop). */
  r?: number;
  /** Starting capacitance, farads (snaps to the nearest slider stop). */
  c?: number;
  /** Supply voltage. Default 5. */
  vs?: number;
  mode?: RcMode;
  /** Which controls to lock: "r", "c" and/or "mode". */
  lock?: ("r" | "c" | "mode")[];
  /** Hide the table of voltages at 1τ … 5τ. */
  hideTable?: boolean;
}

export interface RcScopeState {
  r: number;
  c: number;
  tau: number;
  mode: RcMode;
  vs: number;
  /** cursor position in time constants */
  cursor: number;
  /** capacitor voltage at the cursor */
  v: number;
}

const nearest = (list: number[], x: number) =>
  list.reduce(
    (best, v, i) =>
      Math.abs(Math.log(v / x)) < Math.abs(Math.log(list[best] / x)) ? i : best,
    0,
  );
const pct = (x: number) => `${x.toFixed(1)}%`;

/** RC charge/discharge scope: pick R and C, flip the switch, drag the cursor and read the capacitor voltage against time. */
export function RcScope({
  props,
  onChange,
  status,
  goal,
}: WidgetProps<RcScopeProps>) {
  const vs = props.vs ?? 5;
  const lock = props.lock ?? [];
  const [ri, setRi] = useState(() => nearest(RC_R_VALUES, props.r ?? 10000));
  const [ci, setCi] = useState(() => nearest(RC_C_VALUES, props.c ?? 10e-6));
  const [mode, setMode] = useState<RcMode>(props.mode ?? "charge");
  const [cursor, setCursor] = useState(1);

  const r = RC_R_VALUES[ri];
  const c = RC_C_VALUES[ci];
  const tau = r * c;
  const curve = useMemo(() => rcCurve(r, c, vs, mode), [r, c, vs, mode]);

  const report = (nr: number, nc: number, nm: RcMode, cur: number) => {
    const cv = rcCurve(nr, nc, vs, nm);
    onChange?.({
      r: nr,
      c: nc,
      tau: nr * nc,
      mode: nm,
      vs,
      cursor: cur,
      v: cv ? cv.at(cur * nr * nc) : NaN,
    } satisfies RcScopeState);
  };
  const setAll = (nri: number, nci: number, nm: RcMode, cur: number) => {
    setRi(nri);
    setCi(nci);
    setMode(nm);
    setCursor(cur);
    report(RC_R_VALUES[nri], RC_C_VALUES[nci], nm, cur);
  };

  if (!curve)
    return <Note>The simulation could not run with these values.</Note>;

  const tc = cursor * tau;
  const vc = curve.at(tc);
  const ic = curve.atI(tc);
  const i0 = vs / r;
  const charging = mode === "charge";
  const flowOn = Math.abs(ic) > i0 * 0.01;
  const flow = flowOn ? ic / i0 : 0;
  const guide = charging ? 0.632 : 0.368;
  const goalTau =
    status === "revealed" && typeof goal?.tau === "number" ? goal.tau : null;

  const wires: WireSpec[] = [
    { points: ["B1.a", "S1.a"], flow: charging ? flow : 0 },
    { points: ["S1.b", "R1.a"], flow },
    { points: ["S1.b", "S2.a"], flow: charging ? 0 : -flow },
    { points: ["R1.b", "C1.a"], flow },
    { points: ["S2.b", [7, 7]], flow: charging ? 0 : -flow },
    { points: ["C1.b", [14, 7], [7, 7]], flow },
    { points: [[7, 7], [2, 7], "B1.b"], flow: charging ? flow : 0 },
  ];

  return (
    <div data-widget="analog-rc" className="w-full">
      <div className="mx-auto max-w-[460px]">
        <Schematic
          cols={18}
          rows={9}
          ariaLabel={`An RC circuit: a ${vs} volt battery, switch S1 to the battery, switch S2 to ground, a ${formatSI(r, "Ω")} resistor and a ${formatSI(c, "F")} capacitor. ${charging ? "S1 is closed, so the capacitor charges." : "S2 is closed, so the capacitor discharges through the resistor."}`}
          parts={[
            {
              kind: "battery",
              id: "B1",
              at: [2, 2],
              rot: 90,
              label: "B1",
              value: `${vs} V`,
            },
            {
              kind: "switch",
              id: "S1",
              at: [4, 2],
              label: "S1",
              closed: charging,
            },
            {
              kind: "switch",
              id: "S2",
              at: [7, 3],
              rot: 90,
              label: "S2",
              closed: !charging,
            },
            {
              kind: "resistor",
              id: "R1",
              at: [9, 2],
              label: "R1",
              value: formatSI(r, "Ω"),
            },
            {
              kind: "capacitor",
              id: "C1",
              at: [14, 2],
              rot: 90,
              label: "C1",
              value: formatSI(c, "F"),
            },
            { kind: "ground", id: "G1", at: [8, 7] },
          ]}
          wires={wires}
        />
      </div>
      <p className="mt-1 text-center text-xs text-ink-3">
        {charging
          ? "S1 closed: the battery pushes charge onto the capacitor."
          : "S2 closed: the capacitor empties through R1 to ground."}
      </p>

      <div className="mt-3">
        <Plot
          ariaLabel={`Capacitor voltage against time, ${charging ? "charging towards" : "discharging from"} ${vs} volts. Time constant ${formatSI(tau, "s")}. At the cursor, ${cursor.toFixed(2)} time constants in, it is ${vc.toFixed(2)} volts.`}
          x={[0, RC_SPAN * tau]}
          y={[0, vs * 1.04]}
          xTicks={[1, 2, 3, 4, 5, 6].map((k) => ({
            value: k * tau,
            label: `${k}τ`,
          }))}
          yTicks={[0, 0.5, 1].map((f) => ({
            value: f * vs,
            label: String(Math.round(f * vs * 100) / 100),
          }))}
          markers={[
            ...[1, 2, 3, 4, 5].map((k) => ({
              x: k * tau,
              color: "var(--ink-3)",
            })),
            { y: guide * vs, color: "var(--ink-2)", label: pct(guide * 100) },
            ...(goalTau
              ? [{ x: goalTau, color: SECOND, label: "goal τ" }]
              : []),
            { x: tc, color: SECOND },
          ]}
          series={[
            {
              points: curve.t.map(
                (t, k) => [t, curve.v[k]] as [number, number],
              ),
            },
          ]}
          xLabel={`time (1τ = ${formatSI(tau, "s")})`}
          yLabel="V across C"
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Caption>Switch</Caption>
        <Btn
          on={charging}
          disabled={lock.includes("mode")}
          onClick={() => setAll(ri, ci, "charge", cursor)}
        >
          Charge
        </Btn>
        <Btn
          on={!charging}
          disabled={lock.includes("mode")}
          onClick={() => setAll(ri, ci, "discharge", cursor)}
        >
          Discharge
        </Btn>
      </div>

      <div className="mt-2 grid gap-x-4 sm:grid-cols-2">
        <Slider
          label="Resistor R"
          value={ri}
          min={0}
          max={RC_R_VALUES.length - 1}
          disabled={lock.includes("r")}
          format={(i) => formatSI(RC_R_VALUES[i], "Ω")}
          onChange={(v) => setAll(v, ci, mode, cursor)}
        />
        <Slider
          label="Capacitor C"
          value={ci}
          min={0}
          max={RC_C_VALUES.length - 1}
          disabled={lock.includes("c")}
          format={(i) => formatSI(RC_C_VALUES[i], "F")}
          onChange={(v) => setAll(ri, v, mode, cursor)}
        />
        <Slider
          label="Cursor (time in τ)"
          value={cursor}
          min={0}
          max={RC_SPAN}
          step={0.05}
          className="sm:col-span-2"
          format={(v) => `${v.toFixed(2)} τ`}
          onChange={(v) => setAll(ri, ci, mode, v)}
        />
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Readout label="τ = R × C" value={formatSI(tau, "s")} accent />
        <Readout
          label={`At ${formatSI(tc, "s")}: V`}
          value={`${formatSI(vc, "V")} (${pct((vc / vs) * 100)})`}
        />
        <Readout label="Charge Q = C·V" value={formatSI(c * vc, "C")} />
        <Readout label="Current" value={formatSI(Math.abs(ic), "A")} />
      </div>

      {!props.hideTable && (
        <div className="mt-2 text-center">
          <Caption>
            {charging
              ? "Share of the supply voltage reached"
              : "Share of the starting voltage left"}
          </Caption>
          <div className="mt-1 flex flex-wrap justify-center gap-1.5">
            {curve.atTau.map((v, k) => (
              <span
                key={k}
                className="rounded-full border border-line bg-surface px-2.5 py-1 font-mono text-xs tabular-nums text-ink"
              >
                {k + 1}τ: {pct((v / vs) * 100)}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 space-y-1">
        <ToyNote>
          Toy model: an ideal capacitor and resistor and a perfect battery and
          switches. Real capacitors leak a little and vary with temperature,
          voltage and age.
        </ToyNote>
      </div>
    </div>
  );
}

/**
 * goal: { tau, tol } (τ within a relative tolerance tol, default 0.05), { minTau, maxTau }, { mode }, { r }, { c },
 * { minCursor } (cursor at least this many τ in).
 */
export function checkRcScope(state: unknown, goal: Record<string, unknown>) {
  const s = state as RcScopeState | undefined;
  if (!s) return false;
  const near = (got: number, want: number, tol: number) =>
    Math.abs(got - want) <= tol * Math.abs(want);
  if (
    typeof goal.tau === "number" &&
    !near(s.tau, goal.tau, typeof goal.tol === "number" ? goal.tol : 0.05)
  )
    return false;
  if (typeof goal.minTau === "number" && s.tau < goal.minTau) return false;
  if (typeof goal.maxTau === "number" && s.tau > goal.maxTau) return false;
  if (typeof goal.mode === "string" && s.mode !== goal.mode) return false;
  if (typeof goal.r === "number" && !near(s.r, goal.r, 1e-6)) return false;
  if (typeof goal.c === "number" && !near(s.c, goal.c, 1e-6)) return false;
  if (typeof goal.minCursor === "number" && s.cursor < goal.minCursor)
    return false;
  return true;
}
