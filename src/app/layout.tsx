import React from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { CloudSync } from "@/components/auth/CloudSync";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Editorial serif for display headings; UI text stays in Geist.
const serif = Source_Serif_4({ variable: "--font-serif-face", subsets: ["latin"], weight: ["500", "600"] });

export const metadata: Metadata = {
  title: {
    default: "pockett — learn to code by building real projects",
    template: "%s · pockett",
  },
  description:
    "Free, interactive coding lessons in Python, JavaScript and SQL. Build a self-driving car, a rocket flight computer, a drum machine or a race-data dashboard, and see every lesson work in a live demo.",
  keywords: ["learn python", "free coding course", "interactive programming", "python projects", "learn to code"],
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
          <CloudSync />
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
