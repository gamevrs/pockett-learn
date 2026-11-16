import type { Achievement } from '~/lib/progress';
import { iconSize, useTheme } from '~/theme';
import { Icon, ListRow } from '~/ui';

/** A milestone: a trophy once earned (and what you did), a lock and how far along until then. */
export function AchievementRow({ a, last }: { a: Achievement; last?: boolean }) {
  const { colors } = useTheme();
  const pct = Math.floor(a.progress * 100);
  return (
    <ListRow
      leading={<Icon name={a.earned ? 'trophy' : 'lock'} size={iconSize.md} color={a.earned ? colors.brand : colors.textTertiary} />}
      label={a.title}
      detail={a.earned ? a.earnedText : a.detail}
      value={a.earned ? 'Earned' : `${pct}%`}
      trailing="none"
      last={last}
      accessibilityLabel={`${a.title}. ${a.earned ? 'Earned.' : `${pct}% of the way. ${a.detail}.`}`}
    />
  );
}

/** What Progress shows: what you earned, then the few closest to being earned. */
export function featuredAchievements(all: Achievement[], next = 3): Achievement[] {
  const earned = all.filter((a) => a.earned);
  const open = all.filter((a) => !a.earned).sort((x, y) => y.progress - x.progress);
  return [...earned.slice(-3), ...open.slice(0, next)];
}
