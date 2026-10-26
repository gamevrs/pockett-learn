import { getAudioContext, getAudioOutput } from "./audio";

/**
 * Short UI sounds (success, level-up, click, error). They only play when the person has switched sound on, and
 * they go through the shared master gain (src/lib/sound/audio.ts), so the volume control applies to them.
 */
class SoundSynthesizer {
  /** Context + master output, or null when sound is off (the default) / not allowed yet. */
  private output(): { ctx: AudioContext; out: AudioNode } | null {
    const ctx = getAudioContext();
    const out = getAudioOutput();
    return ctx && out ? { ctx, out } : null;
  }

  public playSuccess() {
    const o = this.output();
    if (!o) return;
    const { ctx, out } = o;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.22);

      osc.connect(gain);
      gain.connect(out);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.25);
    });
  }

  public playLevelUp() {
    const o = this.output();
    if (!o) return;
    const { ctx, out } = o;

    const now = ctx.currentTime;
    const chord = [440, 554.37, 659.25, 880, 1108.73]; // A Major triumph

    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0.01, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.06 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(gain);
      gain.connect(out);

      osc.start(now + idx * 0.06);
      osc.stop(now + 0.85);
    });
  }

  public playClick() {
    const o = this.output();
    if (!o) return;
    const { ctx, out } = o;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(out);

    osc.start(now);
    osc.stop(now + 0.035);
  }

  public playError() {
    const o = this.output();
    if (!o) return;
    const { ctx, out } = o;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.2);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(out);

    osc.start(now);
    osc.stop(now + 0.26);
  }
}

export const sound = new SoundSynthesizer();
