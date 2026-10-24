"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Award, Flame, RotateCcw, Trophy, Zap } from "lucide-react";
import { flattenLessons, type Project } from "@/engine/types";
import { currentStreak, levelFor, resetAllProgress, useProgress } from "@/data/progress/store";
import type { ProgressState } from "@/data/progress/types";
import { AdSlot } from "@/components/ads/AdSlot";
import { useAuth } from "@/data/auth/store";

interface Badge {
  id: string;
  emoji: string;
  title: string;
  how: string;
  earned: (p: ProgressState, projects: Project[]) => boolean;
}

const BADGES: Badge[] = [
  { id: "boot", emoji: "🔑", title: "First boot", how: "Pass your first lesson", earned: (p) => Object.keys(p.completed).length >= 1 },
  { id: "first-try", emoji: "🎯", title: "First try", how: "Pass a lesson on your first run", earned: (p) => Object.keys(p.completed).some((id) => (p.attempts[id] ?? 1) <= 1) },
  { id: "streak3", emoji: "🔥", title: "On a roll", how: "3-day streak", earned: (p) => p.bestStreak >= 3 },
  { id: "xp500", emoji: "⚡", title: "Power user", how: "Earn 500 XP", earned: (p) => p.xp >= 500 },
  {
    id: "project",
    emoji: "🏁",
    title: "Finisher",
    how: "Complete a whole project",
    earned: (p, projects) => projects.some((pr) => flattenLessons(pr).every((l) => p.completed[l.id])),
  },
];

export function Dashboard({ projects }: { projects: Project[] }) {
  const progress = useProgress();
  const [confirming, setConfirming] = useState(false);
  const auth = useAuth();
  const lvl = levelFor(progress.xp);
  const streak = currentStreak(progress);
  const completedCount = Object.keys(progress.completed).length;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow">Your progress</p>
      <h1 className="font-display mt-3 text-5xl sm:text-7xl">
        {completedCount === 0 ? "Day one." : <>You&apos;re a <span className="text-gradient">{lvl.rank}.</span></>}
      </h1>

      {auth.status === "signed-out" && (
        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-line bg-brand-soft p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-xl">Keep your progress safe.</p>
            <p className="text-sm text-ink-2">Right now it lives only in this browser. A free account syncs it to every device.</p>
          </div>
          <Link href="/account" className="btn btn-primary shrink-0">
            Create free account
          </Link>
        </div>
      )}

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <div className="pop-card p-6 md:col-span-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="eyebrow">Level {lvl.level}</p>
              <p className="font-display mt-1 text-5xl">{progress.xp} <span className="text-2xl text-ink-3">XP</span></p>
            </div>
            <Zap className="h-10 w-10 text-brand" fill="currentColor" />
          </div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full" style={{ width: `${(lvl.intoLevel / lvl.perLevel) * 100}%`, background: "linear-gradient(120deg, var(--brand-light), var(--brand) 55%, var(--brand-deep))" }} />
          </div>
          <p className="mt-2 text-xs text-ink-3">{lvl.perLevel - lvl.intoLevel} XP to level {lvl.level + 1}</p>
        </div>

        <div className="pop-card flex flex-col justify-between p-6">
          <div className="flex items-start justify-between">
            <p className="eyebrow">Streak</p>
            <Flame className={`h-6 w-6 ${streak > 0 ? "text-brand" : "text-ink-3"}`} fill={streak > 0 ? "currentColor" : "none"} />
          </div>
          <p className="font-display text-6xl">{streak}<span className="ml-1 text-2xl text-ink-3">{streak === 1 ? "day" : "days"}</span></p>
          <p className="text-xs text-ink-3">Best: {progress.bestStreak}. Pass a lesson each day to keep it alive.</p>
        </div>
      </div>

      <h2 className="font-display mt-14 text-3xl">Your builds</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => {
          const lessons = flattenLessons(p);
          const done = lessons.filter((l) => progress.completed[l.id]).length;
          const pct = Math.round((done / lessons.length) * 100);
          const next = lessons.find((l) => !progress.completed[l.id]);
          return (
            <Link
              key={p.slug}
              href={next ? `/projects/${p.slug}/${next.id}` : `/projects/${p.slug}`}
              className="card block p-5 transition-transform hover:-translate-y-0.5"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl text-2xl" style={{ background: "linear-gradient(120deg, var(--brand-light), var(--brand) 55%, var(--brand-deep))" }}>{p.emoji}</span>
                <div className="min-w-0">
                  <p className="font-display text-xl leading-tight">{p.title}</p>
                  <p className="text-xs text-ink-3">{done}/{lessons.length} lessons · {pct}%</p>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(120deg, var(--brand-light), var(--brand) 55%, var(--brand-deep))" }} />
              </div>
              <p className="mt-3 text-sm font-semibold text-ink-2">{next ? `Next: ${next.title}` : "Complete! Go tinker with it 🎉"}</p>
            </Link>
          );
        })}
      </div>

      <h2 className="font-display mt-14 flex items-center gap-3 text-3xl"><Trophy className="h-6 w-6 text-brand" /> Badges</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {BADGES.map((b) => {
          const earned = b.earned(progress, projects);
          return (
            <div key={b.id} className={`card p-4 text-center ${earned ? "" : "opacity-45 grayscale"}`}>
              <div className="text-4xl">{b.emoji}</div>
              <p className="font-display mt-2 text-lg">{b.title}</p>
              <p className="text-xs text-ink-3">{b.how}</p>
              {earned && <span className="chip mt-2 !text-good"><Award className="h-3 w-3" /> Earned</span>}
            </div>
          );
        })}
      </div>

      <AdSlot slot="dashboard-inline" className="mt-14" />

      <div className="mt-10 border-t border-line pt-6">
        {confirming ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold">{auth.status === "signed-in" ? "This deletes all your progress and code, on this device and in your account." : "This deletes all progress and code on this device."}</span>
            <button className="btn btn-sm !border-bad !text-bad" onClick={() => { resetAllProgress(); setConfirming(false); }}>Yes, reset everything</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        ) : (
          <button className="flex items-center gap-2 text-xs font-semibold text-ink-3 hover:text-ink" onClick={() => setConfirming(true)}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset my progress
          </button>
        )}
      </div>
    </div>
  );
}
