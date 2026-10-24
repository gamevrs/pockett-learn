import React, { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { TickerTape } from "@/components/layout/TickerTape";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "pockett.ai | Free Interactive Programming & Computer Science",
  description:
    "Master Python 3 from scratch to professional on pockett.ai. Coursera-grade interactive curriculum with in-browser WebAssembly execution and verified credentials. 100% free forever.",
  keywords: [
    "pockett.ai",
    "python course",
    "free coursera alternative",
    "interactive python",
    "learn python free",
    "artemis mission control",
    "data with baraa",
    "webassembly python",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('pockett_theme_mode');
                  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#f8fafc] dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 font-sans selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900/40 dark:selection:text-blue-200 transition-colors duration-150">
        <ThemeProvider>
          <TickerTape />
          <Suspense fallback={<div className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900" />}>
            <Navbar />
          </Suspense>
          <div className="flex-1 flex flex-col">{children}</div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
