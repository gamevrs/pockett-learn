"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock } from "lucide-react";
import { FOUNDATIONS } from "@/content/foundations";
import { trackLessons } from "@/learn/types";
import { ModuleIcon } from "@/learn/module-icons";
import { useProgress } from "@/data/progress/store";

export function FoundationsHub() {
  const progress = useProgress();
  const lessons = trackLessons(FOUNDATIONS);
  const done = lessons.filter((l) => progress.completed[l.id]).length;
  const next = lessons.find((l) => !progress.completed[l.id]) ?? null;
  const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;

  return (
    <div>
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:items-end lg:py-16">
          <div>
            <p className="eyebrow">Track</p>
            <h1 className="font-display mt-3 text-balance text-[2.5rem] sm:text-[3.25rem]">{FOUNDATIONS.title}</h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-2">
              How code really works, from a single bit to design patterns. Short lessons, one idea per step, and every step asks you to try
              something: flip bits, step through code, build objects, wire up patterns.
            </p>
            {next && (
              <Link href={`/learn/${next.id}`} className="btn btn-primary mt-8 !h-11 !px-5">
                {done === 0 ? "Start with the first lesson" : `Continue: ${next.title}`} <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
          <div className="card p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-2">
                {done} of {lessons.length} lessons
              </span>
              <span className="tabular-nums text-ink-3">{pct}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
            <ul className="mt-5 grid gap-2.5">
              {FOUNDATIONS.modules.map((m) => {
                const n = m.lessons.filter((l) => progress.completed[l.id]).length;
                return (
                  <li key={m.id} className="flex items-center gap-3 text-sm">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint text-brand">
                      <ModuleIcon icon={m.icon} className="h-4 w-4" />
                    </span>
                    <a href={`#${m.id}`} className="min-w-0 flex-1 truncate hover:underline">
                      {m.title}
                    </a>
                    <span className="shrink-0 tabular-nums text-ink-3">
                      {n}/{m.lessons.length}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl space-y-6 px-4 py-14 sm:px-6">
        {FOUNDATIONS.modules.map((m, mi) => (
          <div key={m.id} id={m.id} className="card scroll-mt-24 p-5 sm:p-7">
            <div className="flex flex-wrap items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-tint text-brand">
                <ModuleIcon icon={m.icon} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-ink-3">Module {mi + 1}</p>
                <h2 className="mt-0.5 text-xl font-semibold tracking-tight">{m.title}</h2>
                <p className="mt-1 text-sm text-ink-2">{m.blurb}</p>
              </div>
            </div>
            {m.lessons.length === 0 ? (
              <p className="mt-6 rounded-xl border border-dashed border-[var(--line-strong)] p-4 text-sm text-ink-3">Lessons for this module are on the way.</p>
            ) : (
              <ol className="mt-6">
                {m.lessons.map((l, li) => {
                  const complete = Boolean(progress.completed[l.id]);
                  const isNext = next?.id === l.id;
                  const last = li === m.lessons.length - 1;
                  return (
                    <li key={l.id} className="relative">
                      {!last && <span className={`absolute left-[25px] top-[50px] h-[calc(100%-46px)] w-0.5 rounded-full ${complete ? "bg-primary" : "bg-[var(--line)]"}`} />}
                      <Link href={`/learn/${l.id}`} className={`group flex items-center gap-4 rounded-2xl p-1 ${last ? "" : "pb-5"}`}>
                        <span
                          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border font-mono text-sm transition-colors ${
                            complete
                              ? "border-transparent bg-primary text-primary-ink"
                              : isNext
                                ? "border-[var(--brand)] bg-surface text-brand ring-4 ring-[var(--brand-soft)]"
                                : "border-line bg-surface-2 text-ink-3 group-hover:text-ink-2"
                          }`}
                        >
                          {complete ? <Check className="h-5 w-5" strokeWidth={2.5} /> : li + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`font-medium leading-snug group-hover:underline ${complete || isNext ? "text-ink" : "text-ink-2"}`}>{l.title}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink-3">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {l.minutes} min
                            </span>
                            <span>{l.xp} XP</span>
                            <span className="hidden sm:inline">{l.summary}</span>
                          </p>
                        </div>
                        {isNext && <span className="btn btn-primary btn-sm hidden shrink-0 sm:inline-flex">{done === 0 ? "Start" : "Continue"}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
