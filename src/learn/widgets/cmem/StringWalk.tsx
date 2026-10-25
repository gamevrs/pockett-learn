"use client";

import React, { useState } from "react";
import { ChevronRight, FastForward, RotateCcw, TriangleAlert } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { byteHex, charOf, hex, Readout } from "./shared";

export interface StringWalkProps {
  /** The characters stored in the array. */
  text: string;
  /** Array name (default "s"). */
  name?: string;
  /** Size of the char array in bytes (default text length + 1). */
  capacity?: number;
  /** Is there a '\0' after the text? Default true. */
  terminated?: boolean;
  /** Let the learner remove and restore the '\0'. */
  toggle?: boolean;
  /** Bytes in memory after the array (whatever happens to live there). Default "#x" then a zero. */
  after?: number[] | string;
  /** Address of s[0] (default 0x3000). */
  base?: number;
  label?: string;
}

export interface StringWalkState {
  /** strlen's counter so far. */
  count: number;
  /** strlen found a '\0' (or ran off the end of what's shown). */
  done: boolean;
  terminated: boolean;
  /** strlen read past the end of the array. */
  overran: boolean;
}

/** strlen, one byte at a time: count until a 0 byte. Remove the terminator and watch it keep going. */
export function StringWalk({ props, onChange, revealed }: WidgetProps<StringWalkProps>) {
  const name = props.name ?? "s";
  const base = props.base ?? 0x3000;
  const text = [...props.text].map((c) => c.charCodeAt(0) & 0xff);
  const cap = Math.max(props.capacity ?? text.length + 1, text.length);
  const afterBytes = typeof props.after === "string" ? [...props.after].map((c) => c.charCodeAt(0) & 0xff) : (props.after ?? [0x23, 0x78, 0x00]);
  const [terminated, setTerminated] = useState(props.terminated ?? true);
  const [pos, setPos] = useState(0); // next byte strlen will look at
  const [done, setDone] = useState(false);
  const locked = Boolean(revealed);

  // the array: text, then '\0' (if any), then zeros (or leftover junk) up to capacity
  const arr: number[] = [...text];
  for (let k = text.length; k < cap; k++) arr.push(k === text.length && !terminated ? 0x21 : 0);
  const mem = [...arr, ...afterBytes];
  const count = pos;
  const overran = pos >= cap;
  const ranOff = done && pos >= mem.length;

  const report = (p: number, d: boolean, t: boolean) => onChange?.({ count: p, done: d, terminated: t, overran: p >= cap } satisfies StringWalkState);

  const step = () => {
    if (done || locked) return;
    if (pos >= mem.length || mem[pos] === 0) {
      setDone(true);
      report(pos, true, terminated);
      return;
    }
    const np = pos + 1;
    setPos(np);
    report(np, false, terminated);
  };
  const runAll = () => {
    if (done || locked) return;
    let p = pos;
    while (p < mem.length && mem[p] !== 0) p++;
    setPos(p);
    setDone(true);
    report(p, true, terminated);
  };
  const reset = (t = terminated) => {
    setPos(0);
    setDone(false);
    report(0, false, t);
  };
  const flip = () => {
    const t = !terminated;
    setTerminated(t);
    reset(t);
  };

  return (
    <div className="w-full min-w-0">
      {props.label && <p className="mb-3 text-center text-xs font-medium text-ink-3">{props.label}</p>}

      <div className="overflow-x-auto pb-1">
        <div className="mx-auto flex w-max items-stretch">
          {mem.map((b, k) => {
            const inArr = k < cap;
            const looking = !done && k === pos;
            const found = done && k === pos;
            const counted = k < pos;
            const boundary = k === cap;
            return (
              <div key={k} className={`flex w-[2.55rem] flex-col items-center ${boundary ? "ml-2 border-l-2 border-dashed border-[var(--bad)]/60 pl-2" : ""}`}>
                <span className="mb-1 font-mono text-[0.6rem] tabular-nums text-ink-3">{inArr ? `[${k}]` : "·"}</span>
                <span
                  className={`-ml-px flex h-12 w-full flex-col items-center justify-center border font-mono transition-colors ${
                    found
                      ? b === 0
                        ? "relative z-10 border-[var(--brand)] bg-primary text-primary-ink"
                        : "relative z-10 border-[var(--bad)] text-bad"
                      : looking
                        ? "relative z-10 border-[var(--brand)] bg-tint text-ink ring-1 ring-[var(--brand)]"
                        : counted
                          ? inArr
                            ? "border-[var(--brand)]/50 bg-tint text-ink"
                            : "border-[var(--bad)]/50 bg-surface text-bad"
                          : inArr
                            ? "border-[var(--line-strong)] bg-surface-2 text-ink"
                            : "border-dashed border-line text-ink-3"
                  }`}
                >
                  <span className="text-sm font-semibold">{charOf(b)}</span>
                  <span className="text-[0.58rem] opacity-70">{byteHex(b)}</span>
                </span>
                <span className="mt-1 h-3 text-[0.6rem] font-semibold text-brand">{looking ? "▲" : ""}</span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-1 text-center text-[0.68rem] text-ink-3">
        <span className="font-mono">char {name}[{cap}]</span> starts at <span className="font-mono">{hex(base)}</span>; the dashed line is where it ends and other memory begins.
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <button type="button" className="btn btn-primary !h-10" onClick={step} disabled={done || locked}>
          {pos === 0 && !done ? "Look at s[0]" : done ? "Stopped" : `Look at byte ${pos}`} {!done && <ChevronRight className="h-4 w-4" />}
        </button>
        <button type="button" className="btn !h-10" onClick={runAll} disabled={done || locked}>
          <FastForward className="h-4 w-4" /> Run strlen
        </button>
        <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" onClick={() => reset()} disabled={(pos === 0 && !done) || locked} aria-label="Start over" title="Start over">
          <RotateCcw className="h-4 w-4" />
        </button>
        {props.toggle && (
          <button type="button" className="btn btn-sm !h-10" onClick={flip} disabled={locked} aria-pressed={!terminated}>
            {terminated ? "Remove the \\0" : "Put the \\0 back"}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <Readout label="count" value={count} strong={done && !overran} bad={overran} />
        {done && <Readout label={`strlen(${name})`} value={ranOff ? "??" : count} strong={!overran} bad={overran} />}
      </div>
      <p className={`mt-2 flex min-h-[2.5rem] items-start justify-center gap-1.5 text-center text-sm leading-snug ${overran ? "text-bad" : "text-ink-2"}`} aria-live="polite">
        {overran && <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
        <span>
          {!done && pos === 0 && "strlen starts at the first byte and counts until it finds a 0 byte."}
          {!done && pos > 0 && pos < cap && `Byte ${pos - 1} wasn't 0, so the count went up.`}
          {!done && pos >= cap && "That byte isn't part of the array any more, but strlen can't know that. It keeps reading."}
          {done && !overran && `Found the '\\0' at byte ${pos}: the string is ${count} characters long. The terminator isn't counted.`}
          {done && overran && !ranOff && `It ran past the end of ${name} and only stopped at a 0 byte that belongs to something else: the answer ${count} is wrong.`}
          {ranOff && "No 0 byte anywhere in sight. A real program would keep reading until it hit a 0 or crashed."}
        </span>
      </p>
    </div>
  );
}

export function checkStringWalk(state: unknown, goal: Record<string, unknown>) {
  const s = state as StringWalkState | undefined;
  if (!s) return false;
  if (goal.done !== undefined && s.done !== goal.done) return false;
  if (typeof goal.count === "number" && s.count !== goal.count) return false;
  if (goal.terminated !== undefined && s.terminated !== goal.terminated) return false;
  if (goal.overran !== undefined && s.overran !== goal.overran) return false;
  return true;
}
