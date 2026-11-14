import type { ConceptLesson } from "../../learn/types.ts";

/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 1 to 4 of "Components in action": capacitors, diodes and LEDs, inductors, alternating current. */
export const analogLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. Capacitors: storing charge ───────────────────────────────
  {
    id: "fnd-analog-1-capacitors",
    title: "Capacitors: storing charge",
    summary: "A capacitor is a small store of charge. Q = CV, how a resistor sets the filling speed, and the time constant τ = RC.",
    level: "Beginner",
    minutes: 9,
    xp: 45,
    steps: [
      {
        kind: "explain",
        title: "A tank with a rubber wall",
        body: P(
          "A **capacitor** is two metal plates with a thin insulator between them. Connect it to a battery and one plate collects extra electrons (the **−** plate) while the other loses the same number (the **+** plate). The capacitor now holds **charge**, ready to give it back later.",
          "Picture a water tank split in two by a stretchy rubber wall. Push water into one side and the wall bulges, squeezing water out of the other side. No water ever goes *through* the wall, yet water flows in and out of the tank for a while. A bigger tank (more rubber) holds more water for the same push.",
          "The analogy breaks in two places. First, a real capacitor holds no net charge: the + plate has exactly as much extra as the − plate is missing, so what it stores is a *difference*. Second, the rubber wall can burst if you push too hard. A capacitor has a **voltage rating**, and past it the insulator breaks down and the part is damaged.",
          "**Capacitance** C says how much charge it holds per volt. It is measured in **farads (F)**, but a farad is huge, so parts are marked in **µF** (millionths of a farad) and **nF** (billionths). The rule is **Q = C × V**: charge Q in coulombs, C in farads, V in volts. Press **Charge** below and drag the cursor to watch the voltage rise and **Q** grow with it.",
        ),
        widget: { type: "analog-rc", props: { r: 10000, c: 10e-6, hideTable: true } },
      },
      {
        kind: "question",
        title: "How much charge?",
        body: "A **100 µF** capacitor is charged to **5 V**. How much charge does it hold, in **µC** (microcoulombs)? Use Q = C × V.",
        question: {
          type: "number",
          answer: 500,
          tolerance: 1,
          unit: "µC",
          hint: "100 µF × 5 V. The prefix works out neatly: µF times volts gives µC.",
        },
        explanation: "Q = C × V = 100 µF × 5 V = **500 µC**. Double the voltage and it stores double the charge; use a 200 µF part instead and, again, double. A capacitor that big is small by power-supply standards, yet it can briefly deliver a large current.",
      },
      {
        kind: "explain",
        title: "Filling through a resistor",
        body: P(
          "Now put a **resistor** in the path, as in the circuit above. In *Ohm's law* you saw that the current through a resistor is I = V ÷ R. At the instant you close the switch the capacitor is empty, so the whole battery voltage sits across the resistor and the current is at its biggest: I = V ÷ R.",
          "As charge piles up, the capacitor's own voltage rises and pushes back. The resistor now sees *less* voltage, so the current drops, so the capacitor fills more slowly. The result is not a straight line but a curve that quickly rises, then eases off.",
          "How fast depends on one number, the **time constant** **τ = R × C** (τ is the Greek letter tau). With R in ohms and C in farads, τ comes out in **seconds**. After **one τ** the capacitor has reached **63.2%** of the supply voltage, after **2τ** it is at **86.5%**. A bigger R or a bigger C means a bigger τ and a slower curve. Try both sliders.",
        ),
        widget: { type: "analog-rc", props: { r: 10000, c: 10e-6 }, live: true },
      },
      {
        kind: "question",
        title: "One time constant in",
        body: "A **5 V** supply starts charging an empty capacitor through a resistor. Exactly one time constant (**1τ**) after the switch closes, about what voltage is across the capacitor?",
        widget: { type: "analog-rc", props: { r: 10000, c: 10e-6, mode: "charge" }, after: true },
        question: {
          type: "choice",
          options: ["5.0 V, completely full", "2.5 V, exactly half", "3.2 V, about 63% of 5 V", "4.3 V, about 86% of 5 V"],
          answer: 2,
          hint: "The capacitor never reaches full in a finite time. After one τ it has covered a bit less than two thirds of the way.",
          feedback: {
            0: "It never gets exactly full: the closer it gets, the less voltage is left across the resistor to push charge in.",
            1: "Half would be a straight line. The curve is steeper at the start, so it is already past half at 1τ.",
            3: "That is where it is after 2τ (86.5%), not 1τ.",
          },
        },
        explanation: "After 1τ the capacitor has covered **63.2%** of the way: 0.632 × 5 V ≈ 3.16 V. After 2τ it covers 86.5% of the *remaining* gap again, and so on. The curve is the same shape whatever R, C and supply you pick. Only the time scale changes.",
      },
      {
        kind: "question",
        title: "Set the clock to 100 ms",
        body: "Set **R and C** so the time constant is about **100 ms** (0.1 s), within 5%.",
        widget: { type: "analog-rc", props: { r: 10000, c: 1e-6 } },
        question: { type: "widget", goal: { tau: 0.1, tol: 0.05 }, hint: "τ = R × C. 10 kΩ × 10 µF is one pair that works. There are others." },
        explanation: "τ = R × C. 10 kΩ × 10 µF = 10 000 Ω × 0.000 01 F = 0.1 s, and so do 1 kΩ × 100 µF and the nearby 4.7 kΩ × 22 µF. Circuits like timers and delays pick R and C exactly this way: choose the time you want, then split it into a convenient pair.",
      },
      {
        kind: "explain",
        title: "Discharging, and when it is \"full\"",
        body: P(
          "Move the switch to **Discharge** and the capacitor empties through the resistor. It is the same curve upside down: the voltage starts at its full value and, after **one τ**, has fallen to **36.8%** (that is, 100% − 63.2%). After 2τ it is down to 13.5%.",
          "In theory the exponential curve never quite arrives. In practice we call the capacitor **essentially full (or empty) after 5τ**: it has reached **99.3%** of the way, only 0.7% short. That is why \"wait five time constants\" is the engineer's rule of thumb, never \"wait exactly one\".",
          "**Safety:** a big capacitor can stay charged after the power is off, such as in a power supply or a camera flash. The charge can hurt, and shorting it with a screwdriver makes sparks. Discharge it through a resistor, as here, never with a bare wire.",
        ),
        widget: { type: "analog-rc", props: { r: 10000, c: 10e-6, mode: "discharge" }, live: true },
      },
      {
        kind: "question",
        title: "How long to wait?",
        body: "A circuit uses **R = 10 kΩ** and **C = 47 µF**. How many **seconds** until the capacitor is essentially full, taken as **5τ**?",
        question: {
          type: "number",
          answer: 2.35,
          tolerance: 0.05,
          unit: "s",
          hint: "First find τ = R × C in seconds (10 000 Ω × 0.000 047 F). Then multiply by 5.",
        },
        explanation: "τ = 10 000 Ω × 47 µF = 0.47 s, so 5τ = **2.35 s**. At that moment the capacitor is at 99.3% of the supply. The ideal curve never reaches exactly 100%, so 5τ is a practical stopping point, not a magic one.",
      },
      {
        kind: "code",
        title: "Write the charging curve",
        body: P(
          "Charging from empty, the voltage across the capacitor at time t is **v × (1 − e^(−t ÷ RC))**.",
          "Write `rc_voltage(v, r, c, t)` that returns this voltage. Use `math.exp` for e raised to a power. `r` is in ohms, `c` in farads and `t` in seconds.",
        ),
        language: "python",
        starter: `import math

def rc_voltage(v, r, c, t):
    # voltage across a charging capacitor after t seconds
    return v
`,
        solution: `import math

def rc_voltage(v, r, c, t):
    return v * (1 - math.exp(-t / (r * c)))
`,
        tests: [
          { id: "tau", description: "After exactly one time constant it is at 63.2% of the supply", assertionCode: `assert abs(rc_voltage(5, 1000, 1e-6, 1e-3) - 3.1606) < 0.001, f"at t = RC expected about 3.16, got {rc_voltage(5, 1000, 1e-6, 1e-3)}"` },
          { id: "start", description: "At t = 0 the capacitor is empty", assertionCode: `assert abs(rc_voltage(9, 10000, 1e-5, 0)) < 1e-9, f"at t = 0 expected 0, got {rc_voltage(9, 10000, 1e-5, 0)}"` },
          { id: "five", description: "After 5τ it is at about 99.3%", assertionCode: `assert abs(rc_voltage(5, 1000, 1e-6, 5e-3) - 4.9663) < 0.001, f"at 5 time constants expected about 4.966, got {rc_voltage(5, 1000, 1e-6, 5e-3)}"` },
        ],
        hints: ["math.exp(x) is e raised to the power x. The exponent is negative: -t / (r * c).", "At t = 0 the exponential is 1, so (1 - 1) = 0 and the voltage is 0."],
      },
      {
        kind: "recap",
        points: [
          "A **capacitor** stores charge on two plates: **Q = C × V**, with C in farads (usually µF or nF). Its voltage rating is a hard limit.",
          "Through a resistor it charges on a curve: fast at first, then slower, because the resistor sees less and less voltage.",
          "The **time constant τ = R × C** sets the speed. After 1τ a charging capacitor is at **63.2%**, after 2τ at 86.5% and after **5τ** at about **99.3%**. A discharging one is at **36.8%** after 1τ.",
          "The ideal curve never reaches exactly full or empty, so \"five time constants\" is the practical rule. Big capacitors can hold a shock after power-off: discharge them through a resistor. One everyday job: a small ceramic beside each chip's supply pin (**decoupling**, 100 nF per pin is a common starting point) hands the chip quick gulps of charge; see *Power and ground* in the PCB module.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Diodes and LEDs ───────────────────────────────
  {
    id: "fnd-analog-2-diodes-leds",
    title: "Diodes and LEDs",
    summary: "The one-way valve of electronics: the forward drop, which way round it goes, and how to choose the resistor that keeps an LED alive.",
    level: "Beginner",
    minutes: 9,
    xp: 45,
    steps: [
      {
        kind: "explain",
        title: "A one-way valve",
        body: P(
          "A **diode** lets current flow one way and blocks it the other. Think of a **check valve** in a water pipe: push forward and it opens, push backward and it slams shut.",
          "The two ends have names. Current goes in at the **anode** and out at the **cathode**. On the symbol the triangle points the way current flows and the bar is the cathode. On the real part a **band** or stripe marks the cathode end. (On a typical LED the longer leg is the anode, but trimmed legs fool you, so look for the flat edge on the lens or check with the datasheet.)",
          "An **LED** (light-emitting diode) is a diode that also gives off light when current flows forward through it. Below is a battery, a resistor and an LED. Press **Flip the LED** and watch what happens when it faces the wrong way.",
        ),
        widget: { type: "analog-led", props: { vs: 5, colour: "red", r: 330, lock: ["vs", "colour", "r"] }, live: true },
      },
      {
        kind: "question",
        title: "Block the current",
        body: "Turn the LED **backwards** so that no current flows and it goes dark.",
        widget: { type: "analog-led", props: { vs: 5, colour: "red", r: 330, lock: ["vs", "colour", "r"] } },
        question: { type: "widget", goal: { reversed: true, lit: false }, hint: "Use the Flip the LED button. The triangle should point against the battery's push." },
        explanation: "A diode that faces the wrong way is **reverse biased**, and it blocks. That is its whole job in a power supply: it stops current flowing backwards. The valve analogy breaks in one place: a real diode only blocks up to a limit. Push too hard in reverse and it **breaks down** (a small LED usually gives up at about 5 V, typical), and the part is usually ruined.",
      },
      {
        kind: "explain",
        title: "The forward drop",
        body: P(
          "A check valve needs a small push to open, and so does a diode. A silicon diode needs about **0.6 to 0.7 V** (typical) across it before it conducts. That is its **forward voltage drop (Vf)**, and while it conducts, the voltage across it stays close to that number.",
          "LEDs need more, and the amount depends on the colour. Typical values: **red about 1.8 to 2.2 V**, **green about 2.0 to 3.2 V** depending on the type, **blue and white about 2.8 to 3.3 V**. Treat them as typical, since real parts vary: the datasheet has the real number.",
          "So a supply *below* the LED's drop lights nothing. Pick a **blue LED on 3.3 V** and then a **red LED on 3.3 V**, and compare. Then switch to a **red LED on 12 V** and read the warning (the next steps explain why).",
        ),
        widget: { type: "analog-led", props: { vs: 3.3, colour: "blue", r: 330, lock: ["r"] }, live: true },
      },
      {
        kind: "question",
        title: "A single AA cell",
        body: "A white LED has a typical forward drop of about **3.1 V**. You connect it, the right way round, to one **1.5 V** AA cell (no resistor needed at this voltage). What happens?",
        question: {
          type: "choice",
          options: ["It glows dimly: less voltage just means less brightness", "It stays dark: 1.5 V is below the voltage it needs before it conducts", "It glows at full brightness: LEDs only need a tiny current", "It lights only if you flip it around"],
          answer: 1,
          hint: "Think about the valve: it needs a minimum push before it opens at all.",
          feedback: {
            0: "Below the forward drop there is no gradual dimming in our model: it simply does not conduct. (Real LEDs glow a very faint bit below Vf, nothing you would call light.)",
            2: "The current is what lights it, and there is no current until the supply is above the drop. 1.5 V is far short of 3.1 V.",
            3: "Backwards makes it worse: a reverse-biased diode blocks completely.",
          },
        },
        explanation: "The voltage has to beat the **forward drop** before anything flows, and 1.5 V is only about half of what a white LED needs. That is why white and blue LED torches use two or three cells in series, or a small circuit that boosts the voltage.",
      },
      {
        kind: "explain",
        title: "Choosing the resistor",
        body: P(
          "Above Vf the current rises *very* steeply with a tiny extra voltage. Connect an LED straight across a battery and it draws as much as the battery can give, far beyond what it can take. It overheats and dies in a flash, and the battery is nearly short-circuited. So an LED always gets a **series resistor** to set the current.",
          "The resistor carries the leftover voltage, **Vs − Vf**, and Ohm's law (the circuits lesson *Ohm's law*) gives its size for a wanted current I:",
          "**R = (Vs − Vf) ÷ I**",
          "A typical indicator LED runs at about **5 to 20 mA** (typical; small 3 mm and 5 mm LEDs are often rated 20 mA continuous, but check the datasheet). Example: 5 V supply, red LED at 2 V, wanted 10 mA: R = (5 − 2) ÷ 0.010 = **300 Ω**.",
          "Resistors only come in standard values, the **E12** series (100, 120, 150, 180, 220, 270, 330, 390, 470, 560, 680, 820 and ×10 of those). Round **up** to the next one, so the current ends up a little *lower* than planned, which is the safe side. Here that is **330 Ω**. The resistor also turns the leftover into heat: **P = I² × R**. For 10 mA through 330 Ω that is 0.033 W, and a common 1/4 W resistor barely warms.",
        ),
        widget: { type: "analog-led", props: { vs: 5, colour: "red", r: 330, showCalc: true, targetMa: 10 }, live: true },
      },
      {
        kind: "question",
        title: "Work out the resistor",
        body: "A **9 V** battery powers an LED with a forward drop of **2 V**. You want **10 mA** through it. What resistor value, in ohms, does R = (Vs − Vf) ÷ I give?",
        question: { type: "number", answer: 700, tolerance: 1, unit: "Ω", hint: "Subtract first: 9 − 2 = 7 V across the resistor. Then divide by 0.010 A." },
        explanation: "R = (9 − 2) ÷ 0.010 = 7 ÷ 0.010 = **700 Ω**. The nearest E12 value *above* it is **820 Ω** (680 Ω is just under, and would give a little more than 10 mA). Always round up for LEDs and check the result: 7 V ÷ 820 Ω ≈ 8.5 mA.",
      },
      {
        kind: "question",
        title: "Light it, safely",
        body: "The red LED is on **5 V** with **no resistor**. Choose a standard resistor so the current is **between 8 and 12 mA**.",
        widget: { type: "analog-led", props: { vs: 5, colour: "red", r: 0, lock: ["vs", "colour"], showCalc: true } },
        question: { type: "widget", goal: { vs: 5, colour: "red", iMin: 0.008, iMax: 0.012 }, hint: "You need about (5 − 2) ÷ 0.010 = 300 Ω. Pick the E12 value nearest that, rounding up if you can." },
        explanation: "With no resistor only the battery's own tiny internal resistance limits the current, and the LED dies at once. 330 Ω gives about 9 mA and 270 Ω about 11 mA, both inside the window. The resistor takes the 3 V the LED does not want and turns it into a little heat.",
      },
      {
        kind: "code",
        title: "The LED resistor formula",
        body: P(
          "Write `led_resistor(vs, vf, i)` that returns the resistor value in ohms for a supply `vs` (volts), an LED drop `vf` (volts) and a wanted current `i` (amps).",
        ),
        language: "python",
        starter: `def led_resistor(vs, vf, i):
    # R = (Vs - Vf) / I
    return 0
`,
        solution: `def led_resistor(vs, vf, i):
    return (vs - vf) / i
`,
        tests: [
          { id: "five", description: "5 V, 2 V LED, 10 mA needs 300 Ω", assertionCode: `assert abs(led_resistor(5, 2, 0.01) - 300) < 1e-6, f"expected 300, got {led_resistor(5, 2, 0.01)}"` },
          { id: "three", description: "3.3 V, 2.0 V LED, 5 mA needs 260 Ω", assertionCode: `assert abs(led_resistor(3.3, 2.0, 0.005) - 260) < 1e-6, f"expected 260, got {led_resistor(3.3, 2.0, 0.005)}"` },
          { id: "nine", description: "9 V, 2.2 V LED, 15 mA needs about 453.3 Ω", assertionCode: `assert abs(led_resistor(9, 2.2, 0.015) - 453.3333) < 0.01, f"expected about 453.33, got {led_resistor(9, 2.2, 0.015)}"` },
        ],
        hints: ["The voltage across the resistor is vs - vf.", "Divide that by the current i (in amps, so 10 mA is 0.01)."],
      },
      {
        kind: "recap",
        points: [
          "A **diode** is a one-way valve: current goes in at the **anode** and out at the **cathode** (the band). Reverse biased it blocks, up to a breakdown voltage.",
          "A conducting diode drops its **forward voltage**: about **0.6 to 0.7 V** for silicon (typical) and roughly **1.8 to 3.3 V** for LEDs, from red up to blue and white (typical). Below that, nothing flows.",
          "An LED needs a **series resistor**: **R = (Vs − Vf) ÷ I**, with a typical indicator current of 5 to 20 mA. Round up to the next standard (E12) value, and check the resistor's heat, P = I² × R.",
          "No resistor means far too much current: the LED dies and the battery is nearly short-circuited.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Inductors and magnetism ───────────────────────────────
  {
    id: "fnd-analog-3-inductors",
    title: "Inductors and magnetism",
    summary: "A coil stores energy in a magnetic field and resists changes in current. The RL time constant, the voltage spike when you cut it off, and the diode that tames it.",
    level: "Intermediate",
    minutes: 10,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "A coil that hates change",
        body: P(
          "Current flowing in a wire creates a **magnetic field** around it. That is how an electromagnet works. Wind the wire into a coil and the fields of all the turns add up. A coil used on purpose like this is an **inductor**.",
          "The field holds energy: **E = ½ × L × I²**, with E in joules and the **inductance L** in **henries (H)**. Parts are usually marked in mH or µH. To change the current you must change the field, and the coil pushes back. The voltage across an inductor is **V = L × di/dt**: the faster the current *changes*, the bigger the voltage. A steady current makes no voltage at all (apart from the wire's own resistance).",
          "Picture a heavy **flywheel**: hard to start, hard to stop. Or a long pipe full of moving water: shut the valve suddenly and the water's momentum slams a pressure spike into it (water hammer). The analogies break here. A flywheel keeps spinning on its own, but an inductor's current has to have **somewhere to go**. And a real coil also has the **resistance of its wire**, the part drawn as Rw below.",
          "Below, a 12 V battery feeds a relay-style coil. Slide the inductance **L** up and see how the current takes longer to build.",
        ),
        widget: { type: "analog-rl", props: { l: 0.1, r: 470, diode: false, lock: ["diode", "ropen"] }, live: true },
      },
      {
        kind: "explain",
        title: "The RL time constant",
        body: P(
          "Close the switch and the current does not jump to its final value. The coil resists, so the current climbs along the same kind of curve you saw for the capacitor in *Capacitors: storing charge*, only now it is the **current** that rises slowly.",
          "The final current is set by the wire alone, **I = V ÷ R** (Ohm's law again: the coil is just a wire once the current is steady). The speed is set by the **time constant τ = L ÷ R**, in seconds when L is in henries and R in ohms. After **one τ** the current has reached **63.2%** of V ÷ R, after 2τ it is at 86.5%, and after 5τ at 99.3%.",
          "More inductance means more resistance to change, so a *slower* climb. More resistance makes the final current smaller and the climb *faster*. Notice that this is the opposite way round from the RC circuit, where a bigger R slows things down.",
        ),
        widget: { type: "analog-rl", props: { l: 0.1, r: 100, diode: false, lock: ["diode", "ropen"] }, live: true },
      },
      {
        kind: "question",
        title: "How slow is this coil?",
        body: "A coil has **L = 0.5 H** and a winding resistance of **R = 50 Ω**. What is its time constant τ = L ÷ R, in **milliseconds**?",
        question: { type: "number", answer: 10, tolerance: 0.1, unit: "ms", hint: "Divide 0.5 by 50 to get seconds, then convert to milliseconds (×1000)." },
        explanation: "τ = L ÷ R = 0.5 H ÷ 50 Ω = 0.01 s = **10 ms**. After about 5τ, 50 ms, the current has essentially settled. A relay's \"click\" is slower than you might think: the coil really does take tens of milliseconds to build its field.",
      },
      {
        kind: "question",
        title: "Where does the current end up?",
        body: "That relay coil is across **12 V** and its winding resistance is **240 Ω**. After the current has settled (about 5τ), what is it, in **milliamps**? (Ohm's law: I = V ÷ R.)",
        question: { type: "number", answer: 50, tolerance: 0.5, unit: "mA", hint: "Once the current is steady, the inductor drops no voltage. Only the winding resistance is left: 12 V ÷ 240 Ω." },
        explanation: "I = V ÷ R = 12 V ÷ 240 Ω = 0.05 A = **50 mA**. The inductance changes how *fast* it gets there, never *where* it ends up. And that final field holds E = ½ × L × I² of energy, a quantity that matters in the next step.",
      },
      {
        kind: "explain",
        title: "Cut the current: the flyback spike",
        body: P(
          "Now open the switch. The coil is storing energy in its field, and V = L × di/dt says that any attempt to change the current quickly produces a big voltage. Cutting the current in a very short time means a **very large voltage**, in whatever direction keeps the current flowing. This is the **flyback** or **inductive kick**.",
          "The voltage rises until something gives: an **arc** jumps across the switch contacts, a transistor **breaks down**, or stray capacitance soaks up the energy. This toy cannot model those, so it puts a **stand-in resistor** across the open switch and the peak it shows is the coil current times that resistance. **That height depends on the stand-in**, not on anything real. In real life, spikes of **hundreds of volts** from relay coils and motors are common, and they destroy transistors and chips.",
          "The cure is a **flyback diode** across the coil, with its **cathode to the + side**. While the switch is closed the diode is reverse biased and does nothing. When the switch opens, the diode gives the current a path: the voltage cannot go beyond about **supply + 0.7 V** and the current circulates through the coil and diode, fading away. The price is a slightly **slower release**, because the field takes a bit longer to disappear.",
          "**Safety:** the spike from a big coil (ignition coils, relay coils, motor windings) can reach hundreds of volts and bite hard. Never touch coil terminals while switching, and use only low-voltage supplies for experiments. Turn the diode on and off below, with the switch closed first and then open.",
        ),
        widget: { type: "analog-rl", props: { l: 0.1, r: 470, diode: false }, live: true },
      },
      {
        kind: "question",
        title: "Why the spike?",
        body: "A relay coil is switched off by a transistor, and there is **no diode** across the coil. What is the main danger?",
        question: {
          type: "choice",
          options: [
            "The coil overheats because the current stops",
            "The relay contacts weld shut because the coil field gets stronger",
            "The battery is drained flat",
            "A brief, huge voltage spike appears across the transistor and can destroy it",
          ],
          answer: 3,
          hint: "V = L × di/dt: what happens to the voltage when the current is cut in a tiny fraction of a second?",
          feedback: {
            0: "When the current stops, the heating stops. The danger is not heat but the voltage the collapsing field produces.",
            1: "The field collapses when the current stops, it does not get stronger. The relay actually lets go.",
            2: "Opening the switch disconnects the battery, so nothing is drained. The problem is the coil's own stored energy.",
          },
        },
        explanation: "The coil's field (½ L I² of energy) has to go somewhere, and cutting the current at once makes the voltage rocket. It can reach **hundreds of volts**, far above what a small transistor can stand, so it breaks down and is usually ruined. That is the reason for the flyback diode.",
      },
      {
        kind: "question",
        title: "Tame the spike",
        body: "Fit the **flyback diode** so that the peak voltage at the switch stays **below 15 V**.",
        widget: { type: "analog-rl", props: { l: 0.1, r: 470, diode: false } },
        question: { type: "widget", goal: { diode: true, peakVMax: 15 }, hint: "Press the \"No flyback diode\" button to fit one, and check the Peak at the switch readout." },
        explanation: "With the diode fitted the peak at the switch is **12.7 V**: the 12 V supply plus the diode's ~0.7 V drop (typical). Without it, the toy shows hundreds of volts (and that height depends on its stand-in resistor). The cost is a slower release: the current fades over milliseconds instead of dying at once, which is why relays with diodes drop out a little later.",
      },
      {
        kind: "question",
        title: "Switch-off in order",
        body: "A relay coil with a flyback diode is switched off. Put the events in order.",
        question: {
          type: "order",
          items: [
            "The switch opens",
            "The coil's field tries to keep the current flowing",
            "The coil's voltage swings the other way until the diode turns on",
            "The diode clamps it near supply plus 0.7 volts",
            "The current fades away through the diode and the relay lets go",
          ],
          hint: "First the cause, then the coil's reaction, then the diode's rescue, and finally the slow fade.",
        },
        explanation: "Opening the switch is the cause. The coil's field **resists the change** and pushes the voltage the other way. The diode, cathode to +, turns on as soon as the coil's voltage goes about 0.7 V beyond the supply, and it **clamps** it there. The current then **fades** through the diode, and the relay releases a little slowly.",
      },
      {
        kind: "recap",
        points: [
          "A coil makes a **magnetic field** and stores energy in it: **E = ½ L I²**. It resists *changes* in current: **V = L × di/dt**.",
          "In an RL circuit the current climbs to **V ÷ R** with the time constant **τ = L ÷ R**: 63.2% after 1τ, about 99.3% after 5τ.",
          "Cutting the current suddenly makes a huge **flyback spike**, in real life hundreds of volts. Treat big coils with respect.",
          "A **flyback diode** across a relay or motor coil, **cathode to +**, clamps the spike to about supply + 0.7 V and lets the current fade through it, at the price of a slower release.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Alternating current ───────────────────────────────
  {
    id: "fnd-analog-4-ac",
    title: "Alternating current",
    summary: "Voltage that swings back and forth: frequency and period, peak versus RMS (and why the √2 rule is for sine waves only), phase, and mains versus small signals.",
    level: "Intermediate",
    minutes: 10,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "Back and forth",
        body: P(
          "A battery gives **DC** (direct current): the voltage sits at one steady level and the current flows one way. **AC** (alternating current) keeps changing: the voltage rises, falls, goes negative and comes back, over and over. Wall sockets give AC, and so does a microphone feeding an amplifier.",
          "One full up-and-down is a **cycle**. The **frequency f** is how many cycles happen each second, in **hertz (Hz)**. The **period T** is the time one cycle takes: **T = 1 ÷ f**. A 50 Hz wave has T = 1 ÷ 50 = 0.02 s = 20 ms.",
          "Below is a wave on a scope (a screen that draws voltage against time). The axis shows two periods. Slide the **frequency** and watch the period change: faster means shorter cycles.",
        ),
        widget: { type: "analog-ac", props: { freq: 100, amp: 5, second: false, lock: ["shape", "amp"] }, live: true },
      },
      {
        kind: "question",
        title: "Set a 20 ms period",
        body: "Set the frequency so that **one cycle takes 20 ms** (0.02 s).",
        widget: { type: "analog-ac", props: { freq: 100, amp: 5, second: false, lock: ["shape", "amp"] } },
        question: { type: "widget", goal: { period: 0.02, tol: 0.02 }, hint: "T = 1 ÷ f, so f = 1 ÷ T = 1 ÷ 0.02. It is a familiar mains frequency in much of the world." },
        explanation: "f = 1 ÷ T = 1 ÷ 0.02 s = **50 Hz**. In general, a longer period means a lower frequency, and the two always multiply to 1: 1 kHz has a period of 1 ms.",
      },
      {
        kind: "explain",
        title: "How big is an AC voltage?",
        body: P(
          "A wave has several \"sizes\". The **peak** (or amplitude) is its highest point, measured from zero. The **peak-to-peak** value runs from the lowest point to the highest, which is twice the peak for a wave that swings equally both ways.",
          "But neither says how *hard the wave works*. An AC voltage spends half its time near zero, so its plain average is zero and tells you nothing. Instead we use the **RMS** value (root mean square: square the voltage at every moment, take the average, then the square root). Its meaning: the **RMS voltage heats a resistor exactly as much as the same steady DC voltage**. That is why a \"230 V\" socket heats a kettle like 230 V of DC would.",
          "For a **sine wave only**: **RMS = peak ÷ √2 ≈ 0.707 × peak**. Other shapes have other factors. Switch between the shapes below and compare the dashed RMS lines and the two RMS readouts (one is computed from the samples, the other from the formula: they match).",
        ),
        widget: { type: "analog-ac", props: { freq: 50, amp: 5, second: false, lock: ["freq"] }, live: true },
      },
      {
        kind: "question",
        title: "RMS of a square wave",
        body: "A square wave swings between **+5 V** and **−5 V**, spending all of its time at one extreme or the other. What is its **RMS** voltage?",
        question: {
          type: "choice",
          options: ["5 V: it is always at full height", "3.5 V: peak ÷ √2, like any AC", "2.9 V: peak ÷ √3", "10 V: the peak-to-peak value"],
          answer: 0,
          hint: "Square every value: both +5 and −5 give 25. What is the average of a number that is always 25, and its square root?",
          feedback: {
            1: "The ÷ √2 rule is for the **sine** wave only, which spends time near zero. A square wave never does.",
            2: "The ÷ √3 factor belongs to the triangle wave. A square wave is always at full height, so no reduction applies.",
            3: "Peak-to-peak is the distance from −5 V to +5 V. RMS is a kind of average height, which can never exceed the peak.",
          },
        },
        explanation: "Every squared value is 25 V², so the mean of the squares is 25 and the root is **5 V**: for a square wave, **RMS = peak**. A triangle wave is peak ÷ √3 ≈ 0.577 × peak, and a sine is peak ÷ √2 ≈ 0.707 × peak. Try all three in the widget above.",
      },
      {
        kind: "explain",
        title: "Phase: when does it peak?",
        body: P(
          "Two AC signals of the *same frequency* can be shifted in time against each other. That shift is the **phase difference**, measured in **degrees**: one whole cycle is 360°, so a quarter of a cycle is **90°** and half a cycle is **180°**.",
          "If signal B reaches its peaks *before* A does, B **leads** A. If it reaches them after, B **lags**. With a lead of 90°, B peaks a quarter of a period earlier. At 180° the two are mirror images, one up exactly when the other is down.",
          "Phase only means something between two signals at the same frequency. It matters because capacitors and inductors shift the current against the voltage, as the next lessons show. Drag the **phase slider** for the orange signal B.",
        ),
        widget: { type: "analog-ac", props: { freq: 50, amp: 5, second: true, phase: 0, lock: ["freq", "amp", "shape"] }, live: true },
      },
      {
        kind: "question",
        title: "A quarter cycle ahead",
        body: "Make signal B **lead A by 90°**, so that B peaks a quarter of a period earlier.",
        widget: { type: "analog-ac", props: { freq: 50, amp: 5, second: true, phase: 0, lock: ["freq", "amp", "shape"] } },
        question: { type: "widget", goal: { phase: 90 }, hint: "Positive phase means B leads. Look at the orange wave: it should reach its first peak a quarter of the period before the accent-coloured one." },
        explanation: "With +90°, B is a **cosine** to A's sine: it is already at its peak when A is at zero. A negative phase would make B **lag**. Counting a full cycle as 360° lets us talk about the same shift at any frequency: 90° is 5 ms at 50 Hz and 0.25 ms at 1 kHz.",
      },
      {
        kind: "explain",
        title: "Mains and small signals",
        body: P(
          "In much of the world, including Europe, large parts of Asia and Africa, the mains is **230 V RMS at 50 Hz**. In North America it is **120 V RMS at 60 Hz**. These are nominal: the real voltage wanders a little. Because the quoted figure is RMS, the **peaks are higher**: 230 × √2 ≈ **325 V**, and 120 × √2 ≈ **170 V**.",
          "Small signals are quite different. An audio signal from a phone is around a volt peak, spread over frequencies from about 20 Hz to 20 kHz; a sensor may give millivolts.",
          "**Safety:** mains voltage can kill. Never experiment with it, and do not open mains equipment. Everything in these lessons uses low-voltage signals from batteries, USB or an isolated plug-in supply, so the worst thing that can happen is a dead component. Press the presets below to see mains drawn (as a picture only).",
        ),
        widget: { type: "analog-ac", props: { freq: 50, amp: 325, second: false, mains: true, lock: ["shape"] }, live: true },
      },
      {
        kind: "code",
        title: "RMS of a sine",
        body: P(
          "Write `rms(peak)` that returns the RMS voltage of a **sine wave** with the given peak voltage. Use `math.sqrt`.",
        ),
        language: "python",
        starter: `import math

def rms(peak):
    # RMS of a sine wave: peak divided by the square root of 2
    return peak
`,
        solution: `import math

def rms(peak):
    return peak / math.sqrt(2)
`,
        tests: [
          { id: "mains", description: "A 325 V peak mains sine is about 229.8 V RMS", assertionCode: `assert abs(rms(325) - 229.8) < 0.1, f"expected about 229.8, got {rms(325)}"` },
          { id: "one", description: "A 1 V peak sine is about 0.7071 V RMS", assertionCode: `assert abs(rms(1) - 0.7071) < 0.001, f"expected about 0.7071, got {rms(1)}"` },
          { id: "twelve", description: "A 12 V peak sine is about 8.485 V RMS", assertionCode: `assert abs(rms(12) - 8.485) < 0.01, f"expected about 8.485, got {rms(12)}"` },
        ],
        hints: ["The factor is 1 ÷ √2, so divide the peak by math.sqrt(2).", "Check: a 325 V peak should give about 230 V, which is the mains label."],
      },
      {
        kind: "recap",
        points: [
          "**AC** keeps reversing. **Frequency f** (Hz) is cycles per second and the **period** is **T = 1 ÷ f** (50 Hz means 20 ms).",
          "**Peak** is measured from zero, **peak-to-peak** is twice that. **RMS** is the DC voltage with the same heating effect.",
          "**RMS = peak ÷ √2 for a sine only.** A square wave's RMS equals its peak; a triangle's is peak ÷ √3.",
          "**Phase** is a time shift in degrees (360° = one cycle): B **leads** A if it peaks first.",
          "Mains is **230 V RMS at 50 Hz** or **120 V RMS at 60 Hz** (peaks ≈ 325 V and 170 V), and it is **lethal**: experiment only with low-voltage signals.",
        ],
      },
    ],
  },
];
