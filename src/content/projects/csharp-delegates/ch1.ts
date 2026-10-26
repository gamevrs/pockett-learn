import type { Chapter } from "@/engine/types";
import { TYPES_DIVIDER } from "../../../engine/compose.ts";
import { cs, js, md } from "./util.ts";

const DESK_HELPER = cs`// Provided by pockett: sends one value to the live show board beside your editor.
// You will call Desk.Show("name", value) from lesson 1 on. Leave this class as it is.
static class Desk
{
    static readonly System.Text.Json.JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase,
        NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowNamedFloatingPointLiterals,
        Converters = { new System.Text.Json.Serialization.JsonStringEnumConverter() },
    };

    public static void Show(string key, object? value)
    {
        var message = new Dictionary<string, object?> { [key] = value };
        Console.WriteLine("@scene " + System.Text.Json.JsonSerializer.Serialize(message, Options));
    }
}`;

export const chapter1: Chapter = {
  id: "delegates-and-lambdas",
  title: "Delegates and lambdas",
  blurb: "Treat behaviour as a value: pass it, store it, close over it and combine it.",
  lessons: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "csharp-delegates-1-cues",
      title: "Cues are values",
      minutes: 35,
      xp: 160,
      concepts: ["delegate types", "method groups", "Func", "Action", "Predicate", "invoking delegates", "null delegates", "delegate equality"],
      learn: md`### Behaviour you can hold in your hand

Everything you passed to a method in the Beginner course was *data*: numbers, strings, lists. A **delegate** lets you pass a *method* instead. You keep it in a variable, put it in a list, return it from another method, and call it later, possibly from a place that has no idea what it will do.

That sounds abstract until you look at a theatre. A lighting cue is "do this when the stage manager says go". The desk does not care whether *this* dims the house, starts a sound effect or flies a backdrop; it only needs a sheet of named things it can fire. In C# that sheet is a collection of delegates.

### What a delegate type is

A delegate **type** describes a shape: which parameters go in, what comes out. It says nothing about a method's name or which class it lives in.

~~~csharp
delegate string CueLabeler(int number);
~~~

It reads like a method signature with the keyword \`delegate\` in front and no body. It declares a *type*, so it belongs below the divider with the other type declarations. Behind the scenes the compiler writes a small sealed class for you with an \`Invoke(int)\` method of exactly that shape. A variable of type \`CueLabeler\` holds a reference to an object of that class, and that object remembers two things: *which method to run* and, for instance methods or lambdas that capture variables, *which object to run it on*.

### Giving a delegate a method

~~~csharp
string Slate(int number)
{
    return $"CUE {number:000}";
}

CueLabeler labeler = Slate;       // no parentheses: you are naming the method, not calling it
Console.WriteLine(labeler(7));    // CUE 007
~~~

\`Slate\` without parentheses is a **method group**: the name of a method (possibly with several overloads). C# converts a method group to a delegate when one of the methods matches the delegate's shape. Only the *types* have to match; parameter names, the method's own name and where it lives do not matter. \`labeler(7)\` is shorthand for \`labeler.Invoke(7)\`.

When the shape does not match, the compiler tells you exactly which half is wrong:

~~~text
Program.cs(5,16): error CS0407: 'int WrongType(int)' has the wrong return type
Program.cs(10,16): error CS0123: No overload for 'TwoArgs' matches delegate 'CueLabeler'
~~~

### Func, Action and Predicate

Declaring a delegate type for every shape would bury you in boilerplate, so the library ships generic ones that cover almost everything:

- \`Action\`, \`Action<string>\`, \`Action<int, int>\`: take parameters, return nothing.
- \`Func<int, bool>\`, \`Func<string>\`, \`Func<int, int, double>\`: the **last** type argument is the return type, everything before it is a parameter.
- \`Predicate<T>\`: one parameter, returns \`bool\`. It is an older type that predates \`Func\`; you meet it in APIs such as \`List<T>.FindAll\`.

Here is the part that surprises people: delegate types are matched by **type**, not by shape. A \`Func<int, bool>\` and a \`Predicate<int>\` have identical signatures and are still different types:

~~~csharp
Func<int, bool> f = x => x > 1;
Predicate<int> p = f;
// error CS0029: Cannot implicitly convert type 'System.Func<int, bool>' to 'System.Predicate<int>'
~~~

When is it worth declaring your own? When the *name* carries meaning (\`CueLabeler\` tells a reader more than \`Func<int, string>\`), when you need \`ref\`/\`out\`/\`in\` parameters, or when a type will appear in many signatures and you want one place to change. Otherwise use \`Func\` and \`Action\`. In chapter 5 you will declare generic delegates such as \`Operation<T>\` of your own.

### Delegates stored, returned and passed

Because a delegate is an ordinary value, the collections you know work with it. A cue sheet is a dictionary from a cue name to the action that performs it:

~~~csharp
Dictionary<string, Action> cueSheet = new()
{
    ["house-down"] = HouseLightsDown,
    ["curtain-up"] = CurtainUp,
};

foreach (var (cueName, cueAction) in cueSheet)
{
    Console.WriteLine($"Firing {cueName}");
    cueAction();                  // invoke whatever is stored
}
~~~

The loop never mentions \`HouseLightsDown\`. You can add a cue to the dictionary without touching the loop, and that is the whole point: **the code that decides what happens is separated from the code that decides when**.

### A delegate variable can be null

A delegate is a reference type, so an unassigned or cleared one is \`null\`, and invoking it throws:

~~~text
Unhandled exception. System.NullReferenceException: Object reference not set to an instance of an object.
   at Program.<Main>$(String[] args) in Program.cs:line 29
~~~

Declare optional delegates as nullable (\`Action<string>? go = null;\`) so the compiler warns you before the crash, and call them with \`go?.Invoke("Act 1")\`, which does nothing when there is no delegate.

### Two delegates, one meaning

Delegates are immutable. Two delegate objects compare equal with \`==\` when they point at the same method on the same target, even though they are different objects:

~~~csharp
Action<string> a = Hello;
Action<string> b = Hello;
Console.WriteLine(a == b);                    // True
Console.WriteLine(ReferenceEquals(a, b));     // False
~~~

That equality rule matters in lesson 4, when you remove a handler from a list of handlers.

### Common mistakes

- **Calling instead of naming.** \`CueLabeler labeler = Slate();\` calls \`Slate\` right now. The compiler complains about the missing argument: \`error CS7036: There is no argument given that corresponds to the required parameter 'number' of 'Slate(int)'\`.
- **Forgetting the target is a delegate.** \`string s = HouseLightsDown;\` fails with \`error CS0428: Cannot convert method group 'HouseLightsDown' to non-delegate type 'string'. Did you intend to invoke the method?\`
- **Putting the delegate declaration above your statements.** Top-level statements must come first: \`error CS8803: Top-level statements must precede namespace and type declarations.\` Declare it below the divider.
- **Assuming Func and Predicate mix.** See \`CS0029\` above. Pick one type and stay with it.
- **Printing a delegate.** \`Console.WriteLine(labeler)\` prints the type name, not the result. Invoke it: \`labeler(7)\`.`,
      mission: md`Lantern Hall opens tonight with *The Lantern Maker*, and stage manager Odile Marsh has just handed you the old paper cue sheet. Every line on it is the same sort of thing: a name, and something that must happen when she calls it. The old desk hard-wired each cue into one giant routine; adding a cue meant editing that routine at the worst possible moment.

Your first job is to turn cues into values. Give the desk a cue sheet it can fire by name, a labeller that stamps cue numbers, and a pair of tests that decide whether a light level counts as bright or dim. When the lesson passes, the **Console** and the **Cue sheet** power on: the console shows everything you print, and the cue sheet lists the cues your delegates fire.`,
      tasks: [
        "Below the divider declare delegate string CueLabeler(int number). Above it write a local function Slate(int number) returning $\"CUE {number:000}\", assign it with CueLabeler labeler = Slate;, then print labeler(7) and the line labeler is a CueLabeler (use labeler.GetType().Name in an interpolated string)",
        "Write local functions bool IsBright(int level) (true from 70 up) and bool IsDim(int level) (true below 30). Store them as Func<int, bool> brightTest and Predicate<int> dimTest, then print 85 bright? True and 20 dim? True by calling the delegates",
        "Write three Action-shaped local functions: HouseLightsDown prints \"  house lights fade down\", CurtainUp prints \"  curtain rises\" and SpotOn prints \"  follow-spot finds the lead\" (two leading spaces each)",
        "Build Dictionary<string, Action> cueSheet with the keys \"house-down\", \"curtain-up\" and \"spot-on\" (in that order) mapped to those three methods. Loop over it with foreach (var (cueName, cueAction) in cueSheet): print Firing <cueName>, then invoke cueAction()",
        "Send four values to the board: Desk.Show(\"cueLabel\", labeler(7)), Desk.Show(\"labelerType\", labeler.GetType().Name), Desk.Show(\"cueSheet\", cueSheet.Keys) and Desk.Show(\"brightness\", new { bright = brightTest(85), dim = dimTest(20) })",
      ],
      starterAdd: cs`// Namespaces beyond the defaults, ready for the later chapters.
// (using lines must come first in the file, which is why they sit here.)
using System.Diagnostics;
using System.Threading.Channels;

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 1: cues are values. Add your code below, in this order.
// 1. Declare the delegate type under the divider:  delegate string CueLabeler(int number);
//    Then here: string Slate(int number) { ... return $"CUE {number:000}"; }
//    CueLabeler labeler = Slate;   Print labeler(7) and "labeler is a CueLabeler" (GetType().Name).
// 2. bool IsBright(int level) (>= 70) and bool IsDim(int level) (< 30).
//    Func<int, bool> brightTest = IsBright;   Predicate<int> dimTest = IsDim;
//    Print  85 bright? True  and  20 dim? True
// 3. Three void local functions HouseLightsDown, CurtainUp, SpotOn that print
//    "  house lights fade down", "  curtain rises", "  follow-spot finds the lead".
// 4. Dictionary<string, Action> cueSheet with "house-down", "curtain-up", "spot-on".
//    foreach (var (cueName, cueAction) in cueSheet) { print "Firing <cueName>", then cueAction(); }
// 5. Desk.Show("cueLabel", ...), Desk.Show("labelerType", ...), Desk.Show("cueSheet", cueSheet.Keys),
//    Desk.Show("brightness", new { bright = ..., dim = ... });
// This first line is a placeholder so the file builds. Replace it with your own code.
Console.WriteLine("TODO: build the cue sheet");

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare the CueLabeler delegate type here.

${DESK_HELPER}`,
      solutionAdd: cs`// Namespaces beyond the defaults, ready for the later chapters.
using System.Diagnostics;
using System.Threading.Channels;

// Lesson 1: cues are values.
string Slate(int number)
{
    return $"CUE {number:000}";
}

CueLabeler labeler = Slate;
Console.WriteLine(labeler(7));
Console.WriteLine($"labeler is a {labeler.GetType().Name}");

bool IsBright(int level)
{
    return level >= 70;
}

bool IsDim(int level)
{
    return level < 30;
}

Func<int, bool> brightTest = IsBright;
Predicate<int> dimTest = IsDim;
Console.WriteLine($"85 bright? {brightTest(85)}");
Console.WriteLine($"20 dim? {dimTest(20)}");

void HouseLightsDown()
{
    Console.WriteLine("  house lights fade down");
}

void CurtainUp()
{
    Console.WriteLine("  curtain rises");
}

void SpotOn()
{
    Console.WriteLine("  follow-spot finds the lead");
}

Dictionary<string, Action> cueSheet = new()
{
    ["house-down"] = HouseLightsDown,
    ["curtain-up"] = CurtainUp,
    ["spot-on"] = SpotOn,
};

foreach (var (cueName, cueAction) in cueSheet)
{
    Console.WriteLine($"Firing {cueName}");
    cueAction();
}

Desk.Show("cueLabel", labeler(7));
Desk.Show("labelerType", labeler.GetType().Name);
Desk.Show("cueSheet", cueSheet.Keys);
Desk.Show("brightness", new { bright = brightTest(85), dim = dimTest(20) });

${TYPES_DIVIDER}

delegate string CueLabeler(int number);

${DESK_HELPER}`,
      explanation:
        "CueLabeler is a delegate type: a name for the shape 'int in, string out'. Assigning the method group Slate to it creates a delegate object that remembers Slate, and labeler(7) invokes it, so the type's name shows up through GetType().Name. Func<int, bool> and Predicate<int> are two library delegate types with the same shape, which is why each needs its own variable and its own conversion from IsBright and IsDim. Because delegates are ordinary values, the three cue methods can sit in a Dictionary<string, Action>, and the foreach loop fires whatever is stored without ever naming the methods. The delegate type declaration lives under the divider because top-level statements must precede type declarations.",
      hints: [
        { id: "h1", title: "Two places", content: "The delegate type is a type declaration, so it goes under the divider line: delegate string CueLabeler(int number); Everything else (Slate, IsBright, the dictionary, the loop and the Desk.Show calls) is a statement and goes above the divider, replacing the placeholder line." },
        { id: "h2", title: "Naming a method", content: "Assign a method without parentheses: CueLabeler labeler = Slate; Func<int, bool> brightTest = IsBright; Predicate<int> dimTest = IsDim; Calling them looks like calling a method: labeler(7), brightTest(85). For the type name use labeler.GetType().Name inside $\"...{...}...\"." },
        { id: "h3", title: "The cue sheet", content: "Dictionary<string, Action> cueSheet = new() { [\"house-down\"] = HouseLightsDown, [\"curtain-up\"] = CurtainUp, [\"spot-on\"] = SpotOn }; Then foreach (var (cueName, cueAction) in cueSheet) { Console.WriteLine($\"Firing {cueName}\"); cueAction(); } and finally Desk.Show(\"cueSheet\", cueSheet.Keys);" },
      ],
      tests: [
        {
          id: "t1",
          description: "a custom delegate type labels cue numbers",
          assertionCode: js`
assert(lines.includes("CUE 007"), 'No line is exactly "CUE 007". Write Slate(int number) returning $"CUE {number:000}", put it in a CueLabeler variable and print labeler(7).');
assert(lines.includes("labeler is a CueLabeler"), 'No line is exactly "labeler is a CueLabeler". Declare delegate string CueLabeler(int number); under the divider, make the variable that type and print $"labeler is a {labeler.GetType().Name}".');`,
        },
        {
          id: "t2",
          description: "Func and Predicate delegates answer the bright and dim questions",
          assertionCode: js`
assert(lines.includes("85 bright? True"), 'No line is exactly "85 bright? True". Call the Func<int, bool> delegate: $"85 bright? {brightTest(85)}".');
assert(lines.includes("20 dim? True"), 'No line is exactly "20 dim? True". Call the Predicate<int> delegate: $"20 dim? {dimTest(20)}".');`,
        },
        {
          id: "t3",
          description: "the cue sheet fires each action right after its Firing line",
          assertionCode: js`
const want = ["Firing house-down", "  house lights fade down", "Firing curtain-up", "  curtain rises", "Firing spot-on", "  follow-spot finds the lead"];
const at = want.map((w) => lines.indexOf(w));
const missing = want.filter((w, i) => at[i] < 0);
assert(missing.length === 0, "These lines were not printed exactly (watch the two leading spaces on action lines): " + missing.join(" | "));
assert(at.every((v, i) => i === 0 || v === at[i - 1] + 1), "The six lines should come out one after another: each Firing line, then the action's own line, for house-down, curtain-up, spot-on in that order.");`,
        },
        {
          id: "t4",
          description: "the board receives the label, the type name and the cue names in order",
          assertionCode: js`
assertEqual(scene.cueLabel, "CUE 007", 'Desk.Show("cueLabel", labeler(7))');
assertEqual(scene.labelerType, "CueLabeler", 'Desk.Show("labelerType", labeler.GetType().Name)');
assertEqual(scene.cueSheet, ["house-down", "curtain-up", "spot-on"], 'Desk.Show("cueSheet", cueSheet.Keys). The keys, in the order you added them');`,
        },
        {
          id: "t5",
          description: "the brightness verdicts are sent to the board",
          assertionCode: js`
assert(scene.brightness && typeof scene.brightness === "object", 'Send Desk.Show("brightness", new { bright = brightTest(85), dim = dimTest(20) });');
assertEqual(scene.brightness.bright, true, "brightness.bright (is 85 bright?)");
assertEqual(scene.brightness.dim, true, "brightness.dim (is 20 dim?)");`,
        },
      ],
      unlocks: ["fl-console", "fl-cues"],
      checks: [
        {
          prompt: "In `CueLabeler labeler = Slate;` what is `Slate` (written without parentheses)?",
          question: {
            type: "choice",
            options: [
              "A method group, which C# converts into a delegate that remembers the method",
              "The string that Slate returns",
              "A copy of Slate's source code",
              "A call that is postponed until the end of the program",
            ],
            answer: 0,
          },
          explanation: "Without parentheses the name refers to the method itself, not to a call. C# converts that method group to the delegate type if one of the methods has the right shape. Writing `Slate()` would call the method immediately and try to store its result.",
        },
        {
          prompt: "`Func<int, bool> f` and `Predicate<int> p` have the same parameters and return type. Why does `p = f;` not compile?",
          question: {
            type: "choice",
            options: [
              "Delegate types are different types even when their shapes match, so there is no implicit conversion between them",
              "Predicate can only hold lambdas, never variables",
              "Func cannot return bool",
              "Predicate<int> needs two parameters",
            ],
            answer: 0,
          },
          explanation: "A delegate type is matched by its identity, not just its signature. You can point both variables at the same method (`IsBright`), but a `Func` value is not a `Predicate` value. The compiler reports CS0029.",
        },
        {
          prompt: "What happens at run time if you invoke a delegate variable that currently holds `null`?",
          question: {
            type: "choice",
            options: [
              "A NullReferenceException is thrown",
              "Nothing, the call is silently skipped",
              "It returns the default value of the return type",
              "The program does not compile",
            ],
            answer: 0,
          },
          explanation: "A delegate is a reference type, so `null` means there is no object to invoke. Use `handler?.Invoke(...)` when a delegate is optional: the call is skipped only because you asked for it with `?.`.",
        },
      ],
    },
    // ───────────────────────── 2 ─────────────────────────
    {
      id: "csharp-delegates-2-lambdas",
      title: "Lambdas and closures",
      minutes: 40,
      xp: 190,
      concepts: ["lambda expressions", "expression and statement lambdas", "natural types", "closures", "captured variables", "loop-capture trap", "variable scope"],
      learn: md`### The one-line method

In lesson 1 every delegate needed a named method first. For a one-liner such as "half of this level" that is a lot of ceremony. A **lambda expression** is a method written in place, without a name, using the arrow \`=>\` (read it as "goes to"):

~~~csharp
Func<int, int> halve = level => level / 2;
Func<int, int, int> blend = (a, b) => (a + b) / 2;
Func<int> constant = () => 42;
Console.WriteLine(halve(80));       // 40
~~~

The left side is the parameter list, the right side is the body. The shapes you will meet:

- \`level => level / 2\`: one parameter, no parentheses needed, and the body is an **expression** whose value is returned.
- \`(a, b) => ...\` and \`() => ...\`: parentheses are required for zero or several parameters.
- \`(int a, int b) => ...\`: you may spell out the types when you want to or when the compiler cannot guess them.
- \`(_, _) => 0\`: discards, for parameters you must accept but never read.
- \`x => { ...; return y; }\`: a **statement lambda**, with braces and an explicit \`return\`, for bodies that need several steps.

A lambda has no type of its own on the left of an assignment: it takes the type of the delegate it is converted to. Since C# 10 it can also work out a type by itself when the parameter types are written out, so \`var run = (int x) => x * 2;\` is a \`Func<int, int>\`. Without the types the compiler has nothing to go on:

~~~text
Program.cs(13,9): error CS8917: The delegate type could not be inferred.
~~~

### What the compiler really does

The compiler turns every lambda into an ordinary method and gives you a delegate that points at it. If the lambda uses nothing from the code around it, that is the whole story. If it does, the compiler has to find a home for those outside variables, and that is the subject of the rest of this lesson.

### Closures: capturing variables, not values

~~~csharp
int master = 100;
Func<int, int> throughMaster = level => level * master / 100;

Console.WriteLine(throughMaster(60));   // 60
master = 50;
Console.WriteLine(throughMaster(60));   // 30
~~~

The lambda uses \`master\`, which belongs to the surrounding code. The lambda does not copy the number 100; it keeps hold of the **variable**. The compiler moves \`master\` into a hidden object (a *closure*), and both the surrounding code and the lambda read and write the same box. Change the variable and the lambda sees the change. That is the single most important sentence in this lesson: **a lambda captures variables, not values**.

Closures also let a function outlive the call that made it:

~~~csharp
Func<int> Counter()
{
    int n = 0;
    return () => ++n;
}

var a = Counter();
var b = Counter();
Console.WriteLine($"{a()} {a()} {b()}");   // 1 2 1
~~~

Each call to \`Counter\` creates a fresh \`n\`. The method has long since returned, yet \`n\` lives on inside each delegate, and the two counters never interfere. This is how you build small pieces of private state without declaring a class. The price: anything a lambda captures stays alive as long as the delegate does, which becomes important when a long-lived object holds on to delegates (lesson 5).

### The loop-capture trap

A \`for\` loop declares its counter **once**, before the first pass. Every lambda created in the body therefore captures the same variable:

~~~csharp
List<Func<int>> broken = new();
for (int i = 1; i <= 3; i++)
{
    broken.Add(() => i * 10);
}
// later, after the loop has finished and i is 4:
Console.WriteLine(string.Join(", ", broken.Select(f => f())));   // 40, 40, 40
~~~

Nothing runs the lambdas until the loop is over, and by then \`i\` is 4. The cure is to give each pass its own variable, by declaring one **inside** the body:

~~~csharp
for (int i = 1; i <= 3; i++)
{
    int slot = i;                       // a new variable on every pass
    fixedOnes.Add(() => slot * 10);     // 10, 20, 30
}
~~~

Two details worth knowing. A \`foreach\` loop already declares a fresh loop variable on every pass, so \`foreach (int n in new[] { 1, 2, 3 }) list.Add(() => n * 10);\` is safe and yields 10, 20, 30. A \`while\` loop that mutates an outer variable (\`while (w <= 3) { list.Add(() => w * 10); w++; }\`) is as broken as the \`for\` loop and gives 40, 40, 40. The rule is not about loop keywords; it is about **where the variable was declared**.

### Limits and scope rules

- A lambda cannot capture \`ref\`, \`out\` or \`in\` parameters of the method around it, because the lambda may run after that method has returned: \`error CS1628: Cannot use ref, out, or in parameter 'level' inside an anonymous method, lambda expression, query expression, or local function\`.
- Captured variables must be definitely assigned before the lambda is *created*: \`error CS0165: Use of unassigned local variable 'total'\`.
- A lambda's own parameter may reuse a name from outside; the inner name simply hides the outer one (\`int level = 1; Func<int,int> f = level => level * 2;\` compiles). Declaring a local with the same name as something in an **enclosing** scope is different. All your top-level variables share one scope, and a name used inside a loop body conflicts with a same-named variable declared anywhere in the enclosing scope, even later in the file: \`error CS0136: A local or parameter named 'slot' cannot be declared in this scope because that name is used in an enclosing local scope to define a local or parameter\`. Keep an eye on this as the file grows; pick distinctive names.

### Common mistakes

- Expecting a lambda to remember the *value* a variable had when it was created.
- Creating lambdas in a \`for\` loop and calling them after the loop without copying the counter.
- Writing \`var f = x => x + 1;\` and getting CS8917. Give the delegate type (\`Func<int, int> f = ...\`) or the parameter type.
- A lambda with a statement body that forgets a path: \`error CS1643: Not all code paths return a value in lambda expression of type 'Func<int, int>'\`.
- Calling a delegate with the wrong number of arguments: \`error CS1593: Delegate 'Func<int, int>' does not take 2 arguments\`.
- Using an expression that is not a statement as an \`Action\` body: \`Action a = () => 5 + 1;\` gives \`error CS0201: Only assignment, call, increment, decrement, await, and new object expressions can be used as a statement\`.`,
      mission: md`Wen, the fly crew lead, has a complaint about the old desk: you drag the master fader to half and one of the faders stays stuck where it was, while another jumps to the wrong channel altogether. Odile traced it to code that built the faders in a loop and every fader ended up reading the same variable.

Rebuild the fader bank properly. You will write your first lambdas, watch a lambda follow a changing master level, and then reproduce the loop bug on purpose and fix it. When the lesson passes, the **Fader bank** powers on: it draws the levels your code computed, with the broken ones beside the fixed ones.`,
      tasks: [
        "Write Func<int, int> halve = level => level / 2; and Func<int, int, int> blend = (a, b) => (a + b) / 2; and print halve(80) = 40, blend(20, 60) = 40 using both delegates inside one interpolated string",
        "Declare int master = 100; and Func<int, int> throughMaster = level => level * master / 100;. Print master 100: 60 -> 60, then set master = 50 and print master 50: 60 -> 30 (the lambda must read the variable, not a copy)",
        "Build List<Func<int>> brokenFaders with a plain for loop (i from 1 to 3) whose lambda captures i directly: () => i * 10. Build List<Func<int>> faders the same way but copy the counter into a variable declared inside the loop body first",
        "Make int[] brokenLevels and int[] levels by invoking every fader (fader => fader() inside Select). Print shared loop variable: 40, 40, 40 and copy per pass: 10, 20, 30 (string.Join(\", \", ...) does the commas)",
        "Send the result to the board: Desk.Show(\"faders\", new { master, levels, brokenLevels });",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 2: lambdas and closures. Add your code below, in this order.
// 1. Func<int, int> halve = level => level / 2;     Func<int, int, int> blend = (a, b) => (a + b) / 2;
//    Print:  halve(80) = 40, blend(20, 60) = 40
// 2. int master = 100;  Func<int, int> throughMaster = level => level * master / 100;
//    Print "master 100: 60 -> 60", then master = 50; and print "master 50: 60 -> 30".
// 3. List<Func<int>> brokenFaders: a for loop (i = 1..3) adding  () => i * 10
//    List<Func<int>> faders: the same loop, but copy i into a local first (int slot = i;) and capture slot.
// 4. int[] brokenLevels = brokenFaders.Select(fader => fader()).ToArray();   int[] levels = ... for faders
//    Print:  shared loop variable: 40, 40, 40     and     copy per pass: 10, 20, 30
// 5. Desk.Show("faders", new { master, levels, brokenLevels });`,
      solutionAdd: cs`// Lesson 2: lambdas and closures.
Func<int, int> halve = level => level / 2;
Func<int, int, int> blend = (a, b) => (a + b) / 2;
Console.WriteLine($"halve(80) = {halve(80)}, blend(20, 60) = {blend(20, 60)}");

int master = 100;
Func<int, int> throughMaster = level => level * master / 100;
Console.WriteLine($"master {master}: 60 -> {throughMaster(60)}");
master = 50;
Console.WriteLine($"master {master}: 60 -> {throughMaster(60)}");

List<Func<int>> brokenFaders = new();
for (int i = 1; i <= 3; i++)
{
    brokenFaders.Add(() => i * 10);
}

List<Func<int>> faders = new();
for (int i = 1; i <= 3; i++)
{
    int slot = i;
    faders.Add(() => slot * 10);
}

int[] brokenLevels = brokenFaders.Select(fader => fader()).ToArray();
int[] levels = faders.Select(fader => fader()).ToArray();
Console.WriteLine("shared loop variable: " + string.Join(", ", brokenLevels));
Console.WriteLine("copy per pass:        " + string.Join(", ", levels));

Desk.Show("faders", new { master, levels, brokenLevels });`,
      explanation:
        "halve and blend are lambdas converted to Func delegates, so they are invoked like methods. throughMaster refers to master, which is captured as a variable in a hidden closure object: after master changes to 50 the same lambda computes 60 * 50 / 100 = 30. In the for loop the counter i is declared once, so every lambda in brokenFaders reads the same variable, and by the time they run (after the loop) it is 4, giving 40, 40, 40. Copying i into slot inside the body creates a new variable per pass, each captured by exactly one lambda, giving 10, 20, 30. Reading the faders into arrays and sending them to the board shows both results side by side.",
      hints: [
        { id: "h1", title: "Lambda shapes", content: "One parameter: level => level / 2. Two parameters need parentheses: (a, b) => (a + b) / 2. Put each lambda in a variable whose type is a Func: the last type argument of Func is the return type." },
        { id: "h2", title: "Same variable, new variable", content: "In brokenFaders.Add(() => i * 10) the lambda uses the loop counter itself. For faders, declare int slot = i; as the first line inside the loop body and use slot in the lambda. The names brokenFaders, faders, brokenLevels and levels are the ones the board expects." },
        { id: "h3", title: "Reading the faders", content: "int[] brokenLevels = brokenFaders.Select(fader => fader()).ToArray(); int[] levels = faders.Select(fader => fader()).ToArray(); Console.WriteLine(\"shared loop variable: \" + string.Join(\", \", brokenLevels)); Remember master = 50; must come after the first print and before the second." },
      ],
      tests: [
        {
          id: "t1",
          description: "two lambdas are invoked through Func delegates",
          assertionCode: js`assert(lines.includes("halve(80) = 40, blend(20, 60) = 40"), 'No line is exactly "halve(80) = 40, blend(20, 60) = 40". Build $"halve(80) = {halve(80)}, blend(20, 60) = {blend(20, 60)}" from two lambdas stored in Func variables.');`,
        },
        {
          id: "t2",
          description: "the lambda follows the variable it captured",
          assertionCode: js`
const a = lines.indexOf("master 100: 60 -> 60");
const b = lines.indexOf("master 50: 60 -> 30");
assert(a >= 0, 'No line is exactly "master 100: 60 -> 60". Print $"master {master}: 60 -> {throughMaster(60)}" while master is 100.');
assert(b >= 0, 'No line is exactly "master 50: 60 -> 30". After master = 50; call the SAME lambda again: it captured the variable, so it now computes 60 * 50 / 100.');
assert(b > a, "Print the master 100 line first, then change master and print the master 50 line.");`,
        },
        {
          id: "t3",
          description: "the shared loop variable and the per-pass copy give different levels",
          assertionCode: js`
const squash = (s) => s.replace(/\s+/g, " ").trim();
const seen = lines.map(squash);
assert(seen.includes("shared loop variable: 40, 40, 40"), 'No line says "shared loop variable: 40, 40, 40". Capture the for-loop counter directly (() => i * 10) and invoke the lambdas after the loop has finished.');
assert(seen.includes("copy per pass: 10, 20, 30"), 'No line says "copy per pass: 10, 20, 30". Declare int slot = i; inside the loop body and capture slot.');`,
        },
        {
          id: "t4",
          description: "the board receives the master level and both sets of fader levels",
          assertionCode: js`
assert(scene.faders && typeof scene.faders === "object", 'Send Desk.Show("faders", new { master, levels, brokenLevels });');
assertEqual(scene.faders.master, 50, "faders.master (the variable's final value)");
assertEqual(scene.faders.levels, [10, 20, 30], "faders.levels (the fixed faders)");
assertEqual(scene.faders.brokenLevels, [40, 40, 40], "faders.brokenLevels (the faders that shared the loop variable)");`,
        },
      ],
      unlocks: ["fl-faders"],
      checks: [
        {
          prompt: "What does this print?\n\n~~~csharp\nint bonus = 5;\nFunc<int, int> add = x => x + bonus;\nbonus = 20;\nConsole.WriteLine(add(1));\n~~~",
          question: { type: "number", answer: 21 },
          explanation: "The lambda captured the variable `bonus`, not the number 5 it held at the time. By the time `add(1)` runs, `bonus` is 20, so the result is 1 + 20 = 21.",
        },
        {
          prompt: "Three lambdas are created inside `for (int i = 1; i <= 3; i++)` and each one returns `i * 10`. After the loop they are called. Why do they all return 40?",
          question: {
            type: "choice",
            options: [
              "The loop declares one variable i that all three lambdas share, and it is 4 when the loop ends",
              "Lambdas always use the last value assigned in the program",
              "The compiler multiplies by 4 because there are three lambdas plus one",
              "Lambdas inside loops are executed immediately, before i changes",
            ],
            answer: 0,
          },
          explanation: "A `for` loop declares its counter once. Every closure created in the body points at that single variable, and the loop leaves it at 4 (the first value that fails `i <= 3`). Declaring `int slot = i;` inside the body gives each pass its own variable.",
        },
        {
          prompt: "Which loop gives every lambda its own copy of the loop variable without any extra local variable?",
          question: {
            type: "choice",
            options: [
              "`foreach (int n in values)`",
              "`for (int i = 0; i < 3; i++)`",
              "`while (w <= 3) { ...; w++; }`",
              "None of them: all loops share their variable",
            ],
            answer: 0,
          },
          explanation: "Since C# 5 a `foreach` declares a new iteration variable on every pass, so each closure captures a different variable. `for` and `while` reuse the one you declared before the loop.",
        },
      ],
    },
    // ───────────────────────── 3 ─────────────────────────
    {
      id: "csharp-delegates-3-chain",
      title: "Compose behaviour",
      minutes: 40,
      xp: 200,
      concepts: ["higher-order functions", "function factories", "composition", "pipelines of delegates", "strategy pattern", "delegate or interface", "interface method to delegate"],
      learn: md`### Functions that take and return functions

A **higher-order function** is one that accepts a function as a parameter, returns one, or both. You have been calling them since LINQ: \`Where\` takes a test, \`Select\` takes a transformation. The reason they exist is a division of labour. The machinery (loop, order, bookkeeping) is written once; the *decision* (which items, what to compute) arrives from outside as a delegate.

### Taking a function: the strategy pattern

Suppose a lighting fade needs a curve: linear, slow-then-fast, stepped. The classic way is a flag and a \`switch\` inside the fade code, and every new curve means editing that method. With a delegate parameter the fade never changes:

~~~csharp
double Fade(double fromLevel, double toLevel, double t, Func<double, double> curve)
{
    return fromLevel + (toLevel - fromLevel) * curve(t);
}

Func<double, double> linear = t => t;
Func<double, double> easeIn = t => t * t;

Console.WriteLine(Fade(0, 100, 0.5, linear));   // 50
Console.WriteLine(Fade(0, 100, 0.5, easeIn));   // 25
~~~

Each curve is a **strategy**: an interchangeable way of doing one step. \`curve\` receives how far through the fade we are (0 to 1) and returns how much of the distance has been covered.

### Returning a function: the factory

A method can also *build* a function. The parameters of the factory become captured variables of the lambda it returns (lesson 2):

~~~csharp
Func<int, int> Gain(int percent)
{
    return level => level * percent / 100;
}

Func<int, int> boost = Gain(150);
Func<int, int> hush = Gain(50);
Console.WriteLine($"{boost(40)} {hush(40)}");   // 60 20
~~~

Every call to \`Gain\` creates a new closure with its own \`percent\`. \`boost\` and \`hush\` share nothing but their code.

### Composition: many small steps, one function

The payoff comes when the pieces have the **same shape**. Sound operator Tobias wants a microphone chain: boost the signal, gate out the hiss, limit the peaks. Each stage is a \`Func<int, int>\` (level in, level out), so a chain of them is just a list, and *the chain itself* is another \`Func<int, int>\`:

~~~csharp
Func<int, int> Gate(int floor)
{
    return level => level < floor ? 0 : level;
}

Func<int, int> Limit(int ceiling)
{
    return level => Math.Min(level, ceiling);
}

Func<int, int> Compose(params Func<int, int>[] chain)
{
    return level =>
    {
        foreach (Func<int, int> stage in chain)
        {
            level = stage(level);      // the output of one stage feeds the next
        }
        return level;
    };
}

Func<int, int>[] stages = { Gain(150), Gate(20), Limit(90) };
Func<int, int> micChain = Compose(stages);
Console.WriteLine(micChain(80));       // 80 -> 120 -> 120 -> 90
~~~

Notice what did not happen: no stage knows about any other, \`Compose\` knows nothing about gain or limiting, and the result has the same type as its parts, so it can be composed again or passed anywhere a stage is expected. That property (the output has the same shape as the input) is what makes composition scale.

**Order is part of the meaning.** \`Compose(Gain(150), Limit(90))(80)\` is 90: boost to 120, then cap. Swap them and \`Compose(Limit(90), Gain(150))(80)\` is 120: cap 80 (no change), then boost past the ceiling. A limiter that comes before the gain limits nothing.

Keep the stage names in a parallel array (\`string[] stageNames\`). A delegate has no friendly name you can print, and as soon as you want to *show* the chain on a screen or log it, the names have to be data too.

### Delegate or interface?

Before delegates, a strategy was an interface plus one class per variant. That still has its place. A rough rule:

- **Delegate**: one operation, a signature that says everything, behaviour that is easy to write inline. Cheap to create, great for callbacks and small pluggable steps.
- **Interface**: several related members, or the thing needs a name, a description, configuration or identity, or other code needs to find it by type. A curve that must also report its \`Name\` is an interface, because a bare delegate has nowhere to put the name.

~~~csharp
interface ICurve
{
    string Name { get; }
    double At(double t);
}
~~~

The two worlds convert in both directions. An interface method becomes a delegate when you name it without parentheses, and the delegate remembers the object it belongs to:

~~~csharp
ICurve stepped = new SteppedCurve(3);
Func<double, double> steppedAsFunc = stepped.At;
Console.WriteLine(Fade(0, 100, 0.5, steppedAsFunc));
~~~

And a small class can wrap a delegate to satisfy an interface. You pick whichever suits the caller. Lesson 17 returns to this choice when wiring components together.

### Common mistakes

- **Passing the factory instead of its result.** \`Compose(Gain, Gain)\` hands over the *method* \`Gain\`, which returns a function rather than being one: \`error CS0407: 'Func<int, int> Gain(int)' has the wrong return type\`. You wanted \`Compose(Gain(150), Gain(50))\`.
- **Passing a delegate of the wrong shape.** A \`Func<string, int>\` cannot sit in a chain of \`Func<int, int>\`: \`error CS1503: Argument 1: cannot convert from 'System.Func<string, int>' to 'System.Func<int, int>'\`. The same message appears if you pass a plain value where a function is expected, such as \`Fade(0, 100, 0.5, 2)\`.
- **Returning the wrong type from a curve.** \`t => "x"\` gives \`error CS0029: Cannot implicitly convert type 'string' to 'double'\` followed by \`error CS1662: Cannot convert lambda expression to intended delegate type because some of the return types in the block are not implicitly convertible to the delegate return type\`.
- **Forgetting the order matters.** A gate before the gain removes quiet signals that the gain would have lifted above the floor. Write the stages in the order the signal flows.
- **Handing an array where \`params\` wants separate arguments, or the reverse.** Both \`Compose(a, b, c)\` and \`Compose(array)\` work, but a \`List<Func<int, int>>\` does not: CS1503 again. Call \`.ToArray()\`.`,
      mission: md`Tobias, the sound operator, hates the old microphone routine: one long method with a flag for each effect, so turning off the gate for the quiet lullaby scene means a code change and a redeploy. He wants each effect as a small piece he can order himself.

Build the signal chain from composable functions: a gain stage, a noise gate and a peak limiter, joined by a \`Compose\` you write. Then give the fader movement a pluggable curve, first with delegates and then with an interface for the curve that needs a name. When the lesson passes, the **Sound chain** powers on: it draws each stage and the value that flows through it.`,
      tasks: [
        "Write three local functions that each return a lambda: Func<int, int> Gain(int percent) (level * percent / 100), Gate(int floor) (0 when the level is below floor, otherwise unchanged) and Limit(int ceiling) (Math.Min(level, ceiling)). Add Func<int, int> Compose(params Func<int, int>[] chain) that returns a lambda feeding the level through every stage in order",
        "Declare string[] stageNames = { \"Gain 150%\", \"Gate below 20\", \"Limit 90\" }; and Func<int, int>[] stages = { Gain(150), Gate(20), Limit(90) };, then Func<int, int> micChain = Compose(stages);. For the inputs 10, 40 and 80 print mic 10 -> 0, mic 40 -> 60 and mic 80 -> 90, and keep a var samples = new List<object>() of new { input, output } objects",
        "Build List<int> trail starting with 80 and add the level after each stage in stages. Print trail for 80: 80 -> 120 -> 120 -> 90 (string.Join(\" -> \", trail))",
        "Write double Fade(double fromLevel, double toLevel, double t, Func<double, double> curve), the delegates linear = t => t and easeIn = t => t * t, and print halfway, linear: 50 and halfway, ease-in: 25 for Fade(0, 100, 0.5, ...). Under the divider declare interface ICurve { string Name { get; } double At(double t); } and class SteppedCurve : ICurve (constructor takes int steps; Name is $\"stepped x{steps}\"; At returns Math.Floor(t * steps) / steps). Then ICurve stepped = new SteppedCurve(3); Func<double, double> steppedAsFunc = stepped.At; and print halfway, stepped x3: 33.3 (use :F1)",
        "Send it all to the board: Desk.Show(\"chain\", new { stageNames, trail, samples, fade = new { linear = ..., easeIn = ..., stepped = Math.Round(..., 1), steppedName = stepped.Name } }); where each fade value is the Fade(0, 100, 0.5, ...) result for that curve",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 3: higher-order methods. Add your code below, in this order.
// 1. Factories that RETURN a lambda:
//      Func<int, int> Gain(int percent)    -> level => level * percent / 100
//      Func<int, int> Gate(int floor)      -> level => level < floor ? 0 : level
//      Func<int, int> Limit(int ceiling)   -> level => Math.Min(level, ceiling)
//      Func<int, int> Compose(params Func<int, int>[] chain)  -> a lambda that runs level through each stage in order
// 2. string[] stageNames = { "Gain 150%", "Gate below 20", "Limit 90" };
//    Func<int, int>[] stages = { Gain(150), Gate(20), Limit(90) };   Func<int, int> micChain = Compose(stages);
//    For input in 10, 40, 80: print "mic <input> -> <output>"  and add new { input, output } to var samples = new List<object>();
// 3. List<int> trail = new() { 80 };  run 80 through each stage, adding the result. Print  trail for 80: 80 -> 120 -> 120 -> 90
// 4. double Fade(double fromLevel, double toLevel, double t, Func<double, double> curve)   (a strategy parameter)
//    linear = t => t;  easeIn = t => t * t;   print  halfway, linear: 50   and   halfway, ease-in: 25
//    ICurve stepped = new SteppedCurve(3);   Func<double, double> steppedAsFunc = stepped.At;
//    print  halfway, stepped x3: 33.3   (Fade(...) formatted with :F1)
// 5. Desk.Show("chain", new { stageNames, trail, samples, fade = new { linear = ..., easeIn = ..., stepped = ..., steppedName = stepped.Name } });

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare ICurve and SteppedCurve here.
//   interface ICurve { string Name { get; } double At(double t); }
//   class SteppedCurve : ICurve { a constructor taking int steps; Name returns $"stepped x{steps}"; At(t) returns Math.Floor(t * steps) / steps }
`,
      solutionAdd: cs`// Lesson 3: higher-order methods.
Func<int, int> Gain(int percent)
{
    return level => level * percent / 100;
}

Func<int, int> Gate(int floor)
{
    return level => level < floor ? 0 : level;
}

Func<int, int> Limit(int ceiling)
{
    return level => Math.Min(level, ceiling);
}

Func<int, int> Compose(params Func<int, int>[] chain)
{
    return level =>
    {
        foreach (Func<int, int> stage in chain)
        {
            level = stage(level);
        }
        return level;
    };
}

string[] stageNames = { "Gain 150%", "Gate below 20", "Limit 90" };
Func<int, int>[] stages = { Gain(150), Gate(20), Limit(90) };
Func<int, int> micChain = Compose(stages);

var samples = new List<object>();
foreach (int input in new[] { 10, 40, 80 })
{
    int output = micChain(input);
    samples.Add(new { input, output });
    Console.WriteLine($"mic {input} -> {output}");
}

List<int> trail = new() { 80 };
int running = 80;
foreach (Func<int, int> stage in stages)
{
    running = stage(running);
    trail.Add(running);
}
Console.WriteLine("trail for 80: " + string.Join(" -> ", trail));

double Fade(double fromLevel, double toLevel, double t, Func<double, double> curve)
{
    return fromLevel + (toLevel - fromLevel) * curve(t);
}

Func<double, double> linear = t => t;
Func<double, double> easeIn = t => t * t;
ICurve stepped = new SteppedCurve(3);
Func<double, double> steppedAsFunc = stepped.At;
Console.WriteLine($"halfway, linear:  {Fade(0, 100, 0.5, linear)}");
Console.WriteLine($"halfway, ease-in: {Fade(0, 100, 0.5, easeIn)}");
Console.WriteLine($"halfway, {stepped.Name}: {Fade(0, 100, 0.5, steppedAsFunc):F1}");

Desk.Show("chain", new
{
    stageNames,
    trail,
    samples,
    fade = new
    {
        linear = Fade(0, 100, 0.5, linear),
        easeIn = Fade(0, 100, 0.5, easeIn),
        stepped = Math.Round(Fade(0, 100, 0.5, steppedAsFunc), 1),
        steppedName = stepped.Name,
    },
});

${TYPES_DIVIDER}

interface ICurve
{
    string Name { get; }
    double At(double t);
}

class SteppedCurve : ICurve
{
    readonly int steps;

    public SteppedCurve(int steps)
    {
        this.steps = steps;
    }

    public string Name
    {
        get { return $"stepped x{steps}"; }
    }

    public double At(double t)
    {
        return Math.Floor(t * steps) / steps;
    }
}`,
      explanation:
        "Gain, Gate and Limit are factories: each call returns a new lambda that captures its own parameter. Compose returns one more lambda that threads the level through every delegate in the array, so micChain has the same Func<int, int> shape as its parts and 80 flows 80 -> 120 -> 120 -> 90 while 10 is lifted to 15 and then silenced by the gate at 20. Walking the same stages array by hand produces the trail the board draws. Fade takes the curve as a Func<double, double> parameter, so linear, ease-in and a SteppedCurve (an interface method turned into a delegate with stepped.At) all plug into the same code. The interface exists for the curve because it must also expose a Name, which a bare delegate cannot carry.",
      hints: [
        { id: "h1", title: "Return a lambda", content: "A factory is an ordinary local function whose return type is Func<int, int> and whose body is return level => ...; using its own parameter. Gate: level < floor ? 0 : level. Limit: Math.Min(level, ceiling). Compose loops over the array, assigning level = stage(level), and returns level." },
        { id: "h2", title: "Chain and trail", content: "Func<int, int>[] stages = { Gain(150), Gate(20), Limit(90) }; Func<int, int> micChain = Compose(stages); For the trail, start List<int> trail = new() { 80 }; int running = 80; then foreach (Func<int, int> stage in stages) { running = stage(running); trail.Add(running); }" },
        { id: "h3", title: "Curves and the interface", content: "Under the divider: interface ICurve { string Name { get; } double At(double t); } and class SteppedCurve : ICurve with a steps field set by the constructor. Above it: ICurve stepped = new SteppedCurve(3); Func<double, double> steppedAsFunc = stepped.At; (no parentheses). Print $\"halfway, {stepped.Name}: {Fade(0, 100, 0.5, steppedAsFunc):F1}\"" },
      ],
      tests: [
        {
          id: "t1",
          description: "the composed chain gates, boosts and limits the microphone levels",
          assertionCode: js`
for (const [input, output] of [[10, 0], [40, 60], [80, 90]]) {
  const want = "mic " + input + " -> " + output;
  assert(lines.includes(want), 'No line is exactly "' + want + '". Print $"mic {input} -> {micChain(input)}" for 10, 40 and 80. Gain 150% first, then the gate below 20, then the limit at 90.');
}`,
        },
        {
          id: "t2",
          description: "the trail shows the level after every stage",
          assertionCode: js`assert(lines.includes("trail for 80: 80 -> 120 -> 120 -> 90"), 'No line is exactly "trail for 80: 80 -> 120 -> 120 -> 90". Start the trail with 80, run it through Gain(150), Gate(20) and Limit(90) one at a time, adding each result, then print "trail for 80: " + string.Join(" -> ", trail).');`,
        },
        {
          id: "t3",
          description: "fade curves are passed in as delegates and the stepped curve comes from an interface",
          assertionCode: js`
const seen = lines.map((l) => l.replace(/\s+/g, " ").trim());
assert(seen.includes("halfway, linear: 50"), 'No line says "halfway, linear: 50". Fade(0, 100, 0.5, linear) with linear = t => t.');
assert(seen.includes("halfway, ease-in: 25"), 'No line says "halfway, ease-in: 25". Fade(0, 100, 0.5, easeIn) with easeIn = t => t * t.');
assert(seen.includes("halfway, stepped x3: 33.3"), 'No line says "halfway, stepped x3: 33.3". Declare interface ICurve and class SteppedCurve under the divider, convert stepped.At to a Func<double, double>, and format the result with :F1.');`,
        },
        {
          id: "t4",
          description: "the board receives the stages, the trail and the sample outputs",
          assertionCode: js`
assert(scene.chain && typeof scene.chain === "object", 'Send Desk.Show("chain", new { stageNames, trail, samples, fade = new { ... } });');
assertEqual(scene.chain.stageNames, ["Gain 150%", "Gate below 20", "Limit 90"], "chain.stageNames");
assertEqual(scene.chain.trail, [80, 120, 120, 90], "chain.trail");
assertEqual(scene.chain.samples, [{ input: 10, output: 0 }, { input: 40, output: 60 }, { input: 80, output: 90 }], "chain.samples (objects with input and output, in the order 10, 40, 80)");`,
        },
        {
          id: "t5",
          description: "the board receives the three fade results and the interface curve's name",
          assertionCode: js`
assert(scene.chain && scene.chain.fade, "chain.fade is missing. Add fade = new { linear, easeIn, stepped, steppedName } to the chain object.");
assertEqual(scene.chain.fade.linear, 50, "chain.fade.linear");
assertEqual(scene.chain.fade.easeIn, 25, "chain.fade.easeIn");
assertClose(scene.chain.fade.stepped, 33.3, 0.05, "chain.fade.stepped (Math.Round(..., 1))");
assertEqual(scene.chain.fade.steppedName, "stepped x3", "chain.fade.steppedName (the interface's Name property)");`,
        },
      ],
      unlocks: ["fl-chain"],
      checks: [
        {
          prompt: "With `Gain(150)` boosting by 50% and `Limit(90)` capping at 90, what does `Compose(Limit(90), Gain(150))(80)` return?",
          question: { type: "number", answer: 120 },
          explanation: "The limiter runs first: 80 is already under 90, so it passes unchanged. Then the gain lifts it to 80 * 150 / 100 = 120, and nothing caps it afterwards. Put the limiter last (`Compose(Gain(150), Limit(90))`) and the answer is 90.",
        },
        {
          prompt: "`Func<int, int> boost = Gain(150);` and `Func<int, int> hush = Gain(50);` were made by the same factory. What do the two delegates share?",
          question: {
            type: "choice",
            options: [
              "Only the code of the lambda; each call to Gain created its own captured `percent`",
              "The same `percent` variable, so changing one changes the other",
              "Nothing at all, not even the code",
              "They are the same object",
            ],
            answer: 0,
          },
          explanation: "Every call to `Gain` runs the method afresh, so it gets a new `percent` parameter and a new closure. The lambda's compiled code is shared, but the captured variable is not.",
        },
        {
          prompt: "A fade curve also has to report a display name for the screen. Why does that push you toward an interface rather than a plain `Func<double, double>`?",
          question: {
            type: "choice",
            options: [
              "A bare delegate is one operation with no place to attach extra members such as a name",
              "Interfaces run faster than delegates",
              "Delegates cannot take a double",
              "Delegates cannot be passed to other methods",
            ],
            answer: 0,
          },
          explanation: "A delegate says exactly one thing: how to call it. When the behaviour needs companions (a name, configuration, a description) an interface can group them. You can still turn one interface method into a delegate with `curve.At` whenever a delegate is what a method asks for.",
        },
      ],
    },
    // ───────────────────────── 4 ─────────────────────────
    {
      id: "csharp-delegates-4-multicast",
      title: "One button, many handlers",
      minutes: 40,
      xp: 200,
      concepts: ["multicast delegates", "+= and -=", "invocation list", "return values of multicast", "exceptions in handlers", "safe broadcast", "delegate immutability"],
      learn: md`### One variable, several methods

So far a delegate variable held one method. In reality every delegate in C# can hold an **ordered list** of methods, called its *invocation list*. Calling the delegate calls each entry in turn, on the same thread, passing the same arguments. Such a delegate is called **multicast**, and it is the machinery under C# events (lesson 5).

~~~csharp
Action<string>? go = null;
go += Rig.Lights;
go += Rig.Fog;
go += Rig.Sound;
go("Act 1");               // Lights, then Fog, then Sound
~~~

The operators \`+=\` and \`-=\` look like they change the variable, but delegates are **immutable**. \`go += Rig.Fog\` really means \`go = Delegate.Combine(go, new Action<string>(Rig.Fog))\`: build a brand-new delegate whose list is the old list plus one entry, and store that. Combining with \`null\` is fine, so a variable that starts as \`null\` can simply be added to. This immutability is also what makes it safe to add or remove handlers while the delegate is in the middle of being invoked: the running call walks the old list.

### Looking inside the list

~~~csharp
Delegate[] list = go.GetInvocationList();
string[] names = list.Select(handler => handler.Method.Name).ToArray();
~~~

Each entry is an ordinary single-method delegate. \`handler.Method.Name\` tells you which method it will run. Static methods and ordinary methods give you their real names (\`Lights\`, \`Fog\`). Lambdas and local functions get names invented by the compiler, such as \`<<Main>$>g__Hello|0_3\`, which is why the rig handlers in this lesson are static methods of a small class.

### Removing a handler

\`-=\` removes the **last** entry that is *equal* to the one you pass. Two delegates are equal when they have the same method and the same target object (lesson 1). That is exactly what you want for named methods, and a trap for lambdas:

~~~csharp
Action ping = () => Console.Write("x");
ping += () => Console.Write("y");
ping -= () => Console.Write("y");      // looks identical, but it is a different delegate object
Console.WriteLine(ping.GetInvocationList().Length);   // still 2
~~~

Each lambda expression creates its own delegate, so the one you try to remove matches nothing. To unsubscribe a lambda later, store it in a variable when you add it and use that variable for both \`+=\` and \`-=\`. (Adding the same handler twice calls it twice; removing takes away one copy, the last.)

Remove everything and the variable becomes \`null\` again, so a call must be guarded: \`go?.Invoke("Act 1")\`.

### Return values: only the last one survives

An \`Action\` returns nothing, so the order and side effects are all that matter. If the delegate returns a value, calling it returns **only the result of the last handler**; earlier results are discarded:

~~~csharp
Func<int> levelCue = () => 40;
levelCue += () => 70;
Console.WriteLine(levelCue());     // 70, and the 40 is lost
~~~

When you need every result, walk the list yourself: \`levelCue.GetInvocationList().Cast<Func<int>>().Select(cue => cue()).ToArray()\` gives \`40, 70\`.

### When a handler throws

This is the pitfall that ruins opening nights. Handlers run one after another with nothing in between. If the second one throws, the exception leaves the whole call; the third and fourth **never run**:

~~~text
  lights -> Act 1
GO aborted: fog machine jammed
~~~

The sound and the fly bar were never asked. One misbehaving subscriber has silently cancelled everybody who came after it in the list, and which subscribers those are depends on who happened to register first.

The cure is a **safe broadcast**: do the invoking yourself, one handler at a time, so that each one gets its own try/catch.

~~~csharp
foreach (Delegate handler in handlers.GetInvocationList())
{
    try { ((Action<string>)handler)(argument); }
    catch (Exception ex) { failures.Add($"{handler.Method.Name}: {ex.Message}"); }
}
~~~

Now the sound and the fly bar both run and the jam is recorded for someone to look at. Whether to swallow, log, collect and rethrow as an \`AggregateException\`, or stop at the first failure is a design decision. The point is that it must be *your* decision, not a side effect of list order.

### Other things to remember

- Handlers run **synchronously**. A slow handler delays the caller and every handler behind it.
- The order is the order of registration. Code that depends on it is fragile; treat the list as unordered.
- Only delegates of the **same type** can be combined. The compiler stops you when it can (\`error CS0019: Operator '+' cannot be applied to operands of type 'Func<int>' and 'Func<string>'\`); mixing types through the \`Delegate\` base class fails at run time with \`ArgumentException: Delegates must be of the same type.\`

### Common mistakes

- Calling a delegate without its arguments: \`error CS7036: There is no argument given that corresponds to the required parameter 'obj' of 'Action<string>'\`.
- Adding a handler with the wrong shape, for instance a lambda with no parameter to an \`Action<string>\`: \`error CS1593: Delegate 'Action<string>' does not take 0 arguments\`.
- Trying to unsubscribe a lambda by writing it out a second time (it silently does nothing).
- Invoking a delegate after removing its last handler, without \`?.Invoke\`: \`System.NullReferenceException: Object reference not set to an instance of an object.\`
- Assuming a multicast \`Func\` gives you all the results.`,
      mission: md`Tonight's GO for the opening of Act One should do four things: the lights change, the fog machine fires, the sound plays and the fly bar lowers the moon. Last week the fog machine jammed during rehearsal, and because the desk called the handlers one after another in a single call, nothing after the fog happened. The moon stayed up and Wen had to explain it to a full house of school groups.

Build the GO button as a multicast delegate, reproduce the jam on purpose, and then write a broadcast that survives it. When the lesson passes, the **GO button** powers on: it shows the list of handlers, how far the naive call got, and which handlers the safe broadcast reached.`,
      tasks: [
        "Under the divider declare static class Rig with public static readonly List<string> Done = new(); and four static methods taking string scene: Lights prints \"  lights -> {scene}\" and adds \"Lights\" to Done; Fog throws new InvalidOperationException(\"fog machine jammed\"); Sound prints \"  sound -> {scene}\" and adds \"Sound\"; Fly prints \"  fly bar -> {scene}\" and adds \"Fly\" (two leading spaces on each printed line)",
        "Build Action<string>? go = null; and add Rig.Lights, Rig.Fog, Rig.Sound and Rig.Fly with +=. Make string[] goHandlers = go.GetInvocationList().Select(handler => handler.Method.Name).ToArray(); and print GO has 4 handlers: Lights, Fog, Sound, Fly",
        "Call go(\"Act 1\") inside try/catch (InvalidOperationException ex) printing GO aborted: {ex.Message}. Copy Rig.Done into string[] naiveDone, print naive GO finished: Lights (string.Join(\", \", naiveDone)), then Rig.Done.Clear()",
        "Write List<string> goFailures = new(); and a local function void Broadcast(Action<string>? handlers, string argument) that returns when handlers is null, loops over handlers.GetInvocationList(), calls each as ((Action<string>)handler)(argument) inside try/catch (Exception ex) and adds $\"{handler.Method.Name}: {ex.Message}\" on failure. Call Broadcast(go, \"Act 2\"), copy Rig.Done into string[] safeDone and print safe GO finished: Lights, Sound, Fly and failures: Fog: fog machine jammed",
        "Make Func<int> levelCue = () => 40; then levelCue += () => 70;. Get int lastWins = levelCue(); and int[] everyReturn = levelCue.GetInvocationList().Cast<Func<int>>().Select(cue => cue()).ToArray();, print direct call returns 70; every return: 40, 70, and send Desk.Show(\"go\", new { handlers = goHandlers, naive = naiveDone, safe = safeDone, failures = goFailures, lastWins, everyReturn });",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 4: multicast delegates. Add your code below, in this order.
// 1. (Under the divider) static class Rig { public static readonly List<string> Done = new(); ... four static methods Lights, Fog, Sound, Fly (string scene) }
// 2. Action<string>? go = null;  go += Rig.Lights;  go += Rig.Fog;  go += Rig.Sound;  go += Rig.Fly;
//    string[] goHandlers = go.GetInvocationList().Select(handler => handler.Method.Name).ToArray();
//    Print:  GO has 4 handlers: Lights, Fog, Sound, Fly
// 3. try { go("Act 1"); } catch (InvalidOperationException ex) { print  GO aborted: <message> }
//    string[] naiveDone = Rig.Done.ToArray();   print  naive GO finished: Lights    then Rig.Done.Clear();
// 4. List<string> goFailures = new();   void Broadcast(Action<string>? handlers, string argument)  (try/catch around EACH handler)
//    Broadcast(go, "Act 2");   string[] safeDone = Rig.Done.ToArray();
//    Print:  safe GO finished: Lights, Sound, Fly     and     failures: Fog: fog machine jammed
// 5. Func<int> levelCue = () => 40;  levelCue += () => 70;   int lastWins = levelCue();
//    int[] everyReturn = levelCue.GetInvocationList().Cast<Func<int>>().Select(cue => cue()).ToArray();
//    Print:  direct call returns 70; every return: 40, 70
//    Desk.Show("go", new { handlers = goHandlers, naive = naiveDone, safe = safeDone, failures = goFailures, lastWins, everyReturn });

${TYPES_DIVIDER}

// ─── ✏️ YOUR TURN ─── declare static class Rig here (Done list + Lights, Fog, Sound, Fly).
`,
      solutionAdd: cs`// Lesson 4: multicast delegates.
Action<string>? go = null;
go += Rig.Lights;
go += Rig.Fog;
go += Rig.Sound;
go += Rig.Fly;
string[] goHandlers = go.GetInvocationList().Select(handler => handler.Method.Name).ToArray();
Console.WriteLine($"GO has {goHandlers.Length} handlers: {string.Join(", ", goHandlers)}");

try
{
    go("Act 1");
}
catch (InvalidOperationException ex)
{
    Console.WriteLine($"GO aborted: {ex.Message}");
}
string[] naiveDone = Rig.Done.ToArray();
Console.WriteLine($"naive GO finished: {string.Join(", ", naiveDone)}");
Rig.Done.Clear();

List<string> goFailures = new();
void Broadcast(Action<string>? handlers, string argument)
{
    if (handlers is null)
    {
        return;
    }
    foreach (Delegate handler in handlers.GetInvocationList())
    {
        try
        {
            ((Action<string>)handler)(argument);
        }
        catch (Exception ex)
        {
            goFailures.Add($"{handler.Method.Name}: {ex.Message}");
        }
    }
}

Broadcast(go, "Act 2");
string[] safeDone = Rig.Done.ToArray();
Console.WriteLine($"safe GO finished:  {string.Join(", ", safeDone)}");
Console.WriteLine($"failures: {string.Join("; ", goFailures)}");

Func<int> levelCue = () => 40;
levelCue += () => 70;
int lastWins = levelCue();
int[] everyReturn = levelCue.GetInvocationList().Cast<Func<int>>().Select(cue => cue()).ToArray();
Console.WriteLine($"direct call returns {lastWins}; every return: {string.Join(", ", everyReturn)}");

Desk.Show("go", new
{
    handlers = goHandlers,
    naive = naiveDone,
    safe = safeDone,
    failures = goFailures,
    lastWins,
    everyReturn,
});

${TYPES_DIVIDER}

static class Rig
{
    public static readonly List<string> Done = new();

    public static void Lights(string scene)
    {
        Console.WriteLine($"  lights -> {scene}");
        Done.Add("Lights");
    }

    public static void Fog(string scene)
    {
        throw new InvalidOperationException("fog machine jammed");
    }

    public static void Sound(string scene)
    {
        Console.WriteLine($"  sound -> {scene}");
        Done.Add("Sound");
    }

    public static void Fly(string scene)
    {
        Console.WriteLine($"  fly bar -> {scene}");
        Done.Add("Fly");
    }
}`,
      explanation:
        "Each += builds a new immutable delegate whose invocation list ends with the new method, so go holds Lights, Fog, Sound and Fly in that order, and GetInvocationList exposes them one by one (static methods keep readable Method.Name values). Calling go directly runs the list in sequence, so when Fog throws the exception leaves the call and Sound and Fly never run: only Lights is in Done. Broadcast does the iteration itself and puts a try/catch around every handler, so Fog's exception is recorded in goFailures and Sound and Fly still run. A multicast Func returns only the last handler's value (70), which is why the earlier 40 is only visible when you invoke each entry of the invocation list yourself.",
      hints: [
        { id: "h1", title: "The rig", content: "Under the divider: static class Rig { public static readonly List<string> Done = new(); public static void Lights(string scene) { Console.WriteLine($\"  lights -> {scene}\"); Done.Add(\"Lights\"); } ... } Fog just throws and never touches Done. Above the divider build go with += and one method per line." },
        { id: "h2", title: "Naive then safe", content: "The naive call is try { go(\"Act 1\"); } catch (InvalidOperationException ex) { Console.WriteLine($\"GO aborted: {ex.Message}\"); }. Copy Rig.Done.ToArray() before you Clear() it. Broadcast: foreach (Delegate handler in handlers.GetInvocationList()) { try { ((Action<string>)handler)(argument); } catch (Exception ex) { goFailures.Add(...); } }" },
        { id: "h3", title: "Return values", content: "Func<int> levelCue = () => 40; levelCue += () => 70; int lastWins = levelCue(); gives 70. For both values: levelCue.GetInvocationList().Cast<Func<int>>().Select(cue => cue()).ToArray(); then Desk.Show(\"go\", new { handlers = goHandlers, naive = naiveDone, safe = safeDone, failures = goFailures, lastWins, everyReturn });" },
      ],
      tests: [
        {
          id: "t1",
          description: "the GO delegate lists its four handlers by name",
          assertionCode: js`assert(lines.includes("GO has 4 handlers: Lights, Fog, Sound, Fly"), 'No line is exactly "GO has 4 handlers: Lights, Fog, Sound, Fly". Add Rig.Lights, Rig.Fog, Rig.Sound and Rig.Fly to go with +=, then print the Method.Name of each entry of go.GetInvocationList().');`,
        },
        {
          id: "t2",
          description: "a throwing handler stops the plain multicast call",
          assertionCode: js`
assert(lines.includes("  lights -> Act 1"), 'No line is exactly "  lights -> Act 1" (two leading spaces). Rig.Lights should print it before the fog machine jams.');
assert(lines.includes("GO aborted: fog machine jammed"), 'No line is exactly "GO aborted: fog machine jammed". Call go("Act 1") inside try/catch (InvalidOperationException ex) and print $"GO aborted: {ex.Message}".');
assert(!lines.includes("  sound -> Act 1"), "The sound handler ran in the plain call. After Fog throws, the handlers behind it must NOT run: that is the pitfall this call demonstrates.");
const seen = lines.map((l) => l.replace(/\s+/g, " ").trim());
assert(seen.includes("naive GO finished: Lights"), 'No line says "naive GO finished: Lights". Copy Rig.Done into an array right after the failed call and join it with ", ".');`,
        },
        {
          id: "t3",
          description: "the safe broadcast reaches every handler and records the failure",
          assertionCode: js`
assert(lines.includes("  sound -> Act 2"), 'No line is exactly "  sound -> Act 2". Broadcast should catch the fog failure per handler and keep going.');
assert(lines.includes("  fly bar -> Act 2"), 'No line is exactly "  fly bar -> Act 2". Broadcast should catch the fog failure per handler and keep going.');
const seen = lines.map((l) => l.replace(/\s+/g, " ").trim());
assert(seen.includes("safe GO finished: Lights, Sound, Fly"), 'No line says "safe GO finished: Lights, Sound, Fly". Clear Rig.Done after the naive call, run Broadcast(go, "Act 2"), then join Rig.Done.');
assert(seen.includes("failures: Fog: fog machine jammed"), 'No line says "failures: Fog: fog machine jammed". Add $"{handler.Method.Name}: {ex.Message}" to goFailures in the catch block and print string.Join("; ", goFailures).');`,
        },
        {
          id: "t4",
          description: "a multicast Func returns only the last handler's value",
          assertionCode: js`assert(lines.includes("direct call returns 70; every return: 40, 70"), 'No line is exactly "direct call returns 70; every return: 40, 70". Add two lambdas to a Func<int> (40 then 70); the direct call gives the last, and GetInvocationList() lets you call each one.');`,
        },
        {
          id: "t5",
          description: "the board receives the handlers, both outcomes, the failure and the return values",
          assertionCode: js`
assert(scene.go && typeof scene.go === "object", 'Send Desk.Show("go", new { handlers = goHandlers, naive = naiveDone, safe = safeDone, failures = goFailures, lastWins, everyReturn });');
assertEqual(scene.go.handlers, ["Lights", "Fog", "Sound", "Fly"], "go.handlers");
assertEqual(scene.go.naive, ["Lights"], "go.naive (what finished before the jam)");
assertEqual(scene.go.safe, ["Lights", "Sound", "Fly"], "go.safe (what finished in the safe broadcast)");
assertEqual(scene.go.failures, ["Fog: fog machine jammed"], "go.failures");
assertEqual(scene.go.lastWins, 70, "go.lastWins");
assertEqual(scene.go.everyReturn, [40, 70], "go.everyReturn");`,
        },
      ],
      unlocks: ["fl-go"],
      checks: [
        {
          prompt: "A multicast delegate holds three handlers, A, B and C, in that order. B throws an exception and nobody catches it inside the delegate call. How many of the three handlers run to completion?",
          question: { type: "number", answer: 1 },
          explanation: "A finishes. B starts and throws, so it does not complete. The exception leaves the call, and C is never invoked. This is why a broadcast that must reach everyone invokes the handlers one at a time with its own try/catch.",
        },
        {
          prompt: "`Action ping = () => Console.Write(\"x\"); ping += () => Console.Write(\"y\"); ping -= () => Console.Write(\"y\");` How many handlers remain in `ping`?",
          question: { type: "number", answer: 2 },
          explanation: "Each lambda expression creates its own delegate object with its own target, so the one passed to `-=` is not equal to the one added earlier and nothing is removed. Store the lambda in a variable when you add it and use that variable to remove it.",
        },
        {
          prompt: "Why does `Broadcast` loop over `handlers.GetInvocationList()` instead of simply calling `handlers(argument)`?",
          question: {
            type: "choice",
            options: [
              "So that each handler gets its own try/catch and one failure cannot stop the others",
              "Because multicast delegates cannot be called directly",
              "To run the handlers on separate threads",
              "To remove handlers that have run once",
            ],
            answer: 0,
          },
          explanation: "A direct call runs the list in one go, so the first exception abandons the rest. Walking the invocation list yourself lets you decide what a failure means (log it, collect it, rethrow later) while the remaining handlers still run. The handlers still run one after another on the same thread.",
        },
      ],
    },
  ],
};
