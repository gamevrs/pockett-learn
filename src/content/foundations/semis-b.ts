import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (tables, diagrams) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 6 to 10 of "Semiconductors: physics to fab": wafers, the process loop, lithography, yield and cost, packaging and test. */
export const semisLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 6. Making a wafer ───────────────────────────────
  {
    id: "fnd-semi-6-wafer",
    title: "Making a wafer",
    summary: "Sand to polysilicon to a single-crystal ingot to polished 300 mm wafers, and the cleanrooms (ISO classes) that keep dust off them.",
    minutes: 10,
    xp: 70,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "From sand to a mirror",
        body: P(
          "Lesson 2 showed that one dopant atom in five million changes silicon's behaviour completely. So the raw material has to be purer than almost anything else people make, and it has to be a **single crystal**: one unbroken lattice from edge to edge.",
          "Play the five scenes: how beach-grade quartz becomes the polished discs a fab starts from. Use the arrows to step, or the bar to scrub.",
        ),
        widget: { type: "semi-ingot", props: {} },
      },
      {
        kind: "question",
        title: "In order",
        body: "Put the stages in order, from the raw material to the wafer.",
        question: {
          type: "order",
          items: [
            "Quartz sand heated with carbon in an arc furnace",
            "Metallurgical-grade silicon, about 98–99% pure",
            "Distilled as a gas (trichlorosilane)",
            "Deposited as ultra-pure polysilicon",
            "Melted and pulled into a single-crystal ingot",
            "Sliced, polished and inspected wafers",
          ],
          hint: "The silicon has to get pure before it can become one crystal, and it has to be one crystal before it is sliced.",
        },
        explanation: "Sand → **metallurgical silicon** → a distillable **gas** → **polysilicon** at nine nines or better → a **single-crystal ingot** grown from a seed → **wafers**. Each step has a different job: reduce, purify, crystallise, shape.",
      },
      {
        kind: "question",
        title: "Why one crystal?",
        body: "Polysilicon is already pure enough. Why melt it again and grow a **single** crystal?",
        question: {
          type: "choice",
          options: [
            "Grain boundaries trap carriers, so transistors vary",
            "One big crystal is cheaper to grow than polysilicon",
            "Lithography light must pass through a single crystal",
            "Polysilicon cannot be doped n-type or p-type",
          ],
          answer: 0,
          hint: "\"Poly\" means many. What lies between many small crystals?",
          feedback: {
            1: "Growing the ingot is an extra, slow and expensive step on top of making polysilicon.",
            2: "Lithography light only has to reach the resist on the surface, and silicon absorbs visible light anyway (lesson 1).",
            3: "Polysilicon dopes fine: doped polysilicon was the transistor gate material for decades.",
          },
        },
        explanation: "Grain **boundaries** between crystals are full of broken bonds that trap carriers. Billions of matched transistors need the **same lattice everywhere**, so the ingot grows as one crystal, and its orientation is marked by the notch so every fab step lines up with it.",
      },
      {
        kind: "question",
        title: "Pulling a crystal",
        body: "In the **Czochralski** (CZ) method a small seed crystal is dipped into molten silicon in a quartz crucible at about 1,414 °C, then slowly rotated and pulled up, and the melt freezes onto it as one crystal. What mainly sets the **diameter** of the ingot?",
        question: {
          type: "choice",
          options: [
            "The diameter of the seed crystal dipped in",
            "The inside diameter of the quartz crucible",
            "How fast it is pulled and how hot the melt is",
            "Which way the seed and the crucible rotate",
          ],
          answer: 2,
          hint: "The crystal grows wherever the melt freezes onto it. What decides how far out from the seed that happens?",
          feedback: {
            0: "The seed is only millimetres across; the crystal spreads out from it into a cone and then the full width.",
            1: "The crucible must be much wider than the ingot, with melt all around it; the ingot never touches the walls.",
            3: "Rotation (seed and crucible usually turn opposite ways) mainly evens out the temperature and the dopant. It does not set the width.",
          },
        },
        explanation: "**Pull faster** or run the melt **hotter** and the crystal grows thinner; slower or cooler and it widens. A control loop watches the bright ring where crystal meets melt and trims both to hold the diameter, typically a little over 300 mm before grinding. A thin **neck** pulled first lets crystal defects grow out before the full width. The quartz crucible slowly dissolves, so CZ wafers carry oxygen, typically 10¹⁷ to 10¹⁸ atoms per cm³: fabs even use it to trap metal impurities away from the transistors, and the oxygen-free **float-zone** method is kept for power devices and detectors.",
      },
      {
        kind: "question",
        title: "How big is a wafer?",
        body: "Modern fabs use wafers **300 mm** across (older ones 200 mm). What is the area of a 300 mm wafer in **cm²**? Work it out.",
        question: { type: "number", answer: 706.9, tolerance: 5, unit: "cm²", hint: "Area = π × r². The radius is 150 mm, which is 15 cm." },
        explanation: "π × 15² ≈ **707 cm²**, about 2.25 times a 200 mm wafer's 314 cm². Bigger wafers spread each step's cost over more chips, which is why the industry moved to 300 mm around 2000; a move to 450 mm was attempted and shelved in the mid-2010s. You will use this area in *Yield and cost*.",
      },
      {
        kind: "explain",
        title: "Cleanrooms and ISO classes",
        body: P(
          "A speck of dust 0.5 µm across is ten or more times wider than the finest lines on a modern chip; one landing in the wrong place kills a die. So wafers are processed in **cleanrooms**, rated by the international standard **ISO 14644-1** in classes from **ISO 1** (cleanest) to **ISO 9**.",
          "Each class sets a maximum number of particles per cubic metre of air, for each particle size. The rule behind the table:",
          txt("max particles >= D um per m3  =  10^N x (0.1 / D)^2.08      N = the ISO class"),
          "Ordinary indoor air is roughly ISO 9. The older US standard called ISO 5 \"Class 100\" (at most 100 particles of 0.5 µm or more per cubic foot). Explore the classes.",
        ),
        widget: { type: "semi-iso", props: { cls: 9, size: 0.5 } },
      },
      {
        kind: "question",
        title: "Find \"Class 100\"",
        body: "Find the ISO class that allows about **3,520 particles of 0.5 µm or larger per m³**: the old \"Class 100\".",
        widget: { type: "semi-iso", props: { cls: 9, size: 0.5 } },
        question: {
          type: "widget",
          goal: { cls: 5, size: 0.5 },
          prompt: "Keep the size at 0.5 µm and change the class until the limit is about 3,520 per m³.",
          hint: "Each class down divides the limit by ten. ISO 9 allows about 35 million at this size.",
        },
        explanation: "**ISO 5**: 10⁵ × (0.1/0.5)^2.08 ≈ 3,520 per m³, which is 100 per cubic foot. Each class is ten times cleaner than the one above.",
      },
      {
        kind: "code",
        title: "The ISO formula",
        body: "Write `iso_limit(cls, size_um)`: the most particles of `size_um` micrometres or larger allowed per cubic metre in ISO class `cls`, using 10^N × (0.1 / D)^2.08. Return the unrounded value.",
        language: "python",
        starter: `def iso_limit(cls, size_um):
    # 10**cls * (0.1 / size_um) ** 2.08
    return 0
`,
        solution: `def iso_limit(cls, size_um):
    return 10 ** cls * (0.1 / size_um) ** 2.08
`,
        tests: [
          { id: "iso5", description: "ISO 5 at 0.5 µm is about 3,520", assertionCode: `v = iso_limit(5, 0.5)\nassert 3500 < v < 3530, f"expected about 3520, got {v}"` },
          { id: "iso1", description: "ISO 1 at 0.1 µm is exactly 10", assertionCode: `v = iso_limit(1, 0.1)\nassert abs(v - 10) < 1e-9, f"expected 10, got {v}"` },
          { id: "iso8", description: "ISO 8 at 1 µm is about 832,000", assertionCode: `v = iso_limit(8, 1)\nassert 830000 < v < 834000, f"expected about 832000, got {v}"` },
        ],
        hints: ["Python's power operator is **.", "Make sure 0.1 / size_um is computed before raising it to 2.08."],
      },
      {
        kind: "question",
        title: "Where the dirt comes from",
        body: "Modern fabs keep the big halls around ISO 5 to 7 but move wafers between tools in **sealed boxes** (FOUPs) with even cleaner air inside. Why not just make the whole building ISO 1?",
        question: {
          type: "choice",
          options: [
            "ISO 1 air is too dry for people to work in",
            "Particles that small cannot harm modern chips",
            "No filter system can reach ISO 1 in a room of any size",
            "People shed particles; a clean hall costs a fortune",
          ],
          answer: 3,
          hint: "Think about what in a cleanroom sheds the most particles, and how much air you would have to filter.",
          feedback: {
            0: "Cleanroom air is filtered of particles, not of water; humidity is controlled separately.",
            1: "A 0.1 µm particle is wider than the finest lines on a modern chip; it can easily kill a die.",
            2: "Small sealed spaces such as wafer pods and tool mini-environments do reach that level. A whole hall is the hard part.",
          },
        },
        explanation: "A person sheds skin flakes and fibres even in a full gown, and filtering a whole building to ISO 1 would cost a fortune. So fabs automate wafer transport and seal wafers in **FOUPs** (front-opening unified pods) and tool **mini-environments**, the way a surgeon protects the operating field rather than the whole hospital.",
      },
      {
        kind: "recap",
        points: [
          "Sand → metallurgical silicon (98–99%) → distilled gas → **polysilicon** (nine nines or better) → **single-crystal ingot** (Czochralski, from a seed at 1,414 °C) → **wafers**.",
          "Single crystal: no grain boundaries, the same lattice for every transistor; a notch marks its direction.",
          "Czochralski growth: the **pull rate and melt temperature** set the diameter; the quartz crucible leaves oxygen in the crystal. Modern wafers are **300 mm** (about 707 cm², 0.775 mm thick).",
          "**Cleanrooms** are rated ISO 1 to ISO 9 by ISO 14644-1 (limit = 10^N × (0.1/D)^2.08 per m³); sealed carriers keep wafers cleaner still.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. The fab process loop ───────────────────────────────
  {
    id: "fnd-semi-7-process",
    title: "The fab process loop",
    summary: "Add a film, pattern it, change it, repeat: oxidation, photoresist, exposure, development, etching, implantation, deposition and polishing in a hands-on process simulator.",
    minutes: 12,
    xp: 75,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "One loop, many times",
        body: P(
          "A chip is built in layers, from the transistors at the bottom up through more than a dozen layers of wiring. Each layer comes from the same basic **loop**:",
          txt(`
1. add a film          oxidise or deposit a layer on the whole wafer
2. coat                spin on light-sensitive photoresist
3. expose              shine light through a mask (lesson 8)
4. develop             dissolve the exposed resist: the pattern appears
5. change              etch away the uncovered film, or implant dopants into it
6. strip               remove the leftover resist, clean, inspect
`),
          "The resist is a **stencil**: it is only there to protect some parts of the wafer while step 5 changes the others. After stripping, only the change remains.",
        ),
      },
      {
        kind: "question",
        title: "The basic order",
        body: "Put the steps of one patterning loop in order.",
        question: {
          type: "order",
          items: ["Oxidise the wafer", "Coat with photoresist", "Expose through the mask", "Develop the resist", "Etch the uncovered oxide", "Strip the resist"],
          hint: "The resist has to exist before light can change it, and the pattern has to be developed before it can protect anything.",
        },
        explanation: "**Film, coat, expose, develop, etch, strip.** Expose before coating and nothing records the light; etch before developing and the resist still covers everything; strip before etching and the pattern is lost.",
      },
      {
        kind: "explain",
        title: "Try the loop",
        body: P(
          "Below is a slice through a toy wafer, twelve columns wide. The black bar on top is the **mask**: its opening sits over the middle four columns. Each button is one fab step; the recipe you build shows underneath, and **Undo** takes a step back.",
          "Try things in the wrong order too. Etch with no resist on, or implant into a bare wafer, and see what goes wrong.",
        ),
        widget: { type: "semi-fab", props: {} },
      },
      {
        kind: "question",
        title: "Open a window",
        body: "Use the fab to **open a window in the oxide**: oxide everywhere except over the mask opening, and no resist left.",
        widget: { type: "semi-fab", props: { task: "window" } },
        question: {
          type: "widget",
          goal: { task: "window" },
          prompt: "Build a recipe that leaves oxide everywhere except under the mask opening, with all the resist removed.",
          hint: "You need a film to pattern first. Then: protect what should stay, open what should go, remove it, clean up.",
        },
        explanation: "**Oxidise → coat → expose → develop → etch → strip.** The oxide that remains is a precise stencil of its own, made of glass instead of plastic: it survives heat that would burn resist, which is exactly what the next step uses it for.",
      },
      {
        kind: "question",
        title: "Dope only the window",
        body: "Now **dope only the silicon under the mask opening**, with no resist left at the end.",
        widget: { type: "semi-fab", props: { task: "dope" } },
        question: {
          type: "widget",
          goal: { task: "dope" },
          prompt: "Make a recipe that ends with doped silicon under the opening only, and no resist on the wafer.",
          hint: "Ion implantation dopes whatever bare silicon it hits. Something must cover the rest of the wafer when you implant.",
        },
        explanation: "Open a window, then **implant**: the ions stop in the oxide (or resist) and only reach silicon through the window. Wells and many other implants are masked this way. The source and drain of lesson 4 are different: they use the gate itself (plus thin spacers beside it) as the mask, so they are **self-aligned** to the channel automatically. Real fabs then **anneal** the wafer (heat it briefly) to repair the crystal damage the ions cause and switch the dopants on.",
      },
      {
        kind: "question",
        title: "Positive and negative resist",
        body: "This simulator uses **positive** resist: exposed areas dissolve. With **negative** resist, exposed areas harden and the rest dissolves. If you swapped to negative resist and kept the same mask and recipe, what would the window step produce?",
        question: {
          type: "choice",
          options: [
            "Exactly the same window as before",
            "The inverse: oxide only under the opening",
            "No pattern: the developer removes all the resist",
            "The same window, with blurrier edges",
          ],
          answer: 1,
          hint: "With negative resist, which areas does the developer wash away: the ones the light hit, or the others?",
          feedback: {
            0: "Negative resist dissolves where the light did not hit, the opposite of positive resist.",
            2: "The exposed part hardens and stays, so there is still a pattern, just a different one.",
            3: "Edge sharpness depends on the optics and the resist chemistry, not mainly on its tone; the bigger change is which side is kept.",
          },
        },
        explanation: "Negative resist keeps the **exposed** areas, so the stencil inverts: oxide stays only under the opening. Fabs pick the resist tone that suits each layer, and design the masks to match.",
      },
      {
        kind: "explain",
        title: "Wires: inlay and polish",
        body: P(
          "Above the transistors sit the **interconnects**: layer after layer of copper wires in insulating glass, joined by vertical **vias**. Copper is hard to etch cleanly, so since the late 1990s fabs have **inlaid** it instead, a method called **damascene** after inlaid metalwork:",
          "1. etch trenches into the insulator, using the same loop as before,\n2. **deposit** copper over everything, filling the trenches and more,\n3. grind the surface flat with **chemical-mechanical polishing** (CMP) until only the copper in the trenches is left.",
          "The transistors are called the **front end of line** (FEOL); the wiring stack is the **back end of line** (BEOL). Advanced logic chips have a dozen or more metal layers, fine at the bottom and thick at the top.",
        ),
      },
      {
        kind: "question",
        title: "Inlay a wire",
        body: "Use the fab to **inlay a copper wire**: copper inside the opening, flush with the oxide around it, nothing else on top.",
        widget: { type: "semi-fab", props: { task: "wire" } },
        question: {
          type: "widget",
          goal: { task: "wire" },
          prompt: "Make a recipe that ends with copper only in the opening, level with the surrounding oxide, and no resist.",
          hint: "First make a hole in the oxide. Then fill it with more copper than you need, and get rid of the excess.",
        },
        explanation: "**Oxidise, coat, expose, develop, etch, strip, deposit, polish.** CMP stops at the oxide because the slurry and pad remove copper much faster than glass. Every metal layer is made this way, so a finished chip has been polished flat many times.",
      },
      {
        kind: "question",
        title: "Six hundred chances to fail",
        body: "A flow has **600** steps, and each step independently ruins **0.1%** of the dies passing through it (a step yield of 99.9%). What share of the dies survives all 600 steps? Give it in per cent.",
        question: { type: "number", answer: 54.9, tolerance: 0.5, unit: "%", hint: "Each step keeps 0.999 of the dies. Surviving two steps is 0.999 × 0.999; how about 600?" },
        explanation: "0.999⁶⁰⁰ ≈ 0.549: only about **55%** survive, though every single step looks excellent. At 99.99% per step it is 94%. A real advanced flow runs from several hundred to over a thousand steps (film, coat, expose, develop, etch, strip, plus cleans, anneals and measurements), taking around two to three months from bare wafer to finished chips (typical figures), so each step has to be far better than 99.9%. That is why fabs measure constantly, as *Measuring and controlling the process* shows.",
      },
      {
        kind: "recap",
        points: [
          "Every layer comes from one loop: **film → coat → expose → develop → etch or implant → strip**. Resist is a temporary stencil.",
          "**Oxide** can also be a stencil, one that survives heat. **Implantation** dopes only bare silicon; annealing repairs the damage.",
          "Copper wiring is **inlaid** (damascene): etch trenches, deposit copper, polish flat with **CMP**.",
          "FEOL builds transistors, BEOL the wiring stack. A real flow is hundreds to over a thousand steps, about 2–3 months, and step yields multiply: 99.9% over 600 steps leaves 55%.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. Lithography ───────────────────────────────
  {
    id: "fnd-semi-8-lithography",
    title: "Lithography: printing with light",
    summary: "Why the wavelength sets the smallest feature: Rayleigh's CD = k1·λ/NA, water-immersion DUV at 193 nm, EUV at 13.5 nm, multi-patterning and the cost of each trick.",
    minutes: 12,
    xp: 75,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "A projector in reverse",
        body: P(
          "The **expose** step is done by a **scanner**: a machine that projects the pattern of a **mask** (also called a **reticle**) through a lens onto the resist, shrunk **four times**. It exposes one field of up to about 26 × 33 mm at a time, then steps to the next, hundreds of times per wafer, lining each layer up with the ones below to within a few nanometres.",
          "Light spreads out (diffracts) through small openings, so there is a limit to how fine a pattern any lens can print. The **Rayleigh criterion** gives the smallest **half-pitch** (the width of one line in a pattern of equal lines and spaces), called the **critical dimension** or CD:",
          txt("CD = k1 x wavelength / NA"),
          "- **wavelength** (λ): shorter light prints finer.\n- **NA** (numerical aperture): how wide a cone of light the lens collects. Bigger is finer.\n- **k1**: everything else about the process. Its theoretical floor for lines and spaces is **0.25**; production often runs between about 0.3 and 0.4.",
        ),
        widget: { type: "semi-litho", props: { source: "krf", k1: 0.4, sources: ["iline", "krf", "arf"] } },
      },
      {
        kind: "question",
        title: "The workhorse",
        body: "The workhorse of the 2010s is an **ArF immersion** scanner: **λ = 193 nm**, **NA = 1.35**. At **k1 = 0.30**, what half-pitch can it print in one exposure? Work it out in nanometres.",
        question: { type: "number", answer: 42.9, tolerance: 0.5, unit: "nm", hint: "CD = k1 × λ / NA = 0.30 × 193 / 1.35." },
        explanation: "0.30 × 193 / 1.35 ≈ **42.9 nm**: lines about 43 nm wide with 43 nm gaps. Pushing k1 to the 0.25 floor only reaches about 36 nm, so anything finer needs a different trick.",
      },
      {
        kind: "question",
        title: "Why water?",
        body: "Plain (dry) ArF scanners top out around **NA 0.93**. **Immersion** scanners fill the gap between the lens and the wafer with ultra-pure water and reach **NA 1.35**. Why does water help?",
        question: {
          type: "choice",
          options: [
            "It cools the wafer so the resist does not melt",
            "It shortens the wavelength the laser emits",
            "Its higher index lets steeper rays reach the wafer",
            "It absorbs the stray light that would blur the image",
          ],
          answer: 2,
          hint: "NA depends on the angle of the light cone and on the medium the light travels through.",
          feedback: {
            0: "Temperature control matters, but it is not why NA goes up.",
            1: "The laser still emits 193 nm light. The water changes the medium the light ends in, which is what NA counts.",
            3: "The water must be perfectly clear at 193 nm; it is not there to absorb anything.",
          },
        },
        explanation: "**NA = n · sin θ**. In air n = 1, so NA can never reach 1. Water (n ≈ 1.44 at 193 nm) lets the steepest rays through, so the same 193 nm light prints finer. Immersion is why 193 nm light stayed in use for more than a decade longer than expected.",
      },
      {
        kind: "question",
        title: "Beyond one exposure",
        body: "Using only **DUV** light (KrF or ArF), print lines with a half-pitch of **22 nm or less**.",
        widget: { type: "semi-litho", props: { source: "arfi", k1: 0.4, split: true, sources: ["krf", "arf", "arfi"] } },
        question: {
          type: "widget",
          goal: { sources: ["krf", "arf", "arfi"], maxHp: 22 },
          prompt: "Pick a DUV source, k1 and patterning so the half-pitch is 22 nm or less.",
          hint: "One exposure of ArF immersion cannot go below about 36 nm even at k1 = 0.25. Split the pattern.",
        },
        explanation: "**Multi-patterning**: ArF immersion at k1 ≈ 0.3 with double patterning reaches about 21 nm; quadruple (self-aligned quadruple patterning, SAQP) goes further. Splitting a layer into interleaved exposures, or into lines plus deposited spacers that halve the pitch, prints finer than the optics allow, but every extra pass adds masks, steps, time and **overlay** error (layers misaligned to each other).",
      },
      {
        kind: "explain",
        title: "EUV: 13.5 nm",
        body: P(
          "**Extreme ultraviolet** lithography jumps from 193 nm to **13.5 nm**. Nothing is transparent at that wavelength, not even air or glass, so an EUV scanner is very different:",
          "- the light comes from **tin droplets** hit by a powerful laser tens of thousands of times a second, making a plasma that glows at 13.5 nm,\n- the whole light path is in **vacuum**,\n- **mirrors** replace lenses, each a stack of dozens of molybdenum and silicon layers, and each reflects only about 70% of the light, so most of it is lost on the way,\n- even the mask is a mirror.",
          "Today's EUV tools have **NA 0.33**; **high-NA EUV** at **NA 0.55** is entering use (as of 2025). As of 2025 a single company, ASML, builds all EUV scanners, and each one is reported to cost well over a hundred million dollars (high-NA several hundred million). Pick EUV below.",
        ),
        widget: { type: "semi-litho", props: { source: "euv", k1: 0.5, sources: ["arfi", "euv", "euvh"] } },
      },
      {
        kind: "question",
        title: "One EUV exposure",
        body: "With standard **EUV** (NA 0.33) and a **single exposure**, reach a half-pitch of **16 nm or less**.",
        widget: { type: "semi-litho", props: { source: "arfi", k1: 0.45, sources: ["arfi", "euv", "euvh"] } },
        question: {
          type: "widget",
          goal: { source: "euv", maxHp: 16 },
          prompt: "Choose EUV and set k1 so one exposure prints a half-pitch of 16 nm or less.",
          hint: "CD = k1 × 13.5 / 0.33. Solve for the k1 that gives 16 nm.",
        },
        explanation: "k1 ≤ 0.39 gives ≤ 16 nm in a **single** EUV exposure, where DUV would need four passes. That is EUV's economic case: fewer steps and masks per critical layer, despite the far more expensive tool.",
      },
      {
        kind: "code",
        title: "Rayleigh in code",
        body: "Write `rayleigh_cd(k1, wavelength_nm, na)`: the smallest half-pitch in nanometres, k1 · λ / NA.",
        language: "python",
        starter: `def rayleigh_cd(k1, wavelength_nm, na):
    return 0
`,
        solution: `def rayleigh_cd(k1, wavelength_nm, na):
    return k1 * wavelength_nm / na
`,
        tests: [
          { id: "arfi", description: "ArF immersion at k1 0.30 is about 42.9 nm", assertionCode: `v = rayleigh_cd(0.30, 193, 1.35)\nassert abs(v - 42.89) < 0.01, f"expected about 42.89, got {v}"` },
          { id: "euv", description: "EUV at k1 0.40 is about 16.4 nm", assertionCode: `v = rayleigh_cd(0.40, 13.5, 0.33)\nassert abs(v - 16.36) < 0.01, f"expected about 16.36, got {v}"` },
          { id: "hna", description: "High-NA EUV at k1 0.40 is under 10 nm", assertionCode: `v = rayleigh_cd(0.40, 13.5, 0.55)\nassert abs(v - 9.82) < 0.01, f"expected about 9.82, got {v}"` },
        ],
        hints: ["Multiply k1 by the wavelength, then divide by NA."],
      },
      {
        kind: "question",
        title: "The price of a bigger NA",
        body: "The **depth of focus** (how far the wafer can be from perfect focus and still print) is roughly λ / NA². What happens when EUV goes from NA 0.33 to 0.55?",
        question: {
          type: "choice",
          options: [
            "It falls to about a third: wafers must be flatter",
            "It improves, so the wafers can be a little less flat",
            "Nothing: it depends only on the wavelength",
            "It falls to about 60%, in step with 1 / NA",
          ],
          answer: 0,
          hint: "NA appears squared in the denominator.",
          feedback: {
            1: "A bigger NA means a steeper light cone, which comes into focus over a shorter distance.",
            2: "NA appears squared in the formula, so it matters a lot.",
            3: "That would be true if NA were not squared. With NA², the ratio is 0.33² / 0.55² ≈ 0.36.",
          },
        },
        explanation: "0.33² / 0.55² ≈ 0.36: depth of focus falls from about 124 nm to about **45 nm**. Thinner resist, flatter wafers (CMP again) and tighter focus control are part of the price of every resolution gain. There are no free rides in lithography.",
      },
      {
        kind: "recap",
        points: [
          "A **scanner** projects a **mask** onto resist at 4× reduction, field by field, aligned to within nanometres.",
          "**Rayleigh**: CD = k1 · λ / NA. k1 ≥ 0.25; production typically about 0.3 to 0.4.",
          "**DUV**: ArF at **193 nm**, water **immersion** lifts NA to 1.35 (about 36–43 nm half-pitch); finer needs **multi-patterning**, at a cost in steps and overlay.",
          "**EUV**: **13.5 nm**, mirrors in vacuum, NA 0.33 now and 0.55 arriving; bigger NA means less depth of focus.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 9. Yield and cost ───────────────────────────────
  {
    id: "fnd-semi-9-yield",
    title: "Yield and cost",
    summary: "Random defects, the Poisson yield model, dies per wafer and cost per good die: why big chips are expensive and chiplets help.",
    minutes: 12,
    xp: 85,
    level: "Professional",
    steps: [
      {
        kind: "explain",
        title: "Defects land at random",
        body: P(
          "Despite the cleanroom, every wafer collects a few **killer defects**: a particle, a scratch, a bridge between two wires. The average number per area is the **defect density**, **D0**, in defects per cm². A die is ruined if any defect lands on it.",
          "If defects land independently and at random, the chance that a die of area **A** gets **none** follows the **Poisson** distribution:",
          txt("Y = e^(-A x D0)        A in cm², D0 in defects per cm²"),
          "**Y** is the **yield**: the fraction of dies that work. Change the die size and the defect density, and press **Another wafer** to see how chance alone moves a single wafer around the prediction.",
        ),
        widget: { type: "semi-yield", props: { side: 10, d0: 0.1 } },
      },
      {
        kind: "question",
        title: "Biggest die at 80%",
        body: "At **D0 = 0.2 per cm²**, find the **largest square die** whose Poisson yield is still at least **80%**.",
        widget: { type: "semi-yield", props: { side: 16, d0: 0.2 } },
        question: {
          type: "widget",
          goal: { d0: 0.2, minYieldPct: 80, minSide: 10 },
          prompt: "Keep D0 at 0.20 and pick the biggest die size that keeps the Poisson yield at 80% or above.",
          hint: "e^(−A × 0.2) ≥ 0.8 means A ≤ ln(1/0.8) / 0.2. Work out that area in cm², then in mm².",
        },
        explanation: "A ≤ ln(1.25) / 0.2 ≈ 1.12 cm², so **10 × 10 mm** (1 cm², 81.9%) is the biggest whole-millimetre square; 11 × 11 mm gives 78.5%. Yield falls **exponentially** with area: doubling the die does not halve the yield, it squares it.",
      },
      {
        kind: "code",
        title: "Poisson yield",
        body: "Write `poisson_yield(area_cm2, d0)`: the fraction of dies with no defect, e^(−A·D0).",
        language: "python",
        starter: `import math

def poisson_yield(area_cm2, d0):
    return 0.0
`,
        solution: `import math

def poisson_yield(area_cm2, d0):
    return math.exp(-area_cm2 * d0)
`,
        tests: [
          { id: "big", description: "A 6 cm² die at D0 0.1 yields about 54.9%", assertionCode: `v = poisson_yield(6, 0.1)\nassert abs(v - 0.5488) < 0.001, f"expected about 0.549, got {v}"` },
          { id: "one", description: "1 cm² at D0 0.2 yields about 81.9%", assertionCode: `v = poisson_yield(1, 0.2)\nassert abs(v - 0.8187) < 0.001, f"expected about 0.819, got {v}"` },
          { id: "zero", description: "With no defects every die works", assertionCode: `v = poisson_yield(4, 0)\nassert v == 1, f"expected 1, got {v}"` },
        ],
        hints: ["math.exp(x) is e to the power x.", "The exponent is negative: minus area times defect density."],
      },
      {
        kind: "explain",
        title: "Dies per wafer",
        body: P(
          "Square dies do not tile a round wafer: the edge wastes partial dies. A common approximation for the number of whole dies is:",
          txt("DPW ≈ π × (d/2)² / A  −  π × d / √(2 × A)        d = wafer diameter, A = die area (same units)"),
          "The first term is the wafer area divided by the die area; the second subtracts the partial dies lost around the edge. The map in the widget counts real squares instead, with a 3 mm edge excluded, and lands close to the formula.",
          "Turn on the wafer cost: now the widget also shows the **cost per good die** = wafer cost / (dies per wafer × yield).",
        ),
        widget: { type: "semi-yield", props: { side: 10, d0: 0.1, cost: true } },
      },
      {
        kind: "code",
        title: "Dies per wafer",
        body: P(
          "Write `dies_per_wafer(diameter_mm, die_area_mm2)` using the approximation above, **rounded down** to a whole number of dies (use `math.floor`). Return 0 if the formula goes negative.",
        ),
        language: "python",
        starter: `import math

def dies_per_wafer(diameter_mm, die_area_mm2):
    # pi * (d/2)**2 / A  -  pi * d / sqrt(2 * A)
    return 0
`,
        solution: `import math

def dies_per_wafer(diameter_mm, die_area_mm2):
    d = diameter_mm
    a = die_area_mm2
    v = math.pi * (d / 2) ** 2 / a - math.pi * d / math.sqrt(2 * a)
    return max(0, math.floor(v))
`,
        tests: [
          { id: "small", description: "100 mm² dies on a 300 mm wafer: 640", assertionCode: `v = dies_per_wafer(300, 100)\nassert v == 640, f"expected 640, got {v}"` },
          { id: "big", description: "600 mm² dies on a 300 mm wafer: 90", assertionCode: `v = dies_per_wafer(300, 600)\nassert v == 90, f"expected 90, got {v}"` },
          { id: "200", description: "100 mm² dies on a 200 mm wafer: 269", assertionCode: `v = dies_per_wafer(200, 100)\nassert v == 269, f"expected 269, got {v}"` },
        ],
        hints: ["Compute the two terms separately, then subtract.", "math.sqrt(2 * a) is the square root in the second term."],
      },
      {
        kind: "question",
        title: "Cost per good die",
        body: "A wafer costs **$10,000** (an illustrative round figure). It holds **90** dies of 600 mm², and the yield is **55%**. What does one **working** die cost? Work it out in dollars.",
        question: { type: "number", answer: 202, tolerance: 2, unit: "$", hint: "Good dies = dies per wafer × yield. Then divide the wafer cost by that." },
        explanation: "90 × 0.55 = 49.5 good dies; $10,000 / 49.5 ≈ **$202**. Compare a 100 mm² die on the same wafer: 640 dies at 90.5% yield is about 579 good dies, $17 each. Six times the area, about twelve times the cost: big chips are expensive twice over.",
      },
      {
        kind: "explain",
        title: "Binning and chiplets",
        body: P(
          "Two industry answers to the big-die problem:",
          "- **Binning and redundancy.** A defect often hits one core, one cache block or a spare memory row. Chips are designed with spares and fuses, and dies with a dead core are sold as a cheaper model with that core switched off. Dies are also sorted by top speed (*Packaging and test*).\n- **Chiplets.** Split one big design into several smaller dies and join them in one package. Each small die has a much better yield, and dies can even come from different processes (an expensive one for the cores, a cheaper one for input/output).",
          "Split a 600 mm² design and compare the silicon cost per product.",
        ),
        widget: { type: "semi-chiplet", props: { area: 600, d0: 0.2 } },
      },
      {
        kind: "question",
        title: "Make it cheaper",
        body: "At **D0 = 0.1**, split the 600 mm² design so the **silicon per product** costs **$130 or less**.",
        widget: { type: "semi-chiplet", props: { area: 600, d0: 0.1 } },
        question: {
          type: "widget",
          goal: { d0: 0.1, maxPerProduct: 130 },
          prompt: "Keep D0 at 0.10 and choose how many chiplets to use so the silicon per product is $130 or less.",
          hint: "One big die costs about $202 of silicon. Try two chiplets, then more.",
        },
        explanation: "**Four chiplets** of 165 mm² (with 10% extra area for the links) yield about 85% and bring silicon cost to about **$125**, against $202 for one die; eight get to about $111. The gains shrink with each split while packaging, testing and the links between chiplets cost more, so real products settle on a handful of chiplets, connected through standards such as UCIe (as of the mid-2020s).",
      },
      {
        kind: "question",
        title: "When Poisson is wrong",
        body: "Real defects are not perfectly random: they **cluster** (a scratch, a bad spot on one wafer, the wafer edge). For a large die, how does that change the real yield compared with the Poisson prediction?",
        question: {
          type: "choice",
          options: [
            "Much worse: each cluster kills extra dies",
            "No different: only the defect count matters",
            "Different only for small dies, not for large",
            "Somewhat better: clusters pile onto few dies",
          ],
          answer: 3,
          hint: "If ten defects land on the same die, how many dies did they kill?",
          feedback: {
            0: "Clustering concentrates the damage, so more dies escape completely than the random model predicts.",
            1: "It matters: ten defects on one die kill one die, ten scattered ones can kill ten.",
            2: "The effect is biggest for large dies, which the Poisson model penalises most.",
          },
        },
        explanation: "Clustering wastes defects on dies that are already dead, so Poisson is **pessimistic for big dies**. Yield engineers use models with a clustering factor, such as Murphy's model or the negative binomial, and fit D0 from wafer maps produced by inline inspection and electrical test. Actual D0 figures are closely guarded; published numbers for mature processes are often quoted around 0.1 per cm² or less, and a new process starts higher and improves as it matures (the \"yield ramp\").",
      },
      {
        kind: "recap",
        points: [
          "**Poisson yield**: Y = e^(−A·D0). Yield falls exponentially with die area.",
          "**Dies per wafer** ≈ π(d/2)²/A − πd/√(2A): fewer big dies, and more edge waste.",
          "**Cost per good die** = wafer cost / (DPW × Y). Big dies lose twice: fewer per wafer and lower yield.",
          "Industry answers: spares and **binning**, and **chiplets**. Real defects cluster, so engineers use models like negative binomial; D0 is a closely guarded number.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 10. Packaging and test ───────────────────────────────
  {
    id: "fnd-semi-10-package-test",
    title: "Packaging and test",
    summary: "Wafer sort, dicing, wire bond and flip chip, 2.5D interposers, 3D stacks, HBM and hybrid bonding, chiplet links and co-packaged optics, then final test and burn-in: how a die becomes a part you can ship.",
    minutes: 12,
    xp: 90,
    level: "Professional",
    steps: [
      {
        kind: "explain",
        title: "From wafer to part",
        body: P(
          "A finished wafer is a grid of dies that nobody can use yet. The last stretch, often called **back end** or **OSAT** work (outsourced assembly and test), turns them into parts:",
          txt(`
wafer sort     probe needles touch each die's pads; failures are marked
thin, dice     grind the wafer thinner, then saw or laser-cut it into dies
package        attach each die to a package and connect its pads
final test     test the packaged part again, at speed and temperature
burn-in        (some products) stress parts hot for hours to weed out weak ones
bin, ship      sort by speed and power, mark, pack
`),
          "Start with the package. Its jobs: connect the die's tiny pads to a circuit board, protect the die, and carry its heat away. Compare four styles.",
        ),
        widget: { type: "semi-pack", props: { style: "flip", side: 5 } },
      },
      {
        kind: "question",
        title: "Ten thousand connections",
        body: "A **10 mm** die needs at least **10,000** connections (a processor talking to its memory over very wide buses). Find a packaging style that can provide them.",
        widget: { type: "semi-pack", props: { style: "wire", side: 10 } },
        question: {
          type: "widget",
          goal: { side: 10, minConnections: 10000 },
          prompt: "Keep the die at 10 mm and choose a packaging style that offers 10,000 connections or more.",
          hint: "Wire bonds only use the edge. Area arrays scale with (edge ÷ pitch)², so the pitch is what matters.",
        },
        explanation: "Wire bonding gives about 666 pads round a 10 mm edge and flip-chip bumps at 150 µm about 4,400. **Microbumps** at about 45 µm on a 2.5D interposer give about 49,000, and **hybrid bonding** under 10 µm over a million. Connections grow as 1/pitch²: at a 40 µm pitch, 1,000 / 40 = 25 bumps per millimetre and 25² = 625 per mm². Shrinking the pitch is how packaging keeps up with chips.",
      },
      {
        kind: "question",
        title: "Why HBM sits on an interposer",
        body: "AI accelerators place several **HBM** (high-bandwidth memory) stacks next to the processor on a silicon interposer, instead of using memory chips spread across the circuit board. What is the main reason?",
        question: {
          type: "choice",
          options: [
            "It is the cheapest way to add a lot of memory",
            "HBM dies run at a far higher clock than DDR",
            "Memory mounted on the board cannot hold as much data",
            "Each stack needs a very wide, short interface",
          ],
          answer: 3,
          hint: "Think about how many wires you can route through a circuit board versus a slice of silicon, and what GPUs for AI are starved of.",
          feedback: {
            0: "HBM on an interposer is among the most expensive memory set-ups there is.",
            1: "The reverse: HBM runs each wire slower than board memory and wins by having far more wires.",
            2: "Capacity is not the issue: ordinary memory modules hold more per dollar. Bandwidth is.",
          },
        },
        explanation: "HBM trades capacity per dollar for **bandwidth**: a 1,024-bit bus per stack (HBM3), several stacks, terabytes per second in total. Such wide buses only fit on silicon wiring a few millimetres long. That is how the memory bandwidth in *GPUs for AI* is delivered; each stack is DRAM dies like those in *Inside a memory chip*, stacked with through-silicon vias.",
      },
      {
        kind: "explain",
        title: "3D: stacking dies",
        body: P(
          "**3D stacking** puts dies on top of each other. The dies are thinned to tens of micrometres and joined by **through-silicon vias** (TSVs): vertical copper plugs straight through the silicon. HBM stacks memory dies this way (8 to 12 high is typical as of 2024). Some processors now stack extra cache on top of the cores.",
          "The newest joining method is **hybrid bonding**: two polished die (or wafer) surfaces, each with copper pads set in oxide, are pressed together so the oxide bonds first, then annealed so the copper pads fuse, with no solder at all. Pitches under 10 µm give over 10,000 connections per mm², against about 625 for 40 µm microbumps and 44 for 150 µm flip-chip bumps. The trade-offs are real:",
          "- **heat**: the dies in the middle of a stack have nowhere to send it,\n- **yield**: one bad die can ruin the whole stack, so every die is tested first (**known good die**),\n- **cleanliness**: a single particle between two polished surfaces leaves an unbonded void, so hybrid bonding needs front-end cleanroom standards,\n- **cost**: thinning, TSVs and bonding add many steps.",
        ),
      },
      {
        kind: "explain",
        title: "Chiplets, UCIe and light in the package",
        body: P(
          "**Chiplets** (the answer to the big-die problem in *Yield and cost*) need a way to talk to each other almost as fast as wires inside one die. Early products used each company's own die-to-die links; **UCIe** (Universal Chiplet Interconnect Express, a consortium standard since 2022) defines a common one, so in principle chiplets from different companies and foundries can share a package. As of 2025 most chiplet products still pair dies from one vendor.",
          "A UCIe link is built from **modules**: in the advanced-package version (silicon bridges or interposers) each module has 64 data lanes in each direction, at up to 32 Gb/s per lane in the first versions of the standard. Wider links put several modules side by side along the die edge (the **shoreline**), so edge length becomes a design budget.",
          "Between packages, data still leaves as electrical signals to optical modules plugged into the front of a switch or server, tens of centimetres away, and driving those traces costs a lot of power. **Co-packaged optics** (CPO) moves the optical engines into the same package as the switch chip, so the electrical path shrinks to millimetres and fibre leaves the package directly. As of 2025 network-switch makers have announced CPO switches for AI data centres; serviceability (a failed laser can no longer be swapped at the front panel) and yield are the main open questions.",
        ),
      },
      {
        kind: "question",
        title: "How many modules?",
        body: "Two chiplets must exchange **1 TB/s in each direction** (1 TB = 10¹² bytes). One UCIe advanced-package module carries **64 lanes** each way at **32 Gb/s per lane**. How many modules do you need side by side? Work it out.",
        question: { type: "number", answer: 4, tolerance: 0, unit: "modules", hint: "One module: 64 × 32 Gb/s. Turn the 1 TB/s target into gigabits per second (8 bits per byte), divide, and round up: you cannot fit part of a module." },
        explanation: "One module carries 64 × 32 = 2,048 Gb/s = **256 GB/s** each way. 1 TB/s is 8,000 Gb/s; 8,000 / 2,048 ≈ 3.9, so **4 modules**. Each module takes a fraction of a millimetre of die edge, which is why big chiplet designs place the links along a whole side of the die and why bandwidth per millimetre of shoreline is a headline figure for such links.",
      },
      {
        kind: "explain",
        title: "Test: catch failures early",
        body: P(
          "Testing happens twice for good reason. **Wafer sort** uses a **probe card**, a bed of needles that touches every die's pads, and an automatic test machine (ATE) runs a quick test in a second or so. Dead dies are marked and never packaged, so the expensive steps are not wasted on them.",
          "**Final test** checks the packaged part at full speed and at temperature, catches damage from packaging, and sorts parts into **speed and power bins** (*Yield and cost*). **Burn-in** stresses parts hot (often around 125 °C) at raised voltage for hours, so that weak parts, which would fail in their first weeks of use, fail in the factory instead. It is expensive, so it is used most where early failures are unacceptable: cars, servers, medical devices.",
          "Run a toy lot through the flow, with and without sort and burn-in.",
        ),
        widget: { type: "semi-test", props: { sort: true } },
      },
      {
        kind: "question",
        title: "Nothing wasted, nothing returned",
        body: "Set up the flow so that **no package is wasted on a dead die** and **no part fails in a customer's hands**.",
        widget: { type: "semi-test", props: {} },
        question: {
          type: "widget",
          goal: { maxWasted: 0, maxFieldFails: 0 },
          prompt: "Choose the test steps so that wasted packages and field failures are both zero.",
          hint: "One step stops dead dies before packaging; the other makes weak parts fail before they ship.",
        },
        explanation: "**Sort and burn-in**: wafer sort costs $0.20 a die and saves a $4.50 package-and-test on each of the 300 dead ones; burn-in costs $2 a part and catches the 14 weak parts before shipping. In the toy, skipping burn-in is actually slightly cheaper per part, which is exactly why consumer products often limit it and car makers, who need failure rates in parts per million, do not. *Why chips wear out* looks at the failure mechanisms burn-in and qualification tests are aimed at.",
      },
      {
        kind: "explain",
        title: "In practice",
        body: P(
          "Some names you will meet, as examples rather than recommendations:",
          "- **Test equipment and design for test**: automatic test equipment (ATE), probe cards, and on-chip test logic such as **scan chains** and built-in self-test, which the module \"Designing chips: from RTL to tape-out\" covers. The standard IEEE 1149.1 (JTAG) defines a common test access port.\n- **Reliability standards**: JEDEC's JESD22 test methods (temperature cycling, humidity, high-temperature operating life) and, for cars, the AEC-Q100 qualification.\n- **Advanced packaging**: foundry and OSAT platforms such as TSMC's CoWoS (interposers) and SoIC (hybrid bonding), Intel's EMIB bridges and Foveros stacking; UCIe for the links; \"known good die\" testing before assembly.",
          "Honest about cost: packaging and test are a substantial share of a chip's total cost, more so for advanced packages, and advanced packaging capacity has been a bottleneck for AI chips in the mid-2020s. A chip is only as good as the package and tests that get it to a customer.",
        ),
      },
      {
        kind: "recap",
        points: [
          "After the fab: **wafer sort** (probe card), thinning and **dicing**, **packaging**, **final test** with **binning**, optional **burn-in**.",
          "Packages: **wire bond** (edge only), **flip chip** (bumps over the face), **2.5D** interposers (microbumps, HBM beside the processor), **3D** stacks (TSVs, **hybrid bonding** under 10 µm).",
          "**Chiplets** talk over die-to-die links such as **UCIe**, built from modules along the die edge; **co-packaged optics** brings fibre into the package.",
          "Test early to avoid packaging dead dies, and burn in where early failures are unacceptable.",
        ],
      },
    ],
  },
];
