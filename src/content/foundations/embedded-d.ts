import type { ConceptLesson } from "../../learn/types.ts";

/** Paragraphs joined with blank lines. */
const P = (...paras: string[]) => paras.join("\n\n");

/** Lesson 12. Links between chips: serial lanes and line coding, PCIe, USB, Ethernet, CAN. */
export const emb12Links: ConceptLesson = {
  id: "fnd-emb-12-links",
  title: "Links between chips",
  summary: "Fast serial lanes and line coding, how PCIe and USB find their devices, what an Ethernet port needs, and how CAN settles who talks first.",
  minutes: 12,
  xp: 75,
  level: "Advanced",
  steps: [
    // 1
    {
      kind: "explain",
      title: "Fast links are serial",
      body: P(
        "*Talking to other chips* covered UART, I²C and SPI. They are fine up to a few tens of MHz. Faster than that, a **parallel** bus (many wires, one clock) gets into trouble. The bits on different wires arrive at slightly different times: that is **skew**, and it eats the margin.",
        "So fast links go back to **serial**. Each **lane** is a pair of **differential pairs**, one per direction. A differential pair is two wires that carry opposite signals. Noise hits both wires alike, and the receiver only looks at the *difference*, so the noise cancels. (*Signal integrity* covers controlled impedance and termination, which these pairs need.) A **SerDes** (serializer/deserializer) turns parallel data into the stream at one end and back at the other.",
        "There is **no clock wire**. The receiver rebuilds the clock from the edges in the data itself: **clock and data recovery (CDR)**. For that, the stream needs plenty of transitions, and as many 1s as 0s (**DC balance**), because links are often AC-coupled through capacitors. Making the bits behave like that is **line coding**.",
        "- **8b/10b** (PCIe 1.x and 2.x, USB 3.0 at 5 Gb/s, SATA): every byte is sent as 10 bits. That is **20% overhead**.\n- **128b/130b** (PCIe 3.0 to 5.0): a 2-bit header per 128 bits, plus scrambling. About **1.5%** overhead.",
        "Lane speeds are quoted in **GT/s**: billions of transfers per second on the wire, *before* coding. PCIe 1.0 runs 2.5 GT/s per lane, 2.0 runs 5, 3.0 runs 8, 4.0 runs 16, and 5.0 runs 32. More bandwidth comes from more lanes: **x1**, **x4**, **x16**. (PCIe 6.0 switched to a different signalling scheme, PAM4, with a new packet format.)",
      ),
    },
    // 2
    {
      kind: "question",
      title: "How fast is Gen3 x4?",
      body: "An NVMe SSD sits in a PCIe **3.0 x4** slot: 4 lanes at 8 GT/s each, 128b/130b coding. Work out the usable data rate in **GB/s** after line coding. Ignore packet overhead.",
      question: {
        type: "number",
        answer: 3.94,
        tolerance: 0.02,
        unit: "GB/s",
        hint: "Take the raw rate per lane, multiply by the coding efficiency, then by the lane count, and finally turn bits into bytes.",
      },
      explanation: "8 GT/s × 128/130 × 4 lanes ÷ 8 bits per byte = 8 × 0.9846 × 4 ÷ 8 = **3.94 GB/s**. Compare PCIe 2.0 x4: 5 × 8/10 × 4 ÷ 8 = 2.0 GB/s. Gen3 has only 1.6× the raw rate but nearly **2×** the data rate, thanks to the cheaper coding. Real transfers are lower again, because every packet carries headers and flow control: about 3.5 GB/s is typical for a Gen3 x4 SSD.",
    },
    // 3
    {
      kind: "question",
      title: "Why not just send the bytes?",
      body: "A serial link does not send raw bytes. It runs them through 8b/10b or 128b/130b coding first. Why?",
      question: {
        type: "choice",
        options: [
          "To encrypt the data so nobody can read the link",
          "To add error correction so every damaged byte is repaired",
          "To keep the clock recoverable and the line balanced",
          "To let several devices share one lane without clashing",
        ],
        answer: 2,
        hint: "There is no clock wire. What does the receiver need to see in the data to keep its own clock in step?",
        feedback: {
          0: "Encryption is a separate layer (PCIe has its own optional one, IDE). Line coding only shapes the bits.",
          1: "8b/10b can notice some invalid codes but corrects none. PCIe adds a CRC to each packet and resends damaged ones, higher up.",
          3: "A lane is point to point: one transmitter, one receiver. Nothing shares it.",
        },
      },
      explanation: "Coding guarantees **frequent transitions**, so the CDR can rebuild the clock, and **DC balance**, so AC-coupling capacitors do not drift. The price is the overhead you just computed: 20% for 8b/10b, about 1.5% for 128b/130b.",
    },
    // 4
    {
      kind: "explain",
      title: "PCIe: train, then enumerate",
      body: P(
        "**PCIe** is **point to point**, not a shared bus: the host has a separate link to each device. Two things happen at power-up.",
        "First, **link training**, run by a state machine in each end (the **LTSSM**). Each end detects a receiver on every lane. They exchange **training sequences** to lock onto bits and symbols, and agree on the width and speed. The link starts at 2.5 GT/s, then retrains to the fastest speed both ends support. When it reaches state **L0**, the link is up.",
        "Second, **enumeration**. The host (the **root complex**) walks the bus. For each device it reads the **configuration space**, a small block of registers every PCIe function has: **Vendor ID**, **Device ID** and a **class code**. It sizes each **BAR** (base address register) and assigns it an address. A BAR is the memory window where the device's registers appear: the memory-mapped I/O of *Registers and memory-mapped I/O*. Finally the OS binds a **driver** by matching the IDs.",
        "Compare an I²C sensor. It cannot announce itself, so someone must tell the software it exists. (*SoCs: many processors on one chip* comes back to that with device trees.) A PCIe card says who it is, and the host does the rest.",
      ),
    },
    // 5
    {
      kind: "question",
      title: "Bring up a PCIe card",
      body: "A PCIe card is plugged into a powered-off board. Put the steps of its bring-up in the order they happen.",
      question: {
        type: "order",
        items: [
          "Each end detects a receiver on its lanes",
          "Training sequences lock bits and agree width and speed",
          "The link enters L0: link up",
          "The host reads Vendor and Device ID from configuration space",
          "The host assigns addresses to the device's BARs",
          "The OS loads the driver that matches the IDs",
        ],
        hint: "Nothing can be read from a card until the link is up, and a driver needs both the IDs and the card's address window.",
      },
      explanation: "The link comes first: detect, train, L0. Only then can the host read **configuration space**. It reads the IDs, sizes and assigns the **BARs**, and the OS matches the IDs to a driver. The driver then reads and writes the device through those BAR addresses.",
    },
    // 6
    {
      kind: "question",
      title: "Plug and no driver",
      body: P(
        "**USB** has one **host**. Devices never talk first: they only answer when polled. When you plug one in, the host runs **enumeration**. It resets the device, which answers at address 0. The host reads its **device descriptor**, gives it a new address (**SET_ADDRESS**), reads the **configuration descriptors** (interfaces, endpoints and a **class**) and picks a configuration.",
        "The class is the clever part. **HID** covers keyboards and mice, **MSC** storage, **CDC-ACM** a \"virtual serial port\", and there are audio and others. One OS driver serves every device of a class. Speeds: **full speed** 12 Mb/s is typical for an MCU, **high speed** is 480 Mb/s.",
        "Your MCU's firmware enumerates as **CDC-ACM**. A laptop opens it as a serial port, with no driver download. Why?",
      ),
      question: {
        type: "choice",
        options: [
          "The OS already has a CDC-ACM class driver",
          "The MCU uploads its own driver during enumeration",
          "USB devices are all serial ports underneath",
          "The laptop sees a UART on the USB data wires",
        ],
        answer: 0,
        hint: "The descriptors tell the host what *kind* of device this is. What does the OS keep for each kind?",
        feedback: {
          1: "Nothing is uploaded. The device only sends descriptors: facts about itself, not code.",
          2: "Underneath, USB is a packet protocol with endpoints and classes. A serial port is just one class built on it.",
          3: "No UART is on the wires. The two data wires carry USB packets, and the CDC-ACM class makes them look like a serial port to software.",
        },
      },
      explanation: "The descriptors say \"class CDC-ACM\", and every mainstream OS ships a driver for that class. That is why a USB serial port, a keyboard or a flash drive works the moment you plug it in. Vendor-specific devices, with their own class code, are the ones that need a driver.",
    },
    // 7
    {
      kind: "question",
      title: "Wire up Ethernet",
      body: P(
        "Ethernet on a board has two parts. The **MAC** is often inside the MCU or SoC. It builds and checks frames: addresses, length and CRC. The **PHY** is usually a separate chip. It turns frames into the analog signal on the cable and back, and **autonegotiates** 10, 100 or 1000 Mb/s with the other end.",
        "MAC and PHY talk over **RMII** (100 Mb/s, with a **50 MHz reference clock**) or **RGMII** (gigabit). The MAC also reads and sets PHY registers over a two-wire bus called **MDIO**. Between the PHY and the RJ45 jack sit the **magnetics**: pulse transformers, often built into the jack. They give **isolation** (tested to about 1500 V, typically) and reject common-mode noise.",
        "The datasheet of your MCU says \"Ethernet MAC with RMII\". What else must the board have before a cable works?",
      ),
      question: {
        type: "choice",
        options: [
          "Nothing: RMII pins connect straight to the RJ45",
          "Only the magnetics, since the MAC drives the cable",
          "A USB-to-Ethernet bridge between the two",
          "A PHY chip, magnetics and a 50 MHz reference clock",
        ],
        answer: 3,
        hint: "The MAC only knows frames. Who makes the analog signal, and what does the RMII interface need to run?",
        feedback: {
          0: "RMII is a digital interface to a PHY, with signals at logic levels. The cable needs analog line signals and isolation.",
          1: "The magnetics connect a PHY to the jack. A MAC has no analog line driver, so the magnetics alone have nothing to carry.",
          2: "A USB bridge is a different design: a chip with its own MAC and PHY behind USB. It is not what joins a MAC to the jack.",
        },
      },
      explanation: "A MAC with RMII is only half a port. The board needs the **PHY** (analog side, autonegotiation), the **magnetics** (isolation and noise rejection), and the **50 MHz reference clock** that RMII uses: from a crystal, or sometimes supplied by the MCU or the PHY. Many MCU boards also route the **MDIO** pins so firmware can read the link state.",
    },
    // 8
    {
      kind: "explain",
      title: "CAN: the car's shared bus",
      body: P(
        "**CAN** is the shared bus in cars, trucks and many industrial machines. It uses two wires, **CANH** and **CANL**: a differential pair, with a **120 Ω** resistor at *each* end of the bus. A healthy, powered-off bus measures about **60 Ω** across the pair (two 120 Ω in parallel): a classic first check.",
        "A bit is **dominant** (0: the pair is driven apart) or **recessive** (1: not driven, the pair relaxes together). If *any* node sends dominant, the bus is dominant. That is a **wired-AND**, like the open-drain lines in *GPIO in depth*.",
        "Every frame starts with an **identifier** (11 bits in classic CAN), sent most significant bit first. Every node **listens while it sends**. A node that sends recessive but reads dominant knows someone else is sending something that wins. It stops **at once**, and the winner's frame is not damaged. This is **arbitration**: the **lowest ID wins**, so the ID is the priority.",
        "Classic CAN runs up to 1 Mb/s and carries up to 8 data bytes. **CAN FD** speeds up the data phase (typically 2 to 5 Mb/s) and carries up to 64 bytes. An MCU needs a **CAN controller** (a peripheral) plus a **transceiver** chip that makes the wire levels. In industry, higher-level protocols such as CANopen build on this.",
        "Edit the IDs below. All three nodes start at the same moment. Watch where each one backs off.",
      ),
      widget: {
        type: "emb-can",
        props: {
          nodes: [
            { id: "engine", name: "Engine", canId: 0x1a0 },
            { id: "radio", name: "Radio", canId: 0x3f1 },
            { id: "brake", name: "Brake", canId: 0x0c8 },
          ],
          lock: [],
        },
      },
    },
    // 9
    {
      kind: "question",
      title: "Brakes first",
      body: "Window (ID 0x2A0), Radio (0x3F1) and Brake all start sending at the same moment. Give **Brake** an ID that makes it win arbitration. IDs must stay unique, and 11 bits means 0x000 to 0x7FF.",
      widget: {
        type: "emb-can",
        props: {
          nodes: [
            { id: "window", name: "Window", canId: 0x2a0 },
            { id: "radio", name: "Radio", canId: 0x3f1 },
            { id: "brake", name: "Brake", canId: 0x5c0 },
          ],
          lock: ["window", "radio"],
        },
      },
      question: {
        type: "widget",
        goal: { winner: "brake" },
        prompt: "Edit Brake's ID so that Brake wins.",
        hint: "A node backs off when it sends a 1 where another sends a 0. The first bit where IDs differ decides. Which bit values win?",
      },
      explanation: "Any ID **below 0x2A0** works: at the first bit where two IDs differ, the one with 0 (dominant) wins, which is the numerically lower ID. (0x2A0 itself would clash with Window.) On a real network the IDs come from a **network plan**, and safety messages such as braking get the lowest numbers, so they are never delayed by a radio or a window motor.",
    },
    // 10
    {
      kind: "recap",
      title: "Recap",
      points: [
        "Fast links are **serial lanes**: a differential pair per direction, a SerDes, and the clock recovered from the data. **Line coding** keeps transitions frequent and the line DC balanced: 8b/10b costs 20%, 128b/130b about 1.5%.",
        "**PCIe** trains a point-to-point link, then the host **enumerates**: it reads IDs from configuration space, assigns the BARs, and the OS picks a driver. Gen3 x4 is 8 × 128/130 × 4 ÷ 8 = 3.94 GB/s before packet overhead.",
        "**USB** has one host that polls. Enumeration reads descriptors, and a **class** (HID, CDC-ACM, MSC) lets one OS driver serve every device of that kind.",
        "An **Ethernet** port is a MAC (in the chip) plus a PHY, magnetics and, for RMII, a 50 MHz reference clock.",
        "**CAN** is a wired-AND bus with 120 Ω at each end. Arbitration on the ID means the lowest ID wins with no lost time, so the ID is the priority. Next, *DMA: moving data without the CPU* moves the data these links bring without keeping the CPU busy.",
      ],
    },
  ],
};
