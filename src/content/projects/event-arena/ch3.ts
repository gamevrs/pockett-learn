import type { Lesson } from "@/engine/types";
import { js, md, T } from "./shared.ts";

/** Chapter 3: The event bus. An EventEmitter from scratch, hardened, and the event loop that runs it all. */
export const chapter3: Lesson[] = [
  // ───────────────────────────────────────── 7. EventEmitter
  {
    id: "event-arena-7-emitter",
    title: "Build an EventEmitter",
    minutes: 35,
    xp: 160,
    concepts: ["observer pattern", "pub/sub", "on / off / once / emit", "unsubscribe functions", "copy before iterate"],
    learn: md`### Don't call me, I'll call you

So far, code that needs something calls a function directly. That couples them: the scoreboard code must know about the feed, the feed about the stats desk, and every new feature means editing the goal-scoring code.

The **observer pattern** (also called **publish/subscribe**) reverses this. One object, the **emitter**, announces *that something happened*. Anyone interested **subscribes** a function (a *listener*) for a named event. The emitter has no idea who is listening.

~~~js
const bus = new EventEmitter();

bus.on("goal", (event) => scoreboard.add(event.team));       // subscribe
bus.on("goal", (event) => console.log("GOAL by", event.player));

bus.emit("goal", { team: "fal", player: "Ada Okoro" });     // publish: both listeners run
~~~

The goal-scoring code now only knows "I emit ¦goal¦". Adding the highlight reel, a siren, or a betting feed is a new ¦bus.on¦ somewhere else. The same idea powers DOM events (¦addEventListener¦ / ¦dispatchEvent¦ on an ¦EventTarget¦), Node's built-in ¦EventEmitter¦, Redux-style stores and message queues. You will build the core yourself.

### The API

- ¦on(type, listener)¦ registers a listener. Ours **returns an unsubscribe function**, so a caller can clean up without keeping the listener around.
- ¦once(type, listener)¦ registers a listener that runs a single time.
- ¦off(type, listener)¦ removes a registration (one registration per call, like Node).
- ¦emit(type, ...args)¦ calls the listeners **synchronously, in the order they were registered**, passing ¦args¦. It returns how many ran.
- ¦listenerCount(type)¦, ¦eventNames()¦ and ¦removeAllListeners(type?)¦ for inspection and cleanup.

### Design decisions worth understanding

**Emit is synchronous.** ¦emit¦ returns only after every listener finished. Events do not wait for the next tick, which makes order easy to reason about and also means a slow listener slows the emitter.

**Iterate over a copy.** A listener may unsubscribe itself (that is what ¦once¦ does) or add another listener while ¦emit¦ is looping. Removing from an array while you walk it makes you skip entries. Copy the list first:

~~~js
for (const entry of [...list]) { /* safe even if list changes */ }
~~~

**once is just an on that removes itself.** Mark the registration, and remove it *before* calling the listener, so an event emitted from inside the listener cannot trigger it twice.

**Store registrations as records.** Storing ¦{ listener, once }¦ objects (not bare functions) lets the unsubscribe function remove exactly *its* registration, even if the same function was registered twice.

**Listeners are called with ¦this¦ set to the emitter** (as in Node), unless they are arrow functions. You will use the ¦apply¦ you met in lesson 3.

**One extension point.** Our ¦emit¦ will call ¦this._invoke(listener, args, type)¦ instead of calling the listener directly. By convention an underscore means "for subclasses". Lesson 8 overrides it to make the bus survive crashing listeners, without touching ¦emit¦: this is the *template method* pattern.

### Wiring the arena

A pure emitter knows nothing about football. The glue lives in one place, the **composition root**: a function that connects the bus to the scoreboard and the stats desk, and returns a function that disconnects it again.

~~~js
function wire(bus) {
  const stops = [bus.on("goal", onGoal), bus.on("foul", onFoul)];
  return () => stops.forEach((stop) => stop());
}
~~~

### Common mistakes

- Mutating the listener array while iterating it (skipped listeners).
- Forgetting to unsubscribe: listeners live as long as the emitter (lesson 8).
- Emitting from inside a listener of the same event without a guard (endless recursion).
- Expecting ¦emit¦ to wait for async listeners. It does not; it only calls them.
- Using one giant ¦"event"¦ type with a switch inside. Use separate event names.`,
    mission: md`The match is producing events faster than any one piece of code can handle: the scoreboard wants goals, the stats desk wants everything, and next season someone will want fouls for a referee-review screen.

Build the bus that decouples them. Once ¦arena¦ exists and your wiring connects the scoreboard and the stats reporters to it, the scene stops calling those pieces directly. Every event goes into ¦arena.emit¦, and your listeners do the rest.`,
    tasks: [
      "class EventEmitter: on / once return an unsubscribe function; off, emit, listenerCount, eventNames, removeAllListeners",
      "emit iterates over a copy, calls listeners through this._invoke, passes this = the emitter and returns how many ran",
      "wireArena(bus): goals update the scoreboard; every event type goes to reportAll; returns an unwire function",
      "let arena = new EventEmitter(), wired with wireArena",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 7: an EventEmitter from scratch.

class EventEmitter {
  // #listeners: a Map from event name to an array of { listener, once } records

  // Register a listener. Return a function that removes exactly this registration.
  // Not a function -> throw new TypeError("listener must be a function, got <typeof>").
  // Event name must be a non-empty string -> otherwise throw new TypeError("event name must be a non-empty string").
  on(type, listener) {
    // TODO
  }

  // Like on, but the listener is removed before its first call (it runs once).
  once(type, listener) {
    // TODO
  }

  // Remove ONE registration of this listener (the most recently added). Return true if one was removed.
  off(type, listener) {
    // TODO
  }

  // Call every listener of this type in registration order with (...args). Iterate over a COPY of the list.
  // Call each one with this._invoke(listener, args, type). Return how many listeners ran (0 for none).
  emit(type, ...args) {
    // TODO
  }

  // The one place listeners are actually called. Subclasses may override it. this = the emitter.
  _invoke(listener, args, type) {
    // TODO
  }

  listenerCount(type) {
    // TODO
  }

  // Names that currently have at least one listener.
  eventNames() {
    // TODO
  }

  // Remove all listeners of one type, or of every type when no type is given.
  removeAllListeners(type) {
    // TODO
  }
}

// Connect a bus to the rest of the arena. Return a function that disconnects everything again.
//   "goal"                           -> scoreboard.add(event.team, event.points ?? 1)
//   "goal", "foul", "timeout", "card" -> reportAll(event)
function wireArena(bus) {
  // TODO
}

// The arena's bus. Use let: lesson 8 swaps in a sturdier one.
let arena;
`,
    solutionAdd: js`class EventEmitter {
  #listeners = new Map(); // event name -> [{ listener, once, done }]

  #add(type, listener, once) {
    if (typeof type !== "string" || !type) throw new TypeError("event name must be a non-empty string");
    if (typeof listener !== "function") throw new TypeError(¦listener must be a function, got \${typeof listener}¦);
    const entry = { listener, once, done: false };
    const list = this.#listeners.get(type) ?? [];
    list.push(entry);
    this.#listeners.set(type, list);
    return () => this.#remove(type, entry);
  }

  #remove(type, entry) {
    const list = this.#listeners.get(type);
    const index = list ? list.indexOf(entry) : -1;
    if (index === -1) return false;
    list.splice(index, 1);
    if (list.length === 0) this.#listeners.delete(type);
    return true;
  }

  on(type, listener) {
    return this.#add(type, listener, false);
  }

  once(type, listener) {
    return this.#add(type, listener, true);
  }

  off(type, listener) {
    const list = this.#listeners.get(type) ?? [];
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].listener === listener) return this.#remove(type, list[i]);
    }
    return false;
  }

  emit(type, ...args) {
    const list = this.#listeners.get(type);
    if (!list) return 0;
    let ran = 0;
    for (const entry of [...list]) {
      if (entry.once) {
        if (entry.done) continue; // already fired by an emit that happened inside a listener
        entry.done = true;
        this.#remove(type, entry);
      }
      this._invoke(entry.listener, args, type);
      ran++;
    }
    return ran;
  }

  _invoke(listener, args) {
    listener.apply(this, args);
  }

  listenerCount(type) {
    return this.#listeners.get(type)?.length ?? 0;
  }

  eventNames() {
    return [...this.#listeners.keys()];
  }

  removeAllListeners(type) {
    if (type === undefined) this.#listeners.clear();
    else this.#listeners.delete(type);
  }
}

function wireArena(bus) {
  const stops = [bus.on("goal", (event) => scoreboard.add(event.team, event.points ?? 1))];
  for (const type of ["goal", "foul", "timeout", "card"]) stops.push(bus.on(type, reportAll));
  return () => stops.forEach((stop) => stop());
}

let arena = new EventEmitter();
wireArena(arena);`,
    explanation:
      "Listeners are stored as records in a Map of arrays. on and once share a private #add that hands back an unsubscribe function closing over the exact record, so removing one of two identical registrations works. emit copies the array before looping, because listeners (and once) change it while it runs, removes once-records before calling them, and goes through _invoke so a subclass can decide how a listener is called. wireArena is the only place that knows both the bus and the football: it returns one function that undoes every subscription, which is how you avoid leaks.",
    hints: [
      { id: "h1", title: "Storing listeners", content: "Keep #listeners = new Map(). In a private #add(type, listener, once): validate, create const entry = { listener, once, done: false }, push it onto the array for that type (create it if missing) and return () => this.#remove(type, entry). on and once just call #add with false and true." },
      { id: "h2", title: "emit", content: "const list = this.#listeners.get(type); if (!list) return 0. Then for (const entry of [...list]) { if (entry.once) { if (entry.done) continue; entry.done = true; this.#remove(type, entry); } this._invoke(entry.listener, args, type); ran++ } and return ran. _invoke does listener.apply(this, args)." },
      { id: "h3", title: "Wiring", content: "wireArena: const stops = [bus.on(\"goal\", (event) => scoreboard.add(event.team, event.points ?? 1))]; then for each of the four types push bus.on(type, reportAll). Return () => stops.forEach((stop) => stop()). Finally: let arena = new EventEmitter(); wireArena(arena);" },
    ],
    tests: [
      {
        id: "t1",
        description: "on + emit: listeners run in order and receive the arguments",
        assertionCode: T(js`const bus = new EventEmitter();
const seen = [];
bus.on("goal", (a, b) => seen.push(["first", a, b]));
bus.on("goal", (a) => seen.push(["second", a]));
bus.on("foul", () => seen.push("foul"));
const ran = bus.emit("goal", "Ada", 23);
assertEqual(seen, [["first", "Ada", 23], ["second", "Ada"]], "both goal listeners, in registration order, with the arguments");
assertEqual(ran, 2, "emit returns how many listeners ran");
assertEqual(bus.emit("timeout", 1), 0, "emitting an event nobody listens to returns 0 and does not throw");
assertEqual(seen.length, 2, "foul listeners must not run for a goal");`),
      },
      {
        id: "t2",
        description: "Listeners run with this set to the emitter",
        assertionCode: T(js`const bus = new EventEmitter();
let seenThis = null;
bus.on("x", function () { seenThis = this; });
bus.emit("x");
assert(seenThis === bus, "a function listener should be called with this = the emitter (use apply)");`),
      },
      {
        id: "t3",
        description: "on returns an unsubscribe function; off removes one registration",
        assertionCode: T(js`const bus = new EventEmitter();
const calls = [];
const a = () => calls.push("a");
const b = () => calls.push("b");
const stopA = bus.on("t", a);
bus.on("t", b);
assertEqual(typeof stopA, "function", "on() must return a function");
bus.emit("t");
assertEqual(stopA(), true, "unsubscribing returns true");
assertEqual(stopA(), false, "and false the second time");
bus.emit("t");
assertEqual(calls, ["a", "b", "b"], "a stopped listening after stopA()");
assertEqual(bus.off("t", b), true, "off removes b");
assertEqual(bus.off("t", b), false, "nothing left to remove");
assertEqual(bus.off("nope", b), false, "an unknown event is fine");
const twice = () => calls.push("twice");
bus.on("d", twice); bus.on("d", twice);
bus.off("d", twice);
assertEqual(bus.listenerCount("d"), 1, "off removes one registration at a time");`),
      },
      {
        id: "t4",
        description: "once runs a single time",
        assertionCode: T(js`const bus = new EventEmitter();
let n = 0;
bus.once("t", () => n++);
assertEqual(bus.emit("t"), 1, "the first emit runs it");
assertEqual(bus.emit("t"), 0, "the second emit finds no listener");
assertEqual(n, 1, "it ran exactly once");
assertEqual(bus.listenerCount("t"), 0, "and it removed itself");
let m = 0;
const stop = bus.once("u", () => m++);
stop();
bus.emit("u");
assertEqual(m, 0, "a once listener can be unsubscribed before it fires");
let k = 0;
bus.once("r", () => { k++; bus.emit("r"); });
bus.emit("r");
assertEqual(k, 1, "a once listener that re-emits its own event must not run twice");`),
      },
      {
        id: "t5",
        description: "Changing listeners while emitting does not skip anyone",
        assertionCode: T(js`const bus = new EventEmitter();
const calls = [];
let stopB;
bus.on("t", () => { calls.push("a"); stopB(); });
stopB = bus.on("t", () => calls.push("b"));
bus.on("t", () => { calls.push("c"); bus.on("t", () => calls.push("late")); });
bus.emit("t");
assertEqual(calls, ["a", "b", "c"], "b was removed during the emit but this emit still uses the original list; 'late' is only for the next one");
calls.length = 0;
bus.emit("t");
assertEqual(calls.slice(0, 3), ["a", "c", "late"], "the next emit sees the changes");`),
      },
      {
        id: "t6",
        description: "listenerCount, eventNames and removeAllListeners",
        assertionCode: T(js`const bus = new EventEmitter();
const noop = () => {};
bus.on("goal", noop); bus.on("goal", noop); bus.on("foul", noop);
assertEqual(bus.listenerCount("goal"), 2, "two goal listeners");
assertEqual(bus.listenerCount("card"), 0, "none for card");
assertEqual(bus.eventNames().sort(), ["foul", "goal"], "names with listeners");
bus.removeAllListeners("goal");
assertEqual(bus.eventNames(), ["foul"], "removeAllListeners(type) clears one type");
bus.on("card", noop);
bus.removeAllListeners();
assertEqual(bus.eventNames(), [], "removeAllListeners() clears everything");`),
      },
      {
        id: "t7",
        description: "Bad listeners and event names are rejected clearly",
        assertionCode: T(js`const bus = new EventEmitter();
assertThrows(() => bus.on("goal", "not a function"), "listener must be a function, got string", "a string listener");
assertThrows(() => bus.once("goal"), "listener must be a function, got undefined", "a missing listener");
assertThrows(() => bus.on("", () => {}), "event name must be a non-empty string", "an empty name");
assertThrows(() => bus.on(42, () => {}), "TypeError", "a number is not an event name");
assertEqual(bus.eventNames(), [], "rejected registrations must not leave anything behind");`),
      },
      {
        id: "t8",
        description: "emit goes through _invoke so subclasses can change how listeners run",
        assertionCode: T(js`const log = [];
class Spy extends EventEmitter {
  _invoke(listener, args, type) { log.push(type + ":" + args.join(",")); super._invoke(listener, args, type); }
}
const spy = new Spy();
let got = null;
spy.on("goal", (x, y) => { got = x + y; });
spy.emit("goal", 2, 3);
assertEqual(log, ["goal:2,3"], "_invoke(listener, args, type) is called once per listener");
assertEqual(got, 5, "and the default _invoke still calls the listener");`),
      },
      {
        id: "t9",
        description: "wireArena connects the scoreboard and the stats desk",
        assertionCode: T(js`scoreboard.reset();
resetReporters();
const bus = new EventEmitter();
const unwire = wireArena(bus);
assertEqual(typeof unwire, "function", "wireArena returns an unwire function");
assertEqual(["goal", "foul", "timeout", "card"].map((t) => bus.listenerCount(t)), [2, 1, 1, 1], "goal has the scoreboard and the stats listener; the others only stats");
bus.emit("goal", _ev("goal", "fal", 10));
bus.emit("goal", _ev("goal", "fal", 20, { points: 2 }));
bus.emit("foul", _ev("foul", "wol", 30));
assertEqual(scoreboard.score("fal"), 3, "goals reach the scoreboard (points default to 1)");
assertEqual(summaries().goals, { fal: 3 }, "and the goals reporter");
assertEqual(summaries().discipline.fouls, { wol: 1 }, "fouls reach the discipline reporter");
unwire();
assertEqual(bus.eventNames(), [], "unwire removes every listener it added");
bus.emit("goal", _ev("goal", "fal", 40));
assertEqual(scoreboard.score("fal"), 3, "after unwire nothing changes");
scoreboard.reset();
resetReporters();`),
      },
      {
        id: "t10",
        description: "arena is an EventEmitter that is already wired",
        assertionCode: T(js`assert(arena instanceof EventEmitter, "arena should be new EventEmitter()");
assertEqual(["goal", "foul", "timeout", "card"].map((t) => arena.listenerCount(t)), [2, 1, 1, 1], "wireArena(arena) must have been called exactly once");
scoreboard.reset();
resetReporters();
arena.emit("goal", _ev("goal", "orc", 12));
assertEqual(scoreboard.score("orc"), 1, "a goal emitted on arena reaches the scoreboard");
scoreboard.reset();
resetReporters();`),
      },
    ],
    unlocks: ["arena-bus"],
    checks: [
      {
        prompt: md`~~~js
bus.on("goal", () => console.log("A"));
bus.emit("goal");
console.log("B");
~~~
In what order do ¦A¦ and ¦B¦ print with our synchronous ¦emit¦?`,
        question: { type: "choice", options: ["A then B", "B then A", "Either: it depends on the browser", "Only A prints"], answer: 0 },
        explanation: md`¦emit¦ calls each listener directly and only returns after they have all finished, so ¦A¦ prints before ¦emit¦ returns and ¦B¦ afterwards. Making delivery asynchronous would be a deliberate design choice (and the subject of the second half of this course).`,
      },
      {
        prompt: md`Why does ¦emit¦ loop over ¦[...list]¦ (a copy) instead of ¦list¦ itself?`,
        question: {
          type: "choice",
          options: [
            "Copies are faster to iterate",
            "A listener can add or remove listeners during the loop, which would make an in-place loop skip or repeat entries",
            "Arrays cannot be iterated while stored in a Map",
            "It stops listeners from reading the arguments",
          ],
          answer: 1,
        },
        explanation: md`Removing an element shifts the rest of the array left, so a loop over the live array jumps over the next listener. ¦once¦ removes itself on every call, so it would trigger this bug constantly. Copy first, then it does not matter what listeners do.`,
      },
    ],
  },

  // ───────────────────────────────────────── 8. hardening
  {
    id: "event-arena-8-hardening",
    title: "A bus that survives",
    minutes: 32,
    xp: 150,
    concepts: ["error events", "error isolation", "dead letters", "wildcard listeners", "memory leaks", "subscription groups"],
    learn: md`### Three ways an event bus fails in production

Your emitter works on a sunny day. Real systems hit three problems that you can design for.

### 1. One bad listener breaks everyone

Today ¦emit¦ calls listeners in a plain loop. If the first one throws, the exception flies out of ¦emit¦ and the other listeners never run, and the code that emitted the event now crashes for a reason that has nothing to do with it. Isolate each call:

~~~js
_invoke(listener, args, type) {
  try {
    listener.apply(this, args);
  } catch (error) {
    this.#report(error, type);     // tell someone, but carry on
  }
}
~~~

Where does the error go? Node's convention: an event named **¦"error"¦** is special. If somebody listens for it, they get the error. If nobody does, **emitting ¦"error"¦ throws**, because an error that nobody can see is worse than a crash. Failures that nobody handled are kept as **dead letters**: a list of what failed and why, for diagnosis. (Message queues use the same idea for messages that could not be delivered.)

~~~js
bus.on("error", (error, type) => alerts.push(type + ": " + error.message));
~~~

Careful with recursion: if an ¦"error"¦ listener throws, do not emit ¦"error"¦ again.

### 2. Wildcards

Sometimes you want everything: logging, metrics, a debug tap. A **wildcard** listener on ¦"*"¦ receives the event name first, then the arguments, and runs after the specific listeners:

~~~js
bus.on("*", (type, ...args) => log.push(type));
~~~

### 3. Memory leaks from forgotten listeners

A listener lives until somebody removes it, and **the emitter holds a reference to it**. The listener's closure holds everything it captured: the DOM node of a closed page, a large array, a whole component. If every screen opens, subscribes and never unsubscribes, memory grows until the tab crawls. The usual symptom is a ¦listenerCount¦ that keeps rising.

~~~js
function openMatchScreen(bus) {
  bus.on("goal", (e) => render(e));   // never removed: leaks one listener per visit
}
~~~

Defences:

- **Return an unsubscribe function and call it** when the owner goes away (lesson 7 already does this).
- Group subscriptions so one call undoes them all: a *disposable* or *subscription group*.
- Warn early. Node warns when more than 10 listeners are added for one event ("possible EventEmitter memory leak"); a surprising number is nearly always a bug.
- Use ¦once¦ when you only need the first event, and AbortSignal-based removal (lesson 11) where the platform offers it.

~~~js
class Subscriptions {
  #stops = [];
  constructor(bus) { this.bus = bus; }
  on(type, fn) { const stop = this.bus.on(type, fn); this.#stops.push(stop); return stop; }
  dispose() { for (const stop of this.#stops.splice(0)) stop(); }   // safe to call twice
}
~~~

### Extending without editing

Notice that you are not going to change ¦EventEmitter¦. You subclass it and override the hook (¦_invoke¦) plus the methods you need (¦emit¦, ¦on¦, ¦once¦), calling ¦super¦ for the real work. That is the open/closed principle: open for extension, closed for modification.

### Common mistakes

- Swallowing errors with an empty ¦catch {}¦: always record them somewhere visible.
- Emitting ¦"error"¦ with nobody listening in production code that is not prepared for the throw.
- Unbounded dead-letter lists (cap them).
- Adding listeners in a loop or on every render without a matching removal.`,
    mission: md`During a derby the scoreboard crashed on a malformed event from a flaky data feed, and because ¦emit¦ threw, the stats desk missed the next three goals. The fix is a sturdier bus.

Subclass ¦EventEmitter¦: isolate crashing listeners and keep dead letters, add wildcard listeners, and warn when listeners pile up. Then swap the new bus into the arena. The scene gains a dead-letter list, and its "send a malformed goal" button now shows your bus catching a real crash from your own scoreboard.`,
    tasks: [
      "class ArenaBus extends EventEmitter: _invoke catches errors, forwards them to \"error\" listeners or records dead letters",
      "emit(\"error\") with no error listener throws; wildcard \"*\" listeners get (type, ...args) after the specific ones",
      "Leak guard: warn once per event type when it has more than maxListeners listeners; getters for deadLetters and warnings",
      "class Subscriptions (a disposable group), then swap in arena = new ArenaBus() and wire it; add deadLetters() and busWarnings()",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 8: a bus that survives crashes and leaks.

class ArenaBus extends EventEmitter {
  // #maxListeners (default 10, set by new ArenaBus({ maxListeners: 3 })), #warned (a Set of types),
  // #letters and #warnings (arrays)

  constructor(options = {}) {
    super();
    // TODO
  }

  // A listener that throws must not stop the others, and must not escape emit.
  //   - If the event is NOT "error" and someone listens for "error": super.emit("error", error, type)
  //   - Otherwise record a dead letter { type, message } (keep at most the newest 50).
  //   An "error" listener that itself throws only becomes a dead letter (never emit "error" again).
  _invoke(listener, args, type) {
    // TODO
  }

  // emit("error", err) with no "error" listener -> throw err (or new Error('Unhandled "error" event: ...') for non-errors).
  // Otherwise emit as usual, then ALSO call the "*" listeners with (type, ...args) (not when type is "*").
  // Return the number of listeners that ran, wildcard ones included.
  emit(type, ...args) {
    // TODO
  }

  // After adding, if listenerCount(type) is above the limit and we have not warned about this type yet:
  // console.warn and store a message like
  //   Possible memory leak: 11 "goal" listeners (limit 10). Did you forget to unsubscribe?
  on(type, listener) {
    // TODO
  }
  once(type, listener) {
    // TODO
  }

  // get deadLetters, get warnings: COPIES of the stored arrays.
  // clearLetters(): forget the dead letters.
}

// A group of subscriptions that can be undone together.
//   const group = new Subscriptions(bus);  group.on("goal", fn);  group.once(...);  group.size;  group.dispose();
class Subscriptions {
  // TODO
}

// Swap the sturdier bus into the arena and wire it up like before (the old bus is simply forgotten).
arena = undefined;

// Helpers for the scene: arena.deadLetters and arena.warnings as plain arrays.
function deadLetters() {
  // TODO
}
function busWarnings() {
  // TODO
}
`,
    solutionAdd: js`class ArenaBus extends EventEmitter {
  #maxListeners;
  #warned = new Set();
  #letters = [];
  #warnings = [];

  constructor(options = {}) {
    super();
    this.#maxListeners = options.maxListeners ?? 10;
  }

  _invoke(listener, args, type) {
    try {
      super._invoke(listener, args, type);
    } catch (error) {
      if (type !== "error" && this.listenerCount("error") > 0) {
        super.emit("error", error, type);
        return;
      }
      this.#letters.push({ type, message: error?.message ?? String(error) });
      if (this.#letters.length > 50) this.#letters.shift();
    }
  }

  emit(type, ...args) {
    if (type === "error" && this.listenerCount("error") === 0) {
      const [error] = args;
      throw error instanceof Error ? error : new Error(¦Unhandled "error" event: \${String(error)}¦);
    }
    let ran = super.emit(type, ...args);
    if (type !== "*") ran += super.emit("*", type, ...args);
    return ran;
  }

  #checkLeak(type) {
    const count = this.listenerCount(type);
    if (count > this.#maxListeners && !this.#warned.has(type)) {
      this.#warned.add(type);
      const message = ¦Possible memory leak: \${count} "\${type}" listeners (limit \${this.#maxListeners}). Did you forget to unsubscribe?¦;
      this.#warnings.push(message);
      console.warn(message);
    }
  }

  on(type, listener) {
    const stop = super.on(type, listener);
    this.#checkLeak(type);
    return stop;
  }

  once(type, listener) {
    const stop = super.once(type, listener);
    this.#checkLeak(type);
    return stop;
  }

  get deadLetters() {
    return this.#letters.map((letter) => ({ ...letter }));
  }

  get warnings() {
    return [...this.#warnings];
  }

  clearLetters() {
    this.#letters = [];
  }
}

class Subscriptions {
  #stops = [];

  constructor(bus) {
    this.bus = bus;
  }

  on(type, listener) {
    const stop = this.bus.on(type, listener);
    this.#stops.push(stop);
    return stop;
  }

  once(type, listener) {
    const stop = this.bus.once(type, listener);
    this.#stops.push(stop);
    return stop;
  }

  get size() {
    return this.#stops.length;
  }

  dispose() {
    for (const stop of this.#stops.splice(0)) stop();
  }
}

arena = new ArenaBus();
wireArena(arena);

function deadLetters() {
  return arena.deadLetters ?? [];
}

function busWarnings() {
  return arena.warnings ?? [];
}`,
    explanation:
      "ArenaBus reuses everything in EventEmitter and changes only what it must. _invoke wraps the default call in try/catch: a crash becomes either an \"error\" event (if somebody handles those) or a dead letter, and an \"error\" listener that crashes cannot recurse. emit enforces Node's rule that an unhandled \"error\" event throws, then runs wildcard listeners after the specific ones. on and once check the count after adding, and a Set remembers which types were already reported so a leak warns once instead of on every extra listener. Subscriptions turns \"remember every unsubscribe function\" into one dispose() call.",
    hints: [
      { id: "h1", title: "Isolation", content: "In _invoke: try { super._invoke(listener, args, type); } catch (error) { ... }. In the catch, if type !== \"error\" && this.listenerCount(\"error\") > 0, call super.emit(\"error\", error, type) and return; otherwise push { type, message: error?.message ?? String(error) } onto #letters and shift() when it grows past 50." },
      { id: "h2", title: "emit and the leak check", content: "emit: if type === \"error\" and there are no error listeners, throw the error. Otherwise let ran = super.emit(type, ...args); if (type !== \"*\") ran += super.emit(\"*\", type, ...args); return ran. For on(): const stop = super.on(type, listener); then compare this.listenerCount(type) with the limit and check #warned before warning; return stop." },
      { id: "h3", title: "Subscriptions and the swap", content: "Subscriptions keeps #stops = []; on() pushes the function that bus.on returns; dispose() does for (const stop of this.#stops.splice(0)) stop(). Then arena = new ArenaBus(); wireArena(arena); deadLetters() returns arena.deadLetters ?? []." },
    ],
    tests: [
      {
        id: "t1",
        description: "A crashing listener does not stop the others or escape emit",
        assertionCode: T(js`const bus = new ArenaBus();
const calls = [];
bus.on("goal", () => calls.push("first"));
bus.on("goal", () => { throw new Error("scoreboard exploded"); });
bus.on("goal", () => calls.push("third"));
let ran;
try { ran = bus.emit("goal"); } catch (e) { assert(false, "emit must not throw when a listener crashes, but it threw: " + e.message); }
assertEqual(calls, ["first", "third"], "listeners after the crashing one still run");
assertEqual(ran, 3, "emit counts every listener it called");
assertEqual(bus.deadLetters, [{ type: "goal", message: "scoreboard exploded" }], "the failure is kept as a dead letter");`),
      },
      {
        id: "t2",
        description: "Crashes go to \"error\" listeners when there are any",
        assertionCode: T(js`const bus = new ArenaBus();
const seen = [];
bus.on("error", (error, type) => seen.push([error.message, type]));
bus.on("foul", () => { throw new RangeError("bad foul"); });
bus.emit("foul");
assertEqual(seen, [["bad foul", "foul"]], "the error listener gets (error, type of the failed event)");
assertEqual(bus.deadLetters, [], "a handled error is not a dead letter");
bus.on("error", () => { throw new Error("handler crashed too"); });
bus.emit("foul");
assertEqual(bus.deadLetters.length, 1, "a crashing error listener becomes a dead letter instead of recursing forever");
assertEqual(bus.deadLetters[0].type, "error", "tagged with the type error");`),
      },
      {
        id: "t3",
        description: "emit(\"error\") with no listener throws, like Node",
        assertionCode: T(js`const bus = new ArenaBus();
const boom = new Error("referee system offline");
let thrown = null;
try { bus.emit("error", boom); } catch (e) { thrown = e; }
assert(thrown === boom, "an unhandled error event should throw the very same error object");
assertThrows(() => bus.emit("error", "just text"), 'Unhandled "error" event: just text', "a non-error payload");
bus.on("error", () => {});
assertEqual(bus.emit("error", boom), 1, "with a listener nothing throws");`),
      },
      {
        id: "t4",
        description: "Wildcard listeners receive (type, ...args) after the specific ones",
        assertionCode: T(js`const bus = new ArenaBus();
const log = [];
bus.on("*", (type, ...args) => log.push(["*", type, ...args]));
bus.on("goal", (x) => log.push(["goal", x]));
const ran = bus.emit("goal", 7);
assertEqual(log, [["goal", 7], ["*", "goal", 7]], "specific listeners first, then the wildcard with the name in front");
assertEqual(ran, 2, "wildcard listeners count too");
bus.emit("foul", 1, 2);
assertEqual(log[2], ["*", "foul", 1, 2], "wildcards see events nobody else listens to");
assertEqual(bus.emit("*", "x"), 1, "emitting \"*\" directly must not trigger the wildcard twice");`),
      },
      {
        id: "t5",
        description: "A leak warning fires once per event type",
        assertionCode: T(js`const bus = new ArenaBus({ maxListeners: 3 });
for (let i = 0; i < 3; i++) bus.on("goal", () => {});
assertEqual(bus.warnings, [], "three listeners are within the limit");
bus.on("goal", () => {});
assertEqual(bus.warnings.length, 1, "the fourth goal listener triggers a warning");
assert(bus.warnings[0].includes("Possible memory leak") && bus.warnings[0].includes('4 "goal" listeners') && bus.warnings[0].includes("limit 3"), "the message says how many and what the limit is: " + bus.warnings[0]);
bus.on("goal", () => {});
bus.once("goal", () => {});
assertEqual(bus.warnings.length, 1, "no repeated warning for the same type");
for (let i = 0; i < 4; i++) bus.once("foul", () => {});
assertEqual(bus.warnings.length, 2, "once() counts too, and each type warns separately");
const copy = bus.warnings; copy.push("x");
assertEqual(bus.warnings.length, 2, "warnings returns a copy");
assertEqual(new ArenaBus().warnings, [], "the default limit is generous: ten listeners are fine");
const ten = new ArenaBus(); for (let i = 0; i < 10; i++) ten.on("x", () => {});
assertEqual(ten.warnings, [], "exactly ten listeners do not warn");`),
      },
      {
        id: "t6",
        description: "Dead letters are copies, capped at 50, and can be cleared",
        assertionCode: T(js`const bus = new ArenaBus();
bus.on("x", () => { throw new Error("e"); });
for (let i = 0; i < 60; i++) bus.emit("x");
assertEqual(bus.deadLetters.length, 50, "only the newest 50 are kept");
const letters = bus.deadLetters; letters[0].message = "tampered"; letters.pop();
assertEqual(bus.deadLetters[0].message, "e", "deadLetters returns copies");
bus.clearLetters();
assertEqual(bus.deadLetters, [], "clearLetters forgets them");`),
      },
      {
        id: "t7",
        description: "Subscriptions undoes a whole group at once",
        assertionCode: T(js`const bus = new ArenaBus();
const keep = bus.on("goal", () => {});
const group = new Subscriptions(bus);
group.on("goal", () => {});
group.on("foul", () => {});
group.once("card", () => {});
assertEqual(group.size, 3, "three subscriptions in the group");
assertEqual([bus.listenerCount("goal"), bus.listenerCount("foul"), bus.listenerCount("card")], [2, 1, 1], "they are registered on the bus");
group.dispose();
assertEqual([bus.listenerCount("goal"), bus.listenerCount("foul"), bus.listenerCount("card")], [1, 0, 0], "dispose removes only the group's listeners");
assertEqual(group.size, 0, "the group is empty afterwards");
group.dispose();
assertEqual(bus.listenerCount("goal"), 1, "disposing twice is harmless");
keep();`),
      },
      {
        id: "t8",
        description: "arena is now an ArenaBus, and a malformed goal becomes a dead letter",
        assertionCode: T(js`assert(arena instanceof ArenaBus, "arena should now be new ArenaBus()");
assertEqual(["goal", "foul", "timeout", "card"].map((t) => arena.listenerCount(t)), [2, 1, 1, 1], "and wired exactly once");
arena.clearLetters();
scoreboard.reset();
resetReporters();
let threw = false;
try { arena.emit("goal", { id: 1, type: "goal", team: "nobody", minute: 3 }); } catch { threw = true; }
assert(!threw, "a goal for an unknown team must not crash the emitter");
assertEqual(deadLetters(), [{ type: "goal", message: "Unknown team: nobody" }], "the scoreboard's RangeError was caught and recorded");
assertEqual(busWarnings(), [], "no leak warnings");
arena.clearLetters();
resetReporters();
scoreboard.reset();`),
      },
    ],
    unlocks: ["arena-resilience"],
    checks: [
      {
        prompt: md`In Node's convention, what happens when you ¦emit("error", err)¦ and nobody has registered an ¦"error"¦ listener?`,
        question: { type: "choice", options: ["Nothing: the event is ignored", "The error is thrown", "The error is logged and swallowed", "A new listener is added automatically"], answer: 1 },
        explanation: md`An unhandled ¦"error"¦ event throws, so a failure can never disappear silently. If you want to keep the program running you must register an ¦"error"¦ listener, which is a deliberate decision to handle failures.`,
      },
      {
        prompt: md`A screen calls ¦bus.on("goal", render)¦ every time it opens, and never unsubscribes. What is the long-term problem?`,
        question: {
          type: "choice",
          options: [
            "Goals are delivered in the wrong order",
            "Every visit adds another listener (and everything it captured) that the bus keeps alive: memory grows and old screens keep reacting",
            "The bus throws after ten listeners",
            "Nothing: JavaScript garbage-collects listeners automatically",
          ],
          answer: 1,
        },
        explanation: md`The emitter holds a strong reference to each listener, so the garbage collector cannot free it, or the objects its closure captured. Call the unsubscribe function from ¦on¦ when the owner closes (or use a ¦Subscriptions¦ group) and watch ¦listenerCount¦ in tests.`,
      },
    ],
  },

  // ───────────────────────────────────────── 9. event loop
  {
    id: "event-arena-9-event-loop",
    title: "The event loop",
    minutes: 35,
    xp: 170,
    concepts: ["call stack", "task queue", "microtask queue", "run to completion", "setTimeout", "callback hell"],
    learn: md`### One thread, one stack

JavaScript runs your code on a **single thread**. At any moment it is doing exactly one thing: running the function at the top of the **call stack**. A function that is called goes onto the stack; when it returns it comes off. While it runs, *nothing else runs*: no other function, no click handler, no timer. This is **run to completion**.

That sounds terrible for something that waits on networks and humans, so the waiting is done **outside** your code. The browser (or Node) handles timers, network, disk and input for you. When one of them has something to report, it drops a job into a queue. JavaScript picks jobs up only when the stack is empty. The part that does the picking is the **event loop**.

### Two queues

- The **task queue** (macrotasks): timer callbacks (¦setTimeout¦, ¦setInterval¦), events (clicks, messages), I/O completion. The loop takes **one** task per turn.
- The **microtask queue**: promise reactions (¦.then¦, ¦.catch¦, the code after an ¦await¦) and ¦queueMicrotask(fn)¦. After the current task (or script) finishes, and before the next task, the loop **drains the microtask queue completely**, including microtasks that other microtasks add.

The loop in pseudo-code:

~~~js
run the script            // it is the first task
drain microtasks
while (a task is waiting) {
  take the oldest due task
  run it
  drain microtasks
}
~~~

### Predict the order

~~~js
console.log("1: script start");
setTimeout(() => console.log("2: timeout"), 0);
Promise.resolve().then(() => console.log("3: promise"));
console.log("4: script end");
~~~

Output: ¦1¦, ¦4¦, ¦3¦, ¦2¦. The script runs to the end first (1, 4). Then the microtask queue drains (3). Only then does the loop take the timer task (2). **A promise callback always beats a ¦setTimeout(fn, 0)¦ scheduled at the same time.**

Two more facts that surprise people:

- ¦setTimeout(fn, 100)¦ means "**at least** 100 ms from now, once the stack is free". A busy stack delays the timer. Timers with the same delay run in the order they were scheduled; a shorter delay can overtake a longer one.
- An ¦async¦ function runs **synchronously until its first ¦await¦**. Everything after the ¦await¦ is a microtask. (Lesson 11 builds on this.)

### Blocking and starving

A loop that runs for two seconds freezes the page for two seconds: no clicks, no repaint, no timers. Long jobs should be split into chunks scheduled with ¦setTimeout¦ so other tasks get a turn. The mirror image: microtasks that keep adding microtasks **starve** everything, because the queue is never empty.

~~~js
function loopForever() { queueMicrotask(loopForever); }   // the page never gets another task
~~~

### Callback hell

Before promises, async code was written with callbacks. The Node convention is **error first**: ¦callback(error, result)¦. Chaining several steps makes the code drift to the right:

~~~js
loadMatch(3, (err, match) => {
  if (err) return handle(err);
  loadTeam(match.home, (err, home) => {
    if (err) return handle(err);
    loadTeam(match.away, (err, away) => {
      if (err) return handle(err);
      render(match, home, away);       // the "pyramid of doom"
    });
  });
});
~~~

Problems: error handling repeated at every level, no way to run steps in parallel without bookkeeping, hard to return a value, and **inversion of control**: you hand your continuation to code you don't control. What if it calls your callback twice, or never, or synchronously sometimes and asynchronously other times? Promises (next lesson) fix all of these.

### How this course runs time

Real browsers make you wait: a 5 second ¦setTimeout¦ takes 5 seconds. In this course your code runs on a **virtual clock**: when everything is waiting, time jumps to the next timer instantly. Tests of delays finish immediately and are exactly repeatable, but the *order* of things is the same as in a real engine.

### Common mistakes

- Assuming ¦setTimeout(fn, 0)¦ runs immediately.
- Expecting code after an ¦await¦ to run before the code that follows the call.
- Doing heavy work in one go (freezes the page).
- Calling a callback sometimes synchronously and sometimes later ("releasing Zalgo"): always be consistently async.`,
    mission: md`Before you trust async code with live match data, you need a mental model of the event loop that is precise enough to predict output. The best way to learn it is to build it.

Write ¦runLoop(script)¦: a tiny event loop that takes a description of steps (log a line, queue a microtask, set a timeout) and returns what a real engine would print. The Event-loop lab in the scene runs a set of scripts step by step, drawing the stack and both queues, and checks your ¦runLoop¦ against the reference trace.`,
    tasks: [
      "runLoop(script): run the script's steps as the first task, collecting log texts",
      "A microtask queue that is drained completely after the script and after every task",
      "A task queue ordered by due time (now + delay), keeping scheduling order for ties",
      "Throw a TypeError for unknown steps; your result must match a real run",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 9: build a tiny event loop.
//
// A script is an array of steps. Each step is one of:
//   { type: "log", text: "A" }                    print text (push it onto the output)
//   { type: "microtask", run: [ ...steps ] }      queue a microtask: like Promise.resolve().then(...)
//   { type: "timeout", delay: 10, run: [ ... ] }  queue a task due in 'delay' ms (default 0): like setTimeout
// The 'run' steps of a microtask or timeout execute later, as their own call stack.
//
// The rules:
//   1. Run the script's steps in order (this is the first task).
//   2. Then drain the microtask queue completely (microtasks can queue more microtasks: they run too).
//   3. Take the task that is due first (smallest due time; same time -> scheduled first goes first),
//      run its steps, drain the microtasks again. Repeat until nothing is left.
//   A timeout scheduled while time is "now" is due at now + delay, and 'now' becomes the due time of the task being run.
//
// Return the array of logged texts. Not an array -> throw new TypeError("script must be an array of steps").
// A step with another type -> throw new TypeError("Unknown step type: dance").
function runLoop(script) {
  // TODO
}
`,
    solutionAdd: js`function runLoop(script) {
  if (!Array.isArray(script)) throw new TypeError("script must be an array of steps");

  const output = [];
  const microtasks = []; // each item is the list of steps to run
  const tasks = []; // { due, order, steps }
  let now = 0;
  let order = 0;

  // run one list of steps, like one trip through the call stack
  function execute(steps) {
    for (const step of steps) {
      if (step.type === "log") {
        output.push(step.text);
      } else if (step.type === "microtask") {
        microtasks.push(step.run ?? []);
      } else if (step.type === "timeout") {
        tasks.push({ due: now + Math.max(0, step.delay ?? 0), order: order++, steps: step.run ?? [] });
      } else {
        throw new TypeError(¦Unknown step type: \${step.type}¦);
      }
    }
  }

  function drainMicrotasks() {
    while (microtasks.length > 0) execute(microtasks.shift());
  }

  execute(script);
  drainMicrotasks();

  while (tasks.length > 0) {
    tasks.sort((a, b) => a.due - b.due || a.order - b.order);
    const task = tasks.shift();
    now = task.due;
    execute(task.steps);
    drainMicrotasks();
  }

  return output;
}`,
    explanation:
      "execute is one trip through the call stack: it runs steps until they are done and only queues work for later. drainMicrotasks empties the microtask queue completely (the while loop re-checks the length, so microtasks queued by microtasks run too) and it is called after the script and after every task, which is exactly why promise callbacks beat timers. The task loop picks the earliest due task, using the order counter to keep first-scheduled-first for ties, and moves \"now\" to that task's due time so nested timeouts are relative to it.",
    hints: [
      { id: "h1", title: "Structure", content: "Keep const output = [], const microtasks = [] and const tasks = []. Write an inner function execute(steps) that loops over the steps: a log pushes step.text, a microtask pushes step.run onto microtasks, a timeout pushes { due, order, steps } onto tasks, anything else throws the TypeError." },
      { id: "h2", title: "Draining", content: "function drainMicrotasks() { while (microtasks.length > 0) execute(microtasks.shift()); } Call execute(script) then drainMicrotasks() first. A microtask that queues another microtask just makes the while loop run again." },
      { id: "h3", title: "The task loop", content: "Track let now = 0 and let order = 0. A timeout is due at now + (step.delay ?? 0). While (tasks.length > 0): sort by due then order, shift the first, set now = task.due, execute(task.steps), then drainMicrotasks()." },
    ],
    tests: [
      {
        id: "t1",
        description: "Plain logs run in order; an empty script prints nothing",
        assertionCode: T(js`assertEqual(runLoop([]), [], "an empty script");
assertEqual(runLoop([{ type: "log", text: "A" }, { type: "log", text: "B" }]), ["A", "B"], "synchronous logs keep their order");`),
      },
      {
        id: "t2",
        description: "Microtasks run after the script finishes",
        assertionCode: T(js`const script = [
  { type: "log", text: "start" },
  { type: "microtask", run: [{ type: "log", text: "promise" }] },
  { type: "log", text: "end" },
];
assertEqual(runLoop(script), ["start", "end", "promise"], "the whole script runs to completion before any microtask");`),
      },
      {
        id: "t3",
        description: "Microtasks beat timeouts, even timeouts with delay 0",
        assertionCode: T(js`const script = [
  { type: "timeout", delay: 0, run: [{ type: "log", text: "timeout" }] },
  { type: "microtask", run: [{ type: "log", text: "promise" }] },
  { type: "log", text: "sync" },
];
assertEqual(runLoop(script), ["sync", "promise", "timeout"], "sync, then microtasks, then the timer task");`),
      },
      {
        id: "t4",
        description: "Timeouts run by due time, then in scheduling order",
        assertionCode: T(js`const log = (text) => ({ type: "log", text });
const script = [
  { type: "timeout", delay: 50, run: [log("slow")] },
  { type: "timeout", delay: 10, run: [log("fast-1")] },
  { type: "timeout", delay: 10, run: [log("fast-2")] },
  { type: "timeout", run: [log("zero")] },
];
assertEqual(runLoop(script), ["zero", "fast-1", "fast-2", "slow"], "smallest delay first; equal delays keep the order they were set in");`),
      },
      {
        id: "t5",
        description: "Microtasks queued by microtasks all run before the next task",
        assertionCode: T(js`const log = (text) => ({ type: "log", text });
const script = [
  { type: "timeout", run: [log("task")] },
  { type: "microtask", run: [log("m1"), { type: "microtask", run: [log("m1-child"), { type: "microtask", run: [log("m1-grandchild")] }] }] },
  { type: "microtask", run: [log("m2")] },
];
assertEqual(runLoop(script), ["m1", "m2", "m1-child", "m1-grandchild", "task"], "the queue is first in, first out, and it is drained completely");`),
      },
      {
        id: "t6",
        description: "Microtasks are drained after every task, not just once",
        assertionCode: T(js`const log = (text) => ({ type: "log", text });
const script = [
  { type: "timeout", delay: 1, run: [log("A"), { type: "microtask", run: [log("A-micro")] }] },
  { type: "timeout", delay: 1, run: [log("B")] },
];
assertEqual(runLoop(script), ["A", "A-micro", "B"], "A's microtask runs before task B starts");`),
      },
      {
        id: "t7",
        description: "Timeouts set inside tasks are relative to when that task ran",
        assertionCode: T(js`const log = (text) => ({ type: "log", text });
const script = [
  { type: "timeout", delay: 100, run: [log("outer"), { type: "timeout", delay: 5, run: [log("inner (due at 105)")] }] },
  { type: "timeout", delay: 103, run: [log("between (due at 103)")] },
  { type: "timeout", delay: 110, run: [log("last (due at 110)")] },
];
assertEqual(runLoop(script), ["outer", "between (due at 103)", "inner (due at 105)", "last (due at 110)"], "inner is due at 100 + 5, so it falls between 103 and 110");`),
      },
      {
        id: "t8",
        description: "Bad input is rejected with a clear error",
        assertionCode: T(js`assertThrows(() => runLoop("log A"), "script must be an array of steps", "a string is not a script");
assertThrows(() => runLoop(undefined), "TypeError", "undefined");
assertThrows(() => runLoop([{ type: "dance" }]), "Unknown step type: dance", "unknown step");
assertThrows(() => runLoop([{ type: "timeout", run: [{ type: "sing" }] }]), "Unknown step type: sing", "unknown step inside a timeout");`),
      },
      {
        id: "t9",
        description: "Your loop agrees with the real engine on these scripts",
        assertionCode: T(js`const log = (text) => ({ type: "log", text });
const micro = (...run) => ({ type: "microtask", run });
const timeout = (delay, ...run) => ({ type: "timeout", delay, run });
async function realOrder(script) {
  const out = [];
  const exec = (steps) => {
    for (const step of steps) {
      if (step.type === "log") out.push(step.text);
      else if (step.type === "microtask") queueMicrotask(() => exec(step.run));
      else setTimeout(() => exec(step.run), step.delay ?? 0);
    }
  };
  exec(script);
  await sim.run();
  return out;
}
const scripts = [
  [log("1"), timeout(0, log("2")), micro(log("3")), log("4")],
  [timeout(20, log("a"), micro(log("a-micro")), timeout(0, log("a-inner"))), timeout(20, log("b")), micro(log("m"), micro(log("m2"))), log("s")],
  [micro(timeout(5, log("late")), log("in-micro")), timeout(5, log("early")), log("top")],
  [timeout(30, timeout(30, log("x"))), timeout(59, log("y")), timeout(61, log("z"))],
];
for (const [i, script] of scripts.entries()) {
  assertEqual(runLoop(script), await realOrder(script), "script #" + (i + 1) + " should print what JavaScript really prints");
}`),
      },
    ],
    unlocks: ["arena-loop"],
    checks: [
      {
        prompt: md`~~~js
console.log("1");
setTimeout(() => console.log("2"), 0);
Promise.resolve().then(() => console.log("3"));
queueMicrotask(() => console.log("4"));
console.log("5");
~~~
Put the output lines in the order they are printed.`,
        question: { type: "order", items: ["1", "5", "3", "4", "2"] },
        explanation: md`The script prints ¦1¦ and ¦5¦ first. Then the microtask queue drains in first-in-first-out order: the promise callback (¦3¦) was queued before the ¦queueMicrotask¦ callback (¦4¦). Only after both does the loop take the timer task (¦2¦).`,
      },
      {
        prompt: md`~~~js
async function f() {
  console.log("a");
  await null;
  console.log("b");
}
f();
console.log("c");
~~~
What is printed, in order?`,
        question: { type: "choice", options: ["a b c", "a c b", "c a b", "a c, then b never prints"], answer: 1 },
        explanation: md`An ¦async¦ function runs synchronously until its first ¦await¦, so ¦a¦ prints during the call to ¦f()¦. The ¦await¦ pauses it and the rest (¦b¦) is queued as a microtask, so the main script's ¦c¦ prints first.`,
      },
      {
        prompt: md`A button handler runs a 3-second ¦for¦ loop. What happens to a ¦setTimeout(fn, 100)¦ that was set just before?`,
        question: {
          type: "choice",
          options: [
            "It runs after 100 ms, on another thread",
            "It runs only after the loop finishes (about 3 seconds): the event loop cannot take the next task while the stack is busy",
            "It is cancelled",
            "It runs immediately, before the loop",
          ],
          answer: 1,
        },
        explanation: md`There is one thread. A timer is a request to run a callback **no sooner than** the delay, and only when the stack is free. Long synchronous work delays every timer, event and repaint, which is why heavy work is split into chunks or moved to a worker.`,
      },
    ],
  },
];
