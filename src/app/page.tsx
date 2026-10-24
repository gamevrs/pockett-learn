import React from "react";
import Link from "next/link";
import { ArrowRight, Braces, Gauge, Globe, Lock, Rocket, Sparkles, TestTube2, Zap } from "lucide-react";
import { PROJECTS, UPCOMING, summarize } from "@/content";
import { flattenLessons } from "@/engine/types";
import { HeroStage } from "@/components/landing/HeroStage";
import { UnlockExplorer } from "@/components/landing/UnlockExplorer";
import { ProjectCard, UpcomingCard } from "@/components/projects/ProjectCard";
import { AdSlot } from "@/components/ads/AdSlot";

const RIBBON = ["100% FREE", "REAL PYTHON", "RUNS IN YOUR BROWSER", "NO SIGNUP", "BUILD · BREAK · REPEAT", "NO CREDIT CARD", "LEARN BY DOING"];

export default function HomePage() {
  return (
    <>
      {/* ───────── hero ───────── */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24 lg:pt-20">
          <div className="rise min-w-0">
            <span className="sticker">Free forever</span>
            <h1 className="font-display mt-6 text-balance text-[clamp(2.9rem,6.2vw,5.6rem)]">
              Learn to code by building things that <span className="text-gradient">move.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-2 sm:text-xl">
              Pick a project. Write real Python. Every lesson you pass bolts a new part onto a live demo, until the car is racing, the rocket is flying, or the beat is dropping. All because of code <em>you</em> wrote.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/projects" className="btn btn-primary !px-6 !py-4 !text-base">
                Pick your build <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/projects/garage/garage-1-ignition" className="btn !px-6 !py-4 !text-base">
                Try lesson 1 now
              </Link>
            </div>
            <p className="mt-5 flex items-center gap-2 text-sm text-ink-3">
              <Lock className="h-3.5 w-3.5" /> No account. Nothing to install. Your progress stays on your device.
            </p>
          </div>

          <div className="rise relative min-w-0" style={{ animationDelay: "120ms" }}>
            <div className="h-[380px] sm:h-[480px]">
              <HeroStage />
            </div>
            <div className="float absolute -bottom-5 -left-3 hidden rotate-[-4deg] rounded-2xl border-2 border-[var(--line-strong)] bg-surface px-4 py-3 font-mono text-xs shadow-[var(--pop-shadow)] sm:block">
              <span className="text-ink-3">def</span> <span className="text-brand">steer</span>(left, right):
              <br />
              &nbsp;&nbsp;<span className="text-ink-3">return</span> <span className="text-brand">-30</span> <span className="text-ink-3">if</span> left …
            </div>
          </div>
        </div>
      </section>

      {/* ───────── ribbon ───────── */}
      <div className="marquee overflow-hidden border-b border-line bg-ink py-3 text-bg" aria-hidden>
        <div className="marquee-track">
          {[...RIBBON, ...RIBBON, ...RIBBON, ...RIBBON].map((t, i) => (
            <span key={i} className="mx-6 flex items-center gap-6 font-mono text-sm font-bold tracking-widest">
              {t} <Sparkles className="h-3.5 w-3.5" />
            </span>
          ))}
        </div>
      </div>

      {/* ───────── come alive ───────── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <p className="eyebrow">The idea</p>
        <h2 className="font-display mt-3 max-w-3xl text-5xl sm:text-6xl">
          Your code is the <span className="text-gradient">engine.</span>
        </h2>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-2">
          Most courses show you a printout. Here, every concept has a consequence you can see and touch. Step through the Turbo Garage build and watch what each lesson adds.
        </p>
        <div className="mt-12">
          <UnlockExplorer />
        </div>
      </section>

      {/* ───────── projects ───────── */}
      <section className="border-y border-line bg-bg-2">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="eyebrow">Choose your adventure</p>
          <h2 className="font-display mt-3 text-5xl sm:text-6xl">Same Python. Different playground.</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {PROJECTS.map((p) => (
              <ProjectCard key={p.slug} project={summarize(p)} lessonIds={flattenLessons(p).map((l) => l.id)} />
            ))}
          </div>
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {UPCOMING.map((u) => (
              <UpcomingCard key={u.slug} project={u} />
            ))}
          </div>
        </div>
      </section>

      {/* ───────── how it works ───────── */}
      <section className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <p className="eyebrow">How it works</p>
        <h2 className="font-display mt-3 text-5xl sm:text-6xl">Three steps. Zero setup.</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            { n: "01", icon: Rocket, title: "Pick a build", body: "Start from a blueprint: a car, a rocket, a beat machine. Each one is a real program you finish yourself." },
            { n: "02", icon: Braces, title: "Write real Python", body: "A proper editor, real tests, and hints when you're stuck. Short missions, each one teaching exactly one idea." },
            { n: "03", icon: Gauge, title: "Watch it come alive", body: "Pass a lesson and a new part switches on. Drive the car, fire the engines, or press play on your own music." },
          ].map((s) => (
            <div key={s.n} className="pop-card p-6">
              <div className="flex items-center justify-between">
                <span className="font-display text-5xl text-ink-3/40">{s.n}</span>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand bg-brand-gradient">
                  <s.icon className="h-5 w-5 text-brand-ink" />
                </span>
              </div>
              <h3 className="font-display mt-6 text-2xl">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Zap, t: "Instant feedback", d: "Python runs right in your browser. No waiting on a server." },
            { icon: TestTube2, t: "Real tests", d: "Every lesson is checked by real assertions, just like at work." },
            { icon: Globe, t: "Free, for everyone", d: "No paywall and no trial. Supported by a few polite ads." },
            { icon: Sparkles, t: "Keep your build", d: "Your project grows with you. Come back and keep tinkering." },
          ].map((f) => (
            <div key={f.t} className="card p-5">
              <f.icon className="h-5 w-5 text-brand" />
              <p className="font-display mt-3 text-lg">{f.t}</p>
              <p className="mt-1 text-sm text-ink-2">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <AdSlot slot="landing-inline" />
      </div>

      {/* ───────── cta ───────── */}
      <section className="px-4 pb-24 sm:px-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-brand bg-brand-gradient p-8 text-center sm:p-16">
          <h2 className="font-display relative text-5xl text-brand-ink sm:text-7xl">Ready to see it move?</h2>
          <p className="relative mx-auto mt-4 max-w-lg text-lg font-medium text-brand-ink/75">Your first part switches on in about five minutes.</p>
          <Link href="/projects/garage/garage-1-ignition" className="btn relative mt-8 !border-[var(--brand-ink)] !bg-[var(--brand-ink)] !px-8 !py-4 !text-base !text-[var(--brand)]">
            Start lesson 1 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
