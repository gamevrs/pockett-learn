import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { planReminders } from '~/lib/reminders';

import { useProgress } from './progress';
import { useSettings } from './settings';

/**
 * Local reminders only (no server push): the daily reminder at the chosen time and the evening streak reminder.
 * The plan (lib/reminders.ts) is redone whenever progress or the reminder settings change, so a day that already
 * has a lesson never gets its reminder.
 */
const CHANNEL = 'reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
});

export type Permission = 'granted' | 'denied' | 'undetermined';

export async function permissionStatus(): Promise<Permission> {
  const p = await Notifications.getPermissionsAsync();
  if (p.granted || p.ios?.status === IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

/** Asks once, in context (onboarding's reminder step, or turning a reminder on). */
export async function askPermission(): Promise<Permission> {
  if (Platform.OS === 'android') await ensureChannel();
  const p = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
  return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
}

async function ensureChannel() {
  await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Reminders', importance: AndroidImportance.DEFAULT, description: 'Your daily lesson reminder and streak reminder' });
}

export function usePermission(): [Permission | null, () => void] {
  const [status, setStatus] = useState<Permission | null>(null);
  const refresh = useCallback(() => {
    permissionStatus().then(setStatus, () => setStatus('undetermined'));
  }, []);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);
  return [status, refresh];
}

let scheduling = Promise.resolve();

export function rescheduleReminders(): Promise<void> {
  scheduling = scheduling.then(async () => {
    try {
      const s = useSettings.getState();
      await Notifications.cancelAllScheduledNotificationsAsync();
      if (!s.dailyReminder && !s.streakReminder) return;
      if ((await permissionStatus()) !== 'granted') return;
      if (Platform.OS === 'android') await ensureChannel();
      const plan = planReminders(useProgress.getState().progress, s, new Date());
      for (const n of plan) {
        await Notifications.scheduleNotificationAsync({
          identifier: n.id,
          content: { title: n.title, body: n.body, data: { route: n.route } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: n.at, channelId: CHANNEL },
        });
      }
    } catch {
      /* scheduling is best effort; the next change tries again */
    }
  });
  return scheduling;
}

/** Keeps the schedule in step with progress, settings and the day (redone each time the app comes forward). */
export function useReminderSchedule() {
  const progress = useProgress((s) => s.progress);
  const daily = useSettings((s) => s.dailyReminder);
  const time = useSettings((s) => s.reminderTime);
  const streak = useSettings((s) => s.streakReminder);
  useEffect(() => {
    rescheduleReminders();
  }, [progress, daily, time, streak]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && rescheduleReminders());
    return () => sub.remove();
  }, []);
}
