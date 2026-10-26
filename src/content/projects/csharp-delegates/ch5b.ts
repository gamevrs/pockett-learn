import type { Lesson } from "@/engine/types";
import { TYPES_DIVIDER } from "../../../engine/compose.ts";
import { cs, js, md } from "./util.ts";

/** Lessons 16 to 18, kept in their own file so two authors can work on chapter 5 at once. */
export const chapter5b: Lesson[] = [
    // ───────────────────────── 16 ─────────────────────────
    {
      id: "csharp-delegates-16-lifetimes",
      title: "Resource lifetimes",
      minutes: 35,
      xp: 200,
      concepts: ["IDisposable", "using", "using declaration", "reverse disposal", "IAsyncDisposable", "await using", "lease pattern", "idempotent Dispose"],
      learn: md`### Memory is not the only thing you borrow

The garbage collector is excellent at one job: reclaiming memory nobody can reach any more. It has no idea what an object was *holding*. A file handle, a lock, a database connection, a seat in a pool of spotlights: those are **resources**, and they have to be handed back at a moment you choose, not at some later moment the collector happens to pick. If you forget, nothing crashes. The spotlight simply stays out, and the next person to ask is told there is none free.

C# gives you one tiny contract for this:

~~~csharp
public interface IDisposable
{
    void Dispose();
}
~~~

A type that implements it is saying: "when you are finished with me, call \`Dispose\` and I will give back whatever I hold." The contract is three promises. \`Dispose\` releases what the object owns. Calling it twice is harmless (it is **idempotent**). And after it has run, the object is finished.

You have already been holding these without naming them. The \`IDisposable\` that \`Subscribe\` returned in lesson 6 was the "unsubscribe" handle: disposing it removed the observer. The \`using CancellationTokenSource\` in lesson 12 gave back the timer that \`CancelAfter\` had started. Same contract, different resources.

### What \`using\` really is

Writing \`Dispose()\` by hand is easy to forget on the unhappy path, so the language wraps it in a keyword. This:

~~~csharp
using (Lease spot = spots.Borrow())
{
    Console.WriteLine($"{spot.Lamp} is yours");
}
~~~

is rewritten by the compiler into roughly:

~~~csharp
Lease spot = spots.Borrow();
try
{
    Console.WriteLine($"{spot.Lamp} is yours");
}
finally
{
    spot?.Dispose();
}
~~~

The \`finally\` is the whole point. It runs when the block ends normally, when you \`return\` out of it, when you \`break\` out of a loop and when an exception flies past. There is no path that skips the cleanup.

Modern C# lets you drop the braces. A **using declaration** disposes at the end of the *enclosing* block:

~~~csharp
{
    using Lease spot = spots.Borrow();
    DoTheScene();
}   // spot is disposed here
~~~

Use the braces when you want the resource gone early; use the declaration when "until the end of this method" is exactly what you mean.

### Order: last in, first out

When several \`using\` declarations share a block, they are disposed in **reverse** order of declaration, like unstacking plates. That is not an accident of the compiler; it is the only safe order, because a later resource often depends on an earlier one. If the rack of dimmers was powered up first and a spotlight plugged into it second, you unplug the spotlight before you cut the power.

~~~csharp
{
    await using DimmerRack rack = new(log);   // declared first, disposed last
    using Lease spot = spots.Borrow();        // declared second, disposed first
    log.Add("show in progress");
}
~~~

The log reads: rack powered up, borrow, show in progress, return, rack powered down.

### A lease: a disposable that gives something back

The lesson's \`Lease\` shows the most useful shape. A pool keeps a queue of lamps. \`Borrow\` takes one and returns a \`Lease\` that remembers how to put it back:

~~~csharp
return new Lease(lamp, () =>
{
    available.Enqueue(lamp);
    log.Add($"return {lamp}");
});
~~~

The lease holds a delegate, the "release" action, captured by a closure that knows which lamp it belongs to. \`Dispose\` calls it exactly once, guarded by a flag:

~~~csharp
public void Dispose()
{
    if (released) return;
    released = true;
    release();
}
~~~

Without the flag, a lease disposed twice would enqueue the lamp twice and the pool would end up with a phantom lamp that two people can hold. This is the same trick as lesson 6's unsubscribe token, and it is the backbone of every connection pool, every lock wrapper and every "scope" object you will meet.

### Exceptions and Dispose

A thrown exception leaves the \`using\` block, the \`finally\` runs, the lamp goes back, and then the exception carries on to whoever catches it. You never need a \`catch\` just to release a resource.

One trap deserves respect: if \`Dispose\` itself throws while an exception is already travelling out of the body, the new exception **replaces** the old one. The original failure is lost, and you debug the cleanup instead of the cause. Real programs keep \`Dispose\` from throwing: release quietly, log anything unexpected, and never let cleanup fail loudly.

### When cleanup has to wait: IAsyncDisposable

Powering a rack down might mean flushing buffers or sending a message and waiting for the reply. Blocking a thread inside \`Dispose\` for that is exactly what async code is meant to avoid. So there is a twin contract:

~~~csharp
sealed class DimmerRack : IAsyncDisposable
{
    public async ValueTask DisposeAsync()
    {
        await Task.Delay(5);
        log.Add("rack powered down");
    }
}
~~~

You use it with \`await using\`, which calls \`DisposeAsync\` and awaits it, in the right place in the reverse order. \`ValueTask\` is a lighter cousin of \`Task\` that avoids allocating when the work finishes synchronously; for a disposal method it is simply what the interface asks for. A type can implement both interfaces if callers may be either sync or async.

### When you would need the full pattern

Textbooks show a longer recipe with a protected \`Dispose(bool disposing)\`, a finalizer and \`GC.SuppressFinalize\`. That recipe exists for classes that directly own **unmanaged** handles. Today the better answer is almost always to hold a \`SafeHandle\` (which already has the pattern inside) and keep your own class simple: sealed, one \`Dispose\`, one flag. Everything you write in this course falls in that simple case.

### Who owns it?

Only dispose what you created or were explicitly handed ownership of. Disposing something that was passed *to* you, and that other code still uses, leaves them holding a dead object. In the next lesson, when a container hands components their dependencies, the question "who disposes this?" gets a firm answer.

### Common mistakes

- **Using a type that does not implement the interface.** \`using (string name = "Odile") { }\` gives \`Program.cs(1,8): error CS1674: 'string': type used in a using statement must implement 'System.IDisposable'.\`
- **Declaring the interface but not the method.** \`class Lamp : IDisposable { }\` fails with \`error CS0535: 'Lamp' does not implement interface member 'IDisposable.Dispose()'\`.
- **Plain \`using\` on an async-only type.** For a type that only has \`DisposeAsync\` the compiler even tells you the fix: \`error CS8418: 'Rack': type used in a using statement must implement 'System.IDisposable'. Did you mean 'await using' rather than 'using'?\`
- **Reassigning a using variable.** \`lamp = new Lamp();\` after \`using Lamp lamp = ...;\` gives \`error CS1656: Cannot assign to 'lamp' because it is a 'using variable'\`, which protects you from disposing the wrong object.
- **Touching a disposed object.** Well-behaved types throw once they are finished: \`ObjectDisposedException: Cannot access a disposed object.\` followed by \`Object name: 'Lamp'.\`, or for a cancellation source \`The CancellationTokenSource has been disposed.\` Write your own guard with \`ObjectDisposedException.ThrowIf(disposed, this)\`.
- **Forgetting \`using\` altogether.** No message, no crash: \`Borrow\` is called, the lamp is never returned and the pool runs dry. When a resource-shaped type seems to "leak", look for the missing \`using\` first.`,
      mission: md`The Lantern Maker has two follow-spots, Spot A and Spot B, and a crew of six who all want one. Wen borrows a spot for the opening number and forgets to give it back; by the second act Tobias is told "no spotlight free" and the lead is performing in the dark. Odile Marsh does not want a rota. She wants the desk itself to hand each spot out on a lease that is returned the moment its scene is over, even if the scene falls apart.

You will write the lease, the pool and a dimmer rack that powers down asynchronously, then watch them open and close in the right order. When the lesson passes, the **Lifetimes** panel lights up on the board with every borrow and return in the order it happened.`,
      tasks: [
        "Under the divider declare sealed class Lease : IDisposable with a read-only string Lamp, a constructor Lease(string lamp, Action release) and a Dispose that calls release only the first time it is called. Declare class SpotPool with a constructor SpotPool(List<string> log), a Queue<string> holding \"Spot A\" then \"Spot B\", an int property Free, and Lease Borrow(): when nothing is left throw new InvalidOperationException(\"no spotlight free\"), otherwise dequeue a lamp, add $\"borrow {lamp}\" to the log and return a Lease whose release action enqueues the lamp again and adds $\"return {lamp}\"",
        "Also declare sealed class DimmerRack : IAsyncDisposable. Its constructor DimmerRack(List<string> log) adds \"rack powered up\" to the log, and DisposeAsync awaits Task.Delay(5) and then adds \"rack powered down\"",
        "Above the divider create List<string> lifetimeLog and SpotPool spots = new(lifetimeLog). Open using (Lease first = spots.Borrow()) { ... } and inside it print $\"{first.Lamp} lent, {spots.Free} free\", then declare using Lease second = spots.Borrow(); and print the same line for it, then try to Borrow a third lease: catch InvalidOperationException ex and print $\"third request: {ex.Message}\". After the block print $\"after the block: {spots.Free} free\"",
        "Prove exception safety: in a try block write using Lease blown = spots.Borrow(); and then throw new InvalidOperationException(\"lamp blew\"); in the catch print $\"caught: {ex.Message}; {spots.Free} free again\". Then, in a bare { } block, declare await using DimmerRack rack = new(lifetimeLog); and using Lease spot = spots.Borrow(); (in that order) and add \"show in progress\" to lifetimeLog. After the block print \"log: \" + string.Join(\" | \", lifetimeLog)",
        "Finish with Desk.Show(\"lifetimes\", new { log = lifetimeLog, free = spots.Free });",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 16: resource lifetimes. Add your code below, in this order.
// 1. Below the divider declare Lease, SpotPool and DimmerRack:
//      sealed class Lease : IDisposable          string Lamp { get; }   Lease(string lamp, Action release)   Dispose runs release ONCE (use a bool flag)
//      class SpotPool                            SpotPool(List<string> log)   Queue<string> of "Spot A", "Spot B"   int Free   Lease Borrow()
//          Borrow: empty -> throw new InvalidOperationException("no spotlight free"); else dequeue, log $"borrow {lamp}",
//                  return new Lease(lamp, () => { enqueue it back; log $"return {lamp}"; })
//      sealed class DimmerRack : IAsyncDisposable   ctor logs "rack powered up";  async ValueTask DisposeAsync() { await Task.Delay(5); log "rack powered down"; }
// 2. List<string> lifetimeLog = new();  SpotPool spots = new(lifetimeLog);
// 3. using (Lease first = spots.Borrow()) { print "Spot A lent, 1 free"; using Lease second = ...; print "Spot B lent, 0 free";
//      try a third Borrow and print "third request: no spotlight free" }   then print "after the block: 2 free"
// 4. try { using Lease blown = spots.Borrow(); throw new InvalidOperationException("lamp blew"); } catch ... print "caught: lamp blew; 2 free again"
// 5. { await using DimmerRack rack = new(lifetimeLog); using Lease spot = spots.Borrow(); lifetimeLog.Add("show in progress"); }
//    print:  log: borrow Spot A | borrow Spot B | return Spot B | ...
// 6. Desk.Show("lifetimes", new { log = lifetimeLog, free = spots.Free });

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare Lease, SpotPool and DimmerRack here.
`,
      solutionAdd: cs`// Lesson 16: resource lifetimes.
List<string> lifetimeLog = new();
SpotPool spots = new(lifetimeLog);

using (Lease first = spots.Borrow())
{
    Console.WriteLine($"{first.Lamp} lent, {spots.Free} free");
    using Lease second = spots.Borrow();
    Console.WriteLine($"{second.Lamp} lent, {spots.Free} free");
    try
    {
        spots.Borrow();
    }
    catch (InvalidOperationException ex)
    {
        Console.WriteLine($"third request: {ex.Message}");
    }
}
Console.WriteLine($"after the block: {spots.Free} free");

try
{
    using Lease blown = spots.Borrow();
    throw new InvalidOperationException("lamp blew");
}
catch (InvalidOperationException ex)
{
    Console.WriteLine($"caught: {ex.Message}; {spots.Free} free again");
}

{
    await using DimmerRack rack = new(lifetimeLog);
    using Lease spot = spots.Borrow();
    lifetimeLog.Add("show in progress");
}
Console.WriteLine("log: " + string.Join(" | ", lifetimeLog));

Desk.Show("lifetimes", new { log = lifetimeLog, free = spots.Free });

${TYPES_DIVIDER}

sealed class Lease : IDisposable
{
    readonly Action release;
    bool released;

    public string Lamp { get; }

    public Lease(string lamp, Action release)
    {
        Lamp = lamp;
        this.release = release;
    }

    public void Dispose()
    {
        if (released)
        {
            return;
        }
        released = true;
        release();
    }
}

class SpotPool
{
    readonly Queue<string> available = new(new[] { "Spot A", "Spot B" });
    readonly List<string> log;

    public int Free
    {
        get { return available.Count; }
    }

    public SpotPool(List<string> log)
    {
        this.log = log;
    }

    public Lease Borrow()
    {
        if (available.Count == 0)
        {
            throw new InvalidOperationException("no spotlight free");
        }
        string lamp = available.Dequeue();
        log.Add($"borrow {lamp}");
        return new Lease(lamp, () =>
        {
            available.Enqueue(lamp);
            log.Add($"return {lamp}");
        });
    }
}

sealed class DimmerRack : IAsyncDisposable
{
    readonly List<string> log;

    public DimmerRack(List<string> log)
    {
        this.log = log;
        log.Add("rack powered up");
    }

    public async ValueTask DisposeAsync()
    {
        await Task.Delay(5);
        log.Add("rack powered down");
    }
}`,
      explanation:
        "A Lease turns 'give this lamp back' into a value: its Dispose runs the release action exactly once (the flag makes a second Dispose harmless), and using wraps the block in try/finally so the lamp returns on every exit, including the thrown 'lamp blew' exception. Disposal is last in, first out, so the nested leases return Spot B before Spot A, and in the final block the lease declared after the rack is returned before the rack powers down. await using calls DisposeAsync and waits for it, which is why 'rack powered down' is the last entry even though the delay makes it slow. The log therefore reads as a stack unwinding: borrow A, borrow B, return B, return A, then the exception case, then rack up, borrow, show, return, rack down, and two lamps are free again at the end.",
      hints: [
        { id: "h1", title: "Dispose runs once", content: "Give Lease a bool field, for example released. Dispose starts with: if (released) return; released = true; and only then calls the release action it was given. The pool's release action enqueues the lamp and logs the return." },
        { id: "h2", title: "The shape of Borrow", content: "if (available.Count == 0) throw new InvalidOperationException(\"no spotlight free\"); string lamp = available.Dequeue(); log.Add($\"borrow {lamp}\"); return new Lease(lamp, () => { available.Enqueue(lamp); log.Add($\"return {lamp}\"); }); Free is simply available.Count." },
        { id: "h3", title: "Declare in the order you want them undone", content: "Disposal is reversed, so write await using DimmerRack rack = new(lifetimeLog); first and using Lease spot = spots.Borrow(); second: the spot is returned first and the rack powers down last. The two blocks are using (Lease first = ...) { using Lease second = ...; ... } and a bare { await using ...; using ...; lifetimeLog.Add(\"show in progress\"); }" },
      ],
      tests: [
        {
          id: "t1",
          description: "two leases are lent and a third request is refused",
          assertionCode: js`
assert(lines.includes("Spot A lent, 1 free"), 'No line is exactly "Spot A lent, 1 free". Borrow the first lease and print $"{first.Lamp} lent, {spots.Free} free". The pool hands out Spot A first, so declare the queue as "Spot A" then "Spot B".');
assert(lines.includes("Spot B lent, 0 free"), 'No line is exactly "Spot B lent, 0 free". Print the same line for the second lease.');
assert(lines.includes("third request: no spotlight free"), 'No line is exactly "third request: no spotlight free". Borrow a third lease inside a try and print the InvalidOperationException message from the catch.');`,
        },
        {
          id: "t2",
          description: "leaving the block returns both lamps, even after an exception",
          assertionCode: js`
assert(lines.includes("after the block: 2 free"), 'No line is exactly "after the block: 2 free". Both leases are disposed when the using block ends, so Free should be 2 again.');
assert(lines.includes("caught: lamp blew; 2 free again"), 'No line is exactly "caught: lamp blew; 2 free again". A using declaration inside the try returns the lamp in its finally, so by the time the catch runs Free is already 2.');`,
        },
        {
          id: "t3",
          description: "disposal order is the reverse of declaration order",
          assertionCode: js`
const log = scene.lifetimes?.log;
assert(Array.isArray(log), "Send the log with Desk.Show(\"lifetimes\", new { log = lifetimeLog, free = spots.Free });");
assertEqual(log.slice(0, 4), ["borrow Spot A", "borrow Spot B", "return Spot B", "return Spot A"], "The nested leases should come back in reverse order: Spot B (declared second) is returned before Spot A. Check you used using Lease second = ... inside the first block.");`,
        },
        {
          id: "t4",
          description: "an async rack is powered down after the lease declared after it",
          assertionCode: js`
const log = scene.lifetimes?.log ?? [];
assertEqual(log.slice(4), ["borrow Spot B", "return Spot B", "rack powered up", "borrow Spot A", "show in progress", "return Spot A", "rack powered down"], "After the first block the log should hold: the 'blown' borrow and return, then the rack block (rack up, borrow, show in progress, return, rack down). Declare the rack BEFORE the spot lease so the lease is returned first, and use await using so DisposeAsync is awaited.");`,
        },
        {
          id: "t5",
          description: "the log line and the free count are sent to the board",
          assertionCode: js`
assert(lines.includes("log: borrow Spot A | borrow Spot B | return Spot B | return Spot A | borrow Spot B | return Spot B | rack powered up | borrow Spot A | show in progress | return Spot A | rack powered down"), 'Print "log: " + string.Join(" | ", lifetimeLog) after the rack block. The whole log is eleven entries long.');
assertEqual(scene.lifetimes?.free, 2, "free in the lifetimes payload: every lamp is back at the end");`,
        },
      ],
      unlocks: ["fl-lifetimes"],
      checks: [
        {
          prompt: "A method contains `using Lease a = pool.Borrow();` and then `using Lease b = pool.Borrow();`, and the body throws an exception. In which order do the leases go back?",
          question: {
            type: "choice",
            options: [
              "b first, then a, before the exception reaches any catch block outside the method",
              "a first, then b, because that is the order they were borrowed",
              "Neither: an exception skips Dispose, so the leases leak until the garbage collector runs",
              "Both at once, in no particular order",
            ],
            answer: 0,
          },
          explanation: "A using declaration expands to try/finally, so the exception does not skip it. Disposal is last in, first out: b depends on nothing a does not already hold, so b goes back first. The exception continues outwards only after both finally blocks have run.",
        },
        {
          prompt: "Why does `Lease.Dispose` check a `released` flag before calling the release action?",
          question: {
            type: "choice",
            options: [
              "So that disposing twice is harmless: otherwise the lamp would be put back twice and two callers could hold the same spotlight",
              "So that the garbage collector knows when to free the lease's memory",
              "Because C# refuses to compile a Dispose method without a flag",
              "To make the lease thread-safe without any other code",
            ],
            answer: 0,
          },
          explanation: "The contract says Dispose may be called more than once (a using block plus a manual call, or a cleanup path that runs twice). Making it idempotent stops the second call from repeating the side effect. A plain bool is not thread safety, but it is all a single-threaded lease needs.",
        },
        {
          prompt: "The body of a `using` block throws `Exception(\"body failed\")`, and then the object's `Dispose` throws `InvalidOperationException(\"dispose failed\")`. Which exception does the caller's catch receive?",
          question: {
            type: "choice",
            options: [
              "The one from Dispose: it replaces the body's exception, so the original cause is lost",
              "The one from the body, because it happened first",
              "Both, as an AggregateException",
              "Neither: the program ends immediately",
            ],
            answer: 0,
          },
          explanation: "The finally block runs while the first exception is in flight; an exception thrown inside it takes over. That is why Dispose methods should release quietly and not throw: a failing cleanup would hide the failure you actually needed to see.",
        },
      ],
    },
    // ───────────────────────── 17 ─────────────────────────
    {
      id: "csharp-delegates-17-wiring",
      title: "Wiring it together",
      minutes: 45,
      xp: 240,
      concepts: ["dependency inversion", "constructor injection", "composition root", "singleton vs transient", "service container", "test doubles", "circular dependency", "service locator smell"],
      learn: md`### The class that builds its own friends

Here is a perfectly working class from a first draft of the desk:

~~~csharp
class ShowController
{
    readonly DimmerBoard lighting = new DimmerBoard(new SystemClock(), new ConsoleLog());

    public void Cue(string zone, int level) { lighting.Set(zone, level); }
}
~~~

It runs. It is also welded shut. To test it you would have to wait for a real clock and read a real console. To rehearse "what if it were noon" you would have to edit the class. To put the log in a file, you edit the class again. Every decision about *which* clock, *which* log, *which* board is buried inside a class whose job was only to run cues.

**Dependency inversion** is the cure, and it has two halves.

- Depend on an **abstraction**, not on a concrete class: the controller needs "something that can set a level", so it asks for \`ILighting\`, not \`DimmerBoard\`.
- Let someone else **supply** it. The class receives its collaborators through its constructor and never calls \`new\` on them.

~~~csharp
class ShowController
{
    readonly ILighting lighting;
    readonly IClock clock;
    readonly ILog log;

    public ShowController(ILighting lighting, IClock clock, ILog log)
    {
        this.lighting = lighting;
        this.clock = clock;
        this.log = log;
    }
}
~~~

The constructor is now an honest shopping list. Anyone reading the signature knows everything the class needs, and a test can hand it a fake clock stuck at 1000 and a log that just remembers its lines.

### Interface or delegate?

Lesson 15's breaker took its clock as a plain delegate, \`Func<long>\`. The controller above takes an \`IClock\` interface. Both are dependency inversion; pick by size.

- A dependency that is **one function** (a clock, a random-number source, a "should I retry" decision) is simplest as a delegate. No extra type, and a lambda is a complete implementation.
- A dependency with **several related members**, a name you want to read in a signature, or state that belongs together (a lighting board, a repository) wants an interface. It also gives a container something to be registered under, which matters below.

Neither is more "correct". If you find yourself writing an interface with one method and a class that only forwards to a lambda, the delegate was enough.

### Who calls the constructors? The composition root

If classes never call \`new\` on their collaborators, somebody must. That somebody lives in exactly one place near the start of the program, the **composition root**, and it is the only code allowed to know which concrete classes exist:

~~~csharp
ILog log = new ListLog();
IClock clock = new FakeClock { Now = 1000 };
ILighting lighting = new DimmerBoard(clock, log);
ShowController desk = new ShowController(lighting, clock, log);
~~~

That works for four objects. For forty, the wiring becomes a wall of lines in a fragile order. A **container** automates it: you register a *recipe* per abstraction, then ask for the one you want and it builds whatever it needs on the way.

### A container is a dictionary of recipes

Strip away the folklore and a container is this:

~~~csharp
Dictionary<Type, Func<Container, object>> recipes
~~~

Registration stores a recipe under a type. Resolving looks the recipe up and runs it, handing it the container so the recipe can resolve *its* parts:

~~~csharp
container.AddSingleton<ILighting>(c => new DimmerBoard(c.Resolve<IClock>(), c.Resolve<ILog>()));
~~~

Read that as: "when anyone asks for an \`ILighting\`, build a \`DimmerBoard\` using whatever the container gives for \`IClock\` and \`ILog\`." The type argument is the *key* (the abstraction); the lambda knows the concrete class. Swapping the clock for a fake only changes which instance is registered under \`IClock\`; nothing else is touched.

### Lifetimes: one shared or a fresh one

- **Singleton**: the container builds it the first time it is requested, keeps it, and returns the same object forever. Right for the clock, the log, the lighting board: things that must be shared.
- **Transient**: a brand new object per request. Right for things that carry per-use state, like a controller you want one of per scene.

Our \`Container\` keeps singleton instances in a second dictionary and checks it before running the recipe. One hazard to know: a singleton that depends on a transient *captures* that one transient instance for the container's whole life, so the "fresh each time" promise quietly breaks. Keep long-lived things depending only on equally long-lived things.

### The graph, and the circle

As the container resolves, it knows who asked for whom. Keeping a stack of "types currently being built" gives two gifts. Each time a type is resolved while another is mid-build, that is an edge in the **dependency graph** (the Wiring diagram on the board draws it). And if the type being requested is already on the stack, you have a circle:

~~~csharp
tangled.AddSingleton<FlyBar>(c => new FlyBar(c.Resolve<Winch>()));
tangled.AddSingleton<Winch>(c => new Winch(c.Resolve<FlyBar>()));
~~~

A needs B needs A. Without a guard the container recurses until the stack is gone and the process dies with \`Stack overflow.\`, followed by thousands of repeated stack frames. With the guard it throws a message you can act on: \`circular dependency: FlyBar -> Winch -> FlyBar\`. A cycle is almost always a sign that two classes should share a smaller third one, or that one should hear about the other through an event (lesson 5) instead of holding it.

### Why not just pass the container around?

A tempting shortcut is to hand the container itself to every class and let each one call \`Resolve\` when it needs something. This is the **service locator** pattern, and it is a smell for three reasons. The constructor no longer tells the truth about what the class needs. A missing registration fails at run time in the middle of a scene instead of at start-up. And tests must build a whole container to run one class. Only the composition root (and recipes, which are part of it) should touch \`Resolve\`.

### Common mistakes

- **Constructing an interface.** \`ILog log = new ILog();\` gives \`Program.cs(1,12): error CS0144: Cannot create an instance of the abstract type or interface 'ILog'\`. Interfaces are the key, never the product.
- **Forgetting a constructor argument.** \`new Board()\` for a constructor \`Board(IClock clock, ILog log)\` gives \`error CS7036: There is no argument given that corresponds to the required parameter 'clock' of 'Board.Board(IClock, ILog)'\`; supplying only the clock reports \`'log'\` instead.
- **Implementing the interface with the wrong type.** An \`IClock\` wants \`long Now { get; }\`; a class with \`int Now\` fails with \`error CS0738: 'FakeClock' does not implement interface member 'IClock.Now'. 'FakeClock.Now' cannot implement 'IClock.Now' because it does not have the matching return type of 'long'.\`
- **Reusing a name from an earlier lesson.** Everything in your file shares one scope, so a second \`rehearsal\` fails with \`error CS0128: A local variable or function named 'rehearsal' is already defined in this scope\`. That is why this lesson's test container is called \`dressRehearsal\`.
- **Asking for something nobody registered.** The container in this lesson throws \`InvalidOperationException: nothing registered for ILog\`. Registering \`ILog\` does not register \`ListLog\`: ask for the key you registered.
- **No cycle guard.** An unprotected circular registration ends the program with \`Stack overflow.\` and a very long repeated trace.`,
      mission: md`The Lantern Maker opens in three days and the desk is a tangle. Tobias built his sound classes to read the real clock; Wen's fly code prints straight to the console. Odile Marsh wants a **dress rehearsal mode**: the same desk, but with a clock she can set to any minute and a log that quietly keeps what it hears, so the tech crew can replay the show without waiting for the evening.

You will define the parts as interfaces, write a small container that wires them, build two desks from one recipe (live and rehearsal) and make the container refuse a circular arrangement with a clear message. When the lesson passes, the **Wiring diagram** lights up on the board: every part your container built, and every link it followed.`,
      tasks: [
        "Under the divider declare interfaces IClock { long Now { get; } }, ILog { void Write(string line); } and ILighting { void Set(string zone, int level); }. Declare class FakeClock : IClock with a get/set long Now; class ListLog : ILog with a public List<string> Lines that Write fills, printing each line as \"  log: \" + line (two leading spaces); class DimmerBoard : ILighting whose constructor takes IClock and ILog and whose Set writes $\"[{clock.Now}] {zone} -> {level}\"; and class ShowController whose constructor takes ILighting, IClock and ILog and whose Cue(string zone, int level) calls lighting.Set and then writes $\"cue done at {clock.Now}\"",
        "Declare records Node(string Name, string Lifetime) and Edge(string From, string To), classes FlyBar(Winch winch) and Winch(FlyBar bar) (constructors that take the other and do nothing), and class Container with AddSingleton<T>(Func<Container, T> make), AddTransient<T>(Func<Container, T> make) and T Resolve<T>(), plus public List<Node> Nodes and List<Edge> Edges. Resolve keeps a stack of the types being built: an unregistered type throws InvalidOperationException($\"nothing registered for {type.Name}\"); a type already on the stack throws InvalidOperationException($\"circular dependency: {path}\") where path joins the type names from the outermost with \" -> \" and ends with the repeated one; each time a type is resolved while another is being built it adds Edge(parent, child) once; singletons are cached; every built type is recorded once as Node(type.Name, \"singleton\" or \"transient\")",
        "Above the divider write a local function Container BuildDesk(IClock clock, ILog log) that registers IClock and ILog as singletons returning the arguments, ILighting as a singleton built from c.Resolve<IClock>() and c.Resolve<ILog>() as a DimmerBoard, and ShowController as a transient built from the three resolved parts. Then create ListLog liveLog and Container live = BuildDesk(new FakeClock { Now = 1000 }, liveLog), resolve ShowController deskOne and call deskOne.Cue(\"stage left\", 80), resolve another ShowController deskTwo, and print $\"transient: two controllers? {!ReferenceEquals(deskOne, deskTwo)}\" and $\"singleton: one clock? {ReferenceEquals(live.Resolve<IClock>(), live.Resolve<IClock>())}\"",
        "Build the rehearsal: ListLog rehearsalLog, Container dressRehearsal = BuildDesk(new FakeClock { Now = 5 }, rehearsalLog) and call dressRehearsal.Resolve<ShowController>().Cue(\"stage right\", 40). Then make Container tangled with FlyBar and Winch registered as singletons that resolve each other, resolve FlyBar inside a try, catch InvalidOperationException into string cycleMessage (start it as \"none\") and print cycleMessage",
        "Finish with Desk.Show(\"wiring\", new { nodes = live.Nodes, edges = live.Edges, liveLog = liveLog.Lines, rehearsalLog = rehearsalLog.Lines, cycleMessage });",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 17: wiring components together. Add your code below, in this order.
// 1. Below the divider declare (see the task list for the exact members):
//      interface IClock / ILog / ILighting          class FakeClock, ListLog, DimmerBoard, ShowController
//      record Node(string Name, string Lifetime)    record Edge(string From, string To)    class FlyBar(Winch), class Winch(FlyBar)
//      class Container { AddSingleton<T>(Func<Container, T>) AddTransient<T>(...) T Resolve<T>() List<Node> Nodes List<Edge> Edges }
//        Resolve: stack of types being built -> "nothing registered for X" / "circular dependency: A -> B -> A", record edges, cache singletons
// 2. Container BuildDesk(IClock clock, ILog log) { ... }   (a local function, here among the statements)
// 3. ListLog liveLog = new(); Container live = BuildDesk(new FakeClock { Now = 1000 }, liveLog);
//    ShowController deskOne = live.Resolve<ShowController>(); deskOne.Cue("stage left", 80);  deskTwo = another resolve
//    Print:  transient: two controllers? True     singleton: one clock? True
// 4. ListLog rehearsalLog; Container dressRehearsal = BuildDesk(new FakeClock { Now = 5 }, rehearsalLog); Cue("stage right", 40)
//    (the name rehearsal is already taken by lesson 9, so call the container dressRehearsal)
// 5. Container tangled: FlyBar and Winch resolve each other; catch the InvalidOperationException into cycleMessage and print it
// 6. Desk.Show("wiring", new { nodes = live.Nodes, edges = live.Edges, liveLog = liveLog.Lines, rehearsalLog = rehearsalLog.Lines, cycleMessage });

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare the interfaces, the parts, the records and the Container here.
`,
      solutionAdd: cs`// Lesson 17: wiring components together.
Container BuildDesk(IClock clock, ILog log)
{
    Container container = new();
    container.AddSingleton<IClock>(c => clock);
    container.AddSingleton<ILog>(c => log);
    container.AddSingleton<ILighting>(c => new DimmerBoard(c.Resolve<IClock>(), c.Resolve<ILog>()));
    container.AddTransient<ShowController>(c => new ShowController(c.Resolve<ILighting>(), c.Resolve<IClock>(), c.Resolve<ILog>()));
    return container;
}

ListLog liveLog = new();
Container live = BuildDesk(new FakeClock { Now = 1000 }, liveLog);
ShowController deskOne = live.Resolve<ShowController>();
deskOne.Cue("stage left", 80);
ShowController deskTwo = live.Resolve<ShowController>();
Console.WriteLine($"transient: two controllers? {!ReferenceEquals(deskOne, deskTwo)}");
Console.WriteLine($"singleton: one clock? {ReferenceEquals(live.Resolve<IClock>(), live.Resolve<IClock>())}");

ListLog rehearsalLog = new();
Container dressRehearsal = BuildDesk(new FakeClock { Now = 5 }, rehearsalLog);
dressRehearsal.Resolve<ShowController>().Cue("stage right", 40);

Container tangled = new();
tangled.AddSingleton<FlyBar>(c => new FlyBar(c.Resolve<Winch>()));
tangled.AddSingleton<Winch>(c => new Winch(c.Resolve<FlyBar>()));
string cycleMessage = "none";
try
{
    tangled.Resolve<FlyBar>();
}
catch (InvalidOperationException ex)
{
    cycleMessage = ex.Message;
}
Console.WriteLine(cycleMessage);

Desk.Show("wiring", new
{
    nodes = live.Nodes,
    edges = live.Edges,
    liveLog = liveLog.Lines,
    rehearsalLog = rehearsalLog.Lines,
    cycleMessage,
});

${TYPES_DIVIDER}

interface IClock
{
    long Now { get; }
}

interface ILog
{
    void Write(string line);
}

interface ILighting
{
    void Set(string zone, int level);
}

class FakeClock : IClock
{
    public long Now { get; set; }
}

class ListLog : ILog
{
    public List<string> Lines { get; } = new();

    public void Write(string line)
    {
        Lines.Add(line);
        Console.WriteLine("  log: " + line);
    }
}

class DimmerBoard : ILighting
{
    readonly IClock clock;
    readonly ILog log;

    public DimmerBoard(IClock clock, ILog log)
    {
        this.clock = clock;
        this.log = log;
    }

    public void Set(string zone, int level)
    {
        log.Write($"[{clock.Now}] {zone} -> {level}");
    }
}

class ShowController
{
    readonly ILighting lighting;
    readonly IClock clock;
    readonly ILog log;

    public ShowController(ILighting lighting, IClock clock, ILog log)
    {
        this.lighting = lighting;
        this.clock = clock;
        this.log = log;
    }

    public void Cue(string zone, int level)
    {
        lighting.Set(zone, level);
        log.Write($"cue done at {clock.Now}");
    }
}

class FlyBar
{
    public FlyBar(Winch winch)
    {
    }
}

class Winch
{
    public Winch(FlyBar bar)
    {
    }
}

record Node(string Name, string Lifetime);

record Edge(string From, string To);

class Container
{
    readonly Dictionary<Type, (Func<Container, object> Make, bool Singleton)> registrations = new();
    readonly Dictionary<Type, object> instances = new();
    readonly Stack<Type> resolving = new();

    public List<Node> Nodes { get; } = new();
    public List<Edge> Edges { get; } = new();

    public void AddSingleton<T>(Func<Container, T> make) where T : notnull
    {
        registrations[typeof(T)] = (c => make(c), true);
    }

    public void AddTransient<T>(Func<Container, T> make) where T : notnull
    {
        registrations[typeof(T)] = (c => make(c), false);
    }

    public T Resolve<T>() where T : notnull
    {
        Type type = typeof(T);
        if (resolving.Contains(type))
        {
            string path = string.Join(" -> ", resolving.Reverse().Append(type).Select(t => t.Name));
            throw new InvalidOperationException($"circular dependency: {path}");
        }
        if (!registrations.TryGetValue(type, out var registration))
        {
            throw new InvalidOperationException($"nothing registered for {type.Name}");
        }

        if (resolving.Count > 0)
        {
            Edge edge = new(resolving.Peek().Name, type.Name);
            if (!Edges.Contains(edge))
            {
                Edges.Add(edge);
            }
        }
        if (registration.Singleton && instances.TryGetValue(type, out object? existing))
        {
            return (T)existing;
        }

        resolving.Push(type);
        try
        {
            T made = (T)registration.Make(this);
            if (registration.Singleton)
            {
                instances[type] = made;
            }
            Node node = new(type.Name, registration.Singleton ? "singleton" : "transient");
            if (!Nodes.Contains(node))
            {
                Nodes.Add(node);
            }
            return made;
        }
        finally
        {
            resolving.Pop();
        }
    }
}`,
      explanation:
        "The parts depend only on interfaces (ShowController asks for ILighting, IClock and ILog, DimmerBoard for IClock and ILog), so BuildDesk is the single place that decides which concrete classes and which clock are used. Container maps each requested type to a recipe; Resolve pushes the type on a stack while its recipe runs, which is how the nested Resolve calls become edges (ShowController to ILighting, ILighting to IClock and ILog, and so on) and how a request for a type already on the stack is recognised as a cycle (FlyBar -> Winch -> FlyBar) instead of recursing until the stack overflows. Singletons are cached so the two live.Resolve<IClock>() calls return the same object, while the transient ShowController is built twice, so deskOne and deskTwo differ. Calling BuildDesk again with a FakeClock at 5 and a second ListLog yields an independent desk whose log lines carry the other time, without touching a single class.",
      hints: [
        { id: "h1", title: "Start with the parts", content: "Write the three interfaces and the four small classes first; they are plain constructor-injection code. DimmerBoard and ShowController each store their constructor arguments in readonly fields and use them in Set / Cue. ListLog.Write adds to Lines and prints \"  log: \" + line." },
        { id: "h2", title: "The Container's bookkeeping", content: "Keep Dictionary<Type, (Func<Container, object> Make, bool Singleton)> registrations, Dictionary<Type, object> instances and Stack<Type> resolving. In Resolve<T>: check resolving.Contains(type) for the cycle, TryGetValue for the registration, add Edge(resolving.Peek().Name, type.Name) when resolving.Count > 0 and it is not already in Edges, return a cached singleton if there is one." },
        { id: "h3", title: "Build, record, pop", content: "resolving.Push(type); try { T made = (T)registration.Make(this); if (registration.Singleton) instances[type] = made; add Node(type.Name, registration.Singleton ? \"singleton\" : \"transient\") once; return made; } finally { resolving.Pop(); } For the cycle message use string.Join(\" -> \", resolving.Reverse().Append(type).Select(t => t.Name)). In BuildDesk register with AddSingleton<IClock>(c => clock) and so on." },
      ],
      tests: [
        {
          id: "t1",
          description: "the live desk is wired from the container and logs through its fake clock",
          assertionCode: js`
assert(lines.includes("  log: [1000] stage left -> 80"), 'No line is exactly "  log: [1000] stage left -> 80" (two leading spaces). ListLog.Write should print "  log: " + line, and DimmerBoard.Set should write $"[{clock.Now}] {zone} -> {level}" using the clock the container supplied.');
assert(lines.includes("  log: cue done at 1000"), 'No line is exactly "  log: cue done at 1000". ShowController.Cue should call lighting.Set and then write $"cue done at {clock.Now}".');`,
        },
        {
          id: "t2",
          description: "transient gives a new controller each time, singleton shares one clock",
          assertionCode: js`
assert(lines.includes("transient: two controllers? True"), 'No line is exactly "transient: two controllers? True". Register ShowController with AddTransient so every Resolve builds a new one, then print !ReferenceEquals(deskOne, deskTwo).');
assert(lines.includes("singleton: one clock? True"), 'No line is exactly "singleton: one clock? True". Singletons must be cached: the second live.Resolve<IClock>() must return the instance the first one built.');`,
        },
        {
          id: "t3",
          description: "a second container swaps the clock without touching any class",
          assertionCode: js`
assert(lines.includes("  log: [5] stage right -> 40"), 'No line is exactly "  log: [5] stage right -> 40". Build the rehearsal with BuildDesk(new FakeClock { Now = 5 }, rehearsalLog) and cue "stage right" at 40.');
assert(lines.includes("  log: cue done at 5"), 'No line is exactly "  log: cue done at 5".');
assertEqual(scene.wiring?.liveLog, ["[1000] stage left -> 80", "cue done at 1000"], "liveLog in the wiring payload: the live desk's own lines only (each ListLog keeps its own Lines)");
assertEqual(scene.wiring?.rehearsalLog, ["[5] stage right -> 40", "cue done at 5"], "rehearsalLog in the wiring payload: the rehearsal desk's lines only");`,
        },
        {
          id: "t4",
          description: "a circular registration is refused with a readable message",
          assertionCode: js`
assert(lines.includes("circular dependency: FlyBar -> Winch -> FlyBar"), 'No line is exactly "circular dependency: FlyBar -> Winch -> FlyBar". Keep a stack of the types being resolved; when the requested type is already on it, throw InvalidOperationException($"circular dependency: {path}") with the names from outermost to the repeated type.');
assertEqual(scene.wiring?.cycleMessage, "circular dependency: FlyBar -> Winch -> FlyBar", "cycleMessage in the wiring payload");`,
        },
        {
          id: "t5",
          description: "the container records the parts it built and the links it followed",
          assertionCode: js`
const w = scene.wiring;
assert(w && Array.isArray(w.nodes) && Array.isArray(w.edges), "Send nodes = live.Nodes and edges = live.Edges in the wiring payload.");
const nodes = Object.fromEntries(w.nodes.map((n) => [n.name, n.lifetime]));
assertEqual(nodes, { IClock: "singleton", ILog: "singleton", ILighting: "singleton", ShowController: "transient" }, "live.Nodes: one Node per type the container built, named with type.Name and marked singleton or transient (each type recorded once)");
const edges = w.edges.map((e) => e.from + ">" + e.to).sort();
assertEqual(edges, ["ILighting>IClock", "ILighting>ILog", "ShowController>IClock", "ShowController>ILighting", "ShowController>ILog"], "live.Edges: add Edge(parent, child) whenever a type is resolved while another is being built, once per pair");`,
        },
      ],
      unlocks: ["fl-wiring"],
      checks: [
        {
          prompt: "Why does `ShowController` take an `IClock` in its constructor instead of reading `DateTime.UtcNow` inside `Cue`?",
          question: {
            type: "choice",
            options: [
              "So a fake clock can be supplied: the class can be run at any chosen time, and its behaviour no longer depends on the real world",
              "Because DateTime.UtcNow is not allowed inside a class",
              "Because interfaces make the program run faster",
              "So that the clock is created once for the whole process",
            ],
            answer: 0,
          },
          explanation: "A hidden call to the real clock makes the class untestable and non-repeatable. Receiving the clock from outside means whoever builds the controller decides what time it is: the real one for the show, a fixed one for a rehearsal or a test. The class itself is unchanged.",
        },
        {
          prompt: "Both `AddSingleton<IClock>(...)` and `AddTransient<ShowController>(...)` are registered. After `Resolve<IClock>()` twice and `Resolve<ShowController>()` twice, how many distinct objects exist of each?",
          question: {
            type: "choice",
            options: [
              "One IClock and two ShowControllers",
              "Two IClocks and one ShowController",
              "Two of each",
              "One of each",
            ],
            answer: 0,
          },
          explanation: "A singleton is built on first request and cached, so every later request returns that same instance. A transient is built again on every request. (Each ShowController resolves the shared clock, so they hold the same IClock.)",
        },
        {
          prompt: "Which constructor tells the truth about what the class needs, and why is passing the whole `Container` into a class (calling `services.Resolve<ILighting>()` inside it) considered a smell?",
          question: {
            type: "choice",
            options: [
              "`ShowController(ILighting, IClock, ILog)`; the container version hides the real needs, fails only at run time when a registration is missing, and forces tests to build a container",
              "`ShowController(Container services)`; one parameter is always tidier",
              "Both are equally honest; it is only a naming preference",
              "`ShowController()`; classes should find everything themselves",
            ],
            answer: 0,
          },
          explanation: "A constructor list is documentation the compiler enforces: you cannot build the class without supplying each part. Handing over the container turns every dependency into a surprise discovered in the middle of a scene. Keep Resolve in the composition root.",
        },
      ],
    },
    // ───────────────────────── 18 ─────────────────────────
    {
      id: "csharp-delegates-18-show",
      title: "Run the show",
      minutes: 55,
      xp: 300,
      concepts: ["composition", "policy ordering", "per-device breakers", "iterator script", "dependency injection with delegates", "records with", "reading logs", "debugging by evidence"],
      learn: md`### Nothing new to learn, a lot to put together

Every piece you need is already in your file. This lesson is about the part that separates people who have *seen* a feature from people who can *build* with it: assembly. Act One of The Lantern Maker is a script of nine cues. Running it touches nearly everything you have written:

- **Lesson 8, iterators.** \`ActOne()\` yields the script one cue at a time. The show runner never knows (or cares) whether the cues come from a list, a file or a generator.
- **Lessons 1 to 3, delegates and composition.** The show runner is handed \`micChain\`, the composed Gain, Gate and Limit stages, as a plain \`Func<int, int>\`. It does not know there are stages inside.
- **Lesson 5, events.** After a cue succeeds the show runner calls \`board.Fire(...)\`; \`OnHouse\` and \`onSound\` from lesson 5 listen, and the Event bus panel gets its next deliveries.
- **Lessons 11 to 14, async, cancellation and retries.** Each device call is an \`Operation<string>\`; \`Retry\` and \`Deadline\` wrap it; a two-second \`CancellationTokenSource\` is the whole-show cutoff.
- **Lesson 15, the breaker.** Each device gets its **own** \`CircuitBreaker\`, all reading your \`fakeNow\` clock.
- **Lesson 16, lifetimes.** The show runner borrows a spotlight with \`using Lease\` for the whole run and gives it back whatever happens.
- **Lesson 17, wiring.** A \`Container\` builds the show runner. The show runner's constructor asks for delegates and a few interfaces; the container supplies them.

Notice what the show runner does **not** do. It does not call \`Retry\`, \`Breaker\` or any local function (it cannot: a class declared below the divider cannot see a local function above it). It receives one delegate, \`playDevice\`, and calls it. Everything fragile lives behind that delegate. That is dependency inversion with delegates, and it is why you can change the resilience rules without touching \`ShowRunner\` at all.

### The order of the policies is a design decision

\`Guard\` builds each device's pipeline:

~~~csharp
Wrap<string>(device, Breaker<string>(circuit), Retry<string>(3, 3, new Random(7), deviceAttempts), Deadline<string>(40))
~~~

Read outer to inner: **Breaker, then Retry, then Deadline, then the device**. A caller meets the breaker first; if it is closed the call proceeds into a retry loop whose every attempt has its own 40 ms deadline. The breaker therefore sees one outcome per *cue*: either the cue worked (possibly after retries) or it failed after all attempts.

Swap the first two, putting Retry outside Breaker, and the world changes. Every individual attempt now passes through the breaker, so the two failed attempts of a single cue are enough to open it. Worse, a refused call (\`BrokenCircuitException\`) arrives at the retry loop, which does not know the difference and tries again, with pauses, against a door that is deliberately shut. On the nine-cue script this changes the report from \`6 fired, 2 failed, 1 skipped, 6 retries\` to \`5 fired, 0 failed, 4 skipped, 8 retries\`: the fog machine that should have recovered on its third try is cut off after two, and the retry count rises because rejections were retried. Nothing crashed. The program simply started making a different, worse decision, which is why order is worth writing a comment about.

### One breaker per device

\`rig\` creates a separate \`CircuitBreaker\` for lights, fog and fly. With one shared breaker, the fly bar's two failures would shut the door on the lights too, and the show would stop because one winch was jammed. Isolating failures per dependency is the same idea as the bulkhead: a fault should stay where it started. The cost is a few extra objects.

### How to read a run

When the report is not what you expected, do not guess. Read the evidence in the order the program produced it.

1. **Read the log lines top to bottom** and match each to a cue. Each line says what happened to one cue: \`house-down on lights at 30\`, \`curtain-up failed: fly fault on call 3\`, \`fly-out skipped: fly circuit open\`. The number in \`fly fault on call 3\` is the device's own call counter: cue 2 used calls 1 to 3 (three attempts), cue 6 used calls 4 to 6. That arithmetic alone confirms \`Retry\` ran three times per cue.
2. **Compare the counts with the lines.** Six "on" lines, two "failed", one "skipped" is the report. If the report says otherwise, one of the \`catch\` clauses is catching more or less than you meant.
3. **Check the policy list** in \`Guard\` before anything else when the numbers are off. Order is the usual culprit.
4. **Look at \`deviceAttempts\`.** Every retry decision is in there, including the waits. \`Retries\` in the report counts the entries whose \`WaitMs\` is above zero.
5. **Check what is shared.** The clock \`fakeNow\` never moves in this program, so once the fly breaker is open it stays open. That is why cue 8 is skipped instead of tried again.

### The report is built in two steps

\`ShowRunner\` knows how many cues fired, failed or were skipped and the loudest level it sent. It does not know how many retries happened (that lives in \`deviceAttempts\`, which the show runner never sees) or how many lamps are free. The caller adds those with a **\`with\` expression**, which copies a record and replaces named properties:

~~~csharp
report = report with { Retries = deviceAttempts.Count(attempt => attempt.WaitMs > 0), SpotsFree = showServices.Resolve<SpotPool>().Free };
~~~

\`ShowReport\` declares \`Retries\` and \`SpotsFree\` as optional parameters with default 0, so the show runner can build it without them. \`with\` is the only way to change them afterwards because positional record properties are \`init\`-only.

### Where to take it next

Everything here is a rehearsal-sized version of what a production system does. Natural next steps, all within reach of what you have:

- Advance \`fakeNow\` between cues so the fly breaker gets its half-open trial and the winch can recover mid-show.
- Add a \`Bulkhead\` per device so two cues can never hammer the same part at once.
- Send backstage calls through the lesson 13 channel and have the show runner consume them in order.
- Turn the script into an \`IAsyncEnumerable<ScriptCue>\` read lazily from a file.
- Write the same run against \`FakeClock\` and a recording log, and assert the report in a test.

### Common mistakes

- **Using a name from an earlier lesson before it exists in your file.** \`Console.WriteLine(fakeNow);\` without lesson 15's variable gives \`error CS0103: The name 'fakeNow' does not exist in the current context\`. This lesson reuses your earlier names exactly, so check them.
- **Giving the show runner the wrong delegate shape.** \`playDevice\` takes a cue and a token. A lambda with one parameter where two are expected fails with an error of the form \`error CS1593: Delegate 'Func<int, int, Task<string>>' does not take 1 arguments\`, naming the delegate type the lambda was meant to become.
- **Changing a record with assignment.** \`report.Retries = 5;\` gives \`error CS8852: Init-only property or indexer 'Report.Retries' can only be assigned in an object initializer, or on 'this' or 'base' in an instance constructor or an 'init' accessor.\` (the name before the dot is your own record's). Use \`with\`.
- **Catching too broadly.** If the general \`catch (Exception ex)\` handles everything, the open circuit is counted as a failure: \`fly-out failed: circuit open\` and the report becomes \`6 fired, 3 failed, 0 skipped\`. Catch \`BrokenCircuitException\` first.
- **An unknown device name.** \`rig["smoke"]\` throws \`KeyNotFoundException: The given key 'smoke' was not present in the dictionary.\`, and every cue then fails with that text.
- **Reusing a local name.** Two top-level variables with the same name give \`error CS0128: A local variable or function named 'total' is already defined in this scope\`; in a file this long it is easy to do.`,
      mission: md`It is opening night. House lights are at half, the audience is in, and Odile Marsh is at the desk with the cue sheet. For three weeks you have built the pieces one at a time: cues as values, a sound chain, an event bus, queries, async scene changes, a retry policy, a breaker, leased spotlights and a wiring container. Tonight they all run together, and the fly bar is still broken.

Run Act One. Nine cues go out through the dimmer chain; the fog machine needs two attempts, the fly bar fails every time and its breaker must trip rather than let the whole show hang, and the follow-spot is borrowed for the evening and returned at the final bow. When the lesson passes, the **Show report** lights up on the board: the finished desk, every system live.`,
      tasks: [
        "Under the divider declare record ScriptCue(int Number, string Name, int Level, string Device); record ShowReport(int Fired, int Failed, int Skipped, int PeakLevel, int Retries = 0, int SpotsFree = 0); and class ShowRunner. Its constructor takes Func<int, int> dimmer, Func<ScriptCue, CancellationToken, Task<string>> playDevice, CueBoard board, ILog log and SpotPool spots. Its public async Task<ShowReport> RunAsync(IEnumerable<ScriptCue> script, CancellationToken token) borrows a lease with using Lease spot = spots.Borrow(); and writes $\"{spot.Lamp} lent for the run\", then for each cue calls token.ThrowIfCancellationRequested(), computes level = dimmer(cue.Level) and, in a try, awaits playDevice(cue, token), calls board.Fire(cue.Number, cue.Name), writes $\"{cue.Name} on {cue.Device} at {level}\", raises the peak and counts a fired cue. catch (BrokenCircuitException) writes $\"{cue.Name} skipped: {cue.Device} circuit open\" and counts a skipped cue; catch (Exception ex) when (ex is not OperationCanceledException) writes $\"{cue.Name} failed: {ex.Message}\" and counts a failed one (the BrokenCircuitException catch comes first). It returns new ShowReport(fired, failed, skipped, peak)",
        "Above the divider write the iterator IEnumerable<ScriptCue> ActOne() that yields the nine cues listed in the starter, in that order. Write a local function Operation<string> Device(string name, Func<int, bool> failsOnCall): it keeps its own call counter and returns an async lambda that counts the call, awaits Task.Delay(2, token), throws InvalidOperationException($\"{name} fault on call {calls}\") when failsOnCall(calls) is true and otherwise returns $\"{name} ok\"",
        "Declare List<Attempt> deviceAttempts and a local function Operation<string> Guard(Operation<string> device, CircuitBreaker circuit) that returns Wrap<string>(device, Breaker<string>(circuit), Retry<string>(3, 3, new Random(7), deviceAttempts), Deadline<string>(40)) (breaker outermost). Build Dictionary<string, Operation<string>> rig with the keys \"lights\" (Device(\"lights\", n => false)), \"fog\" (Device(\"fog\", n => n <= 2)) and \"fly\" (Device(\"fly\", n => true)), each wrapped by Guard with its own new CircuitBreaker(2, 50, () => fakeNow)",
        "Create Container showServices and register: ILog as a singleton returning new ListLog(); SpotPool as a singleton returning new SpotPool(new List<string>()); CueBoard as a singleton that creates a board, subscribes your OnHouse and onSound handlers from lesson 5 and returns it; ShowRunner as a transient built from micChain, the lambda (cue, token) => rig[cue.Device](token), and the resolved CueBoard, ILog and SpotPool. Then write using CancellationTokenSource cutoff = new(TimeSpan.FromSeconds(2)); resolve the show runner, await runner.RunAsync(ActOne(), cutoff.Token) into ShowReport report, and set report = report with { Retries = deviceAttempts.Count(attempt => attempt.WaitMs > 0), SpotsFree = showServices.Resolve<SpotPool>().Free };",
        "Print $\"Show report: {report.Fired} fired, {report.Failed} failed, {report.Skipped} skipped, {report.Retries} retries, peak level {report.PeakLevel}, spots free {report.SpotsFree}\", then Desk.Show(\"bus\", new { log = busLog, listeners = showServices.Resolve<CueBoard>().Listeners }); and Desk.Show(\"show\", new { report, cues = ActOne().Select(cue => new { cue.Number, cue.Name, cue.Device }) });",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 18: run the show. Everything below uses pieces you already wrote; keep their names.
// 1. Below the divider declare ScriptCue, ShowReport and ShowRunner (see the task list).
// 2. IEnumerable<ScriptCue> ActOne() yielding, in this order (Number, Name, Level, Device):
//      1 "house-down" 20 "lights"      2 "curtain-up" 100 "fly"        3 "spot-on" 40 "lights"
//      4 "fog-in" 25 "fog"             5 "chase" 70 "lights"           6 "fly-in" 60 "fly"
//      7 "flash" 100 "lights"          8 "fly-out" 30 "fly"            9 "bows" 55 "lights"
// 3. Operation<string> Device(string name, Func<int, bool> failsOnCall)   (counter + async lambda)
//    List<Attempt> deviceAttempts = new();
//    Operation<string> Guard(Operation<string> device, CircuitBreaker circuit)  -> Wrap<string>(device, Breaker, Retry(3, 3, new Random(7), deviceAttempts), Deadline(40))
//    Dictionary<string, Operation<string>> rig = lights (never fails), fog (fails calls 1 and 2), fly (always fails), each with new CircuitBreaker(2, 50, () => fakeNow)
// 4. Container showServices: ILog, SpotPool, CueBoard (subscribe OnHouse and onSound), ShowRunner (transient)
//    using CancellationTokenSource cutoff = new(TimeSpan.FromSeconds(2));
//    ShowReport report = await runner.RunAsync(ActOne(), cutoff.Token);   then   report = report with { Retries = ..., SpotsFree = ... };
// 5. Print:  Show report: 6 fired, 2 failed, 1 skipped, 6 retries, peak level 90, spots free 2
//    Desk.Show("bus", new { log = busLog, listeners = showServices.Resolve<CueBoard>().Listeners });
//    Desk.Show("show", new { report, cues = ActOne().Select(cue => new { cue.Number, cue.Name, cue.Device }) });

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare ScriptCue, ShowReport and ShowRunner here.
`,
      solutionAdd: cs`// Lesson 18: run the show.
IEnumerable<ScriptCue> ActOne()
{
    yield return new(1, "house-down", 20, "lights");
    yield return new(2, "curtain-up", 100, "fly");
    yield return new(3, "spot-on", 40, "lights");
    yield return new(4, "fog-in", 25, "fog");
    yield return new(5, "chase", 70, "lights");
    yield return new(6, "fly-in", 60, "fly");
    yield return new(7, "flash", 100, "lights");
    yield return new(8, "fly-out", 30, "fly");
    yield return new(9, "bows", 55, "lights");
}

Operation<string> Device(string name, Func<int, bool> failsOnCall)
{
    int calls = 0;
    return async token =>
    {
        calls++;
        await Task.Delay(2, token);
        if (failsOnCall(calls))
        {
            throw new InvalidOperationException($"{name} fault on call {calls}");
        }
        return $"{name} ok";
    };
}

List<Attempt> deviceAttempts = new();

Operation<string> Guard(Operation<string> device, CircuitBreaker circuit)
{
    return Wrap<string>(device, Breaker<string>(circuit), Retry<string>(3, 3, new Random(7), deviceAttempts), Deadline<string>(40));
}

Dictionary<string, Operation<string>> rig = new()
{
    ["lights"] = Guard(Device("lights", n => false), new CircuitBreaker(2, 50, () => fakeNow)),
    ["fog"] = Guard(Device("fog", n => n <= 2), new CircuitBreaker(2, 50, () => fakeNow)),
    ["fly"] = Guard(Device("fly", n => true), new CircuitBreaker(2, 50, () => fakeNow)),
};

Container showServices = new();
showServices.AddSingleton<ILog>(c => new ListLog());
showServices.AddSingleton<SpotPool>(c => new SpotPool(new List<string>()));
showServices.AddSingleton<CueBoard>(c =>
{
    CueBoard showBoard = new();
    showBoard.CueFired += OnHouse;
    showBoard.CueFired += onSound;
    return showBoard;
});
showServices.AddTransient<ShowRunner>(c => new ShowRunner(
    micChain,
    (cue, token) => rig[cue.Device](token),
    c.Resolve<CueBoard>(),
    c.Resolve<ILog>(),
    c.Resolve<SpotPool>()));

using CancellationTokenSource cutoff = new(TimeSpan.FromSeconds(2));
ShowRunner runner = showServices.Resolve<ShowRunner>();
ShowReport report = await runner.RunAsync(ActOne(), cutoff.Token);
report = report with
{
    Retries = deviceAttempts.Count(attempt => attempt.WaitMs > 0),
    SpotsFree = showServices.Resolve<SpotPool>().Free,
};

Console.WriteLine($"Show report: {report.Fired} fired, {report.Failed} failed, {report.Skipped} skipped, {report.Retries} retries, peak level {report.PeakLevel}, spots free {report.SpotsFree}");

Desk.Show("bus", new { log = busLog, listeners = showServices.Resolve<CueBoard>().Listeners });
Desk.Show("show", new { report, cues = ActOne().Select(cue => new { cue.Number, cue.Name, cue.Device }) });

${TYPES_DIVIDER}

record ScriptCue(int Number, string Name, int Level, string Device);

record ShowReport(int Fired, int Failed, int Skipped, int PeakLevel, int Retries = 0, int SpotsFree = 0);

class ShowRunner
{
    readonly Func<int, int> dimmer;
    readonly Func<ScriptCue, CancellationToken, Task<string>> playDevice;
    readonly CueBoard board;
    readonly ILog log;
    readonly SpotPool spots;

    public ShowRunner(
        Func<int, int> dimmer,
        Func<ScriptCue, CancellationToken, Task<string>> playDevice,
        CueBoard board,
        ILog log,
        SpotPool spots)
    {
        this.dimmer = dimmer;
        this.playDevice = playDevice;
        this.board = board;
        this.log = log;
        this.spots = spots;
    }

    public async Task<ShowReport> RunAsync(IEnumerable<ScriptCue> script, CancellationToken token)
    {
        int fired = 0;
        int failed = 0;
        int skipped = 0;
        int peak = 0;
        using Lease spot = spots.Borrow();
        log.Write($"{spot.Lamp} lent for the run");

        foreach (ScriptCue cue in script)
        {
            token.ThrowIfCancellationRequested();
            int level = dimmer(cue.Level);
            try
            {
                await playDevice(cue, token);
                board.Fire(cue.Number, cue.Name);
                log.Write($"{cue.Name} on {cue.Device} at {level}");
                peak = Math.Max(peak, level);
                fired++;
            }
            catch (BrokenCircuitException)
            {
                log.Write($"{cue.Name} skipped: {cue.Device} circuit open");
                skipped++;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                log.Write($"{cue.Name} failed: {ex.Message}");
                failed++;
            }
        }
        return new ShowReport(fired, failed, skipped, peak);
    }
}`,
      explanation:
        "ShowRunner depends only on delegates and interfaces, so the container can hand it micChain, a lambda that looks up the cue's device pipeline, the shared CueBoard, a ListLog and the SpotPool; all the fragile behaviour sits behind playDevice. Each device pipeline is Breaker outside Retry outside Deadline, so the breaker sees one result per cue. Lights never fail (cues 1, 3, 5, 7, 9 fire). Fog fails calls 1 and 2 and succeeds on the third attempt of cue 4, which fires after two retries. Fly fails every attempt: cue 2 uses calls 1 to 3, fails and counts one breaker failure, cue 6 (calls 4 to 6) is the second failure and opens the breaker, and because fakeNow never advances, cue 8 is rejected with BrokenCircuitException and counted as skipped. That is 6 fired, 2 failed, 1 skipped; the three retried cues each waited twice, so 6 retries. The dimmer chain caps levels at 90, so the peak is 90, and the using Lease returns the spotlight when RunAsync ends, leaving 2 free. The two shown payloads feed the Event bus (the 3 deliveries from lesson 5 plus 2 per fired cue) and the Show report.",
      hints: [
        { id: "h1", title: "Build it in layers", content: "Get ShowRunner compiling first (types section), then ActOne and Device, then Guard and rig, then the container. Run after each layer: the log lines tell you which layer is wrong. The show runner never calls Retry or Breaker itself; it only calls playDevice." },
        { id: "h2", title: "The shape of the pipeline", content: "Operation<string> Guard(Operation<string> device, CircuitBreaker circuit) { return Wrap<string>(device, Breaker<string>(circuit), Retry<string>(3, 3, new Random(7), deviceAttempts), Deadline<string>(40)); } The first policy in the list is the outermost, so the breaker comes first. Each rig entry is Guard(Device(...), new CircuitBreaker(2, 50, () => fakeNow))." },
        { id: "h3", title: "Container and report", content: "showServices.AddTransient<ShowRunner>(c => new ShowRunner(micChain, (cue, token) => rig[cue.Device](token), c.Resolve<CueBoard>(), c.Resolve<ILog>(), c.Resolve<SpotPool>())); For the board: showServices.AddSingleton<CueBoard>(c => { CueBoard showBoard = new(); showBoard.CueFired += OnHouse; showBoard.CueFired += onSound; return showBoard; }); Catch BrokenCircuitException before the general catch inside RunAsync." },
      ],
      tests: [
        {
          id: "t1",
          description: "the show report line matches the run",
          assertionCode: js`
assert(lines.includes("Show report: 6 fired, 2 failed, 1 skipped, 6 retries, peak level 90, spots free 2"), 'No line is exactly "Show report: 6 fired, 2 failed, 1 skipped, 6 retries, peak level 90, spots free 2". Lights fire 5 cues and fog 1 (after 2 retries); the fly bar fails 2 cues (3 attempts each, so 2 retries each) and its breaker then rejects the third; policy order matters: Breaker outermost, then Retry, then Deadline.');`,
        },
        {
          id: "t2",
          description: "the log shows each cue's fate, in script order",
          assertionCode: js`
const want = [
  "  log: Spot A lent for the run",
  "  log: house-down on lights at 30",
  "  log: curtain-up failed: fly fault on call 3",
  "  log: spot-on on lights at 60",
  "  log: fog-in on fog at 37",
  "  log: chase on lights at 90",
  "  log: fly-in failed: fly fault on call 6",
  "  log: flash on lights at 90",
  "  log: fly-out skipped: fly circuit open",
  "  log: bows on lights at 82",
];
const at = want.map((w) => lines.indexOf(w));
const missing = want.filter((w, i) => at[i] < 0);
assert(missing.length === 0, "Missing log line: " + missing[0] + ". Each line is written by ShowRunner through ILog (ListLog adds the two leading spaces and 'log: '). 'fly fault on call 3' means three attempts were made; the open circuit must be caught with its own catch before the general one.");
assert(at.every((v, i) => i === 0 || v > at[i - 1]), "The log lines are all there but in a different order. Cues must run one after another, in script order.");`,
        },
        {
          id: "t3",
          description: "the report reaches the board with retries and free spotlights added by with",
          assertionCode: js`
const r = scene.show?.report;
assert(r && typeof r === "object", "Send the report with Desk.Show(\"show\", new { report, cues = ... });");
assertEqual([r.fired, r.failed, r.skipped], [6, 2, 1], "report.fired / failed / skipped: 5 lights cues plus the fog cue fire, two fly cues fail after their retries, and the third fly cue is rejected by the open breaker");
assertEqual(r.peakLevel, 90, "report.peakLevel: micChain limits every level to 90");
assertEqual(r.retries, 6, "report.retries: count the Attempt entries in deviceAttempts whose WaitMs is above 0 (fog waited twice, each failed fly cue twice) and add it with a with expression");
assertEqual(r.spotsFree, 2, "report.spotsFree: the lease is returned when RunAsync ends, so both spotlights are free");`,
        },
        {
          id: "t4",
          description: "the script is sent to the board in order",
          assertionCode: js`
const cues = scene.show?.cues;
assert(Array.isArray(cues) && cues.length === 9, "scene.show.cues should list the nine script cues. Send ActOne().Select(cue => new { cue.Number, cue.Name, cue.Device }).");
assertEqual(cues.map((c) => c.name), ["house-down", "curtain-up", "spot-on", "fog-in", "chase", "fly-in", "flash", "fly-out", "bows"], "cue names, in script order");
assertEqual(cues.map((c) => c.device), ["lights", "fly", "lights", "fog", "lights", "fly", "lights", "fly", "lights"], "cue devices, in script order");`,
        },
        {
          id: "t5",
          description: "fired cues travel the event bus to both subscribers",
          assertionCode: js`
const bus = scene.bus;
assert(bus && Array.isArray(bus.log), "Send the bus again after the show: Desk.Show(\"bus\", new { log = busLog, listeners = showServices.Resolve<CueBoard>().Listeners });");
assertEqual(bus.listeners, 2, "bus.listeners: the show's CueBoard has OnHouse and onSound attached");
assertEqual(bus.log.length, 15, "bus.log should hold the 3 deliveries from lesson 5 plus 2 per fired cue (6 cues, HouseLights and SoundDesk each)");
const fromShow = bus.log.slice(3);
assertEqual(fromShow.filter((d) => d.payload === "bows").length, 2, "the last fired cue, bows, should be delivered to both subscribers");
assert(!fromShow.some((d) => d.payload === "fly-in" || d.payload === "fly-out" || d.payload === "curtain-up"), "A cue that failed or was skipped must not fire the event: call board.Fire only after playDevice succeeded.");`,
        },
        {
          id: "t6",
          description: "the show runner borrows a spotlight for the run and returns it",
          assertionCode: js`
assert(lines.includes("  log: Spot A lent for the run"), 'No line is exactly "  log: Spot A lent for the run". Borrow with using Lease spot = spots.Borrow(); at the top of RunAsync and write $"{spot.Lamp} lent for the run".');
assertEqual(scene.show?.report?.spotsFree, 2, "The using declaration returns the lease when RunAsync finishes, so both spotlights are free in the final report");`,
        },
      ],
      unlocks: ["fl-show"],
      checks: [
        {
          prompt: "In `Guard`, `Breaker` is listed before `Retry`. What would change if `Retry` were listed first (outside the breaker)?",
          question: {
            type: "choice",
            options: [
              "Each attempt would pass through the breaker separately, so it trips sooner, and refused calls would be retried too",
              "Nothing: the order of policies never matters",
              "The code would not compile",
              "The retries would run in parallel instead of one after another",
            ],
            answer: 0,
          },
          explanation: "The first policy in the list is the outermost. With Retry outside, the breaker counts every failed attempt rather than one result per cue, and a BrokenCircuitException is just another failure to the retry loop, which waits and asks the closed door again. On this script that turns 6 fired, 2 failed, 1 skipped into 5 fired, 0 failed, 4 skipped.",
        },
        {
          prompt: "`ShowRunner` never calls `Retry`, `Breaker` or any local function. Why is that a good design?",
          question: {
            type: "choice",
            options: [
              "It depends only on a delegate (playDevice), so the resilience rules can change, or be faked in a test, without editing the show runner",
              "Because a class declared below the divider is not allowed to call methods",
              "Because delegates are faster than ordinary method calls",
              "It is not a good design; the show runner should build its own pipelines",
            ],
            answer: 0,
          },
          explanation: "The show runner states what it needs (play this cue's device) and nothing about how reliability is achieved. That is dependency inversion done with a delegate. It also happens to be impossible for it to see local functions, but the design reason is the real one: one class, one job.",
        },
        {
          prompt: "The fly bar's third cue is `skipped`, not `failed`. What keeps the show from calling the fly device again?",
          question: {
            type: "choice",
            options: [
              "Its circuit breaker is open and fakeNow never advances, so every call is refused before reaching the device",
              "Retry has run out of attempts for the whole show",
              "The Deadline policy cancels the cue after 40 ms",
              "The ShowRunner removes failed devices from the rig dictionary",
            ],
            answer: 0,
          },
          explanation: "Two cue-level failures reach the threshold of 2, so the fly breaker opens. It reopens for a trial only after the clock has moved 50 ticks, and nothing moves fakeNow in this program. The refusal is a BrokenCircuitException, which the show runner counts as skipped.",
        },
      ],
    },
];
