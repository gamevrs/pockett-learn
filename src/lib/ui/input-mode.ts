"use client";

import { useSyncExternalStore } from "react";

const COARSE = "(pointer: coarse)";
const NO_HOVER = "(hover: none)";

function subscribe(listener: () => void) {
  const queries = [window.matchMedia(COARSE), window.matchMedia(NO_HOVER)];
  queries.forEach((q) => q.addEventListener("change", listener));
  return () => queries.forEach((q) => q.removeEventListener("change", listener));
}

/** True on phones and tablets: the main input is a finger, so there is no keyboard to drive with. */
export function readTouchPrimary(): boolean {
  return window.matchMedia(COARSE).matches || (window.matchMedia(NO_HOVER).matches && navigator.maxTouchPoints > 0);
}

/** False during SSR and hydration, then whether the primary input is touch. */
export function useTouchPrimary(): boolean {
  return useSyncExternalStore(subscribe, readTouchPrimary, () => false);
}
