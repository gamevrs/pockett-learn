import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { LessonRow } from '~/components/learning';
import { GroupRow } from '~/components/rows';
import { useRootTitle } from '~/components/TabStack';
import { completionOf, languageName, LEVELS, moduleHasLevel, pathLessons, pathOfLesson, pathsOf, searchLessons, trackLessons, type Level } from '~/lib/catalog';
import { useCatalog } from '~/state/catalog';
import { useProgress } from '~/state/progress';
import { space, useTheme } from '~/theme';
import { ChipRow, EmptyState, ListRow, ListSection, Screen } from '~/ui';

type LevelFilter = 'all' | Level;

/**
 * Learn: everything there is. The paths (Foundations' parts, each language's courses, the AI path), each with how
 * far along it is; a level filter that lists what there is at one level; and search across every lesson from the
 * header.
 */
export default function Learn() {
  const { colors } = useTheme();
  const index = useCatalog();
  const completed = useProgress((s) => s.progress.completed);
  const [query, setQuery] = useState('');
  const [level, setLevel] = useState<LevelFilter>('all');
  const paths = pathsOf(index.catalog);
  const title = useRootTitle('Learn');

  const header = (
    <Stack.Screen
      options={{
        ...title,
        headerSearchBarOptions: {
          placeholder: 'Search lessons',
          onChangeText: (e) => setQuery(e.nativeEvent.text),
          onCancelButtonPress: () => setQuery(''),
          onClose: () => setQuery(''),
          autoCapitalize: 'none',
          hideWhenScrolling: false,
          tintColor: colors.brand,
          textColor: colors.text,
          hintTextColor: colors.textTertiary,
          headerIconColor: colors.text,
          barTintColor: Platform.OS === 'android' ? colors.surface : undefined,
        },
      }}
    />
  );

  if (query.trim()) {
    const hits = searchLessons(index, query, 60);
    return (
      <>
        {header}
        <Screen keyboard testID="learn-search">
          {hits.length ? (
            <ListSection title={`${hits.length === 60 ? '60+' : hits.length} ${hits.length === 1 ? 'lesson' : 'lessons'}`}>
              {hits.map((ref, i) => (
                <LessonRow key={ref.lesson.id} lesson={ref.lesson} detail={pathOfLesson(paths, ref)?.title ?? ref.track.title} done={!!completed[ref.lesson.id]} last={i === hits.length - 1} />
              ))}
            </ListSection>
          ) : (
            <EmptyState icon="search" title="No lessons found" body={`Nothing matches "${query.trim()}". Try a shorter word, like "loops" or "bits".`} />
          )}
        </Screen>
      </>
    );
  }

  const levelOptions = [{ value: 'all' as const, label: 'All levels' }, ...LEVELS.map((l) => ({ value: l, label: l }))];
  const filters = (
    <View style={styles.bleed}>
      <ChipRow label="Level" options={levelOptions} value={level} onChange={setLevel} />
    </View>
  );

  if (level !== 'all') {
    const foundations = index.catalog.tracks.find((t) => t.kind === 'foundations');
    const modules = foundations ? foundations.modules.filter((m) => moduleHasLevel(m, foundations, level)) : [];
    const courses = index.catalog.tracks.filter((t) => t.kind === 'course' && t.level === level);
    return (
      <>
        {header}
        <Screen testID="learn-level">
          {filters}
          {courses.length ? (
            <ListSection title={`${level} courses`}>
              {courses.map((t, i) => (
                <GroupRow key={t.id} title={t.title} detail={languageName(t.language)} completion={completionOf(trackLessons(t), completed)} href={{ pathname: '/learn/course/[id]', params: { id: t.id } }} last={i === courses.length - 1} />
              ))}
            </ListSection>
          ) : null}
          {modules.length ? (
            <ListSection title={`${level} in Foundations`}>
              {modules.map((m, i) => (
                <GroupRow key={m.id} title={m.title} completion={completionOf(m.lessons, completed)} href={{ pathname: '/learn/module/[id]', params: { id: m.id } }} last={i === modules.length - 1} />
              ))}
            </ListSection>
          ) : null}
          {!courses.length && !modules.length ? <EmptyState icon="learn" title={`No ${level.toLowerCase()} lessons yet`} body="Try another level." /> : null}
        </Screen>
      </>
    );
  }

  const parts = paths.filter((p) => p.kind === 'part');
  const courses = paths.filter((p) => p.kind !== 'part');
  return (
    <>
      {header}
      <Screen testID="learn">
        {filters}
        <ListSection title="Foundations" footer="How code really works, from a single bit to the systems behind the apps you use.">
          {parts.map((p, i) => (
            <GroupRow key={p.id} title={p.title} completion={completionOf(pathLessons(index, p), completed)} href={{ pathname: '/learn/path/[id]', params: { id: p.id } }} last={i === parts.length - 1} />
          ))}
        </ListSection>
        <ListSection title="Courses" footer="Build real projects in a language, from beginner to professional.">
          {courses.map((p, i) => (
            <GroupRow key={p.id} title={p.title} detail={p.blurb.split(',')[0]} completion={completionOf(pathLessons(index, p), completed)} href={{ pathname: '/learn/path/[id]', params: { id: p.id } }} last={i === courses.length - 1} />
          ))}
        </ListSection>
        <ListSection>
          <ListRow icon="terminal" label="Playground" detail="Write and run code without a lesson" onPress={() => router.push('/playground')} last />
        </ListSection>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  // The chips scroll edge to edge; their first one still lines up with the page margin.
  bleed: { marginHorizontal: -space.gutter, marginBottom: -space.sm },
});
