import { Pressable, StyleSheet } from 'react-native';

import { iconSize, useTheme } from '~/theme';
import { Icon, type IconName } from '~/ui';

/** An icon in a native header (close, more): the platform's glyph, a 44pt target, a label for screen readers. */
export function HeaderIconButton({ icon, label, onPress, testID }: { icon: IconName; label: string; onPress: () => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={onPress} testID={testID} style={({ pressed }) => [styles.button, pressed && { opacity: 0.5 }]}>
      <Icon name={icon} size={iconSize.md} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
});
