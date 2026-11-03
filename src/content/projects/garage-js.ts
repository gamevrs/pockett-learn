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

A car has a dashboard: a screen where the car tells you what it is doing. Your code needs a way to tell *you* things too. \`console.log()\` is that way: it writes a line of text onto the dashboard panel next to the car.

\`console.log()\` writes a line of output. Text inside quotes is a **string** (a piece of text).

~~~js
console.log("Hello, garage!");
~~~

Press **Run** and the line appears on the dashboard. **Submit** checks your work against the test list and saves your progress.

A **statement** is one complete instruction, and each \`console.log(...)\` is one statement. Every call prints on its own line. The semicolon at the end marks where one statement stops. JavaScript can often guess it for you, but writing it keeps things clear.

Two calls give two lines:

~~~js
console.log("Engine on");
console.log("Lights on");
// dashboard shows:
// Engine on
// Lights on
~~~

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

To **reassign** a variable means to give it a new value later. Reach for \`const\` by default and switch to \`let\` only when you plan to reassign. Trying to reassign a \`const\` is an error, which is a handy safety net:

~~~js
const driver = "Ada";
driver = "Max";   // TypeError: Assignment to constant variable.
~~~

A variable that has a name but no value yet holds \`undefined\`, which simply means "no value yet". You will see it in the starter code below as a placeholder to replace.

### Three basic types

~~~js
const name = "Bolt";    // string
const fuel = 41.5;      // number
const isReady = true;   // boolean
~~~

Strings are text in quotes. JavaScript has a single **number** type for whole numbers and decimals alike. Booleans are \`true\` or \`false\`, lowercase and without quotes.

Names are written in **camelCase**: start lowercase, and capitalise each new word, like \`topSpeed\`.

### Colours as text

Colours on the web are often written as **hex codes**: a \`#\` followed by six characters. Each character is a digit \`0-9\` or a letter \`a-f\`. The six characters are three pairs: how much red, how much green, how much blue (\`00\` is none, \`ff\` is the most).

~~~js
const red = "#ff0000";     // full red, no green, no blue
const green = "#00ff00";   // no red, full green, no blue
const paint = "#ff3b6b";   // a hot pink mix
~~~

### Going further (optional)

\`typeof fuel\` tells you the type as a string, here \`"number"\`.`,
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

\`Math.round()\` rounds to the nearest whole number, and that is all it knows. To keep one decimal place, shift the decimal point right (times 10), round, then shift it back (divide by 10):

~~~js
Math.round(4.567)               // 5
Math.round(4.567 * 10) / 10     // 4.6
~~~

Step by step: 4.567 times 10 is 45.67; rounding gives 46; 46 divided by 10 is 4.6. For two decimals, use 100 instead of 10.

### Template literals mix values into text

Use **backticks** instead of quotes, and put any variable or calculation inside \`\${ }\`:

~~~js
// logs: Top speed: 80 km/h
console.log(\`Top speed: \${speed} km/h\`);
~~~

\`n.toFixed(1)\` formats a number with exactly one decimal, so \`(5).toFixed(1)\` is \`"5.0"\`. It gives back a **string**, so use it for display, not for maths.`,
          mission: `Real engines are about power-to-weight: how much engine push each kilogram of car gets. More horsepower and less weight means a quicker car.

Work out your car's acceleration from its specs and report its 0-100 time. The scene uses your \`acceleration\` number directly: hold **W** and feel the difference.`,
          tasks: [
            "powerToWeight = horsepower / weightKg",
            "acceleration = powerToWeight * 100  (km/h gained per second)",
            "zeroTo100 = 100 / acceleration (seconds to reach 100 km/h), rounded to 1 decimal with Math.round (a number)",
            "Log a line like: 0-100 km/h in 5.0s  (use a template literal and toFixed(1))",
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

Suppose you need "double this number" in twenty places. Retyping \`n * 2\` twenty times is slow and easy to get wrong. Instead you write the recipe once, give it a name, and use that name whenever you need it.

A **function** takes inputs (parameters), does some work, and hands back a result with \`return\`.

~~~js
function double(n) {
  return n * 2;
}

console.log(double(21));   // 42
~~~

- \`function\` starts the definition, then the name and the parameters in brackets.
- The body lives between the curly braces \`{ }\`.
- \`return\` hands the answer back to whoever called the function. Without it, you get \`undefined\` (JavaScript's word for "no value").

### Arrow functions

Modern JavaScript has a shorter way to write the same thing, stored in a \`const\`:

~~~js
const twice = (n) => {
  return n * 2;
};

// one expression? skip the braces
// and the return keyword
const triple = (n) => n * 3;
~~~

Read \`(n) => n * 3\` aloud as "n goes to n times 3". The \`=>\` is the arrow: inputs on its left, the result on its right.

Important: the scene **calls your function for you**, many times a second. You never call \`throttleCurve\` yourself. You write it once, and the car uses it.`,
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
          concepts: ["if / else if / else", "=== and !==", "&& || !", "conditions are booleans", "truthy / falsy"],
          learn: `### Making decisions

A driver answers questions all day: "Is the tank nearly empty? Is the left key held?" The answer decides what happens next. In code, an \`if\` does the same job: it asks a question, and runs a block of code **only when the answer is yes**.

~~~js
const fuel = 15;

if (fuel < 10) {
  console.log("Low fuel!");
} else if (fuel < 30) {
  console.log("Getting low");
} else {
  console.log("Plenty");
}
// prints: Getting low
~~~

JavaScript checks the branches from top to bottom and runs the **first** one whose question is true, then skips the rest. Here \`15 < 10\` is no, \`15 < 30\` is yes, so it prints \`Getting low\`. The final \`else\` has no question: it catches everything the branches above did not.

### Why a condition? What does it give back?

The question inside the brackets is called a **condition**. It is written so the only possible answer is yes or no. JavaScript works the question out and hands back a single value: \`true\` or \`false\`. The \`if\` keyword does nothing clever. It just asks "did I get \`true\`?" and runs its block if so.

You can look at that value yourself:

~~~js
const fuel = 15;
console.log(fuel < 20);      // true
console.log(fuel === 40);    // false
const lowFuel = fuel < 10;   // store the answer in a variable
console.log(lowFuel);        // false
~~~

The mission works the same way. The scene hands your function \`left\` and \`right\`: each one is just a yes/no answer to "is that key held down right now?", so they are already \`true\` or \`false\`.

### Comparing values

\`<\` \`>\` \`<=\` \`>=\` compare sizes. For "is it equal?" use \`===\`, and for "is it different?" use \`!==\`.

~~~js
5 === 5       // true
5 === "5"     // false (a number is not the same as text)
"R" !== "D"   // true
~~~

Always write three equals signs. The shorter \`==\` quietly converts values before comparing (so \`5 == "5"\` is \`true\`), which causes surprises. Note that one \`=\` is not a comparison at all: it stores a value in a variable.

### Combining questions: and, or, not

Sometimes one question is not enough. Three little words join or flip yes/no answers:

- \`a && b\` means AND: both are true. Example: \`left && right\`.
- \`a || b\` means OR: at least one is true. It is written with two vertical bars. Example: \`left || right\`.
- \`!a\` means NOT: it flips true and false. Example: \`!right\`.

So "the left key is held and the right key is NOT held" is:

~~~js
if (left && !right) {
  // only left is held
}
~~~

Reading \`left && !right\` out loud: "left, and not right". If \`left\` is \`true\` and \`right\` is \`false\`, then \`!right\` is \`true\`, and \`true && true\` is \`true\`, so the block runs.

There is no \`0 <= speed <= 120\` shortcut in JavaScript: write both comparisons and join them with \`&&\`: \`speed >= 0 && speed <= 120\`.

### An if inside a function

Your mission puts the decisions inside a function that hands back an answer with \`return\` (you met this last lesson). Here is the same shape with numbers:

~~~js
function sign(n) {
  if (n < 0) {
    return -1;
  } else if (n > 0) {
    return 1;
  } else {
    return 0;
  }
}

console.log(sign(-8));   // -1
console.log(sign(5));    // 1
console.log(sign(0));    // 0
~~~

When a \`return\` runs, the function ends right there. Only one branch ever returns.

### Chain or separate ifs?

Conditions joined with \`&&\` or \`||\` are decided together, as one yes/no. Separate \`if\` statements are independent, so every true one runs. An \`else if\` chain is ordered: the first true branch runs and the rest are skipped. Same speed, different results:

~~~js
const speed = 95;

// Separate ifs: each asks its own question
if (speed > 50) { console.log("fast"); }
if (speed > 90) { console.log("very fast"); }
if (speed > 120) { console.log("too fast"); }
// prints: fast
//         very fast

// One chain: stops at the first yes (biggest limit goes first)
if (speed > 120) {
  console.log("too fast");
} else if (speed > 90) {
  console.log("very fast");
} else if (speed > 50) {
  console.log("fast");
}
// prints: very fast
~~~

Use a chain when the answers exclude each other (one steering angle, one alarm level). Use separate \`if\`s when several things can be true at once.

### Going further (optional)

**How to pick the condition.**

1. Say the question in plain words: "Is only the left key held?"
2. Turn it into a yes/no test: \`left && !right\`.
3. Check the edge value. If the limit is 20, should exactly 20 count? That decides between \`<\` and \`<=\`. Try the limit itself, one below and one above.

**Truthiness.** Put something that is not a boolean in an \`if\` and JavaScript converts it to \`true\` or \`false\` for you. These count as false: \`false\`, \`0\`, \`""\` (empty text), \`null\` and \`undefined\` (both mean "no value"), and \`NaN\` (a failed calculation: "not a number"). Everything else counts as true, including \`"0"\` and \`"false"\`. You will meet more of these as you learn lists and objects; for now, keep conditions as clear yes/no questions.`,
          mission: `Time to steer. The scene calls your \`steer(left, right)\` function on every frame. \`left\` and \`right\` are \`true\` while the matching key is held.

Return a wheel angle in degrees: **negative turns left, positive turns right, 0 is straight**. The moment this works, the track lights up and you can actually drive.

Think of it as three questions in order: is only left held? is only right held? otherwise, go straight.`,
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
          concepts: ["arrays", "for loops", "push()", ".length", "while", "break / continue"],
          learn: `### Why lists and loops?

Picture setting out traffic cones round a track. You could carry one cone, walk, put it down, walk back for the next... or you could keep all the cones in a **box** and tell a helper: "repeat: take a cone, place it, step 20 metres." In code, the box is an **array** (a list of values in order) and the helper is a **loop** (a block of code that repeats). Without them, 100 gates would need 100 lines.

### Arrays hold values in order

~~~js
const gears = [1, 2, 3, 4, 5];
gears.push(6);              // add to the end
console.log(gears.length);  // 6
console.log(gears[0]);      // 1 (the first item)
~~~

- Each item has a position called its **index**. Counting starts at 0, so the first item is \`gears[0]\` and the last of six is \`gears[5]\`.
- \`.length\` is how many items there are.
- \`push(x)\` adds \`x\` at the end.

Notice \`gears\` is a \`const\`, yet \`push\` still works. \`const\` locks the *name* to this array (the box stays on its shelf); the things inside the box can still change.

### When do you reach for a loop?

A loop repeats a block of code. There are three situations:

| Situation | Use |
| --- | --- |
| I know how many times, or I have a list to go through | \`for\` |
| I am waiting for something to change | \`while\` |
| It must run once before the first check | \`do { } while (...)\` (a cousin of \`while\`; you will not need it yet) |

A \`while\` loop asks a yes/no question (a condition, just like \`if\`) before **every** lap, and keeps going while the answer is \`true\`:

~~~js
let fuel = 100;
let laps = 0;
while (fuel > 25) {   // asked again before every lap
  fuel -= 30;         // same as fuel = fuel - 30
  laps++;             // same as laps = laps + 1
}
console.log(\`\${laps} laps, \${fuel} fuel left\`);   // 3 laps, 10 fuel left
~~~

Trace: fuel 100 is more than 25, so lap 1 leaves 70. 70 is more than 25, so lap 2 leaves 40. 40 is more than 25, so lap 3 leaves 10. 10 is not more than 25, so the loop stops.

Whatever is inside a loop must eventually change the answer, or the loop never ends. \`while (fuel > 0) { laps++; }\` never touches \`fuel\`, so it spins forever. If that happens to you here, the run is stopped after a few seconds with a time-out message: fix the loop and run again.

### Repeat with a for loop

A \`for\` loop packs three parts into its brackets, separated by semicolons: where to start, when to keep going, and what to do after each lap.

~~~js
for (let n = 1; n <= 3; n++) {
  console.log(n);           // 1, then 2, then 3
}
~~~

Read it aloud: "start with \`n\` at 1; keep going while \`n\` is at most 3; after each lap add one to \`n\`." (\`n++\` means "add one to n".) It uses \`let\` because the counter changes every lap.

Here is the same loop, lap by lap:

| n | test \`n <= 3\` | what happens | output |
| --- | --- | --- | --- |
| 1 | true | the block runs | \`1\` |
| 2 | true | the block runs | \`2\` |
| 3 | true | the block runs | \`3\` |
| 4 | false | the loop ends | |

### Build an array inside a loop

The counter is a number you can calculate with. This loop pushes a new value every lap:

~~~js
const squares = [];
for (let n = 1; n <= 3; n++) {
  squares.push(n * n);      // lap 1 pushes 1, lap 2 pushes 4, lap 3 pushes 9
}
console.log(squares);       // [1, 4, 9]
~~~

The same idea gives evenly spaced numbers: a counter that goes 1, 2, 3, 4 multiplied by 20 gives 20, 40, 60, 80. That is exactly what the mission needs.

### Walk through an array by index

To visit every item, count the index from 0 up to the last position. The loop stops when the index reaches \`length\`, because the last index is \`length - 1\`:

~~~js
const gates = [20, 40, 60, 80];
for (let i = 0; i < gates.length; i++) {
  console.log(\`Gate \${i + 1}: \${gates[i]}%\`);
}
// Gate 1: 20%
// Gate 2: 40%
// Gate 3: 60%
// Gate 4: 80%
~~~

### break and continue

\`break\` leaves the loop at once. \`continue\` skips the rest of this lap and goes to the next one.

~~~js
for (let i = 0; i < gates.length; i++) {
  const pct = gates[i];
  if (pct === 40) continue;   // skip this gate
  if (pct > 60) break;        // stop entirely
  console.log(pct);
}
// prints 20, then 60
~~~

### Loops need conditions too

Most real loops hold an \`if\`: the loop visits every item and the condition picks which ones count.

~~~js
let late = 0;
for (let i = 0; i < gates.length; i++) {
  if (gates[i] > 50) late++;
}
console.log(late);   // 2 (the 60 and 80 gates)
~~~

### Going further (optional)

Counting patterns. JavaScript has no built-in \`range\`: the stop value is simply where the test fails, so it is never visited.

~~~js
for (let i = 0; i < 5; i++) {}        // i is 0, 1, 2, 3, 4
for (let i = 2; i < 6; i++) {}        // i is 2, 3, 4, 5
for (let i = 0; i < 10; i += 3) {}    // i is 0, 3, 6, 9
for (let i = 5; i > 0; i--) {}        // i is 5, 4, 3, 2, 1  (a countdown)
~~~

Starting at 0 and testing \`i < n\` gives exactly \`n\` laps, and the counter matches the array positions 0 to \`length - 1\`.

There is also a shorter way to visit every item of an array when you do not need the index. It is called \`for...of\`, and the next lesson teaches it.`,
          mission: `A lap needs gates. Rather than typing each one, let a loop place them. The scene reads your \`checkpoints\` array: each number is a percentage of the way around the lap.

Place a gate every 20%: 20, 40, 60, 80. Drive through them for a split-time flash.

Hint from the lesson: let the loop counter go 1, 2, 3, 4, and push the counter times 20 each lap.`,
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

Think of a shop price list: you do not ask for "item number 2", you ask for "the price of tea". An **object** works like that list. It maps **keys** (the names, like \`tea\`) to values (like \`2\`).

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

Just like with arrays, a \`const\` object is a locked box: the name always points to the same object, but you can still add or change what is inside it.

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

\`Math.min(4, 2, 9)\` is \`2\`: you give it separate numbers (each one is an **argument**, a value you hand to a function) and it picks the smallest. To hand it an array instead, **spread** the array out into separate arguments with \`...\`. So \`Math.min(...[4, 2, 9])\` is the same as \`Math.min(4, 2, 9)\`:

~~~js
const times = [31.2, 29.8, 30.5];
Math.min(...times)    // 29.8
Math.max(...times)    // 31.2
~~~

### Rounding the average

The average above is \`total / times.length\`. To keep two decimals, use the same trick as in the engine lesson: multiply by 100, round, divide by 100.

~~~js
Math.round(30.5 * 100) / 100   // 30.5
Math.round(30.1666 * 100) / 100   // 30.17
~~~

### Going further (optional)

Arrays also have built-in functions of their own, called methods. \`times.reduce((sum, t) => sum + t, 0)\` adds all the items up in one line, using an arrow function.`,
          mission: `Soft tires grip better but wear out. Hard tires grip less but last. Store the compounds in an object, choose one, and the scene applies its grip: more grip means the car holds corners at higher speed.

Then crunch your lap times for the pit board. Round the average to 2 decimals with the multiply-by-100, round, divide-by-100 trick.`,
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

Imagine you want ten dogs. Each one remembers its own name and each knows how to bark. Writing that out ten separate times would be silly. Instead you draw up one blueprint, then stamp out as many dogs as you like. Your car needs an autopilot "brain" that remembers its own setting (how sharply to turn) and knows how to steer. That is what a **class** gives you.

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
- \`this\` is the instance itself, so \`this.name\` is its own data. You store values on \`this\` because an ordinary variable inside the constructor vanishes when the constructor finishes, while \`this.name\` stays with the instance for as long as it lives.
- Methods are functions written inside the class, without the \`function\` keyword. Call them with a dot: \`rex.speak()\`.

A method can also take a parameter and mix it with the instance's own data, exactly what your mission needs:

~~~js
class Dog {
  constructor(name) {
    this.name = name;
  }

  greet(other) {
    return \`\${this.name} says hi to \${other}\`;
  }
}

const rex = new Dog("Rex");
console.log(rex.greet("Fido"));   // Rex says hi to Fido
~~~

### Sensors

The car has three distance sensors. They arrive as an **object** with values from 0 (wall right here) to 1 (clear road):

~~~js
{ left: 0.4, front: 1.0, right: 0.9 }
~~~

Read them with a dot, like \`sensors.left\`.

A picture in words: with \`{ left: 0.2, front: 1.0, right: 0.8 }\` the left wall is close (0.2) and the right side is open (0.8). The car should turn toward the open side, which is the right. The difference \`right - left\` is \`0.8 - 0.2 = 0.6\`, a positive number, and a positive angle means "turn right". Multiply it by a **gain** (how strongly to react) of 10 and you get \`6\`.`,
          mission: `Final build: a car that drives itself. Create an \`Autopilot\` class whose \`steer(sensors)\` method looks at the left and right sensors and steers toward the side with more room.

Steering = (right - left) * gain. Press **P** in the scene to hand the wheel to your class.

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
