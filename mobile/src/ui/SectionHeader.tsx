import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '~/theme';

import { Text } from './Text';

/**
 * A section's title, the same on every screen: the site's mono eyebrow, with an optional quiet line under it and
 * an optional control at the right ("See all").
 */
export function SectionHeader({ title, detail, aside }: { title: string; detail?: string | null; aside?: ReactNode }) {
  return (
    <View style={styles.head}>
      <View style={styles.titles}>
        <Text variant="eyebrow" tone="tertiary" accessibilityRole="header">
          {title}
        </Text>
        {detail ? (
          <Text variant="label" tone="tertiary">
            {detail}
          </Text>
        ) : null}
      </View>
      {aside ?? null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md, paddingHorizontal: space.xs, minHeight: 24 },
  titles: { flexShrink: 1, gap: space.xxs },
});
