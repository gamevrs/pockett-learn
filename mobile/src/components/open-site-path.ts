import { router, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import { appTargetForPath } from '~/lib/links';
import { SITE_URL } from '~/lib/site';

/**
 * Opens a site path (a page's `navigate`, an announcement's link) where it lives in the app: a lesson or the
 * playground in place of the current full-screen page (`fromModal`) or over the tabs; a course, Learn or Home in
 * the tabs, closing the lesson first. Anything the app has no screen for opens in the in-app browser.
 */
export function openSitePath(path: string, { fromModal }: { fromModal: boolean }) {
  const target = appTargetForPath(path);
  if (!target) {
    WebBrowser.openBrowserAsync(`${SITE_URL}${path}`);
    return;
  }
  const go = (href: Href) => (fromModal ? router.replace(href) : router.push(href));
  switch (target.kind) {
    case 'lesson':
      go({ pathname: '/lesson/[id]', params: { id: target.id, path: target.path } });
      return;
    case 'playground':
      go('/playground');
      return;
    case 'course':
      if (fromModal && router.canGoBack()) router.back();
      router.navigate({ pathname: '/learn/course/[id]', params: { id: target.id } });
      return;
    case 'tab':
      if (fromModal && router.canGoBack()) router.back();
      router.navigate(target.tab);
      return;
  }
}
