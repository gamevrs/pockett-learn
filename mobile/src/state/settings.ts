import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Experience } from '~/lib/recommend';

import { appStorage } from './storage';

export type Appearance = 'system' | 'dark' | 'light';

export interface Settings {
  /** Onboarding was finished or skipped on this device. */
  onboarded: boolean;
  appearance: Appearance;
  haptics: boolean;
  /** Minutes a day. */
  dailyGoal: number;
  dailyReminder: boolean;
  /** Minutes after midnight, local time. */
  reminderTime: number;
  streakReminder: boolean;
  interests: string[];
  experience: Experience | null;
  startLessonId: string | null;
}

export const GOAL_CHOICES = [5, 10, 15, 20] as const;

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  appearance: 'system',
  haptics: true,
  dailyGoal: 10,
  dailyReminder: false,
  reminderTime: 19 * 60,
  streakReminder: false,
  interests: [],
  experience: null,
  startLessonId: null,
};

interface SettingsStore extends Settings {
  set: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      set: (patch) => set(patch),
      reset: () => set({ ...DEFAULT_SETTINGS }),
    }),
    { name: 'pockett.settings', storage: appStorage, version: 1 },
  ),
);
