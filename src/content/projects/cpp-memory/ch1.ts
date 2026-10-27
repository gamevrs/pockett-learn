import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { LAB_INCLUDES } from "./toolkit.ts";
import { cpp, lab, md } from "./util.ts";

/**
 * Chapter 1: Where things live. Addresses and pointers, arrays and pointer arithmetic, the stack and
 * its lifetimes, and the heap with new / delete.
 *
 * Lesson 1's starter carries the whole file skeleton (includes, the provided bench camera, and
 * `int main()` with `Lab lab;` as its first line). From lesson 2 on, a lesson's text is appended to the
 * end of main's body and anything above MAIN_DIVIDER is inserted before main (engine/compose.ts).
 */

export const chapter1: Chapter = {
  id: "where-things-live",
  title: "Where things live",
  blurb: "Addresses, pointers and references, arrays, the stack and its lifetimes, then the heap with new and delete. Your first photos of the lab's memory.",
  lessons: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "cpp-memory-1-addresses",
      title: "Addresses: pointers and references",
      minutes: 25,
      xp: 90,
      concepts: ["address-of &", "pointer", "dereference *", "nullptr", "reference", "pointer vs reference"],
      learn: md`### Every variable lives at an address

Your computer's memory is a very long row of numbered byte slots. When you write \`int shelfCount = 12;\`, the compiler reserves four of those slots, remembers the number of the first one, and from then on "\`shelfCount\`" means "whatever is stored there". That slot number is the variable's **address**.

The **address-of** operator \`&\` asks for it:

~~~cpp
int shelfCount = 12;
std::cout << &shelfCount << "\n";   // something like 0x7ffd5c3e1a34
~~~

The exact number changes from run to run, and that is fine. What matters is the idea: **a value and the place that holds the value are two different things**, and C++ lets you work with both.

### Pointers: variables that hold addresses

A **pointer** is a variable whose value is an address. Its type says what kind of thing lives there: \`int*\` is "address of an int".

~~~cpp
int shelfCount = 12;
int* shelfSlip = &shelfCount;   // shelfSlip now holds shelfCount's address
~~~

Think of \`shelfSlip\` as a claim slip for a locker. The slip is not the item; it tells you where to find the item. To go to the locker, use the **dereference** operator \`*\`:

~~~cpp
std::cout << *shelfSlip << "\n";   // 12: follow the slip, read the value
*shelfSlip += 3;                    // follow the slip, change the value
std::cout << shelfCount << "\n";   // 15: the original changed
~~~

Notice the two jobs of the star. In a **declaration** (\`int* p\`) it means "p is a pointer". In an **expression** (\`*p\`) it means "go to the address in p". Same symbol, opposite directions: \`&\` goes from a thing to its address, \`*\` goes from an address to the thing.

### nullptr: a slip for no locker

A pointer must always hold *something*. When there is nothing to point at, say so explicitly with \`nullptr\`:

~~~cpp
int* emptySlip = nullptr;
if (emptySlip != nullptr) {
    std::cout << *emptySlip;   // only reached when the slip is real
}
~~~

Dereferencing a null pointer is **undefined behaviour**: the program may crash with a "segmentation fault", or do something stranger. So the habit is: before you follow a pointer that *might* be null, check it. An uninitialised pointer is worse than a null one, because it holds a random address that looks plausible. Always initialise pointers, with a real address or with \`nullptr\`.

### References: another name for the same thing

A **reference** is a second name for an existing variable. It is not a separate value and it holds no address you can see: it is the same box with two labels.

~~~cpp
int& shelfAlias = shelfCount;   // shelfAlias IS shelfCount
shelfAlias *= 2;                 // so shelfCount doubles too
~~~

References must be bound when they are created, and they can never be re-pointed at something else. There is no "null reference". Those two limits are exactly what make them safe and pleasant to use.

### Pointer or reference?

- Use a **reference** when the thing is guaranteed to exist and you just want another name for it (function parameters you want to change or avoid copying, which lesson 3 and 12 use heavily).
- Use a **pointer** when "no object" is a real possibility (it can be \`nullptr\`), when you need to change which object you refer to, or when you will walk through memory (lesson 2).

### Reading the bench camera

Every lesson in this course ends by taking a photo of your program with the lab's *bench camera*, the block of provided code above \`main\`. You do not need to understand how it works. You only use four calls:

- \`peek("name", variable);\` puts one variable on the next photo. It never changes your variable.
- \`snap("caption");\` takes the photo of everything you peeked since the last snap, and the board draws it.
- \`trace("kind", "who");\` adds a line to the lab logbook (lesson 5).
- \`scene("name", value);\` sends a plain value to the board, as in Reactor Core.

The very first line of \`main\`, \`Lab lab;\`, is the lab's door log: it starts the audit when \`main\` begins and reports when \`main\` ends. Leave it first.

On the board you will see your variables as cells with real, normalised addresses, a pointer drawn as an arrow to the cell it holds, and a reference drawn as a second label on the same cell. That picture is not decoration: it is your program's actual memory layout.

### Common mistakes

- Writing \`int* a, b;\` and expecting two pointers. Only \`a\` is a pointer; \`b\` is a plain \`int\`. Declare one pointer per line.
- Mixing up \`&\` (address of) in an expression with \`&\` in a declaration (\`int& ref\`, a reference).
- Dereferencing a pointer before checking it for \`nullptr\`.
- Forgetting that \`int* p = shelfCount;\` is a type error: a pointer needs an address, so write \`&shelfCount\`.`,
      mission: md`Welcome to the Larkspur Conservation Lab, where cracked amphorae, bronze mirrors and linen scrolls are restored and catalogued. The lab runs on one program, and it has a problem you will spend this course solving: it needs to know exactly *where* everything is, and who is responsible for it.

You start at the workbench. Count the shelf, make a claim slip that points at the count, a second name for the same count, and a slip that points at nothing. Then photograph the bench. When you pass, the **Workbench** panel powers on and draws your variables as cells with arrows between them.`,
      tasks: [
        "Declare int shelfCount = 12; and a pointer int* shelfSlip = &shelfCount;",
        "Add 3 to shelfCount by writing through the pointer: *shelfSlip += 3;",
        "Declare a reference int& shelfAlias = shelfCount; and double shelfCount by writing through shelfAlias",
        "Declare int* emptySlip = nullptr; and print the line emptySlip points at nothing when it is null",
        "Put all four on the camera with peek(\"shelfCount\", shelfCount); peek(\"shelfSlip\", shelfSlip); peek(\"shelfAlias\", shelfAlias); peek(\"emptySlip\", emptySlip); then snap(\"the bench\");",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ───────────────────────────────────────────
// Lesson 1: addresses. Write your code inside main() (see the tasks), under the YOUR TURN comment.
//
// The lab provides a bench camera that is already built in (you never see its code):
//   Lab lab;                 first line of main: opens the lab's audit, closes it when main ends
//   peek("name", variable);  puts a variable on the next photo (never changes it)
//   snap("caption");         takes the photo of everything peeked since the last snap
//   trace("kind", "who");    adds one line to the lab logbook (lesson 5)
//   tally();                 running totals of constructions, copies, moves, allocations
//   scene("name", value);    sends a plain value to the board

${LAB_INCLUDES}

int main() {
    Lab lab;  // provided: opens the lab's audit. Keep it as the first line.

    // ─── ✏️ YOUR TURN ─── lesson 1: the workbench
    // 1) int shelfCount = 12;  and a pointer to it
    // 2) change shelfCount through the pointer
    // 3) a reference to shelfCount, then double it through the reference
    // 4) a null pointer, and a message when it is null
    // 5) peek at all four variables, then snap("the bench");
}`,
      solutionAdd: cpp`${LAB_INCLUDES}

int main() {
    Lab lab;  // provided: opens the lab's audit. Keep it as the first line.

    // Lesson 1: the workbench.
    int shelfCount = 12;
    int* shelfSlip = &shelfCount;  // holds shelfCount's address
    *shelfSlip += 3;               // write through the slip: 15
    int& shelfAlias = shelfCount;  // a second name for the same variable
    shelfAlias *= 2;               // 30
    int* emptySlip = nullptr;      // points at nothing
    if (emptySlip == nullptr) {
        std::cout << "emptySlip points at nothing\n";
    }
    peek("shelfCount", shelfCount);
    peek("shelfSlip", shelfSlip);
    peek("shelfAlias", shelfAlias);
    peek("emptySlip", emptySlip);
    snap("the bench");
}`,
      explanation:
        "shelfSlip stores the address of shelfCount, so *shelfSlip reads and writes shelfCount itself (12 + 3 = 15). shelfAlias is not a new variable but a second name for shelfCount, so doubling it makes 30. A pointer can hold nullptr when it points at nothing, and the guard keeps you from following it. The camera shows exactly this: the slip's arrow lands on the shelfCount cell, the alias shares shelfCount's address, and emptySlip's arrow goes nowhere.",
      hints: [
        { id: "h1", title: "Slip and star", content: "int* shelfSlip = &shelfCount; makes the pointer. To write through it, put the star in front of the name: *shelfSlip += 3;" },
        { id: "h2", title: "Alias and null", content: "int& shelfAlias = shelfCount; has the & after the type. Then shelfAlias *= 2; changes shelfCount. For the null pointer: int* emptySlip = nullptr; and if (emptySlip == nullptr) { std::cout << \"emptySlip points at nothing\\n\"; }" },
        { id: "h3", title: "The photo", content: "peek takes a text name and the variable: peek(\"shelfSlip\", shelfSlip); Do all four peeks first, then one snap(\"the bench\"); to take the photo." },
      ],
      tests: [
        {
          id: "t1",
          description: "The bench photo shows all four variables",
          assertionCode: lab`
const s = needShot("the bench");
for (const n of ["shelfCount", "shelfSlip", "shelfAlias", "emptySlip"]) assert(ent(s, n), 'The photo "the bench" is missing ' + n + '. Add peek("' + n + '", ' + n + '); before snap.');`,
        },
        {
          id: "t2",
          description: "shelfCount is 30 after 12 + 3 and doubling",
          assertionCode: lab`
const s = needShot("the bench");
const c = ent(s, "shelfCount");
assert(c, "shelfCount is not on the photo.");
assertEqual(c.v, "30", "shelfCount should be 12, plus 3 through the pointer, then doubled through the reference");`,
        },
        {
          id: "t3",
          description: "shelfSlip really points at shelfCount, and shelfAlias shares its address",
          assertionCode: lab`
const s = needShot("the bench");
const c = ent(s, "shelfCount"), p = ent(s, "shelfSlip"), r = ent(s, "shelfAlias");
assert(c && p && r, "Peek shelfCount, shelfSlip and shelfAlias first.");
assert(p.k === "ptr", "shelfSlip should be a pointer (int*), not a plain number.");
assertEqual(p.to, c.a, "shelfSlip should hold the address of shelfCount");
assert(r.a === c.a && r.k === "val", "shelfAlias should be a reference: the same cell as shelfCount, not a pointer and not a copy.");`,
        },
        {
          id: "t4",
          description: "emptySlip is null and the message is printed",
          assertionCode: lab`
const s = needShot("the bench");
const e = ent(s, "emptySlip");
assert(e, "emptySlip is not on the photo.");
assert(e.k === "ptr" && e.tg === 3, "emptySlip should be a pointer holding nullptr.");
assert(lines.includes("emptySlip points at nothing"), 'Print the line: emptySlip points at nothing (only when the pointer is null).');`,
        },
      ],
      unlocks: ["pv-bench"],
      checks: [
        {
          prompt: "Given `int n = 5; int* p = &n; *p = 9;`, what is `n` afterwards?",
          question: { type: "number", answer: 9 },
          explanation: "`*p` means \"the thing p points at\", and p points at `n`. Writing 9 through the pointer writes 9 into `n` itself. There is only one int; the pointer is just a way to reach it.",
        },
        {
          prompt: "Which of these can be `nullptr`?",
          question: { type: "choice", options: ["A pointer", "A reference", "Both of them", "Neither of them"], answer: 0 },
          explanation: "A pointer can hold `nullptr` to say \"no object\". A reference must always be bound to a real object when it is created, which is why a function that takes a reference never has to check for null.",
        },
      ],
    },

    // ───────────────────────── 2 ─────────────────────────
    {
      id: "cpp-memory-2-arrays",
      title: "Arrays, pointer arithmetic and const pointers",
      minutes: 30,
      xp: 100,
      concepts: ["arrays", "array decay", "pointer arithmetic", "pointer difference", "const int*", "int* const", "raw pointer risks"],
      learn: md`### An array is a row of cells side by side

~~~cpp
int shelfSlots[5] = {4, 8, 15, 16, 23};
~~~

This reserves five \`int\`s **one after another** in memory, with no gaps. If the first one is at address \`A\`, the second is at \`A + 4\` (an \`int\` is 4 bytes), the third at \`A + 8\`, and so on. That layout is the whole reason arrays are fast, and the whole reason pointers can walk along them.

### Arrays turn into pointers

In most expressions the name of an array **decays** into a pointer to its first element:

~~~cpp
int* start = shelfSlots;         // same as &shelfSlots[0]
~~~

The array itself still knows its size (\`sizeof shelfSlots\` is 20), but the moment it is passed to a function or assigned to a pointer, the length is gone. That single fact is behind many C++ bugs.

### Pointer arithmetic moves in whole elements

Add 1 to an \`int*\` and the address moves forward by **one int**, not one byte. The compiler multiplies by the element size for you:

~~~cpp
int* cursor = shelfSlots + 2;    // 2 elements along = 8 bytes along
int third = *cursor;             // 15
~~~

\`cursor[1]\` is shorthand for \`*(cursor + 1)\`, and \`shelfSlots[2]\` is shorthand for \`*(shelfSlots + 2)\`. Subtracting two pointers into the same array gives the distance **in elements**:

~~~cpp
const int* slotEnd = shelfSlots + 5;   // one past the last element
long gap = slotEnd - cursor;           // 3
~~~

Forming the pointer *one past the end* is legal and is how C++ loops mark where to stop. **Reading or writing through it is not.** The classic walk:

~~~cpp
for (const int* at = shelfSlots; at != slotEnd; ++at) {
    total += *at;
}
~~~

Modern code usually uses \`std::vector\` and range-for instead, but every vector iterator is a pointer in disguise, so this is the idea underneath.

### Two different "const" pointers

Read a pointer declaration **right to left**:

- \`const int* readOnly\`: "pointer to a **const int**". You cannot change the int through it (\`*readOnly = 1;\` is an error), but the pointer itself can move to another address.
- \`int* const firstSlot\`: "**const** pointer to int". The int can be changed through it, but the pointer can never be re-pointed.
- \`const int* const\`: neither can change.

When you see "const" before the star, it protects the **data**. After the star, it protects the **pointer**. The board marks both with small badges.

### Why raw pointers are risky

A raw pointer is only an address. Nothing in the language checks that:

- it points inside the array (\`shelfSlots + 7\` is accepted and wrong),
- the thing it points at still exists (lesson 3),
- it was ever set (an uninitialised pointer holds garbage),
- or who is responsible for the memory behind it (lessons 4 to 10).

C++ trusts you completely. The rest of this course is about handing that trust to types that check for you.

### Common mistakes

- Writing \`shelfSlots[5]\` or \`*(shelfSlots + 5)\` on a five-element array. That reads memory that is not yours (undefined behaviour). Valid indexes are 0 to 4.
- Expecting \`sizeof\` to give the length inside a function that received a pointer. It gives the size of the pointer (8 bytes).
- Reading \`const int*\` as "constant pointer". Read right to left: it is a pointer to constant data.`,
      mission: md`The restoration lab keeps its glue-pots, brushes and bandage rolls on a five-slot shelf, and the shelf is the first thing the new inventory system has to understand: slots side by side, a cursor that walks along them, and rules about who may change what.

Build the shelf in code, walk it with a pointer, and photograph it. The **Shelf** panel then shows real element addresses (each one 4 higher than the last), the cursor's arrow landing on the right slot, and const badges on the two kinds of const pointer.`,
      tasks: [
        "Declare int shelfSlots[5] = {4, 8, 15, 16, 23};",
        "Make int* cursor = shelfSlots + 2; and read int thirdSlot = *cursor;",
        "Add up the whole shelf with a pointer loop: const int* slotEnd = shelfSlots + 5; and for (const int* slotAt = shelfSlots; slotAt != slotEnd; ++slotAt) into int slotTotal (start it at 0)",
        "Declare int* const firstSlot = shelfSlots; and add 6 to the first slot through it. Declare const int* readOnly = shelfSlots;",
        "Work out long slotGap = slotEnd - cursor; then send scene(\"thirdSlot\", thirdSlot); scene(\"slotTotal\", slotTotal); scene(\"slotGap\", slotGap);",
        "Peek shelfSlots, cursor, firstSlot and readOnly and take snap(\"the shelf\");",
      ],
      starterAdd: cpp`${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 2: the shelf
// Never read or write through a pointer that is at (or past) the end of the array.
`,
      solutionAdd: cpp`${MAIN_DIVIDER}
// Lesson 2: the shelf.
int shelfSlots[5] = {4, 8, 15, 16, 23};
int* cursor = shelfSlots + 2;  // 2 elements along: 8 bytes
int thirdSlot = *cursor;       // 15
int slotTotal = 0;
const int* slotEnd = shelfSlots + 5;  // one past the last slot: fine to form, never to read
for (const int* slotAt = shelfSlots; slotAt != slotEnd; ++slotAt) {
    slotTotal += *slotAt;
}
int* const firstSlot = shelfSlots;  // the pointer is fixed, the data may change
*firstSlot += 6;
const int* readOnly = shelfSlots;   // the data is read-only through this pointer
long slotGap = slotEnd - cursor;    // distance in elements
scene("thirdSlot", thirdSlot);
scene("slotTotal", slotTotal);
scene("slotGap", slotGap);
peek("shelfSlots", shelfSlots);
peek("cursor", cursor);
peek("firstSlot", firstSlot);
peek("readOnly", readOnly);
snap("the shelf");`,
      explanation:
        "shelfSlots + 2 is the address of the third element, 8 bytes along, so *cursor is 15. The loop visits every element from the start up to (not including) the one-past-the-end pointer and adds them: 4 + 8 + 15 + 16 + 23 = 66. firstSlot is a const pointer, so it cannot move but the element it holds can change (4 becomes 10); readOnly is a pointer to const, so it can move but cannot write. Subtracting pointers counts elements: three from the cursor to the end.",
      hints: [
        { id: "h1", title: "The cursor", content: "Pointer arithmetic counts elements: int* cursor = shelfSlots + 2; points at the third slot. Then int thirdSlot = *cursor; reads it." },
        { id: "h2", title: "The loop", content: "const int* slotEnd = shelfSlots + 5; for (const int* slotAt = shelfSlots; slotAt != slotEnd; ++slotAt) { slotTotal += *slotAt; } Declare int slotTotal = 0; before the loop." },
        { id: "h3", title: "Reading const", content: "Read right to left. int* const firstSlot = shelfSlots; means a const pointer to int (star, then const). const int* readOnly = shelfSlots; means a pointer to const int. And long slotGap = slotEnd - cursor; counts elements." },
      ],
      tests: [
        {
          id: "t1",
          description: "The shelf is an array of five ints and the first slot grew by 6",
          assertionCode: lab`
const s = needShot("the shelf");
const a = ent(s, "shelfSlots");
assert(a, 'Peek the array: peek("shelfSlots", shelfSlots);');
assert(a.k === "arr" && a.len === 5, "shelfSlots should be an array of 5 ints.");
assertEqual(a.vs, ["10", "8", "15", "16", "23"], "The shelf contents (the first slot should be 4 + 6 = 10 after writing through firstSlot)");`,
        },
        {
          id: "t2",
          description: "cursor points two elements along the array",
          assertionCode: lab`
const s = needShot("the shelf");
const a = ent(s, "shelfSlots"), c = ent(s, "cursor");
assert(a && c, "Peek shelfSlots and cursor first.");
assertEqual(c.to, a.a + 2 * a.es, "cursor should hold the address of the third element (shelfSlots + 2)");
assertEqual(scene.thirdSlot, 15, "thirdSlot");`,
        },
        {
          id: "t3",
          description: "The pointer loop added the shelf up and the gap is 3 elements",
          assertionCode: lab`
assertEqual(scene.slotTotal, 66, "slotTotal (4 + 8 + 15 + 16 + 23, added before the first slot changes)");
assertEqual(scene.slotGap, 3, "slotGap (elements from cursor to the one-past-the-end pointer)");`,
        },
        {
          id: "t4",
          description: "firstSlot is a const pointer and readOnly points to const data",
          assertionCode: lab`
const s = needShot("the shelf");
const f = ent(s, "firstSlot"), r = ent(s, "readOnly");
assert(f && r, "Peek firstSlot and readOnly first.");
assert(f.cp === 1 && f.pc === 0, "firstSlot should be int* const: the pointer is const, the data is not.");
assert(r.pc === 1 && r.cp === 0, "readOnly should be const int*: the data is const, the pointer is not.");`,
        },
      ],
      unlocks: ["pv-shelf"],
      checks: [
        {
          prompt: "`int* p = shelfSlots;` then `p += 3;` How many bytes does the address change by (an int is 4 bytes)?",
          question: { type: "number", answer: 12 },
          explanation: "Pointer arithmetic counts in elements of the pointed-to type. Three `int`s of 4 bytes each is 12 bytes. The compiler does the multiplication for you.",
        },
        {
          prompt: "Which declaration lets you change the int it points at but never re-point the pointer?",
          question: { type: "choice", options: ["const int* p", "int* const p", "const int* const p", "int& p"], answer: 1 },
          explanation: "Read right to left: `int* const p` is a const pointer to a plain int. The const after the star locks the pointer; the int stays writable. `const int* p` is the opposite.",
        },
      ],
    },

    // ───────────────────────── 3 ─────────────────────────
    {
      id: "cpp-memory-3-stack",
      title: "The stack: lifetimes and dangling pointers",
      minutes: 30,
      xp: 100,
      concepts: ["stack frames", "automatic storage", "scope", "pass by value", "pass by reference", "lifetime", "dangling pointer"],
      learn: md`### The stack is the workbench

Every time a function is called, the program lays out a **frame** on a region of memory called the **stack**: room for the function's parameters and local variables. When the function returns, the frame is released and the space is reused by the next call. Nobody calls \`delete\` on a local variable; the compiler adds the cleanup for you at the closing brace. That is why locals are called **automatic**.

~~~cpp
void bumpByValue(int slots) {   // slots is a NEW variable in this frame
    slots += 10;
}                               // the frame (and slots) is gone here
~~~

Frames pile up as calls nest (\`main\` calls \`a\`, which calls \`b\`) and unwind in reverse. The stack is very fast: reserving a frame is just moving one pointer. It is also small, a few megabytes, and its contents have a **fixed lifetime**: from the declaration to the end of the enclosing \`{ }\`.

### By value or by reference

When you pass an argument **by value**, the function gets its own copy in its own frame, at its own address. Changing the copy never touches the original. When you pass **by reference** (\`int& slots\`), the parameter is just another name for the caller's variable: same cell, same address.

~~~cpp
void bumpByReference(int& slots) { slots += 5; }   // changes the caller's variable
~~~

The board proves it: in a photo taken inside each function you will see the by-value parameter in a new cell inside the callee's frame, and the by-reference parameter sharing the cell of the variable in \`main\`.

### Scope ends a lifetime, not a pointer

Any pair of braces is a scope. A variable declared inside it is destroyed at the closing brace, and its storage may be reused immediately. But a pointer that was aimed at it **does not know**. It keeps holding the old address:

~~~cpp
int* danglingSlip = nullptr;
{
    int blockSlots = 7;
    danglingSlip = &blockSlots;   // fine while blockSlots is alive
}                                 // blockSlots ends here
// danglingSlip still holds the address, but nothing valid lives there
~~~

That is a **dangling pointer** (or dangling reference, if it was a reference). The address looks perfectly normal. If you read through it you may see the old value, garbage, or the contents of an unrelated variable that now occupies the same cell; if you write through it you corrupt something else. The compiler will often not warn you. *Forming and looking at the pointer's value is harmless; dereferencing it is the bug.* In this lesson you only photograph it.

The most common real-world form is returning the address of a local:

~~~cpp
int* badIdea() {
    int local = 5;
    return &local;       // the frame is released as we return
}
~~~

GCC will warn about this exact pattern ("address of local variable returned"). Treat that warning as an error.

### How to avoid them

- Return **values** (or smart pointers, chapter 3) instead of addresses of locals.
- Keep a reference or pointer no longer-lived than the thing it refers to.
- Prefer a reference parameter to a pointer parameter unless "nothing" is a legal argument.

The other half of the picture, memory that does **not** disappear at the closing brace, is the heap, next lesson.

### Common mistakes

- Thinking a by-value parameter can change the caller's variable.
- Returning a reference or pointer to a local variable or parameter.
- Storing the address of a loop variable or block variable in something that outlives the block.`,
      mission: md`The lab's workbench is cleared at the end of every task: the cloth with the day's tools is whisked away, and anything you left on it is gone. Your code works the same way. Two small helper functions will show you what a frame is, and a short block will show you how a pointer can outlive the thing it was aimed at.

Pass the shelf count to two functions, one by value and one by reference, and photograph each from inside. Then end a block while a slip still points into it. The **Call frames** panel stacks \`main\` and its callees, and flags the dangling slip in red.`,
      tasks: [
        "Above main, write void bumpByValue(int slots) { slots += 10; peek(\"slots\", slots); snap(\"inside bumpByValue\"); } and void bumpByReference(int& slots) that adds 5 and takes snap(\"inside bumpByReference\")",
        "In main declare int frameSlots = 40; peek it, call bumpByValue(frameSlots), peek it again, call bumpByReference(frameSlots), peek it a third time and take snap(\"back in main\");",
        "Declare int* danglingSlip = nullptr; then open a block { } that declares int blockSlots = 7; and points danglingSlip at it. Inside the block peek blockSlots and danglingSlip and take snap(\"inside the block\");",
        "After the block closes, peek danglingSlip again (do not dereference it) and take snap(\"after the block\");",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── lesson 3: write the two helper functions here, above main.
// Each peeks its parameter and takes a photo from inside the function.
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 3: the call frames and the dangling slip
// Never dereference danglingSlip after the block: only look at the address it holds.
`,
      solutionAdd: cpp`void bumpByValue(int slots) {  // a copy: its own cell in this frame
    slots += 10;
    peek("slots", slots);
    snap("inside bumpByValue");
}

void bumpByReference(int& slots) {  // another name for the caller's variable
    slots += 5;
    peek("slots", slots);
    snap("inside bumpByReference");
}
${MAIN_DIVIDER}
// Lesson 3: stack frames and lifetimes.
int frameSlots = 40;
peek("frameSlots", frameSlots);
bumpByValue(frameSlots);       // frameSlots stays 40
peek("frameSlots", frameSlots);
bumpByReference(frameSlots);   // frameSlots becomes 45
peek("frameSlots", frameSlots);
snap("back in main");
int* danglingSlip = nullptr;
{
    int blockSlots = 7;
    danglingSlip = &blockSlots;
    peek("blockSlots", blockSlots);
    peek("danglingSlip", danglingSlip);
    snap("inside the block");
}  // blockSlots ends here, the slip does not know
peek("danglingSlip", danglingSlip);
snap("after the block");`,
      explanation:
        "bumpByValue gets its own copy of frameSlots in its own frame (a different address), so the caller still has 40. bumpByReference's parameter is the same cell as frameSlots, so adding 5 changes the original to 45. When the inner block closes, blockSlots no longer exists but danglingSlip still holds its address, which is exactly what makes it dangling: the arrow on the board points at a cell that is no longer on the bench. Only the address was used; nothing was read through it.",
      hints: [
        { id: "h1", title: "Two functions", content: "Both take one parameter named slots. The first is int slots (a copy), the second is int& slots (a reference). Each adds a different amount, peeks slots with peek(\"slots\", slots); and then takes its snap." },
        { id: "h2", title: "Photos from inside", content: "Peek frameSlots in main BEFORE each call: the camera holds on to what you peeked until the next snap, so the photo inside the function shows main's cell as well as the callee's." },
        { id: "h3", title: "The block", content: "int* danglingSlip = nullptr; { int blockSlots = 7; danglingSlip = &blockSlots; peek(\"blockSlots\", blockSlots); peek(\"danglingSlip\", danglingSlip); snap(\"inside the block\"); } peek(\"danglingSlip\", danglingSlip); snap(\"after the block\");" },
      ],
      tests: [
        {
          id: "t1",
          description: "The by-value parameter is a copy: different cell, caller keeps 40",
          assertionCode: lab`
const s = needShot("inside bumpByValue");
const inner = ent(s, "slots"), outer = ent(s, "frameSlots");
assert(inner && outer, "Peek frameSlots in main before the call, and slots inside bumpByValue.");
assertEqual(inner.v, "50", "slots inside bumpByValue (40 + 10 on its own copy)");
assertEqual(outer.v, "40", "frameSlots must still be 40 while bumpByValue works on a copy");
assert(inner.a !== outer.a && inner.fr === "bumpByValue", "A by-value parameter should live in its own cell in the callee's frame.");`,
        },
        {
          id: "t2",
          description: "The by-reference parameter is the caller's own cell",
          assertionCode: lab`
const s = needShot("inside bumpByReference");
const inner = ent(s, "slots"), outer = ent(s, "frameSlots");
assert(inner && outer, "Peek frameSlots in main before the call, and slots inside bumpByReference.");
assertEqual(inner.a, outer.a, "A reference parameter should be the very same cell as the caller's variable");
const back = needShot("back in main");
assertEqual(ent(back, "frameSlots").v, "45", "frameSlots after bumpByReference added 5 to it");`,
        },
        {
          id: "t3",
          description: "The slip was aimed at blockSlots inside the block",
          assertionCode: lab`
const s = needShot("inside the block");
const b = ent(s, "blockSlots"), d = ent(s, "danglingSlip");
assert(b && d, "Peek blockSlots and danglingSlip inside the block.");
assertEqual(d.to, b.a, "danglingSlip should hold the address of blockSlots");`,
        },
        {
          id: "t4",
          description: "After the block the slip still holds the old address, but blockSlots is gone",
          assertionCode: lab`
const inside = needShot("inside the block");
const after = needShot("after the block");
const b = ent(inside, "blockSlots"), d = ent(after, "danglingSlip");
assert(d, 'After the block, peek danglingSlip and take snap("after the block");');
assertEqual(d.to, b.a, "danglingSlip still holds the old address");
assert(!ent(after, "blockSlots"), "Do not peek blockSlots after its block has ended: it no longer exists.");`,
        },
      ],
      unlocks: ["pv-frames"],
      checks: [
        {
          prompt: "A function `void f(int x) { x = 99; }` is called as `f(count);`. What happens to `count`?",
          question: { type: "choice", options: ["It becomes 99", "It is unchanged", "It becomes 0", "The program does not compile"], answer: 1 },
          explanation: "`x` is a copy living in `f`'s own frame. Writing to the copy leaves `count` alone. To change the caller's variable, take `int& x`.",
        },
        {
          prompt: "True or false: after the closing brace of a block, a pointer that was aimed at a variable declared inside it becomes `nullptr` automatically.",
          question: { type: "choice", options: ["True", "False"], answer: 1 },
          explanation: "Nothing updates the pointer. It keeps the old address, which is the definition of a dangling pointer. Only your own code (or a smart pointer, later) can know the target is gone.",
        },
      ],
    },

    // ───────────────────────── 4 ─────────────────────────
    {
      id: "cpp-memory-4-heap",
      title: "The heap: new, delete, leaks and double frees",
      minutes: 30,
      xp: 110,
      concepts: ["heap", "new", "delete", "memory leak", "double free", "lifetime", "ownership"],
      learn: md`### The heap is the vault

Stack frames disappear at the closing brace. Sometimes you need an object that outlives the function that made it, or whose size you only know at run time. For that C++ has the **heap** (also called the *free store*), a big pool of memory where **you** decide when each block is taken and when it is given back.

~~~cpp
Crate* crateA = new Crate{101, 24};   // ask the heap for room for a Crate, build one there
// ... use it ...
delete crateA;                        // destroy it and give the room back
~~~

\`new\` does two things: it **allocates** raw memory and it **constructs** an object in it, and it returns the address. The pointer \`crateA\` lives on the stack, but the Crate lives in the heap, so the object stays alive until someone writes \`delete\`. \`delete\` runs the object's destructor, then releases the memory. Arrays use the matching pair: \`new int[10]\` goes with \`delete[]\`.

The heap can hold big things and long-lived things. The price is that **nothing cleans up for you**. Two rules look easy and are the source of a large share of all serious bugs:

> every \`new\` needs exactly one \`delete\`, on every path through your code.

### Bug 1: the leak

~~~cpp
Crate* crateA = new Crate{101, 24};
// ... crateA is never deleted ...
~~~

When \`crateA\` goes out of scope, the pointer vanishes but the crate does not. The block stays reserved for the rest of the run with nobody holding its address: a **memory leak**. A tiny leak in a short program is harmless; in a program that runs for days it eats all the memory. A very common version is *overwriting* the only pointer:

~~~cpp
crateC = new Crate{104, 12};   // the first crateC is now unreachable
~~~

### Bug 2: the double free

~~~cpp
delete crateB;
delete crateB;   // the block was already given back
~~~

Deleting the same block twice is undefined behaviour. On a real system it can crash immediately ("free(): double free detected") or silently corrupt the allocator and crash much later, somewhere that looks unrelated. After you delete a pointer, set it to \`nullptr\`: deleting a null pointer is allowed and does nothing, so a second delete becomes harmless.

### Bug 3: using a block after it was freed

A pointer to a freed block is dangling, exactly like a pointer to a dead local, only now the memory may be handed to someone else's \`new\` a moment later. The board draws a pointer to a freed block in red.

### How the lab audits your heap

While \`main\` runs, the lab's door log replaces \`new\` and \`delete\` with versions that keep a ledger: every block taken, every block returned, any block never returned (a leak) and any attempt to return a block twice (the audit stops that second delete so your program can keep running, but real programs get no such protection). The **Vault** panel draws the ledger as numbered bays, and your photos show which pointers hold which bay.

Professional teams use the same idea with real tools. Sanitizers built into the compiler and checkers such as Valgrind watch every allocation of a program and report leaks and invalid frees. You will not run those here, but the lab's audit shows you the same facts.

### Why manual new/delete does not scale

Every function that calls \`new\` must also be sure to \`delete\`. Early returns, exceptions and a forgotten branch all break that promise. The next lesson introduces the idea that fixes this: **tie the delete to a scope**, so it cannot be forgotten.

### Common mistakes

- \`new\` without \`delete\` (leak), or \`delete\` without \`new\` (deleting a pointer to the stack is undefined behaviour).
- Mixing the pairs: \`new[]\` must be matched by \`delete[]\`, plain \`new\` by plain \`delete\`.
- Not setting the pointer to \`nullptr\` after \`delete\`.
- Deleting through a copy of the pointer and then using the original.`,
      mission: md`The vault is the lab's long-term storage: numbered bays where finished crates wait. The intake code below was written in a hurry by a tired colleague, and the nightly audit flagged it: one crate was never returned, one was returned twice, and one lost its label when the bay number was overwritten.

Fix the three bugs. When the audit reports four bays taken, four returned and nothing left over, the **Vault** panel powers on and shows every crate bay, with leaks in red.`,
      tasks: [
        "Above main there is struct Crate { int id; int kg; };. The starter's main already takes three crates and then misbehaves",
        "Bug 1: crateA is never deleted. Delete it and set the pointer to nullptr",
        "Bug 2: crateB is deleted twice. Delete it once and set it to nullptr",
        "Bug 3: crateC = new Crate{104, 12}; throws away the address of crate 103. Delete crate 103 first. Keep the fourth crate, then delete it and null the pointer too",
        "Finish with peeks of crateA, crateB, crateC and snap(\"vault cleaned up\"); All four allocations must have a matching delete and no pointer may be left holding an address",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── lesson 4: declare the crate type here, above main.
struct Crate {
    int id;
    int kg;
};
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 4: three bugs hide in this intake code. Find and fix them.
Crate* crateA = new Crate{101, 24};
Crate* crateB = new Crate{102, 9};
Crate* crateC = new Crate{103, 31};
peek("crateA", crateA);
peek("crateB", crateB);
peek("crateC", crateC);
snap("three crates in the vault");
// bug 1: crateA is never given back
delete crateB;
delete crateB;  // bug 2: the same block returned twice
crateC = new Crate{104, 12};  // bug 3: the address of crate 103 is overwritten
peek("crateC", crateC);
snap("a fourth crate");
delete crateC;
peek("crateA", crateA);
peek("crateB", crateB);
peek("crateC", crateC);
snap("vault cleaned up");`,
      solutionAdd: cpp`struct Crate {
    int id;
    int kg;
};
${MAIN_DIVIDER}
// Lesson 4: the vault.
Crate* crateA = new Crate{101, 24};
Crate* crateB = new Crate{102, 9};
Crate* crateC = new Crate{103, 31};
peek("crateA", crateA);
peek("crateB", crateB);
peek("crateC", crateC);
snap("three crates in the vault");
delete crateA;  // bug 1 fixed: every new gets its delete
crateA = nullptr;
delete crateB;  // bug 2 fixed: once only
crateB = nullptr;
delete crateC;  // bug 3 fixed: give crate 103 back before reusing the pointer
crateC = new Crate{104, 12};
peek("crateC", crateC);
snap("a fourth crate");
delete crateC;
crateC = nullptr;
peek("crateA", crateA);
peek("crateB", crateB);
peek("crateC", crateC);
snap("vault cleaned up");`,
      explanation:
        "Each new must be matched by exactly one delete. crateA needed its missing delete; crateB was deleted twice (the second delete returned an already-freed block); and crateC was overwritten by a new allocation while the first crate was still live, which lost its address for good. Deleting first and then reusing the pointer fixes that. Setting each pointer to nullptr after delete means a stray second delete would do nothing. The audit now shows four bays taken, four returned, and no pointers left aimed at the vault.",
      hints: [
        { id: "h1", title: "Count your deletes", content: "There are four new expressions in total (101, 102, 103 and 104). Each needs exactly one delete: 101, 102, 103 and 104. Right now 101 has none, 102 has two, and 103 never gets one." },
        { id: "h2", title: "Order for crateC", content: "delete crateC; crateC = new Crate{104, 12}; — give the old crate back FIRST, then reuse the pointer. Later delete crateC; again for the second one." },
        { id: "h3", title: "Null after delete", content: "Write crateA = nullptr; right after delete crateA; (same for the others). Then the final peeks show three empty slips." },
      ],
      tests: [
        {
          id: "t1",
          description: "Four crates were taken from the vault and all four came back",
          assertionCode: lab`
assert(audit, "The audit did not report. Keep Lab lab; as the first line of main and make sure the program finishes.");
assertEqual(audit.al, 4, "bays taken (crates 101 to 104)");
assertEqual(audit.fr, 4, "bays returned: every new needs exactly one delete");`,
        },
        {
          id: "t2",
          description: "Nothing is left in the vault and nothing was returned twice",
          assertionCode: lab`
assert(audit, "The audit did not report.");
assert(audit.leaks.length === 0, "A crate was never returned: " + audit.leaks.length + " block(s) are still in the vault at the end of the run.");
assertEqual(audit.bf, 0, "double frees caught by the audit (a block returned a second time)");`,
        },
        {
          id: "t3",
          description: "The first photo shows three crates in three different bays",
          assertionCode: lab`
const s = needShot("three crates in the vault");
const ids = ["crateA", "crateB", "crateC"].map((n) => { const e = ent(s, n); assert(e && e.k === "ptr", n + " should be a pointer on the photo."); return e.tb; });
assert(new Set(ids).size === 3 && ids.every((i) => i > 0), "The three crates should sit in three different heap bays.");
assertEqual(s.c.lv, 3, "bays in use in the first photo");`,
        },
        {
          id: "t4",
          description: "At the end all three pointers are null",
          assertionCode: lab`
const s = needShot("vault cleaned up");
for (const n of ["crateA", "crateB", "crateC"]) {
  const e = ent(s, n);
  assert(e, n + " should be on the last photo.");
  assert(e.tg === 3, n + " should be nullptr after its crate is deleted.");
}`,
        },
      ],
      unlocks: ["pv-vault"],
      checks: [
        {
          prompt: "Which line leaks memory?",
          question: {
            type: "choice",
            options: ["`int* p = new int(1); delete p;`", "`int* p = new int(1); p = new int(2); delete p;`", "`int* p = nullptr; delete p;`", "`int* p = new int[3]; delete[] p;`"],
            answer: 1,
          },
          explanation: "The second line overwrites the only pointer to the first int, so that block can never be deleted. The others are balanced; deleting `nullptr` is allowed and does nothing.",
        },
        {
          prompt: "Why is it a good habit to write `p = nullptr;` right after `delete p;`?",
          question: { type: "choice", options: ["It frees extra memory", "A second delete of a null pointer is harmless, and a null pointer is easy to check", "delete does not work without it", "It makes the program faster"], answer: 1 },
          explanation: "`delete` on a null pointer is defined to do nothing, so an accidental double delete stops being a bug, and any later use of the pointer can be guarded with a null check.",
        },
      ],
    },
  ],
};
