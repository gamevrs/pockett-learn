import { StyleSheet, View } from 'react-native';

import { hairline, radius, space, useTheme } from '~/theme';
import { Text } from '~/ui';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * Active days as a grid of weeks (columns, oldest first) by weekday (rows, Monday first), like a contributions
 * calendar. A filled square is a day with a lesson finished; today has a ring. The whole grid reads out as one
 * sentence for screen readers.
 */
export function Heatmap({ grid, today, label }: { grid: ({ day: string; active: boolean } | null)[][]; today: string; label: string }) {
  const { colors } = useTheme();
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.heat}>
      <View style={styles.dayCol}>
        {DAY_LETTERS.map((d, i) => (
          <Text key={i} variant="micro" tone="tertiary" style={styles.dayLetter}>
            {i % 2 === 0 ? d : ' '}
          </Text>
        ))}
      </View>
      {grid.map((week, w) => (
        <View key={w} style={styles.week}>
          {week.map((cell, d) => (
            <View
              key={d}
              style={[
                styles.cell,
                cell ? { backgroundColor: cell.active ? colors.brand : colors.tonal } : null,
                cell?.day === today ? { borderWidth: hairline * 1.5, borderColor: colors.text } : null,
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * The last days' minutes against the daily goal: one bar per day, filled in the accent where the goal was met,
 * with the goal as a line across. Each bar is labelled with its weekday; the chart reads out as one sentence.
 */
export function GoalBars({ days, goal, label }: { days: { day: string; minutes: number; met: boolean }[]; goal: number; label: string }) {
  const { colors } = useTheme();
  const top = Math.max(goal * 1.5, ...days.map((d) => d.minutes), 1);
  const H = 96;
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={styles.bars}>
      <View style={[styles.goalLine, { bottom: (goal / top) * H + 20, borderColor: colors.lineStrong }]} />
      {days.map((d) => {
        const [y, m, dd] = d.day.split('-').map(Number);
        const letter = DAY_LETTERS[(new Date(y, m - 1, dd).getDay() + 6) % 7];
        return (
          <View key={d.day} style={styles.barCol}>
            <View style={[styles.barTrack, { height: H }]}>
              <View style={[styles.bar, { height: Math.max(d.minutes ? 4 : 0, (d.minutes / top) * H), backgroundColor: d.met ? colors.brand : colors.textTertiary }]} />
            </View>
            <Text variant="micro" tone={d.day === days[days.length - 1].day ? 'primary' : 'tertiary'}>
              {letter}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const CELL = 14;
const styles = StyleSheet.create({
  heat: { flexDirection: 'row', gap: 3, alignSelf: 'center' },
  dayCol: { gap: 3, marginRight: space.xs },
  dayLetter: { height: CELL, lineHeight: CELL, textAlign: 'center' },
  week: { gap: 3 },
  cell: { width: CELL, height: CELL, borderRadius: 3 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: space.sm },
  goalLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: hairline, borderStyle: 'dashed' },
  barCol: { alignItems: 'center', gap: space.xs, flex: 1 },
  barTrack: { justifyContent: 'flex-end', width: 18 },
  bar: { width: 18, borderRadius: radius.pill },
});
