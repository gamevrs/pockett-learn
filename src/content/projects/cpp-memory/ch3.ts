import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { cpp, lab, md } from "./util.ts";

/**
 * Chapter 3: Safer ownership. The rule of five and zero, std::unique_ptr, operator overloading and
 * const correctness. From here the lab's own record type, Artifact, joins the program.
 */

export const chapter3: Chapter = {
  id: "safer-ownership",
  title: "Safer ownership",
  blurb: "Decide which special members a class really needs, let std::unique_ptr do the owning, and make your types pleasant and safe to use with operators and const.",
  lessons: [
    // ───────────────────────── 9 ─────────────────────────
    {
      id: "cpp-memory-9-rule-of-five",
      title: "The rule of five and the rule of zero",
      minutes: 25,
      xp: 120,
      concepts: ["rule of five", "rule of zero", "= default", "= delete", "implicit move suppression", "special member functions"],
      learn: md`### Six special members, and when the compiler writes them

A class can have six **special member functions**: the default constructor, the destructor, the copy constructor, the copy assignment, the move constructor and the move assignment. If you do not write one, the compiler may generate it. The word "may" is where the traps are.

- Generated **copy** operations copy each member. Generated **move** operations move each member.
- **If you declare a destructor, a copy operation or a move operation yourself, the compiler stops generating the moves.** A class with only a user-declared destructor still *compiles* with \`std::move\`, but the "move" quietly becomes a copy, because the move members do not exist and the copy members still do.

That last rule is the surprise of this lesson, and the Rule board shows it live.

### The rule of five

> If a class declares **any** of the destructor, copy constructor, copy assignment, move constructor or move assignment, it should explicitly declare **all five**.

Why: needing one of them means the class manages something. If it manages something, the blind member-by-member behaviour of the others is probably wrong, so decide each one deliberately. You can still say \`= default\` (do the ordinary thing), \`= delete\` (forbid it) or write your own. The five are *a decision list*, not necessarily five bodies of code:

~~~cpp
class PlaqueFive {
public:
    ~PlaqueFive() { trace("dtor", "PlaqueFive"); }
    PlaqueFive(const PlaqueFive&) = default;
    PlaqueFive& operator=(const PlaqueFive&) = default;
    PlaqueFive(PlaqueFive&&) noexcept = default;
    PlaqueFive& operator=(PlaqueFive&&) noexcept = default;
    // ...
};
~~~

Writing the destructor was only to log something, but it was enough to switch off the generated moves, so the other four lines restore the behaviour we want.

### The rule of zero

> Prefer classes that need **none** of the five.

If every member already manages itself (\`std::string\`, \`std::vector\`, \`std::unique_ptr\`, or a class that follows the rule of zero), then the compiler-generated copy, move and destructor do exactly the right thing, and your class contains no special members at all:

~~~cpp
class PlaqueZero {
public:
    explicit PlaqueZero(std::string text) : text_(std::move(text)), mark_("PlaqueZero") {}
private:
    std::string text_;
    Witness mark_;
};
~~~

This is the best design. The five-member version exists only for the small, careful classes that wrap a raw resource directly (like the \`Parcel\` of the last lesson); everything built on top should be zero. Lesson 10's \`std::unique_ptr\` is the tool that lets you get there.

### A witness for the experiment

To count copies and moves of classes whose special members are \`= default\`, the starter gives each class a member of a tiny provided type, \`Witness\`. Whenever the class is copied or moved, its Witness is too, and it writes the event to the logbook under the class's name. So you can compare three classes, one with the trap, one that follows the rule of five and one that follows the rule of zero, by just reading the counts.

### Common mistakes

- Writing only a destructor "to log something" and silently losing move semantics.
- Declaring \`= default\` for the move operations and forgetting \`noexcept\` (vectors then fall back to copying, as in lesson 8).
- Writing five members when zero would do. Ask: can a member type do the work?
- Using \`= delete\` for copy on a class that must be unique, then being surprised it cannot go in a \`std::vector\` by value (it can with move only).`,
      mission: md`The lab hangs a small plaque by every restored piece. Plaques are cheap to make, but when a plaque is passed to another shelf you want it *moved*, not re-engraved. The first plaque class was written with a tidy destructor "so we can log it", and nobody noticed that it quietly stopped moving.

The starter holds the broken plaque. Write two better ones: one that follows the rule of five, one that follows the rule of zero. When the Rule board shows the old plaque copying while the other two move, it powers on.`,
      tasks: [
        "Read class Plaque in the starter: it declares a destructor, so std::move(oldPlaque) silently copies. Run to see the copy in the logbook",
        "Write class PlaqueFive: members std::string text_ and Witness mark_; a constructor PlaqueFive(std::string text) : text_(std::move(text)), mark_(\"PlaqueFive\") {}; a destructor tracing \"dtor\" \"PlaqueFive\"; and the four other special members written as = default (the two moves with noexcept)",
        "Write class PlaqueZero with the same two members and the same style of constructor with \"PlaqueZero\", and NO destructor, copy or move declarations at all",
        "In main move each one: PlaqueFive fiveMoved = std::move(fivePlaque); and PlaqueZero zeroMoved = std::move(zeroPlaque); then snap(\"rules of five and zero\");",
      ],
      starterAdd: cpp`class Witness {  // provided: reports every copy and move made of it
public:
    explicit Witness(std::string owner) : owner_(std::move(owner)) {}
    Witness(const Witness& other) : owner_(other.owner_) { trace("copy", owner_); }
    Witness(Witness&& other) noexcept : owner_(other.owner_) { trace("move", owner_); }
    Witness& operator=(const Witness& other) {
        owner_ = other.owner_;
        trace("assign-copy", owner_);
        return *this;
    }
    Witness& operator=(Witness&& other) noexcept {
        owner_ = other.owner_;
        trace("assign-move", owner_);
        return *this;
    }

private:
    std::string owner_;
};

class Plaque {  // the trap: a destructor was declared, so there are no move members
public:
    explicit Plaque(std::string text) : text_(std::move(text)), mark_("Plaque") {}
    ~Plaque() { trace("dtor", "Plaque"); }

private:
    std::string text_;
    Witness mark_;
};

// ─── ✏️ YOUR TURN ─── lesson 9: write class PlaqueFive (rule of five) and class PlaqueZero (rule of zero) here.
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 9: the first plaque is already moved for you. Move the other two.
Plaque oldPlaque("Founders wing");
Plaque oldCopy = std::move(oldPlaque);
// PlaqueFive fivePlaque("North door");  then  PlaqueFive fiveMoved = std::move(fivePlaque);
// PlaqueZero zeroPlaque("East door");    then  PlaqueZero zeroMoved = std::move(zeroPlaque);
// snap("rules of five and zero");`,
      solutionAdd: cpp`class Witness {  // provided: reports every copy and move made of it
public:
    explicit Witness(std::string owner) : owner_(std::move(owner)) {}
    Witness(const Witness& other) : owner_(other.owner_) { trace("copy", owner_); }
    Witness(Witness&& other) noexcept : owner_(other.owner_) { trace("move", owner_); }
    Witness& operator=(const Witness& other) {
        owner_ = other.owner_;
        trace("assign-copy", owner_);
        return *this;
    }
    Witness& operator=(Witness&& other) noexcept {
        owner_ = other.owner_;
        trace("assign-move", owner_);
        return *this;
    }

private:
    std::string owner_;
};

class Plaque {  // the trap: a destructor was declared, so there are no move members
public:
    explicit Plaque(std::string text) : text_(std::move(text)), mark_("Plaque") {}
    ~Plaque() { trace("dtor", "Plaque"); }

private:
    std::string text_;
    Witness mark_;
};

class PlaqueFive {  // rule of five: all five declared, so the decision is explicit
public:
    explicit PlaqueFive(std::string text) : text_(std::move(text)), mark_("PlaqueFive") {}
    ~PlaqueFive() { trace("dtor", "PlaqueFive"); }
    PlaqueFive(const PlaqueFive&) = default;
    PlaqueFive& operator=(const PlaqueFive&) = default;
    PlaqueFive(PlaqueFive&&) noexcept = default;
    PlaqueFive& operator=(PlaqueFive&&) noexcept = default;

private:
    std::string text_;
    Witness mark_;
};

class PlaqueZero {  // rule of zero: every member manages itself, so nothing to declare
public:
    explicit PlaqueZero(std::string text) : text_(std::move(text)), mark_("PlaqueZero") {}

private:
    std::string text_;
    Witness mark_;
};
${MAIN_DIVIDER}
// Lesson 9: the three plaques.
Plaque oldPlaque("Founders wing");
Plaque oldCopy = std::move(oldPlaque);  // silently copies
PlaqueFive fivePlaque("North door");
PlaqueFive fiveMoved = std::move(fivePlaque);  // really moves
PlaqueZero zeroPlaque("East door");
PlaqueZero zeroMoved = std::move(zeroPlaque);  // really moves
snap("rules of five and zero");`,
      explanation:
        "Plaque declares a destructor, which stops the compiler from generating move operations. std::move(oldPlaque) therefore picks the copy constructor, and the Witness member reports a copy. PlaqueFive restores the moves by declaring all five members explicitly (four of them = default), so its Witness reports a move. PlaqueZero follows the rule of zero: its members (a string and a Witness) already know how to copy, move and clean up, so declaring nothing gives the right behaviour for free. That is the design to prefer.",
      hints: [
        { id: "h1", title: "PlaqueFive", content: "Same members and constructor as Plaque but with mark_(\"PlaqueFive\"), a destructor tracing \"dtor\" \"PlaqueFive\", and then four lines: PlaqueFive(const PlaqueFive&) = default; PlaqueFive& operator=(const PlaqueFive&) = default; PlaqueFive(PlaqueFive&&) noexcept = default; PlaqueFive& operator=(PlaqueFive&&) noexcept = default;" },
        { id: "h2", title: "PlaqueZero", content: "Only the two private members and the one constructor: explicit PlaqueZero(std::string text) : text_(std::move(text)), mark_(\"PlaqueZero\") {} — resist the urge to add a destructor." },
        { id: "h3", title: "Reading the result", content: "In the logbook Plaque shows a copy (the trap), PlaqueFive shows a move, PlaqueZero shows a move. If PlaqueFive shows a copy, check the && lines are all there and written with = default." },
      ],
      tests: [
        {
          id: "t1",
          description: "The plaque with only a destructor copied instead of moving",
          assertionCode: lab`
const s = needShot("rules of five and zero");
const ev = (s.ev || []).filter((e) => e[1] === "Plaque");
assert(ev.some((e) => e[0] === "copy"), "The first plaque should show a copy in the logbook. Leave class Plaque as provided.");
assert(!ev.some((e) => e[0] === "move"), "class Plaque must not have move members: that is the trap being shown.");`,
        },
        {
          id: "t2",
          description: "PlaqueFive moves (all five members declared)",
          assertionCode: lab`
const s = needShot("rules of five and zero");
const ev = (s.ev || []).filter((e) => e[1] === "PlaqueFive");
assert(ev.some((e) => e[0] === "move"), "PlaqueFive should move when it is moved. Declare the move constructor as PlaqueFive(PlaqueFive&&) noexcept = default;");
assert(!ev.some((e) => e[0] === "copy"), "PlaqueFive should not copy when moved.");
assert(lifeText().includes("dtor PlaqueFive"), "PlaqueFive should declare a destructor that traces \"dtor\" \"PlaqueFive\".");`,
        },
        {
          id: "t3",
          description: "PlaqueZero moves with no special members at all",
          assertionCode: lab`
const s = needShot("rules of five and zero");
const ev = (s.ev || []).filter((e) => e[1] === "PlaqueZero");
assert(ev.some((e) => e[0] === "move"), "PlaqueZero should move when it is moved: build it from a std::string and a Witness and write no special members.");
assert(!ev.some((e) => e[0] === "copy"), "PlaqueZero should not copy when moved.");
assert(!lifeText().includes("dtor PlaqueZero"), "PlaqueZero should not declare a destructor: that is the rule of zero.");`,
        },
      ],
      unlocks: ["pv-rules"],
      checks: [
        {
          prompt: "A class declares only `~Thing();`. What does `Thing b = std::move(a);` do?",
          question: { type: "choice", options: ["Moves a into b", "Copies a into b, because no move members were generated", "Does not compile", "Deletes a"], answer: 1 },
          explanation: "Declaring a destructor suppresses the implicit move operations, but copying is still generated, so the request to move falls back to a copy. Nothing warns you.",
        },
        {
          prompt: "Which design is preferred when a class's members are `std::string` and `std::vector<int>`?",
          question: { type: "choice", options: ["Write all five special members by hand", "Write none and let the compiler generate them (rule of zero)", "Write only the destructor", "Delete copying and moving"], answer: 1 },
          explanation: "Both members already copy, move and clean up correctly, so the generated members are exactly right. Fewer lines, fewer bugs.",
        },
      ],
    },

    // ───────────────────────── 10 ─────────────────────────
    {
      id: "cpp-memory-10-unique-ptr",
      title: "std::unique_ptr: one owner, no delete",
      minutes: 30,
      xp: 130,
      concepts: ["std::unique_ptr", "std::make_unique", "ownership transfer", "std::move", "get()", "reset()", "vector of unique_ptr", "non-owning view"],
      learn: md`### An owner you do not have to write

Lessons 5 to 9 wrote RAII classes by hand, and five special members each. \`std::unique_ptr<T>\` (from \`<memory>\`) is the standard library's ready-made version for the most common case: **one object on the heap, with exactly one owner**.

~~~cpp
#include <memory>

std::unique_ptr<Artifact> amphora = std::make_unique<Artifact>("AMP-01", "Red amphora", -450, 72);
~~~

\`std::make_unique<T>(args...)\` does the \`new\` for you, passes the arguments to the constructor, and returns the owning pointer. When the unique_ptr is destroyed, it deletes the object. You never write \`new\` or \`delete\`, a leak is practically impossible, and a double free cannot happen because **a unique_ptr cannot be copied**:

~~~cpp
auto other = amphora;               // compile error: copying a unique_ptr is deleted
~~~

That is not a limitation, it is the point: two copies would be two owners. The compiler enforces "one owner" for you.

### Ownership moves with std::move

When you want to hand the object to someone else, you **move** the unique_ptr (lesson 8 in action):

~~~cpp
std::vector<std::unique_ptr<Artifact>> storeroom;
storeroom.push_back(std::move(amphora));   // the vector now owns it
// amphora is now empty: it holds nullptr
~~~

After the move the old unique_ptr is *empty* (it compares equal to \`nullptr\`; \`if (amphora)\` is false). The board draws that as a **moved-from** badge, and the bay's owner arrow jumps from your variable to the vector's buffer. Functions that **return** a unique_ptr by value hand ownership out with no extra syntax (the compiler moves it for you):

~~~cpp
std::unique_ptr<Artifact> receiveArtifact(const std::string& id, /* ... */) {
    return std::make_unique<Artifact>(id, /* ... */);
}
~~~

### Looking without owning

Sometimes code only wants to *use* an object, not keep it alive. Give it a plain pointer or reference **without ownership**:

~~~cpp
Artifact* amphoraView = amphora.get();    // a borrowed pointer: raw, non-owning
~~~

The rule of thumb that makes all of this safe:

- **owning** pointer = \`std::unique_ptr\`, never a raw \`T*\`;
- **non-owning** pointer = raw \`T*\` or \`T&\`, and it must never be \`delete\`d, and must never outlive the owner.

The board labels the second kind **borrowed**. If the owner dies (or releases the object) while someone still holds a borrowed pointer, that pointer dangles, which is lesson 15's concern.

### The other members you will use

- \`p.reset();\` destroys the object now and leaves \`p\` empty. \`p.reset(new T(...))\` replaces it.
- \`p.release();\` gives up ownership **without** deleting and hands back the raw pointer. Whoever receives it must delete it. It is rarely what you want.
- \`if (p)\` or \`p != nullptr\` tests for empty. \`*p\` and \`p->member\` use the object.
- \`std::vector<std::unique_ptr<T>>\` is a perfectly good container: it owns its elements, destroying the vector destroys every object, and it reallocates cheaply because moving a unique_ptr is just moving a pointer. You cannot copy such a vector, only move it.

### Why not just use a vector of Artifact?

A \`std::vector<Artifact>\` stores the objects inline and moves/copies them when it grows. That is fine for small value types. A vector of unique_ptr is the answer when objects are large, must not move in memory (others hold pointers to them), or can be of different derived types (a later course).

### Common mistakes

- Initialising two unique_ptrs from the same raw pointer: two owners, a double free. Always start from \`make_unique\`.
- Calling \`.get()\` and then deleting the result.
- Using a unique_ptr after \`std::move\`-ing from it.
- Storing a raw owning pointer inside a class that also holds a unique_ptr to the same object.`,
      mission: md`Every piece in the lab is an **Artifact**: an id, a name, a year (negative for BC) and a condition from 0 to 100. Artifacts are created once, live as long as they are in the lab and must be destroyed exactly once. There is a perfect owner for that: one unique pointer, held by whatever shelf the piece is on.

The Artifact type is provided. Write the factory that receives a new artifact as a unique_ptr and fill a storeroom with them: move one in, create another straight into the container, and destroy a third on purpose. When the **Storeroom** panel shows the ownership hand-offs, borrowed views and a clean audit, it powers on.`,
      tasks: [
        "Write std::unique_ptr<Artifact> receiveArtifact(const std::string& id, const std::string& name, int year, int condition) returning std::make_unique<Artifact>(id, name, year, condition)",
        "In main create std::unique_ptr<Artifact> amphora = receiveArtifact(\"AMP-01\", \"Red amphora\", -450, 72); and a borrowed view Artifact* amphoraView = amphora.get(); Peek both (the view with BORROWED) and take snap(\"received\"); so the board remembers who owned the piece before the move",
        "Declare std::vector<std::unique_ptr<Artifact>> storeroom; move the amphora in with push_back(std::move(amphora)); and push_back a second one made by receiveArtifact(\"MIR-03\", \"Bronze mirror\", 120, 55)",
        "Make std::unique_ptr<Artifact> lamp = std::make_unique<Artifact>(\"LMP-07\", \"Clay lamp\", 1, 90); then destroy it right away with lamp.reset();",
        "Peek amphora, amphoraView (with BORROWED), storeroom and lamp, then snap(\"storeroom\");",
      ],
      starterAdd: cpp`#include <memory>

struct Artifact {  // provided: the lab's record type, written so every birth, copy and death shows in the logbook
    std::string id;
    std::string name;
    int year;
    int condition;
    Artifact(std::string id_, std::string name_, int year_, int condition_)
        : id(std::move(id_)), name(std::move(name_)), year(year_), condition(condition_) { trace("ctor", id); }
    Artifact(const Artifact& other) : id(other.id), name(other.name), year(other.year), condition(other.condition) { trace("copy", id); }
    Artifact(Artifact&& other) noexcept : id(other.id), name(std::move(other.name)), year(other.year), condition(other.condition) { trace("move", id); }
    ~Artifact() { trace("dtor", id); }
};

// ─── ✏️ YOUR TURN ─── lesson 10: write receiveArtifact here. It returns a std::unique_ptr<Artifact>.
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 10: the storeroom
// amphora (unique_ptr) + amphoraView (borrowed) -> move into the vector -> a second piece -> a lamp that is reset
// then peek amphora, amphoraView (BORROWED), storeroom, lamp and snap("storeroom");`,
      solutionAdd: cpp`#include <memory>

struct Artifact {  // provided: the lab's record type, written so every birth, copy and death shows in the logbook
    std::string id;
    std::string name;
    int year;
    int condition;
    Artifact(std::string id_, std::string name_, int year_, int condition_)
        : id(std::move(id_)), name(std::move(name_)), year(year_), condition(condition_) { trace("ctor", id); }
    Artifact(const Artifact& other) : id(other.id), name(other.name), year(other.year), condition(other.condition) { trace("copy", id); }
    Artifact(Artifact&& other) noexcept : id(other.id), name(std::move(other.name)), year(other.year), condition(other.condition) { trace("move", id); }
    ~Artifact() { trace("dtor", id); }
};

std::unique_ptr<Artifact> receiveArtifact(const std::string& id, const std::string& name, int year, int condition) {
    return std::make_unique<Artifact>(id, name, year, condition);  // ownership leaves by return
}
${MAIN_DIVIDER}
// Lesson 10: the storeroom.
std::unique_ptr<Artifact> amphora = receiveArtifact("AMP-01", "Red amphora", -450, 72);
Artifact* amphoraView = amphora.get();  // borrowed: a raw, non-owning pointer
peek("amphora", amphora);
peek("amphoraView", amphoraView, BORROWED);
snap("received");
std::vector<std::unique_ptr<Artifact>> storeroom;
storeroom.push_back(std::move(amphora));  // the vector is the owner now; amphora is empty
storeroom.push_back(receiveArtifact("MIR-03", "Bronze mirror", 120, 55));
std::unique_ptr<Artifact> lamp = std::make_unique<Artifact>("LMP-07", "Clay lamp", 1, 90);
lamp.reset();  // destroyed right now
peek("amphora", amphora);
peek("amphoraView", amphoraView, BORROWED);
peek("storeroom", storeroom);
peek("lamp", lamp);
snap("storeroom");`,
      explanation:
        "make_unique allocates the Artifact and returns the single owner; returning it from receiveArtifact hands ownership to the caller without any copying. get() gives out a borrowed raw pointer that the vector's element will outlive. push_back(std::move(amphora)) transfers ownership into the vector, leaving amphora empty (a moved-from unique_ptr is nullptr), while the borrowed view still points at the same object. reset() destroys the lamp immediately, so the logbook shows its dtor before the end of the run. Nothing was ever deleted by hand and the audit ends clean because every owner is a unique_ptr.",
      hints: [
        { id: "h1", title: "The factory", content: "std::unique_ptr<Artifact> receiveArtifact(const std::string& id, const std::string& name, int year, int condition) { return std::make_unique<Artifact>(id, name, year, condition); }" },
        { id: "h2", title: "Moving in", content: "storeroom.push_back(std::move(amphora)); — a unique_ptr cannot be copied, so std::move is required. The second piece is a temporary, so push_back(receiveArtifact(...)) needs no move." },
        { id: "h3", title: "The photo", content: "peek(\"amphoraView\", amphoraView, BORROWED); marks the raw pointer as a non-owning view. The vector peek shows one arrow per element on the board." },
      ],
      tests: [
        {
          id: "t1",
          description: "The storeroom owns two pieces and the amphora variable is empty",
          assertionCode: lab`
const s = needShot("storeroom");
const room = ent(s, "storeroom"), amph = ent(s, "amphora");
assert(room && amph, "Peek storeroom and amphora before the snap.");
assertEqual(room.len, 2, "pieces in the storeroom vector");
assert(amph.k === "own" && amph.tg === 3, "amphora should be an empty unique_ptr after being moved into the storeroom.");`,
        },
        {
          id: "t2",
          description: "amphoraView is a borrowed pointer to the object the storeroom owns",
          assertionCode: lab`
const before = needShot("received");
const first = ent(before, "amphora");
assert(first && first.k === "own" && first.tb > 0, "Before the move the amphora variable should own the piece: peek it and take snap(\"received\") first.");
const s = needShot("storeroom");
const room = ent(s, "storeroom"), view = ent(s, "amphoraView");
assert(room && view, "Peek storeroom and amphoraView before the snap.");
assert(view.r === "borrowed", 'Peek the view with BORROWED: peek("amphoraView", amphoraView, BORROWED);');
assert(view.tb > 0 && (room.vs || []).includes("-> #" + view.tb), "amphoraView should point at the very object the storeroom's first element owns.");`,
        },
        {
          id: "t3",
          description: "The lamp was created and destroyed straight away",
          assertionCode: lab`
const s = needShot("storeroom");
const lamp = ent(s, "lamp");
assert(lamp && lamp.k === "own" && lamp.tg === 3, "lamp should be an empty unique_ptr after reset().");
const names = (s.ev || []).filter((e) => e[0] === "ctor" || e[0] === "dtor").map((e) => e[0] + " " + e[1]);
assert(names.includes("ctor LMP-07") && names.includes("dtor LMP-07"), "The lamp should be built and destroyed before the photo (use lamp.reset()).");
assert(!names.includes("dtor AMP-01") && !names.includes("dtor MIR-03"), "The two pieces in the storeroom must still be alive at the photo.");`,
        },
        {
          id: "t4",
          description: "No artifact was copied, nothing leaked, nothing freed twice",
          assertionCode: lab`
assert(audit, "The audit did not report.");
assertEqual(audit.leaks.length, 0, "blocks left in the vault");
assertEqual(audit.bf, 0, "double frees caught by the audit");
const s = needShot("storeroom");
assert(!(s.ev || []).some((e) => e[0] === "copy" && /^[A-Z]{3}-/.test(e[1])), "An Artifact was copied. Move the unique_ptr instead (std::move) and build artifacts with make_unique.");`,
        },
      ],
      unlocks: ["pv-storeroom"],
      checks: [
        {
          prompt: "Why does `auto copy = amphora;` not compile when `amphora` is a `std::unique_ptr`?",
          question: { type: "choice", options: ["unique_ptr has no constructor", "Its copy operations are deleted, because two copies would be two owners", "auto cannot deduce smart pointers", "amphora is const"], answer: 1 },
          explanation: "The class deliberately deletes copying so that 'exactly one owner' is enforced at compile time. Use std::move to transfer ownership.",
        },
        {
          prompt: "A function only needs to read an Artifact for a moment. What should its parameter be?",
          question: { type: "choice", options: ["std::unique_ptr<Artifact> by value", "const Artifact& (or a raw pointer if it may be null)", "std::unique_ptr<Artifact>&&", "Artifact by value"], answer: 1 },
          explanation: "Borrowing needs no ownership. A reference (or raw pointer) says 'use this, do not keep it'. Taking a unique_ptr by value would force the caller to give the object away.",
        },
      ],
    },

    // ───────────────────────── 11 ─────────────────────────
    {
      id: "cpp-memory-11-operators",
      title: "Operator overloading with good manners",
      minutes: 25,
      xp: 110,
      concepts: ["operator overloading", "operator==", "operator<", "operator<<", "operator+=", "operator+", "operator[]", "when not to overload"],
      learn: md`### Teaching your types the language's symbols

\`a + b\`, \`a == b\` and \`std::cout << a\` are ordinary function calls with nice syntax. For your own classes you can define what these symbols mean by writing a function called \`operator+\`, \`operator==\` and so on. This is **operator overloading**, and it is how \`std::string\`, \`std::vector\` and \`std::unique_ptr\` get their familiar syntax.

The golden rule: **an overloaded operator should do what the operator means for numbers, and nothing surprising.** \`+\` adds, \`==\` compares, \`<<\` prints. If you cannot say what the operator would "obviously" do for your type, use a named function instead.

### A small value type

~~~cpp
struct Weight {
    int grams = 0;
    bool operator==(const Weight& other) const { return grams == other.grams; }
    bool operator<(const Weight& other) const { return grams < other.grams; }
    Weight& operator+=(const Weight& other) { grams += other.grams; return *this; }
};
~~~

- **Comparison** (\`==\`, \`<\`): members taking a \`const&\` and marked \`const\` (they do not change either object; lesson 12). Define \`<\` and you can sort a vector of Weights with \`std::sort\`; define \`==\` and \`std::find\` works.
- **Compound assignment** (\`+=\`) changes the left operand and returns **a reference to it**, so \`a += b += c\` chains.
- **Binary plus** is best written *using* \`+=\`, as a free function that takes the left operand **by value** (the copy is the result):

~~~cpp
Weight operator+(Weight left, const Weight& right) { left += right; return left; }
~~~

- **Stream output** must be a free function, because the left operand is the stream, not your class. It takes and returns the stream by reference so calls chain:

~~~cpp
std::ostream& operator<<(std::ostream& out, const Weight& w) { return out << w.grams << " g"; }
~~~

C++20 can also generate all six comparisons from one line, \`auto operator<=>(const Weight&) const = default;\`, plus \`bool operator==(const Weight&) const = default;\`. It is the modern shortcut; writing the two by hand first shows what it saves you.

### operator[] for container-like classes

A class that holds a sequence of things usually offers \`obj[i]\`. Provide **two** versions: a non-const one that returns a reference you can write through, and a const one that returns a const reference:

~~~cpp
Weight& operator[](std::size_t i) { return slots_.at(i); }
const Weight& operator[](std::size_t i) const { return slots_.at(i); }
~~~

Using \`.at(i)\` inside makes a bad index throw \`std::out_of_range\` instead of corrupting memory (plain \`slots_[i]\` would not check).

### When not to overload

- Do not overload an operator for a meaning that is not obvious. \`rack + weight\` adding an item to a rack is cute, but a reader cannot tell if it mutates \`rack\`; write \`rack.add(weight)\`.
- Never overload \`&&\`, \`||\` or the comma (you lose their short-circuit order), or unary \`&\` (the address-of).
- Do not make \`==\` and \`<\` disagree, and do not make \`<\` something that is not a consistent ordering (sorting would break).
- Keep related operators together: if you have \`==\`, you probably want \`!=\` (C++20 generates it for you from \`==\`).

### Common mistakes

- Forgetting \`const\` on comparison operators, which then cannot be used on const objects.
- Returning by value from \`+=\` (an extra copy and no chaining).
- Writing \`operator<<\` as a member function (it cannot be: the left operand is a stream).
- Printing from inside an operator that is not \`<<\`.`,
      mission: md`The lab's racks have weight limits, and the intake clerks keep writing \`totalGrams(a.grams, b.grams)\` all over the place. Give the lab a real *Weight* type that adds, compares and prints like a number, and a *Rack* that stores weights and lets you read and change a slot with square brackets.

The starter has the two types waiting for their operators. When the Operator bench shows your comparisons, sum and printed text matching the numbers, it powers on.`,
      tasks: [
        "In struct Weight add operator== and operator< (const members taking const Weight&) and Weight& operator+=(const Weight& other)",
        "Below the struct write the free functions Weight operator+(Weight left, const Weight& right) (built from +=) and std::ostream& operator<<(std::ostream& out, const Weight& w) printing the grams then \" g\"",
        "In class Rack add both versions of operator[]: Weight& operator[](std::size_t i) and const Weight& operator[](std::size_t i) const, using slots_.at(i)",
        "Run: the lines carried: 1600 g and rack slot 0: 320 g must appear, and the three scene values must match",
      ],
      starterAdd: cpp`struct Weight {
    int grams = 0;
    // ─── ✏️ YOUR TURN ─── lesson 11: add ==, <, and += here.
};
// ─── ✏️ YOUR TURN ─── lesson 11: write operator+ and operator<< (free functions) here.

class Rack {
public:
    void add(Weight w) { slots_.push_back(w); }
    std::size_t size() const { return slots_.size(); }
    // ─── ✏️ YOUR TURN ─── lesson 11: add the two operator[] overloads here.

private:
    std::vector<Weight> slots_;
};
${MAIN_DIVIDER}
// Lesson 11: weights on a rack (already written for you).
Weight light{300};
Weight heavy{1250};
Weight carried = light + heavy;
carried += Weight{50};
Rack testRack;
testRack.add(light);
testRack.add(heavy);
testRack[0] += Weight{20};
std::cout << "carried: " << carried << "\n";
std::cout << "rack slot 0: " << testRack[0] << "\n";
scene("lightLighter", light < heavy);
scene("slotMatches", testRack[0] == Weight{320});
scene("carriedGrams", carried.grams);
snap("operators");`,
      solutionAdd: cpp`struct Weight {
    int grams = 0;
    bool operator==(const Weight& other) const { return grams == other.grams; }
    bool operator<(const Weight& other) const { return grams < other.grams; }
    Weight& operator+=(const Weight& other) {
        grams += other.grams;
        return *this;  // lets calls chain
    }
};
Weight operator+(Weight left, const Weight& right) {  // left is a copy: it becomes the result
    left += right;
    return left;
}
std::ostream& operator<<(std::ostream& out, const Weight& w) { return out << w.grams << " g"; }

class Rack {
public:
    void add(Weight w) { slots_.push_back(w); }
    std::size_t size() const { return slots_.size(); }
    Weight& operator[](std::size_t i) { return slots_.at(i); }              // writable
    const Weight& operator[](std::size_t i) const { return slots_.at(i); }  // read-only

private:
    std::vector<Weight> slots_;
};
${MAIN_DIVIDER}
// Lesson 11: weights on a rack (already written for you).
Weight light{300};
Weight heavy{1250};
Weight carried = light + heavy;
carried += Weight{50};
Rack testRack;
testRack.add(light);
testRack.add(heavy);
testRack[0] += Weight{20};
std::cout << "carried: " << carried << "\n";
std::cout << "rack slot 0: " << testRack[0] << "\n";
scene("lightLighter", light < heavy);
scene("slotMatches", testRack[0] == Weight{320});
scene("carriedGrams", carried.grams);
snap("operators");`,
      explanation:
        "operator+ is built on operator+=: the left operand arrives by value, so adding into the copy gives the sum without touching the original. operator<< takes the stream by reference and returns it, which is what lets std::cout << a << b chain. The rack's operator[] comes in two flavours: the non-const one returns a reference you can write through (testRack[0] += Weight{20}), the const one returns a const reference for read-only racks, and both use at() so a bad index throws instead of reading stray memory. Comparisons are const members because they change nothing.",
      hints: [
        { id: "h1", title: "In the struct", content: "bool operator==(const Weight& other) const { return grams == other.grams; } and the same shape for <. Weight& operator+=(const Weight& other) { grams += other.grams; return *this; }" },
        { id: "h2", title: "Free functions", content: "Weight operator+(Weight left, const Weight& right) { left += right; return left; }  and  std::ostream& operator<<(std::ostream& out, const Weight& w) { return out << w.grams << \" g\"; }" },
        { id: "h3", title: "Rack", content: "Weight& operator[](std::size_t i) { return slots_.at(i); } and the same with const Weight& and a const after the parameter list." },
      ],
      tests: [
        {
          id: "t1",
          description: "Weights add, accumulate and print like numbers",
          assertionCode: lab`
assert(lines.includes("carried: 1600 g"), 'Expected the line: carried: 1600 g — operator<< should print the grams followed by " g".');
assertEqual(scene.carriedGrams, 1600, "carriedGrams (300 + 1250, then += 50)");`,
        },
        {
          id: "t2",
          description: "operator[] reads and writes a rack slot",
          assertionCode: lab`
assert(lines.includes("rack slot 0: 320 g"), "Expected the line: rack slot 0: 320 g — testRack[0] += Weight{20} should change slot 0 in place.");`,
        },
        {
          id: "t3",
          description: "== and < compare the grams",
          assertionCode: lab`
assertEqual(scene.lightLighter, true, "lightLighter (300 g < 1250 g)");
assertEqual(scene.slotMatches, true, "slotMatches (slot 0 == 320 g)");
needShot("operators");`,
        },
      ],
      unlocks: ["pv-operators"],
      checks: [
        {
          prompt: "Why must `operator<<` for printing your class be a free function and not a member?",
          question: { type: "choice", options: ["Members cannot be const", "The left operand is the stream, so it can't be your class's member", "Free functions are faster", "The standard forbids members named operator<<"], answer: 1 },
          explanation: "A member operator is called on the left operand. In `std::cout << w` the left operand is `std::cout`, a class you don't own, so the function has to live outside.",
        },
        {
          prompt: "Which operator should NOT normally be overloaded?",
          question: { type: "choice", options: ["operator==", "operator&& (logical and)", "operator[]", "operator+="], answer: 1 },
          explanation: "An overloaded && or || is an ordinary function call and loses the short-circuit behaviour everyone expects (the right side is always evaluated). Overloading unary & and the comma operator is likewise a trap.",
        },
      ],
    },

    // ───────────────────────── 12 ─────────────────────────
    {
      id: "cpp-memory-12-const",
      title: "const correctness: const members and const&",
      minutes: 25,
      xp: 110,
      concepts: ["const member functions", "const objects", "const reference parameters", "mutable", "avoiding copies", "const-correct API"],
      learn: md`### const is a promise the compiler checks

\`const\` means "this will not change", and the compiler holds you to it. Used consistently ("**const-correctness**") it documents your intent, catches bugs at compile time and lets you pass things around without copying.

### const objects and const member functions

~~~cpp
const Specimen sealedBead("Sealed bead", 90);
sealedBead.restore(10);   // error: restore changes the object
~~~

A const object can only be used through its **const member functions**: member functions with \`const\` after the parameter list, which promise not to change the object.

~~~cpp
class Specimen {
public:
    const std::string& label() const { return label_; }   // reading: const
    int condition() const { return condition_; }           // reading: const
    void restore(int amount) { condition_ += amount; }     // changing: NOT const
    // ...
};
~~~

If a getter is **not** marked const, you cannot call it on a const object at all. You will meet this error:

~~~text
error: passing 'const Specimen' as 'this' argument discards qualifiers [-fpermissive]
~~~

It says: "you called a function that might modify the object on an object that must not be modified." The fix is almost always to add \`const\` to the getter, not to remove it from the object. Inside a const member function \`this\` is a pointer to const, so trying to assign to a member is a compile error, which is the protection you want.

### Pass big things by const&

A function parameter taken **by value** makes a copy:

~~~cpp
std::string summarize(Specimen piece);          // copies the whole Specimen on every call
std::string describe(const Specimen& piece);    // no copy; cannot be changed
~~~

\`const T&\` is the default way to pass anything bigger than a few bytes that the function only reads. It binds to non-const objects, const objects and temporaries alike. It is cheaper, and it states "I will not modify your object" in the signature. Copying is only the right call when the function needs its **own** copy to modify or keep. Small types (\`int\`, \`double\`, pointers) are fine by value.

The Glass case panel measures this: the Specimen traces a \`copy\` every time it is copied, so passing by value shows up as logbook lines and by const reference shows none.

### mutable

Occasionally a member must change even in a logically-const operation (a cache, a counter of reads). Mark that one member \`mutable\` and it may be modified from a const member function. Use it sparingly; if you reach for it often the design is probably off.

### Const and pointers (a recap of lesson 2)

\`const Specimen*\` is "pointer to a const Specimen" (read through it only). \`Specimen* const\` is a const pointer (cannot be re-pointed). Return types matter too: a getter returning \`const std::string&\` hands out a view that cannot be used to change the object's text.

### Const and the earlier lessons

Look back at the code you have written: \`ReadingLog::get\`, \`size\` and \`data\` were marked const; the copy constructors took \`const&\`; the comparison operators were const. It is the same rule everywhere: **mark everything const that can be.**

### Common mistakes

- Adding const to a function that does change a member (the compiler stops you).
- Taking a parameter by non-const reference when it is only read, which cannot be called with const objects or temporaries.
- Returning a non-const reference from a const function (it would let callers modify a const object).
- Using \`const_cast\` to silence the compiler. It is a code smell: fix the signature.`,
      mission: md`The conservators keep some pieces under glass: sealed, labelled and absolutely not to be touched. The inventory code has a Specimen class with getters that were never marked const, so it can't be used on a sealed specimen at all; and the helper that writes a one-line summary takes its specimen **by value**, photocopying the whole record each time it is asked a question.

Mark the getters const and pass the specimens by const reference. When the compiler is happy and the logbook shows no copies, the **Glass case** panel powers on.`,
      tasks: [
        "Build the starter. The compiler complains that describe() discards qualifiers: it calls label() and condition() through a const reference, so those two getters must be const",
        "Mark label() and condition() as const member functions (restore() changes the object, so it stays non-const)",
        "Change summarize so its parameter is const Specimen& instead of a copy",
        "Run: constCopies must be 0 and beadCondition 58. The sealed bead stays on the photo marked const",
      ],
      starterAdd: cpp`class Specimen {
public:
    Specimen(std::string label, int condition) : label_(std::move(label)), condition_(condition) { trace("ctor", label_); }
    Specimen(const Specimen& other) : label_(other.label_), condition_(other.condition_) { trace("copy", label_); }
    ~Specimen() { trace("dtor", label_); }
    // ─── ✏️ YOUR TURN ─── lesson 12: these two getters promise nothing yet. Mark them const.
    const std::string& label() { return label_; }
    int condition() { return condition_; }
    void restore(int amount) { condition_ += amount; }  // changes the object: not const

private:
    std::string label_;
    int condition_;
};

std::string describe(const Specimen& piece) { return piece.label() + " at " + std::to_string(piece.condition()) + "%"; }
// ─── ✏️ YOUR TURN ─── lesson 12: this copies the whole Specimen on every call. Take it by const reference.
std::string summarize(Specimen piece) { return piece.label() + ": " + std::to_string(piece.condition()); }
${MAIN_DIVIDER}
// Lesson 12: a sealed specimen and a working one (already written for you).
Specimen glassBead("Glass bead", 48);
const Specimen sealedBead("Sealed bead", 90);
Tally beforeConst = tally();
std::string describeA = describe(glassBead);
std::string describeB = describe(sealedBead);
std::string summaryA = summarize(glassBead);
Tally afterConst = tally();
glassBead.restore(10);
scene("constCopies", afterConst.copy - beforeConst.copy);
scene("beadCondition", glassBead.condition());
std::cout << describeA << "\n" << describeB << "\n" << summaryA << "\n";
peek("sealedBead", sealedBead);
snap("glass case");`,
      solutionAdd: cpp`class Specimen {
public:
    Specimen(std::string label, int condition) : label_(std::move(label)), condition_(condition) { trace("ctor", label_); }
    Specimen(const Specimen& other) : label_(other.label_), condition_(other.condition_) { trace("copy", label_); }
    ~Specimen() { trace("dtor", label_); }
    const std::string& label() const { return label_; }  // reading: const
    int condition() const { return condition_; }          // reading: const
    void restore(int amount) { condition_ += amount; }    // changing: not const

private:
    std::string label_;
    int condition_;
};

std::string describe(const Specimen& piece) { return piece.label() + " at " + std::to_string(piece.condition()) + "%"; }
std::string summarize(const Specimen& piece) { return piece.label() + ": " + std::to_string(piece.condition()); }
${MAIN_DIVIDER}
// Lesson 12: a sealed specimen and a working one (already written for you).
Specimen glassBead("Glass bead", 48);
const Specimen sealedBead("Sealed bead", 90);
Tally beforeConst = tally();
std::string describeA = describe(glassBead);
std::string describeB = describe(sealedBead);
std::string summaryA = summarize(glassBead);
Tally afterConst = tally();
glassBead.restore(10);
scene("constCopies", afterConst.copy - beforeConst.copy);
scene("beadCondition", glassBead.condition());
std::cout << describeA << "\n" << describeB << "\n" << summaryA << "\n";
peek("sealedBead", sealedBead);
snap("glass case");`,
      explanation:
        "describe() receives a const reference, so inside it the specimen is const and only const member functions may be called. label() and condition() only read, so marking them const is both correct and what makes them callable on the sealed bead. restore() changes condition_, so it must stay non-const; the compiler would refuse to let it run on the const sealedBead. summarize used to take the specimen by value, copying the record on every call; a const reference reads the original with no copy, which the logbook confirms: tally() shows zero copies across the three calls.",
      hints: [
        { id: "h1", title: "Where const goes", content: "For member functions const goes after the parameter list and before the body: int condition() const { return condition_; }" },
        { id: "h2", title: "Which getters", content: "label() and condition() only read, so both get const. restore() modifies condition_, so it does not." },
        { id: "h3", title: "The parameter", content: "std::string summarize(const Specimen& piece) — the & means no copy, the const means summarize cannot change it." },
      ],
      tests: [
        {
          id: "t1",
          description: "No Specimen was copied by the helper calls",
          assertionCode: lab`
assertEqual(scene.constCopies, 0, "copies made while describing and summarizing (take Specimen by const reference)");`,
        },
        {
          id: "t2",
          description: "The working specimen was restored and all three lines printed",
          assertionCode: lab`
assertEqual(scene.beadCondition, 58, "beadCondition (48 + 10)");
assert(lines.includes("Glass bead at 48%") && lines.includes("Sealed bead at 90%") && lines.includes("Glass bead: 48"), "The three describe/summarize lines should be printed before restore() runs.");`,
        },
        {
          id: "t3",
          description: "The sealed bead is a const object on the photo",
          assertionCode: lab`
const s = needShot("glass case");
const e = ent(s, "sealedBead");
assert(e, 'Peek the sealed bead: peek("sealedBead", sealedBead);');
assertEqual(e.cv, 1, "sealedBead should be a const object");`,
        },
      ],
      unlocks: ["pv-glass"],
      checks: [
        {
          prompt: "A getter `int condition() { return condition_; }` is not marked const. What happens when you call it on a `const Specimen`?",
          question: { type: "choice", options: ["It works normally", "A compile error: it discards qualifiers", "It returns 0", "It copies the object first"], answer: 1 },
          explanation: "A non-const member function might modify the object, which is forbidden for a const object, so the call is rejected. Add const to the getter.",
        },
        {
          prompt: "For a function that only reads a large object, which parameter type is the usual best choice?",
          question: { type: "choice", options: ["T", "T&", "const T&", "T*"], answer: 2 },
          explanation: "`const T&` avoids the copy, promises not to modify, and accepts const objects and temporaries. A plain `T&` rejects const objects and temporaries.",
        },
      ],
    },
  ],
};
