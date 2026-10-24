export interface CompletedLesson {
  /** ISO timestamp */
  at: string;
  /** The learner's whole file at the moment they passed */
  code: string;
  attempts: number;
}

export interface ProgressState {
  version: 2;
  xp: number;
  streak: number;
  bestStreak: number;
  /** Local-time YYYY-MM-DD of the last completed lesson */
  lastActiveDate: string | null;
  completed: Record<string, CompletedLesson>;
  drafts: Record<string, string>;
  attempts: Record<string, number>;
  hintsSeen: Record<string, number>;
  soundEnabled: boolean;
}

/**
 * Storage seam. Today there is one implementation (localStorage). Moving to Supabase means
 * adding a second implementation of this interface (see supabase/migrations) and choosing it
 * in `getRepository()`; no component imports storage directly.
 */
export interface ProgressRepository {
  load(): ProgressState;
  save(state: ProgressState): void;
  /** Called when state changes from elsewhere (other tab, background sync). */
  subscribe(listener: () => void): () => void;
}

export const EMPTY_PROGRESS: ProgressState = {
  version: 2,
  xp: 0,
  streak: 0,
  bestStreak: 0,
  lastActiveDate: null,
  completed: {},
  drafts: {},
  attempts: {},
  hintsSeen: {},
  soundEnabled: true,
};
