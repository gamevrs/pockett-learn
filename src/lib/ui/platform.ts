"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

interface NavigatorWithUAData extends Navigator {
  userAgentData?: { platform?: string };
}

/** True on macOS and iPadOS/iOS, where shortcuts use ⌘ instead of Ctrl. */
export function detectMac(nav: NavigatorWithUAData = navigator): boolean {
  const platform = nav.userAgentData?.platform || nav.platform || "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/** False during SSR and hydration (so markup matches), then the real answer. */
export function useIsMac(): boolean {
  return useSyncExternalStore(noopSubscribe, () => detectMac(), () => false);
}

/** Labels for the Run / Submit shortcuts on this platform: "Ctrl" (Windows, Linux) or "⌘" (macOS). */
export function useShortcuts() {
  const mac = useIsMac();
  const mod = mac ? "⌘" : "Ctrl";
  return {
    mod,
    /** Compact keycap text for a button: "Ctrl ↵" / "⌘ ↵". */
    runKeys: `${mod} ↵`,
    submitKeys: `${mod} ⇧ ↵`,
    /** Sentence form for tooltips and help text: "Ctrl + Enter". */
    runText: `${mod} + Enter`,
    submitText: `${mod} + Shift + Enter`,
  };
}
