import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { cpp, js, md } from "./util.ts";

/**
 * Chapter 1: First steps. Output, variables and types, arithmetic, and reading input.
 *
 * Lesson 1's starter carries the whole file skeleton: the provided `scene(...)` helper and
 * `int main() { }` (see engine/compose.ts: from lesson 2 on, each lesson's text is appended to the
 * end of main's body). `#include <iostream>` is deliberately left for the learner to type.
 */

/** The helper every lesson relies on from lesson 2 on: prints one `@scene {json}` line. */
export const SCENE_HELPER = cpp`// ───── Provided by pockett: sends values to the live reactor board ─────
// From lesson 2 on you call  scene("name", value);  to light up a panel on the board.
// It prints one line that starts with @scene. Leave this block exactly as it is.
#include <cstdio>
#include <string>
#include <type_traits>
#include <vector>

namespace board_detail {
inline std::string quote(const std::string& text) {
    std::string out = "\"";
    for (unsigned char c : text) {
        if (c == '"') out += "\\\"";
        else if (c == '\\') out += "\\\\";
        else if (c == '\n') out += "\\n";
        else if (c == '\r') out += "\\r";
        else if (c == '\t') out += "\\t";
        else if (c < 0x20) {
            char code[8];
            std::snprintf(code, sizeof code, "\\u%04x", c);
            out += code;
        } else out += static_cast<char>(c);
    }
    return out + "\"";
}
inline std::string json(bool v) { return v ? "true" : "false"; }
inline std::string json(char v) { return quote(std::string(1, v)); }
inline std::string json(const char* v) { return quote(v); }
inline std::string json(const std::string& v) { return quote(v); }
template <class T>
    requires(std::is_integral_v<T> && !std::is_same_v<T, bool> && !std::is_same_v<T, char>)
std::string json(T v) { return std::to_string(v); }
template <class T>
    requires std::is_floating_point_v<T>
std::string json(T v) {
    if (v - v != 0) return "null";  // NaN or infinity
    char text[40];
    std::snprintf(text, sizeof text, "%.15g", static_cast<double>(v));
    return text;
}
template <class T>
std::string json(const std::vector<T>& list) {
    std::string out = "[";
    for (const auto& item : list) {
        if (out.size() > 1) out += ", ";
        out += json(item);
    }
    return out + "]";
}
template <class Map>
    requires requires { typename Map::mapped_type; }
std::string json(const Map& map) {
    std::string out = "{";
    for (const auto& [name, value] : map) {
        if (out.size() > 1) out += ", ";
        out += quote(name) + ": " + json(value);
    }
    return out + "}";
}
}  // namespace board_detail

template <class T>
void scene(const std::string& key, const T& value) {
    std::string line = "@scene {" + board_detail::quote(key) + ": " + board_detail::json(value) + "}\n";
    std::fputs(line.c_str(), stdout);
}`;

export const chapter1: Chapter = {
  id: "first-steps",
  title: "First steps",
  blurb: "Make the control room talk, store readings with the right types, do the arithmetic and read what the operator types.",
  lessons: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "cpp-basics-1-hello",
      title: "Hello, control room",
      minutes: 15,
      xp: 60,
      concepts: ["#include", "main", "std::cout", "<<", "\\n vs std::endl", "string literals", "escape sequences", "comments", "compiler errors"],
      learn: md`### Every C++ program has a \`main\`

A C++ program is a list of **functions**, and the computer always starts with one of them, called \`main\`. Everything between its curly braces runs from top to bottom, one **statement** after another.

~~~cpp
#include <iostream>

int main() {
    std::cout << "Hello, control room!" << "\n";
}
~~~

Read it line by line:

- \`#include <iostream>\` pastes in the **header** that describes the input/output tools. Without it the compiler has never heard of \`std::cout\`. Lines starting with \`#\` are instructions for the *preprocessor*, which runs before the compiler, and they do not end with a semicolon.
- \`int main()\` declares the function called \`main\`. \`int\` means it hands back a whole number to the operating system when it finishes. \`{ ... }\` is its body.
- \`std::cout\` is **c**onsole **out**put. The \`std::\` in front says "the \`cout\` that lives in the standard library". All the standard tools (\`std::string\`, \`std::vector\`, ...) carry that prefix.
- \`<<\` is the **stream insertion operator**. Read it as "send this into the stream". You can chain as many as you like: \`std::cout << "Rods: " << 24 << "\n";\`
- \`"Hello, control room!"\` is a **string literal**: text between double quotes.
- The \`;\` ends the statement. Nearly every statement ends with one.

You never wrote \`return 0;\`. For \`main\` only, C++ adds it for you: reaching the closing brace means "everything went fine" (exit code 0).

### New line: \`\n\` or \`std::endl\`?

\`std::cout\` does **not** start a new line by itself. If you print two things in a row they glue together. To end a line, send a newline:

~~~cpp
std::cout << "Loading";
std::cout << "...";
std::cout << " done\n";        // Loading... done
std::cout << "Next line\n";
~~~

\`std::endl\` also ends the line, but it additionally **flushes** the output: it forces any text waiting in the stream's buffer to be written *now*. Flushing is slow compared to the print itself, so in a loop that prints thousands of lines \`"\n"\` can be many times faster. Use \`"\n"\` by default and \`std::endl\` only when you really need the text to appear immediately (for example just before something risky).

### Escape sequences

Some characters cannot sit inside a string literal as they are, so you write a backslash followed by a letter. This is an **escape sequence**.

- \`\n\` starts a new line
- \`\t\` is a tab
- \`\"\` is a double quote that belongs to the text (the literal does not end there)
- \`\\\` is one backslash

~~~cpp
std::cout << "Operator says \"ready\"\n";    // Operator says "ready"
std::cout << "Loop A\tOnline\n";              // Loop A    Online
std::cout << "C:\\reactor\\logs\n";           // C:\reactor\logs
~~~

Single quotes are for **one character** (\`'A'\`), double quotes for text. \`"A"\` and \`'A'\` are different things.

### Comments

Anything after \`//\` on a line is ignored by the compiler and exists for people. \`/* ... */\` can span several lines. Good comments explain *why*, not what: \`// 1 bar of margin before the relief valve opens\` is useful, \`// print the text\` is noise.

### When it will not compile

C++ is **compiled**: your whole file is turned into a program first, and if any line is wrong *nothing runs*. You get messages like these:

~~~text
main.cpp:14:5: error: 'cout' is not a member of 'std'
   14 |     std::cout << "Hello";
      |     ^~~
main.cpp:14:5: note: 'std::cout' is defined in header '<iostream>'; this is probably fixed by adding '#include <iostream>'
~~~

Read it left to right: the file, **line:column**, the kind (\`error\`), then a plain-language reason. The lines below show your own code with a \`^\` under the spot. Compilers are famous for long messages, but the **first** error is almost always the real one and the rest are echoes of it. Fix the first, build again.

Also remember that the compiler reports where it *noticed* the problem. A missing \`;\` is usually reported at the start of the *next* statement, so look at the end of the line above.

### The \`scene\` helper in your file

Below the comment block you will find a long section called *Provided by pockett*. It defines a function named \`scene\`. From lesson 2 on you call \`scene("coreTemp", coreTemp);\` and the value appears on the live reactor board next to the editor. You do not need to understand how it works yet (it uses features from the last chapters); just leave it alone. It sits **above** \`main\` because in C++ a function must be declared *before* the line that uses it. You will meet that rule again in lesson 8.

### Common mistakes

- Forgetting \`#include <iostream>\` (error: \`cout\` is not a member of \`std\`).
- Writing \`cout\` without \`std::\`. (Many tutorials write \`using namespace std;\` to avoid the prefix. It works for tiny programs, but it dumps hundreds of names into your code and invites clashes, so this course always writes \`std::\`.)
- Using \`>>\` instead of \`<<\` when printing. Remember the arrows point *into* \`cout\`.
- Forgetting the closing quote or the \`;\`.
- Expecting a new line without printing \`\n\`.`,
      mission: md`Helios-1 is a small fusion research reactor. It has a core, three coolant loops and 24 fuel rods, a lot of hardware and, so far, **no control software at all**. You are going to write all of it, one lesson at a time, in a single growing C++ program.

Every control room starts with a console. Make the reactor introduce itself: a title, a status line, the hardware counts, an operator message and a closing line. When you pass this lesson the **Control console** powers on, and everything your program prints appears on the board in the same order.`,
      tasks: [
        "Type #include <iostream> on the blank line under the first comment block at the top of the file",
        "In main, print the title on its own line: Helios-1 control software",
        "Print Core status: STANDBY using one statement with two string pieces joined by <<",
        "With ONE statement, print the two lines Coolant loops: 3 and Fuel rods: 24 (put the numbers in with <<, end each line with \"\\n\")",
        "Print Operator says \"ready\" with real quote marks using the \\\" escape",
        "Finish with Systems check complete, ending that line with std::endl",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 1: make the control room talk. There are two places to edit.
// A) Type  #include <iostream>  on the blank line just below this comment block,
//    so that the file knows what std::cout is.
// B) At the bottom of the file, inside main(), print the six lines from the task list.


${SCENE_HELPER}

int main() {
    // ─── ✏️ YOUR TURN ─── print your six lines here with std::cout.
    // Example shape:  std::cout << "text" << "\n";
}`,
      solutionAdd: cpp`// Reactor Core: the control software for the Helios-1 research reactor.
#include <iostream>

${SCENE_HELPER}

int main() {
    // Lesson 1: the control room talks.
    std::cout << "Helios-1 control software" << "\n";
    std::cout << "Core status: " << "STANDBY" << "\n";
    std::cout << "Coolant loops: " << 3 << "\n" << "Fuel rods: " << 24 << "\n";
    std::cout << "Operator says \"ready\"\n";
    std::cout << "Systems check complete" << std::endl;
}`,
      explanation:
        "#include <iostream> makes std::cout available. Each << sends one piece into the stream, so \"Core status: \" << \"STANDBY\" glues two pieces onto one line, and one statement can print several lines when it sends \"\\n\" in the middle. The escape \\\" puts a quote mark inside a string without ending it. std::endl ends the line like \"\\n\" and also flushes the stream, which is why it is kept for the moments you need output immediately. main needs no return 0; reaching its closing brace means success.",
      hints: [
        { id: "h1", title: "The include", content: "At the top, type exactly: #include <iostream> (angle brackets, no semicolon). Then inside main write one statement per line, for example: std::cout << \"Helios-1 control software\" << \"\\n\";" },
        { id: "h2", title: "Chaining <<", content: "You can chain many pieces in one statement: std::cout << \"Coolant loops: \" << 3 << \"\\n\" << \"Fuel rods: \" << 24 << \"\\n\"; Numbers need no quotes." },
        { id: "h3", title: "Quotes and endl", content: "A quote that belongs to the text is written \\\" so: std::cout << \"Operator says \\\"ready\\\"\\n\"; The last line: std::cout << \"Systems check complete\" << std::endl;" },
      ],
      tests: [
        {
          id: "t1",
          description: "The first line printed is the title",
          assertionCode: js`assertEqual(lines[0] ?? "(nothing printed yet)", "Helios-1 control software", "Line 1 should be the title");`,
        },
        {
          id: "t2",
          description: "Core status: STANDBY is printed on one line",
          assertionCode: js`assert(lines.includes("Core status: STANDBY"), 'No line is exactly "Core status: STANDBY". Join the two pieces with << inside one statement and end it with "\\n".');`,
        },
        {
          id: "t3",
          description: "The coolant loops and fuel rods lines come from one statement",
          assertionCode: js`
assert(lines.includes("Coolant loops: 3"), 'No line is exactly "Coolant loops: 3". Print "Coolant loops: ", then 3, then "\\n".');
assert(lines.includes("Fuel rods: 24"), 'No line is exactly "Fuel rods: 24". Continue the same statement with << "Fuel rods: " << 24 << "\\n".');`,
        },
        {
          id: "t4",
          description: "The quote marks around ready are printed",
          assertionCode: js`assert(lines.includes('Operator says "ready"'), 'No line is exactly Operator says "ready" (with the quote marks). Inside a C++ string write each quote as \\" (a backslash, then the quote).');`,
        },
        {
          id: "t5",
          description: "The closing line is printed",
          assertionCode: js`assert(lines.includes("Systems check complete"), 'No line is exactly "Systems check complete".');`,
        },
        {
          id: "t6",
          description: "The six lines come out in the order of the tasks",
          assertionCode: js`
const want = ["Helios-1 control software", "Core status: STANDBY", "Coolant loops: 3", "Fuel rods: 24", 'Operator says "ready"', "Systems check complete"];
const at = want.map((w) => lines.indexOf(w));
assert(at.every((i) => i >= 0), "Print all six lines first, then check their order.");
assert(at.every((v, i) => i === 0 || v > at[i - 1]), "The six lines are all there but in a different order. Print them in the order of the tasks.");`,
        },
      ],
      unlocks: ["rc-console"],
      checks: [
        {
          prompt: "What does this print?\n\n~~~cpp\nstd::cout << \"A\" << \"B\" << \"\\n\" << \"C\";\n~~~",
          question: {
            type: "choice",
            options: ["AB on one line, then C on the next line", "A, B and C on three separate lines", "ABC on one line", "Nothing: a statement can only send one piece"],
            answer: 0,
          },
          explanation: "Each `<<` sends the next piece into the stream in order. Only the `\"\\n\"` starts a new line, so `AB` ends the first line and `C` starts the second (with no newline after it).",
        },
        {
          prompt: "Which of these gives a compile error?",
          question: {
            type: "choice",
            options: [
              "`std::cout << \"Rods: \" << 24 << \"\\n\";`",
              "`std::cout << \"Say \\\"go\\\"\\n\";`",
              "`std::cout << 'Rods: ' << 24 << \"\\n\";`",
              "`std::cout << \"Rods\" << std::endl;`",
            ],
            answer: 2,
          },
          explanation: "Single quotes are for exactly one character, so `'Rods: '` is not valid. Use double quotes for text. The other three are fine: numbers need no quotes, `\\\"` puts a quote inside a string, and `std::endl` ends the line.",
        },
        {
          prompt: "What is the difference between `\"\\n\"` and `std::endl`?",
          question: {
            type: "choice",
            options: [
              "`std::endl` also flushes the output buffer, so it is slower",
              "`\"\\n\"` only works on Linux",
              "There is no difference at all",
              "`std::endl` prints two blank lines",
            ],
            answer: 0,
          },
          explanation: "Both end the line. `std::endl` additionally forces the buffered text out right away, which costs time. Default to `\"\\n\"` and reach for `std::endl` only when the text must appear immediately.",
        },
      ],
    },

    // ───────────────────────── 2 ─────────────────────────
    {
      id: "cpp-basics-2-variables",
      title: "Core readings: variables and types",
      minutes: 25,
      xp: 80,
      concepts: ["variables", "int", "double", "bool", "char", "std::string", "const", "auto", "initialization", "std::boolalpha"],
      learn: md`### A variable is a labelled box with a type

A **variable** stores a value under a name so you can use it again. In C++ every variable has a **type** that says what kind of value fits in the box, and the type can never change.

~~~cpp
int fuelRods = 24;
std::string reactorName = "Helios-1";
std::cout << reactorName << " has " << fuelRods << " rods\n";
~~~

The pattern is \`type name = value;\`. Read it aloud: *"an int called fuelRods, set to 24"*. Later you assign a new value with just the name: \`fuelRods = 23;\`.

### The types you will use every day

- \`int\`: whole numbers, usually 32 bits (about -2.1 billion to +2.1 billion). \`int fuelRods = 24;\`
- \`long long\`: whole numbers with room for about 9 quintillion. \`long long joules = 5000000000LL;\` (the \`LL\` marks the literal as a \`long long\`)
- \`double\`: numbers with a fractional part, about 15 digits of precision. \`double coreTemp = 420.5;\`
- \`float\`: a smaller, less precise cousin of \`double\`. Prefer \`double\` unless you have a reason.
- \`bool\`: \`true\` or \`false\`, in lower case.
- \`char\`: exactly **one** character in **single quotes**: \`char mode = 'R';\`
- \`std::string\`: text in **double quotes**: \`std::string reactorName = "Helios-1";\`

How the literal is written decides its type: \`3\` is an \`int\`, \`3.0\` is a \`double\`, \`3.0f\` is a \`float\`, \`'3'\` is a \`char\` and \`"3"\` is text.

### Printing a \`bool\` (and the sticky manipulator)

By default \`std::cout\` prints a \`bool\` as \`1\` or \`0\`. Send \`std::boolalpha\` into the stream and it prints \`true\` / \`false\` instead:

~~~cpp
bool plasmaOn = true;
std::cout << plasmaOn << "\n";                      // 1
std::cout << std::boolalpha << plasmaOn << "\n";    // true
~~~

\`std::boolalpha\` is a **manipulator**, and it is *sticky*: it changes the stream, so every bool you print afterwards is also spelled out until you send \`std::noboolalpha\`.

### \`const\`: values that never change

A **constant** is set once and can never be reassigned. The compiler enforces it, which protects you from accidentally changing a limit you meant to keep.

~~~cpp
const int maxTemp = 650;
maxTemp = 700;      // error: assignment of read-only variable 'maxTemp'
~~~

### \`auto\`: let the compiler work out the type

\`auto\` means "use the type of the value on the right". It is **not** a "no type" variable. The type is decided once and stays fixed.

~~~cpp
auto pressure = 2.4;     // a double, exactly as if you had written double
auto loops = 3;          // an int
auto name = "Helios";    // careful: this is a const char*, not a std::string!
~~~

A variable declared with \`auto\` must be given a value on the same line. Use it when the type is obvious from the right-hand side; write the type out when that makes the code easier to read.

### Names

Letters, digits and underscores; it cannot start with a digit; no spaces. Names are case-sensitive: \`coreTemp\` and \`CoreTemp\` are different variables. A name can be declared only **once** per scope: in this one growing \`main\`, every variable you create in any lesson needs a name nobody used before. Choose names that say what the value *means*: \`coreTemp\`, not \`t\`.

### Where C++ is looser than other languages

C++ will happily do some conversions silently:

~~~cpp
int whole = 3.9;     // compiles! whole is 3: the .9 is silently thrown away
int level = "high";  // error: invalid conversion from 'const char*' to 'int'
int safe{3.9};       // error: narrowing conversion of '3.9' from 'double' to 'int'
~~~

Curly-brace initialization (\`int safe{...}\`) refuses conversions that lose information, which makes it a good habit. Plain \`=\` is what you will see most often, so **you** have to remember that a double stored in an int loses its fraction.

### Uninitialized variables

~~~cpp
int total;                       // no value given
std::cout << total << "\n";      // undefined behaviour: could print anything
~~~

Reading a local variable that was never given a value is **undefined behaviour**: the program may print garbage, work by luck, or crash. Always give a variable a value when you create it.

### Common mistakes

- Single quotes for a string or double quotes for a \`char\`.
- Declaring the same name twice in one scope. Assign to the existing variable instead: \`fuelRods = 23;\`, not \`int fuelRods = 23;\` a second time.
- Expecting \`auto\` to let a variable change type.
- Forgetting that a \`bool\` prints as \`1\`/\`0\` without \`std::boolalpha\`.
- Reading a variable that was never initialized.`,
      mission: md`Helios-1 needs a spec sheet that the rest of the software can rely on. A reactor's name, core temperature, rod count, plasma state and operating mode are five different kinds of data, and each deserves the right type.

You will store them, print a status line, and send the values to the board with \`scene(...)\`. When this lesson passes, the **Core gauge** lights up: a dial for the core temperature, the pressure, the rods and the mode.`,
      tasks: [
        "Declare const int maxTemp = 650; and these variables: std::string reactorName = \"Helios-1\", double coreTemp = 420.5, int fuelRods = 24, bool plasmaOn = true, char mode = 'R'",
        "Declare two variables with auto: pressure set to 2.4 and loops set to 3",
        "Print ONE status line: Helios-1 | core 420.5 C | max 650 | rods 24 | plasma: true | mode R (use std::boolalpha so the bool prints as true)",
        "Send every value to the board with scene(...) using the keys reactorName, coreTemp, maxTemp, fuelRods, plasmaOn, mode, pressure and loops",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 2: give Helios-1 a spec sheet. Use the right type for each value.
// const int maxTemp = 650;
// std::string reactorName = "Helios-1";
// double coreTemp = 420.5;      int fuelRods = 24;
// bool plasmaOn = true;         char mode = 'R';
// auto pressure = 2.4;          auto loops = 3;
// Print one status line, exactly like:
//   Helios-1 | core 420.5 C | max 650 | rods 24 | plasma: true | mode R
// Then send every value to the board, for example:  scene("coreTemp", coreTemp);
// The keys are: reactorName, coreTemp, maxTemp, fuelRods, plasmaOn, mode, pressure, loops.
`,
      solutionAdd: cpp`// Lesson 2: Helios-1's spec sheet.
const int maxTemp = 650;
std::string reactorName = "Helios-1";
double coreTemp = 420.5;
int fuelRods = 24;
bool plasmaOn = true;
char mode = 'R';
auto pressure = 2.4;
auto loops = 3;

std::cout << reactorName << " | core " << coreTemp << " C | max " << maxTemp << " | rods " << fuelRods
          << " | plasma: " << std::boolalpha << plasmaOn << " | mode " << mode << "\n";

scene("reactorName", reactorName);
scene("coreTemp", coreTemp);
scene("maxTemp", maxTemp);
scene("fuelRods", fuelRods);
scene("plasmaOn", plasmaOn);
scene("mode", mode);
scene("pressure", pressure);
scene("loops", loops);`,
      explanation:
        "Each value gets the type that fits it: int for whole numbers, double for 420.5, bool for yes/no, char for one letter in single quotes and std::string for text. The const cannot be reassigned. auto pressure = 2.4 becomes a double and auto loops = 3 an int, because the compiler reads the literal. std::boolalpha is sticky: it makes the bool print as true instead of 1. One chained cout statement can hold many values, and scene(key, value) sends each variable to the board.",
      hints: [
        { id: "h1", title: "Declaring", content: "The pattern is type name = value; for example: int fuelRods = 24; and double coreTemp = 420.5; A constant starts with const: const int maxTemp = 650;" },
        { id: "h2", title: "Quotes and auto", content: "A char uses single quotes ('R'), a std::string uses double quotes (\"Helios-1\"). For the inferred ones write: auto pressure = 2.4; and auto loops = 3;" },
        { id: "h3", title: "The status line and scene", content: "std::cout << reactorName << \" | core \" << coreTemp << \" C | max \" << maxTemp << \" | rods \" << fuelRods << \" | plasma: \" << std::boolalpha << plasmaOn << \" | mode \" << mode << \"\\n\"; then one scene(\"coreTemp\", coreTemp); per value. The key is the text in quotes, the value is your variable." },
      ],
      tests: [
        {
          id: "t1",
          description: "The status line shows every value in the right format",
          assertionCode: js`
const line = lines.find((l) => l.includes("| core"));
assert(line, "Print a status line like: Helios-1 | core 420.5 C | max 650 | rods 24 | plasma: true | mode R");
assert(line === "Helios-1 | core 420.5 C | max 650 | rods 24 | plasma: true | mode R", "The status line is not in the expected shape. Expected: Helios-1 | core 420.5 C | max 650 | rods 24 | plasma: true | mode R. You printed: " + line + (/plasma: 1/.test(line) ? "  (a bool prints as 1 unless you send std::boolalpha first)" : ""));`,
        },
        {
          id: "t2",
          description: "reactorName is sent to the board as text",
          assertionCode: js`assertEqual(scene.reactorName, "Helios-1", "reactorName (call scene(\"reactorName\", reactorName); with the std::string)");`,
        },
        {
          id: "t3",
          description: "coreTemp is a double and maxTemp the constant 650",
          assertionCode: js`
assertEqual(scene.coreTemp, 420.5, "coreTemp (a double, so it keeps its .5)");
assertEqual(scene.maxTemp, 650, "maxTemp (send the const with scene(\"maxTemp\", maxTemp);)");`,
        },
        {
          id: "t4",
          description: "fuelRods is an int, plasmaOn a bool, mode a char",
          assertionCode: js`
assertEqual(scene.fuelRods, 24, "fuelRods (an int)");
assertEqual(scene.plasmaOn, true, "plasmaOn (a bool, written true in C++)");
assertEqual(scene.mode, "R", "mode (a char, written 'R' with single quotes)");`,
        },
        {
          id: "t5",
          description: "pressure and loops are declared with auto",
          assertionCode: js`
assertEqual(scene.pressure, 2.4, "pressure (auto pressure = 2.4; then scene(\"pressure\", pressure);)");
assertEqual(scene.loops, 3, "loops (auto loops = 3; then scene(\"loops\", loops);)");`,
        },
      ],
      unlocks: ["rc-core"],
      checks: [
        {
          prompt: "Which of these lines does **not** compile?",
          question: {
            type: "choice",
            options: ["`int count = 7;`", "`double price = 2.5;`", "`int level = \"high\";`", "`auto name = 3;`"],
            answer: 2,
          },
          explanation: "A string literal cannot be turned into an `int`, so the compiler stops with *invalid conversion from 'const char*' to 'int'*. Note that `int whole = 3.9;` would compile (and silently store 3), which is one reason to enable warnings or use `{}` initialization.",
        },
        {
          prompt: "After `auto level = 3;`, what happens when you write `level = 2.5;`?",
          question: {
            type: "choice",
            options: ["level becomes a double holding 2.5", "level stays an int and holds 2", "It does not compile because level is an int", "It crashes when run"],
            answer: 1,
          },
          explanation: "`auto` only saves you from typing the type. The compiler infers `int` from `3` and the variable stays an `int` forever. C++ happily converts 2.5 to an int on assignment and throws the fraction away, so you end up with 2.",
        },
        {
          prompt: "What does `std::cout << true;` print if you have not used `std::boolalpha`?",
          question: { type: "choice", options: ["true", "True", "1", "yes"], answer: 2 },
          explanation: "A `bool` is a number underneath: `true` prints as `1` and `false` as `0`. Send `std::boolalpha` into the stream first to print the words.",
        },
      ],
    },

    // ───────────────────────── 3 ─────────────────────────
    {
      id: "cpp-basics-3-numbers",
      title: "Power balance: arithmetic",
      minutes: 30,
      xp: 100,
      concepts: ["operators", "integer division", "remainder", "compound assignment", "static_cast", "<cmath>", "overflow", "long long"],
      learn: md`### The arithmetic operators

\`+\`, \`-\`, \`*\`, \`/\` and \`%\` (remainder) work as you expect, with multiplication and division before addition and subtraction. Use parentheses to change the order or to make your intent obvious.

~~~cpp
std::cout << 2 + 3 * 4 << "\n";     // 14
std::cout << (2 + 3) * 4 << "\n";   // 20
std::cout << 17 % 5 << "\n";        // 2   (17 = 3 * 5 + 2)
~~~

### Compound assignment

\`x += 5\` is shorthand for \`x = x + 5\`. The same exists for \`-=\`, \`*=\`, \`/=\` and \`%=\`, and \`x++\` / \`x--\` add or subtract one.

~~~cpp
int netKw = 1800;
netKw -= 180;    // 1620
netKw *= 2;      // 3240
netKw++;         // 3241
~~~

### Trap 1: integer division

When **both** sides are whole numbers, \`/\` gives a whole number: the fraction is thrown away (truncated toward zero), not rounded.

~~~cpp
std::cout << 7 / 2 << "\n";       // 3
std::cout << -7 / 2 << "\n";      // -3
std::cout << 7 / 2.0 << "\n";     // 3.5   one side is a double, so the whole division is a double
std::cout << 7 % 2 << "\n";       // 1     the remainder tells you what was thrown away
~~~

The remainder is surprisingly useful: \`n % 2 == 0\` tests for even numbers and \`hour % 24\` wraps around a clock. (\`%\` only works on whole numbers.)

### Casting with \`static_cast\`

A **cast** converts a value to another type on purpose. In modern C++ you write it as \`static_cast<type>(value)\`, which is easy to search for and checked by the compiler.

~~~cpp
int electricKw = 1800;
int thermalKw = 5400;
double wrong = electricKw / thermalKw;                        // 0       (the division happened between ints, THEN became 0.0)
double right = static_cast<double>(electricKw) / thermalKw;   // 0.3333  (one side is a double before dividing)
int dropped = static_cast<int>(3.9);                          // 3       a cast truncates, it does not round
~~~

The classic mistake is casting the *result* (\`static_cast<double>(a / b)\`) instead of one of the *inputs*. By then the fraction is already gone. (You may also see the old C style \`(double)x\`. It works, but \`static_cast\` is clearer.)

### Rounding up with integers

How many trays of 8 do you need for 30 fuel pellets? Plain division gives 3, but 3 trays only hold 24. Add \`size - 1\` before dividing to round **up**:

~~~cpp
int trays = (30 + 8 - 1) / 8;     // 4
int empty = trays * 8 - 30;       // 2 empty slots in the last tray
~~~

### \`<cmath>\`: the maths library

Add \`#include <cmath>\` at the top and you get \`std::sqrt\`, \`std::pow\`, \`std::abs\`, \`std::ceil\` (round up), \`std::floor\` (round down) and \`std::round\` (to the nearest whole number). They work on \`double\`s and return \`double\`s, so convert with \`static_cast<int>\` when you need a whole number.

(By convention every \`#include\` sits at the very top of a file. Your file here grows lesson by lesson, so pockett drops each new \`#include\` just above \`main\`, after the code that is already there. That compiles exactly the same, as long as the include comes before the line that uses it.)

~~~cpp
std::cout << std::sqrt(16.0) << "\n";       // 4
std::cout << std::pow(2, 10) << "\n";       // 1024
std::cout << std::ceil(3.45) << "\n";       // 4
std::cout << std::abs(-8.5) << "\n";        // 8.5
double tenths = std::round(33.333 * 10) / 10;   // 33.3  (round to one decimal place)
~~~

### How \`cout\` prints doubles

\`std::cout\` shows a \`double\` with up to 6 significant digits and drops needless zeros: \`8.0\` prints as \`8\`, and \`33.3333333\` prints as \`33.3333\`. That is why we round values *before* printing or sending them.

### Trap 2: \`double\` is not exact

\`double\` stores binary fractions, and a value like 0.1 has no exact binary form, so tiny errors appear: \`0.1 + 0.2\` is really \`0.30000000000000004\`. For measurements that does not matter; just never test two calculated doubles with \`==\`. (For money, many programs count whole cents in an \`int\`.)

### Trap 3: overflow

Every integer type has a fixed size. Go past its limit and the result is not what you expect.

~~~cpp
unsigned char pulses = 250;   // 0 to 255
pulses += 10;                 // 260 does not fit: wraps around to 4
int big = 5000000 * 1000;     // 5 billion does not fit in an int: WRONG answer (and a compiler warning)
long long safe = 5000000LL * 1000;   // 5000000000: the LL makes the maths happen in long long
~~~

For **unsigned** types the wrap-around is well defined (it counts modulo 256 here). For ordinary **signed** \`int\` overflow the C++ standard says the result is *undefined behaviour*: anything may happen, and the optimizer is allowed to assume it never does. So the rule is simple: when numbers can get large (bytes, totals, energy), choose \`long long\` *before* the maths.

One more pitfall: a \`char\`-sized number prints as a character, not a number. \`std::cout << pulses\` would print the symbol with code 4. Convert first: \`std::cout << static_cast<int>(pulses)\`.

### Dividing by zero

\`5 / 0\` with whole numbers crashes the program (you will see *Floating point exception* even though no floats are involved). With doubles you get \`inf\` or \`nan\` and the program carries on. Check the divisor first.

### Common mistakes

- Dividing two ints and expecting a fraction.
- Casting after the division instead of before.
- Forgetting \`#include <cmath>\` (error: \`sqrt\` is not a member of \`std\`).
- Writing \`5000000 * 1000\` into a \`long long\`: the multiplication still happens in \`int\`. Make one side \`LL\` or cast it.
- Printing a small \`unsigned char\` without converting it to \`int\`.`,
      mission: md`The reactor's power budget is the first thing the shift supervisor asks about: how many fuel trays are needed, how efficiently the turbines turn heat into electricity, what is left after the pumps take their share, how many coolant refills to order. Real arithmetic is full of traps (integer division, rounding, overflow), so you will walk into each one on purpose and avoid it.

When this lesson passes, the **Power balance** card lights up with your numbers.`,
      tasks: [
        "Add #include <cmath> in the top part of the file (Part A in the starter). The rest goes in main.",
        "Work out trays (rounded UP) and emptySlots from pellets = 30 and trayCapacity = 8 using / and %",
        "Compute efficiency: electricKw (1800) divided by thermalKw (5400) as a percentage, with a static_cast<double> and rounded to one decimal using std::round",
        "Start netKw at electricKw and subtract 180 with -=; compute refills = std::ceil(3450.0 / 1000.0) as an int; deviation = std::abs(coreTemp - targetTemp) with targetTemp = 412.5; fluxGain = std::pow(1.5, 3)",
        "Show the overflow traps: unsigned char pulses = 250 then pulses += 10; and long long energyJ = 5000000LL * 1000. Print the eight lines from the starter comment and send all the results to the board",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── Part A: add  #include <cmath>  on the blank line below.


${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ─── Part B (inside main): the power balance.
int pellets = 30;
int trayCapacity = 8;
int thermalKw = 5400;
int electricKw = 1800;
// 1. int trays      = trays needed, rounded UP         -> 4  (hint: add trayCapacity - 1 before dividing)
//    int emptySlots = free slots in the last tray      -> 2
// 2. double efficiency = electricKw / thermalKw as a percent with ONE decimal -> 33.3
//    (cast one side with static_cast<double>, multiply by 1000, std::round, divide by 10)
// 3. int netKw = electricKw; then netKw -= 180;        -> 1620
//    int refills = static_cast<int>(std::ceil(3450.0 / 1000.0));   -> 4
//    double targetTemp = 412.5;  double deviation = std::abs(coreTemp - targetTemp);   -> 8
//    double fluxGain = std::pow(1.5, 3);               -> 3.375
// 4. unsigned char pulses = 250; pulses += 10;         -> 4 (print it with static_cast<int>)
//    long long energyJ = 5000000LL * 1000;             -> 5000000000
// Print these lines:
//   Trays needed: 4, empty slots: 2      Efficiency: 33.3%      Net power: 1620 kW      Refills: 4
//   Deviation: 8 C      Flux gain: 3.375      Pulse counter: 4      Energy: 5000000000 J
// scene keys: pellets, trayCapacity, trays, emptySlots, thermalKw, electricKw, efficiency, netKw,
//             refills, deviation, fluxGain, wrapped (the pulses value), energyJ
`,
      solutionAdd: cpp`#include <cmath>

${MAIN_DIVIDER}

// Lesson 3: the power balance.
int pellets = 30;
int trayCapacity = 8;
int trays = (pellets + trayCapacity - 1) / trayCapacity;   // round up
int emptySlots = trays * trayCapacity - pellets;

int thermalKw = 5400;
int electricKw = 1800;
double efficiency = std::round(static_cast<double>(electricKw) / thermalKw * 1000.0) / 10.0;
int netKw = electricKw;
netKw -= 180;

int refills = static_cast<int>(std::ceil(3450.0 / 1000.0));
double targetTemp = 412.5;
double deviation = std::abs(coreTemp - targetTemp);
double fluxGain = std::pow(1.5, 3);

unsigned char pulses = 250;
pulses += 10;                       // wraps around: 260 - 256 = 4
long long energyJ = 5000000LL * 1000;

std::cout << "Trays needed: " << trays << ", empty slots: " << emptySlots << "\n";
std::cout << "Efficiency: " << efficiency << "%\n";
std::cout << "Net power: " << netKw << " kW\n";
std::cout << "Refills: " << refills << "\n";
std::cout << "Deviation: " << deviation << " C\n";
std::cout << "Flux gain: " << fluxGain << "\n";
std::cout << "Pulse counter: " << static_cast<int>(pulses) << "\n";
std::cout << "Energy: " << energyJ << " J\n";

scene("pellets", pellets);
scene("trayCapacity", trayCapacity);
scene("trays", trays);
scene("emptySlots", emptySlots);
scene("thermalKw", thermalKw);
scene("electricKw", electricKw);
scene("efficiency", efficiency);
scene("netKw", netKw);
scene("refills", refills);
scene("deviation", deviation);
scene("fluxGain", fluxGain);
scene("wrapped", pulses);
scene("energyJ", energyJ);`,
      explanation:
        "(pellets + trayCapacity - 1) / trayCapacity rounds integer division up: (30 + 7) / 8 = 4, and the leftover capacity is 4 * 8 - 30 = 2. Casting ONE side to double before dividing keeps the fraction; multiplying by 1000, rounding and dividing by 10 trims it to 33.3. netKw -= 180 is shorthand for netKw = netKw - 180. std::ceil(3.45) is 4.0, converted to an int with static_cast. An unsigned char that goes past 255 wraps around to 4 (and must be cast to int to print as a number); a long long has room for 5000000000 as long as one operand is already a long long.",
      hints: [
        { id: "h1", title: "Rounding up", content: "Integer division throws the remainder away. To round up, add trayCapacity - 1 first: int trays = (pellets + trayCapacity - 1) / trayCapacity; The empty slots are trays * trayCapacity - pellets." },
        { id: "h2", title: "A cast before dividing", content: "double efficiency = std::round(static_cast<double>(electricKw) / thermalKw * 1000.0) / 10.0; The cast must be on a number going INTO the division. Put #include <cmath> in Part A." },
        { id: "h3", title: "Overflow", content: "unsigned char pulses = 250; pulses += 10; wraps to 4. Print it with static_cast<int>(pulses) or it shows as a control character. For the big number make one operand a long long: long long energyJ = 5000000LL * 1000;" },
      ],
      tests: [
        {
          id: "t1",
          description: "trays rounds up and emptySlots is what is left in the last tray",
          assertionCode: js`
assertEqual(scene.trays, 4, "trays (30 pellets in trays of 8 need 4 trays: round UP, not down to 3)");
assertEqual(scene.emptySlots, 2, "emptySlots (4 * 8 - 30)");`,
        },
        {
          id: "t2",
          description: "efficiency is a real fraction, rounded to one decimal",
          assertionCode: js`
assert(typeof scene.efficiency === "number", "Send efficiency with scene(\"efficiency\", efficiency);");
assert(scene.efficiency !== 0, "efficiency is 0, so the division happened between two ints. Cast one side to double first: static_cast<double>(electricKw) / thermalKw");
assertClose(scene.efficiency, 33.3, 0.0001, "efficiency should be 1800 / 5400 as a percent, rounded to one decimal");`,
        },
        {
          id: "t3",
          description: "netKw, refills, deviation and fluxGain are computed",
          assertionCode: js`
assertEqual(scene.netKw, 1620, "netKw (electricKw - 180)");
assertEqual(scene.refills, 4, "refills (3450 litres in 1000 litre tanks, rounded UP with std::ceil)");
assertClose(scene.deviation, 8, 0.0001, "deviation (std::abs(coreTemp - targetTemp) with targetTemp = 412.5)");
assertClose(scene.fluxGain, 3.375, 0.0001, "fluxGain (std::pow(1.5, 3))");`,
        },
        {
          id: "t4",
          description: "the totals are printed in the expected shape",
          assertionCode: js`
assert(lines.includes("Trays needed: 4, empty slots: 2"), 'Print the line "Trays needed: 4, empty slots: 2".');
assert(lines.includes("Efficiency: 33.3%"), 'Print "Efficiency: 33.3%". If you see many decimals, round before printing.');
assert(lines.includes("Net power: 1620 kW"), 'Print "Net power: 1620 kW".');
assert(lines.includes("Refills: 4"), 'Print "Refills: 4".');
assert(lines.includes("Deviation: 8 C"), 'Print "Deviation: 8 C" (cout drops the .0 of a double on its own).');
assert(lines.includes("Flux gain: 3.375"), 'Print "Flux gain: 3.375".');`,
        },
        {
          id: "t5",
          description: "an unsigned char wraps around; a long long does not overflow",
          assertionCode: js`
assertEqual(scene.wrapped, 4, "wrapped (unsigned char 250 plus 10 wraps around to 4)");
assertEqual(scene.energyJ, 5000000000, "energyJ (make one operand a long long: 5000000LL * 1000)");
assert(lines.includes("Pulse counter: 4"), 'Print "Pulse counter: 4". An unsigned char prints as a symbol unless you write static_cast<int>(pulses).');
assert(lines.includes("Energy: 5000000000 J"), 'Print "Energy: 5000000000 J".');`,
        },
      ],
      unlocks: ["rc-power"],
      checks: [
        {
          prompt: "Which expression gives `3.5`?",
          question: {
            type: "choice",
            options: ["`7 / 2`", "`7 / 2.0`", "`static_cast<double>(7 / 2)`", "`7 % 2`"],
            answer: 1,
          },
          explanation: "With one side a `double`, the whole division is done as a `double`. `7 / 2` is `3` (both ints), `static_cast<double>(7 / 2)` converts the already-truncated `3`, and `7 % 2` is the remainder `1`.",
        },
        {
          prompt: "What is the value of `x` after this code?\n\n~~~cpp\nint x = 10;\nx += 5;\nx /= 2;\n~~~",
          question: { type: "number", answer: 7 },
          explanation: "`x += 5` makes 15. `x /= 2` is integer division, 15 / 2 = 7 (the .5 is thrown away).",
        },
        {
          prompt: "Why does `long long big = 5000000 * 1000;` give a wrong answer?",
          question: {
            type: "choice",
            options: [
              "The multiplication is done in int first and overflows before the result is stored",
              "long long cannot hold values above a million",
              "The * operator only works on doubles",
              "Because 5000000 has too many digits",
            ],
            answer: 0,
          },
          explanation: "Both literals are `int`, so the multiplication happens as `int` and overflows. Storing the result in a `long long` afterwards is too late. Make one side `5000000LL` so the maths happens in `long long`.",
        },
      ],
    },

    // ───────────────────────── 4 ─────────────────────────
    {
      id: "cpp-basics-4-input",
      title: "Operator login: input and strings",
      minutes: 30,
      xp: 100,
      concepts: ["std::cin", "std::getline", "std::ws", "std::string basics", "size()", "indexing", "concatenation", "input errors"],
      learn: md`### Reading input with \`std::cin\`

Output goes through \`std::cout\`; input comes through \`std::cin\` and flows the other way, so the arrows flip: \`>>\` pulls a value **out of** the stream **into** a variable.

~~~cpp
int clearance = 0;
std::cin >> clearance;      // reads the next whole number from the input
~~~

\`>>\` skips any leading whitespace (spaces, tabs, new lines), then reads **as much as fits the variable's type** and stops at the next whitespace. That is perfect for numbers, but it also means:

~~~cpp
std::string name;
std::cin >> name;           // typing "Dana Whitlock" stores only "Dana"
~~~

A \`std::string\` read with \`>>\` is a single *word*.

On this course the "keyboard" is a prepared block of input: the operator's details arrive as four lines, which are read in exactly the order they are listed:

~~~text
Dana Whitlock
3
412.5
night shift
~~~

### Whole lines with \`std::getline\`

To read a full line, spaces included, use \`std::getline(stream, variable)\`:

~~~cpp
std::string operatorName;
std::getline(std::cin, operatorName);    // "Dana Whitlock"
~~~

### The leftover newline trap

Reading a number with \`>>\` stops *before* the new line that follows it, and that newline stays in the stream. A \`getline\` right afterwards reads from the cursor to the end of the line, finds the newline immediately, and returns an **empty string**:

~~~cpp
int clearance = 0;
std::cin >> clearance;            // reads 3, the "\n" after it is still waiting
std::string shift;
std::getline(std::cin, shift);    // BUG: reads the rest of the "3" line, which is empty
~~~

The cure is to eat the whitespace first with the manipulator \`std::ws\`:

~~~cpp
std::cin >> std::ws;              // skip whitespace, including that newline
std::getline(std::cin, shift);    // now reads "night shift"
~~~

(\`std::cin.ignore()\` is the other common fix. Use whichever you prefer, but remember the problem exists whenever you mix \`>>\` and \`getline\`.)

### Did the read work?

A failed read does not crash. It silently sets the stream into a *fail state* and leaves your variable unchanged (or zero). You can test the read itself:

~~~cpp
if (!(std::cin >> clearance)) {
    std::cout << "That was not a number\n";
}
~~~

Real software checks the result of every read of untrusted input. Lesson 9 returns to this with proper error handling.

### \`std::string\` basics

A \`std::string\` is a sequence of characters you can inspect and combine:

~~~cpp
std::string name = "Dana Whitlock";
name.size()        // 13: the number of characters (also name.length())
name.empty()       // false
name[0]            // 'D': the first character (counting starts at 0)
name[name.size() - 1]   // 'k': the last one
name + "!"         // "Dana Whitlock!": joining strings with +
~~~

- \`size()\` returns an **unsigned** number (\`std::size_t\`). If you want an \`int\`, convert it: \`static_cast<int>(name.size())\`.
- Indexing with \`[]\` does **not** check that the position exists. \`name[99]\` is undefined behaviour. (\`name.at(99)\` throws an error instead, lesson 7 covers it.)
- Joining with \`+\` needs at least one side to be a \`std::string\`: \`"Welcome, " + name\` works, but \`"Welcome, " + "Dana"\` is an error because you cannot add two string literals.
- \`char\` values are small numbers: \`'D'\` prints as D when sent to \`cout\`, but \`'D' + 1\` is the \`int\` 69.

### Common mistakes

- Using \`>>\` for a full name and getting only the first word.
- Calling \`getline\` right after \`>>\` without \`std::ws\`, then wondering why a string is empty.
- Reading the values in a different order than they are listed in the input.
- Adding two string literals with \`+\`.
- Indexing an empty string with \`[0]\` and trusting what you get back.`,
      mission: md`Before anyone touches the controls, the reactor asks who is on shift. The operator's details arrive as four lines of input: a full name, a clearance level, the temperature setpoint they want and the name of the shift. Your program has to read them in the right order, keep the spaces in the name, and greet the operator.

When this lesson passes, the **Operator desk** lights up with the badge, clearance and setpoint.`,
      tasks: [
        "Read the operator's full name with std::getline into std::string operatorName",
        "Read the clearance level into an int and the setpoint into a double with std::cin >>",
        "Read the shift name (it has a space in it, so use std::cin >> std::ws and then std::getline) into std::string shift",
        "Build std::string welcome = \"Welcome, \" + operatorName + \" (\" + shift + \")\", find nameLength (as an int) with size(), and the first letter as a char initial with [0]",
        "Print the five lines from the starter comment and send operatorName, clearance, setpoint, shift, nameLength, initial and welcome to the board",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 4: the operator logs in. The input has four lines, in this order:
//   a full name  /  the clearance level (a whole number)  /  the setpoint (a decimal)  /  the shift name
// 1. std::string operatorName;  std::getline(std::cin, operatorName);
// 2. int clearance;  std::cin >> clearance;      double setpoint;  std::cin >> setpoint;
// 3. std::string shift;  std::cin >> std::ws;  std::getline(std::cin, shift);
// 4. std::string welcome = "Welcome, " + operatorName + " (" + shift + ")";
//    int nameLength = static_cast<int>(operatorName.size());     char initial = operatorName[0];
// Print these five lines:
//   Operator: Dana Whitlock (level 3)      Setpoint: 412.5 C      Name length: 13
//   Initial: D                             Welcome, Dana Whitlock (night shift)
// scene keys: operatorName, clearance, setpoint, shift, nameLength, initial, welcome
`,
      solutionAdd: cpp`// Lesson 4: the operator logs in.
std::string operatorName;
std::getline(std::cin, operatorName);

int clearance = 0;
std::cin >> clearance;
double setpoint = 0.0;
std::cin >> setpoint;

std::string shift;
std::cin >> std::ws;            // skip the newline left behind by the number
std::getline(std::cin, shift);

std::string welcome = "Welcome, " + operatorName + " (" + shift + ")";
int nameLength = static_cast<int>(operatorName.size());
char initial = operatorName[0];

std::cout << "Operator: " << operatorName << " (level " << clearance << ")\n";
std::cout << "Setpoint: " << setpoint << " C\n";
std::cout << "Name length: " << nameLength << "\n";
std::cout << "Initial: " << initial << "\n";
std::cout << welcome << "\n";

scene("operatorName", operatorName);
scene("clearance", clearance);
scene("setpoint", setpoint);
scene("shift", shift);
scene("nameLength", nameLength);
scene("initial", initial);
scene("welcome", welcome);`,
      explanation:
        "The name has a space in it, so it needs std::getline: >> would stop after \"Dana\". After the numbers are read with >>, the newline that ended the \"412.5\" line is still waiting, so std::cin >> std::ws skips it and the next getline reads \"night shift\" instead of an empty string. \"Welcome, \" + operatorName works because one side is a std::string. size() returns an unsigned number, so it is converted to an int with static_cast, and [0] gives the first character as a char.",
      hints: [
        { id: "h1", title: "Read in the listed order", content: "The input is consumed top to bottom: std::getline(std::cin, operatorName); then std::cin >> clearance; then std::cin >> setpoint; and finally the shift name. Declare each variable before reading into it, e.g. int clearance = 0;" },
        { id: "h2", title: "The shift is empty?", content: "After reading numbers with >> the line break is still in the input. Put std::cin >> std::ws; right before std::getline(std::cin, shift); to skip it." },
        { id: "h3", title: "Joining and measuring", content: "std::string welcome = \"Welcome, \" + operatorName + \" (\" + shift + \")\"; The first piece is a literal, so the next piece must be a std::string (it is). int nameLength = static_cast<int>(operatorName.size()); char initial = operatorName[0];" },
      ],
      tests: [
        {
          id: "t1",
          description: "The full name is read with its space, and clearance and setpoint are numbers",
          assertionCode: js`
assertEqual(scene.operatorName, "Dana Whitlock", "operatorName (read the whole line with std::getline(std::cin, operatorName); >> would stop at the space)");
assertEqual(scene.clearance, 3, "clearance (an int read with std::cin >>)");
assertEqual(scene.setpoint, 412.5, "setpoint (a double read with std::cin >>)");`,
        },
        {
          id: "t2",
          description: "The shift name is read in full",
          assertionCode: js`assertEqual(scene.shift, "night shift", "shift (after reading numbers with >> write std::cin >> std::ws; before std::getline(std::cin, shift); to skip the leftover newline)");`,
        },
        {
          id: "t3",
          description: "nameLength and initial come from size() and [0]",
          assertionCode: js`
assertEqual(scene.nameLength, 13, "nameLength (operatorName.size() counts the space too)");
assertEqual(scene.initial, "D", "initial (operatorName[0], a char)");`,
        },
        {
          id: "t4",
          description: "welcome is built by joining strings",
          assertionCode: js`assertEqual(scene.welcome, "Welcome, Dana Whitlock (night shift)", "welcome (\"Welcome, \" + operatorName + \" (\" + shift + \")\")");`,
        },
        {
          id: "t5",
          description: "The five lines are printed",
          assertionCode: js`
const want = ["Operator: Dana Whitlock (level 3)", "Setpoint: 412.5 C", "Name length: 13", "Initial: D", "Welcome, Dana Whitlock (night shift)"];
for (const w of want) assert(lines.includes(w), 'No line is exactly "' + w + '".');
const at = want.map((w) => lines.indexOf(w));
assert(at.every((v, i) => i === 0 || v > at[i - 1]), "The five lines are all there but in a different order. Print them in the order given in the starter comment.");`,
        },
      ],
      unlocks: ["rc-operator"],
      checks: [
        {
          prompt: "The input line is `Dana Whitlock`. What does `std::cin >> name;` store in a `std::string name`?",
          question: { type: "choice", options: ["Dana Whitlock", "Dana", "Whitlock", "Nothing"], answer: 1 },
          explanation: "`>>` stops at the first whitespace, so it reads a single word. Use `std::getline(std::cin, name);` to read the whole line.",
        },
        {
          prompt: "After `std::cin >> clearance;` you call `std::getline(std::cin, shift);` and `shift` comes out empty. Why?",
          question: {
            type: "choice",
            options: [
              "The newline after the number is still in the input, so getline reads an empty line",
              "getline cannot read strings with spaces",
              "std::cin is closed after reading a number",
              "shift needs to be declared as char",
            ],
            answer: 0,
          },
          explanation: "`>>` leaves the line break behind. `getline` sees it straight away and returns an empty string. Skip it first with `std::cin >> std::ws;` (or `std::cin.ignore();`).",
        },
        {
          prompt: "Which line does **not** compile?",
          question: {
            type: "choice",
            options: [
              "`std::string a = \"Hi, \" + name;`   (name is a std::string)",
              "`std::string b = name + \"!\";`",
              "`std::string c = \"Hi, \" + \"there\";`",
              "`std::string d = name + \" \" + name;`",
            ],
            answer: 2,
          },
          explanation: "You cannot add two string *literals*: both are plain `const char*` arrays, not `std::string`s. As soon as one operand is a `std::string`, `+` works, which is why the other three compile.",
        },
      ],
    },
  ],
};
