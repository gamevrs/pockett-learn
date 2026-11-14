# Electronics and semiconductors path (Foundations parts `electronics` and `semiconductors`)

## Placement
Two new parts, inserted right after the `hardware` part (CPU, memory, GPU) and before `building`:
- Part `electronics`: "Electronics: from a circuit to a finished product". Blurb: "Voltage and current, the parts every circuit is made of, digital logic from transistors, designing a PCB, programming the chips on it, and taking a real product from idea to shelf."
  Modules, in order: `circuits`, `analog`, `digital`, `pcb`, `embedded`, `products`.
- Part `semiconductors`: "Semiconductors: how chips are designed and made". Blurb: "Why silicon conducts, how a transistor switches, how a chip is drawn in code, checked, laid out and manufactured, then packaged and tested."
  Modules, in order: `semis` (physics and fabrication), `chipdesign` (RTL to tape-out).

## Assumed prior knowledge (link back by lesson title; don't re-teach at length)
Bits and logic gates (bits module, "Logic gates"), Inside the computer (fnd-computer-*: parts, memory, cycle, clock, buses, I/O and interrupts, boot), Assembly (fnd-asm-*), C pointers and memory (fnd-c-*), the Hardware part: How a CPU runs your code (fnd-cpu-1 "From gates to an adder", pipelining, measuring), Memory (fnd-mem-1 "Inside a memory chip": SRAM/DRAM cells), GPUs (fnd-gpu-*). The `digital` module goes deeper than "From gates to an adder" (transistor-level gates, sequential logic, timing) and must link to it. The `embedded` module links to Inside the computer's buses/interrupts and to the Hardware modules.

## Common rules
- Lesson ids `fnd-<prefix>-N-slug`; every lesson has `level` (Beginner | Intermediate | Advanced | Professional), never going backwards within a module. 6–10 steps, at least half interactive, one idea per step; xp ~40–50 (Beginner) up to ~85–95 (Professional); minutes 7–12.
- Original, beginner-friendly writing in the voice of existing lessons; define every term on first use, even at Professional level; everyday analogies, labelled as analogies where they break down (e.g. the water analogy for voltage/current).
- Real interactivity: most lessons have a simulator the learner manipulates; mix choice (vary correct positions — options are not shuffled), number (explicit ask, sensible tolerance and unit), order, widget questions with check(), and Python code steps where a small function makes the idea concrete (≥2 tests, solution passes, starter fails).
- Every question: explanation, hint, feedback on every wrong choice (≥ 8 chars).
- Professional lessons end with real-world practice: tools and standards named as examples (KiCad/Altium, ngspice/LTspice, Verilator/Icarus/Yosys/OpenROAD, oscilloscopes and logic analysers, J-Link/OpenOCD, IPC standards, FCC/CE) — no vendor favouritism, honest about cost and platform differences.
- Safety: any lesson touching mains voltage, lithium cells or high current carries a clear, short safety note (no mains work for beginners; use isolated low-voltage supplies).

## Accuracy rules
- Physics and formulas exact: V = IR, P = VI = I²R = V²/R, series/parallel combination, KCL/KVL, divider Vout = Vin·R2/(R1+R2), RC time constant τ = RC (63.2% after 1τ, ~99.3% after 5τ), XC = 1/(2πfC), XL = 2πfL, first-order RC cutoff fc = 1/(2πRC) with −3 dB there, RMS of a sine = peak/√2, LED resistor R = (Vs − Vf)/I, Nyquist fs > 2·fmax, ADC LSB = Vref/2^n, CMOS dynamic power ≈ α·C·V²·f, Poisson yield Y = e^(−A·D0), die per wafer approximation (state the formula used).
- Typical values labelled typical: silicon diode ~0.6–0.7 V, red LED ~1.8–2.2 V and blue/white ~2.8–3.3 V, MOSFET logic-level gate thresholds, 1 oz copper = ~35 µm, decoupling 100 nF per supply pin as a common starting point, FR-4 εr ≈ 4.2–4.7, signal speed on FR-4 ≈ 15 cm/ns (roughly half of c), I²C standard/fast modes 100/400 kHz, UART 8N1 framing.
- Process nodes: say clearly that modern "nm" node names are marketing labels, not a physical gate length. EUV wavelength 13.5 nm, DUV ArF 193 nm. Cleanroom classes named as ISO classes. Fab economics as order-of-magnitude, labelled.
- Simulators are toys and say so on screen; numbers they show must be correct for their stated model (sanity-check the pure logic with a node script outside the repo).

## Module `circuits` — "Electronics from zero: circuits" (ids `fnd-circ-N-…`, widgets `circ-`)
1. Beginner — What electricity is: charge, current (flow), voltage (push), the water analogy and where it breaks.
2. Beginner — Ohm's law: V = IR in a live circuit; change one, watch the others.
3. Beginner — Power and heat: P = VI; why resistors get hot; ratings; batteries in mAh/Wh.
4. Beginner — Series and parallel: combining resistors; current splits, voltage shares.
5. Intermediate — Kirchhoff's laws: currents at a node sum to zero, voltages round a loop sum to zero; solving a two-loop circuit.
6. Intermediate — The voltage divider and loading: Vout formula, what a load does to it, potentiometers and sensors (LDR, thermistor).
7. Intermediate — Reading schematics and measuring: symbols, nets, ground; using a multimeter (volts across, amps in series, resistance unpowered); safety.
8. Intermediate — Sources and real-world limits: internal resistance, batteries vs bench supplies, current limiting, short circuits, fuses.

## Module `analog` — "Components in action: capacitors to op-amps" (ids `fnd-analog-N-…`, widgets `analog-`)
1. Beginner — Capacitors: storing charge; Q = CV; RC charging and discharging, τ = RC.
2. Beginner — Diodes and LEDs: one-way valves, forward drop, the LED resistor calculation.
3. Intermediate — Inductors and magnetism: resisting change in current, RL time constant, flyback spikes and why relays need a diode.
4. Intermediate — Alternating current: frequency, period, peak vs RMS, phase; mains vs signals.
5. Intermediate — Impedance and filters: reactance of C and L vs frequency, RC low-pass/high-pass, cutoff and −3 dB, a Bode-style response.
6. Intermediate — Power supplies: transformer → rectifier → smoothing capacitor → regulator; ripple; linear vs switching regulators and efficiency.
7. Advanced — Transistors as switches: BJT and MOSFET, driving a motor/LED from a 3.3 V pin, logic-level MOSFETs, base/gate resistors, flyback protection.
8. Advanced — Transistors as amplifiers: small signals, gain, biasing (one common-emitter or common-source example, conceptually), clipping.
9. Advanced — Op-amps: the two golden rules, inverting and non-inverting amplifiers, buffer, comparator, real limits (rails, bandwidth).
10. Professional — From analog to digital and back: sampling, Nyquist and aliasing, quantisation and resolution, ADC/DAC types, anti-alias filters; practice with SPICE (ngspice/LTspice as examples).

## Module `digital` — "Digital logic from transistors" (ids `fnd-digi-N-…`, widgets `digi-`)
1. Beginner — From switch to gate: a transistor as a switch, the CMOS inverter (pull-up PMOS, pull-down NMOS).
2. Beginner — CMOS gates: NAND and NOR from transistors; why NAND is universal; why CMOS draws almost no static current.
3. Intermediate — Combinational building blocks: multiplexers, decoders, encoders; truth tables to gates (links to "From gates to an adder").
4. Intermediate — Remembering a bit: SR latch, D latch, edge-triggered D flip-flop.
5. Intermediate — Registers and counters: clocked registers, shift registers, binary counters, clock dividers.
6. Advanced — State machines: Moore/Mealy, a traffic light or vending machine, state diagram → next-state logic.
7. Advanced — Timing: propagation delay, critical path, setup and hold, max clock frequency, clock skew.
8. Professional — Metastability and clock domains: what happens when setup is violated, two-flop synchronisers, debouncing a button, async FIFOs (conceptually).

## Module `pcb` — "Components and PCB design" (ids `fnd-pcb-N-…`, widgets `pcb-`)
1. Beginner — Meet the parts: resistors (colour codes and SMD codes), capacitors (ceramic, electrolytic), ICs and packages (THT vs SMD, SOIC/QFN/BGA), connectors.
2. Beginner — Reading a datasheet: absolute maximum vs recommended ratings, electrical characteristics, typical application circuit, pinout.
3. Intermediate — From idea to schematic: blocks, nets, power symbols, decoupling, reference designators, ERC.
4. Intermediate — Footprints and the board: layers and stackups, copper weight, vias, solder mask and silkscreen.
5. Intermediate — Placement and routing: placement first, trace width vs current (IPC-2152 as the reference, a simplified calculator), clearances, keeping loops small.
6. Advanced — Power and ground: return paths, ground planes, decoupling placement, star vs plane grounding, split-plane pitfalls.
7. Advanced — Signal integrity: rise time not frequency, when a trace is "long" (transmission lines), characteristic impedance, reflections and termination, crosstalk.
8. Advanced — EMC: why boards radiate, loop area, return path discontinuities, filtering and shielding basics; what pre-compliance testing is.
9. Professional — Manufacturing the board: DRC, design for manufacture and assembly, Gerbers/drill/BOM/pick-and-place files, panelisation, assembly (reflow), inspection (AOI/X-ray), test points; KiCad/Altium as examples.

## Module `embedded` — "Programming chips: firmware, MCUs and SoCs" (ids `fnd-emb-N-…`, widgets `emb-`)
1. Beginner — Microcontrollers vs computers: an MCU's CPU, flash, RAM and peripherals on one chip; blink an LED as the first program.
2. Beginner — Registers and memory-mapped I/O: peripherals as addresses; set/clear/toggle bits with masks; volatile.
3. Intermediate — GPIO in depth: input/output modes, pull-ups, open-drain, reading a button, debouncing in software.
4. Intermediate — Timers and PWM: prescalers, compare values, duty cycle, dimming an LED and driving a servo.
5. Intermediate — Interrupts: ISRs, the vector table, priorities and nesting, latency, keeping ISRs short, shared data and races.
6. Intermediate — Talking to other chips: UART framing, I²C addressing and ACK, SPI modes; reading a sensor.
7. Advanced — DMA: moving data without the CPU, channels, circular buffers, double buffering, cache coherence caveat.
8. Advanced — Boot and memory map: reset vector, startup code, linker script sections (.text/.data/.bss), flash vs RAM, bootloaders.
9. Advanced — RTOS and power: tasks, scheduling, priorities, queues, priority inversion; sleep modes and wake-up sources; measuring current.
10. Professional — SoCs: CPU clusters, GPU, NPU, DSP, memory controller, interconnect; running Linux; device trees and drivers; programming the SoC's GPU/NPU (link to the GPU module); real dev boards as examples.

## Module `products` — "Building real products" (ids `fnd-prod-N-…`, widgets `prod-`)
1. Beginner — From idea to requirements: what the product must do, constraints (cost, size, power, battery life), turning wishes into measurable requirements.
2. Beginner — Architecture and parts: block diagram, choosing an MCU/SoC, sensors and power, make vs buy (modules), the BOM cost.
3. Intermediate — Prototyping: dev boards and breadboards, proving the riskiest part first, from prototype to a custom board (EVT/DVT/PVT as names).
4. Intermediate — Firmware architecture: layers (HAL, drivers, application), state machines, configuration, logging; testability built in.
5. Intermediate — Bring-up: first power-on checklist (current limit, rails, clocks, programming), smoke tests.
6. Advanced — Debugging hardware: multimeter, oscilloscope (triggering, probing), logic analyser and protocol decode, debugger (SWD/JTAG, breakpoints), printf vs tracing; a systematic method.
7. Advanced — Testing: unit tests on the host, hardware-in-the-loop, environmental and reliability tests, production test fixtures and yield.
8. Advanced — Certification and safety: EMC (FCC/CE as examples), electrical safety, radio modules, batteries; why pre-certified modules save time.
9. Professional — Shipping and living in the field: manufacturing at scale (DFM, yield, cost), secure boot and OTA updates, field failures and returns, iterating on hardware revisions.

## Module `semis` — "Semiconductors: physics to fab" (ids `fnd-semi-N-…`, widgets `semi-`)
1. Beginner — Conductors, insulators and semiconductors: electrons, bands and the band gap in plain words; why silicon.
2. Beginner — Doping: n-type and p-type, electrons and holes, how a tiny amount changes conductivity.
3. Intermediate — The PN junction: depletion region, forward vs reverse bias; the diode explained.
4. Intermediate — The MOSFET: gate, channel, threshold voltage; on/off as a switch; NMOS vs PMOS → CMOS (links to the digital module).
5. Intermediate — Scaling and Moore's law: smaller transistors, why speed/power improved, why it got hard (leakage, power density); FinFET and gate-all-around; node names as labels.
6. Advanced — Making a wafer: sand → polysilicon → ingot → wafers; cleanrooms (ISO classes).
7. Advanced — The fab process loop: oxidation/deposition, photolithography, etching, ion implantation, CMP, metal interconnect; repeated dozens of times (a process-flow simulator).
8. Advanced — Lithography: resolution, wavelength (DUV 193 nm, EUV 13.5 nm), numerical aperture, multi-patterning; masks.
9. Professional — Yield and cost: defects, die size vs yield (Poisson model), dies per wafer, binning; why big chips are expensive and chiplets help.
10. Professional — Packaging and test: wafer sort, dicing, wire bond vs flip chip, advanced packaging (2.5D interposers, 3D stacking, HBM), final test and burn-in.

## Module `chipdesign` — "Designing chips: from RTL to tape-out" (ids `fnd-chip-N-…`, widgets `chip-`)
1. Beginner — How chips are designed: the flow from spec to RTL to gates to layout to masks; who does what.
2. Beginner — Hardware is not software: everything runs at once, wires and registers, clocks; describing hardware vs running instructions.
3. Intermediate — Verilog basics: modules, ports, `assign` for combinational logic, a simulator that shows the waveforms (toy RTL sim).
4. Intermediate — Sequential logic in Verilog: `always @(posedge clk)`, non-blocking assignment, a counter and a state machine.
5. Intermediate — Testbenches and simulation: driving inputs, checking outputs, waveforms, self-checking tests.
6. Advanced — Synthesis: from RTL to a gate netlist, standard cells, area/speed trade-offs; what isn't synthesisable.
7. Advanced — Static timing analysis: paths, slack, setup/hold checks, fixing a failing path (pipelining, retiming).
8. Advanced — Physical design: floorplan, placement, clock tree, routing; DRC and LVS; power (dynamic α·C·V²·f, leakage, clock gating).
9. Professional — Verification at scale and DFT: coverage, constrained-random, formal (as concepts, UVM as an example), scan chains and BIST for manufacturing test.
10. Professional — FPGA vs ASIC and tape-out: prototyping on FPGAs, mask costs and risk, open-source flows (Yosys, OpenROAD, Sky130 as examples), what "tape-out" means.

## Implementation notes

| Module | File / export | Part | Lesson ids | Widget registry (folder, export, key prefix) |
|---|---|---|---|---|
| circuits | `src/content/foundations/circuits.ts` `circuitsModule` | electronics | `fnd-circ-N-slug` | `src/learn/widgets/circ/` `CIRC_WIDGETS` `circ-` |
| analog | `analog.ts` `analogModule` | electronics | `fnd-analog-N-slug` | `analog/` `ANALOG_WIDGETS` `analog-` |
| digital | `digital.ts` `digitalModule` | electronics | `fnd-digi-N-slug` | `digi/` `DIGI_WIDGETS` `digi-` |
| pcb | `pcb.ts` `pcbModule` | electronics | `fnd-pcb-N-slug` | `pcb/` `PCB_WIDGETS` `pcb-` |
| embedded | `embedded.ts` `embeddedModule` | electronics | `fnd-emb-N-slug` | `emb/` `EMB_WIDGETS` `emb-` |
| products | `products.ts` `productsModule` | electronics | `fnd-prod-N-slug` | `prod/` `PROD_WIDGETS` `prod-` |
| semis | `semis.ts` `semisModule` | semiconductors | `fnd-semi-N-slug` | `semi/` `SEMI_WIDGETS` `semi-` |
| chipdesign | `chipdesign.ts` `chipdesignModule` | semiconductors | `fnd-chip-N-slug` | `chip/` `CHIP_WIDGETS` `chip-` |

- Each module file says where its lessons and widgets go. Authors touch only their module file (plus optional
  `<module>-a.ts` / `-b.ts` splits) and their widget folder; the registries are already spread into `WIDGETS`.
- Register widgets one per line in the literal form `"circ-name": { Component: Name, check: checkName },`: the
  validator finds widget types with a regex and flags duplicate keys across registries.
- Set `level` on every lesson; see "Lesson levels" in FOUNDATIONS_AUTHORING.md.
- `pnpm test:elec` (`node scripts/test-elec-kit.mjs`) checks the shared kit against hand-computed answers.

## Shared widget kit: `src/learn/widgets/elec-kit/`

Used by circuits, analog, pcb and products (and anyone else who wants it). It has no registry and no widget
keys of its own: import from it inside your own widgets. The solvers and the formatter are pure TypeScript (no
React), so they also run in Node; check any numbers a widget shows with a small node script outside the repo.
Every simulator built on it is a toy and should say so on screen (ideal parts, ideal sources, no temperature).

### `solve.ts`: DC solver (modified nodal analysis)

```ts
type DcElement =
  | { kind: "R"; id; a; b; ohms }                 // ohms > 0 (use a closed switch for a plain wire)
  | { kind: "V"; id; a; b; volts }                // a is the + terminal
  | { kind: "I"; id; a; b; amps }                 // pushes amps from a to b through itself (leaves at b)
  | { kind: "S"; id; a; b; closed: boolean }      // ideal switch
  | { kind: "D"; id; a; b; vf?: number; ron?: number } // diode, anode a: on = vf + ron (default 0.7 V, 1 mΩ), off = 1 GΩ leak

solveDC(elements: DcElement[], opts?: { ground?: string /* "gnd" */; allowFloating?: boolean }): DcResult
type DcResult =
  | { ok: true; v: Record<node, number>; el: Record<id, { v; i; p; on? }>; floating: string[] }
  | { ok: false; error: ElecErrorKind; message: string; involved: string[] }
type ElecErrorKind = "invalid-value" | "no-ground" | "floating-node" | "voltage-loop" | "short-circuit"
                   | "current-source-open" | "diode-convergence" | "singular"
voltageBetween(sol, a, b): number
```

Conventions are SPICE's: for every element `v = V(a) − V(b)`, `i` is the current from a to b through it, and
`p = v·i` is the power **absorbed** (a battery that is delivering power shows negative `i` and `p`). Nodes are
any strings; the ground node is 0 V. Problems come back as `{ ok: false }` with a sentence a learner can read,
never as NaN: a node with no path to ground (`floating-node`; pass `allowFloating` to pin each cut-off island to
0 V instead, e.g. behind an open switch), ideal sources in a loop (`voltage-loop`), a closed switch across a
source (`short-circuit`), a current source with nowhere to go (`current-source-open`), a bad value
(`invalid-value`). Closed switches in parallel are fine (the current is reported through one of them). Diodes are
solved by trying on/off states until every diode agrees with its state; this is robust for the circuits lessons
use (LED resistor, bridge rectifier, flyback diode) and gives up with `diode-convergence` rather than looping.

```ts
const r = solveDC([
  { kind: "V", id: "B1", a: "top", b: "gnd", volts: 9 },
  { kind: "R", id: "R1", a: "top", b: "mid", ohms: 1000 },
  { kind: "R", id: "R2", a: "mid", b: "gnd", ohms: 2000 },
]);
if (r.ok) r.v.mid;      // 6
if (r.ok) r.el.R1.i;    // 0.003
if (r.ok) r.el.B1.p;    // −0.027 (delivering 27 mW)
if (!r.ok) r.message;   // show this to the learner
```

### `transient.ts`: fixed-step transient solver

```ts
type Waveform = number                                    // DC
  | { kind: "dc"; value } | { kind: "step"; from; to; at? }
  | { kind: "sine"; amplitude; freq; offset?; phase? /* degrees */ }
  | { kind: "square"; low; high; freq; duty? /* 0.5 */; delay? }
type TranElement = R | V (volts: Waveform) | I (amps: Waveform) | D
  | { kind: "C"; id; a; b; farads; v0? }                 // initial V(a) − V(b)
  | { kind: "L"; id; a; b; henries; i0? }                // initial current a → b
  | { kind: "S"; id; a; b; closed: boolean | ((t: number) => boolean) }

simulate(elements, { tStop, steps? /* 1000 */, method?: "backward-euler" | "trapezoidal", ground?, allowFloating? }): TranResult
type TranResult = { ok: true; t: number[]; v: Record<node, number[]>; el: Record<id, { v: number[]; i: number[]; p: number[] }>; dt }
                | { ok: false; error; message; involved; at?: number /* time it failed */ }
waveAt(w, t): number
sampleAt(res, trace, t): number      // linear interpolation
peakAfter(res, trace, fromT): number // max |value| from a time on (steady-state amplitude)
```

Backward Euler is the default: first-order accurate but L-stable, so it never rings or overshoots after a step,
a square edge or a switch, whatever step a widget picks, and an inductor whose current is cut gives one large
but finite spike. With 100 steps per time constant it matches the analytic RC charge/discharge and RL rise to
well under 1% (tests check 63.2% at τ, 86.5% at 2τ, 99.3% at 5τ). `"trapezoidal"` is second-order and better for
steady-state sine amplitudes at fewer steps per period, but can ring on sharp edges; keep backward Euler for
anything that switches. For a sine, use at least ~200 steps per period (trapezoidal) or ~1000 (backward Euler)
for 1% amplitude accuracy. Sample 0 is at t = 0 with capacitors at `v0` and inductors at `i0`.

```ts
const rc = simulate([
  { kind: "V", id: "V1", a: "in", b: "gnd", volts: { kind: "step", from: 0, to: 5 } },
  { kind: "R", id: "R1", a: "in", b: "out", ohms: 1000 },
  { kind: "C", id: "C1", a: "out", b: "gnd", farads: 1e-6 },
], { tStop: 5e-3, steps: 500 });
if (rc.ok) sampleAt(rc, rc.v.out, 1e-3); // ≈ 3.16 (63.2% of 5 V after τ = 1 ms)
```

### `format.ts`: SI values

```ts
formatSI(value, unit = "", opts?: { digits?: 3; space?: true; prefix?: "m" | ... }): string
parseSI(text): number | null
toInputSI(value, digits = 3): string  // short ASCII form for inputs: 4700 → "4.7k", 1e-7 → "100n"
MINUS  // "−" (U+2212), used for negative values
```

`formatSI(0.0047, "F")` → `"4.7 mF"`, `formatSI(4700, "Ω")` → `"4.7 kΩ"`, `formatSI(999.96, "Ω")` → `"1 kΩ"`,
`formatSI(0.02, "A", { prefix: "m" })` → `"20 mA"`. `parseSI` accepts `"4k7"`, `"4.7k"`, `"100n"`, `"2.2u"`,
`"2u2"`, `"4R7"`, `"1M"` (mega), `"1m"` (milli), `"1meg"`, `"10 kΩ"`, `"100nF"`, `"5mA"`, `"−5"`, `"1e-3"`;
prefixes are case-sensitive except `K` for kilo, and a prefix letter between digits is the decimal point.

### `symbols.tsx` and `Schematic.tsx`: drawing circuits

Symbols are SVG `<g>` components on a 20-unit grid (`GRID`), for an SVG about 360 units wide; labels are 14
units. Colours come from theme variables (`--ink` lines, `--brand` highlight and current, `--surface` bodies,
`--ink-2` values; lit LEDs/lamps glow with `--elec-glow`, default `#f5c518`), so they read in light and dark.
Resistors use the zigzag (ANSI) style; `variant="box"` draws the IEC rectangle.

- Two-pin parts (`Resistor`, `Capacitor`, `PolarCapacitor`, `Inductor`, `Battery` (`cells` 1|2), `DCSource`,
  `ACSource`, `CurrentSource`, `Diode`, `LED` (`on`), `Switch` (`closed`), `Lamp` (`brightness` 0–1)) take
  `{ x, y, rot?: 0|90|180|270, label?, value?, highlight?, labelFlip? }`: pin a is at (x, y), pin b 60 units
  along the rotation. Pin a is the + terminal / anode / + plate. Labels stay upright.
- `Ground` (one pin), `Junction`, `Wire` (`points`), `NetLabel`, `CurrentArrow`.
- `NPN` (pins b, c, e), `NMOS` / `PMOS` (g, d, s; PMOS `bubble` for the digital-style gate), `OpAmp`
  (minus, plus, out; `flip` puts + on top). Transistors take `mirror` instead of `rot`.
- `pinsOf(kind, x, y, rot, { mirror, flip })` gives absolute pin positions.
- Geometry (grid, pin offsets, polarity marks, `pinsOf`, `markOf`) lives in `geometry.ts` (no React), re-exported
  from `symbols.tsx`. `test:elec` checks that for every polarised symbol (battery 1 and 2 cells, polarised
  capacitor, DC source, current source, diode, LED) at every rotation the "+" / anode / arrow tail sits at pin a
  and the "−" / cathode / arrow head at pin b, and that the op-amp's signs sit at their pins (flipped or not).
  So: wire **pin a** to the positive side. A source with `rot: 90` has + on top; `rot: 270` puts + at the bottom.

**Labels.** Part labels (`label` / `value`) are placed automatically beside the part's middle: above (label)
and below (value) a horizontal part, to the right of a vertical one; `labelFlip` moves them below / to the left.
Net labels (`texts`) go exactly where you put them, and nothing checks for collisions, so keep them clear of part
labels: put a net name at a wire end or bend, off to the side away from the part (e.g. "IN" under the left end
of the input wire, not above the input resistor), use `anchor: "end"` for labels at the right edge, and use
fractional cells (`[0, 5.2]`) for fine offsets. Check every layout at 390 px wide in both themes.

`<Schematic>` lays out a whole circuit from data, in grid cells, with wires that can name pins:

```tsx
<Schematic cols={18} rows={10} ariaLabel="A battery lights a lamp through a switch"
  parts={[
    { kind: "battery", id: "B1", at: [3, 4], rot: 90, label: "B1", value: "9 V" },
    { kind: "switch", id: "S1", at: [6, 2], label: "S1", closed },
    { kind: "lamp", id: "L1", at: [15, 3], rot: 90, label: "L1", brightness: closed ? 1 : 0 },
  ]}
  wires={[
    { points: ["B1.a", [3, 2], "S1.a"], flow: closed ? 1 : 0 },
    { points: ["S1.b", [15, 2], "L1.a"], flow: closed ? 1 : 0 },
    { points: ["L1.b", [15, 8], [3, 8], "B1.b"], flow: closed ? 1 : 0 },
  ]}
/>
```

A wire's `flow` is a signed current (any unit, + along the point order): wires carrying current turn the accent
colour and show moving dots whose speed follows |flow| relative to the largest on the drawing. Under
`prefers-reduced-motion` (or `animate={false}`) the dots stand still and an arrow shows the direction. Junction
dots are added automatically where a wire ends on another wire or three connections meet. `texts` adds net
labels; `showGrid` shows the grid while laying out. An unknown pin name throws, so layout mistakes show up at
once in dev.

### Not included

- No nonlinear models beyond the piecewise diode: no transistor or op-amp simulation (widgets for those compute
  their own ideal-model numbers, e.g. the op-amp golden rules), no exponential (Shockley) diode.
- No AC (phasor) analysis: for filters, use the closed-form formulas or a transient sine run.
- No variable time step: pick `steps` from the fastest time constant (≥ 100 per τ for 1%).
