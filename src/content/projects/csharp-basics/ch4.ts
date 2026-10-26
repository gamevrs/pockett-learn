import type { Chapter } from "@/engine/types";
import { TYPES_DIVIDER } from "../../../engine/compose.ts";
import { cs, js, md } from "./util.ts";

/**
 * Chapter 4: Objects and safety nets. Classes, records and enums, exceptions, and a capstone that
 * runs a whole shift. Every lesson here has a statements part (above the divider) and a types part
 * (below it); engine/compose.ts keeps them apart as the file grows.
 */

export const chapter4: Chapter = {
  id: "objects-and-safety",
  title: "Objects and safety nets",
  blurb: "Model the depot with classes, records and enums, survive bad input with exceptions, and run a shift.",
  lessons: [
    // ───────────────────────── 11 ─────────────────────────
    {
      id: "csharp-basics-11-classes",
      title: "Classes and objects",
      minutes: 35,
      xp: 160,
      concepts: ["class", "object", "fields & properties", "constructor", "methods", "encapsulation", "static vs instance", "ToString"],
      learn: md`### Data and behaviour, together

So far Rex has been a handful of loose variables (\`robotName\`, \`battery\`...). With three robots that would be nine variables and a lot of copy-paste. A **class** is a blueprint that bundles the data a thing has with the things it can do. An **object** is one thing built from that blueprint with \`new\`.

~~~csharp
class Robot
{
    public string Name { get; }                 // readable from outside, set once
    public int Battery { get; private set; }    // readable from outside, changed only inside the class

    public Robot(string name, int battery)      // the constructor: same name as the class, no return type
    {
        Name = name;
        Battery = Math.Clamp(battery, 0, 100);   // keep the object valid from the start
    }

    public void Charge() => Battery = 100;
}

Robot rex = new Robot("Rex", 80);    // or:  Robot rex = new("Rex", 80);
rex.Charge();
Console.WriteLine(rex.Battery);      // 100
~~~

### The parts of a class

- **Properties** such as \`Name\` and \`Battery\` are the object's data. \`{ get; }\` means "read-only after construction", \`{ get; private set; }\` means "anyone may read it, only code inside the class may change it". They look like fields from outside but can run code, and can be changed later without breaking callers. (A plain *field*, \`private int _battery;\`, is the raw storage; keep fields private.)
- A **constructor** runs when you write \`new\`. Use it to put every object in a valid starting state.
- **Methods** are the object's actions. Inside them, the properties are simply in scope.
- A **computed property** has no storage; it works out its value each time: \`public bool NeedsCharge => Battery < 20;\`.
- \`public\` means usable from outside the class, \`private\` only from inside. Members are \`private\` unless you say otherwise.

### Encapsulation: protect the rules

Because \`Battery\` has a \`private set\`, the only way to change it is through the class's own methods, which can enforce rules (never below 0, never above 100). If \`Battery\` were a public field, any line of code anywhere could set it to \`-500\`. Fewer ways to break the rules means fewer bugs.

### Static or instance?

An **instance** member belongs to one object: \`rex.Battery\`. A **static** member belongs to the class itself: \`Math.Max\`, \`Planner.Distance\`. Use static for helpers that need no object's data. Everything about *a particular robot* is an instance member.

### Printing an object

By default an object prints as its type name. Override \`ToString()\` and \`Console.WriteLine(rex)\` and interpolation will use yours:

~~~csharp
public override string ToString() => $"{Name}: {Battery}%";
~~~

### Objects are references

Like arrays and lists, two variables can refer to the same robot. \`Robot a = rex; a.Charge();\` charges Rex. Comparing two objects with \`==\` asks "are these the *same object*?" and not "do they have equal data?". (Records, in the next lesson, compare by value.)

### Where the class goes

A class is a type, so in this file it lives under the divider, below your statements. You can create and use it from the statements above because the compiler reads the whole file first.

### Common mistakes

- Forgetting \`new\`, then using a variable that was never given an object.
- Making every property public with a public setter, so nothing protects the rules.
- Assigning a constructor parameter to itself (\`name = name;\`) instead of to the property (\`Name = name;\`). Different capitalisation avoids the trap.
- Calling an instance method on the class (\`Robot.Charge()\`) instead of on an object.`,
      mission: md`One robot was a card. The depot has a fleet: Rex, Pip, Dot and a new robot called Bit, each with its own battery and odometer, each able to drive and charge. Copy-pasting variables for each of them would be a mess, so you will describe a \`Robot\` once and build as many as you need.

When this lesson passes, the **Fleet** panel shows one card per robot object with its own battery and a warning for the ones that need charging.`,
      tasks: [
        "Write class Robot (under the divider) with Name (get-only), Battery and Meters (both get with private set) and a computed NeedsCharge that is true below 20",
        "Add a constructor Robot(string name, int battery) that clamps the battery to 0-100, a Drive(int meters) method (adds to Meters, drains meters / 2 from Battery, never below 0) and Charge() (back to 100)",
        "Override ToString so a robot prints like Rex: 65% after 30 m, with (needs charge) added at the end when NeedsCharge is true",
        "Make a List<Robot> fleet with Rex 80, Pip 35, Dot 18 and Bit 10. Drive Rex 30, Pip 40 and Bit 100; charge Dot and then drive it 10. Print every robot and Show the fleet",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 11: a fleet of Robot objects. The class itself goes under the divider (Part A).
// Part B (here): build the fleet and use it.
// List<Robot> fleet = new() { new Robot("Rex", 80), new Robot("Pip", 35), new Robot("Dot", 18), new Robot("Bit", 10) };
// fleet[0].Drive(30);  fleet[1].Drive(40);  fleet[3].Drive(100);
// fleet[2].Charge();   fleet[2].Drive(10);
// foreach (Robot robot in fleet) Console.WriteLine(robot);
// Depot.Show("fleet", fleet);

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── Part A: write the Robot class here.
//   Name (get only), Battery and Meters (private set), NeedsCharge => Battery < 20
//   constructor Robot(string name, int battery)  -> Math.Clamp(battery, 0, 100)
//   Drive(int meters): Meters += meters; Battery = Math.Max(0, Battery - meters / 2);
//   Charge(): Battery = 100;
//   ToString(): "Rex: 65% after 30 m"  (+ " (needs charge)" when NeedsCharge)
class Robot
{
}`,
      solutionAdd: cs`// Lesson 11: a fleet of Robot objects.
List<Robot> fleet = new()
{
    new Robot("Rex", 80),
    new Robot("Pip", 35),
    new Robot("Dot", 18),
    new Robot("Bit", 10),
};

fleet[0].Drive(30);
fleet[1].Drive(40);
fleet[3].Drive(100);
fleet[2].Charge();
fleet[2].Drive(10);

foreach (Robot robot in fleet)
{
    Console.WriteLine(robot);
}

Depot.Show("fleet", fleet);

${TYPES_DIVIDER}

// One delivery robot: its own battery and odometer, and the rules for changing them.
class Robot
{
    public string Name { get; }
    public int Battery { get; private set; }
    public int Meters { get; private set; }
    public bool NeedsCharge => Battery < 20;

    public Robot(string name, int battery)
    {
        Name = name;
        Battery = Math.Clamp(battery, 0, 100);
    }

    public void Drive(int meters)
    {
        Meters += meters;
        Battery = Math.Max(0, Battery - meters / 2);
    }

    public void Charge() => Battery = 100;

    public override string ToString() =>
        $"{Name}: {Battery}% after {Meters} m{(NeedsCharge ? " (needs charge)" : "")}";
}`,
      explanation:
        "Each Robot object carries its own Battery and Meters, so Rex driving 30 m does not affect Pip. The private set means only the class's own methods change the battery, so Drive can enforce the rule (never below 0) in one place and the constructor can clamp a bad starting value. NeedsCharge is a computed property: it has no storage and is recalculated from Battery each time it is read. Overriding ToString makes Console.WriteLine(robot) print the readable line. Depot.Show(\"fleet\", fleet) serialises every public property of every robot, which is what the Fleet panel draws.",
      hints: [
        { id: "h1", title: "Properties and constructor", content: "public string Name { get; } and public int Battery { get; private set; } and public int Meters { get; private set; } then public bool NeedsCharge => Battery < 20; The constructor is public Robot(string name, int battery) { Name = name; Battery = Math.Clamp(battery, 0, 100); }" },
        { id: "h2", title: "Methods", content: "public void Drive(int meters) { Meters += meters; Battery = Math.Max(0, Battery - meters / 2); } and public void Charge() => Battery = 100; Math.Max keeps the battery from going negative." },
        { id: "h3", title: "ToString", content: "public override string ToString() => $\"{Name}: {Battery}% after {Meters} m{(NeedsCharge ? \" (needs charge)\" : \"\")}\"; The extra parentheses let you use a ternary inside an interpolation hole." },
      ],
      tests: [
        {
          id: "t1",
          description: "the fleet has four robot objects with their names",
          assertionCode: js`
assert(Array.isArray(scene.fleet), "Send the list with Depot.Show(\"fleet\", fleet); The Robot class needs public properties for the board to read.");
assertEqual(scene.fleet.map((r) => r.name), ["Rex", "Pip", "Dot", "Bit"], "robot names (a get-only public Name property)");`,
        },
        {
          id: "t2",
          description: "Drive spends battery and adds distance",
          assertionCode: js`
const [rex, pip] = scene.fleet;
assertEqual([rex.battery, rex.meters], [65, 30], "Rex after Drive(30): battery 80 - 15, meters 30");
assertEqual([pip.battery, pip.meters], [15, 40], "Pip after Drive(40): battery 35 - 20, meters 40");`,
        },
        {
          id: "t3",
          description: "Charge refills, and Drive after it still counts",
          assertionCode: js`
const dot = scene.fleet[2];
assertEqual([dot.battery, dot.meters], [95, 10], "Dot: Charge() sets 100, then Drive(10) costs 5 and adds 10 meters");`,
        },
        {
          id: "t4",
          description: "the battery never goes below zero, and NeedsCharge is computed",
          assertionCode: js`
const bit = scene.fleet[3];
assertEqual(bit.battery, 0, "Bit: Drive(100) would cost 50 from a battery of 10, but the battery must stop at 0");
assertEqual(bit.meters, 100, "Bit's meters");
assertEqual(scene.fleet.map((r) => r.needsCharge), [false, true, false, true], "needsCharge for each robot (a computed property: Battery < 20)");`,
        },
        {
          id: "t5",
          description: "ToString makes each robot print as a readable line",
          assertionCode: js`
for (const line of ["Rex: 65% after 30 m", "Pip: 15% after 40 m (needs charge)", "Dot: 95% after 10 m", "Bit: 0% after 100 m (needs charge)"]) {
  assert(lines.includes(line), "Print every robot with Console.WriteLine(robot) after overriding ToString. Missing the line: " + line);
}`,
        },
      ],
      unlocks: ["cs-fleet"],
      checks: [
        {
          prompt: "What is the benefit of `public int Battery { get; private set; }` over a public field `public int Battery;`?",
          question: {
            type: "choice",
            options: [
              "Only code inside the class can change it, so the class can protect its own rules",
              "It uses less memory",
              "It makes the value constant",
              "Nothing: they are identical",
            ],
            answer: 0,
          },
          explanation: "With a private setter every change goes through the class's own methods (`Drive`, `Charge`), where the rules live. A public field lets any code anywhere set an impossible value.",
        },
        {
          prompt: "Given `Robot a = new(\"Rex\", 50); Robot b = a; b.Charge();`, what is `a.Battery`?",
          question: { type: "number", answer: 100 },
          explanation: "`Robot` is a class, a reference type. `b = a` copies the *reference*, so both variables point at the one Rex object. Charging through `b` charges the object `a` sees as well.",
        },
        {
          prompt: "When is a `static` method the right choice?",
          question: {
            type: "choice",
            options: [
              "When it needs no particular object's data, like `Math.Max` or `Planner.Distance`",
              "When it must change an object's private data",
              "Whenever the class has a constructor",
              "Never: static is only for constants",
            ],
            answer: 0,
          },
          explanation: "Static members belong to the class, not to an object. They suit helpers that work only on their arguments. Anything that reads or changes one robot's battery should be an instance member.",
        },
      ],
    },

    // ───────────────────────── 12 ─────────────────────────
    {
      id: "csharp-basics-12-records",
      title: "Records and enums",
      minutes: 30,
      xp: 150,
      concepts: ["enum", "record", "positional records", "value equality", "with expressions", "immutability", "Enum.GetNames"],
      learn: md`### Enums: a closed list of names

When a value can only be one of a few named options, an **enum** says so. The compiler then rejects typos and invites you to handle every case.

~~~csharp
enum ParcelStatus { Waiting, Loaded, Delivered, Lost }

ParcelStatus status = ParcelStatus.Waiting;
Console.WriteLine(status);                  // Waiting
Console.WriteLine((int)status);             // 0   enums are numbered from 0 underneath
~~~

Compare that with using the strings \`"waiting"\`, \`"Waiting"\` and \`"waitng"\`: nothing stops the last one. Useful helpers:

~~~csharp
Enum.TryParse<ParcelStatus>("Lost", out var parsed);   // text to enum, safely
string[] names = Enum.GetNames<ParcelStatus>();         // "Waiting", "Loaded", "Delivered", "Lost"
~~~

A \`switch\` expression over an enum reads very well and the compiler can warn if you forget a case.

### Records: classes made for data

Most "things" in a program are really bundles of values: a parcel is an id, a destination, a weight and a status. A **record** declares that bundle in one line:

~~~csharp
record Parcel(string Id, string Destination, double Kg, ParcelStatus Status);
~~~

That single line gives you a constructor, public read-only properties named \`Id\`, \`Destination\`, \`Kg\` and \`Status\`, a readable \`ToString\`, value equality and the \`with\` expression. Use it like a class:

~~~csharp
Parcel p = new("P-100", "Library", 4.5, ParcelStatus.Loaded);
Console.WriteLine(p.Destination);   // Library
Console.WriteLine(p);               // Parcel { Id = P-100, Destination = Library, Kg = 4.5, Status = Loaded }
~~~

### Value equality

Two records are equal when all their values are equal. For classes, \`==\` asked "same object?". For records it asks "same data?".

~~~csharp
Parcel a = new("P-100", "Library", 4.5, ParcelStatus.Loaded);
Parcel b = new("P-100", "Library", 4.5, ParcelStatus.Loaded);
Console.WriteLine(a == b);   // True   (two different objects, same values)
~~~

### Immutable by default, changed by copying

A positional record's properties can be read but not assigned, so a parcel never changes behind your back. To "change" it, make a modified **copy** with \`with\`:

~~~csharp
Parcel delivered = a with { Status = ParcelStatus.Delivered };
// a is untouched; delivered is a new Parcel with the same values except Status
~~~

To update a list you replace the item: \`list[0] = list[0] with { Status = ParcelStatus.Delivered };\`. Immutable data is easier to reason about, because if you hold a parcel, nobody else can alter it.

You can also take a record apart: \`var (id, destination, kg, status) = p;\`.

### Class or record?

- Behaviour and changing identity (a Robot that drives and charges): **class**.
- Plain data that you pass around and compare (a Parcel, an Incident, a Point): **record**.

### Common mistakes

- Using strings for fixed choices.
- Trying to assign to a record's property (\`p.Status = ...\` does not compile). Use \`with\`.
- Forgetting that records, being references, still need \`new\`, and that they also go under the divider.
- Counting statuses with a dictionary but forgetting to start every status at 0, so a status with no parcels is missing from the result.`,
      mission: md`Parcels are the reason the depot exists. Each has an id, a destination, a weight and a status that moves from *Waiting* to *Loaded* to *Delivered* (or *Lost*). Strings would let someone write "Delivred", so the status becomes an enum, and the parcel becomes a record you can compare and copy safely.

When this lesson passes, the **Parcel board** sorts your parcels into status columns. Click a status chip on the stage to filter.`,
      tasks: [
        "Under the divider, declare enum ParcelStatus { Waiting, Loaded, Delivered, Lost } and record Parcel(string Id, string Destination, double Kg, ParcelStatus Status)",
        "Create List<Parcel> parcelList with P-100 Library 4.5 Loaded, P-101 Harbour 12 Waiting, P-102 School 7.2 Waiting, P-103 Market 26.5 Waiting and P-104 Library 3 Delivered",
        "Keep Parcel first = parcelList[0]; make a delivered copy with a with expression and put it in the list. Print P-100 was Loaded, now Delivered. Then bool sameValues = first == new Parcel(\"P-100\", \"Library\", 4.5, ParcelStatus.Loaded) and print Same values: True",
        "Count the parcels per status in Dictionary<string, int> statusCounts (start every name from Enum.GetNames<ParcelStatus>() at 0). Show parcelList, statusCounts and sameValues",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 12: parcels as records, statuses as an enum. (parcels is already an int from lesson 3, so call the list parcelList.)
// Part B (here):
// 1. List<Parcel> parcelList = new() { new Parcel("P-100", "Library", 4.5, ParcelStatus.Loaded), ... five parcels ... };
// 2. Parcel first = parcelList[0];  Parcel delivered = first with { Status = ParcelStatus.Delivered };  parcelList[0] = delivered;
//    Print:  P-100 was Loaded, now Delivered
//    bool sameValues = first == new Parcel("P-100", "Library", 4.5, ParcelStatus.Loaded);   Print:  Same values: True
// 3. Dictionary<string, int> statusCounts = new(); foreach (string name in Enum.GetNames<ParcelStatus>()) statusCounts[name] = 0;
//    then foreach parcel: statusCounts[parcel.Status.ToString()]++;
// Depot.Show: parcelList, statusCounts, sameValues

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── Part A: declare the enum and the record here.
//   enum ParcelStatus { Waiting, Loaded, Delivered, Lost }
//   record Parcel(string Id, string Destination, double Kg, ParcelStatus Status);
`,
      solutionAdd: cs`// Lesson 12: parcels as records, statuses as an enum.
List<Parcel> parcelList = new()
{
    new Parcel("P-100", "Library", 4.5, ParcelStatus.Loaded),
    new Parcel("P-101", "Harbour", 12, ParcelStatus.Waiting),
    new Parcel("P-102", "School", 7.2, ParcelStatus.Waiting),
    new Parcel("P-103", "Market", 26.5, ParcelStatus.Waiting),
    new Parcel("P-104", "Library", 3, ParcelStatus.Delivered),
};

Parcel first = parcelList[0];
Parcel delivered = first with { Status = ParcelStatus.Delivered };
parcelList[0] = delivered;
Console.WriteLine($"{first.Id} was {first.Status}, now {delivered.Status}");

bool sameValues = first == new Parcel("P-100", "Library", 4.5, ParcelStatus.Loaded);
Console.WriteLine($"Same values: {sameValues}");

Dictionary<string, int> statusCounts = new();
foreach (string statusName in Enum.GetNames<ParcelStatus>())
{
    statusCounts[statusName] = 0;
}
foreach (Parcel item in parcelList)
{
    statusCounts[item.Status.ToString()]++;
}

Depot.Show("parcelList", parcelList);
Depot.Show("statusCounts", statusCounts);
Depot.Show("sameValues", sameValues);

${TYPES_DIVIDER}

// Where a parcel is in its journey.
enum ParcelStatus { Waiting, Loaded, Delivered, Lost }

// One parcel as plain data. Records compare by value and are changed with "with".
record Parcel(string Id, string Destination, double Kg, ParcelStatus Status);`,
      explanation:
        "The enum limits status to four names, so a typo is a compile error instead of a silent bug. The positional record gives Parcel its constructor, read-only properties, ToString and value equality in one line. Because properties cannot be assigned, first with { Status = ... } builds a modified copy, and first itself still says Loaded, which the \"was Loaded, now Delivered\" line proves. first == new Parcel(...) is true because every value matches, even though they are two objects. statusCounts starts every enum name at 0 so Lost shows up as 0 instead of missing.",
      hints: [
        { id: "h1", title: "Declaring the types", content: "Under the divider: enum ParcelStatus { Waiting, Loaded, Delivered, Lost } and record Parcel(string Id, string Destination, double Kg, ParcelStatus Status); Create parcels with new Parcel(\"P-100\", \"Library\", 4.5, ParcelStatus.Loaded)." },
        { id: "h2", title: "with and equality", content: "Parcel delivered = first with { Status = ParcelStatus.Delivered }; creates a copy; then parcelList[0] = delivered; The first variable still holds the old values. first == new Parcel(\"P-100\", \"Library\", 4.5, ParcelStatus.Loaded) compares all four values." },
        { id: "h3", title: "Counting by status", content: "Dictionary<string, int> statusCounts = new(); foreach (string statusName in Enum.GetNames<ParcelStatus>()) { statusCounts[statusName] = 0; } then foreach (Parcel item in parcelList) { statusCounts[item.Status.ToString()]++; }" },
      ],
      tests: [
        {
          id: "t1",
          description: "the list holds five parcel records",
          assertionCode: js`
assert(Array.isArray(scene.parcelList), "Send the list with Depot.Show(\"parcelList\", parcelList);");
assertEqual(scene.parcelList.map((p) => p.id), ["P-100", "P-101", "P-102", "P-103", "P-104"], "parcel ids (a public Id property on the record)");
assertEqual(scene.parcelList.map((p) => p.destination), ["Library", "Harbour", "School", "Market", "Library"], "destinations");
assertEqual(scene.parcelList.map((p) => p.kg), [4.5, 12, 7.2, 26.5, 3], "weights");`,
        },
        {
          id: "t2",
          description: "the delivered copy replaced the first parcel and statuses are enum names",
          assertionCode: js`assertEqual(scene.parcelList.map((p) => p.status), ["Delivered", "Waiting", "Waiting", "Waiting", "Delivered"], "statuses after replacing P-100 with its Delivered copy");`,
        },
        {
          id: "t3",
          description: "with leaves the original record unchanged",
          assertionCode: js`assert(lines.includes("P-100 was Loaded, now Delivered"), 'Print "P-100 was Loaded, now Delivered" using the ORIGINAL (first) and the copy (delivered). A with expression never changes the original.');`,
        },
        {
          id: "t4",
          description: "records with equal values are equal",
          assertionCode: js`
assertEqual(scene.sameValues, true, "sameValues (first == new Parcel(\"P-100\", \"Library\", 4.5, ParcelStatus.Loaded): records compare by value)");
assert(lines.includes("Same values: True"), 'Print "Same values: True" from the bool.');`,
        },
        {
          id: "t5",
          description: "statusCounts counts every status, including empty ones",
          assertionCode: js`assertEqual(scene.statusCounts, { Waiting: 3, Loaded: 0, Delivered: 2, Lost: 0 }, "statusCounts (start each name from Enum.GetNames at 0 so Loaded and Lost appear with 0)");`,
        },
      ],
      unlocks: ["cs-parcels"],
      checks: [
        {
          prompt: "Given `Parcel a = new(\"P-1\", \"Library\", 4.5, ParcelStatus.Loaded);` and an identical `Parcel b`, what is `a == b`?",
          question: { type: "choice", options: ["True, because records compare by value", "False, because they are different objects", "It does not compile", "It depends on the memory address"], answer: 0 },
          explanation: "For a record `==` compares the values of all properties. For an ordinary class it would compare references and give `False` for two separate objects.",
        },
        {
          prompt: "How do you change the status of an existing `Parcel p` (a positional record)?",
          question: {
            type: "choice",
            options: [
              "`p.Status = ParcelStatus.Lost;`",
              "`p = p with { Status = ParcelStatus.Lost };`",
              "`p.SetStatus(Lost);`",
              "You cannot: records are frozen forever",
            ],
            answer: 1,
          },
          explanation: "Positional record properties are init-only, so assignment does not compile. A `with` expression creates a modified copy, and you store that copy back. Anything else still holding the old parcel keeps seeing the old values.",
        },
        {
          prompt: "Why is `enum ParcelStatus { Waiting, Loaded }` safer than using the strings \"Waiting\" and \"Loaded\"?",
          question: {
            type: "choice",
            options: [
              "The compiler rejects names that are not in the enum, so typos cannot compile",
              "Enums run faster than any string",
              "Strings cannot be compared",
              "Enums can hold any text",
            ],
            answer: 0,
          },
          explanation: "`ParcelStatus.Delivred` is a compile error, but the string `\"Delivred\"` is perfectly valid text that fails silently later. Closed sets of options belong in enums.",
        },
      ],
    },

    // ───────────────────────── 13 ─────────────────────────
    {
      id: "csharp-basics-13-exceptions",
      title: "Exceptions",
      minutes: 30,
      xp: 150,
      concepts: ["try / catch / finally", "throw", "exception types", "ex.Message", "stack traces", "expected vs exceptional"],
      learn: md`### When something goes wrong

Some failures cannot be avoided by checking first: a file is missing, a number is malformed, a request is invalid. In C# the code that notices the problem **throws an exception**, an object describing what went wrong. The exception travels back up through the callers until something **catches** it. If nothing does, the program stops and prints a crash report.

~~~text
Unhandled exception. System.FormatException: The input string '12kg' was not in a correct format.
   at Program.<Main>$(String[] args) in Program.cs:line 42
~~~

Learn to read that: the **type**, the **message**, and a **stack trace** whose first lines name your own file and line number. The stage shows exactly this when your program crashes.

### \`try\`, \`catch\`, \`finally\`

~~~csharp
try
{
    int weight = int.Parse(text);          // might throw
    Console.WriteLine($"Weight: {weight}");
}
catch (FormatException)
{
    Console.WriteLine("That is not a whole number");   // runs only when it threw
}
finally
{
    Console.WriteLine("Done");                          // ALWAYS runs, error or not
}
~~~

- The code in \`try\` runs until something throws; the rest of the block is skipped.
- The first \`catch\` whose type matches handles it. Catch **specific** types: \`catch (FormatException ex)\` gives you the object, \`ex.Message\` is its description.
- \`finally\` runs whatever happened. It is for cleanup that must not be skipped.
- A \`catch (Exception)\` is the broad net. Put it **last** (a broader catch before a narrower one will not compile) and use it sparingly.

### Throwing your own

~~~csharp
static void Load(Parcel parcel, int limitKg)
{
    if (parcel.Kg > limitKg)
        throw new InvalidOperationException($"{parcel.Id} is {parcel.Kg} kg, over the {limitKg} kg limit");
    Console.WriteLine($"{parcel.Id} loaded");
}
~~~

Choose the closest built-in type: \`ArgumentException\` (a bad argument), \`ArgumentNullException\`, \`ArgumentOutOfRangeException\`, \`InvalidOperationException\` (valid call, wrong state), \`FormatException\`, \`KeyNotFoundException\`. Always include a message that says what happened, with the values. Inside a \`catch\`, write \`throw;\` (not \`throw ex;\`) to re-throw and keep the original stack trace.

### Exceptions or checks?

Exceptions are for the **exceptional**. Do not use them for ordinary decisions:

- If bad input is *normal* (a user typing a letter), use \`TryParse\` and an \`if\`.
- If something should never happen and the caller cannot reasonably continue (a null where an object is required, a limit broken), throw.
- Some exceptions mean *your code is wrong* (\`NullReferenceException\`, \`IndexOutOfRangeException\`). Fix the code; do not catch them to hide the bug.
- Never write an empty \`catch { }\`. Swallowed errors become mysteries. At least record what happened.

### Where to catch

Catch where you can actually **do something useful**: skip one bad parcel and carry on, show a message, retry. A \`try\` around a whole loop abandons the rest of the loop after the first failure; a \`try\` *inside* the loop handles each item separately.

### Common mistakes

- Catching \`Exception\` everywhere "to be safe".
- Putting a broad catch before a specific one.
- Throwing a bare \`new Exception()\` with no message.
- Using exceptions for expected cases, instead of \`TryParse\`.`,
      mission: md`The depot's inputs are messy and its limits are real. A weight typed as "12kg" must not crash the shift, and a 26.5 kg parcel must be refused with an explanation instead of overloading a robot. Every refusal is written to the safety log so a supervisor can read it later.

When this lesson passes, the **Safety log** shows each incident with its kind and message, and the number of parcels loaded safely.`,
      tasks: [
        "Under the divider declare record Incident(string Kind, string Message). Create List<Incident> incidents. Write a local function int ReadWeight(string text): try int.Parse, and in catch (FormatException) add Incident(\"Bad input\", \"\\\"12kg\\\" is not a whole number\") for the text you were given and return -1. Print ReadWeight(\"12\") and ReadWeight(\"12kg\") as ReadWeight(12) = 12 style lines",
        "Write a local function void Load(Parcel parcel, int limitKg) that throws InvalidOperationException(\"P-103 is 26.5 kg, over the 25 kg limit\") (built from the parcel) when it is too heavy, and otherwise prints P-101 loaded",
        "Loop over parcelList; for each Waiting parcel call Load(parcel, 25) inside a try. In the catch add Incident(\"Overweight\", ex.Message); on success count it in int loaded. Wrap the whole loop in an outer try / finally that prints Loading dock closed",
        "Show incidents and loaded",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 13: refuse bad input and overweight parcels without crashing.
// Part B (here):
// List<Incident> incidents = new();
// int ReadWeight(string text)  -> try { return int.Parse(text); } catch (FormatException) { incidents.Add(new Incident("Bad input", $"\"{text}\" is not a whole number")); return -1; }
// Print:  ReadWeight(12) = 12   and   ReadWeight(12kg) = -1
// void Load(Parcel parcel, int limitKg)  -> throw new InvalidOperationException($"{parcel.Id} is {parcel.Kg} kg, over the {limitKg} kg limit")
//                                           when parcel.Kg > limitKg; otherwise print $"{parcel.Id} loaded"
// int loaded = 0;
// try { foreach (Parcel parcel in parcelList) { if not Waiting: continue; try { Load(parcel, 25); loaded++; } catch (InvalidOperationException ex) { incidents.Add(new Incident("Overweight", ex.Message)); } } }
// finally { Console.WriteLine("Loading dock closed"); }
// Depot.Show: incidents, loaded

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── Part A: declare the Incident record here.
//   record Incident(string Kind, string Message);
`,
      solutionAdd: cs`// Lesson 13: refuse bad input and overweight parcels without crashing.
List<Incident> incidents = new();

int ReadWeight(string text)
{
    try
    {
        return int.Parse(text);
    }
    catch (FormatException)
    {
        incidents.Add(new Incident("Bad input", $"\"{text}\" is not a whole number"));
        return -1;
    }
}

void Load(Parcel parcel, int limitKg)
{
    if (parcel.Kg > limitKg)
    {
        throw new InvalidOperationException($"{parcel.Id} is {parcel.Kg} kg, over the {limitKg} kg limit");
    }
    Console.WriteLine($"{parcel.Id} loaded");
}

Console.WriteLine($"ReadWeight(12) = {ReadWeight("12")}");
Console.WriteLine($"ReadWeight(12kg) = {ReadWeight("12kg")}");

int loaded = 0;
try
{
    foreach (Parcel parcel in parcelList)
    {
        if (parcel.Status != ParcelStatus.Waiting) continue;

        try
        {
            Load(parcel, 25);
            loaded++;
        }
        catch (InvalidOperationException ex)
        {
            incidents.Add(new Incident("Overweight", ex.Message));
        }
    }
}
finally
{
    Console.WriteLine("Loading dock closed");
}

Depot.Show("incidents", incidents);
Depot.Show("loaded", loaded);

${TYPES_DIVIDER}

// One entry in the safety log.
record Incident(string Kind, string Message);`,
      explanation:
        "int.Parse throws FormatException for \"12kg\"; catching that specific type lets the program record an Incident and return -1 instead of crashing. Load throws InvalidOperationException with a message built from the parcel's own values, which is the message the catch block stores. The inner try/catch sits inside the loop, so P-103 is refused but the loop would carry on with any parcel after it; the outer finally always prints \"Loading dock closed\", even if something unexpected escaped. Two parcels (P-101, P-102) loaded, one incident per refusal.",
      hints: [
        { id: "h1", title: "ReadWeight", content: "Put return int.Parse(text); inside try, and catch (FormatException) { incidents.Add(new Incident(\"Bad input\", $\"\\\"{text}\\\" is not a whole number\")); return -1; } Every path must return a value. Declare record Incident(string Kind, string Message); under the divider." },
        { id: "h2", title: "Throwing", content: "if (parcel.Kg > limitKg) { throw new InvalidOperationException($\"{parcel.Id} is {parcel.Kg} kg, over the {limitKg} kg limit\"); } Console.WriteLine($\"{parcel.Id} loaded\"); The message is what ex.Message returns later." },
        { id: "h3", title: "try inside the loop", content: "foreach (Parcel parcel in parcelList) { if (parcel.Status != ParcelStatus.Waiting) continue; try { Load(parcel, 25); loaded++; } catch (InvalidOperationException ex) { incidents.Add(new Incident(\"Overweight\", ex.Message)); } } Wrap the foreach in try { ... } finally { Console.WriteLine(\"Loading dock closed\"); }" },
      ],
      tests: [
        {
          id: "t1",
          description: "a malformed weight is caught and logged",
          assertionCode: js`
assert(lines.includes("ReadWeight(12) = 12"), 'Print "ReadWeight(12) = 12".');
assert(lines.includes("ReadWeight(12kg) = -1"), 'Print "ReadWeight(12kg) = -1": catch the FormatException and return -1.');
assert(Array.isArray(scene.incidents), "Send the list with Depot.Show(\"incidents\", incidents);");
assertEqual(scene.incidents[0], { kind: "Bad input", message: "\"12kg\" is not a whole number" }, "first incident");`,
        },
        {
          id: "t2",
          description: "an overweight parcel is refused with a clear message",
          assertionCode: js`
assertEqual(scene.incidents.length, 2, "number of incidents (one bad input, one overweight parcel)");
assertEqual(scene.incidents[1], { kind: "Overweight", message: "P-103 is 26.5 kg, over the 25 kg limit" }, "second incident (use ex.Message from your own exception)");`,
        },
        {
          id: "t3",
          description: "parcels within the limit are loaded and counted",
          assertionCode: js`
assert(lines.includes("P-101 loaded") && lines.includes("P-102 loaded"), "P-101 (12 kg) and P-102 (7.2 kg) are within the limit and should print 'loaded'.");
assert(!lines.includes("P-103 loaded"), "P-103 weighs 26.5 kg: it must be refused, not loaded.");
assertEqual(scene.loaded, 2, "loaded (only successful loads count)");`,
        },
        {
          id: "t4",
          description: "finally runs once, after the loop",
          assertionCode: js`
assertEqual(lines.filter((l) => l === "Loading dock closed").length, 1, 'How many times "Loading dock closed" is printed (an outer try / finally around the whole loop prints it once)');
assert(lines.indexOf("Loading dock closed") > lines.indexOf("P-102 loaded"), "The finally message should come after the parcels are processed.");`,
        },
      ],
      unlocks: ["cs-safety"],
      checks: [
        {
          prompt: "When does the code in a `finally` block run?",
          question: {
            type: "choice",
            options: [
              "Only when an exception was thrown",
              "Only when no exception was thrown",
              "Always: after the try finished normally, or after a catch handled an exception",
              "Never automatically",
            ],
            answer: 2,
          },
          explanation: "`finally` is the cleanup guarantee. It runs on success, after a matching `catch`, and even when the exception is not caught by this `try` at all.",
        },
        {
          prompt: "Why does this not compile?\n\n~~~csharp\ntry { Run(); }\ncatch (Exception) { }\ncatch (FormatException) { }\n~~~",
          question: {
            type: "choice",
            options: [
              "The second catch can never run: the broader `Exception` catch already takes everything",
              "`catch` blocks must be empty",
              "You can have only one `catch`",
              "`FormatException` is not a real type",
            ],
            answer: 0,
          },
          explanation: "Catch blocks are tried top to bottom and `FormatException` is also an `Exception`. The compiler tells you the second block is unreachable (error CS0160). Always order catches from most specific to most general.",
        },
        {
          prompt: "A user types a letter where a number was expected. What is the better tool here?",
          question: {
            type: "choice",
            options: [
              "`int.TryParse` and an `if`, because bad input is normal, not exceptional",
              "A giant `catch (Exception)` around the whole program",
              "Let the program crash",
              "`throw` a new exception and ignore it",
            ],
            answer: 0,
          },
          explanation: "Exceptions are slower and are meant for surprises. A mistyped value is an everyday event, so the cheap, readable `TryParse` check is the better design. Keep `try/catch` for failures you cannot test for in advance.",
        },
      ],
    },

    // ───────────────────────── 14 ─────────────────────────
    {
      id: "csharp-basics-14-shift",
      title: "Run the whole shift",
      minutes: 40,
      xp: 220,
      concepts: ["decomposition", "composing methods", "records", "dictionaries", "exceptions", "switch expressions", "reading a stack trace"],
      learn: md`### You now have all the pieces

Everything in this last lesson already exists in your file: you can read and clean text (4), decide (5), repeat (6), hold collections (7, 8), call and design methods (9), cope with missing values (10), model things as objects (11) and records (12), and survive bad input (13). The skill left is **composition**: combining small, correct pieces into a bigger behaviour.

### A way to approach a small program

1. **Say what goes in and what comes out.** In: six order lines like \`P-201,Library,8\`. Out: a \`ShiftReport\` (how many delivered and rejected, revenue, busiest stop) and a safety log.
2. **List the steps for one item.** Split the line, parse the weight, check the limit, price it, record where it went.
3. **Reuse what you have.** \`ReadWeight\` already parses and logs a bad weight. \`Load\` already refuses an overweight parcel. Do not copy their logic; call them.
4. **Write the loop, then the summary.** Totals are filled in during the loop; the answer is built after it.
5. **Put the result in a type.** A record such as \`ShiftReport\` documents the answer's shape and is easy to print, compare and test.
6. **Test with the awkward cases first**: the bad number, the over-limit weight, the exact boundary (a 5 kg parcel is *not* "under 5").

### Money and rules

Price by tier with a switch expression, summed in a \`decimal\`:

~~~csharp
revenue += kg switch
{
    < 5 => 2.00m,
    < 20 => 3.50m,
    _ => 6.00m,
};
~~~

### Counting with a dictionary, then finding the maximum

~~~csharp
perStop[destination] = perStop.GetValueOrDefault(destination) + 1;

string busiest = "none";
int most = 0;
foreach (var (stop, count) in perStop)
{
    if (count > most) { busiest = stop; most = count; }
}
~~~

### Reading a crash

If your shift code throws and nothing catches it, the stage shows the exception type, its message and the first lines of the stack trace, for example \`at Program.<Main>$(String[] args) in Program.cs:line 118\`. The line number is **your** line. Read from the top: the first line that names your file is usually where to start looking, and the message often names the bad value.

### Code you can be proud of

- Names say what things mean (\`overweight\`, not \`flag2\`).
- Each method does one job.
- No copy-pasted blocks. If you pasted, make a method.
- Bad input is handled, with a message that helps.
- The program prints a result a human can read.

### Where next

You have the foundations of C#: values, types, control flow, collections, methods, classes, records and exceptions. The next steps on the path are interfaces and generics, delegates and events, LINQ queries, async code and, eventually, web APIs. They all build directly on what is in your file now.`,
      mission: md`It is the end of the shift. Six order lines arrive in the old comma-separated format, and the owner wants one report: how many parcels were delivered, how many were turned away, the day's revenue and the busiest stop.

This is the lesson where your code runs the depot. When it passes, the **Shift report** lights up, the board shows every system online, and the depot score reflects your work.`,
      tasks: [
        "Under the divider declare record ShiftReport(int Delivered, int Rejected, decimal Revenue, string BusiestStop). Above, copy the six order lines from the starter into string[] orderLines",
        "Write local function ShiftReport RunShift(string[] orders). For each line: Split(','), get the weight with your ReadWeight (reject it when it returns a negative number), build a Parcel, and call Load(parcel, 25) in a try. When Load throws, add Incident(\"Overweight\", ex.Message) and reject the order",
        "For each accepted order add the price with a switch expression (under 5 kg 2.00m, under 20 kg 3.50m, otherwise 6.00m) to a decimal revenue, count the delivery and count it against its destination in a Dictionary<string, int>. After the loop find the destination with the most deliveries",
        "Print Delivered: 4 | Rejected: 2 | Revenue: 16.50 | Busiest stop: Library from the returned report (Revenue with :F2) and Show report and incidents",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 14: run the whole shift.
string[] orderLines =
{
    "P-201,Library,8",
    "P-202,Harbour,31",
    "P-203,School,x",
    "P-204,Library,14",
    "P-205,Market,22",
    "P-206,Harbour,5",
};

// ShiftReport RunShift(string[] orders) { ... }   (a local function that reuses ReadWeight and Load)
//   per line: parts = order.Split(',');  int kg = ReadWeight(parts[2]);  if (kg < 0) -> rejected, continue
//             Parcel parcel = new(parts[0], parts[1], kg, ParcelStatus.Waiting);
//             try { Load(parcel, 25); } catch (InvalidOperationException ex) { incidents.Add(new Incident("Overweight", ex.Message)); rejected; continue }
//             price: kg switch { < 5 => 2.00m, < 20 => 3.50m, _ => 6.00m }  -> decimal revenue
//             perStop[parcel.Destination] = perStop.GetValueOrDefault(parcel.Destination) + 1;
//   after the loop: busiest destination, then return new ShiftReport(...)
// ShiftReport report = RunShift(orderLines);
// Print:  Delivered: 4 | Rejected: 2 | Revenue: 16.50 | Busiest stop: Library
// Depot.Show: report, incidents

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare the report type here.
//   record ShiftReport(int Delivered, int Rejected, decimal Revenue, string BusiestStop);
`,
      solutionAdd: cs`// Lesson 14: run the whole shift.
string[] orderLines =
{
    "P-201,Library,8",
    "P-202,Harbour,31",
    "P-203,School,x",
    "P-204,Library,14",
    "P-205,Market,22",
    "P-206,Harbour,5",
};

ShiftReport RunShift(string[] orders)
{
    int deliveredCount = 0;
    int rejectedCount = 0;
    decimal revenue = 0m;
    Dictionary<string, int> perStop = new();

    foreach (string order in orders)
    {
        string[] parts = order.Split(',');
        int kg = ReadWeight(parts[2]);
        if (kg < 0)
        {
            rejectedCount++;
            continue;
        }

        Parcel parcel = new(parts[0], parts[1], kg, ParcelStatus.Waiting);
        try
        {
            Load(parcel, 25);
        }
        catch (InvalidOperationException ex)
        {
            incidents.Add(new Incident("Overweight", ex.Message));
            rejectedCount++;
            continue;
        }

        revenue += kg switch
        {
            < 5 => 2.00m,
            < 20 => 3.50m,
            _ => 6.00m,
        };
        deliveredCount++;
        perStop[parcel.Destination] = perStop.GetValueOrDefault(parcel.Destination) + 1;
    }

    string busiest = "none";
    int most = 0;
    foreach (var (stop, count) in perStop)
    {
        if (count > most)
        {
            busiest = stop;
            most = count;
        }
    }

    return new ShiftReport(deliveredCount, rejectedCount, revenue, busiest);
}

ShiftReport report = RunShift(orderLines);
Console.WriteLine($"Delivered: {report.Delivered} | Rejected: {report.Rejected} | Revenue: {report.Revenue:F2} | Busiest stop: {report.BusiestStop}");

Depot.Show("report", report);
Depot.Show("incidents", incidents);

${TYPES_DIVIDER}

// The shift's answer, in one value.
record ShiftReport(int Delivered, int Rejected, decimal Revenue, string BusiestStop);`,
      explanation:
        "RunShift is a pipeline for one order at a time, reusing the pieces from earlier lessons instead of repeating them: ReadWeight rejects a malformed weight (P-203) and logs it, Load refuses an overweight one (P-202, 31 kg) through an exception that is caught per order. The accepted four (P-201, P-204, P-205, P-206) are priced by the switch expression into a decimal, so 3.50 + 3.50 + 6.00 + 3.50 is exactly 16.50. perStop counts deliveries per destination, and a final pass over the dictionary picks Library with two. Returning a ShiftReport record keeps the answer in one well-named value that is easy to print and show.",
      hints: [
        { id: "h1", title: "Shape of RunShift", content: "Declare counters (int deliveredCount, int rejectedCount, decimal revenue, Dictionary<string, int> perStop) before the foreach. In the loop: string[] parts = order.Split(','); int kg = ReadWeight(parts[2]); if (kg < 0) { rejectedCount++; continue; }" },
        { id: "h2", title: "Reuse Load", content: "Parcel parcel = new(parts[0], parts[1], kg, ParcelStatus.Waiting); try { Load(parcel, 25); } catch (InvalidOperationException ex) { incidents.Add(new Incident(\"Overweight\", ex.Message)); rejectedCount++; continue; } Everything after the try only runs for accepted orders." },
        { id: "h3", title: "Price, count, busiest", content: "revenue += kg switch { < 5 => 2.00m, < 20 => 3.50m, _ => 6.00m }; then deliveredCount++ and perStop[parcel.Destination] = perStop.GetValueOrDefault(parcel.Destination) + 1; After the loop: foreach (var (stop, count) in perStop) track the biggest count, then return new ShiftReport(deliveredCount, rejectedCount, revenue, busiest);" },
      ],
      tests: [
        {
          id: "t1",
          description: "the report counts delivered and rejected orders",
          assertionCode: js`
assert(scene.report && typeof scene.report === "object", "Send the report with Depot.Show(\"report\", report); The ShiftReport record needs its public properties.");
assertEqual(scene.report.delivered, 4, "report.delivered (P-201, P-204, P-205 and P-206 are accepted)");
assertEqual(scene.report.rejected, 2, "report.rejected (P-202 is over 25 kg and P-203 has a bad weight)");`,
        },
        {
          id: "t2",
          description: "revenue is summed exactly in a decimal",
          assertionCode: js`assertEqual(scene.report.revenue, 16.5, "report.revenue (8 kg 3.50 + 14 kg 3.50 + 22 kg 6.00 + 5 kg 3.50. Note that 5 kg is NOT 'under 5')");`,
        },
        {
          id: "t3",
          description: "the busiest stop is found from a dictionary of counts",
          assertionCode: js`assertEqual(scene.report.busiestStop, "Library", "report.busiestStop (Library received 2 deliveries, the others 1)");`,
        },
        {
          id: "t4",
          description: "the summary line is printed in the agreed format",
          assertionCode: js`assert(lines.includes("Delivered: 4 | Rejected: 2 | Revenue: 16.50 | Busiest stop: Library"), 'Print exactly: Delivered: 4 | Rejected: 2 | Revenue: 16.50 | Busiest stop: Library (format Revenue with :F2).');`,
        },
        {
          id: "t5",
          description: "rejections are logged with the earlier incidents",
          assertionCode: js`
assertEqual(scene.incidents.length, 4, "incidents (the two from lesson 13 plus two new rejections). Show incidents again after the shift runs");
assertEqual(scene.incidents.slice(2).map((i) => i.kind), ["Overweight", "Bad input"], "the new incidents, in the order the orders were processed (P-202, then P-203)");`,
        },
        {
          id: "t6",
          description: "only accepted orders are loaded",
          assertionCode: js`
for (const id of ["P-201", "P-204", "P-205", "P-206"]) assert(lines.includes(id + " loaded"), id + " should be loaded.");
assert(!lines.includes("P-202 loaded"), "P-202 is 31 kg and must not be loaded.");
assert(!lines.includes("P-203 loaded"), "P-203 has a bad weight and must not be loaded.");`,
        },
      ],
      unlocks: ["cs-shift"],
      checks: [
        {
          prompt: "A crash report ends with `at Program.<Main>$(String[] args) in Program.cs:line 31`. What does `31` tell you?",
          question: {
            type: "choice",
            options: [
              "The line in your own file where the exception passed through your code. A good place to start looking",
              "How many exceptions occurred",
              "The exit code",
              "The number of milliseconds the program ran",
            ],
            answer: 0,
          },
          explanation: "Stack frames that name `Program.cs` are your code, and the number is the line. Start at the first one, read the exception type and message above it, and check the values involved on that line.",
        },
        {
          prompt: "Why does `RunShift` call `ReadWeight` and `Load` instead of copying their code into the loop?",
          question: {
            type: "choice",
            options: [
              "One tested piece of logic is used in two places, so a fix or a rule change happens once",
              "It makes the program run faster",
              "C# forbids long loops",
              "Methods are required for exceptions",
            ],
            answer: 0,
          },
          explanation: "Duplicated code drifts: you fix a bug in one copy and forget the other. Calling the same method keeps the rule in one place, and each piece can be understood and checked on its own.",
        },
        {
          prompt: "Why is the 5 kg parcel priced as Standard (3.50) and not Light (2.00) by `kg switch { < 5 => 2.00m, < 20 => 3.50m, _ => 6.00m }`?",
          question: {
            type: "choice",
            options: [
              "`< 5` does not include 5; the first arm fails and `< 20` matches",
              "Arms are tried from the bottom",
              "5 is treated as negative",
              "Decimals always round up",
            ],
            answer: 0,
          },
          explanation: "Boundaries are where bugs hide. `< 5` means strictly less than 5, so the value 5 falls through to the next arm. If the rule were meant to include 5, the pattern would be `<= 5`.",
        },
      ],
    },
  ],
};
