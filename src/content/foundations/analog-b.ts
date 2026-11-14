import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (tables, diagrams) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Fenced Python block for lesson prose. */
const py = (s: string) => "~~~python\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 5 to 7 of "Components in action": impedance and filters, power supplies, transistors as switches. */
export const analogLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 5. Impedance and filters ───────────────────────────────
  {
    id: "fnd-analog-5-filters",
    title: "Impedance and filters",
    summary: "Capacitors and inductors resist current differently at different frequencies. Use that to build RC low-pass and high-pass filters, find the cutoff, and read a Bode plot in decibels.",
    level: "Intermediate",
    minutes: 11,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "Resistance that depends on speed",
        body: P(
          "A resistor opposes current by the same amount whatever the signal is doing. A capacitor and an inductor are different: how much they oppose depends on **how fast the signal changes**, which is its frequency (see *Alternating current*). This frequency-dependent opposition is called **reactance**, written **X**, and it is measured in ohms.",
          "- **Capacitor:** XC = 1 / (2π f C). The higher the frequency, the lower XC. A fast signal slips through; a very slow one meets a huge XC. At DC (f = 0) XC is infinite, which is why a capacitor blocks DC (see *Capacitors: storing charge*).\n- **Inductor:** XL = 2π f L. The opposite: a fast signal meets a large XL, while DC passes through almost freely, because an inductor only resists *change* in current (see *Inductors and magnetism*).",
          "Picture the capacitor as the tank with a rubber wall. A slow push lets the wall stretch all the way, and then it pushes back and stops the flow. Fast jiggling never stretches it far, so water seems to slosh through. The analogy breaks because real water never gets \"through\" a wall; the capacitor passes the *change*, not the charge itself.",
          "**Impedance (Z)** is the AC version of resistance: the total opposition of resistors and reactances together, also in ohms. Resistors and reactances do not simply add, because the voltage across a capacitor peaks a quarter of a cycle after the resistor's (a phase shift of 90°). For a resistor in series with a capacitor, the size of the impedance is √(R² + XC²). In this lesson we track only sizes and mention the phase shift where it matters.",
          "Below, both reactances are plotted against frequency on log scales, so each one is a straight line. Drag the frequency, and change the capacitor and inductor.",
        ),
        widget: { type: "analog-reactance", props: {} },
      },
      {
        kind: "question",
        title: "Make the capacitor nearly a wire",
        body: "Select the **1 µF** capacitor, then set the frequency high enough that its reactance **XC falls below 100 Ω**.",
        widget: { type: "analog-reactance", props: { c: 1e-7 } },
        question: {
          type: "widget",
          goal: { c: 1e-6, xcMax: 100 },
          prompt: "Pick 1 µF and a frequency where XC is below 100 Ω.",
          hint: "XC = 1 / (2π f C) gets smaller as f grows. Check the XC readout as you slide.",
        },
        explanation: "XC < 100 Ω means 1 / (2π · f · 1 µF) < 100, so f is above about **1.6 kHz**. Above that frequency the capacitor is closer to a wire than a gap. Where the XC and XL lines cross, the two reactances are equal, which for a capacitor and an inductor together is the idea behind resonance.",
      },
      {
        kind: "explain",
        title: "A filter is a divider with a capacitor in it",
        body: P(
          "A **filter** passes some frequencies and blocks others. The simplest one is the voltage divider (see *The voltage divider and loading* in the circuits module), with one resistor swapped for a capacitor. A divider shares the input voltage between its two parts in proportion to their opposition, and a capacitor's opposition changes with frequency.",
          "- **RC low-pass:** resistor in series, capacitor from the output to ground, and the output is taken **across the capacitor**. Slow signals: XC is large compared with R, so most of the voltage appears across C and passes. Fast signals: XC is tiny, so the capacitor short-circuits the output to ground and little survives.\n- **RC high-pass:** swap them. The capacitor is in series and the output is taken **across the resistor**. Fast signals pass; slow ones, and DC, are blocked.",
          "The boundary is the **cutoff frequency**, where XC equals R:",
          txt(`
fc = 1 / (2π R C)
`),
          "It is the same RC as the time constant from *Capacitors: storing charge*: fc = 1 / (2π τ). At fc the output is **0.707** (that is 1/√2) of the input, not one half: the resistor's and capacitor's voltages are 90° apart, so their sizes combine like the sides of a right triangle, √(R² + XC²) = R√2. A low-pass output is also delayed there by a **phase shift of −45°**. This 0.707 point is called the **−3 dB point**.",
          "The plot shows the filter's **gain** (output size divided by input size, in decibels, which we define next) against frequency. Try both types, and drag the test frequency across the cutoff.",
        ),
        widget: { type: "analog-filter", props: { r: 1000, c: 1e-7, type: "low", testF: 100 } },
      },
      {
        kind: "question",
        title: "Find the cutoff",
        body: "A low-pass filter uses **R = 1 kΩ** and **C = 100 nF**. What is its cutoff frequency fc, in hertz?",
        question: { type: "number", answer: 1591.5, tolerance: 25, unit: "Hz", hint: "Convert first: 100 nF = 0.0000001 F. Then fc = 1 / (2π R C)." },
        explanation: "fc = 1 / (2π × 1000 × 0.0000001) = 1 / 0.000628 ≈ **1592 Hz**. Halve the capacitor and the cutoff doubles: a smaller capacitor has a larger reactance, so the filter lets higher frequencies through.",
      },
      {
        kind: "explain",
        title: "Decibels and the roll-off",
        body: P(
          "Gains cover huge ranges, so engineers use **decibels (dB)**, a logarithmic scale. For voltage ratios:",
          txt(`
dB = 20 · log10(Vout / Vin)
`),
          txt(`
Vout / Vin    dB
1             0
0.707         −3
0.5           −6
0.1           −20
0.01          −40
`),
          "(For power ratios the factor is 10 instead of 20; power goes with voltage squared.) Every −20 dB is a tenfold drop in voltage.",
          "Far above its cutoff, a first-order low-pass has a gain of about fc / f. Ten times the frequency means ten times less voltage, so the response falls **20 dB per decade** (a **decade** is a factor of ten in frequency). Plot gain in dB against a log frequency axis and the roll-off is a **straight line**; this is a **Bode plot**. The grey dashed lines in the widget are those straight-line approximations; the real curve sits 3 dB below them at the corner.",
          "Slide the test frequency and read the gain: one decade above fc should be near −20 dB, two decades near −40 dB.",
        ),
        widget: { type: "analog-filter", props: { r: 1000, c: 1.5e-7, type: "low", testF: 1000 } },
      },
      {
        kind: "question",
        title: "A decade past the cutoff",
        body: "A low-pass filter has **fc = 1 kHz**. About how much of a **10 kHz** sine wave gets through (as a voltage ratio)?",
        question: {
          type: "choice",
          options: [
            "About 0.5 (−6 dB)",
            "About 0.1 (−20 dB): ten times the frequency, ten times less voltage",
            "About 0.707 (−3 dB), the same as at the cutoff",
            "About 0.01 (−40 dB)",
          ],
          answer: 1,
          hint: "A first-order filter falls 20 dB per decade. How many decades is 10 kHz above 1 kHz?",
          feedback: {
            0: "A gain of 0.5 happens at only about 1.7 × fc. At 10 × fc the output is much smaller.",
            2: "0.707 is the gain exactly at fc. 10 kHz is a whole decade further into the roll-off.",
            3: "−40 dB is two decades above fc (100 kHz here). 10 kHz is just one decade.",
          },
        },
        explanation: "10 kHz is one decade above fc, so the gain is about −20 dB, which is a voltage ratio of **0.1** (exactly 1 / √101 ≈ 0.0995). A first-order filter is gentle; steeper cuts need more filter stages.",
      },
      {
        kind: "question",
        title: "Remove the hum",
        body: "Mains hum at **50 Hz** is leaking into a signal you want to keep clean. Choose **High-pass**, open the **Scope**, set the test frequency to about **50 Hz**, and pick R and C so the hum comes out at least **20 dB weaker** (gain −20 dB or lower). Watch the output shrink.",
        widget: { type: "analog-filter", props: { r: 1000, c: 1e-6, type: "low", view: "scope", testF: 200 } },
        question: {
          type: "widget",
          goal: { type: "high", at: 50, gainDbMax: -20 },
          prompt: "High-pass, test frequency about 50 Hz, gain at most −20 dB.",
          hint: "Well below the cutoff a high-pass gain is about f / fc. For −20 dB at 50 Hz, fc needs to be around ten times 50 Hz or more.",
        },
        explanation: "Below its cutoff a high-pass filter passes only about f / fc of the signal. With fc around 500 Hz or higher, 50 Hz comes out at 0.1 or less, which is −20 dB or better. A real design would also check what the cutoff does to the signal you *want*, since a high-pass cuts everything below fc.",
      },
      {
        kind: "code",
        title: "Cutoff calculator",
        body: P(
          "Write a function **`cutoff(r, c)`** that returns the cutoff frequency of an RC filter in hertz, given the resistance `r` in ohms and the capacitance `c` in farads. In Python, `math.pi` is π.",
          py(`
import math

# fc = 1 / (2 π R C)
`),
        ),
        language: "python",
        starter: `import math

def cutoff(r, c):
    # return fc in hertz
    return 0
`,
        solution: `import math

def cutoff(r, c):
    return 1 / (2 * math.pi * r * c)
`,
        tests: [
          { id: "k-uf", description: "1 kΩ with 1 µF is about 159.15 Hz", assertionCode: `assert abs(cutoff(1000, 1e-6) - 159.15) < 0.05, f"got {cutoff(1000, 1e-6)}, expected about 159.15"` },
          { id: "10k-10n", description: "10 kΩ with 10 nF is about 1591.5 Hz", assertionCode: `assert abs(cutoff(10000, 10e-9) - 1591.5) < 0.5, f"got {cutoff(10000, 10e-9)}, expected about 1591.5"` },
          { id: "double", description: "Doubling the resistance halves the cutoff: 2 kΩ with 1 µF is about 79.58 Hz", assertionCode: `assert abs(cutoff(2000, 1e-6) - 79.577) < 0.02, f"got {cutoff(2000, 1e-6)}, expected about 79.58"` },
        ],
        hints: ["The denominator is 2 times math.pi times r times c.", "Return 1 / (2 * math.pi * r * c)."],
      },
      {
        kind: "recap",
        title: "What to remember",
        points: [
          "Reactance is opposition that depends on frequency: XC = 1 / (2π f C) falls as frequency rises, XL = 2π f L rises. Impedance is the AC generalisation of resistance.",
          "An RC low-pass (output across C) passes low frequencies; an RC high-pass (output across R) passes high ones. Both have cutoff fc = 1 / (2π R C).",
          "At fc the gain is 1/√2 ≈ 0.707, which is −3 dB, and the phase is −45° for a low-pass.",
          "Decibels: dB = 20 log10(Vout / Vin). A first-order filter rolls off at −20 dB per decade, a straight line on a Bode plot.",
          "Real sources and loads change the cutoff, and parts have tolerances, so treat fc as a design target to be measured.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 6. Power supplies ───────────────────────────────
  {
    id: "fnd-analog-6-power-supplies",
    title: "Power supplies",
    summary: "From the wall socket to a steady DC voltage: transformer, rectifier, smoothing capacitor and regulator. Ripple, linear versus switching regulators, and where the heat goes.",
    level: "Intermediate",
    minutes: 11,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "From the wall to a steady voltage",
        body: P(
          "A wall socket delivers **mains**: alternating voltage that is far too high for electronics (typically about 230 V at 50 Hz in much of the world, about 120 V at 60 Hz elsewhere). Chips want a low, steady **DC** voltage such as 3.3 V or 5 V. A **power supply** makes that, in four stages:",
          "1. **Transformer:** two coils sharing an iron core. It steps the mains down to a low AC voltage and **isolates** the output, so there is no direct electrical connection to the mains.\n2. **Rectifier:** diodes that turn AC into one-way pulses (next step).\n3. **Smoothing capacitor:** fills the gaps between pulses.\n4. **Regulator:** holds the output at one fixed voltage even when the input wobbles.",
          "We model the transformer as an ideal **12 V RMS** secondary (a common low-voltage rating). RMS is a sine's heating-equivalent value, and the peak is RMS × √2 = **17.0 V** (see *Alternating current*). With **AC in** selected, the load simply sees that voltage swinging both ways, which is no use to a chip.",
          "**Safety:** the mains side of a supply can kill, and learners do not build it. Use a sealed, certified plug-in adapter (a \"wall wart\") or a bench supply. Large capacitors can stay charged long after the power is off.",
        ),
        widget: { type: "analog-psu", props: { stage: "ac" } },
      },
      {
        kind: "question",
        title: "Put the chain in order",
        body: "Put the stages of a power supply in order, from the wall socket to the electronics.",
        question: {
          type: "order",
          items: [
            "Transformer: steps the mains down and isolates it",
            "Rectifier: turns AC into one-way pulses",
            "Smoothing capacitor: fills the gaps between pulses",
            "Regulator: holds the output at a fixed voltage",
          ],
          hint: "Reduce the voltage first, then make it one-directional, then even it out, then fix its value.",
        },
        explanation: "The transformer comes first because everything after it should work at a safe low voltage. The rectifier must come before the capacitor (a capacitor on raw AC just charges both ways). The regulator comes last because it needs a mostly steady input to do a precise job.",
      },
      {
        kind: "explain",
        title: "Half-wave and full-wave rectifiers",
        body: P(
          "A diode lets current through in one direction only (see *Diodes and LEDs*). A **half-wave** rectifier uses one diode: it passes the positive half of each cycle and blocks the negative half. The output is a bump, a gap, a bump, a gap, and half the wave is thrown away.",
          "A **full-wave bridge** uses four diodes arranged so that *both* halves of the cycle come out positive. There is no gap: two bumps per mains cycle, so **100 pulses a second on 50 Hz mains (120 on 60 Hz)**. The cost is that two diodes are always in the current path, so the bridge loses two diode drops, **about 1.4 V in total** (typical for silicon diodes, 0.7 V each).",
          txt(`
Secondary peak     12 V × √2 = 17.0 V
Half-wave peak     17.0 − 0.7  = 16.3 V
Bridge peak        17.0 − 1.4  = 15.6 V
`),
          "Switch between the stages below with the smoothing capacitor off, and count the bumps in three mains cycles.",
        ),
        widget: { type: "analog-psu", props: { stage: "half", smooth: false } },
      },
      {
        kind: "explain",
        title: "The smoothing capacitor and ripple",
        body: P(
          "Fit a capacitor across the output. At each peak the diodes charge it up. Between peaks the diodes switch off, and the capacitor alone feeds the load, so its voltage sags a little, until the next peak tops it up again. The remaining wobble is called **ripple**.",
          "If the load draws a constant current I, the capacitor loses charge Q = I × t, and its voltage falls by Q / C. The time between refills is one ripple period, 1 / f, so:",
          txt(`
ΔV ≈ I / (f · C)
`),
          "Here **f is the ripple frequency**: the mains frequency for a half-wave rectifier (one refill per cycle) and **twice** the mains frequency for a full-wave bridge. That is the full-wave advantage: the capacitor has half as long to sag, so for the same C and load the ripple is half as big.",
          "The estimate assumes a **constant load current**, an ideal transformer, and ripple **small compared with the peak**. Where those fail (a huge ripple, or a load that draws less as the voltage drops), the real ripple comes out smaller than the estimate, and the widget says so. More capacitance, less current or a higher ripple frequency all shrink the ripple.",
          "Try it: pick the full-wave bridge, fit a capacitor, then change the capacitor and load current.",
        ),
        widget: { type: "analog-psu", props: { stage: "full", smooth: true, c: 1e-3, iLoad: 0.3 } },
      },
      {
        kind: "question",
        title: "Estimate the ripple",
        body: "A **half-wave** rectifier on **50 Hz** mains feeds a **2200 µF** capacitor and a load drawing **0.2 A**. Using ΔV ≈ I / (f · C), what is the ripple, in volts?",
        question: { type: "number", answer: 1.82, tolerance: 0.05, unit: "V", hint: "Half-wave means the ripple frequency is the mains frequency itself. Use C = 0.0022 F." },
        explanation: "ΔV = 0.2 / (50 × 0.0022) = 0.2 / 0.11 ≈ **1.82 V**. With a full-wave bridge the ripple frequency is 100 Hz, so the same parts would give only about 0.91 V.",
      },
      {
        kind: "question",
        title: "Tame the ripple",
        body: "Choose the **full-wave bridge** with the smoothing capacitor fitted, and find a capacitor and load current that bring the simulated ripple **below 1 V**.",
        widget: { type: "analog-psu", props: { stage: "half", smooth: true, c: 4.7e-4, iLoad: 0.5 } },
        question: {
          type: "widget",
          goal: { stage: "full", smooth: true, rippleMax: 1 },
          prompt: "Full-wave, capacitor fitted, ripple under 1 V.",
          hint: "Ripple is I / (f · C): you can raise C, lower the current, or both. The full-wave stage already doubles f.",
        },
        explanation: "Two changes do it: the bridge doubles the ripple frequency, and a bigger capacitor (or a lighter load) lowers I / (f · C). Real designers also keep the ripple small so the regulator's input never dips below its minimum, which is the next idea.",
      },
      {
        kind: "explain",
        title: "Regulators: burn it or switch it",
        body: P(
          "Even smoothed, the voltage wobbles and sags with load. A **regulator** produces one fixed output, whatever the input does, as long as the input stays high enough.",
          "A **linear regulator** acts like an automatic variable resistor that keeps the output steady. Current in equals current out, so the extra voltage is simply **burned as heat**:",
          txt(`
P = (Vin − Vout) × I
efficiency ≈ Vout / Vin
`),
          "It also needs headroom: its input must exceed the output by the **dropout voltage**, typically about 2 V for a classic 7805-class part and as little as about 0.3 V for a **low-dropout (LDO)** part (typical values; check the datasheet).",
          "A **switching (buck) regulator** turns a transistor on and off thousands of times a second and uses an inductor to store energy and release it at the lower voltage (see *Inductors and magnetism*). It stores and moves energy instead of burning it, so it is typically **80 to 95% efficient**, but it adds switching noise and needs more parts.",
          "Try 12 V in, 5 V out, 0.5 A, then switch types. Watch the heat, and the warning when a plain package would need a heatsink. A hot regulator can burn you.",
        ),
        widget: { type: "analog-regulator", props: { kind: "linear", vin: 12, vout: 5, i: 0.5 } },
      },
      {
        kind: "question",
        title: "How much heat?",
        body: "A **linear regulator** converts **12 V** to **5 V** for a load drawing **0.5 A**. How much power does the regulator itself turn into heat, in watts?",
        question: { type: "number", answer: 3.5, tolerance: 0.05, unit: "W", hint: "The regulator drops (Vin − Vout) while carrying the full load current." },
        explanation: "P = (12 − 5) × 0.5 = **3.5 W** (voltage times current, as in *Power and heat*), while the load only receives 2.5 W: efficiency is just 5/12 ≈ 42%. A TO-220 package with no heatsink is typically good for around 1 W, so this part needs a heatsink or, better, a switching regulator.",
      },
      {
        kind: "question",
        title: "Which regulator?",
        body: "You are powering a sensitive audio preamp that draws only **20 mA** from a **6 V** supply, and it needs a very clean **5 V**. Which regulator fits best?",
        question: {
          type: "choice",
          options: [
            "A switching (buck) regulator, because efficiency is always the top priority",
            "A bare resistor in series, because it is the simplest part",
            "A low-dropout linear regulator, because it adds no switching noise and wastes almost nothing here",
            "No regulator: the ripple will be small enough anyway",
          ],
          answer: 2,
          hint: "Compare the heat burned, (Vin − Vout) × I, with how much you care about switching noise.",
          feedback: {
            0: "A buck regulator would save only a tiny amount of heat here, and its switching noise can leak into audio. Efficiency is not always the top priority.",
            1: "A series resistor gives a voltage that sags whenever the load current changes, so it does not regulate. It is not a regulator at all.",
            3: "Rectifier ripple and load changes would pass straight into the preamp, which is exactly what a regulator is there to remove.",
          },
        },
        explanation: "Burning (6 − 5) × 0.02 = **0.02 W** is nothing, so the linear regulator's inefficiency costs almost nothing, and it is quiet because nothing switches. A low-dropout part is needed because only 1 V of headroom is available. A buck regulator wins when the voltage gap or current is large.",
      },
      {
        kind: "recap",
        title: "What to remember",
        points: [
          "A supply is transformer, rectifier, smoothing capacitor, regulator. The transformer steps down and isolates; the mains side is lethal, so use sealed adapters or bench supplies.",
          "A half-wave rectifier uses one diode (about 0.7 V lost); a full-wave bridge uses four (about 1.4 V lost) but doubles the ripple frequency.",
          "Ripple ΔV ≈ I / (f · C), with f the ripple frequency: mains frequency for half-wave, twice that for full-wave. It assumes constant current and small ripple.",
          "A linear regulator burns (Vin − Vout) × I as heat and needs a dropout voltage; a buck regulator is typically 80 to 95% efficient but adds switching noise.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Transistors as switches ───────────────────────────────
  {
    id: "fnd-analog-7-transistor-switches",
    title: "Transistors as switches",
    summary: "A microcontroller pin cannot power a motor, but it can control a transistor that does. BJT saturation, base resistors, logic-level MOSFETs, gate pull-downs, heat, and the flyback diode.",
    level: "Advanced",
    minutes: 12,
    xp: 75,
    steps: [
      {
        kind: "explain",
        title: "A pin is not a power supply",
        body: P(
          "A microcontroller's **GPIO** (general-purpose input/output) pin can be set to 0 V or to the chip's logic voltage, often 3.3 V. It can only supply a small current: **typical per-pin limits run from a few mA up to roughly 20 mA**, and the chip as a whole has a total limit too (always check your microcontroller's datasheet). A motor, relay coil or LED strip wants tens to hundreds of milliamps or more. Ask a pin for that and the pin's voltage collapses, or the chip is damaged.",
          "The fix is to let the pin *control* a **transistor** that switches the big current from a separate supply. The pin only has to supply a tiny signal. In a **low-side switch**, the load connects to the positive supply on top, and the transistor sits underneath, joining the load's bottom end to **ground** when it is on. The microcontroller and the load supply must **share a ground**, or the pin's voltage means nothing to the transistor.",
          "The next two steps use the same two transistor families: the **BJT** (bipolar junction transistor), controlled by a small *current*, and the **MOSFET**, controlled by a *voltage*.",
          "**Safety:** motors and other high-current loads make wires, resistors and transistors hot. Start with small, low-voltage supplies, and never touch a part that has been working hard.",
        ),
      },
      {
        kind: "explain",
        title: "The BJT as a switch",
        body: P(
          "An **NPN BJT** has three legs: **base (B)**, **collector (C)** and **emitter (E)**. A small current into the base lets a much bigger current flow from collector to emitter. In its **active region**:",
          txt(`
Ic = β · Ib
`),
          "β (beta) is the current gain, **typically around 100**, but it varies widely between parts and with current and temperature; datasheets give a range, often with a much lower minimum.",
          "For a switch we do not want a proportional amplifier; we want fully on. Give the base **generously more** current than Ic / β and the transistor **saturates**: the load limits the current, and the voltage across the transistor falls to **VCE(sat), typically 0.1 to 0.3 V**. Then it dissipates little heat. A common rule is an **overdrive** of about 2 to 10 times the minimum base current. Starve the base and the transistor stays in the active region, dropping a lot of voltage while carrying current, which means **heat**.",
          "The base resistor sets Ib. The base-emitter junction drops **VBE, typically about 0.7 V**:",
          txt(`
Rb = (Vgpio − VBE) / Ib
`),
          "The widget starts with a relay coil and a 4.7 kΩ base resistor. Is it saturated? Change Rb (the preferred E12 values) and β and watch VCE and the heat.",
        ),
        widget: { type: "analog-switch", props: { device: "bjt", load: "relay", rb: 4700, beta: 100 } },
      },
      {
        kind: "question",
        title: "Saturate it properly",
        body: "Keep the **relay coil** and the **BJT**. Choose a base resistor so the transistor is **saturated with at least 2× overdrive**, while the GPIO pin supplies **no more than 4 mA**.",
        widget: { type: "analog-switch", props: { device: "bjt", load: "relay", rb: 10000, beta: 100 } },
        question: {
          type: "widget",
          goal: { device: "bjt", load: "relay", saturated: true, minOverdrive: 2, gpioMaxA: 0.004 },
          prompt: "BJT, relay coil, saturated with 2× overdrive or more, GPIO at most 4 mA.",
          hint: "A 70 mA coil needs about 0.7 mA of base current at β = 100. Aim for at least twice that, but no more than 4 mA.",
        },
        explanation: "Ib = (3.3 − 0.7) / Rb. The relay needs about 0.7 mA to saturate at β = 100, so you want 1.4 mA or more (Rb up to about 1.8 kΩ) while staying under 4 mA (Rb at least about 680 Ω). Anything in between works; the 2× margin covers a part whose real β is lower than typical.",
      },
      {
        kind: "code",
        title: "Base resistor calculator",
        body: P(
          "Write **`base_resistor(v_gpio, vbe, ic, beta, overdrive)`**. It should return the base resistor in ohms that gives a base current of `overdrive` times the minimum needed to saturate: the load current `ic` divided by `beta`.",
          py(`
# Ib_needed = ic / beta
# Ib        = overdrive * Ib_needed
# Rb        = (v_gpio - vbe) / Ib
`),
        ),
        language: "python",
        starter: `def base_resistor(v_gpio, vbe, ic, beta, overdrive):
    # return Rb in ohms
    return 0
`,
        solution: `def base_resistor(v_gpio, vbe, ic, beta, overdrive):
    ib = overdrive * ic / beta
    return (v_gpio - vbe) / ib
`,
        tests: [
          { id: "led-strip", description: "150 mA at beta 100, 2x overdrive, 3.3 V pin: about 866.7 ohms", assertionCode: `assert abs(base_resistor(3.3, 0.7, 0.15, 100, 2) - 866.67) < 0.1, f"got {base_resistor(3.3, 0.7, 0.15, 100, 2)}, expected about 866.67"` },
          { id: "relay-5v", description: "70 mA at beta 100, 5x overdrive, 5 V pin: about 1228.6 ohms", assertionCode: `assert abs(base_resistor(5, 0.7, 0.07, 100, 5) - 1228.57) < 0.1, f"got {base_resistor(5, 0.7, 0.07, 100, 5)}, expected about 1228.57"` },
          { id: "low-beta", description: "400 mA at beta 50, 2x overdrive: 162.5 ohms", assertionCode: `assert abs(base_resistor(3.3, 0.7, 0.4, 50, 2) - 162.5) < 0.01, f"got {base_resistor(3.3, 0.7, 0.4, 50, 2)}, expected 162.5"` },
        ],
        hints: ["First find the base current you want: overdrive * ic / beta.", "Then Ohm's law across the base resistor: (v_gpio - vbe) / ib."],
      },
      {
        kind: "explain",
        title: "The MOSFET as a switch",
        body: P(
          "An **N-channel MOSFET** has a **gate (G)**, **drain (D)** and **source (S)**. The gate is insulated from the channel, so it needs essentially **no steady current**: the voltage between gate and source, **VGS**, alone decides how well the channel conducts (*The MOSFET: a switch made of silicon* in the Semiconductors part shows how that gate voltage opens a channel). (Charging the gate does draw a brief current, like charging a tiny capacitor.) When it is on, the channel behaves like a small resistor, **RDS(on)**, and the heat is simply **P = I² × RDS(on)**.",
          "Be careful with the threshold voltage **VGS(th)**: it is where the MOSFET just *starts* to conduct (datasheets measure it at a tiny current), not where it is fully on. For a 3.3 V pin, look for a **logic-level** MOSFET whose RDS(on) is specified at **VGS = 2.5 V or 4.5 V**. A part that lists RDS(on) only at VGS = 10 V may barely turn on from 3.3 V and run very hot.",
          "Two cheap extras, both typically tiny resistors:\n- A **gate resistor** (typically tens to a few hundred ohms) limits the brief charging spike and ringing.\n- A **gate pull-down** (typically 10 to 100 kΩ from gate to ground) keeps the gate at 0 V while the microcontroller boots and its pins float; otherwise the load could switch on at random.",
          "In the widget, pick the **small motor** and compare the two MOSFET parts. The \"standard\" part uses a made-up, labelled toy value of about 8 Ω at 3.3 V; real parts vary a lot.",
        ),
        widget: { type: "analog-switch", props: { device: "mosfet", load: "motor", part: "standard", diode: true } },
      },
      {
        kind: "question",
        title: "Which MOSFET?",
        body: "A 3.3 V microcontroller pin will switch a 2 A load. Which datasheet entry is most promising?",
        question: {
          type: "choice",
          options: [
            "RDS(on) = 0.02 Ω at VGS = 10 V; VGS(th) = 3 V",
            "VGS(th) = 1 V; RDS(on) is only given at VGS = 10 V",
            "RDS(on) = 0.05 Ω at VGS = 2.5 V; VGS(th) = 1 V",
            "Any N-channel part: VGS(th) is the voltage where it is fully on",
          ],
          answer: 2,
          hint: "Look for an RDS(on) that is guaranteed at a gate voltage you can actually supply.",
          feedback: {
            0: "That RDS(on) is only guaranteed with 10 V on the gate, and a 3 V threshold means 3.3 V barely opens it.",
            1: "A low threshold only tells you where conduction begins. With RDS(on) listed only at 10 V, you do not know how it behaves at 3.3 V.",
            3: "VGS(th) is where the MOSFET starts to conduct, not where it is fully on. Fully on needs the RDS(on) table.",
          },
        },
        explanation: "Only the third entry promises a low resistance at a gate voltage the pin can supply. At 2 A it would dissipate I² × RDS(on) = 4 × 0.05 = 0.2 W, which is fine for a small package.",
      },
      {
        kind: "question",
        title: "Heat in the switch",
        body: "A logic-level MOSFET has **RDS(on) = 0.05 Ω** at your gate voltage and passes **2 A**. How much heat does the MOSFET dissipate, in watts? (P = I² × RDS(on).)",
        question: { type: "number", answer: 0.2, tolerance: 0.01, unit: "W", hint: "Square the current first: 2 A × 2 A = 4, then multiply by the resistance." },
        explanation: "P = 2² × 0.05 = **0.2 W**. For comparison, a saturated BJT with VCE(sat) = 0.2 V carrying the same 2 A would dissipate 0.4 W (and a small BJT may not carry 2 A at all), which is one reason MOSFETs are popular for big loads.",
      },
      {
        kind: "question",
        title: "Protect the switch",
        body: P(
          "A motor or relay coil is an **inductor** (see *Inductors and magnetism*). Its current cannot stop instantly, so when the transistor turns off the coil keeps pushing and its voltage spikes (V = L · di/dt), potentially many times the supply voltage, enough to destroy the transistor. The cure is a **flyback diode** across the load, with its cathode on the positive supply: it does nothing while the load runs, and gives the current a safe loop when the switch opens.",
          "Set up a safe motor driver: a **MOSFET**, the **logic-level** part, the **small motor**, and the **flyback diode fitted**. The motor should get at least 90% of its current.",
        ),
        widget: { type: "analog-switch", props: { device: "bjt", load: "relay", rb: 4700, beta: 100 } },
        question: {
          type: "widget",
          goal: { device: "mosfet", part: "logic", load: "motor", diode: true, loadPctMin: 0.9 },
          prompt: "MOSFET, logic-level part, small motor, flyback diode fitted.",
          hint: "Switch the load to the small motor, the type to MOSFET, pick the logic-level part, and turn the flyback diode on.",
        },
        explanation: "The logic-level part is fully on at 3.3 V (0.05 Ω), so the motor gets nearly all of its current, and the diode clamps the turn-off spike to about the supply voltage plus 0.7 V. Leave the diode out and the transistor has to survive the spike alone, which it often does not.",
      },
      {
        kind: "recap",
        title: "What to remember",
        points: [
          "A GPIO pin supplies only a few mA to about 20 mA (typical; check the datasheet), so it controls a transistor that switches the real load, with the grounds shared.",
          "A BJT switch needs Ib well above Ic / β (typical overdrive 2 to 10×) to saturate, where VCE(sat) is about 0.1 to 0.3 V; Rb = (Vgpio − VBE) / Ib with VBE about 0.7 V.",
          "A MOSFET is voltage-controlled and draws no steady gate current. Use a logic-level part with RDS(on) specified at your gate voltage; VGS(th) is only where it starts to conduct. Heat is I² × RDS(on).",
          "Add a gate resistor and a gate pull-down, and put a flyback diode across every inductive load. Motors and big currents get hot.",
        ],
      },
    ],
  },
];
