import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { cpp, js, md } from "./util.ts";

/**
 * Chapter 2: Decisions and repetition. Conditions, loops, std::vector and functions.
 *
 * Lessons 7 and 8 also add declarations (an #include, functions) above MAIN_DIVIDER; what is below
 * the divider joins the end of main (engine/compose.ts).
 */

export const chapter2: Chapter = {
  id: "decisions-and-loops",
  title: "Decisions and repetition",
  blurb: "Let the program decide, repeat work with loops, hold many values in a vector and package logic into functions.",
  lessons: [
    // ───────────────────────── 5 ─────────────────────────
    {
      id: "cpp-basics-5-interlocks",
      title: "Interlocks: if, else and switch",
      minutes: 30,
      xp: 120,
      concepts: ["if / else if / else", "comparison operators", "&& || !", "short-circuit", "switch", "break", "ternary operator", "= vs =="],
      learn: md`### Making a decision

\`if\` runs a block of code only when a **condition** is true. \`else\` handles the other case, and \`else if\` chains further questions. The first branch whose condition is true wins; the rest are skipped.

~~~cpp
if (coreTemp >= 650) {
    std::cout << "SCRAM!\n";
} else if (coreTemp >= 520) {
    std::cout << "Warning\n";
} else {
    std::cout << "Normal\n";
}
~~~

The condition goes in parentheses. It must produce a \`bool\`. Always use braces \`{ }\`, even for a single statement: without them only the *next* line belongs to the \`if\`, and adding a second line later silently breaks the logic.

### Comparison operators

- \`==\` equal, \`!=\` not equal
- \`<\`, \`<=\`, \`>\`, \`>=\`

Each gives back a \`bool\`, so you can store the answer: \`bool hot = coreTemp > 500;\`

**The most famous C++ typo:** \`=\` *assigns*, \`==\` *compares*.

~~~cpp
if (mode = 'S') { ... }    // assigns 'S' to mode, then tests it: always true. Compiles without an error!
if (mode == 'S') { ... }   // what you meant
~~~

C++ allows the first form, so there is no compiler error to rescue you (only an optional warning). Read every \`if\` once with that in mind.

Never test calculated \`double\`s with \`==\` (\`0.1 + 0.2 == 0.3\` is false); compare with \`<\`/\`>\` or check that the difference is tiny.

### Combining conditions: \`&&\`, \`||\`, \`!\`

- \`a && b\`: both must be true ("and")
- \`a || b\`: at least one must be true ("or")
- \`!a\`: the opposite

~~~cpp
bool coolantOk = flowLpm >= minFlow && pressure < 5.0;
bool scramNeeded = coreTemp >= maxTemp || pressure > 5.0;
~~~

\`&&\` binds tighter than \`||\`, like multiplication over addition; use parentheses when you mix them so the next reader does not have to remember. Both operators are **short-circuit**: in \`a && b\`, if \`a\` is false, \`b\` is never even evaluated. That is not just speed; it lets you write guards such as \`index < size && values[index] > 0\`, where the second part would be unsafe if the first were false.

### Numbers as conditions

C++ treats any number as a condition: \`0\` is false and everything else is true. \`if (fuelRods)\` means "if fuelRods is not zero". It works, but \`if (fuelRods != 0)\` says what you mean.

### \`switch\`: one value, many cases

When you compare one value against many fixed alternatives, \`switch\` is tidier than a ladder of \`else if\`:

~~~cpp
switch (mode) {
    case 'S':
        modeName = "Standby";
        break;
    case 'R':
        modeName = "Run";
        break;
    default:
        modeName = "Unknown";
        break;
}
~~~

- It works on whole numbers, \`char\`s and enums (lesson 14), **not** on strings or doubles.
- \`break\` ends the case. Leave it out and execution **falls through** into the next case, which is almost never what you want (when it is, mark it \`[[fallthrough]];\`).
- \`default\` catches everything that matched no case.
- Declaring a variable inside a case needs its own braces: \`case 'R': { int x = 1; break; }\`, otherwise you get *jump to case label crosses initialization*.

### The ternary operator

\`condition ? valueIfTrue : valueIfFalse\` is a tiny \`if\` that produces a value:

~~~cpp
std::string pumpState = coolantOk ? "ON" : "OFF";
~~~

Great for short choices. If you need to nest them, use a normal \`if\` instead.

### Printing bools again

\`std::boolalpha\` is sticky, but a good habit is to send it explicitly in the statements that print bools, so the line does not depend on what happened earlier in the file.

### Common mistakes

- \`=\` instead of \`==\` inside an \`if\`.
- A semicolon right after the condition: \`if (x > 5);\` ends the \`if\` immediately and the block after it *always* runs.
- Forgetting \`break\` in a \`switch\`.
- Writing \`a < b < c\` to mean "b is between a and c". Write \`a < b && b < c\`.
- Using \`switch\` on a \`std::string\` (error: *switch quantity not an integer*).`,
      mission: md`A reactor does not just run, it **refuses** to run when conditions are wrong. The interlock system looks at a temperature probe and the coolant flow and decides three things: how serious the alarm level is, whether the coolant is healthy, and whether the operator is allowed to start the plasma. It also turns the one-letter mode code into a readable name.

When this lesson passes, the **Interlocks** card lights up with lamps for each decision.`,
      tasks: [
        "Use if / else if / else to set std::string alarmLevel from probeTemp: CRITICAL at or above maxTemp, WARNING at or above 80% of maxTemp (0.8 * maxTemp), otherwise NORMAL",
        "Compute bool coolantOk (flowLpm >= minFlow and pressure below 5.0), bool canStart (coolantOk, probeTemp below maxTemp and clearance of at least 2) and bool scramNeeded (probeTemp at or above maxTemp OR pressure above 5.0)",
        "Use a switch on mode to set modeName: 'S' Standby, 'W' Warm-up, 'R' Run, 'X' Shutdown, anything else Unknown",
        "Use the ternary operator for std::string pumpState = coolantOk ? \"ON\" : \"OFF\"",
        "Print the six lines in the starter comment (use std::boolalpha for the bools) and send probeTemp, alarmLevel, flowLpm, minFlow, coolantOk, canStart, modeName and scramNeeded to the board",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 5: the interlock system. The probe readings are given:
double probeTemp = 548.0;
int flowLpm = 310;
const int minFlow = 250;
// 1. std::string alarmLevel;   if / else if / else on probeTemp:
//      >= maxTemp -> "CRITICAL",   >= 0.8 * maxTemp -> "WARNING",   otherwise "NORMAL"
// 2. bool coolantOk   = flowLpm >= minFlow && pressure < 5.0;
//    bool canStart    = coolantOk && probeTemp < maxTemp && clearance >= 2;
//    bool scramNeeded = probeTemp >= maxTemp || pressure > 5.0;
// 3. std::string modeName;   switch (mode) { case 'S' ... 'W' ... 'R' ... 'X' ... default }
// 4. std::string pumpState = coolantOk ? "ON" : "OFF";
// Print (send std::boolalpha before the bools):
//   Alarm level: WARNING     Coolant OK: true     Start permitted: true
//   SCRAM needed: false      Mode: Run            Pump: ON
// scene keys: probeTemp, alarmLevel, flowLpm, minFlow, coolantOk, canStart, modeName, scramNeeded
`,
      solutionAdd: cpp`// Lesson 5: the interlock system.
double probeTemp = 548.0;
int flowLpm = 310;
const int minFlow = 250;

std::string alarmLevel;
if (probeTemp >= maxTemp) {
    alarmLevel = "CRITICAL";
} else if (probeTemp >= 0.8 * maxTemp) {
    alarmLevel = "WARNING";
} else {
    alarmLevel = "NORMAL";
}

bool coolantOk = flowLpm >= minFlow && pressure < 5.0;
bool canStart = coolantOk && probeTemp < maxTemp && clearance >= 2;
bool scramNeeded = probeTemp >= maxTemp || pressure > 5.0;

std::string modeName;
switch (mode) {
    case 'S':
        modeName = "Standby";
        break;
    case 'W':
        modeName = "Warm-up";
        break;
    case 'R':
        modeName = "Run";
        break;
    case 'X':
        modeName = "Shutdown";
        break;
    default:
        modeName = "Unknown";
        break;
}

std::string pumpState = coolantOk ? "ON" : "OFF";

std::cout << std::boolalpha;
std::cout << "Alarm level: " << alarmLevel << "\n";
std::cout << "Coolant OK: " << coolantOk << "\n";
std::cout << "Start permitted: " << canStart << "\n";
std::cout << "SCRAM needed: " << scramNeeded << "\n";
std::cout << "Mode: " << modeName << "\n";
std::cout << "Pump: " << pumpState << "\n";

scene("probeTemp", probeTemp);
scene("alarmLevel", alarmLevel);
scene("flowLpm", flowLpm);
scene("minFlow", minFlow);
scene("coolantOk", coolantOk);
scene("canStart", canStart);
scene("modeName", modeName);
scene("scramNeeded", scramNeeded);`,
      explanation:
        "The if / else if / else ladder is checked top to bottom and the first true condition wins: 548 is below maxTemp (650) but not below 0.8 * 650 = 520, so the level is WARNING. coolantOk and canStart combine comparisons with &&, scramNeeded uses || because either problem is enough. The switch compares mode with each char case and each case ends with break so execution does not fall through into the next one. The ternary operator is a one-line if that produces a value.",
      hints: [
        { id: "h1", title: "The ladder", content: "if (probeTemp >= maxTemp) { alarmLevel = \"CRITICAL\"; } else if (probeTemp >= 0.8 * maxTemp) { alarmLevel = \"WARNING\"; } else { alarmLevel = \"NORMAL\"; } Check the most severe condition first." },
        { id: "h2", title: "Combining conditions", content: "bool coolantOk = flowLpm >= minFlow && pressure < 5.0; For scramNeeded one problem is enough, so use ||. Remember == compares and = assigns." },
        { id: "h3", title: "The switch", content: "switch (mode) { case 'S': modeName = \"Standby\"; break; case 'W': ... default: modeName = \"Unknown\"; break; } Single quotes for each char case, and don't forget every break." },
      ],
      tests: [
        {
          id: "t1",
          description: "alarmLevel is WARNING for a probe reading of 548",
          assertionCode: js`
assertEqual(scene.probeTemp, 548, "probeTemp (send the probe reading with scene(\"probeTemp\", probeTemp);)");
assertEqual(scene.alarmLevel, "WARNING", "alarmLevel (548 is below maxTemp 650 but at or above 80% of it, which is 520)");`,
        },
        {
          id: "t2",
          description: "coolantOk and canStart combine conditions with &&",
          assertionCode: js`
assertEqual(scene.flowLpm, 310, "flowLpm");
assertEqual(scene.minFlow, 250, "minFlow");
assertEqual(scene.coolantOk, true, "coolantOk (flow 310 >= 250 AND pressure 2.4 < 5.0)");
assertEqual(scene.canStart, true, "canStart (coolantOk AND probeTemp < maxTemp AND clearance >= 2)");`,
        },
        {
          id: "t3",
          description: "scramNeeded is false when neither danger condition holds",
          assertionCode: js`assertEqual(scene.scramNeeded, false, "scramNeeded (probeTemp >= maxTemp OR pressure > 5.0; neither is true)");`,
        },
        {
          id: "t4",
          description: "the switch turns mode R into the name Run",
          assertionCode: js`assertEqual(scene.modeName, "Run", "modeName (switch on mode: case 'R' sets \"Run\"; remember break)");`,
        },
        {
          id: "t5",
          description: "the six decision lines are printed",
          assertionCode: js`
const want = ["Alarm level: WARNING", "Coolant OK: true", "Start permitted: true", "SCRAM needed: false", "Mode: Run", "Pump: ON"];
for (const w of want) assert(lines.includes(w), 'No line is exactly "' + w + '".' + (w.includes("true") || w.includes("false") ? " Send std::boolalpha into std::cout so bools print as words." : ""));`,
        },
      ],
      unlocks: ["rc-interlocks"],
      checks: [
        {
          prompt: "What does this print?\n\n~~~cpp\nint level = 2;\nif (level = 0) {\n    std::cout << \"A\";\n} else {\n    std::cout << \"B\";\n}\n~~~",
          question: { type: "choice", options: ["A", "B", "AB", "Nothing, it does not compile"], answer: 1 },
          explanation: "`level = 0` is an *assignment*, not a comparison. It stores 0 in `level`, and the value of the whole expression is 0, which counts as false. So the `else` branch runs and prints `B`. It compiles, which is exactly why this typo is so dangerous.",
        },
        {
          prompt: "In `if (index < size && values[index] > 0)`, what happens when `index` equals `size`?",
          question: {
            type: "choice",
            options: [
              "values[index] is never evaluated, because && stops as soon as the left side is false",
              "values[index] is read anyway and the program crashes",
              "The condition is always true",
              "It does not compile",
            ],
            answer: 0,
          },
          explanation: "`&&` and `||` are *short-circuit* operators. When the left side already decides the answer, the right side is skipped, which makes this a safe guard against reading past the end.",
        },
        {
          prompt: "A `switch` case has no `break`. What happens when it matches?",
          question: {
            type: "choice",
            options: [
              "The program continues into the next case's code as well (fall-through)",
              "The compiler refuses to build",
              "It jumps to default",
              "Only that case runs, break is optional",
            ],
            answer: 0,
          },
          explanation: "Without `break`, execution falls through into the following case and keeps going until a `break` or the end of the switch. Forgetting it is a classic bug.",
        },
      ],
    },

    // ───────────────────────── 6 ─────────────────────────
    {
      id: "cpp-basics-6-loops",
      title: "Warm-up ramp: loops",
      minutes: 35,
      xp: 140,
      concepts: ["while", "for", "do-while", "break", "continue", "nested loops", "off-by-one", "infinite loops"],
      learn: md`### Repeating work

A **loop** runs a block of code again and again while a condition holds. C++ has three flavours, and they are all the same idea.

### \`while\`: check first, then repeat

~~~cpp
double rampTemp = 20.0;
int ticks = 0;
while (rampTemp < 400.0) {
    rampTemp += 45.0;
    ticks++;
}
~~~

The condition is tested **before** each round. If it is false from the start, the body never runs. You use \`while\` when you do not know in advance how many rounds are needed ("heat until it is warm enough").

Every \`while\` needs something inside that eventually makes the condition false. Forget \`rampTemp += 45.0\` and the loop never ends: the program is stopped after a few seconds with a "ran for too long" message.

### \`for\`: when you can count

~~~cpp
for (int count = 5; count >= 1; count--) {
    std::cout << "T-" << count << "\n";
}
~~~

The three parts in the parentheses are: **start** (\`int count = 5\`, runs once), **condition** (\`count >= 1\`, checked before every round) and **step** (\`count--\`, runs after every round). The variable \`count\` only exists inside the loop.

A very common version counts from 0: \`for (int i = 0; i < n; i++)\` runs exactly \`n\` times with \`i\` = 0, 1, ..., n-1. Use \`<\`, not \`<=\`, to avoid running one time too many. This **off-by-one** error is the most common loop bug.

### \`do ... while\`: run once, then check

~~~cpp
int cycles = 0;
do {
    cycles++;
} while (cycles * 40 < 100);
~~~

The condition is tested **after** the body, so the body always runs at least once. Note the semicolon after \`while (...)\`. It is the rarest of the three; reach for it when "do it once, then maybe again" is exactly what you mean.

### \`break\` and \`continue\`

- \`break\` leaves the loop immediately.
- \`continue\` skips the rest of this round and moves on to the next one (in a \`for\` loop the step still runs).

~~~cpp
for (int tick = 1; tick <= 12; tick++) {
    if (tick % 4 == 0) {
        continue;            // maintenance tick: nothing to add
    }
    heatTotal += tick * 10;
    if (heatTotal > 500) {
        break;               // enough heat, stop early
    }
}
~~~

### Nested loops

A loop inside a loop runs the inner one completely for every round of the outer one. That is how you walk a grid: the outer loop picks the row, the inner loop picks the column.

~~~cpp
for (int row = 0; row < 3; row++) {
    for (int col = 0; col < 4; col++) {
        std::cout << "*";
    }
    std::cout << "\n";       // end of the row
}
~~~

That prints three rows of four stars. 3 x 4 = 12 trips through the inner body. Nested loops get expensive quickly, so keep an eye on how many rounds they make.

### Building a string character by character

You can grow a \`std::string\` with \`+=\`. It accepts a \`char\` (single quotes) or another string:

~~~cpp
std::string line;
line += '#';
line += "..";
line += '\n';       // a newline character is a char too
~~~

### Common mistakes

- An infinite loop: the condition never becomes false.
- Off by one: \`i <= n\` instead of \`i < n\`.
- A semicolon after the \`for(...)\` or \`while(...)\` parentheses, which makes the loop body empty.
- Changing the loop variable inside the body and confusing the counting.
- Declaring the counter inside the loop and then trying to use it after it.`,
      mission: md`Before the plasma ignites, the core has to warm up in a controlled ramp. Your program will simulate it tick by tick, count down to ignition, prime the pumps, add up heat while skipping maintenance ticks, and finally draw a map of the core cross-section with nested loops.

When this lesson passes, the **Warm-up ramp** card lights up with the ramp and the core map.`,
      tasks: [
        "With a while loop, start rampTemp at rampStart (20.0) and add 45.0 per tick until it reaches 400.0 or more; count the rampTicks and keep rampPeak",
        "With a for loop, count down from 5 to 1 printing T-5 ... T-1, then print Ignition!",
        "With a do-while loop, count primeCycles until primeCycles * 40 is at least 100",
        "For ticks 1 to 12 add tick * 10 to heatTotal: skip every 4th tick with continue (count it in skipped), remember lastTick, and break once heatTotal is above 500",
        "With nested for loops build std::string coreMap, 5 rows of 8 columns: '#' on the border, '*' at row 2 columns 3 and 4, '.' elsewhere, each row ending with '\\n'. Print it and send everything to the board",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 6: the warm-up ramp.
// 1. const double rampStart = 20.0;  double rampTemp = rampStart;  int rampTicks = 0;
//    while (rampTemp < 400.0) { rampTemp += 45.0; rampTicks++; }     double rampPeak = rampTemp;
//    Print:  Warm-up took 9 ticks, peak 425 C
// 2. for (int count = 5; count >= 1; count--) -> print  T-5  T-4  T-3  T-2  T-1,  then  Ignition!
// 3. int primeCycles = 0;  do { primeCycles++; } while (primeCycles * 40 < 100);   Print: Primed in 3 cycles
// 4. int heatTotal = 0, skipped = 0, lastTick = 0;  for tick 1..12:
//      every 4th tick: skipped++ and continue;   else heatTotal += tick * 10; lastTick = tick;
//      if (heatTotal > 500) break;
//    Print:  Heat 540 after tick 11 (2 ticks skipped)
// 5. std::string coreMap;  nested for loops, 5 rows x 8 columns:
//      border (row 0, row 4, col 0, col 7) -> '#',   row 2 with col 3 or 4 -> '*',   otherwise '.'
//      add '\n' after each row.   std::cout << coreMap;
// scene keys: rampStart, rampTicks, rampPeak, primeCycles, skipped, lastTick, heatTotal, coreMap
`,
      solutionAdd: cpp`// Lesson 6: the warm-up ramp.
const double rampStart = 20.0;
double rampTemp = rampStart;
int rampTicks = 0;
while (rampTemp < 400.0) {
    rampTemp += 45.0;
    rampTicks++;
}
double rampPeak = rampTemp;
std::cout << "Warm-up took " << rampTicks << " ticks, peak " << rampPeak << " C\n";

for (int count = 5; count >= 1; count--) {
    std::cout << "T-" << count << "\n";
}
std::cout << "Ignition!\n";

int primeCycles = 0;
do {
    primeCycles++;
} while (primeCycles * 40 < 100);
std::cout << "Primed in " << primeCycles << " cycles\n";

int heatTotal = 0;
int skipped = 0;
int lastTick = 0;
for (int tick = 1; tick <= 12; tick++) {
    if (tick % 4 == 0) {
        skipped++;
        continue;
    }
    heatTotal += tick * 10;
    lastTick = tick;
    if (heatTotal > 500) {
        break;
    }
}
std::cout << "Heat " << heatTotal << " after tick " << lastTick << " (" << skipped << " ticks skipped)\n";

std::string coreMap;
for (int row = 0; row < 5; row++) {
    for (int col = 0; col < 8; col++) {
        if (row == 0 || row == 4 || col == 0 || col == 7) {
            coreMap += '#';
        } else if (row == 2 && (col == 3 || col == 4)) {
            coreMap += '*';
        } else {
            coreMap += '.';
        }
    }
    coreMap += '\n';
}
std::cout << coreMap;

scene("rampStart", rampStart);
scene("rampTicks", rampTicks);
scene("rampPeak", rampPeak);
scene("primeCycles", primeCycles);
scene("skipped", skipped);
scene("lastTick", lastTick);
scene("heatTotal", heatTotal);
scene("coreMap", coreMap);`,
      explanation:
        "The while loop adds 45 per tick: 20 + 9 * 45 = 425, the first value that is not below 400, so it runs 9 times. The for loop counts down by using count-- as its step. The do-while body runs once before the condition is checked: 40, 80, 120 gives 3 cycles. In the break/continue loop, tick % 4 == 0 catches ticks 4 and 8 (continue skips the adding), and the total passes 500 at tick 11 (540), where break ends the loop. The nested loops visit every (row, col) cell: the outer loop picks the row, the inner one fills it, and '\\n' ends each row.",
      hints: [
        { id: "h1", title: "While and for", content: "double rampTemp = rampStart; int rampTicks = 0; while (rampTemp < 400.0) { rampTemp += 45.0; rampTicks++; } For the countdown: for (int count = 5; count >= 1; count--) { std::cout << \"T-\" << count << \"\\n\"; }" },
        { id: "h2", title: "continue and break", content: "Inside for (int tick = 1; tick <= 12; tick++): if (tick % 4 == 0) { skipped++; continue; } then heatTotal += tick * 10; lastTick = tick; if (heatTotal > 500) { break; }" },
        { id: "h3", title: "The map", content: "for (int row = 0; row < 5; row++) { for (int col = 0; col < 8; col++) { if (row == 0 || row == 4 || col == 0 || col == 7) coreMap += '#'; else if (...) coreMap += '*'; else coreMap += '.'; } coreMap += '\\n'; } Single quotes: you are adding chars." },
      ],
      tests: [
        {
          id: "t1",
          description: "the while loop warms up from 20 in steps of 45",
          assertionCode: js`
assertEqual(scene.rampStart, 20, "rampStart");
assertEqual(scene.rampTicks, 9, "rampTicks (20 + 9 * 45 = 425, the first value that is not below 400)");
assertEqual(scene.rampPeak, 425, "rampPeak (the temperature when the loop ended)");
assert(lines.includes("Warm-up took 9 ticks, peak 425 C"), 'Print "Warm-up took 9 ticks, peak 425 C".');`,
        },
        {
          id: "t2",
          description: "the countdown prints T-5 to T-1 and then Ignition!",
          assertionCode: js`
const at = ["T-5", "T-4", "T-3", "T-2", "T-1", "Ignition!"].map((w) => lines.indexOf(w));
assert(at.every((i) => i >= 0), "Print the six countdown lines: T-5, T-4, T-3, T-2, T-1 and Ignition!");
assert(at.every((v, i) => i === 0 || v === at[i - 1] + 1), "The countdown lines must follow each other in order: T-5 down to T-1, then Ignition!");`,
        },
        {
          id: "t3",
          description: "the do-while loop runs until primeCycles * 40 reaches 100",
          assertionCode: js`
assertEqual(scene.primeCycles, 3, "primeCycles (40, 80, then 120, so 3 rounds)");
assert(lines.includes("Primed in 3 cycles"), 'Print "Primed in 3 cycles".');`,
        },
        {
          id: "t4",
          description: "continue skips every 4th tick and break stops above 500",
          assertionCode: js`
assertEqual(scene.skipped, 2, "skipped (ticks 4 and 8)");
assertEqual(scene.lastTick, 11, "lastTick (the tick where the total first goes above 500)");
assertEqual(scene.heatTotal, 540, "heatTotal (10+20+30+50+60+70+90+100+110)");
assert(lines.includes("Heat 540 after tick 11 (2 ticks skipped)"), 'Print "Heat 540 after tick 11 (2 ticks skipped)".');`,
        },
        {
          id: "t5",
          description: "nested loops build the core map",
          assertionCode: js`
const map = "########\n#......#\n#..**..#\n#......#\n########\n";
assertEqual(scene.coreMap, map, "coreMap (5 rows of 8: '#' border, '*' at row 2 columns 3 and 4, '.' elsewhere, each row ending with a newline)");
assert(stdout.includes(map), "Print the map with std::cout << coreMap;");`,
        },
      ],
      unlocks: ["rc-ramp"],
      checks: [
        {
          prompt: "How many times does the body run?\n\n~~~cpp\nfor (int i = 0; i <= 4; i++) {\n    std::cout << i;\n}\n~~~",
          question: { type: "number", answer: 5 },
          explanation: "`i` takes the values 0, 1, 2, 3 and 4. The condition uses `<=`, so 4 is included: five rounds. With `i < 4` it would be four. Watching `<` versus `<=` is how you catch off-by-one errors.",
        },
        {
          prompt: "What is the difference between `while` and `do ... while`?",
          question: {
            type: "choice",
            options: [
              "do-while checks the condition after the body, so the body runs at least once",
              "do-while is faster",
              "while loops can only count upwards",
              "There is no difference",
            ],
            answer: 0,
          },
          explanation: "A `while` loop tests first and may not run at all. A `do ... while` loop runs the body once and then tests, so it always runs at least once.",
        },
        {
          prompt: "What does `continue` do inside a loop?",
          question: {
            type: "choice",
            options: [
              "Skips the rest of the current round and starts the next one",
              "Leaves the loop completely",
              "Restarts the program",
              "Does nothing, it is just a comment",
            ],
            answer: 0,
          },
          explanation: "`continue` jumps straight to the next round of the loop (after the step of a `for`). `break` is the one that leaves the loop.",
        },
      ],
    },

    // ───────────────────────── 7 ─────────────────────────
    {
      id: "cpp-basics-7-vectors",
      title: "Fuel rods: std::vector",
      minutes: 35,
      xp: 140,
      concepts: ["std::vector", "push_back", "size", "range-for", "indexing", "out of bounds", ".at()", "try / catch intro"],
      learn: md`### Many values, one name

Helios-1 has 24 fuel rods. Declaring 24 separate variables would be silly, so you use a **container**. The workhorse of C++ is \`std::vector\`: a list that grows when you add to it. It needs \`#include <vector>\` (your file already has it, but remember to include what you use) and the type of the elements in angle brackets.

~~~cpp
std::vector<int> rodLevels;           // an empty list of ints
rodLevels.push_back(72);              // add to the end
rodLevels.push_back(85);
std::vector<double> temps = {412.0, 388.5, 455.0};   // start with values
~~~

### The everyday operations

- \`v.size()\`: how many elements. (It is an unsigned \`std::size_t\`, so convert with \`static_cast<int>\` when you need a plain \`int\`.)
- \`v[i]\`: the element at position \`i\`. Positions start at **0**, so a vector of 24 has positions 0 to 23.
- \`v.push_back(x)\`: add \`x\` at the end. \`v.pop_back()\` removes the last one.
- \`v.front()\` / \`v.back()\`: first and last element. \`v.empty()\`: is it empty? \`v.clear()\`: remove everything.

### Walking through a vector

The classic way uses an index:

~~~cpp
for (int i = 0; i < static_cast<int>(rodLevels.size()); i++) {
    std::cout << "Rod " << i << ": " << rodLevels[i] << "\n";
}
~~~

When you do not need the position, the **range-based for** is shorter and cannot go out of range:

~~~cpp
int levelSum = 0;
for (int level : rodLevels) {
    levelSum += level;
}
~~~

\`for (int level : rodLevels)\` means "for each element, copy it into \`level\`". If you only want to change nothing and the elements are big, you will use \`const auto&\` (lesson 8 explains the \`&\`). To modify the elements themselves write \`for (int& level : rodLevels) level -= 1;\`.

### The out-of-bounds trap

\`v[i]\` does **not** check that \`i\` is valid. Reading \`rodLevels[99]\` in a vector of 24 is **undefined behaviour**: the program may print a random number, crash, or appear to work. There is no friendly error. Two defences:

1. Check before you index: \`if (i >= 0 && i < size) ...\`
2. Use \`v.at(i)\`, which *does* check and throws an exception (an error you can catch) if \`i\` is out of range.

~~~cpp
#include <stdexcept>      // defines std::out_of_range

try {
    std::cout << rodLevels.at(99) << "\n";
} catch (const std::out_of_range&) {
    std::cout << "Rod 99 does not exist\n";
}
~~~

A \`try\` block runs code that might throw. If it throws a \`std::out_of_range\`, execution jumps to the matching \`catch\` block instead of crashing. Lesson 15 covers exceptions properly; for now treat this as a pattern. If nothing catches an exception, the program terminates and you see *terminate called after throwing an instance of 'std::out_of_range'*.

### Building a vector with a loop

~~~cpp
std::vector<int> rodLevels;
for (int i = 0; i < 24; i++) {
    rodLevels.push_back(40 + (i * 37) % 55);    // 24 pseudo-readings between 40 and 94
}
~~~

### Copies, not shared boxes

\`std::vector<int> backup = rodLevels;\` makes a full **copy**. Changing \`backup\` never changes \`rodLevels\` (unlike in languages where variables point at shared objects). Copies are safe but can be slow for huge vectors; lesson 8 shows how to avoid them.

### Two gotchas

- \`std::vector<int> v(5, 0);\` (parentheses) means "5 elements, all 0". \`std::vector<int> v{5, 0};\` (braces) means "two elements: 5 and 0". Same characters, different meaning.
- Do not add or remove elements inside a range-for over the same vector. The loop can be left pointing at memory that has moved.

### Common mistakes

- Using \`i <= v.size()\` and reading one past the end.
- Counting from 1: the first element is \`v[0]\`.
- Indexing an empty vector (\`v.front()\` on an empty vector is undefined too).
- Using \`v[i]\` to grow a vector. It only reads or writes existing positions; use \`push_back\` to add.
- Looping backwards with an unsigned counter: \`for (std::size_t i = v.size() - 1; i >= 0; i--)\` never ends, because an unsigned number cannot go below 0.`,
      mission: md`Helios-1 has 24 fuel rods, and the control room must know how much fuel each has left. You will store the levels in a \`std::vector<int>\`, work out the average, find the weakest and strongest rod, and prove you can handle a request for a rod that does not exist.

When this lesson passes, the **Fuel rods** grid lights up: 24 rods filled to their levels, with the weakest one outlined.`,
      tasks: [
        "Add #include <stdexcept> in Part A, above main",
        "Build std::vector<int> rodLevels with a for loop of 24 push_back calls using 40 + (i * 37) % 55, then set rodLevels[13] = 12 (rod 13 has burned its fuel)",
        "Find rodCount (size as an int), the sum of the levels with a range-for, avgLevel rounded to one decimal, maxLevel, minIndex (the position of the smallest) and minLevel",
        "Use rodLevels.at(99) inside a try block and catch std::out_of_range to print Rod 99 does not exist",
        "Print the four summary lines from the starter comment and send rodLevels, rodCount, avgLevel, minLevel, minIndex and maxLevel to the board",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── Part A: add  #include <stdexcept>  on the blank line below.


${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ─── Part B (inside main): the fuel rods.
// 1. std::vector<int> rodLevels;   for (int i = 0; i < 24; i++) rodLevels.push_back(40 + (i * 37) % 55);
//    rodLevels[13] = 12;   // rod 13 has burned through its fuel
// 2. int rodCount = static_cast<int>(rodLevels.size());
//    range-for to add up levelSum and find maxLevel;   a counting loop to find minIndex (position of the smallest)
//    double avgLevel = std::round(static_cast<double>(levelSum) / rodCount * 10.0) / 10.0;   int minLevel = rodLevels[minIndex];
// 3. try { rodLevels.at(99); } catch (const std::out_of_range&) { print "Rod 99 does not exist" }
// Print:  Rods: 24     Average level: 59.3     Lowest: rod 13 at 12%     Highest: 84%     Rod 99 does not exist
// scene keys: rodLevels, rodCount, avgLevel, minLevel, minIndex, maxLevel
`,
      solutionAdd: cpp`#include <stdexcept>

${MAIN_DIVIDER}

// Lesson 7: the fuel rods.
std::vector<int> rodLevels;
for (int i = 0; i < 24; i++) {
    rodLevels.push_back(40 + (i * 37) % 55);
}
rodLevels[13] = 12;   // rod 13 has burned through its fuel

int rodCount = static_cast<int>(rodLevels.size());
int levelSum = 0;
int maxLevel = 0;
for (int level : rodLevels) {
    levelSum += level;
    if (level > maxLevel) {
        maxLevel = level;
    }
}
int minIndex = 0;
for (int i = 1; i < rodCount; i++) {
    if (rodLevels[i] < rodLevels[minIndex]) {
        minIndex = i;
    }
}
int minLevel = rodLevels[minIndex];
double avgLevel = std::round(static_cast<double>(levelSum) / rodCount * 10.0) / 10.0;

std::cout << "Rods: " << rodCount << "\n";
std::cout << "Average level: " << avgLevel << "\n";
std::cout << "Lowest: rod " << minIndex << " at " << minLevel << "%\n";
std::cout << "Highest: " << maxLevel << "%\n";

try {
    std::cout << rodLevels.at(99) << "\n";
} catch (const std::out_of_range&) {
    std::cout << "Rod 99 does not exist\n";
}

scene("rodLevels", rodLevels);
scene("rodCount", rodCount);
scene("avgLevel", avgLevel);
scene("minLevel", minLevel);
scene("minIndex", minIndex);
scene("maxLevel", maxLevel);`,
      explanation:
        "push_back appends one element, so the loop builds 24 readings, and rodLevels[13] = 12 overwrites position 13 (positions start at 0). The range-for adds up the levels without any index; the counting loop is used for minIndex because there the position matters. rodLevels.at(99) checks the index and throws std::out_of_range, which the catch block turns into a message; rodLevels[99] would have silently read memory that is not part of the vector.",
      hints: [
        { id: "h1", title: "Building the vector", content: "std::vector<int> rodLevels; for (int i = 0; i < 24; i++) { rodLevels.push_back(40 + (i * 37) % 55); } then rodLevels[13] = 12; Use < 24, not <= 24." },
        { id: "h2", title: "Sum, max and min position", content: "for (int level : rodLevels) { levelSum += level; if (level > maxLevel) maxLevel = level; } For minIndex start with 0 and loop i from 1: if (rodLevels[i] < rodLevels[minIndex]) minIndex = i;" },
        { id: "h3", title: "The safe access", content: "try { std::cout << rodLevels.at(99) << \"\\n\"; } catch (const std::out_of_range&) { std::cout << \"Rod 99 does not exist\\n\"; } You need #include <stdexcept> above main." },
      ],
      tests: [
        {
          id: "t1",
          description: "rodLevels holds 24 readings and rod 13 is the weak one",
          assertionCode: js`
assert(Array.isArray(scene.rodLevels), "Send the vector with scene(\"rodLevels\", rodLevels);");
assertEqual(scene.rodLevels.length, 24, "rodLevels should have 24 elements (loop while i < 24)");
assertEqual(scene.rodLevels[0], 40, "rodLevels[0] is 40 + (0 * 37) % 55");
assertEqual(scene.rodLevels[1], 77, "rodLevels[1] is 40 + (1 * 37) % 55");
assertEqual(scene.rodLevels[13], 12, "rodLevels[13] was set to 12");`,
        },
        {
          id: "t2",
          description: "the count, average and extremes are right",
          assertionCode: js`
assertEqual(scene.rodCount, 24, "rodCount (rodLevels.size())");
assertClose(scene.avgLevel, 59.3, 0.0001, "avgLevel (sum 1423 divided by 24, one decimal; cast one side to double)");
assertEqual(scene.maxLevel, 84, "maxLevel");
assertEqual(scene.minLevel, 12, "minLevel");
assertEqual(scene.minIndex, 13, "minIndex (the POSITION of the smallest level)");`,
        },
        {
          id: "t3",
          description: "the summary lines are printed",
          assertionCode: js`
for (const w of ["Rods: 24", "Average level: 59.3", "Lowest: rod 13 at 12%", "Highest: 84%"]) assert(lines.includes(w), 'No line is exactly "' + w + '".');`,
        },
        {
          id: "t4",
          description: "asking for rod 99 is handled instead of crashing",
          assertionCode: js`assert(lines.includes("Rod 99 does not exist"), 'Print "Rod 99 does not exist" from a catch block after rodLevels.at(99) throws std::out_of_range.');`,
        },
      ],
      unlocks: ["rc-rods"],
      checks: [
        {
          prompt: "A vector holds 24 elements. Which index is the last valid one?",
          question: { type: "number", answer: 23 },
          explanation: "Positions start at 0, so 24 elements occupy positions 0 to 23. `v[24]` is one past the end.",
        },
        {
          prompt: "What is the difference between `v[30]` and `v.at(30)` on a vector of 24 elements?",
          question: {
            type: "choice",
            options: [
              "v[30] is undefined behaviour; v.at(30) throws std::out_of_range",
              "Both throw an exception",
              "v[30] throws, v.at(30) returns 0",
              "There is no difference",
            ],
            answer: 0,
          },
          explanation: "`operator[]` does no checking (fast, but dangerous). `at()` checks and throws, which you can catch. Use `at()` while you are learning or when the index comes from outside.",
        },
        {
          prompt: "What is in `v` after `std::vector<int> v(3, 7);`?",
          question: { type: "choice", options: ["Three elements, all 7", "Two elements: 3 and 7", "One element: 37", "Seven elements, all 3"], answer: 0 },
          explanation: "With parentheses the first number is the **count** and the second the **value**. With braces `{3, 7}` you would get the two elements 3 and 7.",
        },
      ],
    },

    // ───────────────────────── 8 ─────────────────────────
    {
      id: "cpp-basics-8-functions",
      title: "Coolant loops: functions",
      minutes: 40,
      xp: 160,
      concepts: ["functions", "parameters", "return values", "void", "pass by value", "pass by reference", "const reference", "overloading", "declaration order"],
      learn: md`### Name a piece of logic

A **function** is a named block of code that takes inputs (**parameters**) and gives back an output (its **return value**). You have been using functions all along (\`std::round\`, \`size()\`). Now you write your own.

~~~cpp
int coolantFlow(double tempC) {
    if (tempC <= 300.0) {
        return 120;
    }
    return 120 + static_cast<int>((tempC - 300.0) * 1.5);
}

int flow = coolantFlow(412.0);    // 288
~~~

The parts, left to right: the **return type** (\`int\`), the **name**, the **parameter list** (a type and a name for each input) and the **body**. \`return\` hands a value back and ends the function immediately. A function that returns nothing is declared \`void\`.

Functions let you give a name to an idea, reuse it in many places and test it on its own. If you copy the same calculation three times, you want a function.

### Where do functions go?

In C++ a function must be **declared before it is used**: the compiler reads the file top to bottom. That is why functions live **above** \`main\`, and why this course's starters put them there (Part A above the divider line). If you must put a function below its caller, add a **prototype** (just the first line plus \`;\`) above: \`int coolantFlow(double tempC);\`. Forget the order and you get *'coolantFlow' was not declared in this scope*.

### Pass by value: the function works on a copy

By default every argument is **copied** into the parameter. The function can change its copy all it likes; the caller's variable stays the same.

~~~cpp
void boostByValue(int rpm) {
    rpm += 300;          // changes only the function's own copy
}

int pumpRpm = 1200;
boostByValue(pumpRpm);   // pumpRpm is still 1200
~~~

### Pass by reference: the function works on the original

Put a \`&\` after the type and the parameter becomes a **reference**: another name for the caller's variable.

~~~cpp
void boostByReference(int& rpm) {
    rpm += 300;          // changes the caller's variable
}

boostByReference(pumpRpm);   // pumpRpm is now 1500
~~~

Use a reference parameter when the function is *meant* to change the caller's data. A reference cannot bind to a temporary: \`boostByReference(1200)\` is an error (*cannot bind non-const lvalue reference of type 'int&' to an rvalue*).

### \`const&\`: look, don't copy

Copying a \`std::string\` or a big \`std::vector\` on every call is wasteful. When a function only needs to *read* its argument, take it by **const reference**:

~~~cpp
std::string loopLabel(const std::string& name, int flow) {
    return "Loop " + name + ": " + std::to_string(flow) + " L/min";
}
~~~

No copy is made, and \`const\` guarantees the function cannot modify the original. The rule of thumb: small types (\`int\`, \`double\`, \`char\`, \`bool\`) by value; bigger things by \`const&\`; things the function must change by plain \`&\`.

(\`std::to_string(flow)\` turns a number into text. Lesson 9 digs into strings.)

### Overloading

Several functions may share a name if their **parameter lists differ**. The compiler picks the one that matches the call.

~~~cpp
double average(double a, double b) { return (a + b) / 2.0; }
double average(double a, double b, double c) { return (a + b + c) / 3.0; }

average(10, 20);        // calls the two-parameter version
average(10, 20, 60);    // calls the three-parameter version
~~~

The return type alone does not distinguish overloads. If no overload fits you get *no matching function for call to 'average(double)'*; if two fit equally well, the call is *ambiguous*.

### Scope: names live in their braces

A variable declared inside a function exists only there. Two functions can each have a local called \`total\` without clashing, and none of them can see the variables of \`main\`. If a function needs a value, pass it in.

### Every path must return

If a function with a return type reaches its end without a \`return\`, C++ does not stop you at compile time (it is only a warning in some setups) and the result is **undefined behaviour**. Make sure every branch returns.

### Common mistakes

- Calling a function before it is declared.
- Expecting a by-value parameter to change the caller's variable.
- Forgetting the \`&\` and then wondering why nothing changed.
- Returning a reference to a local variable (it is destroyed when the function ends).
- Missing a \`return\` on one branch of an \`if\`.`,
      mission: md`Helios-1 cools its core with three loops, A, B and C. How much coolant each loop needs depends on its temperature, and the same calculation is needed three times, a perfect job for a function. You will also boost a pump twice, once the wrong way (by value) and once the right way (by reference), and see the difference with your own eyes.

When this lesson passes, the **Coolant loops** light up: pipes whose flow and colour come from your functions.`,
      tasks: [
        "In Part A write int coolantFlow(double tempC): 120 L/min up to 300 C, above that 120 plus 1.5 per degree over 300 (convert the result to int)",
        "Write void boostByValue(int rpm) and void boostByReference(int& rpm), both adding 300; and std::string loopLabel(const std::string& name, int flow) returning e.g. Loop A: 288 L/min",
        "Write two overloads double average(double a, double b) and double average(double a, double b, double c)",
        "In main build loopNames {A, B, C}, loopTemps {412.0, 388.5, 455.0} and loopFlows with coolantFlow; print the three labels and compute totalFlow",
        "Start pumpRpm at 1200, call each boost function and print the value after each; avgFlow = average of the three flows rounded to one decimal. Send loopNames, loopTemps, loopFlows, pumpRpm, totalFlow and avgFlow to the board",
      ],
      starterAdd: cpp`// ─── ✏️ YOUR TURN ─── Part A: write the functions here (they go above main).
//   int coolantFlow(double tempC)                      120 up to 300 C, otherwise 120 + (tempC - 300) * 1.5 as an int
//   void boostByValue(int rpm)                         rpm += 300;
//   void boostByReference(int& rpm)                    rpm += 300;
//   std::string loopLabel(const std::string& name, int flow)    "Loop A: 288 L/min"
//   double average(double a, double b)                 and an overload with a third parameter c


${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ─── Part B (inside main): use the functions.
// std::vector<std::string> loopNames = {"A", "B", "C"};     std::vector<double> loopTemps = {412.0, 388.5, 455.0};
// loopFlows: push_back(coolantFlow(temp)) for each temperature      -> 288, 252, 352
// Print one label per loop:  Loop A: 288 L/min  ...      int totalFlow = sum of the flows -> 892
// int pumpRpm = 1200;  boostByValue(pumpRpm);  print  Pump after by-value boost: 1200
//                      boostByReference(pumpRpm);  print  Pump after by-reference boost: 1500
// double avgFlow = std::round(average(flowA, flowB, flowC) * 10.0) / 10.0;   print  Average flow: 297.3 L/min
// scene keys: loopNames, loopTemps, loopFlows, pumpRpm, totalFlow, avgFlow
`,
      solutionAdd: cpp`int coolantFlow(double tempC) {
    if (tempC <= 300.0) {
        return 120;
    }
    return 120 + static_cast<int>((tempC - 300.0) * 1.5);
}

void boostByValue(int rpm) {
    rpm += 300;   // changes only this function's own copy
}

void boostByReference(int& rpm) {
    rpm += 300;   // changes the caller's variable
}

std::string loopLabel(const std::string& name, int flow) {
    return "Loop " + name + ": " + std::to_string(flow) + " L/min";
}

double average(double a, double b) {
    return (a + b) / 2.0;
}

double average(double a, double b, double c) {
    return (a + b + c) / 3.0;
}

${MAIN_DIVIDER}

// Lesson 8: the coolant loops.
std::vector<std::string> loopNames = {"A", "B", "C"};
std::vector<double> loopTemps = {412.0, 388.5, 455.0};
std::vector<int> loopFlows;
for (double loopTemp : loopTemps) {
    loopFlows.push_back(coolantFlow(loopTemp));
}

int totalFlow = 0;
for (int i = 0; i < 3; i++) {
    std::cout << loopLabel(loopNames[i], loopFlows[i]) << "\n";
    totalFlow += loopFlows[i];
}

int pumpRpm = 1200;
boostByValue(pumpRpm);
std::cout << "Pump after by-value boost: " << pumpRpm << "\n";
boostByReference(pumpRpm);
std::cout << "Pump after by-reference boost: " << pumpRpm << "\n";

double avgFlow = std::round(average(loopFlows[0], loopFlows[1], loopFlows[2]) * 10.0) / 10.0;
std::cout << "Average flow: " << avgFlow << " L/min\n";

scene("loopNames", loopNames);
scene("loopTemps", loopTemps);
scene("loopFlows", loopFlows);
scene("pumpRpm", pumpRpm);
scene("totalFlow", totalFlow);
scene("avgFlow", avgFlow);`,
      explanation:
        "coolantFlow packages the formula once and returns early for the easy case. boostByValue changes its own copy, so the caller's pumpRpm stays 1200; boostByReference takes int& and changes the caller's variable to 1500. loopLabel takes the name as const std::string& so nothing is copied, and the function cannot change it. The two average functions share a name and are told apart by their parameter lists. Functions sit above main because the compiler must have seen a function before the line that calls it.",
      hints: [
        { id: "h1", title: "A function with a return", content: "int coolantFlow(double tempC) { if (tempC <= 300.0) { return 120; } return 120 + static_cast<int>((tempC - 300.0) * 1.5); } Write the functions in Part A, above the divider line." },
        { id: "h2", title: "Value versus reference", content: "void boostByValue(int rpm) { rpm += 300; } changes a copy. void boostByReference(int& rpm) { rpm += 300; } changes the original: the & after int is the whole difference." },
        { id: "h3", title: "Label and overloads", content: "std::string loopLabel(const std::string& name, int flow) { return \"Loop \" + name + \": \" + std::to_string(flow) + \" L/min\"; } For average write it twice: one version with (double a, double b), one with (double a, double b, double c)." },
      ],
      tests: [
        {
          id: "t1",
          description: "coolantFlow gives the right flow for each loop temperature",
          assertionCode: js`
assert(Array.isArray(scene.loopFlows), "Send the flows with scene(\"loopFlows\", loopFlows);");
assertEqual(JSON.stringify(scene.loopFlows), "[288,252,352]", "loopFlows (120 + 1.5 per degree over 300, as an int: 412 -> 288, 388.5 -> 252, 455 -> 352)");
assertEqual(JSON.stringify(scene.loopNames), '["A","B","C"]', "loopNames");
assertEqual(JSON.stringify(scene.loopTemps), "[412,388.5,455]", "loopTemps");`,
        },
        {
          id: "t2",
          description: "one label per loop is printed using the const& function",
          assertionCode: js`
for (const w of ["Loop A: 288 L/min", "Loop B: 252 L/min", "Loop C: 352 L/min"]) assert(lines.includes(w), 'No line is exactly "' + w + '". Build it with loopLabel(name, flow).');
assertEqual(scene.totalFlow, 892, "totalFlow (288 + 252 + 352)");`,
        },
        {
          id: "t3",
          description: "by value leaves the pump alone, by reference changes it",
          assertionCode: js`
assert(lines.includes("Pump after by-value boost: 1200"), 'Print "Pump after by-value boost: 1200": a function that takes int rpm only changes its own copy.');
assert(lines.includes("Pump after by-reference boost: 1500"), 'Print "Pump after by-reference boost: 1500": the parameter must be int& so the function changes the original.');
assertEqual(scene.pumpRpm, 1500, "pumpRpm (1200, then +300 through the reference)");`,
        },
        {
          id: "t4",
          description: "the overloaded average works for three values",
          assertionCode: js`
assertClose(scene.avgFlow, 297.3, 0.0001, "avgFlow (average of 288, 252 and 352, rounded to one decimal)");
assert(lines.includes("Average flow: 297.3 L/min"), 'Print "Average flow: 297.3 L/min".');`,
        },
      ],
      unlocks: ["rc-coolant"],
      checks: [
        {
          prompt: "What does this print?\n\n~~~cpp\nvoid addOne(int x) { x += 1; }\n\nint main() {\n    int n = 5;\n    addOne(n);\n    std::cout << n;\n}\n~~~",
          question: { type: "number", answer: 5 },
          explanation: "`addOne` received a **copy** of `n`. Changing the copy does not touch the original, so `n` is still 5. Make the parameter `int& x` and it would print 6.",
        },
        {
          prompt: "Which parameter type is best for a function that only *reads* a long `std::string`?",
          question: {
            type: "choice",
            options: ["`const std::string&`", "`std::string`", "`std::string&`", "`int`"],
            answer: 0,
          },
          explanation: "`const std::string&` avoids copying the text and promises not to modify it. Plain `std::string` copies it on every call; plain `std::string&` could modify the caller's string and cannot even take a literal.",
        },
        {
          prompt: "Two functions are both called `area`. Which pair is allowed (an *overload*)?",
          question: {
            type: "choice",
            options: [
              "`int area(int w, int h)` and `double area(double r)`",
              "`int area(int w)` and `double area(int w)`",
              "`int area(int w)` and `int area(int w)`",
              "None: names must be unique",
            ],
            answer: 0,
          },
          explanation: "Overloads must differ in their **parameter lists**. Two functions that differ only in return type would make a call like `area(3)` ambiguous, so the compiler rejects them.",
        },
      ],
    },
  ],
};
