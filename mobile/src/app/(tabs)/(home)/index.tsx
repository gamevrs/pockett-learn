import { router, Stack } from 'expo-router';

import { ContinueCard, LessonRow, TodayCard, useNextLesson, useNow } from '~/components/learning';
import { useRootTitle } from '~/components/TabStack';
import { pathOfLesson, pathsOf } from '~/lib/catalog';
import { greeting, relativeDay } from '~/lib/format';
import { recentCompletions } from '~/lib/progress';
import { recommendations } from '~/lib/recommend';
import { useCatalog, useCatalogStore } from '~/state/catalog';
import { useProgress } from '~/state/progress';
import { displayNameOf, useSession } from '~/state/session';
import { useSettings } from '~/state/settings';
import { EmptyState, ListRow, ListSection, Screen } from '~/ui';

/**
 * Home: what to do now. A greeting, today's goal and streak, the next lesson (the screen's one primary action),
 * a few next steps, and what you finished lately.
 */
export default function Home() {
  const now = useNow();
  const user = useSession((s) => s.user);
  const first = displayNameOf(user).split(' ')[0];
  const title = useRootTitle(user ? `${greeting(now)}, ${first}` : greeting(now));
  const index = useCatalog();
  const progress = useProgress((s) => s.progress);
  const prefs = { interests: useSettings((s) => s.interests), experience: useSettings((s) => s.experience), startLessonId: useSettings((s) => s.startLessonId) };
  const next = useNextLesson();
  const recs = recommendations(index, progress, prefs, next?.lesson.id ?? null, 3);
  const recent = recentCompletions(progress, 3);
  const paths = pathsOf(index.catalog);
  const refreshing = useCatalogStore((s) => s.status === 'loading');

  return (
    <>
      <Stack.Screen options={title} />
      <Screen
        testID="home"
        refreshing={refreshing}
        onRefresh={() => {
          useCatalogStore.getState().refresh();
          useProgress.getState().pull();
        }}>
        <TodayCard now={now} />
        {next ? (
          <ContinueCard next={next} />
        ) : (
          <EmptyState icon="trophy" title="You've finished everything" body="Every lesson in Pockett is done. New lessons appear here as they're added." />
        )}
        {recs.length ? (
          <ListSection title="Next steps">
            {recs.map(({ ref, path }, i) => (
              <LessonRow key={ref.lesson.id} lesson={ref.lesson} detail={path.title} done={false} last={i === recs.length - 1} />
            ))}
          </ListSection>
        ) : null}
        {recent.length ? (
          <ListSection title="Recently finished">
            {recent.map((r, i) => {
              const ref = index.byId.get(r.id);
              if (!ref) return null;
              const path = pathOfLesson(paths, ref);
              return <LessonRow key={r.id} lesson={ref.lesson} detail={[relativeDay(r.at, now), path?.title].filter(Boolean).join(' · ')} done last={i === recent.length - 1} />;
            })}
          </ListSection>
        ) : null}
        <ListSection title="Practice">
          <ListRow icon="terminal" label="Playground" detail="Write and run code without a lesson" onPress={() => router.push('/playground')} accessibilityHint="Opens the code playground" last />
        </ListSection>
      </Screen>
    </>
  );
}
