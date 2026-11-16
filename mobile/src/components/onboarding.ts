import { useSettings } from '~/state/settings';

/** Ends onboarding: the root layout's guard swaps it for the tabs. */
export function finishOnboarding() {
  useSettings.getState().set({ onboarded: true });
}
