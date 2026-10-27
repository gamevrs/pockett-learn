import type { Project } from "@/engine/types";
import { chapter1 } from "./cpp-memory/ch1.ts";
import { LAB_INCLUDES, LAB_TOOLKIT } from "./cpp-memory/toolkit.ts";
import { chapter2 } from "./cpp-memory/ch2.ts";
import { chapter3 } from "./cpp-memory/ch3.ts";
import { chapter4 } from "./cpp-memory/ch4.ts";

/**
 * Provenance Lab (C++ Intermediate): the inventory program of the Larkspur Conservation Lab, a
 * restoration workshop. The learner grows one C++ program that must know where every object lives
 * and who is responsible for it. Each lesson switches on a panel of the live "memory room" board.
 *
 * How it works (C++ runs on the pockett runner, see docs/ARCHITECTURE.md):
 *  - The provided "bench camera" block (src/content/projects/cpp-memory/toolkit.ts) is the project's hidden
 *    `prelude`: compiled in front of the learner's file, never shown, and compiler line numbers are shifted
 *    back so they stay the learner's own. Lesson 1's starter carries the visible skeleton: a comment listing
 *    what the lab provides, the includes and `int main() { Lab lab; ... }`. From lesson
 *    2 on a lesson's text is appended to the end of main's body, and anything above MAIN_DIVIDER is
 *    inserted before main (engine/compose.ts).
 *  - The camera: `peek("name", variable)` notes a variable, `snap("caption")` prints a `shotN` scene
 *    key holding the peeked variables (with real, normalised addresses and where each pointer
 *    points), the live heap blocks, the logbook lines since the last photo and the running counters.
 *    `trace(kind, who)` writes logbook lines (ctor / dtor / copy / move ...). `Lab lab;` replaces
 *    new/delete while main runs and prints the `audit` key at the end (allocations, frees, leaks,
 *    double frees caught, copies and moves).
 *  - `setup` is the program's stdin: the lab's intake manifest (lesson 13 parses it).
 *  - When a build fails, the runtime hands the scene a `build_error` ({ type, message, line }).
 *
 * Every variable in main shares one scope, so each lesson's names are unique across the course.
 *
 * Scene keys by lesson (all optional, all read defensively; shotN / audit come from every lesson):
 *   2 thirdSlot slotTotal slotGap
 *   6 morningFirst backupFirst
 *   7 bluesFirst redsFirst bluesSize
 *   8 senderSize receiverSize spareFirst copyFirst
 *   11 lightLighter slotMatches carriedGrams
 *   12 constCopies beadCondition
 *   13 intakeIds intakeNames intakeYears intakeConditions rejectLines rejectReasons
 *   14 basicHeld strongHeld basicError strongError
 *   15 registrySize mirrorCondition lampGone
 *   16 runCopies runMoves finalCount
 */
export const cppMemory: Project = {
  slug: "cpp-memory",
  language: "cpp",
  // stdin for the whole course: the intake manifest that lesson 13 parses
  setup:
    "# Larkspur Lab intake manifest: id | name | year | condition (0-100)\n" +
    "AMP-01 | Red amphora | -450 | 72\n" +
    "MIR-03 | Bronze mirror | 120 | 55\n" +
    "\n" +
    "LMP-07 | Clay lamp | 1 | 90\n" +
    "this line has no separators\n" +
    "SCR-09 | Linen scroll | undated | 40\n" +
    "RNG-11 | Silver ring | 1210 | 140\n" +
    "CMB-12 | Ivory comb | 1640 | 66\n" +
    "BDS-14 | Glass beads | 300 | 48\n" +
    "TIN-15 | Tin lantern | 1790 | 81\n",
  // the bench camera: compiled in front of the learner's file, never shown in the editor (Project.prelude)
  prelude: `${LAB_INCLUDES}

${LAB_TOOLKIT}
`,
  title: "Provenance Lab",
  tagline: "See the stack and the heap, then own resources safely with RAII, smart pointers and move semantics.",
  pitch:
    "Write the inventory system for the Larkspur Conservation Lab, a restoration workshop, as one growing C++ program. Every lesson photographs your program's memory: variables on the workbench, blocks in the vault, arrows for pointers, badges for who owns what, a logbook of every construction and destruction, and a running count of copies against moves. By the end the audit reads zero leaks.",
  emoji: "🧠",
  difficulty: "Intermediate",
  hours: 8,
  sceneId: "cpp-memory",
  accent: { from: "#3b82f6", to: "#1e40af" },
  controls: ["Run builds your program (2 to 4 s)", "Step through the photos with the arrows on each panel", "Hover a block or cell for its details", "Everything is drawn from your own program's memory"],
  prerequisites: ["cpp-basics"],
  skills: [
    "pointers & references",
    "pointer arithmetic",
    "stack vs heap",
    "new / delete",
    "RAII",
    "rule of three / five / zero",
    "copy & move semantics",
    "std::unique_ptr",
    "operator overloading",
    "const correctness",
    "std::istringstream",
    "custom exceptions",
    "exception safety",
  ],
  features: [
    { id: "pv-bench", title: "Workbench", blurb: "Your variables as cells with real addresses, and arrows for every pointer and reference.", emoji: "🪵" },
    { id: "pv-shelf", title: "Shelf", blurb: "Arrays laid out side by side, pointer arithmetic worked out, const badges on pointers.", emoji: "📚" },
    { id: "pv-frames", title: "Call frames", blurb: "Function frames stacked on the bench, and slips left dangling when a scope ends.", emoji: "🥞" },
    { id: "pv-vault", title: "Vault", blurb: "The heap as numbered bays, with leaks and double frees flagged by the audit.", emoji: "🗄️" },
    { id: "pv-logbook", title: "Logbook", blurb: "Every constructor and destructor on a timeline, with the lifetime of each object.", emoji: "📒" },
    { id: "pv-custody", title: "Custody", blurb: "Who owns each block, and a warning when two owners share one.", emoji: "🏷️" },
    { id: "pv-casts", title: "Casting room", blurb: "Copies counted, with a deep copy shown next to the shallow one it replaced.", emoji: "🧪" },
    { id: "pv-handover", title: "Handover desk", blurb: "Moves counted and moved-from objects marked empty.", emoji: "📦" },
    { id: "pv-rules", title: "Rule board", blurb: "Which special members each class declares, and what a move quietly turned into.", emoji: "📋" },
    { id: "pv-storeroom", title: "Storeroom", blurb: "unique_ptr owners, hand-offs and borrowed views in a container.", emoji: "🧳" },
    { id: "pv-operators", title: "Operator bench", blurb: "Your overloaded operators in action: comparisons, sums and printing.", emoji: "➕" },
    { id: "pv-glass", title: "Glass case", blurb: "Const objects locked behind glass, and copies avoided with const&.", emoji: "🔒" },
    { id: "pv-manifest", title: "Manifest desk", blurb: "The intake manifest parsed line by line, with every refusal explained.", emoji: "📜" },
    { id: "pv-faults", title: "Fault drill", blurb: "Custom exceptions thrown mid-load, with the basic and strong guarantees side by side.", emoji: "🚨" },
    { id: "pv-registry", title: "Registry", blurb: "A registry that owns its pieces, with borrowed handles and stale ones flagged.", emoji: "🗃️" },
    { id: "pv-report", title: "Final report", blurb: "A full run: zero leaks, and copies set against moves.", emoji: "🏁" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4],
};
