import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (tables, diagrams) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lesson 12 of "Components in action": batteries and power management (inserted after Power supplies). */
export const analogLessonsE: ConceptLesson[] = [
  // ─────────────────────────────── 12. Batteries and power management ───────────────────────────────
  {
    id: "fnd-analog-12-batteries",
    title: "Batteries and power management",
    summary: "Chemistries and their voltages, watt-hours and C-rate, why a cold battery sags, how a Li-ion cell is charged (constant current, then constant voltage), and what protection and power-path circuits add.",
    level: "Intermediate",
    minutes: 11,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "Chemistries at a glance",
        body: P(
          "A **cell** is one unit of stored chemical energy with two terminals. A **battery** is, strictly, several cells joined together, but everyone says \"battery\" for a single cell too. Cells come in two families: **primary** cells are used once and thrown away, and **rechargeable** (secondary) cells can be refilled by pushing current backwards through them.",
          "What differs most between chemistries is the voltage, because the voltage comes from the chemistry, not from the size. A bigger cell of the same chemistry holds more charge at the same voltage.",
          txt(`
Chemistry              Nominal    In use (typical)     Type
Alkaline (AA, AAA)     1.5 V      1.5 down to ~0.9 V   primary
NiMH                   1.2 V      about 1.0 to 1.4 V   rechargeable
Li-ion / LiPo          3.6-3.7 V  about 3.0 to 4.2 V   rechargeable
LiFePO4                3.2 V      about 2.5 to 3.65 V  rechargeable
CR2032 coin (lithium)  3.0 V      3.0 down to ~2.0 V   primary
`),
          "All of these figures are **typical**. Some newer Li-ion chemistries charge to 4.35 V: the datasheet of the exact cell decides. A CR2032 coin cell holds only about 220 to 240 mAh and must never be recharged.",
          "To compare cells, count **energy**, not charge. Capacity in mAh says how much charge, but a 3.7 V cell moves each coulomb through more voltage than a 1.5 V one. Energy in watt-hours is capacity in amp-hours times nominal voltage (the units come from *Power and heat*):",
          txt(`
Wh = Ah x V(nominal)
`),
        ),
      },
      {
        kind: "question",
        title: "Watt-hours",
        body: "A Li-ion cell is marked **3.7 V nominal, 3000 mAh**. How much energy does it hold, in watt-hours (Wh)?",
        question: { type: "number", answer: 11.1, tolerance: 0.1, unit: "Wh", hint: "Convert the capacity to amp-hours first (1000 mAh = 1 Ah), then multiply by the voltage." },
        explanation: "3000 mAh is 3.0 Ah, and 3.0 Ah × 3.7 V = **11.1 Wh**. Two 1.5 V cells in series (3.0 V) with the same 3000 mAh would hold only 9 Wh, and comparing mAh alone would have hidden that.",
      },
      {
        kind: "explain",
        title: "C-rate and internal resistance",
        body: P(
          "A **C-rate** says how hard a cell is being charged or discharged, in units of its own capacity. **1C** is the current that would fill or empty the rated capacity in one hour. For a 2000 mAh cell, 1C is 2 A, 0.5C is 1 A and 2C is 4 A. Datasheets give a maximum charge rate (often 0.5C to 1C for Li-ion, typical) and a maximum discharge rate.",
          "Every cell has **internal resistance** (see *Sources and real-world limits*), in series with the ideal voltage inside. Under load the terminal voltage sags, and the resistance turns some power into heat:",
          txt(`
V(terminal) = V(open-circuit) - I x R
heat        = I^2 x R
`),
          "Take a cell with R = 0.1 Ω. At 3 A it sags by 0.3 V and warms by 3² × 0.1 = 0.9 W. Two things make R bigger: **cold** (often 2 to 4 times higher near 0 °C, typical, because the chemistry slows down) and **age**. This is why a phone or drone can show \"half full\" and still switch off in the cold: the charge is still there, but the sag under load drops the voltage below the device's cut-off.",
        ),
      },
      {
        kind: "question",
        title: "Cold take-off",
        body: "A drone's battery reads 50% in a warm room. Outside at **−5 °C** the same battery still shows 50%, but the drone cuts out the moment it takes off. What is the most likely cause?",
        question: {
          type: "choice",
          options: [
            "Its internal resistance rose, so the voltage sagged under heavy current.",
            "The cold drained the stored charge away, so the 50% reading was false.",
            "The cold raised the cell voltage, so over-voltage protection tripped at take-off.",
            "The cold permanently destroyed about half of the cell's capacity overnight.",
          ],
          answer: 0,
          hint: "Think about what changes inside a cell in the cold, and what V = Voc − I × R does when the current is large.",
          feedback: {
            1: "The charge is still stored; a chilly cell does not leak much. What changes is how easily the cell can deliver it.",
            2: "The cold does not raise the open-circuit voltage. Over-voltage cut-outs matter while charging, not at take-off.",
            3: "Most of the capacity returns once the cell warms up again. The cold slows the chemistry rather than destroying it.",
          },
        },
        explanation: "In the cold the chemistry slows and R can rise to 2 to 4 times its warm value. Take-off asks for a large current, so I × R is large and the terminal voltage dips under the device's cut-off, even though plenty of charge remains. Warm the pack and most of the capacity comes back.",
      },
      {
        kind: "explain",
        title: "Charging Li-ion: constant current, then constant voltage",
        body: P(
          "A Li-ion cell must not be charged by simply connecting a supply. A proper charger IC does it in **phases**:",
          "1. **Constant current (CC).** The charger pushes a fixed current (say 0.5C). The cell's terminal voltage rises as it fills. This phase delivers most of the charge.\n2. **Constant voltage (CV).** When the terminal voltage reaches the limit, **4.20 V** for most cells, the charger holds that voltage. The cell now fills slowly and the current **tapers** away.\n3. **Terminate.** When the current falls to about **C/10** (typical; some chargers use C/20) the charger stops. It does **not** float at 4.20 V forever, because that ages the cell.",
          "A deeply discharged cell (below about 3.0 V, typical) gets a small **pre-charge** current first. Charging is also allowed only between about **0 and 45 °C** (typical datasheet window; JEITA-style chargers reduce the current near the edges). Below 0 °C, lithium **plates out** as metal on the anode and can cause internal shorts later.",
          "The widget is a **toy**: a typical open-circuit curve and a fixed internal resistance. Try different charge rates and temperatures, and watch where CC turns into CV.",
          "**Safety:** charge Li-ion only with a dedicated charger IC set up for that cell (voltage, current, termination and a thermistor input). Never go above the cell's rated voltage or below 0 °C. A swollen, dented or hot cell must not be charged or used. Do not puncture or short a cell, use cells with protection, and never leave a project charging unattended.",
        ),
        widget: { type: "analog-charger", props: { capacityMah: 2000, cRate: 0.5, tempC: 25 } },
      },
      {
        kind: "question",
        title: "A full charge, safely",
        body: "The charger starts at **−10 °C** with a gentle **0.2C**. Find settings where the charger **accepts** the cell, the rate is **no more than 1C**, and the charge **finishes (current down to C/10) within 3 hours**. You need to change two things.",
        widget: { type: "analog-charger", props: { capacityMah: 2000, cRate: 0.2, tempC: -10 } },
        question: {
          type: "widget",
          goal: { allowed: true, maxC: 1, maxHours: 3 },
          prompt: "Charger allowed, rate at most 1C, finished within 3 hours.",
          hint: "A frozen cell is refused outright, and 0.2C is too gentle to finish in 3 hours. Check the total time readout after each change.",
        },
        explanation: "Move the cell into the charger's window (25 °C is ideal) and raise the rate: 0.5C finishes in about 2.1 hours and 1C in about 1.3 hours in the toy. 0.2C at 25 °C needs nearly 5 hours, and 2C is above what most cells allow. At 5 °C the charge also finishes in time, but it ends a few percent less full, because the colder cell's higher resistance reaches 4.20 V sooner. Real chargers are slower than this toy (no diffusion limits).",
      },
      {
        kind: "question",
        title: "Datasheet limit",
        body: "A **1200 mAh** LiPo cell's datasheet allows charging at **0.5C**. What is the largest charge current, in milliamps (mA)?",
        question: { type: "number", answer: 600, tolerance: 5, unit: "mA", hint: "C is the capacity written as a current: 1C for this cell is 1200 mA. Then scale it." },
        explanation: "1C for a 1200 mAh cell is 1200 mA, so 0.5C is **600 mA**. Set the charger's current-programming resistor (or setting) for 600 mA or less. Going lower is always safe, only slower.",
      },
      {
        kind: "explain",
        title: "Protection and power path",
        body: P(
          "Cells are often built into a pack with extra circuitry. A **protection circuit** sits on the cell: a small IC (the DW01-style parts are one common example) plus two MOSFETs in series with the cell. It disconnects the cell when it detects **over-charge** (about 4.25 to 4.3 V), **over-discharge** (about 2.4 to 3.0 V), **over-current** or a **short circuit** (all typical thresholds; the datasheet decides). A **fuel gauge** chip counts the charge going in and out to estimate how full the cell is.",
          "A **power path** (or load sharing) circuit lets the product run from USB while the charger fills the cell separately. Two benefits: the system's own current does not confuse the charger's \"current has tapered\" test, and a flat cell does not stop the device from starting. The simplest version is the diode or P-MOSFET OR-ing you met in *Protecting a circuit*: the supply and the cell both feed the load, and the higher one wins.",
          txt(`
USB 5 V --> charger IC --> cell --(protection)--+
   |                                            |
   +----------> power path (OR-ing) <-----------+
                    |
                  system
`),
          "Protection is the last line of defence, not a substitute for a correct charger. If it ever trips in normal use, something upstream is wrong.",
        ),
      },
      {
        kind: "question",
        title: "Coin cell under a radio burst",
        body: "A **CR2032** coin cell reads **3.0 V** open-circuit and has about **20 Ω** of internal resistance (typical for a part-used cell at room temperature; it rises as the cell drains and in the cold). A radio transmits a burst that draws **15 mA**. What is the terminal voltage during the burst, in volts?",
        question: { type: "number", answer: 2.7, tolerance: 0.02, unit: "V", hint: "The sag is I × R. Convert 15 mA to amps before multiplying." },
        explanation: "The sag is 0.015 A × 20 Ω = 0.3 V, so the terminal voltage is 3.0 − 0.3 = **2.7 V**. The rated 225 mAh or so is measured at a tiny steady current (about 0.2 mA, typical), so pulsed loads get much less out of the cell. The usual fix is a capacitor across the cell (100 µF is a typical start) to supply the burst. Then check the brown-out voltage of the microcontroller (see *RTOS and power* in the embedded module) against the dip you still get.",
      },
      {
        kind: "recap",
        title: "What to remember",
        points: [
          "Voltage comes from the chemistry: alkaline 1.5 V, NiMH 1.2 V, Li-ion 3.6 to 3.7 V nominal (about 3.0 to 4.2 V in use), LiFePO4 3.2 V, CR2032 3.0 V. All typical; the datasheet decides.",
          "Compare cells by energy: Wh = Ah × nominal V. A coin cell is primary and must never be recharged.",
          "1C is the current that empties the capacity in one hour. Internal resistance sags the voltage (V = Voc − I × R) and heats the cell (I² × R), and it rises in the cold and with age.",
          "Li-ion charges at constant current to 4.20 V, then at constant voltage until the current falls to about C/10, then stops. Only between about 0 and 45 °C, and only with a dedicated charger IC.",
          "Protection ICs cut off over-charge, over-discharge, over-current and shorts; a power path runs the system while the cell charges. Pulsed loads get far less than the rated mAh, so budget for the burst and add capacitance.",
        ],
      },
    ],
  },
];
