"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Slider, Toggle, useReport } from "./kit";

/**
 * A new pod of a slow-starting app joins a service during a rollout. A liveness probe asks "is it
 * dead? restart it"; a readiness probe asks "may it take traffic yet?"; a startup probe holds
 * liveness off while the app boots. Three timelines show what the container does, who receives
 * traffic, and which requests failed, over three minutes.
 */

export interface ProbeConfig {
  startupSecs: number;
  liveDelay: number;
  liveThreshold: number;
  readiness: boolean;
  startupProbe: boolean;
}

type Cell = "starting" | "serving" | "killed";
interface Sec {
  cell: Cell;
  routed: boolean;
  failed: boolean;
  ok: boolean;
}

const HORIZON = 180;
const LIVE_PERIOD = 10;
const READY_PERIOD = 5;
const STARTUP_PERIOD = 5;
const STARTUP_MAX_FAILS = 18;

export function simulateProbes(c: ProbeConfig) {
  const secs: Sec[] = [];
  let age = 0;
  let restarts = 0;
  let liveFails = 0;
  let startFails = 0;
  let startupDone = false;
  let ready = false;
  let firstServing: number | null = null;
  let failed = 0;
  for (let t = 0; t < HORIZON; t++) {
    const up = age >= c.startupSecs;
    let kill = false;
    if (c.startupProbe && !startupDone && age % STARTUP_PERIOD === 0) {
      if (up) startupDone = true;
      else if (++startFails >= STARTUP_MAX_FAILS) kill = true;
    }
    const liveActive = !c.startupProbe || startupDone;
    if (liveActive && age >= c.liveDelay && (age - c.liveDelay) % LIVE_PERIOD === 0) {
      if (up) liveFails = 0;
      else if (++liveFails >= c.liveThreshold) kill = true;
    }
    if (age % READY_PERIOD === 0) ready = up;
    // one request a second; every other one is balanced onto the new pod, if the pod is allowed traffic
    const toNew = t % 2 === 0;
    const routed = toNew && (c.readiness ? ready && !kill : true);
    const fail = routed && (!up || kill);
    if (fail) failed++;
    secs.push({ cell: kill ? "killed" : up ? "serving" : "starting", routed: c.readiness ? ready : true, failed: fail, ok: routed && !fail });
    if (up && !kill && firstServing === null) firstServing = t;
    if (kill) {
      restarts++;
      age = 0;
      liveFails = 0;
      startFails = 0;
      startupDone = false;
      ready = false;
    } else age++;
  }
  return { secs, restarts, failed, firstServing };
}

export interface ProbesProps extends Partial<ProbeConfig> {
  lock?: ("startupSecs" | "liveDelay" | "liveThreshold" | "readiness" | "startupProbe")[];
}

export interface ProbesState extends ProbeConfig {
  restarts: number;
  failed: number;
  firstServing: number | null;
}

export function Probes({ props, onChange, revealed }: WidgetProps<ProbesProps>) {
  const [startupSecs, setStartup] = useState(props.startupSecs ?? 45);
  const [liveDelay, setDelay] = useState(props.liveDelay ?? 10);
  const [liveThreshold, setThreshold] = useState(props.liveThreshold ?? 3);
  const [readiness, setReadiness] = useState(props.readiness ?? false);
  const [startupProbe, setStartupProbe] = useState(props.startupProbe ?? false);
  const cfg: ProbeConfig = { startupSecs, liveDelay, liveThreshold, readiness, startupProbe };
  const sim = simulateProbes(cfg);
  const lock = (k: NonNullable<ProbesProps["lock"]>[number]) => revealed || Boolean(props.lock?.includes(k));
  useReport(onChange, { ...cfg, restarts: sim.restarts, failed: sim.failed, firstServing: sim.firstServing } satisfies ProbesState, JSON.stringify(cfg));

  const loop = sim.restarts >= 2 && sim.firstServing === null;
  const cellCls: Record<Cell, string> = {
    starting: "bg-[repeating-linear-gradient(135deg,rgba(245,158,11,0.6)_0_3px,rgba(245,158,11,0.2)_3px_6px)]",
    serving: "bg-primary",
    killed: "bg-[var(--bad)]",
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="grid gap-x-4 gap-y-1 min-[560px]:grid-cols-2">
        <Slider label="App takes this long to start" value={startupSecs} min={10} max={90} step={5} format={(v) => `${v}s`} onChange={setStartup} disabled={lock("startupSecs")} />
        <Slider label="Liveness: wait before first check" value={liveDelay} min={0} max={60} step={5} format={(v) => `${v}s`} onChange={setDelay} disabled={lock("liveDelay")} />
        <Slider label="Liveness: failures in a row = restart" value={liveThreshold} min={1} max={6} format={(v) => `${v}`} onChange={setThreshold} disabled={lock("liveThreshold")} />
        <div className="flex flex-wrap content-center gap-2 pt-1">
          <Toggle on={readiness} onClick={() => setReadiness(!readiness)} disabled={lock("readiness")}>
            Readiness probe
          </Toggle>
          <Toggle on={startupProbe} onClick={() => setStartupProbe(!startupProbe)} disabled={lock("startupProbe")}>
            Startup probe
          </Toggle>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <Caption>The new pod&apos;s container</Caption>
        <div className="mt-1.5 flex h-5 overflow-hidden rounded bg-surface-2">
          {sim.secs.map((s, i) => (
            <span key={i} className={`h-full flex-1 ${cellCls[s.cell]}`} />
          ))}
        </div>
        <Caption className="mt-3">Is the pod in the load balancer?</Caption>
        <div className="mt-1.5 flex h-3 overflow-hidden rounded bg-surface-2">
          {sim.secs.map((s, i) => (
            <span key={i} className={`h-full flex-1 ${s.routed ? "bg-ink-3/60" : ""}`} />
          ))}
        </div>
        <Caption className="mt-3">Requests that reached it and failed</Caption>
        <div className="mt-1.5 flex h-5 items-end overflow-hidden rounded bg-surface-2">
          {sim.secs.map((s, i) => (
            <span key={i} className={`flex-1 ${s.failed ? "h-full bg-[var(--bad)]" : s.ok ? "h-1 bg-primary/70" : "h-0"}`} />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[10px] text-ink-3">
          <span>0s</span>
          <span>1 min</span>
          <span>2 min</span>
          <span>3 min</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-3">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[repeating-linear-gradient(135deg,rgba(245,158,11,0.6)_0_3px,rgba(245,158,11,0.2)_3px_6px)]" /> starting up</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-primary" /> serving</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-[var(--bad)]" /> killed and restarted</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" aria-live="polite">
        <Readout label="Restarts" value={sim.restarts} accent={sim.restarts === 0} />
        <Readout label="Failed requests" value={sim.failed} accent={sim.failed === 0} />
        <Readout label="First served at" value={sim.firstServing === null ? "never" : `${sim.firstServing}s`} />
      </div>
      <Note tone={loop ? "bad" : sim.restarts === 0 && sim.failed === 0 ? "good" : "neutral"} className="mt-2">
        {loop
          ? `Crash loop. The first liveness check runs at ${liveDelay}s and ${liveThreshold} misses in a row (every ${LIVE_PERIOD}s) kill the container at about ${liveDelay + (liveThreshold - 1) * LIVE_PERIOD}s. The app needs ${startupSecs}s, so it is killed every time just before it is ready.`
          : sim.restarts > 0
            ? `The container was killed ${sim.restarts} time${sim.restarts === 1 ? "" : "s"} before it finally got through its start-up.`
            : sim.failed > 0
              ? `Nothing restarted, but the pod was in the load balancer from the first second, so ${sim.failed} requests landed on an app that was still loading.`
              : "The app starts at its own pace, only gets traffic once it answers, and nobody sees an error."}
      </Note>
    </div>
  );
}

/** goal: { maxRestarts, maxFailed } */
export function checkProbes(state: unknown, goal: Record<string, unknown>) {
  const s = state as ProbesState | undefined;
  if (!s) return false;
  if (typeof goal.maxRestarts === "number" && s.restarts > goal.maxRestarts) return false;
  if (typeof goal.maxFailed === "number" && s.failed > goal.maxFailed) return false;
  if (goal.served === true && s.firstServing === null) return false;
  if (typeof goal.readiness === "boolean" && s.readiness !== goal.readiness) return false;
  return ["maxRestarts", "maxFailed", "served", "readiness"].some((k) => k in goal);
}
