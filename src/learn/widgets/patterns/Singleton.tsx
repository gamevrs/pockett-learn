"use client";

import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption } from "./ui";

/**
 * Singleton vs a normal class: call each one a few times, see which objects exist in memory,
 * then change a setting through the first reference and see who else notices.
 */

const NAMES = ["a", "b", "c", "d"];
const MAX = NAMES.length;
const normalId = (k: number) => `0x7f3a${(0x10 + k * 0x48).toString(16).padStart(2, "0")}`;
const SINGLE_ID = "0x7f2c90";

export interface SingletonProps {
  /** Show only one of the two columns. */
  only?: "normal" | "singleton";
}

export interface SingletonState {
  normalCalls: number;
  singletonCalls: number;
  normalObjects: number;
  singletonObjects: number;
}

interface Column {
  calls: number;
  /** theme per object index (normal) or the single object (index 0). */
  dark: boolean[];
}

export function Singleton({ props, onChange, revealed }: WidgetProps<SingletonProps>) {
  const [normal, setNormal] = useState<Column>({ calls: 0, dark: [] });
  const [single, setSingle] = useState<Column>({ calls: 0, dark: [] });

  const report = (n: Column, s: Column) =>
    onChange?.({ normalCalls: n.calls, singletonCalls: s.calls, normalObjects: n.calls, singletonObjects: s.calls > 0 ? 1 : 0 } satisfies SingletonState);

  const callNormal = () => {
    const n = { calls: normal.calls + 1, dark: [...normal.dark, false] };
    setNormal(n);
    report(n, single);
  };
  const callSingle = () => {
    const s = { calls: single.calls + 1, dark: single.dark.length ? single.dark : [false] };
    setSingle(s);
    report(normal, s);
  };
  const darkNormal = () => {
    const n = { ...normal, dark: normal.dark.map((d, i) => (i === 0 ? !d : d)) };
    setNormal(n);
    report(n, single);
  };
  const darkSingle = () => {
    const s = { ...single, dark: [!single.dark[0]] };
    setSingle(s);
    report(normal, s);
  };
  const resetAll = () => {
    const empty = { calls: 0, dark: [] };
    setNormal(empty);
    setSingle(empty);
    report(empty, empty);
  };

  const showNormal = props.only !== "singleton";
  const showSingle = props.only !== "normal";

  return (
    <div className="w-full">
      <div className={`grid gap-3 ${showNormal && showSingle ? "sm:grid-cols-2" : ""}`}>
        {showNormal && (
          <Side
            title="Normal class"
            call="Settings()"
            calls={normal.calls}
            idOf={(i) => normalId(i)}
            darkOf={(i) => normal.dark[i]}
            objects={normal.dark.map((d, i) => ({ id: normalId(i), dark: d, refs: [NAMES[i]] }))}
            onCall={callNormal}
            onDark={darkNormal}
            darkOn={Boolean(normal.dark[0])}
            locked={revealed}
          />
        )}
        {showSingle && (
          <Side
            title="Singleton"
            call="Settings.get_instance()"
            calls={single.calls}
            idOf={() => SINGLE_ID}
            darkOf={() => single.dark[0]}
            objects={single.calls > 0 ? [{ id: SINGLE_ID, dark: Boolean(single.dark[0]), refs: NAMES.slice(0, single.calls) }] : []}
            onCall={callSingle}
            onDark={darkSingle}
            darkOn={Boolean(single.dark[0])}
            locked={revealed}
          />
        )}
      </div>
      {(normal.calls > 0 || single.calls > 0) && !revealed && (
        <div className="mt-3 flex justify-center">
          <button type="button" onClick={resetAll} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink">
            <RotateCcw className="h-3.5 w-3.5" /> Start over
          </button>
        </div>
      )}
    </div>
  );
}

function Side({
  title,
  call,
  calls,
  idOf,
  darkOf,
  objects,
  onCall,
  onDark,
  darkOn,
  locked,
}: {
  title: string;
  call: string;
  calls: number;
  idOf: (i: number) => string;
  darkOf: (i: number) => boolean | undefined;
  objects: { id: string; dark: boolean; refs: string[] }[];
  onCall: () => void;
  onDark: () => void;
  darkOn: boolean;
  locked?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-surface-2 p-3">
      <Caption>{title}</Caption>
      <button type="button" onClick={onCall} disabled={locked || calls >= MAX} className="mt-2 inline-flex min-h-10 w-full items-center justify-center rounded-full border border-line bg-surface px-3 font-mono text-[12.5px] text-ink hover:border-[var(--line-strong)] disabled:opacity-45">
        {calls < MAX ? `${NAMES[calls]} = ${call}` : "That's enough calls"}
      </button>

      <div className="mt-3 grid gap-1 font-mono text-[12px]">
        {calls === 0 && <p className="font-sans text-sm text-ink-3">No calls yet.</p>}
        {NAMES.slice(0, calls).map((n, i) => (
          <p key={n} className="pop-in flex items-center justify-between gap-2 rounded-md bg-surface px-2 py-1 ring-1 ring-[var(--line)]">
            <span className="text-ink">
              {n}.theme <span className="text-ink-3">→</span> {darkOf(i) ? '"dark"' : '"light"'}
            </span>
            <span className="text-ink-3">id {idOf(i)}</span>
          </p>
        ))}
      </div>

      <Caption className="mt-3">Objects in memory: {objects.length}</Caption>
      <div className="mt-1.5 flex min-h-12 flex-wrap gap-1.5">
        {objects.map((o) => (
          <span key={o.id} className={`pop-in rounded-lg border px-2 py-1 font-mono text-[11px] ${o.dark ? "border-white/20 bg-[#0a0a0a] text-[#f4f4f4]" :"border-[var(--brand)] bg-tint text-ink"}`}>
            {o.id}
            <span className="block opacity-70">refs: {o.refs.join(", ")}</span>
            <span className="block opacity-70">theme: {o.dark ? "dark" : "light"}</span>
          </span>
        ))}
      </div>

      <button type="button" onClick={onDark} disabled={locked || calls === 0} className="mt-3 inline-flex min-h-10 w-full items-center justify-center rounded-full border border-line bg-surface px-3 font-mono text-[12.5px] text-ink hover:border-[var(--line-strong)] disabled:opacity-45">
        {darkOn ? 'a.theme = "light"' : 'a.theme = "dark"'}
      </button>
    </div>
  );
}

export function checkSingleton(state: unknown, goal: Record<string, unknown>) {
  const st = state as SingletonState | undefined;
  if (!st) return false;
  const keys = ["normalCalls", "singletonCalls", "normalObjects", "singletonObjects"] as const;
  const used = keys.filter((k) => typeof goal[k] === "number");
  return used.length > 0 && used.every((k) => st[k] === goal[k]);
}
