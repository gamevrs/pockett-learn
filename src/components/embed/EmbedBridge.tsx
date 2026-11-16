"use client";

import { useEffect } from "react";
import { getProgress, subscribeProgress } from "@/data/progress/store";
import { showTheme } from "@/lib/theme/ThemeProvider";
import { bootEmbed } from "@/lib/embed/boot";
import { inApp, postToApp, sitePath } from "@/lib/embed/host";

// Before React renders anything on the page: merge the app's progress, take over its session (see lib/embed/boot.ts).
bootEmbed();

/**
 * The page's side of the phone app's web view, on every /embed page. Renders nothing; in a browser it only listens for
 * theme messages, so an /embed page opened in a browser still works like the site.
 *
 *  - every progress write is sent to the app as {type:"progress"} (several writes in one tick are sent once)
 *  - a tap on a link never navigates the web view: a page of this site becomes {type:"navigate", path} (the app opens
 *    its own screen or another embed), any other address becomes {type:"external", url}
 *  - {type:"theme"} from the app switches the theme without touching the browser's own saved choice
 */
export function EmbedBridge() {
  useEffect(() => {
    const onMessage = (e: Event) => {
      const data = (e as MessageEvent).data;
      if (typeof data !== "string") return; // the code frame's own messages are objects
      try {
        const msg = JSON.parse(data) as { type?: unknown; theme?: unknown };
        if (msg?.type === "theme" && (msg.theme === "dark" || msg.theme === "light")) showTheme(msg.theme);
      } catch {
        /* not ours */
      }
    };
    window.addEventListener("message", onMessage);
    // react-native-webview delivers postMessage on document on Android
    document.addEventListener("message", onMessage);
    if (!inApp()) {
      return () => {
        window.removeEventListener("message", onMessage);
        document.removeEventListener("message", onMessage);
      };
    }

    let queued = false;
    const sendProgress = () => {
      queued = false;
      postToApp({ type: "progress", data: getProgress() });
    };
    const offProgress = subscribeProgress(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(sendProgress);
    });
    sendProgress(); // the merged state the page started from

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(a.getAttribute("href")!, window.location.href);
      } catch {
        return;
      }
      if (url.origin === window.location.origin) {
        // a jump within this page (#section) stays a jump
        if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;
        e.preventDefault();
        e.stopPropagation(); // before next/link sees it: the web view must not navigate
        postToApp({ type: "navigate", path: sitePath(url.pathname) + url.search + url.hash });
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      postToApp({ type: "external", url: url.href });
    };
    // capture on window: runs before React's own listeners on the root
    window.addEventListener("click", onClick, true);

    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("message", onMessage);
      window.removeEventListener("click", onClick, true);
      offProgress();
    };
  }, []);
  return null;
}
