import type { Project } from "@/engine/types";
import { chapter1 } from "./csharp-linq/ch1.ts";
import { chapter2 } from "./csharp-linq/ch2.ts";
import { chapter3 } from "./csharp-linq/ch3.ts";
import { chapter4 } from "./csharp-linq/ch4.ts";

/**
 * Halyard Port: run the cargo manifests of an orbital spaceport with one growing C# program.
 * Each lesson switches on one more system of the port board.
 *
 * How it works (C# runs on the pockett runner, see docs/ARCHITECTURE.md):
 *  - The program is a top-level-statements file. Lesson 1's starter carries the file head
 *    (#nullable enable and the usings), and under the types divider the port's standing data
 *    (Shipment, Vessel, PortData) and the provided `Port` helper (engine/compose.ts keeps
 *    statements above types).
 *  - `Port.Show("key", value)` prints one `@scene {json}` line. The board reads those keys, and
 *    the lessons' checks read them too, as `scene.key`. Plain output arrives as `stdout`/`lines`.
 *  - When a build fails, the runtime hands the scene a `build_error` ({ type, message, line }).
 *
 * Scene keys by lesson (all optional, all read defensively):
 *   1 origins docked dockQueue unloadOrder tonnageByCategory
 *   2 board urgentIds heavyIds medicalCount firstFuel hazmatFound anyMail
 *   3 categoryStats originTotals perVessel totals
 *   4 manifest vesselLoads crew crewCount
 *   5 executionTrace sourceChange passes
 *   6 berthCompare berthMove berthKeys amendment
 *   7 lanes laneCounts bandCounts handlingCounts routeSummaries
 *   8 loadables boardingKg heaviestCrates crateDedupe
 *   9 largest hold recent grouped
 *  10 tonnes perishableIds pageTwo summaryLine
 *  11 vesselLookups bangCrash
 *  12 telegrams telegramRejects regexParts mentionedIds
 *  13 loadLog loadAttempts
 *  14 exportJson notice jsonRejects jsonError
 *  15 importReport acceptedIds rejects rejectSummary
 *  16 portReport reportJson
 */
export const csharpLinq: Project = {
  slug: "csharp-linq",
  language: "csharp",
  prerequisites: ["csharp-basics"],
  title: "Halyard Port",
  tagline: "LINQ, generics, JSON and validation: handle real data in C#.",
  pitch:
    "Run the cargo manifests of Halyard Port, an orbital spaceport, with one growing C# program. You start by choosing the right collection and finish with a pipeline that imports a messy file, validates every row, queries the manifest with LINQ and publishes a JSON report. The port board shows sortable tables, grouping charts, a validation inbox full of rejected rows with reasons, and a JSON desk, all driven by the code you wrote.",
  emoji: "🛰️",
  difficulty: "Intermediate",
  hours: 7,
  sceneId: "csharp-linq",
  accent: { from: "#7dd3fc", to: "#4f46e5" },
  controls: ["Run builds your program (2 to 4 s)", "Sort the manifest board by any column", "Filter by category", "Output / Scene data tabs"],
  skills: [
    "collections",
    "LINQ",
    "grouping & joins",
    "deferred execution",
    "records",
    "pattern matching",
    "interfaces",
    "generics",
    "extension methods",
    "nullable references",
    "parsing & regex",
    "custom exceptions",
    "System.Text.Json",
    "validation",
  ],
  features: [
    { id: "hp-console", title: "Port console", blurb: "Everything your program prints appears on the port console.", emoji: "🖥️" },
    { id: "hp-structures", title: "Dock structures", blurb: "A set of origins, a docking queue, an unloading stack and a sorted tonnage table.", emoji: "🧱" },
    { id: "hp-board", title: "Manifest board", blurb: "A sortable, filterable table built from your LINQ query.", emoji: "📋" },
    { id: "hp-groups", title: "Category chart", blurb: "Bars for every category, origin and vessel, from your grouping and aggregates.", emoji: "📊" },
    { id: "hp-joins", title: "Vessel loads", blurb: "How full each vessel is, from joins, with the crew roster flattened.", emoji: "🚢" },
    { id: "hp-lazy", title: "Execution tracer", blurb: "See when your queries really run and what a snapshot saves.", emoji: "⏱️" },
    { id: "hp-records", title: "Amendment desk", blurb: "Berths and amended shipments as records, before and after.", emoji: "📝" },
    { id: "hp-lanes", title: "Triage lanes", blurb: "Every shipment sorted into a lane by your pattern-matching rules.", emoji: "🚦" },
    { id: "hp-contracts", title: "Load contracts", blurb: "Crates and passenger parties loaded through one interface.", emoji: "🤝" },
    { id: "hp-generics", title: "Generic toolkit", blurb: "A constrained hold, a recent-arrivals board and a hand-made GroupBy.", emoji: "🧰" },
    { id: "hp-ext", title: "Extension rack", blurb: "Your own extension methods: tonnes, perishable, pages and summaries.", emoji: "🔧" },
    { id: "hp-lookup", title: "Vessel lookup", blurb: "Lookups that may find nothing, answered without a crash.", emoji: "🔎" },
    { id: "hp-parser", title: "Telegram parser", blurb: "Messy telegram lines parsed, rejected with reasons, and read again with a regex.", emoji: "📡" },
    { id: "hp-faults", title: "Loading incidents", blurb: "A loading log driven by your own exception types.", emoji: "⚠️" },
    { id: "hp-json", title: "JSON desk", blurb: "Export a vessel, import a notice and report the exact spot of a broken document.", emoji: "🧾" },
    { id: "hp-inbox", title: "Validation inbox", blurb: "A nightly CSV imported, with every rejected row shown with its reasons.", emoji: "📥" },
    { id: "hp-report", title: "Port report", blurb: "Your whole pipeline: import, validate, query, report.", emoji: "🏁" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4],
};
