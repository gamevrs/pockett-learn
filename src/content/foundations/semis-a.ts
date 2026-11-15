import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (tables, diagrams) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 1 to 5 of "Semiconductors: physics to fab": bands, doping, the PN junction, the MOSFET, scaling. */
export const semisLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. Conductors, insulators and semiconductors ───────────────────────────────
  {
    id: "fnd-semi-1-bands",
    title: "Conductors, insulators and semiconductors",
    summary: "Why copper conducts, glass doesn't and silicon sits in between: electrons, energy bands and the band gap in plain words.",
    minutes: 9,
    xp: 45,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "Current needs movers",
        body: P(
          "An electric **current** is charge on the move, and inside a solid the movers are **electrons**. Every atom has some, but most are locked to their atom or locked into the bonds that hold the solid together. Only electrons that are free to wander can carry a current.",
          "So the question \"does it conduct?\" is really \"how many free electrons does it have?\". Physicists answer it with a picture of **energy bands**. Think of a car park with two floors:",
          "- the **valence band** (lower floor) holds the electrons that are busy in bonds. It is completely full: cars bumper to bumper, nobody can move.\n- the **conduction band** (upper floor) is where an electron can drive around freely and carry current. It starts out empty.",
          "Pick a material below and compare. Copper has no gap at all: its floors overlap, so plenty of electrons are always free.",
        ),
        widget: { type: "semi-bands", props: { material: "copper", materials: ["copper", "ge", "si", "gaas", "diamond", "glass"] } },
      },
      {
        kind: "question",
        title: "Why metals conduct",
        body: "Why does copper conduct electricity at any temperature?",
        question: {
          type: "choice",
          options: [
            "Its bands overlap, so many electrons are always free",
            "Room heat keeps lifting its electrons across a small gap",
            "Its electrons are heavier, so each one carries more charge",
            "Its ions drift along the wire and carry the charge",
          ],
          answer: 0,
          hint: "Look at the band picture for copper. Is there any gap to cross?",
          feedback: {
            1: "That is how a semiconductor gets its few free electrons. Copper doesn't need heat: there is no gap.",
            2: "Every electron has the same mass and charge. What differs between materials is how many are free.",
            3: "The atoms (ions) stay put in the crystal. Only electrons move.",
          },
        },
        explanation: "In a metal the full band and the empty band **overlap**, so a sea of electrons is always free. That is why metals conduct well even when very cold.",
      },
      {
        kind: "explain",
        title: "The band gap",
        body: P(
          "In silicon and glass the two floors are separated by a **band gap**: a range of energies where no electron can sit. To become free, an electron must jump the whole gap in one go. The gap is measured in **electronvolts** (eV), the energy one electron gains crossing one volt.",
          txt(`
material          band gap (room temperature, typical)
copper            none: bands overlap        conductor
germanium         0.66 eV                    semiconductor
silicon           1.12 eV                    semiconductor
gallium arsenide  1.42 eV                    semiconductor
diamond           about 5.5 eV               insulator
glass (SiO2)      about 9 eV                 insulator
`),
          "Heat is what jumps the gap: atoms jiggle, and now and then an electron gets a big enough kick. In a **semiconductor** the gap is small enough that a few electrons make it at room temperature; in an **insulator** practically none ever do. Each jumping electron also leaves an empty spot behind in the full band: a **hole** (the next lesson is about those). Drag the temperature for germanium and watch the count, then compare silicon at the same temperature.",
          "Where the car park breaks down: real electrons are not cars on fixed floors, they are waves spread over the whole crystal, and \"band\" means a range of allowed energies, not a place.",
        ),
        widget: { type: "semi-bands", props: { material: "ge", materials: ["copper", "ge", "si", "gaas", "diamond", "glass"] } },
      },
      {
        kind: "question",
        title: "Heat it up",
        body: "Warm up **silicon** until heat alone frees at least **10¹⁴ electrons per cm³**: ten thousand times the room-temperature figure.",
        widget: { type: "semi-bands", props: { material: "si", materials: ["si", "ge", "glass"] } },
        question: {
          type: "widget",
          goal: { material: "si", minNi: 1e14 },
          prompt: "Choose silicon and raise the temperature until the free-electron count reaches 1 × 10¹⁴ per cm³.",
          hint: "The count grows very fast with temperature, because the chance of a big enough kick grows exponentially. Keep going past 400 K.",
        },
        explanation: "At about **500 K** (roughly 230 °C) silicon has around 10¹⁴ free electrons per cm³, ten thousand times more than at room temperature. This steep rise is why chips are rated for a maximum temperature: hot enough, and heat-freed electrons swamp the carefully placed ones from the next lesson.",
      },
      {
        kind: "explain",
        title: "Light can jump the gap too",
        body: P(
          "Light arrives in packets called **photons**, and each one carries an energy set by its wavelength: **E ≈ 1240 / λ** (E in eV, λ in nanometres). Blue light at 450 nm carries about 2.76 eV, red at 650 nm about 1.91 eV.",
          "A photon with **more energy than the gap** can lift an electron straight across. A photon with less simply passes through: the material is transparent to it. That is why glass, with its 9 eV gap, lets visible light through, and why a silicon solar cell or camera sensor absorbs it.",
          "Choose a material and shine different colours. Which light goes straight through silicon?",
        ),
        widget: { type: "semi-bands", props: { material: "si", light: true, materials: ["copper", "ge", "si", "gaas", "diamond", "glass"] } },
      },
      {
        kind: "question",
        title: "Through one, not the other",
        body: "Gallium arsenide's gap is **1.42 eV**, silicon's **1.12 eV**. Find a colour of light that passes straight through **gallium arsenide** but would be absorbed by **silicon**.",
        widget: { type: "semi-bands", props: { material: "si", light: true, materials: ["si", "gaas"] } },
        question: {
          type: "widget",
          goal: { material: "gaas", light: true, photo: false, alsoAbsorbs: "si" },
          prompt: "Choose gallium arsenide and pick a light that it lets through but silicon would absorb.",
          hint: "The photon needs at least 1.12 eV to be absorbed by silicon, but less than 1.42 eV to pass through gallium arsenide. Work out each light's energy with E ≈ 1240 / λ.",
        },
        explanation: "Only **1000 nm** infrared works: 1240 / 1000 ≈ 1.24 eV, more than silicon's 1.12 eV but less than gallium arsenide's 1.42 eV. Red light (1.91 eV) is absorbed by both, and 1550 nm (0.80 eV) passes through both. Every material has such a cut-off, which is why the gap decides what a light sensor or solar cell can see.",
      },
      {
        kind: "question",
        title: "The longest wavelength",
        body: "Silicon's gap is **1.12 eV**. Using E ≈ 1240 / λ, work out the **longest wavelength** of light silicon can absorb. Give it in nanometres.",
        question: { type: "number", answer: 1107, tolerance: 15, unit: "nm", hint: "Rearrange: λ = 1240 / E. Put in the gap energy." },
        explanation: "λ = 1240 / 1.12 ≈ **1107 nm**, in the infrared. Longer wavelengths, like the 1550 nm light used in fibre-optic links, pass through silicon, which is why those links use other detector materials (such as indium gallium arsenide), while silicon camera sensors see visible light and a little infrared.",
      },
      {
        kind: "question",
        title: "Why silicon?",
        body: "Germanium has an even smaller gap and was used in the first transistors. Which reason best explains why chips moved to **silicon**?",
        question: {
          type: "choice",
          options: [
            "Its electrons move faster than germanium's do",
            "Its smaller gap lets it switch at a lower voltage",
            "It is the only element that grows large, flawless single crystals",
            "A wider gap for hot chips, cheap sand, and a native oxide",
          ],
          answer: 3,
          hint: "Think about what happens to a small-gap material as a chip warms up, and what else a chip needs besides a semiconductor.",
          feedback: {
            0: "The reverse: electrons and holes both move faster in germanium. Speed was not what decided it.",
            1: "Silicon's gap (1.12 eV) is larger than germanium's (0.66 eV), not smaller.",
            2: "Many materials form large crystals, germanium and gallium arsenide included.",
          },
        },
        explanation: "Germanium's 0.66 eV gap lets heat free too many electrons once it gets warm. Silicon's 1.12 eV is a better balance; silicon is the second most common element in the Earth's crust; and heating it in oxygen grows **silicon dioxide**, an excellent insulator that the transistor in lesson 4 depends on.",
      },
      {
        kind: "recap",
        points: [
          "Current needs **free electrons**. Bands: a full **valence band** of bound electrons and an empty **conduction band** where they can move.",
          "Metals: bands overlap, always conduct. Insulators: a wide **band gap** nothing crosses. **Semiconductors**: a small gap a few electrons cross.",
          "Heat frees more electrons as it warms, very steeply. Light frees them if each photon's energy (E ≈ 1240/λ) is at least the gap.",
          "Silicon: a **1.12 eV** gap at room temperature, abundant, and it grows its own insulating oxide.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Doping ───────────────────────────────
  {
    id: "fnd-semi-2-doping",
    title: "Doping: n-type and p-type",
    summary: "Swap one atom in five million and silicon conducts hundreds of thousands of times better. Free electrons, holes, and why chips are made of two kinds of silicon.",
    minutes: 10,
    xp: 50,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "Four bonds each",
        body: P(
          "A silicon atom has **four** outer electrons. In a crystal each one pairs up with an electron from a neighbour, so every atom sits in four tidy bonds and every electron has a job. Pure silicon at room temperature is a poor conductor for exactly that reason.",
          "Chipmakers change that on purpose by **doping**: replacing a tiny fraction of the silicon atoms with atoms of a neighbouring element. Phosphorus has **five** outer electrons. Put one in the crystal: four electrons fill its bonds, and the fifth has nowhere to go.",
          "Tap a silicon atom to swap in phosphorus.",
        ),
        widget: { type: "semi-dope", props: { mode: "lattice" } },
      },
      {
        kind: "question",
        title: "Two free electrons",
        body: "Make this crystal carry exactly **2 free electrons** and **no holes**.",
        widget: { type: "semi-dope", props: { mode: "lattice" } },
        question: {
          type: "widget",
          goal: { electrons: 2, holes: 0 },
          prompt: "Swap atoms until the crystal has exactly 2 free electrons and 0 holes.",
          hint: "Each phosphorus atom brings one spare electron. Boron would add holes, so leave it out.",
        },
        explanation: "Two phosphorus atoms, two spare electrons. Silicon with extra free electrons is called **n-type** (n for the negative charge carriers). The phosphorus atoms themselves stay fixed in the crystal; each becomes a positive ion once its spare electron leaves.",
      },
      {
        kind: "explain",
        title: "A missing electron: the hole",
        body: P(
          "Boron has only **three** outer electrons. Put it in the crystal and one of its four bonds is one electron short. That gap is called a **hole**.",
          "A hole can move. An electron from a neighbouring bond hops into it, and now the gap is where that electron used to be. Picture a row of theatre seats with one empty: each time someone shuffles over, the empty seat moves the other way. A hole therefore behaves like a **positive** charge moving through the crystal.",
          "Where the seats picture breaks: a hole is not a thing, it is the absence of an electron, and physicists treat it as a particle with its own mass and speed (holes move about two to three times more slowly than electrons in silicon). Silicon with extra holes is **p-type** (p for positive).",
          "Switch the tool to boron and add a few.",
        ),
        widget: { type: "semi-dope", props: { mode: "lattice" } },
      },
      {
        kind: "question",
        title: "Make p-type",
        body: "Make this crystal **p-type** with at least **3 holes**.",
        widget: { type: "semi-dope", props: { mode: "lattice" } },
        question: {
          type: "widget",
          goal: { type: "p", minHoles: 3 },
          prompt: "Add boron (and remove any phosphorus) until the crystal is p-type with at least 3 holes.",
          hint: "Boron has three outer electrons, one short of a full set of bonds. Each one makes a hole.",
        },
        explanation: "Three or more boron atoms and more boron than phosphorus: **p-type**. In p-type silicon the **majority carriers** are holes; the few free electrons that remain are **minority carriers**.",
      },
      {
        kind: "question",
        title: "Both at once",
        body: "You add **four** phosphorus atoms and **four** boron atoms to the same patch of silicon. How does it behave?",
        question: {
          type: "choice",
          options: [
            "Strongly n-type: eight carriers add up",
            "Almost like pure silicon: the carriers cancel",
            "Twice as conductive as phosphorus alone",
            "p-type, because holes always win out",
          ],
          answer: 1,
          hint: "A spare electron and a missing electron. What happens when they meet?",
          feedback: {
            0: "The carriers are not independent: a free electron that meets a hole fills it, and both disappear.",
            2: "The electrons fill the holes, so the carriers cancel instead of adding up.",
            3: "Neither side wins when the numbers are equal: four spare electrons fill four holes.",
          },
        },
        explanation: "Equal doping **compensates**: free electrons fill the holes and the region acts almost like undoped silicon. Fabs use this deliberately. A region can be switched from n-type to p-type by adding more of the other dopant on top, and that is how wells and transistors are built inside one wafer.",
      },
      {
        kind: "explain",
        title: "The real numbers",
        body: P(
          "The grid above exaggerates wildly: one dopant in every few atoms. A cubic centimetre of silicon holds about **5 × 10²² atoms**. Typical doping in a chip is somewhere between **10¹⁵ and 10²⁰ dopant atoms per cm³**, so anywhere from one in fifty million to one in a few hundred.",
          "Even the light end of that range matters hugely, because pure silicon has so few free electrons to begin with (about 10¹⁰ per cm³ at room temperature). There is also a neat rule: **electrons × holes = ni²**, a constant for a given material and temperature. Push the electrons up a millionfold and the holes drop a millionfold.",
        ),
      },
      {
        kind: "question",
        title: "One in how many?",
        body: "Silicon has about **5 × 10²² atoms per cm³**. It is doped with **10¹⁶ phosphorus atoms per cm³**. About how many silicon atoms are there for each phosphorus atom? Give the answer **in millions**.",
        question: { type: "number", answer: 5, tolerance: 0.3, unit: "million", hint: "Divide the silicon atoms by the dopant atoms: 5 × 10²² / 10¹⁶." },
        explanation: "5 × 10²² / 10¹⁶ = 5 × 10⁶: **one phosphorus atom per five million silicon atoms**. That is why wafers start out so pure (lesson 6): an accidental impurity at the parts-per-million level would be as strong as deliberate doping.",
      },
      {
        kind: "question",
        title: "Make it conduct",
        body: P(
          "Now with real concentrations. Slide the doping level and watch the **resistivity** (how hard it is for current to flow through a 1 cm cube; lower is better).",
          "Make **n-type** silicon that conducts at least **100,000 times** better than pure silicon. Use the smallest doping that does it.",
        ),
        widget: { type: "semi-dope", props: { mode: "calc", type: "n", exp: 13 } },
        question: {
          type: "widget",
          goal: { type: "n", minRatio: 1e5, maxRatio: 1e6 },
          prompt: "Choose phosphorus and raise the concentration until the conductivity is at least 100,000 times pure silicon's, but no higher than needed.",
          hint: "Each step of the slider is ten times more dopant. Watch the \"conducts better by\" readout.",
        },
        explanation: "**10¹⁶ per cm³** does it: about 600,000 times better than pure silicon, from one atom in five million. 10¹⁵ is not quite enough (about 70,000×). This enormous sensitivity is what makes silicon useful: by placing dopants precisely, a fab draws conductors, insulators and switches inside one crystal.",
      },
      {
        kind: "recap",
        points: [
          "**Doping** replaces a tiny fraction of silicon atoms. Phosphorus (5 outer electrons) gives a free electron: **n-type**. Boron (3) leaves a **hole**: **p-type**.",
          "A hole is a missing electron that moves like a positive charge.",
          "Equal n and p doping **compensate** each other.",
          "Real doping is about 10¹⁵ to 10²⁰ atoms per cm³ out of 5 × 10²²; electrons × holes stays at ni², so the majority goes up as the minority goes down.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. The PN junction ───────────────────────────────
  {
    id: "fnd-semi-3-pn-junction",
    title: "The PN junction",
    summary: "Put p-type next to n-type: a depletion region forms, a barrier appears, and you get a diode. Forward and reverse bias with a real Shockley curve.",
    minutes: 11,
    xp: 60,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Where p meets n",
        body: P(
          "Grow p-type and n-type silicon side by side in one crystal and something happens at the boundary straight away. Electrons from the n side wander across and fill holes on the p side. Each pair that meets **cancels**.",
          "What stays behind is a thin layer with **no free carriers at all**, only the fixed dopant atoms that lost their partners: negatively charged boron ions on the p side, positively charged phosphorus ions on the n side. This layer is the **depletion region**.",
          "Those fixed charges create an electric field, a **built-in voltage**, that pushes back on any more electrons trying to cross. For the doping in this model it is about **0.71 V**. The battery is at 0 V for now; leave it there and look.",
        ),
        widget: { type: "semi-pn", props: { v: 0, noCurve: true } },
      },
      {
        kind: "question",
        title: "What is in the gap?",
        body: "What fills the depletion region?",
        question: {
          type: "choice",
          options: [
            "Free electrons and holes in equal numbers",
            "Extra electrons pushed over from the n side",
            "Fixed dopant ions, with almost no free carriers",
            "Undoped silicon, with no dopant atoms left in it at all",
          ],
          answer: 2,
          hint: "Think about what happens to an electron that crosses over and meets a hole.",
          feedback: {
            0: "The electrons and holes near the junction met and cancelled. What is left has almost none of either.",
            1: "The electrons that crossed fell into holes; they did not pile up as free carriers.",
            3: "The dopant atoms are still there, fixed in the lattice. They have only lost their free carriers, which leaves them charged.",
          },
        },
        explanation: "The carriers near the boundary **cancelled each other**, so the depletion region holds only **fixed ions**: negative on the p side, positive on the n side. With no free carriers it behaves like an insulator, and its charges set up the barrier.",
      },
      {
        kind: "explain",
        title: "Reverse bias: a wider wall",
        body: P(
          "Now connect a battery with its **minus** terminal on the p side and **plus** on the n side. That is **reverse bias**. The battery pulls holes away to the left and electrons away to the right, so the depletion region gets **wider** and the barrier gets higher.",
          "Almost nothing flows: only a tiny **leakage** of the few minority carriers. Here it is about 10 femtoamps (10⁻¹⁴ A). Drag the slider between 0 V and −1 V and watch the width.",
        ),
        widget: { type: "semi-pn", props: { v: -1, noCurve: true } },
      },
      {
        kind: "question",
        title: "One micrometre wide",
        body: "Reverse-bias the junction until the depletion region is at least **1 µm** wide.",
        widget: { type: "semi-pn", props: { v: 0, noCurve: true } },
        question: {
          type: "widget",
          goal: { minWidthUm: 1 },
          prompt: "Move the voltage negative until the depletion width reads 1.00 µm or more.",
          hint: "The width grows with the square root of (built-in voltage minus bias), so it widens slowly. Go well past −2 V.",
        },
        explanation: "At about **−3.2 V** the region reaches 1 µm, from 0.43 µm at zero bias. The width follows W ∝ √(Vbi − V), so doubling it takes four times the total voltage across the junction (Vbi − V): from 0.71 V at zero bias to about 2.9 V, a bias of about −2.1 V for 0.86 µm. A reverse-biased junction is a small capacitor whose plates move apart as you raise the voltage; radio tuners use that effect (the varactor diode).",
      },
      {
        kind: "explain",
        title: "Forward bias: the floodgates",
        body: P(
          "Flip the battery: **plus on p, minus on n**. That is **forward bias**. It pushes the carriers toward the junction, the depletion region narrows, and the barrier shrinks. Once the barrier is low enough, carriers pour across and a real current flows.",
          "The current rises **exponentially** with voltage. The ideal diode equation, due to William Shockley, says:",
          txt("I = Is x ( e^(V / Vt) - 1 )      Vt = kT/q ≈ 0.0259 V at room temperature"),
          "**Is** (the saturation current) is tiny, 10 fA in this model. Nothing much happens until a few hundred millivolts, then the current shoots up. That is where the familiar \"silicon diodes drop about 0.6 to 0.7 V\" comes from: it is not a hard threshold, just the voltage where an exponential gets large enough to notice.",
        ),
        widget: { type: "semi-pn", props: { v: 0.4 } },
      },
      {
        kind: "question",
        title: "A few milliamps",
        body: "Set the voltage so the diode carries between **1 mA and 10 mA**.",
        widget: { type: "semi-pn", props: { v: 0 } },
        question: {
          type: "widget",
          goal: { minCurrentA: 1e-3, maxCurrentA: 10e-3 },
          prompt: "Forward-bias the junction until the current reads between 1 mA and 10 mA.",
          hint: "The current multiplies by ten every 60 mV or so. Somewhere around 0.6 to 0.7 V it passes through the milliamp range.",
        },
        explanation: "At **0.70 V** this diode carries about 5.8 mA; at 0.65 V it is only 0.83 mA, and at 0.75 V it would be 40 mA. That steepness is why a diode's voltage barely changes while its current changes a lot. (A real diode also has some series resistance that softens the curve at high current.)",
      },
      {
        kind: "question",
        title: "Ten times the current",
        body: "In the ideal diode equation, the current is multiplied by 10 each time V rises by Vt × ln(10). With Vt = 25.9 mV, **how many millivolts** is that? Work it out.",
        question: { type: "number", answer: 59.6, tolerance: 2, unit: "mV", hint: "ln(10) is about 2.303. Multiply it by 25.9 mV." },
        explanation: "25.9 mV × 2.303 ≈ **59.6 mV**: about 60 mV per decade of current at room temperature. Engineers use this rule constantly, and it returns in lesson 5: the same physics limits how sharply a transistor can switch off.",
      },
      {
        kind: "code",
        title: "The diode equation",
        body: P(
          "Write `diode_current(v, i_s=1e-14, vt=0.0259)`: the ideal (Shockley) diode current in amps at voltage `v`.",
          "Use `math.exp`. Forward voltages give a positive current, reverse voltages a tiny negative one close to `-i_s`.",
        ),
        language: "python",
        starter: `import math

def diode_current(v, i_s=1e-14, vt=0.0259):
    # I = Is * (e^(V/Vt) - 1)
    return 0.0
`,
        solution: `import math

def diode_current(v, i_s=1e-14, vt=0.0259):
    return i_s * (math.exp(v / vt) - 1)
`,
        tests: [
          { id: "fwd", description: "0.65 V forward is a bit under 1 mA", assertionCode: `i = diode_current(0.65)\nassert 7.5e-4 < i < 8.5e-4, f"expected about 0.8 mA, got {i}"` },
          { id: "rev", description: "Reverse bias leaks about -Is", assertionCode: `i = diode_current(-1)\nassert abs(i + 1e-14) < 1e-16, f"expected about -1e-14 A, got {i}"` },
          { id: "decade", description: "About 60 mV more gives ten times the current", assertionCode: `r = diode_current(0.7) / diode_current(0.7 - 0.0259 * math.log(10))\nassert abs(r - 10) < 0.01, f"expected a ratio of 10, got {r}"` },
        ],
        hints: ["math.exp(v / vt) is the exponential term.", "Do not forget the minus one: at v = 0 the current must be exactly 0."],
      },
      {
        kind: "question",
        title: "Where diodes go",
        body: "A diode is a PN junction with a wire on each side: the p side is the **anode**, the n side the **cathode**. Which job uses its one-way behaviour directly?",
        question: {
          type: "choice",
          options: [
            "Turning AC into DC by passing one direction",
            "Amplifying a weak microphone signal",
            "Storing a bit while the power is off",
            "Switching a current on and off from a third terminal",
          ],
          answer: 0,
          hint: "What does a diode do to a current that keeps changing direction?",
          feedback: {
            1: "Amplifying needs a device whose output is controlled by an input, like the transistor in the next lesson.",
            2: "Bits that survive power-off live in flash memory, built from special transistors.",
            3: "A diode has only two terminals. Control from a third one is what a transistor adds (next lesson).",
          },
        },
        explanation: "A **rectifier** uses diodes to pass only one direction of an alternating current: the first stage of nearly every power supply. The same junction, made from a material whose electrons give off light as they cross, is an **LED**; the colour follows the band gap. The module \"Components in action: capacitors to op-amps\" puts diodes and LEDs into real circuits.",
      },
      {
        kind: "recap",
        points: [
          "Where p meets n, carriers cancel and leave a **depletion region** of fixed ions with a **built-in voltage** (about 0.7 V in this model).",
          "**Reverse bias** widens it (W ∝ √(Vbi − V)) and only a tiny leakage flows.",
          "**Forward bias** narrows it, and the current grows exponentially: I = Is·(e^(V/Vt) − 1), about ×10 per 60 mV.",
          "That is a **diode**: current one way only. Rectifiers and LEDs are PN junctions.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. The MOSFET ───────────────────────────────
  {
    id: "fnd-semi-4-mosfet",
    title: "The MOSFET: a switch made of silicon",
    summary: "Gate, oxide, channel, threshold: how a voltage on an insulated plate opens a path for current, the linear and saturation regions, and how NMOS and PMOS pair up into CMOS.",
    minutes: 11,
    xp: 60,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Four parts",
        body: P(
          "Almost every transistor in a modern chip is a **MOSFET** (metal–oxide–semiconductor field-effect transistor). In the NMOS kind:",
          "- the **body** is p-type silicon.\n- the **source** and **drain** are two heavily doped n-type islands in it (marked n+).\n- between them, on the surface, lies a very thin layer of insulating **oxide**.\n- on top of the oxide sits the **gate**, a conductor.",
          "The gate never touches the silicon: the oxide separates them. Leave the gate at 0 V for now and look at the drawing. Is there any path from source to drain?",
        ),
        widget: { type: "semi-mosfet", props: { type: "nmos", vgs: 0 } },
      },
      {
        kind: "question",
        title: "Off by default",
        body: "With the gate at 0 V and the drain at 3.3 V, why does (almost) no current flow from drain to source?",
        question: {
          type: "choice",
          options: [
            "The oxide layer blocks the path between them",
            "The source is not connected to anything yet",
            "Doped silicon carries no current when cold",
            "Two back-to-back junctions; one is reverse-biased",
          ],
          answer: 3,
          hint: "Walk from the drain to the source through the silicon: n+, then p, then n+. What did the last lesson say about such boundaries?",
          feedback: {
            0: "The oxide sits on top, under the gate. Current from drain to source would flow through the silicon below it.",
            1: "In a circuit the source is connected, usually to ground. The problem is inside the silicon.",
            2: "Doped silicon conducts well at room temperature. The trouble is the junctions in the way.",
          },
        },
        explanation: "Drain to source is n → p → n: **two diodes back to back**. Whichever way you push, one is reverse-biased, so only leakage flows. The transistor is **off**.",
      },
      {
        kind: "explain",
        title: "The gate makes a channel",
        body: P(
          "The gate, the oxide and the body form a **capacitor**: two conductors with an insulator between. Put a positive voltage on the gate and it attracts negative charge to the silicon surface right under the oxide.",
          "At first the gate just pushes the body's holes away, leaving a **depleted** layer. Raise it past the **threshold voltage** (Vth) and it pulls enough electrons to the surface to flip that thin layer to n-type: an **inversion layer**, or **channel**. Now n+ source, n channel and n+ drain are joined, and current flows.",
          "Raise the gate voltage slowly from here and watch the three stages: carriers pushed away, then a channel, then a current that grows with the **square** of the overdrive (how far Vgs is past Vth): I = ½·k·(Vgs − Vth)², with k = 2 mA/V² in this toy.",
        ),
        widget: { type: "semi-mosfet", props: { type: "nmos", vgs: 0.4 } },
      },
      {
        kind: "explain",
        title: "Drain voltage: linear, then saturation",
        body: P(
          "So far the drain sat at the full 3.3 V supply. Now let it vary. With the channel formed, a **small** drain voltage pulls electrons along the whole channel, and the current grows almost in proportion to Vds: the transistor acts like a **resistor** whose value the gate sets. This is the **linear** (or **triode**) region.",
          "Raise Vds further and the channel gets thinner near the drain, because the gate-to-channel voltage there is only Vgs − Vds. Once **Vds reaches Vgs − Vth** the channel **pinches off** at the drain end and the current stops growing: the **saturation** region, where I = ½·k·(Vgs − Vth)², the square law from the last step.",
          txt(`
linear (Vds < Vgs - Vth):       I = k x [ (Vgs - Vth) x Vds - Vds^2 / 2 ]
saturation (Vds >= Vgs - Vth):  I = 1/2 x k x (Vgs - Vth)^2
`),
          "Move both sliders and watch where the curve flattens.",
        ),
        widget: { type: "semi-mosfet", props: { type: "nmos", vgs: 1.7, drain: true, vds: 0.5 } },
      },
      {
        kind: "question",
        title: "Where the current levels off",
        body: "Set the gate to **2.2 V**, then find the **smallest drain voltage** at which the current stops growing: the edge of saturation.",
        widget: { type: "semi-mosfet", props: { type: "nmos", vgs: 0, drain: true, vds: 0.5, hideRegion: true } },
        question: {
          type: "widget",
          goal: { type: "nmos", vgs: 2.2, vds: 1.5 },
          prompt: "Set Vgs to 2.2 V and the drain voltage to the point where the channel just pinches off.",
          hint: "Saturation starts when Vds = Vgs − Vth. Or watch the drain current: below the edge it still creeps up with each 0.1 V step.",
        },
        explanation: "Vds,sat = Vgs − Vth = 2.2 − 0.7 = **1.5 V**. Below it the current still climbs (2.21 mA at 1.3 V, 2.24 mA at 1.4 V); from 1.5 V on it stays at ½ × 2 mA/V² × 1.5² = **2.25 mA** however high the drain goes. Amplifiers run transistors in saturation, where the current depends on the gate and hardly on the drain; a logic switch that is on sits in the linear region (next step).",
      },
      {
        kind: "explain",
        title: "A switch, not a valve",
        body: P(
          "Digital circuits only use the two ends: gate at **0 V** (off) or at the **supply** (fully on). A switch that is on has almost no voltage across it: its drain sits within a few tens of millivolts of its source, deep in the **linear** region, where the transistor behaves like a small resistor. A MOSFET is a superb switch for three reasons:",
          "- **No gate current.** The oxide is an insulator, so a steady gate voltage costs no steady current. Only charging and discharging the tiny gate capacitor takes energy.\n- **Tiny.** Modern transistors are tens of nanometres across, so billions fit on a chip.\n- **One voltage controls another.** The output of one transistor can drive the gates of the next, so logic can be chained.\n\nThe same physics, scaled up to amps, is the discrete **power MOSFET** a microcontroller pin uses to drive a motor or an LED strip: see *Transistors as switches* in the Analog module.",
          "The oxide has to be extremely thin for the gate to have strong control: in the 2000s it reached about 1.2 nm, a handful of atomic layers, and electrons began to tunnel straight through it. Chipmakers replaced it with thicker **high-k** materials (based on hafnium oxide) that control the channel just as strongly with less leakage.",
        ),
      },
      {
        kind: "question",
        title: "The on-resistance",
        body: "Deep in the linear region the Vds² term is tiny, so I ≈ k·(Vgs − Vth)·Vds: the switch is a resistor **R = 1 / (k·(Vgs − Vth))**. For this toy NMOS (k = 2 mA/V², Vth = 0.7 V) driven fully on at **Vgs = 3.3 V**, what is its on-resistance? Give it in ohms.",
        question: { type: "number", answer: 192.3, tolerance: 4, unit: "Ω", hint: "First the overdrive Vgs − Vth, then multiply it by k (in A/V²) and take one over the result." },
        explanation: "Overdrive 3.3 − 0.7 = 2.6 V; R = 1 / (0.002 × 2.6) ≈ **192 Ω**. A weaker gate drive gives a higher resistance, so a switch that is not driven hard runs slow and hot. Real logic transistors are far narrower and sit in the kilohms; a power MOSFET, thousands of cells in parallel, gets down to milliohms (typical figures).",
      },
      {
        kind: "question",
        title: "PMOS: the mirror image",
        body: P(
          "Swap every doping type: an **n-type body**, **p+ source and drain**. Now the gate must go **negative** relative to the source to pull **holes** to the surface and form a p-type channel. That is a **PMOS** transistor. Holes move more slowly than electrons, so a PMOS of the same size carries less current.",
          "Switch to **PMOS** and turn it on to carry at least **1 mA**.",
        ),
        widget: { type: "semi-mosfet", props: { type: "nmos", both: true, vgs: 0 } },
        question: {
          type: "widget",
          goal: { type: "pmos", minIdA: 1e-3 },
          prompt: "Pick PMOS and make the gate voltage negative enough for at least 1 mA.",
          hint: "PMOS needs the gate below the source, and its k is half the NMOS value, so it needs more overdrive for the same current.",
        },
        explanation: "At **−2.2 V** this PMOS carries ½ × 1 mA/V² × (2.2 − 0.7)² ≈ 1.1 mA, half what the NMOS carried at +2.2 V, because holes are slower.",
      },
      {
        kind: "question",
        title: "Why the PMOS is drawn wider",
        body: "In this toy a PMOS has **k = 1 mA/V²** and an NMOS of the same size **2 mA/V²**. In a CMOS inverter (a PMOS pulling the output up, an NMOS pulling it down, as in the module \"Digital logic from transistors\") both should be equally strong. What does the designer change?",
        question: {
          type: "choice",
          options: [
            "Make the PMOS channel about twice as long",
            "Make the PMOS about twice as wide",
            "Give the PMOS a thicker gate oxide",
            "Drive the PMOS gate with twice the supply",
          ],
          answer: 1,
          hint: "k grows with the channel's width and shrinks with its length: a wider channel is more lanes for the carriers.",
          feedback: {
            0: "A longer channel carries less current, not more: k falls as the length grows.",
            2: "A thicker oxide weakens the gate's grip on the channel and lowers k further.",
            3: "Both gates share one input that swings between 0 V and the supply; there is no bigger voltage to give the PMOS.",
          },
        },
        explanation: "k is proportional to the carrier mobility times **W/L** (channel width over length). Holes have roughly half the mobility of electrons in silicon, so a PMOS about **twice as wide** matches the NMOS. In the layout the PMOS also sits in an **n-well**: an island of n-type silicon in the p-type wafer, giving it the n-type body it needs. With both equally strong, one transistor of the pair is always off in a steady state, so almost no current flows from supply to ground: CMOS uses power mainly while switching.",
      },
      {
        kind: "recap",
        points: [
          "A **MOSFET** has a source, a drain, a body and a **gate** insulated by a thin **oxide**. Off by default: two back-to-back junctions.",
          "Past the **threshold voltage**, the gate pulls carriers to the surface and forms a **channel**.",
          "Small Vds: the **linear** (triode) region, a gate-controlled resistor, where an on logic switch sits. Vds ≥ Vgs − Vth: **saturation**, I = ½·k·(Vgs − Vth)².",
          "**NMOS** uses electrons; **PMOS** uses holes and a negative gate, and is drawn about twice as wide. **CMOS** pairs them so one is always off.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 5. Scaling and Moore's law ───────────────────────────────
  {
    id: "fnd-semi-5-scaling",
    title: "Scaling and Moore's law",
    summary: "Fifty years of shrinking transistors: the doubling trend, why smaller once meant faster and cooler for free, why that stopped, how FinFETs and gate-all-around keep going, and the semiconductors beyond silicon.",
    minutes: 12,
    xp: 65,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "An observation, not a law of physics",
        body: P(
          "In 1965 Gordon Moore, later a co-founder of Intel, noticed that the number of components on the most cost-effective chip was **doubling every year**. In 1975 he revised it to **about every two years**. The industry then turned the observation into a target, and for decades roughly kept to it.",
          "\"Moore's law\" is not physics. It is an economic and engineering trend, kept alive by enormous investment, and the doubling period has never been exact. The dots below are approximate published transistor counts for well-known chips. Move the slider to change the doubling period of the orange prediction.",
        ),
        widget: { type: "semi-moore", props: { period: 3.5 } },
      },
      {
        kind: "question",
        title: "Fit the trend",
        body: "Find the doubling period that best fits **fifty years** of real chips.",
        widget: { type: "semi-moore", props: { period: 1 } },
        question: {
          type: "widget",
          goal: { maxErr: 0.3 },
          prompt: "Move the slider until the orange line runs through the dots (the typical miss falls below about ×2).",
          hint: "One year is far too fast: the line shoots off the chart. Try periods between 1.5 and 3 years.",
        },
        explanation: "**Two years** fits: the line misses the chips by less than a factor of two on average across half a century. From 1971 to 2021 that is 25 doublings, a factor of 2²⁵ ≈ 33 million: 2,300 transistors in the Intel 4004 become about 77 billion, the size of the biggest single chips of the early 2020s. (Recent progress per chip leans more on bigger dies and packaging, as the lessons on yield and on packaging show.)",
      },
      {
        kind: "explain",
        title: "Dennard scaling: the free lunch",
        body: P(
          "Why was shrinking so attractive? In 1974 Robert Dennard and colleagues showed that if you shrink **every** dimension of a transistor and its **voltage** by the same factor, good things happen together:",
          "- twice the transistors fit in the same area each generation,\n- each one switches faster (shorter distances, smaller capacitance),\n- and each uses less power (P ≈ α · C · V² · f per transistor, from *From switch to gate*, with C and V both smaller),",
          "so the **power per square centimetre stays the same**. Faster, denser and no hotter. Step through six generations below with both switches on.",
        ),
        widget: { type: "semi-dennard", props: { voltageScales: true, clockScales: true } },
      },
      {
        kind: "question",
        title: "Voltage got stuck",
        body: "Around 2005 the supply voltage stopped shrinking: it sits near 1 V. Find a way to get through **6 generations** without crossing the cooling limit.",
        widget: { type: "semi-dennard", props: { voltageScales: false, clockScales: true, lockVoltage: true } },
        question: {
          type: "widget",
          goal: { gen: 6, voltageScales: false, notOver: true },
          prompt: "With the voltage stuck, choose a clock setting and press Next generation until you reach generation 6 under the limit.",
          hint: "With the voltage stuck, a faster clock doubles the power density every generation. What is the only other knob?",
        },
        explanation: "Keep the **clock speed the same**: density still doubles, but power density then grows only about 1.4× per generation and stays under the limit for six. That is what really happened: desktop clock speeds levelled off at a few gigahertz in the mid-2000s, and the extra transistors went into **more cores** and bigger caches instead (see *Many cores: why 8 cores is not 8x faster*).",
      },
      {
        kind: "explain",
        title: "Why not lower the voltage? Leakage",
        body: P(
          "Lower voltage would save power (energy per switch goes as V²). But a transistor needs its supply well above its **threshold voltage** to turn on hard. Lower the supply and you must lower the threshold too, or the chip gets slow.",
          "The catch: a transistor below threshold is not perfectly off. A small **subthreshold leakage** flows, and it grows **about ten times for every 60 to 100 mV** the threshold drops (60 mV per decade is the physical best at room temperature, the same 60 mV as the diode in lesson 3). A billion slightly leaky switches add up to watts of power doing nothing.",
          "Try it: lower the supply, then see what the threshold has to do.",
        ),
        widget: { type: "semi-leak", props: { vdd: 1.2, vth: 0.45 } },
      },
      {
        kind: "question",
        title: "Find the balance",
        body: "Cut the **energy per switch** to at most **0.65×**, keep the **speed** at least **0.95×**, and keep **leakage** at most **20×**.",
        widget: { type: "semi-leak", props: {} },
        question: {
          type: "widget",
          goal: { maxEnergy: 0.65, minSpeed: 0.95, maxLeak: 20 },
          prompt: "Set the supply and threshold so energy ≤ 0.65×, speed ≥ 0.95× and leakage ≤ 20× all hold at once.",
          hint: "Energy ≤ 0.65× needs a supply of about 0.8 V. Then lower the threshold just enough to win back the speed, and no further.",
        },
        explanation: "About **0.8 V supply with a 0.34 to 0.35 V threshold**: 0.64× the energy, about the same speed, and 13 to 17 times the leakage. The window is narrow, and that is the real story: every step down in voltage costs leakage, so voltage scaling slowed to a crawl and power, not size, became the main limit.",
      },
      {
        kind: "explain",
        title: "Wrapping the gate around the channel",
        body: P(
          "Shrinking created a second problem. In a very short **planar** (flat) transistor, the drain sits so close that it pulls on the channel from below, where the gate cannot reach. The gate loses control and the transistor never fully switches off.",
          "The fix was to give the gate more of the channel to grip. **FinFETs** stand the channel up as a thin fin with the gate on three sides. **Gate-all-around** (GAA) transistors use stacked horizontal **nanosheets**, each completely surrounded by the gate.",
          "Compare the three cross-sections.",
        ),
        widget: { type: "semi-gates", props: { structure: "planar" } },
      },
      {
        kind: "question",
        title: "What does \"3 nm\" measure?",
        body: "A foundry announces its \"3 nm\" process. What does the \"3 nm\" tell you?",
        question: {
          type: "choice",
          options: [
            "Every transistor gate is exactly 3 nm long",
            "The tightest metal pitch on the chip is 3 nm",
            "A generation label; real pitches are far larger",
            "The finest line the scanner can print in one exposure",
          ],
          answer: 2,
          hint: "Node names once matched a real dimension. Do they still?",
          feedback: {
            0: "Gate lengths stopped tracking the node name in the late 1990s. A \"3 nm\" transistor's gate is well over 3 nm long.",
            1: "The tightest metal wires at such nodes are reported at a pitch of roughly 20 to 25 nm, far wider than 3 nm.",
            3: "Even EUV prints lines of roughly 12 nm and more in one exposure (the lithography lesson works it out); nothing prints 3 nm lines.",
          },
        },
        explanation: "Modern **node names are labels**, not measurements. Until the 1990s the number matched the gate length; since then it has simply kept shrinking by about 0.7× per generation as a name. Published estimates for \"5 nm\" class processes put the spacing between neighbouring gates around 50 nm. Two companies' \"7 nm\" can also differ in density, so engineers compare actual pitches and transistor densities instead.",
      },
      {
        kind: "question",
        title: "Beyond silicon: wide gaps and fast electrons",
        body: P(
          "Shrinking is silicon's story, but several other semiconductors are made in volume for jobs silicon does badly (typical room-temperature values):",
          txt(`
material   gap      breakdown field   typical jobs
Si         1.12 eV  ~0.3 MV/cm        logic, memory, most power parts
GaAs       1.42 eV  ~0.4 MV/cm        phone radio amplifiers, LEDs, lasers
InP        1.34 eV  ~0.5 MV/cm        the fastest radio chips, 1550 nm lasers
SiC (4H)   3.26 eV  ~2.5-3 MV/cm      car inverters, solar, 1,200 V switches
GaN        3.4 eV   ~3.3 MV/cm        compact chargers, radar, base stations
`),
          "**Wide band gap** materials (SiC, GaN) hold about ten times the electric field before electrons tear loose (**breakdown**), and heat frees almost no carriers in them (try 600 K below). **GaAs** and **InP** win on speed: electrons move several times faster than in silicon, which suits radio frequencies.",
          "A switch that must block a voltage V needs a layer roughly **t ≈ V / E_breakdown** thick (a rough uniform-field estimate). How thin can that layer be in **GaN** blocking **650 V**? Give it in micrometres.",
        ),
        widget: { type: "semi-bands", props: { material: "gan", tempK: 600, materials: ["si", "gaas", "sic", "gan"] } },
        question: { type: "number", answer: 1.97, tolerance: 0.15, unit: "µm", hint: "3.3 MV/cm is 3.3 × 10⁶ V per cm. Divide 650 V by it to get centimetres, then multiply by 10⁴ for micrometres." },
        explanation: "650 / (3.3 × 10⁶ V/cm) ≈ 2.0 × 10⁻⁴ cm ≈ **2 µm**. Silicon needs 650 / (0.3 × 10⁶) ≈ 22 µm, about eleven times thicker, and a thicker, more lightly doped layer has far more resistance. (Real layers are about twice the uniform-field estimate, and in a lateral GaN transistor the gate-to-drain spacing plays this role.) That is why, as of 2025, 650 V GaN parts shrink laptop chargers and SiC dominates 800 V electric-car inverters, while GaAs amplifiers sit in most phones. They cost more than silicon: SiC wafers are mostly 150 mm, moving to 200 mm, and GaN is often grown on silicon or SiC wafers.",
      },
      {
        kind: "recap",
        points: [
          "**Moore's law**: transistors per chip doubled about **every two years** for five decades. An observation and an industry target, not physics.",
          "**Dennard scaling**: shrinking size and voltage together kept power density constant. It ended around 2005 when voltage stopped falling.",
          "Lower voltage needs a lower threshold, and leakage rises about **10× per 60–100 mV** of threshold. Clocks stalled; cores multiplied.",
          "Planar → **FinFET** (gate on 3 sides) → **gate-all-around** (all sides) for better control. Node names like \"3 nm\" are **labels**.",
          "Beyond silicon: **SiC** and **GaN** (wide band gap) for high-voltage, hot power switches; **GaAs** and **InP** for radio and light.",
        ],
      },
    ],
  },
];
