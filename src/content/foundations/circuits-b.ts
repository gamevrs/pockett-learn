import type { ConceptLesson } from "../../learn/types.ts";

/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 5 to 8 of "Electronics from zero: circuits": Kirchhoff's laws, the voltage divider, reading schematics and measuring, real sources. */
export const circuitsLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 5. Kirchhoff's laws ───────────────────────────────
  {
    id: "fnd-circ-5-kirchhoff",
    title: "Kirchhoff's laws",
    summary: "Currents at a junction add to zero, voltages round a loop add to zero: two laws that solve circuits Ohm's law alone cannot.",
    level: "Intermediate",
    minutes: 10,
    xp: 55,
    steps: [
      {
        kind: "explain",
        title: "Current at a junction",
        body: P(
          "Ohm's law and the series and parallel rules solve circuits with one battery. Some circuits have two sources or several loops, and then you need two laws from Gustav Kirchhoff (1845).",
          "The first is about **junctions**, the points where wires meet (electronics calls them **nodes**). **Kirchhoff's current law (KCL)**: *the current flowing into a node equals the current flowing out.* Charge cannot pile up in a wire, just as water cannot pile up in a pipe junction.",
          "Here two batteries feed the middle node **A** through R1 and R3, and R2 carries the current on to ground. The panel adds up the currents at A. Move the batteries and watch the sums stay balanced.",
        ),
        widget: { type: "circ-kirchhoff", props: { mode: "kcl", b1: 9, b2: 5, r1: 100, r2: 220, r3: 330, lockResistors: true } },
      },
      {
        kind: "question",
        title: "No current from B1",
        body: "All three resistors are 100 Ω. Set the batteries so that **no current flows through R1** (the first reading in the panel is 0).",
        widget: { type: "circ-kirchhoff", props: { mode: "kcl", b1: 3, b2: 3, r1: 100, r2: 100, r3: 100, lockResistors: true } },
        question: { type: "widget", goal: { i1Zero: true }, hint: "No current in R1 means no voltage across it, so node A must sit at exactly B1's voltage." },
        explanation: "With three equal resistors the middle node sits at (B1 + B2) ÷ 3. For that to equal B1, B2 must be **twice** B1: for example 3 V and 6 V. Then B2 alone supplies R2's current and B1 is pushing nothing.",
      },
      {
        kind: "question",
        title: "Balance the node",
        body: "At one node, **3 mA** flows in on one wire and **5 mA** flows in on a second. A third wire carries **2 mA** out. What current must leave on the fourth wire?",
        question: { type: "number", answer: 6, tolerance: 0.01, unit: "mA", hint: "Everything that comes in has to leave: add up what is in, then take away what already left." },
        explanation: "In = 3 + 5 = 8 mA. Out must also be 8 mA, and 2 mA has gone already, so the fourth wire carries **6 mA**. KCL is just bookkeeping: nothing is created or lost at a junction.",
      },
      {
        kind: "explain",
        title: "Voltage round a loop",
        body: P(
          "The second law is about **loops**. **Kirchhoff's voltage law (KVL)**: *going once round any closed loop, the voltage rises and drops add up to zero.*",
          "It is like hiking a circular trail: every metre you climb you later go down again, and you end up at the height you started. A battery is a climb (a **rise**), a resistor is a descent (a **drop**), and after one lap they cancel.",
          "Switch to the loop view. Each loop's battery voltage minus the drops across its resistors comes to exactly zero. R2 belongs to both loops.",
        ),
        widget: { type: "circ-kirchhoff", props: { mode: "kvl", b1: 9, b2: 5, r1: 100, r2: 220, r3: 330, lockResistors: true } },
      },
      {
        kind: "question",
        title: "The missing drop",
        body: "A 12 V battery drives two resistors in series. The first has **5 V** across it. What is the voltage across the second one?",
        question: { type: "number", answer: 7, tolerance: 0.01, unit: "V", hint: "Going round the loop, the battery's 12 V rise must be matched exactly by the drops." },
        explanation: "KVL: 12 − 5 − V₂ = 0, so V₂ = **7 V**. This is exactly the voltage divider you will meet next lesson: the drops share the battery voltage between them.",
      },
      {
        kind: "explain",
        title: "Solving a two-loop circuit",
        body: P(
          "Put the laws to work. Call the voltage at A (measured from ground) **Va**. The current through R1 into A is (B1 − Va) ÷ R1, through R3 into A is (B2 − Va) ÷ R3, and out through R2 is Va ÷ R2. KCL says in = out:",
          "(B1 − Va) ÷ R1 + (B2 − Va) ÷ R3 = Va ÷ R2",
          "Solve for Va and you get **Va = (B1 ÷ R1 + B2 ÷ R3) ÷ (1 ÷ R1 + 1 ÷ R2 + 1 ÷ R3)**. For 9 V, 5 V, 100 Ω, 220 Ω and 330 Ω that is about 5.98 V. The currents come out near 30.2 mA into A from R1, **−3.0 mA** from R3 and 27.2 mA out through R2.",
          "A **negative** current only means it flows the other way: here B1 is pushing current backwards into B2. (Joining real batteries of different voltages like this is a bad idea, and with lithium cells it can be dangerous.)",
        ),
        widget: { type: "circ-kirchhoff", props: { mode: "both", b1: 9, b2: 5, r1: 100, r2: 220, r3: 330, lockResistors: true } },
      },
      {
        kind: "question",
        title: "Predict, then check",
        body: "All resistors are 100 Ω, B1 is 9 V and B2 is 6 V. What is the voltage at node A?",
        widget: { type: "circ-kirchhoff", props: { mode: "both", b1: 9, b2: 6, r1: 100, r2: 100, r3: 100, lockResistors: true }, after: true },
        question: { type: "number", answer: 5, tolerance: 0.02, unit: "V", hint: "With equal resistors the formula simplifies: Va = (B1 + B2) ÷ 3." },
        explanation: "Va = (9 + 6) ÷ 3 = **5 V**. Check with KCL: R1 carries 40 mA in, R3 carries 10 mA in, and R2 carries 50 mA out.",
      },
      {
        kind: "code",
        title: "Find the node voltage",
        body: P(
          "Write `node_voltage(b1, b2, r1, r2, r3)` returning Va for the circuit above, using the formula from the explanation. Voltages are in volts and resistances in ohms.",
          "Remember to divide the top by the bottom: the top is `b1 / r1 + b2 / r3` and the bottom is `1 / r1 + 1 / r2 + 1 / r3`.",
        ),
        language: "python",
        starter: `def node_voltage(b1, b2, r1, r2, r3):
    # voltage at the middle node A
    return 0
`,
        solution: `def node_voltage(b1, b2, r1, r2, r3):
    top = b1 / r1 + b2 / r3
    bottom = 1 / r1 + 1 / r2 + 1 / r3
    return top / bottom
`,
        tests: [
          { id: "equal", description: "9 V and 6 V into three 100 ohm resistors give 5 V", assertionCode: `assert abs(node_voltage(9, 6, 100, 100, 100) - 5) < 1e-9, f"should be 5, got {node_voltage(9, 6, 100, 100, 100)}"` },
          { id: "mixed", description: "9 V, 5 V with 100, 220 and 330 ohms gives about 5.983 V", assertionCode: `assert abs(node_voltage(9, 5, 100, 220, 330) - 5.982758620689656) < 1e-6, f"should be about 5.9828, got {node_voltage(9, 5, 100, 220, 330)}"` },
          { id: "single", description: "A dead second battery (0 V) makes a divider", assertionCode: `assert abs(node_voltage(10, 0, 1000, 1000, 1000) - 10 / 3) < 1e-9, f"should be 3.333, got {node_voltage(10, 0, 1000, 1000, 1000)}"` },
        ],
        hints: ["Work out the top and the bottom of the fraction as two separate variables.", "Return top / bottom."],
      },
      {
        kind: "question",
        title: "Spot the impossible loop",
        body: "In one loop a **9 V** battery drives three resistors. Someone measures drops of **4 V, 3 V and 3 V** across them. What does KVL say?",
        question: {
          type: "choice",
          options: ["That is fine: the extra voltage is just wasted", "That is fine: KVL only applies to parallel circuits", "That is impossible: a loop can only hold two resistors", "That is impossible: the drops add to 10 V but the battery supplies only 9 V"],
          answer: 3,
          hint: "Add the drops and compare them with the battery's rise.",
          feedback: {
            0: "Voltage is not wasted. Around a closed loop the rises and drops must match exactly.",
            1: "KVL applies to every closed loop, in series or parallel circuits alike.",
            2: "A loop can contain as many parts as you like. The sum of the drops is the problem.",
          },
        },
        explanation: "4 + 3 + 3 = 10 V of drops, against a 9 V rise: it cannot be, so a reading (or the battery voltage) is wrong. KVL is a great check on your own measurements.",
      },
      {
        kind: "recap",
        points: [
          "**KCL**: at a node, current in = current out. Charge does not pile up.",
          "**KVL**: round any closed loop, rises minus drops = 0.",
          "Two unknown loops are solved by writing KCL at a node in terms of its voltage and solving: Va = (B1/R1 + B2/R3) ÷ (1/R1 + 1/R2 + 1/R3).",
          "A **negative** current just means it flows opposite to the way you assumed.",
          "Use the laws as checks: if your drops do not add up, a number is wrong.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 6. The voltage divider and loading ───────────────────────────────
  {
    id: "fnd-circ-6-voltage-divider",
    title: "The voltage divider and loading",
    summary: "Two resistors split a voltage: the formula, why a load makes the output sag, and how knobs and sensors are dividers too.",
    level: "Intermediate",
    minutes: 10,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "Splitting a voltage",
        body: P(
          "Often a circuit needs a voltage lower than the battery's: a sensor that wants 3.3 V from a 9 V supply, say. Two resistors in series can **divide** it.",
          "The same current flows through both, so each takes a share in proportion to its resistance. The voltage in the middle (the **output**) is measured across the bottom resistor:",
          "**Vout = Vin × R2 ÷ (R1 + R2)**",
          "Equal resistors split it in half. A big top resistor and a small bottom one give a small output. Try different values.",
        ),
        widget: { type: "circ-divider", props: { mode: "load", vin: 9, r1: 1000, r2: 1000, noLoad: true } },
      },
      {
        kind: "question",
        title: "Do the sum",
        body: "A 9 V supply feeds R1 = 1 kΩ on top of R2 = 2 kΩ. What is Vout, in volts?",
        question: { type: "number", answer: 6, tolerance: 0.02, unit: "V", hint: "Use Vout = Vin × R2 ÷ (R1 + R2). What fraction of the total is R2?" },
        explanation: "R2 is 2 of the total 3 kΩ, so it takes two thirds of the 9 V: **6 V**. Quick check with KVL: the 1 kΩ takes the other 3 V and 6 + 3 = 9.",
      },
      {
        kind: "question",
        title: "Aim for 3 volts",
        body: "From the 9 V supply, make an output of **about 3 V** (between 2.7 and 3.3).",
        widget: { type: "circ-divider", props: { mode: "load", vin: 9, r1: 1000, r2: 1000, noLoad: true } },
        question: { type: "widget", goal: { minVout: 2.7, maxVout: 3.3 }, hint: "3 V is one third of 9 V, so R2 should be about half of R1." },
        explanation: "R1 about twice R2 gives a third of the supply, for example 22 kΩ over 10 kΩ gives 2.8 V and 2.2 kΩ over 1 kΩ gives the same. Notice that only the **ratio** matters, not the values themselves.",
      },
      {
        kind: "explain",
        title: "Loading: the catch",
        body: P(
          "The formula assumed nothing else is connected to the output. But the whole point is to feed something: a sensor, a chip, a lamp. That **load** has its own resistance, and it sits **in parallel with R2**.",
          "Parallel branches lower the total resistance (last module's rule), so the bottom half of the divider gets weaker and the output **sags**. A load of 1 kΩ on a divider of two 1 kΩ resistors drags R2 down to 500 Ω.",
          "**Rule of thumb**: to keep the sag small, make the load resistance at least about ten times R2. Slide the load from \"no load\" down and watch the output fall.",
        ),
        widget: { type: "circ-divider", props: { mode: "load", vin: 9, r1: 1000, r2: 1000 } },
      },
      {
        kind: "question",
        title: "A loaded divider",
        body: "R1 = R2 = 1 kΩ on a 9 V supply, and a **1 kΩ load** connects across the output. What is Vout now?",
        widget: { type: "circ-divider", props: { mode: "load", vin: 9, r1: 1000, r2: 1000, load: 1000 }, after: true },
        question: { type: "number", answer: 3, tolerance: 0.02, unit: "V", hint: "Replace R2 by R2 in parallel with the load first. Two equal resistors in parallel make half." },
        explanation: "R2 ∥ load = 500 Ω, so Vout = 9 × 500 ÷ (1000 + 500) = **3 V**, not the 4.5 V you get with no load. A divider is only a good voltage source if the load is gentle.",
      },
      {
        kind: "explain",
        title: "A knob is a divider",
        body: P(
          "A **potentiometer** (a *pot*) is a resistor track with a sliding contact, the **wiper**. The track is R1 above the wiper and R2 below it, and turning the knob moves the wiper, so it changes the ratio while the total stays the same.",
          "Volume knobs, dimmers and the sticks on a game controller are all pots working as dividers. Here a 10 kΩ pot sits across a 9 V supply: move the wiper and the output sweeps from 0 to 9 V.",
        ),
        widget: { type: "circ-divider", props: { mode: "pot", vin: 9, wiper: 50, noLoad: true } },
      },
      {
        kind: "question",
        title: "Light-dependent divider",
        body: "An **LDR** (light-dependent resistor) is the bottom half of a divider and a fixed 10 kΩ is the top. Its resistance is **high in the dark** and low in bright light. It gets dark: which way does Vout move?",
        widget: { type: "circ-divider", props: { mode: "ldr", vin: 5, r1: 10000, lux: 100, noLoad: true }, live: true },
        question: {
          type: "choice",
          options: ["It falls towards 0 V", "It rises towards the supply voltage", "It stays the same", "It reverses"],
          answer: 1,
          hint: "A bigger bottom resistor takes a bigger share of the supply.",
          feedback: {
            0: "That would be the bright-light case, where the LDR is small. Dark makes it large.",
            2: "The LDR's resistance changes, so the split changes.",
            3: "A divider never reverses. The output stays between 0 V and the supply.",
          },
        },
        explanation: "Dark means a big LDR resistance, so it takes more of the 5 V and Vout **rises**. A chip can read that voltage and decide whether to switch a night light on. (This LDR curve is a typical toy shape; real parts differ a lot, so check datasheets.)",
      },
      {
        kind: "question",
        title: "Take its temperature",
        body: "Now the bottom half is an **NTC thermistor**: its resistance falls as it gets warmer (typically 10 kΩ at 25 °C). Warm it up until Vout drops **below 1.5 V**.",
        widget: { type: "circ-divider", props: { mode: "ntc", vin: 5, r1: 10000, tempC: 25, noLoad: true } },
        question: { type: "widget", goal: { maxVout: 1.5 }, hint: "Warmer means the thermistor's resistance falls, so it takes a smaller share. Slide towards hot." },
        explanation: "At around 50 °C the thermistor is only about 3.6 kΩ and Vout is near 1.3 V. A microcontroller reads that voltage and converts it back to a temperature: you will see how in the ADC lesson later. (The curve is a typical 10 kΩ, B = 3950 K model; real parts differ.)",
      },
      {
        kind: "code",
        title: "The divider in code",
        body: P(
          "Write `divider(vin, r1, r2)` that returns the output voltage of an unloaded divider.",
          "Use the formula Vout = Vin × R2 ÷ (R1 + R2). Remember the parentheses around the sum.",
        ),
        language: "python",
        starter: `def divider(vin, r1, r2):
    # output voltage across r2
    return 0
`,
        solution: `def divider(vin, r1, r2):
    return vin * r2 / (r1 + r2)
`,
        tests: [
          { id: "basic", description: "9 V over 1 kOhm and 2 kOhm gives 6 V", assertionCode: `assert abs(divider(9, 1000, 2000) - 6) < 1e-9, f"should be 6, got {divider(9, 1000, 2000)}"` },
          { id: "half", description: "Equal resistors give half", assertionCode: `assert abs(divider(5, 10000, 10000) - 2.5) < 1e-9, f"should be 2.5, got {divider(5, 10000, 10000)}"` },
          { id: "quarter", description: "12 V over 3 kOhm and 1 kOhm gives 3 V", assertionCode: `assert abs(divider(12, 3000, 1000) - 3) < 1e-9, f"should be 3, got {divider(12, 3000, 1000)}"` },
        ],
        hints: ["The output takes R2's share of the total resistance.", "Return vin * r2 / (r1 + r2)."],
      },
      {
        kind: "recap",
        points: [
          "A **voltage divider** gives **Vout = Vin × R2 ÷ (R1 + R2)**. Only the ratio matters.",
          "A **load** sits in parallel with R2 and makes the output **sag**. Keep the load about ten times R2 or more, or use a buffer (you will meet op-amps later).",
          "A **potentiometer** is a divider whose ratio you set by turning a knob.",
          "Sensors that change resistance (an **LDR** for light, an **NTC thermistor** for temperature) become voltage sensors when you put them in a divider.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Reading schematics and measuring ───────────────────────────────
  {
    id: "fnd-circ-7-schematics-measuring",
    title: "Reading schematics and measuring",
    summary: "The symbols, nets and ground that make a schematic a map, and how to use a multimeter: volts across, amps in series, ohms with no battery in the path.",
    level: "Intermediate",
    minutes: 10,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "A schematic is a map",
        body: P(
          "A **schematic** is a diagram that shows how the parts of a circuit connect, not where they sit on the board. Like a subway map, it drops the real geography and keeps the connections.",
          "Every part has a **symbol**. You have met a few already. Tap each one below to see what it is and what it looks like in real life.",
        ),
        widget: { type: "circ-symbols", props: {} },
      },
      {
        kind: "question",
        title: "Find the reference",
        body: "Tap the symbol for **ground**, the 0 V reference that every other voltage is measured from.",
        widget: { type: "circ-symbols", props: {} },
        question: { type: "widget", goal: { selected: "ground" }, hint: "It looks like a stack of lines getting shorter, hanging from a wire." },
        explanation: "The three shrinking bars mean ground. A voltage is always a difference between two points, so we pick one point as 0 V and measure the others from there.",
      },
      {
        kind: "explain",
        title: "Nets and ground",
        body: P(
          "A wire joins everything it touches into one **net**. Every point on a net is at the same voltage (we treat wires as perfect). Pick a net below and see its voltage.",
          "Schematics also use **ground symbols** as a shortcut: every ground symbol is connected to every other, so you can draw many of them instead of long wires crossing the page. Turn on ground symbols to see the return wire disappear without changing the circuit.",
        ),
        widget: { type: "circ-nets", props: {} },
      },
      {
        kind: "question",
        title: "Which net is at 6 V?",
        body: "The battery is 9 V, R1 is 1 kΩ and R2 is 2 kΩ. Light up the net that sits at **6 V**.",
        widget: { type: "circ-nets", props: {} },
        question: { type: "widget", goal: { net: "mid" }, hint: "Which net sits between R1 and R2? Use the divider formula to see what it should be." },
        explanation: "The middle net is a voltage divider output: 9 × 2k ÷ 3k = 6 V. The + rail is 9 V and ground is 0 V by definition. In a schematic, a net label or a rail name stands for \"the same net\", wherever it appears.",
      },
      {
        kind: "explain",
        title: "The multimeter",
        body: P(
          "A **multimeter** reads voltage, current and resistance. It is the first tool every electronics hobbyist buys, and the way you use it depends on what you measure:",
          "- **Volts**: probes **across** the part, one on each end. The meter looks like a huge resistance, so it barely disturbs the circuit.\n- **Amps**: the meter goes **in series**. You open the loop and let the current flow *through* the meter, which acts almost like a wire.\n- **Ohms**: the meter sends its **own** tiny test current through the part and works out the resistance. That only works if **no battery is in the path**: take the part out of the circuit, or at least cut the battery off from it. A source in the path fights the test current and the reading is garbage (the meter shows ?? here).",
          "Try it on the circuit below. The red and black dots show where the probes go, and the dashed circle is the meter when it sits in the loop. Open and close the switch too: it changes what each placement means. Choosing badly shows what would really happen, safely.",
        ),
        widget: { type: "circ-multimeter", props: {} },
      },
      {
        kind: "question",
        title: "Measure a voltage",
        body: "Set the meter to **volts** and put the probes **across R2**, with the switch closed.",
        widget: { type: "circ-multimeter", props: { mode: "A", place: "series" } },
        question: { type: "widget", goal: { mode: "V", place: "r2", power: true, correct: true }, hint: "Pick the Volts dial and the Across R2 probe position." },
        explanation: "Volts go **across** a part. You should read about 6 V: the battery is 9 V with R1 = 1 kΩ and R2 = 2 kΩ, so R2 takes two thirds. If the meter were wired in series for a volts reading, it would be wrong.",
      },
      {
        kind: "question",
        title: "Measure the current",
        body: "Use the meter to find how much current flows round the loop. Enter it in milliamps.",
        widget: { type: "circ-multimeter", props: {}, live: true },
        question: { type: "number", answer: 3, tolerance: 0.05, unit: "mA", hint: "Current is measured with the meter in series, on the Amps dial. Check it against V ÷ R of the whole loop." },
        explanation: "The same current flows through the whole series loop: 9 V ÷ (1 kΩ + 2 kΩ) = **3 mA**. The ammeter has to sit *in* the loop for all of it to flow through the meter.",
      },
      {
        kind: "question",
        title: "Blow the fuse (virtually)",
        body: "Mistakes teach best when nothing real burns. **Blow the meter's fuse** by making the classic error: put the meter on **amps** and connect the probes **across the battery**.",
        widget: { type: "circ-multimeter", props: {}, live: true },
        question: { type: "widget", goal: { everBlown: true }, hint: "An ammeter is almost a wire. Where would a wire across a battery be a disaster?" },
        explanation: "Across the battery, the ammeter is a near-wire, so around 180 A would try to flow. The meter's fuse exists exactly to break first. On a real meter, if there is no fuse or someone fitted the wrong one, that can mean a burnt meter or injury: this is why amps always go **in series**.",
      },
      {
        kind: "question",
        title: "Where to practise",
        body: "Which of these is a safe way to practise measuring?",
        question: {
          type: "choice",
          options: ["Measuring the voltage at a wall socket", "Opening up a mains plug-in adaptor to look inside", "A battery-powered circuit like the one in this lesson", "Measuring the current directly across a car battery"],
          answer: 2,
          hint: "Which choice involves only a small, current-limited low-voltage source?",
          feedback: {
            0: "Mains can kill. Learners should not probe it: leave that to trained electricians with proper equipment.",
            1: "Mains adaptors store dangerous voltage inside even when unplugged. Do not open them.",
            3: "An ammeter across a car battery is the fuse-blowing short circuit, with an enormous current.",
          },
        },
        explanation: "A small battery with a couple of resistors cannot deliver enough current to hurt you, and a fuse-protected meter is cheap. Mains, car batteries and anything lithium need training and the right gear.",
      },
      {
        kind: "recap",
        points: [
          "A **schematic** shows connections, not positions, with a standard **symbol** for each part.",
          "A **net** is everything joined by wire: one voltage. **Ground** is the 0 V reference, and ground symbols are all connected.",
          "Meter rules: **volts across**, **amps in series**, **ohms across a part with no battery in the path**.",
          "An ammeter is almost a wire: across a source it blows its fuse (or worse).",
          "Practise on batteries and small circuits. Never probe mains.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. Sources and real-world limits ───────────────────────────────
  {
    id: "fnd-circ-8-real-sources",
    title: "Sources and real-world limits",
    summary: "Internal resistance, why a battery's voltage sags under load, what a bench supply's current limit does, and how fuses stop short circuits.",
    level: "Intermediate",
    minutes: 10,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "A battery is not perfect",
        body: P(
          "So far a battery was an **ideal** source: it holds its voltage whatever you connect. Real batteries cannot. Inside every one there is a small resistance, the **internal resistance** **Ri**, in series with an ideal source.",
          "When the load pulls a current I, the voltage at the terminals is **V = Voc − I × Ri**, where **Voc** is the open-circuit (no-load) voltage. Some voltage is lost inside before it ever reaches the load.",
          "Values here are typical: a fresh AA alkaline cell about 0.2 Ω, a tired one a good deal more, a coin cell on the order of 15 Ω. Try different loads.",
        ),
        widget: { type: "circ-source", props: { kind: "cell", cell: "aa", load: 100 } },
      },
      {
        kind: "question",
        title: "Squeeze the cell",
        body: "Make the voltage **at the terminals fall below 1 V**.",
        widget: { type: "circ-source", props: { kind: "cell", cell: "aa", load: 100 } },
        question: { type: "widget", goal: { maxV: 1.0 }, hint: "A tiny load resistance pulls a big current, and a cell with more Ri loses more of it inside." },
        explanation: "A tired AA cell (1.5 Ω inside) on a 1 Ω load gives 1.4 × 1 ÷ 2.5 ≈ 0.56 V. A coin cell on 10 Ω gives 3 × 10 ÷ 25 = 1.2 V. That is why a coin cell can run a watch but not a motor.",
      },
      {
        kind: "question",
        title: "How much reaches the load?",
        body: "A 1.5 V cell has **0.5 Ω** inside and drives a **2.5 Ω** load. What is the voltage at its terminals?",
        question: { type: "number", answer: 1.25, tolerance: 0.01, unit: "V", hint: "The current is Voc ÷ (Ri + R_load). Then subtract the voltage lost across Ri." },
        explanation: "I = 1.5 ÷ 3 = 0.5 A. The drop inside is 0.5 × 0.5 = 0.25 V, so the terminals show 1.5 − 0.25 = **1.25 V**. That drop is also heat: I² × Ri = 0.125 W inside the cell.",
      },
      {
        kind: "explain",
        title: "The bench supply",
        body: P(
          "A **bench power supply** is a lab's adjustable source. Its knobs set a **voltage**, and it holds that voltage steady (it is about as close to ideal as you can buy) up to a **current limit** you also set.",
          "If the load asks for more than the limit, the supply stops raising the current and lets the **voltage fall** instead. It switches from **CV** (constant voltage) to **CC** (constant current) mode. That is a safety net for new circuits: a wiring mistake cannot pull more than the limit.",
          "Here a supply is set to 5 V with a 0.5 A limit. Lower the load resistance and watch it hit the limit.",
        ),
        widget: { type: "circ-source", props: { kind: "bench", vset: 5, limit: 0.5, load: 100 } },
      },
      {
        kind: "question",
        title: "Hit the limit",
        body: "Lower the load resistance until the supply goes into **current-limit (CC) mode**.",
        widget: { type: "circ-source", props: { kind: "bench", vset: 5, limit: 0.5, load: 100 } },
        question: { type: "widget", goal: { mode: "CC" }, hint: "The limit is 0.5 A at 5 V. What load resistance would want exactly that?" },
        explanation: "5 V ÷ 0.5 A = 10 Ω. Anything below 10 Ω would pull more than 0.5 A at 5 V, so the supply holds 0.5 A instead and the voltage falls (a 4.7 Ω load gets 2.35 V). The best habit when you build something new: current limit low, then raise it.",
      },
      {
        kind: "explain",
        title: "Short circuits and fuses",
        body: P(
          "A **short circuit** is an accidental path with almost no resistance between the two terminals of a source. Ohm's law then gives an enormous current, limited only by the source's internal resistance: a 12 V pack with 0.1 Ω inside could try to push over **100 A**, which would melt wires and overheat the pack.",
          "A **fuse** is a thin piece of wire designed to melt at its rated current, **opening the loop** before anything else is hurt. Choose a load and a fuse and connect it. A real fuse takes longer to blow for a small overload than for a big one (the datasheet shows the curve); this toy opens the moment the rating is passed.",
          "**Safety:** never short a real battery to find out. Lithium packs especially can heat up and burn.",
        ),
        widget: { type: "circ-fuse", props: { load: "lamp", fuse: "2" } },
      },
      {
        kind: "question",
        title: "Let the fuse save the day",
        body: "Connect a load that **blows the fuse**. (The lamp and motor are fine on a 2 A fuse. What is not?)",
        widget: { type: "circ-fuse", props: { load: "lamp", fuse: "2" } },
        question: { type: "widget", goal: { blown: true }, hint: "Pick a load that would pull more than the fuse's rating, then connect it." },
        explanation: "The stuck motor (about 11 A) or the short circuit (about 100 A) is way over 2 A, so the fuse opens and the current stops at once. Without a fuse, that heat would be dumped in the battery and the wiring.",
      },
      {
        kind: "question",
        title: "Choose the fuse",
        body: "A gadget normally draws **1.2 A**. Which fuse is the sensible choice?",
        question: {
          type: "choice",
          options: ["1 A, to be extra careful", "2 A, a little above the normal current", "10 A, so it never blows", "No fuse: it only adds cost"],
          answer: 1,
          hint: "A fuse must survive normal use but open before the wiring is in danger.",
          feedback: {
            0: "A 1 A fuse would blow in normal use, because 1.2 A is already above its rating.",
            2: "A fuse far above normal protects nothing: the wires could overheat long before 10 A.",
            3: "Skipping the fuse saves pennies and risks fires. Fuses are cheap insurance.",
          },
        },
        explanation: "Choose a rating **above normal current** (a rule of thumb is a margin of roughly 25% to 100%, set by the datasheet and the wire's ability) but **below** what the wiring can safely carry. Too low and it nuisance-blows; too high and it does not protect.",
      },
      {
        kind: "code",
        title: "Terminal voltage in code",
        body: P(
          "Write `terminal_voltage(voc, ri, r_load)` that returns the voltage at the terminals of a source with open-circuit voltage `voc` and internal resistance `ri`, driving a load `r_load` (all volts and ohms).",
          "First find the current, `voc / (ri + r_load)`, then subtract the drop inside the source, `current * ri`.",
        ),
        language: "python",
        starter: `def terminal_voltage(voc, ri, r_load):
    # voltage at the terminals under load
    return 0
`,
        solution: `def terminal_voltage(voc, ri, r_load):
    current = voc / (ri + r_load)
    return voc - current * ri
`,
        tests: [
          { id: "cell", description: "1.5 V, 0.5 ohm inside, 2.5 ohm load gives 1.25 V", assertionCode: `assert abs(terminal_voltage(1.5, 0.5, 2.5) - 1.25) < 1e-9, f"should be 1.25, got {terminal_voltage(1.5, 0.5, 2.5)}"` },
          { id: "equal", description: "A load equal to Ri gets half the voltage", assertionCode: `assert abs(terminal_voltage(3, 15, 15) - 1.5) < 1e-9, f"should be 1.5, got {terminal_voltage(3, 15, 15)}"` },
          { id: "light", description: "A light load barely drops it", assertionCode: `assert abs(terminal_voltage(9, 1, 8) - 8) < 1e-9, f"should be 8, got {terminal_voltage(9, 1, 8)}"` },
        ],
        hints: ["The current through the load is the open-circuit voltage divided by the total resistance in the loop.", "Return voc - current * ri."],
      },
      {
        kind: "recap",
        points: [
          "A real source is an ideal one with a small **internal resistance** in series: **V = Voc − I × Ri**. The terminal voltage sags as the load pulls more current.",
          "That lost voltage is heat inside the source: I² × Ri.",
          "A **bench supply** holds its voltage until its **current limit**, then holds the current instead: **CV** becomes **CC**.",
          "A **short circuit** gives a huge current limited only by the source and wiring. A **fuse** opens the loop before anything burns.",
          "Pick a fuse above the normal current and below what the wiring can carry. Never short a real battery.",
        ],
      },
    ],
  },
];
