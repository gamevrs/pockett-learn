import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { radius, useTheme } from '~/theme';

/**
 * A ring that fills toward a goal (the daily goal). Its centre holds what it measures, so the ring is never a
 * colour without words.
 */
export function ProgressRing({ value, size = 88, stroke = 8, children, accessibilityLabel }: { value: number; size?: number; stroke?: number; children?: ReactNode; accessibilityLabel: string }) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel} accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }} style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.tonal} strokeWidth={stroke} fill="none" />
        {v > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={colors.brand}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${c * v} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

/** A thin bar for a fraction done (a module's lessons, a lesson's steps). */
export function ProgressBar({ value, accessibilityLabel, thick }: { value: number; accessibilityLabel?: string; thick?: boolean }) {
  const { colors } = useTheme();
  const v = Math.max(0, Math.min(1, value));
  return (
    <View
      accessible={!!accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      style={[styles.track, thick && styles.thick, { backgroundColor: colors.tonal }]}>
      <View style={[styles.fill, { width: `${v * 100}%`, backgroundColor: colors.brand }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  track: { height: 4, borderRadius: radius.pill, overflow: 'hidden', alignSelf: 'stretch' },
  thick: { height: 6 },
  fill: { height: '100%', borderRadius: radius.pill },
});
