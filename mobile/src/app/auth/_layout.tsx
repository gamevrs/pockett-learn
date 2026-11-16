import { router, Stack } from 'expo-router';
import { Platform } from 'react-native';

import { HeaderIconButton } from '~/components/HeaderIconButton';
import { useHeaderOptions } from '~/components/TabStack';
import { useTheme } from '~/theme';

/** Sign in, create an account, reset a password: a sheet over whatever opened it, with its own stack. */
export default function AuthLayout() {
  const header = useHeaderOptions();
  const { colors } = useTheme();
  // A sheet has its own bar, solid on both platforms; iOS closes it from the bar, Android with back.
  const close = Platform.OS === 'ios' ? () => <HeaderIconButton icon="close" label="Close" onPress={() => router.dismissAll()} /> : undefined;
  return (
    <Stack screenOptions={{ ...header, headerTransparent: false, headerStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="sign-in" options={{ title: 'Sign in', headerLeft: close }} />
      <Stack.Screen name="sign-up" options={{ title: 'Create account', headerLeft: close }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset password' }} />
    </Stack>
  );
}
