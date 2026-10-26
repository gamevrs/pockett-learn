"use client";

import React, { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout } from "../dsa/ui";

/**
 * An inverted index (the idea behind GIN-style indexes and search engines) on a recipe app:
 * instead of "recipe → its ingredients", the index stores "ingredient → the recipes that use it".
 * Picking several ingredients intersects the lists, without opening every recipe.
 */

const RECIPES: { id: number; name: string; tags: string[] }[] = [
  { id: 1, name: "Lemon chickpea stew", tags: ["chickpea", "lemon", "garlic", "spinach"] },
  { id: 2, name: "Harissa carrot tray bake", tags: ["carrot", "harissa", "chickpea", "garlic"] },
  { id: 3, name: "Spinach and feta pie", tags: ["spinach", "feta", "egg", "dill"] },
  { id: 4, name: "Garlic prawn linguine", tags: ["garlic", "prawn", "lemon", "pasta"] },
  { id: 5, name: "Shakshuka", tags: ["egg", "tomato", "garlic", "harissa"] },
  { id: 6, name: "Lemon dill salmon", tags: ["salmon", "lemon", "dill", "potato"] },
  { id: 7, name: "Feta tomato orzo", tags: ["feta", "tomato", "pasta", "dill"] },
  { id: 8, name: "Prawn fried rice", tags: ["prawn", "egg", "garlic", "rice"] },
];

const ALL_TAGS = [...new Set(RECIPES.flatMap((r) => r.tags))].sort();
const postings = (tag: string) => RECIPES.filter((r) => r.tags.includes(tag)).map((r) => r.id);

export interface InvertedState {
  tags: string[];
  matches: number[];
}

export function Inverted({ onChange, revealed }: WidgetProps) {
  const [tags, setTags] = useState<string[]>([]);

  const matchesFor = (t: string[]) => (t.length === 0 ? [] : RECIPES.filter((r) => t.every((x) => r.tags.includes(x))).map((r) => r.id));
  const matches = matchesFor(tags);
  const set = (t: string[]) => {
    setTags(t);
    onChange?.({ tags: t, matches: matchesFor(t) } satisfies InvertedState);
  };
  const toggle = (t: string) => {
    if (revealed) return;
    set(tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t].slice(-3));
  };

  return (
    <div className="w-full min-w-0">
      <div className="flex items-center justify-between gap-2">
        <Caption className="!mb-0">Pick up to three ingredients</Caption>
        <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" onClick={() => set([])} disabled={revealed || tags.length === 0} aria-label="Clear" title="Clear">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ALL_TAGS.map((t) => (
          <button
            key={t}
            type="button"
            disabled={revealed}
            aria-pressed={tags.includes(t)}
            onClick={() => toggle(t)}
            className={`min-h-10 rounded-full border px-3.5 text-sm transition-colors disabled:cursor-default ${tags.includes(t) ? "border-transparent bg-primary font-medium text-primary-ink" : "border-line bg-surface text-ink hover:border-[var(--brand)] hover:bg-tint"}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <Caption>The index: ingredient → recipe numbers</Caption>
          <div className="grid gap-1.5">
            {tags.length === 0 && <p className="rounded-lg border border-dashed border-line px-3 py-2 text-sm text-ink-3">Pick an ingredient to see its list.</p>}
            {tags.map((t) => (
              <div key={t} className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5">
                <span className="w-16 shrink-0 text-sm font-medium text-ink">{t}</span>
                <span className="text-ink-3">→</span>
                {postings(t).map((id) => (
                  <span key={id} className={`grid h-7 min-w-7 place-items-center rounded-md px-1 font-mono text-xs font-semibold tabular-nums ${matches.includes(id) ? "bg-primary text-primary-ink" : "bg-surface-2 text-ink-2"}`}>
                    {id}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div>
          <Caption>Recipes</Caption>
          <ul className="grid gap-1">
            {RECIPES.map((r) => (
              <li key={r.id} className={`flex items-center gap-2 rounded-lg border px-2 py-1 text-[0.82rem] ${matches.includes(r.id) ? "border-[var(--brand)] bg-tint text-ink" : "border-line bg-surface text-ink-3"}`}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-surface-2 font-mono text-[11px] tabular-nums text-ink-2">{r.id}</span>
                <span className="min-w-0 truncate">{r.name}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Lists read" value={tags.length} />
        <Readout label="Recipes opened to decide" value={matches.length} accent={tags.length > 0} />
        <Readout label="A scan would open" value={RECIPES.length} />
      </div>
      <Note tone={tags.length > 0 && matches.length > 0 ? "good" : "plain"}>
        {tags.length === 0
          ? "Each list is already sorted, so combining lists is a quick merge."
          : matches.length > 0
            ? `${tags.join(" + ")}: the lists overlap on ${matches.length === 1 ? "recipe" : "recipes"} ${matches.join(", ")}.`
            : `The lists for ${tags.join(" + ")} share no recipe number: nothing matches, found without opening a single recipe.`}
      </Note>
    </div>
  );
}

export function checkInverted(state: unknown, goal: Record<string, unknown>) {
  const s = state as InvertedState | undefined;
  if (!s) return false;
  if (Array.isArray(goal.matches)) {
    const want = goal.matches.map(Number).sort().join(",");
    if (s.tags.length === 0 || s.matches.slice().sort().join(",") !== want) return false;
  }
  if (typeof goal.tagsMin === "number" && s.tags.length < goal.tagsMin) return false;
  return true;
}
