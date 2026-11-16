/**
 * Which www.pockett.ai links open the iOS and Android apps, and the two files that tell Apple and Google so.
 *
 * Only lesson links are claimed: a Foundations lesson (/learn/<lesson>) and a project lesson (/projects/<slug>/<lesson>),
 * which is what the app's share button sends. /account is deliberately not claimed. Supabase's confirmation and
 * password-reset emails point at supabase.co, which then redirects to /account with the session in the URL fragment; a
 * redirect is not a reliable universal-link hand-off, and a claim that sometimes opens the app and sometimes the browser
 * would put the new session in whichever one happened to open. Those links stay in the browser; the app signs in with
 * the email and password.
 *
 * Only www.pockett.ai is claimed: the apex redirects to www, and Apple does not follow a redirect when it fetches
 * apple-app-site-association.
 *
 * mobile/capacitor.config.ts, mobile/ios/App/App/App.entitlements and mobile/android/app/src/main/AndroidManifest.xml
 * list the same host and paths; scripts/test-app-links.mjs holds the three together.
 *
 * Keep this file free of imports.
 */

/** The site whose links the apps claim. */
export const APP_LINK_HOST = "www.pockett.ai";

/** The apps' identifiers: appId in mobile/capacitor.config.ts, the iOS bundle id and the Android applicationId. */
export const IOS_BUNDLE_ID = "com.gameverse.pockett";
export const ANDROID_PACKAGE = "com.gameverse.pockett";

/** The Apple Developer team that signs the iOS app (not a secret: it is in every signed build). APPLE_TEAM_ID overrides it. */
export const DEFAULT_APPLE_TEAM_ID = "2FW4Z8T843";

/** Path prefixes the apps open. Each ends with a slash; a prefix also covers what follows it. */
export const APP_LINK_PATHS = ["/learn/", "/projects/"] as const;

/**
 * /.well-known/apple-app-site-association. `teamId` is the Apple Developer team id (ten characters); the app id Apple
 * matches is "<team>.<bundle id>". Both formats, newest first: `components` for iOS 13 and later, `paths` for older.
 */
export function appleAppSiteAssociation(teamId: string) {
  const appID = `${teamId}.${IOS_BUNDLE_ID}`;
  return {
    applinks: {
      details: [
        {
          appIDs: [appID],
          components: APP_LINK_PATHS.map((p) => ({ "/": `${p}*`, comment: `Opens ${p}… in the app` })),
        },
        { appID, paths: APP_LINK_PATHS.map((p) => `${p}*`) },
      ],
    },
  };
}

/**
 * /.well-known/assetlinks.json. `fingerprints` are the SHA-256 fingerprints of every certificate the Android app is
 * signed with (Google Play's app signing key, and the upload key for sideloaded test builds), colon-separated upper case.
 */
export function androidAssetLinks(fingerprints: string[]) {
  return [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: ANDROID_PACKAGE, sha256_cert_fingerprints: fingerprints },
    },
  ];
}

/** Quotes and brackets around a value pasted into a dashboard, which it keeps as part of the value. */
const PASTED_WRAPPING = /^["'`[\]]+|["'`[\]]+$/g;

/** Split a comma- or whitespace-separated env value into fingerprints, dropping blanks and malformed entries. */
export function parseFingerprints(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(/[\s,]+/)
    .map((f) => f.trim().replace(PASTED_WRAPPING, "").toUpperCase())
    .filter((f) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f));
}

/** A ten-character Apple team id, or null when the value is missing or malformed. */
export function parseAppleTeamId(raw: string | undefined): string | null {
  const id = (raw ?? "").trim().replace(PASTED_WRAPPING, "").trim().toUpperCase();
  return /^[A-Z0-9]{10}$/.test(id) ? id : null;
}
