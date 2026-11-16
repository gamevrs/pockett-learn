import { router, Stack } from 'expo-router';
import { Alert } from 'react-native';

import { choiceLabel } from '~/components/choices';
import { enableReminder } from '~/components/reminder-permission';
import { TimeRow } from '~/components/TimeRow';
import { APP_VERSION } from '~/lib/site';
import { useInbox } from '~/state/inbox';
import { useProgress } from '~/state/progress';
import { useSession } from '~/state/session';
import { useSettings } from '~/state/settings';
import { ListRow, ListSection, ListSwitchRow, Screen } from '~/ui';

/** Settings: how the app looks and feels, your daily goal and reminder, and the data on this phone. */
export default function Settings() {
  const s = useSettings();
  const sound = useProgress((p) => p.progress.audio.enabled);
  const signedIn = useSession((x) => !!x.user);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Settings' }} />
      <ListSection title="Look and feel" footer="Sounds play inside lessons, for answers and finished lessons.">
        <ListRow icon="appearance" label="Appearance" value={choiceLabel('appearance', s.appearance)} onPress={() => router.push({ pathname: '/account/choose/[key]', params: { key: 'appearance' } })} />
        <ListSwitchRow icon="sound" label="Sound effects" value={sound} onValueChange={(v) => useProgress.getState().setAudio(v)} />
        <ListSwitchRow icon="haptics" label="Haptics" detail="A tap you can feel on answers and finished lessons" value={s.haptics} onValueChange={(v) => s.set({ haptics: v })} last />
      </ListSection>

      <ListSection title="Learning">
        <ListRow icon="goal" label="Daily goal" value={choiceLabel('dailyGoal', s.dailyGoal)} onPress={() => router.push({ pathname: '/account/choose/[key]', params: { key: 'dailyGoal' } })} />
        <ListSwitchRow icon="bell" label="Daily reminder" value={s.dailyReminder} onValueChange={(v) => (v ? enableReminder('dailyReminder') : s.set({ dailyReminder: false }))} />
        <TimeRow value={s.reminderTime} onChange={(m) => s.set({ reminderTime: m })} disabled={!s.dailyReminder} last />
      </ListSection>

      <ListSection
        title="Data"
        footer={signedIn ? 'Clears this phone only. Your account keeps its progress and brings it back the next time it syncs.' : 'Removes your lessons, XP and streak from this phone. This cannot be undone.'}>
        <ListRow
          icon="trash"
          label="Clear progress on this phone"
          destructive
          trailing="none"
          onPress={() =>
            Alert.alert('Clear progress on this phone?', signedIn ? 'Your account keeps its copy.' : 'Your lessons, XP and streak will be gone for good.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Clear',
                style: 'destructive',
                onPress: () => {
                  useProgress.getState().clear();
                  useInbox.getState().clearMilestones();
                },
              },
            ])
          }
          last
        />
      </ListSection>

      <ListSection>
        <ListRow icon="info" label="Version" value={APP_VERSION} trailing="none" last />
      </ListSection>
    </Screen>
  );
}
