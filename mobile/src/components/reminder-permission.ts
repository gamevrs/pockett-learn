import { Alert, Linking } from 'react-native';

import { askPermission, permissionStatus } from '~/state/notifications';
import { useSettings } from '~/state/settings';

/**
 * Turns a reminder on, asking for notification permission in context the first time. If the phone says no (now or
 * earlier), the switch stays off and the person is told where to change it.
 */
export async function enableReminder(key: 'dailyReminder' | 'streakReminder'): Promise<boolean> {
  let status = await permissionStatus();
  if (status === 'undetermined') status = await askPermission();
  if (status === 'granted') {
    useSettings.getState().set({ [key]: true });
    return true;
  }
  Alert.alert('Notifications are off for Pockett', 'To get reminders, allow notifications for Pockett in your phone’s Settings.', [
    { text: 'Not now', style: 'cancel' },
    { text: 'Open Settings', onPress: () => Linking.openSettings() },
  ]);
  return false;
}
