import { useNetworkState } from 'expo-network';
import * as WebBrowser from 'expo-web-browser';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type ComponentType, type Ref } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView as RNWebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';

import { embedUrl, injectedGlobal, isSiteUrl, parseEmbedMessage, themeMessageScript, type EmbedMessage } from '~/lib/bridge';
import { APP_VERSION, PLATFORM, SITE_URL } from '~/lib/site';
import { useCatalogStore } from '~/state/catalog';
import { useProgress } from '~/state/progress';
import { supabase, useSession } from '~/state/session';
import { space, useScheme, useTheme } from '~/theme';
import { Button, EmptyState, Text } from '~/ui';

/**
 * react-native-webview's own declaration types its props as `WebViewProps & P` with P defaulting to undefined,
 * which TypeScript 6 reduces to never. The component itself is fine; this is its intended type.
 */
type WebViewInstance = InstanceType<typeof RNWebView>;
const WebView = RNWebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewInstance> }>;

export interface EmbedHandle {
  reload: () => void;
}

/**
 * A page of the site hosted in the app (contract §2): /embed/<path>, with window.__POCKETT_APP__ defined before the
 * page's own scripts (platform, version, theme, the session, the progress), the theme kept in step, every message
 * parsed and handed up, and navigation kept on the site: other sites open in the in-app browser. Loading, offline
 * and failure are native screens, never a web error page.
 */
export const EmbedView = forwardRef<EmbedHandle, { path: string; onMessage: (msg: EmbedMessage) => void; onNavigateAway: (url: string) => boolean; loadingLabel: string; testID?: string }>(function EmbedView(
  { path, onMessage, onNavigateAway, loadingLabel, testID },
  ref,
) {
  const { colors } = useTheme();
  const scheme = useScheme();
  const net = useNetworkState();
  const offline = net.isConnected === false || net.isInternetReachable === false;
  const appApi = useCatalogStore((s) => s.appApi);
  const web = useRef<WebViewInstance>(null);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<'preparing' | 'loading' | 'ready' | 'failed'>('preparing');
  const [boot, setBoot] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({ reload: () => setAttempt((n) => n + 1) }), []);

  // Before the page loads: a session with time left on it (so the page never has to refresh the token itself and
  // rotate it out from under the app), then the global the page reads first.
  useEffect(() => {
    let cancelled = false;
    setPhase('preparing');
    (async () => {
      let session = useSession.getState().session;
      if (session?.expires_at && session.expires_at * 1000 - Date.now() < 15 * 60_000) {
        const { data } = await supabase.auth.refreshSession().catch(() => ({ data: { session: null } }));
        session = data.session ?? session;
      }
      const { progress, resetPending } = useProgress.getState();
      const global = injectedGlobal({
        platform: PLATFORM,
        appVersion: APP_VERSION,
        theme: scheme,
        session: session ? { access_token: session.access_token, refresh_token: session.refresh_token } : null,
        progress,
      });
      // The app's own housekeeping on the site's storage, before the page reads it: progress cleared in Settings is
      // cleared here too, and a signed-out app leaves no signed-in page behind (the site's storage key).
      const housekeeping = `(function(){try{${resetPending ? "localStorage.removeItem('pockett_progress_v2');" : ''}${session ? '' : "localStorage.removeItem('pockett_auth');"}}catch(e){}})();`;
      if (!cancelled) {
        setBoot(`${housekeeping}\n${global}`);
        setPhase('loading');
      }
    })();
    return () => {
      cancelled = true;
    };
    // The scheme is sent to a loaded page as a message (below), not by reloading it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, attempt]);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    web.current?.injectJavaScript(themeMessageScript(scheme));
  }, [scheme]);

  const uri = useMemo(() => embedUrl(SITE_URL, path, scheme, appApi), [path, appApi, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const handle = (e: WebViewMessageEvent) => {
    const msg = parseEmbedMessage(e.nativeEvent.data);
    if (!msg) return;
    if (msg.type === 'ready') setPhase('ready');
    if (msg.type === 'session') {
      // The page refreshed the session and spent the app's refresh token: keep the new pair.
      supabase.auth.setSession({ access_token: msg.session.access_token, refresh_token: msg.session.refresh_token }).catch(() => {});
    }
    if (msg.type === 'auth' && msg.event === 'signedOut' && useSession.getState().session) {
      // The page could not use the app's session. If the app can't refresh it either, it has ended: sign out here.
      supabase.auth.refreshSession().then(({ error }) => {
        if (error) supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      });
    }
    if (msg.type === 'progress') {
      useProgress.getState().fromPage(msg.data);
      if (useProgress.getState().resetPending) useProgress.getState().resetHandled();
    }
    onMessage(msg);
  };

  if (offline && phase !== 'ready') {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: colors.background }]} testID="embed-offline">
        <EmptyState
          icon="offline"
          title="You're offline"
          body="Lessons need an internet connection. Everything else in Pockett works offline: your progress is saved on this phone."
          action={<Button compact title="Try again" onPress={() => setAttempt((n) => n + 1)} />}
        />
      </View>
    );
  }

  if (phase === 'failed') {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: colors.background }]} testID="embed-failed">
        <EmptyState icon="offline" title="This didn't load" body="Pockett couldn't be reached. Check your connection and try again." action={<Button compact title="Try again" onPress={() => setAttempt((n) => n + 1)} />} />
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]} testID={testID}>
      {boot ? (
        <WebView
          key={attempt}
          ref={web}
          source={{ uri }}
          style={[styles.fill, { backgroundColor: colors.background }]}
          containerStyle={{ backgroundColor: colors.background }}
          injectedJavaScriptBeforeContentLoaded={boot}
          injectedJavaScriptBeforeContentLoadedForMainFrameOnly
          onMessage={handle}
          onLoadEnd={() => setPhase((p) => (p === 'loading' ? 'ready' : p))}
          onError={() => setPhase('failed')}
          onHttpError={(e) => {
            if (e.nativeEvent.statusCode >= 500) setPhase('failed');
          }}
          onContentProcessDidTerminate={() => web.current?.reload()}
          onRenderProcessGone={() => setAttempt((n) => n + 1)}
          onShouldStartLoadWithRequest={(req) => {
            if (!req.isTopFrame) return true; // the learner-code frame and anything the page embeds
            if (isSiteUrl(req.url, SITE_URL)) {
              const url = new URL(req.url);
              const embedded = url.pathname.startsWith('/embed/') || url.pathname === new URL(uri).pathname;
              if (embedded || req.url === uri) return true;
              return onNavigateAway(req.url);
            }
            WebBrowser.openBrowserAsync(req.url);
            return false;
          }}
          setSupportMultipleWindows={false}
          onOpenWindow={(e) => WebBrowser.openBrowserAsync(e.nativeEvent.targetUrl)}
          applicationNameForUserAgent={`PockettApp/${APP_VERSION}`}
          allowsBackForwardNavigationGestures={false}
          keyboardDisplayRequiresUserAction={false}
          hideKeyboardAccessoryView={false}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          pullToRefreshEnabled={false}
          overScrollMode="never"
          textZoom={100}
          webviewDebuggingEnabled={__DEV__}
          forceDarkOn={false}
          originWhitelist={['https://*', 'http://localhost*', 'http://127.0.0.1*', 'about:*']}
        />
      ) : null}
      {phase !== 'ready' ? (
        <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: colors.background }]} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.textTertiary} />
          <Text variant="label" tone="tertiary">
            {loadingLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
});
