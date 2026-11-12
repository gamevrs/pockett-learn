"use client";

import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { access, falseSharing, newLine, type CohEvent, type Line, type Mesi as MesiState } from "./cohsim";
import { Btn, Caption, Note, Readout, Seg, Slider, fmtNs } from "./ui";

const STATE_NAME: Record<MesiState, string> = { M: "Modified", E: "Exclusive", S: "Shared", I: "Invalid" };
const STATE_HELP: Record<MesiState, string> = {
  M: "mine alone, changed",
  E: "mine alone, clean",
  S: "shared, clean",
  I: "no valid copy",
};

function StateBadge({ s }: { s: MesiState }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-sm font-bold ${
        s === "M" ? "border-transparent bg-primary text-primary-ink" : s === "I" ? "border-dashed border-[var(--line-strong)] text-ink-3" : "border-[var(--brand)] bg-tint text-ink"
      }`}
    >
      {s}
      <span className="font-sans text-[11px] font-medium opacity-80">{STATE_NAME[s]}</span>
    </span>
  );
}

// ───────────────────────────── memsys-mesi: two cores, one line ─────────────────────────────

export interface MesiProps {
  /** Which buttons to offer. Default all four. */
  ops?: ("A read" | "A write" | "B read" | "B write")[];
}

export interface MesiWidgetState {
  states: [MesiState, MesiState];
  ops: number;
  busTransactions: number;
  memStale: boolean;
  last: string;
}

export function Mesi({ props, onChange, revealed }: WidgetProps<MesiProps>) {
  const [line, setLine] = useState<Line>(() => newLine());
  const [events, setEvents] = useState<CohEvent[]>([]);
  const locked = Boolean(revealed);
  const ops = props.ops ?? ["A read", "A write", "B read", "B write"];
  const [a, b] = line.copies;
  const bus = events.reduce((n, e) => n + e.bus.length, 0);
  const stale = a.state === "M" || b.state === "M";
  const last = events[events.length - 1];

  const run = (label: string) => {
    if (locked) return;
    const core = label.startsWith("A") ? 0 : 1;
    const op = label.endsWith("read") ? "read" : "write";
    const next: Line = { copies: [{ ...line.copies[0] }, { ...line.copies[1] }], mem: line.mem };
    const ev = access(next, core, op);
    const evs = [...events, ev];
    setLine(next);
    setEvents(evs);
    onChange?.({
      states: [next.copies[0].state, next.copies[1].state],
      ops: evs.length,
      busTransactions: evs.reduce((n, e) => n + e.bus.length, 0),
      memStale: next.copies[0].state === "M" || next.copies[1].state === "M",
      last: label,
    } satisfies MesiWidgetState);
  };
  const reset = () => {
    setLine(newLine());
    setEvents([]);
    onChange?.({ states: ["I", "I"], ops: 0, busTransactions: 0, memStale: false, last: "" } satisfies MesiWidgetState);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-2">
        {([
          ["Core A", a],
          ["Core B", b],
        ] as const).map(([name, c]) => (
          <div key={name} className="rounded-xl border border-line bg-surface-2 p-2.5">
            <Caption>{name}&apos;s cache</Caption>
            <div className="mt-1.5">
              <StateBadge s={c.state} />
            </div>
            <p className="mt-1.5 font-mono text-sm text-ink">{c.state === "I" ? "value: –" : `value: ${c.value}`}</p>
            <p className="text-[11px] text-ink-3">{STATE_HELP[c.state]}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 rounded-xl border border-line bg-surface p-2.5">
        <Caption>Main memory</Caption>
        <p className="mt-1 font-mono text-sm text-ink">
          value: {line.mem} {stale && <span className="text-bad">(stale: a cache holds a newer value)</span>}
        </p>
      </div>

      <div className="mt-3">
        <Note tone={last ? "accent" : "plain"}>{last ? last.text : "One cache line, shared by two cores. Both caches start empty (Invalid). Press a button to make a core read or write it."}</Note>
      </div>
      {last && last.bus.length > 0 && (
        <p className="mt-1.5 text-center text-xs text-ink-3">
          On the bus: <span className="font-mono font-semibold text-ink-2">{last.bus.join(" → ")}</span>
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2">
        {ops.map((o) => (
          <Btn key={o} onClick={() => run(o)} disabled={locked} primary={o.endsWith("write")}>
            Core {o}
          </Btn>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Operations" value={events.length} />
        <Readout label="Bus messages" value={bus} accent={bus > 0} />
        <Btn onClick={reset} disabled={locked || events.length === 0}>
          <RotateCcw className="h-4 w-4" /> Reset
        </Btn>
      </div>
    </div>
  );
}

/** goal: { states: ["S","S"] } and/or { maxBus, minOps, memStale } */
export function checkMesi(state: unknown, goal: Record<string, unknown>) {
  const s = state as MesiWidgetState | undefined;
  if (!s) return false;
  if (Array.isArray(goal.states) && (s.states[0] !== goal.states[0] || s.states[1] !== goal.states[1])) return false;
  if (typeof goal.maxBus === "number" && s.busTransactions > goal.maxBus) return false;
  if (typeof goal.minOps === "number" && s.ops < goal.minOps) return false;
  if (typeof goal.memStale === "boolean" && s.memStale !== goal.memStale) return false;
  return true;
}

// ───────────────────────────── memsys-falseshare: two counters, one line ─────────────────────────────

export interface FalseShareProps {
  layout?: "same" | "padded";
  /** Lock the layout switch (show one layout only). */
  lockLayout?: boolean;
}

export interface FalseShareState {
  layout: "same" | "padded";
  rounds: number;
  busWrites: number;
  totalNs: number;
  speedup: number;
}

export function FalseShare({ props, onChange, revealed }: WidgetProps<FalseShareProps>) {
  const [layout, setLayout] = useState<"same" | "padded">(props.layout ?? "same");
  const [rounds, setRounds] = useState(1000);
  const locked = Boolean(revealed);
  const same = falseSharing(rounds, false);
  const padded = falseSharing(rounds, true);
  const here = layout === "same" ? same : padded;

  const report = (l: "same" | "padded", r: number) => {
    const s = falseSharing(r, false);
    const p = falseSharing(r, true);
    const h = l === "same" ? s : p;
    onChange?.({ layout: l, rounds: r, busWrites: h.busWrites, totalNs: h.totalNs, speedup: s.totalNs / h.totalNs } satisfies FalseShareState);
  };
  const pickLayout = (l: "same" | "padded") => {
    setLayout(l);
    report(l, rounds);
  };
  const pickRounds = (r: number) => {
    setRounds(r);
    report(layout, r);
  };

  // first six writes, shown as ownership flips
  const strip = (() => {
    const out: { who: string; bus: boolean }[] = [];
    const lines = layout === "same" ? [newLine()] : [newLine(), newLine()];
    for (let i = 0; i < 3; i++)
      for (const core of [0, 1] as const) {
        const ev = access(lines[layout === "same" ? 0 : core], core, "write");
        out.push({ who: core === 0 ? "A" : "B", bus: ev.bus.length > 0 });
      }
    return out;
  })();

  return (
    <div className="w-full">
      {!props.lockLayout && (
        <div className="flex justify-center">
          <Seg
            label="Where the counters live"
            value={layout}
            onChange={pickLayout}
            disabled={locked}
            options={[
              { value: "same", label: "Same cache line" },
              { value: "padded", label: "Padded apart" },
            ]}
          />
        </div>
      )}
      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-2.5">
        <Caption className="mb-1.5">Memory</Caption>
        {layout === "same" ? (
          <div className="rounded-lg border border-[var(--brand)] bg-tint p-2">
            <p className="mb-1 text-[11px] text-ink-3">one 64-byte line</p>
            <div className="flex gap-1.5">
              <span className="grid h-10 flex-1 place-items-center rounded-md bg-primary font-mono text-sm font-semibold text-primary-ink">A&apos;s counter</span>
              <span className="grid h-10 flex-1 place-items-center rounded-md border border-line bg-surface font-mono text-sm font-semibold text-ink">B&apos;s counter</span>
              <span className="grid h-10 flex-[2] place-items-center rounded-md border border-dashed border-[var(--line-strong)] font-mono text-xs text-ink-3">other data</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {["A", "B"].map((n) => (
              <div key={n} className="rounded-lg border border-[var(--brand)] bg-tint p-2">
                <p className="mb-1 text-[11px] text-ink-3">its own line</p>
                <span className="grid h-10 place-items-center rounded-md bg-surface font-mono text-sm font-semibold text-ink">{n}&apos;s counter + padding</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3">
        <Caption className="mb-1.5">The first six increments (A, B, A, B, A, B)</Caption>
        <div className="flex flex-wrap gap-1.5" role="img" aria-label={strip.map((s) => `${s.who} ${s.bus ? "needs the bus" : "hits"}`).join(", ")}>
          {strip.map((s, i) => (
            <span key={i} className={`rounded-md border px-2 py-1 font-mono text-[0.8rem] font-semibold ${s.bus ? "border-[var(--bad)]/60 bg-surface text-bad" : "border-transparent bg-primary text-primary-ink"}`}>
              {s.who}: {s.bus ? "bus" : "hit"}
            </span>
          ))}
        </div>
      </div>

      <Slider className="mt-3" label="Increments per core" value={rounds} min={100} max={5000} step={100} onChange={pickRounds} disabled={locked} format={(v) => v.toLocaleString("en-US")} />
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Bus transactions" value={here.busWrites.toLocaleString("en-US")} accent />
        <Readout label="Time (toy)" value={fmtNs(here.totalNs)} />
        {layout === "same" && <Readout label="vs padded" value={`${(same.totalNs / padded.totalNs).toFixed(0)}× slower`} />}
      </div>
      <div className="mt-3">
        <Note>
          {layout === "same"
            ? "Neither core touches the other's counter, but they share a line. Every write has to take the line away from the other core, so the line ping-pongs between the caches."
            : "Each counter has its own line. After the first write each core keeps its line Modified and never talks to the other."}{" "}
          Toy costs: a hit 1 ns, a bus transaction 30 ns; real numbers vary by machine.
        </Note>
      </div>
    </div>
  );
}

/** goal: { layout, minSpeedup } */
export function checkFalseShare(state: unknown, goal: Record<string, unknown>) {
  const s = state as FalseShareState | undefined;
  if (!s) return false;
  if (typeof goal.layout === "string" && s.layout !== goal.layout) return false;
  if (typeof goal.maxBus === "number" && s.busWrites > goal.maxBus) return false;
  return true;
}
