/**
 * Beat Lab runtime: reads the learner's program into a Model, runs the look-ahead audio
 * scheduler, owns the synth, and keeps the visual state (current step, hit flashes,
 * energies...) that the 3D stage and the HTML HUD read every frame. No DOM drawing here.
 */
import type { ProgramHandle } from "@/engine/program";
import type { SceneProps } from "@/engine/scene";
import {
  STEPS,
  TRACK_IDS,
  collectSteps,
  createTransport,
  levelGain,
  normBpm,
  normMixer,
  normNotes,
  normPattern,
  normSection,
  normSwing,
  normVolume,
  rawLength,
  resyncTransport,
  sanitizeHz,
  midiToHzReference,
  sectionCrash,
  sectionLevel,
  startTransport,
  stepSeconds,
  type Section,
  type TrackId,
  type TrackMix,
  type Transport,
} from "./sequencer";
import { BeatSynth } from "./synth";

// ───────────────────────── static tables ─────────────────────────

export interface TrackMeta {
  label: string;
  feature: string;
  variable: string;
}

export const TRACKS: Record<TrackId, TrackMeta> = {
  kick: { label: "KICK", feature: "kick", variable: "kick_pattern" },
  snare: { label: "SNARE", feature: "snare", variable: "snare_pattern" },
  clap: { label: "CLAP", feature: "snare", variable: "clap_pattern" },
  hats: { label: "HATS", feature: "hats", variable: "hats_pattern" },
  bass: { label: "BASS", feature: "bass", variable: "bass_notes" },
};

const LOOKAHEAD = 0.12;

export type PatternId = Exclude<TrackId, "bass">;

// ───────────────────────── what we read from the learner's program ─────────────────────────

export interface Model {
  title: string;
  bpm: number;
  swing: number;
  master: number;
  tempo: boolean;
  patterns: Record<PatternId, number[]>;
  notes: number[];
  hz: number[];
  hzBad: boolean;
  hzHook: boolean;
  rawLen: Record<TrackId, number>;
  mix: Record<TrackId, TrackMix>;
}

const NONE = "\u0000";

function readRaw(program: ProgramHandle, name: string): unknown {
  if (!program.has(name)) return undefined;
  const s = program.str(name, NONE);
  if (s !== NONE) return s;
  return program.list(name);
}

export function trackAlive(id: TrackId, alive: (f: string) => boolean): boolean {
  return alive(TRACKS[id].feature);
}

function buildModel(program: ProgramHandle, alive: (f: string) => boolean): Model {
  const tempo = alive("tempo");
  const rawLen = {} as Record<TrackId, number>;
  const patterns = {} as Record<PatternId, number[]>;
  for (const id of TRACK_IDS) {
    const raw = trackAlive(id, alive) ? readRaw(program, TRACKS[id].variable) : undefined;
    rawLen[id] = rawLength(raw);
    if (id !== "bass") patterns[id] = normPattern(raw);
  }
  const notes = normNotes(trackAlive("bass", alive) ? readRaw(program, TRACKS.bass.variable) : undefined);

  // The learner's own midi_to_hz() is a pure function: ask it once per distinct note, per run.
  const hz = new Array<number>(STEPS).fill(0);
  let hzBad = false;
  const hook = alive("bass") && program.hasHook("midi_to_hz");
  const cache = new Map<number, number>();
  notes.forEach((note, i) => {
    if (note <= 0) return;
    let v = cache.get(note);
    if (v === undefined) {
      if (hook) {
        const res = sanitizeHz(program.call<number>("midi_to_hz", note), note);
        if (!res.ok) hzBad = true;
        v = res.hz;
      } else {
        v = midiToHzReference(note);
      }
      cache.set(note, v);
    }
    hz[i] = v;
  });

  return {
    title: tempo ? program.str("title", "").trim().slice(0, 60) : "",
    bpm: tempo ? normBpm(program.num("bpm", 100)) : 100,
    swing: tempo ? normSwing(program.num("swing", 0)) : 0,
    master: tempo ? normVolume(program.num("master_volume", 0.8), 0.8) : 0.8,
    tempo,
    patterns,
    notes,
    hz,
    hzBad,
    hzHook: hook,
    rawLen,
    mix: normMixer(alive("mixer") ? program.dict("tracks") : null),
  };
}


// ───────────────────────── runtime ─────────────────────────

interface Hit {
  track: TrackId;
  level: number;
}

interface Fired {
  time: number;
  step: number;
  bar: number;
  section: Section;
  hits: Hit[];
  crash: boolean;
}

export type AudioState = "unsupported" | "off" | "suspended" | "on";
export interface Ui {
  playing: boolean;
  audio: AudioState;
}

export interface SceneInputs {
  program: ProgramHandle | null;
  unlocked: ReadonlySet<string>;
  focus: string | null;
  celebration: SceneProps["celebration"];
  interactive: boolean;
  autoplay: boolean;
}

function hasTransientActivation(): boolean {
  if (typeof navigator === "undefined") return false;
  return (navigator as Navigator & { userActivation?: { isActive: boolean } }).userActivation?.isActive === true;
}

function zeros(): number[] {
  return new Array<number>(STEPS).fill(0);
}

/** Everything mutable lives here (not in React state): scheduler, audio, and the visual state the canvas reads. */
export class Runtime {
  props: SceneInputs = { program: null, unlocked: new Set(), focus: null, celebration: null, interactive: true, autoplay: false };
  onUi: ((ui: Ui) => void) | null = null;
  private ui: Ui | null = null;

  // program / model
  private lastProgram: ProgramHandle | null = null;
  private lastUnlocked: ReadonlySet<string> | null = null;
  private modelKey = "";
  private generation = -1;
  model: Model | null = null;

  // transport + audio
  synth: BeatSynth | null = null;
  private audioFailed = false;
  playing = false;
  private userStopped = false;
  private transport: Transport = createTransport();
  private kind: "audio" | "soft" | "none" = "none";
  private queue: Fired[] = [];
  private barSection: Section = "groove";

  // visual state
  step = -1;
  bar = 0;
  section: Section = "groove";
  stepAt = 0;
  flash: Record<TrackId, number[]> = { kick: zeros(), snare: zeros(), clap: zeros(), hats: zeros(), bass: zeros() };
  energy: Record<TrackId, number> = { kick: 0, snare: 0, clap: 0, hats: 0, bass: 0 };
  beat = 0;
  crashFlash = 0;
  bootStart = 0;
  time = 0;
  celebrateNonce = -1;
  celebrate = 0;
  lastBassNote = 0;
  /** Bumps every time a bass note fires (the stage spawns an orb). */
  bassSerial = 0;
  bassStep = 0;
  spectrum: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(128));

  setInputs(inputs: SceneInputs) {
    this.props = inputs;
  }

  // ───── lifecycle ─────

  attach(onUi: (ui: Ui) => void) {
    this.onUi = onUi;
    this.ui = null;
    // Re-mounted (e.g. route shown again): treat the program as brand new so playback restarts cleanly.
    this.generation = -1;
    this.modelKey = "";
    this.lastProgram = null;
    this.lastUnlocked = null;
    this.pushUi();
  }

  detach() {
    this.halt();
    this.synth?.dispose();
    this.synth = null;
    this.onUi = null;
    this.ui = null;
  }

  onVisibility() {
    if (typeof document === "undefined") return;
    if (document.hidden) void this.synth?.suspend();
    else if (this.playing && this.synth) void this.synth.resume();
  }

  private halt() {
    this.playing = false;
    this.queue = [];
    this.step = -1;
    this.transport = createTransport();
    this.kind = "none";
    this.synth?.silence();
  }

  private audioState(): AudioState {
    if (this.audioFailed) return "unsupported";
    if (!this.synth) return "off";
    return this.synth.running ? "on" : "suspended";
  }

  private pushUi() {
    const next: Ui = { playing: this.playing, audio: this.audioState() };
    if (this.ui && this.ui.playing === next.playing && this.ui.audio === next.audio) return;
    this.ui = next;
    this.onUi?.(next);
  }

  // ───── program / model ─────

  private alive = (id: string) => this.props.unlocked.has(id);

  ensureModel(): Model | null {
    const { program, unlocked } = this.props;
    if (program === this.lastProgram && unlocked === this.lastUnlocked) return this.model;
    this.lastProgram = program;
    this.lastUnlocked = unlocked;
    if (!program) {
      this.model = null;
      this.modelKey = "";
      this.generation = -1;
      if (this.playing) this.halt();
      this.pushUi();
      return null;
    }
    const key = `${program.generation}|${[...unlocked].sort().join(",")}`;
    if (key === this.modelKey && this.model) return this.model;
    this.modelKey = key;
    this.model = buildModel(program, this.alive);
    this.applyAudioSettings();

    if (program.generation !== this.generation) {
      this.generation = program.generation;
      this.userStopped = false;
      this.resetVisuals();
      this.synth?.silence();
      this.halt();
      if (this.alive("power")) this.start();
    } else if (!this.playing && !this.userStopped && this.alive("power")) {
      // lesson 1 just passed: the machine powers on
      this.start();
    }
    this.pushUi();
    return this.model;
  }

  private resetVisuals() {
    for (const id of TRACK_IDS) {
      this.flash[id].fill(0);
      this.energy[id] = 0;
    }
    this.step = -1;
    this.bar = 0;
    this.section = "groove";
    this.barSection = "groove";
    this.beat = 0;
    this.crashFlash = 0;
    this.bootStart = performance.now();
  }

  private applyAudioSettings() {
    const s = this.synth;
    const m = this.model;
    if (!s || !m) return;
    s.setMaster(m.master);
    for (const id of TRACK_IDS) s.setMix(id, m.mix[id]);
  }

  // ───── audio ─────

  async ensureAudio(gesture: boolean): Promise<void> {
    if (!this.props.interactive) return;
    if (!this.synth) {
      if (this.audioFailed) return;
      if (!gesture && !hasTransientActivation()) return;
      const s = BeatSynth.create();
      if (!s) {
        this.audioFailed = true;
        this.pushUi();
        return;
      }
      this.synth = s;
      s.ctx.onstatechange = () => this.pushUi();
      this.applyAudioSettings();
    }
    await this.synth.resume();
    this.pushUi();
  }

  /** Clock in seconds. The AudioContext clock when sound is on, otherwise a silent software clock. */
  private syncClock(): number {
    const s = this.synth;
    const audio = !!s && s.running;
    const kind = audio ? "audio" : "soft";
    const t = audio && s ? s.ctx.currentTime : performance.now() / 1000;
    if (kind !== this.kind) {
      this.kind = kind;
      this.queue = [];
      if (this.transport.primed) resyncTransport(this.transport, t);
    }
    return t;
  }

  // ───── transport ─────

  start() {
    const model = this.model;
    if (!model || !this.alive("power") || !this.props.program) return;
    this.playing = true;
    this.queue = [];
    this.barSection = "groove";
    this.step = -1;
    this.transport = createTransport();
    startTransport(this.transport, this.syncClock(), 0.1);
    this.synth?.silence();
    if (!this.props.autoplay) void this.ensureAudio(false);
    this.pushUi();
  }

  stop(byUser: boolean) {
    this.halt();
    this.userStopped = byUser;
    for (const id of TRACK_IDS) this.flash[id].fill(0);
    this.pushUi();
  }

  async toggle() {
    if (!this.props.program || !this.alive("power")) return;
    if (!this.playing) {
      this.userStopped = false;
      this.start();
      await this.ensureAudio(true);
      return;
    }
    if (this.synth?.running || !this.props.interactive) {
      this.stop(true);
      return;
    }
    await this.ensureAudio(true);
    if (!this.synth) this.stop(true);
  }

  /** The scheduler: runs on a ~25ms timer, schedules every step due in the next LOOKAHEAD seconds. */
  tick() {
    if (typeof document !== "undefined" && document.hidden) return;
    const model = this.ensureModel();
    if (!model || !this.playing) return;
    const now = this.syncClock();
    const events = collectSteps(this.transport, now, LOOKAHEAD, model.bpm, model.swing);
    for (const ev of events) this.schedule(ev, model);
  }

  private schedule(ev: { step: number; bar: number; time: number }, model: Model) {
    const { program } = this.props;
    if (ev.step === 0) {
      // the arranger is asked once per BAR, never per frame
      let section: Section = "groove";
      if (this.alive("arranger") && program && program.hasHook("arranger.section")) {
        section = normSection(program.call("arranger.section", ev.bar));
      }
      this.barSection = section;
    }
    const section = this.barSection;
    const audio = this.synth?.running ? this.synth : null;
    const sec = stepSeconds(model.bpm);
    const hits: Hit[] = [];
    const t = ev.time;

    for (const id of TRACK_IDS) {
      if (!trackAlive(id, this.alive)) continue;
      const mix = model.mix[id];
      const base = id === "bass" ? (model.notes[ev.step] > 0 ? 1 : 0) : model.patterns[id][ev.step];
      const level = sectionLevel(section, id, ev.step, base);
      if (level <= 0 || mix.mute) continue;
      hits.push({ track: id, level });
      if (!audio) continue;
      const amp = levelGain(level);
      if (id === "kick") audio.kick(t, amp);
      else if (id === "snare") audio.snare(t, amp);
      else if (id === "clap") audio.clap(t, amp);
      else if (id === "hats") audio.hat(t, amp, level >= 1.6);
      else audio.bass(t, amp, model.hz[ev.step] || midiToHzReference(model.notes[ev.step]), sec * 1.8);
    }

    // before the kick exists the machine only has its metronome
    if (audio && this.alive("power") && !this.alive("kick") && ev.step % 4 === 0) audio.click(t, ev.step === 0);

    const crash = this.alive("arranger") && sectionCrash(section, ev.step);
    if (crash && audio) audio.crash(t, 0.9);

    this.queue.push({ time: t, step: ev.step, bar: ev.bar, section, hits, crash });
    if (this.queue.length > 96) this.queue.splice(0, this.queue.length - 96);
  }

  // ───── pointer helpers ─────

  audition(track: TrackId) {
    const s = this.synth;
    const model = this.model;
    if (!s || !s.running || !model || !trackAlive(track, this.alive)) return;
    const t = s.ctx.currentTime + 0.01;
    if (track === "kick") s.kick(t, 0.85);
    else if (track === "snare") s.snare(t, 0.85);
    else if (track === "clap") s.clap(t, 0.85);
    else if (track === "hats") s.hat(t, 0.85, false);
    else {
      const note = model.notes.find((n) => n > 0) ?? 33;
      const hz = model.hz[model.notes.indexOf(note)] || midiToHzReference(note);
      s.bass(t, 0.85, hz, 0.35);
    }
    this.energy[track] = 1;
  }

  // ───── per-frame ─────

  update(dtRaw: number) {
    const dt = Math.min(dtRaw, 0.05);
    this.time += dt;
    this.ensureModel();

    const c = this.props.celebration;
    if (c && c.nonce !== this.celebrateNonce) {
      this.celebrateNonce = c.nonce;
      this.startCelebration();
    }

    // fire everything whose audio time has now arrived
    const s = this.synth;
    const t = this.syncClock() - (s && s.running ? s.latency : 0);
    while (this.queue.length && this.queue[0].time <= t) {
      const e = this.queue.shift();
      if (e) this.fire(e);
    }

    for (const id of TRACK_IDS) {
      const f = this.flash[id];
      for (let i = 0; i < STEPS; i++) if (f[i] > 0) f[i] = Math.max(0, f[i] - dt * 4);
      this.energy[id] = Math.max(0, this.energy[id] - dt * 3.2);
    }
    this.beat = Math.max(0, this.beat - dt * 3.5);
    this.crashFlash = Math.max(0, this.crashFlash - dt * 1.6);
    this.celebrate = Math.max(0, this.celebrate - dt * 0.8);
  }

  private fire(e: Fired) {
    this.step = e.step;
    this.stepAt = e.time;
    this.bar = e.bar;
    this.section = e.section;
    if (e.step % 4 === 0) this.beat = 1;
    if (e.crash) this.crashFlash = 1;
    for (const h of e.hits) {
      this.flash[h.track][e.step] = 1;
      this.energy[h.track] = Math.max(this.energy[h.track], 0.55 + 0.25 * Math.min(2, h.level));
      if (h.track === "bass") {
        this.lastBassNote = this.model?.notes[e.step] ?? 0;
        this.bassStep = e.step;
        this.bassSerial++;
      }
    }
  }

  private startCelebration() {
    this.celebrate = 1;
    const s = this.synth;
    if (s && s.running) {
      const t = s.ctx.currentTime + 0.02;
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => s.chime(t + i * 0.08, f, 0.8));
    }
  }

  /** Fills `spectrum` from the analyser. Returns false when there is no live audio (use trigger energies instead). */
  readSpectrum(): boolean {
    const s = this.synth;
    if (!s || !s.running || !this.props.unlocked.has("power")) return false;
    s.readSpectrum(this.spectrum);
    for (let i = 0; i < this.spectrum.length; i++) if (this.spectrum[i] > 0) return true;
    return false;
  }

  /** 0..1 progress from the current step to the next (for a smooth playhead). */
  stepPhase(): number {
    const m = this.model;
    if (!this.playing || this.step < 0 || !m) return 0;
    const s = this.synth;
    const now = s && s.running ? s.ctx.currentTime - s.latency : performance.now() / 1000;
    const p = (now - this.stepAt) / stepSeconds(m.bpm);
    return p < 0 ? 0 : p > 1 ? 1 : p;
  }

  isAlive(id: string): boolean {
    return this.props.unlocked.has(id);
  }
}
