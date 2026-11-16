import type { ProgressState } from "@/data/progress/types";

/**
 * The phone app (Expo, branch feat/native-app; not the Capacitor shell in mobile/) hosts the lesson pages under /embed in
 * a react-native-webview and talks to them in both directions. This file is the page's half of that conversation; the
 * contract both sides build against is native/contract.md, section 2.
 *
 * Page -> app: JSON strings through window.ReactNativeWebView.postMessage. In a browser there is no ReactNativeWebView,
 * so every function here does nothing and the site behaves exactly as before.
 * App -> page: window.__POCKETT_APP__, injected before the page's own scripts run (read by ./boot.ts), and later
 * {type:"theme"} messages (handled in components/embed/EmbedBridge.tsx).
 */

export interface AppSession {
  access_token: string;
  refresh_token: string;
}

export interface AppHost {
  platform: "ios" | "android";
  appVersion: string;
  theme: "dark" | "light";
  session: AppSession | null;
  progress: ProgressState | null;
}

export type AppMessage =
  | { type: "ready"; lessonId: string; title: string }
  | { type: "step"; index: number; total: number; title: string }
  | { type: "answer"; correct: boolean }
  | { type: "lessonComplete"; lessonId: string; xp: number; firstTime: boolean; totalXp: number }
  | { type: "progress"; data: ProgressState }
  | { type: "navigate"; path: string }
  | { type: "external"; url: string }
  | { type: "close" }
  | { type: "auth"; event: "signedIn" | "signedOut" }
  /** Supabase rotated the refresh token inside the page: the app must store this pair, its old one is now spent. */
  | { type: "session"; session: AppSession & { expires_at?: number } };

interface HostWindow {
  ReactNativeWebView?: { postMessage(message: string): void };
  __POCKETT_APP__?: Partial<AppHost>;
}

function host(): HostWindow | null {
  return typeof window === "undefined" ? null : (window as unknown as HostWindow);
}

/** True when the page runs inside the phone app's web view. */
export function inApp(): boolean {
  return typeof host()?.ReactNativeWebView?.postMessage === "function";
}

/** What the app injected before the page loaded, or null (a browser, or an app build that injected nothing). */
export function appHost(): Partial<AppHost> | null {
  const app = host()?.__POCKETT_APP__;
  return app && typeof app === "object" ? app : null;
}

/** Send one message to the app. Never throws: a lesson must not break because the bridge did. */
export function postToApp(message: AppMessage) {
  const bridge = host()?.ReactNativeWebView;
  if (!bridge) return;
  try {
    bridge.postMessage(JSON.stringify(message));
  } catch {
    /* the app went away mid-message */
  }
}

/** The site path of a page, whichever of the site page or its /embed twin was linked. */
export function sitePath(pathname: string): string {
  return pathname === "/embed" ? "/" : pathname.startsWith("/embed/") ? pathname.slice("/embed".length) : pathname;
}
