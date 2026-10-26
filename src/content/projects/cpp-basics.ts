import type { Project } from "@/engine/types";
import { chapter1 } from "./cpp-basics/ch1.ts";
import { chapter2 } from "./cpp-basics/ch2.ts";
import { chapter3 } from "./cpp-basics/ch3.ts";
import { chapter4 } from "./cpp-basics/ch4.ts";

/**
 * Reactor Core (C++): write the control software for Helios-1, a small fusion research
 * reactor, as one growing C++ program. Each lesson switches on a panel of the live control-room board.
 *
 * How it works (C++ runs on the pockett runner, see docs/ARCHITECTURE.md):
 *  - Lesson 1's starter carries the whole file skeleton: the provided `scene(...)` helper and
 *    `int main() { }`. From lesson 2 on a lesson's text is appended to the end of main's body, and
 *    anything above MAIN_DIVIDER (includes, functions, structs, classes) is inserted before main
 *    (engine/compose.ts).
 *  - `scene("key", value)` prints one `@scene {json}` line. The board reads those keys and the
 *    lessons' checks read them too, as `scene.key`. Plain output arrives as `stdout`/`lines`.
 *  - `setup` is the program's stdin: four lines the input lesson reads with std::cin / std::getline.
 *  - When a build fails, the runtime hands the scene a `build_error` ({ type, message, line }).
 *
 * Every variable in main shares one scope, so each lesson's names are unique across the course.
 *
 * Scene keys by lesson (all optional, all read defensively):
 *   2 reactorName coreTemp maxTemp fuelRods plasmaOn mode pressure loops
 *   3 pellets trayCapacity trays emptySlots thermalKw electricKw efficiency netKw refills deviation fluxGain wrapped energyJ
 *   4 operatorName clearance setpoint shift nameLength initial welcome
 *   5 probeTemp alarmLevel flowLpm minFlow coolantOk canStart modeName scramNeeded
 *   6 rampStart rampTicks rampPeak primeCycles skipped lastTick heatTotal coreMap
 *   7 rodLevels rodCount avgLevel minLevel minIndex maxLevel
 *   8 loopNames loopTemps loopFlows pumpRpm totalFlow avgFlow
 *   9 packet packetTemp packetPressure packetState packetRods goodPackets badPackets logLine
 *  10 sensorNames sensorValues sensorLimits overCount closestName
 *  11 tally mostCommon mostCommonCount distinctEvents pressureLimit
 *  12 rankedNames firstWarning warnCount medianRod
 *  13 controlNames controlInsertions controlReactivity totalReactivity fullyInserted
 *  14 state stateCode history rejected
 *  15 alarmCodes alarmMessages alarmCount acceptedReadings
 *  16 shiftLog shiftPeak shiftAverage shiftWarnings shiftBadReadings shiftGrade shiftState shiftLevels
 */
export const cppBasics: Project = {
  slug: "cpp-basics",
  language: "cpp",
  // stdin for the whole course: the operator-login lesson reads these four lines
  setup: "Dana Whitlock\n3\n412.5\nnight shift\n",
  title: "Reactor Core",
  tagline: "Types, functions and classes: your first steps in C++.",
  pitch:
    "Write the control software for Helios-1, a small fusion research reactor, as one growing C++ program. You start with a silent console and finish with a core gauge, fuel rods, coolant loops, alarms and a shift report, all driven by code you wrote. The control board shows your output, your data and, when something is wrong, the compiler's error with its line number.",
  emoji: "⚛️",
  difficulty: "Beginner",
  hours: 8,
  sceneId: "cpp-basics",
  accent: { from: "#4f9cf9", to: "#1d4ed8" },
  controls: ["Run builds your program (2 to 4 s)", "Output / Scene data tabs", "Hover a fuel rod for its level", "Everything animates from your numbers"],
  skills: [
    "output & input",
    "variables & types",
    "arithmetic",
    "if & switch",
    "loops",
    "std::vector",
    "functions & references",
    "std::string",
    "structs",
    "std::map",
    "algorithms & lambdas",
    "classes",
    "enum class",
    "exceptions",
  ],
  features: [
    { id: "rc-console", title: "Control console", blurb: "Everything your program prints appears on the control console.", emoji: "🖥️" },
    { id: "rc-core", title: "Core gauge", blurb: "A dial for the core temperature, with pressure, rods, plasma and mode from your variables.", emoji: "🌡️" },
    { id: "rc-power", title: "Power balance", blurb: "Trays, efficiency, net power and overflow traps, worked out by your arithmetic.", emoji: "⚡" },
    { id: "rc-operator", title: "Operator desk", blurb: "The operator's badge, clearance and setpoint, read from the input.", emoji: "🪪" },
    { id: "rc-interlocks", title: "Interlocks", blurb: "Alarm level, coolant check and start permission decided by your conditions.", emoji: "🚦" },
    { id: "rc-ramp", title: "Warm-up ramp", blurb: "The warm-up curve and a core map drawn by nested loops.", emoji: "📈" },
    { id: "rc-rods", title: "Fuel rods", blurb: "24 fuel rods filled from a std::vector, the weakest one outlined.", emoji: "🔋" },
    { id: "rc-coolant", title: "Coolant loops", blurb: "Three loops with flows from your functions, and a pump you boost by reference.", emoji: "💧" },
    { id: "rc-telemetry", title: "Telemetry decoder", blurb: "Raw packets taken apart with find and substr, bad ones counted.", emoji: "📡" },
    { id: "rc-sensors", title: "Sensor bank", blurb: "A vector of structs: each sensor against its limit.", emoji: "🎚️" },
    { id: "rc-tally", title: "Event tally", blurb: "A std::map counts how often each event happened.", emoji: "🗂️" },
    { id: "rc-analysis", title: "Analysis", blurb: "Sorting, searching and counting with <algorithm> and lambdas.", emoji: "🔎" },
    { id: "rc-control", title: "Control rods", blurb: "ControlRod objects with private data and their own behaviour.", emoji: "🧪" },
    { id: "rc-state", title: "Reactor state", blurb: "An enum class state machine that rejects illegal moves.", emoji: "🔀" },
    { id: "rc-alarms", title: "Alarms", blurb: "Exceptions thrown, caught and logged as alarms.", emoji: "🚨" },
    { id: "rc-shift", title: "Shift report", blurb: "Your whole program, run as one shift with a final report.", emoji: "🏁" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4],
};
