import { router, Stack } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import { EmbedView } from '~/components/EmbedView';
import { HeaderIconButton } from '~/components/HeaderIconButton';
import { openSitePath } from '~/components/open-site-path';
import { useCatalogStore } from '~/state/catalog';
import { useTheme } from '~/theme';

/** The playground: the site's code workspace under a native header, for writing and running code freely. */
export default function Playground() {
  const { colors } = useTheme();
  const path = useCatalogStore((s) => s.catalog.playground?.path ?? '/playground');
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Playground',
          headerTransparent: false,
          headerStyle: { backgroundColor: colors.background },
          headerLeft: () => <HeaderIconButton icon="close" label="Close playground" onPress={close} />,
        }}
      />
      <EmbedView
        path={path}
        loadingLabel="Opening the playground"
        onMessage={(msg) => {
          if (msg.type === 'external') WebBrowser.openBrowserAsync(msg.url);
          if (msg.type === 'close') close();
          if (msg.type === 'navigate') openSitePath(msg.path, { fromModal: true });
        }}
        onNavigateAway={(url) => {
          WebBrowser.openBrowserAsync(url);
          return false;
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
