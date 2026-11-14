import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced plain-text block (tables, diagrams) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 6 and 7 of "Components and PCB design": power and ground, signal integrity. */
export const pcbLessonsC: ConceptLesson[] = [
  // ─────────────────────────────── 6. Power and ground ───────────────────────────────
  {
    id: "fnd-pcb-6-power-ground",
    title: "Power and ground",
    summary: "Every current goes round a loop. Return paths, ground planes, slots that break them, where to put decoupling capacitors, and star versus plane grounding.",
    minutes: 11,
    xp: 75,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Every current goes round a loop",
        body: P(
          "In *Electronics from zero: circuits* you met Kirchhoff's current law: current never piles up, so what flows out must flow back. A signal on a board is no different. When a chip drives a trace, current flows out along the **signal trace** and has to return to the chip along some **return path**. Together they make a **loop**.",
          "The loop matters because it behaves like a one-turn coil. A big loop has more **inductance** (the property that resists changes in current), radiates like a small antenna, and picks up noise. A small loop is quiet. So for every signal, ask: *where does its return current go?*",
          "Below is a board seen from above. **TX** drives **RX** along a trace with a dog-leg. The grey area is a ground plane (a layer of copper). The orange path is the return current and the orange shape is the loop it makes. Try the four **Plane** options, then switch **Frequency** between DC and high frequency, and watch where the orange path goes.",
        ),
        widget: { type: "pcb-returnpath", props: {} },
      },
      {
        kind: "question",
        title: "Squeeze the loop",
        body: "Keep the **solid plane**. Choose the frequency that makes the loop area **30 mm² or less**.",
        widget: { type: "pcb-returnpath", props: { plane: "solid", freq: "dc" } },
        question: {
          type: "widget",
          goal: { plane: "solid", freq: "hf", maxLoop: 30 },
          prompt: "Solid plane, and a frequency that brings the loop area down to 30 mm² or less.",
          hint: "One setting spreads the current over the plane. The other makes it hug the trace.",
        },
        explanation:
          "At **high frequency** the return current runs in the plane directly under the trace, because that route makes the smallest loop and so has the least inductance. The loop shrinks from about 1,100 mm² to about 19 mm². At **DC** nothing changes fast, so inductance does not matter and the current just spreads across the plane along the easiest (lowest-resistance) way. The change from one behaviour to the other is gradual: roughly from tens of kHz up to about 1 MHz on a typical board. Every fast digital edge is far above that.",
      },
      {
        kind: "question",
        title: "Rank the returns",
        body: "At **high frequency**, put these four setups in order of loop area, **smallest first**. The widget is still here so you can look each one up.",
        widget: { type: "pcb-returnpath", props: { plane: "solid", freq: "hf" } },
        question: {
          type: "order",
          items: ["Solid plane", "Split plane with a stitching capacitor", "Split plane, nothing across the slot", "No plane: a ground wire round the edge"],
          hint: "The loop is the area between the signal and its return. Which return hugs the trace best, and which sends the current on the longest detour?",
        },
        explanation:
          "In the toy model the loops are about 19 mm² (solid plane), 39 mm² (split with a stitching capacitor), 326 mm² (split, current detours round the end of the slot) and 2,200 mm² (a ground wire round the edge of the board). The actual numbers depend on the board, but the order does not: **the less the return can hug the trace, the bigger the loop.**",
      },
      {
        kind: "explain",
        title: "Why a solid plane is the default",
        body: P(
          "That is why almost every board with fast signals has a **ground plane**: a whole layer of copper, left solid, that every return current can use. Under any trace the plane is only a fraction of a millimetre away, so the loop is tiny without any extra routing. A typical **4-layer** board is stacked like this (typical, not a rule):",
          txt(`top      signals and parts
inner 1  GROUND plane, kept solid
inner 2  POWER plane, or power pours
bottom   signals and parts`),
          "Signals on the top layer have the ground plane right below them. The golden rule is: **route fast signals over an unbroken plane**.",
          "A **power plane** is a whole layer for a supply voltage. A **pour** is copper that fills spare room on a signal layer. Planes carry current with low resistance and low inductance. Pours suit a rail that is needed in just one area. If a signal's neighbour layer is a power plane with gaps in it, the signal has the same problem you are about to see with a slot in ground.",
          "Flip the widget between **No plane** and **Solid plane** at high frequency. Same trace, same chips, very different loop.",
        ),
        widget: { type: "pcb-returnpath", props: { plane: "none", freq: "hf" } },
      },
      {
        kind: "explain",
        title: "Slots and splits break the return",
        body: P(
          "A plane only helps where it is **unbroken**. A **slot** is a gap in the copper. It can come from a deliberate split between two plane regions, from a row of vias drilled so close that their clearance rings merge, or from a cut-out for a connector. The slot below is drawn about 6 mm wide so you can see it; real gaps are often under 1 mm, and the effect is just as bad.",
          "A trace that crosses the slot loses the return path under it. At high frequency the current runs along the slot to its end, round it, and back: a **big loop**, with more inductance, more radiation and more noise.",
          "There are two fixes. The best is **not to cross the slot**: route round it, or change layers where the plane is solid. If a crossing is unavoidable, add a **stitching capacitor** across the slot right next to the trace. A capacitor passes high frequencies, so the return current can hop over the gap. It does nothing at DC (open circuit), and it adds a little inductance of its own, so it is a patch, not a design.",
          "Choose **Split (slot)**, see the loop jump, then try **Split + stitching cap**.",
        ),
        widget: { type: "pcb-returnpath", props: { plane: "split", freq: "hf" } },
      },
      {
        kind: "question",
        title: "Patch the split",
        body: "A trace has to cross this slot and you cannot move it. Keep the slot, choose the fix, and bring the **high-frequency loop under 60 mm²**.",
        widget: { type: "pcb-returnpath", props: { plane: "split", freq: "hf" } },
        question: {
          type: "widget",
          goal: { plane: "stitch", freq: "hf", maxLoop: 60 },
          prompt: "Keep the slot, add the fix, high frequency, loop under 60 mm².",
          hint: "The fix goes across the slot, close to the trace.",
        },
        explanation:
          "The stitching capacitor gives the return current a short hop right next to the trace: about 39 mm², against about 326 mm² with the bare slot. A solid plane (about 19 mm²) is still better, so first try to avoid the crossing. At DC the capacitor is open and the current still goes round the slot, but a steady current does not radiate, so that is harmless.",
      },
      {
        kind: "explain",
        title: "Decoupling: a short loop for the chip's gulps",
        body: P(
          "A chip does not draw current evenly. Whenever many gates switch together it gulps current for a nanosecond or so. The regulator is far away and too slow to answer, so the chip takes that charge from a nearby **decoupling capacitor**. (You met capacitors and regulators in *Components in action: capacitors to op-amps*, in the lessons on capacitors and power supplies.) A common starting point is **one 100 nF capacitor per supply pin**.",
          "The capacitor only helps if the current can reach it fast. The loop is: pin, capacitor, ground via, plane, back to the chip's ground. That loop has inductance, and an inductor fights fast changes, so the supply dips by **ΔV = L × ΔI/Δt**. Rule of thumb: about **1 nH per millimetre of loop path** (rough). For a 50 mA step in 1 ns, every nanohenry costs about 50 mV.",
          "So **placement beats value**. At edges this fast, the loop sets the dip, not the capacitance: a bigger capacitor 5 mm away is worse than a small one 1 mm away. And above its self-resonant frequency a capacitor behaves like the inductance of its loop, so more capacitance cannot help.",
          "Try the controls. The shaded band is an example budget of 3.3 V ± 5% (165 mV). Move the capacitor away, move the via away, and change the value.",
        ),
        widget: { type: "pcb-decap", props: {} },
      },
      {
        kind: "question",
        title: "Stay inside the budget",
        body: "Set the capacitor placement and the ground via so the supply dips by **165 mV or less** (keep the 100 nF value).",
        widget: { type: "pcb-decap", props: { place: "5mm", via: "5mm", cap: "100nF" } },
        question: {
          type: "widget",
          goal: { place: "1mm", via: "pad", maxDroop: 165 },
          prompt: "Capacitor next to the pin, via in the pad, dip within the budget.",
          hint: "Each millimetre of loop path costs about 1 nH, which is about 50 mV here. Keep the loop as short as you can on both sides.",
        },
        explanation:
          "With the capacitor 1 mm from the pin and the via in the pad, the loop is about 1.8 nH and the dip about 90 mV. Move the via 5 mm away, or the capacitor 5 mm away, and the loop grows to about 6 to 7 nH and the dip to about 300 mV or more, well over 165 mV. The short loop wins, which is why datasheets say *place the capacitor as close to the pin as possible, with a via right at the pad*.",
      },
      {
        kind: "question",
        title: "One plane or two?",
        body: P(
          "Two grounding styles you will hear about. **Star grounding** joins every ground at one point, like spokes meeting at a hub, so one circuit's current never flows through another's ground wire. It is good at low frequency: audio, sensors, a motor's heavy return kept away from a precision measurement. At high frequency its long spokes have inductance and the return cannot hug the signal. A **solid plane** gives every signal its own short return underneath.",
          "A mixed-signal board (say a precise ADC next to a noisy microcontroller) tempts people to cut the plane into an \"analog ground\" and a \"digital ground\". What is the common modern advice?",
        ),
        question: {
          type: "choice",
          options: [
            "Cut the plane in two and join the halves at one point, so digital currents never touch analog ground",
            "Keep one solid plane, put analog parts in one area and digital parts in another, and route so digital return currents do not flow under the analog part",
            "Use star grounding with a wire between each pair of chips",
            "Leave out the ground plane so there is nothing for noise to flow through",
          ],
          answer: 1,
          hint: "Think about what happens to any trace that crosses a gap in the plane.",
          feedback: {
            0: "That gap is the slot from the last steps: any trace crossing it loses its return path. It is older advice and rarely right today.",
            2: "Wires between chips are long, inductive spokes. They help at audio frequencies but fail for fast digital edges.",
            3: "Without a plane every return becomes a long loop, which is the worst case you saw in the widget.",
          },
        },
        explanation:
          "The usual advice is **one solid ground plane with partitioned placement**: keep analog and digital areas apart and make sure digital return currents have a path that avoids the analog area. A split cuts the return paths of every signal that crosses it. Star grounding still earns its place at low frequency (audio, sensors, separating a heavy power return), but for most digital boards one solid plane plus careful placement wins. Always check the converter's datasheet for its own layout advice.",
      },
      {
        kind: "recap",
        points: [
          "Every current goes round a **loop**: the signal out and a **return path** back. Small loops mean low inductance, little radiation and little pickup.",
          "At **DC** the return spreads across the plane (least resistance). At **high frequency** it hugs the trace (least inductance). The change is gradual, from tens of kHz up to about 1 MHz.",
          "Keep a **solid ground plane** under fast signals. A slot forces a long detour; avoid crossing it, or add a stitching capacitor as a patch. Power planes and pours need the same care.",
          "**Decoupling:** ΔV = L × ΔI/Δt, about 1 nH per mm of loop path. Put a 100 nF capacitor right at each supply pin, with its via in the pad. Placement beats value.",
          "**Star grounding** suits low-frequency and heavy-current separation. For most digital and mixed-signal boards: one solid plane, with analog and digital parts placed apart.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. Signal integrity ───────────────────────────────
  {
    id: "fnd-pcb-7-signal-integrity",
    title: "Signal integrity",
    summary: "When a trace stops being a plain wire: rise time, critical length, characteristic impedance, reflections and termination, crosstalk.",
    minutes: 12,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Rise time decides, not frequency",
        body: P(
          "A short wire acts like a wire: the voltage is the same all along it. But signals take time to travel. On a board they move at about **15 cm per nanosecond** (typical, roughly 14.5 inside the board to 16.5 on an outer layer), roughly half the speed of light. If the edge is slow compared with the trip, the whole trace moves together. If the edge is fast, one end is changing while the far end has not heard yet, and the trace behaves like a **transmission line**.",
          "What counts is the **rise time** (how long an edge takes to go from 10% to 90% of its height), not how often the signal switches. A 1 MHz clock with 1 ns edges still needs care.",
          "Rule of thumb: a trace needs transmission-line treatment once it is longer than **rise time × speed ÷ 6**. (Some engineers use ÷4 to ÷10; it is a rule of thumb, not a law.) For a 1 ns edge at 15 cm/ns that is 2.5 cm. Signals on an **outer** layer travel a little faster (about 16.5 cm/ns) than on an **inner** layer (about 14.5 cm/ns), because part of the field runs through air instead of only through the board.",
          "Slide the rise time and the length. The dashed line marks the critical length.",
        ),
        widget: { type: "pcb-critical", props: {} },
      },
      {
        kind: "question",
        title: "How long is still short?",
        body: "Set a **1 ns** edge on an **outer** layer. Find the **longest whole-centimetre** trace that still behaves like a plain wire.",
        widget: { type: "pcb-critical", props: { riseNs: 1, lengthCm: 10, layer: "outer" } },
        question: {
          type: "widget",
          goal: { riseNs: 1, isLine: false, minLengthCm: 2, layer: "outer" },
          prompt: "1 ns, outer layer, the longest whole-centimetre trace that is still short (a plain wire).",
          hint: "The critical length is rise time × speed ÷ 6. Stay just below it.",
        },
        explanation:
          "The outer layer runs at about 16.5 cm/ns, so the critical length is 1 ns × 16.5 cm/ns ÷ 6 ≈ 2.75 cm. A 2 cm trace is shorter (a plain wire); 3 cm is longer, so it needs transmission-line care. Edges of 0.1 ns, common in fast chips, shrink that to under 3 mm.",
      },
      {
        kind: "code",
        title: "Critical length in code",
        body: "Write `critical_length_cm(rise_ns, speed_cm_per_ns)`. It returns the length in centimetres beyond which a trace should be treated as a transmission line, by the rule of thumb **rise time × speed ÷ 6**.",
        language: "python",
        starter: `def critical_length_cm(rise_ns, speed_cm_per_ns):
    # rise time x speed, divided by 6
    return 0
`,
        solution: `def critical_length_cm(rise_ns, speed_cm_per_ns):
    return rise_ns * speed_cm_per_ns / 6
`,
        tests: [
          { id: "typical", description: "1 ns edge at 15 cm/ns: 2.5 cm", assertionCode: `assert abs(critical_length_cm(1, 15) - 2.5) < 0.001, f"got {critical_length_cm(1, 15)}, expected 2.5"` },
          { id: "fast", description: "0.5 ns edge at 16.5 cm/ns: 1.375 cm", assertionCode: `assert abs(critical_length_cm(0.5, 16.5) - 1.375) < 0.001, f"got {critical_length_cm(0.5, 16.5)}, expected 1.375"` },
          { id: "slow", description: "5 ns edge at 14.5 cm/ns: about 12.08 cm", assertionCode: `assert abs(critical_length_cm(5, 14.5) - 12.0833) < 0.01, f"got {critical_length_cm(5, 14.5)}, expected 12.08"` },
          { id: "scale", description: "A ten times slower edge allows a ten times longer trace", assertionCode: `assert abs(critical_length_cm(10, 15) / critical_length_cm(1, 15) - 10) < 0.001, "length should scale with rise time"` },
        ],
        hints: ["Multiply the rise time by the speed, then divide by 6.", "return rise_ns * speed_cm_per_ns / 6"],
      },
      {
        kind: "question",
        title: "Impedance: what a wave sees",
        body: P(
          "When an edge travels down a trace it does not know what is at the far end yet. It sees only the trace and the plane under it, and for the wave the pair acts like a fixed resistance: voltage divided by current stays the same all along. That number is the **characteristic impedance, Z0**. It is set by the **geometry** (trace width, height above the plane, copper thickness) and the **dielectric constant εr**, **not by the length**. It is not something a multimeter can read.",
          "Many digital boards aim for **50 Ω** (a common target for single-ended traces). For a trace on the outer layer over a plane (a **microstrip**), the IPC-2141 approximation is **Z0 = 87 / √(εr + 1.41) × ln(5.98 h / (0.8 w + t))**. It is valid for roughly 0.1 < w/h < 2 and is good to a few percent up to about ±10%. Fabs use field solvers and your real stackup instead.",
          "The cross-section is drawn to scale. Adjust the trace so Z0 lands at **50 Ω ± 2** while the badge still says *Formula in range*.",
        ),
        widget: { type: "pcb-z0", props: { target: 50, tol: 2 } },
        question: {
          type: "widget",
          goal: { target: 50, tol: 2, mustBeValid: true },
          prompt: "Z0 within 50 Ω ± 2, with the formula in range.",
          hint: "A wider trace or a thinner dielectric lowers Z0. Start by widening the trace.",
        },
        explanation:
          "With 0.2 mm of dielectric, 1 oz copper and εr 4.3, a width of about 0.33 mm gives about 50 Ω. Both widening the trace and thinning the dielectric put the conductor closer to the plane, which raises the capacitance per length and lowers Z0. In real life you give the fab your target (say 50 Ω ± 10%) and they adjust widths to their own stackup.",
      },
      {
        kind: "code",
        title: "Microstrip Z0 in code",
        body: "Write `microstrip_z0(w, h, t, er)` using the formula above. `w`, `h` and `t` are in the same unit (millimetres here), `er` is the dielectric constant, and the result is in ohms. Use `math.log` (the natural log) and `math.sqrt`.",
        language: "python",
        starter: `import math

def microstrip_z0(w, h, t, er):
    # 87 / sqrt(er + 1.41) * ln(5.98 h / (0.8 w + t))
    return 0
`,
        solution: `import math

def microstrip_z0(w, h, t, er):
    return 87 / math.sqrt(er + 1.41) * math.log(5.98 * h / (0.8 * w + t))
`,
        tests: [
          { id: "hand", description: "0.3 mm trace, 0.2 mm dielectric, 35 µm copper, εr 4.3: about 53.5 ohms", assertionCode: `assert abs(microstrip_z0(0.3, 0.2, 0.035, 4.3) - 53.5) < 0.1, f"got {microstrip_z0(0.3, 0.2, 0.035, 4.3)}, expected about 53.5"` },
          { id: "fifty", description: "0.33 mm wide on 0.2 mm dielectric: about 50.5 ohms", assertionCode: `assert abs(microstrip_z0(0.33, 0.2, 0.0348, 4.3) - 50.5) < 0.1, f"got {microstrip_z0(0.33, 0.2, 0.0348, 4.3)}, expected about 50.5"` },
          { id: "narrow", description: "A narrow 0.15 mm trace has a high Z0 of about 74.4 ohms", assertionCode: `assert abs(microstrip_z0(0.15, 0.2, 0.0348, 4.3) - 74.4) < 0.1, f"got {microstrip_z0(0.15, 0.2, 0.0348, 4.3)}, expected about 74.4"` },
          { id: "wider", description: "A wider trace has a lower Z0", assertionCode: `assert microstrip_z0(0.5, 0.2, 0.035, 4.3) < microstrip_z0(0.2, 0.2, 0.035, 4.3), "wider should be lower"` },
        ],
        hints: ["The scale factor is 87 / math.sqrt(er + 1.41).", "The log term is math.log(5.98 * h / (0.8 * w + t)). Multiply the two."],
      },
      {
        kind: "explain",
        title: "Reflections and termination",
        body: P(
          "When the wave reaches the end of the line, the load decides what happens. If the load impedance **ZL** equals Z0, all the energy is absorbed and nothing comes back. Otherwise part of the wave **reflects**, by the **reflection coefficient Γ = (ZL − Z0) / (ZL + Z0)**.",
          "An **open** end (a CMOS input draws almost no current) has Γ = +1: the whole wave returns with the same sign, so the voltage at the end doubles. A short has Γ = −1. The reflected wave runs back to the source, which reflects it again with **Γs = (ZS − Z0) / (ZS + Z0)**. A typical CMOS driver has an output impedance around 10 Ω, far below 50, so Γs is about −0.67 and the wave bounces to and fro, a bit smaller each time: **ringing**.",
          "A **bounce (lattice) diagram** tracks this. Each zig-zag line is a wave crossing the line in one delay T, labelled with its voltage. The voltage at an end is the sum of all the waves that have arrived. The plot below it shows the load voltage (blue) and the source-end voltage (orange).",
          "The fix is **series termination**: add a resistor at the driver so the total source impedance equals Z0 (here 50 Ω including the driver's own). Then Γs = 0 and the reflection is absorbed when it returns. (On a real board this ringing shows up on an oscilloscope; *Debugging hardware* in *Building real products* catches a false clock edge caused by it.) Try the three source options with the **open** load.",
        ),
        widget: { type: "pcb-bounce", props: { zs: 10, zl: "open" } },
      },
      {
        kind: "question",
        title: "Reflection coefficient",
        body: "A 50 Ω line ends in a **150 Ω** load. What is the reflection coefficient Γ?",
        question: { type: "number", answer: 0.5, tolerance: 0.01 },
        explanation:
          "Γ = (ZL − Z0) / (ZL + Z0) = (150 − 50) / (150 + 50) = 100 / 200 = **0.5**. A positive Γ means the reflected wave has the same sign; its voltage is half of the incoming wave's. A load of 25 Ω gives (25 − 50) / (25 + 50) = −1/3: a smaller reflection with the opposite sign, so the load voltage approaches its final value from below.",
      },
      {
        kind: "question",
        title: "Kill the ringing",
        body: "The receiver is an **open** CMOS input. The 10 Ω driver makes the load voltage overshoot by about 67%. Change the source so the load **overshoots by less than 5%** and **settles by 4T**.",
        widget: { type: "pcb-bounce", props: { zs: 10, zl: "open" } },
        question: {
          type: "widget",
          goal: { zl: "open", maxOvershootPct: 5, settled: true },
          prompt: "Open load, overshoot under 5%, settled by 4T.",
          hint: "Make the source impedance match the line so the returning wave is absorbed instead of reflected.",
        },
        explanation:
          "With a 50 Ω source (driver plus a series resistor) Γs = 0, so the wave that reflects off the open end is absorbed at the source. The line first gets only half the step (1.65 V). The open end doubles it to 3.3 V, one delay later: a **clean step with no overshoot**. The price is that the source end sees a half-height step until the reflection returns. Real designs often pick the resistor so that resistor plus driver output impedance equals about Z0.",
      },
      {
        kind: "question",
        title: "Keep the neighbours quiet",
        body: P(
          "**Crosstalk** is a fast signal on one trace (the **aggressor**) leaking into a neighbour (the **victim**) through the fields between them. On the victim it shows up as noise that should not be there.",
          "Three things set it. **Distance:** coupling falls fast as the gap grows. The toy scale here uses roughly 1 / (1 + (gap/h)²), a commonly quoted shape for near-end coupling over a plane, where h is the trace's height above the plane. **The plane:** a close plane ends many field lines on itself. **Length:** longer side-by-side runs couple more, then it stops growing. A classic rule of thumb is the **3W rule**: keep centre-to-centre spacing at least three trace widths.",
          "This is a toy scale, not a field solver. Space the traces so the noise on the quiet trace is **3% or less**, keeping at least 10 cm side by side and the plane under both.",
        ),
        widget: { type: "pcb-crosstalk", props: { spacingH: 1, lengthCm: 20, plane: true } },
        question: {
          type: "widget",
          goal: { maxNoisePct: 3, minLengthCm: 10, plane: true },
          prompt: "Plane under both, at least 10 cm side by side, noise 3% or less.",
          hint: "Coupling falls off with the square of the gap. Try moving the traces further apart.",
        },
        explanation:
          "With the traces 3 h apart the toy noise drops from about 11% to about 2%, and 3 h edge-to-edge is exactly the 3W rule for traces 1.5 h wide. Other fixes: keep the run side by side short, keep a solid plane close under both, or put a ground trace between them. The next lesson, *EMC: boards that don't shout*, builds on all of this: loops, return paths and edges that are too fast are also what make a board radiate.",
      },
      {
        kind: "recap",
        points: [
          "**Rise time, not clock frequency,** decides when a trace is a transmission line. Rule of thumb: longer than rise time × speed ÷ 6 (about 2.5 cm for 1 ns edges). Outer layers are faster (about 16.5 cm/ns) than inner layers (about 14.5 cm/ns).",
          "**Characteristic impedance Z0** is the voltage-to-current ratio a wave sees. It depends on geometry and the dielectric, not length. Many boards use 50 Ω; the microstrip formula is an approximation, and the fab tunes the real stackup.",
          "At a mismatch part of the wave **reflects**, Γ = (ZL − Z0) / (ZL + Z0). A 10 Ω driver into an open input rings; **series termination** (source impedance equal to Z0) gives a clean step at the load.",
          "**Crosstalk** falls off quickly with spacing and with a close ground plane, and grows with side-by-side length. The 3W rule is a rule of thumb.",
          "Next: *EMC: boards that don't shout*, where loops, return paths and fast edges become radiation.",
        ],
      },
    ],
  },
];
