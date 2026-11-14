import type { ConceptLesson } from "../../learn/types.ts";

/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/**
 * Lessons 6 to 9 of "Building real products": debugging, testing, certification and shipping Sprout.
 * Lab values, prices, yields and return counts are made-up round numbers for teaching. Standards and marks are
 * named as examples; nothing here is legal or compliance advice.
 */
export const productsLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 6. Debugging hardware ───────────────────────────────
  {
    id: "fnd-prod-6-debugging",
    title: "Debugging hardware",
    summary: "A systematic method and five tools (multimeter, oscilloscope, logic analyser, debugger, logs): follow the evidence in four Sprout bugs.",
    level: "Advanced",
    minutes: 11,
    xp: 75,
    steps: [
      {
        kind: "explain",
        title: "A method, not a guess",
        body: P(
          "Hardware bugs are slippery: the cause may be the board, the firmware, the power, or the way you are measuring. Guessing and changing five things at once makes it worse. Use a method:",
          "- **Observe** exactly what happens, and when (cold only? only while sending?).\n- **Guess** a cause, as specific as you can.\n- **Pick the cheapest measurement that could prove the guess wrong.**\n- **Change one thing at a time**, and write down what you tried.",
          "Different tools answer different questions:",
          "- **Multimeter**: DC voltage, resistance, continuity. Slow and averaged, so it misses anything brief.\n- **Oscilloscope**: voltage against time. Shows analog problems: dips, ringing, noise, slow edges.\n- **Logic analyser**: many digital lines at once, with protocol decoders (I²C, SPI, UART). Shows what was said, not the voltage quality.\n- **Debugger**: connects to the chip over **SWD** or **JTAG**; halts the core, steps, sets breakpoints, reads registers and memory.\n- **Logs**: text the firmware prints. Cheap and always there, but it only knows what the firmware knows.",
        ),
      },
      {
        kind: "question",
        title: "Pick the tool",
        body: "You want to know whether Sprout's supply rail stays steady during a **3 ms** radio burst. Which tool shows it?",
        question: {
          type: "choice",
          options: ["A multimeter on DC volts", "A logic analyser on the I²C lines", "The firmware's log output", "An oscilloscope on the rail, triggered on a falling edge"],
          answer: 3,
          hint: "You need voltage over time, fast enough to catch a few milliseconds.",
          feedback: {
            0: "A meter averages and updates a few times a second. A 3 ms dip passes unseen.",
            1: "A logic analyser sees high or low on digital lines. It cannot show the quality of the supply voltage.",
            2: "The firmware only knows its own variables. It cannot see a supply dip unless the chip happens to report one.",
          },
        },
        explanation: "A scope draws voltage against time and can catch a one-off event with a **trigger**: tell it to freeze the picture when the signal falls through a level. That is how you see a brief dip that a meter averages away.",
      },
      {
        kind: "question",
        title: "Case 1: it resets in the cold",
        body: "Sprout resets whenever it starts to send, but only in the fridge. Try the tools, then pick the **root cause**.",
        widget: { type: "prod-detective", props: { cases: ["cold-reset"] }, live: true },
        question: { type: "widget", goal: { solved: ["cold-reset"] }, hint: "The oscilloscope (or the debugger's reset-cause register) points at one place: the supply rail." },
        explanation: "Cold makes a coin cell's internal resistance climb, so a 10 mA burst drops the rail: V = V_open − I × R_int. Once it falls below the chip's brown-out level the chip resets, which lines up with the radio start. After you solve it, the widget lets you try bulk capacitors: C ≈ I × t / ΔV gives the idea, and a 220 µF capacitor keeps the rail well above the threshold in this model.",
      },
      {
        kind: "explain",
        title: "Using a scope well",
        body: P(
          "A scope hides as many bugs as it finds if you use it carelessly.",
          "- **Trigger.** The trigger picks *which moment* to show. Use an **edge** trigger on the signal you care about, set the level, and use **single-shot** mode to catch rare events.\n- **Probe.** Use a **×10 passive probe** (it loads the circuit less) and a **short ground**: a probe's long ground lead is an antenna that creates ringing that is not on the board. If a problem vanishes with a ground spring, it was your probe.\n- **Bandwidth.** The scope must be fast enough. A common rule of thumb is a bandwidth of **at least about 3 to 5 times** the highest frequency you care about. Another is that the bandwidth needed is about **0.35 ÷ the rise time** of the edge you want to see. Fast edges contain frequencies far above the clock rate.",
          "Scopes also have a **bandwidth limit** switch (often 20 MHz) to cut noise. Leave it on when you hunt for a ringing edge and the ringing disappears. You will see exactly that in a moment.",
        ),
      },
      {
        kind: "question",
        title: "How fast a scope?",
        body: "You want to look at the shape of a **20 MHz** signal. Using the **5×** rule of thumb, what is the minimum scope bandwidth, in MHz?",
        question: { type: "number", hint: "Multiply the signal frequency by 5.", answer: 100, tolerance: 0.5, unit: "MHz" },
        explanation: "5 × 20 MHz = **100 MHz**. With the 3× end of the rule it is 60 MHz. Either way, a scope limited to 20 MHz would draw the signal as a blurry, rounded wave and hide its details. These are rules of thumb: the real need depends on what you want to see.",
      },
      {
        kind: "question",
        title: "Case 2: flash errors at speed",
        body: "Settings saved in the SPI flash get corrupted at 16 MHz, but are fine at 1 MHz. Use the scope **and try both bandwidth settings**, then diagnose.",
        widget: { type: "prod-detective", props: { cases: ["flash-fast"] } },
        question: { type: "widget", goal: { solved: ["flash-fast"] }, hint: "Look at the scope on full bandwidth. What happens to the clock edge after it rises?" },
        explanation: "At full bandwidth the clock rings: it overshoots, then dips back under the flash's input-high level, so the chip can count a false clock edge. With the 20 MHz limit on, the ringing was invisible. A logic analyser would not have shown it either, because it only reports high or low. Fix it at the source with a series resistor, a shorter trace or a slower edge, as the *Signal integrity* lesson in *Components and PCB design* explains.",
      },
      {
        kind: "explain",
        title: "Reading a bus: the logic analyser",
        body: P(
          "A **logic analyser** records several digital lines at once and a **protocol decoder** turns the wiggles into bytes. On an **I²C** bus (see *Talking to other chips* in the embedded module) every transaction starts with an address byte: the 7-bit device address in the top seven bits and a read/write bit in the lowest bit (0 for write, 1 for read). The device answers on the ninth clock by pulling the data line low: an **ACK**. If nobody answers the line stays high: a **NACK**.",
          "Try the case below: the light sensor never answers. The decoder shows what the chip *asked for*. Compare it with the other tools' evidence.",
        ),
        widget: { type: "prod-detective", props: { cases: ["silent-sensor"] } },
      },
      {
        kind: "question",
        title: "The byte on the wire",
        body: "The firmware writes to the light sensor at address **0x44**. The first byte on the bus is the address shifted left by one with a write bit of 0. What is that byte as a **decimal** number? (0x44 is 68.)",
        question: { type: "number", hint: "Shifting left by one bit means multiplying by 2. The write bit adds 0.", answer: 136, tolerance: 0 },
        explanation: "68 × 2 = 136, which is 0x88 in hex. A sensor strapped to 0x45 would expect 0x8A (138), so it ignores the 0x88 and nobody pulls the data line low: a NACK. The decoded bus told you the *address* in one look, which no other tool did.",
      },
      {
        kind: "question",
        title: "Case 3: random reboots",
        body: "Every few hours Sprout reboots, with no pattern. Choose your tools wisely: some will tell you nothing here. Then pick the root cause.",
        widget: { type: "prod-detective", props: { cases: ["random-reboot"] } },
        question: { type: "widget", goal: { solved: ["random-reboot"] }, hint: "Read the log and the debugger's reset cause. A scope on the supply for six hours saw nothing." },
        explanation: "The reset cause says watchdog and the log names the stuck function. A watchdog is a timer the firmware must keep restarting; here an endless retry loop stopped feeding it. Compare **printf-style logs** (easy, but slow and they change timing) with **tracing** (the chip streams events with little disturbance) and **debugger breakpoints** (they stop the world, which breaks real-time behaviour). Choose the one that disturbs the bug least.",
      },
      {
        kind: "recap",
        points: [
          "Use a method: **observe, guess, find the cheapest measurement that could prove it wrong, change one thing at a time**.",
          "Multimeters average; **scopes** show voltage over time (trigger, short ground, enough bandwidth, about 3 to 5 times the frequency of interest as a rule of thumb); **logic analysers** decode digital buses; **debuggers** read the chip; **logs** only know what firmware knows.",
          "A brown-out reset that lines up with the radio burst points at a **weak battery or missing bulk capacitor**: V = V_open − I × R_int.",
          "An I²C **NACK** on the address byte means nobody answered at that address: check the address before the wiring.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Testing ───────────────────────────────
  {
    id: "fnd-prod-7-testing",
    title: "Testing: from host tests to the production line",
    summary: "Put each bug in the cheapest test layer, understand hardware-in-the-loop and environmental tests, and see how a five-station production test sets first-pass yield.",
    level: "Advanced",
    minutes: 10,
    xp: 75,
    steps: [
      {
        kind: "explain",
        title: "A pyramid of tests",
        body: P(
          "A test is only useful if it runs. Tests that are fast and cheap run constantly; tests that need chambers and weeks of waiting run rarely. So products use a **pyramid**: many quick tests at the bottom, fewer slow ones above.",
          "- **Host tests**: your firmware's logic compiled and run on a laptop, with fake hardware behind the HAL. Thousands, in seconds.\n- **Hardware in the loop (HIL)**: a real board on a rig, driven by a script that plays the part of the phone and the environment.\n- **Environmental and reliability tests**: temperature, humidity, drops, long runs.\n- **Production test**: a quick check of *every single unit* after it is built.",
          "Each bug is cheapest to find at the lowest layer that *can* show it. Place five Sprout bugs.",
        ),
        widget: { type: "prod-pyramid", props: {} },
      },
      {
        kind: "question",
        title: "Cheapest place to catch it",
        body: "Match each bug to the cheapest test layer that can catch it.",
        widget: { type: "prod-pyramid", props: {} },
        question: { type: "widget", goal: { allCorrect: true }, hint: "Ask what the bug needs in order to show up: just code, a real chip, real weather, or one particular unit." },
        explanation: "A pure arithmetic or parsing bug needs only code, so a host test catches it in milliseconds. A timing problem with a real chip needs the chip. A cold-and-damp radio problem needs a chamber. A one-off cold solder joint can only be found by testing every unit as it leaves the line. Skipping a layer does not remove the bug; it just means a customer finds it.",
      },
      {
        kind: "explain",
        title: "Hardware in the loop and the environment",
        body: P(
          "A **hardware-in-the-loop** rig holds a real Sprout board and surrounds it with fakes: a controllable power supply (to test low battery), a **simulated phone** that pairs and receives readings, and a way to fake soil moisture (a set of known capacitors or a controllable signal). A script runs hundreds of scenarios overnight and records pass or fail. It finds timing bugs and integration bugs that host tests cannot.",
          "**Environmental and reliability testing** asks whether the product survives the real world. Common examples: **temperature cycling** (hot and cold swings that crack solder joints), **humidity**, **drop and vibration**, **ESD** (static zaps), and **burn-in or life tests** that run many units for a long time. Some tests are accelerated (hotter or faster than reality) to find weak points sooner, but accelerated results need care to interpret.",
        ),
      },
      {
        kind: "question",
        title: "What is HIL?",
        body: "Which best describes **hardware-in-the-loop** testing for Sprout?",
        question: {
          type: "choice",
          options: [
            "Running the firmware's logic on a laptop with a fake HAL",
            "Leaving a unit in a garden for a season and watching",
            "A script drives a real board on a rig that fakes the phone, power and sensor inputs, and checks the results",
            "Someone tapping through the phone app by hand",
          ],
          answer: 2,
          hint: "The key words are 'hardware' (a real board) and 'loop' (the rig closes the loop around it with simulated surroundings).",
          feedback: {
            0: "That is a host test: there is no real hardware in it.",
            1: "A field trial is valuable, but it is manual and slow, not a scripted rig.",
            3: "Manual app testing is useful, but HIL means automated scripts with a real board in a rig.",
          },
        },
        explanation: "The real board is the 'hardware'; the rig and scripts that provide inputs and read outputs close the 'loop' around it. Because it is automated, it can run every night. Host tests prove the logic; HIL proves the logic works on the real chip with real timing.",
      },
      {
        kind: "explain",
        title: "The production test line",
        body: P(
          "Every Sprout board that leaves the factory must be checked, in seconds, by a **test fixture**: a jig with spring-loaded **pogo pins** that touch test pads on the board, a power supply, a programmer and a small computer. A typical station flow is the one below. Each station catches a different failure and takes a few seconds, so you balance **coverage** against **time**.",
          "The share of boards that pass **every station the first time** is the **first-pass yield (FPY)**: multiply the pass rates. Boards that fail go to rework (inspect, repair, retest) which costs time and money. Set each station's pass rate and watch the total.",
        ),
        widget: { type: "prod-testflow", props: {} },
      },
      {
        kind: "question",
        title: "Raise the yield",
        body: "With the starting rates the first-pass yield is about 94%. Improve the stations (for example, tighten the process that causes the lowest pass rates) until the **first-pass yield is at least 97%**.",
        widget: { type: "prod-testflow", props: {} },
        question: { type: "widget", goal: { minFpy: 0.97 }, hint: "Start with the station with the lowest pass rate: the highlighted one. Several stations under 99% together cost a lot." },
        explanation: "Yield multiplies, so a few small leaks add up. Five stations at 99.5% give about 97.5%, but one weak station drags the whole line. In practice you track the loss by station (a Pareto chart, coming up in the last lesson) and fix the biggest cause first.",
      },
      {
        kind: "question",
        title: "Compute the first-pass yield",
        body: "A three-station line has pass rates of **99%, 98% and 97%**. What is the first-pass yield, in percent? (One decimal place.)",
        question: { type: "number", hint: "Multiply the three pass rates as decimals, then turn the result into a percentage.", answer: 94.1, tolerance: 0.2, unit: "%" },
        explanation: "0.99 × 0.98 × 0.97 = 0.9411, so **94.1%**. Out of 1,000 boards about 59 need rework even though no single station is worse than 97%. Yields do not add: they multiply.",
      },
      {
        kind: "code",
        title: "First-pass yield",
        body: P(
          "Write `first_pass_yield(rates)`. `rates` is a list of pass rates (each between 0 and 1), one per station. Return the first-pass yield: all the rates multiplied together, **rounded to 4 decimals**. An empty list means no tests, so everything passes: return `1.0`.",
        ),
        language: "python",
        starter: `def first_pass_yield(rates):
    # the share of boards that pass every station the first time
    return 0.0
`,
        solution: `def first_pass_yield(rates):
    total = 1.0
    for r in rates:
        total *= r
    return round(total, 4)
`,
        tests: [
          { id: "two", description: "Two stations: 0.99 × 0.98 = 0.9702", assertionCode: `assert first_pass_yield([0.99, 0.98]) == 0.9702, f"expected 0.9702, got {first_pass_yield([0.99, 0.98])}"` },
          { id: "three", description: "Three stations at 0.9 give 0.729", assertionCode: `assert first_pass_yield([0.9, 0.9, 0.9]) == 0.729, f"expected 0.729, got {first_pass_yield([0.9, 0.9, 0.9])}"` },
          { id: "perfect", description: "Perfect stations give 1.0", assertionCode: `assert first_pass_yield([1.0, 1.0, 1.0]) == 1.0, f"expected 1.0, got {first_pass_yield([1.0, 1.0, 1.0])}"` },
          { id: "none", description: "No stations means everything passes", assertionCode: `assert first_pass_yield([]) == 1.0, f"an empty line should pass everything, got {first_pass_yield([])}"` },
        ],
        hints: ["Start with `total = 1.0` and multiply each rate into it.", "Finish with `round(total, 4)`."],
      },
      {
        kind: "question",
        title: "Design for test",
        body: "Why must **test pads and the fixture contacts** be planned while the board is being designed, not after it is built?",
        question: {
          type: "choice",
          options: [
            "Because pogo pins need pads of a certain size and spacing in known places, and nothing can be added to a finished board",
            "Because the pads make the board look better",
            "Because the law requires them",
            "Because the firmware needs them to boot",
          ],
          answer: 0,
          hint: "Think about how a fixture touches the board and what you can change on a board that is already made.",
          feedback: {
            1: "Test pads are not about looks. They are copper circles for a pin to press on.",
            2: "There is no general law about test pads. They are an engineering choice to make testing quick and cheap.",
            3: "Firmware does not need test pads to boot. Pads are there so a fixture can reach signals.",
          },
        },
        explanation: "A fixture's pins touch fixed pads, so pad position and size are set when the board is laid out (the Rev A advice of test points, again). Hunting a missing contact after the boards are made means a board respin or probing by hand, which is slow and unreliable on a line.",
      },
      {
        kind: "recap",
        points: [
          "Use a **pyramid**: many fast host tests, fewer HIL tests, few slow environmental tests, and a production test of every unit.",
          "Catch each bug at the **cheapest layer that can show it**: code bugs on the host, chip timing in HIL, weather in chambers, one-off defects on the line.",
          "A **fixture** with pogo pins checks every board in seconds; **first-pass yield** is the product of station pass rates, so many small losses add up.",
          "Design **test points** and fixture contacts into the board from the start.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. Certification and safety ───────────────────────────────
  {
    id: "fnd-prod-8-certification",
    title: "Certification and safety",
    summary: "Radio rules, EMC, battery safety and shipping lithium cells for Sprout, why pre-certified modules save time, and a sensible path to the test lab.",
    level: "Advanced",
    minutes: 10,
    xp: 75,
    steps: [
      {
        kind: "explain",
        title: "Why products need approval",
        body: P(
          "You cannot simply sell a radio device anywhere. Radio spectrum is shared, so every region sets rules that stop devices from jamming each other. Electrical products must not give noise to others (and must keep working in noise), and they must not hurt the people using them. Rules exist for batteries too.",
          "The names differ by region. Some **examples**: **FCC** (United States), **CE** with the **RED** radio equipment directive (European Union), **UKCA** (United Kingdom) and **ISED** (Canada). Which rules apply to *your* product depends on what it is, where it is sold and when, and rules change. Treat everything here as an outline and **ask a test lab** (and a lawyer where it matters) for your product.",
          "Below is a planner for Sprout. Change the radio, the battery and the markets, and see what has to be tested.",
        ),
        widget: { type: "prod-cert", props: {} },
      },
      {
        kind: "question",
        title: "A light plan",
        body: "Plan Sprout for **three or more markets** using a **pre-certified radio module** and keep the total effort at **6 points or fewer**. Choose the battery that makes that possible.",
        widget: { type: "prod-cert", props: {} },
        question: { type: "widget", goal: { radio: "module", maxEffort: 6, minMarkets: 3 }, hint: "Lithium cells add a shipping item, and a rechargeable Li-ion pack adds safety testing. Which battery avoids both?" },
        explanation: "Alkaline AA cells avoid the lithium shipping item and the pack safety work, and the module avoids new radio design and testing. Effort points are made-up units that only compare plans, but the pattern is real: every lithium or radio design choice adds work that a simpler choice does not.",
      },
      {
        kind: "explain",
        title: "Radio modules and their conditions",
        body: P(
          "A **pre-certified module** comes with test results from the maker, so you do not repeat the full radio testing. That saves a lot of time and money. But it saves it **under conditions** that the maker lists: usually which antennas are allowed, how the module must be mounted and powered, and what label text the product needs.",
          "Break the conditions and the saving may not apply. Also remember what a module does *not* cover: the finished product's own **EMC** (your board, cables and other circuits), its **safety**, and its **battery** rules. You are still responsible for the whole product.",
        ),
      },
      {
        kind: "question",
        title: "A different antenna",
        body: "Your pre-certified module's approval lists one specific antenna. To save a little space you plan to use a different antenna. What should you do?",
        question: {
          type: "choice",
          options: ["Nothing: the module is certified, so any antenna is fine", "Ask the module maker and a test lab whether the change keeps the approval, before you commit to it", "Remove the label so nobody asks", "Test with a meter that the antenna connects"],
          answer: 1,
          hint: "The approval was for a particular combination. What happens when you change part of it?",
          feedback: {
            0: "The approval covers the listed antenna. A different antenna changes how much power is radiated and where, which is what the rules limit.",
            2: "Removing the label does not remove the rules. Selling an unapproved radio device can be illegal and costly.",
            3: "A meter shows the antenna is connected, not that the radio's emissions are within the limits.",
          },
        },
        explanation: "Approvals are granted for a tested configuration. A different antenna can change radiated power and emissions, so the maker's conditions must be followed, or the change must be re-evaluated or re-tested. Ask early, before the board layout is final.",
      },
      {
        kind: "explain",
        title: "EMC: noise out, noise in",
        body: P(
          "**EMC** (electromagnetic compatibility) has two sides. **Emissions**: the product must not radiate or conduct more noise than the limits allow. **Immunity**: it must keep working when disturbed, for example by a static zap (ESD) or a nearby transmitter. The *EMC* lesson in *Components and PCB design* explains why boards radiate (loops, return paths) and how to fix it (decoupling, ground planes, filters).",
          "Fast digital edges produce noise at many multiples of their clock frequency (**harmonics**). A square wave contains its **odd harmonics** (1×, 3×, 5× and so on) at lower and lower strength. In the US, the limit tables for unintentional radiators start at 30 MHz as an example, so a 16 MHz clock's 3rd harmonic (48 MHz) lands inside the tested range.",
          "A good habit is **pre-compliance testing**: a rough early check, with a near-field probe and a spectrum analyser or a cheap scope, that finds big problems before you pay for a real test lab. It is not a certificate, only a way to avoid a failed formal test.",
        ),
      },
      {
        kind: "question",
        title: "Harmonics of a clock",
        body: "Sprout's SPI clock is a 16 MHz square wave. At what frequency is its **5th harmonic**, in MHz?",
        question: { type: "number", hint: "Multiply the clock frequency by 5.", answer: 80, tolerance: 0.5, unit: "MHz" },
        explanation: "The nth harmonic is n times the fundamental: 5 × 16 MHz = **80 MHz**. A square wave has strong odd harmonics, so noise shows up at 48, 80, 112 MHz and so on. This is why slowing an edge with a small series resistor reduces emissions: it removes the high harmonics.",
      },
      {
        kind: "explain",
        title: "Batteries and safety",
        body: P(
          "**Safety.** Lithium cells store a lot of energy in a small space. A damaged, shorted or overcharged lithium-ion pack can overheat and burn. Sprout's alkaline or lithium **primary** (not rechargeable) cells are the lowest risk. If you choose a **rechargeable lithium-ion** pack you also need a protection circuit, a safe charger, and safety-tested cells or packs (**IEC 62133** is an example standard). Never experiment with bare lithium cells.",
          "**Shipping.** Lithium cells and batteries are regulated for transport, and your product may count. **UN 38.3** is an example: a set of tests that lithium cells and batteries must pass to be shipped. Carriers add packaging and labelling rules, and air freight is stricter. Cell makers often supply the test summary for their cells, but the rules for a finished product with a battery inside can differ. Ask your carrier and a test lab.",
          "Also remember the paperwork around materials and end of life (for example restrictions on hazardous substances such as **RoHS**, and battery and electronics recycling rules).",
        ),
      },
      {
        kind: "question",
        title: "What changes with Li-ion?",
        body: "Sprout switches from alkaline cells to a rechargeable **lithium-ion** pack with a USB charger. Which new items appear on the plan?",
        question: {
          type: "choice",
          options: [
            "None: a battery is a battery",
            "Only a different colour of case",
            "The product no longer needs EMC testing",
            "A protection circuit and pack safety testing, a charger design, and lithium shipping rules",
          ],
          answer: 3,
          hint: "Think about what can go wrong with a big store of energy that you can recharge, and what carriers worry about.",
          feedback: {
            0: "Chemistries differ greatly in safety and shipping. A rechargeable lithium pack is a bigger deal than two alkaline cells.",
            1: "The case colour has nothing to do with safety or shipping rules.",
            2: "EMC still applies, and a charger and switching converters often add new noise to test.",
          },
        },
        explanation: "A rechargeable lithium pack adds cell and pack safety, the charger's design and safety, and lithium transport rules. Each is extra work, time and money, which is why a cheap sensor on alkaline cells keeps the plan light.",
      },
      {
        kind: "question",
        title: "A path to the lab",
        body: "Put a sensible certification path in order.",
        question: {
          type: "order", hint: "Do the cheap, early checks before the expensive formal tests, and the paperwork after the tests pass.",
          items: [
            "Choose a pre-certified module and follow its integration rules",
            "Run pre-compliance checks on a prototype",
            "Fix the emissions and immunity problems found",
            "Book an accredited test lab for the formal tests",
            "Assemble the documentation and apply the required marks",
            "Ship",
          ],
        },
        explanation: "Cheap checks first, formal tests last: fixing a failure at the lab means a repeat test fee and weeks of delay. Documentation and marks come after the tests pass. Which marks and documents you need depends on the region, so confirm them with the lab.",
      },
      {
        kind: "recap",
        points: [
          "Radio, EMC, safety and batteries are regulated; **FCC, CE/RED, UKCA and ISED** are examples by region. Always **ask a test lab** which rules apply.",
          "A **pre-certified radio module** saves radio design and testing, but only if you follow its conditions, and you remain responsible for the finished product's EMC and safety.",
          "EMC covers emissions and immunity. Fast edges make **harmonics**, and **pre-compliance** testing finds problems before the lab does.",
          "Lithium cells need care: pack **safety** (for example IEC 62133) and **shipping** rules (for example UN 38.3).",
        ],
      },
    ],
  },

  // ─────────────────────────────── 9. Shipping and living in the field ───────────────────────────────
  {
    id: "fnd-prod-9-shipping",
    title: "Shipping and living in the field",
    summary: "Scale up, ship updates safely with A/B slots and rollback, read field returns with a Pareto chart, and plan the next hardware revision.",
    level: "Professional",
    minutes: 12,
    xp: 90,
    steps: [
      {
        kind: "explain",
        title: "From a hundred to ten thousand",
        body: P(
          "Sprout passes its tests and is certified. Now a **contract manufacturer** will build thousands. Everything you learned meets reality: a board must be built by machines from reels of parts (see *Manufacturing the board* in *Components and PCB design*), tested in seconds, and packed. Three numbers decide whether you make money: **cost, yield and lead time**.",
          "Cost falls with volume as parts move into cheaper price breaks, and the factory spreads its setup costs. **DFM** (design for manufacture) means designing so the factory makes it right easily: standard parts, generous spacing, test pads, and no part that is hard to get. A shortage of one cheap part can stop the whole line.",
          "Look at Sprout's parts cost at 1,000 and at 10,000 units. Pick the same parts as before and compare.",
        ),
        widget: { type: "prod-architecture", props: {}, live: true },
      },
      {
        kind: "question",
        title: "What volume saves",
        body: "In the made-up price model, Sprout's parts cost **$8.85** per board at 1,000 units and **$7.06** at 10,000 units. Over a run of **10,000 boards**, how many dollars less do you spend on parts than if each still cost $8.85?",
        question: { type: "number", hint: "Subtract the two per-board costs, then multiply by the number of boards.", answer: 17900, tolerance: 100, unit: "$" },
        explanation: "($8.85 − $7.06) × 10,000 = $1.79 × 10,000 = **$17,900**. That is only the parts. Volume also helps assembly and test costs, but lead times and the minimum order sizes get bigger too, which is cash tied up in stock.",
      },
      {
        kind: "explain",
        title: "Secure boot and updates over the air",
        body: P(
          "Once units are in homes you will need to fix bugs without visiting each pot. An **OTA** (over-the-air) update sends new firmware over the radio. That is powerful and dangerous: a bad update, or a fake one, could break every unit.",
          "Two protections matter. **Secure boot**: the chip checks, at every start, that the firmware is **signed** by your private key, using a public key stored in the device, and refuses to run anything else. **Safe updates**: keep **two firmware slots (A and B)**. Download into the slot you are *not* running, verify the signature, try it once, and switch only after the new firmware proves itself. If it crashes, the bootloader rolls back to the old slot. Step through four situations. (Open-source bootloaders such as MCUboot work this way; there are many commercial options too.)",
        ),
        widget: { type: "prod-ota", props: {} },
      },
      {
        kind: "question",
        title: "Survive the bad update",
        body: "Run **two** scenarios to the end: the **tampered image** and the **update that crashes**. Notice what slot the device is left running in each case.",
        widget: { type: "prod-ota", props: {} },
        question: { type: "widget", goal: { seen: ["tampered", "crash"] }, hint: "Choose a scenario, then press Next step until it says Finished. Then pick the other scenario and repeat." },
        explanation: "In both cases the old firmware (slot A) is still there and still runs. That is why the old image is kept until the new one has confirmed itself: if the new image never proves it works, the device returns to the last known good one. Without A/B slots, an interrupted or faulty update can leave a **bricked** unit that needs a repair or return.",
      },
      {
        kind: "explain",
        title: "Learning from returns",
        body: P(
          "Units fail in ways no test predicted. Track every return and its cause, then draw a **Pareto chart**: causes sorted from most to fewest, with a running total. The pattern is common: a few causes make up most of the problem, so you fix the top bars first. (This is the same idea as ranking risks, now with real data.)",
          "Here are last quarter's returns for Sprout. Tap a cause to mark it fixed in the next revision and watch the return rate fall.",
        ),
        widget: { type: "prod-pareto", props: {} },
      },
      {
        kind: "question",
        title: "Fix the top two",
        body: "Mark causes as fixed so that the return rate falls to **1.0% or less**. Which two give the biggest drop?",
        widget: { type: "prod-pareto", props: {} },
        question: { type: "widget", goal: { maxRate: 1.0 }, hint: "Fix the longest bars. Each bar's count is the number of returns it removes." },
        explanation: "Fixing the two biggest causes (coating and pairing, 125 returns) removes 59% of all returns and cuts the rate from 2.11% to 0.86%. Fixing the two smallest would barely move it. Notice that only some of these can be fixed by firmware: pairing can, a peeling coating cannot.",
      },
      {
        kind: "code",
        title: "How much do the top causes cover?",
        body: P(
          "Write `pareto_share(counts, k)`. `counts` is a list of how many returns each cause had (in any order). Return the **fraction** of all returns that the **k largest** causes account for, rounded to 3 decimals. If `k` is 0, the answer is 0.0.",
        ),
        language: "python",
        starter: `def pareto_share(counts, k):
    # fraction of all returns covered by the k biggest causes
    return 0.0
`,
        solution: `def pareto_share(counts, k):
    total = sum(counts)
    if total == 0:
        return 0.0
    top = sorted(counts, reverse=True)[:k]
    return round(sum(top) / total, 3)
`,
        tests: [
          { id: "sprout", description: "Sprout's counts: the top two cover 125 of 211", assertionCode: `s = pareto_share([71, 54, 38, 22, 17, 9], 2)\nassert s == 0.592, f"expected 0.592, got {s}"` },
          { id: "unsorted", description: "The input is not sorted: the biggest cause is 50 of 100", assertionCode: `s = pareto_share([5, 50, 5, 40], 1)\nassert s == 0.5, f"expected 0.5, got {s}"` },
          { id: "all", description: "All the causes cover everything; none cover nothing", assertionCode: `assert pareto_share([3, 2, 1], 3) == 1.0, "all causes should cover 100%"\nassert pareto_share([3, 2, 1], 0) == 0.0, "no causes cover nothing"` },
          { id: "half", description: "Two of four equal causes cover half", assertionCode: `assert pareto_share([10, 10, 10, 10], 2) == 0.5, "two of four equal causes should cover half"` },
        ],
        hints: ["Sort the counts from largest to smallest with `sorted(counts, reverse=True)`, then take the first `k`.", "Divide the sum of the top `k` by the sum of all counts, and round to 3 places."],
      },
      {
        kind: "explain",
        title: "The next hardware revision",
        body: P(
          "No product is finished. Sprout's first year of data suggests **Rev B**: a 220 µF bulk capacitor to fix cold resets, a better probe coating, a stronger battery cover, and a firmware update for the phone models that fail to pair. Changing hardware formally is an **ECO** (engineering change order): the change is described, reviewed, tested, and tracked by revision so you always know which boards have which fix. Recertify if the change could affect radio, EMC or safety.",
          "A firmware update is cheap and fast; a hardware change means new boards and stock. So put as much as you can in firmware, and learn which problems *only* hardware can fix.",
          "**In practice.** Teams use CAD tools such as **KiCad** or **Altium** for boards, and revision-control for firmware and design files. They debug with oscilloscopes and logic analysers, probes such as **J-Link** or open-source **OpenOCD** for the debug connection, and an accredited test lab for certification. Certification and tooling cost real money (lab fees alone can run into thousands or tens of thousands of dollars for a radio product; an order of magnitude, not a quote), so plan the money and the schedule along with the design. Skills like the ones in this module are what make that spending go as far as it can.",
        ),
      },
      {
        kind: "question",
        title: "What can an update fix?",
        body: "Select **all** the Rev B problems that an over-the-air **firmware** update could fix.",
        question: {
          type: "choice",
          options: ["Pairing fails on some phone models", "The probe coating peels in wet soil", "The battery cover cracks", "A retry loop that keeps the radio on and drains the battery"],
          answer: [0, 3],
          hint: "Which problems are caused by what the software does, and which are about physical materials?",
          feedback: {
            1: "A coating is a physical material. No firmware change can glue it back on.",
            2: "A cracked cover is plastic. Only a new part or a redesign fixes it.",
          },
        },
        explanation: "Pairing and the retry loop are software behaviour, so an update can fix them. A peeling coating and a cracked cover are physical, and need a new revision. This split is why you design OTA in from the start, and why you test the physical parts hard before shipping.",
      },
      {
        kind: "recap",
        points: [
          "Scaling up is about **cost, yield and lead time**: price breaks lower the BOM, and **DFM** keeps the factory from stumbling.",
          "**Secure boot** only runs signed firmware; **A/B slots** with a trial boot and rollback make OTA updates safe against bad images, tampering and power loss.",
          "A **Pareto chart** of field returns shows which causes to fix first; some need firmware, some need new hardware.",
          "A hardware revision goes through a change process (**ECO**) and may need recertification; budget for tools, test labs and time, not just parts.",
        ],
      },
    ],
  },
];
