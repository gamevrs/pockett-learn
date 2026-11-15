"use client";

import React, { useEffect, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Schematic, type PartSpec, type WireSpec } from "../elec-kit/Schematic";
import { Btn, Caption, MINUS, Note, Plot, Readout, SECOND, Seg, Slider, ToyNote } from "./ui";
import {
  K_MOTOR,
  R_WINDING,
  RUN_S,
  V_SUPPLY,
  W_FREE,
  driveDirection,
  modeSwitches,
  rpm,
  simulateRun,
  type Load,
  type Mode,
  type Run,
  type Switches,
} from "./motorsim";

export interface HBridgeProps {
  mode?: Mode;
  /** Starting switches for Manual mode, as 1/0 or true/false for Q1 to Q4. Default all open. */
  q?: (boolean | 0 | 1)[];
  /** PWM duty in percent, 0 to 100 (snaps to a step of 5). Default 100. */
  duty?: number;
  load?: Load;
  /** Starting shaft speed as a percentage of the full-supply no-load speed (negative = reverse). Default 0. */
  startPct?: number;
  /** Hide or disable these controls. */
  lock?: ("load" | "duty")[];
}

export interface HBridgeState {
  mode: Mode;
  q: Switches;
  duty: number;
  load: Load;
  /** drive direction set by the switches: 1 forward, −1 reverse, 0 anything else */
  direction: 1 | -1 | 0;
  /** one side of the bridge has both switches closed */
  shoot: boolean;
  /** speed at the end of the run, % of the full-supply no-load speed (signed) */
  speedPct: number;
  /** motor current at the end of the run, amps (A to B) */
  currentA: number;
  /** largest |current| during the run, amps */
  peakA: number;
}

interface Cfg {
  mode: Mode;
  q: Switches;
  duty: number;
  load: Load;
  run: Run;
}

const build = (mode: Mode, q: Switches, duty: number, load: Load, w0: number): Cfg => ({ mode, q, duty, load, run: simulateRun({ q, duty: duty / 100, load }, w0) });
const toState = (c: Cfg): HBridgeState => ({
  mode: c.mode,
  q: c.q,
  duty: c.duty,
  load: c.load,
  direction: driveDirection(c.q),
  shoot: c.run.shoot,
  speedPct: c.run.pctEnd,
  currentA: c.run.iEnd,
  peakA: c.run.peakA,
});

const MODES: { value: Mode; label: string }[] = [
  { value: "forward", label: "Forward" },
  { value: "reverse", label: "Reverse" },
  { value: "brake", label: "Brake" },
  { value: "coast", label: "Coast" },
  { value: "manual", label: "Manual" },
];
const LOADS: { value: Load; label: string }[] = [
  { value: "free", label: "Free-spinning" },
  { value: "loaded", label: "Loaded" },
  { value: "stalled", label: "Stalled (locked)" },
];

const tick = (v: number) => (v < 0 ? `${MINUS}${-v}` : String(v));
const amps = (x: number) => `${x < -0.005 ? MINUS : ""}${Math.abs(x).toFixed(2)} A`;
const pctText = (x: number) => `${x < -0.05 ? MINUS : ""}${Math.abs(x).toFixed(0)}%`;
const names = ["Q1", "Q2", "Q3", "Q4"];

/** What the four switches are doing, in words. */
function describe(q: Switches, shoot: boolean): string {
  const closed = names.filter((_, k) => q[k]);
  if (shoot) {
    const sides = [q[0] && q[1] ? "Q1 and Q2" : "", q[2] && q[3] ? "Q3 and Q4" : ""].filter(Boolean).join(" and also ");
    return `Shoot-through: ${sides} short the supply through one leg. A real bridge would draw a huge current and destroy its switches (the toy just stops the motor).`;
  }
  const d = driveDirection(q);
  if (d === 1) return "Q1 and Q4 closed: current flows from A through the motor to B (forward).";
  if (d === -1) return "Q3 and Q2 closed: current flows from B through the motor to A (reverse).";
  if (q[1] && q[3] && !q[0] && !q[2]) return "Q2 and Q4 closed: both motor terminals are tied to ground, so the back-EMF drives current round the short and the motor brakes hard.";
  if (q[0] && q[2] && !q[1] && !q[3]) return "Q1 and Q3 closed: both terminals are tied to the supply, so the motor brakes the same way (a high-side brake).";
  if (closed.length === 0) return "Every switch is open: the motor is disconnected and coasts (body diodes are ignored in this toy).";
  return `${closed.join(" and ")} closed, but that does not make a complete path through the motor, so no current flows.`;
}

/** H-bridge around a toy brushed DC motor: four switches, PWM duty, a load, and the current and speed over the next 0.3 s. */
export function HBridge({ props, onChange, status, goal }: WidgetProps<HBridgeProps>) {
  const lock = props.lock ?? [];
  const [cfg, setCfg] = useState<Cfg>(() => {
    const mode = props.mode ?? "forward";
    const q: Switches =
      mode === "manual"
        ? ([0, 1, 2, 3].map((k) => !!props.q?.[k]) as Switches)
        : modeSwitches(mode);
    const duty = Math.min(100, Math.max(0, Math.round((props.duty ?? 100) / 5) * 5));
    const load = props.load ?? "free";
    return build(mode, q, duty, load, ((props.startPct ?? 0) / 100) * W_FREE);
  });

  // report the starting state once, so a goal can be checked before the learner touches anything
  useEffect(() => {
    onChange?.(toState(cfg));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Change anything: the next 0.3 s run starts from the speed the shaft had at the end of the last one. */
  const apply = (mode: Mode, q: Switches, duty: number, load: Load) => {
    const next = build(mode, q, duty, load, cfg.run.wEnd);
    setCfg(next);
    onChange?.(toState(next));
  };

  const { mode, q, duty, load, run } = cfg;
  const shoot = run.shoot;
  const onMode = (m: Mode) => apply(m, m === "manual" ? ([false, false, false, false] as Switches) : modeSwitches(m), duty, load);
  const toggle = (k: number) => {
    const nq = q.map((v, j) => (j === k ? !v : v)) as Switches;
    apply("manual", nq, duty, load);
  };
  const showDuty = mode === "forward" || mode === "reverse" || mode === "manual";

  // the drawing: A and B are the motor's terminals, Q1 to Q4 the switches
  const f = run.end.iq;
  const iMotor = run.end.i;
  const parts: PartSpec[] = [
    { kind: "switch", id: "Q1", at: [4, 2], rot: 90, label: "Q1", closed: q[0], highlight: q[0], labelFlip: true },
    { kind: "switch", id: "Q2", at: [4, 5], rot: 90, label: "Q2", closed: q[1], highlight: q[1], labelFlip: true },
    { kind: "switch", id: "Q3", at: [14, 2], rot: 90, label: "Q3", closed: q[2], highlight: q[2] },
    { kind: "switch", id: "Q4", at: [14, 5], rot: 90, label: "Q4", closed: q[3], highlight: q[3] },
    { kind: "inductor", id: "M", at: [7, 5], label: "Motor" },
    { kind: "ground", id: "G", at: [9, 9] },
  ];
  const wires: WireSpec[] = [
    { points: ["Q1.a", [9, 2]], flow: -f[0] },
    { points: [[9, 2], "Q3.a"], flow: f[2] },
    { points: ["Q1.b", "M.a"], flow: iMotor },
    { points: ["M.b", "Q3.b"], flow: iMotor },
    { points: ["Q2.b", [9, 8]], flow: f[1] },
    { points: ["Q4.b", [9, 8]], flow: f[3] },
    { points: [[9, 8], "G.a"], flow: f[1] + f[3] },
  ];

  const tl = run.t;
  const stateWord = shoot ? "Shoot-through" : driveDirection(q) === 1 ? "Forward drive" : driveDirection(q) === -1 ? "Reverse drive" : q[1] && q[3] && !q[0] && !q[2] ? "Brake" : q[0] && q[2] && !q[1] && !q[3] ? "Brake (high side)" : "Coast / open";

  const solution =
    status === "revealed" && goal
      ? goal.manual === true && goal.direction === -1
        ? "One answer: close only Q3 and Q2, so current flows from B through the motor to A."
        : goal.mode === "forward" && typeof goal.speedPctMin === "number"
          ? "One answer: Drive Forward with the PWM duty at 50%."
          : null
      : null;

  return (
    <div data-widget="analog-hbridge" className="w-full">
      <div className="mx-auto max-w-[460px]">
        <Schematic
          cols={18}
          rows={10}
          flowRef={3}
          ariaLabel={`An H-bridge on a ${V_SUPPLY} volt supply: Q1 top left, Q2 bottom left, Q3 top right, Q4 bottom right, with the motor between the middle of the left leg (A) and the middle of the right leg (B). ${describe(q, shoot)}`}
          parts={parts}
          wires={wires}
          texts={[
            { at: [9, 1.4], text: `+${V_SUPPLY} V supply`, anchor: "middle" },
            { at: [3.1, 5.35], text: "A", anchor: "end", muted: true },
            { at: [14.9, 5.35], text: "B", anchor: "start", muted: true },
          ]}
        />
      </div>

      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <Caption>Drive</Caption>
        <Seg label="Drive" value={mode} options={MODES} onChange={onMode} />
      </div>
      {mode === "manual" && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {names.map((n, k) => (
            <Btn key={n} on={q[k]} onClick={() => toggle(k)}>
              {n}
            </Btn>
          ))}
          <span className="text-xs text-ink-3">Pressed = closed. Q1 top left, Q2 bottom left, Q3 top right, Q4 bottom right.</span>
        </div>
      )}
      <p className={`mt-2 text-center text-sm leading-snug ${shoot ? "font-semibold text-bad" : "text-ink-2"}`} role="status">
        {describe(q, shoot)}
      </p>

      <div className="mt-2 grid gap-x-4 gap-y-2 sm:grid-cols-2">
        {showDuty && (
          <Slider label="PWM duty" value={duty} min={0} max={100} step={5} disabled={lock.includes("duty")} format={(v) => `${v}%`} onChange={(v) => apply(mode, q, v, load)} />
        )}
        {lock.includes("load") ? (
          <p className="self-end text-xs text-ink-3">Load: free-spinning (nothing on the shaft).</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Caption>Load</Caption>
            <Seg label="Load" value={load} options={LOADS} onChange={(l) => apply(mode, q, duty, l)} />
          </div>
        )}
      </div>

      <div className="mt-3">
        <Caption>Motor current over the next {RUN_S * 1000} ms</Caption>
        <Plot
          height={150}
          ariaLabel={`Motor current in amps against time. It starts at ${amps(run.i[0])}, peaks at ${run.peakA.toFixed(2)} amps in size and ends at ${amps(run.iEnd)}.`}
          x={[0, RUN_S * 1000]}
          y={[-6.5, 6.5]}
          xTicks={[0, 100, 200, 300].map((v) => ({ value: v, label: String(v) }))}
          yTicks={[-6, -3, 0, 3, 6].map((v) => ({ value: v, label: tick(v) }))}
          markers={[{ y: 0, color: "var(--ink-3)" }]}
          series={[{ points: tl.map((t, k) => [t, run.i[k]] as [number, number]) }]}
          xLabel="time (ms)"
          yLabel="current (A)"
        />
        <Caption>Shaft speed (% of the full-supply, no-load speed)</Caption>
        <Plot
          height={150}
          ariaLabel={`Shaft speed as a percentage of the full-supply no-load speed against time. It starts at ${pctText(run.pct[0])} and ends at ${pctText(run.pctEnd)}.`}
          x={[0, RUN_S * 1000]}
          y={[-100, 100]}
          xTicks={[0, 100, 200, 300].map((v) => ({ value: v, label: String(v) }))}
          yTicks={[-100, -50, 0, 50, 100].map((v) => ({ value: v, label: tick(v) }))}
          markers={[{ y: 0, color: "var(--ink-3)" }]}
          series={[{ points: tl.map((t, k) => [t, run.pct[k]] as [number, number]), color: SECOND }]}
          xLabel="time (ms)"
          yLabel="speed (%)"
        />
      </div>

      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Readout label="Bridge" value={stateWord} accent />
        <Readout label={`Speed at ${RUN_S * 1000} ms`} value={`${Math.round(rpm(run.wEnd) / 10) * 10} rpm (${pctText(run.pctEnd)})`} />
        <Readout label={`Current at ${RUN_S * 1000} ms`} value={amps(run.iEnd)} />
        <Readout label="Peak current in the run" value={`${run.peakA.toFixed(2)} A`} accent />
        <Readout label="Back-EMF E = kω" value={`${run.eEnd.toFixed(2)} V`} />
      </div>
      {solution && (
        <div className="mt-2">
          <Note tone="accent">{solution}</Note>
        </div>
      )}

      <div className="mt-3">
        <ToyNote>
          Toy motor on a {V_SUPPLY} V supply: winding {R_WINDING} Ω, k = {K_MOTOR} V·s/rad (also N·m per A), made-up values. Each change simulates the next {RUN_S * 1000} ms starting from the shaft speed the last run ended with. PWM is shown as its average voltage (duty × {V_SUPPLY} V) with the ripple ignored, and winding inductance is left out (its time constant is far shorter than the motor&apos;s mechanical one). Both switches on one side of the bridge are reported as a short; with every switch open the motor floats and body diodes are ignored.
        </ToyNote>
      </div>
    </div>
  );
}

/** goal: { mode }, { manual }, { direction: 1 | -1 | 0 }, { shoot }, { speedPctMin }, { speedPctMax }, { load }. */
export function checkHBridge(state: unknown, goal: Record<string, unknown>) {
  const s = state as HBridgeState | undefined;
  if (!s) return false;
  if (typeof goal.mode === "string" && s.mode !== goal.mode) return false;
  if (goal.manual === true && s.mode !== "manual") return false;
  if (typeof goal.direction === "number" && s.direction !== goal.direction) return false;
  if (typeof goal.shoot === "boolean" && s.shoot !== goal.shoot) return false;
  if (typeof goal.load === "string" && s.load !== goal.load) return false;
  // the run ends 10 time constants in, so the speed is within 0.01% of steady; a little slack keeps the exact edges (40, 60) inside
  if (typeof goal.speedPctMin === "number" && !(s.speedPct >= goal.speedPctMin - 0.1)) return false;
  if (typeof goal.speedPctMax === "number" && !(s.speedPct <= goal.speedPctMax + 0.1)) return false;
  return true;
}
