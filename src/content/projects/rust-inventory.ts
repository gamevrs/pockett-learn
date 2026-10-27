import type { Project } from "@/engine/types";
import { chapter1 } from "./rust-inventory/ch1.ts";
import { chapter2 } from "./rust-inventory/ch2.ts";
import { chapter3 } from "./rust-inventory/ch3.ts";
import { chapter4 } from "./rust-inventory/ch4.ts";

/**
 * Corvid Peak: write the star-catalogue importer of Corvid Peak Observatory, one Rust program that
 * grows lesson by lesson. Each lesson switches on another panel of the observatory board.
 *
 * How it works (the compiled-language path, see docs/ARCHITECTURE.md):
 *  - The program is a normal `fn main()` file. Lesson 1's starter carries the whole skeleton: a
 *    provided helper above main (`scene(key, value)`, a tiny `Json` builder and `offset_in`) and
 *    `fn main()` at the bottom. From lesson 2 on, a lesson's text may hold MAIN_DIVIDER
 *    (engine/compose.ts): what is above it (structs, enums, functions, modules) goes before
 *    `fn main()`, what is below it joins main's body.
 *  - `scene("key", value)` prints one `@scene {json}` line. The board reads those keys, and the
 *    lessons' checks read them too, as `scene.key`. Plain output arrives as `stdout` / `lines`.
 *  - `setup` is the program's stdin: the 26-line night log lesson 15 reads in one go.
 *  - When a build fails, the board gets a `build_error` ({ type, message, line }) where `type` is
 *    the rustc error code (E0106...) or "Panic" for a crash while running.
 *
 * Scene keys by lesson (all optional, all read defensively):
 *   1 buffer slices copies label
 *   2 lifetimeDemo
 *   3 records
 *   4 modules moduleChecks
 *   5 errorSamples
 *   6 funnel quickChecks
 *   7 lineResults
 *   8 closures rack
 *   9 chain shortlist
 *  10 totalLy nearest faintest byConstellation brightNames dimNames allOrNothing
 *  11 sweepHours hourStars
 *  12 rows summaryCard debugLine
 *  13 ranking farthest totals
 *  14 tests testSummary
 *  15 fileLines intake problems
 *  16 fileText records problems report tests testSummary
 */
export const rustInventory: Project = {
  slug: "rust-inventory",
  language: "rust",
  // stdin for the whole course: lesson 15 reads this night log in one go
  setup: [
    "# Corvid Peak Observatory: night log, copied from the observers' notebooks",
    "# name | constellation | right ascension (h) | declination (deg) | magnitude | distance (ly)",
    "",
    "Sirius|Canis Major|6.75|-16.72|-1.46|9",
    "Canopus|Carina|6.40|-52.70|-0.74|310",
    "Arcturus|Bootes|14.26|19.18|-0.05|37",
    "Vega|Lyra|18.62|38.78|0.03|25",
    "Capella|Auriga|5.28|46.00|0.08|43",
    "  Rigel|Orion|5.24|-8.20|0.13|860",
    "Procyon|Canis Minor|7.65|5.22|0.34|11",
    "Betelgeuse|Orion|5.92|7.41|0.42|550",
    "Altair|Aquila|19.85|8.87|0.76|17",
    "Aldebaran|Taurus|4.60|16.51|0.86|65",
    "# the next line was smudged by rain",
    "Antares|Scorpius|16.49|-26.43|1.06",
    "Spica|Virgo|13.42|-11.16|0.97|250",
    "",
    "Pollux|Gemini|7.76|28.03|1.14|34",
    "Deneb|Cygnus|20.69|45.28|1.25|26OO",
    "Regulus|Leo|10.14|11.97|1.35|79",
    "|Orion|5.53|-0.30|2.23|1200",
    "Polaris|Ursa Minor|2.53|99.26|1.98|430",
    "Alnitak|Orion|5.68|-1.94|1.77|1260",
    "Mizar|Ursa Major|13.40|54.93|two|83",
    "Alnilam|Orion|5.60|-1.20|1.69|2000",
    "Vega|Lyra|18.62|38.78|0.03|25",
    "",
  ].join("\n"),
  title: "Corvid Peak",
  tagline: "Lifetimes, error types, modules, closures and iterators: import a star catalogue without copying a byte.",
  pitch:
    "Corvid Peak Observatory has a hundred and forty years of notebooks typed into one text file, and the file is messy. You write the importer in Rust: borrowed slices and lifetimes that follow the text around, an error type with Display and From so the question-mark operator does the plumbing, modules, closures, iterator pipelines you can read, report cards with aligned columns, and tests that run on every build. The observatory board draws the buffer, the borrowed fields, the error funnel and the finished sky as your code produces them.",
  emoji: "🔭",
  difficulty: "Intermediate",
  hours: 8,
  sceneId: "rust-inventory",
  prerequisites: ["rust-basics"],
  accent: { from: "#a5b4fc", to: "#4f46e5" },
  controls: ["Run builds your program (2 to 6 s)", "Click a panel to open it", "Output / Scene data tabs", "Compiler errors are explained, not just printed"],
  skills: [
    "slices & &str",
    "lifetimes",
    "structs that borrow",
    "modules & privacy",
    "custom errors",
    "impl Display",
    "From & ?",
    "FromStr",
    "closures",
    "iterator adaptors",
    "impl Iterator",
    "derive & sorting",
    "unit tests",
    "robust stdin",
  ],
  features: [
    { id: "ob-buffer", title: "Input buffer", blurb: "The raw text, with the slices your code cut out of it and the copies that live elsewhere.", emoji: "📜" },
    { id: "ob-lifetimes", title: "Lifetime scopes", blurb: "Two borrowed lines, the shorter scope that limits the result, and the name copied out in time.", emoji: "⏳" },
    { id: "ob-records", title: "Parse pipeline", blurb: "Raw lines, tokens and records, with borrowed fields pointing back into the buffer, plus the sky chart.", emoji: "🛰️" },
    { id: "ob-modules", title: "Module map", blurb: "Your module tree, with what self, super and crate mean from each module.", emoji: "🗺️" },
    { id: "ob-variants", title: "Error ledger", blurb: "One card per error variant: its Display text, its Debug text and whether it has a source.", emoji: "📕" },
    { id: "ob-funnel", title: "Error funnel", blurb: "Where ? converted an error with From and where it was built directly.", emoji: "🔻" },
    { id: "ob-lines", title: "Line desk", blurb: "Every input line with its number and the exact problem found there.", emoji: "🔢" },
    { id: "ob-closures", title: "Instrument rack", blurb: "Closures sorted into Fn, FnMut and FnOnce, and a rack of boxed filters.", emoji: "🧰" },
    { id: "ob-chain", title: "Adaptor chain", blurb: "An iterator pipeline with a count at every stage.", emoji: "⛓️" },
    { id: "ob-groups", title: "Aggregates", blurb: "Totals, extremes, constellation groups, a partition and an all-or-nothing collect.", emoji: "🧮" },
    { id: "ob-sweep", title: "Drift scan", blurb: "Your own iterator sweeping the 24 hours of right ascension.", emoji: "📡" },
    { id: "ob-cards", title: "Report cards", blurb: "Display-formatted rows and a summary card with aligned columns.", emoji: "🗒️" },
    { id: "ob-order", title: "Sort desk", blurb: "Stars ranked by derived ordering and sort_by chains.", emoji: "🥇" },
    { id: "ob-tests", title: "Test results", blurb: "A test runner that lists every check as ok or FAILED.", emoji: "✅" },
    { id: "ob-intake", title: "Intake bench", blurb: "The whole file as a strip of comments, blanks, records and rejected lines.", emoji: "📥" },
    { id: "ob-report", title: "Night report", blurb: "The finished importer: report card, constellation bars and every panel live.", emoji: "🌌" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4],
};
