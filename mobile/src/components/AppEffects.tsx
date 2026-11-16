import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { achievements } from '~/lib/progress';
import { useCatalog, useCatalogStore } from '~/state/catalog';
import { useInbox } from '~/state/inbox';
import { useReminderSchedule } from '~/state/notifications';
import { useProgress } from '~/state/progress';
import { useSession } from '~/state/session';

/**
 * What runs behind every screen: the catalog and app config refreshed at launch and whenever the app comes
 * forward; the account's progress read after sign-in; the reminder schedule kept current; achievements noted in
 * the inbox; a tapped reminder opening the app where it points.
 */
export function AppEffects() {
  const status = useSession((s) => s.status);

  useEffect(() => {
    const refresh = () => {
      useCatalogStore.getState().refresh();
      useInbox.getState().refreshConfig();
      if (useSession.getState().status === 'signed-in') useProgress.getState().pull();
    };
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (status === 'signed-in') useProgress.getState().pull();
    if (status === 'signed-out') useProgress.setState({ sync: 'local' });
  }, [status]);

  useReminderSchedule();

  const progress = useProgress((s) => s.progress);
  const index = useCatalog();
  useEffect(() => {
    useInbox.getState().noteAchievements(achievements(progress, index).filter((a) => a.earned));
  }, [progress, index]);

  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const route = response?.notification.request.content.data?.route;
    if (typeof route === 'string' && route.startsWith('/')) router.navigate(route as Href);
  }, [response]);

  return null;
}
