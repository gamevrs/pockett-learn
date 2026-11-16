import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { DEFAULT_CONFIG, parseAppConfig, type AppConfig } from '~/lib/app-config';
import { SITE_URL } from '~/lib/site';

import { appStorage } from './storage';

export interface InboxItem {
  id: string;
  kind: 'announcement' | 'milestone';
  title: string;
  body: string;
  date: string;
  url?: string;
}

/**
 * /api/app/config (the update floor and the announcements) and the Notifications inbox: those announcements plus
 * milestones the app noted itself (an achievement earned), with what has been read.
 */
interface InboxStore {
  config: AppConfig;
  configAt: string | null;
  milestones: InboxItem[];
  read: string[];
  /** Achievement ids already announced (null until the first look, which announces nothing). */
  seenAchievements: string[] | null;
  noteAchievements: (earned: { id: string; title: string; earnedText: string }[]) => void;
  refreshConfig: () => Promise<void>;
  addMilestone: (item: Omit<InboxItem, 'kind'>) => void;
  markAllRead: () => void;
  clearMilestones: () => void;
}

export const useInbox = create<InboxStore>()(
  persist(
    (set, get) => ({
      config: DEFAULT_CONFIG,
      configAt: null,
      milestones: [],
      read: [],
      seenAchievements: null,
      noteAchievements: (earned) => {
        const seen = get().seenAchievements;
        const ids = earned.map((a) => a.id);
        if (seen === null) {
          set({ seenAchievements: ids });
          return;
        }
        const fresh = earned.filter((a) => !seen.includes(a.id));
        if (!fresh.length) return;
        const date = new Date().toISOString();
        set({
          seenAchievements: [...seen, ...fresh.map((a) => a.id)],
          milestones: [...fresh.map((a) => ({ id: `achievement-${a.id}`, kind: 'milestone' as const, title: a.title, body: a.earnedText, date })), ...get().milestones].slice(0, 50),
        });
      },
      refreshConfig: async () => {
        try {
          const res = await fetch(`${SITE_URL}/api/app/config`, { headers: { accept: 'application/json' } });
          if (!res.ok) return;
          const config = parseAppConfig(await res.json());
          if (config) set({ config, configAt: new Date().toISOString() });
        } catch {
          /* offline: keep the last config */
        }
      },
      addMilestone: (item) => {
        if (get().milestones.some((m) => m.id === item.id)) return;
        set({ milestones: [{ ...item, kind: 'milestone' as const }, ...get().milestones].slice(0, 50) });
      },
      markAllRead: () => set({ read: inboxItems(get()).map((i) => i.id) }),
      clearMilestones: () => set({ milestones: [], seenAchievements: null }),
    }),
    { name: 'pockett.inbox', storage: appStorage, version: 1, partialize: (s) => ({ config: s.config, configAt: s.configAt, milestones: s.milestones, read: s.read, seenAchievements: s.seenAchievements }) },
  ),
);

export function inboxItems(s: Pick<InboxStore, 'config' | 'milestones'>): InboxItem[] {
  const announcements: InboxItem[] = s.config.announcements.map((a) => ({ ...a, kind: 'announcement' }));
  return [...announcements, ...s.milestones].sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0));
}

export function useUnreadCount(): number {
  return useInbox((s) => {
    const read = new Set(s.read);
    return inboxItems(s).filter((i) => !read.has(i.id)).length;
  });
}
