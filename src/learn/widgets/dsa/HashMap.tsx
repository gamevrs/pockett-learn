"use client";

import React, { useState } from "react";
import { Maximize2, RotateCcw, Search } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Readout, Segmented } from "./ui";

/**
 * A hash map with a deliberately simple hash: add up the letter codes, take the remainder by the
 * number of buckets. Keys that land in the same bucket chain together. Looking a key up only
 * touches one bucket, and growing the map rehashes every key into twice as many buckets.
 */
export interface HashMapProps {
  buckets?: number;
  /** Keys offered as chips to add. */
  keys?: string[];
  /** Keys already in the map. */
  initial?: string[];
  /** Optional values shown next to keys ("apple: 3"). */
  values?: Record<string, string | number>;
  /** Offer a text field for any key. */
  allowCustom?: boolean;
  /** Offer the "grow" button. */
  allowResize?: boolean;
  /** Which actions to offer. Default ["add"]. */
  actions?: ("add" | "lookup")[];
  /** Extra chips for look-ups (e.g. keys that aren't in the map). */
  lookupKeys?: string[];
}

export interface HashMapState {
  keys: string[];
  buckets: number;
  longest: number;
  collision: boolean;
  last: { action: "add" | "lookup" | "grow"; key?: string; bucket?: number; comparisons?: number; found?: boolean } | null;
}

export const codeSum = (k: string) => [...k].reduce((s, c) => s + c.charCodeAt(0), 0);
export const bucketOf = (k: string, m: number) => codeSum(k) % m;

function chains(keys: string[], m: number): string[][] {
  const out: string[][] = Array.from({ length: m }, () => []);
  for (const k of keys) out[bucketOf(k, m)].push(k);
  return out;
}

export function HashMap({ props, onChange, revealed }: WidgetProps<HashMapProps>) {
  const actions = props.actions ?? ["add"];
  const [m, setM] = useState(props.buckets ?? 8);
  const [keys, setKeys] = useState<string[]>(props.initial ?? []);
  const [action, setAction] = useState<"add" | "lookup">(actions[0]);
  const [text, setText] = useState("");
  const [last, setLast] = useState<HashMapState["last"]>(null);

  const table = chains(keys, m);
  const longest = Math.max(0, ...table.map((c) => c.length));
  const report = (ks: string[], mm: number, l: HashMapState["last"]) => {
    const t = chains(ks, mm);
    const lg = Math.max(0, ...t.map((c) => c.length));
    onChange?.({ keys: ks, buckets: mm, longest: lg, collision: lg > 1, last: l } satisfies HashMapState);
  };

  const use = (raw: string) => {
    const key = raw.trim().toLowerCase();
    if (revealed || !key) return;
    const b = bucketOf(key, m);
    if (action === "add") {
      if (keys.includes(key)) {
        const l = { action: "add" as const, key, bucket: b, comparisons: table[b].indexOf(key) + 1, found: true };
        setLast(l);
        report(keys, m, l);
        return;
      }
      const ks = [...keys, key];
      const l = { action: "add" as const, key, bucket: b, comparisons: table[b].length, found: false };
      setKeys(ks);
      setLast(l);
      report(ks, m, l);
    } else {
      const chain = table[b];
      const idx = chain.indexOf(key);
      const l = { action: "lookup" as const, key, bucket: b, comparisons: idx >= 0 ? idx + 1 : chain.length, found: idx >= 0 };
      setLast(l);
      report(keys, m, l);
    }
    setText("");
  };
  const grow = () => {
    if (revealed || m >= 32) return;
    const mm = m * 2;
    const l = { action: "grow" as const };
    setM(mm);
    setLast(l);
    report(keys, mm, l);
  };
  const reset = () => {
    setM(props.buckets ?? 8);
    setKeys(props.initial ?? []);
    setLast(null);
    onChange?.(undefined);
  };

  const chips = action === "add" ? (props.keys ?? []) : [...(props.initial ?? []), ...(props.keys ?? []).filter((k) => keys.includes(k) && !(props.initial ?? []).includes(k)), ...(props.lookupKeys ?? [])];
  const uniqueChips = [...new Set(chips)];
  const lastKey = last?.key;
  const lastBucket = last?.bucket;

  return (
    <div className="w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {actions.length > 1 ? (
          <Segmented
            label="Action"
            value={action}
            onChange={(a) => setAction(a)}
            disabled={revealed}
            options={actions.map((a) => ({ id: a, label: a === "add" ? "Add a key" : "Look up" }))}
          />
        ) : uniqueChips.length > 0 || props.allowCustom ? (
          <Caption className="!mb-0">{action === "add" ? "Tap a key to add it" : "Tap a key to look it up"}</Caption>
        ) : (
          <Caption className="!mb-0">{keys.length} keys in {m} buckets</Caption>
        )}
        <div className="flex items-center gap-1.5">
          {props.allowResize && (
            <button type="button" className="btn !h-10" onClick={grow} disabled={revealed || m >= 32}>
              <Maximize2 className="h-4 w-4" /> Grow to {m * 2}
            </button>
          )}
          <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" onClick={reset} disabled={revealed || (!last && keys.length === (props.initial ?? []).length)} aria-label="Start over" title="Start over">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {(uniqueChips.length > 0 || props.allowCustom) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {uniqueChips.map((k) => {
            const inMap = keys.includes(k);
            const dim = action === "add" && inMap;
            return (
              <button
                key={k}
                type="button"
                onClick={() => use(k)}
                disabled={revealed || dim}
                className={`inline-flex min-h-10 items-center gap-1 rounded-full border px-3.5 font-mono text-sm transition-colors disabled:cursor-default ${
                  dim ? "border-dashed border-line text-ink-3" : "border-line bg-surface text-ink hover:border-[var(--brand)] hover:bg-tint"
                }`}
              >
                {action === "lookup" && <Search className="h-3.5 w-3.5 text-ink-3" />}
                {k}
              </button>
            );
          })}
          {props.allowCustom && (
            <form
              className="flex min-w-[12rem] flex-1 items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                use(text);
              }}
            >
              <input
                className="input !h-10 min-w-0 flex-1 font-mono"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 12))}
                placeholder="any word"
                disabled={revealed}
                aria-label="Key"
              />
              <button type="submit" className="btn btn-primary !h-10" disabled={revealed || !text.trim()}>
                {action === "add" ? "Add" : "Find"}
              </button>
            </form>
          )}
        </div>
      )}

      <div className="mt-3 min-h-[3.25rem] rounded-xl border border-line bg-surface-2 px-3 py-2 font-mono text-[0.78rem] leading-relaxed text-ink-2" aria-live="polite">
        {last && last.key ? (
          <>
            <span className="text-ink">hash(&quot;{last.key}&quot;)</span> ={" "}
            {last.key.length <= 6 ? [...last.key].map((c) => c.charCodeAt(0)).join(" + ") + " = " : "letter codes add up to "}
            <span className="font-semibold text-ink">{codeSum(last.key)}</span>
            <br />
            {codeSum(last.key)} % {m} = <span className="rounded bg-primary px-1.5 font-semibold text-primary-ink">bucket {last.bucket}</span>
            <span className="ml-1 font-sans text-ink-3">
              {last.action === "lookup"
                ? last.found
                  ? `· found after ${last.comparisons} ${last.comparisons === 1 ? "comparison" : "comparisons"}`
                  : `· not there: checked ${last.comparisons} ${last.comparisons === 1 ? "key" : "keys"}`
                : last.found
                  ? "· already in the map"
                  : last.comparisons
                    ? `· collision! joins ${last.comparisons} other ${last.comparisons === 1 ? "key" : "keys"}`
                    : "· empty bucket"}
            </span>
          </>
        ) : last?.action === "grow" ? (
          <span className="font-sans">Grew to {m} buckets: every key was hashed again with % {m}, so many moved.</span>
        ) : (
          <span className="font-sans text-ink-3">Bucket = (sum of the letter codes) % {m}. For example a = 97, b = 98, c = 99.</span>
        )}
      </div>

      <div className={`mt-3 grid gap-1 ${m > 8 ? "sm:grid-cols-2 sm:gap-x-3" : ""}`}>
        {table.map((chain, b) => {
          const hit = b === lastBucket && last?.action !== "grow";
          return (
            <div key={`${m}-${b}`} className={`flex min-h-10 items-center gap-2 rounded-lg border px-2 py-1 ${hit ? "border-[var(--brand)] bg-tint" : "border-line bg-surface"} ${last?.action === "grow" ? "pop-in" : ""}`}>
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md font-mono text-xs font-semibold tabular-nums ${hit ? "bg-primary text-primary-ink" : "bg-surface-2 text-ink-3"}`}>{b}</span>
              <div className="flex min-w-0 flex-wrap items-center gap-1">
                {chain.map((k, i) => {
                  const compared = hit && last?.comparisons !== undefined && (last.action === "lookup" ? i < last.comparisons : false);
                  const isKey = hit && k === lastKey;
                  return (
                    <React.Fragment key={k}>
                      {i > 0 && <span className="text-[0.65rem] text-ink-3">→</span>}
                      <span
                        className={`rounded-md border px-2 py-0.5 font-mono text-[0.78rem] ${
                          isKey ? "pop-in border-transparent bg-primary font-semibold text-primary-ink" : compared ? "border-[var(--brand)]/60 bg-surface text-ink" : "border-line bg-surface-2 text-ink"
                        }`}
                      >
                        {k}
                        {props.values?.[k] !== undefined && <span className="opacity-70">: {props.values[k]}</span>}
                      </span>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Keys" value={keys.length} />
        <Readout label="Buckets" value={m} />
        <Readout label="Longest chain" value={longest} accent={longest > 1} />
      </div>
    </div>
  );
}

export function checkHashMap(state: unknown, goal: Record<string, unknown>) {
  const s = state as HashMapState | undefined;
  if (!s) return false;
  if (goal.collision === true && !s.collision) return false;
  if (Array.isArray(goal.has) && !goal.has.every((k) => s.keys.includes(String(k)))) return false;
  if (typeof goal.buckets === "number" && s.buckets !== goal.buckets) return false;
  if (typeof goal.bucketsMin === "number" && s.buckets < goal.bucketsMin) return false;
  if (typeof goal.longestMax === "number" && s.longest > goal.longestMax) return false;
  if (typeof goal.lookup === "string" && !(s.last?.action === "lookup" && s.last.key === goal.lookup)) return false;
  if (goal.lookupMissing === true && !(s.last?.action === "lookup" && s.last.found === false)) return false;
  return true;
}
