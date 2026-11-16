import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking } from 'react-native';

import { SUPPORT_EMAIL } from '~/lib/site';
import { DeleteUnavailable, deleteAccount, useSession } from '~/state/session';
import { Button, Notice, Screen, Text, TextField } from '~/ui';

/**
 * Delete account (App Store 5.1.1(v), Play's account deletion): your password, then the account and everything in
 * it is gone. Progress on this phone stays unless you clear it in Settings.
 */
export default function DeleteAccount() {
  const email = useSession((s) => s.user?.email);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const mail = () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Delete my Pockett account')}&body=${encodeURIComponent(`Please delete the Pockett account for ${email ?? ''}.`)}`);

  return (
    <Screen keyboard>
      <Stack.Screen options={{ title: 'Delete account' }} />
      <Text variant="bodyLarge">
        This deletes your Pockett account and everything saved in it: your lessons, code, XP and streak. You can&apos;t undo it.
      </Text>
      <Text variant="body" tone="secondary">
        Progress saved on this phone stays here until you clear it in Settings.
      </Text>
      {unavailable ? (
        <>
          <Notice icon="info">Deleting an account from the app isn&apos;t available yet. Email us and we&apos;ll delete it for you.</Notice>
          <Button variant="primary" icon="mail" title="Email us to delete it" onPress={mail} />
        </>
      ) : (
        <>
          <TextField
            label="Your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoFocus
            textContentType="password"
            autoComplete="current-password"
            error={error}
            returnKeyType="done"
          />
          <Button
            variant="danger"
            title="Delete my account"
            busy={busy}
            disabled={!password}
            onPress={() =>
              Alert.alert('Delete your account?', 'Your account and its progress will be gone for good.', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    setBusy(true);
                    setError(null);
                    try {
                      await deleteAccount(password);
                      router.dismissTo('/account');
                      Alert.alert('Account deleted', 'Your Pockett account is gone. You can keep learning on this phone as a guest.');
                    } catch (e) {
                      if (e instanceof DeleteUnavailable) setUnavailable(true);
                      else setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  },
                },
              ])
            }
          />
        </>
      )}
    </Screen>
  );
}
