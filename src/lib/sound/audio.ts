"use client";

/**
 * The one audio model for the whole app.
 *
 *  - Settings live in the progress store (`progress.audio`: { enabled, volume }), so they persist, sync for signed-in
 *    learners and follow other tabs through the storage event. They default to OFF; nobody is un-muted by a default.
 *  - Every sound the app makes (UI sounds in sound.ts, Beat Lab's synth, any future scene) goes through ONE shared
 *    AudioContext and ONE master GainNode from here, so volume and mute apply instantly to everything, including
 *    sounds that are already ringing (the gain is ramped, so there are no clicks).
 *  - Autoplay policy: nothing is created on page load. The context is only created, and only resumed, once the person
 *    has interacted with the page AND audio is on; while muted `getAudioContext()` returns null and nothing makes sound.
 *
 * A scene that makes sound must connect to `getAudioOutput()` (never `ctx.destination`) and be listed in
 * AUDIO_SCENE_IDS so its stage shows the sound control.
 */

import { useMemo } from "react";
import { getProgress, setAudio, subscribeProgress, useProgress } from "@/data/progress/store";
import { DEFAULT_AUDIO, type AudioSettings } from "@/data/progress/types";

/** Scenes (by Project.sceneId) that produce sound. Their stage shows the sound control and the "Sound off" chip. */
export const AUDIO_SCENE_IDS: ReadonlySet<string> = new Set(["beatlab"]);

/** Seconds for gain changes to settle: long enough to avoid clicks, short enough to feel instant. */
const RAMP = 0.025;
/** How long after muting before the shared context is suspended (lets the ramp finish and frees the audio device). */
const SUSPEND_AFTER_MS = 400;

type Ctor = typeof AudioContext;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let unsubscribe: (() => void) | null = null;
let suspendTimer: ReturnType<typeof setTimeout> | null = null;
let activated = false;
let lastTarget = -1;

// ───────────── settings ─────────────

/** Volume 0..1 -> linear gain. Slightly steeper than linear so the low end of the slider is usable. */
export function gainFor(volume: number): number {
  const v = Math.min(1, Math.max(0, volume));
  return 1.2 * Math.pow(v, 1.5);
}

export function getAudioSettings(): AudioSettings {
  return getProgress().audio;
}

/** Sound will actually be heard: switched on and not turned all the way down. */
export function isAudible(settings: AudioSettings = getAudioSettings()): boolean {
  return settings.enabled && settings.volume > 0;
}

/** Turn sound on (restoring a sensible volume when the slider was left at 0). */
export function enableAudio() {
  const a = getAudioSettings();
  setAudio({ enabled: true, volume: a.volume > 0 ? a.volume : DEFAULT_AUDIO.volume });
}

export function disableAudio() {
  setAudio({ enabled: false });
}

/** Moving the slider above 0 is a clear request to hear things, so it also switches sound on. */
export function setVolume(volume: number) {
  const v = Math.round(Math.min(1, Math.max(0, volume)) * 100) / 100;
  setAudio(v > 0 ? { volume: v, enabled: true } : { volume: 0 });
}

export function toggleAudio() {
  if (isAudible()) disableAudio();
  else enableAudio();
}

export interface AudioControls {
  enabled: boolean;
  volume: number;
  /** enabled and volume > 0 */
  audible: boolean;
  enable: () => void;
  disable: () => void;
  toggle: () => void;
  setVolume: (volume: number) => void;
}

const CONTROLS = { enable: enableAudio, disable: disableAudio, toggle: toggleAudio, setVolume };

/** Reactive audio settings for components; every caller sees the same state. */
export function useAudioSettings(): AudioControls {
  const { audio } = useProgress();
  return useMemo(
    () => ({ enabled: audio.enabled, volume: audio.volume, audible: isAudible(audio), ...CONTROLS }),
    [audio],
  );
}

// ───────────── the shared context ─────────────

function markActivated() {
  activated = true;
}
if (typeof window !== "undefined") {
  for (const type of ["pointerdown", "keydown", "touchstart"] as const) window.addEventListener(type, markActivated, { capture: true, passive: true });
}

function hasUserActivation(): boolean {
  if (activated) return true;
  if (typeof navigator === "undefined") return false;
  return (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive === true;
}

function applyMaster() {
  if (!ctx || !master) return;
  const settings = getAudioSettings();
  const audible = isAudible(settings);
  const target = audible ? gainFor(settings.volume) : 0;
  if (target !== lastTarget) {
    lastTarget = target;
    const t = ctx.currentTime;
    const g = master.gain;
    g.cancelScheduledValues(t);
    if (ctx.state === "running") {
      g.setValueAtTime(g.value, t);
      g.setTargetAtTime(target, t, RAMP);
    } else {
      // suspended (hidden tab, or parked while muted): nothing is audible, so jump; a ramp would never be rendered
      g.value = target;
    }
  }
  if (suspendTimer) {
    clearTimeout(suspendTimer);
    suspendTimer = null;
  }
  if (audible) {
    if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  } else if (ctx.state === "running") {
    const c = ctx;
    suspendTimer = setTimeout(() => {
      suspendTimer = null;
      if (c === ctx && !isAudible() && c.state === "running") void c.suspend().catch(() => {});
    }, SUSPEND_AFTER_MS);
  }
}

/**
 * The shared AudioContext, or null when sound is off, there has been no user interaction yet, or Web Audio is missing.
 * Safe to call from any gesture handler or scheduler; resumes the context if the browser suspended it.
 */
export function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!isAudible()) return null;
  if (!ctx) {
    if (!hasUserActivation()) return null;
    const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
    const Ctx = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctx) return null;
    try {
      ctx = new Ctx({ latencyHint: "interactive" });
    } catch {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = gainFor(getAudioSettings().volume);
    lastTarget = master.gain.value;
    master.connect(ctx.destination);
    unsubscribe ??= subscribeProgress(applyMaster);
  }
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});
  return ctx;
}

/** The node every sound must connect to (the master gain), or null while sound is unavailable. */
export function getAudioOutput(): GainNode | null {
  return getAudioContext() ? master : null;
}
