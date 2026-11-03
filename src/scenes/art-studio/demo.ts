import { createStaticProgram, type ProgramHandle } from "@/engine/program";
import * as S from "./studio.ts";

/** The finished Art Studio program, written in plain JS (a port of the reference Python solution). */
export function artStudioDemoProgram(): ProgramHandle {
  const ink = S.SHELF[0];
  const palette = S.PALETTE;
  const poster: S.Grid = [
    [S.SHELF[1], S.SHELF[1], S.SHELF[2], S.SHELF[1]],
    [S.SHELF[1], S.SHELF[1], S.SHELF[1], S.SHELF[1]],
    [[60, 160, 90], [60, 160, 90], [60, 160, 90], [60, 160, 90]],
  ];
  const finalPoster = S.radialGrid(11, 15, Object.values(palette));
  const raw = "  lantern_night_market \n";
  const col = (v: unknown) => S.toColour(v) as S.RGB;
  const cols = (v: unknown) => S.toColourList(v);
  const pal = (v: unknown) => Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, c]) => [k, col(c)])) as Record<string, S.RGB>;
  return createStaticProgram({
    stdout: `${S.banner(S.cleanTitle(raw), 32)}\n`,
    vars: {
      ink,
      shade: S.tint(ink, 0.5, [0, 0, 0]),
      swatches: S.SHELF,
      darkest: S.SHELF[3],
      lightest: S.SHELF[4],
      poster,
      shelf_names: S.SHELF_NAMES,
      inks_used: S.uniqueColours(poster),
      poster_title: "Lantern Night Market",
      raw_title: raw,
      palette,
      pastel: S.lighterPalette(palette),
      ranking: S.rankedNames(palette),
      final_poster: finalPoster,
      report: S.posterSummary(finalPoster),
    },
    hooks: {
      tint: (c: unknown, amount: number = 0.25) => S.tint(col(c), amount),
      brightness: (c: unknown) => S.brightness(col(c)),
      extremes: (cs: unknown) => S.extremes(cols(cs)),
      hex_code: (c: unknown) => S.hexCode(col(c)),
      label: (n: string, c: unknown) => S.label(n, col(c)),
      checker: (r: number, c: number, a: unknown, b: unknown) => S.checker(r, c, col(a), col(b)),
      legend: (names: string[], cs: unknown) => S.legend(names, cols(cs)),
      row_labels: (names: string[]) => S.rowLabels(names),
      stamp: (t: string, n: number) => S.stamp(t, n),
      tail: (t: string, n: number) => S.tail(t, n),
      mirror: (t: string) => S.mirror(t),
      clean_title: (t: string) => S.cleanTitle(t),
      hashtag: (t: string) => S.hashtag(t),
      banner: (t: string, w: number = 30) => S.banner(t, w),
      colour_for: (name: string) => S.colourFor(palette, name),
      palette_lines: (p: unknown) => S.paletteLines(pal(p)),
      dark_names: (p: unknown) => S.darkNames(pal(p)),
      average_brightness: (p: unknown) => S.averageBrightness(pal(p)),
      lighter_palette: (p: unknown) => S.lighterPalette(pal(p)),
      ranked_names: (p: unknown) => S.rankedNames(pal(p)),
      darkest_first: (cs: unknown) => S.darkestFirst(cols(cs)),
      random_poster: (r: number, c: number, cs: unknown, seed: number) => S.randomPoster(r, c, cols(cs), seed),
      parse_colour: (t: string) => S.parseColour(t),
      parse_size: (t: string) => S.parseSize(t),
      radial_grid: (r: number, c: number, cs: unknown) => S.radialGrid(r, c, cols(cs)),
      poster_summary: (g: unknown) => S.posterSummary(S.toGrid(g) ?? [[[0, 0, 0]]]),
    },
  });
}
