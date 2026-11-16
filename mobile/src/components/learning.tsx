import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { completionOf, levelOf, type CatalogLesson, type LessonRef } from '~/lib/catalog';
import { minutesLabel } from '~/lib/format';
import { currentStreak, dayKey, minutesByDay } from '~/lib/progress';
import { nextLesson } from '~/lib/recommend';
import { useCatalog } from '~/state/catalog';
import { useProgress } from '~/state/progress';
import { useSettings } from '~/state/settings';
import { iconSize, space, useTheme } from '~/theme';
import { Button, Card, Icon, ListRow, ProgressBar, ProgressRing, Text } from '~/ui';

export function openLesson(id: string) {
  router.push({ pathname: '/lesson/[id]', params: { id } });
}

/** The current time, refreshed each minute and when the app comes forward (so "today" turns over at midnight). */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setNow(new Date()));
    return () => {
      clearInterval(tick);
      sub.remove();
    };
  }, []);
  return now;
}

export function useNextLesson(): LessonRef | null {
  const index = useCatalog();
  const progress = useProgress((s) => s.progress);
  const interests = useSettings((s) => s.interests);
  const experience = useSettings((s) => s.experience);
  const startLessonId = useSettings((s) => s.startLessonId);
  return nextLesson(index, progress, { interests, experience, startLessonId });
}

/** Today's minutes against the daily goal, and the streak as it stands. */
export function useToday(now: Date) {
  const index = useCatalog();
  const progress = useProgress((s) => s.progress);
  const goal = useSettings((s) => s.dailyGoal);
  const minutes = minutesByDay(progress, index).get(dayKey(now)) ?? 0;
  return { minutes, goal, met: minutes >= goal, streak: currentStreak(progress, now) };
}

/** A lesson in a list: done or not (a mark that says so), its title, where it sits, how long. */
export function LessonRow({ lesson, detail, done, last, showLevel, refFor }: { lesson: CatalogLesson; detail?: string; done: boolean; last?: boolean; showLevel?: boolean; refFor?: LessonRef }) {
  const { colors } = useTheme();
  const level = showLevel && refFor ? levelOf(refFor) : undefined;
  const meta = [detail, level, minutesLabel(lesson.minutes)].filter(Boolean).join(' · ');
  return (
    <ListRow
      leading={<Icon name={done ? 'done' : 'todo'} size={iconSize.md} color={done ? colors.brand : colors.lineStrong} />}
      label={lesson.title}
      detail={meta}
      last={last}
      onPress={() => openLesson(lesson.id)}
      accessibilityLabel={`${lesson.title}. ${done ? 'Finished' : 'Not started'}. ${meta}`}
      accessibilityHint="Opens the lesson"
    />
  );
}

/**
 * The one thing Home is for: the next lesson, with the screen's only filled button. Shows where it sits and how
 * far along its module is.
 */
export function ContinueCard({ next }: { next: LessonRef }) {
  const completed = useProgress((s) => s.progress.completed);
  const module = completionOf(next.module.lessons, completed);
  const started = Object.keys(completed).length > 0;
  const where = next.track.kind === 'foundations' ? next.module.title : `${next.track.title} · ${next.module.title}`;
  return (
    <Card tint testID="continue-card">
      <Text variant="eyebrow" tone="brand">
        {started ? 'Continue' : 'Start here'}
      </Text>
      <View style={styles.gapXs}>
        <Text variant="title" numberOfLines={3}>
          {next.lesson.title}
        </Text>
        <Text variant="body" tone="secondary" numberOfLines={2}>
          {[where, minutesLabel(next.lesson.minutes)].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <View style={styles.gapXs}>
        <ProgressBar value={module.fraction} accessibilityLabel={`${module.done} of ${module.total} lessons in this module done`} />
        <Text variant="label" tone="tertiary">
          {module.done} of {module.total} lessons in this module
        </Text>
      </View>
      <Button variant="primary" icon="play" title={started ? 'Continue lesson' : 'Start lesson'} onPress={() => openLesson(next.lesson.id)} testID="continue-button" />
    </Card>
  );
}

/** The streak and the daily goal side by side: a ring that fills toward the goal, and the streak in days. */
export function TodayCard({ now }: { now: Date }) {
  const { colors } = useTheme();
  const { minutes, goal, met, streak } = useToday(now);
  const xp = useProgress((s) => s.progress.xp);
  return (
    <Card style={styles.today}>
      <ProgressRing value={minutes / goal} accessibilityLabel={`Daily goal: ${minutes} of ${goal} minutes${met ? ', done' : ''}`}>
        {met ? <Icon name="check" size={iconSize.lg} color={colors.brand} /> : <Text variant="number">{minutes}</Text>}
      </ProgressRing>
      <View style={styles.todayText}>
        <Text variant="heading">{met ? 'Daily goal done' : `${goal - minutes} min to your goal`}</Text>
        <View style={styles.stats}>
          <View style={styles.stat} accessible accessibilityLabel={`Streak: ${streak} ${streak === 1 ? 'day' : 'days'}`}>
            <Icon name="streak" size={iconSize.sm} color={streak > 0 ? colors.brand : colors.textTertiary} />
            <Text variant="label" tone="secondary">
              {streak} day streak
            </Text>
          </View>
          <View style={styles.stat} accessible accessibilityLabel={`${xp} XP`}>
            <Icon name="xp" size={iconSize.sm} color={colors.textTertiary} />
            <Text variant="label" tone="secondary">
              {xp.toLocaleString()} XP
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  gapXs: { gap: space.xs },
  today: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  todayText: { flex: 1, gap: space.sm },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
  stat: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
