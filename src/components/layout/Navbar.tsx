"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Code2,
  Terminal,
  Flame,
  Zap,
  Volume2,
  VolumeX,
  GraduationCap,
  Menu,
  X,
  ChevronDown,
  Compass,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import { getUserStats, toggleSound } from "@/lib/storage/progress";
import { sound } from "@/lib/sound/sound";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [stats, setStats] = useState({
    xp: 0,
    streak: 1,
    level: 1,
    soundEnabled: true,
  });

  useEffect(() => {
    setStats(getUserStats());

    const handleStorageChange = () => {
      setStats(getUserStats());
    };
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("pockett_progress_updated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("pockett_progress_updated", handleStorageChange);
    };
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleSoundToggle = () => {
    const nextState = toggleSound();
    setStats((prev) => ({ ...prev, soundEnabled: nextState }));
    if (nextState) {
      sound.playClick();
    }
  };

  const navLinks = [
    { href: "/learn/python", label: "Python Track", icon: Terminal },
    { href: "/playground", label: "Interactive Sandbox", icon: Code2 },
    { href: "/dashboard", label: "My Learning", icon: GraduationCap },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-xs transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Coursera-style Explore button */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            onClick={() => sound.playClick()}
            className="flex items-center gap-2 group"
          >
            <div className="w-9 h-9 rounded-lg bg-[#0056d2] flex items-center justify-center text-white shadow-xs group-hover:bg-[#0041b8] transition-colors">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline">
                <span className="font-extrabold text-xl tracking-tight text-[#0056d2] dark:text-blue-400">
                  pockett
                </span>
                <span className="font-bold text-xl text-slate-800 dark:text-white">
                  .ai
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium -mt-1 tracking-wide">
                Free Learning Platform
              </span>
            </div>
          </Link>

          {/* Coursera-style Explore dropdown pill */}
          <div className="hidden lg:flex items-center">
            <Link
              href="/learn/python"
              onClick={() => sound.playClick()}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#ebf3ff] dark:bg-blue-950/60 text-[#0056d2] dark:text-blue-400 hover:bg-[#dbe9fe] dark:hover:bg-blue-900/50 font-semibold text-xs tracking-wide transition-colors"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Explore Tracks</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => sound.playClick()}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                    isActive
                      ? "text-[#0056d2] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 font-bold"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Gamification Controls & Theme Toggle */}
        <div className="hidden sm:flex items-center gap-2.5">
          {/* Daily Streak */}
          <div
            title="Active Learning Streak"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-400 text-xs font-semibold"
          >
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
            <span>{stats.streak}d streak</span>
          </div>

          {/* Total XP & Level */}
          <div
            title={`Level ${stats.level} Learner`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-[#0056d2] dark:text-blue-400 text-xs font-semibold"
          >
            <Zap className="w-3.5 h-3.5 fill-[#0056d2] dark:fill-blue-400 text-[#0056d2] dark:text-blue-400" />
            <span>{stats.xp} XP</span>
            <span className="text-[10px] text-blue-600/70 dark:text-blue-300/70 border-l border-blue-200 dark:border-blue-800 pl-1.5 ml-0.5">
              Lv.{stats.level}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleSoundToggle}
            title={stats.soundEnabled ? "Mute interactive audio" : "Enable interactive audio"}
            className="p-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
          >
            {stats.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#0056d2] dark:text-blue-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Theme Toggle Button (Light/Dark) */}
          <ThemeToggle />

          {/* Primary Coursera-Style Blue Button */}
          <Link
            href="/learn/python/py-01-comments-print"
            onClick={() => sound.playClick()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0056d2] hover:bg-[#0041b8] text-white font-semibold text-xs tracking-wide transition-all shadow-xs"
          >
            <span>Start Free</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Header Actions */}
        <div className="flex sm:hidden items-center gap-2">
          <ThemeToggle />

          <button
            onClick={() => {
              sound.playClick();
              setMobileMenuOpen(!mobileMenuOpen);
            }}
            className="p-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-[#0056d2] dark:text-blue-400" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-4 space-y-3 shadow-md animate-in slide-in-from-top-2 duration-150">
          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => sound.playClick()}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-blue-50 dark:bg-blue-950/60 text-[#0056d2] dark:text-blue-400"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-[#0056d2] dark:text-blue-400" />
                    <span>{link.label}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </Link>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 font-medium border border-amber-200 dark:border-amber-800">
                <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                {stats.streak}d streak
              </span>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#0056d2] dark:text-blue-400 font-medium border border-blue-200 dark:border-blue-800">
                Lv.{stats.level}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSoundToggle}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-xs"
              >
                {stats.soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-[#0056d2]" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{stats.soundEnabled ? "Audio On" : "Muted"}</span>
              </button>
            </div>
          </div>

          <Link
            href="/learn/python/py-01-comments-print"
            onClick={() => sound.playClick()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-[#0056d2] hover:bg-[#0041b8] text-white font-bold text-sm tracking-wide shadow-xs mt-2"
          >
            <span>Start Learning Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </header>
  );
}
