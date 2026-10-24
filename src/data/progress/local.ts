import { EMPTY_PROGRESS, type ProgressRepository, type ProgressState } from "./types";

const KEY = "pockett_progress_v2";

export const localRepository: ProgressRepository = {
  load() {
    if (typeof window === "undefined") return EMPTY_PROGRESS;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return EMPTY_PROGRESS;
      const parsed = JSON.parse(raw) as Partial<ProgressState>;
      if (parsed.version !== 2) return EMPTY_PROGRESS;
      return { ...EMPTY_PROGRESS, ...parsed } as ProgressState;
    } catch {
      return EMPTY_PROGRESS;
    }
  },

  save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      console.error("Could not save progress locally", err);
    }
  },

  subscribe(listener) {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY || e.key === null) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  },
};
