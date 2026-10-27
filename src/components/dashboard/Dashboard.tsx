"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Award, Flame, Flag, KeyRound, RotateCcw, Target, Zap, type LucideIcon } from "lucide-react";
import { ProjectIcon } from "@/components/ui/icons";
import { GraduationCap } from "lucide-react";
import type { DashboardLesson, DashboardProject, DashboardSummary } from "@/components/dashboard/summary";
import { currentStreak, levelFor, resetAllProgress, useProgress } from "@/data/progress/store";
import { resetEverywhere } from "@/data/progress/sync";
import type { ProgressState } from "@/data/progress/types";
import { AdSlot } from "@/components/ads/AdSlot";
import { useAuth } from "@/data/auth/store";

interface Badge {
  id: string;
  icon: LucideIcon;
  title: string;
  how: string;
  earned: (p: ProgressState, projects: DashboardProject[]) => boolean;
}

const BADGES: Badge[] = [
  { id: "boot", icon: KeyRound, title: "First boot", how: "Pass your first lesson", earned: (p) => Object.keys(p.completed).length >= 1 },
  { id: "first-try", icon: Target, title: "First try", how: "Pass a lesson on your first run", earned: (p) => Object.values(p.completed).some((c) => c.attempts <= 1) },
  { id: "streak3", icon: Flame, title: "On a roll", how: "3-day streak", earned: (p) => p.bestStreak >= 3 },
  { id: "xp500", icon: Zap, title: "Power user", how: "Earn 500 XP", earned: (p) => p.xp >= 500 },
  {
    id: "project",
    icon: Flag,
    title: "Finisher",
    how: "Complete a whole project",
    earned: (p, projects) => projects.some((pr) => pr.lessons.every((l) => p.completed[l.id])),
  },
];

export function Dashboard({ summary }: { summary: DashboardSummary }) {
  const projects = summary.projects;
  const progress = useProgress();
  const [confirming, setConfirming] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const auth = useAuth();
  const lvl = levelFor(progress.xp);
  const streak = currentStreak(progress);
  const completedCount = Object.keys(progress.completed).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="eyebrow">Your progress</p>
      <h1 className="font-display mt-3 text-[2.5rem] sm:text-[3.25rem]">
        {completedCount === 0 ? "Ready when you are" : <>Level {lvl.level} · {lvl.rank}</>}
      </h1>

      {auth.status === "signed-out" && (
        <div className="tint-panel mt-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Keep your progress safe</p>
            <p className="text-sm text-ink-2">Right now it lives only in this browser. A free account syncs it to every device.</p>
          </div>
          <Link href="/account" className="btn btn-primary shrink-0">
            Create free account
          </Link>
        </div>
      )}

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <div className="card p-6 md:col-span-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="eyebrow">Level {lvl.level}</p>
              <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">{progress.xp} <span className="text-lg font-normal text-ink-3">XP</span></p>
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-tint"><Zap className="h-5 w-5 text-brand" /></span>
          </div>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(lvl.intoLevel / lvl.perLevel) * 100}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink-3">{lvl.perLevel - lvl.intoLevel} XP to level {lvl.level + 1}</p>
        </div>

        <div className="card flex flex-col justify-between gap-4 p-6">
          <div className="flex items-start justify-between">
            <p className="eyebrow">Streak</p>
            <Flame className={`h-5 w-5 ${streak > 0 ? "text-brand" : "text-ink-3"}`} />
          </div>
          <p className="text-4xl font-semibold tracking-tight tabular-nums">{streak}<span className="ml-1.5 text-lg font-normal text-ink-3">{streak === 1 ? "day" : "days"}</span></p>
          <p className="text-xs text-ink-3">Best: {progress.bestStreak}. Pass a lesson each day to keep it alive.</p>
        </div>
      </div>

      <FoundationsCard lessons={summary.foundations} />

      <h2 className="font-display mt-14 text-[1.75rem]">Your builds</h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((p) => {
          const lessons = p.lessons;
          const done = lessons.filter((l) => progress.completed[l.id]).length;
          const pct = Math.round((done / lessons.length) * 100);
          const next = lessons.find((l) => !progress.completed[l.id]);
          return (
            <Link
              key={p.slug}
              href={next ? `/projects/${p.slug}/${next.id}` : `/projects/${p.slug}`}
              prefetch={false}
              className="pop-card block p-5"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-tint text-brand"><ProjectIcon slug={p.slug} className="h-[18px] w-[18px]" /></span>
                <div className="min-w-0">
                  <p className="font-semibold leading-tight">{p.title}</p>
                  <p className="text-xs text-ink-3">{done}/{lessons.length} lessons · {pct}%</p>
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-3 text-sm text-ink-2">{next ? `Next: ${next.title}` : "Complete. Keep experimenting with it."}</p>
            </Link>
          );
        })}
      </div>

      <h2 className="font-display mt-14 text-[1.75rem]">Achievements</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {BADGES.map((b) => {
          const earned = b.earned(progress, projects);
          return (
            <div key={b.id} className={`card p-4 ${earned ? "" : "opacity-55"}`}>
              <span className={`grid h-10 w-10 place-items-center rounded-full ${earned ? "bg-primary text-primary-ink" : "bg-surface-2 text-ink-3"}`}>
                <b.icon className="h-[18px] w-[18px]" />
              </span>
              <p className="mt-3 font-medium">{b.title}</p>
              <p className="text-xs text-ink-3">{b.how}</p>
              {earned && <span className="chip mt-3"><Award className="h-3 w-3 text-brand" /> Earned</span>}
            </div>
          );
        })}
      </div>

      <AdSlot slot="dashboard-inline" className="mt-14" />

      <div className="mt-10 border-t border-line pt-6">
        {confirming ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="font-semibold">{auth.status === "signed-in" ? "This deletes all your progress and code, on this device and in your account." : "This deletes all progress and code on this device."}</span>
            <button
              className="btn btn-sm !border-bad !text-bad"
              onClick={async () => {
                setResetError(null);
                try {
                  if (auth.status === "signed-in") await resetEverywhere();
                  else resetAllProgress();
                  setConfirming(false);
                } catch (err) {
                  setResetError(`Couldn't reset your account: ${(err as Error).message}`);
                }
              }}
            >
              Yes, reset everything
            </button>
            <button className="btn btn-sm btn-ghost" onClick={() => setConfirming(false)}>Cancel</button>
            {resetError && <span className="w-full text-sm font-semibold text-bad">{resetError}</span>}
          </div>
        ) : (
          <button className="-my-2 flex min-h-10 items-center gap-2 py-2 text-xs font-semibold text-ink-3 hover:text-ink" onClick={() => setConfirming(true)}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset my progress
          </button>
        )}
      </div>
    </div>
  );
}

function FoundationsCard({ lessons }: { lessons: DashboardLesson[] }) {
  const progress = useProgress();
  const done = lessons.filter((l) => progress.completed[l.id]).length;
  const next = lessons.find((l) => !progress.completed[l.id]);
  const pct = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
  return (
    <Link href={next ? `/learn/${next.id}` : "/learn"} prefetch={false} className="pop-card mt-10 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tint text-brand">
        <GraduationCap className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold leading-tight">Foundations</p>
        <p className="text-xs text-ink-3">
          {done}/{lessons.length} lessons · {next ? `Next: ${next.title}` : "Complete"}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Link>
  );
}
