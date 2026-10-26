import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { cpp, js, md } from "./util.ts";

/**
 * Chapter 4: Objects and safety nets. Classes, enum classes, exceptions and a capstone that runs a
 * whole shift. Every lesson here adds declarations above MAIN_DIVIDER and statements below it.
 */

export const chapter4: Chapter = {
  id: "objects-and-safety",
  title: "Objects and safety nets",
  blurb: "Model the reactor with classes and enums, survive bad data with exceptions, then run a whole shift.",
  lessons: [
    // ───────────────────────── 13 ─────────────────────────
    {
      id: "cpp-basics-13-classes",
      title: "Control rods: your first class",
      minutes: 45,
      xp: 180,
      concepts: ["class", "public / private", "constructor", "member initializer list", "member functions", "const methods", "encapsulation"],
      learn: md`### Data and behaviour, together

A struct bundles data. A **class** bundles data *and the rules for changing it*. A control rod is a good example: its insertion depth must always stay between 0 and 100 percent. If the number is a plain public member, any line of code anywhere can set it to \`-500\`. A class lets you **hide** the number and offer only safe operations.

~~~cpp
class ControlRod {
public:
    ControlRod(const std::string& name, int insertion)
        : name_(name), insertion_(insertion) {
        if (insertion_ < 0) insertion_ = 0;
        if (insertion_ > 100) insertion_ = 100;
    }

    void insert(int percent) {
        insertion_ += percent;
        if (insertion_ > 100) insertion_ = 100;
    }

    int insertion() const { return insertion_; }

private:
    std::string name_;
    int insertion_;
};
~~~

### The parts of a class

- **\`public:\`** members can be used by anyone. This is the class's **interface**: what the outside world may do.
- **\`private:\`** members can be used only from inside the class. Code elsewhere that touches them gets *'int ControlRod::insertion_' is private within this context*. By convention private data members end in an underscore (\`insertion_\`) so you can tell them apart at a glance.
- A **constructor** has the class's name and no return type. It runs whenever an object is created and is where you put the object into a valid starting state. The part after the colon, \`: name_(name), insertion_(insertion)\`, is the **member initializer list**: it initializes the members directly, before the body runs. Prefer it to assigning in the body.
- **Member functions** (methods) are the object's actions: \`insert\`, \`insertion\`. Inside them the members are simply in scope.

### Creating and using objects

~~~cpp
ControlRod rod("R1", 30);       // calls the constructor
rod.insert(25);                 // call a member function with a dot
std::cout << rod.insertion();   // 55
rod.insertion_ = 500;           // compile error: insertion_ is private
~~~

In a vector: \`std::vector<ControlRod> rods = { ControlRod("R1", 30), ControlRod("R2", 55) };\`

### \`const\` member functions

Putting \`const\` after the parameter list promises "this function does not change the object":

~~~cpp
int insertion() const { return insertion_; }
~~~

It is more than a comment. A \`const ControlRod&\` (which is what you get from \`for (const ControlRod& rod : rods)\`) can only call \`const\` member functions. Forget the \`const\` and you get *passing 'const ControlRod' as 'this' argument discards qualifiers*. The rule: **every member function that does not modify the object should be \`const\`.**

### Why bother? Encapsulation

Every rule about insertion depth lives in one place. Nobody can bypass \`insert\` and \`withdraw\`, so nobody can break the 0 to 100 rule, and you can change how the rod stores its state later without touching the rest of the program. This idea (hide the data, expose behaviour) is called **encapsulation**.

### \`class\` versus \`struct\`

They are the same thing except for the default access: members of a \`struct\` are public unless you say otherwise, members of a \`class\` are private. By convention: \`struct\` for plain bundles of data like \`Sensor\`, \`class\` when there are rules to protect.

### The default constructor goes away

Once you write your own constructor, the compiler stops creating the no-argument one. \`ControlRod rod;\` then fails (*no matching function for call to 'ControlRod::ControlRod()'*). That is usually what you want: a rod without a name makes no sense.

### Common mistakes

- Making data members public "for convenience", which throws the protection away.
- Forgetting the \`;\` after the closing brace of the class.
- Forgetting \`const\` on getters and then being unable to call them on a \`const&\`.
- Naming a constructor parameter the same as a member and assigning it to itself (\`name = name;\`). The trailing underscore avoids the trap.
- Writing \`public:\` and then defining a function outside the class without \`ControlRod::\` in front of its name.`,
      mission: md`Four control rods slide into the core to slow the reaction: the deeper they go, the less reactive the core. Each rod must refuse nonsense: you cannot push one past 100 percent or pull it out beyond 0. Instead of trusting every part of the program to remember that, you will build a \`ControlRod\` class that guards its own invariant.

When this lesson passes, the **Control rods** card lights up with the four rods hanging from the rail at their insertion depth.`,
      tasks: [
        "In Part A write class ControlRod with private std::string name_ and int insertion_, a constructor (name, insertion) that clamps the insertion to 0 to 100, insert(int) and withdraw(int) that never leave 0 to 100, and const getters name(), insertion(), reactivity() ((100 - insertion) / 100.0) and fullyInserted() (insertion is exactly 100)",
        "In main create std::vector<ControlRod> controlRods with R1 at 30, R2 at 55, R3 at 80 and R4 at 100",
        "Insert 25 into R1, withdraw 30 from R3 and insert 70 into R2 (it must stop at 100, not go to 125)",
        "Loop with const ControlRod& to fill controlNames, controlInsertions and controlReactivity, add up totalReactivity (rounded to two decimals) and count fullyInserted; print one line per rod like R1: 55% inserted, reactivity 0.45",
        "Send controlNames, controlInsertions, controlReactivity, totalReactivity and fullyInserted to the board",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── Part A (above main): write the class.
// class ControlRod {
// public:
//     ControlRod(const std::string& name, int insertion);    // clamp insertion to 0..100
//     void insert(int percent);          // deeper, but never above 100
//     void withdraw(int percent);        // shallower, but never below 0
//     const std::string& name() const;   int insertion() const;
//     double reactivity() const;         // (100 - insertion) / 100.0
//     bool fullyInserted() const;        // insertion is exactly 100
// private:
//     std::string name_;   int insertion_;
// };      <- the semicolon matters


${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ─── Part B (inside main): use the rods.
// std::vector<ControlRod> controlRods = { ControlRod("R1", 30), ControlRod("R2", 55), ControlRod("R3", 80), ControlRod("R4", 100) };
// controlRods[0].insert(25);    controlRods[2].withdraw(30);    controlRods[1].insert(70);   // stops at 100
// for (const ControlRod& rod : controlRods): fill controlNames / controlInsertions / controlReactivity, total up, count fullyInserted
//   print:  R1: 55% inserted, reactivity 0.45          (R2: 100% ... 0,  R3: 50% ... 0.5,  R4: 100% ... 0)
//   totalReactivity = std::round(total * 100.0) / 100.0       -> 0.95
// scene keys: controlNames, controlInsertions, controlReactivity, totalReactivity, fullyInserted
`,
      solutionAdd: cpp`class ControlRod {
public:
    ControlRod(const std::string& name, int insertion)
        : name_(name), insertion_(insertion) {
        if (insertion_ < 0) insertion_ = 0;
        if (insertion_ > 100) insertion_ = 100;
    }

    void insert(int percent) {
        insertion_ += percent;
        if (insertion_ > 100) insertion_ = 100;
    }

    void withdraw(int percent) {
        insertion_ -= percent;
        if (insertion_ < 0) insertion_ = 0;
    }

    const std::string& name() const { return name_; }
    int insertion() const { return insertion_; }
    double reactivity() const { return (100 - insertion_) / 100.0; }
    bool fullyInserted() const { return insertion_ == 100; }

private:
    std::string name_;
    int insertion_;
};

${MAIN_DIVIDER}

// Lesson 13: the control rods.
std::vector<ControlRod> controlRods = {
    ControlRod("R1", 30),
    ControlRod("R2", 55),
    ControlRod("R3", 80),
    ControlRod("R4", 100),
};
controlRods[0].insert(25);
controlRods[2].withdraw(30);
controlRods[1].insert(70);   // would be 125: the class stops it at 100

std::vector<std::string> controlNames;
std::vector<int> controlInsertions;
std::vector<double> controlReactivity;
double totalReactivity = 0.0;
int fullyInserted = 0;
for (const ControlRod& rod : controlRods) {
    controlNames.push_back(rod.name());
    controlInsertions.push_back(rod.insertion());
    controlReactivity.push_back(rod.reactivity());
    totalReactivity += rod.reactivity();
    if (rod.fullyInserted()) {
        fullyInserted++;
    }
    std::cout << rod.name() << ": " << rod.insertion() << "% inserted, reactivity " << rod.reactivity() << "\n";
}
totalReactivity = std::round(totalReactivity * 100.0) / 100.0;

scene("controlNames", controlNames);
scene("controlInsertions", controlInsertions);
scene("controlReactivity", controlReactivity);
scene("totalReactivity", totalReactivity);
scene("fullyInserted", fullyInserted);`,
      explanation:
        "The data members are private, so the only ways to change an insertion depth are the constructor, insert and withdraw, and each of them clamps to 0..100: pushing R2 by 70 from 55 would be 125, and the class stops it at 100. The member initializer list sets name_ and insertion_ before the constructor body runs. The getters are const, which is what lets the loop call them through const ControlRod&. Reactivity is (100 - insertion) / 100.0 with a .0 so the division is done in doubles.",
      hints: [
        { id: "h1", title: "The shape of the class", content: "class ControlRod { public: ControlRod(const std::string& name, int insertion) : name_(name), insertion_(insertion) { ...clamp... } ... private: std::string name_; int insertion_; }; The public: and private: labels, and the final semicolon, are the parts people forget." },
        { id: "h2", title: "Keeping 0 to 100", content: "void insert(int percent) { insertion_ += percent; if (insertion_ > 100) insertion_ = 100; } and the mirror image for withdraw with 0. The constructor clamps both ends." },
        { id: "h3", title: "const getters", content: "int insertion() const { return insertion_; } and double reactivity() const { return (100 - insertion_) / 100.0; } The word const after the parentheses is what allows calling them on a const ControlRod& in the loop." },
      ],
      tests: [
        {
          id: "t1",
          description: "the rods end at the right insertion depths",
          assertionCode: js`
assertEqual(JSON.stringify(scene.controlNames), '["R1","R2","R3","R4"]', "controlNames (rod.name() for each rod, in order)");
assertEqual(JSON.stringify(scene.controlInsertions), "[55,100,50,100]", "controlInsertions (R1 30+25, R2 55+70 stops at 100, R3 80-30, R4 100)");`,
        },
        {
          id: "t2",
          description: "reactivity is worked out inside the class",
          assertionCode: js`
assert(Array.isArray(scene.controlReactivity), "Send the reactivity values with scene(\"controlReactivity\", controlReactivity);");
assertEqual(JSON.stringify(scene.controlReactivity), "[0.45,0,0.5,0]", "controlReactivity ((100 - insertion) / 100.0 per rod: the .0 keeps the division from truncating)");
assertClose(scene.totalReactivity, 0.95, 0.0001, "totalReactivity (sum of the four, rounded to two decimals)");
assertEqual(scene.fullyInserted, 2, "fullyInserted (R2 and R4 are at exactly 100)");`,
        },
        {
          id: "t3",
          description: "one line per rod is printed",
          assertionCode: js`
const want = ["R1: 55% inserted, reactivity 0.45", "R2: 100% inserted, reactivity 0", "R3: 50% inserted, reactivity 0.5", "R4: 100% inserted, reactivity 0"];
for (const w of want) assert(lines.includes(w), 'No line is exactly "' + w + '".');`,
        },
      ],
      unlocks: ["rc-control"],
      checks: [
        {
          prompt: "Why is `insertion_` declared `private`?",
          question: {
            type: "choice",
            options: [
              "So only the class's own functions can change it and the 0 to 100 rule cannot be bypassed",
              "To make the program run faster",
              "Because private data is invisible to the debugger",
              "C++ requires every data member to be private",
            ],
            answer: 0,
          },
          explanation: "Private members are reachable only from inside the class, so every change goes through code that enforces the rules. That protection is the whole point of encapsulation.",
        },
        {
          prompt: "What does the `const` in `int insertion() const { ... }` promise?",
          question: {
            type: "choice",
            options: [
              "That calling the function will not change the object",
              "That the function returns a constant number",
              "That the function can only be called once",
              "That the object is created at compile time",
            ],
            answer: 0,
          },
          explanation: "A `const` member function cannot modify the object's data, and in return it can be called on `const` objects and `const&` references.",
        },
        {
          prompt: "In a `class`, what is the default access of its members if you write no label?",
          question: { type: "choice", options: ["private", "public", "protected", "There is no default: it is an error"], answer: 0 },
          explanation: "Members of a `class` are private by default; members of a `struct` are public by default. That one difference is the only one between them.",
        },
      ],
    },

    // ───────────────────────── 14 ─────────────────────────
    {
      id: "cpp-basics-14-enums",
      title: "Reactor state: enum class",
      minutes: 35,
      xp: 140,
      concepts: ["enum class", "scoped names", "switch over an enum", "state machine", "static_cast to int", "validating transitions"],
      learn: md`### A closed set of choices

The reactor is always in exactly one state: offline, standby, warming up, running or scrammed (emergency shutdown). You could store that in an \`int\` (0 to 4) or a \`std::string\`, but then nothing stops \`state = 7\` or a typo like \`"Runing"\`. An **enum class** is a type whose only possible values are the ones you list.

~~~cpp
enum class State { Offline, Standby, WarmUp, Running, Scram };

State state = State::Offline;
state = State::Standby;
state = 3;                 // error: cannot convert 'int' to 'State'
state = State::Runing;     // error: 'Runing' is not a member of 'State'
~~~

- Values are always written with their type: \`State::Running\`. They are **scoped** to the enum, so \`Running\` can mean different things in different enums without a clash.
- An enum class never converts to or from an integer by accident. Underneath each name has a number, starting at 0 (\`Offline\` is 0, \`Running\` is 3), and you can ask for it with \`static_cast<int>(state)\`.
- You cannot print one directly (*no match for 'operator<<'*). Write a small function that returns text.

(The older plain \`enum\` is unscoped and converts to \`int\` silently, which invites bugs. Prefer \`enum class\`.)

### \`switch\` and enums are made for each other

~~~cpp
std::string toText(State state) {
    switch (state) {
        case State::Offline: return "Offline";
        case State::Standby: return "Standby";
        case State::WarmUp:  return "WarmUp";
        case State::Running: return "Running";
        case State::Scram:   return "Scram";
    }
    return "Unknown";      // only reached if state holds an impossible value
}
~~~

When every case returns, you do not need \`break\`. Listing every value of the enum is useful: with warnings switched on (\`-Wall\`) the compiler tells you when you add a new state and forget to handle it somewhere. The \`return\` after the \`switch\` keeps the function safe if someone passes a value outside the list.

### A state machine: legal moves only

Real systems do not allow every change. You cannot go from Offline straight to Running; the reactor has to pass through Standby and WarmUp. Put the rules in one function:

~~~cpp
bool canMove(State from, State to) {
    if (to == State::Scram) {
        return from != State::Offline && from != State::Scram;   // any live state can scram
    }
    switch (from) {
        case State::Offline: return to == State::Standby;
        case State::Standby: return to == State::WarmUp || to == State::Offline;
        case State::WarmUp:  return to == State::Running || to == State::Standby;
        case State::Running: return to == State::Standby;
        case State::Scram:   return to == State::Offline;
    }
    return false;
}
~~~

Now the rest of the program only has to ask \`canMove(state, wanted)\` and reject requests that fail. All the rules live in one place, and illegal states cannot happen.

### Enums in vectors

~~~cpp
std::vector<State> commands = {State::WarmUp, State::Standby, State::WarmUp};
for (State wanted : commands) { ... }
~~~

An enum is a tiny value, so pass and loop by value.

### Common mistakes

- Writing \`Running\` instead of \`State::Running\`.
- Comparing an enum with an integer, or printing it without converting.
- Forgetting a case in a \`switch\` and silently getting the fall-through to \`return "Unknown"\`.
- Scattering "is this move allowed?" checks across the program instead of one function.
- Forgetting the \`;\` after the closing brace of the enum.`,
      mission: md`A reactor that can jump from cold to full power is a reactor that explodes. Helios-1's operating state must follow strict rules: Offline, Standby, WarmUp, Running, with Scram as the emergency exit. You will model the states as an \`enum class\`, put the rules in one function, replay a list of operator commands, and reject the illegal ones.

When this lesson passes, the **Reactor state** card lights up with the state chain, the path your reactor took, and the number of rejected commands.`,
      tasks: [
        "In Part A define enum class State { Offline, Standby, WarmUp, Running, Scram }, std::string toText(State) with a switch, and bool canMove(State from, State to) using the rules in the Learn tab",
        "In main start with State state = State::Offline and a vector of commands: WarmUp, Standby, WarmUp, Running, Offline",
        "For each command: if canMove allows it, print the move (Offline -> Standby), update state and append the new state's name to history (which starts with Offline); otherwise print Rejected: and the move and count it in rejected",
        "Print State: Running at the end and compute stateCode with static_cast<int>(state)",
        "Send state (as text), stateCode, history and rejected to the board",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── Part A (above main): the state type and its rules.
//   enum class State { Offline, Standby, WarmUp, Running, Scram };
//   std::string toText(State state)                     -> a switch returning "Offline", "Standby", ...
//   bool canMove(State from, State to)                  -> Scram from any live state; Offline->Standby; Standby->WarmUp or Offline;
//                                                          WarmUp->Running or Standby; Running->Standby; Scram->Offline


${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ─── Part B (inside main): replay the operator's commands.
// State state = State::Offline;
// std::vector<State> commands = {State::WarmUp, State::Standby, State::WarmUp, State::Running, State::Offline};
// std::vector<std::string> history = {toText(state)};      int rejected = 0;
// for (State wanted : commands): allowed -> print  Offline -> Standby  (and update state + history); else print  Rejected: Offline -> WarmUp  and rejected++
// Print at the end:  State: Running          int stateCode = static_cast<int>(state);   -> 3
// scene keys: state (the text), stateCode, history, rejected
`,
      solutionAdd: cpp`enum class State { Offline, Standby, WarmUp, Running, Scram };

std::string toText(State state) {
    switch (state) {
        case State::Offline: return "Offline";
        case State::Standby: return "Standby";
        case State::WarmUp: return "WarmUp";
        case State::Running: return "Running";
        case State::Scram: return "Scram";
    }
    return "Unknown";
}

bool canMove(State from, State to) {
    if (to == State::Scram) {
        return from != State::Offline && from != State::Scram;
    }
    switch (from) {
        case State::Offline: return to == State::Standby;
        case State::Standby: return to == State::WarmUp || to == State::Offline;
        case State::WarmUp: return to == State::Running || to == State::Standby;
        case State::Running: return to == State::Standby;
        case State::Scram: return to == State::Offline;
    }
    return false;
}

${MAIN_DIVIDER}

// Lesson 14: the reactor state machine.
State state = State::Offline;
std::vector<State> commands = {State::WarmUp, State::Standby, State::WarmUp, State::Running, State::Offline};
std::vector<std::string> history = {toText(state)};
int rejected = 0;
for (State wanted : commands) {
    if (canMove(state, wanted)) {
        std::cout << toText(state) << " -> " << toText(wanted) << "\n";
        state = wanted;
        history.push_back(toText(state));
    } else {
        std::cout << "Rejected: " << toText(state) << " -> " << toText(wanted) << "\n";
        rejected++;
    }
}
std::cout << "State: " << toText(state) << "\n";
int stateCode = static_cast<int>(state);

scene("state", toText(state));
scene("stateCode", stateCode);
scene("history", history);
scene("rejected", rejected);`,
      explanation:
        "The enum class makes State a closed set: nothing but the five named values fits in a State variable, and they must be written State::Running. toText turns a state into text with a switch where every case returns. canMove is the single place that knows the rules: Offline -> WarmUp is rejected because Offline may only go to Standby, and Running -> Offline is rejected because a running reactor must pass through Standby. The loop applies each command only when allowed, so history records the legal path Offline, Standby, WarmUp, Running and two commands are rejected. static_cast<int> gives the number behind Running, which is 3.",
      hints: [
        { id: "h1", title: "The enum and toText", content: "enum class State { Offline, Standby, WarmUp, Running, Scram }; Then switch (state) { case State::Offline: return \"Offline\"; ... } and a final return \"Unknown\"; after the switch." },
        { id: "h2", title: "canMove", content: "Check the Scram rule first: if (to == State::Scram) return from != State::Offline && from != State::Scram; Then switch (from) with one case per state returning a condition such as to == State::Standby." },
        { id: "h3", title: "The replay loop", content: "for (State wanted : commands) { if (canMove(state, wanted)) { print the move; state = wanted; history.push_back(toText(state)); } else { print Rejected: ...; rejected++; } } Remember history starts as {toText(state)}." },
      ],
      tests: [
        {
          id: "t1",
          description: "legal moves are applied and the final state is Running",
          assertionCode: js`
assertEqual(scene.state, "Running", "state (send toText(state), the final state after replaying the commands)");
assertEqual(scene.stateCode, 3, "stateCode (static_cast<int>(state): Offline 0, Standby 1, WarmUp 2, Running 3, Scram 4)");
assertEqual(JSON.stringify(scene.history), '["Offline","Standby","WarmUp","Running"]', "history (start with Offline and append every state you actually move to)");`,
        },
        {
          id: "t2",
          description: "illegal moves are rejected and counted",
          assertionCode: js`
assertEqual(scene.rejected, 2, "rejected (Offline -> WarmUp and Running -> Offline are not allowed)");
assert(lines.includes("Rejected: Offline -> WarmUp"), 'Print "Rejected: Offline -> WarmUp" for the first command.');
assert(lines.includes("Rejected: Running -> Offline"), 'Print "Rejected: Running -> Offline" for the last command.');`,
        },
        {
          id: "t3",
          description: "every accepted move is printed",
          assertionCode: js`
for (const w of ["Offline -> Standby", "Standby -> WarmUp", "WarmUp -> Running", "State: Running"]) assert(lines.includes(w), 'No line is exactly "' + w + '".');`,
        },
      ],
      unlocks: ["rc-state"],
      checks: [
        {
          prompt: "Which line is a compile error?",
          question: {
            type: "choice",
            options: [
              "`State s = State::Running;`",
              "`State s = Running;`",
              "`int code = static_cast<int>(State::Running);`",
              "`if (s == State::Scram) { }`",
            ],
            answer: 1,
          },
          explanation: "The values of an `enum class` are scoped: you must always write `State::Running`. A bare `Running` is not in scope.",
        },
        {
          prompt: "What number is `static_cast<int>(State::WarmUp)` for `enum class State { Offline, Standby, WarmUp, Running, Scram }`?",
          question: { type: "number", answer: 2 },
          explanation: "The names are numbered from 0 in the order listed: Offline 0, Standby 1, WarmUp 2, Running 3, Scram 4.",
        },
        {
          prompt: "Why put all the \"is this move allowed?\" rules in one function like `canMove`?",
          question: {
            type: "choice",
            options: [
              "So the rules exist in one place and cannot disagree with each other",
              "Because C++ forbids if statements in main",
              "Because switch statements cannot be used outside functions",
              "To make the program shorter",
            ],
            answer: 0,
          },
          explanation: "A single source of truth means a rule change is one edit in one place, and no part of the program can slip an illegal state past the others.",
        },
      ],
    },

    // ───────────────────────── 15 ─────────────────────────
    {
      id: "cpp-basics-15-exceptions",
      title: "Alarms: exceptions and validation",
      minutes: 40,
      xp: 160,
      concepts: ["throw", "try / catch", "std::exception hierarchy", "what()", "catch order", "validation", "uncaught exceptions"],
      learn: md`### When a function cannot do its job

Some failures cannot be fixed where they happen. \`checkReading\` is handed a pressure of -1: it cannot "fix" that, and it cannot just return a number and hope the caller notices. C++ provides **exceptions**: the function **throws** an error object, execution leaves the function immediately (and every function above it, one by one) until some code **catches** it.

~~~cpp
void checkReading(const Sensor& reading) {
    if (reading.value < 0.0) {
        throw std::invalid_argument(reading.name + " reading is not physical");
    }
}

try {
    checkReading(sensor);
    std::cout << "ok\n";
} catch (const std::invalid_argument& error) {
    std::cout << "bad data: " << error.what() << "\n";
}
~~~

- **\`throw\`** creates the error and starts the escape. The code after it in that function does not run.
- A **\`try\` block** guards code that may throw. If nothing throws, the \`catch\` blocks are skipped.
- A **\`catch\` block** names the kind of error it handles. \`error.what()\` returns the message text you supplied.
- Catch by **\`const&\`** (as above): no copy, and the full error object is preserved.

### The standard error types

All of these come from \`#include <stdexcept>\` and are rooted in \`std::exception\`:

- \`std::invalid_argument\`: the caller passed a value that makes no sense (your validation failures).
- \`std::out_of_range\`: an index or value is outside the allowed range (\`vector::at\`, \`substr\`).
- \`std::runtime_error\`: something went wrong while running, e.g. a limit was exceeded.
- \`std::exception\`: the base of all of them. \`catch (const std::exception& e)\` catches any standard error.

Choose the type that says *what kind* of problem it is, and write a message that says exactly what and where: \`"Pressure reading -1.0 is not physical"\` beats \`"error"\`.

### Several catch blocks

~~~cpp
try {
    checkReading(reading);
} catch (const std::invalid_argument& error) {
    // the data is bad
} catch (const std::runtime_error& error) {
    // a limit was exceeded
}
~~~

The **first** matching \`catch\` wins, so list the specific types first and the general \`std::exception\` last. \`catch (...)\` catches absolutely anything, including things that are not \`std::exception\`s; use it only as a last resort at the very edge of a program.

### What happens if nobody catches it?

The exception travels up to \`main\` and past it, and the program is terminated: *terminate called after throwing an instance of 'std::invalid_argument'*, with the message in \`what()\`. Text still waiting in the output buffer can be lost when that happens, so a crash may leave your console looking emptier than you expect. The cure is to catch at a level where you know what to do about it.

### Exceptions or if statements?

- Use plain \`if\` for things you **expect** to happen regularly, like "the user typed nothing".
- Use exceptions for things that **should not** happen and that the current function cannot resolve: broken invariants, impossible values, failed conversions.
- Never use an exception as an ordinary way to leave a loop; it is slow compared with \`break\`.

### Validate at the door

The best place to check data is right where it enters the program. A \`checkReading\` function that rejects bad input means the rest of the code can assume it has good data. Throw as soon as you know something is wrong, then handle it where you can do something sensible (log it, skip the reading, raise an alarm).

### Rethrowing

Inside a \`catch\`, plain \`throw;\` sends the same error on to the next handler, handy when you want to log something and still let the caller decide.

### Common mistakes

- Catching by value (\`catch (std::exception e)\`), which slices the error and copies it.
- Putting \`catch (const std::exception&)\` before the specific ones, so they never run.
- An empty \`catch\` block that hides the problem completely.
- Forgetting \`#include <stdexcept>\`.
- Throwing for ordinary, expected situations.`,
      mission: md`Readings arrive from the sensors faster than a human can inspect them, and some are wrong: a negative pressure, a limit of zero, a core temperature far above its ceiling. Your alarm system must check every reading, **accept** the good ones, and turn every bad one into a logged alarm: \`OVER_LIMIT\` when a limit is exceeded, \`BAD_DATA\` when the data itself is nonsense. One bad reading must never stop the others.

When this lesson passes, the **Alarms** card lights up with your list.`,
      tasks: [
        "In Part A write void checkReading(const Sensor& reading) that throws std::invalid_argument when the value is negative or the limit is not positive, and std::runtime_error when value is above limit; messages are built with fixed1 (see the starter comment)",
        "In main check the six readings in incoming one at a time inside try / catch, so one bad reading never stops the loop",
        "Catch std::invalid_argument as BAD_DATA and std::runtime_error as OVER_LIMIT; record the code and error.what() in alarmCodes and alarmMessages and print each as ALARM CODE: message",
        "Count the readings that passed as acceptedReadings and compute alarmCount; print Accepted readings: 2",
        "Send alarmCodes, alarmMessages, alarmCount and acceptedReadings to the board",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── Part A (above main): the validator.
//   void checkReading(const Sensor& reading)
//     value below 0      -> throw std::invalid_argument(reading.name + " reading " + fixed1(reading.value) + " is not physical");
//     limit 0 or below   -> throw std::invalid_argument(reading.name + " has no valid limit (" + fixed1(reading.limit) + ")");
//     value above limit  -> throw std::runtime_error(reading.name + " at " + fixed1(reading.value) + " exceeds limit " + fixed1(reading.limit));


${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ─── Part B (inside main): check the incoming readings.
// std::vector<Sensor> incoming = { {"Core temp", 700.0, 650.0}, {"Pressure", -1.0, 5.0}, {"Neutron flux", 7.2, 8.0},
//                                  {"Coolant out", 455.0, 450.0}, {"Vessel wall", 188.0, 0.0}, {"Coolant in", 288.0, 400.0} };
// for each reading: try { checkReading(reading); acceptedReadings++; }
//   catch (const std::invalid_argument& error) -> code "BAD_DATA"       catch (const std::runtime_error& error) -> code "OVER_LIMIT"
//   push the code and error.what() into alarmCodes / alarmMessages and print:  ALARM OVER_LIMIT: Core temp at 700.0 exceeds limit 650.0
// Print:  Accepted readings: 2
// scene keys: alarmCodes, alarmMessages, alarmCount, acceptedReadings
`,
      solutionAdd: cpp`void checkReading(const Sensor& reading) {
    if (reading.value < 0.0) {
        throw std::invalid_argument(reading.name + " reading " + fixed1(reading.value) + " is not physical");
    }
    if (reading.limit <= 0.0) {
        throw std::invalid_argument(reading.name + " has no valid limit (" + fixed1(reading.limit) + ")");
    }
    if (reading.value > reading.limit) {
        throw std::runtime_error(reading.name + " at " + fixed1(reading.value) + " exceeds limit " + fixed1(reading.limit));
    }
}

${MAIN_DIVIDER}

// Lesson 15: alarms.
std::vector<Sensor> incoming = {
    {"Core temp", 700.0, 650.0},
    {"Pressure", -1.0, 5.0},
    {"Neutron flux", 7.2, 8.0},
    {"Coolant out", 455.0, 450.0},
    {"Vessel wall", 188.0, 0.0},
    {"Coolant in", 288.0, 400.0},
};

std::vector<std::string> alarmCodes;
std::vector<std::string> alarmMessages;
int acceptedReadings = 0;
for (const Sensor& reading : incoming) {
    try {
        checkReading(reading);
        acceptedReadings++;
    } catch (const std::invalid_argument& error) {
        alarmCodes.push_back("BAD_DATA");
        alarmMessages.push_back(error.what());
        std::cout << "ALARM BAD_DATA: " << error.what() << "\n";
    } catch (const std::runtime_error& error) {
        alarmCodes.push_back("OVER_LIMIT");
        alarmMessages.push_back(error.what());
        std::cout << "ALARM OVER_LIMIT: " << error.what() << "\n";
    }
}
int alarmCount = static_cast<int>(alarmCodes.size());
std::cout << "Accepted readings: " << acceptedReadings << "\n";

scene("alarmCodes", alarmCodes);
scene("alarmMessages", alarmMessages);
scene("alarmCount", alarmCount);
scene("acceptedReadings", acceptedReadings);`,
      explanation:
        "checkReading validates at the door: each problem throws the error type that describes it, with a message built from the reading itself. The try / catch sits inside the loop, so a thrown error only ends that one reading's attempt and the loop carries on with the next. Because acceptedReadings++ comes after checkReading in the try block, it is skipped whenever checkReading throws. invalid_argument and runtime_error are different branches of the exception family, so their order does not matter, but a catch for std::exception would have to come last. error.what() returns the message text that was given when the error was thrown.",
      hints: [
        { id: "h1", title: "Throwing", content: "if (reading.value < 0.0) { throw std::invalid_argument(reading.name + \" reading \" + fixed1(reading.value) + \" is not physical\"); } Check the 'not physical' and 'no valid limit' cases before comparing with the limit. Put the function in Part A above the divider." },
        { id: "h2", title: "try inside the loop", content: "for (const Sensor& reading : incoming) { try { checkReading(reading); acceptedReadings++; } catch (const std::invalid_argument& error) { ... } catch (const std::runtime_error& error) { ... } } The try goes inside the loop so each reading is judged on its own." },
        { id: "h3", title: "Recording an alarm", content: "alarmCodes.push_back(\"BAD_DATA\"); alarmMessages.push_back(error.what()); std::cout << \"ALARM BAD_DATA: \" << error.what() << \"\\n\"; error.what() gives the text you passed to throw." },
      ],
      tests: [
        {
          id: "t1",
          description: "bad data and over-limit readings become alarms, in order",
          assertionCode: js`
assertEqual(JSON.stringify(scene.alarmCodes), '["OVER_LIMIT","BAD_DATA","OVER_LIMIT","BAD_DATA"]', "alarmCodes (runtime_error -> OVER_LIMIT, invalid_argument -> BAD_DATA, in the order the readings arrive)");
assertEqual(scene.alarmCount, 4, "alarmCount");`,
        },
        {
          id: "t2",
          description: "the messages come from the exceptions",
          assertionCode: js`
assertEqual(JSON.stringify(scene.alarmMessages), '["Core temp at 700.0 exceeds limit 650.0","Pressure reading -1.0 is not physical","Coolant out at 455.0 exceeds limit 450.0","Vessel wall has no valid limit (0.0)"]', "alarmMessages (error.what(), built in checkReading with fixed1 for one decimal)");`,
        },
        {
          id: "t3",
          description: "the good readings are still accepted and every alarm is printed",
          assertionCode: js`
assertEqual(scene.acceptedReadings, 2, "acceptedReadings (Neutron flux and Coolant in pass; one bad reading must not stop the loop)");
assert(lines.includes("ALARM OVER_LIMIT: Core temp at 700.0 exceeds limit 650.0"), 'Print "ALARM OVER_LIMIT: Core temp at 700.0 exceeds limit 650.0".');
assert(lines.includes("ALARM BAD_DATA: Pressure reading -1.0 is not physical"), 'Print "ALARM BAD_DATA: Pressure reading -1.0 is not physical".');
assert(lines.includes("Accepted readings: 2"), 'Print "Accepted readings: 2".');`,
        },
      ],
      unlocks: ["rc-alarms"],
      checks: [
        {
          prompt: "A function throws, and no `catch` anywhere handles it. What happens?",
          question: {
            type: "choice",
            options: [
              "The program terminates with an error message",
              "The error is ignored and the program continues",
              "The compiler refuses to build",
              "The function returns 0",
            ],
            answer: 0,
          },
          explanation: "An uncaught exception travels up through every caller and past `main`, then the runtime calls `std::terminate` (you see *terminate called after throwing an instance of ...*). Catch exceptions where you know how to handle them.",
        },
        {
          prompt: "Which `catch` is the better way to write it?",
          question: {
            type: "choice",
            options: [
              "`catch (const std::exception& e)`",
              "`catch (std::exception e)`",
              "`catch (std::exception* e)`",
              "`catch ()`",
            ],
            answer: 0,
          },
          explanation: "Catch by `const&`: no copy is made (catching by value can even slice off the specific error type), and you still get the full object with its `what()` message.",
        },
        {
          prompt: "You write `catch (const std::exception&)` first and `catch (const std::invalid_argument&)` second. What happens to the second one?",
          question: {
            type: "choice",
            options: [
              "It never runs, because the first (more general) handler already matches",
              "It runs first because it is more specific",
              "Both run",
              "The program does not compile in any case",
            ],
            answer: 0,
          },
          explanation: "Handlers are tried in order and the first that matches wins. `invalid_argument` *is a* `std::exception`, so the general handler catches it first. List the specific types before the general one.",
        },
      ],
    },

    // ───────────────────────── 16 ─────────────────────────
    {
      id: "cpp-basics-16-shift",
      title: "Shift report: the capstone",
      minutes: 50,
      xp: 220,
      concepts: ["putting it all together", "functions", "vectors & maps", "exceptions", "enum class", "algorithms", "debugging", "what comes next"],
      learn: md`### Everything you have learned, in one shift

This last lesson adds no new syntax. It asks you to **combine** the pieces: functions that return and throw, a vector of readings, a loop with a try/catch, a map to tally results, an \`enum class\` state, an algorithm to find the peak, and formatted output. A real program is never one feature at a time.

### Plan before you type

1. **What goes in?** A list of hourly core temperatures, where \`-1.0\` means "the sensor faulted".
2. **What comes out?** A log line for each hour, the peak and average of the good readings, the counts of each alarm level, a grade, and the final reactor state.
3. **Which parts are separate ideas?** Classifying a temperature (a function that may throw), grading the shift (another function), and the loop that ties them together.

Write the small functions first, test each in your head with one example, then write the loop.

### The classification function

~~~cpp
std::string levelFor(double temp, double limit) {
    if (temp < 0.0) {
        throw std::invalid_argument("sensor fault");
    }
    if (temp >= limit) {
        return "CRITICAL";
    }
    if (temp >= 0.8 * limit) {
        return "WARNING";
    }
    return "NORMAL";
}
~~~

### The loop with a safety net

Each hour is classified inside a \`try\`. A faulty reading throws, the \`catch\` records it and the loop carries on, so one broken sensor cannot ruin the report:

~~~cpp
for (int hour = 0; hour < static_cast<int>(hourlyTemps.size()); hour++) {
    try {
        std::string level = levelFor(hourlyTemps[hour], maxTemp);
        shiftLevels[level]++;                    // tally with a map
        // ... log line, keep the good temperature ...
    } catch (const std::invalid_argument&) {
        shiftBadReadings++;
    }
}
~~~

### Useful pieces from earlier lessons

- \`std::max_element(v.begin(), v.end())\` returns an iterator to the biggest element: dereference it with \`*\`.
- Divide by \`goodTemps.size()\` (a count of the readings that really counted), not by the number of hours.
- The state variable from lesson 14 can be reused: a CRITICAL level would call for \`State::Scram\`.
- \`fixed1(value)\` from lesson 9 formats a temperature with one decimal for the log.

### When something goes wrong: a debugging routine

1. **Read the first compiler error**, at the line it names (and the line above). Fix it, rebuild; later errors are often echoes of the first.
2. If it compiles but the output is wrong, **print the values** at the point where you stopped trusting them (\`std::cout << "level=" << level << "\n";\`), compare with what you expected, and find the first place they differ.
3. If the program stops early or prints nothing, suspect an **uncaught exception** (reading past the end, \`stoi\` of text, a \`throw\` with no \`catch\`) or a loop that never ends.
4. Shrink the problem: comment out everything after the suspect line.

### A short list of C++ dangers to remember

- **Undefined behaviour** (reading past the end of a vector with \`[]\`, using an uninitialized variable, signed integer overflow): it may crash, may seem to work, and may behave differently tomorrow.
- **Integer division** and implicit narrowing: \`int x = 3.9;\` silently gives 3.
- \`=\` versus \`==\`, a missing \`break\` in a \`switch\`, a missing \`&\` when you meant to change the caller's variable.
- A missing \`return\` in a function that should return a value.

### Where this goes next

You have used values only (copies and references). The next course, **Memory & Classes**, looks under the hood: what the stack and the heap are, pointers versus references, \`new\` and \`delete\` and why modern C++ avoids them (RAII and \`std::unique_ptr\`), constructors and destructors, copy versus move, operator overloading and custom exceptions. Everything in this course carries over.`,
      mission: md`The night shift is over and the supervisor wants the report. You have eight hourly core readings, one of them a sensor fault. Produce a shift log with a line per hour, the peak and average of the valid readings, how many hours fell into each alarm level, a grade, and the reactor's final state.

When this lesson passes, the **Shift report** lights up, and with it the last of the sixteen systems of the board. All of Helios-1 is now running on code you wrote.`,
      tasks: [
        "In Part A write std::string levelFor(double temp, double limit) (throws std::invalid_argument for a negative reading, then CRITICAL / WARNING at 80% / NORMAL) and char gradeFor(int warnings, int badReadings) ('A' for no problems, 'B' for up to 3 problems in total, otherwise 'C')",
        "In main loop over the eight hourlyTemps with try / catch: for a good reading keep it in goodTemps, tally its level in the map shiftLevels, count shiftWarnings and add a log line like Hour 1: 418.0 C NORMAL (use fixed1); for a fault count it in shiftBadReadings and log Hour 4: sensor fault, reading skipped",
        "If a level is CRITICAL set the lesson-14 variable state to State::Scram (it does not happen with these readings)",
        "Find shiftPeak with std::max_element over goodTemps and shiftAverage (the sum of goodTemps divided by their count, rounded to one decimal); shiftGrade comes from gradeFor; shiftState from toText(state)",
        "Print the log lines and then the six-line report in the starter comment; send shiftLog, shiftPeak, shiftAverage, shiftWarnings, shiftBadReadings, shiftGrade, shiftState and shiftLevels to the board",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── Part A (above main): two helper functions.
//   std::string levelFor(double temp, double limit)   -> temp < 0: throw std::invalid_argument("sensor fault");
//                                                        temp >= limit: "CRITICAL";  temp >= 0.8 * limit: "WARNING";  else "NORMAL"
//   char gradeFor(int warnings, int badReadings)      -> penalty = warnings + badReadings;  0 -> 'A',  up to 3 -> 'B',  more -> 'C'


${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ─── Part B (inside main): the shift report.
std::vector<double> hourlyTemps = {418.0, 436.5, 472.0, -1.0, 531.5, 562.0, 498.5, 455.0};
// std::vector<std::string> shiftLog;   std::map<std::string, int> shiftLevels;   std::vector<double> goodTemps;
// int shiftWarnings = 0, shiftBadReadings = 0;
// for each hour (0..7) inside try / catch (const std::invalid_argument&):
//   good: goodTemps.push_back(temp); shiftLevels[level]++; WARNING -> shiftWarnings++; CRITICAL -> state = State::Scram;
//         shiftLog.push_back("Hour 1: 418.0 C NORMAL");        (label from hour + 1, temperature through fixed1)
//   fault: shiftBadReadings++; shiftLog.push_back("Hour 4: sensor fault, reading skipped");
// double shiftPeak = *std::max_element(...);     double shiftAverage = sum / goodTemps.size(), one decimal;
// char shiftGrade = gradeFor(shiftWarnings, shiftBadReadings);      std::string shiftState = toText(state);
// Print every log line, then:
//   Shift report for Dana Whitlock (night shift)     Peak temperature: 562 C        Average temperature: 481.9 C
//   Warnings: 2, bad readings: 1                      Grade: B                        Final state: Running
// scene keys: shiftLog, shiftPeak, shiftAverage, shiftWarnings, shiftBadReadings, shiftGrade, shiftState, shiftLevels
`,
      solutionAdd: cpp`std::string levelFor(double temp, double limit) {
    if (temp < 0.0) {
        throw std::invalid_argument("sensor fault");
    }
    if (temp >= limit) {
        return "CRITICAL";
    }
    if (temp >= 0.8 * limit) {
        return "WARNING";
    }
    return "NORMAL";
}

char gradeFor(int warnings, int badReadings) {
    int penalty = warnings + badReadings;
    if (penalty == 0) {
        return 'A';
    }
    if (penalty <= 3) {
        return 'B';
    }
    return 'C';
}

${MAIN_DIVIDER}

// Lesson 16: the shift report.
std::vector<double> hourlyTemps = {418.0, 436.5, 472.0, -1.0, 531.5, 562.0, 498.5, 455.0};
std::vector<std::string> shiftLog;
std::map<std::string, int> shiftLevels;
std::vector<double> goodTemps;
int shiftWarnings = 0;
int shiftBadReadings = 0;

for (int hour = 0; hour < static_cast<int>(hourlyTemps.size()); hour++) {
    std::string label = "Hour " + std::to_string(hour + 1) + ": ";
    try {
        std::string level = levelFor(hourlyTemps[hour], maxTemp);
        goodTemps.push_back(hourlyTemps[hour]);
        shiftLevels[level]++;
        if (level == "WARNING") {
            shiftWarnings++;
        }
        if (level == "CRITICAL") {
            state = State::Scram;
        }
        shiftLog.push_back(label + fixed1(hourlyTemps[hour]) + " C " + level);
    } catch (const std::invalid_argument&) {
        shiftBadReadings++;
        shiftLog.push_back(label + "sensor fault, reading skipped");
    }
}

double shiftPeak = *std::max_element(goodTemps.begin(), goodTemps.end());
double tempSum = 0.0;
for (double temp : goodTemps) {
    tempSum += temp;
}
double shiftAverage = std::round(tempSum / goodTemps.size() * 10.0) / 10.0;
char shiftGrade = gradeFor(shiftWarnings, shiftBadReadings);
std::string shiftState = toText(state);

for (const std::string& entry : shiftLog) {
    std::cout << entry << "\n";
}
std::cout << "Shift report for " << operatorName << " (" << shift << ")\n";
std::cout << "Peak temperature: " << shiftPeak << " C\n";
std::cout << "Average temperature: " << shiftAverage << " C\n";
std::cout << "Warnings: " << shiftWarnings << ", bad readings: " << shiftBadReadings << "\n";
std::cout << "Grade: " << shiftGrade << "\n";
std::cout << "Final state: " << shiftState << "\n";

scene("shiftLog", shiftLog);
scene("shiftPeak", shiftPeak);
scene("shiftAverage", shiftAverage);
scene("shiftWarnings", shiftWarnings);
scene("shiftBadReadings", shiftBadReadings);
scene("shiftGrade", shiftGrade);
scene("shiftState", shiftState);
scene("shiftLevels", shiftLevels);`,
      explanation:
        "levelFor throws for a faulty reading and otherwise classifies against the limit, so the loop can treat 'bad reading' as an exception and keep going. Each hour is judged inside its own try / catch; the map tallies how many hours were NORMAL (5) and WARNING (2). The peak is the dereferenced result of max_element over the good readings only (562), and the average divides their sum by how many there are (7), not by 8 hours: 3373.5 / 7 = 481.9. gradeFor adds warnings and faults (2 + 1 = 3), which is B. The state variable from lesson 14 stays Running because no hour was CRITICAL.",
      hints: [
        { id: "h1", title: "The two helpers", content: "levelFor: first if (temp < 0.0) { throw std::invalid_argument(\"sensor fault\"); } then return \"CRITICAL\" if temp >= limit, \"WARNING\" if temp >= 0.8 * limit, otherwise \"NORMAL\". gradeFor adds warnings and badReadings and picks 'A', 'B' or 'C' with if statements (single quotes: it returns a char)." },
        { id: "h2", title: "The loop", content: "for (int hour = 0; hour < static_cast<int>(hourlyTemps.size()); hour++) { std::string label = \"Hour \" + std::to_string(hour + 1) + \": \"; try { std::string level = levelFor(hourlyTemps[hour], maxTemp); ... shiftLog.push_back(label + fixed1(hourlyTemps[hour]) + \" C \" + level); } catch (const std::invalid_argument&) { ... } }" },
        { id: "h3", title: "Peak, average, report", content: "double shiftPeak = *std::max_element(goodTemps.begin(), goodTemps.end()); (the * dereferences the iterator). Sum goodTemps with a range-for and divide by goodTemps.size(), not by 8. Round with std::round(x * 10.0) / 10.0." },
      ],
      tests: [
        {
          id: "t1",
          description: "the shift log has one line per hour, with the fault skipped",
          assertionCode: js`
assertEqual(JSON.stringify(scene.shiftLog), '["Hour 1: 418.0 C NORMAL","Hour 2: 436.5 C NORMAL","Hour 3: 472.0 C NORMAL","Hour 4: sensor fault, reading skipped","Hour 5: 531.5 C WARNING","Hour 6: 562.0 C WARNING","Hour 7: 498.5 C NORMAL","Hour 8: 455.0 C NORMAL"]', "shiftLog (one entry per hour: label + fixed1(temp) + \" C \" + level, or the sensor-fault text)");
for (const entry of scene.shiftLog) assert(lines.includes(entry), 'Print every log entry on its own line, for example "' + entry + '".');`,
        },
        {
          id: "t2",
          description: "peak and average use only the good readings",
          assertionCode: js`
assertEqual(scene.shiftPeak, 562, "shiftPeak (the highest good reading)");
assertClose(scene.shiftAverage, 481.9, 0.0001, "shiftAverage (3373.5 divided by the 7 good readings, not by 8, rounded to one decimal)");`,
        },
        {
          id: "t3",
          description: "levels are tallied and problems counted",
          assertionCode: js`
assertEqual(JSON.stringify(scene.shiftLevels), '{"NORMAL":5,"WARNING":2}', "shiftLevels (a std::map<std::string, int> filled with shiftLevels[level]++)");
assertEqual(scene.shiftWarnings, 2, "shiftWarnings");
assertEqual(scene.shiftBadReadings, 1, "shiftBadReadings (the -1.0 sensor fault)");`,
        },
        {
          id: "t4",
          description: "the grade and final state are right",
          assertionCode: js`
assertEqual(scene.shiftGrade, "B", "shiftGrade (2 warnings + 1 fault = 3 problems, which is a B)");
assertEqual(scene.shiftState, "Running", "shiftState (toText(state): nothing was CRITICAL, so the reactor stayed Running)");`,
        },
        {
          id: "t5",
          description: "the six-line report is printed",
          assertionCode: js`
const want = ["Shift report for Dana Whitlock (night shift)", "Peak temperature: 562 C", "Average temperature: 481.9 C", "Warnings: 2, bad readings: 1", "Grade: B", "Final state: Running"];
for (const w of want) assert(lines.includes(w), 'No line is exactly "' + w + '".');
const at = want.map((w) => lines.indexOf(w));
assert(at.every((v, i) => i === 0 || v > at[i - 1]), "Print the report lines in the order given in the starter comment.");`,
        },
      ],
      unlocks: ["rc-shift"],
      checks: [
        {
          prompt: "Why is the average divided by `goodTemps.size()` and not by the number of hours?",
          question: {
            type: "choice",
            options: [
              "The faulty reading is not part of the data; dividing by 8 would drag the average down",
              "size() is faster than counting hours",
              "Division by 8 does not compile",
              "Because vectors always have 7 elements",
            ],
            answer: 0,
          },
          explanation: "An average is the sum of the values divided by **how many values were summed**. The faulty hour contributed nothing to the sum, so it must not count in the divisor either.",
        },
        {
          prompt: "The program runs but prints nothing at all and the board says it crashed. Which is the most likely cause?",
          question: {
            type: "choice",
            options: [
              "An exception was thrown and never caught",
              "The file has too many comments",
              "A variable is named too long",
              "The \\n character was used instead of std::endl",
            ],
            answer: 0,
          },
          explanation: "An uncaught exception terminates the program, and buffered output can be lost with it. Check what could throw (`stoi`, `at`, your own `throw`) and make sure something catches it.",
        },
      ],
    },
  ],
};
