import { router, Stack } from 'expo-router';
import { useState } from 'react';

import { displayNameOf, updateDisplayName, useSession } from '~/state/session';
import { Button, Notice, Screen, TextField } from '~/ui';

/** Your display name: the name Pockett greets you by, here and on the site. */
export default function Profile() {
  const user = useSession((s) => s.user);
  const [name, setName] = useState(() => displayNameOf(user));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Screen keyboard>
      <Stack.Screen options={{ title: 'Profile' }} />
      <TextField label="Display name" value={name} onChangeText={setName} autoFocus maxLength={60} autoCapitalize="words" textContentType="name" returnKeyType="done" error={error} />
      <Notice>{`Signed in as ${user?.email ?? ''}`}</Notice>
      <Button
        variant="primary"
        title="Save"
        busy={busy}
        disabled={!name.trim() || name.trim() === displayNameOf(user)}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            await updateDisplayName(name);
            router.back();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      />
    </Screen>
  );
}
