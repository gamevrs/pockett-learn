import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { sendPasswordReset } from '~/state/session';
import { Button, Notice, Screen, Text, TextField } from '~/ui';

/** A password reset link by email. The link finishes on pockett.ai; then sign in here with the new password. */
export default function ForgotPassword() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (sent) {
    return (
      <Screen>
        <Text variant="title">Check your email</Text>
        <Text variant="bodyLarge" tone="secondary">{`If there's an account for ${email.trim()}, a link to choose a new password is on its way. Then sign in here with it.`}</Text>
      </Screen>
    );
  }
  return (
    <Screen keyboard>
      <Text variant="body" tone="secondary">
        Enter your account&apos;s email and we&apos;ll send you a link to choose a new password.
      </Text>
      <TextField label="Email" value={email} onChangeText={setEmail} autoFocus keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" autoComplete="email" returnKeyType="send" />
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button
        variant="primary"
        title="Send link"
        busy={busy}
        disabled={!/\S+@\S+\.\S+/.test(email)}
        onPress={async () => {
          setBusy(true);
          setError(null);
          try {
            await sendPasswordReset(email);
            setSent(true);
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
