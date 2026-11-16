import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';

import { useSettings } from '~/state/settings';

import { useUnreadCount } from '~/state/inbox';
import { useTheme } from '~/theme';

/**
 * The platform's own tab bar: Liquid Glass on iOS 26+, Material 3's navigation bar on Android. Four tabs, one
 * job each: Home (what to do now), Learn (everything there is), Progress (how it's going), Account (you and
 * the app's settings). The Account tab carries the inbox's unread count as the platform's own badge.
 */
export default function TabsLayout() {
  const { colors } = useTheme();
  const unread = useUnreadCount();
  const onboarded = useSettings((s) => s.onboarded);
  if (!onboarded) return <Redirect href="/onboarding" />;
  return (
    <NativeTabs
      tintColor={colors.text}
      iconColor={{ default: colors.textTertiary, selected: colors.text }}
      backgroundColor={colors.background}
      indicatorColor={colors.tint}
      rippleColor={colors.tonalPressed}
      labelStyle={{ default: { color: colors.textTertiary }, selected: { color: colors.text } }}
      labelVisibilityMode="labeled"
      minimizeBehavior="never">
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="learn">
        <NativeTabs.Trigger.Label>Learn</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} md="menu_book" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} md="bar_chart" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
        {unread > 0 ? <NativeTabs.Trigger.Badge>{String(unread)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
