import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (tables, diagrams) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 8 and 9 of "Components and PCB design": EMC, and manufacturing the board. */
export const pcbLessonsD: ConceptLesson[] = [
  // ─────────────────────────────── 8. EMC ───────────────────────────────
  {
    id: "fnd-pcb-8-emc",
    title: "EMC: boards that don't shout",
    summary: "Why a board radiates radio noise, why loop area and edge rate matter, how filters and shields help, and what pre-compliance testing is.",
    minutes: 11,
    xp: 75,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Every board is a tiny radio",
        body: P(
          "**EMC** (electromagnetic compatibility) means two things: your product does not **emit** too much radio noise, and it is not **upset** by noise from others (that second half is called **immunity**). Rules limit emissions because a noisy gadget can jam a radio, a hearing aid or a neighbour's TV.",
          "Why do boards emit at all? A current that **changes quickly** and flows round a **loop** makes a changing magnetic field, and a changing field spreads out as a radio wave. The loop is an accidental **antenna**. For a small loop the field you would measure grows with three things, and the first is squared:",
          txt(`field  ∝  f² × loop area × current
f = frequency of the current's changes`),
          "Double the loop area and the field doubles, which is **+6 dB** (a decibel is a way to compare sizes on a log scale; for fields, dB = 20·log₁₀(ratio), so ×2 is about +6 dB). Double the frequency and it grows four times, +12 dB.",
          "The widget below is a **toy estimate** of one clock signal on a board. Each vertical line is one **harmonic** of the clock (more on those soon), measured 3 m away. The dashed line is the FCC Part 15 Class B limit (the US rule for home equipment; the European CISPR 32 class B is a similar reference). Red lines are over the limit. Click the three loop options and the rise times and watch the lines move.",
        ),
        widget: { type: "pcb-emc", props: {}, live: true },
      },
      {
        kind: "question",
        title: "Reading dBµV/m",
        body: "Emission limits are written in **dBµV/m**: decibels relative to 1 microvolt per metre of field strength. The FCC Class B limit for 30 to 88 MHz at 3 m is **100 µV/m**. For fields, dB = 20·log₁₀(value ÷ 1 µV/m).\n\nWhat is 100 µV/m in dBµV/m?",
        question: {
          type: "number",
          answer: 40,
          tolerance: 0.5,
          unit: "dBµV/m",
          hint: "Ratio to 1 µV/m is 100. log₁₀(100) = 2, then multiply by 20.",
        },
        explanation: "20 × log₁₀(100) = 20 × 2 = **40 dBµV/m**. That is the first line of the limit chart you saw: 40 dBµV/m from 30 to 88 MHz, then 43.5 (150 µV/m) to 216 MHz, 46 (200 µV/m) to 960 MHz and 54 (500 µV/m) above.",
      },
      {
        kind: "explain",
        title: "Loop area and the return path",
        body: P(
          "The loop is made of the **forward path** (the trace carrying the signal) and the **return path** (where that current flows back to its source). In *Power and ground* you saw that at high frequency the return current hugs the plane **right under the trace**. That keeps the loop thin and the area tiny.",
          "Now cut that path. If the trace crosses a **split in the plane**, or the plane has a slot, the return current must detour round it. The loop grows, often by a factor of tens or hundreds. The same signal now radiates much more, and nothing in the schematic changed.",
          "In the widget the three routing choices are rough, typical sizes: a trace over a solid plane (about **10 mm²**), a return forced round a split (about **400 mm²**), and a two-layer board with a return wire far away (about **2000 mm²**). Rules that follow: keep traces over unbroken planes, never route a fast signal across a gap, and add a **stitching via** next to a layer change so the return current can change layers with the signal.",
        ),
      },
      {
        kind: "question",
        title: "Which layout shouts the least?",
        body: "Three boards run the same clock at the same speed and current. Which one radiates the **least**?",
        question: {
          type: "choice",
          options: [
            "A long trace whose return path is routed round a slot in the plane",
            "A trace running directly over an unbroken ground plane",
            "A trace on a two-layer board with the ground wire on the far side of the board",
            "They all radiate the same, because the current is the same",
          ],
          answer: 1,
          hint: "Think loop area. Where does the return current flow in each layout, and how far is it from the trace?",
          feedback: {
            0: "The slot makes the return current detour, which grows the loop. That is a bigger antenna.",
            2: "A far-away return makes a large loop too. This is the worst of the three for radiation.",
            3: "The current is the same, but the field also scales with loop area. The areas differ by a factor of tens.",
          },
        },
        explanation: "Over an unbroken plane the return current runs **directly under** the trace, so the loop is thin. The field scales with loop area, so the small loop wins by a wide margin. Small loops also help **immunity**: a tiny loop picks up little outside noise.",
      },
      {
        kind: "explain",
        title: "A clock is a pile of harmonics",
        body: P(
          "Why is the chart full of lines up to 1 GHz when the clock is only 30 MHz? A square-ish wave is not one frequency. It is the sum of the clock frequency **f** plus its **odd harmonics**: 3f, 5f, 7f and so on (a 50% duty clock has no even ones). Harmonic *n* has an amplitude of about 2·I/(nπ) for a clock current I, so they get smaller as *n* grows.",
          "What cuts them down faster is the **edge**. In *Signal integrity* you saw that rise time, not clock frequency, decides how fast the signal really changes. A slower edge rounds the corners and removes the high harmonics. The toy uses the standard trapezoid envelope, |sin(x)/x| with x = nπ·f·tr, multiplied onto each harmonic.",
          "Then each line goes through Ott's small-loop estimate, **E ≈ 263×10⁻¹⁶ · f² · A · I ÷ r** (E in V/m, f in Hz, A in m², I in A, r = 3 m; differential mode, with the ground-plane reflection included). It is an **estimate**: good for comparing layouts, not for promising a pass.",
          "Try this: with the default clock, switch the loop to **Over a plane**, then try the edges at **10 ns**, and turn the toy filter on and off. Watch which lines drop most.",
        ),
        widget: { type: "pcb-emc", props: {}, live: true },
      },
      {
        kind: "question",
        title: "Get the board to pass",
        body: "The board starts with its return routed round a split (400 mm²) and fails. Change the settings so the board **passes with at least 6 dB of margin** (a lab wants some spare room, since boards and tests vary).",
        widget: { type: "pcb-emc", props: {} },
        question: {
          type: "widget",
          goal: { pass: true, minMarginDb: 6 },
          prompt: "Make the worst margin 6 dB or more.",
          hint: "The cheapest fix costs nothing but careful routing. Which setting changes the loop area by a factor of forty?",
        },
        explanation: "Shrinking the loop from 400 mm² to 10 mm² takes **about 32 dB** off every line and gives roughly +29 dB of margin. Slowing the edges to 10 ns alone only reaches about +5.7 dB at the defaults, so it falls just short; the source filter adds only a little. The lesson of the toy: **fix the geometry first**, then use edge rate and filters as helpers.",
      },
      {
        kind: "explain",
        title: "Filters, shields and cables",
        body: P(
          "When geometry is not enough, you add parts. These are the usual tools, cheapest first:",
          "- **Decoupling** (*Power and ground*) keeps fast current in a tiny local loop instead of out on the supply wires.\n- **Series resistor or ferrite bead at a fast source.** A small resistor (for example 22 to 33 Ω) slows an edge; a **ferrite bead** is a part that behaves like a resistor at high frequency and almost like a wire at DC, so it soaks up noise without dropping the supply. The widget's toy filter is a first-order low-pass with a corner at 100 MHz, deliberately modest.\n- **RC or LC filters at connectors**, so noise cannot ride out on cables.\n- **Shielding**: a metal **can** over a noisy area, or a grounded metal enclosure. A shield only works if its seams and cable entry points are small and well grounded. A hole or a wire poking through is a leak.",
          "The big caution is **cables**. Real products often fail because of **common-mode current**: the same noise current flowing in the same direction on both wires of a cable, using the cable as an antenna a metre long (long enough to be an efficient one at 30 to 300 MHz). The toy does not model that. Its numbers are **differential-mode only**, so a toy pass can still be a lab fail.",
        ),
      },
      {
        kind: "code",
        title: "A field calculator",
        body: "Write `field_dbuv(f_hz, area_mm2, i_ma, r_m=3.0)` that returns the Ott estimate in **dBµV/m**.\n\nSteps: convert area to m² (1 mm² = 1e-6 m²) and current to A; E = 263e-16 · f² · A · I / r in V/m; then dBµV/m = 20·log₁₀(E / 1e-6).",
        language: "python",
        starter: `import math

def field_dbuv(f_hz, area_mm2, i_ma, r_m=3.0):
    # Ott: E = 263e-16 * f**2 * A * I / r  (V/m), then 20*log10(E / 1e-6)
    return 0.0
`,
        solution: `import math

def field_dbuv(f_hz, area_mm2, i_ma, r_m=3.0):
    area = area_mm2 * 1e-6
    amps = i_ma * 1e-3
    e = 263e-16 * f_hz ** 2 * area * amps / r_m
    return 20 * math.log10(e / 1e-6)
`,
        tests: [
          { id: "ref", description: "100 MHz, 100 mm², 10 mA at 3 m is about 38.9 dBµV/m", assertionCode: `v = field_dbuv(100e6, 100, 10)\nassert abs(v - 38.86) < 0.1, f"got {v}, expected about 38.86"` },
          { id: "area", description: "Doubling the loop area adds about 6 dB", assertionCode: `d = field_dbuv(100e6, 200, 10) - field_dbuv(100e6, 100, 10)\nassert abs(d - 6.02) < 0.05, f"got {d}, expected 6.02"` },
          { id: "freq", description: "Doubling the frequency adds about 12 dB", assertionCode: `d = field_dbuv(200e6, 100, 10) - field_dbuv(100e6, 100, 10)\nassert abs(d - 12.04) < 0.05, f"got {d}, expected 12.04"` },
          { id: "other", description: "50 MHz, 10 mm², 20 mA is about 12.8 dBµV/m", assertionCode: `v = field_dbuv(50e6, 10, 20)\nassert abs(v - 12.84) < 0.1, f"got {v}, expected about 12.84"` },
        ],
        hints: ["Convert units first: area_mm2 * 1e-6 gives m², i_ma * 1e-3 gives A.", "E = 263e-16 * f_hz ** 2 * area * amps / r_m.", "Return 20 * math.log10(e / 1e-6)."],
      },
      {
        kind: "question",
        title: "Pre-compliance: look before the lab",
        body: P(
          "A formal EMC test happens in a special lab, with a measurement antenna 3 m or 10 m from your product, and it costs real money (lab time is often priced in the hundreds to thousands of dollars per day; it varies by lab and country). A failure sends you back to redesign and retest.",
          "So teams do **pre-compliance** testing first. On the bench you wave a **near-field probe** (a little loop or stub on a handle, from cheap DIY ones to professional sets) over the board and watch a **spectrum analyser** (a meter that shows signal strength against frequency). Hot spots show you which clock, cable or gap is noisy. Entry-level analysers run from hundreds to a few thousand dollars, and the pricey ones far more. Then a **pre-scan** at a lab, then the formal test. The near-field probe does not give a pass or fail number, only *where* and *relatively how much*.",
          "The legal side (FCC Part 15 in the US, CE marking with EN or CISPR standards in Europe) is covered in *Building real products*.",
        ),
        question: {
          type: "choice",
          options: [
            "Book the formal test straight away so you learn the real answer",
            "Skip testing; the toy model said it passes",
            "Scan the first board with a near-field probe and a spectrum analyser on the bench, fix the hot spots, then book a pre-scan",
            "Wrap the board in aluminium foil and call it shielded",
          ],
          answer: 2,
          hint: "Which option costs the least and finds problems earliest, before an expensive formal test?",
          feedback: {
            0: "That gives the real answer, but it is the most expensive way to find a simple problem. Do the cheap checks first.",
            1: "A toy estimate ignores cable common-mode current, so it cannot promise a pass. Only measurement can.",
            3: "A foil wrap with gaps and open cable ports leaks, and it is not a design. Fix the sources first, then shield well.",
          },
        },
        explanation: "The sensible order is cheap to expensive: **near-field probing on the bench**, fix what lights up, a **pre-scan** at a lab, and only then the **formal test**. Pre-compliance does not replace the formal test; it just makes a surprise failure much less likely.",
      },
      {
        kind: "recap",
        points: [
          "**EMC** = not emitting too much (**emissions**) and not being upset by others (**immunity**). Limits like FCC Part 15 Class B are in dBµV/m at a set distance.",
          "A fast current in a **loop** radiates. The small-loop field grows with **f² × loop area × current**: double the area, +6 dB; double the frequency, +12 dB.",
          "Keep the **return path** under the trace, never route a fast signal across a plane split, and use **slower edges** (fewer harmonics) where speed is not needed.",
          "Filters (resistor, ferrite, RC at connectors) and shields help, but **cables** carrying common-mode current are often the real antenna. The toy ignores them; only measurement tells the truth.",
          "Test cheap-to-expensive: **near-field probe and analyser**, a lab **pre-scan**, then the **formal test**.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 9. Manufacturing ───────────────────────────────
  {
    id: "fnd-pcb-9-manufacturing",
    title: "Manufacturing the board",
    summary: "Design rule checks, designing for the factory, the files a fab and assembler need, panels, reflow, inspection and test, and how to order a first run.",
    minutes: 12,
    xp: 90,
    level: "Professional",
    steps: [
      {
        kind: "question",
        title: "Check the rules before the fab does",
        body: P(
          "A **DRC** (design rule check) is a program that compares your layout against a list of rules and flags every violation. The rules come from the **fab**, the factory that makes the bare board, and describe what its machines can reliably make. Typical figures for a low-cost prototype fab (they vary a lot; your fab publishes its own):",
          txt(`minimum trace width and gap   about 0.15 mm (6 mil)
minimum drill diameter        about 0.3 mm
minimum annular ring          about 0.15 mm
   (annular ring = the copper left around a drilled hole)`),
          "Tighter rules cost more or are not offered at all. Always load the fab's rules into your design tool and run the DRC before sending anything. KiCad (free) and Altium (commercial) both have one, and many fabs run their own check too.",
        ),
        question: {
          type: "choice",
          options: [
            "A trace 0.20 mm wide with 0.20 mm gaps",
            "A mounting hole 3.2 mm in diameter",
            "Two traces whose gap is 0.10 mm",
            "A via with a 0.4 mm drill and a 0.9 mm pad (ring 0.25 mm)",
          ],
          answer: 2,
          hint: "Compare each number with the typical limit: gap and trace 0.15 mm, drill 0.3 mm, ring 0.15 mm.",
          feedback: {
            0: "Both numbers are larger than the 0.15 mm limit, so this is fine.",
            1: "Large holes are no problem; the drill limit is a minimum, and 3.2 mm is far above it.",
            3: "The drill is above 0.3 mm and the ring (0.25 mm) is above 0.15 mm, so this passes.",
          },
        },
        explanation: "A 0.10 mm gap is below the typical 0.15 mm minimum, so a DRC would flag it. Small gaps risk **shorts** where copper is not etched cleanly. Everything else here is above its typical minimum.",
      },
      {
        kind: "explain",
        title: "Design for the factory",
        body: P(
          "Passing DRC means the board *can* be made. **DFM** (design for manufacture) and **DFA** (design for assembly) mean it is made *well*, cheaply and with few defects. Habits that help:",
          "- **Fiducials**: small bare-copper dots (often 1 mm) that cameras use to find the board's exact position. Put at least two or three on the board or panel, and add local ones near fine-pitch parts.\n- **Part spacing**: leave room between parts for the placement nozzle, solder fillets and inspection cameras. Packed-in parts shadow each other during reflow.\n- **Orientation**: line similar parts up in the same direction, and put pin 1 marks where a person can see them. Fewer orientations means fewer mistakes and easier inspection.\n- **Thermal reliefs**: when a pad connects to a big copper pour, a few thin spokes (a **thermal relief**) stop the pour from sucking away heat, which would leave a cold joint. Pads on the same net as a plane need them.\n- **Avoid tiny parts unless you need them.** 0402 and smaller parts are harder to place, inspect and repair than 0603 or 0805.",
          "Many fabs and assemblers publish a DFM guide or run an online check. Read it before routing, not after.",
        ),
      },
      {
        kind: "explain",
        title: "Files the factory needs",
        body: P(
          "You do not send your design project. You send **exports**. The bare-board fab needs the copper layers, mask, silkscreen, drill and outline. The assembler needs the BOM and the pick-and-place data, and the stencil. Common file types:",
          txt(`Gerber        one file per layer: copper, mask, silkscreen, paste
Excellon      the drill file (hole positions and sizes)
Edge.Cuts     the board outline
IPC-2581 /    one single-file package with everything,
ODB++         accepted by some fabs
BOM           bill of materials, with manufacturer part numbers
Pick-and-     X, Y, rotation and side of every part
place file    (also called a centroid file)
Fab drawing   stackup, finish, impedance and other notes`),
          "Next, sort a deck of files into three buckets. A few have nuance: the solder-paste layer is used to make a **stencil** for printing paste, so it counts as **assembly**, even though many fabs sell the stencil with the board.",
        ),
      },
      {
        kind: "question",
        title: "Sort the files",
        body: "Put every file in the right bucket, then press **Check my sort**. Fix the red cards until all are right.",
        widget: { type: "pcb-fabfiles", props: {} },
        question: {
          type: "widget",
          goal: { allCorrect: true },
          prompt: "Sort all 15 files correctly, then check.",
          hint: "Ask who uses the file: the board maker, the person who solders parts on, or nobody who is building the board.",
        },
        explanation: "The **fab** needs everything about the bare board (copper, mask, silkscreen, drill, outline, fab notes, or a single IPC-2581 or ODB++ package). **Assembly** needs the BOM, pick-and-place, assembly drawing and the paste layer for the stencil. The **native project**, the **3D render** and the **schematic PDF** are for you and your reviewers.",
      },
      {
        kind: "explain",
        title: "Panels and reflow",
        body: P(
          "Machines handle big sheets better than tiny boards, so the fab and assembler often work with a **panel**: many copies of your board in one frame. The frame has **rails** (strips along the edges for the conveyor to grip; typically about 5 mm wide) and **fiducials** for the placement camera. Boards are held in by **V-score** (a groove cut from both sides, snap along it; straight cuts only) or **tabs** with drilled holes, called **mouse bites** (a router cuts the outline; any shape, more wasted space).",
          "Then comes **reflow soldering**. Solder paste (tiny solder balls in flux) is printed through the stencil, parts are placed, and the whole board goes through an oven that follows a **temperature profile**. For lead-free SAC305 solder (liquidus about 217 to 220 °C, where it turns fully liquid) the typical stages are a ramp of about 1 to 3 °C/s up to 150 °C, a soak (150 to 200 °C for about 60 to 120 s) so the board heats evenly and the flux cleans the metal, a peak around **235 to 250 °C**, **60 to 90 s above liquidus**, and a gentle cooldown. Components are rated by a standard, J-STD-020, with a classified peak of up to about 260 °C. Leaded Sn63/Pb37 solder melts at 183 °C, which is why its profile is cooler.",
          "Parts with leads through holes (**THT**) are usually soldered by a **wave** of molten solder or by **selective** soldering with a small nozzle, since reflow does not suit them. Try the **Reflow profile** and the **Panel of boards** views below.",
        ),
        widget: { type: "pcb-reflow", props: {}, live: true },
      },
      {
        kind: "question",
        title: "Set a good profile",
        body: "The oven starts on a poor profile (low peak, short time above liquidus, short soak). Adjust the three sliders until the profile is **in the typical window**.",
        widget: { type: "pcb-reflow", props: {} },
        question: {
          type: "widget",
          goal: { ok: true },
          prompt: "Get the three verdicts to say Typical.",
          hint: "Aim for a peak of 235 to 250 °C, about 60 to 90 s above liquidus, and a soak of about 60 to 120 s.",
        },
        explanation: "All three numbers have to be in range together: a **peak** of 235 to 250 °C, **time above liquidus** of about 60 to 90 s, and a **soak** of 60 to 120 s. Too cool or too short and the joint does not wet properly (cold or dull joints). Too hot or too long and parts are stressed and the brittle **intermetallic layer** between solder and copper grows. These are tendencies from paste datasheets; your paste's own datasheet and a measured board win. And a safety reminder: reflow ovens and hot plates run well over 240 °C, so mind burns and ventilate flux fumes.",
      },
      {
        kind: "explain",
        title: "Inspection, test and bring-up",
        body: P(
          "After reflow you check what you built, at three levels:",
          "- **AOI** (automated optical inspection): cameras compare each joint and part with a reference. It sees what light can reach: missing, shifted or flipped parts, bridges, and visible fillets. It checks against a standard such as **IPC-A-610**, which describes what counts as an acceptable solder joint.\n- **X-ray**: needed for joints you cannot see, such as under a **BGA** (a chip whose connections are balls on its underside) or a QFN's thermal pad. It shows voids and bridges under the part.\n- **Electrical test**: **ICT** (in-circuit test) presses a bed of spring pins on **test points** (bare pads you leave for this), and a **flying probe** tester moves probes by robot, with no custom fixture, which suits small runs. Boards that run firmware often have a programming header or test pads too.",
          "So add **test points** for power rails, key signals and programming, and keep them on one side if you can. How these steps fit into a real bring-up and production plan is in *Building real products*.",
        ),
      },
      {
        kind: "question",
        title: "Why the part number matters",
        body: "A BOM row can say \"100 nF capacitor\", or it can include the **manufacturer part number (MPN)**, such as a real part's exact catalogue code. Why do assemblers want the MPN?",
        question: {
          type: "choice",
          options: [
            "It makes the file bigger, which fabs charge for",
            "The silkscreen cannot be printed without it",
            "Part numbers set the pick-and-place coordinates",
            "A value alone does not say the package, voltage rating or dielectric; the MPN pins down the exact part and lets you list approved alternates when it is out of stock or discontinued",
          ],
          answer: 3,
          hint: "\"100 nF\" fits hundreds of different capacitors. What else do you need to choose one?",
          feedback: {
            0: "File size is irrelevant. The reason is about getting the right part bought.",
            1: "The silkscreen shows reference designators like C1 and R2, not part numbers.",
            2: "Coordinates come from the placement file and your layout, not from part numbers.",
          },
        },
        explanation: "\"100 nF\" does not fix the **package** (0402 or 0805), **voltage rating**, **dielectric** or tolerance, so the buyer would have to guess. An MPN names one exact part, and a good BOM lists **alternates** too, because parts go out of stock or become **obsolete** (discontinued). A board with no approved alternates can stop a whole production run.",
      },
      {
        kind: "question",
        title: "The whole flow",
        body: "Put the steps in the order they happen.",
        question: {
          type: "order",
          items: [
            "Run the DRC and fix violations",
            "Export Gerbers and the drill file",
            "The fab makes the bare boards",
            "Print solder paste through the stencil",
            "Place the parts with the pick-and-place machine",
            "Reflow in the oven",
            "AOI or X-ray inspection",
            "Electrical test",
          ],
          hint: "Think of the board's life: design checks, then the bare board, then paste, parts, heat, then check and test.",
        },
        explanation: "**DRC**, then **export**, then the **fab** makes bare boards. At assembly the **paste** goes on first, then the **parts**, then **reflow** fixes them; **inspection** and **test** come last. A final tip when ordering a first run: cheap prototype boards (a handful, in days to a couple of weeks) are affordable, but assembly, special stackups, controlled impedance, tight rules and fast turnaround all add cost, and prices and lead times change often.",
      },
      {
        kind: "recap",
        points: [
          "Run **DRC** against the *fab's* rules (typical cheap fab: about 0.15 mm trace and gap, 0.3 mm drill, 0.15 mm annular ring) and follow **DFM/DFA** habits: fiducials, spacing, thermal reliefs, consistent orientation.",
          "Send **exports**, not your project: Gerbers + drill + outline (or IPC-2581 or ODB++) and a fab drawing to the fab; BOM with part numbers, pick-and-place, assembly drawing and the stencil to assembly.",
          "**Panels** have rails and fiducials, and boards separate by V-score or tabs. **Reflow** for lead-free: peak about 235 to 250 °C, about 60 to 90 s above 217 °C, a soak of about 60 to 120 s.",
          "Check with **AOI** (visible joints, IPC-A-610 as a reference), **X-ray** (hidden joints under BGAs) and **electrical test** with test points (ICT or flying probe).",
          "Prototype runs are cheap, but assembly, special stackups and impedance control cost extra. KiCad (free) and Altium (commercial) are two example tools; the next step is turning boards into products in *Building real products*.",
        ],
      },
    ],
  },
];
