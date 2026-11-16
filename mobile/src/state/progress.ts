import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { mergeProgress, type CompletionRow, type DraftRow, type ProfileRow } from '@site/data/progress/merge';
import { absorbPageProgress, EMPTY_PROGRESS, parseProgress, type ProgressState } from '~/lib/progress';

import { catalogIndex, useCatalogStore } from './catalog';
import { supabase, useSession } from './session';
import { appStorage } from './storage';

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'error';

/**
 * The learner's progress on this device: the site's pockett_progress_v2 object. Lessons write it (their
 * `progress` messages); it is injected into every lesson page. Signed in, the account's progress is read from
 * Supabase and merged in with the site's own merge (src/data/progress/merge.ts); the lesson pages' CloudSync does
 * the writing, exactly as on the web.
 */
interface ProgressStore {
  progress: ProgressState;
  sync: SyncStatus;
  syncedAt: string | null;
  /** Set when local progress was cleared: the next lesson page drops its own copy before it loads. */
  resetPending: boolean;
  fromPage: (page: ProgressState) => void;
  setAudio: (enabled: boolean) => void;
  clear: () => void;
  resetHandled: () => void;
  pull: () => Promise<void>;
}

export const useProgress = create<ProgressStore>()(
  persist(
    (set, get) => ({
      progress: EMPTY_PROGRESS,
      sync: 'local',
      syncedAt: null,
      resetPending: false,
      fromPage: (page) => set({ progress: absorbPageProgress(get().progress, page) }),
      setAudio: (enabled) => set({ progress: { ...get().progress, audio: { ...get().progress.audio, enabled, at: new Date().toISOString() } } }),
      clear: () => set({ progress: { ...EMPTY_PROGRESS, audio: get().progress.audio }, resetPending: true }),
      resetHandled: () => set({ resetPending: false }),
      pull: async () => {
        const uid = useSession.getState().user?.id;
        if (!uid) {
          set({ sync: 'local' });
          return;
        }
        set({ sync: 'syncing' });
        try {
          const [profile, completions, drafts] = await Promise.all([
            supabase.from('profiles').select('xp, streak, best_streak, last_active_date').eq('id', uid).maybeSingle(),
            supabase.from('lesson_completions').select('lesson_id, project_slug, code, attempts, completed_at, updated_at').eq('user_id', uid),
            supabase.from('lesson_drafts').select('lesson_id, code, hints_seen, updated_at').eq('user_id', uid),
          ]);
          if (profile.error || completions.error || drafts.error) throw profile.error ?? completions.error ?? drafts.error;
          const index = catalogIndex(useCatalogStore.getState().catalog);
          const xpOf = (id: string) => index.byId.get(id)?.lesson.xp ?? 0;
          const merged = mergeProgress(get().progress, (profile.data as ProfileRow | null) ?? null, (completions.data ?? []) as CompletionRow[], (drafts.data ?? []) as DraftRow[], xpOf);
          set({ progress: merged, sync: 'synced', syncedAt: new Date().toISOString() });
        } catch {
          set({ sync: 'error' });
        }
      },
    }),
    {
      name: 'pockett.progress',
      storage: appStorage,
      version: 1,
      partialize: (s) => ({ progress: s.progress, syncedAt: s.syncedAt, resetPending: s.resetPending }),
      merge: (persisted, current) => {
        const p = persisted as Partial<ProgressStore> | undefined;
        return { ...current, ...p, progress: parseProgress(p?.progress) ?? EMPTY_PROGRESS };
      },
    },
  ),
);
