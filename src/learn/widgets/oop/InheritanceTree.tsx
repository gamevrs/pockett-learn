"use client";

import React, { useState } from "react";
import { Check, CornerDownRight, X } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption } from "./shared";

export interface TreeMember {
  /** "speak()" for a method, "name" for an attribute. */
  name: string;
  /** What this class's version does, e.g. 'returns "Woof"'. */
  does?: string;
}

export interface TreeClass {
  name: string;
  parent?: string;
  members: Array<string | TreeMember>;
}

export interface TreeProps {
  classes: TreeClass[];
  /** Class selected at the start. Default: the first class. */
  initial?: string;
  /** Show the "is-a" checker. Default true. */
  isa?: boolean;
  /** Starting pair for the is-a checker. Default: last class, first class. */
  isaPair?: [string, string];
}

export interface TreeState {
  selected: string;
  lookups: string[];
  isaChecks: string[];
}

type Resolved = { name: string; owner: string; does?: string; status: "own" | "overrides" | "inherited"; path: string[]; base?: string };

const article = (word: string) => (/^[AEIOU]/i.test(word) ? "an" : "a");
const member = (m: string | TreeMember): TreeMember => (typeof m === "string" ? { name: m } : m);

function chainOf(classes: TreeClass[], name: string): string[] {
  const out: string[] = [];
  let cur = classes.find((c) => c.name === name);
  while (cur && !out.includes(cur.name)) {
    out.push(cur.name);
    cur = cur.parent ? classes.find((c) => c.name === cur!.parent) : undefined;
  }
  return out;
}

export function resolveMembers(classes: TreeClass[], name: string): Resolved[] {
  const chain = chainOf(classes, name);
  const seen = new Map<string, Resolved>();
  chain.forEach((cls, depth) => {
    const def = classes.find((c) => c.name === cls)!;
    for (const raw of def.members) {
      const m = member(raw);
      const prev = seen.get(m.name);
      if (!prev) {
        seen.set(m.name, { name: m.name, owner: cls, does: m.does, status: depth === 0 ? "own" : "inherited", path: chain.slice(0, depth + 1) });
      } else if (prev.owner === name && prev.status === "own") {
        prev.status = "overrides";
        prev.base = cls;
      }
    }
  });
  const order = { own: 0, overrides: 1, inherited: 2 };
  return [...seen.values()].sort((a, b) => order[a.status] - order[b.status]);
}

/** Click a class to see its own, overridden and inherited members; check "is-a" between classes. */
export function InheritanceTree({ props, onChange, revealed }: WidgetProps<TreeProps>) {
  const classes = props.classes;
  const [state, setState] = useState<TreeState>({ selected: props.initial ?? classes[0]?.name ?? "", lookups: [], isaChecks: [] });
  const [lookup, setLookup] = useState<string | null>(null);
  const [isaA, setIsaA] = useState(props.isaPair?.[0] ?? classes[classes.length - 1]?.name ?? "");
  const [isaB, setIsaB] = useState(props.isaPair?.[1] ?? classes[0]?.name ?? "");
  const [isaShown, setIsaShown] = useState(false);
  const locked = Boolean(revealed);

  const commit = (next: TreeState) => {
    setState(next);
    onChange?.(next);
  };
  const select = (name: string) => {
    setLookup(null);
    if (!locked) commit({ ...state, selected: name });
    else setState({ ...state, selected: name });
  };
  const tapMember = (m: string) => {
    setLookup(m === lookup ? null : m);
    const key = `${state.selected}.${m}`;
    if (!locked && !state.lookups.includes(key)) commit({ ...state, lookups: [...state.lookups, key] });
  };
  const runIsa = () => {
    setIsaShown(true);
    const key = `${isaA}>${isaB}`;
    if (!locked && !state.isaChecks.includes(key)) commit({ ...state, isaChecks: [...state.isaChecks, key] });
  };

  // tree rows, depth-first
  const rows: Array<{ name: string; depth: number }> = [];
  const isRoot = (k: TreeClass) => !k.parent || !classes.some((p) => p.name === k.parent);
  const walk = (parent: string | undefined, depth: number) => {
    for (const c of classes.filter((k) => (parent === undefined ? isRoot(k) : k.parent === parent))) {
      if (rows.some((r) => r.name === c.name)) continue;
      rows.push({ name: c.name, depth });
      walk(c.name, depth + 1);
    }
  };
  walk(undefined, 0);

  const sel = classes.find((c) => c.name === state.selected) ?? classes[0];
  const members = sel ? resolveMembers(classes, sel.name) : [];
  const chain = sel ? chainOf(classes, sel.name) : [];
  const looked = members.find((m) => m.name === lookup);
  const isaChain = chainOf(classes, isaA);
  const isaYes = isaChain.includes(isaB);

  return (
    <div className="w-full text-sm">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {/* tree */}
        <div>
          <Caption>Class tree · tap a class</Caption>
          <ul className="grid gap-1">
            {rows.map((r) => {
              const on = r.name === sel?.name;
              const inChain = chain.includes(r.name);
              return (
                <li key={r.name} style={{ paddingLeft: r.depth * 18 }}>
                  <button
                    type="button"
                    onClick={() => select(r.name)}
                    aria-pressed={on}
                    className={`flex min-h-10 w-full items-center gap-1.5 rounded-lg border px-2.5 text-left font-mono text-[0.82rem] transition-colors ${
                      on ? "border-transparent bg-primary font-semibold text-primary-ink" : inChain ? "border-[var(--brand)]/40 bg-tint" : "border-line bg-surface hover:border-[var(--line-strong)]"
                    }`}
                  >
                    {r.depth > 0 && <CornerDownRight className={`h-3.5 w-3.5 shrink-0 ${on ? "" : "text-ink-3"}`} />}
                    <span className="truncate">{r.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* details */}
        {sel && (
          <div className="min-w-0">
            <Caption>Inside the class</Caption>
            <div className="rounded-xl border border-line bg-surface p-3">
              <p className="font-mono font-semibold">
                class {sel.name}
                {sel.parent ? <span className="text-ink-3">({sel.parent})</span> : null}:
              </p>
              <p className="mt-1 text-xs text-ink-3">
                Lookup order: <span className="font-mono">{chain.join(" → ")}</span>
              </p>
              <ul className="mt-3 grid gap-1.5">
                {members.map((m) => (
                  <li key={m.name}>
                    <button
                      type="button"
                      onClick={() => tapMember(m.name)}
                      aria-expanded={lookup === m.name}
                      className={`flex min-h-10 w-full flex-wrap items-center justify-between gap-x-2 gap-y-0.5 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                        lookup === m.name ? "bg-tint" : "bg-surface-2 hover:bg-[var(--line)]"
                      }`}
                    >
                      <span className="font-mono text-[0.8rem]">{m.name}</span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[0.68rem] font-medium ${
                          m.status === "own" ? "bg-primary text-primary-ink" : m.status === "overrides" ? "border border-ink text-ink" : "text-ink-3"
                        }`}
                      >
                        {m.status === "own" ? "own" : m.status === "overrides" ? `overrides ${m.base}` : `inherited from ${m.owner}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {looked && (
                <div className="pop-in mt-3 rounded-lg border border-line p-2.5">
                  <p className="font-mono text-xs text-ink-2">
                    {sel.name.toLowerCase()}.{looked.name.replace(/\(\)$/, "")}
                    {looked.name.endsWith("()") ? "()" : ""}: Python looks in
                  </p>
                  <ol className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {looked.path.map((c, i) => {
                      const found = i === looked.path.length - 1;
                      return (
                        <li key={c} className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-mono text-xs ${found ? "bg-primary text-primary-ink" : "bg-surface-2 text-ink-3"}`}>
                            {found ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                            {c}
                          </span>
                          {!found && <span className="text-ink-3">→</span>}
                        </li>
                      );
                    })}
                  </ol>
                  <p className="mt-1.5 text-xs text-ink-2">{looked.does ? `Found in ${looked.owner}: ${looked.does}.` : `Found in ${looked.owner}.`}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {(props.isa ?? true) && (
        <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3">
          <Caption>Is-a check</Caption>
          <div className="flex flex-wrap items-center gap-2">
            <span>Is {article(isaA)}</span>
            <select value={isaA} onChange={(e) => {
                setIsaA(e.target.value);
                setIsaShown(false);
              }} className="input !h-10 !w-auto font-mono" aria-label="First class">
              {classes.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
            <span>{article(isaB)}</span>
            <select value={isaB} onChange={(e) => {
                setIsaB(e.target.value);
                setIsaShown(false);
              }} className="input !h-10 !w-auto font-mono" aria-label="Second class">
              {classes.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
            <span>?</span>
            <button type="button" onClick={runIsa} className="btn !h-10">
              Test
            </button>
          </div>
          {isaShown && (
            <p className={`pop-in mt-2 text-[0.82rem] ${isaYes ? "text-ink" : "text-ink-2"}`}>
              {isaYes ? (
                <>
                  <strong>Yes.</strong> {isaA === isaB ? "Every class is itself." : <>Follow the parents: <span className="font-mono">{isaChain.slice(0, isaChain.indexOf(isaB) + 1).join(" → ")}</span>.</>}
                </>
              ) : (
                <>
                  <strong>No.</strong> {isaA}&apos;s chain is <span className="font-mono">{isaChain.join(" → ")}</span>, and {isaB} isn&apos;t on it.
                  {chainOf(classes, isaB).includes(isaA) ? ` It's the other way round: every ${isaB} is a ${isaA}.` : ""}
                </>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function checkTree(state: unknown, goal: Record<string, unknown>) {
  const s = state as TreeState | undefined;
  if (!s) return false;
  if (typeof goal.selected === "string" && s.selected !== goal.selected) return false;
  if (typeof goal.lookup === "string" && !s.lookups.includes(goal.lookup)) return false;
  if (Array.isArray(goal.isa) && !s.isaChecks.includes(`${goal.isa[0]}>${goal.isa[1]}`)) return false;
  return true;
}
