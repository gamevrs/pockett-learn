import type { Chapter } from "@/engine/types";
import { TYPES_DIVIDER } from "../../../engine/compose.ts";
import { FILE_HEAD, PORT_PROVIDED } from "./provided.ts";
import { cs, js, md } from "./util.ts";

/**
 * Chapter 1: Collections and LINQ. Choose the right container, then ask the manifest questions.
 *
 * Lesson 1 carries the provided file head (nullable switch + usings), the port's standing data
 * (Shipment, Vessel, PortData) and the `Port` helper under the types divider.
 */

export const chapter1: Chapter = {
  id: "collections-and-linq",
  title: "Collections and LINQ",
  blurb: "Pick the container that fits the question, then query it with LINQ: filter, sort, group, join.",
  lessons: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "csharp-linq-1-collections",
      title: "Choosing the right collection",
      minutes: 25,
      xp: 120,
      concepts: ["HashSet<T>", "Queue<T>", "Stack<T>", "SortedDictionary", "set operations", "choosing a collection"],
      learn: md`### The question decides the container

You already use \`List<T>\` for "a bunch of things in order" and \`Dictionary<K,V>\` for "look it up by key". Real data keeps asking other questions:

- *Have I seen this one before?*
- *Who is next in line?*
- *What did I do last, so I can undo it?*
- *Show me everything in alphabetical order, even though items arrive in any order.*

The .NET library has a container built for each of those. Choosing one is mostly choosing the **question** your code asks most often, because the right container answers that question quickly and makes the wrong operation impossible or awkward.

### \`HashSet<T>\`: every value at most once

A set remembers which values it holds and ignores repeats.

~~~csharp
HashSet<string> callsigns = new();
bool first = callsigns.Add("KESTREL");    // true: it was new
bool again = callsigns.Add("KESTREL");    // false: already inside, nothing changed
bool known = callsigns.Contains("KESTREL"); // true, and fast however large the set is
~~~

\`Add\` returns a \`bool\` that tells you whether the set actually changed. That one return value is often all the "have I seen this?" logic you need. \`Contains\` is quick because the set uses each value's hash code to jump straight to the right spot instead of scanning, which is what \`List<T>.Contains\` has to do.

Sets also do set arithmetic on whole collections: \`UnionWith\` (everything from both), \`IntersectWith\` (only what both share), \`ExceptWith\` (remove these), \`Overlaps\`, \`IsSubsetOf\`. These methods **change the set you call them on**, so copy first when you need the original: \`new HashSet<string>(origins)\`.

Two things a set is *not*: it has no index (\`set[0]\` does not compile) and it makes no promise about enumeration order. Never write code that depends on which element comes out first.

### \`Queue<T>\`: first in, first out

Think of a line at the dock. \`Enqueue\` joins the back, \`Dequeue\` takes from the front, \`Peek\` looks at the front without removing it.

~~~csharp
Queue<string> line = new();
line.Enqueue("A");
line.Enqueue("B");
string served = line.Dequeue();   // "A"
string next = line.Peek();        // "B", still in the queue
~~~

Dequeue or Peek on an empty queue throws \`InvalidOperationException: Queue empty.\` When "nothing there" is a normal situation, use \`TryDequeue(out var item)\` or check \`Count\` first. Queues are the right tool for work lists, message buffers and "serve in arrival order" rules.

### \`Stack<T>\`: last in, first out

A stack hands things back in the **reverse** order you gave them. \`Push\` adds on top, \`Pop\` removes the top, \`Peek\` reads it.

~~~csharp
Stack<string> undo = new();
undo.Push("typed A");
undo.Push("typed B");
string last = undo.Pop();   // "typed B"
~~~

An empty stack throws \`InvalidOperationException: Stack empty.\` Undo history, "go back" navigation and checking that brackets close in the right order are all stack problems. One surprise: if you \`foreach\` over a stack you see the **newest** item first.

### \`SortedDictionary<K,V>\`: a dictionary that keeps its keys in order

A normal \`Dictionary\` is built for speed of lookup and promises nothing about the order you read items back in. \`SortedDictionary\` pays a little speed (lookups take time proportional to the logarithm of the size instead of constant time) to keep the keys sorted at all times, so a \`foreach\` is always in key order.

~~~csharp
SortedDictionary<string, int> tonnage = new(StringComparer.Ordinal);
tonnage["Mail"] = 450;
tonnage["Agri"] = 2180;
foreach (var (category, kg) in tonnage) { }   // Agri first, then Mail
~~~

Passing a comparer such as \`StringComparer.Ordinal\` states the sort rule out loud, so the order never depends on a culture setting. Reading a key that is missing with the indexer throws \`KeyNotFoundException: The given key 'Z' was not present in the dictionary.\` Use \`TryGetValue\` or \`GetValueOrDefault\` when a key might not be there, exactly as with \`Dictionary\`. (You will meet \`SortedList\`, which stores the same pairs in two arrays: less memory, slower inserts. Reach for it only when the data is built once and read many times.)

### A quick chooser

Match your most frequent question to a container:

- Keep items in order, index into them, append: \`List<T>\`
- Look a value up by a key: \`Dictionary<K,V>\`
- Ignore duplicates, or ask "is it in there?": \`HashSet<T>\`
- Serve things in arrival order: \`Queue<T>\`
- Undo, or process the newest first: \`Stack<T>\`
- Read keyed data back in key order: \`SortedDictionary<K,V>\`

### Common mistakes

- Using \`list.Contains(x)\` inside a loop over thousands of items. Each call scans the list; put the values in a \`HashSet\` once.
- Expecting a \`HashSet\` or \`Dictionary\` to enumerate in insertion or sorted order.
- Changing a collection while a \`foreach\` is walking it: \`InvalidOperationException: Collection was modified; enumeration operation may not execute.\` Collect the changes first, apply them after the loop.
- Calling \`Dequeue\`/\`Pop\` without checking that something is there.`,
      mission: md`Halyard Port is an orbital spaceport: freighters arrive from the Ceres Yard, Luna Gate and Vesta Dock carrying cargo, and a handful of people try to keep the manifests straight. The port already has its standing data (you will see it under the divider line at the bottom of the file) and nothing to read it.

Today you set up the port's working structures: the list of places cargo comes from, the docking queue, an unloading stack and a tonnage table that stays in alphabetical order. When this lesson passes, the **Port console** and the **Dock structures** panel come alive.`,
      tasks: [
        "Get the data with List<Shipment> shipments = PortData.Shipments(); and List<Vessel> vessels = PortData.Vessels(). Build HashSet<string> origins from every shipment's Origin and print Distinct origins: 3. Then add \"Luna Gate\" again, keep the bool that Add returns, and print Luna Gate was new: False",
        "Make a Queue<string> dockQueue and enqueue the arrivals V-14, V-11, V-15, V-12 in that order. Dequeue the first into string docked and print Docking: V-14, then print Next in line: V-11 using Peek",
        "Push the Id of every shipment that travels on vessel V-11 onto a Stack<string> hold, in list order. Pop them all, adding each to List<string> unloadOrder and printing Unloading <id> for each",
        "Build SortedDictionary<string, int> tonnageByCategory (StringComparer.Ordinal) holding the total MassKg per Category and print each pair as Agri: 2180 kg, in key order. Port.Show origins, docked, dockQueue, unloadOrder and tonnageByCategory",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 1: set up the port's working structures. The lines under this block (#nullable and the usings)
// are provided: leave them where they are, your statements go below them.
// 1. List<Shipment> shipments = PortData.Shipments();   List<Vessel> vessels = PortData.Vessels();
//    HashSet<string> origins from every shipment.Origin  ->  print  Distinct origins: 3
//    bool lunaWasNew = origins.Add("Luna Gate");          ->  print  Luna Gate was new: False
// 2. Queue<string> dockQueue: enqueue "V-14", "V-11", "V-15", "V-12".
//    string docked = dockQueue.Dequeue();  print  Docking: V-14   and  Next in line: V-11  (Peek)
// 3. Stack<string> hold: Push the Id of each shipment on vessel "V-11".  Pop them all into
//    List<string> unloadOrder, printing  Unloading <id>  for each.
// 4. SortedDictionary<string, int> tonnageByCategory = new(StringComparer.Ordinal): total MassKg per Category.
//    Print each pair as  Agri: 2180 kg  (in key order).
// Port.Show: origins, docked, dockQueue, unloadOrder, tonnageByCategory
${FILE_HEAD}

// This first line is a placeholder so the file builds. Replace it with your own statements.
Console.WriteLine("TODO: set up the port's collections");

${TYPES_DIVIDER}

${PORT_PROVIDED}`,
      solutionAdd: cs`${FILE_HEAD}

// Lesson 1: the port's working structures.
List<Shipment> shipments = PortData.Shipments();
List<Vessel> vessels = PortData.Vessels();

// A HashSet keeps each value once.
HashSet<string> origins = new();
foreach (Shipment shipment in shipments)
{
    origins.Add(shipment.Origin);
}
Console.WriteLine($"Distinct origins: {origins.Count}");
bool lunaWasNew = origins.Add("Luna Gate");
Console.WriteLine($"Luna Gate was new: {lunaWasNew}");

// A Queue serves vessels in the order they arrived.
Queue<string> dockQueue = new();
foreach (string arrival in new[] { "V-14", "V-11", "V-15", "V-12" })
{
    dockQueue.Enqueue(arrival);
}
string docked = dockQueue.Dequeue();
Console.WriteLine($"Docking: {docked}");
Console.WriteLine($"Next in line: {dockQueue.Peek()}");

// A Stack unloads the last crate loaded first.
Stack<string> hold = new();
foreach (Shipment shipment in shipments)
{
    if (shipment.VesselId == "V-11")
    {
        hold.Push(shipment.Id);
    }
}
List<string> unloadOrder = new();
while (hold.Count > 0)
{
    string unloaded = hold.Pop();
    unloadOrder.Add(unloaded);
    Console.WriteLine($"Unloading {unloaded}");
}

// A SortedDictionary keeps its keys in order.
SortedDictionary<string, int> tonnageByCategory = new(StringComparer.Ordinal);
foreach (Shipment shipment in shipments)
{
    tonnageByCategory[shipment.Category] = tonnageByCategory.GetValueOrDefault(shipment.Category) + shipment.MassKg;
}
foreach (var (category, kg) in tonnageByCategory)
{
    Console.WriteLine($"{category}: {kg} kg");
}

Port.Show("origins", origins);
Port.Show("docked", docked);
Port.Show("dockQueue", dockQueue);
Port.Show("unloadOrder", unloadOrder);
Port.Show("tonnageByCategory", tonnageByCategory);

${TYPES_DIVIDER}

${PORT_PROVIDED}`,
      explanation:
        "Each structure answers a different question. The HashSet ignores repeats, so the three origins are counted once however many shipments share them, and Add's bool return is the cheapest way to learn whether a value was new. The Queue gives back vessels in arrival order (V-14 docks, V-11 is next). The Stack gives back the V-11 cargo in reverse of the order it was loaded, newest first. The SortedDictionary was fed in manifest order but reads back sorted by category, and the explicit StringComparer.Ordinal fixes what 'sorted' means.",
      hints: [
        { id: "h1", title: "Sets and Add", content: "foreach (Shipment shipment in shipments) { origins.Add(shipment.Origin); } then origins.Count is 3. Adding a value that is already there returns false: bool lunaWasNew = origins.Add(\"Luna Gate\");" },
        { id: "h2", title: "Queue and Stack", content: "dockQueue.Enqueue(\"V-14\"); ... string docked = dockQueue.Dequeue(); and dockQueue.Peek() shows who is next. For the stack: if (shipment.VesselId == \"V-11\") hold.Push(shipment.Id); then while (hold.Count > 0) { string unloaded = hold.Pop(); ... }" },
        { id: "h3", title: "Totals per category", content: "tonnageByCategory[shipment.Category] = tonnageByCategory.GetValueOrDefault(shipment.Category) + shipment.MassKg; GetValueOrDefault gives 0 for a category you have not seen yet. Print with foreach (var (category, kg) in tonnageByCategory)." },
      ],
      tests: [
        {
          id: "t1",
          description: "a HashSet counts each origin once and Add reports repeats",
          assertionCode: js`
assert(lines.includes("Distinct origins: 3"), 'Print "Distinct origins: 3": fill a HashSet<string> with every shipment.Origin and print its Count.');
assert(lines.includes("Luna Gate was new: False"), 'Print "Luna Gate was new: False": the bool returned by origins.Add("Luna Gate") is false because the set already holds it.');
assert(Array.isArray(scene.origins), 'Send the set with Port.Show("origins", origins);');
assertEqual(scene.origins.slice().sort(), ["Ceres Yard", "Luna Gate", "Vesta Dock"], "origins (as a set, order does not matter)");`,
        },
        {
          id: "t2",
          description: "the Queue serves vessels in arrival order",
          assertionCode: js`
assert(lines.includes("Docking: V-14"), 'Print "Docking: V-14": the first vessel enqueued is the first one dequeued.');
assert(lines.includes("Next in line: V-11"), 'Print "Next in line: V-11" using dockQueue.Peek().');
assertEqual(scene.docked, "V-14", "docked");
assertEqual(scene.dockQueue, ["V-11", "V-15", "V-12"], "dockQueue after one Dequeue (front of the line first)");`,
        },
        {
          id: "t3",
          description: "the Stack unloads V-11's cargo newest first",
          assertionCode: js`
assertEqual(scene.unloadOrder, ["H-3013", "H-3010", "H-3006", "H-3005", "H-3001"], "unloadOrder (V-11's shipments, popped from a stack)");
assert(lines.includes("Unloading H-3013") && lines.includes("Unloading H-3001"), 'Print one "Unloading <id>" line per popped shipment.');
assert(lines.indexOf("Unloading H-3013") < lines.indexOf("Unloading H-3001"), "H-3013 was pushed last, so it must be popped (and printed) first.");`,
        },
        {
          id: "t4",
          description: "the SortedDictionary reads back in key order with the right totals",
          assertionCode: js`
assert(scene.tonnageByCategory && typeof scene.tonnageByCategory === "object", 'Send the dictionary with Port.Show("tonnageByCategory", tonnageByCategory);');
assertEqual(Object.keys(scene.tonnageByCategory), ["Agri", "Fuel", "Machinery", "Mail", "Medical", "Supply"], "category keys, in sorted order");
assertEqual(scene.tonnageByCategory.Agri, 2180, "Agri total (820 + 910 + 450)");
assertEqual(scene.tonnageByCategory.Fuel, 6000, "Fuel total (4200 + 1800)");
assert(lines.includes("Agri: 2180 kg") && lines.includes("Supply: 2500 kg"), 'Print each pair like "Agri: 2180 kg".');
assert(lines.indexOf("Agri: 2180 kg") < lines.indexOf("Fuel: 6000 kg"), "Print the categories in key order.");`,
        },
      ],
      unlocks: ["hp-console", "hp-structures"],
      checks: [
        {
          prompt: "You are collecting the callsigns of every vessel seen today and only care whether a callsign was already recorded. Which collection fits best?",
          question: {
            type: "choice",
            options: ["`HashSet<string>`", "`Stack<string>`", "`Queue<string>`", "`SortedDictionary<string, int>`"],
            answer: 0,
          },
          explanation: "A set stores each value at most once and `Add` tells you if it was new, which is exactly the question. A queue or stack would keep duplicates, and a sorted dictionary needs a value for every key.",
        },
        {
          prompt: "After `Push(1)`, `Push(2)`, `Push(3)` on an empty `Stack<int>`, what does the next `Pop()` return?",
          question: { type: "number", answer: 3 },
          explanation: "A stack is last in, first out: the newest item, `3`, comes off the top first, then `2`, then `1`.",
        },
        {
          prompt: "Why does `foreach (var item in mySet) { mySet.Add(newItem); }` crash?",
          question: {
            type: "choice",
            options: [
              "Changing a collection while it is being enumerated throws `InvalidOperationException`",
              "A `HashSet` can never be looped over",
              "`Add` is not allowed on sets",
              "The loop variable must be called `item`",
            ],
            answer: 0,
          },
          explanation: "Every standard collection guards against being modified during a `foreach` and throws \"Collection was modified; enumeration operation may not execute.\" Gather the additions in a separate list and apply them after the loop.",
        },
      ],
    },

    // ───────────────────────── 2 ─────────────────────────
    {
      id: "csharp-linq-2-linq-basics",
      title: "LINQ basics: filter, sort, project",
      minutes: 25,
      xp: 140,
      concepts: ["LINQ", "Where", "Select", "OrderBy", "ThenBy", "First", "FirstOrDefault", "Any", "All", "Count", "lambda expressions", "anonymous types"],
      learn: md`### Questions about a collection, asked in one line

Most data code boils down to the same few moves: *keep the ones that match*, *sort them*, *pull out the part I care about*, *tell me whether any/all match*. Writing each as a \`foreach\` with a temporary list works, but it buries the question under bookkeeping. **LINQ** (Language Integrated Query) is a set of methods on every collection that lets you state the question directly:

~~~csharp
List<Shipment> urgent = shipments.Where(shipment => shipment.Priority == 1).ToList();
~~~

Read it as: *from shipments, keep where priority is 1, as a list.* The part after \`=>\` is a **lambda**: a tiny unnamed function. \`shipment\` is its parameter (you choose the name; pick something readable, not \`x\`) and the expression after the arrow is what it returns. LINQ calls your lambda once per element.

LINQ lives in \`System.Linq\`, which the project switches on for you.

### The core operators

- **\`Where(predicate)\`** keeps the elements for which the lambda returns \`true\`.
- **\`Select(projection)\`** turns each element into something else: a field, a string, or a brand new shape.
- **\`OrderBy(key)\`** / **\`OrderByDescending(key)\`** sort by a key. **\`ThenBy\`** / **\`ThenByDescending\`** break ties.
- **\`Take(n)\`** / **\`Skip(n)\`** keep or drop the first n.
- **\`First(predicate)\`** the first match, or an exception. **\`FirstOrDefault(predicate)\`** the first match, or \`null\` (a default value) when nothing matches.
- **\`Any(predicate)\`** is there at least one? **\`All(predicate)\`** do they all? **\`Count(predicate)\`** how many?

They **chain**: each one takes a sequence and gives back a sequence, so you can write

~~~csharp
var heavy = shipments
    .Where(shipment => shipment.MassKg >= 1000)
    .OrderByDescending(shipment => shipment.MassKg)
    .Select(shipment => shipment.Id);
~~~

one step per line, reading top to bottom like a recipe.

### Sorting rules worth knowing

\`OrderBy\` is **stable**: elements with equal keys keep their original relative order. If you call \`OrderBy\` twice, the *second* call wins and the first only matters for ties, which is rarely what you meant. To sort by priority and then by mass, write \`.OrderBy(a => a.Priority).ThenByDescending(a => a.MassKg)\`: one \`OrderBy\`, then \`ThenBy\` for every further key.

### Select can build a new shape

~~~csharp
var rows = shipments.Select(shipment => new { shipment.Id, shipment.Cargo, Kilos = shipment.MassKg }).ToList();
~~~

\`new { ... }\` is an **anonymous type**: a throwaway class the compiler writes for you, with read-only properties. Use \`var\` to hold it. Names come from the expressions (\`shipment.Id\` gives a property called \`Id\`); give a property another name with \`Name = value\`. They are perfect for "I need this shape for one more step", such as handing rows to \`Port.Show\`, and not meant for passing around between methods.

### First or FirstOrDefault?

\`First\` throws when nothing matches: \`InvalidOperationException: Sequence contains no matching element\`. Use it when "not found" would be a bug. When "not found" is a normal answer, use \`FirstOrDefault\` and check the result:

~~~csharp
Shipment? hazmat = shipments.FirstOrDefault(shipment => shipment.Category == "Hazmat");
if (hazmat is null) Console.WriteLine("No hazmat today");
~~~

Its cousins \`Single\` (exactly one match, otherwise an exception) and \`SingleOrDefault\` are for lookups that must be unique. And remember: \`Max\`, \`Min\` and \`Average\` on an **empty** sequence throw the same "Sequence contains no elements" exception.

### Common mistakes

- Forgetting \`.ToList()\` when you need a real list (many LINQ results are not lists; lesson 5 explains why).
- Writing \`list.Count\` (a property) on a LINQ result, which has \`Count()\` (a method) instead.
- Using \`=\` inside a lambda condition instead of \`==\`.
- Calling \`OrderBy\` twice instead of \`OrderBy\` then \`ThenBy\`.
- Using \`First\` where \`FirstOrDefault\` is the honest choice.`,
      mission: md`The shift supervisor wants the manifest *as a board*: urgent cargo flagged, the heavy lifts listed first, everything sorted so the most important row is on top. And a few yes/no answers for the morning briefing: is there any mail? Is anything over five tonnes? Is there hazardous cargo on the list at all?

When this lesson passes, the **Manifest board** appears: a sortable, filterable table built from the rows *your* query produced.`,
      tasks: [
        "Under your lesson 1 code create List<Shipment> urgent (Priority == 1) and print Urgent: H-3002, H-3007, H-3010, H-3013 using string.Join. Create List<Shipment> heavy (MassKg of 1000 or more, heaviest first) and print Heavy: H-3003, H-3004, H-3006, H-3010, H-3012",
        "Build board: every shipment ordered by Priority, then by MassKg descending (ThenByDescending), projected with Select into new { shipment.Id, shipment.Cargo, shipment.Category, shipment.MassKg, shipment.Priority } and turned into a list. Print Board top 3: H-3010, H-3007, H-3013",
        "Print Any mail: True, All under 5000 kg: True and Medical shipments: 3 using Any, All and Count with a lambda each",
        "Use First to find the first Fuel shipment and print First fuel: H-3003. Use FirstOrDefault for Category \"Hazmat\" and print Hazmat found: False. Port.Show board, urgentIds, heavyIds, medicalCount, firstFuel, hazmatFound and anyMail",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 2: ask the manifest questions with LINQ.
// 1. List<Shipment> urgent = shipments.Where(...).ToList();   print  Urgent: H-3002, H-3007, H-3010, H-3013
//    List<Shipment> heavy = ... MassKg >= 1000, OrderByDescending(MassKg) ...   print  Heavy: H-3003, H-3004, H-3006, H-3010, H-3012
//    (string.Join(", ", urgent.Select(shipment => shipment.Id)) builds the id list)
// 2. var board = shipments.OrderBy(Priority).ThenByDescending(MassKg).Select(new { Id, Cargo, Category, MassKg, Priority }).ToList();
//    print  Board top 3: H-3010, H-3007, H-3013   (Take(3))
// 3. Any / All / Count:  Any mail: True   All under 5000 kg: True   Medical shipments: 3
// 4. First fuel: H-3003 (First)   Hazmat found: False (FirstOrDefault + is not null)
// Port.Show: board, urgentIds, heavyIds, medicalCount, firstFuel, hazmatFound, anyMail
`,
      solutionAdd: cs`// Lesson 2: the manifest, queried with LINQ.
List<Shipment> urgent = shipments.Where(shipment => shipment.Priority == 1).ToList();
Console.WriteLine($"Urgent: {string.Join(", ", urgent.Select(shipment => shipment.Id))}");

List<Shipment> heavy = shipments
    .Where(shipment => shipment.MassKg >= 1000)
    .OrderByDescending(shipment => shipment.MassKg)
    .ToList();
Console.WriteLine($"Heavy: {string.Join(", ", heavy.Select(shipment => shipment.Id))}");

var board = shipments
    .OrderBy(shipment => shipment.Priority)
    .ThenByDescending(shipment => shipment.MassKg)
    .Select(shipment => new { shipment.Id, shipment.Cargo, shipment.Category, shipment.MassKg, shipment.Priority })
    .ToList();
Console.WriteLine($"Board top 3: {string.Join(", ", board.Take(3).Select(row => row.Id))}");

bool anyMail = shipments.Any(shipment => shipment.Category == "Mail");
bool allUnderFiveTonnes = shipments.All(shipment => shipment.MassKg < 5000);
int medicalCount = shipments.Count(shipment => shipment.Category == "Medical");
Console.WriteLine($"Any mail: {anyMail}");
Console.WriteLine($"All under 5000 kg: {allUnderFiveTonnes}");
Console.WriteLine($"Medical shipments: {medicalCount}");

Shipment firstFuel = shipments.First(shipment => shipment.Category == "Fuel");
Console.WriteLine($"First fuel: {firstFuel.Id}");
Shipment? hazmat = shipments.FirstOrDefault(shipment => shipment.Category == "Hazmat");
bool hazmatFound = hazmat is not null;
Console.WriteLine($"Hazmat found: {hazmatFound}");

Port.Show("board", board);
Port.Show("urgentIds", urgent.Select(shipment => shipment.Id));
Port.Show("heavyIds", heavy.Select(shipment => shipment.Id));
Port.Show("medicalCount", medicalCount);
Port.Show("firstFuel", firstFuel.Id);
Port.Show("hazmatFound", hazmatFound);
Port.Show("anyMail", anyMail);`,
      explanation:
        "Where keeps the matching shipments, OrderByDescending puts the heaviest first, and Select(...).ToList() turns each shipment into a small row. The board sorts by Priority first and uses ThenByDescending only to order the shipments that share a priority, so the priority-1 rows come first with the heaviest of them on top (H-3010, 1800 kg). Any/All/Count answer yes-or-number questions without a loop. First would throw if there were no Fuel shipment, while FirstOrDefault returns null for the missing Hazmat and 'is not null' turns that into a plain bool.",
      hints: [
        { id: "h1", title: "Where and OrderBy", content: "List<Shipment> urgent = shipments.Where(shipment => shipment.Priority == 1).ToList(); For the heavy list add .OrderByDescending(shipment => shipment.MassKg) after the Where. string.Join(\", \", urgent.Select(shipment => shipment.Id)) makes the text." },
        { id: "h2", title: "One OrderBy, then ThenBy", content: "shipments.OrderBy(shipment => shipment.Priority).ThenByDescending(shipment => shipment.MassKg).Select(shipment => new { shipment.Id, shipment.Cargo, shipment.Category, shipment.MassKg, shipment.Priority }).ToList(); The top three are board.Take(3)." },
        { id: "h3", title: "Quantifiers and First", content: "shipments.Any(shipment => shipment.Category == \"Mail\"), shipments.All(shipment => shipment.MassKg < 5000), shipments.Count(shipment => shipment.Category == \"Medical\"). Shipment? hazmat = shipments.FirstOrDefault(...Hazmat...); then hazmat is not null tells you whether it was found." },
      ],
      tests: [
        {
          id: "t1",
          description: "urgent and heavy lists are filtered and ordered correctly",
          assertionCode: js`
assert(lines.includes("Urgent: H-3002, H-3007, H-3010, H-3013"), 'Print "Urgent: H-3002, H-3007, H-3010, H-3013": Where Priority == 1, in manifest order.');
assert(lines.includes("Heavy: H-3003, H-3004, H-3006, H-3010, H-3012"), 'Print "Heavy: H-3003, H-3004, H-3006, H-3010, H-3012": Where MassKg >= 1000, then OrderByDescending(MassKg).');
assertEqual(scene.urgentIds, ["H-3002", "H-3007", "H-3010", "H-3013"], "urgentIds");
assertEqual(scene.heavyIds, ["H-3003", "H-3004", "H-3006", "H-3010", "H-3012"], "heavyIds");`,
        },
        {
          id: "t2",
          description: "the board is sorted by priority, then by mass (heaviest first) and projected into rows",
          assertionCode: js`
assert(Array.isArray(scene.board) && scene.board.length === 14, "Send all 14 rows with Port.Show(\"board\", board); (no Where on the board)");
assertEqual(scene.board[0], { id: "H-3010", cargo: "Fusion pellets", category: "Fuel", massKg: 1800, priority: 1 }, "first board row (needs Id, Cargo, Category, MassKg, Priority)");
assertEqual(scene.board.slice(0, 5).map((r) => r.id), ["H-3010", "H-3007", "H-3013", "H-3002", "H-3003"], "first five ids (priority 1 by mass descending, then the heaviest priority 2)");
assertEqual(scene.board[13].id, "H-3014", "last row (the lightest priority 3 shipment)");
assert(lines.includes("Board top 3: H-3010, H-3007, H-3013"), 'Print "Board top 3: H-3010, H-3007, H-3013" using Take(3).');`,
        },
        {
          id: "t3",
          description: "Any, All and Count answer the briefing questions",
          assertionCode: js`
assert(lines.includes("Any mail: True"), 'Print "Any mail: True".');
assert(lines.includes("All under 5000 kg: True"), 'Print "All under 5000 kg: True" (All with MassKg < 5000).');
assert(lines.includes("Medical shipments: 3"), 'Print "Medical shipments: 3" (Count with a predicate).');
assertEqual(scene.medicalCount, 3, "medicalCount");
assertEqual(scene.anyMail, true, "anyMail");`,
        },
        {
          id: "t4",
          description: "First finds fuel; FirstOrDefault copes with a missing category",
          assertionCode: js`
assert(lines.includes("First fuel: H-3003"), 'Print "First fuel: H-3003" using First(shipment => shipment.Category == "Fuel").');
assert(lines.includes("Hazmat found: False"), 'Print "Hazmat found: False": FirstOrDefault returns null when nothing matches.');
assertEqual(scene.firstFuel, "H-3003", "firstFuel");
assertEqual(scene.hazmatFound, false, "hazmatFound");`,
        },
      ],
      unlocks: ["hp-board"],
      checks: [
        {
          prompt: "What is the difference between `First(predicate)` and `FirstOrDefault(predicate)` when nothing matches?",
          question: {
            type: "choice",
            options: [
              "`First` throws `InvalidOperationException`; `FirstOrDefault` returns `null` (or the type's default)",
              "Both return `null`",
              "`First` returns `null`; `FirstOrDefault` throws",
              "Both throw, but with different messages",
            ],
            answer: 0,
          },
          explanation: "`First` treats \"nothing found\" as a bug and throws \"Sequence contains no matching element\". `FirstOrDefault` treats it as an ordinary answer and hands back `null` for reference types, so you must check the result before using it.",
        },
        {
          prompt: "You want shipments sorted by priority, and among equal priorities the heaviest first. Which is correct?",
          question: {
            type: "choice",
            options: [
              "`.OrderBy(a => a.Priority).ThenByDescending(a => a.MassKg)`",
              "`.OrderBy(a => a.Priority).OrderByDescending(a => a.MassKg)`",
              "`.OrderBy(a => a.Priority, a.MassKg)`",
              "`.Sort(a => a.Priority).Sort(a => a.MassKg)`",
            ],
            answer: 0,
          },
          explanation: "A second `OrderBy` starts a fresh sort and mostly discards the first. `ThenBy` / `ThenByDescending` only reorder elements that tie on the earlier keys, which is what \"among equal priorities\" means.",
        },
      ],
    },

    // ───────────────────────── 3 ─────────────────────────
    {
      id: "csharp-linq-3-grouping",
      title: "Grouping and aggregation",
      minutes: 25,
      xp: 150,
      concepts: ["GroupBy", "IGrouping", "Sum", "Average", "Max", "MaxBy", "ToDictionary", "ToLookup"],
      learn: md`### From a long list to a short summary

A manifest has hundreds of rows; the supervisor wants five lines. Summaries come from two ideas: **grouping** (split the rows into buckets that share a key) and **aggregation** (squash a bucket into one number: how many, how heavy, how big on average).

### \`GroupBy\`

~~~csharp
var byCategory = shipments.GroupBy(shipment => shipment.Category);
~~~

The result is a sequence of **groups**. Each group is itself a sequence of the shipments with that key *and* has a \`Key\` property:

~~~csharp
foreach (var bucket in byCategory)
{
    Console.WriteLine($"{bucket.Key}: {bucket.Count()} shipments");
}
~~~

Groups appear in the order their key was **first seen** in the source, and the items inside a group keep their source order. That is a documented promise, so you can rely on it (unlike a \`Dictionary\`'s enumeration order).

### Aggregation operators

Inside each bucket you can use the same operators as anywhere else:

- \`Count()\`, \`Sum(x => ...)\`, \`Average(x => ...)\`, \`Min(x => ...)\`, \`Max(x => ...)\`
- \`MaxBy(x => key)\` / \`MinBy(x => key)\` return the **element** with the biggest/smallest key (not the key itself). \`Max\` of the masses gives you 4200; \`MaxBy\` of the masses gives you the shipment that weighs 4200.

Combine \`GroupBy\` with \`Select\` to produce one summary row per bucket:

~~~csharp
var stats = shipments
    .GroupBy(shipment => shipment.Category)
    .Select(bucket => new
    {
        Category = bucket.Key,
        Count = bucket.Count(),
        TotalKg = bucket.Sum(shipment => shipment.MassKg),
        AvgKg = Math.Round(bucket.Average(shipment => shipment.MassKg), 1),
    })
    .OrderByDescending(stat => stat.TotalKg)
    .ToList();
~~~

### Averages, overflow and empty sequences

- \`Average\` of \`int\`s is a \`double\`. Round it for display with \`Math.Round(value, 1)\`, or format with \`{value:F1}\`.
- \`Sum\` over \`int\` uses **checked** arithmetic. If the total no longer fits an \`int\`, you get \`OverflowException: Arithmetic operation resulted in an overflow.\` rather than a silently wrong number. Sum a \`long\` (\`.Sum(x => (long)x.MassKg)\`) when the total could be huge.
- \`Sum\` of an empty sequence is \`0\`, but \`Average\`, \`Max\` and \`Min\` on an empty sequence of non-nullable values throw "Sequence contains no elements". Guard with \`Any()\` or use \`DefaultIfEmpty\`.

### Turning data into a lookup: \`ToDictionary\` and \`ToLookup\`

\`ToDictionary(keySelector, valueSelector)\` builds a dictionary in one expression. It requires **unique keys**: a duplicate throws \`ArgumentException: An item with the same key has already been added.\` When keys can repeat, group first:

~~~csharp
Dictionary<string, int> originTotals = shipments
    .GroupBy(shipment => shipment.Origin)
    .ToDictionary(bucket => bucket.Key, bucket => bucket.Sum(shipment => shipment.MassKg));
~~~

\`ToLookup\` is the "dictionary of lists" you would otherwise write by hand: one key maps to **many** values. Its best feature is that a missing key does not throw, it simply gives an **empty** sequence:

~~~csharp
ILookup<string, Shipment> byVessel = shipments.ToLookup(shipment => shipment.VesselId);
int onV15 = byVessel["V-15"].Count();   // 0, no exception
~~~

A lookup is **immutable** and evaluated immediately, which makes it a good snapshot to query repeatedly.

### Common mistakes

- Grouping and then forgetting that \`Key\` is the group's name while the group *itself* is the list of items.
- \`ToDictionary\` on non-unique keys.
- Using \`Max\` when you need the element (\`MaxBy\`).
- Integer division in a hand-made average: \`total / count\` with two \`int\`s truncates. \`Average\` already returns a \`double\`.`,
      mission: md`Operations wants the day on one screen: how much each category weighs, where the cargo comes from, how many shipments each vessel carries, and the headline numbers. No scrolling through fourteen rows.

When this lesson passes, the **Category chart** lights up with bars for every category, origin and vessel your grouping produced.`,
      tasks: [
        "Build categoryStats with GroupBy(Category) and Select: Category, Count, TotalKg (Sum), AvgKg (Average rounded to 1 decimal) and Heaviest (the Id found with MaxBy), ordered by TotalKg descending. Print one line per category like Fuel: count 2, 6000 kg, avg 3000, heaviest H-3003",
        "Build Dictionary<string, int> originTotals with GroupBy and ToDictionary (total MassKg per Origin) and print each pair as Ceres Yard: 6630 kg",
        "Build ILookup<string, Shipment> byVessel with ToLookup(VesselId). Make Dictionary<string, int> perVessel from the vessels list (Id to number of shipments, V-15 must be 0) and print lines like V-14 carries 5 shipments",
        "Compute totalKg (Sum), avgKg (Average rounded to 1 decimal) and the heaviest shipment (MaxBy). Print Total 16920 kg, average 1208.6 kg, heaviest H-3003. Port.Show categoryStats, originTotals, perVessel and totals as new { Count, TotalKg, AvgKg, Heaviest }",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 3: summarise the manifest.
// 1. var categoryStats = shipments.GroupBy(Category).Select(bucket => new { Category = bucket.Key, Count, TotalKg, AvgKg, Heaviest }).OrderByDescending(TotalKg).ToList();
//    print per category:  Fuel: count 2, 6000 kg, avg 3000, heaviest H-3003
//    (AvgKg = Math.Round(bucket.Average(...), 1);  Heaviest = bucket.MaxBy(...)!.Id)
// 2. Dictionary<string, int> originTotals = shipments.GroupBy(Origin).ToDictionary(...);   print  Ceres Yard: 6630 kg
// 3. ILookup<string, Shipment> byVessel = shipments.ToLookup(VesselId);
//    Dictionary<string, int> perVessel = vessels.ToDictionary(vessel => vessel.Id, vessel => byVessel[vessel.Id].Count());
//    print  V-14 carries 5 shipments
// 4. int totalKg, double avgKg (1 decimal), Shipment heaviest = shipments.MaxBy(...)!;
//    print  Total 16920 kg, average 1208.6 kg, heaviest H-3003
// Port.Show: categoryStats, originTotals, perVessel, totals (new { Count, TotalKg, AvgKg, Heaviest })
`,
      solutionAdd: cs`// Lesson 3: grouping and aggregation.
var categoryStats = shipments
    .GroupBy(shipment => shipment.Category)
    .Select(bucket => new
    {
        Category = bucket.Key,
        Count = bucket.Count(),
        TotalKg = bucket.Sum(shipment => shipment.MassKg),
        AvgKg = Math.Round(bucket.Average(shipment => shipment.MassKg), 1),
        Heaviest = bucket.MaxBy(shipment => shipment.MassKg)!.Id,
    })
    .OrderByDescending(stat => stat.TotalKg)
    .ToList();
foreach (var stat in categoryStats)
{
    Console.WriteLine($"{stat.Category}: count {stat.Count}, {stat.TotalKg} kg, avg {stat.AvgKg}, heaviest {stat.Heaviest}");
}

Dictionary<string, int> originTotals = shipments
    .GroupBy(shipment => shipment.Origin)
    .ToDictionary(bucket => bucket.Key, bucket => bucket.Sum(shipment => shipment.MassKg));
foreach (var (origin, originKg) in originTotals)
{
    Console.WriteLine($"{origin}: {originKg} kg");
}

ILookup<string, Shipment> byVessel = shipments.ToLookup(shipment => shipment.VesselId);
Dictionary<string, int> perVessel = vessels.ToDictionary(vessel => vessel.Id, vessel => byVessel[vessel.Id].Count());
foreach (var (vesselId, carried) in perVessel)
{
    Console.WriteLine($"{vesselId} carries {carried} shipments");
}

int totalKg = shipments.Sum(shipment => shipment.MassKg);
double avgKg = Math.Round(shipments.Average(shipment => shipment.MassKg), 1);
Shipment heaviest = shipments.MaxBy(shipment => shipment.MassKg)!;
Console.WriteLine($"Total {totalKg} kg, average {avgKg} kg, heaviest {heaviest.Id}");

Port.Show("categoryStats", categoryStats);
Port.Show("originTotals", originTotals);
Port.Show("perVessel", perVessel);
Port.Show("totals", new { Count = shipments.Count, TotalKg = totalKg, AvgKg = avgKg, Heaviest = heaviest.Id });`,
      explanation:
        "GroupBy splits the 14 shipments into six category buckets; inside Select each bucket is aggregated with Count, Sum, Average and MaxBy (which returns the shipment itself, so .Id reads its id). ToDictionary turns the grouped origins straight into a dictionary, safe here because GroupBy already made the keys unique. ToLookup answers 'which shipments are on this vessel?' for any id, and unlike a Dictionary it returns an empty sequence for V-15, so the count is 0 instead of an exception. The totals use the same operators on the whole list.",
      hints: [
        { id: "h1", title: "One summary row per bucket", content: "shipments.GroupBy(shipment => shipment.Category).Select(bucket => new { Category = bucket.Key, Count = bucket.Count(), TotalKg = bucket.Sum(shipment => shipment.MassKg), ... }). MaxBy returns the whole shipment, so write bucket.MaxBy(shipment => shipment.MassKg)!.Id" },
        { id: "h2", title: "ToDictionary needs unique keys", content: "GroupBy first, so each origin appears once: .GroupBy(shipment => shipment.Origin).ToDictionary(bucket => bucket.Key, bucket => bucket.Sum(shipment => shipment.MassKg)). Loop with foreach (var (origin, originKg) in originTotals)." },
        { id: "h3", title: "A lookup never throws", content: "ILookup<string, Shipment> byVessel = shipments.ToLookup(shipment => shipment.VesselId); byVessel[\"V-15\"] is an empty sequence, so .Count() is 0. Build perVessel from the vessels list so V-15 is included." },
      ],
      tests: [
        {
          id: "t1",
          description: "GroupBy builds one summary row per category, biggest total first",
          assertionCode: js`
assert(Array.isArray(scene.categoryStats) && scene.categoryStats.length === 6, 'Send the six summary rows with Port.Show("categoryStats", categoryStats);');
assertEqual(scene.categoryStats.map((s) => s.category), ["Fuel", "Machinery", "Supply", "Agri", "Medical", "Mail"], "categories, largest TotalKg first");
assertEqual(scene.categoryStats[0], { category: "Fuel", count: 2, totalKg: 6000, avgKg: 3000, heaviest: "H-3003" }, "the Fuel row (Category, Count, TotalKg, AvgKg, Heaviest)");
assertEqual(scene.categoryStats[1].avgKg, 1646.7, "Machinery average (4940 / 3, rounded to 1 decimal)");
assertEqual(scene.categoryStats[3].heaviest, "H-3008", "Agri heaviest (MaxBy MassKg)");
assert(lines.includes("Fuel: count 2, 6000 kg, avg 3000, heaviest H-3003"), 'Print lines like "Fuel: count 2, 6000 kg, avg 3000, heaviest H-3003".');`,
        },
        {
          id: "t2",
          description: "ToDictionary totals the mass per origin",
          assertionCode: js`
assertEqual(scene.originTotals, { "Ceres Yard": 6630, "Luna Gate": 2430, "Vesta Dock": 7860 }, "originTotals");
assert(lines.includes("Ceres Yard: 6630 kg") && lines.includes("Vesta Dock: 7860 kg"), 'Print each pair like "Ceres Yard: 6630 kg".');`,
        },
        {
          id: "t3",
          description: "ToLookup counts shipments per vessel, including the empty one",
          assertionCode: js`
assertEqual(scene.perVessel, { "V-11": 5, "V-12": 4, "V-14": 5, "V-15": 0 }, "perVessel (build it from the vessels list so V-15 shows 0)");
assert(lines.includes("V-14 carries 5 shipments") && lines.includes("V-15 carries 0 shipments"), 'Print lines like "V-14 carries 5 shipments".');`,
        },
        {
          id: "t4",
          description: "Sum, Average and MaxBy give the headline totals",
          assertionCode: js`
assert(lines.includes("Total 16920 kg, average 1208.6 kg, heaviest H-3003"), 'Print "Total 16920 kg, average 1208.6 kg, heaviest H-3003" (round the average to 1 decimal).');
assertEqual(scene.totals, { count: 14, totalKg: 16920, avgKg: 1208.6, heaviest: "H-3003" }, "totals (Count, TotalKg, AvgKg, Heaviest)");`,
        },
      ],
      unlocks: ["hp-groups"],
      checks: [
        {
          prompt: "Given `var masses = shipments.Select(s => s.MassKg);` which expression returns the shipment object that is heaviest (not just the number)?",
          question: {
            type: "choice",
            options: [
              "`shipments.MaxBy(s => s.MassKg)`",
              "`shipments.Max(s => s.MassKg)`",
              "`masses.Max()`",
              "`shipments.OrderBy(s => s.MassKg)`",
            ],
            answer: 0,
          },
          explanation: "`Max` returns the largest *key* (a number). `MaxBy` returns the *element* that owns the largest key, which is usually what you want when you also need its id or name.",
        },
        {
          prompt: "What does `ToLookup(...)[\"V-99\"]` give for a key that no element has?",
          question: {
            type: "choice",
            options: ["An empty sequence", "`null`", "A `KeyNotFoundException`", "`0`"],
            answer: 0,
          },
          explanation: "A lookup treats every possible key as 'present with zero items', so you can ask without checking. A `Dictionary` indexer would throw \"The given key 'V-99' was not present in the dictionary.\"",
        },
        {
          prompt: "Why does `names.ToDictionary(n => n.Length)` throw for `{ \"Ada\", \"Bob\" }`?",
          question: {
            type: "choice",
            options: [
              "Both names have length 3, and a dictionary needs unique keys",
              "`Length` is not a valid key type",
              "`ToDictionary` only works on arrays",
              "It needs a value selector",
            ],
            answer: 0,
          },
          explanation: "Two elements produced the same key, so the second `Add` fails with \"An item with the same key has already been added.\" Group first (or use `ToLookup`) when keys can repeat.",
        },
      ],
    },

    // ───────────────────────── 4 ─────────────────────────
    {
      id: "csharp-linq-4-joins",
      title: "Joins and SelectMany",
      minutes: 25,
      xp: 150,
      concepts: ["Join", "GroupJoin", "left join", "SelectMany", "flattening", "Zip", "Distinct"],
      learn: md`### Data lives in more than one list

A shipment says *which vessel* it is on by id (\`"V-14"\`). The vessel's name, operator and capacity live in a different list. Relational databases call combining them a **join**; LINQ has the same idea for in-memory collections.

### \`Join\`: keep the pairs that match

~~~csharp
var manifest = shipments.Join(
    vessels,                              // the other list
    shipment => shipment.VesselId,        // key from each shipment
    vessel => vessel.Id,                  // key from each vessel
    (shipment, vessel) => new { shipment.Id, Vessel = vessel.Name, shipment.MassKg });
~~~

Four ingredients: the inner list, the key to match on each side, and a function that builds one result row from a matching pair. Keys are compared with equality, and rows with **no match are dropped**: a shipment whose vessel does not exist disappears from the result, and so does a vessel that carries nothing. That is an *inner join*.

Under the hood \`Join\` builds a lookup of the inner list once, so it stays fast on big inputs. Writing a \`foreach\` inside a \`foreach\` to compare every pair is the slow way (and gets painful past a few thousand rows).

### \`GroupJoin\`: keep every left item, with its matches

When you want **every vessel**, including the empty one, you need the left-join shape. \`GroupJoin\` pairs each vessel with the *group* of shipments that matched it, an empty group when none did:

~~~csharp
var loads = vessels.GroupJoin(
    shipments,
    vessel => vessel.Id,
    shipment => shipment.VesselId,
    (vessel, cargo) => new { vessel.Name, Count = cargo.Count(), LoadKg = cargo.Sum(shipment => shipment.MassKg) });
~~~

Notice the result function receives \`cargo\`, a sequence, not a single shipment. A vessel with no cargo gets an empty \`cargo\`, \`Count()\` is 0, and \`Sum\` is 0 (the one aggregate that is happy with empty input).

### \`SelectMany\`: flatten a list of lists

Each \`Vessel\` has a \`Crew\` array. \`Select\` over vessels would give you a list of arrays. \`SelectMany\` runs a function that returns a sequence for each element and **concatenates** all of them into one flat sequence:

~~~csharp
IEnumerable<string> everyone = vessels.SelectMany(vessel => vessel.Crew);
~~~

A second overload also hands you the parent, so you can label each flattened item:

~~~csharp
vessels.SelectMany(vessel => vessel.Crew, (vessel, name) => $"{name} ({vessel.Name})");
~~~

Whenever you catch yourself nesting one \`foreach\` inside another just to collect items into a single list, you want \`SelectMany\`.

### Handy neighbours

- \`Distinct()\` removes duplicates (using equality; fine for strings, numbers and records).
- \`Concat(other)\` appends one sequence to another. \`Union\` does the same and removes duplicates.
- \`Zip(other)\` pairs items by position (the first with the first, and so on).

### Query syntax (so you recognise it)

LINQ also has a SQL-like spelling: \`from s in shipments join v in vessels on s.VesselId equals v.Id select ...\`. It compiles to the very same method calls. This course uses the method syntax because it composes with every operator; read query syntax when you meet it in someone else's code.

### Common mistakes

- Expecting \`Join\` to keep unmatched items. Use \`GroupJoin\` (or check what is missing with \`Except\`).
- Using \`Select\` where you meant \`SelectMany\` and getting a sequence of sequences.
- Mixing up the order of the two key selectors. They must follow the order of the lists: outer key first, inner key second.
- Joining on keys of different types (a \`string\` id against an \`int\` id): the compiler error is CS0411 or CS1503 ("cannot be inferred" / "cannot convert").`,
      mission: md`The loading office needs a real manifest: every shipment with the *name* of the vessel carrying it, not just a code. They also need to see how full each vessel is (including the one still sitting empty at the dock) and a single list of everybody who is on duty.

When this lesson passes, the **Vessel loads** panel shows a capacity bar for every vessel and the full joined manifest.`,
      tasks: [
        "Build manifest with Join: shipments matched to vessels on VesselId = Id, each row new { shipment.Id, Vessel = vessel.Name, shipment.MassKg }, as a list. Print Manifest rows: 14 and First row: H-3001 on Pelican Run",
        "Build vesselLoads with GroupJoin from vessels: Vessel (the name), Shipments (count), LoadKg (sum), CapacityKg and UsedPct (LoadKg * 100.0 / CapacityKg, rounded to 1 decimal). Print one line per vessel like Pelican Run: 5 shipments, 5710 of 9000 kg (63.4%)",
        "From vesselLoads print Empty vessels: Saltmarsh (the vessels with Shipments == 0, names joined by comma)",
        "Flatten every vessel's crew with SelectMany into List<string> crew, labelling each name like Ada Ruiz (Pelican Run). Print Crew on duty: 10. Port.Show manifest, vesselLoads, crew and crewCount",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 4: join the lists together.
// 1. var manifest = shipments.Join(vessels, shipment => shipment.VesselId, vessel => vessel.Id, (shipment, vessel) => new { ... }).ToList();
//    print  Manifest rows: 14   and   First row: H-3001 on Pelican Run
// 2. var vesselLoads = vessels.GroupJoin(shipments, vessel => vessel.Id, shipment => shipment.VesselId, (vessel, cargo) => new { Vessel, Shipments, LoadKg, CapacityKg, UsedPct }).ToList();
//    print  Pelican Run: 5 shipments, 5710 of 9000 kg (63.4%)   (UsedPct = Math.Round(LoadKg * 100.0 / CapacityKg, 1))
// 3. print  Empty vessels: Saltmarsh   (the vessels whose Shipments is 0)
// 4. List<string> crew = vessels.SelectMany(vessel => vessel.Crew, (vessel, name) => $"{name} ({vessel.Name})").ToList();
//    print  Crew on duty: 10
// Port.Show: manifest, vesselLoads, crew, crewCount
`,
      solutionAdd: cs`// Lesson 4: joins and flattening.
var manifest = shipments
    .Join(
        vessels,
        shipment => shipment.VesselId,
        vessel => vessel.Id,
        (shipment, vessel) => new { shipment.Id, Vessel = vessel.Name, shipment.MassKg })
    .ToList();
Console.WriteLine($"Manifest rows: {manifest.Count}");
Console.WriteLine($"First row: {manifest[0].Id} on {manifest[0].Vessel}");

var vesselLoads = vessels
    .GroupJoin(
        shipments,
        vessel => vessel.Id,
        shipment => shipment.VesselId,
        (vessel, cargo) =>
        {
            int loadKg = cargo.Sum(shipment => shipment.MassKg);
            return new
            {
                Vessel = vessel.Name,
                Shipments = cargo.Count(),
                LoadKg = loadKg,
                vessel.CapacityKg,
                UsedPct = Math.Round(loadKg * 100.0 / vessel.CapacityKg, 1),
            };
        })
    .ToList();
foreach (var load in vesselLoads)
{
    Console.WriteLine($"{load.Vessel}: {load.Shipments} shipments, {load.LoadKg} of {load.CapacityKg} kg ({load.UsedPct}%)");
}
Console.WriteLine($"Empty vessels: {string.Join(", ", vesselLoads.Where(load => load.Shipments == 0).Select(load => load.Vessel))}");

List<string> crew = vessels
    .SelectMany(vessel => vessel.Crew, (vessel, name) => $"{name} ({vessel.Name})")
    .ToList();
Console.WriteLine($"Crew on duty: {crew.Count}");

Port.Show("manifest", manifest);
Port.Show("vesselLoads", vesselLoads);
Port.Show("crew", crew);
Port.Show("crewCount", crew.Count);`,
      explanation:
        "Join pairs each shipment with the vessel whose Id equals its VesselId, so the 14 shipments become 14 rows carrying the vessel's name; a vessel with no cargo (Saltmarsh) has no partner and would vanish from an inner join. GroupJoin starts from the vessels instead and hands the result function the whole group of matching shipments, which is empty for Saltmarsh, so its count and its sum are 0 and the empty vessel stays visible. SelectMany walks each vessel's Crew array and concatenates the names into one flat list of 10, with the second overload supplying the vessel for the label.",
      hints: [
        { id: "h1", title: "Join takes four things", content: "shipments.Join(vessels, shipment => shipment.VesselId, vessel => vessel.Id, (shipment, vessel) => new { shipment.Id, Vessel = vessel.Name, shipment.MassKg }).ToList(). The outer key (shipment) comes first, the inner key (vessel) second." },
        { id: "h2", title: "Keep the empty vessel", content: "vessels.GroupJoin(shipments, vessel => vessel.Id, shipment => shipment.VesselId, (vessel, cargo) => ...) where cargo is a sequence. Compute int loadKg = cargo.Sum(shipment => shipment.MassKg) inside the result function (use a block body with return new { ... })." },
        { id: "h3", title: "Flatten with SelectMany", content: "vessels.SelectMany(vessel => vessel.Crew, (vessel, name) => $\"{name} ({vessel.Name})\").ToList(). The first lambda returns the sequence to flatten; the second builds each result from the parent and the child." },
      ],
      tests: [
        {
          id: "t1",
          description: "Join attaches the vessel name to every shipment",
          assertionCode: js`
assert(Array.isArray(scene.manifest) && scene.manifest.length === 14, 'Send the 14 joined rows with Port.Show("manifest", manifest);');
assertEqual(scene.manifest[0], { id: "H-3001", vessel: "Pelican Run", massKg: 820 }, "first manifest row (Id, Vessel name, MassKg)");
assertEqual(scene.manifest[2].vessel, "Quiet Kestrel", "H-3003 travels on Quiet Kestrel");
assert(lines.includes("Manifest rows: 14"), 'Print "Manifest rows: 14".');
assert(lines.includes("First row: H-3001 on Pelican Run"), 'Print "First row: H-3001 on Pelican Run".');`,
        },
        {
          id: "t2",
          description: "GroupJoin keeps every vessel and works out how full it is",
          assertionCode: js`
assert(Array.isArray(scene.vesselLoads) && scene.vesselLoads.length === 4, 'Send all four vessels with Port.Show("vesselLoads", vesselLoads); a plain Join would lose the empty one.');
assertEqual(scene.vesselLoads[0], { vessel: "Pelican Run", shipments: 5, loadKg: 5710, capacityKg: 9000, usedPct: 63.4 }, "Pelican Run row (Vessel, Shipments, LoadKg, CapacityKg, UsedPct)");
assertEqual(scene.vesselLoads[2].usedPct, 69.3, "Quiet Kestrel usedPct (8320 of 12000, one decimal)");
assertEqual(scene.vesselLoads[3], { vessel: "Saltmarsh", shipments: 0, loadKg: 0, capacityKg: 4000, usedPct: 0 }, "Saltmarsh row (empty but present)");
assert(lines.includes("Pelican Run: 5 shipments, 5710 of 9000 kg (63.4%)"), 'Print lines like "Pelican Run: 5 shipments, 5710 of 9000 kg (63.4%)".');
assert(lines.includes("Empty vessels: Saltmarsh"), 'Print "Empty vessels: Saltmarsh".');`,
        },
        {
          id: "t3",
          description: "SelectMany flattens the crews into one labelled list",
          assertionCode: js`
assert(Array.isArray(scene.crew), 'Send the list with Port.Show("crew", crew);');
assertEqual(scene.crew.length, 10, "crew list length (3 + 2 + 4 + 1)");
assertEqual(scene.crew[0], "Ada Ruiz (Pelican Run)", "first crew entry");
assertEqual(scene.crew[9], "Wren Castellano (Saltmarsh)", "last crew entry");
assertEqual(scene.crewCount, 10, "crewCount");
assert(lines.includes("Crew on duty: 10"), 'Print "Crew on duty: 10".');`,
        },
      ],
      unlocks: ["hp-joins"],
      checks: [
        {
          prompt: "Saltmarsh carries no cargo. What happens to it in `vessels.Join(shipments, v => v.Id, s => s.VesselId, ...)`?",
          question: {
            type: "choice",
            options: [
              "It disappears from the result: `Join` only keeps pairs that match",
              "It appears once with empty values",
              "The query throws an exception",
              "It appears once for every shipment",
            ],
            answer: 0,
          },
          explanation: "`Join` is an inner join. To keep unmatched left-hand items use `GroupJoin` (each vessel with a possibly empty group of cargo) and build your rows from that.",
        },
        {
          prompt: "`orders` is a `List<Order>` and each `Order` has a `List<Line> Lines`. Which call gives one flat sequence of every `Line`?",
          question: {
            type: "choice",
            options: [
              "`orders.SelectMany(order => order.Lines)`",
              "`orders.Select(order => order.Lines)`",
              "`orders.Join(order => order.Lines)`",
              "`orders.GroupBy(order => order.Lines)`",
            ],
            answer: 0,
          },
          explanation: "`Select` would return a sequence of lists (one per order). `SelectMany` concatenates the inner sequences into one flat sequence, which is the whole point of the operator.",
        },
      ],
    },
  ],
};
