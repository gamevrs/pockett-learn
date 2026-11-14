import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (tables, diagrams) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/**
 * Lessons added after the first ten of "Semiconductors: physics to fab". They keep their ids (fnd-semi-11, fnd-semi-12)
 * but sit in the module where their level fits: process control after lithography, reliability after yield and cost.
 */

// ─────────────────────────────── 11. Measuring and controlling the process (after lesson 8) ───────────────────────────────
export const semiProcessControl: ConceptLesson = {
  id: "fnd-semi-11-process-control",
  title: "Measuring and controlling the process",
  summary: "Metrology, overlay and defect inspection, control charts that catch a drifting tool, wafer-map detective work, optical proximity correction and the design rules born from the fab.",
  minutes: 12,
  xp: 80,
  level: "Advanced",
  steps: [
    {
      kind: "explain",
      title: "You can't fix what you don't measure",
      body: P(
        "A fab runs hundreds of steps, and *The fab process loop* showed that a small loss at each one compounds. So between the steps, wafers visit **metrology** tools that measure what was just made, and **inspection** tools that hunt for defects. Some of the main measurements:",
        txt(`
measurement        what it tells you                       typical tool
CD                 how wide the printed lines are          CD-SEM (electron microscope), scatterometry
overlay            how far a layer sits from the one below  optical overlay targets in the scribe lines
film thickness     how much was deposited or polished off  ellipsometry, reflectometry
defects            particles, bridges, missing patterns    optical brightfield/darkfield scanners, e-beam review
`),
        "**Scatterometry** (optical critical dimension, OCD) shines light on a repeating test pattern and fits the reflected spectrum to a model: fast enough for many wafers. A **CD-SEM** images the pattern directly with electrons: slower, so it checks a few sites. Fabs sample: a few sites on a few wafers per lot, more on the critical layers.",
      ),
    },
    {
      kind: "question",
      title: "Reading an overlay number",
      body: "An overlay measurement on a via layer reads **4 nm**. What does that number describe?",
      question: {
        type: "choice",
        options: [
          "How much wider the vias print than they were drawn",
          "How many particles landed on each wafer",
          "How far the scanner's focus has drifted",
          "How far the vias sit from the metal below",
        ],
        answer: 3,
        hint: "Overlay is about two layers, not one.",
        feedback: {
          0: "Width is the critical dimension (CD), a separate measurement.",
          1: "Particles are found by defect inspection, not by overlay metrology.",
          2: "Focus is monitored separately; overlay compares where two layers landed.",
        },
      },
      explanation: "**Overlay** is the misalignment between a layer and the layer it must land on, measured on dedicated targets. A via 4 nm off its metal line touches less copper (higher resistance) or creeps towards the neighbouring line. At leading-edge nodes the overlay budget is a few nanometres (typical), and every multi-patterning split from *Lithography: printing with light* adds another layer to align.",
    },
    {
      kind: "explain",
      title: "Control charts",
      body: P(
        "A measurement alone says little; its **history** says a lot. **Statistical process control** (SPC) plots each lot's result on a **control chart**: a centre line at the process mean and **control limits** at ±3σ, where σ is the spread the process shows when it is healthy.",
        "Control limits are not the specification. A part can be within spec and still be a warning: the limits ask \"is this tool behaving as it always has?\", and a tool that has started to drift will produce scrap later if nobody stops it. The classic **Western Electric rules** flag an out-of-control process when:",
        "1. one point falls beyond ±3σ (by pure chance only about 0.3% of points do),\n2. 2 of 3 points in a row are beyond ±2σ on the same side,\n3. 4 of 5 points in a row are beyond ±1σ on the same side,\n4. 8 points in a row sit on the same side of the centre line.",
        "Step through the lots below. The rules that fire are marked as they happen.",
      ),
      widget: { type: "semi-spc", props: { series: "spike", showRules: true } },
    },
    {
      kind: "question",
      title: "Stop the line",
      body: "A new etch tool's line width is charted lot by lot. Bring in the lots one at a time and press **Stop the line** at the **first** lot that breaks any of the four rules. Nothing is flagged for you this time.",
      widget: { type: "semi-spc", props: { series: "drift" } },
      question: {
        type: "widget",
        goal: { series: "drift", stopAtFirst: true },
        prompt: "Add lots one at a time and stop at the first lot that breaks a Western Electric rule.",
        hint: "No point leaves the ±3σ limits for a long time. Count how many points in a row sit above the centre line.",
      },
      explanation: "Lot **24** is the eighth point in a row above the centre line (rule 4), while every point is still inside the ±3σ limits; rule 1 would only fire at lot 28. Eight in a row on one side happens by chance only about once in 128 tries, so it signals a real shift: here a slow drift, such as a chamber wall coating up. Catching it at lot 24 means four fewer lots of wafers processed by a tool that is going wrong.",
    },
    {
      kind: "explain",
      title: "Defects and yield learning",
      body: P(
        "**Defect inspection** scans whole wafers optically and finds candidate defects; an **e-beam review** tool then images a sample of them so engineers can classify them (particle, bridge, residue, scratch). At the end, wafer sort turns every die into pass or fail, drawn as a **wafer map**.",
        "The *pattern* of failures points to the cause, much as a doctor reads symptoms:",
        txt(`
signature on the wafer map               usual suspect
a ring of failures at the edge           a step that is non-uniform near the edge (etch, film, polish)
an arc or line of failures               a scratch from handling
random scattered failures                particles
the same spot in every exposure field    the mask (reticle) or the scanner field itself
`),
        "Engineers rank defect types by how many dies they kill (a **Pareto** chart) and fix the biggest first. Repeating this across a new process is the **yield ramp** from *Yield and cost*: D0 falls as each cause is found.",
      ),
    },
    {
      kind: "question",
      title: "Read the wafer map",
      body: "On every wafer of a product, the failing dies sit at **the same position inside every exposure field**, in a regular grid. Which cause fits best?",
      question: {
        type: "choice",
        options: [
          "A burst of particles in one cleanroom bay",
          "A defect on the mask (reticle) itself",
          "Uneven etching near the wafer's edge",
          "A scratch from a wafer-handling robot",
        ],
        answer: 1,
        hint: "What is printed once per exposure field, the same way every time?",
        feedback: {
          0: "Particles land at random, so they would not repeat at the same spot in every field.",
          2: "That would give a ring of failures at the edge, not a repeating grid.",
          3: "A scratch leaves an arc or line across the wafer, not a regular grid.",
        },
      },
      explanation: "The reticle is printed once per field, so a defect on it repeats in **every field of every wafer**: a \"repeater\". That is why masks are inspected before use and again over their life, kept under a thin protective film (a **pellicle**) that holds particles out of focus, and repaired or replaced when a defect appears.",
    },
    {
      kind: "explain",
      title: "Computational lithography: OPC",
      body: P(
        "Today's features are far smaller than the light that prints them, so the image on the wafer is blurred: corners round off, **line ends pull back**, and a lone line prints differently from the same line in a dense row. **Optical proximity correction** (OPC) distorts the mask so that the *printed* shape comes out right:",
        "- **bias**: widen or narrow edges,\n- **hammerheads** and **serifs**: extra blobs at line ends and corners,\n- **sub-resolution assist features**: thin bars too small to print themselves that make a lone line behave like a dense one.",
        "Model-based OPC simulates the optics and the resist across the whole chip, so a modern mask is computed rather than drawn, on large compute farms (as of 2025 some of it runs on GPUs). The result is written onto the mask blank by electron-beam writers. The toy below blurs a mask and prints wherever the light passes a threshold. Try a little bias first.",
      ),
      widget: { type: "semi-opc", props: { bias: 1, ext: 0, head: 0 } },
    },
    {
      kind: "question",
      title: "Correct the line end",
      body: "With no correction the line prints too thin and too short. Make the printed line match the target: **width error and line-end error both within ±0.5 cells**.",
      widget: { type: "semi-opc", props: { bias: 0, ext: 0, head: 0, showVerdict: false } },
      question: {
        type: "widget",
        goal: { maxEndEpe: 0.5, maxWidthEpe: 0.5 },
        prompt: "Use bias and a hammerhead until both edge-placement errors are within ±0.5 cells.",
        hint: "Fix the width with a small bias first, then use the hammerhead (extension or extra width at the end) for the line end alone.",
      },
      explanation: "A bias of **0.5** cells fixes the width; then a hammerhead brings the end out, for example an extension of 1 with an extra half-width of 2, or an extension of 3 alone. Bias by itself cannot do both: widening the whole line enough to pull the end out (bias 3 still leaves it 0.6 short) makes every edge far too wide. That is the core of OPC: each edge segment gets its own correction.",
    },
    {
      kind: "question",
      title: "Design for the fab",
      body: P(
        "The fab's limits flow back into the **design rules** every layout must obey. At advanced nodes many are **restricted design rules**: lines in one direction only per layer, a few fixed pitches, shapes on a grid, so OPC and multi-patterning stay predictable.",
        "Polishing adds its own rules. **CMP** (from *The fab process loop*) removes material at a rate that depends on the local pattern: wide copper areas dish, dense ones erode. So the layout tool also fills empty regions with small, unconnected metal squares until every window meets a density rule (typically somewhere between about 20% and 80% metal). Why?",
      ),
      question: {
        type: "choice",
        options: [
          "To shield signal wires from crosstalk",
          "To give spare paths for later bug fixes",
          "So CMP polishes evenly across the chip",
          "To carry extra supply current to cells",
        ],
        answer: 2,
        hint: "The squares are not connected to anything. What process step cares about how much metal is in an area?",
        feedback: {
          0: "Floating fill actually adds a little coupling capacitance, which the timing tools must account for.",
          1: "Late bug fixes use spare logic cells placed on purpose, not fill squares.",
          3: "The squares are unconnected, so they carry no current at all.",
        },
      },
      explanation: "Even **pattern density** makes the polish even, so the surface stays flat for the next lithography step, whose depth of focus is only tens of nanometres. Dummy fill, density rules and restricted rules are all **design for manufacturing** (DFM): giving up some layout freedom so millions of chips print the same way. Names you will meet, as examples: KLA for inspection and metrology, Siemens Calibre and Synopsys tools for OPC and DFM checks.",
    },
    {
      kind: "recap",
      points: [
        "**Metrology** measures CD (CD-SEM, scatterometry), **overlay** and film thickness; **inspection** finds defects. Fabs sample a few sites per lot.",
        "**SPC**: control limits at ±3σ from the healthy process, not the spec. Rules such as **8 in a row on one side** catch a drift before any point leaves the limits.",
        "**Wafer-map signatures** point to causes: edge rings, scratches, random particles, repeaters from the mask.",
        "**OPC** pre-distorts the mask (bias, hammerheads, assist features); **restricted design rules** and **dummy fill** for CMP are design for manufacturing.",
      ],
    },
  ],
};

// ─────────────────────────────── 12. Why chips wear out (after lesson 9) ───────────────────────────────
export const semiReliability: ConceptLesson = {
  id: "fnd-semi-12-reliability",
  title: "Why chips wear out",
  summary: "Electromigration, oxide breakdown, NBTI and hot carriers, ESD and latch-up, then the bathtub curve, accelerated tests and FIT rates: how a chip is made to last ten years and how anyone can know.",
  minutes: 12,
  xp: 90,
  level: "Professional",
  steps: [
    {
      kind: "explain",
      title: "Wires that wander: electromigration",
      body: P(
        "A chip that passes every test can still fail years later. This lesson is about how, and how the industry checks it in weeks instead of years.",
        "The thin copper wires on a chip carry current densities around a million amps per square centimetre. At that density the flowing electrons push the copper atoms along with them, an \"electron wind\" called **electromigration** (EM). Atoms pile up downstream into a **hillock** that can short to a neighbour, and leave **voids** upstream that can break the wire.",
        "Its typical lifetime follows **Black's equation**:",
        txt("median life  =  A x J^(-n) x e^(Ea / kT)        n ≈ 2,  Ea ≈ 0.8-0.9 eV for copper (typical)"),
        "So doubling the current density J cuts life about four times, and heat cuts it exponentially. Design rules therefore give every wire a maximum current per micrometre of width, and sign-off tools check every wire on the chip. Try the toy wire.",
      ),
      widget: { type: "semi-reliab", props: { mode: "em", widthUm: 0.5, tempC: 105 } },
    },
    {
      kind: "question",
      title: "Size a power wire",
      body: "This wire runs hot, at **125 °C** (a busy server or a car's engine bay). Choose the **narrowest** width that still gives a median life of at least **10 years**: wider wires cost routing space.",
      widget: { type: "semi-reliab", props: { mode: "em", widthUm: 1, tempC: 125, lockTemp: true } },
      question: {
        type: "widget",
        goal: { mode: "em", tempC: 125, minLifeY: 10, maxWidthUm: 2 },
        prompt: "Widen the wire until the median life reaches 10 years at 125 °C, but no wider than needed.",
        hint: "At 105 °C, 1 µm gave 10 years. 20 °C hotter shortens life several times, and life grows with the square of the width.",
      },
      explanation: "At 125 °C the same wire lives about **3.7 times** shorter than at 105 °C, so it needs √3.7 ≈ 1.9 times the width: **1.95 µm** (J ≈ 0.5 MA/cm²). Median life means half the wires would fail sooner, so real EM rules aim at a tiny failure fraction and add margin. Power grids get wide straps and many vias for exactly this reason; signal wires, whose current flows both ways, are less at risk.",
    },
    {
      kind: "explain",
      title: "Oxide and transistor ageing",
      body: P(
        "Transistors age too, and three mechanisms dominate:",
        "- **TDDB** (time-dependent dielectric breakdown). The gate oxide, a few nanometres thick, holds a field of millions of volts per centimetre. Over time defects form in it until they line up into a conducting path and the oxide breaks down. Higher voltage and heat speed it up sharply, which is one reason the maximum supply voltage is fixed and why overclocking with extra voltage shortens a chip's life.\n- **NBTI** (negative-bias temperature instability). A PMOS held **on** (gate below source) while hot slowly traps charge at its oxide interface: its threshold rises in magnitude and it gets slower. Part of the shift recovers when the transistor turns off.\n- **HCI** (hot-carrier injection). While a transistor switches, carriers accelerated by the strong field near the drain can gain enough energy to damage the oxide there, again shifting the threshold.",
        "The circuit-level effect of NBTI and HCI is the same: logic slows down over the years. Designers add an **ageing margin** to the timing, using transistor models of an aged chip, so it still meets its clock speed at end of life.",
      ),
    },
    {
      kind: "question",
      title: "The slow PMOS",
      body: "In a server CPU, a PMOS in a clock path has its gate held **low** (transistor on) almost all the time, at 95 °C, for years. Ageing analysis predicts this path will get slower. Which mechanism is mainly responsible?",
      question: {
        type: "choice",
        options: [
          "NBTI: its threshold drifts while held on hot",
          "Electromigration inside its gate oxide",
          "Latch-up of the n-well it sits in",
          "ESD damage from being handled once",
        ],
        answer: 0,
        hint: "Which mechanism needs a PMOS, a negative gate-to-source voltage and heat, held for a long time?",
        feedback: {
          1: "Electromigration moves metal atoms in wires carrying current; the oxide carries no current to speak of.",
          2: "Latch-up is a sudden short from supply to ground, not a slow drift.",
          3: "ESD damage happens in one event and usually kills a pin outright; it does not grow with time on.",
        },
      },
      explanation: "**NBTI**: negative bias plus temperature, held for years, raises the PMOS threshold (tens of millivolts over a lifetime is a typical order of magnitude) and lowers its drive current. Because it partly recovers when the gate goes high, the **duty cycle** matters, and ageing-aware timing uses how long each transistor spends on.",
    },
    {
      kind: "explain",
      title: "ESD and latch-up",
      body: P(
        "Two threats come from outside the normal operation:",
        "- **Electrostatic discharge** (ESD). A person walking across a floor can carry several kilovolts. Touching a pin dumps a pulse of amps lasting nanoseconds, while a gate oxide breaks at a few volts. Every pad therefore has protection: diodes to both supply rails and a clamp between the rails that steer the pulse around the core. Parts are rated with standard tests such as the human-body model (HBM, often specified at 1 to 2 kV) and the charged-device model (CDM, a few hundred volts) (typical figures). That is also why chips are handled with wrist straps and shipped in conductive bags.\n- **Latch-up**. In CMOS, a PMOS in its n-well next to an NMOS in the p-type substrate forms a hidden **PNPN** structure: two parasitic bipolar transistors that feed each other, like a thyristor. A current spike, for example an input pulled above the supply, can switch it on, and then it holds itself on, shorting the supply to ground until the power is removed. The heat often destroys the chip.",
      ),
    },
    {
      kind: "question",
      title: "Taps and guard rings",
      body: "Layout rules demand **well and substrate taps** every few tens of micrometres and **guard rings** around I/O cells. What do they mainly prevent?",
      question: {
        type: "choice",
        options: [
          "Electromigration voids in the supply rails",
          "The parasitic PNPN turning itself on",
          "Gate-oxide breakdown in normal operation",
          "Crosstalk between neighbouring signal wires",
        ],
        answer: 1,
        hint: "A parasitic bipolar transistor turns on when its base-emitter junction gets about 0.6 V. Where would that voltage come from?",
        feedback: {
          0: "Electromigration is handled by wire width and via rules, not by taps in the silicon.",
          2: "Oxide breakdown depends on voltage, temperature and time; taps do not change the gate field.",
          3: "Crosstalk is managed by wire spacing and shielding in the metal layers.",
        },
      },
      explanation: "Taps tie each well and the substrate firmly to its supply or ground through a short, low-resistance path, so a stray current cannot build the ~0.6 V across the well that would switch the parasitic transistors on. Guard rings around I/O collect injected carriers before they reach the core. Latch-up immunity is tested by forcing current into every pin (JEDEC JESD78 is the usual test).",
    },
    {
      kind: "explain",
      title: "The bathtub and accelerated tests",
      body: P(
        "Plot the failure rate of a large population over its life and you get the **bathtub curve**: a falling stretch of **infant mortality** (weak parts with hidden manufacturing flaws), a long flat **useful life** with rare random failures, and a rising **wear-out** stretch where the mechanisms above take over. Burn-in (from *Packaging and test*) screens the infant failures; qualification has to show wear-out lies far beyond the product's life.",
        "Nobody can wait ten years, so qualification **accelerates** the ageing. The standard **HTOL** test (high-temperature operating life, JEDEC JESD22-A108) runs a sample of parts powered up, typically for 1,000 hours at 125 °C. Heat speeds a mechanism by the **Arrhenius** acceleration factor:",
        txt("AF = e^( (Ea / k) x (1 / T_use - 1 / T_stress) )      T in kelvin, k = 8.617e-5 eV/K"),
        "The activation energy Ea depends on the mechanism, so a test that strongly accelerates one barely touches another. Change the stress temperature and Ea.",
      ),
      widget: { type: "semi-reliab", props: { mode: "htol", stressC: 105, ea: 0.7 } },
    },
    {
      kind: "question",
      title: "A failure rate in FIT",
      body: "Field reliability is quoted in **FIT**: failures per 10⁹ device-hours. An HTOL test runs **1,000 parts** for **1,000 hours** at 125 °C and **1** part fails. For use at 55 °C with Ea = 0.7 eV the acceleration factor is about **78**. Estimate the FIT rate: failures ÷ (device-hours × AF) × 10⁹.",
      question: { type: "number", answer: 12.8, tolerance: 0.3, unit: "FIT", hint: "Device-hours = parts × hours. Multiply by the acceleration factor to get equivalent hours of use, then scale to 10⁹ hours." },
      explanation: "1,000 × 1,000 = 10⁶ device-hours, × 78 ≈ 7.8 × 10⁷ equivalent hours of use; 1 / 7.8 × 10⁷ × 10⁹ ≈ **12.8 FIT**. Real reports quote a statistical upper bound instead (with one failure, a 60% confidence chi-squared bound is about twice this point estimate). Even 13 FIT means a fleet of ten million parts sees about 1,100 failures a year, which is why car and data-centre customers push for single-digit FIT and parts-per-million defect rates.",
    },
    {
      kind: "explain",
      title: "In practice",
      body: P(
        "Names you will meet, as examples rather than recommendations:",
        "- **Qualification standards**: JEDEC JESD47 (stress-test-driven qualification), JESD22-A108 (HTOL), JESD78 (latch-up), and the ESD tests JS-001 (HBM) and JS-002 (CDM). For cars, **AEC-Q100** adds stricter stress tests and temperature grades (Grade 1 is −40 to 125 °C ambient; Grade 0 reaches 150 °C).\n- **Design tools**: electromigration and IR-drop sign-off tools check every wire (Ansys RedHawk and Cadence Voltus are examples), foundries supply ageing-aware transistor models, and ESD and latch-up rules are part of the PDK's design rule checks.\n- **In the field**: failure analysis labs open returned parts (X-ray, cross-sections, electron microscopes) and trace each failure back to a mechanism, which feeds the next design and process revision.",
        "Honest about cost: a full qualification takes months and hundreds of parts per stress test (AEC-Q100's HTOL, for example, asks for three lots of 77 parts), and every margin for ageing, EM or ESD costs area, speed or power. Reliability is designed in from the first layout rule, not tested in at the end.",
      ),
    },
    {
      kind: "recap",
      points: [
        "**Electromigration**: the electron wind moves copper; life ∝ J⁻² · e^(Ea/kT) (Black). Width rules and EM sign-off keep wires safe.",
        "**TDDB** breaks the gate oxide over time; **NBTI** and **HCI** shift thresholds so logic slows; designers add an **ageing margin**.",
        "**ESD** protection at every pad; **latch-up** from the parasitic PNPN is prevented by **taps and guard rings**.",
        "**Bathtub**: burn-in removes infant failures; **HTOL** (1,000 h at 125 °C, typical) plus the **Arrhenius** factor estimates wear-out and a **FIT** rate; AEC-Q100 for cars.",
      ],
    },
  ],
};
