import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { cpp, js, md } from "./util.ts";

/**
 * Chapter 3: Working with data. Strings, structs, maps and the standard algorithms.
 *
 * Every lesson here adds declarations (an #include, a function or a struct) above MAIN_DIVIDER and
 * statements below it; engine/compose.ts keeps them apart as the file grows.
 */

export const chapter3: Chapter = {
  id: "working-with-data",
  title: "Working with data",
  blurb: "Take text apart, group readings into structs, count with maps and let the standard algorithms do the heavy lifting.",
  lessons: [
    // ───────────────────────── 9 ─────────────────────────
    {
      id: "cpp-basics-9-strings",
      title: "Telemetry decoder: strings",
      minutes: 40,
      xp: 160,
      concepts: ["find", "substr", "std::string::npos", "std::to_string", "std::stoi / std::stod", "try / catch", "std::ostringstream"],
      learn: md`### Text in, numbers out

Instruments rarely send neat variables. They send **text**: \`T=412.5;P=2.4;S=RUN;R=24\`. To use it you must take the text apart, find the pieces and convert them to numbers, and cope with the packets that are damaged. That is what \`std::string\` is for.

### Finding things: \`find\`

\`s.find("P=")\` returns the **position** where the text first appears (counting from 0), or the special value \`std::string::npos\` when it is not there. Always compare against \`npos\`, never against \`-1\` (the position type is unsigned).

~~~cpp
std::string packet = "T=412.5;P=2.4;S=RUN";
std::size_t at = packet.find("P=");           // 8
if (packet.find("X=") == std::string::npos) {
    std::cout << "no X field\n";
}
std::size_t semi = packet.find(';', 9);       // search for a char, starting at position 9
~~~

### Cutting pieces: \`substr\`

\`s.substr(start, length)\` copies \`length\` characters starting at \`start\`. Leave out the length to take everything to the end. Note: the second number is a **length**, not an end position.

~~~cpp
packet.substr(2, 5);     // "412.5"   (start 2, length 5)
packet.substr(8);        // "P=2.4;S=RUN"  (to the end)
~~~

A start position beyond the end of the string throws \`std::out_of_range\`. A length that is too long is fine: you just get what is there.

### A field reader

Put the two together and you have a small, reusable decoder: find the key, step past \`key=\`, read up to the next \`;\`.

~~~cpp
std::string field(const std::string& packet, const std::string& key) {
    std::string marker = key + "=";
    std::size_t start = packet.find(marker);
    if (start == std::string::npos) {
        return "";                                  // key not present
    }
    start += marker.size();
    std::size_t end = packet.find(';', start);
    if (end == std::string::npos) {
        return packet.substr(start);                // last field: no ';' after it
    }
    return packet.substr(start, end - start);
}
~~~

### More string tools

- \`==\`, \`!=\`, \`<\` compare whole strings (alphabetical order by character code).
- \`s += "text"\` or \`s.append("text")\` adds to the end; \`s.insert(pos, "x")\`, \`s.erase(pos, len)\` and \`s.replace(pos, len, "x")\` edit in place.
- \`s.front()\`, \`s.back()\`, \`s.empty()\`, \`s.size()\` as before.
- Convert one character with \`std::toupper(c)\` (include \`<cctype>\`); loop over the string to convert all of it.

### Text to number: \`std::stoi\` and \`std::stod\`

~~~cpp
int rods = std::stoi("24");           // 24
double temp = std::stod("412.5");     // 412.5
~~~

They **throw an exception** if the text does not start with a number:

- \`std::invalid_argument\` for something like \`"abc"\` or an empty string,
- \`std::out_of_range\` for a number too big for the type.

An unhandled exception ends the program with *terminate called after throwing an instance of 'std::invalid_argument'*. So you wrap risky conversions in **try / catch** (lesson 15 covers it in depth):

~~~cpp
try {
    double temp = std::stod(text);
    std::cout << "got " << temp << "\n";
} catch (const std::exception&) {
    std::cout << "not a number\n";
}
~~~

Everything in the \`try\` block runs until something throws; then execution jumps to the \`catch\`. Catching \`const std::exception&\` catches both exception types above.

**Trailing junk is ignored.** \`std::stoi("24x")\` happily returns 24. If you care, pass a pointer for how many characters were used and compare:

~~~cpp
std::size_t used = 0;
int rods = std::stoi("24x", &used);     // rods = 24, used = 2
if (used != std::string("24x").size()) { /* there was junk */ }
~~~

### Number to text

\`std::to_string(24)\` gives \`"24"\`. For a \`double\` it always prints six decimals: \`std::to_string(412.5)\` is \`"412.500000"\`. For control over the format use a string stream (\`#include <sstream>\` and \`<iomanip>\`):

~~~cpp
std::string fixed1(double value) {
    std::ostringstream out;
    out << std::fixed << std::setprecision(1) << value;
    return out.str();
}
// fixed1(412.5) is "412.5", fixed1(8) is "8.0", fixed1(2.449) is "2.4"
~~~

An \`ostringstream\` works exactly like \`std::cout\`, but collects the text in a string instead of printing it. \`std::fixed\` and \`std::setprecision(1)\` mean "always show exactly one digit after the decimal point".

### Common mistakes

- Checking \`find\` against \`-1\` or \`0\` instead of \`std::string::npos\`.
- Treating the second argument of \`substr\` as an end position.
- Forgetting that \`stoi\` / \`stod\` can throw, so one bad packet crashes the whole program.
- Forgetting that \`std::to_string\` of a double has six decimals.
- Adding two literals: \`"T=" + "412"\` does not compile (one side must be a \`std::string\`).`,
      mission: md`Helios-1's sensors report as text packets like \`T=412.5;P=2.4;S=RUN;R=24\`. Some arrive damaged: a temperature reading of \`abc\`, a missing field, a rod count with junk after it. Your decoder must take a good packet apart, build a log line from it, and check a batch of packets without ever crashing.

When this lesson passes, the **Telemetry decoder** lights up, with the raw packet split into fields and the good/bad packet counts.`,
      tasks: [
        "In Part A add #include <sstream> and <iomanip>; write std::string field(const std::string& packet, const std::string& key) using find and substr, and std::string fixed1(double value) using an ostringstream with std::fixed and std::setprecision(1)",
        "Decode the packet T=412.5;P=2.4;S=RUN;R=24 into packetTemp and packetPressure (std::stod), packetState (text) and packetRods (std::stoi)",
        "Build logLine as [RUN] 412.5 C, 24 rods with + (use fixed1 for the temperature and std::to_string for the rods) and print it; also print what std::to_string(packetTemp) gives",
        "Check the five packets in the starter comment in a loop: a packet is good when T converts with std::stod and R converts with std::stoi with no junk left over; catch the exceptions and count goodPackets and badPackets",
        "Print Packets: 2 good, 3 bad and send packet, packetTemp, packetPressure, packetState, packetRods, goodPackets, badPackets and logLine to the board",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── Part A (above main): includes and two functions.
//   #include <iomanip>   and   #include <sstream>
//   std::string field(const std::string& packet, const std::string& key)   -> the text between "key=" and the next ';'
//   std::string fixed1(double value)                                       -> one decimal place, via std::ostringstream


${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ─── Part B (inside main): decode the packets.
// std::string packet = "T=412.5;P=2.4;S=RUN;R=24";
// packetTemp = std::stod(field(packet, "T"));   packetPressure = std::stod(field(packet, "P"));
// packetState = field(packet, "S");             packetRods = std::stoi(field(packet, "R"));
// logLine = "[" + packetState + "] " + fixed1(packetTemp) + " C, " + std::to_string(packetRods) + " rods"   -> [RUN] 412.5 C, 24 rods
// Print the logLine, then:   to_string gives 412.500000     (std::to_string(packetTemp))
// std::vector<std::string> packets = {
//     "T=412.5;P=2.4;S=RUN;R=24",  "T=abc;P=2.1;S=RUN;R=24",  "T=398.0;P=2.2;S=WARM;R=23",
//     "T=405.2;P=2.3;S=RUN;R=24x", "P=2.0;S=RUN;R=24" };
// for each raw packet: try { stod(field "T"); stoi(field "R", &used) and used must equal the text length } catch (const std::exception&) { bad }
// Print:  Packets: 2 good, 3 bad
// scene keys: packet, packetTemp, packetPressure, packetState, packetRods, goodPackets, badPackets, logLine
`,
      solutionAdd: cpp`#include <iomanip>
#include <sstream>

std::string field(const std::string& packet, const std::string& key) {
    std::string marker = key + "=";
    std::size_t start = packet.find(marker);
    if (start == std::string::npos) {
        return "";
    }
    start += marker.size();
    std::size_t end = packet.find(';', start);
    if (end == std::string::npos) {
        return packet.substr(start);
    }
    return packet.substr(start, end - start);
}

std::string fixed1(double value) {
    std::ostringstream out;
    out << std::fixed << std::setprecision(1) << value;
    return out.str();
}

${MAIN_DIVIDER}

// Lesson 9: the telemetry decoder.
std::string packet = "T=412.5;P=2.4;S=RUN;R=24";
double packetTemp = std::stod(field(packet, "T"));
double packetPressure = std::stod(field(packet, "P"));
std::string packetState = field(packet, "S");
int packetRods = std::stoi(field(packet, "R"));

std::string logLine = "[" + packetState + "] " + fixed1(packetTemp) + " C, " + std::to_string(packetRods) + " rods";
std::cout << logLine << "\n";
std::cout << "to_string gives " << std::to_string(packetTemp) << "\n";

std::vector<std::string> packets = {
    "T=412.5;P=2.4;S=RUN;R=24",
    "T=abc;P=2.1;S=RUN;R=24",
    "T=398.0;P=2.2;S=WARM;R=23",
    "T=405.2;P=2.3;S=RUN;R=24x",
    "P=2.0;S=RUN;R=24",
};
int goodPackets = 0;
int badPackets = 0;
for (const std::string& raw : packets) {
    try {
        std::stod(field(raw, "T"));
        std::string rodText = field(raw, "R");
        std::size_t used = 0;
        std::stoi(rodText, &used);
        if (used != rodText.size()) {
            badPackets++;       // junk after the number
            continue;
        }
        goodPackets++;
    } catch (const std::exception&) {
        badPackets++;
    }
}
std::cout << "Packets: " << goodPackets << " good, " << badPackets << " bad\n";

scene("packet", packet);
scene("packetTemp", packetTemp);
scene("packetPressure", packetPressure);
scene("packetState", packetState);
scene("packetRods", packetRods);
scene("goodPackets", goodPackets);
scene("badPackets", badPackets);
scene("logLine", logLine);`,
      explanation:
        "field() finds \"key=\", moves start past it, finds the next ';' and cuts exactly the characters in between (substr takes a length, so end - start). stod and stoi turn those pieces into numbers, and they throw when the text is not a number: \"abc\" and the empty text from the missing field both throw std::invalid_argument, which the catch block counts as a bad packet. stoi(\"24x\") does not throw, it stops at the x, so the used count is compared with the text length to catch the junk. std::to_string of a double always has six decimals, which is why the log line uses the fixed1 helper instead.",
      hints: [
        { id: "h1", title: "field()", content: "Find \"key=\" with packet.find(marker). If it is std::string::npos return \"\". Move start past the marker (start += marker.size()), find the next ';' from start and return packet.substr(start, end - start). The last field has no ';' after it, so handle npos there too." },
        { id: "h2", title: "fixed1 and the log line", content: "std::ostringstream out; out << std::fixed << std::setprecision(1) << value; return out.str(); Then logLine = \"[\" + packetState + \"] \" + fixed1(packetTemp) + \" C, \" + std::to_string(packetRods) + \" rods\"; (the first piece is a literal, so the second piece must be a std::string, and it is)." },
        { id: "h3", title: "Counting good and bad", content: "for (const std::string& raw : packets) { try { std::stod(field(raw, \"T\")); std::size_t used = 0; std::string rodText = field(raw, \"R\"); std::stoi(rodText, &used); if (used != rodText.size()) { badPackets++; continue; } goodPackets++; } catch (const std::exception&) { badPackets++; } }" },
      ],
      tests: [
        {
          id: "t1",
          description: "the first packet is decoded into numbers and text",
          assertionCode: js`
assertEqual(scene.packet, "T=412.5;P=2.4;S=RUN;R=24", "packet (the raw text)");
assertEqual(scene.packetTemp, 412.5, "packetTemp (std::stod of the text between T= and the next ;)");
assertEqual(scene.packetPressure, 2.4, "packetPressure (std::stod of the P field)");
assertEqual(scene.packetState, "RUN", "packetState (the S field, as text)");
assertEqual(scene.packetRods, 24, "packetRods (std::stoi of the R field, the last field has no ; after it)");`,
        },
        {
          id: "t2",
          description: "the log line is built with one decimal, and to_string is shown",
          assertionCode: js`
assertEqual(scene.logLine, "[RUN] 412.5 C, 24 rods", "logLine ([state] temperature with one decimal C, rods count rods)");
assert(lines.includes("[RUN] 412.5 C, 24 rods"), "Print the log line.");
assert(lines.includes("to_string gives 412.500000"), 'Print "to_string gives " followed by std::to_string(packetTemp), which has six decimals.');`,
        },
        {
          id: "t3",
          description: "damaged packets are counted instead of crashing the program",
          assertionCode: js`
assertEqual(scene.goodPackets, 2, "goodPackets (packets 1 and 3 are fine)");
assertEqual(scene.badPackets, 3, "badPackets (T=abc, R=24x with junk, and the packet with no T at all)");
assert(lines.includes("Packets: 2 good, 3 bad"), 'Print "Packets: 2 good, 3 bad".');`,
        },
      ],
      unlocks: ["rc-telemetry"],
      checks: [
        {
          prompt: "What does `\"T=412.5;P=2.4\".substr(2, 5)` return?",
          question: { type: "text", answer: ["412.5"] },
          explanation: "`substr(start, length)`: start at position 2 (the `4`) and take 5 characters: `412.5`. The second number is a length, not an end position.",
        },
        {
          prompt: "What does `std::stoi(\"24x\")` do?",
          question: {
            type: "choice",
            options: ["Returns 24 and ignores the x", "Throws std::invalid_argument", "Returns 0", "Fails to compile"],
            answer: 0,
          },
          explanation: "`stoi` reads as many digits as it can and stops at the first character that does not fit. It only throws when it cannot read any number at all, like `stoi(\"x24\")`. Pass a `&used` pointer if you need to know whether text was left over.",
        },
        {
          prompt: "Which comparison correctly tests whether `s.find(\"X=\")` found nothing?",
          question: {
            type: "choice",
            options: ["`== std::string::npos`", "`== -1`", "`== 0`", "`== \"\"`"],
            answer: 0,
          },
          explanation: "`find` returns the special value `std::string::npos` when the text is absent. Position 0 is a valid hit (the text is at the very start), and comparing an unsigned position with `-1` is fragile.",
        },
      ],
    },

    // ───────────────────────── 10 ─────────────────────────
    {
      id: "cpp-basics-10-structs",
      title: "Sensor bank: structs",
      minutes: 35,
      xp: 140,
      concepts: ["struct", "members", "aggregate initialization", "vector of structs", "const reference loops", "functions on structs"],
      learn: md`### Keeping related data together

So far a sensor would be three loose variables: \`sensorName\`, \`sensorValue\`, \`sensorLimit\`. With six sensors that is eighteen variables or three parallel vectors you must keep in step. A **struct** bundles the pieces into one type of your own.

~~~cpp
struct Sensor {
    std::string name;
    double value;
    double limit;
};      // <- the semicolon after the closing brace is required
~~~

\`Sensor\` is now a type, as real as \`int\`. A variable of that type has all three **members**, and you reach them with a dot:

~~~cpp
Sensor core = {"Core temp", 420.5, 650.0};    // members are filled in order
std::cout << core.name << " is at " << core.value << "\n";
core.value = 431.0;                             // change one member
~~~

The braces initialize the members in the order they are declared. If you give too many values you get *too many initializers*. If you give fewer, the rest become zero/empty. (C++20 also allows naming them, \`Sensor core = {.name = "Core temp", .value = 420.5, .limit = 650.0};\`, but the members must stay in declaration order.)

### Vectors of structs

A vector can hold any type, including your own:

~~~cpp
std::vector<Sensor> sensors = {
    {"Core temp", 420.5, 650.0},
    {"Pressure", 2.4, 5.0},
};
sensors.push_back({"Neutron flux", 7.2, 8.0});
std::cout << sensors[1].name << "\n";      // Pressure
~~~

### Looping without copying

Each \`Sensor\` contains a string, so copying one is not free. When you only read, take each element by **const reference** (you met \`const&\` in lesson 8):

~~~cpp
for (const Sensor& sensor : sensors) {
    std::cout << sensor.name << ": " << sensor.value << "\n";
}
~~~

To modify the elements, use a plain reference instead: \`for (Sensor& sensor : sensors) sensor.value += 1.0;\`. A plain \`for (Sensor sensor : sensors)\` would change only a copy.

### Functions that take structs

~~~cpp
double loadOf(const Sensor& sensor) {
    return sensor.value / sensor.limit;     // 0.65 means "65% of the limit"
}
~~~

Pass by \`const&\` when the function only reads, by \`&\` when it should change the caller's struct, and return a struct by value when you build a new one.

### Why not parallel vectors?

You *could* keep \`std::vector<std::string> names\`, \`std::vector<double> values\`, \`std::vector<double> limits\` and always use the same index. It works, but nothing stops you from sorting one and not the others or from deleting an element from just one of them. A vector of structs keeps each sensor's data glued together. We still send parallel vectors to the board, because the \`scene\` helper only understands plain numbers, strings, bools, vectors and maps.

(What does the compiler say if you try \`scene("sensors", sensors)\`? A very long message about *no matching function* or *no match for call*. In template-heavy code read the **first** error line and the line that mentions your own file.)

### Common mistakes

- Forgetting the \`;\` after the closing brace of a struct (*expected ';' after struct definition*).
- Using \`.\` before the struct is initialized, or writing a member name wrong (*'struct Sensor' has no member named 'vaule'*).
- Initializing the members in a different order than they were declared.
- Looping with \`for (Sensor s : sensors)\` and expecting to change the originals.
- Putting the struct below \`main\` when \`main\` uses it. Declare types before use, which is why the divider sends this part above \`main\`.`,
      mission: md`Helios-1 carries six sensors, each with a name, a current value and a safe limit. Today they are scattered across loose variables. Bundle them into a \`Sensor\` struct, store them in a vector and answer: how loaded is each one, which is closest to its limit, and how many are at 85% or more?

When this lesson passes, the **Sensor bank** lights up with a bar for each sensor.`,
      tasks: [
        "In Part A write struct Sensor with std::string name, double value and double limit, and double loadOf(const Sensor& sensor) returning value / limit",
        "Create std::vector<Sensor> sensors with the six sensors from the starter comment",
        "Loop with const Sensor& to fill the parallel vectors sensorNames, sensorValues and sensorLimits, count overCount (sensors with load 0.85 or more) and find closestName (the highest load)",
        "Print one line per sensor in the shape Core temp: 420.5 / 650 (65%), with the percent rounded to a whole number",
        "Send sensorNames, sensorValues, sensorLimits, overCount and closestName to the board",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── Part A (above main): the Sensor struct and a helper.
//   struct Sensor { std::string name; double value; double limit; };      (don't forget the final ;)
//   double loadOf(const Sensor& sensor)        -> value / limit


${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ─── Part B (inside main): the sensor bank.
// std::vector<Sensor> sensors = {
//     {"Core temp", 420.5, 650.0},  {"Coolant in", 288.0, 400.0},  {"Coolant out", 355.5, 450.0},
//     {"Pressure", 2.4, 5.0},       {"Neutron flux", 7.2, 8.0},    {"Vessel wall", 188.0, 300.0} };
// Loop: for (const Sensor& sensor : sensors) -> push into sensorNames / sensorValues / sensorLimits (three vectors),
//   overCount++ when loadOf(sensor) >= 0.85,  closestName = the sensor with the highest load,
//   print:  Core temp: 420.5 / 650 (65%)    (percent = static_cast<int>(std::round(load * 100.0)))
// scene keys: sensorNames, sensorValues, sensorLimits, overCount, closestName
`,
      solutionAdd: cpp`struct Sensor {
    std::string name;
    double value;
    double limit;
};

double loadOf(const Sensor& sensor) {
    return sensor.value / sensor.limit;
}

${MAIN_DIVIDER}

// Lesson 10: the sensor bank.
std::vector<Sensor> sensors = {
    {"Core temp", 420.5, 650.0},
    {"Coolant in", 288.0, 400.0},
    {"Coolant out", 355.5, 450.0},
    {"Pressure", 2.4, 5.0},
    {"Neutron flux", 7.2, 8.0},
    {"Vessel wall", 188.0, 300.0},
};

std::vector<std::string> sensorNames;
std::vector<double> sensorValues;
std::vector<double> sensorLimits;
int overCount = 0;
std::string closestName;
double closestLoad = 0.0;
for (const Sensor& sensor : sensors) {
    sensorNames.push_back(sensor.name);
    sensorValues.push_back(sensor.value);
    sensorLimits.push_back(sensor.limit);
    double load = loadOf(sensor);
    if (load >= 0.85) {
        overCount++;
    }
    if (load > closestLoad) {
        closestLoad = load;
        closestName = sensor.name;
    }
    int percent = static_cast<int>(std::round(load * 100.0));
    std::cout << sensor.name << ": " << sensor.value << " / " << sensor.limit << " (" << percent << "%)\n";
}

scene("sensorNames", sensorNames);
scene("sensorValues", sensorValues);
scene("sensorLimits", sensorLimits);
scene("overCount", overCount);
scene("closestName", closestName);`,
      explanation:
        "The struct groups name, value and limit into one type, so a vector<Sensor> keeps each sensor's data together. loadOf() takes a const reference so the sensor is neither copied nor changed. The range-for with const Sensor& reads every element without copying; inside it the same load value feeds the percent, the over-85% count and the search for the highest load (a running maximum: remember the best load and its name so far). The three parallel vectors are only for the board, because scene() understands vectors of plain values.",
      hints: [
        { id: "h1", title: "The struct", content: "struct Sensor { std::string name; double value; double limit; }; with a semicolon after the closing brace, in Part A above the divider. Then double loadOf(const Sensor& sensor) { return sensor.value / sensor.limit; }" },
        { id: "h2", title: "Looping", content: "for (const Sensor& sensor : sensors) { sensorNames.push_back(sensor.name); ... } Inside the loop compute double load = loadOf(sensor); and update overCount and the best load/name with if statements." },
        { id: "h3", title: "The printed line", content: "int percent = static_cast<int>(std::round(load * 100.0)); std::cout << sensor.name << \": \" << sensor.value << \" / \" << sensor.limit << \" (\" << percent << \"%)\\n\"; cout prints 650.0 as 650 on its own." },
      ],
      tests: [
        {
          id: "t1",
          description: "the sensors are sent as parallel vectors",
          assertionCode: js`
assertEqual(JSON.stringify(scene.sensorNames), '["Core temp","Coolant in","Coolant out","Pressure","Neutron flux","Vessel wall"]', "sensorNames (push sensor.name for every sensor, in order)");
assertEqual(JSON.stringify(scene.sensorValues), "[420.5,288,355.5,2.4,7.2,188]", "sensorValues");
assertEqual(JSON.stringify(scene.sensorLimits), "[650,400,450,5,8,300]", "sensorLimits");`,
        },
        {
          id: "t2",
          description: "overCount and closestName come from the load of each sensor",
          assertionCode: js`
assertEqual(scene.overCount, 1, "overCount (only Neutron flux is at 85% or more of its limit)");
assertEqual(scene.closestName, "Neutron flux", "closestName (the sensor with the highest value / limit)");`,
        },
        {
          id: "t3",
          description: "one summary line per sensor is printed",
          assertionCode: js`
const want = ["Core temp: 420.5 / 650 (65%)", "Coolant in: 288 / 400 (72%)", "Coolant out: 355.5 / 450 (79%)", "Pressure: 2.4 / 5 (48%)", "Neutron flux: 7.2 / 8 (90%)", "Vessel wall: 188 / 300 (63%)"];
for (const w of want) assert(lines.includes(w), 'No line is exactly "' + w + '". Round the percent to a whole number with std::round.');`,
        },
      ],
      unlocks: ["rc-sensors"],
      checks: [
        {
          prompt: "Given `Sensor s = {\"Pressure\", 2.4, 5.0};`, how do you read the limit?",
          question: { type: "choice", options: ["`s.limit`", "`s->limit`", "`s[2]`", "`limit(s)`"], answer: 0 },
          explanation: "Members are reached with a dot: `s.limit`. (`->` is for pointers, which come later; `s[2]` would only work for an array or vector.)",
        },
        {
          prompt: "What does this loop do to the vector?\n\n~~~cpp\nfor (Sensor sensor : sensors) {\n    sensor.value = 0.0;\n}\n~~~",
          question: {
            type: "choice",
            options: [
              "Nothing: it changes copies, the originals stay the same",
              "Sets every value in the vector to 0",
              "Does not compile",
              "Removes the sensors",
            ],
            answer: 0,
          },
          explanation: "Without `&` each `sensor` is a **copy** of the element. Write `for (Sensor& sensor : sensors)` to change the originals, or `const Sensor&` to read them without copying.",
        },
        {
          prompt: "What is missing here?\n\n~~~cpp\nstruct Point {\n    int x;\n    int y;\n}\n~~~",
          question: { type: "choice", options: ["A semicolon after the closing brace", "The word class", "A constructor", "return 0;"], answer: 0 },
          explanation: "A struct (and class) definition must end with `;` after the closing brace. Forgetting it gives *expected ';' after struct definition*, often reported at the next line.",
        },
      ],
    },

    // ───────────────────────── 11 ─────────────────────────
    {
      id: "cpp-basics-11-maps",
      title: "Event tally: std::map",
      minutes: 35,
      xp: 140,
      concepts: ["std::map", "std::unordered_map", "operator[]", "find / end()", "range-for over a map", "structured bindings", "counting"],
      learn: md`### Look things up by name

A vector is indexed by position (0, 1, 2...). Often what you have is a **name**: "how many TEMP_HIGH events?", "what is the limit for the pressure sensor?". A **map** stores **key → value** pairs and finds a value by its key.

~~~cpp
#include <map>

std::map<std::string, int> tally;       // keys are strings, values are ints
tally["TEMP_HIGH"] = 1;
tally["PUMP_START"] = 3;
std::cout << tally["PUMP_START"] << "\n";   // 3
~~~

\`tally[key]\` reads **and creates**: if the key is missing, it is added with a default value (0 for numbers) and then returned. That is exactly what makes **counting** so short:

~~~cpp
for (const std::string& event : events) {
    tally[event]++;       // first time: creates 0, then adds 1
}
~~~

### \`std::map\` versus \`std::unordered_map\`

- \`std::map\` keeps its keys **sorted** (alphabetical for strings). Lookups take time proportional to log(n). Use it when you want ordered output.
- \`std::unordered_map\` (\`#include <unordered_map>\`) uses hashing: lookups are typically instant, but the order of the keys is unspecified and can change.

They look the same in code; pick \`std::map\` when order matters and \`std::unordered_map\` when you only look things up.

### Walking through a map

Each element is a **pair**: \`.first\` is the key and \`.second\` the value. C++17 *structured bindings* unpack them neatly:

~~~cpp
for (const auto& [name, count] : tally) {
    std::cout << name << " x" << count << "\n";
}
~~~

\`const auto&\` means "whatever type this is, by const reference". The names in brackets are yours to choose. A \`std::map\` visits its keys in sorted order.

### Looking up without creating

Reading with \`[]\` on a missing key silently **adds** it, which is a bug when you only wanted to check. Use \`find\`:

~~~cpp
auto entry = limitOf.find("Fusion yield");
if (entry == limitOf.end()) {
    std::cout << "No limit for Fusion yield\n";
} else {
    std::cout << "Limit: " << entry->second << "\n";    // entry points at the pair
}
~~~

\`find\` returns an **iterator**: something that points at an element, or equals \`end()\` when the key is absent. \`->\` reaches through it (\`entry->second\`). Other tools: \`count(key)\` (0 or 1), \`contains(key)\` (C++20, a bool), \`at(key)\` (throws \`std::out_of_range\` if missing), \`erase(key)\`, \`size()\`.

### Choosing the key

Keys must be comparable (and hashable for \`unordered_map\`): strings, numbers and chars are all fine. Each key appears once: assigning to an existing key replaces its value.

### Common mistakes

- Using \`[]\` to check whether a key exists, which creates it.
- Forgetting \`#include <map>\` / \`<unordered_map>\`.
- Expecting \`std::unordered_map\` to keep insertion order.
- Modifying the map while looping over it.
- Using \`it.second\` on an iterator (it must be \`it->second\`).`,
      mission: md`Helios-1 writes an event code to its log every time something happens: \`PUMP_START\`, \`TEMP_HIGH\`, \`VALVE_OPEN\`... After a shift the log holds fourteen of them. The supervisor wants a tally: how many of each, which one happened most, and what was the limit of the pressure sensor (looked up by name, safely).

When this lesson passes, the **Event tally** lights up as a bar chart of your counts.`,
      tasks: [
        "In Part A add #include <map> and #include <unordered_map>",
        "Count the fourteen events from the starter comment into std::map<std::string, int> tally with tally[event]++",
        "Loop over the tally with a structured binding, print each as NAME xN (the map keeps them sorted) and keep the most common event in mostCommon / mostCommonCount; distinctEvents is the number of keys",
        "Build std::unordered_map<std::string, double> limitOf from the sensors vector (name to limit), look up Pressure with find into pressureLimit, and print a message when Fusion yield is not in the map",
        "Print Most common: TEMP_HIGH (5) and Pressure limit: 5; send tally, mostCommon, mostCommonCount, distinctEvents and pressureLimit to the board",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── Part A (above main): add  #include <map>  and  #include <unordered_map>


${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ─── Part B (inside main): the event tally.
std::vector<std::string> events = {
    "PUMP_START", "TEMP_HIGH", "VALVE_OPEN", "TEMP_HIGH", "PUMP_START", "FLUX_SPIKE", "TEMP_HIGH",
    "VALVE_OPEN", "TEMP_HIGH", "FLUX_SPIKE", "PUMP_START", "TEMP_HIGH", "SCRAM_TEST", "FLUX_SPIKE"};
// 1. std::map<std::string, int> tally;   for each event: tally[event]++;
// 2. for (const auto& [name, count] : tally) -> print  FLUX_SPIKE x3   (sorted!), track mostCommon / mostCommonCount
//    int distinctEvents = static_cast<int>(tally.size());       Print:  Most common: TEMP_HIGH (5)
// 3. std::unordered_map<std::string, double> limitOf;   for (const Sensor& sensor : sensors) limitOf[sensor.name] = sensor.limit;
//    auto entry = limitOf.find("Pressure");  ->  pressureLimit = entry->second   (check entry != limitOf.end())    Print:  Pressure limit: 5
//    if (limitOf.find("Fusion yield") == limitOf.end()) print:  No limit for Fusion yield
// scene keys: tally, mostCommon, mostCommonCount, distinctEvents, pressureLimit
`,
      solutionAdd: cpp`#include <map>
#include <unordered_map>

${MAIN_DIVIDER}

// Lesson 11: the event tally.
std::vector<std::string> events = {
    "PUMP_START", "TEMP_HIGH", "VALVE_OPEN", "TEMP_HIGH", "PUMP_START", "FLUX_SPIKE", "TEMP_HIGH",
    "VALVE_OPEN", "TEMP_HIGH", "FLUX_SPIKE", "PUMP_START", "TEMP_HIGH", "SCRAM_TEST", "FLUX_SPIKE"};

std::map<std::string, int> tally;
for (const std::string& event : events) {
    tally[event]++;
}

std::string mostCommon;
int mostCommonCount = 0;
for (const auto& [name, count] : tally) {
    std::cout << name << " x" << count << "\n";
    if (count > mostCommonCount) {
        mostCommonCount = count;
        mostCommon = name;
    }
}
int distinctEvents = static_cast<int>(tally.size());
std::cout << "Most common: " << mostCommon << " (" << mostCommonCount << ")\n";

std::unordered_map<std::string, double> limitOf;
for (const Sensor& sensor : sensors) {
    limitOf[sensor.name] = sensor.limit;
}
double pressureLimit = 0.0;
auto pressureEntry = limitOf.find("Pressure");
if (pressureEntry != limitOf.end()) {
    pressureLimit = pressureEntry->second;
}
std::cout << "Pressure limit: " << pressureLimit << "\n";
if (limitOf.find("Fusion yield") == limitOf.end()) {
    std::cout << "No limit for Fusion yield\n";
}

scene("tally", tally);
scene("mostCommon", mostCommon);
scene("mostCommonCount", mostCommonCount);
scene("distinctEvents", distinctEvents);
scene("pressureLimit", pressureLimit);`,
      explanation:
        "tally[event]++ is the whole counting algorithm: [] creates a missing key with 0 and ++ adds one. A std::map keeps its keys sorted, so the loop prints FLUX_SPIKE first and VALVE_OPEN last, and the structured binding [name, count] unpacks each key/value pair. The unordered_map is only for lookups; find() returns an iterator that equals end() when the key is missing, which lets the program check without creating a new entry the way [] would.",
      hints: [
        { id: "h1", title: "Counting", content: "std::map<std::string, int> tally; for (const std::string& event : events) { tally[event]++; } The first time a key is seen, [] creates it as 0 and ++ makes it 1." },
        { id: "h2", title: "Walking the map", content: "for (const auto& [name, count] : tally) { std::cout << name << \" x\" << count << \"\\n\"; if (count > mostCommonCount) { mostCommonCount = count; mostCommon = name; } } A std::map is already sorted by key." },
        { id: "h3", title: "Safe lookup", content: "auto entry = limitOf.find(\"Pressure\"); if (entry != limitOf.end()) { pressureLimit = entry->second; } For a missing key find() returns limitOf.end(), so compare to it instead of using []." },
      ],
      tests: [
        {
          id: "t1",
          description: "the map counts every event",
          assertionCode: js`
assert(scene.tally && typeof scene.tally === "object", "Send the map with scene(\"tally\", tally);");
assertEqual(JSON.stringify(scene.tally), '{"FLUX_SPIKE":3,"PUMP_START":3,"SCRAM_TEST":1,"TEMP_HIGH":5,"VALVE_OPEN":2}', "tally (use tally[event]++ for every event in the list)");
assertEqual(scene.distinctEvents, 5, "distinctEvents (tally.size())");`,
        },
        {
          id: "t2",
          description: "the most common event is found",
          assertionCode: js`
assertEqual(scene.mostCommon, "TEMP_HIGH", "mostCommon");
assertEqual(scene.mostCommonCount, 5, "mostCommonCount");
assert(lines.includes("Most common: TEMP_HIGH (5)"), 'Print "Most common: TEMP_HIGH (5)".');
assert(lines.includes("TEMP_HIGH x5") && lines.includes("FLUX_SPIKE x3"), 'Print each event as NAME xCOUNT, for example "TEMP_HIGH x5".');`,
        },
        {
          id: "t3",
          description: "the limit lookup is done with find, and a missing key is handled",
          assertionCode: js`
assertEqual(scene.pressureLimit, 5, "pressureLimit (limitOf.find(\"Pressure\") then ->second)");
assert(lines.includes("Pressure limit: 5"), 'Print "Pressure limit: 5".');
assert(lines.includes("No limit for Fusion yield"), 'Print "No limit for Fusion yield" when limitOf.find("Fusion yield") equals limitOf.end().');`,
        },
      ],
      unlocks: ["rc-tally"],
      checks: [
        {
          prompt: "After `std::map<std::string, int> m;` and `std::cout << m[\"X\"];`, how many entries does `m` hold?",
          question: { type: "number", answer: 1 },
          explanation: "`m[\"X\"]` creates the missing key `\"X\"` with the value 0 (and prints 0). So the map now has one entry. Use `find` or `contains` to check without creating.",
        },
        {
          prompt: "You loop over a `std::map<std::string, int>`. In what order do you see the keys?",
          question: {
            type: "choice",
            options: ["Sorted by key", "The order you inserted them", "Random every run", "Largest value first"],
            answer: 0,
          },
          explanation: "A `std::map` keeps keys sorted. A `std::unordered_map` does not promise any order at all, which is why you should not rely on it for output.",
        },
      ],
    },

    // ───────────────────────── 12 ─────────────────────────
    {
      id: "cpp-basics-12-algorithms",
      title: "Analysis: algorithms and lambdas",
      minutes: 35,
      xp: 140,
      concepts: ["<algorithm>", "std::sort", "std::find_if", "std::count_if", "lambdas", "captures", "iterators begin/end"],
      learn: md`### Don't write the loop again

You have written the same loops several times: add everything up, find the biggest, count the ones that qualify. The standard library ships well-tested versions in **\`<algorithm>\`**. They work on **ranges** given as two iterators: \`v.begin()\` (the first element) and \`v.end()\` (one past the last).

~~~cpp
#include <algorithm>

std::sort(rodLevels.begin(), rodLevels.end());      // ascending: 12, 40, 41, ...
~~~

### Lambdas: a function written in place

Many algorithms need *you* to supply a small rule: "sort by what?", "find the first one that...?". A **lambda** is an unnamed function you write right where it is needed:

~~~cpp
[](const Sensor& a, const Sensor& b) { return loadOf(a) > loadOf(b); }
~~~

- \`[]\` is the **capture list**: which outer variables the lambda may use (see below).
- \`(...)\` are its parameters, exactly like a normal function.
- \`{ ... }\` is the body.
- The return type is worked out automatically.

### Sorting with a rule

~~~cpp
std::vector<Sensor> ranked = sensors;        // a copy, so the original order is untouched
std::sort(ranked.begin(), ranked.end(),
          [](const Sensor& a, const Sensor& b) { return loadOf(a) > loadOf(b); });   // highest load first
~~~

The comparison answers "should \`a\` come **before** \`b\`?". It must be a strict ordering: use \`<\` or \`>\`, never \`<=\` or \`>=\`. A comparison that returns true for equal elements breaks \`sort\`'s assumptions and can crash. \`std::sort\` needs a vector (or another random-access container), not a \`std::map\`/\`std::list\`.

### Finding the first match: \`std::find_if\`

~~~cpp
double warnFrom = 0.75;
auto hot = std::find_if(sensors.begin(), sensors.end(),
                        [warnFrom](const Sensor& s) { return loadOf(s) >= warnFrom; });
if (hot != sensors.end()) {
    std::cout << hot->name << "\n";
}
~~~

It returns an iterator to the first element for which the lambda gives true, or \`end()\` when none does. \`hot->name\` reaches the member through the iterator (\`->\`), just like in the map lesson.

### Captures

A lambda cannot see variables from around it unless you list them in \`[]\`. \`[warnFrom]\` copies \`warnFrom\` into the lambda; \`[&warnFrom]\` captures it by reference; \`[=]\` and \`[&]\` capture everything used, by copy or by reference. Capturing exactly what you need is the clearest.

### Counting: \`std::count_if\`

~~~cpp
auto many = std::count_if(sensors.begin(), sensors.end(),
                          [](const Sensor& s) { return loadOf(s) >= 0.7; });
~~~

It returns how many elements satisfy the rule (a signed number type; convert with \`static_cast<int>\` for a plain \`int\`).

### More worth knowing

- \`std::max_element(b, e)\` / \`std::min_element(b, e)\` return an iterator to the biggest / smallest (dereference with \`*\`).
- \`std::count(b, e, value)\`, \`std::find(b, e, value)\`: the no-lambda versions.
- \`std::any_of\`, \`std::all_of\`, \`std::none_of\` answer yes/no questions about a range.
- \`std::reverse(b, e)\` flips the order. \`std::accumulate(b, e, 0)\` (from \`<numeric>\`) adds up a range.
- To remove elements: \`std::erase_if(v, rule)\` (C++20) is the one-liner.

### The middle of a sorted list

After sorting, the median is the element in the middle: \`sorted[sorted.size() / 2]\`. (For an even count that picks the upper of the two middle values.)

### Common mistakes

- Sorting the original when you still need the old order. Copy first.
- A comparison with \`<=\` (can crash \`sort\`) or one that does not return a bool.
- Dereferencing the result of \`find_if\` without checking it against \`end()\`.
- Forgetting to capture a variable the lambda uses (*'warnFrom' is not captured*).
- Forgetting \`#include <algorithm>\`.`,
      mission: md`The raw sensor list is not what a shift supervisor wants to read. They want it ranked from most to least loaded, they want to know the **first** sensor in the list that is in the warning zone, how many sensors are worth watching, and what the median fuel-rod level is.

When this lesson passes, the **Analysis** card lights up with the ranking, the first warning and the median.`,
      tasks: [
        "In Part A add #include <algorithm>",
        "Copy sensors into ranked and sort it by loadOf, highest first, with std::sort and a lambda; collect the names in that order into rankedNames",
        "With std::find_if and a lambda that captures warnFrom (0.75) find the first sensor in the ORIGINAL list at or above that load; firstWarning is its name (or none if there is no such sensor)",
        "With std::count_if count the sensors at or above watchFrom (0.7) into warnCount",
        "Copy rodLevels, sort the copy and take its middle element as medianRod; print the four result lines and send rankedNames, firstWarning, warnCount and medianRod",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── Part A (above main): add  #include <algorithm>


${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ─── Part B (inside main): the analysis.
// 1. std::vector<Sensor> ranked = sensors;
//    std::sort(ranked.begin(), ranked.end(), [](const Sensor& a, const Sensor& b) { return loadOf(a) > loadOf(b); });
//    collect the names, in that order, into std::vector<std::string> rankedNames
// 2. double warnFrom = 0.75;   auto firstHot = std::find_if(sensors.begin(), sensors.end(), [warnFrom](const Sensor& s) { ... });
//    std::string firstWarning = (firstHot != sensors.end()) ? firstHot->name : "none";
// 3. double watchFrom = 0.7;   int warnCount = static_cast<int>(std::count_if(..., [watchFrom](const Sensor& s) { ... }));
// 4. std::vector<int> sortedLevels = rodLevels;   std::sort(...);   int medianRod = sortedLevels[sortedLevels.size() / 2];
// Print:  Ranked: Neutron flux, Coolant out, Coolant in, Core temp, Vessel wall, Pressure
//         First warning: Coolant out       Watch list: 3 sensors       Median rod level: 62
// scene keys: rankedNames, firstWarning, warnCount, medianRod
`,
      solutionAdd: cpp`#include <algorithm>

${MAIN_DIVIDER}

// Lesson 12: the analysis.
std::vector<Sensor> ranked = sensors;
std::sort(ranked.begin(), ranked.end(), [](const Sensor& a, const Sensor& b) {
    return loadOf(a) > loadOf(b);
});
std::vector<std::string> rankedNames;
std::string rankedText;
for (const Sensor& sensor : ranked) {
    rankedNames.push_back(sensor.name);
    if (!rankedText.empty()) {
        rankedText += ", ";
    }
    rankedText += sensor.name;
}
std::cout << "Ranked: " << rankedText << "\n";

double warnFrom = 0.75;
auto firstHot = std::find_if(sensors.begin(), sensors.end(), [warnFrom](const Sensor& s) {
    return loadOf(s) >= warnFrom;
});
std::string firstWarning = (firstHot != sensors.end()) ? firstHot->name : "none";
std::cout << "First warning: " << firstWarning << "\n";

double watchFrom = 0.7;
int warnCount = static_cast<int>(std::count_if(sensors.begin(), sensors.end(), [watchFrom](const Sensor& s) {
    return loadOf(s) >= watchFrom;
}));
std::cout << "Watch list: " << warnCount << " sensors\n";

std::vector<int> sortedLevels = rodLevels;
std::sort(sortedLevels.begin(), sortedLevels.end());
int medianRod = sortedLevels[sortedLevels.size() / 2];
std::cout << "Median rod level: " << medianRod << "\n";

scene("rankedNames", rankedNames);
scene("firstWarning", firstWarning);
scene("warnCount", warnCount);
scene("medianRod", medianRod);`,
      explanation:
        "std::sort takes the range and a lambda that says whether a should come before b; comparing loads with > puts the most loaded sensor first. Sorting a copy keeps the original order, which matters because find_if is asked for the first warning in the original list (Coolant out at 79%; Core temp 65% and Coolant in 72% are below 75%). The lambda captures warnFrom in [] because a lambda cannot see outer variables otherwise. count_if applies the same idea to count the sensors at 70% or more: Neutron flux, Coolant out and Coolant in. After sorting the rod levels, the middle element sortedLevels[size / 2] is the median.",
      hints: [
        { id: "h1", title: "Sorting a copy", content: "std::vector<Sensor> ranked = sensors; std::sort(ranked.begin(), ranked.end(), [](const Sensor& a, const Sensor& b) { return loadOf(a) > loadOf(b); }); Use > for highest first, never >=." },
        { id: "h2", title: "find_if with a capture", content: "auto firstHot = std::find_if(sensors.begin(), sensors.end(), [warnFrom](const Sensor& s) { return loadOf(s) >= warnFrom; }); Always compare the result with sensors.end() before using firstHot->name." },
        { id: "h3", title: "count_if and the median", content: "count_if has the same shape as find_if but returns a number: static_cast<int>(std::count_if(sensors.begin(), sensors.end(), [watchFrom](const Sensor& s) { return loadOf(s) >= watchFrom; })). For the median sort a copy of rodLevels and read sortedLevels[sortedLevels.size() / 2]." },
      ],
      tests: [
        {
          id: "t1",
          description: "the sensors are ranked from most to least loaded",
          assertionCode: js`
assertEqual(JSON.stringify(scene.rankedNames), '["Neutron flux","Coolant out","Coolant in","Core temp","Vessel wall","Pressure"]', "rankedNames (sort a copy of sensors by loadOf, highest first, with a lambda using >)");
assert(lines.includes("Ranked: Neutron flux, Coolant out, Coolant in, Core temp, Vessel wall, Pressure"), 'Print "Ranked: " followed by the names in ranked order, separated by ", ".');`,
        },
        {
          id: "t2",
          description: "find_if returns the first sensor in the original list at 75% or more",
          assertionCode: js`
assertEqual(scene.firstWarning, "Coolant out", "firstWarning (search the ORIGINAL list, not the ranked copy: the first sensor with load >= 0.75 is Coolant out)");
assert(lines.includes("First warning: Coolant out"), 'Print "First warning: Coolant out".');`,
        },
        {
          id: "t3",
          description: "count_if counts the sensors at 70% or more",
          assertionCode: js`
assertEqual(scene.warnCount, 3, "warnCount (Neutron flux, Coolant out and Coolant in are at 70% or more)");
assert(lines.includes("Watch list: 3 sensors"), 'Print "Watch list: 3 sensors".');`,
        },
        {
          id: "t4",
          description: "the median rod level comes from a sorted copy",
          assertionCode: js`
assertEqual(scene.medianRod, 62, "medianRod (sort a copy of rodLevels and read the element at size() / 2)");
assert(lines.includes("Median rod level: 62"), 'Print "Median rod level: 62".');`,
        },
      ],
      unlocks: ["rc-analysis"],
      checks: [
        {
          prompt: "What does `std::find_if` return when no element matches?",
          question: {
            type: "choice",
            options: ["The end() iterator of the range", "0", "nullptr", "It throws an exception"],
            answer: 0,
          },
          explanation: "`find_if` returns an iterator to the first match, or the `end()` iterator you passed in when nothing matches. Always compare against `end()` before dereferencing.",
        },
        {
          prompt: "Why does this lambda not compile?\n\n~~~cpp\ndouble limit = 0.7;\nauto big = [](const Sensor& s) { return loadOf(s) >= limit; };\n~~~",
          question: {
            type: "choice",
            options: [
              "limit is not captured; it must be listed in the [] brackets",
              "Lambdas cannot return a bool",
              "const Sensor& is not allowed in lambdas",
              "loadOf cannot be called from a lambda",
            ],
            answer: 0,
          },
          explanation: "A lambda only sees outside variables that appear in its capture list. Write `[limit]` (copy) or `[&limit]` (reference). Functions like `loadOf` are visible without capturing.",
        },
        {
          prompt: "Which comparison is the correct kind for `std::sort`?",
          question: {
            type: "choice",
            options: ["`return a.value < b.value;`", "`return a.value <= b.value;`", "`return a.value - b.value;`", "`return a.value == b.value;`"],
            answer: 0,
          },
          explanation: "The comparison must be a strict ordering: false for equal elements. `<=` returns true for equals, which breaks the algorithm's assumptions and can even crash. A subtraction returns a number, not a true/false answer to \"does a come first?\".",
        },
      ],
    },
  ],
};
