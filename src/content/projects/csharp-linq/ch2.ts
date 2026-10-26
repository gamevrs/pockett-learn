import type { Chapter } from "@/engine/types";
import { TYPES_DIVIDER } from "../../../engine/compose.ts";
import { cs, js, md } from "./util.ts";

/**
 * Chapter 2: Execution and modelling. When do queries really run, how records behave, how to
 * branch on the shape of data, and how interfaces describe what a type can do.
 */

export const chapter2: Chapter = {
  id: "execution-and-modelling",
  title: "Execution and modelling",
  blurb: "See when queries really run, then model the port's data with records, patterns and interfaces.",
  lessons: [
    // ───────────────────────── 5 ─────────────────────────
    {
      id: "csharp-linq-5-deferred",
      title: "Deferred vs immediate execution",
      minutes: 25,
      xp: 160,
      concepts: ["deferred execution", "immediate execution", "ToList", "iterators", "yield return", "multiple enumeration", "captured variables"],
      learn: md`### A query is a recipe, not a result

Look at this line:

~~~csharp
var heavy = shipments.Where(shipment => shipment.MassKg >= 1000);
~~~

Has C# looked at a single shipment yet? **No.** \`Where\` returned a small object that remembers *where to read from* and *what to test*, and nothing more. The test runs only when something **enumerates** the result: a \`foreach\`, a \`ToList()\`, a \`Count()\`, a \`First()\`. This is **deferred execution**, and it is the most important thing to understand about LINQ, because it explains most of the surprises people hit.

### Which operators are lazy?

- **Deferred** (they return a new sequence and do nothing yet): \`Where\`, \`Select\`, \`SelectMany\`, \`OrderBy\`/\`ThenBy\`, \`GroupBy\`, \`Take\`, \`Skip\`, \`Distinct\`, \`Concat\`, \`Join\`, \`Zip\`, \`Reverse\`.
- **Immediate** (they walk the sequence right now and give you a plain value): \`ToList\`, \`ToArray\`, \`ToDictionary\`, \`ToLookup\`, \`ToHashSet\`, \`Count\`, \`Sum\`, \`Average\`, \`Min\`, \`Max\`, \`First\`, \`Single\`, \`Any\`, \`All\`, \`Contains\`, \`Aggregate\`.

Rule of thumb: if it returns \`IEnumerable<T>\` or \`IOrderedEnumerable<T>\` it is a recipe; if it returns a list, a number, a bool or one element it has already run.

Deferred operators also differ in how they run. \`Where\` and \`Select\` **stream**: they hand over one element at a time and never hold the whole list. \`OrderBy\`, \`GroupBy\` and \`Reverse\` must **buffer**: the first element can only be known after the whole source has been read.

### Consequence 1: the query sees the data as it is *when it runs*

~~~csharp
var cheap = scratch.Where(shipment => shipment.MassKg < 400);   // recipe
scratch.Add(newShipment);                                        // the source changes
int n = cheap.Count();                                           // runs now, and includes newShipment
~~~

The same goes for variables captured by the lambda: the query reads \`minKg\` when it runs, not when it was written. If you change \`minKg\` between defining and enumerating, the answer changes.

### Consequence 2: every enumeration runs the whole recipe again

~~~csharp
int a = heavy.Count();   // walks the source and runs the lambda on every shipment
int b = heavy.Count();   // does all of it again
~~~

When the source is an in-memory list and the lambda is cheap, that only wastes a little time. But a query can sit on top of a database, a file or a network call, or its lambda can have side effects (increment a counter, print a line, call an API). Then running it twice is slow, doubly expensive, or simply wrong. Tools such as Rider flag this as **possible multiple enumeration**.

### The fix: snapshot with an immediate operator

~~~csharp
List<Shipment> snapshot = heavy.ToList();   // runs once
int a = snapshot.Count;                      // plain list property, no query
int b = snapshot.Sum(shipment => shipment.MassKg);   // reads the stored list
~~~

\`ToList()\` (or \`ToArray()\`) is how you say *"I am done with the recipe, keep these results"*. Use it when you will read the data more than once, when you need it to stay exactly as it is even if the source changes, or when you want exceptions to happen *here* rather than later at some far-away \`foreach\`.

### Writing your own lazy sequence: \`yield return\`

A method that returns \`IEnumerable<T>\` and uses \`yield return\` is an **iterator**. Its body does not run when you call it; it runs, one step at a time, as the caller asks for the next element.

~~~csharp
IEnumerable<int> Countdown(int from)
{
    Console.WriteLine("starting");     // printed when the FIRST element is requested
    for (int i = from; i > 0; i--) yield return i;
}
~~~

Iterators are how LINQ itself is built, and a simple way to watch deferral: put a counter at the top and see how many times it ticks.

### When laziness is a gift

Because nothing runs early, \`shipments.Where(...).Take(3)\` only tests as many shipments as it needs to find three. And because queries compose, you can build a big query in pieces (add a \`Where\` if a filter is set, add an \`OrderBy\` if sorting is requested) and run it once at the end.

### Common mistakes

- Treating a \`Select\` result as stored data and being surprised when it changes (or runs again).
- Enumerating the same \`IEnumerable<T>\` parameter twice inside a method (a \`Count()\` and then a \`foreach\`).
- Modifying the source list inside a \`foreach\` over a query on that list: \`InvalidOperationException: Collection was modified; enumeration operation may not execute.\`
- Sprinkling \`ToList()\` everywhere "just in case". It is cheap for small lists but copies everything; use it where you have a reason.`,
      mission: md`A safety audit flagged the port's old manifest software: its reports re-ran the same expensive filter four times for every printout, and when a late shipment arrived mid-report the totals no longer matched the lists. Before you build more on LINQ, you will prove to yourself exactly *when* a query runs.

You will count how many times a lambda is called, watch a query notice a new arrival, and count the passes a scan makes over the manifest. When this lesson passes, the **Execution tracer** shows each step as a bar.`,
      tasks: [
        "Under the divider declare record TraceStep(string Step, int Evaluations). Above it: int evaluations = 0 and IEnumerable<Shipment> heavyQuery = shipments.Where(...) whose lambda does evaluations++ and then returns MassKg >= 1000. Make List<TraceStep> executionTrace and add new TraceStep(\"query defined\", evaluations). Print After defining the query: 0 evaluations",
        "Call heavyQuery.Count() twice (adding TraceStep \"first Count()\" and \"second Count()\" with the counter each time) and print After two Count() calls: 28 evaluations (5 heavy shipments). Then reset evaluations to 0, take List<Shipment> heavySnapshot = heavyQuery.ToList(), add \"ToList()\", read the list twice (a Sum and a Max on heavySnapshot), add \"reads of the list\", and print After ToList and two reads: 14 evaluations",
        "Copy the shipments into List<Shipment> scratch, define lightQuery = scratch.Where(MassKg < 400) and a snapshot lightSnapshot = lightQuery.ToList(). Count the query (lightBefore), then Add new Shipment(\"H-3099\", \"Sample tubes\", \"Medical\", \"Luna Gate\", \"V-12\", 50, 1) to scratch and count again (lightAfter). Print Light shipments: 5 before the new arrival, 6 after, snapshot still 5",
        "Write a local iterator IEnumerable<Shipment> Scan(IEnumerable<Shipment> source) that does passes++ and then yield returns each shipment. Run one Scan feed through two Count calls (naivePasses should be 2), reset passes, then ToList the scan once and count the list twice (snapshotPasses 1). Print Scan passes: 2 without a snapshot, 1 with one. Port.Show executionTrace, sourceChange (new { Before, After, Snapshot }) and passes (new { Naive, Snapshot })",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 5: watch when a query really runs.
// 1. int evaluations = 0;   IEnumerable<Shipment> heavyQuery = shipments.Where(shipment => { evaluations++; return shipment.MassKg >= 1000; });
//    List<TraceStep> executionTrace = new();   executionTrace.Add(new TraceStep("query defined", evaluations));
//    print  After defining the query: 0 evaluations
// 2. int firstCount = heavyQuery.Count();   -> trace "first Count()"      int secondCount = heavyQuery.Count();   -> trace "second Count()"
//    print  After two Count() calls: 28 evaluations (5 heavy shipments)
//    evaluations = 0;  List<Shipment> heavySnapshot = heavyQuery.ToList();  -> trace "ToList()"
//    read heavySnapshot twice (Sum, Max)  -> trace "reads of the list"       print  After ToList and two reads: 14 evaluations
// 3. List<Shipment> scratch = new(shipments);  lightQuery = scratch.Where(MassKg < 400);  lightSnapshot = lightQuery.ToList();
//    lightBefore = lightQuery.Count();  scratch.Add(new Shipment("H-3099", "Sample tubes", "Medical", "Luna Gate", "V-12", 50, 1));  lightAfter = lightQuery.Count();
//    print  Light shipments: 5 before the new arrival, 6 after, snapshot still 5
// 4. int passes = 0;  IEnumerable<Shipment> Scan(IEnumerable<Shipment> source) { passes++; foreach (...) yield return ...; }
//    two Counts on one Scan(shipments) feed -> naivePasses (2).  passes = 0; Scan(shipments).ToList() then two reads -> snapshotPasses (1).
//    print  Scan passes: 2 without a snapshot, 1 with one
// Port.Show: executionTrace, sourceChange (new { Before, After, Snapshot }), passes (new { Naive, Snapshot })

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare the trace record here.
//   record TraceStep(string Step, int Evaluations);
`,
      solutionAdd: cs`// Lesson 5: deferred and immediate execution.
int evaluations = 0;
IEnumerable<Shipment> heavyQuery = shipments.Where(shipment =>
{
    evaluations++;
    return shipment.MassKg >= 1000;
});
List<TraceStep> executionTrace = new();
executionTrace.Add(new TraceStep("query defined", evaluations));
Console.WriteLine($"After defining the query: {evaluations} evaluations");

int firstCount = heavyQuery.Count();
executionTrace.Add(new TraceStep("first Count()", evaluations));
int secondCount = heavyQuery.Count();
executionTrace.Add(new TraceStep("second Count()", evaluations));
Console.WriteLine($"After two Count() calls: {evaluations} evaluations ({firstCount} heavy shipments)");

evaluations = 0;
List<Shipment> heavySnapshot = heavyQuery.ToList();
executionTrace.Add(new TraceStep("ToList()", evaluations));
int snapshotKg = heavySnapshot.Sum(shipment => shipment.MassKg);
int snapshotMax = heavySnapshot.Max(shipment => shipment.MassKg);
executionTrace.Add(new TraceStep("reads of the list", evaluations));
Console.WriteLine($"After ToList and two reads: {evaluations} evaluations");

List<Shipment> scratch = new(shipments);
IEnumerable<Shipment> lightQuery = scratch.Where(shipment => shipment.MassKg < 400);
List<Shipment> lightSnapshot = lightQuery.ToList();
int lightBefore = lightQuery.Count();
scratch.Add(new Shipment("H-3099", "Sample tubes", "Medical", "Luna Gate", "V-12", 50, 1));
int lightAfter = lightQuery.Count();
Console.WriteLine($"Light shipments: {lightBefore} before the new arrival, {lightAfter} after, snapshot still {lightSnapshot.Count}");

int passes = 0;
IEnumerable<Shipment> Scan(IEnumerable<Shipment> source)
{
    passes++;
    foreach (Shipment shipment in source)
    {
        yield return shipment;
    }
}
IEnumerable<Shipment> feed = Scan(shipments);
int feedTotal = feed.Count();
int feedHeavy = feed.Count(shipment => shipment.MassKg >= 1000);
int naivePasses = passes;
passes = 0;
List<Shipment> fed = Scan(shipments).ToList();
int fedTotal = fed.Count;
int fedHeavy = fed.Count(shipment => shipment.MassKg >= 1000);
int snapshotPasses = passes;
Console.WriteLine($"Scan passes: {naivePasses} without a snapshot, {snapshotPasses} with one");

Port.Show("executionTrace", executionTrace);
Port.Show("sourceChange", new { Before = lightBefore, After = lightAfter, Snapshot = lightSnapshot.Count });
Port.Show("passes", new { Naive = naivePasses, Snapshot = snapshotPasses });

${TYPES_DIVIDER}

// One step of the experiment: what happened, and how many times the lambda had run by then.
record TraceStep(string Step, int Evaluations);`,
      explanation:
        "Defining heavyQuery runs nothing (0 evaluations). Each Count() enumerates the source and calls the lambda on all 14 shipments, so two Counts cost 28. ToList() enumerates once more (14 evaluations after the reset) and from then on the list answers Sum and Max on its own, with no further lambda calls. The lightQuery is re-evaluated on every Count, so it notices the new arrival (5 then 6), while the snapshot taken earlier stays at 5. The Scan iterator's body runs once per enumeration, so counting the same feed twice makes two passes, and copying it to a list first makes one.",
      hints: [
        { id: "h1", title: "Count the lambda calls", content: "Use a block-bodied lambda: shipments.Where(shipment => { evaluations++; return shipment.MassKg >= 1000; }). Declaring it and not enumerating it leaves evaluations at 0. Declare record TraceStep(string Step, int Evaluations); under the divider." },
        { id: "h2", title: "Snapshots do not re-run", content: "evaluations = 0; List<Shipment> heavySnapshot = heavyQuery.ToList(); runs the lambda 14 times. After that heavySnapshot.Sum(...) and heavySnapshot.Max(...) read the stored list, so the counter stays at 14." },
        { id: "h3", title: "Iterators and the source", content: "IEnumerable<Shipment> Scan(IEnumerable<Shipment> source) { passes++; foreach (Shipment shipment in source) { yield return shipment; } } Two Count calls on the same Scan(...) result run the body twice. For the source test: lightQuery is lazy, lightSnapshot = lightQuery.ToList() is a copy taken before scratch.Add(...)." },
      ],
      tests: [
        {
          id: "t1",
          description: "defining a query runs nothing; each Count() runs the whole recipe",
          assertionCode: js`
assert(lines.includes("After defining the query: 0 evaluations"), 'Print "After defining the query: 0 evaluations": a Where query does not run until it is enumerated.');
assert(lines.includes("After two Count() calls: 28 evaluations (5 heavy shipments)"), 'Print "After two Count() calls: 28 evaluations (5 heavy shipments)": each Count() runs the lambda on all 14 shipments.');
assert(Array.isArray(scene.executionTrace) && scene.executionTrace.length === 5, 'Send five TraceStep records with Port.Show("executionTrace", executionTrace);');
assertEqual(scene.executionTrace.slice(0, 3).map((t) => t.evaluations), [0, 14, 28], "evaluations after: defined, first Count(), second Count()");`,
        },
        {
          id: "t2",
          description: "ToList() runs the recipe once and later reads cost nothing",
          assertionCode: js`
assert(lines.includes("After ToList and two reads: 14 evaluations"), 'Print "After ToList and two reads: 14 evaluations": reset evaluations to 0 before ToList(), then read the list twice.');
assertEqual(scene.executionTrace.slice(3).map((t) => t.evaluations), [14, 14], "evaluations after ToList() and after reading the list twice");
assert(scene.executionTrace.every((t) => typeof t.step === "string" && t.step.length > 0), "Give every TraceStep a step name.");`,
        },
        {
          id: "t3",
          description: "a lazy query sees a new arrival, a snapshot does not",
          assertionCode: js`
assert(lines.includes("Light shipments: 5 before the new arrival, 6 after, snapshot still 5"), 'Print "Light shipments: 5 before the new arrival, 6 after, snapshot still 5".');
assertEqual(scene.sourceChange, { before: 5, after: 6, snapshot: 5 }, "sourceChange (Before, After, Snapshot)");`,
        },
        {
          id: "t4",
          description: "an iterator makes one pass per enumeration",
          assertionCode: js`
assert(lines.includes("Scan passes: 2 without a snapshot, 1 with one"), 'Print "Scan passes: 2 without a snapshot, 1 with one".');
assertEqual(scene.passes, { naive: 2, snapshot: 1 }, "passes (Naive, Snapshot)");`,
        },
      ],
      unlocks: ["hp-lazy"],
      checks: [
        {
          prompt: "Which of these calls has already walked the whole sequence by the time it returns?",
          question: {
            type: "choice",
            options: ["`shipments.OrderBy(s => s.MassKg).ToList()`", "`shipments.Where(s => s.MassKg > 10)`", "`shipments.Select(s => s.Id)`", "`shipments.Skip(2)`"],
            answer: 0,
          },
          explanation: "`ToList()` is an immediate operator: it enumerates the sorted sequence and stores the results. The other three just return a recipe that will run when something enumerates it.",
        },
        {
          prompt: "A method takes `IEnumerable<Shipment> items` and does `if (items.Any()) { foreach (var item in items) { ... } }`. If `items` is a database query, what is the problem?",
          question: {
            type: "choice",
            options: [
              "The query runs twice: once for `Any()` and once for the `foreach`",
              "`Any()` modifies the sequence",
              "`foreach` cannot read an `IEnumerable<T>`",
              "Nothing: LINQ caches every result automatically",
            ],
            answer: 0,
          },
          explanation: "Nothing is cached. Each enumeration re-runs the recipe, so you pay for it twice (and may even see different data). Take a snapshot with `ToList()` first, or restructure so the sequence is walked once.",
        },
        {
          prompt: "`int minKg = 1000; var q = shipments.Where(s => s.MassKg >= minKg); minKg = 3000; int n = q.Count();` Which threshold does the count use?",
          question: { type: "number", answer: 3000 },
          explanation: "The lambda reads `minKg` when the query runs (at `Count()`), not when it was written, so it sees 3000. This is why a captured variable that changes can quietly change the meaning of a deferred query.",
        },
      ],
    },

    // ───────────────────────── 6 ─────────────────────────
    {
      id: "csharp-linq-6-records",
      title: "Records in depth",
      minutes: 25,
      xp: 160,
      concepts: ["records", "value equality", "with expressions", "positional records", "deconstruction", "init", "record struct", "shallow equality"],
      learn: md`### A record is a class that compares by what it holds

You met records as a short way to declare a data type. They are a lot more than short. Compare:

~~~csharp
class BerthClass { public string Dock = ""; public int Slot; }
record Berth(string Dock, int Slot);

BerthClass x = new() { Dock = "A", Slot = 3 };
BerthClass y = new() { Dock = "A", Slot = 3 };
Console.WriteLine(x == y);               // False: two different objects

Berth a = new("A", 3);
Berth b = new("A", 3);
Console.WriteLine(a == b);               // True: same type, same values
Console.WriteLine(ReferenceEquals(a, b)); // False: still two objects
~~~

A normal class is equal only to *itself* (reference equality). A record gets **value equality** for free: two records are equal when they have the same type and every field is equal. The compiler also writes \`Equals\`, \`GetHashCode\`, \`==\`/\`!=\`, a readable \`ToString()\` and a \`Deconstruct\` method:

~~~csharp
Console.WriteLine(a);          // Berth { Dock = A, Slot = 3 }
var (dock, slot) = a;          // dock = "A", slot = 3
~~~

### Positional records and what they generate

\`record Berth(string Dock, int Slot);\` is a **positional** record. The parts in the parentheses become the constructor parameters *and* public properties. Those properties are **\`init\`-only**: they can be set while the object is being created and never again. So a record is immutable by default:

~~~csharp
Berth moved = a;
moved.Slot = 7;     // error CS8852: Init-only property or indexer 'Berth.Slot' can only be assigned in an object initializer, or on 'this' or 'base' in an instance constructor or an 'init' accessor.
~~~

You can also write a record with ordinary property syntax (\`record Berth { public required string Dock { get; init; } }\`), add methods and computed members in a body (\`{ ... }\`), and even declare a property with a plain \`set\` if you really want a mutable one. Immutability is the default, not a law.

### \`with\`: copy and change

Because the original cannot change, you build a changed **copy** with a \`with\` expression:

~~~csharp
Berth moved = a with { Slot = 7 };
// a is still Berth { Dock = A, Slot = 3 }; moved is Berth { Dock = A, Slot = 7 }
~~~

Everything you do not mention is copied. This is how you model "amend this record" without the bug where somebody else's reference quietly changes under them.

### Value equality makes records good keys

Because equal records have equal hash codes, a record works as a \`Dictionary\` key or a \`HashSet\` member exactly the way a string or an int does:

~~~csharp
HashSet<Berth> taken = new() { new("A", 3), new("A", 3), new("B", 1) };   // 2 items
Dictionary<Berth, string> who = new() { [new("A", 3)] = "Pelican Run" };
string name = who[new Berth("A", 3)];   // found with a brand new, equal key
~~~

Do not put a record with **mutable** members in a set or as a dictionary key and then change it: its hash code moves and it gets lost inside the collection.

### The trap: equality is only as deep as the fields

Record equality calls \`Equals\` on each field. For a \`string\`, an \`int\` or another record that compares by value. For an **array** or a \`List<T>\` it compares **references**, because arrays do not define value equality:

~~~csharp
record Vessel(string Id, string[] Crew);
var v1 = new Vessel("V-11", new[] { "Ada" });
var v2 = new Vessel("V-11", new[] { "Ada" });
Console.WriteLine(v1 == v2);   // False! Two separate arrays, even with identical contents
~~~

The same applies to a record you copy with \`with\`: the copy shares the same array object, so the copy equals the original until somebody replaces the array. If a record needs deep equality over a collection, store it in an immutable collection type, or override \`Equals\` yourself.

### Records or classes?

- **Record**: the thing *is* its data (a coordinate, an address, a message, a database row). You compare by value, copy with \`with\`, print it easily.
- **Class**: the thing has an identity and behaviour that outlives its values (a connection, a service, a vessel in the middle of docking).
- **\`record struct\`**: the value-type version, for small things you create millions of.

Records can inherit from other records (\`record Truck(string Id, int Axles) : Vehicle(Id);\`). Equality then also compares the runtime type, so a \`Truck\` never equals a \`Vehicle\` with the same id.

### Common mistakes

- Assuming a record containing a \`List<T>\` or array has deep equality.
- Mutating a record that is a dictionary key.
- Expecting \`with\` to run validation in the constructor. It copies, then sets the init properties you listed; put checks in the \`init\` accessors if they must always run.
- Using a record where identity matters (two different pending orders with the same fields must not merge into one).`,
      mission: md`Berths at Halyard Port are assigned by dock letter and slot number, and an assignment is the same assignment wherever it is written down. Meanwhile the paperwork desk keeps "amending" shipments: a priority is raised, but the original record must stay available for the audit trail.

You will model berths as records and compare them by value, move one with \`with\`, use them as set members and dictionary keys, and amend a real shipment without touching the original. When this lesson passes, the **Amendment desk** shows before and after side by side.`,
      tasks: [
        "Under the divider declare record Berth(string Dock, int Slot). Above it make berthA = new(\"A\", 3) and berthB = new(\"A\", 3). Print Same values: True, Same object: False and then the record itself with Console.WriteLine(berthA) (Berth { Dock = A, Slot = 3 }). Deconstruct berthA into dock and slot and print Dock A, slot 3. Port.Show berthCompare as new { Equal, SameReference, Text }",
        "Use a with expression to build Berth moved = berthA with { Slot = 7 }. Print Original: Berth { Dock = A, Slot = 3 } and Moved: Berth { Dock = A, Slot = 7 } (interpolate the records), and Port.Show berthMove as new { Before, After } using ToString()",
        "Put berthA, berthB and new Berth(\"B\", 1) in a HashSet<Berth> taken, and make Dictionary<Berth, string> occupants with berthA mapped to \"Pelican Run\". Look the occupant up with a brand new Berth(\"A\", 3) key. Print Distinct berths: 2 and Occupant of A3: Pelican Run. Port.Show berthKeys as new { Distinct, Occupant }",
        "Take the shipment with Id H-3001 and build raised = original with { Priority = 1 }. Print H-3001: priority 2 -> 1 and Same shipment after amendment: False, and Port.Show amendment as new { Before = original, After = raised }. Then show the shallow-equality trap: take vessels[0], copy it with { Operator = \"Tern Freight\" } (same crew array) and with { Crew = (string[])pelican.Crew.Clone() } and print Copy sharing the crew array equals original: True and Copy with a cloned crew array equals original: False",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 6: look inside records.
// 1. Berth berthA = new("A", 3);  Berth berthB = new("A", 3);
//    print  Same values: True   Same object: False (ReferenceEquals)   then Console.WriteLine(berthA)  ->  Berth { Dock = A, Slot = 3 }
//    var (dock, slot) = berthA;   print  Dock A, slot 3
//    Port.Show("berthCompare", new { Equal = ..., SameReference = ..., Text = berthA.ToString() });
// 2. Berth moved = berthA with { Slot = 7 };   print  Original: Berth { Dock = A, Slot = 3 }   Moved: Berth { Dock = A, Slot = 7 }
//    Port.Show("berthMove", new { Before = berthA.ToString(), After = moved.ToString() });
// 3. HashSet<Berth> taken = new() { berthA, berthB, new Berth("B", 1) };   Dictionary<Berth, string> occupants = new() { [berthA] = "Pelican Run" };
//    string occupant = occupants[new Berth("A", 3)];   print  Distinct berths: 2   and   Occupant of A3: Pelican Run
//    Port.Show("berthKeys", new { Distinct = taken.Count, Occupant = occupant });
// 4. Shipment original = shipments.First(... "H-3001" ...);  Shipment raised = original with { Priority = 1 };
//    print  H-3001: priority 2 -> 1   and   Same shipment after amendment: False       Port.Show("amendment", new { Before = original, After = raised });
//    Vessel pelican = vessels[0];  copies with { Operator = "Tern Freight" } and with { Crew = (string[])pelican.Crew.Clone() }
//    print  Copy sharing the crew array equals original: True   Copy with a cloned crew array equals original: False

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare the berth record here.
//   record Berth(string Dock, int Slot);
`,
      solutionAdd: cs`// Lesson 6: records in depth.
Berth berthA = new("A", 3);
Berth berthB = new("A", 3);
bool sameValues = berthA == berthB;
bool sameObject = ReferenceEquals(berthA, berthB);
Console.WriteLine($"Same values: {sameValues}");
Console.WriteLine($"Same object: {sameObject}");
Console.WriteLine(berthA);
var (dock, slot) = berthA;
Console.WriteLine($"Dock {dock}, slot {slot}");
Port.Show("berthCompare", new { Equal = sameValues, SameReference = sameObject, Text = berthA.ToString() });

Berth moved = berthA with { Slot = 7 };
Console.WriteLine($"Original: {berthA}");
Console.WriteLine($"Moved: {moved}");
Port.Show("berthMove", new { Before = berthA.ToString(), After = moved.ToString() });

HashSet<Berth> taken = new() { berthA, berthB, new Berth("B", 1) };
Dictionary<Berth, string> occupants = new() { [berthA] = "Pelican Run" };
string occupant = occupants[new Berth("A", 3)];
Console.WriteLine($"Distinct berths: {taken.Count}");
Console.WriteLine($"Occupant of A3: {occupant}");
Port.Show("berthKeys", new { Distinct = taken.Count, Occupant = occupant });

Shipment original = shipments.First(shipment => shipment.Id == "H-3001");
Shipment raised = original with { Priority = 1 };
Console.WriteLine($"{original.Id}: priority {original.Priority} -> {raised.Priority}");
Console.WriteLine($"Same shipment after amendment: {original == raised}");
Port.Show("amendment", new { Before = original, After = raised });

Vessel pelican = vessels[0];
Vessel sharedCrew = pelican with { Operator = "Tern Freight" };
Vessel clonedCrew = pelican with { Crew = (string[])pelican.Crew.Clone() };
Console.WriteLine($"Copy sharing the crew array equals original: {pelican == sharedCrew}");
Console.WriteLine($"Copy with a cloned crew array equals original: {pelican == clonedCrew}");

${TYPES_DIVIDER}

// A dock letter and a slot number. Two Berth values with the same letter and slot are the same berth.
record Berth(string Dock, int Slot);`,
      explanation:
        "A record compares by value, so berthA == berthB is True even though they are two objects, and the generated ToString prints every field. A with expression builds a changed copy and leaves the original alone, which is how the H-3001 amendment keeps its audit trail. Equal records have equal hash codes, so the HashSet keeps two berths and the dictionary finds A3 with a brand new key. The last two prints show the limit: a record compares its fields with Equals, and an array compares by reference, so a copy that shares the crew array equals the original, but a copy with a cloned (equal-looking) array does not.",
      hints: [
        { id: "h1", title: "Equality and deconstruction", content: "record Berth(string Dock, int Slot); goes under the divider. berthA == berthB is true, ReferenceEquals(berthA, berthB) is false. Console.WriteLine(berthA) prints Berth { Dock = A, Slot = 3 } and var (dock, slot) = berthA; unpacks it." },
        { id: "h2", title: "with and keys", content: "Berth moved = berthA with { Slot = 7 }; The set ignores the equal duplicate, so taken.Count is 2. occupants[new Berth(\"A\", 3)] finds the value because equal records have equal hash codes." },
        { id: "h3", title: "The array trap", content: "Shipment raised = original with { Priority = 1 }; For the vessel: Vessel sharedCrew = pelican with { Operator = \"Tern Freight\" }; (same array, so equal) and Vessel clonedCrew = pelican with { Crew = (string[])pelican.Crew.Clone() }; (a different array object, so not equal). Compare with ==." },
      ],
      tests: [
        {
          id: "t1",
          description: "two equal records are == but not the same object",
          assertionCode: js`
assert(lines.includes("Same values: True"), 'Print "Same values: True": berthA == berthB compares the values of a record.');
assert(lines.includes("Same object: False"), 'Print "Same object: False" using ReferenceEquals(berthA, berthB).');
assert(lines.includes("Berth { Dock = A, Slot = 3 }"), 'Print the record itself with Console.WriteLine(berthA): the generated ToString gives "Berth { Dock = A, Slot = 3 }".');
assert(lines.includes("Dock A, slot 3"), 'Deconstruct with var (dock, slot) = berthA; and print "Dock A, slot 3".');
assertEqual(scene.berthCompare, { equal: true, sameReference: false, text: "Berth { Dock = A, Slot = 3 }" }, "berthCompare (Equal, SameReference, Text)");`,
        },
        {
          id: "t2",
          description: "with builds a changed copy and leaves the original alone",
          assertionCode: js`
assert(lines.includes("Original: Berth { Dock = A, Slot = 3 }"), 'Print "Original: Berth { Dock = A, Slot = 3 }": the with expression must not change berthA.');
assert(lines.includes("Moved: Berth { Dock = A, Slot = 7 }"), 'Print "Moved: Berth { Dock = A, Slot = 7 }".');
assertEqual(scene.berthMove, { before: "Berth { Dock = A, Slot = 3 }", after: "Berth { Dock = A, Slot = 7 }" }, "berthMove (Before, After)");`,
        },
        {
          id: "t3",
          description: "records work as set members and dictionary keys",
          assertionCode: js`
assert(lines.includes("Distinct berths: 2"), 'Print "Distinct berths: 2": the equal duplicate is ignored by the HashSet.');
assert(lines.includes("Occupant of A3: Pelican Run"), 'Print "Occupant of A3: Pelican Run": look up with a brand new Berth("A", 3).');
assertEqual(scene.berthKeys, { distinct: 2, occupant: "Pelican Run" }, "berthKeys (Distinct, Occupant)");`,
        },
        {
          id: "t4",
          description: "a shipment is amended without touching the original, and the array trap is shown",
          assertionCode: js`
assert(lines.includes("H-3001: priority 2 -> 1"), 'Print "H-3001: priority 2 -> 1" from original and raised.');
assert(lines.includes("Same shipment after amendment: False"), 'Print "Same shipment after amendment: False" (original == raised).');
assertEqual(scene.amendment.before.priority, 2, "amendment.before.priority (the original is unchanged)");
assertEqual(scene.amendment.after, { id: "H-3001", cargo: "Seed vault trays", category: "Agri", origin: "Ceres Yard", vesselId: "V-11", massKg: 820, priority: 1 }, "amendment.after");
assert(lines.includes("Copy sharing the crew array equals original: True"), 'Print "Copy sharing the crew array equals original: True": a with copy shares the same Crew array object.');
assert(lines.includes("Copy with a cloned crew array equals original: False"), 'Print "Copy with a cloned crew array equals original: False": equal-looking arrays are different objects.');`,
        },
      ],
      unlocks: ["hp-records"],
      checks: [
        {
          prompt: "`record Tag(string Name);` then `var a = new Tag(\"x\"); var b = new Tag(\"x\");` What do `a == b` and `ReferenceEquals(a, b)` give?",
          question: {
            type: "choice",
            options: ["`True` and `False`", "`False` and `False`", "`True` and `True`", "`False` and `True`"],
            answer: 0,
          },
          explanation: "A record's `==` compares values, so the two tags are equal. They are still two separate objects in memory, so reference equality is false.",
        },
        {
          prompt: "`record Order(int Id, List<string> Items);` Two orders have the same `Id` and lists with identical contents, but created separately. Are they `==`?",
          question: {
            type: "choice",
            options: [
              "No: the two `List<string>` objects are different references, and `List` has no value equality",
              "Yes: records always compare every item recursively",
              "It does not compile",
              "Yes, but only if the list is empty",
            ],
            answer: 0,
          },
          explanation: "Record equality is shallow: each field is compared with its own `Equals`. A list (like an array) compares by reference. Use an immutable collection with value semantics or override `Equals` if you need deep comparison.",
        },
        {
          prompt: "What does `copy = original with { Slot = 9 };` do to `original`?",
          question: {
            type: "choice",
            options: ["Nothing: it builds a new record and leaves `original` unchanged", "Changes `original.Slot` to 9", "Throws because records are immutable", "Changes both"],
            answer: 0,
          },
          explanation: "`with` copies all the fields into a new record and then applies the listed changes to the copy. The original stays exactly as it was.",
        },
      ],
    },

    // ───────────────────────── 7 ─────────────────────────
    {
      id: "csharp-linq-7-patterns",
      title: "Pattern matching",
      minutes: 30,
      xp: 170,
      concepts: ["switch expressions", "property patterns", "relational patterns", "logical patterns", "tuple patterns", "list patterns", "is expressions", "exhaustiveness"],
      learn: md`### Branch on the shape of the data

\`if\`/\`else if\` chains test conditions one after another. **Pattern matching** lets you describe the *shape* a value must have and pick a result in one expression. The workhorse is the **switch expression**:

~~~csharp
string label = priority switch
{
    1 => "urgent",
    2 => "normal",
    _ => "low",
};
~~~

It evaluates to a value (so it can sit on the right of \`=\` or after \`=>\`). Arms are tried **from top to bottom** and the first match wins. \`_\` is the **discard** pattern that matches anything: your default arm.

### The patterns

**Constant** (\`1\`, \`"Mail"\`, \`null\`), **relational** (\`< 500\`, \`>= 3000\`), and the logical combinators \`and\`, \`or\`, \`not\`:

~~~csharp
string BandFor(int massKg) => massKg switch
{
    < 500 => "light",
    >= 500 and < 2000 => "medium",
    _ => "heavy",
};
~~~

**Property patterns** look inside an object:

~~~csharp
string LaneFor(Shipment shipment) => shipment switch
{
    { Category: "Medical" } or { Priority: 1 } => "Express",
    { MassKg: >= 3000 } => "Heavy lift",
    { Category: "Mail" } => "Mail run",
    _ => "Standard",
};
~~~

Each \`{ Name: pattern }\` checks one property; several in one pair of braces must all match. They work as the right-hand side of \`is\` too: \`shipment is { Priority: 1, MassKg: >= 1000 }\`.

**Tuple (positional) patterns** match several values at once. Build a tuple on the left of \`switch\`:

~~~csharp
string HandlingFor(Shipment shipment) => (shipment.Category, shipment.MassKg) switch
{
    ("Fuel", >= 4000) => "Pressure dock",
    ("Fuel", _) => "Fuel dock",
    ("Medical" or "Agri", _) => "Cold storage",
    (_, >= 3000) => "Heavy crane",
    _ => "Open bay",
};
~~~

**List patterns** match the elements of an array or list by position:

~~~csharp
string DescribeRoute(string[] stops) => stops switch
{
    [] => "no stops",
    [var only] => only + " only",
    [var first, .., var last] => first + " to " + last,
};
~~~

\`..\` is the **slice** pattern: "any number of elements here". It may capture them: \`[var first, .. var middle, var last]\` gives \`middle\` as the in-between elements (an array for an array input).

**Type patterns** (\`string s\`, \`Truck t\`) and \`is not null\` complete the set. You have already used \`is not null\`.

### The compiler is your safety net

- Put a **broader** pattern before a narrower one and the narrower arm can never run. The compiler says \`error CS8510: The pattern is unreachable. It has already been handled by a previous arm of the switch expression or it is impossible to match.\` Order arms from most specific to least specific.
- If your arms do not cover every possible input, you get warning CS8509 ("The switch expression does not handle all possible values of its input type"), and a value that slips through throws at run time: \`SwitchExpressionException: Non-exhaustive switch expression failed to match its input.\` followed by the unmatched value. A final \`_\` arm (or a pattern that really covers everything) prevents it. For an \`enum\` consider leaving *out* the \`_\` arm on purpose, so adding a new enum member makes the compiler warn you about every switch that forgot it. (The build board shows errors, not warnings; in an editor like Visual Studio or Rider the warning is a squiggle.)

### \`when\`: an arm with an extra condition

~~~csharp
shipment switch
{
    { Category: "Fuel" } when shipment.MassKg > 4000 => "Escort required",
    _ => "Normal",
}
~~~

Use \`when\` only when the condition cannot be written as a pattern; patterns are checked more thoroughly by the compiler.

### Switch statement vs expression

A \`switch\` **statement** runs code per case and needs \`break\`. An expression returns a value and has no fallthrough. Prefer the expression whenever the job is "compute one value from this input".

### Common mistakes

- Arm order: a general pattern above a specific one.
- Forgetting the discard arm and meeting a \`SwitchExpressionException\` in production.
- Writing \`case\` and \`:\` in an expression (it uses \`=>\` and commas).
- Using \`==\` against several values (\`x == 1 || 2\`) instead of \`x is 1 or 2\`.`,
      mission: md`Cargo at Halyard Port is triaged the moment it is scanned: urgent and medical goods go to the express lane, big loads need the heavy lift, and the rest is sorted by weight band. The old triage code was a thicket of \`if\`/\`else\` that nobody dared to touch, and last month it sent a crate of insulin to the heavy crane.

You will rewrite the rules as switch expressions: property patterns for lanes, relational patterns for weight bands, tuple patterns for handling, and a list pattern that describes a route. When this lesson passes, the **Triage lanes** panel sorts every shipment into its lane.`,
      tasks: [
        "Write a local function string LaneFor(Shipment shipment) using a switch expression with property patterns: Medical category or Priority 1 gives \"Express\"; MassKg of 3000 or more gives \"Heavy lift\"; Category \"Mail\" gives \"Mail run\"; anything else \"Standard\". Build lanes with Select into new { shipment.Id, Lane = LaneFor(shipment) } (as a list) and laneCounts as a Dictionary<string, int> via GroupBy. Print Express: 4 and the other lane counts as Heavy lift: 2, Mail run: 2, Standard: 6 and Urgent and heavy: 1 using an is pattern { Priority: 1, MassKg: >= 1000 } with Count",
        "Write string BandFor(int massKg) with relational patterns (under 500 light, under 2000 medium, otherwise heavy) and build Dictionary<string, int> bandCounts. Print Bands: light 6, medium 5, heavy 3",
        "Write string HandlingFor(Shipment shipment) switching on the tuple (Category, MassKg): Fuel and 4000 or more is \"Pressure dock\", other Fuel is \"Fuel dock\", Medical or Agri is \"Cold storage\", anything 3000 or more is \"Heavy crane\", the rest \"Open bay\". Build handlingCounts. Print Handling: Cold storage 6, Pressure dock 1, Heavy crane 1, Fuel dock 1, Open bay 5 (in the order of first appearance in the manifest: print them with that exact text)",
        "Write string DescribeRoute(string[] stops) with list patterns: [] is \"no stops\", one stop is \"<stop> only\", two stops is \"<first> to <last>, direct\", more is \"<first> to <last> via <n> stops\" (n from a slice). Describe the four routes given in the starter and print each. Port.Show lanes, laneCounts, bandCounts, handlingCounts and routeSummaries",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 7: triage with pattern matching.
// 1. string LaneFor(Shipment shipment) => shipment switch { { Category: "Medical" } or { Priority: 1 } => "Express", { MassKg: >= 3000 } => "Heavy lift", ... };
//    var lanes = shipments.Select(shipment => new { shipment.Id, Lane = LaneFor(shipment) }).ToList();
//    Dictionary<string, int> laneCounts = shipments.GroupBy(LaneFor).ToDictionary(bucket => bucket.Key, bucket => bucket.Count());
//    print  Express: 4   Heavy lift: 2   Mail run: 2   Standard: 6
//    int urgentHeavy = shipments.Count(shipment => shipment is { Priority: 1, MassKg: >= 1000 });   print  Urgent and heavy: 1
// 2. string BandFor(int massKg) => massKg switch { < 500 => "light", ... };   Dictionary<string, int> bandCounts
//    print  Bands: light 6, medium 5, heavy 3
// 3. string HandlingFor(Shipment shipment) => (shipment.Category, shipment.MassKg) switch { ("Fuel", >= 4000) => "Pressure dock", ... };
//    print  Handling: Cold storage 6, Pressure dock 1, Heavy crane 1, Fuel dock 1, Open bay 5   (build handlingCounts first, then print its values in that order)
// 4. string DescribeRoute(string[] stops) => stops switch { [] => ..., [var only] => ..., [var first, var last] => ..., [var first, .. var between, var last] => ... };
string[][] routes =
{
    new string[0],
    new[] { "Ceres Yard" },
    new[] { "Ceres Yard", "Vesta Dock" },
    new[] { "Luna Gate", "Ceres Yard", "Vesta Dock", "Phobos Spur" },
};
//    List<string> routeSummaries = routes.Select(DescribeRoute).ToList();   print each one
// Port.Show: lanes, laneCounts, bandCounts, handlingCounts, routeSummaries
`,
      solutionAdd: cs`// Lesson 7: triage with patterns.
string LaneFor(Shipment shipment) => shipment switch
{
    { Category: "Medical" } or { Priority: 1 } => "Express",
    { MassKg: >= 3000 } => "Heavy lift",
    { Category: "Mail" } => "Mail run",
    _ => "Standard",
};

var lanes = shipments.Select(shipment => new { shipment.Id, Lane = LaneFor(shipment) }).ToList();
Dictionary<string, int> laneCounts = shipments
    .GroupBy(LaneFor)
    .ToDictionary(bucket => bucket.Key, bucket => bucket.Count());
foreach (string laneName in new[] { "Express", "Heavy lift", "Mail run", "Standard" })
{
    Console.WriteLine($"{laneName}: {laneCounts[laneName]}");
}
int urgentHeavy = shipments.Count(shipment => shipment is { Priority: 1, MassKg: >= 1000 });
Console.WriteLine($"Urgent and heavy: {urgentHeavy}");

string BandFor(int massKg) => massKg switch
{
    < 500 => "light",
    < 2000 => "medium",
    _ => "heavy",
};
Dictionary<string, int> bandCounts = shipments
    .GroupBy(shipment => BandFor(shipment.MassKg))
    .ToDictionary(bucket => bucket.Key, bucket => bucket.Count());
Console.WriteLine($"Bands: light {bandCounts["light"]}, medium {bandCounts["medium"]}, heavy {bandCounts["heavy"]}");

string HandlingFor(Shipment shipment) => (shipment.Category, shipment.MassKg) switch
{
    ("Fuel", >= 4000) => "Pressure dock",
    ("Fuel", _) => "Fuel dock",
    ("Medical" or "Agri", _) => "Cold storage",
    (_, >= 3000) => "Heavy crane",
    _ => "Open bay",
};
Dictionary<string, int> handlingCounts = shipments
    .GroupBy(HandlingFor)
    .ToDictionary(bucket => bucket.Key, bucket => bucket.Count());
Console.WriteLine($"Handling: Cold storage {handlingCounts["Cold storage"]}, Pressure dock {handlingCounts["Pressure dock"]}, Heavy crane {handlingCounts["Heavy crane"]}, Fuel dock {handlingCounts["Fuel dock"]}, Open bay {handlingCounts["Open bay"]}");

string DescribeRoute(string[] stops) => stops switch
{
    [] => "no stops",
    [var only] => $"{only} only",
    [var first, var last] => $"{first} to {last}, direct",
    [var first, .. var between, var last] => $"{first} to {last} via {between.Length} stops",
};
string[][] routes =
{
    new string[0],
    new[] { "Ceres Yard" },
    new[] { "Ceres Yard", "Vesta Dock" },
    new[] { "Luna Gate", "Ceres Yard", "Vesta Dock", "Phobos Spur" },
};
List<string> routeSummaries = routes.Select(DescribeRoute).ToList();
foreach (string summary in routeSummaries)
{
    Console.WriteLine($"Route: {summary}");
}

Port.Show("lanes", lanes);
Port.Show("laneCounts", laneCounts);
Port.Show("bandCounts", bandCounts);
Port.Show("handlingCounts", handlingCounts);
Port.Show("routeSummaries", routeSummaries);`,
      explanation:
        "Each local function is one switch expression. In LaneFor the arms are tried top to bottom: a Medical or priority-1 shipment is Express before the weight rule can send it to the heavy lift, which is why the 1800 kg priority-1 Fuel pellets go Express. BandFor uses relational patterns, so no && is needed. HandlingFor matches a (Category, MassKg) tuple, with the specific Fuel arms before the general ones. DescribeRoute uses list patterns: [] for none, [var only], [var first, var last] for two, and a slice pattern for the rest, whose captured middle has .Length. GroupBy with a method group (LaneFor) groups by whatever the function returns.",
      hints: [
        { id: "h1", title: "Order of arms", content: "Put the narrow rules first: { Category: \"Medical\" } or { Priority: 1 } => \"Express\", then { MassKg: >= 3000 } => \"Heavy lift\", then { Category: \"Mail\" }, and _ => \"Standard\" last. The first matching arm wins." },
        { id: "h2", title: "Counting by a function", content: "shipments.GroupBy(LaneFor).ToDictionary(bucket => bucket.Key, bucket => bucket.Count()) works because LaneFor takes a Shipment and returns a string. For bands use .GroupBy(shipment => BandFor(shipment.MassKg))." },
        { id: "h3", title: "List patterns", content: "[] => \"no stops\", [var only] => ..., [var first, var last] => ..., [var first, .. var between, var last] => $\"{first} to {last} via {between.Length} stops\". The two-element arm must come before the slice arm (which also matches two) so that it wins." },
      ],
      tests: [
        {
          id: "t1",
          description: "property patterns sort every shipment into a lane",
          assertionCode: js`
assert(Array.isArray(scene.lanes) && scene.lanes.length === 14, 'Send the 14 lane rows with Port.Show("lanes", lanes);');
assertEqual(scene.lanes.find((l) => l.id === "H-3010").lane, "Express", "H-3010 (1800 kg, priority 1) goes Express because the Express arm comes before any weight rule");
assertEqual(scene.lanes.find((l) => l.id === "H-3004").lane, "Heavy lift", "H-3004 (3100 kg)");
assertEqual(scene.lanes.find((l) => l.id === "H-3014").lane, "Mail run", "H-3014 (mail)");
assertEqual(scene.laneCounts, { Standard: 6, Express: 4, "Heavy lift": 2, "Mail run": 2 }, "laneCounts");
assert(lines.includes("Express: 4") && lines.includes("Heavy lift: 2") && lines.includes("Mail run: 2") && lines.includes("Standard: 6"), 'Print "Express: 4", "Heavy lift: 2", "Mail run: 2" and "Standard: 6".');
assert(lines.includes("Urgent and heavy: 1"), 'Print "Urgent and heavy: 1": shipments.Count(shipment => shipment is { Priority: 1, MassKg: >= 1000 }).');`,
        },
        {
          id: "t2",
          description: "relational patterns band the weights",
          assertionCode: js`
assertEqual(scene.bandCounts, { light: 6, medium: 5, heavy: 3 }, "bandCounts (under 500 / under 2000 / the rest)");
assert(lines.includes("Bands: light 6, medium 5, heavy 3"), 'Print "Bands: light 6, medium 5, heavy 3".');`,
        },
        {
          id: "t3",
          description: "a tuple pattern chooses the handling",
          assertionCode: js`
assertEqual(scene.handlingCounts, { "Cold storage": 6, "Pressure dock": 1, "Heavy crane": 1, "Fuel dock": 1, "Open bay": 5 }, "handlingCounts");
assert(lines.includes("Handling: Cold storage 6, Pressure dock 1, Heavy crane 1, Fuel dock 1, Open bay 5"), 'Print "Handling: Cold storage 6, Pressure dock 1, Heavy crane 1, Fuel dock 1, Open bay 5".');`,
        },
        {
          id: "t4",
          description: "list patterns describe routes of any length",
          assertionCode: js`
assertEqual(scene.routeSummaries, ["no stops", "Ceres Yard only", "Ceres Yard to Vesta Dock, direct", "Luna Gate to Phobos Spur via 2 stops"], "routeSummaries");
assert(lines.includes("Route: Luna Gate to Phobos Spur via 2 stops"), 'Print each summary as "Route: <summary>".');`,
        },
      ],
      unlocks: ["hp-lanes"],
      checks: [
        {
          prompt: "Why does this not compile?\n\n~~~csharp\nstring Size(int kg) => kg switch\n{\n    _ => \"any\",\n    < 100 => \"small\",\n};\n~~~",
          question: {
            type: "choice",
            options: [
              "The `< 100` arm can never run because `_` above it already matches everything (CS8510)",
              "Switch expressions cannot use relational patterns",
              "`_` must be written as `default`",
              "Arms must be sorted alphabetically",
            ],
            answer: 0,
          },
          explanation: "Arms are tried top to bottom and the first match wins, so a catch-all above a specific pattern makes the specific one unreachable. The compiler tells you (\"The pattern is unreachable...\"). Put `_` last.",
        },
        {
          prompt: "What happens at run time if a switch expression has no arm for the value it receives?",
          question: {
            type: "choice",
            options: [
              "It throws `SwitchExpressionException` (\"Non-exhaustive switch expression failed to match its input\")",
              "It returns `null`",
              "It silently picks the last arm",
              "The program ends with exit code 0 and no message",
            ],
            answer: 0,
          },
          explanation: "A switch expression must produce a value, so an unmatched input is an error. The compiler warns about non-exhaustive switches (CS8509), and a final `_` arm removes the risk when a default makes sense.",
        },
        {
          prompt: "Which pattern matches an array with at least two elements and names the first and the last?",
          question: {
            type: "choice",
            options: ["`[var first, .., var last]`", "`[first, last]`", "`{ first, last }`", "`(var first, var last)`"],
            answer: 0,
          },
          explanation: "In a list pattern `..` means any number of elements (including none), so `[var first, .., var last]` needs at least two elements: one at each end.",
        },
      ],
    },

    // ───────────────────────── 8 ─────────────────────────
    {
      id: "csharp-linq-8-interfaces",
      title: "Interfaces and contracts",
      minutes: 30,
      xp: 180,
      concepts: ["interfaces", "implementing an interface", "polymorphism", "IComparable<T>", "IEquatable<T>", "GetHashCode", "programming to an interface"],
      learn: md`### A promise about what a type can do

An **interface** lists members (properties, methods) without saying how they work. A type that **implements** the interface promises to provide every member. Code that only needs the promise can work with any such type, and does not care which one it got.

~~~csharp
interface ILoadable
{
    string Label { get; }
    int MassKg { get; }
}

class Crate : ILoadable
{
    public Crate(string id, int massKg) { Id = id; MassKg = massKg; }
    public string Id { get; }
    public int MassKg { get; }
    public string Label => $"Crate {Id}";
}

class PassengerParty : ILoadable
{
    public PassengerParty(string family, int people) { Family = family; People = people; }
    public string Family { get; }
    public int People { get; }
    public int MassKg => People * 95;
    public string Label => $"{Family} party of {People}";
}
~~~

Now one method can handle both:

~~~csharp
int TotalMass(IEnumerable<ILoadable> items) => items.Sum(item => item.MassKg);
~~~

A \`Crate\` and a \`PassengerParty\` have nothing in common except the contract, and that is all \`TotalMass\` needs. This is **polymorphism**: one call, different behaviour depending on the real object. By convention interface names start with \`I\`.

If you forget a member, the compiler stops you: \`error CS0535: 'Crate' does not implement interface member 'ILoadable.Label'\`.

### Interface or base class?

A class can inherit from **one** base class but implement **many** interfaces. An interface carries no state (no fields) and says *what*; a base class can share code and fields and says *is a kind of*. Reach for an interface when unrelated types should be usable the same way, or when you want to swap implementations (a fake one in a test, a real one in production). Modern C# allows *default* method bodies inside interfaces, but treat that as a niche tool.

Variables can be typed as the interface: \`ILoadable item = new Crate("H-3001", 820);\` and \`List<ILoadable>\` can hold both kinds. You can call only the interface's members through that variable; to get at crate-only members you need a type pattern (\`item is Crate crate\`).

### The two interfaces you will implement most: \`IComparable<T>\` and \`IEquatable<T>\`

The library calls these to find out **order** and **equality** for your own types.

**\`IComparable<T>\`** has one method, \`int CompareTo(T? other)\`. Return a negative number if *this* sorts before \`other\`, zero if they tie, positive if this sorts after. Once a type has it, \`list.Sort()\`, \`Array.Sort\`, \`Min()\`, \`Max()\` and \`OrderBy(x => x)\` know how to order it:

~~~csharp
public int CompareTo(Crate? other)
{
    if (other is null) return 1;                       // anything sorts after "nothing"
    int byMass = other.MassKg.CompareTo(MassKg);       // swapped operands: heavier first
    return byMass != 0 ? byMass : string.CompareOrdinal(Id, other.Id);   // tie-break on id
}
~~~

Watch the direction: with "heavier first" the **heaviest** crate is the *smallest* in sort order, so \`Max()\` returns the lightest. The interface defines "comes first", not "bigger".

Without it, sorting a list of your own class throws \`InvalidOperationException: Failed to compare two elements in the array.\` (the real cause, "At least one object must implement IComparable", is in the inner exception).

**\`IEquatable<T>\`** has \`bool Equals(T? other)\`. It tells \`HashSet<T>\`, \`Dictionary<K,V>\`, \`Contains\` and \`Distinct\` when two objects count as the same thing. Implementing it comes with a rule you must follow: **override \`Equals(object?)\` and \`GetHashCode()\` as well, and make sure that equal objects return equal hash codes.** Collections find an item by hash code first; if two objects you call equal produce different hashes, the set will happily store both.

~~~csharp
public bool Equals(Crate? other) => other is not null && string.Equals(Id, other.Id, StringComparison.OrdinalIgnoreCase);
public override bool Equals(object? obj) => Equals(obj as Crate);
public override int GetHashCode() => Id.ToUpperInvariant().GetHashCode();
~~~

(Case-insensitive equality needs a hash of the same normalised text.) A \`record\` writes all of this for you; reach for a hand-written version when equality should depend on only some fields, such as an id.

### Common mistakes

- Overriding \`Equals\` and forgetting \`GetHashCode\`, or hashing fields that \`Equals\` ignores.
- Getting \`CompareTo\` backwards, or letting it disagree with \`Equals\`.
- Making an interface huge. Small, focused interfaces (one or two members) are easy to implement and to fake.
- Checking \`if (item is Crate)\` all over the place. If you keep doing that, a member is missing from the interface.`,
      mission: md`Halyard Port loads crates and also boards passenger parties, and the safety officer wants one number for either: how heavy is this departure? The loading software treated them as two unrelated worlds, so every report was a copy-pasted pair of loops.

You will describe what both have in common as an interface, make the crate sortable and comparable by identity, and write code against the interface only. When this lesson passes, the **Load contracts** panel shows the mixed boarding list and the sorted crates.`,
      tasks: [
        "Under the divider declare interface ILoadable { string Label { get; } int MassKg { get; } }, class Crate (Id, Cargo, MassKg, Label as \"<Id> <Cargo>\") and class PassengerParty (Family, People, 95 kg per person, Label \"<Family> party of <People>\"), both implementing ILoadable. Above, build List<ILoadable> cabin with Crate H-3001 Seed vault trays 820, PassengerParty Okonkwo 3, Crate H-3002 Insulin cold packs 140. Print one line per item like Okonkwo party of 3: 285 kg and then Boarding mass: 1245 kg",
        "Make Crate implement IComparable<Crate>: heavier crates first, ties by Id (string.CompareOrdinal). Build List<Crate> crates from the shipments (Id, Cargo, MassKg), call crates.Sort() and print Heaviest crates: H-3003, H-3004, H-3006, H-3010, H-3012 (the first five Ids)",
        "Make Crate implement IEquatable<Crate>: equal when the Id matches ignoring case, with Equals(object?) and a matching GetHashCode. Put the crates in a HashSet<Crate> uniqueCrates and try to Add new Crate(\"h-3003\", \"Reactor coolant (re-entered)\", 4200). Print Duplicate crate added: False and Crates kept: 14",
        "Write a local function ILoadable HeaviestOf(IEnumerable<ILoadable> items) using MaxBy. Print Heaviest on the cabin manifest: H-3001 Seed vault trays and Heaviest crate: H-3003 Reactor coolant (call it with crates too). Port.Show loadables (new { item.Label, item.MassKg } for the cabin), boardingKg, heaviestCrates (the first five crate Ids) and crateDedupe (new { Offered, Kept })",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 8: describe what loadable things have in common.
// 1. List<ILoadable> cabin = new() { new Crate("H-3001", "Seed vault trays", 820), new PassengerParty("Okonkwo", 3), new Crate("H-3002", "Insulin cold packs", 140) };
//    print each  <Label>: <MassKg> kg  (e.g. "Okonkwo party of 3: 285 kg")   then  Boarding mass: 1245 kg
// 2. List<Crate> crates from shipments (Id, Cargo, MassKg);  crates.Sort();   (heavier first, tie on Id)
//    print  Heaviest crates: H-3003, H-3004, H-3006, H-3010, H-3012
// 3. HashSet<Crate> uniqueCrates = new(crates);   bool addedAgain = uniqueCrates.Add(new Crate("h-3003", "Reactor coolant (re-entered)", 4200));
//    print  Duplicate crate added: False   and   Crates kept: 14
// 4. ILoadable HeaviestOf(IEnumerable<ILoadable> items) => items.MaxBy(item => item.MassKg)!;
//    print  Heaviest on the cabin manifest: H-3001 Seed vault trays   and   Heaviest crate: H-3003 Reactor coolant
// Port.Show: loadables, boardingKg, heaviestCrates, crateDedupe (new { Offered, Kept })

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare the contract and its two implementations here.
//   interface ILoadable { string Label { get; } int MassKg { get; } }
//   class Crate : ILoadable, IComparable<Crate>, IEquatable<Crate> { ... }       (Id, Cargo, MassKg, Label, CompareTo, Equals, GetHashCode)
//   class PassengerParty : ILoadable { ... }                                     (Family, People, MassKg = People * 95, Label)
`,
      solutionAdd: cs`// Lesson 8: interfaces and contracts.
List<ILoadable> cabin = new()
{
    new Crate("H-3001", "Seed vault trays", 820),
    new PassengerParty("Okonkwo", 3),
    new Crate("H-3002", "Insulin cold packs", 140),
};
foreach (ILoadable item in cabin)
{
    Console.WriteLine($"{item.Label}: {item.MassKg} kg");
}
int boardingKg = cabin.Sum(item => item.MassKg);
Console.WriteLine($"Boarding mass: {boardingKg} kg");

List<Crate> crates = shipments.Select(shipment => new Crate(shipment.Id, shipment.Cargo, shipment.MassKg)).ToList();
crates.Sort();
List<string> heaviestCrates = crates.Take(5).Select(crate => crate.Id).ToList();
Console.WriteLine($"Heaviest crates: {string.Join(", ", heaviestCrates)}");

HashSet<Crate> uniqueCrates = new(crates);
bool addedAgain = uniqueCrates.Add(new Crate("h-3003", "Reactor coolant (re-entered)", 4200));
Console.WriteLine($"Duplicate crate added: {addedAgain}");
Console.WriteLine($"Crates kept: {uniqueCrates.Count}");

ILoadable HeaviestOf(IEnumerable<ILoadable> items) => items.MaxBy(item => item.MassKg)!;
Console.WriteLine($"Heaviest on the cabin manifest: {HeaviestOf(cabin).Label}");
Console.WriteLine($"Heaviest crate: {HeaviestOf(crates).Label}");

Port.Show("loadables", cabin.Select(item => new { item.Label, item.MassKg }));
Port.Show("boardingKg", boardingKg);
Port.Show("heaviestCrates", heaviestCrates);
Port.Show("crateDedupe", new { Offered = crates.Count + 1, Kept = uniqueCrates.Count });

${TYPES_DIVIDER}

// What anything that can be loaded onto a vessel must be able to report.
interface ILoadable
{
    string Label { get; }
    int MassKg { get; }
}

// A crate sorts heaviest first and is the same crate when the Id matches, whatever the letter case.
class Crate : ILoadable, IComparable<Crate>, IEquatable<Crate>
{
    public Crate(string id, string cargo, int massKg)
    {
        Id = id;
        Cargo = cargo;
        MassKg = massKg;
    }

    public string Id { get; }
    public string Cargo { get; }
    public int MassKg { get; }
    public string Label => $"{Id} {Cargo}";

    public int CompareTo(Crate? other)
    {
        if (other is null) return 1;
        int byMass = other.MassKg.CompareTo(MassKg);
        return byMass != 0 ? byMass : string.CompareOrdinal(Id, other.Id);
    }

    public bool Equals(Crate? other) => other is not null && string.Equals(Id, other.Id, StringComparison.OrdinalIgnoreCase);

    public override bool Equals(object? obj) => Equals(obj as Crate);

    public override int GetHashCode() => Id.ToUpperInvariant().GetHashCode();
}

// A group of passengers boarding together: 95 kg each, with luggage.
class PassengerParty : ILoadable
{
    const int KgPerPerson = 95;

    public PassengerParty(string family, int people)
    {
        Family = family;
        People = people;
    }

    public string Family { get; }
    public int People { get; }
    public int MassKg => People * KgPerPerson;
    public string Label => $"{Family} party of {People}";
}`,
      explanation:
        "ILoadable is the contract; Crate and PassengerParty fulfil it in different ways, so cabin can hold both and TotalMass-style code (Sum, HeaviestOf) only ever talks to ILoadable. IComparable<Crate> gives Sort() its rule (heavier first, then by Id), so the first five crates after sorting are the five heaviest. IEquatable<Crate> plus matching Equals(object?) and GetHashCode make the HashSet treat h-3003 and H-3003 as the same crate (the hash is computed from the upper-cased Id, so equal crates always hash alike), and the re-entered one is refused. Covariance lets List<Crate> be passed where IEnumerable<ILoadable> is expected.",
      hints: [
        { id: "h1", title: "Declare the contract", content: "interface ILoadable { string Label { get; } int MassKg { get; } } Then class Crate : ILoadable with a constructor (string id, string cargo, int massKg), get-only properties Id/Cargo/MassKg, and public string Label => $\"{Id} {Cargo}\"; PassengerParty has public int MassKg => People * 95;" },
        { id: "h2", title: "CompareTo direction", content: "For heavier first swap the operands: int byMass = other.MassKg.CompareTo(MassKg); return byMass != 0 ? byMass : string.CompareOrdinal(Id, other.Id); Handle other is null by returning 1." },
        { id: "h3", title: "Equals and GetHashCode", content: "public bool Equals(Crate? other) => other is not null && string.Equals(Id, other.Id, StringComparison.OrdinalIgnoreCase); public override bool Equals(object? obj) => Equals(obj as Crate); public override int GetHashCode() => Id.ToUpperInvariant().GetHashCode(); Equal crates must produce equal hash codes." },
      ],
      tests: [
        {
          id: "t1",
          description: "one list holds crates and passenger parties, and one loop reports both",
          assertionCode: js`
assert(lines.includes("H-3001 Seed vault trays: 820 kg"), 'Print "H-3001 Seed vault trays: 820 kg": a Crate\'s Label is "<Id> <Cargo>".');
assert(lines.includes("Okonkwo party of 3: 285 kg"), 'Print "Okonkwo party of 3: 285 kg": a PassengerParty weighs 95 kg per person.');
assert(lines.includes("Boarding mass: 1245 kg"), 'Print "Boarding mass: 1245 kg" (820 + 285 + 140), summed through the ILoadable interface.');
assertEqual(scene.boardingKg, 1245, "boardingKg");
assertEqual(scene.loadables, [{ label: "H-3001 Seed vault trays", massKg: 820 }, { label: "Okonkwo party of 3", massKg: 285 }, { label: "H-3002 Insulin cold packs", massKg: 140 }], "loadables (Label, MassKg for each cabin item)");`,
        },
        {
          id: "t2",
          description: "IComparable<Crate> makes Sort() put the heaviest crates first",
          assertionCode: js`
assert(lines.includes("Heaviest crates: H-3003, H-3004, H-3006, H-3010, H-3012"), 'Print "Heaviest crates: H-3003, H-3004, H-3006, H-3010, H-3012": implement CompareTo so heavier crates sort first, then call crates.Sort().');
assertEqual(scene.heaviestCrates, ["H-3003", "H-3004", "H-3006", "H-3010", "H-3012"], "heaviestCrates");`,
        },
        {
          id: "t3",
          description: "IEquatable<Crate> and GetHashCode make a re-entered crate a duplicate",
          assertionCode: js`
assert(lines.includes("Duplicate crate added: False"), 'Print "Duplicate crate added: False": "h-3003" and "H-3003" must count as the same crate (compare ids ignoring case, and hash the normalised id).');
assert(lines.includes("Crates kept: 14"), 'Print "Crates kept: 14".');
assertEqual(scene.crateDedupe, { offered: 15, kept: 14 }, "crateDedupe (Offered, Kept)");`,
        },
        {
          id: "t4",
          description: "code written against the interface handles either kind",
          assertionCode: js`
assert(lines.includes("Heaviest on the cabin manifest: H-3001 Seed vault trays"), 'Print "Heaviest on the cabin manifest: H-3001 Seed vault trays" using HeaviestOf(cabin).Label.');
assert(lines.includes("Heaviest crate: H-3003 Reactor coolant"), 'Print "Heaviest crate: H-3003 Reactor coolant": a List<Crate> can be passed as IEnumerable<ILoadable>.');`,
        },
      ],
      unlocks: ["hp-contracts"],
      checks: [
        {
          prompt: "You override `Equals(object?)` on a class to compare ids but leave `GetHashCode()` alone. What goes wrong?",
          question: {
            type: "choice",
            options: [
              "A `HashSet` or `Dictionary` can store two objects you consider equal, because they hash to different buckets",
              "The program no longer compiles",
              "`Equals` stops being called",
              "Nothing: the hash code is never used",
            ],
            answer: 0,
          },
          explanation: "Hash-based collections look at the hash code first. Equal objects must produce equal hash codes, otherwise the collection never even compares them with `Equals` and silently keeps duplicates.",
        },
        {
          prompt: "A class implements `IComparable<Crate>` with `CompareTo` returning `other.MassKg.CompareTo(MassKg)` (operands swapped). What does `crates.Max()` return?",
          question: {
            type: "choice",
            options: ["The lightest crate, because it sorts last", "The heaviest crate", "The first crate in the list", "It throws"],
            answer: 0,
          },
          explanation: "`Max()` uses `CompareTo` and returns the element that sorts last. With heavier-first ordering that is the lightest crate. The interface defines \"comes first\", not \"is bigger\".",
        },
        {
          prompt: "What is the main benefit of writing `int Total(IEnumerable<ILoadable> items)` instead of two methods, one for crates and one for parties?",
          question: {
            type: "choice",
            options: [
              "One method works for every type that fulfils the contract, including types written later",
              "It runs faster",
              "It avoids having to write `MassKg`",
              "Interfaces make methods static",
            ],
            answer: 0,
          },
          explanation: "Code that depends on a small contract rather than on concrete classes does not change when a new loadable type appears, and it is easy to test with a fake implementation.",
        },
      ],
    },
  ],
};
