"use client";

import React, { useState } from "react";
import { Check, ShieldAlert, X } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Mono, Tag } from "./ui";

/**
 * The clinic app depends on a small package, pocket-dates. Over four days a malicious release
 * appears, a mirror serves tampered files, and a fix lands. Three ways of installing it behave very
 * differently on each day: tap a cell to see what a build on that day would run.
 */

type Day = "mon" | "tue" | "wed" | "thu";
type Policy = "range" | "lock" | "hash";

const DAYS: { id: Day; label: string; event: string }[] = [
  { id: "mon", label: "Mon", event: "Latest is 2.3.1. Nothing unusual." },
  { id: "tue", label: "Tue", event: "A hijacked maintainer account publishes 2.3.2 with a hidden data stealer." },
  { id: "wed", label: "Wed", event: "A compromised mirror serves altered files for 2.3.1. The version number looks right." },
  { id: "thu", label: "Thu", event: "The maintainers yank 2.3.2 and publish a clean 2.3.3." },
];

const POLICIES: { id: Policy; name: string; how: string }[] = [
  { id: "range", name: "Version range, no lockfile", how: '"pocket-dates": "^2.3.0" and every build resolves the newest match' },
  { id: "lock", name: "Lockfile with versions", how: "the build installs exactly the versions recorded last time (2.3.1)" },
  { id: "hash", name: "Lockfile with integrity hashes", how: "exact versions, plus a fingerprint of the files that must match" },
];

interface Outcome {
  version: string;
  bad: boolean;
  stopped?: boolean;
  text: string;
}

const OUTCOMES: Record<Policy, Record<Day, Outcome>> = {
  range: {
    mon: { version: "2.3.1", bad: false, text: "Picked the newest release in range: 2.3.1. Fine." },
    tue: { version: "2.3.2", bad: true, text: "Newest in range is now 2.3.2, so the stealer is built into your app and ships to production within the hour." },
    wed: { version: "2.3.2", bad: true, text: "Still resolves 2.3.2 (and trusts whatever the mirror hands over)." },
    thu: { version: "2.3.3", bad: false, text: "Newest in range is the clean 2.3.3. You were lucky to be exposed only by timing." },
  },
  lock: {
    mon: { version: "2.3.1", bad: false, text: "Installs the locked 2.3.1." },
    tue: { version: "2.3.1", bad: false, text: "The lockfile still says 2.3.1, so the new release is ignored until somebody chooses to upgrade." },
    wed: { version: "2.3.1", bad: true, text: "The right version number, the wrong files. With no fingerprint to compare against, the tampered package installs." },
    thu: { version: "2.3.1", bad: false, text: "Stays on 2.3.1. Safe, but you fall behind on fixes unless updates are done on purpose." },
  },
  hash: {
    mon: { version: "2.3.1", bad: false, text: "Installs 2.3.1 and the fingerprint matches." },
    tue: { version: "2.3.1", bad: false, text: "The locked version and its fingerprint are untouched by the new release." },
    wed: { version: "2.3.1", bad: false, stopped: true, text: "The files' fingerprint does not match the lockfile, so the install stops with an integrity error. Loud, and exactly right." },
    thu: { version: "2.3.1", bad: false, text: "Stays on 2.3.1 until an update is reviewed and the lockfile changes in a pull request." },
  },
};

export interface SupplyLabProps {
  /** Which policies to show (default: all). */
  policies?: Policy[];
}

export interface SupplyLabState {
  explored: number;
  /** Cells explored where the build ended up running bad code. */
  compromised: number;
  sel: { policy: Policy; day: Day } | null;
}

export function SupplyLab({ props, onChange, revealed }: WidgetProps<SupplyLabProps>) {
  const policies = POLICIES.filter((p) => !props.policies || props.policies.includes(p.id));
  const [seen, setSeen] = useState<string[]>([]);
  const [sel, setSel] = useState<{ policy: Policy; day: Day } | null>(null);

  const pick = (policy: Policy, day: Day) => {
    const key = `${policy}:${day}`;
    const nextSeen = seen.includes(key) ? seen : [...seen, key];
    setSeen(nextSeen);
    const s = { policy, day };
    setSel(s);
    const compromised = nextSeen.filter((k) => {
      const [p, d] = k.split(":") as [Policy, Day];
      return OUTCOMES[p][d].bad;
    }).length;
    onChange?.({ explored: nextSeen.length, compromised, sel: s } satisfies SupplyLabState);
  };

  const o = sel ? OUTCOMES[sel.policy][sel.day] : null;
  const day = sel ? DAYS.find((d) => d.id === sel.day)! : null;

  return (
    <div className="w-full max-w-2xl">
      <ol className="grid gap-1 rounded-xl border border-line bg-surface-2 p-2.5 sm:grid-cols-2">
        {DAYS.map((d) => (
          <li key={d.id} className="flex gap-2 text-[12.5px] leading-snug text-ink-2">
            <span className="w-8 shrink-0 font-mono font-semibold text-ink">{d.label}</span>
            <span>{d.event}</span>
          </li>
        ))}
      </ol>

      <Caption className="mt-3 mb-1.5">Pick a policy and a day to build on</Caption>
      <div className="grid gap-2">
        {policies.map((p) => (
          <div key={p.id} className="rounded-xl border border-line bg-surface p-2.5">
            <p className="text-sm font-semibold text-ink">{p.name}</p>
            <p className="text-xs text-ink-3">{p.how}</p>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {DAYS.map((d) => {
                const done = seen.includes(`${p.id}:${d.id}`);
                const out = OUTCOMES[p.id][d.id];
                const on = sel?.policy === p.id && sel.day === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={revealed}
                    onClick={() => pick(p.id, d.id)}
                    aria-pressed={on}
                    className={`flex min-h-10 items-center justify-center gap-1 rounded-lg border px-1 text-sm font-medium transition-colors disabled:cursor-default ${
                      on ? "ring-2 ring-[var(--brand)]" : ""
                    } ${done ? (out.bad ? "border-[var(--bad)]/60 bg-[var(--bad)]/[0.08] text-ink" : "border-[var(--brand)]/50 bg-tint text-ink") : "border-line bg-surface-2 text-ink-2 hover:text-ink"}`}
                  >
                    {d.label}
                    {done && (out.bad ? <X className="h-3.5 w-3.5 text-bad" /> : <Check className="h-3.5 w-3.5 text-good" />)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 rounded-xl border border-line bg-surface p-3" aria-live="polite">
        {o && day && sel ? (
          <div className="pop-in grid gap-1.5" key={`${sel.policy}${sel.day}`}>
            <div className="flex flex-wrap items-center gap-2">
              <Tag tone={o.bad ? "bad" : o.stopped ? "warn" : "good"}>
                {o.bad ? <ShieldAlert className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                {o.bad ? "ships bad code" : o.stopped ? "build stopped" : "clean build"}
              </Tag>
              <span className="text-sm font-medium text-ink">
                {POLICIES.find((p) => p.id === sel.policy)!.name}, built on {day.label}
              </span>
            </div>
            <Mono>pocket-dates@{o.version}</Mono>
            <p className="text-[13px] leading-snug text-ink-2">{o.text}</p>
          </div>
        ) : (
          <p className="py-2 text-center text-sm text-ink-3">Tap a day under a policy.</p>
        )}
      </div>
    </div>
  );
}

export function checkSupplyLab(state: unknown, goal: Record<string, unknown>) {
  const st = state as SupplyLabState | undefined;
  if (!st) return false;
  if (typeof goal.explored === "number" && st.explored < goal.explored) return false;
  if (typeof goal.compromised === "number" && st.compromised < goal.compromised) return false;
  return true;
}
