import { Stack } from 'expo-router';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, space, useTheme } from '~/theme';
import { ListRow, type IconName } from '~/ui';

import { HeaderIconButton } from './HeaderIconButton';

export interface MenuAction {
  label: string;
  icon: IconName;
  sf: 'square.and.arrow.up' | 'arrow.counterclockwise' | 'exclamationmark.bubble';
  onPress: () => void;
}

/**
 * A screen's ••• menu in its header. iOS: the system pull-down menu from a bar button. Android: the overflow
 * button (⋮) opening a Material bottom sheet of the same actions.
 */
export function HeaderMenu({ actions }: { actions: MenuAction[] }) {
  if (Platform.OS === 'ios') {
    return (
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="ellipsis" accessibilityLabel="More">
          {actions.map((a) => (
            <Stack.Toolbar.MenuAction key={a.label} icon={a.sf} onPress={a.onPress}>
              {a.label}
            </Stack.Toolbar.MenuAction>
          ))}
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    );
  }
  return <AndroidMenu actions={actions} />;
}

function AndroidMenu({ actions }: { actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <>
      <Stack.Screen options={{ headerRight: () => <HeaderIconButton icon="more" label="More" onPress={() => setOpen(true)} testID="lesson-menu" /> }} />
      <Modal visible={open} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setOpen(false)}>
        <Pressable style={[styles.scrim, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)} accessibilityLabel="Close menu" accessibilityRole="button" />
        <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + space.sm }]}>
          <View style={[styles.handle, { backgroundColor: colors.lineStrong }]} />
          {actions.map((a, i) => (
            <ListRow
              key={a.label}
              icon={a.icon}
              label={a.label}
              trailing="none"
              last={i === actions.length - 1}
              onPress={() => {
                setOpen(false);
                a.onPress();
              }}
            />
          ))}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1 },
  sheet: { borderTopLeftRadius: radius.card + 12, borderTopRightRadius: radius.card + 12, paddingTop: space.sm },
  handle: { alignSelf: 'center', width: 32, height: 4, borderRadius: radius.pill, marginBottom: space.sm },
});
