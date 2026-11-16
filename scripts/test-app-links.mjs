// The www.pockett.ai links the phone apps open, held from both ends.
//   node scripts/test-app-links.mjs
//
// A universal link / app link works only when the app claims a path (the iOS entitlements, the Android manifest) AND the
// site's association file grants it (src/lib/app-links.ts, served from src/app/.well-known). Claimed on one side only,
// the link silently opens the browser. This keeps the two in step, and the apps' identifiers with them.
process.env.NODE_NO_WARNINGS = "1";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(path.join(REPO, p), "utf8");
const links = await import(pathToFileURL(path.join(REPO, "src/lib/app-links.ts")).href);
const { APP_LINK_HOST, APP_LINK_PATHS, IOS_BUNDLE_ID, ANDROID_PACKAGE, DEFAULT_APPLE_TEAM_ID } = links;

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  ok  ${name}`);
}

check("the apps carry the identifiers the association files name", () => {
  assert.match(read("mobile/capacitor.config.ts"), new RegExp(`appId: "${IOS_BUNDLE_ID.replace(/\./g, "\\.")}"`));
  const pbx = read("mobile/ios/App/App.xcodeproj/project.pbxproj");
  const ids = [...pbx.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g)].map((m) => m[1]);
  assert.ok(ids.length >= 2, "bundle id set for Debug and Release");
  assert.deepEqual([...new Set(ids)], [IOS_BUNDLE_ID]);
  const teams = [...pbx.matchAll(/DEVELOPMENT_TEAM = ([^;]+);/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(teams)], [DEFAULT_APPLE_TEAM_ID]);
  const gradle = read("mobile/android/app/build.gradle");
  assert.match(gradle, new RegExp(`applicationId "${ANDROID_PACKAGE.replace(/\./g, "\\.")}"`));
  assert.match(gradle, new RegExp(`namespace = "${ANDROID_PACKAGE.replace(/\./g, "\\.")}"`));
});

check("iOS claims the domain the association file is served from, and only that one", () => {
  const ent = read("mobile/ios/App/App/App.entitlements");
  const domains = [...ent.matchAll(/<string>(applinks:[^<]+)<\/string>/g)].map((m) => m[1]);
  assert.deepEqual(domains, [`applinks:${APP_LINK_HOST}`]);
  assert.match(read("mobile/ios/App/App.xcodeproj/project.pbxproj"), /CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;/);
});

check("Android claims exactly the paths the site grants, verified", () => {
  const manifest = read("mobile/android/app/src/main/AndroidManifest.xml");
  const filter = manifest.match(/<intent-filter android:autoVerify="true">([\s\S]*?)<\/intent-filter>/);
  assert.ok(filter, "an autoVerify intent filter");
  const data = [...filter[1].matchAll(/<data ([^>]+)\/>/g)].map((m) => Object.fromEntries([...m[1].matchAll(/android:(\w+)="([^"]*)"/g)].map((a) => [a[1], a[2]])));
  for (const d of data) {
    assert.equal(d.scheme, "https");
    assert.equal(d.host, APP_LINK_HOST);
  }
  assert.deepEqual(data.map((d) => d.pathPrefix).sort(), [...APP_LINK_PATHS].sort());
});

check("never claims the account page, where the email links land in the browser", () => {
  const all = JSON.stringify(links.appleAppSiteAssociation("ABCDE12345")) + read("mobile/android/app/src/main/AndroidManifest.xml");
  assert.ok(!all.includes("/account"));
  assert.ok(!APP_LINK_PATHS.some((p) => p === "/" || p === "/*"), "never the whole site");
});

check("builds an apple-app-site-association in both formats", () => {
  const file = links.appleAppSiteAssociation("ABCDE12345");
  const [modern, legacy] = file.applinks.details;
  assert.deepEqual(modern.appIDs, ["ABCDE12345.com.gameverse.pockett"]);
  assert.deepEqual(modern.components.map((c) => c["/"]), ["/learn/*", "/projects/*"]);
  assert.deepEqual(legacy, { appID: "ABCDE12345.com.gameverse.pockett", paths: ["/learn/*", "/projects/*"] });
});

check("builds assetlinks.json for the Android package", () => {
  const fp = Array.from({ length: 32 }, () => "AB").join(":");
  assert.deepEqual(links.androidAssetLinks([fp]), [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: { namespace: "android_app", package_name: "com.gameverse.pockett", sha256_cert_fingerprints: [fp] },
    },
  ]);
});

check("accepts only well-formed configuration, including values pasted with quotes", () => {
  assert.equal(links.parseAppleTeamId(" 2fw4z8t843 "), "2FW4Z8T843");
  assert.equal(links.parseAppleTeamId(`"2FW4Z8T843"`), "2FW4Z8T843");
  assert.equal(links.parseAppleTeamId("short"), null);
  assert.equal(links.parseAppleTeamId(undefined), null);
  const a = Array.from({ length: 32 }, () => "ab").join(":");
  const b = Array.from({ length: 32 }, () => "0C").join(":");
  assert.deepEqual(links.parseFingerprints(`${a}, not-a-fingerprint`), [a.toUpperCase()]);
  assert.deepEqual(links.parseFingerprints(`'${a}', '${b}'`), [a.toUpperCase(), b]);
  assert.deepEqual(links.parseFingerprints(`["${b}"]`), [b]);
  assert.deepEqual(links.parseFingerprints(undefined), []);
});

check("the .well-known routes read the one shared definition", () => {
  for (const route of ["src/app/.well-known/apple-app-site-association/route.ts", "src/app/.well-known/assetlinks.json/route.ts"]) {
    const src = read(route);
    assert.match(src, /from "@\/lib\/app-links"/);
    assert.match(src, /await connection\(\)/, "reads its env at request time");
  }
  assert.ok(!/^import /m.test(read("src/lib/app-links.ts")), "src/lib/app-links.ts stays import-free");
});

console.log(`\napp links: ${passed} checks passed`);
