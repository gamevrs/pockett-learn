import type { Chapter } from "@/engine/types";
import { go, js, md, MAIN_DIVIDER, READ } from "./util.ts";

/**
 * Chapter 1: Many hands. Goroutines and WaitGroup, channels, buffered channels, select.
 *
 * Lesson 1's starter and solution carry the whole file (package, imports, the provided `scene` helper,
 * a scaffold that keeps unused imports legal, the provided Reading/Summary types and readingsFor, and
 * `func main()`). From lesson 2 on, a lesson's text may hold package-level declarations above
 * MAIN_DIVIDER (engine/compose.ts inserts them before `func main`); everything below the divider is
 * appended to the end of main's body.
 *
 * Every lesson is deterministic: results are placed by index or sorted before they are shown, and
 * nothing depends on which goroutine runs first.
 */

const skeleton = (middle: string, body: string, marker: string) => go`${marker}package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"sync"
	"sync/atomic"
	"time"
)

// Provided by pockett: sends one value to the live harbour board beside your editor.
// From lesson 1 on you call scene("name", value). Leave this function as it is.
func scene(key string, v any) {
	data, err := json.Marshal(map[string]any{key: v})
	if err != nil {
		fmt.Println("scene: cannot send", key+":", err)
		return
	}
	fmt.Println("@scene " + string(data))
}

// Course scaffold. Go refuses to build a file that imports a package it never uses, but this
// course adds one idea per lesson. Each line below counts as "using" a package until the lesson
// that really needs it. You never need to edit this block.
var (
	_ context.Context    // lesson 13
	_ = errors.New       // lesson 14
	_ = sort.Ints        // lesson 3
	_ sync.Mutex         // lesson 6
	_ atomic.Int64       // lesson 7
	_ = time.Millisecond // lesson 14
)

// The fleet: six weather buoys, numbered 1 to 6, moored along the Tidewatch line.
const fleetSize = 6

// Reading is one measurement radioed in by a buoy.
type Reading struct {
	Buoy int // which buoy sent it, 1 to 6
	Seq  int // that buoy's reading number, counting from 1
	Wave int // wave height in centimetres
	Wind int // wind speed in km/h
	Temp int // water temperature in tenths of a degree (153 means 15.3 C)
}

// Summary boils a batch of readings down to four numbers.
type Summary struct {
	Buoy    int
	Count   int // how many readings were in the batch
	MaxWave int // the tallest wave, in cm
	WindSum int // every wind speed added up
}

// readingsFor returns the first n readings of one buoy. The numbers are made up by a fixed
// formula, so every run of your program sees exactly the same sea.
func readingsFor(buoy, n int) []Reading {
	out := make([]Reading, 0, n)
	for s := 1; s <= n; s++ {
		out = append(out, Reading{
			Buoy: buoy,
			Seq:  s,
			Wave: 40 + (buoy*37+s*53)%160,
			Wind: 8 + (buoy*11+s*29)%70,
			Temp: 100 + (buoy*13+s*7)%90,
		})
	}
	return out
}
${middle}
func main() {
${body}
}`;

export const chapter1: Chapter = {
  id: "many-hands",
  title: "Many hands",
  blurb: "Start goroutines, hand readings over channels, queue them in buffers and wait on several things with select.",
  lessons: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "go-pipeline-1-goroutines",
      title: "Many hands: goroutines",
      minutes: 35,
      xp: 140,
      concepts: ["sequential vs concurrent", "go statement", "goroutine", "sync.WaitGroup", "closure per iteration", "slot per goroutine"],
      learn: md`### The post office with one clerk

Along the coast, six weather buoys bob on the waves. Every few minutes each one radios a **batch** of readings: wave height, wind speed, water temperature. Someone has to boil each batch down to a short summary.

Picture a post office with **one clerk**. Batch 1 arrives, she summarises it. Then batch 2, then batch 3. Batch 6 waits for five others even though it has nothing to do with them. Doing one thing after another is called **sequential**.

Now picture **six clerks**, one per batch. They all start at once and the counter is cleared in the time of one batch. Doing several things in overlapping time is called **concurrent**. Go has a very cheap way to hire a clerk: the **goroutine**.

Here is the same story as a table. Each batch takes 1 *tick* (a made-up unit of time, just for counting):

| tick | one clerk | three clerks |
| --- | --- | --- |
| 1 | batch 1 | batch 1, batch 2, batch 3 |
| 2 | batch 2 | all done |
| 3 | batch 3 | all done |
| total | 3 ticks | 1 tick |

### The sequential version first

You already know everything this needs. The function below boils one buoy's batch down to a \`Summary\` (the \`Reading\` and \`Summary\` types are in your file, already written):

~~~go
func summarize(buoy, n int) Summary {
	s := Summary{Buoy: buoy}
	for _, r := range readingsFor(buoy, n) {
		s.Count++
		if r.Wave > s.MaxWave {
			s.MaxWave = r.Wave
		}
		s.WindSum += r.Wind
	}
	return s
}
~~~

And a loop that does the six batches one after another, putting each answer in its own slot of a slice:

~~~go
oneByOne := make([]Summary, fleetSize)
for i := 0; i < fleetSize; i++ {
	oneByOne[i] = summarize(i+1, 50)
}
~~~

### Hiring a clerk: the go keyword

Put the word \`go\` in front of a function call and Go starts that call as a **goroutine**: a function running on its own, *beside* the code that started it. The line with \`go\` does not wait. It starts the clerk and moves straight on to the next line.

That creates a puzzle. If \`main\` reaches its last line while the clerks are still working, the program ends and every clerk is stopped mid-sentence. We need a way to say "wait here until everyone has finished". That is a **WaitGroup** from the \`sync\` package. Think of it as a whiteboard with a tally:

- \`wg.Add(1)\` before you start a clerk: add one to the tally ("one more person is working").
- \`wg.Done()\` when the clerk finishes: take one off.
- \`wg.Wait()\` blocks until the tally is back to zero.

Here is a tiny complete program with its exact output:

~~~go
package main

import (
	"fmt"
	"sync"
)

func main() {
	names := []string{"Kelp", "Marlin", "Petrel"}
	shout := make([]string, len(names))

	var wg sync.WaitGroup
	for i, n := range names {
		wg.Add(1)
		go func() {
			defer wg.Done()
			shout[i] = n + "!"
		}()
	}
	wg.Wait()
	fmt.Println(shout)
}
~~~

~~~text
[Kelp! Marlin! Petrel!]
~~~

Three things to unpack:

- \`go func() { ... }()\` defines a small function right there and calls it at once (the \`()\` at the end is the call). The \`go\` in front starts it as a goroutine. It can use the variables \`i\` and \`n\` around it, because it is a closure, as you saw in Gopher Post.
- \`defer wg.Done()\` guarantees the tally goes down when the function ends, however it ends.
- Each goroutine writes only to **its own slot**, \`shout[i]\`. No two clerks touch the same drawer, so they cannot get in each other's way. That is why the output is always the same, whichever clerk finishes first. (Chapter 2 is about what happens when they do share a drawer.)

Since Go 1.22 every pass of a \`for\` loop gets its **own** \`i\` and \`n\`, so each goroutine above sees its own values. In older Go, all goroutines shared one variable, a famous source of bugs.

### What you must never do

- **Forget \`wg.Wait()\`.** \`main\` would finish first, the program would end, and the slice would still be empty.
- **Call \`wg.Add(1)\` inside the goroutine.** \`Wait\` might run before the goroutine has even started, see a tally of zero and carry on. Always \`Add\` before the \`go\` line.
- **Print from goroutines and expect an order.** Which clerk speaks first is not decided by the code. This course always places results by slot or sorts them, so the answers never depend on speed.

### Common mistakes

- Starting goroutines in a loop and writing to one shared variable (a **race**, next chapter).
- Passing a \`WaitGroup\` to a function by value: it must be shared, so pass \`&wg\`.
- Thinking more goroutines are always faster. They help when there is work that can overlap; they do not make one clerk's job shorter.`,
      mission: md`Welcome to **Tidewatch**, a line of six weather buoys that warn the harbour about storms. Every buoy radios in a batch of readings and the harbour office has to summarise each one before the next batch arrives. With one clerk the queue never clears.

The \`Reading\` and \`Summary\` types and the sea itself (\`readingsFor\`) are already in your file. Write \`summarize\`, do the six batches one after another, then do the same six at once with goroutines and a WaitGroup, and prove both ways give the same answers. When this lesson passes the **Control console** powers on and the **Buoy lanes** appear on the board.

### Your workspace, as in Cairn Depot

- Type in the middle panel. It holds **one program that grows**: each lesson adds to the same file, and the new part starts below a \`✏️ YOUR TURN\` comment.
- **Run** (Ctrl+Enter) builds and runs your program and shows what it printed in the Console. **Submit** (Ctrl+Shift+Enter) also runs the checks for this lesson. Each check turns green when it passes, and a red one tells you what it expected.
- A **red error** with a line number means Go could not build your program, or it crashed. The message names the line: fix that line and run again. Nothing is broken for good.
- The top of the file has a \`scene\` helper and a block marked *Course scaffold*. They are provided so Go accepts the file before each package is needed. Leave them alone.`,
      tasks: [
        "Write func summarize(buoy, n int) Summary: loop over readingsFor(buoy, n), count them, keep the tallest Wave in MaxWave and add every Wind into WindSum",
        "In main: const batch = 50 and oneByOne := make([]Summary, fleetSize), filled in a plain loop with oneByOne[i] = summarize(i+1, batch)",
        "Do it again at once: allAtOnce := make([]Summary, fleetSize), a sync.WaitGroup, and one goroutine per buoy that writes allAtOnce[i] (wg.Add(1) before the go line, defer wg.Done() inside); then wg.Wait()",
        "Compute same := fmt.Sprint(oneByOne) == fmt.Sprint(allAtOnce) and print: same answers both ways: true",
        "Send allAtOnce as \"lanes\", oneByOne as \"sequential\" and same as \"same\" with scene",
      ],
      starterAdd: skeleton(
        go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 1: write summarize here, below readingsFor.
//   func summarize(buoy, n int) Summary
//   loop over readingsFor(buoy, n): count them, keep the tallest Wave in MaxWave, add every Wind into WindSum
`,
        `	// Provided: the first line of output.
	fmt.Println("Tidewatch is listening to", fleetSize, "buoys")

	// ─── ✏️ YOUR TURN ───────────────────────────
	// Lesson 1: the same six batches, one at a time and then all at once.
	// 1. const batch = 50
	//    oneByOne := make([]Summary, fleetSize)
	//    for i := 0; i < fleetSize; i++ { oneByOne[i] = summarize(i+1, batch) }
	// 2. allAtOnce := make([]Summary, fleetSize)
	//    var wg sync.WaitGroup
	//    for i := 0; i < fleetSize; i++ {
	//        wg.Add(1)
	//        go func() { defer wg.Done(); allAtOnce[i] = summarize(i+1, batch) }()
	//    }
	//    wg.Wait()
	// 3. same := fmt.Sprint(oneByOne) == fmt.Sprint(allAtOnce)
	//    fmt.Println("same answers both ways:", same)
	// 4. scene("lanes", allAtOnce), scene("sequential", oneByOne), scene("same", same)`,
        `// ─── ✏️ YOUR TURN: lesson 1, scroll down to summarize and to func main ───────────────\n`,
      ),
      solutionAdd: skeleton(
        go`// summarize boils one buoy's batch of n readings down to a Summary.
func summarize(buoy, n int) Summary {
	s := Summary{Buoy: buoy}
	for _, r := range readingsFor(buoy, n) {
		s.Count++
		if r.Wave > s.MaxWave {
			s.MaxWave = r.Wave
		}
		s.WindSum += r.Wind
	}
	return s
}
`,
        `	// Provided: the first line of output.
	fmt.Println("Tidewatch is listening to", fleetSize, "buoys")

	// Lesson 1: the same six batches, one at a time and then all at once.
	const batch = 50
	oneByOne := make([]Summary, fleetSize)
	for i := 0; i < fleetSize; i++ {
		oneByOne[i] = summarize(i+1, batch)
	}

	allAtOnce := make([]Summary, fleetSize)
	var wg sync.WaitGroup
	for i := 0; i < fleetSize; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			allAtOnce[i] = summarize(i+1, batch) // each goroutine writes only its own slot
		}()
	}
	wg.Wait()

	same := fmt.Sprint(oneByOne) == fmt.Sprint(allAtOnce)
	fmt.Println("same answers both ways:", same)
	scene("lanes", allAtOnce)
	scene("sequential", oneByOne)
	scene("same", same)`,
        ``,
      ),
      explanation:
        "summarize is ordinary sequential code. The concurrent loop starts one goroutine per buoy; each writes only allAtOnce[i], so no two goroutines touch the same memory, and wg.Wait() stops main from finishing before they do. Because the answers are placed by index, the order the goroutines finish in does not matter and both slices are identical.",
      hints: [
        { id: "h1", title: "summarize", content: "Start with s := Summary{Buoy: buoy}. Inside for _, r := range readingsFor(buoy, n): s.Count++, then if r.Wave > s.MaxWave { s.MaxWave = r.Wave }, then s.WindSum += r.Wind. Finish with return s." },
        { id: "h2", title: "The goroutine loop", content: "for i := 0; i < fleetSize; i++ { wg.Add(1); go func() { defer wg.Done(); allAtOnce[i] = summarize(i+1, batch) }() } and then wg.Wait() after the loop. Declare var wg sync.WaitGroup before the loop." },
        { id: "h3", title: "Comparing and sending", content: "same := fmt.Sprint(oneByOne) == fmt.Sprint(allAtOnce) turns both slices into text and compares the text. Then fmt.Println(\"same answers both ways:\", same) and three scene calls: \"lanes\", \"sequential\", \"same\"." },
      ],
      tests: [
        {
          id: "t1",
          description: "summarize boils a batch down correctly",
          assertionCode: js`${READ}
assert(Array.isArray(scene.sequential), "Send the one-at-a-time answers with scene(\"sequential\", oneByOne).");
assertEqual(scene.sequential.length, 6, "sequential (one Summary per buoy)");
for (let b = 1; b <= 6; b++) {
  assertEqual(scene.sequential[b - 1], summaryOf(b, 50), "the Summary for buoy " + b + " (count the 50 readings, keep the tallest wave, add every wind speed)");
}`,
        },
        {
          id: "t2",
          description: "every goroutine filled its own slot",
          assertionCode: js`${READ}
assert(Array.isArray(scene.lanes), "Send the goroutine answers with scene(\"lanes\", allAtOnce).");
assertEqual(scene.lanes.length, 6, "lanes (one Summary per buoy)");
for (let b = 1; b <= 6; b++) {
  assertEqual(scene.lanes[b - 1], summaryOf(b, 50), "lanes slot " + (b - 1) + " (the goroutine for buoy " + b + " should write allAtOnce[" + (b - 1) + "]; did wg.Wait() run before reading the slice?)");
}`,
        },
        {
          id: "t3",
          description: "both ways agree, and you said so",
          assertionCode: js`
assertEqual(scene.same, true, "same (the two slices should be identical)");
assert(stdout.includes("same answers both ways: true"), "Print: same answers both ways: true");`,
        },
      ],
      unlocks: ["gp-console", "gp-lanes"],
      checks: [
        {
          prompt: "What happens if you delete `wg.Wait()` and run the program?",
          question: {
            type: "choice",
            options: ["Nothing changes", "main may finish first, so the program can end with the slice still empty", "A compile error", "The goroutines run twice"],
            answer: 1,
          },
          explanation: "A goroutine does not keep the program alive. When main returns the whole program stops, even if clerks are still working. wg.Wait() is how main says: stay here until everyone has finished.",
        },
        {
          prompt: "Three clerks each take 1 tick on separate batches and work at the same time. How many ticks until all three are done?",
          question: { type: "number", answer: 1 },
          explanation: "They overlap: all three start at tick 1 and all finish at tick 1. With one clerk it would be 3 ticks.",
        },
      ],
    },

    // ───────────────────────── 2 ─────────────────────────
    {
      id: "go-pipeline-2-channels",
      title: "Handing things over: channels",
      minutes: 35,
      xp: 140,
      concepts: ["channel", "send and receive", "blocking", "close", "range over a channel", "v, ok := <-ch", "receive-only channel type"],
      learn: md`### The hatch in the wall

Last time every clerk wrote into their own drawer and \`main\` read the drawers at the end. But the harbour office wants to read each reading **as it arrives**, not after the whole batch. The buoy and the office need a way to pass things to each other while both are working.

Go's answer is a **channel**: a hatch in the wall between two rooms. One side pushes an item through, the other side takes it out. A channel has a type, the type of thing that travels through it: \`chan Reading\` carries readings.

~~~go
hatch := make(chan string)   // a hatch for strings
hatch <- "ping"              // SEND: push "ping" in
msg := <-hatch               // RECEIVE: take one out
~~~

The arrow shows the way the data moves: \`hatch <- x\` puts x into the hatch, \`<-hatch\` takes a value out of it.

### An empty hatch makes you wait

This is the important rule. A plain channel made with \`make(chan T)\` has **no room to store anything**. It is a hand-to-hand pass:

- a **send** waits until somebody is ready to receive;
- a **receive** waits until somebody is ready to send.

Waiting like this is called **blocking**. A blocked goroutine just sleeps until its partner shows up. Look at this program and its exact output:

~~~go
func main() {
	hatch := make(chan string)
	go func() {
		fmt.Println("buoy: sending ping")
		hatch <- "ping"
	}()
	msg := <-hatch
	fmt.Println("office: got", msg)
}
~~~

Who does what, and when:

| step | buoy goroutine | main (the office) |
| --- | --- | --- |
| 1 | starts, prints "sending ping" | reaches \`<-hatch\`, nothing there, **sleeps** |
| 2 | \`hatch <- "ping"\`: main is waiting, so the hand-over happens | wakes up holding "ping" |
| 3 | its job is done | prints "got ping" |

~~~text
buoy: sending ping
office: got ping
~~~

The buoy's first line always comes first, because the send (which comes after it) is what wakes main up.

### Closing a channel: "that is all"

How does the office know the buoy has no more readings? The sender **closes** the channel with \`close(ch)\`. Then:

- \`for r := range ch { ... }\` takes values one by one and ends by itself when the channel is closed and empty;
- a receive on a closed channel does not wait. It returns the zero value at once, and \`v, ok := <-ch\` sets \`ok\` to \`false\` so you can tell.

Rules of thumb: **only the sender closes**, closing is optional unless a receiver is waiting for "that is all", and sending on a closed channel crashes the program.

### A function that returns a channel

The neatest shape is a function that starts a goroutine, hands back the channel, and lets the caller range over it:

~~~go
func tide() <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for i := 1; i <= 3; i++ {
			out <- i * 10
		}
	}()
	return out
}

func main() {
	for v := range tide() {
		fmt.Println(v)
	}
}
~~~

~~~text
10
20
30
~~~

The result type \`<-chan int\` reads "a channel you can only **receive** from". The caller cannot send into it or close it by mistake. Inside the function \`out\` is a normal two-way channel.

### Deadlock, in plain words

If every goroutine is asleep waiting for something nobody will ever give, the program is stuck forever. Go notices and stops with this message:

~~~text
fatal error: all goroutines are asleep - deadlock!
~~~

For example, \`ch := make(chan int); ch <- 1\` in \`main\` with nobody receiving: the send waits for a receiver that does not exist. And if you \`range\` over a channel nobody ever closes, the loop waits for the "that is all" that never comes.

### Common mistakes

- Sending and receiving in the **same** goroutine on an unbuffered channel (nobody is on the other side).
- Forgetting to \`close\`, so \`range\` never ends.
- Closing from the receiving side, or closing twice (a crash).`,
      mission: md`The harbour office no longer wants to wait for a whole batch. It wants to read each reading as the buoy sends it. You will turn buoy 3's batch into a stream: a goroutine pushes readings through a channel and the office takes them one by one.

Write \`stream\`, collect the first six waves from it, and also prove what a closed channel tells a receiver. When this lesson passes the **Stream hatch** lights up on the board.`,
      tasks: [
        "Write func stream(buoy, n int) <-chan Reading: make an unbuffered channel, start a goroutine that sends each of readingsFor(buoy, n) and then closes the channel (defer close), and return the channel",
        "In main: loop over stream(3, 6) with range and collect each reading's Wave into waves; also add them into streamTotal and keep the largest in streamPeak",
        "Make a closed channel: closed := make(chan Reading); close(closed); then _, stillOpen := <-closed",
        "Send waves, streamTotal, streamPeak and stillOpen with scene (as \"waves\", \"streamTotal\", \"streamPeak\", \"stillOpen\")",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 2: write stream here.
//   func stream(buoy, n int) <-chan Reading
//   a goroutine sends every reading of readingsFor(buoy, n) into an unbuffered channel, then closes it

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 2: read buoy 3's first six readings as they arrive.
//   var waves []int ; streamTotal := 0 ; streamPeak := 0
//   for r := range stream(3, 6) { ...append r.Wave, add to streamTotal, update streamPeak... }
//   closed := make(chan Reading) ; close(closed) ; _, stillOpen := <-closed
//   scene("waves", waves), scene("streamTotal", streamTotal), scene("streamPeak", streamPeak), scene("stillOpen", stillOpen)`,
      solutionAdd: go`// stream sends one buoy's readings down a channel as if they were arriving by radio,
// then closes the channel to say "that is all".
func stream(buoy, n int) <-chan Reading {
	out := make(chan Reading)
	go func() {
		defer close(out)
		for _, r := range readingsFor(buoy, n) {
			out <- r
		}
	}()
	return out
}

${MAIN_DIVIDER}

// Lesson 2: read buoy 3's first six readings as they arrive.
var waves []int
streamTotal, streamPeak := 0, 0
for r := range stream(3, 6) {
	waves = append(waves, r.Wave)
	streamTotal += r.Wave
	if r.Wave > streamPeak {
		streamPeak = r.Wave
	}
}
fmt.Println("buoy 3 waves, in order:", waves)

closed := make(chan Reading)
close(closed)
_, stillOpen := <-closed
fmt.Println("receive from a closed channel says ok =", stillOpen)

scene("waves", waves)
scene("streamTotal", streamTotal)
scene("streamPeak", streamPeak)
scene("stillOpen", stillOpen)`,
      explanation:
        "stream starts a goroutine that sends each reading and closes the channel when it runs out. The channel is unbuffered, so every send waits for main's receive: the two sides hand readings over one at a time, in order. range ends by itself because the channel is closed. A receive from a closed, empty channel never waits: it returns a zero Reading and ok = false.",
      hints: [
        { id: "h1", title: "stream", content: "out := make(chan Reading), then go func() { defer close(out); for _, r := range readingsFor(buoy, n) { out <- r } }() and finally return out. The return type <-chan Reading accepts a plain chan Reading." },
        { id: "h2", title: "Collecting", content: "for r := range stream(3, 6) { waves = append(waves, r.Wave); streamTotal += r.Wave; if r.Wave > streamPeak { streamPeak = r.Wave } }. range stops by itself when stream closes the channel." },
        { id: "h3", title: "The closed channel", content: "closed := make(chan Reading); close(closed); _, stillOpen := <-closed. The second value is false because the channel is closed and empty. Then four scene calls." },
      ],
      tests: [
        {
          id: "t1",
          description: "the readings arrive in order",
          assertionCode: js`${READ}
const expected = readingsFor(3, 6).map((r) => r.Wave);
assert(Array.isArray(scene.waves), "Send the waves you collected with scene(\"waves\", waves).");
assertEqual(scene.waves, expected, "waves (buoy 3's first six readings, in the order they were sent; make sure stream sends readingsFor(buoy, n) and closes the channel)");`,
        },
        {
          id: "t2",
          description: "total and peak are worked out from the stream",
          assertionCode: js`${READ}
const w = readingsFor(3, 6).map((r) => r.Wave);
assertEqual(scene.streamTotal, w.reduce((a, b) => a + b, 0), "streamTotal (all six waves added together)");
assertEqual(scene.streamPeak, Math.max(...w), "streamPeak (the tallest of the six waves)");`,
        },
        {
          id: "t3",
          description: "a closed channel reports ok = false",
          assertionCode: js`
assertEqual(scene.stillOpen, false, "stillOpen (a receive from a closed, empty channel returns ok = false)");`,
        },
      ],
      unlocks: ["gp-stream"],
      checks: [
        {
          prompt: "On an unbuffered channel, what does `ch <- x` do when nobody is receiving yet?",
          question: {
            type: "choice",
            options: ["Drops x", "Stores x and moves on", "Waits (blocks) until somebody receives", "Crashes immediately"],
            answer: 2,
          },
          explanation: "An unbuffered channel is a hand-to-hand pass: the sender sleeps until a receiver shows up. If none ever does, that is a deadlock.",
        },
        {
          prompt: "Who should call `close(ch)`: the goroutine that sends, or the one that receives?",
          question: { type: "choice", options: ["The sender", "The receiver"], answer: 0 },
          explanation: "The sender knows when there is nothing more to send. Closing from the receiving side risks a sender trying to send on a closed channel, which crashes the program.",
        },
      ],
    },

    // ───────────────────────── 3 ─────────────────────────
    {
      id: "go-pipeline-3-buffers",
      title: "Waiting rooms: buffered channels",
      minutes: 35,
      xp: 140,
      concepts: ["buffered channel", "len and cap", "queue depth", "result channel sized to the work", "goroutine leak", "sorting collected results"],
      learn: md`### A hatch with a shelf

An unbuffered channel makes the sender and the receiver meet. That keeps them in step, but it also means a fast buoy has to wait for a slow office on **every** reading.

Add a shelf to the hatch and the sender can drop several items on it and walk away. The shelf is a **buffer**. You give its size when you make the channel:

~~~go
inbox := make(chan Reading, 4)   // a hatch with a shelf for 4 readings
~~~

The rules become:

- a **send** only waits when the shelf is **full**;
- a **receive** only waits when the shelf is **empty**.

Two built-in functions describe the shelf. \`cap(inbox)\` is its size (4). \`len(inbox)\` is how many readings are on it right now. We call \`len\` the **queue depth**: how long the line is.

Here is a program with its exact output:

~~~go
func main() {
	inbox := make(chan string, 3)
	inbox <- "a"
	inbox <- "b"
	fmt.Println("waiting:", len(inbox), "of", cap(inbox))
	fmt.Println("took", <-inbox)
	fmt.Println("waiting:", len(inbox), "of", cap(inbox))
}
~~~

~~~text
waiting: 2 of 3
took a
waiting: 1 of 3
~~~

No second goroutine was needed: both sends fit on the shelf, so \`main\` never had to wait. Items come out in the order they went in (first in, first out).

### A trace of a full shelf

Shelf size 2, a sender with 3 items, nobody receiving yet:

| step | action | shelf after | sender |
| --- | --- | --- | --- |
| 1 | send item 1 | [1] | carries on |
| 2 | send item 2 | [1, 2] | carries on |
| 3 | send item 3 | [1, 2] full | **blocks** |
| 4 | someone receives | [2] then [2, 3] | wakes, item 3 goes on the shelf |

### Deadlock and leaks, in plain words

- **Deadlock**: in step 3 above, if the sender is \`main\` and nobody will ever receive, the program freezes and Go prints \`all goroutines are asleep - deadlock!\`.
- **Goroutine leak**: a goroutine blocked forever on a channel nobody uses any more. It is not a crash. It is a clerk sleeping at a window nobody visits, using memory until the program ends. In a long-running service, thousands of them add up.

### The shelf that prevents leaks

Suppose six clerks each finish a summary and want to hand it in. If the results channel is **unbuffered**, each clerk blocks until someone receives, and if \`main\` is busy waiting for the WaitGroup, nobody ever does: a deadlock. The fix is a shelf with room for **every** result:

~~~go
results := make(chan Summary, fleetSize) // room for all six, so no clerk ever waits
~~~

Then the pattern is: start the clerks, \`wg.Wait()\`, \`close(results)\`, and \`range results\` to collect. Because the clerks finish in any order, the shelf holds the summaries in **arrival order**, which changes from run to run. When a program's answer must not change, **sort** what you collected:

~~~go
sort.Slice(list, func(a, b int) bool { return list[a].Buoy < list[b].Buoy })
~~~

(\`sort.Slice\` takes the slice and a function that says whether item \`a\` goes before item \`b\`.)

### Picking a size

A bigger shelf smooths out bursts but hides a slow receiver for longer and uses more memory. Size it for a reason ("one slot per clerk", "a minute of readings"), not "to make the blocking go away".

### Common mistakes

- Making a huge buffer to dodge a deadlock instead of finding out who should be receiving.
- Assuming a buffered channel keeps results in a useful order when several goroutines send.
- Closing the results channel **before** \`wg.Wait()\` has returned: a late clerk would send on a closed channel and crash.`,
      mission: md`The harbour office is slower than the radio. Readings arrive faster than it can read them, so it needs a waiting room, and it needs to know how long the queue is.

First fill a small inbox with buoy 1's readings and watch the queue depth. Then let six clerks hand their summaries in through a results shelf and collect them in a fixed order. When this lesson passes the **Waiting room** lights up on the board.`,
      tasks: [
        "Make inbox := make(chan Reading, 4) and send the first four readings of buoy 1 from main (no goroutine: the shelf has room); record filled := len(inbox) and room := cap(inbox) - len(inbox)",
        "Take two readings out with <-inbox, keeping the first one's Wave as firstWave, then record waiting := len(inbox)",
        "Make results := make(chan Summary, fleetSize); start one goroutine per buoy that sends summarize(i+1, 30); wg.Wait(), then close(results)",
        "Range over results into a slice and sort it by Buoy with sort.Slice, calling it collected",
        "Send queue (a map[string]int with keys \"cap\", \"filled\", \"room\", \"waiting\", \"firstWave\") and collected with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 3 needs no new functions. Everything happens in main, below.

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 3: a buffered inbox, then a results shelf.
//   inbox := make(chan Reading, 4)  ; send readingsFor(1, 4) into it from main
//   filled := len(inbox) ; room := cap(inbox) - len(inbox)
//   first := <-inbox ; <-inbox ; firstWave := first.Wave ; waiting := len(inbox)
//   results := make(chan Summary, fleetSize) ; six goroutines send summarize(i+1, 30)
//   wg.Wait() ; close(results) ; range results into collected ; sort.Slice by Buoy
//   scene("queue", map[string]int{"cap": ..., "filled": ..., "room": ..., "waiting": ..., "firstWave": ...})
//   scene("collected", collected)`,
      solutionAdd: go`${MAIN_DIVIDER}

// Lesson 3: a buffered inbox, then a results shelf.
inbox := make(chan Reading, 4)
for _, r := range readingsFor(1, 4) {
	inbox <- r // the shelf has room for all four, so main never waits
}
filled := len(inbox)
room := cap(inbox) - len(inbox)
first := <-inbox
<-inbox
firstWave := first.Wave
waiting := len(inbox)
fmt.Println("inbox: filled", filled, "room", room, "after taking two,", waiting, "wait")

results := make(chan Summary, fleetSize)
var shelfWG sync.WaitGroup
for i := 0; i < fleetSize; i++ {
	shelfWG.Add(1)
	go func() {
		defer shelfWG.Done()
		results <- summarize(i+1, 30)
	}()
}
shelfWG.Wait()
close(results)

var collected []Summary
for s := range results {
	collected = append(collected, s)
}
sort.Slice(collected, func(a, b int) bool { return collected[a].Buoy < collected[b].Buoy })
fmt.Println("collected buoys:", len(collected), "first max wave:", collected[0].MaxWave)

scene("queue", map[string]int{"cap": cap(inbox), "filled": filled, "room": room, "waiting": waiting, "firstWave": firstWave})
scene("collected", collected)`,
      explanation:
        "A channel with a buffer of 4 accepts four sends without a receiver, so main fills it and reads len and cap: 4 waiting, 0 room. Taking two leaves 2. The results channel has one slot per clerk, so no clerk ever blocks, which lets wg.Wait() return before anybody receives. Only then is the channel closed and drained. The clerks send in whatever order they finish, so the collected slice is sorted by Buoy to give the same answer every run.",
      hints: [
        { id: "h1", title: "The inbox", content: "inbox := make(chan Reading, 4); for _, r := range readingsFor(1, 4) { inbox <- r }. filled := len(inbox), room := cap(inbox) - len(inbox). Receiving: first := <-inbox, then <-inbox on its own line to discard the second one." },
        { id: "h2", title: "The results shelf", content: "results := make(chan Summary, fleetSize); a new WaitGroup (the first one is in lesson 1, so use a new name such as shelfWG); for each i: Add(1), go func() { defer Done(); results <- summarize(i+1, 30) }(). Then Wait(), then close(results)." },
        { id: "h3", title: "Collecting and sorting", content: "for s := range results { collected = append(collected, s) } and then sort.Slice(collected, func(a, b int) bool { return collected[a].Buoy < collected[b].Buoy }). The queue map needs int values only." },
      ],
      tests: [
        {
          id: "t1",
          description: "the inbox shelf fills and drains as expected",
          assertionCode: js`${READ}
assert(scene.queue && typeof scene.queue === "object", "Send the queue numbers with scene(\"queue\", map[string]int{...}).");
assertEqual(scene.queue.cap, 4, "queue.cap (the shelf holds 4 readings)");
assertEqual(scene.queue.filled, 4, "queue.filled (all four readings were sent, none received yet: len(inbox))");
assertEqual(scene.queue.room, 0, "queue.room (cap(inbox) - len(inbox) when the shelf is full)");
assertEqual(scene.queue.waiting, 2, "queue.waiting (after two readings were taken out)");
assertEqual(scene.queue.firstWave, readingsFor(1, 4)[0].Wave, "queue.firstWave (the Wave of the first reading that was sent, since a channel is first in, first out)");`,
        },
        {
          id: "t2",
          description: "six clerks hand in six summaries, sorted by buoy",
          assertionCode: js`${READ}
assert(Array.isArray(scene.collected), "Send the sorted summaries with scene(\"collected\", collected).");
assertEqual(scene.collected.length, 6, "collected (one Summary per buoy; make the results channel big enough for all six)");
for (let b = 1; b <= 6; b++) {
  assertEqual(scene.collected[b - 1], summaryOf(b, 30), "collected[" + (b - 1) + "] (the Summary for buoy " + b + " with 30 readings; sort by Buoy so the order never changes)");
}`,
        },
      ],
      unlocks: ["gp-queue"],
      checks: [
        {
          prompt: "A channel has capacity 3 and 3 items on it. What does a 4th send do when nobody is receiving?",
          question: { type: "choice", options: ["Drops the item", "Blocks until there is room", "Grows the shelf", "Panics"], answer: 1 },
          explanation: "The shelf is full, so the sender sleeps. If nobody ever receives, that is a deadlock (or, in a long-running program, a leaked goroutine).",
        },
        {
          prompt: "Why do we sort `collected` before showing it?",
          question: {
            type: "choice",
            options: ["Channels always sort their items", "The clerks finish in a different order each run, so the arrival order changes", "sort.Slice makes the program faster", "It is required for close()"],
            answer: 1,
          },
          explanation: "Which clerk finishes first is not decided by the code. Sorting by a stable key (the buoy number) makes the answer the same every time.",
        },
      ],
    },

    // ───────────────────────── 4 ─────────────────────────
    {
      id: "go-pipeline-4-select",
      title: "Choosing what to wait for: select",
      minutes: 35,
      xp: 150,
      concepts: ["select", "default case", "non-blocking send", "shedding load", "stop channel", "chan struct{}"],
      learn: md`### Two phones on the desk

So far a goroutine waited for **one** thing. Real offices wait for several: the radio might crackle, or the boss might say "go home". A clerk staring at one phone would miss the other.

\`select\` is "wait for whichever happens first". It looks like a \`switch\`, but every case is a channel operation:

~~~go
select {
case r := <-radio:   // a reading arrived
	fmt.Println("reading", r.Wave)
case <-stop:         // the stop channel was closed
	fmt.Println("going home")
}
~~~

The goroutine sleeps until one of the cases can go ahead, then runs **that one** case. A closed channel is always ready to receive from, which makes a closed channel a handy way to shout "stop" at many goroutines at once.

If **several** cases are ready at the same moment, Go picks one at random. So never write a program whose answer depends on which one it picks. Design it so only one case can be ready at a time, as in the example below.

### default: do not wait at all

Add a \`default\` case and \`select\` never sleeps. If no other case is ready right now, \`default\` runs immediately:

~~~go
select {
case shelf <- r:        // there was room
	return true
default:                // shelf full: do not wait, give up
	return false
}
~~~

This is a **non-blocking send**. It is how a busy office sheds load: when the inbox is full, new readings are turned away (and counted) instead of making the radio wait.

A tiny complete example with its exact output:

~~~go
func main() {
	shelf := make(chan int, 2)
	for n := 1; n <= 4; n++ {
		select {
		case shelf <- n:
			fmt.Println(n, "accepted")
		default:
			fmt.Println(n, "turned away")
		}
	}
}
~~~

~~~text
1 accepted
2 accepted
3 turned away
4 turned away
~~~

Nobody is receiving, so after two items the shelf is full and \`default\` runs.

### A stop channel

A channel that only carries "now" and never any data is written \`chan struct{}\` (\`struct{}\` is a type with no fields, taking no memory). You close it to announce something. Here is the shape of a listener:

~~~go
func listen(data <-chan Reading, stop <-chan struct{}) []int {
	var waves []int
	for {
		select {
		case r := <-data:
			waves = append(waves, r.Wave)
		case <-stop:
			return waves
		}
	}
}
~~~

\`for { ... }\` loops forever; the \`return\` inside \`select\` is the only way out.

### Why this one is predictable

Imagine the sender pushes five readings through an **unbuffered** \`data\` channel and only then closes \`stop\`. A send on an unbuffered channel finishes only when the listener has taken the value. So by the time \`stop\` is closed, all five readings are already in the listener's hands, and when it loops, only \`stop\` can be ready. No guesswork, and the same answer on every run.

| step | sender | listener |
| --- | --- | --- |
| 1-5 | sends reading k, waits to be taken | \`select\` takes it, appends the wave |
| 6 | all five taken: \`close(stop)\` | back at \`select\`: data has nobody sending, stop is closed |
| 7 | goroutine ends | the stop case runs and returns the waves |

### Common mistakes

- Closing \`stop\` while a sender might still be sending: some readings may be lost, and which ones changes run to run.
- Putting \`default\` in a loop that polls: the goroutine spins and burns the whole processor. Use \`default\` for "try once", not for "keep checking".
- A \`select\` with a single case and no default: that is just a plain send or receive.`,
      mission: md`Two things go wrong at the harbour office. When the inbox is full, new readings must be turned away and counted instead of making the radio wait. And the listener must be able to stop cleanly when the radio goes quiet, even though it is also waiting for readings.

Write \`offer\` (a non-blocking send) and \`listen\` (data or stop). When this lesson passes the **Switchboard** lights up on the board.`,
      tasks: [
        "Write func offer(ch chan Reading, r Reading) bool: a select that sends r on ch and returns true, or has a default case that returns false",
        "Write func listen(data <-chan Reading, stop <-chan struct{}) []int: loop forever with a select that appends each received reading's Wave, and returns the collected waves when stop is closed",
        "In main: tiny := make(chan Reading, 3) and offer the first six readings of buoy 5; count accepted and shed, and collect the Seq of every shed reading into shedSeqs",
        "Start a goroutine that sends buoy 2's first five readings on an unbuffered data channel and then closes a stop channel (make(chan struct{})); call listen(data, stop) and keep the result as heard",
        "Send shed (a map[string]any with \"accepted\", \"shed\" and \"shedSeqs\") and heard with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 4: write these two functions.
//   func offer(ch chan Reading, r Reading) bool          select with a send case and a default
//   func listen(data <-chan Reading, stop <-chan struct{}) []int   for { select { data / stop } }

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 4: shed load, then listen until stop.
//   tiny := make(chan Reading, 3)
//   offer each of readingsFor(5, 6): count accepted, count shed, collect shed Seq numbers in shedSeqs
//   data := make(chan Reading) ; stop := make(chan struct{})
//   go func() { send readingsFor(2, 5) on data ; close(stop) }()
//   heard := listen(data, stop)
//   scene("shed", map[string]any{"accepted": ..., "shed": ..., "shedSeqs": shedSeqs}), scene("heard", heard)`,
      solutionAdd: go`// offer tries to put r on the shelf without waiting. It reports whether there was room.
func offer(ch chan Reading, r Reading) bool {
	select {
	case ch <- r:
		return true
	default:
		return false
	}
}

// listen collects wave heights until the stop channel is closed.
func listen(data <-chan Reading, stop <-chan struct{}) []int {
	var waves []int
	for {
		select {
		case r := <-data:
			waves = append(waves, r.Wave)
		case <-stop:
			return waves
		}
	}
}

${MAIN_DIVIDER}

// Lesson 4: shed load, then listen until stop.
tiny := make(chan Reading, 3)
accepted, shed := 0, 0
shedSeqs := []int{}
for _, r := range readingsFor(5, 6) {
	if offer(tiny, r) {
		accepted++
	} else {
		shed++
		shedSeqs = append(shedSeqs, r.Seq)
	}
}
fmt.Println("shelf of 3 took", accepted, "and turned away", shed)

data := make(chan Reading)
stop := make(chan struct{})
go func() {
	for _, r := range readingsFor(2, 5) {
		data <- r
	}
	close(stop) // only after the last reading has been taken
}()
heard := listen(data, stop)
fmt.Println("listener heard", len(heard), "readings")

scene("shed", map[string]any{"accepted": accepted, "shed": shed, "shedSeqs": shedSeqs})
scene("heard", heard)`,
      explanation:
        "offer's select has one send case and a default. With room it sends and returns true; with a full shelf default runs at once and returns false. Nobody receives from tiny, so the first three readings fit and readings 4, 5 and 6 are turned away. In listen the sender finishes all five unbuffered sends (each waits for listen to take it) before it closes stop, so when the loop next reaches select only the stop case can be ready and all five waves have been heard, in order.",
      hints: [
        { id: "h1", title: "offer", content: "select { case ch <- r: return true; default: return false }. Write it on several lines. The channel parameter must be a plain chan Reading because you send on it." },
        { id: "h2", title: "listen", content: "var waves []int; for { select { case r := <-data: waves = append(waves, r.Wave); case <-stop: return waves } }. The parameter types <-chan Reading and <-chan struct{} mean receive-only." },
        { id: "h3", title: "main", content: "Loop over readingsFor(5, 6): if offer(tiny, r) { accepted++ } else { shed++; shedSeqs = append(shedSeqs, r.Seq) }. Start the sender goroutine with go func() { for _, r := range readingsFor(2, 5) { data <- r }; close(stop) }() before calling listen. Start shedSeqs as []int{} so it is sent as a list." },
      ],
      tests: [
        {
          id: "t1",
          description: "offer turns readings away when the shelf is full",
          assertionCode: js`
assert(scene.shed && typeof scene.shed === "object", "Send the counts with scene(\"shed\", map[string]any{...}).");
assertEqual(scene.shed.accepted, 3, "shed.accepted (the shelf holds 3)");
assertEqual(scene.shed.shed, 3, "shed.shed (readings 4, 5 and 6 find the shelf full)");
assertEqual(scene.shed.shedSeqs, [4, 5, 6], "shed.shedSeqs (the Seq numbers of the readings that were turned away)");`,
        },
        {
          id: "t2",
          description: "listen hears every reading, then stops",
          assertionCode: js`${READ}
assert(Array.isArray(scene.heard), "Send what the listener heard with scene(\"heard\", heard).");
assertEqual(scene.heard, readingsFor(2, 5).map((r) => r.Wave), "heard (buoy 2's five waves in order; the sender must close(stop) only after its last send)");`,
        },
      ],
      unlocks: ["gp-select"],
      checks: [
        {
          prompt: "What does `default` do in a `select`?",
          question: {
            type: "choice",
            options: ["Runs when the other cases fail with an error", "Runs immediately if no other case is ready, so select never waits", "Runs after every other case", "Picks a random case"],
            answer: 1,
          },
          explanation: "With a default case, select checks once and never sleeps. That is a non-blocking try.",
        },
        {
          prompt: "Two cases of a `select` are ready at the same moment. Which runs?",
          question: { type: "choice", options: ["The first one written", "The last one written", "One of them, chosen at random", "Both"], answer: 2 },
          explanation: "Go chooses at random on purpose, so no case can starve another. That is why the course designs every select so only one case can be ready when the answer matters.",
        },
      ],
    },
  ],
};
