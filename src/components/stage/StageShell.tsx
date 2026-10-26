"use client";

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Lock, Maximize2, Minimize2, Play, Sparkles, X } from "lucide-react";
import type { Project } from "@/engine/types";
import type { ProgramHandle } from "@/engine/program";
import type { Celebration } from "@/engine/scene";
import { SCENES } from "@/engine/scenes";
import { FeatureIcon } from "@/components/ui/icons";

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
  /** Shown in the stage title bar while there is no program yet. */
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
  const [dismissedError, setDismissedError] = useState<string | null>(null);
  const [expandedError, setExpandedError] = useState<string | null>(null);
  const Scene = SCENES[project.sceneId];

  const subscribeToErrors = useCallback(
    (listener: () => void) => (program ? program.subscribe(listener) : NOOP_UNSUBSCRIBE),
    [program],
  );
  const hookError = useSyncExternalStore(subscribeToErrors, () => program?.lastError ?? null, () => null);

  // Once the hook recovers, forget the dismissal so the next failure shows again.
  if (hookError === null && dismissedError !== null) setDismissedError(null);

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
  const showError = hookError !== null && hookError !== dismissedError;
  const errorExpanded = hookError !== null && expandedError === hookError;
  const errorLong = hookError !== null && (hookError.length > 90 || hookError.includes("\n"));
  const showEmpty = !program && status !== "loading" && !!emptyHint;
  const pillShown = status === "loading" || showEmpty;
  const showToast = celebration && celebration.nonce !== dismissedNonce && celebration.features.length > 0;

  return (
    <div
      ref={rootRef}
      className={`relative isolate flex h-full min-h-[260px] w-full min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-[var(--stage-bg)] text-white ${className}`}
    >
      {/* header */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent px-3 py-2.5">
        <div className="flex min-w-0 shrink items-center gap-2 text-xs font-medium">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${program ? "bg-[#a3e635]" : "bg-white/30"}`}
            aria-hidden
          />
          <span className="truncate text-white/80">
            {program ? "Live" : "Blueprint"}
            <span className={pillShown ? "hidden sm:inline" : ""}> · {project.title}</span>
          </span>
        </div>
        {/* status pill: lives in the title bar so it never covers a scene's own header */}
        <div className="pointer-events-none flex min-w-0 flex-1 justify-end">
          {status === "loading" ? (
            <span className="hud-tag max-w-full shrink-0 gap-1.5" role="status">
              <span className="h-2.5 w-2.5 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-[#a3e635]" />
              <span className="truncate">{statusText || "Booting Python…"}</span>
            </span>
          ) : showEmpty ? (
            <span className="hud-tag max-w-full shrink-0 gap-1.5">
              <Play className="h-3 w-3 shrink-0 text-[#d9f99d]" fill="currentColor" />
              <span className="truncate">{emptyHint}</span>
            </span>
          ) : null}
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

      {/* hook error: a slim strip under the title bar that pushes the scene down (never overlays it) */}
      {showError && (
        <div className="relative top-[42px] z-30 mx-2 shrink-0" role="alert">
          <div className="flex items-start gap-2 rounded-lg border border-[#f87171]/40 bg-[#2a0f0f]/90 py-1.5 pl-2.5 pr-1.5 backdrop-blur">
            <AlertTriangle className="hud-danger mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <p className={`hud-log min-w-0 flex-1 whitespace-pre-wrap break-words text-[#fecaca] ${errorExpanded ? "max-h-40 overflow-y-auto" : "line-clamp-2"}`}>
              {hookError}
            </p>
            {errorLong && (
              <button
                onClick={() => setExpandedError(errorExpanded ? null : hookError)}
                aria-expanded={errorExpanded}
                aria-label={errorExpanded ? "Collapse error" : "Expand error"}
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10"
              >
                {errorExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}
            <button
              onClick={() => setDismissedError(hookError)}
              aria-label="Dismiss error"
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

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

        {showToast && celebration && (
          <div key={celebration.nonce} className="pop-in pointer-events-none absolute inset-x-0 bottom-16 z-30 flex justify-center px-4">
            <div
              className="flex max-w-md items-center gap-3 rounded-xl border border-white/10 bg-[#111]/90 px-4 py-3 text-white shadow-2xl backdrop-blur"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#a3e635] text-[#0a0a0a]">
                <Sparkles className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-white/50">Now working</p>
                {celebration.features.map((id) => {
                  const f = featureById.get(id);
                  return f ? (
                    <p key={id} className="text-sm font-medium leading-snug">
                      {f.title} <span className="text-white/60">· {f.blurb}</span>
                    </p>
                  ) : null;
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* feature rail */}
      <div className="relative z-20 flex shrink-0 items-center gap-1.5 overflow-x-auto border-t border-white/[0.06] bg-[#0b0b0b] px-3 py-2">
        {project.features.map((f) => {
          const alive = unlocked.has(f.id);
          const spot = focus === f.id && !alive;
          return (
            <span
              key={f.id}
              title={alive ? f.blurb : `Locked — ${f.blurb}`}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                alive
                  ? "border-white/10 bg-white/[0.06] text-white"
                  : spot
                    ? "border-[#a3e635]/60 text-white"
                    : "border-white/[0.06] text-white/35"
              }`}
            >
              {alive ? <FeatureIcon id={f.id} className="h-3 w-3 text-[#a3e635]" /> : <Lock className="h-3 w-3" />}
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
