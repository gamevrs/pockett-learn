import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { cpp, js, md } from "./util.ts";

/**
 * Chapter 1: Cookie cutters. Function templates, class templates, template argument deduction and concepts.
 *
 * Lesson 1's starter carries the whole file skeleton (includes and `int main()`). From lesson 2 on, a lesson's text is
 * appended to the end of main's body and anything above MAIN_DIVIDER is inserted before main (engine/compose.ts).
 */

export const chapter1: Chapter = {
  id: "cookie-cutters",
  title: "Cookie cutters",
  blurb: "Write one recipe that works for many types: function templates, class templates, deduction, and concepts that say what a type must be able to do.",
  lessons: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "cpp-engine-1-templates",
      title: "One recipe, many types: function templates",
      minutes: 25,
      xp: 90,
      concepts: ["template", "type parameter", "instantiation", "template argument deduction", "typeName<T>()", "reading a template error"],
      learn: md`### The lighthouses disagree about numbers

Lantern Bay has a chain of lighthouses. Some report their brightness as a whole number of lumens (\`int\`), others as a measured decimal (\`double\`). The harbour office needs one question answered for both: *which of these two readings is brighter?*

Without templates you write the same function twice, once per type:

~~~cpp
int brighterInt(int a, int b) { return a > b ? a : b; }
double brighterDouble(double a, double b) { return a > b ? a : b; }
~~~

The body is identical. Only the *type* changed. Copying code like that is how bugs breed: fix one copy and forget the other. A **template** is a cookie cutter for functions: you describe the shape once, with a stand-in name for the type, and the compiler cuts out as many real functions as you need.

### Your first template

~~~cpp
template <typename T>
T brighter(T a, T b) {
    return a > b ? a : b;
}
~~~

Read it piece by piece:

- \`template <typename T>\` says "what follows is a recipe, and \`T\` is a **type parameter**: a placeholder for a type to be filled in later". The name \`T\` is a habit, any name works.
- \`T brighter(T a, T b)\` is an ordinary function header where \`T\` stands wherever a type goes: both inputs and the result have the same type \`T\`.
- \`a > b ? a : b\` means "if a is greater than b give a, otherwise give b".

Using it needs nothing special:

~~~cpp
int one = brighter(40, 95);          // 95
double two = brighter(7.5, 3.25);    // 7.5
~~~

Two words you will hear all the time:

- **Instantiation**: when the compiler meets \`brighter(40, 95)\` it stamps out a real function \`int brighter<int>(int, int)\`, and for the second call another one, \`double brighter<double>(double, double)\`. Each stamped-out copy is an instantiation. The template itself is not a function yet, only the recipe. If you never use it, nothing is built.
- **Deduction**: you never wrote \`<int>\` in the call. The compiler worked out \`T\` from the arguments: two \`int\`s mean \`T\` is \`int\`. That guessing is called **template argument deduction**. You *can* spell it out yourself, \`brighter<double>(1, 2)\`, and lesson 3 shows when you must.

All of this happens while the program is being compiled, so a template costs nothing at run time: the result is exactly as fast as if you had written each version by hand.

### Seeing which cutters were used

The provided helper \`typeName<T>()\` returns the name of a type as text. You write the type in angle brackets, which is the same "spell out the T yourself" move:

~~~cpp
std::cout << typeName<int>() << "\n";      // int
std::cout << typeName<double>() << "\n";   // double
~~~

(The board uses it to draw one cookie cutter per type your program stamped.)

### When a template fails, read the right line

A template can only be stamped for a type that supports what its body does. Hand \`brighter\` a type that has no \`>\`:

~~~cpp
struct Lamp { int lumens; };
Lamp x{1}, y{2};
Lamp z = brighter(x, y);
~~~

and the compiler prints:

~~~text
main.cpp: In instantiation of 'T brighter(T, T) [with T = Lamp]':
main.cpp:7:47:   required from here
    7 | ... Lamp z = brighter(x, y); ...
main.cpp:5:33: error: no match for 'operator>' (operand types are 'Lamp' and 'Lamp')
    5 |     return a > b ? a : b;
~~~

Template errors look long, but they always have the same three parts. **Find the line that contains \`error:\`** — it says what is wrong ("Lamp has no operator >"). The line above it, \`In instantiation of ... [with T = Lamp]\`, says which stamp failed. The \`required from here\` line points at *your* call that asked for it. Read those three and ignore the rest.

### Common mistakes

- Forgetting \`template <typename T>\` on the line above the function: then \`T\` is an unknown name.
- Passing two different types to a one-\`T\` template (\`brighter(3, 4.5)\`): lesson 3.
- Putting the template body in a place the compiler cannot see at the call: a template must be written *above* the code that uses it.`,
      mission: md`Welcome to Lantern Bay, a small harbour with a chain of lighthouses, buoys and foghorns. You are writing the guts of the harbour office's simulator: the engine that keeps the lights turning. Today's problem is the smallest one: comparing two brightness readings, whatever type the reading comes in.

Write the template, use it for a whole number and a decimal, and ask the compiler which types it stamped. When you pass, the **Cookie cutters** panel appears and draws one cutter per type.`,
      tasks: [
        "Above main, write template <typename T> T brighter(T a, T b) returning the larger of the two",
        "In main: int brightInt = brighter(40, 95); and double brightDouble = brighter(7.5, 3.25);",
        "Print brighter of 40 and 95 is 95, and brighter of 7.5 and 3.25 is 7.5 (each on its own line, exactly like that)",
        "Send scene(\"brightInt\", brightInt); scene(\"brightDouble\", brightDouble); and scene(\"stamps\", std::vector<std::string>{typeName<int>(), typeName<double>()});",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ───────────────────────────────────────────
// Lesson 1: your first template. Write it ABOVE main (a template must be seen before it is used), then use it inside main.
//
// The harbour office provides two helpers that are already built in (you never see their code):
//   scene("name", value);   sends a value to the board
//   typeName<T>();          the readable name of a type: typeName<int>() gives "int"

#include <iostream>
#include <string>
#include <vector>

// ─── ✏️ YOUR TURN ─── lesson 1: write template <typename T> T brighter(T a, T b) here.

int main() {
    // ─── ✏️ YOUR TURN ─── lesson 1: use brighter for an int and a double, print the two lines, send the three scene values.
}`,
      solutionAdd: cpp`#include <iostream>
#include <string>
#include <vector>

// Lesson 1: one recipe, many types.
template <typename T>
T brighter(T a, T b) {
    return a > b ? a : b;
}

int main() {
    int brightInt = brighter(40, 95);
    double brightDouble = brighter(7.5, 3.25);
    std::cout << "brighter of 40 and 95 is " << brightInt << "\n";
    std::cout << "brighter of 7.5 and 3.25 is " << brightDouble << "\n";
    scene("brightInt", brightInt);
    scene("brightDouble", brightDouble);
    scene("stamps", std::vector<std::string>{typeName<int>(), typeName<double>()});
}`,
      explanation:
        "template <typename T> turns brighter into a recipe. The first call has two ints, so the compiler deduces T = int and stamps brighter<int>; the second deduces T = double and stamps a second function. Both do the same comparison, which is why you only wrote it once. typeName<int>() and typeName<double>() spell the type out by hand, and the board draws one cutter for each.",
      hints: [
        { id: "h1", title: "The recipe", content: "Two lines above main: template <typename T> and then T brighter(T a, T b) { return a > b ? a : b; } Every T stands for the same type." },
        { id: "h2", title: "The calls", content: "int brightInt = brighter(40, 95); double brightDouble = brighter(7.5, 3.25); You do not write <int> anywhere: the compiler deduces it from the arguments." },
        { id: "h3", title: "Output and board", content: "std::cout << \"brighter of 40 and 95 is \" << brightInt << \"\\n\"; and the same for the double. Then scene(\"stamps\", std::vector<std::string>{typeName<int>(), typeName<double>()});" },
      ],
      tests: [
        {
          id: "t1",
          description: "brighter picked the larger whole number",
          assertionCode: js`
assertEqual(scene.brightInt, 95, "brightInt (the brighter of 40 and 95)");
assert(lines.includes("brighter of 40 and 95 is 95"), "Print the line: brighter of 40 and 95 is 95");`,
        },
        {
          id: "t2",
          description: "The same template works for decimals",
          assertionCode: js`
assertEqual(scene.brightDouble, 7.5, "brightDouble (the brighter of 7.5 and 3.25)");
assert(lines.includes("brighter of 7.5 and 3.25 is 7.5"), "Print the line: brighter of 7.5 and 3.25 is 7.5");`,
        },
        {
          id: "t3",
          description: "The board is told which two types were stamped",
          assertionCode: js`
assertEqual(scene.stamps, ["int", "double"], 'scene("stamps", ...) holding typeName<int>() and typeName<double>()');`,
        },
      ],
      unlocks: ["en-cutters"],
      checks: [
        {
          prompt: "You call `brighter(2, 9)` and later `brighter(1.5, 0.5)`. How many real functions does the compiler build from the template?",
          question: { type: "number", answer: 2 },
          explanation: "One instantiation per distinct type: `brighter<int>` and `brighter<double>`. Calling the same instantiation twice does not build another.",
        },
        {
          prompt: "In the compiler message, which line tells you what is actually wrong?",
          question: { type: "choice", options: ["The one that says \"In instantiation of\"", "The one that says \"required from here\"", "The one that says \"error:\"", "The last line of the message"], answer: 2 },
          explanation: "The `error:` line is the reason. \"In instantiation of\" says which stamp failed, and \"required from here\" points at your call.",
        },
      ],
    },

    // ───────────────────────── 2 ─────────────────────────
    {
      id: "cpp-engine-2-class-templates",
      title: "Class templates: a logbook for any type",
      minutes: 25,
      xp: 100,
      concepts: ["class template", "explicit template arguments", "member functions of templates", "const member functions", "reading a mismatch error"],
      learn: md`### Every station keeps a logbook

Each lighthouse writes down what it measures: lumens as whole numbers, the foghorn's weather notes as text. A logbook for numbers and a logbook for notes do the *same* job (add an entry, ask how many, read the newest), so copying the whole class would be silly:

~~~cpp
class IntLogbook { /* vector<int> inside, add(int), latest() ... */ };
class TextLogbook { /* vector<std::string> inside, add(std::string), latest() ... */ };
~~~

A **class template** is a cookie cutter for classes. The type goes in the angle brackets on the line above the class:

~~~cpp
template <typename T>
class Logbook {
public:
    void add(const T& entry) { entries_.push_back(entry); }
    std::size_t size() const { return entries_.size(); }
    const T& latest() const { return entries_.back(); }
    const std::vector<T>& all() const { return entries_; }

private:
    std::vector<T> entries_;
};
~~~

Everything inside can use \`T\` as a type name: a \`std::vector<T>\` of entries, a parameter, a return type. \`const T&\` means "a read-only reference to a T, no copy" and a trailing \`const\` on a member function promises it will not change the logbook.

### Using it needs the type spelled out

For a function template the compiler deduces \`T\` from the arguments. A class has no arguments at the moment you declare a variable, so you write the type yourself:

~~~cpp
Logbook<int> lampBook;            // a logbook of ints
Logbook<std::string> hornBook;    // a logbook of strings
lampBook.add(480);
lampBook.add(512);
hornBook.add("fog at dawn");
~~~

\`Logbook<int>\` and \`Logbook<std::string>\` are two **instantiations**: two completely separate real classes, each built from the same recipe. They share no data and are not interchangeable: a \`Logbook<int>\` is not a \`Logbook<std::string>\`.

Each instantiation is built from the recipe by replacing \`T\` everywhere, which is why the compiler can warn you about the wrong *kind* of entry:

~~~cpp
lampBook.add("storm");
~~~

~~~text
main.cpp: In function 'int main()':
main.cpp:11:49: error: invalid conversion from 'const char*' to 'int' [-fpermissive]
main.cpp:7:23: note: initializing argument 1 of 'void Logbook<T>::add(const T&) [with T = int]'
~~~

Same method as before: the \`error:\` line says a text cannot become an \`int\`, and the \`note:\` line says which function, with \`[with T = int]\` naming the stamp. (Here the error is in *your* line, so no long chain appears.)

### Reading values back out

\`lampBook.all()\` gives the vector of entries, which \`scene(...)\` can send straight to the board. \`latest()\` returns the newest entry and \`size()\` how many there are.

### Common mistakes

- Writing \`Logbook book;\` without the \`<int>\`: the compiler cannot guess the type here and says "missing template arguments".
- Defining the class template's members in a separate .cpp file: the whole template must be visible where it is used, so keep it in one place (in this course, above \`main\`).
- Forgetting \`const\` on read-only member functions: then you cannot call them on a \`const Logbook<int>&\`.`,
      mission: md`The lighthouse keeps a logbook of lamp readings; the foghorn keeps a logbook of weather notes. One class template covers both.

Write the \`Logbook\` template above \`main\`, make one for ints and one for strings, add entries to each, and send them to the board. The **Logbooks** panel then shows both books side by side, each labelled with the type it was stamped for.`,
      tasks: [
        "Above main, write template <typename T> class Logbook with add(const T&), size() const, latest() const and all() const (see the lesson text)",
        "In main: Logbook<int> lampBook; add 480, 512 and 505. Logbook<std::string> hornBook; add \"fog at dawn\" and \"clear by noon\"",
        "Print: lamp entries: 3, then: latest horn note: clear by noon",
        "Send scene(\"lampEntries\", lampBook.all()); scene(\"hornEntries\", hornBook.all()); and scene(\"bookTypes\", std::vector<std::string>{\"Logbook<\" + typeName<int>() + \">\", \"Logbook<\" + typeName<std::string>() + \">\"});",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── lesson 2: write template <typename T> class Logbook here, above main.
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 2: two logbooks, different types
// Logbook<int> lampBook;  Logbook<std::string> hornBook;  then add entries, print two lines and send the three scene values.
`,
      solutionAdd: cpp`template <typename T>
class Logbook {
public:
    void add(const T& entry) { entries_.push_back(entry); }
    std::size_t size() const { return entries_.size(); }
    const T& latest() const { return entries_.back(); }
    const std::vector<T>& all() const { return entries_; }

private:
    std::vector<T> entries_;
};
${MAIN_DIVIDER}
// Lesson 2: class templates.
Logbook<int> lampBook;
lampBook.add(480);
lampBook.add(512);
lampBook.add(505);
Logbook<std::string> hornBook;
hornBook.add("fog at dawn");
hornBook.add("clear by noon");
std::cout << "lamp entries: " << lampBook.size() << "\n";
std::cout << "latest horn note: " << hornBook.latest() << "\n";
scene("lampEntries", lampBook.all());
scene("hornEntries", hornBook.all());
scene("bookTypes", std::vector<std::string>{"Logbook<" + typeName<int>() + ">", "Logbook<" + typeName<std::string>() + ">"});`,
      explanation:
        "Logbook<int> and Logbook<std::string> are two different classes built from one recipe: each replaces T with its own type, so each owns its own vector. all() returns the vector by const reference, which scene() prints as a list. The type name goes in angle brackets because there is no argument to deduce it from when you declare a variable.",
      hints: [
        { id: "h1", title: "The class", content: "template <typename T> class Logbook { public: void add(const T& entry) { entries_.push_back(entry); } ... private: std::vector<T> entries_; }; Do not forget the semicolon after the closing brace." },
        { id: "h2", title: "Two books", content: "Logbook<int> lampBook; lampBook.add(480); ... and Logbook<std::string> hornBook; hornBook.add(\"fog at dawn\"); The type in <> decides what add accepts." },
        { id: "h3", title: "Board", content: "scene(\"lampEntries\", lampBook.all()); sends the whole vector. For bookTypes build two strings with + : \"Logbook<\" + typeName<int>() + \">\"." },
      ],
      tests: [
        {
          id: "t1",
          description: "The lamp logbook holds the three numbers",
          assertionCode: js`
assertEqual(scene.lampEntries, [480, 512, 505], "lampEntries (the contents of the Logbook<int>)");
assert(lines.includes("lamp entries: 3"), "Print the line: lamp entries: 3");`,
        },
        {
          id: "t2",
          description: "The horn logbook holds the two notes",
          assertionCode: js`
assertEqual(scene.hornEntries, ["fog at dawn", "clear by noon"], "hornEntries (the contents of the Logbook<std::string>)");
assert(lines.includes("latest horn note: clear by noon"), "Print the line: latest horn note: clear by noon");`,
        },
        {
          id: "t3",
          description: "The board is told which two classes were stamped",
          assertionCode: js`
assertEqual(scene.bookTypes, ["Logbook<int>", "Logbook<std::string>"], "bookTypes");`,
        },
      ],
      unlocks: ["en-logbooks"],
      checks: [
        {
          prompt: "Is a `Logbook<int>` the same type as a `Logbook<std::string>`?",
          question: { type: "choice", options: ["Yes, they come from the same template", "No, each instantiation is its own separate class"], answer: 1 },
          explanation: "The template is only a recipe. Every different `T` produces a different, unrelated class, so you cannot pass one where the other is expected.",
        },
        {
          prompt: "Why do you write `Logbook<int> lampBook;` but only `brighter(40, 95)` for a function template?",
          question: { type: "choice", options: ["Class templates are older", "A variable declaration gives the compiler nothing to deduce T from", "Function templates cannot take explicit types", "There is no difference"], answer: 1 },
          explanation: "A function call carries arguments whose types reveal `T`. A plain variable declaration has none, so you name the type yourself.",
        },
      ],
    },

    // ───────────────────────── 3 ─────────────────────────
    {
      id: "cpp-engine-3-deduction",
      title: "How the compiler deduces: two types and fixed sizes",
      minutes: 30,
      xp: 100,
      concepts: ["deduction conflict", "explicit template arguments", "several type parameters", "std::array", "non-type template parameter", "default arguments"],
      learn: md`### Deduction has rules, and sometimes it gives up

Lesson 1 said the compiler *deduces* \`T\` from the arguments. It does this by looking at each argument and asking "what type is this?". If two arguments tied to the same \`T\` disagree, the compiler does not pick a winner. It refuses:

~~~cpp
template <typename T>
T dimmer(T a, T b) { return a < b ? a : b; }

dimmer(3, 8);       // fine: both int, T = int
dimmer(3, 4.5);     // ERROR: int and double
~~~

~~~text
main.cpp:4:32: error: no matching function for call to 'dimmer(int, double)'
main.cpp:3:25: note: candidate 1: 'template<class T> T dimmer(T, T)'
main.cpp:3:25: note: template argument deduction/substitution failed:
main.cpp:4:32: note:   deduced conflicting types for parameter 'T' ('int' and 'double')
~~~

Read it with the lesson 1 method. The \`error:\` line says "no function matches *this call*". The line that explains why is the one that says **deduced conflicting types for parameter 'T' ('int' and 'double')**: the first argument said \`int\`, the second said \`double\`, and a single \`T\` cannot be both.

### Three ways out

1. **Say the type yourself.** An **explicit template argument** switches deduction off for that parameter and the arguments are converted to it: \`dimmer<double>(3, 4.5)\` turns the \`3\` into \`3.0\`.
2. **Convert one argument first**, for example \`static_cast<double>(3)\`.
3. **Use two type parameters** when the two arguments are *allowed* to differ:

~~~cpp
template <typename A, typename B>
double lumenGap(A a, B b) {
    return a > b ? a - b : b - a;     // the distance between two readings
}
lumenGap(3, 4.5);   // A = int, B = double, result 1.5
~~~

Choose by meaning. \`dimmer\` should compare *like with like*, so one \`T\` is right and the error is a feature. \`lumenGap\` is a distance, so mixed types are fine.

### The size can be a template parameter too

A template parameter does not have to be a type. It can be a plain number known while compiling, called a **non-type template parameter**. The standard library's fixed-size array uses one: \`std::array<int, 4>\` is "an array of 4 ints", and the 4 is part of the type itself (so \`std::array<int, 4>\` and \`std::array<int, 5>\` are different types).

~~~cpp
#include <array>

template <typename T, std::size_t N>
T rackTotal(const std::array<T, N>& rack) {
    T total{};                          // {} starts at zero for numbers
    for (const T& item : rack) total += item;
    return total;
}

std::array<int, 4> rack = {10, 20, 30, 40};
rackTotal(rack);      // 100
~~~

Nobody wrote \`<int, 4>\` in the call. The compiler *deduced both* from the argument: \`T = int\` from the element type and \`N = 4\` from the length. \`std::size_t\` is the unsigned whole-number type used for sizes and counts.

### Peeking at what was deduced

If a template records \`typeName<T>()\` when it runs, you can see afterwards which stamps were really built. In this lesson a shared list collects the notes:

~~~cpp
inline std::vector<std::string> deduceLog;     // above main: shared notes
// inside a template:  deduceLog.push_back(typeName<T>());
~~~

(\`inline\` lets a variable defined above \`main\` be shared safely. You do not need to know more than that yet.)

### Common mistakes

- Expecting \`dimmer(3, 4.5)\` to "just widen the int". With one \`T\` it is an error, by design.
- Writing \`std::array<int>\` without the length: both template arguments are required.
- Forgetting that the length of a \`std::array\` is part of its type: you cannot pass a \`std::array<int, 5>\` to a function written for \`std::array<int, 4>\`.`,
      mission: md`The lighthouse chain has a "dimmest" question as well as a "brightest" one, and sometimes a reading arrives as a whole number from one station and a decimal from another. Also, every lighthouse has a rack of exactly four spare bulbs, and the quartermaster wants the total lumens of any rack, whatever size it is.

Write three templates, call each in the way that suits it, and make each one write a note about what was deduced. The **Deduction desk** panel then lists every stamp, with the arguments each one was built from.`,
      tasks: [
        "Above main add inline std::vector<std::string> deduceLog; and template <typename T> T dimmer(T a, T b) that pushes typeName<T>() onto deduceLog and returns the smaller value",
        "Add template <typename A, typename B> double lumenGap(A a, B b) that pushes typeName<A>() + \",\" + typeName<B>() onto deduceLog and returns the distance between a and b",
        "Add template <typename T, std::size_t N> T rackTotal(const std::array<T, N>& rack) that pushes typeName<T>() + \" x \" + std::to_string(N) onto deduceLog and returns the sum",
        "In main call, in this order: dimmer(3, 8); dimmer(2.5, 1.5); dimmer<double>(3, 4.5) (store it in double mixedDim); lumenGap(3, 4.5) (store in double gapSize); rackTotal(std::array<int, 4>{10, 20, 30, 40}) (store in int rackSum)",
        "Send scene(\"deducedTypes\", deduceLog); and scene(\"mixedDim\", mixedDim); scene(\"gapSize\", gapSize); scene(\"rackSum\", rackSum);",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── lesson 3: write deduceLog, dimmer, lumenGap and rackTotal here, above main.
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 3: call them in the order the tasks give, then send the four scene values.
// (dimmer(3, 4.5) with no <double> would be the "deduced conflicting types" error from the lesson.)
`,
      solutionAdd: cpp`inline std::vector<std::string> deduceLog;

template <typename T>
T dimmer(T a, T b) {
    deduceLog.push_back(typeName<T>());
    return a < b ? a : b;
}

template <typename A, typename B>
double lumenGap(A a, B b) {
    deduceLog.push_back(typeName<A>() + "," + typeName<B>());
    return a > b ? a - b : b - a;
}

template <typename T, std::size_t N>
T rackTotal(const std::array<T, N>& rack) {
    deduceLog.push_back(typeName<T>() + " x " + std::to_string(N));
    T total{};
    for (const T& item : rack) total += item;
    return total;
}
${MAIN_DIVIDER}
// Lesson 3: deduction.
dimmer(3, 8);
dimmer(2.5, 1.5);
double mixedDim = dimmer<double>(3, 4.5);
double gapSize = lumenGap(3, 4.5);
int rackSum = rackTotal(std::array<int, 4>{10, 20, 30, 40});
scene("deducedTypes", deduceLog);
scene("mixedDim", mixedDim);
scene("gapSize", gapSize);
scene("rackSum", rackSum);`,
      explanation:
        "dimmer(3, 8) and dimmer(2.5, 1.5) deduce T from agreeing arguments. dimmer<double>(3, 4.5) names T itself, so the 3 is converted and there is nothing left to disagree. lumenGap has two parameters so int and double can differ. rackTotal deduces both T and the length N from the std::array, so the log reads int x 4. Every call that built a new stamp left a note, in call order.",
      hints: [
        { id: "h1", title: "The three templates", content: "dimmer(T a, T b) returns a < b ? a : b. lumenGap(A a, B b) returns a > b ? a - b : b - a (as a double). rackTotal loops over the std::array and adds with T total{};" },
        { id: "h2", title: "The notes", content: "Each template starts with deduceLog.push_back(...). For rackTotal use typeName<T>() + \" x \" + std::to_string(N) so the note reads int x 4." },
        { id: "h3", title: "The conflict", content: "dimmer(3, 4.5) is the error. Write dimmer<double>(3, 4.5): the explicit <double> converts the 3 and the result is 3. Call order matters because the log keeps it." },
      ],
      tests: [
        {
          id: "t1",
          description: "dimmer was stamped for int, double and (explicitly) double",
          assertionCode: js`
assertEqual(scene.deducedTypes, ["int", "double", "double", "int,double", "int x 4"], "deducedTypes (one note per call, in the order the calls were made)");`,
        },
        {
          id: "t2",
          description: "The explicit <double> turned the 3 into a double",
          assertionCode: js`
assertEqual(scene.mixedDim, 3, "mixedDim (the smaller of 3 and 4.5)");
assertEqual(scene.gapSize, 1.5, "gapSize (the distance between 3 and 4.5)");`,
        },
        {
          id: "t3",
          description: "rackTotal added up the four bulbs",
          assertionCode: js`
assertEqual(scene.rackSum, 100, "rackSum (10 + 20 + 30 + 40)");`,
        },
      ],
      unlocks: ["en-deduction"],
      checks: [
        {
          prompt: "`template <typename T> T dimmer(T a, T b)` is called as `dimmer(5, 2.5)`. What happens?",
          question: { type: "choice", options: ["T becomes double and it works", "T becomes int and 2.5 is cut to 2", "A compile error: conflicting types for T", "It runs but prints 0"], answer: 2 },
          explanation: "The first argument says int, the second says double. One T cannot be both, so deduction fails. Writing `dimmer<double>(5, 2.5)` fixes it.",
        },
        {
          prompt: "In `std::array<int, 4>`, which part is the non-type template argument?",
          question: { type: "choice", options: ["int", "4", "std::array", "Both int and 4"], answer: 1 },
          explanation: "`int` is a type argument; `4` is a plain value fixed at compile time, and it is part of the type: `std::array<int, 4>` and `std::array<int, 5>` are different types.",
        },
      ],
    },

    // ───────────────────────── 4 ─────────────────────────
    {
      id: "cpp-engine-4-concepts",
      title: "Concepts: say what a type must be able to do",
      minutes: 30,
      xp: 110,
      concepts: ["concept", "requires expression", "constrained template", "std::convertible_to", "bool from a concept", "readable errors"],
      learn: md`### The problem with "any type"

A plain \`template <typename T>\` accepts *every* type and only complains when the body fails to compile for it. Hand a pebble to a function that asks for a lamp's brightness:

~~~cpp
struct Pebble { int weight() const { return 5; } };

template <typename T>
int rawGlow(const T& item) { return item.lumens(); }

rawGlow(Pebble{});
~~~

~~~text
main.cpp: In instantiation of 'int rawGlow(const T&) [with T = Pebble]':
main.cpp:6:43:   required from here
main.cpp:5:42: error: 'const struct Pebble' has no member named 'lumens'
~~~

You can find the cause with the method from lesson 1, but notice the complaint comes from *inside* the template's body. In a bigger program that body might be fifty lines deep inside someone else's library, and the message gets very long. It would be kinder if the template said up front: "I only take things that have a \`lumens()\`."

### A concept is a named requirement

A **concept** is a name for a list of things a type must be able to do. It is checked by the compiler while it picks which template to use, before it tries to build the body.

~~~cpp
#include <concepts>

template <typename T>
concept Glowing = requires(const T& item) {
    { item.lumens() } -> std::convertible_to<int>;
};
~~~

Read it aloud: "\`Glowing\` is true for a type \`T\` when, given a read-only \`item\` of that type, the expression \`item.lumens()\` is valid **and** its result can be turned into an \`int\`." The block after \`requires(...)\` is a **requires expression**: it never runs, it only asks the compiler "would this compile?". \`std::convertible_to<int>\` is a ready-made concept from \`<concepts>\`.

### Using the concept

Put the concept's name where \`typename\` used to be:

~~~cpp
template <Glowing T>
int glowOf(const T& item) { return item.lumens(); }
~~~

Now \`glowOf(Pebble{})\` fails up front. The error still has several lines, but the key ones are short:

~~~text
main.cpp:10:42: error: no matching function for call to 'glowOf(Pebble&)'
main.cpp:9:5: note: candidate 1: 'template<class T>  requires  Glowing<T> int glowOf(const T&)'
main.cpp:9:5: note: constraints not satisfied
main.cpp:6:18: note: the required expression 'item.lumens()' is invalid
~~~

The reading order is: the \`error:\` line says which call, **\`constraints not satisfied\`** says the type did not meet the concept, and the last note says exactly which requirement failed. Nothing from inside the template body is dragged in.

You can also write the requirement after the header: \`template <typename T> requires Glowing<T> int glowOf(...)\` means the same thing.

### A concept is just a true/false value

Because the compiler can answer "does this type qualify?", the answer can be used like a \`bool\`:

~~~cpp
bool pebbleOk = Glowing<Pebble>;   // false
~~~

That is handy for tests and for the board, which shows which types passed the gate.

### Common mistakes

- Thinking a concept *adds* functions to a type. It only checks that they already exist.
- Forgetting \`#include <concepts>\` when you use ready-made ones like \`std::convertible_to\`.
- Writing the requirement on a member the type does not have *as const*: this concept asks about a \`const T&\`, so \`lumens()\` must be a \`const\` member function.`,
      mission: md`The harbour office is adding a gatehouse to its engine: only things that can shine may be registered as lamps. Floodlights and lanterns can (they have \`lumens()\`); a pebble on the quay cannot.

Write the concept and a constrained template, check three types against it, and total the glow of the two real lamps. The **Gatehouse** panel shows each type at the gate with a green pass or a red stop.`,
      tasks: [
        "Above main, write struct Floodlight { int lumens() const { return 900; } };, struct Lantern { int lumens() const { return 120; } }; and struct Pebble { int weight() const { return 5; } };",
        "Write the concept Glowing (the code from the lesson) and template <Glowing T> int glowOf(const T& item) returning item.lumens()",
        "In main: int totalGlow = glowOf(Floodlight{}) + glowOf(Lantern{}); and print total glow: 1020",
        "Send scene(\"totalGlow\", totalGlow); and scene(\"gateChecks\", std::map<std::string, bool>{{\"Floodlight\", Glowing<Floodlight>}, {\"Lantern\", Glowing<Lantern>}, {\"Pebble\", Glowing<Pebble>}});",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── lesson 4: the three types, the Glowing concept and glowOf go here, above main.
// Do NOT call glowOf on a Pebble: that is the error from the lesson (try it once to read the message, then remove it).
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 4: total the two real lamps, print the line, send totalGlow and gateChecks.
`,
      solutionAdd: cpp`struct Floodlight {
    int lumens() const { return 900; }
};
struct Lantern {
    int lumens() const { return 120; }
};
struct Pebble {
    int weight() const { return 5; }
};

template <typename T>
concept Glowing = requires(const T& item) {
    { item.lumens() } -> std::convertible_to<int>;
};

template <Glowing T>
int glowOf(const T& item) {
    return item.lumens();
}
${MAIN_DIVIDER}
// Lesson 4: concepts.
int totalGlow = glowOf(Floodlight{}) + glowOf(Lantern{});
std::cout << "total glow: " << totalGlow << "\n";
scene("totalGlow", totalGlow);
scene("gateChecks", std::map<std::string, bool>{{"Floodlight", Glowing<Floodlight>}, {"Lantern", Glowing<Lantern>}, {"Pebble", Glowing<Pebble>}});`,
      explanation:
        "The Glowing concept lists one requirement: item.lumens() must compile and give something convertible to int. Floodlight and Lantern meet it; Pebble only has weight(), so it does not. glowOf is constrained with template <Glowing T>, so a Pebble is rejected at the call with 'constraints not satisfied' instead of failing deep inside the body. Because the concept is a true/false value you can store Glowing<Pebble> in a bool-valued map for the board.",
      hints: [
        { id: "h1", title: "The concept", content: "template <typename T> concept Glowing = requires(const T& item) { { item.lumens() } -> std::convertible_to<int>; }; The braces inside the requires block hold the expression to test, then an arrow and a concept for its result." },
        { id: "h2", title: "The constrained function", content: "template <Glowing T> int glowOf(const T& item) { return item.lumens(); } Replace the word typename by the concept's name." },
        { id: "h3", title: "The gate board", content: "Glowing<Pebble> is a plain bool (false). Store three of them in a std::map<std::string, bool> and send it with scene(\"gateChecks\", ...)." },
      ],
      tests: [
        {
          id: "t1",
          description: "The two real lamps add up",
          assertionCode: js`
assertEqual(scene.totalGlow, 1020, "totalGlow (900 + 120)");
assert(lines.includes("total glow: 1020"), "Print the line: total glow: 1020");`,
        },
        {
          id: "t2",
          description: "The gate lets lamps through and stops the pebble",
          assertionCode: js`
assertEqual(scene.gateChecks, { Floodlight: true, Lantern: true, Pebble: false }, "gateChecks (Glowing<...> for each type)");`,
        },
      ],
      unlocks: ["en-gatehouse"],
      checks: [
        {
          prompt: "A concept check runs while the program is…",
          question: { type: "choice", options: ["running, one call at a time", "being compiled", "being installed", "never; it is only a comment"], answer: 1 },
          explanation: "Concepts are evaluated by the compiler while it chooses and builds templates. A type that fails never reaches the program at all.",
        },
        {
          prompt: "In a concept error, which phrase tells you the type did not meet the requirement?",
          question: { type: "text", answer: ["constraints not satisfied"] },
          explanation: "\"constraints not satisfied\" is the compiler's name for \"this type failed the concept\". The note after it names the exact requirement that failed.",
        },
      ],
    },
  ],
};
