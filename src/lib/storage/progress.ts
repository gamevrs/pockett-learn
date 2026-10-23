import { UserStats } from "../courses/types";

const STORAGE_KEY = "pockett_learn_user_stats_v1";

const DEFAULT_STATS: UserStats = {
  xp: 0,
  level: 1,
  streak: 1,
  lastActiveDate: new Date().toISOString().split("T")[0],
  completedLessons: [],
  savedCode: {},
  soundEnabled: true,
};

export function calculateLevel(xp: number): number {
  // Every 250 XP is 1 level
  return Math.floor(xp / 250) + 1;
}

export function getUserStats(): UserStats {
  if (typeof window === "undefined") {
    return DEFAULT_STATS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveUserStats(DEFAULT_STATS);
      return DEFAULT_STATS;
    }
    const parsed = JSON.parse(raw) as UserStats;

    // Check streak
    const today = new Date().toISOString().split("T")[0];
    if (parsed.lastActiveDate !== today) {
      const last = new Date(parsed.lastActiveDate);
      const curr = new Date(today);
      const diffDays = Math.round(
        (curr.getTime() - last.getTime()) / (1000 * 3600 * 24)
      );

      if (diffDays === 1) {
        parsed.streak += 1;
      } else if (diffDays > 1) {
        parsed.streak = 1;
      }
      parsed.lastActiveDate = today;
      saveUserStats(parsed);
    }

    return parsed;
  } catch {
    return DEFAULT_STATS;
  }
}

export function saveUserStats(stats: UserStats): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (err) {
    console.error("Failed to save progress locally", err);
  }
}

export function saveLessonCode(lessonId: string, code: string): void {
  const stats = getUserStats();
  stats.savedCode[lessonId] = code;
  saveUserStats(stats);
}

export function getSavedLessonCode(
  lessonId: string,
  defaultCode: string
): string {
  const stats = getUserStats();
  return stats.savedCode[lessonId] ?? defaultCode;
}

export function completeLesson(
  lessonId: string,
  xpEarned: number
): { stats: UserStats; isNewCompletion: boolean; leveledUp: boolean } {
  const stats = getUserStats();
  const isNewCompletion = !stats.completedLessons.includes(lessonId);

  const prevLevel = calculateLevel(stats.xp);

  if (isNewCompletion) {
    stats.completedLessons.push(lessonId);
    stats.xp += xpEarned;
  }

  const newLevel = calculateLevel(stats.xp);
  stats.level = newLevel;
  stats.lastActiveDate = new Date().toISOString().split("T")[0];

  saveUserStats(stats);

  return {
    stats,
    isNewCompletion,
    leveledUp: newLevel > prevLevel,
  };
}

export function toggleSound(): boolean {
  const stats = getUserStats();
  stats.soundEnabled = !stats.soundEnabled;
  saveUserStats(stats);
  return stats.soundEnabled;
}
