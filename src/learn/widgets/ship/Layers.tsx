"use client";

import React, { useState } from "react";
import { Hammer, Layers as LayersIcon, RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout, Segmented, useReport } from "./kit";

/**
 * An image build, layer by layer. Each Dockerfile instruction makes a layer, and a layer is reused
 * from the cache only if its own inputs are unchanged and every layer above it was reused too.
 * Change the app code or a dependency, rebuild, and watch which layers rebuild and how long it
 * takes. The two orderings differ only in whether the slow dependency install comes before or
 * after the line that copies all the source.
 */

type Order = "copy-first" | "deps-first";
type Edit = "none" | "code" | "deps";

interface Layer {
  id: string;
  line: string;
  secs: number;
  /** Which edits change this layer's inputs. */
  watches: Edit[];
}

const BASE: Layer = { id: "base", line: "FROM python:3.12-slim", secs: 0, watches: [] };
const LAYERS: Record<Order, Layer[]> = {
  "copy-first": [
    BASE,
    { id: "copy-all", line: "COPY . /app", secs: 2, watches: ["code", "deps"] },
    { id: "install", line: "RUN pip install -r requirements.txt", secs: 40, watches: [] },
    { id: "cmd", line: 'CMD ["python", "-m", "orders"]', secs: 0, watches: [] },
  ],
  "deps-first": [
    BASE,
    { id: "copy-req", line: "COPY requirements.txt /app/", secs: 1, watches: ["deps"] },
    { id: "install", line: "RUN pip install -r requirements.txt", secs: 40, watches: [] },
    { id: "copy-all", line: "COPY . /app", secs: 2, watches: ["code", "deps"] },
    { id: "cmd", line: 'CMD ["python", "-m", "orders"]', secs: 0, watches: [] },
  ],
};

interface Build {
  edit: Edit;
  hits: boolean[];
  secs: number;
}

/** Content keys: a layer's key is its own input version chained onto its parent's key. */
function keysFor(order: Order, codeV: number, depsV: number): string[] {
  const keys: string[] = [];
  let parent = "";
  for (const l of LAYERS[order]) {
    const own = `${l.watches.includes("code") ? codeV : ""}.${l.watches.includes("deps") ? depsV : ""}`;
    parent = `${parent}/${l.id}:${own}`;
    keys.push(parent);
  }
  return keys;
}

export interface LayersProps {
  order?: Order;
  /** Lock the ordering switch (lessons that only want rebuild practice). */
  lockOrder?: boolean;
}

export interface LayersState {
  order: Order;
  builds: number;
  lastEdit: Edit;
  lastSecs: number;
}

export function Layers({ props, onChange, revealed }: WidgetProps<LayersProps>) {
  const [order, setOrder] = useState<Order>(props.order ?? "copy-first");
  const [codeV, setCodeV] = useState(1);
  const [depsV, setDepsV] = useState(1);
  const [cache, setCache] = useState<Set<string>>(() => new Set(keysFor(props.order ?? "copy-first", 1, 1)));
  const [builds, setBuilds] = useState<Build[]>(() => [{ edit: "none", hits: LAYERS[props.order ?? "copy-first"].map(() => false), secs: 43 }]);
  const [dirty, setDirty] = useState<Edit>("none");
  const layers = LAYERS[order];
  const last = builds[builds.length - 1];
  const keys = keysFor(order, codeV, depsV);

  const doBuild = () => {
    const hits: boolean[] = [];
    let secs = 0;
    let broke = false;
    keys.forEach((k, i) => {
      // the base image is always pulled from the registry cache; others hit only if unchanged all the way down
      const hit = !broke && (i === 0 || cache.has(k));
      if (!hit) broke = true;
      hits.push(hit);
      if (!hit) secs += layers[i].secs;
    });
    const next = new Set(cache);
    keys.forEach((k) => next.add(k));
    setCache(next);
    setBuilds([...builds, { edit: dirty, hits, secs }]);
    setDirty("none");
  };
  const switchOrder = (o: Order) => {
    if (revealed) return;
    setOrder(o);
    setCache(new Set(keysFor(o, codeV, depsV)));
    setBuilds([{ edit: "none", hits: LAYERS[o].map(() => false), secs: 43 }]);
    setDirty("none");
  };
  const reset = () => switchOrder(order);

  useReport(onChange, { order, builds: builds.length, lastEdit: last.edit, lastSecs: last.secs } satisfies LayersState, `${order}|${builds.length}|${last.secs}`);

  const edited = dirty !== "none";
  return (
    <div className="w-full max-w-2xl">
      {!props.lockOrder && (
        <div className="flex justify-center">
          <Segmented
            label="Dockerfile ordering"
            value={order}
            disabled={revealed}
            onChange={switchOrder}
            options={[
              { id: "copy-first", label: "Copy source first" },
              { id: "deps-first", label: "Dependencies first" },
            ]}
          />
        </div>
      )}

      <div className="mt-3 rounded-xl border border-line bg-surface-2 p-3">
        <Caption className="flex items-center gap-1.5">
          <LayersIcon className="h-3.5 w-3.5" /> Dockerfile, top to bottom (last build)
        </Caption>
        <ol className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-1.5">
          {layers.map((l, i) => {
            const hit = last.hits[i];
            const first = builds.length === 1;
            return (
              <li key={`${order}-${l.id}`} className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 ${first ? "border-line bg-surface" : hit ? "border-line bg-surface" : "border-[var(--brand)]/50 bg-tint"}`}>
                <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink">{l.line}</span>
                {i > 0 && (
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10.5px] font-semibold ${first ? "bg-surface-2 text-ink-3" : hit ? "bg-surface-2 text-ink-3 ring-1 ring-[var(--line)]" : "bg-primary text-primary-ink"}`}>
                    {first ? "built" : hit ? "cached" : l.secs > 0 ? `rebuilt ${l.secs}s` : "rebuilt"}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 min-[480px]:grid-cols-2">
        <button
          type="button"
          className={`min-h-10 rounded-xl border px-3 text-left text-sm transition-colors disabled:opacity-50 ${dirty === "code" ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface text-ink hover:bg-surface-2"}`}
          disabled={revealed || edited}
          onClick={() => {
            setCodeV(codeV + 1);
            setDirty("code");
          }}
        >
          <span className="font-semibold">Edit the app code</span>
          <span className="block text-xs text-ink-3">change one line in orders.py</span>
        </button>
        <button
          type="button"
          className={`min-h-10 rounded-xl border px-3 text-left text-sm transition-colors disabled:opacity-50 ${dirty === "deps" ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface text-ink hover:bg-surface-2"}`}
          disabled={revealed || edited}
          onClick={() => {
            setDepsV(depsV + 1);
            setDirty("deps");
          }}
        >
          <span className="font-semibold">Add a dependency</span>
          <span className="block text-xs text-ink-3">one more line in requirements.txt</span>
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary !h-10" onClick={doBuild} disabled={revealed || !edited}>
          <Hammer className="h-4 w-4" /> Build image
        </button>
        <button type="button" className="btn !h-10" onClick={reset} disabled={revealed}>
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          <Readout label="Last build" value={`${last.secs}s`} accent={builds.length > 1} />
          <Readout label="Builds" value={builds.length} />
        </div>
      </div>

      <Note className="mt-2">
        {builds.length === 1
          ? "The first build has no cache, so every layer is built: about 43 seconds. Make a change and rebuild."
          : last.edit === "code"
            ? last.secs <= 3
              ? "Only the source copy changed, so only that layer rebuilt. The slow install was reused from the cache."
              : "Changing one line of code invalidated the source copy, and every layer below a changed layer must rebuild too, including the 40-second install."
            : last.edit === "deps"
              ? "A new dependency changes the inputs of the install, so it has to run again in either ordering. That is the cache working correctly."
              : ""}
      </Note>
    </div>
  );
}

/** goal: { edit: "code", maxSecs: 5 } (the last build followed that edit and was fast). */
export function checkLayers(state: unknown, goal: Record<string, unknown>) {
  const s = state as LayersState | undefined;
  if (!s) return false;
  if (typeof goal.edit === "string" && s.lastEdit !== goal.edit) return false;
  if (typeof goal.maxSecs === "number" && s.lastSecs > goal.maxSecs) return false;
  if (typeof goal.order === "string" && s.order !== goal.order) return false;
  if (typeof goal.minBuilds === "number" && s.builds < goal.minBuilds) return false;
  return ["edit", "maxSecs", "order", "minBuilds"].some((k) => k in goal);
}
