import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The native shell loads the live site. POCKETT_SERVER_URL points it at a local dev server for a check:
 *   POCKETT_SERVER_URL=http://localhost:3170 npx cap sync
 * The iOS Simulator shares the Mac's localhost; for the Android emulator run `adb reverse tcp:3170 tcp:3170` first.
 * Use localhost, not a LAN IP or 10.0.2.2: the code frame only runs learner code for pockett.ai or localhost/127.0.0.1
 * (src/engine/frame/origin.ts). A plain `npx cap sync` puts production back. Never ship a build synced with the override.
 */
const PRODUCTION = "https://www.pockett.ai";
const serverUrl = (process.env.POCKETT_SERVER_URL || PRODUCTION).replace(/\/$/, "");
const cleartext = serverUrl.startsWith("http:");

// The bundled offline screen needs to know where "Try again" goes, and it has to be one self-contained file (on Android
// it is served on its own, and nothing else loads while offline). The CLI loads this file before it copies www/ into
// the native projects, so the copy always carries the current server.
writeFileSync(
  path.join(__dirname, "www", "offline.html"),
  readFileSync(path.join(__dirname, "src", "offline.html"), "utf8").replace("__START_URL__", serverUrl + "/"),
);

const config: CapacitorConfig = {
  appId: "com.gameverse.pockett",
  appName: "Pockett",
  webDir: "www",
  // lets the site's analytics tell app sessions apart, without any change to how the site renders
  appendUserAgent: "PockettApp",
  backgroundColor: "#0a0a0a",
  server: {
    url: serverUrl,
    cleartext,
    // shown when the site can't be reached (offline, DNS, server error on the first load)
    errorPath: "offline.html",
    // No allowNavigation: every other origin opens outside the app. The learner-code frame (pockett-zeta.vercel.app) is
    // an iframe, which both platforms load without it, and listing it here would also hand it the native bridge on Android.
  },
  ios: {
    contentInset: "never",
    // the site handles the notch and home indicator itself (viewport-fit=cover + env(safe-area-inset-*))
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
    captureInput: false,
    webContentsDebuggingEnabled: cleartext,
  },
  plugins: {
    App: {
      // Android back is handled in MainActivity: history first, then leave the app
      disableBackButtonHandler: true,
    },
    SplashScreen: {
      launchShowDuration: 1200,
      launchAutoHide: true,
      launchFadeOutDuration: 250,
      backgroundColor: "#0a0a0a",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: false,
      splashImmersive: false,
    },
    Keyboard: {
      // shrink the web view above the keyboard, so the editor's fixed full-screen layout ends where the keyboard starts
      resize: "native",
      resizeOnFullScreen: true,
    },
    SystemBars: {
      // Android: inject --safe-area-inset-* for older WebViews; the site uses them alongside env(safe-area-inset-*)
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
    },
    LocalNotifications: {
      iconColor: "#c5ee8a",
    },
  },
};

export default config;
