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

\`print()\` sends text to the screen. Text in quotes is called a **string**.

~~~python
print("Hello, garage!")
~~~

Each \`print()\` makes a new line. Lines that start with \`#\` are **comments**: notes for humans that Python skips.

~~~python
# this line is ignored
print("This one runs")
~~~

Strings can use double quotes \`"like this"\` or single quotes \`'like this'\`. Just close the quote you opened.`,
          mission: `Your car is a ghostly blueprint in a dark garage. Nothing works yet, not even the computer.

Boot the on-board computer by printing three startup lines. The moment they run, the headlights come on and the lines appear on the dashboard.`,
          tasks: [
            "Print BOOT SEQUENCE START",
            "Print ENGINE: OK",
            "Print SYSTEMS GO",
            "Press Run and watch the car wake up",
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
        },
        {
          id: "garage-2-paint",
          title: "Paint & plate",
          minutes: 8,
          xp: 60,
          concepts: ["variables", "str / int / float / bool"],
          learn: `### Variables are labelled boxes

A **variable** gives a name to a value so you can use it later.

~~~python
driver = "Ada"      # str   (text)
laps = 3            # int   (whole number)
fuel = 41.5         # float (decimal number)
is_ready = True     # bool  (True or False)
~~~

Use \`=\` to store a value. Names are lowercase with underscores, like \`top_speed\`.

You can check a type with \`type(laps)\`. Python figures it out from the value.

Colours on the web are often **hex codes**: a string like \`"#ff3b6b"\` (red, green, blue in base 16).`,
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
        },
        {
          id: "garage-3-engine",
          title: "Engine room",
          minutes: 10,
          xp: 80,
          concepts: ["arithmetic", "f-strings", "round()"],
          learn: `### Python is a calculator

~~~python
2 + 3      # 5
10 - 4     # 6
6 * 7      # 42
9 / 2      # 4.5   (division always gives a float)
9 // 2     # 4     (floor division)
9 % 2      # 1     (remainder)
2 ** 3     # 8     (power)
~~~

Store results in variables, and use them in later maths:

~~~python
speed = 80
double = speed * 2
~~~

### f-strings mix values into text

Put an \`f\` before the quote and wrap names in braces:

~~~python
print(f"Top speed: {speed} km/h")
~~~

\`round(x, 1)\` rounds to 1 decimal place.`,
          mission: `Real engines are about power-to-weight. More horsepower and less weight means faster acceleration.

Compute your car's acceleration from its specs and report its 0-100 time. The scene uses your \`acceleration\` number: hold **W** and feel the difference.`,
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

A **function** takes inputs (parameters), does work, and gives back a result with \`return\`.

~~~python
def double(n):
    return n * 2

print(double(21))   # 42
~~~

- \`def\` starts the definition, then the name and parameters in brackets.
- The **indented** lines are the body. Indentation is how Python groups code.
- \`return\` hands the answer back to whoever called the function.

Important: the scene will **call your function for you** many times a second. You write it once, and the car uses it.`,
          mission: `A pedal that goes straight from 0% to 100% power makes a twitchy car. Racing cars use a **throttle curve**: half-pressing the pedal gives *less than* half the power, so it is smooth and controllable.

Write \`throttle_curve(pedal)\`: it receives the pedal position from 0.0 to 1.0 and returns the power to use. Squaring the pedal is a classic progressive curve.`,
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

\`if\` runs code only when a condition is true.

~~~python
if fuel < 10:
    print("Low fuel!")
elif fuel < 30:
    print("Getting low")
else:
    print("Plenty")
~~~

Conditions use comparisons: \`==\` equal, \`!=\` not equal, \`<\` \`>\` \`<=\` \`>=\`. Combine them with \`and\`, \`or\`, \`not\`.

~~~python
if left and not right:
    ...
~~~

Python checks the branches top to bottom and runs the **first** one that is true.`,
          mission: `Time to steer. The scene calls your \`steer(left, right)\` function on every frame. \`left\` and \`right\` are True while the matching key is held.

Return a wheel angle in degrees: **negative turns left, positive turns right, 0 is straight**. The moment this works, the track lights up and you can actually drive.`,
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

A **list** holds many values in order:

~~~python
gears = [1, 2, 3, 4, 5]
gears.append(6)       # add to the end
print(len(gears))     # 6
~~~

A **for loop** repeats code once per item. \`range(a, b)\` counts from \`a\` up to (but not including) \`b\`.

~~~python
for n in range(1, 4):
    print(n)          # 1, 2, 3
~~~

Build a list inside a loop:

~~~python
squares = []
for n in range(1, 4):
    squares.append(n * n)   # [1, 4, 9]
~~~`,
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

A **dictionary** maps keys to values.

~~~python
prices = {"coffee": 3, "tea": 2}
print(prices["tea"])      # 2
prices["cake"] = 5        # add a new pair
~~~

### Handy list helpers

~~~python
times = [31.2, 29.8, 30.5]
min(times)                # 29.8   (smallest)
sum(times)                # 91.5
len(times)                # 3
round(sum(times) / len(times), 2)   # the average
~~~`,
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

A **class** is a blueprint. An **instance** is one thing built from it.

~~~python
class Dog:
    def __init__(self, name):
        self.name = name          # data stored on the instance

    def speak(self):
        return f"{self.name} says woof"

rex = Dog("Rex")
print(rex.speak())
~~~

- \`__init__\` runs when you create an instance.
- \`self\` is the instance itself; \`self.name\` is its data.
- Methods are functions inside the class. Call them with a dot: \`rex.speak()\`.

### Sensors

The car has three distance sensors. They give a **dictionary** with values from 0 (wall right here) to 1 (clear road):

~~~python
{"left": 0.4, "front": 1.0, "right": 0.9}
~~~`,
          mission: `Final build: a car that drives itself. Create an \`Autopilot\` class whose \`steer(sensors)\` method looks at the left and right sensors and steers toward the side with more room.

Steering = (right − left) × gain. Press **P** in the scene to hand the wheel to your class.

Bonus: add a \`throttle(self, sensors)\` method returning 0 to 1 and the car will use it to brake for corners.`,
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
