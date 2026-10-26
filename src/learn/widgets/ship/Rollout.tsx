"use client";

import React, { useState } from "react";
import { FastForward, RotateCcw, ShieldAlert, StepForward } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Segmented, Toggle, useReport } from "./kit";

/**
 * Three ways to put version 2 in front of users: rolling (replace instances a few at a time),
 * blue-green (build a whole second fleet, then flip the router) and canary (send a small slice of
 * traffic first, widen it in stages). Version 2 can be healthy or carry a bug that fails 8% of the
 * requests it serves; an optional automatic gate halts and reverts when its error rate passes 2%.
 * Each frame is one monitoring interval with 1,000 requests in it.
 */

export type Strategy = "rolling" | "bluegreen" | "canary";

interface Frame {
  v1: number;
  v2: number;
  /** Share of traffic going to v2 (0 to 1). */
  traffic: number;
  title: string;
  text: string;
  /** Requests that fail in this interval. */
  bad: number;
  tripped?: boolean;
}

const PER_FRAME = 1000;
const BUG_RATE = 0.08;
const FLEET = 10;

export function buildFrames(strategy: Strategy, bug: boolean, gate: boolean): Frame[] {
  const rate = bug ? BUG_RATE : 0;
  const tripNow = gate && bug;
  const frames: Frame[] = [{ v1: FLEET, v2: 0, traffic: 0, title: "Everything runs version 1", text: "Ten instances serve all traffic.", bad: 0 }];
  const revert = (text: string): Frame => ({ v1: FLEET, v2: 0, traffic: 0, title: "Gate trips: back to version 1", text, bad: 0, tripped: true });

  if (strategy === "bluegreen") {
    frames.push({ v1: FLEET, v2: FLEET, traffic: 0, title: "Start the green fleet", text: "Ten version-2 instances start beside the ten old ones. No user traffic reaches them yet.", bad: 0 });
    frames.push({ v1: FLEET, v2: FLEET, traffic: 0, title: "Smoke test green", text: "A handful of synthetic requests pass. The bug only appears with real data, so the smoke test cannot see it.", bad: 0 });
    frames.push({ v1: FLEET, v2: FLEET, traffic: 1, title: "Flip the router: 100% to green", text: "All users move to version 2 at once.", bad: PER_FRAME * rate });
    if (tripNow) frames.push(revert("The error rate on green is 8%, above the 2% gate. The router flips back to blue, which is still running, in seconds."));
    else frames.push({ v1: FLEET, v2: FLEET, traffic: 1, title: "Watch, keep blue as a fallback", text: bug ? "Without a gate, nobody is told to act: 8% of requests keep failing until a person notices." : "Error rates stay flat. Blue stays up for a while as an instant way back, then is retired.", bad: PER_FRAME * rate });
    return frames;
  }

  const shares = strategy === "rolling" ? [0.2, 0.4, 0.6, 0.8, 1] : [0.05, 0.25, 0.5, 1];
  for (let i = 0; i < shares.length; i++) {
    const share = shares[i];
    const v2 = strategy === "rolling" ? Math.round(share * FLEET) : Math.max(1, Math.round(share * FLEET));
    const pct = Math.round(share * 100);
    const title = strategy === "rolling" ? `Replace instances: ${v2} of ${FLEET} on version 2` : `Canary at ${pct}% of traffic`;
    const text =
      strategy === "rolling"
        ? "Two more old instances are drained and replaced by new ones; the load balancer spreads traffic evenly."
        : share === 1
          ? "The canary has been healthy at every stage, so everyone moves to version 2."
          : `${pct}% of requests are routed to version 2. The rest stay on version 1.`;
    frames.push({ v1: FLEET - v2, v2, traffic: share, title, text, bad: PER_FRAME * share * rate });
    if (tripNow && i === 0) {
      frames.push(revert(`Version 2's error rate is 8%, above the 2% gate, so the rollout halts and reverts after only ${pct}% of traffic was exposed.`));
      return frames;
    }
  }
  return frames;
}

const NAMES: Record<Strategy, string> = { rolling: "Rolling", bluegreen: "Blue-green", canary: "Canary" };
const EXTRA: Record<Strategy, string> = { rolling: "+2 instances while rolling", bluegreen: "+10 (a whole second fleet)", canary: "+1 canary instance" };

export interface RolloutProps {
  strategy?: Strategy;
  bug?: boolean;
  gate?: boolean;
  lockStrategy?: boolean;
  lockBug?: boolean;
}

export interface RolloutState {
  strategy: Strategy;
  bug: boolean;
  gate: boolean;
  finished: boolean;
  aborted: boolean;
  badTotal: number;
  frame: number;
}

export function Rollout({ props, onChange, revealed }: WidgetProps<RolloutProps>) {
  const [strategy, setStrategy] = useState<Strategy>(props.strategy ?? "rolling");
  const [bug, setBug] = useState(props.bug ?? true);
  const [gate, setGate] = useState(props.gate ?? false);
  const [at, setAt] = useState(0);
  const frames = buildFrames(strategy, bug, gate);
  const last = frames.length - 1;
  const i = Math.min(at, last);
  const f = frames[i];
  const badTotal = Math.round(frames.slice(0, i + 1).reduce((a, x) => a + x.bad, 0));
  const finished = i === last;
  const aborted = frames.slice(0, i + 1).some((x) => x.tripped);
  const errNow = f.tripped ? 0 : Math.round(f.traffic * (bug ? BUG_RATE : 0) * 1000) / 10;
  useReport(onChange, { strategy, bug, gate, finished, aborted, badTotal, frame: i } satisfies RolloutState, `${strategy}|${bug}|${gate}|${i}`);

  const reset = (fn: () => void) => {
    fn();
    setAt(0);
  };
  const v2Ready = f.v2 > 0;

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center justify-center gap-2">
        {!props.lockStrategy && (
          <Segmented
            label="Deploy strategy"
            value={strategy}
            disabled={revealed}
            onChange={(s) => reset(() => setStrategy(s))}
            options={(Object.keys(NAMES) as Strategy[]).map((id) => ({ id, label: NAMES[id] }))}
          />
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        {!props.lockBug && (
          <Toggle on={bug} onClick={() => reset(() => setBug(!bug))} disabled={revealed}>
            Version 2 has a bug (8% of its requests fail)
          </Toggle>
        )}
        <Toggle on={gate} onClick={() => reset(() => setGate(!gate))} disabled={revealed}>
          Automatic gate (halt if version 2&apos;s errors &gt; 2%)
        </Toggle>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
        <Fleet label="Version 1" count={f.v1} dim={strategy === "bluegreen" && f.traffic === 1} tone="old" />
        <div className="h-2" />
        <Fleet label="Version 2" count={f.v2} dim={strategy === "bluegreen" && v2Ready && f.traffic === 0} tone="new" bad={bug} />
        <div className="mt-3">
          <Caption>Where the users&apos; requests go</Caption>
          <div className="mt-1 flex h-5 overflow-hidden rounded bg-surface">
            <div className="h-full bg-[var(--line-strong)] transition-all duration-300" style={{ width: `${(1 - f.traffic) * 100}%` }} />
            <div className={`h-full transition-all duration-300 ${bug ? "bg-[repeating-linear-gradient(135deg,rgba(220,38,38,0.7)_0_3px,rgba(220,38,38,0.35)_3px_6px)]" : "bg-primary"}`} style={{ width: `${f.traffic * 100}%` }} />
          </div>
          <div className="mt-0.5 flex justify-between font-mono text-[10.5px] text-ink-3">
            <span>v1 {Math.round((1 - f.traffic) * 100)}%</span>
            <span>v2 {Math.round(f.traffic * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3" aria-live="polite">
        <p className="flex items-center gap-2 text-sm font-semibold text-ink">
          {f.tripped && <ShieldAlert className="h-4 w-4 shrink-0 text-bad" />}
          <span className="font-mono text-xs text-ink-3">{i + 1}/{frames.length}</span> {f.title}
        </p>
        <p className="mt-1 text-[13px] leading-snug text-ink-2">{f.text}</p>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary !h-10" onClick={() => setAt(i + 1)} disabled={revealed || finished}>
          <StepForward className="h-4 w-4" /> Next interval
        </button>
        <button type="button" className="btn !h-10" onClick={() => setAt(last)} disabled={revealed || finished}>
          <FastForward className="h-4 w-4" /> Run to the end
        </button>
        <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" onClick={() => setAt(0)} disabled={revealed || i === 0} aria-label="Replay" title="Replay">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Readout label="Overall error rate now" value={`${errNow}%`} accent={errNow === 0} />
        <Readout label="Failed requests so far" value={badTotal} />
        <Readout label="Extra capacity" value={EXTRA[strategy]} />
      </div>
      {finished && (
        <Note tone={aborted || !bug ? "good" : "bad"} className="pop-in mt-2">
          {aborted
            ? `Halted automatically. ${badTotal} requests failed in total, and users are back on a version that works.`
            : bug
              ? `The bad version is live for everyone, and ${badTotal} requests have already failed. The strategy only controlled how fast the damage spread, not whether anyone stopped it.`
              : "A healthy version reached everyone with no errors."}
        </Note>
      )}
    </div>
  );
}

function Fleet({ label, count, dim, tone, bad }: { label: string; count: number; dim?: boolean; tone: "old" | "new"; bad?: boolean }) {
  return (
    <div>
      <Caption>
        {label} <span className="ml-1 normal-case tracking-normal text-ink-3">{count} instance{count === 1 ? "" : "s"}{dim ? (tone === "new" ? " (idle)" : " (standing by)") : ""}</span>
      </Caption>
      <div className="mt-1 grid grid-cols-10 gap-1">
        {Array.from({ length: FLEET }, (_, k) => {
          const on = k < count;
          const cls = !on
            ? "border border-dashed border-[var(--line-strong)]"
            : tone === "old"
              ? "bg-[var(--line-strong)]"
              : bad
                ? "bg-[var(--bad)]/75"
                : "bg-primary";
          return <span key={k} className={`h-6 rounded transition-colors ${cls} ${on && dim ? "opacity-40" : ""}`} />;
        })}
      </div>
    </div>
  );
}

/** goal: { finished, maxBad, strategy, aborted } */
export function checkRollout(state: unknown, goal: Record<string, unknown>) {
  const s = state as RolloutState | undefined;
  if (!s) return false;
  if (goal.finished === true && !s.finished) return false;
  if (typeof goal.maxBad === "number" && s.badTotal > goal.maxBad) return false;
  if (typeof goal.strategy === "string" && s.strategy !== goal.strategy) return false;
  if (typeof goal.aborted === "boolean" && s.aborted !== goal.aborted) return false;
  if (typeof goal.bug === "boolean" && s.bug !== goal.bug) return false;
  if (typeof goal.gate === "boolean" && s.gate !== goal.gate) return false;
  return ["finished", "maxBad", "strategy", "aborted", "bug", "gate"].some((k) => k in goal);
}
