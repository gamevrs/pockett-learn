import React from "react";
import Link from "next/link";
import { ArrowRight, Check, Globe, Layers, Lock, TestTube2, X, Zap } from "lucide-react";
import { PROJECTS, UPCOMING, summarize } from "@/content";
import { flattenLessons } from "@/engine/types";
import { HeroStage } from "@/components/landing/HeroStage";
import { UnlockExplorer } from "@/components/landing/UnlockExplorer";
import { ProjectCard, UpcomingCard } from "@/components/projects/ProjectCard";
import { FeatureIcon } from "@/components/ui/icons";
import { AdSlot } from "@/components/ads/AdSlot";

const LESSON_COUNT = PROJECTS.reduce((n, p) => n + flattenLessons(p).length, 0);
const GARAGE = PROJECTS.find((p) => p.slug === "garage") ?? PROJECTS[0];

const STATS = [
  { value: String(PROJECTS.length), label: "Guided projects" },
  { value: String(LESSON_COUNT), label: "Hands-on lessons" },
  { value: String(new Set(PROJECTS.map((p) => p.language ?? "python")).size), label: "Languages" },
  { value: "Free", label: "No paywall, ever" },
];

function SectionHeader({ eyebrow, title, body, center }: { eyebrow: string; title: string; body?: string; center?: boolean }) {
  return (
    <div className={`max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="font-display mt-3 text-balance text-[2rem] sm:text-[2.75rem]">{title}</h2>
      {body && <p className="mt-4 text-base leading-relaxed text-ink-2 sm:text-lg">{body}</p>}
    </div>
  );
}

/** A two-column row: copy on one side, a tinted panel with an illustration on the other. */
function FeatureRow({ title, body, children, flip }: { title: string; body: string; children: React.ReactNode; flip?: boolean }) {
  return (
    <div className="grid items-center gap-8 md:grid-cols-2 md:gap-16">
      <div className={`tint-panel grid min-h-[280px] place-items-center p-6 sm:p-10 ${flip ? "md:order-2" : ""}`}>{children}</div>
      <div className="max-w-md">
        <h3 className="font-display text-[1.75rem] sm:text-[2rem]">{title}</h3>
        <p className="mt-4 text-base leading-relaxed text-ink-2">{body}</p>
      </div>
    </div>
  );
}

function CodeIllustration() {
  return (
    <div className="w-full max-w-sm overflow-hidden rounded-xl border border-line bg-surface shadow-[var(--shadow)]">
      <div className="flex h-9 items-center border-b border-line px-4 font-mono text-[11px] text-ink-3">main.py</div>
      <pre className="overflow-x-auto bg-[#0a0a0a] px-4 py-4 font-mono text-[12.5px] leading-relaxed text-[#d4d4d4]">
        <span className="text-[#a3e635]">def</span> <span className="text-[#7fd4ff]">throttle</span>(speed, target):{"\n"}
        {"    "}<span className="text-[#a3e635]">if</span> speed &lt; target:{"\n"}
        {"        "}<span className="text-[#a3e635]">return</span> <span className="text-[#ffb86b]">1.0</span>{"\n"}
        {"    "}<span className="text-[#a3e635]">return</span> <span className="text-[#ffb86b]">0.0</span>
      </pre>
    </div>
  );
}

function TestsIllustration() {
  const rows = [
    { ok: true, t: "throttle(10, 30) returns 1.0" },
    { ok: true, t: "throttle(30, 30) returns 0.0" },
    { ok: false, t: "throttle(45, 30) brakes when too fast" },
  ];
  return (
    <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow)]">
      <p className="text-xs font-medium text-ink-3">Tests · 2 of 3 passing</p>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r.t} className="flex items-center gap-2.5 text-sm">
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${r.ok ? "bg-primary text-primary-ink" : "bg-bad/15 text-bad"}`}>
              {r.ok ? <Check className="h-3 w-3" strokeWidth={3} /> : <X className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className={r.ok ? "text-ink-2" : "text-ink"}>{r.t}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs text-ink-2">
        Hint: what should happen when <code className="font-mono text-ink">speed</code> is above the target?
      </div>
    </div>
  );
}

function PathIllustration() {
  const features = GARAGE.features.slice(0, 5);
  return (
    <ol className="w-full max-w-xs">
      {features.map((f, i) => {
        const state = i < 3 ? "done" : i === 3 ? "current" : "locked";
        return (
          <li key={f.id} className="relative flex items-center gap-3 pb-4 last:pb-0">
            {i < features.length - 1 && <span className="absolute left-[17px] top-9 h-[calc(100%-28px)] w-px bg-[var(--line-strong)]" />}
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border ${
                state === "done"
                  ? "border-transparent bg-primary text-primary-ink"
                  : state === "current"
                    ? "border-[var(--brand)] bg-surface text-brand ring-4 ring-[var(--brand-soft)]"
                    : "border-line bg-surface text-ink-3"
              }`}
            >
              {state === "done" ? <Check className="h-4 w-4" strokeWidth={2.5} /> : <FeatureIcon id={f.id} className="h-4 w-4" />}
            </span>
            <span className={`rounded-full border border-line bg-surface px-3 py-1.5 text-sm ${state === "locked" ? "text-ink-3" : "text-ink"}`}>{f.title}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function HomePage() {
  return (
    <>
      {/* ───────── hero ───────── */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6 sm:pt-24">
        <div className="rise mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Free coding courses · runs in your browser
          </span>
          <h1 className="font-display mt-6 text-balance text-[clamp(2.6rem,5.6vw,4.25rem)]">Learn to code by building things that work</h1>
          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-ink-2 sm:text-lg">
            Write real Python, JavaScript or SQL, one short lesson at a time. Every lesson you pass switches on part of a live 3D project, so you can see exactly what your code does.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/projects/garage/garage-1-ignition" className="btn btn-primary !h-12 !px-6 !text-base">
              Start learning <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/projects" className="btn !h-12 !px-6 !text-base">
              Browse projects
            </Link>
          </div>
          <p className="mt-5 flex items-center justify-center gap-2 text-sm text-ink-3">
            <Lock className="h-3.5 w-3.5" /> No account needed. Sign up to sync progress across devices.
          </p>
        </div>

        <div className="rise tint-panel mt-14 p-3 sm:p-6" style={{ animationDelay: "100ms" }}>
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-[0_24px_60px_-28px_rgba(0,0,0,0.4)]">
            <div className="flex h-10 items-center justify-between border-b border-line px-4 text-xs text-ink-3">
              <span className="font-mono">turbo-garage / main.py</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Live
              </span>
            </div>
            <div className="h-[360px] sm:h-[480px]">
              <HeroStage />
            </div>
          </div>
        </div>
      </section>

      {/* ───────── stats ───────── */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="card px-5 py-5 text-center">
              <dd className="font-display text-3xl tabular-nums sm:text-4xl">{s.value}</dd>
              <dt className="mt-1 text-sm text-ink-3">{s.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* ───────── how it teaches ───────── */}
      <section className="mx-auto w-full max-w-6xl space-y-20 px-4 py-24 sm:px-6 sm:py-32">
        <SectionHeader center eyebrow="How you learn" title="Hands-on lessons that build on each other" />
        <FeatureRow
          title="Write real code from the first minute"
          body="No slideshows. Every lesson opens a real editor with a small, focused task, and the code you write becomes part of a working program."
        >
          <CodeIllustration />
        </FeatureRow>
        <FeatureRow
          flip
          title="Get instant, specific feedback"
          body="Run your code as often as you like, then submit it against real tests. If something is off, you see which case failed and get a hint pointing you at the idea, not the answer."
        >
          <TestsIllustration />
        </FeatureRow>
        <FeatureRow
          title="Follow a path, one concept at a time"
          body="Projects are broken into short lessons in a clear order. Each one adds a single idea, and your progress is saved as you go."
        >
          <PathIllustration />
        </FeatureRow>
      </section>

      {/* ───────── come alive ───────── */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-28">
          <SectionHeader
            eyebrow="See it work"
            title="Every concept has a visible result"
            body="Instead of printing to a console, your code powers a working system. Step through the Turbo Garage build to see what each lesson adds."
          />
          <div className="mt-12">
            <UnlockExplorer />
          </div>
        </div>
      </section>

      {/* ───────── projects ───────── */}
      <section className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeader eyebrow="Projects" title="Choose what you want to build" />
          <Link href="/projects" className="btn btn-sm">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {PROJECTS.map((p) => (
            <ProjectCard key={p.slug} project={summarize(p)} lessonIds={flattenLessons(p).map((l) => l.id)} />
          ))}
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {UPCOMING.map((u) => (
            <UpcomingCard key={u.slug} project={u} />
          ))}
        </div>

        <div className="mt-20 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Zap, t: "Instant feedback", d: "Your code runs right in the browser. No installs, no servers, no waiting." },
            { icon: TestTube2, t: "Real tests", d: "Every lesson is graded by assertions, the same way production code is." },
            { icon: Globe, t: "Free for everyone", d: "No paywall and no trial. Supported by a small number of ads." },
            { icon: Layers, t: "Your build persists", d: "Your project grows with you. Come back any time and keep going." },
          ].map((f) => (
            <div key={f.t}>
              <span className="grid h-9 w-9 place-items-center rounded-full bg-tint">
                <f.icon className="h-4 w-4 text-brand" />
              </span>
              <p className="mt-3 font-medium">{f.t}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <AdSlot slot="landing-inline" />
      </div>

      {/* ───────── cta ───────── */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="tint-panel mx-auto max-w-6xl px-6 py-14 text-center sm:py-20">
          <h2 className="font-display text-balance text-[2rem] sm:text-[2.75rem]">Your first lesson takes about five minutes</h2>
          <p className="mx-auto mt-3 max-w-md text-ink-2">Start the Turbo Garage and get the engine running.</p>
          <Link href="/projects/garage/garage-1-ignition" className="btn btn-primary mt-8 !h-12 !px-6 !text-base">
            Start lesson 1 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
