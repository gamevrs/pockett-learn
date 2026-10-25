"use client";

import React, { useId, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { CodePane, Readout } from "./ui";

/**
 * State: a state-machine diagram. Events are buttons; the current state's object decides what
 * each event does and which state comes next. The same button behaves differently per state.
 */

interface Outcome {
  to?: string;
  say: string;
  /** Code line for this method (the body). */
  body: string;
  drink?: boolean;
}

interface Machine {
  context: string;
  states: { id: string; label: string; cls: string; x: number; y: number }[];
  events: { id: string; label: string; method: string }[];
  table: Record<string, Record<string, Outcome>>;
  edges: { from: string; to: string; label: string }[];
  start: string;
}

const MACHINES: Record<string, Machine> = {
  player: {
    context: "player",
    start: "stopped",
    states: [
      { id: "stopped", label: "Stopped", cls: "Stopped", x: 62, y: 112 },
      { id: "playing", label: "Playing", cls: "Playing", x: 236, y: 42 },
      { id: "paused", label: "Paused", cls: "Paused", x: 236, y: 182 },
    ],
    events: [
      { id: "play", label: "Play", method: "play" },
      { id: "pause", label: "Pause", method: "pause" },
      { id: "stop", label: "Stop", method: "stop" },
    ],
    table: {
      stopped: {
        play: { to: "playing", say: "Starts the song from the beginning.", body: "p.state = Playing()" },
        pause: { say: "Nothing is playing, so nothing happens.", body: "pass  # nothing to pause" },
        stop: { say: "Already stopped.", body: "pass  # already stopped" },
      },
      playing: {
        play: { say: "Already playing: ignored.", body: "pass  # already playing" },
        pause: { to: "paused", say: "Pauses at 1:24.", body: "p.state = Paused()" },
        stop: { to: "stopped", say: "Stops and rewinds to 0:00.", body: "p.state = Stopped()" },
      },
      paused: {
        play: { to: "playing", say: "Resumes from 1:24.", body: "p.state = Playing()" },
        pause: { say: "Already paused.", body: "pass  # already paused" },
        stop: { to: "stopped", say: "Stops and rewinds to 0:00.", body: "p.state = Stopped()" },
      },
    },
    edges: [
      { from: "stopped", to: "playing", label: "play" },
      { from: "playing", to: "paused", label: "pause" },
      { from: "paused", to: "playing", label: "play" },
      { from: "playing", to: "stopped", label: "stop" },
      { from: "paused", to: "stopped", label: "stop" },
    ],
  },
  vending: {
    context: "machine",
    start: "idle",
    states: [
      { id: "idle", label: "Idle", cls: "Idle", x: 62, y: 112 },
      { id: "coin", label: "Has coin", cls: "HasCoin", x: 236, y: 42 },
      { id: "ready", label: "Drink out", cls: "DrinkOut", x: 236, y: 182 },
    ],
    events: [
      { id: "coin", label: "Insert coin", method: "insert_coin" },
      { id: "button", label: "Press button", method: "press" },
      { id: "refund", label: "Refund", method: "refund" },
      { id: "take", label: "Take drink", method: "take" },
    ],
    table: {
      idle: {
        coin: { to: "coin", say: "Coin accepted.", body: "m.state = HasCoin()" },
        button: { say: "\"Insert a coin first.\"", body: 'm.show("Insert a coin first")' },
        refund: { say: "No coin to give back.", body: "pass  # no coin" },
        take: { say: "There's no drink to take.", body: "pass  # nothing there" },
      },
      coin: {
        coin: { say: "Already has a coin: the extra one drops out.", body: "m.return_coin()  # one is enough" },
        button: { to: "ready", say: "Clunk: a drink drops out.", body: "m.drop_drink(); m.state = DrinkOut()" },
        refund: { to: "idle", say: "Your coin comes back.", body: "m.return_coin(); m.state = Idle()" },
        take: { say: "Press the button first.", body: 'm.show("Press the button")' },
      },
      ready: {
        coin: { say: "\"Take your drink first.\" The coin is returned.", body: "m.return_coin()" },
        button: { say: "\"Take your drink first.\"", body: 'm.show("Take your drink")' },
        refund: { say: "Too late: you already have a drink.", body: "pass  # already paid" },
        take: { to: "idle", say: "Enjoy! Ready for the next customer.", body: "m.state = Idle()", drink: true },
      },
    },
    edges: [
      { from: "idle", to: "coin", label: "coin" },
      { from: "coin", to: "idle", label: "refund" },
      { from: "coin", to: "ready", label: "press" },
      { from: "ready", to: "idle", label: "take" },
    ],
  },
};

export interface StateMachineProps {
  machine?: "player" | "vending";
  /** Show the current state's class code. Default true. */
  showCode?: boolean;
}

export interface StateMachineStateReport {
  state: string;
  drinks: number;
  events: number;
}

export function StateMachine({ props, onChange, revealed }: WidgetProps<StateMachineProps>) {
  const m = MACHINES[props.machine ?? "player"] ?? MACHINES.player;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [current, setCurrent] = useState(m.start);
  const [last, setLast] = useState<{ n: number; from: string; event: string } | null>(null);
  const [drinks, setDrinks] = useState(0);

  const fire = (eventId: string) => {
    if (revealed) return;
    const out = m.table[current][eventId];
    const next = out.to ?? current;
    const d = drinks + (out.drink ? 1 : 0);
    setLast({ n: (last?.n ?? 0) + 1, from: current, event: eventId });
    setCurrent(next);
    setDrinks(d);
    onChange?.({ state: next, drinks: d, events: (last?.n ?? 0) + 1 } satisfies StateMachineStateReport);
  };
  const reset = () => {
    setCurrent(m.start);
    setLast(null);
    setDrinks(0);
    onChange?.({ state: m.start, drinks: 0, events: 0 } satisfies StateMachineStateReport);
  };

  const outcome = last ? m.table[last.from][last.event] : null;
  const lastEvent = last ? m.events.find((e) => e.id === last.event)! : null;
  const fromState = last ? m.states.find((s) => s.id === last.from)! : null;
  const cur = m.states.find((s) => s.id === current)!;
  const litEdge = last && outcome?.to ? `${last.from}>${outcome.to}` : null;

  // code of the state whose method just ran (or the current state before any event)
  const shown = fromState ?? cur;
  const codeLines = [`class ${shown.cls}:`];
  const hl: number[] = [];
  for (const e of m.events) {
    if (last && e.id === last.event) hl.push(codeLines.length, codeLines.length + 1);
    codeLines.push(`    def ${e.method}(self, ${m.context[0]}):`, `        ${m.table[shown.id][e.id].body}`);
  }

  return (
    <div className="w-full">
      <svg viewBox="0 0 300 224" className="mx-auto block w-full max-w-[420px]" role="img" aria-label={`State diagram, current state ${cur.label}`}>
        <defs>
          <marker id={`a${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--line-strong)" />
          </marker>
          <marker id={`h${uid}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--brand)" />
          </marker>
        </defs>
        {m.edges.map((e) => {
          const a = m.states.find((s) => s.id === e.from)!;
          const b = m.states.find((s) => s.id === e.to)!;
          const twoWay = m.edges.some((r) => r.from === e.to && r.to === e.from);
          const g = edgeGeometry(a, b, twoWay ? 46 : 18);
          const lit = litEdge === `${e.from}>${e.to}`;
          const w = e.label.length * 6.4 + 12;
          return (
            <g key={`${e.from}>${e.to}`}>
              <path d={g.d} fill="none" stroke={lit ? "var(--brand)" : "var(--line-strong)"} strokeWidth={lit ? 2.25 : 1.25} markerEnd={`url(#${lit ? "h" : "a"}${uid})`} />
              <rect x={g.lx - w / 2} y={g.ly - 9} width={w} height={18} rx={9} fill="var(--surface)" stroke={lit ? "var(--brand)" : "var(--line)"} />
              <text x={g.lx} y={g.ly + 4} textAnchor="middle" fontSize="11" fontFamily="var(--font-mono)" fill={lit ? "var(--ink)" : "var(--ink-2)"}>
                {e.label}
              </text>
            </g>
          );
        })}
        {m.states.map((s) => {
          const on = s.id === current;
          return (
            <g key={s.id}>
              <rect x={s.x - NODE_W / 2} y={s.y - NODE_H / 2} width={NODE_W} height={NODE_H} rx={NODE_H / 2} fill={on ? "var(--primary)" : "var(--surface-2)"} stroke={on ? "var(--primary)" : "var(--line-strong)"} strokeWidth={1.25} />
              <text x={s.x} y={s.y + 4.5} textAnchor="middle" fontSize="13" fontWeight={600} fill={on ? "var(--primary-ink)" : "var(--ink)"}>
                {s.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {m.events.map((e) => (
          <button key={e.id} type="button" onClick={() => fire(e.id)} disabled={revealed} className="inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-3.5 text-sm font-medium text-ink hover:border-[var(--line-strong)] hover:bg-surface-2 disabled:opacity-45">
            {e.label}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3" aria-live="polite">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Readout label="state" value={cur.cls} accent />
          <div className="flex items-center gap-2">
            {props.machine === "vending" && <Readout label="drinks" value={drinks} />}
            {last && !revealed && (
              <button type="button" onClick={reset} className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-xs text-ink-2 hover:bg-surface hover:text-ink">
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            )}
          </div>
        </div>
        {last && outcome && lastEvent && fromState ? (
          <div key={last.n} className="pop-in mt-2">
            <p className="font-mono text-[12px] text-ink-2">
              {m.context}.{lastEvent.method}() → <span className="text-ink">{fromState.cls}.{lastEvent.method}</span>
              {outcome.to ? <span className="text-brand"> → now {m.states.find((s) => s.id === outcome.to)!.cls}</span> : <span className="text-ink-3"> → stays</span>}
            </p>
            <p className="mt-1 text-sm text-ink">{outcome.say}</p>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-3">Press a button. The current state decides what it does.</p>
        )}
      </div>

      {(props.showCode ?? true) && (
        <div key={shown.id} className="pop-in mt-3">
          <CodePane title={last ? `the state that handled ${lastEvent?.method}()` : "the current state"} code={codeLines.join("\n")} highlight={hl} />
        </div>
      )}
    </div>
  );
}

const NODE_W = 92;
const NODE_H = 36;

function edgeGeometry(a: { x: number; y: number }, b: { x: number; y: number }, bend: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  // perpendicular offset: edges a→b and b→a bend to opposite sides
  const nx = -dy / len;
  const ny = dx / len;
  const cx = (a.x + b.x) / 2 + nx * bend;
  const cy = (a.y + b.y) / 2 + ny * bend;
  const trim = (p: { x: number; y: number }) => {
    const ux = cx - p.x;
    const uy = cy - p.y;
    const ul = Math.hypot(ux, uy) || 1;
    const vx = ux / ul;
    const vy = uy / ul;
    const rx = NODE_W / 2 + 3;
    const ry = NODE_H / 2 + 3;
    const t = 1 / Math.sqrt((vx / rx) ** 2 + (vy / ry) ** 2);
    return { x: p.x + vx * t, y: p.y + vy * t };
  };
  const s = trim(a);
  const e = trim(b);
  // label on the curve's midpoint; two-way pairs bend far enough apart that labels don't touch
  const lx = 0.25 * s.x + 0.5 * cx + 0.25 * e.x;
  const ly = 0.25 * s.y + 0.5 * cy + 0.25 * e.y;
  return { d: `M${s.x.toFixed(1)} ${s.y.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${e.x.toFixed(1)} ${e.y.toFixed(1)}`, lx, ly };
}

export function checkStateMachine(state: unknown, goal: Record<string, unknown>) {
  const st = state as StateMachineStateReport | undefined;
  if (!st) return false;
  if (typeof goal.state === "string" && st.state !== goal.state) return false;
  if (typeof goal.drinks === "number" && st.drinks !== goal.drinks) return false;
  return typeof goal.state === "string" || typeof goal.drinks === "number";
}
