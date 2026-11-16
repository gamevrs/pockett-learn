import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { elevation, hairline, radius, space, useTheme } from '~/theme';

/**
 * A raised surface: the site's .card (surface, 1px line, 16 radius). Pressable when given `onPress`, with a
 * label that says what the press does.
 */
export function Card({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  tint,
  style,
  testID,
}: {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** The accent wash, for the one card that carries the screen's main action. */
  tint?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const { colors, scheme } = useTheme();
  const base = [styles.card, { backgroundColor: tint ? colors.tint : colors.surface, borderColor: colors.line }, elevation(scheme), style];
  if (!onPress)
    return (
      <View style={base} testID={testID}>
        {children}
      </View>
    );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      testID={testID}
      android_ripple={{ color: colors.tonalPressed, foreground: true }}
      style={({ pressed }) => [...base, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, borderWidth: hairline, padding: space.lg, gap: space.md, overflow: 'hidden' },
});
