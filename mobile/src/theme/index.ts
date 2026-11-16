import { useEffect } from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { useSettings } from '~/state/settings';

import { palette, type Colors, type Scheme } from './tokens';

export * from './tokens';

/** The scheme in effect: the Appearance setting, or the phone's when it is System. */
export function useScheme(): Scheme {
  const system = useColorScheme();
  const pref = useSettings((s) => s.appearance);
  if (pref !== 'system') return pref;
  return system === 'light' ? 'light' : 'dark';
}

export function useTheme(): { scheme: Scheme; colors: Colors } {
  const scheme = useScheme();
  return { scheme, colors: palette[scheme] };
}

/**
 * Applies the Appearance setting to the native parts too (tab bar, headers, alerts, the keyboard, menus), which
 * follow the app's own UIUserInterfaceStyle / night mode rather than our React tree.
 */
export function useApplyAppearance() {
  const pref = useSettings((s) => s.appearance);
  useEffect(() => {
    Appearance.setColorScheme(pref === 'system' ? 'unspecified' : pref);
  }, [pref]);
}
