/**
 * Which local notifications to have scheduled, from the progress and the reminder settings. Pure, so the rules
 * are tested; ~/state/notifications turns the plan into scheduled notifications and redoes it whenever progress
 * or settings change, so a day that already has a lesson never gets its reminder.
 */
import { activeToday, addDays, dayKey, type ProgressState } from './progress';

export interface ReminderSettings {
  dailyReminder: boolean;
  /** Minutes after midnight, local time. */
  reminderTime: number;
  streakReminder: boolean;
}

export interface PlannedNotification {
  id: string;
  at: Date;
  title: string;
  body: string;
  /** Where a tap goes (an app route). */
  route: string;
}

/** The evening reminder for a streak that ends at midnight: 8 pm local. */
export const STREAK_REMINDER_MINUTES = 20 * 60;

function at(key: string, minutes: number): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60, 0, 0);
}

export function planReminders(progress: ProgressState, settings: ReminderSettings, now: Date, days = 7): PlannedNotification[] {
  const out: PlannedNotification[] = [];
  const today = dayKey(now);
  const doneToday = activeToday(progress, now);

  if (settings.dailyReminder) {
    for (let i = 0; i < days; i++) {
      const key = addDays(today, i);
      if (i === 0 && doneToday) continue;
      const when = at(key, settings.reminderTime);
      if (when <= now) continue;
      out.push({ id: `daily-${key}`, at: when, title: 'Time for a lesson', body: 'A few minutes today keeps your learning moving.', route: '/' });
    }
  }

  // A streak lapses after a whole day with no lesson, so it is at risk on the day after the last active day.
  if (settings.streakReminder && progress.streak > 0 && progress.lastActiveDate) {
    const riskDay = addDays(progress.lastActiveDate, 1);
    if (riskDay >= today) {
      const when = at(riskDay, STREAK_REMINDER_MINUTES);
      const dailyAtSameTime = settings.dailyReminder && settings.reminderTime === STREAK_REMINDER_MINUTES;
      if (when > now && !(riskDay === today && doneToday)) {
        if (dailyAtSameTime) {
          const i = out.findIndex((n) => n.id === `daily-${riskDay}`);
          if (i >= 0) out.splice(i, 1);
        }
        const days = progress.streak === 1 ? '1-day' : `${progress.streak}-day`;
        out.push({ id: `streak-${riskDay}`, at: when, title: `Keep your ${days} streak`, body: 'It ends at midnight. One short lesson keeps it going.', route: '/' });
      }
    }
  }
  return out.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** "7:30 PM" style, in the phone's own clock format when Intl knows it. */
export function formatMinutes(minutes: number, locale?: string): string {
  const d = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
  try {
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(d);
  } catch {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
}
