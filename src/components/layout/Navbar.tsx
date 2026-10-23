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
  Trophy,
  Menu,
  X,
  ArrowRight,
} from "lucide-react";
import { getUserStats, toggleSound } from "@/lib/storage/progress";
import { sound } from "@/lib/sound/sound";

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

  // Close mobile menu on route change
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
    { href: "/playground", label: "Sandbox IDE", icon: Code2 },
    { href: "/dashboard", label: "My Progress", icon: Trophy },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#07090e]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            onClick={() => sound.playClick()}
            className="group flex items-center gap-2.5 font-mono tracking-tight"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 group-hover:border-emerald-400 transition-all shadow-[0_0_15px_rgba(16,231,117,0.2)]">
              <Terminal className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base sm:text-lg text-white group-hover:text-emerald-400 transition-colors tracking-wider">
                POCKETT LEARN
              </span>
              <span className="text-[9px] uppercase tracking-widest text-slate-500 -mt-1 font-mono">
                Interactive Code Academy
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 ml-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => sound.playClick()}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all ${
                    isActive
                      ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 font-semibold"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Desktop Gamification Controls */}
        <div className="hidden sm:flex items-center gap-2 sm:gap-3">
          {/* Daily Streak */}
          <div
            title="Daily Learning Streak"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-mono font-semibold"
          >
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-pulse" />
            <span>{stats.streak}d</span>
          </div>

          {/* Total XP & Level */}
          <div
            title={`Level ${stats.level} Engineer`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono font-semibold"
          >
            <Zap className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
            <span>{stats.xp} XP</span>
            <span className="text-[10px] text-emerald-300/70 border-l border-emerald-500/30 pl-1.5 ml-0.5">
              Lv.{stats.level}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleSoundToggle}
            title={stats.soundEnabled ? "Mute arcade audio" : "Enable arcade audio"}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {stats.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Start CTA */}
          <Link
            href="/learn/python/py-01-hello-world"
            onClick={() => sound.playClick()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wider uppercase font-mono transition-all shadow-[0_0_20px_rgba(16,231,117,0.3)] hover:scale-102"
          >
            Code Now
          </Link>
        </div>

        {/* Mobile Header Actions */}
        <div className="flex sm:hidden items-center gap-2">
          {/* Quick XP Badge on mobile */}
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono font-bold">
            <Zap className="w-3 h-3 fill-emerald-400" />
            <span>{stats.xp}</span>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => {
              sound.playClick();
              setMobileMenuOpen(!mobileMenuOpen);
            }}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5 text-emerald-400" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-slate-800 bg-[#090c13] px-4 py-5 space-y-4 animate-in slide-in-from-top-3 duration-200 shadow-2xl">
          {/* Navigation Links */}
          <div className="space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => sound.playClick()}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold"
                      : "text-slate-300 hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-emerald-400" />
                    <span>{link.label}</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                </Link>
              );
            })}
          </div>

          {/* Mobile Gamification & Settings Bar */}
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400">
                <Flame className="w-4 h-4 fill-amber-500" />
                <span>{stats.streak}d streak</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-400">
                <Zap className="w-4 h-4 fill-emerald-400" />
                <span>Lv.{stats.level}</span>
              </div>
            </div>

            <button
              onClick={handleSoundToggle}
              className="flex items-center gap-1 text-xs font-mono text-slate-400 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700"
            >
              {stats.soundEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Audio ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                  <span>Muted</span>
                </>
              )}
            </button>
          </div>

          {/* Primary CTA for mobile */}
          <Link
            href="/learn/python/py-01-hello-world"
            onClick={() => sound.playClick()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold font-mono text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(16,231,117,0.3)]"
          >
            <span>Launch Python Lab 1.1</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </header>
  );
}
