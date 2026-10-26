/**
 * Beat Lab voices: every sound is synthesised from oscillators and a noise buffer.
 * No samples, no network. Kept free of React so the scene can own its lifecycle.
 *
 * Signal path:  voice -> track bus (gain + pan) -> run bus -> master -> compressor -> limiter -> app master -> speakers
 *                                                                                      \-> analyser
 * "app master" is the shared gain from src/lib/sound/audio.ts (the navbar / stage volume control); the synth never
 * owns an AudioContext and never touches ctx.destination, so muting and volume apply to it instantly.
 * Nothing here ever throws into the caller: a missing AudioContext just means silence.
 */

import { getAudioContext, getAudioOutput, isAudible } from "@/lib/sound/audio";

export type BusId = "kick" | "snare" | "clap" | "hats" | "bass" | "fx";
const BUS_IDS: BusId[] = ["kick", "snare", "clap", "hats", "bass", "fx"];

export interface BusMix {
  volume: number;
  pan: number;
  mute: boolean;
}

interface Bus {
  input: GainNode;
  pan: StereoPannerNode | null;
}

export class BeatSynth {
  readonly ctx: AudioContext;
  readonly analyser: AnalyserNode;
  private master: GainNode;
  private limiter: DynamicsCompressorNode;
  private run!: GainNode;
  private buses = {} as Record<BusId, Bus>;
  private mix: Record<BusId, BusMix>;
  private noise: AudioBuffer;
  private disposed = false;
  private masterLevel = 0.8;

  private constructor(ctx: AudioContext, out: AudioNode) {
    this.ctx = ctx;
    this.mix = {} as Record<BusId, BusMix>;
    for (const id of BUS_IDS) this.mix[id] = { volume: 1, pan: 0, mute: false };

    this.master = ctx.createGain();
    this.master.gain.value = this.masterLevel * 0.55;

    // gentle glue compressor, then a brick-wall-ish limiter so nothing can ever clip
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 10;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.18;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.001;
    limiter.release.value = 0.08;
    this.limiter = limiter;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.72;

    this.master.connect(comp);
    comp.connect(limiter);
    limiter.connect(out);
    limiter.connect(this.analyser);

    // one second of white noise, reused by snare / clap / hats / crash
    const len = Math.floor(ctx.sampleRate);
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    this.buildRun();
  }

  /**
   * Builds the synth on the shared app context. Returns null when sound is off (the default), before the first user
   * interaction, or when the browser has no Web Audio; callers fall back to the silent clock.
   */
  static create(): BeatSynth | null {
    try {
      const ctx = getAudioContext();
      const out = getAudioOutput();
      return ctx && out ? new BeatSynth(ctx, out) : null;
    } catch {
      return null;
    }
  }

  /** Audio is live: the shared context is running and the person has sound switched on. */
  get running(): boolean {
    return !this.disposed && this.ctx.state === "running" && isAudible();
  }

  /** Seconds between "scheduled" and "heard"; the scene delays its visuals by this much. */
  get latency(): number {
    const c = this.ctx as AudioContext & { outputLatency?: number };
    return (c.outputLatency || 0) + (c.baseLatency || 0);
  }

  async resume(): Promise<void> {
    if (this.disposed) return;
    try {
      if (!isAudible()) return;
      if (this.ctx.state !== "running") await this.ctx.resume();
    } catch {
      /* autoplay policy: stay suspended, the scene shows a hint */
    }
  }

  async suspend(): Promise<void> {
    if (this.disposed) return;
    try {
      if (this.ctx.state === "running") await this.ctx.suspend();
    } catch {
      /* ignore */
    }
  }

  setMaster(volume: number) {
    this.masterLevel = Math.min(1, Math.max(0, volume));
    if (this.disposed) return;
    this.master.gain.setTargetAtTime(this.masterLevel * 0.55, this.ctx.currentTime, 0.03);
  }

  setMix(id: BusId, mix: BusMix) {
    this.mix[id] = mix;
    const bus = this.buses[id];
    if (this.disposed || !bus) return;
    const t = this.ctx.currentTime;
    bus.input.gain.setTargetAtTime(mix.mute ? 0 : mix.volume, t, 0.02);
    bus.pan?.pan.setTargetAtTime(mix.pan, t, 0.02);
  }

  /** Cut every sound that is still ringing or scheduled (Stop button, new run). */
  silence() {
    if (this.disposed) return;
    const old = this.run;
    const t = this.ctx.currentTime;
    old.gain.cancelScheduledValues(t);
    old.gain.setTargetAtTime(0, t, 0.012);
    window.setTimeout(() => {
      try {
        old.disconnect();
      } catch {
        /* already gone */
      }
    }, 250);
    this.buildRun();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    try {
      // the context is shared with the rest of the app: only unplug this synth from it
      this.master.gain.cancelScheduledValues(0);
      this.master.gain.value = 0;
      this.master.disconnect();
      this.limiter.disconnect();
      this.analyser.disconnect();
    } catch {
      /* ignore */
    }
  }

  /** Fills `out` (length >= analyser.frequencyBinCount) with 0..255 magnitudes. */
  readSpectrum(out: Uint8Array<ArrayBuffer>) {
    if (this.disposed) return;
    this.analyser.getByteFrequencyData(out);
  }

  private buildRun() {
    this.run = this.ctx.createGain();
    this.run.connect(this.master);
    for (const id of BUS_IDS) {
      const input = this.ctx.createGain();
      let pan: StereoPannerNode | null = null;
      if (typeof this.ctx.createStereoPanner === "function") {
        pan = this.ctx.createStereoPanner();
        input.connect(pan);
        pan.connect(this.run);
      } else {
        input.connect(this.run);
      }
      this.buses[id] = { input, pan };
      const m = this.mix[id];
      input.gain.value = m.mute ? 0 : m.volume;
      if (pan) pan.pan.value = m.pan;
    }
  }

  // ───────────────────────── voices ─────────────────────────
  // `t` is an AudioContext time, `a` a 0..1 loudness.

  private out(bus: BusId): AudioNode {
    return this.buses[bus].input;
  }

  private noiseSource(t: number, dur: number): AudioBufferSourceNode {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.start(t, Math.random() * 0.8);
    src.stop(t + dur);
    return src;
  }

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  click(t: number, accent: boolean) {
    if (!this.running) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.value = accent ? 1900 : 1300;
    this.env(g, t, accent ? 0.5 : 0.32, 0.001, 0.035);
    o.connect(g).connect(this.out("fx"));
    o.start(t);
    o.stop(t + 0.06);
  }

  kick(t: number, a: number) {
    if (!this.running) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
    this.env(g, t, a * 0.95, 0.003, 0.44);
    o.connect(g).connect(this.out("kick"));
    o.start(t);
    o.stop(t + 0.5);

    // beater click
    const c = this.ctx.createOscillator();
    const cg = this.ctx.createGain();
    c.type = "triangle";
    c.frequency.setValueAtTime(1600, t);
    c.frequency.exponentialRampToValueAtTime(120, t + 0.025);
    this.env(cg, t, a * 0.28, 0.001, 0.03);
    c.connect(cg).connect(this.out("kick"));
    c.start(t);
    c.stop(t + 0.06);
  }

  snare(t: number, a: number) {
    if (!this.running) return;
    const n = this.noiseSource(t, 0.3);
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1300;
    const ng = this.ctx.createGain();
    this.env(ng, t, a * 0.6, 0.002, 0.17);
    n.connect(hp).connect(ng).connect(this.out("snare"));

    const o = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    this.env(og, t, a * 0.5, 0.002, 0.1);
    o.connect(og).connect(this.out("snare"));
    o.start(t);
    o.stop(t + 0.2);
  }

  clap(t: number, a: number) {
    if (!this.running) return;
    const n = this.noiseSource(t, 0.4);
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1600;
    bp.Q.value = 0.9;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    // three quick slaps, then a tail
    for (const off of [0, 0.011, 0.023]) {
      g.gain.setValueAtTime(a * 0.75, t + off);
      g.gain.exponentialRampToValueAtTime(0.02, t + off + 0.009);
    }
    g.gain.setValueAtTime(a * 0.6, t + 0.035);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    n.connect(bp).connect(g).connect(this.out("clap"));
  }

  hat(t: number, a: number, open: boolean) {
    if (!this.running) return;
    const dur = open ? 0.16 : 0.05;
    const n = this.noiseSource(t, dur + 0.05);
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7200;
    const g = this.ctx.createGain();
    this.env(g, t, a * 0.34, 0.001, dur);
    n.connect(hp).connect(g).connect(this.out("hats"));
  }

  crash(t: number, a: number) {
    if (!this.running) return;
    const n = this.noiseSource(t, 1.6);
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 4800;
    const g = this.ctx.createGain();
    this.env(g, t, a * 0.3, 0.002, 1.4);
    n.connect(hp).connect(g).connect(this.out("fx"));
  }

  /** Saw + sub sine through a plucky low-pass. `freq` comes straight from the learner's midi_to_hz. */
  bass(t: number, a: number, freq: number, dur: number) {
    if (!this.running) return;
    const f = Math.min(2000, Math.max(20, freq));
    const length = Math.min(0.6, Math.max(0.1, dur));
    const saw = this.ctx.createOscillator();
    saw.type = "sawtooth";
    saw.frequency.value = f;
    const sub = this.ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = f;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 5;
    lp.frequency.setValueAtTime(Math.min(3200, f * 10), t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(120, f * 2.2), t + length * 0.8);
    const sawGain = this.ctx.createGain();
    sawGain.gain.value = 0.42;
    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.7;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(a * 0.62, t + 0.006);
    g.gain.setValueAtTime(a * 0.5, t + length * 0.55);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    saw.connect(sawGain).connect(lp);
    sub.connect(subGain).connect(lp);
    lp.connect(g).connect(this.out("bass"));
    saw.start(t);
    sub.start(t);
    saw.stop(t + length + 0.02);
    sub.stop(t + length + 0.02);
  }

  /** Little bell used for unlock celebrations. */
  chime(t: number, freq: number, a: number) {
    if (!this.running) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    this.env(g, t, a * 0.3, 0.004, 0.35);
    o.connect(g).connect(this.out("fx"));
    o.start(t);
    o.stop(t + 0.45);
  }
}
