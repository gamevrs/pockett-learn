import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { LessonRow } from '~/components/learning';
import { completionOf, languageName, trackLessons } from '~/lib/catalog';
import { useCatalog } from '~/state/catalog';
import { useProgress } from '~/state/progress';
import { space } from '~/theme';
import { EmptyState, ListSection, ProgressBar, Screen, Text } from '~/ui';

/** A course: what it builds, how far along it is, and its modules with their lessons. */
export default function CourseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const index = useCatalog();
  const completed = useProgress((s) => s.progress.completed);
  const track = index.catalog.tracks.find((t) => t.id === id);
  if (!track) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <EmptyState icon="learn" title="This course isn't here any more" body="Go back to Learn to see every course." />
      </Screen>
    );
  }
  const all = completionOf(trackLessons(track), completed);
  return (
    <Screen>
      <Stack.Screen options={{ title: track.title }} />
      <View style={{ gap: space.sm }}>
        {track.blurb ? <Text variant="bodyLarge">{track.blurb}</Text> : null}
        <Text variant="label" tone="tertiary">
          {[languageName(track.language), track.level, `${all.done} of ${all.total} lessons done`].filter(Boolean).join(' · ')}
        </Text>
        <ProgressBar value={all.fraction} accessibilityLabel={`${Math.round(all.fraction * 100)}% of the course done`} />
      </View>
      {track.modules.map((m) => {
        const c = completionOf(m.lessons, completed);
        return (
          <ListSection key={m.id} title={m.title} aside={<Text variant="label" tone="tertiary">{`${c.done}/${c.total}`}</Text>}>
            {m.lessons.map((l, i) => (
              <LessonRow key={l.id} lesson={l} done={!!completed[l.id]} last={i === m.lessons.length - 1} />
            ))}
          </ListSection>
        );
      })}
    </Screen>
  );
}
