import { Course } from "./types";

export const pythonCourse: Course = {
  id: "course-python",
  slug: "python",
  title: "Python 3: Artemis Mission Control Masterclass",
  tagline: "Grounded in the 13-Hour Python Masterclass by Data with Baraa. Build the complete Artemis Mission Control Suite step-by-step.",
  description:
    "Master Python from absolute beginner to professional engineer through the Artemis Mission Control grounding project. Covers standard I/O, strings, arithmetic, logical decision trees, loops, lists, dictionaries, tuples, sets, functions, error handling, and terminal application architecture.",
  iconName: "Terminal",
  badge: "Artemis Grounding Project",
  level: "Zero to Hero (13h Masterclass)",
  estimatedHours: 26,
  totalXp: 4200,
  colorAccent: "emerald",
  modules: [
    {
      id: "mod-1",
      title: "Module 1: Mission Control Initialization",
      description: "Console telemetry, comments, print formatting, variable memory, dynamic typing, and numeric computations.",
      order: 1,
      lessons: [
        {
          id: "py-01-comments-print",
          moduleId: "mod-1",
          order: 1,
          title: "1.1 Comments & Console Telemetry: print()",
          difficulty: "Beginner",
          estimatedMinutes: 8,
          xpReward: 60,
          tags: ["Print", "Comments", "Output"],
          concept: `### Console Telemetry with \`print()\`
In Python, \`print()\` outputs data to the system console (\`sys.stdout\`).

\`\`\`python
# Single-line comment explaining the telemetry ping
print("ARTEMIS MISSION CONTROL: ONLINE")
\`\`\`

#### Key Syntax Principles
- Strings must be enclosed in double quotes \`"..."\` or single quotes \`'...\`.
- Comments begin with \`#\` and are completely ignored by the Python interpreter.
- You can pass multiple values to \`print()\` separated by commas:
\`\`\`python
print("STATUS:", "ORBITAL INSERTION", "NOMINAL")
\`\`\`
- Control line ends and separators with \`sep\` and \`end\`:
\`\`\`python
print("COMM_1", "COMM_2", sep=" | ")
\`\`\``,
          story: `Welcome to the Artemis Mission Control center at NASA Space Flight Operations.
You are tasked with writing the initial startup diagnostic banner for the central flight console.

Initialize the console by printing the exact banner string:
**"=== ARTEMIS MISSION CONTROL ACTIVE ==="**
followed by a second line:
**"FLIGHT STATUS: GO FOR LAUNCH"**`,
          tasks: [
            { id: "t1", description: "Use print() to output '=== ARTEMIS MISSION CONTROL ACTIVE ==='" },
            { id: "t2", description: "Use print() to output 'FLIGHT STATUS: GO FOR LAUNCH' on the second line" },
            { id: "t3", description: "Include at least one comment explaining the startup sequence" },
          ],
          starterCode: `# Artemis Mission Control - Subsystem Boot Script
# Write your startup print statements below:

`,
          solutionCode: `# Artemis Mission Control Console Startup Banner
print("=== ARTEMIS MISSION CONTROL ACTIVE ===")
print("FLIGHT STATUS: GO FOR LAUNCH")`,
          solutionExplanation:
            "Each call to print() outputs text followed by a default newline. Comments starting with # clarify mission code without affecting execution.",
          hints: [
            {
              id: "h1",
              title: "Double Quotes",
              content: 'Write: print("=== ARTEMIS MISSION CONTROL ACTIVE ===")',
            },
            {
              id: "h2",
              title: "Second Print",
              content: 'On the next line, call: print("FLIGHT STATUS: GO FOR LAUNCH")',
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Outputs header banner '=== ARTEMIS MISSION CONTROL ACTIVE ==='",
              assertionCode: `assert "=== ARTEMIS MISSION CONTROL ACTIVE ===" in __stdout__, "Mission banner was not found in output"`,
            },
            {
              id: "tc2",
              description: "Outputs status line 'FLIGHT STATUS: GO FOR LAUNCH'",
              assertionCode: `assert "FLIGHT STATUS: GO FOR LAUNCH" in __stdout__, "Flight status confirmation was not found in output"`,
            },
          ],
        },
        {
          id: "py-02-variables-types",
          moduleId: "mod-1",
          order: 2,
          title: "1.2 Flight Telemetry Variables & Dynamic Typing",
          difficulty: "Beginner",
          estimatedMinutes: 10,
          xpReward: 75,
          tags: ["Variables", "Types", "Memory"],
          concept: `### Spacecraft Variables & Data Types
Variables store state in memory without needing explicit type declarations (dynamic typing):

\`\`\`python
spacecraft_name = "Orion"   # str (string)
mission_day = 4             # int (integer)
velocity_km_s = 10.84       # float (floating point)
docking_latched = True      # bool (boolean)
\`\`\`

#### Inspecting Types with \`type()\`
You can inspect the internal data type of any variable using \`type()\`:
\`\`\`python
print(type(spacecraft_name))  # <class 'str'>
print(type(mission_day))      # <class 'int'>
print(type(velocity_km_s))    # <class 'float'>
\`\`\``,
          story: `Configure the core telemetry variables for the Artemis lunar lander.
Create:
1. \`mission_code\`: assigned to \`"ARTEMIS-III"\`
2. \`crew_count\`: assigned to integer \`4\`
3. \`oxygen_pct\`: assigned to float \`98.5\`
4. \`is_abort_safe\`: assigned to boolean \`True\`

Then print a formatted status report combining these variables.`,
          tasks: [
            { id: "t1", description: "Declare mission_code as string 'ARTEMIS-III'" },
            { id: "t2", description: "Declare crew_count as integer 4" },
            { id: "t3", description: "Declare oxygen_pct as float 98.5" },
            { id: "t4", description: "Declare is_abort_safe as boolean True" },
          ],
          starterCode: `# Artemis Mission Telemetry Variables
# Define mission_code, crew_count, oxygen_pct, and is_abort_safe

`,
          solutionCode: `mission_code = "ARTEMIS-III"
crew_count = 4
oxygen_pct = 98.5
is_abort_safe = True

print(f"{mission_code}: Crew={crew_count}, O2={oxygen_pct}%, Safe={is_abort_safe}")`,
          solutionExplanation:
            "Variables allocate memory registers dynamically. Python detects strings, integers, floats, and booleans automatically.",
          hints: [
            {
              id: "h1",
              title: "Booleans",
              content: "In Python, booleans are capitalized: True and False (not lowercase true).",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "mission_code is string 'ARTEMIS-III'",
              assertionCode: `assert mission_code == "ARTEMIS-III" and isinstance(mission_code, str)`,
            },
            {
              id: "tc2",
              description: "crew_count is integer 4",
              assertionCode: `assert crew_count == 4 and isinstance(crew_count, int)`,
            },
            {
              id: "tc3",
              description: "oxygen_pct is float 98.5",
              assertionCode: `assert abs(oxygen_pct - 98.5) < 1e-5 and isinstance(oxygen_pct, float)`,
            },
            {
              id: "tc4",
              description: "is_abort_safe is boolean True",
              assertionCode: `assert is_abort_safe is True and isinstance(is_abort_safe, bool)`,
            },
          ],
        },
        {
          id: "py-03-math-numeric-types",
          moduleId: "mod-1",
          order: 3,
          title: "1.3 Trajectory Arithmetic: Operators & Conversions",
          difficulty: "Beginner",
          estimatedMinutes: 12,
          xpReward: 85,
          tags: ["Math", "Arithmetic", "Operators"],
          concept: `### Space Flight Arithmetic Operators
Python provides full mathematical capability with standard operator precedence:

| Operator | Purpose | Flight Example |
| :--- | :--- | :--- |
| \`+\` | Addition | \`payload_mass + fuel_mass\` |
| \`-\` | Subtraction | \`altitude - ground_elevation\` |
| \`*\` | Multiplication | \`thrust_per_engine * 4\` |
| \`/\` | True Division (float) | \`distance / time\` |
| \`//\` | Floor Division (integer) | \`total_rations // crew_count\` |
| \`%\` | Modulo (remainder) | \`elapsed_seconds % 60\` |
| \`**\` | Exponentiation | \`velocity ** 2\` |

#### Explicit Type Casting: \`int()\`, \`float()\`, \`str()\`
\`\`\`python
val_str = "125"
val_int = int(val_str)
val_float = float(val_int)
\`\`\``,
          story: `The flight computer needs a function to calculate the kinetic energy of the spacecraft during trans-lunar injection.
Kinetic energy formula: \`E = 0.5 * mass_kg * (velocity_ms ** 2)\`.
Write a function \`compute_kinetic_energy(mass_kg: float, velocity_ms: float) -> float\` that computes and returns this value rounded to 2 decimal places using \`round(val, 2)\`.`,
          tasks: [
            { id: "t1", description: "Define compute_kinetic_energy(mass_kg, velocity_ms)" },
            { id: "t2", description: "Compute 0.5 * mass_kg * (velocity_ms ** 2)" },
            { id: "t3", description: "Return the result rounded to 2 decimal places" },
          ],
          starterCode: `def compute_kinetic_energy(mass_kg, velocity_ms):
    # Compute and return kinetic energy in Joules
    pass
`,
          solutionCode: `def compute_kinetic_energy(mass_kg, velocity_ms):
    energy = 0.5 * mass_kg * (velocity_ms ** 2)
    return round(energy, 2)`,
          solutionExplanation:
            "Exponentiation with ** takes precedence over multiplication. round(..., 2) formats to 2 decimal places.",
          hints: [
            {
              id: "h1",
              title: "Power operator",
              content: "Use velocity_ms ** 2 (do not use ^).",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Computes energy for mass 1000kg at 20 m/s",
              assertionCode: `assert compute_kinetic_energy(1000, 20) == 200000.0`,
            },
            {
              id: "tc2",
              description: "Computes energy with fractional velocity (2500kg at 11.2 m/s)",
              assertionCode: `assert compute_kinetic_energy(2500, 11.2) == 156800.0`,
            },
          ],
        },
      ],
    },
    {
      id: "mod-2",
      title: "Module 2: Artemis String Processing & Telemetry Slicing",
      description: "String transformations, indexing, slicing, search validation, f-strings, and passcode security.",
      order: 2,
      lessons: [
        {
          id: "py-04-indexing-slicing",
          moduleId: "mod-2",
          order: 1,
          title: "2.1 Telemetry Packet Parsing: Indexing & Slicing",
          difficulty: "Beginner",
          estimatedMinutes: 12,
          xpReward: 90,
          tags: ["Strings", "Slicing", "Indexing"],
          concept: `### String Indexing and Slicing
In Python, strings are ordered zero-indexed sequences of characters.

\`\`\`python
code = "ARTEMIS-ORION"
print(code[0])     # 'A' (first character)
print(code[-1])    # 'N' (last character)
\`\`\`

#### Slicing Syntax: \`string[start:stop:step]\`
- \`code[0:7]\` extracts indices 0 up to 6: \`"ARTEMIS"\` (stop is exclusive).
- \`code[8:]\` extracts from index 8 to the end: \`"ORION"\`.
- \`code[::-1]\` reverses the entire string!`,
          story: `Deep space telemetry packets arrive as structured strings:
e.g. \`"HDR-ORION9-ALT450-VEL11000"\`
Write a function \`parse_telemetry_header(packet: str)\` that accepts a packet string and returns a tuple of 3 elements:
1. Spacecraft name (characters 4 through 10: e.g. \`"ORION9"\`)
2. Altitude code (characters 11 through 17: e.g. \`"ALT450-"\`)
3. Reversed packet checksum (the entire packet reversed)`,
          tasks: [
            { id: "t1", description: "Extract characters from index 4 up to 10 for spacecraft name" },
            { id: "t2", description: "Extract characters from index 11 up to 17 for altitude code" },
            { id: "t3", description: "Reverse the full packet using [::-1]" },
            { id: "t4", description: "Return tuple of (spacecraft, altitude, reversed_packet)" },
          ],
          starterCode: `def parse_telemetry_header(packet):
    # Slice packet and return (spacecraft, altitude, reversed_packet)
    pass
`,
          solutionCode: `def parse_telemetry_header(packet):
    spacecraft = packet[4:10]
    altitude = packet[11:18]
    reversed_packet = packet[::-1]
    return (spacecraft, altitude, reversed_packet)`,
          solutionExplanation:
            "Slicing [start:stop] slices up to stop-1. A negative step [::-1] walks through the string backwards.",
          hints: [
            {
              id: "h1",
              title: "Reverse slice",
              content: "To reverse any sequence in Python, use packet[::-1].",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Parses standard Artemis telemetry packet",
              assertionCode: `res = parse_telemetry_header("HDR-ORION9-ALT450-VEL11000")
assert res[0] == "ORION9"
assert res[1] == "ALT450-"
assert res[2].startswith("00011LEV")`,
            },
          ],
        },
        {
          id: "py-05-string-validation",
          moduleId: "mod-2",
          order: 2,
          title: "2.2 Passcode Security & String Methods",
          difficulty: "Beginner",
          estimatedMinutes: 14,
          xpReward: 95,
          tags: ["Strings", "Validation", "Security"],
          concept: `### Built-In String Methods
Python strings provide powerful built-in validation and transformation methods:

\`\`\`python
token = "  artemis-pass-9000  "
clean = token.strip()          # "artemis-pass-9000"
upper = clean.upper()          # "ARTEMIS-PASS-9000"
is_num = "420".isdigit()       # True
has_prefix = clean.startswith("artemis") # True
replaced = clean.replace("-", "_")       # "artemis_pass_9000"
\`\`\``,
          story: `In the Artemis Mission Control suite, operators must authenticate before issuing thrust commands.
Write a function \`validate_security_passcode(passcode: str) -> bool\`:
1. Clean leading and trailing whitespace using \`.strip()\`.
2. Return \`True\` if and only if all of the following are met:
   - The cleaned passcode starts with \`"MC-"\` (case-insensitive, e.g. \`"mc-"\` or \`"MC-"\`).
   - The length of the cleaned passcode is at least 8 characters.
   - The trailing suffix after \`"MC-"\` contains at least one numeric character (e.g. any digit \`0-9\`).
Otherwise return \`False\`.`,
          tasks: [
            { id: "t1", description: "Clean whitespace with .strip()" },
            { id: "t2", description: "Verify case-insensitive prefix 'MC-'" },
            { id: "t3", description: "Ensure cleaned length is >= 8" },
            { id: "t4", description: "Verify at least one digit is present in suffix" },
          ],
          starterCode: `def validate_security_passcode(passcode):
    # Validate operator passcode rules
    pass
`,
          solutionCode: `def validate_security_passcode(passcode):
    clean = passcode.strip()
    if len(clean) < 8:
        return False
    if not clean.upper().startswith("MC-"):
        return False
    suffix = clean[3:]
    has_digit = any(char.isdigit() for char in suffix)
    return has_digit`,
          solutionExplanation:
            "strip() sanitizes whitespace, startswith() verifies the required prefix, and any(char.isdigit()) tests for numeric security keys.",
          hints: [
            {
              id: "h1",
              title: "Checking for digits",
              content: "You can loop through char in clean[3:] and check if char.isdigit().",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Accepts valid passcode '  MC-ALPHA99  '",
              assertionCode: `assert validate_security_passcode("  MC-ALPHA99  ") is True`,
            },
            {
              id: "tc2",
              description: "Rejects passcode shorter than 8 chars 'MC-1'",
              assertionCode: `assert validate_security_passcode("MC-1") is False`,
            },
            {
              id: "tc3",
              description: "Rejects passcode without numeric key 'MC-ALPHA'",
              assertionCode: `assert validate_security_passcode("MC-ALPHA") is False`,
            },
          ],
        },
      ],
    },
    {
      id: "mod-3",
      title: "Module 3: Flight Computer Decision Systems",
      description: "Booleans, comparison operators, compound logic, if-elif-else branching, and flight mode control.",
      order: 3,
      lessons: [
        {
          id: "py-06-conditionals-abort",
          moduleId: "mod-3",
          order: 1,
          title: "3.1 Launch Clearance & Abort Decision Trees",
          difficulty: "Beginner",
          estimatedMinutes: 14,
          xpReward: 100,
          tags: ["Logic", "Conditionals", "Control Flow"],
          concept: `### Multi-Condition Branching in Flight Control
Flight computers make sequential priority-based decisions using \`if\`, \`elif\`, and \`else\`:

\`\`\`python
if cabin_pressure < 70.0:
    action = "EMERGENCY: OXYGEN DEPLOY"
elif cabin_temperature > 45.0:
    action = "WARNING: COOLANT CYCLE"
else:
    action = "ENVIRONMENT NOMINAL"
\`\`\`

#### Operator Precedence
Comparisons (\`<\`, \`>\`, \`==\`) are evaluated before logical operators (\`not\`, \`and\`, \`or\`).`,
          story: `You are programming the automated Launch Abort Decision Computer for the Artemis rocket.
Write a function \`evaluate_launch_clearance(wind_speed_mph, tank_pressure_psi, range_clear, comms_online)\`:
- If \`not comms_online\`, return \`"HOLD: Communication blackout"\`
- Else if \`not range_clear\`, return \`"HOLD: Range perimeter breached"\`
- Else if \`wind_speed_mph > 35.0\`, return \`"HOLD: High ground winds"\`
- Else if \`tank_pressure_psi < 2800\` or \`tank_pressure_psi > 3200\`, return \`"HOLD: Tank pressure out of spec"\`
- Otherwise, return \`"CLEAR FOR LAUNCH"\``,
          tasks: [
            { id: "t1", description: "Check comms_online first, returning 'HOLD: Communication blackout' if False" },
            { id: "t2", description: "Check range_clear second, returning 'HOLD: Range perimeter breached' if False" },
            { id: "t3", description: "Check wind_speed_mph > 35.0" },
            { id: "t4", description: "Check pressure bounds (2800 to 3200 psi inclusive)" },
            { id: "t5", description: "Return 'CLEAR FOR LAUNCH' when all clear" },
          ],
          starterCode: `def evaluate_launch_clearance(wind_speed_mph, tank_pressure_psi, range_clear, comms_online):
    # Check flight safety gates in order
    pass
`,
          solutionCode: `def evaluate_launch_clearance(wind_speed_mph, tank_pressure_psi, range_clear, comms_online):
    if not comms_online:
        return "HOLD: Communication blackout"
    elif not range_clear:
        return "HOLD: Range perimeter breached"
    elif wind_speed_mph > 35.0:
        return "HOLD: High ground winds"
    elif tank_pressure_psi < 2800 or tank_pressure_psi > 3200:
        return "HOLD: Tank pressure out of spec"
    else:
        return "CLEAR FOR LAUNCH"`,
          solutionExplanation:
            "Decision trees evaluate conditions sequentially. Placing critical safety checks at the top guarantees immediate hold triggers.",
          hints: [
            {
              id: "h1",
              title: "Checking Pressure",
              content: "Use: elif tank_pressure_psi < 2800 or tank_pressure_psi > 3200:",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Clears flight when all parameters nominal",
              assertionCode: `assert evaluate_launch_clearance(15.0, 3000, True, True) == "CLEAR FOR LAUNCH"`,
            },
            {
              id: "tc2",
              description: "Holds on excessive winds",
              assertionCode: `assert evaluate_launch_clearance(42.0, 3000, True, True) == "HOLD: High ground winds"`,
            },
            {
              id: "tc3",
              description: "Holds on comms blackout even if other parameters nominal",
              assertionCode: `assert evaluate_launch_clearance(10.0, 3000, True, False) == "HOLD: Communication blackout"`,
            },
          ],
        },
      ],
    },
    {
      id: "mod-4",
      title: "Module 4: Orbital Iteration & Diagnostic Loops",
      description: "While loops, for loops with range(), break, continue, pass, and loop-else anomaly detection.",
      order: 4,
      lessons: [
        {
          id: "py-07-countdown-while-loops",
          moduleId: "mod-4",
          order: 1,
          title: "4.1 T-Minus Countdown: While Loops & Sentinels",
          difficulty: "Beginner",
          estimatedMinutes: 12,
          xpReward: 100,
          tags: ["While", "Loops", "Simulation"],
          concept: `### While Loop Mechanics
A \`while\` loop runs continuously while a condition remains \`True\`:

\`\`\`python
t_minus = 10
while t_minus > 0:
    print(f"T-minus {t_minus}")
    t_minus -= 1
print("LIFTOFF!")
\`\`\`

#### Sentinel Control & Break
Use \`break\` to escape a loop prematurely if an abort sentinel is triggered.`,
          story: `Write the automated terminal countdown sequencer function \`run_countdown(start_seconds: int, abort_at: int = -1) -> list\`:
1. Initialize an empty list \`events = []\`.
2. Starting from \`current = start_seconds\`, count down while \`current > 0\`:
   - If \`current == abort_at\`, append \`f"ABORT AT T-{current}"\` and immediately \`break\` the countdown.
   - Otherwise, append \`f"T-{current}"\` and decrement \`current\` by 1.
3. If the loop completes all the way to 0 without aborting, append \`"IGNITION & LIFTOFF"\`.
4. Return the \`events\` list.`,
          tasks: [
            { id: "t1", description: "Count down from start_seconds to 1" },
            { id: "t2", description: "Append 'T-X' for each second" },
            { id: "t3", description: "Break and append 'ABORT AT T-X' if current == abort_at" },
            { id: "t4", description: "Append 'IGNITION & LIFTOFF' if countdown reaches 0 successfully" },
          ],
          starterCode: `def run_countdown(start_seconds, abort_at=-1):
    # Sequence countdown events and return list
    pass
`,
          solutionCode: `def run_countdown(start_seconds, abort_at=-1):
    events = []
    current = start_seconds
    aborted = False
    while current > 0:
        if current == abort_at:
            events.append(f"ABORT AT T-{current}")
            aborted = True
            break
        events.append(f"T-{current}")
        current -= 1
    if not aborted:
        events.append("IGNITION & LIFTOFF")
    return events`,
          solutionExplanation:
            "The while loop decrements current until 0. If abort_at matches current, break stops further iterations immediately.",
          hints: [
            {
              id: "h1",
              title: "Break condition",
              content: "Check if current == abort_at inside the loop before decrementing.",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Nominal 3 second countdown completes with liftoff",
              assertionCode: `res = run_countdown(3)
assert res == ["T-3", "T-2", "T-1", "IGNITION & LIFTOFF"]`,
            },
            {
              id: "tc2",
              description: "Aborts at T-2",
              assertionCode: `res = run_countdown(5, abort_at=2)
assert res == ["T-5", "T-4", "T-3", "ABORT AT T-2"]`,
            },
          ],
        },
        {
          id: "py-08-sensor-sweeps-for-loops",
          moduleId: "mod-4",
          order: 2,
          title: "4.2 Sensor Sweeps: For Loops & range()",
          difficulty: "Beginner",
          estimatedMinutes: 14,
          xpReward: 105,
          tags: ["For", "Range", "Telemetry"],
          concept: `### Iterating with \`for\` and \`range()\`
The \`for\` loop iterates across fixed collections or numerical progressions generated by \`range(start, stop, step)\`:

\`\`\`python
# Sweep sensor banks 1 through 5
for sensor_id in range(1, 6):
    print(f"Pinging Sensor #{sensor_id}")
\`\`\`

#### Filtering with \`continue\`
Skip noisy sensor readings without terminating the loop using \`continue\`:
\`\`\`python
for reading in sensor_readings:
    if reading is None:
        continue # skip invalid packet
    process(reading)
\`\`\``,
          story: `Telemetry monitors generate arrays of thruster temperature readings in degrees Celsius.
Write a function \`audit_thermal_sensors(readings: list, max_safe_temp: float = 850.0)\`:
Return a dictionary with:
- \`"total_readings"\`: length of readings
- \`"valid_readings_count"\`: count of readings that are numbers (not \`None\` and not negative)
- \`"overheating_sensors"\`: list of index positions (\`0, 1, ...\`) where \`reading > max_safe_temp\`
- \`"max_temp_recorded"\`: highest valid reading found (or \`0.0\` if no valid readings)`,
          tasks: [
            { id: "t1", description: "Iterate through readings using for index, temp in enumerate(readings)" },
            { id: "t2", description: "Skip None or negative readings using continue" },
            { id: "t3", description: "Track overheating sensor indices where temp > max_safe_temp" },
            { id: "t4", description: "Return dictionary with the 4 specified audit keys" },
          ],
          starterCode: `def audit_thermal_sensors(readings, max_safe_temp=850.0):
    # Audit temperature sensor array
    pass
`,
          solutionCode: `def audit_thermal_sensors(readings, max_safe_temp=850.0):
    valid_count = 0
    overheating = []
    max_temp = 0.0
    for idx, temp in enumerate(readings):
        if temp is None or temp < 0:
            continue
        valid_count += 1
        if temp > max_temp:
            max_temp = float(temp)
        if temp > max_safe_temp:
            overheating.append(idx)
    return {
        "total_readings": len(readings),
        "valid_readings_count": valid_count,
        "overheating_sensors": overheating,
        "max_temp_recorded": max_temp
    }`,
          solutionExplanation:
            "enumerate() yields (index, value). continue filters out invalid sensor records before evaluating thresholds.",
          hints: [
            {
              id: "h1",
              title: "Using enumerate",
              content: "for idx, temp in enumerate(readings): gives both index and value.",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Audits sensor array with anomalies and overheating",
              assertionCode: `readings = [820.0, None, 890.5, -10.0, 845.0, 912.0]
res = audit_thermal_sensors(readings, 850.0)
assert res["total_readings"] == 6
assert res["valid_readings_count"] == 4
assert res["overheating_sensors"] == [2, 5]
assert res["max_temp_recorded"] == 912.0`,
            },
          ],
        },
      ],
    },
    {
      id: "mod-5",
      title: "Module 5: Mission Telemetry Collections",
      description: "Lists, dynamic array mutations, list comprehensions, immutable tuples, and radio channel sets.",
      order: 5,
      lessons: [
        {
          id: "py-09-lists-and-comprehensions",
          moduleId: "mod-5",
          order: 1,
          title: "5.1 Flight Waypoints: Lists & Comprehensions",
          difficulty: "Intermediate",
          estimatedMinutes: 15,
          xpReward: 110,
          tags: ["Lists", "Comprehensions", "Transforms"],
          concept: `### Python Lists & Comprehensions
Lists are mutable, ordered collections of arbitrary elements:

\`\`\`python
waypoints = ["EARTH_ORBIT", "LUNAR_TRANSFER", "LUNAR_ORBIT"]
waypoints.append("LANDING_ZONE")
waypoints.pop(0)  # Removes first element
\`\`\`

#### List Comprehensions: The Pythonic Data Pipeline
Transform and filter collections in a single elegant statement:
\`\`\`python
# [expression for item in iterable if condition]
critical_altitudes = [alt for alt in altitudes if alt < 100]
\`\`\``,
          story: `You are optimizing the telemetry waypoint vector table for the lunar descent module.
Write a function \`filter_and_scale_waypoints(waypoints: list, min_fuel_pct: float, scale_factor: float)\`:
Each waypoint is a tuple: \`(name: str, fuel_pct: float, distance_km: float)\`.
Using a **list comprehension**:
1. Filter only waypoints where \`fuel_pct >= min_fuel_pct\`.
2. For each matching waypoint, return a new dictionary:
   \`{"name": name.upper(), "scaled_distance": round(distance_km * scale_factor, 1)}\`.
3. Return the resulting list of dictionaries.`,
          tasks: [
            { id: "t1", description: "Filter waypoints by fuel_pct >= min_fuel_pct" },
            { id: "t2", description: "Convert name to uppercase" },
            { id: "t3", description: "Multiply distance_km by scale_factor rounded to 1 decimal place" },
            { id: "t4", description: "Return list of formatted waypoint dictionaries" },
          ],
          starterCode: `def filter_and_scale_waypoints(waypoints, min_fuel_pct, scale_factor):
    # Transform waypoints using list comprehension
    pass
`,
          solutionCode: `def filter_and_scale_waypoints(waypoints, min_fuel_pct, scale_factor):
    return [
        {
            "name": wp[0].upper(),
            "scaled_distance": round(wp[2] * scale_factor, 1)
        }
        for wp in waypoints
        if wp[1] >= min_fuel_pct
    ]`,
          solutionExplanation:
            "List comprehensions combine transformation and filtering in O(N) runtime with minimal memory allocation overhead.",
          hints: [
            {
              id: "h1",
              title: "Comprehension pattern",
              content: "[{...} for wp in waypoints if wp[1] >= min_fuel_pct]",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Filters and scales waypoints meeting fuel requirements",
              assertionCode: `data = [
    ("earth_orbit", 95.0, 400.0),
    ("lagrange_pt", 12.0, 150000.0),
    ("lunar_orbit", 65.0, 384400.0),
]
res = filter_and_scale_waypoints(data, 50.0, 1.2)
assert len(res) == 2
assert res[0] == {"name": "EARTH_ORBIT", "scaled_distance": 480.0}
assert res[1] == {"name": "LUNAR_ORBIT", "scaled_distance": 461280.0}`,
            },
          ],
        },
        {
          id: "py-10-tuples-and-sets",
          moduleId: "mod-5",
          order: 2,
          title: "5.2 Navigation Coordinates & Frequencies: Tuples & Sets",
          difficulty: "Intermediate",
          estimatedMinutes: 14,
          xpReward: 115,
          tags: ["Tuples", "Sets", "Uniqueness"],
          concept: `### Tuples: Immutable Structures
Tuples are fixed, read-only sequences defined with parentheses \`()\`:
\`\`\`python
landing_site = (26.13, -3.63, 1740.0)  # (lat, lon, elevation)
# landing_site[0] = 30.0  # Raises TypeError (Immutable!)
\`\`\`

### Sets: Unordered Unique Collections
Sets enforce mathematical uniqueness and provide fast membership testing:
\`\`\`python
frequencies_a = {"2200MHz", "8400MHz", "32GHz"}
frequencies_b = {"8400MHz", "14GHz"}

common = frequencies_a.intersection(frequencies_b)  # {"8400MHz"}
all_freqs = frequencies_a.union(frequencies_b)
\`\`\``,
          story: `The Artemis Deep Space Network synchronizes radio channels between ground dishes and orbital relays.
Write a function \`reconcile_communication_matrix(primary_channels: list, backup_channels: list, blocked_channels: list)\`:
Return a dictionary:
- \`"common_channels"\`: sorted list of channels present in **both** primary and backup
- \`"available_channels"\`: sorted list of all unique channels (primary union backup) with blocked channels removed
- \`"total_coverage"\`: integer count of available channels`,
          tasks: [
            { id: "t1", description: "Convert primary and backup channels into sets" },
            { id: "t2", description: "Find intersection between primary and backup" },
            { id: "t3", description: "Compute union minus blocked channels" },
            { id: "t4", description: "Return sorted lists and coverage count in dictionary" },
          ],
          starterCode: `def reconcile_communication_matrix(primary_channels, backup_channels, blocked_channels):
    # Reconcile radio frequency sets
    pass
`,
          solutionCode: `def reconcile_communication_matrix(primary_channels, backup_channels, blocked_channels):
    p_set = set(primary_channels)
    b_set = set(backup_channels)
    blk_set = set(blocked_channels)

    common = p_set.intersection(b_set)
    available = (p_set.union(b_set)).difference(blk_set)

    return {
        "common_channels": sorted(list(common)),
        "available_channels": sorted(list(available)),
        "total_coverage": len(available)
    }`,
          solutionExplanation:
            "Set operations (.intersection, .union, .difference) perform set theory operations in O(1) average lookup time.",
          hints: [
            {
              id: "h1",
              title: "Set difference",
              content: "Use available = (p_set.union(b_set)) - blk_set or .difference(blk_set).",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Reconciles channels and filters blocked channels",
              assertionCode: `primary = ["S-Band", "X-Band", "Ka-Band"]
backup = ["X-Band", "UHF", "VHF"]
blocked = ["UHF"]
res = reconcile_communication_matrix(primary, backup, blocked)
assert res["common_channels"] == ["X-Band"]
assert res["available_channels"] == ["Ka-Band", "S-Band", "VHF", "X-Band"]
assert res["total_coverage"] == 4`,
            },
          ],
        },
      ],
    },
    {
      id: "mod-6",
      title: "Module 6: Flight Subsystem Dictionaries",
      description: "Hash maps, key-value lookup performance, nested dictionary structures, and dictionary comprehensions.",
      order: 6,
      lessons: [
        {
          id: "py-11-dictionaries-telemetry",
          moduleId: "mod-6",
          order: 1,
          title: "6.1 Subsystem Registry: Dictionaries & State Monitoring",
          difficulty: "Intermediate",
          estimatedMinutes: 15,
          xpReward: 120,
          tags: ["Dictionaries", "HashMaps", "Telemetry"],
          concept: `### Dictionaries in Systems Engineering
Dictionaries map unique keys to values with O(1) hash table efficiency:

\`\`\`python
subsystem = {
    "name": "PROPULSION",
    "status": "ONLINE",
    "fuel_kg": 4200.5,
    "redundant": True
}

# Safe lookup with fallback default
val = subsystem.get("aux_power", "NOT_EQUIPPED")
\`\`\`

#### Iterating Over Key-Value Pairs
\`\`\`python
for key, value in subsystem.items():
    print(f"{key}: {value}")
\`\`\``,
          story: `You are constructing the Subsystem Health Monitor for Mission Control.
Write a function \`analyze_subsystem_fleet(fleet_data: dict)\`:
\`fleet_data\` is a dictionary mapping subsystem name to its status dictionary, for example:
\`\`\`python
{
    "avionics": {"status": "NOMINAL", "power_draw_w": 450},
    "life_support": {"status": "CRITICAL", "power_draw_w": 1200},
    "rcs_thrusters": {"status": "NOMINAL", "power_draw_w": 800}
}
\`\`\`
Return a dictionary:
- \`"total_power_w"\`: sum of all \`power_draw_w\` values
- \`"critical_subsystems"\`: sorted list of subsystem names where \`status == "CRITICAL"\`
- \`"nominal_count"\`: integer count of subsystems with \`status == "NOMINAL"\``,
          tasks: [
            { id: "t1", description: "Iterate through fleet_data using .items()" },
            { id: "t2", description: "Sum power_draw_w across all subsystems" },
            { id: "t3", description: "Collect names of CRITICAL subsystems into a sorted list" },
            { id: "t4", description: "Tally nominal subsystems count" },
          ],
          starterCode: `def analyze_subsystem_fleet(fleet_data):
    # Analyze subsystem dictionary and return metrics
    pass
`,
          solutionCode: `def analyze_subsystem_fleet(fleet_data):
    total_power = 0
    critical_subsystems = []
    nominal_count = 0

    for name, info in fleet_data.items():
        total_power += info.get("power_draw_w", 0)
        status = info.get("status", "").upper()
        if status == "CRITICAL":
            critical_subsystems.append(name)
        elif status == "NOMINAL":
            nominal_count += 1

    return {
        "total_power_w": total_power,
        "critical_subsystems": sorted(critical_subsystems),
        "nominal_count": nominal_count
    }`,
          solutionExplanation:
            "items() unpacks key and value dict objects. Using .get() guarantees safety if keys are missing.",
          hints: [
            {
              id: "h1",
              title: "Safe access",
              content: "Use info.get('power_draw_w', 0) to avoid KeyError.",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Analyzes telemetry power and status counts",
              assertionCode: `fleet = {
    "nav": {"status": "NOMINAL", "power_draw_w": 300},
    "prop": {"status": "CRITICAL", "power_draw_w": 1500},
    "comms": {"status": "NOMINAL", "power_draw_w": 250},
    "aux": {"status": "OFFLINE", "power_draw_w": 0}
}
res = analyze_subsystem_fleet(fleet)
assert res["total_power_w"] == 2050
assert res["critical_subsystems"] == ["prop"]
assert res["nominal_count"] == 2`,
            },
          ],
        },
      ],
    },
    {
      id: "mod-7",
      title: "Module 7: Mission Functions & Modularization",
      description: "Function definitions, parameters, return values, default arguments, *args, **kwargs, and variable scope.",
      order: 7,
      lessons: [
        {
          id: "py-12-functions-signatures",
          moduleId: "mod-7",
          order: 1,
          title: "7.1 Flight Procedures: Parameters, *args & **kwargs",
          difficulty: "Intermediate",
          estimatedMinutes: 16,
          xpReward: 130,
          tags: ["Functions", "Args", "Kwargs", "Scope"],
          concept: `### Modular Flight Procedures: Functions
Functions package logic into reusable, testable units:

\`\`\`python
def calculate_delta_v(exhaust_velocity, initial_mass, final_mass):
    import math
    return exhaust_velocity * math.log(initial_mass / final_mass)
\`\`\`

#### Dynamic Arguments: \`*args\` and \`**kwargs\`
- \`*args\` collects extra positional parameters into a tuple.
- \`**kwargs\` collects extra keyword flags into a dictionary.

\`\`\`python
def log_mission_event(event_type, *tags, **diagnostics):
    print(f"[{event_type}] Tags: {tags}, Diagnostics: {diagnostics}")
\`\`\``,
          story: `Create the Mission Control Log Event Dispatcher.
Write a function \`dispatch_mission_log(event_code: str, *tags, priority: str = "NORMAL", **metadata)\`:
Return a formatted dictionary with:
- \`"event_code"\`: \`event_code.upper()\`
- \`"priority"\`: \`priority.upper()\`
- \`"tags"\`: sorted list of lowercase strings from \`*tags\`
- \`"metadata_count"\`: number of keys passed in \`**metadata\`
- \`"metadata"\`: the \`metadata\` dictionary itself`,
          tasks: [
            { id: "t1", description: "Define function signature with event_code, *tags, priority='NORMAL', **metadata" },
            { id: "t2", description: "Format event_code and priority to uppercase" },
            { id: "t3", description: "Convert *tags into sorted list of lowercase strings" },
            { id: "t4", description: "Return structured dictionary with metadata count" },
          ],
          starterCode: `def dispatch_mission_log(event_code, *tags, priority="NORMAL", **metadata):
    # Format and dispatch mission log packet
    pass
`,
          solutionCode: `def dispatch_mission_log(event_code, *tags, priority="NORMAL", **metadata):
    clean_tags = sorted([str(t).lower() for t in tags])
    return {
        "event_code": event_code.upper(),
        "priority": priority.upper(),
        "tags": clean_tags,
        "metadata_count": len(metadata),
        "metadata": metadata
    }`,
          solutionExplanation:
            "Combining positional args, variable *tags, default keyword priority, and **metadata provides the ultimate flexible API contract.",
          hints: [
            {
              id: "h1",
              title: "Cleaning tags",
              content: "Use sorted([str(t).lower() for t in tags]).",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Dispatches log with variable tags and metadata",
              assertionCode: `log = dispatch_mission_log("stage_separation", "PROPULSION", "telemetry", priority="high", altitude_km=68.4, velocity_ms=2800)
assert log["event_code"] == "STAGE_SEPARATION"
assert log["priority"] == "HIGH"
assert log["tags"] == ["propulsion", "telemetry"]
assert log["metadata_count"] == 2
assert log["metadata"]["altitude_km"] == 68.4`,
            },
          ],
        },
      ],
    },
    {
      id: "mod-8",
      title: "Module 8: Crash-Proof Telemetry & Error Handling",
      description: "Defensive programming, try/except/else/finally, catching ValueErrors, and raising domain-specific exceptions.",
      order: 8,
      lessons: [
        {
          id: "py-13-crash-proof-try-except",
          moduleId: "mod-8",
          order: 1,
          title: "8.1 Resilient Telemetry: Try, Except & Custom Exceptions",
          difficulty: "Intermediate",
          estimatedMinutes: 16,
          xpReward: 140,
          tags: ["Exceptions", "ErrorHandling", "Robustness"],
          concept: `### Graceful Exception Handling in Flight Systems
Errors must never crash the flight computer. Wrap risky conversions in \`try / except\`:

\`\`\`python
try:
    sensor_val = float(raw_input_string)
    result = 1000.0 / sensor_val
except ValueError:
    print("ERR: Corrupted sensor string")
except ZeroDivisionError:
    print("ERR: Sensor zero divider")
else:
    print("Computation succeeded!")
finally:
    print("Audit cycle closed.")
\`\`\``,
          story: `You are engineering the telemetry parser for analog sensor voltages.
1. Define a custom exception: \`TelemetryPacketCorruptError(Exception)\`.
2. Write a function \`parse_sensor_reading(raw_input)\`:
   - If \`raw_input\` is \`None\`, raise \`TelemetryPacketCorruptError("Null telemetry received")\`.
   - Attempt to convert \`raw_input\` to a float using \`float(raw_input)\`.
   - If conversion raises \`ValueError\`, catch it and raise \`TelemetryPacketCorruptError("Non-numeric sensor reading")\`.
   - If the converted value is \`< 0.0\` or \`> 5000.0\`, raise \`TelemetryPacketCorruptError("Voltage reading out of sensor bounds")\`.
   - Otherwise, return the float value rounded to 2 decimal places.`,
          tasks: [
            { id: "t1", description: "Define TelemetryPacketCorruptError inheriting from Exception" },
            { id: "t2", description: "Check raw_input for None" },
            { id: "t3", description: "Handle ValueError and re-raise TelemetryPacketCorruptError" },
            { id: "t4", description: "Validate bounds 0.0 to 5000.0, returning rounded float on success" },
          ],
          starterCode: `class TelemetryPacketCorruptError(Exception):
    pass

def parse_sensor_reading(raw_input):
    # Parse and validate voltage or raise TelemetryPacketCorruptError
    pass
`,
          solutionCode: `class TelemetryPacketCorruptError(Exception):
    pass

def parse_sensor_reading(raw_input):
    if raw_input is None:
        raise TelemetryPacketCorruptError("Null telemetry received")
    try:
        val = float(raw_input)
    except (ValueError, TypeError):
        raise TelemetryPacketCorruptError("Non-numeric sensor reading")
    
    if val < 0.0 or val > 5000.0:
        raise TelemetryPacketCorruptError("Voltage reading out of sensor bounds")
    
    return round(val, 2)`,
          solutionExplanation:
            "Domain-specific custom exceptions allow upper layers of Mission Control to handle sensor noise cleanly without unexpected crashes.",
          hints: [
            {
              id: "h1",
              title: "Raising Custom Exceptions",
              content: "Use raise TelemetryPacketCorruptError('your message').",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Parses valid string float '124.567' to 124.57",
              assertionCode: `assert parse_sensor_reading("124.567") == 124.57`,
            },
            {
              id: "tc2",
              description: "Raises TelemetryPacketCorruptError on corrupted text 'INVALID'",
              assertionCode: `try:
    parse_sensor_reading("INVALID")
    assert False, "Should have raised exception"
except TelemetryPacketCorruptError as e:
    assert "Non-numeric" in str(e)`,
            },
            {
              id: "tc3",
              description: "Raises TelemetryPacketCorruptError on out of bounds value 9999",
              assertionCode: `try:
    parse_sensor_reading(9999)
    assert False, "Should have raised exception"
except TelemetryPacketCorruptError as e:
    assert "bounds" in str(e)`,
            },
          ],
        },
      ],
    },
    {
      id: "mod-9",
      title: "Module 9: Artemis Mission Control Suite",
      description: "The complete capstone grounding project: mission_control.py integrating authentication, diagnostic quiz, and flight log generator.",
      order: 9,
      lessons: [
        {
          id: "py-14-mission-control-suite",
          moduleId: "mod-9",
          order: 1,
          title: "9.1 Capstone Project: mission_control.py Suite",
          difficulty: "Advanced",
          estimatedMinutes: 25,
          xpReward: 250,
          tags: ["Capstone", "Architecture", "Project"],
          concept: `### The Artemis Mission Control Capstone Project
In the grand capstone of the 13-Hour Python Masterclass, all concepts converge into a production-style terminal application:
- **Authentication Gateway**: Passcode verification using string methods and sanitization.
- **Flight Log Generator**: Dynamic formatting using f-strings and multiline layouts.
- **Telemetry Diagnostic System**: Calculating subsystem averages, anomalies, and safety thresholds.
- **Interactive Command Dispatcher**: Menu loop controlling commands and system diagnostics.

\`\`\`python
# Architecture Blueprint for mission_control.py
class MissionControl:
    def __init__(self, mission_name, flight_director):
        self.mission_name = mission_name
        self.flight_director = flight_director
        self.is_authenticated = False
        self.subsystems = {}
\`\`\``,
          story: `You have reached the ultimate destination! Bring together everything learned from Data with Baraa's Python Masterclass to construct the core \`MissionControlSuite\` engine:

Implement the class \`MissionControlSuite\`:
1. \`__init__(self, mission_name: str, flight_director: str)\`:
   - Stores \`mission_name\` (uppercase) and \`flight_director\`.
   - Initializes \`is_locked = True\`.
   - Initializes an empty telemetry dictionary \`telemetry = {}\`.
   - Initializes an empty list of mission logs \`logs = []\`.
2. \`authenticate(self, passcode: str) -> bool\`:
   - Uses passcode validation: strips whitespace, checks if starts with \`"MC-"\` (case-insensitive), length \`>= 8\`, and has at least one digit.
   - If valid, sets \`self.is_locked = False\` and appends \`f"AUTH SUCCESS: {self.flight_director}"\` to \`self.logs\`, returning \`True\`.
   - If invalid, returns \`False\`.
3. \`record_telemetry(self, subsystem: str, reading: float) -> bool\`:
   - If \`self.is_locked\`, return \`False\`.
   - Stores \`self.telemetry[subsystem.upper()] = round(reading, 2)\`.
   - Appends \`f"TELEM UPDATE: {subsystem.upper()}={round(reading, 2)}"\` to \`self.logs\`.
   - Returns \`True\`.
4. \`generate_status_report(self) -> str\`:
   - If \`self.is_locked\`, return \`"ACCESS DENIED: CONSOLE LOCKED"\`.
   - Returns a formatted multiline report string:
     \`f"MISSION: {self.mission_name} | DIRECTOR: {self.flight_director} | SUBSYSTEMS: {len(self.telemetry)}"\`.`,
          tasks: [
            { id: "t1", description: "Implement MissionControlSuite.__init__ with state variables" },
            { id: "t2", description: "Implement authenticate(passcode) unlocking console on valid key" },
            { id: "t3", description: "Implement record_telemetry(subsystem, reading) requiring authentication" },
            { id: "t4", description: "Implement generate_status_report() generating mission summary" },
          ],
          starterCode: `class MissionControlSuite:
    def __init__(self, mission_name, flight_director):
        # Initialize mission control engine
        pass

    def authenticate(self, passcode):
        # Authenticate operator and unlock console
        pass

    def record_telemetry(self, subsystem, reading):
        # Record subsystem telemetry
        pass

    def generate_status_report(self):
        # Generate mission status report
        pass
`,
          solutionCode: `class MissionControlSuite:
    def __init__(self, mission_name, flight_director):
        self.mission_name = mission_name.upper()
        self.flight_director = flight_director
        self.is_locked = True
        self.telemetry = {}
        self.logs = []

    def authenticate(self, passcode):
        clean = passcode.strip()
        if len(clean) >= 8 and clean.upper().startswith("MC-"):
            if any(c.isdigit() for c in clean[3:]):
                self.is_locked = False
                self.logs.append(f"AUTH SUCCESS: {self.flight_director}")
                return True
        return False

    def record_telemetry(self, subsystem, reading):
        if self.is_locked:
            return False
        key = subsystem.upper()
        val = round(float(reading), 2)
        self.telemetry[key] = val
        self.logs.append(f"TELEM UPDATE: {key}={val}")
        return True

    def generate_status_report(self):
        if self.is_locked:
            return "ACCESS DENIED: CONSOLE LOCKED"
        return f"MISSION: {self.mission_name} | DIRECTOR: {self.flight_director} | SUBSYSTEMS: {len(self.telemetry)}"`,
          solutionExplanation:
            "This capstone integrates Object-Oriented design, string sanitization, collection tracking, validation gates, and dynamic reporting into a production terminal suite.",
          hints: [
            {
              id: "h1",
              title: "Console Lock Gate",
              content: "Always check if self.is_locked in record_telemetry and generate_status_report.",
            },
          ],
          testCases: [
            {
              id: "tc1",
              description: "Blocks operations until authenticated with valid passcode",
              assertionCode: `mc = MissionControlSuite("Artemis-2", "Baraa")
assert mc.is_locked is True
assert mc.record_telemetry("propulsion", 98.4) is False
assert mc.generate_status_report() == "ACCESS DENIED: CONSOLE LOCKED"`,
            },
            {
              id: "tc2",
              description: "Authenticates with valid passcode 'MC-FLIGHT42' and unlocks console",
              assertionCode: `mc = MissionControlSuite("Artemis-2", "Baraa")
assert mc.authenticate("invalid") is False
assert mc.authenticate("  MC-FLIGHT42  ") is True
assert mc.is_locked is False
assert mc.record_telemetry("propulsion", 98.4) is True
assert mc.telemetry["PROPULSION"] == 98.4
assert "MISSION: ARTEMIS-2 | DIRECTOR: Baraa | SUBSYSTEMS: 1" in mc.generate_status_report()`,
            },
            {
              id: "tc3",
              description: "Logs audit events in chronological order",
              assertionCode: `mc = MissionControlSuite("Artemis-2", "Baraa")
mc.authenticate("MC-FLIGHT42")
mc.record_telemetry("comms", 100)
assert len(mc.logs) == 2
assert "AUTH SUCCESS: Baraa" == mc.logs[0]
assert "TELEM UPDATE: COMMS=100.0" == mc.logs[1]`,
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
