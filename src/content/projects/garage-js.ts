import type { Project } from "@/engine/types";

/**
 * Turbo Garage in JavaScript: the same garage scene as the Python course, driven by JavaScript.
 *
 * Authoring notes:
 *  - Code without backticks goes in js`...` (String.raw). Code that uses template literals goes in a
 *    normal template with \` and \${ escaped. Never put a backslash escape in learner code.
 *  - Prose uses ~~~js fences and \` for inline code.
 *  - The scene asks for Python-style names; the JavaScript runtime also tries the camelCase form,
 *    so learners write idiomatic names:
 *      carName, paint, topSpeed, hasTurbo, acceleration, grip, tire, bestLap, averageLap, checkpoints
 *      hooks: throttleCurve(pedal), steer(left, right), autopilot.steer(sensors), autopilot.throttle(sensors)
 *  - Every lesson's code is appended to one file, so a name is declared once in the whole course.
 */
const js = String.raw;

export const garageJs: Project = {
  slug: "garage-js",
  language: "javascript",
  title: "Turbo Garage in JavaScript",
  tagline: "Same car, new language. Wire it up in JavaScript.",
  pitch:
    "The ghostly blueprint is back in the dark garage, and this time JavaScript is the wiring. Every concept you learn bolts a real part onto the car: paint, engine, pedals, steering, lap gates, tires, and finally an autopilot class that drives itself.",
  emoji: "🏎️",
  difficulty: "Beginner",
  hours: 3,
  sceneId: "garage",
  accent: { from: "#ffd23d", to: "#ff6a3d" },
  controls: ["W / ↑ gas", "S / ↓ brake", "A D / ← → steer", "P autopilot", "R reset"],
  skills: [
    "console.log & strings",
    "const, let & types",
    "math & template literals",
    "functions & arrow functions",
    "if / else & ===",
    "arrays & loops",
    "objects & for...of",
    "classes",
  ],
  features: [
    { id: "ignition", title: "Ignition", blurb: "The car boots up and your console.log() lines hit the dashboard.", emoji: "🔑" },
    { id: "paint", title: "Paint & plate", blurb: "Your colour and name are on the car.", emoji: "🎨" },
    { id: "engine", title: "Engine", blurb: "Hold W: the car actually drives, using your numbers.", emoji: "⚡" },
    { id: "throttle", title: "Throttle pedal", blurb: "Your arrow function shapes how the pedal feels.", emoji: "🦶" },
    { id: "steering", title: "Steering", blurb: "A and D turn the wheels through YOUR steer() function.", emoji: "🎮" },
    { id: "checkpoints", title: "Checkpoints", blurb: "Lap gates appear on the track, built by your loop.", emoji: "🏁" },
    { id: "tires", title: "Tires & pit board", blurb: "Grip and lap stats from your object and array.", emoji: "🛞" },
    { id: "autopilot", title: "Autopilot", blurb: "Press P and your Autopilot class drives the car.", emoji: "🤖" },
  ],
  chapters: [
    {
      id: "wake",
      title: "Wake the machine",
      blurb: "Boot it, paint it, and give it an engine.",
      lessons: [
        {
          id: "garage-js-1-ignition",
          title: "Ignition",
          minutes: 5,
          xp: 50,
          concepts: ["console.log()", "strings", "comments"],
          learn: `### Talking to the dashboard

\`console.log()\` writes a line of output. Text inside quotes is a **string**.

~~~js
console.log("Hello, garage!");
~~~

Every call prints on its own line. The semicolon at the end marks where one statement stops. JavaScript can often guess it for you, but writing it keeps things clear.

### Comments

Anything after \`//\` on a line is a **comment**: a note for humans that JavaScript skips. Wrap longer notes in \`/* ... */\`.

~~~js
// this line is ignored
/* so is
   all of this */
console.log("This one runs");
~~~

Strings can use double quotes \`"like this"\` or single quotes \`'like this'\`. Close with the same quote you opened.`,
          mission: `Your car is a ghostly blueprint in a dark garage. Nothing works yet, not even the on-board computer.

Boot it by logging three startup lines. The moment they run, the headlights come on and your lines scroll across the dashboard.`,
          tasks: [
            "Log BOOT SEQUENCE START",
            "Log ENGINE: OK",
            "Log SYSTEMS GO",
            "Run to watch the car wake up, then Submit to lock it in",
          ],
          starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 1: boot the car's computer.
// Use console.log() to send these 3 lines to the dashboard:
//   BOOT SEQUENCE START
//   ENGINE: OK
//   SYSTEMS GO
`,
          solutionAdd: js`console.log("BOOT SEQUENCE START");
console.log("ENGINE: OK");
console.log("SYSTEMS GO");`,
          explanation:
            "Each console.log() call writes one line. The text must match exactly, capital letters included, because the dashboard shows precisely what you log.",
          hints: [
            { id: "h1", title: "Syntax", content: 'A log call looks like this: console.log("some text");' },
            { id: "h2", title: "First line", content: 'console.log("BOOT SEQUENCE START");' },
            { id: "h3", title: "All three", content: "Write one console.log() per line, each with its own text in quotes." },
          ],
          tests: [
            { id: "t1", description: "Logs BOOT SEQUENCE START", assertionCode: js`assert(stdout.includes("BOOT SEQUENCE START"), "Log the exact text BOOT SEQUENCE START");` },
            { id: "t2", description: "Logs ENGINE: OK", assertionCode: js`assert(stdout.includes("ENGINE: OK"), "Log the exact text ENGINE: OK");` },
            { id: "t3", description: "Logs SYSTEMS GO", assertionCode: js`assert(stdout.includes("SYSTEMS GO"), "Log the exact text SYSTEMS GO");` },
            { id: "t4", description: "Uses three separate lines", assertionCode: js`assert(stdout.trim().split("\n").length >= 3, "Use one console.log() per line (three lines total)");` },
          ],
          unlocks: ["ignition"],
        },
        {
          id: "garage-js-2-paint",
          title: "Paint & plate",
          minutes: 8,
          xp: 60,
          concepts: ["const & let", "string / number / boolean", "typeof"],
          learn: `### Variables are labelled boxes

A **variable** gives a name to a value so you can use it later. JavaScript has two everyday ways to make one:

~~~js
// const: the name always keeps this value
const driver = "Ada";

// let: the value is allowed to change
let laps = 0;
laps = laps + 1;   // fine, laps is a let
~~~

Reach for \`const\` by default and switch to \`let\` only when you plan to reassign. Trying to reassign a \`const\` is an error, which is a handy safety net.

### Three basic types

~~~js
const name = "Bolt";    // string
const fuel = 41.5;      // number
const isReady = true;   // boolean
~~~

Strings are text in quotes. JavaScript has a single **number** type for whole numbers and decimals alike. Booleans are \`true\` or \`false\`, lowercase and without quotes.

\`typeof fuel\` tells you the type as a string, here \`"number"\`. Names are written in **camelCase**: start lowercase, and capitalise each new word, like \`topSpeed\`.

Colours on the web are often **hex codes**: a string like \`"#ff3b6b"\` (red, green and blue, in base 16).`,
          mission: `The car is awake but anonymous. Give it an identity: a name, a paint job, a top speed and a turbo flag.

The scene reads these exact names, so spelling and capitals matter: \`carName\`, not \`carname\`. The moment you Run, the car repaints itself and the name plate changes.`,
          tasks: [
            "carName: a string, at least 2 letters (e.g. \"Bolt\")",
            "paint: a hex colour string like \"#ff3b6b\"",
            "topSpeed: a whole number between 100 and 300 (km/h)",
            "hasTurbo: true or false",
          ],
          starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 2: give your car an identity.
// Replace each undefined with a real value.
const carName = undefined;   // a string, e.g. "Bolt"
const paint = undefined;     // a hex colour string, e.g. "#ff3b6b"
const topSpeed = undefined;  // a whole number in km/h, between 100 and 300
const hasTurbo = undefined;  // true or false
`,
          solutionAdd: js`const carName = "Bolt";
const paint = "#ff3b6b";
const topSpeed = 180;
const hasTurbo = true;`,
          explanation:
            "JavaScript works out the type from the value: quotes make a string, digits make a number, true/false make a boolean. These never change while the car runs, so const is the right choice. The scene looks them up by name, which is how carName, paint and topSpeed configure your car.",
          hints: [
            { id: "h1", title: "Replace undefined", content: "Each line has undefined as a placeholder. Swap it for a real value and keep the semicolon." },
            { id: "h2", title: "Strings need quotes", content: 'carName = "Bolt" and paint = "#ff3b6b" both need quotes. topSpeed does not.' },
            { id: "h3", title: "Booleans", content: "true and false are lowercase in JavaScript and have no quotes." },
          ],
          tests: [
            { id: "t1", description: "carName is a string of 2+ characters", assertionCode: js`assert(typeof carName === "string" && carName.length >= 2, "carName must be text in quotes, at least 2 letters");` },
            { id: "t2", description: "paint is a hex colour like #ff3b6b", assertionCode: js`assert(typeof paint === "string" && /^#[0-9a-fA-F]{6}$/.test(paint), 'paint must look like "#ff3b6b" (a # then 6 hex characters)');` },
            { id: "t3", description: "topSpeed is a whole number from 100 to 300", assertionCode: js`assert(typeof topSpeed === "number", "topSpeed must be a number (no quotes)");
assert(Number.isInteger(topSpeed), "topSpeed should be a whole number (no decimal point)");
assert(topSpeed >= 100 && topSpeed <= 300, "topSpeed should be between 100 and 300");` },
            { id: "t4", description: "hasTurbo is true or false", assertionCode: js`assert(typeof hasTurbo === "boolean", "hasTurbo must be true or false (lowercase, no quotes)");` },
          ],
          unlocks: ["paint"],
        },
        {
          id: "garage-js-3-engine",
          title: "Engine room",
          minutes: 10,
          xp: 80,
          concepts: ["arithmetic", "template literals", "Math.round()"],
          learn: `### JavaScript is a calculator

~~~js
2 + 3       // 5
10 - 4      // 6
6 * 7       // 42
9 / 2       // 4.5  (keeps decimals)
9 % 2       // 1    (remainder)
2 ** 3      // 8    (power)
~~~

Store results in variables and build on them:

~~~js
const speed = 80;
const double = speed * 2;   // 160
~~~

### Rounding

\`Math.round()\` rounds to the nearest whole number. To keep one decimal place, scale up, round, then scale back down:

~~~js
Math.round(4.567)               // 5
Math.round(4.567 * 10) / 10     // 4.6
~~~

### Template literals mix values into text

Use **backticks** instead of quotes, and put any expression inside \`\${ }\`:

~~~js
// logs: Top speed: 80 km/h
console.log(\`Top speed: \${speed} km/h\`);
~~~

\`n.toFixed(1)\` formats a number with exactly one decimal, so \`(5).toFixed(1)\` is \`"5.0"\`. It gives back a **string**, so use it for display, not for maths.`,
          mission: `Real engines are about power-to-weight. More horsepower and less weight means faster acceleration.

Work out your car's acceleration from its specs and report its 0-100 time. The scene uses your \`acceleration\` number directly: hold **W** and feel the difference.`,
          tasks: [
            "powerToWeight = horsepower / weightKg",
            "acceleration = powerToWeight * 100  (km/h gained per second)",
            "zeroTo100 = seconds to reach 100 km/h, rounded to 1 decimal (a number)",
            "Log a line like: 0-100 km/h in 5.0s  (use a template literal)",
          ],
          starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 3: do the engine maths.
const horsepower = 220;
const weightKg = 1100;

const powerToWeight = undefined;  // horsepower divided by weightKg
const acceleration = undefined;   // powerToWeight times 100
const zeroTo100 = undefined;      // 100 / acceleration, rounded to 1 decimal place

// log a line like:  0-100 km/h in 5.0s   (use a template literal!)
`,
          solutionAdd: `const horsepower = 220;
const weightKg = 1100;

const powerToWeight = horsepower / weightKg;
const acceleration = powerToWeight * 100;
const zeroTo100 = Math.round((100 / acceleration) * 10) / 10;

console.log(\`0-100 km/h in \${zeroTo100.toFixed(1)}s\`);`,
          explanation:
            "Dividing 220 by 1100 gives 0.2, and multiplying by 100 scales it into km/h per second, which the scene uses as the engine's punch. The multiply-round-divide trick keeps zeroTo100 a number, and toFixed(1) only formats it for the dashboard so it always shows one decimal.",
          hints: [
            { id: "h1", title: "Dividing", content: "const powerToWeight = horsepower / weightKg;" },
            { id: "h2", title: "Rounding", content: "Math.round((100 / acceleration) * 10) / 10 rounds to one decimal place." },
            { id: "h3", title: "Template literal", content: "console.log(`0-100 km/h in ${zeroTo100.toFixed(1)}s`);  (those are backticks, not quotes)" },
          ],
          tests: [
            { id: "t1", description: "powerToWeight = horsepower / weightKg", assertionCode: js`assertClose(powerToWeight, horsepower / weightKg, 1e-9, "powerToWeight should be horsepower divided by weightKg");` },
            { id: "t2", description: "acceleration = powerToWeight * 100", assertionCode: js`assertClose(acceleration, powerToWeight * 100, 1e-9, "acceleration should be powerToWeight times 100");` },
            { id: "t3", description: "zeroTo100 is 100 / acceleration, rounded", assertionCode: js`assert(typeof zeroTo100 === "number", "zeroTo100 should be a number. toFixed() gives a string, so round with Math.round instead");
assertClose(zeroTo100, Math.round((100 / acceleration) * 10) / 10, 1e-9, "zeroTo100 should be 100 / acceleration, rounded to 1 decimal");` },
            { id: "t4", description: "Logs the 0-100 time with a template literal", assertionCode: js`assert(stdout.includes("0-100 km/h in") && stdout.includes(String(zeroTo100)), "Log a line like: 0-100 km/h in 5.0s");` },
          ],
          unlocks: ["engine"],
        },
      ],
    },
    {
      id: "control",
      title: "Take control",
      blurb: "Write the functions that shape how the car feels.",
      lessons: [
        {
          id: "garage-js-4-throttle",
          title: "Throttle pedal",
          minutes: 8,
          xp: 80,
          concepts: ["functions", "arrow functions", "return"],
          learn: `### Functions are reusable recipes

A **function** takes inputs (parameters), does some work, and hands back a result with \`return\`.

~~~js
function double(n) {
  return n * 2;
}

console.log(double(21));   // 42
~~~

- \`function\` starts the definition, then the name and the parameters in brackets.
- The body lives between the curly braces \`{ }\`.
- \`return\` hands the answer back to whoever called the function. Without it, you get \`undefined\`.

### Arrow functions

Modern JavaScript has a shorter way to write the same thing, stored in a \`const\`:

~~~js
const double = (n) => {
  return n * 2;
};

// one expression? skip the braces
// and the return keyword
const triple = (n) => n * 3;
~~~

Important: the scene **calls your function for you**, many times a second. You write it once, and the car uses it.`,
          mission: `A pedal that jumps straight from 0% to 100% power makes a twitchy car. Racing cars use a **throttle curve**: half-pressing the pedal gives *less than* half the power, so the car is smooth and controllable.

Finish the arrow function \`throttleCurve(pedal)\`: it receives the pedal position from 0 to 1 and returns the power to use. Squaring the pedal is a classic progressive curve.`,
          tasks: [
            "Fill in the arrow function throttleCurve with one parameter, pedal",
            "It should return pedal squared (pedal * pedal)",
            "throttleCurve(0.5) must be 0.25",
          ],
          starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 4: shape the pedal.
const throttleCurve = (pedal) => {
  // pedal goes from 0 (foot off) to 1 (floored)
  // return how much engine power to use
};
`,
          solutionAdd: js`const throttleCurve = (pedal) => pedal * pedal;`,
          explanation:
            "The scene calls throttleCurve(pedal) every frame with the live pedal position and uses what you return as engine power. pedal * pedal keeps 0 at 0 and 1 at 1 but makes the middle gentle. Because the body is a single expression, the short arrow form returns it without braces or a return keyword.",
          hints: [
            { id: "h1", title: "Return something", content: "Inside the braces, add a line: return pedal * pedal;" },
            { id: "h2", title: "Short form", content: "const throttleCurve = (pedal) => pedal * pedal;" },
          ],
          tests: [
            { id: "t1", description: "throttleCurve is a function", assertionCode: js`assert(typeof throttleCurve === "function", "Define a function called throttleCurve");` },
            { id: "t2", description: "Foot off gives zero power", assertionCode: js`assertEqual(throttleCurve(0), 0, "throttleCurve(0) should be 0");` },
            { id: "t3", description: "Floored gives full power", assertionCode: js`assertEqual(throttleCurve(1), 1, "throttleCurve(1) should be 1");` },
            { id: "t4", description: "Half pedal gives a quarter of the power", assertionCode: js`assertClose(throttleCurve(0.5), 0.25, 1e-9, "throttleCurve(0.5) should be 0.25 (pedal squared)");` },
          ],
          unlocks: ["throttle"],
        },
        {
          id: "garage-js-5-steering",
          title: "Steering wheel",
          minutes: 12,
          xp: 100,
          concepts: ["if / else if / else", "=== and !==", "&& || !"],
          learn: `### Making decisions

\`if\` runs a block only when its condition is true.

~~~js
if (fuel < 10) {
  console.log("Low fuel!");
} else if (fuel < 30) {
  console.log("Getting low");
} else {
  console.log("Plenty");
}
~~~

JavaScript checks the branches top to bottom and runs the **first** one that is true.

### Comparisons

\`<\` \`>\` \`<=\` \`>=\` compare sizes. For equality, always use the strict versions: \`===\` (equal) and \`!==\` (not equal). They also compare the type, so \`5 === "5"\` is \`false\`. The loose \`==\` tries to convert types first, which causes surprises.

### Combining conditions

\`&&\` means AND, \`||\` means OR, and \`!\` flips true and false.

~~~js
if (left && !right) {
  // left is held and right is not
}
~~~`,
          mission: `Time to steer. The scene calls your \`steer(left, right)\` function on every frame. \`left\` and \`right\` are \`true\` while the matching key is held.

Return a wheel angle in degrees: **negative turns left, positive turns right, 0 is straight**. The moment this works, the track lights up and you can actually drive.`,
          tasks: [
            "Write the function steer(left, right)",
            "Only left held: return a negative angle (e.g. -30)",
            "Only right held: return a positive angle (e.g. 30)",
            "Neither or both held: return 0",
          ],
          starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 5: steer the car.
function steer(left, right) {
  // left / right are true while that key is held
  // return degrees: negative = left, positive = right, 0 = straight
}
`,
          solutionAdd: js`function steer(left, right) {
  if (left && !right) {
    return -30;
  } else if (right && !left) {
    return 30;
  } else {
    return 0;
  }
}`,
          explanation:
            "Holding both keys cancels out, which is why the first two branches check that the other key is NOT held. The else branch catches both 'neither' and 'both'. Try 20 for a calmer car, or 35 for the sharpest the wheels allow.",
          hints: [
            { id: "h1", title: "Structure", content: "Use if, else if and else: three branches for left, right and everything else." },
            { id: "h2", title: "Only left", content: "if (left && !right) { return -30; }" },
            { id: "h3", title: "Both keys", content: "When both are held, neither 'only' branch is true, so the else branch returns 0." },
          ],
          tests: [
            { id: "t1", description: "Only left returns a negative angle", assertionCode: js`assert(steer(true, false) < 0, "steer(true, false) should be negative (turn left)");` },
            { id: "t2", description: "Only right returns a positive angle", assertionCode: js`assert(steer(false, true) > 0, "steer(false, true) should be positive (turn right)");` },
            { id: "t3", description: "Neither key goes straight", assertionCode: js`assertEqual(steer(false, false), 0, "steer(false, false) should be 0");` },
            { id: "t4", description: "Both keys cancel out", assertionCode: js`assertEqual(steer(true, true), 0, "steer(true, true) should be 0");` },
            { id: "t5", description: "Left and right are symmetrical", assertionCode: js`assert(steer(true, false) === -steer(false, true), "Left and right should use the same size angle");` },
          ],
          unlocks: ["steering"],
        },
      ],
    },
    {
      id: "race",
      title: "Race day",
      blurb: "Gates, tires, and a car that drives itself.",
      lessons: [
        {
          id: "garage-js-6-checkpoints",
          title: "Checkpoint gates",
          minutes: 10,
          xp: 90,
          concepts: ["arrays", "for loops", "push()", ".length"],
          learn: `### Arrays hold values in order

~~~js
const gears = [1, 2, 3, 4, 5];
gears.push(6);              // add to the end
console.log(gears.length);  // 6
console.log(gears[0]);      // 1 (index 0)
~~~

Notice \`gears\` is a \`const\`, yet \`push\` still works. \`const\` locks the *name* to this array; the array's contents can still change.

### Repeat with a for loop

A classic \`for\` loop has three parts: where to start, when to keep going, and what to do after each pass.

~~~js
for (let n = 1; n <= 3; n++) {
  console.log(n);           // 1, then 2, then 3
}
~~~

\`n++\` adds one to \`n\`. It uses \`let\` because the counter changes every pass.

Build an array inside a loop:

~~~js
const squares = [];
for (let n = 1; n <= 3; n++) {
  squares.push(n * n);      // [1, 4, 9]
}
~~~`,
          mission: `A lap needs gates. Rather than typing each one, let a loop place them. The scene reads your \`checkpoints\` array: each number is a percentage of the way around the lap.

Place a gate every 20%: 20, 40, 60, 80. Drive through them for a split-time flash.`,
          tasks: [
            "Start with an empty array: const checkpoints = []",
            "Use a for loop to push 20, 40, 60, 80",
            "totalGates = checkpoints.length",
            "Log a line like: 4 gates armed",
          ],
          starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 6: let a loop place the gates.
const checkpoints = [];

// for (let step = ...; ...; ...) {
//   add a gate every 20% of the lap -> 20, 40, 60, 80
// }

const totalGates = undefined;  // how many gates are in the array?
// log a line like:  4 gates armed
`,
          solutionAdd: `const checkpoints = [];
for (let step = 1; step <= 4; step++) {
  checkpoints.push(step * 20);
}

const totalGates = checkpoints.length;
console.log(\`\${totalGates} gates armed\`);`,
          explanation:
            "The loop runs with step = 1, 2, 3 and 4, and multiplying by 20 turns those into 20, 40, 60, 80. .length counts the items, and the template literal reports the count on the dashboard.",
          hints: [
            { id: "h1", title: "The loop", content: "for (let step = 1; step <= 4; step++) { ... }  gives step = 1, 2, 3, 4" },
            { id: "h2", title: "Inside the loop", content: "checkpoints.push(step * 20);" },
            { id: "h3", title: "Counting", content: "const totalGates = checkpoints.length;  then  console.log(`${totalGates} gates armed`);" },
          ],
          tests: [
            { id: "t1", description: "checkpoints is [20, 40, 60, 80]", assertionCode: js`assertEqual(checkpoints, [20, 40, 60, 80], "checkpoints should be [20, 40, 60, 80]");` },
            { id: "t2", description: "totalGates counts the gates", assertionCode: js`assert(totalGates === checkpoints.length && totalGates === 4, "totalGates should be checkpoints.length, which is 4");` },
            { id: "t3", description: "Logs how many gates are armed", assertionCode: js`assert(stdout.includes("4 gates armed"), "Log: 4 gates armed");` },
          ],
          unlocks: ["checkpoints"],
        },
        {
          id: "garage-js-7-tires",
          title: "Tire strategy",
          minutes: 12,
          xp: 100,
          concepts: ["objects", "for...of", "Math.min & spread"],
          learn: `### Objects look things up by name

An **object** maps keys to values.

~~~js
const prices = { coffee: 3, tea: 2 };
// dot: when you know the key
console.log(prices.tea);      // 2

// brackets: key stored in a variable
const drink = "coffee";
console.log(prices[drink]);   // 3

// add a new key
prices.cake = 5;
~~~

### Walk an array with for...of

\`for...of\` hands you each item in turn, no counter needed:

~~~js
const times = [31.2, 29.8, 30.5];
let total = 0;
for (const t of times) {
  total += t;   // total = total + t
}
// the average:
console.log(total / times.length);
~~~

### Smallest and biggest

\`Math.min(4, 2, 9)\` is \`2\`. To hand it an array, **spread** the array into separate arguments with \`...\`:

~~~js
Math.min(...times)    // 29.8
Math.max(...times)    // 31.2
~~~

Arrays also have built-in methods. \`times.reduce((sum, t) => sum + t, 0)\` adds them up in one line, using an arrow function.`,
          mission: `Soft tires grip better but wear out. Hard tires grip less but last. Store the compounds in an object, choose one, and the scene applies its grip: more grip means the car holds corners at higher speed.

Then crunch your lap times for the pit board.`,
          tasks: [
            "tires: soft 1.15, medium 1.0, hard 0.85",
            "tire: pick one of the three names",
            "grip = look up your tire in the tires object",
            "bestLap = the fastest lap, averageLap = mean rounded to 2 decimals",
          ],
          starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 7: choose your tires and read the clock.
const tires = undefined;  // an object: soft -> 1.15, medium -> 1.0, hard -> 0.85
const tire = undefined;   // pick "soft", "medium" or "hard"
const grip = undefined;   // look your tire up in the tires object

const lapTimes = [31.2, 29.8, 30.5, 29.1];
const bestLap = undefined;     // the smallest lap time

// add up lapTimes with a for...of loop, then:
const averageLap = undefined;  // the mean, rounded to 2 decimal places
`,
          solutionAdd: js`const tires = { soft: 1.15, medium: 1.0, hard: 0.85 };
const tire = "soft";
const grip = tires[tire];

const lapTimes = [31.2, 29.8, 30.5, 29.1];
const bestLap = Math.min(...lapTimes);

let lapTotal = 0;
for (const time of lapTimes) {
  lapTotal += time;
}
const averageLap = Math.round((lapTotal / lapTimes.length) * 100) / 100;`,
          explanation:
            "tires[tire] uses the chosen name as the key, so changing one string swaps the whole setup. Spreading lapTimes into Math.min finds the best lap, and the for...of loop builds a running total for the average. lapTotal uses let because it changes on every pass. Change tire to \"hard\" and watch the car slide more.",
          hints: [
            { id: "h1", title: "Object syntax", content: "const tires = { soft: 1.15, medium: 1.0, hard: 0.85 };" },
            { id: "h2", title: "Lookup", content: "const grip = tires[tire];  (brackets, because the key is stored in a variable)" },
            { id: "h3", title: "Average", content: "let lapTotal = 0; for (const time of lapTimes) { lapTotal += time; }  then  Math.round((lapTotal / lapTimes.length) * 100) / 100" },
          ],
          tests: [
            { id: "t1", description: "tires holds the three compounds", assertionCode: js`assertEqual(tires, { soft: 1.15, medium: 1.0, hard: 0.85 }, "tires should map soft, medium and hard to 1.15, 1.0 and 0.85");` },
            { id: "t2", description: "tire is one of the compounds", assertionCode: js`assert(typeof tire === "string" && ["soft", "medium", "hard"].includes(tire), 'tire must be "soft", "medium" or "hard"');` },
            { id: "t3", description: "grip comes from the object", assertionCode: js`assert(tires && grip === tires[tire], "grip should be tires[tire]");` },
            { id: "t4", description: "bestLap is the fastest time", assertionCode: js`assertEqual(bestLap, Math.min(...lapTimes), "bestLap should be the smallest value in lapTimes");` },
            { id: "t5", description: "averageLap is the rounded mean", assertionCode: js`const mean = lapTimes.reduce((sum, t) => sum + t, 0) / lapTimes.length;
assertClose(averageLap, Math.round(mean * 100) / 100, 1e-9, "averageLap should be the mean of lapTimes, rounded to 2 decimals");` },
          ],
          unlocks: ["tires"],
        },
        {
          id: "garage-js-8-autopilot",
          title: "Autopilot",
          minutes: 15,
          xp: 150,
          concepts: ["classes", "constructor", "this", "methods", "new"],
          learn: `### Classes bundle data and behaviour

A **class** is a blueprint. An **instance** is one thing built from it with \`new\`.

~~~js
class Dog {
  constructor(name) {
    // data stored on the instance
    this.name = name;
  }

  speak() {
    return \`\${this.name} says woof\`;
  }
}

const rex = new Dog("Rex");
console.log(rex.speak());  // Rex says woof
~~~

- \`constructor\` runs once, when \`new\` creates an instance.
- \`this\` is the instance itself, so \`this.name\` is its own data.
- Methods are functions written inside the class, without the \`function\` keyword. Call them with a dot: \`rex.speak()\`.

### Sensors

The car has three distance sensors. They arrive as an **object** with values from 0 (wall right here) to 1 (clear road):

~~~js
{ left: 0.4, front: 1.0, right: 0.9 }
~~~

Read them with a dot, like \`sensors.left\`, or unpack several at once: \`const { left, right } = sensors;\``,
          mission: `Final build: a car that drives itself. Create an \`Autopilot\` class whose \`steer(sensors)\` method looks at the left and right sensors and steers toward the side with more room.

Steering = (right − left) × gain. Press **P** in the scene to hand the wheel to your class.

Bonus: add a \`throttle(sensors)\` method returning 0 to 1 and the car will use it to brake for corners.`,
          tasks: [
            "Class Autopilot whose constructor(gain) stores this.gain",
            "Method steer(sensors) returning (right - left) * gain",
            "Create the instance: const autopilot = new Autopilot(60)",
            "Run, press P in the scene, and watch it lap",
          ],
          starterAdd: js`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 8: build the autopilot.
class Autopilot {
  constructor(gain) {
    // remember the gain on the instance
  }

  steer(sensors) {
    // sensors looks like { left: 0.4, front: 1.0, right: 0.9 }
    // return (right - left) * gain
  }
}

const autopilot = undefined;  // create one with a gain of 60
`,
          solutionAdd: js`class Autopilot {
  constructor(gain) {
    this.gain = gain;
  }

  steer(sensors) {
    const error = sensors.right - sensors.left;
    return error * this.gain;
  }
}

const autopilot = new Autopilot(60);`,
          explanation:
            "More room on the right than the left gives a positive error, which steers right, and the gain scales how hard. The scene calls autopilot.steer(sensors) every frame with live readings, so this.gain is read from your instance each time: your class is the car's brain.",
          hints: [
            { id: "h1", title: "Store the gain", content: "Inside the constructor: this.gain = gain;" },
            { id: "h2", title: "Read a sensor", content: "sensors.right and sensors.left are numbers from 0 to 1. Use this.gain inside a method." },
            { id: "h3", title: "Make one", content: "const autopilot = new Autopilot(60);" },
          ],
          tests: [
            { id: "t1", description: "Autopilot remembers its gain", assertionCode: js`const a = new Autopilot(10);
assertEqual(a.gain, 10, "the constructor should store gain as this.gain");` },
            { id: "t2", description: "More room on the right steers right", assertionCode: js`const a = new Autopilot(10);
assertClose(a.steer({ left: 0.2, front: 1.0, right: 0.8 }), 6, 1e-9, "steer should return (right - left) * gain");` },
            { id: "t3", description: "More room on the left steers left", assertionCode: js`const a = new Autopilot(10);
assert(a.steer({ left: 0.9, front: 1.0, right: 0.1 }) < 0, "More room on the left should give a negative angle");` },
            { id: "t4", description: "Centered means straight", assertionCode: js`const a = new Autopilot(10);
assertClose(a.steer({ left: 0.5, front: 1.0, right: 0.5 }), 0, 1e-9, "Equal room on both sides should return 0");` },
            { id: "t5", description: "autopilot is an Autopilot instance", assertionCode: js`assert(autopilot instanceof Autopilot, "Create it with: const autopilot = new Autopilot(60);");` },
          ],
          unlocks: ["autopilot"],
        },
      ],
    },
  ],
};
