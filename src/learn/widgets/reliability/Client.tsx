"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Pill, Readout, useInitialReport } from "./ui";
import { CLIENT, num, simClient, type Scenario, type Toggles } from "./sim";

/**
 * Chaos test for a client. 200 shoppers' requests (one every 0.2 s) go through a client that calls
 * a flaky dependency. Pick a kind of trouble, switch protections on and off, and watch every request
 * turn green (served), amber (served from a saved copy) or red (an error).
 */

const SCENARIOS: { id: Scenario; label: string; blurb: string }[] = [
  { id: "flaky", label: "Flaky: 3 in 10 calls fail", blurb: "Every call has a 30% chance of failing quickly, all the time." },
  { id: "slow", label: "Slow spell", blurb: "From second 10 to 25 every answer takes 4 s to arrive. Nothing fails; it is just slow." },
  { id: "outage", label: "Outage", blurb: "From second 10 to 25 every call is refused at once." },
  { id: "hang", label: "Hang", blurb: "From second 10 to 25 the dependency accepts calls and never answers." },
];

const TOGGLES: { id: keyof Toggles; label: string }[] = [
  { id: "timeout", label: "Timeout 0.5 s" },
  { id: "retry", label: "Retries with jitter" },
  { id: "breaker", label: "Circuit breaker" },
  { id: "fallback", label: "Saved-copy fallback" },
];

export interface ClientState {
  scenario: Scenario;
  toggles: Toggles;
  served: number;
  errors: number;
  amplification: number;
}

const CELL: Record<string, string> = { ok: "bg-[var(--brand)]", fallback: "bg-[#e0a43a]", error: "bg-[var(--bad)]" };

export function Client({ props, onChange }: WidgetProps<{ scenario?: Scenario; toggles?: Partial<Toggles>; hideScenarios?: boolean }>) {
  const [scenario, setScenario] = useState<Scenario>(props.scenario ?? "outage");
  const [tg, setTg] = useState<Toggles>({ timeout: false, retry: false, breaker: false, fallback: false, ...props.toggles });
  const r = simClient(scenario, tg);
  const sc = SCENARIOS.find((s) => s.id === scenario) ?? SCENARIOS[0];

  const emit = (s: Scenario, t: Toggles) => {
    const x = simClient(s, t);
    onChange?.({ scenario: s, toggles: t, served: x.okPct, errors: x.errors, amplification: x.amplification } satisfies ClientState);
  };
  useInitialReport(() => emit(scenario, tg));

  return (
    <div className="w-full max-w-2xl">
      {!props.hideScenarios && (
        <>
          <Caption>The dependency has…</Caption>
          <div className="mt-2 flex flex-wrap gap-2">
            {SCENARIOS.map((s) => (
              <Pill
                key={s.id}
                on={scenario === s.id}
                onClick={() => {
                  setScenario(s.id);
                  emit(s.id, tg);
                }}
              >
                {s.label}
              </Pill>
            ))}
          </div>
          <p className="mt-2 text-sm text-ink-2">{sc.blurb}</p>
        </>
      )}

      <Caption className="mt-4">Protections</Caption>
      <div className="mt-2 flex flex-wrap gap-2">
        {TOGGLES.map((t) => (
          <Pill
            key={t.id}
            on={tg[t.id]}
            onClick={() => {
              const n = { ...tg, [t.id]: !tg[t.id] };
              setTg(n);
              emit(scenario, n);
            }}
          >
            {t.label}
          </Pill>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-line bg-surface p-2.5">
        <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(40, minmax(0, 1fr))" }} role="img" aria-label={`${r.outcomes.filter((o) => o === "ok").length} answered, ${r.fallbacks} from a saved copy, ${r.errors} errors`}>
          {r.outcomes.map((o, i) => {
            const trouble = scenario !== "flaky" && i >= r.badFrom && i < r.badTo;
            return <span key={i} className={`aspect-square rounded-[2px] ${CELL[o]} ${trouble ? "ring-1 ring-ink-3 ring-offset-1 ring-offset-[var(--surface)]" : ""}`} />;
          })}
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-2">
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-[2px] bg-[var(--brand)]" /> answered</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-[2px] bg-[#e0a43a]" /> saved copy</span>
          <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-[2px] bg-[var(--bad)]" /> error</span>
          {scenario !== "flaky" && <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-[2px] bg-surface-2 ring-1 ring-ink-3" /> sent during the trouble</span>}
          <span className="text-ink-3">· one square per shopper, in order</span>
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Shoppers served" value={`${Math.round(r.okPct * 100)}%`} accent={r.okPct >= 0.95} />
        <Readout label="Errors" value={r.errors} accent={r.errors === 0} />
        <Readout label="Calls per shopper" value={num(r.amplification, 2)} accent={r.amplification <= 1.3} />
        <Readout label="Slowest 5% wait" value={`${num(r.p95)} s`} />
      </div>
      <div className="mt-3" aria-live="polite">
        <Note>{summary(scenario, tg, r.okPct, r.amplification)}</Note>
      </div>
    </div>
  );
}

function summary(scn: Scenario, tg: Toggles, okPct: number, amp: number): string {
  const on = [tg.timeout, tg.retry, tg.breaker, tg.fallback].filter(Boolean).length;
  if (on === 0) return `With no protection shoppers wait out the full ${CLIENT.patience / 10} s whenever the dependency stalls, and every failure is a visible error.`;
  if (scn === "flaky" && tg.retry && okPct > 0.97) return "Retries are the right tool for random, short failures: a call that fails 30% of the time succeeds on one of three tries 97% of the time.";
  if (tg.fallback && okPct > 0.99) return "Every shopper got something. Notice that only the saved-copy fallback helped during the long trouble: timeouts, retries and the breaker keep you fast and gentle, but they cannot make a dead dependency answer.";
  if (tg.retry && !tg.breaker && amp > 1.5) return `Retries make ${num(amp, 2)} calls per shopper. Against a dependency that is down or stuck, that is extra load for no benefit. A breaker would cut it.`;
  if (tg.breaker && amp < 1) return "The breaker stops sending calls while the dependency is down, so the dependency gets a rest, and shoppers get their error instantly instead of after a wait.";
  return "Try the other protections. Each one solves a different problem.";
}

export function checkClient(state: unknown, goal: Record<string, unknown>) {
  const st = state as ClientState | undefined;
  if (!st) return false;
  if (goal.scenario !== undefined && st.scenario !== goal.scenario) return false;
  if (typeof goal.minServed === "number" && st.served < goal.minServed) return false;
  if (typeof goal.maxAmplification === "number" && st.amplification > goal.maxAmplification) return false;
  if (typeof goal.maxErrors === "number" && st.errors > goal.maxErrors) return false;
  for (const k of ["timeout", "retry", "breaker", "fallback"] as const) {
    if (typeof goal[k] === "boolean" && st.toggles[k] !== goal[k]) return false;
  }
  return true;
}
