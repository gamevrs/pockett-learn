"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, ExternalLink } from "lucide-react";

interface AdBannerProps {
  slotType: "leaderboard" | "rectangle" | "in-feed" | "banner";
  className?: string;
}

export function AdBanner({ slotType, className = "" }: AdBannerProps) {
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && (window as any).adsbygoogle) {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      }
    } catch {
      // Graceful fallback
    }
  }, []);

  if (slotType === "leaderboard") {
    return (
      <div
        className={`w-full max-w-5xl mx-auto my-6 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-3 text-center shadow-xs transition-colors ${className}`}
      >
        <div className="flex items-center justify-between text-[11px] tracking-wider text-slate-500 dark:text-slate-400 uppercase font-medium mb-2 px-2">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#0056d2] dark:text-blue-400" />
            Educational Sponsor
          </span>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
            Google AdSense Ready
          </span>
        </div>
        <div className="h-20 sm:h-22 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-4 group hover:border-[#0056d2] dark:hover:border-blue-400 transition-colors">
          <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-[#0056d2] dark:group-hover:text-blue-400 transition-colors">
            Support 100% Free Computer Science Education on pockett.ai
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
            Sponsors and partners enable all Python &amp; systems tracks to remain completely free for all learners worldwide.
          </p>
        </div>
      </div>
    );
  }

  if (slotType === "rectangle") {
    return (
      <div
        className={`w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-3.5 text-center shadow-xs transition-colors ${className}`}
      >
        <div className="flex items-center justify-between text-[11px] tracking-wider text-slate-500 dark:text-slate-400 uppercase font-medium mb-2">
          <span className="font-semibold text-slate-600 dark:text-slate-300">Partner Spot</span>
          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded">300x250</span>
        </div>
        <div className="h-60 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/80 flex items-center justify-center text-[#0056d2] dark:text-blue-400 font-bold mb-3 border border-blue-200 dark:border-blue-800">
            Ad
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Developer Cloud &amp; Tooling Partners
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 text-center leading-relaxed">
            Reserved placement for high-relevance developer tooling, AI models, and cloud infrastructure sponsors.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full my-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-3 shadow-xs transition-colors ${className}`}
    >
      <div className="flex items-center justify-between text-[11px] tracking-wider text-slate-500 dark:text-slate-400 uppercase font-medium mb-1.5">
        <span>Sponsor</span>
        <span>Free Tier Partner</span>
      </div>
      <div className="py-2.5 px-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-between gap-4">
        <p className="text-xs text-slate-700 dark:text-slate-300">
          Supercharge your programming workflow with top-tier cloud and developer platforms.
        </p>
        <span className="shrink-0 text-xs font-semibold text-[#0056d2] dark:text-blue-400 px-3 py-1 bg-blue-50 dark:bg-blue-950/60 rounded border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
          Learn More
        </span>
      </div>
    </div>
  );
}
