import { Stack, useLocalSearchParams } from 'expo-router';

import { GroupRow } from '~/components/rows';
import { completionOf, languageName, LEVELS, pathsOf, trackLessons, type CatalogTrack } from '~/lib/catalog';
import { useCatalog } from '~/state/catalog';
import { useProgress } from '~/state/progress';
import { EmptyState, ListSection, Screen, Text } from '~/ui';

/** A path: a Foundations part's modules, or a language's (or the AI path's) courses by level. */
export default function PathScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const index = useCatalog();
  const completed = useProgress((s) => s.progress.completed);
  const path = pathsOf(index.catalog).find((p) => p.id === id);
  if (!path) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        <EmptyState icon="learn" title="This path isn't here any more" body="Go back to Learn to see every path." />
      </Screen>
    );
  }

  if (path.kind === 'part') {
    const modules = path.moduleIds.map((m) => index.modules.get(m)?.module).filter((m) => !!m);
    return (
      <Screen>
        <Stack.Screen options={{ title: path.title }} />
        {path.blurb ? (
          <Text variant="body" tone="secondary">
            {path.blurb}
          </Text>
        ) : null}
        <ListSection title={`${modules.length} ${modules.length === 1 ? 'module' : 'modules'}`}>
          {modules.map((m, i) => (
            <GroupRow key={m.id} title={m.title} completion={completionOf(m.lessons, completed)} href={{ pathname: '/learn/module/[id]', params: { id: m.id } }} last={i === modules.length - 1} />
          ))}
        </ListSection>
      </Screen>
    );
  }

  const tracks = path.trackIds.map((t) => index.catalog.tracks.find((x) => x.id === t)).filter((t): t is CatalogTrack => !!t);
  const byLevel = LEVELS.map((level) => ({ level, tracks: tracks.filter((t) => (t.level ?? 'Beginner') === level) })).filter((g) => g.tracks.length);
  return (
    <Screen>
      <Stack.Screen options={{ title: path.title }} />
      {byLevel.map((g) => (
        <ListSection key={g.level} title={g.level}>
          {g.tracks.map((t, i) => (
            <GroupRow key={t.id} title={t.title} detail={path.kind === 'ai' ? languageName(t.language) : undefined} completion={completionOf(trackLessons(t), completed)} href={{ pathname: '/learn/course/[id]', params: { id: t.id } }} last={i === g.tracks.length - 1} />
          ))}
        </ListSection>
      ))}
    </Screen>
  );
}
