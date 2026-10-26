"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Volume, Volume1, Volume2, VolumeX } from "lucide-react";
import { useAudioSettings } from "@/lib/sound/audio";
import { sound } from "@/lib/sound/sound";

type Variant = "navbar" | "stage" | "header";

/**
 * The speaker control. One audio model for the app (src/lib/sound/audio.ts): every instance reads and writes the same
 * settings, so changing it here updates the navbar, the stage and other tabs.
 *
 *   [ speaker ]  toggles mute         [ v ]  opens the popover: volume slider (native range input, arrows adjust),
 *                                            mute switch; Esc closes and returns focus to the chevron.
 *
 * variants: "navbar" (page chrome, 40px targets on touch), "header" (the lesson workspace's slim header) and
 * "stage" (dark title bar of an interactive stage; shows a "Sound off" chip so learners know the demo has sound).
 */
export function SoundControl({ variant = "navbar", className = "" }: { variant?: Variant; className?: string }) {
  const audio = useAudioSettings();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const popId = useId();
  const stage = variant === "stage";
  const pct = Math.round(audio.volume * 100);
  const Icon = !audio.audible ? VolumeX : audio.volume < 0.2 ? Volume : audio.volume < 0.6 ? Volume1 : Volume2;

  // the slider is what you reach for first: focus it when the popover opens (so the arrow keys work straight away)
  useEffect(() => {
    if (open) sliderRef.current?.focus({ preventScroll: true });
  }, [open]);

  // click or tap outside closes
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  const toggleMute = () => {
    audio.toggle();
    // a little tick confirms it works (and creates the audio context inside this click, which the browser requires)
    sound.playClick();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

  const onBlur = (e: React.FocusEvent) => {
    if (open && !rootRef.current?.contains(e.relatedTarget as Node | null) && e.relatedTarget) setOpen(false);
  };

  const btn = {
    navbar: "grid h-10 w-10 place-items-center rounded-md text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink sm:h-8 sm:w-8",
    header: "grid h-8 w-8 place-items-center rounded-full text-ink-2 hover:bg-surface-2 hover:text-ink",
    stage: "inline-flex h-7 items-center gap-1.5 rounded-full bg-white/10 px-2 text-xs font-medium text-white/85 backdrop-blur hover:bg-white/20",
  }[variant];
  const chevron = {
    navbar: "grid h-10 w-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink sm:h-8 sm:w-5",
    header: "grid h-8 w-5 place-items-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-ink",
    stage: "grid h-7 w-5 place-items-center rounded-full text-white/70 hover:bg-white/10 hover:text-white",
  }[variant];

  // The popover anchors to the nearest positioned ancestor: in the navbar that is the pill (so it always fits the
  // screen; from sm up it sits under the control), on a stage it is the title bar, in the lesson header this control.
  const wrap = variant === "header" ? "relative" : variant === "navbar" ? "sm:relative" : "";
  const pop = stage
    ? "absolute right-2 top-full z-40 mt-1 w-64 max-w-[calc(100%-1rem)] rounded-xl border border-white/10 bg-[#111]/95 p-3 text-white shadow-2xl backdrop-blur"
    : variant === "header"
      ? "absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-line bg-surface p-3 text-ink shadow-[var(--shadow)]"
      : "absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-2xl border border-line bg-surface p-3 text-ink shadow-[var(--shadow)]";
  const sub = stage ? "text-white/65" : "text-ink-2";

  return (
    <div ref={rootRef} className={`flex items-center ${wrap} ${className}`} onKeyDown={onKeyDown} onBlur={onBlur} data-sound-control={variant}>
      <button
        type="button"
        onClick={toggleMute}
        aria-label={audio.audible ? "Mute sound" : "Unmute sound"}
        title={audio.audible ? "Sound on — click to mute" : "Sound off — click to turn on"}
        className={btn}
        data-sound-toggle
      >
        <Icon className={stage ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
        {stage && !audio.audible && <span data-sound-chip>Sound off</span>}
      </button>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Volume settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        className={chevron}
        data-sound-menu
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div id={popId} role="dialog" aria-label="Sound settings" className={pop} data-sound-popover>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Sound</span>
            <button
              type="button"
              role="switch"
              aria-checked={audio.audible}
              aria-label="Sound on"
              onClick={toggleMute}
              className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
                audio.audible ? "border-transparent bg-primary" : stage ? "border-white/20 bg-white/10" : "border-line bg-surface-2"
              }`}
              data-sound-switch
            >
              <span
                className={`absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${audio.audible ? "translate-x-5" : ""}`}
                aria-hidden
              />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2.5">
            <Icon className={`h-4 w-4 shrink-0 ${sub}`} aria-hidden />
            <input
              ref={sliderRef}
              type="range"
              min={0}
              max={100}
              step={1}
              value={pct}
              onChange={(e) => audio.setVolume(Number(e.target.value) / 100)}
              onPointerUp={() => sound.playClick()}
              onKeyUp={(e) => {
                if (e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End" || e.key.startsWith("Page")) sound.playClick();
              }}
              aria-label="Volume"
              aria-valuetext={`${pct}%`}
              className="h-10 min-w-0 flex-1 cursor-pointer accent-[var(--primary)] sm:h-6"
              data-sound-slider
            />
            <output className={`w-10 shrink-0 text-right text-xs font-medium tabular-nums ${sub}`} aria-hidden>
              {pct}%
            </output>
          </div>

          <p className={`mt-2 text-xs leading-snug ${sub}`}>{audio.audible ? "Applies to every demo and sound on pockett." : "Sound is off by default. Turn it on to hear the demos."}</p>
        </div>
      )}
    </div>
  );
}
