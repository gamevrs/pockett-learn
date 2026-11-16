import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';

import { CHOICES } from '~/components/choices';
import { OnboardingPage } from '~/components/OnboardingPage';
import { enableReminder } from '~/components/reminder-permission';
import { TimeRow } from '~/components/TimeRow';
import { useSettings } from '~/state/settings';
import { iconSize, useTheme } from '~/theme';
import { Icon, ListRow, ListSection, ListSwitchRow } from '~/ui';

/**
 * A daily goal, and a reminder to meet it. Turning the reminder on is where notification permission is asked, so
 * the question comes with its reason.
 */
export default function GoalStep() {
  const { colors } = useTheme();
  const s = useSettings();
  return (
    <OnboardingPage
      step={4}
      title="Set a daily goal"
      body="A little every day beats a lot once in a while. Most lessons take 5 to 10 minutes."
      primary={{ title: 'Continue', onPress: () => router.push('/onboarding/account') }}
      testID="onboarding-goal">
      <ListSection>
        {CHOICES.dailyGoal.options.map((o, i) => (
          <ListRow
            key={o.value}
            label={o.label}
            detail={o.detail}
            accessory={<Icon name={s.dailyGoal === o.value ? 'done' : 'todo'} size={iconSize.md} color={s.dailyGoal === o.value ? colors.brand : colors.lineStrong} />}
            onPress={() => {
              Haptics.selectionAsync();
              s.set({ dailyGoal: o.value });
            }}
            accessibilityLabel={`${o.label} a day${s.dailyGoal === o.value ? ', chosen' : ''}`}
            last={i === CHOICES.dailyGoal.options.length - 1}
          />
        ))}
      </ListSection>
      <ListSection title="Reminder" footer="We'll only remind you on days you haven't done a lesson yet.">
        <ListSwitchRow
          icon="bell"
          label="Remind me every day"
          value={s.dailyReminder}
          onValueChange={async (v) => {
            if (!v) return s.set({ dailyReminder: false });
            if (await enableReminder('dailyReminder')) s.set({ streakReminder: true });
          }}
        />
        <TimeRow value={s.reminderTime} onChange={(m) => s.set({ reminderTime: m })} disabled={!s.dailyReminder} last />
      </ListSection>
    </OnboardingPage>
  );
}
