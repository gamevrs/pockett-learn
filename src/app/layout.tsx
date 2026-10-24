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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f8fafc] text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900">
        <TickerTape />
        <Suspense fallback={<div className="h-16 border-b border-slate-200 bg-white" />}>
          <Navbar />
        </Suspense>
        <div className="flex-1 flex flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
