"use client";

import React, { useState } from "react";
import { Check, X } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";

/**
 * Sort cards into buckets: tap a card, then tap the bucket it belongs in. Tap a placed card to
 * pick it up again. Used for "which family?" and "which pattern fits?" questions.
 */
export interface SorterProps {
  buckets: { id: string; label: string; hint?: string }[];
  items: { id: string; text: string }[];
  /** itemId → bucketId. Only used to mark cards once the question is answered. */
  answer?: Record<string, string>;
}

export interface SorterState {
  placed: Record<string, string>;
}

export function Sorter({ props, onChange, revealed }: WidgetProps<SorterProps>) {
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [held, setHeld] = useState<string | null>(null);
  const pool = props.items.filter((it) => !placed[it.id]);

  const update = (next: Record<string, string>) => {
    setPlaced(next);
    onChange?.({ placed: next } satisfies SorterState);
  };
  const drop = (bucket: string) => {
    if (revealed || !held) return;
    update({ ...placed, [held]: bucket });
    // keep going: pick the next unplaced card automatically
    const nextFree = props.items.find((it) => it.id !== held && !placed[it.id]);
    setHeld(nextFree?.id ?? null);
  };
  const pickUp = (id: string) => {
    if (revealed) return;
    setHeld(held === id ? null : id);
  };

  const cols = props.buckets.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";

  return (
    <div className="w-full">
      <div className="min-h-[3rem]">
        {pool.length > 0 ? (
          <>
            <p className="mb-2 text-center text-xs text-ink-3">{held ? "Now tap the box it belongs in." : "Tap a card to pick it up."}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {pool.map((it) => (
                <Card key={it.id} text={it.text} held={held === it.id} onClick={() => pickUp(it.id)} disabled={revealed} />
              ))}
            </div>
          </>
        ) : (
          <p className="pt-3 text-center text-xs text-ink-3">{revealed ? "Sorted." : "All placed. Tap a card to move it, or check your answer."}</p>
        )}
      </div>
      <div className={`mt-4 grid grid-cols-1 gap-2 ${cols}`}>
        {props.buckets.map((b) => {
          const inside = props.items.filter((it) => placed[it.id] === b.id);
          const wrongHere = revealed && props.answer ? props.items.filter((it) => props.answer![it.id] === b.id && placed[it.id] !== b.id) : [];
          return (
            <div
              key={b.id}
              role="button"
              tabIndex={revealed ? -1 : 0}
              aria-label={`Place in ${b.label}`}
              onClick={() => drop(b.id)}
              onKeyDown={(e) => {
                if (e.key === " ") {
                  e.preventDefault();
                  drop(b.id);
                }
              }}
              className={`min-h-[4.5rem] rounded-xl border p-2.5 transition-colors ${
                held && !revealed ? "cursor-pointer border-dashed border-[var(--brand)] bg-tint/60 hover:bg-tint" : "border-line bg-surface-2"
              }`}
            >
              <p className="text-sm font-semibold text-ink">{b.label}</p>
              {b.hint && <p className="text-xs text-ink-3">{b.hint}</p>}
              <div className="mt-2 grid gap-1.5">
                {inside.map((it) => {
                  const mark = revealed && props.answer ? (props.answer[it.id] === b.id ? "ok" : "bad") : null;
                  return (
                    <Card
                      key={it.id}
                      text={it.text}
                      held={held === it.id}
                      mark={mark}
                      small
                      disabled={revealed}
                      onClick={(e) => {
                        e.stopPropagation();
                        pickUp(it.id);
                      }}
                    />
                  );
                })}
                {wrongHere.map((it) => (
                  <p key={it.id} className="rounded-lg border border-dashed border-[var(--brand)] px-2.5 py-1.5 text-xs text-ink-2">
                    Belongs here: {it.text}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Card({
  text,
  held,
  onClick,
  disabled,
  small,
  mark,
}: {
  text: string;
  held: boolean;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  small?: boolean;
  mark?: "ok" | "bad" | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={held}
      className={`flex min-h-10 items-center gap-2 rounded-lg border px-3 py-1.5 text-left transition-colors disabled:cursor-default ${small ? "w-full text-[0.82rem]" : "max-w-full text-sm"} ${
        held ? "border-transparent bg-primary text-primary-ink" : "border-line bg-surface text-ink hover:border-[var(--line-strong)]"
      }`}
    >
      {mark === "ok" && <Check className="h-3.5 w-3.5 shrink-0 text-good" strokeWidth={3} />}
      {mark === "bad" && <X className="h-3.5 w-3.5 shrink-0 text-bad" strokeWidth={3} />}
      <span className="min-w-0">{text}</span>
    </button>
  );
}

export function checkSorter(state: unknown, goal: Record<string, unknown>) {
  const placed = (state as SorterState | undefined)?.placed ?? {};
  const want = goal.placed as Record<string, string> | undefined;
  if (!want) return false;
  return Object.entries(want).every(([item, bucket]) => placed[item] === bucket);
}
