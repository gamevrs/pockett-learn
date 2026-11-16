import React from "react";
import type { Metadata, Viewport } from "next";
import { CloudSync } from "@/components/auth/CloudSync";
import { EmbedBridge } from "@/components/embed/EmbedBridge";
import { EmbedProvider } from "@/components/embed/EmbedContext";

/**
 * Pages the phone app (Expo, branch feat/native-app) shows inside its web view: the lesson player, the project workspace
 * and the playground, without the site's chrome (SiteChrome renders nothing under /embed). The app draws the header,
 * the tab bar and the safe areas. CloudSync runs here because the root layout's copy lives in SiteChrome.
 * Contract: native/contract.md, section 2.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// no pinch zoom, and no zoom when the code editor (small text) takes focus on iOS
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <EmbedProvider>
      <CloudSync />
      <EmbedBridge />
      {children}
    </EmbedProvider>
  );
}
