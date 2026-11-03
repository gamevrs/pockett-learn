import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { cpp, js, md } from "./util.ts";

/**
 * Chapter 3: Parts that talk. Strategy with std::function, the observer pattern, inheritance with virtual functions,
 * and abstract classes with virtual destructors (plus the slicing trap).
 */

export const chapter3: Chapter = {
  id: "parts-that-talk",
  title: "Parts that talk",
  blurb: "Swap behaviour like a plug, announce events to whoever is listening, and let each object decide for itself how to answer: strategy, observer and virtual functions.",
  lessons: [
    // ───────────────────────── 9 ─────────────────────────
    {
      id: "cpp-engine-9-strategy",
      title: "Strategy: behaviour you can swap",
      minutes: 30,
      xp: 110,
      concepts: ["design pattern", "strategy", "std::function", "using alias", "closure factory", "callable"],
      learn: md`### One lamp, many ways to blink

A lighthouse lamp can flash in different **plans**: a steady glow, a slow pulse, three quick flashes and a pause, a fade. The first way to write that is an \`if\` chain:

~~~cpp
std::string flash(const std::string& mode, int ticks) {
    if (mode == "steady") { /* ... */ }
    else if (mode == "pulse") { /* ... */ }
    else if (mode == "triple") { /* ... */ }
    // every new plan means editing this function
}
~~~

It works, but the lamp, the list of plans and the code for each plan are all tangled into one place. Adding a plan means opening a function that already works and risking it.

A **design pattern** is a named, reusable way of arranging code that people found solves a common problem. This one is called **strategy**: make "how to do it" a *value* that you hand to the object, so you can swap it without touching the object. The lamp stops knowing about plans; it just holds one and asks it to flash.

### std::function: a box for anything callable

To store a plan in a variable we need a type that can hold "something you can call". That is \`std::function\`, from \`<functional>\`. You write the call's shape in the angle brackets: result type, then parameter types in parentheses.

~~~cpp
#include <functional>

using FlashPlan = std::function<std::string(int)>;   // takes a tick count, returns a pattern
~~~

\`using Name = ...;\` just gives a long type a short name. A \`FlashPlan\` can hold a lambda, an ordinary function, or any object with a call operator, as long as it takes an \`int\` and returns a \`std::string\`:

~~~cpp
FlashPlan allOn = [](int ticks) { return std::string(ticks, '#'); };
allOn(4);          // "####"
~~~

(\`std::string(4, '#')\` makes four copies of the character.) Here \`#\` means the lamp is on for a tick and \`.\` means off.

### A function that builds plans

A lambda can capture a variable (lesson 8). Return one from a function and you get a **factory** that makes plans to order. This one repeats a short pattern for as many ticks as asked:

~~~cpp
FlashPlan makeRepeating(std::string unit) {
    return [unit](int ticks) {              // unit is copied into the lambda
        std::string out;
        for (int i = 0; i < ticks; ++i) out += unit[i % unit.size()];
        return out;
    };
}

FlashPlan pulse = makeRepeating("#.");
pulse(6);          // "#.#.#."
~~~

\`i % unit.size()\` is the remainder after dividing, so the position wraps round the pattern. The copy of \`unit\` stays alive inside the returned lambda even after \`makeRepeating\` has finished, which is exactly why a by-value capture is the safe choice here.

### The lamp that holds a strategy

~~~cpp
class SignalLamp {
public:
    explicit SignalLamp(FlashPlan plan) : plan_(std::move(plan)) {}
    void setPlan(FlashPlan plan) { plan_ = std::move(plan); }
    std::string flash(int ticks) const { return plan_(ticks); }

private:
    FlashPlan plan_;
};
~~~

\`SignalLamp\` has no idea which plan it holds: \`flash\` just calls it. \`std::move\` hands the plan over without copying it (you met moves in Provenance Lab), and \`explicit\` stops accidental conversions from a plan to a lamp.

Swapping behaviour is now one line: \`lamp.setPlan(otherPlan)\`. The plans can live in a \`std::map<std::string, FlashPlan>\` so a harbour master can pick one *by name*.

### Common mistakes

- Putting the wrong shape in \`std::function<...>\`: a lambda that takes a \`double\` does not fit a \`std::function<std::string(int)>\`.
- Calling an empty \`std::function\` (one that holds nothing): it throws. A default-constructed one is empty.
- Capturing a local variable by reference in a plan that outlives it.
- Using strategy for something that never varies. A pattern earns its place only when behaviour truly needs to change.`,
      mission: md`The harbour master wants to change how a lamp blinks from the control room, without anyone touching the lamp's code. You will give the lamp a swappable plan: a steady glow, a pulse, three flashes and a pause, and a fade from on to off.

Build the plans, store them in a map by name, and let a lamp switch from one to another. The **Flash plans** panel draws each pattern as a strip of on and off ticks.`,
      tasks: [
        "Above main, write using FlashPlan = std::function<std::string(int)>; the makeRepeating factory and the SignalLamp class (all from the lesson)",
        "In main: std::map<std::string, FlashPlan> plans; with plans[\"steady\"] = makeRepeating(\"#\"); plans[\"pulse\"] = makeRepeating(\"#.\"); plans[\"triple\"] = makeRepeating(\"#.#.#...\");",
        "Add a fourth plan from a lambda: plans[\"fade\"] that builds ticks characters, # for the first half of the ticks (i < ticks / 2) and . for the rest",
        "Run every plan for 8 ticks into std::map<std::string, std::string> planShapes (loop with a structured binding) and send scene(\"planShapes\", planShapes);",
        "SignalLamp harborLamp(plans[\"steady\"]); std::string firstFlash = harborLamp.flash(8); then harborLamp.setPlan(plans[\"triple\"]); std::string secondFlash = harborLamp.flash(8); Send both with scene(\"firstFlash\", firstFlash); scene(\"secondFlash\", secondFlash);",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── lesson 9: write FlashPlan, makeRepeating and SignalLamp here, above main.
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 9: the plans map, the four plans, planShapes and the lamp that swaps.
`,
      solutionAdd: cpp`#include <functional>

using FlashPlan = std::function<std::string(int)>;

FlashPlan makeRepeating(std::string unit) {
    return [unit](int ticks) {
        std::string out;
        for (int i = 0; i < ticks; ++i) out += unit[i % unit.size()];
        return out;
    };
}

class SignalLamp {
public:
    explicit SignalLamp(FlashPlan plan) : plan_(std::move(plan)) {}
    void setPlan(FlashPlan plan) { plan_ = std::move(plan); }
    std::string flash(int ticks) const { return plan_(ticks); }

private:
    FlashPlan plan_;
};
${MAIN_DIVIDER}
// Lesson 9: strategy.
std::map<std::string, FlashPlan> plans;
plans["steady"] = makeRepeating("#");
plans["pulse"] = makeRepeating("#.");
plans["triple"] = makeRepeating("#.#.#...");
plans["fade"] = [](int ticks) {
    std::string out;
    for (int i = 0; i < ticks; ++i) out += (i < ticks / 2 ? '#' : '.');
    return out;
};
std::map<std::string, std::string> planShapes;
for (const auto& [planName, plan] : plans) {
    planShapes[planName] = plan(8);
}
scene("planShapes", planShapes);

SignalLamp harborLamp(plans["steady"]);
std::string firstFlash = harborLamp.flash(8);
harborLamp.setPlan(plans["triple"]);
std::string secondFlash = harborLamp.flash(8);
scene("firstFlash", firstFlash);
scene("secondFlash", secondFlash);`,
      explanation:
        "FlashPlan is a std::function that holds anything taking an int and returning a std::string. makeRepeating returns a lambda that carries its own copy of the unit, so steady, pulse and triple are the same code with different data; fade is a plain lambda stored in the same map. SignalLamp never looks at which plan it has: flash just calls it. setPlan swaps the strategy, so the same lamp flashes ######## first and then #.#.#... afterwards.",
      hints: [
        { id: "h1", title: "The alias and the factory", content: "using FlashPlan = std::function<std::string(int)>; and makeRepeating returns a lambda: return [unit](int ticks) { std::string out; for (...) out += unit[i % unit.size()]; return out; };" },
        { id: "h2", title: "The fade", content: "plans[\"fade\"] = [](int ticks) { std::string out; for (int i = 0; i < ticks; ++i) out += (i < ticks / 2 ? '#' : '.'); return out; }; With 8 ticks it gives ####...." },
        { id: "h3", title: "Swapping", content: "SignalLamp harborLamp(plans[\"steady\"]); flash(8) once, then harborLamp.setPlan(plans[\"triple\"]); and flash(8) again. Same lamp, different behaviour." },
      ],
      tests: [
        {
          id: "t1",
          description: "All four plans produce their eight-tick patterns",
          assertionCode: js`
assertEqual(scene.planShapes, { steady: "########", pulse: "#.#.#.#.", triple: "#.#.#...", fade: "####...." }, "planShapes (each plan run for 8 ticks)");`,
        },
        {
          id: "t2",
          description: "The lamp changed plan without changing class",
          assertionCode: js`
assertEqual(scene.firstFlash, "########", "firstFlash (the lamp starts on the steady plan)");
assertEqual(scene.secondFlash, "#.#.#...", "secondFlash (after setPlan with the triple plan)");`,
        },
      ],
      unlocks: ["en-strategy"],
      checks: [
        {
          prompt: "What does `std::function<std::string(int)>` describe?",
          question: { type: "choice", options: ["A function that takes a string and returns an int", "Anything callable that takes an int and returns a std::string", "A string that holds an int", "A function with no parameters"], answer: 1 },
          explanation: "The type before the parentheses is the result, the types inside are the parameters. Any lambda or function of that shape fits.",
        },
        {
          prompt: "In the strategy pattern, who decides which plan runs?",
          question: { type: "choice", options: ["The lamp, by testing a mode string", "Whoever gives the lamp its plan", "The compiler", "The plan chooses its own lamp"], answer: 1 },
          explanation: "The lamp just calls whatever plan it holds. The caller chooses and can change it with `setPlan`, so adding a plan never edits the lamp.",
        },
      ],
    },

    // ───────────────────────── 10 ─────────────────────────
    {
      id: "cpp-engine-10-observer",
      title: "Observer: tell everyone who listens",
      minutes: 35,
      xp: 120,
      concepts: ["observer pattern", "publish / subscribe", "event", "callbacks", "unsubscribe by id", "lifetime of captures"],
      learn: md`### The sensor that knows too much

A storm sensor on the headland must warn three things: the foghorn, the lamp and the radio. The direct way is to let the sensor call each of them:

~~~cpp
void StormSensor::detect(const StormEvent& e) {
    horn.blow(e.level);
    lamp.dim();
    radio.send(e.name);
}
~~~

Now the sensor must know about horns, lamps and radios. Add a coastguard pager and you open the sensor again. Remove the radio and the sensor will not compile. The sensor's real job (noticing storms) is tied to everyone who cares about them.

The **observer** pattern (also called *publish and subscribe*) cuts that tie. The sensor, now called a **bus**, keeps a list of **subscribers**, which are functions that said "tell me when something happens". When an **event** (a small bundle of facts about what happened) occurs, the bus **publishes** it: it calls each subscriber in turn with the event. The bus never learns who they are.

### A bus built from std::function

~~~cpp
struct StormEvent { std::string name; int level; };
using Handler = std::function<void(const StormEvent&)>;

class StormBus {
public:
    int subscribe(Handler handler) {
        int id = nextId_++;
        handlers_[id] = std::move(handler);
        return id;                               // a ticket you can hand back later
    }
    void unsubscribe(int id) { handlers_.erase(id); }
    void publish(const StormEvent& event) const {
        for (const auto& [id, handler] : handlers_) handler(event);
    }
    std::size_t subscriberCount() const { return handlers_.size(); }

private:
    int nextId_ = 1;
    std::map<int, Handler> handlers_;           // id -> subscriber, in id order
};
~~~

- \`void(const StormEvent&)\` is the shape of a subscriber: it takes the event and returns nothing.
- \`subscribe\` hands back an **id**, the ticket you need to leave. A \`std::map\` keyed by id keeps subscribers in the order they joined, so the firing order is the same on every run. That matters: with an unordered container the order could change.
- \`publish\` loops over the map and calls every handler.

### Subscribing with lambdas

~~~cpp
std::vector<std::string> busLog;
StormBus bus;
int hornId = bus.subscribe([&busLog](const StormEvent& e) {
    busLog.push_back("horn: " + e.name + " level " + std::to_string(e.level));
});
bus.publish({"squall", 2});     // busLog now has: horn: squall level 2
~~~

\`{"squall", 2}\` builds a \`StormEvent\` on the spot. A subscriber may ignore events it does not care about, for example a lamp that only reacts to level 3 and above:

~~~cpp
bus.subscribe([&busLog](const StormEvent& e) {
    if (e.level >= 3) busLog.push_back("lamp: dims for " + e.name);
});
~~~

### Leaving, and the one big danger

\`bus.unsubscribe(hornId)\` removes the horn; later events skip it. This is not just tidiness. A subscriber that captured a variable **by reference** (like \`&busLog\`) is only safe while that variable is alive. If a subscriber outlives what it points at, the next publish calls into dead memory. The rule: **whoever subscribes must unsubscribe before their captured data goes away.**

### Common mistakes

- Publishing from inside a handler that changes the subscriber list (adding or removing subscribers while the loop runs): the loop's iterators may break.
- Capturing by reference something that will be destroyed before the bus.
- Relying on firing order without making it part of the design. Here the map's order is the design, written down.
- Forgetting that handlers run one after another: a slow handler delays all later ones.`,
      mission: md`Wire the headland's storm sensor to the harbour with a bus. The foghorn announces every storm, the lamp reacts only to level 3 and above, and the radio relays everything. Halfway through the night the foghorn is switched off, and the later events must skip it.

Build the bus, subscribe the three, publish three storms and record what each listener did. The **Event bus** panel shows the sensor in the middle with a spoke to every subscriber, lighting up as they fire.`,
      tasks: [
        "Above main, write struct StormEvent, using Handler = std::function<void(const StormEvent&)> and the StormBus class (from the lesson)",
        "In main: std::vector<std::string> busLog; StormBus bus; subscribe, in this order: the horn (logs \"horn: <name> level <level>\"), the lamp (logs \"lamp: dims for <name>\" only when level >= 3), the radio (logs \"radio: relays <name>\"). Keep the horn's id in int hornId",
        "Send scene(\"subscribersBefore\", bus.subscriberCount()); then publish {\"squall\", 2} and {\"gale\", 4}. Call bus.unsubscribe(hornId); and publish {\"swell\", 5}",
        "Send scene(\"busLog\", busLog); and scene(\"subscribersAfter\", bus.subscriberCount());",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── lesson 10: write StormEvent, Handler and StormBus here, above main.
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 10: the headland bus
// Subscribe horn, lamp, radio (in that order). Publish squall 2, gale 4, then unsubscribe the horn and publish swell 5.
`,
      solutionAdd: cpp`struct StormEvent {
    std::string name;
    int level;
};
using Handler = std::function<void(const StormEvent&)>;

class StormBus {
public:
    int subscribe(Handler handler) {
        int id = nextId_++;
        handlers_[id] = std::move(handler);
        return id;
    }
    void unsubscribe(int id) { handlers_.erase(id); }
    void publish(const StormEvent& event) const {
        for (const auto& [id, handler] : handlers_) handler(event);
    }
    std::size_t subscriberCount() const { return handlers_.size(); }

private:
    int nextId_ = 1;
    std::map<int, Handler> handlers_;
};
${MAIN_DIVIDER}
// Lesson 10: observer.
std::vector<std::string> busLog;
StormBus bus;
int hornId = bus.subscribe([&busLog](const StormEvent& e) {
    busLog.push_back("horn: " + e.name + " level " + std::to_string(e.level));
});
bus.subscribe([&busLog](const StormEvent& e) {
    if (e.level >= 3) busLog.push_back("lamp: dims for " + e.name);
});
bus.subscribe([&busLog](const StormEvent& e) {
    busLog.push_back("radio: relays " + e.name);
});
scene("subscribersBefore", bus.subscriberCount());
bus.publish({"squall", 2});
bus.publish({"gale", 4});
bus.unsubscribe(hornId);
bus.publish({"swell", 5});
scene("busLog", busLog);
scene("subscribersAfter", bus.subscriberCount());`,
      explanation:
        "The bus stores each subscriber under an id and calls them in id order when an event is published. The squall (level 2) reaches the horn and radio only, because the lamp ignores anything under 3; the gale (level 4) reaches all three. After unsubscribe(hornId) the swell reaches just the lamp and the radio. The lambdas capture busLog by reference, which is safe because busLog lives longer than the bus's last publish.",
      hints: [
        { id: "h1", title: "The three subscribers", content: "Each is bus.subscribe([&busLog](const StormEvent& e) { ... }); The horn pushes \"horn: \" + e.name + \" level \" + std::to_string(e.level). The lamp wraps its push_back in if (e.level >= 3)." },
        { id: "h2", title: "Keep the ticket", content: "int hornId = bus.subscribe(...); subscribe returns the id; give it to bus.unsubscribe(hornId); before the last publish." },
        { id: "h3", title: "Publishing", content: "bus.publish({\"squall\", 2}); builds the event in place. Expected log: horn squall, radio squall, horn gale, lamp gale, radio gale, lamp swell, radio swell." },
      ],
      tests: [
        {
          id: "t1",
          description: "Subscribers fired in subscription order, and the lamp skipped the small squall",
          assertionCode: js`
assertEqual(scene.busLog, [
  "horn: squall level 2", "radio: relays squall",
  "horn: gale level 4", "lamp: dims for gale", "radio: relays gale",
  "lamp: dims for swell", "radio: relays swell"], "busLog");`,
        },
        {
          id: "t2",
          description: "The horn left the bus",
          assertionCode: js`
assertEqual(scene.subscribersBefore, 3, "subscribersBefore");
assertEqual(scene.subscribersAfter, 2, "subscribersAfter (after bus.unsubscribe(hornId))");`,
        },
      ],
      unlocks: ["en-bus"],
      checks: [
        {
          prompt: "What is the main benefit of publish and subscribe?",
          question: { type: "choice", options: ["It makes programs run faster", "The sender does not need to know who is listening", "It removes the need for functions", "It avoids all memory use"], answer: 1 },
          explanation: "The sensor only publishes. Listeners can join and leave without the sensor's code changing.",
        },
        {
          prompt: "Why is the handler list a `std::map<int, Handler>` rather than an `unordered_map`?",
          question: { type: "choice", options: ["It is the only container that holds std::function", "A map keeps keys sorted, so handlers always fire in the order they joined", "unordered_map cannot erase", "It uses less memory"], answer: 1 },
          explanation: "Ids grow as handlers join, and a `std::map` walks keys in order. An `unordered_map` has no promised order, so the firing order could change.",
        },
      ],
    },

    // ───────────────────────── 11 ─────────────────────────
    {
      id: "cpp-engine-11-virtual",
      title: "Virtual functions: ask the object",
      minutes: 35,
      xp: 120,
      concepts: ["inheritance", "base and derived class", "static type", "virtual", "override", "dynamic dispatch", "vtable"],
      learn: md`### Many kinds of beacon, one list

The harbour has lighthouses, buoys and foghorns. The engine wants **one list of beacons** and one loop that asks each: "how do you signal?" It should not care which kind is which.

C++ lets one class build on another. A **derived class** is a new class that starts with everything an existing **base class** has and may add or change things. It models an "is a" relationship: a lighthouse *is a* beacon.

~~~cpp
class Beacon {
public:
    std::string name() const { return "beacon"; }
    std::string signal() const { return "steady glow"; }
};

class Lighthouse : public Beacon {
public:
    std::string name() const { return "lighthouse"; }
    std::string signal() const { return "sweeping beam"; }
};
~~~

(\`: public Beacon\` says "Lighthouse is built on Beacon".) Now the trap. A reference or pointer to the base can refer to a derived object, which is what makes "one list of beacons" possible:

~~~cpp
Lighthouse lighthouse;
const Beacon& asBeacon = lighthouse;
lighthouse.signal();    // "sweeping beam"
asBeacon.signal();      // "steady glow"   <- not what we wanted!
~~~

The compiler decides which function to call from the **static type**, the type written in the code. \`asBeacon\` is declared as a \`Beacon\`, so it picks \`Beacon::signal\`, even though the object behind it is a lighthouse.

### The fix: let the object answer

Mark the base function \`virtual\`. Now the choice is postponed until the program runs and made by looking at what the object really is, like calling out "report!" and letting each object answer in its own way.

~~~cpp
class Beacon {
public:
    std::string name() const { return "beacon"; }                 // not virtual, still decided by static type
    virtual std::string signal() const { return "steady glow"; }  // virtual: ask the object
};

class Lighthouse : public Beacon {
public:
    std::string name() const { return "lighthouse"; }
    std::string signal() const override { return "sweeping beam"; }
};
~~~

Now \`asBeacon.signal()\` gives \`"sweeping beam"\` while \`asBeacon.name()\` still gives \`"beacon"\`, because \`name\` was not virtual. That is **dynamic dispatch**: the call goes to the version belonging to the object's *dynamic* type (the real one).

\`override\` is a safety label. It says "I mean to replace a virtual function from the base". If you get the spelling or the \`const\` wrong the compiler stops you:

~~~text
main.cpp:3:50: error: 'std::string Buoy::signal()' marked 'override', but does not override
~~~

Without \`override\`, a mistyped function would silently become a *new* function and the base version would still run. Always write it.

### How it works: the vtable

Each class with virtual functions gets a hidden table, called a **vtable**, listing which version of each virtual function to run for that class. Every object of such a class carries one hidden pointer to its class's table. A virtual call does not jump straight to a function: it follows the object's hidden pointer to the table and takes the entry for \`signal\`.

~~~text
            vtable of Beacon      vtable of Lighthouse      vtable of Buoy
signal  ->  Beacon::signal        Lighthouse::signal        Buoy::signal
~~~

A non-virtual call skips all that and is resolved while compiling. The price of a virtual call is one extra hop through the table and a hidden pointer per object. For almost everything that is cheap.

### Using a list of different kinds

Pointers to the base can sit in one container:

~~~cpp
std::vector<const Beacon*> row = {&lighthouse, &buoy, &foghorn};
for (const Beacon* b : row) {
    std::cout << b->signal() << "\n";    // each prints its own signal
}
~~~

(\`->\` is "go to the object and then call", the same as \`(*b).\`.) The objects must stay alive while the pointers do: here they all live in \`main\`. Lesson 12 deals with objects the list should own.

### Common mistakes

- Forgetting \`virtual\` on the base function: the base version runs and you spend an hour wondering why.
- Forgetting \`override\` on the derived version: typos compile silently.
- Calling a virtual function on an object (not a pointer or reference) and expecting dispatch: it only helps through pointers and references.`,
      mission: md`Build the beacon family and ask the same three objects the same question in two different ways: directly, and through a pointer to the base class. The board's **Vtable** panel shows the table for each class, with the entry each call actually lands on, so the difference between a decided-while-compiling call and a decided-while-running call is visible.

Here \`name()\` is the non-virtual function (decided by the pointer's declared type) and \`signal()\` is the virtual one.`,
      tasks: [
        "Above main, write the Beacon base class (non-virtual name() returning \"beacon\", virtual signal() returning \"steady glow\") and three derived classes: Lighthouse (\"lighthouse\", \"sweeping beam\"), Buoy (\"buoy\", \"blinking red\"), Foghorn (\"foghorn\", \"two long blasts\"). Each overrides signal() with the override label and declares its own name()",
        "In main: Lighthouse lighthouse; Buoy buoy; Foghorn foghorn; Beacon plainBeacon; and std::vector<const Beacon*> row = {&lighthouse, &buoy, &foghorn};",
        "Fill three vectors: directNames from lighthouse.name(), buoy.name(), foghorn.name(); viaBaseNames from b->name() for each b in row; viaBaseSignals from b->signal() for each b in row",
        "Send scene(\"directNames\", directNames); scene(\"viaBaseNames\", viaBaseNames); scene(\"viaBaseSignals\", viaBaseSignals); and scene(\"plainSignal\", plainBeacon.signal());",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── lesson 11: write class Beacon and its three derived classes here, above main.
// name() is NOT virtual, signal() IS virtual and every derived signal() is marked override.
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 11: ask the same objects directly and through a Beacon pointer.
`,
      solutionAdd: cpp`class Beacon {
public:
    std::string name() const { return "beacon"; }
    virtual std::string signal() const { return "steady glow"; }
};

class Lighthouse : public Beacon {
public:
    std::string name() const { return "lighthouse"; }
    std::string signal() const override { return "sweeping beam"; }
};

class Buoy : public Beacon {
public:
    std::string name() const { return "buoy"; }
    std::string signal() const override { return "blinking red"; }
};

class Foghorn : public Beacon {
public:
    std::string name() const { return "foghorn"; }
    std::string signal() const override { return "two long blasts"; }
};
${MAIN_DIVIDER}
// Lesson 11: virtual functions.
Lighthouse lighthouse;
Buoy buoy;
Foghorn foghorn;
Beacon plainBeacon;
std::vector<const Beacon*> row = {&lighthouse, &buoy, &foghorn};
std::vector<std::string> directNames = {lighthouse.name(), buoy.name(), foghorn.name()};
std::vector<std::string> viaBaseNames;
std::vector<std::string> viaBaseSignals;
for (const Beacon* b : row) {
    viaBaseNames.push_back(b->name());
    viaBaseSignals.push_back(b->signal());
}
scene("directNames", directNames);
scene("viaBaseNames", viaBaseNames);
scene("viaBaseSignals", viaBaseSignals);
scene("plainSignal", plainBeacon.signal());`,
      explanation:
        "Calling name() directly on each object uses the object's own class (static type = real type), so you get lighthouse, buoy and foghorn. Through a const Beacon* the compiler only knows Beacon, and name() is not virtual, so every answer is beacon. signal() is virtual, so the call follows the object's hidden pointer to its class's vtable and lands on the right override: sweeping beam, blinking red, two long blasts. A plain Beacon has no override, so its signal() is the base one.",
      hints: [
        { id: "h1", title: "Virtual in the base", content: "Only the base declares virtual: virtual std::string signal() const { return \"steady glow\"; } The derived versions end with const override." },
        { id: "h2", title: "Two ways to ask", content: "lighthouse.name() is a direct call on a Lighthouse. b->name() through a const Beacon* is decided by the pointer's type. Compare the two lists." },
        { id: "h3", title: "The loop", content: "for (const Beacon* b : row) { viaBaseNames.push_back(b->name()); viaBaseSignals.push_back(b->signal()); } Declare both vectors before it." },
      ],
      tests: [
        {
          id: "t1",
          description: "Direct calls use each object's own class",
          assertionCode: js`
assertEqual(scene.directNames, ["lighthouse", "buoy", "foghorn"], "directNames");`,
        },
        {
          id: "t2",
          description: "Through a base pointer, name() is non-virtual and signal() is virtual",
          assertionCode: js`
assertEqual(scene.viaBaseNames, ["beacon", "beacon", "beacon"], "viaBaseNames (name() is not virtual: the pointer's declared type decides)");
assertEqual(scene.viaBaseSignals, ["sweeping beam", "blinking red", "two long blasts"], "viaBaseSignals (signal() is virtual: the real object decides)");`,
        },
        {
          id: "t3",
          description: "A plain Beacon uses the base version",
          assertionCode: js`
assertEqual(scene.plainSignal, "steady glow", "plainSignal");`,
        },
      ],
      unlocks: ["en-vtable"],
      checks: [
        {
          prompt: "`const Beacon& b = lighthouse; b.signal();` and `signal()` is NOT marked virtual in Beacon. Which version runs?",
          question: { type: "choice", options: ["Lighthouse::signal", "Beacon::signal", "Neither; it is a compile error", "Both, one after the other"], answer: 1 },
          explanation: "Without `virtual` the compiler picks from the declared (static) type, `Beacon`. Adding `virtual` makes the call follow the object's real type.",
        },
        {
          prompt: "What does the word `override` do?",
          question: { type: "choice", options: ["Makes the function virtual", "Tells the compiler to check that it really replaces a virtual function from the base", "Hides the base function", "Makes the function run faster"], answer: 1 },
          explanation: "It adds no behaviour; it is a promise the compiler checks. A mistyped signature becomes a compile error instead of a silent bug.",
        },
      ],
    },

    // ───────────────────────── 12 ─────────────────────────
    {
      id: "cpp-engine-12-abstract",
      title: "Abstract classes, final, and the slicing trap",
      minutes: 35,
      xp: 120,
      concepts: ["pure virtual function", "abstract class", "virtual destructor", "final", "slicing", "std::unique_ptr<Base>", "std::is_abstract_v"],
      learn: md`### Some questions have no sensible default

Lesson 11's \`Beacon\` had a default signal, "steady glow". But what is the default answer to "what is your role in the harbour?" for a *generic* station? There isn't one. Only a pier, a tower or a lighthouse can say.

A **pure virtual function** has no body in the base class: it is written \`= 0\`. A class with one is an **abstract class**: it exists only to be built on, and you cannot make an object of it.

~~~cpp
class Station {
public:
    virtual ~Station() { closingLog.push_back("Station closed"); }
    virtual std::string role() const = 0;      // pure virtual: every real station must answer
};
~~~

~~~cpp
Station s;     // does not compile
~~~

~~~text
main.cpp:3:21: error: cannot declare variable 's' to be of abstract type 'Station'
main.cpp:2:67: note:     'virtual std::string Station::role() const'
~~~

The note lists exactly which functions are still missing. A derived class must override every pure virtual function (or it is abstract too). This is a promise checked by the compiler: anything you can really create is guaranteed to have a \`role()\`.

### The virtual destructor rule

Look at the first line of \`Station\`: \`virtual ~Station()\`. A destructor is the function that runs when an object is destroyed (you met them in Provenance Lab). Suppose you own a derived object through a pointer to its base:

~~~cpp
std::unique_ptr<Station> p = std::make_unique<Pier>();
~~~

When \`p\` goes away it deletes the object *through the base type*. If the base destructor is **not** virtual, C++ only runs the base destructor, never \`Pier\`'s own, and the language calls this undefined behaviour (the pier's own cleanup, such as freeing its memory, silently does not happen). With a virtual destructor, deletion is dispatched like any virtual call: the derived destructor runs first, then the base one.

**Rule: any class meant to be used through a base pointer needs a virtual destructor.** (Lesson 11's \`Beacon\` objects all lived directly in \`main\` and were never deleted through a \`Beacon*\`, so they got away without one.)

The log of closing order shows the rule: for each station the *derived* destructor reports first, then the base one, and objects are destroyed in the reverse order of how they were made.

### final: closing the door

Mark a class \`final\` and nobody may derive from it; mark a virtual function \`final\` and no derived class may override it again. Use it when a class is complete and subclassing it would be a mistake. The compiler can also use it to skip the vtable lookup.

~~~cpp
class Pier final : public Station { /* ... */ };
~~~

### The slicing trap

Holding derived objects **by value** in a container of the base type copies only the base part. The derived part is sliced off:

~~~cpp
class Lamp {
public:
    virtual ~Lamp() = default;
    virtual std::string colour() const { return "white"; }
};
class RedLamp : public Lamp {
public:
    std::string colour() const override { return "red"; }
};

std::vector<Lamp> sliced;
sliced.push_back(RedLamp{});     // a RedLamp is copied INTO a Lamp-sized slot
sliced[0].colour();              // "white": the red part was cut off
~~~

Nothing warns you: the copy is a perfectly valid \`Lamp\`. To keep the real objects, hold them **by pointer**; \`std::unique_ptr<Lamp>\` also gives them an owner who deletes them correctly:

~~~cpp
std::vector<std::unique_ptr<Lamp>> kept;
kept.push_back(std::make_unique<RedLamp>());
kept[0]->colour();               // "red"
~~~

Abstract classes prevent slicing outright, since you cannot even declare a by-value \`Station\`.

### Common mistakes

- A base class meant for inheritance with a non-virtual destructor.
- Passing a polymorphic object **by value** to a function taking the base type (another slice).
- Forgetting to implement every pure virtual function: the derived class is then abstract and cannot be created.
- Marking the destructor \`override\` but forgetting \`virtual\` in the base. Put \`virtual ~Base()\` in the base and let the derived destructors follow.`,
      mission: md`Time to give the harbour's buildings an official register. A \`Station\` is an abstract idea (nobody can build a generic one): real ones are a pier and a tower. A registry will own them through base pointers, so the destructor must be virtual, and you will watch the closing order. You will also catch the slicing bug: a row of red and white lamps stored by value loses its red.

When this passes, the **Hierarchy** panel draws Station above Pier and Tower with abstract and final marks, and the slicing comparison below.`,
      tasks: [
        "Above main, add inline std::vector<std::string> closingLog; and the abstract class Station: virtual destructor pushing \"Station closed\", pure virtual role() const",
        "Add class Pier final : public Station (role \"pier\", destructor pushing \"Pier closed\" with override) and class Tower : public Station (role \"tower\", destructor pushing \"Tower closed\")",
        "Add class Lamp (virtual destructor = default, virtual colour() returning \"white\") and class RedLamp : public Lamp (colour() override returning \"red\")",
        "In main, open a block { } holding std::unique_ptr<Station> pier = std::make_unique<Pier>(); then tower the same way; build std::vector<std::string> roles = {pier->role(), tower->role()}; and send scene(\"roles\", roles); inside the block. The block's closing brace destroys them",
        "After the block send scene(\"closingOrder\", closingLog); scene(\"abstractness\", std::map<std::string, bool>{{\"Station\", std::is_abstract_v<Station>}, {\"Pier\", std::is_abstract_v<Pier>}, {\"Tower\", std::is_abstract_v<Tower>}}); and scene(\"pierIsFinal\", std::is_final_v<Pier>);",
        "Slicing demo: std::vector<Lamp> sliced; push_back RedLamp{} then Lamp{}; std::vector<std::unique_ptr<Lamp>> kept; push make_unique<RedLamp>() then make_unique<Lamp>(). Collect each colour() into slicedColours and keptColours and send both with scene(...)",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── lesson 12: closingLog, Station, Pier, Tower, Lamp and RedLamp go here, above main.
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 12: the owning block, the closing order and the slicing demo.
// The stations die at the closing brace of their block: send the roles INSIDE it, closingLog AFTER it.
`,
      solutionAdd: cpp`#include <type_traits>

inline std::vector<std::string> closingLog;

class Station {
public:
    virtual ~Station() { closingLog.push_back("Station closed"); }
    virtual std::string role() const = 0;
};

class Pier final : public Station {
public:
    ~Pier() override { closingLog.push_back("Pier closed"); }
    std::string role() const override { return "pier"; }
};

class Tower : public Station {
public:
    ~Tower() override { closingLog.push_back("Tower closed"); }
    std::string role() const override { return "tower"; }
};

class Lamp {
public:
    virtual ~Lamp() = default;
    virtual std::string colour() const { return "white"; }
};

class RedLamp : public Lamp {
public:
    std::string colour() const override { return "red"; }
};
${MAIN_DIVIDER}
// Lesson 12: abstract classes, virtual destructors, slicing.
{
    std::unique_ptr<Station> pier = std::make_unique<Pier>();
    std::unique_ptr<Station> tower = std::make_unique<Tower>();
    std::vector<std::string> roles = {pier->role(), tower->role()};
    scene("roles", roles);
}  // tower is destroyed first, then pier
scene("closingOrder", closingLog);
scene("abstractness", std::map<std::string, bool>{{"Station", std::is_abstract_v<Station>}, {"Pier", std::is_abstract_v<Pier>}, {"Tower", std::is_abstract_v<Tower>}});
scene("pierIsFinal", std::is_final_v<Pier>);

std::vector<Lamp> sliced;
sliced.push_back(RedLamp{});
sliced.push_back(Lamp{});
std::vector<std::unique_ptr<Lamp>> kept;
kept.push_back(std::make_unique<RedLamp>());
kept.push_back(std::make_unique<Lamp>());
std::vector<std::string> slicedColours;
for (const Lamp& lamp : sliced) slicedColours.push_back(lamp.colour());
std::vector<std::string> keptColours;
for (const auto& lamp : kept) keptColours.push_back(lamp->colour());
scene("slicedColours", slicedColours);
scene("keptColours", keptColours);`,
      explanation:
        "Station has a pure virtual role(), so it is abstract and only Pier and Tower can be created; Pier is also final. Because Station's destructor is virtual, destroying a unique_ptr<Station> runs the derived destructor first and the base one second, and the objects are destroyed in reverse order, so the log reads Tower closed, Station closed, Pier closed, Station closed. In the slicing demo, push_back(RedLamp{}) into a vector<Lamp> copies only the Lamp part, so the colour is white; the vector of unique_ptr keeps the real RedLamp.",
      hints: [
        { id: "h1", title: "Station", content: "class Station { public: virtual ~Station() { closingLog.push_back(\"Station closed\"); } virtual std::string role() const = 0; }; The = 0 makes it abstract. Derived destructors use override." },
        { id: "h2", title: "The block", content: "Put the two unique_ptrs and the roles scene inside { ... }. Send closingLog after the closing brace. The order is reverse of creation: tower first, then pier." },
        { id: "h3", title: "Slicing", content: "std::vector<Lamp> sliced; sliced.push_back(RedLamp{}); copies only the Lamp part. std::vector<std::unique_ptr<Lamp>> kept; kept.push_back(std::make_unique<RedLamp>()); keeps the whole object." },
      ],
      tests: [
        {
          id: "t1",
          description: "The stations answered through their base pointers",
          assertionCode: js`
assertEqual(scene.roles, ["pier", "tower"], "roles");`,
        },
        {
          id: "t2",
          description: "Destructors ran derived-then-base, in reverse order of creation",
          assertionCode: js`
assertEqual(scene.closingOrder, ["Tower closed", "Station closed", "Pier closed", "Station closed"], "closingOrder");`,
        },
        {
          id: "t3",
          description: "Station is abstract, Pier is final",
          assertionCode: js`
assertEqual(scene.abstractness, { Station: true, Pier: false, Tower: false }, "abstractness");
assertEqual(scene.pierIsFinal, true, "pierIsFinal");`,
        },
        {
          id: "t4",
          description: "Storing by value sliced the red lamp; storing by pointer did not",
          assertionCode: js`
assertEqual(scene.slicedColours, ["white", "white"], "slicedColours (the red part was cut off by the copy)");
assertEqual(scene.keptColours, ["red", "white"], "keptColours");`,
        },
      ],
      unlocks: ["en-hierarchy"],
      checks: [
        {
          prompt: "What makes a class abstract?",
          question: { type: "choice", options: ["It has a private constructor", "It has at least one pure virtual function (= 0)", "It is declared final", "It has no member variables"], answer: 1 },
          explanation: "A pure virtual function has no body in the base. Until every one is overridden, no object of the class can be created.",
        },
        {
          prompt: "`std::vector<Lamp> v; v.push_back(RedLamp{});` What is stored?",
          question: { type: "choice", options: ["A full RedLamp", "Only the Lamp part of it (a sliced copy)", "A pointer to the RedLamp", "Nothing; it does not compile"], answer: 1 },
          explanation: "The vector's slots are the size of a `Lamp`, so the copy keeps just that part. Hold polymorphic objects by pointer to keep them whole.",
        },
      ],
    },
  ],
};
