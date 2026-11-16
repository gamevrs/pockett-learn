import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { OnboardingPage } from '~/components/OnboardingPage';
import { pathsOf } from '~/lib/catalog';
import { defaultPath, startingLesson, type Experience } from '~/lib/recommend';
import { useCatalog } from '~/state/catalog';
import { useSettings } from '~/state/settings';
import { iconSize, useTheme } from '~/theme';
import { Icon, ListRow, ListSection, Notice } from '~/ui';

const LEVELS: { value: Experience; label: string; detail: string }[] = [
  { value: 'new', label: "I'm new to coding", detail: 'Start from the very beginning' },
  { value: 'some', label: "I've written some code", detail: 'Skip the first basics' },
  { value: 'experienced', label: 'I code regularly', detail: 'Start with the deeper material' },
];

/** How much have you coded? Sets where you start: the recommended first lesson on your first chosen path. */
export default function ExperienceStep() {
  const { colors } = useTheme();
  const index = useCatalog();
  const experience = useSettings((s) => s.experience);
  const interests = useSettings((s) => s.interests);
  const set = useSettings((s) => s.set);
  const paths = pathsOf(index.catalog);
  const path = paths.find((p) => p.id === interests[0]) ?? defaultPath(paths);
  const start = experience && path ? startingLesson(index, path, experience) : null;

  // A path chosen (or changed) after the experience: the starting lesson follows it.
  useEffect(() => {
    if (experience && start && start.lesson.id !== useSettings.getState().startLessonId) set({ startLessonId: start.lesson.id });
  }, [experience, start, set]);

  const choose = (value: Experience) => {
    Haptics.selectionAsync();
    const lesson = path ? startingLesson(index, path, value) : null;
    set({ experience: value, startLessonId: lesson?.lesson.id ?? null });
  };

  return (
    <OnboardingPage
      step={3}
      title="How much have you coded?"
      body="So your first lesson is neither too easy nor too hard."
      primary={{ title: 'Continue', onPress: () => router.push('/onboarding/goal'), disabled: !experience }}
      testID="onboarding-experience">
      <ListSection>
        {LEVELS.map((l, i) => (
          <ListRow
            key={l.value}
            label={l.label}
            detail={l.detail}
            accessory={<Icon name={experience === l.value ? 'done' : 'todo'} size={iconSize.md} color={experience === l.value ? colors.brand : colors.lineStrong} />}
            onPress={() => choose(l.value)}
            testID={`experience-${l.value}`}
            accessibilityLabel={`${l.label}${experience === l.value ? ', chosen' : ''}`}
            last={i === LEVELS.length - 1}
          />
        ))}
      </ListSection>
      {start && path ? <Notice icon="play">{`Your first lesson: "${start.lesson.title}" in ${path.title}.`}</Notice> : null}
    </OnboardingPage>
  );
}
