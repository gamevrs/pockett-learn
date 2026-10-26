import type { Chapter } from "@/engine/types";
import { TYPES_DIVIDER } from "../../../engine/compose.ts";
import { cs, js, md } from "./util.ts";

/**
 * Chapter 3: Reusable, safe, parsed. Generic code, extension methods, nullable references end
 * to end, and turning messy text into clean values.
 */

export const chapter3: Chapter = {
  id: "reusable-safe-parsed",
  title: "Reusable, safe and parsed",
  blurb: "Write code once for many types, make missing values explicit, and turn messy text into clean data.",
  lessons: [
    // ───────────────────────── 9 ─────────────────────────
    {
      id: "csharp-linq-9-generics",
      title: "Generics and constraints",
      minutes: 30,
      xp: 180,
      concepts: ["generic methods", "generic classes", "type parameters", "type inference", "constraints", "where T :", "IComparable<T>"],
      learn: md`### Write it once, for any type

You use generics every day: \`List<T>\`, \`Dictionary<K,V>\`, \`Queue<T>\`. The \`<T>\` is a **type parameter**: a placeholder that is replaced by a real type when somebody uses it. A \`List<int>\` and a \`List<string>\` are built from the same code, yet the compiler knows exactly what each one holds, so there are no casts and no "is this really a string?" doubts.

You write your own when you notice the same logic repeated for different types. This method finds the biggest element in a list:

~~~csharp
T Largest<T>(IReadOnlyList<T> items) where T : IComparable<T>
{
    T best = items[0];
    foreach (T item in items)
    {
        if (item.CompareTo(best) > 0) best = item;
    }
    return best;
}
~~~

- \`<T>\` after the method name declares the type parameter.
- \`T\` is then usable as a type inside: for parameters, locals and the return type.
- The caller rarely writes the type: \`Largest(new[] { 41, 7, 93 })\` works because the compiler **infers** \`T = int\` from the argument. If it cannot infer, you get \`error CS0411: The type arguments for method 'Make<T>()' cannot be inferred from the usage. Try specifying the type arguments explicitly.\` and write \`Make<int>()\`.

### Constraints: what must be true of T?

Inside a generic method the compiler knows nothing about \`T\`, so it must refuse anything that might not work:

~~~csharp
bool Bigger<T>(T a, T b) => a > b;
// error CS0019: Operator '>' cannot be applied to operands of type 'T' and 'T'
~~~

A **constraint** tells the compiler (and the caller) what \`T\` is guaranteed to offer. You write them after the signature with \`where\`:

- \`where T : IComparable<T>\`: T can be compared, so \`CompareTo\` is available.
- \`where T : ILoadable\`: T has the members of that interface (or is a class inheriting from that base class).
- \`where T : class\` / \`struct\`: T is a reference type / a value type.
- \`where T : new()\`: T has a public parameterless constructor, so \`new T()\` is allowed.
- \`where T : notnull\`: T is not a nullable type (required for dictionary keys, for instance).

Several can be combined: \`where T : class, ILoadable, new()\`. A caller that breaks the rule is stopped at compile time: \`error CS0311: The type 'string' cannot be used as type parameter 'T' in the generic type or method 'Hold<T>'. There is no implicit reference conversion from 'string' to 'ILoadable'.\` That is the point: the mistake shows up as a red line in the editor, not as a crash in production.

### Generic classes

A class can have type parameters too, and its constraints apply to every member:

~~~csharp
class Hold<T> where T : ILoadable
{
    readonly List<T> _items = new();
    public Hold(int capacityKg) { CapacityKg = capacityKg; }
    public int CapacityKg { get; }
    public int TotalKg => _items.Sum(item => item.MassKg);

    public bool TryAdd(T item)
    {
        if (TotalKg + item.MassKg > CapacityKg) return false;
        _items.Add(item);
        return true;
    }
}
~~~

\`Hold<Crate>\` and \`Hold<PassengerParty>\` are two different types made from one definition. Because \`T\` is known to be \`ILoadable\`, the class can read \`item.MassKg\` without any cast. The method name \`TryAdd\` follows the **Try pattern**: return \`bool\` instead of throwing when "no" is an expected answer.

### Two type parameters

~~~csharp
Dictionary<K, List<V>> GroupInto<K, V>(IEnumerable<V> items, Func<V, K> keyOf) where K : notnull
~~~

This is a tiny \`GroupBy\`. \`Func<V, K>\` is a delegate type: a function that takes a \`V\` and returns a \`K\`. A lambda such as \`shipment => shipment.Category\` fits it, and the compiler infers both \`V = Shipment\` and \`K = string\`. Naming conventions: a single parameter is \`T\`; with several, use meaningful names (\`TKey\`, \`TValue\`) or short ones as here.

### Good to know

- **Each closed type is separate**: \`Hold<Crate>.Count\` (a static field) is not shared with \`Hold<string>\`.
- \`default(T)\` is \`null\` for reference types, \`0\` for numbers, and so on. \`T?\` means different things for class and struct constraints, so mark it deliberately.
- An empty list passed to \`Largest\` makes \`items[0]\` throw \`ArgumentOutOfRangeException\`. Generic code still needs to say what happens on empty input: throw a clear exception, or return a \`T?\`.
- Arrays and lists of a **reference type** are accepted where a read-only sequence of a base type is expected (a \`List<Crate>\` is an \`IEnumerable<ILoadable>\`). This is called covariance, and it works for the read-only interfaces only.

### Common mistakes

- Using generics before there are two uses. If only one type will ever use it, write it for that type first.
- Forgetting the constraint and then fighting CS0019 or CS1061 inside the method.
- Making everything generic, including things that should be a plain interface.
- Putting \`where\` before the parameter list instead of after it.`,
      mission: md`The port is buying a second loading system and wants to stop copying the same logic for every kind of cargo. A hold that refuses to overfill, a "recently arrived" board that keeps only the latest few entries, and a search for the biggest item should all be written once.

You will write a constrained generic method, a constrained generic class, an unconstrained generic class and a two-type-parameter helper. When this lesson passes, the **Generic toolkit** shows each one working on real port data.`,
      tasks: [
        "Write local function T Largest<T>(IReadOnlyList<T> items) where T : IComparable<T>. Call it on new[] { 41, 7, 93, 12 }, on all crew names (vessels.SelectMany(vessel => vessel.Crew).ToList()) and on a list of crates built from the shipments. Print Largest number: 93, Last crew name alphabetically: Wren Castellano and Last crate in sort order: H-3002 (the lightest, because Crate sorts heavier first)",
        "Under the divider write class Hold<T> where T : ILoadable with capacityKg, TotalKg, Items and bool TryAdd(T item) that refuses an item that would exceed the capacity. Offer every shipment, in manifest order and as a Crate, to a new Hold<Crate>(5000). Collect accepted and refused ids and print Hold of 5000 kg: 6 accepted, 8 refused, 4890 kg loaded",
        "Under the divider write class RecentArrivals<T> that keeps only the last N items (a Queue<T>; Add enqueues and dequeues while it holds more than N; Items returns a list). Add V-14, V-11, V-15, V-12, V-14 to a RecentArrivals<string>(3) and print Last 3 arrivals: V-15, V-12, V-14",
        "Write local function Dictionary<K, List<V>> GroupInto<K, V>(IEnumerable<V> items, Func<V, K> keyOf) where K : notnull and group the shipments by Category with it. Print Grouped by hand: Agri 3, Medical 3, Fuel 2, Machinery 3, Mail 2, Supply 1. Port.Show largest (new { Number, Name, Crate }), hold (new { CapacityKg, Accepted, Refused, TotalKg }), recent and grouped (category to count)",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 9: generic code, written once.
// 1. T Largest<T>(IReadOnlyList<T> items) where T : IComparable<T> { ... }    (start with T best = items[0]; loop; item.CompareTo(best) > 0)
//    int largestNumber = Largest(new[] { 41, 7, 93, 12 });    string lastName = Largest(<all crew names as a List<string>>);
//    Crate lastCrate = Largest(<shipments as a List<Crate>>);         (new Crate(shipment.Id, shipment.Cargo, shipment.MassKg))
//    print  Largest number: 93   Last crew name alphabetically: Wren Castellano   Last crate in sort order: H-3002
// 2. Hold<Crate> shipHold = new(5000);  offer each shipment (as a Crate) in manifest order; TryAdd decides.
//    List<string> accepted / refused (crate ids)   print  Hold of 5000 kg: 6 accepted, 8 refused, 4890 kg loaded
// 3. RecentArrivals<string> recent = new(3);  Add "V-14", "V-11", "V-15", "V-12", "V-14"   print  Last 3 arrivals: V-15, V-12, V-14
// 4. Dictionary<K, List<V>> GroupInto<K, V>(IEnumerable<V> items, Func<V, K> keyOf) where K : notnull { ... }
//    var groupedShipments = GroupInto(shipments, shipment => shipment.Category);
//    print  Grouped by hand: Agri 3, Medical 3, Fuel 2, Machinery 3, Mail 2, Supply 1
// Port.Show: largest (new { Number, Name, Crate }), hold (new { CapacityKg, Accepted, Refused, TotalKg }), recent, grouped (category -> count)

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare the two generic classes here.
//   class Hold<T> where T : ILoadable { ... }       (CapacityKg, TotalKg, Items, bool TryAdd(T item))
//   class RecentArrivals<T> { ... }                 (Add, Items)
`,
      solutionAdd: cs`// Lesson 9: generics.
T Largest<T>(IReadOnlyList<T> items) where T : IComparable<T>
{
    T best = items[0];
    foreach (T item in items)
    {
        if (item.CompareTo(best) > 0)
        {
            best = item;
        }
    }
    return best;
}

int largestNumber = Largest(new[] { 41, 7, 93, 12 });
string lastName = Largest(vessels.SelectMany(vessel => vessel.Crew).ToList());
Crate lastCrate = Largest(shipments.Select(shipment => new Crate(shipment.Id, shipment.Cargo, shipment.MassKg)).ToList());
Console.WriteLine($"Largest number: {largestNumber}");
Console.WriteLine($"Last crew name alphabetically: {lastName}");
Console.WriteLine($"Last crate in sort order: {lastCrate.Id}");

Hold<Crate> shipHold = new(5000);
List<string> accepted = new();
List<string> refused = new();
foreach (Shipment shipment in shipments)
{
    Crate offered = new(shipment.Id, shipment.Cargo, shipment.MassKg);
    if (shipHold.TryAdd(offered))
    {
        accepted.Add(offered.Id);
    }
    else
    {
        refused.Add(offered.Id);
    }
}
Console.WriteLine($"Hold of {shipHold.CapacityKg} kg: {accepted.Count} accepted, {refused.Count} refused, {shipHold.TotalKg} kg loaded");

RecentArrivals<string> recent = new(3);
foreach (string arrival in new[] { "V-14", "V-11", "V-15", "V-12", "V-14" })
{
    recent.Add(arrival);
}
Console.WriteLine($"Last 3 arrivals: {string.Join(", ", recent.Items)}");

Dictionary<K, List<V>> GroupInto<K, V>(IEnumerable<V> items, Func<V, K> keyOf) where K : notnull
{
    Dictionary<K, List<V>> result = new();
    foreach (V item in items)
    {
        K key = keyOf(item);
        if (!result.TryGetValue(key, out List<V>? bucket))
        {
            bucket = new List<V>();
            result[key] = bucket;
        }
        bucket.Add(item);
    }
    return result;
}

var groupedShipments = GroupInto(shipments, shipment => shipment.Category);
Console.WriteLine($"Grouped by hand: {string.Join(", ", groupedShipments.Select(pair => $"{pair.Key} {pair.Value.Count}"))}");

Port.Show("largest", new { Number = largestNumber, Name = lastName, Crate = lastCrate.Id });
Port.Show("hold", new { shipHold.CapacityKg, Accepted = accepted, Refused = refused, TotalKg = shipHold.TotalKg });
Port.Show("recent", recent.Items);
Port.Show("grouped", groupedShipments.ToDictionary(pair => pair.Key, pair => pair.Value.Count));

${TYPES_DIVIDER}

// A hold that only takes loadable things, and says no when an item would overfill it.
class Hold<T> where T : ILoadable
{
    readonly List<T> _items = new();

    public Hold(int capacityKg)
    {
        CapacityKg = capacityKg;
    }

    public int CapacityKg { get; }
    public int TotalKg => _items.Sum(item => item.MassKg);
    public IReadOnlyList<T> Items => _items;

    public bool TryAdd(T item)
    {
        if (TotalKg + item.MassKg > CapacityKg)
        {
            return false;
        }
        _items.Add(item);
        return true;
    }
}

// Remembers only the latest few items of any type.
class RecentArrivals<T>
{
    readonly Queue<T> _recent = new();
    readonly int _size;

    public RecentArrivals(int size)
    {
        _size = size;
    }

    public IReadOnlyList<T> Items => _recent.ToList();

    public void Add(T item)
    {
        _recent.Enqueue(item);
        while (_recent.Count > _size)
        {
            _recent.Dequeue();
        }
    }
}`,
      explanation:
        "Largest<T> compiles for any T that promises CompareTo, so the same code serves ints, strings and crates (the crate comes out as H-3002 because Crate sorts heaviest first, so the last in sort order is the lightest). Hold<T> uses its ILoadable constraint to read MassKg without a cast, and TryAdd follows the Try pattern: it answers false instead of throwing when an item would overfill the hold. Walking the shipments in manifest order, six fit (4890 kg) and eight do not. RecentArrivals<T> needs no constraint because it never looks inside its items. GroupInto<K, V> is GroupBy written by hand; the compiler infers V from the list and K from what the lambda returns.",
      hints: [
        { id: "h1", title: "A constrained method", content: "T Largest<T>(IReadOnlyList<T> items) where T : IComparable<T> { T best = items[0]; foreach (T item in items) { if (item.CompareTo(best) > 0) best = item; } return best; } Type inference works from the argument: Largest(new[] { 41, 7, 93, 12 })." },
        { id: "h2", title: "Hold<T>", content: "class Hold<T> where T : ILoadable keeps a private List<T>. TotalKg => _items.Sum(item => item.MassKg). In TryAdd return false when TotalKg + item.MassKg > CapacityKg, otherwise add and return true. Crate already implements ILoadable from lesson 8." },
        { id: "h3", title: "Two type parameters", content: "In GroupInto, create Dictionary<K, List<V>> result = new(); for each item compute K key = keyOf(item); if (!result.TryGetValue(key, out List<V>? bucket)) { bucket = new List<V>(); result[key] = bucket; } bucket.Add(item); For RecentArrivals use a Queue<T> and Dequeue while Count > size." },
      ],
      tests: [
        {
          id: "t1",
          description: "one constrained method serves ints, strings and crates",
          assertionCode: js`
assert(lines.includes("Largest number: 93"), 'Print "Largest number: 93".');
assert(lines.includes("Last crew name alphabetically: Wren Castellano"), 'Print "Last crew name alphabetically: Wren Castellano": Largest works on strings because string implements IComparable<string>.');
assert(lines.includes("Last crate in sort order: H-3002"), 'Print "Last crate in sort order: H-3002": Crate sorts heaviest first, so the last in order is the lightest (140 kg).');
assertEqual(scene.largest, { number: 93, name: "Wren Castellano", crate: "H-3002" }, "largest (Number, Name, Crate)");`,
        },
        {
          id: "t2",
          description: "a generic Hold refuses items that would overfill it",
          assertionCode: js`
assert(lines.includes("Hold of 5000 kg: 6 accepted, 8 refused, 4890 kg loaded"), 'Print "Hold of 5000 kg: 6 accepted, 8 refused, 4890 kg loaded": offer the shipments in manifest order and TryAdd only what still fits.');
assertEqual(scene.hold.capacityKg, 5000, "hold.capacityKg");
assertEqual(scene.hold.accepted, ["H-3001", "H-3002", "H-3004", "H-3005", "H-3007", "H-3014"], "hold.accepted");
assertEqual(scene.hold.refused, ["H-3003", "H-3006", "H-3008", "H-3009", "H-3010", "H-3011", "H-3012", "H-3013"], "hold.refused");
assertEqual(scene.hold.totalKg, 4890, "hold.totalKg");`,
        },
        {
          id: "t3",
          description: "RecentArrivals<T> keeps only the latest items",
          assertionCode: js`
assert(lines.includes("Last 3 arrivals: V-15, V-12, V-14"), 'Print "Last 3 arrivals: V-15, V-12, V-14": after five Adds, only the newest three remain, oldest first.');
assertEqual(scene.recent, ["V-15", "V-12", "V-14"], "recent");`,
        },
        {
          id: "t4",
          description: "a two-parameter generic method groups any sequence by any key",
          assertionCode: js`
assert(lines.includes("Grouped by hand: Agri 3, Medical 3, Fuel 2, Machinery 3, Mail 2, Supply 1"), 'Print "Grouped by hand: Agri 3, Medical 3, Fuel 2, Machinery 3, Mail 2, Supply 1": categories in order of first appearance.');
assertEqual(scene.grouped, { Agri: 3, Medical: 3, Fuel: 2, Machinery: 3, Mail: 2, Supply: 1 }, "grouped (category to count)");`,
        },
      ],
      unlocks: ["hp-generics"],
      checks: [
        {
          prompt: "You write `bool Bigger<T>(T a, T b) => a > b;` and the compiler reports CS0019. What is the right fix?",
          question: {
            type: "choice",
            options: [
              "Add a constraint such as `where T : IComparable<T>` and compare with `a.CompareTo(b) > 0`",
              "Cast both values to `object`",
              "Remove the `<T>` from the method",
              "Mark the method `static`",
            ],
            answer: 0,
          },
          explanation: "An unconstrained `T` could be any type, including ones with no `>` operator. A constraint tells the compiler what members `T` is guaranteed to have, so it can allow `CompareTo`.",
        },
        {
          prompt: "`class Hold<T> where T : ILoadable` and the line `Hold<string> bad = new();`. When is the mistake reported?",
          question: {
            type: "choice",
            options: ["At compile time (error CS0311)", "When `TryAdd` is first called", "Never: it just works", "Only if the string is empty"],
            answer: 0,
            },
          explanation: "Constraints are checked by the compiler for every use of the generic type, so an invalid type argument is a build error, not a run-time surprise.",
        },
        {
          prompt: "Which declaration says 'T must be a reference type that has a public parameterless constructor'?",
          question: {
            type: "choice",
            options: ["`where T : class, new()`", "`where T : struct`", "`where T : new, class`", "`where class T : new()`"],
            answer: 0,
          },
          explanation: "Constraints follow `where T :` and are separated by commas; `class` (or `struct`) comes first and `new()` comes last.",
        },
      ],
    },

    // ───────────────────────── 10 ─────────────────────────
    {
      id: "csharp-linq-10-extensions",
      title: "Extension methods",
      minutes: 20,
      xp: 150,
      concepts: ["extension methods", "static classes", "this parameter", "extending interfaces", "generic extensions", "method chaining"],
      learn: md`### Adding methods to types you do not own

\`shipments.Where(...)\` looks like \`List<Shipment>\` has a method called \`Where\`. It does not. \`Where\` lives in a static class called \`Enumerable\`, and C# lets you call it with dot syntax because of one small marker. That marker is an **extension method**, and you can write your own for any type: your records, a library class, even \`int\` or \`string\`.

~~~csharp
static class ShipmentExtensions
{
    public static bool IsPerishable(this Shipment shipment) =>
        shipment.Category is "Medical" or "Agri";
}

bool cold = someShipment.IsPerishable();
~~~

Three rules make a method an extension:

1. It lives in a **non-generic, non-nested \`static class\`** (the class name does not matter; the compiler error is \`CS1106: Extension method must be defined in a non-generic static class\`).
2. The method itself is \`static\`.
3. Its **first parameter** is marked with \`this\`. That parameter is the thing you write before the dot.

\`someShipment.IsPerishable()\` is compiled as \`ShipmentExtensions.IsPerishable(someShipment)\`. No magic: it is a normal static call with nicer syntax. That explains the limits: an extension cannot see private members, and it cannot change the type it extends.

### Extending a number, a string, a sequence

~~~csharp
public static string ToTonnes(this int kg) =>
    (kg / 1000.0).ToString("0.0", CultureInfo.InvariantCulture) + " t";

4200.ToTonnes();   // "4.2 t"
~~~

The most powerful form extends a **generic interface** so it works on every list, array and query result:

~~~csharp
public static IEnumerable<T> Page<T>(this IEnumerable<T> source, int page, int size) =>
    source.Skip((page - 1) * size).Take(size);

var second = shipments.Page(2, 5);   // items 6 to 10
~~~

That is exactly how LINQ is built. Your own operator chains with the built-in ones because it takes an \`IEnumerable<T>\` and returns one: \`shipments.Where(...).Page(1, 3).Select(...)\`. If you write it with \`yield return\` or return another LINQ call it is deferred like the rest.

### How the compiler finds them

- An **instance method always wins** over an extension with the same name and parameters. You cannot override an existing method this way.
- The static class must be **in scope**: in the same namespace, or imported with a \`using\`. If it is not, you get the same message as for a method that does not exist: \`CS1061: '...' does not contain a definition for '...'\` or, when other overloads are visible but do not fit, \`CS1929\` ("'int' does not contain a definition for 'Shout' and the best extension method overload 'Ext.Shout(string)' requires a receiver of type 'string'").
- The receiver can be \`null\` at the call: \`((string?)null).MyExt()\` does not throw by itself, because it is just a static call. Your method must check, as LINQ does with \`ArgumentNullException: Value cannot be null. (Parameter 'source')\`.

### Writing good ones

- Name them as a reader would say them: \`IsPerishable\`, \`ToTonnes\`, \`Page\`. Question-shaped names return \`bool\`.
- Keep each focused and side-effect free; extensions that mutate their receiver surprise people.
- Prefer extending a **narrow** type (\`Shipment\`, \`IEnumerable<Shipment>\`) over a broad one (\`object\`, \`string\`): an extension on \`string\` appears in IntelliSense for every string in the program.
- Do not use an extension to hide a heavy operation behind something that looks like a property.

### Common mistakes

- Forgetting \`this\`, so the method works only as \`ShipmentExtensions.IsPerishable(x)\`.
- Putting the method in a non-static or generic class.
- Writing an extension with the same name as an instance method and wondering why it never runs.
- Extending \`IEnumerable<T>\` and enumerating the source twice (lesson 5).`,
      mission: md`The same little questions keep appearing all over the port's code: *is this shipment perishable?*, *show this weight in tonnes*, *give me page two of the list*, *summarise this group in one line*. Every team wrote their own copy, and the copies disagree about what perishable means.

You will move each of them into one static class of extension methods, so every report says it the same way. When this lesson passes, the **Extension rack** shows the results of your helpers.`,
      tasks: [
        "Under the divider write static class ShipmentExtensions. Add int ToTonnes(this int kg) returning text like \"4.2 t\" (one decimal, CultureInfo.InvariantCulture). Above, take the heavy list from lesson 2, build tonnes from its MassKg values and print Heavy loads: 4.2 t, 3.1 t, 2.5 t, 1.8 t, 1.2 t",
        "Add bool IsPerishable(this Shipment shipment): true for Category Medical or Agri. Build perishableIds and print Perishable: H-3001, H-3002, H-3007, H-3008, H-3011, H-3013",
        "Add the generic IEnumerable<T> Page<T>(this IEnumerable<T> source, int page, int size) (page 1 is the first page; use Skip and Take). Build pageTwo = shipments.Page(2, 5) ids and print Page 2: H-3006, H-3007, H-3008, H-3009, H-3010",
        "Add string Summarise(this IEnumerable<Shipment> source) returning like \"14 shipments, 16.9 t\" (count, then the total mass through ToTonnes). Print All: 14 shipments, 16.9 t and, chaining it after a Where with IsPerishable, Perishable summary: 6 shipments, 3.0 t. Port.Show tonnes, perishableIds, pageTwo and summaryLine (the All summary)",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 10: shared helpers as extension methods.
// 1. List<string> tonnes = heavy.Select(shipment => shipment.MassKg.ToTonnes()).ToList();   print  Heavy loads: 4.2 t, 3.1 t, 2.5 t, 1.8 t, 1.2 t
// 2. List<string> perishableIds = shipments.Where(shipment => shipment.IsPerishable()).Select(...).ToList();
//    print  Perishable: H-3001, H-3002, H-3007, H-3008, H-3011, H-3013
// 3. List<string> pageTwo = shipments.Page(2, 5).Select(shipment => shipment.Id).ToList();   print  Page 2: H-3006, H-3007, H-3008, H-3009, H-3010
// 4. string summaryLine = shipments.Summarise();   print  All: 14 shipments, 16.9 t
//    print  Perishable summary: 6 shipments, 3.0 t     (shipments.Where(...IsPerishable...).Summarise())
// Port.Show: tonnes, perishableIds, pageTwo, summaryLine

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare the extension methods here.
//   static class ShipmentExtensions { ToTonnes(this int kg), IsPerishable(this Shipment shipment), Page<T>(this IEnumerable<T> ...), Summarise(this IEnumerable<Shipment> ...) }
`,
      solutionAdd: cs`// Lesson 10: extension methods.
List<string> tonnes = heavy.Select(shipment => shipment.MassKg.ToTonnes()).ToList();
Console.WriteLine($"Heavy loads: {string.Join(", ", tonnes)}");

List<string> perishableIds = shipments.Where(shipment => shipment.IsPerishable()).Select(shipment => shipment.Id).ToList();
Console.WriteLine($"Perishable: {string.Join(", ", perishableIds)}");

List<string> pageTwo = shipments.Page(2, 5).Select(shipment => shipment.Id).ToList();
Console.WriteLine($"Page 2: {string.Join(", ", pageTwo)}");

string summaryLine = shipments.Summarise();
Console.WriteLine($"All: {summaryLine}");
Console.WriteLine($"Perishable summary: {shipments.Where(shipment => shipment.IsPerishable()).Summarise()}");

Port.Show("tonnes", tonnes);
Port.Show("perishableIds", perishableIds);
Port.Show("pageTwo", pageTwo);
Port.Show("summaryLine", summaryLine);

${TYPES_DIVIDER}

// The port's shared vocabulary, one definition for every report.
static class ShipmentExtensions
{
    public static string ToTonnes(this int kg) =>
        (kg / 1000.0).ToString("0.0", CultureInfo.InvariantCulture) + " t";

    public static bool IsPerishable(this Shipment shipment) =>
        shipment.Category is "Medical" or "Agri";

    public static IEnumerable<T> Page<T>(this IEnumerable<T> source, int page, int size) =>
        source.Skip((page - 1) * size).Take(size);

    public static string Summarise(this IEnumerable<Shipment> source)
    {
        List<Shipment> items = source.ToList();
        return $"{items.Count} shipments, {items.Sum(shipment => shipment.MassKg).ToTonnes()}";
    }
}`,
      explanation:
        "All four helpers sit in one static class and read as if they were members of the types they extend. ToTonnes extends int and formats with the invariant culture so the decimal separator never depends on the machine. IsPerishable extends the Shipment record, so Where(shipment => shipment.IsPerishable()) reads like a sentence. Page<T> extends IEnumerable<T>, so it works on a list, an array or another query, and being built from Skip and Take it stays deferred. Summarise takes the source into a list once, so the sequence is only walked once even though it needs both a count and a sum, and it chains straight after a Where.",
      hints: [
        { id: "h1", title: "The shape of an extension", content: "static class ShipmentExtensions { public static string ToTonnes(this int kg) => (kg / 1000.0).ToString(\"0.0\", CultureInfo.InvariantCulture) + \" t\"; } The first parameter has this in front of it, and the class is declared under the divider." },
        { id: "h2", title: "Extend an interface for everything", content: "public static IEnumerable<T> Page<T>(this IEnumerable<T> source, int page, int size) => source.Skip((page - 1) * size).Take(size); Page 2 of size 5 skips 5 and takes 5." },
        { id: "h3", title: "Walk the source once", content: "In Summarise, start with List<Shipment> items = source.ToList(); so you can use both items.Count and items.Sum(shipment => shipment.MassKg).ToTonnes() without enumerating the sequence twice." },
      ],
      tests: [
        {
          id: "t1",
          description: "ToTonnes formats a mass as one-decimal tonnes",
          assertionCode: js`
assert(lines.includes("Heavy loads: 4.2 t, 3.1 t, 2.5 t, 1.8 t, 1.2 t"), 'Print "Heavy loads: 4.2 t, 3.1 t, 2.5 t, 1.8 t, 1.2 t": ToTonnes turns 4200 into "4.2 t".');
assertEqual(scene.tonnes, ["4.2 t", "3.1 t", "2.5 t", "1.8 t", "1.2 t"], "tonnes");`,
        },
        {
          id: "t2",
          description: "IsPerishable extends Shipment",
          assertionCode: js`
assert(lines.includes("Perishable: H-3001, H-3002, H-3007, H-3008, H-3011, H-3013"), 'Print "Perishable: H-3001, H-3002, H-3007, H-3008, H-3011, H-3013": Medical and Agri shipments.');
assertEqual(scene.perishableIds, ["H-3001", "H-3002", "H-3007", "H-3008", "H-3011", "H-3013"], "perishableIds");`,
        },
        {
          id: "t3",
          description: "a generic Page<T> extension slices any sequence",
          assertionCode: js`
assert(lines.includes("Page 2: H-3006, H-3007, H-3008, H-3009, H-3010"), 'Print "Page 2: H-3006, H-3007, H-3008, H-3009, H-3010": page 2 of size 5 skips the first 5.');
assertEqual(scene.pageTwo, ["H-3006", "H-3007", "H-3008", "H-3009", "H-3010"], "pageTwo");`,
        },
        {
          id: "t4",
          description: "Summarise chains after a Where",
          assertionCode: js`
assert(lines.includes("All: 14 shipments, 16.9 t"), 'Print "All: 14 shipments, 16.9 t".');
assert(lines.includes("Perishable summary: 6 shipments, 3.0 t"), 'Print "Perishable summary: 6 shipments, 3.0 t": the six perishable shipments weigh 3030 kg.');
assertEqual(scene.summaryLine, "14 shipments, 16.9 t", "summaryLine");`,
        },
      ],
      unlocks: ["hp-ext"],
      checks: [
        {
          prompt: "What must be true for this to be a valid extension method?\n\n~~~csharp\npublic static string Shout(this string text) => text.ToUpper();\n~~~",
          question: {
            type: "choice",
            options: [
              "It sits inside a non-generic static class",
              "It sits inside any class, as long as it is public",
              "It must be in the same file as `string`",
              "It must be named `Extension`",
            ],
            answer: 0,
          },
          explanation: "The method is static, its first parameter has `this`, and the containing class must be a non-generic, non-nested `static class`. The class name is up to you.",
        },
        {
          prompt: "`Shipment` has an instance method `Describe()`. You also write an extension `Describe(this Shipment s)`. What does `shipment.Describe()` call?",
          question: {
            type: "choice",
            options: ["The instance method: instance members always win over extensions", "The extension method", "Neither: it is ambiguous and does not compile", "Both, one after the other"],
            answer: 0,
          },
          explanation: "The compiler looks for real members first and only considers extension methods when none fits. An extension can add behaviour but never replace what a type already has.",
        },
      ],
    },

    // ───────────────────────── 11 ─────────────────────────
    {
      id: "csharp-linq-11-nullable",
      title: "Nullable reference types, end to end",
      minutes: 25,
      xp: 170,
      concepts: ["nullable reference types", "string?", "?.", "??", "??=", "null-forgiving !", "TryGet pattern", "NotNullWhen", "ThrowIfNull"],
      learn: md`### Make "might be missing" part of the type

Tony Hoare called null references his "billion-dollar mistake": any reference could secretly be null and crash the program at the worst moment. C# now lets you turn the secret into a visible part of every type. With the \`#nullable enable\` line at the top of your file (it has been there since lesson 1):

- \`Vessel\` means **"never null"**.
- \`Vessel?\` means **"might be null; check first"**.

The compiler then tracks, line by line, which variables could be null, and warns (the CS86xx warnings) when a possible null reaches a place that dereferences it. One honest note about this course: the build board shows **errors**, not warnings, so you will not see those warnings here. In Visual Studio, Rider or VS Code they appear as squiggles as you type. The habits in this lesson are what make them disappear, and the checks below test the behaviour directly.

### The tools, one by one

~~~csharp
Vessel? vessel = FindVessel("V-99");        // may be null

if (vessel is null) { ... }                  // test: is null / is not null
string name = vessel?.Name ?? "unknown";     // ?.  stops at null; ?? supplies a default
vessel ??= new Vessel(...);                  // ??= assigns only when currently null
string first = vessel?.Crew?[0] ?? "none";   // ?[ ] is the null-safe indexer
~~~

- **\`?.\`** (null-conditional): if the left side is null the whole chain is null instead of crashing. Its result is nullable, so it is usually paired with **\`??\`**.
- **\`!\`** (null-forgiving): tells the compiler "I know this is not null". It checks **nothing**. If you are wrong the program still throws \`NullReferenceException: Object reference not set to an instance of an object.\` Use it only when you can prove non-null in a way the compiler cannot see, and prefer fixing the design.
- **\`ArgumentNullException.ThrowIfNull(arg)\`** is the one-line guard for public inputs: it throws \`ArgumentNullException: Value cannot be null. (Parameter 'label')\`, and afterwards the compiler knows \`arg\` is not null.

### Designing the "might not exist" answer

A lookup can find nothing. There are three honest ways to say so:

1. **Return \`T?\`**: \`Vessel? FindVessel(string id)\`. Callers must deal with null.
2. **The Try pattern**: return \`bool\` and hand the value out through \`out\`: \`bool TryFindVessel(string id, out Vessel? vessel)\`. The standard library does this everywhere (\`int.TryParse\`, \`dict.TryGetValue\`).
3. **Throw** when absence is a bug (\`First\`, \`Single\`, the dictionary indexer).

To make the compiler understand the Try pattern, annotate the out parameter:

~~~csharp
bool TryFindVessel(string id, [NotNullWhen(true)] out Vessel? vessel)
{
    vessel = FindVessel(id);
    return vessel is not null;
}

if (TryFindVessel("V-14", out var found))
{
    Console.WriteLine(found.Name);     // no warning: the attribute says found is not null here
}
~~~

\`[NotNullWhen(true)]\` is a promise: "when I return true, this out value is not null". It lives in \`System.Diagnostics.CodeAnalysis\`.

### A dictionary of "maybe" values

\`Dictionary<string, string?>\` can hold a key whose value is null, which is different from a key that is missing. \`GetValueOrDefault(key)\` returns null in **both** cases, which is fine for display (\`?? "(no note)"\`) but not if you need to tell them apart: use \`ContainsKey\` or \`TryGetValue\` for that.

### Value types: \`int?\` is a different feature

\`int?\` (\`Nullable<int>\`) is a real struct with \`HasValue\` and \`Value\`; nullable *reference* types are only annotations the compiler checks. At run time \`string?\` and \`string\` are the same type.

### Common mistakes

- Sprinkling \`!\` to silence warnings.
- Forgetting that \`?.\` makes the result nullable, then assigning it to a non-nullable variable.
- Treating an empty string and null as the same. \`string.IsNullOrWhiteSpace\` is the check for text input.
- Returning \`null\` for "error" when an exception or a Try method says it better.
- Leaving a non-nullable property uninitialised: use a constructor, a default, or the \`required\` keyword.`,
      mission: md`Customs officers query the port by vessel id all day, often with typos or ids that have not arrived yet, and they attach free-text notes to shipments that are sometimes blank. The old tool threw a \`NullReferenceException\` every time someone typed \`V-99\`, and the officer on duty had to restart it.

You will make the "not found" answers explicit in your types: nullable returns, a Try method the compiler understands, safe chains for captains and notes, and a deliberate crash to see what \`!\` really does. When this lesson passes, the **Vessel lookup** panel shows how each query ended.`,
      tasks: [
        "Write local function Vessel? FindVessel(string id) using FirstOrDefault, and bool TryFindVessel(string id, [System.Diagnostics.CodeAnalysis.NotNullWhen(true)] out Vessel? vessel) built on it. Write string CaptainOf(Vessel? vessel) returning the first crew member, or \"unassigned\" when there is no vessel or no crew (use ?. and ??)",
        "For the ids V-14, V-99, V-15 call TryFindVessel and build vesselLookups (new { Id, Found, Name, Captain } with Name null when missing). Print V-14 -> Quiet Kestrel, captain Priya Natarajan, then V-99 -> unknown vessel, captain unassigned, then V-15 -> Saltmarsh, captain Wren Castellano",
        "Make Dictionary<string, string?> customsNotes with H-3003 mapped to \"Pressure seal inspected\" and H-3004 mapped to null. Write string NoteFor(string shipmentId) using GetValueOrDefault and ??, with \"(no note)\" as the default. Print H-3003: Pressure seal inspected, H-3004: (no note) and H-3009: (no note), then Shipments without a note: 13 (count the shipments whose note is null)",
        "Write string OperatorOf(Vessel? vessel) => vessel!.Operator;. Call it with FindVessel(\"V-99\") inside try/catch (NullReferenceException), keeping ex.Message in bangCrash, and print Using ! on a missing vessel: Object reference not set to an instance of an object. Write string ShoutLabel(string? label) that calls ArgumentNullException.ThrowIfNull(label) first; catch the ArgumentNullException from ShoutLabel(null) and print Guard: Value cannot be null. (Parameter 'label'). Port.Show vesselLookups and bangCrash",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 11: make 'might be missing' visible.
// 1. Vessel? FindVessel(string id) => vessels.FirstOrDefault(...);
//    bool TryFindVessel(string id, [System.Diagnostics.CodeAnalysis.NotNullWhen(true)] out Vessel? vessel) { vessel = FindVessel(id); return vessel is not null; }
//    string CaptainOf(Vessel? vessel) => vessel?.Crew.FirstOrDefault() ?? "unassigned";
// 2. for "V-14", "V-99", "V-15": bool found = TryFindVessel(id, out Vessel? match);  build vesselLookups with new { Id, Found, Name = match?.Name, Captain = CaptainOf(match) }
//    print  V-14 -> Quiet Kestrel, captain Priya Natarajan   V-99 -> unknown vessel, captain unassigned   V-15 -> Saltmarsh, captain Wren Castellano
// 3. Dictionary<string, string?> customsNotes = new() { ["H-3003"] = "Pressure seal inspected", ["H-3004"] = null };
//    string NoteFor(string shipmentId) => customsNotes.GetValueOrDefault(shipmentId) ?? "(no note)";
//    print  H-3003: Pressure seal inspected   H-3004: (no note)   H-3009: (no note)     then   Shipments without a note: 13
// 4. string OperatorOf(Vessel? vessel) => vessel!.Operator;   catch NullReferenceException -> bangCrash = ex.Message
//    print  Using ! on a missing vessel: Object reference not set to an instance of an object.
//    string ShoutLabel(string? label) { ArgumentNullException.ThrowIfNull(label); return label.ToUpperInvariant(); }
//    print  Guard: Value cannot be null. (Parameter 'label')
// Port.Show: vesselLookups, bangCrash
`,
      solutionAdd: cs`// Lesson 11: nullable references end to end.
Vessel? FindVessel(string id) => vessels.FirstOrDefault(vessel => vessel.Id == id);

bool TryFindVessel(string id, [System.Diagnostics.CodeAnalysis.NotNullWhen(true)] out Vessel? vessel)
{
    vessel = FindVessel(id);
    return vessel is not null;
}

string CaptainOf(Vessel? vessel) => vessel?.Crew.FirstOrDefault() ?? "unassigned";

var vesselLookups = new List<object>();
foreach (string lookupId in new[] { "V-14", "V-99", "V-15" })
{
    bool found = TryFindVessel(lookupId, out Vessel? match);
    string captain = CaptainOf(match);
    vesselLookups.Add(new { Id = lookupId, Found = found, Name = match?.Name, Captain = captain });
    Console.WriteLine($"{lookupId} -> {match?.Name ?? "unknown vessel"}, captain {captain}");
}

Dictionary<string, string?> customsNotes = new()
{
    ["H-3003"] = "Pressure seal inspected",
    ["H-3004"] = null,
};
string NoteFor(string shipmentId) => customsNotes.GetValueOrDefault(shipmentId) ?? "(no note)";
foreach (string noteId in new[] { "H-3003", "H-3004", "H-3009" })
{
    Console.WriteLine($"{noteId}: {NoteFor(noteId)}");
}
int withoutNote = shipments.Count(shipment => customsNotes.GetValueOrDefault(shipment.Id) is null);
Console.WriteLine($"Shipments without a note: {withoutNote}");

string OperatorOf(Vessel? vessel) => vessel!.Operator;
string bangCrash;
try
{
    bangCrash = OperatorOf(FindVessel("V-99"));
}
catch (NullReferenceException ex)
{
    bangCrash = ex.Message;
}
Console.WriteLine($"Using ! on a missing vessel: {bangCrash}");

string ShoutLabel(string? label)
{
    ArgumentNullException.ThrowIfNull(label);
    return label.ToUpperInvariant();
}
try
{
    ShoutLabel(null);
}
catch (ArgumentNullException ex)
{
    Console.WriteLine($"Guard: {ex.Message}");
}

Port.Show("vesselLookups", vesselLookups);
Port.Show("bangCrash", bangCrash);`,
      explanation:
        "FindVessel returns Vessel? because FirstOrDefault can find nothing, and TryFindVessel wraps it in the Try pattern; the NotNullWhen(true) attribute tells the compiler the out value is safe to use after a true result. CaptainOf chains ?. and ?? so a missing vessel and a vessel with no crew both end at \"unassigned\". GetValueOrDefault returns null for the key whose value is null and for a key that is not there at all, so both print \"(no note)\" and 13 of the 14 shipments count as note-less. The bang operator only silences the compiler: OperatorOf(null) still throws NullReferenceException at run time, whereas ThrowIfNull fails fast with a message naming the parameter.",
      hints: [
        { id: "h1", title: "Nullable return and the Try pattern", content: "Vessel? FindVessel(string id) => vessels.FirstOrDefault(vessel => vessel.Id == id); In TryFindVessel set vessel = FindVessel(id); and return vessel is not null; CaptainOf can be vessel?.Crew.FirstOrDefault() ?? \"unassigned\"." },
        { id: "h2", title: "Build the lookups", content: "foreach (string lookupId in new[] { \"V-14\", \"V-99\", \"V-15\" }) { bool found = TryFindVessel(lookupId, out Vessel? match); ... } Name = match?.Name stays null when nothing was found, and match?.Name ?? \"unknown vessel\" is for the printed text." },
        { id: "h3", title: "Notes, bang and guard", content: "customsNotes.GetValueOrDefault(shipmentId) ?? \"(no note)\" covers both a null value and a missing key. try { bangCrash = OperatorOf(FindVessel(\"V-99\")); } catch (NullReferenceException ex) { bangCrash = ex.Message; } For the guard, ArgumentNullException.ThrowIfNull(label); then catch ArgumentNullException and print ex.Message." },
      ],
      tests: [
        {
          id: "t1",
          description: "FindVessel, TryFindVessel and CaptainOf handle found and missing vessels",
          assertionCode: js`
assert(lines.includes("V-14 -> Quiet Kestrel, captain Priya Natarajan"), 'Print "V-14 -> Quiet Kestrel, captain Priya Natarajan".');
assert(lines.includes("V-99 -> unknown vessel, captain unassigned"), 'Print "V-99 -> unknown vessel, captain unassigned": match?.Name ?? "unknown vessel" and CaptainOf(null).');
assert(lines.includes("V-15 -> Saltmarsh, captain Wren Castellano"), 'Print "V-15 -> Saltmarsh, captain Wren Castellano".');
assertEqual(scene.vesselLookups, [
  { id: "V-14", found: true, name: "Quiet Kestrel", captain: "Priya Natarajan" },
  { id: "V-99", found: false, name: null, captain: "unassigned" },
  { id: "V-15", found: true, name: "Saltmarsh", captain: "Wren Castellano" },
], "vesselLookups (Id, Found, Name that stays null when missing, Captain)");`,
        },
        {
          id: "t2",
          description: "a dictionary of maybe-values is read safely",
          assertionCode: js`
assert(lines.includes("H-3003: Pressure seal inspected"), 'Print "H-3003: Pressure seal inspected".');
assert(lines.includes("H-3004: (no note)"), 'Print "H-3004: (no note)": the key exists but its value is null.');
assert(lines.includes("H-3009: (no note)"), 'Print "H-3009: (no note)": the key is not in the dictionary at all.');
assert(lines.includes("Shipments without a note: 13"), 'Print "Shipments without a note: 13": count the shipments whose GetValueOrDefault note is null.');`,
        },
        {
          id: "t3",
          description: "the null-forgiving operator does not prevent the crash, ThrowIfNull fails fast",
          assertionCode: js`
assert(lines.includes("Using ! on a missing vessel: Object reference not set to an instance of an object."), 'Print "Using ! on a missing vessel: Object reference not set to an instance of an object." (catch the NullReferenceException and keep ex.Message).');
assertEqual(scene.bangCrash, "Object reference not set to an instance of an object.", "bangCrash");
assert(lines.includes("Guard: Value cannot be null. (Parameter 'label')"), 'Print "Guard: Value cannot be null. (Parameter \'label\')": ArgumentNullException.ThrowIfNull(label) names the parameter.');`,
        },
      ],
      unlocks: ["hp-lookup"],
      checks: [
        {
          prompt: "What does the `!` in `vessel!.Operator` do at run time when `vessel` is null?",
          question: {
            type: "choice",
            options: [
              "Nothing: it only silences the compiler's warning, so you still get a `NullReferenceException`",
              "It returns an empty string",
              "It makes the call safe",
              "It throws an `ArgumentNullException`",
            ],
            answer: 0,
          },
          explanation: "The null-forgiving operator is a note to the compiler, not a check. It disappears when the program is compiled, so a null still crashes the dereference.",
        },
        {
          prompt: "`string? note = null; int n = note?.Length ?? -1;` What is `n`?",
          question: { type: "number", answer: -1 },
          explanation: "`note?.Length` stops at the null and produces null (an `int?`), and `??` replaces that null with `-1`.",
        },
        {
          prompt: "Why annotate the `out` parameter of `TryFindVessel` with `[NotNullWhen(true)]`?",
          question: {
            type: "choice",
            options: [
              "So the compiler knows the value is not null whenever the method returned `true`",
              "So the method runs faster",
              "So the method can return `null` safely",
              "So callers do not need to call it",
            ],
            answer: 0,
          },
          explanation: "A `bool` return and a nullable `out` value are linked only in your head. The attribute tells the compiler about the link, so `if (TryFindVessel(id, out var v)) { v.Name }` needs no extra null check.",
        },
      ],
    },

    // ───────────────────────── 12 ─────────────────────────
    {
      id: "csharp-linq-12-parsing",
      title: "Parsing text and regular expressions",
      minutes: 35,
      xp: 190,
      concepts: ["Split", "Trim", "TryParse", "CultureInfo.InvariantCulture", "NumberStyles", "Regex", "named groups", "Regex.Matches", "StringComparison"],
      learn: md`### Text arrives messy

Telegrams, files and forms all hand your program **strings**: padded with spaces, in the wrong case, with a digit mistyped as a letter. Turning a string into a trustworthy value is a job in three steps: *split it into fields*, *convert each field*, *validate the result*. Do all three on purpose.

### Cutting strings up

~~~csharp
string line = "H-4001 | Fusion pellets | 1250 kg | P1";
string[] fields = line.Split('|', StringSplitOptions.TrimEntries);
// ["H-4001", "Fusion pellets", "1250 kg", "P1"]
~~~

- \`Split(char)\` cuts at a separator. \`StringSplitOptions.TrimEntries\` trims each piece, and \`RemoveEmptyEntries\` drops empty ones. Always check \`fields.Length\` before indexing: a short line would crash with \`IndexOutOfRangeException\`.
- \`Trim()\`, \`TrimStart\`, \`TrimEnd\` remove whitespace (or the characters you list).
- \`text[..^2]\` is the range syntax: everything except the last two characters. \`text[1..]\` skips the first. \`Substring(start, length)\` does the same; it throws \`ArgumentOutOfRangeException: startIndex cannot be larger than length of string. (Parameter 'startIndex')\` when you ask for too much.
- \`EndsWith\`, \`StartsWith\`, \`Contains\`, \`IndexOf\` find things. Pass a \`StringComparison\` such as \`StringComparison.OrdinalIgnoreCase\` when case should not matter. Without it, some overloads use the **current culture**, which can vary between machines.
- Strings are **immutable**: \`text.Trim()\` returns a new string and leaves \`text\` alone, so use the result. To build a big string in a loop, use \`StringBuilder\`, not repeated \`+\`.

### The TryParse family

\`int.Parse("12O")\` (a capital O, not zero) throws \`FormatException: The input string '12O' was not in a correct format.\` When bad input is *normal* (it is: people type things), use **\`TryParse\`**, which returns \`bool\` and never throws:

~~~csharp
if (int.TryParse(field, out int priority)) { ... } else { /* report it */ }
if (double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out double value)) { ... }
~~~

Every number type has one, and so do \`bool\`, \`DateOnly\`, \`TimeSpan\`, \`Guid\` and \`Enum.TryParse<T>\`.

### Culture: the trap that works on your machine

In some cultures 1.5 is written \`1,5\` and a thousand is \`1.000\`. A parse or format without a culture uses the *current* one, so the same code behaves differently on a different computer. For data that moves between systems (files, JSON, protocols) always pass **\`CultureInfo.InvariantCulture\`**. The same applies to \`ToUpper()\` versus \`ToUpperInvariant()\` and \`ToString("0.0", CultureInfo.InvariantCulture)\`. Which \`NumberStyles\` you allow matters too: \`NumberStyles.Float\` accepts a decimal point and exponent but not thousands separators.

### Regular expressions

A **regular expression** (regex) describes a pattern of text. \`System.Text.RegularExpressions.Regex\` matches it. Use a verbatim string (\`@"..."\`) so backslashes stay backslashes.

~~~csharp
Regex rule = new(@"^(?<id>[Hh]-\d{4})\s*\|\s*(?<mass>\d+(?:\.\d+)?)\s*(?<unit>kg|t)$");
Match match = rule.Match("H-4001 | 1250 kg");
if (match.Success)
{
    string id = match.Groups["id"].Value;       // "H-4001"
    string mass = match.Groups["mass"].Value;   // "1250"
}
~~~

The essentials: \`^\` and \`$\` anchor to the start and end, \`\d\` is a digit, \`\s\` whitespace, \`\w\` a letter/digit/underscore, \`\b\` a word boundary, \`{4}\` exactly four, \`+\` one or more, \`*\` zero or more, \`?\` optional, \`|\` alternatives, \`[...]\` a character set, and \`(...)\` a group. **Named groups** \`(?<name>...)\` let you read parts by name instead of by number, and \`(?:...)\` groups without capturing.

- \`Regex.IsMatch(text, pattern)\` is the yes/no test; \`Match\` gives the first match with its groups; \`Regex.Matches(text, pattern)\` finds all the matches; \`Regex.Replace(text, pattern, replacement)\` rewrites text.
- Quantifiers are **greedy** (take as much as they can). \`+?\` and \`*?\` are lazy (as little as possible).
- Regexes are great for *finding* and *shape-checking* simple text. They are a poor tool for nested formats (HTML, JSON): use a real parser (lesson 14).
- Build a static \`Regex\` object once instead of a new one inside a loop. A complicated pattern on hostile input can take exponential time ("catastrophic backtracking"); for untrusted text pass a match timeout.

### Common mistakes

- Parsing without a culture and shipping a bug to a machine in another country.
- Using \`Parse\` on input a user typed.
- Forgetting \`^\` and \`$\`, so \`IsMatch\` accepts a valid piece inside garbage.
- Forgetting the \`@\` and writing \`"\d"\` (a compile error: CS1009, unrecognized escape sequence).
- Comparing strings with \`==\` when the case should not matter.`,
      mission: md`Arrival telegrams reach the port as single lines of text typed by hand on dozens of different ships: padded with spaces, in either letter case, with the weight in kilograms or in tonnes, now and then a letter where a digit belongs. Operations wants every well-formed telegram turned into a record, and every broken one set aside with the reason in plain words.

You will split and trim the lines, convert them with \`TryParse\`, write the rejects down with a reason, and then read the same lines again with a regular expression that uses named groups. When this lesson passes, the **Telegram parser** panel shows what was parsed and what was refused.`,
      tasks: [
        "Under the divider declare record Telegram(string Id, string Cargo, int MassKg, int Priority) and record TelegramReject(string Line, string Reason). Above, copy the six telegram lines from the starter into string[] telegramLines",
        "Write local function bool TryParseMass(string text, out int massKg): accept a number followed by kg or t (case-insensitive, t is tonnes so 1.2 t is 1200 kg), parse the number with double.TryParse using NumberStyles.Float and CultureInfo.InvariantCulture, reject numbers of 0 or less. Parse each line: Split('|', StringSplitOptions.TrimEntries), require 4 fields (reason: expected 4 fields, found 3), parse the mass (reason: mass \"12O kg\" is not a number), read the priority from a field like P1 (1 to 3), upper-case the id. Print H-4001 -> 1250 kg, priority 1 for each good line and H-4003 rejected: mass \"12O kg\" is not a number for each bad one, then Parsed 4, rejected 2",
        "Build one Regex with named groups id, cargo, mass, unit and priority that accepts a whole valid telegram line (id H or h, a dash, four digits; mass with an optional decimal part; unit kg or t; priority P then 1 to 3; whitespace around the bars). Match it against the first line and print Regex read H-4001: 1250 kg. Count how many of the six lines it accepts and print Regex accepts 4 of 6 lines",
        "Use Regex.Matches on the note \"Ops note: move H-4001 and H-4005 together; ignore X-9999 and H-12.\" with a pattern for whole-word H-0000 ids and print Mentioned: H-4001, H-4005. Port.Show telegrams (the parsed records), telegramRejects, regexParts (new { Id, Mass, Unit } from the first line's match) and mentionedIds",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 12: turn messy telegram lines into clean records.
string[] telegramLines =
{
    "H-4001 | Fusion pellets | 1250 kg | P1",
    "H-4002 | Ice cores |  980 kg | P3 ",
    "H-4003 | Dental drills | 12O kg | P2",
    "h-4004 | Mail sacks | 75 kg | P3",
    "H-4005 | Solar film | 1.2 t | P2",
    "H-4006 | Ration crates | 640 kg",
};
// 1. bool TryParseMass(string text, out int massKg): "1250 kg" -> 1250, "1.2 t" -> 1200, "12O kg" -> false.  Use double.TryParse(number, NumberStyles.Float, CultureInfo.InvariantCulture, out double value).
// 2. foreach line: string[] fields = line.Split('|', StringSplitOptions.TrimEntries);  need 4 fields;  fields[0].ToUpperInvariant();  priority "P1" -> fields[3][1..] with int.TryParse (1 to 3)
//    List<Telegram> telegrams and List<TelegramReject> telegramRejects.
//    print  H-4001 -> 1250 kg, priority 1   or   H-4003 rejected: mass "12O kg" is not a number   (and  H-4006 rejected: expected 4 fields, found 3)
//    then  Parsed 4, rejected 2
// 3. Regex lineRule = new(@"^(?<id>[Hh]-\d{4})\s*\|\s*(?<cargo>...)\s*\|\s*(?<mass>...)\s*(?<unit>kg|t)\s*\|\s*P(?<priority>[1-3])\s*$");
//    Match first = lineRule.Match(telegramLines[0]);   print  Regex read H-4001: 1250 kg      and   Regex accepts 4 of 6 lines
// 4. string note = "Ops note: move H-4001 and H-4005 together; ignore X-9999 and H-12.";   Regex.Matches(note, @"\bH-\d{4}\b")   print  Mentioned: H-4001, H-4005
// Port.Show: telegrams, telegramRejects, regexParts (new { Id, Mass, Unit }), mentionedIds

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare the two records here.
//   record Telegram(string Id, string Cargo, int MassKg, int Priority);
//   record TelegramReject(string Line, string Reason);
`,
      solutionAdd: cs`// Lesson 12: parsing messy text.
string[] telegramLines =
{
    "H-4001 | Fusion pellets | 1250 kg | P1",
    "H-4002 | Ice cores |  980 kg | P3 ",
    "H-4003 | Dental drills | 12O kg | P2",
    "h-4004 | Mail sacks | 75 kg | P3",
    "H-4005 | Solar film | 1.2 t | P2",
    "H-4006 | Ration crates | 640 kg",
};

bool TryParseMass(string text, out int massKg)
{
    massKg = 0;
    double scale;
    string number;
    if (text.EndsWith("kg", StringComparison.OrdinalIgnoreCase))
    {
        scale = 1;
        number = text[..^2].Trim();
    }
    else if (text.EndsWith("t", StringComparison.OrdinalIgnoreCase))
    {
        scale = 1000;
        number = text[..^1].Trim();
    }
    else
    {
        return false;
    }
    if (!double.TryParse(number, NumberStyles.Float, CultureInfo.InvariantCulture, out double value) || value <= 0)
    {
        return false;
    }
    massKg = (int)Math.Round(value * scale);
    return true;
}

List<Telegram> telegrams = new();
List<TelegramReject> telegramRejects = new();
foreach (string rawLine in telegramLines)
{
    string[] fields = rawLine.Split('|', StringSplitOptions.TrimEntries);
    if (fields.Length != 4)
    {
        string reason = $"expected 4 fields, found {fields.Length}";
        telegramRejects.Add(new TelegramReject(rawLine, reason));
        Console.WriteLine($"{fields[0].ToUpperInvariant()} rejected: {reason}");
        continue;
    }

    string id = fields[0].ToUpperInvariant();
    if (!TryParseMass(fields[2], out int massKg))
    {
        string reason = $"mass \"{fields[2]}\" is not a number";
        telegramRejects.Add(new TelegramReject(rawLine, reason));
        Console.WriteLine($"{id} rejected: {reason}");
        continue;
    }
    if (!int.TryParse(fields[3][1..], out int priority) || priority is < 1 or > 3)
    {
        string reason = $"priority \"{fields[3]}\" is not P1, P2 or P3";
        telegramRejects.Add(new TelegramReject(rawLine, reason));
        Console.WriteLine($"{id} rejected: {reason}");
        continue;
    }

    telegrams.Add(new Telegram(id, fields[1], massKg, priority));
    Console.WriteLine($"{id} -> {massKg} kg, priority {priority}");
}
Console.WriteLine($"Parsed {telegrams.Count}, rejected {telegramRejects.Count}");

Regex lineRule = new(@"^(?<id>[Hh]-\d{4})\s*\|\s*(?<cargo>[^|]+?)\s*\|\s*(?<mass>\d+(?:\.\d+)?)\s*(?<unit>kg|t)\s*\|\s*P(?<priority>[1-3])\s*$");
Match firstMatch = lineRule.Match(telegramLines[0]);
Console.WriteLine($"Regex read {firstMatch.Groups["id"].Value}: {firstMatch.Groups["mass"].Value} {firstMatch.Groups["unit"].Value}");
int regexAccepted = telegramLines.Count(telegramLine => lineRule.IsMatch(telegramLine));
Console.WriteLine($"Regex accepts {regexAccepted} of {telegramLines.Length} lines");

string opsNote = "Ops note: move H-4001 and H-4005 together; ignore X-9999 and H-12.";
List<string> mentionedIds = Regex.Matches(opsNote, @"\bH-\d{4}\b").Select(mention => mention.Value).ToList();
Console.WriteLine($"Mentioned: {string.Join(", ", mentionedIds)}");

Port.Show("telegrams", telegrams);
Port.Show("telegramRejects", telegramRejects);
Port.Show("regexParts", new { Id = firstMatch.Groups["id"].Value, Mass = firstMatch.Groups["mass"].Value, Unit = firstMatch.Groups["unit"].Value });
Port.Show("mentionedIds", mentionedIds);

${TYPES_DIVIDER}

// A telegram once it has been read and checked.
record Telegram(string Id, string Cargo, int MassKg, int Priority);

// A telegram that could not be used, with the reason in plain words.
record TelegramReject(string Line, string Reason);`,
      explanation:
        "Split with TrimEntries turns each padded line into clean fields, and checking fields.Length first protects the later indexing. TryParseMass strips the unit, parses the number with the invariant culture (so '1.2' means one point two on any machine), and converts tonnes to kilograms; the 'O' in 12O makes double.TryParse fail, so that telegram becomes a reject with a readable reason instead of a FormatException. The regex says the same shape in one pattern: its named groups make match.Groups[\"mass\"] self-explanatory, and anchoring with ^ and $ makes it accept 4 of the 6 lines (the same four that parsed). Matches finds every whole-word H-0000 id in free text and skips X-9999 and H-12.",
      hints: [
        { id: "h1", title: "Split, trim, count", content: "string[] fields = rawLine.Split('|', StringSplitOptions.TrimEntries); if (fields.Length != 4) { ...reject with $\"expected 4 fields, found {fields.Length}\"...; continue; } The id is fields[0].ToUpperInvariant()." },
        { id: "h2", title: "TryParseMass", content: "Check text.EndsWith(\"kg\", StringComparison.OrdinalIgnoreCase) first, then \"t\". number = text[..^2].Trim() drops the unit. double.TryParse(number, NumberStyles.Float, CultureInfo.InvariantCulture, out double value) fails for 12O. Multiply by 1000 for tonnes and Math.Round to an int." },
        { id: "h3", title: "Named groups", content: "@\"^(?<id>[Hh]-\\d{4})\\s*\\|\\s*(?<cargo>[^|]+?)\\s*\\|\\s*(?<mass>\\d+(?:\\.\\d+)?)\\s*(?<unit>kg|t)\\s*\\|\\s*P(?<priority>[1-3])\\s*$\" then match.Groups[\"id\"].Value. For the note: Regex.Matches(note, @\"\\bH-\\d{4}\\b\").Select(mention => mention.Value)." },
      ],
      tests: [
        {
          id: "t1",
          description: "good telegrams become records, with tonnes converted to kilograms",
          assertionCode: js`
assert(Array.isArray(scene.telegrams) && scene.telegrams.length === 4, 'Send the four good telegrams with Port.Show("telegrams", telegrams);');
assertEqual(scene.telegrams[0], { id: "H-4001", cargo: "Fusion pellets", massKg: 1250, priority: 1 }, "first telegram (Id, Cargo, MassKg, Priority)");
assertEqual(scene.telegrams.map((t) => t.id), ["H-4001", "H-4002", "H-4004", "H-4005"], "ids (the lower-case h-4004 must be upper-cased)");
assertEqual(scene.telegrams[3].massKg, 1200, "H-4005 reports 1.2 t, which is 1200 kg");
assert(lines.includes("H-4001 -> 1250 kg, priority 1") && lines.includes("H-4005 -> 1200 kg, priority 2"), 'Print lines like "H-4001 -> 1250 kg, priority 1".');`,
        },
        {
          id: "t2",
          description: "broken telegrams are set aside with a plain-words reason",
          assertionCode: js`
assertEqual(scene.telegramRejects.length, 2, "telegramRejects (H-4003 and H-4006)");
assertEqual(scene.telegramRejects[0], { line: "H-4003 | Dental drills | 12O kg | P2", reason: 'mass "12O kg" is not a number' }, "first reject (Line, Reason)");
assertEqual(scene.telegramRejects[1].reason, "expected 4 fields, found 3", "second reject reason");
assert(lines.includes('H-4003 rejected: mass "12O kg" is not a number'), 'Print H-4003 rejected: mass "12O kg" is not a number');
assert(lines.includes("H-4006 rejected: expected 4 fields, found 3"), 'Print "H-4006 rejected: expected 4 fields, found 3".');
assert(lines.includes("Parsed 4, rejected 2"), 'Print "Parsed 4, rejected 2".');`,
        },
        {
          id: "t3",
          description: "a regular expression with named groups reads the same lines",
          assertionCode: js`
assert(lines.includes("Regex read H-4001: 1250 kg"), 'Print "Regex read H-4001: 1250 kg" from match.Groups["id"], ["mass"] and ["unit"].');
assert(lines.includes("Regex accepts 4 of 6 lines"), 'Print "Regex accepts 4 of 6 lines": anchor the pattern with ^ and $, allow either letter case on H, and allow spaces around the bars.');
assertEqual(scene.regexParts, { id: "H-4001", mass: "1250", unit: "kg" }, "regexParts (Id, Mass, Unit)");`,
        },
        {
          id: "t4",
          description: "Regex.Matches finds every whole-word id in free text",
          assertionCode: js`
assert(lines.includes("Mentioned: H-4001, H-4005"), 'Print "Mentioned: H-4001, H-4005": the pattern must need exactly four digits and word boundaries so H-12 and X-9999 are ignored.');
assertEqual(scene.mentionedIds, ["H-4001", "H-4005"], "mentionedIds");`,
        },
      ],
      unlocks: ["hp-parser"],
      checks: [
        {
          prompt: "A telegram says `1,5 t` and your program runs on a machine whose culture writes decimals with a comma. Which call reads it the same way on every machine?",
          question: {
            type: "choice",
            options: [
              "Normalise the text to a point and call `double.TryParse(text, NumberStyles.Float, CultureInfo.InvariantCulture, out v)`",
              "`double.Parse(text)`",
              "`Convert.ToDouble(text)`",
              "Any of them: the culture never matters",
            ],
            answer: 0,
          },
          explanation: "Without a culture, parsing follows the machine's settings. For data that comes from outside, choose the culture explicitly: the invariant culture always uses a decimal point. (If your data really uses commas, say so by parsing with the culture that matches it.)",
        },
        {
          prompt: "What does `Regex.IsMatch(\"xx H-4001 yy\", @\"H-\\d{4}\")` return, and what changes with `@\"^H-\\d{4}$\"`?",
          question: {
            type: "choice",
            options: [
              "`true` (it finds the id inside the text); with `^...$` it returns `false` because the whole text must be an id",
              "`false` both times",
              "`true` both times",
              "`false` first, `true` with the anchors",
            ],
            answer: 0,
          },
          explanation: "Without anchors a regex matches anywhere inside the text. `^` and `$` pin the match to the start and end, which is what you want when validating that a whole field has the right shape.",
        },
        {
          prompt: "Why prefer `int.TryParse(field, out int n)` over `int.Parse(field)` for text a person typed?",
          question: {
            type: "choice",
            options: [
              "Bad input is normal; `TryParse` reports it as `false` instead of throwing a `FormatException`",
              "`TryParse` is faster at parsing valid numbers",
              "`Parse` does not accept negative numbers",
              "`TryParse` accepts any text",
            ],
            answer: 0,
          },
          explanation: "A mistyped value is an everyday event, not an exceptional one. `TryParse` lets you handle it with a plain `if` and a helpful message.",
        },
      ],
    },
  ],
};
