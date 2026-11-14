"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { otaSteps, paretoShare, type OtaScenario } from "./logic";
import { Btn, Caption, Meter, Note, Readout, Seg, Toy } from "./ui";

// ───────────────────────── OTA update with A/B slots ─────────────────────────

export interface OtaProps {
  scenario?: OtaScenario;
}

export interface OtaState {
  scenario: OtaScenario;
  step: number;
  done: boolean;
  /** which slot the device ends up running when the scenario finishes (null until done) */
  active: "A" | "B";
  bricked: boolean;
  seen: OtaScenario[];
}

const SCENARIOS: { value: OtaScenario; label: string }[] = [
  { value: "good", label: "Good update" },
  { value: "tampered", label: "Tampered image" },
  { value: "crash", label: "Update crashes" },
  { value: "power", label: "Battery dies" },
];

/** An over-the-air update with two firmware slots: step through a good update and three ways it can go wrong. */
export function Ota({ props, onChange }: WidgetProps<OtaProps>) {
  const [scenario, setScenario] = useState<OtaScenario>(props.scenario ?? "good");
  const [step, setStep] = useState(0);
  const [seen, setSeen] = useState<OtaScenario[]>([]);

  const steps = otaSteps(scenario);
  const cur = steps[Math.min(step, steps.length - 1)];
  const done = !!cur.done;

  const emit = (sc: OtaScenario, i: number, sn: OtaScenario[]) => {
    const s = otaSteps(sc);
    const c = s[Math.min(i, s.length - 1)];
    onChange?.({ scenario: sc, step: i, done: !!c.done, active: c.active, bricked: false, seen: sn } satisfies OtaState);
  };

  const next = () => {
    const i = Math.min(step + 1, steps.length - 1);
    setStep(i);
    let sn = seen;
    if (steps[i].done && !seen.includes(scenario)) {
      sn = [...seen, scenario];
      setSeen(sn);
    }
    emit(scenario, i, sn);
  };
  const pickScenario = (sc: OtaScenario) => {
    setScenario(sc);
    setStep(0);
    emit(sc, 0, seen);
  };

  const slot = (name: "A" | "B", text: string) => {
    const on = cur.active === name;
    return (
      <div className={`rounded-xl border-2 p-3 ${on ? "border-[var(--brand)] bg-tint" : "border-line bg-surface"}`}>
        <p className="flex items-baseline justify-between gap-2 text-xs text-ink-3">
          <span className="font-semibold text-ink">Slot {name}</span>
          <span>{on ? "boots from here" : "spare"}</span>
        </p>
        <p className="mt-1 font-mono text-[0.84rem] leading-snug text-ink">{text}</p>
      </div>
    );
  };

  return (
    <div className="w-full" data-widget>
      <Seg label="Scenario" value={scenario} onChange={pickScenario} options={SCENARIOS} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        {slot("A", cur.a)}
        {slot("B", cur.b)}
      </div>
      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3" aria-live="polite">
        <Caption>
          Step {Math.min(step, steps.length - 1) + 1} of {steps.length}
        </Caption>
        <p className="mt-1 text-[0.9rem] font-semibold text-ink">{cur.title}</p>
        <p className="mt-1 text-[0.86rem] leading-snug text-ink-2">{cur.detail}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn primary onClick={next} disabled={done}>
          {done ? "Finished" : "Next step"}
        </Btn>
        <Btn onClick={() => pickScenario(scenario)}>Restart</Btn>
        {done && <Readout label="Device is" value={`running slot ${cur.active}, not bricked`} accent />}
      </div>
      <div className="mt-3">
        <Note>Two rules make this safe: never overwrite the slot you are running from, and only trust a new image after it has proved itself.</Note>
      </div>
      <Toy>Simplified. Real bootloaders differ (some swap in place, some keep a recovery image), and a real update also checks version numbers so an old image cannot be pushed back on.</Toy>
    </div>
  );
}

/** goal: { seen: [scenario ids] } or { scenario, done, active }. */
export function checkOta(state: unknown, goal: Record<string, unknown>) {
  const s = state as OtaState | undefined;
  if (!s) return false;
  if (Array.isArray(goal.seen)) for (const v of goal.seen) if (!s.seen.includes(v as OtaScenario)) return false;
  if (typeof goal.scenario === "string" && s.scenario !== goal.scenario) return false;
  if (goal.done === true && !s.done) return false;
  if (typeof goal.active === "string" && s.active !== goal.active) return false;
  return true;
}

// ───────────────────────── field returns Pareto ─────────────────────────

export interface ParetoProps {
  shipped?: number;
}

export interface ParetoState {
  fixed: string[];
  returns: number;
  ratePercent: number;
  /** share of the original returns removed */
  removedShare: number;
}

const CAUSES = [
  { id: "coating", label: "Probe coating peels, water gets in", n: 71 },
  { id: "pair", label: "Phone pairing fails on some models", n: 54 },
  { id: "cover", label: "Battery cover cracks", n: 38 },
  { id: "cold", label: "Resets in the cold (battery sag)", n: 22 },
  { id: "doa", label: "Dead on arrival (solder defect)", n: 17 },
  { id: "other", label: "Everything else", n: 9 },
];
const TOTAL = CAUSES.reduce((a, c) => a + c.n, 0);

/** A field-returns Pareto chart: click a cause to "fix" it and watch the return rate fall. */
export function Pareto({ props, onChange }: WidgetProps<ParetoProps>) {
  const shipped = props.shipped ?? 10000;
  const [fixed, setFixed] = useState<string[]>([]);

  const stateOf = (f: string[]): ParetoState => {
    const left = CAUSES.reduce((a, c) => a + (f.includes(c.id) ? 0 : c.n), 0);
    return { fixed: f, returns: left, ratePercent: (left / shipped) * 100, removedShare: 1 - left / TOTAL };
  };
  const st = stateOf(fixed);
  const toggle = (id: string) => {
    const next = fixed.includes(id) ? fixed.filter((x) => x !== id) : [...fixed, id];
    setFixed(next);
    onChange?.(stateOf(next));
  };

  const rows = CAUSES.map((c, i) => ({ ...c, cum: CAUSES.slice(0, i + 1).reduce((a, x) => a + x.n, 0) / TOTAL }));
  const top2 = paretoShare(CAUSES.map((c) => c.n), 2);

  return (
    <div className="w-full" data-widget>
      <p className="text-xs leading-snug text-ink-3">
        Last quarter: {shipped.toLocaleString("en-US")} units shipped, {TOTAL} came back. Tap a cause to mark it fixed in the next revision.
      </p>
      <ul className="mt-2 space-y-1.5">
        {rows.map((r) => {
          const isFixed = fixed.includes(r.id);
          return (
            <li key={r.id}>
              <button
                type="button"
                aria-pressed={isFixed}
                onClick={() => toggle(r.id)}
                className={`w-full min-h-10 rounded-xl border px-3 py-2 text-left transition-colors ${isFixed ? "border-[var(--good)] bg-tint" : "border-line bg-surface hover:bg-surface-2"}`}
              >
                <span className="flex items-baseline justify-between gap-2 text-[0.86rem] text-ink">
                  <span className={isFixed ? "line-through decoration-1" : ""}>{r.label}</span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-ink-2">{r.n}</span>
                </span>
                <span className="mt-1 block">
                  <Meter frac={r.n / CAUSES[0].n} tone={isFixed ? "muted" : "brand"} label={`${r.label}: ${r.n} returns`} />
                </span>
                <span className="mt-1 block text-xs text-ink-3">{Math.round(r.cum * 100)}% of all returns are this cause and the ones above it</span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="Returns left" value={st.returns} />
        <Readout label="Return rate" value={`${st.ratePercent.toFixed(2)}%`} accent />
      </div>
      <div className="mt-3">
        <Note>The top two causes make up {Math.round(top2 * 100)}% of the returns. Fix the biggest bars first: a Pareto chart is a list of where your effort pays off most.</Note>
      </div>
      <Toy>Made-up return counts for a made-up product. The cold-reset cause is still here to show that one fix in Rev B does not remove it from units already in the field.</Toy>
    </div>
  );
}

/** goal: { fixed: [ids] } and/or { maxRate } (percent). */
export function checkPareto(state: unknown, goal: Record<string, unknown>) {
  const s = state as ParetoState | undefined;
  if (!s) return false;
  if (Array.isArray(goal.fixed)) for (const id of goal.fixed) if (!s.fixed.includes(id as string)) return false;
  if (typeof goal.maxRate === "number" && s.ratePercent > goal.maxRate) return false;
  return true;
}
