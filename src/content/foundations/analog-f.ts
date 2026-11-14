import type { ConceptLesson } from "../../learn/types.ts";

/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lesson 13 of "Components in action: capacitors to op-amps": switching converters in depth. */
export const analogLessonsF: ConceptLesson[] = [
  // ─────────────────────────────── 13. Switching converters in depth ───────────────────────────────
  {
    id: "fnd-analog-13-switching-converters",
    title: "Switching converters in depth",
    summary:
      "Chop the input into a square wave, smooth it with an inductor and a capacitor, and trade ripple against losses with duty cycle, frequency and inductance.",
    level: "Advanced",
    minutes: 12,
    xp: 75,
    steps: [
      {
        kind: "explain",
        title: "Chop, then smooth",
        body: P(
          "*Power supplies* gave you one paragraph on the **buck converter**. Here is the machine behind it. A buck has four parts: a **high-side switch** from the input to a point called the **switch node**, a **low-side switch** from that node to ground, an **inductor** from the node to the output, and an **output capacitor**. (Older designs use a Schottky diode instead of the low-side switch. With two switches it is called **synchronous**.)",
          "The switches take turns. For a fraction **D** of every cycle the high side is on and the switch node sits at Vin; for the rest the low side is on and the node sits at 0 V. D is the **duty cycle**: **D = t_on / T**, where T is the whole period.",
          "That square wave goes through an inductor and a capacitor, an LC low-pass filter (see *Impedance and filters*). The filter passes the wave's **average**, so in the ideal case, with the inductor current never reaching zero:",
          "**Vout = D × Vin**",
          "Why switch fast? The faster the chopping, the smaller the inductor and capacitor need to be. Typical converters run at a few hundred kHz up to a few MHz. Try the bench below. It is a toy: ideal parts, and you can see the node's square wave and the inductor current it produces.",
        ),
        widget: {
          type: "analog-converter",
          props: { topology: "buck", vin: 12, d: 0.5, f: 1e6, l: 4.7e-6, iout: 1 },
        },
      },
      {
        kind: "question",
        title: "Duty cycle for 3.3 V",
        body: "An ideal buck converter runs from **12 V** and must produce **3.3 V**. What duty cycle D does it need, in percent?",
        question: {
          type: "number",
          answer: 27.5,
          tolerance: 0.5,
          unit: "%",
          hint: "Vout = D × Vin, so D is the ratio of the output to the input. Write the answer as a percentage.",
        },
        explanation:
          "D = Vout / Vin = 3.3 / 12 = 0.275, which is **27.5%**. The high side is on for just over a quarter of each cycle. Real converters need a slightly larger D, because the switches and the inductor drop a little voltage.",
      },
      {
        kind: "explain",
        title: "Inductor ripple",
        body: P(
          "The inductor current is not flat. While the high side is on, the inductor has **Vin − Vout** across it, so by V = L di/dt (*Inductors and magnetism*) its current ramps up. While the low side is on, it ramps back down by the same amount. That wobble is the **ripple**:",
          "**ΔI = (Vin − Vout) × D / (L × f)**",
          "The average of the ramp is the load current. Designers commonly aim for a ripple of roughly **20 to 40%** of the load current (a rule of thumb, not a law). A bigger L or a higher f gives less ripple.",
          "The capacitor smooths that ripple current into a small voltage ripple, about **ΔV ≈ ΔI / (8 × f × C)** for an ideal capacitor. Real capacitors add their ESR (their internal resistance) times ΔI on top.",
          "One more limit. If the ramp's low point would go **below zero** the inductor current stops at zero for part of the cycle. That is **discontinuous mode**, and the simple formulas above no longer hold. The bench flags it and stops drawing there.",
        ),
        widget: {
          type: "analog-converter",
          props: { topology: "buck", vin: 12, d: 0.5, f: 5e5, l: 4.7e-6, iout: 1, lock: ["topology"] },
        },
      },
      {
        kind: "question",
        title: "Design a 3.3 V, 1 A buck",
        body: "Design a buck from **12 V** to **3.3 V** at **1 A**. Set the **duty cycle**, **switching frequency** and **inductor** so that the output is within **2%** of 3.3 V, the inductor ripple is at most **40%** of the load current, and the efficiency is at least **90%**. The result is only a toy model, and the readouts show every number you need.",
        widget: {
          type: "analog-converter",
          props: { topology: "buck", vin: 12, d: 0.5, f: 2e6, l: 2.2e-6, iout: 1, lock: ["topology", "vin", "iout"] },
        },
        question: {
          type: "widget",
          goal: { topology: "buck", vin: 12, iout: 1, vout: 3.3, voutTol: 0.02, rippleMaxPct: 40, effMin: 90 },
          hint: "Set D from Vout / Vin first. Then lower the frequency until the losses drop, and pick an inductor big enough to keep the ripple in check at that frequency.",
        },
        explanation:
          "D = 3.3 / 12 = 0.275. At 500 kHz with 22 µH the ripple is about 22% of the load and the efficiency about 93%; 47 µH also works. At 1 MHz or 2 MHz the switching and gate losses drag the efficiency under 90%. At 100 kHz the ripple is too big even with 47 µH. That is the trade: frequency buys small parts, and costs losses.",
      },
      {
        kind: "explain",
        title: "Where the watts go",
        body: P(
          "A converter loses power in three main places, and all three show in the bench.",
          "**Conduction loss.** Current flows through a switch's RDS(on) (*Transistors as switches*) and the inductor's wire resistance (its **DCR**). The heating current is the RMS one: I_rms² = I² + ΔI²/12. Loss = I_rms² × (RDS(on) + DCR). A bigger inductor has more wire, so more DCR.",
          "**Switching loss.** While a switch changes state it briefly holds voltage and current at once, and that overlap burns power every cycle: about **½ × V × I × (t_rise + t_fall) × f**. It grows in proportion to frequency.",
          "**Gate-drive loss.** Each switch's gate is a tiny capacitor (*Transistors as switches*). Charging and discharging it every cycle costs about **Qg × Vdrive × f** per switch, again in proportion to frequency.",
          "So a higher frequency means smaller L and C, but more switching and gate loss. At light loads the fixed losses (gate drive, controller) stay put while the output power shrinks, so efficiency falls; many converters skip pulses there (typical behaviour). Typical converters reach **80 to 95%**.",
        ),
      },
      {
        kind: "question",
        title: "Twice the frequency",
        body: "The same buck, with the same inductor and the same input and output, goes from **500 kHz** to **1 MHz**. What happens?",
        question: {
          type: "choice",
          options: [
            "Conduction loss halves and the ripple stays the same.",
            "The output voltage doubles as the switch turns on twice as often.",
            "Switching loss doubles and the inductor ripple halves.",
            "Nothing changes, since the duty cycle is the same.",
          ],
          answer: 2,
          hint: "Look for what depends on f in the ripple formula and in the switching-loss formula.",
          feedback: {
            0: "Conduction loss follows the current, not the frequency, and the ripple would halve rather than stay put.",
            1: "The output is set by the duty cycle D, not by how many cycles there are. The ripple falls instead.",
            3: "The average output stays the same, but the ripple and the switching loss both depend on f.",
          },
        },
        explanation:
          "Switching and gate loss are proportional to f, so they double. The ripple ΔI = (Vin − Vout) D / (L f) is inversely proportional to f, so it halves. Vout depends on D alone, and conduction loss barely moves.",
      },
      {
        kind: "question",
        title: "A boost for USB",
        body: P(
          "A **boost** converter steps the voltage **up**. The inductor sits between the input and the switch node. A low-side switch connects the node to ground, and a diode or high-side switch leads to the output.",
          "While the switch is on, the inductor charges from Vin. When it opens, the inductor keeps its current going, and its voltage **adds to Vin**, pushing charge into the output. Ideally **Vout = Vin / (1 − D)**, and the input current is **Iout / (1 − D)**.",
          "Two limits: a boost cannot go **below** Vin, and with the switch off the input still reaches the output through the inductor and diode, so there is no true disconnect without extra parts. You find boosts in one-cell gadgets and power banks.",
          "A **3.7 V** Li-ion cell must give a **5.0 V** output. What duty cycle D, in percent? Predict it, then check it on the bench.",
        ),
        widget: {
          type: "analog-converter",
          props: { topology: "boost", vin: 3.7, d: 0.5, f: 1e6, l: 4.7e-6, iout: 1 },
          after: true,
        },
        question: {
          type: "number",
          answer: 26,
          tolerance: 0.5,
          unit: "%",
          hint: "Rearrange Vout = Vin / (1 − D) to find 1 − D, then D. Write the answer as a percentage.",
        },
        explanation:
          "1 − D = Vin / Vout = 3.7 / 5.0 = 0.74, so D = **26%**. Power in equals power out in the ideal case, so 1 A out at 5 V needs about 5 W / 3.7 V ≈ 1.35 A from the cell, and more once losses are counted. That is why a boost drains a cell faster than the load alone suggests.",
      },
      {
        kind: "question",
        title: "The loop that must be tiny",
        body: P(
          "In a buck, the current in the inductor never jumps: it ramps. But the **input** current does. Every cycle it is switched on and off, so the current in one particular loop changes extremely fast. That loop is the **hot loop**. Its area radiates as an antenna, and its stray inductance rings, because V = L di/dt.",
          "Which loop is the hot loop?",
        ),
        question: {
          type: "choice",
          options: [
            "The output capacitor and the load it feeds.",
            "The input capacitor and the two switches.",
            "The feedback divider that senses the output voltage.",
            "The inductor and the output capacitor it charges.",
          ],
          answer: 1,
          hint: "Find the loop where the current is chopped on and off every cycle, not the one with a smooth ramp.",
          feedback: {
            0: "The load sees the smoothed output, so its current changes slowly. This loop is calm.",
            2: "The feedback path carries almost no current. Keep it tidy and away from the switch node, but it is not the hot loop.",
            3: "The inductor current ramps instead of jumping, which makes this loop far less critical.",
          },
        },
        explanation:
          "The input capacitor supplies the sharp pulses of current that the high-side switch draws, and the low-side switch takes over when the high side opens. That small loop sees the full di/dt. Put the input capacitor right next to the switches, over a solid ground plane. See *Power and ground* and *EMC: boards that don't shout* for the layout side.",
      },
      {
        kind: "explain",
        title: "Module or discrete, and in practice",
        body: P(
          "You can build a converter from a **discrete controller** plus separate switches, inductor and capacitors, or buy a **power module** that has the inductor and controller in one package. Modules have fewer layout traps and often come with EMI results already measured. They cost more per unit and are less flexible. A discrete design is cheaper at volume and flexible, but it needs careful part choice and layout.",
          "Help exists: vendors publish web design tools that pick parts for you, and simulators such as LTspice or ngspice can model a converter before you build it. Always copy the **reference layout** in the datasheet before you improvise.",
          "**Safety:** converters that run from **mains** (offline switchers, for example the flyback inside a phone charger) have a lethal primary side and big capacitors that stay charged after unplugging. Buy certified adapters. Do not build them, and do not open them.",
        ),
      },
      {
        kind: "recap",
        points: [
          "A buck chops the input with two switches and smooths it with an LC filter: **Vout = D × Vin**, with **D = t_on / T** (ideal, continuous conduction). A boost gives **Vout = Vin / (1 − D)** and cannot go below Vin.",
          "Inductor ripple **ΔI = (Vin − Vout) D / (L f)**: a bigger L or a higher f shrinks it. Aim for about 20 to 40% of the load. Too much ripple gives **discontinuous mode**, where the simple formulas stop holding.",
          "Losses are **conduction** (I_rms² × (RDS(on) + DCR)), **switching** (about ½ V I t f) and **gate drive** (Qg Vdrive f). Frequency trades small parts against losses; typical efficiency is 80 to 95%.",
          "The **hot loop** (input capacitor and the two switches) must be tiny and tight to a ground plane. Never open or build mains-powered switchers.",
        ],
      },
    ],
  },
];
