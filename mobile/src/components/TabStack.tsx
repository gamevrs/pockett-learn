import { Stack } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';

import { font, text, useTheme } from '~/theme';

type StackOptions = NonNullable<ComponentProps<typeof Stack>['screenOptions']>;

/**
 * The header every stack in the app uses, once, so no screen hand-sizes a title: Geist semibold at the bar's own
 * size; on a tab's first page a large title in the site's serif (iOS), or the same serif at the bar's size
 * (Android's top app bar). iOS draws a glass bar over the content; Android a solid bar the colour of the page.
 */
export function useHeaderOptions(): Exclude<StackOptions, (...args: never[]) => unknown> {
  const { colors } = useTheme();
  return {
    headerTintColor: colors.text,
    headerTitleStyle: { fontFamily: font.semibold, color: colors.text },
    headerLargeTitleStyle: { fontFamily: font.serif, color: colors.text },
    headerShadowVisible: false,
    headerLargeTitleShadowVisible: false,
    headerTransparent: Platform.OS === 'ios',
    headerStyle: Platform.OS === 'ios' ? undefined : { backgroundColor: colors.background },
    headerBackButtonDisplayMode: 'minimal',
    contentStyle: { backgroundColor: colors.background },
  };
}

/** Options for a tab's first page: its large title. */
export function useRootTitle(title: string) {
  const { colors } = useTheme();
  return Platform.OS === 'ios'
    ? { title, headerLargeTitle: true }
    : { title, headerTitleStyle: { fontFamily: font.serif, fontSize: text.title - 2, color: colors.text } };
}

export function TabStack() {
  const options = useHeaderOptions();
  return <Stack screenOptions={options} />;
}
