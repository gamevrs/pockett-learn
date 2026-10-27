"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock } from "lucide-react";
import { FOUNDATIONS } from "@/content/foundations";
import { trackLessons, type Module } from "@/learn/types";
import { ModuleIcon } from "@/learn/module-icons";
import { useProgress } from "@/data/progress/store";

export function FoundationsHub() {
  const progress = useProgress();
  const lessons = trackLessons(FOUNDATIONS);
  const done = lessons.filter((l) => progress.completed[l.id]).length;
  const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
  const parts = FOUNDATIONS.parts.map((part) => {
    const modules = FOUNDATIONS.modules.filter((m) => m.part === part.id);
    const partLessons = modules.flatMap((m) => m.lessons);
    return {
      ...part,
      modules,
      total: partLessons.length,
      done: partLessons.filter((l) => progress.completed[l.id]).length,
      next: partLessons.find((l) => !progress.completed[l.id]) ?? null,
    };
  });

  return (
    <div>
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:items-end lg:py-16">
          <div>
            <p className="eyebrow">Track</p>
            <h1 className="font-display mt-3 text-balance text-[2.5rem] sm:text-[3.25rem]">{FOUNDATIONS.title}</h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-2">
              How computers and code really work, one small step at a time. Every step asks you to try something: flip bits, program a CPU, type
              shell commands, send packets, step through code, build objects and wire up patterns.
            </p>
            <p className="mt-6 text-sm text-ink-3">Two paths you can take in any order:</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {parts.map((p, i) =>
                p.next ? (
                  <Link key={p.id} href={`/learn/${p.next.id}`} className={`btn ${i === 0 ? "btn-primary" : ""} !h-11 !px-5`}>
                    {p.done === 0 ? `Start: ${p.title}` : `Continue: ${p.title}`} <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : null,
              )}
            </div>
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
            {parts.map((p) => (
              <div key={p.id} className="mt-5">
                <p className="text-xs font-medium text-ink-3">{p.title}</p>
                <ul className="mt-1 grid gap-0 sm:mt-2 sm:gap-2">
                  {p.modules.map((m) => {
                    const n = m.lessons.filter((l) => progress.completed[l.id]).length;
                    return (
                      <li key={m.id} className="flex items-center gap-3 text-sm">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-tint text-brand">
                          <ModuleIcon icon={m.icon} className="h-3.5 w-3.5" />
                        </span>
                        <a href={`#${m.id}`} className="min-w-0 flex-1 truncate py-2.5 hover:underline sm:py-0">
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
            ))}
          </div>
        </div>
      </section>

      {parts.map((p, pi) => (
        <section key={p.id} className={`mx-auto max-w-6xl px-4 sm:px-6 ${pi === 0 ? "pt-14" : "pt-20"} ${pi === parts.length - 1 ? "pb-16" : ""}`}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="eyebrow">Part {pi + 1}</p>
              <h2 className="font-display mt-2 text-[2rem]">{p.title}</h2>
              <p className="mt-2 text-ink-2">{p.blurb}</p>
            </div>
            <span className="text-sm tabular-nums text-ink-3">
              {p.done}/{p.total} lessons
            </span>
          </div>
          <div className="mt-8 space-y-6">
            {p.modules.map((m) => (
              <ModuleCard key={m.id} module={m} index={FOUNDATIONS.modules.indexOf(m)} nextId={p.next?.id ?? null} anyDone={p.done > 0} completed={progress.completed} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ModuleCard({
  module: m,
  index,
  nextId,
  anyDone,
  completed,
}: {
  module: Module;
  index: number;
  nextId: string | null;
  anyDone: boolean;
  completed: Record<string, unknown>;
}) {
  return (
    <div id={m.id} className="card scroll-mt-24 p-5 sm:p-7">
      <div className="flex flex-wrap items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-tint text-brand">
          <ModuleIcon icon={m.icon} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-ink-3">Module {index + 1}</p>
          <h3 className="mt-0.5 text-xl font-semibold tracking-tight">{m.title}</h3>
          <p className="mt-1 text-sm text-ink-2">{m.blurb}</p>
        </div>
      </div>
      {m.lessons.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-[var(--line-strong)] p-4 text-sm text-ink-3">Lessons for this module are on the way.</p>
      ) : (
        <ol className="mt-6">
          {m.lessons.map((l, li) => {
            const complete = Boolean(completed[l.id]);
            const isNext = nextId === l.id;
            const last = li === m.lessons.length - 1;
            return (
              <li key={l.id} className="relative">
                {!last && <span className={`absolute left-[25px] top-[50px] h-[calc(100%-46px)] w-0.5 rounded-full ${complete ? "bg-primary" : "bg-[var(--line)]"}`} />}
                <Link href={`/learn/${l.id}`} prefetch={false} className={`group flex items-center gap-4 rounded-2xl p-1 ${last ? "" : "pb-5"}`}>
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
                  {isNext && <span className="btn btn-primary btn-sm hidden shrink-0 sm:inline-flex">{anyDone ? "Continue" : "Start"}</span>}
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
