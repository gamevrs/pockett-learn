import { createStaticProgram, type ProgramHandle } from "@/engine/program";

/** What the finished Python program would expose, written in plain JS so the landing page needs no Python runtime. */
export function beatlabDemoProgram(): ProgramHandle {
  const root = 33;
  const hats = Array.from({ length: 16 }, (_, i) => (i % 4 === 0 ? 2 : i % 2 === 0 ? 1 : 0.3));
  const snare = new Array<number>(16).fill(0);
  snare[4] = 1;
  snare[7] = 0.4;
  snare[12] = 2;
  const clap = [...new Array<number>(8).fill(0), ...snare.slice(8)];

  return createStaticProgram({
    stdout: "BEAT LAB ONLINE\nKICK. SNARE. HATS.\nDROP THE BEAT",
    vars: {
      title: "Midnight Pocket",
      bpm: 112,
      swing: 0.18,
      master_volume: 0.85,
      kick_pattern: "X...x...x...x...",
      snare_pattern: snare,
      clap_pattern: clap,
      hats_pattern: hats,
      bass_notes: [root, 0, 0, root, 0, 0, root + 3, 0, root, 0, 0, root + 7, 0, root + 5, 0, root + 3],
      tracks: {
        kick: { volume: 0.95, pan: 0.0, mute: false },
        snare: { volume: 0.8, pan: 0.0, mute: false },
        clap: { volume: 0.6, pan: 0.3, mute: false },
        hats: { volume: 0.45, pan: -0.3, mute: false },
        bass: { volume: 0.85, pan: 0.0, mute: false },
      },
    },
    hooks: {
      midi_to_hz: (note: number) => 440 * 2 ** ((note - 69) / 12),
      "arranger.section": (bar: number) => {
        const spot = bar % 4;
        if (spot === 3) return "fill";
        if (spot === 0 && bar > 0) return "drop";
        return "groove";
      },
    },
  });
}
