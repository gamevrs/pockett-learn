import type { Href } from 'expo-router';
import { router } from 'expo-router';

import type { Completion } from '~/lib/catalog';
import { iconSize, useTheme } from '~/theme';
import { Icon, ListRow, ProgressRing } from '~/ui';

/**
 * A row for a group of lessons (a path, a course, a module): a small ring that fills as its lessons are done (a
 * check once all are), the title, a line under it, and the percentage, so the ring is never colour alone.
 */
export function GroupRow({ title, detail, completion, href, last }: { title: string; detail?: string; completion: Completion; href: Href; last?: boolean }) {
  const { colors } = useTheme();
  const pct = Math.round(completion.fraction * 100);
  const all = completion.total > 0 && completion.done === completion.total;
  const lessons = `${completion.done} of ${completion.total} lessons`;
  return (
    <ListRow
      leading={
        all ? (
          <Icon name="done" size={iconSize.lg} color={colors.brand} />
        ) : (
          <ProgressRing value={completion.fraction} size={iconSize.lg} stroke={3} accessibilityLabel={`${pct}% done`} />
        )
      }
      label={title}
      detail={detail ? `${detail} · ${lessons}` : lessons}
      value={`${pct}%`}
      last={last}
      onPress={() => router.push(href)}
      accessibilityLabel={`${title}. ${detail ? `${detail}. ` : ''}${lessons} done, ${pct}%`}
    />
  );
}
