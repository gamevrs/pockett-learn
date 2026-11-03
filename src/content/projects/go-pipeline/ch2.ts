import type { Chapter } from "@/engine/types";
import { go, js, md, MAIN_DIVIDER, READ } from "./util.ts";

/**
 * Chapter 2: Sharing without spilling. A data race replayed in slow motion, sync.Mutex, sync.Once and
 * sync/atomic, and the "one goroutine owns the data" alternative.
 *
 * The race itself is never run for real (its answer changes from run to run). Lesson 5 replays every
 * possible interleaving of two workers by hand, which is the same story and always prints the same
 * thing. Everything after it is correct code whose answer cannot change.
 */

export const chapter2: Chapter = {
  id: "sharing-without-spilling",
  title: "Sharing without spilling",
  blurb: "Watch a race condition happen in slow motion, then fix it three ways: a mutex, a once-and-atomic pair, and a single owner.",
  lessons: [
    // ───────────────────────── 5 ─────────────────────────
    {
      id: "go-pipeline-5-races",
      title: "Races in slow motion",
      minutes: 35,
      xp: 150,
      concepts: ["shared variable", "data race", "lost update", "read-modify-write", "interleaving", "why races are hard to test"],
      learn: md`### Two clerks, one tally board

The harbour office keeps a tally board: "readings received today". Whenever a reading comes in, a clerk adds one to the board. With one clerk that is trivial. With **two clerks at the same moment**, something strange can happen, and it is the most famous bug in concurrent programming.

\`counter++\` looks like one action. To the computer it is **three small steps**:

1. **load**: read the number currently on the board;
2. **add**: work out that number plus one, on a private notepad;
3. **store**: write the answer back to the board.

Two clerks, A and B, each want to add 1 to a board showing 0. Here is one possible order of their steps (a letter means "that clerk takes their next step"). We will use only the two steps that matter, *load* and *store* (the adding happens on the notepad in between):

| turn | who | step | A's notepad | B's notepad | board |
| --- | --- | --- | --- | --- | --- |
| 0 | | start | | | 0 |
| 1 | A | load | 0 | | 0 |
| 2 | B | load | 0 | 0 | 0 |
| 3 | A | store notepad + 1 | 0 | 0 | 1 |
| 4 | B | store notepad + 1 | 0 | 0 | 1 |

Two readings arrived. The board says **1**. Clerk B's store wrote over A's answer because B's notepad was out of date. One update was **lost**.

If the steps happen in the order A, A, B, B (A finishes completely, then B), the board correctly shows 2:

| turn | who | step | A's notepad | B's notepad | board |
| --- | --- | --- | --- | --- | --- |
| 1 | A | load | 0 | | 0 |
| 2 | A | store notepad + 1 | 0 | | 1 |
| 3 | B | load | | 1 | 1 |
| 4 | B | store notepad + 1 | | 1 | 2 |

### What a data race is

A **data race** is: two goroutines use the **same variable** at overlapping times, **at least one of them writes**, and nothing makes them take turns. The result depends on the exact order of their steps, and that order is decided by timing, not by your code.

Why this is nasty:

- It does **not crash**. The program happily prints a wrong number.
- It may work 999 times and fail on the 1000th, or only on a busy machine, or only on your customer's.
- Adding a print statement can change the timing and make it disappear.
- Testing cannot prove it is absent. A passing test only shows that one particular order was fine.

So we do not run the real race in this lesson. Its answer would change from run to run, and a course that grades your program cannot grade a coin flip. Instead we do something better: we **replay** the schedule by hand. A schedule is a string like \`"ABAB"\`, and we play it step by step so the outcome is always the same, and we can look at every possible order.

### Replaying a schedule

Each clerk has two moves in a fixed order: first *load*, then *store*. A map remembers what each clerk will do next:

~~~go
func replay(order string) int {
	board := 0
	notepad := map[byte]int{}                   // what each clerk last read
	next := map[byte]string{'A': "load", 'B': "load"}
	for i := 0; i < len(order); i++ {
		who := order[i]                         // a byte: 'A' or 'B'
		if next[who] == "load" {
			notepad[who] = board
			next[who] = "store"
		} else {
			board = notepad[who] + 1
			next[who] = "load"
		}
	}
	return board
}
~~~

A \`byte\` is a small number that stands for one character. \`order[i]\` gives you the i-th character as a byte, and \`'A'\` (single quotes) is the byte for the letter A. With this function:

~~~go
fmt.Println(replay("AABB"), replay("ABAB"))
~~~

~~~text
2 1
~~~

### All six orders

Two clerks with two steps each can be interleaved in exactly six ways (each string has two A and two B): \`AABB\`, \`ABAB\`, \`ABBA\`, \`BAAB\`, \`BABA\`, \`BBAA\`. Only the two where one clerk finishes before the other starts give the right answer. Four out of six lose an update. In real programs there are millions of orders, and you cannot list them, so the cure is not testing harder. It is a **design rule**: never let two goroutines write the same variable without something that makes them take turns. The next lessons give you those somethings.

### Common mistakes

- Believing \`counter++\` is "atomic" (one indivisible step). It is not.
- Thinking a race only matters when it fails often. A rare failure is the worst kind.
- Reading a shared variable from many goroutines is fine **as long as nobody writes it**. A single writer ruins that.`,
      mission: md`A rumour is going round the harbour office: the tally board says 1,298 readings arrived today, but the radio log says 1,300. Two clerks update the board at the same time, and you suspect they are stepping on each other.

You cannot catch it live, so you will build a replay machine. Write \`replay\`, run all six orders of two clerks, and count how many of them lose an update. When this lesson passes the **Race replay** lights up on the board and shows each schedule step by step.`,
      tasks: [
        "Write func replay(order string) int following the learn text: a board, a notepad map[byte]int, a next map[byte]string; on a clerk's turn either load (notepad = board) or store (board = notepad + 1)",
        "In main, make orders := []string{\"AABB\", \"ABAB\", \"ABBA\", \"BAAB\", \"BABA\", \"BBAA\"}",
        "For each order call replay, append a map[string]any{\"order\": o, \"result\": got} to a slice called race, and count the orders that did not reach 2 in lostRuns",
        "Print one line per order such as: ABAB -> 1 (one update lost)",
        "Send race and lostRuns with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 5: write replay here.
//   func replay(order string) int
//   board := 0 ; notepad := map[byte]int{} ; next := map[byte]string{'A': "load", 'B': "load"}
//   for each letter: if that clerk's next step is "load": notepad[who] = board, next = "store"
//                    otherwise: board = notepad[who] + 1, next = "load"

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 5: replay every way two clerks can interleave.
//   orders := []string{"AABB", "ABAB", "ABBA", "BAAB", "BABA", "BBAA"}
//   for each order: got := replay(o) ; append map[string]any{"order": o, "result": got} to race ; count got != 2 in lostRuns
//   scene("race", race), scene("lostRuns", lostRuns)`,
      solutionAdd: go`// replay plays one schedule of two clerks, A and B, who each want to add 1 to a shared board.
// Each letter in order means "that clerk takes their next step". A clerk's steps are always
// load (copy the board onto a notepad) and then store (write notepad + 1 back to the board).
func replay(order string) int {
	board := 0
	notepad := map[byte]int{}
	next := map[byte]string{'A': "load", 'B': "load"}
	for i := 0; i < len(order); i++ {
		who := order[i]
		if next[who] == "load" {
			notepad[who] = board
			next[who] = "store"
		} else {
			board = notepad[who] + 1
			next[who] = "load"
		}
	}
	return board
}

${MAIN_DIVIDER}

// Lesson 5: replay every way two clerks can interleave.
orders := []string{"AABB", "ABAB", "ABBA", "BAAB", "BABA", "BBAA"}
var race []map[string]any
lostRuns := 0
for _, o := range orders {
	got := replay(o)
	if got != 2 {
		lostRuns++
		fmt.Println(o, "->", got, "(one update lost)")
	} else {
		fmt.Println(o, "->", got)
	}
	race = append(race, map[string]any{"order": o, "result": got})
}
fmt.Println(lostRuns, "of", len(orders), "orders lose an update")

scene("race", race)
scene("lostRuns", lostRuns)`,
      explanation:
        "replay is a tiny simulator. A clerk's first step copies the board onto a private notepad, the second writes notepad + 1 back. If one clerk finishes before the other starts (AABB, BBAA) the second clerk loads the already-updated board and the answer is 2. In the other four orders both clerks load 0 before anyone stores, so both write 1 and an update disappears. That is the lost update behind every counter race, and 4 of the 6 orders show it.",
      hints: [
        { id: "h1", title: "The loop", content: "for i := 0; i < len(order); i++ { who := order[i] ... }. who is a byte, so you can use it as a map key: notepad[who] and next[who]." },
        { id: "h2", title: "Load or store", content: "if next[who] == \"load\" { notepad[who] = board; next[who] = \"store\" } else { board = notepad[who] + 1; next[who] = \"load\" }. Return board after the loop." },
        { id: "h3", title: "In main", content: "var race []map[string]any; lostRuns := 0; for _, o := range orders { got := replay(o); if got != 2 { lostRuns++ }; race = append(race, map[string]any{\"order\": o, \"result\": got}) }. Expect AABB and BBAA to give 2 and the other four to give 1." },
      ],
      tests: [
        {
          id: "t1",
          description: "replay follows each clerk's load and store",
          assertionCode: js`
assert(Array.isArray(scene.race), "Send the replays with scene(\"race\", race).");
assertEqual(scene.race.length, 6, "race (one entry per order)");
const byOrder = Object.fromEntries(scene.race.map((r) => [r.order, r.result]));
assertEqual(byOrder.AABB, 2, "replay(\"AABB\") (A loads 0 and stores 1, then B loads 1 and stores 2)");
assertEqual(byOrder.ABAB, 1, "replay(\"ABAB\") (both clerks load 0 before either stores, so both write 1)");
assertEqual(byOrder.ABBA, 1, "replay(\"ABBA\")");
assertEqual(byOrder.BAAB, 1, "replay(\"BAAB\")");
assertEqual(byOrder.BABA, 1, "replay(\"BABA\")");
assertEqual(byOrder.BBAA, 2, "replay(\"BBAA\")");`,
        },
        {
          id: "t2",
          description: "four of the six orders lose an update",
          assertionCode: js`
assertEqual(scene.lostRuns, 4, "lostRuns (the orders whose result is not 2)");
assert(stdout.includes("ABAB -> 1"), "Print one line per order, for example: ABAB -> 1 (one update lost)");`,
        },
      ],
      unlocks: ["gp-race"],
      checks: [
        {
          prompt: "Two goroutines both run `counter++` 1000 times with no protection. The final counter is...",
          question: {
            type: "choice",
            options: ["Always exactly 2000", "Often less than 2000, and not the same every run", "Always 1000", "A compile error"],
            answer: 1,
          },
          explanation: "Each ++ is a load, an add and a store. When the steps of the two goroutines interleave, some stores overwrite newer values, so updates are lost. How many are lost depends on timing.",
        },
        {
          prompt: "Which of these is a data race?",
          question: {
            type: "choice",
            options: [
              "Ten goroutines only read the same slice",
              "Two goroutines each write to their own slot of a slice",
              "One goroutine writes a variable while another reads it, with nothing coordinating them",
              "A goroutine sends on a channel while another receives",
            ],
            answer: 2,
          },
          explanation: "A race needs the same variable, overlapping time, at least one write and no coordination. Reading only is safe, separate slots are separate variables and channel operations are the coordination.",
        },
      ],
    },

    // ───────────────────────── 6 ─────────────────────────
    {
      id: "go-pipeline-6-mutex",
      title: "Taking turns: sync.Mutex",
      minutes: 35,
      xp: 150,
      concepts: ["sync.Mutex", "Lock and Unlock", "critical section", "defer Unlock", "mutex inside a struct", "pointer receiver", "never copy a mutex"],
      learn: md`### One key to the tally board

The fix for the lost update is simple in spirit: the tally board lives in a room with **one key**. To change the board a clerk must take the key, do their load-add-store, and hang the key back. A second clerk who arrives meanwhile waits at the door.

Go's key is a **mutex** (short for *mutual exclusion*) from the \`sync\` package:

~~~go
var mu sync.Mutex

mu.Lock()     // take the key; wait here if somebody else has it
board++       // only one goroutine at a time can be in here
mu.Unlock()   // hang the key back
~~~

The code between \`Lock\` and \`Unlock\` is the **critical section**. Only one goroutine can be inside at any moment, so the three steps of \`board++\` can no longer be interleaved with another clerk's.

Here is the same two-clerk story with the key. Clerk A takes it first:

| turn | A | B | board |
| --- | --- | --- | --- |
| 1 | \`Lock\` (gets the key) | \`Lock\` (key taken: **waits**) | 0 |
| 2 | load, add, store | waiting | 1 |
| 3 | \`Unlock\` | wakes up, gets the key | 1 |
| 4 | | load, add, store | 2 |
| 5 | | \`Unlock\` | 2 |

Whoever goes first, the board ends at 2.

### Always defer the unlock

If the code in the critical section returns early, or crashes, the key never goes back and everybody else waits forever. So take the key and promise to return it on the very next line:

~~~go
mu.Lock()
defer mu.Unlock()
~~~

### Put the mutex with the data it guards

The tidy shape is a struct that owns both the data and its mutex, with methods that always lock:

~~~go
type Tally struct {
	mu      sync.Mutex
	perBuoy map[int]int // readings counted for each buoy
	waveSum int         // every wave height added up
}

func (t *Tally) Add(r Reading) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.perBuoy[r.Buoy]++
	t.waveSum += r.Wave
}
~~~

Callers never see the mutex. They just call \`Add\` from as many goroutines as they like. A short complete example and its exact output:

~~~go
t := &Tally{perBuoy: map[int]int{}}
var wg sync.WaitGroup
for i := 0; i < 4; i++ {
	wg.Add(1)
	go func() {
		defer wg.Done()
		t.Add(Reading{Buoy: 2, Wave: 100})
	}()
}
wg.Wait()
fmt.Println(t.perBuoy[2], t.waveSum)
~~~

~~~text
4 400
~~~

Four clerks, four adds, and the answer is the same on every run.

### Rules of the key

- **Pointer receivers only.** A \`sync.Mutex\` must never be copied after first use: the copy would be a second key to the same room. Methods on a struct that holds a mutex take \`*Tally\`, and you pass \`*Tally\` around, never \`Tally\`.
- **Keep the critical section small.** Everybody queues behind the key holder. Do slow work (a network call, a channel send) *outside* the lock.
- **Lock a mutex twice in a row from the same goroutine** and it waits for itself forever: a deadlock. Go's mutexes are not re-entrant, so a locked method must never call another locked method of the same struct.
- **Reading needs the key too** if anyone might be writing. A reader without the key can see a half-finished update. When a method hands out the guarded map, hand out a **copy** made while holding the key.
- A zero \`sync.Mutex\` is ready to use. No constructor needed.

### Common mistakes

- Locking in some methods and forgetting in others. One unguarded access is a race again.
- Returning the internal map from a method: the caller then reads and writes it without the key.
- Holding the lock while waiting on a channel: if the other side needs the same lock, nobody moves.`,
      mission: md`Back to the tally board. Now that you know the cure, build the real one: a \`Tally\` that six goroutines (one per buoy) can feed at the same time, each pouring in 200 readings. At the end the counts and the total wave height must be exactly right, run after run.

Write \`Tally\` with a mutex, \`Add\` and a \`Snapshot\` that returns copies, feed it from six goroutines and check it against a plain one-at-a-time sum. When this lesson passes the **Guarded tally** lights up on the board.`,
      tasks: [
        "Declare type Tally struct with mu sync.Mutex, perBuoy map[int]int and waveSum int, plus func NewTally() *Tally that makes the map",
        "func (t *Tally) Add(r Reading): Lock, defer Unlock, then perBuoy[r.Buoy]++ and waveSum += r.Wave",
        "func (t *Tally) Snapshot() (map[int]int, int): Lock, defer Unlock, return a COPY of perBuoy and waveSum",
        "In main: tally := NewTally(); one goroutine per buoy (b from 1 to fleetSize) adds all of readingsFor(b, 200); wait for them with a WaitGroup",
        "Work out want by adding up every Wave of those same 1200 readings in a plain loop, and set matches := total == want",
        "Send tally (a map[string]any with \"perBuoy\", \"waveSum\", \"expected\" and \"match\") with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 6: write the guarded tally.
//   type Tally struct { mu sync.Mutex ; perBuoy map[int]int ; waveSum int }
//   func NewTally() *Tally
//   func (t *Tally) Add(r Reading)                    Lock, defer Unlock, count it
//   func (t *Tally) Snapshot() (map[int]int, int)     Lock, defer Unlock, return a copy of the map and the sum

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 6: six goroutines feed one tally.
//   tally := NewTally() ; a WaitGroup ; for b := 1..fleetSize: go func() { for each of readingsFor(b, 200): tally.Add(r) }()
//   counts, total := tally.Snapshot()
//   want := sum of every Wave in readingsFor(b, 200) for b = 1..fleetSize (plain loops, no goroutines)
//   scene("tally", map[string]any{"perBuoy": counts, "waveSum": total, "expected": want, "match": total == want})`,
      solutionAdd: go`// Tally is the office's running totals. Many goroutines may call Add at the same time:
// the mutex lets only one of them touch the data at once.
type Tally struct {
	mu      sync.Mutex
	perBuoy map[int]int // readings counted for each buoy
	waveSum int         // every wave height added up
}

// NewTally returns an empty tally ready to use.
func NewTally() *Tally {
	return &Tally{perBuoy: map[int]int{}}
}

// Add counts one reading.
func (t *Tally) Add(r Reading) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.perBuoy[r.Buoy]++
	t.waveSum += r.Wave
}

// Snapshot returns copies of the totals, taken while holding the key.
func (t *Tally) Snapshot() (map[int]int, int) {
	t.mu.Lock()
	defer t.mu.Unlock()
	counts := make(map[int]int, len(t.perBuoy))
	for k, v := range t.perBuoy {
		counts[k] = v
	}
	return counts, t.waveSum
}

${MAIN_DIVIDER}

// Lesson 6: six goroutines feed one tally.
tally := NewTally()
var tallyWG sync.WaitGroup
for b := 1; b <= fleetSize; b++ {
	tallyWG.Add(1)
	go func() {
		defer tallyWG.Done()
		for _, r := range readingsFor(b, 200) {
			tally.Add(r)
		}
	}()
}
tallyWG.Wait()
counts, total := tally.Snapshot()

want := 0
for b := 1; b <= fleetSize; b++ {
	for _, r := range readingsFor(b, 200) {
		want += r.Wave
	}
}
matches := total == want
fmt.Println("tally says", total, "plain loop says", want, "match:", matches)

scene("tally", map[string]any{"perBuoy": counts, "waveSum": total, "expected": want, "match": matches})`,
      explanation:
        "Every access to perBuoy and waveSum happens between Lock and Unlock, so the goroutines take turns and no update is lost. Snapshot copies the map while holding the key, so the caller can read it freely afterwards without racing with later Adds. Addition does not care about order, so however the six goroutines interleave, the totals equal the plain sequential sum.",
      hints: [
        { id: "h1", title: "The struct", content: "type Tally struct { mu sync.Mutex; perBuoy map[int]int; waveSum int }. NewTally returns &Tally{perBuoy: map[int]int{}} so the map is ready. Methods use a pointer receiver: func (t *Tally) Add(r Reading)." },
        { id: "h2", title: "Add and Snapshot", content: "Both start with t.mu.Lock() and defer t.mu.Unlock(). Add does t.perBuoy[r.Buoy]++ and t.waveSum += r.Wave. Snapshot makes counts := make(map[int]int) and copies every key and value, then returns counts, t.waveSum." },
        { id: "h3", title: "The six goroutines", content: "Use a new WaitGroup (tallyWG). for b := 1; b <= fleetSize; b++ { tallyWG.Add(1); go func() { defer tallyWG.Done(); for _, r := range readingsFor(b, 200) { tally.Add(r) } }() }. Call tallyWG.Wait() before Snapshot." },
      ],
      tests: [
        {
          id: "t1",
          description: "every reading was counted exactly once",
          assertionCode: js`${READ}
assert(scene.tally && typeof scene.tally === "object", "Send the totals with scene(\"tally\", map[string]any{...}).");
for (let b = 1; b <= 6; b++) {
  assertEqual(scene.tally.perBuoy[String(b)], 200, "perBuoy for buoy " + b + " (200 readings were added; a missing lock can lose some)");
}`,
        },
        {
          id: "t2",
          description: "the total matches a plain one-at-a-time sum",
          assertionCode: js`${READ}
let want = 0;
for (let b = 1; b <= 6; b++) for (const r of readingsFor(b, 200)) want += r.Wave;
assertEqual(scene.tally.expected, want, "expected (add up the Wave of all 1200 readings in a plain loop)");
assertEqual(scene.tally.waveSum, want, "waveSum (the tally's total must equal the plain sum)");
assertEqual(scene.tally.match, true, "match (total == want)");`,
        },
      ],
      unlocks: ["gp-tally"],
      checks: [
        {
          prompt: "Why should `Tally` methods use a pointer receiver (`func (t *Tally) Add`)?",
          question: {
            type: "choice",
            options: ["It is faster to type", "A value receiver would copy the mutex, giving each call its own separate key", "Maps need pointers", "Go requires it for goroutines"],
            answer: 1,
          },
          explanation: "A mutex only works if everyone shares the same one. Copying a struct copies the mutex, and then no two callers are actually taking turns.",
        },
        {
          prompt: "What happens if a goroutine calls `mu.Lock()` twice in a row without unlocking?",
          question: { type: "choice", options: ["The second Lock does nothing", "It waits for itself forever (a deadlock)", "A compile error", "The mutex unlocks itself"], answer: 1 },
          explanation: "Go's mutex is not re-entrant. The second Lock waits for the key that the same goroutine is holding.",
        },
      ],
    },

    // ───────────────────────── 7 ─────────────────────────
    {
      id: "go-pipeline-7-once-atomic",
      title: "Once, and counting with atomic",
      minutes: 30,
      xp: 140,
      concepts: ["sync.Once", "lazy initialisation", "sync/atomic", "atomic.Int64", "Add and Load", "mutex or atomic"],
      learn: md`### Opening the shop exactly once

Every buoy has a small calibration offset: a sensor that reads 0.3 degrees warm gets corrected by -3 tenths. The offsets live in a table that is **expensive to load** (imagine reading it from a disk or a server). Eight workers need it, and it must be loaded **once**, not eight times, and not after somebody already needed it.

\`sync.Once\` does exactly that. It remembers whether its function has run:

~~~go
var once sync.Once

once.Do(func() {
	// runs exactly once, whoever gets here first
})
~~~

If eight goroutines call \`once.Do(f)\` at the same moment, one of them runs \`f\`. The other seven **wait** until \`f\` has finished, then carry on. Nobody ever sees a half-loaded table, and \`f\` never runs a second time, even if you call \`Do\` a thousand more times.

| turn | worker 1 | worker 2 | worker 3 |
| --- | --- | --- | --- |
| 1 | \`Do\`: first here, **runs the loader** | \`Do\`: waits | \`Do\`: waits |
| 2 | loader finishes | wakes up | wakes up |
| 3 | uses the table | uses the table | uses the table |
| later | \`Do\`: already done, goes straight on | | |

A complete example and its exact output:

~~~go
var (
	once  sync.Once
	loads int
)

func ready() {
	once.Do(func() { loads++ })
}

func main() {
	var wg sync.WaitGroup
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			ready()
		}()
	}
	wg.Wait()
	fmt.Println("loaded", loads, "time")
}
~~~

~~~text
loaded 1 time
~~~

Five goroutines called \`ready()\`, the loader ran once. (\`loads++\` is safe here only because \`Do\` runs the function in one goroutine at a time and finishes it before anyone else continues.)

### Counting without a key: sync/atomic

A mutex is a room with a key. For something as small as **one number** that many goroutines add to, that is more ceremony than needed. The \`sync/atomic\` package offers numbers whose operations are **indivisible**: the load-add-store happens as one step that cannot be interleaved. No lost updates, no key.

~~~go
var seen atomic.Int64   // starts at 0

seen.Add(1)             // safe from any number of goroutines
fmt.Println(seen.Load()) // read it safely
~~~

Use \`Add\` to change and \`Load\` to read. Never copy an atomic after use, and do not mix plain \`seen++\` with the atomic methods.

### Mutex or atomic?

| situation | choose |
| --- | --- |
| one counter or flag, changed independently | atomic |
| several values that must change together (a map and a total) | mutex |
| something to set up exactly once | \`sync.Once\` |

If two numbers must stay consistent with each other, two atomics are **not** enough: another goroutine could look between the two updates. A mutex around both is right.

### Common mistakes

- Doing the one-time setup *outside* \`Do\` "just in case". Then it is not once any more.
- Reading the guarded table before calling \`Do\`. Always go through the function that calls \`Do\`.
- Reaching for atomics because they sound fast, then using them for state that needs a lock.`,
      mission: md`The office now needs to correct water temperatures with each buoy's calibration offset. Eight workers will correct 50 readings each, and the offsets table is loaded lazily the first time anybody needs it. Count the readings they all process with an atomic counter, and prove the table loaded once.

Write \`offsets\`, run eight workers and report how many times the table loaded and how many readings were seen. When this lesson passes the **Calibration desk** lights up on the board.`,
      tasks: [
        "Declare three package variables: calibOnce sync.Once, calibTable map[int]int and calibLoads atomic.Int32",
        "Write func offsets() map[int]int: inside calibOnce.Do add 1 to calibLoads and set calibTable to map[int]int{1: 3, 2: -2, 3: 0, 4: 5, 5: -4, 6: 1}; then return calibTable",
        "In main: var seen atomic.Int64 and fixed := make([]int, 8). Start eight workers w = 0..7; worker w takes table := offsets() and, for the 50 readings of buoy w%fleetSize+1, adds r.Temp + table[r.Buoy] into a local sum and calls seen.Add(1)",
        "Each worker stores its sum in fixed[w]; wait for all eight with a WaitGroup",
        "Send calibration (a map[string]any with \"loads\" = calibLoads.Load(), \"workers\" = 8, \"seen\" = seen.Load() and \"fixed\") with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 7: the lazy calibration table.
//   var calibOnce sync.Once ; var calibTable map[int]int ; var calibLoads atomic.Int32
//   func offsets() map[int]int
//     calibOnce.Do(func() { calibLoads.Add(1) ; calibTable = map[int]int{1: 3, 2: -2, 3: 0, 4: 5, 5: -4, 6: 1} })
//     return calibTable

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 7: eight workers correct temperatures.
//   var seen atomic.Int64 ; fixed := make([]int, 8) ; a WaitGroup
//   for w := 0; w < 8; w++ { go func() { table := offsets() ; sum := 0
//       for each r of readingsFor(w%fleetSize+1, 50): sum += r.Temp + table[r.Buoy] ; seen.Add(1)
//       fixed[w] = sum }() }
//   scene("calibration", map[string]any{"loads": calibLoads.Load(), "workers": 8, "seen": seen.Load(), "fixed": fixed})`,
      solutionAdd: go`var (
	calibOnce  sync.Once
	calibTable map[int]int
	calibLoads atomic.Int32 // how many times the table really loaded
)

// offsets returns each buoy's temperature correction, in tenths of a degree.
// The table loads the first time anybody asks and never again.
func offsets() map[int]int {
	calibOnce.Do(func() {
		calibLoads.Add(1)
		calibTable = map[int]int{1: 3, 2: -2, 3: 0, 4: 5, 5: -4, 6: 1}
	})
	return calibTable
}

${MAIN_DIVIDER}

// Lesson 7: eight workers correct temperatures.
var seen atomic.Int64
fixed := make([]int, 8)
var calWG sync.WaitGroup
for w := 0; w < 8; w++ {
	calWG.Add(1)
	go func() {
		defer calWG.Done()
		table := offsets()
		sum := 0
		for _, r := range readingsFor(w%fleetSize+1, 50) {
			sum += r.Temp + table[r.Buoy]
			seen.Add(1)
		}
		fixed[w] = sum
	}()
}
calWG.Wait()
fmt.Println("table loaded", calibLoads.Load(), "time(s); readings seen:", seen.Load())

scene("calibration", map[string]any{"loads": calibLoads.Load(), "workers": 8, "seen": seen.Load(), "fixed": fixed})`,
      explanation:
        "All eight workers call offsets(), but calibOnce.Do runs its function for the first caller only; the others wait until the table is complete, so calibLoads ends at 1 and nobody sees a half-built table. Each worker adds 50 to the atomic counter, which cannot lose updates, giving 400. Every worker writes only its own slot of fixed, so the per-worker sums are the same on every run.",
      hints: [
        { id: "h1", title: "The variables and offsets", content: "var ( calibOnce sync.Once; calibTable map[int]int; calibLoads atomic.Int32 ). offsets(): calibOnce.Do(func() { calibLoads.Add(1); calibTable = map[int]int{1: 3, 2: -2, 3: 0, 4: 5, 5: -4, 6: 1} }) and then return calibTable." },
        { id: "h2", title: "The workers", content: "for w := 0; w < 8; w++ { wg.Add(1); go func() { defer wg.Done(); table := offsets(); sum := 0; for _, r := range readingsFor(w%fleetSize+1, 50) { sum += r.Temp + table[r.Buoy]; seen.Add(1) }; fixed[w] = sum }() }. Use a new WaitGroup name and Wait() before sending." },
        { id: "h3", title: "Sending", content: "scene(\"calibration\", map[string]any{\"loads\": calibLoads.Load(), \"workers\": 8, \"seen\": seen.Load(), \"fixed\": fixed}). Use .Load() to read atomic values." },
      ],
      tests: [
        {
          id: "t1",
          description: "the table loaded exactly once for eight workers",
          assertionCode: js`
assert(scene.calibration && typeof scene.calibration === "object", "Send the numbers with scene(\"calibration\", map[string]any{...}).");
assertEqual(scene.calibration.loads, 1, "calibration.loads (eight workers asked, but the table should load once: put the loading inside calibOnce.Do)");
assertEqual(scene.calibration.workers, 8, "calibration.workers");`,
        },
        {
          id: "t2",
          description: "the atomic counter saw every reading",
          assertionCode: js`
assertEqual(scene.calibration.seen, 400, "calibration.seen (8 workers x 50 readings; seen.Add(1) for each one)");`,
        },
        {
          id: "t3",
          description: "each worker's corrected sum is right",
          assertionCode: js`${READ}
const offs = { 1: 3, 2: -2, 3: 0, 4: 5, 5: -4, 6: 1 };
const want = Array.from({ length: 8 }, (_, w) => readingsFor((w % 6) + 1, 50).reduce((a, r) => a + r.Temp + offs[r.Buoy], 0));
assertEqual(scene.calibration.fixed, want, "calibration.fixed (for worker w, add r.Temp + table[r.Buoy] over the 50 readings of buoy w%6+1)");`,
        },
      ],
      unlocks: ["gp-once"],
      checks: [
        {
          prompt: "Ten goroutines call `once.Do(load)` at the same moment. How many times does `load` run, and what do the other nine do?",
          question: { type: "choice", options: ["Ten times, in turn", "Once; the other nine wait until it has finished", "Once; the other nine skip ahead immediately", "Zero times"], answer: 1 },
          explanation: "Do guarantees the function runs once and that every caller returns only after it has completed, so nobody uses half-loaded data.",
        },
        {
          prompt: "You need to update a map and a running total together so that no other goroutine ever sees one changed without the other. Atomic or mutex?",
          question: { type: "choice", options: ["Atomic", "Mutex"], answer: 1 },
          explanation: "Atomics make one number safe. Keeping two values consistent with each other needs a lock around both updates.",
        },
      ],
    },

    // ───────────────────────── 8 ─────────────────────────
    {
      id: "go-pipeline-8-owner",
      title: "One owner: share by communicating",
      minutes: 30,
      xp: 150,
      concepts: ["share memory by communicating", "owner goroutine", "channel of updates", "returning the answer through a channel", "mutex vs owner"],
      learn: md`### Do not share the board: give it to one person

You have now seen two cures: take turns with a key (mutex) or make single numbers indivisible (atomic). Go suggests a third, with a slogan: *do not communicate by sharing memory; share memory by communicating*.

In kitchen terms: instead of six cooks all reaching into one salt jar, put **one person** in charge of the jar. Anyone who wants salt passes a note through the hatch. Only the keeper ever touches the jar, so there is nothing to fight over.

For the harbour office: one goroutine, the **peak keeper**, owns a map of "tallest wave seen so far for each buoy". Everyone else sends it readings through a channel. Because only the keeper touches the map, the map needs no lock.

~~~go
func peakKeeper(updates <-chan Reading) <-chan map[int]int {
	answer := make(chan map[int]int, 1)
	go func() {
		peaks := map[int]int{}          // only this goroutine ever sees it
		for r := range updates {        // runs until updates is closed
			if r.Wave > peaks[r.Buoy] {
				peaks[r.Buoy] = r.Wave
			}
		}
		answer <- peaks                 // hand the finished map over
	}()
	return answer
}
~~~

Read it from the inside:

- \`peaks\` is a local variable of the goroutine. Nobody else can name it. No lock needed.
- The loop ends when \`updates\` is closed: "no more notes".
- At the end the keeper sends the finished map through \`answer\`. That is a channel with room for one item (buffer 1), so the keeper never waits for anyone to take it.

### Who does what, and when

| turn | six sender goroutines | peak keeper | main |
| --- | --- | --- | --- |
| 1 | each sends its readings, one at a time | takes one note at a time, updates \`peaks\` | \`wg.Wait()\`: waits for the senders |
| 2 | all senders finished | waits for more notes | closes \`updates\` ("no more") |
| 3 | | loop ends, sends \`peaks\` | \`peaks := <-answer\` |

A complete tiny example with its exact output:

~~~go
updates := make(chan Reading)
answer := peakKeeper(updates)
updates <- Reading{Buoy: 1, Wave: 90}
updates <- Reading{Buoy: 1, Wave: 120}
updates <- Reading{Buoy: 2, Wave: 70}
close(updates)
fmt.Println(<-answer)
~~~

~~~text
map[1:120 2:70]
~~~

(\`fmt\` prints maps with their keys in sorted order, so this line is always the same.)

### Order of closing matters

The senders must all be **finished** before anyone calls \`close(updates)\`: sending on a closed channel crashes. That is why \`main\` waits on a WaitGroup first, closes second, and only then reads \`answer\`. Reading \`answer\` before closing would wait forever, because the keeper is still waiting for notes.

### Which cure to pick?

| use a mutex when | use an owner goroutine when |
| --- | --- |
| a small shared struct is touched in many places | one component naturally owns the data |
| calls are quick | work should happen in a particular order |
| you want a simple method call | you want to avoid locks leaking into every caller |

Neither is "better". A mutex is fewer lines. An owner is easier to reason about when the rules for the data are complicated, because only one place can break them.

### Common mistakes

- Letting the keeper hand out its map while it is still updating it. Hand it out only when it is finished (as above), or send copies.
- Closing \`updates\` from several senders. Close it once, from the one place that knows all senders are done.
- Forgetting that a sender blocks if the keeper is slow: that is back-pressure, usually what you want.`,
      mission: md`The tally board kept counts. Now the harbour master wants something different: the **tallest wave each buoy has seen**, kept as a map. Six goroutines will stream 100 readings each. This time nobody gets a mutex: one goroutine owns the map and everyone else sends it readings.

Write \`peakKeeper\`, feed it from six goroutines, close in the right order and read the answer. When this lesson passes the **Peak keeper** lights up on the board.`,
      tasks: [
        "Write func peakKeeper(updates <-chan Reading) <-chan map[int]int: make answer with buffer 1, start a goroutine that builds a local peaks map from the readings it receives (keeping the largest Wave per Buoy) and sends peaks on answer when updates is closed; return answer",
        "In main: updates := make(chan Reading); answer := peakKeeper(updates)",
        "Start one goroutine per buoy (b from 1 to fleetSize) that sends all of readingsFor(b, 100) on updates, tracked by a WaitGroup",
        "Wait for the senders, THEN close(updates), THEN read peaks := <-answer",
        "Print the map with fmt.Println(\"peak waves per buoy:\", peaks)",
        "Send peaks with scene (as \"peaks\")",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 8: the peak keeper owns the map.
//   func peakKeeper(updates <-chan Reading) <-chan map[int]int
//   answer := make(chan map[int]int, 1)
//   go func() { peaks := map[int]int{} ; for r := range updates { keep the largest Wave per Buoy } ; answer <- peaks }()
//   return answer

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 8: six senders, one owner.
//   updates := make(chan Reading) ; answer := peakKeeper(updates)
//   a WaitGroup ; six goroutines each send readingsFor(b, 100) on updates
//   Wait(), THEN close(updates), THEN peaks := <-answer
//   scene("peaks", peaks)`,
      solutionAdd: go`// peakKeeper owns a map of the tallest wave seen per buoy. Nothing else touches the map:
// everybody else sends readings and the keeper hands over the finished map at the end.
func peakKeeper(updates <-chan Reading) <-chan map[int]int {
	answer := make(chan map[int]int, 1)
	go func() {
		peaks := map[int]int{}
		for r := range updates {
			if r.Wave > peaks[r.Buoy] {
				peaks[r.Buoy] = r.Wave
			}
		}
		answer <- peaks
	}()
	return answer
}

${MAIN_DIVIDER}

// Lesson 8: six senders, one owner.
updates := make(chan Reading)
answer := peakKeeper(updates)
var sendWG sync.WaitGroup
for b := 1; b <= fleetSize; b++ {
	sendWG.Add(1)
	go func() {
		defer sendWG.Done()
		for _, r := range readingsFor(b, 100) {
			updates <- r
		}
	}()
}
sendWG.Wait()  // every sender has finished...
close(updates) // ...so it is safe to say "no more"
peaks := <-answer
fmt.Println("peak waves per buoy:", peaks)

scene("peaks", peaks)`,
      explanation:
        "peaks is local to the keeper goroutine, so there is nothing to lock: the six senders only ever send readings. main waits for all senders, then closes updates, which ends the keeper's range loop; the keeper then sends the finished map, and main reads it. For each buoy the map holds the maximum Wave over 100 readings, whatever order the readings arrived in.",
      hints: [
        { id: "h1", title: "The keeper", content: "answer := make(chan map[int]int, 1); go func() { peaks := map[int]int{}; for r := range updates { if r.Wave > peaks[r.Buoy] { peaks[r.Buoy] = r.Wave } }; answer <- peaks }(); return answer. A missing map key reads as 0, and every Wave is above 0, so the first reading always wins." },
        { id: "h2", title: "The senders", content: "for b := 1; b <= fleetSize; b++ { sendWG.Add(1); go func() { defer sendWG.Done(); for _, r := range readingsFor(b, 100) { updates <- r } }() } with a new WaitGroup." },
        { id: "h3", title: "The order", content: "sendWG.Wait() first, then close(updates), then peaks := <-answer. If you read answer before closing, the keeper is still waiting for notes and the program deadlocks." },
      ],
      tests: [
        {
          id: "t1",
          description: "the keeper found each buoy's tallest wave",
          assertionCode: js`${READ}
assert(scene.peaks && typeof scene.peaks === "object", "Send the keeper's map with scene(\"peaks\", peaks).");
for (let b = 1; b <= 6; b++) {
  const want = Math.max(...readingsFor(b, 100).map((r) => r.Wave));
  assertEqual(scene.peaks[String(b)], want, "peaks for buoy " + b + " (the tallest of its 100 waves)");
}`,
        },
        {
          id: "t2",
          description: "the map has one entry per buoy",
          assertionCode: js`
assertEqual(Object.keys(scene.peaks).length, 6, "peaks (one entry for each of the six buoys)");
assert(stdout.includes("peak waves per buoy:"), "Print the map with: peak waves per buoy: ...");`,
        },
      ],
      unlocks: ["gp-owner"],
      checks: [
        {
          prompt: "In the peak keeper design, why is no mutex needed around the `peaks` map?",
          question: {
            type: "choice",
            options: ["Maps are thread-safe in Go", "Only the keeper goroutine ever touches the map", "Channels lock the map automatically", "The map is read-only"],
            answer: 1,
          },
          explanation: "A variable that only one goroutine ever uses cannot race. Everyone else communicates with the keeper through the channel instead of reaching into the map.",
        },
        {
          prompt: "In what order must main do these three things: close(updates), wait for the senders, read the answer?",
          question: { type: "order", items: ["Wait for the senders", "close(updates)", "Read the answer"] },
          explanation: "Closing before the senders finish makes a late sender crash; reading the answer before closing waits forever because the keeper is still listening.",
        },
      ],
    },
  ],
};
