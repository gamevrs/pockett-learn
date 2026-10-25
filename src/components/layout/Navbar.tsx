"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Menu, Moon, Sun, Volume2, VolumeX, X, Zap } from "lucide-react";

const ICON_BTN = "grid h-8 w-8 place-items-center rounded-md text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { currentStreak, levelFor, setSoundEnabled, useProgress } from "@/data/progress/store";
import { displayNameOf, useAuth } from "@/data/auth/store";

const LINKS = [
  { href: "/learn", label: "Foundations" },
  { href: "/projects", label: "Projects" },
  { href: "/dashboard", label: "Progress" },
  { href: "/playground", label: "Sandbox" },
];

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 shrink-0">
        <rect width="24" height="24" rx="6" fill="var(--primary)" />
        <path d="M7 8.5 10.5 12 7 15.5" fill="none" stroke="var(--primary-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12.5 16h4.5" stroke="var(--primary-ink)" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span className="text-[1.05rem] font-semibold tracking-[-0.02em]">pockett</span>
    </span>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const progress = useProgress();
  const [open, setOpen] = useState(false);
  const auth = useAuth();
  const rank = levelFor(progress.xp);
  const streak = currentStreak(progress);

  // The lesson workspace is a full-screen tool; it has its own slim header.
  if (/^\/projects\/[^/]+\/[^/]+/.test(pathname) && !pathname.endsWith("/play")) return null;
  if (/^\/learn\/[^/]+/.test(pathname)) return null;

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 rounded-full border border-line bg-surface/90 pl-5 pr-2 shadow-[var(--shadow)] backdrop-blur-md">
        <div className="flex items-center gap-6">
          <Link href="/" aria-label="pockett home" onClick={() => setOpen(false)}>
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => {
              const active = pathname === l.href || pathname.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
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

        <div className="flex items-center gap-1.5">
          <Link
            href="/dashboard"
            className="mr-1 hidden items-center gap-3 rounded-md px-2 py-1.5 text-xs font-medium tabular-nums text-ink-2 transition-colors hover:bg-surface-2 sm:flex"
            title={`${rank.rank} · level ${rank.level}`}
          >
            <span className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5 text-brand" />
              {progress.xp} XP
            </span>
            <span className="flex items-center gap-1">
              <Flame className={`h-3.5 w-3.5 ${streak > 0 ? "text-brand" : "text-ink-3"}`} />
              {streak}
            </span>
          </Link>

          <button
            onClick={() => setSoundEnabled(!progress.soundEnabled)}
            aria-label={progress.soundEnabled ? "Mute sounds" : "Unmute sounds"}
            className={`${ICON_BTN} hidden sm:grid`}
          >
            {progress.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <button
            onClick={toggleTheme}
            aria-label="Toggle light and dark theme"
            className={ICON_BTN}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {auth.status === "signed-in" ? (
            <Link
              href="/account"
              aria-label="Your account"
              title={displayNameOf(auth.user)}
              className="ml-1 grid h-8 w-8 place-items-center rounded-full border border-line-strong bg-surface-2 text-xs font-semibold text-ink"
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
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className={`${ICON_BTN} md:hidden`}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="mx-auto mt-2 max-w-6xl rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow)] md:hidden">
          {LINKS.concat([{ href: "/account", label: auth.status === "signed-in" ? "Account" : "Sign in" }, { href: "/", label: "Home" }]).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2.5 text-[0.95rem] text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center gap-4 border-t border-line px-3 pt-3 text-xs tabular-nums text-ink-2">
            <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-brand" />{progress.xp} XP</span>
            <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-brand" />{streak} day streak</span>
          </div>
        </nav>
      )}
    </header>
  );
}
