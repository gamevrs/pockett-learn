/**
 * Beat Lab step logic: pure, DOM-free and import-free so it can be unit-tested in Node
 * (see scripts/test-beatlab.mjs). Everything here must tolerate ANY learner value:
 * strings of the wrong length, numbers instead of 0/1, NaN, negatives, giant lists...
 * Nothing in this file throws.
 */

export const STEPS = 16;
export const TRACK_IDS = ["kick", "snare", "clap", "hats", "bass"] as const;
export type TrackId = (typeof TRACK_IDS)[number];
export type Section = "groove" | "fill" | "drop" | "break";
export const SECTIONS: readonly Section[] = ["groove", "fill", "drop", "break"];

export const BPM_MIN = 40;
export const BPM_MAX = 240;
export const BPM_DEFAULT = 100;
export const SWING_MAX = 0.6;
export const HZ_MIN = 16;
export const HZ_MAX = 8000;

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

// ───────────────────────── scalars ─────────────────────────

/** Tempo in beats per minute. Missing / NaN / zero / negative -> default, otherwise clamped. */
export function normBpm(v: unknown): number {
  if (!isNum(v) || v <= 0) return BPM_DEFAULT;
  return clamp(v, BPM_MIN, BPM_MAX);
}

export function normSwing(v: unknown): number {
  return isNum(v) ? clamp(v, 0, SWING_MAX) : 0;
}

/** A 0..1 volume. Anything that is not a finite number uses the fallback. */
export function normVolume(v: unknown, fallback: number): number {
  return isNum(v) ? clamp(v, 0, 1) : fallback;
}

export function normPan(v: unknown): number {
  return isNum(v) ? clamp(v, -1, 1) : 0;
}

/** Seconds per 16th-note step. */
export function stepSeconds(bpm: number): number {
  return 60 / normBpm(bpm) / 4;
}

// ───────────────────────── patterns ─────────────────────────

/**
 * One step of a pattern -> hit level 0..2.
 *   0 = rest, 1 = normal hit, 2 = accent, in-between numbers are softer/louder hits.
 * Strings: "x" or "1" = 1, "X" or "2" = 2, anything else (".", "-", " ", "0"...) = rest.
 * Booleans: true = 1.
 */
export function normLevel(v: unknown): number {
  let n = 0;
  if (typeof v === "number") n = Number.isFinite(v) ? v : 0;
  else if (typeof v === "boolean") n = v ? 1 : 0;
  else if (typeof v === "string") {
    const c = v.charAt(0);
    n = c === "x" || c === "1" ? 1 : c === "X" || c === "2" ? 2 : 0;
  }
  n = clamp(n, 0, 2);
  return n < 0.02 ? 0 : n;
}

/**
 * Turn a learner's pattern (string or list) into exactly `steps` levels.
 * Too long -> cut off. Too short -> padded with rests (so a forgotten `* 4` is visible, not hidden).
 */
export function normPattern(raw: unknown, steps: number = STEPS): number[] {
  const out = new Array<number>(steps).fill(0);
  if (typeof raw === "string") {
    for (let i = 0; i < steps && i < raw.length; i++) out[i] = normLevel(raw.charAt(i));
  } else if (Array.isArray(raw)) {
    for (let i = 0; i < steps && i < raw.length; i++) out[i] = normLevel(raw[i]);
  }
  return out;
}

/** The learner's raw pattern length, or -1 when it is missing / not a string or list. */
export function rawLength(raw: unknown): number {
  if (typeof raw === "string" || Array.isArray(raw)) return raw.length;
  return -1;
}

/** MIDI note numbers for the bass: 0 = rest. Non-numbers become rests, decimals are rounded. */
export function normNotes(raw: unknown, steps: number = STEPS): number[] {
  const out = new Array<number>(steps).fill(0);
  if (Array.isArray(raw)) {
    for (let i = 0; i < steps && i < raw.length; i++) {
      const v = raw[i];
      out[i] = isNum(v) && v >= 1 ? clamp(Math.round(v), 1, 127) : 0;
    }
  }
  return out;
}

/** Hit level -> linear gain 0..1 (quiet ghost notes still audible, accents hit full). */
export function levelGain(level: number): number {
  if (!(level > 0)) return 0;
  return Math.min(1, 0.35 + 0.4 * level);
}

// ───────────────────────── frequencies ─────────────────────────

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/** 33 -> "A1" (MIDI 60 = C4). */
export function midiName(note: number): string {
  if (!isNum(note) || note < 0) return "--";
  const n = Math.round(note);
  return `${NOTE_NAMES[n % 12]}${Math.floor(n / 12) - 1}`;
}

/** The real equal-temperament formula; used when the learner's function is missing or broken. */
export function midiToHzReference(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

/** Accept a learner-computed frequency only if it is a sane audible number. */
export function sanitizeHz(raw: unknown, note: number): { hz: number; ok: boolean } {
  if (isNum(raw) && raw >= HZ_MIN && raw <= HZ_MAX) return { hz: raw, ok: true };
  return { hz: midiToHzReference(note), ok: false };
}

// ───────────────────────── mixer ─────────────────────────

export interface TrackMix {
  volume: number;
  pan: number;
  mute: boolean;
}

export const DEFAULT_MIX: TrackMix = { volume: 1, pan: 0, mute: false };

export function normTrackMix(raw: unknown): TrackMix {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_MIX };
  const r = raw as Record<string, unknown>;
  return { volume: normVolume(r.volume, 1), pan: normPan(r.pan), mute: r.mute === true };
}

export function normMixer(raw: unknown): Record<TrackId, TrackMix> {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out = {} as Record<TrackId, TrackMix>;
  for (const id of TRACK_IDS) out[id] = normTrackMix(src[id]);
  return out;
}

// ───────────────────────── sections (arranger) ─────────────────────────

export function normSection(raw: unknown): Section {
  if (typeof raw !== "string") return "groove";
  const s = raw.trim().toLowerCase();
  return (SECTIONS as readonly string[]).includes(s) ? (s as Section) : "groove";
}

const FILL_SNARE: Record<number, number> = { 8: 0.6, 10: 0.8, 12: 1.2, 13: 1.4, 14: 1.7, 15: 2 };

/**
 * How a section rewrites a track's hit at a given step.
 *   groove: untouched.  fill: snare roll into the next bar, other drums step out of the way.
 *   drop: kick and bass hit at full accent.  break: kick and bass drop out.
 */
export function sectionLevel(section: Section, track: TrackId, step: number, base: number): number {
  switch (section) {
    case "fill":
      if (track === "snare") return step >= 8 ? FILL_SNARE[step] ?? 0 : base;
      if (track === "kick") return step >= 13 ? 0 : base;
      if (track === "clap") return step >= 8 ? 0 : base;
      if (track === "hats") return step >= 12 ? 0 : base;
      return base;
    case "drop":
      if ((track === "kick" || track === "bass") && base > 0) return Math.min(2, base + 1);
      return base;
    case "break":
      return track === "kick" || track === "bass" ? 0 : base;
    default:
      return base;
  }
}

/** Crash cymbal on the first step of a drop. */
export function sectionCrash(section: Section, step: number): boolean {
  return section === "drop" && step === 0;
}

// ───────────────────────── transport (look-ahead scheduling) ─────────────────────────

export interface Transport {
  /** Un-swung time of the next step, in seconds on whatever clock the caller uses. */
  grid: number;
  /** Steps scheduled since start (0, 1, 2 ...). bar = floor(counter / 16). */
  counter: number;
  primed: boolean;
}

export interface StepEvent {
  counter: number;
  bar: number;
  step: number;
  /** When this step should sound (swing included). */
  time: number;
}

export function createTransport(): Transport {
  return { grid: 0, counter: 0, primed: false };
}

/** Start from step 0, first step `lead` seconds from `now`. */
export function startTransport(t: Transport, now: number, lead = 0.08): void {
  t.grid = now + lead;
  t.counter = 0;
  t.primed = true;
}

/** Same position in the loop, new time base (e.g. audio just came online). */
export function resyncTransport(t: Transport, now: number, lead = 0.06): void {
  t.grid = now + lead;
}

/** Odd 16ths are pushed later by `swing` of a step, so the offbeats lilt. */
export function swingDelay(step: number, swing: number, stepSec: number): number {
  return step % 2 === 1 ? normSwing(swing) * stepSec : 0;
}

/**
 * The scheduler core: returns every step that falls inside [now, now + ahead) and advances
 * the transport past them. Call it from a ~25ms timer. If the caller stalled (throttled tab)
 * the missed steps are skipped, not burst out all at once.
 */
export function collectSteps(t: Transport, now: number, ahead: number, bpm: number, swing: number, max = 48): StepEvent[] {
  const out: StepEvent[] = [];
  if (!t.primed) return out;
  const sec = stepSeconds(bpm);
  if (t.grid < now - 0.2) {
    const skip = Math.ceil((now + 0.02 - t.grid) / sec);
    t.counter += skip;
    t.grid += skip * sec;
  }
  while (out.length < max && t.grid < now + ahead) {
    const step = t.counter % STEPS;
    out.push({ counter: t.counter, bar: Math.floor(t.counter / STEPS), step, time: t.grid + swingDelay(step, swing, sec) });
    t.counter++;
    t.grid += sec;
  }
  return out;
}
