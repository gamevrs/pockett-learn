"use client";

import { PROJECTS } from "@/content";
import { flattenLessons } from "@/engine/types";
import { getProgress, replaceProgress } from "@/data/progress/store";
import { mergeProgressStates } from "@/data/progress/merge";
import { EMPTY_PROGRESS, normalizeAudio, type ProgressState } from "@/data/progress/types";
import { getSupabase } from "@/data/supabase/client";
import { appHost, postToApp, type AppHost } from "./host";

/**
 * Applies what the phone app injected (window.__POCKETT_APP__) before anything on the page reads it. Runs once, when the
 * embed layout's client code is first evaluated, which is before React renders the player, so the player's first read
 * of progress already includes the app's copy.
 *
 *  - progress: merged into this web view's pockett_progress_v2 with the site's own rules (newest wins, nothing lost)
 *  - session: the app owns sign-in. The web view's own stored session is dropped and the app's is set, so CloudSync
 *    syncs progress for exactly the account the app is signed in to (or for nobody, as a guest)
 *  - theme: applied by the head script in app/layout.tsx, before first paint
 */

const AUTH_STORAGE_KEY = "pockett_auth"; // src/data/supabase/client.ts

let booted = false;

function validProgress(raw: unknown): ProgressState | null {
  if (!raw || typeof raw !== "object" || (raw as { version?: unknown }).version !== 2) return null;
  const p = raw as Partial<ProgressState>;
  const record = (v: unknown) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
  return {
    ...EMPTY_PROGRESS,
    ...p,
    completed: record(p.completed) as ProgressState["completed"],
    drafts: record(p.drafts) as ProgressState["drafts"],
    draftsAt: record(p.draftsAt) as ProgressState["draftsAt"],
    attempts: record(p.attempts) as ProgressState["attempts"],
    hintsSeen: record(p.hintsSeen) as ProgressState["hintsSeen"],
    audio: normalizeAudio(p.audio),
  };
}

const PROJECT_XP = new Map<string, number>();
for (const p of PROJECTS) for (const l of flattenLessons(p)) PROJECT_XP.set(l.id, l.xp);

function mergeAppProgress(incoming: ProgressState) {
  const local = getProgress();
  const merged = mergeProgressStates(local, incoming, (id) => PROJECT_XP.get(id) ?? 0);
  const needsFoundations = Object.keys(merged.completed).some((id) => id.startsWith("fnd-"));
  if (!needsFoundations) {
    replaceProgress(merged);
    return;
  }
  // Foundations content is large and loaded lazily (as in data/progress/sync.ts). Until it is here, keep the larger of
  // the two totals so the number never dips, then recompute exactly.
  replaceProgress({ ...merged, xp: Math.max(merged.xp, local.xp, incoming.xp) });
  void Promise.all([import("@/content/foundations"), import("@/learn/types")])
    .then(([{ FOUNDATIONS }, { trackLessons }]) => {
      const xp = new Map(PROJECT_XP);
      for (const l of trackLessons(FOUNDATIONS)) xp.set(l.id, l.xp);
      const now = getProgress();
      const exact = Object.keys(now.completed).reduce((sum, id) => sum + (xp.get(id) ?? 0), 0);
      if (exact !== now.xp) replaceProgress({ ...now, xp: exact });
    })
    .catch(() => {
      /* offline: the estimate stands until the next sync recomputes it */
    });
}

function applySession(session: AppHost["session"] | undefined) {
  const sb = getSupabase();
  if (!sb || !session?.access_token || !session.refresh_token) return;
  // Supabase rotates refresh tokens: whenever the page refreshes (setSession with an expired access token, or the
  // automatic refresh later), the app's stored pair is spent, so hand the new one back. Listening before setSession, so
  // its own event is not missed.
  let known = session.refresh_token;
  let signedIn = false;
  sb.auth.onAuthStateChange((event, s) => {
    if (s) {
      signedIn = true;
      if (s.refresh_token !== known) {
        known = s.refresh_token;
        postToApp({ type: "session", session: { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at } });
      }
    } else if (event === "SIGNED_OUT" && signedIn) {
      signedIn = false;
      postToApp({ type: "auth", event: "signedOut" });
    }
  });
  void sb.auth
    .setSession({ access_token: session.access_token, refresh_token: session.refresh_token })
    .then(({ data, error }) => {
      // the app's session is no longer valid (revoked, or its refresh token already spent): it should sign in again
      if (error || !data.session) postToApp({ type: "auth", event: "signedOut" });
    })
    .catch(() => postToApp({ type: "auth", event: "signedOut" }));
}

export function bootEmbed() {
  if (booted || typeof window === "undefined") return;
  booted = true;
  const app = appHost();
  if (!app) return; // opened in a browser: behave like the site
  try {
    // the app is the only source of sign-in: whatever this web view remembers from before must not sync anywhere
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    /* storage blocked: nothing was stored either */
  }
  const incoming = validProgress(app.progress);
  if (incoming) mergeAppProgress(incoming);
  applySession(app.session);
}
