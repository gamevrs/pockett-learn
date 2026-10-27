import React from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { CloudSync } from "@/components/auth/CloudSync";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { SITE_URL } from "@/lib/legal";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Editorial serif for display headings; UI text stays in Geist.
const serif = Source_Serif_4({ variable: "--font-serif-face", subsets: ["latin"], weight: ["500", "600"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "pockett — learn to code by building real projects",
    template: "%s · pockett",
  },
  description:
    "Free, interactive coding lessons in Python, JavaScript, SQL, C#, C++, Go and Rust, plus an AI track and a Foundations course on how computers work. Build a self-driving car, a rocket flight computer, a drum machine or a race-data dashboard, and see every lesson work in a live demo.",
  keywords: ["learn to code", "free coding course", "interactive programming", "coding projects", "learn python", "learn javascript", "learn sql", "learn rust", "learn go"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
  ],
};

// Runs before first paint: dark unless the visitor explicitly chose light.
const themeScript = `(function(){try{var s=localStorage.getItem('pockett_theme_mode');if(s!=='light'){document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-ink font-sans">
        <ThemeProvider>
          <SiteChrome>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-primary-ink focus:shadow-lg"
            >
              Skip to content
            </a>
            <CloudSync />
            <Navbar />
          </SiteChrome>
          <main id="main" tabIndex={-1} className="flex-1 flex flex-col outline-none">{children}</main>
          <SiteChrome>
            <Footer />
          </SiteChrome>
        </ThemeProvider>
      </body>
    </html>
  );
}
