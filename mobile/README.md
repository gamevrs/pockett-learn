# Pockett for iOS and Android

A native app built with [Expo](https://expo.dev) SDK 58 (React Native 0.88, expo-router). Everything you navigate is
native: onboarding, the tab bar, Home, Learn, Progress, Account, Settings, Notifications, the lesson's header and its
completion screen. Only the lesson itself (the site's player and code workspace) is the website, hosted from
`https://www.pockett.ai/embed/...` in a web view.

This folder is its own project (own `package.json`, npm, not pnpm). The Next.js app at the repo root never builds
it: `.vercelignore`, the root `tsconfig.json` and `eslint.config.mjs` all leave `mobile/` out. The earlier Capacitor
web shell lived here until November 2026 and is in git history.

| | |
|---|---|
| App name | Pockett |
| Bundle id / application id | `com.gameverse.pockett` (permanent once submitted) |
| Apple team | `2FW4Z8T843` (Gameverse, LLC). Automatic signing. |
| Expo owner | `gameverse-llc`. No EAS project id yet (`eas init` has not been run; builds are local). |
| URL scheme | `pockett://` |
| Universal links / App Links | `https://www.pockett.ai/learn/*` and `/projects/*` (see "Links") |
| Site | `https://www.pockett.ai` (`extra.siteUrl` in `app.json`; `EXPO_PUBLIC_SITE_URL` overrides it in development) |

## How it fits together

```
 the app (mobile/)                                        the site (src/, Vercel)
 ───────────────────────────────────────                 ─────────────────────────────────────────
 src/state/catalog ── GET /api/app/catalog ────────────▶ src/lib/app/catalog.ts (every track, module, lesson)
   (bundled copy src/fixtures/catalog.json first)
 src/state/inbox ──── GET /api/app/config ─────────────▶ src/lib/app/config.ts (minVersion, announcements)
 src/state/session ── Supabase (same public project) ──▶ auth, profiles, lesson_completions (read, merged)
 Lesson / Playground: react-native-webview
   loads /embed/<site path>?theme=… ───────────────────▶ src/app/embed/* (the player, nothing else)
   injects window.__POCKETT_APP__ (platform, version,     src/lib/embed/boot.ts merges the progress, sets the
     theme, session, progress) before the page runs      session; CloudSync writes progress to Supabase
   ◀── postMessage: ready, step, answer, lessonComplete,  src/lib/embed/host.ts
       progress, navigate, external, close, auth, session
```

The protocol is the contract (scratchpad `native/contract.md` at the time of writing; summarised in
`src/lib/bridge.ts`). Progress is the site's own `pockett_progress_v2` object: the app imports the site's types and
merge (`@site/data/progress/*`, mapped to `../src` in `tsconfig.json` and watched by `metro.config.js`).

### Source map

| Path | What |
|---|---|
| `src/app/` | routes (expo-router): `onboarding/*`, `(tabs)/(home)`, `(tabs)/learn/*`, `(tabs)/progress/*`, `(tabs)/account/*`, `lesson/[id]`, `playground`, `auth/*`, `+native-intent` (deep links) |
| `src/lib/` | pure logic, unit-tested in `src/lib/__tests__`: catalog, progress (streaks, levels, heatmap, achievements), recommendations, the bridge, reminders, links, app config |
| `src/state/` | zustand stores persisted to AsyncStorage (settings, progress, catalog, inbox/config), Supabase session in SecureStore, local notifications |
| `src/ui/`, `src/theme/` | the design system: one component per role, tokens from the site (see `DESIGN.md`) |
| `src/components/` | app parts built from `ui/` (cards, rows, charts, the web view host, the celebration) |
| `scripts/make-catalog-fixture.mjs` | rebuilds `src/fixtures/catalog.json` from the site's content (`npm run catalog:fixture`) |

## Running it

Prerequisites: Node 22, Xcode (iOS 26+ simulator), Android Studio (SDK 36, an emulator), CocoaPods. Java: Android
Studio's bundled JDK (`export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`).

```sh
cd mobile
npm ci
npx expo prebuild            # writes ios/ and android/ from app.json (both are git-ignored)
npx expo run:ios             # development build on a simulator, with Metro
npx expo run:android         # same on an emulator or a USB device
```

Checks: `npm run typecheck`, `npm run lint`, `npm test` (jest-expo, the pure logic).

**Against a local site** (to test site changes before they deploy):

```sh
npx -y pnpm@10 next dev -p 3170                         # repo root
EXPO_PUBLIC_SITE_URL=http://localhost:3170 npx expo start --dev-client   # mobile/
adb reverse tcp:3170 tcp:3170 && adb reverse tcp:8081 tcp:8081           # Android only
```

Use `localhost`: the site's code frame only accepts a parent on pockett.ai or localhost. Without the app API on the
site (an older deploy), the app keeps its bundled catalog and opens the plain lesson pages instead of `/embed`.

**UI flows**: the screenshots for review were taken with [Maestro](https://maestro.mobile.dev) flows driving both
platforms (onboarding, every tab, a full lesson to its completion screen); controls carry `testID`s for that.

**Icons and splash** come from the brand kit (`brand/png`): `assets/icon.png` (iOS, the mark on #0a0a0a),
`assets/android-icon-foreground.png` + `android-icon-background.png` (adaptive icon), `assets/splash-icon.png`.

## Links

`src/lib/app-links.ts` at the repo root is the one list of claimed paths (`/learn/`, `/projects/`), mirrored in
`app.json` (`ios.associatedDomains`, `android.intentFilters`); `npm run test:app-links` at the repo root fails if they
drift. In the app, `src/app/+native-intent.tsx` turns those links (and `pockett://learn/<id>`) into the Lesson screen.
Only `www.pockett.ai` is claimed; `/account` is deliberately not (email confirmation and reset links finish in the
browser; the app signs in with email and password).

## Releasing

Bump `expo.version`, `ios.buildNumber` and `android.versionCode` in `app.json`, then `npx expo prebuild --clean`.
Release builds always point at production (`EXPO_PUBLIC_SITE_URL` must be unset).

**iOS**

```sh
cd mobile/ios
xcodebuild -workspace Pockett.xcworkspace -scheme Pockett -configuration Release \
  -destination 'generic/platform=iOS' -archivePath ~/pockett-builds/PockettNative.xcarchive \
  -allowProvisioningUpdates archive
```

then upload from Xcode Organizer (or `xcodebuild -exportArchive`). Signing is automatic from an Xcode account on team
`2FW4Z8T843`.

**Android**

```sh
cd mobile/android && ./gradlew bundleRelease    # store upload (AAB)
./gradlew assembleRelease                       # an APK
```

The generated project signs release builds with the debug key: fine for testing, never for the store. For Play, create
an upload key (`keytool -genkeypair -v -keystore pockett-upload.jks -alias upload -keyalg RSA -keysize 4096 -validity
10000`), keep it out of the repo (`.gitignore` refuses `*.jks`/`*.keystore`/`keystore.properties`), and add a signing
config through a config plugin or `android/gradle.properties` on the build machine. Enroll in Play App Signing.

### What the owner provides

**Apple**
1. The bundle id `com.gameverse.pockett` with the **Associated Domains** and **Push Notifications** capabilities
   (reminders are local, but the entitlement keeps the notification permission prompt standard).
2. An App Store Connect record: name "Pockett", category Education, age rating (no objectionable content; unrestricted
   web access: no, other sites open in the in-app Safari view). Put the app's numeric id into `UpdateGate.tsx`'s
   store link once it exists.
3. Screenshots: 6.9" iPhone (1320x2868) and 13" iPad (2064x2752). Store art stays plain.
4. App Privacy (from what the app and site collect): email (and an optional name), linked, App Functionality; user
   content (code) and product interaction (lessons, XP, streak) only for signed-in users, linked, App Functionality.
   No tracking, no ads, no third-party analytics. `ITSAppUsesNonExemptEncryption = NO` is set from `app.json`.
5. Privacy policy `https://www.pockett.ai/privacy`; support `support@pockett.ai`; a demo account for review.

**Google Play**
1. A Play Console app with package `com.gameverse.pockett`, the upload key above, Play App Signing.
2. **App Links**: put the app signing key's SHA-256 (Play Console ▸ App signing) in the Vercel env var
   `ANDROID_CERT_SHA256` and redeploy, or `https://www.pockett.ai/.well-known/assetlinks.json` answers 404 and lesson
   links open the browser. Check with `adb shell pm get-app-links com.gameverse.pockett`.
3. Data safety (same facts as Apple's), content rating, target audience 13+, listing and screenshots.

## Review risks

- **Guideline 4.2 (minimum functionality)**: the app is native everywhere except inside a lesson: native onboarding,
  tabs and stacks, lists of every track/module/lesson with progress, search, a progress dashboard (levels, streaks,
  a calendar of active days, goal history, achievements), local reminders that skip days you already learned,
  haptics, a native completion screen, share and report menus, offline handling and a cached catalog.
- **5.1.1(v) account deletion**: Account ▸ Delete account asks for the password and calls `delete_my_account()`.
  Until that function is on the production database (branch `feat/delete-account`), the screen says deletion from the
  app isn't available yet and offers an email to support. Ship the migration before submitting.
- **2.1**: provide a demo account. **2.5.2**: learner code runs in the site's sandboxed frame without native access.

## Known issues

- Lessons need a connection (they run on the site); the app says so plainly and keeps everything else available.
- Android tablets show the bottom bar (no navigation rail yet); iPad uses the system's top tab bar.
- The app's store link in the update gate needs the App Store id (see above).
