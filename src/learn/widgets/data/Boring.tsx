"use client";

import React, { useState } from "react";
import { Check, X } from "lucide-react";
import type { WidgetProps } from "@/learn/widget";
import { Caption, Note, Readout } from "../dsa/ui";

/**
 * "Is there evidence to leave the relational database?" Six real-sounding workloads, each with its
 * numbers. For each: keep the boring default, or adopt something specialised? The reveal says
 * what the numbers actually justify.
 */

type Pick = "keep" | "adopt";
interface Card {
  id: string;
  title: string;
  facts: string[];
  answer: Pick;
  why: string;
}

const CARDS: Card[] = [
  {
    id: "recipes",
    title: "Recipe app",
    facts: ["40,000 recipes", "Search by title or ingredient", "300 searches a minute at peak"],
    answer: "keep",
    why: "Full-text search and an inverted index (GIN-style) live inside the database, and 300 a minute is a trickle. A separate search cluster would add a second copy of the data to keep in sync for a problem you don't have.",
  },
  {
    id: "sensors",
    title: "City air sensors",
    facts: ["2 million sensors, one reading per second each", "That is 2,000,000 writes every second", "Queries: 'last hour for sensor X', 'daily averages by district'"],
    answer: "adopt",
    why: "No single relational node ingests two million rows a second. Append-only, time-ordered, mostly-aggregate data is the textbook case for a time-series or columnar store: here the numbers, not fashion, justify the move.",
  },
  {
    id: "seats",
    title: "Seat inventory",
    facts: ["120,000 seats across 400 shows", "Two people must never buy the same seat", "A few hundred purchases a minute"],
    answer: "keep",
    why: "The requirement is exactly what transactions and constraints are for (a unique index on show + seat does it in one line). Load is tiny. A store with weaker guarantees would turn your hardest rule into your hardest bug.",
  },
  {
    id: "archive",
    title: "Message archive",
    facts: ["8 TB of chat messages, append-only", "Grows by about 1 TB a month", "Queried by (room, time); 99% of reads are the last 7 days"],
    answer: "keep",
    why: "8 TB is a routine size for a relational database. Partition by month, keep recent partitions on fast disks and move old ones to cheap storage. Access is by an indexed key and mostly recent, so the working set is small.",
  },
  {
    id: "friends",
    title: "Friends of friends",
    facts: ["A startup with 50,000 users", "Feature: 'people you may know' (friends of friends)", "The team wants to adopt a graph database"],
    answer: "keep",
    why: "Two joins on an indexed friendships table (or one recursive query) answer this in milliseconds at 50,000 users. A graph database starts to pay for itself when you traverse many hops over billions of edges, not here.",
  },
  {
    id: "video",
    title: "Uploaded videos",
    facts: ["40 petabytes of video files", "Each file is written once and read many times", "Metadata (title, owner) is small"],
    answer: "adopt",
    why: "Large immutable blobs are not what a database is for. Keep the metadata rows in the relational database and put the bytes in object storage, with a CDN in front. Adopting a specialised system for the right slice of the problem is justified.",
  },
];

export interface BoringState {
  picks: Record<string, Pick>;
  correct: number;
  total: number;
  allCorrect: boolean;
}

export function Boring({ onChange, revealed }: WidgetProps) {
  const [picks, setPicks] = useState<Record<string, Pick>>({});
  const correct = CARDS.filter((c) => picks[c.id] === c.answer).length;

  const choose = (id: string, p: Pick) => {
    if (revealed) return;
    const next = { ...picks, [id]: p };
    setPicks(next);
    const ok = CARDS.filter((c) => next[c.id] === c.answer).length;
    onChange?.({ picks: next, correct: ok, total: CARDS.length, allCorrect: ok === CARDS.length } satisfies BoringState);
  };

  return (
    <div className="w-full min-w-0">
      <Caption>For each workload: what do the numbers justify?</Caption>
      <div className="grid gap-3">
        {CARDS.map((c) => {
          const pick = picks[c.id];
          const right = pick === c.answer;
          return (
            <div key={c.id} className={`rounded-xl border p-3 transition-colors ${pick ? (right ? "border-[var(--brand)]/60 bg-tint" : "border-[var(--bad)]/40 bg-[var(--bad)]/[0.05]") : "border-line bg-surface"}`}>
              <p className="text-sm font-semibold text-ink">{c.title}</p>
              <ul className="mt-1 grid gap-0.5 text-[0.82rem] text-ink-2">
                {c.facts.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-ink-3">•</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {(["keep", "adopt"] as Pick[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={revealed}
                    aria-pressed={pick === p}
                    onClick={() => choose(c.id, p)}
                    className={`min-h-10 rounded-lg border px-3 py-1.5 text-left text-[0.82rem] leading-snug transition-colors disabled:cursor-default ${pick === p ? "border-[var(--brand)] bg-surface font-medium text-ink" : "border-line bg-surface text-ink-2 hover:border-[var(--line-strong)]"}`}
                  >
                    {p === "keep" ? "Keep the relational database" : "Adopt a specialised system"}
                  </button>
                ))}
              </div>
              {pick && (
                <p className="mt-2 flex gap-2 text-[0.82rem] leading-relaxed text-ink-2" aria-live="polite">
                  {right ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" strokeWidth={3} /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-bad" strokeWidth={3} />}
                  <span>{right ? c.why : `Not quite. Try the other option. (Hint: look at the numbers, not the buzzwords.)`}</span>
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Readout label="Right so far" value={`${correct} of ${CARDS.length}`} accent={correct === CARDS.length} />
      </div>
      {correct === CARDS.length && <Note tone="good">Four of six keep the boring default, and the two that leave have numbers that no single relational node can serve. That ratio is the lesson.</Note>}
    </div>
  );
}

export function checkBoring(state: unknown) {
  return Boolean((state as BoringState | undefined)?.allCorrect);
}
