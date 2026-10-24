"use client";

import React from "react";
import { GraduationCap, Award, Zap, Sparkles, CheckCircle2 } from "lucide-react";

export function TickerTape() {
  const items = [
    { icon: GraduationCap, text: "100% Free Education on pockett.ai", highlight: "No Credit Card Required" },
    { icon: Sparkles, text: "Python 3 Artemis Mission Control Track", highlight: "Data with Baraa Masterclass" },
    { icon: Zap, text: "In-Browser WebAssembly Kernel", highlight: "Instant Code Execution" },
    { icon: Award, text: "Verified Credentials Included", highlight: "Shareable Certificate" },
    { icon: CheckCircle2, text: "Comprehensive Guided Projects", highlight: "Beginner to Advanced" },
  ];

  return (
    <div className="w-full bg-[#0041b8] text-white overflow-hidden py-2 select-none relative z-20 shadow-xs border-b border-[#003699]">
      <div className="flex items-center gap-10 whitespace-nowrap animate-marquee">
        {[...items, ...items, ...items].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="inline-flex items-center gap-2 text-xs font-medium tracking-wide"
            >
              <Icon className="w-3.5 h-3.5 text-blue-200 shrink-0" />
              <span>{item.text}</span>
              <span className="bg-white/20 text-white font-semibold px-2 py-0.5 rounded text-[11px]">
                {item.highlight}
              </span>
              <span className="text-blue-300 ml-4">•</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
