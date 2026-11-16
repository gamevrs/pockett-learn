import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { maxWidth, space, useTheme } from '~/theme';
import { Button, Text } from '~/ui';

/** Welcome: what Pockett is, in one line, and one way forward. */
export default function Welcome() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]} testID="onboarding-welcome">
      <View style={styles.body}>
        <Image source={require('../../../assets/mark.png')} style={styles.mark} accessibilityLabel="Pockett" />
        <Text variant="display" center accessibilityRole="header">
          Learn how code really works
        </Text>
        <Text variant="bodyLarge" tone="secondary" center>
          Short, hands-on lessons. Flip bits, trace programs and build real projects, a few minutes a day.
        </Text>
      </View>
      <View style={styles.actions}>
        <Button variant="primary" title="Get started" onPress={() => router.push('/onboarding/interests')} testID="onboarding-start" />
        <Button variant="plain" title="I already have an account" onPress={() => router.push('/auth/sign-in')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center' },
  body: { flex: 1, width: '100%', maxWidth: maxWidth.reading, justifyContent: 'center', alignItems: 'center', gap: space.lg, paddingHorizontal: space.xxl },
  mark: { width: 88, height: 88, marginBottom: space.sm },
  actions: { width: '100%', maxWidth: maxWidth.reading, paddingHorizontal: space.gutter, paddingBottom: space.sm, gap: space.xs },
});
