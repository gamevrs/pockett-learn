import type { Project } from "@/engine/types";
import { chapter1 } from "./go-basics/ch1.ts";
import { chapter2 } from "./go-basics/ch2.ts";
import { chapter3 } from "./go-basics/ch3.ts";
import { chapter4 } from "./go-basics/ch4.ts";

/**
 * Gopher Post: write the software for an automated parcel sorting hub with one growing Go program.
 * Each lesson adds a system to the sorting floor.
 *
 * How it works (Go runs on the pockett runner, see docs/ARCHITECTURE.md):
 *  - Lesson 1's starter carries the whole file: `package main`, one import block with every package
 *    the course uses, the provided `scene` helper, a scaffold that keeps unused imports legal until
 *    the lesson that needs them, and `func main()`. From lesson 2 on a lesson may put package-level
 *    declarations above MAIN_DIVIDER (engine/compose.ts inserts them before `func main`); everything
 *    below the divider (or the whole text when there is none) is appended to the end of main's body.
 *  - `scene("key", value)` prints one `@scene {json}` line. The floor reads those keys, and the
 *    lessons' checks read them too, as `scene.key`. Plain output arrives as `stdout`/`lines`.
 *  - `setup` is the program's stdin: one parcel label (four lines, read in lesson 4) followed by the
 *    shift manifest (read by the loop in lesson 6).
 *  - When a build fails, the runtime hands the scene a `build_error` ({ type, message, line }).
 *
 * Scene keys by lesson (all optional, all read defensively):
 *   2 hubName shift beltSpeed open maxGrams regionCount regionCodes processed rejected note jammed kinds
 *   3 bayParcels vanSize vansNeeded lastLoad avgKg feeCents feeText tiny floatSum
 *   4 parcelID region grams badText badError
 *   5 handling class chute lane accepted
 *   6 processed unreadable totalGrams heaviest digits rampSteps
 *   7 rows queue weights capSteps chuteLabels backupFirst leaked untouched
 *   8 tally gramsBy unknown sortedNames missing known
 *   9 classCounts batchCount batchTotal batchHeaviest batchKg firstOK badOK
 *  10 rejects reasons rejected passed sameDirect sameIs
 *  11 parcels vans overflow trialLoaded trialLoadedPtr
 *  12 routes regionNames
 *  13 byWeight byRegion tags bigIDs
 *  14 closeSteps caught
 *  15 manifest jsonBytes roundTrip compact
 *  16 report balanced
 */
export const goBasics: Project = {
  slug: "go-basics",
  language: "go",
  // stdin for the whole course: one parcel label (lesson 4) and then the shift manifest (lesson 6)
  setup:
    "  PK-1001  \n  North \n2400\n24kg\nPK-2001 north 2400\nPK-2002 south 800\nPK-2003 east 4100\nPK-2004 west 19500\n\nPK-2005 north 650\nPK-2006 moon 300\nPK-2007 east 31000\nPK-2008 south abc\nPK-2009 west 1250\nPK-2010 north 7300\nPK-2011 south 560\nPK-2012 east 2200\nPK-2013 west\n",
  title: "Gopher Post",
  tagline: "Types, loops, errors and structs: your first steps in Go.",
  pitch:
    "Write the software for Gopher Post's automated parcel sorting hub with one growing Go program. You start with a silent console and finish with a belt that reads a shift manifest, chutes that sort by region, a reject bin that explains every refusal, vans that fill up, and an end-of-shift report, all driven by code you wrote. The sorting floor shows your output, your data and, when something is wrong, the compiler's own error with its line number.",
  emoji: "🐹",
  difficulty: "Beginner",
  hours: 7,
  sceneId: "go-basics",
  accent: { from: "#38d5ee", to: "#0e7490" },
  controls: ["Run builds your program (2 to 4 s)", "Output / Scene data tabs", "Hover a chute or van for its details", "Every card lights up when you pass its lesson"],
  skills: [
    "program structure",
    "fmt & verbs",
    "variables & types",
    "constants & iota",
    "conversions",
    "input & strconv",
    "if & switch",
    "loops",
    "slices",
    "maps",
    "functions",
    "errors",
    "structs & methods",
    "interfaces",
    "sort & closures",
    "defer & recover",
    "JSON",
  ],
  features: [
    { id: "go-console", title: "Control console", blurb: "Everything your program prints appears on the hub console.", emoji: "🖥️" },
    { id: "go-plate", title: "Hub plate", blurb: "The hub's name, shift, belt speed and four chutes come from your variables and constants.", emoji: "🪪" },
    { id: "go-bay", title: "Loading bay", blurb: "Vans, leftovers and fees worked out by your arithmetic and conversions.", emoji: "🚐" },
    { id: "go-scanner", title: "Label scanner", blurb: "A parcel label cleaned and converted from the scanner's text, bad weights included.", emoji: "🔍" },
    { id: "go-gate", title: "Sorting gate", blurb: "Weight class, handling and chute decided by your if and switch rules.", emoji: "🚦" },
    { id: "go-belt", title: "Intake belt", blurb: "The belt reads the whole shift manifest with your loops.", emoji: "🔁" },
    { id: "go-queue", title: "Parcel queue", blurb: "Slices and arrays hold the queue, and you see how slices share memory.", emoji: "🗄️" },
    { id: "go-chutes", title: "Chute tally", blurb: "A map counts parcels per region and flags regions that do not exist.", emoji: "📊" },
    { id: "go-weigh", title: "Weigh station", blurb: "Weight classes and batch totals from your own functions.", emoji: "⚖️" },
    { id: "go-rejects", title: "Reject bin", blurb: "Every refused parcel with the reason, built from wrapped errors.", emoji: "🚫" },
    { id: "go-vans", title: "Courier vans", blurb: "Van structs with methods fill up, and overflow waits on a tray.", emoji: "🚚" },
    { id: "go-routers", title: "Routing board", blurb: "Two routers behind one interface decide each parcel's chute and lane.", emoji: "🧭" },
    { id: "go-sorter", title: "Sorting racks", blurb: "Parcels ordered by weight and by region with sort.Slice and closures.", emoji: "🗃️" },
    { id: "go-safety", title: "Safety interlock", blurb: "defer shuts the hub down in order and recover catches the panics.", emoji: "🛡️" },
    { id: "go-manifest", title: "Manifest", blurb: "The day's manifest encoded as JSON with struct tags.", emoji: "📜" },
    { id: "go-shift", title: "Shift report", blurb: "Your whole program, closed out with an end-of-shift report.", emoji: "🏁" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4],
};
