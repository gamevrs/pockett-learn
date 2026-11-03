import type { Project } from "@/engine/types";
import { chapter1 } from "./go-pipeline/ch1.ts";
import { chapter2 } from "./go-pipeline/ch2.ts";
import { chapter3 } from "./go-pipeline/ch3.ts";
import { chapter4 } from "./go-pipeline/ch4.ts";

/**
 * Tidewatch: a telemetry pipeline for a fleet of weather buoys, written with one growing Go program.
 * The Advanced rung of the Go path (after Cairn Depot).
 *
 * How it works (Go runs on the pockett runner, see docs/ARCHITECTURE.md):
 *  - Lesson 1's starter carries the whole file: `package main`, one import block, the provided `scene`
 *    helper, a scaffold that keeps unused imports legal, the provided Reading/Summary types and
 *    `readingsFor` (a fixed formula, so every run sees the same sea), and `func main()`. From lesson 2 on a
 *    lesson may put package-level declarations above MAIN_DIVIDER; everything below the divider is
 *    appended to the end of main's body.
 *  - Determinism is a design rule: no lesson's checks depend on goroutine scheduling or the wall clock.
 *    Results are placed by index or sorted before they are shown, races are replayed as explicit
 *    interleavings, pool timing is simulated in logical ticks, and the few real timeouts guard calls that
 *    can never finish, so the outcome is the same on a slow machine.
 *  - `scene("key", value)` prints one `@scene {json}` line. The harbour board reads those keys and the
 *    lessons' checks read them too, as `scene.key`.
 *  - When a build fails, the runtime hands the scene a `build_error` ({ type, message, line }).
 */
export const goPipeline: Project = {
  slug: "go-pipeline",
  language: "go",
  prerequisites: ["go-inventory"],
  title: "Telemetry Pipeline",
  tagline: "Process a firehose of buoy readings with goroutines, channels, worker pools and context.",
  pitch:
    "Run the data desk for a line of six weather buoys. You start by summarising one batch at a time and finish with a pipeline that fans readings out to a worker pool, merges them back, survives a buoy that goes silent, cancels work it no longer needs and shuts down without losing a single reading. Along the way you replay a race condition in slow motion, guard shared tallies with a mutex, hand ownership to a single goroutine instead, and measure a worker pool in logical ticks instead of a stopwatch. The harbour board shows readings flowing through stages, workers busy and idle, queue depths, cancelled work and the race itself.",
  emoji: "🌊",
  difficulty: "Advanced",
  hours: 9,
  sceneId: "go-pipeline",
  accent: { from: "#22d3ee", to: "#0369a1" },
  controls: ["Run builds your program (2 to 4 s)", "Output / Scene data tabs", "Hover a lane, a stage or a worker for its numbers", "Every panel lights up when you pass its lesson"],
  skills: [
    "goroutines",
    "sync.WaitGroup",
    "channels",
    "buffered channels",
    "select",
    "race conditions",
    "sync.Mutex",
    "sync.Once & atomic",
    "pipelines",
    "worker pools",
    "fan-out / fan-in",
    "context cancel & timeout",
    "errgroup-style error collection",
    "graceful shutdown",
  ],
  features: [
    { id: "gp-console", title: "Control console", blurb: "Everything your program prints appears on the data desk console.", emoji: "🖥️" },
    { id: "gp-lanes", title: "Buoy lanes", blurb: "Six batches summarised one at a time and then all at once.", emoji: "🛟" },
    { id: "gp-stream", title: "Stream hatch", blurb: "Readings handed over one by one through a channel.", emoji: "📨" },
    { id: "gp-queue", title: "Waiting room", blurb: "A buffered inbox: how full it is, and the results shelf.", emoji: "📥" },
    { id: "gp-select", title: "Switchboard", blurb: "Readings turned away by a full shelf, and a listener that stops on cue.", emoji: "🎛️" },
    { id: "gp-race", title: "Race replay", blurb: "Two workers and one counter, replayed in every possible order.", emoji: "⚠️" },
    { id: "gp-tally", title: "Guarded tally", blurb: "A mutex-protected tally filled by six goroutines.", emoji: "🔒" },
    { id: "gp-once", title: "Calibration desk", blurb: "A table loaded exactly once, and an atomic reading counter.", emoji: "🧭" },
    { id: "gp-owner", title: "Peak keeper", blurb: "One goroutine that owns the data while others send it updates.", emoji: "🏔️" },
    { id: "gp-pipeline", title: "Stage line", blurb: "Readings flowing through source, calibration and storm filter.", emoji: "🏭" },
    { id: "gp-pool", title: "Worker pool", blurb: "Twelve jobs handled by four workers, results back in job order.", emoji: "👷" },
    { id: "gp-fan", title: "Fan-in", blurb: "Six streams merged into one, then spread over workers again.", emoji: "🔀" },
    { id: "gp-gantt", title: "Tick chart", blurb: "Workers busy and idle, and the queue depth, in logical ticks.", emoji: "📊" },
    { id: "gp-cancel", title: "Cancelled work", blurb: "A stream that stops when its context is cancelled.", emoji: "🛑" },
    { id: "gp-deadline", title: "Deadline board", blurb: "A silent buoy that times out while the others answer.", emoji: "⏱️" },
    { id: "gp-group", title: "Error group", blurb: "The first error cancels the rest; every error collected in order.", emoji: "🧯" },
    { id: "gp-shutdown", title: "Shutdown report", blurb: "A full pipeline that drains before it stops.", emoji: "⚓" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4],
};
