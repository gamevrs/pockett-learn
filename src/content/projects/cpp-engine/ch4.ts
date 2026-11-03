import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { cpp, js, md } from "./util.ts";

/**
 * Chapter 4: Who owns what, and what might be missing. shared_ptr, weak_ptr and reference cycles, std::optional and
 * std::variant with std::visit, and a capstone that wires every pattern of the course into one small engine.
 */

export const chapter4: Chapter = {
  id: "shared-and-sum",
  title: "Shared ownership and sum types",
  blurb: "Share one thing between many owners without leaks, break the cycles that sharing can create, say \"maybe nothing\" and \"one of several\" in the type, then wire the whole engine together.",
  lessons: [
    // ───────────────────────── 13 ─────────────────────────
    {
      id: "cpp-engine-13-shared",
      title: "shared_ptr: many owners, one thing",
      minutes: 30,
      xp: 120,
      concepts: ["ownership", "std::shared_ptr", "std::make_shared", "reference count", "use_count()", "reset()"],
      learn: md`### One chart, many ships

Every ship in the bay needs the harbour **chart**: the depth soundings. The chart is large and the harbour office updates it. In Provenance Lab you used \`std::unique_ptr\`, which has exactly **one owner**. **Ownership** means being responsible for destroying a thing; a \`unique_ptr\` makes that responsibility single and clear. But a chart used by many ships has no single natural owner. The other obvious choice, a private copy for every ship, goes wrong the moment the chart changes:

~~~cpp
Chart masterChart("2025", 100);       // 100 soundings
Chart shipCopy = masterChart;         // the ship gets its own copy
masterChart.soundings = 140;          // the harbour office updates the master
shipCopy.soundings;                   // still 100: the ship sails on stale data
~~~

You want **one chart that all ships use**, which disappears when the *last* ship lets go.

### shared_ptr: owners who take turns leaving

A \`std::shared_ptr<T>\` is a smart pointer that can be copied. All copies point at the same object, and together they keep a hidden **reference count**: how many \`shared_ptr\`s currently own it. Copying one adds 1, a \`shared_ptr\` going away subtracts 1, and when the count reaches 0 the object is destroyed. It is like a room whose lights go off when the last person leaves.

~~~cpp
auto chart = std::make_shared<Chart>("2026", 100);   // count: 1
std::shared_ptr<Chart> pilotCopy = chart;             // count: 2
{
    std::shared_ptr<Chart> ferryCopy = chart;         // count: 3
    ferryCopy->soundings = 140;                       // everyone sees this
}                                                     // ferryCopy leaves: count: 2
pilotCopy->soundings;                                 // 140: the same chart
pilotCopy.reset();                                    // let go on purpose: count: 1
chart.reset();                                        // the last owner: the chart is destroyed
~~~

- \`std::make_shared<Chart>(args...)\` builds the object and its counter together in one step. Prefer it to writing \`new\` yourself.
- \`copy->field\` and \`*copy\` work like a raw pointer.
- \`chart.use_count()\` tells you the current count. It is for learning and logging; do not make decisions from it in real code.
- \`reset()\` makes a \`shared_ptr\` let go of its object (it becomes empty).

### How the count is kept in a diagram

~~~text
chart ─┐
pilotCopy ──► [ Chart "2026" | count 3 ]
ferryCopy ─┘
~~~

Each arrow is one owner. The board draws exactly this with the number from \`use_count()\`.

### When to use which

- **unique_ptr**: the default. One clear owner, no counting overhead.
- **shared_ptr**: only when ownership really is shared and nobody can say who goes last.
- Neither: a plain value or a reference, when the lifetime is obvious.

The count makes \`shared_ptr\` slightly slower and slightly harder to reason about, so reach for it deliberately. Next lesson shows the trap that hides inside it.

### Common mistakes

- Making a second \`shared_ptr\` from the same raw pointer (\`shared_ptr<Chart>(raw)\` twice): two separate counters, so the object is deleted twice. Always copy an existing \`shared_ptr\`.
- Using \`shared_ptr\` everywhere "to be safe". Prefer \`unique_ptr\` unless sharing is the point.
- Reading \`use_count()\` to decide whether it is safe to delete. Another owner may appear a moment later.`,
      mission: md`The harbour office is publishing the new chart edition. First prove the problem with copies: the ship's copy stays at 100 soundings after the master changes. Then switch to a shared chart held by the harbour office, the pilot boat and (briefly) a ferry, watch the count rise and fall, and check the chart is destroyed exactly once, when the last owner lets go.

The **Owners** panel draws the chart with an arrow from every owner and the live count on it, stepping through each change.`,
      tasks: [
        "Above main, add inline std::vector<std::string> chartLog; and struct Chart with a constructor Chart(std::string e, int s), the data edition and soundings, and a destructor pushing \"chart \" + edition + \" destroyed\" onto chartLog",
        "Copy problem, in main (not in a block): Chart masterChart(\"2025\", 100); Chart shipCopy = masterChart; then masterChart.soundings = 140; and send scene(\"staleSoundings\", shipCopy.soundings);",
        "Shared version: auto chart = std::make_shared<Chart>(\"2026\", 100); and std::vector<long> useCounts; pushing chart.use_count() each time as you go: after creating it (1), after std::shared_ptr<Chart> pilotCopy = chart; (2)",
        "Open a block { }: std::shared_ptr<Chart> ferryCopy = chart; push the count (3) and set ferryCopy->soundings = 140; After the block closes push the count again (2). Send scene(\"sharedSoundings\", pilotCopy->soundings);",
        "Then pilotCopy.reset(); push the count (1); send scene(\"logBefore\", chartLog.size()); then chart.reset(); and send scene(\"useCounts\", useCounts); and scene(\"chartLog\", chartLog);",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── lesson 13: chartLog and struct Chart go here, above main.
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 13: the stale copy, then the shared chart.
// Keep the order: copy problem first, then make_shared, pilotCopy, the ferry block, reset pilotCopy, reset chart.
`,
      solutionAdd: cpp`inline std::vector<std::string> chartLog;

struct Chart {
    Chart(std::string e, int s) : edition(std::move(e)), soundings(s) {}
    ~Chart() { chartLog.push_back("chart " + edition + " destroyed"); }
    std::string edition;
    int soundings;
};
${MAIN_DIVIDER}
// Lesson 13: shared_ptr.
Chart masterChart("2025", 100);
Chart shipCopy = masterChart;
masterChart.soundings = 140;
scene("staleSoundings", shipCopy.soundings);

auto chart = std::make_shared<Chart>("2026", 100);
std::vector<long> useCounts;
useCounts.push_back(chart.use_count());
std::shared_ptr<Chart> pilotCopy = chart;
useCounts.push_back(chart.use_count());
{
    std::shared_ptr<Chart> ferryCopy = chart;
    useCounts.push_back(chart.use_count());
    ferryCopy->soundings = 140;
}
useCounts.push_back(chart.use_count());
scene("sharedSoundings", pilotCopy->soundings);
pilotCopy.reset();
useCounts.push_back(chart.use_count());
scene("logBefore", chartLog.size());
chart.reset();
scene("useCounts", useCounts);
scene("chartLog", chartLog);`,
      explanation:
        "The plain copy is a separate Chart, so changing the master leaves the ship's soundings at 100. With make_shared there is one Chart and a counter: 1 owner at the start, 2 with pilotCopy, 3 with the ferry's copy, back to 2 when the block ends, and 1 after pilotCopy.reset(). The ferry's write to soundings is seen by pilotCopy because it is the same object. The destructor has not run yet at logBefore (the log is empty); chart.reset() drops the last owner, the count hits 0 and the chart is destroyed exactly once.",
      hints: [
        { id: "h1", title: "The struct", content: "struct Chart { Chart(std::string e, int s) : edition(std::move(e)), soundings(s) {} ~Chart() { chartLog.push_back(\"chart \" + edition + \" destroyed\"); } std::string edition; int soundings; };" },
        { id: "h2", title: "Counting", content: "std::vector<long> useCounts; and after each change useCounts.push_back(chart.use_count()); Expected: 1, 2, 3, 2, 1." },
        { id: "h3", title: "Letting go", content: "pilotCopy.reset(); makes that owner let go (count 1). Check chartLog.size() is still 0, then chart.reset(); destroys the chart and chartLog gets its one line." },
      ],
      tests: [
        {
          id: "t1",
          description: "A plain copy went stale, the shared chart did not",
          assertionCode: js`
assertEqual(scene.staleSoundings, 100, "staleSoundings (the ship's private copy)");
assertEqual(scene.sharedSoundings, 140, "sharedSoundings (pilotCopy sees the ferry's update because it is the same chart)");`,
        },
        {
          id: "t2",
          description: "The reference count rose and fell with the owners",
          assertionCode: js`
assertEqual(scene.useCounts, [1, 2, 3, 2, 1], "useCounts (after make_shared, pilotCopy, ferryCopy, end of the ferry block, pilotCopy.reset())");`,
        },
        {
          id: "t3",
          description: "The chart was destroyed once, by the last owner",
          assertionCode: js`
assertEqual(scene.logBefore, 0, "logBefore (the chart must still be alive while one owner remains)");
assertEqual(scene.chartLog, ["chart 2026 destroyed"], "chartLog");`,
        },
      ],
      unlocks: ["en-owners"],
      checks: [
        {
          prompt: "Three `shared_ptr`s point at one chart. One of them goes out of scope. What is `use_count()` for the others?",
          question: { type: "number", answer: 2 },
          explanation: "A `shared_ptr` leaving subtracts one from the count. The chart is only destroyed when the count reaches 0.",
        },
        {
          prompt: "A single clear owner is enough for a gadget. Which pointer fits best?",
          question: { type: "choice", options: ["std::shared_ptr", "std::unique_ptr", "a raw pointer from new", "std::weak_ptr"], answer: 1 },
          explanation: "`unique_ptr` is the default: one owner, no counting cost. Use `shared_ptr` only when ownership is truly shared.",
        },
      ],
    },

    // ───────────────────────── 14 ─────────────────────────
    {
      id: "cpp-engine-14-weak",
      title: "weak_ptr: watching without owning, and reference cycles",
      minutes: 35,
      xp: 130,
      concepts: ["reference cycle", "memory leak via cycle", "std::weak_ptr", "lock()", "expired()", "back-reference"],
      learn: md`### The trap inside sharing

A berth in the harbour has a mooring line, and the mooring line knows which berth it ties to. In code, each holds a \`shared_ptr\` to the other:

~~~cpp
struct Mooring;
struct Berth {
    std::shared_ptr<Mooring> mooring;
};
struct Mooring {
    std::shared_ptr<Berth> berth;
};
~~~

Link them and let the variables go out of scope:

~~~cpp
{
    auto berth = std::make_shared<Berth>();
    auto mooring = std::make_shared<Mooring>();
    berth->mooring = mooring;     // berth owns mooring
    mooring->berth = berth;       // mooring owns berth
    // use_count of berth: 2 (the variable + mooring's pointer)
    // use_count of mooring: 2 (the variable + berth's pointer)
}   // the two variables go away: both counts drop to 1... and stay there
~~~

Each object is kept alive by the *other one*, and each is only released if the other is destroyed first. Nobody can go first. This is a **reference cycle**: a loop of owners, each holding the next. The counts never reach 0, the destructors never run, and the memory is never given back: a **leak** with no raw \`new\` in sight. The compiler cannot warn you, and a leak checker only notices after the fact.

### weak_ptr: a watcher that does not own

A \`std::weak_ptr<T>\` points at an object managed by \`shared_ptr\`s but does **not** add to the count. It is a note saying "I would like to talk to that thing if it is still there". Because it does not keep the object alive, it must ask before use:

- \`weak.expired()\` is \`true\` when the object has already been destroyed.
- \`weak.lock()\` returns a \`shared_ptr\` to the object if it is still alive, or an *empty* \`shared_ptr\` if not. While you hold the locked \`shared_ptr\`, the object cannot vanish under you.

~~~cpp
std::weak_ptr<Quay> watcher;
{
    auto westQuay = std::make_shared<Quay>("West");
    watcher = westQuay;                // watching, not owning
    watcher.expired();                 // false
}                                      // the only owner leaves: the quay is destroyed
watcher.expired();                     // true
~~~

### Breaking the cycle

In any loop, **one direction owns and the other only watches**. Ask "who is the boss?" The quay owns its crane; the crane merely wants to know which quay it works at, so the crane's back-link is a \`weak_ptr\`:

~~~cpp
struct Crane;
struct Quay {
    std::shared_ptr<Crane> crane;       // owns
};
struct Crane {
    std::weak_ptr<Quay> quay;           // watches the owner: no count added
};
~~~

Now with a variable each, the quay's count is 1 (only its variable) and the crane's is 2 (its variable and the quay's pointer). When the variables go away, the quay's count hits 0 first, the quay is destroyed, which lets go of the crane, whose count then hits 0. Everything is cleaned up, in a clear order.

To use the back-link safely:

~~~cpp
if (auto owner = crane->quay.lock()) {
    // owner is a real shared_ptr<Quay> for as long as this block runs
}
~~~

### Common mistakes

- Two classes holding \`shared_ptr\`s to each other: always a cycle. One side must be \`weak_ptr\`.
- Using \`weak_ptr\` where ownership is actually needed, then finding the object gone.
- Forgetting to \`lock()\` before using what a \`weak_ptr\` watches. A \`weak_ptr\` has no \`->\`.
- Treating \`expired()\` followed by \`lock()\` as two separate steps: another thread could change it in between. Just call \`lock()\` and test the result.`,
      mission: md`The harbour's buildings are full of back-references: berths and their moorings, quays and their cranes. Reproduce the leak on purpose with the berth and the mooring and prove by counts and a silent destructor that nothing is released. Then build the quay and the crane with a \`weak_ptr\` back-link, watch both be destroyed, and watch a standalone \`weak_ptr\` notice that its quay is gone.

The **Cycles** panel draws both graphs: the cycle with its two trapped counts, and the fixed chain with its watcher.`,
      tasks: [
        "Above main, add inline std::vector<std::string> goneLog; and the types Berth (owns shared_ptr<Mooring>) and Mooring (owns shared_ptr<Berth>): each has a name, a constructor taking it and a destructor pushing \"<name> berth gone\" / \"<name> mooring gone\"",
        "Add Quay (owns shared_ptr<Crane> crane) and Crane (watches weak_ptr<Quay> quay), each with a name, a constructor and a destructor pushing \"<name> quay gone\" / \"<name> crane gone\"",
        "In main, a block with a Berth \"North\" and a Mooring \"rope\" that point at each other. Inside the block fill std::vector<long> cycleCounts = {berth.use_count(), mooring.use_count()}; and send scene(\"cycleCounts\", cycleCounts); After the block send scene(\"goneAfterCycle\", goneLog.size());",
        "A second block with Quay \"East\" and Crane \"C1\" (quay->crane = crane; crane->quay = quay;). Inside: send scene(\"fixedCounts\", std::vector<long>{quay.use_count(), crane.use_count()}); and scene(\"lockWorks\", crane->quay.lock() != nullptr);",
        "A third: std::weak_ptr<Quay> watcher; and a block with a Quay \"West\" that you watch (watcher = westQuay;), recording bool watcherAliveInside = !watcher.expired(); inside and bool watcherAliveAfter = !watcher.expired(); after. Send them as scene(\"watcherAliveInside\", watcherAliveInside); and scene(\"watcherAliveAfter\", watcherAliveAfter); and finally scene(\"goneLog\", goneLog);",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── lesson 14: goneLog and the four types (Berth, Mooring, Quay, Crane) go here, above main.
// Forward-declare the second type of each pair (struct Mooring; and struct Crane;) before the first.
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 14: the cycle block, the fixed block and the watcher block.
`,
      solutionAdd: cpp`inline std::vector<std::string> goneLog;

struct Mooring;
struct Berth {
    explicit Berth(std::string n) : name(std::move(n)) {}
    ~Berth() { goneLog.push_back(name + " berth gone"); }
    std::string name;
    std::shared_ptr<Mooring> mooring;
};
struct Mooring {
    explicit Mooring(std::string n) : name(std::move(n)) {}
    ~Mooring() { goneLog.push_back(name + " mooring gone"); }
    std::string name;
    std::shared_ptr<Berth> berth;
};

struct Crane;
struct Quay {
    explicit Quay(std::string n) : name(std::move(n)) {}
    ~Quay() { goneLog.push_back(name + " quay gone"); }
    std::string name;
    std::shared_ptr<Crane> crane;
};
struct Crane {
    explicit Crane(std::string n) : name(std::move(n)) {}
    ~Crane() { goneLog.push_back(name + " crane gone"); }
    std::string name;
    std::weak_ptr<Quay> quay;
};
${MAIN_DIVIDER}
// Lesson 14: weak_ptr and cycles.
{
    auto berth = std::make_shared<Berth>("North");
    auto mooring = std::make_shared<Mooring>("rope");
    berth->mooring = mooring;
    mooring->berth = berth;
    std::vector<long> cycleCounts = {berth.use_count(), mooring.use_count()};
    scene("cycleCounts", cycleCounts);
}  // the variables go, but each object still holds the other: nothing is destroyed
scene("goneAfterCycle", goneLog.size());

{
    auto quay = std::make_shared<Quay>("East");
    auto crane = std::make_shared<Crane>("C1");
    quay->crane = crane;
    crane->quay = quay;
    scene("fixedCounts", std::vector<long>{quay.use_count(), crane.use_count()});
    scene("lockWorks", crane->quay.lock() != nullptr);
}

std::weak_ptr<Quay> watcher;
bool watcherAliveInside = false;
{
    auto westQuay = std::make_shared<Quay>("West");
    watcher = westQuay;
    watcherAliveInside = !watcher.expired();
}
bool watcherAliveAfter = !watcher.expired();
scene("watcherAliveInside", watcherAliveInside);
scene("watcherAliveAfter", watcherAliveAfter);
scene("goneLog", goneLog);`,
      explanation:
        "In the cycle each object is owned by the other, so after the variables go out of scope both counts are stuck at 1 and neither destructor runs: goneLog is still empty (a leak with no new in sight). In the fixed pair the crane's pointer back to the quay is weak, so the quay's count is only 1 and the crane's is 2. When the block ends the quay is destroyed first, which releases the crane, so both log lines appear in that order. lock() gives a real shared_ptr while the quay lives. The standalone watcher sees the West quay alive inside its block and expired afterwards.",
      hints: [
        { id: "h1", title: "Which side is weak", content: "Berth and Mooring both use shared_ptr (that is the cycle). Quay owns the crane with shared_ptr<Crane>, but Crane watches back with std::weak_ptr<Quay>." },
        { id: "h2", title: "Counts", content: "In the cycle block both counts are 2. In the fixed block the quay is 1 and the crane is 2, because only the crane is shared (the weak_ptr adds nothing)." },
        { id: "h3", title: "The watcher", content: "std::weak_ptr<Quay> watcher; then inside the block watcher = westQuay; and !watcher.expired() is true; after the block it is false. Expected goneLog: East quay gone, C1 crane gone, West quay gone." },
      ],
      tests: [
        {
          id: "t1",
          description: "The cycle trapped both counts and nothing was destroyed",
          assertionCode: js`
assertEqual(scene.cycleCounts, [2, 2], "cycleCounts (each object is held by its variable and by the other one)");
assertEqual(scene.goneAfterCycle, 0, "goneAfterCycle (a cycle never lets go: no destructor should have run)");`,
        },
        {
          id: "t2",
          description: "With a weak back-link the pair cleans up, quay first",
          assertionCode: js`
assertEqual(scene.fixedCounts, [1, 2], "fixedCounts (quay, crane)");
assertEqual(scene.lockWorks, true, "lockWorks (crane->quay.lock() should return a real pointer while the quay lives)");
assertEqual(scene.goneLog, ["East quay gone", "C1 crane gone", "West quay gone"], "goneLog");`,
        },
        {
          id: "t3",
          description: "The watcher noticed when its quay disappeared",
          assertionCode: js`
assertEqual(scene.watcherAliveInside, true, "watcherAliveInside");
assertEqual(scene.watcherAliveAfter, false, "watcherAliveAfter (the only owner left, so the quay was destroyed)");`,
        },
      ],
      unlocks: ["en-cycles"],
      checks: [
        {
          prompt: "Why does a pair of objects holding `shared_ptr`s to each other never get destroyed?",
          question: { type: "choice", options: ["shared_ptr cannot be copied", "Each keeps the other's count above zero, and neither can go first", "The compiler removes the destructors", "The counts are negative"], answer: 1 },
          explanation: "The count of each stays at least 1 because of the other. That loop is a reference cycle. A `weak_ptr` on one side breaks it.",
        },
        {
          prompt: "What does `weak.lock()` return when the object has already been destroyed?",
          question: { type: "choice", options: ["It throws an exception", "An empty shared_ptr (it compares equal to nullptr)", "A dangling pointer", "The last known value"], answer: 1 },
          explanation: "`lock()` is the safe doorway: either you get a real `shared_ptr` that keeps the object alive while you use it, or an empty one to test.",
        },
      ],
    },

    // ───────────────────────── 15 ─────────────────────────
    {
      id: "cpp-engine-15-sumtypes",
      title: "optional and variant: maybe nothing, or one of several",
      minutes: 35,
      xp: 130,
      concepts: ["std::optional", "std::nullopt", "value_or", "std::variant", "std::holds_alternative", "std::get_if", "std::visit", "visitor"],
      learn: md`### "I couldn't find it" needs an honest answer

The harbour wants a function: *how many lumens does station X report?* What should it return for a station that does not exist? A common shortcut is a magic number:

~~~cpp
int lumensOf(name);       // returns -1 if the station is missing ... but what if -1 is real? or 0?
~~~

A reading of \`0\` (a lamp that is off) is a perfectly real answer, so you cannot use \`0\` to mean "missing", and any other magic number is a bug waiting for a caller who forgot to check. \`std::optional<T>\` puts the possibility into the **type**: it either holds a \`T\` or holds nothing.

~~~cpp
#include <optional>

std::optional<int> lumensOf(const std::map<std::string, int>& rack, const std::string& name) {
    auto found = rack.find(name);
    if (found == rack.end()) return std::nullopt;      // "nothing here"
    return found->second;                              // a real value (even 0)
}
~~~

Using it:

~~~cpp
auto reading = lumensOf(rack, "south");
if (reading.has_value()) { /* *reading is the number */ }
int safe = lumensOf(rack, "west").value_or(-1);        // the value, or -1 if empty
~~~

\`*reading\` reads the value (check first; reading an empty optional is undefined behaviour). \`has_value()\` asks. \`value_or(x)\` hands back a default in one step. The compiler now *reminds* callers: you cannot treat an \`optional<int>\` like an \`int\` without deciding what to do about "nothing".

### "It could be this or that or the other": variant

A weather report is one of several kinds, each with different facts: calm (no details), fog (a visibility in metres), storm (wind in knots). Cramming all fields into one struct leaves most of them meaningless on any one report. A \`std::variant\` holds **exactly one** of a fixed list of types at a time:

~~~cpp
struct Calm {};
struct Fog { int metres; };
struct Storm { int knots; };
using Report = std::variant<Calm, Fog, Storm>;

Report today = Fog{200};
~~~

To find out which one it holds:

~~~cpp
std::holds_alternative<Storm>(today);        // false: asks "is it a Storm?"
if (const Fog* fog = std::get_if<Fog>(&today)) {
    fog->metres;                              // 200: get_if gives a pointer, or nullptr if it is another kind
}
~~~

### std::visit: one answer per kind

The tidy way to handle every kind is **\`std::visit\`**, which calls the right function for whichever kind the variant holds right now. You give it a **visitor**: an object with one \`operator()\` overload per kind.

~~~cpp
struct Describe {
    std::string operator()(const Calm&) const { return "calm"; }
    std::string operator()(const Fog& f) const { return "fog, visibility " + std::to_string(f.metres) + " m"; }
    std::string operator()(const Storm& s) const { return "storm, " + std::to_string(s.knots) + " knots"; }
};

std::visit(Describe{}, today);     // "fog, visibility 200 m"
~~~

\`operator()\` is the function a call like \`obj(x)\` runs; here three overloads share one name and the compiler chooses by the argument's type. The big benefit: **if you forget a kind, it will not compile**. Delete the \`Storm\` overload and you get an error whose useful line mentions the missing type:

~~~text
main.cpp:5:50: error: no type named 'type' in 'struct std::invoke_result<V, B&>'
~~~

Read it as "the visitor cannot be called with a \`B&\`" (here \`B\` was the second kind). The long \`required from here\` chain above it just shows the library tracing the call. The \`if\`/\`else\` approach would have silently ignored the new kind.

### optional or variant?

- \`optional<T>\`: a \`T\` or nothing.
- \`variant<A, B, C>\`: exactly one of A, B or C.
- Both live inside the object, with no heap allocation.

### Common mistakes

- \`*opt\` or \`opt.value()\` on an empty optional: undefined behaviour / an exception.
- \`std::get<Fog>(today)\` when it holds a \`Storm\`: throws \`std::bad_variant_access\`. Use \`get_if\` or \`visit\`.
- Visitors that return different types for different kinds: every overload must return the same type.`,
      mission: md`Two small reliability fixes for the harbour office. First, a lookup of station brightness that can say "no such station" without a magic number. Second, the weather reports, which come in three different shapes and must each be described and counted properly.

The **Report desk** panel shows a card for each weather report (with the right fields for its kind) and the lookups beside it, with the missing ones left empty.`,
      tasks: [
        "Above main, write std::optional<int> lumensOf(const std::map<std::string, int>& rack, const std::string& name) returning std::nullopt when the name is missing",
        "Write struct Calm {}; struct Fog { int metres; }; struct Storm { int knots; }; using Report = std::variant<Calm, Fog, Storm>; and the Describe visitor from the lesson",
        "In main: std::map<std::string, int> stationLumens = {{\"north\", 480}, {\"south\", 0}, {\"east\", 515}}; then std::map<std::string, std::optional<int>> lookups; filled for \"north\", \"south\" and \"west\" using lumensOf. Send scene(\"lookups\", lookups); and scene(\"westOrDefault\", lumensOf(stationLumens, \"west\").value_or(-1));",
        "std::vector<Report> reports = {Calm{}, Fog{200}, Storm{45}, Calm{}}; Loop over it: push std::visit(Describe{}, r) onto reportLines, count Storms with std::holds_alternative<Storm>(r) into int stormCount, and keep the largest knots seen via std::get_if into int worstWind",
        "Send scene(\"reportLines\", reportLines); scene(\"stormCount\", stormCount); scene(\"worstWind\", worstWind);",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── lesson 15: lumensOf, Calm / Fog / Storm, Report and the Describe visitor go here, above main.
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 15: the lookups and the weather reports.
`,
      solutionAdd: cpp`#include <optional>
#include <variant>

std::optional<int> lumensOf(const std::map<std::string, int>& rack, const std::string& name) {
    auto found = rack.find(name);
    if (found == rack.end()) return std::nullopt;
    return found->second;
}

struct Calm {};
struct Fog {
    int metres;
};
struct Storm {
    int knots;
};
using Report = std::variant<Calm, Fog, Storm>;

struct Describe {
    std::string operator()(const Calm&) const { return "calm"; }
    std::string operator()(const Fog& f) const { return "fog, visibility " + std::to_string(f.metres) + " m"; }
    std::string operator()(const Storm& s) const { return "storm, " + std::to_string(s.knots) + " knots"; }
};
${MAIN_DIVIDER}
// Lesson 15: optional and variant.
std::map<std::string, int> stationLumens = {{"north", 480}, {"south", 0}, {"east", 515}};
std::map<std::string, std::optional<int>> lookups;
for (const std::string& stationName : std::vector<std::string>{"north", "south", "west"}) {
    lookups[stationName] = lumensOf(stationLumens, stationName);
}
scene("lookups", lookups);
scene("westOrDefault", lumensOf(stationLumens, "west").value_or(-1));

std::vector<Report> reports = {Calm{}, Fog{200}, Storm{45}, Calm{}};
std::vector<std::string> reportLines;
int stormCount = 0;
int worstWind = 0;
for (const Report& r : reports) {
    reportLines.push_back(std::visit(Describe{}, r));
    if (std::holds_alternative<Storm>(r)) ++stormCount;
    if (const Storm* storm = std::get_if<Storm>(&r)) worstWind = std::max(worstWind, storm->knots);
}
scene("reportLines", reportLines);
scene("stormCount", stormCount);
scene("worstWind", worstWind);`,
      explanation:
        "lumensOf returns std::nullopt for a missing station, so \"south\" with 0 lumens is a real answer and \"west\" is genuinely missing: the board gets 480, 0 and null. value_or(-1) turns the missing one into a default in one step. A Report is exactly one of Calm, Fog or Storm; std::visit with the Describe visitor picks the right operator() for each, and holds_alternative / get_if answer the narrower questions of how many storms there were and how hard the worst one blew.",
      hints: [
        { id: "h1", title: "optional", content: "return std::nullopt; when find() gives end(); otherwise return found->second; The return type std::optional<int> wraps both cases." },
        { id: "h2", title: "variant", content: "using Report = std::variant<Calm, Fog, Storm>; Describe has three operator() overloads, one per kind, all returning std::string. std::visit(Describe{}, r) calls the matching one." },
        { id: "h3", title: "Counting kinds", content: "std::holds_alternative<Storm>(r) is a bool. std::get_if<Storm>(&r) gives a pointer to the Storm or nullptr; use if (const Storm* storm = std::get_if<Storm>(&r)) { ... }" },
      ],
      tests: [
        {
          id: "t1",
          description: "A missing station is nothing, a zero reading is a real value",
          assertionCode: js`
assertEqual(scene.lookups, { north: 480, south: 0, west: null }, "lookups (an empty optional is sent as null)");
assertEqual(scene.westOrDefault, -1, "westOrDefault");`,
        },
        {
          id: "t2",
          description: "Each report kind was described by its own overload",
          assertionCode: js`
assertEqual(scene.reportLines, ["calm", "fog, visibility 200 m", "storm, 45 knots", "calm"], "reportLines");`,
        },
        {
          id: "t3",
          description: "The reports were counted by kind",
          assertionCode: js`
assertEqual(scene.stormCount, 1, "stormCount");
assertEqual(scene.worstWind, 45, "worstWind");`,
        },
      ],
      unlocks: ["en-variants"],
      checks: [
        {
          prompt: "Why is returning `0` a poor way to say \"station not found\" in `lumensOf`?",
          question: { type: "choice", options: ["0 is too large", "A lamp that is off really reads 0, so the caller cannot tell the two apart", "Integers cannot be zero", "It is slower"], answer: 1 },
          explanation: "A sentinel value steals one legitimate answer. `std::optional` says \"no answer\" separately from every possible number.",
        },
        {
          prompt: "A `std::variant<Calm, Fog, Storm>` holds…",
          question: { type: "choice", options: ["all three at once", "exactly one of the three at a time", "any number of them", "a pointer to one of them"], answer: 1 },
          explanation: "It is a type-safe \"one of\": at any moment it holds a single alternative, and `std::visit` handles each possibility.",
        },
      ],
    },

    // ───────────────────────── 16 ─────────────────────────
    {
      id: "cpp-engine-16-night-shift",
      title: "Night shift: wire the whole engine",
      minutes: 50,
      xp: 180,
      concepts: ["composition", "unique_ptr<Base> registry", "observer + strategy together", "variant events", "optional lookup", "borrowed pointers"],
      learn: md`### Putting the parts together

Every piece you have built answers one question:

| Piece | Question it answers |
| --- | --- |
| template / concept | write once for many types |
| container + algorithm | store and process many things |
| \`std::function\` strategy | how should this one behave right now? |
| observer bus | who needs to hear about this? |
| virtual function | let each kind of object answer for itself |
| \`unique_ptr\` / \`shared_ptr\` | who is responsible for destroying it? |
| \`optional\` / \`variant\` | maybe nothing, or one of several kinds |

A real engine uses them *together*, each where it fits. Here is the plan for the night shift. This lesson adds almost nothing new: it is the part where you design with the ideas you have.

### The design

- **\`LampStation\`** is a kind of \`Station\` (lesson 12). It holds a \`SignalLamp\` (lesson 9) plus two plans: one for calm weather, one for storms. When a storm event arrives, it swaps the lamp's plan (strategy).
- **\`HarbourEngine\`** owns everything. A \`StormBus\` (lesson 10), a \`std::vector<std::unique_ptr<Station>>\` that *owns* the stations, and a \`std::map<std::string, LampStation*>\` that lets you find a station by name. The map holds **borrowed** pointers: it never deletes anything, because the vector is the owner. Whoever owns decides when it dies; whoever only looks must not outlive it.
- Weather arrives as \`Report\` variants (lesson 15). A visitor turns a report into a storm *level*; the engine publishes it on the bus.
- Looking up a pattern by name returns \`std::optional<std::string>\`: a missing station is "nothing", not a crash.

### The skeleton

~~~cpp
class LampStation final : public Station {
public:
    LampStation(std::string name, FlashPlan calm, FlashPlan storm);
    std::string role() const override;          // "<name> lamp"
    void onStorm(const StormEvent& e);          // level >= 3: storm plan, else calm plan
    std::string flash(int ticks) const;         // what the lamp does for ticks ticks
private:
    std::string name_;
    FlashPlan calm_, storm_;
    SignalLamp lamp_;                           // declared AFTER calm_ so lamp_(calm_) works
};
~~~

Members are constructed in the order they are **declared in the class**, not the order in the constructor's initializer list. \`lamp_\` is declared last so \`calm_\` already exists when you write \`lamp_(calm_)\`.

~~~cpp
class HarbourEngine {
public:
    void addLamp(std::string name, FlashPlan calm, FlashPlan storm);
    void publish(const StormEvent& e) const;
    std::optional<std::string> pattern(const std::string& name, int ticks) const;
    std::vector<std::string> roles() const;
    std::size_t stationCount() const;
private:
    StormBus bus_;
    std::vector<std::unique_ptr<Station>> fleet_;           // the owners
    std::map<std::string, LampStation*> byName_;            // borrowed
};
~~~

\`addLamp\` creates the station with \`std::make_unique<LampStation>(...)\`, keeps a raw pointer from \`station.get()\`, files it in \`byName_\`, subscribes a lambda that forwards storms to \`raw->onStorm(e)\`, and finally moves the \`unique_ptr\` into \`fleet_\`.

Last, a visitor to turn a \`Report\` into a level: calm is 0, fog is 2, and a storm is its knots divided by 10 (45 knots is level 4).

### Check yourself as you go

Run it often. A mistake in one part shows up on the board in a few seconds, and the compiler's first useful \`error:\` line still points at it: use what you learned in lessons 1, 4 and 7.

### Common mistakes

- Subscribing a lambda that captures a raw pointer to a station that gets destroyed before the bus. Here both live in the engine and the bus never publishes while the engine is being destroyed.
- Giving \`byName_\` ownership (a second \`unique_ptr\`): then two owners try to delete.
- Forgetting \`override\` or the virtual destructor path (the base \`Station\` already has it).`,
      mission: md`Night falls over Lantern Bay. The engine runs a shift: two lamp stations, North and South, each with a calm plan and a storm plan, listen to the bus. Four weather reports come in: calm, fog (200 m), a 45-knot storm, and calm again. After each report, record what both lamps are doing for 8 ticks.

When it passes, the **Night report** panel shows the shift as a timeline: the weather above, each lamp's pattern beneath, and the owners at the bottom.`,
      tasks: [
        "Above main, write the LampStation class (final, derived from Station) exactly as in the skeleton, and the LevelOf visitor: Calm gives 0, Fog gives 2, Storm gives knots / 10",
        "Write the HarbourEngine class: addLamp (make_unique, borrowed pointer into byName_, subscribe a lambda that calls onStorm, then move into fleet_), publish, pattern (std::optional, nullopt when the name is unknown), roles and stationCount",
        "In main: HarbourEngine engine; engine.addLamp(\"North\", plans[\"steady\"], plans[\"triple\"]); engine.addLamp(\"South\", plans[\"pulse\"], plans[\"fade\"]);",
        "For each Report r in reports (made in lesson 15): int level = std::visit(LevelOf{}, r); publish StormEvent {std::visit(Describe{}, r), level}; count levels >= 3 in int nightAlerts; and push \"report <n>: <North pattern> | <South pattern>\" (8 ticks each, n starting at 1) onto nightLines",
        "Send scene(\"nightLines\", nightLines); scene(\"nightAlerts\", nightAlerts); scene(\"nightRoles\", engine.roles()); scene(\"stationCount\", engine.stationCount()); and scene(\"eastPattern\", engine.pattern(\"East\", 8)); (East does not exist)",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── lesson 16: LampStation, LevelOf and HarbourEngine go here, above main. Use the skeletons from the lesson.
// Station (lesson 12), SignalLamp and FlashPlan (lesson 9), StormBus and StormEvent (lesson 10), Report and Describe (lesson 15) are already above.
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 16: the night shift.
// plans (lesson 9) and reports (lesson 15) already exist in main. Expected report lines:
//   report 1: ######## | #.#.#.#.
//   report 2: ######## | #.#.#.#.
//   report 3: #.#.#... | ####....
//   report 4: ######## | #.#.#.#.
`,
      solutionAdd: cpp`class LampStation final : public Station {
public:
    LampStation(std::string name, FlashPlan calm, FlashPlan storm)
        : name_(std::move(name)), calm_(std::move(calm)), storm_(std::move(storm)), lamp_(calm_) {}
    std::string role() const override { return name_ + " lamp"; }
    void onStorm(const StormEvent& e) { lamp_.setPlan(e.level >= 3 ? storm_ : calm_); }
    std::string flash(int ticks) const { return lamp_.flash(ticks); }

private:
    std::string name_;
    FlashPlan calm_, storm_;
    SignalLamp lamp_;
};

struct LevelOf {
    int operator()(const Calm&) const { return 0; }
    int operator()(const Fog&) const { return 2; }
    int operator()(const Storm& s) const { return s.knots / 10; }
};

class HarbourEngine {
public:
    void addLamp(std::string name, FlashPlan calm, FlashPlan storm) {
        auto station = std::make_unique<LampStation>(name, std::move(calm), std::move(storm));
        LampStation* raw = station.get();
        byName_[name] = raw;
        bus_.subscribe([raw](const StormEvent& e) { raw->onStorm(e); });
        fleet_.push_back(std::move(station));
    }
    void publish(const StormEvent& e) const { bus_.publish(e); }
    std::optional<std::string> pattern(const std::string& name, int ticks) const {
        auto found = byName_.find(name);
        if (found == byName_.end()) return std::nullopt;
        return found->second->flash(ticks);
    }
    std::vector<std::string> roles() const {
        std::vector<std::string> out;
        for (const auto& station : fleet_) out.push_back(station->role());
        return out;
    }
    std::size_t stationCount() const { return fleet_.size(); }

private:
    StormBus bus_;
    std::vector<std::unique_ptr<Station>> fleet_;
    std::map<std::string, LampStation*> byName_;
};
${MAIN_DIVIDER}
// Lesson 16: the night shift.
HarbourEngine engine;
engine.addLamp("North", plans["steady"], plans["triple"]);
engine.addLamp("South", plans["pulse"], plans["fade"]);
std::vector<std::string> nightLines;
int nightAlerts = 0;
int reportNumber = 0;
for (const Report& r : reports) {
    int level = std::visit(LevelOf{}, r);
    engine.publish({std::visit(Describe{}, r), level});
    if (level >= 3) ++nightAlerts;
    ++reportNumber;
    nightLines.push_back("report " + std::to_string(reportNumber) + ": " + *engine.pattern("North", 8) + " | " + *engine.pattern("South", 8));
}
scene("nightLines", nightLines);
scene("nightAlerts", nightAlerts);
scene("nightRoles", engine.roles());
scene("stationCount", engine.stationCount());
scene("eastPattern", engine.pattern("East", 8));`,
      explanation:
        "Everything is wired through the types you built. The engine owns the stations in a vector of unique_ptr<Station> (virtual destructor from lesson 12), and byName_ holds only borrowed pointers for lookup. Each station subscribes to the bus (observer) and, on a storm of level 3 or more, swaps its lamp to the storm plan (strategy). The weather arrives as a variant and a visitor turns it into a level: the fog (2) is too mild to matter, the 45-knot storm (level 4) switches North to the triple plan and South to the fade, and the final calm report switches them back. pattern() returns an empty optional for East, which the board receives as null.",
      hints: [
        { id: "h1", title: "LampStation", content: "Members declared in the order name_, calm_, storm_, lamp_. Constructor: name_(std::move(name)), calm_(std::move(calm)), storm_(std::move(storm)), lamp_(calm_). onStorm: lamp_.setPlan(e.level >= 3 ? storm_ : calm_);" },
        { id: "h2", title: "addLamp", content: "auto station = std::make_unique<LampStation>(name, std::move(calm), std::move(storm)); LampStation* raw = station.get(); byName_[name] = raw; bus_.subscribe([raw](const StormEvent& e) { raw->onStorm(e); }); fleet_.push_back(std::move(station));" },
        { id: "h3", title: "The shift", content: "engine.publish({std::visit(Describe{}, r), level}); then build the line with *engine.pattern(\"North\", 8) (the star unwraps the optional, safe here because North exists)." },
      ],
      tests: [
        {
          id: "t1",
          description: "Both lamps switched plan when the storm hit and switched back after",
          assertionCode: js`
assertEqual(scene.nightLines, [
  "report 1: ######## | #.#.#.#.",
  "report 2: ######## | #.#.#.#.",
  "report 3: #.#.#... | ####....",
  "report 4: ######## | #.#.#.#."], "nightLines");
assertEqual(scene.nightAlerts, 1, "nightAlerts (reports with level 3 or more)");`,
        },
        {
          id: "t2",
          description: "The engine owns two stations and knows their roles",
          assertionCode: js`
assertEqual(scene.nightRoles, ["North lamp", "South lamp"], "nightRoles");
assertEqual(scene.stationCount, 2, "stationCount");`,
        },
        {
          id: "t3",
          description: "An unknown station is nothing, not a crash",
          assertionCode: js`
assert("eastPattern" in scene, 'Send scene("eastPattern", engine.pattern("East", 8)); an empty optional arrives as null.');
assertEqual(scene.eastPattern, null, "eastPattern (East does not exist)");`,
        },
      ],
      unlocks: ["en-report"],
      checks: [
        {
          prompt: "In `HarbourEngine`, which member OWNS the stations (decides when they are destroyed)?",
          question: { type: "choice", options: ["bus_", "fleet_ (the vector of unique_ptr)", "byName_ (the map of raw pointers)", "all three equally"], answer: 1 },
          explanation: "`fleet_` holds the `unique_ptr`s. `byName_` only borrows pointers for quick lookup and must never outlive the owners.",
        },
        {
          prompt: "Why is `lamp_` declared after `calm_` in the class?",
          question: { type: "choice", options: ["Alphabetical order", "Members are built in declaration order, so calm_ must exist before lamp_(calm_) copies it", "The compiler requires SignalLamp last", "It makes the object smaller"], answer: 1 },
          explanation: "C++ constructs members in the order they are declared, whatever order the initializer list is written in.",
        },
      ],
    },
  ],
};
