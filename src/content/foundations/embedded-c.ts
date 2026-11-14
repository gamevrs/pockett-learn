import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced C block for lesson prose. */
const c = (s: string) => "~~~c\n" + s.trim() + "\n~~~";
/** Fenced plain-text block (shell sessions, tool output). */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lesson 11. Firmware in C: registers as structs, field helpers, the build-flash-debug loop, reading a fault. */
export const emb11CFirmware: ConceptLesson = {
  id: "fnd-emb-11-c-firmware",
  title: "Firmware in C",
  summary: "How vendor headers turn registers into structs, how to change a multi-bit field safely, and how to build, flash, debug and read a crash.",
  minutes: 11,
  xp: 60,
  level: "Intermediate",
  steps: [
    // ───────────── 1 ─────────────
    {
      kind: "explain",
      title: "Registers as a struct",
      body: P(
        "In *Registers and memory-mapped I/O* a register was `base + offset`. Writing that sum by hand for every register would be tiring, so chip vendors ship a **header file** that does it once. The common style (named CMSIS, Arm's standard for Cortex-M headers) turns a whole peripheral into a **struct** whose fields sit in the same order as the registers:",
        c(`
typedef struct {
  volatile uint32_t MODER;    // 0x00  mode of each pin (2 bits per pin)
  volatile uint32_t OTYPER;   // 0x04
  volatile uint32_t OSPEEDR;  // 0x08
  volatile uint32_t PUPDR;    // 0x0C
  volatile uint32_t IDR;      // 0x10  input data
  volatile uint32_t ODR;      // 0x14  output data
  volatile uint32_t BSRR;     // 0x18  bit set/reset
  volatile uint32_t LCKR;     // 0x1C
  volatile uint32_t AFR[2];   // 0x20, 0x24  alternate functions
} GPIO_TypeDef;

#define GPIOA ((GPIO_TypeDef *) 0x40020000u)
`),
        "Each field is a 32-bit `uint32_t`, so the compiler places them 4 bytes apart in the order you wrote them: **field order is the offset**. `GPIOA->ODR` means *the 32-bit word at 0x40020000 + 0x14*. The cast in the `#define` says: treat that fixed address as a pointer to this struct (pointers: see *Pointers*). Every field is `volatile` for the reason you met in *Registers and memory-mapped I/O*.",
        "Two more registers matter. **MODER** gives each pin a **2-bit field**: 00 input, 01 output, 10 alternate function (a peripheral drives the pin), 11 analog. Pin n owns bits 2n and 2n+1. And a pin only works once its port's **clock** is on: on the STM32F4 you set bit 0 of `RCC->AHB1ENR` for port A. (This lesson uses the STM32F4 as its example. Other chip families do the same job with the same ideas and different names.)",
        "Finally **BSRR**, the *bit set/reset register*. Write a 1 to bit n and pin n goes high. Write a 1 to bit n+16 and pin n goes low. Bits you leave as 0 do nothing, so one store changes one pin and leaves the others alone, even if an interrupt also touches the port. BSRR is write-only: a read gives nothing useful, so you write it with plain `=`.",
        c(`
RCC->AHB1ENR |= 1u;                  // clock on for port A
GPIOA->MODER |= (1u << 10);          // pin 5 as output (we will improve this line)
GPIOA->BSRR   = (1u << 5);           // pin 5 high
GPIOA->BSRR   = (1u << (5 + 16));    // pin 5 low
`),
      ),
    },
    // ───────────── 2 ─────────────
    {
      kind: "code",
      title: "Blink on a model chip",
      body: P(
        "Your PC has no GPIO port at address 0x40020000, so this program uses a **model**: the same structs, but sitting in ordinary memory. A provided function `hw_step()` plays the part of the hardware: it applies what you wrote to BSRR to ODR. The registers start at **reset-like values**, as on a real STM32F4 (MODER = 0xA8000000 because pins 13 to 15 belong to the debug port; AHB1ENR = 0x00100000).",
        "Fill in four functions, changing **only the bits you mean to**:",
        "- `clocks_on()`: set bit 0 of `RCC->AHB1ENR`, leaving every other bit.",
        "- `gpio_init_output(port, pin)`: make that pin's 2-bit MODER field 01 (output), leaving every other pin's field.",
        "- `led_on(port, pin)` and `led_off(port, pin)`: use BSRR only, so no other pin can be disturbed.",
        "Watch out: `main` also set pin 5's field to 10 (alternate function) before calling you. This is a toy model; real chips have more registers and more rules.",
      ),
      language: "cpp",
      starter: String.raw`#include <cstdint>
#include <cstdio>

// A model of the chip's registers in ordinary memory, so this program runs anywhere.
typedef struct {
  volatile uint32_t MODER, OTYPER, OSPEEDR, PUPDR, IDR, ODR, BSRR, LCKR, AFR[2];
} GPIO_TypeDef;

typedef struct {
  volatile uint32_t AHB1ENR;   // the one clock-enable register this task needs
} RCC_TypeDef;

static GPIO_TypeDef gpioa_regs;
static RCC_TypeDef rcc_regs;
#define GPIOA (&gpioa_regs)
#define RCC (&rcc_regs)

// Provided: plays the part of the hardware. After you write BSRR, the chip
// resets the pins named in the high half, sets the pins named in the low half
// (set wins if both name the same pin), then BSRR reads back as 0.
static void hw_step(GPIO_TypeDef *port) {
  port->ODR &= ~(port->BSRR >> 16);
  port->ODR |= (port->BSRR & 0xFFFFu);
  port->BSRR = 0;
}

// Enable the clock of GPIOA (bit 0 of AHB1ENR) without touching the other bits.
void clocks_on(void) {
  // your code here
}

// Make pin "pin" of "port" an output: its 2-bit MODER field must become 01.
// The other pins' fields must not change.
void gpio_init_output(GPIO_TypeDef *port, unsigned pin) {
  // your code here
}

// Drive the pin high or low through BSRR only (never write ODR yourself).
void led_on(GPIO_TypeDef *port, unsigned pin) {
  // your code here
}

void led_off(GPIO_TypeDef *port, unsigned pin) {
  // your code here
}

// The checks read what main prints. Leave main as it is.
int main() {
  RCC->AHB1ENR = 0x00100000u;
  GPIOA->MODER = 0xA8000800u;
  GPIOA->ODR = 0x00000001u;

  clocks_on();
  std::printf("AHB1ENR 0x%08X\n", (unsigned)RCC->AHB1ENR);

  gpio_init_output(GPIOA, 5);
  std::printf("MODER 0x%08X\n", (unsigned)GPIOA->MODER);

  led_on(GPIOA, 5);
  std::printf("BSRR_on 0x%08X\n", (unsigned)GPIOA->BSRR);
  hw_step(GPIOA);
  std::printf("ODR_on 0x%08X\n", (unsigned)GPIOA->ODR);

  led_off(GPIOA, 5);
  std::printf("BSRR_off 0x%08X\n", (unsigned)GPIOA->BSRR);
  hw_step(GPIOA);
  std::printf("ODR_off 0x%08X\n", (unsigned)GPIOA->ODR);
  return 0;
}
`,
      solution: String.raw`#include <cstdint>
#include <cstdio>

// A model of the chip's registers in ordinary memory, so this program runs anywhere.
typedef struct {
  volatile uint32_t MODER, OTYPER, OSPEEDR, PUPDR, IDR, ODR, BSRR, LCKR, AFR[2];
} GPIO_TypeDef;

typedef struct {
  volatile uint32_t AHB1ENR;   // the one clock-enable register this task needs
} RCC_TypeDef;

static GPIO_TypeDef gpioa_regs;
static RCC_TypeDef rcc_regs;
#define GPIOA (&gpioa_regs)
#define RCC (&rcc_regs)

// Provided: plays the part of the hardware. After you write BSRR, the chip
// resets the pins named in the high half, sets the pins named in the low half
// (set wins if both name the same pin), then BSRR reads back as 0.
static void hw_step(GPIO_TypeDef *port) {
  port->ODR &= ~(port->BSRR >> 16);
  port->ODR |= (port->BSRR & 0xFFFFu);
  port->BSRR = 0;
}

// Enable the clock of GPIOA (bit 0 of AHB1ENR) without touching the other bits.
void clocks_on(void) {
  RCC->AHB1ENR |= 1u;
}

// Make pin "pin" of "port" an output: its 2-bit MODER field must become 01.
// The other pins' fields must not change.
void gpio_init_output(GPIO_TypeDef *port, unsigned pin) {
  port->MODER &= ~(3u << (pin * 2));   // clear the whole 2-bit field first
  port->MODER |= (1u << (pin * 2));    // then write 01
}

// Drive the pin high or low through BSRR only (never write ODR yourself).
void led_on(GPIO_TypeDef *port, unsigned pin) {
  port->BSRR = 1u << pin;
}

void led_off(GPIO_TypeDef *port, unsigned pin) {
  port->BSRR = 1u << (pin + 16);
}

// The checks read what main prints. Leave main as it is.
int main() {
  RCC->AHB1ENR = 0x00100000u;
  GPIOA->MODER = 0xA8000800u;
  GPIOA->ODR = 0x00000001u;

  clocks_on();
  std::printf("AHB1ENR 0x%08X\n", (unsigned)RCC->AHB1ENR);

  gpio_init_output(GPIOA, 5);
  std::printf("MODER 0x%08X\n", (unsigned)GPIOA->MODER);

  led_on(GPIOA, 5);
  std::printf("BSRR_on 0x%08X\n", (unsigned)GPIOA->BSRR);
  hw_step(GPIOA);
  std::printf("ODR_on 0x%08X\n", (unsigned)GPIOA->ODR);

  led_off(GPIOA, 5);
  std::printf("BSRR_off 0x%08X\n", (unsigned)GPIOA->BSRR);
  hw_step(GPIOA);
  std::printf("ODR_off 0x%08X\n", (unsigned)GPIOA->ODR);
  return 0;
}
`,
      tests: [
        {
          id: "clocks",
          description: "clocks_on sets bit 0 and keeps the other bits (AHB1ENR 0x00100001)",
          assertionCode: `const l = lines.find((s) => s.startsWith("AHB1ENR ")) ?? "(not printed)";
assertEqual(l, "AHB1ENR 0x00100001", "AHB1ENR started as 0x00100000; setting bit 0 with |= should give 0x00100001 (an = would lose bit 20)");`,
        },
        {
          id: "init",
          description: "gpio_init_output(GPIOA, 5) makes pin 5's field 01 (MODER 0xA8000400)",
          assertionCode: `const l = lines.find((s) => s.startsWith("MODER ")) ?? "(not printed)";
assertEqual(l, "MODER 0xA8000400", "pin 5's field started as 10: clear both bits first, then set bit 10. A bare |= gives 0xA8000C00, which is analog mode (11)");`,
        },
        {
          id: "on",
          description: "led_on writes BSRR 0x00000020 and pin 5 goes high",
          assertionCode: `const b = lines.find((s) => s.startsWith("BSRR_on ")) ?? "(not printed)";
assertEqual(b, "BSRR_on 0x00000020", "led_on(GPIOA, 5) should write 1 << 5 = 0x20 to BSRR");
const o = lines.find((s) => s.startsWith("ODR_on ")) ?? "(not printed)";
const odr = parseInt(o.split(" ")[1], 16);
assert(((odr >>> 5) & 1) === 1, "after led_on and hw_step, ODR bit 5 should be 1");`,
        },
        {
          id: "off",
          description: "led_off writes BSRR 0x00200000, pin 5 goes low and pin 0 stays high",
          assertionCode: `const b = lines.find((s) => s.startsWith("BSRR_off ")) ?? "(not printed)";
assertEqual(b, "BSRR_off 0x00200000", "led_off(GPIOA, 5) should write 1 << (5 + 16) = 0x00200000 to BSRR");
const o = lines.find((s) => s.startsWith("ODR_off ")) ?? "(not printed)";
const odr = parseInt(o.split(" ")[1], 16);
assert(((odr >>> 5) & 1) === 0, "after led_off and hw_step, ODR bit 5 should be 0");
assert((odr & 1) === 1, "ODR bit 0 was high before and led_off must not touch it");`,
        },
      ],
      hints: [
        "For a 2-bit field at pin * 2: a mask of two ones, 3u << (pin * 2), covers both bits. What must happen to those bits before you write the new value?",
        "BSRR: the low half sets pins, the high half (16 higher) resets them. A single assignment is enough, and it never needs to read anything.",
      ],
    },
    // ───────────── 3 ─────────────
    {
      kind: "question",
      title: "The 2-bit trap",
      body: P(
        "Pin 5's MODER field currently holds **10** (alternate function: a peripheral drives the pin). Some code runs this line to make it an output:",
        c(`GPIOA->MODER |= (1u << 10);`),
        "**What mode is pin 5 in afterwards?**",
      ),
      question: {
        type: "choice",
        options: [
          "Output mode (01)",
          "Analog mode (11)",
          "Input mode (00)",
          "Alternate function, unchanged (10)",
        ],
        answer: 1,
        hint: "Write out the two bits of the field, then OR in the new 1. Can OR ever turn a 1 into a 0?",
        feedback: {
          0: "That is what the programmer wanted, but OR only adds ones: the field's upper bit is still 1, so it cannot become 01.",
          2: "Input mode would need both bits to be 0. OR can never clear a bit, so the 1 already there stays.",
          3: "Bit 10 was 0 and OR sets it to 1, so the field does change.",
        },
      },
      explanation: "The field was 10. OR-ing in bit 10 gives **11**, which is **analog** mode: the pin is disconnected from the digital circuits, so the LED never lights and nothing hints why. `|=` can only add ones. To write a multi-bit field, **clear the whole field first** (`&= ~(3u << 10)`), then OR in the new value. Single-bit flags do not have this problem, which is why this bug hides for so long.",
    },
    // ───────────── 4 ─────────────
    {
      kind: "code",
      title: "A field helper",
      body: P(
        "Clear-then-set shows up for every multi-bit field: MODER (2 bits per pin), alternate-function numbers (4 bits per pin in AFR), baud-rate dividers and more. Write it once.",
        "`set_field(v, pos, width, val)` returns `v` with the `width` bits starting at bit `pos` **replaced** by `val`. Every other bit of `v` stays as it was. Assume `val` fits in `width` bits.",
        "Plan: build a mask that has `width` ones, move it up to `pos`, clear those bits in `v`, then OR in `val` moved up the same amount.",
      ),
      language: "cpp",
      starter: String.raw`#include <cstdint>
#include <cstdio>

// Return v with the "width" bits starting at bit "pos" replaced by "val".
// Bits outside the field must stay exactly as they were.
// Plan: a mask of "width" ones, moved up to "pos"; clear those bits; OR in the new value.
uint32_t set_field(uint32_t v, unsigned pos, unsigned width, uint32_t val) {
  return v;  // your code here
}

// The checks read what main prints. Leave main as it is.
int main() {
  std::printf("pin5 0x%08X\n", (unsigned)set_field(0xA8000800u, 10, 2, 1));
  std::printf("af 0x%08X\n", (unsigned)set_field(0x00000000u, 20, 4, 7));
  std::printf("zero 0x%08X\n", (unsigned)set_field(0xFFFFFFFFu, 4, 4, 0));
  std::printf("keep 0x%08X\n", (unsigned)set_field(0xFFFFFFFFu, 8, 8, 0xAB));
  std::printf("one_set 0x%08X\n", (unsigned)set_field(0x00000000u, 5, 1, 1));
  std::printf("one_clear 0x%08X\n", (unsigned)set_field(0x000000FFu, 0, 1, 0));
  return 0;
}
`,
      solution: String.raw`#include <cstdint>
#include <cstdio>

// Return v with the "width" bits starting at bit "pos" replaced by "val".
// Bits outside the field must stay exactly as they were.
// Plan: a mask of "width" ones, moved up to "pos"; clear those bits; OR in the new value.
uint32_t set_field(uint32_t v, unsigned pos, unsigned width, uint32_t val) {
  uint32_t mask = ((width >= 32) ? 0xFFFFFFFFu : ((1u << width) - 1u)) << pos;
  return (v & ~mask) | ((val << pos) & mask);
}

// The checks read what main prints. Leave main as it is.
int main() {
  std::printf("pin5 0x%08X\n", (unsigned)set_field(0xA8000800u, 10, 2, 1));
  std::printf("af 0x%08X\n", (unsigned)set_field(0x00000000u, 20, 4, 7));
  std::printf("zero 0x%08X\n", (unsigned)set_field(0xFFFFFFFFu, 4, 4, 0));
  std::printf("keep 0x%08X\n", (unsigned)set_field(0xFFFFFFFFu, 8, 8, 0xAB));
  std::printf("one_set 0x%08X\n", (unsigned)set_field(0x00000000u, 5, 1, 1));
  std::printf("one_clear 0x%08X\n", (unsigned)set_field(0x000000FFu, 0, 1, 0));
  return 0;
}
`,
      tests: [
        {
          id: "pin5",
          description: "pin 5's field goes from 10 to 01 (0xA8000800 becomes 0xA8000400)",
          assertionCode: `const l = lines.find((s) => s.startsWith("pin5 ")) ?? "(not printed)";
assertEqual(l, "pin5 0xA8000400", "set_field(0xA8000800, 10, 2, 1) should replace the field 10 with 01: 0xA8000400");`,
        },
        {
          id: "af",
          description: "a 4-bit field at bit 20 can be set to 7 (0x00700000)",
          assertionCode: `const l = lines.find((s) => s.startsWith("af ")) ?? "(not printed)";
assertEqual(l, "af 0x00700000", "set_field(0, 20, 4, 7) should put 7 in bits 20 to 23: 0x00700000");`,
        },
        {
          id: "zero",
          description: "a field can be replaced by zero (0xFFFFFFFF becomes 0xFFFFFF0F)",
          assertionCode: `const l = lines.find((s) => s.startsWith("zero ")) ?? "(not printed)";
assertEqual(l, "zero 0xFFFFFF0F", "set_field(0xFFFFFFFF, 4, 4, 0) should clear only bits 4 to 7: 0xFFFFFF0F");`,
        },
        {
          id: "keep",
          description: "bits outside the field stay as they were",
          assertionCode: `const l = lines.find((s) => s.startsWith("keep ")) ?? "(not printed)";
assertEqual(l, "keep 0xFFFFABFF", "set_field(0xFFFFFFFF, 8, 8, 0xAB) should change only bits 8 to 15: 0xFFFFABFF");`,
        },
        {
          id: "one-bit",
          description: "width 1 behaves like setting and clearing one bit",
          assertionCode: `const a = lines.find((s) => s.startsWith("one_set ")) ?? "(not printed)";
assertEqual(a, "one_set 0x00000020", "set_field(0, 5, 1, 1) should set bit 5: 0x00000020");
const b = lines.find((s) => s.startsWith("one_clear ")) ?? "(not printed)";
assertEqual(b, "one_clear 0x000000FE", "set_field(0xFF, 0, 1, 0) should clear bit 0: 0x000000FE");`,
        },
      ],
      hints: [
        "A number with `width` ones at the bottom is one less than a power of two. Then move it up to the field.",
        "Clearing uses the mask's inverse, as in clear_bit. Remember to move val up to the field too.",
      ],
    },
    // ───────────── 5 ─────────────
    {
      kind: "explain",
      title: "From source to a running board",
      body: P(
        "Your C file runs on a different kind of chip than your PC, so building it takes a few tools. Here is one typical loop, for an STM32F4 board with an ST-LINK debug probe (**tool names differ between vendors; the steps are the same**):",
        txt(`
arm-none-eabi-gcc -mcpu=cortex-m4 -mthumb -O2 -g -T stm32f4.ld startup_stm32f4.s main.c --specs=nosys.specs -o blink.elf
arm-none-eabi-size blink.elf
openocd -f interface/stlink.cfg -f target/stm32f4x.cfg      # GDB server on port 3333
arm-none-eabi-gdb blink.elf
(gdb) target extended-remote :3333
(gdb) load                      # flash the program over SWD
(gdb) monitor reset halt        # restart the chip from reset, stopped at the first instruction
(gdb) break TIM2_IRQHandler
(gdb) continue
(gdb) x/x 0x40020014            # read GPIOA->ODR straight from the chip
`),
        "**Cross-compiler.** `arm-none-eabi-gcc` runs on your PC but makes machine code for an Arm Cortex-M chip (`-mcpu=cortex-m4 -mthumb` pick the instruction set). The output, `blink.elf`, is an **ELF file**: your code and data, plus **symbols** (function and variable names) and, thanks to `-g`, **debug info** (which instruction came from which source line). `-g` only adds information for the debugger. It does not change the code that runs.",
        "**Linker script.** The `-T stm32f4.ld` file tells the linker where flash and RAM are and which sections go where, as you saw in *Boot and the memory map*. The linker can also write a **map file** listing the address of every function and variable, which you will use again when reading a crash. The startup file provides the vector table and the code that runs at reset.",
        "**Sizes.** `arm-none-eabi-size` prints three columns: **text** (code and read-only data, which live in flash), **data** (variables with a starting value) and **bss** (variables that start at zero). A few steps on we use it to check that a program fits.",
        "**Flashing and debugging.** The chip has a debug port called **SWD** (serial wire debug), which needs just two signal wires (clock and data) plus ground. A **debug probe** (the ST-LINK on many STM32 boards) connects your PC's USB to those wires. **OpenOCD** talks to the probe and offers a **GDB server** on port 3333. GDB connects to it, `load` writes your program into the chip's flash, and from then on you can set breakpoints, step, and read any register or address with `x`. Alternatives: **pyOCD** or SEGGER's J-Link tools do the same job.",
        "Other chips, other names: an **RP2040** (Raspberry Pi Pico) boots into a USB drive, so you can copy a `.uf2` file onto it (or use `picotool`); an **ESP32** is flashed with `esptool` over a USB serial link. The idea, *build an ELF, then put it in flash*, is the same.",
      ),
    },
    // ───────────── 6 ─────────────
    {
      kind: "question",
      title: "The edit-build-debug loop",
      body: "Put the steps of one round of the loop in order, from a finished source file to reading a register on the real chip.",
      question: {
        type: "order",
        items: [
          "Compile and link the source into an ELF file",
          "Check the ELF's sizes with arm-none-eabi-size",
          "Once the program fits, start OpenOCD to open the GDB server",
          "In GDB, connect to the server and load the program into flash",
          "Set a breakpoint and continue until the chip stops there",
          "While it is stopped, read a register with x",
        ],
        hint: "Ask of each step: what must already exist, or already be running, before this one can work?",
      },
      explanation: "You cannot measure or flash a program that does not exist yet, so **build** comes first and `size` follows it. The probe's server (OpenOCD) must be running before GDB can connect to it, and the program must be **loaded** before there is anything to stop at. Only a stopped chip gives a meaningful read of a register. After a change you repeat the loop; most of the time goes into steps 4 to 6.",
    },
    // ───────────── 7 ─────────────
    {
      kind: "question",
      title: "Will it fit?",
      body: P(
        "After building, `arm-none-eabi-size blink.elf` prints:",
        txt(`
   text    data     bss     dec     hex filename
   1392       8    1568    2968     b98 blink.elf
`),
        "**How many bytes of flash does this program need?** Answer in bytes.",
      ),
      question: {
        type: "number",
        answer: 1400,
        tolerance: 0,
        unit: "bytes",
        hint: "Which columns end up stored in flash? Remember that initial values of variables must be kept somewhere that survives power-off.",
      },
      explanation: "**Flash = text + data = 1392 + 8 = 1400 bytes.** The `text` column already includes read-only data and the vector table. The `data` variables live in RAM while the program runs, but their **starting values** must be stored in flash and copied to RAM at boot (see *Boot and the memory map*), so they count twice: once in flash, once in RAM. `bss` variables start at zero, so only their size matters, in RAM. **RAM = data + bss = 8 + 1568 = 1576 bytes**, plus room for the **stack**, which `size` cannot see.",
    },
    // ───────────── 8 ─────────────
    {
      kind: "explain",
      title: "When it crashes: HardFault",
      body: P(
        "A bad pointer does not print an error on a microcontroller. The CPU raises a **fault**: an exception like an interrupt (see *Interrupts*), and your code stops running normally. On Cortex-M3, M4 and M7 there are four fault types (MemManage, BusFault, UsageFault and HardFault), but the first three are **switched off** until your code enables them in SHCSR, so they all **escalate** into the **HardFault** handler. If the HFSR register's FORCED bit is set, that is what happened. (Cortex-M0 and M0+ chips are simpler: they only have HardFault, and no CFSR below.)",
        "The core has already **stacked** r0 to r3, r12, lr, pc and xPSR when the fault began, so the stacked **PC** tells you *where* it happened: look the address up in the map file, or run `arm-none-eabi-addr2line -e blink.elf <address>` to get a source line. The **Configurable Fault Status Register (CFSR, at 0xE000ED28)** tells you *why*. It is three byte-sized registers in one word:",
        "- **MMFSR, bits 0 to 7**: memory-protection faults.",
        "- **BFSR, bits 8 to 15**: bus faults. Bit 8 IBUSERR (instruction fetch failed), bit 9 PRECISERR (a data access failed and the faulting instruction is known), bit 10 IMPRECISERR (a write failed later, so the address is vague), bit 15 BFARVALID (the **BFAR** register, at 0xE000ED38, holds the bad address).",
        "- **UFSR, bits 16 to 31**: usage faults. Bit 16 UNDEFINSTR (not a real instruction), bit 17 INVSTATE (for instance, jumping to an address without the Thumb bit), bit 24 UNALIGNED, bit 25 DIVBYZERO (if divide-by-zero trapping is on).",
        "Typical causes: a **null or wild pointer**, a **stack overflow**, a **function pointer** with the wrong Thumb bit, or a divide by zero.",
        "In a product you cannot attach a debugger. Common practice: the fault handler saves the stacked registers and CFSR into a **no-init RAM area** (RAM the startup code does not clear) and resets the chip; the next boot reads the **reset-cause register** and uploads the saved report. An **independent watchdog** timer, restarted (\"kicked\") from the main loop or an idle task and **never from an interrupt**, resets a chip that hangs without faulting at all. Debugging methods in the field are covered in *Debugging hardware* (in *Building real products*).",
      ),
    },
    // ───────────── 9 ─────────────
    {
      kind: "question",
      title: "Read the fault",
      body: P(
        "After a crash, GDB shows **CFSR = 0x00008200** and **BFAR = 0x20020000** on a chip whose **128 KiB** of SRAM starts at 0x2000_0000. (On this toy chip, nothing is mapped right after the SRAM.) **What happened?**",
      ),
      question: {
        type: "choice",
        options: [
          "An unaligned 32-bit read from an odd address",
          "An undefined instruction in the program code",
          "An instruction fetch from a bad address",
          "A precise data access just past the end of SRAM",
        ],
        answer: 3,
        hint: "Write 0x8200 in binary and find which bits are set. Then check which fault each of those bits names.",
        feedback: {
          0: "UNALIGNED is bit 24 of CFSR, and bits 16 to 31 are all zero here.",
          1: "UNDEFINSTR is bit 16, and it is not set in 0x00008200.",
          2: "IBUSERR is bit 8 and it is not set. Bit 9, a data access, is.",
        },
      },
      explanation: "0x8200 = 0x8000 + 0x0200: **bit 15 (BFARVALID)** and **bit 9 (PRECISERR)**. A precise bus fault on a data access, and BFAR holds the bad address. 0x2000_0000 + 128 KiB (0x20000) = **0x2002_0000**, so BFAR = 0x2002_0000 is the first address *after* the last byte of SRAM. The honest conclusion: some code accessed memory one past the end of RAM, most likely a **read** (writes usually go through a write buffer, so a failed write tends to show up as IMPRECISERR, without an address). That fits an **array overrun** at the very top of memory or a pointer computed wrongly. It does *not* fit a typical stack overflow: the stack starts at the top of RAM and grows **downwards**, so an overflow runs off the bottom, into other variables, and usually does not fault at all. Find the code with the stacked PC.",
    },
    // ───────────── 10 ─────────────
    {
      kind: "recap",
      points: [
        "A vendor header (CMSIS style) maps a peripheral to a **struct of `volatile uint32_t` fields**: field order is register offset, so `GPIOA->ODR` is `0x40020000 + 0x14`. The port's clock must be on before it works.",
        "**BSRR** sets pin n with a 1 in bit n and resets it with bit n+16, in a single store that leaves other pins alone. Use `=` on it, not `|=`.",
        "A multi-bit field needs **clear, then set**: `|=` alone can only add ones and may land on a different mode (10 | 01 = 11, analog). A helper like `set_field` does it once.",
        "The loop: **cross-compile to an ELF** (with `-g`), check **`size`** (flash = text + data, RAM = data + bss plus stack), flash and debug through a **probe over SWD** with OpenOCD and GDB.",
        "A crash becomes a **HardFault**. The **stacked PC** tells where, **CFSR** and **BFAR** tell why. In the field, log them to no-init RAM and reset, with a watchdog as the safety net.",
      ],
    },
  ],
};
