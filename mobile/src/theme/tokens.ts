/**
 * Pockett's design tokens for the phone, taken from the website's live tokens (src/app/globals.css and
 * components.css one level up): neutral surfaces, one accent (the pastel lime, always a fill with dark ink on it;
 * the deep olive is the accent for text and lines on light surfaces), Geist for UI, Source Serif for display
 * headings, Geist Mono for eyebrows. When a value changes there, it changes here.
 *
 * The rules that come with them live in mobile/DESIGN.md.
 */

export const palette = {
  light: {
    background: '#f6f5f1',
    backgroundAlt: '#efede7',
    surface: '#ffffff',
    surfaceAlt: '#f3f2ed',
    text: '#121211',
    textSecondary: '#4a4943',
    textTertiary: '#67655f',
    line: '#e5e3dc',
    lineStrong: '#d2d0c8',
    /** A quiet accent wash behind accent content (the site's --tint). */
    tint: '#eef7dd',
    /** Accent for text, icons and thin lines (5:1 on the page). */
    brand: '#4b7411',
    /** Accent fill for the one main action; always with `onPrimary` on it. */
    primary: '#c5ee8a',
    primaryPressed: '#b4e06f',
    onPrimary: '#0a0a0a',
    /** A soft fill for secondary controls (chips, secondary buttons, fields at rest). */
    tonal: 'rgba(18,18,17,0.06)',
    tonalPressed: 'rgba(18,18,17,0.11)',
    /** Selected chip: inverted. */
    selected: '#121211',
    onSelected: '#fafafa',
    good: '#116b30',
    danger: '#b91c1c',
    dangerFill: '#c5221f',
    onDanger: '#ffffff',
    warning: '#8a5209',
    switchOff: '#e5e3dc',
    overlay: 'rgba(10,10,10,0.4)',
    shadow: 'rgb(20,20,10)',
  },
  dark: {
    background: '#0a0a0a',
    backgroundAlt: '#0e0e0e',
    surface: '#151515',
    surfaceAlt: '#1d1d1d',
    text: '#fafafa',
    textSecondary: '#a3a3a3',
    textTertiary: '#8a8a8a',
    line: 'rgba(255,255,255,0.08)',
    lineStrong: 'rgba(255,255,255,0.16)',
    tint: '#161b0f',
    brand: '#c5ee8a',
    primary: '#c5ee8a',
    primaryPressed: '#d3f3a4',
    onPrimary: '#0a0a0a',
    tonal: 'rgba(255,255,255,0.08)',
    tonalPressed: 'rgba(255,255,255,0.14)',
    selected: '#fafafa',
    onSelected: '#0a0a0a',
    good: '#4ade80',
    danger: '#f87171',
    dangerFill: '#d6403c',
    onDanger: '#ffffff',
    warning: '#e5b06a',
    switchOff: '#3a3a3a',
    overlay: 'rgba(0,0,0,0.6)',
    shadow: 'rgb(0,0,0)',
  },
} as const;

export type Scheme = keyof typeof palette;
export type Colors = { [K in keyof (typeof palette)['light']]: string };

/** Loaded in the root layout from @expo-google-fonts. Weight is the font, never `fontWeight`. */
export const font = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  serif: 'SourceSerif4_500Medium',
  mono: 'GeistMono_500Medium',
} as const;

/** The one type scale. Sizes come from here and nowhere else. */
export const text = {
  micro: 11,
  eyebrow: 12,
  label: 13,
  body: 15,
  pill: 15,
  input: 17,
  bodyLarge: 17,
  heading: 19,
  title: 26,
  display: 34,
} as const;

/** 4pt base. The page margin is `gutter`, the same inset the tab bar and native lists use. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  gutter: 16,
} as const;

/**
 * Corners: `pill` for every one-line control (buttons, chips, fields, the search bar), `card` (16, the site's
 * .card) for every card and grouped list, a circle (size / 2) for an icon on its own. Nothing else.
 */
export const radius = {
  card: 16,
  pill: 9999,
} as const;

/** Control heights. Controls take these as `minHeight`, so a large text size makes them taller, never clipped. */
export const height = {
  /** Buttons and fields. */
  touch: 50,
  /** Chips and segmented choices. */
  compact: 36,
  /** A row in a list. */
  row: 52,
} as const;

/** Glyph sizes, chosen by what they sit in. */
export const iconSize = {
  sm: 16,
  md: 22,
  lg: 28,
  xl: 44,
} as const;

/** The widest a column of reading grows (iPad, landscape). */
export const maxWidth = {
  reading: 680,
} as const;

/** How far text follows the system text size. */
export const fontScale = {
  max: 2,
  /** Inside a fixed-size mark (a ring's number). */
  dense: 1.3,
} as const;

export const hairline = 1;

export function elevation(scheme: Scheme) {
  return scheme === 'dark'
    ? { elevation: 0 }
    : { shadowColor: palette.light.shadow, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, shadowOpacity: 0.06, elevation: 1 };
}
