import type { ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { elevation, hairline, height, iconSize, radius, space, useTheme } from '~/theme';

import { Icon, type IconName } from './Icon';
import { SectionHeader } from './SectionHeader';
import { Text } from './Text';

/**
 * Grouped lists, as iOS Settings and Android's preference screens lay them out: a titled group of rows on one
 * card, with an optional footnote. Every list in the app (settings, modules, lessons) is built from these.
 */
export function ListSection({ title, footer, aside, children }: { title?: string; footer?: string; aside?: ReactNode; children: ReactNode }) {
  const { colors, scheme } = useTheme();
  return (
    <View style={styles.section}>
      {title ? <SectionHeader title={title} aside={aside} /> : null}
      <View style={[styles.group, { backgroundColor: colors.surface, borderColor: colors.line }, elevation(scheme)]}>{children}</View>
      {footer ? (
        <Text variant="label" tone="tertiary" style={styles.footer}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

export interface ListRowProps {
  icon?: IconName;
  iconColor?: string;
  /** Any mark in place of the icon (a completion check, a ring). */
  leading?: ReactNode;
  label: string;
  detail?: string | null;
  /** A value at the right, before the chevron. */
  value?: string | null;
  trailing?: 'chevron' | 'check' | 'external' | 'none';
  /** Anything at the right in place of the trailing mark. */
  accessory?: ReactNode;
  destructive?: boolean;
  busy?: boolean;
  disabled?: boolean;
  last?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  numberOfLines?: number;
}

export function ListRow({ icon, iconColor, leading, label, detail, value, trailing = 'chevron', accessory, destructive, busy, disabled, last, onPress, accessibilityLabel, accessibilityHint, testID, numberOfLines = 2 }: ListRowProps) {
  const { colors } = useTheme();
  const tint = destructive ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole={onPress ? (trailing === 'external' ? 'link' : 'button') : undefined}
      accessibilityLabel={accessibilityLabel ?? [label, detail, value].filter(Boolean).join(', ')}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!disabled, busy: !!busy, selected: trailing === 'check' ? true : undefined }}
      disabled={disabled || busy || !onPress}
      onPress={onPress}
      testID={testID}
      android_ripple={onPress ? { color: colors.tonalPressed } : undefined}
      style={({ pressed }) => [styles.row, pressed && Platform.OS === 'ios' && { backgroundColor: colors.tonal }, disabled && styles.disabled]}>
      {leading ?? (icon ? <Icon name={icon} size={iconSize.md} color={iconColor ?? (destructive ? colors.danger : colors.textSecondary)} /> : null)}
      <View style={[styles.body, !last && { borderBottomWidth: hairline, borderBottomColor: colors.line }]}>
        <View style={styles.texts}>
          <Text variant="bodyLarge" style={{ color: tint }} numberOfLines={numberOfLines}>
            {label}
          </Text>
          {detail ? (
            <Text variant="label" tone="tertiary" numberOfLines={2}>
              {detail}
            </Text>
          ) : null}
        </View>
        {value ? (
          <Text variant="body" tone="secondary" numberOfLines={1} style={styles.value}>
            {value}
          </Text>
        ) : null}
        {busy ? <ActivityIndicator color={colors.textTertiary} /> : null}
        {!busy && accessory ? accessory : null}
        {!busy && !accessory && trailing === 'chevron' && onPress ? <Icon name="chevron" size={iconSize.sm} color={colors.textTertiary} /> : null}
        {!busy && !accessory && trailing === 'external' ? <Icon name="external" size={iconSize.sm} color={colors.textTertiary} /> : null}
        {!busy && !accessory && trailing === 'check' ? <Icon name="check" size={iconSize.sm} color={colors.brand} /> : null}
      </View>
    </Pressable>
  );
}

/** An on/off setting: the platform's own switch. The whole row flips it. */
export function ListSwitchRow({ icon, label, detail, value, onValueChange, disabled, last }: { icon?: IconName; label: string; detail?: string | null; value: boolean; onValueChange: (v: boolean) => void; disabled?: boolean; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      {icon ? <Icon name={icon} size={iconSize.md} color={colors.textSecondary} /> : null}
      <View style={[styles.body, !last && { borderBottomWidth: hairline, borderBottomColor: colors.line }]}>
        <Pressable accessible={false} disabled={disabled} onPress={() => onValueChange(!value)} style={styles.texts}>
          <Text variant="bodyLarge">{label}</Text>
          {detail ? (
            <Text variant="label" tone="tertiary">
              {detail}
            </Text>
          ) : null}
        </Pressable>
        <Switch
          accessibilityLabel={label}
          accessibilityHint={detail ?? undefined}
          value={value}
          disabled={disabled}
          onValueChange={onValueChange}
          trackColor={Platform.OS === 'android' ? { true: colors.brand, false: colors.switchOff } : { true: colors.brand }}
          thumbColor={Platform.OS === 'android' ? (value ? colors.onSelected : colors.textTertiary) : undefined}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
  group: { borderRadius: radius.card, borderWidth: hairline, overflow: 'hidden' },
  footer: { paddingHorizontal: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingLeft: space.lg },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: height.row, paddingVertical: space.sm, paddingRight: space.lg },
  texts: { flex: 1, gap: space.xxs, justifyContent: 'center', alignSelf: 'stretch' },
  value: { maxWidth: '45%', textAlign: 'right' },
  disabled: { opacity: 0.4 },
});
