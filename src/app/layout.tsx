import React, { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { TickerTape } from "@/components/layout/TickerTape";
import { Footer } from "@/components/layout/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pockett Learn | 100% Free Interactive Programming Academy",
  description:
    "Master Python, TypeScript, and Rust with in-browser WebAssembly execution, automated test suites, and gamified engineering challenges. Zero paywalls forever.",
  keywords: [
    "python",
    "learn python free",
    "boot.dev alternative",
    "coursera alternative",
    "interactive python",
    "webassembly python",
    "pyodide",
    "coding challenges",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full dark antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#07090e] text-slate-100 font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
        <TickerTape />
        <Suspense fallback={<div className="h-16 border-b border-slate-800 bg-[#07090e]" />}>
          <Navbar />
        </Suspense>
        <div className="flex-1 flex flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
