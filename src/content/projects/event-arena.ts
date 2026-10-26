import type { Project } from "@/engine/types";
import { chapter1 } from "./event-arena/ch1.ts";
import { chapter2 } from "./event-arena/ch2.ts";
import { chapter3 } from "./event-arena/ch3.ts";
import { chapter4a } from "./event-arena/ch4.ts";
import { chapter4b } from "./event-arena/ch5.ts";

/**
 * Event Arena: build the live engine of a tournament dashboard in modern JavaScript, from
 * callbacks and closures to event emitters, promises, async iterators and a real-time pipeline.
 *
 * The scene (src/scenes/event-arena) plays the stadium: it simulates matches and calls the learner's
 * functions. Names it reads (all optional, all via hooks; see the scene's README comment in
 * EventArenaScene.tsx for the full contract):
 *   describeEvent(event)            scoreboard.add/snapshot/reset      tickClock(seconds), matchClock.display()
 *   isHighlight(event)              standings(results)                 reportAll(event), summaries(), resetReporters()
 *   arena.emit/listenerCount        deadLetters(), busWarnings()       runLoop(script)
 *   loadDashboard(), loadAvailable(urls), fastest(urls), inFlight()    loadMatchCentre(id), startLoad(id), cancelLoad(id), safeLoad(id)
 *   fetchWithRetry(url), onSearchInput(q), getSearchState(), refreshStandings(), getRefreshStats()
 *   startReplay(matchId), getReplay()  processEvent(event), pipelineStats(), startFeed(matchId), stopFeed()
 * Authoring notes live in event-arena/shared.ts. The JavaScript runtime is async (top-level await,
 * fake timers, a simulated fetch): see src/engine/runtimes/javascript/sandbox.ts.
 */
export const eventArena: Project = {
  slug: "event-arena",
  language: "javascript",
  prerequisites: ["form-forge"],
  title: "Event Arena",
  tagline: "Run an async arena with promises, event emitters and classes.",
  pitch:
    "A tournament is a storm of events: goals, fouls, timeouts, cards. You build the engine that catches them. Start with functions as values, closures and this, grow classes and contracts, write your own EventEmitter, learn how the event loop really orders things, then tame the network with promises, async/await, cancellation, retries and async iterators. A live arena dashboard runs on your code, and every panel lights up as the matching lesson passes.",
  emoji: "⚔️",
  difficulty: "Advanced",
  hours: 8,
  sceneId: "event-arena",
  accent: { from: "#fb7185", to: "#be123c" },
  controls: ["Play, pause and speed up the match", "Click an event type to watch your listeners react", "Type in the search box to see debounce work", "Break the API and watch retries", "Step through the event loop"],
  skills: [
    "first-class functions",
    "callbacks",
    "closures",
    "this & bind",
    "higher-order functions",
    "classes & #private",
    "duck typing & JSDoc",
    "EventEmitter",
    "event loop",
    "promises",
    "async/await",
    "AbortController",
    "retry & debounce",
    "generators & async iterators",
  ],
  features: [
    { id: "arena-feed", title: "Live feed", blurb: "Commentary lines written by your describeEvent() scroll in as the match plays.", emoji: "📣" },
    { id: "arena-scoreboard", title: "Scoreboard", blurb: "Scores kept inside your closure; every goal goes through scoreboard.add().", emoji: "🔢" },
    { id: "arena-clock", title: "Match clock", blurb: "A MM:SS clock that counts through your bound tickClock().", emoji: "⏱️" },
    { id: "arena-highlights", title: "Highlight reel", blurb: "Events your isHighlight() predicate approves are collected in the reel.", emoji: "🌟" },
    { id: "arena-standings", title: "League table", blurb: "Team and Match classes turn finished results into a sorted table.", emoji: "🏆" },
    { id: "arena-stats", title: "Stats desk", blurb: "Duck-typed reporters count goals and discipline for every team.", emoji: "📊" },
    { id: "arena-bus", title: "Event bus", blurb: "Events travel through your EventEmitter to the listeners you registered.", emoji: "📡" },
    { id: "arena-resilience", title: "Dead letters & leak watch", blurb: "A crashing listener is caught and reported; forgotten listeners raise a warning.", emoji: "🛟" },
    { id: "arena-loop", title: "Event-loop lab", blurb: "Step through the call stack and queues and check your runLoop() against the real order.", emoji: "🔁" },
    { id: "arena-network", title: "Network panel", blurb: "Promise-based requests with latency, parallel loading and partial failure.", emoji: "🌐" },
    { id: "arena-cancel", title: "Cancel & timeouts", blurb: "async/await loads with AbortController cancellation and time limits.", emoji: "✋" },
    { id: "arena-retry", title: "Retries & search", blurb: "Exponential backoff, a debounced search box and a throttled refresh button.", emoji: "🔄" },
    { id: "arena-replay", title: "Match replay", blurb: "An async generator streams a match page by page into the replay.", emoji: "⏪" },
    { id: "arena-pipeline", title: "Live pipeline", blurb: "Validate, dedupe, enrich and emit: the whole arena on one real-time pipeline.", emoji: "🚀" },
  ],
  chapters: [
    {
      id: "functions",
      title: "Functions as values",
      blurb: "Callbacks, closures, this and composition: the toolkit every later lesson relies on.",
      lessons: chapter1,
    },
    {
      id: "contracts",
      title: "Objects with contracts",
      blurb: "Classes with private state, and interfaces the JavaScript way: duck typing, JSDoc and TypeScript.",
      lessons: chapter2,
    },
    {
      id: "events",
      title: "The event bus",
      blurb: "An EventEmitter from scratch, a bus that survives crashes and leaks, and the event loop that runs it.",
      lessons: chapter3,
    },
    {
      id: "async",
      title: "The async arena",
      blurb: "Promises, async/await and cancellation, retries and debounce, async iterators, and a real-time pipeline.",
      lessons: [...chapter4a, ...chapter4b],
    },
  ],
};
