"use client";

import { callNative, isNativeApp } from "./app";
import type { ProgressState } from "@/data/progress/types";

/**
 * The app's daily learning-streak reminder: a local notification, scheduled on the phone, that the learner switches on
 * in Account → App settings. No server and no push: nothing leaves the device.
 *
 * Rather than one repeating notification, the next DAYS days are scheduled one by one, so a day that already has a
 * finished lesson is skipped. It is rescheduled whenever the app opens and whenever a lesson is finished.
 */

const KEY = "pockett_app_reminder";
const FIRST_ID = 7000;
const DAYS = 14;

export interface ReminderPrefs {
  enabled: boolean;
  /** Local time, 24-hour */
  hour: number;
  minute: number;
}

const DEFAULT: ReminderPrefs = { enabled: false, hour: 19, minute: 0 };

export function readReminder(): ReminderPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<ReminderPrefs> | null;
    if (!raw) return DEFAULT;
    const hour = Number.isInteger(raw.hour) && raw.hour! >= 0 && raw.hour! < 24 ? raw.hour! : DEFAULT.hour;
    const minute = Number.isInteger(raw.minute) && raw.minute! >= 0 && raw.minute! < 60 ? raw.minute! : DEFAULT.minute;
    return { enabled: raw.enabled === true, hour, minute };
  } catch {
    return DEFAULT;
  }
}

function writeReminder(prefs: ReminderPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable: the setting just won't persist */
  }
}

type Permission = "granted" | "denied" | "prompt" | "prompt-with-rationale";

/** Asks for notification permission if it hasn't been decided yet. True when notifications may be shown. */
async function ensurePermission(): Promise<boolean> {
  const current = await callNative<{ display: Permission }>("LocalNotifications", "checkPermissions");
  if (current?.display === "granted") return true;
  if (current?.display === "denied") return false;
  const asked = await callNative<{ display: Permission }>("LocalNotifications", "requestPermissions");
  return asked?.display === "granted";
}

function localDay(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Cancel what was scheduled and, when switched on, schedule the next days afresh. */
export async function rescheduleReminder(progress: Pick<ProgressState, "streak" | "lastActiveDate">, prefs = readReminder()) {
  if (!isNativeApp()) return;
  const ids = Array.from({ length: DAYS + 1 }, (_, i) => ({ id: FIRST_ID + i }));
  await callNative("LocalNotifications", "cancel", { notifications: ids });
  if (!prefs.enabled) return;

  const now = new Date();
  const doneToday = progress.lastActiveDate === localDay(now);
  const notifications = [];
  for (let i = 0; i <= DAYS; i++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, prefs.hour, prefs.minute);
    if (at <= now || (i === 0 && doneToday)) continue;
    // the streak only survives until tomorrow's reminder if today counts; past that, the count isn't known yet
    const keep = progress.streak > 0 && ((i === 0 && !doneToday) || (i === 1 && doneToday));
    notifications.push({
      id: FIRST_ID + i,
      title: keep ? `Keep your ${progress.streak}-day streak going` : "Time for today's lesson",
      body: keep ? "One short lesson today keeps it alive." : "A few minutes of code a day adds up. Pick up where you left off.",
      // a Date, not a string: iOS receives it as a native date, Android as the ISO string it parses
      schedule: { at, allowWhileIdle: false },
      // a reminder, not an alarm: Android may deliver it a few minutes late, and no exact-alarm permission is needed
      isExactNotification: false,
      extra: { path: "/dashboard" },
    });
    if (notifications.length >= DAYS) break;
  }
  if (notifications.length) await callNative("LocalNotifications", "schedule", { notifications });
}

/**
 * Switch the reminder on or off (or move it). Switching on asks for permission first; resolves to the saved prefs,
 * which stay off when permission was refused.
 */
export async function setReminder(
  next: ReminderPrefs,
  progress: Pick<ProgressState, "streak" | "lastActiveDate">,
): Promise<{ prefs: ReminderPrefs; denied: boolean }> {
  if (next.enabled && !(await ensurePermission())) {
    const off = { ...next, enabled: false };
    writeReminder(off);
    await rescheduleReminder(progress, off);
    return { prefs: off, denied: true };
  }
  writeReminder(next);
  await rescheduleReminder(progress, next);
  return { prefs: next, denied: false };
}
