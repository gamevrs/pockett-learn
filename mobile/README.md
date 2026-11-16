# Pockett for iOS and Android

The phone apps are a [Capacitor](https://capacitorjs.com) 8 shell around the live site. This folder is its own
project (own `package.json`, own `node_modules`, npm rather than pnpm); the Next.js app at the repo root never builds
it, and `.vercelignore`, the root `tsconfig.json` and `eslint.config.mjs` all leave it out.

| | |
|---|---|
| App name | Pockett |
| Bundle id / application id | `com.gameverse.pockett` (permanent once submitted) |
| Apple team | `2FW4Z8T843` (Gameverse, LLC; the same team as Genvi). Automatic signing. |
| Org | Gameverse, LLC (`gameverse-llc` on Expo/EAS for Genvi; not used here, Capacitor builds locally) |
| Loads | `https://www.pockett.ai` (`server.url` in `capacitor.config.ts`) |
| Min OS | iOS 15, Android 7 (API 24); target/compile SDK 36 |

## How it fits together

```
 native shell (mobile/)                          the site (src/, deployed on Vercel)
 ─────────────────────────                        ────────────────────────────────────────
 WKWebView / Android WebView ── loads ──────────▶ https://www.pockett.ai
   Capacitor bridge injected into the page ─────▶ window.Capacitor  ─┐
   plugins: App, Browser, Haptics, Keyboard,                         ├─ src/lib/native/app.ts (the whole bridge, a no-op
     LocalNotifications, Network, Share,                             │   in a browser) + src/components/native/*
     SplashScreen, StatusBar                                         │
   + AppChrome (Android, ours)                                       │
 www/offline.html (bundled) ◀── shown when the site can't load       │
                                                                     │
 learner code runs in an iframe on https://pockett-zeta.vercel.app ◀─┘ (src/engine/frame/origin.ts)
```

- **Everything visible is the site.** A site change ships to the apps the moment it deploys; the app binary only
  changes for native features. The site has no `@capacitor/core` dependency: it talks to the injected bridge directly
  (`Capacitor.nativePromise`), and every call is a no-op when `window.Capacitor` is absent, so the website is unchanged.
- **App-only look.** A head script in `src/app/layout.tsx` adds `.native-app` to `<html>` (and `viewport-fit=cover,
  maximum-scale=1`) before first paint, only inside the app. `globals.css` uses it to pad for the status bar, notch and
  home indicator and to hide the web navbar and footer; `AppTabBar` replaces them with a bottom tab bar.
- **The code frame.** Learner Python/JavaScript runs in an iframe on a second origin, as on the web. Both web views load
  it as a normal cross-origin iframe (verified: a Python step runs and passes on the iOS 27 simulator and on Android 16).
  The frame never gets the native bridge: iOS injects Capacitor into the main frame only and `PockettViewController`
  drops bridge messages from any other frame; Android's bridge already ignores non-main-frame messages, and the frame
  origin is deliberately **not** in `server.allowNavigation` (that would hand it the bridge).

## Native features, and where they live

| Feature | Native side | Site side |
|---|---|---|
| Bottom tab bar (Home, Learn, Projects, Sandbox, Account): translucent bar on iOS, Material 3 bar with a pill on Android; hidden while the keyboard is up and in full-screen lesson/editor views | | `components/native/AppTabBar.tsx`, `.app-tabbar` in `globals.css` |
| Account tab gains what the navbar/footer held: your progress, theme, sound, daily reminder, brand, privacy, terms | | `components/native/AppSettings.tsx` |
| Status bar text follows the site theme; on Android the bars' backdrop follows it too | `AppChromePlugin.java` | `NativeBridge.tsx` |
| Safe areas (notch, home indicator, Android system bars) | `SystemBars.insetsHandling: css` | `.native-app` rules in `globals.css` |
| Android back: history first, then leave the app | `MainActivity.java` (`App.disableBackButtonHandler: true`) | |
| Links to other sites open in the in-app browser (Safari View Controller / Custom Tabs); pockett.ai and the code frame stay in the app | Capacitor's own navigation policy as the fallback | `NativeBridge.tsx` click handler, `@capacitor/browser` |
| Offline screen with Try again (and it retries by itself when the connection returns) | `server.errorPath`, template `src/offline.html` → `www/offline.html` on every sync | |
| Haptics on a correct answer, a wrong answer and a finished lesson | `@capacitor/haptics` | `haptic()` in `lib/native/app.ts`, called next to the existing sounds |
| Daily streak reminder (local notifications, opt-in in Account; skips a day that already has a lesson; no server push) | `@capacitor/local-notifications`, inexact alarms (`SCHEDULE_EXACT_ALARM` removed from the manifest) | `lib/native/reminder.ts` |
| Share a lesson link (system share sheet) | `@capacitor/share` | `NativeShareButton.tsx` in the lesson and workspace headers |
| Universal links / App Links for `https://www.pockett.ai/learn/*` and `/projects/*` | `App.entitlements` (`applinks:www.pockett.ai`), autoVerify intent filter in `AndroidManifest.xml` | `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` route handlers, `src/lib/app-links.ts` |
| Keyboard keeps the editor usable | `Keyboard.resize: native` (iOS shrinks the web view), `adjustResize` + SystemBars IME insets on Android | `maximum-scale=1` stops the iOS focus zoom |
| Icons and splash (light and dark) from the brand kit | `scripts/make-asset-sources.mjs` + `@capacitor/assets`; Android 12+ splash in `styles.xml` | |

## Running it

Prerequisites: Node 22, Xcode (with an iOS simulator), Android Studio (SDK 36, an emulator image). Java: use Android
Studio's bundled JDK. The Capacitor plugins compile against a Java 21 toolchain, which Gradle downloads by itself the
first time (the foojay resolver in `android/settings.gradle`).

```sh
cd mobile
npm ci
npx cap sync                 # copies config + www/ into ios/ and android/ (production URL)
```

**iOS simulator**

```sh
npx cap run ios              # or open ios/App/App.xcodeproj in Xcode and Run
# headless:
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath build/ios build
xcrun simctl install booted build/ios/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch booted com.gameverse.pockett
```

If SwiftPM hangs on "Resolve Package Graph" while downloading `Capacitor.xcframework.zip`, download the two zips named
in `node_modules/@capacitor/ios`'s `capacitor-swift-pm` release (8.6.2) with curl and drop them into
`~/Library/Caches/org.swift.swiftpm/artifacts/` under SwiftPM's mangled names; it checks their checksums.

**Android emulator**

```sh
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
npx cap run android          # or:
cd android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk
```

**Against a local dev server** (to see site changes before they deploy):

```sh
# repo root
npx -y pnpm@10 next dev -p 3170
# mobile/
adb reverse tcp:3170 tcp:3170                       # Android only; the iOS Simulator shares the Mac's localhost
POCKETT_SERVER_URL=http://localhost:3170 npx cap sync   # then build and run as above
npx cap sync                                         # put production back before committing or building a release
```

Use `localhost`, not a LAN IP: the code frame only accepts a parent on pockett.ai or localhost/127.0.0.1, so learner
code won't run from any other dev host. Debug builds against an `http:` URL turn on web-view debugging (Safari ▸
Develop, `chrome://inspect`).

**Icons and splash** come from `brand/png` (generated by `brand/build.mjs`): `npm run assets`.

## Releasing

Before anything else, run `npx cap sync` with no override and check `ios/App/App/capacitor.config.json` and
`android/app/src/main/assets/capacitor.config.json` say `"url": "https://www.pockett.ai"` and `"cleartext": false`.
Bump `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION` (Xcode) and `versionName`/`versionCode` (`android/app/build.gradle`).

### What the owner provides

**Apple**
1. Apple Developer Program membership on team `2FW4Z8T843` (done) and the bundle id `com.gameverse.pockett`
   registered with the **Associated Domains** capability (bundle id registered; enable the capability on it).
2. An **App Store Connect app record** for that bundle id (Apple's API can't create it): name "Pockett", primary
   language, category Education, SKU, age rating questionnaire (no objectionable content; unrestricted web access: **no**,
   since other sites open in Safari View Controller rather than the app's own browser).
3. Signing: automatic, from an Xcode account signed in to the team. Archive with
   `xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination 'generic/platform=iOS' -archivePath ~/pockett-builds/Pockett.xcarchive -allowProvisioningUpdates archive`,
   then upload from Xcode Organizer or `xcodebuild -exportArchive`.
4. Screenshots: 6.9" iPhone (1320×2868) and 13" iPad (2064×2752) at minimum. Store art stays plain: a headline, one
   subline, the app screen; no gradient text or floating pills.
5. App Privacy answers (from what the site actually collects, see `/privacy`):
   - **Contact info → Email address**: collected, linked to the user, for App Functionality (account). Not tracking.
   - **User content → Other user content** (code drafts and submitted solutions) and **Usage data → Product
     interaction** (lessons completed, XP, streak, attempts, hints viewed): collected only for signed-in users, linked,
     App Functionality. Not tracking.
   - **Name** only if they enter a display name (Contact info → Name, linked, App Functionality).
   - No location, contacts, identifiers for advertising, health, financial or diagnostics data; no third-party
     analytics or advertising SDKs; no tracking, so no App Tracking Transparency prompt. (If AdSense is ever switched
     on with `NEXT_PUBLIC_ADSENSE_CLIENT`, these answers change and ATT applies.)
   - Encryption: standard HTTPS only, `ITSAppUsesNonExemptEncryption = NO` is already in `Info.plist`.
6. Privacy policy URL `https://www.pockett.ai/privacy`, support URL (a contact page or the support email).

**Google Play**
1. A Play Console developer account and an app with package `com.gameverse.pockett`.
2. **Upload key**: create it yourself (`keytool -genkeypair -v -keystore pockett-upload.jks -alias upload -keyalg RSA
   -keysize 4096 -validity 10000`), keep it out of the repo (the `.gitignore` here refuses `*.jks`/`*.keystore`), and
   sign release bundles with it (`./gradlew bundleRelease` plus a `signingConfigs` block reading
   `keystore.properties`, also git-ignored). Enroll in Play App Signing.
3. **App Links**: after the first upload, Play Console ▸ Setup ▸ App signing shows the **app signing key** SHA-256 (and
   the upload key's). Put them, comma separated, in the Vercel env var **`ANDROID_CERT_SHA256`** for production and
   redeploy. Until then `https://www.pockett.ai/.well-known/assetlinks.json` answers 404 and Android opens lesson links
   in the browser. Check with `adb shell pm get-app-links com.gameverse.pockett` (state `verified`).
4. Data safety form (same facts as Apple's): email (and optional name) collected for account management; app activity
   (lesson progress) and user content (code) collected for app functionality, only with an account; data encrypted in
   transit; users can request deletion; no data shared with third parties for advertising; no ads.
5. Content rating questionnaire (education, no user-to-user interaction), target audience 13+ (the site is not directed
   to children under 13), store listing, screenshots (phone, 7" and 10" tablet).

**Vercel**: `APPLE_TEAM_ID` is optional (it defaults to `2FW4Z8T843`); `ANDROID_CERT_SHA256` as above.

### Universal links / App Links

`src/lib/app-links.ts` is the one list of claimed paths (`/learn/`, `/projects/`), mirrored in `App.entitlements` and
the Android manifest; `npm run test:app-links` at the repo root fails if they drift. Only `www.pockett.ai` is claimed:
the apex redirects to www, and Apple won't follow a redirect for the association file. `/account` is deliberately not
claimed: Supabase's confirmation and reset emails go through `supabase.co` and redirect to `/account#access_token=…`,
which is not a reliable universal-link hand-off, and a claim that opens the app only sometimes would split where the
new session lands. Those links finish in the browser; the app signs in with email and password.

## Review risks and how the app answers them

**Guideline 4.2 (minimum functionality: "just a website")** is the main risk for a web-view app. What the app adds
beyond the site:
- native navigation: a platform-styled bottom tab bar instead of the web header and footer, safe-area aware, out of the
  way while typing;
- the daily streak reminder, a local notification that knows whether you've already done a lesson today;
- haptic feedback on answers and finished lessons;
- the system share sheet for lessons, and lesson links that open straight in the app (universal links / App Links);
- an offline screen bundled in the app that recovers by itself, instead of a web-view error;
- external sites in Safari View Controller / Custom Tabs, the code editor kept clear of the keyboard, the status bar
  and system bars following the in-app theme, and Android's back button walking lesson history.
Say so in the review notes, with a demo account. If review still pushes back, the next steps are offline lessons (cache
the Foundations content in the app) and a home-screen widget for the streak.

**Guideline 5.1.1(v), account deletion: must fix before submitting.** The app lets people create an account, so it
must also let them delete it from inside the app. Today `/privacy` says to email us. Add a "Delete account" action to
the Account page (a server route using the Supabase service role to delete the user and their progress) before the
first submission; Google Play asks for the same (an in-app path and a web URL).

**Guideline 2.1** (completeness): the reviewer must be able to sign in; provide a demo account in App Review
Information.

**Guideline 2.5.2** (no downloaded code changing the app): the app shows the website, and learner code runs in a
sandboxed frame without access to native features; the app's own behaviour is in the binary.

## Known issues

- The first Python run on a slow Android emulator can hit the site's 60 s Pyodide boot timeout ("Python took too long
  to load"); the second run passes. Real devices are much faster.
- Android notification small icon is the launcher icon; add a monochrome `ic_stat_*` drawable and set
  `LocalNotifications.smallIcon` for a cleaner status-bar glyph.
- Capacitor packages are 8.6.2 (released Nov 2026), pinned exactly. `npm audit` reports a moderate advisory in `uuid`
  pulled in by the `@capacitor/assets` dev tool only; it never ships in the app.
