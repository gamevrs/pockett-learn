import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced C block for lesson prose. */
const c = (s: string) => "~~~c\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 1 to 5: microcontrollers, registers, GPIO, timers and PWM, interrupts. */
export const embeddedLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. Microcontrollers vs computers ───────────────────────────────
  {
    id: "fnd-emb-1-mcu",
    title: "Microcontrollers vs computers",
    summary: "A whole small computer on one chip: CPU, flash, RAM and peripherals. Your first program blinks an LED.",
    minutes: 9,
    xp: 45,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "A computer on one chip",
        body: P(
          "In *The parts of a computer* you met the CPU, memory, storage and input/output as separate parts on a board. A **microcontroller** (MCU for short) puts all of them on **one chip**: a small CPU, **flash** memory for the program, **RAM** for variables, and **peripherals**: little hardware helpers that blink pins, count time or talk to other chips.",
          "Microcontrollers are everywhere a full computer would be overkill: keyboards, washing machines, thermostats, toys, car windows, smart plugs. A modern car can have dozens. The program that runs on them is called **firmware**.",
          "Tap the blocks of this chip to see what each one does and what it corresponds to in a PC.",
        ),
        widget: { type: "emb-mcu", props: {} },
      },
      {
        kind: "question",
        title: "Where the program lives",
        body: "Your program has to survive the power being switched off. **Tap the block that stores it.**",
        widget: { type: "emb-mcu", props: {} },
        question: {
          type: "widget",
          goal: { selected: "flash" },
          prompt: "Select the block that keeps the program with the power off.",
          hint: "RAM forgets everything when the power goes. Which memory on the chip does not?",
        },
        explanation: "**Flash** keeps its contents without power, like the SSD in a PC. The difference: an MCU's CPU usually runs the code **straight out of flash**, with no loading step, so it starts within milliseconds of power-on. **SRAM** holds the variables and the stack while it runs, and loses them when the power goes.",
      },
      {
        kind: "explain",
        title: "Small on purpose",
        body: P(
          "An MCU is not a slow, cheap PC. It is built for a different job: one task, forever, using as little power and money as possible. Switch the view to compare typical numbers.",
          "The big ones: an MCU runs at tens to hundreds of **MHz** (a PC at a few GHz), has **kilobytes** of RAM (a PC has gigabytes) and uses **milliwatts** (a PC tens to hundreds of watts). Many MCUs run with **no operating system** at all: your program is the only thing on the chip.",
        ),
        widget: { type: "emb-mcu", props: { view: "compare" } },
      },
      {
        kind: "question",
        title: "Pick the right chip",
        body: "Which job is the **best fit for a microcontroller** rather than a PC-class computer?",
        question: {
          type: "choice",
          options: [
            "Editing 4K video",
            "Running a web browser with dozens of tabs",
            "Reading a temperature sensor once a second and switching a heater on or off, for years on batteries",
            "Training a large neural network",
          ],
          answer: 2,
          hint: "Think about which task needs little computing but must be cheap, tiny and frugal with power.",
          feedback: {
            0: "Video editing needs gigabytes of RAM and a lot of computing: that is PC or workstation work.",
            1: "A modern browser needs an operating system and gigabytes of memory, far beyond a microcontroller.",
            3: "Training needs GPUs and huge memory. A microcontroller might run a tiny, already-trained model, but never train a big one.",
          },
        },
        explanation: "A thermostat does a little work, rarely, and must run for years on small batteries: exactly what an MCU is for. It can sleep almost all the time and wake once a second (you will measure this in the RTOS and power lesson).",
      },
      {
        kind: "explain",
        title: "Hello, world: blink an LED",
        body: P(
          "A microcontroller usually has no screen, so the first program does not print \"Hello, world\". It **blinks an LED** wired to one of the chip's pins. If it blinks, the toolchain works, the program was flashed, the clock runs and the pin is set up: a lot is proven at once.",
          c(`
int main(void) {
    led_init();            // make the LED's pin an output
    while (1) {            // forever: there is no OS to return to
        led_on();
        delay_ms(500);
        led_off();
        delay_ms(500);
    }
}
`),
          "Notice the `while (1)`. On a PC, `main` returns to the operating system. Firmware has nowhere to return to, so its main loop never ends. Drag the time slider and change the delay.",
        ),
        widget: { type: "emb-blink", props: { delayMs: 500 } },
      },
      {
        kind: "question",
        title: "Four blinks a second",
        body: "Set the delay so the LED blinks **4 times per second**.",
        widget: { type: "emb-blink", props: { delayMs: 500 } },
        question: {
          type: "widget",
          goal: { freqHz: 4, secondDelay: true },
          prompt: "Choose the delay D that gives a blink rate of 4 Hz.",
          hint: "One blink is on for D and off for D. How long is one blink if there are four per second?",
        },
        explanation: "Four blinks a second means each blink lasts 1000 ms ÷ 4 = **250 ms**: on for 125 ms and off for 125 ms. So D = **125 ms**. The blink rate is 1000 ÷ (2 × D) per second.",
      },
      {
        kind: "question",
        title: "Work out the delay",
        body: "You want the LED to blink **5 times per second**, on and off for equal times. Work out the delay D, in **milliseconds**.",
        question: { type: "number", answer: 100, tolerance: 0, unit: "ms", hint: "One blink = D on + D off. Five of them fit in 1000 ms." },
        explanation: "5 blinks per second → each blink is 200 ms → D = **100 ms** on and 100 ms off.",
      },
      {
        kind: "question",
        title: "The LED that never blinks",
        body: "A teammate \"tidied up\" the program and deleted the second `delay_ms`. Now the LED looks **always on**. Find the bug in the widget and make the LED blink **once per second** again.",
        widget: { type: "emb-blink", props: { delayMs: 250, bug: true } },
        question: {
          type: "widget",
          goal: { freqHz: 1, secondDelay: true },
          prompt: "Put the second delay back and pick the delay for 1 blink per second.",
          hint: "Without the second delay, how long does the LED stay off before led_on() runs again?",
        },
        explanation: "Without the second delay, `led_off()` is followed at once by `led_on()` at the top of the loop. The LED is off for about a **microsecond** per loop, far too short to see, so it looks always on. With both delays at **500 ms** it blinks once per second.",
      },
      {
        kind: "question",
        title: "Before the first blink",
        body: "On a real MCU, put the steps of the blink program in the order they must happen.",
        question: {
          type: "order",
          items: [
            "Turn on the clock to the GPIO port (peripherals start switched off to save power)",
            "Set the LED's pin to output mode",
            "Drive the pin high: the LED turns on",
            "Wait",
            "Drive the pin low: the LED turns off",
            "Wait, then go back to the start of the loop",
          ],
          hint: "Nothing works on a peripheral whose clock is off, and a pin must be an output before it can drive the LED.",
        },
        explanation: "On most MCUs every peripheral's clock is **off after reset** to save power, so the first job is switching on the clock for the GPIO port (through a clock-control register). Then the pin becomes an output, and the loop starts. Forgetting the clock is one of the most common reasons a first program does nothing.",
      },
      {
        kind: "recap",
        points: [
          "A **microcontroller** (MCU) is a whole small computer on one chip: CPU, **flash** for the program, **SRAM** for data, and **peripherals**.",
          "MCUs trade speed and memory (MHz, kilobytes) for tiny size, low cost and milliwatts of power. Many run **no operating system**.",
          "The program is **firmware**. Its `main` loop never returns: there is nothing to return to.",
          "Blinking an LED is embedded \"Hello, world\". Blink rate = 1000 ÷ (2 × D) per second for a delay of D ms.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Registers and memory-mapped I/O ───────────────────────────────
  {
    id: "fnd-emb-2-registers",
    title: "Registers and memory-mapped I/O",
    summary: "Peripherals appear as addresses. Set, clear and toggle bits with masks, and why volatile exists.",
    minutes: 10,
    xp: 50,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "Hardware at an address",
        body: P(
          "In *Memory is a row of numbered boxes* every byte had an address. A microcontroller uses the same idea for its hardware. The address space is cut into regions: flash at the bottom, SRAM higher up, and a big region where the addresses are **not memory at all**: each one is a **register** inside a peripheral.",
          "This is called **memory-mapped I/O**. To switch a pin on, the CPU does an ordinary store to a special address. The bus (from *Buses: how the parts talk*) carries the write to the GPIO hardware instead of to RAM, and the pin changes.",
          "The map below is a toy MCU, laid out like common 32-bit (Arm Cortex-M class) chips. Look up a few addresses.",
        ),
        widget: { type: "emb-memmap", props: {} },
      },
      {
        kind: "question",
        title: "Find the output register",
        body: "The GPIOA port starts at base address **0x4002_0000**. Its output data register **ODR** sits at offset **0x14**. Type ODR's address in the widget.",
        widget: { type: "emb-memmap", props: { presets: [0x2000_0000, 0x4002_0000] } },
        question: {
          type: "widget",
          goal: { peripheral: "gpioa", reg: "ODR" },
          prompt: "Look up the address of GPIOA's ODR register.",
          hint: "A register's address is the peripheral's base address plus the register's offset.",
        },
        explanation: "0x4002_0000 + 0x14 = **0x4002_0014**. Writing a number there sets the output pins of port A; reading it gives back what you last wrote. Datasheets and reference manuals list every peripheral's base address and every register's offset in exactly this way.",
      },
      {
        kind: "explain",
        title: "One bit per pin",
        body: P(
          "Inside ODR, **bit n controls pin n**: bit 5 = 1 drives pin 5 high. In C you reach the register through a pointer to that address (you met pointers in *Pointers*). Chip vendors wrap this in a struct so you can write `GPIOA->ODR`:",
          c(`
#define GPIOA_ODR (*(volatile uint32_t *)0x40020014u)

GPIOA_ODR |=  (1u << 5);   // set bit 5: pin 5 high
GPIOA_ODR &= ~(1u << 5);   // clear bit 5: pin 5 low
GPIOA_ODR ^=  (1u << 5);   // toggle bit 5
`),
          "The trick is the **mask**: `1u << 5` is a number with only bit 5 set (0x20). OR with it sets that bit, AND with its inverse clears it, XOR flips it. Every other bit is left alone. Try it: build a mask, pick an operation and apply it.",
        ),
        widget: { type: "emb-reg", props: {} },
      },
      {
        kind: "question",
        title: "Pin 5 on, nothing else touched",
        body: "Pins 0 and 7 are already on (other code is using them). Turn on **pin 5** without changing any other pin and without `=`.",
        widget: { type: "emb-reg", props: { initial: 0b1000_0001, allowAssign: true } },
        question: {
          type: "widget",
          goal: { value: 0b1010_0001, noAssign: true },
          prompt: "Get ODR to 1010 0001 using set, clear or toggle.",
          hint: "Make a mask with only bit 5, then use the operation that turns bits on.",
        },
        explanation: "`ODR |= (1u << 5)` turns 1000 0001 into **1010 0001** (0xA1): bit 5 is now on and bits 0 and 7 are untouched. That read-modify-write with a mask is the everyday move of firmware.",
      },
      {
        kind: "question",
        title: "Two changes, two writes",
        body: "Start again from 1000 0001. In **at most two writes**, and without `=`, turn **pin 7 off** and **pin 3 on**.",
        widget: { type: "emb-reg", props: { initial: 0b1000_0001, allowAssign: true } },
        question: {
          type: "widget",
          goal: { value: 0b0000_1001, maxOps: 2, noAssign: true },
          prompt: "Reach 0000 1001 in two operations or fewer.",
          hint: "One write can clear bit 7, another can set bit 3. Toggle would also work for both, since you know their current values.",
        },
        explanation: "`ODR &= ~(1u << 7)` then `ODR |= (1u << 3)` gives **0000 1001**. Toggling both bits in a single XOR with mask 1000 1000 also works here, because you know bit 7 is on and bit 3 is off. Set and clear are safer when you are not sure of the current value.",
      },
      {
        kind: "question",
        title: "The tempting shortcut",
        body: "Pins 0 and 7 drive a motor and a buzzer. What does `GPIOA->ODR = (1u << 5);` do?",
        question: {
          type: "choice",
          options: [
            "Turns pin 5 on and leaves the others alone",
            "Turns pin 5 on and turns every other pin of the port off, including the motor and buzzer",
            "Nothing: you must use |= to write a register",
            "Toggles pin 5",
          ],
          answer: 1,
          hint: "= writes the whole 32-bit number. Which bits of (1u << 5) are 1?",
          feedback: {
            0: "Only |= and &= ~ keep the other bits. = replaces the whole register with 0x20.",
            2: "= is a perfectly valid write. That is exactly the danger: it works, and it clears everything else.",
            3: "Toggling needs ^=. This writes a fixed value.",
          },
        },
        explanation: "Plain `=` writes the whole register: 0x20 has only bit 5 set, so pins 0 and 7 are switched **off**. Use masks with `|=`, `&= ~` and `^=` to change only your bits. (Many GPIOs also have a **set/reset register**, often called BSRR, where writing a 1 sets or clears just that pin in one write, so two pieces of code cannot undo each other's changes.)",
      },
      {
        kind: "code",
        title: "Bit helpers",
        body: P(
          "Write the four helpers firmware uses all day. Each takes a register value `v` and a bit number `n` and returns the new value (or, for `read_bit`, 0 or 1).",
          "Python's `|`, `&`, `^`, `~` and `<<` work just like C's.",
        ),
        language: "python",
        starter: `def set_bit(v, n):
    return v

def clear_bit(v, n):
    return v

def toggle_bit(v, n):
    return v

def read_bit(v, n):
    return -1
`,
        solution: `def set_bit(v, n):
    return v | (1 << n)

def clear_bit(v, n):
    return v & ~(1 << n)

def toggle_bit(v, n):
    return v ^ (1 << n)

def read_bit(v, n):
    return (v >> n) & 1
`,
        tests: [
          { id: "set", description: "set_bit(0b10000001, 5) is 0b10100001", assertionCode: `assert set_bit(0b10000001, 5) == 0b10100001, f"got {bin(set_bit(0b10000001, 5))}"` },
          { id: "clear", description: "clear_bit(0xFF, 0) is 0xFE", assertionCode: `assert clear_bit(0xFF, 0) == 0xFE, f"got {hex(clear_bit(0xFF, 0))}"` },
          { id: "toggle", description: "toggle_bit flips a bit both ways", assertionCode: `assert toggle_bit(0b0100, 2) == 0 and toggle_bit(0, 2) == 0b0100, "toggle_bit should flip bit 2"` },
          { id: "read", description: "read_bit reads 1 and 0", assertionCode: `assert read_bit(0b0100, 2) == 1 and read_bit(0b0100, 1) == 0, "read_bit(0b0100, 2) is 1 and read_bit(0b0100, 1) is 0"` },
        ],
        hints: ["The mask for bit n is 1 << n.", "Clear: AND with the mask's inverse, ~(1 << n). Read: shift right by n and keep the lowest bit with & 1."],
      },
      {
        kind: "explain",
        title: "Why volatile",
        body: P(
          "A C compiler optimises: if it can prove a value cannot change, it reads it once and keeps it in a CPU register. That is great for normal variables, and wrong for hardware registers and for variables changed by an **interrupt**, which the compiler cannot see.",
          "The keyword `volatile` tells it: *every read and every write in the source must really happen, in that order*. That is why the register pointer above is `volatile uint32_t *`. Try the flag below with and without volatile, at the optimisation levels -O0 (none) and -O2 (normal).",
        ),
        widget: { type: "emb-volatile", props: { initialVolatile: false, initialOpt: "O2" } },
      },
      {
        kind: "question",
        title: "What volatile promises",
        body: "Which statement about `volatile` is **true**?",
        question: {
          type: "choice",
          options: [
            "It makes `count++` atomic, so an interrupt cannot break it",
            "It makes accesses from two CPU cores happen in a fixed order",
            "It makes the variable faster, because it is kept in a register",
            "It stops the compiler caching or removing reads and writes of that variable",
          ],
          answer: 3,
          hint: "volatile is an instruction to the compiler about reads and writes, nothing more.",
          feedback: {
            0: "No. `count++` is still a load, an add and a store; an interrupt can land between them. The interrupts lesson shows the fix.",
            1: "No. Ordering between cores needs atomics or memory barriers (see *Memory ordering and atomics*).",
            2: "The opposite: volatile forces a real memory access every time, so it is usually a little slower.",
          },
        },
        explanation: "volatile means *the value can change behind the compiler's back, so always really read and write it*. It is essential for hardware registers and for flags shared with interrupts. It does **not** make an operation atomic and does **not** order memory between cores: those need interrupts off, atomics or barriers.",
      },
      {
        kind: "recap",
        points: [
          "**Memory-mapped I/O**: peripheral registers have addresses; reading and writing them talks to hardware. Address = **base + offset**.",
          "Change single bits with a **mask**: `|=` sets, `&= ~` clears, `^=` toggles, `(v >> n) & 1` reads. Plain `=` overwrites every bit.",
          "`volatile` makes the compiler perform every read and write of a variable. Use it for registers and for data shared with interrupts.",
          "volatile is **not** atomicity and **not** ordering between cores.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. GPIO in depth ───────────────────────────────
  {
    id: "fnd-emb-3-gpio",
    title: "GPIO in depth",
    summary: "Input and output modes, pull-ups and pull-downs, push-pull vs open-drain, reading a button and debouncing it.",
    minutes: 10,
    xp: 60,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "One pin, many settings",
        body: P(
          "A **GPIO** (general-purpose input/output) pin is set up through a few registers. The **mode** register gives each pin 2 bits: 00 input, 01 output, 10 alternate function (the pin is handed to a peripheral such as a UART), 11 analog (for the ADC). A **pull** register can connect a weak internal resistor to 3.3 V (**pull-up**) or to ground (**pull-down**).",
          "Start here: the pin is an input with nothing connected and no pull resistor. Look at what it reads. Then try a pull-up or a pull-down.",
        ),
        widget: { type: "emb-gpio", props: { initial: { mode: "input", pull: "none", wiring: "none" } } },
      },
      {
        kind: "question",
        title: "Nothing connected",
        body: "An input pin has **nothing connected** and **no pull resistor**. What does reading it give?",
        question: {
          type: "choice",
          options: [
            "Always 0, because no voltage means zero",
            "Unpredictable values: the pin floats and picks up noise",
            "Always 1",
            "An error from the GPIO peripheral",
          ],
          answer: 1,
          hint: "An input draws almost no current. What sets its voltage if nothing is connected?",
          feedback: {
            0: "An unconnected input is not at 0 V; it is at no defined voltage at all. It can read 0, 1 or flip between them.",
            2: "Nothing pulls it high either, unless you enable a pull-up.",
            3: "The hardware cannot tell; it simply reads whatever voltage happens to be on the pin.",
          },
        },
        explanation: "A CMOS input is like a tiny capacitor with almost no leakage, so with nothing driving it the voltage **floats**: it drifts, picks up noise from nearby wires, even from your finger. Reads are random. A pull resistor gives the pin a defined level whenever nothing else drives it.",
      },
      {
        kind: "question",
        title: "Read a button",
        body: "A push button connects the pin to **ground** when pressed. Configure the pin so it reads **1 when released** and **0 when pressed**.",
        widget: { type: "emb-gpio", props: { initial: { mode: "input", pull: "none", wiring: "gnd" } } },
        question: {
          type: "widget",
          goal: { mode: "input", wiring: "gnd", readReleased: 1, readPressed: 0, noConflict: true },
          prompt: "Choose the mode and pull resistor so released reads 1 and pressed reads 0.",
          hint: "When the button is open, nothing drives the pin. Which pull resistor makes that read 1?",
        },
        explanation: "Input with a **pull-up**: released, the pull-up holds the pin at 3.3 V (reads 1); pressed, the button connects it straight to ground and wins against the weak resistor (reads 0). The logic is **active low**: 0 means pressed. This is the most common way to wire a button, because it needs only the button and the MCU's internal resistor.",
      },
      {
        kind: "question",
        title: "The cost of a pull-up",
        body: "While the button is held, current flows from 3.3 V through the internal pull-up (**40 kΩ**, a typical value) to ground. Work out that current in **microamps (µA)**.",
        question: { type: "number", answer: 82.5, tolerance: 1, unit: "µA", hint: "Ohm's law: I = V ÷ R. Then convert amps to microamps (× 1,000,000)." },
        explanation: "I = 3.3 V ÷ 40,000 Ω = 0.0000825 A = **82.5 µA**. Small, but for a battery device that sleeps at a few µA, a button held down (or a pull-up fighting a sensor's output all day) can dominate the battery drain. Datasheets give the pull resistor as a range, often about 30 to 50 kΩ.",
      },
      {
        kind: "explain",
        title: "Push-pull and open-drain",
        body: P(
          "An output can drive in two ways. **Push-pull** has two transistors: one connects the pin to 3.3 V for a 1, the other to ground for a 0. Strong in both directions.",
          "**Open-drain** has only the bottom transistor. Writing 0 pulls the pin low; writing 1 just **lets go**, and something else (a pull-up resistor) must pull it high. That sounds weaker, but it means several chips can share one wire safely: anyone can pull it low, nobody can fight by driving it high. I²C buses work exactly like this (next lessons), and it also lets a 3.3 V chip signal to a line pulled up to another voltage, if the pin tolerates it.",
          "Try an output pin with a button to ground wired to it, in both output types. Press the button while the output is 1.",
        ),
        widget: { type: "emb-gpio", props: { initial: { mode: "output", otype: "push-pull", out: 1, pull: "none", wiring: "gnd" } } },
      },
      {
        kind: "question",
        title: "Share the line safely",
        body: "Another device can pull this line to ground at any time (the button stands in for it). Configure the pin as an **output that can never fight it**, and that reads **1 while nobody pulls low**.",
        widget: { type: "emb-gpio", props: { initial: { mode: "output", otype: "push-pull", out: 1, pull: "none", wiring: "gnd" }, hide: ["wiring"] } },
        question: {
          type: "widget",
          goal: { mode: "output", otype: "open-drain", wiring: "gnd", noConflict: true, readReleased: 1 },
          prompt: "Pick output type, pull and output value so pressing the button never causes a short and the released line reads 1.",
          hint: "A push-pull output driving 1 shorts against anything pulling low. Which output type only ever pulls low? Then something must pull the line up.",
        },
        explanation: "**Open-drain with a pull-up**, writing 1: the pin lets go, the pull-up makes the line 1, and when the other device pulls low there is no fight, just a 0 that both sides can read. With push-pull at 1, pressing the button joins 3.3 V straight to ground through the pin: a short that can damage it.",
      },
      {
        kind: "explain",
        title: "Buttons bounce",
        body: P(
          "A mechanical button does not close cleanly. The metal contacts **bounce** for a few milliseconds, so the pin flips between 0 and 1 several times before it settles. A program that counts every falling edge sees one press as several.",
          "The fix in software is **debouncing**: read the pin at regular intervals, and only believe a new level after it has stayed the same for several reads in a row. Look at the raw trace (zoom in on the press), then change how often the code reads and how many reads must agree.",
        ),
        widget: { type: "emb-debounce", props: { bounceMs: 5, sampleMs: 1, stable: 1 } },
      },
      {
        kind: "question",
        title: "One press is one press",
        body: "With bounces lasting **up to 5 ms**, tune the debouncer so it sees **exactly one press**, with a delay of **at most 10 ms** after the first contact.",
        widget: { type: "emb-debounce", props: { bounceMs: 5, sampleMs: 1, stable: 1 } },
        question: {
          type: "widget",
          goal: { presses: 1, maxDelayMs: 10, minBounceMs: 5 },
          prompt: "Pick a read interval and a number of agreeing reads that filter the bounce but react within 10 ms.",
          hint: "The reads that must agree should cover more time than the bounce lasts, but not much more.",
        },
        explanation: "Reading every 1 ms and requiring about 5 to 8 agreeing reads covers the bounce and still reacts within 10 ms. Too few reads lets bounces through as extra presses; too many, or reading too rarely, makes the button feel sluggish. People notice delays above about 50 to 100 ms, so there is room, but a 5 ms bounce needs at least 5 ms of agreement.",
      },
      {
        kind: "question",
        title: "Just use the interrupt?",
        body: "A colleague suggests: \"Skip the polling, set the pin to fire an interrupt on every falling edge and count those.\" What happens?",
        question: {
          type: "choice",
          options: [
            "Each bounce fires its own interrupt, so one press is counted several times, unless the handler ignores further edges for a while",
            "It works perfectly: interrupts are immune to bounce",
            "The interrupt never fires, because bounces are too fast",
            "The MCU resets",
          ],
          answer: 0,
          hint: "The interrupt reacts to edges. How many falling edges does one bouncy press make?",
          feedback: {
            1: "The interrupt hardware sees the same bouncing edges the polling code does, and reacts even faster.",
            2: "Edge detection is fast enough to catch bounces of microseconds. That is the problem.",
            3: "Nothing resets; the count is just wrong.",
          },
        },
        explanation: "The interrupt fires on **every** bounce edge. Edge interrupts are still useful, for example to wake a sleeping chip, but the handler must then debounce: note the time and ignore edges for the next few milliseconds, or start a timer and read the settled level later. Hardware debouncing (a resistor-capacitor filter into a Schmitt-trigger input) is another option.",
      },
      {
        kind: "recap",
        points: [
          "Each pin has a **mode** (input, output, alternate function, analog), set through 2 bits in a mode register.",
          "An unconnected input **floats**. A **pull-up** or **pull-down** resistor (internal ones are typically 30 to 50 kΩ) gives it a defined level.",
          "A button to ground with a pull-up reads **1 released, 0 pressed** (active low). The pull-up costs current while pressed: I = V ÷ R.",
          "**Push-pull** drives both ways; **open-drain** only pulls low, so shared lines (like I²C) need it, plus a pull-up.",
          "Buttons **bounce** for milliseconds. Debounce by requiring several agreeing reads in a row.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Timers and PWM ───────────────────────────────
  {
    id: "fnd-emb-4-timers",
    title: "Timers and PWM",
    summary: "Prescalers and auto-reload, compare values and duty cycle: dim an LED and point a servo.",
    minutes: 10,
    xp: 60,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "A counter that ticks by itself",
        body: P(
          "`delay_ms` wastes the CPU: it just spins. A **timer** is a peripheral that counts clock pulses on its own while the CPU does other work. You met the clock in *The clock*; a timer counts its ticks.",
          "Two registers shape it. The **prescaler** (PSC) divides the clock: the counter ticks at clock ÷ (PSC + 1). The **auto-reload** register (ARR) sets where it wraps: it counts 0, 1, … ARR, then back to 0. Each wrap is an **update event** that can raise an interrupt.",
          "So the wrap rate is clock ÷ ((PSC + 1) × (ARR + 1)). The \"+ 1\"s are there because 0 counts too. Here the timer clock is 16 MHz, PSC = 15999 and ARR = 999.",
        ),
        widget: { type: "emb-pwm", props: { mode: "timer", clockHz: 16_000_000, psc: 15999, arr: 999, ccr: 0 } },
      },
      {
        kind: "question",
        title: "Divide the clock",
        body: "The timer clock is **16 MHz** and PSC = **159**. Work out the tick rate of the counter, in **kHz**.",
        question: { type: "number", answer: 100, tolerance: 0, unit: "kHz", hint: "Tick rate = clock ÷ (PSC + 1)." },
        explanation: "16,000,000 ÷ (159 + 1) = 100,000 ticks per second = **100 kHz**, one tick every 10 µs.",
      },
      {
        kind: "question",
        title: "A 1 ms tick",
        body: "With PSC fixed at **15** (a 1 MHz tick), set ARR so the timer wraps **1000 times a second**, one interrupt every millisecond.",
        widget: { type: "emb-pwm", props: { mode: "timer", clockHz: 16_000_000, psc: 15, arr: 99, ccr: 0, lock: ["psc", "ccr"] } },
        question: {
          type: "widget",
          goal: { freqHz: 1000 },
          prompt: "Choose ARR for an overflow rate of 1 kHz.",
          hint: "At 1 MHz, how many ticks fit in 1 ms? The counter counts from 0 to ARR, which is ARR + 1 ticks.",
        },
        explanation: "1 MHz ÷ 1000 per second = 1000 ticks per period, so ARR + 1 = 1000 and **ARR = 999**. A steady 1 ms interrupt like this is the classic **system tick**: it counts milliseconds for `delay` and timeouts, and an RTOS uses one to switch tasks.",
      },
      {
        kind: "explain",
        title: "PWM: on for part of each period",
        body: P(
          "A timer channel can also drive a pin. With a **compare register** (CCR), the output is **high while the counter is below CCR** and low for the rest of the period. That makes a square wave whose high share, the **duty cycle**, is CCR ÷ (ARR + 1). This is **PWM**, pulse-width modulation.",
          "Switch an LED on and off faster than about 100 times a second and your eye averages it: 25% duty looks dim, 100% looks fully on. The same trick sets motor speed and heater power, with no analog circuit at all. Move CCR and watch the scope.",
        ),
        widget: { type: "emb-pwm", props: { mode: "led", clockHz: 16_000_000, psc: 15, arr: 999, ccr: 500 } },
      },
      {
        kind: "question",
        title: "Dim to a quarter",
        body: "Dim the LED to **25% duty** with a PWM frequency of **1 kHz**.",
        widget: { type: "emb-pwm", props: { mode: "led", clockHz: 16_000_000, psc: 15, arr: 999, ccr: 500 } },
        question: {
          type: "widget",
          goal: { freqHz: 1000, duty: 0.25 },
          prompt: "Set PSC, ARR and CCR for 1 kHz at 25% duty.",
          hint: "The frequency is already 1 kHz. Duty = CCR ÷ (ARR + 1).",
        },
        explanation: "With ARR = 999 there are 1000 ticks per period, so **CCR = 250** gives 250 ÷ 1000 = 25%. Brightness is not perceived linearly (25% duty looks brighter than a quarter), so lighting code often uses a correction curve.",
      },
      {
        kind: "code",
        title: "The PWM formula",
        body: "Write `pwm(clock, prescaler, arr, ccr)` that returns `(freq, duty)`: the PWM frequency in Hz and the duty cycle as a fraction from 0 to 1. A CCR above ARR means the output is always high (duty 1).",
        language: "python",
        starter: `def pwm(clock, prescaler, arr, ccr):
    # freq = clock / ((prescaler + 1) * (arr + 1))
    # duty = ccr / (arr + 1), at most 1
    return (0, 0)
`,
        solution: `def pwm(clock, prescaler, arr, ccr):
    steps = arr + 1
    freq = clock / ((prescaler + 1) * steps)
    duty = min(ccr, steps) / steps
    return (freq, duty)
`,
        tests: [
          { id: "led", description: "16 MHz, PSC 15, ARR 999, CCR 250 gives 1 kHz at 25%", assertionCode: `f, d = pwm(16_000_000, 15, 999, 250)\nassert abs(f - 1000) < 1e-6 and abs(d - 0.25) < 1e-9, f"got {(f, d)}"` },
          { id: "servo", description: "16 MHz, PSC 15, ARR 19999, CCR 1500 gives 50 Hz at 7.5%", assertionCode: `f, d = pwm(16_000_000, 15, 19999, 1500)\nassert abs(f - 50) < 1e-6 and abs(d - 0.075) < 1e-9, f"got {(f, d)}"` },
          { id: "full", description: "CCR above ARR means 100% duty", assertionCode: `f, d = pwm(1_000_000, 0, 99, 150)\nassert abs(f - 10000) < 1e-6 and d == 1, f"got {(f, d)}"` },
        ],
        hints: ["There are arr + 1 ticks per period, and the counter ticks at clock / (prescaler + 1).", "Cap the duty with min(ccr, arr + 1)."],
      },
      {
        kind: "explain",
        title: "Driving a servo",
        body: P(
          "A hobby **servo** reads its angle from the **width** of a pulse that repeats about every **20 ms** (50 Hz). Typically 1.0 ms means one end, 1.5 ms the middle and 2.0 ms the other end (real servos vary; some use 0.5 to 2.5 ms, so check yours).",
          "Pick the timer settings so the arithmetic is easy: with a 1 MHz tick (PSC = 15 on a 16 MHz clock) each tick is 1 µs, so ARR = 19999 gives a 20 ms period, and **CCR is simply the pulse width in microseconds**.",
          "Safety: servos and motors draw large current spikes. Power them from their own supply, not from the MCU's pins, and connect the grounds.",
        ),
      },
      {
        kind: "question",
        title: "Point it straight ahead",
        body: "Point the servo at **90°** (a 1.5 ms pulse on the typical mapping) while keeping the pulses at **50 Hz**.",
        widget: { type: "emb-pwm", props: { mode: "servo", clockHz: 16_000_000, psc: 15, arr: 19999, ccr: 1000 } },
        question: {
          type: "widget",
          goal: { freqHz: 50, angle: 90 },
          prompt: "Set CCR so the pulse is 1.5 ms long, at 50 Hz.",
          hint: "Each tick is 1 µs here. How many ticks is 1.5 ms?",
        },
        explanation: "**CCR = 1500** ticks of 1 µs = a 1.5 ms pulse, the middle position. The duty is only 7.5%: what the servo cares about is the pulse **width**, not the duty. CCR = 1000 is 0° and 2000 is 180° on this mapping.",
      },
      {
        kind: "question",
        title: "Fast PWM costs resolution",
        body: "A motor driver wants **100 kHz** PWM from a **16 MHz** timer clock with PSC = 0. How many **duty steps** (ARR + 1) do you get? Work it out.",
        question: { type: "number", answer: 160, tolerance: 0, unit: "steps", hint: "ARR + 1 = clock ÷ ((PSC + 1) × frequency)." },
        explanation: "16,000,000 ÷ 100,000 = **160** ticks per period, so the duty can only change in steps of 1/160 (about 0.6%). Faster PWM means fewer steps. That is the timer trade-off: frequency × resolution can never exceed the timer clock.",
      },
      {
        kind: "recap",
        points: [
          "A **timer** counts on its own: tick rate = clock ÷ (PSC + 1); it wraps after ARR, so the update rate is clock ÷ ((PSC + 1) × (ARR + 1)).",
          "A 1 ms update interrupt is the classic **system tick**.",
          "**PWM**: the output is high while the counter is below CCR, so duty = CCR ÷ (ARR + 1). Fast enough, it dims LEDs and sets motor power.",
          "Servos read the **pulse width** (typically 1 to 2 ms every 20 ms). A 1 µs tick makes CCR the width in microseconds.",
          "Frequency × duty steps = the timer clock: faster PWM means coarser duty.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 5. Interrupts ───────────────────────────────
  {
    id: "fnd-emb-5-interrupts",
    title: "Interrupts",
    summary: "ISRs and the vector table, priorities and nesting, latency, keeping handlers short, and races on shared data.",
    minutes: 11,
    xp: 65,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Don't call us, we'll call you",
        body: P(
          "You met interrupts in *Input, output and interrupts*: instead of the CPU asking a device \"anything new?\" again and again (**polling**), the device raises a signal and the CPU drops what it is doing to handle it.",
          "On a microcontroller, each interrupt source (a timer, a UART, a pin…) has an entry in the **vector table**, a list of handler addresses at the start of flash. When an interrupt fires, the hardware saves the registers the current code was using, looks up the address and jumps to the **interrupt service routine** (ISR). When the ISR returns, the registers are restored and the main code continues as if nothing had happened.",
          c(`
void TIM2_IRQHandler(void) {   // its address sits in the vector table
    TIM2->SR &= ~TIM_SR_UIF;   // clear the flag, or it fires again at once
    ticks++;
}
`),
          "Below, a timer interrupt arrives while the main loop runs. Look at the timeline: entry, the ISR body, exit.",
        ),
        widget: { type: "emb-irq", props: { sources: ["tim"], lockNesting: true } },
      },
      {
        kind: "question",
        title: "What the table holds",
        body: "What does an entry in the **vector table** contain?",
        question: {
          type: "choice",
          options: [
            "The machine code of the interrupt handler",
            "The interrupt's priority",
            "A copy of the CPU's registers",
            "The address of the handler to jump to",
          ],
          answer: 3,
          hint: "\"Vector\" here means a pointer: something that says where to go.",
          feedback: {
            0: "The handlers' code lives with the rest of the program in .text; the table only points at it.",
            1: "Priorities live in the interrupt controller's own registers.",
            2: "Registers are saved on the stack when the interrupt is taken, not in the table.",
          },
        },
        explanation: "Each entry is an **address**. On Arm Cortex-M the very first word is special: the initial stack pointer, and the second is the reset handler, where the program starts. You will meet them again in the boot lesson.",
      },
      {
        kind: "explain",
        title: "Priorities and nesting",
        body: P(
          "With several interrupt sources, the **interrupt controller** decides who goes first. Each source gets a **priority**. On Arm Cortex-M (and in this widget) a **lower number means more urgent**. If a more urgent interrupt arrives while a less urgent ISR runs, it can **preempt** it: the running ISR is paused and the new one runs on top. That is **nesting**. Equal or lower priority waits until the running ISR finishes.",
          "The time from the request to the first instruction of the ISR is the **interrupt latency**. Here the timer ISR (10 µs) and a UART byte arrive at the same priority. Look at how long the UART waits.",
        ),
        widget: { type: "emb-irq", props: { sources: ["tim", "uart"] } },
      },
      {
        kind: "question",
        title: "Don't lose the byte",
        body: "The UART holds only one received byte. If its ISR does not start within **3 µs**, the next byte overwrites it. Make the UART's latency **3 µs or less**.",
        widget: { type: "emb-irq", props: { sources: ["tim", "uart"], prios: { tim: 2, uart: 2 }, nesting: false } },
        question: {
          type: "widget",
          goal: { maxLatency: { uart: 3 } },
          prompt: "Change priorities and nesting until the UART's latency is at most 3 µs.",
          hint: "The UART must be allowed to interrupt the timer's ISR. That needs two things.",
        },
        explanation: "Give the UART a **more urgent priority** (a lower number than the timer) **and** allow **nesting**: then it preempts the timer ISR and starts after just the entry time. With equal priority, or nesting off, it waits for the whole 10 µs timer ISR. Rule of thumb: the shorter the deadline, the more urgent the priority.",
      },
      {
        kind: "question",
        title: "Real latency",
        body: "A Cortex-M class core needs about **12 clock cycles** to save registers and start an ISR. At **48 MHz**, how many **nanoseconds** is that?",
        question: { type: "number", answer: 250, tolerance: 2, unit: "ns", hint: "One cycle at 48 MHz lasts 1 ÷ 48,000,000 s. Multiply by 12." },
        explanation: "12 ÷ 48,000,000 s = 0.00000025 s = **250 ns**. In practice the latency also includes any time interrupts are disabled and any higher-priority ISR running, which is why the next rule matters.",
      },
      {
        kind: "explain",
        title: "Rules for ISRs",
        body: P(
          "While an ISR runs, everything of equal or lower priority waits. So:",
          "- **Keep it short**: grab the data, clear the flag, set a flag or put the data in a buffer, and return. Do the slow work in the main loop or a task.\n- **Never wait** inside an ISR: no `delay`, no waiting for another interrupt, no `printf` over a slow UART.\n- **Clear the interrupt flag**, or the ISR runs again the moment it returns.\n- Be careful with **shared data**: anything the ISR and the main code both touch needs `volatile`, and often more.",
        ),
      },
      {
        kind: "question",
        title: "What belongs in the ISR?",
        body: "A UART interrupt fires for every received byte. Which of these should the ISR do?",
        question: {
          type: "choice",
          options: [
            "Wait 100 ms for the rest of the message to arrive",
            "printf the byte to a debug console running at 9600 baud",
            "Copy the byte into a ring buffer and set a flag for the main loop",
            "Parse the whole command and update the display",
          ],
          answer: 2,
          hint: "Which option finishes in a few microseconds, so the next byte is not missed?",
          feedback: {
            0: "Waiting inside an ISR blocks every equal and lower priority interrupt, including the next byte of the same message.",
            1: "At 9600 baud each character takes about a millisecond to send; the ISR would block far too long.",
            3: "Parsing and drawing are slow work. Do them in the main loop once the flag says a full line arrived.",
          },
        },
        explanation: "Store and signal: copy the byte into a **ring buffer** (a circular array) and return. The main loop sees the flag, takes bytes out at its leisure and does the slow parts. This split, a tiny ISR and the real work outside, is the standard shape of interrupt-driven firmware.",
      },
      {
        kind: "explain",
        title: "A race on shared data",
        body: P(
          "Both the main loop and a timer ISR do `count++` on the same variable. In *Memory: LOAD and STORE* you saw that the CPU cannot add to memory directly: `count++` is **three instructions** (load into a register, add 1, store back).",
          "If the interrupt lands **between** main's load and store, the ISR's increment is overwritten by main's stale value: one update is lost. It happens rarely, which makes it a nasty bug. Move the interrupt's arrival point and watch `count`.",
        ),
        widget: { type: "emb-race", props: { fix: "none", irqAfter: 1 } },
      },
      {
        kind: "question",
        title: "Fix the race",
        body: "Choose a fix that gives the right count (7) **for every arrival point** of the interrupt.",
        widget: { type: "emb-race", props: { fix: "none", irqAfter: 1 } },
        question: {
          type: "widget",
          goal: { worksForAll: true },
          prompt: "Pick a fix so the result is 7 whether the interrupt arrives before, between or after main's instructions.",
          hint: "volatile makes the loads and stores real, but does it stop the interrupt landing between them?",
        },
        explanation: "**Interrupts off** around the three instructions makes them a **critical section**: the ISR waits until they are done (this adds latency, so keep such sections tiny). An **atomic** read-modify-write also works: Arm's exclusive load and store pair (LDREX/STREX, what C11 `atomic_fetch_add` compiles to on many cores) notices the interruption and retries. **volatile does not help**: the three steps are still separate.",
      },
      {
        kind: "recap",
        points: [
          "An interrupt makes the hardware save registers and jump to an **ISR** whose address is in the **vector table**.",
          "Each source has a **priority** (on Cortex-M, lower number = more urgent). A more urgent interrupt can **preempt** a running ISR: nesting.",
          "**Latency** = request to first ISR instruction. Long, low-urgency ISRs add latency for everyone else.",
          "Keep ISRs **short**: clear the flag, store the data, set a flag; never wait.",
          "Data shared with an ISR needs `volatile` **and** protection: a critical section (interrupts off briefly) or an atomic operation.",
        ],
      },
    ],
  },
];
