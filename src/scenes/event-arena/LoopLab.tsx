"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Dices, Pause, Play, RotateCcw } from "lucide-react";
import type { ProgramHandle } from "@/engine/program";
import { PRESETS, randomScript, trace, type QueueItem, type Step } from "./loop";
import { BTN, BTN_ON, Chip, Locked, Panel } from "./ui";

interface Props {
  program: ProgramHandle | null;
  unlocked: ReadonlySet<string>;
  focus: string | null;
}

function Queue({ title, items, empty, accent, reverse = false }: { title: string; items: QueueItem[]; empty: string; accent?: boolean; reverse?: boolean }) {
  return (
    <div className="min-w-0 rounded-lg border border-white/10 bg-black/20 p-1.5">
      <div className="hud-label mb-1 flex items-center justify-between">
        <span>{title}</span>
        <span className="hud-value text-white/40">{items.length}</span>
      </div>
      <ul className={`flex min-h-[3.6rem] gap-1 ${reverse ? "flex-col-reverse justify-start" : "flex-col"}`}>
        {items.length === 0 && <li className="px-1 py-1 text-[10.5px] text-white/25">{empty}</li>}
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className={`arena-slide truncate rounded-md border px-1.5 py-1 font-mono text-[10.5px] ${accent && i === (reverse ? items.length - 1 : 0) ? "border-[#c5ee8a]/50 bg-[#c5ee8a]/10 text-[#e0f6c1]" : "border-white/10 bg-white/[0.05] text-white/80"}`} title={item.label}>
            {item.label}
            {item.due !== undefined && <span className="ml-1 text-white/40">@{item.due}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LoopLab({ program, unlocked, focus }: Props) {
  const on = unlocked.has("arena-loop");
  const preview = !on && focus === "arena-loop";
  const [choice, setChoice] = useState<{ kind: "preset"; index: number } | { kind: "random"; seed: number }>({ kind: "preset", index: 0 });
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  const script: Step[] = useMemo(() => (choice.kind === "preset" ? PRESETS[choice.index].script : randomScript(choice.seed)), [choice]);
  const run = useMemo(() => trace(script), [script]);
  const last = run.frames.length - 1;
  const frame = run.frames[Math.min(frameIndex, last)];

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setFrameIndex((i) => {
        if (i >= last) {
          setPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, 650);
    return () => clearInterval(t);
  }, [playing, last]);

  const learner = useMemo(() => {
    if (!on || !program || !program.hasHook("runLoop")) return null;
    const out = program.call<unknown>("runLoop", script);
    return Array.isArray(out) ? out.map(String) : null;
  }, [on, program, script]);
  const matches = learner !== null && JSON.stringify(learner) === JSON.stringify(run.output);

  const pick = (next: typeof choice) => {
    setChoice(next);
    setFrameIndex(0);
    setPlaying(false);
  };

  if (!on && !preview) {
    return (
      <Panel title="Event-loop lab" icon={<RotateCcw className="h-3.5 w-3.5" />} meta="locked">
        <div className="p-2">
          <Locked feature="arena-loop" title="Event-loop lab" need="runLoop(script)" spot={false}>
            <div className="mt-2 grid grid-cols-3 gap-1.5" aria-hidden>
              {["Call stack", "Microtasks", "Tasks"].map((t) => (
                <div key={t} className="rounded-md border border-dashed border-white/10 p-1.5">
                  <div className="hud-label text-white/25">{t}</div>
                  <div className="mt-1.5 h-4 rounded bg-white/[0.04]" />
                </div>
              ))}
            </div>
          </Locked>
        </div>
      </Panel>
    );
  }

  const title = choice.kind === "preset" ? PRESETS[choice.index].title : `Random script #${choice.seed}`;
  const hint = choice.kind === "preset" ? PRESETS[choice.index].hint : "A new script every time. Does your runLoop() agree with the engine?";

  return (
    <Panel
      title="Event-loop lab"
      icon={<RotateCcw className="h-3.5 w-3.5" />}
      meta={preview ? "preview · pass the lesson to check yours" : `frame ${Math.min(frameIndex, last) + 1}/${run.frames.length}`}
      className={focus === "arena-loop" ? "pulse-ring" : ""}
    >
      <div className="space-y-2.5 p-3">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Choose a script">
          {PRESETS.map((p, i) => (
            <button key={p.id} type="button" onClick={() => pick({ kind: "preset", index: i })} aria-pressed={choice.kind === "preset" && choice.index === i} className={`h-6 rounded-full border px-2 text-[10.5px] font-medium ${choice.kind === "preset" && choice.index === i ? "border-transparent bg-white/15 text-white" : "border-white/12 text-white/55 hover:text-white/85"}`}>
              {p.title}
            </button>
          ))}
          <button type="button" className={`${BTN} !h-6 !px-2 !text-[10.5px]`} onClick={() => pick({ kind: "random", seed: choice.kind === "random" ? choice.seed + 1 : 1 })}>
            <Dices className="h-3 w-3" />
            Random
          </button>
        </div>
        <p className="text-[11px] leading-snug text-white/55">
          <span className="font-medium text-white/80">{title}.</span> {hint}
        </p>

        <div className="grid grid-cols-1 gap-2 @lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <pre className="m-0 max-h-48 min-w-0 overflow-auto rounded-lg border border-white/10 bg-black/30 p-2 font-mono text-[10.5px] leading-[1.55] text-white/70" aria-label="Script source">
            {run.lines.map((line, i) => (
              <div key={i} className={`whitespace-pre ${frame.line === i ? "-mx-1 rounded bg-[#c5ee8a]/15 px-1 text-[#e0f6c1]" : ""}`}>
                {line}
              </div>
            ))}
          </pre>
          <div className="grid min-w-0 grid-cols-3 gap-1.5">
            <Queue title="Call stack" items={frame.stack.map((label) => ({ label }))} empty="empty" accent reverse />
            <Queue title="Microtasks" items={frame.micro} empty="empty" accent />
            <Queue title="Tasks" items={frame.tasks} empty="empty" accent />
          </div>
        </div>

        <p className="min-h-[2.4em] rounded-md bg-white/[0.04] px-2 py-1.5 text-[11px] leading-snug text-white/75" aria-live="polite">
          {frame.note} <span className="hud-value text-white/35">· now {frame.now} ms</span>
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" className={BTN} onClick={() => { setPlaying(false); setFrameIndex((i) => Math.max(0, i - 1)); }} disabled={frameIndex === 0} aria-label="Previous frame">
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button type="button" className={playing ? BTN : BTN_ON} onClick={() => { if (frameIndex >= last) setFrameIndex(0); setPlaying((p) => !p); }}>
            {playing ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {playing ? "Pause" : frameIndex >= last ? "Replay" : "Play"}
          </button>
          <button type="button" className={BTN} onClick={() => { setPlaying(false); setFrameIndex((i) => Math.min(last, i + 1)); }} disabled={frameIndex >= last} aria-label="Next frame">
            <ChevronRight className="h-3 w-3" />
          </button>
          <button type="button" className={BTN} onClick={() => { setPlaying(false); setFrameIndex(0); }}>
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 @md:grid-cols-2">
          <div>
            <div className="hud-label mb-1">Console (real engine)</div>
            <div className="hud-log min-h-[2.2rem] rounded-md border border-white/10 bg-black/30 px-2 py-1">
              {frame.out.length === 0 ? <span className="text-white/25">nothing printed yet</span> : frame.out.map((o, i) => <div key={i} className="hud-log-line">{o}</div>)}
            </div>
          </div>
          <div>
            <div className="hud-label mb-1 flex items-center gap-1.5">
              Your runLoop()
              {on && learner !== null && <Chip tone={matches ? "ok" : "bad"}>{matches ? "✓ matches" : "✗ differs"}</Chip>}
            </div>
            <div className="hud-log min-h-[2.2rem] rounded-md border border-white/10 bg-black/30 px-2 py-1">
              {!on ? (
                <span className="text-white/30">Finish the lesson to compare your loop with the real one.</span>
              ) : learner === null ? (
                <span className="text-white/40">runLoop(script) did not return an array{program?.lastError ? `: ${program.lastError}` : "."}</span>
              ) : (
                <div className={matches ? "hud-accent" : "hud-warning"}>
                  {learner.length ? learner.join(" → ") : "(empty)"}
                  {!matches && <div className="mt-0.5 text-white/55">expected {run.output.join(" → ")}</div>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
