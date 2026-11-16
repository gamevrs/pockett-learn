import { Stack } from 'expo-router';
import { Pressable } from 'react-native';

import { finishOnboarding } from '~/components/onboarding';
import { useHeaderOptions } from '~/components/TabStack';
import { useTheme } from '~/theme';
import { Text } from '~/ui';

/** First launch: five short steps, each skippable from the bar. Skipping keeps the sensible defaults. */
export default function OnboardingLayout() {
  const header = useHeaderOptions();
  const { colors } = useTheme();
  const skip = () => (
    <Pressable accessibilityRole="button" accessibilityLabel="Skip setup" hitSlop={12} onPress={finishOnboarding} testID="onboarding-skip">
      <Text variant="bodyLarge" tone="secondary">
        Skip
      </Text>
    </Pressable>
  );
  return (
    <Stack screenOptions={{ ...header, title: '', headerRight: skip, headerTransparent: false, headerStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
