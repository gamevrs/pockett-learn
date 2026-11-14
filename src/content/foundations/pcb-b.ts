import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (tables, diagrams) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 3 to 5 of "Components and PCB design": schematic, footprints and the board, placement and routing. */
export const pcbLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 3. From idea to schematic ───────────────────────────────
  {
    id: "fnd-pcb-3-schematic",
    title: "From idea to schematic",
    summary: "Block diagram to schematic: nets and net labels, power symbols, reference designators, decoupling, and an electrical rules check that catches mistakes before layout.",
    minutes: 10,
    xp: 60,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Start with blocks",
        body: P(
          "In *Electronics from zero: circuits* you learned to **read** a schematic (see \"Reading schematics and measuring\"). Now you draw one. Nobody starts with parts. You start with a **block diagram**: one box for each job the product does, and arrows for what flows between them.",
          txt(`
 USB 5 V ──► [ Regulator ] ──3.3 V──► [ MCU ] ──► [ LED ]
                                        ▲
                                        └───────── [ Sensor ]
`),
          "The **schematic** is the same plan with every box opened up: real parts, every pin, every connection. It does not say where parts sit on the board or how long a wire is. That comes later, in the layout.",
          "Two example tools: **KiCad** (free and open source) and **Altium Designer** (commercial, paid). The ideas in this lesson are the same in both. Our example board is a small sensor board: a 3.3 V regulator (the *PK3302*, a made-up part), a microcontroller (MCU), an LED, a button and a sensor.",
        ),
      },
      {
        kind: "question",
        title: "The order of work",
        body: "Put these steps of a board design in a sensible order.",
        question: {
          type: "order",
          items: ["Sketch a block diagram", "Choose a part for each block", "Draw the schematic", "Run ERC and fix what it finds", "Assign footprints, then start the layout"],
          hint: "Decide what the product does before you pick parts, and check the connections before you decide where parts sit.",
        },
        explanation: "You go from idea to detail: blocks, parts, connections, a check, then the physical board. In real projects you loop back often (a part turns out too big, so you change the block), but fixing a mistake gets more expensive at every step. A wire moved in the schematic is free. A wire moved after the boards are made is a new board.",
      },
      {
        kind: "explain",
        title: "Nets, labels and power symbols",
        body: P(
          "A **net** is a set of pins that are all connected: one electrical node. You can join pins with a wire, or you can give two places the same **net label**. **Same name means same net**, even with no wire between them. That keeps a drawing tidy: a signal can leave a chip on the left and arrive at a chip on the right without a wire across the page.",
          txt(`
 U1.PA2 ─────── DATA          U3.OUT ─────── DATA
        (two labels with the same name: one net, no wire needed)
`),
          "**Power and ground symbols** are net labels with a picture. Every GND symbol is the same net, GND. Every 3V3 symbol is the net 3V3. That is why you never draw a wire from every ground pin back to the battery.",
          "Two traps. A typo in a name makes a **new, separate net** (DATA and DAT never meet), and many tools treat upper and lower case as different. And in a drawing with several sheets, a plain label often joins only on its own sheet; a *global* label reaches across sheets. Names differ by tool, so check yours.",
        ),
      },
      {
        kind: "question",
        title: "Two labels, no wire",
        body: "On one sheet, a pin of U1 has a net label **DATA** and a pin of U3, far away, also has a net label **DATA**. No wire joins them. Are they connected?",
        question: {
          type: "choice",
          options: ["No, only wires connect things", "Yes, the same net name means the same net", "Only if the two pins are close together on the page", "Only after you run ERC"],
          answer: 1,
          hint: "Think about why a tool offers labels at all, if wires were the only way to connect.",
          feedback: {
            0: "Wires are one way. A net label is the other, and it joins every pin that carries the same name.",
            2: "Distance on the page does not matter. The name is what joins them.",
            3: "ERC only checks the connections you made. It does not make any.",
          },
        },
        explanation: "The same name on the same sheet **is** a connection. That is also how a typo hides: `DATA` and `Data` can end up as two nets, and nothing is drawn to warn you. ERC and a look at the net list are how you catch it.",
      },
      {
        kind: "explain",
        title: "Names, values and footprints",
        body: P(
          "Every part on the schematic gets a **reference designator**: a letter for the kind of part and a number to make it unique, such as R1, C3, U2, J1, D1. It is the part's name on the schematic, the board's silkscreen and the parts list. The letters follow a long-standing convention.",
          txt(`
 R  resistor        C  capacitor      L  inductor
 D  diode or LED    Q  transistor     U  IC (a chip)
 J  connector       SW switch         Y  crystal      F  fuse
`),
          "Each symbol also carries a **value** (10 kΩ, 100 nF, or a part number for a chip) and a **footprint**: the pattern of copper pads the part will be soldered to. R2 might be \"10 kΩ, 0603\". You will meet footprints properly in the next lesson, but assign them as you draw: it is easiest while you remember which part you meant.",
          "Tools can number parts for you (\"annotate\"): you place R?, R?, R? and the tool turns them into R1, R2, R3.",
        ),
      },
      {
        kind: "question",
        title: "Which letter?",
        body: "What reference designator would you expect for an **LED**?",
        question: {
          type: "choice",
          options: ["R1", "L1", "D1", "Q1"],
          answer: 2,
          hint: "An LED is a light-emitting diode. Think of the word it ends with.",
          feedback: {
            0: "R is for resistors. An LED usually sits next to one, but it is not one.",
            1: "L is for inductors (coils). It is tempting because of \"LED\", but the convention goes by the kind of component.",
            3: "Q is for transistors. An LED is a two-pin diode.",
          },
        },
        explanation: "LEDs are diodes, so they are **D1, D2, ...**. The usual companion on the schematic is a series resistor, R1, to set the current (see \"Diodes and LEDs\" in *Components in action: capacitors to op-amps*).",
      },
      {
        kind: "explain",
        title: "ERC: a spell checker for circuits",
        body: P(
          "**ERC** (electrical rules check) is a spell checker for a schematic. The tool knows each pin's **type** (input, output, power input, passive, and so on) and checks the connections against a table of what may meet what. It flags an **output on an output**, an **input nobody drives**, and a **power pin** that goes nowhere. It does not know what you meant, so it cannot say that a circuit is *right*, only that it breaks no rule.",
          "One thing ERC will **not** catch: a forgotten decoupling capacitor. The netlist is legal without it. Common practice is **one 100 nF ceramic capacitor per supply pin** as a starting point (typical; the datasheet decides), drawn beside that pin. That is a job for a design-review checklist.",
          "Below is the sensor board with four mistakes hidden in it. Press **Run ERC**, then try the fix buttons. A wrong fix teaches as much as the right one.",
        ),
        widget: { type: "pcb-erc", props: {} },
      },
      {
        kind: "question",
        title: "Run ERC and fix everything",
        body: "Run ERC on the sensor board and fix **every** problem, so that nothing is left in the list.",
        widget: { type: "pcb-erc", props: {} },
        question: {
          type: "widget",
          goal: { ran: true, maxErrors: 0, fixed: ["nrst", "contention", "vdd", "decap"] },
          prompt: "Press Run ERC, then pick the right fix for each of the four items until the count reaches 0.",
          hint: "For each item ask what the pin or net needs to do its job: a defined level, one driver, a supply, a local reservoir of charge.",
        },
        explanation: "Four problems, four different kinds: a **floating input** (give it a defined level), **two drivers** on one net (keep one), a **power pin with no supply** (wire it to the rail, since a PWR_FLAG would only silence the message) and a **missing decoupling capacitor** (a review catch, not an ERC error). Real ERC finds the first three; your own checklist finds the fourth.",
      },
      {
        kind: "question",
        title: "Why not two outputs?",
        body: "Why is it a problem to connect the outputs of two chips (push-pull outputs) to one net?",
        question: {
          type: "choice",
          options: [
            "The net name becomes too long for the tool",
            "One output reads the net as an input and is damaged",
            "It uses more copper on the board",
            "When one drives high and the other low they fight: a large current flows between them and the level is undefined",
          ],
          answer: 3,
          hint: "A push-pull output drives its pin hard, high or low. What happens when two of them disagree?",
          feedback: {
            0: "Names have nothing to do with it. The problem is electrical.",
            1: "An output does not read the net as an input; the trouble is what both outputs do at the same time.",
            2: "The copper is not the issue. The two outputs themselves are.",
          },
        },
        explanation: "A push-pull output connects its pin to the supply (high) or to ground (low) through a switch with very low resistance. Two that disagree make a **short through the chips**: a big current, heat, and a line stuck at some muddy level. Buses that need many talkers use **open-drain** outputs with one pull-up resistor (as I²C does) or tri-state outputs with enable pins.",
      },
      {
        kind: "recap",
        points: [
          "Go from **blocks to parts to schematic**, then check, then footprints and layout. Mistakes cost more at every step.",
          "A **net** is a set of connected pins. A wire or the **same net label** joins them, and power and ground symbols are net labels with a picture. Typos make new nets.",
          "**Reference designators** (R1, C3, U2, J1, D1) name each part. Give each symbol a **value** and a **footprint** while you draw.",
          "**ERC** checks pin types and connections: floating inputs, outputs on outputs, power pins with no supply. It cannot know your intent.",
          "Put **100 nF per supply pin** next to it as a typical starting point. ERC will not catch its absence, so use a review checklist as well.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Footprints and the board ───────────────────────────────
  {
    id: "fnd-pcb-4-board",
    title: "Footprints and the board",
    summary: "What a footprint is and why a wrong one means a respin, then the board as a sandwich: layers and stack-ups, copper weight, vias, solder mask and silkscreen.",
    minutes: 11,
    xp: 60,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Symbol versus footprint",
        body: P(
          "On the schematic a resistor is a zigzag with two pins. On the board it is two small rectangles of bare copper, called **pads**, spaced to fit that part's metal ends. That pad pattern is the part's **footprint** (also called a land pattern).",
          "- The **symbol** says what the part is *electrically*: pins and their names.\n- The **footprint** says where the *solder* goes: pads, an outline of the body on the silkscreen, a **courtyard** (a keep-out boundary so no other part's body or pad lands inside it) and a pin 1 mark.",
          "The footprint must match the real package. Datasheets show a *recommended land pattern*; libraries from the maker or your tool usually have it. Check it against the datasheet anyway.",
          "A **wrong footprint** is a classic cause of a **respin**: the boards arrive and the part does not fit, so you pay for a new batch and wait weeks. A related trap: several parts come in the same small package (for example the three-pad SOT-23) but with **different pin functions on the same pads**. The symbol's pin numbers must map to the right pads, so compare the symbol's pinout with the part's datasheet, not only the picture of the package.",
        ),
      },
      {
        kind: "question",
        title: "Where does it live?",
        body: "Which of these belongs only to the **footprint**, not to the symbol?",
        question: {
          type: "choice",
          options: ["The pin names, such as VDD and GND", "The value, such as 10 kΩ", "The sizes and positions of the copper pads", "Which pins are inputs and which are outputs"],
          answer: 2,
          hint: "The schematic says nothing about millimetres. Which of these is a physical shape?",
          feedback: {
            0: "Pin names are part of the symbol. The schematic needs them to show connections.",
            1: "The value is data on the symbol (and in the parts list), not geometry.",
            3: "Pin types are exactly what ERC reads from the symbol.",
          },
        },
        explanation: "The footprint is **geometry**: pad sizes and positions, the body outline, the courtyard. The symbol is **meaning**: pin names, types and how parts connect. A tool links the two by pin numbers, and that link is where a wrong pin mapping hides.",
      },
      {
        kind: "explain",
        title: "The board is a sandwich",
        body: P(
          "A board is a stack of **copper layers** (thin foil, etched into traces and planes) separated by **dielectric**, the insulator. The usual insulator is **FR-4**, glass fibre soaked in epoxy, with a relative permittivity εr of about 4.2 to 4.7 (typical; it depends on frequency and resin content). A **core** is a pre-cured sheet with copper on both sides. **Prepreg** is a sheet that melts and glues the layers together when the board is pressed and heated.",
          "The outer faces get a green (or any colour) coat of **solder mask** and white **silkscreen** ink. Boards typically come with **2, 4 or 6** copper layers, about 1.6 mm thick in all (typical). A common 4-layer order is signal, ground, power, signal: solid planes right under the outer signals make power and ground easy and give signals a clean return path (more in lesson 6).",
          "Press the layer buttons and watch the sandwich change. Real thicknesses are the fab's choice; the numbers shown are typical.",
        ),
        widget: { type: "pcb-stackup", props: {} },
      },
      {
        kind: "question",
        title: "How thick is 2 oz?",
        body: P(
          "Copper thickness is quoted as a **weight**: 1 oz means one ounce of copper spread over one square foot, which makes a layer about **34.8 µm** thick (often rounded to 35 µm). 2 oz is twice as much copper, so twice as thick.",
          "How many micrometres thick is **2 oz** copper?",
        ),
        question: { type: "number", answer: 69.6, tolerance: 0.5, unit: "µm", hint: "Thickness is proportional to weight: 1 oz is 34.8 µm." },
        explanation: "2 × 34.8 µm = **69.6 µm**, about 2.7 mil. Thicker copper carries more current for the same width and spreads heat better, but it is harder to etch fine details into, so it costs more and limits the smallest trace and gap. Typical outer layers are 1 oz; power boards use 2 oz or more.",
      },
      {
        kind: "explain",
        title: "Vias: stitching layers together",
        body: P(
          "A **via** is a hole plated with copper that joins traces on different layers. There are four kinds:",
          "- **Through** via: drilled through the whole board. The cheapest, and what you use by default.\n- **Blind** via: starts on an outer face and stops at an inner layer, so you see it from one side only.\n- **Buried** via: joins inner layers only and cannot be seen from either face.\n- **Microvia**: a tiny hole drilled by laser, spanning one layer. It is the basis of HDI (high-density interconnect) boards used for fine-pitch BGAs.",
          "Blind, buried and micro vias need extra drilling and pressing steps, so they **cost more**, and they only make sense with **4 or more layers**. Pick a layer count, then try each via type and watch which layers light up.",
        ),
        widget: { type: "pcb-stackup", props: { layers: 4 } },
      },
      {
        kind: "question",
        title: "A via from L1 to L2 only",
        body: "Show a via that connects the **top layer (L1) to the first inner layer (L2) only** on a **4-layer** board, that is drilled in from the top face and stops at L2 (not a laser-drilled microvia).",
        widget: { type: "pcb-stackup", props: {} },
        question: {
          type: "widget",
          goal: { layers: 4, via: "blind" },
          prompt: "Set the board to 4 layers and pick the via type that starts on the outside and stops at L2.",
          hint: "It must start on an outer face and stop at an inner layer. A microvia also spans L1 to L2, but is laser-drilled, tiny and made with a different process. Which type is it by definition?",
        },
        explanation: "A via that begins on an outer face and ends at an inner layer is **blind**. (A microvia is a particular kind of blind via made with a laser and limited to a single layer span; on this 4-layer board the widget also draws it from L1 to L2.) A through via would reach L4, and a buried via never reaches a face.",
      },
      {
        kind: "explain",
        title: "Mask, silk and the outline",
        body: P(
          "Three more things sit around the copper:",
          "- **Solder mask**: the coat over the copper, with openings only at the pads. It keeps solder from flowing along traces or bridging between pads, and protects the copper. Green is traditional; any colour works.\n- **Silkscreen**: ink printed on top. It carries reference designators (R1, U2), the **pin 1** dot, polarity marks (the + on an electrolytic capacitor, the bar on a diode's cathode end) and logos. Tools keep it off the pads.\n- **Board outline**: a line on its own layer that tells the fab where to cut, and where the holes and slots are.",
          "Silkscreen is what you read when you debug a board, so keep it legible. Put pin 1 and polarity marks where they will not be hidden by the part.",
        ),
      },
      {
        kind: "question",
        title: "What is the mask for?",
        body: "What does the **solder mask** do?",
        question: {
          type: "choice",
          options: [
            "It prints the part names on the board",
            "It keeps solder on the pads and off everything else, and protects the copper",
            "It adds a ground plane to the board",
            "It holds the parts in place while they are soldered",
          ],
          answer: 1,
          hint: "It covers almost all of the copper. Why would you want copper covered?",
          feedback: {
            0: "Printing names is the silkscreen's job, not the mask's.",
            2: "A ground plane is a copper layer. The mask is a coat on top of the copper.",
            3: "Sticky solder paste holds parts while the board is heated, not the mask.",
          },
        },
        explanation: "The mask leaves openings only at pads, so molten solder wets just the pads and does not creep along a trace or bridge two pads. It also protects the copper from dirt and corrosion.",
      },
      {
        kind: "code",
        title: "Ounces to micrometres",
        body: "Write `oz_to_um(oz)`. It takes a copper weight in **ounces per square foot** and returns the thickness in **micrometres**, using **34.8 µm per ounce**.",
        language: "python",
        starter: `def oz_to_um(oz):
    # thickness in micrometres for a copper weight in oz
    return 0.0
`,
        solution: `def oz_to_um(oz):
    return oz * 34.8
`,
        tests: [
          { id: "one", description: "1 oz is 34.8 µm", assertionCode: `assert abs(oz_to_um(1) - 34.8) < 0.01, f"got {oz_to_um(1)}, expected 34.8"` },
          { id: "two", description: "2 oz is 69.6 µm", assertionCode: `assert abs(oz_to_um(2) - 69.6) < 0.01, f"got {oz_to_um(2)}, expected 69.6"` },
          { id: "half", description: "0.5 oz is 17.4 µm", assertionCode: `assert abs(oz_to_um(0.5) - 17.4) < 0.01, f"got {oz_to_um(0.5)}, expected 17.4"` },
        ],
        hints: ["Thickness is proportional to weight.", "Multiply the weight in ounces by 34.8."],
      },
      {
        kind: "recap",
        points: [
          "The **symbol** is meaning (pins, types); the **footprint** is geometry (pads, outline, courtyard). A wrong footprint or pin mapping is a classic respin, so check them against the datasheet.",
          "A board is **copper layers plus dielectric** (FR-4, εr about 4.2 to 4.7 typical), 2, 4 or 6 layers and about 1.6 mm thick (typical). More layers give planes for power and ground.",
          "**Copper weight** is thickness: 1 oz is about 34.8 µm (often 35 µm), 2 oz about 69.6 µm.",
          "**Vias**: through (cheapest), blind, buried and micro. The last three cost more and need 4 or more layers.",
          "**Solder mask** keeps solder on the pads. **Silkscreen** carries names, pin 1 and polarity. The **outline** tells the fab where to cut.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 5. Placement and routing ───────────────────────────────
  {
    id: "fnd-pcb-5-routing",
    title: "Placement and routing",
    summary: "Place parts first, then route: a small route game with a clearance rule and a decoupling loop, trace width versus current (IPC-2221, simplified), and clearances.",
    minutes: 12,
    xp: 65,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Placement comes first",
        body: P(
          "Layout has two jobs, in this order: **placement** (where each part sits) and **routing** (the copper that joins them). Good placement makes routing easy. Bad placement cannot be rescued by clever routing.",
          "- **Connectors at the edges**, where cables plug in.\n- **Decoupling capacitors right next to the pins** they serve, so the loop to the chip is short.\n- **Group parts by function**: parts that talk to each other stay together, so traces are short.\n- **Noise away from sensitivity**: keep switching regulators, clocks and motor drivers away from analog inputs and small sensor signals.",
          "The widget is a toy board with one copper layer, a power connector J1, a chip U1 and a decoupling capacitor C1 (+ and − pads). In the **Place** phase, tap C1, then tap a free cell to move it. **Rotate C1** turns it. Nothing is routed yet.",
        ),
        widget: { type: "pcb-route", props: { phase: "place" } },
      },
      {
        kind: "question",
        title: "Where does the 100 nF go?",
        body: "Where should the 100 nF decoupling capacitor for U1's supply pin be placed?",
        question: {
          type: "choice",
          options: [
            "Beside the power connector, where the supply enters the board",
            "Anywhere: the schematic already connects it",
            "In the middle of the board, so every chip is equally far from it",
            "As close as possible to the supply pin it serves, with a short path to ground",
          ],
          answer: 3,
          hint: "The capacitor supplies the chip's quick bursts of current. The longer the path, the slower the help arrives.",
          feedback: {
            0: "A capacitor at the connector is a bulk capacitor. It is useful, but too far away to help with a chip's fast bursts.",
            1: "The schematic only says the capacitor is connected. Its place on the board decides how well it works.",
            2: "Each chip needs its own capacitor close by. A shared middle position is far from all of them.",
          },
        },
        explanation: "The capacitor is a tiny local reservoir. Every millimetre of copper between it and the pin adds inductance (rough rule of thumb: about 1 nH per millimetre of loop), which slows the help. So the 100 nF goes **right at the pin**, on the same side if you can, with a short, fat path to ground. Lesson 6 looks at the return path.",
      },
      {
        kind: "explain",
        title: "Routing: roads that must not cross",
        body: P(
          "**Routing** draws the traces that join the pads of each net. On one copper layer, traces are like roads that cannot cross, so the order and the route you choose matter. (Real boards use several layers and vias to hop over each other.)",
          "Here are three nets: **VCC**, **GND** and **SIG** (U1's output to the connector J2). Switch to **Route**, pick a net, and tap cells next to its pads to lay copper; tap the most recent cell again to undo it. Two simple rules:\n- Two nets cannot share a cell.\n- **Toy clearance rule**: copper and pads of different nets must not touch edge to edge. Leave a free cell between them. (Pads of one part are exempt.)",
          "The **decoupling loop** meter counts the steps from U1's VDD pad to C1's + pad, plus C1's − pad to U1's GND pad. Shorter means a smaller loop. In this widget C1 starts far from U1, so the first loop you measure will be long.",
        ),
        widget: { type: "pcb-route", props: { phase: "route" } },
      },
      {
        kind: "question",
        title: "A tidy, tight board",
        body: "Place C1 so the decoupling loop is **3 steps or fewer**, then route **all three nets** with **no clearance errors**.",
        widget: { type: "pcb-route", props: {} },
        question: {
          type: "widget",
          goal: { allRouted: true, maxDrc: 0, maxLoop: 3 },
          prompt: "Move C1 next to U1's power pads, then route VCC, GND and SIG with no clearance errors.",
          hint: "Look at where U1's VDD and GND pads are. A capacitor whose two pads are next to both of them makes the shortest loop. Then route the rest so different nets never touch.",
        },
        explanation: "The tight spot is C1 on the left of U1 with its + pad against VDD and its − pad against GND: loop **2**. Put C1 anywhere else and the loop on this board grows to 6 or more, and traces that run side by side trip the clearance rule. On a real board you would also place the capacitor's ground via right at its pad.",
      },
      {
        kind: "explain",
        title: "How wide must a trace be?",
        body: P(
          "Current flowing through copper heats it (power = I² × R). A trace that is too thin gets too hot. **IPC-2221**, an old standard, gives a simple formula for the width a trace needs to carry a current with a chosen **temperature rise** ΔT above the surroundings:",
          "`I = k · ΔT^0.44 · A^0.725`  (A is the copper cross-section in mil², ΔT in °C, I in amps; k = 0.048 for an outer layer, 0.024 for an inner layer.)",
          "Width = A divided by the copper thickness. Example: **1 A, 10 °C rise, 1 oz outer copper** needs about **12 mil (0.30 mm)**. Inner layers shed heat worse, so the same current needs a wider trace (about 31 mil here).",
          "Try the sliders. In **check** mode you also pick *your* trace width, and the widget turns the formula around to show the temperature rise you would get.",
          "**Safety.** An undersized trace carrying high current gets hot enough to damage the board: it can lift, delaminate or burn. Batteries (lithium cells especially) can deliver very large short-circuit currents, far above the current the circuit normally uses. Protect high-current paths with fuses or protection circuits, and never assume a calculator is a safety guarantee.",
        ),
        widget: { type: "pcb-tracewidth", props: { mode: "check", current: 1, rise: 10, oz: 1, external: true, myWidth: 20 } },
      },
      {
        kind: "question",
        title: "Width for 2 A",
        body: "Use the calculator: how wide must an **outer-layer 1 oz** trace be to carry **2 A** with a **10 °C** temperature rise (IPC-2221)? Answer in mil.",
        widget: { type: "pcb-tracewidth", props: { mode: "calc", current: 1, rise: 20, oz: 1, external: true } },
        question: { type: "number", answer: 30.8, tolerance: 3, unit: "mil", hint: "Set 2 A and a 10 °C rise, with 1 oz and External selected, then read the width in mil." },
        explanation: "About **30.8 mil** (0.78 mm). Doubling the current from 1 A to 2 A does not just double the width: the area grows as I^(1/0.725), about 2.6 times, so the width goes from 11.8 mil to 30.8 mil. (IPC-2152 gives different numbers, so treat this as a first estimate and add margin.)",
      },
      {
        kind: "code",
        title: "The formula in code",
        body: "Write `trace_width_mil(current_a, temp_rise_c, oz, external=True)` that returns the **width in mil** from the IPC-2221 formula.\n\nWith `k = 0.048` (outer) or `0.024` (inner), the area is `A = (I / (k * ΔT**0.44)) ** (1 / 0.725)` in mil², and the width is `A / (oz * 1.378)`, since 1 oz of copper is about 1.378 mil thick.",
        language: "python",
        starter: `def trace_width_mil(current_a, temp_rise_c, oz, external=True):
    # IPC-2221: I = k * dT**0.44 * A**0.725, width = A / (oz * 1.378)
    return 0.0
`,
        solution: `def trace_width_mil(current_a, temp_rise_c, oz, external=True):
    k = 0.048 if external else 0.024
    area = (current_a / (k * temp_rise_c ** 0.44)) ** (1 / 0.725)
    return area / (oz * 1.378)
`,
        tests: [
          { id: "one-amp", description: "1 A, 10 °C, 1 oz, outer: about 11.83 mil", assertionCode: `w = trace_width_mil(1, 10, 1, True)\nassert abs(w - 11.83) / 11.83 < 0.02, f"got {w}, expected about 11.83"` },
          { id: "two-amp", description: "2 A, 10 °C, 1 oz, outer: about 30.76 mil", assertionCode: `w = trace_width_mil(2, 10, 1)\nassert abs(w - 30.76) / 30.76 < 0.02, f"got {w}, expected about 30.76"` },
          { id: "inner", description: "1 A, 10 °C, 1 oz, inner layer: about 30.76 mil (k is halved)", assertionCode: `w = trace_width_mil(1, 10, 1, False)\nassert abs(w - 30.76) / 30.76 < 0.02, f"got {w}, expected about 30.76"` },
          { id: "two-oz", description: "2 oz copper halves the width: 1 A, 10 °C, outer: about 5.91 mil", assertionCode: `w = trace_width_mil(1, 10, 2, True)\nassert abs(w - 5.91) / 5.91 < 0.02, f"got {w}, expected about 5.91"` },
        ],
        hints: ["Choose k first: 0.048 for an outer layer, 0.024 for an inner one.", "Compute the area, then divide it by oz * 1.378 for the width."],
      },
      {
        kind: "explain",
        title: "Clearances and small loops",
        body: P(
          "**Clearance** is the smallest gap allowed between copper of different nets. Two limits set it:\n- **The fab's minimum.** Every fab can etch down to some width and gap. A common figure for low-cost services is about **0.15 mm (6 mil)** (typical; check your fab's capability page). Stay comfortably above it when you can.\n- **Voltage.** The higher the voltage between two nets, the larger the gap must be. IPC-2221 has tables for spacing versus voltage, and for mains-level voltages the gaps grow to millimetres and safety standards (creepage and clearance) apply. That is a job for a safety engineer, not a rule of thumb.",
          "Last, **keep loops small**. A signal and its return current form a loop. A bigger loop area means more inductance (so a slower capacitor, as in the game) and more radiated and picked-up noise. You will see exactly why in lesson 6 (power and ground) and lesson 8 (EMC).",
        ),
      },
      {
        kind: "question",
        title: "Make the trace safe",
        body: "A 3 A supply line on an **outer 1 oz** layer must not rise more than **20 °C**. Set the calculator to that, then set **your trace width** so it stays within the limit.",
        widget: { type: "pcb-tracewidth", props: { mode: "check", current: 1, rise: 10, oz: 1, external: true, myWidth: 20 } },
        question: {
          type: "widget",
          goal: { current: 3, rise: 20, oz: 1, external: true, myOk: true },
          prompt: "Set 3 A and 20 °C on an external 1 oz layer, then widen your trace until its rise is within the limit.",
          hint: "Set the current and the rise first. The needed width appears in the readout; your own trace has to be at least that wide.",
        },
        explanation: "For 3 A and 20 °C the formula asks for about 35 mil (0.9 mm). Any width above that keeps the rise below 20 °C, and a wider trace also wastes less power. In practice you would pick a round, generous width such as 1 mm, because IPC-2221 is an estimate.",
      },
      {
        kind: "recap",
        points: [
          "**Place first, then route.** Connectors at the edge, decoupling right at the pins, parts grouped by function, noisy away from sensitive.",
          "On one layer, traces of different nets cannot cross or touch. Layers and vias exist to let routes hop over each other.",
          "IPC-2221: **I = k · ΔT^0.44 · A^0.725** gives the copper area for a current and a temperature rise. 1 A, 10 °C, 1 oz outer needs about 12 mil. Inner layers need more, and IPC-2152 is the modern reference.",
          "**Clearance** is set by the fab's minimum (about 6 mil / 0.15 mm for cheap services, typical) and by voltage. **Keep loops small.**",
          "Undersized traces on high-current paths can overheat, delaminate or burn, and batteries can supply huge short-circuit currents: protect them.",
        ],
      },
    ],
  },
];
