"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Pause, Play } from "lucide-react";
import Link from "next/link";
import { garage } from "@/content/projects/garage";
import { featuresUnlockedBy, flattenLessons } from "@/engine/types";
import type { ProgramHandle } from "@/engine/program";
import type { Celebration } from "@/engine/scene";
import { DEMO_PROGRAMS } from "@/scenes/demos";
import { StageShell } from "@/components/stage/StageShell";
import { PythonCode } from "@/components/ui/Prose";
import { FeatureIcon } from "@/components/ui/icons";

const lessons = flattenLessons(garage);
const PILL = "inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-3 sm:h-8 text-[0.8rem] transition-colors hover:border-[var(--line-strong)]";
const PILL_ON = "!border-transparent !bg-ink !text-bg";

export function UnlockExplorer() {
  const [step, setStep] = useState(0); // 0 = blueprint, n = first n lessons passed
  const [playing, setPlaying] = useState(false);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [program] = useState<ProgramHandle>(() => DEMO_PROGRAMS.garage());

  const unlocked = useMemo(() => featuresUnlockedBy(garage, lessons.slice(0, step).map((l) => l.id)), [step]);

  const go = (n: number) => {
    setStep(n);
    if (n > 0) setCelebration({ nonce: Date.now(), features: lessons[n - 1].unlocks });
  };

  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => {
      if (step >= lessons.length) {
        setPlaying(false);
        return;
      }
      setStep(step + 1);
      setCelebration({ nonce: Date.now(), features: lessons[step].unlocks });
    }, 3800);
    return () => clearTimeout(t);
  }, [playing, step]);

  const current = step > 0 ? lessons[step - 1] : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
      <div className="flex min-h-[360px] min-w-0 flex-col">
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => go(0)} className={`${PILL} ${step === 0 ? PILL_ON : "text-ink-2"}`}>
            Blueprint
          </button>
          {garage.features.map((f, i) => (
            <button
              key={f.id}
              onClick={() => go(i + 1)}
              title={f.title}
              className={`${PILL} ${step === i + 1 ? PILL_ON : step > i + 1 ? "text-ink" : "text-ink-3"}`}
            >
              <FeatureIcon id={f.id} /> <span className="hidden sm:inline">{f.title}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex-1 rounded-xl border border-white/10 bg-[#0a0a0a] p-4 text-white">
          <p className="font-mono text-[11px] uppercase tracking-widest text-white/55">{current ? `lesson ${step} · ${current.title}` : "main.py"}</p>
          <pre className="mt-3 overflow-x-auto font-mono text-[13px] leading-relaxed text-[#eef0e8]">
            {current ? <PythonCode code={current.solutionAdd} /> : <span className="text-white/55"># (empty)</span>}
          </pre>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            className="btn btn-sm"
            onClick={() => {
              if (!playing && step >= lessons.length) go(0);
              setPlaying((p) => !p);
            }}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" fill="currentColor" />}
            {playing ? "Pause" : step >= lessons.length ? "Replay" : "Auto-build"}
          </button>
          <button className="btn btn-sm btn-ghost" onClick={() => go(Math.min(lessons.length, step + 1))} disabled={step >= lessons.length}>
            Next part <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <Link href="/projects/garage" prefetch={false} className="ml-auto inline-flex min-h-10 items-center gap-1 text-sm font-medium text-brand hover:underline">
            Build it yourself <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="h-[420px] min-w-0 sm:h-[480px]">
        <StageShell
          project={garage}
          program={step > 0 ? program : null}
          unlocked={unlocked}
          celebration={celebration}
          focus={current ? null : "ignition"}
          surface="landing"
          autoplayScene
          hideControls
        />
      </div>
    </div>
  );
}
