import type { ConceptLesson } from "../../learn/types.ts";

/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/**
 * Lessons 1 to 5 of "Building real products". One running example, "Sprout", a battery-powered plant monitor
 * (soil moisture and light sensors, a Bluetooth chip, a phone app), goes from a wish to a first working board.
 * Prices, currents and counts in the widgets are made-up round numbers for teaching.
 */
export const productsLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. From idea to requirements ───────────────────────────────
  {
    id: "fnd-prod-1-requirements",
    title: "From idea to requirements",
    summary: "Turn a vague wish into numbers you can test, and see how battery life, size and cost pull against each other.",
    level: "Beginner",
    minutes: 9,
    xp: 45,
    steps: [
      {
        kind: "explain",
        title: "Meet Sprout",
        body: P(
          "Over the next nine lessons you will build a product on paper: **Sprout**, a small plant monitor. It sits in a flower pot, measures how wet the soil is and how much light the plant gets, and tells your phone over Bluetooth. It runs on a battery for a year without anyone touching it.",
          "Every product starts as a **wish**: \"it should last a long time\", \"it should be small\", \"it should be cheap\". Wishes feel clear, but you cannot build to them or test them. If two people disagree about whether \"long\" was achieved, who is right?",
          "A **requirement** is a wish turned into something you can check: a number, a unit, and a way to test it. Below, each wish has three possible rewrites. Pick one for each and see which ones pass.",
        ),
        widget: { type: "prod-requirements", props: {} },
      },
      {
        kind: "question",
        title: "Make every wish testable",
        body: "Pick a rewrite for **each** of the five wishes so that all five are measurable.",
        widget: { type: "prod-requirements", props: { tester: false } },
        question: { type: "widget", goal: { allGood: true }, hint: "A measurable rewrite has a number and a unit (months, mm, dollars, seconds, degrees). Words like good, compact and robust are opinions." },
        explanation: "A requirement is only useful if two people could test it separately and agree on pass or fail. \"At least 12 months\" is testable; \"good battery life\" starts an argument. Writing the number forces the team to decide what they actually want.",
      },
      {
        kind: "explain",
        title: "Constraints pull against each other",
        body: P(
          "Your requirements are also **constraints**: limits the design has to stay inside. For Sprout the big four are **cost**, **size**, **power** and **battery life**. They fight. A bigger battery lasts longer but costs more and takes room. A faster radio reports more often but drains the cell.",
          "Battery life is the one beginners miss, so try it now. The widget uses the idea from *Power and heat* in the circuits module: the battery holds a fixed amount of charge (milliamp-hours), and life is that charge divided by the **average current** the product draws. Most of the time Sprout sleeps, and a short burst of activity happens each time it reports.",
          "Move the sliders. Which one changes battery life the most?",
        ),
        widget: { type: "prod-battery", props: {} },
      },
      {
        kind: "question",
        title: "Where does the charge go?",
        body: "With the starting settings (8 µA asleep, one report every 15 minutes, 300 ms of radio), which part of one report cycle spends the **most charge**?",
        widget: { type: "prod-battery", props: {} },
        question: {
          type: "choice",
          options: ["The radio burst", "The sensor measurement", "Simply being asleep", "They are about equal"],
          answer: 2,
          hint: "Look at the bars. Sleep current is tiny, but how long does the product spend asleep in 15 minutes?",
          feedback: {
            0: "The radio is the biggest *burst*, but it is on for only 0.3 s out of 900. The bars show it spends less in total than sleep does.",
            1: "The measurement is only 100 ms at 2 mA. It is the smallest bar.",
            3: "Check the bars: one of them is more than twice the next.",
          },
        },
        explanation: "Asleep: 8 µA × about 900 s = 7.2 mA·s. Radio: 10 mA × 0.3 s = 3.0 mA·s. A tiny current that never stops can beat a big current that is rare. That is why the sleep current of every part on the board matters so much in battery products.",
      },
      {
        kind: "question",
        title: "A current budget",
        body: P(
          "Sprout must run for **12 months** on a coin cell. A coin cell is typically about 225 mAh, and you should count on only about 80% of it, so **180 mAh** is usable.",
          "A year is 365 × 24 = 8,760 hours. What **average current** (in microamps) is the most Sprout may draw?",
        ),
        question: { type: "number", hint: "Divide the usable capacity in mAh by the hours in a year, then convert milliamps to microamps (× 1000).", answer: 20.5, tolerance: 0.6, unit: "µA" },
        explanation: "Life = capacity ÷ average current, so current = 180 mAh ÷ 8,760 h = 0.0205 mA = **20.5 µA**. That is the budget for everything: sleeping, measuring and the radio, averaged over the whole year. Every later design choice is measured against it.",
      },
      {
        kind: "explain",
        title: "A requirements list you can build from",
        body: P(
          "A good list for Sprout looks like this. Each line has a number, a unit, and an obvious test.",
          "- **R1 Battery life:** at least 12 months at one report every 15 minutes, at 20 °C, on one coin cell.\n- **R2 Parts cost:** under $9 at 1,000 units.\n- **R3 Size:** fits a 60 × 40 mm case.\n- **R4 Setup:** pairs with the phone app in under 60 seconds.\n- **R5 Environment:** works from 0 to 40 °C.",
          "Split the list into **must-haves** (the product fails without them) and **nice-to-haves** (cut these first when something has to give). Then write down *how* each one will be tested. If you cannot say how you would test a requirement, it is still a wish.",
          "Notice what the list leaves out: *how* to build it. Requirements say **what** the product must do. Choosing the chip, the battery and the radio is the next lesson.",
        ),
      },
      {
        kind: "question",
        title: "Put the first steps in order",
        body: "Order the steps from a vague idea to a requirements list the team can build from.",
        question: {
          type: "order", hint: "Start with the people, end with the check that proves you did what you wrote.",
          items: [
            "Talk to users and write down what they wish for",
            "Turn each wish into a number with a unit",
            "Mark what is a must-have and what is nice-to-have",
            "Write down how each requirement will be tested",
          ],
        },
        explanation: "You cannot put a number on a wish you have not heard, and you cannot decide what to cut until every wish has a number. The test comes last because it depends on the final wording, and writing it often shows a requirement is still too vague.",
      },
      {
        kind: "code",
        title: "A crude requirement checker",
        body: P(
          "Write `is_measurable(requirement)`. It takes a sentence and returns `True` when it has **a number and a unit** (months, mm, %, $, and so on), and `False` otherwise.",
          "This is a crude keyword rule, not real understanding. It can be fooled, and a human still has to read each requirement. But it catches the lazy ones. A `UNITS` set is given; split the text into words, then check each word.",
        ),
        language: "python",
        starter: `UNITS = {"month", "months", "year", "years", "day", "days", "hour", "hours", "minute", "minutes",
         "second", "seconds", "s", "ms", "mm", "cm", "m", "g", "kg", "%", "$", "ma", "ua", "mah",
         "v", "°c", "steps", "taps"}

def is_measurable(requirement):
    # True when the text has a number AND a unit word
    return False
`,
        solution: `UNITS = {"month", "months", "year", "years", "day", "days", "hour", "hours", "minute", "minutes",
         "second", "seconds", "s", "ms", "mm", "cm", "m", "g", "kg", "%", "$", "ma", "ua", "mah",
         "v", "°c", "steps", "taps"}

def is_measurable(requirement):
    words = requirement.lower().replace("(", " ").replace(")", " ").replace(",", " ").split()
    has_number = any(any(ch.isdigit() for ch in w) for w in words)
    has_unit = False
    for w in words:
        unit = "".join(ch for ch in w if not (ch.isdigit() or ch in ".-"))
        if unit in UNITS:
            has_unit = True
    return has_number and has_unit
`,
        tests: [
          { id: "battery", description: "Battery requirement with a number and unit passes; a vague one fails", assertionCode: `assert is_measurable("Battery lasts at least 12 months") is True, "12 months has a number and a unit"\nassert is_measurable("Battery life should be good") is False, "good is an opinion, not a number"` },
          { id: "cost", description: "A cost with $ passes; a comparison fails", assertionCode: `assert is_measurable("Costs under $25") is True, "$25 is a number with a unit"\nassert is_measurable("Cheaper than the competition") is False, "no number to test against"` },
          { id: "temp", description: "A temperature range passes; 'outdoor conditions' fails", assertionCode: `assert is_measurable("Works from 0 to 40 °C") is True, "0 to 40 °C has numbers and a unit"\nassert is_measurable("Handles outdoor conditions") is False, "outdoor conditions is vague"` },
          { id: "size", description: "Size in mm passes; a bare number without a unit fails", assertionCode: `assert is_measurable("Fits in a 60 x 40 mm case") is True, "60 x 40 mm has a unit"\nassert is_measurable("Pairs in 60") is False, "60 what? no unit"\nassert is_measurable("Compact design") is False, "compact has no number"` },
        ],
        hints: ["Split with `.split()`, then test each word. For the number: does any character satisfy `.isdigit()`?", "To get the unit, drop digits, dots and dashes from a word (so `12-month` becomes `month`, `$25` becomes `$`), then check it is in `UNITS`."],
      },
      {
        kind: "recap",
        points: [
          "A **wish** cannot be tested; a **requirement** has a number, a unit and a way to check it.",
          "Cost, size, power and battery life are **constraints** that pull against each other, so write them down early.",
          "Battery life = usable capacity ÷ **average current**, and a small current that never stops (sleep) can cost more than a big one that is rare (the radio).",
          "Split requirements into must-haves and nice-to-haves, and say what each one *is*, not how to build it.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Architecture and parts ───────────────────────────────
  {
    id: "fnd-prod-2-architecture",
    title: "Architecture and parts",
    summary: "Draw Sprout's block diagram, choose between a pre-certified radio module and a chip-down design, and see what the parts really cost.",
    level: "Beginner",
    minutes: 9,
    xp: 45,
    steps: [
      {
        kind: "explain",
        title: "Boxes first",
        body: P(
          "With requirements in hand you can design. Start with a **block diagram**: boxes for the main jobs and arrows for what flows between them. No chip names yet. For Sprout: **sensors** feed a **brain** (a microcontroller, the chip you will meet in *Programming chips: firmware, MCUs and SoCs*), which talks over a **radio** to the phone. A **power** block feeds everything.",
          "The block diagram is where big decisions are made cheaply. Changing a box on paper costs nothing; changing it after boards are built costs weeks.",
          "Below is Sprout's diagram with real choices attached to each box. Click through the options and watch the parts cost, the certification note and the battery life change. The prices are made up, but the trade-offs are real.",
        ),
        widget: { type: "prod-architecture", props: {} },
      },
      {
        kind: "question",
        title: "Hit every requirement",
        body: "From the last lesson: parts under **$9 at 1,000 units**, battery life of at least **12 months**, and no bare metal prongs in the soil. You also want a **pre-certified** radio so you skip radio testing. Build a Sprout that meets all of it.",
        widget: { type: "prod-architecture", props: {} },
        question: { type: "widget", goal: { maxBom1k: 9, preCertified: true, minMonths: 12, sensor: "cap" }, hint: "Wi-Fi drains a coin cell fast, 2 × AA costs more than the budget allows, and the chip-down radio is not pre-certified. Look at the 'Parts at 1,000 units' number." },
        explanation: "Only a pre-certified BLE module, a capacitive sensor and a coin cell fit: about $8.85 and roughly 21 months in this toy model. Notice how one requirement ruled out each tempting option: cost ruled out 2 × AA, battery life ruled out Wi-Fi, and 'pre-certified' ruled out the cheapest chip. Architecture is choosing among trade-offs, not picking the best part.",
      },
      {
        kind: "explain",
        title: "Make or buy the radio",
        body: P(
          "A radio module is a small board with the MCU, radio and antenna already designed, tested and approved by the maker. You buy it and solder it down. The alternative is **chip-down**: you buy the bare chip and design the antenna, the matching network and the board layout yourself.",
          "Chip-down parts are cheaper per unit. But the design is harder (radio layout is its own art), and you pay a **one-time cost** to certify it (more in the certification lesson). That is an old trade-off: **a lower unit cost against a higher up-front cost**.",
          "Which wins depends on volume. At 1,000 units a month the module is usually right. At millions of units the saving per unit adds up and chip-down becomes worth it.",
        ),
      },
      {
        kind: "question",
        title: "The break-even point",
        body: P(
          "In the widget, the chip-down radio side of Sprout costs **$2.70 less** per unit than the module at 1,000 units ($4.80 module, $2.10 chip-down).",
          "Suppose going chip-down adds **$27,000** of one-time work (radio layout, tuning and certification; a made-up figure). How many units must you sell before chip-down is cheaper overall?",
        ),
        question: { type: "number", hint: "Divide the one-time cost by the saving on each unit.", answer: 10000, tolerance: 100, unit: "units" },
        explanation: "Break-even = one-time cost ÷ saving per unit = $27,000 ÷ $2.70 = **10,000 units**. Below that, the module wins even though each one costs more. This is why startups buy modules and high-volume products often design their own radio.",
      },
      {
        kind: "question",
        title: "Choosing the MCU",
        body: "Chips come in thousands of varieties. For a coin-cell sensor that talks Bluetooth, which property should you look at **first**?",
        question: {
          type: "choice",
          options: ["The highest clock speed", "Sleep current and built-in Bluetooth support", "The largest number of pins", "The most RAM"],
          answer: 1,
          hint: "Go back to the requirements. What limits Sprout the most: raw speed, or how little power it uses while waiting?",
          feedback: {
            0: "Sprout reads two sensors every 15 minutes. It does not need speed, and a faster chip usually burns more power.",
            2: "Sprout needs a handful of pins. Extra pins cost money and do not help a battery product.",
            3: "A small program and a few readings fit in a small RAM. More RAM does not help the requirement that matters here.",
          },
        },
        explanation: "Choose by the requirement that bites hardest. For Sprout it is battery life, so sleep current dominates. Other checks come after: the peripherals you need (I²C for the sensors, ADC), memory big enough with room to grow, good tools, **long-term supply** (can you still buy it in five years?) and whether a second supplier makes something pin-compatible.",
      },
      {
        kind: "explain",
        title: "The bill of materials",
        body: P(
          "The **BOM** (bill of materials) lists every part on the product with quantity and price. Prices depend on **how many you buy**: distributors sell at **price breaks**, for example $5.00 each for one, $4.00 for 1,000 and $3.50 for 10,000. The total BOM is the sum of count × unit price for each part.",
          "A subtle point: the price break depends on the number of *parts* you buy, not the number of products. A product with two of a part needs twice as many to reach the same break.",
          "And a warning: the BOM is **not** the product cost. Assembly, testing, the case, packaging, shipping, support and the margin of every company on the way are extra. The shelf price is often several times the parts cost.",
        ),
      },
      {
        kind: "code",
        title: "Cost a BOM at a quantity",
        body: P(
          "Write `bom_cost(parts, qty)`. `parts` is a list of `(count, breaks)` pairs. `count` is how many of that part each product has, and `breaks` is a list of `(min_quantity, unit_price)` in ascending order.",
          "For each part you buy `count × qty` pieces, and the price is the one for the **largest** `min_quantity` that you reach. Return the total for one product, rounded to 2 decimals.",
        ),
        language: "python",
        starter: `def bom_cost(parts, qty):
    # total cost of one product when building qty products
    return 0.0
`,
        solution: `def bom_cost(parts, qty):
    total = 0.0
    for count, breaks in parts:
        need = count * qty
        price = breaks[0][1]
        for min_qty, p in breaks:
            if need >= min_qty:
                price = p
        total += count * price
    return round(total, 2)
`,
        tests: [
          { id: "k", description: "At 1,000 products: 4.00 + 2 × 0.08", assertionCode: `parts = [(1, [(1, 5.0), (1000, 4.0), (10000, 3.5)]), (2, [(1, 0.10), (1000, 0.08)])]\nassert bom_cost(parts, 1000) == 4.16, f"expected 4.16, got {bom_cost(parts, 1000)}"` },
          { id: "tenk", description: "At 10,000 products both parts reach better breaks", assertionCode: `parts = [(1, [(1, 5.0), (1000, 4.0), (10000, 3.5)]), (2, [(1, 0.10), (1000, 0.08)])]\nassert bom_cost(parts, 10000) == 3.66, f"expected 3.66, got {bom_cost(parts, 10000)}"` },
          { id: "few", description: "Ten products reach no break at all", assertionCode: `parts = [(1, [(1, 5.0), (1000, 4.0), (10000, 3.5)]), (2, [(1, 0.10), (1000, 0.08)])]\nassert bom_cost(parts, 10) == 5.2, f"expected 5.2, got {bom_cost(parts, 10)}"` },
          { id: "count", description: "At 500 products the part used twice reaches its 1,000 break, the other does not", assertionCode: `parts = [(1, [(1, 5.0), (1000, 4.0), (10000, 3.5)]), (2, [(1, 0.10), (1000, 0.08)])]\nassert bom_cost(parts, 500) == 5.16, f"expected 5.16, got {bom_cost(parts, 500)}"` },
        ],
        hints: ["For each part, `need = count * qty`. Then walk through the price breaks and keep the last price whose minimum you reach.", "Add `count * price` to a running total, and `round(total, 2)` at the end."],
      },
      {
        kind: "question",
        title: "When the chip disappears",
        body: "Your MCU goes out of stock for 40 weeks. Which earlier decision would have saved you the most pain?",
        question: {
          type: "choice",
          options: [
            "Buying a big pile of the chip at the lowest price break",
            "A faster clock speed so fewer chips are needed",
            "Making the case out of a different plastic",
            "A thin hardware abstraction layer in firmware and a pin-compatible alternative chip picked up front",
          ],
          answer: 3,
          hint: "Think about what you would have to rewrite if you had to switch, and whether the board could take a different part.",
          feedback: {
            0: "That helps with price, not with a shortage, and it ties up cash in stock for a part you may redesign anyway.",
            1: "Clock speed has no effect on whether the chip can be bought.",
            2: "The case is unrelated to the supply of the chip.",
          },
        },
        explanation: "Supply risk is part of architecture. Picking a part with a pin-compatible second source, and keeping the chip-specific code in a thin layer (the next-but-one lesson), means a shortage becomes a small change, not a redesign.",
      },
      {
        kind: "recap",
        points: [
          "Start with a **block diagram**: sensors, brain, radio, power. Cheap to change on paper, costly later.",
          "**Make vs buy**: a pre-certified module costs more per unit but saves design and certification work; chip-down saves per unit and costs up front. Break-even = one-time cost ÷ saving per unit.",
          "Choose parts by the requirement that bites hardest (for Sprout: sleep current), then check supply and tools.",
          "The **BOM** is the sum of count × price at the quantity's price break, and it is only part of what a product costs.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Prototyping ───────────────────────────────
  {
    id: "fnd-prod-3-prototyping",
    title: "Prototyping: prove the scary part first",
    summary: "Rank Sprout's risks, build the cheapest prototype that answers each one, and see the stages from breadboard to factory.",
    level: "Intermediate",
    minutes: 9,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "A prototype is a question you build",
        body: P(
          "A prototype is not a small version of the product. It is a **question you build to answer**. \"Do the moisture readings make sense?\" \"Does the radio reach the next room?\" Each prototype should answer one question, as cheaply as possible.",
          "The cheapest tools are **dev boards** (a ready-made board with an MCU, a programming port and header pins) and **breadboards** (a grid you push parts into without soldering). They are great for the first questions about software and sensors. They lie about others: a breadboard adds stray capacitance and long loose wires, and a dev board's power supply is nothing like a coin cell.",
          "The golden rule: **prove the riskiest thing first**, before you spend money on everything around it. Risk is how likely something is to go wrong *times* how much it hurts if you only find out late.",
        ),
      },
      {
        kind: "question",
        title: "Rank the risks",
        body: "Here are six risks for Sprout, with a likelihood and a cost-if-found-late (each out of 5). Use the arrows to put the risk to **prove first** at the top.",
        widget: { type: "prod-risk", props: {} },
        question: { type: "widget", goal: { correct: true }, hint: "Multiply likelihood by cost for each risk and sort from biggest to smallest. A risk that is likely *and* ruinous late goes first." },
        explanation: "Battery sag (4 × 5 = 20) is first: likely, and a wrong battery choice changes the board, the case and the firmware. Moisture drift (16) is next. The case colour is *very* likely to be disliked (5/5) but costs almost nothing to change late (5), so it goes near the bottom. Prototype where the risk and the cost of being wrong multiply.",
      },
      {
        kind: "question",
        title: "The cheapest answer",
        body: "You want to know: **does a cold coin cell survive Sprout's radio bursts?** Which prototype answers that most cheaply?",
        question: {
          type: "choice",
          options: [
            "A 3D-printed case in three colours",
            "A finished four-layer PCB design",
            "The phone app's pairing screen",
            "A dev board with a coin cell and an oscilloscope, put in a fridge",
          ],
          answer: 3,
          hint: "Which one tests the battery under real conditions, with the least build effort?",
          feedback: {
            0: "A case tells you about looks and fit. It does not tell you anything about the battery.",
            1: "A board is slow and expensive to make, and the question can be answered long before one exists.",
            2: "The app screen is about a different risk. This question is about the battery and power rail.",
          },
        },
        explanation: "A dev board that sends the same radio bursts, a real coin cell and a scope on the supply rail answers the question in an afternoon for almost nothing. If the rail dips too far, you learn the battery or the power design needs to change *before* the board exists.",
      },
      {
        kind: "explain",
        title: "From prototype to product: EVT, DVT, PVT",
        body: P(
          "Once the risky questions are answered, you design a **custom board** and move through build stages. Most hardware companies use the names **EVT, DVT and PVT**. They are common industry terms, but exact meanings and batch sizes **vary by company**, and some skip or add a stage.",
          "Each stage asks a bigger question and freezes more of the design. Click through the stages and see what each one means for Sprout, and how the freedom to change things shrinks.",
        ),
        widget: { type: "prod-stages", props: {} },
      },
      {
        kind: "question",
        title: "Who is being tested?",
        body: "Which stage is mainly about proving the **factory** can build the product well, repeatedly, on the real line with real fixtures?",
        widget: { type: "prod-stages", props: {}, live: true },
        question: { type: "choice", options: ["Prototype", "EVT", "PVT", "DVT"], answer: 2, hint: "The last stage before mass production is run on the production line itself.", feedback: { 0: "A prototype is one or a few boards built by hand. No factory is involved.", 1: "EVT asks whether the *design* works, using a small batch, often built by hand or by a prototype shop.", 3: "DVT asks whether the design meets the requirements and survives testing. The line comes after." } },
        explanation: "PVT, production validation, is the pilot run on the real line. It measures yield and proves the fixtures and process. EVT and DVT are mostly about whether the design is right; PVT is about whether the factory can make it right every time.",
      },
      {
        kind: "explain",
        title: "Design the first board to be debugged",
        body: P(
          "Your first custom board (Sprout Rev A, an EVT build) will have mistakes. Assume so, and design it so mistakes are **easy to find**:",
          "- **Test points** on every power rail and key signal, so a probe can touch them.\n- A **header or pads for the programmer** (see the bring-up lesson), so you can load code even if everything else is broken.\n- A **jumper or a 0 Ω resistor in series with the battery**, so you can remove it and put a meter in its place to measure current.\n- A debug **LED** and **spare pins** broken out for surprises.\n- Pads for parts you might need (an extra capacitor, a pull-up) that you leave unfilled until needed.",
          "These cost a few cents and some board area. They can save weeks. The *Components and PCB design* module covers how to put them on a board.",
        ),
      },
      {
        kind: "question",
        title: "What helps Rev A?",
        body: "Select **all** the things worth designing into the first board.",
        question: {
          type: "choice",
          options: [
            "A test point on every power rail",
            "A jumper in series with the battery for measuring current",
            "No programming header, to save board area",
            "A header or pads for the programmer",
            "Removing the debug LED to save a cent",
          ],
          answer: [0, 1, 3],
          hint: "Which choices make it easier to see what the board is doing, load code, and measure current?",
          feedback: {
            2: "Without a programming connection a single broken part can leave you unable to load firmware at all.",
            4: "A cent is nothing against the time you lose when you cannot tell if firmware is running.",
          },
        },
        explanation: "Rev A exists to learn things. Test points, a way to measure current and a programming header are cheap and turn 'it does not work' into 'it fails here'. You can leave them off a cost-reduced production board once you have learned what you needed.",
      },
      {
        kind: "question",
        title: "Order the stages",
        body: "Put the build stages in order, earliest first.",
        question: { type: "order", hint: "Think from one breadboard to thousands of boxes: each step is closer to the factory.", items: ["Prototype on dev boards", "EVT: first custom boards", "DVT: design validation", "PVT: pilot run on the factory line", "Mass production"] },
        explanation: "Each stage freezes more of the design and asks a bigger question: can it work, does our board work, does the design meet the requirements, can the factory build it, and can we keep shipping good units.",
      },
      {
        kind: "recap",
        points: [
          "A prototype is a **question you build**. Make each one as cheap as possible and answer the **riskiest** question first.",
          "Risk = **likelihood × cost if found late**. Dev boards and breadboards are great for software and sensors, but they lie about power and noise.",
          "**EVT, DVT and PVT** are common names for stages (does the board work, does it meet requirements, can the factory build it). Meanings vary by company.",
          "Design Rev A to be debugged: test points, a programming header and a way to measure current.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Firmware architecture ───────────────────────────────
  {
    id: "fnd-prod-4-firmware",
    title: "Firmware architecture",
    summary: "Layer Sprout's firmware so it can be tested on a laptop, run it as a state machine that sleeps, and see how logging and retry rules affect the battery.",
    level: "Intermediate",
    minutes: 10,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "Layers",
        body: P(
          "You wrote small pieces of firmware in *Programming chips: firmware, MCUs and SoCs*. A product has tens of thousands of lines, and it must survive changes: a new sensor, a different chip, a new feature. The way to survive is **layers**, with one simple rule: each layer calls only the one **below** it, through a small interface.",
          "For Sprout: the **application** (its own rules), **services** (logging, settings, Bluetooth), **drivers** (one per chip), a **HAL** (hardware abstraction layer: tiny functions like `i2c_read()`), and the **vendor SDK and registers** at the bottom. Click the layers, then try the other two views.",
        ),
        widget: { type: "prod-layers", props: {} },
      },
      {
        kind: "question",
        title: "Testing without hardware",
        body: "Sprout's light-sensor **driver** calls `hal_i2c_read()`. You want to test the driver's maths (turn raw bytes into a lux number) without a board. What do you do?",
        widget: { type: "prod-layers", props: { scenario: "host" }, live: true },
        question: {
          type: "choice",
          options: [
            "Buy a faster laptop that can run the chip's registers",
            "Skip the driver tests, since only a real chip counts",
            "Build the driver for the laptop with a fake HAL that returns scripted bytes",
            "Rewrite the driver without the HAL",
          ],
          answer: 2,
          hint: "The driver only talks to the layer below it through an interface. What if something else sat behind that interface?",
          feedback: {
            0: "A faster laptop does not have the chip's registers. The point is to avoid needing them.",
            1: "The driver's maths is exactly what you can test without a chip, and bugs found early cost the least.",
            3: "Removing the HAL would tie the driver to one chip, which is the opposite of what the layer is for.",
          },
        },
        explanation: "Because the driver only calls the HAL's interface, you can put a **fake HAL** behind it on the laptop. The test hands it bytes and checks the lux value. The layer boundary is what makes tests that run in milliseconds possible. Only the HAL and the SDK need the real chip.",
      },
      {
        kind: "explain",
        title: "Firmware as a state machine",
        body: P(
          "Sprout spends nearly all its time asleep and does the same few things every 15 minutes. That is naturally a **state machine** (you met these in *Digital logic from transistors*): the device is always in exactly one **state**, and an **event** moves it to the next. The states are **sleep → wake → measure → send → sleep**, plus a **back-off** state when the phone is out of range.",
          "State machines make firmware predictable: in each state you know exactly what is powered, what the device is allowed to do, and where it goes next. They also make battery use countable, since each state has a known current and duration. Press Step and watch the charge add up.",
        ),
        widget: { type: "prod-fsm", props: {} },
      },
      {
        kind: "question",
        title: "No phone, no worries",
        body: "Set the phone to **Out of range**, keep the retry limit at **3 tries**, and step until Sprout **gives up** and goes back to sleep with its reading stored.",
        widget: { type: "prod-fsm", props: {} },
        question: { type: "widget", goal: { gaveUp: true }, hint: "Choose 'Out of range', then press Step until the log says it gave up and the state returns to Sleep." },
        explanation: "After three failed sends it stops trying, stores the sample and sleeps. A device must always have a **way out** of a failing situation. Otherwise one missing phone can keep the radio on, drain the battery and trap the firmware in a loop. You will see that happen in the debugging lesson.",
      },
      {
        kind: "question",
        title: "What a retry costs",
        body: P(
          "One send attempt costs 9 mA × 0.3 s = **2.7 mA·s** of charge. If the phone is away and the retry limit is **10**, how much charge (mA·s) does the *send* state burn in one cycle?",
          "Ignore the tiny back-off current.",
        ),
        question: { type: "number", hint: "Each failed attempt costs the same charge. Multiply by the number of attempts.", answer: 27, tolerance: 0.5, unit: "mA·s" },
        explanation: "10 × 2.7 = **27 mA·s**. Compare that to about 10 mA·s for a whole normal cycle (mostly sleeping). A generous retry loop on a missing phone costs far more than everything else combined, and it repeats every 15 minutes. Retry limits and back-off are battery features.",
      },
      {
        kind: "explain",
        title: "Configuration, logging and testability",
        body: P(
          "Three habits make firmware shippable:",
          "- **Configuration.** Put values that might change (report interval, retry limit, sensor calibration) in one place, store them with a version number and **defaults**, and validate them when loading. A corrupted setting must not brick the device.\n- **Logging.** Print short, structured lines at levels (error, warn, info, debug) into a small **ring buffer** in RAM, and send it over the serial port or store it. Always log the **reset reason** at boot. Keep logging out of time-critical interrupt handlers, because printing is slow.\n- **Testability.** Pure logic in its own files with no hardware calls; hardware behind interfaces; assertions that fire loudly in test builds.",
          "Logging costs energy and flash. In a battery product you often turn the log level down in production, but keep errors and reset reasons.",
        ),
      },
      {
        kind: "question",
        title: "Why log the reset reason?",
        body: "Why does good firmware log **why it rebooted** every time it starts?",
        question: {
          type: "choice",
          options: [
            "Because it makes the boot faster",
            "Because the chip can only reboot if a reason is stored",
            "Because the phone app needs it to pair",
            "Because a reboot you cannot explain is the hardest bug to find, and the chip can usually tell you which cause fired",
          ],
          answer: 3,
          hint: "Think about a device in someone's flat that reboots at 3 a.m. How would you know why?",
          feedback: {
            0: "Logging takes a little time, not saves it.",
            1: "The chip reboots on its own. The log just records the cause for you.",
            2: "Pairing does not use the reset reason. It is for you, reading the device later.",
          },
        },
        explanation: "Most MCUs have a register that records whether the last reset came from power-up, a brown-out, the watchdog, software or a pin. Logging it at boot turns 'it sometimes restarts' into 'it restarts from the watchdog, in the send state'. You will use exactly that in the debugging lesson.",
      },
      {
        kind: "question",
        title: "Order one cycle",
        body: "Put the states of one **successful** Sprout cycle in order, starting from sleep.",
        question: { type: "order", hint: "Sleep → wake first, and sending comes after you have something to send.", items: ["Sleep", "Wake", "Measure", "Send", "Sleep again"] },
        explanation: "The device sleeps, a clock event wakes it, it measures while the sensors are powered, it sends, then goes straight back to sleep. Keeping the awake states short and in a fixed order is what keeps the average current small.",
      },
      {
        kind: "code",
        title: "Predict battery life from the duty cycle",
        body: P(
          "Write `battery_days(capacity_mah, sleep_ua, active_ma, active_s_per_hour)`. The device is **active** for `active_s_per_hour` seconds in each hour at `active_ma` milliamps, and **asleep** the rest of the time at `sleep_ua` microamps.",
          "Average current (mA) = `active_ma × active_fraction + (sleep_ua / 1000) × (1 − active_fraction)`, where `active_fraction = active_s_per_hour / 3600`. Return the life in **days**: `capacity ÷ average current ÷ 24`.",
        ),
        language: "python",
        starter: `def battery_days(capacity_mah, sleep_ua, active_ma, active_s_per_hour):
    # days the battery lasts for this duty cycle
    return 0
`,
        solution: `def battery_days(capacity_mah, sleep_ua, active_ma, active_s_per_hour):
    active_fraction = active_s_per_hour / 3600
    avg_ma = active_ma * active_fraction + (sleep_ua / 1000) * (1 - active_fraction)
    return capacity_mah / avg_ma / 24
`,
        tests: [
          { id: "active", description: "200 mAh, no sleep current, 10 mA for 36 s each hour: average 0.1 mA, 83.3 days", assertionCode: `d = battery_days(200, 0, 10, 36)\nassert abs(d - 83.33) < 0.05, f"expected about 83.33 days, got {d}"` },
          { id: "sleep", description: "Always asleep at 100 µA on 1,000 mAh: 416.7 days", assertionCode: `d = battery_days(1000, 100, 0, 0)\nassert abs(d - 416.67) < 0.05, f"expected about 416.67 days, got {d}"` },
          { id: "sprout", description: "180 mAh, 8 µA sleep, 10 mA for 12 s each hour: about 181.6 days", assertionCode: `d = battery_days(180, 8, 10, 12)\nassert abs(d - 181.57) < 0.1, f"expected about 181.57 days, got {d}"` },
          { id: "more", description: "More active time per hour means fewer days", assertionCode: `a = battery_days(180, 8, 10, 12)\nb = battery_days(180, 8, 10, 48)\nassert a > b > 0, f"4x the active time should cut the life, got {a} and {b}"` },
        ],
        hints: ["First turn the active seconds into a fraction of an hour: `active_s_per_hour / 3600`.", "Add the two currents in mA (remember to divide `sleep_ua` by 1000), then divide the capacity by the average and by 24."],
      },
      {
        kind: "recap",
        points: [
          "Layer the firmware (**application, services, drivers, HAL, SDK**) and let each layer call only the one below through an interface.",
          "A **fake HAL** lets the upper layers run and be tested on a laptop; only the HAL and SDK need the real chip, and they are what changes when you switch chips.",
          "Model the device as a **state machine** with known current per state; always give failing states a **way out** (retry limits and back-off).",
          "Store versioned **configuration** with defaults, log levels and the **reset reason**, and keep logic free of hardware calls.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 5. Bring-up ───────────────────────────────
  {
    id: "fnd-prod-5-bringup",
    title: "Bring-up: the first power-on",
    summary: "Power a new board for the first time safely with a current-limited supply, then find a short, a wrong regulator voltage and a dead clock.",
    level: "Intermediate",
    minutes: 9,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "The riskiest ten seconds",
        body: P(
          "Rev A boards arrive. **Bring-up** is the work of getting a brand-new board from \"unpowered\" to \"running blinking firmware\", one careful step at a time. The very first power-on is the riskiest moment: a single solder bridge or a backwards part can destroy chips in a heartbeat.",
          "The method is to check what you can *without* power, then apply power gently, then check each layer: **rails** (the supply voltages), **clock**, **programming**, then peripherals one by one.",
          "**Safety.** Use a low-voltage bench supply or batteries only, never mains. Do not power a board with a lithium cell you have not protected, and if anything gets hot or smells, power off first and think second.",
        ),
      },
      {
        kind: "question",
        title: "A careful order",
        body: "Put the bring-up steps in a sensible order.",
        question: {
          type: "order", hint: "Anything you can check with the power off comes before powering on.",
          items: [
            "Inspect the board under magnification",
            "Check the resistance from each rail to ground, power off",
            "Power on from a current-limited supply",
            "Check each rail's voltage and the supply current",
            "Connect the debugger and load a blink program",
            "Test each peripheral on its own",
          ],
        },
        explanation: "Each step is cheaper and safer than the next. Eyes and a meter find solder bridges and shorts before power does. A current limit stops a fault from becoming a fire. Voltages come before firmware because code cannot run on a wrong rail, and one peripheral at a time keeps a failure traceable.",
      },
      {
        kind: "explain",
        title: "The bench",
        body: P(
          "A **bench supply** lets you set a voltage *and a current limit*. If the board tries to draw more than the limit, the supply drops its voltage instead (called **constant-current mode**, shown as CC), and the board is protected. This is the same idea as the fuses and short circuits in *Sources and real-world limits*.",
          "Below are two mystery boards. Set a limit, power on, read the supply's display, then probe. Use the resistance probes **with the power off** and the voltage, scope and debugger probes **with it on**. A board that behaves badly may show you the problem in the very first reading.",
        ),
        widget: { type: "prod-bringup", props: { boards: ["good", "short"] } },
      },
      {
        kind: "question",
        title: "Find the short",
        body: "One board is healthy and one has a **short** on its 3.3 V rail. Find the board with the short and submit the right diagnosis. Start with a low current limit.",
        widget: { type: "prod-bringup", props: { boards: ["good", "short"] } },
        question: { type: "widget", goal: { solved: ["short"] }, hint: "Power on with a low limit. A board in current limit with its voltage collapsed is a strong clue; confirm it with the resistance probe after powering off." },
        explanation: "A short makes the supply hit its limit: the voltage collapses to a few millivolts and the current sits at the limit. The resistance from rail to ground (a fraction of an ohm) confirms it. Without a limit, the same short would try to pull amps and cook the board.",
      },
      {
        kind: "question",
        title: "Choosing the limit",
        body: "You expect a healthy Sprout board to draw about **3 mA** when running. What current limit should you set for the very first power-on?",
        question: {
          type: "choice",
          options: ["No limit, so you can see the true current", "Something modest, such as 10 to 20 mA: above normal, far below damaging", "1 A, in case the board needs a lot", "Whatever the supply was last set to"],
          answer: 1,
          hint: "You want enough headroom that a healthy board is not limited, but low enough that a fault cannot do damage.",
          feedback: {
            0: "The supply shows the current anyway. With no limit you are betting nothing is wrong.",
            2: "1 A is hundreds of times what the board should draw. A short could dump watts into a tiny spot.",
            3: "The previous setting could be anything, and it was set for a different board.",
          },
        },
        explanation: "A limit a few times above the expected current lets a good board run and stops a faulty one from burning. You can always raise the limit once you have seen how the board behaves.",
      },
      {
        kind: "question",
        title: "A rail at the wrong voltage",
        body: P(
          "Sprout's 3.3 V rail comes from an adjustable regulator. Two resistors set the output: **Vout = 0.8 V × (1 + R1 / R2)**. (0.8 V is a typical reference; check the datasheet. This is the voltage divider from *The voltage divider and loading*, used in feedback.)",
          "Find the board whose rail is wrong, and diagnose it. Read the resistor values with power off, then work out what they make.",
        ),
        widget: { type: "prod-bringup", props: { boards: ["wrongreg", "good"] } },
        question: { type: "widget", goal: { solved: ["wrongreg"] }, hint: "Measure the 3V3 rail. Then read R1 and R2 (power off) and put them in the formula." },
        explanation: "R1 and R2 were both 100 kΩ, so Vout = 0.8 × (1 + 1) = 1.6 V instead of 3.3 V. The MCU's minimum supply is typically around 1.8 V, so it does not start reliably. Always check rail voltages before blaming the firmware.",
      },
      {
        kind: "question",
        title: "Choosing R1",
        body: "To make **3.3 V** with R2 = **100 kΩ** and a 0.8 V reference, what should **R1** be, in kilohms? (Pick the nearest standard value afterwards.)",
        question: { type: "number", hint: "Rearrange the formula for R1: first divide Vout by Vref, then subtract 1, then multiply by R2.", answer: 312.5, tolerance: 5, unit: "kΩ" },
        explanation: "Rearrange Vout = Vref × (1 + R1/R2): R1 = R2 × (Vout / Vref − 1) = 100 kΩ × (3.3 / 0.8 − 1) = 100 kΩ × 3.125 = **312.5 kΩ**. The nearest standard 1% value is 316 kΩ, which gives 3.33 V.",
      },
      {
        kind: "question",
        title: "A silent chip",
        body: "This board has good rails and a sensible current, yet the firmware never runs. Find out why. (A clue: what does the chip need before it can execute anything?)",
        widget: { type: "prod-bringup", props: { boards: ["noclock", "good"] } },
        question: { type: "widget", goal: { solved: ["noclock"] }, hint: "Probe the crystal on the scope and try connecting the debugger. Compare with the healthy board." },
        explanation: "The crystal pin is a flat line: it never starts oscillating (a missing part, wrong load capacitors, or a bad joint are common causes). No clock means no instructions. Rails first, then the clock, then programming: that is the order in which a chip comes alive.",
      },
      {
        kind: "recap",
        points: [
          "Check what you can with power **off** (look, resistance rail-to-ground), then power on through a **current-limited** supply.",
          "A supply in **current limit** with its voltage collapsed points to a short; an expected voltage comes from the regulator's feedback resistors, **Vout = Vref × (1 + R1/R2)**.",
          "Bring a chip alive in layers: **rails, clock, programming, peripherals**, one at a time.",
          "Keep low-voltage and safe: never mains, protect lithium cells, power off when something smells or heats.",
        ],
      },
    ],
  },
];
