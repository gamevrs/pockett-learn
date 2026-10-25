import React from "react";
import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { CloudSync } from "@/components/auth/CloudSync";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Bricolage_Grotesque({
  variable: "--font-display-face",
  subsets: ["latin"],
  weight: ["600", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "pockett. — learn to code by building things that move",
    template: "%s · pockett.",
  },
  description:
    "Free, interactive Python. Pick a project — drive a car, launch a rocket, make beats — and watch it come alive as you learn. Runs entirely in your browser.",
  keywords: ["learn python", "free coding course", "interactive programming", "python projects", "learn to code"],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070807" },
    { media: "(prefers-color-scheme: light)", color: "#f3efe6" },
  ],
};

// Runs before first paint: dark unless the visitor explicitly chose light.
const themeScript = `(function(){try{var s=localStorage.getItem('pockett_theme_mode');if(s!=='light'){document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
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
