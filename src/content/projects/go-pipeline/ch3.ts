import type { Chapter } from "@/engine/types";
import { go, js, md, MAIN_DIVIDER, READ } from "./util.ts";

/**
 * Chapter 3: The assembly line. Pipelines of stages, a worker pool, fan-out and fan-in, and a
 * logical-tick simulation that measures a pool without a stopwatch.
 *
 * Determinism rules used here: every stage is a single goroutine (so order is preserved), pool and fan
 * results carry an index or are sorted before they are shown, and "how long would it take" is answered by
 * a simulation in ticks, never by a clock.
 */

/** JavaScript twin of the Go simulate() from lesson 12, used by the checks to work out the expected answers. */
const SIM_JS = js`
const simulate = (arrive, cost, workers) => {
  const free = Array(workers).fill(0), busy = Array(workers).fill(0), slots = [];
  for (let j = 0; j < cost.length; j++) {
    let w = 0;
    for (let k = 1; k < workers; k++) if (free[k] < free[w]) w = k;
    const start = Math.max(arrive[j], free[w]);
    free[w] = start + cost[j]; busy[w] += cost[j];
    slots.push({ Job: j, Worker: w, Start: start, End: free[w] });
  }
  const makespan = Math.max(...slots.map((s) => s.End));
  const depth = [];
  for (let t = 0; t < makespan; t++) depth.push(slots.filter((s) => arrive[s.Job] <= t && t < s.Start).length);
  return { Workers: workers, Slots: slots, Makespan: makespan, Busy: busy, PeakQueue: Math.max(...depth), Depth: depth };
};
`;

export const chapter3: Chapter = {
  id: "the-assembly-line",
  title: "The assembly line",
  blurb: "Chain stages into a pipeline, hire a worker pool, fan work out and merge it back, then measure it all in logical ticks.",
  lessons: [
    // ───────────────────────── 9 ─────────────────────────
    {
      id: "go-pipeline-9-pipelines",
      title: "Stages: building a pipeline",
      minutes: 35,
      xp: 150,
      concepts: ["pipeline", "stage function", "channel in, channel out", "each stage closes its own output", "order preserved", "leak if the consumer stops early"],
      learn: md`### The soup line

A kitchen making soup does not have one cook do everything for one bowl. One person chops, the next boils, the next ladles. While the second person boils bowl 1, the first is already chopping for bowl 2. The work flows down a line, and several bowls are in progress at once. That is a **pipeline**.

Your data desk can work the same way. A reading passes through **stages**: the *source* radios it in, a *calibration* stage corrects its temperature, a *storm filter* lets through only the tall waves. Each stage is one goroutine, and the stages are joined by channels.

The shape of every stage is the same, and it uses what you already know:

~~~go
func calibrate(in <-chan Reading) <-chan Reading {
	out := make(chan Reading)
	go func() {
		defer close(out)            // when I run out, say "that is all" downstream
		for r := range in {         // take from upstream until it closes
			r.Temp += 1             // do this stage's work
			out <- r                // hand to downstream
		}
	}()
	return out
}
~~~

Read the signature as a sentence: "give me a channel of readings; I give you back a channel of readings." That is why stages **snap together** like pipe sections:

~~~go
for r := range storms(calibrate(stream(4, 40)), 150) {
	// ...
}
~~~

Read it from the inside out: the stream makes readings, calibrate corrects them, storms filters them, and the loop at the end consumes. The loop at the end is also what *pulls* the whole line along, because every stage blocks when its downstream neighbour is not ready.

### Who holds what, tick by tick

Three readings, three stages (S = source, C = calibrate, F = filter). Each box holds one reading at a time because the channels are unbuffered:

| tick | S holds | C holds | F holds | out of the line |
| --- | --- | --- | --- | --- |
| 1 | reading 1 | | | |
| 2 | reading 2 | reading 1 | | |
| 3 | reading 3 | reading 2 | reading 1 | |
| 4 | | reading 3 | reading 2 | reading 1 |
| 5 | | | reading 3 | reading 2 |
| 6 | | | | reading 3 |

At tick 3 all three stages are busy at once. A sequential program would have done reading 1 completely before touching reading 2.

### Rules that keep a pipeline healthy

- **Each stage closes the channel it created, and only that one.** This passes "that is all" down the line, so every \`range\` ends.
- **One goroutine per stage keeps readings in order.** A stage with one goroutine cannot reorder anything, which is why a pipeline's output is the same every run. (Lesson 11 shows what changes with several.)
- **A stage may drop items** (the storm filter does), change them (calibrate does) or add some. Output count does not have to equal input count.
- **The consumer must read everything, or tell the line to stop.** If the loop at the end quits early, the stages upstream stay blocked on their sends forever: a goroutine leak. Chapter 4 shows the proper way to stop a pipeline.

A complete example with its exact output (stage \`double\` doubles, stage \`odd\` keeps what is above 4):

~~~go
func count(n int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for i := 1; i <= n; i++ {
			out <- i
		}
	}()
	return out
}

func double(in <-chan int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for v := range in {
			out <- v * 2
		}
	}()
	return out
}

func above(in <-chan int, limit int) <-chan int {
	out := make(chan int)
	go func() {
		defer close(out)
		for v := range in {
			if v > limit {
				out <- v
			}
		}
	}()
	return out
}

func main() {
	for v := range above(double(count(5)), 4) {
		fmt.Println(v)
	}
}
~~~

~~~text
6
8
10
~~~

1 through 5 are doubled to 2, 4, 6, 8, 10 and everything not above 4 is dropped.

### Common mistakes

- A stage that forgets \`defer close(out)\`: the final loop never ends.
- A stage that closes its **input**. Only the sender closes.
- Doing a lot of work in the final loop: it slows the whole line, because the stages wait for it.`,
      mission: md`The data desk is moving to an assembly line. Buoy 4's readings must be calibrated (using the offsets table you built in lesson 7), then filtered so only storm-sized waves (150 cm or more) get through to the forecaster.

Write the two stages, join them to the \`stream\` you wrote in lesson 2, and report what came out. When this lesson passes the **Stage line** lights up on the board.`,
      tasks: [
        "Write func calibrate(in <-chan Reading) <-chan Reading: a stage that adds offsets()[r.Buoy] to r.Temp and forwards the reading",
        "Write func storms(in <-chan Reading, limit int) <-chan Reading: a stage that forwards only readings with Wave >= limit",
        "In main: loop with range over storms(calibrate(stream(4, 40)), 150), collecting each reading's Seq into stormSeqs and keeping the first stormy reading as firstStorm",
        "Work out rawTemp, the uncalibrated Temp of that first stormy reading, from readingsFor(4, 40)[firstStorm.Seq-1]",
        "Send pipeline (a map[string]any with \"in\" = 40, \"out\" = len(stormSeqs), \"limit\" = 150, \"seqs\" = stormSeqs, \"calibrated\" = firstStorm.Temp and \"raw\" = rawTemp) with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 9: write the two stages.
//   func calibrate(in <-chan Reading) <-chan Reading     adds offsets()[r.Buoy] to r.Temp
//   func storms(in <-chan Reading, limit int) <-chan Reading     forwards only Wave >= limit
// Each stage: out := make(chan Reading) ; go func() { defer close(out) ; for r := range in { ... } }() ; return out

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 9: run buoy 4's 40 readings down the line.
//   var stormSeqs []int ; var firstStorm Reading
//   for r := range storms(calibrate(stream(4, 40)), 150) { remember r.Seq ; keep the first r as firstStorm }
//   rawTemp := readingsFor(4, 40)[firstStorm.Seq-1].Temp
//   scene("pipeline", map[string]any{"in": 40, "out": len(stormSeqs), "limit": 150, "seqs": stormSeqs, "calibrated": firstStorm.Temp, "raw": rawTemp})`,
      solutionAdd: go`// calibrate is a stage: it corrects each reading's temperature with its buoy's offset.
func calibrate(in <-chan Reading) <-chan Reading {
	out := make(chan Reading)
	go func() {
		defer close(out)
		table := offsets()
		for r := range in {
			r.Temp += table[r.Buoy]
			out <- r
		}
	}()
	return out
}

// storms is a stage: it lets through only readings whose wave is at least limit centimetres.
func storms(in <-chan Reading, limit int) <-chan Reading {
	out := make(chan Reading)
	go func() {
		defer close(out)
		for r := range in {
			if r.Wave >= limit {
				out <- r
			}
		}
	}()
	return out
}

${MAIN_DIVIDER}

// Lesson 9: run buoy 4's 40 readings down the line.
var stormSeqs []int
var firstStorm Reading
for r := range storms(calibrate(stream(4, 40)), 150) {
	if len(stormSeqs) == 0 {
		firstStorm = r
	}
	stormSeqs = append(stormSeqs, r.Seq)
}
rawTemp := readingsFor(4, 40)[firstStorm.Seq-1].Temp
fmt.Println("40 readings in,", len(stormSeqs), "storm readings out; first is #", firstStorm.Seq)
fmt.Println("its temperature:", rawTemp, "raw,", firstStorm.Temp, "calibrated")

scene("pipeline", map[string]any{"in": 40, "out": len(stormSeqs), "limit": 150, "seqs": stormSeqs, "calibrated": firstStorm.Temp, "raw": rawTemp})`,
      explanation:
        "Each stage reads from its input until it closes, does its small job and writes to a fresh output channel that it closes when finished. Each stage is a single goroutine, so the order of readings never changes: the storm sequence numbers come out ascending. The calibrated temperature of the first storm reading is its raw temperature plus buoy 4's offset (+5).",
      hints: [
        { id: "h1", title: "A stage", content: "out := make(chan Reading); go func() { defer close(out); for r := range in { ... out <- r } }(); return out. In calibrate, set r.Temp += offsets()[r.Buoy] before sending (r is your own copy)." },
        { id: "h2", title: "The filter", content: "In storms: if r.Wave >= limit { out <- r }. Readings that fail the test are simply not sent." },
        { id: "h3", title: "Collecting", content: "for r := range storms(calibrate(stream(4, 40)), 150) { if len(stormSeqs) == 0 { firstStorm = r }; stormSeqs = append(stormSeqs, r.Seq) }. Then rawTemp := readingsFor(4, 40)[firstStorm.Seq-1].Temp." },
      ],
      tests: [
        {
          id: "t1",
          description: "only storm-sized waves get through, in order",
          assertionCode: js`${READ}
const want = readingsFor(4, 40).filter((r) => r.Wave >= 150).map((r) => r.Seq);
assert(scene.pipeline && typeof scene.pipeline === "object", "Send the numbers with scene(\"pipeline\", map[string]any{...}).");
assert(want.length > 0, "internal: the sample sea should contain a storm");
assertEqual(scene.pipeline.seqs, want, "pipeline.seqs (Seq numbers of buoy 4's readings with Wave >= 150, in order; remember the stages must not reorder anything)");
assertEqual(scene.pipeline.out, want.length, "pipeline.out (how many readings survived the filter)");
assertEqual(scene.pipeline.in, 40, "pipeline.in");`,
        },
        {
          id: "t2",
          description: "the first storm reading was calibrated",
          assertionCode: js`${READ}
const first = readingsFor(4, 40).filter((r) => r.Wave >= 150)[0];
assertEqual(scene.pipeline.raw, first.Temp, "pipeline.raw (the original Temp of the first storm reading)");
assertEqual(scene.pipeline.calibrated, first.Temp + 5, "pipeline.calibrated (raw Temp plus buoy 4's offset of 5; calibrate must adjust r.Temp before forwarding)");`,
        },
      ],
      unlocks: ["gp-pipeline"],
      checks: [
        {
          prompt: "Why does every stage `defer close(out)` on the channel it created?",
          question: {
            type: "choice",
            options: ["To free memory", "So the next stage's range loop ends when this stage has no more to send", "Because Go requires closing every channel", "To make the stage run faster"],
            answer: 1,
          },
          explanation: "Closing is how \"that is all\" travels down the line. Without it the final loop would wait forever for another reading.",
        },
        {
          prompt: "A pipeline has 3 stages, each holding at most one reading. After the line is full, how many readings can be in progress at the same time?",
          question: { type: "number", answer: 3 },
          explanation: "Each stage works on its own reading while its neighbours work on theirs. That overlap is the whole point of a pipeline.",
        },
      ],
    },

    // ───────────────────────── 10 ─────────────────────────
    {
      id: "go-pipeline-10-worker-pool",
      title: "A pool of workers",
      minutes: 40,
      xp: 160,
      concepts: ["worker pool", "jobs channel", "results channel", "bounded concurrency", "result carries its index", "close jobs then wait then close results"],
      learn: md`### Four stoves, many orders

A restaurant does not hire a new cook for every order. It has a **fixed team** at fixed stoves. Orders pile on a rail, each free cook takes the next ticket, and when a cook finishes one they take another. The number of cooks stays the same whether there are ten orders or ten thousand.

That is a **worker pool**. It matters because goroutines are cheap but not free, and the work they do (opening files, calling servers, using memory) usually is not. A pool puts a **ceiling** on how much happens at once.

Its anatomy:

- a **jobs** channel: the rail of order tickets;
- N **workers**: goroutines that each loop \`for job := range jobs\`;
- a **results** channel: where finished work goes;
- a WaitGroup so we know when the workers are done.

~~~go
type Job struct {
	Index int // where this job's answer goes
	Buoy  int
	Count int // how many readings to summarise
}

type Result struct {
	Index int
	Sum   Summary
}

func worker(jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
	defer wg.Done()
	for j := range jobs {
		results <- Result{Index: j.Index, Sum: summarize(j.Buoy, j.Count)}
	}
}
~~~

\`chan<- Result\` is the opposite of \`<-chan\`: a channel you may only **send** into. The worker takes the WaitGroup by pointer (\`*sync.WaitGroup\`) because it must tell the **same** whiteboard, not a copy.

### Running the pool

~~~go
func runPool(list []Job, workers int) []Summary {
	jobs := make(chan Job, len(list))        // room for every ticket
	results := make(chan Result, len(list))  // room for every answer
	var wg sync.WaitGroup
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go worker(jobs, results, &wg)
	}
	for _, j := range list {
		jobs <- j
	}
	close(jobs)      // no more tickets: workers leave when the rail is empty
	wg.Wait()        // all workers finished
	close(results)   // all answers are in

	out := make([]Summary, len(list))
	for r := range results {
		out[r.Index] = r.Sum  // put each answer in ITS OWN slot
	}
	return out
}
~~~

The order of those steps is the heart of it. Study the "who does what" table for 2 workers (A, B) and 3 jobs. Which worker takes which job **can differ from run to run**, so the table shows one possible run:

| step | main | worker A | worker B |
| --- | --- | --- | --- |
| 1 | puts jobs 0, 1, 2 on the rail, then \`close(jobs)\` | | |
| 2 | \`wg.Wait()\` | takes job 0 | takes job 1 |
| 3 | still waiting | finishes 0, takes job 2 | finishes 1, finds the rail empty and closed: leaves |
| 4 | still waiting | finishes 2, rail empty: leaves | |
| 5 | \`Wait\` returns, \`close(results)\`, collects | | |

### Why the result carries an index

Jobs finish in whatever order the workers happen to finish them. If you appended results as they arrive, the list would be in a different order on a different run. By stamping each job with its \`Index\` and writing the answer to \`out[Index]\`, the final slice is **always** in job order, and the answer is the same on every run. The sizes of the two channels (one slot per job) mean no worker ever waits to deliver its answer, so \`wg.Wait()\` can finish before we start reading.

### Common mistakes

- Closing \`results\` before \`wg.Wait()\` returns: a worker still sending would crash.
- Forgetting \`close(jobs)\`: the workers wait forever for another ticket and \`Wait\` never returns.
- Starting a goroutine per job instead of a fixed pool, then wondering why memory use explodes.
- Printing "worker 3 did job 7" and expecting the same line every run. Which worker takes which job is up to the scheduler. Report **what** was computed, not **who** computed it.`,
      mission: md`A big storm is coming and the buoys have queued up twelve batches of different sizes. You cannot start unlimited goroutines on the harbour server, so you will hire a pool of four workers.

\`Job\` and \`Result\` are provided. Write \`worker\` and \`runPool\`, run the twelve jobs, and prove that the answers come back in job order and match a plain one-at-a-time run. When this lesson passes the **Worker pool** lights up on the board.`,
      tasks: [
        "Write func worker(jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup): defer wg.Done(), then for each job send a Result carrying the job's Index and summarize(j.Buoy, j.Count)",
        "Write func runPool(list []Job, workers int) []Summary following the learn text: buffered jobs and results channels, start the workers, queue the jobs, close(jobs), wg.Wait(), close(results), then put each Result into out[r.Index]",
        "In main: build twelve jobs poolJobs where job i has Index i, Buoy i%fleetSize+1 and Count 20+i*5",
        "Run poolSums := runPool(poolJobs, 4) and check it against a plain loop of summarize calls (poolMatch), then print: 12 jobs on 4 workers, same as one-at-a-time: true",
        "Send pool (a map[string]any with \"workers\" = 4, \"jobs\" = 12, \"summaries\" = poolSums and \"match\" = poolMatch) with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Provided: a job and its result. Index says where the answer belongs in the final list.
type Job struct {
	Index int
	Buoy  int
	Count int // how many readings to summarise
}

type Result struct {
	Index int
	Sum   Summary
}

// Lesson 9 turned into lesson 10: write the pool.
//   func worker(jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup)
//   func runPool(list []Job, workers int) []Summary
//     jobs and results are buffered with len(list) slots; close(jobs) then wg.Wait() then close(results)
//     out[r.Index] = r.Sum for every result

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 10: twelve jobs, four workers.
//   poolJobs: for i := 0; i < 12; i++ { Job{Index: i, Buoy: i%fleetSize + 1, Count: 20 + i*5} }
//   poolSums := runPool(poolJobs, 4)
//   poolMatch: compare with a plain loop of summarize(j.Buoy, j.Count) using fmt.Sprint on both
//   scene("pool", map[string]any{"workers": 4, "jobs": 12, "summaries": poolSums, "match": poolMatch})`,
      solutionAdd: go`// Job is one batch to summarise. Index says where the answer belongs in the final list.
type Job struct {
	Index int
	Buoy  int
	Count int // how many readings to summarise
}

// Result is a finished job, stamped with the same Index.
type Result struct {
	Index int
	Sum   Summary
}

// worker takes jobs until the jobs channel is closed and empty.
func worker(jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
	defer wg.Done()
	for j := range jobs {
		results <- Result{Index: j.Index, Sum: summarize(j.Buoy, j.Count)}
	}
}

// runPool summarises every job with a fixed number of workers and returns the answers in job order.
func runPool(list []Job, workers int) []Summary {
	jobs := make(chan Job, len(list))
	results := make(chan Result, len(list))
	var wg sync.WaitGroup
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go worker(jobs, results, &wg)
	}
	for _, j := range list {
		jobs <- j
	}
	close(jobs) // no more tickets
	wg.Wait()   // every worker has finished
	close(results)

	out := make([]Summary, len(list))
	for r := range results {
		out[r.Index] = r.Sum
	}
	return out
}

${MAIN_DIVIDER}

// Lesson 10: twelve jobs, four workers.
var poolJobs []Job
for i := 0; i < 12; i++ {
	poolJobs = append(poolJobs, Job{Index: i, Buoy: i%fleetSize + 1, Count: 20 + i*5})
}
poolSums := runPool(poolJobs, 4)

plain := make([]Summary, len(poolJobs))
for i, j := range poolJobs {
	plain[i] = summarize(j.Buoy, j.Count)
}
poolMatch := fmt.Sprint(poolSums) == fmt.Sprint(plain)
fmt.Println("12 jobs on 4 workers, same as one-at-a-time:", poolMatch)

scene("pool", map[string]any{"workers": 4, "jobs": 12, "summaries": poolSums, "match": poolMatch})`,
      explanation:
        "runPool starts a fixed number of workers, queues all the jobs, closes the jobs channel so the workers know to leave, waits for them and only then closes results. Every Result carries the Index of its job and is written into out[Index], so the final slice is in job order however the workers interleaved. Which worker did which job is not reported, because that part is not deterministic.",
      hints: [
        { id: "h1", title: "worker", content: "defer wg.Done(), then for j := range jobs { results <- Result{Index: j.Index, Sum: summarize(j.Buoy, j.Count)} }." },
        { id: "h2", title: "runPool", content: "Make both channels with len(list) slots. Start workers with wg.Add(1); go worker(jobs, results, &wg). Send every job, close(jobs), wg.Wait(), close(results). Then out := make([]Summary, len(list)) and for r := range results { out[r.Index] = r.Sum }." },
        { id: "h3", title: "main", content: "Build jobs with Job{Index: i, Buoy: i%fleetSize + 1, Count: 20 + i*5}. For the check build plain[i] = summarize(j.Buoy, j.Count) in a normal loop and compare with fmt.Sprint(poolSums) == fmt.Sprint(plain)." },
      ],
      tests: [
        {
          id: "t1",
          description: "all twelve jobs came back in job order",
          assertionCode: js`${READ}
assert(scene.pool && typeof scene.pool === "object", "Send the numbers with scene(\"pool\", map[string]any{...}).");
assertEqual(scene.pool.workers, 4, "pool.workers");
assertEqual(scene.pool.jobs, 12, "pool.jobs");
assert(Array.isArray(scene.pool.summaries), "pool.summaries should be the list returned by runPool.");
assertEqual(scene.pool.summaries.length, 12, "pool.summaries (one answer per job)");
for (let i = 0; i < 12; i++) {
  assertEqual(scene.pool.summaries[i], summaryOf((i % 6) + 1, 20 + i * 5), "summaries[" + i + "] (job " + i + ": buoy " + ((i % 6) + 1) + ", " + (20 + i * 5) + " readings; each Result must be written to out[r.Index])");
}`,
        },
        {
          id: "t2",
          description: "the pool agrees with a plain loop",
          assertionCode: js`
assertEqual(scene.pool.match, true, "pool.match (compare the pool's answers with a one-at-a-time loop)");
assert(stdout.includes("same as one-at-a-time: true"), "Print: 12 jobs on 4 workers, same as one-at-a-time: true");`,
        },
      ],
      unlocks: ["gp-pool"],
      checks: [
        {
          prompt: "A pool of 4 workers is given 10,000 jobs. How many goroutines run the jobs?",
          question: { type: "number", answer: 4 },
          explanation: "That is the point of a pool: the number of workers is fixed. The other jobs wait on the jobs channel until a worker is free.",
        },
        {
          prompt: "Why does each Result carry the job's Index?",
          question: {
            type: "choice",
            options: ["Channels need an index to work", "Workers finish in any order, so the index tells main where each answer belongs", "To count the jobs", "It makes the workers faster"],
            answer: 1,
          },
          explanation: "Arrival order changes from run to run. Writing the answer to out[Index] gives the same final list every time.",
        },
      ],
    },

    // ───────────────────────── 11 ─────────────────────────
    {
      id: "go-pipeline-11-fan-out-in",
      title: "Fan-out and fan-in",
      minutes: 40,
      xp: 160,
      concepts: ["fan-in (merge)", "fan-out (spread)", "closer goroutine", "order is lost", "sort before comparing"],
      learn: md`### Many into one, one into many

Two shapes show up in almost every concurrent program.

**Fan-in**: many streams, one consumer. Six buoys each have their own stream. The forecaster wants **one** feed. Picture six pipes pouring into one funnel.

**Fan-out**: one stream, many workers. Calibrating is slow, and one stage goroutine is the bottleneck. Hire three calibrators that all take from the same input channel, and each reading goes to whichever is free. Picture one pipe splitting into three.

### Fan-in: merge

~~~go
func merge(inputs ...<-chan Reading) <-chan Reading {
	out := make(chan Reading)
	var wg sync.WaitGroup
	for _, in := range inputs {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for r := range in {
				out <- r
			}
		}()
	}
	go func() {      // the closer
		wg.Wait()    // every input has run dry
		close(out)
	}()
	return out
}
~~~

New things here:

- \`inputs ...<-chan Reading\` is a **variadic** parameter: the caller may pass any number of channels, and inside the function \`inputs\` is a slice of them. To pass an existing slice use \`merge(feeds...)\`.
- One forwarding goroutine per input copies everything into the shared \`out\`.
- **Who closes \`out\`?** Not any single forwarder, because the others may still be sending. A separate **closer** goroutine waits for all forwarders with the WaitGroup, then closes. This is the standard fan-in recipe.

### Fan-out: spread

~~~go
func spread(in <-chan Reading, n int, f func(Reading) Reading) <-chan Reading {
	outs := make([]<-chan Reading, n)
	for i := 0; i < n; i++ {
		out := make(chan Reading)
		outs[i] = out
		go func() {
			defer close(out)
			for r := range in {  // all n workers take from the same channel
				out <- f(r)
			}
		}()
	}
	return merge(outs...)         // fan-in the n answers
}
~~~

Several goroutines ranging over the **same** channel is fine: each value goes to exactly one of them. The function \`f\` is the work to do (passed in as a parameter, like the sort functions you have used). Fan-out followed by fan-in is the shape of a worker pool, built from channels only.

### A tiny example and its exact output

~~~go
a := stream(1, 2)
b := stream(2, 2)
total := 0
for r := range merge(a, b) {
	total += r.Seq
}
fmt.Println(total)
~~~

~~~text
6
~~~

Whatever order the four readings arrive in, their Seq numbers (1, 2, 1, 2) add up to 6.

### The price: order is gone

Look at the merged stream: reading 3 of buoy 5 may arrive before reading 1 of buoy 2, or after, and that can change between runs. The same is true after \`spread\`. The data is all there, but the **order** is no longer guaranteed. Two rules follow:

- If order matters, carry a key (a buoy and sequence number, or an index) and **sort** after collecting.
- If it does not matter (sums, counts, maximums), do nothing. Addition gives the same answer in any order.

A trace for \`merge(a, b)\` with two readings each (one possible order only):

| step | forwarder for a | forwarder for b | out channel gets |
| --- | --- | --- | --- |
| 1 | sends a1 | sends b1 | a1 or b1 first (not decided) |
| 2 | sends a2 | sends b2 | the rest, in some order |
| 3 | a is empty: \`Done\` | b is empty: \`Done\` | |
| 4 | | | closer sees the tally at 0 and closes \`out\` |

### Common mistakes

- Closing \`out\` inside a forwarder. The first forwarder to finish would close the channel on the others.
- Printing the merged stream in arrival order and expecting identical output each run.
- Calling \`wg.Add\` inside the forwarding goroutines. The closer might see zero before they start.`,
      mission: md`Six buoy streams must become one feed, and the calibration stage needs three workers instead of one. Order will no longer be guaranteed, so you will collect everything and sort it before judging it.

Write \`merge\` and \`spread\`, merge six streams of 30 readings, spread them over three calibrators, then sort the result and count it per buoy. When this lesson passes the **Fan-in** panel lights up on the board.`,
      tasks: [
        "Write func merge(inputs ...<-chan Reading) <-chan Reading: one forwarding goroutine per input, a WaitGroup, and a separate closer goroutine that waits and then closes the output",
        "Write func spread(in <-chan Reading, n int, f func(Reading) Reading) <-chan Reading: n workers ranging over the same in, each with its own output channel, merged with merge(outs...)",
        "In main: feeds is a slice of six streams stream(b, 30); gather every reading from spread(merge(feeds...), 3, fix) into fanned, where fix adds offsets()[r.Buoy] to r.Temp",
        "Sort fanned by Buoy and then Seq; count the readings per buoy into perBuoy (a map[int]int) and add up every Temp into tempSum",
        "Send fan (a map[string]any with \"streams\" = 6, \"workers\" = 3, \"total\" = len(fanned), \"perBuoy\", \"tempSum\" and \"first\" = the first sorted reading) with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 11: write both shapes.
//   func merge(inputs ...<-chan Reading) <-chan Reading
//     one goroutine per input copies into out ; a CLOSER goroutine does wg.Wait() then close(out)
//   func spread(in <-chan Reading, n int, f func(Reading) Reading) <-chan Reading
//     n goroutines all range over in ; each has its own out ; return merge(outs...)

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 11: six feeds into one, three calibrators.
//   var feeds []<-chan Reading ; for b := 1..fleetSize { feeds = append(feeds, stream(b, 30)) }
//   fix := func(r Reading) Reading { r.Temp += offsets()[r.Buoy] ; return r }
//   gather spread(merge(feeds...), 3, fix) into fanned
//   sort.Slice(fanned, ...) by Buoy then Seq ; perBuoy := map[int]int{} ; tempSum := 0
//   scene("fan", map[string]any{"streams": 6, "workers": 3, "total": len(fanned), "perBuoy": perBuoy, "tempSum": tempSum, "first": fanned[0]})`,
      solutionAdd: go`// merge is fan-in: it copies many channels into one, and closes the result once every input is dry.
func merge(inputs ...<-chan Reading) <-chan Reading {
	out := make(chan Reading)
	var wg sync.WaitGroup
	for _, in := range inputs {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for r := range in {
				out <- r
			}
		}()
	}
	go func() { // the closer: only it may close out, because it knows when ALL forwarders are done
		wg.Wait()
		close(out)
	}()
	return out
}

// spread is fan-out: n workers share one input, apply f, and their answers are merged back into one channel.
func spread(in <-chan Reading, n int, f func(Reading) Reading) <-chan Reading {
	outs := make([]<-chan Reading, n)
	for i := 0; i < n; i++ {
		out := make(chan Reading)
		outs[i] = out
		go func() {
			defer close(out)
			for r := range in {
				out <- f(r)
			}
		}()
	}
	return merge(outs...)
}

${MAIN_DIVIDER}

// Lesson 11: six feeds into one, three calibrators.
var feeds []<-chan Reading
for b := 1; b <= fleetSize; b++ {
	feeds = append(feeds, stream(b, 30))
}
fix := func(r Reading) Reading {
	r.Temp += offsets()[r.Buoy]
	return r
}
var fanned []Reading
for r := range spread(merge(feeds...), 3, fix) {
	fanned = append(fanned, r)
}
sort.Slice(fanned, func(a, b int) bool {
	if fanned[a].Buoy != fanned[b].Buoy {
		return fanned[a].Buoy < fanned[b].Buoy
	}
	return fanned[a].Seq < fanned[b].Seq
})
perBuoy := map[int]int{}
tempSum := 0
for _, r := range fanned {
	perBuoy[r.Buoy]++
	tempSum += r.Temp
}
fmt.Println("merged", len(fanned), "readings from 6 streams; per buoy:", perBuoy)

scene("fan", map[string]any{"streams": 6, "workers": 3, "total": len(fanned), "perBuoy": perBuoy, "tempSum": tempSum, "first": fanned[0]})`,
      explanation:
        "merge starts one forwarder per input and a separate closer goroutine that waits for all of them before closing the output, so the channel closes exactly once and only when every input is dry. spread starts n workers on the same input channel (each reading goes to exactly one of them) and merges their outputs. The arrival order is undefined, so the readings are sorted by Buoy and Seq before being compared; counts and sums do not depend on order anyway.",
      hints: [
        { id: "h1", title: "merge", content: "out := make(chan Reading); var wg sync.WaitGroup; for _, in := range inputs { wg.Add(1); go func() { defer wg.Done(); for r := range in { out <- r } }() }. Then go func() { wg.Wait(); close(out) }() and return out." },
        { id: "h2", title: "spread", content: "outs := make([]<-chan Reading, n). In a loop of n: out := make(chan Reading); outs[i] = out; go func() { defer close(out); for r := range in { out <- f(r) } }(). Finish with return merge(outs...)." },
        { id: "h3", title: "Sorting and counting", content: "sort.Slice(fanned, func(a, b int) bool { if fanned[a].Buoy != fanned[b].Buoy { return fanned[a].Buoy < fanned[b].Buoy }; return fanned[a].Seq < fanned[b].Seq }). Then loop once to fill perBuoy[r.Buoy]++ and tempSum += r.Temp." },
      ],
      tests: [
        {
          id: "t1",
          description: "all 180 readings came through, 30 per buoy",
          assertionCode: js`${READ}
assert(scene.fan && typeof scene.fan === "object", "Send the numbers with scene(\"fan\", map[string]any{...}).");
assertEqual(scene.fan.total, 180, "fan.total (6 streams x 30 readings; did the closer wait for every forwarder before closing?)");
for (let b = 1; b <= 6; b++) assertEqual(scene.fan.perBuoy[String(b)], 30, "fan.perBuoy for buoy " + b);`,
        },
        {
          id: "t2",
          description: "the fixed temperatures add up, and the sorted list starts right",
          assertionCode: js`${READ}
const offs = { 1: 3, 2: -2, 3: 0, 4: 5, 5: -4, 6: 1 };
let sum = 0;
for (let b = 1; b <= 6; b++) for (const r of readingsFor(b, 30)) sum += r.Temp + offs[b];
assertEqual(scene.fan.tempSum, sum, "fan.tempSum (every reading's Temp plus its buoy's offset, added up)");
const r1 = readingsFor(1, 30)[0];
assertEqual(scene.fan.first, { ...r1, Temp: r1.Temp + 3 }, "fan.first (the first reading after sorting by Buoy then Seq: buoy 1, Seq 1, with the offset added)");
assertEqual(scene.fan.workers, 3, "fan.workers");`,
        },
      ],
      unlocks: ["gp-fan"],
      checks: [
        {
          prompt: "In `merge`, why is `close(out)` done by a separate goroutine instead of by one of the forwarders?",
          question: {
            type: "choice",
            options: ["Forwarders are not allowed to close channels", "A forwarder that finishes first would close the channel while the others still send", "Closing is slow", "So the output order stays fixed"],
            answer: 1,
          },
          explanation: "Only something that knows ALL forwarders are done can safely close. The closer waits on the WaitGroup, which is exactly that knowledge.",
        },
        {
          prompt: "After merging six streams, can you rely on readings arriving buoy 1 first, then buoy 2?",
          question: { type: "choice", options: ["Yes, merge keeps input order", "No, arrival order is not decided, so sort if order matters"], answer: 1 },
          explanation: "The forwarders run at the same time, so the order is up to timing. Sorting by a key afterwards is how you make the answer repeatable.",
        },
      ],
    },

    // ───────────────────────── 12 ─────────────────────────
    {
      id: "go-pipeline-12-logical-ticks",
      title: "Measuring a pool in ticks",
      minutes: 40,
      xp: 170,
      concepts: ["logical time", "simulation", "makespan", "queue depth over time", "utilisation", "why more workers stop helping"],
      learn: md`### How many workers do we need?

You now have a worker pool. The harbour master asks the question every manager asks: *"How many workers should we run? Eight? Twenty?"*

The obvious way is to run the pool and time it with a stopwatch. That is a poor answer for two reasons. First, the time depends on the machine, other programs, even the weather in the data centre, so it changes every run. Second, a test that depends on a stopwatch fails at random.

Engineers have a better tool: **simulate in logical time**. Time is counted in **ticks**, made-up units where a job that costs 4 takes exactly 4 ticks. A simulation is just a function: same input, same output, forever. It teaches you the *shape* of the pool's behaviour (when workers sit idle, how long the line gets, what extra workers buy you) without any real goroutines at all.

### The rules of our little world

- Job \`j\` **arrives** at tick \`arrive[j]\` and needs \`cost[j]\` ticks of work.
- Jobs are served in order (first come, first served).
- A free worker takes the next job as soon as it has arrived. If several workers are free, the **lowest-numbered** one takes it.
- A job **starts** at \`max(its arrival, the tick its worker becomes free)\` and **ends** \`cost\` ticks later.

Here is a worked example: 4 jobs, 2 workers.

| job | arrives | cost |
| --- | --- | --- |
| 0 | 0 | 3 |
| 1 | 0 | 1 |
| 2 | 0 | 2 |
| 3 | 0 | 2 |

| job | worker | starts | ends | why |
| --- | --- | --- | --- | --- |
| 0 | 0 | 0 | 3 | both free, lowest number takes it |
| 1 | 1 | 0 | 1 | worker 0 is busy until 3, worker 1 is free |
| 2 | 1 | 1 | 3 | worker 1 frees up at 1 (worker 0 at 3) |
| 3 | 0 | 3 | 5 | both free at 3, lowest number takes it |

Read off the answers:

- **Makespan** (the tick when the last job ends): **5**.
- **Busy ticks** per worker: worker 0 = 3 + 2 = 5, worker 1 = 1 + 2 = 3. Worker 1 sat idle for 2 of the 5 ticks.
- **Queue depth** at the start of each tick = jobs that have arrived but have not started: tick 0 has jobs 2 and 3 waiting (2), tick 1 has job 3 only (1), tick 2 has 1, ticks 3 and 4 have 0. So depth = [2, 1, 1, 0, 0], and the **peak** queue is 2.
- **Utilisation** = busy ticks of all workers ÷ (workers × makespan) = 8 ÷ 10 = **80 %**.

### Keeping the books in Go

~~~go
type Slot struct {
	Job, Worker, Start, End int
}

type Sim struct {
	Workers   int
	Slots     []Slot // one per job
	Makespan  int    // tick when the last job ended
	Busy      []int  // busy ticks per worker
	PeakQueue int    // the longest the waiting line ever got
	Depth     []int  // queue depth at the start of each tick 0..Makespan-1
}
~~~

The core loop keeps one number per worker: the tick when that worker next becomes free (\`freeAt\`). For each job, pick the worker with the smallest \`freeAt\` (the lowest index if tied), start at the later of the job's arrival and that tick, and move that worker's \`freeAt\` forward.

~~~go
freeAt := make([]int, workers)
// for each job j:
w := 0
for k := 1; k < workers; k++ {
	if freeAt[k] < freeAt[w] { // strictly less, so ties keep the lowest index
		w = k
	}
}
start := arrive[j]
if freeAt[w] > start {
	start = freeAt[w]
}
freeAt[w] = start + cost[j]
~~~

### What the numbers tell you

Run the same jobs with 1, 2, then 4 workers and compare makespans and utilisation. You will see **diminishing returns**: going from one worker to two helps a lot, going from four to eight helps almost nothing, because there are not enough jobs waiting (or the longest single job is the limit). Utilisation shows it plainly: extra workers just sit idle. That is the decision the harbour master can now make from numbers instead of guesses.

### Common mistakes

- Mixing real time into the simulation. Keep it pure: arrays in, results out.
- Picking the worker with \`<=\` when comparing \`freeAt\`: ties then go to the highest index, and your answers will not match.
- Forgetting that a job cannot start before it **arrives**, even if a worker is free.`,
      mission: md`The harbour master wants to know how many workers to run. Instead of a stopwatch you will build a simulator and answer in ticks.

\`Slot\` and \`Sim\` are provided. Write \`simulate\`, run the same eight jobs with 1, 2 and 3 workers, and compute each run's utilisation. When this lesson passes the **Tick chart** lights up on the board, with every worker's busy and idle time and the queue depth.`,
      tasks: [
        "Write func simulate(arrive, cost []int, workers int) Sim: a freeAt slice, pick the lowest-numbered worker with the smallest freeAt, start = max(arrival, freeAt), record a Slot, add cost to that worker's Busy",
        "After the jobs: set Makespan to the largest Slot End, and for every tick t from 0 to Makespan-1 count the slots with arrive[Job] <= t && t < Start to fill Depth; PeakQueue is the largest Depth value",
        "In main: arrive := []int{0, 0, 0, 1, 2, 2, 3, 5} and cost := []int{4, 2, 6, 3, 5, 2, 4, 3}; make runs by calling simulate with 1, 2 and 3 workers",
        "Work out util (a []int): for each run, total busy ticks * 100 / (workers * Makespan), using whole-number division",
        "Send ticks (a map[string]any with \"runs\" = runs, \"util\" = util and \"best\" = the number of workers that gave the smallest Makespan; if tied, the fewest workers) with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Provided: what the simulator reports.
type Slot struct {
	Job, Worker, Start, End int
}

type Sim struct {
	Workers   int
	Slots     []Slot // one per job
	Makespan  int    // tick when the last job ended
	Busy      []int  // busy ticks per worker
	PeakQueue int    // the longest the waiting line ever got
	Depth     []int  // queue depth at the start of each tick 0..Makespan-1
}

// Lesson 12: write simulate (pure arithmetic: no goroutines, no clock).
//   func simulate(arrive, cost []int, workers int) Sim
//   freeAt := make([]int, workers) ; each job goes to the worker with the smallest freeAt (strictly less, so ties keep the lowest index)
//   start = max(arrive[j], freeAt[w]) ; end = start + cost[j]
//   afterwards: Makespan, then Depth[t] = count of slots with arrive[s.Job] <= t && t < s.Start, then PeakQueue

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 12: the same eight jobs with 1, 2 and 3 workers.
//   arrive := []int{0, 0, 0, 1, 2, 2, 3, 5} ; cost := []int{4, 2, 6, 3, 5, 2, 4, 3}
//   runs := []Sim{simulate(arrive, cost, 1), simulate(arrive, cost, 2), simulate(arrive, cost, 3)}
//   util: busy total * 100 / (workers * Makespan) for each run ; best: fewest workers with the smallest Makespan
//   scene("ticks", map[string]any{"runs": runs, "util": util, "best": best})`,
      solutionAdd: go`// Slot says when one job ran and on which worker.
type Slot struct {
	Job, Worker, Start, End int
}

// Sim is everything the simulator reports about one run of the pool.
type Sim struct {
	Workers   int
	Slots     []Slot // one per job
	Makespan  int    // tick when the last job ended
	Busy      []int  // busy ticks per worker
	PeakQueue int    // the longest the waiting line ever got
	Depth     []int  // queue depth at the start of each tick 0..Makespan-1
}

// simulate plays a pool in logical ticks. Jobs are served first come, first served; a job starts when
// it has arrived and a worker is free, and the lowest-numbered free worker takes it.
func simulate(arrive, cost []int, workers int) Sim {
	sim := Sim{Workers: workers, Busy: make([]int, workers)}
	freeAt := make([]int, workers)
	for j := range cost {
		w := 0
		for k := 1; k < workers; k++ {
			if freeAt[k] < freeAt[w] {
				w = k
			}
		}
		start := arrive[j]
		if freeAt[w] > start {
			start = freeAt[w]
		}
		end := start + cost[j]
		freeAt[w] = end
		sim.Busy[w] += cost[j]
		sim.Slots = append(sim.Slots, Slot{Job: j, Worker: w, Start: start, End: end})
		if end > sim.Makespan {
			sim.Makespan = end
		}
	}
	for t := 0; t < sim.Makespan; t++ {
		waiting := 0
		for _, s := range sim.Slots {
			if arrive[s.Job] <= t && t < s.Start {
				waiting++
			}
		}
		sim.Depth = append(sim.Depth, waiting)
		if waiting > sim.PeakQueue {
			sim.PeakQueue = waiting
		}
	}
	return sim
}

${MAIN_DIVIDER}

// Lesson 12: the same eight jobs with 1, 2 and 3 workers.
arrive := []int{0, 0, 0, 1, 2, 2, 3, 5}
cost := []int{4, 2, 6, 3, 5, 2, 4, 3}
runs := []Sim{simulate(arrive, cost, 1), simulate(arrive, cost, 2), simulate(arrive, cost, 3)}
util := []int{}
best := 0
for i, run := range runs {
	busy := 0
	for _, b := range run.Busy {
		busy += b
	}
	util = append(util, busy*100/(run.Workers*run.Makespan))
	if i == 0 || run.Makespan < runs[best].Makespan {
		best = i
	}
	fmt.Println(run.Workers, "worker(s): done at tick", run.Makespan, "utilisation", util[i], "% peak queue", run.PeakQueue)
}

scene("ticks", map[string]any{"runs": runs, "util": util, "best": runs[best].Workers})`,
      explanation:
        "simulate keeps one freeAt number per worker. Each job goes to the worker that frees up first (lowest index on a tie), starts at the later of its arrival and that tick, and moves the worker's freeAt forward. After the loop, Makespan is the latest end, and Depth[t] counts the jobs that have arrived but not started at tick t. Utilisation is total busy ticks as a percentage of workers x makespan. With these jobs the longest single job (6 ticks) and the arrival times set a floor on the makespan, so each extra worker buys less than the one before and utilisation drops.",
      hints: [
        { id: "h1", title: "Choosing the worker", content: "w := 0; for k := 1; k < workers; k++ { if freeAt[k] < freeAt[w] { w = k } }. Use < (not <=) so ties keep the lowest index." },
        { id: "h2", title: "Start, end, books", content: "start := arrive[j]; if freeAt[w] > start { start = freeAt[w] }; end := start + cost[j]; freeAt[w] = end; sim.Busy[w] += cost[j]; append a Slot{Job: j, Worker: w, Start: start, End: end}; and raise sim.Makespan if end is bigger." },
        { id: "h3", title: "Depth", content: "for t := 0; t < sim.Makespan; t++ { waiting := 0; for _, s := range sim.Slots { if arrive[s.Job] <= t && t < s.Start { waiting++ } }; sim.Depth = append(sim.Depth, waiting); update sim.PeakQueue }. Create Busy with make([]int, workers) at the start." },
      ],
      tests: [
        {
          id: "t1",
          description: "each simulated run follows the rules",
          assertionCode: js`${SIM_JS}
const arrive = [0, 0, 0, 1, 2, 2, 3, 5], cost = [4, 2, 6, 3, 5, 2, 4, 3];
assert(scene.ticks && Array.isArray(scene.ticks.runs), "Send the runs with scene(\"ticks\", map[string]any{\"runs\": runs, ...}).");
assertEqual(scene.ticks.runs.length, 3, "ticks.runs (runs with 1, 2 and 3 workers)");
for (let i = 0; i < 3; i++) {
  const want = simulate(arrive, cost, i + 1), got = scene.ticks.runs[i];
  assertEqual(got.Slots, want.Slots, "runs[" + i + "].Slots with " + (i + 1) + " worker(s) (job, worker, start, end for each job; lowest-numbered free worker, start = max(arrival, freeAt))");
  assertEqual(got.Makespan, want.Makespan, "runs[" + i + "].Makespan");
  assertEqual(got.Busy, want.Busy, "runs[" + i + "].Busy");
}`,
        },
        {
          id: "t2",
          description: "queue depth, peak and utilisation",
          assertionCode: js`${SIM_JS}
const arrive = [0, 0, 0, 1, 2, 2, 3, 5], cost = [4, 2, 6, 3, 5, 2, 4, 3];
const wants = [1, 2, 3].map((n) => simulate(arrive, cost, n));
for (let i = 0; i < 3; i++) {
  assertEqual(scene.ticks.runs[i].Depth, wants[i].Depth, "runs[" + i + "].Depth (jobs that have arrived but not started, at the start of each tick)");
  assertEqual(scene.ticks.runs[i].PeakQueue, wants[i].PeakQueue, "runs[" + i + "].PeakQueue");
}
const util = wants.map((s) => Math.floor((s.Busy.reduce((a, b) => a + b, 0) * 100) / (s.Workers * s.Makespan)));
assertEqual(scene.ticks.util, util, "ticks.util (whole-number percent: busy total * 100 / (workers * makespan))");
let best = 0;
wants.forEach((s, i) => { if (s.Makespan < wants[best].Makespan) best = i; });
assertEqual(scene.ticks.best, best + 1, "ticks.best (the fewest workers that reach the smallest makespan)");`,
        },
      ],
      unlocks: ["gp-gantt"],
      checks: [
        {
          prompt: "Using the worked example in the lesson (4 jobs, 2 workers), what is the makespan?",
          question: { type: "number", answer: 5 },
          explanation: "Job 3 is the last to finish: it starts at tick 3 on worker 0 and costs 2 ticks, ending at tick 5.",
        },
        {
          prompt: "Why is a logical-tick simulation a better way to compare pool sizes than a stopwatch?",
          question: {
            type: "choice",
            options: ["Computers have no clocks", "It gives the same answer every run, on any machine", "It is always faster than real code", "A stopwatch cannot measure goroutines"],
            answer: 1,
          },
          explanation: "Real timings change with load and hardware. A simulation is pure arithmetic, so its answers are repeatable and can be tested.",
        },
      ],
    },
  ],
};
