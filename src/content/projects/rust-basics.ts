import type { Project } from "@/engine/types";
import { chapter1 } from "./rust-basics/ch1.ts";
import { chapter2 } from "./rust-basics/ch2.ts";
import { chapter3 } from "./rust-basics/ch3.ts";
import { chapter4 } from "./rust-basics/ch4.ts";

/**
 * Reef Station: run Halcyon Reef Station, an underwater research base (oxygen, pressure, dive
 * logs, a sample catalogue and a drone fleet), with one growing Rust program. Each lesson switches
 * on another module of the station.
 *
 * How it works (the compiled-language path, see docs/ARCHITECTURE.md):
 *  - The program is a normal `fn main()` file. Lesson 1's starter carries the whole skeleton: a
 *    provided helper above main (`scene(key, value)` and a tiny `Json` builder) and `fn main()` at
 *    the bottom. From lesson 2 on, a lesson's text may hold MAIN_DIVIDER (engine/compose.ts): what is
 *    above it (structs, enums, functions) goes before `fn main()`, what is below it joins main's body.
 *  - `scene("key", value)` prints one `@scene {json}` line. The station reads those keys, and the
 *    lessons' checks read them too, as `scene.key`. Plain output arrives as `stdout` / `lines`.
 *  - `setup` is the program's stdin: four lines the airlock lesson reads with `read_line`.
 *  - When a build fails, the station gets a `build_error` ({ type, message, line }) where `type` is
 *    the rustc error code (E0382...) or "Panic" for a crash while running.
 *
 * Scene keys by lesson (all optional, all read defensively):
 *   2 station crew depthM oxygenPct pumpsOnline hatch tanks wrappedLevel cappedLevel
 *   3 pressureBar hours minutes litresEach cutOff wrappedByte negativeWrap
 *   4 diver plannedDepth site badText bonusDepth
 *   5 zone o2Status watch cleared verdict
 *   6 markersPassed hoursToReserve reservePct fullAfter checked leakRow leakSeal
 *   7 readings highest lowest average beacon
 *   8 diveLog diveCount deepest shallowest
 *   9 sealedChars stamped originalLen extendedLen copiedDepth
 *  10 avgBefore avgAfter diveLog oxygenPct
 *  11 message sender wordCount shout allClear readingBytes readingChars summary
 *  12 fleet
 *  13 commands reports pipHealth mantaBattery
 *  14 catalogue weight101 weight102 totalWeightG unweighed
 *  15 intake problems acceptedCount
 *  16 zoneCounts needsCharge fleet report
 */
export const rustBasics: Project = {
  slug: "rust-basics",
  language: "rust",
  // stdin for the whole course: the airlock lesson reads these four lines
  setup: "  Mara Okoye  \n35\ndeep-ledge\n40m\n",
  title: "Reef Station",
  tagline: "Ownership, borrowing and types that catch your bugs: your first steps in Rust.",
  pitch:
    "Run Halcyon Reef Station, an underwater research base, with one growing Rust program. You start with a silent control room and finish with oxygen and pressure systems, a dive log, a sample catalogue and a fleet of drones, all driven by code you wrote. The station shows your output and your data, and when the compiler stops you it explains the error code, because in Rust the compiler is the teacher.",
  emoji: "🦀",
  difficulty: "Beginner",
  hours: 7,
  sceneId: "rust-basics",
  accent: { from: "#f0a070", to: "#b5481a" },
  controls: ["Run builds your program (2 to 6 s)", "Click a module to read its data", "Output / Scene data tabs", "Compiler errors are explained, not just printed"],
  skills: [
    "println! & formatting",
    "immutability & types",
    "casts",
    "stdin & parse",
    "if & match",
    "loops",
    "tuples & arrays",
    "Vec",
    "ownership",
    "borrowing",
    "String & &str",
    "structs & impl",
    "enums",
    "Option",
    "Result & ?",
    "HashMap & iterators",
  ],
  features: [
    { id: "rs-console", title: "Control room", blurb: "Everything your program prints appears on the control-room console.", emoji: "🖥️" },
    { id: "rs-oxygen", title: "Oxygen plant", blurb: "Tank level, crew and depth come from your variables.", emoji: "🫧" },
    { id: "rs-pressure", title: "Pressure gauge", blurb: "Pressure, dive time and air per diver, worked out by your arithmetic.", emoji: "⏱️" },
    { id: "rs-airlock", title: "Airlock desk", blurb: "A dive request read from the intercom and parsed safely.", emoji: "🚪" },
    { id: "rs-alarms", title: "Alarm board", blurb: "Depth zone, oxygen status and the go / no-go verdict, decided by if and match.", emoji: "🚨" },
    { id: "rs-pumps", title: "Ballast pumps", blurb: "Loops count markers, burn oxygen and hunt for a leak.", emoji: "🔁" },
    { id: "rs-sensors", title: "Sensor array", blurb: "A fixed array of readings and a tuple for the beacon.", emoji: "📡" },
    { id: "rs-divelog", title: "Dive log", blurb: "A growing Vec of dive depths, searched safely.", emoji: "📒" },
    { id: "rs-vault", title: "Sample vault", blurb: "Labels move into the vault, and the compiler tracks who owns them.", emoji: "🔐" },
    { id: "rs-tether", title: "Tether line", blurb: "Functions that borrow the log and the oxygen level without taking them.", emoji: "🪢" },
    { id: "rs-radio", title: "Radio mast", blurb: "Messages sliced, searched and rebuilt with String and &str.", emoji: "📻" },
    { id: "rs-drones", title: "Drone bay", blurb: "Drone structs with their own battery and methods.", emoji: "🤖" },
    { id: "rs-orders", title: "Mission orders", blurb: "An enum of commands, matched exhaustively.", emoji: "📋" },
    { id: "rs-catalogue", title: "Sample catalogue", blurb: "Lookups that may find nothing, handled with Option.", emoji: "🐚" },
    { id: "rs-intake", title: "Intake desk", blurb: "Text records parsed with Result, ? and a custom error type.", emoji: "📥" },
    { id: "rs-report", title: "Station report", blurb: "HashMap counts and iterator chains, summed into one shift report.", emoji: "🏁" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4],
};
