/** Pure simulations behind the caching widgets (no React, so Node can test them). */

/** Deterministic pseudo-random number in [0, 1) from a seed (mulberry32). */
export function rand(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// ───────────────────────────── stampede ─────────────────────────────

export const STAMPEDE = { keys: 24, rate: 5, fetchSecs: 2, capacity: 15, seconds: 40 };

export interface StampedeSim {
  /** database queries started in each second */
  queries: number[];
  peak: number;
  total: number;
  overSeconds: number;
  /** requests that had to wait for a rebuild */
  waited: number;
}

/**
 * 24 cache entries (think: 24 popular pages) are all filled at second 0, for example right after
 * a deploy or a cache flush. Each entry gets 5 requests a second and takes 2 seconds to rebuild
 * from the database. Without a lock every request that arrives while the entry is being rebuilt
 * runs the query too.
 */
export function stampede(ttl: number, lock: boolean, jitter: boolean, early: boolean): StampedeSim {
  const { keys, rate, fetchSecs, seconds, capacity } = STAMPEDE;
  const queries = new Array<number>(seconds).fill(0);
  let waited = 0;
  const life = (k: number, gen: number) => ttl * (1 + (jitter ? (rand(k * 977 + gen * 131 + 7) - 0.5) * 0.6 : 0));
  for (let k = 0; k < keys; k++) {
    let gen = 0;
    let expireAt = life(k, gen);
    let fetchEnd: number | null = null;
    let refreshing = false;
    for (let s = 0; s < seconds; s++) {
      let startedNow = false;
      if (fetchEnd !== null && s >= fetchEnd) {
        gen += 1;
        expireAt = fetchEnd + life(k, gen);
        fetchEnd = null;
        refreshing = false;
      }
      if (fetchEnd === null) {
        if (early && s >= expireAt - 0.2 * ttl && s < expireAt) {
          fetchEnd = s + fetchSecs;
          refreshing = true;
          startedNow = true;
        } else if (s >= expireAt) {
          fetchEnd = s + fetchSecs;
          refreshing = false;
          startedNow = true;
        }
      }
      if (fetchEnd !== null) {
        const userFacing = !refreshing || s >= expireAt;
        if (startedNow) queries[s] += refreshing && !userFacing ? 1 : lock ? 1 : rate;
        else if (userFacing && !lock) queries[s] += rate;
        if (userFacing) waited += rate;
      }
    }
  }
  const peak = Math.max(...queries);
  return { queries, peak, total: queries.reduce((a, b) => a + b, 0), overSeconds: queries.filter((q) => q > capacity).length, waited };
}

// ───────────────────────────── hit rate ─────────────────────────────

/** Weight of the key with popularity rank r (1-based) when skewed: 1/r. */
export interface HitSim {
  /** hit rate (0-1) in each window of requests */
  windows: number[];
  overall: number;
}

export const HIT_REQUESTS = 6000;
export const HIT_WINDOW = 200;

/**
 * A least-recently-used cache of `size` entries over `keys` distinct keys. Popular keys are
 * requested more often when `skewed` (key r is asked for with weight 1/r); otherwise every key is
 * equally likely. `warm` starts with the most popular keys already loaded.
 */
export function hitRate(keys: number, size: number, skewed: boolean, warm: boolean): HitSim {
  const cum: number[] = [];
  let sum = 0;
  for (let r = 1; r <= keys; r++) {
    sum += skewed ? 1 / r : 1;
    cum.push(sum);
  }
  const draw = (u: number) => {
    const x = u * sum;
    let lo = 0;
    let hi = keys - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] >= x) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  };
  const cache = new Map<number, true>();
  if (warm) for (let k = 0; k < Math.min(size, keys); k++) cache.set(k, true);
  const windows: number[] = [];
  let hits = 0;
  let total = 0;
  let wHits = 0;
  for (let i = 0; i < HIT_REQUESTS; i++) {
    const k = draw(rand(i * 7919 + keys * 31 + 11));
    if (cache.has(k)) {
      hits += 1;
      wHits += 1;
      cache.delete(k);
      cache.set(k, true);
    } else {
      if (cache.size >= size) cache.delete(cache.keys().next().value as number);
      cache.set(k, true);
    }
    total += 1;
    if (total % HIT_WINDOW === 0) {
      windows.push(wHits / HIT_WINDOW);
      wHits = 0;
    }
  }
  return { windows, overall: hits / total };
}
