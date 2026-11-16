import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { OnboardingPage } from '~/components/OnboardingPage';
import { pathsOf, type Path } from '~/lib/catalog';
import { useCatalog } from '~/state/catalog';
import { useSettings } from '~/state/settings';
import { iconSize, useTheme } from '~/theme';
import { Icon, ListRow, ListSection, type IconName } from '~/ui';

const PART_ICONS: Record<string, IconName> = { start: 'sparkles', hood: 'terminal', hardware: 'chip', electronics: 'bolt', semiconductors: 'chip', building: 'layers', systems: 'layers' };

/** What do you want to learn? Any of Foundations' parts, a language's courses, the AI path. */
export default function Interests() {
  const { colors } = useTheme();
  const index = useCatalog();
  const interests = useSettings((s) => s.interests);
  const set = useSettings((s) => s.set);
  const paths = pathsOf(index.catalog);
  const toggle = (id: string) => {
    Haptics.selectionAsync();
    set({ interests: interests.includes(id) ? interests.filter((x) => x !== id) : [...interests, id] });
  };
  const row = (p: Path, last: boolean) => {
    const on = interests.includes(p.id);
    const icon: IconName = p.kind === 'part' ? (PART_ICONS[p.id.slice(5)] ?? 'learn') : p.kind === 'ai' ? 'brain' : 'code';
    return (
      <ListRow
        key={p.id}
        icon={icon}
        label={p.title}
        detail={p.kind === 'part' ? undefined : p.blurb}
        accessory={<Icon name={on ? 'done' : 'todo'} size={iconSize.md} color={on ? colors.brand : colors.lineStrong} />}
        onPress={() => toggle(p.id)}
        accessibilityLabel={`${p.title}${on ? ', chosen' : ''}`}
        last={last}
      />
    );
  };
  const parts = paths.filter((p) => p.kind === 'part');
  const courses = paths.filter((p) => p.kind !== 'part');
  return (
    <OnboardingPage
      step={2}
      title="What do you want to learn?"
      body="Pick as many as you like. You can explore everything later in Learn."
      primary={{ title: interests.length ? 'Continue' : 'Continue without choosing', onPress: () => router.push('/onboarding/experience') }}
      testID="onboarding-interests">
      <ListSection title="How computers work">{parts.map((p, i) => row(p, i === parts.length - 1))}</ListSection>
      <ListSection title="Programming languages">{courses.map((p, i) => row(p, i === courses.length - 1))}</ListSection>
    </OnboardingPage>
  );
}
