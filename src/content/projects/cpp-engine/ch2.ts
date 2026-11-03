import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { cpp, js, md } from "./util.ts";

/**
 * Chapter 2: The harbour stores. The standard containers and the iterators that walk them, associative containers,
 * algorithms that work on iterator ranges, and lambdas.
 */

export const chapter2: Chapter = {
  id: "harbour-stores",
  title: "The harbour stores",
  blurb: "Pick the right container for the job, walk it with iterators, let the standard algorithms do the heavy lifting, and write small throwaway functions with lambdas.",
  lessons: [
    // ───────────────────────── 5 ─────────────────────────
    {
      id: "cpp-engine-5-containers",
      title: "Queues, rows and iterators",
      minutes: 30,
      xp: 100,
      concepts: ["std::vector", "std::deque", "iterator", "begin() / end()", "std::distance", "iterator category", "random access"],
      learn: md`### Two kinds of waiting line

Ships queue to enter Lantern Bay. A queue where new boats join at the back and the next one to dock leaves from the front is a **deque** (say "deck", short for *double-ended queue*): you can add and remove at **both** ends cheaply.

~~~cpp
#include <deque>

std::deque<std::string> berthQueue;
berthQueue.push_back("Osprey");       // joins the back
berthQueue.push_back("Tern");
berthQueue.push_front("Pilot Boat");  // jumps the queue: joins the FRONT
// now: Pilot Boat, Osprey, Tern
std::string next = berthQueue.front();   // look at the front: "Pilot Boat"
berthQueue.pop_front();                  // remove it: Osprey, Tern
~~~

A \`std::vector\` (which you met in Reactor Core) is the same idea with only one open end: \`push_back\` is cheap, but adding at the front means shuffling everything along. Rule of thumb: **vector by default; deque when you also need to add or remove at the front.**

### Walking a container without knowing its shape

To print a vector you may write \`for (size_t i = 0; i < tides.size(); ++i) ... tides[i]\`. That works because a vector is a row you can index. But not every container can be indexed, and you do not want a different loop for each. The universal tool is the **iterator**: an object that points at one element of a container, like a finger on a line of text.

- \`tides.begin()\` is a finger on the **first** element.
- \`tides.end()\` is a finger just **past the last** element (it points at nothing real; it is only the "stop here" mark, like the one-past-the-end pointer from Provenance Lab).
- \`*it\` reads the element the finger is on. \`++it\` moves the finger to the next element.

~~~cpp
std::vector<int> tides = {210, 340, 515, 480, 260};
for (auto it = tides.begin(); it != tides.end(); ++it) {
    std::cout << *it << " ";      // 210 340 515 480 260
}
~~~

\`auto\` lets the compiler write the long type of \`it\` for you. The range-for loop (\`for (int t : tides)\`) is just this loop written by the compiler.

### Not all fingers are equally clever: iterator categories

The **iterator category** says what a finger can do. The three you need:

| Category | What you can do | Example containers |
| --- | --- | --- |
| forward | move forward with \`++\` | singly linked lists |
| bidirectional | forward and back (\`++\`, \`--\`) | \`std::list\`, \`std::map\`, \`std::set\` |
| random access | all of that, plus jump: \`it + 3\`, \`it2 - it1\`, \`it[2]\` | \`std::vector\`, \`std::deque\`, arrays |

A vector's elements sit side by side, so the finger can jump straight to the fourth element: \`*(tides.begin() + 3)\` is \`480\`. A linked list's elements are scattered; the finger can only follow links, one hop at a time, so there is no \`+ 3\` for it. Lesson 7 shows why this matters: some algorithms ask for a clever finger and refuse a plain one.

Two small tools for counting along a range:

~~~cpp
#include <iterator>
auto count = std::distance(tides.begin(), tides.end());   // 5: how many steps from first to last
auto third = std::next(tides.begin(), 2);                 // a finger two steps along
~~~

### Common mistakes

- Reading \`*tides.end()\`. The end finger points at nothing; reading it is undefined behaviour. Compare with \`end()\`, never read through it.
- Using \`!=\` against the wrong container's \`end()\`.
- Changing a vector (adding or removing elements) while a finger is on it: the finger may point at memory that moved. Finish the loop first.
- Calling \`front()\` or \`pop_front()\` on an empty deque.`,
      mission: md`Harbour traffic first: a queue of ships waiting to berth, and the tide gauge readings for the day. Ships are taken from the front of a deque; the pilot boat is an emergency vessel that jumps to the front. The gauge readings sit in a vector, and the harbour master wants the highest tide, found by walking it with iterators.

Build both, then send the results to the board. The **Berth queue** panel draws the line of ships and the tide row with its peak marked.`,
      tasks: [
        "Declare std::deque<std::string> berthQueue; and push_back \"Marguerite\", \"Osprey\" and \"Tern\", then push_front \"Pilot Boat\"",
        "Send scene(\"queueNow\", berthQueue); then keep the front ship in std::string served = berthQueue.front(); and pop_front(). Send scene(\"served\", served); and scene(\"queueLeft\", berthQueue);",
        "Declare std::vector<int> tides = {210, 340, 515, 480, 260}; and find the highest with an iterator loop: auto peakAt = tides.begin(); then for (auto it = tides.begin(); it != tides.end(); ++it) { if (*it > *peakAt) peakAt = it; }",
        "Send scene(\"peakValue\", *peakAt); scene(\"peakIndex\", std::distance(tides.begin(), peakAt)); scene(\"tideCount\", std::distance(tides.begin(), tides.end())); and scene(\"jumped\", *(tides.begin() + 3));",
      ],
      starterAdd: cpp`${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 5: the berth queue and the tide row
// #include <deque> goes at the top of your file (above main); the other headers are already there.
//
// deque: push_back, push_front, front, pop_front.   iterators: begin(), end(), *it, ++it, std::distance.
`,
      solutionAdd: cpp`#include <deque>
#include <iterator>
${MAIN_DIVIDER}
// Lesson 5: containers and iterators.
std::deque<std::string> berthQueue;
berthQueue.push_back("Marguerite");
berthQueue.push_back("Osprey");
berthQueue.push_back("Tern");
berthQueue.push_front("Pilot Boat");  // the emergency vessel jumps to the front
scene("queueNow", berthQueue);
std::string served = berthQueue.front();
berthQueue.pop_front();
scene("served", served);
scene("queueLeft", berthQueue);

std::vector<int> tides = {210, 340, 515, 480, 260};
auto peakAt = tides.begin();
for (auto it = tides.begin(); it != tides.end(); ++it) {
    if (*it > *peakAt) peakAt = it;
}
scene("peakValue", *peakAt);
scene("peakIndex", std::distance(tides.begin(), peakAt));
scene("tideCount", std::distance(tides.begin(), tides.end()));
scene("jumped", *(tides.begin() + 3));`,
      explanation:
        "push_front puts the pilot boat ahead of everyone, so the queue reads Pilot Boat, Marguerite, Osprey, Tern; front() and pop_front() serve it. The iterator loop keeps a finger (peakAt) on the biggest value seen so far, moving it whenever the current element is larger: 515, at distance 2 from begin(). std::distance(begin, end) counts the 5 elements, and because a vector is random access the finger can jump three places at once to 480.",
      hints: [
        { id: "h1", title: "The queue", content: "berthQueue.push_back(\"Marguerite\"); (and Osprey, Tern), then berthQueue.push_front(\"Pilot Boat\"); Take the front with std::string served = berthQueue.front(); then berthQueue.pop_front();" },
        { id: "h2", title: "The loop", content: "auto peakAt = tides.begin(); for (auto it = tides.begin(); it != tides.end(); ++it) { if (*it > *peakAt) peakAt = it; } The star reads the element a finger is on." },
        { id: "h3", title: "Counting and jumping", content: "std::distance(tides.begin(), peakAt) counts steps from the start to the peak (2). *(tides.begin() + 3) jumps three elements along and reads that element (480)." },
      ],
      tests: [
        {
          id: "t1",
          description: "The pilot boat jumped the queue and was served first",
          assertionCode: js`
assertEqual(scene.queueNow, ["Pilot Boat", "Marguerite", "Osprey", "Tern"], 'queueNow (push_front puts "Pilot Boat" first)');
assertEqual(scene.served, "Pilot Boat", "served (the ship at the front)");
assertEqual(scene.queueLeft, ["Marguerite", "Osprey", "Tern"], "queueLeft (after pop_front)");`,
        },
        {
          id: "t2",
          description: "The iterator loop found the peak tide",
          assertionCode: js`
assertEqual(scene.peakValue, 515, "peakValue");
assertEqual(scene.peakIndex, 2, "peakIndex (steps from begin() to the peak)");`,
        },
        {
          id: "t3",
          description: "std::distance and a random-access jump",
          assertionCode: js`
assertEqual(scene.tideCount, 5, "tideCount (std::distance from begin() to end())");
assertEqual(scene.jumped, 480, "jumped (the element three places after begin())");`,
        },
      ],
      unlocks: ["en-queue"],
      checks: [
        {
          prompt: "`tides.end()` is…",
          question: { type: "choice", options: ["a finger on the last element", "a finger just past the last element", "the number of elements", "the same as begin() for an empty vector only"], answer: 1 },
          explanation: "`end()` is the \"stop here\" mark one step past the final element. You compare against it but never read through it. For an empty container `begin()` and `end()` are equal.",
        },
        {
          prompt: "Which iterator category lets you write `it + 3`?",
          question: { type: "choice", options: ["forward", "bidirectional", "random access"], answer: 2 },
          explanation: "Only random-access iterators can jump several places at once. Vector and deque have them; a linked list does not.",
        },
      ],
    },

    // ───────────────────────── 6 ─────────────────────────
    {
      id: "cpp-engine-6-lookup",
      title: "Looking things up: map, unordered_map and set",
      minutes: 30,
      xp: 100,
      concepts: ["std::map", "std::unordered_map", "std::set", "operator[] inserts", "contains", "structured bindings", "ordering"],
      learn: md`### A vector answers "what is at position 3?". A map answers "what goes with this name?"

The harbour ledger records tons of cargo per port. You could keep two vectors (names and tons) and search for a name each time, but a **map** stores *pairs* of a **key** and a **value** and finds the value for a key directly.

~~~cpp
#include <map>

std::map<std::string, int> tonsByPort;      // key: port name, value: tons
tonsByPort["Wharf"] += 40;
tonsByPort["Quay"]  += 25;
tonsByPort["Wharf"] += 15;                  // the key already exists: its value is now 55
~~~

A \`std::map\` keeps its keys **sorted** (here alphabetically: Quay, Wharf), so walking it always goes in order. Each element is a key-value pair, and you can unpack it with a **structured binding** in a range-for:

~~~cpp
for (const auto& [port, tons] : tonsByPort) {
    std::cout << port << ": " << tons << "\n";      // Quay: 25   then   Wharf: 55
}
~~~

### The sneaky operator[]

\`tonsByPort["Mole"]\` looks harmless, but if "Mole" is not there it **creates** it, with the value \`0\`. Just *reading* with \`[]\` can grow the map:

~~~cpp
int mole = tonsByPort["Mole"];     // size goes from 2 to 3, "Mole" now exists with 0 tons
~~~

When you only want to *ask*, use a function that does not insert:

~~~cpp
tonsByPort.contains("Ferry");      // true or false, changes nothing   (C++20)
auto found = tonsByPort.find("Ferry");           // an iterator
if (found != tonsByPort.end()) { /* found->second is the value */ }
~~~

\`find\` returns an iterator (lesson 5): the pair's key is \`found->first\`, its value \`found->second\`, and \`end()\` means "not there". \`at("Ferry")\` returns the value but throws an exception when missing.

### unordered_map: faster, but no order

\`std::unordered_map\` has the same operations but stores entries by *hashing* the key (turning it into a number that points straight at a storage slot). On average finds are faster, and the price is that the **iteration order is unspecified**: it can differ between compilers or even runs. So never write code that depends on the order of an \`unordered_map\`.

~~~cpp
#include <unordered_map>
std::unordered_map<std::string, int> lampHours;
lampHours["north"] += 120;
~~~

Choose \`std::map\` when you need sorted order or range queries; \`std::unordered_map\` when you only look things up by key.

### set: a bag with no duplicates

A \`std::set\` is a map without values: it only remembers *which* keys exist, each at most once, sorted. Inserting something already there does nothing.

~~~cpp
#include <set>
std::set<std::string> visitors;
visitors.insert("Osprey");
visitors.insert("Tern");
visitors.insert("Osprey");     // already there, ignored
// visitors.size() is 2
~~~

### Common mistakes

- Using \`[]\` to check existence: it adds the key. Use \`contains\` or \`find\`.
- Printing an \`unordered_map\` and expecting the same order as you inserted. There is none.
- Modifying a key of an element: keys are fixed. Erase and insert instead.
- Forgetting that \`map["x"]\` on a \`const\` map does not compile (it cannot insert).`,
      mission: md`The harbour ledger needs three small books: tons landed per port (sorted, so the report reads in order), how many hours each lamp has burned (lookup only), and the names of ships that visited today, each counted once.

Build all three, show that a careless \`[]\` read grows the ledger while \`contains\` does not, and send the results to the board. The **Ledger** panel draws the books.`,
      tasks: [
        "Declare std::map<std::string, int> tonsByPort; and add: tonsByPort[\"Wharf\"] += 40; tonsByPort[\"Quay\"] += 25; tonsByPort[\"Wharf\"] += 15; tonsByPort[\"Dock\"] += 8;",
        "Walk the map with for (const auto& [port, tons] : tonsByPort) and collect the port names, in order, into std::vector<std::string> portOrder. Send scene(\"tonsByPort\", tonsByPort); scene(\"portOrder\", portOrder);",
        "Record scene(\"sizeBefore\", tonsByPort.size()); then read int moleTons = tonsByPort[\"Mole\"]; and send scene(\"sizeAfter\", tonsByPort.size()); and scene(\"hasFerry\", tonsByPort.contains(\"Ferry\"));",
        "Declare std::unordered_map<std::string, int> lampHours; with lampHours[\"north\"] += 120; lampHours[\"south\"] += 95; lampHours[\"north\"] += 30; and send scene(\"lampHours\", lampHours); plus scene(\"lampTotal\", lampTotal) where lampTotal is the sum of the values (loop with a structured binding; the order does not matter)",
        "Declare std::set<std::string> visitors; and insert \"Osprey\", \"Tern\", \"Osprey\", \"Marguerite\", \"Tern\". Send scene(\"uniqueVisitors\", visitors); and scene(\"visitorCount\", visitors.size());",
      ],
      starterAdd: cpp`${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 6: the ledger, the lamp hours and the visitors
// std::map keeps keys sorted. [] adds a missing key. contains() and find() only ask.
`,
      solutionAdd: cpp`#include <map>
#include <set>
#include <unordered_map>
${MAIN_DIVIDER}
// Lesson 6: map, unordered_map and set.
std::map<std::string, int> tonsByPort;
tonsByPort["Wharf"] += 40;
tonsByPort["Quay"] += 25;
tonsByPort["Wharf"] += 15;
tonsByPort["Dock"] += 8;
std::vector<std::string> portOrder;
for (const auto& [port, tons] : tonsByPort) {
    portOrder.push_back(port);
}
scene("tonsByPort", tonsByPort);
scene("portOrder", portOrder);
scene("sizeBefore", tonsByPort.size());
int moleTons = tonsByPort["Mole"];  // careless: this creates "Mole" with 0 tons
scene("sizeAfter", tonsByPort.size());
scene("hasFerry", tonsByPort.contains("Ferry"));

std::unordered_map<std::string, int> lampHours;
lampHours["north"] += 120;
lampHours["south"] += 95;
lampHours["north"] += 30;
int lampTotal = 0;
for (const auto& [lamp, hours] : lampHours) {
    lampTotal += hours;
}
scene("lampHours", lampHours);
scene("lampTotal", lampTotal);

std::set<std::string> visitors;
visitors.insert("Osprey");
visitors.insert("Tern");
visitors.insert("Osprey");
visitors.insert("Marguerite");
visitors.insert("Tern");
scene("uniqueVisitors", visitors);
scene("visitorCount", visitors.size());`,
      explanation:
        "Wharf collects 40 + 15 = 55 because += on an existing key updates it, and the map keeps its keys sorted: Dock, Quay, Wharf. Reading tonsByPort[\"Mole\"] quietly inserted a fourth key with 0, which is why the size went from 3 to 4, while contains(\"Ferry\") answered false without touching anything. The unordered_map holds north = 150 and south = 95 and the order of its entries is not defined, so the total (245) is summed without caring. The set stored each of the three distinct ships once, sorted.",
      hints: [
        { id: "h1", title: "Building the map", content: "std::map<std::string, int> tonsByPort; then tonsByPort[\"Wharf\"] += 40; and so on. A missing key starts at 0, so += creates it. Wharf ends at 55." },
        { id: "h2", title: "Sizes", content: "Send tonsByPort.size() BEFORE the line int moleTons = tonsByPort[\"Mole\"]; and again after it: 3 then 4. contains(\"Ferry\") is false and adds nothing." },
        { id: "h3", title: "Structured bindings", content: "for (const auto& [lamp, hours] : lampHours) { lampTotal += hours; } unpacks each key-value pair into two names. Declare int lampTotal = 0; before the loop." },
      ],
      tests: [
        {
          id: "t1",
          description: "The ledger adds up per port and walks in sorted order",
          assertionCode: js`
assertEqual(scene.tonsByPort, { Dock: 8, Quay: 25, Wharf: 55 }, "tonsByPort");
assertEqual(scene.portOrder, ["Dock", "Quay", "Wharf"], "portOrder (std::map walks its keys in sorted order)");`,
        },
        {
          id: "t2",
          description: "A [] read grew the map, contains did not",
          assertionCode: js`
assertEqual(scene.sizeBefore, 3, "sizeBefore");
assertEqual(scene.sizeAfter, 4, "sizeAfter (reading tonsByPort[\"Mole\"] inserted a new key)");
assertEqual(scene.hasFerry, false, "hasFerry (contains does not insert)");`,
        },
        {
          id: "t3",
          description: "The lamp hours were totalled without relying on order",
          assertionCode: js`
assertEqual(scene.lampHours, { north: 150, south: 95 }, "lampHours");
assertEqual(scene.lampTotal, 245, "lampTotal");`,
        },
        {
          id: "t4",
          description: "The set remembered each visitor once, sorted",
          assertionCode: js`
assertEqual(scene.uniqueVisitors, ["Marguerite", "Osprey", "Tern"], "uniqueVisitors");
assertEqual(scene.visitorCount, 3, "visitorCount (five inserts, three distinct names)");`,
        },
      ],
      unlocks: ["en-ledger"],
      checks: [
        {
          prompt: "A map has 3 entries. You write `int x = tonsByPort[\"Nowhere\"];` for a key it does not hold. How many entries does it have now?",
          question: { type: "number", answer: 4 },
          explanation: "`operator[]` inserts the missing key with a default value (0 for an int). To ask without inserting, use `contains` or `find`.",
        },
        {
          prompt: "You need to print cargo per port in alphabetical order. Which container fits?",
          question: { type: "choice", options: ["std::unordered_map", "std::map", "both give alphabetical order", "neither; you must sort afterwards"], answer: 1 },
          explanation: "`std::map` keeps its keys sorted. An `unordered_map`'s order is unspecified.",
        },
      ],
    },

    // ───────────────────────── 7 ─────────────────────────
    {
      id: "cpp-engine-7-algorithms",
      title: "Algorithms: work on a range of iterators",
      minutes: 30,
      xp: 110,
      concepts: ["<algorithm>", "half-open range [first, last)", "std::sort", "std::find_if", "std::count_if", "std::accumulate", "predicate", "iterator requirements"],
      learn: md`### Don't write the loop again

You have written "find the biggest value" by hand. Nearly every program needs the same dozen loops: sort, count the ones that match, find the first one that matches, add them all up. The standard library already has these, tested and fast, in \`<algorithm>\` and \`<numeric>\`.

They all take the same two arguments first: **a range**, written as two iterators, \`first\` and \`last\`. The range includes \`first\` and stops *before* \`last\` (a **half-open range**, written [first, last)). That is why \`end()\` is "one past the last": \`(v.begin(), v.end())\` means the whole container, and \`(v.begin() + 1, v.end() - 1)\` means everything except the first and last.

~~~cpp
std::vector<int> lumens = {480, 520, 300, 610, 95, 505};

std::sort(lumens.begin(), lumens.end());           // 95 300 480 505 520 610
~~~

### Algorithms that ask a question

Some algorithms need your help to decide what counts as a match. You give them a **predicate**: a function that takes one element and answers \`true\` or \`false\`.

~~~cpp
bool isStrong(int lumens) { return lumens >= 500; }

long strong = std::count_if(lumens.begin(), lumens.end(), isStrong);      // 3: 505 520 610
auto firstStrong = std::find_if(lumens.begin(), lumens.end(), isStrong);  // an iterator to 505
~~~

\`find_if\` returns an iterator to the first match, or \`end()\` if none matched, so always compare it with \`end()\` before reading it. You can turn the iterator into a position with \`std::distance(lumens.begin(), firstStrong)\`.

Notice the predicate is passed *without parentheses*: \`isStrong\`, not \`isStrong(...)\`. You are handing over the function itself to be called later for each element.

### Adding things up

\`std::accumulate\` (in \`<numeric>\`) walks the range and adds each element to a starting value:

~~~cpp
#include <numeric>
int total = std::accumulate(lumens.begin(), lumens.end(), 0);    // 2510
~~~

The third argument is where the sum starts. Because the range is just two iterators, you can sum part of a container: \`std::accumulate(lumens.begin() + 1, lumens.end() - 1, 0)\`.

### Why some algorithms refuse some containers

\`std::sort\` rearranges elements by jumping around, so it needs **random-access** iterators (lesson 5). Give it a \`std::list\` and the compiler stops:

~~~text
In file included from /usr/include/c++/15/algorithm:63, ...
.../stl_algo.h: In instantiation of 'void std::__sort(...) [with _RandomAccessIterator = _List_iterator<int>; ...]':
main.cpp:3:50:   required from here
    3 | int main(){ std::list<int> l = {3,1,2}; std::sort(l.begin(), l.end()); }
.../stl_algo.h:1907:50: error: no match for 'operator-' (operand types are 'std::_List_iterator<int>' and 'std::_List_iterator<int>')
~~~

This is the long kind of template error. Don't read it top to bottom. **Skip the "In file included" lines, find the first line that mentions \`main.cpp\`** (the \`required from here\` line: that is your code that triggered it) **and the line with \`error:\`**. Together they say "your sort call on a list needs to subtract two list iterators, and list iterators cannot do that". The fix is to pick the right tool: a vector for \`std::sort\`, or the list's own \`l.sort()\` member.

### Common mistakes

- Passing a range backwards (\`last\` before \`first\`) or two iterators from different containers: undefined behaviour.
- Calling \`std::find_if\` and reading the result without checking against \`end()\`.
- \`std::accumulate(..., 0)\` on decimals: a start of \`0\` is an \`int\`, so the sum is truncated. Use \`0.0\`.
- Writing \`isStrong(500)\` where the algorithm wants \`isStrong\`.`,
      mission: md`The lamp rack at the Lantern Bay lighthouse holds six lamps with measured brightness. The engineer wants them in order, wants to know how many are strong enough to count as "lit" (500 lumens or more), where the first strong one sits, the total of all lumens, and the total of just the middle four.

Do it with algorithms, no hand-written loops. The **Algorithm bench** panel lights the rack, with the sorted order and the strong lamps marked.`,
      tasks: [
        "Above main, write bool isStrong(int lumens) returning true when lumens >= 500",
        "In main: std::vector<int> lumens = {480, 520, 300, 610, 95, 505}; then std::sort(lumens.begin(), lumens.end()); and send scene(\"sortedLumens\", lumens);",
        "long strongCount = std::count_if(lumens.begin(), lumens.end(), isStrong); and send it as scene(\"strongCount\", strongCount);",
        "auto firstStrong = std::find_if(lumens.begin(), lumens.end(), isStrong); and, only if firstStrong != lumens.end(), send scene(\"firstStrongValue\", *firstStrong); and scene(\"firstStrongIndex\", std::distance(lumens.begin(), firstStrong));",
        "Send scene(\"lumenSum\", std::accumulate(lumens.begin(), lumens.end(), 0)); and scene(\"middleSum\", std::accumulate(lumens.begin() + 1, lumens.end() - 1, 0));",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── lesson 7: write bool isStrong(int lumens) here, above main.
${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 7: the lamp rack
// sort, count_if, find_if and accumulate all take a range: (first, last). The predicate isStrong goes in WITHOUT parentheses.
`,
      solutionAdd: cpp`#include <algorithm>
#include <numeric>

bool isStrong(int lumens) {
    return lumens >= 500;
}
${MAIN_DIVIDER}
// Lesson 7: algorithms on iterator ranges.
std::vector<int> lumens = {480, 520, 300, 610, 95, 505};
std::sort(lumens.begin(), lumens.end());
scene("sortedLumens", lumens);
long strongCount = std::count_if(lumens.begin(), lumens.end(), isStrong);
scene("strongCount", strongCount);
auto firstStrong = std::find_if(lumens.begin(), lumens.end(), isStrong);
if (firstStrong != lumens.end()) {
    scene("firstStrongValue", *firstStrong);
    scene("firstStrongIndex", std::distance(lumens.begin(), firstStrong));
}
scene("lumenSum", std::accumulate(lumens.begin(), lumens.end(), 0));
scene("middleSum", std::accumulate(lumens.begin() + 1, lumens.end() - 1, 0));`,
      explanation:
        "Sorting leaves 95 300 480 505 520 610. count_if calls isStrong on each element: 505, 520 and 610 qualify, so 3. find_if stops at the first match, 505, which sits at distance 3 from begin(). accumulate adds everything (2510); moving the range's ends one step inward leaves only the middle four, 300 + 480 + 505 + 520 = 1805.",
      hints: [
        { id: "h1", title: "The predicate", content: "bool isStrong(int lumens) { return lumens >= 500; } above main. It answers true or false for one element." },
        { id: "h2", title: "Ranges", content: "Every algorithm starts with lumens.begin(), lumens.end(). sort needs only that; count_if and find_if take isStrong as a third argument (no parentheses)." },
        { id: "h3", title: "Middle four", content: "Shrink the range from both ends: std::accumulate(lumens.begin() + 1, lumens.end() - 1, 0). The sort comes first, so the middle four are 300, 480, 505 and 520." },
      ],
      tests: [
        {
          id: "t1",
          description: "The rack is sorted from dimmest to brightest",
          assertionCode: js`
assertEqual(scene.sortedLumens, [95, 300, 480, 505, 520, 610], "sortedLumens (std::sort over the whole vector)");`,
        },
        {
          id: "t2",
          description: "count_if and find_if used the isStrong predicate",
          assertionCode: js`
assertEqual(scene.strongCount, 3, "strongCount (lamps of 500 lumens or more)");
assertEqual(scene.firstStrongValue, 505, "firstStrongValue (the first strong lamp in sorted order)");
assertEqual(scene.firstStrongIndex, 3, "firstStrongIndex");`,
        },
        {
          id: "t3",
          description: "accumulate summed the whole range and a sub-range",
          assertionCode: js`
assertEqual(scene.lumenSum, 2510, "lumenSum");
assertEqual(scene.middleSum, 1805, "middleSum (the sorted rack without its first and last lamp)");`,
        },
      ],
      unlocks: ["en-algorithms"],
      checks: [
        {
          prompt: "A range is written `(first, last)`. Which element does it NOT include?",
          question: { type: "choice", options: ["the element at first", "the element at last", "both ends are skipped", "neither; both are included"], answer: 1 },
          explanation: "Ranges are half-open: they include `first` and stop before `last`. That is why `v.end()`, one past the final element, means the whole container.",
        },
        {
          prompt: "`std::find_if` finds nothing. What does it return?",
          question: { type: "choice", options: ["nullptr", "-1", "the end iterator you gave it", "it throws an exception"], answer: 2 },
          explanation: "It returns `last`, the second iterator of the range (usually `end()`). That is why you compare the result with `end()` before reading it.",
        },
      ],
    },

    // ───────────────────────── 8 ─────────────────────────
    {
      id: "cpp-engine-8-lambdas",
      title: "Lambdas: a function written on the spot",
      minutes: 30,
      xp: 110,
      concepts: ["lambda", "capture list", "capture by value", "capture by reference", "comparator", "std::for_each", "auto"],
      learn: md`### The problem with a named predicate

Last lesson you wrote \`bool isStrong(int lumens) { return lumens >= 500; }\` above \`main\` to use it once. Every one-off test needs a name, a place far from where it is used, and a number (500) hidden in it. A **lambda** is a function with no name, written right where you need it.

~~~cpp
long strong = std::count_if(lumens.begin(), lumens.end(),
                            [](int value) { return value >= 500; });
~~~

A lambda has up to three parts, in this order:

- \`[ ]\` the **capture list** (what outside variables it may use; empty here),
- \`( )\` the parameters, just like a function,
- \`{ }\` the body.

You can also store a lambda in a variable and call it like a function. Use \`auto\` for its type, because every lambda has its own unnamed type that you cannot write down:

~~~cpp
auto doubled = [](int value) { return value * 2; };
doubled(21);     // 42
~~~

### Captures: letting the lambda see your variables

A lambda body cannot see the variables around it unless you list them in \`[ ]\`. There are two ways:

- \`[limit]\` captures **by value**: the lambda keeps its own *copy*, made at the moment the lambda is created.
- \`[&limit]\` captures **by reference**: the lambda uses the *live* variable, so it sees later changes (and can make changes itself).

Follow this trace exactly:

~~~cpp
int limit = 500;
auto byValue = [limit](int value) { return value >= limit; };
auto byRef   = [&limit](int value) { return value >= limit; };
limit = 200;
byValue(300);   // false: it kept its copy, limit was 500 when it was made
byRef(300);     // true:  it sees the live limit, now 200
~~~

By value is safest (no surprises later). By reference is for lambdas that must change something, or that must always see the latest value, and they are only safe while the original variable is still alive.

### Lambdas as sorting rules

\`std::sort\` takes an optional third argument: a **comparator**, a function that answers "should \`a\` come before \`b\`?". A lambda is the natural way to write one:

~~~cpp
std::vector<std::string> fleet = {"Osprey", "Tern", "Marguerite"};
std::sort(fleet.begin(), fleet.end(),
          [](const std::string& a, const std::string& b) {
              if (a.size() != b.size()) return a.size() < b.size();   // shorter first
              return a < b;                                            // tie: alphabetical
          });
// Tern, Osprey, Marguerite
~~~

Always add a tie-break rule like the second \`return\`: \`std::sort\` does not promise to keep equal elements in their old order, so without one the result of ties could change from compiler to compiler. And \`const std::string&\` avoids copying each name.

### One more algorithm that loves lambdas

\`std::for_each(first, last, f)\` calls \`f\` on every element. Combined with a by-reference capture it can add things up:

~~~cpp
int sum = 0;
std::for_each(lumens.begin(), lumens.end(), [&sum](int value) { sum += value; });
~~~

### Common mistakes

- Forgetting the capture: "'limit' is not captured" is the compiler's way of saying the lambda cannot see it.
- Capturing by reference and then using the lambda after the variable is gone (it would read garbage).
- Writing a comparator that returns \`<=\`: it must be a strict "before", otherwise \`std::sort\` can misbehave.
- Expecting a by-value capture to follow later changes. It is a snapshot.`,
      mission: md`The engineer's rack code from last time works, but it was clumsy: a named function far from the test, and a 500 hard-wired inside. Rewrite the tests as lambdas on the spot. The fleet manager also wants the harbour's ships listed shortest name first, and wants to see for herself that a captured copy and a captured reference behave differently once the dim-line moves.

The **Lambda bench** panel shows both captures side by side.`,
      tasks: [
        "Count the lamps strictly below a dim line without a named function: int dimLine = 300; auto belowByValue = [dimLine](int value) { return value < dimLine; }; and long dimByValueNow = std::count_if(lumens.begin(), lumens.end(), belowByValue);",
        "Move the line: dimLine = 500; then make auto belowByRef = [&dimLine](int value) { return value < dimLine; }; Count with both: long dimByValue = std::count_if(..., belowByValue); long dimByReference = std::count_if(..., belowByRef);",
        "Send scene(\"dimByValueNow\", dimByValueNow); scene(\"dimByValue\", dimByValue); scene(\"dimByReference\", dimByReference);",
        "Declare std::vector<std::string> fleet = {\"Osprey\", \"Tern\", \"Marguerite\", \"Gull\", \"Pilot Boat\"}; and sort it with a comparator lambda: shorter names first, ties alphabetical. Send scene(\"fleetByLength\", fleet);",
        "Add up the lumens with std::for_each and a lambda that captures int brightTotal = 0 by reference. Send scene(\"brightTotal\", brightTotal);",
      ],
      starterAdd: cpp`${MAIN_DIVIDER}
// ─── ✏️ YOUR TURN ─── lesson 8: lambdas
// lumens is the sorted rack from lesson 7: 95 300 480 505 520 610. A lambda is  [capture](parameters) { body }.
`,
      solutionAdd: cpp`${MAIN_DIVIDER}
// Lesson 8: lambdas.
int dimLine = 300;
auto belowByValue = [dimLine](int value) { return value < dimLine; };
long dimByValueNow = std::count_if(lumens.begin(), lumens.end(), belowByValue);
dimLine = 500;
auto belowByRef = [&dimLine](int value) { return value < dimLine; };
long dimByValue = std::count_if(lumens.begin(), lumens.end(), belowByValue);
long dimByReference = std::count_if(lumens.begin(), lumens.end(), belowByRef);
scene("dimByValueNow", dimByValueNow);
scene("dimByValue", dimByValue);
scene("dimByReference", dimByReference);

std::vector<std::string> fleet = {"Osprey", "Tern", "Marguerite", "Gull", "Pilot Boat"};
std::sort(fleet.begin(), fleet.end(), [](const std::string& a, const std::string& b) {
    if (a.size() != b.size()) return a.size() < b.size();
    return a < b;
});
scene("fleetByLength", fleet);

int brightTotal = 0;
std::for_each(lumens.begin(), lumens.end(), [&brightTotal](int value) { brightTotal += value; });
scene("brightTotal", brightTotal);`,
      explanation:
        "belowByValue copied dimLine (300) when it was created, so it still counts lamps under 300 after the line moves to 500: only the 95, so 1. belowByRef reads the live variable, now 500, so 95, 300 and 480 qualify: 3. The comparator puts shorter names first and breaks ties alphabetically (Gull, Tern, Osprey, then Marguerite before Pilot Boat, both 10 letters). The for_each lambda captures brightTotal by reference so every call can add to the same variable.",
      hints: [
        { id: "h1", title: "Two captures", content: "[dimLine] copies the variable when the lambda is made; [&dimLine] refers to the original. Create belowByValue while dimLine is 300, then set dimLine = 500 and create belowByRef." },
        { id: "h2", title: "The comparator", content: "[](const std::string& a, const std::string& b) { if (a.size() != b.size()) return a.size() < b.size(); return a < b; } is the third argument to std::sort." },
        { id: "h3", title: "for_each", content: "std::for_each(lumens.begin(), lumens.end(), [&brightTotal](int value) { brightTotal += value; }); The & is what lets the lambda change brightTotal." },
      ],
      tests: [
        {
          id: "t1",
          description: "A by-value capture keeps its snapshot, a by-reference capture follows the variable",
          assertionCode: js`
assertEqual(scene.dimByValueNow, 1, "dimByValueNow (lamps below 300 while the line is 300)");
assertEqual(scene.dimByValue, 1, "dimByValue (the same lambda after the line moved: it still holds a copy of 300)");
assertEqual(scene.dimByReference, 3, "dimByReference (lamps below the live line, now 500)");`,
        },
        {
          id: "t2",
          description: "The comparator lambda sorted the fleet by name length, ties alphabetical",
          assertionCode: js`
assertEqual(scene.fleetByLength, ["Gull", "Tern", "Osprey", "Marguerite", "Pilot Boat"], "fleetByLength");`,
        },
        {
          id: "t3",
          description: "for_each added up the lumens through a reference capture",
          assertionCode: js`
assertEqual(scene.brightTotal, 2510, "brightTotal (all six lamps)");`,
        },
      ],
      unlocks: ["en-lambdas"],
      checks: [
        {
          prompt: "`int n = 1; auto f = [n]() { return n; }; n = 5;` What does `f()` return?",
          question: { type: "number", answer: 1 },
          explanation: "`[n]` captures by value: the lambda took a copy when it was created, so it still holds 1. With `[&n]` it would return 5.",
        },
        {
          prompt: "Why give `std::sort` a tie-break rule in the comparator?",
          question: { type: "choice", options: ["Because the compiler requires two return statements", "Because sort does not guarantee the order of equal elements", "Because lambdas cannot return bool directly", "It makes the sort faster"], answer: 1 },
          explanation: "`std::sort` is not stable: elements that compare equal may come out in any order. A tie-break makes the result the same everywhere.",
        },
      ],
    },
  ],
};
