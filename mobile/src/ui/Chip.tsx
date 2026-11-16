import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { height, radius, space, useTheme } from '~/theme';
import { useSettings } from '~/state/settings';

import { Text } from './Text';

/** A filter or a pick from a few: a capsule, tonal until chosen, then inverted. */
export function Chip({ label, selected, onPress, accessibilityLabel }: { label: string; selected: boolean; onPress: () => void; accessibilityLabel?: string }) {
  const { colors } = useTheme();
  const haptics = useSettings((s) => s.haptics);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      hitSlop={{ top: 6, bottom: 6 }}
      onPress={() => {
        if (haptics) Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.chip, { backgroundColor: selected ? colors.selected : pressed ? colors.tonalPressed : colors.tonal }]}>
      <Text variant="label" style={{ color: selected ? colors.onSelected : colors.text }} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A row of chips that scrolls sideways, inset to the page margin. */
export function ChipRow<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityLabel={label}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={o.value === value} onPress={() => onChange(o.value)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  chip: { minHeight: height.compact, paddingHorizontal: space.lg, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  row: { gap: space.sm, paddingHorizontal: space.gutter },
});
