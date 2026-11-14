import type { ConceptLesson } from "../../learn/types.ts";

/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 1 to 4 of "Electronics from zero: circuits": what electricity is, Ohm's law, power and heat, series and parallel. */
export const circuitsLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. What electricity is ───────────────────────────────
  {
    id: "fnd-circ-1-what-is-electricity",
    title: "What electricity is",
    summary: "Charge, current and voltage in plain words: a loop, a push, a flow, and a water picture that helps (and where it stops helping).",
    level: "Beginner",
    minutes: 8,
    xp: 40,
    steps: [
      {
        kind: "explain",
        title: "A loop with a gap",
        body: P(
          "Think of a torch (a flashlight). Inside are a battery, a switch and a bulb, joined in a ring. Press the switch and the bulb lights up. Let go and it goes dark. Nothing about the parts changed. Only the ring went from **open** (it has a gap) to **closed** (it is complete).",
          "That ring is a **circuit**. Every phone, game console and satellite is made of circuits too, just with billions more parts. In the Bits lessons (*Everything is on or off*) you met switches that make ones and zeros. Now you will look at the thing that flows through them.",
          "Try it. Close the switch, then drag the battery voltage up and down.",
        ),
        widget: { type: "circ-water", props: {} },
      },
      {
        kind: "question",
        title: "Light it up",
        body: "Close the switch and set the battery to **at least 3 V** so that current is flowing.",
        widget: { type: "circ-water", props: {} },
        question: { type: "widget", goal: { flowing: true, minPush: 3 }, hint: "Two things must be true at once: the loop is complete, and the battery pushes." },
        explanation: "Current only flows when there is a complete loop **and** something pushing. An open switch is a gap, so nothing moves anywhere in the loop, not even in the parts next to the battery.",
      },
      {
        kind: "explain",
        title: "Charge, current and voltage",
        body: P(
          "Everything is made of tiny particles, and some carry an electrical property called **charge**. Electrons carry a little negative charge. In a metal wire, lots of electrons are free to wander.",
          "- **Current** is a flow of charge: how much passes a point each second. We measure it in **amps** (A).\n- **Voltage** is the push that makes the charge flow: how much energy the battery gives each bit of charge. We measure it in **volts** (V).",
          "A water picture helps. The battery is a **pump**, the wire is a **pipe**, the flow of water is the current, and the pressure the pump makes is the voltage. A narrow pipe that makes the water struggle is like a lamp. Switch to the water view and play.",
        ),
        widget: { type: "circ-water", props: { view: "water" } },
      },
      {
        kind: "question",
        title: "Which part is voltage?",
        body: "In the water picture, what plays the part of **voltage**?",
        question: {
          type: "choice",
          options: ["The water flowing past a point", "The pressure the pump creates", "The width of the pipe", "The length of the pipe"],
          answer: 1,
          hint: "Voltage is the push. Which part of the water picture pushes?",
          feedback: {
            0: "That is the flow, which matches current. Voltage is what makes it flow.",
            2: "Pipe width is about how easily water flows, which comes later as resistance.",
            3: "Length matters a bit for a real pipe, but it is not the push. The pump's pressure is.",
          },
        },
        explanation: "The pump's **pressure** is the voltage: a push that exists even before any water moves. The flow of water is the current. You can have voltage without current (a closed tap) but not the other way round.",
      },
      {
        kind: "explain",
        title: "Where the water picture breaks",
        body: P(
          "Analogies are scaffolding. Use them, then know where they stop.",
          "- **Nothing leaks.** Cut a pipe and water pours out. Cut a wire and nothing spills: the current simply stops.\n- **Charge is not used up.** The same charge goes round and round. What the lamp takes from it is **energy**, which comes out as light and heat.\n- **Fast push, slow electrons.** In a typical wire the electrons drift along at about a millimetre a second or less, yet the lamp lights at once, because the push travels through the whole wire almost instantly, like a long tube already full of marbles.\n- **Direction.** By an old convention, current is drawn flowing from the **+** side to the **−** side. Electrons in a metal actually move the other way. The maths works the same whichever you pick, so we keep the convention.",
        ),
      },
      {
        kind: "question",
        title: "What did the lamp use?",
        body: "The lamp has been glowing for an hour. What has it used up?",
        question: {
          type: "choice",
          options: ["Some of the charge", "The wire", "Energy that the battery gave to the charge", "Some of the current"],
          answer: 2,
          hint: "Light and heat leave the lamp. What is it that carries them?",
          feedback: {
            0: "The charge goes all the way round and back to the battery. None of it disappears.",
            1: "The wire is only the path. It is not consumed.",
            3: "Current is a rate of flow, and the same amount enters and leaves the lamp.",
          },
        },
        explanation: "The charge comes back out of the lamp as it went in; what it gave up is **energy**. The battery gives the charge energy, the lamp turns it into light and heat. When the battery has no more energy to give, the push fades and the lamp dims.",
      },
      {
        kind: "explain",
        title: "Amps, volts and staying safe",
        body: P(
          "One **amp** means one **coulomb** of charge passing each second (a coulomb is about 6.24 × 10¹⁸ electrons' worth of charge, a huge crowd). One **volt** means one **joule** of energy given to each coulomb.",
          "Some typical values: a AA cell is 1.5 V, a USB port 5 V, a car battery about 12 V. The wall socket is 120 V to 240 V depending on the country.",
          "**Safety.** Small batteries and low-voltage supplies are fine to play with. **Mains electricity can kill.** Never open mains equipment or work on a mains circuit while learning. Everything in these lessons uses batteries or low-voltage supplies.",
        ),
      },
      {
        kind: "question",
        title: "Counting charge",
        body: "A steady current of **2 A** flows for **5 seconds**. How many coulombs of charge pass through the wire?",
        question: { type: "number", answer: 10, tolerance: 0.01, unit: "C", hint: "An amp is one coulomb per second. Multiply the rate by the time." },
        explanation: "2 coulombs per second for 5 seconds is 2 × 5 = **10 coulombs**. Current = charge ÷ time, so charge = current × time.",
      },
      {
        kind: "question",
        title: "Round and round",
        body: "Put the story of one trip round a torch circuit in order.",
        question: {
          type: "order",
          items: ["The battery pushes the charge", "The charge flows along the wire", "The lamp turns energy into light and heat", "The charge returns to the battery to be pushed again"],
          hint: "It is a loop: the story ends where it began.",
        },
        explanation: "The loop is the whole idea: the battery **gives** energy, the lamp **spends** it, and the charge carries it round and arrives back for more.",
      },
      {
        kind: "recap",
        points: [
          "A **circuit** is a loop. Break it anywhere and the current stops everywhere.",
          "**Current** (amps) is how much charge flows each second. **Voltage** (volts) is the push that makes it flow.",
          "The water picture is helpful but wrong in places: charge is not used up, and cut wires do not leak.",
          "The lamp takes **energy** from the charge, not the charge itself.",
          "Never experiment with mains electricity. Batteries and low-voltage supplies only.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Ohm's law ───────────────────────────────
  {
    id: "fnd-circ-2-ohms-law",
    title: "Ohm's law",
    summary: "V = I × R in a live circuit: change the push or the resistance and watch the current follow.",
    level: "Beginner",
    minutes: 9,
    xp: 45,
    steps: [
      {
        kind: "explain",
        title: "Three numbers, one rule",
        body: P(
          "Last lesson you met voltage (the push) and current (the flow). There is a third character: **resistance**, which says how hard a part makes it for current to get through. It is measured in **ohms** (symbol **Ω**, the Greek letter omega). A narrow pipe is a high resistance. A wide pipe is a low one.",
          "In 1827 Georg Ohm found how the three numbers fit together, in the most useful sentence in electronics:",
          "**V = I × R**\n\n(voltage in volts = current in amps × resistance in ohms)",
          "Here is a battery and a resistor. Drag the sliders and watch the current.",
        ),
        widget: { type: "circ-ohm", props: { v: 6, r: 100 } },
      },
      {
        kind: "question",
        title: "Aim for 30 milliamps",
        body: "Set the battery and the resistor so the current is **between 29 and 31 mA**. (A milliamp, mA, is a thousandth of an amp.)",
        widget: { type: "circ-ohm", props: { v: 6, r: 100 } },
        question: { type: "widget", goal: { iMin: 0.029, iMax: 0.031 }, hint: "The current is V ÷ R. Try a voltage and a resistance whose ratio is about 1 ÷ 33." },
        explanation: "For example 3 V across 100 Ω gives 3 ÷ 100 = 0.03 A = 30 mA. Many pairs give the same current: doubling the voltage and the resistance together changes nothing.",
      },
      {
        kind: "explain",
        title: "Seeing current as light",
        body: P(
          "Now a lamp joins the loop, with the resistor acting as a **dimmer**. The lamp here is a toy: 50 Ω, full brightness at 0.6 W.",
          "Notice two rules. **More voltage, more current**: doubling V doubles I. **More resistance, less current**: doubling R halves I. The current always follows the push and fights the resistance.",
          "The dimmer and the lamp are in series, so the loop's total resistance is R + 50 Ω. Slide R down and the lamp brightens.",
        ),
        widget: { type: "circ-ohm", props: { withLamp: true, v: 9, r: 100 } },
      },
      {
        kind: "question",
        title: "Do the sum",
        body: "A 12 V battery is connected across a 480 Ω resistor. What current flows, in milliamps?",
        question: { type: "number", answer: 25, tolerance: 0.1, unit: "mA", hint: "Use I = V ÷ R, then convert amps to milliamps by multiplying by 1000." },
        explanation: "I = V ÷ R = 12 ÷ 480 = 0.025 A = **25 mA**. A useful shortcut: volts ÷ kilohms gives milliamps, and 12 ÷ 0.48 = 25.",
      },
      {
        kind: "question",
        title: "Double the resistance",
        body: "The battery stays the same, but you swap the resistor for one with **twice the resistance**. What happens to the current?",
        question: {
          type: "choice",
          options: ["It doubles", "It halves", "It stays the same", "It drops to zero"],
          answer: 1,
          hint: "I = V ÷ R. If the bottom of a fraction doubles, what happens to the answer?",
          feedback: {
            0: "That would be halving the resistance. More resistance fights the current.",
            2: "The push is the same but the path is harder, so the current changes.",
            3: "A bigger resistor still lets some current through, just less of it.",
          },
        },
        explanation: "I = V ÷ R, so doubling R halves I. This is why the resistor in the lamp circuit works as a dimmer: more resistance, less current, less light.",
      },
      {
        kind: "question",
        title: "Dim, but not out",
        body: "The battery is stuck at 9 V. Use the dimmer to make the lamp **glow dimly but not go out**.",
        widget: { type: "circ-ohm", props: { withLamp: true, v: 9, r: 100, lockV: true } },
        question: { type: "widget", goal: { brightMin: 0.01, brightMax: 0.25 }, hint: "A bigger dimmer resistor means less current. Go up in steps until the lamp is faint." },
        explanation: "A bigger resistor means less current and so less power in the lamp. A pushbutton on a toy and the knob on an old dimmer do just this, though real dimmers waste less heat using cleverer tricks.",
      },
      {
        kind: "explain",
        title: "Turning the rule around",
        body: P(
          "Ohm's law has three forms, and you pick the one that has the unknown on its own:\n\n- **I = V ÷ R** (find the current)\n- **R = V ÷ I** (find the resistance)\n- **V = I × R** (find the voltage)",
          "Real values often need prefixes. **1 mA = 0.001 A** and **1 kΩ = 1000 Ω**. A handy trick: **volts ÷ kΩ = mA**. So 9 V across 3 kΩ is 3 mA.",
          "If the numbers do not fit the formula, first check the units. Most beginner mistakes are a forgotten milli or kilo.",
        ),
      },
      {
        kind: "question",
        title: "Find the resistance",
        body: "A 5 V supply drives **20 mA** through a part. What is the part's resistance, in ohms?",
        question: { type: "number", answer: 250, tolerance: 0.5, unit: "Ω", hint: "Use R = V ÷ I, and turn 20 mA into amps first." },
        explanation: "R = V ÷ I = 5 ÷ 0.02 = **250 Ω**. Working in amps (0.02 A, not 20) is what keeps the answer in ohms.",
      },
      {
        kind: "code",
        title: "Ohm's law in code",
        body: P(
          "Write `current(v, r)` that returns the current in **amps** for a voltage `v` (volts) and a resistance `r` (ohms).",
          "It is one line of Python. The results are decimals, so the tests allow a tiny rounding error.",
        ),
        language: "python",
        starter: `def current(v, r):
    # return the current in amps
    return 0
`,
        solution: `def current(v, r):
    return v / r
`,
        tests: [
          { id: "basic", description: "12 V across 480 ohms gives 0.025 A", assertionCode: `assert abs(current(12, 480) - 0.025) < 1e-9, f"12 V / 480 ohms should be 0.025 A, got {current(12, 480)}"` },
          { id: "unit", description: "5 V across 1000 ohms gives 0.005 A", assertionCode: `assert abs(current(5, 1000) - 0.005) < 1e-9, f"5 V / 1000 ohms should be 0.005 A, got {current(5, 1000)}"` },
          { id: "big", description: "9 V across 3 ohms gives 3 A", assertionCode: `assert abs(current(9, 3) - 3) < 1e-9, f"9 V / 3 ohms should be 3 A, got {current(9, 3)}"` },
        ],
        hints: ["I = V ÷ R. In Python, / divides.", "Return the result with `return v / r`."],
      },
      {
        kind: "recap",
        points: [
          "**Resistance** (ohms, Ω) is how hard a part makes it for current to flow.",
          "**V = I × R**, and the other two forms: **I = V ÷ R** and **R = V ÷ I**.",
          "More voltage means more current; more resistance means less current.",
          "Watch the prefixes: **mA** is a thousandth of an amp, **kΩ** is a thousand ohms. Volts ÷ kΩ = mA.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Power and heat ───────────────────────────────
  {
    id: "fnd-circ-3-power-heat",
    title: "Power and heat",
    summary: "P = V × I, why resistors get hot, what a power rating means, and how mAh and Wh tell you how long a battery lasts.",
    level: "Beginner",
    minutes: 9,
    xp: 45,
    steps: [
      {
        kind: "explain",
        title: "How fast energy is used",
        body: P(
          "Last time you saw that a lamp turns the charge's energy into light and heat. How *fast* it does that is called **power**, and it is measured in **watts** (W). One watt is one joule of energy every second.",
          "Power is easy to find. The battery gives each coulomb V joules, and I coulombs pass each second, so:",
          "**P = V × I**\n\n(watts = volts × amps)",
          "A 9 V battery driving 0.1 A is delivering 0.9 W. Now play with a resistor and watch how much power it has to deal with. This little resistor is rated at a quarter of a watt.",
        ),
        widget: { type: "circ-power", props: { rating: 0.25, v: 5, r: 220 } },
      },
      {
        kind: "question",
        title: "Do the sum",
        body: "A part has **5 V** across it and **40 mA** flowing through it. How much power is it using, in watts?",
        question: { type: "number", answer: 0.2, tolerance: 0.001, unit: "W", hint: "P = V × I, but make sure the current is in amps, not milliamps." },
        explanation: "40 mA = 0.04 A, so P = 5 × 0.04 = **0.2 W**. If you wrongly used 40, you would get 200, a thousand times too much, which is why the units matter.",
      },
      {
        kind: "explain",
        title: "Resistors turn power into heat",
        body: P(
          "A plain resistor does not light up or spin. Every watt it takes goes into **heat**. That is fine until the heat comes in faster than the part can shed it. Then it gets hot enough to scorch, smoke or burn.",
          "So every part has a **power rating**. A common small resistor (the kind in a hobby kit) is rated for about **¼ W**; bigger ones handle 1 W, 5 W or more. Ratings are typical for the part family and depend on how warm the surroundings are.",
          "Combine P = V × I with Ohm's law to get two other handy forms:\n\n**P = I² × R**  and  **P = V² ÷ R**",
          "Since P = V²÷R, doubling the voltage across a resistor makes **four times** the heat. Try it.",
        ),
        widget: { type: "circ-power", props: { rating: 0.25, v: 5, r: 220 } },
      },
      {
        kind: "question",
        title: "Overload it",
        body: "Make the resistor **go over its rating** (the heat meter turns red). Nobody gets hurt in the simulator.",
        widget: { type: "circ-power", props: { rating: 0.25, v: 5, r: 220 } },
        question: { type: "widget", goal: { over: true }, hint: "More voltage or less resistance both mean more power. Remember P = V² ÷ R." },
        explanation: "At 12 V across 220 Ω, P = 144 ÷ 220 ≈ 0.65 W, more than twice the rating. A real resistor in that spot would run too hot to touch and could burn. This is why we check ratings and not just resistance values.",
      },
      {
        kind: "question",
        title: "Choose the rating",
        body: "A 100 Ω resistor will have **10 V** across it all the time, so it dissipates 1 W. Which rating is the smallest one that leaves comfortable headroom (at least double the power)?",
        question: {
          type: "choice",
          options: ["¼ W", "1 W", "2 W", "10 W"],
          answer: 2,
          hint: "First find the heat: P = V² ÷ R. Then pick the rating at least twice that.",
          feedback: {
            0: "A ¼ W part would get four times its rating, so it would cook.",
            1: "1 W exactly equals the heat, which leaves no headroom: it would run very hot.",
            3: "That works, but it is much bigger and dearer than needed. Pick the smallest with headroom.",
          },
        },
        explanation: "P = 10² ÷ 100 = 1 W, so 2 W gives double headroom. Engineers usually run parts well under their ratings so they stay cool and last. How much margin is a design decision; double is a common rule of thumb.",
      },
      {
        kind: "explain",
        title: "How long will the battery last?",
        body: P(
          "Batteries come with a number like **2500 mAh**. That is **milliamp-hours**: a capacity in charge. A 2500 mAh cell can in principle supply 2500 mA for one hour, or 25 mA for 100 hours.",
          "So **hours = capacity (mAh) ÷ current drawn (mA)**.",
          "Different batteries have different voltages, so mAh alone cannot compare them. Multiply by the voltage to get **watt-hours** (Wh), a real amount of energy: Wh = (mAh ÷ 1000) × V.",
          "The capacities here are typical figures, and real cells give less when cold, old or pulled hard. **Safety:** lithium cells can overheat and burn if shorted or damaged. Never short a battery to see what happens.",
        ),
        widget: { type: "circ-capacity", props: {} },
      },
      {
        kind: "question",
        title: "Make it last",
        body: "Choose a battery and a draw so the gadget runs for **at least 100 hours**.",
        widget: { type: "circ-capacity", props: { drawMa: 100 } },
        question: { type: "widget", goal: { minHours: 100 }, hint: "Hours = mAh ÷ mA. Either use a bigger battery or cut the draw." },
        explanation: "For example a 2500 mAh AA at 25 mA lasts 100 hours. Designers of battery gadgets spend lots of effort on the other side of the sum too: making the device draw less, for example by sleeping most of the time.",
      },
      {
        kind: "code",
        title: "Power in code",
        body: P(
          "Write `power(v, i)` that returns the power in **watts** for a voltage `v` (volts) and a current `i` (**amps**).",
          "Then check it against what you found: 5 V and 0.04 A should give 0.2 W.",
        ),
        language: "python",
        starter: `def power(v, i):
    # return the power in watts
    return 0
`,
        solution: `def power(v, i):
    return v * i
`,
        tests: [
          { id: "basic", description: "5 V and 0.04 A give 0.2 W", assertionCode: `assert abs(power(5, 0.04) - 0.2) < 1e-9, f"5 V x 0.04 A should be 0.2 W, got {power(5, 0.04)}"` },
          { id: "big", description: "12 V and 2 A give 24 W", assertionCode: `assert abs(power(12, 2) - 24) < 1e-9, f"12 V x 2 A should be 24 W, got {power(12, 2)}"` },
          { id: "tiny", description: "3.3 V and 0.001 A give 0.0033 W", assertionCode: `assert abs(power(3.3, 0.001) - 0.0033) < 1e-9, f"3.3 V x 1 mA should be 0.0033 W, got {power(3.3, 0.001)}"` },
        ],
        hints: ["P = V × I. In Python, * multiplies.", "Return the result with `return v * i`."],
      },
      {
        kind: "recap",
        points: [
          "**Power** is how fast energy is used: **P = V × I**, in watts. Also P = I² × R = V² ÷ R.",
          "A resistor turns all its power into **heat**. Go over its rating and it overheats: always check watts, not only ohms.",
          "Doubling the voltage across a resistor makes **four times** the heat (P = V² ÷ R).",
          "**mAh** is charge capacity: hours = mAh ÷ mA. **Wh** (mAh ÷ 1000 × volts) compares batteries of different voltages.",
          "Never short a battery. Lithium cells can overheat and burn.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Series and parallel ───────────────────────────────
  {
    id: "fnd-circ-4-series-parallel",
    title: "Series and parallel",
    summary: "Join resistors in a line or side by side: how total resistance, current and voltage change, and why houses are wired in parallel.",
    level: "Beginner",
    minutes: 10,
    xp: 50,
    steps: [
      {
        kind: "explain",
        title: "One road: series",
        body: P(
          "Real circuits have many parts, and there are two basic ways to join them. First, **in series**: one after another, like beads on a string. There is only one road, so **the same current flows through every part**.",
          "Each part adds its resistance to the road, so the **total resistance is the sum**:\n\n**R = R1 + R2 + R3 + ...**",
          "Change the values below and watch the total, the current and the table of volts across each resistor.",
        ),
        widget: { type: "circ-network", props: { topology: "series", values: [100, 220, 330], lockTopology: true } },
      },
      {
        kind: "question",
        title: "Add them up",
        body: "Three resistors, 100 Ω, 220 Ω and 330 Ω, are connected in series. What is the total resistance, in ohms?",
        question: { type: "number", answer: 650, tolerance: 0.5, unit: "Ω", hint: "In series the resistances just add together." },
        explanation: "100 + 220 + 330 = **650 Ω**. More parts in a line means a longer, harder road, so the total always ends up bigger than any single part.",
      },
      {
        kind: "explain",
        title: "Many roads: parallel",
        body: P(
          "The other way is **in parallel**: side by side, each part connected straight across the battery. Now there are several roads, so the **current splits**, and every branch gets the full battery voltage.",
          "More roads make it *easier* for current to get through, so the **total resistance goes down**:\n\n**1 ÷ R = 1 ÷ R1 + 1 ÷ R2 + ...**",
          "Two equal resistors in parallel make half the resistance (two lanes instead of one). Switch to parallel and watch the total drop below even the smallest resistor.",
        ),
        widget: { type: "circ-network", props: { topology: "parallel", values: [470, 470] } },
      },
      {
        kind: "question",
        title: "Make 50 ohms",
        body: "Build a **parallel** network of **two** resistors whose total resistance is **50 Ω** (give or take a little).",
        widget: { type: "circ-network", props: { topology: "parallel", values: [470, 470], lockTopology: true, lockCount: true } },
        question: { type: "widget", goal: { topology: "parallel", count: 2, minR: 49, maxR: 51 }, hint: "Two equal resistors in parallel give half the value of one. What single value is double 50?" },
        explanation: "Two 100 Ω resistors in parallel: 1/100 + 1/100 = 2/100, so R = 50 Ω. A handy shortcut for two resistors in parallel is R = (R1 × R2) ÷ (R1 + R2) = 10000 ÷ 200 = 50.",
      },
      {
        kind: "question",
        title: "A new branch",
        body: "A circuit has one resistor across a battery. You add a **second resistor in parallel** with the first. What happens to the battery's total current?",
        question: {
          type: "choice",
          options: ["It goes down, because there is more resistance", "It stays the same", "It goes up, because the total resistance went down", "It splits and the total halves"],
          answer: 2,
          hint: "A parallel branch is an extra road. What does an extra road do to the traffic?",
          feedback: {
            0: "Resistance in parallel does not add. An extra branch gives current an extra way through.",
            1: "The first branch still carries the same as before, and the new one carries extra, so the total changes.",
            3: "The current splits between branches, but the battery has to supply both parts, so the total rises.",
          },
        },
        explanation: "The first resistor still sees the full battery voltage, so it carries the same current as before. The new branch carries its own current as well. The battery supplies the sum, so **adding parallel branches always increases the total current**, which is why plugging in too many things can overload a socket.",
      },
      {
        kind: "explain",
        title: "Sharing the voltage and the current",
        body: P(
          "Two shortcuts follow from what you have seen.\n\n- In **series**, the current is the same everywhere and the **voltages share**: each part gets a slice of the battery in proportion to its resistance. All the slices add up to the battery voltage.\n- In **parallel**, the voltage is the same across every branch and the **currents share**: a smaller resistor takes a bigger share.",
          "Check the table: the volts across series resistors add up to the battery, and the amps through parallel branches add up to the battery's current.",
        ),
        widget: { type: "circ-network", props: { topology: "series", values: [1000, 2000, 3000], volts: 12, lockCount: true, lockValues: true } },
      },
      {
        kind: "question",
        title: "A slice of 12 volts",
        body: "A 12 V battery drives **1 kΩ, 2 kΩ and 3 kΩ** resistors in series. What voltage is across the **3 kΩ** one?",
        widget: { type: "circ-network", props: { topology: "series", values: [1000, 2000, 3000], volts: 12, lockCount: true, lockValues: true, lockTopology: true }, after: true },
        question: { type: "number", answer: 6, tolerance: 0.05, unit: "V", hint: "Find the loop's current first (total resistance is 6 kΩ), then use V = I × R for this resistor." },
        explanation: "Total R = 6 kΩ, so I = 12 ÷ 6000 = 2 mA. The 3 kΩ resistor gets 2 mA × 3 kΩ = **6 V**: half of the battery, because it is half of the total resistance.",
      },
      {
        kind: "question",
        title: "Why houses use parallel",
        body: "Lamps and sockets in a house are wired in **parallel**, not series. What is the main reason?",
        question: {
          type: "choice",
          options: ["Parallel wiring uses less electricity overall", "Each device gets the full supply voltage and works on its own", "Series wiring needs thicker wires", "It makes the lights brighter"],
          answer: 1,
          hint: "Think about what happens in a series string of lights when one bulb breaks.",
          feedback: {
            0: "Wiring style does not save energy: each device still takes what it needs.",
            2: "Wire thickness depends on the current, not on series versus parallel.",
            3: "Brightness depends on each lamp's voltage and rating, not the wiring pattern by itself.",
          },
        },
        explanation: "In parallel every device sits across the full supply voltage, and a failed or switched-off one does not stop the others. In a series string, one open bulb opens the whole loop and everything goes out, like old festive lights.",
      },
      {
        kind: "code",
        title: "Combine resistors",
        body: P(
          "Write two functions. `series(rs)` takes a list of resistances in ohms and returns their series total. `parallel(rs)` returns the parallel total.",
          "Use `sum(...)` to add up a list. For parallel, add up the reciprocals, `1 / r`, and then take the reciprocal of that sum.",
        ),
        language: "python",
        starter: `def series(rs):
    # total resistance of resistors in series
    return 0


def parallel(rs):
    # total resistance of resistors in parallel
    return 0
`,
        solution: `def series(rs):
    return sum(rs)


def parallel(rs):
    return 1 / sum(1 / r for r in rs)
`,
        tests: [
          { id: "series", description: "series([100, 220, 330]) is 650", assertionCode: `assert abs(series([100, 220, 330]) - 650) < 1e-9, f"series should be 650, got {series([100, 220, 330])}"` },
          { id: "par2", description: "parallel([100, 100]) is 50", assertionCode: `assert abs(parallel([100, 100]) - 50) < 1e-9, f"parallel should be 50, got {parallel([100, 100])}"` },
          { id: "par4", description: "parallel of four 100s is 25", assertionCode: `assert abs(parallel([100, 100, 100, 100]) - 25) < 1e-9, f"four 100 ohm in parallel should be 25, got {parallel([100, 100, 100, 100])}"` },
          { id: "mixed", description: "parallel([1000, 3000]) is 750", assertionCode: `assert abs(parallel([1000, 3000]) - 750) < 1e-9, f"1k and 3k in parallel should be 750, got {parallel([1000, 3000])}"` },
        ],
        hints: ["Series: just add the numbers with sum(rs).", "Parallel: 1 / sum(1 / r for r in rs)."],
      },
      {
        kind: "recap",
        points: [
          "**Series**: one road. The same current flows through every part, the voltages share, and **resistances add**.",
          "**Parallel**: several roads. Every branch gets the full voltage, the currents share, and the total resistance is **less than the smallest branch**.",
          "In parallel, 1 ÷ R = 1 ÷ R1 + 1 ÷ R2 + ... Two equal resistors give half.",
          "Adding a parallel branch always **increases** the total current.",
        ],
      },
    ],
  },
];
