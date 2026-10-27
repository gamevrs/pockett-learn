import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { cpp, lab, md } from "./util.ts";

/**
 * Chapter 2: Owning things. RAII, the rule of three, copy-and-swap and move semantics.
 *
 * Each lesson brings its own class, because lessons only append to the file: a class a lesson needs
 * to change is given to the learner half-written in the starter, and finished in the solution.
 */

export const chapter2: Chapter = {
  id: "owning-things",
  title: "Owning things",
  blurb: "Tie every delete to a scope with RAII, then make a class that owns memory copy and move correctly. Watch constructors, destructors, copies and moves in the logbook.",
  lessons: [
    // ───────────────────────── 5 ─────────────────────────
    {
      id: "cpp-memory-5-raii",
      title: "RAII: constructors acquire, destructors release",
      minutes: 30,
      xp: 110,
      concepts: ["RAII", "constructor", "destructor", "construction order", "destruction order", "scope-bound lifetime", "member order"],
      learn: md`### The fix for forgotten deletes

Last lesson ended on a problem: every \`new\` needs a \`delete\` on every path, and humans forget. C++ has a better idea than discipline, and it is the single most important idea in the language:

> **RAII: Resource Acquisition Is Initialisation.** An object *acquires* its resource in its **constructor** and *releases* it in its **destructor**. Because C++ runs the destructor automatically when the object's scope ends, the release can never be forgotten.

The awkward name hides a simple deal. A *resource* is anything you must give back: heap memory, an open file, a lock, a network connection. You wrap each one in a small class whose destructor gives it back. From then on you never write \`delete\` yourself: you just create the wrapper as a local variable.

~~~cpp
class Cradle {
public:
    explicit Cradle(int id) : crate_(new Crate{id, 0}) {   // acquire
        trace("ctor", "Cradle " + std::to_string(id));
    }
    ~Cradle() {                                            // release
        trace("dtor", "Cradle " + std::to_string(crate_->id));
        delete crate_;
    }
private:
    Crate* crate_;
};
~~~

A constructor runs once, when the object is created. A destructor (the class name with a \`~\` in front, no parameters, no return type) runs once, when the object ends. The wrapper's pointer lives on the stack, the Crate lives on the heap, and the two are tied together by the object's lifetime. Leave the scope by any route (reaching the closing brace, an early \`return\`, even an exception) and the destructor runs.

### Order is part of the contract

Destruction happens in the **reverse** order of construction, like unstacking plates:

~~~cpp
{
    Cradle first(201);
    {
        Cradle second(202);
    }                       // second is destroyed here
    Cradle third(203);
}                           // third, then first
~~~

The logbook will read: ctor 201, ctor 202, dtor 202, ctor 203, dtor 203, dtor 201.

For an object that **contains** other objects the same rule applies one level down. Members are constructed **in the order they are declared in the class** (not the order in the constructor's initialiser list, which is a common surprise), and *before* the body of the constructor runs. At the end, the destructor body runs first and then the members are destroyed in reverse order:

~~~cpp
class Shipment {
public:
    Shipment() : front_(301), back_(302) { trace("ctor", "Shipment"); }
    ~Shipment() { trace("dtor", "Shipment"); }
private:
    Cradle front_;
    Cradle back_;
};
~~~

A Shipment builds front, then back, then runs its own constructor body; it ends by running its own destructor body, then destroying back, then front. The lifetime of the parts always encloses the lifetime of the whole's body.

### Reading the logbook

\`trace("ctor", "who")\` writes one line in the lab logbook. The kinds the board colours are \`ctor\`, \`dtor\`, \`copy\`, \`move\`, \`assign-copy\` and \`assign-move\`; any other word (like \`note\`) is shown in grey. The **Logbook** panel draws each object's life as a bar from its constructor to its destructor, so scope and nesting become something you can see.

The heap events appear too: each constructor here ends up behind a \`new\`, so you will see an *alloc* next to every ctor and a *free* next to every dtor. Keep trace messages short; text longer than 15 characters needs a heap block of its own.

### Why it matters

RAII is the reason modern C++ rarely contains a bare \`delete\`. The standard library is built on it: \`std::vector\` and \`std::string\` free their memory in their destructors, \`std::ifstream\` closes its file, \`std::lock_guard\` releases a mutex, \`std::unique_ptr\` (lesson 10) deletes what it holds. Even exceptions are safe, because during stack unwinding every local's destructor still runs (lesson 14).

### Common mistakes

- Acquiring in the constructor but forgetting to release in the destructor (a leak that RAII was supposed to prevent).
- Calling \`delete\` on the resource somewhere else *and* in the destructor (a double free).
- Expecting the initialiser list order to set the construction order. It follows the declaration order in the class.
- Letting a RAII object be **copied** carelessly. Copying a Cradle would copy the pointer and two destructors would delete the same crate. That is the next lesson.`,
      mission: md`Every crate that arrives at the lab gets a *cradle*: a foam-lined holder that is made when the crate is received and unmade when the crate leaves. Nobody remembers to release a cradle; leaving the room is enough. You are about to write that guarantee into code.

Write the Cradle class (it receives a Crate in its constructor and gives it back in its destructor), then open and close a few scopes and read the logbook. When you pass, the **Logbook** panel powers on and draws each object's life as a bar, with scopes nested like the code.`,
      tasks: [
        "Write class Cradle with a Crate* crate_ member. Its constructor takes an int id, does crate_(new Crate{id, 0}) and calls trace(\"ctor\", \"Cradle \" + std::to_string(id));",
        "Its destructor calls trace(\"dtor\", \"Cradle \" + std::to_string(crate_->id)); and then delete crate_;",
        "Write class Shipment with two Cradle members, front_ then back_, built as front_(301), back_(302). Its constructor traces \"ctor\" \"Shipment\" and its destructor traces \"dtor\" \"Shipment\"",
        "In main, open { } and create Cradle outer(201); then an inner block with Cradle inner(202); and trace(\"note\", \"inner scope ends next\"); then after the inner block Cradle third(203); and trace(\"note\", \"leaving the outer scope\");",
        "In a second block create Shipment crateSet; Then take snap(\"scopes closed\");",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── lesson 5: write Cradle and Shipment here, above main.
class Cradle {
public:
    explicit Cradle(int id) {
        // acquire: crate_(new Crate{id, 0}) in the initialiser list, then trace ctor
    }
    // release: write the destructor
private:
    Crate* crate_;
};

class Shipment {
    // two Cradle members, front_ then back_ (301 and 302), with ctor and dtor traces
};
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 5: open scopes and watch the order
// { Cradle outer(201); { Cradle inner(202); trace(note) } Cradle third(203); trace(note) }
// { Shipment crateSet; }
// snap("scopes closed");
`,
      solutionAdd: cpp`class Cradle {
public:
    explicit Cradle(int id) : crate_(new Crate{id, 0}) {  // acquire
        trace("ctor", "Cradle " + std::to_string(id));
    }
    ~Cradle() {  // release
        trace("dtor", "Cradle " + std::to_string(crate_->id));
        delete crate_;
    }

private:
    Crate* crate_;
};

class Shipment {
public:
    Shipment() : front_(301), back_(302) { trace("ctor", "Shipment"); }
    ~Shipment() { trace("dtor", "Shipment"); }

private:
    Cradle front_;  // built first, destroyed last
    Cradle back_;
};
${MAIN_DIVIDER}
// Lesson 5: scopes decide lifetimes.
{
    Cradle outer(201);
    {
        Cradle inner(202);
        trace("note", "inner scope ends next");
    }
    Cradle third(203);
    trace("note", "leaving the outer scope");
}
{
    Shipment crateSet;
}
snap("scopes closed");`,
      explanation:
        "The constructor acquires (new Crate) and the destructor releases (delete), so each Cradle gives its crate back exactly when its scope ends and nothing is ever deleted by hand. The logbook order is ctor 201, ctor 202, dtor 202, ctor 203, dtor 203, dtor 201: destruction runs in reverse order of construction. A Shipment constructs its members in declaration order (front, back) before its own body, and destroys them in reverse after its own destructor body, which is why the Shipment lines wrap the two cradles. Every alloc has its free, so the audit stays clean.",
      hints: [
        { id: "h1", title: "Constructor and destructor", content: "explicit Cradle(int id) : crate_(new Crate{id, 0}) { trace(\"ctor\", \"Cradle \" + std::to_string(id)); }  and  ~Cradle() { trace(\"dtor\", \"Cradle \" + std::to_string(crate_->id)); delete crate_; }" },
        { id: "h2", title: "Shipment", content: "Declare the members in this order: Cradle front_; Cradle back_; and build them in the initialiser list: Shipment() : front_(301), back_(302) { trace(\"ctor\", \"Shipment\"); }" },
        { id: "h3", title: "The scopes", content: "Each pair of braces is a scope. Cradle outer(201); { Cradle inner(202); trace(\"note\", \"inner scope ends next\"); } Cradle third(203); trace(\"note\", \"leaving the outer scope\"); — all inside one outer pair of braces. Then another pair of braces holding Shipment crateSet;" },
      ],
      tests: [
        {
          id: "t1",
          description: "Cradles are built and destroyed in nested-scope order",
          assertionCode: lab`
needShot("scopes closed");
const want = ["ctor Cradle 201", "ctor Cradle 202", "dtor Cradle 202", "ctor Cradle 203", "dtor Cradle 203", "dtor Cradle 201"];
const got = lifeText().filter((t) => /Cradle 20[0-9]$/.test(t));
assertEqual(got, want, "Logbook order for the three cradles");`,
        },
        {
          id: "t2",
          description: "A Shipment builds its members first and destroys them last",
          assertionCode: lab`
needShot("scopes closed");
const want = ["ctor Cradle 301", "ctor Cradle 302", "ctor Shipment", "dtor Shipment", "dtor Cradle 302", "dtor Cradle 301"];
const got = lifeText().filter((t) => /Cradle 30[0-9]$|Shipment$/.test(t));
assertEqual(got, want, "Logbook order for the Shipment (members are built in declaration order, destroyed in reverse)");`,
        },
        {
          id: "t3",
          description: "Every constructor was matched by a destructor and no memory was lost",
          assertionCode: lab`
assert(audit, "The audit did not report.");
assertEqual(audit.ct, audit.dt, "constructions and destructions");
assert(audit.ct >= 6, "Run all the scopes: expected six constructions in total (three cradles, then a Shipment and its two cradles).");
assertEqual(audit.leaks.length, 0, "blocks left in the vault");
assertEqual(audit.al, audit.fr, "bays taken and returned");`,
        },
      ],
      unlocks: ["pv-logbook"],
      checks: [
        {
          prompt: "A class has members declared as `A a_; B b_;`. In what order are they destroyed?",
          question: { type: "choice", options: ["b_ then a_ (reverse of construction)", "a_ then b_", "Alphabetical order", "Unspecified: the compiler chooses"], answer: 0 },
          explanation: "Members are built in declaration order and destroyed in exactly the reverse order, after the class's own destructor body has run. That guarantee is what lets a later member safely use an earlier one.",
        },
        {
          prompt: "Which of these is the BEST way to make sure a heap block is always released, even if the function returns early?",
          question: { type: "choice", options: ["Put delete at the end of the function", "Wrap the block in an object whose destructor deletes it", "Remember to delete before every return", "Call delete in main"], answer: 1 },
          explanation: "A destructor runs on every way out of the scope. Hand-written deletes can be skipped by an early return or an exception; a wrapper object cannot be skipped.",
        },
      ],
    },

    // ───────────────────────── 6 ─────────────────────────
    {
      id: "cpp-memory-6-rule-of-three",
      title: "A class that owns memory: the rule of three",
      minutes: 30,
      xp: 120,
      concepts: ["resource-owning class", "destructor", "shallow copy", "deep copy", "copy constructor", "rule of three"],
      learn: md`### Owning a buffer

A \`Cradle\` held one crate. Real classes often own **a block whose size is chosen at run time**: a text, a list of readings, an image. The classic shape is a pointer and a size:

~~~cpp
class ReadingLog {
public:
    explicit ReadingLog(std::size_t count) : size_(count), readings_(new int[count]()) {}
    // ... accessors ...
private:
    std::size_t size_;
    int* readings_;      // the owner of a heap array
};
~~~

(\`new int[count]()\` with the empty parentheses fills the array with zeros.) The class acquired memory, so by RAII it must release it: a **destructor** with \`delete[] readings_;\`. Without one, every ReadingLog leaks its array.

### The surprise: copying is automatic, and wrong

You never wrote a way to copy a ReadingLog, yet this compiles:

~~~cpp
ReadingLog morningLog(4);
ReadingLog backupLog = morningLog;    // a copy... of what?
~~~

When you do not write one, the compiler generates a **copy constructor** that copies each member in turn. For \`size_\` that is right. For \`readings_\`, a pointer, "copy" means copy the *address*. Now both logs hold the same address. This is a **shallow copy**, and it has three consequences, each worse than the last:

1. **Shared data.** Writing to \`backupLog\` changes \`morningLog\`: they are one array wearing two names.
2. **A double free.** When the logs end, both destructors \`delete[]\` the same block. The second one is undefined behaviour.
3. **A leak** for any block that lost its only owner before that.

On the board you will see exactly this: two stack objects with arrows into the *same* bay and a red "two owners" warning.

### The fix: a deep copy

A **deep copy** gives the new object a buffer of its own, with the same contents:

~~~cpp
ReadingLog(const ReadingLog& other)
    : size_(other.size_), readings_(new int[other.size_]) {
    std::copy(other.readings_, other.readings_ + size_, readings_);
}
~~~

The parameter is a **const reference** (we need to read \`other\` without changing it, and without copying it, which would call this very constructor forever). \`std::copy\` from \`<algorithm>\` copies a range of elements.

### The rule of three

If a class needs one of these three, it almost certainly needs all three:

1. a **destructor** (it owns something that must be released),
2. a **copy constructor** (copying must not share the thing),
3. a **copy assignment operator** (assigning must not share it either; lesson 7).

The reasoning is simple: the compiler-generated versions copy members blindly, and a class that needs a custom destructor is by definition a class whose members cannot be copied blindly. In this lesson you write the first two and see the third gap in the next lesson.

### Making the problem visible

The starter below gives you a ReadingLog without a destructor or copy constructor and a main that copies it. Work in two runs:

1. **Add only the destructor and Run.** The board shows two owners of one bay. The audit catches the second \`delete[]\` and reports a double free. In a real program that is a crash or silent corruption.
2. **Add the copy constructor and Run again.** Two logs, two bays, no warning.

The logbook shows a \`copy\` line from your constructor, so you can count how many copies your program makes. Chapters 2 and 3 are largely about making that number small.

### Common mistakes

- \`delete readings_;\` for an array allocated with \`new[]\` (it must be \`delete[]\`).
- Writing the copy constructor's parameter as \`ReadingLog other\` (by value): it would need a copy to call itself. It is a compile error for good reason.
- Copying the pointer and size but forgetting to allocate (\`readings_(other.readings_)\`): that is the shallow copy again.
- Declaring members in one order and initialising them in another; the compiler initialises in declaration order.`,
      mission: md`The lab's climate cabinets record humidity readings through the night, and the first inventory code stored them in a small class that owns a heap array. It has a quiet bug: copy a log to keep a backup, and both logs secretly share one array.

Give ReadingLog a destructor and a deep-copy constructor. When the morning log and its backup have separate bays, the **Custody** panel powers on and shows which object owns which bay, and warns in red when two owners share one.`,
      tasks: [
        "In class ReadingLog (already in the starter) add a destructor: trace(\"dtor\", \"ReadingLog x\" + std::to_string(size_)); then delete[] readings_;",
        "Run now and read the board: the backup and the original share one bay and the audit catches a double free. That is the shallow copy",
        "Add a copy constructor ReadingLog(const ReadingLog& other) that allocates its own array, copies the numbers with std::copy and traces \"copy\" \"ReadingLog x\" + size",
        "Run again: the two logs must have different bays, morningFirst must stay 61 and backupFirst must be 99",
      ],
      starterAdd: cpp`#include <algorithm>
class ReadingLog {
public:
    explicit ReadingLog(std::size_t count) : size_(count), readings_(new int[count]()) {
        trace("ctor", "ReadingLog x" + std::to_string(count));
    }
    // ─── ✏️ YOUR TURN ─── lesson 6: add the destructor and the copy constructor here.
    // (Run once with only the destructor to see the shared bay, then add the copy constructor.)

    void set(std::size_t i, int value) { readings_[i] = value; }
    int get(std::size_t i) const { return readings_[i]; }
    std::size_t size() const { return size_; }
    const int* data() const { return readings_; }

private:
    std::size_t size_;
    int* readings_;
};
${MAIN_DIVIDER}
// Lesson 6: the morning log and its backup (already written for you).
ReadingLog morningLog(4);
morningLog.set(0, 61);
morningLog.set(1, 63);
ReadingLog backupLog = morningLog;
backupLog.set(0, 99);
scene("morningFirst", morningLog.get(0));
scene("backupFirst", backupLog.get(0));
peek("morningLog.readings", morningLog.data(), OWNER);
peek("backupLog.readings", backupLog.data(), OWNER);
snap("two logs, two buffers");`,
      solutionAdd: cpp`#include <algorithm>
class ReadingLog {
public:
    explicit ReadingLog(std::size_t count) : size_(count), readings_(new int[count]()) {
        trace("ctor", "ReadingLog x" + std::to_string(count));
    }
    ~ReadingLog() {  // 1) release
        trace("dtor", "ReadingLog x" + std::to_string(size_));
        delete[] readings_;
    }
    ReadingLog(const ReadingLog& other) : size_(other.size_), readings_(new int[other.size_]) {  // 2) deep copy
        std::copy(other.readings_, other.readings_ + size_, readings_);
        trace("copy", "ReadingLog x" + std::to_string(size_));
    }

    void set(std::size_t i, int value) { readings_[i] = value; }
    int get(std::size_t i) const { return readings_[i]; }
    std::size_t size() const { return size_; }
    const int* data() const { return readings_; }

private:
    std::size_t size_;
    int* readings_;
};
${MAIN_DIVIDER}
// Lesson 6: the morning log and its backup (already written for you).
ReadingLog morningLog(4);
morningLog.set(0, 61);
morningLog.set(1, 63);
ReadingLog backupLog = morningLog;
backupLog.set(0, 99);
scene("morningFirst", morningLog.get(0));
scene("backupFirst", backupLog.get(0));
peek("morningLog.readings", morningLog.data(), OWNER);
peek("backupLog.readings", backupLog.data(), OWNER);
snap("two logs, two buffers");`,
      explanation:
        "Without a copy constructor the compiler copies the pointer, so both logs own one array: writing 99 into the backup also changes the original, and both destructors delete the same block (the audit catches the second one). The destructor releases the array the constructor acquired. The copy constructor allocates a new array of the same size and copies the numbers across with std::copy, so the two objects own two separate bays and each destructor frees its own. That trio, destructor plus copy constructor (plus copy assignment, next lesson), is the rule of three.",
      hints: [
        { id: "h1", title: "Destructor", content: "~ReadingLog() { trace(\"dtor\", \"ReadingLog x\" + std::to_string(size_)); delete[] readings_; }  — square brackets, because the array was made with new int[count]." },
        { id: "h2", title: "Copy constructor", content: "ReadingLog(const ReadingLog& other) : size_(other.size_), readings_(new int[other.size_]) { std::copy(other.readings_, other.readings_ + size_, readings_); trace(\"copy\", \"ReadingLog x\" + std::to_string(size_)); }" },
        { id: "h3", title: "Checking it worked", content: "Look at the two peeked pointers on the board: if the arrows end in the same bay you still have a shallow copy. After the fix each log has its own bay and the audit has no double free." },
      ],
      tests: [
        {
          id: "t1",
          description: "The backup changed without touching the original",
          assertionCode: lab`
assertEqual(scene.morningFirst, 61, "morningFirst (the original must keep its own number)");
assertEqual(scene.backupFirst, 99, "backupFirst");`,
        },
        {
          id: "t2",
          description: "The two logs own two different bays",
          assertionCode: lab`
const s = needShot("two logs, two buffers");
const a = ent(s, "morningLog.readings"), b = ent(s, "backupLog.readings");
assert(a && b, "Peek both buffers before the snap.");
assert(a.tb > 0 && b.tb > 0, "Both logs should own a heap array.");
assert(a.tb !== b.tb, "Both logs point at the same bay: that is the shallow copy. Give the copy constructor its own array.");`,
        },
        {
          id: "t3",
          description: "The copy was logged, and nothing leaked or was freed twice",
          assertionCode: lab`
const s = needShot("two logs, two buffers");
assert((s.ev || []).some((e) => e[0] === "copy" && /ReadingLog/.test(e[1])), 'The copy constructor should call trace("copy", ...).');
assert(audit, "The audit did not report.");
assertEqual(audit.bf, 0, "double frees caught by the audit");
assertEqual(audit.leaks.length, 0, "blocks left in the vault (does the destructor use delete[]?)");`,
        },
      ],
      unlocks: ["pv-custody"],
      checks: [
        {
          prompt: "Why must a copy constructor take its parameter by reference (`const ReadingLog&`) and not by value?",
          question: { type: "choice", options: ["References are faster to type", "A by-value parameter would itself need the copy constructor, endlessly", "By value would be a shallow copy", "The compiler forbids value parameters in constructors"], answer: 1 },
          explanation: "Passing by value means making a copy, which calls the copy constructor, which needs a copy of its parameter... forever. The compiler rejects the signature. `const&` reads the original without copying it.",
        },
        {
          prompt: "What does the compiler-generated copy constructor do with a raw pointer member?",
          question: { type: "choice", options: ["Allocates a new block and copies the contents", "Copies the address, so both objects point at the same block", "Sets the pointer to nullptr", "Refuses to compile"], answer: 1 },
          explanation: "A raw pointer is just a number to the compiler, so it copies the number. Two objects that both think they own the block is the shallow-copy bug.",
        },
      ],
    },

    // ───────────────────────── 7 ─────────────────────────
    {
      id: "cpp-memory-7-copy-assignment",
      title: "Copy assignment and the copy-and-swap idiom",
      minutes: 30,
      xp: 120,
      concepts: ["copy assignment", "self-assignment", "swap", "copy-and-swap", "strong exception safety", "noexcept", "friend"],
      learn: md`### Assignment is not construction

\`PigmentSet blues = reds;\` makes a **new** object: that is the copy constructor. But \`blues = reds;\` with \`blues\` already alive is an **assignment**, and it is a different function: the **copy assignment operator**. It has a harder job, because \`blues\` already owns a buffer.

If you do not write it, the compiler generates one that copies member by member: the shallow copy again, and now with a leak on top, because \`blues\`' old buffer is lost.

### The obvious version, and its traps

~~~cpp
PigmentSet& operator=(const PigmentSet& other) {
    delete[] grams_;                          // 1) release my old buffer
    size_ = other.size_;
    grams_ = new int[size_];                  // 2) allocate a new one
    std::copy(other.grams_, other.grams_ + size_, grams_);   // 3) copy
    return *this;
}
~~~

Two problems:

- **Self-assignment.** \`reds = reds;\` (it happens through references and containers more than you would think) deletes the buffer, then copies *from the buffer it just deleted*.
- **Not exception safe.** If \`new\` throws after the \`delete[]\`, the object is left pointing at freed memory.

The usual patch is an \`if (this != &other)\` guard and careful ordering. It works, but it is easy to get subtly wrong.

### Copy-and-swap

There is a cleaner idiom with one clever move: **take the parameter by value**. The caller's copy constructor makes the copy for you (that is the step that can throw, and it happens *before* we touch anything of ours). Then we **swap** our guts with the copy; when the function ends, the copy, now holding our old buffer, is destroyed, and the old buffer is released.

~~~cpp
friend void swap(PigmentSet& a, PigmentSet& b) noexcept {
    std::swap(a.size_, b.size_);
    std::swap(a.grams_, b.grams_);
}

PigmentSet& operator=(PigmentSet other) {   // 'other' is already a copy
    swap(*this, other);
    return *this;                           // 'other' dies here, taking our old buffer
}
~~~

Why this is good:

- **Self-assignment works** with no special case: we copy ourselves, swap, and release the extra copy.
- **Strong exception safety**: if the copy throws, we never changed. If it succeeds, the swap cannot throw (that is what \`noexcept\` promises), so the assignment either fully happens or does not happen at all.
- It reuses the copy constructor and the destructor, so there is no duplicated logic to keep in sync.

A \`friend\` function is a free function allowed to see the class's private members; defining it inside the class makes it findable by argument-dependent lookup, which is why callers can write \`swap(a, b)\` unqualified.

### What the board shows

Every assignment makes exactly one \`copy\` in the logbook (the by-value parameter). The old buffer's bay turns into a *freed* bay at the end of the statement, and the two sets keep distinct bays even though they now hold the same numbers. Assigning a set to itself is harmless: you will see one copy and a clean audit.

### Common mistakes

- Returning by value from \`operator=\` instead of \`T&\`, which breaks chaining like \`a = b = c\`.
- Marking \`swap\` without \`noexcept\` and losing the strong guarantee.
- Swapping with the wrong object (swap *this and the parameter, not two of the parameter's members).
- Forgetting that a class with a user-defined assignment should also have its copy constructor and destructor (the rule of three).`,
      mission: md`The restorers mix pigments from sets of tubes, and a set can be copied onto another: *use the reds from yesterday's palette on today's bench*. The set owns a heap array of grams, and its constructor, destructor and copy constructor are already written. Assignment is not, and the default one leaks the old bay and shares the new one.

Write swap and the copy assignment operator so that \`blues = reds\` replaces blues' contents safely, \`reds = reds\` does nothing wrong, and the audit stays clean. When it does, the **Casting room** panel powers on and counts every copy, with the shallow version shown for comparison.`,
      tasks: [
        "In class PigmentSet add friend void swap(PigmentSet& a, PigmentSet& b) noexcept that swaps size_ and grams_ with std::swap",
        "Add PigmentSet& operator=(PigmentSet other) that swaps *this with other and returns *this",
        "Run: bluesFirst must be 40, redsFirst 77 and bluesSize 3, with different bays for blues and reds",
        "Check the audit: nothing leaked and no block freed twice. The self-assignment line must not break anything",
      ],
      starterAdd: cpp`class PigmentSet {
public:
    explicit PigmentSet(std::size_t count) : size_(count), grams_(new int[count]()) {
        trace("ctor", "PigmentSet x" + std::to_string(count));
    }
    PigmentSet(const PigmentSet& other) : size_(other.size_), grams_(new int[other.size_]) {
        std::copy(other.grams_, other.grams_ + size_, grams_);
        trace("copy", "PigmentSet x" + std::to_string(size_));
    }
    ~PigmentSet() {
        trace("dtor", "PigmentSet x" + std::to_string(size_));
        delete[] grams_;
    }
    // ─── ✏️ YOUR TURN ─── lesson 7: add swap and the copy assignment operator here.
    // Without them the compiler's assignment copies the pointer: a leak and a shared array.

    void set(std::size_t i, int value) { grams_[i] = value; }
    int get(std::size_t i) const { return grams_[i]; }
    std::size_t size() const { return size_; }
    const int* data() const { return grams_; }

private:
    std::size_t size_;
    int* grams_;
};
${MAIN_DIVIDER}
// Lesson 7: copy a palette onto another (already written for you).
PigmentSet reds(3);
reds.set(0, 40);
PigmentSet blues(5);
blues.set(0, 15);
blues = reds;
reds.set(0, 77);
PigmentSet& redsAgain = reds;
reds = redsAgain;
scene("bluesFirst", blues.get(0));
scene("redsFirst", reds.get(0));
scene("bluesSize", blues.size());
peek("reds.grams", reds.data(), OWNER);
peek("blues.grams", blues.data(), OWNER);
snap("after assignment");`,
      solutionAdd: cpp`class PigmentSet {
public:
    explicit PigmentSet(std::size_t count) : size_(count), grams_(new int[count]()) {
        trace("ctor", "PigmentSet x" + std::to_string(count));
    }
    PigmentSet(const PigmentSet& other) : size_(other.size_), grams_(new int[other.size_]) {
        std::copy(other.grams_, other.grams_ + size_, grams_);
        trace("copy", "PigmentSet x" + std::to_string(size_));
    }
    ~PigmentSet() {
        trace("dtor", "PigmentSet x" + std::to_string(size_));
        delete[] grams_;
    }
    friend void swap(PigmentSet& a, PigmentSet& b) noexcept {  // cannot throw: just exchanges two pairs
        std::swap(a.size_, b.size_);
        std::swap(a.grams_, b.grams_);
    }
    PigmentSet& operator=(PigmentSet other) {  // 'other' is already a deep copy
        swap(*this, other);
        return *this;  // 'other' now owns our old buffer and releases it
    }

    void set(std::size_t i, int value) { grams_[i] = value; }
    int get(std::size_t i) const { return grams_[i]; }
    std::size_t size() const { return size_; }
    const int* data() const { return grams_; }

private:
    std::size_t size_;
    int* grams_;
};
${MAIN_DIVIDER}
// Lesson 7: copy a palette onto another (already written for you).
PigmentSet reds(3);
reds.set(0, 40);
PigmentSet blues(5);
blues.set(0, 15);
blues = reds;
reds.set(0, 77);
PigmentSet& redsAgain = reds;
reds = redsAgain;
scene("bluesFirst", blues.get(0));
scene("redsFirst", reds.get(0));
scene("bluesSize", blues.size());
peek("reds.grams", reds.data(), OWNER);
peek("blues.grams", blues.data(), OWNER);
snap("after assignment");`,
      explanation:
        "operator= takes its parameter by value, so the copy constructor builds a private deep copy first (the only step that can fail). swap then exchanges our buffer with the copy's, and when the function ends the copy, now holding our old buffer, is destroyed and releases it. blues therefore holds a fresh 3-element copy of reds (first value 40) in its own bay, and reds keeps its own array (first value changed to 77 afterwards). Assigning reds to itself just copies, swaps and frees the spare copy, so no special case is needed and nothing leaks.",
      hints: [
        { id: "h1", title: "swap", content: "Inside the class: friend void swap(PigmentSet& a, PigmentSet& b) noexcept { std::swap(a.size_, b.size_); std::swap(a.grams_, b.grams_); }" },
        { id: "h2", title: "operator=", content: "Take the parameter by VALUE, not by const reference: PigmentSet& operator=(PigmentSet other) { swap(*this, other); return *this; }" },
        { id: "h3", title: "What to look for", content: "On the board, blues and reds must end up in different bays and the old bays for blues must be freed. If the audit reports a double free you probably still have the compiler's shallow assignment: check that operator= is inside the class and spelled exactly." },
      ],
      tests: [
        {
          id: "t1",
          description: "Assignment copied the values and the later change to reds stayed in reds",
          assertionCode: lab`
assertEqual(scene.bluesFirst, 40, "bluesFirst (blues got reds' first value when it was assigned)");
assertEqual(scene.redsFirst, 77, "redsFirst (the change after the assignment belongs to reds only)");
assertEqual(scene.bluesSize, 3, "bluesSize (blues takes reds' size)");`,
        },
        {
          id: "t2",
          description: "blues and reds own different bays after assignment",
          assertionCode: lab`
const s = needShot("after assignment");
const r = ent(s, "reds.grams"), b = ent(s, "blues.grams");
assert(r && b, "Peek reds.grams and blues.grams.");
assert(r.tb > 0 && b.tb > 0 && r.tb !== b.tb, "blues and reds should each own their own array after assignment.");`,
        },
        {
          id: "t3",
          description: "No leaks and no double frees",
          assertionCode: lab`
assert(audit, "The audit did not report.");
assertEqual(audit.bf, 0, "double frees caught by the audit");
assertEqual(audit.leaks.length, 0, "blocks left in the vault (did blues' old array get released?)");`,
        },
        {
          id: "t4",
          description: "Assignments were done by copy-and-swap",
          assertionCode: lab`
const s = needShot("after assignment");
const copies = (s.ev || []).filter((e) => e[0] === "copy" && /PigmentSet/.test(e[1])).length;
assert(copies >= 2, "Each assignment should make one copy through the by-value parameter. Found " + copies + " copy line(s) for PigmentSet: write operator=(PigmentSet other).");`,
        },
      ],
      unlocks: ["pv-casts"],
      checks: [
        {
          prompt: "In copy-and-swap, who makes the copy?",
          question: { type: "choice", options: ["A line inside operator= that calls new", "The copy constructor, when the by-value parameter is built", "The destructor", "The compiler never copies"], answer: 1 },
          explanation: "The parameter `PigmentSet other` is initialised from the right-hand side by the copy constructor before the function body runs. Anything that can throw (allocation) happens there, before we change our own state.",
        },
        {
          prompt: "Why does `swap` have to be `noexcept` for the strong guarantee to hold?",
          question: { type: "choice", options: ["noexcept makes it faster", "If swap could throw halfway, the object would be left half changed", "The language requires it", "It lets the compiler skip the copy"], answer: 1 },
          explanation: "The whole idea is: do everything that can fail first, then commit with steps that cannot fail. A swap that can throw in the middle would break that promise.",
        },
      ],
    },

    // ───────────────────────── 8 ─────────────────────────
    {
      id: "cpp-memory-8-move",
      title: "Move semantics: handing over instead of copying",
      minutes: 35,
      xp: 130,
      concepts: ["lvalue vs rvalue", "rvalue reference", "std::move", "move constructor", "move assignment", "moved-from state", "noexcept"],
      learn: md`### Copying is expensive when the object owns a lot

Copying a \`Parcel\` of a million numbers allocates a million-number buffer and copies every one. Sometimes that is exactly what you want. Often it is waste: the source is a temporary that is about to be thrown away, or you are *handing* the parcel to someone else and will not use it again. Moving means "steal the guts and leave the husk": take over the pointer, and set the old owner's pointer to null. No allocation, no copying, a handful of assignments.

### lvalues and rvalues in one paragraph

An **lvalue** is a thing with a name and an address you can use again: \`sender\`. An **rvalue** is a temporary or a thing the program is finished with: \`Parcel(3)\`, or the result of a function call returning by value. C++ lets you write a function that accepts **only rvalues** using an **rvalue reference**, spelled \`Parcel&&\`. Overload resolution picks it automatically when the argument is a temporary.

### std::move does not move

\`std::move(x)\` is a **cast**: it says "treat \`x\` as an rvalue", nothing more. It is what lets you hand a *named* object to a function that takes \`&&\`:

~~~cpp
Parcel receiver = std::move(sender);   // calls the move constructor if there is one
~~~

If the class has no move constructor, this quietly falls back to copying. The cast alone does nothing. The work is done by the **move constructor** and **move assignment operator** that you write:

~~~cpp
Parcel(Parcel&& other) noexcept : size_(other.size_), items_(other.items_) {
    other.size_ = 0;          // leave the source empty but valid
    other.items_ = nullptr;
}

Parcel& operator=(Parcel&& other) noexcept {
    if (this != &other) {
        delete[] items_;              // release what we had
        size_ = other.size_;          // take over
        items_ = other.items_;
        other.size_ = 0;
        other.items_ = nullptr;
    }
    return *this;
}
~~~

Each steals the source's pointer and nulls it, so the source's destructor does nothing harmful (\`delete[] nullptr\` is allowed).

### The moved-from state

After a move the source is **valid but unspecified**. It is safe to destroy it, assign to it, or ask it things that do not depend on its value. Do not rely on what it contains. For your own classes you decide: here a moved-from Parcel is empty (size 0, no buffer). The board marks such objects with a *moved-from* badge and draws the arrow of the buffer going from the old owner to the new one.

### Why noexcept matters

Mark moves \`noexcept\`. A \`std::vector\` that has to grow must move its elements into the new, bigger array. If your move constructor might throw, the vector cannot safely do that (a failure midway would lose elements), so it **copies instead**. A missing \`noexcept\` can silently turn every reallocation into a deep copy of every element.

### Reading the counters

The Handover desk counts events in the logbook: every \`copy\` or \`assign-copy\` raises the copy counter, every \`move\` or \`assign-move\` raises the move counter. In this lesson's main you will see 1 copy (a backup of the sender that must keep its items) and three moves (move construction, move assignment, and a temporary pushed into a vector).

### Common mistakes

- Using an object after \`std::move\`d it, as if it still held its value.
- Writing \`return std::move(local);\` from a function. It stops the compiler's own optimisation (copy elision). Just \`return local;\`.
- Forgetting to null the source pointer in the move: both objects then delete the same block, the double free again.
- Forgetting \`noexcept\` on move operations.`,
      mission: md`A *parcel* is the lab's term for a numbered bundle of items travelling to a client. Copying one means photocopying the whole packing list and re-packing every item; handing it over means passing the same bundle across the desk. The cheapest handover is the right one when the old holder no longer needs it.

Parcel already knows how to be built, destroyed and copied. Teach it to be moved. When the Handover desk shows the sender emptied (moved-from), the receiver holding the same bay, and the copy counter reading 1 against 3 moves, the panel powers on.`,
      tasks: [
        "In class Parcel add the move constructor Parcel(Parcel&& other) noexcept: take other's size_ and items_, then set other.size_ = 0 and other.items_ = nullptr, and trace(\"move\", \"Parcel x\" + std::to_string(size_))",
        "Add the move assignment operator Parcel& operator=(Parcel&& other) noexcept: guard with this != &other, delete[] items_, take over, null the source and trace \"assign-move\" with the new size",
        "Run: senderSize and receiverSize must both be 0 (their items were handed on), spareFirst 5 and copyFirst 5",
        "In the logbook the handovers must show up as one copy and three moves",
      ],
      starterAdd: cpp`class Parcel {
public:
    explicit Parcel(std::size_t count) : size_(count), items_(new int[count]()) {
        trace("ctor", "Parcel x" + std::to_string(count));
    }
    ~Parcel() {
        trace("dtor", "Parcel x" + std::to_string(size_));
        delete[] items_;
    }
    Parcel(const Parcel& other) : size_(other.size_), items_(new int[other.size_]) {
        std::copy(other.items_, other.items_ + size_, items_);
        trace("copy", "Parcel x" + std::to_string(size_));
    }
    Parcel& operator=(const Parcel& other) {
        if (this != &other) {
            int* fresh = new int[other.size_];
            std::copy(other.items_, other.items_ + other.size_, fresh);
            delete[] items_;
            items_ = fresh;
            size_ = other.size_;
            trace("assign-copy", "Parcel x" + std::to_string(size_));
        }
        return *this;
    }
    // ─── ✏️ YOUR TURN ─── lesson 8: add the move constructor and the move assignment here.
    // Without them std::move quietly falls back to copying: check the copy counter.

    void set(std::size_t i, int value) { items_[i] = value; }
    int get(std::size_t i) const { return items_[i]; }
    std::size_t size() const { return size_; }
    const int* data() const { return items_; }

private:
    std::size_t size_;
    int* items_;
};
${MAIN_DIVIDER}
// Lesson 8: hand parcels over (already written for you).
Parcel sender(6);
sender.set(0, 5);
Parcel copyOfSender = sender;
Parcel receiver = std::move(sender);
Parcel spare(2);
spare = std::move(receiver);
std::vector<Parcel> convoy;
convoy.reserve(2);
convoy.push_back(Parcel(3));
scene("senderSize", sender.size());
scene("receiverSize", receiver.size());
scene("spareFirst", spare.get(0));
scene("copyFirst", copyOfSender.get(0));
peek("sender.items", sender.data(), OWNER);
peek("receiver.items", receiver.data(), OWNER);
peek("spare.items", spare.data(), OWNER);
peek("copyOfSender.items", copyOfSender.data(), OWNER);
peek("convoy", convoy);
snap("after the handovers");`,
      solutionAdd: cpp`class Parcel {
public:
    explicit Parcel(std::size_t count) : size_(count), items_(new int[count]()) {
        trace("ctor", "Parcel x" + std::to_string(count));
    }
    ~Parcel() {
        trace("dtor", "Parcel x" + std::to_string(size_));
        delete[] items_;
    }
    Parcel(const Parcel& other) : size_(other.size_), items_(new int[other.size_]) {
        std::copy(other.items_, other.items_ + size_, items_);
        trace("copy", "Parcel x" + std::to_string(size_));
    }
    Parcel& operator=(const Parcel& other) {
        if (this != &other) {
            int* fresh = new int[other.size_];
            std::copy(other.items_, other.items_ + other.size_, fresh);
            delete[] items_;
            items_ = fresh;
            size_ = other.size_;
            trace("assign-copy", "Parcel x" + std::to_string(size_));
        }
        return *this;
    }
    Parcel(Parcel&& other) noexcept : size_(other.size_), items_(other.items_) {  // steal...
        other.size_ = 0;  // ...and leave the source empty but valid
        other.items_ = nullptr;
        trace("move", "Parcel x" + std::to_string(size_));
    }
    Parcel& operator=(Parcel&& other) noexcept {
        if (this != &other) {
            delete[] items_;  // release what we had
            size_ = other.size_;
            items_ = other.items_;
            other.size_ = 0;
            other.items_ = nullptr;
            trace("assign-move", "Parcel x" + std::to_string(size_));
        }
        return *this;
    }

    void set(std::size_t i, int value) { items_[i] = value; }
    int get(std::size_t i) const { return items_[i]; }
    std::size_t size() const { return size_; }
    const int* data() const { return items_; }

private:
    std::size_t size_;
    int* items_;
};
${MAIN_DIVIDER}
// Lesson 8: hand parcels over (already written for you).
Parcel sender(6);
sender.set(0, 5);
Parcel copyOfSender = sender;
Parcel receiver = std::move(sender);
Parcel spare(2);
spare = std::move(receiver);
std::vector<Parcel> convoy;
convoy.reserve(2);
convoy.push_back(Parcel(3));
scene("senderSize", sender.size());
scene("receiverSize", receiver.size());
scene("spareFirst", spare.get(0));
scene("copyFirst", copyOfSender.get(0));
peek("sender.items", sender.data(), OWNER);
peek("receiver.items", receiver.data(), OWNER);
peek("spare.items", spare.data(), OWNER);
peek("copyOfSender.items", copyOfSender.data(), OWNER);
peek("convoy", convoy);
snap("after the handovers");`,
      explanation:
        "The move constructor takes over other's pointer and size and then nulls the source, so no new buffer is allocated and no numbers are copied; the source is left empty but valid and its destructor deletes a null pointer. Move assignment does the same after releasing the buffer it already owned (spare's old two-element array). std::move itself only casts to an rvalue: without these two members the same lines would silently copy. The sender and the receiver both end empty (the receiver's items moved on into spare), the spare holds the six numbers that started in sender, the backup copy kept its own, and the logbook shows one copy against three moves.",
      hints: [
        { id: "h1", title: "Move constructor", content: "Parcel(Parcel&& other) noexcept : size_(other.size_), items_(other.items_) { other.size_ = 0; other.items_ = nullptr; trace(\"move\", \"Parcel x\" + std::to_string(size_)); }" },
        { id: "h2", title: "Move assignment", content: "Parcel& operator=(Parcel&& other) noexcept { if (this != &other) { delete[] items_; size_ = other.size_; items_ = other.items_; other.size_ = 0; other.items_ = nullptr; trace(\"assign-move\", \"Parcel x\" + std::to_string(size_)); } return *this; }" },
        { id: "h3", title: "Checking it", content: "If the logbook still says three copies and no moves, the compiler used the copy members because it found no usable move members. Check that the && signatures are spelled exactly and live inside the class." },
      ],
      tests: [
        {
          id: "t1",
          description: "The moved-from parcels are empty and the receiver of the last move holds the data",
          assertionCode: lab`
assertEqual(scene.senderSize, 0, "senderSize (a moved-from Parcel should be left empty)");
assertEqual(scene.receiverSize, 0, "receiverSize (its items moved on into spare)");
assertEqual(scene.spareFirst, 5, "spareFirst (the first item travelled sender -> receiver -> spare)");
assertEqual(scene.copyFirst, 5, "copyFirst (the copy kept its own items)");`,
        },
        {
          id: "t2",
          description: "A moved-from parcel owns no bay and the backup still owns its own",
          assertionCode: lab`
const s = needShot("after the handovers");
const sender = ent(s, "sender.items"), spare = ent(s, "spare.items"), backup = ent(s, "copyOfSender.items");
assert(sender && spare && backup, "Peek the four item pointers before the snap.");
assert(sender.tg === 3, "sender should hold no bay after being moved from (its pointer must be nullptr).");
assert(spare.tb > 0 && backup.tb > 0 && spare.tb !== backup.tb, "spare took over the moved bay; the backup keeps a separate one.");`,
        },
        {
          id: "t3",
          description: "The logbook counts one copy and three moves",
          assertionCode: lab`
const s = needShot("after the handovers");
const ev = (s.ev || []).filter((e) => /Parcel/.test(e[1]));
const copies = ev.filter((e) => e[0] === "copy" || e[0] === "assign-copy").length;
const moves = ev.filter((e) => e[0] === "move" || e[0] === "assign-move").length;
assertEqual(copies, 1, "copies of a Parcel in the handover section (only the backup should be copied)");
assertEqual(moves, 3, "moves of a Parcel in the handover section (move construction, move assignment, and the temporary pushed into the vector)");`,
        },
        {
          id: "t4",
          description: "Nothing leaked and nothing was freed twice",
          assertionCode: lab`
needShot("after the handovers");
assert(audit, "The audit did not report.");
assertEqual(audit.bf, 0, "double frees caught by the audit (did you null the source pointer?)");
assertEqual(audit.leaks.length, 0, "blocks left in the vault");`,
        },
      ],
      unlocks: ["pv-handover"],
      checks: [
        {
          prompt: "What does `std::move(x)` actually do?",
          question: { type: "choice", options: ["Moves x's data into a new object", "Casts x to an rvalue so a move constructor or assignment may be chosen", "Deletes x", "Copies x faster"], answer: 1 },
          explanation: "It only changes how the expression is treated. The move constructor or move assignment you wrote does the moving. If the type has none, a copy happens instead.",
        },
        {
          prompt: "After `Parcel b = std::move(a);` which statement is always safe?",
          question: { type: "choice", options: ["Reading a's items as before", "Destroying a, or assigning a new value to it", "Using a's buffer pointer", "Calling a.get(0) to see the old number"], answer: 1 },
          explanation: "A moved-from object is valid but unspecified: you may destroy it or assign to it. Anything that relies on its old contents is a bug waiting to happen.",
        },
      ],
    },
  ],
};
