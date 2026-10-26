"use client";

import React, { useState } from "react";
import { OctagonX, RefreshCw, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Slider, Toggle, shuffle, useReport } from "./kit";

/**
 * A hundred library members and one feature flag. Slide the rollout percentage and members light
 * up. With stable bucketing each member keeps the same answer on every page load, so raising the
 * dial only ever adds people; switch it to a fresh coin-flip per load and members flicker in and
 * out. The kill switch turns the feature off for everyone at once, with no deploy.
 */

const USERS = 100;
const STAFF = [6, 41, 77];

function buckets(seed: number): number[] {
  // a shuffled 0..99, so a rollout of p% enables exactly p members (a real hash is only close to this)
  return shuffle(Array.from({ length: USERS }, (_, i) => i), seed);
}

export interface FlagsProps {
  percent?: number;
  sticky?: boolean;
  staff?: boolean;
  /** Hide the sticky / staff switches. */
  basic?: boolean;
  flagName?: string;
}

export interface FlagsState {
  percent: number;
  killed: boolean;
  sticky: boolean;
  staff: boolean;
  enabled: number;
  reloads: number;
  flips: number;
}

export function Flags({ props, onChange, revealed }: WidgetProps<FlagsProps>) {
  const [percent, setPercent] = useState(props.percent ?? 0);
  const [killed, setKilled] = useState(false);
  const [sticky, setSticky] = useState(props.sticky ?? true);
  const [staff, setStaff] = useState(props.staff ?? false);
  const [reloads, setReloads] = useState(0);
  const flag = props.flagName ?? "new-renewal-flow";

  const stateFor = (r: number): boolean[] => {
    const b = buckets(sticky ? 1 : 1 + r);
    return b.map((bucket, u) => !killed && ((staff && STAFF.includes(u)) || bucket < percent));
  };
  const now = stateFor(reloads);
  const prev = reloads > 0 ? stateFor(reloads - 1) : now;
  const enabled = now.filter(Boolean).length;
  const flips = now.filter((v, u) => v !== prev[u]).length;
  useReport(onChange, { percent, killed, sticky, staff, enabled, reloads, flips } satisfies FlagsState, `${percent}|${killed}|${sticky}|${staff}|${reloads}`);

  const reset = () => {
    setPercent(props.percent ?? 0);
    setKilled(false);
    setReloads(0);
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2">
        <span className="font-mono text-[12.5px] font-semibold text-ink">{flag}</span>
        <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ${killed ? "bg-[var(--bad)] text-white" : "bg-surface text-ink-2 ring-1 ring-[var(--line)]"}`}>{killed ? "KILLED" : `${percent}% rollout`}</span>
        {!props.basic && staff && <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] text-ink-2 ring-1 ring-[var(--line)]">+ library staff</span>}
      </div>

      <div className="mt-3 max-w-md">
        <Slider label="Share of members who get the new flow" value={percent} min={0} max={100} step={5} format={(v) => `${v}%`} onChange={setPercent} disabled={revealed || killed} />
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        {!props.basic && (
          <>
            <Toggle on={sticky} onClick={() => setSticky(!sticky)} disabled={revealed}>
              Same answer on every visit
            </Toggle>
            <Toggle on={staff} onClick={() => setStaff(!staff)} disabled={revealed}>
              Staff always see it
            </Toggle>
          </>
        )}
        <button type="button" className="btn !h-10" onClick={() => setReloads(reloads + 1)} disabled={revealed}>
          <RefreshCw className="h-4 w-4" /> Everyone reloads
        </button>
        <button
          type="button"
          onClick={() => setKilled(!killed)}
          disabled={revealed}
          className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors disabled:opacity-50 ${killed ? "border-transparent bg-[var(--bad)] text-white" : "border-[var(--bad)]/60 text-bad hover:bg-[var(--bad)]/10"}`}
        >
          <OctagonX className="h-4 w-4" /> {killed ? "Kill switch is on" : "Kill switch"}
        </button>
        <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" onClick={reset} disabled={revealed} aria-label="Reset" title="Reset">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <Caption>100 members. Lit = sees the new flow</Caption>
        <div className="mt-2 grid grid-cols-10 gap-1">
          {now.map((on, u) => (
            <span
              key={u}
              title={`member ${u + 1}${staff && STAFF.includes(u) ? " (staff)" : ""}: ${on ? "new flow" : "old flow"}`}
              className={`grid aspect-square place-items-center rounded-md text-[9px] font-mono transition-colors ${on ? "bg-primary text-primary-ink" : "bg-surface-2 text-ink-3"} ${staff && STAFF.includes(u) ? "ring-2 ring-inset ring-[var(--brand)]" : ""} ${reloads > 0 && now[u] !== prev[u] ? "outline outline-2 outline-[var(--bad)]" : ""}`}
            >
              {u + 1}
            </span>
          ))}
        </div>
        {reloads > 0 && <p className="mt-2 text-[11.5px] text-ink-3">Red outline: this member got a different answer than on the previous load.</p>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" aria-live="polite">
        <Readout label="See the new flow" value={enabled} accent />
        <Readout label="Out of reach of a bug in it" value={USERS - enabled} />
        {reloads > 0 && <Readout label="Changed their answer" value={flips} />}
      </div>
      <Note className="mt-2">
        {killed
          ? "One switch, no deploy, no waiting for a build: the code is still shipped but nobody runs it."
          : sticky
            ? "Each member has a fixed place in the 0 to 99 line-up, and the dial chooses where it cuts. Going from 20% to 40% keeps the first 20 and adds 20 more."
            : "Each page load re-rolls the dice. At 50%, about half of everyone changes their mind on every reload, which is a confusing product and useless for comparing groups."}
      </Note>
    </div>
  );
}

/** goal: { enabled?, percent?, killed?, minFlips0?: true (sticky and reloaded), sticky? } */
export function checkFlags(state: unknown, goal: Record<string, unknown>) {
  const s = state as FlagsState | undefined;
  if (!s) return false;
  if (typeof goal.enabled === "number" && s.enabled !== goal.enabled) return false;
  if (typeof goal.percent === "number" && s.percent !== goal.percent) return false;
  if (typeof goal.killed === "boolean" && s.killed !== goal.killed) return false;
  if (typeof goal.sticky === "boolean" && s.sticky !== goal.sticky) return false;
  if (goal.reloaded === true && s.reloads < 1) return false;
  if (typeof goal.minFlips === "number" && s.flips < goal.minFlips) return false;
  if (typeof goal.maxFlips === "number" && s.flips > goal.maxFlips) return false;
  return ["enabled", "percent", "killed", "sticky", "reloaded", "minFlips", "maxFlips"].some((k) => k in goal);
}
