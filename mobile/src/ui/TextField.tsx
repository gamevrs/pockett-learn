import { useState, type ComponentRef, type Ref } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { font, fontScale, hairline, height, radius, space, text, useTheme } from '~/theme';

import { Text } from './Text';

/**
 * A line of typing: a capsule, tonal at rest, with its label above it (never only a placeholder). Text at 17 so
 * iOS never zooms; grows with the system text size.
 */
export type TextFieldRef = ComponentRef<typeof TextInput>;

export function TextField({ label, error, style, onFocus, onBlur, ref, ...rest }: Omit<TextInputProps, 'ref'> & { label: string; error?: string | null; ref?: Ref<TextFieldRef> }) {
  const { colors, scheme } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.wrap}>
      <Text variant="label" tone="secondary" style={styles.label} nativeID={`${label}-label`}>
        {label}
      </Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityLabelledBy={`${label}-label`}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.brand}
        cursorColor={colors.brand}
        keyboardAppearance={scheme}
        maxFontSizeMultiplier={fontScale.max}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          { backgroundColor: focused ? colors.surface : colors.tonal, color: colors.text, borderColor: error ? colors.danger : focused ? colors.brand : 'transparent' },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="label" tone="danger" style={styles.label} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  label: { paddingHorizontal: space.lg },
  input: { minHeight: height.touch, borderRadius: radius.pill, paddingHorizontal: space.xl, fontSize: text.input, fontFamily: font.regular, borderWidth: hairline * 1.5 },
});
