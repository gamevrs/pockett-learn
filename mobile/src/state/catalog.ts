import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import bundled from '~/fixtures/catalog.json';
import { indexCatalog, isCatalog, type Catalog, type CatalogIndex } from '~/lib/catalog';
import { SITE_URL } from '~/lib/site';

import { appStorage } from './storage';

/**
 * The catalog: fetched from /api/app/catalog and kept on the device, so Learn works offline. The app ships with
 * a copy built from the site's content (src/fixtures/catalog.json, scripts/make-catalog-fixture.mjs) so even the
 * first launch without a connection has every track.
 */
interface CatalogStore {
  catalog: Catalog;
  source: 'bundled' | 'site';
  fetchedAt: string | null;
  /** The site answers the app API (and so has the /embed pages). False on a site without them yet. */
  appApi: boolean;
  status: 'idle' | 'loading' | 'error';
  refresh: () => Promise<void>;
}

const BUNDLED = bundled as Catalog;

export const useCatalogStore = create<CatalogStore>()(
  persist(
    (set, get) => ({
      catalog: BUNDLED,
      source: 'bundled',
      fetchedAt: null,
      appApi: false,
      status: 'idle',
      refresh: async () => {
        if (get().status === 'loading') return;
        set({ status: 'loading' });
        try {
          const res = await fetch(`${SITE_URL}/api/app/catalog`, { headers: { accept: 'application/json' } });
          if (res.status === 404) {
            set({ status: 'idle', appApi: false });
            return;
          }
          if (!res.ok) throw new Error(`catalog ${res.status}`);
          const json: unknown = await res.json();
          if (!isCatalog(json)) throw new Error('catalog shape');
          set({ catalog: json, source: 'site', fetchedAt: new Date().toISOString(), appApi: true, status: 'idle' });
        } catch {
          set({ status: 'error' });
        }
      },
    }),
    {
      name: 'pockett.catalog',
      storage: appStorage,
      version: 1,
      partialize: (s) => ({ catalog: s.catalog, source: s.source, fetchedAt: s.fetchedAt, appApi: s.appApi }),
      // A cached catalog older than the bundled one (an app update shipped newer content) gives way to it.
      merge: (persisted, current) => {
        const p = persisted as Partial<CatalogStore> | undefined;
        if (!p?.catalog || !isCatalog(p.catalog) || p.source !== 'site') return { ...current, appApi: p?.appApi ?? false };
        return { ...current, ...p, status: 'idle' };
      },
    },
  ),
);

let cached: { catalog: Catalog; index: CatalogIndex } | null = null;

export function catalogIndex(catalog: Catalog): CatalogIndex {
  if (cached?.catalog !== catalog) cached = { catalog, index: indexCatalog(catalog) };
  return cached.index;
}

export function useCatalog(): CatalogIndex {
  return catalogIndex(useCatalogStore((s) => s.catalog));
}
