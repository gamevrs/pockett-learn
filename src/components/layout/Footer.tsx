"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Terminal, Shield, Heart, Cpu, ExternalLink } from "lucide-react";

export function Footer() {
  const [year, setYear] = useState(2026);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);
  return (
    <footer className="w-full border-t border-slate-800/80 bg-[#06080d] text-slate-400 text-xs mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand & Manifesto */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 font-mono">
              <div className="w-6 h-6 rounded bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Terminal className="w-3.5 h-3.5" />
              </div>
              <span className="font-bold text-slate-200 tracking-wider">
                POCKETT LEARN
              </span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed max-w-md">
              Democratizing high-caliber computer science and software engineering education.
              Interactive, gamified, and 100% free forever without subscriptions, paywalls, or lock-in.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-mono">
                <Cpu className="w-3 h-3" /> Pyodide WASM Engine
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                <Shield className="w-3 h-3 text-cyan-400" /> Local-First Storage
              </span>
            </div>
          </div>

          {/* Col 2: Learning Tracks */}
          <div className="space-y-2.5">
            <h4 className="font-mono text-[11px] uppercase tracking-widest text-slate-200 font-bold">
              Languages & Tracks
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link
                  href="/learn/python"
                  className="hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Python 3 (Intro to Pro)
                </Link>
              </li>
              <li className="text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                TypeScript (In Development)
              </li>
              <li className="text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                Rust Systems (In Development)
              </li>
              <li className="text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                Go Microservices (In Development)
              </li>
            </ul>
          </div>

          {/* Col 3: Architecture & Scale */}
          <div className="space-y-2.5">
            <h4 className="font-mono text-[11px] uppercase tracking-widest text-slate-200 font-bold">
              Engineering Architecture
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/playground" className="hover:text-emerald-400 transition-colors">
                  WebAssembly Python Sandbox
                </Link>
              </li>
              <li>
                <span className="text-slate-400">Local-First Persistence</span>
              </li>
              <li>
                <span className="text-slate-400">Supabase & Vercel Scaling Path</span>
              </li>
              <li>
                <span className="text-slate-400">Non-Intrusive AdSense Model</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400 font-mono">
          <div>
            © {year} Pockett-Learn. Open Access Educational Platform.
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-400">
              Built with <Heart className="w-3 h-3 text-rose-500 fill-rose-500" /> for engineers worldwide
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
