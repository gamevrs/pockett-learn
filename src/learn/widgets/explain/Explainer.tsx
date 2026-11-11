"use client";

import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { useReducedMotion } from "./useReducedMotion";

/**
 * A step-through motion explainer: a row of scenes drawn on one SVG stage, with play / pause,
 * previous / next, a scrubber and a real-text caption under the stage.
 *
 * A scene is a pure function of its progress `t` (0..1), so scrubbing, stepping and playing all
 * draw the same picture. The stage is decorative (aria-hidden): the caption carries the meaning.
 * Starts paused; no global key handlers (LessonPlayer owns Enter and Space), only real buttons.
 * With reduced motion every scene is drawn finished (t = 1) and Play just steps scene by scene.
 */

export interface ExplainScene {
  id: string;
  title: string;
  /** Plain text shown under the stage; says everything the drawing shows. */
  caption: string;
  durationMs: number;
  /** Draw the stage at progress t. `reduced` is true when tweens should be skipped (t is then 1). */
  render: (t: number, reduced: boolean) => React.ReactNode;
}

export interface ExplainerProps {
  scenes: ExplainScene[];
  /** SVG viewBox size; it scales to the card's width. */
  width?: number;
  height?: number;
  /** Accessible name for the whole player. */
  label: string;
}

export function Explainer({ scenes, width = 360, height = 240, label }: ExplainerProps) {
  const reduced = useReducedMotion();
  const [scene, setScene] = useState(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  /** Playback ran off the end of the last scene: Play turns into Replay. */
  const [ended, setEnded] = useState(false);
  const tRef = useRef(0);

  const last = scenes.length - 1;
  const sc = scenes[Math.min(scene, last)];
  const dur = sc.durationMs;

  // the animation clock: advances t while playing, moves on to the next scene, stops at the end
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - prev, 100); // a background tab must not jump the scene
      prev = now;
      tRef.current += dt / dur;
      if (tRef.current >= 1) {
        if (scene < last) {
          tRef.current = 0;
          setT(0);
          setScene(scene + 1);
        } else {
          tRef.current = 1;
          setT(1);
          setPlaying(false);
          setEnded(true);
        }
        return;
      }
      setT(tRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, scene, dur, last]);

  const jump = (i: number, at: number) => {
    tRef.current = at;
    setScene(i);
    setT(at);
    setEnded(false);
  };
  // stepping while paused shows the finished picture; while playing a scene starts from its beginning
  const go = (i: number) => jump(Math.max(0, Math.min(last, i)), playing ? 0 : 1);

  const toggle = () => {
    if (playing) {
      setPlaying(false);
      return;
    }
    if (ended) jump(0, 0);
    else if (t >= 1) jump(scene, 0);
    setPlaying(true);
  };

  const shown = reduced ? 1 : t;
  const label2 = playing ? "Pause" : ended ? "Replay" : "Play";

  return (
    <div className="w-full max-w-2xl" data-widget role="group" aria-label={label}>
      <div className="overflow-hidden rounded-xl border border-line bg-surface-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="block h-auto w-full" aria-hidden="true">
          {sc.render(shown, reduced)}
        </svg>
      </div>

      <div className="mt-3 flex items-stretch gap-1" role="group" aria-label="Scenes">
        {scenes.map((s, i) => {
          const fill = i < scene ? 1 : i === scene ? t : 0;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => jump(i, playing ? 0 : 1)}
              aria-label={`Scene ${i + 1}: ${s.title}`}
              aria-current={i === scene ? "step" : undefined}
              className="group flex min-h-10 flex-1 items-center"
            >
              <span className="block h-2 w-full overflow-hidden rounded-full bg-[var(--line-strong)] group-hover:bg-[var(--ink-3)]/50">
                <span className="block h-full rounded-full bg-[var(--brand)]" style={{ width: `${fill * 100}%` }} />
              </span>
            </button>
          );
        })}
      </div>

      <label className="mt-1 block">
        <span className="sr-only">Scrub through this scene</span>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(t * 1000)}
          onChange={(e) => {
            setPlaying(false);
            tRef.current = Number(e.target.value) / 1000;
            setT(tRef.current);
            setEnded(false);
          }}
          className="h-10 w-full cursor-pointer accent-[var(--brand)]"
        />
      </label>

      <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
        <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" onClick={() => go(scene - 1)} disabled={scene === 0} aria-label="Previous scene" title="Previous scene">
          <ChevronLeft size={18} aria-hidden />
        </button>
        <button type="button" className="btn btn-primary !h-10 min-w-28" onClick={toggle}>
          {playing ? <Pause size={16} aria-hidden /> : ended ? <RotateCcw size={16} aria-hidden /> : <Play size={16} aria-hidden />}
          {label2}
        </button>
        <button type="button" className="btn btn-ghost !h-10 !w-10 !p-0" onClick={() => go(scene + 1)} disabled={scene === last} aria-label="Next scene" title="Next scene">
          <ChevronRight size={18} aria-hidden />
        </button>
        <span className="chip font-mono tabular-nums" aria-label={`Scene ${scene + 1} of ${scenes.length}`}>
          {scene + 1} / {scenes.length}
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-line bg-surface p-3" aria-live="polite">
        <p className="text-sm font-semibold text-ink">{sc.title}</p>
        <p className="mt-1 text-[14px] leading-relaxed text-ink-2">{sc.caption}</p>
      </div>
    </div>
  );
}
