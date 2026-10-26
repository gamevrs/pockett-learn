"use client";

import React, { useState } from "react";
import { Link2, Link2Off, Plus, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Note, Readout } from "../dsa/ui";
import { Choice } from "./ui";

/**
 * Two regions, Frankfurt (A) and Singapore (B), 170 ms apart. In "active-passive" only Frankfurt
 * accepts writes; Singapore forwards them (or fails if the link is cut). In "active-active" both
 * accept writes locally and swap changes in the background, so a cut link lets them diverge and
 * the merge rule decides what survives when the link comes back.
 */

type Mode = "ap" | "aa";
type DataType = "counter" | "value" | "set";
type Strategy = "lww" | "merge";
type Region = "A" | "B";

interface Op {
  id: number;
  region: Region;
  /** The link was cut when this write happened. */
  during: boolean;
  rejected: boolean;
  /** What the write carries: 1 for a sale, a capacity, or a note. */
  value: number | string;
}

const REGION_NAME: Record<Region, string> = { A: "Frankfurt", B: "Singapore" };
const CAPACITY: Record<Region, number> = { A: 500, B: 450 };
const NOTES: Record<Region, string[]> = { A: ["front row", "balcony", "stalls", "box"], B: ["aisle", "VIP", "stage-side", "standing"] };

export interface RegionsProps {
  mode?: Mode;
  type?: DataType;
  strategy?: Strategy;
  /** Hide the switches you don't want to offer. */
  fixedMode?: boolean;
  fixedType?: boolean;
}

export interface RegionsState {
  mode: Mode;
  type: DataType;
  strategy: Strategy;
  partition: boolean;
  ops: number;
  accepted: number;
  rejected: number;
  lost: number;
  conflict: boolean;
  converged: boolean;
  /** Both regions accepted writes while cut off from each other. */
  diverged: boolean;
}

interface View {
  a: string;
  b: string;
  accepted: number;
  rejected: number;
  lost: number;
  conflict: boolean;
  converged: boolean;
}

const fmtSet = (s: string[]) => (s.length ? `{${s.join(", ")}}` : "{ }");

function render(type: DataType, ops: Op[]): { text: string; count: number; set: string[] } {
  if (ops.length === 0) return { text: type === "counter" ? "0 sold" : type === "value" ? "capacity not set" : "{ }", count: 0, set: [] };
  if (type === "counter") return { text: `${ops.length} sold`, count: ops.length, set: [] };
  if (type === "value") return { text: `capacity ${ops[ops.length - 1].value}`, count: 1, set: [] };
  const set = [...new Set(ops.map((o) => String(o.value)))];
  return { text: fmtSet(set), count: set.length, set };
}

export function compute(mode: Mode, type: DataType, strategy: Strategy, ops: Op[], partition: boolean): View {
  const ok = ops.filter((o) => !o.rejected);
  const rejected = ops.length - ok.length;
  if (mode === "ap") {
    // Frankfurt (A) holds the truth; Singapore only sees A's changes once the link is up
    const a = render(type, ok);
    const b = render(type, ok.filter((o) => o.region === "B" || !partition || !o.during));
    return { a: a.text, b: b.text, accepted: ok.length, rejected, lost: 0, conflict: false, converged: !partition };
  }
  const visibleTo = (r: Region) => ok.filter((o) => o.region === r || !partition || !o.during);
  if (partition) {
    const a = render(type, visibleTo("A"));
    const b = render(type, visibleTo("B"));
    return { a: a.text, b: b.text, accepted: ok.length, rejected, lost: 0, conflict: false, converged: !ok.some((o) => o.during) };
  }
  // link is up: reconcile
  const anyDuring = ok.some((o) => o.during);
  const lastRegion = ok.length ? ok[ok.length - 1].region : "A";
  const lwwOps = ok.filter((o) => o.region === lastRegion || !o.during);
  const concurrent = new Set(ok.filter((o) => o.during).map((o) => o.region)).size === 2;
  let text: string;
  let lost = 0;
  let conflict = false;
  if (type === "counter") {
    const kept = strategy === "merge" || !anyDuring ? ok.length : lwwOps.length;
    text = `${kept} sold`;
    lost = ok.length - kept;
  } else if (type === "value") {
    text = ok.length ? `capacity ${ok[ok.length - 1].value}` : "capacity not set";
    if (strategy === "merge" && concurrent) {
      const vals = [...new Set(ok.filter((o) => o.during).map((o) => o.value))];
      text = `conflict: ${vals.join(" or ")}`;
      conflict = true;
    } else if (concurrent) {
      lost = new Set(ok.filter((o) => o.during).map((o) => o.value)).size - 1;
    }
  } else {
    const all = [...new Set(ok.map((o) => String(o.value)))];
    const kept = strategy === "merge" || !anyDuring ? all : [...new Set(lwwOps.map((o) => String(o.value)))];
    text = fmtSet(kept);
    lost = all.length - kept.length;
  }
  return { a: text, b: text, accepted: ok.length, rejected, lost, conflict, converged: true };
}

export function Regions({ props, onChange, revealed }: WidgetProps<RegionsProps>) {
  const [mode, setMode] = useState<Mode>(props.mode ?? "aa");
  const [type, setType] = useState<DataType>(props.type ?? "counter");
  const [strategy, setStrategy] = useState<Strategy>(props.strategy ?? "lww");
  const [partition, setPartition] = useState(false);
  const [ops, setOps] = useState<Op[]>([]);
  const view = compute(mode, type, strategy, ops, partition);

  const emit = (m: Mode, t: DataType, s: Strategy, o: Op[], p: boolean) => {
    const v = compute(m, t, s, o, p);
    const ok = o.filter((x) => !x.rejected && x.during);
    const diverged = m === "aa" && ok.some((x) => x.region === "A") && ok.some((x) => x.region === "B");
    onChange?.({ mode: m, type: t, strategy: s, partition: p, ops: o.length, accepted: v.accepted, rejected: v.rejected, lost: v.lost, conflict: v.conflict, converged: v.converged, diverged } satisfies RegionsState);
  };
  const write = (region: Region) => {
    if (revealed) return;
    const mine = ops.filter((o) => o.region === region && !o.rejected).length;
    const rejected = mode === "ap" && region === "B" && partition;
    const value = type === "counter" ? 1 : type === "value" ? CAPACITY[region] : NOTES[region][mine % NOTES[region].length];
    const next = [...ops, { id: ops.length + 1, region, during: partition, rejected, value }];
    setOps(next);
    emit(mode, type, strategy, next, partition);
  };
  const reset = (m = mode, t = type, s = strategy) => {
    setOps([]);
    setPartition(false);
    emit(m, t, s, [], false);
  };

  const verb = type === "counter" ? "Sell a ticket" : type === "value" ? "Set the capacity" : "Add a note";
  const latency = (r: Region) => (mode === "aa" || r === "A" ? "≈ 5 ms" : "≈ 170 ms");

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap gap-2">
        {!props.fixedMode && (
          <Choice label="Setup" value={mode} disabled={revealed} onChange={(m) => { setMode(m); reset(m); }} options={[{ id: "ap", label: "Active-passive" }, { id: "aa", label: "Active-active" }]} />
        )}
        {!props.fixedType && (
          <Choice label="Kind of data" value={type} disabled={revealed} onChange={(t) => { setType(t); reset(mode, t); }} options={[{ id: "counter", label: "A counter" }, { id: "value", label: "A single value" }, { id: "set", label: "A set of notes" }]} />
        )}
        {mode === "aa" && (
          <Choice label="Merge rule" value={strategy} disabled={revealed} onChange={(s) => { setStrategy(s); emit(mode, type, s, ops, partition); }} options={[{ id: "lww", label: "Last write wins" }, { id: "merge", label: "Merge by data type" }]} />
        )}
      </div>

      <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
        {(["A", "B"] as Region[]).map((r, idx) => (
          <React.Fragment key={r}>
            {idx === 1 && (
              <div className="flex flex-col items-center justify-center gap-1 text-ink-3" title={partition ? "Link cut" : "Link up"}>
                {partition ? <Link2Off className="h-5 w-5 text-bad" /> : <Link2 className="h-5 w-5 text-brand" />}
                <span className="text-[10px] font-medium">{partition ? "cut" : "170 ms"}</span>
              </div>
            )}
            <div className="min-w-0 rounded-xl border border-line bg-surface p-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                <p className="text-sm font-semibold text-ink">{REGION_NAME[r]}</p>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-ink-3">{mode === "aa" ? "takes writes" : r === "A" ? "primary" : "replica"}</span>
              </div>
              <p className="mt-2 min-h-[2.6rem] break-words font-mono text-[12.5px] leading-snug text-ink">{r === "A" ? view.a : view.b}</p>
              <button type="button" className="btn mt-2 w-full !h-10 !px-2 !text-[0.78rem]" onClick={() => write(r)} disabled={revealed}>
                <Plus className="h-4 w-4 shrink-0" /> {verb}
              </button>
              <p className="mt-1 text-center text-[10.5px] text-ink-3">write takes {latency(r)} here</p>
            </div>
          </React.Fragment>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={`btn !h-10 ${partition ? "btn-primary" : ""}`} disabled={revealed} onClick={() => { setPartition(!partition); emit(mode, type, strategy, ops, !partition); }}>
          {partition ? <Link2 className="h-4 w-4" /> : <Link2Off className="h-4 w-4" />} {partition ? "Reconnect the regions" : "Cut the link between them"}
        </button>
        <button type="button" className="btn btn-ghost !h-10" disabled={revealed || ops.length === 0} onClick={() => reset()}>
          <RotateCcw className="h-4 w-4" /> Start over
        </button>
      </div>

      {ops.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {ops.map((o) => (
            <span key={o.id} className={`rounded-md border px-2 py-0.5 font-mono text-[11px] ${o.rejected ? "border-[var(--bad)]/50 bg-[var(--bad)]/10 text-bad line-through" : o.during ? "border-dashed border-[var(--brand)] text-ink" : "border-line text-ink-2"}`}>
              {o.id}. {o.region === "A" ? "FRA" : "SIN"} {o.value === 1 ? "+1" : String(o.value)}
              {o.rejected ? " refused" : ""}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Writes accepted" value={view.accepted} />
        <Readout label="Refused" value={view.rejected} accent={view.rejected > 0} />
        <Readout label="Silently lost" value={view.converged ? view.lost : "?"} accent={view.lost > 0} />
      </div>
      <Note tone={view.lost > 0 || view.conflict || view.rejected > 0 ? "bad" : "plain"}>
        {view.conflict
          ? "Two regions set different values while apart. No generic rule can pick; the data model has to say what to do (or a person must)."
          : view.lost > 0
            ? `${view.lost} accepted ${view.lost === 1 ? "write was" : "writes were"} thrown away by the merge rule. Every user was told their write succeeded.`
            : view.rejected > 0
              ? "Singapore refused the write rather than risk two versions of the truth: consistent, but unavailable from there."
              : partition && mode === "aa"
                ? "Both regions keep accepting writes while cut off. Try a write on each side, then reconnect."
                : partition
                  ? "The link is down. Try a write in Singapore."
                  : "Try cutting the link, writing on both sides, and reconnecting."}
      </Note>
    </div>
  );
}

export function checkRegions(state: unknown, goal: Record<string, unknown>) {
  const s = state as RegionsState | undefined;
  if (!s) return false;
  if (typeof goal.mode === "string" && s.mode !== goal.mode) return false;
  if (typeof goal.type === "string" && s.type !== goal.type) return false;
  if (typeof goal.strategy === "string" && s.strategy !== goal.strategy) return false;
  if (typeof goal.partition === "boolean" && s.partition !== goal.partition) return false;
  if (typeof goal.lostMin === "number" && s.lost < goal.lostMin) return false;
  if (typeof goal.acceptedMin === "number" && s.accepted < goal.acceptedMin) return false;
  if (typeof goal.rejectedMin === "number" && s.rejected < goal.rejectedMin) return false;
  if (goal.lost === 0 && (s.lost !== 0 || !s.converged)) return false;
  if (goal.conflict === true && !s.conflict) return false;
  if (goal.diverged === true && !s.diverged) return false;
  return true;
}
