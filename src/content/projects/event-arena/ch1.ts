import type { Lesson } from "@/engine/types";
import { js, md, T } from "./shared.ts";

/** Chapter 1: Functions as values. Callbacks, closures, this, and building behaviour from small functions. */
export const chapter1: Lesson[] = [
  // ───────────────────────────────────────── 1. functions are values
  {
    id: "event-arena-1-first-class",
    title: "Functions are values",
    minutes: 25,
    xp: 100,
    concepts: ["first-class functions", "callbacks", "arrow functions", "lookup tables", "Object.hasOwn"],
    learn: md`### A function is just another value

In JavaScript a function is a value, exactly like a number or a string. You can put it in a variable, store it in an array or an object, pass it to another function and return it from one. Languages that allow this call their functions **first-class**.

~~~js
function shout(text) {
  return text.toUpperCase() + "!";
}
const whisper = (text) => text.toLowerCase() + "...";

const voices = [shout, whisper];
voices.map((voice) => voice("Goal"));   // ["GOAL!", "goal..."]
~~~

There are three ways to write a function, and they all produce the same kind of value:

~~~js
function add(a, b) { return a + b; }          // declaration (hoisted: usable above this line)
const sub = function (a, b) { return a - b; }; // expression
const mul = (a, b) => a * b;                   // arrow function, implicit return
const pair = (a, b) => ({ a, b });             // returning an object literal needs parentheses
~~~

### Passing a function is not calling it

A pair of parentheses *calls* a function. Without them you are holding the function itself.

~~~js
setTimeout(announce, 100);     // hand announce to the timer: it calls it later
setTimeout(announce(), 100);   // BUG: calls announce now, hands its RESULT to the timer
~~~

When you see \`something(handler)\`, ask yourself: am I giving it the function, or the result of calling the function?

### Callbacks

A **callback** is a function you give to other code so that code can call it, now or later. The array methods you already know are callback machines:

~~~js
const goals = [2, 0, 3, 1];
goals.forEach((n, index) => console.log(index, n)); // runs the callback for each item
goals.map((n) => n * 2);                            // [4, 0, 6, 2]
goals.filter((n) => n > 0);                         // [2, 3, 1]
goals.find((n) => n > 2);                           // 3
goals.some((n) => n === 0);                         // true
goals.reduce((sum, n) => sum + n, 0);               // 6
~~~

You can write your own too. The caller decides *what* happens; your function decides *when* and *how often*:

~~~js
function repeat(times, callback) {
  for (let i = 0; i < times; i++) callback(i);
}
repeat(3, (i) => console.log("kick-off", i));
~~~

Callbacks receive extra arguments you may not expect. \`map\` calls its function with \`(item, index, array)\`, which is why \`["1", "2", "3"].map(parseInt)\` gives \`[1, NaN, NaN]\`: \`parseInt\` takes a second argument, the radix, and \`map\` fills it with the index. Wrap in an arrow when in doubt: \`.map((s) => parseInt(s, 10))\`.

### Lookup tables beat if/else chains

When the code to run depends on a *name*, store the functions in an object and look them up:

~~~js
const FORMATTERS = {
  goal: (e) => "GOAL by " + e.player,
  foul: (e) => "Foul by " + e.player,
};
FORMATTERS[event.type](event);
~~~

Adding a new event type means adding one entry, not editing a growing chain of \`if\`s. One trap: plain objects inherit properties. \`FORMATTERS["toString"]\` is not \`undefined\`, it is \`Object.prototype.toString\`! Check with **\`Object.hasOwn(FORMATTERS, type)\`** (own properties only) before you trust a key that came from outside your program.

### Errors in callbacks

Node.js made popular the **error-first callback**: \`callback(error, result)\`. The first argument is \`null\` on success or an \`Error\` on failure. You will see this convention in older APIs and in lesson 9, where it explains why Promises were invented.

### Common mistakes

- Calling the function when you meant to pass it (\`onClick(handler())\`).
- Forgetting that an arrow function that returns an object literal needs \`( )\` around the braces.
- Trusting \`obj[key]\` for a key that came from outside. Use \`Object.hasOwn\` or a \`Map\`.
- Passing a function that takes optional extra arguments straight to \`map\` (the \`parseInt\` trap).`,
    mission: md`The arena's big screen is dark. Matches are about to start, and each one will fire a stream of events: goals, fouls, timeouts, cards. Every event needs a line of commentary on the live feed.

You could write a long chain of ¦if (type === "goal")¦ checks. Instead, build a **table of formatter functions** keyed by event type, and a small ¦describeEvent¦ that looks the right one up. As soon as it works, the Live feed starts to scroll with your commentary.`,
    tasks: [
      "FORMATTERS: an object with an arrow function for goal, foul, timeout and card",
      "describeEvent(event): look the formatter up (own keys only) and fall back to \"Unknown event: <type>\"",
      "eachEvent(events, callback): your own forEach that passes (event, index)",
      "describeAll(events): turn a list of events into commentary lines with map",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 1: functions are values.
//
// An arena event looks like this:
//   { id: 7, type: "goal", team: "fal", teamName: "Falcons", player: "Ada Okoro", minute: 23 }
//   type is "goal" | "foul" | "timeout" | "card"; a card also has detail: "yellow" | "red"

// The six teams in the tournament (given).
const TEAM_NAMES = {
  fal: "Falcons",
  wol: "Wolves",
  orc: "Orcas",
  haw: "Hawks",
  lyn: "Lynx",
  bea: "Bears",
};

// The team's name for an event, even if the event only carries the short id (given).
const teamOf = (event) => event.teamName ?? TEAM_NAMES[event.team] ?? "Unknown team";

// One formatter per event type. Each takes the event and returns a line of commentary:
//   goal    -> GOAL! Ada Okoro scores for Falcons (23')
//   foul    -> Foul by Ada Okoro (Falcons) at 31'
//   timeout -> Timeout: Falcons at 45'
//   card    -> Yellow card: Ada Okoro (Falcons) at 52'     (Red card: ... when detail is "red")
const FORMATTERS = {};

// Look up the formatter for event.type and call it.
// Unknown type -> "Unknown event: penalty". No usable type at all -> "Unknown event".
function describeEvent(event) {
  // TODO
}

// Call callback(event, index) for every event, in order. Throw a TypeError if callback isn't a function.
function eachEvent(events, callback) {
  // TODO
}

// Return the commentary line for every event.
function describeAll(events) {
  // TODO
}
`,
    solutionAdd: js`// The six teams in the tournament.
const TEAM_NAMES = {
  fal: "Falcons",
  wol: "Wolves",
  orc: "Orcas",
  haw: "Hawks",
  lyn: "Lynx",
  bea: "Bears",
};

// The team's name for an event, even if the event only carries the short id.
const teamOf = (event) => event.teamName ?? TEAM_NAMES[event.team] ?? "Unknown team";

const FORMATTERS = {
  goal: (e) => ¦GOAL! \${e.player} scores for \${teamOf(e)} (\${e.minute}')¦,
  foul: (e) => ¦Foul by \${e.player} (\${teamOf(e)}) at \${e.minute}'¦,
  timeout: (e) => ¦Timeout: \${teamOf(e)} at \${e.minute}'¦,
  card: (e) => ¦\${e.detail === "red" ? "Red" : "Yellow"} card: \${e.player} (\${teamOf(e)}) at \${e.minute}'¦,
};

function describeEvent(event) {
  const type = event?.type;
  // Object.hasOwn: "toString" and "constructor" are inherited keys, not formatters
  if (typeof type !== "string") return "Unknown event";
  if (!Object.hasOwn(FORMATTERS, type)) return ¦Unknown event: \${type}¦;
  return FORMATTERS[type](event);
}

function eachEvent(events, callback) {
  if (typeof callback !== "function") throw new TypeError("eachEvent needs a callback function");
  for (let i = 0; i < events.length; i++) callback(events[i], i);
}

function describeAll(events) {
  // an explicit arrow: map would also pass (item, index, array) to describeEvent
  return events.map((event) => describeEvent(event));
}`,
    explanation:
      "FORMATTERS is data: a table from event type to function. describeEvent does the lookup with Object.hasOwn so inherited keys like \"toString\" can never be mistaken for a formatter, and it never throws on odd input because the live feed must keep running whatever arrives. eachEvent is the heart of every forEach: the caller supplies behaviour, you supply the loop. In describeAll the arrow wrapper keeps map's extra arguments away from describeEvent.",
    hints: [
      { id: "h1", title: "Shape of the table", content: "Each entry is a key with an arrow function: goal: (e) => `GOAL! ${e.player} scores for ${teamOf(e)} (${e.minute}')`. The other three follow the same pattern with the text from the comments." },
      { id: "h2", title: "Looking it up", content: "Check typeof event?.type === \"string\" first, then Object.hasOwn(FORMATTERS, type). If both are fine, return FORMATTERS[type](event). Otherwise return one of the two \"Unknown event\" messages." },
      { id: "h3", title: "The loops", content: "eachEvent: throw a TypeError if typeof callback !== \"function\", then for (let i = 0; i < events.length; i++) callback(events[i], i). describeAll: return events.map((event) => describeEvent(event))." },
    ],
    tests: [
      {
        id: "t1",
        description: "FORMATTERS has a function for every event type",
        assertionCode: T(js`for (const type of ["goal", "foul", "timeout", "card"]) {
  assert(typeof FORMATTERS[type] === "function", 'FORMATTERS needs an arrow function for "' + type + '"');
}`),
      },
      {
        id: "t2",
        description: "A goal is announced with the player, team and minute",
        assertionCode: T(js`assertEqual(describeEvent(_ev("goal", "fal", 23)), "GOAL! Ada Okoro scores for Falcons (23')", "goal commentary");
assertEqual(describeEvent(_ev("goal", "wol", 7, { player: "Cleo Marsh" })), "GOAL! Cleo Marsh scores for Wolves (7')", "a different team and player");`),
      },
      {
        id: "t3",
        description: "Fouls, timeouts and cards each have their own wording",
        assertionCode: T(js`assertEqual(describeEvent(_ev("foul", "fal", 31)), "Foul by Ada Okoro (Falcons) at 31'", "foul");
assertEqual(describeEvent(_ev("timeout", "wol", 45)), "Timeout: Wolves at 45'", "timeout");
assertEqual(describeEvent(_ev("card", "wol", 52)), "Yellow card: Ada Okoro (Wolves) at 52'", "a card with no detail is yellow");
assertEqual(describeEvent(_ev("card", "wol", 53, { detail: "red" })), "Red card: Ada Okoro (Wolves) at 53'", "a red card");`),
      },
      {
        id: "t4",
        description: "Unknown or inherited types fall back safely",
        assertionCode: T(js`assertEqual(describeEvent(_ev("penalty")), "Unknown event: penalty", "unknown type");
assertEqual(describeEvent(_ev("toString")), "Unknown event: toString", "toString is inherited, not a formatter");
assertEqual(describeEvent(_ev("constructor")), "Unknown event: constructor", "constructor is inherited too");
assertEqual(describeEvent({}), "Unknown event", "no type at all");
assertEqual(describeEvent(null), "Unknown event", "null must not crash the feed");
assertEqual(describeEvent(undefined), "Unknown event", "undefined must not crash the feed");`),
      },
      {
        id: "t5",
        description: "Events that only carry a team id still get the team's name",
        assertionCode: T(js`assertEqual(describeEvent({ type: "timeout", team: "orc", minute: 5 }), "Timeout: Orcas at 5'", "name looked up from TEAM_NAMES");
assertEqual(describeEvent({ type: "timeout", team: "zzz", minute: 5 }), "Timeout: Unknown team at 5'", "an id nobody knows");`),
      },
      {
        id: "t6",
        description: "eachEvent calls the callback with (event, index) in order",
        assertionCode: T(js`const seen = [];
const events = [_ev("goal"), _ev("foul"), _ev("card")];
const result = eachEvent(events, (event, index) => seen.push([event.type, index]));
assertEqual(seen, [["goal", 0], ["foul", 1], ["card", 2]], "callback calls");
assertEqual(result, undefined, "eachEvent returns nothing, like forEach");
let calls = 0;
eachEvent([], () => calls++);
assertEqual(calls, 0, "an empty list never calls the callback");
assertThrows(() => eachEvent(events, "not a function"), "TypeError", "a missing callback should be a TypeError");
assertThrows(() => eachEvent(events), "TypeError", "no callback at all");`),
      },
      {
        id: "t7",
        description: "describeAll maps every event to its line",
        assertionCode: T(js`const lines = describeAll([_ev("goal", "fal", 23), _ev("timeout", "wol", 45), _ev("nope")]);
assertEqual(lines, ["GOAL! Ada Okoro scores for Falcons (23')", "Timeout: Wolves at 45'", "Unknown event: nope"], "one line per event, same order");
assertEqual(describeAll([]), [], "no events, no lines");`),
      },
    ],
    unlocks: ["arena-feed"],
    checks: [
      {
        prompt: md`Which line asks the timer to call ¦announce¦ after 100 ms?`,
        question: {
          type: "choice",
          options: ["setTimeout(announce(), 100);", "setTimeout(announce, 100);", "setTimeout(announce)(100);", "setTimeout(¦announce¦, 100);"],
          answer: 1,
        },
        explanation: md`¦setTimeout(announce, 100)¦ hands over the function itself. ¦announce()¦ would call it immediately and give the timer whatever it returned (usually ¦undefined¦), so nothing would happen after 100 ms.`,
      },
      {
        prompt: md`What does ¦["1", "2", "3"].map(parseInt)¦ return?`,
        question: { type: "choice", options: ["[1, 2, 3]", "[1, NaN, NaN]", "[NaN, NaN, NaN]", "It throws a TypeError"], answer: 1 },
        explanation: md`¦map¦ calls its callback with ¦(item, index, array)¦, and ¦parseInt¦ treats the second argument as the number base. So it runs ¦parseInt("1", 0)¦, ¦parseInt("2", 1)¦, ¦parseInt("3", 2)¦. Wrapping it, ¦.map((s) => parseInt(s, 10))¦, makes the contract explicit.`,
      },
    ],
  },

  // ───────────────────────────────────────── 2. closures
  {
    id: "event-arena-2-closures",
    title: "Closures: functions with memory",
    minutes: 28,
    xp: 120,
    concepts: ["closures", "lexical scope", "private state", "factory functions", "loop pitfall"],
    learn: md`### A function remembers where it was written

JavaScript decides which variables a function can see by looking at **where the function is written**, not where it is called. This is **lexical scope**. A function can read the variables of the scopes around it.

A **closure** is what you get when such a function outlives the scope it was written in. The function carries those variables along:

~~~js
function makeCounter() {
  let count = 0;            // lives in makeCounter's scope...
  return () => ++count;     // ...and this arrow function keeps it alive
}

const a = makeCounter();
const b = makeCounter();
a(); a(); a();   // 3
b();             // 1: b has its own count
~~~

Each call to ¦makeCounter¦ creates a new scope with a new ¦count¦ and a new arrow function that closes over it. Nothing outside can touch ¦count¦, so it is **private state**, with no class and no ¦private¦ keyword.

### Factories: configure once, use many times

A function that returns a configured function is a **factory**. The configuration is captured by the closure:

~~~js
const makeTagger = (prefix) => (text) => prefix + " " + text;
const live = makeTagger("[LIVE]");
live("Goal!");   // "[LIVE] Goal!"
~~~

### An object whose state is hidden

Return an object of functions that share the same captured variables and you have the **module pattern**:

~~~js
function createStopwatch() {
  let startedAt = null;           // private
  return {
    start() { startedAt = Date.now(); },
    elapsed() { return startedAt === null ? 0 : Date.now() - startedAt; },
  };
}
~~~

Callers can use ¦start¦ and ¦elapsed¦, but there is no way to reach ¦startedAt¦ and corrupt it. When you hand out *views* of the state (a snapshot), hand out a **copy**, otherwise the caller could mutate your private data through it.

### Closures capture variables, not values

A closure sees the **current** value of a captured variable, not the value it had when the closure was created:

~~~js
let level = 1;
const show = () => level;
level = 5;
show();   // 5
~~~

This explains the most famous JavaScript puzzle:

~~~js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
// prints 3, 3, 3
~~~

¦var¦ is **function scoped**, so the whole loop shares *one* ¦i¦. By the time the timers fire, the loop has finished and ¦i¦ is 3. There are three fixes:

~~~js
// 1. let: every iteration gets its own fresh i (the modern fix)
for (let i = 0; i < 3; i++) setTimeout(() => console.log(i), 0);

// 2. a factory function: each call has its own parameter
const speak = (n) => () => console.log(n);
for (var j = 0; j < 3; j++) setTimeout(speak(j), 0);

// 3. an IIFE, the pre-2015 trick: (function (n) { ... })(i)
~~~

Use ¦const¦ and ¦let¦ and forget ¦var¦ exists. You still need to recognise the bug, because old code is full of it.

### Closures and memory

A closure keeps everything it captured alive for as long as the closure itself is reachable. A long-lived callback (an event listener, a timer) that captures a big array keeps that array in memory. Lesson 8 returns to this.

### Common mistakes

- Expecting a closure to freeze the value it saw (it sees the variable).
- Returning the private object itself instead of a copy.
- Using a closure for state that has many operations and needs to be inspected or extended: a class (lesson 5) is often clearer.`,
    mission: md`A scoreboard is the first thing fans look at, and it has one rule: nobody may change the score except by scoring. If the score were a plain object that any code can edit, a stray bug could set a team's goals to ¦undefined¦ in front of 40,000 people.

Hide the scores inside a closure. The only way in is ¦scoreboard.add()¦, which checks everything first. Once it works, the scoreboard lights up and counts every goal the match produces.`,
    tasks: [
      "makeCounter(step = 1): returns a function that counts up by step each call",
      "createScoreboard(teamIds): private scores with add, score, snapshot (a copy) and reset; bad input throws a RangeError",
      "scoreboard: one shared board for all six teams in TEAM_NAMES",
      "Fix makeTeamButtons: the var loop makes every button point at the same team",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 2: closures.

// A counter function: counter() returns step, then 2 * step, then 3 * step ...
// Every call to makeCounter gets its OWN count.
function makeCounter(step = 1) {
  // TODO
}

// A scoreboard with hidden scores:
//   board.add(teamId, points = 1)  adds points and returns that team's new score
//   board.score(teamId)            reads one team's score
//   board.snapshot()               a COPY of all scores, like { fal: 2, wol: 0 }
//   board.reset()                  sets every team back to 0
// Unknown team id          -> throw new RangeError("Unknown team: xyz")
// points not a positive whole number -> throw new RangeError("points must be a positive whole number")
function createScoreboard(teamIds) {
  // TODO
}

// One shared scoreboard that knows all six teams.
const scoreboard = undefined;

// One button per team; calling button() should return "Select Falcons", "Select Wolves", ...
// This version has the classic var bug: every button ends up pointing past the end of the list.
function makeTeamButtons(teamIds) {
  const buttons = [];
  for (var i = 0; i < teamIds.length; i++) {
    buttons.push(() => "Select " + TEAM_NAMES[teamIds[i]]);
  }
  return buttons;
}
`,
    solutionAdd: js`function makeCounter(step = 1) {
  let total = 0;
  return () => (total += step);
}

function createScoreboard(teamIds) {
  const scores = new Map(teamIds.map((id) => [id, 0]));

  const requireTeam = (teamId) => {
    if (!scores.has(teamId)) throw new RangeError(¦Unknown team: \${teamId}¦);
  };

  return {
    add(teamId, points = 1) {
      requireTeam(teamId);
      if (!Number.isInteger(points) || points < 1) throw new RangeError("points must be a positive whole number");
      scores.set(teamId, scores.get(teamId) + points);
      return scores.get(teamId);
    },
    score(teamId) {
      requireTeam(teamId);
      return scores.get(teamId);
    },
    snapshot() {
      return Object.fromEntries(scores);
    },
    reset() {
      for (const id of scores.keys()) scores.set(id, 0);
    },
  };
}

const scoreboard = createScoreboard(Object.keys(TEAM_NAMES));

function makeTeamButtons(teamIds) {
  // let gives every iteration its own id, so each arrow function closes over a different one
  return teamIds.map((id) => () => "Select " + TEAM_NAMES[id]);
}`,
    explanation:
      "makeCounter and createScoreboard keep their state in variables that only the returned functions can see: that is what a closure is. snapshot() builds a new object every time so callers can never reach the private Map. Validation lives in the closure too, so every route into the data goes through the same checks. For the buttons, mapping over the ids gives each arrow function its own id parameter, which is the factory-function fix for the var-in-a-loop bug.",
    hints: [
      { id: "h1", title: "makeCounter", content: "Declare let total = 0 inside makeCounter, then return an arrow function that does total += step and returns the new total. Each call to makeCounter creates a new total." },
      { id: "h2", title: "The scoreboard", content: "Keep a Map from team id to score inside createScoreboard: new Map(teamIds.map((id) => [id, 0])). Return an object whose methods use it. snapshot() can return Object.fromEntries(scores), which is a fresh object." },
      { id: "h3", title: "The buttons", content: "Replace the var loop: return teamIds.map((id) => () => \"Select \" + TEAM_NAMES[id]). Each call of the map callback has its own id. For scoreboard, call createScoreboard(Object.keys(TEAM_NAMES))." },
    ],
    tests: [
      {
        id: "t1",
        description: "makeCounter counts up by its step",
        assertionCode: T(js`const goals = makeCounter();
assertEqual([goals(), goals(), goals()], [1, 2, 3], "default step is 1");
const fives = makeCounter(5);
assertEqual([fives(), fives()], [5, 10], "step 5");
assertEqual(goals(), 4, "using another counter must not disturb the first one");
assertEqual(typeof goals, "function", "makeCounter returns a function");`),
      },
      {
        id: "t2",
        description: "A scoreboard adds, reads and snapshots scores",
        assertionCode: T(js`const board = createScoreboard(["fal", "wol"]);
assertEqual(board.add("fal"), 1, "add defaults to one point and returns the new score");
assertEqual(board.add("fal", 2), 3, "add(team, 2)");
assertEqual(board.score("fal"), 3, "score() reads the total");
assertEqual(board.score("wol"), 0, "teams start at 0");
assertEqual(board.snapshot(), { fal: 3, wol: 0 }, "snapshot");
const other = createScoreboard(["fal"]);
assertEqual(other.score("fal"), 0, "two boards must not share scores");`),
      },
      {
        id: "t3",
        description: "The scores are private and snapshot() is a copy",
        assertionCode: T(js`const board = createScoreboard(["fal", "wol"]);
board.add("wol", 2);
const snap = board.snapshot();
snap.wol = 99;
snap.fal = 99;
assertEqual(board.snapshot(), { fal: 0, wol: 2 }, "changing a snapshot must not change the board");
assertEqual(Object.keys(board).sort(), ["add", "reset", "score", "snapshot"], "the board should expose only add, score, snapshot and reset");`),
      },
      {
        id: "t4",
        description: "Bad input throws a RangeError and changes nothing",
        assertionCode: T(js`const board = createScoreboard(["fal", "wol"]);
assertThrows(() => board.add("xyz"), "Unknown team: xyz", "unknown team");
assertThrows(() => board.score("xyz"), "RangeError", "reading an unknown team");
for (const bad of [0, -1, 1.5, "2", NaN]) {
  assertThrows(() => board.add("fal", bad), "points must be a positive whole number", "points " + String(bad));
}
assertEqual(board.snapshot(), { fal: 0, wol: 0 }, "failed calls must leave the scores untouched");`),
      },
      {
        id: "t5",
        description: "reset() sets every team back to 0",
        assertionCode: T(js`const board = createScoreboard(["fal", "wol"]);
board.add("fal", 3);
board.add("wol", 1);
board.reset();
assertEqual(board.snapshot(), { fal: 0, wol: 0 }, "all zero after reset");
assertEqual(board.add("fal"), 1, "counting starts again from zero");`),
      },
      {
        id: "t6",
        description: "scoreboard is one shared board with all six teams",
        assertionCode: T(js`assert(scoreboard && typeof scoreboard.add === "function", "scoreboard should be created with createScoreboard(...)");
assertEqual(Object.keys(scoreboard.snapshot()).sort(), ["bea", "fal", "haw", "lyn", "orc", "wol"], "all six team ids");
scoreboard.add("lyn", 2);
assertEqual(scoreboard.score("lyn"), 2, "the shared board counts");
scoreboard.reset();
assertEqual(scoreboard.score("lyn"), 0, "and resets");`),
      },
      {
        id: "t7",
        description: "Every team button remembers its own team",
        assertionCode: T(js`const buttons = makeTeamButtons(["fal", "wol", "orc"]);
assertEqual(buttons.map((b) => b()), ["Select Falcons", "Select Wolves", "Select Orcas"], "each button names its own team (var shares one i)");
assertEqual(buttons[2](), "Select Orcas", "calling out of order still works");
assertEqual(makeTeamButtons([]), [], "no teams, no buttons");`),
      },
    ],
    unlocks: ["arena-scoreboard"],
    checks: [
      {
        prompt: md`What does this print?

~~~js
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}
~~~`,
        question: { type: "choice", options: ["0 1 2", "3 3 3", "undefined undefined undefined", "Nothing: setTimeout needs a function name"], answer: 1 },
        explanation: md`¦var¦ creates one ¦i¦ for the whole loop. The callbacks run after the loop has finished, when that single ¦i¦ is 3. Declare it with ¦let¦ and each iteration gets its own ¦i¦, so you would see ¦0 1 2¦.`,
      },
      {
        prompt: md`Which statement about closures is true?`,
        question: {
          type: "choice",
          options: [
            "A closure copies the values of the outer variables when it is created",
            "A closure keeps access to the outer variables themselves, even after the outer function has returned",
            "Only arrow functions can be closures",
            "A closure makes the outer variables public",
          ],
          answer: 1,
        },
        explanation: md`A closure holds on to the *variables* (not copies of their values), so it sees later changes, and the variables stay alive while the closure does. That is also what makes them private: only the closure's functions can reach them.`,
      },
    ],
  },

  // ───────────────────────────────────────── 3. this, arrows, bind
  {
    id: "event-arena-3-this",
    title: "this, arrow functions and bind",
    minutes: 28,
    xp: 120,
    concepts: ["this", "arrow functions", "bind", "call", "apply", "method borrowing"],
    learn: md`### this depends on how a function is called

Inside a function, ¦this¦ is a hidden parameter. Its value is decided **at the call site**, not where the function was written:

~~~js
const team = {
  name: "Falcons",
  hello() { return "We are " + this.name; },
};

team.hello();            // "We are Falcons": called as a method, this is team
const loose = team.hello;
loose();                 // this is NOT team any more
~~~

The rules, in the order JavaScript applies them:

1. ¦new Thing()¦: ¦this¦ is the brand-new object.
2. ¦fn.call(obj)¦, ¦fn.apply(obj)¦ or a ¦bind¦-ed function: ¦this¦ is the object you chose.
3. ¦obj.method()¦: ¦this¦ is ¦obj¦, the thing left of the dot.
4. A plain call ¦fn()¦: ¦this¦ is ¦undefined¦ in strict mode (classes and modules are always strict) or the global object in sloppy mode.
5. **Arrow functions have no ¦this¦ of their own.** They use the ¦this¦ of the code around them, forever.

### The classic bug: a method that lost its object

Passing a method as a callback hands over the *function*, not the object it was attached to:

~~~js
setTimeout(team.hello, 100);        // this is lost when the timer calls it
[1, 2].forEach(team.hello);         // same problem
~~~

There are three fixes, and you should know when to use each:

~~~js
setTimeout(() => team.hello(), 100);          // 1. wrap in an arrow (explicit and clear)
setTimeout(team.hello.bind(team), 100);       // 2. bind: returns a copy with this fixed
const hello = team.hello.bind(team);          //    handy to store once and pass around
~~~

¦bind¦ returns a **new function**. A bound function cannot be re-bound: its ¦this¦ is locked.

### Arrow functions inside methods

Arrow functions are perfect for callbacks inside a method, because they keep the method's ¦this¦:

~~~js
const clock = {
  seconds: 0,
  run() {
    // an arrow: this is the clock. A function(){} here would have its own this.
    setInterval(() => this.seconds++, 1000);
  },
};
~~~

The reverse is a trap: do not use an arrow function *as* the method itself (¦tick: () => this.seconds++¦). There ¦this¦ is whatever surrounds the object literal, which is not the object. Arrows also have no ¦arguments¦ object and cannot be used with ¦new¦.

### call and apply

¦call¦ and ¦apply¦ invoke a function immediately with a chosen ¦this¦. ¦call¦ takes arguments one by one, ¦apply¦ takes them as an array:

~~~js
function line(prefix) { return prefix + ": " + this.name; }

line.call({ name: "Wolves" }, "Table");     // "Table: Wolves"
line.apply({ name: "Orcas" }, ["Table"]);   // "Table: Orcas"
Math.max.apply(null, [3, 9, 4]);            // 9 (the old way to spread an array into arguments)
Math.max(...[3, 9, 4]);                     // 9 (modern spread does the same)
~~~

This lets one object **borrow** a method that was written for another, as long as it has the properties the method reads (duck typing, lesson 6).

### Common mistakes

- Passing ¦obj.method¦ as a callback and wondering why ¦this.something¦ is ¦undefined¦.
- Writing an object method as an arrow function.
- Using ¦function(){}¦ for a callback inside a method and losing ¦this¦ (use an arrow).
- Expecting ¦bind¦ to change the original function: it returns a new one.`,
    mission: md`Every match needs a clock. The clock is an object that counts seconds, and other parts of the system will hold onto its ¦tick¦ method and call it later: from a timer, from a loop, from the scene itself. If ¦this¦ goes missing on the way, the clock silently stops counting.

Build the clock so it survives being handed around, and the scoreboard header starts showing a live ¦MM:SS¦.`,
    tasks: [
      "matchClock: an object whose tick(), display() and reset() use this.seconds",
      "matchClock.run(everyMs): start a setInterval whose arrow callback keeps this; return a stop function",
      "tickClock: matchClock.tick bound to the clock, safe to pass around as a callback",
      "summaryOf(team) with call(), and maxScore(scores) with apply()",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 3: this, arrow functions, bind, call and apply.

const matchClock = {
  seconds: 0,

  // Add seconds (default 1) and return the new total.
  // A negative or non-numeric amount -> throw new RangeError("seconds must be a number of 0 or more")
  tick(seconds = 1) {
    // TODO
  },

  // The elapsed time as "MM:SS", both parts padded with zeros: 75 seconds -> "01:15"
  display() {
    // TODO
  },

  // Back to zero.
  reset() {
    // TODO
  },

  // Tick once per everyMs (default 1000) using setInterval, and return a function that stops the clock.
  // Inside the interval callback, this must still be the clock.
  run(everyMs = 1000) {
    // TODO
  },
};

// A version of matchClock.tick that still works when it is passed around as a plain callback.
const tickClock = undefined;

// A function that reads this.name and this.points. It is written once and borrowed by teams.
function teamLine(prefix) {
  return prefix + ": " + this.name + " on " + this.points + " points";
}

// summaryOf({ name: "Falcons", points: 7 }) -> "Table: Falcons on 7 points"
// Use teamLine.call(...). The optional prefix replaces "Table".
function summaryOf(team, prefix = "Table") {
  // TODO
}

// The biggest number in an array, using Math.max with apply (not a loop).
function maxScore(scores) {
  // TODO
}
`,
    solutionAdd: js`const matchClock = {
  seconds: 0,

  tick(seconds = 1) {
    if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds < 0) {
      throw new RangeError("seconds must be a number of 0 or more");
    }
    this.seconds += seconds;
    return this.seconds;
  },

  display() {
    const minutes = Math.floor(this.seconds / 60);
    const rest = Math.floor(this.seconds % 60);
    return ¦\${String(minutes).padStart(2, "0")}:\${String(rest).padStart(2, "0")}¦;
  },

  reset() {
    this.seconds = 0;
  },

  run(everyMs = 1000) {
    // an arrow function: this stays the clock, even though setInterval calls it later
    const timer = setInterval(() => this.tick(1), everyMs);
    return () => clearInterval(timer);
  },
};

// bind returns a copy of tick whose this is locked to matchClock
const tickClock = matchClock.tick.bind(matchClock);

function teamLine(prefix) {
  return prefix + ": " + this.name + " on " + this.points + " points";
}

function summaryOf(team, prefix = "Table") {
  return teamLine.call(team, prefix);
}

function maxScore(scores) {
  return Math.max.apply(null, scores);
}`,
    explanation:
      "tick, display and reset are ordinary methods: when you call matchClock.tick(), this is the clock. run() uses an arrow function for the interval callback so this is still the clock when the timer fires. tickClock is a bound copy of tick: you can pass it to forEach, store it in another object or hand it to the scene, and this stays locked to the clock. summaryOf borrows teamLine for a plain object with call, and maxScore spreads an array into Math.max's arguments with apply.",
    hints: [
      { id: "h1", title: "The methods", content: "tick: validate the amount, then this.seconds += seconds and return this.seconds. display: Math.floor(this.seconds / 60) for minutes, this.seconds % 60 for seconds, each turned into text with String(n).padStart(2, \"0\"). reset: this.seconds = 0." },
      { id: "h2", title: "run and bind", content: "In run: const timer = setInterval(() => this.tick(1), everyMs); then return () => clearInterval(timer). For the bound copy: const tickClock = matchClock.tick.bind(matchClock)." },
      { id: "h3", title: "call and apply", content: "summaryOf: return teamLine.call(team, prefix). maxScore: return Math.max.apply(null, scores). The first argument of call/apply is the value for this (null is fine when the function ignores it)." },
    ],
    tests: [
      {
        id: "t1",
        description: "tick adds seconds and returns the total",
        assertionCode: T(js`matchClock.reset();
assertEqual(matchClock.tick(), 1, "default is one second");
assertEqual(matchClock.tick(74), 75, "tick(74)");
assertEqual(matchClock.seconds, 75, "the clock stores its seconds");
matchClock.reset();`),
      },
      {
        id: "t2",
        description: "display shows MM:SS with zero padding",
        assertionCode: T(js`matchClock.reset();
assertEqual(matchClock.display(), "00:00", "starts at 00:00");
matchClock.tick(75);
assertEqual(matchClock.display(), "01:15", "75 seconds");
matchClock.tick(60 * 90);
assertEqual(matchClock.display(), "91:15", "over ninety minutes keeps counting");
matchClock.reset();
assertEqual(matchClock.display(), "00:00", "reset goes back to zero");`),
      },
      {
        id: "t3",
        description: "tick rejects negative or non-numeric amounts",
        assertionCode: T(js`matchClock.reset();
assertThrows(() => matchClock.tick(-5), "seconds must be a number of 0 or more", "negative");
assertThrows(() => matchClock.tick("10"), "RangeError", "a string is not a number");
assertThrows(() => matchClock.tick(NaN), "RangeError", "NaN");
assertEqual(matchClock.seconds, 0, "a rejected tick must not change the clock");`),
      },
      {
        id: "t4",
        description: "tickClock keeps working when it is passed around as a callback",
        assertionCode: T(js`matchClock.reset();
assert(typeof tickClock === "function", "tickClock should be matchClock.tick.bind(matchClock)");
tickClock(30);
assertEqual(matchClock.seconds, 30, "calling the bound function ticks the real clock");
[5, 10].forEach(tickClock);
assertEqual(matchClock.seconds, 45, "forEach passes each number as the seconds");
const holder = { tick: tickClock };
holder.tick(15);
assertEqual(matchClock.seconds, 60, "a bound function ignores the object it is called on");
matchClock.reset();`),
      },
      {
        id: "t5",
        description: "run() ticks once per interval and returns a stop function",
        assertionCode: T(js`matchClock.reset();
const stop = matchClock.run(1000);
assertEqual(typeof stop, "function", "run() must return a function that stops the clock");
await sim.tick(3500);
assertEqual(matchClock.seconds, 3, "three full seconds have passed (this must still be the clock inside setInterval)");
stop();
await sim.tick(5000);
assertEqual(matchClock.seconds, 3, "after stop() the clock stays put");
const fast = matchClock.run(250);
await sim.tick(1000);
fast();
assertEqual(matchClock.seconds, 7, "run(250) ticks four times per second");
matchClock.reset();`),
      },
      {
        id: "t6",
        description: "summaryOf borrows teamLine with call()",
        assertionCode: T(js`assertEqual(summaryOf({ name: "Falcons", points: 7 }), "Table: Falcons on 7 points", "default prefix");
assertEqual(summaryOf({ name: "Wolves", points: 2 }, "Group A"), "Group A: Wolves on 2 points", "custom prefix");
assertEqual(summaryOf({ name: "Orcas", points: 0 }), "Table: Orcas on 0 points", "zero points still prints");`),
      },
      {
        id: "t7",
        description: "maxScore finds the biggest number",
        assertionCode: T(js`assertEqual(maxScore([3, 9, 4]), 9, "biggest of three");
assertEqual(maxScore([-2, -8]), -2, "negative numbers");
assertEqual(maxScore([5]), 5, "one score");
assertEqual(maxScore([]), -Infinity, "no scores follows Math.max()");`),
      },
    ],
    unlocks: ["arena-clock"],
    checks: [
      {
        prompt: md`~~~js
const clock = { seconds: 0, tick() { this.seconds++; } };
setTimeout(clock.tick, 100);
~~~
After the timer has fired, what is ¦clock.seconds¦?`,
        question: {
          type: "choice",
          options: ["1", "0: tick ran, but with a different this", "undefined", "The timer throws because tick is not bound"],
          answer: 1,
        },
        explanation: md`¦setTimeout¦ received the bare function, so when it calls ¦tick¦ there is no ¦clock¦ in front of it and ¦this¦ is not the clock. The increment lands somewhere else (the global object in sloppy mode, or it throws in strict mode) and ¦clock.seconds¦ stays 0. Fix it with ¦clock.tick.bind(clock)¦ or ¦() => clock.tick()¦.`,
      },
      {
        prompt: md`Which of these does an arrow function NOT have of its own?`,
        question: { type: "choice", options: ["Parameters", "A return value", "this", "A closure over outer variables"], answer: 2 },
        explanation: md`An arrow function takes ¦this¦ from the code around it (and has no ¦arguments¦ either). That is exactly why it is the right tool for callbacks inside methods, and the wrong tool for the method itself.`,
      },
    ],
  },

  // ───────────────────────────────────────── 4. higher-order functions & composition
  {
    id: "event-arena-4-higher-order",
    title: "Higher-order functions and composition",
    minutes: 28,
    xp: 130,
    concepts: ["higher-order functions", "predicates", "composition", "pipe", "partial application", "once"],
    learn: md`### Functions that take or return functions

A **higher-order function** is a function that takes a function as an argument, returns a function, or both. You have used them since lesson 1 (¦map¦, ¦filter¦) and written some in lesson 2 (¦makeCounter¦). This lesson is about using them on purpose, to build big behaviour out of small, boring pieces.

### Predicate factories

A **predicate** is a function that answers yes or no. Instead of writing a new function for every question, write a function that *makes* predicates:

~~~js
const isType = (type) => (event) => event.type === type;
const minuteAtLeast = (m) => (event) => event.minute >= m;

events.filter(isType("goal"));
events.some(minuteAtLeast(85));
~~~

### Combinators

Now combine predicates into new predicates. These helpers take functions and return a function, which is what makes them composable:

~~~js
const allOf = (...preds) => (x) => preds.every((p) => p(x));
const anyOf = (...preds) => (x) => preds.some((p) => p(x));
const not   = (pred) => (x) => !pred(x);

const lateGoal = allOf(isType("goal"), minuteAtLeast(80));
~~~

A complicated rule becomes a sentence you can read. Notice the edge cases: ¦every¦ of nothing is ¦true¦ and ¦some¦ of nothing is ¦false¦, so ¦allOf()¦ accepts everything and ¦anyOf()¦ accepts nothing.

### Composition

**Composition** chains functions so the output of one feeds the next. Two flavours:

~~~js
const pipe    = (...fns) => (input) => fns.reduce((value, fn) => fn(value), input);        // left to right
const compose = (...fns) => (input) => fns.reduceRight((value, fn) => fn(value), input);  // right to left

const inc = (n) => n + 1;
const dbl = (n) => n * 2;
pipe(inc, dbl)(5);      // 12: inc first, then dbl
compose(inc, dbl)(5);   // 11: dbl first, then inc (like maths: inc(dbl(5)))
~~~

¦pipe¦ reads in the order things happen, so prefer it. Each step should be a **pure function** (same input, same output, no side effects) so the pipeline is easy to test and reorder.

### Partial application

Fixing some arguments of a function in advance gives you a smaller function:

~~~js
const partial = (fn, ...preset) => (...rest) => fn(...preset, ...rest);
const add = (a, b, c) => a + b + c;
const addTen = partial(add, 4, 6);
addTen(5);   // 15
~~~

(¦bind¦ can do this too: ¦add.bind(null, 4, 6)¦.) **Currying** is the related idea of turning ¦f(a, b, c)¦ into ¦f(a)(b)(c)¦; our predicate factories are curried by hand.

### Wrapping behaviour: once

A function can wrap another one and change *how* it runs. ¦once¦ lets the inner function run a single time and replays its result afterwards. The same shape gives you ¦memoize¦, ¦debounce¦ (lesson 12), ¦retry¦ and logging wrappers:

~~~js
function once(fn) {
  let called = false;
  let result;
  return function (...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  };
}
~~~

It is a closure (lesson 2) that remembers whether it has run, and it uses ¦apply¦ to pass on ¦this¦ (lesson 3). Everything you learned so far is working together.

### Common mistakes

- Reading ¦compose¦ left to right (it runs right to left).
- Forgetting the extra call: ¦isType("goal")¦ is a predicate; ¦isType("goal")(event)¦ is a boolean.
- Putting side effects inside pipeline steps, so reordering them changes the result.
- Writing very deep point-free pipelines nobody can read. Name the middle steps.`,
    mission: md`A match produces dozens of events, but most are routine. The broadcast wants a **highlight reel**: every goal, every red card, and anything that happens in the last five minutes when the match is on a knife edge.

Don't write one giant ¦if¦. Build tiny predicate factories and combine them, so tomorrow's rule ("also penalty shootouts") is one more word. When ¦isHighlight¦ works, the reel appears next to the live feed.`,
    tasks: [
      "isType, byTeam, minuteAtLeast and hasDetail: predicate factories",
      "allOf, anyOf and not: combine predicates into new ones",
      "isHighlight (goal, red card, or minute 85+) and headline (describeEvent in capitals)",
      "pipe, compose, partial and once",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 4: higher-order functions and composition.

// Predicate factories. Each takes a setting and returns a function (event) => true/false.
//   isType("goal")(event)       event.type === "goal"
//   byTeam("fal")(event)        event.team === "fal"
//   minuteAtLeast(85)(event)    event.minute >= 85
//   hasDetail("red")(event)     event.detail === "red"
const isType = undefined;
const byTeam = undefined;
const minuteAtLeast = undefined;
const hasDetail = undefined;

// Combinators. Each takes predicates and returns a new predicate.
//   allOf(a, b)  true when EVERY predicate says yes (no predicates -> always true)
//   anyOf(a, b)  true when AT LEAST ONE says yes     (no predicates -> always false)
//   not(a)       the opposite answer
const allOf = undefined;
const anyOf = undefined;
const not = undefined;

// A highlight is a goal, OR a red card, OR anything at minute 85 or later. Build it from the pieces above.
const isHighlight = undefined;

// Composition helpers.
//   pipe(f, g, h)(x)     h(g(f(x)))  left to right
//   compose(f, g, h)(x)  f(g(h(x)))  right to left
//   partial(fn, a)(b)    fn(a, b)
//   once(fn)             runs fn the first time only; later calls return the first result
const pipe = undefined;
const compose = undefined;
const partial = undefined;
function once(fn) {
  // TODO
}

// describeEvent, then upper-case the line: use pipe.
const headline = undefined;
`,
    solutionAdd: js`const isType = (type) => (event) => event.type === type;
const byTeam = (teamId) => (event) => event.team === teamId;
const minuteAtLeast = (minute) => (event) => event.minute >= minute;
const hasDetail = (detail) => (event) => event.detail === detail;

const allOf = (...predicates) => (event) => predicates.every((predicate) => predicate(event));
const anyOf = (...predicates) => (event) => predicates.some((predicate) => predicate(event));
const not = (predicate) => (event) => !predicate(event);

// reads like the rule: a goal, or a red card, or the closing minutes
const isHighlight = anyOf(isType("goal"), allOf(isType("card"), hasDetail("red")), minuteAtLeast(85));

const pipe = (...fns) => (input) => fns.reduce((value, fn) => fn(value), input);
const compose = (...fns) => (input) => fns.reduceRight((value, fn) => fn(value), input);
const partial = (fn, ...preset) => (...rest) => fn(...preset, ...rest);

function once(fn) {
  let called = false;
  let result;
  return function (...args) {
    if (!called) {
      called = true;
      result = fn.apply(this, args);
    }
    return result;
  };
}

const headline = pipe(describeEvent, (line) => line.toUpperCase());`,
    explanation:
      "Each factory is one tiny rule, and anyOf/allOf/not are the glue, so isHighlight reads like the sentence in the brief. pipe uses reduce to thread a value through the functions in order; compose does the same from the right. once keeps called and result in a closure and forwards this and the arguments with apply, so it can wrap any function, including methods. Because everything is a function, adding a new rule means adding one more argument, not editing existing code.",
    hints: [
      { id: "h1", title: "Factories return functions", content: "const isType = (type) => (event) => event.type === type; The other three follow the same two-arrow shape with a different comparison." },
      { id: "h2", title: "Combinators", content: "allOf = (...predicates) => (event) => predicates.every((p) => p(event)). anyOf uses some. not = (predicate) => (event) => !predicate(event). Then isHighlight = anyOf(isType(\"goal\"), allOf(isType(\"card\"), hasDetail(\"red\")), minuteAtLeast(85))." },
      { id: "h3", title: "pipe and once", content: "pipe = (...fns) => (input) => fns.reduce((value, fn) => fn(value), input). compose uses reduceRight. once keeps let called = false and let result in the outer function and returns a function that runs fn.apply(this, args) only the first time." },
    ],
    tests: [
      {
        id: "t1",
        description: "Predicate factories build the right question",
        assertionCode: T(js`const goal = _ev("goal", "fal", 30);
assert(isType("goal")(goal) === true && isType("foul")(goal) === false, "isType compares event.type");
assert(byTeam("fal")(goal) === true && byTeam("wol")(goal) === false, "byTeam compares event.team");
assert(minuteAtLeast(30)(goal) === true && minuteAtLeast(31)(goal) === false, "minuteAtLeast is inclusive");
const red = _ev("card", "wol", 50, { detail: "red" });
assert(hasDetail("red")(red) === true && hasDetail("yellow")(red) === false && hasDetail("red")(goal) === false, "hasDetail compares event.detail");
assertEqual(typeof isType("goal"), "function", "a factory returns a predicate function");`),
      },
      {
        id: "t2",
        description: "allOf, anyOf and not combine predicates",
        assertionCode: T(js`const lateGoal = allOf(isType("goal"), minuteAtLeast(80));
assert(lateGoal(_ev("goal", "fal", 85)) === true, "a goal at 85 is a late goal");
assert(lateGoal(_ev("goal", "fal", 20)) === false, "an early goal is not");
assert(lateGoal(_ev("foul", "fal", 85)) === false, "a late foul is not");
const either = anyOf(isType("goal"), isType("card"));
assert(either(_ev("card")) === true && either(_ev("foul")) === false, "anyOf says yes if one predicate does");
const notGoal = not(isType("goal"));
assert(notGoal(_ev("foul")) === true && notGoal(_ev("goal")) === false, "not flips the answer");`),
      },
      {
        id: "t3",
        description: "Combinators handle the empty case like every and some",
        assertionCode: T(js`assert(allOf()(_ev("foul")) === true, "allOf() with no predicates accepts everything");
assert(anyOf()(_ev("goal")) === false, "anyOf() with no predicates accepts nothing");
const calls = [];
const spy = (name, answer) => (event) => { calls.push(name); return answer; };
allOf(spy("a", false), spy("b", true))(_ev("goal"));
assertEqual(calls, ["a"], "allOf should stop at the first no (every short-circuits)");`),
      },
      {
        id: "t4",
        description: "isHighlight: goals, red cards and the closing minutes",
        assertionCode: T(js`assert(isHighlight(_ev("goal", "fal", 3)) === true, "every goal is a highlight");
assert(isHighlight(_ev("card", "fal", 40, { detail: "red" })) === true, "a red card is a highlight");
assert(isHighlight(_ev("foul", "fal", 88)) === true, "anything from minute 85 is a highlight");
assert(isHighlight(_ev("timeout", "fal", 85)) === true, "minute 85 counts");
assert(isHighlight(_ev("foul", "fal", 40)) === false, "a routine foul is not");
assert(isHighlight(_ev("card", "fal", 40, { detail: "yellow" })) === false, "a yellow card is not");
assert(isHighlight(_ev("timeout", "fal", 84)) === false, "minute 84 is not late enough");`),
      },
      {
        id: "t5",
        description: "pipe runs left to right, compose right to left",
        assertionCode: T(js`const inc = (n) => n + 1;
const dbl = (n) => n * 2;
assertEqual(pipe(inc, dbl)(5), 12, "pipe(inc, dbl)(5) is dbl(inc(5))");
assertEqual(compose(inc, dbl)(5), 11, "compose(inc, dbl)(5) is inc(dbl(5))");
assertEqual(pipe()(7), 7, "an empty pipe returns its input");
assertEqual(compose()(7), 7, "an empty compose too");
assertEqual(pipe(String, (s) => s + "!")(42), "42!", "steps can change the type");`),
      },
      {
        id: "t6",
        description: "partial presets the first arguments",
        assertionCode: T(js`const add3 = (a, b, c) => a + b + c;
assertEqual(partial(add3, 4, 6)(5), 15, "two preset, one later");
assertEqual(partial(add3)(1, 2, 3), 6, "nothing preset");
assertEqual(partial(Math.max, 10)(3, 20), 20, "works with built-ins");`),
      },
      {
        id: "t7",
        description: "once runs the function a single time",
        assertionCode: T(js`let runs = 0;
const start = once((name) => { runs++; return "started " + name; });
assertEqual(start("a"), "started a", "first call returns the real result");
assertEqual(start("b"), "started a", "later calls replay the first result, ignoring new arguments");
assertEqual(runs, 1, "the wrapped function ran exactly once");
const obj = { n: 5, get: once(function () { return this.n; }) };
assertEqual(obj.get(), 5, "once must pass this through to the wrapped function");`),
      },
      {
        id: "t8",
        description: "headline is describeEvent in capitals",
        assertionCode: T(js`assertEqual(headline(_ev("goal", "fal", 23)), "GOAL! ADA OKORO SCORES FOR FALCONS (23')", "goal headline");
assertEqual(headline({ type: "wat" }), "UNKNOWN EVENT: WAT", "it reuses describeEvent's fallback");`),
      },
    ],
    unlocks: ["arena-highlights"],
    checks: [
      {
        prompt: md`¦const inc = (n) => n + 1; const dbl = (n) => n * 2;¦ What is ¦pipe(inc, dbl)(5)¦?`,
        question: { type: "number", answer: 12 },
        explanation: md`¦pipe¦ runs left to right: ¦inc(5)¦ is 6, then ¦dbl(6)¦ is 12. ¦compose(inc, dbl)(5)¦ would run ¦dbl¦ first and give 11.`,
      },
      {
        prompt: md`What does ¦allOf()¦ (no predicates at all) accept?`,
        question: { type: "choice", options: ["Nothing: it always returns false", "Everything: ¦every¦ on an empty list is true", "It throws because there is nothing to check", "Only events that have a type"], answer: 1 },
        explanation: md`¦[].every(fn)¦ is ¦true¦ (nothing failed) and ¦[].some(fn)¦ is ¦false¦ (nothing succeeded). Knowing the empty case keeps combinators predictable when a rule list is generated from configuration.`,
      },
    ],
  },
];
