import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (tables, diagrams) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 1 and 2 of "Components and PCB design": meet the parts, and reading a datasheet. */
export const pcbLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. Meet the parts ───────────────────────────────
  {
    id: "fnd-pcb-1-parts",
    title: "Meet the parts",
    summary: "Resistors and their colour bands, SMD codes, capacitors and their polarity, chip packages and connectors: what you will place on a board.",
    minutes: 10,
    xp: 45,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "A resistor and its stripes",
        body: P(
          "A **resistor** limits current. In *Electronics from zero: circuits* (the lesson \"Ohm's law\") you met V = I × R: for a fixed voltage, a bigger resistance means a smaller current. On a board, resistors set the current through an LED, split one voltage into two, and hold a signal line at a known level when nothing drives it.",
          "A small through-hole resistor has no room for printed numbers, so its value is written in **colour bands**. Read from the end the bands are closest to:\n- **4 bands:** two digits, a multiplier, then the tolerance.\n- **5 bands (precision parts):** three digits, a multiplier, then the tolerance.",
          "The **tolerance** is how far the real value may be from the printed one: gold means ±5 %, so a 4.7 kΩ part may be anywhere from 4.465 to 4.935 kΩ. The tolerance band is usually set a little apart from the others, which tells you which end to start from.",
          "Pick a band, pick a colour, and watch the value. Gold and silver can also be a multiplier (×0.1 and ×0.01) for values below 10 Ω. Try the 5-band setting too.",
        ),
        widget: { type: "pcb-resistor", props: { mode: "decode", bands: 4, toggle: true, initial: ["yellow", "violet", "red", "gold"] } },
      },
      {
        kind: "question",
        title: "Read the bands",
        body: "This resistor's bands are **green, blue, orange, gold**. What is its value in **kΩ**? (Digits first, then the multiplier. Use the colour chart under the drawing.)",
        widget: { type: "pcb-resistor", props: { mode: "decode", bands: 4, initial: ["green", "blue", "orange", "gold"], hideValue: true, lock: true } },
        question: {
          type: "number",
          answer: 56,
          tolerance: 0.01,
          unit: "kΩ",
          hint: "Look up the first two colours in the chart as digits, then multiply by the value of the third (multiplier) band.",
        },
        explanation: "Green = 5, blue = 6, so the digits are **56**. Orange as the multiplier is **× 1000**, so 56 × 1000 = 56 000 Ω = **56 kΩ**. Gold is the tolerance, ±5 %, which puts the real value between about 53.2 and 58.8 kΩ.",
      },
      {
        kind: "question",
        title: "Build a precision resistor",
        body: "Now the other direction. Set the bands of a **5-band** resistor to **47.5 kΩ, ±1 %**. Three digits first (475), then the multiplier, then the tolerance.",
        widget: { type: "pcb-resistor", props: { mode: "encode", bands: 5, target: { ohms: 47500, tolerancePct: 1 } } },
        question: {
          type: "widget",
          goal: { ohms: 47500, tolerancePct: 1, count: 5 },
          prompt: "Choose the five colours so the value reads 47.5 kΩ with ±1 % tolerance.",
          hint: "Write 47.5 kΩ as a three-digit number times a power of ten, then find each digit, the multiplier and the ±1 % colour in the chart.",
        },
        explanation: "47.5 kΩ is 475 × 100, so the bands are **yellow (4), violet (7), green (5), red (× 100), brown (±1 %)**. Five bands exist for exactly this reason: two digits cannot write 475.",
      },
      {
        kind: "explain",
        title: "Tiny chips print codes",
        body: P(
          "A surface-mount (SMD) resistor is the size of a grain of rice or smaller, so it carries a printed **code** instead of stripes. Four schemes are common:\n- **3 digits:** the first two are the value, the third is the number of zeros. **472** = 47 followed by 2 zeros = 4700 Ω = 4.7 kΩ.\n- **4 digits:** three digits then the zero count. **4701** = 470 followed by 1 zero = 4.7 kΩ.\n- **R notation:** the R is the decimal point. **4R7** = 4.7 Ω, **R47** = 0.47 Ω.\n- **EIA-96 (1 % chips):** two digits pick a value from a table of 96, then a letter picks the multiplier. **01C** = 100 × 100 = 10 kΩ.",
          "That table is the **E96 series**, one of the standard value series (E-series). Resistors are not made in every value: E12 has 12 values per decade (10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82, typically ±10 %), E24 has 24 (typically ±5 %) and E96 has 96 (typically ±1 %). You choose the nearest standard value, and the tolerance covers the gap.",
          "A code of **000** is a **zero-ohm jumper**: a wire link shaped like a resistor so a machine can place it. Tiny sizes such as 0402 are usually not marked at all. Try the examples and your own codes.",
        ),
        widget: { type: "pcb-smd", props: { examples: ["472", "4701", "4R7", "R47", "68B", "000"] } },
      },
      {
        kind: "question",
        title: "Write a code",
        body: "A 1 % chip resistor is **10 kΩ**. Type the **EIA-96 code** for it. (Hint for the table: 10 kΩ = 100 × 100. Open the EIA-96 tables under the chip.)",
        widget: { type: "pcb-smd", props: { examples: ["472", "4R7", "68B"] } },
        question: {
          type: "widget",
          goal: { ohms: 10000, scheme: "EIA-96" },
          prompt: "Type a two-digit-plus-letter code that decodes to 10 kΩ.",
          hint: "Find 100 in the EIA-96 table (its index is the first two digits). Then pick the letter whose multiplier turns 100 into 10 000.",
        },
        explanation: "100 sits at index **01** in the table, and 100 × 100 = 10 000, so the letter is **C** (× 100). **01C** = 10 kΩ. The ordinary 3-digit code for the same value is **103** (10 followed by 3 zeros), used on 5 % and 10 % chips.",
      },
      {
        kind: "question",
        title: "Which way round?",
        body: P(
          "Capacitors store charge (see *Components in action: capacitors to op-amps*, \"Capacitors\"). Two kinds appear on almost every board. **Ceramic** capacitors (MLCC) are tiny, have no polarity and handle small values, up to a few µF. **Aluminium electrolytic** capacitors are cans that hold far more capacitance per part, and they are **polarised**: the stripe with minus signs marks the **negative** lead. On a new through-hole one, the **longer lead is positive**. Each capacitor also has a **voltage rating**, a limit you must stay under.",
          "A new through-hole electrolytic goes across a **5 V rail and ground**. Which connection is right?",
        ),
        question: {
          type: "choice",
          options: [
            "The stripe side to the 5 V rail",
            "Either way: capacitors have no polarity",
            "The stripe side to ground, the longer lead to 5 V",
            "The longer lead to ground, the stripe side to 5 V",
          ],
          answer: 2,
          hint: "The stripe is printed with minus signs. Which side of the circuit is the more negative one?",
          feedback: {
            0: "That puts the negative lead on the positive rail, which is backwards. The stripe marks the negative lead.",
            1: "Ceramic capacitors have no polarity, but aluminium electrolytics do. Reversed, they can heat up, vent or burst.",
            3: "That is reversed: the longer lead is the positive one, so it goes to 5 V, and the stripe (negative) goes to ground.",
          },
        },
        explanation: "The stripe marks the **negative** lead, so it goes to ground; the longer (positive) lead goes to 5 V. Fitted backwards, an electrolytic can overheat, vent or even burst, so wear eye protection when you power a new board for the first time. Careful: a moulded SMD **tantalum** capacitor is the opposite, where the bar marks the **positive** end. Always check the part's datasheet.",
      },
      {
        kind: "question",
        title: "Reading 104",
        body: P(
          "Small film and ceramic capacitors often print a 3-digit code in **picofarads (pF)**, read like a resistor: two digits, then the number of zeros. SMD ceramics are usually unmarked, so their value comes from the reel or the board's parts list.",
          "A capacitor is marked **104**. Its value in **nF** is? (1000 pF = 1 nF.)",
        ),
        question: {
          type: "number",
          answer: 100,
          tolerance: 0,
          unit: "nF",
          hint: "104 means 10 followed by 4 zeros, in picofarads. Then convert pF to nF.",
        },
        explanation: "104 = 10 followed by 4 zeros = 100 000 pF = **100 nF** (0.1 µF). It is the most common **decoupling** capacitor on boards: a 100 nF ceramic beside each chip's supply pin, which you will place in the next lessons.",
      },
      {
        kind: "code",
        title: "From bands to ohms",
        body: "Write `resistor_from_bands(bands)`. It takes a list of colour names for a **4-band or 5-band** resistor (digits, then the multiplier, then the tolerance) and returns the value in **ohms**.\n\nThe last band is the tolerance (ignore it). The second last is the multiplier. Every band before that is a digit.",
        language: "python",
        starter: `DIGIT = {"black": 0, "brown": 1, "red": 2, "orange": 3, "yellow": 4,
         "green": 5, "blue": 6, "violet": 7, "grey": 8, "white": 9}
# the multiplier of a digit colour is 10 ** digit; gold and silver are special
MULT = {**{c: 10 ** d for c, d in DIGIT.items()}, "gold": 0.1, "silver": 0.01}

def resistor_from_bands(bands):
    # digits = everything before the last two bands
    return 0
`,
        solution: `DIGIT = {"black": 0, "brown": 1, "red": 2, "orange": 3, "yellow": 4,
         "green": 5, "blue": 6, "violet": 7, "grey": 8, "white": 9}
MULT = {**{c: 10 ** d for c, d in DIGIT.items()}, "gold": 0.1, "silver": 0.01}

def resistor_from_bands(bands):
    value = 0
    for colour in bands[:-2]:
        value = value * 10 + DIGIT[colour]
    return value * MULT[bands[-2]]
`,
        tests: [
          { id: "four", description: "4 bands: yellow violet red gold is 4.7 kΩ", assertionCode: `r = resistor_from_bands(["yellow", "violet", "red", "gold"])\nassert abs(r - 4700) < 1e-6, f"got {r}, expected 4700"` },
          { id: "five", description: "5 bands: brown black black red brown is 10 kΩ", assertionCode: `r = resistor_from_bands(["brown", "black", "black", "red", "brown"])\nassert abs(r - 10000) < 1e-6, f"got {r}, expected 10000 (100 x 100)"` },
          { id: "gold", description: "Gold as the multiplier is × 0.1", assertionCode: `r = resistor_from_bands(["brown", "black", "gold", "gold"])\nassert abs(r - 1.0) < 1e-6, f"got {r}, expected 1.0 (10 x 0.1)"` },
          { id: "five-silver", description: "5 bands with silver: green blue black silver brown is 5.6 Ω", assertionCode: `r = resistor_from_bands(["green", "blue", "black", "silver", "brown"])\nassert abs(r - 5.6) < 1e-6, f"got {r}, expected 5.6 (560 x 0.01)"` },
        ],
        hints: ["Build the number digit by digit: value = value * 10 + DIGIT[colour].", "bands[:-2] is every band except the last two. bands[-2] is the multiplier."],
      },
      {
        kind: "question",
        title: "Packages and connectors",
        body: P(
          "A chip is a tiny piece of silicon sealed in a **package** with pins. **Through-hole (THT)** packages push leads through holes in the board: easy to solder, bigger. **Surface-mount (SMD)** packages sit on pads on the surface: smaller, and the way almost all modern boards are built. The usual names are DIP (through-hole), SOIC and TSSOP (leads on two sides), QFN (pads under the edges) and BGA (a grid of solder balls under the whole chip). **Pin 1** is marked with a dot, a notch or a bevelled corner.",
          "Connectors are parts too. The workhorse is the **0.1 in (2.54 mm) pin header**; small keyed families like **JST** plugs carry battery and sensor wires; **USB-C** is a 24-contact SMD socket with 0.5 mm pitch (typical).",
          "Look through at least **four** packages in the gallery, then select the one that **cannot be soldered by hand** and needs X-ray to inspect.",
        ),
        widget: { type: "pcb-packages", props: { initial: "dip8" } },
        question: {
          type: "widget",
          goal: { selected: "bga", minSeen: 4 },
          prompt: "View at least four different packages, then leave the BGA selected.",
          hint: "Which package hides all its connections under the body, where an iron can never reach?",
        },
        explanation: "A **BGA** has its solder balls under the body, so you cannot see or reach them: it goes through an oven (reflow), and X-ray shows whether the balls joined properly. DIP and TO-220 are easy by hand, SOIC and TSSOP take a fine tip and practice, and QFN needs hot air or reflow. The pitch (spacing between pins) is the main thing that makes a package hard.",
      },
      {
        kind: "recap",
        points: [
          "**Resistor bands:** digits, then the multiplier, then the tolerance; a precision part uses 5 bands. Gold and silver as multipliers are ×0.1 and ×0.01.",
          "**SMD codes:** 3-digit (472 = 4.7 kΩ), 4-digit, R notation (4R7 = 4.7 Ω) and EIA-96 (two digits plus a letter). 000 is a zero-ohm jumper. Standard value series: E12, E24, E96.",
          "**Capacitors:** ceramic has no polarity; aluminium electrolytic does (the stripe marks the negative lead). Code 104 = 100 nF.",
          "**Packages:** THT is easy by hand; SMD is smaller; QFN and BGA need hot air or reflow, and a BGA needs X-ray to inspect. Pin 1 is always marked.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Reading a datasheet ───────────────────────────────
  {
    id: "fnd-pcb-2-datasheet",
    title: "Reading a datasheet",
    summary: "How to skim a datasheet: pinout, absolute maximum versus recommended ratings, min/typ/max, thermal estimates and the typical circuit.",
    minutes: 10,
    xp: 45,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "The manual for a chip",
        body: P(
          "A **datasheet** is the manufacturer's description of a part: what it does, what its pins are, what it can survive and how it behaves. Every part you put on a board has one, usually a PDF from the maker or a distributor's website. Read it **before** you draw the schematic, not after the board smokes.",
          "You do not read a datasheet like a book. You skim in a fixed order:\n1. **First page:** what is it, and is it the right kind of part?\n2. **Pinout:** which pin does what.\n3. **Absolute maximum** and **recommended operating** conditions.\n4. **Electrical characteristics:** the guaranteed numbers.\n5. **Typical application circuit:** the manufacturer's own example, with the capacitors and resistors it needs.\n6. **Thermal** information and the package drawing.",
          "The part below is the **PK3302**, a **made-up** 3.3 V regulator invented for this lesson (every number on it is fictional). Tap any value to see what it means.",
        ),
        widget: { type: "pcb-datasheet", props: { mode: "read", sections: ["features", "pinout"] } },
      },
      {
        kind: "question",
        title: "Find the input pin",
        body: "You are drawing the schematic. Tap the line that tells you which pin is the **supply input**.",
        widget: { type: "pcb-datasheet", props: { mode: "find", ask: "pin-in", sections: ["features", "pinout"] } },
        question: {
          type: "widget",
          goal: { picked: "pin-in" },
          prompt: "Tap the pinout row for the supply input.",
          hint: "Look at the pin names. IN means input, OUT means output.",
        },
        explanation: "Pin 3 is **IN**. Always copy pin numbers from the datasheet's pinout, never from memory: a SOT-223 regulator from another maker may put them in a different order. Note the metal tab as well: it is wired to OUT and is part of the heat path.",
      },
      {
        kind: "explain",
        title: "Two tables that sound alike",
        body: P(
          "The **absolute maximum ratings** are the limits beyond which the part **can be damaged**. They are not a place to operate: they are the edge of the cliff. The **recommended operating conditions** are where the part is **guaranteed to work as described**. Everything you design should sit inside the recommended ranges.",
          txt(`
PK3302 input voltage
-0.3 V ........ 4.5 V ........ 12 V ........ 16 V
 damage   |  not guaranteed |  GUARANTEED |  damage
          |   (below min)   | (recommended)|  (abs max)
`),
          "A voltage between 12 V and 16 V does not break the part at once, but nothing in the datasheet promises it works, and there is little margin before damage. Tap the values in both tables and compare.",
        ),
        widget: { type: "pcb-datasheet", props: { mode: "read", sections: ["absmax", "rec"] } },
      },
      {
        kind: "question",
        title: "A 14 V supply",
        body: "A wall adapter gives 14 V. A teammate says: \"It's under the 16 V absolute maximum, so we can feed it straight into the PK3302.\" What do you say?",
        question: {
          type: "choice",
          options: [
            "Agreed: anything under the absolute maximum is allowed",
            "No: 14 V is above the 12 V recommended maximum, so the specs are not guaranteed and the margin to damage is thin",
            "Agreed, since 14 V is also above the 4.5 V minimum",
            "No: it is only a problem if the output current is above 500 mA",
          ],
          answer: 1,
          hint: "Which table tells you where the part is guaranteed to work? Compare 14 V with that range.",
          feedback: {
            0: "The absolute maximum is the damage line, not a design target. Operation is guaranteed only inside the recommended range.",
            2: "Being above the minimum is only half of it. The recommended range is 4.5 to 12 V, and 14 V is over the top end.",
            3: "The input voltage has its own limit. 14 V is outside the 4.5 to 12 V range whatever the load current is.",
          },
        },
        explanation: "Design **inside the recommended operating conditions**, 4.5 to 12 V here. A 14 V input is below the 16 V damage line but outside the range where any number in the datasheet is promised. Adapters are also often unregulated, so \"14 V\" may really be higher with a light load.",
      },
      {
        kind: "explain",
        title: "Min, typ, max",
        body: P(
          "The **electrical characteristics** table gives each number as **min**, **typ** (typical) or **max**, always **under stated conditions** (supply voltage, load, temperature). Read the condition column first.",
          "Be careful with each column:\n- **min / max** are guaranteed for parts that pass the factory test. **Design to these.**\n- **typ** is what a part usually does, not a promise. A typical value is fine for an estimate; never rely on it for a limit.",
          "For the PK3302, **dropout voltage** is how far the input must stay above the output. Typical is 0.6 V at 500 mA, but the guaranteed worst case is higher: if you want 3.3 V out, you have to plan for the **max**. Tap the rows to see.",
        ),
        widget: { type: "pcb-datasheet", props: { mode: "read", sections: ["ec"] } },
      },
      {
        kind: "question",
        title: "Worst-case dropout",
        body: "Your design must work with **any** PK3302 that passes the factory test. Tap the **worst-case dropout voltage** at 500 mA.",
        widget: { type: "pcb-datasheet", props: { mode: "find", ask: "ec-dropout-max", sections: ["ec"] } },
        question: {
          type: "widget",
          goal: { picked: "ec-dropout-max" },
          prompt: "Tap the value that guarantees dropout at 500 mA.",
          hint: "Worst case means the largest dropout a good part can have: min, typ or max column?",
        },
        explanation: "The **max** dropout, **1.0 V**, is the worst case. To get a guaranteed 3.3 V at 500 mA, VIN must be at least 3.3 + 1.0 = **4.3 V**, which is why the recommended minimum input is 4.5 V.",
      },
      {
        kind: "question",
        title: "Find the heat number",
        body: P(
          "A linear regulator turns the voltage it drops into **heat**. With 5 V in and 3.3 V out at 400 mA, 1.7 V × 0.4 A is real power that has to leave the package. The datasheet's **thermal resistance θJA** says how many degrees the silicon (the **junction**) rises above the surrounding air for each watt:",
          txt(`
P  = (VIN - VOUT) x IOUT          (watts; ignores the small VIN x IQ term)
TJ = TA + P x θJA                 (junction temperature, °C)
`),
          "This is a simplification (one thermal resistance, still air, steady state), and the θJA in the table holds only for the **test board described** in its conditions. A real board can do better or worse. Tap the θJA value.",
        ),
        widget: { type: "pcb-datasheet", props: { mode: "find", ask: "theta-ja", sections: ["thermal"] } },
        question: {
          type: "widget",
          goal: { picked: "theta-ja" },
          prompt: "Tap the thermal resistance, junction to ambient.",
          hint: "It is in the thermal information section, in °C per watt.",
        },
        explanation: "θJA = **60 °C/W** on the stated board: every watt raises the junction by 60 °C. **Safety:** a regulator running near its limit can be hot enough to burn your fingers. Treat a working power part as hot until you have measured it, and never touch the tab while powered.",
      },
      {
        kind: "question",
        title: "How hot does it get?",
        body: "The PK3302 is fed **5 V** and supplies **400 mA** at 3.3 V, in a case where the air is **40 °C**. Use θJA = 60 °C/W. What is the junction temperature **TJ**, in °C?",
        question: {
          type: "number",
          answer: 80.8,
          tolerance: 0.5,
          unit: "°C",
          hint: "First the power: (5 − 3.3) × 0.4 W. Then TJ = 40 + P × 60.",
        },
        explanation: "P = (5 − 3.3) × 0.4 = **0.68 W**. TJ = 40 + 0.68 × 60 = **80.8 °C**, comfortably under the 125 °C recommended maximum. Notice that the power depends on the **drop**, not the output: feeding the same part 12 V would burn (12 − 3.3) × 0.4 = 3.5 W, and TJ would be about 250 °C.",
      },
      {
        kind: "question",
        title: "Design review",
        body: "A teammate proposes this design: **15 V** wall adapter → PK3302 → a 3.3 V sensor board drawing **450 mA**, inside a box at **60 °C**, with a 10 µF input capacitor and **no output capacitor**. Flag every line of the review that **breaks the datasheet**.",
        widget: { type: "pcb-datasheet", props: { mode: "audit" } },
        question: {
          type: "widget",
          goal: { flags: ["vin", "tj", "cout"] },
          prompt: "Flag the lines that violate the datasheet; leave the fine ones alone.",
          hint: "Check the input against the recommended range, work out TJ with P and θJA, and check the typical application circuit.",
        },
        explanation: "Three problems. **VIN 15 V** is over the 12 V recommended maximum. **Heat:** P = (15 − 3.3) × 0.45 ≈ 5.3 W, so TJ ≈ 60 + 5.3 × 60 ≈ 376 °C, impossible. **No output capacitor:** the datasheet requires at least 10 µF for stability. The 450 mA load and the 60 °C ambient are fine by themselves. The fix is a different input (5 V) or a switching regulator, which wastes far less as heat.",
      },
      {
        kind: "recap",
        points: [
          "Skim a datasheet in order: first page, pinout, ratings, electrical characteristics, typical circuit, thermal and package. Real ones come from the maker or a distributor; the PK3302 here is made up.",
          "**Absolute maximum** = damage beyond here, not a place to operate. **Recommended operating conditions** = where the specs are guaranteed.",
          "Design to **min and max** in the electrical characteristics, not **typ**, and read the conditions column.",
          "For a linear regulator, P = (VIN − VOUT) × IOUT and TJ = TA + P × θJA (a simplified estimate). Hot parts can burn fingers.",
          "Copy the **typical application circuit**: its capacitors are often required, not optional.",
        ],
      },
    ],
  },
];
