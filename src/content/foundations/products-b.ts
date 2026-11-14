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
        body: "Each 300 ms radio burst starts with a **3 ms** pulse of current. You want to know whether Sprout's supply rail stays steady during that pulse. Which tool shows it?",
        question: {
          type: "choice",
          options: ["An oscilloscope on the rail, with a trigger", "A multimeter on DC volts, read by eye", "A logic analyser on the I²C lines", "The firmware's log output over UART"],
          answer: 0,
          hint: "You need voltage over time, fast enough to catch a few milliseconds.",
          feedback: {
            1: "A meter averages and updates a few times a second. A 3 ms dip passes unseen.",
            2: "A logic analyser sees high or low on digital lines. It cannot show the quality of the supply voltage.",
            3: "The firmware only knows its own variables. It cannot see a supply dip unless the chip happens to report one.",
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
        explanation: "Cold makes a coin cell's internal resistance climb, so the 10 mA pulse drops the rail: V = V_open − I × R_int. Once it falls below the chip's brown-out level the chip resets, which lines up with the radio start. After you solve it, the widget lets you try bulk capacitors: the charge idea Q = CV from *Capacitors* in *Components in action: capacitors to op-amps* gives C ≈ I × t / ΔV as a first estimate, and a 220 µF capacitor keeps the rail well above the threshold in this model. Found on Rev A in the lab, it goes into **Rev B**, the DVT build, long before any customer sees it.",
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
        title: "Fast enough to decode?",
        body: P(
          "A logic analyser only sees a line at each **sample**, so it must sample much faster than the signal changes. A common rule of thumb is at least 4 samples per clock period, and about 10 to be comfortable.",
          "Sprout's I²C bus runs at **400 kHz** and your analyser is set to **4 MS/s** (4 million samples per second). How many samples land in each clock period?",
        ),
        question: { type: "number", hint: "Divide the sample rate by the clock frequency, in the same units (4,000,000 ÷ 400,000).", answer: 10, tolerance: 0.1, unit: "samples" },
        explanation: "4,000,000 ÷ 400,000 = **10 samples per clock period**: enough for the decoder to place every edge. At 1 MS/s you would get only 2.5, edges would land between samples and the decoder could misread bits. A faster rate costs memory, so match it to the bus. (The address byte itself, 0x44 shifted to 0x88, is covered in *Talking to other chips*.)",
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
          "Each bug is cheapest to find at the lowest layer that *can* show it. Warm up on four practice bugs; each pick is marked as you go.",
        ),
        widget: { type: "prod-pyramid", props: { practice: true } },
      },
      {
        kind: "question",
        title: "Cheapest place to catch it",
        body: "Now five new Sprout bugs. Match each one to the cheapest test layer that can catch it. Your picks are only marked when you press Check.",
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
            "Firmware logic on a laptop with a fake HAL",
            "A script drives a real board on a test rig",
            "A season-long trial in a real garden",
            "A tester tapping through the app by hand",
          ],
          answer: 1,
          hint: "The key words are 'hardware' (a real board) and 'loop' (the rig closes the loop around it with simulated surroundings).",
          feedback: {
            0: "That is a host test: there is no real hardware in it.",
            2: "A field trial is valuable, but it is manual and slow, not a scripted rig.",
            3: "Manual app testing is useful, but HIL means automated scripts with a real board in a rig.",
          },
        },
        explanation: "The real board is the 'hardware'; the rig fakes the phone, the power and the sensor inputs, and the scripts that drive it and read the results close the 'loop' around it. Because it is automated, it can run every night. Host tests prove the logic; HIL proves the logic works on the real chip with real timing.",
      },
      {
        kind: "explain",
        title: "The production test line",
        body: P(
          "Every Sprout board that leaves the factory must be checked, in seconds, by a **test fixture**: a jig with spring-loaded **pogo pins** that touch test pads on the board, a power supply, a programmer and a small computer. A typical station flow is the one below. Each station catches a different failure and takes a few seconds, so you balance **coverage** against **time**.",
          "The share of boards that pass **every station the first time** is the **first-pass yield (FPY)**: multiply the pass rates. Boards that fail go to rework (inspect, repair, retest) which costs time and money. This line starts strong, every station at 99.5%. Drag one station down and watch the total.",
        ),
        widget: { type: "prod-testflow", props: { rates: [99.5, 99.5, 99.5, 99.5, 99.5] } },
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
          "Write `first_pass_yield(rates)`. `rates` is a list of pass rates (each between 0 and 1), one per station. Return the first-pass yield as defined above, **rounded to 4 decimals**. An empty list means no tests, so everything passes: return `1.0`.",
        ),
        language: "python",
        starter: `def first_pass_yield(rates):
    # the share of boards that pass every station the first time
    # your code here
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
            "The pads make the board easier to clean",
            "A test lab requires them for certification",
            "Pogo pins need pads placed at layout time",
            "The firmware reads them while it boots",
          ],
          answer: 2,
          hint: "Think about how a fixture touches the board and what you can change on a board that is already made.",
          feedback: {
            0: "Test pads are not about cleaning. They are copper circles for a pin to press on.",
            1: "Certification labs test the finished product, not your test pads. Pads are an engineering choice to make production testing quick and cheap.",
            3: "Firmware does not need test pads to boot. Pads are there so a fixture can reach signals.",
          },
        },
        explanation: "A fixture's pogo pins touch pads of a set size and spacing in known places, so pad position and size are fixed when the board is laid out (the Rev A advice of test points, again), and nothing can be added to a finished board. Hunting a missing contact after the boards are made means a board respin or probing by hand, which is slow and unreliable on a line.",
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
    summary: "Radio rules, EMC, coin-cell and lithium safety, cybersecurity, water and dust ratings for Sprout, why pre-certified modules save time, and a sensible path to the test lab.",
    level: "Advanced",
    minutes: 11,
    xp: 75,
    steps: [
      {
        kind: "explain",
        title: "Why products need approval",
        body: P(
          "You cannot simply sell a radio device anywhere. Radio spectrum is shared, so every region sets rules that stop devices from jamming each other. Electrical products must not give noise to others (and must keep working in noise), and they must not hurt the people using them. Rules exist for batteries too, and in some markets for the **cybersecurity** of connected products. In the EU, for example, radio products that can reach the internet, even through a phone app as Sprout does, must meet the RED cybersecurity requirements since 1 August 2025 (the EN 18031 series is the example standard): secure updates, no shared default passwords, protected personal data.",
          "The names differ by region. Some **examples**: **FCC** (United States), **CE** with the **RED** radio equipment directive (European Union), **UKCA** (United Kingdom) and **ISED** (Canada). Which rules apply to *your* product depends on what it is, where it is sold and when, and rules change. Treat everything here as an outline and **ask a test lab** (and a lawyer where it matters) for your product.",
          "Below is a planner for Sprout. It starts on the heaviest plan: a chip-down radio, a rechargeable pack, four markets. Change the radio, the battery and the markets, and see what has to be tested.",
        ),
        widget: { type: "prod-cert", props: { radio: "chipdown", power: "liion", markets: ["us", "eu", "uk", "ca"] } },
      },
      {
        kind: "question",
        title: "A light plan",
        body: "Plan Sprout for **three or more markets** using a **pre-certified radio module** and keep the total effort at **7 points or fewer**. Choose the battery that makes that possible.",
        widget: { type: "prod-cert", props: {} },
        question: { type: "widget", goal: { radio: "module", maxEffort: 7, minMarkets: 3 }, hint: "Lithium cells add a shipping item, a coin cell adds child-safety work, and a rechargeable Li-ion pack adds pack safety testing. Which battery avoids all three?" },
        explanation: "Alkaline AA cells avoid the lithium shipping item, the coin-cell child-safety work and the pack safety testing, and the module avoids new radio design and testing. Any three markets include the EU or the UK, so a cybersecurity item appears whatever you choose. Effort points are made-up units that only compare plans, but the pattern is real: every lithium or radio design choice adds work that a simpler choice does not.",
      },
      {
        kind: "explain",
        title: "What a module covers, and what it does not",
        body: P(
          "A **pre-certified module** comes with radio test results from the maker, so you do not repeat the full radio testing. That saves it **under conditions** the maker lists: usually which antennas are allowed, how the module must be mounted and powered, and what label text the product needs (in the US, for example, \"Contains FCC ID: …\").",
          "What a module does *not* cover is everything else on your board. In the US example, the FCC's Part 15 rules split this in two: **Subpart C** for *intentional* radiators (the module's transmitter) and **Subpart B** for *unintentional* radiators: the noise from your own MCU, clocks and traces. That second part is **EMC** (electromagnetic compatibility), and it has two sides: **emissions** (do not radiate or conduct more noise than the limits allow) and **immunity** (keep working through a static zap or a nearby transmitter).",
          "Fast digital edges make noise at many multiples of their clock (**harmonics**), so a 16 MHz clock has energy at 48 and 80 MHz, inside the tested range. The *EMC: boards that don't shout* lesson in *Components and PCB design* shows why boards radiate and how to fix it. A good habit is **pre-compliance testing**: a rough early check with a near-field probe and a spectrum analyser that finds big problems before you pay for the real lab. It is not a certificate.",
        ),
      },
      {
        kind: "question",
        title: "Module inside, product outside",
        body: "Sprout uses a pre-certified BLE module and is sold in the US. Under the FCC's Part 15 rules (the US example), what is still left for the finished product?",
        question: {
          type: "choice",
          options: ["Its own circuits still need the Subpart B check", "Nothing: the module's grant covers the product", "A full new Subpart C grant for the transmitter", "Only a label, since emission limits do not apply"],
          answer: 0,
          hint: "The module's grant is for its transmitter. What else on Sprout's board makes radio-frequency noise?",
          feedback: {
            1: "The grant covers the module's transmitter, used under its conditions. Sprout's own MCU, clock and traces are a separate source of noise.",
            2: "That is exactly the testing a pre-certified module saves, as long as you follow its antenna and integration rules.",
            3: "The label is required, but Sprout's own digital circuits must still meet the unintentional-radiator limits.",
          },
        },
        explanation: "Subpart C (intentional radiators) is covered by the module's grant if you follow its conditions. Subpart B (unintentional radiators) still applies to the product: its digital circuits must meet the emission limits, which for a consumer product means the Class B limits, usually shown by the maker's own declaration (SDoC) after testing. A lab can tell you whether the module-plus-host combination needs extra checks.",
      },
      {
        kind: "explain",
        title: "Batteries and safety",
        body: P(
          "**Safety: coin cells and children.** Sprout runs on a coin cell, and a swallowed coin or button cell can cause severe internal burns in a child within about two hours. So the battery compartment must be **child-resistant**: for example a door that needs a tool such as a screwdriver or a coin, or two separate movements at the same time, to open, and that survives drop and pressure tests. Warnings go on the product, the packaging and the instructions. In the US, **16 CFR 1263** (from Reese's Law, 2023) is one example of such a rule; **IEC 62368-1** has coin-cell clauses for equipment in its scope, and other markets have their own. Check with a test lab which apply to your product.",
          "**Safety: lithium-ion.** A damaged, shorted or overcharged lithium-ion pack can overheat and burn. If Sprout used a **rechargeable** pack it would need a protection circuit, a safe charger (charging to about 4.2 V per cell for typical cells, and only within a temperature window), and safety-tested cells or packs (**IEC 62133** is an example standard). Never experiment with bare lithium cells.",
          "**Shipping.** Lithium cells and batteries, coin cells included, are regulated for transport, and your product may count. **UN 38.3** is an example: a set of tests that lithium cells and batteries must pass to be shipped. Carriers add packaging and labelling rules, and air freight is stricter. Ask your carrier and a test lab. Also remember materials and end of life (for example **RoHS** limits on hazardous substances, and battery and electronics recycling rules).",
        ),
      },
      {
        kind: "question",
        title: "Keep the cell away from small hands",
        body: "Which design choice does the most for child safety with Sprout's coin cell?",
        question: {
          type: "choice",
          options: ["A warning label on the case, on its own", "A bigger cell, so it is changed less often", "An alkaline button cell instead of lithium", "A door that needs a tool or two motions"],
          answer: 3,
          hint: "What actually stops a toddler from getting the cell out?",
          feedback: {
            0: "Warnings are expected too, but a label does not stop a toddler. The compartment itself must resist opening.",
            1: "Fewer changes help a little, but the cell is still reachable, and a used cell is still dangerous.",
            2: "Alkaline button cells cause the same burns when swallowed. Rules such as 16 CFR 1263 cover button and coin cells of any chemistry.",
          },
        },
        explanation: "A compartment that needs a tool, or two separate movements at once, keeps the cell inside even when the product is dropped or chewed. Warnings and child-resistant packaging for spare cells come on top. The field returns in the next lesson show why a cracked battery cover is a safety problem, not a cosmetic one.",
      },
      {
        kind: "explain",
        title: "Water, dust and the enclosure",
        body: P(
          "Sprout lives in a flower pot that gets watered. Requirement R6 asks it to survive splashes, so the enclosure is part of the design, not an afterthought.",
          "- **IP rating** (IEC 60529 is the example standard): \"IP\" and two digits. The first is protection against solids and dust (0 to 6), the second against water (0 to 9). **IPX4** means splashing from any direction; **IP67** means dust-tight and able to survive temporary immersion (for example 1 m for 30 minutes). An **X** means that digit was not rated.\n- **Conformal coating**: a thin protective film (acrylic, silicone and urethane are examples) sprayed, brushed or dipped onto the board so moisture and condensation cannot corrode it. Mask connectors, test pads and battery contacts first, and check the coverage under UV light (many coatings carry a UV tracer). IPC-CC-830 is one example qualification standard.\n- **Breathing**: a sealed box pumps humid air in and out as it warms and cools, and water can condense inside. A gasket keeps splashes out; a small membrane vent lets air through but not water.",
          "Test it like the rest: a splash or spray test at a lab for the IP rating, **damp heat** (for example 40 °C at 93% relative humidity for days; IEC 60068-2-78 is one example), temperature cycling to provoke condensation, and a long soak of the soil probe in wet, fertilised soil. The probe is the part that sits in water all the time, and in the field-return data it is the top cause.",
        ),
      },
      {
        kind: "question",
        title: "Reading an IP code",
        body: "A supplier offers Sprout's case as **IPX4** or **IP67**. What does the **X** in IPX4 mean?",
        question: {
          type: "choice",
          options: ["It is protected against any amount of dust", "Dust protection was not rated or tested", "It can be fully submerged for a short time", "It passed every one of the IEC water tests"],
          answer: 1,
          hint: "Which digit stands for solids and dust, and which for water?",
          feedback: {
            0: "Dust-tight is a 6 in the first position, as in IP67. An X means no claim at all.",
            2: "Temporary immersion is a 7 in the second position. IPX4 is about splashing.",
            3: "The second digit, 4, is one particular test level (splashing). X is about the first digit.",
          },
        },
        explanation: "The first digit is solids and dust, the second water. **X** means that one was not rated, so IPX4 claims only \"splash-proof from any direction\". IP67 is dust-tight and survives temporary immersion. Sprout needs about IPX4 for watering; more sealing costs money and traps condensation unless the case can breathe.",
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
          "Radio, EMC, safety, batteries and, in some markets, cybersecurity are regulated; **FCC, CE/RED, UKCA and ISED** are examples by region. Always **ask a test lab** which rules apply.",
          "A **pre-certified radio module** covers its transmitter if you follow its conditions; your own board still needs **EMC** testing (in the US example, Part 15 Subpart B), and **pre-compliance** finds problems before the lab does.",
          "**Coin cells** are a swallowing hazard: child-resistant compartments and warnings (16 CFR 1263 is one example). Lithium-ion needs pack safety (for example IEC 62133), and lithium cells have **shipping** rules (for example UN 38.3).",
          "A product in a wet place needs an **IP rating** (IPX4 for splashes), **conformal coating** and damp-heat and condensation tests.",
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
          "Two protections matter. **Secure boot**: the chip checks, at every start, that the firmware is **signed** by your private key, using a public key stored in the device, and refuses to run anything else. **Safe updates**: keep **two firmware slots (A and B)**. Download into the slot you are *not* running, verify the signature, try it once, and switch only after the new firmware proves itself. If it crashes, the bootloader rolls back to the old slot. Try the good update and a battery that dies halfway. (Open-source bootloaders such as MCUboot work this way; there are many commercial options too.)",
          "These are also what the law starts to ask for. In the EU, radio products that reach the internet, even through a phone app, must meet the RED cybersecurity requirements since 1 August 2025 (EN 18031 is the example standard, as of 2025): secure updates, no shared default passwords and protected data, as the certification lesson's planner showed.",
        ),
        widget: { type: "prod-ota", props: { scenarios: ["good", "power"] } },
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
          "One exception beats the chart: a **safety** problem is fixed whatever its count. Here are last quarter's returns for Sprout. Read the bars and the running total first.",
        ),
        widget: { type: "prod-pareto", props: { readOnly: true } },
      },
      {
        kind: "question",
        title: "Safety first, then the big bars",
        body: "Plan Rev C. Fix the **safety** problem whatever its count, then mark other causes as fixed until the return rate falls to **1.0% or less**.",
        widget: { type: "prod-pareto", props: {} },
        question: { type: "widget", goal: { fixed: ["cover"], maxRate: 1.0 }, hint: "Which cause lets a child reach the coin cell? Fix that one, then the longest bars. Each bar's count is the number of returns it removes." },
        explanation: "The cracked battery cover is third by count but a safety problem: a child could reach the coin cell, so it is fixed regardless (and you check with a compliance specialist what to do about units already sold). With it, the two biggest causes (coating and pairing) bring the rate from 2.11% to 0.48%. On counts alone the top two, 125 returns or 59%, cut it to 0.86%; fixing the two smallest would barely move it. Only some of these can be fixed by firmware: pairing can, a peeling coating cannot.",
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
          "No product is finished. Sprout shipped as Rev B, and its first year of data suggests **Rev C**: a better probe coating, a stronger child-resistant battery cover (a **safety** fix, not a cosmetic one), a firmware update for the phone models that fail to pair, and a low-battery warning for the cold resets that still come from nearly empty cells used below 0 °C. Changing hardware formally is an **ECO** (engineering change order): the change is described, reviewed, tested, and tracked by revision so you always know which boards have which fix. Recertify if the change could affect radio, EMC or safety.",
          "A firmware update is cheap and fast; a hardware change means new boards and stock. So put as much as you can in firmware, and learn which problems *only* hardware can fix.",
          "**In practice.** Teams use CAD tools such as **KiCad** or **Altium** for boards, and revision-control for firmware and design files. They debug with oscilloscopes and logic analysers, probes such as **J-Link** or open-source **OpenOCD** for the debug connection, and an accredited test lab for certification. Certification and tooling cost real money (lab fees alone can run into thousands or tens of thousands of dollars for a radio product; an order of magnitude, not a quote), so plan the money and the schedule along with the design. Skills like the ones in this module are what make that spending go as far as it can.",
        ),
      },
      {
        kind: "question",
        title: "What can an update fix?",
        body: "Select **all** the Rev C problems that an over-the-air **firmware** update could fix.",
        question: {
          type: "choice",
          options: ["Pairing fails on some phone models", "The probe coating peels in wet soil", "The battery cover cracks open", "A retry loop that drains the battery"],
          answer: [0, 3],
          hint: "Which problems are caused by what the software does, and which are about physical materials?",
          feedback: {
            1: "A coating is a physical material. No firmware change can glue it back on.",
            2: "A cracked cover is plastic, and here a safety problem: only a new, stronger part fixes it.",
          },
        },
        explanation: "Pairing and the retry loop are software behaviour, so an update can fix them. A peeling coating and a cracked cover are physical, and need a new revision; the cover is also a safety issue, so it cannot wait for the next convenient one. This split is why you design OTA in from the start, and why you test the physical parts hard before shipping.",
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
