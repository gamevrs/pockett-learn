import { useEffect, useState } from 'react';

import { useCatalogStore } from './catalog';
import { useInbox } from './inbox';
import { useProgress } from './progress';
import { useSettings } from './settings';

const STORES = [useSettings, useProgress, useCatalogStore, useInbox];

/** True once every persisted store has read its saved state, so the first screen never flashes defaults. */
export function useHydrated(): boolean {
  const [done, setDone] = useState(() => STORES.every((s) => s.persist.hasHydrated()));
  useEffect(() => {
    if (done) return;
    const check = () => {
      if (STORES.every((s) => s.persist.hasHydrated())) setDone(true);
    };
    const subs = STORES.map((s) => s.persist.onFinishHydration(check));
    check();
    return () => subs.forEach((u) => u());
  }, [done]);
  return done;
}
