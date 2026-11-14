import type { ConceptLesson } from "../../learn/types.ts";

/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 8 to 10 of "Components in action: capacitors to op-amps": amplifiers, op-amps, analog to digital and back. */
export const analogLessonsC: ConceptLesson[] = [
  // ─────────────────────────────── 8. Transistors as amplifiers ───────────────────────────────
  {
    id: "fnd-analog-8-amplifiers",
    title: "Transistors as amplifiers",
    summary:
      "Between off and on a transistor is a valve: bias it, feed it a small signal, and a bigger copy comes out, until it runs out of room and clips.",
    level: "Advanced",
    minutes: 11,
    xp: 75,
    steps: [
      {
        kind: "explain",
        title: "A valve, not a switch",
        body: P(
          "In **Transistors as switches** a transistor was either fully off or fully on. Between those two extremes lies a third state, the **active region**. There the transistor acts like a **valve**: a small change at its input (the base of a BJT, the gate of a MOSFET) makes a much bigger, matching change in the current through it.",
          "Put a resistor in the path of that current and the current's wiggle becomes a *voltage* wiggle, bigger than the one you put in. That is an **amplifier**.",
          "Think of a tap: a small turn of the handle changes the flow a lot. The picture breaks in one place. A tap moves the same amount however you turn it, while the amplifier's output copies the *shape* of the input, moment by moment.",
          "Below is a **sketch** of one amplifier stage (a behavioural model, not a transistor simulation). The orange line is the input wiggle; the blue line is the output. Drag the sliders.",
        ),
        widget: {
          type: "analog-amp",
          props: { gain: 10, biasPct: 50, vinMv: 50, vcc: 9 },
        },
      },
      {
        kind: "question",
        title: "Clean and loud",
        body: "Make the amplifier **loud and clean**: a gain of **at least 20** with **Clipping: none**.",
        widget: {
          type: "analog-amp",
          props: { gain: 5, biasPct: 50, vinMv: 50, vcc: 9 },
        },
        question: {
          type: "widget",
          goal: { clipping: "none", gainMin: 20 },
          hint: "More gain makes a bigger output swing. If the output hits the top or the floor, make the input smaller.",
        },
        explanation:
          "The output swing is gain × input. With a 9 V supply resting at 4.5 V there are about 4.3 V of room each way, so a gain of 20 is clean as long as the input stays under roughly 200 mV peak. Gain and room trade against each other: more of one means a smaller input before the output runs out of room.",
      },
      {
        kind: "explain",
        title: "Bias, small signals and gain",
        body: P(
          "A transistor only amplifies while it sits in the active region, so we first park it there with a steady DC voltage, the **bias**. The spot where it rests with no input is the **operating point** (or quiescent point). The signal we want to amplify is a **small signal**: a small wiggle riding on top of that DC level.",
          "The **gain** is how many times bigger the wiggle gets: **Av = Vout / Vin**, comparing the wiggles only (the steady DC level does not count). A stage that flips the wiggle upside down has a negative gain.",
          "Gains are often quoted in **decibels** (the same unit as the −3 dB of **Impedance and filters**). For a voltage ratio, **gain in dB = 20 × log₁₀(Av)**. A gain of ×10 is 20 dB, ×100 is 40 dB, and ×2 is about 6 dB.",
        ),
      },
      {
        kind: "question",
        title: "Gain in decibels",
        body: "A stage turns a **10 mV** peak input into a **1 V** peak output. What is its gain in decibels?",
        question: {
          type: "number",
          answer: 40,
          tolerance: 0.5,
          unit: "dB",
          hint: "First find the ratio Av = Vout / Vin, then take 20 × log₁₀ of it. log₁₀(100) is 2.",
        },
        explanation:
          "Av = 1 V / 10 mV = 100, and 20 × log₁₀(100) = 20 × 2 = **40 dB**. Every ×10 in voltage adds 20 dB, so ×100 is 40 dB.",
      },
      {
        kind: "explain",
        title: "A common-emitter stage",
        body: P(
          "The classic one-transistor amplifier is the **common-emitter** stage (its MOSFET twin is the common-source stage). In words: the supply feeds the collector through a **collector resistor RC**; the emitter goes to ground through an **emitter resistor RE**; two resistors form a voltage divider (see *The voltage divider and loading*) that sets the base's DC level; and a **coupling capacitor** sits at the input and another at the output.",
          "**Bias:** pick the divider so the collector rests at about **half the supply** (4.5 V on 9 V). Then the output has equal room to swing up and down.",
          "**Gain:** with an emitter resistor the gain is roughly **Av ≈ −RC / RE**. That is an approximation: the transistor's own tiny emitter resistance (roughly 25 mV divided by the emitter current, a room-temperature rule of thumb) adds to RE, so the real gain is a little lower. The minus sign means it **inverts**: when the input rises, more current flows, RC drops more voltage, and the collector falls.",
          "**Coupling capacitors:** a capacitor passes changes but blocks steady DC (**Capacitors: storing charge**). They let the signal in and out without disturbing the bias. With the resistors they also make a high-pass filter, so very slow signals are cut (**Impedance and filters**).",
        ),
      },
      {
        kind: "question",
        title: "Estimate the gain",
        body: "A common-emitter stage has **RC = 4.7 kΩ** and **RE = 470 Ω**. Using Av ≈ −RC / RE, what is its voltage gain? (The sign matters.)",
        question: {
          type: "number",
          answer: -10,
          tolerance: 0.5,
          hint: "Divide RC by RE, then remember the stage inverts, so the gain is negative.",
        },
        explanation:
          "4700 / 470 = 10, and the stage inverts, so **Av ≈ −10** (20 dB, upside down). The real gain is a bit smaller because of the transistor's own internal emitter resistance, but the resistor ratio gets you close, which is the point of adding RE.",
      },
      {
        kind: "explain",
        title: "Running out of room: clipping",
        body: P(
          "The output can never go above the supply or (much) below ground. Ask for more swing and the output **clips**: it goes flat.",
          "A flat **top**, at the supply voltage, means the transistor has turned **off** (cut off): no current, no drop across RC, so the collector sits at the supply. A flat **bottom** means it is turned fully **on** (saturated): the collector cannot fall below a few tenths of a volt (about 0.2 V in this sketch).",
          "That is why we bias near mid-supply. Push the bias off-centre and one side clips first. Clipping is **distortion**: the output no longer has the input's shape, and new frequencies appear. Try gain 30 with a big input, then slide the bias.",
        ),
        widget: {
          type: "analog-amp",
          props: { gain: 30, biasPct: 50, vinMv: 160, vcc: 9 },
        },
      },
      {
        kind: "question",
        title: "One side only",
        body: "Keep the gain and input as they are and move only the **bias** so that **only the bottom** clips and the top still fits.",
        widget: {
          type: "analog-amp",
          props: { gain: 10, biasPct: 50, vinMv: 150, vcc: 9 },
        },
        question: {
          type: "widget",
          goal: { clipping: "bottom" },
          hint: "The output rests at bias × supply. If the bias is low, which edge does the wiggle reach first?",
        },
        explanation:
          "A low bias parks the output close to the floor, so the downward swings run out of room (the transistor saturates) while the top still has plenty. A high bias would flatten the top instead. Mid-supply bias gives equal room both ways, so it is the best default.",
      },
      {
        kind: "question",
        title: "Read the flat top",
        body: "A common-emitter stage's output waveform is flattened at the **top**, exactly at the supply voltage. What is the transistor doing at the flat part?",
        question: {
          type: "choice",
          options: [
            "It is fully on (saturated), pulling the collector down",
            "It is fully off (cut off): no current flows, so RC drops no voltage",
            "It is working normally in the active region",
            "It has failed as a short circuit",
          ],
          answer: 1,
          hint: "A voltage at the supply means nothing is pulling the collector down.",
          feedback: {
            0: "Saturation flattens the bottom: the collector is pulled down toward ground, not up to the supply.",
            2: "In the active region the output follows the input, so it would not be flat.",
            3: "Nothing has failed. This is ordinary clipping, and it recovers when the signal comes back into range.",
          },
        },
        explanation:
          "At the supply voltage no current flows through RC, so it drops no voltage and the collector sits at the supply: the transistor is **cut off**. To fix it, shrink the input, lower the gain, or move the bias toward mid-supply.",
      },
      {
        kind: "recap",
        points: [
          "Between off and saturated a transistor is a **valve**: in the active region its output follows its input, so a small signal comes out bigger.",
          "**Bias** sets the operating point; the small signal is a wiggle on top. **Gain = Vout / Vin**, and in decibels **20 × log₁₀(Av)**.",
          "A common-emitter stage inverts and has a gain of roughly **−RC / RE** (an approximation); coupling capacitors pass the signal and block the DC.",
          "Bias near **mid-supply** so the output can swing both ways; a flat top is cut-off, a flat bottom is saturation, and both are **distortion**.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 9. Op-amps ───────────────────────────────
  {
    id: "fnd-analog-9-op-amps",
    title: "Op-amps",
    summary:
      "A huge-gain difference amplifier tamed with feedback: the two golden rules, inverting and non-inverting amplifiers, the buffer, the comparator and the real limits.",
    level: "Advanced",
    minutes: 11,
    xp: 75,
    steps: [
      {
        kind: "explain",
        title: "A very high gain amplifier",
        body: P(
          "An **operational amplifier** (op-amp) is a small chip with two inputs and one output. The **+** input is the *non-inverting* one and the **−** input is the *inverting* one. The op-amp amplifies only the **difference** between them: **Vout = A × (V+ − V−)**.",
          "The **open-loop gain** A is enormous: typically around 100,000 to 1,000,000 at DC for a general-purpose part (a typical figure; it varies a lot). A difference of just 1 mV would ask for 100 V or more. No supply can give that, so the output slams into the limit of its supply.",
          "With **no feedback** (open loop) an op-amp is therefore a **comparator**: it says which input is higher, and the output sits near the positive or negative limit. Move the input across the reference.",
        ),
        widget: {
          type: "analog-opamp",
          props: {
            mode: "comparator",
            modes: ["comparator"],
            vin: -0.5,
            vref: 0,
            hideInputType: true,
          },
        },
      },
      {
        kind: "question",
        title: "A millivolt apart",
        body: "Open loop, with **±5 V** supplies and A = 100,000: V+ = 1.001 V and V− = 1.000 V. What does the output do?",
        question: {
          type: "choice",
          options: [
            "It outputs +100 V (1 mV × 100,000)",
            "It outputs 1 mV, the difference",
            "It goes to its positive limit, a little under +5 V",
            "It stays at 0 V because the inputs are almost equal",
          ],
          answer: 2,
          hint: "The formula asks for far more voltage than the supply has. What happens to an output that cannot reach the voltage it wants?",
          feedback: {
            0: "The formula does ask for 100 V, but the output cannot exceed its supply, so it stops at the limit instead.",
            1: "That would be a gain of 1. The op-amp multiplies the difference by A, which is huge.",
            3: "Open loop, even a tiny difference is multiplied by A. Only feedback can hold the output near zero.",
          },
        },
        explanation:
          "Vout = A × 1 mV would be 100 V, which the ±5 V supply cannot deliver, so the output stops at its positive limit. Swap the inputs and it would go to the negative limit. That is a comparator. The trick that makes op-amps useful as *amplifiers* is to give them feedback.",
      },
      {
        kind: "explain",
        title: "Feedback and the two golden rules",
        body: P(
          "Connect part of the output back to the **−** input. This is **negative feedback**: if the output climbs too high, the − input rises with it, which shrinks V+ − V−, which pulls the output back down. The output settles where the difference is almost zero.",
          "That gives two **golden rules** that work for op-amp circuits **only with negative feedback, while the output is inside its limits, and below the frequencies where the gain runs out**:",
          "1. The output does whatever it takes to make **V− = V+**.\n2. **No current flows into** either input (their input impedance is very high).",
          "Use them on the **inverting amplifier**: the input goes through **Rin** to the − input, **Rf** connects the output back to it, and + is grounded. By rule 1, V− = 0 V (a *virtual ground*). So Rin carries Vin / Rin. By rule 2 all of that current must go through Rf, so Vout = −Rf × (Vin / Rin). The gain is **−Rf / Rin**, and the source sees an input resistance of Rin.",
        ),
        widget: {
          type: "analog-opamp",
          props: {
            mode: "inverting",
            modes: ["inverting"],
            rf: 10000,
            rin: 10000,
            vin: 0.5,
            hideSupply: true,
            hideInputType: true,
          },
        },
      },
      {
        kind: "question",
        title: "Gain of −10",
        body: "Set **Rf** and **Rin** so the inverting amplifier has a gain of **−10**.",
        widget: {
          type: "analog-opamp",
          props: {
            mode: "inverting",
            modes: ["inverting"],
            rf: 10000,
            rin: 10000,
            vin: 0.2,
            hideSupply: true,
            hideInputType: true,
          },
        },
        question: {
          type: "widget",
          goal: { mode: "inverting", gain: -10, tol: 0.01 },
          hint: "The gain is −Rf / Rin, so Rf must be ten times Rin.",
        },
        explanation:
          "Gain = −Rf / Rin, so any pair with Rf = 10 × Rin works: 100 kΩ and 10 kΩ, 47 kΩ and 4.7 kΩ, 10 kΩ and 1 kΩ. Only the **ratio** matters, but the values should still be sensible: Rin also sets the input resistance the source sees, and very large resistors pick up noise.",
      },
      {
        kind: "explain",
        title: "Non-inverting amplifier and buffer",
        body: P(
          "Feed the signal to the **+** input instead, and let a divider of **Rf** (from the output) and **Rg** (to ground) set the − input. Rule 1 says V− = Vin, and V− is the divider's output, Vout × Rg / (Rg + Rf). Solve and you get **gain = 1 + Rf / Rg**: never below 1, and not inverted. The signal goes into the + input, so by rule 2 it draws almost no current.",
          "Take it to the extreme (Rf = 0, no Rg) and the output is wired straight to the − input. The gain is exactly **1**: a **buffer**, or voltage follower. It copies the voltage but can supply real current. That matters when a source cannot be loaded, such as a voltage divider or a sensor: in *The voltage divider and loading* a load pulled the divider's output down, but a buffer's input draws almost nothing, so the divider keeps its voltage.",
          "Switch between the modes and watch the output, V− and V+.",
        ),
        widget: {
          type: "analog-opamp",
          props: {
            mode: "noninv",
            modes: ["noninv", "buffer", "inverting"],
            rf: 10000,
            rin: 10000,
            vin: 0.5,
            hideSupply: true,
            hideInputType: true,
          },
        },
      },
      {
        kind: "question",
        title: "Gain of +11",
        body: "Build a **non-inverting** amplifier with a gain of **+11**.",
        widget: {
          type: "analog-opamp",
          props: {
            mode: "noninv",
            modes: ["noninv", "buffer", "inverting"],
            rf: 10000,
            rin: 10000,
            vin: 0.2,
            hideSupply: true,
            hideInputType: true,
          },
        },
        question: {
          type: "widget",
          goal: { mode: "noninv", gain: 11, tol: 0.01 },
          hint: "The gain is 1 + Rf / Rg. What ratio Rf / Rg gives 11?",
        },
        explanation:
          "1 + Rf / Rg = 11 means Rf / Rg = 10, for example 10 kΩ and 1 kΩ. Notice the extra 1: a non-inverting amplifier can never have a gain below 1, while an inverting one can attenuate with Rf smaller than Rin.",
      },
      {
        kind: "question",
        title: "Hitting the rails",
        body: P(
          "The golden rules only hold while the output can reach the voltage they ask for. A real op-amp's output cannot go all the way to its supply rails: general-purpose parts typically stop about 1 to 2 V short of each rail, while **rail-to-rail** output parts get within roughly 0.1 V (typical figures; check the datasheet).",
          "Ask for more and the output goes flat at its limit, and then V− no longer equals V+: the rules have stopped working. Make the output **hit its limit** in this ±5 V circuit.",
        ),
        widget: {
          type: "analog-opamp",
          props: {
            mode: "inverting",
            modes: ["inverting", "noninv", "buffer"],
            rf: 100000,
            rin: 10000,
            vin: 0.2,
            rails: "pm5",
            hideInputType: false,
          },
        },
        question: {
          type: "widget",
          goal: { clipped: true },
          hint: "With a gain of −10, how large can Vin be before −10 × Vin passes the limit of about 3.5 V?",
        },
        explanation:
          "With ±5 V supplies and a typical non-rail-to-rail output (limit about 3.5 V), a gain of −10 clips as soon as |Vin| passes 0.35 V. Turn on **Rail-to-rail output** and the limit moves out to about 4.9 V. Either way, when the output is stuck, V− and V+ differ and the circuit is no longer 'ideal'.",
      },
      {
        kind: "question",
        title: "Bandwidth runs out too",
        body: P(
          "Gain falls with frequency. For the common kind of op-amp, **closed-loop gain × usable bandwidth ≈ constant**: the **gain-bandwidth product** (GBW). A part with a 1 MHz GBW (a typical figure for a basic general-purpose op-amp) amplifying by 100 only works up to about 10 kHz.",
          "Two more real limits: the **slew rate** is how fast the output can change (V/µs), so large fast signals turn into triangles; the **input offset voltage** (typically millivolts or less) is a small built-in error that the gain amplifies too.",
          "An op-amp has a GBW of **1 MHz**. Roughly what bandwidth does a gain of **50** leave you?",
        ),
        question: {
          type: "number",
          answer: 20,
          tolerance: 1,
          unit: "kHz",
          hint: "Bandwidth ≈ GBW divided by the closed-loop gain.",
        },
        explanation:
          "1 MHz / 50 = **20 kHz**. Need a gain of 50 over a wider band? Choose an op-amp with a bigger GBW, or split the gain over two stages.",
      },
      {
        kind: "code",
        title: "Inverting gain",
        body: P(
          "Write `inverting_gain(rf, rin)` that returns the closed-loop gain of an inverting amplifier from the golden rules. Resistances are in ohms.",
          "Remember the sign: the output is upside down compared with the input.",
        ),
        language: "python",
        starter: `def inverting_gain(rf, rin):
    # gain of an inverting op-amp amplifier
    return 0
`,
        solution: `def inverting_gain(rf, rin):
    return -rf / rin
`,
        tests: [
          {
            id: "ten",
            description: "100 kΩ over 10 kΩ gives −10",
            assertionCode: `assert inverting_gain(100000, 10000) == -10, f"expected -10, got {inverting_gain(100000, 10000)}"`,
          },
          {
            id: "e12",
            description: "47 kΩ over 4.7 kΩ gives about −10",
            assertionCode: `assert abs(inverting_gain(47000, 4700) - (-10)) < 1e-9, f"expected -10, got {inverting_gain(47000, 4700)}"`,
          },
          {
            id: "unity",
            description: "equal resistors give −1 (inversion, no gain)",
            assertionCode: `assert inverting_gain(22000, 22000) == -1, f"expected -1, got {inverting_gain(22000, 22000)}"`,
          },
        ],
        hints: [
          "By rule 1 V− is 0, so the input current is Vin / Rin. By rule 2 it all flows through Rf.",
          "Vout / Vin = −Rf / Rin.",
        ],
      },
      {
        kind: "recap",
        points: [
          "An op-amp amplifies the difference **V+ − V−** by a huge open-loop gain A (typically 10⁵ to 10⁶ at DC); open loop it is a **comparator** that slams to a rail.",
          "With **negative feedback**, and while the output is inside its limits: the output makes **V− = V+**, and **no current enters the inputs**.",
          "**Inverting** gain is **−Rf / Rin**; **non-inverting** is **1 + Rf / Rg**; a **buffer** has gain 1 and shields a source from loading.",
          "Real parts stop short of the rails (rail-to-rail ones get close), and **GBW** (gain × bandwidth), **slew rate** and **offset** set what they can do.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 10. From analog to digital and back ───────────────────────────────
  {
    id: "fnd-analog-10-adc-dac",
    title: "From analog to digital and back",
    summary:
      "Sampling, Nyquist and aliasing, quantisation and resolution, the main ADC and DAC types, and how engineers check all this with SPICE and an oscilloscope.",
    level: "Professional",
    minutes: 12,
    xp: 90,
    steps: [
      {
        kind: "explain",
        title: "Turning a wave into numbers",
        body: P(
          "A computer only works with numbers, but a sensor gives a smooth voltage. An **analog-to-digital converter** (ADC) bridges the two: it measures the voltage at regular instants, called **samples**, and rounds each to a whole number. How often it samples is the **sample rate fs**, in samples per second (hertz).",
          "In the picture, the orange line is the real signal, the dots are what the ADC measured, and the blue steps are what a computer would hold between samples. Drag the sliders and watch the dots follow (or fail to follow) the wave.",
        ),
        widget: {
          type: "analog-adc",
          props: { f: 1000, fs: 8000, bits: 4, vref: 3.3 },
        },
      },
      {
        kind: "question",
        title: "A false tone",
        body: "Make the ADC **report a false tone of 1 kHz**: choose an input frequency and sample rate so that **Aliasing** happens and the ADC sees **1000 Hz**.",
        widget: {
          type: "analog-adc",
          props: { f: 1000, fs: 8000, bits: 8, vref: 3.3 },
        },
        question: {
          type: "widget",
          goal: { aliased: true, aliasF: 1000, tol: 1 },
          hint: "Aliasing needs the input to be above half the sample rate. Then the ADC reports |f − fs| (the distance to the nearest multiple of fs).",
        },
        explanation:
          "Take f = 3 kHz and fs = 4 kHz: 3 kHz is above fs/2 = 2 kHz, so the samples are exactly those of a |3000 − 4000| = **1000 Hz** wave. Nothing in the numbers says which tone it was. This is **aliasing**: a frequency above fs/2 shows up as a false lower one.",
      },
      {
        kind: "question",
        title: "Nyquist and the anti-alias filter",
        body: P(
          "The rule is **Nyquist**: to capture a frequency f you must sample at **more than 2f** (fs > 2f, strictly). At exactly 2f the samples can land on the zero crossings and the tone vanishes; set f = 1000 Hz and fs = 2000 Hz to see it. Anything above **fs/2** aliases.",
          "The cure is an **anti-alias filter**: a low-pass filter (**Impedance and filters**) in front of the ADC that removes what the sampler cannot capture. Real filters roll off gradually, so designers sample comfortably above 2× the top frequency. The switch below is an *ideal* brick-wall filter.",
          "Audio goes up to about 20 kHz. Which sample rate satisfies Nyquist for the whole range?",
        ),
        widget: {
          type: "analog-adc",
          props: { f: 3000, fs: 4000, bits: 8, vref: 3.3, filter: true },
          live: true,
        },
        question: {
          type: "choice",
          options: [
            "20 kHz, the same as the top frequency",
            "Exactly 40 kHz",
            "30 kHz",
            "More than 40 kHz, such as 44.1 kHz",
          ],
          answer: 3,
          hint: "Nyquist says fs must be strictly greater than twice the highest frequency.",
          feedback: {
            0: "At 20 kHz only the very top of the band is sampled once per cycle. You need more than two samples per cycle of the fastest tone.",
            1: "Exactly 2f is the edge case: the samples can land on zero crossings. Nyquist needs strictly more than 2f.",
            2: "30 kHz is below 2 × 20 kHz, so tones above 15 kHz would alias.",
          },
        },
        explanation:
          "More than 40 kHz. In practice the rate is a bit higher so the anti-alias filter has room to roll off: audio CDs use 44.1 kHz, many digital audio systems use 48 kHz.",
      },
      {
        kind: "question",
        title: "Bits and steps",
        body: P(
          "After sampling, the ADC rounds each voltage to one of **2ⁿ levels** (n = the number of **bits**). One step is the **LSB** (least significant bit): **LSB = Vref / 2ⁿ**, where **Vref** is the voltage that counts as full scale. Rounding leaves a **quantisation error** of up to ±½ LSB. Example: 3.3 V and 12 bits give 3.3 / 4096 ≈ 0.806 mV.",
          "Each extra bit doubles the levels, halves the LSB and adds about 6 dB of ideal signal-to-noise ratio: **SNR ≈ 6.02 × n + 1.76 dB**, for a full-scale sine wave with only quantisation noise (an assumption, real converters are worse).",
          "With **Vref = 3.3 V**, choose enough bits so that **one step is smaller than 1 mV**.",
        ),
        widget: {
          type: "analog-adc",
          props: { f: 500, fs: 20000, bits: 6, vref: 3.3, lockVref: true },
        },
        question: {
          type: "widget",
          goal: { lsbMax: 0.001, vref: 3.3 },
          hint: "Each extra bit halves the step. Keep adding bits until the LSB readout drops under 1 mV.",
        },
        explanation:
          "3.3 V / 2¹¹ = 1.61 mV is still too big, while 3.3 V / 2¹² = **0.806 mV** is under 1 mV. So 12 bits. That is also why 12-bit ADCs are common on microcontrollers: millivolt resolution at 3.3 V.",
      },
      {
        kind: "explain",
        title: "ADC and DAC types",
        body: P(
          "**ADC types** (typical, not exact):",
          "- **SAR** (successive approximation): a binary search with one comparator, n steps per sample. Compact, moderate speed, 8 to 18 bits. The usual ADC inside a microcontroller.\n- **Sigma-delta**: samples very fast with few bits, then filters digitally. Very high resolution (16 to 24 bits) but a slower output rate. Audio and precision measurement.\n- **Flash**: 2ⁿ − 1 comparators in parallel. Extremely fast, but power-hungry and usually only ~6 to 8 bits.\n- **Pipelined**: stages each resolve a few bits. Fast with decent resolution (video, radio), at the cost of a few clock cycles of delay.",
          "**Going back**: a **DAC** (digital-to-analog converter) turns a number into a voltage. An **R-2R ladder** uses only two resistor values to build binary-weighted voltages. A cheap trick is **PWM plus an RC filter**: a fast on/off signal whose duty cycle is the wanted fraction of the supply, smoothed by a low-pass filter (**Impedance and filters**) into a steady voltage. The DAC's raw output is a staircase, so a **reconstruction filter** smooths it and removes the images above fs/2, the mirror image of the anti-alias filter.",
        ),
      },
      {
        kind: "question",
        title: "Which converter?",
        body: "A battery-powered sensor board reads a slowly changing temperature with the **ADC built into its microcontroller** at 12 bits. Which type is that most likely to be?",
        question: {
          type: "choice",
          options: [
            "SAR: compact and frugal, with a good balance of speed and resolution",
            "Flash: a comparator for every level, for the best resolution",
            "Sigma-delta: the fastest type, for video",
            "A DAC: it converts digital back to analog",
          ],
          answer: 0,
          hint: "Think about what is cheap in silicon area and power, and what a slow signal needs.",
          feedback: {
            1: "Flash needs 2ⁿ − 1 comparators, so 12 bits would be enormous and power-hungry. Flash is for speed at low resolution.",
            2: "Sigma-delta shines at high resolution and low speed, not video speed, and it is less common as a general MCU ADC.",
            3: "A DAC goes the other way, from a number to a voltage. Reading a sensor needs an ADC.",
          },
        },
        explanation:
          "Microcontrollers mostly use a **SAR ADC**: one comparator and some capacitors do a binary search, so it is small, cheap and low-power, and 12 bits at hundreds of kilosamples per second is plenty for temperature.",
      },
      {
        kind: "code",
        title: "Write a quantiser",
        body: P(
          "Write `quantise(v, vref, bits)` that returns the integer **code** an ideal ADC produces. The convention: `code = int(v / vref * 2**bits)` (rounding down), then **clamp** it to the valid range `0 … 2**bits − 1`. A voltage at or above `vref` gives the top code, and a negative voltage gives 0.",
          "Worked example: `quantise(1.0, 2.0, 8)` is `int(0.5 * 256) = 128`.",
        ),
        language: "python",
        starter: `def quantise(v, vref, bits):
    # integer code from 0 to 2**bits - 1
    return -1
`,
        solution: `def quantise(v, vref, bits):
    code = int(v / vref * 2**bits)
    return max(0, min(code, 2**bits - 1))
`,
        tests: [
          {
            id: "half",
            description: "half of full scale at 8 bits is code 128",
            assertionCode: `assert quantise(1.0, 2.0, 8) == 128, f"expected 128, got {quantise(1.0, 2.0, 8)}"`,
          },
          {
            id: "floor",
            description: "0.999 of 1 V at 2 bits rounds down to 3",
            assertionCode: `assert quantise(0.999, 1.0, 2) == 3, f"expected 3, got {quantise(0.999, 1.0, 2)}"`,
          },
          {
            id: "top",
            description: "full scale clamps to the top code, not 4096",
            assertionCode: `assert quantise(3.3, 3.3, 12) == 4095, f"expected 4095, got {quantise(3.3, 3.3, 12)}"`,
          },
          {
            id: "over",
            description: "an over-range input clamps to 255",
            assertionCode: `assert quantise(5.0, 3.3, 8) == 255, f"expected 255, got {quantise(5.0, 3.3, 8)}"`,
          },
          {
            id: "neg",
            description: "a negative voltage clamps to 0",
            assertionCode: `assert quantise(-0.5, 3.3, 10) == 0, f"expected 0, got {quantise(-0.5, 3.3, 10)}"`,
          },
        ],
        hints: [
          "Scale the voltage to a fraction of full scale, multiply by 2**bits, and take int().",
          "Clamp with max(0, min(code, 2**bits - 1)).",
        ],
      },
      {
        kind: "explain",
        title: "In practice: simulate, build, measure",
        body: P(
          "Engineers rarely build an analog circuit first. They **simulate** it. **SPICE** simulators solve the circuit's equations over time and over frequency. **ngspice** (free, open source), **LTspice** (free, from Analog Devices) and the simulator built into **KiCad** (which uses ngspice) are examples. Free tools are enough to learn on. A simulation is only as good as the part models behind it, and it will not warn you about layout noise.",
          "Then you **measure** the real thing with an **oscilloscope**. A scope is itself an ADC, so *its* Nyquist limit and its analog **bandwidth** matter: a common rule of thumb is a scope bandwidth several times the highest frequency you care about, and a sample rate well above 2× that. Entry-level scopes cost roughly a few hundred USD/EUR; faster ones cost a lot more.",
          "On the datasheet of a converter, look beyond the bit count: **ENOB** (effective number of bits) says how many bits are real after noise and distortion, **INL** (integral nonlinearity) says how far the transfer curve strays from a straight line, and **DNL** (differential nonlinearity) says how far each step's size is from one ideal LSB. A 16-bit ADC with an ENOB of 12 behaves like a 12-bit one.",
        ),
      },
      {
        kind: "question",
        title: "A sensible workflow",
        body: "Put these steps of designing an ADC input stage in a sensible order.",
        question: {
          type: "order",
          items: [
            "Write down the requirements: signal range, highest frequency, resolution",
            "Pick a converter by its datasheet numbers (sample rate, ENOB, input range)",
            "Simulate the anti-alias filter and input stage in SPICE",
            "Build a prototype",
            "Measure with an oscilloscope and compare with the simulation",
          ],
          hint: "Decide what you need first, and measure last, after something exists.",
        },
        explanation:
          "Requirements first, because they decide the sample rate, filter and bits. Then a part that can deliver them, a cheap simulation to catch mistakes, a prototype, and finally measurements that either confirm the simulation or show what it missed (noise, layout, the scope's own limits).",
      },
      {
        kind: "recap",
        points: [
          "An ADC **samples** at fs and rounds to **2ⁿ levels**; one step is **LSB = Vref / 2ⁿ** (3.3 V and 12 bits is about 0.806 mV) with an error of up to ±½ LSB, and ideal SNR ≈ 6.02 n + 1.76 dB for a full-scale sine.",
          "**Nyquist:** sample at **more than 2f**. A tone above fs/2 **aliases** to |f − k·fs|, so put an **anti-alias low-pass filter** before the ADC.",
          "Common ADCs: **SAR** (microcontrollers), **sigma-delta** (audio, precision), **flash** (very fast), **pipelined**. A DAC can be an **R-2R ladder** or **PWM + RC**, followed by a **reconstruction filter**.",
          "In practice: simulate in **SPICE** (ngspice, LTspice, KiCad), measure with a scope mindful of its own bandwidth and sample rate, and read **ENOB, INL and DNL** on datasheets.",
        ],
      },
    ],
  },
];
