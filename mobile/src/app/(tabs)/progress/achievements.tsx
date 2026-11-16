import { Stack } from 'expo-router';

import { AchievementRow } from '~/components/AchievementRow';
import { achievements } from '~/lib/progress';
import { useCatalog } from '~/state/catalog';
import { useProgress } from '~/state/progress';
import { ListSection, Screen } from '~/ui';

/** Every milestone: what you have earned, and how far you are from the rest. */
export default function Achievements() {
  const index = useCatalog();
  const progress = useProgress((s) => s.progress);
  const all = achievements(progress, index);
  const earned = all.filter((a) => a.earned);
  const open = all.filter((a) => !a.earned);
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Achievements' }} />
      {earned.length ? (
        <ListSection title="Earned">
          {earned.map((a, i) => (
            <AchievementRow key={a.id} a={a} last={i === earned.length - 1} />
          ))}
        </ListSection>
      ) : null}
      {open.length ? (
        <ListSection title="Still to earn">
          {open.map((a, i) => (
            <AchievementRow key={a.id} a={a} last={i === open.length - 1} />
          ))}
        </ListSection>
      ) : null}
    </Screen>
  );
}
