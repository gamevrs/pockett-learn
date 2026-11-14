"use client";

import React, { useId, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Btn, Caption, Note, Readout, Seg } from "./ui";
import { FSMS, fsmStep, type Fsm } from "./sim";

export interface FsmProps {
  /** key of FSMS: "traffic" | "vending" | "detect-mealy" | "detect-moore" */
  machine?: string;
  /** show a selector between all machines */
  pick?: boolean;
}

export interface FsmWidgetState {
  machine: string;
  state: string;
  steps: number;
  /** ids of every state visited so far, including the start */
  visited: string[];
  /** output seen during each cycle so far */
  outputs: string[];
  /** the machine has been in a state whose output is "DISPENSE" */
  dispensed: boolean;
  /** an output of "1" has been produced (sequence detectors) */
  detected: boolean;
}

const NW = 100;
const NH = 36;

interface Edge {
  from: string;
  to: string;
  label: string;
  bend: number;
}

function clip(cx: number, cy: number, tx: number, ty: number) {
  const dx = tx - cx;
  const dy = ty - cy;
  const t = Math.min(dx === 0 ? Infinity : NW / 2 / Math.abs(dx), dy === 0 ? Infinity : NH / 2 / Math.abs(dy));
  return { x: cx + dx * t, y: cy + dy * t };
}

function edgesOf(m: Fsm): Edge[] {
  const groups = new Map<string, string[]>();
  const bends = new Map<string, number>();
  for (const t of m.trans) {
    if (t.from === t.to) continue;
    const k = `${t.from}>${t.to}`;
    const lab = m.style === "Mealy" ? `${t.input}/${t.out}` : m.id === "traffic" ? "done" : t.input;
    groups.set(k, [...(groups.get(k) ?? []), lab]);
    if (t.bend !== undefined) bends.set(k, t.bend);
  }
  return [...groups.entries()].map(([k, labs]) => {
    const [from, to] = k.split(">");
    const reverse = groups.has(`${to}>${from}`);
    return { from, to, label: labs.length === m.inputs.length && m.style === "Moore" && m.inputs.length > 2 ? "any" : labs.join(","), bend: bends.get(k) ?? (reverse ? 20 : 0) };
  });
}

/** A state machine you drive with inputs and a clock button; the state diagram highlights where it is. */
export function FsmPlay({ props, onChange }: WidgetProps<FsmProps>) {
  const uid = useId().replace(/:/g, "");
  const [key, setKey] = useState(props.machine && FSMS[props.machine] ? props.machine : "traffic");
  const m = FSMS[key];
  const [state, setState] = useState(m.start);
  const [input, setInput] = useState(m.inputs[0].id);
  const [steps, setSteps] = useState(0);
  const [visited, setVisited] = useState<string[]>([m.start]);
  const [outputs, setOutputs] = useState<string[]>([]);
  const [last, setLast] = useState<{ from: string; to: string } | null>(null);

  const st = (id: string) => m.states.find((s) => s.id === id)!;
  const live = fsmStep(m, state, input);
  const outNow = m.style === "Mealy" ? live.out : (st(state).out ?? "");
  const detectMachine = key.startsWith("detect");

  const snap = (mm: Fsm, s: string, n: number, vis: string[], outs: string[]): FsmWidgetState => ({
    machine: mm.id,
    state: s,
    steps: n,
    visited: vis,
    outputs: outs,
    dispensed: vis.some((v) => mm.states.find((x) => x.id === v)?.out === "DISPENSE"),
    detected: outs.includes("1"),
  });

  const clock = () => {
    const during = m.style === "Mealy" ? live.out : (st(state).out ?? "");
    const to = live.to;
    const vis = visited.includes(to) ? visited : [...visited, to];
    const outs = [...outputs, during].slice(-14);
    setState(to);
    setSteps(steps + 1);
    setVisited(vis);
    setOutputs(outs);
    setLast({ from: state, to });
    onChange?.(snap(m, to, steps + 1, vis, outs));
  };
  const resetFor = (mm: Fsm) => {
    setState(mm.start);
    setInput(mm.inputs[0].id);
    setSteps(0);
    setVisited([mm.start]);
    setOutputs([]);
    setLast(null);
    onChange?.(snap(mm, mm.start, 0, [mm.start], []));
  };
  const edges = edgesOf(m);
  const mk = (hot: boolean) => `${uid}-${hot ? "h" : "n"}`;

  return (
    <div className="w-full" data-widget="digi-fsm">
      {props.pick && (
        <div className="mb-2 flex justify-center">
          <Seg
            label="State machine"
            value={key}
            onChange={(k) => {
              setKey(k);
              resetFor(FSMS[k]);
            }}
            options={[
              { value: "traffic", label: "Traffic light" },
              { value: "vending", label: "Vending" },
              { value: "detect-mealy", label: "101 Mealy" },
              { value: "detect-moore", label: "101 Moore" },
            ]}
          />
        </div>
      )}
      <p className="mb-1 text-center text-sm font-medium text-ink">
        {m.title} <span className="text-ink-3">({m.style})</span>
      </p>
      <div className="mx-auto max-w-[26rem] rounded-xl border border-line bg-surface p-1.5">
        <svg viewBox="0 0 360 200" role="img" aria-label={`${m.title} state diagram. Current state: ${st(state).label}.`} className="block w-full">
          <defs>
            {[false, true].map((hot) => (
              <marker key={String(hot)} id={mk(hot)} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10z" fill={hot ? "var(--brand)" : "var(--ink-3)"} />
              </marker>
            ))}
          </defs>
          {edges.map((e) => {
            const a = st(e.from);
            const b = st(e.to);
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy) || 1;
            const cx = mx + (-dy / len) * e.bend * 2;
            const cy = my + (dx / len) * e.bend * 2;
            const p0 = clip(a.x, a.y, cx, cy);
            const p1 = clip(b.x, b.y, cx, cy);
            const hot = last?.from === e.from && last?.to === e.to;
            const lx = 0.25 * p0.x + 0.5 * cx + 0.25 * p1.x;
            const ly = 0.25 * p0.y + 0.5 * cy + 0.25 * p1.y;
            const tw = e.label.length * 8.4 + 8;
            return (
              <g key={`${e.from}${e.to}`}>
                <path d={`M${p0.x.toFixed(1)} ${p0.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`} fill="none" stroke={hot ? "var(--brand)" : "var(--ink-3)"} strokeWidth={hot ? 2.6 : 1.6} markerEnd={`url(#${mk(hot)})`} />
                <rect x={lx - tw / 2} y={ly - 10} width={tw} height={20} rx={5} fill="var(--surface)" opacity={0.92} />
                <text x={lx} y={ly + 5} textAnchor="middle" fontSize={14} fill={hot ? "var(--ink)" : "var(--ink-2)"} fontFamily="var(--font-mono, monospace)">
                  {e.label}
                </text>
              </g>
            );
          })}
          {m.states.map((s) => {
            const on = s.id === state;
            return (
              <g key={s.id}>
                <rect x={s.x - NW / 2} y={s.y - NH / 2} width={NW} height={NH} rx={12} fill={on ? "var(--tint)" : "var(--surface-2)"} stroke={on ? "var(--brand)" : "var(--line-strong)"} strokeWidth={on ? 3 : 1.6} />
                <text x={s.x} y={s.y + 5} textAnchor="middle" fontSize={14} fontWeight={on ? 700 : 400} fill="var(--ink)" fontFamily="var(--font-mono, monospace)">
                  {s.label}
                </text>
              </g>
            );
          })}
          <g>
            <path d={`M${st(m.start).x - NW / 2 - 14} ${st(m.start).y - NH / 2 - 10} L${st(m.start).x - NW / 2 + 12} ${st(m.start).y - NH / 2 + 4}`} fill="none" stroke="var(--ink-3)" strokeWidth={1.4} markerEnd={`url(#${mk(false)})`} />
          </g>
        </svg>
      </div>
      <p className="mt-1 text-center text-xs text-ink-3">Arrows show moves between different states. Staying in the same state is listed in the table below.</p>

      <div className="mt-3 flex flex-col items-center gap-2">
        <Caption>Input during this cycle</Caption>
        <Seg label="Input" value={input} onChange={setInput} options={m.inputs.map((i) => ({ value: i.id, label: i.label }))} />
        <div className="flex flex-wrap justify-center gap-2">
          <Btn primary onClick={clock}>Clock edge</Btn>
          <Btn onClick={() => resetFor(m)}>Reset</Btn>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Readout label="State" value={st(state).label} accent />
        <Readout label={m.style === "Mealy" ? `${m.outputName} now (state + input)` : `${m.outputName} now (state only)`} value={outNow || "—"} />
        <Readout label="Clock edges" value={steps} />
      </div>
      {detectMachine && (
        <p className="mt-2 text-center font-mono text-sm text-ink-2" aria-live="polite">
          Output seen in each cycle: {outputs.length ? outputs.join(" ") : "none yet"}
        </p>
      )}
      <details className="mt-3 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink-2">
        <summary className="min-h-10 cursor-pointer py-2 text-ink">State table (all transitions)</summary>
        <table className="mt-1 w-full text-left font-mono text-xs">
          <thead className="text-ink-3">
            <tr>
              <th className="py-1 pr-2">State</th>
              <th className="pr-2">Input</th>
              <th className="pr-2">Next</th>
              {m.style === "Mealy" && <th>Out</th>}
            </tr>
          </thead>
          <tbody>
            {m.trans.map((t) => (
              <tr key={`${t.from}${t.input}`} className={t.from === state && t.input === input ? "bg-tint font-semibold text-ink" : "text-ink-2"}>
                <td className="py-0.5 pr-2">{st(t.from).label}</td>
                <td className="pr-2">{m.inputs.find((i) => i.id === t.input)?.label}</td>
                <td className="pr-2">{st(t.to).label}</td>
                {m.style === "Mealy" && <td>{t.out}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      <div className="mt-3">
        <Note>{m.note}</Note>
      </div>
    </div>
  );
}

/** goal: any of { machine, state, dispensed, detected, minSteps } or { visited: string[] } */
export function checkFsm(state: unknown, goal: Record<string, unknown>) {
  const s = state as FsmWidgetState | undefined;
  if (!s) return false;
  for (const k of ["machine", "state", "dispensed", "detected"] as const) if (k in goal && s[k] !== goal[k]) return false;
  if (typeof goal.minSteps === "number" && s.steps < goal.minSteps) return false;
  if (Array.isArray(goal.visited) && !(goal.visited as string[]).every((v) => s.visited.includes(v))) return false;
  return Object.keys(goal).length > 0;
}
