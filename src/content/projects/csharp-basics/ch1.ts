import type { Chapter } from "@/engine/types";
import { TYPES_DIVIDER } from "../../../engine/compose.ts";
import { cs, js, md } from "./util.ts";

/**
 * Chapter 1: First steps. Output, variables and types, and arithmetic, all as top-level statements.
 *
 * Lesson 1's starter also carries the provided `Depot` helper under the types divider (see
 * engine/compose.ts): it prints the `@scene {json}` lines that drive the live depot board.
 */

/** The helper every lesson relies on from lesson 2 on. Types go under the divider in a C# file. */
const DEPOT_HELPER = cs`// Provided by pockett: sends one value to the live depot board beside your editor.
// You will call Depot.Show("name", value) from lesson 2 on. Leave this class as it is.
static class Depot
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
  id: "first-steps",
  title: "First steps",
  blurb: "Make the console talk, store values with the right type, and let C# do the arithmetic.",
  lessons: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "csharp-basics-1-hello",
      title: "Hello, depot",
      minutes: 15,
      xp: 60,
      concepts: ["Console.WriteLine", "Console.Write", "strings", "escape sequences", "interpolation", "comments", "compiler errors"],
      learn: md`### A program is a list of instructions

Since C# 9 a program can be nothing but a list of **statements** in one file. You write the instructions top to bottom and they run in that order. (Older tutorials wrap everything in \`class Program\` and \`static void Main\`. That still works, and by lesson 11 you will know exactly what that wrapper is.)

~~~csharp
Console.WriteLine("Hello, depot!");
~~~

- \`Console\` is a ready-made toolbox for talking to the terminal.
- \`WriteLine\` is a **method**: a named action. The parentheses hold what it should work on, its **argument**.
- \`"Hello, depot!"\` is a **string literal**: text between double quotes.
- The \`;\` ends the statement. Nearly every C# statement ends with one.

You do not need \`using System;\` at the top. Modern projects switch on *implicit usings*, which quietly add the common namespaces (\`System\`, \`System.Linq\`, \`System.Collections.Generic\`...) for you.

### Write or WriteLine?

\`WriteLine\` prints the text and then moves to a **new line**. \`Write\` prints the text and stays where it is, so the next print continues the same line.

~~~csharp
Console.Write("Loading");
Console.Write("...");
Console.WriteLine(" done");   // Loading... done
Console.WriteLine("Next line");
~~~

You can print numbers directly too: \`Console.WriteLine(3);\`. C# turns the number into text for you.

### Escape sequences

Some characters cannot sit inside a string as they are, so you write a backslash and a letter. This is called an **escape sequence**.

- \`\n\` starts a new line
- \`\t\` is a tab
- \`\"\` is a double quote that belongs to the text (the string does not end there)
- \`\\\` is one backslash

~~~csharp
Console.WriteLine("Rex says \"ready\"");   // Rex says "ready"
Console.WriteLine("Dock A\tOnline");        // Dock A    Online
Console.WriteLine("C:\\depot\\logs");       // C:\depot\logs
~~~

### Interpolated strings: \`$"..."\`

Put a \`$\` in front of the opening quote and anything inside \`{ }\` is **evaluated** and pasted into the text. The braces can hold a calculation, not only a name.

~~~csharp
Console.WriteLine($"2 + 3 = {2 + 3}");     // 2 + 3 = 5
Console.WriteLine($"Braces: {{ and }}");     // Braces: { and }
~~~

Without the \`$\`, the braces are just characters and print literally. Interpolation is the everyday way to build messages in modern C#, and you will use it in every lesson from now on.

### Comments

Anything after \`//\` on a line is ignored by the computer and is there for people. Use comments to explain *why*, not to repeat the code. \`/* ... */\` covers several lines.

### When it will not compile

C# is a **compiled** language. pockett hands your whole file to the compiler first, and if any line is wrong *nothing runs*. You get a message such as:

~~~text
Program.cs(3,31): error CS1002: ; expected
~~~

Read it left to right: the file, then **(line, column)**, then an error code, then a plain-language reason. The real mistake is often at the end of the line above, because the compiler only notices when it reaches the next statement. The stage on the right shows the same message with the line number.

### The \`Depot\` class at the bottom of the file

Under the line that says *type declarations go below this line* you will find a small helper called \`Depot\`. In C# with top-level statements, all your statements must come first and type declarations such as classes go after them. The helper is how your program sends values to the live board. From lesson 2 you will call \`Depot.Show("name", value)\`; for now just leave it alone.

### Common mistakes

- Forgetting the \`;\` at the end of a statement.
- Using single quotes for text. \`'ready'\` is a compile error; single quotes are for one **character**, like \`'A'\`.
- Wrong capitalisation. C# is case-sensitive: \`Console.Writeline\` and \`console.WriteLine\` do not exist.
- Forgetting the \`$\`, so the output shows \`{2 + 3}\` instead of \`5\`.`,
      mission: md`Welcome to **Cinder Street Depot**, a warehouse where small robots carry parcels from the dock to the shelves. The depot has a control room but no software yet. You are going to write all of it, one lesson at a time, in a single growing C# program.

Every control room starts with a console. Make the depot print its name, a status line and a parcel count. When you pass this lesson the **Console** powers on: everything your program prints appears on the stage, in the same order.`,
      tasks: [
        "Print the depot name on its own line: Cinder Street Depot",
        "Use Console.Write twice (or Write and then WriteLine) so that Robots online: 3 ends up on ONE line",
        "Print the line Rex says \"ready\" with real quote marks, using the \\\" escape",
        "Print Parcels today: 42 with an interpolated string, and let C# add 40 + 2 inside the braces",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 1: make the depot console talk. Add your statements below, in this order.
// 1. Console.WriteLine the depot name:  Cinder Street Depot
// 2. Console.Write("Robots online: ") then print 3, so both land on one line.
// 3. Print  Rex says "ready"  (the quote marks are part of the text).
// 4. Print  Parcels today: 42  using $"..." and {40 + 2}.
// This first line is a placeholder so the file builds. Replace it with your own.
Console.WriteLine("TODO: print the depot name here");

${TYPES_DIVIDER}

${DEPOT_HELPER}`,
      solutionAdd: cs`// Lesson 1: the depot console talks.
Console.WriteLine("Cinder Street Depot");
Console.Write("Robots online: ");
Console.WriteLine(3);
Console.WriteLine("Rex says \"ready\"");
Console.WriteLine($"Parcels today: {40 + 2}");

${TYPES_DIVIDER}

${DEPOT_HELPER}`,
      explanation:
        "WriteLine ends the line, Write does not, so Write(\"Robots online: \") followed by WriteLine(3) produces one line. The backslash-quote escape lets a quote mark live inside a string without ending it. In $\"Parcels today: {40 + 2}\" the braces are evaluated, so C# prints 42 instead of the characters {40 + 2}. The Depot class stays below the divider because C# requires every top-level statement to come before any type declaration.",
      hints: [
        { id: "h1", title: "Statements", content: "Each instruction is a statement ending in a semicolon, for example: Console.WriteLine(\"Cinder Street Depot\"); Put the four statements under the comment block, above the divider line." },
        { id: "h2", title: "One line from two calls", content: "Console.Write(\"Robots online: \") prints without moving to a new line, so a second call continues on the same line. A number needs no quotes: Console.WriteLine(3)." },
        { id: "h3", title: "Quotes and interpolation", content: "Inside a string, write each quote that belongs to the text as \\\" . For the last line: Console.WriteLine($\"Parcels today: {40 + 2}\"); the $ must come before the opening quote." },
      ],
      tests: [
        {
          id: "t1",
          description: "The first line printed is the depot name",
          assertionCode: js`assertEqual(lines[0] ?? "(nothing printed yet)", "Cinder Street Depot", "Line 1 should be the depot name");`,
        },
        {
          id: "t2",
          description: "Robots online: 3 is printed on a single line",
          assertionCode: js`assert(lines.includes("Robots online: 3"), 'No line is exactly "Robots online: 3". Print "Robots online: " with Console.Write (it stays on the line), then print 3 so it continues on the same line.');`,
        },
        {
          id: "t3",
          description: "The quote marks around ready are printed",
          assertionCode: js`assert(lines.includes('Rex says "ready"'), 'No line is exactly Rex says "ready" (with the quote marks). Inside a C# string write each quote as \\" (a backslash, then the quote).');`,
        },
        {
          id: "t4",
          description: "Interpolation adds 40 + 2 inside the braces",
          assertionCode: js`assert(lines.includes("Parcels today: 42"), 'No line is exactly "Parcels today: 42". Use an interpolated string, $"Parcels today: {40 + 2}", with the $ before the opening quote.');`,
        },
        {
          id: "t5",
          description: "The four lines come out in the order of the tasks",
          assertionCode: js`
const want = ["Cinder Street Depot", "Robots online: 3", 'Rex says "ready"', "Parcels today: 42"];
const at = want.map((w) => lines.indexOf(w));
assert(at.every((i) => i >= 0), "Print all four lines first, then check their order.");
assert(at.every((v, i) => i === 0 || v > at[i - 1]), "The four lines are all there but in a different order. Print them in the order of the tasks.");`,
        },
      ],
      unlocks: ["cs-console"],
      checks: [
        {
          prompt: "What does this print?\n\n~~~csharp\nConsole.Write(\"A\");\nConsole.WriteLine(\"B\");\nConsole.WriteLine(\"C\");\n~~~",
          question: {
            type: "choice",
            options: ["AB on one line, then C on the next line", "A, B and C on three separate lines", "ABC on one line", "A on one line, then BC on the next line"],
            answer: 0,
          },
          explanation: "`Write` leaves the cursor where it is, so `B` continues on the same line as `A`. `WriteLine` then ends that line. `C` is printed on the next one.",
        },
        {
          prompt: "Which statement prints `Total: 7`, letting C# compute the 7 from `3 + 4`?",
          question: {
            type: "choice",
            options: [
              "`Console.WriteLine(\"Total: {3 + 4}\");`",
              "`Console.WriteLine($\"Total: {3 + 4}\");`",
              "`Console.WriteLine('Total: ' + 3 + 4);`",
              "`console.writeline($\"Total: {3 + 4}\");`",
            ],
            answer: 1,
          },
          explanation: "Only the second one has the `$` that makes the braces evaluate. Without it the braces print literally, single quotes are for a single `char`, and C# is case-sensitive so `console.writeline` does not exist.",
        },
      ],
    },

    // ───────────────────────── 2 ─────────────────────────
    {
      id: "csharp-basics-2-variables",
      title: "Variables and types",
      minutes: 20,
      xp: 80,
      concepts: ["variables", "int", "double", "bool", "char", "string", "var", "const", "static typing"],
      learn: md`### A variable is a labelled box with a type

A **variable** stores a value under a name so you can use it again. In C# every variable also has a **type** that says what kind of value fits in the box, and the type can never change.

~~~csharp
int battery = 80;
string robotName = "Rex";
Console.WriteLine($"{robotName} has {battery}% battery");
~~~

The pattern is \`type name = value;\`. Reading it aloud: *"an int called battery, set to 80"*. Assign a new value later with just the name: \`battery = 65;\`.

### The types you will use every day

- \`int\`: whole numbers from about -2.1 billion to +2.1 billion. \`int parcels = 47;\`
- \`long\`: whole numbers when \`int\` is too small. \`long views = 5_000_000_000;\` (underscores are only for readability)
- \`double\`: numbers with a fractional part, about 15 digits of precision. \`double speed = 1.5;\`
- \`decimal\`: exact base-10 numbers, the right choice for money. The literal needs an \`m\`: \`decimal fee = 2.50m;\`
- \`bool\`: \`true\` or \`false\`, in lower case. It prints as \`True\` and \`False\`.
- \`char\`: exactly one character in **single quotes**: \`char grade = 'A';\`
- \`string\`: text in **double quotes**: \`string robotName = "Rex";\`

How the literal is written decides its type: \`3\` is an \`int\`, \`3.0\` is a \`double\`, \`3.0m\` is a \`decimal\`, \`3.0f\` is a \`float\` (a smaller, less precise cousin of \`double\`), \`'3'\` is a \`char\` and \`"3"\` is a \`string\`.

### Static typing: the compiler is your first tester

Because the type is fixed, the compiler checks every assignment before the program ever runs.

~~~csharp
int level = 3;
level = "high";     // error CS0029: Cannot implicitly convert type 'string' to 'int'
int whole = 3.9;    // error CS0266: Cannot implicitly convert type 'double' to 'int'
~~~

C# refuses to quietly throw away the \`.9\`. If you really want to drop the fraction you must say so with a cast, which lesson 3 covers.

### \`var\`: let the compiler infer the type

\`var\` means "work out the type from the value on the right". It is **not** a "no type" variable. The type is decided once and stays fixed.

~~~csharp
var chargeCycles = 12;       // an int, exactly as if you had written int
var robotName = "Rex";       // a string
chargeCycles = 13;           // fine
chargeCycles = "many";       // error: it is still an int
~~~

A \`var\` must be given a value on the same line, since there is nothing to infer from otherwise. Use \`var\` when the type is obvious from the right-hand side, and write the type out when it makes the code easier to read.

### \`const\`: values that never change

A **constant** is set once and can never be reassigned. The compiler enforces it, which protects you from accidentally changing a value you meant to keep.

~~~csharp
const int MaxBattery = 100;
MaxBattery = 90;     // error CS0131: The left-hand side of an assignment must be a variable
~~~

### Names

- Letters, digits and underscores; it cannot start with a digit; no spaces. Names are case-sensitive: \`battery\` and \`Battery\` are two different variables.
- By convention local variables are \`camelCase\` (\`robotName\`) and constants, types and methods are \`PascalCase\` (\`MaxBattery\`).
- Choose names that say what the value *means*: \`battery\`, not \`b\`.

### Declare before you read

A variable must be given a value before you read it. \`int total; Console.WriteLine(total);\` fails with *Use of unassigned local variable*.

### Common mistakes

- Using double quotes for a \`char\` or single quotes for a \`string\`.
- Writing \`decimal fee = 2.50;\`. The literal is a \`double\`, so you need \`2.50m\`.
- Expecting \`var\` to let a variable change type.
- Declaring the same name twice in one scope. Assign to the existing variable instead: write \`battery = 70;\`, not \`int battery = 70;\` a second time.`,
      mission: md`Rex is the depot's first robot and he needs a spec sheet. A robot's name, battery, speed, online status and grade are five different kinds of data, and each one deserves the right type.

You will store them, print a status line, and send them to the board with \`Depot.Show(...)\`. When this lesson passes, the **Robot card** lights up with Rex's battery bar, speed and status.`,
      tasks: [
        "Declare const int MaxBattery = 100; and these variables: string robotName (any name), int battery = 80, double speed = 1.5, bool online = true, char grade = 'A'",
        "Declare var chargeCycles = 12; (let the compiler infer the type)",
        "Print: <name> | battery 80/100 | speed 1.5 m/s | online: True | grade A, built with ONE interpolated string",
        "Send every value to the board with Depot.Show using the keys robotName, battery, maxBattery, speed, online, grade and chargeCycles",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 2: give Rex a spec sheet. Use the right type for each value.
// const int MaxBattery = 100;
// string robotName   (any name you like)
// int    battery = 80
// double speed   = 1.5
// bool   online  = true
// char   grade   = 'A'
// var    chargeCycles = 12
// Then print one status line, for example:  Rex | battery 80/100 | speed 1.5 m/s | online: True | grade A
// Finally call Depot.Show("robotName", robotName); and so on for every value.
// The keys are: robotName, battery, maxBattery, speed, online, grade, chargeCycles.
`,
      solutionAdd: cs`// Lesson 2: Rex's spec sheet.
const int MaxBattery = 100;
string robotName = "Rex";
int battery = 80;
double speed = 1.5;
bool online = true;
char grade = 'A';
var chargeCycles = 12;

Console.WriteLine($"{robotName} | battery {battery}/{MaxBattery} | speed {speed} m/s | online: {online} | grade {grade}");

Depot.Show("robotName", robotName);
Depot.Show("battery", battery);
Depot.Show("maxBattery", MaxBattery);
Depot.Show("speed", speed);
Depot.Show("online", online);
Depot.Show("grade", grade);
Depot.Show("chargeCycles", chargeCycles);`,
      explanation:
        "Each value gets the type that fits it: int for whole numbers, double for 1.5, bool for yes/no, char for one letter in single quotes and string for text. The const cannot be reassigned. var chargeCycles = 12 is an int because 12 is an int literal. The status line shows that a bool prints as True (capital T) and that one interpolated string can hold many values.",
      hints: [
        { id: "h1", title: "Declaring", content: "The pattern is type name = value; for example: int battery = 80; and double speed = 1.5; A constant starts with const: const int MaxBattery = 100;" },
        { id: "h2", title: "Quotes and var", content: "A char uses single quotes ('A'), a string uses double quotes (\"Rex\"). For the inferred one, write: var chargeCycles = 12;" },
        { id: "h3", title: "The status line and Show", content: "Console.WriteLine($\"{robotName} | battery {battery}/{MaxBattery} | speed {speed} m/s | online: {online} | grade {grade}\"); then one Depot.Show(\"battery\", battery); per value. The key is the text in quotes, the value is your variable." },
      ],
      tests: [
        {
          id: "t1",
          description: "The status line shows every value in the right format",
          assertionCode: js`
const line = lines.find((l) => l.includes("| battery"));
assert(line, "Print a status line like: Rex | battery 80/100 | speed 1.5 m/s | online: True | grade A");
assert(/^\S.* \| battery 80\/100 \| speed 1\.5 m\/s \| online: True \| grade A$/.test(line), "The status line is not in the expected shape. Expected: <name> | battery 80/100 | speed 1.5 m/s | online: True | grade A. You printed: " + line);`,
        },
        {
          id: "t2",
          description: "robotName is sent to the board as text",
          assertionCode: js`assert(typeof scene.robotName === "string" && scene.robotName.trim().length > 0, "Call Depot.Show(\"robotName\", robotName); with a non-empty name.");`,
        },
        {
          id: "t3",
          description: "battery is 80 and the MaxBattery constant is 100",
          assertionCode: js`
assertEqual(scene.battery, 80, "battery");
assertEqual(scene.maxBattery, 100, "maxBattery (send the const with Depot.Show(\"maxBattery\", MaxBattery))");`,
        },
        {
          id: "t4",
          description: "speed is a double, online a bool, grade a char",
          assertionCode: js`
assertEqual(scene.speed, 1.5, "speed (a double, so it keeps its .5)");
assertEqual(scene.online, true, "online (a bool, written true in C#)");
assertEqual(scene.grade, "A", "grade (a char, written 'A' with single quotes)");`,
        },
        {
          id: "t5",
          description: "chargeCycles is 12, declared with var",
          assertionCode: js`assertEqual(scene.chargeCycles, 12, "chargeCycles (var chargeCycles = 12; then Depot.Show(\"chargeCycles\", chargeCycles);)");`,
        },
      ],
      unlocks: ["cs-robot"],
      checks: [
        {
          prompt: "Which of these lines does **not** compile?",
          question: {
            type: "choice",
            options: ["`int count = 7;`", "`double price = 2.5;`", "`int whole = 3.9;`", "`var name = \"Rex\";`"],
            answer: 2,
          },
          explanation: "`3.9` is a `double` and an `int` cannot hold a fraction, so C# stops you with error CS0266 instead of silently dropping the `.9`. If you really want 3 you must cast on purpose: `(int)3.9`.",
        },
        {
          prompt: "After `var level = 3;`, what happens when you write `level = \"high\";`?",
          question: {
            type: "choice",
            options: ["Compile error: level is an int and stays an int", "level becomes a string", "It runs, because var means any type", "It compiles but crashes when run"],
            answer: 0,
          },
          explanation: "`var` only saves you from writing the type. The compiler infers `int` from `3` and the variable is an `int` forever. C# is statically typed, so the mistake is caught before the program runs.",
        },
        {
          prompt: "What does `Console.WriteLine(true);` print?",
          question: { type: "choice", options: ["true", "True", "TRUE", "1"], answer: 1 },
          explanation: "The `bool` literals are written `true` and `false`, but when a bool is turned into text .NET capitalises it: `True` and `False`.",
        },
      ],
    },

    // ───────────────────────── 3 ─────────────────────────
    {
      id: "csharp-basics-3-numbers",
      title: "Arithmetic and number traps",
      minutes: 25,
      xp: 100,
      concepts: ["operators", "integer division", "remainder", "casting", "Math", "decimal vs double", "overflow"],
      learn: md`### The arithmetic operators

\`+\`, \`-\`, \`*\`, \`/\` and \`%\` (remainder) work as you expect, with multiplication and division before addition and subtraction. Use parentheses when you want a different order, or just to make the intent obvious.

~~~csharp
Console.WriteLine(2 + 3 * 4);     // 14
Console.WriteLine((2 + 3) * 4);   // 20
Console.WriteLine(17 % 5);        // 2   (17 = 3 * 5 + 2)
~~~

\`x += 5\` is shorthand for \`x = x + 5\`, and \`x++\` adds one. The same exists for \`-=\`, \`*=\`, \`/=\` and \`--\`.

### Trap 1: integer division

When **both** sides are whole numbers, \`/\` gives a whole number: the fraction is thrown away (truncated toward zero), not rounded.

~~~csharp
Console.WriteLine(7 / 2);       // 3
Console.WriteLine(-7 / 2);      // -3
Console.WriteLine(7 / 2.0);     // 3.5   one side is a double, so the whole division is a double
Console.WriteLine(7 % 2);       // 1     the remainder tells you what was thrown away
~~~

The remainder operator is surprisingly useful: \`n % 2 == 0\` tests for even numbers, and \`hour % 24\` wraps around a clock.

### Casting: changing a value's type on purpose

A **cast** puts a type in parentheses in front of a value. Going from a wide type to a narrow one can lose information, so C# makes you ask for it.

~~~csharp
int totalKg = 156;
int parcels = 47;
double wrong = totalKg / parcels;           // 3      the division happened as ints, THEN became 3.0
double right = (double)totalKg / parcels;   // 3.3191...  one side is a double before dividing
int dropped = (int)3.9;                     // 3      a cast truncates, it does not round
~~~

The classic mistake is casting the *result* (\`(double)(a / b)\`) instead of one of the *inputs*. By then the damage is done.

### Rounding up with integers

How many crates of 6 do you need for 47 parcels? Plain division gives 7, but 7 crates only hold 42. Add \`size - 1\` before dividing to round **up**:

~~~csharp
int trips = (47 + 6 - 1) / 6;   // 8
int leftover = 47 % 6;          // 5 parcels in the last, partly empty crate
~~~

### The Math class

\`Math.Abs\`, \`Math.Max\`, \`Math.Min\`, \`Math.Pow\`, \`Math.Sqrt\`, \`Math.Floor\` and \`Math.Ceiling\` do what their names say. \`Math.Round(x, digits)\` rounds to a number of decimal places. By default .NET uses *banker's rounding* on exact halves: \`Math.Round(2.5)\` is **2** and \`Math.Round(3.5)\` is **4**, so the halves go to the nearest even number.

### Trap 2: double is not exact

\`double\` stores numbers in binary, and a value like 0.1 has no exact binary form.

~~~csharp
Console.WriteLine(0.1 + 0.2);       // 0.30000000000000004
Console.WriteLine(0.1m + 0.2m);     // 0.3
~~~

For measurements, a tiny error does not matter. For **money**, use \`decimal\`, which stores base-10 digits exactly (and remember the \`m\` suffix). Never compare two doubles with \`==\` after calculations.

### Trap 3: overflow

An \`int\` has a fixed size. Go past its limit and it **wraps around silently** to the other end.

~~~csharp
int big = int.MaxValue;     // 2147483647
big++;                      // -2147483648   no error, no warning
long safe = (long)int.MaxValue + 1;   // 2147483648   a long has room
~~~

If the compiler can see the overflow while compiling (\`int.MaxValue + 1\` written directly), it refuses with error CS0220. A \`checked(...)\` expression or block turns *runtime* overflow into an exception instead of a wrong answer. When numbers can get large, such as byte sizes or totals, pick \`long\`.

### Dividing by zero

\`5 / 0\` with ints throws a \`DivideByZeroException\` and stops the program. With doubles you get \`Infinity\` (or \`NaN\` for \`0.0 / 0.0\`) and the program carries on. Check the divisor first.

### Common mistakes

- Dividing two ints and expecting a fraction.
- Casting after the division instead of before.
- Using \`double\` for money.
- Forgetting that \`(int)\` truncates, so \`(int)-2.9\` is \`-2\`.`,
      mission: md`The depot has to plan deliveries: 47 parcels weighing 156 kg in total, and each crate carries 6. How many trips? How many parcels are left in the last crate? What is the average weight, and what does it cost?

Real arithmetic is full of traps, so you will walk into each one on purpose and avoid it. When this lesson passes, the **Dispatch calculator** lights up with your numbers.`,
      tasks: [
        "Work out trips (how many crates are needed, rounded UP) and leftover (parcels in the last crate) from parcels and crateSize using / and %",
        "Compute avgKg: totalKg divided by parcels with a (double) cast, rounded to 2 decimals with Math.Round",
        "Compute decimal fee = trips * 2.50m and print: 8 trips, 5 parcels left over  and then  Average 3.32 kg, fee 20.00. Also print 0.1 + 0.2 as a double and 0.1m + 0.2m as a decimal",
        "Show the overflow trap: int wrapped = int.MaxValue; wrapped++; and a long safe that holds int.MaxValue + 1. Send all the results to the board",
      ],
      starterAdd: cs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 3: plan the day's deliveries.
int parcels = 47;
int crateSize = 6;
int totalKg = 156;
Depot.Show("parcels", parcels);
Depot.Show("crateSize", crateSize);

// 1. int trips    = crates needed, rounded UP     -> 8   (hint: add crateSize - 1 before dividing)
//    int leftover = parcels in the last crate     -> 5   (hint: %)
// 2. double avgKg = average weight, 2 decimals    -> 3.32 (cast ONE side to double before dividing)
// 3. decimal fee  = trips * 2.50m                 -> 20.00
//    Print:  8 trips, 5 parcels left over
//    Print:  Average 3.32 kg, fee 20.00
//    Print 0.1 + 0.2, then 0.1m + 0.2m, to see why money uses decimal.
// 4. int wrapped = int.MaxValue; then wrapped++;
//    long safe = (long)int.MaxValue + 1;
// Depot.Show: trips, leftover, avgKg, fee, wrapped, safe
`,
      solutionAdd: cs`// Lesson 3: plan the day's deliveries.
int parcels = 47;
int crateSize = 6;
int totalKg = 156;
Depot.Show("parcels", parcels);
Depot.Show("crateSize", crateSize);

int trips = (parcels + crateSize - 1) / crateSize;   // round up
int leftover = parcels % crateSize;
double avgKg = Math.Round((double)totalKg / parcels, 2);
decimal fee = trips * 2.50m;

Console.WriteLine($"{trips} trips, {leftover} parcels left over");
Console.WriteLine($"Average {avgKg} kg, fee {fee}");
Console.WriteLine(0.1 + 0.2);
Console.WriteLine(0.1m + 0.2m);

int wrapped = int.MaxValue;
wrapped++;                              // wraps around silently
long safe = (long)int.MaxValue + 1;     // a long has room

Depot.Show("trips", trips);
Depot.Show("leftover", leftover);
Depot.Show("avgKg", avgKg);
Depot.Show("fee", fee);
Depot.Show("wrapped", wrapped);
Depot.Show("safe", safe);`,
      explanation:
        "(parcels + crateSize - 1) / crateSize rounds integer division up: (47 + 5) / 6 = 8. The remainder 47 % 6 is the 5 parcels in the last crate. Casting ONE side to double before dividing keeps the fraction, and Math.Round(..., 2) trims it to 3.32. The fee is a decimal so it prints 20.00 and 0.1m + 0.2m is exactly 0.3, unlike the double sum. An int that goes past int.MaxValue wraps to -2147483648; a long has room for 2147483648.",
      hints: [
        { id: "h1", title: "Rounding up", content: "Integer division throws the remainder away. To round up, add crateSize - 1 first: int trips = (parcels + crateSize - 1) / crateSize; The leftover is parcels % crateSize." },
        { id: "h2", title: "A cast before dividing", content: "double avgKg = Math.Round((double)totalKg / parcels, 2); The cast must be on a number going INTO the division. For money write decimal fee = trips * 2.50m; (the m matters)." },
        { id: "h3", title: "Overflow", content: "int wrapped = int.MaxValue; wrapped++; gives -2147483648 without any error. For the safe value, cast first so the addition happens in long: long safe = (long)int.MaxValue + 1;" },
      ],
      tests: [
        {
          id: "t1",
          description: "trips rounds up and leftover is the remainder",
          assertionCode: js`
assertEqual(scene.trips, 8, "trips (47 parcels in crates of 6 need 8 trips: round UP, not down to 7)");
assertEqual(scene.leftover, 5, "leftover (47 % 6)");`,
        },
        {
          id: "t2",
          description: "avgKg is a real fraction, rounded to 2 decimals",
          assertionCode: js`
assert(typeof scene.avgKg === "number", "Send avgKg with Depot.Show(\"avgKg\", avgKg);");
assert(scene.avgKg !== 3, "avgKg is 3, so the division happened between two ints. Cast one side to double first: (double)totalKg / parcels");
assertClose(scene.avgKg, 3.32, 0.0001, "avgKg should be 156 / 47 rounded to 2 decimals");`,
        },
        {
          id: "t3",
          description: "fee is a decimal and the totals are printed",
          assertionCode: js`
assertEqual(scene.fee, 20, "fee (trips * 2.50m)");
assert(lines.includes("8 trips, 5 parcels left over"), 'Print the line "8 trips, 5 parcels left over".');
assert(lines.includes("Average 3.32 kg, fee 20.00"), 'Print "Average 3.32 kg, fee 20.00". If it prints 20 without the .00, fee is a double: declare it as decimal and write the literal as 2.50m.');`,
        },
        {
          id: "t4",
          description: "double and decimal disagree about 0.1 + 0.2",
          assertionCode: js`
assert(lines.includes("0.30000000000000004"), "Print 0.1 + 0.2 as doubles (Console.WriteLine(0.1 + 0.2);) to see the binary rounding error.");
assert(lines.includes("0.3"), "Print 0.1m + 0.2m as decimals (Console.WriteLine(0.1m + 0.2m);) to see an exact 0.3.");`,
        },
        {
          id: "t5",
          description: "an int wraps around when it overflows; a long does not",
          assertionCode: js`
assertEqual(scene.wrapped, -2147483648, "wrapped (int.MaxValue plus one, stored in an int)");
assertEqual(scene.safe, 2147483648, "safe (cast to long BEFORE adding one)");`,
        },
      ],
      unlocks: ["cs-dispatch"],
      checks: [
        {
          prompt: "Which expression gives `3.5`?",
          question: {
            type: "choice",
            options: ["`7 / 2`", "`7 / 2.0`", "`(double)(7 / 2)`", "`7 % 2`"],
            answer: 1,
          },
          explanation: "With one side a `double`, the whole division is done as a `double`. `7 / 2` is `3` (both ints), `(double)(7 / 2)` converts the already-truncated `3` and `7 % 2` is the remainder `1`.",
        },
        {
          prompt: "What does this do?\n\n~~~csharp\nint big = int.MaxValue;\nbig++;\n~~~",
          question: {
            type: "choice",
            options: ["Throws an exception", "Makes big 2147483648", "Silently wraps big to -2147483648", "Fails to compile"],
            answer: 2,
          },
          explanation: "Ordinary `int` arithmetic is *unchecked*: past the maximum it wraps to the minimum with no warning. Writing `int.MaxValue + 1` directly is caught by the compiler, but a running variable is not. Use `long` or a `checked` block when overflow would be a bug.",
        },
        {
          prompt: "Why use `decimal` rather than `double` for prices?",
          question: {
            type: "choice",
            options: [
              "decimal is faster",
              "decimal stores base-10 digits exactly, so 0.1m + 0.2m is exactly 0.3m",
              "double cannot store numbers with a fraction",
              "decimal never overflows",
            ],
            answer: 1,
          },
          explanation: "Doubles are binary fractions, so values like 0.1 are stored approximately and errors can add up. Decimals trade speed for exact decimal digits, which is what money needs.",
        },
      ],
    },
  ],
};
