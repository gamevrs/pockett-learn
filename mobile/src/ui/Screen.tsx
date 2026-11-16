import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';

import { maxWidth, space, useTheme } from '~/theme';

/**
 * A page under a native header: the background, the page margin (`space.gutter`, the same inset as the tab bar's
 * and the native lists'), one gap between sections, and a column no wider than a reading width on an iPad. On iOS
 * the scroll view sits under the glass header and tab bar and is inset by the system
 * (contentInsetAdjustmentBehavior), so large titles collapse as you scroll.
 */
export function Screen({
  children,
  refreshing,
  onRefresh,
  keyboard,
  ...rest
}: { children: ReactNode; refreshing?: boolean; onRefresh?: () => void; keyboard?: boolean } & Pick<ScrollViewProps, 'testID'>) {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={keyboard ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets={keyboard}
      refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.textTertiary} colors={[colors.brand]} progressBackgroundColor={colors.surface} /> : undefined}
      {...rest}>
      <View style={styles.column}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.gutter, paddingTop: space.lg, paddingBottom: space.xxxl, alignItems: 'center' },
  column: { width: '100%', maxWidth: maxWidth.reading, gap: space.xxl },
});
