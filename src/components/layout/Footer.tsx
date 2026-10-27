import React from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { LANGUAGES, TRACKS } from "@/engine/languages";

/** Same order as the paths on the projects page, which also provides the `#path-…` anchors. */
const PATHS = [
  { id: "python", label: LANGUAGES.python.label },
  { id: "ai", label: TRACKS.ai.label },
  { id: "javascript", label: LANGUAGES.javascript.label },
  { id: "sql", label: LANGUAGES.sql.label },
  { id: "csharp", label: LANGUAGES.csharp.label },
  { id: "cpp", label: LANGUAGES.cpp.label },
  { id: "go", label: LANGUAGES.go.label },
  { id: "rust", label: LANGUAGES.rust.label },
];

// 40px-tall rows on touch screens; the compact list from `sm` up.
const LINK = "inline-flex min-h-10 min-w-10 items-center whitespace-nowrap hover:text-ink sm:min-h-0 sm:min-w-0";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1.5fr]">
        <div>
          <Link href="/" prefetch={false} aria-label="pockett home" className="inline-flex min-h-10 items-center">
            <Logo />
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-2">
            Learn to code by building real, working projects, from your first line to professional-grade software. Free, with no paywall.
          </p>
        </div>
        <nav aria-label="Learn">
          <p className="eyebrow mb-3">Learn</p>
          <ul className="text-sm text-ink-2 sm:space-y-2">
            <li><Link className={LINK} prefetch={false} href="/learn">Foundations</Link></li>
            <li><Link className={LINK} prefetch={false} href="/projects">All projects</Link></li>
            <li><Link className={LINK} prefetch={false} href="/dashboard">Your progress</Link></li>
            <li><Link className={LINK} prefetch={false} href="/playground">Code sandbox</Link></li>
          </ul>
        </nav>
        <nav aria-label="Paths">
          <p className="eyebrow mb-3">Paths</p>
          <ul className="grid grid-cols-2 gap-x-6 text-sm text-ink-2 sm:gap-y-2">
            {PATHS.map((p) => (
              <li key={p.id}>
                <Link className={LINK} prefetch={false} href={`/projects#path-${p.id}`}>{p.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-xs text-ink-3 sm:flex-row sm:justify-between sm:gap-2 sm:px-6 sm:py-5">
          <span className="inline-flex min-h-10 items-center sm:min-h-0">© 2026 Gameverse, LLC</span>
          <nav aria-label="Legal" className="flex flex-wrap gap-x-5 sm:gap-y-1">
            <Link className={LINK} prefetch={false} href="/brand">Brand &amp; press</Link>
            <Link className={LINK} prefetch={false} href="/privacy">Privacy</Link>
            <Link className={LINK} prefetch={false} href="/terms">Terms</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
