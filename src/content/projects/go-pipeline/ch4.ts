import type { Chapter } from "@/engine/types";
import { go, js, md, MAIN_DIVIDER, READ } from "./util.ts";

/**
 * Chapter 4: Stopping cleanly. context cancellation, timeouts and deadlines, an errgroup-style helper
 * built by hand, and a graceful shutdown that loses nothing.
 *
 * Determinism notes: cancellation is always triggered by the program itself at a fixed point (after five
 * readings, after a fixed number of sends), never by a clock race. The two real timeouts guard a call that
 * can never complete (a silent buoy) with a generous 250 ms limit, against calls that finish instantly,
 * so the outcome is the same on a slow machine. Nothing prints or compares "how many were produced before
 * the cancel was noticed", because that number is not decided by the code.
 */

export const chapter4: Chapter = {
  id: "stopping-cleanly",
  title: "Stopping cleanly",
  blurb: "Cancel work nobody needs, give up on a silent buoy, collect errors from many goroutines and shut a whole pipeline down without losing a reading.",
  lessons: [
    // ───────────────────────── 13 ─────────────────────────
    {
      id: "go-pipeline-13-cancel",
      title: "Cancelling work: context",
      minutes: 35,
      xp: 160,
      concepts: ["context.Context", "WithCancel", "ctx.Done()", "ctx.Err()", "defer cancel()", "stopping a producer", "draining to prove it stopped"],
      learn: md`### "Never mind, stop"

The forecaster asked for buoy 6's readings and then changed her mind after five of them. But your stream was ready to send ten thousand. Who tells it to stop? If nobody does, the goroutine sits blocked on its next send forever: a **leak**, just like the unfinished pipelines in lesson 9.

Go's standard answer is a **context**. A \`context.Context\` is a small object that is passed down from the code that starts work to the code that does it. It carries one signal: *"this work is no longer wanted"*. You create one with a cancel button:

~~~go
ctx, cancel := context.WithCancel(context.Background())
defer cancel()    // always: releases resources, even if you never press it
~~~

- \`context.Background()\` is the empty starting context ("no limits").
- \`cancel()\` is the button. Pressing it (once or many times, it is safe) **cancels** the context.
- \`ctx.Done()\` is a channel that is **closed** when the context is cancelled. You already know what a closed channel means to a \`select\`: it is always ready.
- \`ctx.Err()\` tells you why: \`nil\` while the work is wanted, \`context.Canceled\` after you pressed the button.

### Making a worker listen

Every blocking place in the worker becomes a \`select\` between its real job and the \`Done\` channel:

~~~go
func streamCtx(ctx context.Context, buoy, n int) <-chan Reading {
	out := make(chan Reading)
	go func() {
		defer close(out)
		for _, r := range readingsFor(buoy, n) {
			select {
			case out <- r:       // normal: hand the reading over
			case <-ctx.Done():   // cancelled: stop at once
				return
			}
		}
	}()
	return out
}
~~~

Convention: \`ctx\` is the **first parameter** of a function and is called \`ctx\`. Never store it in a struct.

A tiny complete example and its exact output:

~~~go
ctx, cancel := context.WithCancel(context.Background())
fmt.Println("before:", ctx.Err())
cancel()
<-ctx.Done()                      // returns at once: Done is closed
fmt.Println("after:", ctx.Err())
~~~

~~~text
before: <nil>
after: context canceled
~~~

### How do you know the producer really stopped?

After \`cancel()\`, the producer notices at its next \`select\`. One reading may already be on its way. To **prove** it has finished, drain the channel until it closes. The producer closes its channel as its very last act (\`defer close(out)\`), so the drain loop can only end once the producer has returned:

~~~go
cancel()
for range feed {
	// throw away whatever was in flight
}
// reaching this line means the producer has stopped
~~~

How many readings are thrown away (zero or one) is not decided by the code, so we never print it. The fact that the loop **ends** is what we rely on.

### Who does what, and when

| step | consumer (main) | producer goroutine |
| --- | --- | --- |
| 1-5 | receives five readings | sends five readings |
| 6 | calls \`cancel()\` | blocked in \`select\`, sees \`Done\` is closed, returns, \`close(out)\` runs |
| 7 | \`for range feed\` ends | gone |

### Rules

- **Whoever creates the context calls \`cancel\`**, usually with \`defer cancel()\`.
- Cancelling a **parent** context cancels all contexts made from it. That is how one signal reaches a whole tree of goroutines.
- A function that takes a context must actually look at it (\`select\` on \`Done()\`, or pass it on). A function that ignores it cannot be stopped.

### Common mistakes

- Forgetting \`defer cancel()\`: go vet complains, and timers or goroutines tied to the context linger.
- Checking \`ctx.Done()\` only at the top of a long loop body, so one slow step ignores the cancel.
- Using \`==\` to compare errors from a wrapped context error. Use \`errors.Is(err, context.Canceled)\` (lesson 14).`,
      mission: md`The forecaster asked for buoy 6's recent readings and then changed her mind after the fifth. Your stream could go on for ten thousand. Time to give it a stop button.

Write \`streamCtx\`, take five readings, cancel, and prove the producer has really stopped by draining its channel. When this lesson passes the **Cancelled work** panel lights up on the board.`,
      tasks: [
        "Write func streamCtx(ctx context.Context, buoy, n int) <-chan Reading: like stream, but every send is a select between out <- r and <-ctx.Done() (return on Done)",
        "In main: ctx, cancel := context.WithCancel(context.Background()) and defer cancel(); feed := streamCtx(ctx, 6, 10000)",
        "Take readings from feed with range, appending each Wave to got, and when len(got) == 5 call cancel() and break",
        "Drain the rest with: for range feed {} and set stopped := true after the loop (it only ends once the producer has closed the channel)",
        "Send cancel (a map[string]any with \"asked\" = 10000, \"took\" = len(got), \"waves\" = got, \"reason\" = ctx.Err().Error() and \"stopped\" = stopped) with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 13: a stream that obeys a context.
//   func streamCtx(ctx context.Context, buoy, n int) <-chan Reading
//   inside the goroutine, for each reading: select { case out <- r: ; case <-ctx.Done(): return }

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 13: ask for 10000 readings, take 5, cancel.
//   ctx, cancel := context.WithCancel(context.Background()) ; defer cancel()
//   feed := streamCtx(ctx, 6, 10000)
//   var got []int ; for r := range feed { got = append(got, r.Wave) ; if len(got) == 5 { cancel() ; break } }
//   for range feed { } ; stopped := true
//   scene("cancel", map[string]any{"asked": 10000, "took": len(got), "waves": got, "reason": ctx.Err().Error(), "stopped": stopped})`,
      solutionAdd: go`// streamCtx is stream with a stop button: it gives up as soon as ctx is cancelled.
func streamCtx(ctx context.Context, buoy, n int) <-chan Reading {
	out := make(chan Reading)
	go func() {
		defer close(out)
		for _, r := range readingsFor(buoy, n) {
			select {
			case out <- r:
			case <-ctx.Done():
				return
			}
		}
	}()
	return out
}

${MAIN_DIVIDER}

// Lesson 13: ask for 10000 readings, take 5, cancel.
ctx, cancel := context.WithCancel(context.Background())
defer cancel()
feed := streamCtx(ctx, 6, 10000)
var got []int
for r := range feed {
	got = append(got, r.Wave)
	if len(got) == 5 {
		cancel()
		break
	}
}
for range feed {
	// throw away whatever was in flight; this loop ends only when the producer has stopped
}
stopped := true
fmt.Println("took", len(got), "of 10000, then cancelled:", ctx.Err())

scene("cancel", map[string]any{"asked": 10000, "took": len(got), "waves": got, "reason": ctx.Err().Error(), "stopped": stopped})`,
      explanation:
        "streamCtx turns every blocking send into a select between sending and the context's Done channel. After five readings main calls cancel(), which closes Done; the producer's next select takes the Done case and returns, running defer close(out). Draining feed with for range feed therefore ends exactly when the producer has gone, which proves it did not leak. ctx.Err() is context.Canceled, printed as context canceled.",
      hints: [
        { id: "h1", title: "streamCtx", content: "Copy stream, but replace out <- r by select { case out <- r: case <-ctx.Done(): return }. Keep defer close(out) so the channel still closes when the goroutine returns." },
        { id: "h2", title: "Taking five and cancelling", content: "ctx, cancel := context.WithCancel(context.Background()); defer cancel(). for r := range feed { got = append(got, r.Wave); if len(got) == 5 { cancel(); break } }." },
        { id: "h3", title: "Proving it stopped", content: "After the loop, for range feed { } keeps receiving until the channel is closed; the producer closes it as it returns. Then stopped := true. reason is ctx.Err().Error() (the text context canceled)." },
      ],
      tests: [
        {
          id: "t1",
          description: "five readings were taken, in order",
          assertionCode: js`${READ}
assert(scene.cancel && typeof scene.cancel === "object", "Send the numbers with scene(\"cancel\", map[string]any{...}).");
assertEqual(scene.cancel.took, 5, "cancel.took (stop after exactly five readings)");
assertEqual(scene.cancel.waves, readingsFor(6, 10000).slice(0, 5).map((r) => r.Wave), "cancel.waves (buoy 6's first five waves)");
assertEqual(scene.cancel.asked, 10000, "cancel.asked");`,
        },
        {
          id: "t2",
          description: "the context was cancelled and the producer stopped",
          assertionCode: js`
assertEqual(scene.cancel.reason, "context canceled", "cancel.reason (ctx.Err().Error() after calling cancel())");
assertEqual(scene.cancel.stopped, true, "cancel.stopped (set it after the drain loop, which only ends once the producer has returned)");`,
        },
      ],
      unlocks: ["gp-cancel"],
      checks: [
        {
          prompt: "What does `<-ctx.Done()` do after `cancel()` has been called?",
          question: { type: "choice", options: ["Waits forever", "Returns immediately, because Done is a closed channel", "Panics", "Returns the cancel function"], answer: 1 },
          explanation: "Done is closed on cancellation, and receiving from a closed channel never waits. That is what lets a select wake up and stop.",
        },
        {
          prompt: "Why do we `for range feed {}` after calling `cancel()`?",
          question: {
            type: "choice",
            options: ["To collect more readings", "To prove the producer has stopped: the loop ends only when it closes the channel", "To reset the context", "Because cancel() does not work otherwise"],
            answer: 1,
          },
          explanation: "The producer closes its channel as its last act. A loop that ends is evidence the goroutine has returned and cannot leak.",
        },
      ],
    },

    // ───────────────────────── 14 ─────────────────────────
    {
      id: "go-pipeline-14-deadlines",
      title: "Giving up: timeouts and deadlines",
      minutes: 35,
      xp: 160,
      concepts: ["context.WithTimeout", "WithDeadline", "DeadlineExceeded", "errors.Is on context errors", "wrapping with %w", "buffered reply avoids a leak"],
      learn: md`### A buoy that never answers

Buoy 4 has drifted out of radio range. When the office asks it for a reading, the reply simply never comes. A clerk who waits for it waits **forever** and the other five buoys are never reported, because the clerk is stuck on the one that is silent.

The cure is a **deadline**: "I will wait this long, then I move on." Go builds it on the context you just learned. A context can cancel itself after a time limit:

~~~go
ctx, cancel := context.WithTimeout(context.Background(), 250*time.Millisecond)
defer cancel()
~~~

\`250*time.Millisecond\` is a quarter of a second. (\`time.Millisecond\` is a constant, so you multiply it by a number to get a length of time.) After that time passes, \`ctx.Done()\` closes by itself, just as if somebody had pressed cancel, and \`ctx.Err()\` is now **\`context.DeadlineExceeded\`**. Two sibling names for the two ways to end:

| why the context ended | \`ctx.Err()\` |
| --- | --- |
| somebody called \`cancel()\` | \`context.Canceled\` ("context canceled") |
| the time ran out | \`context.DeadlineExceeded\` ("context deadline exceeded") |

(\`context.WithDeadline\` is the same idea with a clock time instead of a length of time. \`ctx.Deadline()\` tells you when it is.)

### Waiting with a deadline

Waiting for a reply or the deadline, whichever comes first, is a \`select\`:

~~~go
func poll(ctx context.Context, buoy int) (Reading, error) {
	select {
	case r := <-radio(buoy):
		return r, nil
	case <-ctx.Done():
		return Reading{}, fmt.Errorf("buoy %d: %w", buoy, ctx.Err())
	}
}
~~~

\`fmt.Errorf\` with \`%w\` **wraps** the context error inside a friendlier message (you did this with errors in Cairn Depot). The caller can still ask what is inside:

~~~go
if errors.Is(err, context.DeadlineExceeded) {
	// it timed out (as opposed to a real failure)
}
~~~

A complete example with exact output (a channel nobody ever sends on, and a short timeout):

~~~go
ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
defer cancel()
silent := make(chan int)
select {
case v := <-silent:
	fmt.Println("got", v)
case <-ctx.Done():
	fmt.Println("gave up:", ctx.Err())
}
~~~

~~~text
gave up: context deadline exceeded
~~~

### Why our outcomes stay the same

A timeout depends on a real clock, which is exactly what we avoid in tests. Here it is safe because of how the situation is built: the silent buoy **can never** answer, so the only way its \`select\` ends is the deadline; and the healthy buoys answer instantly, long before 250 ms pass. The result is the same on a slow machine or a fast one. Never write a test where a slow-but-finite job races a deadline.

### The leak to avoid

A subtle trap: a goroutine that tries to deliver a late answer after the caller gave up. If it sends on an **unbuffered** channel nobody reads any more, it blocks forever. Give the reply channel a buffer of 1 (as \`radio\` does) and a late sender drops its answer in the buffer and exits. This is the same idea as lesson 3's results shelf.

### Every deadline needs its own cancel

\`defer cancel()\` right after creating a timeout context, always, even if you expect the timer to fire. It frees the timer straight away when work finishes early.

### Common mistakes

- One shared timeout for six requests: the slow one eats the others' time. Give each its own context when they are independent.
- Comparing \`err == context.DeadlineExceeded\` after wrapping it. Use \`errors.Is\`.
- Treating a timeout as "the buoy is broken": it only means "no answer in time".`,
      mission: md`The harbour master wants the six buoys polled **at the same time**, each with its own 250 ms limit. Buoy 4 is out of range and will never answer. The report must say \`ok\` for the five that answered and \`timeout\` for the silent one, and the office must not hang.

\`radio\` (the pretend radio link) is provided. Write \`poll\` and run six polls in goroutines, each with its own timeout context. When this lesson passes the **Deadline board** lights up on the board.`,
      tasks: [
        "Write func poll(ctx context.Context, buoy int) (Reading, error): a select between a reading arriving from radio(buoy) (return it with nil) and <-ctx.Done() (return an empty Reading and fmt.Errorf(\"buoy %d: %w\", buoy, ctx.Err()))",
        "In main: statuses := make([]string, fleetSize); start one goroutine per buoy b (1 to fleetSize), tracked by a WaitGroup",
        "Each goroutine makes ctx, cancel := context.WithTimeout(context.Background(), 250*time.Millisecond), defers cancel(), calls poll(ctx, b) and stores in statuses[b-1] the text \"ok\", or \"timeout\" when errors.Is(err, context.DeadlineExceeded)",
        "When b == 4 and the poll failed, keep err.Error() in a string silentErr (only that one goroutine writes it)",
        "Send deadlines (a map[string]any with \"statuses\", \"limitMs\" = 250 and \"silentErr\") with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Provided: a pretend radio link. Asking a buoy gives you a channel its reply arrives on.
// Buoy 4 has drifted out of range: its channel never gets a reply. The channel has room for one,
// so an answer that arrives late can never leave a goroutine stuck.
func radio(buoy int) <-chan Reading {
	reply := make(chan Reading, 1)
	if buoy != 4 {
		reply <- readingsFor(buoy, 1)[0]
	}
	return reply
}

// Lesson 14: write poll.
//   func poll(ctx context.Context, buoy int) (Reading, error)
//   select { case r := <-radio(buoy): return r, nil ; case <-ctx.Done(): return Reading{}, fmt.Errorf("buoy %d: %w", buoy, ctx.Err()) }

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 14: poll all six at once, each with its own 250 ms limit.
//   statuses := make([]string, fleetSize) ; a WaitGroup
//   each goroutine: ctx, cancel := context.WithTimeout(context.Background(), 250*time.Millisecond) ; defer cancel()
//                   _, err := poll(ctx, b) ; statuses[b-1] = "ok" or "timeout" (errors.Is(err, context.DeadlineExceeded))
//   silentErr: the error text from polling buoy 4 (err.Error())
//   scene("deadlines", map[string]any{"statuses": statuses, "limitMs": 250, "silentErr": silentErr})`,
      solutionAdd: go`// radio is a pretend radio link. Asking a buoy gives you a channel its reply arrives on.
// Buoy 4 has drifted out of range: its channel never gets a reply. The channel has room for one,
// so an answer that arrives late can never leave a goroutine stuck.
func radio(buoy int) <-chan Reading {
	reply := make(chan Reading, 1)
	if buoy != 4 {
		reply <- readingsFor(buoy, 1)[0]
	}
	return reply
}

// poll asks one buoy for its latest reading, but gives up when ctx runs out.
func poll(ctx context.Context, buoy int) (Reading, error) {
	select {
	case r := <-radio(buoy):
		return r, nil
	case <-ctx.Done():
		return Reading{}, fmt.Errorf("buoy %d: %w", buoy, ctx.Err())
	}
}

${MAIN_DIVIDER}

// Lesson 14: poll all six at once, each with its own 250 ms limit.
statuses := make([]string, fleetSize)
silentErr := ""
var pollWG sync.WaitGroup
for b := 1; b <= fleetSize; b++ {
	pollWG.Add(1)
	go func() {
		defer pollWG.Done()
		pctx, pcancel := context.WithTimeout(context.Background(), 250*time.Millisecond)
		defer pcancel()
		if _, err := poll(pctx, b); err != nil {
			if errors.Is(err, context.DeadlineExceeded) {
				statuses[b-1] = "timeout"
			} else {
				statuses[b-1] = "error"
			}
			if b == 4 {
				silentErr = err.Error() // only goroutine 4 writes this
			}
		} else {
			statuses[b-1] = "ok"
		}
	}()
}
pollWG.Wait()
fmt.Println("poll results:", statuses)

scene("deadlines", map[string]any{"statuses": statuses, "limitMs": 250, "silentErr": silentErr})`,
      explanation:
        "poll waits for whichever comes first: the radio's reply or the context's Done. The five healthy buoys have a reply waiting in their buffered channel, so they return at once; buoy 4's channel stays empty forever, so its select can only end when the 250 ms deadline closes Done. The error is wrapped with %w, so errors.Is(err, context.DeadlineExceeded) still finds the cause, and each goroutine writes only its own slot of statuses.",
      hints: [
        { id: "h1", title: "poll", content: "select { case r := <-radio(buoy): return r, nil; case <-ctx.Done(): return Reading{}, fmt.Errorf(\"buoy %d: %w\", buoy, ctx.Err()) }. %w wraps the context's error so errors.Is can still find it." },
        { id: "h2", title: "One timeout per poll", content: "Inside each goroutine: pctx, pcancel := context.WithTimeout(context.Background(), 250*time.Millisecond); defer pcancel(). Then _, err := poll(pctx, b). Store into statuses[b-1] only." },
        { id: "h3", title: "The statuses", content: "If err == nil it is \"ok\". Otherwise errors.Is(err, context.DeadlineExceeded) means \"timeout\". For silentErr, when b == 4 save err.Error() (only that one goroutine writes the variable). The text should be: buoy 4: context deadline exceeded." },
      ],
      tests: [
        {
          id: "t1",
          description: "five buoys answered and buoy 4 timed out",
          assertionCode: js`
assert(scene.deadlines && typeof scene.deadlines === "object", "Send the report with scene(\"deadlines\", map[string]any{...}).");
assertEqual(scene.deadlines.statuses, ["ok", "ok", "ok", "timeout", "ok", "ok"], "deadlines.statuses (buoy 4 never answers; use errors.Is(err, context.DeadlineExceeded) to tell a timeout from other errors)");`,
        },
        {
          id: "t2",
          description: "the timeout error keeps its cause and its buoy",
          assertionCode: js`
assertEqual(scene.deadlines.silentErr, "buoy 4: context deadline exceeded", "deadlines.silentErr (poll should return fmt.Errorf(\"buoy %d: %w\", buoy, ctx.Err()))");
assertEqual(scene.deadlines.limitMs, 250, "deadlines.limitMs");`,
        },
      ],
      unlocks: ["gp-deadline"],
      checks: [
        {
          prompt: "A context made with `WithTimeout` runs out of time. What is `ctx.Err()`?",
          question: { type: "choice", options: ["nil", "context.Canceled", "context.DeadlineExceeded", "A panic"], answer: 2 },
          explanation: "Canceled means somebody pressed the button. DeadlineExceeded means the clock ran out. They are two different reasons for the same closed Done channel.",
        },
        {
          prompt: "You wrapped a context error with `fmt.Errorf(\"buoy %d: %w\", ...)`. What is the right way to ask whether it was a timeout?",
          question: {
            type: "choice",
            options: ["err == context.DeadlineExceeded", "errors.Is(err, context.DeadlineExceeded)", "err.Error() == \"timeout\"", "ctx.Done() == nil"],
            answer: 1,
          },
          explanation: "== only matches the bare error. errors.Is looks inside the wrapping, so it still finds the cause.",
        },
      ],
    },

    // ───────────────────────── 15 ─────────────────────────
    {
      id: "go-pipeline-15-group",
      title: "Many goroutines, many errors",
      minutes: 40,
      xp: 170,
      concepts: ["error group (by hand)", "first error wins (sync.Once)", "cancel the rest", "errors.Join", "errors by launch order", "zero value usable"],
      learn: md`### When one of several things goes wrong

You often start a handful of goroutines to do related jobs. Any of them can fail. Questions follow:

1. Which error do you report? (If three fail, three errors exist.)
2. Should the other jobs keep going, wasting effort, or stop right away?
3. How does the caller wait for all of them **and** get an answer?

The Go team's \`golang.org/x/sync/errgroup\` package answers these. It lives outside the standard library, so here you will build the same idea yourself in about thirty lines. You already own every part: a WaitGroup, a mutex, a Once and a context.

### What we want it to do

~~~go
g, ctx := WithContext(context.Background())
g.Go(func() error { ... })     // start a job; the job may return an error
g.Go(func() error { ... })
err := g.Wait()                // wait for all; err is the FIRST error, or nil
~~~

Rules of the group:

- **Wait** waits for every job to finish, then returns the first error that happened (by time).
- The **first** failure cancels the group's context, so the other jobs (which watch \`ctx.Done()\`) can stop.
- A second helper, **Errors**, returns *every* error in the order the jobs were **started**, joined with \`errors.Join\`.
- A group made without a context (just \`var g Group\`) still works; it simply has nothing to cancel.

### The struct

~~~go
type Group struct {
	wg     sync.WaitGroup
	cancel context.CancelFunc // nil when the group has no context
	once   sync.Once          // makes "the first error" a single decision
	err    error              // that first error
	mu     sync.Mutex         // guards all
	all    []error            // one slot per started job, in launch order
}
~~~

### The pieces

- **First error: a Once.** \`g.once.Do(func() { g.err = err; cancel() })\` runs for whichever failing job gets there first; every later failure finds the Once already used and does nothing. That is a race-free "first wins".
- **Launch order: a slot.** When \`Go\` is called, before starting the goroutine, it reserves a slot at the end of \`all\` (under the mutex). The goroutine later writes its error into **its** slot. Because \`Go\` is called one job after another from the caller's goroutine, slot numbers follow launch order, whatever order the jobs finish in.
- **Wait** calls \`g.wg.Wait()\`, then \`cancel\` once more (to free the context) and returns \`g.err\`.

\`errors.Join(errs...)\` combines several errors into one whose message is each error's message on its own line; \`nil\` entries are ignored. If every entry is \`nil\` it returns \`nil\`.

### A concrete trace

Five jobs. Job 2 fails at once; the others are "busy" until told to stop. They return \`ctx.Err()\` when the context is cancelled.

| step | job 2 | jobs 0, 1, 3, 4 | the group |
| --- | --- | --- | --- |
| 1 | returns \`radio fault\` | block on \`<-ctx.Done()\` | |
| 2 | | | \`once.Do\`: stores job 2's error, calls \`cancel()\` |
| 3 | | wake up, return \`context canceled\` | their errors go into their slots, but \`once\` is already used |
| 4 | | | \`Wait\` returns: the radio fault |

The jobs never decide anything about each other. Their order of waking does not matter, because the first error is already stored before the cancel can reach them.

### Common mistakes

- Reading \`g.err\` before \`Wait\` returns.
- Reporting the first error by *launch order* instead of by *time*: a cancelled job that came earlier in the list would hide the real cause.
- Calling \`g.wg.Add(1)\` inside the goroutine instead of before \`go\`.`,
      mission: md`Five checks run at once on the data desk's link to the buoys. When one fails, the others should stop at once instead of burning time, and the office wants the first error as the headline and every error in a log.

\`Group\` (the struct) is provided. Write \`WithContext\`, \`Go\`, \`Wait\` and \`Errors\`, then run two scenarios: one where job 2 fails and cancels the rest, and one with no context where two jobs fail and you collect both. When this lesson passes the **Error group** lights up on the board.`,
      tasks: [
        "Write func WithContext(parent context.Context) (*Group, context.Context): derive ctx, cancel := context.WithCancel(parent) and return &Group{cancel: cancel}, ctx",
        "Write func (g *Group) Go(task func() error): under g.mu reserve a slot (slot := len(g.all); g.all = append(g.all, nil)), then g.wg.Add(1) and start a goroutine that runs the task; on an error store it in g.all[slot] (under the mutex) and call g.once.Do to remember it in g.err and, if g.cancel != nil, call g.cancel()",
        "Write func (g *Group) Wait() error (wg.Wait, then cancel once more if there is one, return g.err) and func (g *Group) Errors() error (return errors.Join(g.all...) under the mutex)",
        "Scenario A in main: g, gctx := WithContext(context.Background()); five jobs i = 0..4: job 2 returns fmt.Errorf(\"buoy %d: radio fault\", i+1); the others do <-gctx.Done(), call cancelled.Add(1) (an atomic.Int32) and return gctx.Err(). Keep firstErr := g.Wait()",
        "Scenario B: var plain Group (no context); five jobs where i == 1 or i == 3 return fmt.Errorf(\"buoy %d: bad checksum\", i+1) and the rest return nil; plain.Wait(), then all := plain.Errors()",
        "Send group (a map[string]any with \"first\" = firstErr.Error(), \"cancelled\" = cancelled.Load(), \"tasks\" = 5 and \"joined\" = all.Error()) with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Provided: the group's fields. Every one has a job, explained in the lesson.
type Group struct {
	wg     sync.WaitGroup
	cancel context.CancelFunc // nil when the group has no context
	once   sync.Once          // makes "the first error" a single decision
	err    error              // that first error
	mu     sync.Mutex         // guards all
	all    []error            // one slot per started job, in launch order
}

// Lesson 15: write the four functions.
//   func WithContext(parent context.Context) (*Group, context.Context)
//   func (g *Group) Go(task func() error)      reserve a slot, wg.Add(1), run the task in a goroutine, record its error
//   func (g *Group) Wait() error               wg.Wait(), cancel if there is one, return g.err
//   func (g *Group) Errors() error             errors.Join(g.all...) while holding the mutex

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 15: two scenarios.
//   A: g, gctx := WithContext(context.Background()) ; var cancelled atomic.Int32
//      five jobs: job 2 returns fmt.Errorf("buoy %d: radio fault", i+1) ; the others <-gctx.Done(), cancelled.Add(1), return gctx.Err()
//      firstErr := g.Wait()
//   B: var plain Group ; five jobs: i == 1 or i == 3 return fmt.Errorf("buoy %d: bad checksum", i+1), the rest return nil
//      plain.Wait() ; all := plain.Errors()
//   scene("group", map[string]any{"first": firstErr.Error(), "cancelled": cancelled.Load(), "tasks": 5, "joined": all.Error()})`,
      solutionAdd: go`// Group runs jobs in goroutines. It is a small hand-built version of the errgroup idea:
// Wait reports the first error, and that first error cancels the group's context.
type Group struct {
	wg     sync.WaitGroup
	cancel context.CancelFunc // nil when the group has no context
	once   sync.Once          // makes "the first error" a single decision
	err    error              // that first error
	mu     sync.Mutex         // guards all
	all    []error            // one slot per started job, in launch order
}

// WithContext makes a group whose first failure cancels the returned context.
func WithContext(parent context.Context) (*Group, context.Context) {
	ctx, cancel := context.WithCancel(parent)
	return &Group{cancel: cancel}, ctx
}

// Go starts a job. Call it from one goroutine, one job after another, so launch order is well defined.
func (g *Group) Go(task func() error) {
	g.mu.Lock()
	slot := len(g.all)
	g.all = append(g.all, nil)
	g.mu.Unlock()

	g.wg.Add(1)
	go func() {
		defer g.wg.Done()
		if err := task(); err != nil {
			g.mu.Lock()
			g.all[slot] = err
			g.mu.Unlock()
			g.once.Do(func() {
				g.err = err
				if g.cancel != nil {
					g.cancel()
				}
			})
		}
	}()
}

// Wait blocks until every job has finished and returns the first error (by time), or nil.
func (g *Group) Wait() error {
	g.wg.Wait()
	if g.cancel != nil {
		g.cancel()
	}
	return g.err
}

// Errors returns every job's error, joined, in the order the jobs were started.
func (g *Group) Errors() error {
	g.mu.Lock()
	defer g.mu.Unlock()
	return errors.Join(g.all...)
}

${MAIN_DIVIDER}

// Lesson 15: two scenarios.
grp, gctx := WithContext(context.Background())
var cancelled atomic.Int32
for i := 0; i < 5; i++ {
	grp.Go(func() error {
		if i == 2 {
			return fmt.Errorf("buoy %d: radio fault", i+1)
		}
		<-gctx.Done() // everyone else is busy until the group is told to stop
		cancelled.Add(1)
		return gctx.Err()
	})
}
firstErr := grp.Wait()
fmt.Println("first error:", firstErr, "| jobs stopped by the cancel:", cancelled.Load())

var plainGrp Group
for i := 0; i < 5; i++ {
	plainGrp.Go(func() error {
		if i == 1 || i == 3 {
			return fmt.Errorf("buoy %d: bad checksum", i+1)
		}
		return nil
	})
}
plainGrp.Wait()
all := plainGrp.Errors()
fmt.Println("every error, in launch order:")
fmt.Println(all)

scene("group", map[string]any{"first": firstErr.Error(), "cancelled": cancelled.Load(), "tasks": 5, "joined": all.Error()})`,
      explanation:
        "Go reserves a slot before starting the goroutine, so slot numbers follow launch order. A failing job stores its error in its slot and then passes through g.once.Do: only the first failure sets g.err and calls cancel. In scenario A job 2 fails immediately while the others wait for Done, so job 2's error is stored before any other job can see the cancel; the other four return context canceled and cancelled ends at 4. In scenario B there is no cancel function, and Errors joins the two checksum errors in launch order.",
      hints: [
        { id: "h1", title: "WithContext and Wait", content: "WithContext: ctx, cancel := context.WithCancel(parent); return &Group{cancel: cancel}, ctx. Wait: g.wg.Wait(); if g.cancel != nil { g.cancel() }; return g.err." },
        { id: "h2", title: "Go", content: "g.mu.Lock(); slot := len(g.all); g.all = append(g.all, nil); g.mu.Unlock(); g.wg.Add(1); go func() { defer g.wg.Done(); if err := task(); err != nil { lock, g.all[slot] = err, unlock; g.once.Do(func() { g.err = err; if g.cancel != nil { g.cancel() } }) } }()." },
        { id: "h3", title: "Errors and the scenarios", content: "Errors: g.mu.Lock(); defer g.mu.Unlock(); return errors.Join(g.all...). In scenario A the other jobs must wait on <-gctx.Done() before returning gctx.Err(), otherwise they would finish before the failure. For scene use firstErr.Error() and all.Error()." },
      ],
      tests: [
        {
          id: "t1",
          description: "the first error wins and the rest are cancelled",
          assertionCode: js`
assert(scene.group && typeof scene.group === "object", "Send the report with scene(\"group\", map[string]any{...}).");
assertEqual(scene.group.first, "buoy 3: radio fault", "group.first (Wait must return the first error by time, not a later 'context canceled')");
assertEqual(scene.group.cancelled, 4, "group.cancelled (the four other jobs should be released by the group cancelling its context)");
assertEqual(scene.group.tasks, 5, "group.tasks");`,
        },
        {
          id: "t2",
          description: "Errors lists every failure in launch order",
          assertionCode: js`
assertEqual(scene.group.joined, "buoy 2: bad checksum\nbuoy 4: bad checksum", "group.joined (errors.Join(g.all...) in the order the jobs were started; nil entries are skipped)");`,
        },
      ],
      unlocks: ["gp-group"],
      checks: [
        {
          prompt: "Why is the first error stored with `sync.Once` rather than a plain `if g.err == nil { g.err = err }`?",
          question: {
            type: "choice",
            options: ["Once is faster", "Two failing jobs could both see nil and both write: Once makes exactly one of them win safely", "if statements do not work in goroutines", "Once also waits for the jobs"],
            answer: 1,
          },
          explanation: "The plain if is a check-then-act race: both goroutines can pass the check before either writes. Once turns \"first wins\" into a single safe decision.",
        },
        {
          prompt: "`errors.Join(nil, errA, nil, errB)` returns...",
          question: { type: "choice", options: ["nil", "One error that contains errA and errB (the nils are ignored)", "Only errA", "A panic"], answer: 1 },
          explanation: "Join drops nil entries. Its message is each remaining error's message on its own line.",
        },
      ],
    },

    // ───────────────────────── 16 ─────────────────────────
    {
      id: "go-pipeline-16-shutdown",
      title: "Closing the desk: graceful shutdown",
      minutes: 45,
      xp: 200,
      concepts: ["graceful shutdown", "cancel the producers, drain the queue", "closing is how workers learn to stop", "drain deadline", "accepted equals processed", "per-worker results merged at the end"],
      learn: md`### Closing time at the data desk

At 6 pm the harbour master sounds the horn: the desk is closing. What should the staff do?

- **Hard stop**: everyone drops what they are holding and leaves. Readings in the middle of being processed are lost, and so are the ones waiting in the inbox. The count on the board and the radio log no longer agree.
- **Graceful shutdown**: *stop taking new readings*, finish everything already accepted, write the final report, then leave. Nothing accepted is lost.

Servers do this on every deploy. You have all the parts already. Putting them in the right order is the skill.

### The recipe

1. **Stop the producers.** The horn is a context cancellation. The source watches \`ctx.Done()\` (lesson 13) and stops sending, then **closes** its output channel.
2. **Let the workers drain.** A worker is just \`for r := range in\`. It does **not** look at the context. It keeps taking readings until the channel is both closed *and* empty. Everything the source already accepted is still in the queue, and the workers finish it.
3. **Wait for the workers**, with a **deadline** so a stuck worker cannot keep the desk open all night (lesson 14).
4. **Report.** Merge the workers' partial results into the final figures.

The key idea: **the context tells producers to stop; closing the channel tells consumers that it is over.** Mixing the two up (making workers quit on \`ctx.Done()\`) throws away the queue.

### One timeline

Source with a queue of 3 slots, 2 workers. The horn sounds after the 6th reading:

| moment | source | queue | workers |
| --- | --- | --- | --- |
| reading 6 sent | sends it, then sounds the horn | holds up to 3 | busy |
| after the horn | sees \`Done\`, stops, **closes** the queue | still holds readings | keep taking them |
| draining | gone | shrinks to 0 | take the last readings |
| queue empty and closed | | | each \`range\` ends, \`wg.Done()\` |
| after the workers | | | main merges the results and prints the report |

### Keeping results free of locks

Each worker keeps its **own** tally (a slot of a slice indexed by worker number) and nobody else touches it while they work. After \`wg.Wait()\` main adds the slots together. No mutex, no race, and the totals do not depend on which worker saw which reading.

~~~go
type partial struct {
	n       int
	perBuoy map[int]int
	maxWave int
}
parts := make([]partial, workers)       // parts[w] belongs to worker w
~~~

### A drain deadline

~~~go
done := make(chan struct{})
go func() { wg.Wait(); close(done) }()
select {
case <-done:                // clean shutdown
case <-limit.Done():        // out of time: stop waiting
}
~~~

The goroutine closing \`done\` turns "the WaitGroup finished" into a channel you can \`select\` on, because \`wg.Wait()\` itself cannot be put in a select.

### Why this run is repeatable

In real life the horn comes from outside (Ctrl-C, a deploy). To make every run identical, **the source itself plays the harbour master**: after exactly 60 readings it sounds the horn. The number accepted is therefore always 60, and graceful shutdown means exactly 60 are processed. What stays undecided, which worker handles which reading, never reaches the report.

### Common mistakes

- Workers that quit on \`ctx.Done()\`: readings stuck in the queue are silently dropped.
- Closing the channel from the consumers. The producer that knows it is finished closes it.
- No drain deadline: one stuck worker holds the whole shutdown hostage.
- Reading the workers' tallies before \`wg.Wait()\` returns.`,
      mission: md`Closing time. Put every piece of the course together into one desk that processes 60 readings round-robin from the six buoys, with a queue of 8 and three workers, then shuts down gracefully: the source sounds the horn after its 60th reading, the workers drain the queue, and the final report must show that **nothing was lost**.

\`Report\` is provided. Write \`source\` and \`runDesk\` and run the desk. When this lesson passes the **Shutdown report** lights up and the whole harbour board is live.`,
      tasks: [
        "Write func source(ctx context.Context, limit int, horn context.CancelFunc, accepted *atomic.Int64) <-chan Reading: a buffered channel of 8; a goroutine that for k from 0 to limit-1 sends reading number k%fleetSize+1 / seq k/fleetSize+1 (readingsFor(k%fleetSize+1, k/fleetSize+1)[k/fleetSize]) with a select against ctx.Done(), adds 1 to accepted after each send, and after the last one calls horn() and closes the channel (defer close)",
        "Write func runDesk(in <-chan Reading, workers int) Report: parts := make([]partial-style tallies, workers), start the workers (each ranges over in, counting readings, per-buoy counts and the largest Wave in its own slot), then wait for them with a 2 second drain deadline (context.WithTimeout and a done channel closed by a goroutine that runs wg.Wait)",
        "After the workers: merge the slots into Report{Processed, PerBuoy, MaxWave, Clean} where Clean is true when done closed before the deadline",
        "In main: sdCtx, horn := context.WithCancel(context.Background()), defer horn(), var intake atomic.Int64, queue := source(sdCtx, 60, horn, &intake), report := runDesk(queue, 3); set report.Accepted = int(intake.Load())",
        "Print: fmt.Println(\"accepted\", report.Accepted, \"processed\", report.Processed, \"lost\", report.Accepted-report.Processed), then send report as \"shutdown\" with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Provided: the final report.
type Report struct {
	Accepted  int         // readings the source put on the queue
	Processed int         // readings the workers finished
	PerBuoy   map[int]int // processed readings per buoy
	MaxWave   int         // the tallest wave processed
	Clean     bool        // true when every worker finished before the drain deadline
}

// Lesson 16: write the source and the desk.
//   func source(ctx context.Context, limit int, horn context.CancelFunc, accepted *atomic.Int64) <-chan Reading
//   func runDesk(in <-chan Reading, workers int) Report
// Workers range over in and ignore the context: closing the queue is what tells them to finish.

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 16: run the desk.
//   sdCtx, horn := context.WithCancel(context.Background()) ; defer horn()
//   var intake atomic.Int64 ; queue := source(sdCtx, 60, horn, &intake)
//   report := runDesk(queue, 3) ; report.Accepted = int(intake.Load())
//   fmt.Println("accepted", report.Accepted, "processed", report.Processed, "lost", report.Accepted-report.Processed)
//   scene("shutdown", report)`,
      solutionAdd: go`// Report is the desk's closing figures.
type Report struct {
	Accepted  int         // readings the source put on the queue
	Processed int         // readings the workers finished
	PerBuoy   map[int]int // processed readings per buoy
	MaxWave   int         // the tallest wave processed
	Clean     bool        // true when every worker finished before the drain deadline
}

// source feeds the desk with readings from the buoys in turn (buoy 1, 2, ... 6, then 1 again).
// After limit readings it sounds the horn (cancelling the context) and closes the queue.
// It watches ctx, so a horn sounded from outside would stop it too.
func source(ctx context.Context, limit int, horn context.CancelFunc, accepted *atomic.Int64) <-chan Reading {
	out := make(chan Reading, 8)
	go func() {
		defer close(out)
		for k := 0; k < limit; k++ {
			r := readingsFor(k%fleetSize+1, k/fleetSize+1)[k/fleetSize]
			select {
			case out <- r:
				accepted.Add(1)
			case <-ctx.Done():
				return
			}
		}
		horn()
	}()
	return out
}

// runDesk starts the workers, lets them drain the queue and builds the report.
// Workers never look at a context: they stop when the queue is closed and empty.
func runDesk(in <-chan Reading, workers int) Report {
	type tally struct {
		n       int
		perBuoy map[int]int
		maxWave int
	}
	parts := make([]tally, workers)
	var wg sync.WaitGroup
	for w := 0; w < workers; w++ {
		parts[w].perBuoy = map[int]int{}
		wg.Add(1)
		go func() {
			defer wg.Done()
			for r := range in {
				parts[w].n++
				parts[w].perBuoy[r.Buoy]++
				if r.Wave > parts[w].maxWave {
					parts[w].maxWave = r.Wave
				}
			}
		}()
	}

	limit, stopWaiting := context.WithTimeout(context.Background(), 2*time.Second)
	defer stopWaiting()
	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()
	clean := false
	select {
	case <-done:
		clean = true
	case <-limit.Done():
	}

	report := Report{PerBuoy: map[int]int{}, Clean: clean}
	for _, p := range parts {
		report.Processed += p.n
		for b, c := range p.perBuoy {
			report.PerBuoy[b] += c
		}
		if p.maxWave > report.MaxWave {
			report.MaxWave = p.maxWave
		}
	}
	return report
}

${MAIN_DIVIDER}

// Lesson 16: run the desk.
sdCtx, horn := context.WithCancel(context.Background())
defer horn()
var intake atomic.Int64
queue := source(sdCtx, 60, horn, &intake)
report := runDesk(queue, 3)
report.Accepted = int(intake.Load())
fmt.Println("accepted", report.Accepted, "processed", report.Processed, "lost", report.Accepted-report.Processed)
fmt.Println("clean shutdown:", report.Clean, "| per buoy:", report.PerBuoy)

scene("shutdown", report)`,
      explanation:
        "The source sends 60 readings through a queue of 8 and then sounds the horn and closes the queue. The three workers only range over the queue, so they keep going until it is closed and empty, which means every accepted reading is processed: accepted and processed are both 60. Each worker has its own tally slot, merged after the WaitGroup finishes, so no lock is needed and the report does not depend on which worker saw which reading. The 2 second drain deadline is only a safety net; the workers finish almost at once.",
      hints: [
        { id: "h1", title: "source", content: "out := make(chan Reading, 8); go func() { defer close(out); for k := 0; k < limit; k++ { r := readingsFor(k%fleetSize+1, k/fleetSize+1)[k/fleetSize]; select { case out <- r: accepted.Add(1); case <-ctx.Done(): return } }; horn() }(); return out." },
        { id: "h2", title: "The workers", content: "Declare type tally struct { n int; perBuoy map[int]int; maxWave int } inside runDesk, parts := make([]tally, workers), and for each w: parts[w].perBuoy = map[int]int{}, then wg.Add(1) and go func() { defer wg.Done(); for r := range in { update parts[w] } }(). Workers must not look at any context." },
        { id: "h3", title: "The deadline and the merge", content: "limit, stop := context.WithTimeout(context.Background(), 2*time.Second); done := make(chan struct{}); go func() { wg.Wait(); close(done) }(); select { case <-done: clean = true; case <-limit.Done(): }. Then add up parts into the Report and return it." },
      ],
      tests: [
        {
          id: "t1",
          description: "every accepted reading was processed",
          assertionCode: js`
assert(scene.shutdown && typeof scene.shutdown === "object", "Send the report with scene(\"shutdown\", report).");
assertEqual(scene.shutdown.Accepted, 60, "report.Accepted (the source sends exactly 60 readings: count them with accepted.Add(1) after each send)");
assertEqual(scene.shutdown.Processed, 60, "report.Processed (the workers must drain the queue: range over it and ignore the context)");`,
        },
        {
          id: "t2",
          description: "the figures are right and the shutdown was clean",
          assertionCode: js`${READ}
let max = 0;
for (let k = 0; k < 60; k++) { const r = readingsFor((k % 6) + 1, Math.floor(k / 6) + 1)[Math.floor(k / 6)]; max = Math.max(max, r.Wave); }
assertEqual(scene.shutdown.MaxWave, max, "report.MaxWave (the tallest wave among the 60 readings)");
for (let b = 1; b <= 6; b++) assertEqual(scene.shutdown.PerBuoy[String(b)], 10, "report.PerBuoy for buoy " + b + " (60 readings dealt out round-robin to six buoys)");
assertEqual(scene.shutdown.Clean, true, "report.Clean (the workers should finish well inside the 2 second drain deadline)");
assert(stdout.includes("accepted 60 processed 60 lost 0"), "Print: accepted 60 processed 60 lost 0");`,
        },
      ],
      unlocks: ["gp-shutdown"],
      checks: [
        {
          prompt: "During a graceful shutdown, how do the workers learn that it is time to finish?",
          question: {
            type: "choice",
            options: ["They watch ctx.Done() and stop immediately", "The queue is closed, and their range loops end once it is empty", "main kills them", "They count to 60"],
            answer: 1,
          },
          explanation: "Cancellation stops the producers. Closing the channel tells consumers there is nothing more coming, so they finish what is queued and then leave.",
        },
        {
          prompt: "Why give the drain a deadline (the 2 second timeout)?",
          question: {
            type: "choice",
            options: ["Workers run faster with one", "So one stuck worker cannot keep the shutdown waiting forever", "close() needs it", "To make the report longer"],
            answer: 1,
          },
          explanation: "Waiting forever is itself a failure. A deadline lets you report an unclean shutdown and move on.",
        },
      ],
    },
  ],
};
