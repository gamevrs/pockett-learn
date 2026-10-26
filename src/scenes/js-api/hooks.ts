import { useMemo, useSyncExternalStore } from "react";

const subscribers = new Map<number, (cb: () => void) => () => void>();

function subscriberFor(every: number) {
  let sub = subscribers.get(every);
  if (!sub) {
    sub = (cb) => {
      const t = setInterval(cb, every);
      return () => clearInterval(t);
    };
    subscribers.set(every, sub);
  }
  return sub;
}

/** The current time (epoch ms), refreshed every `every` ms. Server renders see 0. */
export function useNow(every = 1000): number {
  const subscribe = useMemo(() => subscriberFor(every), [every]);
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / every) * every,
    () => 0,
  );
}
