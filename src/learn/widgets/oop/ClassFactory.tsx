"use client";

import React, { useState } from "react";
import { Plus, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { address, Caption, Code, pyValue } from "./shared";

type Val = string | number;

export interface FactoryField {
  name: string;
  /** Starting value set inside __init__. Fields without one are constructor parameters. */
  init?: Val;
}

export interface FactoryMethod {
  name: string;
  /** Field this method changes. */
  field?: string;
  /** Add this number to the field. */
  add?: number;
  /** Or set the field to this value. */
  set?: Val;
  /** What the method returns; {field} is replaced with the object's value, e.g. "Woof! I'm {name}". */
  says?: string;
}

export interface FactoryProps {
  /** Class name, e.g. "Dog". */
  className: string;
  fields: FactoryField[];
  methods: FactoryMethod[];
  /** Constructor arguments for each object you create, in order (keys = parameter fields). `var` names the variable. */
  presets: Array<Record<string, Val> & { var?: string }>;
  /** Objects that already exist when the widget opens. Default 0. */
  initial?: number;
  /** Show the Python source of the class. Default false. */
  showCode?: boolean;
}

export interface FactoryObject {
  var: string;
  values: Record<string, Val>;
  /** Values right after construction. */
  start: Record<string, Val>;
  calls: number;
  said?: string;
  /** Last field a method changed (for the flash). */
  touched?: string;
  stamp: number;
}

export interface FactoryState {
  objects: FactoryObject[];
  calls: number;
}

function build(props: FactoryProps, i: number): FactoryObject {
  const preset = props.presets[i % props.presets.length] ?? {};
  const values: Record<string, Val> = {};
  for (const f of props.fields) values[f.name] = f.init !== undefined ? f.init : (preset[f.name] ?? "");
  return { var: preset.var ?? `${props.className.toLowerCase()}${i + 1}`, values, start: { ...values }, calls: 0, stamp: 0 };
}

function fill(template: string, values: Record<string, Val>) {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
}

export function classSource(props: FactoryProps): string {
  const params = props.fields.filter((f) => f.init === undefined).map((f) => f.name);
  const lines = [`class ${props.className}:`, `    def __init__(self${params.map((p) => `, ${p}`).join("")}):`];
  for (const f of props.fields) lines.push(`        self.${f.name} = ${f.init !== undefined ? pyValue(f.init) : f.name}`);
  for (const m of props.methods) {
    lines.push("", `    def ${m.name}(self):`);
    if (m.field && m.add !== undefined) lines.push(`        self.${m.field} += ${m.add}`);
    if (m.field && m.set !== undefined) lines.push(`        self.${m.field} = ${pyValue(m.set)}`);
    if (m.says) lines.push(`        return f"${m.says.replace(/\{(\w+)\}/g, "{self.$1}")}"`);
  }
  return lines.join("\n");
}

function ctorCall(props: FactoryProps, i: number) {
  const preset = props.presets[i % props.presets.length] ?? {};
  const args = props.fields.filter((f) => f.init === undefined).map((f) => pyValue(preset[f.name]));
  return `${props.className}(${args.join(", ")})`;
}

/** A class card (the blueprint) that stamps out object cards, each with its own values. */
export function ClassFactory({ props, onChange, revealed }: WidgetProps<FactoryProps>) {
  const max = Math.max(1, Math.min(4, props.presets.length));
  const [objects, setObjects] = useState<FactoryObject[]>(() => Array.from({ length: Math.min(max, props.initial ?? 0) }, (_, i) => build(props, i)));
  const locked = Boolean(revealed);

  const commit = (next: FactoryObject[]) => {
    setObjects(next);
    onChange?.({ objects: next, calls: next.reduce((n, o) => n + o.calls, 0) } satisfies FactoryState);
  };

  const create = () => {
    if (locked || objects.length >= max) return;
    commit([...objects, build(props, objects.length)]);
  };

  const call = (index: number, m: FactoryMethod) => {
    if (locked) return;
    commit(
      objects.map((o, i) => {
        if (i !== index) return o;
        const values = { ...o.values };
        if (m.field && m.add !== undefined) values[m.field] = Number(values[m.field] ?? 0) + m.add;
        if (m.field && m.set !== undefined) values[m.field] = m.set;
        return { ...o, values, calls: o.calls + 1, said: m.says ? fill(m.says, values) : undefined, touched: m.field, stamp: o.stamp + 1 };
      }),
    );
  };

  const reset = () => {
    if (locked) return;
    commit([]);
  };

  return (
    <div className="w-full text-sm">
      <div className="grid gap-4">
        {/* the blueprint */}
        <div className="rounded-2xl border-2 border-dashed border-[var(--line-strong)] bg-surface-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Caption className="!mb-1">Class · the blueprint</Caption>
              <p className="font-mono text-base font-semibold">class {props.className}</p>
            </div>
            {objects.length > 0 && !locked && (
              <button type="button" onClick={reset} className="btn btn-ghost !h-10 !px-3" aria-label="Remove all objects">
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
            )}
          </div>
          {props.showCode ? (
            <Code code={classSource(props)} className="mt-3" />
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-ink-3">Attributes (data)</p>
                <ul className="mt-1 grid gap-1 font-mono text-[0.8rem]">
                  {props.fields.map((f) => (
                    <li key={f.name}>{f.name}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs text-ink-3">Methods (behaviour)</p>
                <ul className="mt-1 grid gap-1 font-mono text-[0.8rem]">
                  {props.methods.map((m) => (
                    <li key={m.name}>{m.name}()</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <button type="button" onClick={create} disabled={locked || objects.length >= max} className="btn btn-primary mt-4 !h-11 w-full !justify-start font-mono !text-[0.8rem]">
            <Plus className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {objects.length >= max ? "That's enough objects for now" : `${build(props, objects.length).var} = ${ctorCall(props, objects.length)}`}
            </span>
          </button>
        </div>

        {/* the objects */}
        <div>
          <Caption>
            Objects in memory · {objects.length}
          </Caption>
          {objects.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-4 text-center text-ink-3">No objects yet. The class alone holds no values: create one.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {objects.map((o, i) => (
                <div key={o.var} className="pop-in rounded-xl border border-line bg-surface p-3 shadow-[var(--shadow)]">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                    <span className="font-mono font-semibold">{o.var}</span>
                    <span className="font-mono text-[0.68rem] text-ink-3">
                      {props.className} object at {address(i)}
                    </span>
                  </div>
                  <dl className="mt-2 grid gap-1 rounded-lg bg-surface-2 p-2 font-mono text-[0.8rem]">
                    {props.fields.map((f) => (
                      <div key={f.name} className="flex items-center justify-between gap-2">
                        <dt className="text-ink-3">{f.name}</dt>
                        <dd key={o.touched === f.name ? o.stamp : 0} className={`truncate font-semibold ${o.touched === f.name && o.stamp > 0 ? "pop-in rounded bg-primary px-1.5 text-primary-ink" : ""}`}>
                          {pyValue(o.values[f.name])}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {props.methods.map((m) => (
                      <button key={m.name} type="button" disabled={locked} onClick={() => call(i, m)} className="btn !h-10 !px-3 font-mono !text-[0.78rem]">
                        .{m.name}()
                      </button>
                    ))}
                  </div>
                  {o.said && (
                    <p key={o.stamp} className="pop-in mt-2 truncate font-mono text-[0.78rem] text-ink-2">
                      <span className="text-ink-3">→ </span>
                      {pyValue(o.said)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function checkFactory(state: unknown, goal: Record<string, unknown>) {
  const s = state as FactoryState | undefined;
  if (!s) return false;
  if (typeof goal.objects === "number" && s.objects.length < goal.objects) return false;
  if (typeof goal.calls === "number" && s.calls < goal.calls) return false;
  const match = goal.match as Record<string, Val> | undefined;
  if (match) {
    const hits = s.objects.filter((o) => Object.entries(match).every(([k, v]) => o.values[k] === v));
    if (hits.length === 0) return false;
    const changed = (o: FactoryObject) => Object.keys(o.values).some((k) => o.values[k] !== o.start[k]);
    if (goal.onlyMatchChanged && s.objects.some((o) => !hits.includes(o) && changed(o))) return false;
  }
  return true;
}
