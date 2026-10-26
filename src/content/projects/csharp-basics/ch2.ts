import type { Chapter } from "@/engine/types";
import { cs, js, md } from "./util.ts";

/**
 * Chapter 2: Text, choices and loops. Reading input, the string toolbox, if/switch, and the three
 * loops. The input lesson reads Project.setup (the program's stdin):
 *   "  Mika Okafor  " / "12" / "harbour library" / "7x"
 */

export const chapter2: Chapter = {
  id: "text-and-flow",
  title: "Text, choices and loops",
  blurb: "Read input, work with text, make decisions and repeat work without copying code.",
  lessons: [
    // ───────────────────────── 4 ─────────────────────────
    {
      id: "csharp-basics-4-text",
      title: "Input and the string toolbox",
      minutes: 25,
      xp: 110,
      concepts: ["Console.ReadLine", "int.Parse", "int.TryParse", "out", "string methods", "indexing", "format specifiers"],
      learn: md`### Reading input

\`Console.ReadLine()\` waits for a line of text and hands it back. When there is nothing left to read it returns \`null\`, which is why its type is \`string?\` (the \`?\` means "might be null"; lesson 10 explains null properly). For now, give it a fallback with \`??\`: *"use the left side, or this when it is null"*.

~~~csharp
string name = Console.ReadLine() ?? "";
~~~

In a real console app a person types the line. On pockett the course gives your program its input for you, always the same four lines, so your results are repeatable:

~~~text
··Mika Okafor··       (two spaces before and after the name)
12
harbour library
7x
~~~

### From text to numbers

Everything you read arrives as text, and \`"12" + 1\` is \`"121"\`. To calculate you must **parse** it.

~~~csharp
int weight = int.Parse("12");           // 12
int broken = int.Parse("12kg");         // throws FormatException and stops the program
bool ok = int.TryParse("12kg", out int value);   // ok is false, value is 0
~~~

\`TryParse\` is the safe form for input you do not control. It returns a \`bool\` (did it work?) and delivers the number through an **\`out\` parameter**: a variable that the method fills in for you. \`out int value\` declares that variable on the spot. If you do not need the number, write \`out _\`. Use \`Parse\` when bad text would be a bug, \`TryParse\` when bad text is something you expect. Also available: \`double.TryParse\`, \`decimal.TryParse\`, \`bool.TryParse\`.

### The string toolbox

A string is a sequence of characters, counted from **0**. Strings are **immutable**: every method returns a *new* string and leaves the original alone.

~~~csharp
string s = "  Rex the Robot  ";
s.Length                  // 17
s.Trim()                  // "Rex the Robot"   (TrimStart / TrimEnd for one side)
s.ToUpper()               // "  REX THE ROBOT  "
s.Trim()[0]               // 'R'      the first character, as a char
s.Contains("the")         // true
s.StartsWith("  Rex")     // true
s.IndexOf('R')            // 2        position of the first match, or -1 if there is none
s.Trim().Substring(4, 3)  // "the"    start at 4, take 3 characters
s.Replace("Rex", "Pip")   // "  Pip the Robot  "
"a,b,c".Split(',')        // an array: "a", "b", "c"
string.Join(" / ", new[] { "a", "b" })   // "a / b"
string.IsNullOrWhiteSpace("   ")         // true
~~~

Because strings never change, \`s.Trim();\` on its own line does nothing useful. Keep the result: \`s = s.Trim();\`.

\`==\` compares strings by their **content** and is case-sensitive. For a case-insensitive comparison use \`string.Equals(a, b, StringComparison.OrdinalIgnoreCase)\`.

### Formatting numbers inside \`{ }\`

After a colon you can add a **format specifier**, and after a comma a width for alignment.

~~~csharp
int n = 7;  double d = 3.14159;  int big = 1234567;
$"{n:D3}"        // 007       at least 3 digits
$"{d:F2}"        // 3.14      2 decimals
$"{big:N0}"      // 1,234,567 thousands separators
$"{0.256:P0}"    // 26%       percent
$"[{n,5}]"       // [    7]   right-aligned in 5 characters
$"[{"ab",-5}]"   // [ab   ]   left-aligned in 5 characters
~~~

One caution: number formats depend on the computer's *culture* (some languages write \`3,14\`). Here the program uses the neutral "invariant" culture, so output is predictable. That is also why \`:C\` (currency) prints a generic ¤ sign here. Use \`F2\` when you want a price.

### Common mistakes

- Doing maths on text you forgot to parse.
- Calling \`int.Parse\` on user input that might be wrong. Prefer \`TryParse\` and handle \`false\`.
- Writing \`name.Trim();\` and expecting \`name\` to change.
- Off-by-one in \`Substring\`: the second argument is a **length**, not an end position.`,
      mission: md`A customer's parcel arrives at the dock with details typed in a hurry: stray spaces, lower-case text, and an extra weight that is not even a number. The depot prints a shipping label for every parcel.

You will read the input, clean it, parse the numbers safely and build a label code. When this lesson passes, the **Shipping label** card prints your label on the stage.`,
      tasks: [
        "Read the first three lines: customer (Trim), weightKg (int.Parse) and destination (Trim and ToUpper). Use ?? \"\" (or \"0\") as the fallback for a missing line",
        "Read the fourth line into extraText and use int.TryParse to set extraOk (the value 7x is not a number, so it is false)",
        "Build initials from the first letter of the customer and the first letter after the space (IndexOf), then code = initials + \"-\" + weightKg padded to 3 digits (MO-012)",
        "Print MO-012 | Mika Okafor -> HARBOUR LIBRARY and Show customer, destination, weightKg, code, extraText and extraOk",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 4: print a shipping label from the input. The four input lines are:
//     "  Mika Okafor  "     the customer, with stray spaces
//     "12"                  the weight in kg
//     "harbour library"     the destination
//     "7x"                  an extra weight that is NOT a valid number
// 1. string customer (Trim), int weightKg (Parse), string destination (Trim + ToUpper)
//    Console.ReadLine() can return null, so write (Console.ReadLine() ?? "")
// 2. string extraText = the 4th line;  bool extraOk = int.TryParse(extraText, out int extraKg);
// 3. string initials -> "MO", then string code -> "MO-012" ({weightKg:D3} pads to 3 digits)
// 4. Print:  MO-012 | Mika Okafor -> HARBOUR LIBRARY
//    Depot.Show: customer, destination, weightKg, code, extraText, extraOk
`,
      solutionAdd: cs`// Lesson 4: print a shipping label from the input.
string customer = (Console.ReadLine() ?? "").Trim();
int weightKg = int.Parse(Console.ReadLine() ?? "0");
string destination = (Console.ReadLine() ?? "").Trim().ToUpper();

string extraText = Console.ReadLine() ?? "";
bool extraOk = int.TryParse(extraText, out int extraKg);

string initials = $"{customer[0]}{customer[customer.IndexOf(' ') + 1]}";
string code = $"{initials}-{weightKg:D3}";

Console.WriteLine($"{code} | {customer} -> {destination}");
Console.WriteLine(extraOk ? $"Extra weight: {extraKg} kg" : $"Ignoring extra weight \"{extraText}\"");

Depot.Show("customer", customer);
Depot.Show("destination", destination);
Depot.Show("weightKg", weightKg);
Depot.Show("code", code);
Depot.Show("extraText", extraText);
Depot.Show("extraOk", extraOk);`,
      explanation:
        "ReadLine returns string?, so (Console.ReadLine() ?? \"\") gives a plain string even at the end of the input, and Trim removes the stray spaces. int.Parse turns \"12\" into 12. int.TryParse(\"7x\", out int extraKg) reports false instead of crashing. The initials come from customer[0] and the character after the space (IndexOf(' ') + 1), and {weightKg:D3} pads 12 to 012. Strings are immutable, so each method's result is stored in a new variable.",
      hints: [
        { id: "h1", title: "Reading and cleaning", content: "Each Console.ReadLine() consumes the next line. string customer = (Console.ReadLine() ?? \"\").Trim(); Do the same for the destination and add .ToUpper() after .Trim(). The weight is int.Parse(Console.ReadLine() ?? \"0\")." },
        { id: "h2", title: "TryParse", content: "bool extraOk = int.TryParse(extraText, out int extraKg); The out variable is created for you. Read the 4th line into extraText first, so you can show it." },
        { id: "h3", title: "Initials and code", content: "customer[0] is the first letter. The second word starts at customer.IndexOf(' ') + 1. Put them in an interpolated string: $\"{customer[0]}{customer[customer.IndexOf(' ') + 1]}\". For the code use $\"{initials}-{weightKg:D3}\"." },
      ],
      tests: [
        {
          id: "t1",
          description: "customer is read and trimmed",
          assertionCode: js`assertEqual(scene.customer, "Mika Okafor", "customer (read the first line and Trim() the stray spaces)");`,
        },
        {
          id: "t2",
          description: "weightKg is parsed into a number",
          assertionCode: js`assertEqual(scene.weightKg, 12, "weightKg (the second input line, parsed with int.Parse). Remember to Show it as a number, not text");`,
        },
        {
          id: "t3",
          description: "destination is trimmed and upper-cased",
          assertionCode: js`assertEqual(scene.destination, "HARBOUR LIBRARY", "destination (third line: Trim().ToUpper())");`,
        },
        {
          id: "t4",
          description: "TryParse says the extra weight is not a number",
          assertionCode: js`
assertEqual(scene.extraText, "7x", "extraText (the raw fourth line)");
assertEqual(scene.extraOk, false, "extraOk (int.TryParse of \"7x\" returns false)");`,
        },
        {
          id: "t5",
          description: "code combines the initials with a 3-digit weight",
          assertionCode: js`assertEqual(scene.code, "MO-012", "code (initials MO, a dash, and the weight padded to 3 digits with :D3)");`,
        },
        {
          id: "t6",
          description: "the label line is printed",
          assertionCode: js`assert(lines.includes("MO-012 | Mika Okafor -> HARBOUR LIBRARY"), 'Print exactly: MO-012 | Mika Okafor -> HARBOUR LIBRARY');`,
        },
      ],
      unlocks: ["cs-label"],
      checks: [
        {
          prompt: "What does this print?\n\n~~~csharp\nstring name = \"  rex  \";\nname.Trim();\nConsole.WriteLine($\"[{name}]\");\n~~~",
          question: { type: "choice", options: ["[rex]", "[  rex  ]", "[REX]", "It does not compile"], answer: 1 },
          explanation: "Strings are immutable. `Trim()` returns a new string, and since nothing stores it the original is unchanged. You would write `name = name.Trim();`.",
        },
        {
          prompt: "After `bool ok = int.TryParse(\"7x\", out int n);` what are `ok` and `n`?",
          question: {
            type: "choice",
            options: ["`false` and `0`", "`false` and `7`", "`true` and `7`", "It throws a FormatException"],
            answer: 0,
          },
          explanation: "`TryParse` never throws for bad text. It returns `false` and sets the out variable to the type's default, `0` for an `int`. Always check the bool before trusting the number.",
        },
        {
          prompt: "What does `\"harbour\".IndexOf('z')` return?",
          question: { type: "number", answer: -1 },
          explanation: "`IndexOf` returns the position of the first match, counting from 0, or `-1` when the text is not there. `-1` is never a valid position, which is why it is used as the signal for \"not found\".",
        },
      ],
    },

    // ───────────────────────── 5 ─────────────────────────
    {
      id: "csharp-basics-5-choices",
      title: "Making decisions",
      minutes: 25,
      xp: 120,
      concepts: ["if / else if / else", "comparison", "&& || !", "ternary", "switch statement", "switch expression", "patterns"],
      learn: md`### Questions with yes/no answers

A comparison produces a \`bool\`: \`==\` equal, \`!=\` not equal, \`<\`, \`>\`, \`<=\`, \`>=\`. Remember that **one** \`=\` stores a value and **two** \`==\` ask a question.

~~~csharp
int battery = 18;
bool low = battery < 20;      // true
~~~

### \`if\`, \`else if\`, \`else\`

~~~csharp
if (battery < 20)
{
    status = "Charge now";
}
else if (battery < 50)
{
    status = "Low";
}
else
{
    status = "Ready";
}
~~~

The branches are tried **top to bottom** and only the first one whose condition is true runs. Because of that, order matters: put the most specific test first. The condition must be a real \`bool\`; \`if (battery = 50)\` is a compile error in C#, which protects you from a famous class of bugs.

Braces are optional for a single statement, but always writing them avoids mistakes when you add a second line later.

### Combining conditions

- \`&&\` **and**: both sides must be true.
- \`||\` **or**: at least one side is true.
- \`!\` **not**: flips a bool.

~~~csharp
bool canDeliver = online && battery >= 30 && weightKg <= 25;
~~~

Both \`&&\` and \`||\` are **short-circuit**: the right side is only evaluated when it can still change the answer. That is why \`name != null && name.Length > 3\` is safe. \`&&\` binds tighter than \`||\`, so add parentheses whenever you mix them. Write each comparison in full: \`x > 5 && x < 10\`, never \`x > 5 && < 10\`.

### The conditional (ternary) operator

\`condition ? valueIfTrue : valueIfFalse\` is an if/else that produces a value. It is great for small choices and hard to read when nested.

~~~csharp
Console.WriteLine(canDeliver ? "Cleared for delivery" : "Hold at the dock");
~~~

### \`switch\`: one value, many cases

~~~csharp
switch (dayName)
{
    case "Sat":
        hours = "Half day";
        break;                 // every section must end with break (no accidental fall-through)
    case "Sun":
        hours = "Closed";
        break;
    default:
        hours = "Full day";
        break;
}
~~~

Several labels can share a section (\`case "Sat": case "Sun":\`). \`default\` catches everything else.

### The switch *expression* and patterns

Modern C# has a compact form that **produces a value** and supports *patterns* such as ranges:

~~~csharp
string tier = weightKg switch
{
    < 5 => "Light",
    < 20 => "Standard",
    _ => "Heavy",            // _ means "anything else"
};

string shift = hour switch
{
    < 6 or >= 22 => "Night",     // combine patterns with or / and
    < 14 => "Morning",
    _ => "Evening",
};
~~~

Arms are checked top to bottom, so \`< 20\` only sees weights of 5 or more. The compiler warns when the arms do not cover every value, and at run time an uncovered value throws an exception. Always finish with \`_\` unless the type has a small closed set of values (such as an \`enum\`, in lesson 12).

### Common mistakes

- \`=\` instead of \`==\`.
- Branches in the wrong order: \`if (w < 20) ... else if (w < 5)\` can never reach the second branch.
- A stray semicolon, \`if (x > 3);\`, which ends the \`if\` with an empty statement.
- Comparing text with the wrong case: \`"sat" == "Sat"\` is \`false\`.
- Comparing doubles with \`==\` after calculations. Use a tolerance instead.`,
      mission: md`The depot needs rules. Heavy parcels go to the loading bay, a low robot must charge before it carries anything, weekends run shorter shifts, and the board should say whether a delivery is cleared or on hold.

Today's facts: the parcel weighs \`weightKg\`, Rex has \`battery\` and \`online\` from lesson 2, and the shift starts at hour 14 on a Saturday. When this lesson passes, the **Service rules** panel shows every decision your code makes.`,
      tasks: [
        "Make a switch expression for tier from weightKg: under 5 is \"Light\", under 20 is \"Standard\", otherwise \"Heavy\". Then a second one for shiftName from shiftHour: before 6 or from 22 on is \"Night\", before 14 is \"Morning\", otherwise \"Evening\"",
        "Use an if / else if / else chain to set chargeState from battery: under 20 \"Charge now\", under 50 \"Low\", otherwise \"Ready\"",
        "Make bool canDeliver (online, battery of at least 30, weightKg of at most 25) and print Cleared for delivery or Hold at the dock with the ternary operator",
        "Use a classic switch statement on dayName: \"Sat\" gives hours \"Half day\", \"Sun\" gives \"Closed\", anything else \"Full day\". Show tier, shiftName, chargeState, canDeliver and hours",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 5: decide the service rules. Facts for today:
int shiftHour = 14;       // 24-hour clock
string dayName = "Sat";
// weightKg, battery and online already exist from earlier lessons.

// 1. string tier      from weightKg  (a switch EXPRESSION):  < 5 Light, < 20 Standard, else Heavy
//    string shiftName from shiftHour (switch expression):    < 6 or >= 22 Night, < 14 Morning, else Evening
// 2. string chargeState (if / else if / else):               < 20 "Charge now", < 50 "Low", else "Ready"
// 3. bool canDeliver = online && battery >= 30 && weightKg <= 25;
//    Print "Cleared for delivery" or "Hold at the dock" with  ? :
// 4. string hours (a switch STATEMENT on dayName):           "Sat" Half day, "Sun" Closed, default Full day
// Depot.Show: tier, shiftName, chargeState, canDeliver, hours
`,
      solutionAdd: cs`// Lesson 5: decide the service rules.
int shiftHour = 14;       // 24-hour clock
string dayName = "Sat";

string tier = weightKg switch
{
    < 5 => "Light",
    < 20 => "Standard",
    _ => "Heavy",
};

string shiftName = shiftHour switch
{
    < 6 or >= 22 => "Night",
    < 14 => "Morning",
    _ => "Evening",
};

string chargeState;
if (battery < 20)
{
    chargeState = "Charge now";
}
else if (battery < 50)
{
    chargeState = "Low";
}
else
{
    chargeState = "Ready";
}

bool canDeliver = online && battery >= 30 && weightKg <= 25;
Console.WriteLine(canDeliver ? "Cleared for delivery" : "Hold at the dock");

string hours;
switch (dayName)
{
    case "Sat":
        hours = "Half day";
        break;
    case "Sun":
        hours = "Closed";
        break;
    default:
        hours = "Full day";
        break;
}

Console.WriteLine($"{tier} parcel, {shiftName} shift, {chargeState}, {hours}");

Depot.Show("tier", tier);
Depot.Show("shiftName", shiftName);
Depot.Show("chargeState", chargeState);
Depot.Show("canDeliver", canDeliver);
Depot.Show("hours", hours);`,
      explanation:
        "The switch expressions test their arms top to bottom, so 12 kg skips < 5 and matches < 20, and hour 14 skips the Night and Morning arms. The if chain runs the first true branch only: battery 80 reaches the final else. canDeliver is a plain bool built with && and the ternary turns it into a message. The switch statement needs a break at the end of each section and a default for everything else.",
      hints: [
        { id: "h1", title: "Switch expressions", content: "string tier = weightKg switch { < 5 => \"Light\", < 20 => \"Standard\", _ => \"Heavy\" }; Arms are tried in order, and the last arm _ catches the rest. Do the same for shiftName; < 6 or >= 22 combines two patterns." },
        { id: "h2", title: "if chain and canDeliver", content: "Declare string chargeState; first, then assign it inside if (battery < 20) { ... } else if (battery < 50) { ... } else { ... }. For the bool: online && battery >= 30 && weightKg <= 25." },
        { id: "h3", title: "Ternary and switch statement", content: "Console.WriteLine(canDeliver ? \"Cleared for delivery\" : \"Hold at the dock\"); For the classic switch: switch (dayName) { case \"Sat\": hours = \"Half day\"; break; ... default: ...; break; } Declare string hours; before it." },
      ],
      tests: [
        {
          id: "t1",
          description: "tier comes from weightKg",
          assertionCode: js`assertEqual(scene.tier, "Standard", "tier (12 kg: not under 5, but under 20)");`,
        },
        {
          id: "t2",
          description: "shiftName uses the or-pattern for night hours",
          assertionCode: js`assertEqual(scene.shiftName, "Evening", "shiftName (hour 14 is not before 14, so it is not Morning)");`,
        },
        {
          id: "t3",
          description: "chargeState comes from an if / else if / else chain",
          assertionCode: js`assertEqual(scene.chargeState, "Ready", "chargeState (battery 80 is neither under 20 nor under 50)");`,
        },
        {
          id: "t4",
          description: "canDeliver is true and the ternary prints the message",
          assertionCode: js`
assertEqual(scene.canDeliver, true, "canDeliver (online, battery >= 30 and weightKg <= 25 are all true)");
assert(lines.includes("Cleared for delivery"), 'Print "Cleared for delivery" with canDeliver ? "Cleared for delivery" : "Hold at the dock".');
assert(!lines.includes("Hold at the dock"), 'Only one of the two messages should be printed.');`,
        },
        {
          id: "t5",
          description: "the switch statement sets the Saturday hours",
          assertionCode: js`assertEqual(scene.hours, "Half day", "hours (dayName is \"Sat\"; remember break after each case)");`,
        },
      ],
      unlocks: ["cs-rules"],
      checks: [
        {
          prompt: "Why does this not compile?\n\n~~~csharp\nint battery = 80;\nif (battery = 50) { Console.WriteLine(\"half\"); }\n~~~",
          question: {
            type: "choice",
            options: [
              "`=` assigns, and an `int` is not a `bool`, so it is not a valid condition",
              "`if` needs an `else`",
              "50 is too large",
              "`battery` must be `const`",
            ],
            answer: 0,
          },
          explanation: "A single `=` is an assignment and its value is the number 50. C# only accepts a `bool` in a condition, so the typo is caught at compile time. (In some other languages it silently assigns.)",
        },
        {
          prompt: "What is `tier`?\n\n~~~csharp\nint w = 3;\nstring tier;\nif (w < 20) tier = \"Standard\";\nelse if (w < 5) tier = \"Light\";\nelse tier = \"Heavy\";\n~~~",
          question: { type: "choice", options: ["Light", "Standard", "Heavy", "It does not compile"], answer: 1 },
          explanation: "Only the first branch whose condition is true runs. `3 < 20` is true, so `Standard` wins and the `Light` branch can never be reached. Put the narrowest test first.",
        },
        {
          prompt: "In `online && ExpensiveCheck()`, when is `ExpensiveCheck()` called?",
          question: { type: "choice", options: ["Always", "Only when `online` is true", "Only when `online` is false", "Never"], answer: 1 },
          explanation: "`&&` short-circuits. If the left side is `false` the whole expression must be `false`, so the right side is skipped. This is what makes patterns like `item != null && item.Length > 0` safe.",
        },
      ],
    },

    // ───────────────────────── 6 ─────────────────────────
    {
      id: "csharp-basics-6-loops",
      title: "Loops",
      minutes: 30,
      xp: 130,
      concepts: ["while", "for", "do-while", "break", "continue", "nested loops", "off-by-one"],
      learn: md`### Repeat without copy-paste

A loop runs a block of code again and again. Every loop answers three questions: where does it **start**, how long does it **keep going**, and how does each pass **move forward**?

### \`while\`: keep going as long as a condition holds

The condition is checked **before** every pass, so the body might run zero times.

~~~csharp
int charge = 100;
while (charge > 20)
{
    charge -= 15;       // something inside MUST change what the condition looks at
}
~~~

If nothing changes the condition you get an **infinite loop**. Here, a program that runs for more than a few seconds is stopped with a time-out message, which is also what would hang a real program.

### \`for\`: counting loops

\`for (start; condition; step)\` packs all three questions into one line.

~~~csharp
for (int stop = 1; stop <= 8; stop++)
{
    Console.WriteLine($"Patrol stop {stop}");
}
~~~

1. \`int stop = 1\` runs once, before the loop.
2. \`stop <= 8\` is checked before every pass.
3. \`stop++\` runs after every pass.

The counter exists only inside the loop. Counting down works too: \`for (int n = 5; n >= 1; n--)\`. To count from 0 up to *but not including* the end, use \`<\`; this is the usual shape for walking an array of length \`n\`: \`for (int i = 0; i < n; i++)\`.

### \`do\` / \`while\`: body first

~~~csharp
do
{
    Console.WriteLine("Scanning...");
} while (!scanDone);   // checked AFTER the body, so it always runs at least once
~~~

It is the right shape for "try, then decide whether to try again".

### \`break\` and \`continue\`

- \`break\` leaves the loop immediately.
- \`continue\` skips the rest of this pass and jumps to the next one.

~~~csharp
for (int dock = 1; dock <= 10; dock++)
{
    if (dock == 4) continue;      // dock 4 is under repair: skip it
    if (dock > 8) break;          // nothing beyond dock 8
    Console.WriteLine($"Dock {dock}");
}
~~~

### Nested loops

A loop inside a loop runs the inner loop completely for **each** pass of the outer one: 5 rows of 8 columns is 40 passes. This is how you walk a grid or draw a pattern.

~~~csharp
string rows = "";
for (int y = 0; y < 3; y++)
{
    for (int x = 0; x < 4; x++)
    {
        rows += "#";
    }
    rows += "\n";          // finish the row
}
Console.Write(rows);       // ####  ####  ####  (three lines)
~~~

### Which loop?

- You know how many times: \`for\`.
- You repeat until something happens: \`while\`.
- You must do it at least once: \`do\` / \`while\`.
- You are visiting every item of a collection: \`foreach\` (next lesson).

### Common mistakes

- **Off by one**: \`<=\` versus \`<\`. \`for (i = 1; i <= 8; ...)\` runs 8 times; \`for (i = 0; i <= 8; ...)\` runs 9.
- Forgetting to update the thing the condition checks, which gives an infinite loop.
- Changing the loop counter inside the body, which makes the loop hard to follow.
- Declaring the counter name twice in nested scopes. Use different names for the outer and inner counters.`,
      mission: md`The patrol robot walks the lane around the warehouse floor. Its charge drains a little on every lap, the docks along the wall must be checked in order, and the floor map itself is a grid you can draw with two loops.

When this lesson passes, the **Patrol route** panel draws your floor map and sends a robot around the lane you built. Press *Replay* on the stage to watch it again.`,
      tasks: [
        "With a for loop print Patrol stop 1 to Patrol stop 8 (one per line) and add 3 meters for every stop into int meters (24 in total)",
        "With a while loop start int charge = 100 and subtract 15 per lap until charge is 20 or less, counting the laps in lapsOnCharge. Print 6 laps before recharge (10% left)",
        "With two nested for loops build string floorMap: 5 rows of 8 characters where the outer ring is # (lane) and the inside is . (floor), with \\n after each row. Print it with Console.Write",
        "Count the working docks: loop dock from 1 to 10, skip dock 4 with continue and stop after dock 8 with break (docksVisited is 7). Show meters, lapsOnCharge, floorMap and docksVisited",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 6: patrol the warehouse floor.
// 1. for loop: print "Patrol stop 1" ... "Patrol stop 8" and add 3 to int meters each time (24 at the end).
// 2. while loop: int charge = 100; int lapsOnCharge = 0;  while charge > 20 -> charge -= 15, lapsOnCharge++
//    Print:  6 laps before recharge (10% left)
// 3. Nested for loops (y 0..4, x 0..7) build string floorMap. A cell is "#" on the outer ring
//    (x == 0 || x == 7 || y == 0 || y == 4) and "." inside. Add "\n" after every row. Console.Write(floorMap);
// 4. int docksVisited = 0; for dock 1..10: continue on dock 4, break when dock > 8, otherwise count it.
// Depot.Show: meters, lapsOnCharge, floorMap, docksVisited
`,
      solutionAdd: cs`// Lesson 6: patrol the warehouse floor.
int meters = 0;
for (int stop = 1; stop <= 8; stop++)
{
    Console.WriteLine($"Patrol stop {stop}");
    meters += 3;
}

int charge = 100;
int lapsOnCharge = 0;
while (charge > 20)
{
    charge -= 15;
    lapsOnCharge++;
}
Console.WriteLine($"{lapsOnCharge} laps before recharge ({charge}% left)");

string floorMap = "";
for (int y = 0; y < 5; y++)
{
    for (int x = 0; x < 8; x++)
    {
        bool lane = x == 0 || x == 7 || y == 0 || y == 4;
        floorMap += lane ? "#" : ".";
    }
    floorMap += "\n";
}
Console.Write(floorMap);

int docksVisited = 0;
for (int dock = 1; dock <= 10; dock++)
{
    if (dock == 4) continue;    // under repair
    if (dock > 8) break;        // end of the wing
    docksVisited++;
}
Console.WriteLine($"Docks checked: {docksVisited}");

Depot.Show("meters", meters);
Depot.Show("lapsOnCharge", lapsOnCharge);
Depot.Show("floorMap", floorMap);
Depot.Show("docksVisited", docksVisited);`,
      explanation:
        "The for loop's three parts (start, condition, step) run the body exactly 8 times, so meters ends at 24. The while loop checks charge > 20 before each lap: 100, 85, 70, 55, 40 and 25 are all above 20, so six laps happen and charge ends at 10. The nested loops run the inner loop 8 times for each of the 5 outer passes, appending a character per cell and a newline per row. continue skips dock 4 and break stops at dock 9, so docks 1, 2, 3, 5, 6, 7 and 8 are counted: seven.",
      hints: [
        { id: "h1", title: "for and while", content: "for (int stop = 1; stop <= 8; stop++) { Console.WriteLine($\"Patrol stop {stop}\"); meters += 3; } and while (charge > 20) { charge -= 15; lapsOnCharge++; } Declare int meters = 0; and the charge variables before their loops." },
        { id: "h2", title: "The grid", content: "Outer loop over y from 0 to 4, inner loop over x from 0 to 7. Inside: floorMap += (x == 0 || x == 7 || y == 0 || y == 4) ? \"#\" : \".\"; After the inner loop (still inside the outer one) add floorMap += \"\\n\"; Print it once at the end with Console.Write." },
        { id: "h3", title: "continue and break", content: "Inside for (int dock = 1; dock <= 10; dock++): if (dock == 4) continue; if (dock > 8) break; docksVisited++; The order matters: skip and stop first, count last." },
      ],
      tests: [
        {
          id: "t1",
          description: "the for loop prints stops 1 to 8 and totals the meters",
          assertionCode: js`
const stops = lines.filter((l) => /^Patrol stop \d+$/.test(l));
assertEqual(stops.length, 8, "Number of 'Patrol stop N' lines (the loop should run 8 times: stop <= 8)");
assert(lines.includes("Patrol stop 1") && lines.includes("Patrol stop 8"), "The stops should be numbered 1 through 8.");
assertEqual(scene.meters, 24, "meters (3 meters for each of the 8 stops)");`,
        },
        {
          id: "t2",
          description: "the while loop counts laps until the charge is low",
          assertionCode: js`
assertEqual(scene.lapsOnCharge, 6, "lapsOnCharge (100 drops by 15 per lap while it is above 20)");
assert(lines.includes("6 laps before recharge (10% left)"), 'Print "6 laps before recharge (10% left)" using lapsOnCharge and charge.');`,
        },
        {
          id: "t3",
          description: "nested loops draw the floor map",
          assertionCode: js`
assert(typeof scene.floorMap === "string", "Send the map with Depot.Show(\"floorMap\", floorMap);");
assertEqual(scene.floorMap, "########\n#......#\n#......#\n#......#\n########\n", "floorMap (5 rows of 8, # on the outer ring, . inside, \\n after each row)");`,
        },
        {
          id: "t4",
          description: "the map is also printed to the console",
          assertionCode: js`
assert(lines.includes("########"), "Print the map with Console.Write(floorMap); so the console shows it too.");
assertEqual(lines.filter((l) => l === "#......#").length, 3, "The three inner rows should each look like #......#");`,
        },
        {
          id: "t5",
          description: "continue skips dock 4 and break stops after dock 8",
          assertionCode: js`assertEqual(scene.docksVisited, 7, "docksVisited (docks 1-8 without dock 4)");`,
        },
      ],
      unlocks: ["cs-patrol"],
      checks: [
        {
          prompt: "How many times does the body of `for (int i = 0; i < 5; i += 2)` run?",
          question: { type: "number", answer: 3 },
          explanation: "`i` takes the values 0, 2 and 4. After 4 the step makes it 6, which fails `i < 5`, so the body runs 3 times.",
        },
        {
          prompt: "An outer loop runs 3 times and contains an inner loop that runs 4 times. How many times does the inner body run in total?",
          question: { type: "number", answer: 12 },
          explanation: "The inner loop runs completely for each outer pass: 3 x 4 = 12. A 5 by 8 map is therefore 40 iterations.",
        },
        {
          prompt: "What is the difference between `break` and `continue`?",
          question: {
            type: "choice",
            options: [
              "`break` leaves the loop; `continue` skips to the next pass",
              "`break` skips to the next pass; `continue` leaves the loop",
              "Both leave the loop",
              "`break` only works in `while` loops",
            ],
            answer: 0,
          },
          explanation: "`break` ends the whole loop. `continue` abandons only the current pass and carries on with the next one (running the `for` step first). Both work in every kind of loop.",
        },
      ],
    },
  ],
};
