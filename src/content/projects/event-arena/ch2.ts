import type { Lesson } from "@/engine/types";
import { js, md, T } from "./shared.ts";

/** Chapter 2: Objects with contracts. Classes with private state, and interfaces the JavaScript way. */
export const chapter2: Lesson[] = [
  // ───────────────────────────────────────── 5. classes
  {
    id: "event-arena-5-classes",
    title: "Classes: teams and matches",
    minutes: 32,
    xp: 140,
    concepts: ["class", "#private fields", "getters & setters", "static", "extends & super", "instanceof"],
    learn: md`### Classes bundle data and behaviour

Closures gave you private state in a function. A **class** is the other tool for the same job: a blueprint for objects that share methods and keep their own data.

~~~js
class Team {
  wins = 0;                       // a public field: every team gets its own wins

  constructor(name) {             // runs on new Team("Falcons")
    this.name = name;
  }

  win() {                         // a method: shared by all teams
    this.wins++;
    return this;
  }
}

const falcons = new Team("Falcons");
falcons.win().win();              // 2
falcons instanceof Team;          // true
~~~

Underneath, a class is the prototype system you may have heard about, with nicer syntax: the methods live once on ¦Team.prototype¦ and every instance inherits them. That is why ¦this¦ (lesson 3) matters: a method only knows which object it works on from the call. Forget ¦new¦ and you get an error.

### Private fields: #

A name starting with ¦#¦ is **truly private**: only code inside the class body can read it. Outside code gets a SyntaxError, and subclasses cannot see it either.

~~~js
class Counter {
  #count = 0;                     // private field
  increment() { this.#count++; return this.#count; }
  #log() { console.log(this.#count); }   // private methods exist too
}
new Counter().#count;             // SyntaxError
~~~

Private fields are the class version of the closure from lesson 2. An underscore (¦_count¦) is only a polite request; ¦#¦ is enforced by the language.

### Getters and setters

An **accessor** looks like a property but runs code. A getter with no setter is read-only, which makes derived values safe:

~~~js
class Team {
  #name = "";
  #won = 0; #drawn = 0;

  get points() { return this.#won * 3 + this.#drawn; }   // computed on demand

  get name() { return this.#name; }
  set name(value) {                                      // validate on the way in
    if (typeof value !== "string" || !value.trim()) throw new TypeError("name must be a non-empty string");
    this.#name = value.trim();
  }
}
~~~

Never store something you can compute (¦points¦ here); it can only get out of sync.

### Static members

¦static¦ belongs to the class itself, not to instances. Use it for factories, constants and helpers that do not need an instance:

~~~js
class Team {
  static fromId(id) { return new Team(id, TEAM_NAMES[id]); }
  static compare(a, b) { return b.points - a.points; }   // handy for array.sort
}
teams.sort(Team.compare);
~~~

### Inheritance: extends and super

¦extends¦ builds a specialised class on top of another. A subclass constructor **must call ¦super(...)¦ before it touches ¦this¦**. Methods can be overridden, and ¦super.method()¦ (or ¦super.getter¦) reaches the parent's version:

~~~js
class Match {
  get leader() { /* team with more goals, or null */ }
}
class KnockoutMatch extends Match {
  get winner() { return super.leader ?? this.shootoutWinner; }
}
~~~

Inheritance models "is a" (a knockout match *is a* match). It couples the two classes tightly, so reach for it when the relationship is real and prefer **composition** (an object that *has* another object) when it is merely convenient.

### Common mistakes

- Forgetting ¦super()¦ before using ¦this¦ in a subclass constructor (ReferenceError).
- Passing a method as a callback and losing ¦this¦ (lesson 3): bind it, or wrap it in an arrow.
- Storing a derived value in a field instead of a getter.
- Exposing mutable internals: return a copy of a private array or object, not the thing itself.
- Deep inheritance trees. Two levels is plenty; past that, compose.`,
    mission: md`Time for the league table. Matches finish, results arrive, and the table must order six teams by points, then goal difference, then goals scored. That is a lot of rules to scatter around loose objects.

Model the domain: a ¦Team¦ that tallies its own results behind private fields, a ¦Match¦ that counts goals, and a ¦KnockoutMatch¦ that refuses to end in a draw. A ¦standings()¦ function ties them together, and the table appears in the scene.`,
    tasks: [
      "class Team: #private tallies, a validated name setter, read-only getters (points, goalDifference...), recordResult, toRow, static fromId and compare",
      "class Match: goal(teamId), a score copy, leader, finish() and rules for finished matches",
      "class KnockoutMatch extends Match: shootout(), winner, and a finish() that insists on a winner",
      "standings(results): build a Team per id, record each result, sort with Team.compare",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 5: classes.

// A team's league record. Keep every tally in a #private field and expose it through a read-only getter.
class Team {
  // #won, #drawn, #lost, #goalsFor, #goalsAgainst, #name

  // new Team("fal", "Falcons"). id must be a non-empty string (TypeError otherwise).
  // name defaults to TEAM_NAMES[id], then to the id itself. Store the id as a public property: this.id.
  constructor(id, name) {
    // TODO
  }

  // get name / set name: the setter trims the text and throws a TypeError("name must be a non-empty string") for blanks.

  // recordResult(goalsFor, goalsAgainst): both must be whole numbers of 0 or more (RangeError otherwise).
  // Update won / drawn / lost and the goal tallies. Return this so calls can be chained.
  recordResult(goalsFor, goalsAgainst) {
    // TODO
  }

  // Read-only getters: played, won, drawn, lost, goalsFor, goalsAgainst,
  // goalDifference (for minus against) and points (3 per win, 1 per draw). Do not store these twice.

  // A plain row for the table:
  // { team: id, name, played, won, drawn, lost, goalsFor, goalsAgainst, goalDifference, points }
  toRow() {
    // TODO
  }

  // Team.fromId("fal") -> a Team named from TEAM_NAMES. Unknown id -> throw new RangeError("Unknown team: xyz")
  static fromId(id) {
    // TODO
  }

  // For array.sort: more points first, then goal difference, then goals for, then name A-Z.
  static compare(a, b) {
    // TODO
  }
}

// One match between two team ids.
class Match {
  // #home, #away, #goals, #finished

  // A team cannot play itself (throw new Error("A team cannot play itself")).
  constructor(homeId, awayId) {
    // TODO
  }

  // get home, get away, get isFinished

  // Count a goal for homeId or awayId and return the new score. Anything else -> RangeError("Not playing in this match: xyz").
  // After finish() no more goals: throw new Error("The match is finished").
  goal(teamId) {
    // TODO
  }

  // get score -> { home, away } (a new object every time)
  // get leader -> the id of the team ahead, or null when level

  // Mark the match finished and return { home, away, homeGoals, awayGoals }.
  finish() {
    // TODO
  }
}

// A match that cannot end level: a penalty shootout decides it.
class KnockoutMatch extends Match {
  // shootout(homeScore, awayScore): only allowed while the match is level (Error otherwise), and the
  //   shootout itself must have a winner (Error otherwise).
  // get winner: the leader, or the shootout winner, or null while undecided. Use super.leader.
  // finish(): throw new Error("A knockout match needs a winner") while undecided;
  //   otherwise return the normal result plus winner.
}

// results: [{ home: "fal", away: "wol", homeGoals: 3, awayGoals: 1 }, ...]
// Return one row per team in TEAM_NAMES (teams that haven't played have all zeros), best team first.
// Skip results naming unknown teams or with goals that are not whole numbers; never throw.
function standings(results) {
  // TODO
}
`,
    solutionAdd: js`class Team {
  #name;
  #won = 0;
  #drawn = 0;
  #lost = 0;
  #goalsFor = 0;
  #goalsAgainst = 0;

  constructor(id, name) {
    if (typeof id !== "string" || !id) throw new TypeError("Team needs an id");
    this.id = id;
    this.name = name ?? TEAM_NAMES[id] ?? id; // goes through the setter below
  }

  get name() {
    return this.#name;
  }
  set name(value) {
    if (typeof value !== "string" || !value.trim()) throw new TypeError("name must be a non-empty string");
    this.#name = value.trim();
  }

  recordResult(goalsFor, goalsAgainst) {
    for (const goals of [goalsFor, goalsAgainst]) {
      if (!Number.isInteger(goals) || goals < 0) throw new RangeError("goals must be whole numbers of 0 or more");
    }
    this.#goalsFor += goalsFor;
    this.#goalsAgainst += goalsAgainst;
    if (goalsFor > goalsAgainst) this.#won++;
    else if (goalsFor === goalsAgainst) this.#drawn++;
    else this.#lost++;
    return this;
  }

  get played() {
    return this.#won + this.#drawn + this.#lost;
  }
  get won() {
    return this.#won;
  }
  get drawn() {
    return this.#drawn;
  }
  get lost() {
    return this.#lost;
  }
  get goalsFor() {
    return this.#goalsFor;
  }
  get goalsAgainst() {
    return this.#goalsAgainst;
  }
  get goalDifference() {
    return this.#goalsFor - this.#goalsAgainst;
  }
  get points() {
    return this.#won * 3 + this.#drawn;
  }

  toRow() {
    return {
      team: this.id,
      name: this.name,
      played: this.played,
      won: this.won,
      drawn: this.drawn,
      lost: this.lost,
      goalsFor: this.goalsFor,
      goalsAgainst: this.goalsAgainst,
      goalDifference: this.goalDifference,
      points: this.points,
    };
  }

  static fromId(id) {
    if (!Object.hasOwn(TEAM_NAMES, id)) throw new RangeError(¦Unknown team: \${id}¦);
    return new Team(id, TEAM_NAMES[id]);
  }

  static compare(a, b) {
    return b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name);
  }
}

class Match {
  #home;
  #away;
  #goals;
  #finished = false;

  constructor(homeId, awayId) {
    if (homeId === awayId) throw new Error("A team cannot play itself");
    this.#home = homeId;
    this.#away = awayId;
    this.#goals = { [homeId]: 0, [awayId]: 0 };
  }

  get home() {
    return this.#home;
  }
  get away() {
    return this.#away;
  }
  get isFinished() {
    return this.#finished;
  }

  goal(teamId) {
    if (this.#finished) throw new Error("The match is finished");
    if (teamId !== this.#home && teamId !== this.#away) throw new RangeError(¦Not playing in this match: \${teamId}¦);
    this.#goals[teamId]++;
    return this.score;
  }

  get score() {
    return { home: this.#goals[this.#home], away: this.#goals[this.#away] };
  }

  get leader() {
    const { home, away } = this.score;
    if (home === away) return null;
    return home > away ? this.#home : this.#away;
  }

  finish() {
    this.#finished = true;
    const { home, away } = this.score;
    return { home: this.#home, away: this.#away, homeGoals: home, awayGoals: away };
  }
}

class KnockoutMatch extends Match {
  #shootout = null;

  shootout(homeScore, awayScore) {
    if (super.leader !== null) throw new Error("A shootout is only for matches that are level");
    if (homeScore === awayScore) throw new Error("A shootout must have a winner");
    this.#shootout = { home: homeScore, away: awayScore };
  }

  get winner() {
    if (super.leader !== null) return super.leader;
    if (!this.#shootout) return null;
    return this.#shootout.home > this.#shootout.away ? this.home : this.away;
  }

  finish() {
    if (this.winner === null) throw new Error("A knockout match needs a winner");
    return { ...super.finish(), winner: this.winner };
  }
}

function standings(results) {
  const table = new Map(Object.keys(TEAM_NAMES).map((id) => [id, Team.fromId(id)]));
  const isGoals = (n) => Number.isInteger(n) && n >= 0;
  for (const result of results ?? []) {
    const home = table.get(result?.home);
    const away = table.get(result?.away);
    if (!home || !away || !isGoals(result.homeGoals) || !isGoals(result.awayGoals)) continue;
    home.recordResult(result.homeGoals, result.awayGoals);
    away.recordResult(result.awayGoals, result.homeGoals);
  }
  return [...table.values()].sort(Team.compare).map((team) => team.toRow());
}`,
    explanation:
      "Team keeps every tally in a #private field and exposes read-only getters, so points and goalDifference are always computed from the truth and nobody can assign to them. The name setter validates on the way in, and the constructor uses it, so even the first name is checked. Match hides its goal counts and returns copies from score. KnockoutMatch only adds what is different: it asks super.leader whether the match is level, then consults the shootout. standings builds a fresh Team per id and uses Team.compare with sort, so the ordering rules live in one place next to the data they describe.",
    hints: [
      { id: "h1", title: "Team", content: "Declare #name, #won, #drawn, #lost, #goalsFor and #goalsAgainst at the top of the class. In the constructor set this.id and then this.name = name ?? TEAM_NAMES[id] ?? id so the setter validates it. Each getter is just get won() { return this.#won; } and points is this.#won * 3 + this.#drawn." },
      { id: "h2", title: "Match and Knockout", content: "Match keeps #goals as { [homeId]: 0, [awayId]: 0 } and goal() does this.#goals[teamId]++ after validating. score returns a new { home, away }. In KnockoutMatch, use super.leader inside winner, store the shootout in a #private field, and finish() returns { ...super.finish(), winner: this.winner }." },
      { id: "h3", title: "standings", content: "Start from new Map(Object.keys(TEAM_NAMES).map((id) => [id, Team.fromId(id)])). For each valid result call home.recordResult(homeGoals, awayGoals) and away.recordResult(awayGoals, homeGoals). Finish with [...table.values()].sort(Team.compare).map((team) => team.toRow()). Team.compare is b.points - a.points || b.goalDifference - a.goalDifference || ..." },
    ],
    tests: [
      {
        id: "t1",
        description: "Team tallies results into played, points and goal difference",
        assertionCode: T(js`const t = new Team("fal", "Falcons");
assertEqual([t.played, t.points, t.goalDifference], [0, 0, 0], "a new team has nothing yet");
t.recordResult(3, 1).recordResult(2, 2).recordResult(0, 1);
assertEqual([t.played, t.won, t.drawn, t.lost], [3, 1, 1, 1], "played/won/drawn/lost");
assertEqual([t.goalsFor, t.goalsAgainst, t.goalDifference], [5, 4, 1], "goals");
assertEqual(t.points, 4, "3 for the win plus 1 for the draw");
assert(t.recordResult(1, 0) === t, "recordResult returns this so calls can be chained");`),
      },
      {
        id: "t2",
        description: "Team keeps its tallies private and validates input",
        assertionCode: T(js`const t = new Team("wol");
assertEqual(t.name, "Wolves", "the name defaults to TEAM_NAMES[id]");
assertEqual(new Team("zzz").name, "zzz", "and to the id when nobody knows the team");
assertEqual(Object.keys(t), ["id"], "only id is a public own property: the tallies must be #private fields");
for (const name of ["points", "won", "goalDifference"]) {
  assert(Object.getOwnPropertyDescriptor(Team.prototype, name)?.get && !Object.getOwnPropertyDescriptor(Team.prototype, name).set, name + " should be a getter with no setter");
}
t.name = "  Wolves FC ";
assertEqual(t.name, "Wolves FC", "the setter trims");
assertThrows(() => { t.name = "   "; }, "name must be a non-empty string", "blank names");
assertThrows(() => new Team(""), "TypeError", "an empty id");
assertThrows(() => t.recordResult(-1, 0), "RangeError", "negative goals");
assertThrows(() => t.recordResult(1.5, 0), "RangeError", "fractions");
assertThrows(() => t.recordResult("2", 0), "RangeError", "text");
assertEqual(t.played, 0, "rejected results must not be counted");`),
      },
      {
        id: "t3",
        description: "toRow, Team.fromId and Team.compare",
        assertionCode: T(js`const t = Team.fromId("orc").recordResult(2, 0);
assertEqual(t.toRow(), { team: "orc", name: "Orcas", played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 2, goalsAgainst: 0, goalDifference: 2, points: 3 }, "toRow");
assertThrows(() => Team.fromId("xyz"), "Unknown team: xyz", "unknown id");
assertThrows(() => Team.fromId("toString"), "RangeError", "inherited keys are not teams");
const a = Team.fromId("fal").recordResult(1, 0);
const b = Team.fromId("wol").recordResult(3, 0);
const c = Team.fromId("bea").recordResult(1, 0);
const d = Team.fromId("haw").recordResult(2, 0).recordResult(0, 5);
const order = [a, b, c, d].sort(Team.compare).map((x) => x.id);
assertEqual(order, ["wol", "bea", "fal", "haw"], "points, then goal difference, then goals for, then name (Bears before Falcons)");`),
      },
      {
        id: "t4",
        description: "Match counts goals and knows its leader",
        assertionCode: T(js`const m = new Match("fal", "wol");
assertEqual(m.score, { home: 0, away: 0 }, "0-0 to start");
assertEqual(m.leader, null, "level means no leader");
assertEqual(m.goal("fal"), { home: 1, away: 0 }, "goal returns the new score");
m.goal("wol"); m.goal("wol");
assertEqual([m.score, m.leader], [{ home: 1, away: 2 }, "wol"], "away team ahead");
const copy = m.score; copy.home = 50;
assertEqual(m.score.home, 1, "score must return a copy");
assertEqual([m.home, m.away, m.isFinished], ["fal", "wol", false], "home/away/isFinished getters");
assertThrows(() => new Match("fal", "fal"), "A team cannot play itself", "same team");
assertThrows(() => m.goal("orc"), "Not playing in this match: orc", "a stranger scores");`),
      },
      {
        id: "t5",
        description: "A finished match returns its result and refuses more goals",
        assertionCode: T(js`const m = new Match("lyn", "bea");
m.goal("lyn"); m.goal("lyn"); m.goal("bea");
assertEqual(m.finish(), { home: "lyn", away: "bea", homeGoals: 2, awayGoals: 1 }, "result object");
assertEqual(m.isFinished, true, "isFinished after finish()");
assertThrows(() => m.goal("bea"), "The match is finished", "no goals after the whistle");
assertEqual(m.score, { home: 2, away: 1 }, "the score is frozen");`),
      },
      {
        id: "t6",
        description: "KnockoutMatch extends Match and needs a winner",
        assertionCode: T(js`const k = new KnockoutMatch("fal", "orc");
assert(k instanceof KnockoutMatch && k instanceof Match, "a KnockoutMatch is a Match");
assertEqual(k.winner, null, "level and no shootout yet");
assertThrows(() => k.finish(), "A knockout match needs a winner", "cannot finish level");
k.goal("orc");
assertEqual(k.winner, "orc", "the leader wins in normal time");
assertThrows(() => k.shootout(4, 3), "level", "a shootout is only for level matches");
assertEqual(k.finish(), { home: "fal", away: "orc", homeGoals: 0, awayGoals: 1, winner: "orc" }, "finish adds the winner");
const level = new KnockoutMatch("lyn", "bea");
level.goal("lyn"); level.goal("bea");
assertThrows(() => level.shootout(3, 3), "winner", "a tied shootout");
level.shootout(2, 4);
assertEqual(level.winner, "bea", "the shootout decides");
assertEqual(level.finish().winner, "bea", "and finish reports it");`),
      },
      {
        id: "t7",
        description: "standings builds a sorted table from results",
        assertionCode: T(js`const rows = standings([
  { home: "fal", away: "wol", homeGoals: 3, awayGoals: 1 },
  { home: "orc", away: "haw", homeGoals: 2, awayGoals: 2 },
  { home: "lyn", away: "fal", homeGoals: 0, awayGoals: 1 },
]);
assertEqual(rows.length, 6, "one row per team, even teams that haven't played");
assertEqual(rows.map((r) => r.team), ["fal", "haw", "orc", "bea", "lyn", "wol"], "order: points, goal difference, goals for, name (Hawks and Orcas are level, so A-Z decides)");
assertEqual(rows[0], { team: "fal", name: "Falcons", played: 2, won: 2, drawn: 0, lost: 0, goalsFor: 4, goalsAgainst: 1, goalDifference: 3, points: 6 }, "the leader's row");
assertEqual(rows.find((r) => r.team === "bea").played, 0, "Bears have not played");`),
      },
      {
        id: "t8",
        description: "standings skips bad results instead of crashing",
        assertionCode: T(js`const rows = standings([
  { home: "fal", away: "nobody", homeGoals: 1, awayGoals: 0 },
  { home: "fal", away: "wol", homeGoals: "3", awayGoals: 1 },
  { home: "fal", away: "wol", homeGoals: -1, awayGoals: 1 },
  null,
  { home: "orc", away: "haw", homeGoals: 1, awayGoals: 0 },
]);
assertEqual(rows.filter((r) => r.played > 0).map((r) => r.team).sort(), ["haw", "orc"], "only the valid result counts");
assertEqual(standings([]).every((r) => r.points === 0), true, "no results, all zeros");
assertEqual(standings(undefined).length, 6, "undefined results are treated as none");`),
      },
    ],
    unlocks: ["arena-standings"],
    checks: [
      {
        prompt: md`What happens when code outside the class runs ¦team.#won¦ (where ¦#won¦ is a private field)?`,
        question: { type: "choice", options: ["It returns the value, like any property", "It returns undefined", "It is a SyntaxError: private names can only be used inside the class", "It works, but only in strict mode"], answer: 2 },
        explanation: md`Private names are checked when the code is *parsed*. Outside the class body ¦team.#won¦ is not even valid syntax. That is the difference from the ¦_won¦ convention, which anyone can read and change.`,
      },
      {
        prompt: md`In a subclass constructor, what must happen before you use ¦this¦?`,
        question: { type: "choice", options: ["Nothing, ¦this¦ is ready immediately", "¦super(...)¦ must be called", "The parent's private fields must be copied", "¦new.target¦ must be checked"], answer: 1 },
        explanation: md`In a derived class the object is created by the parent constructor. Until ¦super(...)¦ has run there is no ¦this¦ yet, and touching it throws a ReferenceError.`,
      },
    ],
  },

  // ───────────────────────────────────────── 6. interfaces: duck typing, JSDoc, TypeScript
  {
    id: "event-arena-6-interfaces",
    title: "Contracts without interfaces",
    minutes: 30,
    xp: 140,
    concepts: ["duck typing", "abstract classes", "new.target", "JSDoc @typedef", "@implements", "TypeScript interface"],
    learn: md`### JavaScript has no interface keyword

In Java or C# an ¦interface¦ is a promise the compiler enforces: "any class that implements ¦Reporter¦ has these methods". JavaScript has no such keyword. It uses **duck typing**: if an object has the members you need, it is good enough. ("If it walks like a duck and quacks like a duck...")

~~~js
// anything with report() can join, no matter what class (if any) it came from
function feed(reporter, event) {
  reporter.report(event);
}
feed(new GoalReporter(), event);
feed({ report(e) { console.log(e.type); } }, event);   // a plain object works too
~~~

The flexibility is real: tests can pass tiny fake objects and you never need a base class just to say "I have this method". The price is that nothing stops a wrong object until it fails. So **check at the edges**, where objects come from outside your code.

### Checking a contract at runtime

Test for the *capability*, not the class:

~~~js
const isReporter = (x) =>
  x != null && typeof x.name === "string" && ["report", "summary"].every((m) => typeof x[m] === "function");

function register(x) {
  if (!isReporter(x)) throw new TypeError("Not a Reporter");   // fail early, with a message that says why
  list.push(x);
}
~~~

Do not use ¦instanceof¦ for this: it rejects the perfectly good plain object. JavaScript's own protocols work the same way: anything with a ¦[Symbol.iterator]()¦ method is *iterable* and works in ¦for...of¦ and spread (lesson 13), and anything with a ¦then¦ method is a *thenable* (lesson 10).

### Abstract base classes by convention

When several classes share code, a base class can hold it and declare what subclasses must provide. JavaScript cannot mark a class abstract, but ¦new.target¦ (the class used with ¦new¦) lets you forbid direct instances, and a method that throws says "implement me":

~~~js
class BaseReporter {
  constructor(name) {
    if (new.target === BaseReporter) throw new TypeError("BaseReporter is abstract");
    this.name = name;
  }
  report() { throw new Error(\`\${this.constructor.name} must implement report()\`); }
}
~~~

### Writing the contract down: JSDoc

A contract nobody can read is a rumour. **JSDoc** comments describe shapes, and editors such as VS Code use them to check your code, with no compiler, if you add ¦// @ts-check¦ at the top of the file:

~~~js
/**
 * @typedef {Object} ArenaEvent
 * @property {number} id
 * @property {"goal" | "foul" | "timeout" | "card"} type
 * @property {number} minute
 * @property {string} [player]    square brackets mean optional
 */

/**
 * @typedef {Object} Reporter
 * @property {string} name
 * @property {(event: ArenaEvent) => void} report
 * @property {() => object} summary
 */

/** @implements {Reporter} */
class GoalReporter { /* ... */ }

/**
 * @param {ArenaEvent[]} events
 * @returns {number}
 */
function countGoals(events) { /* ... */ }
~~~

### How TypeScript formalises this

TypeScript is JavaScript plus a type checker, and its ¦interface¦ is exactly the contract above, written as code:

~~~ts
interface Reporter {
  name: string;
  report(event: ArenaEvent): void;
  summary(): object;
}

class GoalReporter implements Reporter { /* the compiler checks every member */ }
const literal: Reporter = { name: "x", report() {}, summary: () => ({}) };  // fine: types are structural
~~~

TypeScript typing is **structural**, which is duck typing checked at compile time. Two things to remember: interfaces are **erased** when the code is compiled, so nothing about them exists at runtime, and a type can never prove what arrives from the network or a file. Keep the runtime checks (¦isReporter¦, validation) wherever data crosses into your program.

### Common mistakes

- Checking ¦instanceof¦ where you only need a capability.
- Trusting JSON from outside because "the type says so".
- Putting a base class in place when a plain object with the right methods would do.
- Letting an abstract method silently return ¦undefined¦ instead of throwing.`,
    mission: md`Now the broadcast wants a **stats desk**. Several kinds of statistician will watch the same stream of events: one counts goals, one counts fouls and cards, one counts timeouts, and next season someone will add a pass-completion counter you haven't heard of.

Define a ¦Reporter¦ contract (a name, ¦report(event)¦, ¦summary()¦ and ¦reset()¦), implement it three different ways, check it at the door with duck typing, and keep the registered reporters in a list the whole arena can feed.`,
    tasks: [
      "BaseReporter: abstract (new.target) with methods that throw until a subclass implements them",
      "GoalReporter and DisciplineReporter extend it; timeoutReporter is a plain object that satisfies the same contract",
      "isReporter / assertReporter: duck-typed check with a message that lists what is missing",
      "reporters registry: addReporter, removeReporter, reportAll, summaries, resetReporters",
    ],
    starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 6: contracts without interfaces.

/**
 * @typedef {Object} ArenaEvent
 * @property {number} id
 * @property {"goal" | "foul" | "timeout" | "card"} type
 * @property {string} team       short team id, like "fal"
 * @property {number} minute
 * @property {string} [player]
 * @property {"yellow" | "red"} [detail]   cards only
 * @property {number} [points]             goals only; missing means 1
 */

/**
 * The Reporter contract: anything with these members can join the stats desk.
 * @typedef {Object} Reporter
 * @property {string} name                  the key used in summaries()
 * @property {(event: ArenaEvent) => void} report
 * @property {() => object} summary         plain data, safe to hand out
 * @property {() => void} reset
 */

// The abstract base. new BaseReporter("x") throws a TypeError (use new.target).
// report(event), summary() and reset() throw new Error("<ClassName> must implement report()") etc.
class BaseReporter {
  constructor(name) {
    // TODO
  }
}

// Counts goals per team: summary() -> { fal: 2, wol: 1 }. A goal counts event.points, or 1 if missing.
// Keep the counts in a #private field and return a COPY from summary().
class GoalReporter extends BaseReporter {
  // TODO (name: "goals")
}

// summary() -> { fouls: { fal: 3 }, yellow: { wol: 1 }, red: { } }. A card without detail counts as yellow.
class DisciplineReporter extends BaseReporter {
  // TODO (name: "discipline")
}

// NOT a class: a plain object literal with name "timeouts", report(), summary() and reset().
// summary() -> { fal: 1, orc: 2 }  (timeouts called per team)
const timeoutReporter = undefined;

// Duck typing: a reporter has a string name and functions report, summary and reset.
function isReporter(candidate) {
  // TODO
}

// Return the candidate if it is a reporter. Otherwise throw a TypeError:
//   null or undefined      -> "Not a Reporter: got null"
//   missing members        -> "Not a Reporter: missing name, report()" (list name, report(), summary(), reset() in that order)
function assertReporter(candidate) {
  // TODO
}

// The registry the scene feeds.
const reporters = [];

// Validate with assertReporter, refuse a second reporter with the same name
// (RangeError: A reporter called "goals" is already registered), add it and return it.
function addReporter(reporter) {
  // TODO
}

// Remove by name; return true if something was removed.
function removeReporter(name) {
  // TODO
}

// Give the event to every reporter. One reporter throwing must not stop the others.
// Return { delivered, failed } counts.
function reportAll(event) {
  // TODO
}

// { goals: {...}, discipline: {...}, timeouts: {...} }: every reporter's summary under its name.
function summaries() {
  // TODO
}

// Reset every reporter.
function resetReporters() {
  // TODO
}

// Register the three built-in reporters here.
`,
    solutionAdd: js`class BaseReporter {
  constructor(name) {
    if (new.target === BaseReporter) throw new TypeError("BaseReporter is abstract: extend it");
    this.name = name;
  }
  report() {
    throw new Error(¦\${this.constructor.name} must implement report()¦);
  }
  summary() {
    throw new Error(¦\${this.constructor.name} must implement summary()¦);
  }
  reset() {
    throw new Error(¦\${this.constructor.name} must implement reset()¦);
  }
}

/** @implements {Reporter} */
class GoalReporter extends BaseReporter {
  #goals = {};
  constructor() {
    super("goals");
  }
  report(event) {
    if (event?.type !== "goal" || typeof event.team !== "string") return;
    this.#goals[event.team] = (this.#goals[event.team] ?? 0) + (event.points ?? 1);
  }
  summary() {
    return { ...this.#goals };
  }
  reset() {
    this.#goals = {};
  }
}

/** @implements {Reporter} */
class DisciplineReporter extends BaseReporter {
  #fouls = {};
  #yellow = {};
  #red = {};
  constructor() {
    super("discipline");
  }
  report(event) {
    if (typeof event?.team !== "string") return;
    const bump = (counts) => {
      counts[event.team] = (counts[event.team] ?? 0) + 1;
    };
    if (event.type === "foul") bump(this.#fouls);
    else if (event.type === "card") bump(event.detail === "red" ? this.#red : this.#yellow);
  }
  summary() {
    return { fouls: { ...this.#fouls }, yellow: { ...this.#yellow }, red: { ...this.#red } };
  }
  reset() {
    this.#fouls = {};
    this.#yellow = {};
    this.#red = {};
  }
}

/** @type {Reporter} no class needed: this object simply has the right members */
const timeoutReporter = {
  name: "timeouts",
  counts: {},
  report(event) {
    if (event?.type === "timeout" && typeof event.team === "string") {
      this.counts[event.team] = (this.counts[event.team] ?? 0) + 1;
    }
  },
  summary() {
    return { ...this.counts };
  },
  reset() {
    this.counts = {};
  },
};

const REPORTER_MEMBERS = ["report", "summary", "reset"];

function isReporter(candidate) {
  return candidate != null && typeof candidate.name === "string" && REPORTER_MEMBERS.every((member) => typeof candidate[member] === "function");
}

function assertReporter(candidate) {
  if (candidate == null) throw new TypeError(¦Not a Reporter: got \${candidate}¦);
  if (isReporter(candidate)) return candidate;
  const missing = [];
  if (typeof candidate.name !== "string") missing.push("name");
  for (const member of REPORTER_MEMBERS) {
    if (typeof candidate[member] !== "function") missing.push(¦\${member}()¦);
  }
  throw new TypeError(¦Not a Reporter: missing \${missing.join(", ")}¦);
}

const reporters = [];

function addReporter(reporter) {
  assertReporter(reporter);
  if (reporters.some((existing) => existing.name === reporter.name)) {
    throw new RangeError(¦A reporter called "\${reporter.name}" is already registered¦);
  }
  reporters.push(reporter);
  return reporter;
}

function removeReporter(name) {
  const index = reporters.findIndex((reporter) => reporter.name === name);
  if (index === -1) return false;
  reporters.splice(index, 1);
  return true;
}

function reportAll(event) {
  let delivered = 0;
  let failed = 0;
  for (const reporter of reporters) {
    try {
      reporter.report(event);
      delivered++;
    } catch (error) {
      failed++;
      console.error(¦Reporter "\${reporter.name}" failed: \${error.message}¦);
    }
  }
  return { delivered, failed };
}

function summaries() {
  return Object.fromEntries(reporters.map((reporter) => [reporter.name, reporter.summary()]));
}

function resetReporters() {
  for (const reporter of reporters) reporter.reset();
}

addReporter(new GoalReporter());
addReporter(new DisciplineReporter());
addReporter(timeoutReporter);`,
    explanation:
      "BaseReporter documents the contract and fails loudly when a subclass forgets a method (and cannot be created directly thanks to new.target). The two subclasses keep their counts private and return copies. timeoutReporter proves the point of duck typing: a plain object with the right members is just as good a Reporter as an instance of a class, so isReporter checks capabilities, not ancestry. The registry validates at the door with a precise message, isolates failures so one broken reporter cannot take the stats desk down, and composes the summaries by name.",
    hints: [
      { id: "h1", title: "Base and subclasses", content: "In BaseReporter's constructor: if (new.target === BaseReporter) throw new TypeError(...); this.name = name. The three methods throw new Error(`${this.constructor.name} must implement report()`). Subclasses call super(\"goals\") and keep counts in a #private object, returning { ...this.#goals } from summary()." },
      { id: "h2", title: "The plain object and the check", content: "timeoutReporter is an object literal: { name: \"timeouts\", counts: {}, report(event) {...}, summary() {...}, reset() {...} } using this.counts. isReporter: candidate != null && typeof candidate.name === \"string\" && [\"report\", \"summary\", \"reset\"].every((m) => typeof candidate[m] === \"function\")." },
      { id: "h3", title: "The registry", content: "assertReporter builds a missing array (name if typeof candidate.name !== \"string\", then \"report()\", \"summary()\", \"reset()\" for each member that isn't a function) and throws new TypeError(`Not a Reporter: missing ${missing.join(\", \")}`). reportAll wraps each reporter.report(event) in try/catch and counts delivered and failed. At the very end of your code call addReporter three times." },
    ],
    tests: [
      {
        id: "t1",
        description: "BaseReporter is abstract and its methods demand an override",
        assertionCode: T(js`assertThrows(() => new BaseReporter("x"), "TypeError", "the base class cannot be created directly");
class Lazy extends BaseReporter { constructor() { super("lazy"); } }
const lazy = new Lazy();
assertEqual(lazy.name, "lazy", "a subclass passes its name to super()");
assertThrows(() => lazy.report({}), "Lazy must implement report()", "report not overridden");
assertThrows(() => lazy.summary(), "Lazy must implement summary()", "summary not overridden");
assertThrows(() => lazy.reset(), "Lazy must implement reset()", "reset not overridden");`),
      },
      {
        id: "t2",
        description: "GoalReporter counts goals per team and returns copies",
        assertionCode: T(js`const r = new GoalReporter();
assert(r instanceof BaseReporter && r.name === "goals", "GoalReporter extends BaseReporter with the name goals");
r.report(_ev("goal", "fal"));
r.report(_ev("goal", "fal", 20, { points: 2 }));
r.report(_ev("goal", "wol"));
r.report(_ev("foul", "wol"));
r.report(null);
assertEqual(r.summary(), { fal: 3, wol: 1 }, "goals count their points, other events and junk are ignored");
const copy = r.summary(); copy.fal = 100;
assertEqual(r.summary().fal, 3, "summary() must return a copy");
r.reset();
assertEqual(r.summary(), {}, "reset clears the counts");
assertEqual(new GoalReporter().summary(), {}, "each reporter has its own counts");`),
      },
      {
        id: "t3",
        description: "DisciplineReporter counts fouls, yellow and red cards",
        assertionCode: T(js`const r = new DisciplineReporter();
assertEqual(r.name, "discipline", "name");
r.report(_ev("foul", "fal")); r.report(_ev("foul", "fal")); r.report(_ev("foul", "wol"));
r.report(_ev("card", "wol")); r.report(_ev("card", "wol", 40, { detail: "yellow" })); r.report(_ev("card", "fal", 41, { detail: "red" }));
r.report(_ev("goal", "fal"));
assertEqual(r.summary(), { fouls: { fal: 2, wol: 1 }, yellow: { wol: 2 }, red: { fal: 1 } }, "a card with no detail is yellow; goals are ignored");
r.reset();
assertEqual(r.summary(), { fouls: {}, yellow: {}, red: {} }, "reset");`),
      },
      {
        id: "t4",
        description: "timeoutReporter is a plain object that satisfies the contract",
        assertionCode: T(js`assert(timeoutReporter && Object.getPrototypeOf(timeoutReporter) === Object.prototype, "timeoutReporter should be an object literal, not a class instance");
assertEqual(timeoutReporter.name, "timeouts", "name");
timeoutReporter.reset();
timeoutReporter.report(_ev("timeout", "orc")); timeoutReporter.report(_ev("timeout", "orc")); timeoutReporter.report(_ev("timeout", "fal")); timeoutReporter.report(_ev("goal", "fal"));
assertEqual(timeoutReporter.summary(), { orc: 2, fal: 1 }, "counts timeouts per team");
timeoutReporter.reset();
assertEqual(timeoutReporter.summary(), {}, "reset");`),
      },
      {
        id: "t5",
        description: "isReporter and assertReporter check capabilities, not ancestry",
        assertionCode: T(js`assert(isReporter(new GoalReporter()), "a class instance qualifies");
assert(isReporter({ name: "x", report() {}, summary() {}, reset() {} }), "so does a plain object with the right members");
assert(!isReporter({ name: "x", report() {}, summary() {} }), "reset() is missing");
assert(!isReporter({ report() {}, summary() {}, reset() {} }), "name is missing");
assert(!isReporter({ name: 5, report() {}, summary() {}, reset() {} }), "name must be a string");
assert(!isReporter(null) && !isReporter(undefined) && !isReporter("goals"), "junk is not a reporter");
const ok = { name: "x", report() {}, summary() {}, reset() {} };
assert(assertReporter(ok) === ok, "assertReporter returns the reporter");
assertThrows(() => assertReporter({ name: "x", report() {} }), "Not a Reporter: missing summary(), reset()", "lists what is missing");
assertThrows(() => assertReporter({}), "Not a Reporter: missing name, report(), summary(), reset()", "an empty object misses everything");
assertThrows(() => assertReporter(null), "Not a Reporter: got null", "null");`),
      },
      {
        id: "t6",
        description: "The registry starts with goals, discipline and timeouts",
        assertionCode: T(js`assertEqual(reporters.map((r) => r.name), ["goals", "discipline", "timeouts"], "the three built-in reporters are registered, in this order");
assert(reporters.every(isReporter), "and they all satisfy the contract");`),
      },
      {
        id: "t7",
        description: "addReporter validates and refuses duplicate names",
        assertionCode: T(js`const extra = { name: "extra", n: 0, report() { this.n++; }, summary() { return { n: this.n }; }, reset() { this.n = 0; } };
try {
  assert(addReporter(extra) === extra, "addReporter returns the reporter");
  assertEqual(reporters.length, 4, "it is in the list");
  assertThrows(() => addReporter({ ...extra }), 'A reporter called "extra" is already registered', "duplicate names");
  assertThrows(() => addReporter({ name: "broken" }), "Not a Reporter: missing report(), summary(), reset()", "invalid reporters");
  assertEqual(reporters.length, 4, "failed adds change nothing");
} finally {
  assertEqual(removeReporter("extra"), true, "removeReporter finds it");
}
assertEqual(removeReporter("extra"), false, "and returns false the second time");
assertEqual(reporters.length, 3, "back to three");`),
      },
      {
        id: "t8",
        description: "reportAll feeds every reporter and survives one that crashes",
        assertionCode: T(js`resetReporters();
const crasher = { name: "crasher", report() { throw new Error("boom"); }, summary() { return {}; }, reset() {} };
addReporter(crasher);
try {
  const outcome = reportAll(_ev("goal", "fal"));
  assertEqual(outcome, { delivered: 3, failed: 1 }, "three reporters got it, the crasher failed");
  reportAll(_ev("foul", "wol"));
  reportAll(_ev("timeout", "orc"));
  assertEqual(summaries(), { goals: { fal: 1 }, discipline: { fouls: { wol: 1 }, yellow: {}, red: {} }, timeouts: { orc: 1 }, crasher: {} }, "summaries() maps each name to its summary");
  resetReporters();
  assertEqual(summaries().goals, {}, "resetReporters clears them all");
} finally {
  removeReporter("crasher");
  resetReporters();
}`),
      },
    ],
    unlocks: ["arena-stats"],
    checks: [
      {
        prompt: md`A TypeScript ¦interface Reporter { ... }¦ is compiled to JavaScript. What does the interface become in the output?`,
        question: { type: "choice", options: ["A frozen object named Reporter", "A class that throws on missing methods", "Nothing: interfaces are erased at compile time", "A Symbol"], answer: 2 },
        explanation: md`Types exist only while compiling. At runtime there is no ¦Reporter¦, so anything that arrives from outside your program (network, files, user input) still has to be validated with real code, such as ¦isReporter¦ or a schema check.`,
      },
      {
        prompt: md`Why does ¦isReporter¦ check ¦typeof candidate.report === "function"¦ instead of ¦candidate instanceof BaseReporter¦?`,
        question: {
          type: "choice",
          options: [
            "¦instanceof¦ is slower",
            "A plain object with the right methods works just as well and ¦instanceof¦ would reject it",
            "¦instanceof¦ does not work with classes",
            "¦typeof¦ also checks the number of parameters",
          ],
          answer: 1,
        },
        explanation: md`The contract is "has these members", not "has this ancestor". Duck typing accepts a hand-written object, a class instance or a test double alike, which is why it is the JavaScript way to say interface.`,
      },
    ],
  },
];
