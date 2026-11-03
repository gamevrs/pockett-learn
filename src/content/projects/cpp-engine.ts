import type { Project } from "@/engine/types";
import { chapter1 } from "./cpp-engine/ch1.ts";
import { chapter2 } from "./cpp-engine/ch2.ts";
import { chapter3 } from "./cpp-engine/ch3.ts";
import { chapter4 } from "./cpp-engine/ch4.ts";
import { ENGINE_PRELUDE } from "./cpp-engine/toolkit.ts";

/**
 * Lantern Bay (C++ Advanced): the guts of a small harbour simulator, grown lesson by lesson as one C++ program. Each
 * lesson switches on a panel of the live "harbour office" board.
 *
 * How it works (C++ runs on the pockett runner, see docs/ARCHITECTURE.md):
 *  - The provided helpers (src/content/projects/cpp-engine/toolkit.ts) are the project's hidden `prelude`: the standard
 *    headers, `scene("key", value)` (one `@scene {json}` line) and `typeName<T>()`. Compiler line numbers are shifted
 *    back so they stay the learner's own. Lesson 1's starter carries the visible skeleton (includes and `int main()`).
 *    From lesson 2 on a lesson's text is appended to the end of main's body, and anything above MAIN_DIVIDER is
 *    inserted before main (engine/compose.ts).
 *  - Nothing is simulated by the scene: every panel draws values the learner's own program sent, so the board is
 *    exactly as honest as the code (the vtable table is drawn from the answers of virtual calls, the ownership graph
 *    from use_count(), the event bus from the subscribers' own log lines).
 *  - When a build fails, the runtime hands the scene a `build_error` ({ type, message, line }).
 *
 * Every variable in main shares one scope, so each lesson's names are unique across the course.
 *
 * Scene keys by lesson (all optional, all read defensively):
 *   1 brightInt brightDouble stamps
 *   2 lampEntries hornEntries bookTypes
 *   3 deducedTypes mixedDim gapSize rackSum
 *   4 totalGlow gateChecks
 *   5 queueNow served queueLeft peakValue peakIndex tideCount jumped
 *   6 tonsByPort portOrder sizeBefore sizeAfter hasFerry lampHours lampTotal uniqueVisitors visitorCount
 *   7 sortedLumens strongCount firstStrongValue firstStrongIndex lumenSum middleSum
 *   8 dimByValueNow dimByValue dimByReference fleetByLength brightTotal
 *   9 planShapes firstFlash secondFlash
 *  10 busLog subscribersBefore subscribersAfter
 *  11 directNames viaBaseNames viaBaseSignals plainSignal
 *  12 roles closingOrder abstractness pierIsFinal slicedColours keptColours
 *  13 staleSoundings sharedSoundings useCounts logBefore chartLog
 *  14 cycleCounts goneAfterCycle fixedCounts lockWorks watcherAliveInside watcherAliveAfter goneLog
 *  15 lookups westOrDefault reportLines stormCount worstWind
 *  16 nightLines nightAlerts nightRoles stationCount eastPattern
 */
export const cppEngine: Project = {
  slug: "cpp-engine",
  language: "cpp",
  // the harbour office's helpers: compiled in front of the learner's file, never shown in the editor (Project.prelude)
  prelude: `${ENGINE_PRELUDE}\n`,
  title: "Lantern Bay",
  tagline: "Write generic code and wire parts together with templates, concepts, callbacks and virtual functions.",
  pitch:
    "Build the guts of a small harbour simulator in C++: lighthouses, buoys and foghorns that share one engine. You start with a cookie-cutter template, then fill the harbour stores with containers and algorithms, plug in swappable behaviour and an event bus, let every object answer for itself with virtual functions, and settle who owns what with shared and weak pointers. The harbour office board draws every idea from your own program's output: the types your templates were stamped for, the subscribers that fire, the vtable calls, and the ownership graph with its live counts.",
  emoji: "🧩",
  difficulty: "Advanced",
  hours: 9,
  sceneId: "cpp-engine",
  accent: { from: "#2563eb", to: "#1e3a8a" },
  controls: ["Run builds your program (2 to 4 s)", "Step through the sequences with the arrows on a panel", "Hover a card for its details", "Everything is drawn from your own program's output"],
  prerequisites: ["cpp-memory"],
  skills: [
    "function & class templates",
    "template argument deduction",
    "concepts (requires)",
    "STL containers & iterators",
    "algorithms on iterator ranges",
    "lambdas & std::function",
    "strategy & observer patterns",
    "inheritance & virtual functions",
    "abstract classes & virtual destructors",
    "std::shared_ptr / weak_ptr",
    "std::optional & std::variant",
  ],
  features: [
    { id: "en-cutters", title: "Cookie cutters", blurb: "One cutter per type your function template was stamped for.", emoji: "🍪" },
    { id: "en-logbooks", title: "Logbooks", blurb: "Class-template instantiations side by side, each labelled with its type.", emoji: "📒" },
    { id: "en-deduction", title: "Deduction desk", blurb: "Every call, and the type and size arguments the compiler worked out.", emoji: "🧮" },
    { id: "en-gatehouse", title: "Gatehouse", blurb: "Types at the gate: a green pass or a red stop from your concept.", emoji: "🚪" },
    { id: "en-queue", title: "Berth queue", blurb: "A deque of ships and a tide row walked by iterators.", emoji: "⚓" },
    { id: "en-ledger", title: "Ledger", blurb: "Maps, a hash map and a set, with sorted order and the operator[] trap.", emoji: "📚" },
    { id: "en-algorithms", title: "Algorithm bench", blurb: "A lamp rack sorted, counted and searched with iterator ranges.", emoji: "🔧" },
    { id: "en-lambdas", title: "Lambda bench", blurb: "A captured copy next to a captured reference, and a sorted fleet.", emoji: "λ" },
    { id: "en-strategy", title: "Flash plans", blurb: "Each swappable plan drawn as on and off ticks.", emoji: "💡" },
    { id: "en-bus", title: "Event bus", blurb: "A storm sensor with a spoke to every subscriber, firing in order.", emoji: "📡" },
    { id: "en-vtable", title: "Vtable", blurb: "A class table per beacon and the call each pointer really lands on.", emoji: "🗂️" },
    { id: "en-hierarchy", title: "Hierarchy", blurb: "Abstract and final classes, closing order and the slicing trap.", emoji: "🏛️" },
    { id: "en-owners", title: "Owners", blurb: "One chart, many owners, and the live use_count after each change.", emoji: "🕸️" },
    { id: "en-cycles", title: "Cycles", blurb: "A reference cycle that never lets go next to a weak back-link that does.", emoji: "🔁" },
    { id: "en-variants", title: "Report desk", blurb: "Weather reports of different kinds, and lookups that may be empty.", emoji: "🌦️" },
    { id: "en-report", title: "Night report", blurb: "The whole shift on a timeline: weather, lamps and owners.", emoji: "🌙" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4],
};
