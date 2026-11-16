import { SymbolView, type AndroidSymbol } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';

import { iconSize, useTheme } from '~/theme';

/**
 * Every glyph in the app, once: an SF Symbol on iOS and the matching Material Symbol on Android, so each platform
 * draws its own icons. Add a role here rather than naming a symbol in a screen.
 */
export const ICONS = {
  home: { ios: 'house', android: 'home' },
  learn: { ios: 'book', android: 'menu_book' },
  progress: { ios: 'chart.bar', android: 'bar_chart' },
  account: { ios: 'person.crop.circle', android: 'account_circle' },
  streak: { ios: 'flame.fill', android: 'local_fire_department' },
  xp: { ios: 'bolt.fill', android: 'bolt' },
  level: { ios: 'star.fill', android: 'star' },
  goal: { ios: 'target', android: 'target' },
  done: { ios: 'checkmark.circle.fill', android: 'check_circle' },
  todo: { ios: 'circle', android: 'radio_button_unchecked' },
  check: { ios: 'checkmark', android: 'check' },
  chevron: { ios: 'chevron.right', android: 'chevron_right' },
  close: { ios: 'xmark', android: 'close' },
  more: { ios: 'ellipsis', android: 'more_vert' },
  share: { ios: 'square.and.arrow.up', android: 'share' },
  restart: { ios: 'arrow.counterclockwise', android: 'refresh' },
  report: { ios: 'exclamationmark.bubble', android: 'flag' },
  search: { ios: 'magnifyingglass', android: 'search' },
  settings: { ios: 'gearshape', android: 'settings' },
  bell: { ios: 'bell', android: 'notifications' },
  info: { ios: 'info.circle', android: 'info' },
  mail: { ios: 'envelope', android: 'mail' },
  lock: { ios: 'lock', android: 'lock' },
  signOut: { ios: 'rectangle.portrait.and.arrow.right', android: 'logout' },
  trash: { ios: 'trash', android: 'delete' },
  appearance: { ios: 'circle.lefthalf.filled', android: 'dark_mode' },
  sound: { ios: 'speaker.wave.2', android: 'volume_up' },
  haptics: { ios: 'iphone.radiowaves.left.and.right', android: 'vibration' },
  clock: { ios: 'clock', android: 'schedule' },
  trophy: { ios: 'trophy.fill', android: 'emoji_events' },
  code: { ios: 'chevron.left.forwardslash.chevron.right', android: 'code' },
  play: { ios: 'play.fill', android: 'play_arrow' },
  offline: { ios: 'wifi.slash', android: 'wifi_off' },
  cloudDone: { ios: 'checkmark.icloud', android: 'cloud_done' },
  cloudOff: { ios: 'icloud.slash', android: 'cloud_off' },
  sync: { ios: 'arrow.triangle.2.circlepath', android: 'sync' },
  external: { ios: 'arrow.up.right.square', android: 'open_in_new' },
  doc: { ios: 'doc.text', android: 'description' },
  brand: { ios: 'paintpalette', android: 'palette' },
  person: { ios: 'person', android: 'person' },
  signIn: { ios: 'person.crop.circle.badge.plus', android: 'person_add' },
  edit: { ios: 'pencil', android: 'edit' },
  terminal: { ios: 'terminal', android: 'terminal' },
  timer: { ios: 'timer', android: 'timer' },
  sparkles: { ios: 'sparkles', android: 'auto_awesome' },
  chip: { ios: 'cpu', android: 'memory' },
  brain: { ios: 'brain', android: 'psychology' },
  layers: { ios: 'square.stack.3d.up', android: 'layers' },
  bolt: { ios: 'bolt', android: 'bolt' },
  update: { ios: 'arrow.down.app', android: 'system_update' },
} as const satisfies Record<string, { ios: SFSymbol; android: AndroidSymbol }>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = iconSize.md, color, accessibilityLabel }: { name: IconName; size?: number; color?: string; accessibilityLabel?: string }) {
  const { colors } = useTheme();
  const tint = color ?? colors.text;
  return (
    <SymbolView
      name={ICONS[name]}
      size={size}
      tintColor={tint}
      resizeMode="scaleAspectFit"
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      accessibilityLabel={accessibilityLabel}
      style={{ width: size, height: size }}
    />
  );
}
