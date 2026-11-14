"use client";

import React, { useId, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { simulateIrq, simulateRace, type IrqDef, type RaceFix } from "./sim";
import { BLUE, Caption, Note, ORANGE, Readout, Seg, Stepper, ToyNote } from "./ui";

// ───────────────────────────── emb-irq: interrupt timeline ─────────────────────────────

interface SrcInfo {
  id: string;
  name: string;
  prio: number;
  duration: number;
  raiseAt: number[];
  color: string;
}

const SOURCES: Record<string, SrcInfo> = {
  tim: { id: "tim", name: "Timer", prio: 2, duration: 10, raiseAt: [4], color: "var(--brand)" },
  uart: { id: "uart", name: "UART", prio: 2, duration: 3, raiseAt: [7], color: ORANGE },
  btn: { id: "btn", name: "Button", prio: 3, duration: 4, raiseAt: [16], color: BLUE },
};

export interface IrqProps {
  sources?: string[];
  prios?: Record<string, number>;
  raise?: Record<string, number[]>;
  durations?: Record<string, number>;
  nesting?: boolean;
  lockNesting?: boolean;
  total?: number;
  task?: string;
}

export interface IrqState {
  prios: Record<string, number>;
  nesting: boolean;
  latency: Record<string, number | null>;
  maxDepth: number;
  lost: number;
}

const f1 = (n: number) => n.toFixed(1);

/** Seg that can be locked: a disabled fieldset disables every button inside it. */
function LSeg<T extends string | number>({ disabled, ...rest }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string; disabled?: boolean }) {
  return (
    <fieldset disabled={disabled} className="m-0 min-w-0 border-0 p-0">
      <Seg {...rest} />
    </fieldset>
  );
}

export function Irq({ props, onChange, revealed }: WidgetProps<IrqProps>) {
  const locked = Boolean(revealed);
  const total = Math.max(10, Math.round(props.total ?? 36));
  const ids = (props.sources ?? ["tim", "uart"]).filter((id) => SOURCES[id]);
  const srcs: SrcInfo[] = ids.map((id) => ({
    ...SOURCES[id],
    prio: props.prios?.[id] ?? SOURCES[id].prio,
    duration: props.durations?.[id] ?? SOURCES[id].duration,
    raiseAt: props.raise?.[id] ?? SOURCES[id].raiseAt,
  }));
  const [prios, setPrios] = useState<Record<string, number>>(() => Object.fromEntries(srcs.map((s) => [s.id, s.prio])));
  const [nesting, setNesting] = useState(props.nesting ?? true);
  const patternId = useId().replace(/[^a-zA-Z0-9]/g, "");

  const defs: IrqDef[] = srcs.map((s) => ({ id: s.id, name: s.name, prio: prios[s.id] ?? s.prio, duration: s.duration, raiseAt: s.raiseAt }));
  const sim = simulateIrq(defs, { total, nesting });
  const byId = Object.fromEntries(srcs.map((s) => [s.id, s]));

  const stateFor = (p: Record<string, number>, n: boolean): IrqState => {
    const r = simulateIrq(
      srcs.map((s) => ({ id: s.id, name: s.name, prio: p[s.id] ?? s.prio, duration: s.duration, raiseAt: s.raiseAt })),
      { total, nesting: n },
    );
    return {
      prios: p,
      nesting: n,
      latency: Object.fromEntries(srcs.map((s) => [s.id, r.records.find((x) => x.irq === s.id && !x.merged)?.latency ?? null])),
      maxDepth: r.maxDepth,
      lost: r.lost,
    };
  };
  const setPrio = (id: string, v: number) => {
    const next = { ...prios, [id]: v };
    setPrios(next);
    onChange?.(stateFor(next, nesting));
  };
  const setNest = (n: boolean) => {
    setNesting(n);
    onChange?.(stateFor(prios, n));
  };

  // Geometry
  const X0 = 60;
  const W = 292;
  const xOf = (t: number) => X0 + (t / total) * W;
  const lanes = ["main", ...ids, "depth"];
  const pitch = 38;
  const laneY = (i: number) => 20 + i * pitch + 10; // top of the 20-unit bar
  const axisY = 20 + lanes.length * pitch + 6;
  const H = axisY + 34;
  const laneOf = (who: string) => lanes.indexOf(who);
  const step = total <= 40 ? 5 : 10;
  const ticks: number[] = [];
  for (let t = 0; t <= total; t += step) ticks.push(t);

  const recForOverhead = (kind: string, seg: { start: number; end: number }) =>
    kind === "entry" ? sim.records.find((r) => r.startedAt === seg.end) : sim.records.find((r) => r.endedAt === seg.start);

  // Why did anything wait?
  const waits: string[] = [];
  for (const rec of sim.records) {
    if (rec.merged || rec.startedAt === null) continue;
    const from = rec.raisedAt;
    const to = rec.startedAt - 1;
    if (to <= from) continue;
    const blocker = sim.segments.find((s) => s.start < to && s.end > from && s.who !== "main" && s.who !== "entry" && s.who !== "exit" && s.who !== rec.irq);
    if (!blocker) continue;
    const me = byId[rec.irq];
    const other = byId[blocker.who];
    waits.push(
      `${me.name} waited ${to - from} µs for the ${other.name} ISR to finish: ${nesting ? `${me.name} (priority ${prios[me.id]}) is not more urgent than ${other.name} (priority ${prios[other.id]}), and the same or lower priority cannot preempt` : "nesting is off, so a running ISR is never interrupted"}.`,
    );
  }
  if (sim.lost > 0) waits.push("A request arrived while the same interrupt was still waiting: there is only one pending bit per interrupt, so it was lost.");

  const aria = `Interrupt timeline over ${total} microseconds. ${sim.records
    .map((r) => (r.merged ? `${byId[r.irq].name} raised at ${r.raisedAt} was lost` : `${byId[r.irq].name} raised at ${r.raisedAt}, started ${r.startedAt ?? "never"}${r.latency !== null ? `, latency ${r.latency}` : ""}`))
    .join("; ")}. Nesting ${nesting ? "on" : "off"}, maximum depth ${sim.maxDepth}.`;

  return (
    <div className="w-full">
      {props.task && <p className="mb-2 text-[0.92rem] leading-snug text-ink">{props.task}</p>}

      <div className="flex flex-wrap items-end gap-x-5 gap-y-3">
        {srcs.map((s) => (
          <div key={s.id} className="flex flex-col items-start gap-1">
            <Caption>
              <span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: s.color }} />
              {s.name} priority
            </Caption>
            <Stepper value={prios[s.id] ?? s.prio} min={0} max={3} onChange={(v) => setPrio(s.id, v)} label={`${s.name} priority`} disabled={locked} />
          </div>
        ))}
        {!props.lockNesting && (
          <div className="flex flex-col items-start gap-1">
            <Caption>Nesting (preemption)</Caption>
            <LSeg
              label="Nesting (preemption)"
              value={nesting ? "on" : "off"}
              onChange={(v) => setNest(v === "on")}
              options={[
                { value: "on", label: "On" },
                { value: "off", label: "Off" },
              ]}
              disabled={locked}
            />
          </div>
        )}
      </div>
      <p className="mt-1.5 text-[0.82rem] leading-snug text-ink-3">Lower number = more urgent, as on Arm Cortex-M.</p>

      <div className="mt-3 rounded-xl border border-line bg-surface p-2">
        <svg viewBox={`0 0 360 ${H}`} className="w-full" role="img" aria-label={aria}>
          <defs>
            <pattern id={`${patternId}h`} width={4} height={4} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width={4} height={4} fill="var(--surface)" />
              <line x1={0} y1={0} x2={0} y2={4} stroke="var(--ink-2)" strokeWidth={2} />
            </pattern>
          </defs>
          {lanes.map((l, i) => (
            <g key={l}>
              <rect x={X0} y={laneY(i)} width={W} height={20} fill="var(--surface-2)" />
              <text x={4} y={laneY(i) + 15} fontSize={14} fill="var(--ink-2)" fontFamily="var(--font-mono, monospace)">
                {l === "main" || l === "depth" ? l : byId[l].name}
              </text>
            </g>
          ))}
          {/* waiting (pending) time */}
          {sim.records.map((r, i) => {
            if (r.merged || r.startedAt === null || r.startedAt - 1 <= r.raisedAt) return null;
            return <rect key={`w${i}`} x={f1(xOf(r.raisedAt) + 1)} y={laneY(laneOf(r.irq)) + 3} width={f1(xOf(r.startedAt - 1) - xOf(r.raisedAt) - 2)} height={14} fill="none" stroke="var(--ink-3)" strokeWidth={1.5} strokeDasharray="3 3" />;
          })}
          {/* segments */}
          {sim.segments.map((s, i) => {
            const isOver = s.who === "entry" || s.who === "exit";
            const rec = isOver ? recForOverhead(s.who, s) : undefined;
            const lane = isOver ? (rec ? laneOf(rec.irq) : -1) : laneOf(s.who);
            if (lane < 0) return null;
            const fill = s.who === "main" ? "var(--line-strong)" : isOver ? `url(#${patternId}h)` : byId[s.who].color;
            return <rect key={`s${i}`} x={f1(xOf(s.start))} y={laneY(lane)} width={f1(xOf(s.end) - xOf(s.start))} height={20} fill={fill} stroke={isOver ? "var(--ink-2)" : "none"} strokeWidth={1} />;
          })}
          {/* depth */}
          {(() => {
            const base = laneY(lanes.length - 1) + 20;
            const dh = 14 / Math.max(1, srcs.length);
            let d = "";
            sim.segments.forEach((s, i) => {
              const y = f1(base - s.depth * dh);
              d += i === 0 ? `M${f1(xOf(s.start))} ${y}` : `L${f1(xOf(s.start))} ${y}`;
              d += `L${f1(xOf(s.end))} ${y}`;
            });
            return <path d={d} fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" />;
          })()}
          {sim.segments
            .filter((s) => s.depth >= 2 && s.who !== "entry" && s.who !== "exit")
            .map((s, i) => (
              <text key={`d${i}`} x={f1((xOf(s.start) + xOf(s.end)) / 2)} y={laneY(lanes.length - 1) + 15} fontSize={14} textAnchor="middle" fill="var(--ink)" fontFamily="var(--font-mono, monospace)">
                {s.depth}
              </text>
            ))}
          {/* request arrows */}
          {srcs.flatMap((s) =>
            s.raiseAt
              .filter((t) => t < total)
              .map((t) => {
                const lost = sim.records.some((r) => r.irq === s.id && r.raisedAt === t && r.merged);
                const x = xOf(t) + 0.5;
                const y = laneY(laneOf(s.id));
                return <path key={`${s.id}${t}`} d={`M${f1(x - 5)} ${f1(y - 11)} L${f1(x + 5)} ${f1(y - 11)} L${f1(x)} ${f1(y - 1)} Z`} fill={lost ? "var(--bad)" : s.color} stroke="var(--ink)" strokeWidth={1} />;
              }),
          )}
          {/* axis */}
          <line x1={X0} x2={X0 + W} y1={axisY} y2={axisY} stroke="var(--ink-2)" strokeWidth={1} />
          {ticks.map((t) => (
            <g key={t}>
              <line x1={f1(xOf(t))} x2={f1(xOf(t))} y1={axisY} y2={axisY + 5} stroke="var(--ink-2)" strokeWidth={1} />
              <text x={f1(xOf(t))} y={axisY + 21} fontSize={14} textAnchor="middle" fill="var(--ink-2)" fontFamily="var(--font-mono, monospace)">
                {t}
              </text>
            </g>
          ))}
          <text x={4} y={axisY + 21} fontSize={14} fill="var(--ink-2)" fontFamily="var(--font-mono, monospace)">
            µs
          </text>
        </svg>
        <p className="mt-1 px-1 text-[0.8rem] leading-snug text-ink-3">Triangle = request raised. Dashed box = waiting. Hatched = entry or exit (saving and restoring registers). Bottom lane = nesting depth.</p>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border border-line bg-surface">
        <table className="w-full table-fixed border-collapse text-left text-[0.8rem]">
          <thead>
            <tr className="bg-surface-2 text-ink-2">
              <th scope="col" className="w-[28%] px-2 py-1.5 font-medium">
                Source
              </th>
              <th scope="col" className="px-1 py-1.5 font-medium">
                Raised
              </th>
              <th scope="col" className="px-1 py-1.5 font-medium">
                Started
              </th>
              <th scope="col" className="px-1 py-1.5 font-medium">
                Latency
              </th>
              <th scope="col" className="px-1 py-1.5 font-medium">
                Done
              </th>
            </tr>
          </thead>
          <tbody>
            {sim.records.map((r, i) => (
              <tr key={i} className="border-t border-line text-ink">
                <td className="px-2 py-1.5">
                  <span aria-hidden className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ background: byId[r.irq].color }} />
                  {byId[r.irq].name}
                </td>
                <td className="px-1 py-1.5 font-mono tabular-nums">{r.raisedAt}</td>
                {r.merged ? (
                  <td colSpan={3} className="px-1 py-1.5 text-[var(--bad)]">
                    lost (merged)
                  </td>
                ) : (
                  <>
                    <td className="px-1 py-1.5 font-mono tabular-nums">{r.startedAt ?? "–"}</td>
                    <td className="px-1 py-1.5 font-mono font-semibold tabular-nums">{r.latency !== null ? `${r.latency} µs` : "–"}</td>
                    <td className="px-1 py-1.5 font-mono tabular-nums">{r.endedAt ?? "–"}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[0.78rem] text-ink-3">All times in µs. Latency = from the request to the first instruction of the ISR.</p>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="Max nesting depth" value={sim.maxDepth} accent />
        <Readout label="Lost requests" value={sim.lost} />
      </div>
      {waits.length > 0 && (
        <div className="mt-3 space-y-2">
          {waits.map((w, i) => (
            <Note key={i}>{w}</Note>
          ))}
        </div>
      )}

      <ToyNote>Toy controller: entry and exit cost 1 µs each (a real Cortex-M class core needs about 12 cycles, well under a microsecond at tens of MHz); no tail-chaining.</ToyNote>
    </div>
  );
}

/** goal: { maxLatency: {id: n}, nesting, minDepth, prioLess: [a, b] } */
export function checkIrq(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as IrqState | undefined;
  if (!s || !s.prios) return false;
  const ml = goal.maxLatency as Record<string, number> | undefined;
  if (ml && typeof ml === "object") {
    for (const [id, max] of Object.entries(ml)) {
      const l = s.latency[id];
      if (l === null || l === undefined || l > max) return false;
    }
  }
  if (typeof goal.nesting === "boolean" && s.nesting !== goal.nesting) return false;
  if (typeof goal.minDepth === "number" && s.maxDepth < goal.minDepth) return false;
  const pl = goal.prioLess as [string, string] | undefined;
  if (Array.isArray(pl) && pl.length === 2) {
    const a = s.prios[pl[0]];
    const b = s.prios[pl[1]];
    if (a === undefined || b === undefined || !(a < b)) return false;
  }
  return true;
}

// ───────────────────────────── emb-race: count++ shared between main and an ISR ─────────────────────────────

const FIXES: { value: RaceFix; label: string }[] = [
  { value: "none", label: "None" },
  { value: "volatile", label: "volatile" },
  { value: "disable", label: "Interrupts off" },
  { value: "atomic", label: "Atomic" },
];
const ARRIVALS = ["before LOAD", "after LOAD", "after ADD", "after STORE"];
const FIX_NOTE: Record<RaceFix, string> = {
  none: "LOAD, ADD, STORE are three instructions; an ISR between them makes main store a stale value.",
  volatile: "volatile forces real loads and stores, but they are still three separate instructions: the race stays.",
  disable: "Interrupts off makes the three a critical section; the ISR waits (keep it short: it adds latency).",
  atomic: "An exclusive load/store pair (Arm LDREX/STREX; C11 atomic_fetch_add) notices the interruption and retries. On cores without these instructions (e.g. Cortex-M0) the library turns interrupts off instead.",
};

export interface RaceProps {
  fix?: RaceFix;
  irqAfter?: number;
  task?: string;
}

export interface RaceState {
  fix: RaceFix;
  irqAfter: number;
  final: number;
  expected: number;
  worksForAll: boolean;
  retries: number;
  delayedBy: number;
}

function raceState(fix: RaceFix, irqAfter: number): RaceState {
  const r = simulateRace(fix, irqAfter);
  const worksForAll = [0, 1, 2, 3].every((a) => {
    const x = simulateRace(fix, a);
    return x.final === x.expected;
  });
  return { fix, irqAfter, final: r.final, expected: r.expected, worksForAll, retries: r.retries, delayedBy: r.delayedBy };
}

export function Race({ props, onChange, revealed }: WidgetProps<RaceProps>) {
  const locked = Boolean(revealed);
  const [fix, setFix] = useState<RaceFix>(props.fix ?? "none");
  const [irqAfter, setIrqAfter] = useState(Math.min(3, Math.max(0, Math.round(props.irqAfter ?? 1))));
  const r = simulateRace(fix, irqAfter);
  const all = [0, 1, 2, 3].map((a) => simulateRace(fix, a));
  const ok = r.final === r.expected;
  const change = (f: RaceFix, a: number) => {
    setFix(f);
    setIrqAfter(a);
    onChange?.(raceState(f, a));
  };

  return (
    <div className="w-full">
      {props.task && <p className="mb-2 text-[0.92rem] leading-snug text-ink">{props.task}</p>}

      <pre className="overflow-hidden whitespace-pre-wrap break-words rounded-xl border border-line bg-surface-2 p-3 font-mono text-[0.8rem] leading-relaxed text-ink">
        {`${fix === "volatile" ? "volatile " : fix === "atomic" ? "_Atomic " : ""}uint32_t count = 5;\nvoid TIM_IRQHandler(void) {\n  count++;\n}\n// in main:\ncount++;`}
      </pre>

      <div className="mt-3 flex flex-col gap-3">
        <div className="flex flex-col items-start gap-1">
          <Caption>Fix</Caption>
          <LSeg label="Fix" value={fix} onChange={(v) => change(v, irqAfter)} options={FIXES} disabled={locked} />
        </div>
        <div className="flex flex-col items-start gap-1">
          <Caption>The interrupt arrives after main&apos;s instruction</Caption>
          <LSeg label="The interrupt arrives after main's instruction number" value={irqAfter} onChange={(v) => change(fix, v)} options={[0, 1, 2, 3].map((n) => ({ value: n, label: String(n) }))} disabled={locked} />
          <p className="text-[0.82rem] text-ink-3">
            {irqAfter}: the interrupt arrives <b className="text-ink-2">{ARRIVALS[irqAfter]}</b>.
          </p>
        </div>
      </div>

      <ol className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface" aria-label="What runs, step by step">
        {r.steps.map((s, i) => (
          <li key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-3 py-2">
            <span
              className={`inline-block min-w-[3rem] rounded-full px-2 py-0.5 text-center text-[0.75rem] font-semibold ${s.who === "isr" ? "text-ink" : "bg-primary text-primary-ink"}`}
              style={s.who === "isr" ? { background: ORANGE } : undefined}
            >
              {s.who === "isr" ? "ISR" : "main"}
            </span>
            <span className="min-w-0 flex-1 basis-40 break-words font-mono text-[0.8rem] text-ink">{s.text}</span>
            <span className="font-mono text-[0.78rem] tabular-nums text-ink-2">
              count = {s.mem}, r0 = {s.r0 === null ? "–" : s.r0}
            </span>
          </li>
        ))}
      </ol>

      <p className={`mt-3 rounded-xl border px-3.5 py-2.5 text-[0.95rem] font-semibold ${ok ? "border-[var(--brand)]/40 bg-tint text-ink" : "border-[var(--bad)] bg-surface text-ink"}`} aria-live="polite">
        {ok ? `✓ Correct: ${r.final}` : `✗ Lost an update: ${r.final}`}
        <span className="font-normal text-ink-2"> (expected {r.expected})</span>
      </p>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3">
        <Caption className="mb-1.5">Every arrival time, with this fix</Caption>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[0.85rem]">
          <span className="text-ink-2">Arrival</span>
          {all.map((x, a) => (
            <span key={a} className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 ${x.final === x.expected ? "border-line text-ink" : "border-[var(--bad)] text-ink"} ${a === irqAfter ? "bg-tint" : ""}`}>
              <span className="text-ink-3">{a}</span>
              <span aria-hidden>→</span>
              <b className={x.final === x.expected ? "" : "text-[var(--bad)]"}>{x.final}</b>
            </span>
          ))}
        </div>
        <p className="mt-1.5 text-[0.82rem] text-ink-2">{all.every((x) => x.final === x.expected) ? "This fix works for every timing." : "At least one timing still loses an update."}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {fix === "atomic" && <Readout label="Retries" value={r.retries} accent={r.retries > 0} />}
        {fix === "disable" && <Readout label="Interrupt delayed by" value={`${r.delayedBy} instr.`} accent={r.delayedBy > 0} />}
        <Readout label="Final count" value={r.final} accent />
      </div>
      <div className="mt-3">
        <Note>{FIX_NOTE[fix]}</Note>
      </div>

      <ToyNote>Toy CPU: the ISR runs as one block, and every instruction takes one slot. Real timing has more cases (caches, pipelines, several interrupts).</ToyNote>
    </div>
  );
}

/** goal: { worksForAll, fix, notFix, final } */
export function checkRace(state: unknown, goal: Record<string, unknown>): boolean {
  const s = state as RaceState | undefined;
  if (!s || typeof s.fix !== "string") return false;
  if (typeof goal.worksForAll === "boolean" && s.worksForAll !== goal.worksForAll) return false;
  if (typeof goal.fix === "string" && s.fix !== goal.fix) return false;
  if (typeof goal.notFix === "string" && s.fix === goal.notFix) return false;
  if (typeof goal.final === "number" && s.final !== goal.final) return false;
  return true;
}
