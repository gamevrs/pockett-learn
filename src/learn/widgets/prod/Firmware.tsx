"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { FSM_PARAMS, fsmStart, fsmStep, type FsmRun, type FsmState } from "./logic";
import { Btn, Caption, Note, Readout, Seg, Toy } from "./ui";

// ───────────────────────── layers ─────────────────────────

type Scenario = "layers" | "host" | "swap";

export interface LayersState {
  scenario: Scenario;
  selected: string;
  seen: Scenario[];
}

const LAYERS: { id: string; name: string; what: string; host: "real" | "fake" | "no"; swap: boolean }[] = [
  { id: "app", name: "Application", what: "Sprout's own rules: when to wake, what to report, the sleep, measure and send state machine.", host: "real", swap: false },
  { id: "services", name: "Services", what: "Logging, saved settings, the Bluetooth profile and the update client. Built on the layers below through plain interfaces.", host: "real", swap: false },
  { id: "drivers", name: "Drivers", what: "One per chip: the moisture sensor, the light sensor, the flash. They know the chip's registers and I²C address, but not which MCU they run on.", host: "real", swap: false },
  { id: "hal", name: "HAL (hardware abstraction layer)", what: "A thin set of functions such as i2c_read(), gpio_write() and timer_start(). Everything above calls these and nothing else.", host: "fake", swap: true },
  { id: "sdk", name: "Vendor SDK and registers", what: "The MCU maker's code and the memory-mapped registers from the embedded lessons. It only runs on the real chip.", host: "no", swap: true },
];

export interface LayersProps {
  scenario?: Scenario;
}

/** The firmware layer cake. Switch between the plain stack, what runs on a laptop with a fake HAL, and what changes when you swap the MCU. */
export function Layers({ props, onChange }: WidgetProps<LayersProps>) {
  const [scenario, setScenario] = useState<Scenario>(props.scenario ?? "layers");
  const [selected, setSelected] = useState("drivers");
  const [seen, setSeen] = useState<Scenario[]>([props.scenario ?? "layers"]);
  const sel = LAYERS.find((l) => l.id === selected)!;

  const emit = (sc: Scenario, id: string, sn: Scenario[]) => onChange?.({ scenario: sc, selected: id, seen: sn } satisfies LayersState);
  const setSc = (sc: Scenario) => {
    setScenario(sc);
    const sn = seen.includes(sc) ? seen : [...seen, sc];
    setSeen(sn);
    emit(sc, selected, sn);
  };
  const pick = (id: string) => {
    setSelected(id);
    emit(scenario, id, seen);
  };

  const tag = (l: (typeof LAYERS)[number]) => {
    if (scenario === "host") return l.host === "real" ? "runs on the laptop" : l.host === "fake" ? "replaced by a fake" : "stays on the chip";
    if (scenario === "swap") return l.swap ? "must be rewritten" : "unchanged";
    return null;
  };
  const tone = (l: (typeof LAYERS)[number]) => {
    if (scenario === "host") return l.host === "real" ? "var(--good)" : l.host === "fake" ? "#d9a21b" : "var(--line-strong)";
    if (scenario === "swap") return l.swap ? "var(--bad)" : "var(--good)";
    return "var(--line-strong)";
  };

  return (
    <div className="w-full" data-widget>
      <Seg
        label="What to show"
        value={scenario}
        onChange={setSc}
        options={[
          { value: "layers", label: "The layers" },
          { value: "host", label: "Test on a laptop" },
          { value: "swap", label: "Swap the MCU" },
        ]}
      />
      <div role="radiogroup" aria-label="Firmware layers" className="mt-3 grid gap-1.5">
        {LAYERS.map((l, i) => {
          const on = l.id === selected;
          const t = tag(l);
          return (
            <button
              key={l.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => pick(l.id)}
              style={{ borderLeftColor: tone(l), borderLeftWidth: 6 }}
              className={`min-h-10 rounded-xl border px-3 py-2 text-left transition-colors ${on ? "border-[var(--brand)] bg-tint" : "border-line bg-surface hover:bg-surface-2"}`}
            >
              <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="text-[0.9rem] font-medium text-ink">
                  {i + 1}. {l.name}
                </span>
                {t && <span className="text-xs font-medium text-ink-2">{t}</span>}
              </span>
              {i < LAYERS.length - 1 && <span className="sr-only">calls the layer below</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3 text-[0.86rem] leading-snug text-ink-2">
        <p>
          <strong className="text-ink">{sel.name}.</strong> {sel.what}
        </p>
        {scenario === "host" && (
          <p className="mt-1.5">
            {sel.host === "real"
              ? "On the laptop this layer runs unchanged. A test feeds it fake sensor readings and checks what it does."
              : sel.host === "fake"
                ? "On the laptop the real HAL is swapped for a fake one that returns scripted values and records what was asked of it."
                : "This code touches real registers, so it only runs on the chip. Keep it as thin as you can."}
          </p>
        )}
        {scenario === "swap" && (
          <p className="mt-1.5">{sel.swap ? "Different chip, different registers and different SDK: this layer is rewritten or re-targeted." : "It only talks to the layer below through an interface, so nothing here changes."}</p>
        )}
      </div>
      <div className="mt-3">
        <Note>Rule: each layer calls only the one below it, through a small interface. That rule is what lets the top three layers be tested on a laptop and survive a chip change.</Note>
      </div>
      <Toy>One common way to layer firmware; real projects name and split the layers differently.</Toy>
    </div>
  );
}

/** goal: { seen: [scenario ids] }. */
export function checkLayers(state: unknown, goal: Record<string, unknown>) {
  const s = state as LayersState | undefined;
  if (!s) return false;
  if (Array.isArray(goal.seen)) for (const v of goal.seen) if (!s.seen.includes(v as Scenario)) return false;
  if (typeof goal.selected === "string" && s.selected !== goal.selected) return false;
  return true;
}

// ───────────────────────── state machine ─────────────────────────

export interface FsmProps {
  maxAttempts?: number;
  phoneNear?: boolean;
}

export interface FsmWidgetState {
  state: FsmState;
  cycles: number;
  attempt: number;
  gaveUp: boolean;
  phoneNear: boolean;
  maxAttempts: number;
  avgUa: number | null;
  sawBackoff: boolean;
}

const NAMES: Record<FsmState, string> = { sleep: "Sleep", wake: "Wake", measure: "Measure", send: "Send", backoff: "Back off" };
const POS: Record<FsmState, [number, number]> = { sleep: [7, 34], wake: [99, 34], measure: [191, 34], send: [283, 34], backoff: [283, 104] };
const BW = 70;
const BH = 38;
const INTERVAL = 900;

const DESC: Record<FsmState, string> = {
  sleep: "Everything off except the real-time clock. About 8 µA for the whole board.",
  wake: "The clock wakes the MCU. Start the oscillator and power the sensors.",
  measure: "Read the moisture and light sensors (about 100 ms).",
  send: "Switch the radio on and try to hand the reading to the phone (about 300 ms at 9 mA).",
  backoff: "The phone was not there. Wait a moment (radio off), then try again, up to the retry limit.",
};

/** Sprout's firmware as a state machine you step through, with the charge each state costs. */
export function Fsm({ props, onChange }: WidgetProps<FsmProps>) {
  const [maxAttempts, setMaxAttempts] = useState(props.maxAttempts ?? 3);
  const [phoneNear, setPhoneNear] = useState(props.phoneNear ?? true);
  const [run, setRun] = useState<FsmRun>(() => fsmStart(props.maxAttempts ?? 3));
  const [sawBackoff, setSawBackoff] = useState(false);

  const totalCharge = Object.values(run.charge).reduce((a, b) => a + b, 0);
  const avgUa = run.cycles > 0 ? ((totalCharge / run.cycles) / INTERVAL) * 1000 : null;
  const months = avgUa ? (180 / (avgUa / 1000) / 24) / 30.4375 : null;

  const emit = (r: FsmRun, near: boolean, max: number, sb: boolean) => {
    const tot = Object.values(r.charge).reduce((a, b) => a + b, 0);
    onChange?.({
      state: r.state,
      cycles: r.cycles,
      attempt: r.attempt,
      gaveUp: r.gaveUp,
      phoneNear: near,
      maxAttempts: max,
      avgUa: r.cycles > 0 ? ((tot / r.cycles) / INTERVAL) * 1000 : null,
      sawBackoff: sb,
    } satisfies FsmWidgetState);
  };

  const step = () => {
    const next = fsmStep(run, phoneNear, INTERVAL);
    const sb = sawBackoff || next.state === "backoff";
    setSawBackoff(sb);
    setRun(next);
    emit(next, phoneNear, maxAttempts, sb);
  };
  const reset = (max = maxAttempts) => {
    const r = fsmStart(max);
    setRun(r);
    setSawBackoff(false);
    emit(r, phoneNear, max, false);
  };

  const arrows: { d: string; key: string }[] = [
    { key: "sw", d: "M77 53 L97 53" },
    { key: "wm", d: "M169 53 L189 53" },
    { key: "ms", d: "M261 53 L281 53" },
    { key: "sb", d: "M300 72 L300 102" },
    { key: "bs", d: "M336 104 L336 74" },
    { key: "back", d: "M318 34 L318 25 L42 25 L42 32" },
  ];

  return (
    <div className="w-full" data-widget>
      <svg viewBox="0 0 360 156" className="block h-auto w-full rounded-xl border border-line bg-surface" role="img" aria-label={`State machine: sleep, wake, measure, send and back to sleep, with a back-off state for failed sends. Current state: ${NAMES[run.state]}.`}>
        <defs>
          <marker id="prod-fsm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--ink-3)" />
          </marker>
        </defs>
        {arrows.map((a) => (
          <path key={a.key} d={a.d} fill="none" stroke="var(--ink-3)" strokeWidth={1.5} markerEnd="url(#prod-fsm-arrow)" />
        ))}
        <text x={180} y={19}textAnchor="middle" fontSize={14} fill="var(--ink-3)" aria-hidden>
          sent, or gave up
        </text>
        {(Object.keys(POS) as FsmState[]).map((s) => {
          const [x, y] = POS[s];
          const on = run.state === s;
          return (
            <g key={s}>
              <rect x={x} y={y} width={BW} height={BH} rx={8} style={{ fill: on ? "var(--brand)" : "var(--surface)", stroke: on ? "var(--brand)" : "var(--line-strong)", strokeWidth: 2 }} />
              <text x={x + BW / 2} y={y + 25} textAnchor="middle" fontSize={14} fontWeight={600} style={{ fill: on ? "var(--primary-ink)" : "var(--ink)" }}>
                {NAMES[s]}
              </text>
            </g>
          );
        })}
        <text x={10} y={130} fontSize={14} fill="var(--ink-2)">
          {run.state === "backoff" ? `try ${run.attempt} of ${run.maxAttempts} failed` : run.gaveUp ? "gave up after retries" : `cycles done: ${run.cycles}`}
        </text>
      </svg>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn primary onClick={step} label={`Step: leave ${NAMES[run.state]}`}>
          Step
        </Btn>
        <Btn onClick={() => reset()}>Reset</Btn>
        <Seg
          label="Phone"
          value={phoneNear ? "near" : "away"}
          onChange={(v) => {
            setPhoneNear(v === "near");
            emit(run, v === "near", maxAttempts, sawBackoff);
          }}
          options={[
            { value: "near", label: "Phone nearby" },
            { value: "away", label: "Out of range" },
          ]}
        />
        <Seg
          label="Retry limit"
          value={maxAttempts}
          onChange={(v) => {
            setMaxAttempts(v);
            reset(v);
          }}
          options={[
            { value: 1, label: "1 try" },
            { value: 3, label: "3 tries" },
            { value: 10, label: "10 tries" },
          ]}
        />
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3 text-[0.86rem] leading-snug text-ink-2">
        <p>
          <strong className="text-ink">{NAMES[run.state]}.</strong> {DESC[run.state]}
        </p>
      </div>

      <div className="mt-3">
        <Caption>Charge spent so far (mA·s), by state</Caption>
        <div className="mt-1 flex flex-wrap gap-2">
          {(Object.keys(NAMES) as FsmState[]).map((s) => (
            <Readout key={s} label={NAMES[s]} value={run.charge[s].toFixed(run.charge[s] < 1 ? 3 : 1)} accent={run.state === s} />
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Average current" value={avgUa === null ? "finish a cycle" : `${avgUa.toFixed(1)} µA`} accent />
        <Readout label="Coin cell life" value={months === null ? "-" : months >= 24 ? `${(months / 12).toFixed(1)} years` : `${months.toFixed(1)} months`} />
      </div>
      <pre className="mt-3 whitespace-pre-wrap break-words rounded-xl border border-line bg-surface-2 p-3 font-mono text-[12px] leading-snug text-ink-2" aria-label="Device log">
        {run.log.slice(-5).join("\n")}
      </pre>
      <Toy>
        A toy model: a report every {INTERVAL / 60} minutes; currents are{" "}
        {(Object.keys(FSM_PARAMS) as FsmState[]).filter((s) => s !== "sleep" && s !== "backoff").map((s) => `${NAMES[s].toLowerCase()} ${FSM_PARAMS[s].ma} mA`).join(", ")}; sleep and back-off 8 µA; a 180 mAh usable coin cell.
      </Toy>
    </div>
  );
}

/** goal: { gaveUp?: true, sawBackoff?: true, state?, maxAttempts? }. */
export function checkFsm(state: unknown, goal: Record<string, unknown>) {
  const s = state as FsmWidgetState | undefined;
  if (!s) return false;
  if (goal.gaveUp === true && !s.gaveUp) return false;
  if (goal.sawBackoff === true && !s.sawBackoff) return false;
  if (typeof goal.state === "string" && s.state !== goal.state) return false;
  if (typeof goal.maxAttempts === "number" && s.maxAttempts !== goal.maxAttempts) return false;
  if (typeof goal.minCycles === "number" && s.cycles < goal.minCycles) return false;
  return true;
}
