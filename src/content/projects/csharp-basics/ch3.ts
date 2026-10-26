import type { Chapter } from "@/engine/types";
import { TYPES_DIVIDER } from "../../../engine/compose.ts";
import { cs, js, md } from "./util.ts";

/**
 * Chapter 3: Collections, methods and null. Arrays and List<T>, Dictionary, methods as local
 * functions, and null safety. Lessons 7-10 all build on the variables from chapters 1 and 2.
 */

export const chapter3: Chapter = {
  id: "collections-and-methods",
  title: "Collections, methods and null",
  blurb: "Hold many values at once, name your own pieces of work, and handle 'no value' safely.",
  lessons: [
    // ───────────────────────── 7 ─────────────────────────
    {
      id: "csharp-basics-7-lists",
      title: "Arrays and List<T>",
      minutes: 30,
      xp: 130,
      concepts: ["arrays", "indexes", "foreach", "List<T>", "generics", "Add / Remove", "reference semantics"],
      learn: md`### Many values under one name

An **array** is a fixed-size row of values of the same type, numbered from **0**.

~~~csharp
int[] weights = { 4, 12, 7, 25 };      // four ints
string[] slots = new string[6];        // six empty slots
slots[0] = "Lamp";
Console.WriteLine(weights.Length);     // 4
Console.WriteLine(weights[2]);         // 7   (the third item: index 2)
Console.WriteLine(weights[^1]);        // 25  (^1 means "first from the end")
~~~

A new array is filled with **default values**: \`0\` for numbers, \`false\` for bools and \`null\` for strings and other reference types, *not* an empty string. The size is fixed when the array is created. Reading or writing outside it (\`weights[4]\`) crashes with an \`IndexOutOfRangeException\`: the last valid index is always \`Length - 1\`.

### \`foreach\`: visit every item

~~~csharp
int total = 0;
foreach (int w in weights)
{
    total += w;
}
~~~

\`foreach\` hands you each item in turn and handles the counting for you. You cannot assign to the loop variable, and you should not add or remove items from the collection while looping over it (that throws an \`InvalidOperationException\`). Use a \`for\` loop with an index when you need the position or want to change items.

### \`List<T>\`: a collection that grows

A \`List<T>\` is like an array that can resize. The \`<T>\` is a **type argument** ("generics"): \`List<string>\` is a list *of* strings, and the compiler will only let you put strings in it.

~~~csharp
List<string> queue = new() { "Lamp", "Desk", "Chair" };   // new() works because the type is on the left
queue.Add("Mirror");              // add at the end
queue.Remove("Desk");             // remove the first match (returns true or false)
queue.Insert(0, "Sofa");          // add at a position
queue.RemoveAt(1);                // remove by index
Console.WriteLine(queue.Count);   // lists use Count, arrays use Length
Console.WriteLine(queue.Contains("Lamp"));   // True
Console.WriteLine(queue[0]);      // index works exactly like an array
~~~

Printing a whole collection with \`string.Join\` is the tidy way:

~~~csharp
Console.WriteLine($"Queue ({queue.Count}): {string.Join(", ", queue)}");
~~~

### Useful helpers

- \`Array.Sort(weights)\` sorts an array **in place**; \`queue.Sort()\` does the same for a list. \`Array.Reverse\` flips it.
- Because implicit usings include \`System.Linq\`, you can also write \`weights.Sum()\`, \`weights.Max()\` and \`weights.Min()\`. Write the loops by hand once so you understand them; LINQ is a natural next step.
- \`queue.ToArray()\` and \`weights.ToList()\` convert between the two.

### Array or List?

Use a **List** by default when the number of items changes. Use an **array** when the size is fixed and known (a board with 6 slots, the days of a week, a pixel row).

### Arrays and lists are shared, not copied

~~~csharp
int[] a = { 1, 2, 3 };
int[] b = a;       // b points at THE SAME array, not a copy
b[0] = 99;
Console.WriteLine(a[0]);   // 99
~~~

Numbers, bools and chars are copied on assignment, but arrays, lists and most objects are **references**: two variables can point at one thing. Make a real copy with \`a.ToArray()\` or \`new List<int>(list)\`.

### Common mistakes

- Off by one: an array of 6 has indexes 0 to 5.
- Using \`Length\` on a list or \`Count\` on an array.
- Forgetting that unfilled string slots are \`null\`, not \`""\`.
- Changing a list while you \`foreach\` over it.
- Thinking \`b = a\` copies an array.`,
      mission: md`The warehouse shelves have six slots in a row, and a loading queue grows and shrinks all day. A fixed row is an array. A queue that changes is a list. A rack of parcel weights wants sorting so the heavy ones go on the floor.

When this lesson passes, the **Shelves** panel shows your slots (empty ones included), your queue and a bar for each weight.`,
      tasks: [
        "Create string[] slots = new string[6]; put \"Lamp\" in slot 0, \"Desk\" in slot 1 and \"Chair\" in slot 4. Count the filled ones with foreach into int filled (3)",
        "Create List<string> queue with Lamp, Desk and Chair. Add \"Mirror\", Remove \"Desk\", then print Queue (3): Lamp, Chair, Mirror using string.Join",
        "Create int[] weights = { 4, 12, 7, 25, 9, 3 }. With foreach compute totalWeight and heaviest, then Array.Sort the array",
        "Print Heaviest 25 kg of 60 kg; lightest 3 kg (the lightest is weights[0] after sorting). Show slots, filled, queue, weights, heaviest and totalWeight",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 7: organise the shelves.
// 1. string[] slots = new string[6];  slots[0] = "Lamp", slots[1] = "Desk", slots[4] = "Chair"
//    int filled = number of non-null slots (use foreach; the loop variable can be declared string?)
// 2. List<string> queue = new() { "Lamp", "Desk", "Chair" };  Add("Mirror");  Remove("Desk");
//    Print:  Queue (3): Lamp, Chair, Mirror      (string.Join(", ", queue))
// 3. int[] weights = { 4, 12, 7, 25, 9, 3 };  foreach -> int totalWeight, int heaviest;  then Array.Sort(weights);
// 4. Print:  Heaviest 25 kg of 60 kg; lightest 3 kg
// Depot.Show: slots, filled, queue, weights, heaviest, totalWeight
`,
      solutionAdd: cs`// Lesson 7: organise the shelves.
string[] slots = new string[6];
slots[0] = "Lamp";
slots[1] = "Desk";
slots[4] = "Chair";

int filled = 0;
foreach (string? slot in slots)
{
    if (slot != null) filled++;
}

List<string> queue = new() { "Lamp", "Desk", "Chair" };
queue.Add("Mirror");
queue.Remove("Desk");
Console.WriteLine($"Queue ({queue.Count}): {string.Join(", ", queue)}");

int[] weights = { 4, 12, 7, 25, 9, 3 };
int totalWeight = 0;
int heaviest = weights[0];
foreach (int w in weights)
{
    totalWeight += w;
    if (w > heaviest) heaviest = w;
}
Array.Sort(weights);
Console.WriteLine($"Heaviest {heaviest} kg of {totalWeight} kg; lightest {weights[0]} kg");

Depot.Show("slots", slots);
Depot.Show("filled", filled);
Depot.Show("queue", queue);
Depot.Show("weights", weights);
Depot.Show("heaviest", heaviest);
Depot.Show("totalWeight", totalWeight);`,
      explanation:
        "An array has a fixed size, so new string[6] gives six slots that start as null; assigning slots[4] fills the fifth one (indexes start at 0). foreach visits every slot and the null check counts the filled ones. A List<string> grows and shrinks: Add appends and Remove deletes the first match, leaving Lamp, Chair, Mirror. The loop over weights tracks a running total and the biggest value so far, and Array.Sort rearranges the same array in place, which puts the lightest weight at index 0.",
      hints: [
        { id: "h1", title: "Filling the array", content: "string[] slots = new string[6]; then slots[0] = \"Lamp\"; slots[1] = \"Desk\"; slots[4] = \"Chair\"; To count: foreach (string? slot in slots) { if (slot != null) filled++; } with int filled = 0; declared first." },
        { id: "h2", title: "The list", content: "List<string> queue = new() { \"Lamp\", \"Desk\", \"Chair\" }; queue.Add(\"Mirror\"); queue.Remove(\"Desk\"); Console.WriteLine($\"Queue ({queue.Count}): {string.Join(\", \", queue)}\");" },
        { id: "h3", title: "Total and heaviest", content: "Start int totalWeight = 0; and int heaviest = weights[0]; Inside foreach (int w in weights): add w to the total and set heaviest = w when w > heaviest. Call Array.Sort(weights); AFTER the loop, then weights[0] is the lightest." },
      ],
      tests: [
        {
          id: "t1",
          description: "the slots array has 6 slots, 3 of them filled",
          assertionCode: js`
assert(Array.isArray(scene.slots), "Send the array with Depot.Show(\"slots\", slots);");
assertEqual(scene.slots.length, 6, "number of slots (new string[6])");
assertEqual(scene.slots[0], "Lamp", "slots[0]");
assertEqual(scene.slots[1], "Desk", "slots[1]");
assertEqual(scene.slots[4], "Chair", "slots[4] (index 4 is the fifth slot)");
assertEqual(scene.slots.filter((s) => s !== null).length, 3, "filled slots (the others stay null)");
assertEqual(scene.filled, 3, "filled (count the non-null slots with foreach)");`,
        },
        {
          id: "t2",
          description: "the queue grows with Add and shrinks with Remove",
          assertionCode: js`
assertEqual(scene.queue, ["Lamp", "Chair", "Mirror"], "queue after Add(\"Mirror\") and Remove(\"Desk\")");
assert(lines.includes("Queue (3): Lamp, Chair, Mirror"), 'Print "Queue (3): Lamp, Chair, Mirror" using queue.Count and string.Join(", ", queue).');`,
        },
        {
          id: "t3",
          description: "foreach finds the total and the heaviest weight",
          assertionCode: js`
assertEqual(scene.totalWeight, 60, "totalWeight (4 + 12 + 7 + 25 + 9 + 3)");
assertEqual(scene.heaviest, 25, "heaviest");`,
        },
        {
          id: "t4",
          description: "the weights array is sorted in place",
          assertionCode: js`
assertEqual(scene.weights, [3, 4, 7, 9, 12, 25], "weights after Array.Sort(weights) (smallest first)");
assert(lines.includes("Heaviest 25 kg of 60 kg; lightest 3 kg"), 'Print "Heaviest 25 kg of 60 kg; lightest 3 kg". The lightest is weights[0] after sorting.');`,
        },
      ],
      unlocks: ["cs-shelves"],
      checks: [
        {
          prompt: "What is the index of the last element in an array that holds 6 items?",
          question: { type: "number", answer: 5 },
          explanation: "Indexes run from `0` to `Length - 1`. An array of 6 has indexes 0, 1, 2, 3, 4 and 5; index 6 throws `IndexOutOfRangeException`.",
        },
        {
          prompt: "What does this print?\n\n~~~csharp\nint[] a = { 1, 2, 3 };\nint[] b = a;\nb[0] = 99;\nConsole.WriteLine(a[0]);\n~~~",
          question: { type: "choice", options: ["1", "99", "0", "It does not compile"], answer: 1 },
          explanation: "An array is a reference type: `b = a` makes both variables point at the same array. To get an independent copy use `a.ToArray()` (or `(int[])a.Clone()`).",
        },
        {
          prompt: "After `string[] slots = new string[3];`, what is `slots[1]`?",
          question: { type: "choice", options: ["An empty string, \"\"", "`null`", "The text \"0\"", "A compile error"], answer: 1 },
          explanation: "New arrays hold the type's default value, and the default of every reference type, `string` included, is `null`. Code that reads such a slot has to handle `null` (lesson 10).",
        },
      ],
    },

    // ───────────────────────── 8 ─────────────────────────
    {
      id: "csharp-basics-8-dictionaries",
      title: "Dictionaries",
      minutes: 25,
      xp: 130,
      concepts: ["Dictionary<TKey,TValue>", "keys and values", "indexer", "TryGetValue", "ContainsKey", "foreach over pairs"],
      learn: md`### Look things up by name, not by position

A list answers "what is item number 3?". A **dictionary** answers "what goes with *this key*?". It stores **key/value pairs** and finds a value by its key almost instantly, however many entries there are. Each key can appear **once**.

~~~csharp
Dictionary<string, int> stock = new()
{
    ["LAMP"] = 12,
    ["DESK"] = 3,
    ["CHAIR"] = 0,
};
~~~

The two type arguments are the key type and the value type: here SKU text to a count.

### Reading, adding, updating

~~~csharp
Console.WriteLine(stock["LAMP"]);   // 12
stock["DESK"] += 4;                 // read, add, write back: 7
stock["MIRROR"] = 5;                // the key is new, so this ADDS it
stock["LAMP"] = 10;                 // the key exists, so this REPLACES the value
stock.Remove("CHAIR");              // delete a pair
Console.WriteLine(stock.Count);     // number of pairs
~~~

The indexer \`[ ]\` both adds and replaces. \`stock.Add("LAMP", 1)\` is stricter and throws an \`ArgumentException\` if the key already exists.

### Missing keys

Reading a key that is not there with the indexer **throws** a \`KeyNotFoundException\`. When a missing key is a normal possibility, ask first:

~~~csharp
if (stock.TryGetValue("SOFA", out int count))
{
    Console.WriteLine($"SOFA: {count}");
}
else
{
    Console.WriteLine("SOFA is not stocked");
}

stock.ContainsKey("LAMP");           // true
stock.GetValueOrDefault("SOFA");     // 0 (the default of int) when missing
~~~

\`TryGetValue\` is the same shape you met in \`int.TryParse\`: a \`bool\` for success and an \`out\` variable for the result.

### Looping over a dictionary

\`foreach\` gives you one \`KeyValuePair\` per entry, with \`.Key\` and \`.Value\`.

~~~csharp
foreach (KeyValuePair<string, int> pair in stock)
{
    Console.WriteLine($"{pair.Key,-8}{pair.Value,3}");
}

foreach (var (sku, qty) in stock)      // deconstruction: names for both halves
{
    if (qty == 0) Console.WriteLine($"{sku} is sold out");
}
~~~

Dictionaries usually enumerate in the order entries were added, but that is an implementation detail. Do not write code that depends on the order, and do not add or remove entries inside the loop.

### Counting things

A very common job is tallying how often something occurs:

~~~csharp
Dictionary<char, int> letters = new();
foreach (char c in "robot")
{
    letters[c] = letters.GetValueOrDefault(c) + 1;
}
// o: 2, r: 1, b: 1, t: 1
~~~

### Keys

A key must have a stable identity: strings, numbers, chars, enums and records all work well. String keys are **case-sensitive**: \`"lamp"\` and \`"LAMP"\` are different. Create \`new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase)\` if you want them to match.

If you only need to remember *which* things you have seen (no values), a \`HashSet<string>\` is a dictionary without the values.

### Common mistakes

- Reading \`dict[key]\` for a key that may not exist.
- Using \`Add\` when you meant "set or replace".
- Expecting a particular order.
- Case mismatches in string keys.`,
      mission: md`The stock room is a wall of bins labelled by SKU. Staff need a count for any SKU in an instant, a way to receive a delivery, an honest answer when a SKU is not stocked at all, and a list of bins that are running low.

When this lesson passes, the **Stock bins** panel draws a bar for every SKU from your dictionary and flags the low ones.`,
      tasks: [
        "Create Dictionary<string, int> stock with LAMP 12, DESK 3 and CHAIR 0 using the initializer syntax",
        "Receive a shipment: add 4 to DESK with += through the indexer, and add a new MIRROR with 5",
        "Look up \"SOFA\" with TryGetValue and print SOFA is not stocked when it is missing",
        "foreach over the pairs, printing each SKU and count. Put every SKU with fewer than 6 in a List<string> lowStock, then Show stock and lowStock",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 8: stock bins.
// 1. Dictionary<string, int> stock = new() { ["LAMP"] = 12, ["DESK"] = 3, ["CHAIR"] = 0 };
// 2. stock["DESK"] += 4;   stock["MIRROR"] = 5;
// 3. TryGetValue("SOFA", out int sofaCount)  ->  print "SOFA is not stocked" when it is missing
// 4. List<string> lowStock = new();   foreach (KeyValuePair<string, int> pair in stock) { print it; < 6 -> lowStock.Add(pair.Key) }
// Depot.Show: stock, lowStock
`,
      solutionAdd: cs`// Lesson 8: stock bins.
Dictionary<string, int> stock = new()
{
    ["LAMP"] = 12,
    ["DESK"] = 3,
    ["CHAIR"] = 0,
};

stock["DESK"] += 4;      // a delivery arrived
stock["MIRROR"] = 5;     // a brand-new SKU

if (stock.TryGetValue("SOFA", out int sofaCount))
{
    Console.WriteLine($"SOFA: {sofaCount}");
}
else
{
    Console.WriteLine("SOFA is not stocked");
}

List<string> lowStock = new();
foreach (KeyValuePair<string, int> pair in stock)
{
    Console.WriteLine($"{pair.Key,-8}{pair.Value,3}");
    if (pair.Value < 6) lowStock.Add(pair.Key);
}

Depot.Show("stock", stock);
Depot.Show("lowStock", lowStock);`,
      explanation:
        "The indexer both reads and writes: stock[\"DESK\"] += 4 reads 3, adds 4 and writes 7 back, and stock[\"MIRROR\"] = 5 creates a new pair. Reading stock[\"SOFA\"] directly would throw KeyNotFoundException, so TryGetValue reports the miss as false instead. foreach yields KeyValuePair items with Key and Value, which is how the low-stock list is collected: CHAIR (0) and MIRROR (5) are under 6.",
      hints: [
        { id: "h1", title: "Creating and updating", content: "Dictionary<string, int> stock = new() { [\"LAMP\"] = 12, ... }; Then stock[\"DESK\"] += 4; and stock[\"MIRROR\"] = 5; The indexer adds a key that does not exist yet." },
        { id: "h2", title: "TryGetValue", content: "if (stock.TryGetValue(\"SOFA\", out int sofaCount)) { ... } else { Console.WriteLine(\"SOFA is not stocked\"); } The out variable is declared right in the call." },
        { id: "h3", title: "Looping over pairs", content: "foreach (KeyValuePair<string, int> pair in stock) { Console.WriteLine($\"{pair.Key,-8}{pair.Value,3}\"); if (pair.Value < 6) lowStock.Add(pair.Key); } Declare List<string> lowStock = new(); before the loop." },
      ],
      tests: [
        {
          id: "t1",
          description: "the dictionary holds the updated counts",
          assertionCode: js`
assert(scene.stock && typeof scene.stock === "object", "Send the dictionary with Depot.Show(\"stock\", stock);");
assertEqual(scene.stock, { LAMP: 12, DESK: 7, CHAIR: 0, MIRROR: 5 }, "stock (DESK 3 + 4 = 7, and MIRROR was added with 5)");`,
        },
        {
          id: "t2",
          description: "a missing key is reported without crashing",
          assertionCode: js`assert(lines.includes("SOFA is not stocked"), 'Print "SOFA is not stocked" when TryGetValue says the key is missing. Reading stock["SOFA"] directly would crash.');`,
        },
        {
          id: "t3",
          description: "every SKU is printed with its count",
          assertionCode: js`
for (const [sku, qty] of [["LAMP", 12], ["DESK", 7], ["CHAIR", 0], ["MIRROR", 5]]) {
  assert(lines.some((l) => new RegExp("^" + sku + "\\s+" + qty + "$").test(l)), "Print a line for " + sku + " with its count " + qty + ", e.g. $\"{pair.Key,-8}{pair.Value,3}\".");
}`,
        },
        {
          id: "t4",
          description: "lowStock lists the SKUs with fewer than 6",
          assertionCode: js`
assert(Array.isArray(scene.lowStock), "Send the list with Depot.Show(\"lowStock\", lowStock);");
assertEqual([...scene.lowStock].sort(), ["CHAIR", "MIRROR"], "lowStock (counts below 6: CHAIR has 0 and MIRROR has 5)");`,
        },
      ],
      unlocks: ["cs-stock"],
      checks: [
        {
          prompt: "What happens when you run `int n = stock[\"SOFA\"];` and `SOFA` is not a key?",
          question: {
            type: "choice",
            options: ["`n` becomes 0", "A `KeyNotFoundException` is thrown", "The key is added with a value of 0", "It does not compile"],
            answer: 1,
          },
          explanation: "The indexer *throws* for a missing key. Use `TryGetValue` (or `ContainsKey`, or `GetValueOrDefault`) when the key might not be there.",
        },
        {
          prompt: "Which statement quietly replaces the value when `LAMP` is already a key?",
          question: {
            type: "choice",
            options: ["`stock.Add(\"LAMP\", 5);`", "`stock[\"LAMP\"] = 5;`", "`stock.Insert(\"LAMP\", 5);`", "Both of the first two"],
            answer: 1,
          },
          explanation: "`Add` throws an `ArgumentException` for a duplicate key. The indexer sets the value: it adds the pair when the key is new and replaces it when it exists. `Dictionary` has no `Insert`.",
        },
      ],
    },

    // ───────────────────────── 9 ─────────────────────────
    {
      id: "csharp-basics-9-methods",
      title: "Methods",
      minutes: 30,
      xp: 140,
      concepts: ["methods", "parameters", "return values", "static classes", "optional & named arguments", "overloading", "scope"],
      learn: md`### Name a piece of work

When the same calculation appears twice, or a block of code deserves a name, turn it into a **method**: a named, reusable piece of work. Write it once, call it as often as you like.

~~~csharp
static int Distance(int x1, int y1, int x2, int y2)
{
    return Math.Abs(x1 - x2) + Math.Abs(y1 - y2);
}
~~~

Read the first line as a contract: it **returns an \`int\`**, it is **called \`Distance\`**, and it **takes four ints**. The values you pass in are **arguments**; the names in the declaration are **parameters**. \`return\` sends a value back and ends the method. (\`static\` and \`public\` are explained in lesson 11. For now: \`public\` lets other code call it, and \`static\` means you call it on the class itself.)

### Where methods live in this file

In a top-level-statements file, anything that is a *type* goes below your statements, under the divider line. Methods you share across the program are written inside a \`static class\` there, and you call them with the class name in front:

~~~csharp
Console.WriteLine(Planner.Distance(0, 0, 6, 2));   // 8

// ───── type declarations go below this line ─────
static class Planner
{
    public static int Distance(int x1, int y1, int x2, int y2) =>
        Math.Abs(x1 - x2) + Math.Abs(y1 - y2);
}
~~~

For a tiny helper that only one spot needs, a **local function** written between your statements is fine (\`int Square(int n) => n * n;\`). It can see the variables above it, and it **cannot be overloaded**. For anything shared, prefer a method in a class.

### Short form and \`void\`

When a method is a single expression, use \`=>\` (as above). A method that does something but gives nothing back has the return type \`void\`:

~~~csharp
public static void Announce(string text) => Console.WriteLine($">> {text}");
~~~

### Parameters are copies

An \`int\`, \`double\` or \`bool\` argument is **copied** into the parameter. Changing the parameter inside the method does not change the caller's variable.

~~~csharp
static void Bump(int n) { n++; }
int count = 5;
Bump(count);
Console.WriteLine(count);   // still 5
~~~

(Collections and objects are references, as you saw in lesson 7, so a method that adds to a list it receives *does* change that list.)

### Optional and named arguments

Give a parameter a default value and callers may leave it out. Optional parameters must come **last**. Name an argument at the call to say which parameter you mean:

~~~csharp
public static double Minutes(int distance, double pace = 1.5) => Math.Round(distance / pace, 1);

Planner.Minutes(8);               // uses the default pace: 5.3
Planner.Minutes(8, 2.0);          // 4
Planner.Minutes(8, pace: 2.0);    // same, but the call explains itself
~~~

### Overloading

Several methods in one class may share a name if their parameter lists differ. The compiler picks the one that fits the arguments.

~~~csharp
public static string Format(int distance) => $"{distance} m";
public static string Format(double minutes) => $"{minutes:F1} min";

Planner.Format(8);       // "8 m"        the int version
Planner.Format(5.3);     // "5.3 min"    the double version
~~~

The return type alone is not enough to tell overloads apart.

### Scope: who can see what

Variables declared inside a method exist only while it runs. A method in a class cannot see your top-level variables at all, so everything it needs must arrive as a parameter. That is a feature: the method can be understood, and checked, on its own.

### Design tips

- A method should do **one** thing. A good name is a verb: \`Distance\`, \`Format\`, \`FindOwner\`.
- If you cannot name it without "and", split it.
- A method that calculates and returns is easier to reuse and check than one that prints.

### Common mistakes

- *Not all code paths return a value*: an \`if\` with a \`return\` but no \`return\` after it.
- Ignoring the result: \`Math.Round(x, 1);\` on its own line does nothing useful.
- Putting an optional parameter before a required one.
- Expecting a method to change the caller's \`int\`.
- Writing a call such as \`Distance(...)\` and forgetting the \`Planner.\` in front.`,
      mission: md`Rex needs a route: dock to A3, then B1, then home. A route is made of legs, and every leg needs the same few pieces of work: how far is it, how many minutes, and how should it read on the board?

You will turn those into methods in a \`Planner\` class. When this lesson passes, the **Route planner** panel lists your legs with the totals.`,
      tasks: [
        "In static class Planner (under the divider) write public static int Distance(int x1, int y1, int x2, int y2): the Manhattan distance, |x1 - x2| + |y1 - y2|",
        "Add public static double Minutes(int distance, double pace = 1.5) that returns distance / pace rounded to 1 decimal. Call it once with the default and once with a named pace: 2.0",
        "Add two overloads, string Format(int distance) giving \"8 m\" and string Format(double minutes) giving \"5.3 min\" (one decimal), and string Leg(string origin, string target, int distance, double minutes) combining them as \"Dock -> A3 | 8 m | 5.3 min\"",
        "Plan Dock (0,0) -> A3 (6,2) -> B1 (2,4) -> Dock, print the three legs, and Show legs (string[]), totalMeters, totalMinutes and fastMinutes (the whole route at pace 2.0)",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 9: the route planner. Two parts: the methods go in the Planner class under the divider,
// and the route is planned here, above it.
// Part B (here): Stops: Dock (0,0), A3 (6,2), B1 (2,4). Legs: Dock->A3, A3->B1, B1->Dock.
//    int toA3 = Planner.Distance(0, 0, 6, 2); ... (the other two legs the same way)
//    string[] legs = { Planner.Leg("Dock", "A3", toA3, Planner.Minutes(toA3)), ... };  print each leg
//    int totalMeters, double totalMinutes = Planner.Minutes(totalMeters),
//    double fastMinutes = Planner.Minutes(totalMeters, pace: 2.0)
// Depot.Show: legs, totalMeters, totalMinutes, fastMinutes

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── Part A: write these methods inside the class (all "public static"):
// 1. int Distance(int x1, int y1, int x2, int y2)               -> |x1-x2| + |y1-y2|
// 2. double Minutes(int distance, double pace = 1.5)             -> Math.Round(distance / pace, 1)
// 3. string Format(int distance)  -> "8 m"      string Format(double minutes) -> "5.3 min"  (use :F1)
//    string Leg(string origin, string target, int distance, double minutes) -> "Dock -> A3 | 8 m | 5.3 min"
static class Planner
{
}`,
      solutionAdd: cs`// Lesson 9: the route planner.
int toA3 = Planner.Distance(0, 0, 6, 2);
int toB1 = Planner.Distance(6, 2, 2, 4);
int toDock = Planner.Distance(2, 4, 0, 0);

string[] legs =
{
    Planner.Leg("Dock", "A3", toA3, Planner.Minutes(toA3)),
    Planner.Leg("A3", "B1", toB1, Planner.Minutes(toB1)),
    Planner.Leg("B1", "Dock", toDock, Planner.Minutes(toDock)),
};
foreach (string leg in legs)
{
    Console.WriteLine(leg);
}

int totalMeters = toA3 + toB1 + toDock;
double totalMinutes = Planner.Minutes(totalMeters);
double fastMinutes = Planner.Minutes(totalMeters, pace: 2.0);
Console.WriteLine($"Route: {Planner.Format(totalMeters)}, {Planner.Format(totalMinutes)} ({Planner.Format(fastMinutes)} at pace 2.0)");

Depot.Show("legs", legs);
Depot.Show("totalMeters", totalMeters);
Depot.Show("totalMinutes", totalMinutes);
Depot.Show("fastMinutes", fastMinutes);

${TYPES_DIVIDER}

// Route planning helpers (public static: callable as Planner.Name(...)).
static class Planner
{
    public static int Distance(int x1, int y1, int x2, int y2) =>
        Math.Abs(x1 - x2) + Math.Abs(y1 - y2);

    public static double Minutes(int distance, double pace = 1.5) =>
        Math.Round(distance / pace, 1);

    public static string Format(int distance) => $"{distance} m";

    public static string Format(double minutes) => $"{minutes:F1} min";

    public static string Leg(string origin, string target, int distance, double minutes) =>
        $"{origin} -> {target} | {Format(distance)} | {Format(minutes)}";
}`,
      explanation:
        "Distance returns the Manhattan distance (horizontal plus vertical steps). Minutes has a default pace, so Planner.Minutes(toA3) uses 1.5 and Planner.Minutes(totalMeters, pace: 2.0) overrides it by name. The two Format methods share a name; the compiler picks Format(int) for an int argument and Format(double) for a double, so 8 prints \"8 m\" and 5.3 prints \"5.3 min\". Leg composes the others, which is how small methods build bigger behaviour. Totals: 8 + 6 + 6 = 20 m; 20 / 1.5 rounds to 13.3 min; at pace 2.0 it is 10.0. The methods live below the divider because they are part of a class, and C# wants every type after the statements.",
      hints: [
        { id: "h1", title: "Distance and Minutes", content: "Inside static class Planner { }: public static int Distance(int x1, int y1, int x2, int y2) => Math.Abs(x1 - x2) + Math.Abs(y1 - y2); and public static double Minutes(int distance, double pace = 1.5) => Math.Round(distance / pace, 1); The default makes the second argument optional." },
        { id: "h2", title: "Overloads", content: "public static string Format(int distance) => $\"{distance} m\"; public static string Format(double minutes) => $\"{minutes:F1} min\"; The compiler chooses by argument type. Leg builds $\"{origin} -> {target} | {Format(distance)} | {Format(minutes)}\"." },
        { id: "h3", title: "Planning the route", content: "int toA3 = Planner.Distance(0, 0, 6, 2); and so on for the other two legs. string[] legs = { Planner.Leg(\"Dock\", \"A3\", toA3, Planner.Minutes(toA3)), ... }; Then totalMeters is the sum, and Planner.Minutes(totalMeters, pace: 2.0) gives fastMinutes." },
      ],
      tests: [
        {
          id: "t1",
          description: "each leg is formatted with the right distance and minutes",
          assertionCode: js`
assert(Array.isArray(scene.legs), "Send the string[] with Depot.Show(\"legs\", legs);");
assertEqual(scene.legs, ["Dock -> A3 | 8 m | 5.3 min", "A3 -> B1 | 6 m | 4.0 min", "B1 -> Dock | 6 m | 4.0 min"], "legs");`,
        },
        {
          id: "t2",
          description: "the legs are printed one per line",
          assertionCode: js`
for (const leg of ["Dock -> A3 | 8 m | 5.3 min", "A3 -> B1 | 6 m | 4.0 min", "B1 -> Dock | 6 m | 4.0 min"]) {
  assert(lines.includes(leg), "Print the leg: " + leg);
}`,
        },
        {
          id: "t3",
          description: "the route totals use the default pace",
          assertionCode: js`
assertEqual(scene.totalMeters, 20, "totalMeters (8 + 6 + 6)");
assertClose(scene.totalMinutes, 13.3, 0.0001, "totalMinutes (Minutes(totalMeters) with the default pace of 1.5)");`,
        },
        {
          id: "t4",
          description: "a named argument overrides the default pace",
          assertionCode: js`assertClose(scene.fastMinutes, 10, 0.0001, "fastMinutes (Minutes(totalMeters, pace: 2.0): 20 / 2.0)");`,
        },
      ],
      unlocks: ["cs-routes"],
      checks: [
        {
          prompt: "Given `Format(int d)` and `Format(double m)` in the same class, which one runs for `Format(7)`?",
          question: { type: "choice", options: ["The `int` version", "The `double` version", "Neither: it is ambiguous", "Both, one after the other"], answer: 0 },
          explanation: "`7` is an `int` literal, and an exact match always beats a conversion. `Format(7.0)` would pick the `double` version. The compiler decides overloads from the argument types, before the program runs.",
        },
        {
          prompt: "Which declaration is **not** allowed?",
          question: {
            type: "choice",
            options: ["`void Go(int a, int b = 2)`", "`void Go(int a = 1, int b = 2)`", "`void Go(int a = 1, int b)`", "`void Go()`"],
            answer: 2,
          },
          explanation: "Optional parameters must come after all required ones. With `a` optional and `b` required, a caller could not leave `a` out and still supply `b` by position.",
        },
        {
          prompt: "What does this print?\n\n~~~csharp\nstatic void Bump(int n) { n++; }\nint count = 5;\nBump(count);\nConsole.WriteLine(count);\n~~~",
          question: { type: "number", answer: 5 },
          explanation: "The `int` is copied into `n`. Incrementing the copy leaves `count` alone. To get a changed value out of a method, `return` it and assign the result: `count = Bump(count);`.",
        },
      ],
    },

    // ───────────────────────── 10 ─────────────────────────
    {
      id: "csharp-basics-10-nulls",
      title: "Null and nullable types",
      minutes: 25,
      xp: 140,
      concepts: ["null", "nullable reference types", "?", "??", "?.", "??=", "int?", "NullReferenceException"],
      learn: md`### What is \`null\`?

\`null\` means *"there is no value here"*. A reference type variable (\`string\`, an array, a \`List\`, any object) can hold \`null\` instead of pointing at something. Using such a variable as if it held something crashes the program with the most common runtime error in C#:

~~~csharp
string? note = null;
Console.WriteLine(note.Length);   // NullReferenceException: Object reference not set to an instance of an object
~~~

Simple types such as \`int\`, \`double\` and \`bool\` can never be null.

### Nullable reference types: the compiler helps

Modern projects switch on *nullable reference types*. Then the type tells you the truth:

- \`string\` means **never null**
- \`string?\` means **might be null**, so check before you use it

The compiler follows your code and warns you (the CS86xx warnings in an editor) wherever a possible null could reach a place that cannot handle it. Treat those warnings as real bugs waiting to happen. You already met this: \`Console.ReadLine()\` returns \`string?\`, and the dictionary \`TryGetValue\` can hand back a missing value.

### The tools

~~~csharp
string? owner = FindOwner("P-999");

if (owner is null) { }               // the check: is null / is not null
string who = owner ?? "unclaimed";   // ?? : the left side, or this when it is null
int len = owner?.Length ?? 0;        // ?. : if owner is null the WHOLE chain gives null, instead of crashing
owner ??= "nobody";                  // ??= : assign only when the variable is currently null
~~~

- **\`?.\`** (null-conditional) stops a whole chain at the first null: \`owner?.Trim().ToUpper()\` is \`null\` if \`owner\` is. The result type becomes nullable, which is why it is usually paired with \`??\`.
- **\`??\`** supplies a default.
- **\`!\`** (the null-forgiving operator) tells the compiler "trust me, it is not null". If you are wrong the program still crashes. Treat it as a last resort.

### Nullable *value* types

An \`int\` cannot be null, but sometimes "no number" is a real answer: a score that has not been given yet. \`int?\` is a wrapper that can be either:

~~~csharp
int? score = null;
score.HasValue;               // false
int safe = score ?? 0;        // 0
int bad = score.Value;        // throws InvalidOperationException when there is no value
score = 7;                    // fine
~~~

Without \`?\`, \`int x = score;\` does not compile: C# makes you decide what "no value" should mean.

### Designing with null

- Return \`T?\` from a method to say *"this might find nothing"*, like \`string? FindOwner(...)\`. Callers are then forced by the compiler to deal with it.
- Missing is not the same as empty: \`""\` is a string with no characters, \`null\` is no string. \`string.IsNullOrWhiteSpace(text)\` checks both.
- Prefer a **meaningful default** (\`?? "unclaimed"\`) when there is a sensible one; handle the null explicitly when there is not.
- Do not use null as a hidden error code. For *unexpected* failures, exceptions (lesson 13) are the right tool.

### Common mistakes

- Calling a method on something that might be null without \`?.\` or a check.
- Overusing \`!\` to silence warnings.
- Forgetting that \`?.\` makes the result nullable.
- Testing \`if (text == "")\` and forgetting the null case.`,
      mission: md`Scanners at the dock read a parcel code and look the owner up. Some codes are unknown, and a driver's note field is often blank. The old software crashed on every unknown code; yours will say *unclaimed* and keep going.

When this lesson passes, the **Parcel scanner** panel lists every scan, with a clear marker on the ones that found nobody.`,
      tasks: [
        "Create Dictionary<string, string> owners with P-100 for Mika and P-101 for Jo, and a local function string? FindOwner(string scanCode) that returns the owner, or null when the code is unknown (TryGetValue)",
        "Loop over the codes { \"P-100\", \"P-999\", \"P-101\" }: add \"<code>: <owner or unclaimed>\" to a List<string> scans using ??, and count the misses (is null) in int unclaimed. Print each scan",
        "Declare string? driverNote = null; get int noteLength with ?. and ?? (Trim().Length, or 0), then use ??= to give it the text \"no note\" and print Note: no note (0)",
        "Show scans, unclaimed and noteLength",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 10: unknown parcels must not crash the scanner.
// 1. Dictionary<string, string> owners = new() { ["P-100"] = "Mika", ["P-101"] = "Jo" };
//    string? FindOwner(string scanCode)   -> the owner, or null  (owners.TryGetValue(scanCode, out string? name) ? name : null)
// 2. foreach scanned in { "P-100", "P-999", "P-101" }:  string? found = FindOwner(scanned);
//    scans.Add($"{scanned}: {found ?? "unclaimed"}");   count unclaimed with  found is null
// 3. string? driverNote = null;   int noteLength = driverNote?.Trim().Length ?? 0;   driverNote ??= "no note";
//    Print:  Note: no note (0)
// Depot.Show: scans, unclaimed, noteLength
`,
      solutionAdd: cs`// Lesson 10: unknown parcels must not crash the scanner.
Dictionary<string, string> owners = new()
{
    ["P-100"] = "Mika",
    ["P-101"] = "Jo",
};

string? FindOwner(string scanCode) =>
    owners.TryGetValue(scanCode, out string? name) ? name : null;

string[] scannedCodes = { "P-100", "P-999", "P-101" };
List<string> scans = new();
int unclaimed = 0;
foreach (string scanned in scannedCodes)
{
    string? found = FindOwner(scanned);
    if (found is null) unclaimed++;
    scans.Add($"{scanned}: {found ?? "unclaimed"}");
}
foreach (string scan in scans)
{
    Console.WriteLine(scan);
}

string? driverNote = null;
int noteLength = driverNote?.Trim().Length ?? 0;
driverNote ??= "no note";
Console.WriteLine($"Note: {driverNote} ({noteLength})");

Depot.Show("scans", scans);
Depot.Show("unclaimed", unclaimed);
Depot.Show("noteLength", noteLength);`,
      explanation:
        "FindOwner returns string?, so the compiler makes every caller think about the missing case. found ?? \"unclaimed\" supplies a default, and found is null counts the misses without touching the value. driverNote?.Trim().Length stops at the null and yields null, so ?? 0 turns that into 0 instead of a NullReferenceException. ??= assigns \"no note\" only because the variable was null, which is why the final line shows the new text next to the old length.",
      hints: [
        { id: "h1", title: "A method that may find nothing", content: "string? FindOwner(string scanCode) => owners.TryGetValue(scanCode, out string? name) ? name : null; The return type string? documents that null is possible." },
        { id: "h2", title: "?? and is null", content: "Inside the loop: string? found = FindOwner(scanned); if (found is null) unclaimed++; scans.Add($\"{scanned}: {found ?? \"unclaimed\"}\"); You can nest quotes inside the braces of an interpolated string." },
        { id: "h3", title: "?. and ??=", content: "int noteLength = driverNote?.Trim().Length ?? 0; then driverNote ??= \"no note\"; and Console.WriteLine($\"Note: {driverNote} ({noteLength})\"); noteLength was computed BEFORE the assignment, so it stays 0." },
      ],
      tests: [
        {
          id: "t1",
          description: "known and unknown codes are scanned",
          assertionCode: js`
assert(Array.isArray(scene.scans), "Send the list with Depot.Show(\"scans\", scans);");
assertEqual(scene.scans, ["P-100: Mika", "P-999: unclaimed", "P-101: Jo"], "scans (an unknown code should read 'unclaimed' via ??)");`,
        },
        {
          id: "t2",
          description: "unclaimed counts the lookups that found nobody",
          assertionCode: js`assertEqual(scene.unclaimed, 1, "unclaimed (only P-999 has no owner; test the result with 'is null')");`,
        },
        {
          id: "t3",
          description: "?. and ?? make a missing note safe",
          assertionCode: js`
assertEqual(scene.noteLength, 0, "noteLength (a null note has length 0 via ?.Length ?? 0)");
assert(lines.includes("Note: no note (0)"), 'Print "Note: no note (0)": use ??= to give driverNote its text AFTER measuring it.');`,
        },
        {
          id: "t4",
          description: "every scan is printed",
          assertionCode: js`
for (const scan of ["P-100: Mika", "P-999: unclaimed", "P-101: Jo"]) assert(lines.includes(scan), "Print the scan line: " + scan);`,
        },
      ],
      unlocks: ["cs-scanner"],
      checks: [
        {
          prompt: "What is `len`?\n\n~~~csharp\nstring? s = null;\nint len = s?.Length ?? -1;\n~~~",
          question: { type: "number", answer: -1 },
          explanation: "`s?.Length` sees that `s` is null and produces `null` (an `int?`) instead of crashing. `?? -1` then replaces that null with `-1`.",
        },
        {
          prompt: "Why does `int? score = null; int x = score;` not compile?",
          question: {
            type: "choice",
            options: [
              "An `int?` may hold no value, so C# will not silently convert it to a plain `int`",
              "`null` cannot be assigned to anything",
              "`score` must be `const`",
              "`int?` is not a real type",
            ],
            answer: 0,
          },
          explanation: "You must decide what \"no value\" means: `int x = score ?? 0;` (a default) or `score.Value` (accept an exception). The compiler refuses to hide that choice.",
        },
        {
          prompt: "Which line throws a `NullReferenceException` at run time?",
          question: {
            type: "choice",
            options: [
              "`string? s = null; Console.WriteLine(s?.Length);`",
              "`string? s = null; Console.WriteLine(s ?? \"none\");`",
              "`string? s = null; Console.WriteLine(s!.Length);`",
              "`string? s = null; Console.WriteLine(s is null);`",
            ],
            answer: 2,
          },
          explanation: "`!` only silences the compiler. It promises \"this is not null\", and when the promise is false the program crashes. The other three handle null safely.",
        },
      ],
    },
  ],
};
