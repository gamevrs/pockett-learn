"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Menu, Moon, Sun, Volume2, VolumeX, X, Zap } from "lucide-react";
import { useTheme } from "@/lib/theme/ThemeProvider";
import { currentStreak, levelFor, setSoundEnabled, useProgress } from "@/data/progress/store";
import { displayNameOf, useAuth } from "@/data/auth/store";

const LINKS = [
  { href: "/projects", label: "Projects" },
  { href: "/dashboard", label: "Progress" },
  { href: "/playground", label: "Sandbox" },
];

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span
        aria-hidden
        className="grid h-8 w-8 place-items-center rounded-[10px] bg-brand bg-brand-gradient text-[15px] font-black text-brand-ink"
      >
        {"{ }"}
      </span>
      <span className="font-display text-[1.35rem] tracking-tight">
        pockett<span className="text-brand">.</span>
      </span>
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

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-8">
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
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                    active ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className="hidden items-center gap-3 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-bold sm:flex"
            title={`${rank.rank} · level ${rank.level}`}
          >
            <span className="flex items-center gap-1 text-brand">
              <Zap className="h-3.5 w-3.5" fill="currentColor" />
              {progress.xp} XP
            </span>
            <span className={`flex items-center gap-1 ${streak > 0 ? "text-brand" : "text-ink-3"}`}>
              <Flame className="h-3.5 w-3.5" fill={streak > 0 ? "currentColor" : "none"} />
              {streak}
            </span>
          </Link>

          <button
            onClick={() => setSoundEnabled(!progress.soundEnabled)}
            aria-label={progress.soundEnabled ? "Mute sounds" : "Unmute sounds"}
            className="hidden h-9 w-9 place-items-center rounded-full border border-line bg-surface text-ink-2 transition-colors hover:text-ink sm:grid"
          >
            {progress.soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          <button
            onClick={toggleTheme}
            aria-label="Toggle light and dark theme"
            className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-ink-2 transition-colors hover:text-ink"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {auth.status === "signed-in" ? (
            <Link
              href="/account"
              aria-label="Your account"
              title={displayNameOf(auth.user)}
              className="bg-brand-gradient grid h-9 w-9 place-items-center rounded-full bg-brand text-sm font-black text-brand-ink"
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
            className="grid h-9 w-9 place-items-center rounded-full border border-line md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-line bg-bg px-4 py-3 md:hidden">
          {LINKS.concat([{ href: "/account", label: auth.status === "signed-in" ? "Account" : "Sign in" }, { href: "/", label: "Home" }]).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-3 text-base font-semibold text-ink-2 hover:bg-surface-2"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex items-center gap-3 px-3 text-sm font-bold">
            <span className="text-brand">{progress.xp} XP</span>
            <span className="text-brand">🔥 {streak}</span>
          </div>
        </nav>
      )}
    </header>
  );
}
