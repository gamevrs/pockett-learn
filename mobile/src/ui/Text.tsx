import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from 'react-native';

import { font, fontScale, text, useTheme } from '~/theme';

export type TextVariant = 'display' | 'title' | 'heading' | 'bodyLarge' | 'body' | 'label' | 'eyebrow' | 'micro' | 'number';
export type TextTone = 'primary' | 'secondary' | 'tertiary' | 'brand' | 'danger' | 'good' | 'onPrimary' | 'onSelected';

/**
 * The type scale, once. `display` and `title` are the site's serif display face (one big number or a page's
 * greeting; a card's headline); everything else is Geist; `eyebrow` is the site's mono caps label over a section.
 */
const VARIANTS: Record<TextVariant, { fontSize: number; lineHeight: number; fontFamily: string; letterSpacing?: number; textTransform?: 'uppercase' }> = {
  display: { fontSize: text.display, lineHeight: 40, fontFamily: font.serif, letterSpacing: -0.6 },
  title: { fontSize: text.title, lineHeight: 32, fontFamily: font.serif, letterSpacing: -0.4 },
  heading: { fontSize: text.heading, lineHeight: 25, fontFamily: font.semibold, letterSpacing: -0.2 },
  bodyLarge: { fontSize: text.bodyLarge, lineHeight: 24, fontFamily: font.regular },
  body: { fontSize: text.body, lineHeight: 21, fontFamily: font.regular },
  label: { fontSize: text.label, lineHeight: 18, fontFamily: font.medium },
  eyebrow: { fontSize: text.eyebrow, lineHeight: 16, fontFamily: font.mono, letterSpacing: 0.9, textTransform: 'uppercase' },
  micro: { fontSize: text.micro, lineHeight: 14, fontFamily: font.medium },
  number: { fontSize: text.heading, lineHeight: 25, fontFamily: font.semibold },
};

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  weight?: 'regular' | 'medium' | 'semibold';
  center?: boolean;
}

export function Text({ variant = 'body', tone = 'primary', weight, center, style, ...rest }: TextProps) {
  const { colors } = useTheme();
  const color = {
    primary: colors.text,
    secondary: colors.textSecondary,
    tertiary: colors.textTertiary,
    brand: colors.brand,
    danger: colors.danger,
    good: colors.good,
    onPrimary: colors.onPrimary,
    onSelected: colors.onSelected,
  }[tone];
  return (
    <RNText
      maxFontSizeMultiplier={fontScale.max}
      style={[VARIANTS[variant], variant === 'number' && styles.tabular, weight ? { fontFamily: font[weight] } : null, { color }, center && styles.center, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  tabular: { fontVariant: ['tabular-nums'] },
  center: { textAlign: 'center' },
});
