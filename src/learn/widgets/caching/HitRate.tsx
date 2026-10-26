"use client";

import React, { useMemo, useState } from "react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout } from "../dsa/ui";
import { Choice, Toggle, dur } from "./ui";
import { HIT_WINDOW, hitRate } from "./sim";

/**
 * A least-recently-used cache in front of a catalog. Change how many distinct keys there are, how
 * many entries fit, whether a few keys are far more popular than the rest, and whether the cache
 * starts cold. The bars show the hit rate of each batch of 200 requests; the numbers underneath
 * turn it into database load and time saved at 1,000 requests a second.
 */

const KEY_OPTIONS = [200, 1000, 5000];
const SIZE_OPTIONS = [10, 50, 100, 500, 1000];
const COST_OPTIONS = [
  { ms: 5, label: "Cheap miss · 5 ms" },
  { ms: 40, label: "Normal · 40 ms" },
  { ms: 800, label: "Heavy report · 800 ms" },
];

export interface HitRateProps {
  keys?: number;
  size?: number;
  skewed?: boolean;
  cold?: boolean;
  missMs?: number;
  /** Which controls to show. Default all. */
  controls?: ("keys" | "size" | "skew" | "cold" | "cost")[];
}

export interface HitRateState {
  keys: number;
  size: number;
  skewed: boolean;
  cold: boolean;
  missMs: number;
  hitRate: number;
  dbPerSec: number;
  savedSecPerSec: number;
}

export function HitRate({ props, onChange, revealed }: WidgetProps<HitRateProps>) {
  const controls = props.controls ?? ["keys", "size", "skew", "cold", "cost"];
  const [keys, setKeys] = useState(props.keys ?? 1000);
  const [size, setSize] = useState(props.size ?? 100);
  const [skewed, setSkewed] = useState(props.skewed ?? true);
  const [cold, setCold] = useState(props.cold ?? false);
  const [missMs, setMissMs] = useState(props.missMs ?? 40);

  const sim = useMemo(() => hitRate(keys, size, skewed, !cold), [keys, size, skewed, cold]);
  const hit = sim.overall;
  const dbPerSec = Math.round(1000 * (1 - hit));
  // each hit avoids one miss-sized wait
  const savedSecPerSec = (1000 * hit * missMs) / 1000;

  const emit = (k: number, s: number, sk: boolean, c: boolean, m: number) => {
    const h = hitRate(k, s, sk, !c).overall;
    onChange?.({ keys: k, size: s, skewed: sk, cold: c, missMs: m, hitRate: Math.round(h * 1000) / 10, dbPerSec: Math.round(1000 * (1 - h)), savedSecPerSec: (1000 * h * m) / 1000 } satisfies HitRateState);
  };

  return (
    <div className="w-full min-w-0">
      <div className="grid gap-3">
        {controls.includes("keys") && (
          <div>
            <Caption>Distinct keys in the catalog</Caption>
            <Choice label="Distinct keys" value={String(keys)} disabled={revealed} onChange={(v) => { setKeys(+v); emit(+v, size, skewed, cold, missMs); }} options={KEY_OPTIONS.map((k) => ({ id: String(k), label: k.toLocaleString("en-US") }))} />
          </div>
        )}
        {controls.includes("size") && (
          <div>
            <Caption>Entries that fit in the cache</Caption>
            <Choice label="Cache size" value={String(size)} disabled={revealed} onChange={(v) => { setSize(+v); emit(keys, +v, skewed, cold, missMs); }} options={SIZE_OPTIONS.map((k) => ({ id: String(k), label: k.toLocaleString("en-US") }))} />
          </div>
        )}
        {(controls.includes("skew") || controls.includes("cold")) && (
          <div className="flex flex-wrap gap-1.5">
            {controls.includes("skew") && (
              <Toggle on={skewed} disabled={revealed} onClick={() => { setSkewed(!skewed); emit(keys, size, !skewed, cold, missMs); }}>
                A few keys are far more popular
              </Toggle>
            )}
            {controls.includes("cold") && (
              <Toggle on={cold} disabled={revealed} onClick={() => { setCold(!cold); emit(keys, size, skewed, !cold, missMs); }}>
                Start with an empty cache
              </Toggle>
            )}
          </div>
        )}
        {controls.includes("cost") && (
          <div>
            <Caption>What a miss costs</Caption>
            <Choice label="Cost of a miss" value={String(missMs)} disabled={revealed} onChange={(v) => { setMissMs(+v); emit(keys, size, skewed, cold, +v); }} options={COST_OPTIONS.map((c) => ({ id: String(c.ms), label: c.label }))} />
          </div>
        )}
      </div>

      <Caption className="mt-4">Hit rate of each batch of {HIT_WINDOW} requests</Caption>
      <div className="flex h-28 items-end gap-[2px] rounded-xl border border-line bg-surface px-1.5 pb-1 pt-2" role="img" aria-label={`Overall hit rate ${Math.round(hit * 100)} percent`}>
        {sim.windows.map((w, i) => (
          <span key={i} title={`batch ${i + 1}: ${Math.round(w * 100)}%`} className="min-w-0 flex-1 rounded-t-[3px] bg-primary" style={{ height: `${Math.max(2, w * 100)}%` }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-3">
        <span>first requests</span>
        <span>{(sim.windows.length * HIT_WINDOW).toLocaleString("en-US")} requests</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Hit rate" value={`${(hit * 100).toFixed(1)}%`} accent />
        <Readout label="Database queries" value={`${dbPerSec.toLocaleString("en-US")}/s`} />
        <Readout label="Waiting avoided" value={`${dur(savedSecPerSec * 1000)} per second`} />
      </div>
      <Note>
        <span>
          At 1,000 requests a second, {(hit * 100).toFixed(1)}% hits means <strong>{dbPerSec.toLocaleString("en-US")}</strong> reach the database.
        </span>
      </Note>
    </div>
  );
}

export function checkHitRate(state: unknown, goal: Record<string, unknown>) {
  const s = state as HitRateState | undefined;
  if (!s) return false;
  if (typeof goal.hitMin === "number" && !(s.hitRate >= goal.hitMin)) return false;
  if (typeof goal.hitMax === "number" && !(s.hitRate <= goal.hitMax)) return false;
  if (typeof goal.dbMax === "number" && !(s.dbPerSec <= goal.dbMax)) return false;
  if (typeof goal.keys === "number" && s.keys !== goal.keys) return false;
  if (typeof goal.size === "number" && s.size !== goal.size) return false;
  if (typeof goal.skewed === "boolean" && s.skewed !== goal.skewed) return false;
  if (typeof goal.missMs === "number" && s.missMs !== goal.missMs) return false;
  if (typeof goal.savedMin === "number" && !(s.savedSecPerSec >= goal.savedMin)) return false;
  return true;
}
