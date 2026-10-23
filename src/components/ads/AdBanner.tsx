"use client";

import React, { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface AdBannerProps {
  slotType: "leaderboard" | "rectangle" | "in-feed" | "banner";
  className?: string;
}

export function AdBanner({ slotType, className = "" }: AdBannerProps) {
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    // If real AdSense is present in window, push ad request
    try {
      if (typeof window !== "undefined" && (window as any).adsbygoogle) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        setAdLoaded(true);
      }
    } catch {
      // Graceful fallback to stylish internal placeholder
    }
  }, []);

  if (slotType === "leaderboard") {
    return (
      <div
        className={`w-full max-w-5xl mx-auto my-6 border border-white/10 bg-slate-900/60 rounded-xl p-3 text-center overflow-hidden relative backdrop-blur-sm ${className}`}
      >
        <div className="flex items-center justify-between text-[10px] tracking-widest text-slate-400 uppercase font-mono mb-2 px-2">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Sponsored partner
          </span>
          <span>Google AdSense Ready</span>
        </div>
        <div className="h-20 sm:h-24 flex flex-col items-center justify-center bg-slate-950/80 rounded-lg border border-dashed border-white/10 px-4 group hover:border-emerald-500/40 transition-colors">
          <span className="text-xs sm:text-sm font-semibold text-slate-200 group-hover:text-emerald-400 transition-colors">
            Support 100% Free Coding Education for Everyone Worldwide
          </span>
          <p className="text-[11px] text-slate-400 mt-1 max-w-xl">
            We keep all courses, compilers, and sandboxes completely free through developer-friendly sponsors.
          </p>
        </div>
      </div>
    );
  }

  if (slotType === "rectangle") {
    return (
      <div
        className={`w-full border border-white/10 bg-slate-900/70 rounded-xl p-3 text-center overflow-hidden backdrop-blur-sm ${className}`}
      >
        <div className="flex items-center justify-between text-[10px] tracking-widest text-slate-400 uppercase font-mono mb-2">
          <span>Ad Space</span>
          <span>300x250</span>
        </div>
        <div className="h-60 flex flex-col items-center justify-center bg-slate-950/80 rounded-lg border border-dashed border-white/10 p-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold mb-3 border border-emerald-500/20">
            Ad
          </div>
          <span className="text-xs font-semibold text-slate-200">
            Developer Tooling & Cloud Platforms
          </span>
          <p className="text-[11px] text-slate-400 mt-2 text-center leading-relaxed">
            Reserved space for high-relevance developer tooling, AI models, and cloud infrastructure sponsors.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full my-4 border border-white/10 bg-slate-900/40 rounded-xl p-3 backdrop-blur-sm ${className}`}
    >
      <div className="flex items-center justify-between text-[10px] tracking-widest text-slate-400 uppercase font-mono mb-1.5">
        <span>Sponsor</span>
        <span>Free Tier Supporter</span>
      </div>
      <div className="py-3 px-4 bg-slate-950/60 rounded-lg border border-dashed border-white/10 flex items-center justify-between gap-4">
        <p className="text-xs text-slate-300">
          Supercharge your workflow with modern developer environments. Free tier available.
        </p>
        <span className="shrink-0 text-[10px] font-mono text-emerald-400 font-medium px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/20">
          Learn More
        </span>
      </div>
    </div>
  );
}
