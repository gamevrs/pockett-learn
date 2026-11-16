import { Stack, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback } from 'react';
import { Linking } from 'react-native';

import { useNow } from '~/components/learning';
import { enableReminder } from '~/components/reminder-permission';
import { TimeRow } from '~/components/TimeRow';
import { relativeDay } from '~/lib/format';
import { openSitePath } from '~/components/open-site-path';
import { inboxItems, useInbox } from '~/state/inbox';
import { askPermission, usePermission } from '~/state/notifications';
import { useSettings } from '~/state/settings';
import { useTheme } from '~/theme';
import { EmptyState, ListRow, ListSection, ListSwitchRow, Screen } from '~/ui';

/** An announcement's link: a lesson opens in the app, Learn and Home go to their tab, anything else in the in-app browser. */
function openLink(url: string) {
  if (url.startsWith('/')) openSitePath(url, { fromModal: false });
  else WebBrowser.openBrowserAsync(url);
}

/**
 * Notifications: whether the phone lets Pockett send them, the two reminders, and the inbox (news from Pockett and
 * milestones you reached). Items you haven't seen say "New" until you leave the page.
 */
export default function Notifications() {
  const { colors } = useTheme();
  const now = useNow();
  const [permission, refresh] = usePermission();
  const s = useSettings();
  const config = useInbox((x) => x.config);
  const milestones = useInbox((x) => x.milestones);
  const read = useInbox((x) => x.read);
  const items = inboxItems({ config, milestones });
  const unread = new Set(items.filter((i) => !read.includes(i.id)).map((i) => i.id));

  useFocusEffect(
    useCallback(() => {
      return () => useInbox.getState().markAllRead();
    }, []),
  );

  const permissionRow =
    permission === 'granted' ? (
      <ListRow icon="bell" label="Notifications" value="Allowed" trailing="none" last />
    ) : permission === 'denied' ? (
      <ListRow icon="bell" label="Notifications are off" detail="Allow them in your phone's Settings to get reminders" value="Settings" onPress={() => Linking.openSettings()} last />
    ) : (
      <ListRow icon="bell" label="Allow notifications" detail="Needed for reminders. Pockett never sends ads." onPress={() => askPermission().then(refresh)} last />
    );

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Notifications' }} />
      <ListSection>{permissionRow}</ListSection>

      <ListSection title="Reminders" footer="Reminders skip any day you have already finished a lesson.">
        <ListSwitchRow icon="bell" label="Daily reminder" detail="A nudge to do your daily lesson" value={s.dailyReminder} onValueChange={(v) => (v ? enableReminder('dailyReminder').then(refresh) : s.set({ dailyReminder: false }))} />
        <TimeRow value={s.reminderTime} onChange={(m) => s.set({ reminderTime: m })} disabled={!s.dailyReminder} />
        <ListSwitchRow icon="streak" label="Streak reminder" detail="At 8 pm on a day your streak would end" value={s.streakReminder} onValueChange={(v) => (v ? enableReminder('streakReminder').then(refresh) : s.set({ streakReminder: false }))} last />
      </ListSection>

      {items.length ? (
        <ListSection title="Inbox">
          {items.map((item, i) => (
            <ListRow
              key={item.id}
              icon={item.kind === 'milestone' ? 'trophy' : 'sparkles'}
              iconColor={item.kind === 'milestone' ? colors.brand : undefined}
              label={item.title}
              detail={`${item.body} · ${relativeDay(item.date, now)}`}
              numberOfLines={3}
              value={unread.has(item.id) ? 'New' : null}
              trailing={item.url ? (item.url.startsWith('/') ? 'chevron' : 'external') : 'none'}
              onPress={item.url ? () => openLink(item.url!) : undefined}
              last={i === items.length - 1}
            />
          ))}
        </ListSection>
      ) : (
        <EmptyState icon="bell" title="Nothing here yet" body="News from Pockett and the milestones you reach will show up here." />
      )}
    </Screen>
  );
}
