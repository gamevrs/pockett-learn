import { router } from 'expo-router';

import { finishOnboarding } from '~/components/onboarding';
import { OnboardingPage } from '~/components/OnboardingPage';
import { Button, ListRow, ListSection } from '~/ui';

/** Save your progress: create an account, sign in, or carry on as a guest (progress stays on this phone). */
export default function AccountStep() {
  return (
    <OnboardingPage
      step={5}
      title="Save your progress"
      body="A free account keeps your lessons, XP and streak safe, and they follow you to pockett.ai. You can also start now and decide later."
      primary={{ title: 'Create free account', onPress: () => router.push('/auth/sign-up') }}
      secondary={<Button variant="plain" title="Continue as guest" onPress={finishOnboarding} testID="onboarding-guest" />}
      testID="onboarding-account">
      <ListSection>
        <ListRow icon="signIn" label="I already have an account" detail="Sign in with your email" onPress={() => router.push('/auth/sign-in')} last />
      </ListSection>
    </OnboardingPage>
  );
}
