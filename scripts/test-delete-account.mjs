// Headless checks for account deletion's pure parts (src/data/auth/deletion.ts): which local keys are cleared, the
// typed confirmation, and the plain-language error messages.
//   node scripts/test-delete-account.mjs
process.env.NODE_NO_WARNINGS = "1";
import assert from "node:assert/strict";
import { register } from "node:module";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(path.join(HERE, "ts-alias-hooks.mjs")).href);
const { DeletionFailed, LOCAL_PROGRESS_KEYS, clearLocalProgress, deletionErrorMessage, isConfirmed, isLocalProgressKey } = await import("../src/data/auth/deletion.ts");
const { CONTACT_EMAIL } = await import("../src/lib/legal.ts");

let n = 0;
const check = (name, fn) => {
  fn();
  n++;
  console.log("ok  ", name);
};

/** A minimal Storage: insertion-ordered, like the browser's. */
function memoryStorage(entries) {
  const m = new Map(Object.entries(entries));
  return {
    get length() {
      return m.size;
    },
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => void m.delete(k),
    keys: () => [...m.keys()].sort(),
  };
}

// every key the site writes today (grep localStorage in src/), split by what "remove progress" must do with it
const PROGRESS = [
  "pockett_progress_v2",
  "pockett_lesson_position_v2",
  "pockett_lesson_position_v1",
  "pockett_sandbox_code",
  "pockett_sandbox_code_javascript",
  "pockett_sandbox_code_sql",
  "pockett_sandbox_language",
];
const SETTINGS = ["pockett_theme_mode", "pockett_ws_layout_v1", "pockett_app_reminder", "pockett_keep_progress_on_sign_out"];
const OTHERS = ["pockett_auth", "something_else", "pockett_progress_v1x", "my_pockett_progress_v2"];

check("clears exactly the progress and code keys", () => {
  const all = Object.fromEntries([...PROGRESS, ...SETTINGS, ...OTHERS].map((k) => [k, "x"]));
  const s = memoryStorage(all);
  const removed = clearLocalProgress(s);
  assert.deepEqual(removed.sort(), [...PROGRESS].sort());
  assert.deepEqual(s.keys(), [...SETTINGS, ...OTHERS].sort());
});

check("every listed key counts as progress, settings and the session don't", () => {
  for (const k of LOCAL_PROGRESS_KEYS) assert.ok(isLocalProgressKey(k), k);
  for (const k of [...SETTINGS, ...OTHERS]) assert.ok(!isLocalProgressKey(k), k);
});

check("adjacent keys are all removed (no index skipping while removing)", () => {
  const s = memoryStorage({ pockett_progress_v2: "1", pockett_sandbox_code: "2", pockett_sandbox_code_go: "3", pockett_theme_mode: "dark" });
  clearLocalProgress(s);
  assert.deepEqual(s.keys(), ["pockett_theme_mode"]);
});

check("no storage, or storage that throws, is not an error", () => {
  assert.deepEqual(clearLocalProgress(null), []);
  assert.deepEqual(clearLocalProgress(undefined), []);
  const throwing = {
    get length() {
      throw new Error("SecurityError");
    },
    key: () => null,
    removeItem: () => {},
  };
  assert.deepEqual(clearLocalProgress(throwing), []);
});

check("typed confirmation: DELETE in any case, nothing else", () => {
  for (const ok of ["DELETE", "delete", " Delete ", "DELETE\n"]) assert.ok(isConfirmed(ok), JSON.stringify(ok));
  for (const no of ["", "DELET", "DELETE!", "delete account", "yes"]) assert.ok(!isConfirmed(no), JSON.stringify(no));
});

check("wrong password", () => {
  const m = deletionErrorMessage("password", { name: "AuthApiError", message: "Invalid login credentials", status: 400, code: "invalid_credentials" });
  assert.equal(m, "That password isn't right. Nothing was deleted.");
});

check("network failures, both stages", () => {
  const auth = deletionErrorMessage("password", { name: "AuthRetryableFetchError", message: "Failed to fetch", status: 0 });
  assert.match(auth, /couldn't reach pockett/i);
  assert.match(auth, /Nothing was deleted/);
  // postgrest-js: { message: "TypeError: Failed to fetch" } with status 0; Safari says "Load failed"
  for (const message of ["TypeError: Failed to fetch", "TypeError: Load failed", "TypeError: NetworkError when attempting to fetch resource."]) {
    const del = deletionErrorMessage("delete", { message, code: "", status: 0 });
    assert.match(del, /lost the connection/i, message);
    assert.doesNotMatch(del, /Nothing was deleted/, "a lost answer may still have deleted the account");
  }
});

check("function missing (migration 0005 not applied) points at the email route", () => {
  const m = deletionErrorMessage("delete", {
    code: "PGRST202",
    message: "Could not find the function public.delete_my_account without parameters in the schema cache",
    status: 404,
  });
  assert.match(m, /isn't switched on yet/);
  assert.ok(m.includes(CONTACT_EMAIL));
});

check("expired or refused session", () => {
  assert.match(deletionErrorMessage("delete", { code: "42501", message: "Not signed in", status: 400 }), /sign-in has expired/);
  assert.match(deletionErrorMessage("delete", { code: "PGRST303", message: "JWT expired", status: 401 }), /sign-in has expired/);
  assert.match(deletionErrorMessage("delete", { code: "42501", message: "permission denied for function delete_my_account", status: 403 }), /sign-in has expired/);
});

check("rate limit", () => {
  assert.equal(deletionErrorMessage("password", { message: "Request rate limit reached", status: 429 }), "Too many attempts. Wait a minute and try again.");
});

check("anything else: plain message, email fallback, never the raw error", () => {
  const raw = 'update or delete on table "profiles" violates foreign key constraint';
  const m = deletionErrorMessage("delete", { code: "23503", message: raw, status: 409 });
  assert.ok(!m.includes(raw));
  assert.match(m, /nothing was deleted/i);
  assert.ok(m.includes(CONTACT_EMAIL));
  assert.match(deletionErrorMessage("password", "weird"), /couldn't check your password/i);
  assert.match(deletionErrorMessage("delete", null), /Something went wrong/);
});

check("DeletionFailed carries the step and the plain message", () => {
  const e = new DeletionFailed("password", { message: "Invalid login credentials", status: 400 });
  assert.ok(e instanceof Error);
  assert.equal(e.stage, "password");
  assert.equal(e.message, "That password isn't right. Nothing was deleted.");
});

console.log(`\n${n} checks passed`);
