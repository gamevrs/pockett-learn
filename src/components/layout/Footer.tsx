"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BookOpen, Shield, Heart, Cpu, CheckCircle2 } from "lucide-react";

export function Footer() {
  const [year, setYear] = useState(2026);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 text-xs mt-auto transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand & Mission */}
          <div className="md:col-span-2 space-y-3.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0056d2] flex items-center justify-center text-white">
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                pockett<span className="text-[#0056d2] dark:text-blue-400">.ai</span>
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed max-w-md">
              Democratizing university-grade and professional computer science education.
              Interactive, gamified, and 100% free forever without subscriptions, paywalls, or lock-in.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 text-[#0056d2] dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-medium">
                <Cpu className="w-3.5 h-3.5" /> Pyodide 3.12 WebAssembly
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium">
                <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Local-First Persistence
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Free Verified Certificates
              </span>
            </div>
          </div>

          {/* Col 2: Learning Tracks */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider text-slate-900 dark:text-white font-bold">
              Programs &amp; Courses
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/learn/python"
                  className="text-slate-600 dark:text-slate-400 hover:text-[#0056d2] dark:hover:text-blue-400 transition-colors flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0056d2] dark:bg-blue-400" />
                  Python 3 (Artemis Mission Control)
                </Link>
              </li>
              <li className="text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                TypeScript Enterprise (Coming Soon)
              </li>
              <li className="text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                Rust Systems (Coming Soon)
              </li>
              <li className="text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                Go Cloud Microservices (Coming Soon)
              </li>
            </ul>
          </div>

          {/* Col 3: Institutional & Tools */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider text-slate-900 dark:text-white font-bold">
              Learner Resources
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/playground" className="text-slate-600 dark:text-slate-400 hover:text-[#0056d2] dark:hover:text-blue-400 transition-colors">
                  Interactive Python Sandbox
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-slate-600 dark:text-slate-400 hover:text-[#0056d2] dark:hover:text-blue-400 transition-colors">
                  My Learning &amp; Certificates
                </Link>
              </li>
              <li>
                <span className="text-slate-500 dark:text-slate-500">Data with Baraa Ground Truth</span>
              </li>
              <li>
                <span className="text-slate-500 dark:text-slate-500">NASA Artemis Mission Grounding</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            © {year} pockett.ai. Open Access Computer Science Academy. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              Built with <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> for lifelong learners worldwide
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
