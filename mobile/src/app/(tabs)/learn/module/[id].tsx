import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { LessonRow } from '~/components/learning';
import { completionOf, LEVELS, type CatalogLesson } from '~/lib/catalog';
import { useCatalog } from '~/state/catalog';
import { useProgress } from '~/state/progress';
import { space } from '~/theme';
import { EmptyState, ListSection, ProgressBar, Screen, Text } from '~/ui';

/** A module: its lessons in order, grouped by level where the lessons carry one. */
export default function ModuleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const index = useCatalog();
  const completed = useProgress((s) => s.progress.completed);
  const found = index.modules.get(id);
  if (!found) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <EmptyState icon="learn" title="This module isn't here any more" body="Go back to Learn to see every module." />
      </Screen>
    );
  }
  const { module } = found;
  const c = completionOf(module.lessons, completed);
  const groups: { level: string | null; lessons: CatalogLesson[] }[] = [];
  for (const l of module.lessons) {
    const level = l.level ?? null;
    const last = groups[groups.length - 1];
    if (last && last.level === level) last.lessons.push(l);
    else groups.push({ level, lessons: [l] });
  }
  const levelled = groups.some((g) => g.level && LEVELS.includes(g.level as never));
  return (
    <Screen>
      <Stack.Screen options={{ title: module.title }} />
      <View style={{ gap: space.sm }}>
        {module.blurb ? <Text variant="bodyLarge">{module.blurb}</Text> : null}
        <Text variant="label" tone="tertiary">{`${c.done} of ${c.total} lessons done`}</Text>
        <ProgressBar value={c.fraction} accessibilityLabel={`${Math.round(c.fraction * 100)}% of the module done`} />
      </View>
      {groups.map((g, gi) => (
        <ListSection key={`${g.level}-${gi}`} title={levelled ? (g.level ?? 'Lessons') : 'Lessons'}>
          {g.lessons.map((l, i) => (
            <LessonRow key={l.id} lesson={l} done={!!completed[l.id]} last={i === g.lessons.length - 1} />
          ))}
        </ListSection>
      ))}
    </Screen>
  );
}
