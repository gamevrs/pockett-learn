import type { ErrorBoundaryProps } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { palette, space } from '~/theme';
import { Button, Text } from '~/ui';

/** Any screen that throws while drawing lands here rather than on a blank screen, with a plain way back. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={[styles.fill, { backgroundColor: palette.dark.background }]}>
      <Text variant="title" center style={{ color: palette.dark.text }}>
        Something went wrong
      </Text>
      <Text variant="body" center style={{ color: palette.dark.textSecondary }}>
        That screen couldn&apos;t open. Your progress is safe.
      </Text>
      <Button variant="primary" title="Try again" onPress={retry} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'center', padding: space.xxl, gap: space.lg },
});
