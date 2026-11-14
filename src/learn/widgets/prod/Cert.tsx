"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { certEffort, certPlan, type CertInput } from "./logic";
import { Caption, Choice, Meter, Note, Readout, Seg, Toy } from "./ui";

export interface CertProps {
  radio?: CertInput["radio"];
  power?: CertInput["power"];
  markets?: string[];
}

export interface CertState {
  radio: CertInput["radio"];
  power: CertInput["power"];
  markets: string[];
  items: number;
  effort: number;
  moduleSaves: boolean;
  needsTransport: boolean;
}

const MARKETS = [
  { id: "us", label: "US (FCC)" },
  { id: "eu", label: "EU (CE / RED)" },
  { id: "uk", label: "UK (UKCA)" },
  { id: "ca", label: "Canada (ISED)" },
];

/** A certification planner for Sprout: choose radio, battery and markets, and see what has to be tested and what a pre-certified module saves. */
export function Cert({ props, onChange }: WidgetProps<CertProps>) {
  const [radio, setRadio] = useState<CertInput["radio"]>(props.radio ?? "module");
  const [power, setPower] = useState<CertInput["power"]>(props.power ?? "coin");
  const [markets, setMarkets] = useState<string[]>(props.markets ?? ["us"]);

  const compute = (r: CertInput["radio"], p: CertInput["power"], m: string[]): CertState => {
    const items = certPlan({ radio: r, power: p, markets: m.length });
    return { radio: r, power: p, markets: m, items: items.length, effort: certEffort(items), moduleSaves: r === "module", needsTransport: items.some((i) => i.id === "transport") };
  };
  const st = compute(radio, power, markets);
  const items = certPlan({ radio, power, markets: markets.length });
  const worst = certPlan({ radio: "chipdown", power: "liion", markets: 4 });
  const maxEffort = certEffort(worst);

  const upd = (r: CertInput["radio"], p: CertInput["power"], m: string[]) => {
    setRadio(r);
    setPower(p);
    setMarkets(m);
    onChange?.(compute(r, p, m));
  };
  const toggle = (id: string) => {
    const next = markets.includes(id) ? markets.filter((x) => x !== id) : [...markets, id];
    if (next.length === 0) return;
    upd(radio, power, next);
  };

  return (
    <div className="w-full" data-widget>
      <div className="space-y-3">
        <div>
          <Caption>Radio</Caption>
          <div role="radiogroup" aria-label="Radio" className="mt-1 grid gap-1.5 sm:grid-cols-2">
            <Choice selected={radio === "module"} onClick={() => upd("module", power, markets)} title="Pre-certified module" sub="Its radio test results come with it" />
            <Choice selected={radio === "chipdown"} onClick={() => upd("chipdown", power, markets)} title="Chip-down radio" sub="Your own antenna and radio design" />
          </div>
        </div>
        <div>
          <Caption>Battery</Caption>
          <Seg
            label="Battery"
            value={power}
            onChange={(v) => upd(radio, v, markets)}
            options={[
              { value: "aa", label: "2 × AA alkaline" },
              { value: "coin", label: "Lithium coin cell" },
              { value: "liion", label: "Rechargeable Li-ion" },
            ]}
            className="mt-1"
          />
        </div>
        <div>
          <Caption>Where you will sell it</Caption>
          <div role="group" aria-label="Markets" className="mt-1 flex flex-wrap gap-1.5">
            {MARKETS.map((m) => {
              const on = markets.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(m.id)}
                  className={`min-h-10 rounded-full border px-3.5 text-xs font-medium transition-colors ${on ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface text-ink-2 hover:bg-surface-2"}`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((it) => (
          <li key={it.id} className="rounded-xl border border-line bg-surface p-3">
            <p className="text-[0.9rem] font-medium text-ink">{it.title}</p>
            <p className="mt-0.5 text-[0.84rem] leading-snug text-ink-2">{it.detail}</p>
            {it.saves && (
              <p className="mt-1.5 rounded-lg border border-[var(--good)]/50 bg-tint px-2.5 py-1.5 text-[0.82rem] leading-snug text-ink">
                <strong>Module saves this.</strong> {it.saves}
              </p>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Readout label="Things to plan" value={st.items} />
        <Readout label="Effort points" value={st.effort} accent />
      </div>
      <div className="mt-2">
        <Meter frac={st.effort / maxEffort} tone={st.effort > maxEffort * 0.6 ? "bad" : "brand"} label="Relative certification effort" />
      </div>
      <div className="mt-3">
        <Note>Your own board still needs testing for EMC even with a module. Use a pre-compliance test early, then book a test lab for the real thing, and ask the lab which rules apply to your exact product.</Note>
      </div>
      <Toy>An illustration, not legal or compliance advice. Standards and requirements differ by product, market and date, and change over time. Effort points are made-up relative units (not weeks or money) just to compare plans.</Toy>
    </div>
  );
}

/** goal: { radio?, power?, minMarkets?, maxEffort?, noTransport? }. */
export function checkCert(state: unknown, goal: Record<string, unknown>) {
  const s = state as CertState | undefined;
  if (!s) return false;
  if (typeof goal.radio === "string" && s.radio !== goal.radio) return false;
  if (typeof goal.power === "string" && s.power !== goal.power) return false;
  if (typeof goal.minMarkets === "number" && s.markets.length < goal.minMarkets) return false;
  if (typeof goal.maxEffort === "number" && s.effort > goal.maxEffort) return false;
  if (goal.noTransport === true && s.needsTransport) return false;
  return true;
}
