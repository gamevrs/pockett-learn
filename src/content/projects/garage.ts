import type { Project } from "@/engine/types";

/**
 * Turbo Garage — build a car's brain in Python and watch it come alive.
 *
 * Authoring notes (apply to every project file):
 *  - Python goes in String.raw`...` (no backticks, no ${ inside). Prose goes in normal templates;
 *    escape inline-code backticks as \` and use ~~~python fences for code blocks.
 *  - The scene reads these names from the learner's program:
 *      car_name, paint, top_speed, acceleration, grip, tire, best_lap, average_lap, checkpoints
 *      hooks: throttle_curve(pedal), steer(left, right), autopilot.steer(sensors), autopilot.throttle(sensors)
 */
const py = String.raw;

export const garage: Project = {
  slug: "garage",
  title: "Turbo Garage",
  tagline: "Build a car's brain. Then drive it.",
  pitch:
    "Start with a dark garage and a ghostly blueprint. Every Python concept you learn bolts a real part onto the car — paint, engine, pedals, steering, lap gates, tires, and finally an autopilot that drives itself.",
  emoji: "🏎️",
  difficulty: "Beginner",
  hours: 3,
  sceneId: "garage",
  accent: { from: "#ff6a3d", to: "#ff2d87" },
  controls: ["W / ↑ gas", "S / ↓ brake", "A D / ← → steer", "P autopilot", "R reset"],
  skills: ["print & strings", "variables & types", "math & f-strings", "functions", "if / elif / else", "for loops & lists", "dictionaries", "classes"],
  features: [
    { id: "ignition", title: "Ignition", blurb: "The car boots up and your print() lines hit the dashboard.", emoji: "🔑" },
    { id: "paint", title: "Paint & plate", blurb: "Your colour and name are on the car.", emoji: "🎨" },
    { id: "engine", title: "Engine", blurb: "Hold W — the car actually drives, using your numbers.", emoji: "⚡" },
    { id: "throttle", title: "Throttle pedal", blurb: "Your function shapes how the pedal feels.", emoji: "🦶" },
    { id: "steering", title: "Steering", blurb: "A and D turn the wheels through YOUR steer() function.", emoji: "🎮" },
    { id: "checkpoints", title: "Checkpoints", blurb: "Lap gates appear on the track, built by your loop.", emoji: "🏁" },
    { id: "tires", title: "Tires & pit board", blurb: "Grip and lap stats from your dictionary and list.", emoji: "🛞" },
    { id: "autopilot", title: "Autopilot", blurb: "Press P and your Autopilot class drives the car.", emoji: "🤖" },
  ],
  chapters: [
    {
      id: "wake",
      title: "Wake the machine",
      blurb: "Boot it, paint it, and give it an engine.",
      lessons: [
        {
          id: "garage-1-ignition",
          title: "Ignition",
          minutes: 5,
          xp: 50,
          concepts: ["print()", "strings", "comments"],
          learn: `### Talking to the dashboard

A program is a list of instructions for the computer, written one per line. The first useful thing you can tell a computer to do is *speak*, so you can see what it is up to. In Python, \`print\` is how it speaks.

\`print()\` sends text to the screen. Text in quotes is called a **string**. The brackets and both quote marks are required.

~~~python
print("Hello, garage!")
~~~

The screen shows:

~~~text
Hello, garage!
~~~

The screen shows exactly what is inside the quotes, capital letters and spaces included. The quote marks themselves are not shown.

Each \`print()\` makes a new line. Lines that start with \`#\` are **comments**: notes for humans that Python skips.

~~~python
# this line is ignored
print("This one runs")
~~~

Strings can use double quotes \`"like this"\` or single quotes \`'like this'\`. Close the quote you opened.

### How this screen works

- Type your code in the editor.
- Press **Run**. Python reads your code from the top, one line at a time, and everything you \`print\` shows up on the car's dashboard. Run as often as you like; nothing is lost.
- Press **Submit** when you think it is right. Submit checks your work against the tests list and unlocks the next lesson.
- Sometimes you will see red text. That is an **error**, and it is a hint, not a punishment. Read the last line: it says what went wrong and which line number. For example, forgetting the closing quote in \`print("Hi)\` ends with a message about a string that was never finished. Fix the line and Run again. Everyone sees these, every day.
- Lines that say \`...\` in the starter code mean "fill this in". Delete the dots and write your own code there.`,
          mission: `Your car is a ghostly blueprint in a dark garage. Nothing works yet, not even the computer.

Boot the on-board computer by printing three startup lines. The moment they run, the headlights come on and the lines appear on the dashboard.`,
          tasks: [
            "Print BOOT SEQUENCE START",
            "Print ENGINE: OK",
            "Print SYSTEMS GO",
            "Run to watch the car wake up, then Submit to lock it in",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 1: boot the car's computer.
# Use print() to send these 3 lines to the dashboard:
#   BOOT SEQUENCE START
#   ENGINE: OK
#   SYSTEMS GO
`,
          solutionAdd: py`print("BOOT SEQUENCE START")
print("ENGINE: OK")
print("SYSTEMS GO")`,
          explanation:
            "Each print() call writes one line. The strings must match exactly, including capital letters, because the dashboard shows precisely what you print.",
          hints: [
            { id: "h1", title: "Syntax", content: 'A print call looks like this: print("some text")' },
            { id: "h2", title: "First line", content: 'print("BOOT SEQUENCE START")' },
            { id: "h3", title: "All three", content: 'Write one print() per line, each with its own text in quotes.' },
          ],
          tests: [
            { id: "t1", description: "Prints BOOT SEQUENCE START", assertionCode: `assert "BOOT SEQUENCE START" in __stdout__, "Print the exact text BOOT SEQUENCE START"` },
            { id: "t2", description: "Prints ENGINE: OK", assertionCode: `assert "ENGINE: OK" in __stdout__, "Print the exact text ENGINE: OK"` },
            { id: "t3", description: "Prints SYSTEMS GO", assertionCode: `assert "SYSTEMS GO" in __stdout__, "Print the exact text SYSTEMS GO"` },
            { id: "t4", description: "Uses three separate lines", assertionCode: `assert len(__stdout__.strip().splitlines()) >= 3, "Use one print() per line (three lines total)"` },
          ],
          unlocks: ["ignition"],
          checks: [
            {
              prompt: "What does `print(\"Hello\")` do?",
              question: {
                type: "choice",
                options: ["Sends the text Hello to the screen", "Stores the word Hello for later", "Ignores the line, like a comment", "Prints the quote marks too"],
                answer: 0,
              },
              explanation: "`print()` sends whatever you give it to the screen. The quotes only mark where the text starts and ends, so they are not printed.",
            },
            {
              prompt: "Which of these lines does Python skip completely?",
              question: {
                type: "choice",
                options: ["`print(\"skip me\")`", "`# print(\"skip me\")`", "`print('skip me')`"],
                answer: 1,
              },
              explanation: "Everything after a `#` is a comment: a note for humans that Python never runs.",
            },
          ],
        },
        {
          id: "garage-2-paint",
          title: "Paint & plate",
          minutes: 8,
          xp: 60,
          concepts: ["variables", "str / int / float / bool"],
          learn: `### Variables are labelled boxes

A **variable** gives a name to a value so you can use it later. Picture a box with a sticky label on it: the label is \`top_speed\`, and \`top_speed = 180\` puts 180 in the box. Later you can look in the box just by saying its label.

~~~python
driver = "Ada"      # str   (text)
laps = 3            # int   (whole number)
fuel = 41.5         # float (decimal number)
is_ready = True     # bool  (True or False)
~~~

Use \`=\` to store a value. Here it means "put this in the box", not "is equal to". Names are lowercase with underscores, like \`top_speed\`. You can put a new value in the box any time (\`laps = 4\`) and the old one is replaced.

You can check a type by printing it. Python figures the type out from the value.

~~~python
print(type(laps))     # <class 'int'>
~~~

Colours on the web are often **hex codes**: a \`#\` followed by six letters or digits, like \`"#ff3b6b"\`. The first two set how red, the next two how green, the last two how blue. You can copy a code like that without understanding it.

In the starter code, \`...\` means "fill this in". Delete it and write your own value.`,
          mission: `The car is awake but anonymous. Give it an identity: a name, a paint job, a top speed and a turbo flag.

The scene reads these exact variable names, so spelling matters. The moment you Run, the car repaints itself and the name plate changes.`,
          tasks: [
            "car_name: a string, at least 2 letters (e.g. \"Bolt\")",
            "paint: a hex colour string like \"#ff3b6b\"",
            "top_speed: an int between 100 and 300 (km/h)",
            "has_turbo: True or False",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 2: give your car an identity.
car_name = ...        # a string, e.g. "Bolt"
paint = ...           # a hex colour string, e.g. "#ff3b6b"
top_speed = ...       # a whole number in km/h, between 100 and 300
has_turbo = ...       # True or False
`,
          solutionAdd: py`car_name = "Bolt"
paint = "#ff3b6b"
top_speed = 180
has_turbo = True`,
          explanation:
            "Python picks the type from the value: quotes make a str, digits make an int, True/False make a bool. The scene looks variables up by name, so car_name, paint and top_speed are how your car is configured.",
          hints: [
            { id: "h1", title: "Replace the dots", content: "Each line has ... as a placeholder. Replace it with a real value." },
            { id: "h2", title: "Strings need quotes", content: 'car_name = "Bolt" and paint = "#ff3b6b" both need quotes. top_speed does not.' },
            { id: "h3", title: "Booleans", content: "True and False start with a capital letter and have no quotes." },
          ],
          tests: [
            { id: "t1", description: "car_name is a string of 2+ characters", assertionCode: `assert isinstance(car_name, str) and len(car_name) >= 2, "car_name must be text in quotes, at least 2 letters"` },
            { id: "t2", description: "paint is a hex colour like #ff3b6b", assertionCode: `assert isinstance(paint, str) and paint.startswith("#") and len(paint) == 7, "paint must look like \\"#ff3b6b\\" (a # then 6 characters)"
int(paint[1:], 16)` },
            { id: "t3", description: "top_speed is a whole number from 100 to 300", assertionCode: `assert type(top_speed) is int, "top_speed must be a whole number (no quotes, no decimal point)"
assert 100 <= top_speed <= 300, "top_speed should be between 100 and 300"` },
            { id: "t4", description: "has_turbo is True or False", assertionCode: `assert type(has_turbo) is bool, "has_turbo must be True or False (capital letter, no quotes)"` },
          ],
          unlocks: ["paint"],
          checks: [
            {
              prompt: "What type is the value `41.5`?",
              question: { type: "text", answer: ["float"], placeholder: "str, int, float or bool" },
              explanation: "A number with a decimal point is a `float`. Whole numbers like `3` are `int`, text in quotes is `str`, and `True` / `False` are `bool`.",
            },
            {
              prompt: "Which line stores the text `Bolt` in a variable called `car_name`?",
              question: {
                type: "choice",
                options: ["`car_name = Bolt`", "`car_name = \"Bolt\"`", "`\"car_name\" = Bolt`", "`car_name == \"Bolt\"`"],
                answer: 1,
              },
              explanation: "Text needs quotes, and a single `=` stores a value. Without quotes Python would look for a variable named `Bolt`, and `==` compares instead of storing.",
            },
          ],
        },
        {
          id: "garage-3-engine",
          title: "Engine room",
          minutes: 10,
          xp: 80,
          concepts: ["arithmetic", "f-strings", "round()"],
          learn: `### Python is a calculator

An engine is all numbers: power, weight, speed, time. A computer is a very fast calculator, so you can let it do the sums. Here is how you write them (\`*\` means times and \`/\` means divided by):

~~~python
print(2 + 3)      # 5
print(10 - 4)     # 6
print(6 * 7)      # 42
print(9 / 2)      # 4.5   (division always gives a number with a decimal point)
~~~

Store results in variables, and use them in later maths:

~~~python
speed = 80
double = speed * 2
print(double)     # 160
~~~

### f-strings mix values into text

Put an \`f\` before the opening quote and wrap a variable name in curly braces. Python swaps the name for its value:

~~~python
print(f"Top speed: {speed} km/h")
~~~

The screen shows:

~~~text
Top speed: 80 km/h
~~~

### Rounding

Division often gives long decimals. \`round(number, places)\` trims a number to that many decimal places:

~~~python
print(round(3.14159, 1))    # 3.1
~~~

### Worked example for the mission

You will work out how long a car takes to go from 0 to 100 km/h (the "0-100 time", a classic way to compare cars). With 220 horsepower and 1100 kg:

- \`220 / 1100\` is \`0.2\` power per kilogram.
- Times 100 gives \`20\`: the car gains 20 km/h every second.
- To reach 100 km/h it needs \`100 / 20\`, which is \`5.0\` seconds (time = distance to cover divided by speed gained per second).

### Going further (optional)

Three more operators you may meet later:

~~~python
print(9 // 2)     # 4   how many whole 2s fit in 9
print(9 % 2)      # 1   what is left over after taking those whole 2s out
print(2 ** 3)     # 8   2 times itself 3 times (a power)
~~~`,
          mission: `Real engines are about power-to-weight. More horsepower and less weight means faster acceleration.

Compute your car's acceleration from its specs and report its 0-100 time: how many seconds the car takes to go from standing still to 100 km/h. The scene uses your \`acceleration\` number: hold **W** and feel the difference.`,
          tasks: [
            "power_to_weight = horsepower / weight_kg",
            "acceleration = power_to_weight * 100  (km/h gained per second)",
            "zero_to_100 = how many seconds to reach 100 km/h, rounded to 1 decimal",
            "Print a line like: 0-100 km/h in 5.0s  (use an f-string)",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 3: do the engine maths.
horsepower = 220
weight_kg = 1100

power_to_weight = ...   # horsepower divided by weight_kg
acceleration = ...      # power_to_weight times 100
zero_to_100 = ...       # 100 / acceleration, rounded to 1 decimal place

# print a line like:  0-100 km/h in 5.0s   (use an f-string!)
`,
          solutionAdd: py`horsepower = 220
weight_kg = 1100

power_to_weight = horsepower / weight_kg
acceleration = power_to_weight * 100
zero_to_100 = round(100 / acceleration, 1)

print(f"0-100 km/h in {zero_to_100}s")`,
          explanation:
            "A division gives a float, so power_to_weight is 0.2. Multiplying by 100 scales it into km/h per second, which the scene uses directly. An f-string drops zero_to_100 into the printed message.",
          hints: [
            { id: "h1", title: "Dividing", content: "power_to_weight = horsepower / weight_kg" },
            { id: "h2", title: "Rounding", content: "round(100 / acceleration, 1) gives one decimal place." },
            { id: "h3", title: "f-string", content: 'print(f"0-100 km/h in {zero_to_100}s")' },
          ],
          tests: [
            { id: "t1", description: "power_to_weight = horsepower / weight_kg", assertionCode: `assert abs(power_to_weight - horsepower / weight_kg) < 1e-9, "power_to_weight should be horsepower divided by weight_kg"` },
            { id: "t2", description: "acceleration = power_to_weight * 100", assertionCode: `assert abs(acceleration - power_to_weight * 100) < 1e-9, "acceleration should be power_to_weight times 100"` },
            { id: "t3", description: "zero_to_100 is 100 / acceleration, rounded", assertionCode: `assert zero_to_100 == round(100 / acceleration, 1), "zero_to_100 should be round(100 / acceleration, 1)"` },
            { id: "t4", description: "Prints the 0-100 time with an f-string", assertionCode: `assert "0-100 km/h in" in __stdout__ and str(zero_to_100) in __stdout__, "Print a line like: 0-100 km/h in 5.0s"` },
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
          id: "garage-4-throttle",
          title: "Throttle pedal",
          minutes: 8,
          xp: 80,
          concepts: ["def", "parameters", "return"],
          learn: `### Functions are reusable recipes

Your car will need the same calculation again and again, every moment it drives. Instead of copying the same lines everywhere, you give the steps a name once and reuse them. A **function** is a recipe with a name: it takes an input, does some work, and gives back a result.

~~~python
def double(n):
    return n * 2

print(double(21))   # 42
~~~

- \`def\` starts the definition (it means "define a function"). Then comes the name, then brackets with the input's name inside, then a colon.
- The input name inside the brackets (\`n\`) is a **parameter**: a stand-in for whatever value is handed in later.
- The lines indented underneath are the **body**, the steps of the recipe. Indent with 4 spaces (or press Tab). Indentation is how Python knows which lines belong to the function.
- \`return\` hands the answer back to whoever asked for it.

To use the function, **call** it: write its name and brackets with a real value inside. \`double(21)\` runs the recipe with \`n\` set to 21, and the call is replaced by the answer, \`42\`.

### return is not print

\`print\` shows something on the screen for a human. \`return\` gives a value back to the code that called the function, so it can be used in more maths.

~~~python
def double(n):
    return n * 2

result = double(5) + 1
print(result)       # 11
~~~

If \`double\` had used \`print\` instead of \`return\`, nothing would come back to add 1 to. A function the scene calls needs to \`return\`, because the scene wants the answer, not a message.

In this lesson the scene will **call your function for you** many times a second. You write it once, and the car uses it. To check it yourself, print a call: \`print(double(21))\` shows \`42\`.`,
          mission: `A pedal that goes straight from 0% to 100% power makes a twitchy car. Racing cars use a **throttle curve**: half-pressing the pedal gives *less than* half the power, so it is smooth and controllable.

Write \`throttle_curve(pedal)\`: it receives the pedal position from 0.0 to 1.0 and returns the power to use. Squaring the pedal (multiplying it by itself) is a classic smooth curve: 0.5 becomes 0.5 * 0.5 = 0.25, but 1.0 stays 1.0. Use \`return\`, not \`print\`.`,
          tasks: [
            "Define a function named throttle_curve with one parameter, pedal",
            "It should return pedal squared (pedal * pedal)",
            "throttle_curve(0.5) must be 0.25",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 4: shape the pedal.
def throttle_curve(pedal):
    # pedal goes from 0.0 (foot off) to 1.0 (floored)
    # return how much engine power to use
    ...
`,
          solutionAdd: py`def throttle_curve(pedal):
    return pedal * pedal`,
          explanation:
            "The scene calls throttle_curve(pedal) every frame with the live pedal position and uses what you return as engine power. pedal * pedal keeps 0 at 0 and 1 at 1, but makes the middle gentle.",
          hints: [
            { id: "h1", title: "Replace ...", content: "Delete the ... line and write a return statement in its place (keep the indentation)." },
            { id: "h2", title: "The formula", content: "return pedal * pedal" },
          ],
          tests: [
            { id: "t1", description: "throttle_curve exists", assertionCode: `assert callable(throttle_curve), "Define a function called throttle_curve"` },
            { id: "t2", description: "Foot off gives zero power", assertionCode: `assert throttle_curve(0) == 0, "throttle_curve(0) should be 0"` },
            { id: "t3", description: "Floored gives full power", assertionCode: `assert throttle_curve(1) == 1, "throttle_curve(1) should be 1"` },
            { id: "t4", description: "Half pedal gives a quarter of the power", assertionCode: `assert abs(throttle_curve(0.5) - 0.25) < 1e-9, "throttle_curve(0.5) should be 0.25 (pedal squared)"` },
          ],
          unlocks: ["throttle"],
        },
        {
          id: "garage-5-steering",
          title: "Steering wheel",
          minutes: 12,
          xp: 100,
          concepts: ["if / elif / else", "comparisons", "booleans"],
          learn: `### Making decisions

A driver makes choices all day: *if the light is red, stop; otherwise, go.* Your code needs the same power: run some lines only when something is true. Python's word for it is \`if\`.

~~~python
fuel = 8
if fuel < 10:
    print("Low fuel!")
~~~

The screen shows \`Low fuel!\`. The indented line only runs when \`fuel < 10\` is true. If \`fuel\` were 50, nothing would print.

#### Why a condition? What does it give back?

A car answers questions all day: *is the fuel under 10%? is the left key down?* A **condition** is one of those questions, written so that the only possible answers are yes or no. Python works the question out and hands back a single value: \`True\` or \`False\`. The \`if\` then asks one thing: "did I get True?"

You can print a condition any time to see exactly what it answers:

~~~python
fuel = 8
print(fuel < 10)       # True
print(fuel == 50)      # False
~~~

Notice \`==\` asks "are these equal?" while a single \`=\` stores a value. The other comparisons are \`!=\` (not equal), \`<\` (less than), \`>\` (greater than), \`<=\` (less than or equal) and \`>=\` (greater than or equal).

### Several choices: if, elif, else

\`elif\` means "otherwise, if". \`else\` means "none of the above". Python checks top to bottom and runs only the **first** branch whose condition is true.

~~~python
fuel = 20
if fuel < 10:
    print("Low fuel!")
elif fuel < 30:
    print("Getting low")
else:
    print("Plenty")
~~~

With \`fuel = 20\` the screen shows \`Getting low\`: the first condition is False, the second is True, so the \`else\` is skipped.

### Combining questions: and, or, not

- \`a and b\` is True only when **both** are True.
- \`a or b\` is True when **at least one** is True.
- \`not a\` flips the answer: True becomes False and False becomes True.

~~~python
print(not True)            # False
print(not False)           # True
print(True and False)      # False
print(True or False)       # True
~~~

Put it together. If the left key is held and the right key is not:

~~~python
left = True
right = False
print(left and not right)  # True   (left is held AND right is NOT held)

right = True
print(left and not right)  # False  (both held)
~~~

### Separate ifs versus one chain

Separate \`if\` statements are each checked on their own. A chain (\`if\` / \`elif\` / \`else\`) stops at the first true branch. Compare them with \`fuel = 8\`:

~~~python
# two separate ifs: both are true, both run
if fuel < 10:
    print("Low fuel!")
if fuel < 30:
    print("Getting low")
# prints:
# Low fuel!
# Getting low

# one chain: the first true branch wins, the rest are skipped
if fuel < 10:
    print("Low fuel!")
elif fuel < 30:
    print("Getting low")
# prints:
# Low fuel!
~~~

### Deciding inside a function

Your mission is a function that picks an answer with \`if\` and sends it back with \`return\`. As soon as a \`return\` runs, the function is finished, so the lines below it are skipped.

~~~python
def sign(n):
    if n < 0:
        return "negative"
    elif n > 0:
        return "positive"
    else:
        return "zero"

print(sign(-5))    # negative
print(sign(7))     # positive
print(sign(0))     # zero
~~~

### How to pick the condition

1. Say the question in plain words: "Should the car turn left?"
2. Turn it into a yes/no test: \`left and not right\`.
3. Check the edge value. If the limit is 10, should exactly 10 count? \`fuel < 10\` says no, \`fuel <= 10\` says yes. Try the edge in your head before you run it.

### Going further (optional)

More kinds of conditions you will meet once you know lists, text methods and \`None\` (a special value meaning "nothing here"):

| Kind | Example | What it asks |
| --- | --- | --- |
| Between two limits | \`0 <= speed < 120\` | Is it inside a range? (one chained check) |
| Membership | \`"turbo" in upgrades\`, \`"x" not in name\` | Is it inside this list or string? |
| Text tests | \`code.isdigit()\`, \`name.startswith("GT")\` | A built-in text check that answers yes or no. |
| Identity | \`driver is None\` | Is it the very same thing as \`None\`? |
| Truthiness | \`if upgrades:\` | Is the list non-empty? |

**Truthiness.** Any value can sit in an \`if\`. These count as false: \`False\`, \`None\`, \`0\`, \`0.0\`, \`""\` (empty text), \`[]\` (empty list), \`{}\` (empty dictionary). Nearly everything else counts as true.

**\`==\` versus \`is\`.** \`==\` asks "do these have equal values?". \`is\` asks "are these the exact same object in memory?". For numbers and text use \`==\`; use \`is\` mainly for \`None\`.

Printing a condition's type shows what it is: \`print(type(fuel < 10))\` gives \`<class 'bool'>\`, short for boolean, a True or False value.`,
          mission: `Time to steer. The scene calls your \`steer(left, right)\` function on every frame. \`left\` and \`right\` are True while the matching key is held.

Return a wheel angle in degrees: **negative turns left, positive turns right, 0 is straight**. The wheels can turn at most 35 degrees either way. The moment this works, the track lights up and you can actually drive.`,
          tasks: [
            "Define steer(left, right)",
            "Only left held: return a negative angle (e.g. -30)",
            "Only right held: return a positive angle (e.g. 30)",
            "Neither or both held: return 0",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 5: steer the car.
def steer(left, right):
    # left / right are True while that key is held
    # return degrees: negative = left, positive = right, 0 = straight
    ...
`,
          solutionAdd: py`def steer(left, right):
    if left and not right:
        return -30
    elif right and not left:
        return 30
    else:
        return 0`,
          explanation:
            "Holding both keys cancels out, which is why the first two branches check the other key is NOT held. The else branch catches 'neither' and 'both'. Try changing 30 to 20 for a calmer car, or 35 for the sharpest the wheels allow.",
          hints: [
            { id: "h1", title: "Structure", content: "Use if, elif and else: three branches for left, right and everything else." },
            { id: "h2", title: "Only left", content: "if left and not right: return -30" },
            { id: "h3", title: "Both keys", content: "When both are held, neither 'only' branch is true, so the else branch returns 0." },
          ],
          tests: [
            { id: "t1", description: "Only left returns a negative angle", assertionCode: `assert steer(True, False) < 0, "steer(True, False) should be negative (turn left)"` },
            { id: "t2", description: "Only right returns a positive angle", assertionCode: `assert steer(False, True) > 0, "steer(False, True) should be positive (turn right)"` },
            { id: "t3", description: "Neither key goes straight", assertionCode: `assert steer(False, False) == 0, "steer(False, False) should be 0"` },
            { id: "t4", description: "Both keys cancel out", assertionCode: `assert steer(True, True) == 0, "steer(True, True) should be 0"` },
            { id: "t5", description: "Left and right are symmetrical", assertionCode: `assert steer(True, False) == -steer(False, True), "Left and right should use the same size angle"` },
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
          id: "garage-6-checkpoints",
          title: "Checkpoint gates",
          minutes: 10,
          xp: 90,
          concepts: ["for loops", "range()", "lists", "append()"],
          learn: `### Repeat with loops

To place 4 gates on the track you could write 4 lines. For 400 gates, you would not want to. A **loop** repeats a block of code for you.

First you need somewhere to keep many values. A **list** holds several values in order, written in square brackets:

~~~python
gears = [1, 2, 3, 4, 5]
gears.append(6)       # add one more to the end
print(len(gears))     # 6   (len = how many items)
print(gears)          # [1, 2, 3, 4, 5, 6]
~~~

A **for loop** repeats its indented block once for every value it is given. \`range(a, b)\` produces the whole numbers from \`a\` up to, but **not including**, \`b\`. The loop name (\`n\` below) is called the **loop variable**: on each repeat it holds the next value.

~~~python
for n in range(1, 4):
    print(n)
~~~

The screen shows:

~~~text
1
2
3
~~~

Here is what happens on each repeat of \`for n in range(1, 4): print(n * 20)\`:

| Repeat | n | Another number left? | Output |
| --- | --- | --- | --- |
| 1 | 1 | yes | 20 |
| 2 | 2 | yes | 40 |
| 3 | 3 | yes | 60 |
| end | | no, so the loop stops | |

Now build a list inside a loop. Start with an empty list \`[]\` and add to it on every repeat:

~~~python
squares = []
for n in range(1, 4):
    squares.append(n * n)
print(squares)        # [1, 4, 9]
~~~

That is exactly the shape of your mission: an empty list, a loop, and an \`append\` that does a little maths with the loop variable.

### Going further (optional)

**Counting from zero.** Every item in a list has a position number, and the first position is \`0\`, not 1. Square brackets with a position pick one item:

~~~python
tires = ["soft", "medium", "hard"]
print(tires[0])       # soft
print(tires[2])       # hard
~~~

**More about range.** \`range(n)\` gives exactly \`n\` numbers starting at 0, so they match list positions. A third number sets the step size. \`list(...)\` turns the run of numbers into a list so you can print it:

~~~python
print(list(range(5)))          # [0, 1, 2, 3, 4]
print(list(range(2, 6)))       # [2, 3, 4, 5]
print(list(range(0, 10, 3)))   # [0, 3, 6, 9]
print(list(range(5, 0, -1)))   # [5, 4, 3, 2, 1]
~~~

**Three ways to loop over a list.** \`print(i, tires[i])\` prints two things on one line, separated by a space. \`enumerate\` hands you a position and an item together, and \`i, tire\` catches both:

~~~python
for i in range(len(tires)):          # by position
    print(i, tires[i])
for tire in tires:                   # the items directly
    print(tire)
for i, tire in enumerate(tires):     # position and item
    print(i, tire)
~~~

The first loop prints \`0 soft\`, \`1 medium\`, \`2 hard\`. The second prints \`soft\`, \`medium\`, \`hard\`. The third prints the same as the first. Looping over the items directly is usually simplest.

**while loops.** A \`for\` loop says "do this once per item, or a set number of times". A \`while\` loop says "keep going until something changes". It asks its condition (the same yes/no question as in an \`if\`) before every repeat. \`fuel -= 8\` means "take 8 off fuel" and \`laps += 1\` means "add 1 to laps". A \`while\` loop must change what its condition looks at, or it never stops:

~~~python
fuel = 30
laps = 0
while fuel > 10:
    fuel -= 8
    laps += 1
print(laps, fuel)     # 3 6
~~~

Trace: fuel 30 (repeat, 22), 22 (repeat, 14), 14 (repeat, 6), 6 is not above 10 (stop).

**break and continue.** \`break\` leaves the loop at once. \`continue\` skips straight to the next repeat.

~~~python
for g in [20, 40, 60, 80]:
    if g == 40:
        continue      # skip 40
    if g > 70:
        break         # stop completely at 80
    print(g)
~~~

This prints \`20\` and then \`60\`.`,
          mission: `A lap needs gates. Rather than typing each one, let a loop place them. The scene reads your \`checkpoints\` list: each number is a percentage of the way around the lap.

Place a gate every 20%: 20, 40, 60, 80. Drive through them for a split-time flash.`,
          tasks: [
            "Start with an empty list: checkpoints = []",
            "Use a for loop with range() to append 20, 40, 60, 80",
            "total_gates = len(checkpoints)",
            "Print a line like: 4 gates armed",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 6: let a loop place the gates.
checkpoints = []

# for ... in range(...):
#     add a gate every 20% of the lap -> 20, 40, 60, 80

total_gates = ...     # how many gates are in the list?
# print a line like:  4 gates armed
`,
          solutionAdd: py`checkpoints = []
for step in range(1, 5):
    checkpoints.append(step * 20)

total_gates = len(checkpoints)
print(f"{total_gates} gates armed")`,
          explanation:
            "range(1, 5) gives 1, 2, 3, 4. Multiplying by 20 turns those into 20, 40, 60, 80. len() counts the list items, and the f-string reports the count.",
          hints: [
            { id: "h1", title: "The loop", content: "for step in range(1, 5):  gives step = 1, 2, 3, 4" },
            { id: "h2", title: "Inside the loop", content: "checkpoints.append(step * 20)" },
            { id: "h3", title: "Counting", content: 'total_gates = len(checkpoints) and print(f"{total_gates} gates armed")' },
          ],
          tests: [
            { id: "t1", description: "checkpoints is [20, 40, 60, 80]", assertionCode: `assert checkpoints == [20, 40, 60, 80], f"checkpoints should be [20, 40, 60, 80] but is {checkpoints}"` },
            { id: "t2", description: "total_gates counts the gates", assertionCode: `assert total_gates == len(checkpoints) == 4, "total_gates should be len(checkpoints), which is 4"` },
            { id: "t3", description: "Prints how many gates are armed", assertionCode: `assert "4 gates armed" in __stdout__, "Print: 4 gates armed"` },
          ],
          unlocks: ["checkpoints"],
        },
        {
          id: "garage-7-tires",
          title: "Tire strategy",
          minutes: 12,
          xp: 100,
          concepts: ["dictionaries", "min / sum / len", "lookup"],
          learn: `### Dictionaries look things up by name

A real dictionary lets you look up a word to find its meaning. A Python **dictionary** lets you look up a name to find a value. The name you look up with is the **key**; what you get back is the **value**. Each key-and-value together is a **pair**.

~~~python
prices = {"coffee": 3, "tea": 2}
print(prices["tea"])      # 2
~~~

In the pair \`"tea": 2\`, the key is \`"tea"\` and the value is \`2\`. Curly braces wrap the dictionary, a colon joins each key to its value, and commas separate pairs. Square brackets with a key look the value up. Add a new pair by assigning to a new key:

~~~python
prices["cake"] = 5        # add a new pair
print(prices)             # {'coffee': 3, 'tea': 2, 'cake': 5}
~~~

The key can also be held in a variable. Python looks inside the variable first, then uses what it finds as the key:

~~~python
item = "tea"
print(prices[item])       # 2
~~~

That is how your mission picks a tire's grip: \`tire\` holds a name, and the dictionary turns the name into a number. If you ask for a key that is not in the dictionary, Python stops with a red \`KeyError\` naming the missing key, so check your spelling.

### Handy list helpers

Your lap times live in a list. Python has built-in helpers to summarise it:

~~~python
times = [31.2, 29.8, 30.5]
print(min(times))                      # 29.8   (smallest)
print(sum(times))                      # 91.5   (all added up)
print(len(times))                      # 3      (how many)
print(round(sum(times) / len(times), 2))   # 30.5
~~~

The last line is the **average**, also called the **mean**: add everything up, then divide by how many there are.`,
          mission: `Soft tires grip better but wear out. Hard tires grip less but last. Store the compounds in a dictionary, choose one, and the scene applies its grip: more grip means the car holds corners at higher speed.

Then crunch your lap times for the pit board.`,
          tasks: [
            "tires: soft 1.15, medium 1.0, hard 0.85",
            "tire: pick one of the three names",
            "grip = look up your tire in the tires dictionary",
            "best_lap = the fastest lap, average_lap = mean rounded to 2 decimals",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 7: choose your tires and read the clock.
tires = ...      # a dictionary: "soft" -> 1.15, "medium" -> 1.0, "hard" -> 0.85
tire = ...       # pick "soft", "medium" or "hard"
grip = ...       # look your tire up in the tires dictionary

lap_times = [31.2, 29.8, 30.5, 29.1]
best_lap = ...       # the smallest lap time
average_lap = ...    # the mean, rounded to 2 decimal places
`,
          solutionAdd: py`tires = {"soft": 1.15, "medium": 1.0, "hard": 0.85}
tire = "soft"
grip = tires[tire]

lap_times = [31.2, 29.8, 30.5, 29.1]
best_lap = min(lap_times)
average_lap = round(sum(lap_times) / len(lap_times), 2)`,
          explanation:
            "tires[tire] looks up the grip number using the chosen name as the key. min() finds the best lap, and sum()/len() gives the mean. Change tire to \"hard\" and watch the car slide more.",
          hints: [
            { id: "h1", title: "Dictionary syntax", content: 'tires = {"soft": 1.15, "medium": 1.0, "hard": 0.85}' },
            { id: "h2", title: "Lookup", content: "grip = tires[tire]" },
            { id: "h3", title: "Average", content: "average_lap = round(sum(lap_times) / len(lap_times), 2)" },
          ],
          tests: [
            { id: "t1", description: "tires holds the three compounds", assertionCode: `assert tires == {"soft": 1.15, "medium": 1.0, "hard": 0.85}, "tires should map soft, medium and hard to 1.15, 1.0 and 0.85"` },
            { id: "t2", description: "tire is one of the compounds", assertionCode: `assert tire in tires, 'tire must be "soft", "medium" or "hard"'` },
            { id: "t3", description: "grip comes from the dictionary", assertionCode: `assert grip == tires[tire], "grip should be tires[tire]"` },
            { id: "t4", description: "best_lap is the fastest time", assertionCode: `assert best_lap == min(lap_times), "best_lap should be min(lap_times)"` },
            { id: "t5", description: "average_lap is the rounded mean", assertionCode: `assert abs(average_lap - round(sum(lap_times) / len(lap_times), 2)) < 1e-9, "average_lap should be round(sum(lap_times) / len(lap_times), 2)"` },
          ],
          unlocks: ["tires"],
        },
        {
          id: "garage-8-autopilot",
          title: "Autopilot",
          minutes: 15,
          xp: 150,
          concepts: ["classes", "__init__", "self", "methods"],
          learn: `### Classes bundle data and behaviour

Your autopilot has facts about itself (how strongly it turns, called its *gain*) and skills (it can decide how to steer). A **class** keeps the facts and the skills together in one package. Think of a class as a blueprint for a kind of thing, and an **instance** as one real thing built from the blueprint. Here is a different example, a lamp:

~~~python
class Lamp:
    def __init__(self, brightness):
        self.brightness = brightness       # a fact the lamp remembers

    def describe(self):
        return f"A lamp at brightness {self.brightness}"

desk = Lamp(70)                  # build one lamp from the blueprint
print(desk.brightness)           # 70
print(desk.describe())           # A lamp at brightness 70
~~~

The screen shows:

~~~text
70
A lamp at brightness 70
~~~

- \`class Lamp:\` starts the blueprint.
- \`__init__\` is a special method that runs once, automatically, the moment you build a lamp. It sets the new thing up. Here it stores the brightness you passed in.
- A **method** is a function that lives inside a class.
- \`self\` means "this particular lamp". Inside the class, \`self.brightness\` is the brightness belonging to this lamp. Different lamps keep different values.

### Why does describe(self) have self, but desk.describe() has nothing in the brackets?

When you write \`desk.describe()\`, Python quietly hands \`desk\` to the method as its first input. That input is the \`self\` you see in \`def describe(self)\`. So you never type \`self\` when you call a method; Python fills it in with whatever is before the dot. You do write \`self\` in the \`def\` line, so the method knows which lamp it is working on.

The same goes for \`__init__\`: \`Lamp(70)\` has one value in brackets, and \`def __init__(self, brightness)\` has two names, because Python supplies \`self\` for you.

### Keyword arguments

When you call a function or build an instance, you can name the input you are filling, writing \`name=value\`. That is a **keyword argument**:

~~~python
desk = Lamp(70)                   # by position
desk = Lamp(brightness=70)        # by name: same result
~~~

Your mission uses this form: \`Autopilot(gain=60)\`. The name before \`=\` must match the parameter name in \`__init__\`.

### Sensors

The car has three distance sensors. They give a **dictionary** (lesson 7) with values from 0 (wall right here) to 1 (clear road). You read a value by its key:

~~~python
sensors = {"left": 0.4, "front": 1.0, "right": 0.9}
print(sensors["left"])      # 0.4
print(sensors["right"])     # 0.9
~~~

### A worked step

With those readings, there is more room on the right (0.9) than on the left (0.4). The difference is \`0.9 - 0.4\`, about \`0.5\`. Multiply by the gain: the bigger the gain, the harder the car turns. With a gain of 60, the wheel angle is about \`30\`, a right turn.`,
          mission: `Final build: a car that drives itself. Create an \`Autopilot\` class whose \`steer(sensors)\` method looks at the left and right sensors and steers toward the side with more room.

Steering = (right - left) * gain. Press **P** in the scene to hand the wheel to your class.

Optional bonus: add a \`throttle(self, sensors)\` method that returns a number from 0 to 1. For example, \`return sensors["front"]\` eases off when a wall is close ahead, and the car uses it to brake for corners.`,
          tasks: [
            "Class Autopilot with __init__(self, gain) storing self.gain",
            "Method steer(self, sensors) returning (right - left) * gain",
            "Create the instance: autopilot = Autopilot(gain=60)",
            "Run, press P in the scene, and watch it lap",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 8: build the autopilot.
class Autopilot:
    def __init__(self, gain):
        # remember the gain on the instance
        ...

    def steer(self, sensors):
        # sensors looks like {"left": 0.4, "front": 1.0, "right": 0.9}
        # return (right - left) * gain
        ...

autopilot = ...    # create one with gain=60
`,
          solutionAdd: py`class Autopilot:
    def __init__(self, gain):
        self.gain = gain

    def steer(self, sensors):
        error = sensors["right"] - sensors["left"]
        return error * self.gain

autopilot = Autopilot(gain=60)`,
          explanation:
            "More room on the right than the left gives a positive error, which steers right. The gain scales how aggressively. The scene calls autopilot.steer(sensors) every frame with live readings, so your class is the car's brain.",
          hints: [
            { id: "h1", title: "Store the gain", content: "Inside __init__: self.gain = gain" },
            { id: "h2", title: "Read a sensor", content: 'sensors["right"] and sensors["left"] are numbers from 0 to 1.' },
            { id: "h3", title: "Make one", content: "autopilot = Autopilot(gain=60)" },
          ],
          tests: [
            { id: "t1", description: "Autopilot remembers its gain", assertionCode: `_a = Autopilot(gain=10)
assert _a.gain == 10, "__init__ should store gain as self.gain"` },
            { id: "t2", description: "More room on the right steers right", assertionCode: `_a = Autopilot(gain=10)
assert abs(_a.steer({"left": 0.2, "front": 1.0, "right": 0.8}) - 6.0) < 1e-9, "steer should return (right - left) * gain"` },
            { id: "t3", description: "More room on the left steers left", assertionCode: `_a = Autopilot(gain=10)
assert _a.steer({"left": 0.9, "front": 1.0, "right": 0.1}) < 0, "More room on the left should give a negative angle"` },
            { id: "t4", description: "Centered means straight", assertionCode: `_a = Autopilot(gain=10)
assert abs(_a.steer({"left": 0.5, "front": 1.0, "right": 0.5})) < 1e-9, "Equal room both sides should return 0"` },
            { id: "t5", description: "autopilot is an Autopilot instance", assertionCode: `assert isinstance(autopilot, Autopilot), "Create it with: autopilot = Autopilot(gain=60)"` },
          ],
          unlocks: ["autopilot"],
        },
      ],
    },
  ],
};
