import type { Project } from "@/engine/types";

/**
 * Beat Lab: program a drum machine in Python and hear your code groove.
 *
 * Authoring notes: see garage.ts (Python in String.raw, prose in normal templates with \` escaped, ~~~python fences).
 *
 * The scene (src/scenes/beatlab) reads these names from the learner's program. Everything is optional,
 * tolerant of wrong types / lengths, and only used once the matching feature is unlocked:
 *   power    print() output  -> shown on the display (program.stdout)
 *   tempo    title (str), bpm (int, 40-240), swing (float 0-0.6), master_volume (float 0-1)
 *   kick     kick_pattern    16 steps: string ("x" hit, "X" accent, "." rest) or a list of levels
 *   snare    snare_pattern, clap_pattern   16-step lists (0 rest, 1 hit, 2 accent, 0-1 = quiet ghost notes)
 *   hats     hats_pattern    same shape
 *   bass     bass_notes      16 MIDI note numbers, 0 = rest
 *            hook midi_to_hz(note) -> Hz, asked once per distinct note per run (pure function)
 *   mixer    tracks = {"kick": {"volume": 0-1, "pan": -1..1, "mute": bool}, ... "snare" "clap" "hats" "bass"}
 *   arranger hook arranger.section(bar) -> "groove" | "fill" | "drop" | "break", asked once per bar (bar counts from 0)
 */
const py = String.raw;

export const beatlab: Project = {
  slug: "beatlab",
  title: "Beat Lab",
  tagline: "Program a drum machine and make it bang.",
  pitch:
    "Start with a dark blueprint of a drum machine. Every Python idea you learn wires in a new piece: the power and tempo, then kick, snare, hats and bass, a mixer, and finally an arranger class that throws fills and drops. Your code is the sheet music, and it plays out loud.",
  emoji: "🥁",
  difficulty: "Beginner",
  hours: 3,
  sceneId: "beatlab",
  accent: { from: "#3dffd0", to: "#c6ff3d" },
  controls: ["Space play / stop", "Click a row to hear it"],
  skills: ["print & strings", "variables & types", "string methods", "lists", "loops & if / else", "functions & math", "dictionaries", "classes"],
  features: [
    { id: "power", title: "Power", blurb: "The machine boots, your print() lines hit the display and a metronome ticks.", emoji: "🔌" },
    { id: "tempo", title: "Tempo", blurb: "Your title, BPM and swing drive the whole machine.", emoji: "⏱️" },
    { id: "kick", title: "Kick drum", blurb: "A string of x's becomes a thumping kick.", emoji: "🥁" },
    { id: "snare", title: "Snare & clap", blurb: "Your lists place the backbeat.", emoji: "💥" },
    { id: "hats", title: "Hi-hats", blurb: "A loop writes the hi-hat pattern for you.", emoji: "✨" },
    { id: "bass", title: "Bass synth", blurb: "Your midi_to_hz() maths decides the pitch of every bass note.", emoji: "🎸" },
    { id: "mixer", title: "Mixer", blurb: "A dictionary sets volume, pan and mute for every track.", emoji: "🎚️" },
    { id: "arranger", title: "Arranger", blurb: "Your Arranger class throws fills and drops as the bars go by.", emoji: "🎛️" },
  ],
  chapters: [
    {
      id: "boot",
      title: "Power up",
      blurb: "Switch the machine on and set the tempo.",
      lessons: [
        {
          id: "beatlab-1-power",
          title: "Power on",
          minutes: 6,
          xp: 50,
          concepts: ["print()", "strings", "comments"],
          learn: `### Talking to the display

\`print()\` sends text to the screen. Text inside quotes is called a **string**.

~~~python
print("Hello, drum machine!")
~~~

Each \`print()\` makes a new line. A line that starts with \`#\` is a **comment**: a note for humans that Python skips.

~~~python
# this line is ignored
print("This one runs")
~~~

Use double quotes \`"like this"\` or single quotes \`'like this'\`. Just close the quote you opened.`,
          mission: `Beat Lab starts as a dark blueprint: no power, no sound, nothing.

Boot it by printing three startup lines. The moment they run, the display lights up, shows your lines, and a metronome starts ticking out the beat.

Browsers keep sound off until you click something. Press **Run**, then the **Play** button on the stage (or the spacebar) if you can't hear the click. Keep your volume low to start.`,
          tasks: [
            "Print BEAT LAB ONLINE",
            "Print KICK. SNARE. HATS.",
            "Print DROP THE BEAT",
            "Press Run and watch the machine power up",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 1: boot the drum machine.
# Use print() to send these 3 lines to the display:
#   BEAT LAB ONLINE
#   KICK. SNARE. HATS.
#   DROP THE BEAT
`,
          solutionAdd: py`print("BEAT LAB ONLINE")
print("KICK. SNARE. HATS.")
print("DROP THE BEAT")`,
          explanation:
            "Each print() call writes one line, and the display shows exactly what you printed, capital letters and punctuation included. Until you add a kick drum, the machine only has its metronome: one click per beat, with a higher click on the first beat of each bar.",
          hints: [
            { id: "h1", title: "Syntax", content: 'A print call looks like this: print("some text")' },
            { id: "h2", title: "First line", content: 'print("BEAT LAB ONLINE")' },
            { id: "h3", title: "All three", content: "Write one print() per line, each with its own text in quotes. Copy the text exactly." },
          ],
          tests: [
            { id: "t1", description: "Prints BEAT LAB ONLINE", assertionCode: `assert "BEAT LAB ONLINE" in __stdout__, "Print the exact text BEAT LAB ONLINE"` },
            { id: "t2", description: "Prints KICK. SNARE. HATS.", assertionCode: `assert "KICK. SNARE. HATS." in __stdout__, "Print the exact text KICK. SNARE. HATS. (with the full stops)"` },
            { id: "t3", description: "Prints DROP THE BEAT", assertionCode: `assert "DROP THE BEAT" in __stdout__, "Print the exact text DROP THE BEAT"` },
            { id: "t4", description: "Uses three separate lines", assertionCode: `assert len(__stdout__.strip().splitlines()) >= 3, "Use one print() per line (three lines total)"` },
          ],
          unlocks: ["power"],
        },
        {
          id: "beatlab-2-tempo",
          title: "Set the tempo",
          minutes: 10,
          xp: 60,
          concepts: ["variables", "str / int / float", "naming"],
          learn: `### Variables are labelled boxes

A **variable** gives a name to a value so you can use it later.

~~~python
artist = "Ada"       # str   (text)
beats = 4            # int   (whole number)
gain = 0.8           # float (decimal number)
~~~

Use \`=\` to store a value. Names are lowercase with underscores, like \`master_volume\`.

You can ask Python for the type with \`type(beats)\`. It works it out from the value: quotes make a string, digits make an int, a decimal point makes a float.

### Two music words

- **BPM** (beats per minute): how fast the track plays. House music is around 120.
- **Swing**: pushes every second 16th note a little late, so the beat lilts instead of marching. \`0.0\` is straight, \`0.2\` is a gentle shuffle.`,
          mission: `Right now the machine ticks at a default speed with no name. Give it an identity.

The scene reads these exact variable names, so spelling matters. Hit Run and the display shows your title, the metronome changes speed, and the master volume changes how loud everything is.`,
          tasks: [
            'title: a string, at least 2 letters (e.g. "Midnight Pocket")',
            "bpm: an int between 70 and 180",
            "swing: a float from 0.0 to 0.6 (try 0.15)",
            "master_volume: a float from 0.3 to 1.0",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 2: give the machine an identity.
title = ...            # a string: name your track
bpm = ...              # an int: beats per minute, between 70 and 180
swing = ...            # a float from 0.0 to 0.6 (how late the off-beats are)
master_volume = ...    # a float from 0.3 to 1.0
`,
          solutionAdd: py`title = "Midnight Pocket"
bpm = 112
swing = 0.18
master_volume = 0.85`,
          explanation:
            "Python picks the type from the value. 112 is an int, 0.18 is a float, and anything in quotes is a string. The scene looks variables up by name, so these four names are how you configure the machine. Try bpm = 90 for a lazy hip-hop feel or 128 for house.",
          hints: [
            { id: "h1", title: "Replace the dots", content: "Each line has ... as a placeholder. Replace it with a real value." },
            { id: "h2", title: "Strings need quotes", content: 'title = "Midnight Pocket" needs quotes. bpm = 112 does not.' },
            { id: "h3", title: "Decimals", content: "swing = 0.18 and master_volume = 0.85 are floats because they have a decimal point." },
          ],
          tests: [
            { id: "t1", description: "title is a string of 2+ characters", assertionCode: `assert isinstance(title, str) and len(title.strip()) >= 2, "title must be text in quotes, at least 2 letters"` },
            { id: "t2", description: "bpm is a whole number from 70 to 180", assertionCode: `assert type(bpm) is int, "bpm must be a whole number (no quotes, no decimal point)"
assert 70 <= bpm <= 180, "bpm should be between 70 and 180"` },
            { id: "t3", description: "swing is a float from 0.0 to 0.6", assertionCode: `assert type(swing) is float, "swing must be a decimal number like 0.15"
assert 0.0 <= swing <= 0.6, "swing should be between 0.0 and 0.6"` },
            { id: "t4", description: "master_volume is a float from 0.3 to 1.0", assertionCode: `assert type(master_volume) is float, "master_volume must be a decimal number like 0.85"
assert 0.3 <= master_volume <= 1.0, "master_volume should be between 0.3 and 1.0"` },
          ],
          unlocks: ["tempo"],
        },
      ],
    },
    {
      id: "rhythm",
      title: "Build the groove",
      blurb: "Kick, snare and hats, written as strings, lists and loops.",
      lessons: [
        {
          id: "beatlab-3-kick",
          title: "Kick drum",
          minutes: 12,
          xp: 80,
          concepts: ["string indexing", "len()", "* and +", ".upper() / .count()"],
          learn: `### A pattern is a string

One bar is **16 steps**. A string can write them down, one character per step:

~~~python
pattern = "x...x...x...x..."
~~~

\`x\` is a hit and \`.\` is a rest. A capital \`X\` is an **accent**: a louder hit.

### What you can do with a string

~~~python
beat = "x..."
beat[0]            # "x"   (index 0 is the first character)
len(beat)          # 4     (how many characters)
beat * 4           # "x...x...x...x..."   (repeat)
"X" + "..."        # "X..."               (join with +)
beat.upper()       # "X..."               (all capitals)
"x.x.x".count("x") # 3                    (how many times it appears)
~~~

Methods like \`.upper()\` and \`.count()\` are attached to the string with a dot. Strings can't be edited in place, so build a new one with \`+\` and \`*\`.`,
          mission: `Time for the heartbeat of the track: the kick drum.

One beat is 4 steps, written \`"x..."\`. Build a four-on-the-floor bar: an accented first beat, then the plain beat three more times. When you Run, the KICK row lights up and it thumps in time.`,
          tasks: [
            "accent = the beat in capitals (use .upper())",
            "kick_pattern = accent + beat * 3  (16 steps)",
            'kick_hits = how many hits, counting accents (hint: .upper().count("X"))',
            "steps = len(kick_pattern)",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 3: build the kick drum pattern.
beat = "x..."          # one beat = 4 steps: a hit, then three rests
accent = ...           # the same beat in CAPITALS (an accent is a louder hit)
kick_pattern = ...     # the accent first, then the plain beat three more times
kick_hits = ...        # how many hits? (hint: .upper().count("X"))
steps = ...            # how many steps long is kick_pattern?

# optional: print("kick:", kick_pattern) to see it on the display
`,
          solutionAdd: py`beat = "x..."
accent = beat.upper()
kick_pattern = accent + beat * 3
kick_hits = kick_pattern.upper().count("X")
steps = len(kick_pattern)

print("kick:", kick_pattern)`,
          explanation:
            'accent is "X...", and "X..." + "x..." * 3 joins it to three plain beats, giving 16 steps. Counting only "x" would miss the capital X, which is why the count first turns everything to capitals. Change the pattern to try other rhythms, for example "x..x..x.x..x..x." for a broken beat.',
          hints: [
            { id: "h1", title: "Capitals", content: 'accent = beat.upper() gives "X..."' },
            { id: "h2", title: "Join and repeat", content: "kick_pattern = accent + beat * 3. The * happens before the +." },
            { id: "h3", title: "Counting", content: 'kick_hits = kick_pattern.upper().count("X") and steps = len(kick_pattern)' },
          ],
          tests: [
            { id: "t1", description: "kick_pattern is a 16-character string", assertionCode: `assert isinstance(kick_pattern, str), "kick_pattern must be a string"
assert len(kick_pattern) == 16, f"kick_pattern needs 16 steps but has {len(kick_pattern)}"` },
            { id: "t2", description: "Only uses x, X and .", assertionCode: `assert set(kick_pattern) <= set("xX."), 'Use only "x" (hit), "X" (accent) and "." (rest)'` },
            { id: "t3", description: "Starts with an accented hit", assertionCode: `assert kick_pattern[0] == "X", "The first step should be an accent: a capital X"` },
            { id: "t4", description: "Hits on every beat", assertionCode: `assert all(kick_pattern[i].upper() == "X" for i in (0, 4, 8, 12)), "Put a hit on steps 0, 4, 8 and 12"` },
            { id: "t5", description: "kick_hits and steps are counted", assertionCode: `assert kick_hits == kick_pattern.upper().count("X"), 'kick_hits should be kick_pattern.upper().count("X")'
assert steps == len(kick_pattern), "steps should be len(kick_pattern)"` },
          ],
          unlocks: ["kick"],
        },
        {
          id: "beatlab-4-snare",
          title: "Snare & clap",
          minutes: 15,
          xp: 90,
          concepts: ["lists", "indexing & assignment", "slicing", "list * and +"],
          learn: `### Lists hold many values in order

~~~python
fruits = ["apple", "pear", "fig"]
fruits[0]            # "apple"
fruits[1] = "plum"   # change one item
len(fruits)          # 3
fruits.append("kiwi")  # add to the end
~~~

Lists work like strings in many ways:

~~~python
[0] * 4              # [0, 0, 0, 0]   (repeat)
[1, 2] + [3]         # [1, 2, 3]      (join)
nums = [10, 20, 30, 40, 50]
nums[1:3]            # [20, 30]       (a slice: from index 1 up to, not including, 3)
nums[3:]             # [40, 50]       (from index 3 to the end)
[0, 0, 1, 0].count(0)  # 3
~~~

Indexes start at **0**, so a bar of 16 steps is index 0 to 15.

### Snare levels

In a list, each step is a number: \`0\` is a rest, \`1\` a normal hit, \`2\` an accent, and anything between 0 and 1 is a quiet **ghost note**.`,
          mission: `A kick alone is a heartbeat. The snare is the crack on beats 2 and 4, which are steps 4 and 12 in a 16-step bar.

Build the snare as a list of 16 numbers and edit the steps by index. Then make the clap by copying only the second half of the snare with a slice. Run it and both rows join the groove.`,
          tasks: [
            "snare_pattern: start with sixteen 0s using [0] * 16",
            "Step 4 is a normal hit (1) and step 12 is an accent (2)",
            "Add a quiet ghost note (a number between 0 and 1) on step 7",
            "clap_pattern = 8 rests + the second half of the snare (snare_pattern[8:])",
            "snare_hits = how many steps are not 0",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 4: the snare and the clap.
snare_pattern = ...    # sixteen rests to start: [0] * 16

# Now change steps by index, for example  snare_pattern[4] = 1
#   step 4  -> 1  (normal hit)
#   step 12 -> 2  (accent)
#   step 7  -> a quiet ghost note: a number between 0 and 1

clap_pattern = ...     # 8 rests, then the second half of the snare: [0] * 8 + snare_pattern[8:]
snare_hits = ...       # how many steps are NOT 0? (16 minus the zeros)
`,
          solutionAdd: py`snare_pattern = [0] * 16
snare_pattern[4] = 1
snare_pattern[7] = 0.4
snare_pattern[12] = 2

clap_pattern = [0] * 8 + snare_pattern[8:]
snare_hits = len(snare_pattern) - snare_pattern.count(0)

print("snare:", snare_pattern)`,
          explanation:
            "[0] * 16 makes a bar of rests, and assigning by index drops hits into it. snare_pattern[8:] is the last 8 steps, so [0] * 8 + snare_pattern[8:] keeps the clap on step 12 only, layered on the snare. Ghost notes (the 0.4) are quiet hits that make a beat feel human.",
          hints: [
            { id: "h1", title: "A bar of rests", content: "snare_pattern = [0] * 16" },
            { id: "h2", title: "Edit by index", content: "snare_pattern[4] = 1, snare_pattern[12] = 2, and snare_pattern[7] = 0.4. Write each on its own line after the list." },
            { id: "h3", title: "Clap and count", content: "clap_pattern = [0] * 8 + snare_pattern[8:] and snare_hits = len(snare_pattern) - snare_pattern.count(0)" },
          ],
          tests: [
            { id: "t1", description: "snare_pattern is a list of 16 steps", assertionCode: `assert isinstance(snare_pattern, list), "snare_pattern must be a list, like [0] * 16"
assert len(snare_pattern) == 16, f"snare_pattern needs 16 steps but has {len(snare_pattern)}"` },
            { id: "t2", description: "Backbeat hits on steps 4 and 12", assertionCode: `assert snare_pattern[4] >= 1 and snare_pattern[12] >= 1, "Put a hit (1 or 2) on step 4 and on step 12"` },
            { id: "t3", description: "Steps 0 and 8 stay empty", assertionCode: `assert snare_pattern[0] == 0 and snare_pattern[8] == 0, "The snare lives on steps 4 and 12, so keep steps 0 and 8 at 0"` },
            { id: "t4", description: "Has a quiet ghost note", assertionCode: `assert any(0 < v < 1 for v in snare_pattern), "Add a ghost note: a number between 0 and 1, like snare_pattern[7] = 0.4"` },
            { id: "t5", description: "clap_pattern copies only the second half", assertionCode: `assert isinstance(clap_pattern, list) and len(clap_pattern) == 16, "clap_pattern must be a list of 16 steps"
assert sum(clap_pattern[:8]) == 0, "The first 8 steps of the clap should be rests (0)"
assert clap_pattern[12] > 0, "The clap should hit on step 12 like the snare"` },
            { id: "t6", description: "snare_hits counts the non-zero steps", assertionCode: `assert snare_hits == len([v for v in snare_pattern if v != 0]), "snare_hits should count the steps that are not 0"` },
          ],
          unlocks: ["snare"],
        },
        {
          id: "beatlab-5-hats",
          title: "Hi-hat loop",
          minutes: 18,
          xp: 100,
          concepts: ["for loops", "range()", "% (modulo)", "if / elif / else"],
          learn: `### Let a loop do the typing

A **for loop** repeats code once per item. \`range(16)\` counts 0, 1, 2 ... 15.

~~~python
for i in range(3):
    print(i)        # 0, 1, 2
~~~

Build a list inside a loop with \`append\`:

~~~python
squares = []
for i in range(4):
    squares.append(i * i)    # [0, 1, 4, 9]
~~~

### Remainders with %

\`a % b\` is the remainder after dividing: \`7 % 4\` is \`3\`. It is perfect for patterns that repeat:

~~~python
i % 2 == 0     # True on 0, 2, 4, 6 ... (every second step)
i % 4 == 0     # True on 0, 4, 8, 12 ... (every beat)
~~~

### Making decisions

~~~python
if i % 4 == 0:
    print("beat")
elif i % 2 == 0:
    print("half-beat")
else:
    print("other")
~~~

Python checks the branches top to bottom and runs the **first** one that is true. Indentation shows what belongs inside.`,
          mission: `Hi-hats are busy: a hit on nearly every step. Typing 16 numbers is boring, so let a loop write the pattern.

On every beat (steps 0, 4, 8, 12) the hat is an accent. On the half-beats (2, 6, 10, 14) it is a normal hit. The steps in between get a very quiet ghost hat. Run it and the shimmer joins the mix.`,
          tasks: [
            "Start with an empty list: hats_pattern = []",
            "Loop over range(16) with a variable i",
            "If i % 4 == 0 append 2, elif i % 2 == 0 append 1, else append 0.3",
            "accents = how many 2s are in the list (use .count(2))",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 5: let a loop write the hi-hats.
hats_pattern = []

# for i in range(16):
#     if i % 4 == 0:       -> append 2    (accent on every beat)
#     elif i % 2 == 0:     -> append 1    (normal hit on the half-beats)
#     else:                -> append 0.3  (quiet ghost hat)

accents = ...     # how many 2s are in hats_pattern?
`,
          solutionAdd: py`hats_pattern = []
for i in range(16):
    if i % 4 == 0:
        hats_pattern.append(2)
    elif i % 2 == 0:
        hats_pattern.append(1)
    else:
        hats_pattern.append(0.3)

accents = hats_pattern.count(2)
print("hats:", hats_pattern)`,
          explanation:
            "The loop visits steps 0 to 15. The if checks the strictest rule first (every beat), then the half-beats, and everything left over falls into else. Because Python stops at the first true branch, step 4 is an accent and is not also a normal hit. Try changing 0.3 to 0 for sparser hats, or i % 8 for a rarer accent.",
          hints: [
            { id: "h1", title: "The loop", content: "for i in range(16):  then indent the lines that belong to it." },
            { id: "h2", title: "The branches", content: "if i % 4 == 0: hats_pattern.append(2)   elif i % 2 == 0: hats_pattern.append(1)   else: hats_pattern.append(0.3)" },
            { id: "h3", title: "Counting", content: "accents = hats_pattern.count(2)" },
          ],
          tests: [
            { id: "t1", description: "hats_pattern is a list of 16 steps", assertionCode: `assert isinstance(hats_pattern, list), "hats_pattern must be a list"
assert len(hats_pattern) == 16, f"hats_pattern needs 16 steps but has {len(hats_pattern)}"` },
            { id: "t2", description: "Accents (2) on every beat", assertionCode: `assert all(hats_pattern[i] == 2 for i in (0, 4, 8, 12)), "Steps 0, 4, 8 and 12 should be 2 (accent)"` },
            { id: "t3", description: "Normal hits (1) on the half-beats", assertionCode: `assert all(hats_pattern[i] == 1 for i in (2, 6, 10, 14)), "Steps 2, 6, 10 and 14 should be 1 (normal hit)"` },
            { id: "t4", description: "Odd steps stay quiet", assertionCode: `assert all(0 <= hats_pattern[i] < 0.5 for i in range(1, 16, 2)), "Odd steps (1, 3, 5 ...) should be quiet: 0 up to 0.3"` },
            { id: "t5", description: "accents counts the 2s", assertionCode: `assert accents == hats_pattern.count(2) == 4, "accents should be hats_pattern.count(2), which is 4"` },
          ],
          unlocks: ["hats"],
        },
      ],
    },
    {
      id: "synth",
      title: "Sound design & structure",
      blurb: "Bass maths, a mixing desk, and an arranger class.",
      lessons: [
        {
          id: "beatlab-6-bass",
          title: "Bass line",
          minutes: 20,
          xp: 110,
          concepts: ["def & return", "parameters", "** (power)", "arithmetic"],
          learn: `### Functions are reusable recipes

A **function** takes inputs (parameters), does some work and sends back a result with \`return\`.

~~~python
def double(n):
    return n * 2

print(double(21))    # 42
~~~

The **indented** lines are the body. The scene will call your function for you, as often as it needs.

### Notes are numbers

Every piano key has a **MIDI number**: 69 is the A above middle C (440 Hz), 70 is the next key up, and so on. Each key is one **semitone**. Going up 12 semitones doubles the frequency, so one semitone multiplies it by 2 to the power of 1/12.

~~~python
2 ** 3        # 8      (** is "to the power of")
2 ** 0.5      # 1.414...
~~~

The formula to turn a note into a frequency in Hz:

~~~python
frequency = 440 * 2 ** ((note - 69) / 12)
~~~

Check it: note 69 gives \`2 ** 0\` = 1, so 440 Hz. Note 57 is 12 below, so \`2 ** -1\` = 0.5, so 220 Hz.`,
          mission: `The bass is the only voice that plays a pitch, and **you** decide the pitch with maths.

Write \`midi_to_hz(note)\` and the synth calls it to get the frequency of each bass note. Then write the bass line: 16 steps where a number is a MIDI note and \`0\` is a rest. Get the formula wrong and you will hear it: the bass goes out of tune!`,
          tasks: [
            "Define midi_to_hz(note) returning 440 * 2 ** ((note - 69) / 12)",
            "midi_to_hz(69) must be 440, and midi_to_hz(33) must be 55",
            "root = 33 (a deep A) and bass_notes = a list of 16 numbers",
            "Use root + 3, root + 5 and root + 7 for a minor groove; 0 is a rest",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 6: write the maths that tunes the bass.
def midi_to_hz(note):
    # frequency = 440 * 2 ** ((note - 69) / 12)
    ...

root = 33              # MIDI note 33 is a deep A (55 Hz)
bass_notes = ...       # 16 steps: a MIDI note number = play it, 0 = rest
                       # use root, root + 3, root + 5, root + 7 ...
`,
          solutionAdd: py`def midi_to_hz(note):
    return 440 * 2 ** ((note - 69) / 12)

root = 33
bass_notes = [root, 0, 0, root, 0, 0, root + 3, 0, root, 0, 0, root + 7, 0, root + 5, 0, root + 3]

print("root note:", round(midi_to_hz(root), 1), "Hz")`,
          explanation:
            "The scene calls midi_to_hz once for each different note and plays the bass at the frequency you return, and the display shows it. 33 is A1 at exactly 55 Hz. Adding 3 gives C, adding 7 gives E, adding 5 gives D: the notes of an A minor pentatonic scale, which almost always sounds good. Try changing root to 36 or 31 to shift the whole line.",
          hints: [
            { id: "h1", title: "The shape", content: "def midi_to_hz(note):  then an indented line:  return ..." },
            { id: "h2", title: "The formula", content: "return 440 * 2 ** ((note - 69) / 12)" },
            { id: "h3", title: "Notes", content: "bass_notes = [root, 0, 0, root, 0, 0, root + 3, 0, ...] needs exactly 16 items." },
          ],
          tests: [
            { id: "t1", description: "midi_to_hz exists", assertionCode: `assert callable(midi_to_hz), "Define a function called midi_to_hz"` },
            { id: "t2", description: "Note 69 is 440 Hz", assertionCode: `assert abs(midi_to_hz(69) - 440) < 1e-6, "midi_to_hz(69) should be 440"` },
            { id: "t3", description: "Octaves halve and double", assertionCode: `assert abs(midi_to_hz(57) - 220) < 1e-6, "midi_to_hz(57) should be 220 (one octave down)"
assert abs(midi_to_hz(81) - 880) < 1e-6, "midi_to_hz(81) should be 880 (one octave up)"` },
            { id: "t4", description: "Middle C is 261.63 Hz", assertionCode: `assert abs(midi_to_hz(60) - 261.6256) < 0.01, "midi_to_hz(60) should be about 261.63"` },
            { id: "t5", description: "bass_notes is a 16-step list", assertionCode: `assert isinstance(bass_notes, list) and len(bass_notes) == 16, "bass_notes must be a list of exactly 16 numbers"` },
            { id: "t6", description: "A real bass line (notes and rests)", assertionCode: `assert sum(1 for n in bass_notes if n != 0) >= 5, "Play at least 5 notes"
assert sum(1 for n in bass_notes if n == 0) >= 4, "Leave at least 4 rests (0) so it can breathe"
assert all(n == 0 or 24 <= n <= 60 for n in bass_notes), "Keep notes between 24 and 60 so they stay in bass range"` },
          ],
          unlocks: ["bass"],
        },
        {
          id: "beatlab-7-mixer",
          title: "Mixing desk",
          minutes: 20,
          xp: 110,
          concepts: ["dictionaries", "nested dicts", "looping over keys"],
          learn: `### Dictionaries look things up by name

A **dictionary** maps keys to values.

~~~python
prices = {"coffee": 3, "tea": 2}
prices["tea"]            # 2
prices["cake"] = 5       # add a pair
prices["tea"] = 4        # change a value
~~~

Values can be anything, even other dictionaries:

~~~python
band = {
    "drums": {"loud": True, "members": 1},
    "guitar": {"loud": False, "members": 2},
}
band["guitar"]["members"]    # 2
~~~

### Looping over a dictionary

A for loop over a dictionary gives you its keys:

~~~python
for name in band:
    print(name, band[name]["members"])
~~~`,
          mission: `A mix is all about balance. Build a mixing desk: a dictionary named \`tracks\` with one entry per instrument, each holding a \`volume\` (0 to 1), a \`pan\` (-1 is fully left, 1 is fully right) and a \`mute\` switch.

The hats are too loud, so turn them down. Then loop through the desk and collect the tracks that are not muted. Run it and every row gets a fader, a pan marker and a mute button on the stage.`,
          tasks: [
            'Add "clap", "hats" and "bass" to tracks in the same shape as "kick"',
            "Pan the clap to the right (positive) and the hats to the left (negative)",
            'Make the hats quieter than the kick: tracks["hats"]["volume"] = 0.45',
            'Loop over tracks and append every name whose "mute" is False to active',
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 7: build the mixing desk.
tracks = {
    "kick": {"volume": 0.95, "pan": 0.0, "mute": False},
    "snare": {"volume": 0.8, "pan": 0.0, "mute": False},
    # add "clap", "hats" and "bass" here, in the same shape
    # pan: -1.0 is left, 1.0 is right. Try clap 0.3 and hats -0.3
}

# The hats are way too loud. Turn them down:
# tracks["hats"]["volume"] = ...

active = []
# loop over tracks and append the name of every track that is not muted
`,
          solutionAdd: py`tracks = {
    "kick": {"volume": 0.95, "pan": 0.0, "mute": False},
    "snare": {"volume": 0.8, "pan": 0.0, "mute": False},
    "clap": {"volume": 0.6, "pan": 0.3, "mute": False},
    "hats": {"volume": 0.7, "pan": -0.3, "mute": False},
    "bass": {"volume": 0.85, "pan": 0.0, "mute": False},
}

tracks["hats"]["volume"] = 0.45

active = []
for name in tracks:
    if not tracks[name]["mute"]:
        active.append(name)

print("playing:", active)`,
          explanation:
            'tracks["hats"] looks up the inner dictionary and ["volume"] reaches into it, so assigning to it changes just that one setting. The for loop gives each key in turn, and the if skips muted tracks. Set a mute to True and run again: the track goes quiet on the stage and drops out of the active list.',
          hints: [
            { id: "h1", title: "Same shape", content: 'Copy a line like "kick": {"volume": 0.95, "pan": 0.0, "mute": False}, and change the name and numbers. Keep the commas.' },
            { id: "h2", title: "Reach inside", content: 'tracks["hats"]["volume"] = 0.45 changes one number inside the hats entry.' },
            { id: "h3", title: "The loop", content: 'for name in tracks:  then  if not tracks[name]["mute"]:  then  active.append(name)' },
          ],
          tests: [
            { id: "t1", description: "tracks has all five instruments", assertionCode: `assert isinstance(tracks, dict), "tracks must be a dictionary"
assert set(tracks.keys()) == {"kick", "snare", "clap", "hats", "bass"}, f"tracks needs kick, snare, clap, hats and bass but has {sorted(tracks.keys())}"` },
            { id: "t2", description: "Each track has volume, pan and mute", assertionCode: `for _n in tracks:
    _t = tracks[_n]
    assert isinstance(_t, dict), f"tracks[{_n!r}] must be a dictionary with volume, pan and mute"
    assert 0 <= _t["volume"] <= 1, f"{_n} volume must be between 0 and 1"
    assert -1 <= _t["pan"] <= 1, f"{_n} pan must be between -1 and 1"
    assert type(_t["mute"]) is bool, f"{_n} mute must be True or False"` },
            { id: "t3", description: "Hats are quieter than the kick", assertionCode: `assert tracks["hats"]["volume"] < tracks["kick"]["volume"], "The hats should be quieter than the kick"
assert tracks["hats"]["volume"] <= 0.6, "Turn the hats down to 0.6 or less"` },
            { id: "t4", description: "Clap pans right, hats pan left", assertionCode: `assert tracks["clap"]["pan"] > 0, "Pan the clap to the right (a positive number)"
assert tracks["hats"]["pan"] < 0, "Pan the hats to the left (a negative number)"` },
            { id: "t5", description: "active lists the unmuted tracks", assertionCode: `assert isinstance(active, list), "active must be a list"
assert active == [n for n in tracks if not tracks[n]["mute"]], "active should contain the name of every track whose mute is False"` },
          ],
          unlocks: ["mixer"],
        },
        {
          id: "beatlab-8-arranger",
          title: "The arranger",
          minutes: 25,
          xp: 150,
          concepts: ["classes", "__init__", "self", "methods", "if / elif / else"],
          learn: `### Classes bundle data and behaviour

A **class** is a blueprint. An **instance** is one thing built from it.

~~~python
class Dog:
    def __init__(self, name):
        self.name = name           # data stored on the instance

    def speak(self):
        return f"{self.name} says woof"

rex = Dog("Rex")
print(rex.speak())
~~~

- \`__init__\` runs when you create an instance.
- \`self\` is the instance itself, so \`self.name\` is its data.
- A **method** is a function inside the class. Call it with a dot: \`rex.speak()\`.

### Counting bars

Music is built in phrases. If a phrase is 4 bars long, \`bar % 4\` cycles 0, 1, 2, 3, 0, 1, 2, 3 ... and tells you where in the phrase you are. The last bar of a phrase (\`bar % 4 == 3\`) is the traditional place for a drum fill.

~~~python
bar = 7
spot = bar % 4         # 3
~~~

The scene counts bars from 0.`,
          mission: `Every great track has a plan: groove, groove, groove, **fill**, then a big **drop**. Build the brain that plans it.

Write an \`Arranger\` class with a \`section(bar)\` method. It receives the bar number and returns \`"groove"\`, \`"fill"\` or \`"drop"\`. The scene asks it once per bar: a fill is a snare roll that builds into the next bar, and a drop brings a crash cymbal and a double-strength kick and bass. Make one with \`arranger = Arranger(phrase_bars=4)\` and press Play.`,
          tasks: [
            "Class Arranger with __init__(self, phrase_bars) storing self.phrase_bars",
            'Method section(self, bar): the last bar of each phrase returns "fill"',
            'The first bar of a later phrase (bar % phrase_bars is 0, and bar is above 0) returns "drop"',
            'Every other bar returns "groove"',
            "Create the instance: arranger = Arranger(phrase_bars=4)",
          ],
          starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 8: build the arranger.
class Arranger:
    def __init__(self, phrase_bars):
        # remember how many bars make one phrase
        ...

    def section(self, bar):
        # position in the phrase:  bar % self.phrase_bars
        # last bar of the phrase           -> return "fill"
        # first bar of a LATER phrase      -> return "drop"   (bar must be above 0)
        # anything else                    -> return "groove"
        ...

arranger = ...     # create one with phrase_bars=4
`,
          solutionAdd: py`class Arranger:
    def __init__(self, phrase_bars):
        self.phrase_bars = phrase_bars

    def section(self, bar):
        spot = bar % self.phrase_bars
        if spot == self.phrase_bars - 1:
            return "fill"
        elif spot == 0 and bar > 0:
            return "drop"
        else:
            return "groove"

arranger = Arranger(phrase_bars=4)`,
          explanation:
            'bar % self.phrase_bars is the position inside the phrase. With 4-bar phrases, bar 3 is the fill, bar 4 is the drop, and bars 1 and 2 are plain groove (bar 0 stays groove because there is nothing before it to drop from). The scene shows "bar N -> section" live. Try phrase_bars=2 for a restless track, or return "break" on some bar to hear the kick and bass drop out.',
          hints: [
            { id: "h1", title: "Store it", content: "Inside __init__: self.phrase_bars = phrase_bars" },
            { id: "h2", title: "Position", content: "spot = bar % self.phrase_bars. The last bar of a phrase is when spot == self.phrase_bars - 1." },
            { id: "h3", title: "Three branches", content: 'if spot == self.phrase_bars - 1: return "fill"   elif spot == 0 and bar > 0: return "drop"   else: return "groove"' },
            { id: "h4", title: "Make one", content: "arranger = Arranger(phrase_bars=4)" },
          ],
          tests: [
            { id: "t1", description: "Arranger remembers phrase_bars", assertionCode: `_a = Arranger(phrase_bars=8)
assert _a.phrase_bars == 8, "__init__ should store phrase_bars as self.phrase_bars"` },
            { id: "t2", description: "The last bar of a phrase is a fill", assertionCode: `_a = Arranger(4)
assert _a.section(3) == "fill", 'section(3) should be "fill" with 4-bar phrases'
assert _a.section(7) == "fill", 'section(7) should be "fill" too'` },
            { id: "t3", description: "A new phrase starts with a drop", assertionCode: `_a = Arranger(4)
assert _a.section(4) == "drop", 'section(4) should be "drop": the first bar of the second phrase'
assert _a.section(8) == "drop", 'section(8) should be "drop"'` },
            { id: "t4", description: "Other bars are a plain groove", assertionCode: `_a = Arranger(4)
assert _a.section(0) == "groove", 'section(0) should be "groove": there is nothing to drop from yet'
assert _a.section(1) == "groove" and _a.section(2) == "groove", 'section(1) and section(2) should be "groove"'` },
            { id: "t5", description: "Works with other phrase lengths", assertionCode: `_a = Arranger(2)
assert [_a.section(b) for b in range(5)] == ["groove", "fill", "drop", "fill", "drop"], "With phrase_bars=2 the bars should go groove, fill, drop, fill, drop"` },
            { id: "t6", description: "arranger is an Arranger instance", assertionCode: `assert isinstance(arranger, Arranger), "Create it with: arranger = Arranger(phrase_bars=4)"
assert arranger.phrase_bars == 4, "Use phrase_bars=4"` },
          ],
          unlocks: ["arranger"],
        },
      ],
    },
  ],
};
