import type { Chapter } from "@/engine/types";
import { TYPES_DIVIDER } from "../../../engine/compose.ts";
import { cs, js, md } from "./util.ts";

export const chapter3: Chapter = {
  id: "sequences",
  title: "Sequences and queries",
  blurb: "Produce values lazily, build your own query operators, and write tidier code.",
  lessons: [
    // ───────────────────────── 8 ─────────────────────────
    {
      id: "csharp-delegates-8-iterators",
      title: "Write your own iterators",
      minutes: 35,
      xp: 190,
      concepts: ["IEnumerable<T>", "IEnumerator<T>", "yield return", "yield break", "lazy evaluation", "infinite sequences", "multiple enumeration"],
      learn: md`### A loop that asks for one value at a time

Every \`foreach\` you have written leans on a tiny contract. The thing you loop over must be able to hand you an **enumerator**, and the enumerator answers two questions: *is there another value?* (\`MoveNext()\`) and *what is it?* (\`Current\`). The compiler rewrites your loop into exactly that conversation:

~~~csharp
IEnumerable<string> cues = new List<string> { "house-down", "curtain-up" };

using (IEnumerator<string> e = cues.GetEnumerator())
{
    while (e.MoveNext())
    {
        string cue = e.Current;
        Console.WriteLine(cue);
    }
}
~~~

The loop never needs to know whether the values sit in a list, come from a file or are worked out on the spot. It only asks, one value at a time. That is the idea you are about to exploit.

### Why not just return a list?

Suppose Odile wants the dimmer ramp for a slow fade: a hundred intermediate levels between the old look and the new one. The obvious method builds a \`List<int>\`, fills it and returns it. That has three costs. The caller waits until **every** step exists before seeing the first. The whole ramp sits in memory at once. And if the caller only wanted the first ten steps, the other ninety were computed for nothing. For a sequence with no natural end (a pulse that blinks forever) a list is simply impossible.

An **iterator** is a method that produces its values one at a time, only when someone asks.

### yield return: the compiler writes the enumerator for you

A method whose return type is \`IEnumerable<T>\` (or \`IEnumerator<T>\`) and whose body contains \`yield return\` is an iterator:

~~~csharp
IEnumerable<int> FadeSteps(int fromLevel, int toLevel, int steps)
{
    for (int step = 0; step <= steps; step++)
    {
        yield return fromLevel + (toLevel - fromLevel) * step / steps;
    }
}

Console.WriteLine(string.Join(", ", FadeSteps(0, 100, 4)));   // 0, 25, 50, 75, 100
~~~

Here is the mental model worth keeping. The compiler turns your method into a small hidden class with a \`state\` number and one field for every local variable (here \`step\`, \`fromLevel\`, \`toLevel\`, \`steps\`). Its \`MoveNext\` is a big switch that jumps to wherever the last \`yield return\` stopped, runs until the next one, stores the value in \`Current\` and returns \`true\`. When the body finishes, \`MoveNext\` returns \`false\`.

Two consequences follow immediately:

1. **Calling the method runs none of its body.** \`FadeSteps(0, 100, 4)\` just builds the hidden object and hands it back. The first line of your code runs on the first \`MoveNext()\`.
2. **The method pauses mid-flight.** Locals keep their values between values handed out. The \`for\` loop above is resumed, not restarted.

### Watching laziness happen

Print from inside an iterator and the order of events gives it away:

~~~csharp
IEnumerable<string> CueStack()
{
    Console.WriteLine("  loading cue 1");
    yield return "house-down";
    Console.WriteLine("  loading cue 2");
    yield return "curtain-up";
    Console.WriteLine("  loading cue 3");
    yield return "spot-on";
}

IEnumerable<string> stack = CueStack();
Console.WriteLine("stack created, nothing loaded yet");
foreach (string next in stack)
{
    Console.WriteLine($"running {next}");
    if (next == "curtain-up") break;
}
~~~

The output interleaves producer and consumer:

~~~text
stack created, nothing loaded yet
  loading cue 1
running house-down
  loading cue 2
running curtain-up
~~~

Cue 3 is **never loaded**, because the loop stopped asking. Work that nobody requests is never done. If the iterator holds something that needs cleaning up, put it in \`try/finally\`: leaving a \`foreach\` early disposes the enumerator, and that runs the \`finally\` block, so the cleanup still happens.

### Infinite sequences, and who has to stop

An iterator may legitimately never finish:

~~~csharp
IEnumerable<int> Pulse()
{
    int level = 0;
    while (true)
    {
        yield return level;
        level = level == 0 ? 100 : 0;
    }
}

int[] firstSix = Pulse().Take(6).ToArray();   // 0 100 0 100 0 100
~~~

The producer has no opinion about how many values are wanted; the **consumer** decides. \`Take(6)\` asks six times and stops. \`Pulse().ToList()\` would ask forever, because \`ToList\` only stops when the sequence ends. Whenever you write an infinite iterator, remember that something downstream must be bounded.

### yield break

\`yield break\` ends the sequence early, like a \`return\` with no value:

~~~csharp
IEnumerable<string> Countdown(int start)
{
    if (start < 1)
    {
        yield break;          // an empty sequence
    }
    for (int n = start; n >= 1; n--)
    {
        yield return $"T-{n}";
    }
    yield return "go";
}
~~~

\`Countdown(3)\` gives \`T-3 T-2 T-1 go\`; \`Countdown(0)\` gives nothing at all.

### Every enumeration starts again

An iterator method result is a *recipe*, not a stored result. Each \`foreach\` over it creates a fresh run:

~~~csharp
IEnumerable<int> Two()
{
    Console.WriteLine("go");
    yield return 1;
    yield return 2;
}

var seq = Two();
foreach (var a in seq) { }
foreach (var b in seq) { }    // prints "go" twice in total
~~~

For cheap, pure producers that is harmless. If the body queries a service, reads a file or has side effects, enumerating twice does that work twice. When you need the values more than once, call \`ToList()\` once and keep the list.

### Common mistakes

- **Wrong return type.** An iterator must return \`IEnumerable<T>\`, \`IEnumerator<T>\` or their non-generic cousins. Writing \`int Count(int n) { yield return n; }\` gives \`error CS1624: The body of 'Count(int)' cannot be an iterator block because 'int' is not an iterator interface type\`.
- **Returning a value.** Once a method contains \`yield\`, a plain \`return value;\` is illegal: \`error CS1622: Cannot return a value from an iterator. Use the yield return statement to return a value, or yield break to end the iteration.\` Use \`yield return\` for values and \`yield break\` to stop.
- **\`yield return\` inside \`try\` with a \`catch\`.** \`error CS1626: Cannot yield a value in the body of a try block with a catch clause\`. A \`try/finally\` is allowed; catch the failure around the loop that consumes the sequence instead.
- **\`ref\`, \`in\` or \`out\` parameters.** \`error CS1623: Iterators cannot have ref, in or out parameters\`. The parameters become fields of the hidden class, and a field cannot be a reference to someone else's local.
- **Changing the collection you are looping over.** An iterator over a \`List<T>\` that someone adds to mid-loop fails at run time with \`InvalidOperationException: Collection was modified; enumeration operation may not execute.\` Finish the loop, then change the list.
- **Expecting the body to have run.** "I called the method and nothing printed" is the iterator doing its job. The body runs when something enumerates.`,
      mission: md`Odile Marsh, the stage manager, has asked for something the desk cannot do yet: a slow fade from darkness to full light that she can watch step by step, and a cue stack that loads each cue only when she is ready for it. Building the whole fade up front wastes time, and the cue stack must never load cue 3 if the show is held at cue 2.

You will write both as iterators, plus an endless pulse for the work lights that Tobias can sample as many times as he likes. When this lesson passes, the **Fade steps** panel lights up and draws your staircase, with the cues that were loaded and the ones that never were.`,
      tasks: [
        "Write a local function IEnumerable<int> FadeSteps(int fromLevel, int toLevel, int steps) that loops step from 0 to steps (inclusive) and does yield return fromLevel + (toLevel - fromLevel) * step / steps. Store FadeSteps(0, 100, 4).ToArray() in an int[] named fadeUp and print fade 0 -> 100: 0, 25, 50, 75, 100 (values joined with \", \")",
        "Declare List<string> trace = new(); and a local function void Note(string text) that adds text to trace and prints it with two leading spaces",
        "Write an iterator local function IEnumerable<string> CueStack() that calls Note(\"loading cue 1\") before yielding \"house-down\", Note(\"loading cue 2\") before \"curtain-up\", Note(\"loading cue 3\") before \"spot-on\", and Note(\"stack finished\") at the end. Create IEnumerable<string> stack = CueStack();, print stack created, nothing loaded yet, then foreach (string next in stack): call Note($\"running {next}\") and break once next is \"curtain-up\"",
        "Write an infinite iterator IEnumerable<int> Pulse() that yields 0, 100, 0, 100 and so on. Store Pulse().Take(6).ToArray() in int[] pulse and print pulse: 0 100 0 100 0 100 (joined with a single space)",
        "Send it all to the board with Desk.Show(\"iter\", new { fade = fadeUp, trace, pulse });",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 8: write your own iterators.
// 1. IEnumerable<int> FadeSteps(int fromLevel, int toLevel, int steps)   (a local function)
//      for step 0..steps (inclusive):  yield return fromLevel + (toLevel - fromLevel) * step / steps;
//    int[] fadeUp = FadeSteps(0, 100, 4).ToArray();   print:  fade 0 -> 100: 0, 25, 50, 75, 100
// 2. List<string> trace = new();   and a local function  void Note(string text)
//      it adds text to trace AND prints  "  " + text   (two leading spaces)
// 3. IEnumerable<string> CueStack()   (an iterator)
//      Note("loading cue 1"); yield return "house-down";
//      Note("loading cue 2"); yield return "curtain-up";
//      Note("loading cue 3"); yield return "spot-on";
//      Note("stack finished");
//    IEnumerable<string> stack = CueStack();
//    print:  stack created, nothing loaded yet
//    foreach (string next in stack) { Note($"running {next}"); stop (break) after "curtain-up" }
// 4. IEnumerable<int> Pulse()   an infinite iterator: 0, 100, 0, 100, ...
//    int[] pulse = Pulse().Take(6).ToArray();   print:  pulse: 0 100 0 100 0 100
// 5. Desk.Show("iter", new { fade = fadeUp, trace, pulse });`,
      solutionAdd: cs`// Lesson 8: your own iterators.
IEnumerable<int> FadeSteps(int fromLevel, int toLevel, int steps)
{
    for (int step = 0; step <= steps; step++)
    {
        yield return fromLevel + (toLevel - fromLevel) * step / steps;
    }
}

int[] fadeUp = FadeSteps(0, 100, 4).ToArray();
Console.WriteLine("fade 0 -> 100: " + string.Join(", ", fadeUp));

List<string> trace = new();
void Note(string text)
{
    trace.Add(text);
    Console.WriteLine("  " + text);
}

IEnumerable<string> CueStack()
{
    Note("loading cue 1");
    yield return "house-down";
    Note("loading cue 2");
    yield return "curtain-up";
    Note("loading cue 3");
    yield return "spot-on";
    Note("stack finished");
}

IEnumerable<string> stack = CueStack();
Console.WriteLine("stack created, nothing loaded yet");
foreach (string next in stack)
{
    Note($"running {next}");
    if (next == "curtain-up")
    {
        break;
    }
}

IEnumerable<int> Pulse()
{
    int level = 0;
    while (true)
    {
        yield return level;
        level = level == 0 ? 100 : 0;
    }
}

int[] pulse = Pulse().Take(6).ToArray();
Console.WriteLine("pulse: " + string.Join(" ", pulse));

Desk.Show("iter", new { fade = fadeUp, trace, pulse });`,
      explanation:
        "FadeSteps and Pulse are iterators: calling them builds a hidden enumerator, and their loops are resumed each time the consumer asks for the next value. That is why 'stack created, nothing loaded yet' prints before 'loading cue 1', why the trace interleaves loading and running, and why cue 3 is never loaded: the foreach stops asking after curtain-up, so the iterator is never resumed. Pulse never ends on its own, so Take(6) is what bounds it; ToArray over Pulse itself would never return. The integer arithmetic in FadeSteps multiplies before dividing so 25 comes out exactly instead of a truncated 0.",
      hints: [
        { id: "h1", title: "What is an iterator?", content: "An iterator is a method whose return type is IEnumerable<T> and whose body uses yield return instead of building and returning a list. Each yield return hands one value to whoever is looping and pauses the method right there." },
        { id: "h2", title: "Shape of the pieces", content: "FadeSteps is a for loop with one yield return inside. CueStack alternates Note(...) and yield return ..., with a last Note(\"stack finished\") after the final yield. Pulse is a while (true) loop that yields a level and then flips it between 0 and 100. Consume the stack with foreach and break; consume Pulse with Take(6)." },
        { id: "h3", title: "Near-solution", content: "IEnumerable<int> FadeSteps(int fromLevel, int toLevel, int steps) { for (int step = 0; step <= steps; step++) { yield return fromLevel + (toLevel - fromLevel) * step / steps; } }   IEnumerable<int> Pulse() { int level = 0; while (true) { yield return level; level = level == 0 ? 100 : 0; } }   For the trace, Note adds to the list and prints \"  \" + text; remember the running line comes from the foreach body, not from CueStack." },
      ],
      tests: [
        {
          id: "t1",
          description: "FadeSteps produces the five levels of a 0 to 100 fade",
          assertionCode: js`assert(lines.includes("fade 0 -> 100: 0, 25, 50, 75, 100"), 'No line is exactly "fade 0 -> 100: 0, 25, 50, 75, 100". Write FadeSteps as an iterator (yield return fromLevel + (toLevel - fromLevel) * step / steps for step 0..steps) and print string.Join(", ", fadeUp) after "fade 0 -> 100: ".');`,
        },
        {
          id: "t2",
          description: "calling the iterator runs nothing: the stack loads only when the loop asks",
          assertionCode: js`
const created = lines.findIndex((l) => l.trim() === "stack created, nothing loaded yet");
const first = lines.findIndex((l) => l.trim() === "loading cue 1");
assert(created >= 0, 'Print "stack created, nothing loaded yet" right after IEnumerable<string> stack = CueStack();');
assert(first >= 0, "Nothing says loading cue 1. CueStack should call Note(\"loading cue 1\") before yielding house-down, and the foreach must enumerate it.");
assert(created < first, "loading cue 1 appeared before the stack was even enumerated. Make sure CueStack is an iterator (it uses yield return) and that nothing calls it before the foreach.");`,
        },
        {
          id: "t3",
          description: "the foreach stops early, so cue 3 is never loaded",
          assertionCode: js`
assertEqual(scene.iter && scene.iter.trace, ["loading cue 1", "running house-down", "loading cue 2", "running curtain-up"], "iter.trace should interleave the producer and the consumer and stop after running curtain-up");
assert(!lines.some((l) => l.trim() === "loading cue 3"), "loading cue 3 was printed, but the loop should break after curtain-up, before the iterator is resumed.");
assert(!lines.some((l) => l.trim() === "stack finished"), "stack finished was printed. Breaking out of the foreach means the iterator never reaches its last statement.");`,
        },
        {
          id: "t4",
          description: "an infinite Pulse iterator is bounded by Take",
          assertionCode: js`
assert(lines.includes("pulse: 0 100 0 100 0 100"), 'No line is exactly "pulse: 0 100 0 100 0 100". Pulse is infinite: use Pulse().Take(6).ToArray() and join the values with a single space.');
assertEqual(scene.iter && scene.iter.pulse, [0, 100, 0, 100, 0, 100], "iter.pulse");`,
        },
        {
          id: "t5",
          description: "the board receives the fade steps",
          assertionCode: js`
assert(scene.iter && typeof scene.iter === "object", 'Send the results with Desk.Show("iter", new { fade = fadeUp, trace, pulse });');
assertEqual(scene.iter.fade, [0, 25, 50, 75, 100], "iter.fade");`,
        },
      ],
      unlocks: ["fl-iter"],
      checks: [
        {
          prompt: "This iterator prints \"start\" and then yields 1:\n\n~~~csharp\nIEnumerable<int> Numbers()\n{\n    Console.WriteLine(\"start\");\n    yield return 1;\n}\n\nvar n = Numbers();\n~~~\n\nNothing else is written. What does the program print?",
          question: {
            type: "choice",
            options: ["Nothing", "start", "start, then 1", "It does not compile because the result is unused"],
            answer: 0,
          },
          explanation: "Calling an iterator method only builds the hidden enumerator. The body, including the first `Console.WriteLine`, runs when something calls `MoveNext()`, for example a `foreach` or `ToList()`.",
        },
        {
          prompt: "Using the iterator below, how many times is \"go\" printed in total?\n\n~~~csharp\nIEnumerable<int> Two()\n{\n    Console.WriteLine(\"go\");\n    yield return 1;\n    yield return 2;\n}\n\nvar seq = Two();\nforeach (var a in seq) { }\nforeach (var b in seq) { }\n~~~",
          question: { type: "number", answer: 2 },
          explanation: "`seq` is a recipe, not a stored list. Each `foreach` asks for a fresh enumerator, so the body starts from the top both times. Call `ToList()` once if you want to reuse the values.",
        },
        {
          prompt: "Why is `Pulse().Take(6)` safe while `Pulse().ToList()` is not?",
          question: {
            type: "choice",
            options: [
              "`Take(6)` stops asking after six values; `ToList()` keeps asking until the sequence ends, and Pulse never ends",
              "`Take` copies the values into an array first",
              "`ToList` is not allowed on iterators",
              "`Pulse` throws an exception after six values",
            ],
            answer: 0,
          },
          explanation: "The producer never decides how much is enough. A bounded consumer (`Take`, `First`, a `break`) ends the conversation. An unbounded consumer such as `ToList` waits for an end that never comes.",
        },
      ],
    },
    // ───────────────────────── 9 ─────────────────────────
    {
      id: "csharp-delegates-9-linq",
      title: "How LINQ works",
      minutes: 40,
      xp: 220,
      concepts: ["extension methods", "deferred execution", "pull pipelines", "streaming", "Keep / Shape / Batch", "multiple enumeration", "closures in queries"],
      learn: md`### LINQ has no magic

When you write \`levels.Where(x => x > 50).Select(x => x * 2)\` you are calling ordinary static methods that take an \`IEnumerable<T>\` and return a new one. They are iterators, exactly like the ones from the last lesson, wearing a \`this\` parameter so they can be written with dot syntax. Once you have built one yourself the whole library stops being mysterious, and its few sharp edges become predictable.

To stay clear of the built-in names, ours are called **Keep** (the filter), **Shape** (the projection), **Batch** (cut into pages) and **Tap** (peek at each item as it passes). Here is Keep, complete:

~~~csharp
static class CueQuery
{
    public static IEnumerable<T> Keep<T>(this IEnumerable<T> source, Func<T, bool> test)
    {
        foreach (T item in source)
        {
            if (test(item))
            {
                yield return item;
            }
        }
    }
}
~~~

Five ingredients: a **static, non-generic class**; a **static method**; a first parameter marked \`this\`, which is what makes it an extension; a generic parameter \`T\` the compiler infers from the receiver; and a delegate parameter (\`Func<T, bool>\`) that carries the caller's logic in. Lessons 1 to 3 supplied that last ingredient: the filter rule is just a value you pass in.

### A pipeline pulls, it does not push

Chain three operators and the picture to keep in mind is a row of people passing nothing until the last one asks:

~~~csharp
IEnumerable<string> brightCues = rehearsal
    .Tap(entry => pulled++)
    .Keep(entry => entry.Level >= 50)
    .Shape(entry => entry.Cue);
~~~

Building this runs **no** operator body. The variable holds a chain of four hidden enumerators, each wrapping the one before. Work begins when a consumer calls \`MoveNext()\` on the outermost one:

1. \`Shape\` asks \`Keep\` for an item. \`Keep\` asks \`Tap\`. \`Tap\` asks the list.
2. The list hands over entry 1 (level 20). \`Tap\` counts it and passes it up. \`Keep\` tests it, rejects it and asks again.
3. Entry 2 (level 100) is accepted. \`Shape\` maps it to \`"curtain-up"\` and hands it to the consumer.

The consumer saw one value and the source was touched **twice**. Nothing was copied, nothing was stored, and no operator ever held more than one item. That is **streaming**: constant memory however long the source is, and early exit for free.

### Deferred or immediate?

Every operator falls in one of two camps:

- **Deferred** operators return \`IEnumerable<T>\`: \`Keep\`, \`Shape\`, \`Batch\`, \`Tap\`. Calling them only extends the pipeline.
- **Immediate** operators return a value or a collection: \`ToArray\`, \`ToList\`, \`First\`, \`Count\`, \`Sum\`, and a \`foreach\` loop. Calling them drives the pipeline.

So nothing in a query runs until something at the end of the chain consumes it, and \`First()\` consumes just enough to find one answer. In this lesson's rehearsal log, one full pass pulls 7 entries but \`First()\` pulls only 2.

### The query reads the world when it runs

Because the work is postponed, anything the lambdas capture is read **at run time**, not when you wrote the query. This is lesson 2's closure rule showing up again:

~~~csharp
int threshold = 50;
var bright = rehearsal.Where(e => e.Level >= threshold);
threshold = 80;
Console.WriteLine(bright.Count());    // counts with 80, not 50
~~~

With the seven-entry log used here that prints \`3\`. A query is a description of work, evaluated against the data and variables as they are at the moment you finally enumerate it.

### Writing Batch, and a trap that bites

\`Batch\` cuts a sequence into pages of a given size. Its job is to collect items into a list and hand the list out when it is full:

~~~csharp
public static IEnumerable<List<T>> Batch<T>(this IEnumerable<T> source, int size)
{
    List<T> page = new(size);
    foreach (T item in source)
    {
        page.Add(item);
        if (page.Count == size)
        {
            yield return page;
            page = new List<T>(size);      // a NEW list, not page.Clear()
        }
    }
    if (page.Count > 0)
    {
        yield return page;                 // the short last page
    }
}
~~~

The commented line matters. If you called \`page.Clear()\` and kept filling the same list, every page the consumer collected would be that one object, emptied behind their back. Collecting four numbers in pages of two with the \`Clear()\` version and printing each page's size gives \`0 | 0\`. Hand out a list, then let go of it. The last \`if\` is the usual "leftover" step: 7 items in pages of 3 leave a final page of 1.

### Enumerating twice does everything twice

A query variable is a recipe. If the source is expensive, or the lambdas have side effects, then \`foreach\` over it twice, or \`Count()\` followed by \`ToList()\`, runs the pipeline twice. Count your passes. When you need the answers more than once, materialise once with \`ToList()\` or \`ToArray()\` and use that.

### Common mistakes

- **Forgetting \`this\`, or putting the method in a non-static class.** The call site then reports \`error CS1061: 'List<int>' does not contain a definition for 'Keep' and no accessible extension method 'Keep' accepting a first argument of type 'List<int>' could be found (are you missing a using directive or an assembly reference?)\`. A class that declares an extension method without being \`static\` fails earlier with \`error CS1106: Extension method must be defined in a non-generic static class\`.
- **Making the compiler guess a type it cannot.** \`items.Shape(x => null)\` has no type to infer for \`TResult\`: \`error CS0411: The type arguments for method 'CueQuery.Shape<T, TResult>(IEnumerable<T>, Func<T, TResult>)' cannot be inferred from the usage. Try specifying the type arguments explicitly.\` Say what you mean: \`Shape<int, string>(x => ...)\` or return a real value.
- **Calling \`First()\` on something that might be empty.** It throws \`InvalidOperationException: Sequence contains no elements\`.
- **Counting passes wrongly.** A \`Tap\` counter that reads 14 instead of 7 means the query was enumerated twice.
- **Reusing the page list in Batch** (see above): consumers end up with empty or identical pages.`,
      mission: md`Tonight's run is long, and Odile wants to look at the rehearsal log in a useful way: which cues were bright, as a clean list of names, in pages of two so they fit on the prompt-book sheet. You could do it with the built-in query methods, but the producer, Tobias and Wen all keep asking "does it really read the whole log?" This lesson answers that by building the operators yourself and counting what they pull.

When this lesson passes, the **Query bench** panel shows your pipeline as a funnel: seven entries in, how many were pulled at each stage, the four bright cues, and the pages they were batched into.`,
      tasks: [
        "Under the divider declare record LogEntry(int Number, string Cue, int Level); and a static class CueQuery with four extension methods (each an iterator): Keep<T>(this IEnumerable<T> source, Func<T, bool> test), Shape<T, TResult>(this IEnumerable<T> source, Func<T, TResult> map), Batch<T>(this IEnumerable<T> source, int size) returning IEnumerable<List<T>> (a short last page is allowed; start a NEW list after each full page) and Tap<T>(this IEnumerable<T> source, Action<T> look) which calls look(item) and then yields the item",
        "Above the divider create List<LogEntry> rehearsal with the seven entries from the starter, then int pulled = 0; and IEnumerable<string> brightCues = rehearsal.Tap(entry => pulled++).Keep(entry => entry.Level >= 50).Shape(entry => entry.Cue); Store pulled in int pulledAtBuild and print query built, entries pulled so far: 0",
        "Run the query once: string[] brightList = brightCues.ToArray(); store pulled in int pulledAfterPass and print bright cues: curtain-up, spot-on, chase, bows (joined with \", \") and entries pulled by one full pass: 7",
        "Set pulled = 0; and take string firstBright = brightCues.First(); store pulled in int pulledForFirst and print first bright cue: curtain-up (pulled 2). Then build List<List<string>> pages = brightCues.Batch(2).ToList(); and print page 1: curtain-up + spot-on and page 2: chase + bows",
        "Send the results to the board with Desk.Show(\"query\", new { source = rehearsal.Count, pulls = new { built = pulledAtBuild, pass = pulledAfterPass, first = pulledForFirst }, kept = brightList.Length, pages });",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 9: build your own query operators and count what they pull.
// 1. Under the divider (below): record LogEntry and the static class CueQuery.
// 2. Here, once the types exist, copy in the rehearsal log:
//      List<LogEntry> rehearsal = new()
//      {
//          new(1, "house-down", 20), new(2, "curtain-up", 100), new(3, "spot-on", 85), new(4, "fog", 40),
//          new(5, "chase", 70), new(6, "blackout", 0), new(7, "bows", 90),
//      };
// 3. int pulled = 0;
//    IEnumerable<string> brightCues = rehearsal.Tap(entry => pulled++).Keep(entry => entry.Level >= 50).Shape(entry => entry.Cue);
//    int pulledAtBuild = pulled;                 print:  query built, entries pulled so far: 0
// 4. string[] brightList = brightCues.ToArray();  int pulledAfterPass = pulled;
//    print:  bright cues: curtain-up, spot-on, chase, bows
//    print:  entries pulled by one full pass: 7
// 5. pulled = 0;  string firstBright = brightCues.First();  int pulledForFirst = pulled;
//    print:  first bright cue: curtain-up (pulled 2)
//    List<List<string>> pages = brightCues.Batch(2).ToList();
//    print:  page 1: curtain-up + spot-on     and     page 2: chase + bows
// 6. Desk.Show("query", new { source = rehearsal.Count, pulls = new { built = pulledAtBuild, pass = pulledAfterPass, first = pulledForFirst }, kept = brightList.Length, pages });

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare the log entry and your four operators here.
//   record LogEntry(int Number, string Cue, int Level);
//   static class CueQuery
//   {
//       public static IEnumerable<T> Keep<T>(this IEnumerable<T> source, Func<T, bool> test) { ... }
//       public static IEnumerable<TResult> Shape<T, TResult>(this IEnumerable<T> source, Func<T, TResult> map) { ... }
//       public static IEnumerable<List<T>> Batch<T>(this IEnumerable<T> source, int size) { ... }
//       public static IEnumerable<T> Tap<T>(this IEnumerable<T> source, Action<T> look) { ... }
//   }`,
      solutionAdd: cs`// Lesson 9: how LINQ works.
List<LogEntry> rehearsal = new()
{
    new(1, "house-down", 20),
    new(2, "curtain-up", 100),
    new(3, "spot-on", 85),
    new(4, "fog", 40),
    new(5, "chase", 70),
    new(6, "blackout", 0),
    new(7, "bows", 90),
};

int pulled = 0;
IEnumerable<string> brightCues = rehearsal
    .Tap(entry => pulled++)
    .Keep(entry => entry.Level >= 50)
    .Shape(entry => entry.Cue);
int pulledAtBuild = pulled;
Console.WriteLine($"query built, entries pulled so far: {pulledAtBuild}");

string[] brightList = brightCues.ToArray();
int pulledAfterPass = pulled;
Console.WriteLine("bright cues: " + string.Join(", ", brightList));
Console.WriteLine($"entries pulled by one full pass: {pulledAfterPass}");

pulled = 0;
string firstBright = brightCues.First();
int pulledForFirst = pulled;
Console.WriteLine($"first bright cue: {firstBright} (pulled {pulledForFirst})");

List<List<string>> pages = brightCues.Batch(2).ToList();
for (int p = 0; p < pages.Count; p++)
{
    Console.WriteLine($"page {p + 1}: {string.Join(" + ", pages[p])}");
}

Desk.Show("query", new
{
    source = rehearsal.Count,
    pulls = new { built = pulledAtBuild, pass = pulledAfterPass, first = pulledForFirst },
    kept = brightList.Length,
    pages,
});

${TYPES_DIVIDER}

record LogEntry(int Number, string Cue, int Level);

static class CueQuery
{
    public static IEnumerable<T> Keep<T>(this IEnumerable<T> source, Func<T, bool> test)
    {
        foreach (T item in source)
        {
            if (test(item))
            {
                yield return item;
            }
        }
    }

    public static IEnumerable<TResult> Shape<T, TResult>(this IEnumerable<T> source, Func<T, TResult> map)
    {
        foreach (T item in source)
        {
            yield return map(item);
        }
    }

    public static IEnumerable<List<T>> Batch<T>(this IEnumerable<T> source, int size)
    {
        List<T> page = new(size);
        foreach (T item in source)
        {
            page.Add(item);
            if (page.Count == size)
            {
                yield return page;
                page = new List<T>(size);
            }
        }
        if (page.Count > 0)
        {
            yield return page;
        }
    }

    public static IEnumerable<T> Tap<T>(this IEnumerable<T> source, Action<T> look)
    {
        foreach (T item in source)
        {
            look(item);
            yield return item;
        }
    }
}`,
      explanation:
        "Each operator is an iterator that wraps the one before it, so building the query touches nothing: pulled is still 0 at that point. ToArray drives the whole chain and drains the seven entries, while First stops as soon as Shape has one answer, after Keep rejected entry 1 and accepted entry 2, hence 2 pulls. Batch hands out a fresh list after each full page, so the pages the caller collected stay independent, and a short final page is flushed after the loop. Because brightCues is a recipe rather than stored data, every consumer (ToArray, First, Batch) ran the pipeline again from the start.",
      hints: [
        { id: "h1", title: "Where the laziness comes from", content: "Keep, Shape, Batch and Tap are all iterators: a foreach over the source with a yield return inside. They need the this keyword on the first parameter so you can write rehearsal.Tap(...).Keep(...) with dots, and they live in a static class under the divider." },
        { id: "h2", title: "Shape of each operator", content: "Keep: foreach item, if (test(item)) yield return item. Shape: foreach item, yield return map(item). Tap: foreach item, call look(item), then yield return item. Batch: keep a List<T> page; add each item; when page.Count == size, yield return page and start page = new List<T>(size); after the loop, if page.Count > 0, yield return page." },
        { id: "h3", title: "Reading the counters", content: "pulled is only incremented inside the Tap lambda, so it counts how many entries the source handed over. After building the query it is 0. After ToArray it is 7. Set pulled = 0 before First() and read it right after; Shape asked Keep, which asked Tap twice. Print the pages with string.Join(\" + \", pages[0])." },
      ],
      tests: [
        {
          id: "t1",
          description: "building the query pulls nothing (deferred execution)",
          assertionCode: js`
assert(lines.includes("query built, entries pulled so far: 0"), 'No line is exactly "query built, entries pulled so far: 0". Build brightCues from Tap, Keep and Shape, copy pulled into pulledAtBuild BEFORE enumerating, and print it.');
assertEqual(scene.query && scene.query.pulls && scene.query.pulls.built, 0, "query.pulls.built");`,
        },
        {
          id: "t2",
          description: "one full pass keeps the four bright cues and pulls all seven entries",
          assertionCode: js`
assert(lines.includes("bright cues: curtain-up, spot-on, chase, bows"), 'No line is exactly "bright cues: curtain-up, spot-on, chase, bows". Keep entries with Level >= 50, Shape them to the Cue name, ToArray, and join with ", ".');
assert(lines.includes("entries pulled by one full pass: 7"), 'No line is exactly "entries pulled by one full pass: 7". Tap(entry => pulled++) must sit directly on the source, before Keep, so it sees all seven entries.');
assertEqual(scene.query.kept, 4, "query.kept");
assertEqual(scene.query.pulls.pass, 7, "query.pulls.pass");`,
        },
        {
          id: "t3",
          description: "First() stops early: only two entries are pulled",
          assertionCode: js`
assert(lines.includes("first bright cue: curtain-up (pulled 2)"), 'No line is exactly "first bright cue: curtain-up (pulled 2)". Reset pulled = 0 first, call brightCues.First(), and print pulled right after. If you get 7, your operators build a list first instead of yielding one item at a time.');
assertEqual(scene.query.pulls.first, 2, "query.pulls.first");`,
        },
        {
          id: "t4",
          description: "Batch cuts the bright cues into pages of two",
          assertionCode: js`
assert(lines.includes("page 1: curtain-up + spot-on"), 'No line is exactly "page 1: curtain-up + spot-on". Batch(2) should yield List<string> pages; print each with string.Join(" + ", page).');
assert(lines.includes("page 2: chase + bows"), 'No line is exactly "page 2: chase + bows".');
assertEqual(scene.query.pages, [["curtain-up", "spot-on"], ["chase", "bows"]], "query.pages. If both pages are empty, you reused one list with Clear(): start a NEW list after each full page");`,
        },
        {
          id: "t5",
          description: "the source count is sent to the board",
          assertionCode: js`assertEqual(scene.query && scene.query.source, 7, 'query.source (send source = rehearsal.Count). Use Desk.Show("query", new { source = ..., pulls = new { built, pass, first }, kept, pages }).');`,
        },
      ],
      unlocks: ["fl-linq"],
      checks: [
        {
          prompt: "Keep is an iterator. After `var q = list.Keep(x => x > 1);` how many items of `list` has Keep examined?",
          question: {
            type: "choice",
            options: ["None yet", "Exactly one", "All of them", "Only the ones greater than 1"],
            answer: 0,
          },
          explanation: "Keep returns a hidden enumerator and has not run a line of its body. The source is first touched when a consumer such as `ToList()`, `First()` or a `foreach` asks for a value.",
        },
        {
          prompt: "Which of these calls actually runs the whole pipeline? (Pick all that do.)",
          question: {
            type: "choice",
            options: ["`.Shape(e => e.Cue)`", "`.Count()`", "`.Batch(3)`", "`.ToList()`"],
            answer: [1, 3],
          },
          explanation: "`Shape` and `Batch` are deferred: they only extend the chain. `Count()` and `ToList()` are immediate: they must walk the sequence to produce a number or a list.",
        },
        {
          prompt: "Why does Batch start a new `List<T>` after yielding a full page instead of calling `page.Clear()`?",
          question: {
            type: "choice",
            options: [
              "The consumer may still be holding the page it received; clearing it would empty their copy",
              "Clear is not available on List<T>",
              "A new list is faster than clearing",
              "yield return copies the list anyway, so it makes no difference",
            ],
            answer: 0,
          },
          explanation: "`yield return page` hands out a reference, not a copy. If you reuse and clear that same object, every page the caller stored is the same emptied list. Give away a list and then let go of it.",
        },
      ],
    },
    // ───────────────────────── 10 ─────────────────────────
    {
      id: "csharp-delegates-10-tidy",
      title: "Tidy code",
      minutes: 35,
      xp: 180,
      concepts: ["expression-bodied members", "computed vs stored properties", "local functions", "static local functions", "static lambdas", "validate-then-iterate"],
      learn: md`### One arrow, two jobs

You already know \`=>\` from lambdas: parameters on the left, the result on the right. C# reuses the same arrow for **expression-bodied members**: a member whose whole body is a single expression can drop the braces and the \`return\`.

~~~csharp
record Segment(string Name, int Start, int End)
{
    public int Length => End - Start;                                    // a read-only property
    public bool Overlaps(Segment other) => Start < other.End && other.Start < End;   // a method
}
~~~

Read it as "Length *is* End minus Start". Methods, read-only properties, constructors, operators and indexers can all be written this way. It is shorthand, not a different feature: \`public int Length => End - Start;\` means exactly \`public int Length { get { return End - Start; } }\`. Use it when the body really is one expression and the line reads like a definition. When you need a second statement, go back to braces.

A property with \`=>\` is **recomputed on every read**. A property such as \`{ get; } = something\` is computed once and stored. If the inputs can change later, the stored version goes stale and the arrow version does not. For \`Length\` the arrow is what you want, because it cannot disagree with \`Start\` and \`End\`.

### Overlap, done carefully

The \`Overlaps\` rule treats a segment as the half-open range from \`Start\` up to, but not including, \`End\`. Two ranges overlap when each one starts before the other ends. An overture that runs 0 to 5 and an act that begins at 5 **touch** without overlapping: \`0 < 5\` is true but \`5 < 5\` is false. Whenever you work with ranges, decide whether the end is included before you write a single comparison.

### Local functions: methods that live where they are used

A **local function** is a method declared inside another method (or between top-level statements). Compared with a lambda stored in a variable it gives you:

- a **name** that shows in stack traces and reads like a sentence;
- the ability to be **called before its declaration** (declare helpers at the bottom of a method or after the statements that use them);
- plain **recursion** without the tricks a lambda needs;
- full generic and iterator support, so a local function can contain \`yield return\`, which a lambda cannot;
- no delegate allocation unless you actually convert it to one.

Like a lambda, a local function can **capture** the variables around it, and reading or changing them works as in lesson 2. That is convenient, and it is also how a function ends up depending on state it never mentions in its signature.

### static: capture on purpose or not at all

Put \`static\` in front of a local function or a lambda and the compiler forbids it from capturing anything from the enclosing scope. It may only use its own parameters, its own locals, constants and other static things:

~~~csharp
static bool Clash(Segment x, Segment y) => x.Overlaps(y);       // static local function
Func<Segment, int> lengthOf = static segment => segment.Length; // static lambda
~~~

Why bother? A static function **cannot quietly depend on a variable that later changes**, cannot create a hidden closure object, and tells the reader "everything I need is in my parameters". If you slip and use an outer variable you get a precise error instead of a subtle bug. Make a function static when you can, and leave it non-static when capturing is the point.

A local function can also be recursive; a static one is a good fit because the recursion passes its state as arguments:

~~~csharp
static int Minutes(Segment[] parts, int i) => i == parts.Length ? 0 : parts[i].Length + Minutes(parts, i + 1);
~~~

### Validate first, iterate second

Lesson 8 told you an iterator body does not run until the first \`MoveNext()\`. That means a check at the top of an iterator fires **late**: the bad call returns normally, and the exception appears later, at the \`foreach\`, far from the line that caused it.

~~~csharp
IEnumerable<Segment> LongerThanLazy(IEnumerable<Segment> segments, int minutes)
{
    if (segments is null) throw new ArgumentNullException(nameof(segments));   // fires only when enumerated
    foreach (Segment segment in segments) { if (segment.Length > minutes) yield return segment; }
}
~~~

The cure is a two-part method. An ordinary method does the checks immediately and returns a **local iterator** that does the lazy work:

~~~csharp
IEnumerable<Segment> LongerThan(IEnumerable<Segment> segments, int minutes)
{
    if (segments is null) throw new ArgumentNullException(nameof(segments));   // runs at the call
    return Iterate();

    IEnumerable<Segment> Iterate()
    {
        foreach (Segment segment in segments) { if (segment.Length > minutes) yield return segment; }
    }
}
~~~

This is exactly how well-behaved library operators are written: eager validation, lazy work. It is also a good reason local functions exist, because the iterator can use the outer parameters without passing them again. To feed a deliberate \`null\` to a parameter that is not nullable, write \`null!\`, which tells the compiler "I know".

### Common mistakes

- **Capturing inside a static function.** In a static lambda: \`error CS8820: A static anonymous function cannot contain a reference to 'total'.\` In a static local function: \`error CS8421: A static local function cannot contain a reference to 'total'.\` Pass the value in as a parameter, or remove \`static\`.
- **Assigning to an arrow property.** \`segment.Length = 4;\` on the read-only \`Length\` above: \`error CS0200: Property or indexer 'Segment.Length' cannot be assigned to -- it is read only\`.
- **Calling a local function before the variable it reads is assigned.** With \`int later;\` declared and never given a value, a local function that reads \`later\` compiles, but calling it is flagged: \`error CS0165: Use of unassigned local variable 'later'\`.
- **Putting the argument check inside the iterator** and wondering why the exception shows up at an innocent-looking \`foreach\`. Split it: check eagerly, then return the local iterator.
- **Cramming a long expression into \`=>\`.** If you need to read it twice, use braces and a name for the middle step.
- **Forgetting the touching case.** Half-open ranges that share an endpoint do not overlap.`,
      mission: md`Wen has pinned the run sheet to the fly gallery rail: Overture, Act one, Interval, Act two and the Curtain call, each with a start and end minute. Odile thinks the curtain call starts before Act two has finished, and she wants a program to prove it instead of arguing about a clock.

You will model the sheet with a small record written in the tidy style, hunt for overlaps with a static function, total the minutes with a static lambda, and make a query helper that complains about bad input at the call, not three screens later. When this lesson passes, the **Run sheet** panel lights up and draws the segments on a timeline with the clash flagged.`,
      tasks: [
        "Under the divider declare record Segment(string Name, int Start, int End) with two expression-bodied members: the property Length => End - Start and the method bool Overlaps(Segment other) => Start < other.End && other.Start < End",
        "Above the divider create Segment[] runSheet with the five segments from the starter. Write a static local function bool Clash(Segment x, Segment y) that returns x.Overlaps(y) with an expression body. Loop every pair (a, then b from a + 1) and collect List<string> overlaps with entries like \"Act two / Curtain call\". Print overlaps: Act two / Curtain call (entries joined with \"; \")",
        "Write a static lambda Func<Segment, int> lengthOf = static segment => segment.Length; Use it for int totalMinutes = runSheet.Sum(lengthOf); and compute int endsAt = runSheet.Max(segment => segment.End); Print minutes on the sheet: 117, show ends at 115",
        "Write two local functions: IEnumerable<Segment> LongerThanLazy(IEnumerable<Segment> segments, int minutes), an iterator that throws ArgumentNullException when segments is null, and IEnumerable<Segment> LongerThan(IEnumerable<Segment> segments, int minutes), which checks eagerly and returns a local iterator function Iterate(). Both keep segments longer than minutes",
        "Call LongerThanLazy(null!, 10), store it in lazyQuery, print lazy version: the call returned without complaint, then enumerate it inside try/catch (ArgumentNullException) setting string lazyCheck to threw only when enumerated (start it as never threw) and print lazy check: followed by lazyCheck. Call LongerThan(null!, 10) inside try/catch setting string eagerCheck to threw at the call (start it as never threw) and print eager check: followed by eagerCheck. Finish with Desk.Show(\"runSheet\", new { segments = runSheet.Select(s => new { name = s.Name, start = s.Start, end = s.End, length = s.Length }), overlaps, totalMinutes, endsAt, lazyCheck, eagerCheck });",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 10: tidy code, local functions and static lambdas.
// 1. Under the divider (below): the Segment record with expression-bodied Length and Overlaps.
// 2. Here, once Segment exists:
//      Segment[] runSheet =
//      {
//          new("Overture", 0, 5), new("Act one", 5, 50), new("Interval", 50, 65),
//          new("Act two", 65, 110), new("Curtain call", 108, 115),
//      };
//    static bool Clash(Segment x, Segment y) => x.Overlaps(y);      (a static local function)
//    List<string> overlaps = new();  loop a = 0.., b = a + 1..  and add $"{runSheet[a].Name} / {runSheet[b].Name}" when they clash
//    print:  overlaps: Act two / Curtain call
// 3. Func<Segment, int> lengthOf = static segment => segment.Length;
//    int totalMinutes = runSheet.Sum(lengthOf);   int endsAt = runSheet.Max(segment => segment.End);
//    print:  minutes on the sheet: 117, show ends at 115
// 4. Two local functions that keep segments with Length > minutes:
//      IEnumerable<Segment> LongerThanLazy(IEnumerable<Segment> segments, int minutes)   -> check null INSIDE the iterator
//      IEnumerable<Segment> LongerThan(IEnumerable<Segment> segments, int minutes)       -> check null, then  return Iterate();  with a local iterator Iterate()
// 5. string lazyCheck = "never threw";  IEnumerable<Segment> lazyQuery = LongerThanLazy(null!, 10);
//    print:  lazy version: the call returned without complaint
//    foreach over lazyQuery inside try/catch (ArgumentNullException)  ->  lazyCheck = "threw only when enumerated";  print:  lazy check: ...
//    string eagerCheck = "never threw";  try { LongerThan(null!, 10); } catch (ArgumentNullException) { eagerCheck = "threw at the call"; }   print:  eager check: ...
// 6. Desk.Show("runSheet", new { segments = runSheet.Select(s => new { name = s.Name, start = s.Start, end = s.End, length = s.Length }), overlaps, totalMinutes, endsAt, lazyCheck, eagerCheck });

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare the segment record here.
//   record Segment(string Name, int Start, int End)
//   {
//       public int Length => ...;
//       public bool Overlaps(Segment other) => ...;
//   }`,
      solutionAdd: cs`// Lesson 10: tidy code, local functions, static lambdas.
Segment[] runSheet =
{
    new("Overture", 0, 5),
    new("Act one", 5, 50),
    new("Interval", 50, 65),
    new("Act two", 65, 110),
    new("Curtain call", 108, 115),
};

static bool Clash(Segment x, Segment y) => x.Overlaps(y);

List<string> overlaps = new();
for (int a = 0; a < runSheet.Length; a++)
{
    for (int b = a + 1; b < runSheet.Length; b++)
    {
        if (Clash(runSheet[a], runSheet[b]))
        {
            overlaps.Add($"{runSheet[a].Name} / {runSheet[b].Name}");
        }
    }
}
Console.WriteLine("overlaps: " + string.Join("; ", overlaps));

Func<Segment, int> lengthOf = static segment => segment.Length;
int totalMinutes = runSheet.Sum(lengthOf);
int endsAt = runSheet.Max(segment => segment.End);
Console.WriteLine($"minutes on the sheet: {totalMinutes}, show ends at {endsAt}");

IEnumerable<Segment> LongerThanLazy(IEnumerable<Segment> segments, int minutes)
{
    if (segments is null)
    {
        throw new ArgumentNullException(nameof(segments));
    }
    foreach (Segment segment in segments)
    {
        if (segment.Length > minutes)
        {
            yield return segment;
        }
    }
}

IEnumerable<Segment> LongerThan(IEnumerable<Segment> segments, int minutes)
{
    if (segments is null)
    {
        throw new ArgumentNullException(nameof(segments));
    }
    return Iterate();

    IEnumerable<Segment> Iterate()
    {
        foreach (Segment segment in segments)
        {
            if (segment.Length > minutes)
            {
                yield return segment;
            }
        }
    }
}

string lazyCheck = "never threw";
IEnumerable<Segment> lazyQuery = LongerThanLazy(null!, 10);
Console.WriteLine("lazy version: the call returned without complaint");
try
{
    foreach (Segment segment in lazyQuery)
    {
    }
}
catch (ArgumentNullException)
{
    lazyCheck = "threw only when enumerated";
}
Console.WriteLine($"lazy check: {lazyCheck}");

string eagerCheck = "never threw";
try
{
    LongerThan(null!, 10);
}
catch (ArgumentNullException)
{
    eagerCheck = "threw at the call";
}
Console.WriteLine($"eager check: {eagerCheck}");

Desk.Show("runSheet", new
{
    segments = runSheet.Select(s => new { name = s.Name, start = s.Start, end = s.End, length = s.Length }),
    overlaps,
    totalMinutes,
    endsAt,
    lazyCheck,
    eagerCheck,
});

${TYPES_DIVIDER}

record Segment(string Name, int Start, int End)
{
    public int Length => End - Start;

    public bool Overlaps(Segment other) => Start < other.End && other.Start < End;
}`,
      explanation:
        "Segment's members are single expressions, so they use the arrow form and always agree with Start and End. Half-open overlap (Start < other.End && other.Start < End) makes touching segments such as Overture and Act one not clash, so only Act two (65 to 110) and Curtain call (108 to 115) overlap. Clash and lengthOf are static, so they can only use their parameters, which the compiler enforces. LongerThanLazy puts the null check inside an iterator, so it runs on the first MoveNext inside the foreach; LongerThan checks eagerly in an ordinary method and returns the local Iterate(), so the exception appears at the call.",
      hints: [
        { id: "h1", title: "The two members", content: "An expression-bodied member has an arrow and no braces: public int Length => End - Start; and public bool Overlaps(Segment other) => Start < other.End && other.Start < End; Both go inside the record's braces under the divider." },
        { id: "h2", title: "Static and local", content: "static bool Clash(Segment x, Segment y) => x.Overlaps(y); sits among the statements. The lambda is Func<Segment, int> lengthOf = static segment => segment.Length; For the pair loop use for (int a = 0; a < runSheet.Length; a++) with an inner for (int b = a + 1; ...). Total minutes is 5 + 45 + 15 + 45 + 7 = 117." },
        { id: "h3", title: "Eager versus lazy", content: "The lazy version is a normal iterator: if (segments is null) throw new ArgumentNullException(nameof(segments)); then foreach and yield return. The eager one has the same check, then return Iterate(); and below that a nested IEnumerable<Segment> Iterate() { foreach (...) { ... yield return ...; } } that uses the outer segments and minutes. To trigger the lazy exception, loop over lazyQuery in a try with an empty body." },
      ],
      tests: [
        {
          id: "t1",
          description: "only Act two and Curtain call overlap (touching segments do not)",
          assertionCode: js`
assert(lines.includes("overlaps: Act two / Curtain call"), 'No line is exactly "overlaps: Act two / Curtain call". Use Start < other.End && other.Start < End, so segments that merely touch (Overture ends at 5, Act one starts at 5) do not clash.');
assertEqual(scene.runSheet && scene.runSheet.overlaps, ["Act two / Curtain call"], "runSheet.overlaps");`,
        },
        {
          id: "t2",
          description: "the static lambda totals the minutes and the show ends at 115",
          assertionCode: js`
assert(lines.includes("minutes on the sheet: 117, show ends at 115"), 'No line is exactly "minutes on the sheet: 117, show ends at 115". totalMinutes sums Length (5+45+15+45+7); endsAt is the largest End.');
assertEqual(scene.runSheet.totalMinutes, 117, "runSheet.totalMinutes");
assertEqual(scene.runSheet.endsAt, 115, "runSheet.endsAt");`,
        },
        {
          id: "t3",
          description: "the lazy helper checks its argument only when enumerated",
          assertionCode: js`
assert(lines.includes("lazy version: the call returned without complaint"), 'No line is exactly "lazy version: the call returned without complaint". Call LongerThanLazy(null!, 10) and print this BEFORE enumerating it; if the call itself throws, the null check is not inside an iterator.');
assert(lines.includes("lazy check: threw only when enumerated"), 'No line is exactly "lazy check: threw only when enumerated". Loop over lazyQuery inside try/catch (ArgumentNullException) and set lazyCheck in the catch.');`,
        },
        {
          id: "t4",
          description: "the eager helper checks at the call and returns a local iterator",
          assertionCode: js`
assert(lines.includes("eager check: threw at the call"), 'No line is exactly "eager check: threw at the call". LongerThan must be an ordinary method that throws immediately, then return Iterate(), where Iterate is a local function containing the foreach and yield return.');
assertEqual(scene.runSheet.eagerCheck, "threw at the call", "runSheet.eagerCheck");
assertEqual(scene.runSheet.lazyCheck, "threw only when enumerated", "runSheet.lazyCheck");`,
        },
        {
          id: "t5",
          description: "the board receives the segments with their lengths",
          assertionCode: js`
const segs = scene.runSheet && scene.runSheet.segments;
assert(Array.isArray(segs) && segs.length === 5, 'Send the sheet with Desk.Show("runSheet", new { segments = runSheet.Select(s => new { name = s.Name, start = s.Start, end = s.End, length = s.Length }), ... });');
assertEqual(segs.map((s) => s.name), ["Overture", "Act one", "Interval", "Act two", "Curtain call"], "segment names, in sheet order");
assertEqual(segs.map((s) => s.length), [5, 45, 15, 45, 7], "segment lengths (the Length property)");`,
        },
      ],
      unlocks: ["fl-runsheet"],
      checks: [
        {
          prompt: "What does the `static` keyword change in `Func<Segment, int> lengthOf = static segment => segment.Length;`?",
          question: {
            type: "choice",
            options: [
              "The lambda is forbidden from capturing variables of the enclosing scope; using one is a compile error",
              "The lambda runs on a different thread",
              "The lambda is cached forever and can never be replaced",
              "The lambda can only be called once",
            ],
            answer: 0,
          },
          explanation: "`static` is a promise checked by the compiler: everything the function needs arrives through its parameters. Touching an outer local gives `error CS8820` for lambdas or `CS8421` for local functions.",
        },
        {
          prompt: "Why does the check in `LongerThanLazy` fire at the `foreach` rather than at the call?",
          question: {
            type: "choice",
            options: [
              "The null check is in an iterator body, and an iterator body only starts running on the first MoveNext",
              "ArgumentNullException is always delayed by the runtime",
              "Local functions are compiled after the statements that call them",
              "null! disables the check until later",
            ],
            answer: 0,
          },
          explanation: "Calling an iterator method returns immediately with a hidden enumerator. Argument validation therefore belongs in an ordinary outer method, which returns a local iterator for the lazy part.",
        },
        {
          prompt: "Do `new Segment(\"A\", 0, 5)` and `new Segment(\"B\", 5, 50)` overlap according to `Start < other.End && other.Start < End`?",
          question: {
            type: "choice",
            options: ["No: 5 < 5 is false, so they only touch", "Yes: they share the minute 5", "Yes: 0 < 50", "It depends on the order of the arguments"],
            answer: 0,
          },
          explanation: "A segment covers `Start` up to but not including `End`. `A` ends exactly where `B` begins, so the second comparison `5 < 5` fails and the segments do not overlap.",
        },
      ],
    },
  ],
};
