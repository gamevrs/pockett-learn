import type { Chapter } from "@/engine/types";
import { TYPES_DIVIDER } from "../../../engine/compose.ts";
import { cs, js, md } from "./util.ts";

export const chapter4: Chapter = {
  id: "async",
  title: "Async and concurrency",
  blurb: "Wait without blocking, stop work cleanly, and pass work between tasks with backpressure.",
  lessons: [
    // ───────────────────────── 11 ─────────────────────────
    {
      id: "csharp-delegates-11-async",
      title: "Async and await",
      minutes: 40,
      xp: 230,
      concepts: ["Task<T>", "async / await", "continuations", "Task.WhenAll", "Task.WhenAny", "faulted tasks", "AggregateException", "async void"],
      learn: md`### Waiting is the most common thing a program does

At Lantern Hall the desk spends nearly all of its life waiting: for the fly bar to reach its mark, for the turntable to stop, for the sound system to answer. The oldest way to wait is to park a thread and let it sit there. That works for one scene change and collapses at fifty, because a parked thread costs memory and does nothing useful.

\`async\` and \`await\` are C#'s answer. You write code that **reads** top to bottom, as if each wait were a blocking call, while the program **behaves** as "start this, go and do something else, come back when it is done".

### A Task is a promise

A \`Task<string>\` is an object that stands for a string that does not exist yet. Holding one does not mean the work is finished. It means somebody has started it and will fill in the result, or the failure, later. A task is always in one of a few states: still running (\`WaitingForActivation\`), \`RanToCompletion\`, \`Faulted\` (it threw) or \`Canceled\`.

~~~csharp
Task<string> pending = MoveScenery("flats", 20);
Console.WriteLine(pending.IsCompleted);   // False: the move has only just begun
string text = await pending;              // wait for the answer, without holding a thread
~~~

### What the compiler really does

An \`async\` method is rewritten by the compiler into a small **state machine**: a hidden object that remembers which \`await\` the method is waiting at and what its local variables held. The rules of the game are short:

1. The body runs **synchronously, on the caller's stack**, right up to the first \`await\` whose task has not finished yet. If you print on the first line of an async method, that line appears before the method has returned anything.
2. At that \`await\` the method **returns its Task to the caller** and parks its state. Nothing blocks.
3. When the awaited task completes, the rest of the body (the **continuation**) is scheduled and the state machine picks up exactly where it stopped.

Two consequences matter every day. First, the \`async\` keyword does **not** start a new thread; \`Task.Delay\` is a timer, and a method that only awaits timers uses no thread at all while it waits. Second, *which* thread runs the continuation is not your choice. A console program has no special synchronisation context, so the continuation lands on whichever thread-pool thread is free. A program that prints \`Thread.CurrentThread.IsThreadPoolThread\` before and after an \`await Task.Delay(5)\` shows \`False\` and then \`True\`. That is why the desk's span list is touched inside \`lock (spans)\`: several continuations may call \`Add\` at the same moment, and \`List<T>\` is not safe for that.

### One after another, or side by side

Calling an async method **starts** it. Awaiting **collects** it. Mixing those two up is the most common performance bug in async code.

~~~csharp
// Sequential: the trap door does not even begin until the flats are home.
await MoveScenery("flats", 20);
await MoveScenery("trap door", 20);          // total time: about 40 ms

// Side by side: start everything first, then wait.
Task<string> a = MoveScenery("turntable", 30);
Task<string> b = MoveScenery("backdrop", 60);
Task<string> c = MoveScenery("chandelier", 90);
string[] home = await Task.WhenAll(a, b, c); // total time: about 90 ms, the slowest one
~~~

\`Task.WhenAll\` gives you a task that finishes when **all** of its inputs have, and its array of results follows the order of the arguments, not the order of finishing. \`Task.WhenAny\` finishes when the **first** one does, and hands you the *task* that won, not its result, so you \`await\` that winner again to unwrap it. It does not stop the losers; they keep running. Stopping them is the next lesson.

### When something throws

An exception thrown inside an async method does not fly up to the caller's line. The method has already returned a Task by then. Instead the exception is **stored in the task**, which becomes \`Faulted\`, and it comes out when somebody awaits.

- \`await\` **rethrows the first inner exception as itself**, so \`catch (InvalidOperationException ex)\` works as you would hope.
- If several tasks of a \`WhenAll\` fail, \`await\` still rethrows only the first. The whole set lives on the task: \`crewCall.Exception\` is an \`AggregateException\` whose \`InnerExceptions\` lists every failure. Read it when you need the full picture.
- \`.Result\` and \`.Wait()\` block the calling thread and throw the \`AggregateException\` wrapper instead. Avoid them; in programs with a UI they can deadlock, and in every program they waste the thread you were trying to save.
- A faulted task that nobody awaits fails **silently**. Nothing is printed and the program carries on.
- \`async void\` has nowhere to store the exception, so it is raised on a pool thread and ends the program. Use \`Task\` as the return type; keep \`async void\` for event handlers, where the signature is forced on you.

### Habits that save you

- Return \`Task\` or \`Task<T>\` and let callers await. Once one method awaits, its callers usually should too ("async all the way").
- Wait with \`await Task.Delay(ms)\`. \`Thread.Sleep\` inside async code puts the thread to sleep, which is exactly what you were avoiding.
- Never await inside \`lock\`. A lock belongs to a thread, and the continuation may resume on another one. The compiler refuses; \`SemaphoreSlim\` is the async-friendly tool.
- Anything several continuations touch (a shared list, a counter) needs a lock or a thread-safe type.

### Common mistakes

- Forgetting \`await\` and treating the task as the value:

~~~text
Program.cs(2,12): error CS0029: Cannot implicitly convert type 'System.Threading.Tasks.Task<string>' to 'string'
~~~

- Using \`await\` in a method that is not marked \`async\`:

~~~text
Program.cs(5,12): error CS4032: The 'await' operator can only be used within an async method. Consider marking this method with the 'async' modifier and changing its return type to 'Task<string>'.
~~~

- Giving an async method the wrong return type, for example \`async int Bad()\`:

~~~text
Program.cs(7,11): error CS1983: The return type of an async method must be void, Task, Task<T>, a task-like type, IAsyncEnumerable<T>, or IAsyncEnumerator<T>
~~~

- Awaiting inside \`lock\`:

~~~text
Program.cs(6,9): error CS1996: Cannot await in the body of a lock statement
~~~

- Reading \`.Result\` of a faulted task and being surprised that the type is not the one you threw:

~~~text
AggregateException: One or more errors occurred. (trap door jammed)
~~~

- A failing \`async void\` method takes the whole program down with a report that starts \`Unhandled exception. System.InvalidOperationException: ...\`, and the \`try/catch\` around the call never sees it.`,
      mission: md`Tonight's show, *The Lantern Maker*, has a scene change that moves the flats, drops the trap door, spins the turntable, flies the backdrop and lowers the chandelier. Wen, the fly crew lead, wants them to run side by side, because doing them one after another makes the audience sit in the dark for a full minute.

Odile Marsh, the stage manager, also wants to know what happens when the trap door and the fly bar both jam during a change. Your job is to make the moves async, run them side by side, and record every move as a bar with a start and an end.

When this lesson passes, the **Task timeline** panel powers on and draws your moves as bars: done, failed or still waiting.`,
      tasks: [
        "Under the divider declare record TaskSpan(string Name, int Start, int End, string State). Above it create Stopwatch stopwatch = Stopwatch.StartNew(), List<TaskSpan> spans = new(), a local function int Now() returning the elapsed milliseconds as an int, and void AddSpan(string name, int start, string state) which, inside lock (spans), adds new TaskSpan(name, start, Now(), state)",
        "Write async Task<string> MoveScenery(string name, int milliseconds): note the start with Now(), await Task.Delay(milliseconds), AddSpan(name, start, \"done\"), return $\"{name} in position\". Write async Task<string> Jam(string name): note the start, await Task.Delay(10), AddSpan(name, start, \"failed\"), then throw new InvalidOperationException($\"{name} jammed\")",
        "One after another: print the awaited results of MoveScenery(\"flats\", 20) and MoveScenery(\"trap door\", 20), each with Console.WriteLine, then print one after another took the sum: followed by True or False for sequentialMs >= 40. Side by side: start MoveScenery for turntable (30), backdrop (60) and chandelier (90) without awaiting, await Task.WhenAny and print first home: with the winner's text, then await Task.WhenAll into string[] positions and print all in position: with the three texts joined by a comma and a space, then print side by side beat the sum: followed by True or False for parallelMs < 150",
        "Failure: Task<string[]> crewCall = Task.WhenAll(MoveScenery(\"revolve\", 20), Jam(\"trap door\"), Jam(\"fly bar\")). Await it inside a try that catches InvalidOperationException into string rethrown (start it as \"nothing\"). Read int failedCount from crewCall.Exception?.InnerExceptions.Count ?? 0. Print await rethrew: followed by rethrown, and tasks that failed: followed by failedCount",
        "Send the data to the board: Desk.Show(\"spans\", spans) and Desk.Show(\"timeline\", new { winner, rethrown, failedCount }) where winner is the text returned by the first task home",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 11: make the scene changes async. Add your code below, in this order.
// 1. Under the divider: record TaskSpan(string Name, int Start, int End, string State);
//    Above it: Stopwatch stopwatch = Stopwatch.StartNew();   List<TaskSpan> spans = new();
//    int Now() { ... }                                        // elapsed milliseconds as an int
//    void AddSpan(string name, int start, string state) { lock (spans) { spans.Add(new TaskSpan(name, start, Now(), state)); } }
// 2. async Task<string> MoveScenery(string name, int milliseconds) { ... }   // result: "{name} in position"
//    async Task<string> Jam(string name) { ... }                             // waits 10 ms, records "failed", then throws
// 3. One after another: flats (20 ms) then trap door (20 ms), printing each result.
//    Then side by side: turntable (30), backdrop (60), chandelier (90). Start all three, THEN await.
//    Print: first home: ...   all in position: ...   plus the two True/False lines from the tasks.
// 4. Task<string[]> crewCall = Task.WhenAll(MoveScenery("revolve", 20), Jam("trap door"), Jam("fly bar"));
//    Await it in a try/catch, then print: await rethrew: ...   tasks that failed: ...
// 5. Desk.Show("spans", spans);   Desk.Show("timeline", new { winner, rethrown, failedCount });

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare the span record here.
//   record TaskSpan(string Name, int Start, int End, string State);
`,
      solutionAdd: cs`// Lesson 11: async and await.
Stopwatch stopwatch = Stopwatch.StartNew();
List<TaskSpan> spans = new();

int Now()
{
    return (int)stopwatch.ElapsedMilliseconds;
}

void AddSpan(string name, int start, string state)
{
    lock (spans)
    {
        spans.Add(new TaskSpan(name, start, Now(), state));
    }
}

async Task<string> MoveScenery(string name, int milliseconds)
{
    int start = Now();
    await Task.Delay(milliseconds);
    AddSpan(name, start, "done");
    return $"{name} in position";
}

async Task<string> Jam(string name)
{
    int start = Now();
    await Task.Delay(10);
    AddSpan(name, start, "failed");
    throw new InvalidOperationException($"{name} jammed");
}

int sequentialStart = Now();
Console.WriteLine(await MoveScenery("flats", 20));
Console.WriteLine(await MoveScenery("trap door", 20));
int sequentialMs = Now() - sequentialStart;
Console.WriteLine($"one after another took the sum: {sequentialMs >= 40}");

int parallelStart = Now();
Task<string> turntable = MoveScenery("turntable", 30);
Task<string> backdrop = MoveScenery("backdrop", 60);
Task<string> chandelier = MoveScenery("chandelier", 90);
Task<string> firstHome = await Task.WhenAny(turntable, backdrop, chandelier);
string winner = await firstHome;
Console.WriteLine($"first home: {winner}");
string[] positions = await Task.WhenAll(turntable, backdrop, chandelier);
int parallelMs = Now() - parallelStart;
Console.WriteLine($"all in position: {string.Join(", ", positions)}");
Console.WriteLine($"side by side beat the sum: {parallelMs < 150}");

Task<string[]> crewCall = Task.WhenAll(MoveScenery("revolve", 20), Jam("trap door"), Jam("fly bar"));
string rethrown = "nothing";
try
{
    await crewCall;
}
catch (InvalidOperationException ex)
{
    rethrown = ex.Message;
}
int failedCount = crewCall.Exception?.InnerExceptions.Count ?? 0;
Console.WriteLine($"await rethrew: {rethrown}");
Console.WriteLine($"tasks that failed: {failedCount}");

Desk.Show("spans", spans);
Desk.Show("timeline", new { winner, rethrown, failedCount });

${TYPES_DIVIDER}

record TaskSpan(string Name, int Start, int End, string State);`,
      explanation:
        "MoveScenery awaits a timer, so while it waits no thread is held; the compiler turns the rest of the method into a continuation. Awaiting the two sequential moves one after the other makes the second start only when the first has finished, which is why its span begins after the first one ends. Starting turntable, backdrop and chandelier before awaiting anything lets all three timers run together: WhenAny returns the task that finishes first (the 30 ms turntable), WhenAll collects the results in argument order, and the elapsed time is about the slowest task rather than the sum. A faulted task stores its exception; awaiting WhenAll rethrows the first one in argument order (trap door jammed), while crewCall.Exception keeps both failures, so failedCount is 2. The spans list is touched from several continuation threads, so every Add happens inside lock (spans).",
      hints: [
        { id: "h1", title: "Start first, await later", content: "Calling an async method starts it and gives you a Task. Only await collects the answer. To make the three moves run together, declare three Task<string> variables first, and only then await WhenAny and WhenAll." },
        { id: "h2", title: "Shape of the two helpers", content: "async Task<string> MoveScenery(string name, int milliseconds) { int start = Now(); await Task.Delay(milliseconds); AddSpan(name, start, \"done\"); return $\"{name} in position\"; } Jam looks the same but waits 10 ms, records \"failed\" and ends with throw new InvalidOperationException($\"{name} jammed\");" },
        { id: "h3", title: "The failure block", content: "Task<string[]> crewCall = Task.WhenAll(MoveScenery(\"revolve\", 20), Jam(\"trap door\"), Jam(\"fly bar\")); string rethrown = \"nothing\"; try { await crewCall; } catch (InvalidOperationException ex) { rethrown = ex.Message; } int failedCount = crewCall.Exception?.InnerExceptions.Count ?? 0; Remember the winner: string winner = await firstHome; where firstHome = await Task.WhenAny(...)." },
      ],
      tests: [
        {
          id: "t1",
          description: "the two sequential moves are printed in order",
          assertionCode: js`
const flats = lines.indexOf("flats in position");
const door = lines.indexOf("trap door in position");
assert(flats >= 0, 'No line is exactly "flats in position". Print the awaited result of MoveScenery("flats", 20) with Console.WriteLine.');
assert(door >= 0, 'No line is exactly "trap door in position". Print the awaited result of MoveScenery("trap door", 20).');
assert(flats < door, "The flats should be reported before the trap door: await each move before starting the next.");
assert(lines.some((l) => l.startsWith("one after another took the sum: ")), 'Print "one after another took the sum: " followed by True or False.');`,
        },
        {
          id: "t2",
          description: "the sequential spans do not overlap, the side-by-side spans do",
          assertionCode: js`
const spans = scene.spans;
assert(Array.isArray(spans) && spans.length > 0, 'Send the spans with Desk.Show("spans", spans); the TaskSpan record needs public Name, Start, End and State.');
const flats = spans.find((s) => s.name === "flats");
const door = spans.find((s) => s.name === "trap door" && s.state === "done");
assert(flats && door, 'The spans need a "flats" and a "trap door" entry with state "done". Call AddSpan inside MoveScenery.');
assert(door.start >= flats.end - 1, "The trap door started before the flats had finished. When you await a move before starting the next, the second span begins after the first ends.");
const group = ["turntable", "backdrop", "chandelier"].map((n) => spans.find((s) => s.name === n));
assert(group.every(Boolean), "Spans for turntable, backdrop and chandelier are missing.");
const latestStart = Math.max(...group.map((s) => s.start));
const earliestEnd = Math.min(...group.map((s) => s.end));
assert(latestStart < earliestEnd, "The three moves did not overlap. Start all three tasks first, then await them; do not await each one as you create it.");`,
        },
        {
          id: "t3",
          description: "WhenAny names the first home, WhenAll keeps argument order",
          assertionCode: js`
assert(lines.includes("first home: turntable in position"), 'Print exactly "first home: turntable in position". Await the task that Task.WhenAny returns to get its text; the 30 ms turntable is the quickest.');
assert(lines.includes("all in position: turntable in position, backdrop in position, chandelier in position"), 'Print exactly "all in position: turntable in position, backdrop in position, chandelier in position". WhenAll returns its results in the order of its arguments.');
assert(lines.some((l) => l.startsWith("side by side beat the sum: ")), 'Print "side by side beat the sum: " followed by True or False.');`,
        },
        {
          id: "t4",
          description: "await rethrows the first failure, the task keeps both",
          assertionCode: js`
assert(lines.includes("await rethrew: trap door jammed"), 'Print exactly "await rethrew: trap door jammed". Await the WhenAll task inside try/catch (InvalidOperationException) and keep ex.Message.');
assert(lines.includes("tasks that failed: 2"), 'Print exactly "tasks that failed: 2". The WhenAll task keeps every failure in crewCall.Exception?.InnerExceptions.');`,
        },
        {
          id: "t5",
          description: "every move is on the span list with the right state",
          assertionCode: js`
const spans = scene.spans;
assert(Array.isArray(spans), 'Send the spans with Desk.Show("spans", spans);');
assertEqual(spans.length, 8, "number of spans (flats, trap door, turntable, backdrop, chandelier and revolve are done; trap door and fly bar jam)");
assertEqual(spans.filter((s) => s.state === "done").length, 6, 'spans with state "done"');
assertEqual(spans.filter((s) => s.state === "failed").map((s) => s.name).sort(), ["fly bar", "trap door"], 'the spans with state "failed"');
assert(spans.every((s) => s.end >= s.start), "Every span should end at or after its start.");`,
        },
        {
          id: "t6",
          description: "the timeline summary reaches the board",
          assertionCode: js`
const t = scene.timeline;
assert(t && typeof t === "object", 'Send the summary with Desk.Show("timeline", new { winner, rethrown, failedCount });');
assertEqual(t.winner, "turntable in position", "timeline.winner");
assertEqual(t.rethrown, "trap door jammed", "timeline.rethrown");
assertEqual(t.failedCount, 2, "timeline.failedCount");`,
        },
      ],
      unlocks: ["fl-timeline"],
      checks: [
        {
          prompt: "Three async moves take 30, 60 and 90 ms. You start all three and then `await Task.WhenAll(...)`. Roughly how long does the await take, counted from the moment you started them?",
          question: {
            type: "choice",
            options: ["About 90 ms, the slowest one", "About 180 ms, the sum", "About 30 ms, the first to finish", "About 60 ms, the average"],
            answer: 0,
          },
          explanation: "Each timer runs on its own, so the waiting overlaps. `WhenAll` finishes when the last input does, so the cost is the slowest task, not the total. Awaiting them one by one would have cost the sum.",
        },
        {
          prompt: "Two tasks inside a `Task.WhenAll` both throw. What does `await` on the combined task give you?",
          question: {
            type: "choice",
            options: [
              "It rethrows the first inner exception as itself; the combined task's `Exception` property still holds both",
              "It throws an `AggregateException` that always contains both",
              "It throws nothing; you have to read `.Exception` yourself",
              "It throws the exception of whichever task failed last",
            ],
            answer: 0,
          },
          explanation: "`await` unwraps the stored exception so ordinary `catch` blocks keep working, and it picks the first. The full set is on the task. `.Result` and `.Wait()` are the ones that hand you the `AggregateException` wrapper.",
        },
        {
          prompt: "An async method reaches an `await` on a task that has not finished. What happens next?",
          question: {
            type: "choice",
            options: [
              "The method returns its own `Task` to the caller, and the rest of its body runs later as a continuation",
              "The thread blocks until the awaited task finishes",
              "A new thread is started to run the rest of the method",
              "The caller is paused until the method completes",
            ],
            answer: 0,
          },
          explanation: "That is the whole trick: the method hands control back instead of blocking. The compiler keeps its position and locals in a state machine, and the continuation is scheduled when the awaited task completes.",
        },
      ],
    },
    // ───────────────────────── 12 ─────────────────────────
    {
      id: "csharp-delegates-12-cancel",
      title: "Cancellation and timeouts",
      minutes: 35,
      xp: 200,
      concepts: ["CancellationToken", "CancellationTokenSource", "cooperative cancellation", "OperationCanceledException", "CancelAfter", "linked tokens", "timeouts", "exception filters"],
      learn: md`### Stopping work is a design problem

Somebody presses **Hold**. A deadline passes. The audience leaves and the desk shuts down. In each case work that has already started has to stop, and it has to stop **cleanly**: a fly bar abandoned halfway between its marks, with the winch still engaged, is worse than one that carries on.

That is why .NET has no "kill this task" button. Forcing a method to stop at an arbitrary instruction would leave locks held and files half-written. Cancellation is **cooperative**: you give the work a token it can look at, and the work stops *itself* at a point where it knows how to tidy up.

### The source and the token

~~~csharp
using CancellationTokenSource hold = new();   // the owner: the only thing that can cancel
CancellationToken token = hold.Token;         // a read-only view for the workers
~~~

The split is deliberate. A worker that holds a token can *look* at it but cannot cancel it, so one crew member cannot cancel everybody else's job by accident. Calling \`hold.Cancel()\` flips the flag once and for all. There is no reset; if you need another round, you create another source.

### Three ways to notice

1. **Ask.** \`token.IsCancellationRequested\` is a plain bool. Use it when you would rather clean up and return normally.
2. **Throw.** \`token.ThrowIfCancellationRequested()\` throws \`OperationCanceledException\` if the flag is set. The message is \`The operation was canceled.\`
3. **Pass it on.** Most waiting APIs take a token: \`await Task.Delay(10, token)\` wakes up as soon as the token is cancelled and throws \`TaskCanceledException\` (message \`A task was canceled.\`). That type derives from \`OperationCanceledException\`, so catching the base class catches both.

The loop that flies the backdrop does the third thing. Twenty steps of ten milliseconds each; when the hold arrives the current \`Task.Delay\` ends immediately instead of finishing its ten milliseconds, and the loop never starts the next step. If you forget to pass the token to the delay, the work still stops, but only at the next check, and a loop with no check never stops at all.

### What the caller sees

When an async method lets an \`OperationCanceledException\` escape, its task ends in the \`Canceled\` state, not \`Faulted\`. Awaiting it throws the exception. So **cancellation is an outcome, not an error**. Catch it on its own, do not log it as a failure, and when you catch it in the worker only to tidy up, rethrow it:

~~~csharp
catch (OperationCanceledException)
{
    AddSpan("fly backdrop", start, "cancelled");   // tidy up, record what happened
    throw;                                          // and let the caller see the cancellation
}
~~~

If you swallow it, the method returns normally, the task finishes as \`RanToCompletion\`, and the caller believes the flight succeeded. A catch-all \`catch (Exception)\` has the same effect, which is why general catch blocks in async code deserve an exception filter: \`catch (Exception ex) when (ex is not OperationCanceledException)\`.

### A timeout is cancellation with a clock

\`hold.CancelAfter(40)\` (or \`new CancellationTokenSource(40)\`) cancels by itself after 40 milliseconds. That alone has a flaw: when the exception arrives you cannot tell "the operator pressed Hold" from "the deadline passed", and the right reaction to each is different. The cure is a **linked source**, which cancels when *either* of its parents does:

~~~csharp
async Task<T> WithTimeout<T>(Func<CancellationToken, Task<T>> work, int milliseconds, CancellationToken outer = default)
{
    using CancellationTokenSource linked = CancellationTokenSource.CreateLinkedTokenSource(outer);
    linked.CancelAfter(milliseconds);
    try
    {
        return await work(linked.Token);
    }
    catch (OperationCanceledException) when (!outer.IsCancellationRequested)
    {
        throw new TimeoutException($"gave up after {milliseconds} ms");
    }
}
~~~

Read the exception filter carefully. If the outer token was **not** cancelled, the only other party that could have cancelled the linked source is our own timer, so we translate the cancellation into a \`TimeoutException\` with a useful message. If the outer token *was* cancelled, the filter is false and the original exception travels on untouched. The parameter is a delegate that takes a token, which is why you can pass a method straight in: \`WithTimeout(FlyBackdrop, 40)\`. (If two things happen in the very same instant, either answer is acceptable; the check is made after the fact.)

### Ask or throw?

Throwing is the right default for work that has no meaningful half-finished result: the exception unwinds every frame between the check and the caller, and \`finally\` blocks release whatever was held. Asking with \`IsCancellationRequested\` suits work that can hand back something useful, such as "the fourteen steps I managed before the hold". If you want to react the instant the flag flips rather than at the next check, \`token.Register(callback)\` runs a delegate when cancellation happens; it returns a registration you should dispose when you no longer care.

### Tidy up the sources

A \`CancellationTokenSource\` may own a timer and a list of registered callbacks, so dispose it, normally with \`using\`. Once disposed, it must not be touched again:

~~~text
ObjectDisposedException: The CancellationTokenSource has been disposed.
~~~

### Common mistakes

- **Not passing the token down.** \`await Task.Delay(10)\` inside a cancellable loop ignores the hold for ten milliseconds each time. Pass the token to every call that accepts one.
- **Swallowing the cancellation.** A \`catch (Exception)\` or a \`catch (OperationCanceledException)\` without \`throw;\` makes a cancelled job look successful.
- **Expecting Cancel to be instant.** It only flips a flag. Work stops at its next check, and code that never checks keeps going.
- **Reusing a cancelled source.** It stays cancelled forever; create a new one for the next job.
- **Creating the source inside the worker.** Then nobody else can cancel it. The owner creates it and passes the token in.
- **Forgetting to dispose** the linked source, which leaves its timer and registrations alive.`,
      mission: md`The big moment of Act One is the backdrop flight: twenty small steps, a fifth of a second in all. Last week Wen's crew called a **hold** just as it began because an actor was standing in the wrong place, and the desk carried on regardless. The flight finished with a person underneath it.

Wen wants two promises from the software. A hold must stop the flight within a step. And any flight that takes longer than its deadline must give up on its own with a message that says so, but a hold that arrives first must never be mistaken for a timeout.

When this lesson passes, the **Hold and timeout** panel powers on and shows how far each flight got before it was stopped.`,
      tasks: [
        "Declare int stepsDone = 0 and a local function async Task<string> FlyBackdrop(CancellationToken token). It starts with int start = Now(), then runs twenty steps (step 1 to 20): await Task.Delay(10, token) and then stepsDone = step. After the loop it calls AddSpan(\"fly backdrop\", start, \"done\") and returns \"backdrop flown\". In a catch for OperationCanceledException it calls AddSpan(\"fly backdrop\", start, \"cancelled\") and rethrows with throw;",
        "Create using CancellationTokenSource hold = new(); start Task<string> flight = FlyBackdrop(hold.Token); await Task.Delay(55); call hold.Cancel(). Await flight in a try that catches OperationCanceledException, setting string holdOutcome (start it as \"finished\") to \"stopped by the hold\" there. Save int stepsBeforeHold = stepsDone. Print flight stopped by the hold, status Canceled using holdOutcome and flight.Status, and print stopped early: followed by True or False for stepsBeforeHold < 20",
        "Write the local generic function async Task<T> WithTimeout<T>(Func<CancellationToken, Task<T>> work, int milliseconds, CancellationToken outer = default) exactly like this: create a linked source from outer with using, call CancelAfter(milliseconds), await work(linked.Token), and in catch (OperationCanceledException) when (!outer.IsCancellationRequested) throw new TimeoutException($\"gave up after {milliseconds} ms\"). Call it with FlyBackdrop and 40, catch TimeoutException into string timeoutMessage (start it as \"none\") and print timeout: followed by timeoutMessage",
        "Create using CancellationTokenSource stageHold = new(); start Task<string> guarded = WithTimeout(FlyBackdrop, 500, stageHold.Token); call stageHold.CancelAfter(30). Await guarded in a try: catch TimeoutException into guardedOutcome (start it as \"finished\") as \"timeout\", and catch OperationCanceledException as \"the stage hold arrived first\". Print guarded flight: followed by guardedOutcome",
        "Send the results to the board: Desk.Show(\"hold\", new { state = flight.Status.ToString(), stepsDone = stepsBeforeHold, stepsTotal = 20, timeoutMessage, guardedOutcome }) and then Desk.Show(\"spans\", spans) again",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 12: stop the backdrop flight on a hold, and give it a deadline. Add your code below.
// 1. int stepsDone = 0;
//    async Task<string> FlyBackdrop(CancellationToken token) { ... }
//      twenty steps: await Task.Delay(10, token); stepsDone = step;
//      done  -> AddSpan("fly backdrop", start, "done");      return "backdrop flown";
//      catch (OperationCanceledException) -> AddSpan("fly backdrop", start, "cancelled"); throw;
// 2. using CancellationTokenSource hold = new();  start the flight, await Task.Delay(55), hold.Cancel(),
//    await the flight in try/catch. Print:  flight stopped by the hold, status Canceled   and   stopped early: True
// 3. async Task<T> WithTimeout<T>(Func<CancellationToken, Task<T>> work, int milliseconds, CancellationToken outer = default)
//      linked source from outer + CancelAfter, and translate the cancellation into a TimeoutException
//      ONLY when (!outer.IsCancellationRequested).   Print:  timeout: gave up after 40 ms
// 4. stageHold + WithTimeout(FlyBackdrop, 500, stageHold.Token) + stageHold.CancelAfter(30).
//    Print:  guarded flight: the stage hold arrived first
// 5. Desk.Show("hold", ...)   Desk.Show("spans", spans)
`,
      solutionAdd: cs`// Lesson 12: cancellation and timeouts.
int stepsDone = 0;

async Task<string> FlyBackdrop(CancellationToken token)
{
    int start = Now();
    try
    {
        for (int step = 1; step <= 20; step++)
        {
            await Task.Delay(10, token);
            stepsDone = step;
        }
        AddSpan("fly backdrop", start, "done");
        return "backdrop flown";
    }
    catch (OperationCanceledException)
    {
        AddSpan("fly backdrop", start, "cancelled");
        throw;
    }
}

using CancellationTokenSource hold = new();
Task<string> flight = FlyBackdrop(hold.Token);
await Task.Delay(55);
hold.Cancel();
string holdOutcome = "finished";
try
{
    await flight;
}
catch (OperationCanceledException)
{
    holdOutcome = "stopped by the hold";
}
int stepsBeforeHold = stepsDone;
Console.WriteLine($"flight {holdOutcome}, status {flight.Status}");
Console.WriteLine($"stopped early: {stepsBeforeHold < 20}");

async Task<T> WithTimeout<T>(Func<CancellationToken, Task<T>> work, int milliseconds, CancellationToken outer = default)
{
    using CancellationTokenSource linked = CancellationTokenSource.CreateLinkedTokenSource(outer);
    linked.CancelAfter(milliseconds);
    try
    {
        return await work(linked.Token);
    }
    catch (OperationCanceledException) when (!outer.IsCancellationRequested)
    {
        throw new TimeoutException($"gave up after {milliseconds} ms");
    }
}

string timeoutMessage = "none";
try
{
    await WithTimeout(FlyBackdrop, 40);
}
catch (TimeoutException ex)
{
    timeoutMessage = ex.Message;
}
Console.WriteLine($"timeout: {timeoutMessage}");

using CancellationTokenSource stageHold = new();
Task<string> guarded = WithTimeout(FlyBackdrop, 500, stageHold.Token);
stageHold.CancelAfter(30);
string guardedOutcome = "finished";
try
{
    await guarded;
}
catch (TimeoutException)
{
    guardedOutcome = "timeout";
}
catch (OperationCanceledException)
{
    guardedOutcome = "the stage hold arrived first";
}
Console.WriteLine($"guarded flight: {guardedOutcome}");

Desk.Show("hold", new
{
    state = flight.Status.ToString(),
    stepsDone = stepsBeforeHold,
    stepsTotal = 20,
    timeoutMessage,
    guardedOutcome,
});
Desk.Show("spans", spans);`,
      explanation:
        "FlyBackdrop passes its token to Task.Delay, so cancelling the source wakes the delay at once and throws TaskCanceledException, a kind of OperationCanceledException. The worker records a cancelled span and rethrows, which leaves the task in the Canceled state and lets the caller see it. WithTimeout creates a linked source that is cancelled by the outer token or by its own CancelAfter timer; the exception filter when (!outer.IsCancellationRequested) turns a cancellation into a TimeoutException only when the caller did not ask for it, so the 40 ms deadline becomes 'gave up after 40 ms' while the stage hold, which cancels the outer token after 30 ms, passes through untouched. Because the three flights all stop part-way, three 'fly backdrop' spans end up with the state cancelled.",
      hints: [
        { id: "h1", title: "Pass the token down", content: "Cancellation only works if the code that waits can see the token. Give Task.Delay the token as its second argument: await Task.Delay(10, token). When the token is cancelled the delay throws, and your catch (OperationCanceledException) records the span and rethrows with throw;" },
        { id: "h2", title: "Shape of WithTimeout", content: "using CancellationTokenSource linked = CancellationTokenSource.CreateLinkedTokenSource(outer); linked.CancelAfter(milliseconds); try { return await work(linked.Token); } catch (OperationCanceledException) when (!outer.IsCancellationRequested) { throw new TimeoutException($\"gave up after {milliseconds} ms\"); }" },
        { id: "h3", title: "Telling the two stops apart", content: "For the guarded flight put two catch blocks after the try: catch (TimeoutException) { guardedOutcome = \"timeout\"; } and catch (OperationCanceledException) { guardedOutcome = \"the stage hold arrived first\"; }. Start the flight with WithTimeout(FlyBackdrop, 500, stageHold.Token), then call stageHold.CancelAfter(30) before you await it." },
      ],
      tests: [
        {
          id: "t1",
          description: "the hold stops the flight part-way",
          assertionCode: js`
assert(lines.includes("flight stopped by the hold, status Canceled"), 'Print exactly "flight stopped by the hold, status Canceled" (holdOutcome, then the flight\'s Status). A cancelled task ends in the Canceled state, not Faulted.');
assert(lines.includes("stopped early: True"), 'Print "stopped early: True": stepsBeforeHold should be below 20 because the hold arrives after about 55 ms of a 200 ms flight.');`,
        },
        {
          id: "t2",
          description: "WithTimeout turns its own deadline into a TimeoutException",
          assertionCode: js`assert(lines.includes("timeout: gave up after 40 ms"), 'Print exactly "timeout: gave up after 40 ms". Call WithTimeout(FlyBackdrop, 40) inside try/catch (TimeoutException) and print ex.Message.');`,
        },
        {
          id: "t3",
          description: "a hold that arrives first is not reported as a timeout",
          assertionCode: js`assert(lines.includes("guarded flight: the stage hold arrived first"), 'Print exactly "guarded flight: the stage hold arrived first". With the exception filter when (!outer.IsCancellationRequested), a cancelled outer token passes through as OperationCanceledException instead of becoming a TimeoutException.');`,
        },
        {
          id: "t4",
          description: "the hold summary reaches the board",
          assertionCode: js`
const h = scene.hold;
assert(h && typeof h === "object", 'Send the summary with Desk.Show("hold", new { state = flight.Status.ToString(), stepsDone = stepsBeforeHold, stepsTotal = 20, timeoutMessage, guardedOutcome });');
assertEqual(h.state, "Canceled", "hold.state");
assert(h.stepsDone >= 1 && h.stepsDone < 20, "hold.stepsDone should be between 1 and 19: the flight started, but the hold stopped it before step 20. It was " + h.stepsDone);
assertEqual(h.stepsTotal, 20, "hold.stepsTotal");
assertEqual(h.timeoutMessage, "gave up after 40 ms", "hold.timeoutMessage");
assertEqual(h.guardedOutcome, "the stage hold arrived first", "hold.guardedOutcome");`,
        },
        {
          id: "t5",
          description: "all three flights are recorded as cancelled spans",
          assertionCode: js`
const spans = scene.spans;
assert(Array.isArray(spans), 'Send the spans again at the end with Desk.Show("spans", spans);');
const flights = spans.filter((s) => s.name === "fly backdrop");
assertEqual(flights.length, 3, 'spans named "fly backdrop" (the hold, the 40 ms deadline and the guarded flight)');
assert(flights.every((s) => s.state === "cancelled"), 'Every flight is stopped part-way, so each "fly backdrop" span should have the state "cancelled". Record it in the catch block before rethrowing.');
assert(spans.some((s) => s.name === "flats"), "The spans from the earlier lesson should still be there.");`,
        },
      ],
      unlocks: ["fl-hold"],
      checks: [
        {
          prompt: "You call `hold.Cancel()` while `FlyBackdrop` is running. What stops the flight?",
          question: {
            type: "choice",
            options: [
              "Nothing by itself: the flag is set, and the flight stops only because it passes the token to `Task.Delay` (or checks it)",
              "The runtime aborts the thread that is running the method",
              "The task is removed from the thread pool",
              "`Cancel()` waits until the method returns, then reports success",
            ],
            answer: 0,
          },
          explanation: "Cancellation is a request. The token only sets a flag and wakes up anything registered on it. A method that never looks at the token, or never hands it to an API that does, runs to the end.",
        },
        {
          prompt: "In `WithTimeout`, what does the filter `when (!outer.IsCancellationRequested)` decide?",
          question: {
            type: "choice",
            options: [
              "Whether the cancellation came from our own timer (so we throw `TimeoutException`) or from the caller (so we let it through)",
              "Whether the work function has finished",
              "Whether the linked source has been disposed",
              "Whether the exception should be logged",
            ],
            answer: 0,
          },
          explanation: "The linked token fires for two reasons. If the caller's token is not cancelled, the only possible culprit is the deadline. If it is cancelled, the caller wanted the stop, and rewriting it as a timeout would be a lie.",
        },
        {
          prompt: "Which exception type does `await Task.Delay(100, token)` throw when `token` is cancelled?",
          question: {
            type: "text",
            answer: ["TaskCanceledException", "System.Threading.Tasks.TaskCanceledException"],
            placeholder: "exception type",
          },
          explanation: "`Task.Delay` throws `TaskCanceledException`, which derives from `OperationCanceledException`. That is why a `catch (OperationCanceledException)` handles both the delay and a manual `ThrowIfCancellationRequested()`.",
        },
      ],
    },
    // ───────────────────────── 13 ─────────────────────────
    {
      id: "csharp-delegates-13-channels",
      title: "Channels and backpressure",
      minutes: 40,
      xp: 220,
      concepts: ["Channel<T>", "producer / consumer", "bounded channel", "backpressure", "ChannelWriter", "ReadAllAsync", "await foreach", "Complete"],
      learn: md`### Two parties that work at different speeds

During a show the stage manager calls cues over the headset ("warn fly", "go fly") much faster than the crew can carry them out. Something has to sit between the caller and the crew. Hand the call straight to the crew and the stage manager must wait for each action to finish. Put an unlimited pile of calls between them and the pile can grow without end if the crew cannot keep up. The shape that solves it is the **producer/consumer queue**, and in modern .NET its async version is \`System.Threading.Channels\`.

### A channel has two ends

~~~csharp
Channel<string> calls = Channel.CreateBounded<string>(2);
ChannelWriter<string> writer = calls.Writer;   // the end producers hold
ChannelReader<string> reader = calls.Reader;   // the end consumers hold
~~~

Splitting the two ends is a small safety feature: you can hand the stage manager only the writer and the crew only the reader, and neither can do the other's job.

The writer offers three things you will use:

- \`TryWrite(item)\` returns at once: \`true\` if the item went in, \`false\` if the channel is full or closed.
- \`await WriteAsync(item)\` waits for room, without blocking a thread.
- \`Complete()\` says "nothing more is coming".

The reader mirrors them: \`TryRead\`, \`await ReadAsync()\`, \`WaitToReadAsync()\`, and the favourite, \`ReadAllAsync()\`, which gives an \`IAsyncEnumerable<T>\` you walk with \`await foreach\`. That loop ends by itself once the writer has completed **and** every remaining item has been read.

~~~csharp
await foreach (string call in calls.Reader.ReadAllAsync())
{
    await Task.Delay(8);      // the crew carries out the call
}
~~~

### Bounded or unbounded: where backpressure comes from

\`Channel.CreateUnbounded<T>()\` never makes a producer wait. If the consumer is slower, the queue grows, and with it the memory use and the age of the oldest item. Nothing tells the producer to slow down, so the problem shows up as a crash or a long delay far from its cause.

\`Channel.CreateBounded<T>(capacity)\` holds at most \`capacity\` items. When it is full, the default full mode is \`Wait\`: \`WriteAsync\` simply **does not complete** until the consumer has taken something. The producer is now slowed to the consumer's pace. That is **backpressure**: the pressure of a slow stage travels backwards, to the cause, instead of piling up in the middle. The producer's own loop does not need any special code; it just awaits.

In the desk's script the producer tries \`TryWrite\` first. When that returns \`false\` it counts a wait and falls back to \`await WriteAsync\`. The count is a direct measure of how often the stage manager had to hold back.

Other full modes trade the waiting for loss. With a capacity of 2 and five writes, these are the items that survive:

~~~text
DropOldest: kept 4,5
DropNewest: kept 1,5
DropWrite:  kept 1,2
~~~

\`TryWrite\` reports \`true\` for every one of those writes, because the channel accepted the call and silently threw something away. Use a dropping mode only when losing data is acceptable, for example a stream of meter readings where only the latest matters, and never for cues.

### Finishing properly

The consumer's \`await foreach\` only ends after \`Complete()\`. If the producer forgets it, the crew waits for the next call forever. After a channel is completed:

~~~text
TryWrite returns False
WriteAsync throws ChannelClosedException: The channel has been closed.
ReadAsync on an empty, completed channel throws ChannelClosedException: The channel has been closed.
~~~

\`Complete(exception)\` closes the channel with a reason, and the reader's exception then carries it as its inner exception, so a failure on the producing side is not lost.

### Running both ends

Producer and consumer must run **at the same time**. A bounded channel makes this a hard requirement:

~~~csharp
Task producer = Task.Run(async () => { /* write, then Complete() */ });
Task consumer = Task.Run(async () => { /* await foreach read */ });
await Task.WhenAll(producer, consumer);
~~~

Awaiting the producer *before* the consumer has been started would deadlock: the producer fills the two slots, waits for room, and nobody is there to make any. \`Task.Run\` hands each loop to the thread pool so both are alive before you await either. You can also run several consumers on one channel; each item goes to exactly one of them, which is a simple way to share a heavy job. Options such as \`SingleReader = true\` tell the channel that only one reader exists, letting it skip some locking.

### Choosing a capacity

There is no magic number. A tiny capacity (like the 2 at the desk) makes the hand-off almost synchronous and keeps latency low, at the price of the producer waiting often. A larger one smooths over bursts, at the price of memory and of more work sitting in the queue when something goes wrong. Pick it from the question "how much stale work am I willing to have queued when the consumer stalls?", then measure. The waiting counter and the deepest-queue figure you record in this lesson are exactly the numbers you would watch.

### Common mistakes

- **Forgetting \`Complete()\`.** The consumer's loop never ends and the program stops making progress.
- **Using an unbounded channel "to be safe".** It is safe only until the consumer falls behind.
- **Awaiting the producer before starting the consumer** on a bounded channel.
- **Writing to a completed channel.** It throws \`ChannelClosedException\`; stop producing first, or check the result of \`TryWrite\`.
- **Using plain \`foreach\` on \`ReadAllAsync()\`**, which the compiler rejects:

~~~text
Program.cs(3,19): error CS8414: foreach statement cannot operate on variables of type 'IAsyncEnumerable<string>' because 'IAsyncEnumerable<string>' does not contain a public instance or extension definition for 'GetEnumerator'. Did you mean 'await foreach' rather than 'foreach'?
~~~

- **Assuming the order between several consumers.** One consumer sees items in the order they were written; with several, the handling order is up to the scheduler.`,
      mission: md`During the interval Odile Marsh calls eight cues in a row on the headset: a warning and a go for the fly bar, the lights, the sound and the fog. The crew needs about eight milliseconds to carry out each one, and Odile does not wait for anybody. The old headset system dropped calls when the queue overflowed, and twice a "go" was lost.

You will build the headset as a bounded channel with room for two calls. Odile writes as fast as she likes, the crew reads at its own pace, and when the queue is full she is made to wait. Every call arrives, in order.

When this lesson passes, the **Backstage channel** panel powers on and shows the calls queueing, the capacity and how often the stage manager had to hold back.`,
      tasks: [
        "Create string[] callScript with exactly these eight calls in this order: \"warn fly\", \"go fly\", \"warn lights\", \"go lights\", \"warn sound\", \"go sound\", \"warn fog\", \"go fog\"",
        "Create Channel<string> calls = Channel.CreateBounded<string>(new BoundedChannelOptions(2) { FullMode = BoundedChannelFullMode.Wait, SingleReader = true }). Declare int producerWaits = 0, int deepest = 0 and List<string> crewHandled = new()",
        "Write the producer: Task stageManager = Task.Run(async () => { ... }). For each call in callScript, try calls.Writer.TryWrite(call); when it returns false, do producerWaits++ and await calls.Writer.WriteAsync(call). After each call set deepest = Math.Max(deepest, calls.Reader.Count). When the loop is over, call calls.Writer.Complete()",
        "Write the consumer: Task crew = Task.Run(async () => { ... }) with await foreach (string call in calls.Reader.ReadAllAsync()), an await Task.Delay(8) for each call, and then crewHandled.Add(call). Await both with await Task.WhenAll(stageManager, crew)",
        "Print crew handled 8 calls: followed by the handled calls joined with a comma and a space (use crewHandled.Count, not a literal 8), then the lines the stage manager had to wait: followed by True or False for producerWaits > 0, and deepest queue never passed the capacity: followed by True or False for deepest <= 2. Finally Desk.Show(\"channel\", new { capacity = 2, sent = callScript.Length, handled = crewHandled, waits = producerWaits, deepest })",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 13: the headset as a bounded channel. Add your code below, in this order.
// 1. string[] callScript = { "warn fly", "go fly", ... eight calls ... };
// 2. Channel<string> calls = Channel.CreateBounded<string>(new BoundedChannelOptions(2) { FullMode = BoundedChannelFullMode.Wait, SingleReader = true });
//    int producerWaits = 0;   int deepest = 0;   List<string> crewHandled = new();
// 3. Task stageManager = Task.Run(async () => { ... });
//      per call: if (!calls.Writer.TryWrite(call)) { producerWaits++; await calls.Writer.WriteAsync(call); }
//                deepest = Math.Max(deepest, calls.Reader.Count);
//      after the loop: calls.Writer.Complete();
// 4. Task crew = Task.Run(async () => { await foreach (string call in calls.Reader.ReadAllAsync()) { await Task.Delay(8); crewHandled.Add(call); } });
//    await Task.WhenAll(stageManager, crew);
// 5. Print:  crew handled 8 calls: warn fly, go fly, ...
//            the stage manager had to wait: True
//            deepest queue never passed the capacity: True
//    Desk.Show("channel", new { capacity = 2, sent = callScript.Length, handled = crewHandled, waits = producerWaits, deepest });
`,
      solutionAdd: cs`// Lesson 13: channels and backpressure.
string[] callScript =
{
    "warn fly", "go fly", "warn lights", "go lights",
    "warn sound", "go sound", "warn fog", "go fog",
};

Channel<string> calls = Channel.CreateBounded<string>(new BoundedChannelOptions(2)
{
    FullMode = BoundedChannelFullMode.Wait,
    SingleReader = true,
});

int producerWaits = 0;
int deepest = 0;
List<string> crewHandled = new();

Task stageManager = Task.Run(async () =>
{
    foreach (string call in callScript)
    {
        if (!calls.Writer.TryWrite(call))
        {
            producerWaits++;
            await calls.Writer.WriteAsync(call);
        }
        deepest = Math.Max(deepest, calls.Reader.Count);
    }
    calls.Writer.Complete();
});

Task crew = Task.Run(async () =>
{
    await foreach (string call in calls.Reader.ReadAllAsync())
    {
        await Task.Delay(8);
        crewHandled.Add(call);
    }
});

await Task.WhenAll(stageManager, crew);
Console.WriteLine($"crew handled {crewHandled.Count} calls: {string.Join(", ", crewHandled)}");
Console.WriteLine($"the stage manager had to wait: {producerWaits > 0}");
Console.WriteLine($"deepest queue never passed the capacity: {deepest <= 2}");

Desk.Show("channel", new
{
    capacity = 2,
    sent = callScript.Length,
    handled = crewHandled,
    waits = producerWaits,
    deepest,
});`,
      explanation:
        "The bounded channel holds two calls. The stage manager's loop writes with TryWrite and, when the channel is full, counts a wait and falls back to WriteAsync, which only completes once the crew has taken something: that is the backpressure, and it is why the queue depth, read from Reader.Count, never exceeds the capacity. The crew's await foreach over ReadAllAsync ends by itself after Complete() because the channel is then closed and drained. Both loops are started with Task.Run before anything is awaited, so they run side by side, and a single reader means the eight calls are handled in exactly the order they were written. With the crew needing 8 ms per call and the writer never pausing, the producer is certain to meet a full channel several times.",
      hints: [
        { id: "h1", title: "Both ends must be running", content: "Start the producer and the consumer with Task.Run before you await either of them, then await Task.WhenAll(stageManager, crew). A bounded channel with a producer that is awaited first and a consumer that has not started yet can never finish." },
        { id: "h2", title: "The producer loop", content: "foreach (string call in callScript) { if (!calls.Writer.TryWrite(call)) { producerWaits++; await calls.Writer.WriteAsync(call); } deepest = Math.Max(deepest, calls.Reader.Count); } calls.Writer.Complete();  Without Complete the crew's await foreach would never end." },
        { id: "h3", title: "The consumer and the report", content: "await foreach (string call in calls.Reader.ReadAllAsync()) { await Task.Delay(8); crewHandled.Add(call); } Then print $\"crew handled {crewHandled.Count} calls: {string.Join(\", \", crewHandled)}\" and the two True/False lines, and finish with the Desk.Show for channel." },
      ],
      tests: [
        {
          id: "t1",
          description: "the crew handles every call, in the order they were written",
          assertionCode: js`
const want = ["warn fly", "go fly", "warn lights", "go lights", "warn sound", "go sound", "warn fog", "go fog"];
assert(lines.includes("crew handled 8 calls: " + want.join(", ")), 'Print exactly "crew handled 8 calls: warn fly, go fly, warn lights, go lights, warn sound, go sound, warn fog, go fog". Each call must arrive once, in script order (a single reader keeps the order).');`,
        },
        {
          id: "t2",
          description: "the producer had to wait, and the queue never exceeded its capacity",
          assertionCode: js`
assert(lines.includes("the stage manager had to wait: True"), 'Print "the stage manager had to wait: True". The crew needs 8 ms per call and the producer never pauses, so TryWrite must fail at least once; count each failure in producerWaits and fall back to await WriteAsync.');
assert(lines.includes("deepest queue never passed the capacity: True"), 'Print "deepest queue never passed the capacity: True". Track deepest = Math.Max(deepest, calls.Reader.Count) after each write; a bounded channel of 2 can never hold more.');`,
        },
        {
          id: "t3",
          description: "the channel summary reaches the board",
          assertionCode: js`
const c = scene.channel;
assert(c && typeof c === "object", 'Send the summary with Desk.Show("channel", new { capacity = 2, sent = callScript.Length, handled = crewHandled, waits = producerWaits, deepest });');
assertEqual(c.capacity, 2, "channel.capacity");
assertEqual(c.sent, 8, "channel.sent");
assert(Array.isArray(c.handled), "channel.handled should be the list of calls the crew handled.");`,
        },
        {
          id: "t4",
          description: "handled calls match the script, and the counters make sense",
          assertionCode: js`
const c = scene.channel;
const want = ["warn fly", "go fly", "warn lights", "go lights", "warn sound", "go sound", "warn fog", "go fog"];
assertEqual(c.handled, want, "channel.handled (every call, once, in script order)");
assert(c.waits >= 1 && c.waits <= 8, "channel.waits should be between 1 and 8: the number of times TryWrite found the channel full. It was " + c.waits);
assert(c.deepest >= 1 && c.deepest <= 2, "channel.deepest should be 1 or 2 for a channel of capacity 2. It was " + c.deepest);`,
        },
      ],
      unlocks: ["fl-channel"],
      checks: [
        {
          prompt: "A producer calls `await channel.Writer.WriteAsync(item)` on a bounded channel (default full mode) that is already full. What happens?",
          question: {
            type: "choice",
            options: [
              "The call does not complete until a consumer takes an item, so the producer is slowed down",
              "The oldest item is silently discarded and the write completes at once",
              "It throws an exception because there is no room",
              "The channel grows to make room",
            ],
            answer: 0,
          },
          explanation: "In `Wait` mode the awaiting is the backpressure. The producer's loop pauses on that line without blocking a thread, and resumes when the consumer makes space.",
        },
        {
          prompt: "The producer finishes its loop but forgets `Writer.Complete()`. The consumer is `await foreach (var x in reader.ReadAllAsync())`. What happens once every item has been read?",
          question: {
            type: "choice",
            options: [
              "The loop keeps waiting for more items and never ends",
              "The loop ends because the queue is empty",
              "The loop throws `ChannelClosedException`",
              "The loop restarts from the first item",
            ],
            answer: 0,
          },
          explanation: "An empty channel is not the same as a finished one. Only `Complete()` tells readers that no more items will ever arrive, which is what ends `ReadAllAsync`.",
        },
        {
          prompt: "Which full modes can lose items, even though `TryWrite` still reports `true`? Pick all that apply.",
          question: {
            type: "choice",
            options: ["Wait", "DropOldest", "DropNewest", "DropWrite"],
            answer: [1, 2, 3],
          },
          explanation: "The three `Drop` modes keep the producer fast by discarding something when the channel is full (the oldest item, the newest one in the queue, or the item being written). `Wait` is the only mode that keeps every item, at the price of making the producer wait.",
        },
      ],
    },
  ],
};
