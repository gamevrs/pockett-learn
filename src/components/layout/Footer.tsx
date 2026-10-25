import React from "react";
import Link from "next/link";
import { Logo } from "./Navbar";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-2">
            Learn Python by building real, working projects. Everything runs in your browser. Free, with no paywall.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-3">Build</p>
          <ul className="space-y-2 text-sm text-ink-2">
            <li><Link className="hover:text-ink" href="/projects/garage">Turbo Garage</Link></li>
            <li><Link className="hover:text-ink" href="/projects/launch">Launch Control</Link></li>
            <li><Link className="hover:text-ink" href="/projects/beatlab">Beat Lab</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Explore</p>
          <ul className="space-y-2 text-sm text-ink-2">
            <li><Link className="hover:text-ink" href="/projects">All projects</Link></li>
            <li><Link className="hover:text-ink" href="/dashboard">Your progress</Link></li>
            <li><Link className="hover:text-ink" href="/playground">Python sandbox</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-ink-3 sm:flex-row sm:justify-between sm:px-6">
          <span>© pockett</span>
          <span className="font-mono">Python runs in your browser via WebAssembly</span>
        </div>
      </div>
    </footer>
  );
}
