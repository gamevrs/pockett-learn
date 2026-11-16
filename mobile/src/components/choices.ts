import { GOAL_CHOICES, useSettings, type Appearance, type Settings } from '~/state/settings';

/**
 * Settings with a few fixed values, each chosen on a page of its own (account/choose/[key]) rather than spread
 * across the Settings page: the platform's settings pattern, and it keeps Settings short.
 */
export interface Choice<T> {
  value: T;
  label: string;
  detail?: string;
}

export const CHOICES = {
  appearance: {
    title: 'Appearance',
    footer: 'Match phone follows your phone’s light or dark setting.',
    options: [
      { value: 'system', label: 'Match phone' },
      { value: 'dark', label: 'Dark' },
      { value: 'light', label: 'Light' },
    ] as Choice<Appearance>[],
  },
  dailyGoal: {
    title: 'Daily goal',
    footer: 'Minutes of lessons a day. The ring on Home fills toward it. Most lessons take 5 to 10 minutes.',
    options: GOAL_CHOICES.map((g) => ({ value: g, label: `${g} minutes`, detail: { 5: 'Casual', 10: 'Regular', 15: 'Serious', 20: 'Intense' }[g] })) as Choice<number>[],
  },
} as const;

export type ChoiceKey = keyof typeof CHOICES;

export function choiceLabel(key: ChoiceKey, value: unknown): string {
  return (CHOICES[key].options as Choice<unknown>[]).find((o) => o.value === value)?.label ?? '';
}

export function setChoice(key: ChoiceKey, value: unknown) {
  useSettings.getState().set({ [key]: value } as Partial<Settings>);
}
