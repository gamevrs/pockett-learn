"use client";

import React from "react";
import { Share } from "lucide-react";
import { shareLink, useIsNativeApp } from "@/lib/native/app";

/** The system share sheet for this lesson's link. Only rendered inside the iOS and Android apps. */
export function NativeShareButton({ title, path, className = "" }: { title: string; path: string; className?: string }) {
  const native = useIsNativeApp();
  if (!native) return null;
  return (
    <button
      type="button"
      onClick={() => void shareLink(title, path)}
      aria-label="Share this lesson"
      title="Share this lesson"
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink ${className}`}
    >
      <Share className="h-4 w-4" aria-hidden />
    </button>
  );
}
