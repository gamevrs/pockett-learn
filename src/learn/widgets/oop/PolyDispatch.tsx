"use client";

import React, { useState } from "react";
import { Plus, Send } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Code } from "./shared";

export interface DispatchObject {
  /** Class name, e.g. "Circle". */
  cls: string;
  /** How the object was made, e.g. "Circle(2)". */
  label: string;
  /** What it answers, e.g. "12.57". */
  reply: string;
}

export interface DispatchProps {
  /** The message every object receives, e.g. "area()". */
  message: string;
  /** Name of the list in the caller's loop. Default "items". */
  listName?: string;
  /** Loop variable. Default "x". */
  varName?: string;
  objects: DispatchObject[];
  /** Objects the learner can add (new classes the caller never heard of). */
  extras?: DispatchObject[];
  /** Offer a tab showing the same caller written without polymorphism (an if/elif chain). */
  contrast?: boolean;
}

export interface DispatchState {
  sends: number;
  kinds: string[];
  /** Classes that answered the latest send. */
  sentKinds: string[];
}

const unique = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) === i);

/** Send one message to a list of different objects; each answers its own way. */
export function PolyDispatch({ props, onChange, revealed }: WidgetProps<DispatchProps>) {
  const list = props.listName ?? "items";
  const v = props.varName ?? "x";
  const [objects, setObjects] = useState<DispatchObject[]>(props.objects);
  const [answered, setAnswered] = useState(0);
  const [sends, setSends] = useState(0);
  const [tab, setTab] = useState<"poly" | "chain">("poly");
  const locked = Boolean(revealed);
  const extras = (props.extras ?? []).filter((e) => !objects.some((o) => o.label === e.label));
  const kinds = unique(objects.map((o) => o.cls));
  const baseKinds = unique(props.objects.map((o) => o.cls));
  const newKinds = kinds.filter((k) => !baseKinds.includes(k));

  const report = (objs: DispatchObject[], n: number, answeredCount: number) =>
    onChange?.({ sends: n, kinds: unique(objs.map((o) => o.cls)), sentKinds: unique(objs.slice(0, answeredCount).map((o) => o.cls)) } satisfies DispatchState);

  const send = () => {
    if (locked) return;
    setAnswered(objects.length);
    setSends(sends + 1);
    report(objects, sends + 1, objects.length);
  };
  const add = (o: DispatchObject) => {
    if (locked) return;
    const next = [...objects, o];
    setObjects(next);
    report(next, sends, answered);
  };

  const method = props.message.replace(/\(.*\)$/, "");
  const polyCode = `for ${v} in ${list}:\n    print(${v}.${props.message})`;
  const chainCode = [
    `for ${v} in ${list}:`,
    ...kinds.flatMap((k, i) => [`    ${i === 0 ? "if" : "elif"} type(${v}) is ${k}:`, `        ...  # ${k}'s ${method} logic, copied in here`]),
  ].join("\n");
  const code = tab === "poly" ? polyCode : chainCode;
  const lines = code.split("\n").length;

  return (
    <div className="w-full text-sm">
      {props.contrast && (
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface-2 p-1" role="tablist" aria-label="Caller code">
          {(["poly", "chain"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`h-10 rounded-lg text-[0.82rem] font-medium transition-colors ${tab === t ? "bg-surface text-ink shadow-[var(--shadow)]" : "text-ink-3 hover:text-ink"}`}
            >
              {t === "poly" ? "With polymorphism" : "Without"}
            </button>
          ))}
        </div>
      )}

      <Caption>The caller · {lines} lines</Caption>
      <Code code={code} />
      {newKinds.length > 0 && (
        <p className="pop-in mt-2 text-xs text-ink-2">
          {tab === "poly"
            ? `${newKinds.join(" and ")} joined the list. The caller didn't change a single character.`
            : `${newKinds.join(" and ")} joined the list, so this chain had to grow by ${newKinds.length * 2} lines, in every place that does this.`}
        </p>
      )}

      <div className="mt-4">
        <Caption>
          {list} · {objects.length} objects, {kinds.length} classes
        </Caption>
        <ul className="grid gap-1.5">
          {objects.map((o, i) => {
            const done = i < answered;
            return (
              <li key={o.label} className={`flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-xl border px-3 py-2 ${newKinds.includes(o.cls) ? "border-[var(--brand)]/40 bg-tint" : "border-line bg-surface"}`}>
                <span className="flex items-center gap-2">
                  <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[0.68rem] font-medium text-ink-2">{o.cls}</span>
                  <span className="font-mono text-[0.8rem]">{o.label}</span>
                </span>
                {done ? (
                  <span key={`${sends}-${i}`} className="pop-in ml-auto font-mono text-[0.8rem]" style={{ animationDelay: `${i * 110}ms` }}>
                    <span className="text-ink-3">.{props.message} → </span>
                    <span className="font-semibold">{o.reply}</span>
                  </span>
                ) : (
                  <span className="text-xs text-ink-3">{sends > 0 ? "not asked yet" : ""}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-3 grid gap-2">
        <button type="button" onClick={send} disabled={locked} className="btn btn-primary !h-11 w-full">
          <Send className="h-4 w-4 shrink-0" />
          <span className="truncate">
            Send <span className="font-mono">.{props.message}</span> to every object
          </span>
        </button>
        {extras.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {extras.map((e) => (
              <button key={e.label} type="button" onClick={() => add(e)} disabled={locked} className="btn !h-10 font-mono !text-[0.78rem]">
                <Plus className="h-3.5 w-3.5" /> {e.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function checkDispatch(state: unknown, goal: Record<string, unknown>) {
  const s = state as DispatchState | undefined;
  if (!s) return false;
  if (typeof goal.sends === "number" && s.sends < goal.sends) return false;
  if (Array.isArray(goal.sentKinds) && !goal.sentKinds.every((k) => s.sentKinds.includes(k))) return false;
  return true;
}
