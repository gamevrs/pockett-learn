import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { maxWidth, space, useTheme } from '~/theme';
import { Button, ProgressBar, Text } from '~/ui';

export const ONBOARDING_STEPS = 5;

/**
 * One onboarding step: where you are (step n of 5), one question as a serif title with a plain line under it, the
 * choices, and the one button that moves on, pinned to the bottom within thumb reach.
 */
export function OnboardingPage({
  step,
  title,
  body,
  children,
  primary,
  secondary,
  testID,
}: {
  step: number;
  title: string;
  body?: string;
  children?: ReactNode;
  primary: { title: string; onPress: () => void; disabled?: boolean };
  secondary?: ReactNode;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.fill, { backgroundColor: colors.background }]} testID={testID}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.column}>
          {step > 1 ? (
            <View style={styles.progress}>
              <ProgressBar value={step / ONBOARDING_STEPS} accessibilityLabel={`Step ${step} of ${ONBOARDING_STEPS}`} />
            </View>
          ) : null}
          <View style={styles.head}>
            <Text variant="display" accessibilityRole="header">
              {title}
            </Text>
            {body ? (
              <Text variant="bodyLarge" tone="secondary">
                {body}
              </Text>
            ) : null}
          </View>
          {children}
        </View>
      </ScrollView>
      <View style={[styles.actions, { borderTopColor: colors.line }]}>
        <View style={styles.column}>
          <Button variant="primary" title={primary.title} onPress={primary.onPress} disabled={primary.disabled} testID="onboarding-continue" />
          {secondary}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space.gutter, paddingBottom: space.xl, alignItems: 'center' },
  column: { width: '100%', maxWidth: maxWidth.reading, gap: space.xl },
  progress: { paddingTop: space.sm },
  head: { gap: space.sm, paddingTop: space.sm },
  actions: { paddingHorizontal: space.gutter, paddingTop: space.md, paddingBottom: space.sm, alignItems: 'center' },
});
