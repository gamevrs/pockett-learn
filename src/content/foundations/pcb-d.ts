import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (tables, diagrams) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 8, 10 and 9 of "Components and PCB design", in that order: EMC, heat, and manufacturing the board (ids keep their numbers; array position sets the order). */
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
          "In the widget the three routing choices are rough, typical sizes: a trace over a solid plane (about **10 mm²**), a return forced round a split (about **400 mm²**), and a two-layer board with a return wire far away (about **2000 mm²**). Rules that follow: keep traces over unbroken planes, never route a fast signal across a gap, and add a **stitching via** next to a layer change so the return current can change layers with the signal. (That works when both reference planes are the same net, GND to GND. If the reference changes from GND to a power plane, use a stitching capacitor between them instead.)",
        ),
      },
      {
        kind: "question",
        title: "Which layout shouts the least?",
        body: "Three boards run the same clock at the same speed and current. Which one radiates the **least**?",
        question: {
          type: "choice",
          options: [
            "A trace running directly over an unbroken ground plane",
            "A long trace whose return path is routed round a slot in the plane",
            "A trace on a two-layer board with the ground wire on the far side of the board",
            "They all radiate the same, because the current is the same",
          ],
          answer: 0,
          hint: "Think loop area. Where does the return current flow in each layout, and how far is it from the trace?",
          feedback: {
            1: "The slot makes the return current detour, which grows the loop. That is a bigger antenna.",
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
          goal: { pass: true, minMarginDb: 6, areaMm2: 10 },
          prompt: "Fix the layout (loop area 10 mm² or less) and make the worst margin 6 dB or more.",
          hint: "The clock and its current are the product's job, so leave them alone. Which setting changes the loop area by a factor of forty?",
        },
        explanation: "Shrinking the loop from 400 mm² to 10 mm² takes **about 32 dB** off every line and gives roughly +29 dB of margin. Slowing the edges to 10 ns alone only reaches about +5.7 dB at the defaults, and 10 ns edges plus the filter scrape past by about 0.1 dB, while the loop fix alone gives about +29 dB. That is why the goal asks for the geometry fix: you cannot slow the clock or cut its current without changing the product. The lesson of the toy: **fix the geometry first**, then use edge rate and filters as helpers.",
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
    # your code here
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
        hints: ["Convert units first: the formula wants metres squared and amps.", "Work out E in V/m from the formula in the step text, then convert it to a decibel ratio against 1 µV/m."],
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
            "Probe the first board on the bench, fix hot spots, then pre-scan",
            "Trust the toy model: it said the board passes",
            "Wrap the board in aluminium foil and call it shielded",
          ],
          answer: 1,
          hint: "Which option costs the least and finds problems earliest, before an expensive formal test?",
          feedback: {
            0: "That gives the real answer, but it is the most expensive way to find a simple problem. Do the cheap checks first.",
            2: "A toy estimate ignores cable common-mode current, so it cannot promise a pass. Only measurement can.",
            3: "A foil wrap with gaps and open cable ports leaks, and it is not a design. Fix the sources first, then shield well.",
          },
        },
        explanation: "The sensible order is cheap to expensive: **near-field probing on the bench** (a probe and a spectrum analyser), fix what lights up, a **pre-scan** at a lab, and only then the **formal test**. Pre-compliance does not replace the formal test; it just makes a surprise failure much less likely.",
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

  // ─────────────────────────────── 10. Heat ───────────────────────────────
  {
    id: "fnd-pcb-10-thermal",
    title: "Heat: the board is the heat sink",
    summary: "From P and θJA to junction temperature, then how copper area and thermal vias under an exposed pad lower θJA, with a via-in-pad solder trap.",
    minutes: 10,
    xp: 70,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Where the heat comes from",
        body: P(
          "Every part wastes some power as heat, and heat is what kills boards. A linear regulator wastes **(VIN − VOUT) × IOUT**; a chip wastes more the faster it runs. The datasheet's **θJA** (junction to ambient, in °C per watt) turns watts into degrees: **TJ = TA + P × θJA**, with TJ the junction temperature and TA the air around the board. You met it in *Reading a datasheet*.",
          "Two cautions. TJ must stay under the part's rated maximum (often 125 °C or 150 °C), and good designs leave margin, because parts age faster when hot. And the θJA in a datasheet was measured on **the maker's own test board**, usually a small, standardised one. Yours will be better or worse, and the next steps show what changes it. **Safety:** a working power part can burn fingers, so let it cool before touching.",
        ),
      },
      {
        kind: "explain",
        title: "The board is the heat sink",
        body: P(
          "A datasheet's θJA holds only for **its own test board**, so here is why yours differs. A power chip cannot shed heat from its plastic body alone (a **toy** figure here: about 150 °C/W, weak). Nearly all of it leaves **down through the chip into your board's copper**, which spreads it out and hands it to the air. So the copper you give it sets the θJA you really get.",
          "Many power chips come with an **exposed pad** (also called a thermal pad): a bare metal square under a QFN or DFN, or the metal tab of the PK3302's SOT-223, which you solder to copper on purpose. Two layout levers then do the work:\n- **Copper area.** A bigger pour around the pad sheds more heat, with diminishing returns. Still air carries away only about **22 W per m² per kelvin** from a copper face (typical, natural convection and radiation).\n- **Thermal vias.** A **thermal via** is a plated hole under or beside the pad that carries heat to copper on the other face or an inner plane. One plain 0.3 mm via through a 1.6 mm board is about **150 °C/W** (typical, 100 to 200), a thin copper tube. So you use a small grid of them side by side (the datasheet's land pattern often shows one), which puts them in parallel.",
          "More vias help only until the copper is the limit: past that, extra holes buy almost nothing. One trap: a via open in the pad can wick solder away from the joint during reflow. Fabs offer tented, plugged or filled vias for this, and the datasheet's land pattern says what the maker expects. *Manufacturing the board* returns to this. **Safety:** a working power chip, and the copper around it, can be hot enough to burn.",
          "The widget is a **toy** with typical values. A chip turns **1.2 W** into heat in a box at **50 °C**, and we want the junction at **105 °C or lower**, so there is margin below the 125 °C rating. Start with the little pad and no vias, and try the controls.",
        ),
        widget: { type: "pcb-thermal", props: { area: 2, vias: 0 } },
      },
      {
        kind: "question",
        title: "TJ from a datasheet θJA",
        body: "A QFN's datasheet gives **θJA = 45 °C/W** on its test board. In your design it wastes **1.2 W** inside a box where the air is **50 °C**. What is the junction temperature TJ, in °C? (Assume your board behaves like the test board.)",
        question: {
          type: "number",
          answer: 104,
          tolerance: 0.5,
          unit: "°C",
          hint: "TJ = TA + P × θJA: multiply the watts by the degrees per watt, then add the air temperature.",
        },
        explanation: "TJ = 50 + 1.2 × 45 = 50 + 54 = **104 °C**, under a 125 °C rating but with only 21 °C of margin, and only if your board really cools like the test board. A smaller copper area would raise θJA and TJ.",
      },
      {
        kind: "question",
        title: "Cool the chip, spend little board",
        body: "The same chip, 1.2 W in a 50 °C box. You can spare at most **6 cm² of copper** for it. Choose the copper area and the number of thermal vias so that **TJ is 105 °C or lower**.",
        widget: { type: "pcb-thermal", props: {} },
        question: {
          type: "widget",
          goal: { maxTj: 105, maxAreaCm2: 6, minVias: 1 },
          prompt: "Junction at 105 °C or lower, using no more than 6 cm² of copper and at least one thermal via.",
          hint: "Copper alone at 6 cm² is not enough. Which second lever carries heat to a second copper face?",
        },
        explanation: "At 6 cm² with no vias the junction reaches about **114 °C**. Four vias join the far-side copper and bring it to about **97 °C**, passing. Nine vias give about 95 °C and sixteen about 94 °C, so the returns fade fast: copper is the limit by then. Ten cm² with no vias would also pass (about 97 °C), but it spends board space you did not have. These are toy values; a real design checks the datasheet's θJA curves for copper area and measures a prototype with a thermocouple or thermal camera.",
      },
      {
        kind: "question",
        title: "What are the via grid and pad for?",
        body: "A QFN's datasheet shows a **3 × 3 grid of 0.3 mm vias** inside its exposed-pad land pattern, with the note \"connect to a copper area\". What is the grid for?",
        question: {
          type: "choice",
          options: [
            "They carry the chip's supply current to the inner power plane",
            "They let flux gas escape during reflow, and nothing else",
            "They tie the pad to ground so the chip is shielded",
            "They move heat from the pad to copper on the other layers",
          ],
          answer: 3,
          hint: "The pad is bare metal under the chip, and its job is to get heat out. Which of these is about heat?",
          feedback: {
            0: "Supply current uses the chip's pins, not the exposed pad. The pad is a heat path.",
            1: "Gas escape is a side effect at best. The grid is there to carry heat.",
            2: "The pad is often grounded, but the vias in a grid of this kind are placed to carry heat, not to shield.",
          },
        },
        explanation: "The vias are **thermal vias**: nine in parallel are about 17 °C/W (150 ÷ 9, typical) instead of 150 °C/W for one, so the heat can reach copper on the other layers and spread there. The same note warns that open vias in the pad can steal solder, so check what your fab and the datasheet recommend (tented, plugged or filled).",
      },
      {
        kind: "question",
        title: "Vias in the pad",
        body: "A layout puts open thermal vias straight through a QFN's exposed pad. What can go wrong when the board goes through reflow?",
        question: {
          type: "choice",
          options: [
            "The vias melt and short the layers together",
            "Flux fills the holes and traps heat inside the board",
            "Solder can wick down the holes and leave a weak joint",
            "The stencil clogs because the pad has holes in it",
          ],
          answer: 2,
          hint: "Molten solder flows toward hot copper. What does an open hole under the pad offer it?",
          feedback: {
            0: "The vias are copper tubes, and copper does not melt at reflow temperatures. The trouble is with the solder.",
            1: "Flux does not seal a hole or trap heat. The problem is where the molten solder goes.",
            3: "A stencil prints paste over the pad's openings; holes in the pad do not clog it. The solder itself is the issue.",
          },
        },
        explanation: "Molten solder wets copper and can **wick down an open via**, leaving too little under the chip: a weak, voided joint with worse heat flow. The usual fixes are tented, plugged or filled vias, or smaller vias, and the datasheet's land pattern and your fab's rules say which. *Manufacturing the board* covers reflow and X-ray inspection of such joints.",
      },
      {
        kind: "recap",
        points: [
          "**TJ = TA + P × θJA.** Keep TJ below the rating with margin, and remember a datasheet's θJA holds only for its own test board.",
          "Heat leaves mostly **down through the exposed pad** into board copper. **Copper area** and a grid of **thermal vias** lower θJA, with diminishing returns once the copper is the limit (toy and typical values here).",
          "Open vias in a pad can **wick solder** during reflow: tent, plug or fill them as the datasheet and fab advise.",
          "Hot parts and the copper around them can burn: measure before you touch.",
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
            "The silkscreen cannot be printed without it",
            "The value alone does not say the package, voltage rating or dielectric",
            "The pick-and-place file needs it to find each footprint",
            "The stencil openings are cut separately for each part number",
          ],
          answer: 1,
          hint: "\"100 nF\" fits hundreds of different capacitors. What else do you need to choose one?",
          feedback: {
            0: "The silkscreen shows reference designators like C1 and R2, not part numbers.",
            2: "That file lists X, Y and rotation per reference designator. The footprint comes from your layout, not from a part number lookup.",
            3: "Stencil openings follow the paste layer of your board, not the part numbers.",
          },
        },
        explanation: "The MPN names one exact part. \"100 nF\" does not fix the **package** (0402 or 0805), **voltage rating**, **dielectric** or tolerance, so the buyer would have to guess. An MPN names one exact part, and a good BOM lists **alternates** too, because parts go out of stock or become **obsolete** (discontinued). A board with no approved alternates can stop a whole production run.",
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
