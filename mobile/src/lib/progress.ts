/**
 * The learner's progress: the website's own pockett_progress_v2 object (src/data/progress/types.ts, imported, not
 * copied), and everything the app reads from it: streak as it stands today, level, active days, minutes per day,
 * achievements. Pure: no storage, no React.
 */
import { EMPTY_PROGRESS, normalizeAudio, type CompletedLesson, type ProgressState } from '@site/data/progress/types';

import { completionOf, trackLessons, type CatalogIndex } from './catalog';

export type { CompletedLesson, ProgressState };
export { EMPTY_PROGRESS };

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback);
const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

function stringRecord(v: unknown): Record<string, string> {
  if (!isRecord(v)) return {};
  const out: Record<string, string> = {};
  for (const [k, s] of Object.entries(v)) if (typeof s === 'string') out[k] = s;
  return out;
}

function numberRecord(v: unknown): Record<string, number> {
  if (!isRecord(v)) return {};
  const out: Record<string, number> = {};
  for (const [k, n] of Object.entries(v)) if (typeof n === 'number' && Number.isFinite(n)) out[k] = n;
  return out;
}

/**
 * Whatever came from storage or a `progress` message, as a safe ProgressState: unknown or broken parts fall back to
 * empty, never throw. Null when it is not a v2 progress object at all.
 */
export function parseProgress(raw: unknown): ProgressState | null {
  let value = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!isRecord(value) || value.version !== 2) return null;
  const completed: Record<string, CompletedLesson> = {};
  if (isRecord(value.completed)) {
    for (const [id, c] of Object.entries(value.completed)) {
      if (!isRecord(c) || typeof c.at !== 'string') continue;
      completed[id] = {
        at: c.at,
        ...(typeof c.updatedAt === 'string' ? { updatedAt: c.updatedAt } : {}),
        code: typeof c.code === 'string' ? c.code : '',
        attempts: num(c.attempts, 1),
      };
    }
  }
  return {
    ...EMPTY_PROGRESS,
    version: 2,
    xp: num(value.xp),
    streak: num(value.streak),
    bestStreak: num(value.bestStreak),
    lastActiveDate: day(value.lastActiveDate),
    completed,
    drafts: stringRecord(value.drafts),
    draftsAt: stringRecord(value.draftsAt),
    attempts: numberRecord(value.attempts),
    hintsSeen: numberRecord(value.hintsSeen),
    audio: normalizeAudio(value.audio),
  };
}

const time = (iso: string | undefined) => (iso ? Date.parse(iso) || 0 : 0);

/**
 * The page's progress after a lesson wrote to it, taken over the app's copy. The page was seeded with the app's
 * copy before it loaded, so it is normally a superset; if the seeding ever failed, completions the app knew about
 * and the page did not are kept (union, newest pass wins), so a lesson never un-completes.
 */
export function absorbPageProgress(local: ProgressState, page: ProgressState): ProgressState {
  const completed = { ...page.completed };
  for (const [id, mine] of Object.entries(local.completed)) {
    const theirs = completed[id];
    if (!theirs) completed[id] = mine;
    else if (time(mine.updatedAt ?? mine.at) > time(theirs.updatedAt ?? theirs.at)) completed[id] = { ...mine, at: time(mine.at) < time(theirs.at) ? mine.at : theirs.at };
  }
  const lostXp = Object.keys(completed).some((id) => !page.completed[id]);
  const newer = (a: string | null, b: string | null) => (a && (!b || a > b) ? a : b);
  const lastActiveDate = newer(page.lastActiveDate, local.lastActiveDate);
  return {
    ...page,
    completed,
    xp: lostXp ? Math.max(page.xp, local.xp) : page.xp,
    lastActiveDate,
    streak: lastActiveDate === page.lastActiveDate ? page.streak : local.streak,
    bestStreak: Math.max(page.bestStreak, local.bestStreak),
  };
}

/** Local calendar day, YYYY-MM-DD, as the site writes `lastActiveDate`. */
export function dayKey(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function addDays(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + days));
}

/** The streak as it stands today: it lapses once a whole day was missed (the site's currentStreak). */
export function currentStreak(state: ProgressState, now: Date): number {
  if (!state.lastActiveDate) return 0;
  return daysBetween(state.lastActiveDate, dayKey(now)) > 1 ? 0 : state.streak;
}

/** True when there is a streak that ends tonight unless a lesson is finished today. */
export function streakAtRisk(state: ProgressState, now: Date): boolean {
  return !!state.lastActiveDate && daysBetween(state.lastActiveDate, dayKey(now)) === 1 && state.streak > 0;
}

export function activeToday(state: ProgressState, now: Date): boolean {
  return state.lastActiveDate === dayKey(now) || Object.values(state.completed).some((c) => dayKey(new Date(c.at)) === dayKey(now));
}

/** The site's levels: 200 XP each, with its rank names. */
export const XP_PER_LEVEL = 200;
export const RANKS = ['Rookie', 'Tinkerer', 'Mechanic', 'Engineer', 'Architect', 'Wizard', 'Legend'];

export function levelFor(xp: number) {
  const level = Math.floor(Math.max(0, xp) / XP_PER_LEVEL) + 1;
  return { level, rank: RANKS[Math.min(level - 1, RANKS.length - 1)], intoLevel: Math.max(0, xp) % XP_PER_LEVEL, perLevel: XP_PER_LEVEL };
}

/** Days with at least one lesson finished for the first time (from each completion's first-pass time). */
export function activeDays(state: ProgressState): Set<string> {
  const days = new Set<string>();
  for (const c of Object.values(state.completed)) {
    const t = Date.parse(c.at);
    if (t) days.add(dayKey(new Date(t)));
  }
  if (state.lastActiveDate) days.add(state.lastActiveDate);
  return days;
}

/** Minutes of lessons finished per day (each lesson counts its catalog length once, on the day it was first passed). */
export function minutesByDay(state: ProgressState, index: CatalogIndex | null): Map<string, number> {
  const out = new Map<string, number>();
  for (const [id, c] of Object.entries(state.completed)) {
    const t = Date.parse(c.at);
    if (!t) continue;
    const key = dayKey(new Date(t));
    const minutes = index?.byId.get(id)?.lesson.minutes ?? 5;
    out.set(key, (out.get(key) ?? 0) + minutes);
  }
  return out;
}

/** The last `count` days ending today, oldest first, each with its minutes and whether the goal was met. */
export function goalHistory(state: ProgressState, index: CatalogIndex | null, goalMinutes: number, now: Date, count = 7) {
  const minutes = minutesByDay(state, index);
  const today = dayKey(now);
  return Array.from({ length: count }, (_, i) => {
    const key = addDays(today, i - count + 1);
    const m = minutes.get(key) ?? 0;
    return { day: key, minutes: m, met: m >= goalMinutes };
  });
}

/**
 * A heatmap grid of `weeks` columns (oldest first) of 7 days each, Monday first, ending with the week of `now`.
 * Days after today are null.
 */
export function heatmap(state: ProgressState, now: Date, weeks = 15): ({ day: string; active: boolean } | null)[][] {
  const active = activeDays(state);
  const today = dayKey(now);
  const mondayOffset = (now.getDay() + 6) % 7;
  const lastMonday = addDays(today, -mondayOffset);
  const firstMonday = addDays(lastMonday, -7 * (weeks - 1));
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const key = addDays(firstMonday, w * 7 + d);
      return daysBetween(today, key) > 0 ? null : { day: key, active: active.has(key) };
    }),
  );
}

export interface Achievement {
  id: string;
  title: string;
  detail: string;
  /** What the inbox says once it is earned. */
  earnedText: string;
  earned: boolean;
  /** 0..1 toward it, for one not yet earned. */
  progress: number;
}

/**
 * Honest milestones read straight from the progress: lessons finished, streaks reached, XP, a whole module and a
 * whole course done. Nothing is awarded that the numbers do not show.
 */
export function achievements(state: ProgressState, index: CatalogIndex | null): Achievement[] {
  const lessons = Object.keys(state.completed).length;
  const best = Math.max(state.bestStreak, state.streak);
  const out: Achievement[] = [];
  const milestone = (id: string, title: string, detail: string, earnedText: string, have: number, need: number) =>
    out.push({ id, title, detail, earnedText, earned: have >= need, progress: Math.min(1, need ? have / need : 1) });

  milestone('first-lesson', 'First lesson', 'Finish your first lesson', 'You finished your first lesson.', lessons, 1);
  milestone('lessons-10', '10 lessons', 'Finish 10 lessons', 'You have finished 10 lessons.', lessons, 10);
  milestone('lessons-50', '50 lessons', 'Finish 50 lessons', 'You have finished 50 lessons.', lessons, 50);
  milestone('lessons-100', '100 lessons', 'Finish 100 lessons', 'You have finished 100 lessons.', lessons, 100);
  milestone('streak-3', '3-day streak', 'Learn 3 days in a row', 'You learned 3 days in a row.', best, 3);
  milestone('streak-7', 'Week streak', 'Learn 7 days in a row', 'You learned 7 days in a row.', best, 7);
  milestone('streak-30', 'Month streak', 'Learn 30 days in a row', 'You learned 30 days in a row.', best, 30);
  milestone('xp-1000', '1,000 XP', 'Earn 1,000 XP', 'You have earned 1,000 XP.', state.xp, 1000);

  if (index) {
    let bestModule = 0;
    let bestCourse = 0;
    for (const track of index.catalog.tracks) {
      for (const m of track.modules) bestModule = Math.max(bestModule, completionOf(m.lessons, state.completed).fraction);
      if (track.kind === 'course') bestCourse = Math.max(bestCourse, completionOf(trackLessons(track), state.completed).fraction);
    }
    milestone('module', 'Module complete', 'Finish every lesson in a module', 'You finished every lesson in a module.', bestModule, 1);
    milestone('course', 'Course complete', 'Finish every lesson in a course', 'You finished every lesson in a course.', bestCourse, 1);
  }
  return out;
}

/** Ids of achievements earned in `after` but not in `before`: what a celebration or an inbox note announces. */
export function newlyEarned(before: Achievement[], after: Achievement[]): Achievement[] {
  const had = new Set(before.filter((a) => a.earned).map((a) => a.id));
  return after.filter((a) => a.earned && !had.has(a.id));
}

/** The most recently finished lessons, newest first. */
export function recentCompletions(state: ProgressState, limit = 5): { id: string; at: string }[] {
  return Object.entries(state.completed)
    .map(([id, c]) => ({ id, at: c.updatedAt ?? c.at }))
    .sort((a, b) => time(b.at) - time(a.at))
    .slice(0, limit);
}

/** Total lessons finished per track id. */
export function completedPerTrack(state: ProgressState, index: CatalogIndex): Map<string, number> {
  const out = new Map<string, number>();
  for (const id of Object.keys(state.completed)) {
    const ref = index.byId.get(id);
    if (ref) out.set(ref.track.id, (out.get(ref.track.id) ?? 0) + 1);
  }
  return out;
}
