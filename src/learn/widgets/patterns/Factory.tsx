"use client";

import React, { useState } from "react";
import { Factory as FactoryIcon, Plus, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, CodePane, Readout, Segmented } from "./ui";

/**
 * Factory, two views:
 * - "build": ask the factory for shapes by name and watch it build them (unknown names fail).
 * - "change": add a new shape kind with and without a factory and count the files you edit.
 */

const KNOWN = ["circle", "square", "triangle"] as const;
const CLASS: Record<string, string> = { circle: "Circle", square: "Square", triangle: "Triangle", hexagon: "Hexagon" };

export interface FactoryProps {
  view?: "build" | "change";
  /** Names offered as request buttons in the build view (unknown names show the error path). */
  kinds?: string[];
  /** Starting mode for the change view. */
  mode?: "without" | "with";
}

export interface FactoryState {
  created: string[];
  mode: "without" | "with";
  added: { without: boolean; with: boolean };
}

export function Factory({ props, onChange, revealed }: WidgetProps<FactoryProps>) {
  const view = props.view ?? "build";
  const [created, setCreated] = useState<string[]>([]);
  const [last, setLast] = useState<{ kind: string; ok: boolean; n: number } | null>(null);
  const [mode, setMode] = useState<"without" | "with">(props.mode ?? "without");
  const [added, setAdded] = useState({ without: false, with: false });

  const report = (c: string[], m: "without" | "with", a: { without: boolean; with: boolean }) => onChange?.({ created: c, mode: m, added: a } satisfies FactoryState);

  const request = (kind: string) => {
    if (revealed) return;
    const ok = (KNOWN as readonly string[]).includes(kind);
    const next = ok ? [...created, kind] : created;
    setCreated(next);
    setLast({ kind, ok, n: (last?.n ?? 0) + 1 });
    report(next, mode, added);
  };
  const reset = () => {
    setCreated([]);
    setLast(null);
    report([], mode, added);
  };
  const switchMode = (m: "without" | "with") => {
    setMode(m);
    report(created, m, added);
  };
  const addHexagon = () => {
    const a = { ...added, [mode]: !added[mode] };
    setAdded(a);
    report(created, mode, a);
  };

  if (view === "build") {
    const kinds = props.kinds ?? ["circle", "square", "triangle", "star"];
    return (
      <div className="w-full">
        <Caption>Ask by name</Caption>
        <div className="mt-2 flex flex-wrap gap-2">
          {kinds.map((k) => (
            <button key={k} type="button" disabled={revealed} onClick={() => request(k)} className="inline-flex min-h-10 items-center rounded-full border border-line bg-surface px-3.5 font-mono text-[13px] text-ink hover:border-[var(--line-strong)] hover:bg-surface-2 disabled:opacity-45">
              make_shape(&quot;{k}&quot;)
            </button>
          ))}
        </div>

        {/* the factory */}
        <div className="mt-4 flex items-stretch gap-3 rounded-xl border border-line bg-surface-2 p-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-ink-2 ring-1 ring-[var(--line)]">
            <FactoryIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1" aria-live="polite">
            <Caption>Factory</Caption>
            {!last ? (
              <p className="mt-0.5 text-sm text-ink-3">Waiting for an order.</p>
            ) : last.ok ? (
              <p key={last.n} className="pop-in mt-0.5 font-mono text-[12.5px] text-ink-2">
                &quot;{last.kind}&quot; → <span className="text-ink">{CLASS[last.kind]}(size=1)</span>
              </p>
            ) : (
              <p key={last.n} className="pop-in mt-0.5 font-mono text-[12.5px] text-bad">ValueError: unknown shape &quot;{last.kind}&quot;</p>
            )}
          </div>
        </div>

        {/* products */}
        <div className="mt-3 flex items-center justify-between">
          <Caption>Built so far ({created.length})</Caption>
          {created.length > 0 && !revealed && (
            <button type="button" onClick={reset} className="inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-xs text-ink-2 hover:bg-surface-2 hover:text-ink">
              <RotateCcw className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
        <div className="mt-1 flex min-h-[4.5rem] flex-wrap gap-2 rounded-xl border border-dashed border-[var(--line-strong)] p-2">
          {created.length === 0 && <p className="self-center px-2 text-sm text-ink-3">Nothing yet.</p>}
          {created.map((k, i) => (
            <span key={i} className="pop-in flex w-[4.25rem] flex-col items-center gap-1 rounded-lg border border-line bg-surface py-2">
              <ShapeIcon kind={k} />
              <span className="font-mono text-[10.5px] text-ink-2">{CLASS[k]}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  // ── change view ──
  const isAdded = added[mode];
  const files = mode === "without" ? withoutFiles(isAdded) : withFiles(isAdded);
  const edited = files.filter((f) => f.edited).length;
  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented label="Design" value={mode} onChange={switchMode} options={[{ id: "without", label: "Without factory" }, { id: "with", label: "With factory" }]} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={addHexagon} className={`btn !h-10 ${isAdded ? "" : "btn-primary"}`}>
          {isAdded ? <RotateCcw className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isAdded ? "Undo the hexagon" : "Add a hexagon shape"}
        </button>
        <Readout label="Files edited" value={edited} accent={isAdded} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {files.map((f) => (
          <CodePane
            key={`${mode}-${f.name}`}
            title={f.name}
            badge={f.edited ? <span className="text-[#a3e635]">edited</span> : <span>unchanged</span>}
            code={f.code}
            highlight={f.highlight}
          />
        ))}
      </div>
    </div>
  );
}

interface FileView {
  name: string;
  code: string;
  highlight: number[];
  edited: boolean;
}

function withoutFiles(added: boolean): FileView[] {
  const sites = [
    { name: "editor.py", key: "kind" },
    { name: "importer.py", key: 'row["kind"]' },
    { name: "toolbar.py", key: "button.kind" },
  ];
  return sites.map(({ name, key }) => {
    const lines = [`if ${key} == "circle":`, "    s = Circle(1)", `elif ${key} == "square":`, "    s = Square(1)"];
    if (added) lines.push(`elif ${key} == "hexagon":`, "    s = Hexagon(1)");
    return { name, code: lines.join("\n"), highlight: added ? [4, 5] : [], edited: added };
  });
}

function withFiles(added: boolean): FileView[] {
  const sites: FileView[] = [
    { name: "editor.py", code: "s = make_shape(kind)", highlight: [], edited: false },
    { name: "importer.py", code: 's = make_shape(row["kind"])', highlight: [], edited: false },
    { name: "toolbar.py", code: "s = make_shape(button.kind)", highlight: [], edited: false },
  ];
  const lines = ["SHAPES = {", '    "circle": Circle,', '    "square": Square,'];
  if (added) lines.push('    "hexagon": Hexagon,');
  lines.push("}", "", "def make_shape(kind):", "    if kind not in SHAPES:", "        raise ValueError(kind)", "    return SHAPES[kind](1)");
  return [{ name: "shapes.py · the factory", code: lines.join("\n"), highlight: added ? [3] : [], edited: added }, ...sites];
}

function ShapeIcon({ kind }: { kind: string }) {
  const common = { fill: "var(--primary)", stroke: "var(--ink)", strokeWidth: 1.5 };
  return (
    <svg viewBox="0 0 28 28" className="h-7 w-7" aria-hidden>
      {kind === "circle" && <circle cx="14" cy="14" r="10" {...common} />}
      {kind === "square" && <rect x="5" y="5" width="18" height="18" rx="2" {...common} />}
      {kind === "triangle" && <path d="M14 4 L25 23 L3 23 Z" {...common} strokeLinejoin="round" />}
      {kind === "hexagon" && <path d="M8 4 H20 L26 14 L20 24 H8 L2 14 Z" {...common} strokeLinejoin="round" />}
    </svg>
  );
}

export function checkFactory(state: unknown, goal: Record<string, unknown>) {
  const st = state as FactoryState | undefined;
  if (!st) return false;
  if (goal.created && typeof goal.created === "object") {
    const want = goal.created as Record<string, number>;
    const counts: Record<string, number> = {};
    for (const k of st.created) counts[k] = (counts[k] ?? 0) + 1;
    const keys = new Set([...Object.keys(want), ...Object.keys(counts)]);
    for (const k of keys) if ((counts[k] ?? 0) !== (want[k] ?? 0)) return false;
    return true;
  }
  if (goal.added && typeof goal.added === "object") {
    const want = goal.added as { without?: boolean; with?: boolean };
    return (want.without === undefined || st.added.without === want.without) && (want.with === undefined || st.added.with === want.with);
  }
  return false;
}
