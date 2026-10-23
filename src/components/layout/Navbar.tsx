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
  Compass,
} from "lucide-react";
import { getUserStats, toggleSound } from "@/lib/storage/progress";
import { sound } from "@/lib/sound/sound";

export function Navbar() {
  const pathname = usePathname();
  const [stats, setStats] = useState({
    xp: 0,
    streak: 1,
    level: 1,
    soundEnabled: true,
  });

  useEffect(() => {
    // Initial load
    setStats(getUserStats());

    // Listen for progress updates
    const handleStorageChange = () => {
      setStats(getUserStats());
    };
    window.addEventListener("storage", handleStorageChange);
    // Custom internal progress event
    window.addEventListener("pockett_progress_updated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("pockett_progress_updated", handleStorageChange);
    };
  }, []);

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
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#07090e]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            onClick={() => sound.playClick()}
            className="group flex items-center gap-2.5 font-mono tracking-tight"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 group-hover:border-emerald-400 transition-all shadow-[0_0_15px_rgba(16,231,117,0.15)]">
              <Terminal className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base sm:text-lg text-white group-hover:text-emerald-400 transition-colors tracking-wider">
                POCKETT<span className="text-emerald-400 font-black">//</span>LEARN
              </span>
              <span className="text-[9px] uppercase tracking-widest text-slate-500 -mt-1 font-mono">
                Free Interactive Code Engine
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
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

        {/* Live Gamification Bar & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Daily Streak */}
          <div
            title="Daily Learning Streak"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 text-xs font-mono font-semibold"
          >
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-pulse" />
            <span>{stats.streak}d</span>
          </div>

          {/* Total XP & Level */}
          <div
            title={`Level ${stats.level} Engineer`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono font-semibold"
          >
            <Zap className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
            <span>{stats.xp} XP</span>
            <span className="hidden sm:inline-block text-[10px] text-emerald-300/70 border-l border-emerald-500/30 pl-1.5 ml-0.5">
              Lv.{stats.level}
            </span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={handleSoundToggle}
            title={stats.soundEnabled ? "Mute interactive audio" : "Enable arcade audio"}
            className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {stats.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* CTA Button */}
          <Link
            href="/learn/python/py-01-hello-world"
            onClick={() => sound.playClick()}
            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all shadow-[0_0_20px_rgba(16,231,117,0.3)] hover:scale-102"
          >
            Code Python Now
          </Link>
        </div>
      </div>
    </header>
  );
}
