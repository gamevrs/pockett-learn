"use client";

import React from "react";
import { usePathname } from "next/navigation";

/**
 * The site's page chrome (navigation, footer, cloud sync). The code frame (/frame) is a bare page embedded in the site's own
 * pages, so it renders none of it, and that is decided while rendering on the server too, so nothing flashes.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/frame" || pathname.startsWith("/frame/")) return null;
  return <>{children}</>;
}
