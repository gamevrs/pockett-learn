import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { GoalBars, Heatmap } from '~/components/charts';
import { useNow } from '~/components/learning';
import { GroupRow } from '~/components/rows';
import { useRootTitle } from '~/components/TabStack';
import { completionOf, pathLessons, pathsOf } from '~/lib/catalog';
import { plural } from '~/lib/format';
import { achievements, activeDays, currentStreak, dayKey, goalHistory, heatmap, levelFor } from '~/lib/progress';
import { useCatalog } from '~/state/catalog';
import { useProgress } from '~/state/progress';
import { useSettings } from '~/state/settings';
import { iconSize, space, useTheme } from '~/theme';
import { Card, Icon, ListRow, ListSection, ProgressBar, Screen, SectionHeader, Text } from '~/ui';

const WEEKS = 15;

/**
 * Progress: how it's going. Level and XP, the streak, which days you learned on, the daily goal this week,
 * lessons done per path, and the milestones you have reached (or how far each one is).
 */
export default function ProgressScreen() {
  const { colors } = useTheme();
  const now = useNow();
  const title = useRootTitle('Progress');
  const index = useCatalog();
  const progress = useProgress((s) => s.progress);
  const goal = useSettings((s) => s.dailyGoal);
  const level = levelFor(progress.xp);
  const streak = currentStreak(progress, now);
  const today = dayKey(now);
  const grid = heatmap(progress, now, WEEKS);
  const firstDay = grid[0].find((c) => c)?.day ?? today;
  const activeInGrid = [...activeDays(progress)].filter((d) => d >= firstDay && d <= today).length;
  const week = goalHistory(progress, index, goal, now, 7);
  const metDays = week.filter((d) => d.met).length;
  const paths = pathsOf(index.catalog)
    .map((p) => ({ p, c: completionOf(pathLessons(index, p), progress.completed) }))
    .filter(({ c }) => c.done > 0);
  const badges = achievements(progress, index);
  const earned = badges.filter((b) => b.earned).length;

  return (
    <>
      <Stack.Screen options={title} />
      <Screen testID="progress">
        <Card>
          <View style={styles.levelRow}>
            <View style={styles.flex}>
              <Text variant="eyebrow" tone="tertiary">{`Level ${level.level}`}</Text>
              <Text variant="display">{level.rank}</Text>
            </View>
            <View style={styles.right} accessible accessibilityLabel={`${progress.xp} XP in total`}>
              <Text variant="number">{progress.xp.toLocaleString()}</Text>
              <Text variant="label" tone="tertiary">
                XP
              </Text>
            </View>
          </View>
          <ProgressBar thick value={level.intoLevel / level.perLevel} accessibilityLabel={`${level.intoLevel} of ${level.perLevel} XP to level ${level.level + 1}`} />
          <Text variant="label" tone="tertiary">{`${level.perLevel - level.intoLevel} XP to level ${level.level + 1}`}</Text>
        </Card>

        <View style={styles.pair}>
          <Card style={styles.flex}>
            <Icon name="streak" size={iconSize.md} color={streak > 0 ? colors.brand : colors.textTertiary} />
            <View>
              <Text variant="number">{plural(streak, 'day')}</Text>
              <Text variant="label" tone="tertiary">
                Current streak
              </Text>
            </View>
          </Card>
          <Card style={styles.flex}>
            <Icon name="trophy" size={iconSize.md} color={colors.textTertiary} />
            <View>
              <Text variant="number">{plural(Math.max(progress.bestStreak, streak), 'day')}</Text>
              <Text variant="label" tone="tertiary">
                Best streak
              </Text>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Active days" detail={`${plural(activeInGrid, 'day')} with a lesson in the last ${WEEKS} weeks`} />
          <Card>
            <Heatmap grid={grid} today={today} label={`Calendar of the last ${WEEKS} weeks: ${plural(activeInGrid, 'day')} with a lesson finished.`} />
          </Card>
        </View>

        <View style={styles.section}>
          <SectionHeader title="Daily goal" detail={`${goal} minutes a day · met on ${metDays} of the last 7 days`} />
          <Card>
            <GoalBars days={week} goal={goal} label={`Minutes learned on each of the last 7 days against a goal of ${goal}: ${week.map((d) => d.minutes).join(', ')}.`} />
          </Card>
        </View>

        {paths.length ? (
          <ListSection title="Lessons finished">
            {paths.map(({ p, c }, i) => (
              <GroupRow key={p.id} title={p.title} completion={c} href={{ pathname: '/learn/path/[id]', params: { id: p.id } }} last={i === paths.length - 1} />
            ))}
          </ListSection>
        ) : null}

        <ListSection title="Achievements" aside={<Text variant="label" tone="tertiary">{`${earned} of ${badges.length}`}</Text>}>
          {badges.map((b, i) => (
            <ListRow
              key={b.id}
              leading={<Icon name={b.earned ? 'trophy' : 'lock'} size={iconSize.md} color={b.earned ? colors.brand : colors.textTertiary} />}
              label={b.title}
              detail={b.earned ? b.earnedText : b.detail}
              value={b.earned ? 'Earned' : `${Math.floor(b.progress * 100)}%`}
              trailing="none"
              last={i === badges.length - 1}
              accessibilityLabel={`${b.title}. ${b.earned ? 'Earned.' : `${Math.floor(b.progress * 100)}% of the way. ${b.detail}.`}`}
            />
          ))}
        </ListSection>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  levelRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  right: { alignItems: 'flex-end' },
  flex: { flex: 1 },
  pair: { flexDirection: 'row', gap: space.md },
  section: { gap: space.sm },
});
