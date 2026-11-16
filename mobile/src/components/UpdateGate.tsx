import { Linking, Modal, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { needsUpdate } from '~/lib/app-config';
import { APP_VERSION } from '~/lib/site';
import { useInbox } from '~/state/inbox';
import { space, useTheme } from '~/theme';
import { Button, Icon, Text } from '~/ui';

const STORE_URL = Platform.select({
  ios: 'itms-apps://apps.apple.com/app/pockett/id0', // replaced by the real App Store id once the record exists
  default: 'market://details?id=com.gameverse.pockett',
});

/**
 * The force-update gate: when /api/app/config says this version is below the minimum, nothing else can be used
 * until the app is updated (an old build may not understand the lesson pages any more).
 */
export function UpdateGate() {
  const { colors } = useTheme();
  const blocked = useInbox((s) => needsUpdate(APP_VERSION, s.config));
  if (!blocked) return null;
  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={() => {}}>
      <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]}>
        <View style={styles.body}>
          <Icon name="update" size={56} color={colors.brand} />
          <Text variant="title" center accessibilityRole="header">
            Time to update Pockett
          </Text>
          <Text variant="bodyLarge" tone="secondary" center>
            This version can no longer open lessons. Update to the latest version to keep learning. Your progress is saved.
          </Text>
        </View>
        <View style={styles.actions}>
          <Button variant="primary" title="Update" onPress={() => Linking.openURL(STORE_URL)} accessibilityHint="Opens the store page for Pockett" />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg, paddingHorizontal: space.xxl },
  actions: { padding: space.gutter },
});
