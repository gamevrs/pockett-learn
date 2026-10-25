"use client";

import React, { useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Code, pyValue } from "./shared";

export interface PartOption {
  id: string;
  /** The part's class, e.g. "Bow". */
  cls: string;
  /** What the part answers, keyed by the part method name. */
  replies: Record<string, string>;
}

export interface Slot {
  id: string;
  /** Attribute on the object, e.g. "weapon". */
  attr: string;
  options: PartOption[];
}

export interface ComposeMethod {
  /** Method on the whole object, e.g. "attack". */
  name: string;
  /** Slot it delegates to. */
  slot: string;
  /** Method called on the part. Default: same name. */
  partMethod?: string;
}

export interface ComposeProps {
  className: string;
  obj: string;
  slots: Slot[];
  methods: ComposeMethod[];
  /** Starting part per slot id. Default: the first option. */
  initial?: Record<string, string>;
  /** Compare the class count against one-subclass-per-combination inheritance. */
  showCount?: boolean;
}

export interface ComposeState {
  parts: Record<string, string>;
  swaps: number;
  calls: Array<{ method: string; parts: Record<string, string> }>;
}

interface LogLine {
  id: number;
  code: string;
  result?: string;
}

/** Build an object out of parts (has-a), call its methods, and swap a part while it runs. */
export function ComposeBuilder({ props, onChange, revealed }: WidgetProps<ComposeProps>) {
  const [state, setState] = useState<ComposeState>(() => ({
    parts: Object.fromEntries(props.slots.map((s) => [s.id, props.initial?.[s.id] ?? s.options[0]?.id ?? ""])),
    swaps: 0,
    calls: [],
  }));
  const [log, setLog] = useState<LogLine[]>([]);
  const locked = Boolean(revealed);
  const part = (slot: Slot) => slot.options.find((o) => o.id === state.parts[slot.id]) ?? slot.options[0];

  const commit = (next: ComposeState, line: Omit<LogLine, "id">) => {
    setState(next);
    setLog((l) => [{ ...line, id: (l[0]?.id ?? 0) + 1 }, ...l].slice(0, 4));
    onChange?.(next);
  };
  const swap = (slot: Slot, opt: PartOption) => {
    if (locked || state.parts[slot.id] === opt.id) return;
    commit({ ...state, parts: { ...state.parts, [slot.id]: opt.id }, swaps: state.swaps + 1 }, { code: `${props.obj}.${slot.attr} = ${opt.cls}()` });
  };
  const call = (m: ComposeMethod) => {
    if (locked) return;
    const slot = props.slots.find((s) => s.id === m.slot);
    if (!slot) return;
    const reply = part(slot).replies[m.partMethod ?? m.name] ?? "…";
    commit({ ...state, calls: [...state.calls, { method: m.name, parts: { ...state.parts } }] }, { code: `${props.obj}.${m.name}()`, result: reply });
  };

  const ctor = `${props.obj} = ${props.className}(${props.slots.map((s) => `${s.attr}=${part(s).cls}()`).join(", ")})`;
  const combos = props.slots.reduce((n, s) => n * s.options.length, 1);
  const parts = props.slots.reduce((n, s) => n + s.options.length, 0);

  return (
    <div className="w-full text-sm">
      <div className="rounded-2xl border border-line bg-surface p-4">
        <p className="break-words font-mono text-[0.78rem] text-ink-2">{ctor}</p>
        <div className="mt-3 grid gap-3">
          {props.slots.map((slot) => (
            <div key={slot.id}>
              <p className="mb-1.5 text-xs text-ink-3">
                has a <span className="font-mono text-ink-2">{slot.attr}</span>
              </p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={slot.attr}>
                {slot.options.map((o) => {
                  const on = state.parts[slot.id] === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      disabled={locked}
                      onClick={() => swap(slot, o)}
                      className={`h-10 rounded-lg border px-3 font-mono text-[0.8rem] transition-colors ${on ? "border-transparent bg-primary font-semibold text-primary-ink" : "border-line bg-surface-2 text-ink-2 hover:border-[var(--line-strong)]"}`}
                    >
                      {o.cls}()
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {props.methods.map((m) => (
          <button key={m.name} type="button" onClick={() => call(m)} disabled={locked} className="btn btn-primary !h-11 font-mono !text-[0.8rem]">
            {props.obj}.{m.name}()
          </button>
        ))}
      </div>
      <ul className="mt-2 grid gap-0.5 text-xs text-ink-3">
        {props.methods.map((m) => (
          <li key={m.name}>
            <span className="font-mono text-ink-2">{m.name}()</span> hands the job to <span className="font-mono text-ink-2">self.{props.slots.find((s) => s.id === m.slot)?.attr}.{m.partMethod ?? m.name}()</span>
          </li>
        ))}
      </ul>

      {log.length > 0 && (
        <div className="mt-3">
          <Caption>What ran</Caption>
          <Code code={[...log].reverse().map((l) => (l.result ? `${l.code}  # ${pyValue(l.result)}` : l.code)).join("\n")} />
        </div>
      )}

      {props.showCount && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-xl border border-line bg-surface-2 p-3">
            <p className="text-xs text-ink-3">One subclass per combination</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{combos} classes</p>
          </div>
          <div className="rounded-xl border border-[var(--brand)]/40 bg-tint p-3">
            <p className="text-xs text-ink-3">Composition: one class per part</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{parts} classes</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function checkCompose(state: unknown, goal: Record<string, unknown>) {
  const s = state as ComposeState | undefined;
  if (!s) return false;
  const want = (goal.parts ?? {}) as Record<string, string>;
  const matches = (parts: Record<string, string>) => Object.entries(want).every(([k, v]) => parts[k] === v);
  if (!matches(s.parts)) return false;
  if (typeof goal.swaps === "number" && s.swaps < goal.swaps) return false;
  if (typeof goal.called === "string" && !s.calls.some((c) => c.method === goal.called && matches(c.parts))) return false;
  return true;
}
