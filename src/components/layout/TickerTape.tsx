"use client";

import React from "react";
import { Terminal, Flame, Zap, ShieldCheck, Code2, Globe2 } from "lucide-react";

export function TickerTape() {
  const items = [
    { icon: Zap, label: "100% FREE CODE EDUCATION", highlight: "ZERO PAYWALLS" },
    { icon: Terminal, label: "PYTHON 3.12 KERNEL", highlight: "IN-BROWSER WEBASSEMBLY" },
    { icon: Flame, label: "GAMIFIED PROGRESSION", highlight: "STREAKS & XP" },
    { icon: ShieldCheck, label: "ENTERPRISE SYLLABUS", highlight: "BEGINNER TO PRO" },
    { icon: Code2, label: "NEXT LANGUAGE TRACKS", highlight: "TYPESCRIPT & RUST" },
    { icon: Globe2, label: "COMMUNITY REACH", highlight: "GLOBAL ACCESS" },
  ];

  return (
    <div className="w-full bg-[#0a0d14] border-b border-emerald-500/20 overflow-hidden py-1.5 select-none relative z-20">
      <div className="flex items-center gap-8 whitespace-nowrap animate-marquee">
        {[...items, ...items, ...items].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="inline-flex items-center gap-2 text-[11px] font-mono tracking-wider text-slate-400 uppercase"
            >
              <Icon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>{item.label}</span>
              <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] border border-emerald-500/30">
                {item.highlight}
              </span>
              <span className="text-slate-600 ml-4 font-bold">•</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
