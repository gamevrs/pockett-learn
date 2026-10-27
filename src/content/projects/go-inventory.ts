import type { Project } from "@/engine/types";
import { chapter1 } from "./go-inventory/ch1.ts";
import { chapter2 } from "./go-inventory/ch2.ts";
import { chapter3 } from "./go-inventory/ch3.ts";
import { chapter4 } from "./go-inventory/ch4.ts";

/**
 * Cairn Depot: keep the books of a mountain-rescue gear depot with one growing Go program.
 * The intermediate rung of the Go path (after Gopher Post).
 *
 * How it works (Go runs on the pockett runner, see docs/ARCHITECTURE.md):
 *  - Lesson 1's starter carries the whole file: `package main`, one import block with every package
 *    the course uses, the provided `scene` helper, a scaffold that keeps unused imports legal until the
 *    lesson that needs them, the provided `Item` type and `seedStock`, and `func main()`. From lesson 2 on
 *    a lesson may put package-level declarations above MAIN_DIVIDER (engine/compose.ts inserts them before
 *    `func main`); everything below the divider is appended to the end of main's body.
 *  - `scene("key", value)` prints one `@scene {json}` line. The ledger board reads those keys and the
 *    lessons' checks read them too, as `scene.key`. Plain output arrives as `stdout`/`lines`.
 *  - `setup` is the program's stdin: the depot's movement log (read line by line in lessons 14 and 16).
 *    The stock JSON the course decodes is supplied inside the lessons' own starter code.
 *  - When a build fails, the runtime hands the scene a `build_error` ({ type, message, line }).
 */
export const goInventory: Project = {
  slug: "go-inventory",
  language: "go",
  prerequisites: ["go-basics"],
  // stdin for the whole course: the movement log. Line numbers matter (lessons 14 and 16 report them).
  setup:
    "# Cairn Depot movement log, Saturday call-out\nRECEIVE ROP-0412 4 A1-03\nISSUE HAR-0210 3\nISSUE RAD-0031 2\n\nISSUE RAD-0031 6\nRETIRE HEL-0107 2\nRECEIVE BAT-0880 10 C1-04\nISSUE ZZZ-9999 1\nISSUE rop-0412 1\nLOAN HAR-0210 1\nISSUE SPL-0044 x\nRECEIVE BLK-0150 -5\nISSUE ROP-0518\nRETURN HAR-0210 2 B2-09\nISSUE BAT-0880 12\nRECEIVE BLK-0150 20 E1-01\nRETIRE ROP-0518 1\nISSUE SPL-0044 4\n",
  title: "Cairn Depot",
  tagline: "Interfaces, errors, generics, JSON and tests: keep a rescue depot's books in Go.",
  pitch:
    "Keep the books of a mountain-rescue gear depot with one growing Go program. You start with a shelf of ropes and finish with a ledger that imports a stock file, reads the day's movement log line by line, dispatches every movement through interfaces, refuses bad records with typed errors, reconciles the shelves and proves its own parsers with a table of tests. The ledger board shows every bin, the handler that dealt with each movement, the rejected-records inbox, the import's decoded and failed fields, the SKU checks and your test results.",
  emoji: "🧗",
  difficulty: "Intermediate",
  hours: 8,
  sceneId: "go-inventory",
  accent: { from: "#ff8a4c", to: "#9a3412" },
  controls: ["Run builds your program (2 to 4 s)", "Output / Scene data tabs", "Hover a bin or a handler for its details", "Every panel lights up when you pass its lesson"],
  skills: [
    "methods & receivers",
    "interfaces",
    "type switches",
    "embedding",
    "fmt & Stringer",
    "error wrapping",
    "errors.Is / errors.As",
    "maps & sorting",
    "generics",
    "encoding/json",
    "validation",
    "regexp",
    "bufio.Scanner",
    "table-driven tests",
  ],
  features: [
    { id: "gi-console", title: "Control console", blurb: "Everything your program prints appears on the depot console.", emoji: "🖥️" },
    { id: "gi-shelves", title: "Shelves", blurb: "Every bin and what is in it, changed by your Item methods.", emoji: "🗄️" },
    { id: "gi-lane", title: "Handler lane", blurb: "Each movement and the concrete type that handled it, behind one interface.", emoji: "🛤️" },
    { id: "gi-kinds", title: "Type probe", blurb: "Type switches, optional interfaces and the typed-nil trap, probed live.", emoji: "🔬" },
    { id: "gi-compose", title: "Composition", blurb: "Ropes and radios built from Items, and a handler wrapped in an auditor.", emoji: "🧩" },
    { id: "gi-printout", title: "Printout", blurb: "Stringer, fmt verbs and an aligned stock table.", emoji: "🖨️" },
    { id: "gi-inbox", title: "Rejected inbox", blurb: "Every refused movement with its wrapped error chain and sentinel badge.", emoji: "📥" },
    { id: "gi-typed", title: "Error desk", blurb: "Typed errors pulled out with errors.As, and a handler panic caught at the boundary.", emoji: "🧯" },
    { id: "gi-index", title: "Stock index", blurb: "Maps of structs against maps of pointers, and sorted views.", emoji: "🗂️" },
    { id: "gi-helpers", title: "Generic helpers", blurb: "Map, Filter, Sum and MaxBy, and the types the compiler inferred.", emoji: "🧮" },
    { id: "gi-ledger", title: "Generic ledger", blurb: "A Ledger[K, V] and an undo Stack[T] of your own.", emoji: "📚" },
    { id: "gi-import", title: "JSON import", blurb: "A stock file decoded field by field: what decoded, what failed and why.", emoji: "📦" },
    { id: "gi-validate", title: "Validation", blurb: "Every problem in a record collected and joined, not just the first.", emoji: "✅" },
    { id: "gi-sku", title: "SKU strip", blurb: "SKUs and bin codes checked and split into named groups by regexp.", emoji: "🏷️" },
    { id: "gi-log", title: "Movement log", blurb: "The day's log read line by line, with line-numbered errors.", emoji: "📜" },
    { id: "gi-tests", title: "Test results", blurb: "Your table-driven tests as green and red rows.", emoji: "🧪" },
    { id: "gi-close", title: "Close-out", blurb: "Opening stock plus movements reconciled to the closing count.", emoji: "🏁" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4],
};
