import { router } from 'expo-router';
import { useRef, useState } from 'react';


import { signIn, signUp } from '~/state/session';
import { useSettings } from '~/state/settings';
import { Button, Notice, Screen, Text, TextField } from '~/ui';
import type { TextFieldRef } from '~/ui/TextField';

/** Leaves the sign-in sheet; from onboarding, signing in also finishes it. */
function done() {
  if (!useSettings.getState().onboarded) useSettings.getState().set({ onboarded: true });
  if (router.canDismiss()) router.dismissAll();
  else router.back();
}

/** The sign-in and create-account forms: email and password (and a name for a new account), as on the site. */
export function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const emailRef = useRef<TextFieldRef>(null);
  const passwordRef = useRef<TextFieldRef>(null);
  const signingUp = mode === 'sign-up';
  const valid = /\S+@\S+\.\S+/.test(email) && password.length >= (signingUp ? 8 : 1);

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (signingUp) {
        const { needsConfirmation } = await signUp(email, password, name);
        if (needsConfirmation) {
          setConfirm(true);
          return;
        }
      } else {
        await signIn(email, password);
      }
      done();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (confirm) {
    return (
      <Screen>
        <Text variant="title">Check your email</Text>
        <Text variant="bodyLarge" tone="secondary">
          {`We sent a link to ${email.trim()}. Open it to confirm your account, then come back and sign in.`}
        </Text>
        <Button variant="primary" title="Sign in" onPress={() => router.replace('/auth/sign-in')} />
      </Screen>
    );
  }

  return (
    <Screen keyboard>
      <Text variant="body" tone="secondary">
        {signingUp ? 'Free. Your progress is saved to your account and follows you to pockett.ai.' : 'Welcome back. Your progress on this phone is kept and merged with your account.'}
      </Text>
      {signingUp ? (
        <TextField label="Name" value={name} onChangeText={setName} autoFocus autoCapitalize="words" textContentType="name" autoComplete="name" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} maxLength={60} />
      ) : null}
      <TextField
        ref={emailRef}
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoFocus={!signingUp}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType={signingUp ? 'username' : 'emailAddress'}
        autoComplete="email"
        returnKeyType="next"
        onSubmitEditing={() => passwordRef.current?.focus()}
      />
      <TextField
        ref={passwordRef}
        label={signingUp ? 'Password (8 characters or more)' : 'Password'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        textContentType={signingUp ? 'newPassword' : 'password'}
        autoComplete={signingUp ? 'new-password' : 'current-password'}
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      {error ? <Notice tone="danger" icon="info">{error}</Notice> : null}
      <Button variant="primary" title={signingUp ? 'Create account' : 'Sign in'} busy={busy} disabled={!valid} onPress={submit} />
      {signingUp ? (
        <Button variant="plain" title="I already have an account" onPress={() => router.replace('/auth/sign-in')} />
      ) : (
        <>
          <Button variant="plain" title="Forgot password?" onPress={() => router.push({ pathname: '/auth/forgot-password', params: { email } })} />
          <Button variant="plain" title="Create an account" onPress={() => router.replace('/auth/sign-up')} />
        </>
      )}
    </Screen>
  );
}
