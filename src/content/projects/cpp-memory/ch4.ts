import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { cpp, lab, md } from "./util.ts";

/**
 * Chapter 4: A lab that runs. Parsing the intake manifest, custom exceptions and exception safety,
 * a registry that owns its pieces, and the full run with the final audit.
 */

export const chapter4: Chapter = {
  id: "a-lab-that-runs",
  title: "A lab that runs",
  blurb: "Read a real manifest from input, fail safely with your own exceptions, put one registry in charge of every piece, and finish with a full run that leaks nothing.",
  lessons: [
    // ───────────────────────── 13 ─────────────────────────
    {
      id: "cpp-memory-13-parsing",
      title: "Parsing a manifest with istringstream and getline",
      minutes: 30,
      xp: 120,
      concepts: ["std::getline", "std::istringstream", "splitting on a delimiter", "input validation", "stream failure state", "trimming"],
      learn: md`### Input arrives as lines of text

Real programs rarely get tidy numbers. They get **lines**: a manifest, a log, a config file. The job is to turn each line into structured data, and to say clearly what is wrong with the lines that do not fit. The lab's intake manifest looks like this:

~~~text
# Larkspur Lab intake manifest: id | name | year | condition (0-100)
AMP-01 | Red amphora | -450 | 72
MIR-03 | Bronze mirror | 120 | 55

this line has no separators
SCR-09 | Linen scroll | undated | 40
~~~

Comments start with \`#\`, blank lines are ignored, and each data line has four fields separated by \`|\`. The program receives these lines on its **standard input** (the same stream Reactor Core used for the operator's name).

### std::getline reads a whole line

~~~cpp
std::string manifestLine;
while (std::getline(std::cin, manifestLine)) {
    // one line at a time, without the newline
}
~~~

\`std::getline\` returns the stream; in a condition the stream is "true" while the last read succeeded, so the loop ends at the end of the input. Compare it with \`std::cin >> word\`, which stops at whitespace: it would split "Red amphora" into two pieces. Use \`>>\` for tokens and \`getline\` for lines.

### std::istringstream: a stream made from a string

To take a line apart you can wrap it in an \`std::istringstream\` (from \`<sstream>\`), a stream that reads from a string instead of the keyboard. Everything you know about \`cin\` works on it, and \`getline\` takes an optional third argument, the character to stop at:

~~~cpp
std::istringstream in(line);
std::vector<std::string> fields;
std::string piece;
while (std::getline(in, piece, '|')) {
    fields.push_back(trim(piece));
}
~~~

\`trim\` removes the spaces around a field (a small helper using \`find_first_not_of\` and \`find_last_not_of\` is provided).

### Validate at the boundary

Everything that comes from outside the program is untrustworthy until checked. A good parser:

1. checks the **shape** (here: exactly four fields, none of the first two empty),
2. checks that numbers **are numbers** and are fully consumed ("12abc" is not 12),
3. checks **ranges** (a condition of 140 is not a percentage),
4. **never crashes** on bad input, and says *why* it refused each line.

Converting a field to a number with a stream makes the failure visible. The provided helper does the standard dance:

~~~cpp
bool parseWholeNumber(const std::string& text, int& out) {
    std::istringstream in(text);
    in >> out;
    return !in.fail() && (in >> std::ws).eof();   // read a number, then nothing but spaces may remain
}
~~~

\`in >> out\` sets the stream's **fail state** if no number could be read; \`std::ws\` skips trailing whitespace; \`eof()\` then checks nothing else is left. (\`std::stoi\` also works but throws exceptions for bad input and happily accepts "12abc" as 12.)

### Returning the reason

A neat shape for a validating function is to return the reason for refusal, with the empty string meaning success, and to fill an output parameter:

~~~cpp
std::string parseIntakeLine(const std::string& line, IntakeRow& row);
~~~

The caller can then sort lines into "accepted rows" and "refused lines with reasons". Lesson 14 will introduce exceptions as the alternative. For input that is *expected* to be bad often, a return value is usually the more honest design.

### Common mistakes

- Mixing \`std::cin >> x\` and \`std::getline\` without discarding the newline left behind by \`>>\`.
- Forgetting that a line may end in \`\r\` on some systems (the provided trim removes it).
- Reading a number and not checking that the whole field was consumed.
- Using the data of a row that failed to parse. Only push rows that fully passed.`,
      mission: md`The lab receives pieces on delivery vans, and each van comes with a typed manifest. Some of them are clean, some have typos, and one clerk keeps writing "undated" where a year belongs. The new system must read the whole manifest from its input and sort it into pieces it can register and lines it must refuse, with a reason for each refusal.

Write the line parser and the reading loop. When the **Manifest desk** panel shows the accepted pieces in a table and each refused line with its reason, it powers on.`,
      tasks: [
        "Write parseIntakeLine(const std::string& line, IntakeRow& row): split on '|' with std::istringstream and std::getline(in, piece, '|'), trimming each field with trim()",
        "Return exactly these reasons: \"wrong field count\" (not 4 fields, or the id or name is empty), \"year is not a number\", \"condition is not a number\" and \"condition out of range 0-100\"; on success fill row (id, name, year, condition) and return \"\"",
        "In main read every line of standard input with std::getline(std::cin, manifestLine), trim it, skip blank lines and lines starting with '#', parse the rest into IntakeRow row",
        "Collect accepted rows in std::vector<IntakeRow> intake, and the refused lines with their reasons in rejectLines and rejectReasons",
        "Send intakeIds, intakeNames, intakeYears, intakeConditions, rejectLines and rejectReasons with scene(), print accepted N, refused M and take snap(\"manifest read\");",
      ],
      starterAdd: cpp`#include <sstream>

struct IntakeRow {
    std::string id;
    std::string name;
    int year;
    int condition;
};

std::string trim(const std::string& text) {  // provided: removes spaces, tabs and \r from both ends
    const auto first = text.find_first_not_of(" \t\r");
    if (first == std::string::npos) return "";
    const auto last = text.find_last_not_of(" \t\r");
    return text.substr(first, last - first + 1);
}

bool parseWholeNumber(const std::string& text, int& out) {  // provided: true only if the whole text is one whole number
    std::istringstream in(text);
    in >> out;
    return !in.fail() && (in >> std::ws).eof();
}

// ─── ✏️ YOUR TURN ─── lesson 13: write the parser. It returns "" for a good line, otherwise the reason.
std::string parseIntakeLine(const std::string& line, IntakeRow& row) {
    return "not parsed yet";
}
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 13: read the manifest from standard input
// std::vector<IntakeRow> intake;  std::vector<std::string> rejectLines, rejectReasons;
// while (std::getline(std::cin, manifestLine)) { trim, skip blank and '#', parse, sort into accepted / refused }
// then scene() the six lists, print "accepted N, refused M" and snap("manifest read");`,
      solutionAdd: cpp`#include <sstream>

struct IntakeRow {
    std::string id;
    std::string name;
    int year;
    int condition;
};

std::string trim(const std::string& text) {  // provided: removes spaces, tabs and \r from both ends
    const auto first = text.find_first_not_of(" \t\r");
    if (first == std::string::npos) return "";
    const auto last = text.find_last_not_of(" \t\r");
    return text.substr(first, last - first + 1);
}

bool parseWholeNumber(const std::string& text, int& out) {  // provided: true only if the whole text is one whole number
    std::istringstream in(text);
    in >> out;
    return !in.fail() && (in >> std::ws).eof();
}

// Returns "" for a good line, otherwise the reason it was refused.
std::string parseIntakeLine(const std::string& line, IntakeRow& row) {
    std::istringstream in(line);
    std::vector<std::string> fields;
    std::string piece;
    while (std::getline(in, piece, '|')) {
        fields.push_back(trim(piece));
    }
    if (fields.size() != 4 || fields[0].empty() || fields[1].empty()) return "wrong field count";
    int year = 0;
    int condition = 0;
    if (!parseWholeNumber(fields[2], year)) return "year is not a number";
    if (!parseWholeNumber(fields[3], condition)) return "condition is not a number";
    if (condition < 0 || condition > 100) return "condition out of range 0-100";
    row = IntakeRow{fields[0], fields[1], year, condition};
    return "";
}
${MAIN_DIVIDER}
// Lesson 13: read the manifest from standard input.
std::vector<IntakeRow> intake;
std::vector<std::string> rejectLines;
std::vector<std::string> rejectReasons;
std::string manifestLine;
while (std::getline(std::cin, manifestLine)) {
    std::string trimmed = trim(manifestLine);
    if (trimmed.empty() || trimmed[0] == '#') continue;  // blank lines and comments
    IntakeRow row;
    std::string why = parseIntakeLine(trimmed, row);
    if (why.empty()) {
        intake.push_back(row);
    } else {
        rejectLines.push_back(trimmed);
        rejectReasons.push_back(why);
    }
}
std::vector<std::string> intakeIds, intakeNames;
std::vector<int> intakeYears, intakeConditions;
for (const IntakeRow& r : intake) {
    intakeIds.push_back(r.id);
    intakeNames.push_back(r.name);
    intakeYears.push_back(r.year);
    intakeConditions.push_back(r.condition);
}
scene("intakeIds", intakeIds);
scene("intakeNames", intakeNames);
scene("intakeYears", intakeYears);
scene("intakeConditions", intakeConditions);
scene("rejectLines", rejectLines);
scene("rejectReasons", rejectReasons);
std::cout << "accepted " << intake.size() << ", refused " << rejectLines.size() << "\n";
snap("manifest read");`,
      explanation:
        "std::getline(std::cin, line) reads one line at a time until the input ends. Each data line goes into an istringstream and is split at '|' with the three-argument getline, trimming every field. The parser checks the shape first (four fields, id and name not empty), then each number with parseWholeNumber, which fails on 'undated' and on trailing junk, then the range of the condition. Returning the reason (empty for success) lets the loop sort lines into accepted rows and refused lines with a clear explanation, and a bad line can never crash the program or sneak a half-filled row into the list.",
      hints: [
        { id: "h1", title: "Splitting", content: "std::istringstream in(line); std::vector<std::string> fields; std::string piece; while (std::getline(in, piece, '|')) { fields.push_back(trim(piece)); }  Then fields[0] is the id, fields[1] the name, fields[2] the year text and fields[3] the condition text." },
        { id: "h2", title: "Checks in order", content: "First the shape: if (fields.size() != 4 || fields[0].empty() || fields[1].empty()) return \"wrong field count\"; then parseWholeNumber(fields[2], year) and parseWholeNumber(fields[3], condition) with their own messages, then the 0 to 100 range. Finish with row = IntakeRow{fields[0], fields[1], year, condition}; return \"\";" },
        { id: "h3", title: "The reading loop", content: "while (std::getline(std::cin, manifestLine)) { std::string trimmed = trim(manifestLine); if (trimmed.empty() || trimmed[0] == '#') continue; IntakeRow row; std::string why = parseIntakeLine(trimmed, row); ... } — push_back(row) into intake when why is empty, otherwise record the line and the reason." },
      ],
      tests: [
        {
          id: "t1",
          description: "The six good pieces were accepted, in order",
          assertionCode: lab`
assertEqual(scene.intakeIds, ["AMP-01", "MIR-03", "LMP-07", "CMB-12", "BDS-14", "TIN-15"], "accepted ids");
assertEqual(scene.intakeNames, ["Red amphora", "Bronze mirror", "Clay lamp", "Ivory comb", "Glass beads", "Tin lantern"], "accepted names (trimmed)");`,
        },
        {
          id: "t2",
          description: "Years and conditions were converted to numbers",
          assertionCode: lab`
assertEqual(scene.intakeYears, [-450, 120, 1, 1640, 300, 1790], "accepted years");
assertEqual(scene.intakeConditions, [72, 55, 90, 66, 48, 81], "accepted conditions");`,
        },
        {
          id: "t3",
          description: "Three lines were refused, each with its reason",
          assertionCode: lab`
assertEqual(scene.rejectReasons, ["wrong field count", "year is not a number", "condition out of range 0-100"], "refusal reasons, in input order");
assertEqual(scene.rejectLines, ["this line has no separators", "SCR-09 | Linen scroll | undated | 40", "RNG-11 | Silver ring | 1210 | 140"], "refused lines");
assert(lines.includes("accepted 6, refused 3"), "Print the line: accepted 6, refused 3");`,
        },
      ],
      unlocks: ["pv-manifest"],
      checks: [
        {
          prompt: "Why use `std::getline(std::cin, line)` instead of `std::cin >> line` to read \"Red amphora\"?",
          question: { type: "choice", options: ["getline is faster", ">> stops at whitespace so it would only read \"Red\"", ">> only reads numbers", "getline never fails"], answer: 1 },
          explanation: "`>>` reads one whitespace-separated token. `getline` reads everything up to the end of the line (or up to a delimiter you give it), spaces included.",
        },
        {
          prompt: "The field text is \"12abc\". After `in >> number;` on an istringstream of that text, what makes `parseWholeNumber` reject it?",
          question: { type: "choice", options: ["The fail bit is set", "Characters remain after the number, so the stream is not at its end", "`std::ws` throws", "number becomes -1"], answer: 1 },
          explanation: "The read of 12 succeeds, so the stream is not in a fail state; but \"abc\" is still unread, so `(in >> std::ws).eof()` is false. That second test is what stops half-numbers from slipping through.",
        },
      ],
    },

    // ───────────────────────── 14 ─────────────────────────
    {
      id: "cpp-memory-14-exceptions",
      title: "Custom exceptions and exception safety",
      minutes: 35,
      xp: 130,
      concepts: ["std::runtime_error", "custom exception types", "catch by const reference", "stack unwinding", "basic guarantee", "strong guarantee", "RAII and exceptions"],
      learn: md`### Your own exception types

Reactor Core threw exceptions of the standard types. Real programs define **their own**, so a handler can tell "the manifest was bad" apart from "out of memory". The convention: derive from \`std::runtime_error\` (or \`std::exception\`), pass a message up to the base, and add any extra data you need.

~~~cpp
#include <stdexcept>

class IntakeError : public std::runtime_error {
public:
    IntakeError(const std::string& id, const std::string& why)
        : std::runtime_error(id + ": " + why), id_(id) {}
    const std::string& id() const { return id_; }
private:
    std::string id_;
};

class DuplicateIdError : public IntakeError {
public:
    explicit DuplicateIdError(const std::string& id) : IntakeError(id, "already on the shelf") {}
};
~~~

\`what()\` (inherited) returns the message. **Throw by value, catch by const reference**:

~~~cpp
try {
    loadBasic(shelf, batch);
} catch (const IntakeError& e) {      // also catches DuplicateIdError: it IS an IntakeError
    std::cout << e.what() << "\n";
}
~~~

Catching by reference avoids copying and, more importantly, avoids *slicing*: catching a base class **by value** would chop a DuplicateIdError down to a plain IntakeError. Handlers are tried in order, so put the more specific type first.

### What happens during a throw: stack unwinding

When \`throw\` runs, C++ leaves the current function immediately, then its caller, and so on up the call stack until a matching \`catch\` is found. On the way out, the **destructor of every local object runs**. That is RAII earning its keep: a unique_ptr or vector in a function that is abandoned halfway still releases its memory. The logbook shows the dtor lines appear *during* the throw. If you had used a raw \`new\` and a \`delete\` at the bottom of the function, that delete would simply never run.

### Exception safety guarantees

A function that can throw should say what state it leaves things in. The standard levels:

- **No-throw (noexcept):** it never fails. Destructors, swap and moves should be here.
- **Strong guarantee:** if it throws, *nothing changed*, as if you had never called it ("commit or rollback").
- **Basic guarantee:** if it throws, nothing leaked and everything is still valid, but some changes may already have happened.
- **No guarantee:** anything may be broken. Avoid.

Both functions in this lesson add a batch of pieces to a shelf, and one piece in the batch is a duplicate:

~~~cpp
// basic: pieces before the bad one stay on the shelf
void loadBasic(Shelf& shelf, const std::vector<IntakeRow>& rows) {
    for (const IntakeRow& row : rows) addChecked(shelf, row);
}
~~~

~~~cpp
// strong: build everything off to the side, then commit with steps that cannot throw
void loadStrong(Shelf& shelf, const std::vector<IntakeRow>& rows) {
    Shelf staged;
    for (const IntakeRow& row : rows) { /* check against shelf and staged, add to staged */ }
    shelf.reserve(shelf.size() + staged.size());     // may throw, but nothing has changed yet
    for (auto& piece : staged) shelf.push_back(std::move(piece));   // capacity is reserved: cannot throw
}
~~~

The strong version follows the same shape as copy-and-swap in lesson 7: **do all the risky work first on a scratch copy, then commit with operations that cannot fail.** If anything throws while building, \`staged\` is destroyed by unwinding and takes its half-built pieces with it. The real shelf was never touched.

### Where not to throw

- **Never let an exception escape a destructor.** During unwinding it would mean two exceptions at once and the program terminates.
- Mark functions that cannot throw \`noexcept\`; it allows optimisations and lets containers choose moves.
- Do not use exceptions for ordinary expected outcomes (like "this line was refused"); lesson 13 used return values for that.

### Common mistakes

- \`catch (IntakeError e)\` by value (slicing) or \`catch (...)\` that swallows everything silently.
- Throwing a pointer (\`throw new IntakeError(...)\`) instead of an object, then leaking it.
- A function that modifies half of the state before the risky step, offering no guarantee at all.
- Catching an exception only to print it and then continue as if nothing happened.`,
      mission: md`The lab's loading dock sometimes receives a batch containing the same piece twice, once from each of two vans. Adding the batch must refuse the duplicate with a clear error, *and* never leave the shelf half-loaded when the lab cannot afford that.

Write the lab's own exception types and two loaders, one with the basic guarantee and one with the strong guarantee, and run the same bad batch through both. When the **Fault drill** panel shows the basic shelf holding two pieces while the strong shelf holds none, with every destructor logged during unwinding, it powers on.`,
      tasks: [
        "Add #include <stdexcept> and write class IntakeError : public std::runtime_error taking (id, why), with the message id + \": \" + why and an id() getter",
        "Write class DuplicateIdError : public IntakeError taking just the id, with the reason \"already on the shelf\"",
        "Write addChecked(Shelf& shelf, const IntakeRow& row): throw DuplicateIdError if a piece with that id is already on the shelf, otherwise push_back a new make_unique<Artifact>",
        "Write loadStrong(Shelf& shelf, const std::vector<IntakeRow>& rows): stage the new pieces in a local Shelf (checking the duplicates against shelf and staged), then reserve and move the staged pieces onto the shelf",
        "Run the bad batch through both and send basicHeld, strongHeld, basicError and strongError with scene(); peek the shelves and take snap(\"two guarantees\");",
      ],
      starterAdd: cpp`#include <stdexcept>

using Shelf = std::vector<std::unique_ptr<Artifact>>;

// ─── ✏️ YOUR TURN ─── lesson 14: write IntakeError and DuplicateIdError here.

// ─── ✏️ YOUR TURN ─── lesson 14: write addChecked. It throws DuplicateIdError for an id already on the shelf.
void addChecked(Shelf& shelf, const IntakeRow& row) {
}

// provided: the BASIC guarantee. Pieces added before a failure stay on the shelf.
void loadBasic(Shelf& shelf, const std::vector<IntakeRow>& rows) {
    for (const IntakeRow& row : rows) addChecked(shelf, row);
}

// ─── ✏️ YOUR TURN ─── lesson 14: write loadStrong (all or nothing).
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 14: run the same bad batch through both loaders
// batch: AMP-01, MIR-03, then AMP-01 again (a duplicate, named "Amphora copy")
// try { loadBasic(...) } catch (const IntakeError& e) { ... }   and the same for loadStrong
// scene basicHeld, strongHeld, basicError, strongError; peek basicShelf, strongShelf; snap("two guarantees");`,
      solutionAdd: cpp`#include <stdexcept>

using Shelf = std::vector<std::unique_ptr<Artifact>>;

class IntakeError : public std::runtime_error {
public:
    IntakeError(const std::string& id, const std::string& why) : std::runtime_error(id + ": " + why), id_(id) {}
    const std::string& id() const { return id_; }

private:
    std::string id_;
};

class DuplicateIdError : public IntakeError {
public:
    explicit DuplicateIdError(const std::string& id) : IntakeError(id, "already on the shelf") {}
};

void addChecked(Shelf& shelf, const IntakeRow& row) {
    for (const auto& held : shelf) {
        if (held->id == row.id) throw DuplicateIdError(row.id);
    }
    shelf.push_back(std::make_unique<Artifact>(row.id, row.name, row.year, row.condition));
}

// provided: the BASIC guarantee. Pieces added before a failure stay on the shelf.
void loadBasic(Shelf& shelf, const std::vector<IntakeRow>& rows) {
    for (const IntakeRow& row : rows) addChecked(shelf, row);
}

// The STRONG guarantee: all or nothing.
void loadStrong(Shelf& shelf, const std::vector<IntakeRow>& rows) {
    Shelf staged;  // scratch space: unwinding destroys it if anything throws
    for (const IntakeRow& row : rows) {
        for (const auto& held : shelf) {
            if (held->id == row.id) throw DuplicateIdError(row.id);
        }
        addChecked(staged, row);
    }
    shelf.reserve(shelf.size() + staged.size());  // may throw, but nothing has changed yet
    for (auto& piece : staged) {
        shelf.push_back(std::move(piece));  // capacity is reserved, so this cannot throw
    }
}
${MAIN_DIVIDER}
// Lesson 14: one bad batch, two guarantees.
Shelf basicShelf;
Shelf strongShelf;
std::vector<IntakeRow> batch = {{"AMP-01", "Red amphora", -450, 72}, {"MIR-03", "Bronze mirror", 120, 55}, {"AMP-01", "Amphora copy", -450, 72}};
std::string basicError, strongError;
try {
    loadBasic(basicShelf, batch);
} catch (const IntakeError& e) {
    basicError = e.what();
}
try {
    loadStrong(strongShelf, batch);
} catch (const IntakeError& e) {
    strongError = e.what();
}
scene("basicHeld", basicShelf.size());
scene("strongHeld", strongShelf.size());
scene("basicError", basicError);
scene("strongError", strongError);
peek("basicShelf", basicShelf);
peek("strongShelf", strongShelf);
snap("two guarantees");`,
      explanation:
        "IntakeError carries the piece's id and a message built from it; DuplicateIdError specialises it, and catching by const IntakeError& handles both without slicing. loadBasic simply adds pieces one by one, so when the duplicate throws, the first two are already on the shelf: valid, nothing leaked, but changed (basic guarantee). loadStrong builds into a local staging shelf; when the duplicate throws, stack unwinding destroys the staging shelf and its half-built pieces, and the real shelf was never touched (strong guarantee). On success, the commit reserves capacity first, then moves the pieces with calls that cannot throw. Both paths clean up through destructors, so nothing leaks.",
      hints: [
        { id: "h1", title: "The exceptions", content: "class IntakeError : public std::runtime_error { public: IntakeError(const std::string& id, const std::string& why) : std::runtime_error(id + \": \" + why), id_(id) {} const std::string& id() const { return id_; } private: std::string id_; }; and DuplicateIdError derives from it, passing \"already on the shelf\" as the reason." },
        { id: "h2", title: "addChecked", content: "Loop over the shelf with for (const auto& held : shelf) and compare held->id with row.id; throw DuplicateIdError(row.id) on a match. If the loop finishes, shelf.push_back(std::make_unique<Artifact>(row.id, row.name, row.year, row.condition));" },
        { id: "h3", title: "loadStrong", content: "Make a local Shelf staged; for each row first look for the id in shelf (throw if found), then addChecked(staged, row). Only after the loop: shelf.reserve(shelf.size() + staged.size()); for (auto& piece : staged) shelf.push_back(std::move(piece));" },
      ],
      tests: [
        {
          id: "t1",
          description: "The basic loader keeps the pieces added before the failure; the strong one keeps none",
          assertionCode: lab`
assertEqual(scene.basicHeld, 2, "basicHeld (the two pieces before the duplicate stay)");
assertEqual(scene.strongHeld, 0, "strongHeld (all or nothing: the whole batch is undone)");`,
        },
        {
          id: "t2",
          description: "Both failures report the duplicate id with the same message",
          assertionCode: lab`
assertEqual(scene.basicError, "AMP-01: already on the shelf", "basicError (what() of the exception)");
assertEqual(scene.strongError, "AMP-01: already on the shelf", "strongError");`,
        },
        {
          id: "t3",
          description: "Unwinding destroyed the staged pieces, and nothing leaked",
          assertionCode: lab`
const s = needShot("two guarantees");
const names = (s.ev || []).filter((e) => e[0] === "ctor" || e[0] === "dtor").map((e) => e[0] + " " + e[1]);
assertEqual(names.filter((n) => n.startsWith("dtor")).length, 2, "destructors that ran during the throw (the two staged pieces)");
const b = ent(s, "basicShelf"), t = ent(s, "strongShelf");
assert(b && t && b.len === 2 && t.len === 0, "Peek both shelves: the basic one holds 2 pieces, the strong one 0.");
assert(audit && audit.leaks.length === 0 && audit.bf === 0, "Nothing may leak or be freed twice, even though a loader threw.");`,
        },
      ],
      unlocks: ["pv-faults"],
      checks: [
        {
          prompt: "A function builds a vector of unique_ptrs, then throws halfway. What happens to the objects already created?",
          question: { type: "choice", options: ["They leak", "They are destroyed during stack unwinding by the vector's destructor", "They are destroyed only if you catch the exception in the same function", "The program terminates"], answer: 1 },
          explanation: "Unwinding runs the destructor of every local, including the vector, which destroys each unique_ptr, which deletes each object. This is why RAII makes exception-safe code natural.",
        },
        {
          prompt: "Which guarantee means \"if it throws, nothing changed\"?",
          question: { type: "choice", options: ["No-throw", "Strong", "Basic", "None"], answer: 1 },
          explanation: "Strong = commit or rollback. Basic only promises no leaks and a valid (but possibly changed) state.",
        },
      ],
    },

    // ───────────────────────── 15 ─────────────────────────
    {
      id: "cpp-memory-15-registry",
      title: "A registry that owns, and handles that borrow",
      minutes: 35,
      xp: 140,
      concepts: ["ownership design", "unique_ptr member", "non-owning pointers", "returning pointer vs reference", "transferring ownership out", "stale handles"],
      learn: md`### One owner, many borrowers

You now have all the pieces for the design that most C++ programs should have: **a single object owns each resource through a unique_ptr, and everyone else borrows it**. For the lab that owner is the **Registry**, a class that holds every Artifact and decides when it dies.

~~~cpp
class Registry {
public:
    void add(std::unique_ptr<Artifact> piece);              // takes ownership
    Artifact* find(const std::string& id);                  // borrows: may be nullptr
    Artifact& get(const std::string& id);                   // borrows: throws if missing
    std::unique_ptr<Artifact> take(const std::string& id);  // gives ownership back out
    // ...
private:
    std::vector<std::unique_ptr<Artifact>> pieces_;
};
~~~

Read the signatures as a contract:

- A parameter of type \`std::unique_ptr<T>\` **by value** means "I take ownership of this" (a *sink*). The caller must \`std::move\` into it or pass a freshly made one.
- A return of \`std::unique_ptr<T>\` means "I hand you ownership".
- A return of \`T*\` means "here is a **view**; it may be \`nullptr\`; you do not own it".
- A return of \`T&\` means "here is a view; it definitely exists, or I would have thrown".

### Why vector<unique_ptr> and not vector<Artifact>

If the registry stored Artifacts directly, growing the vector would move every piece to a new address and invalidate every pointer anyone borrowed. With \`vector<unique_ptr<Artifact>>\` the vector's *array of pointers* may be reallocated, but each Artifact stays exactly where it is on the heap. Borrowed pointers to the Artifacts survive growth. (They still die when that particular piece is removed.)

### The lifetime rule for borrowed pointers

> A borrowed pointer or reference must never outlive the owner of the object, and must not be used after the object is removed.

The compiler cannot check this. The board can show it: in the registry photo, each borrowed view is drawn as an arrow into the owner's bay. After \`take("LMP-07")\` and a reset of the returned pointer, any view that was aimed at the lamp now points at a **freed** bay and turns red: a stale handle. Using it would be undefined behaviour.

Practical ways to stay safe:

1. Use a borrowed pointer only **briefly**, in the same function that asked for it. Look up again next time.
2. If something must remember a piece for a long time, store its **id** (a plain string), not a pointer, and look it up when needed. A failed lookup is a clean \`nullptr\`; a stale pointer is a crash.
3. Never store a raw pointer you obtained from \`.get()\` in a longer-lived structure than its owner.

### Implementing the pieces

\`find\` walks the vector and returns \`held.get()\` for the matching element, or \`nullptr\`. \`get\` calls \`find\` and throws if it comes back empty. \`take\` must move the unique_ptr **out** of the vector before erasing the empty slot:

~~~cpp
std::unique_ptr<Artifact> take(const std::string& id) {
    for (auto it = pieces_.begin(); it != pieces_.end(); ++it) {
        if ((*it)->id == id) {
            std::unique_ptr<Artifact> out = std::move(*it);   // ownership leaves the vector
            pieces_.erase(it);                                // remove the now-empty slot
            return out;
        }
    }
    return nullptr;
}
~~~

(If you erased without moving first, the unique_ptr in the slot would destroy the object.)

### Common mistakes

- Returning \`std::unique_ptr<T>&\` or a raw \`T*\` from \`take\` when the intention is to give ownership away.
- Keeping a \`find\` result across a call that removes pieces.
- Dereferencing the result of \`find\` without checking for \`nullptr\`.
- Giving a class both a raw owning pointer and a unique_ptr to the same object.`,
      mission: md`Until now every piece has lived wherever it was created. The lab needs one place that knows every piece, that is the only thing allowed to destroy one, and that lets the restorers look at a piece *without* taking it away.

Finish the Registry. Register the six accepted pieces, borrow one by id to restore it, ask for a piece that is not there, and retire one by taking it out. When the **Registry** panel shows the owner, the borrowed handles, and the stale one in red, it powers on.`,
      tasks: [
        "In class Registry write Artifact* find(const std::string& id): return the pointer of the matching element (held.get()), or nullptr",
        "Write Artifact& get(const std::string& id): use find, and throw NotFoundError(id) if the result is nullptr",
        "Write std::unique_ptr<Artifact> take(const std::string& id): move the unique_ptr out of the vector, erase the empty slot and return it (nullptr if the id is unknown)",
        "In main fill Registry registry with one make_unique<Artifact> per row of intake. Borrow MIR-03 with find (guard against nullptr), add 20 to its condition, and look up \"XXX-00\" too",
        "Take LMP-07 out, remember a raw staleView = retired.get(), then retired.reset(); and send registrySize, mirrorCondition and lampGone",
        "Peek registry.pieces(), mirrorView, missingView, staleView (all BORROWED) and retired, then snap(\"registry\");",
      ],
      starterAdd: cpp`class NotFoundError : public IntakeError {
public:
    explicit NotFoundError(const std::string& id) : IntakeError(id, "not in the registry") {}
};

class Registry {
public:
    void add(std::unique_ptr<Artifact> piece) {  // a sink: the registry takes ownership
        if (find(piece->id) != nullptr) throw DuplicateIdError(piece->id);
        pieces_.push_back(std::move(piece));
    }
    // ─── ✏️ YOUR TURN ─── lesson 15: replace the three stubs with real find, get and take.
    Artifact* find(const std::string& id) { return nullptr; }
    Artifact& get(const std::string& id) { throw NotFoundError(id); }
    std::unique_ptr<Artifact> take(const std::string& id) { return nullptr; }
    std::size_t size() const { return pieces_.size(); }
    const Shelf& pieces() const { return pieces_; }

private:
    Shelf pieces_;
};
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 15: use the registry
// Registry registry; add one make_unique<Artifact> per row of intake
// Artifact* mirrorView = registry.find("MIR-03");  if it is not null, condition += 20
// Artifact* missingView = registry.find("XXX-00");
// std::unique_ptr<Artifact> retired = registry.take("LMP-07");  Artifact* staleView = retired.get();  retired.reset();
// scene registrySize, mirrorCondition, lampGone; peek ...; snap("registry");`,
      solutionAdd: cpp`class NotFoundError : public IntakeError {
public:
    explicit NotFoundError(const std::string& id) : IntakeError(id, "not in the registry") {}
};

class Registry {
public:
    void add(std::unique_ptr<Artifact> piece) {  // a sink: the registry takes ownership
        if (find(piece->id) != nullptr) throw DuplicateIdError(piece->id);
        pieces_.push_back(std::move(piece));
    }
    Artifact* find(const std::string& id) {  // a view: may be nullptr, never owned by the caller
        for (const auto& held : pieces_) {
            if (held->id == id) return held.get();
        }
        return nullptr;
    }
    Artifact& get(const std::string& id) {  // a view that must exist
        Artifact* found = find(id);
        if (found == nullptr) throw NotFoundError(id);
        return *found;
    }
    std::unique_ptr<Artifact> take(const std::string& id) {  // ownership leaves the registry
        for (auto it = pieces_.begin(); it != pieces_.end(); ++it) {
            if ((*it)->id == id) {
                std::unique_ptr<Artifact> out = std::move(*it);
                pieces_.erase(it);
                return out;
            }
        }
        return nullptr;
    }
    std::size_t size() const { return pieces_.size(); }
    const Shelf& pieces() const { return pieces_; }

private:
    Shelf pieces_;
};
${MAIN_DIVIDER}
// Lesson 15: one owner, many borrowers.
Registry registry;
for (const IntakeRow& r : intake) {
    registry.add(std::make_unique<Artifact>(r.id, r.name, r.year, r.condition));
}
Artifact* mirrorView = registry.find("MIR-03");
if (mirrorView != nullptr) mirrorView->condition += 20;
Artifact* missingView = registry.find("XXX-00");
std::unique_ptr<Artifact> retired = registry.take("LMP-07");
Artifact* staleView = retired.get();
retired.reset();  // the lamp is destroyed; staleView is now dangling: look, never use
scene("registrySize", registry.size());
scene("mirrorCondition", mirrorView != nullptr ? mirrorView->condition : -1);
scene("lampGone", registry.find("LMP-07") == nullptr);
peek("registry.pieces", registry.pieces());
peek("mirrorView", mirrorView, BORROWED);
peek("missingView", missingView, BORROWED);
peek("staleView", staleView, BORROWED);
peek("retired", retired);
snap("registry");`,
      explanation:
        "The registry's vector of unique_ptrs is the single owner of every Artifact. find returns the raw pointer inside a matching element (or nullptr): a borrowed view, not ownership. get turns a missing piece into a NotFoundError instead of a null dereference. take moves the unique_ptr out of the vector first, so the object survives the erase, then returns it: ownership leaves by value. After retired.reset() the lamp is destroyed, so staleView still holds the old address but the bay is freed: the board shows it as a stale handle, which you may look at but never use. The registry now holds five pieces, the mirror's condition went from 55 to 75 through a borrowed pointer, and the audit stays clean.",
      hints: [
        { id: "h1", title: "find and get", content: "find: for (const auto& held : pieces_) { if (held->id == id) return held.get(); } return nullptr;  get: Artifact* found = find(id); if (found == nullptr) throw NotFoundError(id); return *found;" },
        { id: "h2", title: "take", content: "Loop with an iterator: for (auto it = pieces_.begin(); it != pieces_.end(); ++it) { if ((*it)->id == id) { std::unique_ptr<Artifact> out = std::move(*it); pieces_.erase(it); return out; } } return nullptr;" },
        { id: "h3", title: "Stale handle", content: "Peek staleView after retired.reset(): it still holds the old address but the board marks the bay as freed. Do not dereference it. To check the lamp is gone, look it up again: registry.find(\"LMP-07\") == nullptr." },
      ],
      tests: [
        {
          id: "t1",
          description: "The registry owns five pieces and the mirror was restored through a borrowed pointer",
          assertionCode: lab`
assertEqual(scene.registrySize, 5, "registrySize (six accepted, the lamp taken out)");
assertEqual(scene.mirrorCondition, 75, "mirrorCondition (55 + 20 through the pointer from find)");
assertEqual(scene.lampGone, true, "lampGone (find of a taken piece should give nullptr)");`,
        },
        {
          id: "t2",
          description: "The registry is the owner: its pieces are heap bays, and a borrowed view points into one",
          assertionCode: lab`
const s = needShot("registry");
const reg = ent(s, "registry.pieces"), view = ent(s, "mirrorView");
assert(reg && view, "Peek registry.pieces() and mirrorView.");
assertEqual(reg.len, 5, "pieces in the registry vector");
assert(view.r === "borrowed" && view.tb > 0 && reg.vs.includes("-> #" + view.tb), "mirrorView should be a BORROWED pointer to one of the pieces the registry owns.");
const miss = ent(s, "missingView");
assert(miss && miss.tg === 3, "missingView should be nullptr (no piece called XXX-00).");`,
        },
        {
          id: "t3",
          description: "The piece taken out is destroyed, and the leftover handle is stale",
          assertionCode: lab`
const s = needShot("registry");
const stale = ent(s, "staleView"), kept = ent(s, "retired");
assert(stale && kept, "Peek staleView and retired.");
assert(kept.tg === 3, "retired should be empty after reset().");
assert(stale.tf === 1, "staleView should point at a freed bay: the lamp was destroyed by retired.reset().");
assert((s.ev || []).some((e) => e[0] === "dtor" && e[1] === "LMP-07"), "The lamp should be destroyed before the photo.");
assert(audit && audit.leaks.length === 0 && audit.bf === 0, "Nothing may leak or be freed twice.");`,
        },
      ],
      unlocks: ["pv-registry"],
      checks: [
        {
          prompt: "A function signature `void keep(std::unique_ptr<Artifact> piece)` tells the caller what?",
          question: { type: "choice", options: ["keep may borrow the artifact for a moment", "keep takes ownership: the caller must give it away with std::move or pass a new one", "keep copies the artifact", "keep returns ownership"], answer: 1 },
          explanation: "A unique_ptr parameter by value is a sink. The caller can't copy it, so it moves it in; afterwards the caller's pointer is empty.",
        },
        {
          prompt: "Why is `vector<unique_ptr<Artifact>>` safer for lending out pointers than `vector<Artifact>`?",
          question: { type: "choice", options: ["It uses less memory", "Growing the vector doesn't move the Artifacts, so borrowed pointers to them stay valid", "It sorts automatically", "It forbids lending"], answer: 1 },
          explanation: "A growing vector<Artifact> moves every element to new memory, leaving old pointers dangling. With unique_ptrs only the small array of pointers moves; the objects stay put.",
        },
      ],
    },

    // ───────────────────────── 16 ─────────────────────────
    {
      id: "cpp-memory-16-capstone",
      title: "Capstone: a full run of the lab",
      minutes: 40,
      xp: 180,
      concepts: ["putting ownership together", "move into the heap", "copy on purpose", "measuring with tally()", "zero leaks", "copies vs moves"],
      learn: md`### Everything at once

This lesson adds very little new syntax. Its purpose is to run **the whole lab** as one program and read the result as an engineer: did each piece have exactly one owner, did anything leak, and how much work was copying versus moving?

The plan for a full run:

1. **Parse** the manifest (lesson 13).
2. **Build owned objects** from the accepted rows: each Artifact is constructed on the stack and then *moved onto the heap* into a unique_ptr, so every registered piece costs exactly one move (lesson 8 and 10).
3. **Register** them in a Registry (lesson 15).
4. **Operate**: restore every fragile piece through borrowed pointers; make one deliberate copy for the insurer's appraisal; retire one piece by taking it out and letting it die.
5. **Report**: print the facts and measure the cost.

### Measuring with tally()

\`tally()\` returns the running totals of constructions, destructions, copies, moves, allocations and frees. To measure only the stretch of code you care about, take a reading before and after and subtract:

~~~cpp
Tally runStart = tally();
// ... the work ...
Tally runEnd = tally();
int copiesMade = runEnd.copy - runStart.copy;
~~~

Measuring like this is a habit worth keeping. Performance work in C++ usually starts with "how many copies and allocations is this really doing?", and the answer is often surprising.

### What the board will tell you

- The **audit** at the end of \`main\` must say 0 leaked blocks and 0 blocks freed twice. Every owner in this program is a unique_ptr or a standard container, so there is not a single \`delete\` written by hand in this lesson.
- The **copies versus moves** counter for the run: the only copy should be the appraisal copy you made on purpose (copying an Artifact is the one operation that costs a string copy); the moves are the cheap hand-overs.
- The final photo shows the registry as the single owner, with the appraisal copy sitting separately on the bench.

### A short tour of what you built

- Stack, heap and lifetimes (lessons 1 to 4): the foundation of everything.
- RAII, the rule of three, five and zero (5 to 9): classes that clean up after themselves.
- unique_ptr, operators and const (10 to 12): types that are safe and pleasant to use.
- Parsing, exceptions and a registry (13 to 15): ownership applied to a real program.

Production teams back this discipline up with tools that run alongside the program: compiler **sanitizers** (AddressSanitizer for invalid memory use, UndefinedBehaviorSanitizer for the rest) and **Valgrind**, which watch every allocation and report leaks, double frees and use-after-free with a stack trace. You do not run them here; the lab's audit shows you the same kinds of facts so you know what to look for when you do.

### Where it goes next

The next course in this path takes the same ideas generic: templates and concepts, STL containers and iterators, lambdas and std::function, virtual functions and polymorphism, and the shared ownership types \`std::shared_ptr\` and \`std::weak_ptr\` for the cases where one owner is not enough.

### Common mistakes in a program this size

- Letting a function take a unique_ptr or an Artifact **by value** when a reference would do: invisible copies and moves.
- Keeping a borrowed pointer past a \`take\` or a \`reset\`.
- Moving from an object and then using it.
- Catching an exception and continuing without restoring a valid state.`,
      mission: md`The lab's first full inventory day. The manifest is in, the registry is ready, and the director has asked for three things: every piece that arrived is registered, the fragile ones are stabilised, and *nothing* is left unaccounted for when the doors close.

Build each piece on the bench and move it into the registry, restore everything below 60% condition by 15 points, copy one piece for the insurer, retire the tin lantern, and print the report. When the audit shows zero leaks and the counter reads one copy against six moves, the final **Report** panel powers on and your whole lab is live.`,
      tasks: [
        "Write std::unique_ptr<Artifact> makeArtifact(const IntakeRow& row): build an Artifact piece(row.id, row.name, row.year, row.condition); on the bench, then return std::make_unique<Artifact>(std::move(piece));",
        "Write int restoreFragile(Registry& registry, int limit, int boost): for each held piece in registry.pieces() with condition below limit, add boost (capped at 100) and count it",
        "In main take Tally runStart = tally(); fill Registry labRegistry from intake with makeArtifact, and restore pieces below 60 by 15",
        "Make one deliberate copy: Artifact appraisalCopy = labRegistry.get(\"AMP-01\"); then retire TIN-15 with take() and reset() it. Take Tally runEnd = tally();",
        "Find the weakest piece with std::min_element and print the report lines (below), then scene runCopies, runMoves and finalCount",
        "Peek labRegistry.pieces() and appraisalCopy and take snap(\"final report\");",
      ],
      starterAdd: cpp`#include <algorithm>

// ─── ✏️ YOUR TURN ─── lesson 16: write makeArtifact and restoreFragile here, above main.
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 16: the full run
// Tally runStart = tally();
// Registry labRegistry;  add makeArtifact(r) for each row r of intake
// int restoredCount = restoreFragile(labRegistry, 60, 15);
// Artifact appraisalCopy = labRegistry.get("AMP-01");           // one deliberate copy
// std::unique_ptr<Artifact> retiredPiece = labRegistry.take("TIN-15");  then reset it
// Tally runEnd = tally();
// weakest piece with std::min_element, then print these lines:
//   Larkspur Lab report
//   Registered: 6 pieces
//   Refused at intake: 3
//   Restored: 2 pieces
//   Weakest: BDS-14 at 63%
// scene runCopies, runMoves, finalCount; peek labRegistry.pieces() and appraisalCopy; snap("final report");`,
      solutionAdd: cpp`#include <algorithm>

std::unique_ptr<Artifact> makeArtifact(const IntakeRow& row) {
    Artifact piece(row.id, row.name, row.year, row.condition);  // built on the bench...
    return std::make_unique<Artifact>(std::move(piece));        // ...then moved onto the heap: one move
}

int restoreFragile(Registry& registry, int limit, int boost) {
    int restored = 0;
    for (const auto& held : registry.pieces()) {
        if (held->condition < limit) {
            held->condition = std::min(100, held->condition + boost);  // the vector is const, the pieces are not
            ++restored;
        }
    }
    return restored;
}
${MAIN_DIVIDER}
// Lesson 16: the full run.
Tally runStart = tally();
Registry labRegistry;
for (const IntakeRow& r : intake) {
    labRegistry.add(makeArtifact(r));
}
int restoredCount = restoreFragile(labRegistry, 60, 15);
Artifact appraisalCopy = labRegistry.get("AMP-01");  // a deliberate copy for the insurer
std::unique_ptr<Artifact> retiredPiece = labRegistry.take("TIN-15");
retiredPiece.reset();
Tally runEnd = tally();
const auto& finalPieces = labRegistry.pieces();
const auto weakest = std::min_element(finalPieces.begin(), finalPieces.end(), [](const auto& a, const auto& b) { return a->condition < b->condition; });
std::cout << "Larkspur Lab report\n";
std::cout << "Registered: " << intake.size() << " pieces\n";
std::cout << "Refused at intake: " << rejectLines.size() << "\n";
std::cout << "Restored: " << restoredCount << " pieces\n";
std::cout << "Weakest: " << (*weakest)->id << " at " << (*weakest)->condition << "%\n";
scene("runCopies", runEnd.copy - runStart.copy);
scene("runMoves", runEnd.move - runStart.move);
scene("finalCount", labRegistry.size());
peek("labRegistry.pieces", labRegistry.pieces());
peek("appraisalCopy", appraisalCopy);
snap("final report");`,
      explanation:
        "makeArtifact constructs each piece on the stack and then moves it into a make_unique, so each of the six registered pieces costs one move and no copy. restoreFragile reads the registry through a const reference to the vector but still modifies the pieces, because constness of the vector does not make the pointed-to Artifacts const. Copying AMP-01 for the appraisal is the single deliberate copy of the run; taking TIN-15 out and resetting the pointer destroys it exactly once. The weakest piece after restoration is BDS-14 (48 + 15 = 63). Every owner is a unique_ptr, a vector or a stack object, so no delete is written anywhere and the audit finds nothing left over.",
      hints: [
        { id: "h1", title: "makeArtifact", content: "Artifact piece(row.id, row.name, row.year, row.condition); return std::make_unique<Artifact>(std::move(piece)); — the std::move turns the stack piece into the argument of Artifact's move constructor, which is the one move per piece." },
        { id: "h2", title: "restoreFragile", content: "for (const auto& held : registry.pieces()) { if (held->condition < limit) { held->condition = std::min(100, held->condition + boost); ++restored; } } return restored; — held is a const reference to a unique_ptr, but the Artifact it points at can still be changed." },
        { id: "h3", title: "The weakest piece", content: "const auto& finalPieces = labRegistry.pieces(); const auto weakest = std::min_element(finalPieces.begin(), finalPieces.end(), [](const auto& a, const auto& b) { return a->condition < b->condition; }); then (*weakest)->id and (*weakest)->condition." },
      ],
      tests: [
        {
          id: "t1",
          description: "The report lines are printed",
          assertionCode: lab`
const want = ["Larkspur Lab report", "Registered: 6 pieces", "Refused at intake: 3", "Restored: 2 pieces", "Weakest: BDS-14 at 63%"];
for (const w of want) assert(lines.includes(w), 'Missing the report line: ' + w);
assertEqual(scene.finalCount, 5, "finalCount (six registered, the tin lantern retired)");`,
        },
        {
          id: "t2",
          description: "One deliberate copy against six cheap moves",
          assertionCode: lab`
assertEqual(scene.runCopies, 1, "copies during the run (only the appraisal copy)");
assertEqual(scene.runMoves, 6, "moves during the run (one per registered piece)");`,
        },
        {
          id: "t3",
          description: "The registry owns the five remaining pieces and the copy sits apart",
          assertionCode: lab`
const s = needShot("final report");
const reg = ent(s, "labRegistry.pieces"), copy = ent(s, "appraisalCopy");
assert(reg && copy, "Peek labRegistry.pieces() and appraisalCopy before the snap.");
assertEqual(reg.len, 5, "pieces in the registry");
assert(copy.k === "obj" && copy.rg === 0, "appraisalCopy should be an Artifact on the bench (a stack object), not a heap piece.");`,
        },
        {
          id: "t4",
          description: "The audit finds no leaks and no double frees",
          assertionCode: lab`
needShot("final report");
assert(audit, "The audit did not report. Keep Lab lab; as the first line of main and let the program finish.");
assertEqual(audit.leaks.length, 0, "blocks left in the vault when main ended");
assertEqual(audit.bf, 0, "blocks freed twice");
assertEqual(audit.al, audit.fr, "bays taken and returned");`,
        },
      ],
      unlocks: ["pv-report"],
      checks: [
        {
          prompt: "Why does `restoreFragile` compile even though it loops over `registry.pieces()`, a `const` vector?",
          question: { type: "choice", options: ["const is ignored in range-for", "The vector is const, but the Artifacts its unique_ptrs point at are not", "pieces() returns a copy", "held->condition is read-only"], answer: 1 },
          explanation: "const is shallow for pointers: a const vector<unique_ptr<Artifact>> cannot change which Artifacts it holds, but the pointed-to objects are separate and still modifiable. If you want them read-only, use vector<unique_ptr<const Artifact>> or hand out const Artifact&.",
        },
        {
          prompt: "Which line of the run makes the only copy?",
          question: { type: "choice", options: ["Artifact piece(row.id, ...);", "return std::make_unique<Artifact>(std::move(piece));", "Artifact appraisalCopy = labRegistry.get(\"AMP-01\");", "labRegistry.add(makeArtifact(r));"], answer: 2 },
          explanation: "Initialising a new Artifact from an lvalue reference (what get() returns) calls the copy constructor. The make_unique line moves from `piece`, and add() moves a unique_ptr, which is just a pointer.",
        },
      ],
    },
  ],
};
