import type { ConceptLesson } from "../../learn/types.ts";

/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 9 and 10 of "Electronics from zero: circuits": the bench skills. Breadboards and soldering, then the oscilloscope. */
export const circuitsLessonsC: ConceptLesson[] = [
  // ─────────────────────────────── 9. On the bench ───────────────────────────────
  {
    id: "fnd-circ-9-on-the-bench",
    title: "On the bench",
    summary: "The tools that turn a schematic into a working circuit: how a breadboard is wired inside, how to find a fault on one, and how to solder well and safely.",
    level: "Intermediate",
    minutes: 9,
    xp: 50,
    steps: [
      {
        kind: "explain",
        title: "The breadboard: strips under the holes",
        body: P(
          "A **solderless breadboard** is a plastic board with a grid of holes. Under the holes are springy metal clips, so you can push in a component leg or a wire and pull it out again. It is the fastest way to turn a schematic into a circuit you can poke at.",
          "What matters is which holes are joined underneath:\n\n- In the middle area, each numbered column has two **strips** of five holes: **a to e** are joined together, and **f to j** are joined together. The two strips are **not** joined to each other.\n- The **gap** down the middle is wide enough for a chip with two rows of pins: each pin lands on its own strip.\n- The long **rails** along the edges (usually marked red for + and blue for −) run the whole length of the board. On some larger boards the rails are **split in the middle**, so measure before you trust them.",
          "A strip is just a wire. Two legs of one part in the same strip are joined by that wire, and the part is **shorted out**. The usual beginner mistakes:\n\n- both legs of a part in one strip;\n- a rail that was never connected to the battery, or to ground;\n- two circuits that do not share a ground;\n- a leg that is bent and only half-touching.",
          "Breadboards are for low-power, slow circuits (typical contacts are fine for a few hundred milliamps, and their loose contacts and stray capacitance make fast signals messy). Never put mains on one.",
        ),
      },
      {
        kind: "question",
        title: "Why is the LED dark?",
        body: "A beginner plugs an LED's two legs into holes **12b** and **12d** of a breadboard, with a good battery and a resistor in the loop. The LED stays dark. What is wrong?",
        question: {
          type: "choice",
          options: ["An LED needs to be soldered before it will light", "Holes in one strip are linked, so both legs are joined", "Breadboards only conduct along the long red and blue rails", "The LED's legs must bridge the gap in the middle"],
          answer: 1,
          hint: "Holes 12b and 12d are both in column 12, on the same side of the gap. What joins the holes of a strip?",
          feedback: {
            0: "Breadboards exist so that nothing has to be soldered. Parts push straight in.",
            2: "The rails are one long strip each, but the numbered columns are joined too, in groups of five.",
            3: "The gap is for chips with two rows of pins. A part's legs belong in different strips, not across the gap.",
          },
        },
        explanation: "Holes 12a to 12e are one strip, so the LED's legs are joined by a wire and the current goes round the LED instead of through it. Move one leg to another column (say 13) and put the resistor between the two columns, so the current has to go through the LED.",
      },
      {
        kind: "question",
        title: "Half the board is dead",
        body: "You wire the **+ rail** to the battery at the left end of a large breadboard. LEDs near the left light up, but every LED placed on the right half stays dark, with all their wiring correct. What is the most likely cause?",
        question: {
          type: "choice",
          options: ["The rail is split in the middle on this board", "The battery is too weak for more than a few LEDs", "Breadboard rails only reach about ten holes", "The right half needs its own ground symbol"],
          answer: 0,
          hint: "A strip is just a wire. Does the long rail necessarily run the whole length of this board?",
          feedback: {
            1: "A weak battery would dim every LED, not switch off a whole half of the board.",
            2: "Rails run the length of the board, or half of it. They are not limited to ten holes.",
            3: "Ground symbols exist on schematics only. On the board, ground is a wire you must connect.",
          },
        },
        explanation: "Many large breadboards have rails that are **split in the middle**. Connect a jumper wire between the two halves of the rail, or feed each half separately. A meter across a rail tells you in seconds whether it is live.",
      },
      {
        kind: "explain",
        title: "Soldering: heat the joint, not the solder",
        body: P(
          "A breadboard is temporary. To make a circuit last you **solder** it: melt a metal alloy (solder) so it flows around a leg and a copper pad, then cools into a joint that is both a strong mechanical bond and a good electrical connection. A good through-hole joint takes about two to four seconds.",
          "**The method for a through-hole (THT) part:**\n\n- Clean the tip and coat it with a little solder (**tin** it) so heat flows.\n- Touch the iron to the pad and the leg together. Both must get hot.\n- Feed solder to the **joint**, not onto the iron. It should melt and flow round the leg by itself.\n- Take the solder away, then the iron, and keep the part still until it sets.",
          "A good joint is **shiny and concave**, like a tiny volcano, with the solder wetting both the pad and the leg. A bad one (a **cold joint**) is dull, grainy or a ball sitting on the pad. It can look fine and still fail months later. Typical iron temperatures are around 320 to 350 °C for leaded solder and a little more for lead-free (check the solder's datasheet).",
          "**Surface-mount (SMD)** parts are the same idea at small scale. Add a little **flux** (a cleaning agent that helps solder flow), tin one pad, hold the part with tweezers and tack one corner, then solder the rest. **Rework** means taking a part off or fixing a bad joint: add flux, melt the old solder, and lift the part, or soak up the solder with **desoldering braid**. Do not overheat: pads can lift off the board.",
          "**Safety:**\n\n- The iron tip is hot enough to burn skin and start a fire. Put it in its **stand** whenever you let go of it, and switch it off when you leave.\n- Flux smoke is unpleasant to breathe, so work with the room ventilated (a small **fume extractor** is better).\n- Much solder, especially older solder, contains **lead**. Wash your hands afterwards and never eat or drink at the bench.\n- Wear **safety glasses**: leg clippings fly, and hot solder can spit.\n- Never solder onto a lithium cell, and never solder a powered circuit.",
        ),
      },
      {
        kind: "question",
        title: "A good through-hole joint",
        body: "Put the steps of soldering one through-hole leg in the right order.",
        question: {
          type: "order",
          items: [
            "Touch the iron to the pad and the leg together",
            "Feed solder onto the joint until it flows round the leg",
            "Take the solder away, then the iron",
            "Hold the part still while it cools, then trim the leg",
          ],
          hint: "Heat first, then solder; and the solder leaves before the iron does.",
        },
        explanation: "Heating the pad and the leg together makes the solder flow into the joint. Feeding the solder to the joint (not the iron) puts the flux where it is needed. Moving the part while it sets gives a dull, cracked cold joint, which is why you keep still until it is solid.",
      },
      {
        kind: "question",
        title: "Spot the bad joint",
        body: "You inspect four soldered legs. Which one should you **rework**?",
        question: {
          type: "choice",
          options: ["Shiny and smooth, shaped like a small cone round the leg", "A dull, grainy blob that sits on the pad and does not touch the leg", "A small shiny joint with the leg trimmed just above it", "A joint that wicks evenly onto both the pad and the leg"],
          answer: 1,
          hint: "A good joint is shiny, concave and wets both the pad and the leg. Look for the one that does not.",
          feedback: {
            0: "That is the textbook good joint: shiny, concave and wetted onto the leg.",
            2: "A trimmed, shiny joint is fine. Trimming the leg after it cools is normal.",
            3: "Solder wetting both the pad and the leg evenly is exactly what you want.",
          },
        },
        explanation: "A dull, grainy blob that has not wetted the leg is a **cold joint**: the metal never got hot enough, or moved while it set. It may conduct today and fail later. Add a little flux, reheat the pad and the leg together, and let the solder flow properly.",
      },
      {
        kind: "question",
        title: "Before you walk away",
        body: "You are called away for ten minutes mid-job. The iron is hot and a small part is half soldered. What is the safest move?",
        question: {
          type: "choice",
          options: ["Lay the iron on the bench with its tip pointing away", "Rest it in the stand and leave it on so it stays ready", "Put it in its stand and switch it off, then come back to it", "Wedge it against the board so the part cannot move"],
          answer: 2,
          hint: "A hot tip stays hot for minutes and a bench is not a safe place for it.",
          feedback: {
            0: "A hot tip lying on the bench can burn the surface or roll onto a cable. Use the stand.",
            1: "The stand is right, but a hot iron left unattended is a fire risk. Switch it off if you will be away.",
            3: "Never rest a hot iron on the work. It can melt the board and the part.",
          },
        },
        explanation: "The stand holds the tip safely, and switching off removes the fire risk while you are away. The same habits apply to the rest of the bench: ventilate or use a fume extractor, wear safety glasses, wash your hands after lead solder, and never solder onto a lithium cell or a powered circuit.",
      },
      {
        kind: "recap",
        points: [
          "A **breadboard** joins holes in groups of five (a to e, f to j) and along the long rails. Two legs of one part in the same strip are shorted out.",
          "A good **solder joint** is shiny and concave: heat the pad and the leg together, feed solder to the joint, remove the solder and then the iron, and keep still. A dull blob is a cold joint: rework it.",
          "Rework means flux, heat and braid, without overheating the pad.",
          "Soldering safety: iron in its stand (and off when you leave), ventilation or a fume extractor, safety glasses, wash hands after lead solder, never solder a powered circuit or a lithium cell.",
          "Next, *Using an oscilloscope* shows you what the circuit is doing.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 10. Using an oscilloscope ───────────────────────────────
  {
    id: "fnd-circ-10-oscilloscope",
    title: "Using an oscilloscope",
    summary: "Read voltage against time on a toy scope: V/div and time/div, the trigger, the 10x probe and its setting, and why a long ground lead makes a signal ring.",
    level: "Intermediate",
    minutes: 10,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "The oscilloscope: voltage against time",
        body: P(
          "A multimeter gives you one number. Many signals change too fast, or too much, for one number: a clock ticking a million times a second, a button bouncing, a motor's noise. An **oscilloscope** (a *scope*) draws a graph of voltage (up) against time (across), over and over, so you can see the shape.",
          "The screen is a grid of **divisions**: usually 10 across and 8 up. Two knobs set the scale:\n\n- **Volts per division** (V/div): how many volts each square up the screen is worth. A trace 3 squares tall at 1 V/div is 3 V.\n- **Time per division** (time/div): how much time each square across is worth. A wave that repeats every 5 squares at 200 ns/div has a period of 1 µs, so its frequency is 1 ÷ 1 µs = 1 MHz.",
          "Here the signal is a 3.3 V digital square wave at 1 MHz, the kind a microcontroller pin might make. Turn the two knobs and watch the picture stretch and shrink.",
        ),
        widget: { type: "circ-scope", props: { vdiv: 2, tdiv: 1e-6, level: 1.6, hide: ["level", "edge", "probe", "setting", "ground"] } },
      },
      {
        kind: "question",
        title: "Fit the wave on the screen",
        body: "Set the two knobs so the square wave is **3 to 6 divisions tall** and the screen shows **2 to 6 cycles** of it.",
        widget: { type: "circ-scope", props: { vdiv: 10, tdiv: 5e-6, level: 1.6, hide: ["level", "edge", "probe", "setting", "ground"] } },
        question: { type: "widget", goal: { minHeight: 3, maxHeight: 6, minCycles: 2, maxCycles: 6 }, hint: "The signal is 3.3 V tall, so pick a V/div that makes it a few squares, not a sliver. The period is 1 µs, so pick a time/div that fits a few of them." },
        explanation: "At 1 V/div the 3.3 V wave is 3.3 squares tall. At 200 ns/div the 10 squares span 2 µs, which is 2 cycles, and at 500 ns/div they span 5 µs, which is 5 cycles. Too high a V/div shrinks the wave to a line, and too low a V/div runs it off the top of the screen. Too long a time/div squeezes dozens of cycles into a solid band.",
      },
      {
        kind: "question",
        title: "Read the frequency",
        body: "On a different circuit the scope shows a wave that repeats every **4 divisions**, with the time knob at **50 µs per division**. What is its frequency, in kilohertz?",
        question: { type: "number", answer: 5, tolerance: 0.01, unit: "kHz", hint: "Find the time for one cycle first. Frequency is 1 divided by the period." },
        explanation: "One cycle takes 4 × 50 µs = 200 µs. Frequency = 1 ÷ 200 µs = 5000 Hz = **5 kHz**.",
      },
      {
        kind: "explain",
        title: "Hold it still: the trigger",
        body: P(
          "The scope sweeps across the screen again and again. If every sweep started at a random moment, each one would show a different part of the wave and the picture would **smear**.",
          "The **trigger** fixes that. It starts a sweep only when the signal crosses a **trigger level** you set, in a direction you choose (the **edge**: rising or falling). Every sweep then starts at the same point of the wave and the picture holds still. The orange marker at the top shows where the trigger point is, and the orange dashed line is the level.",
          "The level has to be somewhere the signal actually goes. Slide it above the top of the wave and nothing ever crosses it, so the picture smears. (Most scopes in *auto* mode keep sweeping anyway, so you always see something, even when the trigger is wrong.)",
        ),
        widget: { type: "circ-scope", props: { vdiv: 1, tdiv: 200e-9, level: 1.6, hide: ["vdiv", "tdiv", "probe", "setting", "ground"] } },
      },
      {
        kind: "question",
        title: "Steady on a falling edge",
        body: "The picture is smeared. Make it **hold still**, with the sweep starting on a **falling** edge.",
        widget: { type: "circ-scope", props: { vdiv: 1, tdiv: 200e-9, level: 5, edge: "rise", hide: ["vdiv", "tdiv", "probe", "setting", "ground"] } },
        question: { type: "widget", goal: { triggered: true, edge: "fall" }, hint: "A level has to be somewhere between the signal's low and high, or nothing ever crosses it. Then pick which edge starts the sweep." },
        explanation: "Any level between the low (0 V) and the high (3.3 V) gets crossed twice per cycle, once going up and once going down. The edge setting picks which crossing starts the sweep. Set to falling, the trace begins at the top and drops at the trigger mark.",
      },
      {
        kind: "explain",
        title: "The probe: 10x and the setting",
        body: P(
          "A scope probe is not just a wire. A **10x probe** has a resistor in its tip that makes a **10 to 1 divider** with the scope's input, so the scope sees a tenth of the real voltage. The reason to put up with that: a 10x probe loads the circuit much less (roughly 10 MΩ and a few picofarads, against about 1 MΩ and 100 pF for a 1x probe, typical figures) and works at much higher frequencies (a 1x probe is often limited to a few MHz). The switch on the probe's handle chooses 1x or 10x. A small trimmer lets you **compensate** a 10x probe on the scope's test square wave until its corners are flat.",
          "The scope cannot feel which position the switch is in. **You tell it** with the channel's **probe setting**, and it then multiplies its labels by 10. If the switch says 10x and the channel says 1x, every reading is ten times too small. This is the most common scope mistake.",
          "Flip the probe switch and the channel setting. When the two agree, the picture reads true. When they don't, the scope says so.",
        ),
        widget: { type: "circ-scope", props: { vdiv: 1, tdiv: 200e-9, level: 1.6, probe: 10, setting: 10, hide: ["vdiv", "tdiv", "level", "edge", "ground"] } },
      },
      {
        kind: "question",
        title: "A 10x probe on a 1x channel",
        body: "A 10x probe is on a circuit, but the channel still says 1x. The scope reports a **330 mV** peak-to-peak square wave. How big is the real signal, in volts?",
        question: { type: "number", answer: 3.3, tolerance: 0.02, unit: "V", hint: "The probe divides by 10, but the scope has been told it did not." },
        explanation: "The probe passed only a tenth of the voltage and the scope, thinking it was a 1x probe, did not multiply the reading back up. The real signal is 10 × 330 mV = **3.3 V**. Check the channel setting every time you change probes.",
      },
      {
        kind: "explain",
        title: "The ground lead: a loop that rings",
        body: P(
          "A probe measures the voltage between its **tip** and its **ground lead**, so the ground lead is part of the measurement. Any wire has a little **inductance** (a typical figure is about 10 nH per centimetre), and a 15 cm clip lead has around 150 nH. Together with the probe tip's capacitance (typically around 12 pF) and a few tens of ohms of resistance in the loop (40 Ω here) it forms a small resonant circuit. Every fast edge kicks it and it **rings** for a few cycles. For 150 nH and 12 pF the ring is at about 120 MHz, and an ideal scope would show an overshoot of about 56%.",
          "A 100 MHz scope cannot follow a 120 MHz ring fully, and real edges are not perfectly sharp, so this toy scope shows about +25% (peaks near 4.1 V on the 3.3 V signal, and a peak-to-peak reading near 5 V once the dip after the falling edge counts): the lead is worse than the picture admits. On the screen it looks like overshoot and wobble on every corner, and it makes the voltage read **too high**. Some ringing can be real (the circuit itself may do it), but a long ground lead adds its own. The test is to shorten the lead: if the ringing shrinks, the lead was making it. A short **spring ground** (a bare spring touching a ground point right beside the test point) has far less inductance. Its ring is at about 420 MHz and is well damped (about 8% on paper), which a 100 MHz scope almost completely hides.",
          "A big ground loop also picks up magnetic noise from nearby circuits. Short and close is better for both.",
          "This is the same lead on the same signal: swap between the long clip and the short spring.",
        ),
        widget: { type: "circ-scope", props: { vdiv: 1, tdiv: 100e-9, level: 1.6, ground: "clip", probe: 10, setting: 10, hide: ["vdiv", "tdiv", "level", "edge", "probe", "setting"] } },
      },
      {
        kind: "question",
        title: "A reading you can trust",
        body: "The scope shows a **hopeless** picture of the 3.3 V signal. Fix it so the scope **reads between 3.2 V and 3.4 V**, with the trace steady and the 10x probe still in use.",
        widget: { type: "circ-scope", props: { vdiv: 0.1, tdiv: 200e-9, level: 0.15, ground: "clip", probe: 10, setting: 1, hide: ["tdiv", "level", "edge"] } },
        question: {
          type: "widget",
          goal: { triggered: true, probeOk: true, probe: 10, ground: "spring", minVpp: 3.2, maxVpp: 3.4 },
          hint: "Three things can distort the reading: the channel's probe setting, a V/div that runs the trace off the screen, and the ground lead.",
        },
        explanation: "Three fixes in a row. Tell the channel the probe is 10x so the scope multiplies correctly. Choose about 1 V/div so the 3.3 V wave fits on the screen instead of being clipped. Swap the long clip for the short spring so the ringing no longer adds to the peak. Only then does the screen read the real 3.3 V.",
      },
      {
        kind: "recap",
        points: [
          "A **scope** plots voltage against time. Read volts as squares × V/div, time as squares × time/div, and frequency as 1 ÷ period.",
          "The **trigger** starts each sweep at the same point (a level and an edge), so the picture holds still.",
          "Tell the scope what the **probe** is: a 10x probe on a channel set to 1x reads ten times too small.",
          "Use the **shortest ground lead** you can. A long clip lead rings on fast edges (here about 120 MHz, +25% on this scope) and makes the reading too high. For more tools and cases, see *Debugging hardware*.",
        ],
      },
    ],
  },
];
