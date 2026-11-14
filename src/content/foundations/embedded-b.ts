import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced C block for lesson prose. */
const c = (s: string) => "~~~c\n" + s.trim() + "\n~~~";
/** Fenced plain-text block (device trees, file layouts) for lesson prose. */
const txt = (s: string) => "~~~text\n" + s.trim() + "\n~~~";
/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lessons 6 to 10: serial protocols, DMA, boot and the memory map, RTOS and power, SoCs. */
export const embeddedLessonsB: ConceptLesson[] = [
  // ─────────────────────────────── 6. Talking to other chips ───────────────────────────────
  {
    id: "fnd-emb-6-protocols",
    title: "Talking to other chips",
    summary: "UART framing, I²C addresses and ACKs, SPI clock modes: the three buses that connect an MCU to sensors and other chips.",
    minutes: 12,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Three ways to send bits",
        body: P(
          "Sensors, displays, memory chips and radios talk to the MCU over a few wires, one bit at a time: a **serial** link. Three kinds cover most boards:",
          "- **UART**: two wires (TX and RX), no clock. Both sides agree on the speed (the **baud rate**, bits per second) in advance.\n- **I²C**: two shared wires (SDA data, SCL clock) for many chips, each with an **address**.\n- **SPI**: four wires (clock, data out, data in, chip select), the fastest and simplest.",
          "Start with the UART. The line rests **high**. A byte goes out as a **start bit** (0), then the 8 data bits **least significant bit first**, then a **stop bit** (1). With no parity bit this is called **8N1**: 8 data bits, No parity, 1 stop bit. Type a byte and look at the wire.",
        ),
        widget: { type: "emb-proto", props: { protocols: ["uart"], byte: 0x41 } },
      },
      {
        kind: "question",
        title: "Read the wire",
        body: "A logic analyser shows this 8N1 frame on a UART line, in time order: **0 11000010 1** (start, 8 data bits, stop). Send the byte that produces exactly this frame.",
        widget: { type: "emb-proto", props: { protocols: ["uart"], byte: 0x00 } },
        question: {
          type: "widget",
          goal: { proto: "uart", frameBits: "0110000101", parity: "none" },
          prompt: "Find the byte whose 8N1 frame is 0 11000010 1, with no parity.",
          hint: "The first data bit after the start bit is bit 0 (the least significant). Read the 8 data bits backwards to get the usual MSB-first binary.",
        },
        explanation: "The data bits arrive as 1,1,0,0,0,0,1,0 for bits 0 to 7. Written MSB first that is 0100 0011 = **0x43**, the letter **'C'**. Reading a UART capture forwards instead of LSB first is a classic mistake: you would get 0xC2.",
      },
      {
        kind: "code",
        title: "Build a frame",
        body: "Write `uart_frame(byte)` that returns the list of line levels for one 8N1 frame: the start bit `0`, the 8 data bits **least significant first**, then the stop bit `1`. That is 10 numbers.",
        language: "python",
        starter: `def uart_frame(byte):
    bits = []
    # start bit, 8 data bits (LSB first), stop bit
    return bits
`,
        solution: `def uart_frame(byte):
    bits = [0]
    for i in range(8):
        bits.append((byte >> i) & 1)
    bits.append(1)
    return bits
`,
        tests: [
          { id: "A", description: "0x41 ('A') gives 0 10000010 1", assertionCode: `assert uart_frame(0x41) == [0, 1, 0, 0, 0, 0, 0, 1, 0, 1], f"got {uart_frame(0x41)}"` },
          { id: "C", description: "0x43 ('C') gives 0 11000010 1", assertionCode: `assert uart_frame(0x43) == [0, 1, 1, 0, 0, 0, 0, 1, 0, 1], f"got {uart_frame(0x43)}"` },
          { id: "len", description: "Every frame is 10 bits, starting with 0 and ending with 1", assertionCode: `f = uart_frame(0xFF)\nassert len(f) == 10 and f[0] == 0 and f[-1] == 1, f"got {f}"` },
        ],
        hints: ["Bit i of the byte is (byte >> i) & 1.", "Loop i from 0 to 7 so bit 0 goes first."],
      },
      {
        kind: "question",
        title: "How fast is 115200?",
        body: "A UART runs at **115200 baud** with 8N1 framing and no gaps between frames. Work out the most **bytes per second** it can carry.",
        question: { type: "number", answer: 11520, tolerance: 0, unit: "bytes/s", hint: "Each byte costs 10 bits on the wire: start, 8 data, stop." },
        explanation: "115,200 bits/s ÷ 10 bits per byte = **11,520 bytes/s**. The start and stop bits cost 20% of the line. They are what lets the receiver find each byte without a shared clock: it waits for the falling edge of the start bit, then samples in the middle of each bit time.",
      },
      {
        kind: "explain",
        title: "I²C: addresses on a shared pair",
        body: P(
          "**I²C** links many chips with just two wires, **SDA** (data) and **SCL** (clock). Both are **open-drain** with pull-up resistors, exactly the GPIO setup from *GPIO in depth*: any chip can pull a line low, none can drive it high. Common speeds are 100 kHz (standard mode) and 400 kHz (fast mode).",
          "A transaction: the **controller** (the MCU) makes a **START** (SDA falls while SCL is high), sends a **7-bit address** plus a **R/W bit** (1 = read), and the chip with that address answers with an **ACK**: it pulls SDA **low** during a 9th clock. Then data bytes follow, each with its own ACK, and a **STOP** (SDA rises while SCL is high) ends it.",
          "To read a sensor register you typically write the register number first, then do a repeated START and read. Try addresses, read and write, and a missing device.",
        ),
        widget: { type: "emb-proto", props: { protocols: ["i2c"], addr: 0x48, read: true, data: [0x19] } },
      },
      {
        kind: "question",
        title: "The address byte",
        body: "Make the controller put the address byte **0x91** on the wire, and have a device answer it. Which 7-bit address and direction is that?",
        widget: { type: "emb-proto", props: { protocols: ["i2c"], addr: 0x20, read: false, data: [0x00] } },
        question: {
          type: "widget",
          goal: { proto: "i2c", addrByte: 0x91, present: true },
          prompt: "Set the 7-bit address and read/write so the first byte is 0x91, with the device present.",
          hint: "The first byte is the 7-bit address shifted left by one, with the R/W bit as bit 0. 0x91 is odd, so which direction is it?",
        },
        explanation: "0x91 = 1001 0001: the top 7 bits are 100 1000 = **0x48**, and the last bit is 1 = **read**. Datasheets sometimes give the 8-bit form (0x90 for write, 0x91 for read) instead of the 7-bit address 0x48: check which one before you blame the hardware.",
      },
      {
        kind: "question",
        title: "Silence on the 9th clock",
        body: "Your MCU sends the address byte, and during the 9th clock **SDA stays high**. What does that tell you?",
        question: {
          type: "choice",
          options: [
            "The device acknowledged and is ready",
            "The bus is running too slowly",
            "The device wants to send more data",
            "Nobody acknowledged: no device answered that address (wrong address, no power, or a wiring fault)",
          ],
          answer: 3,
          hint: "ACK means the receiver actively pulls SDA low. What keeps it high if nobody does?",
          feedback: {
            0: "An ACK is SDA LOW. High means nobody pulled it down.",
            1: "Speed does not decide the ACK bit; most devices handle 100 kHz without trouble.",
            2: "During the address phase, the 9th bit is only ever the ACK or NACK.",
          },
        },
        explanation: "A **NACK**: the pull-up kept SDA high because no chip pulled it low. Check the address (7-bit vs 8-bit form), the device's power, and that the pull-ups are fitted. An I²C bus scan, which tries every address and lists those that ACK, is often the first test on a new board.",
      },
      {
        kind: "explain",
        title: "SPI and its four modes",
        body: P(
          "**SPI** uses a clock (SCLK), a line from controller to device (MOSI, also called COPI or SDO), one back (MISO, CIPO or SDI) and a **chip select** (CS) per device, pulled low to pick it. Every clock moves one bit **each way at once**, so a byte in and a byte out happen together. Tens of MHz are common.",
          "There is no fixed timing: the **mode** sets it. **CPOL** is the clock's idle level (0 low, 1 high). **CPHA** says on which edge data is sampled: CPHA = 0 samples on the first (leading) edge of each clock pulse, CPHA = 1 on the second (trailing) edge. Mode = CPOL × 2 + CPHA, so modes 0 to 3. The device's datasheet tells you its mode; the controller must match.",
        ),
        widget: { type: "emb-proto", props: { protocols: ["spi"], mode: 0, deviceMode: 0, byte: 0xa5 } },
      },
      {
        kind: "question",
        title: "Match the sensor",
        body: "This sensor's datasheet says it uses **SPI mode 3**. Set the controller so they agree.",
        widget: { type: "emb-proto", props: { protocols: ["spi"], mode: 0, deviceMode: 3, lockDevice: true, byte: 0xa5 } },
        question: {
          type: "widget",
          goal: { proto: "spi", compat: "match" },
          prompt: "Choose the controller's SPI mode so it matches the device.",
          hint: "Mode 3 means CPOL = 1 and CPHA = 1.",
        },
        explanation: "**Mode 3**: the clock idles high (CPOL = 1) and data is sampled on the trailing edge (CPHA = 1), which for an idle-high clock is the **rising** edge. Mode 0 also samples on rising edges, so some devices accept both, but a mode 1 or 2 controller would sample exactly when the data changes and read garbage.",
      },
      {
        kind: "recap",
        points: [
          "**UART**: no clock, an agreed baud rate. 8N1 = start bit 0, 8 data bits **LSB first**, stop bit 1: 10 bits per byte.",
          "**I²C**: two open-drain wires with pull-ups. START, a **7-bit address + R/W**, then **ACK = SDA pulled low** on the 9th clock; NACK means nobody answered. 100 / 400 kHz are typical.",
          "**SPI**: clock, two data lines and a chip select; full duplex and fast. **CPOL** = idle level, **CPHA** = sampling edge; match the device's mode.",
          "A logic analyser that decodes these protocols is the fastest way to see what is really on the wire.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 7. DMA ───────────────────────────────
  {
    id: "fnd-emb-7-dma",
    title: "DMA: moving data without the CPU",
    summary: "DMA channels, circular and double buffers, and the cache-coherence trap of DMA on chips with a data cache.",
    minutes: 11,
    xp: 75,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "A helper that only copies",
        body: P(
          "An ADC delivering 100,000 samples a second, or a UART receiving a stream, needs every value moved from a peripheral register to RAM. If the CPU does it, with an interrupt per sample, a big share of its time goes on copying.",
          "A **DMA controller** (direct memory access) is a small engine on the bus (see *Buses: how the parts talk*) that does nothing but copy. Each **channel** is set up with a **source** address, a **destination**, a **count** and whether to step the addresses after each item. A peripheral **request** (\"I have a sample\") triggers each copy, and the DMA interrupts the CPU only when a whole block is done.",
          "Compare the three ways to move the samples: the CPU polling, an interrupt per sample, and DMA.",
        ),
        widget: { type: "emb-dma", props: { method: "irq", rateHz: 100_000, buffer: 256 } },
      },
      {
        kind: "question",
        title: "Keep the CPU free",
        body: "Move **500 kHz** of ADC samples (or faster) while leaving **at least 95%** of the CPU free for the real work.",
        widget: { type: "emb-dma", props: { method: "irq", rateHz: 100_000, buffer: 256 } },
        question: {
          type: "widget",
          goal: { minRate: 500_000, maxLoad: 0.05 },
          prompt: "Pick a sample rate of 500 kHz or more and a method that uses at most 5% of the CPU.",
          hint: "One interrupt per sample costs the same at every sample. What if the CPU only heard about whole blocks?",
        },
        explanation: "With **DMA**, the CPU only runs a short interrupt per half buffer, so the load is tiny (under 1% in this toy). An interrupt per sample at 500 kHz would need over 60% of a 48 MHz CPU, and polling uses all of it.",
      },
      {
        kind: "question",
        title: "The price of an interrupt each",
        body: "Each sample costs an interrupt of **60 cycles**. Samples arrive at **100 kHz** and the CPU runs at **48 MHz**. Work out the share of the CPU spent on these interrupts, in **percent**.",
        question: { type: "number", answer: 12.5, tolerance: 0.1, unit: "%", hint: "Cycles needed per second = 60 × 100,000. Divide by the 48,000,000 cycles available." },
        explanation: "60 × 100,000 = 6,000,000 cycles per second, out of 48,000,000: **12.5%**. At ten times the rate it would exceed 100% and samples would be lost. With DMA and a 256-sample buffer, the same stream costs a couple of interrupts per 256 samples.",
      },
      {
        kind: "explain",
        title: "Circular and double buffers",
        body: P(
          "If DMA fills a buffer and stops, the CPU must restart it, and samples arriving meanwhile are missed. The usual fix is a **circular** buffer: the channel wraps to the start by itself and never stops. It raises a **half-transfer** interrupt when the first half is full and a **transfer-complete** interrupt when the second half is.",
          "That gives **double buffering** (ping-pong): while DMA fills one half, the CPU processes the other. It works as long as processing one half takes **no longer than filling** the other. Try audio at 48 kHz.",
        ),
        widget: { type: "emb-dbuf", props: { mode: "single", halfSamples: 128, processMs: 2, rateHz: 48_000 } },
      },
      {
        kind: "question",
        title: "Keep up with the audio",
        body: "Your audio filter needs **4 ms** to process each block. Choose a mode and a block size so that no samples are lost.",
        widget: { type: "emb-dbuf", props: { mode: "single", halfSamples: 128, processMs: 4, rateHz: 48_000 } },
        question: {
          type: "widget",
          goal: { mode: "double", ok: true, minProcessMs: 4 },
          prompt: "Keep processing at 4 ms or more and make the buffering keep up.",
          hint: "Single buffering always misses samples while the CPU works. With double buffering, compare the 4 ms with the time to fill one half.",
        },
        explanation: "**Double buffering with 256-sample halves**: filling 256 samples at 48 kHz takes 5.33 ms, more than the 4 ms of processing, so the CPU always finishes before DMA comes back. With 128-sample halves the fill takes only 2.67 ms and the CPU falls behind.",
      },
      {
        kind: "question",
        title: "Why not a huge buffer?",
        body: "Bigger halves give the CPU more time. Why not just use 1-second halves for audio?",
        question: {
          type: "choice",
          options: [
            "DMA cannot count that high",
            "It adds a second of delay (latency) before any sound is processed, and uses a lot of RAM",
            "Larger buffers make the ADC less accurate",
            "The half-transfer interrupt only works for small buffers",
          ],
          answer: 1,
          hint: "A sample can only be processed once its whole half is full.",
          feedback: {
            0: "Counters are limited (often 16 bits, 65,535 items), but you could chain transfers; that is not the main issue.",
            2: "The ADC's accuracy has nothing to do with where its results are stored.",
            3: "The half-transfer interrupt works at any size the channel allows.",
          },
        },
        explanation: "Every sample waits until its half is full, so the block size **is** latency: a 1-second half means a second of delay, terrible for a phone call or a music instrument. And 48,000 samples × 2 bytes × 2 halves is 192 KB, more RAM than many MCUs have. Pick the smallest block that keeps up, with some margin.",
      },
      {
        kind: "explain",
        title: "The cache trap",
        body: P(
          "Bigger chips put a **data cache** between the CPU and RAM (see *The memory hierarchy*). Many DMA engines see **only RAM**, not the cache. In *Many cores, one memory* hardware kept the caches coherent for you; here, on many MCUs with a data cache (Cortex-M7 class parts, for example) and on some application processors, **nobody does**.",
          "So two things can go wrong. **Sending**: the CPU writes a message, it sits in the cache (write-back), and DMA sends the old bytes from RAM. **Receiving**: DMA writes new bytes into RAM, but the CPU reads its old cached copy. The fixes: **clean** the cache lines (write them back) before DMA reads; **invalidate** them (drop them) before the CPU reads what DMA wrote. Try sending first.",
        ),
        widget: { type: "emb-cache", props: { scenario: "tx" } },
      },
      {
        kind: "question",
        title: "Send the right bytes",
        body: "Make the UART send **HI!!** through DMA.",
        widget: { type: "emb-cache", props: { scenario: "tx", lockScenario: true } },
        question: {
          type: "widget",
          goal: { scenario: "tx", correct: true },
          prompt: "Write the message, do the right cache operation, then start the DMA.",
          hint: "DMA reads RAM. Where is the new message right after the CPU writes it?",
        },
        explanation: "Write, then **clean** (write the dirty line back to RAM), then start the DMA. Invalidating instead would throw the new message away. Skipping both sends the stale bytes still in RAM. These bugs are infamous because they come and go with cache timing: a debugger that halts the CPU can even make them vanish.",
      },
      {
        kind: "question",
        title: "Receiving",
        body: "DMA has just written a received packet into a buffer the CPU had read earlier. What must the CPU do **before reading it**?",
        question: {
          type: "choice",
          options: [
            "Invalidate the buffer's cache lines, so the reads go to RAM",
            "Clean the buffer's cache lines",
            "Nothing: DMA updates the cache automatically",
            "Declare the buffer volatile",
          ],
          answer: 0,
          hint: "The cache holds an old copy. Do you want to keep it, write it out, or drop it?",
          feedback: {
            1: "Cleaning writes the old cached data back to RAM, which could even overwrite the new packet.",
            2: "On these chips the DMA does not see the cache at all; that is the whole problem.",
            3: "volatile only stops the compiler caching values in registers. The hardware data cache still serves the old line.",
          },
        },
        explanation: "**Invalidate** before reading (and, to be safe, before starting the receive, so no dirty line gets written back over the new data later). Keep DMA buffers aligned to cache lines so an invalidate cannot destroy a neighbouring variable. The alternative is to place DMA buffers in a **non-cacheable** memory region, set up with the memory protection unit.",
      },
      {
        kind: "recap",
        points: [
          "A **DMA** channel copies between a peripheral and memory (or memory and memory) by itself: source, destination, count, increment, trigger.",
          "It turns an interrupt per item into an interrupt per **block**, freeing the CPU.",
          "**Circular** mode with half and complete interrupts gives **double buffering**: process one half while the other fills. It keeps up if processing ≤ fill time; the block size sets the latency.",
          "If the DMA cannot see the data cache: **clean** before DMA reads, **invalidate** before the CPU reads what DMA wrote (or use non-cacheable buffers).",
        ],
      },
    ],
  },

  // ─────────────────────────────── 8. Boot and memory map ───────────────────────────────
  {
    id: "fnd-emb-8-boot",
    title: "Boot and the memory map",
    summary: "The reset vector, startup code, the linker's .text, .rodata, .data and .bss sections, flash vs RAM, and bootloaders.",
    minutes: 11,
    xp: 75,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "What happens at reset",
        body: P(
          "In *From power-on to your program* a PC passed through firmware, a bootloader and an OS. A microcontroller is far simpler. On Arm Cortex-M, at reset the CPU reads **two words** from the start of the vector table: the first becomes the **stack pointer**, the second the **program counter**, the address of the **reset handler**.",
          "The reset handler is the **startup code** (usually supplied by the chip vendor or toolchain). Before your `main` can run, it must make the C language's promises true: global variables with an initial value must have it, and the others must be zero. Step through the boot.",
        ),
        widget: { type: "emb-boot", props: {} },
      },
      {
        kind: "question",
        title: "In order",
        body: "Put the boot of a Cortex-M class MCU in order.",
        question: {
          type: "order",
          items: [
            "The CPU loads the stack pointer from the first word of the vector table",
            "It loads the program counter from the second word: the reset handler",
            "The startup code copies .data's initial values from flash to RAM",
            "It fills .bss with zeros",
            "It sets up the clocks",
            "It calls main()",
          ],
          hint: "The hardware does the first two by itself. The startup code then prepares memory before anything in C runs.",
        },
        explanation: "The hardware only fetches SP and PC; everything else is ordinary code. Some startup files set up the clocks before the copy so that it runs faster; either way, **main comes last**. On a PC the steps are bigger but the idea is the same: something must prepare memory before your program's first line.",
      },
      {
        kind: "explain",
        title: "Sections: where things go",
        body: P(
          "The compiler sorts everything into **sections**, and a **linker script** says where each goes in the memory map:",
          "- **.text**: the machine code, in flash.\n- **.rodata**: constants and string literals, in flash.\n- **.data**: globals with an initial value (`int counter = 42;`). They change at run time, so they must **live in RAM**, but the initial values must **survive power-off**, so they are **stored in flash** too.\n- **.bss**: globals without an initial value (`int total;`). They start at zero, so flash only needs to know their size.\n- The **stack** at the top of RAM, growing down, and maybe a **heap**.",
          "That is why .data has two addresses: the **LMA** (load address, in flash, where the bytes are stored) and the **VMA** (virtual or run address, in RAM, where the code uses them). The startup code copies from one to the other.",
          c(`
int counter = 42;          // .data: RAM, initial value kept in flash
int total;                 // .bss: RAM, zeroed at startup
const char msg[] = "hi";   // .rodata: stays in flash
`),
        ),
        widget: { type: "emb-boot", props: {} },
      },
      {
        kind: "question",
        title: "Two homes",
        body: "Where is `int counter = 42;` while `main` runs, and where are the bytes `42` kept while the power is off?",
        question: {
          type: "choice",
          options: [
            "In flash at both times",
            "In RAM at both times",
            "In RAM while running; the initial value is kept in flash and copied at startup",
            "In the CPU's registers",
          ],
          answer: 2,
          hint: "It must be writable at run time, but RAM forgets everything at power-off.",
          feedback: {
            0: "Flash cannot be written like RAM (it is erased and programmed in blocks), so a changing variable cannot live there.",
            1: "RAM loses its contents without power; the 42 would be gone at the next boot.",
            3: "Registers hold values only briefly while instructions work on them; globals live in memory.",
          },
        },
        explanation: "A **.data** variable has a run address (VMA) in **RAM** and a load address (LMA) in **flash**. The startup code copies the initial values across before `main`. `const` data needs no copy: it is read straight from flash.",
      },
      {
        kind: "question",
        title: "Broken startup code",
        body: "This startup code lets you skip steps. Boot to `main` so that **counter is 42** and **total is 0**.",
        widget: { type: "emb-boot", props: { skip: true } },
        question: {
          type: "widget",
          goal: { reachedMain: true, counter: 42, total: 0 },
          prompt: "Step through the boot with the right steps enabled until main runs with counter = 42 and total = 0.",
          hint: "Which step gives counter its value, and which one gives total its zero?",
        },
        explanation: "Both the **.data copy** and the **.bss zeroing** must run. Skip the copy and `counter` starts with whatever RAM held at power-up; skip the zeroing and `total` does. Such bugs often hide: RAM may happen to read as zero on the bench and not in the field.",
      },
      {
        kind: "question",
        title: "Count the RAM",
        body: "A program has **.data = 256 bytes**, **.bss = 1024 bytes**, **no heap** and a **2048-byte stack**. Work out how many bytes of RAM it uses.",
        question: { type: "number", answer: 3328, tolerance: 0, unit: "bytes", hint: "RAM holds .data, .bss, the heap and the stack. .text and .rodata stay in flash." },
        explanation: "256 + 1024 + 0 + 2048 = **3328 bytes**. The linker prints totals like these (`size` or a map file shows them per section). Note the stack is a **reservation**: if it really grows bigger at run time, it silently overwrites .bss; the linker cannot see that.",
      },
      {
        kind: "question",
        title: "The biggest buffer",
        body: "You want a large sample buffer in .bss. Make it **at least 64 KiB** and still have the program link.",
        widget: { type: "emb-boot", props: { editable: ["bss"] } },
        question: {
          type: "widget",
          goal: { linkOk: true, minBss: 65536 },
          prompt: "Pick a .bss size of 64 KiB or more that fits in the 128 KiB of RAM.",
          hint: "RAM also has to fit .data and the stack. Watch the linker message.",
        },
        explanation: "**64 KiB** fits. 126 KiB plus .data and the 2 KiB stack is more than 128 KiB, and the linker stops with an error like `region RAM overflowed`. Better a link error now than a stack crash in the field.",
      },
      {
        kind: "explain",
        title: "Bootloaders",
        body: P(
          "Many products need **firmware updates** without a debugger. A **bootloader** is a small, separate program in the first part of flash. At reset it runs first, checks whether a new firmware image is waiting (arriving over UART, USB, or a radio for **over-the-air** updates), writes it into flash, **verifies it** (a checksum, or a cryptographic signature for **secure boot**), and then jumps to the application.",
          "To jump, it reads the application's own vector table, sets the stack pointer and program counter from it, and (on Cortex-M) points the **vector table offset register** at it so interrupts go to the application's handlers. So the application must be **linked at its own address**, after the bootloader. Many MCUs also have a fixed bootloader in **ROM** from the factory, so a blank chip can be programmed over UART or USB.",
        ),
      },
      {
        kind: "question",
        title: "The wrong address",
        body: "A bootloader occupies the first **16 KiB** of flash. The application is still linked for flash starting at **0x0000_0000**. What goes wrong?",
        question: {
          type: "choice",
          options: [
            "Nothing: the CPU relocates code automatically",
            "Only the application's interrupts are slower",
            "The bootloader is now larger",
            "Its code and vector table expect addresses where the bootloader sits: flashing it overwrites the bootloader, or, placed at 16 KiB, it jumps to wrong addresses",
          ],
          answer: 3,
          hint: "Machine code contains absolute addresses chosen by the linker.",
          feedback: {
            0: "An MCU has no loader that fixes up addresses; code runs exactly where the linker put it.",
            1: "Speed is not the issue. The vector table points at the wrong place entirely.",
            2: "The bootloader's size does not change; it is the application's addresses that are wrong.",
          },
        },
        explanation: "Change the application's linker script so its flash starts at **0x0000_4000** (16 KiB), and have the bootloader set the vector table offset there before jumping. Mixing up these addresses is a classic first-bootloader bug: the board then crashes on the first interrupt.",
      },
      {
        kind: "recap",
        points: [
          "At reset a Cortex-M CPU loads **SP** from the vector table's first word and **PC** (the reset handler) from the second.",
          "Startup code copies **.data** from flash (LMA) to RAM (VMA), zeroes **.bss**, sets up clocks, then calls `main`.",
          "**.text** and **.rodata** stay in flash; .data, .bss, heap and **stack** use RAM. The linker reports when a region overflows.",
          "A **bootloader** runs first, updates and verifies the application, then jumps to it; the application must be linked at its own address.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 9. RTOS and power ───────────────────────────────
  {
    id: "fnd-emb-9-rtos-power",
    title: "RTOS and power",
    summary: "Tasks, priorities and queues, priority inversion and inheritance, sleep modes and wake-ups, and measuring current.",
    minutes: 12,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "From one loop to many tasks",
        body: P(
          "Small firmware is one **super loop**: read sensors, update outputs, repeat, with interrupts on the side. As a product grows, one loop that must remember where every job is becomes hard to manage.",
          "A **real-time operating system** (RTOS: FreeRTOS, Zephyr and ThreadX are well-known examples) lets you write separate **tasks**, each a normal function with its own stack and a **priority**. A **scheduler** always runs the highest-priority task that is **ready**; a task that waits (for time, data or a lock) is **blocked** and uses no CPU. The system tick timer from *Timers and PWM* lets it switch tasks and count time.",
          c(`
void motor_task(void *arg) {
    for (;;) {
        int target = queue_receive(cmd_queue);   // blocks until a command arrives
        set_motor(target);
    }
}
`),
          "\"Real-time\" does not mean fast. It means **predictable**: the most urgent work starts within a known, bounded time.",
        ),
      },
      {
        kind: "question",
        title: "Nothing to do",
        body: "The highest-priority task calls `queue_receive` on an **empty** queue. What does the scheduler do?",
        question: {
          type: "choice",
          options: [
            "It keeps running that task in a loop until data arrives",
            "It marks the task blocked and runs the highest-priority task that is ready; when data arrives the task becomes ready again",
            "It restarts the task from the beginning",
            "It reports an error, because queues must never be empty",
          ],
          answer: 1,
          hint: "A blocked task should cost no CPU at all.",
          feedback: {
            0: "Busy-waiting would waste the CPU and starve every lower-priority task: the thing an RTOS exists to avoid.",
            2: "Tasks continue where they blocked; nothing restarts.",
            3: "An empty queue is the normal state between messages.",
          },
        },
        explanation: "The task **blocks**. When an ISR or another task puts a message in the queue, it becomes ready, and since it has the highest priority it runs at once. Queues are the safe way to pass data between tasks and from ISRs (with the ISR-safe call variant), because the RTOS does the locking.",
      },
      {
        kind: "explain",
        title: "Priority inversion",
        body: P(
          "Tasks that share something, say a sensor bus, protect it with a **mutex**: a lock only one task can hold. Now a trap. **Low** takes the mutex. **High** wakes up, needs the mutex and blocks: it must wait for Low, which is fine for a moment. But then **Medium**, which needs no mutex at all, becomes ready. It outranks Low, so it runs, and Low cannot finish and release the lock. **High waits for Medium**, a task it outranks. That is **priority inversion**.",
          "The fix many RTOSes offer is **priority inheritance**: while Low holds a mutex that High wants, Low temporarily runs at High's priority, so Medium cannot get in the way. Look at the chart with a plain mutex, then switch.",
        ),
        widget: { type: "emb-rtos", props: { inherit: false, mediumWork: 6 } },
      },
      {
        kind: "question",
        title: "Make the deadline",
        body: "High must finish within **7 ticks** of waking. Keep Medium's work at **6 ticks or more** and make High meet its deadline.",
        widget: { type: "emb-rtos", props: { inherit: false, mediumWork: 6 } },
        question: {
          type: "widget",
          goal: { meetsDeadline: true, minMediumWork: 6 },
          prompt: "Change the mutex protocol so High meets its deadline while Medium still does its work.",
          hint: "The problem is Medium running while Low holds the lock High needs. What if Low could not be preempted by Medium?",
        },
        explanation: "With **priority inheritance**, Low runs at High's priority while High waits for its mutex, finishes its short critical section and releases the lock; High then runs at once and finishes within 5 ticks. Medium runs afterwards. Without it, High's wait grows with Medium's work, which is unbounded in a real system.",
      },
      {
        kind: "question",
        title: "A famous case",
        body: "Priority inversion is widely cited from NASA's **Mars Pathfinder** lander (1997), whose computer kept resetting itself on Mars. How was it fixed?",
        question: {
          type: "choice",
          options: [
            "Engineers found the inversion, then enabled priority inheritance on the mutex involved by uploading a change from Earth",
            "A new computer was sent on a later mission",
            "They lowered the lander's clock speed",
            "They removed the RTOS and rewrote the software as one loop",
          ],
          answer: 0,
          hint: "The change was small: one setting on one lock.",
          feedback: {
            1: "Nothing could be replaced physically; the fix was in software.",
            2: "A slower clock would not change which task holds the lock.",
            3: "A full rewrite was neither needed nor possible from millions of kilometres away.",
          },
        },
        explanation: "As the engineers later described it: a low-priority task held a mutex on a shared information bus, a high-priority bus task waited for it, and medium-priority tasks kept running, so a watchdog saw the bus task miss its deadline and **reset** the system. They reproduced it on a copy on Earth, then enabled **priority inheritance** on that mutex (in the VxWorks RTOS) with an uploaded patch.",
      },
      {
        kind: "explain",
        title: "Sleep is the battery's friend",
        body: P(
          "Most battery devices are idle almost all the time. When no task is ready, the RTOS (or your loop) can put the MCU to **sleep**. Typical modes, from light to deep: **sleep** stops only the CPU clock; **deep sleep** (often called stop) turns off most clocks but keeps RAM; **standby** turns off nearly everything, and the chip restarts through a reset when it wakes. Deeper modes use less current but wake more slowly, and fewer things can wake them: an **RTC alarm** (real-time clock), a pin, or a few peripherals.",
          "A sensor that wakes, measures, sends and sleeps again spends its charge in two places: the short active bursts and the long sleep. Try the modes.",
        ),
        widget: { type: "emb-power", props: { modeId: "sleep", activeMs: 20, periodS: 10, capacityMah: 220 } },
      },
      {
        kind: "question",
        title: "A year on a coin cell",
        body: "A sensor on a **CR2032 coin cell** wakes every **10 s** and works for **20 ms**. Make it last **at least a year** (365 days).",
        widget: { type: "emb-power", props: { modeId: "sleep", activeMs: 20, periodS: 10, capacityMah: 220 } },
        question: {
          type: "widget",
          goal: { minDays: 365 },
          prompt: "Pick the sleep mode (and other settings) that give at least 365 days.",
          hint: "Look at the share of the charge used while asleep. Which mode cuts the sleep current the most while keeping a fast wake-up?",
        },
        explanation: "In plain sleep the chip still draws about 1.5 mA (typical) between wake-ups, so the cell lasts days. **Deep sleep** at a few µA makes the 20 ms bursts the main cost: well over a year in this ideal model. Standby is a little better still, but loses RAM and wakes through a reset, which adds start-up time and complexity.",
      },
      {
        kind: "code",
        title: "Battery life",
        body: P(
          "Write `battery_hours(capacity_mAh, active_mA, sleep_uA, duty)`. `duty` is the share of the time the chip is active (0 to 1). Return the ideal battery life in hours: capacity divided by the **average** current.",
          "Careful with units: the sleep current is in **µA**, the rest in mA (1 mA = 1000 µA).",
        ),
        language: "python",
        starter: `def battery_hours(capacity_mAh, active_mA, sleep_uA, duty):
    # average mA = duty * active + (1 - duty) * sleep (in mA!)
    return 0
`,
        solution: `def battery_hours(capacity_mAh, active_mA, sleep_uA, duty):
    sleep_mA = sleep_uA / 1000
    avg = duty * active_mA + (1 - duty) * sleep_mA
    return capacity_mAh / avg
`,
        tests: [
          { id: "always", description: "Always active at 5 mA, 220 mAh lasts 44 hours", assertionCode: `assert abs(battery_hours(220, 5, 5, 1) - 44) < 1e-6, f"got {battery_hours(220, 5, 5, 1)}"` },
          { id: "duty", description: "1% active at 5 mA, sleeping at 5 µA: 220 / (0.05 + 0.99 × 0.005) hours", assertionCode: `want = 220 / (0.01 * 5 + 0.99 * 0.005)\nassert abs(battery_hours(220, 5, 5, 0.01) - want) < 1e-6, f"expected {want:.1f}, got {battery_hours(220, 5, 5, 0.01)}"` },
          { id: "units", description: "Sleeping all the time at 10 µA, 1000 mAh lasts 100,000 hours", assertionCode: `assert abs(battery_hours(1000, 5, 10, 0) - 100000) < 1e-3, f"got {battery_hours(1000, 5, 10, 0)}"` },
        ],
        hints: ["Convert the sleep current: sleep_uA / 1000 gives mA.", "Average = duty × active + (1 − duty) × sleep; hours = capacity ÷ average."],
      },
      {
        kind: "explain",
        title: "Measuring current",
        body: P(
          "Sleep currents of microamps and active bursts of milliamps are hard to measure. A multimeter in series reads an average and misses short spikes, and its shunt resistor drops voltage that can disturb the circuit (the **burden voltage**). Engineers use a **current probe** or **power profiler** that samples fast across a wide range (the Nordic PPK2, Joulescope and Qoitech Otii are examples; prices range from around a hundred to a few thousand dollars), or a small shunt resistor and an oscilloscope.",
          "Real batteries are not ideal either: a coin cell's usable capacity drops at high pulse currents and in the cold, and every regulator, LED and sensor adds its own current. Measure the real board, and design with margin.",
          "Safety: lithium cells can deliver large currents when shorted. Never short a coin cell or a LiPo, use cells with protection circuits, and don't charge lithium cells without a proper charger.",
        ),
      },
      {
        kind: "recap",
        points: [
          "An **RTOS** runs **tasks** with priorities; the scheduler runs the highest-priority **ready** task, and blocked tasks cost nothing. Queues pass data safely.",
          "**Priority inversion**: High waits for Low's mutex while Medium runs. **Priority inheritance** lets Low run at High's priority until it releases the lock (the Mars Pathfinder fix).",
          "Sleep modes trade current for wake-up time and what stays on. Average current = duty × active + (1 − duty) × sleep; ideal life = capacity ÷ average.",
          "Measure with a fast, wide-range current tool, and treat lithium cells with care.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 10. SoCs ───────────────────────────────
  {
    id: "fnd-emb-10-soc",
    title: "SoCs: many processors on one chip",
    summary: "CPU clusters, GPU, NPU, DSP and the memory controller; running Linux, device trees and drivers; programming the GPU and NPU.",
    minutes: 12,
    xp: 90,
    level: "Professional",
    steps: [
      {
        kind: "explain",
        title: "A system on a chip",
        body: P(
          "The chip in a phone, a Raspberry Pi or a car's infotainment unit is a **system on a chip** (SoC). Where an MCU has one small CPU, an SoC packs several kinds of processor onto one die, all sharing one external RAM (LPDDR) through a **memory controller**, connected by an on-chip **interconnect** (a network of buses).",
          "There are usually **two CPU clusters**: **big** cores, fast and power-hungry (the out-of-order designs of *Superscalar and out-of-order*), and **little** cores, slower but far more energy-efficient. The OS moves work between them. Then come specialists: a **GPU** (from the GPU module), an **NPU** for neural networks, a **DSP** for signal processing, an image signal processor (**ISP**) for the camera and fixed-function **video** codecs. Tap the blocks.",
        ),
        widget: { type: "emb-soc", props: { mode: "explore" } },
      },
      {
        kind: "question",
        title: "Where does it run?",
        body: "Assign each workload to the block that does it **best** (fastest at the lowest energy).",
        widget: { type: "emb-soc", props: { mode: "assign" } },
        question: {
          type: "widget",
          goal: { allCorrect: true },
          prompt: "Assign every workload to its best block.",
          hint: "Ask two questions: is this work general and branchy, or the same operation over lots of data? And does it run all the time at low power?",
        },
        explanation: "General, branchy code (app logic) goes to the **big cores**; light background work to the **little cores**; graphics to the **GPU**; neural networks with int8 weights to the **NPU**; always-on audio to the low-power **DSP**; raw camera data to the **ISP**; video to the **video codec**. A specialist does its job many times more efficiently than a CPU, which is why phones are full of them.",
      },
      {
        kind: "explain",
        title: "Running Linux",
        body: P(
          "SoCs usually run a full OS such as **Linux** or Android. That needs an **MMU** for virtual memory (*Virtual memory*), which most MCUs lack, and a longer boot chain than the one in *Boot and the memory map*:",
          "1. A **boot ROM** inside the chip runs first. It can only reach on-chip SRAM and a few boot devices.\n2. It loads a small **first-stage loader** into SRAM, whose main job is to set up the external DRAM.\n3. A full bootloader (**U-Boot** is a common open-source one) loads the kernel and a **device tree** into DRAM.\n4. The **Linux kernel** starts, probes its drivers and mounts the root filesystem.\n5. **init** (often systemd) starts the user programs.",
          "With secure boot, every stage checks the signature of the next before running it.",
        ),
      },
      {
        kind: "question",
        title: "The chain",
        body: "Put the boot chain of a Linux SoC in order.",
        question: {
          type: "order",
          items: [
            "The boot ROM inside the chip runs",
            "A first-stage loader in on-chip SRAM sets up the external DRAM",
            "U-Boot loads the kernel and the device tree into DRAM",
            "The Linux kernel starts and probes its drivers",
            "init starts the user programs",
          ],
          hint: "Each stage can only use the memory the previous one made available.",
        },
        explanation: "Each stage prepares more of the machine for the next: the ROM knows only SRAM and boot devices, the first stage brings up DRAM, the bootloader can then load something big, and the kernel takes over all hardware. Tools such as **Yocto** and **Buildroot** build this whole stack for a board.",
      },
      {
        kind: "explain",
        title: "Device trees and drivers",
        body: P(
          "A PC can ask its buses which devices are attached (PCIe and USB enumerate themselves). Most things on an SoC board cannot: a sensor on I²C just sits at an address. So Linux on Arm and RISC-V boards reads a **device tree**, a text description of the hardware compiled into a binary blob, that says what is where:",
          txt(`
&i2c1 {
    status = "okay";
    clock-frequency = <400000>;      /* 400 kHz fast mode */

    temp@48 {                        /* a sensor at address 0x48 */
        compatible = "ti,tmp102";
        reg = <0x48>;
    };
};
`),
          "The kernel matches each `compatible` string to a **driver**, which then talks to the chip with the same I²C transactions you saw in *Talking to other chips*, and exposes it to programs (here through the hardware-monitoring interface in /sys). Programs can also reach hardware from user space through generic interfaces such as libgpiod for pins, i2c-dev and spidev.",
        ),
      },
      {
        kind: "question",
        title: "Why a device tree?",
        body: "What is the main point of the device tree?",
        question: {
          type: "choice",
          options: [
            "It contains the drivers' machine code",
            "It speeds up the kernel's boot",
            "It describes hardware the kernel cannot discover by itself (addresses, interrupts, which pins), so one kernel can run on many different boards",
            "It replaces the bootloader",
          ],
          answer: 2,
          hint: "A sensor at an I²C address has no way to announce itself.",
          feedback: {
            0: "Drivers are code in the kernel or in modules; the device tree is data that tells them which hardware to drive.",
            1: "It is about describing the board, not speed.",
            3: "The bootloader still runs; it usually loads the device tree and hands it to the kernel.",
          },
        },
        explanation: "The device tree is **data, not code**: a board description. Change the board (another sensor, other pins) and you change the device tree, not the kernel. Board vendors ship device trees for their boards; adding a part means adding a node and making sure its driver is enabled.",
      },
      {
        kind: "explain",
        title: "Programming the GPU and NPU",
        body: P(
          "The GPU on an SoC is programmed like the ones in the GPU module (*Kernels and threads*): through graphics APIs such as **OpenGL ES** and **Vulkan**, or compute APIs such as **OpenCL** or the vendor's own. One big difference from a PC: there is usually **no separate GPU memory**. CPU and GPU share the same DRAM (*GPU memory* explained why copies over PCIe are expensive), so data need not be copied, but the caches still have to be kept coherent, by the hardware or by the driver.",
          "The **NPU** is usually reached through an ML framework: you export a trained model, typically **quantised to int8**, and a **delegate** or **execution provider** (in LiteRT, formerly TensorFlow Lite, or ONNX Runtime, for example) hands the layers it supports to the vendor's NPU driver. The DSP has its own vendor SDK.",
          "Be honest about the cost: these toolchains differ by vendor, some are closed or need a developer agreement, and the supported features change between chips. Check before you choose the chip.",
        ),
      },
      {
        kind: "question",
        title: "The layer that wouldn't go",
        body: "Your int8 model should run on the NPU, but it is barely faster than on the CPU. The profiler shows one layer type is **not supported** by the NPU delegate. What is most likely happening?",
        question: {
          type: "choice",
          options: [
            "The NPU is broken",
            "int8 is always slower than float",
            "The model is too small for the NPU to notice",
            "That layer falls back to the CPU, so data shuttles between NPU and CPU and the slow part dominates",
          ],
          answer: 3,
          hint: "A delegate only takes the operations it knows. What happens to the rest?",
          feedback: {
            0: "The other layers run fine on it; the profile points at one unsupported operation.",
            1: "On NPUs int8 is normally the fastest format; that is why models are quantised.",
            2: "Size can matter, but the profiler already named the cause: an unsupported layer.",
          },
        },
        explanation: "Unsupported operations **fall back to the CPU**. Each fallback splits the model, adds transfers and synchronisation, and the CPU part can dominate the time (Amdahl's law from *Many cores: why 8 cores is not 8x faster*). The usual fixes: replace the layer with a supported equivalent, retrain or re-export, or check the vendor's list of supported operations before choosing the model.",
      },
      {
        kind: "explain",
        title: "Practice on real boards",
        body: P(
          "Everything in this module can be tried on cheap hardware. Examples, with no favourite implied:",
          "- **MCU boards** (a few to about 30 dollars): Raspberry Pi Pico (RP2040 / RP2350), ST Nucleo boards (STM32), Espressif ESP32 dev kits (with Wi-Fi), Nordic nRF52 or nRF54 DKs (Bluetooth). Toolchains: GCC or Clang for Arm and RISC-V, vendor IDEs, Zephyr, PlatformIO.\n- **Debug**: an SWD/JTAG probe with **OpenOCD** or pyOCD and GDB, or a commercial **J-Link** (education licences are cheap, commercial ones are not). Many dev boards have a probe built in.\n- **Measure**: a multimeter, an **oscilloscope**, and a **logic analyser** (from about 10-dollar clones used with sigrok/PulseView to commercial ones costing hundreds) to decode UART, I²C and SPI.\n- **Linux SoC boards** (roughly 50 to 150 dollars, more for AI boards): Raspberry Pi, BeagleBone/BeaglePlay, NXP i.MX and Rockchip based boards, and NVIDIA Jetson for GPU and AI work (several hundred dollars).",
          "A good path: blink an LED with registers only, read a button with debouncing, dim with PWM, read an I²C sensor and check it with a logic analyser, stream ADC samples with DMA, then put it all under an RTOS and measure the current. Then boot Linux on an SoC board and write a device-tree node for the same sensor.",
        ),
      },
      {
        kind: "recap",
        points: [
          "An **SoC** combines big and little **CPU clusters**, a **GPU**, **NPU**, **DSP**, **ISP** and codecs, sharing DRAM through a **memory controller** over an **interconnect**.",
          "Run each workload on the block that does it most efficiently; specialists beat CPUs many times over on their own job.",
          "Linux boots in stages: **boot ROM → first-stage loader (DRAM setup) → U-Boot → kernel + device tree → init**.",
          "A **device tree** describes hardware the kernel cannot discover; `compatible` strings pick the **drivers**.",
          "GPUs use OpenGL ES / Vulkan / OpenCL on shared memory; NPUs are reached through framework **delegates**, and unsupported layers fall back to the CPU.",
        ],
      },
    ],
  },
];
