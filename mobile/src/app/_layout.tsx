import { Geist_400Regular } from '@expo-google-fonts/geist/400Regular';
import { Geist_500Medium } from '@expo-google-fonts/geist/500Medium';
import { Geist_600SemiBold } from '@expo-google-fonts/geist/600SemiBold';
import { GeistMono_500Medium } from '@expo-google-fonts/geist-mono/500Medium';
import { SourceSerif4_500Medium } from '@expo-google-fonts/source-serif-4/500Medium';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { AppEffects } from '~/components/AppEffects';
import { UpdateGate } from '~/components/UpdateGate';
import { useHeaderOptions } from '~/components/TabStack';
import { useHydrated } from '~/state/hydration';
import { startSession } from '~/state/session';
import { useSettings } from '~/state/settings';
import { useApplyAppearance, useTheme } from '~/theme';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 200 });
startSession();

export { ErrorBoundary } from '~/components/CrashScreen';

// The tabs sit under everything else; a sheet or a finished onboarding falls back to them.
export const unstable_settings = { anchor: '(tabs)' };

/**
 * The app's frame. First launch: onboarding. After it: the tabs. A lesson, the playground and the sign-in pages
 * are reachable from both (a lesson link opens even before onboarding is done).
 */
export default function RootLayout() {
  const [fonts] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, GeistMono_500Medium, SourceSerif4_500Medium });
  const hydrated = useHydrated();
  const ready = fonts && hydrated;
  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);
  if (!ready) return null;
  return (
    <GestureHandlerRootView style={styles.fill}>
      <Root />
    </GestureHandlerRootView>
  );
}

function Root() {
  useApplyAppearance();
  const { scheme, colors } = useTheme();
  const onboarded = useSettings((s) => s.onboarded);
  const header = useHeaderOptions();
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider value={{ ...base, colors: { ...base.colors, background: colors.background, card: colors.background, text: colors.text, border: colors.line, primary: colors.brand } }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AppEffects />
      <Stack screenOptions={{ ...header, headerShown: false }}>
        <Stack.Protected guard={!onboarded}>
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen name="lesson/[id]" options={{ headerShown: true, presentation: 'fullScreenModal', gestureEnabled: false, title: '' }} />
        <Stack.Screen name="playground" options={{ headerShown: true, title: 'Playground', presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
      </Stack>
      <UpdateGate />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
