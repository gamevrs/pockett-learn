"use client";

import React, { useState } from "react";
import { Minus, Network, Plus, RotateCcw, Server, StepForward, Zap } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, useReport } from "./kit";

/**
 * A toy orchestrator. You declare how many copies (replicas) of a service you want; a control loop
 * keeps comparing that with what is actually running and fixes the difference. Crash a pod or take
 * a whole machine down, then press Next tick and watch it notice, create replacements, place them
 * on healthy machines and wait for them to become ready. A Service sends traffic only to ready pods.
 */

type Phase = "pending" | "starting" | "ready" | "terminating";
interface Pod {
  id: number;
  node: string | null;
  phase: Phase;
}
interface NodeState {
  id: string;
  up: boolean;
}
export interface ClusterModel {
  desired: number;
  nodes: NodeState[];
  pods: Pod[];
  nextId: number;
  ticks: number;
  hadFailure: boolean;
  log: string[];
}

const podName = (p: Pod) => `web-${p.id}`;

export function initialCluster(desired: number): ClusterModel {
  const nodes = ["node-a", "node-b", "node-c"].map((id) => ({ id, up: true }));
  const pods: Pod[] = Array.from({ length: desired }, (_, i) => ({ id: i + 1, node: nodes[i % 3].id, phase: "ready" as Phase }));
  return { desired, nodes, pods, nextId: desired + 1, ticks: 0, hadFailure: false, log: ["Three pods are ready, spread over three machines."] };
}

/** One pass of the control loop: pods make progress, then the controller compares desired with actual. */
export function tick(m: ClusterModel): ClusterModel {
  const log: string[] = [];
  let pods: Pod[] = m.pods
    .filter((p) => p.phase !== "terminating")
    .map((p) => {
      if (p.phase === "starting") {
        log.push(`${podName(p)} passed its readiness check and joins the Service.`);
        return { ...p, phase: "ready" as Phase };
      }
      return p;
    });
  // the scheduler places pending pods on the up machine with the fewest pods
  const load: Record<string, number> = {};
  for (const n of m.nodes) load[n.id] = pods.filter((p) => p.node === n.id).length;
  pods = pods.map((p) => {
    if (p.phase !== "pending") return p;
    const up = m.nodes.filter((n) => n.up).sort((a, b) => load[a.id] - load[b.id] || a.id.localeCompare(b.id));
    if (!up.length) {
      log.push(`${podName(p)} cannot be scheduled: no machine is up.`);
      return p;
    }
    load[up[0].id] += 1;
    log.push(`Scheduler puts ${podName(p)} on ${up[0].id}; it starts up.`);
    return { ...p, node: up[0].id, phase: "starting" as Phase };
  });
  // the controller
  const live = pods.filter((p) => p.phase !== "terminating");
  let nextId = m.nextId;
  if (live.length < m.desired) {
    const add = m.desired - live.length;
    for (let i = 0; i < add; i++) pods.push({ id: nextId++, node: null, phase: "pending" });
    log.push(`Controller: wanted ${m.desired}, found ${live.length}. Creating ${add} pod${add === 1 ? "" : "s"}.`);
  } else if (live.length > m.desired) {
    const drop = live.length - m.desired;
    const rank = (p: Pod) => (p.phase === "pending" ? 0 : p.phase === "starting" ? 1 : 2);
    const victims = [...live].sort((a, b) => rank(a) - rank(b) || b.id - a.id).slice(0, drop);
    pods = pods.map((p) => (victims.includes(p) ? { ...p, phase: "terminating" as Phase } : p));
    log.push(`Controller: wanted ${m.desired}, found ${live.length}. Removing ${drop} pod${drop === 1 ? "" : "s"}.`);
  }
  if (!log.length) log.push("Controller: wanted and actual match. Nothing to do.");
  return { ...m, pods, nextId, ticks: m.ticks + 1, log };
}

export function isConverged(m: ClusterModel): boolean {
  return m.pods.length === m.desired && m.pods.every((p) => p.phase === "ready");
}

export interface ClusterProps {
  desired?: number;
  /** Show the controls for taking a machine down. Default true. */
  nodeControls?: boolean;
}

export interface ClusterState {
  desired: number;
  ready: number;
  converged: boolean;
  hadFailure: boolean;
  ticks: number;
  nodesUp: number;
}

const PHASE_CLS: Record<Phase, string> = {
  ready: "border-[var(--brand)]/60 bg-primary text-primary-ink",
  starting: "border-[#f59e0b]/60 bg-[#f59e0b]/15 text-ink",
  pending: "border-dashed border-[var(--line-strong)] bg-surface-2 text-ink-2",
  terminating: "border-line bg-surface-2 text-ink-3 line-through",
};

export function Cluster({ props, onChange, revealed }: WidgetProps<ClusterProps>) {
  const start = props.desired ?? 3;
  const [m, setM] = useState(() => initialCluster(start));
  const ready = m.pods.filter((p) => p.phase === "ready").length;
  const converged = isConverged(m);
  const nodesUp = m.nodes.filter((n) => n.up).length;
  useReport(
    onChange,
    { desired: m.desired, ready, converged, hadFailure: m.hadFailure, ticks: m.ticks, nodesUp } satisfies ClusterState,
    `${m.desired}|${ready}|${converged}|${m.hadFailure}|${m.ticks}|${nodesUp}`,
  );

  const crash = (id: number) => {
    if (revealed) return;
    const p = m.pods.find((x) => x.id === id);
    if (!p || p.phase === "terminating") return;
    setM({ ...m, pods: m.pods.filter((x) => x.id !== id), hadFailure: true, log: [`${podName(p)} crashed. The Service stops sending it traffic.`] });
  };
  const toggleNode = (id: string) => {
    if (revealed) return;
    const n = m.nodes.find((x) => x.id === id)!;
    if (n.up) {
      setM({ ...m, nodes: m.nodes.map((x) => (x.id === id ? { ...x, up: false } : x)), pods: m.pods.filter((p) => p.node !== id), hadFailure: true, log: [`${id} went down and took its pods with it.`] });
    } else {
      setM({ ...m, nodes: m.nodes.map((x) => (x.id === id ? { ...x, up: true } : x)), log: [`${id} is back and can take new pods.`] });
    }
  };
  const setDesired = (n: number) => {
    if (revealed) return;
    const d = Math.max(1, Math.min(6, n));
    setM({ ...m, desired: d, log: [`You changed the desired count to ${d}. Nothing happens until the controller's next pass.`] });
  };
  const settle = () => {
    let cur = m;
    for (let i = 0; i < 8 && !isConverged(cur); i++) cur = tick(cur);
    setM(cur);
  };

  const pending = m.pods.filter((p) => p.node === null);
  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2">
        <Network className="h-4 w-4 shrink-0 text-ink-2" />
        <span className="text-sm font-semibold text-ink">Service “web”</span>
        <span className="text-xs text-ink-3">sends traffic to ready pods only:</span>
        <span className={`rounded-full px-2 py-0.5 font-mono text-xs font-semibold ${ready === 0 ? "bg-[var(--bad)] text-white" : "bg-primary text-primary-ink"}`}>{ready === 0 ? "no endpoints" : `${ready} endpoint${ready === 1 ? "" : "s"}`}</span>
      </div>

      <div className="mt-3 grid gap-2 min-[560px]:grid-cols-3">
        {m.nodes.map((n) => {
          const here = m.pods.filter((p) => p.node === n.id);
          return (
            <div key={n.id} className={`rounded-xl border p-2.5 ${n.up ? "border-line bg-surface" : "border-[var(--bad)]/50 bg-[var(--bad)]/[0.06]"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-mono text-[12px] font-semibold text-ink">
                  <Server className="h-3.5 w-3.5 text-ink-2" /> {n.id}
                </span>
                {props.nodeControls !== false && (
                  <button type="button" disabled={revealed} onClick={() => toggleNode(n.id)} className="min-h-8 rounded-full border border-line px-2.5 text-[11px] font-medium text-ink-2 hover:text-ink disabled:opacity-50">
                    {n.up ? "Take down" : "Bring back"}
                  </button>
                )}
              </div>
              <div className="mt-2 flex min-h-[3.75rem] flex-wrap content-start gap-1.5">
                {!n.up && <span className="text-xs text-bad">down</span>}
                {here.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => crash(p.id)}
                    disabled={revealed || p.phase === "terminating"}
                    title={`${podName(p)} is ${p.phase}. Tap to crash it.`}
                    className={`min-h-10 rounded-lg border px-2 font-mono text-[11.5px] font-semibold transition-colors ${PHASE_CLS[p.phase]}`}
                  >
                    {podName(p)}
                    <span className="block text-[9.5px] font-medium opacity-80">{p.phase}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {pending.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-[var(--line-strong)] p-2">
          <Caption>waiting for a machine</Caption>
          {pending.map((p) => (
            <span key={p.id} className={`rounded-lg border px-2 py-1 font-mono text-[11.5px] font-semibold ${PHASE_CLS.pending}`}>
              {podName(p)}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface p-1" role="group" aria-label="Desired replicas">
          <button type="button" className="grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-surface-2 disabled:opacity-40" onClick={() => setDesired(m.desired - 1)} disabled={revealed || m.desired <= 1} aria-label="Fewer replicas">
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[7rem] text-center text-sm">
            replicas: <span className="font-mono font-bold text-ink">{m.desired}</span>
          </span>
          <button type="button" className="grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-surface-2 disabled:opacity-40" onClick={() => setDesired(m.desired + 1)} disabled={revealed || m.desired >= 6} aria-label="More replicas">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <button type="button" className="btn btn-primary !h-10" onClick={() => setM(tick(m))} disabled={revealed}>
          <StepForward className="h-4 w-4" /> Next tick
        </button>
        <button type="button" className="btn !h-10" onClick={settle} disabled={revealed || converged}>
          <Zap className="h-4 w-4" /> Let it settle
        </button>
        <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" onClick={() => setM(initialCluster(start))} disabled={revealed} aria-label="Reset" title="Reset">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2" aria-live="polite">
        <Readout label="Desired" value={m.desired} />
        <Readout label="Ready" value={ready} accent={converged} />
        <Readout label="Ticks" value={m.ticks} />
      </div>
      <Note tone={converged ? "good" : "neutral"} className="mt-2">
        {m.log.map((l, i) => (
          <span key={i} className="block">
            {l}
          </span>
        ))}
        {converged && m.ticks > 0 && <span className="mt-1 block font-medium">Actual matches desired.</span>}
      </Note>
    </div>
  );
}

/** goal: { converged: true, desired?: n, hadFailure?: true, minTicks?: n } */
export function checkCluster(state: unknown, goal: Record<string, unknown>) {
  const s = state as ClusterState | undefined;
  if (!s) return false;
  if (goal.converged === true && !s.converged) return false;
  if (typeof goal.desired === "number" && s.desired !== goal.desired) return false;
  if (goal.hadFailure === true && !s.hadFailure) return false;
  if (typeof goal.minReady === "number" && s.ready < goal.minReady) return false;
  if (typeof goal.minTicks === "number" && s.ticks < goal.minTicks) return false;
  return ["converged", "desired", "hadFailure", "minReady", "minTicks"].some((k) => k in goal);
}
