import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { LessonRef } from '~/lib/catalog';
import { maxWidth, space, useTheme } from '~/theme';
import { Button, Icon, ProgressRing, Text } from '~/ui';

/**
 * A finished lesson: drawn by the app, over the lesson. What was earned (XP), where the streak and today's goal
 * stand, and the one next thing to do. "Next lesson" opens the following lesson in place.
 */
export function Celebration({
  title,
  xp,
  streak,
  goal,
  minutesToday,
  next,
  onNext,
  onDone,
}: {
  title: string;
  xp: number;
  streak: number;
  goal: number;
  minutesToday: number;
  next: LessonRef | null;
  onNext: () => void;
  onDone: () => void;
}) {
  const { colors } = useTheme();
  const met = minutesToday >= goal;
  return (
    <SafeAreaView edges={['bottom']} style={[StyleSheet.absoluteFill, styles.wrap, { backgroundColor: colors.background }]} testID="celebration">
      <View style={styles.body}>
        <Animated.View entering={ZoomIn.springify().damping(14)} style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Icon name="check" size={56} color={colors.onPrimary} />
        </Animated.View>
        <Animated.View entering={FadeIn.delay(150)} style={styles.texts}>
          <Text variant="eyebrow" tone="brand" center>
            Lesson complete
          </Text>
          <Text variant="title" center accessibilityRole="header">
            {title}
          </Text>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(300)} style={styles.stats}>
          <View style={styles.stat} accessible accessibilityLabel={`${xp} XP earned`}>
            <Text variant="display" tone="brand">{`+${xp}`}</Text>
            <Text variant="label" tone="tertiary">
              XP earned
            </Text>
          </View>
          <View style={styles.stat} accessible accessibilityLabel={`Streak: ${streak} ${streak === 1 ? 'day' : 'days'}`}>
            <Text variant="display">{streak}</Text>
            <Text variant="label" tone="tertiary">
              Day streak
            </Text>
          </View>
          <View style={styles.stat}>
            <ProgressRing value={minutesToday / goal} size={52} stroke={5} accessibilityLabel={`Daily goal: ${minutesToday} of ${goal} minutes`}>
              {met ? <Icon name="check" size={22} color={colors.brand} /> : <Text variant="label">{minutesToday}</Text>}
            </ProgressRing>
            <Text variant="label" tone="tertiary">
              {met ? 'Goal done' : `of ${goal} min`}
            </Text>
          </View>
        </Animated.View>
      </View>
      <View style={styles.actions}>
        {next ? <Button variant="primary" icon="play" title="Next lesson" onPress={onNext} accessibilityHint={`Opens ${next.lesson.title}`} testID="next-lesson" /> : null}
        <Button variant={next ? 'plain' : 'primary'} title="Done" onPress={onDone} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  body: { flex: 1, width: '100%', maxWidth: maxWidth.reading, alignItems: 'center', justifyContent: 'center', gap: space.xxl, paddingHorizontal: space.xxl },
  badge: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center' },
  texts: { gap: space.sm, alignItems: 'center' },
  stats: { flexDirection: 'row', gap: space.xxl, alignItems: 'flex-end' },
  stat: { alignItems: 'center', gap: space.xs, minWidth: 72 },
  actions: { width: '100%', maxWidth: maxWidth.reading, paddingHorizontal: space.gutter, paddingBottom: space.lg, gap: space.xs },
});
