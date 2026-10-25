"use client";

import React, { useState } from "react";
import { Redo2, Undo2 } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption } from "./ui";

/**
 * Command: every button press becomes a command object in a history list. Undo walks back,
 * redo walks forward, and running a new command after an undo throws the redo part away.
 */

export interface CommandProps {
  /** Buttons: "UPPER" makes an Uppercase command; any other string is text to type. */
  buttons?: string[];
  /** Commands already run when the widget opens (same encoding). */
  initial?: string[];
}

export interface CommandState {
  text: string;
  /** Labels of the commands currently done, oldest first. */
  done: string[];
  redo: number;
}

interface Cmd {
  key: number;
  spec: string;
}

const MAX = 8;
const isUpper = (s: string) => s === "UPPER";
const label = (s: string) => (isUpper(s) ? "Uppercase()" : `TypeText(${JSON.stringify(s)})`);
const apply = (text: string, spec: string) => (isUpper(spec) ? text.toUpperCase() : text + spec);
const replay = (cmds: Cmd[]) => cmds.reduce((t, c) => apply(t, c.spec), "");

export function Command({ props, onChange, revealed }: WidgetProps<CommandProps>) {
  const buttons = props.buttons ?? ["Hello", " world", "!", "UPPER"];
  const [cmds, setCmds] = useState<Cmd[]>(() => (props.initial ?? []).map((spec, i) => ({ key: i + 1, spec })));
  const [pointer, setPointer] = useState(props.initial?.length ?? 0);
  const [nextKey, setNextKey] = useState((props.initial?.length ?? 0) + 1);
  const [note, setNote] = useState<{ n: number; text: string } | null>(null);
  const done = cmds.slice(0, pointer);
  const text = replay(done);

  const report = (all: Cmd[], p: number) => {
    const d = all.slice(0, p);
    onChange?.({ text: replay(d), done: d.map((c) => label(c.spec)), redo: all.length - p } satisfies CommandState);
  };

  const run = (spec: string) => {
    if (revealed || pointer >= MAX) return;
    const discarded = cmds.length - pointer;
    const next = [...cmds.slice(0, pointer), { key: nextKey, spec }];
    setCmds(next);
    setPointer(next.length);
    setNextKey(nextKey + 1);
    setNote(discarded > 0 ? { n: nextKey, text: `New command after an undo: ${discarded} redo ${discarded === 1 ? "step was" : "steps were"} thrown away.` } : null);
    report(next, next.length);
  };
  const undo = () => {
    if (revealed || pointer === 0) return;
    setPointer(pointer - 1);
    setNote(null);
    report(cmds, pointer - 1);
  };
  const redo = () => {
    if (revealed || pointer >= cmds.length) return;
    setPointer(pointer + 1);
    setNote(null);
    report(cmds, pointer + 1);
  };

  return (
    <div className="w-full">
      {/* document */}
      <Caption>Document</Caption>
      <div className="mt-1.5 flex min-h-12 items-center rounded-xl border border-line bg-surface px-3 py-2 font-mono text-[15px] text-ink">
        <span className="whitespace-pre-wrap break-all">{text}</span>
        <span className="ml-px inline-block h-5 w-[2px] animate-pulse bg-[var(--brand)]" aria-hidden />
        {text === "" && <span className="ml-2 font-sans text-sm text-ink-3">(empty)</span>}
      </div>

      {/* toolbar */}
      <div className="mt-3 flex flex-wrap gap-2">
        {buttons.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => run(b)}
            disabled={revealed || pointer >= MAX}
            className="inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-3 text-sm text-ink hover:border-[var(--line-strong)] hover:bg-surface-2 disabled:opacity-45"
          >
            {isUpper(b) ? "UPPERCASE" : <span className="whitespace-pre font-mono text-[13px]">Type {JSON.stringify(b)}</span>}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" className="btn !h-10 flex-1 sm:flex-none" onClick={undo} disabled={revealed || pointer === 0}>
          <Undo2 className="h-4 w-4" /> Undo
        </button>
        <button type="button" className="btn !h-10 flex-1 sm:flex-none" onClick={redo} disabled={revealed || pointer >= cmds.length}>
          <Redo2 className="h-4 w-4" /> Redo
        </button>
      </div>

      {/* history */}
      <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3">
        <div className="flex items-center justify-between">
          <Caption>history (command objects)</Caption>
          <span className="font-mono text-[11px] text-ink-3">
            {pointer} done · {cmds.length - pointer} redo
          </span>
        </div>
        {cmds.length === 0 ? (
          <p className="mt-2 text-sm text-ink-3">Empty. Press a button above.</p>
        ) : (
          <ol className="mt-2 grid gap-1">
            {pointer === 0 && <PointerMark />}
            {cmds.map((c, i) => {
              const isDone = i < pointer;
              const before = replay(cmds.slice(0, i));
              return (
                <React.Fragment key={c.key}>
                  <li
                    className={`pop-in flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 rounded-lg border px-2.5 py-1.5 font-mono text-[12px] ${
                      isDone ? "border-line bg-surface text-ink" : "border-dashed border-[var(--line-strong)] bg-transparent text-ink-3"
                    }`}
                  >
                    <span>{label(c.spec)}</span>
                    <span className="text-[11px] text-ink-3">undo: {isUpper(c.spec) ? `restore ${JSON.stringify(before)}` : `remove ${JSON.stringify(c.spec)}`}</span>
                  </li>
                  {i === pointer - 1 && pointer < cmds.length && <PointerMark />}
                </React.Fragment>
              );
            })}
            {pointer === cmds.length && <PointerMark />}
          </ol>
        )}
        {note && (
          <p key={note.n} className="pop-in mt-2 text-xs text-ink-2">
            {note.text}
          </p>
        )}
      </div>
    </div>
  );
}

function PointerMark() {
  return (
    <li className="flex items-center gap-2 py-0.5 text-[11px] font-medium text-brand" aria-label="You are here">
      <span className="h-px flex-1 bg-[var(--brand)]" /> you are here <span className="h-px flex-1 bg-[var(--brand)]" />
    </li>
  );
}

export function checkCommand(state: unknown, goal: Record<string, unknown>) {
  const st = state as CommandState | undefined;
  if (!st) return false;
  if (typeof goal.text === "string" && st.text !== goal.text) return false;
  if (typeof goal.redo === "number" && st.redo !== goal.redo) return false;
  return typeof goal.text === "string" || typeof goal.redo === "number";
}
