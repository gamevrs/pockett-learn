import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (tables, diagrams) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lesson 11 of "Components in action": protecting a circuit at its edges. Sits right after "Diodes and LEDs". */
export const analogLessonsD: ConceptLesson[] = [
  // ─────────────────────────────── 11. Protecting a circuit ───────────────────────────────
  {
    id: "fnd-analog-11-protection",
    title: "Protecting a circuit",
    summary: "What goes wrong at a circuit's edges (too much voltage, a battery in backwards, a current surge, a static zap) and the small parts that stop it.",
    level: "Intermediate",
    minutes: 11,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "A diode that is meant to break down",
        body: P(
          "A normal diode blocks in reverse until you push too hard, and then it **breaks down** (see *Diodes and LEDs*). For most diodes that is damage. A **Zener diode** is built so that the breakdown is gentle and repeatable, so you can use it on purpose.",
          "Fit it *backwards*, with the bar towards the positive side. Below its **Zener voltage (Vz)** it blocks. Try to push the voltage past Vz and it conducts, and from then on the voltage across it barely moves, however much current flows. Common values are 3.3 V, 5.1 V and 12 V, typically with a tolerance of about ±5%. The symbol is the diode symbol with the ends of the bar bent like a Z.",
          "Like an LED, a Zener needs a **series resistor** to set its current: I = (Vin − Vz) ÷ R. Put the load in parallel with the Zener and you have a **shunt regulator**. (A **voltage regulator** holds an output steady while the input or the load changes. \"Shunt\" means the Zener sits to the side of the load and soaks up whatever current the load does not take.)",
          "Two limits matter. First, it only regulates while current flows through it: keep at least about **1 mA** in the Zener (a typical rule of thumb), or the output sags. Second, heat: the Zener burns **P = Vz × Iz**, and a small glass part is typically rated **0.5 W**. Its worst case is *no load*, when all the resistor's current goes through it. The worst case for regulation is *full load*, when the least is left for it.",
          "It is wasteful, because the resistor burns the spare voltage all the time. That is fine for a reference voltage or a few milliamps, and a poor way to power anything bigger (see *Power and heat*). Drag the load current below, and watch the Zener take up the slack.",
        ),
        widget: { type: "analog-zener", props: { r: 470, vin: 12, loadMa: 5 }, live: true },
      },
      {
        kind: "question",
        title: "Size the Zener's resistor",
        body: "A **12 V** supply feeds a **5.1 V, 0.5 W** Zener through a series resistor. The load takes anything from **0 to 20 mA**, and the resistor is a **1/4 W (250 mW)** part. Pick the resistor so that, at **full load, the Zener still carries at least 1 mA**, and at **no load the Zener stays within 0.5 W and the resistor within 0.25 W**. The table under the readouts shows both worst cases.",
        widget: { type: "analog-zener", props: { r: 1000, vin: 12, loadMa: 10, lock: ["vin"] } },
        question: {
          type: "widget",
          goal: { izMinFull: 0.001, pzMaxNoLoad: 0.5, prMax: 0.25, vin: 12 },
          hint: "One end of the range comes from the heaviest load (the Zener must not run dry), the other from no load (the resistor must not cook). Try values on both sides and read the table.",
        },
        explanation:
          "The quick sums: at full load the resistor must pass 20 mA for the load plus 1 mA for the Zener, so R ≤ (12 − 5.1) ÷ 21 mA ≈ 330 Ω. With no load all of its current heats the resistor, so (6.9 V)² ÷ R ≤ 0.25 W gives R ≥ about 190 Ω. In this toy (the Zener has a little resistance of its own) **180 Ω, 220 Ω and 270 Ω** pass, **150 Ω** fails (about 280 mW in a 250 mW resistor) and **330 Ω** fails (only 0.85 mA is left in the Zener at full load). 180 Ω passes by a hair (237 mW of 250 mW), so 220 Ω or 270 Ω is the comfortable choice: designers usually keep a resistor to about half its rating. The Zener's own 0.5 W is never the limit here, because the resistor runs out of rating first.",
      },
      {
        kind: "explain",
        title: "Schottky diodes: a smaller drop",
        body: P(
          "A **Schottky diode** is made from a metal-to-semiconductor junction instead of a silicon p-n junction. Its forward drop is typically only about **0.2 to 0.45 V**, against 0.6 to 0.7 V for a silicon diode, and it switches very fast.",
          "There are two catches. It **leaks more in reverse** (a lot more when hot), and it usually **blocks lower reverse voltages** than a silicon diode of the same size. Check the datasheet for both.",
          "Three common jobs. **OR-ing two supplies**: put one diode after each supply and join the outputs, and whichever supply is higher feeds the load while the other is blocked. **Simple reverse-polarity protection**: one diode in series with the supply. And **flyback clamps** across a coil, which *Inductors and magnetism* explains. For all three the small drop wastes less than a silicon diode would.",
        ),
      },
      {
        kind: "question",
        title: "Two supplies, one load",
        body: "A device can run from **USB at 5.0 V** or from a **3.7 V lithium cell**. Each supply feeds the load through its own Schottky diode (about **0.3 V** drop, typical), and the two diode outputs are joined at the load. USB is plugged in. What feeds the load?",
        question: {
          type: "choice",
          options: ["Both share the load, at about 4.35 V", "The cell wins, at about 3.4 V", "USB, and it also charges the cell", "Only USB feeds it, at about 4.7 V"],
          answer: 3,
          hint: "Work out the voltage at each diode's output, then ask which diode has a voltage across it that pushes forwards and which pushes backwards.",
          feedback: {
            0: "Two supplies at different voltages do not share like that: the higher one holds the joined node up and the lower one's diode is pushed into reverse.",
            1: "Batteries have no priority. The diode connected to the higher voltage conducts, and here USB is the higher one, not the cell.",
            2: "A diode only passes current one way, and that is away from each supply. The cell's diode is reversed, so it carries nothing back into the cell.",
          },
        },
        explanation:
          "The USB diode drops 0.3 V, so the joined node sits at 5.0 − 0.3 = **4.7 V**. The cell's diode has 3.7 V on its anode and 4.7 V on its cathode, so it is reverse biased by 1 V and carries (almost) nothing. The same trick keeps the cell from feeding back into the USB port. Unplug USB and the node falls until the cell's diode conducts: 3.7 − 0.3 = 3.4 V. A diode does not charge a cell; charging needs a proper charger circuit. **Safety:** a lithium cell can catch fire if it is shorted or charged wrongly, so never improvise its charging.",
      },
      {
        kind: "explain",
        title: "A battery in backwards",
        body: P(
          "People fit batteries and plug in adaptors the wrong way round. Left unprotected, current can run backwards through a chip's internal diodes and wreck it. The cheapest guard is **one series diode** in the supply line: wrong way round it blocks. A silicon diode drops 0.6 to 0.7 V, a Schottky about 0.3 V, and in both cases it turns **I × Vf** into heat all the time the circuit runs.",
          "The better guard for bigger currents is a **P-channel MOSFET** in the positive line (a MOSFET is a transistor used as a switch, see *Transistors as switches* later in the module). Every MOSFET contains a **body diode**: a diode formed inside the part between its drain and source. Here it points the same way as the supply current. The gate is tied to ground through a resistor.",
          txt(`
 battery +  ──[ D   PMOS   S ]──►  circuit
                    │ G
               [ 100 kΩ ]
                    │
 battery −  ────────┴──────────── ground
`),
          "With the battery **right**, current first flows through the body diode. That puts the source at nearly the battery voltage while the gate is at 0 V, so the gate-to-source voltage VGS is about **−Vbat**. For a P-channel MOSFET a negative VGS turns the channel fully **on**, and the drop falls to just **I × RDS(on)**, which is typically a few tens of milliohms. With the battery **reversed**, the gate and the source sit at about the same voltage, so the channel stays off, and the body diode is reverse biased, so nothing flows.",
          "One more limit: a MOSFET's gate can only take about **±20 V** between gate and source (typical; some logic-level parts only ±8 V or ±12 V). For a higher supply, add a **Zener** between gate and source, with a resistor in the gate's line to ground, so the Zener caps VGS.",
        ),
      },
      {
        kind: "question",
        title: "Heat in the protector",
        body: "A P-channel MOSFET reverse-protector has **RDS(on) = 30 mΩ** and your circuit draws **2 A**. How much heat does it make, in **milliwatts**? (Use P = I² × R.)",
        question: {
          type: "number",
          answer: 120,
          tolerance: 2,
          unit: "mW",
          hint: "Square the current first, then multiply by the resistance in ohms (30 mΩ is 0.03 Ω). Convert watts to milliwatts at the end.",
        },
        explanation:
          "P = I² × R = (2 A)² × 0.03 Ω = 4 × 0.03 = 0.12 W = **120 mW**, barely warm. A Schottky diode at 0.35 V drop would burn 0.35 V × 2 A = **0.7 W** for the same job, nearly six times as much, and that heat is wasted battery too. That is why current-hungry designs choose the MOSFET and small ones accept the diode.",
      },
      {
        kind: "question",
        title: "Plug-in surge",
        body: P(
          "Too much current is a danger at the wrong moment. A **polyfuse** (PPTC, a resettable fuse) is a plastic strip full of carbon. When the current passes its **trip current** it heats up, the plastic swells, and its resistance jumps from a fraction of an ohm to many ohms, which chokes the current. After the power is off and it cools, it resets. Its **hold current** is the most it carries without tripping, and the trip current is typically about **twice the hold current**. It reacts in milliseconds to seconds, so it protects wiring and connectors, not a chip that fails in microseconds.",
          "A surprise at plug-in is **inrush current**. An empty capacitor looks like a short circuit for the first moment, and the current into it is **I = C × ΔV ÷ Δt** (how much it is charged, divided by how fast). The fix is to ramp the supply up slowly: a **soft-start load switch**, or in mains equipment an **NTC thermistor** (a resistor that is large when cold and falls as it heats).",
          "A **100 µF** input capacitor is charged from **0 to 12 V in 100 µs** when you plug in the supply. What is the average current, in **amps**?",
        ),
        question: {
          type: "number",
          answer: 12,
          tolerance: 0.2,
          unit: "A",
          hint: "I = C × ΔV ÷ Δt. The micro prefixes on the capacitance and the time cancel, so you can work with 100 and 100 directly.",
        },
        explanation:
          "I = C × ΔV ÷ Δt = 100 µF × 12 V ÷ 100 µs = **12 A**. A tiny 100 µF capacitor pulls twelve amps for a moment, enough to spark a connector, trip a protection circuit or weld a switch's contacts. A polyfuse is too slow to help with a pulse this short, so the cure is to slow the charging down, not to add a fuse.",
      },
      {
        kind: "explain",
        title: "ESD: thousands of volts, a tiny energy",
        body: P(
          "Walk across a carpet and touch a door handle: a **static discharge**, or **ESD** (electrostatic discharge). You feel a spark at around 3 kV, and a good zap can be 8 kV or more. A chip on a connector that people touch will take that hit.",
          "Designers test it with a standard (**IEC 61000-4-2**, the system-level test). The toy version here charges **150 pF** to the test voltage and releases it through **330 Ω**, with test levels of 2, 4, 6 and 8 kV (contact discharge). The energy ½ × C × V² is tiny: **0.3 mJ** at 2 kV, **4.8 mJ** at 8 kV. Yet the current is tens of amps for tens of nanoseconds. Real ESD also has a first spike lasting under a nanosecond that this plain RC toy cannot show.",
          "A chip's own on-chip protection is built for about **2 kV** of handling in the factory (the **human-body model, HBM**: 100 pF through 1.5 kΩ, about 1.3 A at its peak, typical). That is not built for a connector facing users. So put a **TVS diode** (transient-voltage suppressor) right at the connector, with a short, wide path to ground, *before* anything else on the line. It has two voltages to read: the **standoff voltage**, below which it stays off and ignores the signal, and the **clamping voltage**, what the line is held to *during* the hit. A small series resistor between the TVS and the chip helps a little more.",
          "**Safety:** real ESD guns, surge testers and mains surge parts such as **MOVs** (metal-oxide varistors) belong to trained people with proper equipment. Work only with low-voltage supplies. Try the toy below at 4 kV with no TVS first.",
        ),
        widget: { type: "analog-esd", props: { kv: 4, tvs: "none" }, live: true },
      },
      {
        kind: "question",
        title: "Protect a 3.3 V pin from 8 kV",
        body: "A 3.3 V logic pin on a user-facing connector must survive an **8 kV** hit. Choose a TVS so that **the chip's own clamp stays within its limit** and **the normal 3.3 V signal still passes** (the TVS must not conduct on it).",
        widget: { type: "analog-esd", props: { kv: 8, tvs: "none", lock: ["kv"] } },
        question: {
          type: "widget",
          goal: { kv: 8, tvs: "any", chipSafe: true, signalOk: true },
          hint: "A part that starts conducting below the signal level spoils the signal. A part that starts conducting very high lets too much of the hit through to the chip. You need one in between.",
        },
        explanation:
          "The toy gives the answer on both sides. The **2.5 V** part clamps lowest but its breakdown (about 2.8 V) is below the 3.3 V signal, so it would conduct on normal signals. The **12 V** part lets the pin reach about 20 V and pushes about 1.6 A through the chip's own clamp, over its 1.3 A limit. The **3.3 V** part (pin about 11 V, chip about 0.7 A) and the **5 V** part (pin about 13 V, chip about 0.9 A) both pass. The 3.3 V one leaves more margin for the chip; the 5 V one leaves more margin for the signal. Rule: standoff at or just above the highest normal signal, clamping as low as that allows.",
      },
      {
        kind: "recap",
        points: [
          "A **Zener diode** run in reverse holds about its Zener voltage (typically ±5%) once current flows. A series resistor sets that current: keep about **1 mA or more** at full load, and check **P = Vz × Iz** and the resistor's power at no load.",
          "A **Schottky diode** drops only about 0.2 to 0.45 V (typical) and switches fast, but leaks more in reverse. It suits OR-ing supplies and simple reverse-polarity protection.",
          "For a battery in backwards, a series diode wastes **I × Vf** as heat; a **P-channel MOSFET** in the positive line wastes only **I² × RDS(on)**, and its gate needs a Zener clamp on higher supplies.",
          "A **polyfuse** protects wiring slowly. **Inrush current** is I = C × ΔV ÷ Δt, so slow the charging with a soft-start switch (or an NTC in mains gear).",
          "**ESD** is a tiny energy with a huge, brief current. Put a **TVS diode** at the connector with a short path to ground: its standoff above the signal, its clamping low enough for the chip behind it.",
        ],
      },
    ],
  },
];
