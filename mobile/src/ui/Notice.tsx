import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { iconSize, space, useTheme } from '~/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/** A line of information in a page: a small mark beside plain text, never a box. */
export function Notice({ icon = 'info', tone = 'secondary', children }: { icon?: IconName; tone?: 'secondary' | 'danger' | 'good'; children: ReactNode }) {
  const { colors } = useTheme();
  const color = tone === 'danger' ? colors.danger : tone === 'good' ? colors.good : colors.textTertiary;
  return (
    <View style={styles.notice} accessible accessibilityRole={tone === 'danger' ? 'alert' : 'text'}>
      <Icon name={icon} size={iconSize.sm} color={color} />
      <Text variant="label" tone={tone === 'secondary' ? 'secondary' : tone} style={styles.text}>
        {children}
      </Text>
    </View>
  );
}

/** A screen or section with nothing to show yet, or that can't show it (offline): one mark, a title, a line, and at most one action. */
export function EmptyState({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <Icon name={icon} size={iconSize.xl} color={colors.textTertiary} />
      <Text variant="heading" center accessibilityRole="header">
        {title}
      </Text>
      {body ? (
        <Text variant="body" tone="secondary" center style={styles.body}>
          {body}
        </Text>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  notice: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', paddingHorizontal: space.xs },
  text: { flex: 1 },
  empty: { alignItems: 'center', gap: space.md, paddingVertical: space.xxxl, paddingHorizontal: space.xl },
  body: { maxWidth: 360 },
  action: { marginTop: space.sm, alignSelf: 'stretch', alignItems: 'center' },
});
