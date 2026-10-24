import type { Project } from "@/engine/types";

/**
 * Launch Control — fly a rocket to orbit (and the Moon) with your own Python.
 *
 * Authoring notes (same rules as garage.ts):
 *  - Python goes in String.raw`...` (no backticks, no ${ inside). Prose goes in normal templates;
 *    escape inline-code backticks as \` and use ~~~python fences for code blocks.
 *  - The scene reads these names from the learner's program (everything may be missing or wrong; it falls back):
 *      console    stdout (the lines printed by print())
 *      rocket     mission_name (str), rocket_name (str), rocket_color (hex str), crew (int),
 *                 fuel_tons (float), has_escape_tower (bool)
 *      countdown  countdown (list of numbers or short strings, shown one per tick)
 *      engines    dry_mass_t, thrust_kn (+ fuel_tons)  -> single-stage rocket; twr = thrust / (mass * 9.81) must beat 1
 *      throttle   hook throttle_program(t)                        t = seconds since ignition -> power 0..1
 *      safety     hook abort_check(altitude_km, speed, fuel_pct)  True = abort (speed in m/s, fuel_pct 0..100)
 *      staging    payload_t (number), stages = [{name, thrust_kn, burn_seconds, dry_t}, ...] (replaces the single stage)
 *      guidance   hook guidance.pitch(altitude_km) -> degrees from vertical (0 = straight up, 90 = flat);
 *                 with guidance the flight computer also cuts the engines near apogee and relights to circularize.
 *  - World: a "pocket Earth" (a tenth of the real radius, same 9.81 m/s² gravity). Orbit = perigee above 80 km;
 *    the Moon needs about 800 m/s of fuel left after reaching orbit. Physics: src/scenes/launch/sim.ts,
 *    proven headlessly by scripts/tune-launch.mjs.
 */
const py = String.raw;

export const launch: Project = {
  slug: "launch",
  title: "Launch Control",
  tagline: "Fly a rocket to orbit with your own code.",
  pitch:
    "Mission Control is dark and the rocket is a ghostly blueprint on the pad. Every Python concept you learn powers up a real system: the console, the rocket, the countdown, the engines, the throttle, the abort system, the stages, and finally a guidance computer that flies you to orbit and on to the Moon.",
  emoji: "🚀",
  difficulty: "Beginner",
  hours: 3,
  sceneId: "launch",
  accent: { from: "#6c47ff", to: "#26d0ff" },
  controls: ["R relaunch", "Space skip countdown"],
  skills: ["print & strings", "variables & types", "loops & lists", "math & f-strings", "functions", "if / elif / else", "dictionaries", "classes"],
  features: [
    { id: "console", title: "Console", blurb: "Your print() lines appear on the launch console and the pad powers up.", emoji: "🖥️" },
    { id: "rocket", title: "Rocket & crew", blurb: "Your rocket is painted, named, fuelled and crewed.", emoji: "🚀" },
    { id: "countdown", title: "Countdown", blurb: "Your list drives the T-minus clock before ignition.", emoji: "⏱️" },
    { id: "engines", title: "Engines", blurb: "Thrust against weight decides if it lifts off.", emoji: "🔥" },
    { id: "throttle", title: "Throttle", blurb: "Your function sets engine power every second of the climb.", emoji: "🎚️" },
    { id: "safety", title: "Abort system", blurb: "Your abort_check can fire the escape tower.", emoji: "🛟" },
    { id: "staging", title: "Staging", blurb: "Stages burn in turn and fall away on your timeline.", emoji: "🪜" },
    { id: "guidance", title: "Guidance", blurb: "Your Guidance class steers the rocket to orbit and on to the Moon.", emoji: "🧭" },
  ],
  chapters: [
    {
      id: "prelaunch",
      title: "Pre-launch",
      blurb: "Power up the console, build the rocket and run the count.",
      lessons: [
        {
          id: "launch-1-console",
          title: "Wake the console",
          minutes: 8,
          xp: 50,
          concepts: ["print()", "strings", "comments"],
          learn: `### Talking to the launch console

\`print()\` sends a line of text to the screen. Text inside quotes is called a **string**.

~~~python
print("Hello, Moon!")
~~~

Each \`print()\` makes a new line. Lines that start with \`#\` are **comments**: notes for humans that Python skips.

~~~python
# this line is ignored
print("This one runs")
~~~

Strings can use double quotes \`"like this"\` or single quotes \`'like this'\`. Just close the quote you opened. Capital letters matter: \`"go"\` and \`"GO"\` are different strings.`,
          mission: `Mission Control is dark. The rocket on Pad A is only a blueprint and the console screen has no signal.

Wake the console by printing three status lines. The moment they run, the pad lights come on, the gantry powers up and your lines appear on the console screen.`,
          tasks: [
            "Print LAUNCH CONTROL ONLINE",
            "Print ALL SYSTEMS NOMINAL",
            "Print PAD A READY",
            "Press Run and watch the pad power up",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 1: wake the launch console.
# Use print() to send these 3 lines to the screen:
#   LAUNCH CONTROL ONLINE
#   ALL SYSTEMS NOMINAL
#   PAD A READY
# (Lines starting with # are comments. Python skips them.)
`,
          solutionAdd: py`print("LAUNCH CONTROL ONLINE")
print("ALL SYSTEMS NOMINAL")
print("PAD A READY")`,
          explanation:
            "Each print() call writes one line, and the console shows exactly what you print, capital letters included. Comments (the lines starting with #) are for people, so Python ignores them.",
          hints: [
            { id: "h1", title: "Syntax", content: 'A print call looks like this: print("some text")' },
            { id: "h2", title: "First line", content: 'print("LAUNCH CONTROL ONLINE")' },
            { id: "h3", title: "All three", content: "Write one print() per line, each with its own text in quotes." },
          ],
          tests: [
            { id: "t1", description: "Prints LAUNCH CONTROL ONLINE", assertionCode: `assert "LAUNCH CONTROL ONLINE" in __stdout__.splitlines(), "Print the exact text LAUNCH CONTROL ONLINE on its own line"` },
            { id: "t2", description: "Prints ALL SYSTEMS NOMINAL", assertionCode: `assert "ALL SYSTEMS NOMINAL" in __stdout__.splitlines(), "Print the exact text ALL SYSTEMS NOMINAL on its own line"` },
            { id: "t3", description: "Prints PAD A READY", assertionCode: `assert "PAD A READY" in __stdout__.splitlines(), "Print the exact text PAD A READY on its own line"` },
            { id: "t4", description: "Uses three separate lines", assertionCode: `assert len(__stdout__.strip().splitlines()) >= 3, "Use one print() per line (three lines in total)"` },
          ],
          unlocks: ["console"],
        },
        {
          id: "launch-2-rocket",
          title: "Build the rocket",
          minutes: 12,
          xp: 70,
          concepts: ["variables", "str / int / float / bool"],
          learn: `### Variables are labelled boxes

A **variable** gives a name to a value so you can use it later.

~~~python
pilot = "Ada"        # str   (text)
seats = 4            # int   (whole number)
fuel = 41.5          # float (number with a decimal point)
is_ready = True      # bool  (True or False)
~~~

Use \`=\` to store a value. Names are lowercase with underscores, like \`fuel_tons\`.

You can check a type with \`type(seats)\`. Python works it out from the value: quotes make a string, digits make an int, a decimal point makes a float.

Colours on the web are often **hex codes**: a string like \`"#f2f4fa"\` (red, green and blue in base 16).`,
          mission: `Pad A is lit, but the rocket is still a wireframe ghost. Paint it, name it and fuel it.

The scene looks your variables up by their exact names. The moment you Run, the rocket gets its paint job, the crew climb aboard and the fuel gauge fills to your number.`,
          tasks: [
            'mission_name: text, at least 2 letters (e.g. "Moonshot-1")',
            'rocket_name: text, at least 2 letters (e.g. "Pathfinder")',
            'rocket_color: a hex colour like "#f2f4fa"',
            "crew: a whole number of astronauts, 1 to 8",
            "fuel_tons: a float between 20 and 400 (e.g. 80.0)",
            "has_escape_tower: True or False",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 2: describe your rocket.
mission_name = ...        # text, e.g. "Moonshot-1"
rocket_name = ...         # text, e.g. "Pathfinder"
rocket_color = ...        # hex colour text, e.g. "#f2f4fa"
crew = ...                # whole number of astronauts, 1 to 8
fuel_tons = ...           # a float (has a decimal point), e.g. 80.0
has_escape_tower = ...    # True or False
`,
          solutionAdd: py`mission_name = "Moonshot-1"
rocket_name = "Pathfinder"
rocket_color = "#f2f4fa"
crew = 3
fuel_tons = 80.0
has_escape_tower = True`,
          explanation:
            "Python picks the type from the value: quotes make a str, digits make an int, a decimal point makes a float, True/False make a bool. The scene looks variables up by name, so rocket_color and fuel_tons are how your rocket is configured. Try another colour like \"#ff6a3d\" and Run again.",
          hints: [
            { id: "h1", title: "Replace the dots", content: "Each line has ... as a placeholder. Replace it with a real value." },
            { id: "h2", title: "Strings need quotes", content: 'mission_name = "Moonshot-1" and rocket_color = "#f2f4fa" need quotes. crew does not.' },
            { id: "h3", title: "Float vs int", content: "80.0 has a decimal point, so it is a float. 3 has none, so it is an int." },
          ],
          tests: [
            { id: "t1", description: "mission_name is text of 2+ letters", assertionCode: `assert isinstance(mission_name, str) and len(mission_name) >= 2, "mission_name must be text in quotes, at least 2 letters"` },
            { id: "t2", description: "rocket_name is text of 2+ letters", assertionCode: `assert isinstance(rocket_name, str) and len(rocket_name) >= 2, "rocket_name must be text in quotes, at least 2 letters"` },
            { id: "t3", description: "rocket_color is a hex colour like #f2f4fa", assertionCode: `assert isinstance(rocket_color, str) and rocket_color.startswith("#") and len(rocket_color) == 7, "rocket_color must look like '#f2f4fa' (a # then 6 characters)"
int(rocket_color[1:], 16)` },
            { id: "t4", description: "crew is a whole number from 1 to 8", assertionCode: `assert type(crew) is int, "crew must be a whole number (no quotes, no decimal point)"
assert 1 <= crew <= 8, "crew should be between 1 and 8"` },
            { id: "t5", description: "fuel_tons is a float from 20 to 400", assertionCode: `assert type(fuel_tons) is float, "fuel_tons must be a float: give it a decimal point, like 80.0"
assert 20 <= fuel_tons <= 400, "fuel_tons should be between 20 and 400"` },
            { id: "t6", description: "has_escape_tower is True or False", assertionCode: `assert type(has_escape_tower) is bool, "has_escape_tower must be True or False (capital letter, no quotes)"` },
          ],
          unlocks: ["rocket"],
        },
        {
          id: "launch-3-countdown",
          title: "The countdown",
          minutes: 18,
          xp: 90,
          concepts: ["lists", "for loops", "range()", "while loops"],
          learn: `### Lists hold many values

A **list** keeps values in order. Add to the end with \`append()\` and count them with \`len()\`.

~~~python
engines = ["left", "middle"]
engines.append("right")
print(len(engines))      # 3
~~~

### for loops repeat once per item

\`range(start, stop, step)\` makes the numbers from \`start\` up to (but not including) \`stop\`. A negative step counts down.

~~~python
for n in range(3, 0, -1):
    print(n)             # 3, 2, 1
~~~

Build a list inside a loop:

~~~python
squares = []
for n in range(1, 4):
    squares.append(n * n)    # [1, 4, 9]
~~~

### while loops repeat until a condition is false

~~~python
loaded = 0
while loaded < 30:
    loaded += 10             # same as loaded = loaded + 10
~~~

Careful: if the condition never becomes false, the loop never ends.`,
          mission: `Rockets do not just go. They count: 10, 9, 8... and the engines only light at zero.

Let a loop build the \`countdown\` list and print every number on its own line, then print LIFTOFF!. The scene reads your list and ticks through it on the console clock.

Then use a \`while\` loop to pump fuel into the tank in 10-tonne batches until it holds \`fuel_tons\`.`,
          tasks: [
            "Start with an empty list: countdown = []",
            "Use a for loop with range(10, 0, -1) to append 10, 9, ... 1 and print each number",
            "After the loop, print LIFTOFF!",
            "Use a while loop to count how many 10-tonne batches fill fuel_tons (batches)",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 3: run the countdown.
countdown = []        # this list will hold 10, 9, 8 ... 1

# for number in range(10, 0, -1):
#     add number to the list, then print it

# when the loop is done, print LIFTOFF!

# Pump fuel into the tank 10 tonnes at a time until it holds fuel_tons.
loaded = 0
batches = 0
# while loaded < fuel_tons:
#     ...
`,
          solutionAdd: py`countdown = []
for number in range(10, 0, -1):
    countdown.append(number)
    print(number)

print("LIFTOFF!")

loaded = 0
batches = 0
while loaded < fuel_tons:
    loaded += 10
    batches += 1`,
          explanation:
            "range(10, 0, -1) counts down from 10 and stops before 0, so the list holds ten numbers. The scene walks through your countdown list one item per tick, so try [5, 4, 3, 2, 1] for a shorter wait. The while loop keeps adding a 10-tonne batch until the tank is full, so batches ends up as fuel_tons divided by 10, rounded up.",
          hints: [
            { id: "h1", title: "The loop", content: "for number in range(10, 0, -1):  gives number = 10, 9, 8 ... 1" },
            { id: "h2", title: "Inside the loop", content: "countdown.append(number) and then print(number). Both lines are indented." },
            { id: "h3", title: "The while loop", content: "while loaded < fuel_tons:  then, indented, add 10 to loaded and 1 to batches." },
          ],
          tests: [
            { id: "t1", description: "countdown holds 10 down to 1", assertionCode: `assert countdown == [10, 9, 8, 7, 6, 5, 4, 3, 2, 1], f"countdown should be 10 down to 1 but is {countdown}"` },
            { id: "t2", description: "Prints every number on its own line", assertionCode: `_lines = __stdout__.strip().splitlines()
assert _lines[-11:-1] == ["10", "9", "8", "7", "6", "5", "4", "3", "2", "1"], "Print 10, 9, 8 ... 1, each on its own line, inside the loop"` },
            { id: "t3", description: "Prints LIFTOFF! last", assertionCode: `assert __stdout__.strip().splitlines()[-1] == "LIFTOFF!", "After the loop, print LIFTOFF! as the last line"` },
            { id: "t4", description: "while loop fills the tank in batches", assertionCode: `assert loaded >= fuel_tons, "loaded should reach fuel_tons: keep looping while loaded < fuel_tons"
assert loaded - 10 < fuel_tons, "Stop as soon as the tank is full (do not add extra batches)"` },
            { id: "t5", description: "batches counts the 10-tonne loads", assertionCode: `assert batches * 10 == loaded and batches > 0, "Add 1 to batches every time you add 10 to loaded"` },
          ],
          unlocks: ["countdown"],
        },
      ],
    },
    {
      id: "ignition",
      title: "Ignition",
      blurb: "Make it fly, shape the climb and keep the crew safe.",
      lessons: [
        {
          id: "launch-4-engines",
          title: "Will it fly?",
          minutes: 18,
          xp: 90,
          concepts: ["arithmetic", "f-strings", "round()", "comparisons"],
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

Store results in variables and use them in later maths:

~~~python
fuel = 80.0
tank_mass = 5.0
total = fuel + tank_mass
~~~

### Comparisons give True or False

~~~python
total > 50       # True
total == 10      # False
~~~

### f-strings mix values into text

Put an \`f\` before the quote and wrap names in braces. \`round(x, 2)\` keeps 2 decimal places.

~~~python
print(f"Total mass: {round(total, 1)} t")
~~~`,
          mission: `A rocket only lifts off if the engines push **harder than gravity pulls it down**. Engineers call the ratio the **thrust-to-weight ratio** (TWR). Above 1.0 it rises. Below 1.0 it just sits there roaring.

Weight in kilonewtons is mass in tonnes times 9.81. Work out your TWR, and when it is above 1 the engines ignite, the gantry swings away and your rocket really lifts off.`,
          tasks: [
            "thrust_kn: choose an engine power (try 2400.0)",
            "mass_t = dry_mass_t + fuel_tons",
            "weight_kn = mass_t * 9.81",
            "twr = thrust_kn / weight_kn, and liftoff = twr > 1",
            "Print a line like: TWR 1.96 (use an f-string and round(twr, 2))",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 4: will it fly? Do the thrust-to-weight maths.
dry_mass_t = 45.0        # empty rocket + capsule, in tonnes
thrust_kn = ...          # engine power in kilonewtons, try 2400.0

mass_t = ...             # total mass at liftoff: dry_mass_t + fuel_tons
weight_kn = ...          # mass_t * 9.81  (tonnes x gravity = kilonewtons)
twr = ...                # thrust_kn divided by weight_kn
liftoff = ...            # True when twr is bigger than 1

# print a report like:  TWR 1.96   (use an f-string and round(twr, 2))
`,
          solutionAdd: py`dry_mass_t = 45.0
thrust_kn = 2400.0

mass_t = dry_mass_t + fuel_tons
weight_kn = mass_t * 9.81
twr = thrust_kn / weight_kn
liftoff = twr > 1

print(f"TWR {round(twr, 2)}")`,
          explanation:
            "Total mass is the empty rocket plus its fuel (80 + 45 = 125 tonnes), so the weight is 125 x 9.81 = 1226 kN. Your 2400 kN engines give a TWR of about 1.96, so the rocket rises. The scene reads thrust_kn, dry_mass_t and fuel_tons for real: try thrust_kn = 1100.0 and Run to see an engine that is too weak just roar on the pad. Without guidance the rocket flies straight up, which reaches space but never makes an orbit.",
          hints: [
            { id: "h1", title: "Total mass", content: "mass_t = dry_mass_t + fuel_tons" },
            { id: "h2", title: "Weight and ratio", content: "weight_kn = mass_t * 9.81 and twr = thrust_kn / weight_kn" },
            { id: "h3", title: "The comparison", content: "liftoff = twr > 1  (this stores True or False)" },
            { id: "h4", title: "The report", content: 'print(f"TWR {round(twr, 2)}")' },
          ],
          tests: [
            { id: "t1", description: "thrust_kn is a positive number", assertionCode: `assert isinstance(thrust_kn, (int, float)) and not isinstance(thrust_kn, bool), "thrust_kn must be a number, like 2400.0"
assert thrust_kn > 0, "thrust_kn must be bigger than 0"` },
            { id: "t2", description: "mass_t = dry mass + fuel", assertionCode: `assert abs(mass_t - (dry_mass_t + fuel_tons)) < 1e-9, "mass_t should be dry_mass_t + fuel_tons"` },
            { id: "t3", description: "weight_kn = mass_t * 9.81", assertionCode: `assert abs(weight_kn - mass_t * 9.81) < 1e-6, "weight_kn should be mass_t * 9.81"` },
            { id: "t4", description: "twr = thrust_kn / weight_kn", assertionCode: `assert abs(twr - thrust_kn / weight_kn) < 1e-9, "twr should be thrust_kn divided by weight_kn"` },
            { id: "t5", description: "Thrust beats weight, so it can lift off", assertionCode: `assert twr > 1, f"TWR is only {round(twr, 2)}. The thrust must beat the weight: raise thrust_kn"
assert liftoff is True, "liftoff should be True (twr > 1)"` },
            { id: "t6", description: "Prints the TWR with an f-string", assertionCode: `assert f"TWR {round(twr, 2)}" in __stdout__, "Print a line like: TWR 1.96"` },
          ],
          unlocks: ["engines"],
        },
        {
          id: "launch-5-throttle",
          title: "Throttle program",
          minutes: 22,
          xp: 100,
          concepts: ["def", "parameters", "return", "min()"],
          learn: `### Functions are reusable recipes

A **function** takes inputs (parameters), does some work and hands back a result with \`return\`.

~~~python
def double(n):
    return n * 2

print(double(21))     # 42
~~~

- \`def\` starts the definition, then the name and the parameters in brackets, then a colon.
- The **indented** lines are the body. Indentation is how Python groups code.
- \`return\` gives the answer back to whoever called the function.

### min() and max()

\`min(a, b)\` is the smaller one and \`max(a, b)\` the bigger one. They are perfect for capping a value:

~~~python
min(1.4, 1.0)    # 1.0   (never above 1)
max(-3, 0)       # 0     (never below 0)
~~~

Important: the scene will **call your function for you**, again and again while the rocket flies. You write it once and the rocket uses it.`,
          mission: `Slamming the throttle to 100% on the pad shakes a rocket apart. Real launches **ease the engines up**.

Write \`throttle_program(t)\`. The scene gives it \`t\`, the seconds since the engines lit, and uses the number you return (0.0 is off, 1.0 is full power) as engine power at that moment. Start gently at 70% and add 3% every second, but never go above 100%.`,
          tasks: [
            "Define throttle_program with one parameter, t",
            "At t = 0 return 0.7",
            "Add 0.03 for every second: 0.7 + t * 0.03",
            "Never return more than 1.0 (use min)",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 5: program the throttle.
def throttle_program(t):
    # t = seconds since the engines lit
    # return engine power: 0.0 (off) up to 1.0 (full)
    # start at 0.7, add 0.03 every second, never more than 1.0
    ...
`,
          solutionAdd: py`def throttle_program(t):
    return min(1.0, 0.7 + t * 0.03)`,
          explanation:
            "At t = 0 the formula gives 0.7, then it grows by 0.03 each second until min() stops it at 1.0 (after 10 seconds). Watch the THROTTLE bar on the stage follow your function. Try 0.9 + t * 0.01 for a bolder start, or lower the start so low that the rocket cannot lift off until the throttle has risen: thrust must still beat weight!",
          hints: [
            { id: "h1", title: "Replace ...", content: "Delete the ... line and write a return statement in its place (keep the indentation)." },
            { id: "h2", title: "The ramp", content: "0.7 + t * 0.03 starts at 0.7 and grows every second." },
            { id: "h3", title: "The cap", content: "return min(1.0, 0.7 + t * 0.03)" },
          ],
          tests: [
            { id: "t1", description: "throttle_program exists", assertionCode: `assert callable(throttle_program), "Define a function called throttle_program"` },
            { id: "t2", description: "Starts gently at 70%", assertionCode: `assert abs(throttle_program(0) - 0.7) < 1e-9, "throttle_program(0) should be 0.7"` },
            { id: "t3", description: "Adds 3% every second", assertionCode: `assert abs(throttle_program(5) - 0.85) < 1e-9, "throttle_program(5) should be 0.85 (0.7 + 5 x 0.03)"` },
            { id: "t4", description: "Never goes above full power", assertionCode: `assert abs(throttle_program(10) - 1.0) < 1e-9, "throttle_program(10) should be 1.0"
assert throttle_program(60) == 1.0, "throttle_program(60) must stay at 1.0: cap it with min()"` },
            { id: "t5", description: "Always returns a number from 0 to 1", assertionCode: `for _t in range(0, 300, 7):
    _v = throttle_program(_t)
    assert isinstance(_v, (int, float)) and 0 <= _v <= 1, f"throttle_program({_t}) returned {_v}: it must be a number from 0 to 1"` },
          ],
          unlocks: ["throttle"],
        },
        {
          id: "launch-6-abort",
          title: "Abort system",
          minutes: 25,
          xp: 110,
          concepts: ["if / elif / else", "comparisons", "and / or / not"],
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

Python checks the branches top to bottom and runs the **first** one that is true.

### Comparisons and logic

Comparisons: \`==\` equal, \`!=\` not equal, \`<\` \`>\` \`<=\` \`>=\`. Combine them with \`and\`, \`or\` and \`not\`:

~~~python
if altitude < 25 and speed > 900:
    ...            # BOTH must be true
~~~

### Returning True or False

A function can \`return\` as soon as it knows the answer. The first \`return\` it reaches ends the function:

~~~python
def is_even(n):
    if n % 2 == 0:
        return True
    return False
~~~`,
          mission: `Every launch has a way out. If something goes wrong, the **escape tower** blasts the crew capsule away from the rocket.

The scene calls your \`abort_check(altitude_km, speed, fuel_pct)\` many times per second. Return \`True\` to abort and \`False\` to keep flying. Abort when the rocket is **too fast in thick air** (below 25 km and faster than 1200 m/s), or when it is **running dry too low** (under 2% fuel below 70 km). A good abort is not a failure: the tower fires, the crew floats down on a parachute, and the mission relaunches by itself.`,
          tasks: [
            "Define abort_check(altitude_km, speed, fuel_pct)",
            "Return True if altitude_km < 25 and speed > 1200",
            "Return True if fuel_pct < 2 and altitude_km < 70",
            "Otherwise return False",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 6: build the abort system.
def abort_check(altitude_km, speed, fuel_pct):
    # altitude_km: height above the pad, in km
    # speed: metres per second
    # fuel_pct: fuel left, from 100 down to 0
    # return True to ABORT, False to keep flying
    ...
`,
          solutionAdd: py`def abort_check(altitude_km, speed, fuel_pct):
    if altitude_km < 25 and speed > 1200:
        return True
    elif fuel_pct < 2 and altitude_km < 70:
        return True
    else:
        return False`,
          explanation:
            "Each rule combines two comparisons with and: both must be true before it triggers. The else branch is the happy path. Try changing 1200 to 500 and Run: your rocket will abort on the way up, the tower fires and the capsule drifts down under its parachute. Put the number back when you are done playing.",
          hints: [
            { id: "h1", title: "Structure", content: "Use if, elif and else: two ways to abort and one way to carry on." },
            { id: "h2", title: "Rule one", content: "if altitude_km < 25 and speed > 1200: return True" },
            { id: "h3", title: "Rule two", content: "elif fuel_pct < 2 and altitude_km < 70: return True. Finish with else: return False" },
          ],
          tests: [
            { id: "t1", description: "Too fast in thick air aborts", assertionCode: `assert abort_check(10, 1500, 80) is True, "abort_check(10, 1500, 80) should be True: 10 km up at 1500 m/s is too fast"` },
            { id: "t2", description: "Fast is fine in space", assertionCode: `assert abort_check(120, 3000, 60) is False, "abort_check(120, 3000, 60) should be False: speed is fine up in space"` },
            { id: "t3", description: "Running dry too low aborts", assertionCode: `assert abort_check(40, 800, 1) is True, "abort_check(40, 800, 1) should be True: almost no fuel at 40 km"` },
            { id: "t4", description: "Low fuel is fine up high", assertionCode: `assert abort_check(90, 2000, 1) is False, "abort_check(90, 2000, 1) should be False: above 70 km low fuel is not an abort"` },
            { id: "t5", description: "A normal climb carries on", assertionCode: `assert abort_check(10, 400, 90) is False, "abort_check(10, 400, 90) should be False"` },
            { id: "t6", description: "Always answers True or False", assertionCode: `assert type(abort_check(1, 1, 50)) is bool, "abort_check must return True or False (use return True / return False)"` },
          ],
          unlocks: ["safety"],
        },
      ],
    },
    {
      id: "moon",
      title: "To the Moon",
      blurb: "Stage the rocket and steer it into orbit.",
      lessons: [
        {
          id: "launch-7-stages",
          title: "Staging",
          minutes: 25,
          xp: 120,
          concepts: ["dictionaries", "lists of dicts", "looping over a list"],
          learn: `### Dictionaries look things up by name

A **dictionary** maps keys to values.

~~~python
engine = {"name": "Merlin", "thrust_kn": 850}
print(engine["name"])         # Merlin
engine["burn_seconds"] = 160  # add a new pair
~~~

### A list of dictionaries

Put dictionaries in a list to describe many similar things:

~~~python
engines = [
    {"name": "A", "thrust_kn": 100},
    {"name": "B", "thrust_kn": 250},
]
print(engines[0]["name"])     # A
~~~

### Adding up with a loop

~~~python
total = 0
for engine in engines:
    total += engine["thrust_kn"]     # 350
~~~`,
          mission: `One giant tank is wasteful: you keep hauling empty metal to orbit. Real rockets use **stages**: the big booster burns first, then drops away, and a smaller upper stage carries on.

Describe each stage as a dictionary with its \`name\`, \`thrust_kn\`, \`burn_seconds\` and \`dry_t\` (empty weight in tonnes), and put them in a \`stages\` list, booster first. The scene works out each stage's fuel for you (thrust x burn time / 3139 tonnes) and flies your stages one after another, dropping each empty one with a flash. The capsule on top weighs \`payload_t\` tonnes.`,
          tasks: [
            "payload_t: the capsule weight in tonnes (try 14.0)",
            "booster = a dictionary: name, thrust_kn, burn_seconds, dry_t",
            "upper_stage = a smaller dictionary of the same shape",
            "stages = [booster, upper_stage]",
            "Add up burn_seconds with a for loop into total_burn, and print it",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 7: split the rocket into stages.
payload_t = ...         # capsule + crew that go all the way, e.g. 14.0

# each stage is a dictionary with the keys:
#   "name", "thrust_kn", "burn_seconds", "dry_t"
booster = ...           # strong: try 2600 kN for 65 s, dry_t 14.0
upper_stage = ...       # smaller: try 800 kN for 150 s, dry_t 5.0

stages = ...            # a list holding the booster first, then the upper stage

total_burn = 0
# loop over stages and add each stage's "burn_seconds" to total_burn

# print a summary like:  2 stages, 215s of burn
`,
          solutionAdd: py`payload_t = 14.0

booster = {"name": "Booster", "thrust_kn": 2600, "burn_seconds": 65, "dry_t": 14.0}
upper_stage = {"name": "Upper stage", "thrust_kn": 800, "burn_seconds": 150, "dry_t": 5.0}

stages = [booster, upper_stage]

total_burn = 0
for stage in stages:
    total_burn += stage["burn_seconds"]

print(f"{len(stages)} stages, {total_burn}s of burn")`,
          explanation:
            "stage[\"burn_seconds\"] looks one value up by its key, and the loop visits each dictionary in the list in turn. From now on the scene flies your stages list instead of the single engine from lesson 4. Without guidance the rocket still climbs straight up, but you can watch the booster drop away. Try a longer upper-stage burn_seconds to carry more fuel.",
          hints: [
            { id: "h1", title: "A dictionary", content: 'booster = {"name": "Booster", "thrust_kn": 2600, "burn_seconds": 65, "dry_t": 14.0}' },
            { id: "h2", title: "The list", content: "stages = [booster, upper_stage]" },
            { id: "h3", title: "The loop", content: 'for stage in stages:  then, indented,  total_burn += stage["burn_seconds"]' },
            { id: "h4", title: "The summary", content: 'print(f"{len(stages)} stages, {total_burn}s of burn")' },
          ],
          tests: [
            { id: "t1", description: "payload_t is the capsule weight", assertionCode: `assert isinstance(payload_t, (int, float)) and not isinstance(payload_t, bool), "payload_t must be a number of tonnes, like 14.0"
assert 5 <= payload_t <= 60, "payload_t should be between 5 and 60 tonnes"` },
            { id: "t2", description: "Each stage has name, thrust, burn time and dry weight", assertionCode: `for _stage in (booster, upper_stage):
    assert isinstance(_stage, dict), "booster and upper_stage must be dictionaries: {...}"
    for _key in ("name", "thrust_kn", "burn_seconds", "dry_t"):
        assert _key in _stage, f"Every stage needs a '{_key}' key"
    assert isinstance(_stage["name"], str), "'name' must be text"
    for _key in ("thrust_kn", "burn_seconds", "dry_t"):
        assert isinstance(_stage[_key], (int, float)) and _stage[_key] > 0, f"'{_key}' must be a number above 0"` },
            { id: "t3", description: "stages lists the booster first, and it is stronger", assertionCode: `assert stages == [booster, upper_stage], "stages should be [booster, upper_stage]"
assert booster["thrust_kn"] > upper_stage["thrust_kn"], "The booster needs more thrust than the upper stage"` },
            { id: "t4", description: "total_burn adds up every burn_seconds", assertionCode: `assert total_burn == sum(s["burn_seconds"] for s in stages), "total_burn should be the sum of every stage's burn_seconds (use a for loop)"` },
            { id: "t5", description: "Prints the stage summary", assertionCode: `assert f"{len(stages)} stages" in __stdout__ and f"{total_burn}s" in __stdout__, "Print a line like: 2 stages, 215s of burn"` },
            { id: "t6", description: "The booster can lift the whole stack", assertionCode: `_mass = payload_t
for _s in stages:
    _mass += _s["dry_t"] + _s["thrust_kn"] * _s["burn_seconds"] / 3139
assert stages[0]["thrust_kn"] > _mass * 9.81, f"The stack weighs about {round(_mass)} t, so the booster needs more than {round(_mass * 9.81)} kN of thrust to lift off"` },
          ],
          unlocks: ["staging"],
        },
        {
          id: "launch-8-guidance",
          title: "Guidance computer",
          minutes: 30,
          xp: 160,
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

### Pitch: tilting the rocket

Straight up never reaches orbit: you need to go **sideways** fast enough that you keep missing the ground. So after clearing the thick air the rocket tilts over. The angle is measured from vertical: **0 degrees is straight up, 90 degrees is flat toward the horizon**.`,
          mission: `The final system: a guidance computer. Build a \`Guidance\` class that remembers where to start tilting (\`turn_start_km\`) and how fast to tilt (\`degrees_per_km\`). Its \`pitch(altitude_km)\` method returns the angle for the current height: straight up until the turn starts, then more tilt for every kilometre climbed, never past 90.

The scene calls \`guidance.pitch(...)\` as the rocket climbs. It also helps a little: it cuts the engines once the apogee is high enough, coasts up to it and relights to build orbital speed. Reach a stable orbit with more than 800 m/s of fuel left and the rocket fires for the Moon.`,
          tasks: [
            "Class Guidance with __init__(self, turn_start_km, degrees_per_km) storing both on self",
            "Method pitch(self, altitude_km): 0 until turn_start_km, then (altitude - start) * degrees_per_km",
            "Never return more than 90",
            "Create the instance: guidance = Guidance(turn_start_km=1, degrees_per_km=2)",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 8: build the guidance computer.
class Guidance:
    def __init__(self, turn_start_km, degrees_per_km):
        # remember both numbers on the instance
        ...

    def pitch(self, altitude_km):
        # degrees from straight up: 0 = vertical, 90 = flat
        # below turn_start_km: fly straight up (0)
        # above it: tilt degrees_per_km for every km higher, but never past 90
        ...

guidance = ...    # create one with turn_start_km=1 and degrees_per_km=2
`,
          solutionAdd: py`class Guidance:
    def __init__(self, turn_start_km, degrees_per_km):
        self.turn_start_km = turn_start_km
        self.degrees_per_km = degrees_per_km

    def pitch(self, altitude_km):
        if altitude_km <= self.turn_start_km:
            return 0
        angle = (altitude_km - self.turn_start_km) * self.degrees_per_km
        return min(angle, 90)

guidance = Guidance(turn_start_km=1, degrees_per_km=2)`,
          explanation:
            "At 1 km the rocket starts to lean, and every extra kilometre adds 2 degrees, so it reaches 45 degrees around 23 km and lies flat at 46 km. Experiment! A bigger degrees_per_km tips over sooner (fast, but tip too hard and the rocket aborts or crashes); a later turn_start_km climbs straighter (safer, but wastes fuel). The leaner your climb, the more fuel is left for the Moon.",
          hints: [
            { id: "h1", title: "Store the numbers", content: "Inside __init__: self.turn_start_km = turn_start_km and self.degrees_per_km = degrees_per_km" },
            { id: "h2", title: "The pitch method", content: "if altitude_km <= self.turn_start_km: return 0. Otherwise work out the angle with (altitude_km - self.turn_start_km) * self.degrees_per_km" },
            { id: "h3", title: "The cap", content: "return min(angle, 90)" },
            { id: "h4", title: "Make one", content: "guidance = Guidance(turn_start_km=1, degrees_per_km=2)" },
          ],
          tests: [
            { id: "t1", description: "Guidance remembers its two numbers", assertionCode: `_g = Guidance(turn_start_km=5, degrees_per_km=3)
assert _g.turn_start_km == 5, "__init__ should store turn_start_km as self.turn_start_km"
assert _g.degrees_per_km == 3, "__init__ should store degrees_per_km as self.degrees_per_km"` },
            { id: "t2", description: "Flies straight up before the turn", assertionCode: `_g = Guidance(turn_start_km=5, degrees_per_km=3)
assert _g.pitch(0) == 0, "pitch(0) should be 0"
assert _g.pitch(5) == 0, "pitch(5) should be 0: the turn only starts above turn_start_km"` },
            { id: "t3", description: "Tilts degrees_per_km for every km above the start", assertionCode: `_g = Guidance(turn_start_km=5, degrees_per_km=3)
assert abs(_g.pitch(8) - 9) < 1e-9, "pitch(8) should be (8 - 5) * 3 = 9"
assert abs(_g.pitch(15) - 30) < 1e-9, "pitch(15) should be (15 - 5) * 3 = 30"` },
            { id: "t4", description: "Never tilts past horizontal", assertionCode: `_g = Guidance(turn_start_km=5, degrees_per_km=3)
assert _g.pitch(100) == 90, "pitch(100) should be capped at 90"` },
            { id: "t5", description: "guidance is a Guidance instance", assertionCode: `assert isinstance(guidance, Guidance), "Create it with: guidance = Guidance(turn_start_km=1, degrees_per_km=2)"
assert guidance.pitch(0) == 0 and 0 < guidance.pitch(30) <= 90, "guidance.pitch(0) should be 0, and pitch(30) a tilt up to 90"` },
          ],
          unlocks: ["guidance"],
        },
      ],
    },
  ],
};
