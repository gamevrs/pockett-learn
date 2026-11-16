"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { callNative, isNativeApp, nativePlatform, onNative, openExternal } from "@/lib/native/app";
import { rescheduleReminder } from "@/lib/native/reminder";
import { getProgress, subscribeProgress } from "@/data/progress/store";
import { codeFrameOrigin } from "@/engine/frame/origin";

/**
 * Wires the site into the native app (mobile/). Renders nothing, and does nothing at all in a browser: every effect
 * returns straight away unless the page is running inside the iOS or Android app.
 *
 *  - status bar text follows the site's theme
 *  - links to other sites open in the in-app browser, so the app never turns into a browser for someone else's page
 *  - a lesson link opened from outside (universal link / app link, or a reminder tap) navigates inside the app
 *  - the streak reminder is rescheduled when the app opens and when a lesson is finished
 */
export function NativeBridge() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeApp()) return;
    void callNative("SplashScreen", "hide", { fadeOutDuration: 200 });

    // status bar: light text on the dark theme, dark text on the light one
    const root = document.documentElement;
    const syncBar = async () => {
      await callNative("StatusBar", "setStyle", { style: root.classList.contains("dark") ? "DARK" : "LIGHT" });
      // Android, older WebViews: the bars are drawn over the window, not the page, so paint it the page's colour
      if (nativePlatform() === "android") {
        const bg = getComputedStyle(document.body).backgroundColor;
        const rgb = bg.match(/\d+/g)?.slice(0, 3).map(Number);
        if (rgb?.length === 3) await callNative("AppChrome", "setBackgroundColor", { color: "#" + rgb.map((n) => n.toString(16).padStart(2, "0")).join("") });
      }
    };
    void syncBar();
    const themeWatch = new MutationObserver(() => void syncBar());
    themeWatch.observe(root, { attributes: true, attributeFilter: ["class"] });

    // links to other origins open in the in-app browser (the native shell would otherwise hand them to Safari/Chrome)
    const frame = codeFrameOrigin();
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      let url: URL;
      try {
        url = new URL(a.href, window.location.href);
      } catch {
        return;
      }
      if (url.protocol !== "https:" && url.protocol !== "http:") return; // mailto: and friends go to the system
      if (url.origin === window.location.origin || url.origin === frame) return;
      e.preventDefault();
      openExternal(url.href);
    };
    document.addEventListener("click", onClick, true);

    // a link into the app (www.pockett.ai/learn/…, /projects/…) or a tapped reminder: go there, client-side
    const go = (raw: unknown) => {
      if (typeof raw !== "string") return;
      try {
        const url = new URL(raw, window.location.href);
        if (url.host !== window.location.host) return;
        const target = url.pathname + url.search + url.hash;
        if (target !== window.location.pathname + window.location.search + window.location.hash) router.push(target);
      } catch {
        /* not a URL */
      }
    };
    void callNative<{ url?: string }>("App", "getLaunchUrl").then((r) => go(r?.url));
    const offUrl = onNative("App", "appUrlOpen", (d) => go((d as { url?: string } | null)?.url));
    const offTap = onNative("LocalNotifications", "localNotificationActionPerformed", (d) =>
      go((d as { notification?: { extra?: { path?: string } } } | null)?.notification?.extra?.path),
    );

    // the reminder skips any day that already has a finished lesson, so reschedule when that changes
    let lastDay = getProgress().lastActiveDate;
    void rescheduleReminder(getProgress());
    const offProgress = subscribeProgress(() => {
      const p = getProgress();
      if (p.lastActiveDate === lastDay) return;
      lastDay = p.lastActiveDate;
      void rescheduleReminder(p);
    });
    const offResume = onNative("App", "appStateChange", (d) => {
      if ((d as { isActive?: boolean } | null)?.isActive) void rescheduleReminder(getProgress());
    });

    return () => {
      themeWatch.disconnect();
      document.removeEventListener("click", onClick, true);
      offUrl();
      offTap();
      offProgress();
      offResume();
    };
  }, [router]);

  return null;
}
