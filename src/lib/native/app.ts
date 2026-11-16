"use client";

import { useSyncExternalStore } from "react";

/**
 * The bridge to the native iOS and Android apps (mobile/, a Capacitor shell that loads this site).
 *
 * Inside the app, Capacitor injects `window.Capacitor` before the page's own scripts run. Everywhere else it is absent,
 * so every function here is a silent no-op in a browser: nothing about the website changes. The site does not bundle
 * @capacitor/core; it talks to the injected bridge directly, which keeps this file the whole integration.
 */

interface CapacitorBridge {
  isNativePlatform(): boolean;
  getPlatform(): string;
  nativePromise<T = unknown>(plugin: string, method: string, options?: object): Promise<T>;
  addListener(plugin: string, event: string, callback: (data: unknown) => void): { remove(): Promise<void> | void };
}

function bridge(): CapacitorBridge | null {
  if (typeof window === "undefined") return null;
  const cap = (window as unknown as { Capacitor?: Partial<CapacitorBridge> }).Capacitor;
  try {
    return cap?.isNativePlatform?.() && typeof cap.nativePromise === "function" ? (cap as CapacitorBridge) : null;
  } catch {
    return null;
  }
}

/** True only inside the iOS or Android app. */
export function isNativeApp(): boolean {
  return bridge() !== null;
}

export function nativePlatform(): "ios" | "android" | null {
  const p = bridge()?.getPlatform();
  return p === "ios" || p === "android" ? p : null;
}

const noopSubscribe = () => () => {};

/** False on the server, during hydration and in every browser; true inside the app once hydrated. */
export function useIsNativeApp(): boolean {
  return useSyncExternalStore(noopSubscribe, isNativeApp, () => false);
}

/** Call a native plugin method. Resolves null outside the app or when the call fails (an older app build, say). */
export async function callNative<T = unknown>(plugin: string, method: string, options?: object): Promise<T | null> {
  const cap = bridge();
  if (!cap) return null;
  try {
    return await cap.nativePromise<T>(plugin, method, options ?? {});
  } catch {
    return null;
  }
}

/** Listen to a native plugin event. Returns the unsubscribe function (a no-op outside the app). */
export function onNative(plugin: string, event: string, callback: (data: unknown) => void): () => void {
  const cap = bridge();
  if (!cap) return () => {};
  try {
    const handle = cap.addListener(plugin, event, callback);
    return () => void handle.remove();
  } catch {
    return () => {};
  }
}

/** A tap of the phone's vibration motor for an answer or a finished lesson. */
export function haptic(kind: "correct" | "wrong" | "complete") {
  if (!isNativeApp()) return;
  if (kind === "wrong") void callNative("Haptics", "notification", { type: "ERROR" });
  else void callNative("Haptics", "notification", { type: "SUCCESS" });
  if (kind === "complete") setTimeout(() => void callNative("Haptics", "impact", { style: "HEAVY" }), 180);
}

/** The system share sheet for a link on this site. */
export async function shareLink(title: string, path: string) {
  const url = new URL(path, window.location.origin).href;
  await callNative("Share", "share", { title, text: `${title} on pockett`, url, dialogTitle: "Share this lesson" });
}

/** Open a page of another site in the in-app browser (Safari View Controller / Custom Tabs). */
export function openExternal(url: string) {
  void callNative("Browser", "open", { url, presentationStyle: "popover" });
}
