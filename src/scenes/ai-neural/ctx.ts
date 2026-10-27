import type { Pass, Vars } from "./data.ts";

/** The picture the stage is currently looking at: a test glyph from the gallery, or the learner's own drawing. */
export interface Probe {
  source: "gallery" | "pad";
  /** Index into the gallery (when source is "gallery"). */
  index: number;
  pixels: number[];
  /** The true digit when known (gallery glyphs). */
  truth: number | null;
  pass: Pass | null;
}

export interface PanelCtx {
  vars: Vars;
  probe: Probe | null;
  /** The network's guess for every gallery glyph (null when there is no network yet). */
  guesses: (number | null)[];
  selectGallery: (index: number) => void;
  setPadProbe: (pixels: number[] | null) => void;
  interactive: boolean;
  autoplay: boolean;
  program: import("@/engine/program").ProgramHandle | null;
}
