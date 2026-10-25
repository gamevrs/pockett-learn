"use client";

import React, { useState } from "react";
import { Eye, EyeOff, Wrench } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Code } from "./shared";

interface Variant {
  id: string;
  label: string;
  parts: string[];
  /** For each interface method: the internal steps it runs, as [part, what it does]. */
  steps: Record<string, Array<[string, string]>>;
}

interface Machine {
  obj: string;
  className: string;
  methods: string[];
  variants: Variant[];
  /** What the caller sees, given the call history. */
  status: (calls: string[]) => string;
}

const CAR: Machine = {
  obj: "car",
  className: "Car",
  methods: ["start", "press_gas", "brake"],
  variants: [
    {
      id: "petrol",
      label: "Petrol engine",
      parts: ["Battery", "Starter motor", "Fuel pump", "Injectors", "Spark plugs", "Pistons", "Gearbox", "Brake pads"],
      steps: {
        start: [
          ["Battery", "sends 12 volts to the starter"],
          ["Starter motor", "spins the crankshaft"],
          ["Fuel pump", "pressurises the fuel line"],
          ["Spark plugs", "ignite the first cylinders"],
        ],
        press_gas: [
          ["Injectors", "spray in more fuel"],
          ["Pistons", "fire faster"],
          ["Gearbox", "picks the right gear"],
        ],
        brake: [
          ["Brake pads", "squeeze the discs"],
          ["Gearbox", "shifts down"],
        ],
      },
    },
    {
      id: "electric",
      label: "Electric motor",
      parts: ["Battery pack", "Inverter", "Motor", "Regen controller", "Brake pads"],
      steps: {
        start: [
          ["Battery pack", "closes its contactors"],
          ["Inverter", "runs a self-check"],
        ],
        press_gas: [
          ["Inverter", "turns DC into AC"],
          ["Motor", "draws more current and spins faster"],
        ],
        brake: [
          ["Regen controller", "turns the motor into a generator"],
          ["Battery pack", "stores the recovered energy"],
          ["Brake pads", "add friction if needed"],
        ],
      },
    },
  ],
  status: (calls) => {
    let on = false;
    let speed = 0;
    for (const c of calls) {
      if (c === "start") on = true;
      if (c === "press_gas" && on) speed = Math.min(120, speed + 20);
      if (c === "brake") speed = Math.max(0, speed - 20);
    }
    return on ? `Running · ${speed} km/h` : "Switched off · 0 km/h";
  },
};

const COFFEE: Machine = {
  obj: "machine",
  className: "CoffeeMachine",
  methods: ["espresso", "latte"],
  variants: [
    {
      id: "standard",
      label: "Standard",
      parts: ["Water tank", "Heater", "Pump", "Grinder", "Portafilter", "Milk frother"],
      steps: {
        espresso: [
          ["Grinder", "grinds 18 g of beans"],
          ["Heater", "brings water to 93 °C"],
          ["Pump", "pushes it through at 9 bar"],
          ["Portafilter", "holds the grounds for 25 seconds"],
        ],
        latte: [
          ["Grinder", "grinds 18 g of beans"],
          ["Heater", "brings water to 93 °C"],
          ["Pump", "pushes it through at 9 bar"],
          ["Milk frother", "steams the milk to 60 °C"],
        ],
      },
    },
  ],
  status: (calls) => (calls.length ? `Your ${calls[calls.length - 1]} is ready` : "Ready"),
};

const MACHINES: Record<string, Machine> = { car: CAR, coffee: COFFEE };

export interface HoodProps {
  /** Which machine: "car" (default) or "coffee". */
  preset?: "car" | "coffee";
  /** Let the learner swap the internals (variants) while the interface stays the same. */
  swap?: boolean;
  /** Start with the hood open. */
  open?: boolean;
}

export interface HoodState {
  calls: Array<{ method: string; variant: string }>;
  hoodOpened: boolean;
  variant: string;
}

/** A simple interface on top; the complex internals underneath can be revealed (and swapped). */
export function AbstractionHood({ props, onChange, revealed }: WidgetProps<HoodProps>) {
  const machine = MACHINES[props.preset ?? "car"] ?? CAR;
  const [state, setState] = useState<HoodState>({ calls: [], hoodOpened: Boolean(props.open), variant: machine.variants[0].id });
  const [open, setOpen] = useState(Boolean(props.open));
  const locked = Boolean(revealed);
  const variant = machine.variants.find((v) => v.id === state.variant) ?? machine.variants[0];
  const last = state.calls[state.calls.length - 1];
  const lastSteps = last && last.variant === variant.id ? (variant.steps[last.method] ?? []) : [];
  const usedParts = new Set(lastSteps.map(([p]) => p));

  const commit = (next: HoodState) => {
    setState(next);
    onChange?.(next);
  };
  const call = (method: string) => {
    if (locked) return;
    commit({ ...state, calls: [...state.calls, { method, variant: variant.id }] });
  };
  const toggleHood = () => {
    setOpen(!open);
    if (!open && !state.hoodOpened && !locked) commit({ ...state, hoodOpened: true });
  };
  const swapTo = (id: string) => {
    if (locked || id === state.variant) return;
    commit({ ...state, variant: id });
  };

  const longLabels = machine.methods.some((m) => `${machine.obj}.${m}()`.length > 15);
  const callerLines = state.calls.slice(-4).map((c) => `${machine.obj}.${c.method}()`);
  return (
    <div className="w-full text-sm">
      {/* interface */}
      <div className="rounded-2xl border border-line bg-surface p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Caption className="!mb-0">The interface · all a caller needs</Caption>
          <span className="font-mono text-xs text-ink-2">{machine.status(state.calls.map((c) => c.method))}</span>
        </div>
        <div className={`mt-3 grid gap-2 sm:grid-cols-3 ${longLabels ? "grid-cols-1" : "grid-cols-2"}`}>
          {machine.methods.map((m) => (
            <button key={m} type="button" disabled={locked} onClick={() => call(m)} className="btn btn-primary !h-12 font-mono !text-[0.82rem]">
              {machine.obj}.{m}()
            </button>
          ))}
        </div>
      </div>

      {/* caller code */}
      <div className="mt-3">
        <Caption>Your code</Caption>
        <Code code={callerLines.length ? callerLines.join("\n") : `# tap a button: it runs ${machine.obj}.something()`} />
        {props.swap && state.calls.some((c) => c.variant !== state.calls[0]?.variant) && (
          <p className="pop-in mt-2 text-xs text-ink-2">The internals changed. Your code did not have to.</p>
        )}
      </div>

      {props.swap && machine.variants.length > 1 && (
        <div className="mt-4">
          <Caption>
            <Wrench className="mr-1 inline h-3 w-3" />
            The mechanic swaps what&apos;s inside
          </Caption>
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-2 p-1" role="radiogroup" aria-label="Engine">
            {machine.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={v.id === variant.id}
                disabled={locked}
                onClick={() => swapTo(v.id)}
                className={`h-10 rounded-lg text-[0.82rem] font-medium transition-colors ${v.id === variant.id ? "bg-surface text-ink shadow-[var(--shadow)]" : "text-ink-3 hover:text-ink"}`}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* internals */}
      <div className="mt-4 rounded-2xl border border-dashed border-[var(--line-strong)] bg-surface-2">
        <button type="button" onClick={toggleHood} className="flex min-h-11 w-full items-center justify-between gap-2 px-4 py-2 text-left font-medium" aria-expanded={open}>
          <span>{open ? "Under the hood" : "Open the hood"}</span>
          <span className="flex items-center gap-1.5 text-xs text-ink-3">
            {open ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {open ? "Hide internals" : "Show internals"}
          </span>
        </button>
        {!open && lastSteps.length > 0 && (
          <p key={state.calls.length} className="pop-in px-4 pb-3 text-xs text-ink-3">
            {lastSteps.length} internal steps just ran. You didn&apos;t need to know about any of them.
          </p>
        )}
        {open && (
          <div className="px-4 pb-4">
            <p className="text-xs text-ink-3">Inside {machine.className} ({variant.label.toLowerCase()}): private parts no caller touches.</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {variant.parts.map((p) => (
                <span key={p} className={`rounded-md border px-2 py-1 text-xs transition-colors ${usedParts.has(p) ? "border-transparent bg-primary font-medium text-primary-ink" : "border-line bg-surface text-ink-3"}`}>
                  {p}
                </span>
              ))}
            </div>
            {lastSteps.length > 0 ? (
              <ol key={state.calls.length} className="mt-3 grid gap-1.5">
                <li className="font-mono text-xs text-ink-2">{machine.obj}.{last.method}() ran:</li>
                {lastSteps.map(([part, what], i) => (
                  <li key={i} className="pop-in flex gap-2 text-[0.82rem]" style={{ animationDelay: `${i * 90}ms` }}>
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-surface font-mono text-[0.65rem] text-ink-2">{i + 1}</span>
                    <span>
                      <span className="font-medium">{part}</span> <span className="text-ink-2">{what}</span>
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-xs text-ink-3">Press a button above and watch which parts work.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function checkHood(state: unknown, goal: Record<string, unknown>) {
  const s = state as HoodState | undefined;
  if (!s) return false;
  if (goal.hoodOpened === true && !s.hoodOpened) return false;
  if (Array.isArray(goal.called) && !goal.called.every((m) => s.calls.some((c) => c.method === m))) return false;
  if (Array.isArray(goal.calledIn)) {
    const method = typeof goal.method === "string" ? goal.method : null;
    if (!goal.calledIn.every((v) => s.calls.some((c) => c.variant === v && (!method || c.method === method)))) return false;
  }
  return true;
}
