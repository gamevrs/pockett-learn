"use client";

import React, { useState } from "react";
import { RefreshCw, RotateCcw, Wallet } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Slider } from "../dsa/ui";
import { Choice } from "./ui";

/**
 * One leader takes the writes; two followers copy them a little later (the second one is further
 * away and lags more). You pay for a ticket at t = 0 and the app immediately shows "My orders".
 * Where that read goes decides whether you see your payment. Press Refresh to read again 350 ms
 * later and watch what each routing rule does when replicas disagree.
 */

type Route = "leader" | "follower" | "sticky" | "token";
type NodeId = "leader" | "a" | "b";
const NAMES: Record<NodeId, string> = { leader: "Leader", a: "Follower A", b: "Follower B" };
const ROUTE_LABEL: Record<Route, string> = { leader: "Always leader", follower: "Any follower", sticky: "Leader after your own write", token: "Follower, but wait for your write" };
const FIRST = 40;
const GAP = 350;
const STICKY_WINDOW = 1500;
const SPAN = 3000;

export interface Read {
  t: number;
  node: NodeId;
  fresh: boolean;
  waited: number;
}

export function readsFor(route: Route, lag: number, n: number): Read[] {
  const apply: Record<NodeId, number> = { leader: 0, a: lag, b: Math.round(lag * 2.2) };
  const out: Read[] = [];
  let rr = 0;
  for (let i = 0; i < n; i++) {
    const t = FIRST + GAP * i;
    let node: NodeId = "leader";
    if (route === "follower" || route === "token" || (route === "sticky" && t > STICKY_WINDOW)) {
      node = rr % 2 === 0 ? "a" : "b";
      rr += 1;
    }
    const fresh = t >= apply[node];
    const waited = route === "token" && !fresh ? apply[node] - t : 0;
    out.push({ t, node, fresh: fresh || waited > 0, waited });
  }
  return out;
}

export interface ReplicaProps {
  route?: Route;
  lag?: number;
  /** Routes to offer. */
  routes?: Route[];
  /** Hide the lag slider. */
  fixedLag?: boolean;
}

export interface ReplicaState {
  route: Route;
  lag: number;
  paid: boolean;
  reads: number;
  anyStale: boolean;
  firstFresh: boolean;
  backwards: boolean;
}

export function summarise(route: Route, lag: number, paid: boolean, n: number): ReplicaState {
  const reads = paid ? readsFor(route, lag, n) : [];
  let seenFresh = false;
  let backwards = false;
  for (const r of reads) {
    if (r.fresh) seenFresh = true;
    else if (seenFresh) backwards = true;
  }
  return { route, lag, paid, reads: reads.length, anyStale: reads.some((r) => !r.fresh), firstFresh: reads.length > 0 && reads[0].fresh, backwards };
}

export function Replica({ props, onChange, revealed }: WidgetProps<ReplicaProps>) {
  const routes = props.routes ?? (["leader", "follower", "sticky", "token"] as Route[]);
  const [route, setRoute] = useState<Route>(props.route ?? "follower");
  const [lag, setLag] = useState(props.lag ?? 400);
  const [paid, setPaid] = useState(false);
  const [n, setN] = useState(0);
  const reads = paid ? readsFor(route, lag, n) : [];
  const st = summarise(route, lag, paid, n);
  const emit = (r: Route, l: number, p: boolean, c: number) => onChange?.(summarise(r, l, p, c));
  const lagB = Math.round(lag * 2.2);

  const lanes: { id: NodeId; apply: number }[] = [
    { id: "leader", apply: 0 },
    { id: "a", apply: lag },
    { id: "b", apply: lagB },
  ];
  const x = (t: number) => `${Math.min(100, (t / SPAN) * 100)}%`;

  return (
    <div className="w-full min-w-0">
      {routes.length > 1 && (
        <div>
          <Choice
            label="Where reads go"
            value={route}
            disabled={revealed}
            onChange={(r) => {
              setRoute(r);
              emit(r, lag, paid, n);
            }}
            options={routes.map((r) => ({ id: r, label: ROUTE_LABEL[r] }))}
          />
        </div>
      )}
      {!props.fixedLag && (
        <div className="mt-3">
          <Caption className="!mb-0">Replication lag to Follower A: {lag} ms (B: {lagB} ms)</Caption>
          <Slider value={lag} min={50} max={1200} step={10} label="Replication lag in milliseconds" disabled={revealed} onChange={(v) => { setLag(v); emit(route, v, paid, n); }} />
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary !h-10" disabled={revealed} onClick={() => { setPaid(true); setN(1); emit(route, lag, true, 1); }}>
          <Wallet className="h-4 w-4" /> Pay for the ticket
        </button>
        <button type="button" className="btn !h-10" disabled={revealed || !paid || n >= 8} onClick={() => { setN(n + 1); emit(route, lag, paid, n + 1); }}>
          <RefreshCw className="h-4 w-4" /> Refresh the page
        </button>
        <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" disabled={revealed || !paid} onClick={() => { setPaid(false); setN(0); emit(route, lag, false, 0); }} aria-label="Start over" title="Start over">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-surface-2 p-2.5">
        <div className="grid gap-2">
          {lanes.map((l) => {
            const mine = reads.filter((r) => r.node === l.id);
            return (
              <div key={l.id}>
                <div className="flex items-baseline justify-between text-[11.5px]">
                  <span className="font-semibold text-ink">{NAMES[l.id]}</span>
                  <span className="text-ink-3">{l.id === "leader" ? "takes the write at t = 0" : `has the payment from t = ${l.apply} ms`}</span>
                </div>
                <div className="relative mt-1 h-7 overflow-hidden rounded-md border border-line bg-surface">
                  {paid && <div className="absolute inset-y-0 left-0 bg-[var(--bad)]/15" style={{ width: x(l.apply) }} title="still showing the old value" />}
                  {paid && <div className="absolute inset-y-0 bg-[var(--brand)]/25" style={{ left: x(l.apply), right: 0 }} />}
                  {paid && <div className="absolute inset-y-0 w-0.5 bg-[var(--brand)]" style={{ left: x(l.apply) }} />}
                  {mine.map((r, i) => (
                    <span
                      key={i}
                      className={`absolute top-1/2 grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-[10px] font-bold ${r.fresh ? "bg-primary text-primary-ink" : "bg-[var(--bad)] text-white"}`}
                      style={{ left: x(r.t) }}
                    >
                      {reads.indexOf(r) + 1}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-3">
          <span>0 ms</span>
          <span>{SPAN / 2} ms</span>
          <span>{SPAN} ms</span>
        </div>
      </div>

      {reads.length > 0 && (
        <ol className="mt-3 grid gap-1 text-[0.82rem]">
          {reads.map((r, i) => (
            <li key={i} className={`flex flex-wrap items-center gap-x-2 rounded-lg border px-2.5 py-1.5 ${r.fresh ? "border-line bg-surface text-ink-2" : "border-[var(--bad)]/40 bg-[var(--bad)]/[0.06] text-ink"}`}>
              <span className="font-mono text-[11px] text-ink-3">#{i + 1} · t = {r.t} ms</span>
              <span>read from {NAMES[r.node]}:</span>
              <span className={`font-semibold ${r.fresh ? "text-brand" : "text-bad"}`}>{r.fresh ? "order shows as paid" : "order still shows as unpaid"}</span>
              {r.waited > 0 && <span className="text-ink-3">(waited {r.waited} ms for the replica to catch up)</span>}
            </li>
          ))}
        </ol>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Reads" value={reads.length} />
        <Readout label="Stale reads" value={reads.filter((r) => !r.fresh).length} accent={st.anyStale} />
        {st.backwards && <Readout label="Time went backwards" value="yes" accent />}
      </div>
      <Note tone={!paid ? "plain" : st.anyStale ? "bad" : "good"}>
        {!paid
          ? "Press Pay, then watch where the first read lands."
          : st.backwards
            ? "The page showed the payment, then, on a refresh, forgot it. Two followers disagree about the present."
            : st.anyStale
              ? "The payment went through, but the app showed an unpaid order. The user may well pay twice."
              : "Every read reflected the payment."}
      </Note>
    </div>
  );
}

export function checkReplica(state: unknown, goal: Record<string, unknown>) {
  const s = state as ReplicaState | undefined;
  if (!s) return false;
  if (typeof goal.route === "string" && s.route !== goal.route) return false;
  if (typeof goal.lagMin === "number" && s.lag < goal.lagMin) return false;
  if (typeof goal.readsMin === "number" && s.reads < goal.readsMin) return false;
  if (typeof goal.anyStale === "boolean" && (s.reads === 0 || s.anyStale !== goal.anyStale)) return false;
  if (goal.backwards === true && !s.backwards) return false;
  if (goal.firstFresh === false && (s.reads === 0 || s.firstFresh)) return false;
  return true;
}
