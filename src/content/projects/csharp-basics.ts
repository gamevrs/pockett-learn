import type { Project } from "@/engine/types";
import { chapter1 } from "./csharp-basics/ch1.ts";
import { chapter2 } from "./csharp-basics/ch2.ts";
import { chapter3 } from "./csharp-basics/ch3.ts";
import { chapter4 } from "./csharp-basics/ch4.ts";

/**
 * Cinder Depot: run Cinder Street Depot, a warehouse of delivery robots, with one growing C#
 * program. Each lesson adds a system to the depot board.
 *
 * How it works (C# runs on the pockett runner, see docs/ARCHITECTURE.md):
 *  - The program is a top-level-statements file. Lesson 1's starter also carries the provided
 *    `Depot` helper class under a divider line (engine/compose.ts keeps statements above types).
 *  - `Depot.Show("key", value)` prints one `@scene {json}` line. The scene reads those keys, and
 *    the lessons' checks read them too, as `scene.key`. Plain output arrives as `stdout`/`lines`.
 *  - `setup` is the program's stdin: four lines the input lesson reads with Console.ReadLine().
 *  - When a build fails, the runtime hands the scene a `build_error` ({ type, message, line }).
 *
 * Scene keys by lesson (all optional, all read defensively):
 *   2 robotName battery maxBattery speed online grade chargeCycles
 *   3 parcels crateSize trips leftover avgKg fee wrapped safe
 *   4 customer destination weightKg code extraText extraOk
 *   5 tier chargeState canDeliver shiftName hours
 *   6 meters lapsOnCharge floorMap docksVisited
 *   7 slots filled queue weights heaviest totalWeight
 *   8 stock lowStock
 *   9 legs totalMeters totalMinutes fastMinutes
 *  10 scans unclaimed noteLength
 *  11 fleet
 *  12 parcelList statusCounts sameValues
 *  13 incidents loaded
 *  14 report
 */
export const csharpBasics: Project = {
  slug: "csharp-basics",
  language: "csharp",
  // stdin for the whole course: the label lesson reads these four lines
  setup: "  Mika Okafor  \n12\nharbour library\n7x\n",
  title: "Cinder Depot",
  tagline: "Types, methods and classes: your first steps in C#.",
  pitch:
    "Run Cinder Street Depot, a warehouse of delivery robots, with one growing C# program. You start with a silent console and finish with a fleet of objects, parcels on a status board and a shift report, all driven by code you wrote. The build board shows your output, your data and, when something is wrong, the compiler's error with its line number.",
  emoji: "#️⃣",
  difficulty: "Beginner",
  hours: 6,
  sceneId: "csharp-basics",
  accent: { from: "#a78bfa", to: "#6d28d9" },
  controls: ["Run builds your program (2 to 4 s)", "Output / Scene data tabs", "Replay the patrol", "Filter parcels by status"],
  skills: [
    "output & interpolation",
    "variables & types",
    "arithmetic",
    "input & strings",
    "if & switch",
    "loops",
    "arrays & List<T>",
    "Dictionary",
    "methods",
    "null safety",
    "classes",
    "records & enums",
    "exceptions",
  ],
  features: [
    { id: "cs-console", title: "Console", blurb: "Everything your program prints appears on the depot console.", emoji: "🖥️" },
    { id: "cs-robot", title: "Robot card", blurb: "Rex's name, battery, speed and status come from your variables.", emoji: "🤖" },
    { id: "cs-dispatch", title: "Dispatch calculator", blurb: "Trips, leftovers, averages and fees, worked out by your arithmetic.", emoji: "🧮" },
    { id: "cs-label", title: "Shipping label", blurb: "A label built from the customer's input and your string methods.", emoji: "🏷️" },
    { id: "cs-rules", title: "Service rules", blurb: "Weight tier, charge state and opening hours decided by your conditions.", emoji: "🚦" },
    { id: "cs-patrol", title: "Patrol route", blurb: "A floor map drawn by nested loops, with a robot walking the lane.", emoji: "🔁" },
    { id: "cs-shelves", title: "Shelves", blurb: "Fixed array slots and a growing List, side by side.", emoji: "🗄️" },
    { id: "cs-stock", title: "Stock bins", blurb: "A Dictionary of SKUs and counts, with low stock flagged.", emoji: "📦" },
    { id: "cs-routes", title: "Route planner", blurb: "Legs, distances and minutes from your own methods.", emoji: "🧭" },
    { id: "cs-scanner", title: "Parcel scanner", blurb: "Lookups that might find nothing, handled without crashing.", emoji: "🔍" },
    { id: "cs-fleet", title: "Fleet", blurb: "Robot objects with their own battery and behaviour.", emoji: "🚚" },
    { id: "cs-parcels", title: "Parcel board", blurb: "Records and an enum sort parcels into status columns.", emoji: "📋" },
    { id: "cs-safety", title: "Safety log", blurb: "Exceptions caught, explained and recorded.", emoji: "🛡️" },
    { id: "cs-shift", title: "Shift report", blurb: "Your whole program, run as one shift with a final report.", emoji: "🏁" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4],
};
