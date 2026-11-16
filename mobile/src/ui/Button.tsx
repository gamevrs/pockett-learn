import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { height, iconSize, radius, space, useTheme } from '~/theme';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/**
 * A command. `primary` is the accent fill, at most one on a screen (the one thing the screen is for); `secondary`
 * is a soft tonal fill; `plain` is text only (a quiet second choice, "Not now"); `danger` only confirms a
 * destructive action. Always a capsule, `height.touch` tall at least.
 */
export function Button({
  title,
  onPress,
  variant = 'secondary',
  icon,
  busy,
  disabled,
  accessibilityHint,
  testID,
  compact,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'plain' | 'danger';
  icon?: IconName;
  busy?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
  /** Hug the label instead of filling the row. */
  compact?: boolean;
}) {
  const { colors } = useTheme();
  const fill = { primary: colors.primary, secondary: colors.tonal, plain: 'transparent', danger: colors.dangerFill }[variant];
  const pressed = { primary: colors.primaryPressed, secondary: colors.tonalPressed, plain: colors.tonal, danger: colors.dangerFill }[variant];
  const ink = { primary: colors.onPrimary, secondary: colors.text, plain: colors.brand, danger: colors.onDanger }[variant];
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      disabled={off}
      onPress={onPress}
      testID={testID}
      style={({ pressed: p }) => [styles.base, compact && styles.compact, { backgroundColor: p ? pressed : fill }, disabled && styles.disabled]}>
      {busy ? (
        <ActivityIndicator color={ink} />
      ) : (
        <View style={styles.row}>
          {icon ? <Icon name={icon} size={iconSize.sm} color={ink} /> : null}
          <Text variant="bodyLarge" weight="semibold" style={{ color: ink }} numberOfLines={2} center>
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: height.touch, borderRadius: radius.pill, paddingHorizontal: space.xl, paddingVertical: space.sm, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  compact: { alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  disabled: { opacity: 0.4 },
});
