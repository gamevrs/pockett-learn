import { router, Stack } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';

import { useNow } from '~/components/learning';
import { useRootTitle } from '~/components/TabStack';
import { relativeDay } from '~/lib/format';
import { useUnreadCount } from '~/state/inbox';
import { useProgress } from '~/state/progress';
import { displayNameOf, signOut, useSession } from '~/state/session';
import { space } from '~/theme';
import { Button, Card, ListRow, ListSection, Screen, Text } from '~/ui';

/** Account: who you are here, whether your progress is saved to an account, and the app's settings. */
export default function Account() {
  const title = useRootTitle('Account');
  const now = useNow();
  const user = useSession((s) => s.user);
  const status = useSession((s) => s.status);
  const sync = useProgress((s) => s.sync);
  const syncedAt = useProgress((s) => s.syncedAt);
  const unread = useUnreadCount();

  const syncLine =
    sync === 'syncing'
      ? 'Syncing now'
      : sync === 'error'
        ? "Couldn't sync. Pull down on Home to try again."
        : syncedAt
          ? `Synced ${relativeDay(syncedAt, now).toLowerCase()}`
          : 'Synced with your account';

  return (
    <>
      <Stack.Screen options={title} />
      <Screen testID="account">
        {user ? (
          <ListSection title="Your account">
            <ListRow icon="person" label={displayNameOf(user)} detail={user.email ?? undefined} onPress={() => router.push('/account/profile')} accessibilityHint="Change your display name" />
            <ListRow
              icon={sync === 'error' ? 'cloudOff' : 'cloudDone'}
              label="Progress sync"
              detail={syncLine}
              trailing="none"
              busy={sync === 'syncing'}
              onPress={() => useProgress.getState().pull()}
              accessibilityHint="Syncs your progress now"
              last
            />
          </ListSection>
        ) : status === 'loading' ? null : (
          <Card>
            <Text variant="heading">Keep your progress safe</Text>
            <Text variant="body" tone="secondary">
              Your progress is saved on this phone. With a free account it is saved to your account too, so it follows you to pockett.ai and any other device.
            </Text>
            <View style={styles.actions}>
              <Button variant="primary" title="Create account" onPress={() => router.push('/auth/sign-up')} testID="create-account" />
              <Button variant="plain" title="I have an account" onPress={() => router.push('/auth/sign-in')} />
            </View>
          </Card>
        )}

        <ListSection title="App">
          <ListRow icon="settings" label="Settings" detail="Appearance, daily goal, haptics, data" onPress={() => router.push('/account/settings')} />
          <ListRow icon="bell" label="Notifications" detail="Reminders and news" value={unread ? `${unread} new` : null} onPress={() => router.push('/account/notifications')} last />
        </ListSection>

        <ListSection title="About">
          <ListRow icon="info" label="About Pockett" detail="Privacy, terms, brand, version" onPress={() => router.push('/account/about')} last />
        </ListSection>

        {user ? (
          <ListSection>
            <ListRow
              icon="signOut"
              label="Sign out"
              trailing="none"
              onPress={() =>
                Alert.alert('Sign out?', 'Your progress stays on this phone and in your account.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign out', style: 'destructive', onPress: () => signOut().catch((e: Error) => Alert.alert("Couldn't sign out", e.message)) },
                ])
              }
            />
            <ListRow icon="trash" label="Delete account" destructive trailing="none" onPress={() => router.push('/account/delete')} accessibilityHint="Asks for your password, then deletes your account and its progress" last />
          </ListSection>
        ) : null}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  actions: { gap: space.xs },
});
