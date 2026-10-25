import type { Module } from "../../learn/types.ts";

/** Programs for the toy CPU widget (one byte per cell: high 4 bits = opcode, low 4 bits = address). */
const ADD_PROGRAM = ["LOAD 14", "ADD 15", "STORE 13", "OUT", "HALT", 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 7];
const ADD_NAMES = { "13": "sum", "14": "x", "15": "y" };
const DOUBLE_PROGRAM = ["LOAD 14", "ADD 14", "ADD 15", "STORE 13", "OUT", "HALT", 0, 0, 0, 0, 0, 0, 0, 0, 6, 3];
const COUNT_UP = ["LOAD 14", "ADD 15", "OUT", "JUMP 1", 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
const COUNTDOWN = (n: number) => ["LOAD 14", "OUT", "SUB 15", "JZ 5", "JUMP 1", "HALT", 0, 0, 0, 0, 0, 0, 0, 0, n, 1];
const COUNTDOWN_NAMES = { "14": "start", "15": "one" };

/** Module 2: inside the computer (parts, memory, the CPU's loop, clock, buses, caches, I/O, boot). */
export const computerModule: Module = {
  id: "computer",
  part: "machine",
  title: "Inside the computer",
  blurb: "CPU, memory and addresses, the fetch-decode-execute cycle, buses, storage and how the parts talk.",
  icon: "circuit",
  lessons: [
    // ── Lesson 1 ──
    {
      id: "fnd-computer-1-parts",
      title: "The parts of a computer",
      summary: "A processor, memory, storage, and devices for input and output. What each one is for.",
      minutes: 6,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "Meet the machine",
          body: "A phone, a laptop and a giant server look nothing alike, but inside they're built from the same few kinds of parts. Some do the **processing**, some **remember** things, and some move information **in** and **out**.\n\nTap each part to find out what it does.",
          widget: { type: "computer-machine", props: { mode: "explore" } },
        },
        {
          kind: "question",
          title: "Who does the work?",
          body: "A program is a long list of tiny instructions: add these two numbers, compare those, copy this byte. Tap the part that actually **carries out** those instructions.",
          widget: { type: "computer-machine", props: { mode: "pick" } },
          question: { type: "widget", goal: { picked: "cpu" } },
          explanation: "The **CPU** (central processing unit, or processor) follows instructions one after another. Memory and storage only *hold* instructions and data; they can't act on them.",
        },
        {
          kind: "question",
          title: "The power cut",
          body: "You're halfway through an essay and haven't saved yet. The power cuts out. Where was the unsaved part of your essay, the part that's now lost?",
          question: {
            type: "choice",
            options: ["In memory (RAM)", "In storage (the SSD)", "Inside the CPU", "On the screen"],
            answer: 0,
          },
          explanation: "While you work, a document lives in **memory (RAM)**, which is fast but forgets everything without power. Saving copies it to **storage**, which keeps it. The screen only *shows* a picture of your work; the actual bytes were in RAM.",
        },
        {
          kind: "question",
          title: "Where does a game live?",
          body: "You install a game, then shut the computer down for the night. Tap the part that holds the game while the power is off.",
          widget: { type: "computer-machine", props: { mode: "pick" } },
          question: { type: "widget", goal: { picked: "storage" } },
          explanation: "Installed apps and saved files stay in **storage**. When you start the game tomorrow, it gets copied from storage into memory, because the CPU can reach memory much faster.",
        },
        {
          kind: "question",
          title: "In, out, or both?",
          body: "**Input** devices turn something from the outside world into numbers for the computer. **Output** devices turn numbers into something you can see, hear or hold. Sort these devices.",
          widget: {
            type: "pattern-sorter",
            props: {
              buckets: [
                { id: "in", label: "Input", hint: "world → computer" },
                { id: "out", label: "Output", hint: "computer → world" },
                { id: "both", label: "Both" },
              ],
              items: [
                { id: "keyboard", text: "Keyboard" },
                { id: "speakers", text: "Speakers" },
                { id: "webcam", text: "Webcam" },
                { id: "printer", text: "Printer" },
                { id: "touch", text: "Touchscreen" },
                { id: "mic", text: "Microphone" },
                { id: "monitor", text: "Monitor" },
                { id: "headset", text: "Headset with a mic" },
              ],
              answer: { keyboard: "in", speakers: "out", webcam: "in", printer: "out", touch: "both", mic: "in", monitor: "out", headset: "both" },
            },
          },
          question: {
            type: "widget",
            goal: { placed: { keyboard: "in", speakers: "out", webcam: "in", printer: "out", touch: "both", mic: "in", monitor: "out", headset: "both" } },
          },
          explanation: "Keyboards, webcams and microphones bring information **in**; speakers, printers and monitors send it **out**. A touchscreen is both: a display that also senses your finger. A headset has speakers for your ears and a microphone for your voice.",
        },
        {
          kind: "explain",
          title: "Follow a task through the machine",
          body: "The parts are only interesting when they work together. Pick a task and press **Next** to watch it move from part to part. Notice how often things pass through memory on the way.",
          widget: {
            type: "computer-machine",
            props: {
              mode: "flow",
              scenarios: [
                {
                  label: "Open a photo",
                  path: [
                    { part: "mouse", text: "You double-click the photo. The mouse reports the click to the computer." },
                    { part: "cpu", text: "The CPU, running the operating system, works out which file you clicked and asks storage for it." },
                    { part: "storage", text: "Storage finds the file's bytes. For a CPU this is a long wait, which is why big files take a moment to open." },
                    { part: "ram", text: "The bytes are copied into memory, where the CPU can reach them quickly." },
                    { part: "cpu", text: "Photos are stored squeezed (compressed), so the CPU unpacks them, working out a colour for every pixel." },
                    { part: "screen", text: "The pixel colours go out to the screen, and your photo appears." },
                  ],
                },
                {
                  label: "Voice note",
                  path: [
                    { part: "mic", text: "You speak. The microphone measures the sound tens of thousands of times a second and sends each reading in as a number." },
                    { part: "ram", text: "The readings pile up in memory as they arrive." },
                    { part: "cpu", text: "The CPU compresses them so the recording takes far less space." },
                    { part: "storage", text: "You press Save. The bytes are written to storage, so the note survives a restart." },
                    { part: "speaker", text: "Later you play it back: the bytes come from storage, through memory and the CPU, out to the speaker." },
                  ],
                },
              ],
            },
          },
        },
        {
          kind: "question",
          title: "Put it in order",
          body: "Put the steps of opening a photo in the right order.",
          question: {
            type: "order",
            items: [
              "The mouse reports your double-click",
              "The CPU asks storage for the file",
              "The file's bytes are copied into memory",
              "The CPU works out every pixel's colour",
              "The photo appears on the screen",
            ],
          },
          explanation: "Input → processing → memory → processing → output. The CPU never works on the file while it sits in storage: it's always copied into memory first.",
        },
        {
          kind: "question",
          title: "Why have both?",
          body: "Memory and storage both hold bytes. Why does a computer need both kinds?",
          question: {
            type: "choice",
            options: [
              "Memory is fast but forgets without power and is smaller; storage keeps data and is bigger, but much slower",
              "Storage is only for photos and music; memory is for everything else",
              "Memory is just a backup copy of storage, in case it breaks",
              "They're the same thing; storage is simply the older name for memory",
            ],
            answer: 0,
          },
          explanation: "Each one is good at what the other is bad at. Memory is quick enough to keep up with the CPU but forgets everything at power-off; storage remembers for years but is slow. So programs and files **live** in storage and get **copied** into memory while in use.",
        },
        {
          kind: "recap",
          points: [
            "The **CPU** follows a program's instructions, one tiny step at a time.",
            "**Memory (RAM)** holds what's in use right now: fast, but forgets without power.",
            "**Storage** (SSD or hard drive) keeps files and apps with the power off: big, but slow.",
            "**Input** devices bring information in; **output** devices send it out; some do both.",
            "Work flows input → CPU and memory → output, and files are copied from storage into memory before the CPU uses them.",
          ],
        },
      ],
    },

    // ── Lesson 2 ──
    {
      id: "fnd-computer-2-memory",
      title: "Memory is a row of numbered boxes",
      summary: "Addresses and values, reading and writing bytes, and why memory forgets when the power goes.",
      minutes: 7,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "A long row of boxes",
          body: "Picture memory as a very long row of boxes. Each box holds **one byte**: a number from 0 to 255. Each box also has a number of its own, its **address**, counting up from 0.\n\nThe small number on top of each box is its address; the big one is what's inside. Tap a few boxes.",
          widget: { type: "computer-memory", props: { mode: "view", initial: [12, 0, 7, 255, 42, 9, 3, 65, 4, 100, 0, 18, 77, 5, 200, 1] } },
        },
        {
          kind: "question",
          title: "Read a box",
          body: "These boxes hide their contents until you read them. Find out which number is stored at address **6**.",
          widget: { type: "computer-memory", props: { mode: "read", initial: [31, 8, 0, 14, 96, 2, 57, 250, 11, 4, 0, 73, 6, 19, 128, 3] } },
          question: { type: "number", answer: 57 },
          explanation: "Address 6 is the seventh box, because addresses start at 0. It holds **57**. To read memory, the CPU names an address and gets back the byte stored there.",
        },
        {
          kind: "question",
          title: "Where vs what",
          body: "Look at boxes 4 and 9 below. What is *the value at address 9*?",
          widget: { type: "computer-memory", props: { mode: "view", size: 12, initial: [0, 0, 0, 0, 9, 0, 0, 0, 0, 4, 0, 0] } },
          question: { type: "choice", options: ["4", "9", "13", "Nothing: it's empty"], answer: 0 },
          explanation: "Box 9 holds **4**. An address says *where*; the value says *what*. They're both just numbers, which is exactly why they're easy to mix up. Keep asking: is this number a place, or the thing in the place?",
        },
        {
          kind: "question",
          title: "Write a byte",
          body: "Writing puts a new number into a box. Store **42** at address **5**: pick the address, type the value and press **Write**.",
          widget: { type: "computer-memory", props: { mode: "rw", initial: [3, 14, 15, 9, 26, 5, 35, 89, 79, 32, 38, 46, 26, 43, 38, 32] } },
          question: { type: "widget", goal: { cells: { "5": 42 } } },
          explanation: "To write, the CPU names an address *and* a value, and memory stores the value in that box. Every box can be written as often as you like.",
        },
        {
          kind: "question",
          title: "Write over it",
          body: "Address 2 holds **200**. You write **13** to address 2, then read address 2. What do you get?",
          question: { type: "choice", options: ["13", "200", "213", "Both: 200 and 13"], answer: 0 },
          explanation: "A box holds exactly one byte, so writing **replaces** what was there: you read back 13, and the 200 is gone for good. There's no undo inside memory. If a program needs the old value, it must copy it somewhere else first.",
        },
        {
          kind: "question",
          title: "Copy the high score",
          body: "A game keeps the current score at address **12** and the best score at address **13**. You just beat the best! Copy your score into address 13.",
          widget: {
            type: "computer-memory",
            props: { mode: "rw", initial: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 87, 64, 0, 0], names: { "12": "score", "13": "best" } },
          },
          question: { type: "widget", goal: { cells: { "13": 87 } } },
          explanation: "Copying is a **read** (address 12 holds 87) followed by a **write** (87 into address 13). The score at 12 is untouched: reading never changes a box. Notice the names: when a program says `best = score`, this is what really happens. A variable is a friendly name for an address.",
        },
        {
          kind: "question",
          title: "How many addresses?",
          body: "A tiny computer writes its addresses as 8-bit numbers. How many different boxes can it name?",
          question: { type: "number", answer: 256, unit: "boxes" },
          explanation: "8 bits make 2⁸ = **256** patterns, so addresses 0 to 255. The size of an address limits how much memory a computer can use: with 32-bit addresses that's about 4.3 billion bytes (4 GB), which is why older 32-bit PCs couldn't use more than 4 GB of RAM. Today's 64-bit addresses go far beyond any memory that exists.",
        },
        {
          kind: "explain",
          title: "Why memory forgets",
          body: "RAM stores each bit as a tiny electric charge that leaks away within a fraction of a second, so the memory chips keep topping the charges up, many times a second. Cut the power and the refreshing stops: everything is lost in moments.\n\nStorage is built differently. An SSD traps charge in cells that hold it for years, with no power at all. Try it: type, save, and pull the plug.",
          widget: { type: "computer-power" },
        },
        {
          kind: "question",
          title: "Survive a power cut",
          body: "Type at least **5 letters**, and make sure they survive a power cut: after you turn the power back on, get them back into memory.",
          widget: { type: "computer-power" },
          question: { type: "widget", goal: { survived: 5 } },
          explanation: "Type → **Save** (a copy goes to storage) → Power off (memory is wiped) → Power on → **Open** (storage copies the file back into memory). That round trip is what really happens every time you save a file and open it again later.",
        },
        {
          kind: "recap",
          points: [
            "Memory is a row of boxes. Each holds one byte and has a number, its **address**, starting at 0.",
            "**Read**: name an address, get its value back. Reading changes nothing.",
            "**Write**: name an address and a value; the old value is replaced for good.",
            "The size of an address limits how much memory can be used: 8 bits name 256 boxes.",
            "RAM needs power to keep its contents; storage keeps them without it, which is why you save.",
          ],
        },
      ],
    },

    // ── Lesson 3 ──
    {
      id: "fnd-computer-3-cycle",
      title: "Fetch, decode, execute",
      summary: "The loop every CPU runs forever, a program counter, and a tiny program you step through.",
      minutes: 8,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "The CPU's loop",
          body: "Every CPU runs the same three-beat loop, over and over, as long as it has power:\n\n- **Fetch** the next instruction from memory.\n- **Decode** it: work out what it means.\n- **Execute** it: do it.\n\nHere's a toy CPU with 16 bytes of memory and a short program in it. Press **Step** a few times and watch the three stages take turns.",
          widget: { type: "computer-cpu", props: { program: ADD_PROGRAM, names: ADD_NAMES } },
        },
        {
          kind: "question",
          title: "Where's the program?",
          body: "Look at the memory boxes. Where does the CPU find the instructions it runs?",
          widget: { type: "computer-cpu", props: { program: ADD_PROGRAM, names: ADD_NAMES } },
          question: {
            type: "choice",
            options: [
              "In memory, as bytes, right next to the data",
              "Built into the CPU at the factory",
              "In storage: the CPU reads each instruction from the disk",
              "They're typed in by the user as it runs",
            ],
            answer: 0,
          },
          explanation: "The program sits in **memory**, as ordinary bytes, alongside the numbers it works on (addresses 13 to 15 here). This idea, programs stored in memory just like data, is what makes a computer general-purpose: load different bytes and the same CPU does a different job.",
        },
        {
          kind: "question",
          title: "The program counter",
          body: "The CPU has a few tiny storage slots of its own, called **registers**. One of them, the **program counter (PC)**, holds the address of the next instruction. Fetch copies the byte at that address into the **instruction register (IR)** and adds 1 to PC.\n\nPC is **0**. The CPU does one fetch. What is PC now?",
          question: { type: "number", answer: 1 },
          explanation: "PC moves on to **1**, so the next fetch takes the next instruction. Instructions run in order, one address after another, unless one of them changes PC on purpose (you'll see that soon).",
        },
        {
          kind: "question",
          title: "Run the program",
          body: "Step through the whole program until the CPU stops. Watch PC count up on every fetch, and watch **A** (a register the CPU computes with, called the *accumulator*).",
          widget: { type: "computer-cpu", props: { program: ADD_PROGRAM, names: ADD_NAMES } },
          question: { type: "widget", goal: { halted: true } },
          explanation: "LOAD 14 put 5 in A, ADD 15 made it 12, STORE 13 wrote 12 into memory, OUT showed it, and HALT stopped the CPU. Five instructions, fifteen steps. A real CPU does exactly this, just billions of times a second.",
        },
        {
          kind: "question",
          title: "Instructions are numbers",
          body: "In memory, an instruction is just a byte. In this CPU, the first hex digit says **what to do** (the *opcode*) and the second says **which address**:\n\n```text\n0 HALT    1 LOAD    2 ADD     3 SUB\n4 STORE   5 JUMP    6 JZ      7 OUT\n```\n\nSo `0x1E` means LOAD from address E (14). What does the byte **0x2A** tell the CPU to do?",
          question: {
            type: "choice",
            options: ["Add the value at address 10 to A", "Add 2 and 10 together", "Load the value at address 42", "Store 42 in A"],
            answer: 0,
          },
          explanation: "Opcode **2** is ADD, and **A** in hex is 10, so `0x2A` is ADD 10: add the value at address 10 to A. That's all *decode* is: splitting the byte into its parts. The same byte, read as data, would just be the number 42. The CPU can't tell the difference; it only knows what PC points at.",
        },
        {
          kind: "question",
          title: "Predict the output",
          body: "Here's a new program. Read it instruction by instruction: what number will **OUT** show?",
          widget: { type: "computer-cpu", props: { program: DOUBLE_PROGRAM, names: ADD_NAMES, predict: true, granularity: "instruction" } },
          question: { type: "number", answer: 15 },
          explanation: "LOAD 14 sets A = 6. ADD 14 adds the 6 again: 12. ADD 15 adds 3: **15**. STORE 13 saves it, OUT shows it. Now press **Step instruction** and check each line against your prediction.",
        },
        {
          kind: "question",
          title: "A jump",
          body: "**JUMP** sets PC to an address, so the next fetch comes from there. What will this program do?",
          widget: { type: "computer-cpu", props: { program: COUNT_UP, names: { "15": "one" }, predict: true, granularity: "instruction", maxTicks: 90 } },
          question: {
            type: "choice",
            options: ["Show 1, 2, 3, 4… and never stop", "Show 1 once, then stop", "Show 1 over and over", "Crash at address 4"],
            answer: 0,
          },
          explanation: "After OUT, JUMP 1 sends PC back to address 1, so ADD 15 runs again and again, adding 1 each time: 1, 2, 3, … There's no HALT on that path, so it never stops: a **loop**. Every loop you'll ever write, `for` or `while`, becomes a jump like this underneath.",
        },
        {
          kind: "question",
          title: "Make it stop",
          body: "**JZ** (jump if zero) only jumps when A is 0. This countdown shows the start number, subtracts 1, and stops once it reaches 0.\n\nRight now it starts at 5. Change the number at address **14** so the program shows exactly **3, 2, 1** and halts. Then run it to check.",
          widget: { type: "computer-cpu", props: { program: COUNTDOWN(5), names: COUNTDOWN_NAMES, editable: [14], granularity: "instruction" } },
          question: { type: "widget", goal: { out: [3, 2, 1], halted: true } },
          explanation: "Start at **3**: OUT 3, SUB gives 2, JZ doesn't jump (A isn't 0), JUMP 1 loops back… until SUB makes A = 0 and JZ jumps to HALT. A loop plus a decision: with just these, a CPU can compute anything a computer can compute.",
        },
        {
          kind: "recap",
          points: [
            "A CPU loops forever: **fetch** an instruction, **decode** it, **execute** it.",
            "The **program counter** holds the address of the next instruction; each fetch moves it on by one.",
            "Programs live in memory as bytes, next to their data. An instruction byte is an opcode plus an address.",
            "Registers like **A** are the CPU's own tiny, very fast storage slots.",
            "**Jumps** change PC: unconditional jumps make loops, and conditional ones (JZ) make decisions.",
          ],
        },
      ],
    },

    // ── Lesson 4 ──
    {
      id: "fnd-computer-4-clock",
      title: "The clock",
      summary: "Ticks, gigahertz, and why clock speed alone doesn't tell you how fast a computer is.",
      minutes: 7,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "A drumbeat for the CPU",
          body: "Something has to tell the CPU when to move on to the next step. That's the job of the **clock**: a signal that flips between 0 and 1 at a perfectly steady rate. Each beat is called a **tick** (or a *cycle*). In our toy CPU, every stage of fetch, decode, execute takes one tick.\n\nPress **Run**, then try different speeds. **Hz** (hertz) means *ticks per second*.",
          widget: { type: "computer-cpu", props: { program: COUNTDOWN(5), names: COUNTDOWN_NAMES, clock: true } },
        },
        {
          kind: "question",
          title: "Gigahertz",
          body: "*Giga* means a billion. A laptop's CPU is advertised at **3 GHz**. How many ticks is that every second?",
          question: { type: "choice", options: ["3 thousand", "3 million", "3 billion", "3 trillion"], answer: 2 },
          explanation: "3 GHz = **3 billion** ticks per second. Our toy CPU at 10 Hz would need almost ten years to tick as many times as that laptop does in one second.",
        },
        {
          kind: "question",
          title: "How short is a tick?",
          body: "At **1 GHz** the clock ticks a billion times per second. How long does one tick last?",
          question: { type: "choice", options: ["1 second", "1 millisecond (a thousandth)", "1 microsecond (a millionth)", "1 nanosecond (a billionth)"], answer: 3 },
          explanation: "One second split a billion ways is **1 nanosecond** (ns). That's so short that light only travels about 30 cm in it. At 3 GHz, a tick lasts a third of that: in one tick, light crosses roughly the width of your hand.",
        },
        {
          kind: "explain",
          title: "Turn up the clock",
          body: "Here's a window of just **2 nanoseconds** of a real clock signal. Change the clock speed and count the ticks that fit in. The faster the clock, the more ticks per second, and the shorter each one is.",
          widget: { type: "computer-clock", props: { controls: ["ghz"], initial: { ghz: 1 } } },
        },
        {
          kind: "question",
          title: "More work per tick",
          body: "Real CPUs don't wait for one instruction to finish before starting the next. Like an assembly line, they overlap fetch, decode and execute, and they can run several instructions side by side. So *how much* gets done per tick matters as much as how many ticks there are.\n\nWhich CPU gets more done each second?",
          question: {
            type: "choice",
            options: ["CPU A: 4 GHz, finishes 1 instruction per tick", "CPU B: 3 GHz, finishes 2 instructions per tick", "They're equal", "You can't compare them"],
            answer: 1,
          },
          explanation: "A: 4 billion × 1 = 4 billion instructions per second. B: 3 billion × 2 = **6 billion**. B wins with the *slower* clock. That's why a newer 3 GHz chip can easily beat an older 4 GHz one.",
        },
        {
          kind: "explain",
          title: "Cores",
          body: "A **core** is a complete CPU: its own PC, its own registers, its own fetch-decode-execute loop. Most chips today hold several cores, so they can run several instruction streams at the same time.\n\nTry the knobs below and watch how long the job takes.",
          widget: { type: "computer-clock", props: { job: 24, initial: { ghz: 2, cores: 1, ipc: 1 } } },
        },
        {
          kind: "question",
          title: "Beat the deadline",
          body: "Finish the 24-billion-instruction job in **1 second or less**, without pushing the clock above **4 GHz** (any faster and this chip overheats).",
          widget: { type: "computer-clock", props: { job: 24, initial: { ghz: 2, cores: 1, ipc: 1 } } },
          question: { type: "widget", goal: { maxSeconds: 1, maxGhz: 4 } },
          explanation: "You need 24 billion instructions per second. At 4 GHz that's 6 instructions per tick in total, so you need more cores or more work per tick: 4 GHz × 2 cores × 4, or 3 GHz × 4 cores × 2, for example. Chip designers make this exact trade every day.",
        },
        {
          kind: "question",
          title: "When cores don't help",
          body: "Some jobs can't be split: every step needs the answer from the step before. Look at this one, then add cores. What happens to the time?",
          widget: { type: "computer-clock", props: { job: 24, split: false, controls: ["cores"], initial: { ghz: 3, cores: 1, ipc: 2 } }, live: true },
          question: {
            type: "choice",
            options: ["Nothing: only one core can work on it, the others sit idle", "It halves every time you double the cores", "It gets slower, because cores get in each other's way", "The job finishes instantly"],
            answer: 0,
          },
          explanation: "Extra cores only help when there are **separate** things to do at the same time, like several apps, or a job cut into independent pieces. A strictly step-by-step job runs on one core, so its speed comes down to that core's clock and work per tick.",
        },
        {
          kind: "question",
          title: "Why not 50 GHz?",
          body: "Clock speeds have stayed around 3 to 6 GHz for years. Why don't chip makers just build a 50 GHz CPU?",
          question: {
            type: "choice",
            options: [
              "Every tick switches billions of tiny transistors, and faster switching produces far more heat than can be carried away",
              "Software can't run faster than 6 GHz",
              "A clock can't count past 6 billion",
              "Nobody would need that speed",
            ],
            answer: 0,
          },
          explanation: "Power and heat climb steeply with clock speed, and each tick also has to be long enough for signals to settle across the circuit. So since the mid-2000s, chips got faster mainly by doing **more per tick** and adding **more cores**, not by raising the clock.",
        },
        {
          kind: "recap",
          points: [
            "The **clock** ticks at a steady rate; each tick moves the CPU's work forward one step.",
            "**1 GHz** = a billion ticks per second, so each tick lasts 1 nanosecond.",
            "Speed = ticks per second × work per tick × cores in use.",
            "Extra **cores** only help when the work can be split into parts that run at the same time.",
            "Heat limits clock speed, so modern chips get faster by doing more per tick and adding cores.",
          ],
        },
      ],
    },

    // ── Lesson 5 ──
    {
      id: "fnd-computer-5-bus",
      title: "Buses: how the parts talk",
      summary: "Address, data and control lines; reads and writes over a shared bus; devices that live at addresses.",
      minutes: 7,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "Wires that everyone shares",
          body: "The CPU and memory are joined by a **bus**: a bundle of parallel wires that the parts share. The wires come in three groups:\n\n- **Address lines** say *where*.\n- **Data lines** carry *the value*.\n- A **control line** says *read* or *write*.\n\nEach wire carries one bit at a time. Send a read and watch each group light up.",
          widget: { type: "computer-bus", props: { devices: false, ram: [5, 18, 0, 42, 7, 99, 0, 0, 13, 0, 64, 0, 2, 0], initial: { op: "read", addr: 3 } } },
        },
        {
          kind: "question",
          title: "How many addresses?",
          body: "This bus has **4 address lines**, each carrying one bit. How many different addresses can the CPU put on them?",
          question: { type: "number", answer: 16, unit: "addresses" },
          explanation: "4 bits make 2⁴ = **16** patterns, 0000 to 1111, so addresses 0 to 15. It's the same rule as in the memory lesson: the width of the address limits how many boxes can be named.",
        },
        {
          kind: "question",
          title: "Send a write",
          body: "Use the bus to store **9** at address **5**.",
          widget: { type: "computer-bus", props: { devices: false, ram: [5, 18, 0, 42, 7, 99, 0, 0, 13, 0, 64, 0, 2, 0], initial: { op: "read", addr: 0 } } },
          question: { type: "widget", goal: { last: { op: "write", addr: 5, data: 9 } } },
          explanation: "The CPU put 0101 (5) on the address lines, set the control line to WRITE, and put 00001001 (9) on the data lines. Memory saw its address, read the data lines, and stored 9.",
        },
        {
          kind: "question",
          title: "Which way?",
          body: "During a **read**, which way do the address and the data travel?",
          question: {
            type: "choice",
            options: [
              "The address goes CPU → memory; the data comes back memory → CPU",
              "Both go from the CPU to memory",
              "Both come from memory to the CPU",
              "The address goes memory → CPU; the data goes CPU → memory",
            ],
            answer: 0,
          },
          explanation: "The CPU always drives the address lines: it's the one asking. The data lines work both ways: CPU → memory on a write, memory → CPU on a read. Go back and watch the little arrow on the data lane if you want to see it.",
        },
        {
          kind: "question",
          title: "How wide is the data?",
          body: "This bus has **8 data lines**. How much can it carry in one trip?",
          question: { type: "choice", options: ["One bit", "One byte", "Eight bytes", "256 bytes"], answer: 1 },
          explanation: "8 lines carry 8 bits at once: **one byte**. Real machines use much wider paths: a modern memory channel is 64 bits wide, so it moves 8 bytes per transfer, and it does many transfers back to back.",
        },
        {
          kind: "explain",
          title: "Devices live at addresses too",
          body: "The bus doesn't only reach memory. Here, address **14** belongs to a **screen** and address **15** to a **keyboard**. The CPU talks to them with exactly the same reads and writes it uses for memory. This trick is called **memory-mapped I/O**.\n\nSend the write that's set up below and watch which part answers.",
          widget: { type: "computer-bus", props: { ram: [5, 18, 0, 42, 7, 99, 0, 0, 13, 0, 64, 0, 2, 0], initial: { op: "write", addr: 14, data: 72 } } },
        },
        {
          kind: "question",
          title: "Write to the screen",
          body: "Make the screen show the letter **A**. (From the first module: the code for A is 65.)",
          widget: { type: "computer-bus", props: { ram: [5, 18, 0, 42, 7, 99, 0, 0, 13, 0, 64, 0, 2, 0], initial: { op: "write", addr: 0 } } },
          question: { type: "widget", goal: { screen: "A" } },
          explanation: "Write **65** to address **14**. The screen controller recognises its address, takes the byte off the data lines and draws the matching character. Real graphics work the same way at a much bigger scale: programs write pixel colours into memory the graphics hardware reads from.",
        },
        {
          kind: "question",
          title: "Read the keyboard",
          body: "Press **B** on the little keyboard, then use a read to bring that key into the CPU.",
          widget: { type: "computer-bus", props: { ram: [5, 18, 0, 42, 7, 99, 0, 0, 13, 0, 64, 0, 2, 0], initial: { op: "read", addr: 0 } } },
          question: { type: "widget", goal: { last: { op: "read", addr: 15, data: 66 } } },
          explanation: "Read address **15**: the keyboard owns it and answers with the code of the last key pressed, **66** for B. To the CPU, asking the keyboard is no different from reading memory.",
        },
        {
          kind: "question",
          title: "Taking turns",
          body: "Everything shares the same data wires. Why must the parts take turns, with only one of them sending at a time?",
          question: {
            type: "choice",
            options: [
              "If two parts drive different values onto the same wire, the signals clash and the data is garbled",
              "The wires can only carry electricity in one direction",
              "Taking turns saves power, but they could all send at once if needed",
              "Memory can only remember one device's data",
            ],
            answer: 0,
          },
          explanation: "A wire can only be 0 or 1 at any moment. If memory pushes a 1 while the keyboard pushes a 0, the result is garbage (and the circuits fight each other). So a bus has rules about who may talk when, and the address on the lines decides which device answers.",
        },
        {
          kind: "recap",
          points: [
            "A **bus** is a set of shared wires: **address** lines (where), **data** lines (what), **control** lines (read or write).",
            "n address lines can name 2ⁿ addresses; n data lines carry n bits per trip.",
            "The CPU drives the address; data flows CPU → device on a write and device → CPU on a read.",
            "Devices can own addresses too (**memory-mapped I/O**), so reads and writes reach screens and keyboards.",
            "Only one part may drive the shared wires at a time.",
          ],
        },
      ],
    },

    // ── Lesson 6 ──
    {
      id: "fnd-computer-6-hierarchy",
      title: "The memory hierarchy",
      summary: "Registers, caches, RAM, SSDs and the network: a ladder from tiny and instant to huge and slow.",
      minutes: 7,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "Fast or big: pick one",
          body: "Memory that's very fast has to be small: it takes more chip space and power per byte, and it has to sit right next to the CPU. Memory that's big is slower. So computers stack several kinds into a ladder, from tiny and instant to huge and slow.\n\nTap each rung. The times are typical figures; real chips vary.",
          widget: { type: "computer-latency" },
        },
        {
          kind: "question",
          title: "In human time",
          body: "Nanoseconds are hard to feel. Switch the ladder to **If 1 ns were 1 second**. If reading from the L1 cache took 1 second, how long would a read from RAM take?",
          widget: { type: "computer-latency", props: { levels: ["reg", "l1", "l2", "l3", "ram"] }, live: true },
          question: { type: "choice", options: ["About 2 seconds", "About 2 minutes", "About a day", "About a year"], answer: 1 },
          explanation: "RAM takes around 100 ns, so in human time that's about **100 seconds**. While the CPU waits for RAM, it could have done a hundred or more operations. Waiting for memory is one of the biggest costs in real programs.",
        },
        {
          kind: "question",
          title: "Memory vs SSD",
          body: "A typical RAM read takes about **100 ns**. A typical SSD read takes about **100,000 ns** (100 microseconds). How many times slower is the SSD?",
          question: { type: "number", answer: 1000, unit: "times" },
          explanation: "100,000 ÷ 100 = **1,000**. In human time, a RAM read is a couple of minutes but an SSD read is about a day. That's why programs load files into memory once, instead of reading storage again and again.",
        },
        {
          kind: "explain",
          title: "A cache keeps copies close",
          body: "A **cache** is a small, fast memory between the CPU and RAM that keeps copies of recently used data. When the CPU wants something already in the cache, that's a **hit**: fast. If not, it's a **miss**: the CPU waits for RAM, and a copy is kept for next time. When the cache is full, the copy used longest ago is pushed out.\n\nRead a few addresses, then read some of them again.",
          widget: { type: "computer-cache" },
        },
        {
          kind: "question",
          title: "Make it fast",
          body: "Do **6 reads** that take **300 ns or less** in total.",
          widget: { type: "computer-cache" },
          question: { type: "widget", goal: { minReads: 6, maxTime: 300 } },
          explanation: "Every new address costs a 100 ns miss, so read the **same** addresses again: one or two misses, then 1 ns hits. Six different addresses would cost 600 ns. Programs that keep reusing the same data run much faster for exactly this reason.",
        },
        {
          kind: "question",
          title: "Predict the hits",
          body: "This cache has only **2 slots** and starts empty. When it's full, it pushes out whichever address was used longest ago. How many of these five reads will be **hits**?",
          widget: { type: "computer-cache", props: { slots: 2, size: 12, sequence: [3, 7, 3, 9, 7], predict: true } },
          question: { type: "number", answer: 1, unit: "hits" },
          explanation: "3 miss, 7 miss (cache: 3, 7), 3 **hit**. Then 9 misses and pushes out 7, the one used longest ago. So the final 7 misses too. Just **1** hit. With a third slot, the last read would have hit as well. Now press **Next read** to watch it happen.",
        },
        {
          kind: "question",
          title: "Why caches work",
          body: "A cache holds only a tiny fraction of RAM, yet most reads hit it. Why?",
          question: {
            type: "choice",
            options: [
              "Programs keep reusing the same data, and they tend to use data that sits next to what they just used",
              "Programs rarely read the same address twice",
              "The cache secretly holds a copy of all of RAM",
              "The CPU only reads from storage, never from RAM",
            ],
            answer: 0,
          },
          explanation: "A loop touches the same variables on every pass (reuse in **time**), and walking through a list reads neighbouring addresses (reuse in **space**). Real caches exploit both: on a miss they fetch a whole block of nearby bytes, typically 64 at once. This is called **locality**, and fast code is usually code with good locality.",
        },
        {
          kind: "recap",
          points: [
            "Memory comes as a ladder: registers → caches → RAM → SSD → network. Each rung is bigger and slower.",
            "In human time: if L1 took 1 second, RAM would take minutes and an SSD about a day.",
            "A **cache** keeps copies of recently used data close to the CPU: **hits** are fast, **misses** go to RAM.",
            "When a cache is full, something must be pushed out, often the item used longest ago.",
            "Caches work because programs reuse data and use neighbouring data (**locality**).",
          ],
        },
      ],
    },

    // ── Lesson 7 ──
    {
      id: "fnd-computer-7-io",
      title: "Input, output and interrupts",
      summary: "Polling vs interrupts, and the journey of a key press from your finger to your program.",
      minutes: 7,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "Checking, again and again",
          body: "A CPU runs billions of instructions a second, but you might press a key only a few times a second. Hundreds of millions of ticks can pass between presses. How does the CPU even notice one?\n\nThe simplest way is **polling**: every so often, stop the real work and check the keyboard. Press the key a few times and watch the timeline.",
          widget: { type: "computer-interrupts", props: { mode: "polling", pollEvery: 4 } },
        },
        {
          kind: "question",
          title: "What's wrong with polling?",
          body: "Watch the grey ticks and the waiting keys. What goes wrong with polling? Choose all that apply.",
          widget: { type: "computer-interrupts", props: { mode: "polling", pollEvery: 4 }, live: true },
          question: {
            type: "choice",
            options: [
              "Most checks find nothing, so those ticks are wasted",
              "A key can sit waiting until the next check comes round",
              "The keyboard has to wait for the whole program to finish",
              "Polling can only ever notice one key",
            ],
            answer: [0, 1],
          },
          explanation: "Polling pays twice: the CPU spends time on checks that usually find nothing, and a key press still waits until the next check. The program does eventually get every key; it's just wasteful and a little late.",
        },
        {
          kind: "question",
          title: "Check more often?",
          body: "Try checking every 2 ticks, then every 8. What's the trade-off?",
          widget: { type: "computer-interrupts", props: { mode: "polling", pollEvery: 4, tunePolling: true }, live: true },
          question: {
            type: "choice",
            options: [
              "Checking more often notices keys sooner, but wastes more ticks on checks",
              "Checking more often is better in every way",
              "Checking less often notices keys sooner",
              "How often you check makes no difference",
            ],
            answer: 0,
          },
          explanation: "Every 2 ticks: keys barely wait, but half of the CPU's time goes on checking. Every 8 ticks: less waste, but keys wait longer. There's no good setting, because the CPU is guessing when something will happen.",
        },
        {
          kind: "explain",
          title: "Interrupts: let the device knock",
          body: "With **interrupts**, the CPU doesn't check at all. When something happens, the device sends a signal on a dedicated wire, the **interrupt line**. The CPU finishes its current instruction, saves its place (its PC and registers), jumps to a small piece of code called an **interrupt handler**, then restores everything and carries on as if nothing happened.\n\nSwitch to **Interrupts** and press the key a few times.",
          widget: { type: "computer-interrupts", props: { mode: "choose" } },
        },
        {
          kind: "question",
          title: "Use interrupts",
          body: "Using interrupts, get **3 keys** to your program. Compare the useful-work figure with polling.",
          widget: { type: "computer-interrupts", props: { mode: "choose" } },
          question: { type: "widget", goal: { mode: "interrupt", minHandled: 3 } },
          explanation: "No wasted checks, and each key is handled on the very next tick. The CPU spends time on the keyboard only when there's actually a key. That's why practically every device, from keyboards to network cards to disks, signals the CPU with interrupts.",
        },
        {
          kind: "question",
          title: "Back to work",
          body: "The interrupt handler has just finished dealing with a key. What does the CPU do next?",
          question: {
            type: "choice",
            options: [
              "Picks up exactly where it was interrupted, because it saved its PC and registers first",
              "Restarts the interrupted program from the beginning",
              "Waits until another key is pressed",
              "Skips the instruction it was about to run",
            ],
            answer: 0,
          },
          explanation: "Saving the PC and registers is the whole trick. Restore them and the interrupted program carries on with the very next instruction, with no idea anything happened. This happens thousands of times a second on your computer right now.",
        },
        {
          kind: "explain",
          title: "The journey of a key press",
          body: "Here's what really happens between pressing a key and seeing a letter. Step through it.",
          widget: {
            type: "computer-journey",
            props: {
              stages: [
                { icon: "finger", title: "The key goes down", text: "Pressing the key closes a tiny switch underneath it.", tag: "hardware" },
                { icon: "keyboard", title: "The keyboard notices", text: "A small chip inside the keyboard scans its grid of switches many times a second, spots the closed one, and turns it into a key code: a number meaning “the A key went down”.", tag: "hardware" },
                { icon: "usb", title: "Over the cable", text: "The computer's USB controller asks the keyboard for news every few milliseconds and collects the key code. (USB itself works by polling, done by a dedicated chip so the CPU doesn't have to.)", tag: "hardware" },
                { icon: "interrupt", title: "Interrupt!", text: "The USB controller raises an interrupt. The CPU saves its place and jumps to the handler.", tag: "CPU" },
                { icon: "kernel", title: "The driver translates", text: "The handler belongs to the operating system's keyboard driver. It turns the code into an event, “A pressed”, taking Shift and your keyboard layout into account. Then the CPU goes back to what it was doing.", tag: "OS" },
                { icon: "app", title: "Delivered to your app", text: "The operating system works out which window you're typing into and puts the event in that app's queue.", tag: "OS" },
                { icon: "screen", title: "The letter appears", text: "The app reads the event, adds the letter to your text and redraws. From finger to screen typically takes a few to a few dozen milliseconds.", tag: "app" },
              ],
            },
          },
        },
        {
          kind: "question",
          title: "Put the journey in order",
          body: "Put the stages of a key press in order.",
          question: {
            type: "order",
            items: [
              "A switch under the key closes",
              "The keyboard's chip turns it into a key code",
              "The USB controller collects the code",
              "An interrupt makes the CPU run the driver",
              "The OS hands an event to the app you're typing in",
              "The app adds the letter and redraws the screen",
            ],
          },
          explanation: "Hardware → interrupt → operating system → app. You'll meet each layer again: drivers and events in the operating-system module, and the app at the end of the chain is the kind of program you'll write yourself.",
        },
        {
          kind: "question",
          title: "Data from the network",
          body: "A message from the internet arrives at the network card while the CPU is busy running a game. How does the CPU usually find out?",
          question: {
            type: "choice",
            options: [
              "The network card raises an interrupt",
              "The game checks the network card once per frame",
              "The message waits until the game is closed",
              "The CPU reads the network cable directly",
            ],
            answer: 0,
          },
          explanation: "Like the keyboard, the network card **interrupts**: it stores the incoming data in memory and signals the CPU, which runs the network driver for a moment and goes back to the game. (Under very heavy traffic, drivers switch to polling for a while, because then there's *always* something waiting.)",
        },
        {
          kind: "recap",
          points: [
            "Devices are slow and unpredictable compared with the CPU.",
            "**Polling**: the CPU keeps checking. Simple, but wastes time and notices things late.",
            "**Interrupts**: the device signals the CPU, which saves its place, runs a **handler**, and carries on.",
            "A key press travels: switch → keyboard chip → USB controller → interrupt → driver → OS → app.",
          ],
        },
      ],
    },

    // ── Lesson 8 ──
    {
      id: "fnd-computer-8-boot",
      title: "From power-on to your program",
      summary: "Firmware, the bootloader, the kernel, and how your app finally gets the CPU.",
      minutes: 7,
      xp: 60,
      steps: [
        {
          kind: "question",
          title: "The power-on puzzle",
          body: "You press the power button. Memory is empty (it forgot everything when the power went off), yet the CPU starts fetching instructions straight away. Where can its very first instructions come from?",
          question: {
            type: "choice",
            options: [
              "A small firmware chip on the motherboard that keeps its contents without power",
              "From memory (RAM), which keeps a copy of the start-up code",
              "From the operating system on the SSD, which the CPU reads directly",
              "From the internet",
            ],
            answer: 0,
          },
          explanation: "When a CPU starts up, its PC is set to a fixed address chosen by the chip's designers. The motherboard wires that address to a **firmware** chip (flash memory that keeps its contents without power) holding the start-up code: **UEFI** on modern PCs, the **BIOS** on older ones. The CPU can't read the SSD yet: it needs code that knows *how* to read it first.",
        },
        {
          kind: "explain",
          title: "The boot, step by step",
          body: "Starting a computer is a relay race: each small program gets just enough working to hand over to a bigger one. Step through it.",
          widget: {
            type: "computer-journey",
            props: {
              stages: [
                { icon: "power", title: "Power on", text: "The power supply settles and the CPU comes out of reset with its PC at the fixed starting address.", tag: "hardware" },
                { icon: "firmware", title: "Firmware wakes up", text: "That address is in the firmware chip. Its first job is to check and set up the hardware: memory, the clock, the buses and the devices attached to them.", tag: "firmware" },
                { icon: "storage", title: "Find a boot device", text: "The firmware looks through the drives, in the order set in its settings, for one with a bootloader on it.", tag: "firmware" },
                { icon: "ram", title: "The bootloader", text: "The bootloader is copied from storage into memory and run. It's a small program whose one job is to load an operating system, and it may let you choose which one.", tag: "bootloader" },
                { icon: "kernel", title: "The kernel takes over", text: "The bootloader copies the operating system's core, the **kernel**, into memory and jumps to its first instruction. The kernel sets up memory, loads drivers for the devices, and starts the first program.", tag: "OS" },
                { icon: "desktop", title: "Login and desktop", text: "That first program starts everything else: background services, the login screen, then your desktop.", tag: "OS" },
                { icon: "app", title: "Your app runs", text: "You open an app. The kernel copies its program from storage into memory and points the CPU's PC at its first instruction. Fetch, decode, execute: it's running.", tag: "you" },
              ],
            },
          },
        },
        {
          kind: "question",
          title: "Order the boot",
          body: "Put the start-up steps in order.",
          question: {
            type: "order",
            items: [
              "The CPU starts at its fixed address in the firmware",
              "The firmware checks and sets up the hardware",
              "The firmware finds a drive with a bootloader",
              "The bootloader loads the kernel into memory",
              "The kernel loads drivers and starts the first program",
              "The login screen and desktop appear",
            ],
          },
          explanation: "Firmware → bootloader → kernel → everything else. Each stage is a program that loads the next, bigger one into memory and jumps to it. That's why starting a computer is called **booting**: it's pulling itself up by its own bootstraps.",
        },
        {
          kind: "question",
          title: "Into which part?",
          body: "When the bootloader loads the kernel, it copies it from storage *into* somewhere. Tap that part.",
          widget: { type: "computer-machine", props: { mode: "pick" } },
          question: { type: "widget", goal: { picked: "ram" } },
          explanation: "Into **memory**. The CPU can only fetch instructions from memory, so every program, including the operating system itself, must be copied there from storage before it can run.",
        },
        {
          kind: "question",
          title: "Why a bootloader?",
          body: "Why does the firmware usually start a bootloader, instead of the operating system directly?",
          question: {
            type: "choice",
            options: [
              "Firmware is small and generic; each operating system ships its own bootloader that knows how to load it",
              "The bootloader makes the CPU run faster",
              "Firmware can't read storage at all",
              "There's no reason; it's just tradition",
            ],
            answer: 0,
          },
          explanation: "The firmware is made by the motherboard's maker and has to work with any operating system, so it only knows how to find and start a bootloader. The bootloader (such as GRUB or Windows Boot Manager) knows its own OS: where the kernel is and how to start it. Some systems can skip it, but the split keeps each piece simple.",
        },
        {
          kind: "question",
          title: "The kernel's job",
          body: "Once it's running, the kernel stays in charge until shutdown. Which of these are its jobs? Choose all that apply.",
          question: {
            type: "choice",
            options: [
              "Decide which program gets a CPU core, and for how long",
              "Give each program its own memory and stop programs touching each other's",
              "Talk to devices through drivers",
              "Fetch and decode every instruction for the CPU",
            ],
            answer: [0, 1, 2],
          },
          explanation: "The kernel shares out the CPU, the memory and the devices among all the programs. But it doesn't fetch or decode instructions: that's the **CPU's** own hardware loop. The kernel is just a program too, one the CPU runs whenever it's needed (often because of an interrupt).",
        },
        {
          kind: "question",
          title: "Launching an app",
          body: "You've seen every piece now. Put the launch of an app in order.",
          question: {
            type: "order",
            items: [
              "You double-click the app",
              "The kernel reads the program's file from storage",
              "The program's bytes are copied into memory",
              "The CPU's PC is set to the program's first instruction",
              "Fetch, decode, execute, again and again",
            ],
          },
          explanation: "Input, storage, memory, the program counter and the fetch-decode-execute loop: the whole module in five steps.",
        },
        {
          kind: "explain",
          title: "What's next",
          body: "You can now follow a program all the way down: it's bytes in storage, copied into memory, fetched and run by the CPU one instruction at a time, talking to devices over the bus and handling interrupts as they come in.\n\nNext, you'll look closer at each layer: **assembly**, the CPU's real instructions (like LOAD, ADD and JUMP, but richer); **C**, a language that sits just above them; the **operating system** that shares the machine out; and the **network** that connects machines together.",
          widget: { type: "computer-machine", props: { mode: "explore" } },
        },
        {
          kind: "recap",
          points: [
            "At power-on the CPU starts at a fixed address in the **firmware** (UEFI or BIOS), which keeps its contents without power.",
            "Firmware sets up the hardware and starts a **bootloader**, which loads the **kernel** into memory.",
            "The **kernel** shares the CPU, memory and devices among programs, and starts everything else.",
            "Launching an app = copy it from storage into memory, then point a CPU's PC at its first instruction.",
          ],
        },
      ],
    },
  ],
};
