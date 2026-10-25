"use client";

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AlertTriangle, Lock, Maximize2, Minimize2, Play, Sparkles } from "lucide-react";
import type { Project } from "@/engine/types";
import type { ProgramHandle } from "@/engine/program";
import type { Celebration } from "@/engine/scene";
import { SCENES } from "@/engine/scenes";

export type StageStatus = "idle" | "loading" | "running";

interface StageShellProps {
  project: Project;
  program: ProgramHandle | null;
  unlocked: ReadonlySet<string>;
  focus?: string | null;
  celebration?: Celebration | null;
  interactive?: boolean;
  status?: StageStatus;
  statusText?: string;
  /** Shown over the stage while there is no program yet. */
  emptyHint?: string;
  className?: string;
  hideControls?: boolean;
  /** Ask the scene to demonstrate itself (landing page). */
  autoplayScene?: boolean;
}

const NOOP_UNSUBSCRIBE = () => {};

export function StageShell({
  project,
  program,
  unlocked,
  focus = null,
  celebration = null,
  interactive = true,
  status = "idle",
  statusText,
  emptyHint,
  className = "",
  hideControls = false,
  autoplayScene = false,
}: StageShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [dismissedNonce, setDismissedNonce] = useState<number | null>(null);
  const Scene = SCENES[project.sceneId];

  const subscribeToErrors = useCallback(
    (listener: () => void) => (program ? program.subscribe(listener) : NOOP_UNSUBSCRIBE),
    [program],
  );
  const hookError = useSyncExternalStore(subscribeToErrors, () => program?.lastError ?? null, () => null);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!celebration) return;
    const t = setTimeout(() => setDismissedNonce(celebration.nonce), 4200);
    return () => clearTimeout(t);
  }, [celebration]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.();
  };

  const featureById = new Map(project.features.map((f) => [f.id, f]));
  const showToast = celebration && celebration.nonce !== dismissedNonce && celebration.features.length > 0;

  return (
    <div
      ref={rootRef}
      className={`relative isolate flex h-full min-h-[260px] w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-[var(--stage-bg)] text-white ${className}`}
    >
      {/* header */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${program ? "bg-[#a3e635] pulse-ring" : "bg-white/30"}`}
            aria-hidden
          />
          <span className="truncate text-white/80">
            {program ? "Live" : "Blueprint"} · {project.title}
          </span>
        </div>
        {!hideControls && (
          <button
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-white/80 backdrop-blur hover:bg-white/20"
          >
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* scene */}
      <div className="relative min-h-0 flex-1">
        {Scene ? (
          <Scene
            program={program}
            unlocked={unlocked}
            focus={focus}
            celebration={celebration}
            interactive={interactive}
            autoplay={autoplayScene}
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-white/50">Scene “{project.sceneId}” is not registered.</div>
        )}

        {!program && status !== "loading" && emptyHint && (
          <div className="pointer-events-none absolute inset-x-0 top-12 z-10 flex justify-center px-4">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-4 py-2 text-xs font-semibold backdrop-blur">
              <Play className="h-3.5 w-3.5 text-[#d9f99d]" fill="currentColor" />
              {emptyHint}
            </div>
          </div>
        )}

        {status === "loading" && (
          <div className="absolute inset-x-0 top-12 z-10 flex justify-center px-4">
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/70 px-4 py-2 text-xs font-semibold backdrop-blur">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-[#a3e635]" />
              {statusText || "Booting Python…"}
            </div>
          </div>
        )}

        {hookError && (
          <div className="absolute inset-x-3 top-12 z-10 flex items-start gap-2 rounded-xl border border-rose-400/40 bg-rose-950/85 px-3 py-2 text-xs text-rose-100 backdrop-blur">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
            <span className="font-mono leading-relaxed">{hookError}</span>
          </div>
        )}

        {showToast && celebration && (
          <div key={celebration.nonce} className="pop-in pointer-events-none absolute inset-x-0 bottom-16 z-30 flex justify-center px-4">
            <div
              className="flex max-w-md items-center gap-3 rounded-2xl px-4 py-3 text-[#0a0c06] shadow-2xl"
              style={{ background: "#a3e635" }}
            >
              <Sparkles className="h-5 w-5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] opacity-70">Unlocked</p>
                {celebration.features.map((id) => {
                  const f = featureById.get(id);
                  return f ? (
                    <p key={id} className="text-sm font-bold leading-snug">
                      {f.emoji} {f.title}: <span className="font-medium">{f.blurb}</span>
                    </p>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* feature rail */}
      <div className="relative z-20 flex shrink-0 items-center gap-1.5 overflow-x-auto bg-gradient-to-t from-black/80 to-black/30 px-3 py-2">
        {project.features.map((f) => {
          const alive = unlocked.has(f.id);
          const spot = focus === f.id && !alive;
          return (
            <span
              key={f.id}
              title={alive ? f.blurb : `Locked — ${f.blurb}`}
              className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                alive
                  ? "border-transparent text-[#0a0c06]"
                  : spot
                    ? "pulse-ring border-white/60 text-white"
                    : "border-white/15 text-white/40"
              }`}
              style={alive ? { background: "#a3e635" } : undefined}
            >
              {alive ? <span aria-hidden>{f.emoji}</span> : <Lock className="h-2.5 w-2.5" />}
              {f.title}
            </span>
          );
        })}
        {interactive && project.controls.length > 0 && (
          <span className="ml-auto hidden shrink-0 pl-3 font-mono text-[10px] text-white/45 xl:block">
            {project.controls.join("  ·  ")}
          </span>
        )}
      </div>
    </div>
  );
}
