import { Course } from "./types";

export const pythonCourse: Course = {
  id: "course-python",
  slug: "python",
  title: "Python 3: From Zero to Pro",
  tagline: "Master clean, high-performance Python through real-world terminal simulations and hands-on coding challenges.",
  description:
    "A zero-fluff, interactive curriculum designed like top tier engineering bootcamps. Build intuition from fundamental syntax up to asynchronous pipelines, dataclasses, and production software patterns.",
  iconName: "FileCode2",
  badge: "Comprehensive",
  level: "Beginner to Advanced",
  estimatedHours: 24,
  totalXp: 3450,
  colorAccent: "emerald",
  modules: [
    {
      id: "mod-1",
      title: "Module 1: The Genesis Byte",
      description: "Terminal mechanics, syntax fundamentals, dynamic typing, and numeric computations.",
      order: 1,
      lessons: [
        {
          id: "py-01-hello-world",
          moduleId: "mod-1",
          order: 1,
          title: "1.1 Hello, Terminal",
          difficulty: "Beginner",
          estimatedMinutes: 5,
          xpReward: 50,
          tags: ["Basics", "Output", "Syntax"],
          concept: `### Standard Output in Python
In Python 3, sending text to the screen is accomplished using the built-in \`print()\` function.

\`\`\`python
print("Hello, engineer!")
\`\`\`

#### Key Takeaways
- Text must be enclosed in single quotes (\`'...\`) or double quotes (\`"..."\`).
- Python executes sequentially from top to bottom.
- Unlike C++ or Java, Python statements do not require a trailing semicolon \`;\`.
- Python is case-sensitive: \`Print()\` will raise a \`NameError\`.`,
          story: `You are an automated drone probe waking up in orbital deep-space. Your communication antenna has just initialized.
Send your first telemetry ping to ground control by outputting the exact string **"SYSTEM ONLINE: Telemetry ping confirmed"**.`,
          tasks: [
            {
              id: "t1",
              description: "Use print() to output 'SYSTEM ONLINE: Telemetry ping confirmed' to the console.",
            },
          ],
          starterCode: `# Drone Communications Subsystem v1.0
# Send telemetry confirmation to Ground Control

`,
          solutionCode: `print("SYSTEM ONLINE: Telemetry ping confirmed")`,
          solutionExplanation:
            "The print() function takes string literals and writes them to standard output (sys.stdout). The string must exactly match the expected casing.",
          hints: [
            {
              id: "h1",
              title: "Function Name",
              content: "Remember to use lowercase `print(...)` with parentheses.",
            },
            {
              id: "h2",
              title: "Exact Text",
              content: 'Wrap the text in double quotes: `"SYSTEM ONLINE: Telemetry ping confirmed"`',
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Outputs 'SYSTEM ONLINE: Telemetry ping confirmed'",
              assertionCode: `assert "SYSTEM ONLINE: Telemetry ping confirmed" in __stdout__.strip(), "Expected output to contain 'SYSTEM ONLINE: Telemetry ping confirmed'"`,
            },
          ],
        },
        {
          id: "py-02-variables-types",
          moduleId: "mod-1",
          order: 2,
          title: "1.2 Variables & Dynamic Typing",
          difficulty: "Beginner",
          estimatedMinutes: 8,
          xpReward: 75,
          tags: ["Variables", "Types", "Memory"],
          concept: `### Variables & Types in Python
Python is **dynamically typed**, meaning you do not declare variable types explicitly like \`int\` or \`string\`. The interpreter detects types at runtime.

\`\`\`python
rover_name = "Perseverance"   # str (string)
sol_day = 1042                # int (integer)
battery_level = 98.6          # float (floating point)
is_active = True              # bool (boolean)
\`\`\`

#### Reassignment & f-Strings
You can format variables into strings cleanly using modern **f-strings**:
\`\`\`python
print(f"Rover {rover_name} is on Sol {sol_day}")
\`\`\``,
          story: `Your satellite needs to configure its telemetry payload. Create variables named \`satellite_name\` assigned to \`"Aegis-1"\`, \`orbit_altitude\` assigned to integer \`450\`, and \`signal_ratio\` assigned to float \`0.985\`. Finally, create a formatted string \`status_report\` that combines them.`,
          tasks: [
            { id: "t1", description: "Create variable `satellite_name` with value 'Aegis-1'" },
            { id: "t2", description: "Create variable `orbit_altitude` with integer 450" },
            { id: "t3", description: "Create variable `signal_ratio` with float 0.985" },
            { id: "t4", description: "Create variable `status_report` with value f'{satellite_name} is in orbit at {orbit_altitude}km with signal {signal_ratio}' and print it." },
          ],
          starterCode: `# Orbit Configuration
# Define satellite_name, orbit_altitude, signal_ratio, and status_report

`,
          solutionCode: `satellite_name = "Aegis-1"
orbit_altitude = 450
signal_ratio = 0.985
status_report = f"{satellite_name} is in orbit at {orbit_altitude}km with signal {signal_ratio}"
print(status_report)`,
          solutionExplanation:
            "Variables store values in memory. Using an f-string allows dynamic string interpolation without messy string concatenation.",
          hints: [
            {
              id: "h1",
              title: "f-String Syntax",
              content: 'Prefix your string with `f` like `f"{satellite_name} is in orbit at {orbit_altitude}km with signal {signal_ratio}"`',
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Variable satellite_name is 'Aegis-1'",
              assertionCode: `assert satellite_name == "Aegis-1", "satellite_name must be 'Aegis-1'"`,
            },
            {
              id: "tc2",
              description: "orbit_altitude is integer 450",
              assertionCode: `assert orbit_altitude == 450 and isinstance(orbit_altitude, int), "orbit_altitude must be integer 450"`,
            },
            {
              id: "tc3",
              description: "signal_ratio is float 0.985",
              assertionCode: `assert abs(signal_ratio - 0.985) < 1e-6, "signal_ratio must be 0.985"`,
            },
            {
              id: "tc4",
              description: "status_report is correctly formatted and printed",
              assertionCode: `assert status_report == "Aegis-1 is in orbit at 450km with signal 0.985", "status_report does not match expected format"`,
            },
          ],
        },
        {
          id: "py-03-arithmetic-operators",
          moduleId: "mod-1",
          order: 3,
          title: "1.3 Arithmetic & Math Mechanics",
          difficulty: "Beginner",
          estimatedMinutes: 10,
          xpReward: 80,
          tags: ["Math", "Operators", "Functions"],
          concept: `### Arithmetic Operators in Python
Python supports standard and advanced math operations out-of-the-box:

| Operator | Operation | Example |
| :--- | :--- | :--- |
| \`+\` | Addition | \`10 + 5 == 15\` |
| \`-\` | Subtraction | \`10 - 4 == 6\` |
| \`*\` | Multiplication | \`6 * 7 == 42\` |
| \`/\` | True Division (always returns float) | \`7 / 2 == 3.5\` |
| \`//\` | Floor Division (truncates decimals) | \`7 // 2 == 3\` |
| \`%\` | Modulo (remainder of division) | \`7 % 2 == 1\` |
| \`**\` | Exponentiation (power) | \`2 ** 4 == 16\` |

#### Operator Precedence (PEMDAS)
Parentheses override precedence: \`(2 + 3) * 4 == 20\`.`,
          story: `You are developing the thruster calibration algorithm for a lunar lander. Write a function \`calculate_fuel_burn(thrust_level, duration_seconds, burn_efficiency)\` that returns the net fuel consumed.
The formula is: \`(thrust_level ** 2) * duration_seconds // burn_efficiency\`.`,
          tasks: [
            { id: "t1", description: "Define function `calculate_fuel_burn(thrust_level, duration_seconds, burn_efficiency)`." },
            { id: "t2", description: "Compute `(thrust_level ** 2) * duration_seconds // burn_efficiency`." },
            { id: "t3", description: "Return the calculated integer value." },
          ],
          starterCode: `def calculate_fuel_burn(thrust_level, duration_seconds, burn_efficiency):
    # Calculate and return net fuel burn using the specified formula
    pass
`,
          solutionCode: `def calculate_fuel_burn(thrust_level, duration_seconds, burn_efficiency):
    return (thrust_level ** 2) * duration_seconds // burn_efficiency`,
          solutionExplanation:
            "Exponentiation uses `**` and floor division uses `//`. By returning this expression, the function accurately computes integer fuel burn.",
          hints: [
            {
              id: "h1",
              title: "Exponentiation",
              content: "In Python, power is `thrust_level ** 2`, not `^`.",
            },
            {
              id: "h2",
              title: "Integer Division",
              content: "Make sure you use `//` for integer floor division.",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Calculates burn for standard thrust (10, 5, 2)",
              assertionCode: `assert calculate_fuel_burn(10, 5, 2) == 250, f"Expected 250, got {calculate_fuel_burn(10, 5, 2)}"`,
            },
            {
              id: "tc2",
              description: "Calculates burn with fractional truncation (7, 3, 4)",
              assertionCode: `assert calculate_fuel_burn(7, 3, 4) == 36, f"Expected 36, got {calculate_fuel_burn(7, 3, 4)}"`,
            },
            {
              id: "tc3",
              description: "Zero duration yields zero fuel burn",
              assertionCode: `assert calculate_fuel_burn(50, 0, 5) == 0, "Zero duration should return 0"`,
            },
          ],
        },
      ],
    },
    {
      id: "mod-2",
      title: "Module 2: Logic & Control Flow",
      description: "Booleans, relational operators, conditional branching, and compound logic.",
      order: 2,
      lessons: [
        {
          id: "py-04-conditionals",
          moduleId: "mod-2",
          order: 1,
          title: "2.1 Branching with If, Elif, and Else",
          difficulty: "Beginner",
          estimatedMinutes: 10,
          xpReward: 85,
          tags: ["Logic", "Conditionals", "Control Flow"],
          concept: `### Conditional Execution
Control flow allows your program to make decisions based on logical conditions:

\`\`\`python
if temperature > 100:
    print("Warning: Overheating!")
elif temperature < 0:
    print("Warning: Freezing!")
else:
    print("Temperature nominal.")
\`\`\`

#### Indentation Matters
Python uses **4 spaces** indentation to define code blocks instead of curly braces \`{}\`. Every block after an \`if\`, \`elif\`, or \`else\` statement must be indented.`,
          story: `You are writing the firewall security filter for an enterprise database gateway.
Define a function \`classify_traffic(packet_size, is_authorized, threat_score)\`:
- If \`threat_score >= 80\`, return \`"DROP: High threat"\`
- Else if \`not is_authorized\`, return \`"DROP: Unauthorized"\`
- Else if \`packet_size > 10000\`, return \`"QUARANTINE: Oversized packet"\`
- Otherwise, return \`"ALLOW: Clear traffic"\``,
          tasks: [
            { id: "t1", description: "Check if threat_score >= 80, return 'DROP: High threat'" },
            { id: "t2", description: "Check if not is_authorized, return 'DROP: Unauthorized'" },
            { id: "t3", description: "Check if packet_size > 10000, return 'QUARANTINE: Oversized packet'" },
            { id: "t4", description: "Otherwise, return 'ALLOW: Clear traffic'" },
          ],
          starterCode: `def classify_traffic(packet_size, is_authorized, threat_score):
    # Implement firewall rules in order of priority
    pass
`,
          solutionCode: `def classify_traffic(packet_size, is_authorized, threat_score):
    if threat_score >= 80:
        return "DROP: High threat"
    elif not is_authorized:
        return "DROP: Unauthorized"
    elif packet_size > 10000:
        return "QUARANTINE: Oversized packet"
    else:
        return "ALLOW: Clear traffic"`,
          solutionExplanation:
            "Conditions are evaluated from top to bottom. Once a condition evaluates to True, its return statement exits immediately.",
          hints: [
            {
              id: "h1",
              title: "Logical Not",
              content: "You can write `if not is_authorized:` or `if is_authorized == False:`.",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "High threat score drops traffic",
              assertionCode: `assert classify_traffic(500, True, 85) == "DROP: High threat"`,
            },
            {
              id: "tc2",
              description: "Unauthorized packet drops traffic even with low threat score",
              assertionCode: `assert classify_traffic(500, False, 20) == "DROP: Unauthorized"`,
            },
            {
              id: "tc3",
              description: "Authorized but oversized packet gets quarantined",
              assertionCode: `assert classify_traffic(15000, True, 10) == "QUARANTINE: Oversized packet"`,
            },
            {
              id: "tc4",
              description: "Safe, authorized, normal packet is allowed",
              assertionCode: `assert classify_traffic(1024, True, 5) == "ALLOW: Clear traffic"`,
            },
          ],
        },
        {
          id: "py-05-logical-operators",
          moduleId: "mod-2",
          order: 2,
          title: "2.2 Compound Logic & Short-Circuiting",
          difficulty: "Beginner",
          estimatedMinutes: 10,
          xpReward: 90,
          tags: ["Booleans", "Operators", "Truthiness"],
          concept: `### Logical Operators: \`and\`, \`or\`, \`not\`
Compound conditions combine multiple boolean checks:
- \`condition_a and condition_b\`: True only if both sides evaluate to True.
- \`condition_a or condition_b\`: True if at least one side is True.
- \`not condition\`: Inverts the boolean truthiness.

#### Short-Circuit Evaluation
Python stops evaluating as soon as the result is certain:
- In \`False and func()\`, \`func()\` is never called!
- In \`True or func()\`, \`func()\` is never called!`,
          story: `A medical biosensor alert system checks whether a patient needs immediate trauma resuscitation.
Create a function \`needs_trauma_alert(heart_rate, blood_pressure, oxygen_sat, is_conscious)\`:
Return \`True\` if:
1. \`is_conscious\` is \`False\` **AND** (\`heart_rate < 40\` **OR** \`heart_rate > 150\`)
   **OR**
2. \`blood_pressure < 80\` **OR** \`oxygen_sat < 88\`
Otherwise return \`False\`.`,
          tasks: [
            { id: "t1", description: "Write function needs_trauma_alert with the 4 parameters." },
            { id: "t2", description: "Combine criteria using parenthesis and and / or operators." },
            { id: "t3", description: "Return the resulting boolean." },
          ],
          starterCode: `def needs_trauma_alert(heart_rate, blood_pressure, oxygen_sat, is_conscious):
    # Return True if any trauma criteria met, else False
    pass
`,
          solutionCode: `def needs_trauma_alert(heart_rate, blood_pressure, oxygen_sat, is_conscious):
    unconscious_cardiac_emergency = (not is_conscious) and (heart_rate < 40 or heart_rate > 150)
    vitals_critical = blood_pressure < 80 or oxygen_sat < 88
    return unconscious_cardiac_emergency or vitals_critical`,
          solutionExplanation:
            "Grouping conditions with parentheses clarifies operator precedence and prevents accidental logical bugs.",
          hints: [
            {
              id: "h1",
              title: "Parentheses",
              content: "Group `(heart_rate < 40 or heart_rate > 150)` with parentheses so `and` binds cleanly.",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Unconscious with extreme tachycardic heart rate triggers alert",
              assertionCode: `assert needs_trauma_alert(160, 110, 95, False) == True`,
            },
            {
              id: "tc2",
              description: "Low blood pressure triggers alert even if conscious",
              assertionCode: `assert needs_trauma_alert(72, 75, 98, True) == True`,
            },
            {
              id: "tc3",
              description: "Normal healthy vitals do not trigger alert",
              assertionCode: `assert needs_trauma_alert(72, 120, 99, True) == False`,
            },
            {
              id: "tc4",
              description: "Conscious with elevated heart rate does not trigger alert if other vitals normal",
              assertionCode: `assert needs_trauma_alert(160, 120, 98, True) == False`,
            },
          ],
        },
      ],
    },
    {
      id: "mod-3",
      title: "Module 3: Loops & Iterations",
      description: "Mastering for loops, while loops, range generation, and iteration control.",
      order: 3,
      lessons: [
        {
          id: "py-06-for-loops-range",
          moduleId: "mod-3",
          order: 1,
          title: "3.1 For Loops and the range() Function",
          difficulty: "Beginner",
          estimatedMinutes: 12,
          xpReward: 95,
          tags: ["Loops", "Iteration", "Range"],
          concept: `### Iterating with \`for\` and \`range()\`
In Python, \`for\` loops iterate over sequences. The \`range()\` built-in generates arithmetic progressions without allocating full lists in memory:

\`\`\`python
# range(start, stop, step)
for i in range(1, 10, 2):
    print(i) # Prints 1, 3, 5, 7, 9
\`\`\`

Note: The \`stop\` parameter is **exclusive**. \`range(0, 5)\` produces \`0, 1, 2, 3, 4\`.`,
          story: `You are constructing a cryptographic checksum accumulator.
Write a function \`accumulate_multiples(limit, factor)\`:
Sum all integers from \`1\` up to \`limit\` (inclusive) that are evenly divisible by \`factor\`. If \`limit <= 0\` or \`factor <= 0\`, return \`0\`.`,
          tasks: [
            { id: "t1", description: "Validate that limit and factor are > 0, otherwise return 0." },
            { id: "t2", description: "Iterate from 1 up to limit inclusive using a for loop." },
            { id: "t3", description: "Check if number % factor == 0 and sum them." },
            { id: "t4", description: "Return the final total sum." },
          ],
          starterCode: `def accumulate_multiples(limit, factor):
    # Sum all numbers from 1 to limit divisible by factor
    pass
`,
          solutionCode: `def accumulate_multiples(limit, factor):
    if limit <= 0 or factor <= 0:
        return 0
    total = 0
    for num in range(1, limit + 1):
        if num % factor == 0:
            total += num
    return total`,
          solutionExplanation:
            "range(1, limit + 1) generates numbers up to limit inclusive. The modulo operator `%` tests divisibility.",
          hints: [
            {
              id: "h1",
              title: "Inclusive Upper Bound",
              content: "Remember that range stops *before* the second argument, so use `range(1, limit + 1)`.",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Sums multiples of 3 up to 10 (3 + 6 + 9 = 18)",
              assertionCode: `assert accumulate_multiples(10, 3) == 18`,
            },
            {
              id: "tc2",
              description: "Sums multiples of 5 up to 25",
              assertionCode: `assert accumulate_multiples(25, 5) == 75`,
            },
            {
              id: "tc3",
              description: "Handles negative or zero bounds safely",
              assertionCode: `assert accumulate_multiples(-5, 2) == 0 and accumulate_multiples(10, 0) == 0`,
            },
          ],
        },
        {
          id: "py-07-while-loops",
          moduleId: "mod-3",
          order: 2,
          title: "3.2 While Loops & Convergence",
          difficulty: "Intermediate",
          estimatedMinutes: 12,
          xpReward: 100,
          tags: ["While", "Simulation", "Algorithms"],
          concept: `### While Loops
A \`while\` loop repeatedly executes as long as a condition evaluates to \`True\`:

\`\`\`python
count = 0
while count < 3:
    print(count)
    count += 1
\`\`\`

#### Preventing Infinite Loops
Always ensure the state changes inside the loop body to eventually falsify the condition. Use \`break\` to prematurely terminate a loop.`,
          story: `You are simulating radioactive decay of an isotope sample.
Write a function \`simulate_decay(initial_atoms, half_life_days, target_atoms)\`:
Starting with \`initial_atoms\`, calculate how many days elapse until the remaining atoms are less than or equal to \`target_atoms\`. Each step of \`half_life_days\`, the atom count is halved using integer floor division (\`// 2\`).
Return the total elapsed days.`,
          tasks: [
            { id: "t1", description: "Initialize elapsed_days = 0 and current_atoms = initial_atoms." },
            { id: "t2", description: "Loop while current_atoms > target_atoms." },
            { id: "t3", description: "In each iteration: halve current_atoms (// 2) and increment elapsed_days by half_life_days." },
            { id: "t4", description: "Return total elapsed_days." },
          ],
          starterCode: `def simulate_decay(initial_atoms, half_life_days, target_atoms):
    # Calculate days until atoms drop <= target_atoms
    pass
`,
          solutionCode: `def simulate_decay(initial_atoms, half_life_days, target_atoms):
    elapsed_days = 0
    current_atoms = initial_atoms
    while current_atoms > target_atoms:
        current_atoms = current_atoms // 2
        elapsed_days += half_life_days
    return elapsed_days`,
          solutionExplanation:
            "The while loop simulates discrete time increments until convergence condition is reached.",
          hints: [
            {
              id: "h1",
              title: "Condition",
              content: "Loop condition is `while current_atoms > target_atoms:`",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "1000 atoms decaying to <= 125 with 5 day half life (3 cycles = 15 days)",
              assertionCode: `assert simulate_decay(1000, 5, 125) == 15`,
            },
            {
              id: "tc2",
              description: "Already at or below target requires 0 days",
              assertionCode: `assert simulate_decay(100, 3, 100) == 0`,
            },
            {
              id: "tc3",
              description: "Large sample simulation",
              assertionCode: `assert simulate_decay(1024, 2, 1) == 20`,
            },
          ],
        },
      ],
    },
    {
      id: "mod-4",
      title: "Module 4: Functions & Scope",
      description: "First-class functions, parameters, return values, *args, **kwargs, and lexical scope.",
      order: 4,
      lessons: [
        {
          id: "py-08-functions-args-kwargs",
          moduleId: "mod-4",
          order: 1,
          title: "4.1 Dynamic Arguments: *args and **kwargs",
          difficulty: "Intermediate",
          estimatedMinutes: 14,
          xpReward: 110,
          tags: ["Functions", "Args", "Kwargs"],
          concept: `### Flexible Signatures: *args and **kwargs
Python allows functions to accept variable numbers of positional and keyword arguments:

\`\`\`python
def log_event(event_name, *tags, **metadata):
    print(f"Event: {event_name}")
    print(f"Tags tuple: {tags}")
    print(f"Metadata dict: {metadata}")

log_event("user_login", "security", "auth", ip="10.0.0.1", status=200)
\`\`\`
- \`*args\` collects extra positional parameters into a **tuple**.
- \`**kwargs\` collects extra keyword parameters into a **dictionary**.`,
          story: `You are creating the telemetry logger for a distributed cloud fleet.
Write a function \`build_log_entry(service_name, *tags, **details)\`:
Return a formatted dictionary with exact keys:
- \`"service"\`: \`service_name.upper()\`
- \`"tags"\`: list of tags sorted alphabetically (e.g. \`sorted(list(tags))\`)
- \`"details_count"\`: number of keys passed in \`**details\`
- \`"details"\`: the \`details\` dictionary itself`,
          tasks: [
            { id: "t1", description: "Accept service_name, *tags, and **details in function definition." },
            { id: "t2", description: "Convert service_name to uppercase." },
            { id: "t3", description: "Sort tags into an alphabetical list." },
            { id: "t4", description: "Return dictionary with keys 'service', 'tags', 'details_count', and 'details'." },
          ],
          starterCode: `def build_log_entry(service_name, *tags, **details):
    # Construct and return telemetry payload dictionary
    pass
`,
          solutionCode: `def build_log_entry(service_name, *tags, **details):
    return {
        "service": service_name.upper(),
        "tags": sorted(list(tags)),
        "details_count": len(details),
        "details": details
    }`,
          solutionExplanation:
            "*tags unpacks variable positional arguments into a tuple, which we sort into a list with sorted(). **details collects keyword arguments into a dictionary.",
          hints: [
            {
              id: "h1",
              title: "Sorting Tags",
              content: "Use `sorted(list(tags))` to obtain an alphabetically sorted list.",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Builds log with multiple tags and metadata",
              assertionCode: `entry = build_log_entry("auth-service", "security", "v2", region="us-east", latency_ms=12)
assert entry["service"] == "AUTH-SERVICE"
assert entry["tags"] == ["security", "v2"]
assert entry["details_count"] == 2
assert entry["details"]["region"] == "us-east"`,
            },
            {
              id: "tc2",
              description: "Handles empty tags and details",
              assertionCode: `entry = build_log_entry("payments")
assert entry["service"] == "PAYMENTS"
assert entry["tags"] == []
assert entry["details_count"] == 0`,
            },
          ],
        },
      ],
    },
    {
      id: "mod-5",
      title: "Module 5: Core Data Structures",
      description: "Lists, dictionaries, sets, and tuples under the hood.",
      order: 5,
      lessons: [
        {
          id: "py-09-lists-and-dicts",
          moduleId: "mod-5",
          order: 1,
          title: "5.1 Deep Dive: Dictionaries & Key Frequency",
          difficulty: "Intermediate",
          estimatedMinutes: 15,
          xpReward: 120,
          tags: ["Data Structures", "Dictionaries", "Lists"],
          concept: `### Dictionaries: O(1) Hash Map Performance
Python dictionaries are backed by high-speed hash tables:
\`\`\`python
inventory = {"laser": 4, "shield": 2}
inventory["laser"] += 1       # Mutate
inventory["fuel"] = 100       # Insert
val = inventory.get("warp", 0)# Safe lookup with default
\`\`\`

#### Iterating Over Dictionaries
- \`dict.keys()\`: all keys
- \`dict.values()\`: all values
- \`dict.items()\`: \`(key, value)\` tuples`,
          story: `You are analyzing financial transaction logs for a high-frequency trading platform.
Write a function \`aggregate_portfolio(trades)\`:
\`trades\` is a list of dictionaries, where each trade looks like:
\`{"ticker": "NVDA", "shares": 10, "action": "BUY"}\` (or \`"SELL"\`).
Return a dictionary showing the net shares owned for each ticker. If a ticker ends up with 0 shares, it should still be included with value \`0\`. If a ticker is sold, subtract the shares.`,
          tasks: [
            { id: "t1", description: "Iterate through each trade in trades list." },
            { id: "t2", description: "If action == 'BUY', add shares to ticker balance." },
            { id: "t3", description: "If action == 'SELL', subtract shares from ticker balance." },
            { id: "t4", description: "Return dictionary of {ticker: net_shares}." },
          ],
          starterCode: `def aggregate_portfolio(trades):
    # Calculate net shares per ticker
    pass
`,
          solutionCode: `def aggregate_portfolio(trades):
    portfolio = {}
    for trade in trades:
        ticker = trade["ticker"]
        shares = trade["shares"]
        action = trade["action"]
        
        if ticker not in portfolio:
            portfolio[ticker] = 0
            
        if action == "BUY":
            portfolio[ticker] += shares
        elif action == "SELL":
            portfolio[ticker] -= shares
    return portfolio`,
          solutionExplanation:
            "Using a dictionary with key checking (or get/default) enables clean tallying across multiple transactions.",
          hints: [
            {
              id: "h1",
              title: "Initialization",
              content: "Check `if ticker not in portfolio: portfolio[ticker] = 0` before updating.",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Computes portfolio with buys and sells",
              assertionCode: `trades = [
    {"ticker": "AAPL", "shares": 50, "action": "BUY"},
    {"ticker": "TSLA", "shares": 20, "action": "BUY"},
    {"ticker": "AAPL", "shares": 15, "action": "SELL"},
]
res = aggregate_portfolio(trades)
assert res["AAPL"] == 35
assert res["TSLA"] == 20`,
            },
            {
              id: "tc2",
              description: "Handles empty trades list",
              assertionCode: `assert aggregate_portfolio([]) == {}`,
            },
          ],
        },
      ],
    },
    {
      id: "mod-6",
      title: "Module 6: Object-Oriented Python",
      description: "Classes, instances, the dunder methods, encapsulation, and inheritance.",
      order: 6,
      lessons: [
        {
          id: "py-10-classes-and-oop",
          moduleId: "mod-6",
          order: 1,
          title: "6.1 Classes, Methods & State Encapsulation",
          difficulty: "Intermediate",
          estimatedMinutes: 16,
          xpReward: 130,
          tags: ["OOP", "Classes", "Methods"],
          concept: `### Object-Oriented Programming (OOP)
Classes are blueprints for creating objects with bundled state and behavior:

\`\`\`python
class BankAccount:
    def __init__(self, owner: str, initial_balance: float = 0.0):
        self.owner = owner
        self.balance = initial_balance

    def deposit(self, amount: float) -> float:
        if amount > 0:
            self.balance += amount
        return self.balance
\`\`\`
- \`__init__\` is the constructor method called upon instantiation.
- \`self\` refers to the current instance of the class.`,
          story: `You are engineering a cloud container scheduler.
Create a class \`WorkerNode\`:
- \`__init__(self, node_id: str, max_cpu: int, max_ram_gb: int)\`:
  - Stores \`node_id\`, \`max_cpu\`, \`max_ram_gb\`.
  - Initializes \`used_cpu = 0\` and \`used_ram_gb = 0\`.
  - Initializes an empty list \`active_tasks = []\`.
- \`can_fit(self, task_cpu: int, task_ram_gb: int) -> bool\`:
  - Returns \`True\` if adding the task would not exceed \`max_cpu\` or \`max_ram_gb\`, else \`False\`.
- \`assign_task(self, task_name: str, task_cpu: int, task_ram_gb: int) -> bool\`:
  - If \`can_fit\`, add task to \`active_tasks\`, increase \`used_cpu\` & \`used_ram_gb\`, and return \`True\`.
  - If it cannot fit, return \`False\` without modifying state.`,
          tasks: [
            { id: "t1", description: "Implement WorkerNode.__init__ with capacity and usage state." },
            { id: "t2", description: "Implement can_fit(self, task_cpu, task_ram_gb)." },
            { id: "t3", description: "Implement assign_task(self, task_name, task_cpu, task_ram_gb)." },
          ],
          starterCode: `class WorkerNode:
    def __init__(self, node_id, max_cpu, max_ram_gb):
        # Initialize attributes
        pass

    def can_fit(self, task_cpu, task_ram_gb):
        # Return True if task fits
        pass

    def assign_task(self, task_name, task_cpu, task_ram_gb):
        # Assign task if fits, return boolean
        pass
`,
          solutionCode: `class WorkerNode:
    def __init__(self, node_id, max_cpu, max_ram_gb):
        self.node_id = node_id
        self.max_cpu = max_cpu
        self.max_ram_gb = max_ram_gb
        self.used_cpu = 0
        self.used_ram_gb = 0
        self.active_tasks = []

    def can_fit(self, task_cpu, task_ram_gb):
        return (self.used_cpu + task_cpu <= self.max_cpu) and (self.used_ram_gb + task_ram_gb <= self.max_ram_gb)

    def assign_task(self, task_name, task_cpu, task_ram_gb):
        if self.can_fit(task_cpu, task_ram_gb):
            self.used_cpu += task_cpu
            self.used_ram_gb += task_ram_gb
            self.active_tasks.append(task_name)
            return True
        return False`,
          solutionExplanation:
            "Methods reference instance attributes via `self`. By modularizing capacity checking in `can_fit`, `assign_task` keeps code DRY and bug-free.",
          hints: [
            {
              id: "h1",
              title: "Checking capacity",
              content: "Make sure `self.used_cpu + task_cpu <= self.max_cpu`.",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Instantiates node and fits task within limits",
              assertionCode: `node = WorkerNode("node-alpha", 8, 32)
assert node.can_fit(4, 16) == True
assert node.assign_task("api-server", 4, 16) == True
assert node.used_cpu == 4
assert node.used_ram_gb == 16
assert "api-server" in node.active_tasks`,
            },
            {
              id: "tc2",
              description: "Rejects task that exceeds remaining CPU capacity",
              assertionCode: `node = WorkerNode("node-beta", 4, 16)
node.assign_task("db", 3, 8)
assert node.can_fit(2, 4) == False
assert node.assign_task("heavy-cron", 2, 4) == False
assert len(node.active_tasks) == 1`,
            },
          ],
        },
      ],
    },
    {
      id: "mod-7",
      title: "Module 7: Error Handling & Resilience",
      description: "Defensive programming, try/except blocks, custom exceptions, and context managers.",
      order: 7,
      lessons: [
        {
          id: "py-11-exceptions-handling",
          moduleId: "mod-7",
          order: 1,
          title: "7.1 Defensive Python: Try, Except & Custom Exceptions",
          difficulty: "Intermediate",
          estimatedMinutes: 15,
          xpReward: 135,
          tags: ["Exceptions", "Error Handling", "Architecture"],
          concept: `### Graceful Failure Handling
In production software, errors must be caught and handled cleanly:

\`\`\`python
try:
    value = int(user_input)
    result = 100 / value
except ValueError:
    print("Invalid numeric string.")
except ZeroDivisionError:
    print("Cannot divide by zero.")
else:
    print(f"Success: {result}")
finally:
    print("Execution complete.")
\`\`\``,
          story: `You are building the input sanitizer for a banking fund-transfer API.
Create a custom exception class \`TransferValidationError(Exception)\`.
Then write a function \`validate_transfer(account_number, amount, sender_balance)\`:
- If \`not isinstance(account_number, str)\` or \`len(account_number) != 10\` or \`not account_number.isdigit()\`, raise \`TransferValidationError("Invalid account number")\`.
- If \`amount <= 0\`, raise \`TransferValidationError("Amount must be positive")\`.
- If \`amount > sender_balance\`, raise \`TransferValidationError("Insufficient funds")\`.
- If all checks pass, return string: \`f"APPROVED: {amount} to {account_number}"\`.`,
          tasks: [
            { id: "t1", description: "Define TransferValidationError inheriting from Exception." },
            { id: "t2", description: "Validate account_number (10 digits string), raise TransferValidationError on failure." },
            { id: "t3", description: "Validate amount > 0 and amount <= sender_balance, raise TransferValidationError on failure." },
            { id: "t4", description: "Return approval string if valid." },
          ],
          starterCode: `class TransferValidationError(Exception):
    pass

def validate_transfer(account_number, amount, sender_balance):
    # Validate transfer parameters or raise TransferValidationError
    pass
`,
          solutionCode: `class TransferValidationError(Exception):
    pass

def validate_transfer(account_number, amount, sender_balance):
    if not isinstance(account_number, str) or len(account_number) != 10 or not account_number.isdigit():
        raise TransferValidationError("Invalid account number")
    if amount <= 0:
        raise TransferValidationError("Amount must be positive")
    if amount > sender_balance:
        raise TransferValidationError("Insufficient funds")
    return f"APPROVED: {amount} to {account_number}"`,
          solutionExplanation:
            "Custom exceptions allow callers to distinguish domain validation failures from unexpected runtime bugs.",
          hints: [
            {
              id: "h1",
              title: "Checking Digits",
              content: "You can use `account_number.isdigit()` to verify string contains only digits.",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Approves valid transfer",
              assertionCode: `assert validate_transfer("1234567890", 250, 1000) == "APPROVED: 250 to 1234567890"`,
            },
            {
              id: "tc2",
              description: "Raises TransferValidationError on insufficient funds",
              assertionCode: `try:
    validate_transfer("1234567890", 1500, 1000)
    assert False, "Should have raised TransferValidationError"
except TransferValidationError as e:
    assert str(e) == "Insufficient funds"`,
            },
            {
              id: "tc3",
              description: "Raises TransferValidationError on invalid account length",
              assertionCode: `try:
    validate_transfer("12345", 50, 1000)
    assert False, "Should have raised TransferValidationError"
except TransferValidationError as e:
    assert str(e) == "Invalid account number"`,
            },
          ],
        },
      ],
    },
    {
      id: "mod-8",
      title: "Module 8: Pythonic Paradigms",
      description: "List comprehensions, generator expressions, decorators, and functional tools.",
      order: 8,
      lessons: [
        {
          id: "py-12-comprehensions-decorators",
          moduleId: "mod-8",
          order: 1,
          title: "8.1 Comprehensions & Function Decorators",
          difficulty: "Advanced",
          estimatedMinutes: 18,
          xpReward: 160,
          tags: ["Comprehensions", "Decorators", "Functional"],
          concept: `### Pythonic Elegance: Comprehensions & Decorators
Comprehensions provide concise syntax for transforming iterables:
\`\`\`python
evens_squared = [x**2 for x in range(10) if x % 2 == 0]
\`\`\`

#### Decorators: Higher-Order Function Wrappers
Decorators wrap functions to extend their behavior without altering their code:
\`\`\`python
def timer(fn):
    def wrapper(*args, **kwargs):
        print("Starting execution...")
        result = fn(*args, **kwargs)
        print("Finished execution.")
        return result
    return wrapper

@timer
def compute():
    return 42
\`\`\``,
          story: `You are creating an execution auditor for high-stakes mathematical computations.
1. Write a decorator \`validate_non_negative(fn)\`:
   - It intercepts the arguments to the decorated function.
   - If any positional argument is less than \`0\`, it must raise a \`ValueError("Negative arguments not allowed")\`.
   - Otherwise, it returns the output of \`fn(*args, **kwargs)\`.
2. Apply \`@validate_non_negative\` to a function \`sum_positive_squares(*numbers)\` which uses a list comprehension to square all numbers and return their sum.`,
          tasks: [
            { id: "t1", description: "Write decorator validate_non_negative." },
            { id: "t2", description: "Check if any positional arg is < 0, raising ValueError if so." },
            { id: "t3", description: "Decorate sum_positive_squares with @validate_non_negative." },
            { id: "t4", description: "Implement sum_positive_squares using list comprehension sum([x**2 for x in numbers])." },
          ],
          starterCode: `def validate_non_negative(fn):
    def wrapper(*args, **kwargs):
        # Inspect args for negatives
        pass
    return wrapper

# Apply decorator
def sum_positive_squares(*numbers):
    pass
`,
          solutionCode: `def validate_non_negative(fn):
    def wrapper(*args, **kwargs):
        for arg in args:
            if isinstance(arg, (int, float)) and arg < 0:
                raise ValueError("Negative arguments not allowed")
        return fn(*args, **kwargs)
    return wrapper

@validate_non_negative
def sum_positive_squares(*numbers):
    return sum([x ** 2 for x in numbers])`,
          solutionExplanation:
            "Decorators take a function as input, return a closure wrapper that performs pre-flight checks, and call the original function.",
          hints: [
            {
              id: "h1",
              title: "Wrapper args",
              content: "Loop through `for arg in args:` inside the wrapper to check `arg < 0`.",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Computes sum of squares for valid positive numbers",
              assertionCode: `assert sum_positive_squares(2, 3, 4) == 29`,
            },
            {
              id: "tc2",
              description: "Raises ValueError when a negative argument is passed",
              assertionCode: `try:
    sum_positive_squares(2, -1, 4)
    assert False, "Should have raised ValueError"
except ValueError as e:
    assert str(e) == "Negative arguments not allowed"`,
            },
          ],
        },
      ],
    },
    {
      id: "mod-9",
      title: "Module 9: Professional Python",
      description: "Production engineering: Type hints, Dataclasses, AsyncIO concurrency, and API contracts.",
      order: 9,
      lessons: [
        {
          id: "py-13-dataclasses-typing",
          moduleId: "mod-9",
          order: 1,
          title: "9.1 Dataclasses & Robust Type Contracts",
          difficulty: "Pro",
          estimatedMinutes: 20,
          xpReward: 180,
          tags: ["Dataclasses", "Typing", "Production"],
          concept: `### Modern Production Python: Dataclasses
The \`@dataclass\` decorator automatically writes \`__init__\`, \`__repr__\`, and \`__eq__\` methods for clean domain models:

\`\`\`python
from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class MicroserviceConfig:
    service_id: str
    port: int = 8080
    endpoints: List[str] = field(default_factory=list)
\`\`\`

#### Benefits in Enterprise Systems
- Eliminates repetitive boilerplate constructor code.
- Works seamlessly with static type linters (Mypy, Pyright).
- Built-in structural equality comparison.`,
          story: `You are architecting the transaction pipeline for a distributed payment network.
Using \`@dataclass\`, define \`PaymentPacket\`:
- \`transaction_id: str\`
- \`amount_cents: int\`
- \`currency: str\` (default to \`"USD"\`)
- \`is_settled: bool\` (default to \`False\`)

Add a method to the dataclass:
- \`settle(self) -> None\`: sets \`self.is_settled = True\`
- \`as_dollar_str(self) -> str\`: returns \`f"\${self.amount_cents / 100:.2f} {self.currency}"\``,
          tasks: [
            { id: "t1", description: "Import dataclass from dataclasses." },
            { id: "t2", description: "Define PaymentPacket dataclass with transaction_id, amount_cents, currency, and is_settled." },
            { id: "t3", description: "Implement settle() method." },
            { id: "t4", description: "Implement as_dollar_str() returning formatted dollar currency string." },
          ],
          starterCode: `from dataclasses import dataclass

# Define PaymentPacket dataclass here
`,
          solutionCode: `from dataclasses import dataclass

@dataclass
class PaymentPacket:
    transaction_id: str
    amount_cents: int
    currency: str = "USD"
    is_settled: bool = False

    def settle(self) -> None:
        self.is_settled = True

    def as_dollar_str(self) -> str:
        dollars = self.amount_cents / 100
        return f"\${dollars:.2f} {self.currency}"`,
          solutionExplanation:
            "Dataclasses generate clean constructors with default arguments, while allowing standard methods to be attached directly.",
          hints: [
            {
              id: "h1",
              title: "Dataclass syntax",
              content: "Decorate class with `@dataclass` and list attributes with type annotations.",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Instantiates PaymentPacket with defaults and settles",
              assertionCode: `pkt = PaymentPacket(transaction_id="tx_9918", amount_cents=4999)
assert pkt.currency == "USD"
assert pkt.is_settled == False
assert pkt.as_dollar_str() == "\$49.99 USD"
pkt.settle()
assert pkt.is_settled == True`,
            },
            {
              id: "tc2",
              description: "Supports custom currency and structural equality",
              assertionCode: `p1 = PaymentPacket("tx_01", 1000, "EUR", True)
p2 = PaymentPacket("tx_01", 1000, "EUR", True)
assert p1 == p2
assert p1.as_dollar_str() == "\$10.00 EUR"`,
            },
          ],
        },
      ],
    },
  ],
};

export const coursesCatalog: Course[] = [
  pythonCourse,
  {
    id: "course-typescript",
    slug: "typescript",
    title: "TypeScript Enterprise Architecture",
    tagline: "Type-level programming, generics, compile-time validation, and modern backend systems.",
    description: "Coming soon. Master high-scale Node.js and browser engineering with advanced type mechanics.",
    iconName: "Code",
    badge: "Coming Soon",
    level: "Intermediate to Pro",
    estimatedHours: 18,
    totalXp: 2800,
    colorAccent: "cyan",
    modules: [],
  },
  {
    id: "course-rust",
    slug: "rust",
    title: "Rust Systems & Memory Safety",
    tagline: "Borrow checker, concurrency without data races, and bare-metal high-throughput performance.",
    description: "Coming soon. Zero-cost abstractions and fearless concurrency for modern systems programming.",
    iconName: "Cpu",
    badge: "Coming Soon",
    level: "Intermediate to Pro",
    estimatedHours: 30,
    totalXp: 4500,
    colorAccent: "amber",
    modules: [],
  },
  {
    id: "course-go",
    slug: "go",
    title: "Go: Cloud Native Microservices",
    tagline: "Goroutines, channels, interfaces, and blazing-fast distributed backend services.",
    description: "Coming soon. Build resilient network servers and Kubernetes-native distributed microservices.",
    iconName: "Terminal",
    badge: "Coming Soon",
    level: "Beginner to Advanced",
    estimatedHours: 16,
    totalXp: 2500,
    colorAccent: "violet",
    modules: [],
  },
];
