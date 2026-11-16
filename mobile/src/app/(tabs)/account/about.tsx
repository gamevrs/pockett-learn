import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Linking, StyleSheet, View } from 'react-native';

import { APP_VERSION, LINKS, SUPPORT_EMAIL } from '~/lib/site';
import { space } from '~/theme';
import { ListRow, ListSection, Screen, Text } from '~/ui';

/** About: what Pockett is, its policies and brand, how to reach us, and this version. */
export default function About() {
  const open = (url: string) => WebBrowser.openBrowserAsync(url);
  return (
    <Screen>
      <Stack.Screen options={{ title: 'About' }} />
      <View style={styles.head}>
        <Image source={require('../../../../assets/mark.png')} style={styles.mark} accessibilityLabel="Pockett logo" />
        <Text variant="title" center>
          Pockett
        </Text>
        <Text variant="body" tone="secondary" center>
          Learn how code really works, one real project at a time.
        </Text>
      </View>
      <ListSection>
        <ListRow icon="lock" label="Privacy policy" trailing="external" onPress={() => open(LINKS.privacy)} />
        <ListRow icon="doc" label="Terms of use" trailing="external" onPress={() => open(LINKS.terms)} />
        <ListRow icon="brand" label="Brand" trailing="external" onPress={() => open(LINKS.brand)} />
        <ListRow icon="external" label="pockett.ai" trailing="external" onPress={() => open(LINKS.site)} last />
      </ListSection>
      <ListSection>
        <ListRow icon="mail" label="Contact us" detail={SUPPORT_EMAIL} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} last />
      </ListSection>
      <Text variant="label" tone="tertiary" center>
        {`Version ${APP_VERSION}\n© 2026 Gameverse, LLC`}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', gap: space.sm, paddingTop: space.sm },
  mark: { width: 72, height: 72 },
});
