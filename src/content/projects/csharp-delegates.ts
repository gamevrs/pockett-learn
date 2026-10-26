import type { Project } from "@/engine/types";
import { chapter1 } from "./csharp-delegates/ch1.ts";
import { chapter2 } from "./csharp-delegates/ch2.ts";
import { chapter3 } from "./csharp-delegates/ch3.ts";
import { chapter4 } from "./csharp-delegates/ch4.ts";
import { chapter5 } from "./csharp-delegates/ch5.ts";

/**
 * Footlight: build the show-control desk of Lantern Hall, a small theatre, as one growing C#
 * program. Each lesson adds a system to the desk board: cues as delegates, faders and sound
 * chains from lambdas, an event bus, observers, typed prop shelves, iterators, a home-made query
 * kit, async scene changes with cancellation, a backstage channel, hand-built resilience
 * policies, disposable resources, a tiny service container and finally the whole show.
 *
 * How it works (see docs/ADDING_A_PROJECT.md, "Server languages"):
 *  - The program is a top-level-statements file. Lesson 1's starter carries the provided `Desk`
 *    helper under the types divider (engine/compose.ts keeps statements above types) and two
 *    extra `using` lines at the very top for the later chapters.
 *  - `Desk.Show("key", value)` prints one `@scene {json}` line. The board reads those keys, and
 *    the lessons' checks read them too, as `scene.key`. Plain output arrives as `stdout`/`lines`.
 *  - When a build fails, the runtime hands the board a `build_error` ({ type, message, line }).
 *
 * Scene keys by lesson (all optional, all read defensively; see scenes/csharp-delegates/data.ts):
 *   1  cueLabel labelerType cueSheet brightness
 *   2  faders { master, levels, brokenLevels }
 *   3  chain { stageNames, trail, samples[{input,output}], fade { linear, easeIn, stepped, steppedName } }
 *   4  go { handlers, naive, safe, failures, lastWins, everyReturn }
 *   5  bus { log[{publisher,eventName,subscriber,payload}], listeners }
 *   6  observers { meter, alarm, completed, stillSubscribed }
 *   7  props { shelf[{name,kind,weight}], heaviest, viewed, judged }
 *   8  iter { fade, trace, pulse }
 *   9  query { source, pulls { built, pass, first }, kept, pages }
 *   10 runSheet { segments[{name,start,end,length}], overlaps, totalMinutes, endsAt, lazyCheck, eagerCheck }
 *   11 spans[{name,start,end,state}] timeline { winner, rethrown, failedCount }
 *   12 hold { state, stepsDone, stepsTotal, timeoutMessage, guardedOutcome } (and spans again)
 *   13 channel { capacity, sent, handled, waits, deepest }
 *   14 retry { fog[{number,outcome,waitMs}], fogResult, slow[...], slowOutcome }
 *   15 breaker { outcomes, transitions, finalState, serviceCalls, bulkhead }
 *   16 lifetimes { log, free }
 *   17 wiring { nodes[{name,lifetime}], edges[{from,to}], liveLog, rehearsalLog, cycleMessage }
 *   18 show { report { fired, failed, skipped, peakLevel, retries, spotsFree }, cues[{number,name,device}] } (and bus again)
 */
export const csharpDelegates: Project = {
  slug: "csharp-delegates",
  language: "csharp",
  prerequisites: ["csharp-basics", "csharp-linq"],
  title: "Footlight",
  tagline: "Delegates, events, iterators, async and resilience: wire a theatre's show-control desk.",
  pitch:
    "Build the show-control desk for Lantern Hall, a small theatre, as one growing C# program. You start by treating a lighting cue as a value you can pass around, and finish by running a whole act: cues travelling an event bus, a sound chain made of composed functions, scene changes that await and cancel, a backstage channel with backpressure, and flaky equipment protected by retries and a circuit breaker you write yourself. The desk board shows your output, your data and, when something is wrong, the compiler's error with its line number.",
  emoji: "🎭",
  difficulty: "Advanced",
  hours: 8,
  sceneId: "csharp-delegates",
  accent: { from: "#c084fc", to: "#7e22ce" },
  controls: ["Run builds your program (3 to 5 s)", "Output / Scene data tabs", "Watch events flow on the bus", "Replay the timeline and breaker"],
  skills: [
    "delegates & Func/Action",
    "lambdas & closures",
    "multicast & events",
    "observer pattern",
    "generics & variance",
    "iterators & yield",
    "custom LINQ operators",
    "async / await",
    "cancellation",
    "channels",
    "retry & circuit breaker",
    "IDisposable",
    "dependency injection",
  ],
  features: [
    { id: "fl-console", title: "Console", blurb: "Everything your program prints appears on the desk console.", emoji: "🖥️" },
    { id: "fl-cues", title: "Cue sheet", blurb: "Named cues stored as delegates and fired in order.", emoji: "📋" },
    { id: "fl-faders", title: "Fader bank", blurb: "Lambdas and the variables they capture drive the faders.", emoji: "🎚️" },
    { id: "fl-chain", title: "Sound chain", blurb: "Small functions composed into one signal chain, with fade curves.", emoji: "🔗" },
    { id: "fl-go", title: "GO button", blurb: "One multicast delegate fanning out to every rig handler.", emoji: "🟢" },
    { id: "fl-bus", title: "Event bus", blurb: "Publishers raise events, subscribers react, and you watch each delivery.", emoji: "📡" },
    { id: "fl-observers", title: "Light meters", blurb: "Observers that subscribe, unsubscribe and hear the show end.", emoji: "👁️" },
    { id: "fl-props", title: "Prop shelves", blurb: "Typed shelves with constraints and variance.", emoji: "🗄️" },
    { id: "fl-iter", title: "Fade steps", blurb: "Lazy iterators that produce values only when asked.", emoji: "🪜" },
    { id: "fl-linq", title: "Query bench", blurb: "Your own Keep, Shape and Batch operators, with pull counts.", emoji: "🔍" },
    { id: "fl-runsheet", title: "Run sheet", blurb: "Show segments on a timeline, with overlaps found and flagged.", emoji: "🗓️" },
    { id: "fl-timeline", title: "Task timeline", blurb: "Async scene changes drawn as bars: done, failed or waiting.", emoji: "⏱️" },
    { id: "fl-hold", title: "Hold and timeout", blurb: "A flight stopped part-way by a cancellation token or a deadline.", emoji: "✋" },
    { id: "fl-channel", title: "Backstage channel", blurb: "A bounded queue between stage manager and crew, with backpressure.", emoji: "📨" },
    { id: "fl-retry", title: "Retry ladder", blurb: "Failed attempts, exponential backoff and jitter, rung by rung.", emoji: "🪜" },
    { id: "fl-breaker", title: "Breaker and bulkhead", blurb: "The breaker's states and the bulkhead's rejected callers.", emoji: "🔌" },
    { id: "fl-lifetimes", title: "Lifetimes", blurb: "Borrowed lamps and powered racks, released in the right order.", emoji: "🔦" },
    { id: "fl-wiring", title: "Wiring diagram", blurb: "The dependency graph your container resolved.", emoji: "🧩" },
    { id: "fl-show", title: "Show report", blurb: "Act One, run end to end by everything you built.", emoji: "🎭" },
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4, chapter5],
};
