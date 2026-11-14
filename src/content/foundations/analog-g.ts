import type { ConceptLesson } from "../../learn/types.ts";

/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";

/** Lesson 14 of "Components in action: capacitors to op-amps": motors, actuators and drivers. */
export const analogLessonsG: ConceptLesson[] = [
  // ─────────────────────────────── 14. Motors, actuators and drivers ───────────────────────────────
  {
    id: "fnd-analog-14-motors",
    title: "Motors, actuators and drivers",
    summary:
      "A spinning motor is also a generator. Back-EMF and stall current, the H-bridge that runs it both ways, dead time, PWM speed control, and steppers and servos.",
    level: "Advanced",
    minutes: 12,
    xp: 75,
    steps: [
      {
        kind: "explain",
        title: "A motor is also a generator",
        body: P(
          "A small **brushed DC motor** is a coil of wire (the **winding**) that spins inside a magnetic field. Push current through the winding and it feels a twist, the **torque**. Torque is roughly proportional to the current: **T = k × I**, where k is a constant of that motor.",
          "Now the surprise. A wire moving through a magnetic field has a voltage induced in it (see *Inductors and magnetism*). So a spinning motor is also a **generator**, and the voltage it makes **opposes** the supply. It is called the **back-EMF** (EMF is an old name for voltage). It grows with speed: **E = k × ω**, where ω is the speed in radians per second. In SI units it is the same k as in the torque equation.",
          "So the current is whatever the supply has left over after the back-EMF: **I = (V − E) / R**, with R the winding's resistance. At rest E is zero, so every start draws the **stall current V / R** for a moment. As the motor speeds up, E rises and the current falls until the torque only just covers friction and load. A jammed (stalled) shaft stays at stall: full current, no cooling airflow, a winding that heats up fast.",
          "Picture a water turbine in a pipe. The flow spins it, and once it spins it pushes back against the flow, so the flow drops. The picture breaks when something else spins the shaft: a motor then really does push current back into its supply, which is how regenerative braking works.",
          "Below is a **toy** motor on a 6 V supply. Watch the start-up spike in the current graph while the speed climbs. Then try **Loaded** and **Stalled (locked)**.",
        ),
        widget: { type: "analog-hbridge", props: { mode: "forward", duty: 100, load: "free" } },
      },
      {
        kind: "question",
        title: "Stall current",
        body: "A **9 V** motor has a winding resistance of **3 Ω**. Its shaft is jammed, so the back-EMF is zero. How much current does it draw? Give the answer in **amps**.",
        question: {
          type: "number",
          answer: 3,
          tolerance: 0.05,
          unit: "A",
          hint: "With no back-EMF the winding is just a resistor across the supply. Use V = I × R.",
        },
        explanation:
          "I = V / R = 9 V / 3 Ω = **3 A**. The driver, wiring, fuse and battery must survive this at every start, and a motor that stays jammed keeps drawing it and cooks. Running free, the small motor in the widget draws only about 0.14 A, a tiny fraction of its stall current, because the back-EMF eats almost all of the supply.",
      },
      {
        kind: "explain",
        title: "Both ways: the H-bridge",
        body: P(
          "One low-side MOSFET (see *Transistors as switches*) can spin a motor one way only. To reverse it, the current must flow the other way through the winding. The classic trick is the **H-bridge**: four switches drawn like the letter H, with the motor as the crossbar.",
          "Name them like this: **Q1** top left, **Q2** bottom left, **Q3** top right, **Q4** bottom right. The motor's two terminals are **A** (left) and **B** (right). Closing different pairs gives different behaviour.",
          txt(`
Q1 + Q4 closed   forward   current flows A -> B
Q3 + Q2 closed   reverse   current flows B -> A
Q2 + Q4 closed   brake     both terminals tied to ground
all open         coast     motor disconnected, free to spin down
`),
          "**Braking** works because a spinning motor is a generator: with both terminals shorted together its back-EMF drives current round the loop, and that current's torque opposes the spin. It stops far faster than **coasting**, where nothing is connected and only friction slows it.",
          "**Reversing** a spinning motor is violent. The supply and the back-EMF now point the same way, so the first instant draws nearly **twice** the stall current. Use the **Drive** buttons: run **Forward**, then press **Reverse** and watch the current graph spike. Never close both switches on one side (Q1 with Q2, or Q3 with Q4); the next step shows why.",
        ),
        widget: { type: "analog-hbridge", props: { mode: "manual", q: [1, 0, 0, 1], duty: 100, load: "free" } },
      },
      {
        kind: "question",
        title: "Run it backwards",
        body: "The bridge is in **Manual** mode with every switch open. Close the right switches to run the motor **in reverse** (current from B to A) **without** shorting the supply.",
        widget: { type: "analog-hbridge", props: { mode: "manual", q: [0, 0, 0, 0], duty: 100, load: "free", lock: ["load"] } },
        question: {
          type: "widget",
          goal: { manual: true, direction: -1, shoot: false },
          hint: "Reverse needs the supply to reach terminal B and ground to reach terminal A. Which two switches make those connections?",
        },
        explanation:
          "**Q3** connects the supply to terminal B and **Q2** connects terminal A to ground, so current flows B to A through the motor. Closing Q1 or Q4 as well would put two switches of one side in series across the supply.",
      },
      {
        kind: "explain",
        title: "Shoot-through and dead time",
        body: P(
          "Close Q1 and Q2 together and the supply is joined to ground through two nearly ideal switches. The current is limited by almost nothing: that is **shoot-through**. It means a blown fuse at best and two dead MOSFETs at worst.",
          "Even a driver that never *intends* to close both can do it by accident. Real MOSFETs take time to turn off, so if one switch of a leg turns on at the very moment the other is turning off, both are briefly on. The fix is **dead time**: a short gap, typically tens to hundreds of nanoseconds, with **both** switches off.",
          "During dead time the motor's inductance still wants its current to continue (*Inductors and magnetism* again). It finds a path through the **body diode** of a MOSFET (the diode built into every power MOSFET, see *Diodes and LEDs*) or through an added Schottky diode. That is the flyback diode idea, built into the bridge.",
          "One more detail. A high-side **N-channel** MOSFET only turns on when its gate is a few volts *above* its source, and its source rises to the supply when it conducts. So the gate needs more than the supply voltage. **Gate-driver** chips make it with a **bootstrap capacitor**, charged while the low-side switch is on and then used as a floating battery for the gate. Each leg is the same pair of switches as the synchronous buck converter in *Switching converters in depth*.",
        ),
      },
      {
        kind: "question",
        title: "Why the pause?",
        body: "A half-bridge driver deliberately leaves both of its switches off for a few hundred nanoseconds at every change. Why?",
        question: {
          type: "choice",
          options: [
            "To give the motor time to slow down before it reverses direction",
            "To let the supply capacitor recharge during every switching cycle",
            "To push the PWM frequency up above the range of human hearing",
            "One switch is fully off before the other starts to turn on",
          ],
          answer: 3,
          hint: "Think about what happens in the leg if both switches conduct at the same moment, even for a very short time.",
          feedback: {
            0: "Slowing down takes milliseconds, not nanoseconds. Dead time is far too short to matter to the motor.",
            1: "The supply capacitor is topped up all the time. A gap of nanoseconds does not recharge anything.",
            2: "The PWM frequency (often around 20 kHz) is chosen separately. Dead time is a few nanoseconds in a cycle of microseconds.",
          },
        },
        explanation:
          "MOSFETs turn off more slowly than a logic signal changes. Without a gap, the high and low switch of a leg can both conduct for a moment, and that is a short across the supply. A little dead time costs a sliver of control, and the body diodes carry the motor current across it.",
      },
      {
        kind: "question",
        title: "Half speed",
        body: P(
          "To run a motor slower you could lower its voltage, but a linear drop wastes power as heat. Instead the bridge is **switched** fast: closed for a fraction of each cycle, open for the rest. That fraction is the **duty cycle** D. This is **PWM** (pulse-width modulation, see *Timers and PWM*), at a typical 20 kHz or so to stay above hearing.",
          "The motor sees the **average** voltage, **D × V**. Its winding's inductance smooths the current, so the motor behaves as if fed D × V and runs at roughly **D times its full no-load speed**. A loaded motor falls short of that, because it needs extra current for the load.",
          "Use the **Drive** buttons and the **PWM duty** slider: make the motor run **forward** at **between 40% and 60%** of its full-supply speed, with **no** shoot-through. The bridge starts running in reverse.",
        ),
        widget: { type: "analog-hbridge", props: { mode: "reverse", duty: 100, load: "free", lock: ["load"] } },
        question: {
          type: "widget",
          goal: { mode: "forward", load: "free", speedPctMin: 40, speedPctMax: 60, shoot: false },
          hint: "With no load the speed is about the duty times the full speed. Which duty gives roughly half, and which Drive button points the right way?",
        },
        explanation:
          "At 50% duty the motor sees an average of 3 V from a 6 V supply, so with no load it settles near half its full speed. Any duty from about 40% to 60% passes. PWM wastes little: the switches are either fully on or fully off (see *Transistors as switches*), so almost no power turns into heat in them.",
      },
      {
        kind: "question",
        title: "Measuring the current",
        body: P(
          "To limit current or spot a stall, a driver needs to *measure* the motor's current. The usual way is a **shunt**: a small, precisely known resistor in the bridge's ground return. The current makes a small voltage across it (V = I × R). An amplifier or an **ADC** (analog-to-digital converter, a circuit that turns a voltage into a number) reads that voltage.",
          "The shunt is kept low in value so it wastes little power and steals little of the supply.",
          "A **0.1 Ω** shunt carries **1.5 A**. What voltage appears across it? Give the answer in **millivolts (mV)**.",
        ),
        question: {
          type: "number",
          answer: 150,
          tolerance: 2,
          unit: "mV",
          hint: "Ohm's law again: voltage = current × resistance. Convert volts to millivolts at the end.",
        },
        explanation:
          "V = 1.5 A × 0.1 Ω = 0.15 V = **150 mV**. The shunt also dissipates I² × R = 1.5² × 0.1 = **0.225 W**, so pick a part whose power rating covers that with room to spare. For bigger motors, use a smaller shunt and more amplifier gain to keep the waste down.",
      },
      {
        kind: "explain",
        title: "Steppers, servos and driver ICs",
        body: P(
          "A **stepper motor** moves in fixed steps. It has two coils, each driven by its own H-bridge, energised in a repeating pattern. A typical stepper has **1.8°** per step, so **200 steps** make a turn. **Microstepping** blends the two coil currents to land between steps. Stepper drivers use **current chopping**: they switch the voltage on and off to hold each coil at a set current. Steppers also keep a **holding current** at rest to stay put, so they run warm even when not moving.",
          "A hobby **servo** is a small motor, gears, a position sensor and a controller in one case. You send it a pulse about every **20 ms**; the pulse's **width**, typically 1 to 2 ms, sets the angle it moves to and holds (generating that pulse is a job for *Timers and PWM*). A **brushless** motor has no brushes: three half-bridges energise its coils in turn, which is the job of an **ESC** (electronic speed controller).",
          "You rarely build a bridge from loose parts. **Driver ICs** put it in one package. MOSFET-based dual H-bridges, such as the TI DRV8833 or the Toshiba TB6612FNG, lose very little. The old bipolar **L298** has an output stage that drops around 2 V or more (typical), and that drop turns straight into heat. Brushed motors also spark and make electrical noise: a small ceramic capacitor across the motor terminals helps.",
          "**Safety:** stalled motors and drivers get hot, and big motors on battery packs can deliver tens of amps. Fuse the supply (see *Protecting a circuit*), keep fingers and hair away from gears and propellers, and disconnect the power before touching the mechanism.",
        ),
      },
      {
        kind: "recap",
        title: "What to remember",
        points: [
          "A spinning motor is a generator: back-EMF **E = k × ω** opposes the supply, so **I = (V − E) / R**. At rest (or jammed) the current is the **stall current V / R**.",
          "An **H-bridge** (four switches) runs a motor both ways: Q1 + Q4 forward, Q3 + Q2 reverse, both low sides to **brake**, all open to **coast**. Reversing at speed draws nearly twice the stall current.",
          "Never close both switches of one side: that is **shoot-through**. Drivers add **dead time** (tens to hundreds of ns), body diodes carry the motor current across it, and gate drivers use a **bootstrap** capacitor for the high side.",
          "**PWM** gives average voltage D × V, so speed is roughly D × full speed, with the winding smoothing the current. A low-value **shunt** turns current into a voltage to measure (V = I × R, heat I² × R).",
          "Steppers (about 200 steps per turn at 1.8°) and servos (a 1 to 2 ms pulse every 20 ms) build on the same bridges. Prefer MOSFET driver ICs to the old L298, and fuse the supply.",
        ],
      },
    ],
  },
];
