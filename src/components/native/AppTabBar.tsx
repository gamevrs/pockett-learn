"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CircleUser, Hammer, House, SquareTerminal } from "lucide-react";
import { nativePlatform, onNative, useIsNativeApp } from "@/lib/native/app";

/**
 * The app's bottom tab bar: the site's top navigation, as the phone apps show it. Only rendered inside the iOS and
 * Android apps (the web navbar and footer are hidden there by globals.css), drawn the way each platform draws its own:
 * a translucent bar with a tinted icon on iOS, a Material 3 navigation bar with a pill behind the chosen icon on Android.
 *
 * Progress (/dashboard), the brand page and the legal pages sit under Account, which links to each of them.
 */
const TABS = [
  { href: "/", label: "Home", icon: House, match: (p: string) => p === "/" },
  { href: "/learn", label: "Learn", icon: BookOpen, match: (p: string) => p === "/learn" || p.startsWith("/learn/") },
  { href: "/projects", label: "Projects", icon: Hammer, match: (p: string) => p === "/projects" || p.startsWith("/projects/") },
  { href: "/playground", label: "Sandbox", icon: SquareTerminal, match: (p: string) => p.startsWith("/playground") },
  {
    href: "/account",
    label: "Account",
    icon: CircleUser,
    match: (p: string) => ["/account", "/dashboard", "/brand", "/privacy", "/terms"].some((r) => p === r || p.startsWith(r + "/")),
  },
];

export function AppTabBar() {
  const native = useIsNativeApp();
  return native ? <TabBar /> : null;
}

function TabBar() {
  const pathname = usePathname();
  const [keyboard, setKeyboard] = useState(false);

  // out of the way while typing: the keyboard is where the bar would be
  useEffect(() => {
    const offShow = onNative("Keyboard", "keyboardWillShow", () => setKeyboard(true));
    const offHide = onNative("Keyboard", "keyboardWillHide", () => setKeyboard(false));
    return () => {
      offShow();
      offHide();
    };
  }, []);

  // a lesson or a project's editor is full screen, with its own bar
  const fullScreen = (/^\/projects\/[^/]+\/[^/]+/.test(pathname) && !pathname.endsWith("/play")) || /^\/learn\/[^/]+/.test(pathname);
  if (keyboard || fullScreen) return null;

  return (
    <nav aria-label="Main" className={`app-tabbar app-tabbar-${nativePlatform() ?? "ios"}`}>
      {TABS.map((t) => {
        const active = t.match(pathname);
        const Icon = t.icon;
        return (
          <Link key={t.href} href={t.href} aria-current={active ? "page" : undefined} className="app-tab">
            <span className="app-tab-icon">
              <Icon aria-hidden strokeWidth={active ? 2.25 : 1.75} />
            </span>
            <span className="app-tab-label">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
