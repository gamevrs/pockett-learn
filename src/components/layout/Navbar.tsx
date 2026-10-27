"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Menu, Moon, Sun, X, Zap } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { currentStreak, levelFor, useProgress } from "@/data/progress/store";
import { displayNameOf, useAuth } from "@/data/auth/store";
import { Logo } from "@/components/brand/Logo";
import { SoundControl } from "@/components/audio/SoundControl";

// 40px touch targets below `sm`, the original compact 32px from there up.
const ICON_BTN = "grid h-10 w-10 place-items-center rounded-md text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink sm:h-8 sm:w-8";

const LINKS = [
  { href: "/learn", label: "Foundations" },
  { href: "/projects", label: "Projects" },
  { href: "/dashboard", label: "Progress" },
  { href: "/playground", label: "Sandbox" },
];

/** Scrolling further than this (px) while the menu is open dismisses it. */
const SCROLL_DISMISS = 12;

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const progress = useProgress();
  const auth = useAuth();
  const rank = levelFor(progress.xp);
  const streak = currentStreak(progress);

  // The menu is "open for a route": navigating anywhere closes it, with no effect needed.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const menuId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  // The lesson workspace is a full-screen tool; it has its own slim header.
  const hidden = (/^\/projects\/[^/]+\/[^/]+/.test(pathname) && !pathname.endsWith("/play")) || /^\/learn\/[^/]+/.test(pathname);

  useEffect(() => {
    if (!open) return;
    // move focus into the menu so keyboard and screen-reader users land on its first link
    menuRef.current?.querySelector<HTMLElement>("a, button")?.focus({ preventScroll: true });

    const close = () => setOpenFor(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      close();
      buttonRef.current?.focus();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) close();
    };
    const startY = window.scrollY;
    const onScroll = () => {
      if (Math.abs(window.scrollY - startY) > SCROLL_DISMISS) close();
    };
    // the menu only exists below `md`; if the window grows past it, drop the open state
    const wide = window.matchMedia("(min-width: 768px)");
    const onWide = () => {
      if (wide.matches) close();
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    wide.addEventListener("change", onWide);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("scroll", onScroll);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  if (hidden) return null;

  const xpLabel = `${progress.xp} XP, ${streak} day streak`;
  const menuLinks = LINKS.concat([{ href: "/account", label: auth.status === "signed-in" ? "Account" : "Sign in" }]);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 px-4 pt-3 sm:px-6"
      onBlur={(e) => {
        // keyboard focus leaving the header (menu included) dismisses the menu
        if (open && e.relatedTarget && !headerRef.current?.contains(e.relatedTarget as Node)) setOpenFor(null);
      }}
    >
      <div className="relative mx-auto flex h-14 max-w-[69rem] items-center justify-between gap-4 rounded-full border border-line bg-surface/90 pl-5 pr-[7px] shadow-[var(--shadow)] backdrop-blur-md sm:pr-[11px]">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="pockett home" className="flex h-10 items-center sm:h-8" onClick={() => setOpenFor(null)}>
            <Logo />
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                    active ? "font-medium text-ink" : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <Link
            href="/dashboard"
            prefetch={false}
            aria-label={xpLabel}
            className="mr-1 hidden items-center gap-3 rounded-md px-2 py-1.5 text-xs font-medium tabular-nums text-ink-2 transition-colors hover:bg-surface-2 sm:flex"
            title={`${rank.rank} · level ${rank.level}`}
          >
            <span className="flex items-center gap-1" aria-hidden>
              <Zap className="h-3.5 w-3.5 text-brand" />
              {progress.xp} XP
            </span>
            <span className="flex items-center gap-1" aria-hidden>
              <Flame className={`h-3.5 w-3.5 ${streak > 0 ? "text-brand" : "text-ink-3"}`} />
              {streak}
            </span>
          </Link>

          <SoundControl variant="navbar" />

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            className={ICON_BTN}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
          </button>

          {auth.status === "signed-in" ? (
            <Link
              href="/account"
              aria-label="Your account"
              title={displayNameOf(auth.user)}
              className="ml-1 hidden h-8 w-8 place-items-center rounded-full border border-line-strong bg-surface-2 text-xs font-semibold text-ink sm:grid"
            >
              {displayNameOf(auth.user).slice(0, 1).toUpperCase()}
            </Link>
          ) : (
            <Link href="/account" className="btn btn-sm hidden sm:inline-flex">
              Sign in
            </Link>
          )}

          <Link href="/projects" className="btn btn-primary btn-sm hidden lg:inline-flex">
            Start building
          </Link>

          <button
            ref={buttonRef}
            type="button"
            onClick={() => setOpenFor(open ? null : pathname)}
            aria-label={open ? "Close menu" : "Menu"}
            aria-expanded={open}
            aria-controls={menuId}
            className={`${ICON_BTN} md:hidden`}
          >
            {open ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Always in the DOM so aria-controls resolves; the sound and theme controls stay in the bar above it. */}
      <nav
        ref={menuRef}
        id={menuId}
        aria-label="Menu"
        hidden={!open}
        className="mx-auto mt-2 max-w-[69rem] rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow)] md:!hidden"
      >
        {open &&
          menuLinks.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-md px-3 text-[0.95rem] hover:bg-surface-2 hover:text-ink ${active ? "font-medium text-ink" : "text-ink-2"}`}
              >
                {l.label}
              </Link>
            );
          })}
        {open && (
          <div className="mt-2 border-t border-line pt-1">
            <Link
              href="/dashboard"
              prefetch={false}
              aria-label={xpLabel}
              className="flex min-h-11 items-center gap-4 rounded-md px-3 text-xs tabular-nums text-ink-2 hover:bg-surface-2"
            >
              <span className="flex items-center gap-1" aria-hidden>
                <Zap className="h-3.5 w-3.5 text-brand" />
                {progress.xp} XP
              </span>
              <span className="flex items-center gap-1" aria-hidden>
                <Flame className="h-3.5 w-3.5 text-brand" />
                {streak} day streak
              </span>
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}
