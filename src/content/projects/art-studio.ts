import type { Project } from "@/engine/types";
import { chapter1 } from "./art-studio/ch1.ts";
import { chapter2 } from "./art-studio/ch2.ts";
import { chapter3 } from "./art-studio/ch3.ts";
import { chapter4 } from "./art-studio/ch4.ts";

/**
 * Lantern Lane Print Shop (slug art-studio): the bridge from Turbo Garage to the intermediate Python
 * projects. The learner writes generative poster art on a grid of coloured cells.
 *
 * The scene (src/scenes/art-studio) reads these names, each only once its lesson is passed:
 *   ink, swatches, palette, poster, raw_title, poster_title, shelf_names, inks_used, seed_poster,
 *   final_poster, report
 *   hooks: tint, extremes, brightness, hex_code, label, checker, legend, row_labels, stamp, tail, mirror,
 *   clean_title, hashtag, banner, colour_for, palette_lines, dark_names, average_brightness,
 *   lighter_palette, darkest_first, ranked_names, random_poster, parse_colour, parse_size, radial_grid,
 *   poster_summary
 * The Rng generator is provided inside lesson 15 (keep in sync with src/scenes/art-studio/studio.ts).
 */
export const artStudio: Project = {
  slug: "art-studio",
  title: "Art Studio",
  tagline: "Make posters from code: grids, palettes and seeded chance.",
  pitch:
    "Lantern Lane Print Shop makes posters one ink at a time, and tonight it needs yours. You will write Python that mixes inks as colour tuples, lays out a grid of coloured cells, cleans up the shop's order forms, keeps a named palette, ranks inks, and rolls seeded dice to print the same surprising poster again and again. A live press room redraws the poster from your code after every lesson.",
  emoji: "🎨",
  difficulty: "Beginner",
  hours: 8,
  sceneId: "art-studio",
  prerequisites: ["garage"],
  accent: { from: "#ff5c9a", to: "#c5ee8a" },
  controls: ["Pick a poster tab", "Step the seed", "Type a colour or a size to test your parser", "Click a cell to read its row and column"],
  skills: [
    "tuples & unpacking",
    "default & keyword arguments",
    "lists of lists",
    "nested loops",
    "sets",
    "enumerate & zip",
    "string slicing & methods",
    "dictionaries",
    "comprehensions",
    "sorting with key",
    "seeded randomness",
    "try / except",
    "import & docstrings",
  ],
  features: [
    { id: "as-swatch", title: "Ink swatch", blurb: "Your first ink appears on the bench with its three lights.", emoji: "🎨" },
    { id: "as-tints", title: "Tints and shades", blurb: "Your tint() function makes lighter and darker versions.", emoji: "🌗" },
    { id: "as-extremes", title: "Shelf extremes", blurb: "The darkest and lightest inks on the shelf are marked.", emoji: "↕️" },
    { id: "as-hex", title: "Hex labels", blurb: "Every tin gets a tidy label from your formatting.", emoji: "🏷️" },
    { id: "as-poster", title: "The poster", blurb: "Your grid of coloured cells is printed.", emoji: "🖼️" },
    { id: "as-patterns", title: "Pattern lab", blurb: "Checkerboards made by nested loops.", emoji: "♟️" },
    { id: "as-inks", title: "Ink tally", blurb: "The set of different inks the poster uses.", emoji: "🧮" },
    { id: "as-legend", title: "Legend", blurb: "Numbered tins and names matched to colours.", emoji: "📋" },
    { id: "as-slices", title: "Title cutter", blurb: "Stamp, tail and mirror the poster's title.", emoji: "✂️" },
    { id: "as-banner", title: "Banner press", blurb: "The order form is cleaned and centred into a banner.", emoji: "🔖" },
    { id: "as-palette", title: "Palette", blurb: "Named inks in a dictionary, looked up safely.", emoji: "🗂️" },
    { id: "as-report", title: "Day-end report", blurb: "Every ink reported with keys, values and items.", emoji: "📜" },
    { id: "as-pastel", title: "Pastel palette", blurb: "A whole palette lightened by a comprehension.", emoji: "🍬" },
    { id: "as-ranking", title: "Ink ranking", blurb: "Inks sorted from darkest to lightest.", emoji: "🥇" },
    { id: "as-seed", title: "Seed press", blurb: "Step the seed for a new random poster, same seed same print.", emoji: "🎲" },
    { id: "as-proof", title: "Order desk", blurb: "Type a colour or size and watch your parser cope.", emoji: "🧾" },
    { id: "as-radial", title: "The finale", blurb: "Rings of colour, with a summary from your code.", emoji: "🎯" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4],
};
