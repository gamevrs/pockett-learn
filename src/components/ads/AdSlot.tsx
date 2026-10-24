"use client";

import React, { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

interface AdSlotProps {
  /** AdSense ad unit id for this placement */
  slot?: string;
  /** Reserve space up front so ads never shift the layout */
  minHeight?: number;
  className?: string;
}

/**
 * Google AdSense placement. Renders nothing in production until NEXT_PUBLIC_ADSENSE_CLIENT is set,
 * and a labelled placeholder in development so the spot is visible while designing.
 * Keep ads on content pages only: never inside the lesson workspace.
 */
export function AdSlot({ slot, minHeight = 120, className = "" }: AdSlotProps) {
  const pushed = useRef(false);

  useEffect(() => {
    if (!CLIENT || !slot || pushed.current) return;
    pushed.current = true;
    if (!document.querySelector("script[data-adsense]")) {
      const s = document.createElement("script");
      s.async = true;
      s.dataset.adsense = "1";
      s.crossOrigin = "anonymous";
      s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
      document.head.appendChild(s);
    }
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* blocked by an ad blocker: fine */
    }
  }, [slot]);

  if (!CLIENT) {
    if (process.env.NODE_ENV === "production") return null;
    return (
      <div className={`grid place-items-center rounded-2xl border border-dashed border-line text-xs font-semibold text-ink-3 ${className}`} style={{ minHeight }}>
        Ad slot (set NEXT_PUBLIC_ADSENSE_CLIENT to enable)
      </div>
    );
  }

  return (
    <aside aria-label="Advertisement" className={className} style={{ minHeight }}>
      <p className="eyebrow mb-1 text-center !text-[10px]">Advertisement</p>
      <ins className="adsbygoogle block" style={{ display: "block", minHeight }} data-ad-client={CLIENT} data-ad-slot={slot} data-ad-format="auto" data-full-width-responsive="true" />
    </aside>
  );
}
