import type { Module } from "../../learn/types.ts";

/** Fenced plain-text block (requests, responses, tables) for lesson prose. */
const text = (s: string) => "```text\n" + s.trim() + "\n```";

const LAYER_ITEMS = [
  { id: "ip", text: "An IP address like 203.0.113.80" },
  { id: "port", text: "Port 443" },
  { id: "dns", text: "Looking up www.example.com" },
  { id: "status", text: "Status code 404 Not Found" },
  { id: "mac", text: "A MAC address like a4:83:e7:2b:9c:44" },
  { id: "ack", text: "A TCP acknowledgement (ACK)" },
  { id: "table", text: "A router's forwarding table" },
  { id: "wifi", text: "Wi-Fi radio waves" },
];
const LAYER_ANSWER = { ip: "internet", port: "transport", dns: "app", status: "app", mac: "link", ack: "transport", table: "internet", wifi: "link" };

/** Module: networking. From "two computers joined by a link" to everything that happens when you type a URL. */
export const networkModule: Module = {
  id: "network",
  part: "machine",
  title: "Networking",
  blurb: "IP addresses, ports and packets, DNS, TCP and UDP, HTTP, and the layers that carry a request.",
  icon: "network",
  lessons: [
    // ─────────────────────────────── 1. What a network is ───────────────────────────────
    {
      id: "fnd-net-1-network",
      title: "What a network is",
      summary: "Devices, links, clients and servers, and the difference between your LAN and the internet.",
      minutes: 6,
      xp: 40,
      steps: [
        {
          kind: "explain",
          title: "Computers that talk",
          body: "A **network** is two or more devices joined so they can send each other bytes. The joins are called **links**: a cable, Wi-Fi radio waves, a fibre-optic line.\n\nHere is a typical home, and a little of what lies beyond it. Tap each box to see what it does.",
          widget: { type: "net-map", props: { mode: "explore" } },
        },
        {
          kind: "question",
          title: "The one door",
          body: "Every device in the home reaches the outside world through the same box. Tap it.",
          widget: { type: "net-map", props: { mode: "explore" } },
          question: { type: "widget", hint: "Which box connects the whole home to the internet?", goal: { selected: "router" } },
          explanation: "The **router** joins the home's devices to each other and to your internet provider. Everything that leaves the house goes through it.",
        },
        {
          kind: "explain",
          title: "Clients and servers",
          body: "Most conversations on a network have two sides:\n\n- A **client** *asks* for something: a page, a video, a file.\n- A **server** *waits* for requests and answers them.\n\nThese are **roles**, not kinds of hardware. A server is usually just a computer running a program that listens for requests. Your own laptop becomes a server the moment it shares a file.",
        },
        {
          kind: "question",
          title: "Who is asking?",
          body: "You open a news site on your phone. In that conversation, which one is the **client**?",
          question: {
            type: "choice",
            options: ["Your phone", "The news site's server", "Your home router", "The internet itself"],
            answer: 0,
          },
          explanation: "The phone **asks** for the page, so it's the client. The news site's server answers. The router only passes the messages along; it isn't a side of the conversation.",
        },
        {
          kind: "question",
          title: "The humble printer",
          body: "The printer sits on the Wi-Fi and waits until someone sends it a print job, then prints it and replies \"done\". What is it in that conversation?",
          question: {
            type: "choice",
            options: ["A client", "A server", "A router", "Not part of the network"],
            answer: 1,
          },
          explanation: "It waits for requests and answers them, so it plays the **server** role, even though it's a printer and not a big machine in a data centre.",
        },
        {
          kind: "explain",
          title: "LAN and the internet",
          body: "The devices in one home, office or school form a **local area network**, or **LAN**. Messages between them stay inside.\n\nThe **internet** is what you get when millions of networks are joined by routers: a **network of networks**, run by thousands of different companies. Switch to *Send a message* and try a few: laptop to printer, phone to the video server.",
          widget: { type: "net-map", props: { mode: "both" } },
        },
        {
          kind: "question",
          title: "Find a long trip",
          body: "Send a message **from the laptop** to something it can only reach by crossing the internet.",
          widget: { type: "net-map", props: { mode: "send" } },
          question: { type: "widget", hint: "Choose the laptop as the sender and a destination that is outside the home.", goal: { from: "laptop", viaInternet: true } },
          explanation: "The news site and the video server live outside your home, so the message goes laptop → home router → your provider → the internet → server. A message to the printer or phone never leaves the LAN.",
        },
        {
          kind: "question",
          title: "When the internet goes down",
          body: "Your provider has an outage, but the Wi-Fi router at home is still switched on. Which of these still works?",
          question: {
            type: "choice",
            options: ["Printing from the laptop to the printer", "Watching a video from the video server", "Loading the news site", "Nothing: no internet means no network"],
            answer: 0,
          },
          explanation: "Laptop → router → printer never leaves the **LAN**, so it still works. Anything on a server outside the home needs the link to your provider. A network doesn't need the internet; the internet is just many networks joined together.",
        },
        {
          kind: "recap",
          points: [
            "A **network** is devices joined by **links** (cables, Wi-Fi, fibre) so they can send each other bytes.",
            "A **client** asks; a **server** waits and answers. These are roles: any computer can play either.",
            "A **LAN** is one home or office; the **router** joins it to the rest of the world.",
            "The **internet** is a network of networks, joined by routers.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 2. Packets ───────────────────────────────
    {
      id: "fnd-net-2-packets",
      title: "Packets",
      summary: "Why big messages are chopped into numbered packets, and how the receiver puts them back together.",
      minutes: 7,
      xp: 40,
      steps: [
        {
          kind: "explain",
          title: "Big messages, small pieces",
          body: "Networks never send a big file in one piece. They chop data into **packets**: small chunks, typically at most about **1,500 bytes** on Wi-Fi and Ethernet.\n\nWhy bother?\n\n- **Sharing**: a link can mix packets from many people, so one huge download doesn't block everyone else.\n- **Mistakes are cheap**: if one packet is damaged, only that packet is sent again.\n- **Flexibility**: different packets can even take different routes.",
        },
        {
          kind: "question",
          title: "How many pieces?",
          body: "A photo of **3,000,000 bytes** is sent in packets that carry **1,500 bytes** of the photo each. How many packets is that?",
          question: { type: "number", hint: "Divide the photo's size by what each packet carries.", answer: 2000 },
          explanation: "3,000,000 ÷ 1,500 = **2,000** packets. Each also carries a few dozen bytes of headers (addresses, numbers), which you'll meet in later lessons.",
        },
        {
          kind: "explain",
          title: "Split it",
          body: "Every packet carries a small label: **its number and the total**, like *3/5*. Change the packet size and watch the count change. (Real packets hold up to about 1,500 bytes; these hold a few characters so you can read them.)",
          widget: { type: "net-packets", props: { sizes: [10, 6, 4], message: "MEET ME AT THE LIBRARY AT NOON" } },
        },
        {
          kind: "question",
          title: "Exactly four",
          body: "Pick the packet size that splits this message into exactly **4** packets.",
          widget: { type: "net-packets", props: { sizes: [10, 6, 4], message: "SEE YOU AT NOON" } },
          question: { type: "widget", hint: "The message size divided by the packet size, rounded up, has to come to 4.", goal: { packets: 4 } },
          explanation: "The message is 15 characters. Size 4 gives 4 + 4 + 4 + 3, so **4 packets**. Smaller packets mean more of them, and more labels to carry.",
        },
        {
          kind: "question",
          title: "Put it back together",
          body: "Packets can take different paths, so they often arrive **out of order**. Press **Send packets**, then tap them in number order to rebuild the message.",
          widget: { type: "net-packets", props: { message: "MEET ME AT THE LIBRARY AT NOON", size: 6, seed: 4 } },
          question: { type: "widget", hint: "Send the packets first, then tap them in number order, starting with 1.", goal: { complete: true } },
          explanation: "The numbers make this easy: whatever order packets arrive in, the receiver sorts them by number. That's exactly what your computer does, many thousands of times a second.",
        },
        {
          kind: "question",
          title: "No numbers",
          body: "Three packets arrive with **no numbers** on them, in this order: `AT NOON`, `MEET `, `ME `. What can the receiver do?",
          question: {
            type: "choice",
            options: [
              "Rebuild the message perfectly: there's only one sensible order",
              "Only guess: without numbers it can't know the order they were sent in",
              "Ask the router, which remembers the order",
              "Nothing is lost, so the order doesn't matter",
            ],
            answer: 1,
          },
          explanation: "A computer doesn't read English. To it, packets are just bytes, and for a photo or a program there's no \"sensible\" order to guess. The **sequence number** is what makes reassembly possible.",
        },
        {
          kind: "explain",
          title: "Some never arrive",
          body: "Packets also get **lost**. A router whose queue is full simply drops new packets; a Wi-Fi signal gets interference; a cable is faulty.\n\nThe receiver notices a **gap in the numbers**: it has 1, 2, 4 and 5, but no 3. It can then ask for 3 again.",
        },
        {
          kind: "question",
          title: "A gap in the numbers",
          body: "This time one packet goes missing on the way. Send, rebuild as far as you can, and get the missing packet sent again.",
          widget: { type: "net-packets", props: { message: "MEET ME AT THE LIBRARY AT NOON", size: 6, lost: [3], seed: 7 } },
          question: { type: "widget", hint: "Find the number that never arrived, then resend that one.", goal: { complete: true, resent: 1 } },
          explanation: "Packet 3 never came, so the message stalled after packet 2. Asking for **just that one packet** fixed it, which is far cheaper than resending the whole message. In a later lesson you'll see TCP do this automatically.",
        },
        {
          kind: "recap",
          points: [
            "Data crosses a network in **packets**: small chunks of up to about 1,500 bytes.",
            "Small packets share links fairly, and a mistake costs only one packet.",
            "Packets can arrive **out of order**; their **numbers** let the receiver rebuild the data.",
            "Packets can be **lost**; a gap in the numbers shows which one to ask for again.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 3. IP addresses ───────────────────────────────
    {
      id: "fnd-net-3-ip",
      title: "IP addresses",
      summary: "Four bytes that say where a packet should go: public and private addresses, and which ones share a network.",
      minutes: 8,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "Every device gets an address",
          body: "To deliver a packet, the network needs to know **where** it's going. Every device on a network has an **IP address**.\n\nThe classic kind, **IPv4**, is just **4 bytes**: 32 bits. We write each byte as a decimal number and put dots between them. That's called *dotted decimal*. Edit the numbers and watch the bits underneath.",
          widget: { type: "net-ip", props: { initial: [192, 168, 1, 20] } },
        },
        {
          kind: "question",
          title: "How big can each part be?",
          body: "Each of the four numbers is one byte. What is the **largest** value one of them can be?",
          question: { type: "number", hint: "One byte is 8 bits. What is the largest number 8 bits can hold?", answer: 255 },
          explanation: "One byte is 8 bits, so it holds 0 to **255** (that's 11111111). An address like `192.168.1.300` is impossible: 300 doesn't fit in a byte.",
        },
        {
          kind: "question",
          title: "Set the bits",
          body: "Keep the first three bytes, and change the **last** byte so its bits read `00010000`.",
          widget: { type: "net-ip", props: { initial: [192, 168, 1, 20] } },
          question: { type: "widget", hint: "Read the last byte's bits as place values: 128, 64, 32, 16, 8, 4, 2, 1.", goal: { a: "192.168.1.16" } },
          explanation: "`00010000` has a single 1 in the place worth **16**, so the address is `192.168.1.16`. Underneath, an IP address is nothing more than 32 bits.",
        },
        {
          kind: "question",
          title: "Running out",
          body: "IPv4 addresses are 32 bits long. About how many different addresses exist?",
          question: {
            type: "choice",
            options: ["About 4.3 billion (2³²)", "Exactly 1,020 (4 × 255)", "About 255 million", "Unlimited: you can always add more numbers"],
            answer: 0,
          },
          explanation: "32 bits give 2³² = 4,294,967,296 patterns. That's fewer than the number of phones, laptops and gadgets on Earth. Two fixes: **private addresses** (next), and **IPv6**, whose 128-bit addresses, written like `2001:db8::1`, are plentiful enough to never run out.",
        },
        {
          kind: "explain",
          title: "Private and public",
          body: "Three ranges are set aside as **private**. They're used *inside* homes and offices, and millions of networks reuse them:\n\n- `10.x.x.x`\n- `172.16.x.x` to `172.31.x.x`\n- `192.168.x.x`\n\nYour router has one **public** address, unique on the whole internet. When a device inside sends a packet out, the router swaps the private address for its public one and remembers who asked, so replies find their way back. This trick is called **NAT** (network address translation).\n\nOne more special address: `127.0.0.1`, **loopback**, always means *this computer itself*.",
        },
        {
          kind: "question",
          title: "Go private",
          body: "This address is public. Change it into a **private** address (any private one will do).",
          widget: { type: "net-ip", props: { initial: [203, 0, 113, 50] } },
          question: { type: "widget", hint: "Private addresses start with 10., 172.16 to 172.31, or 192.168.", goal: { kind: "private" } },
          explanation: "Anything starting `10.`, `172.16.` to `172.31.`, or `192.168.` is private. Packets to those addresses are never routed across the internet, which is why every home can use `192.168.1.x` at the same time.",
        },
        {
          kind: "explain",
          title: "Same network or not?",
          body: "An address has two parts: the **network** and the **device** on it. A common split is **/24**: the first 24 bits (three bytes) name the network, and the last byte names the device.\n\n- Same first three bytes: **same network**. Send directly.\n- Different: hand the packet to the **router**.\n\nThat's the first decision your computer makes for every packet.",
          widget: { type: "net-ip", props: { initial: [192, 168, 1, 20], compare: [192, 168, 1, 30], editable: "both" } },
        },
        {
          kind: "question",
          title: "Move it next door",
          body: "These two addresses are on different networks. Change **Address B** so they're on the same /24 network.",
          widget: { type: "net-ip", props: { initial: [192, 168, 1, 20], compare: [192, 168, 2, 30], editable: "b" } },
          question: { type: "widget", hint: "On a /24 network the first three numbers have to match.", goal: { same: true } },
          explanation: "With a /24, only the first three bytes matter for \"which network\". `192.168.1.anything` (other than the laptop's own .20) is a neighbour of `192.168.1.20`.",
        },
        {
          kind: "code",
          title: "Check it in Python",
          body: "Write `same_network(a, b)`: it gets two addresses as text and returns `True` when they share a /24 network (the same first three numbers).\n\n`\"192.168.1.20\".split(\".\")` gives `['192', '168', '1', '20']`.",
          language: "python",
          starter: "def same_network(a, b):\n    # compare the first three numbers of each address\n    return a == b\n",
          solution: "def same_network(a, b):\n    return a.split(\".\")[:3] == b.split(\".\")[:3]\n",
          tests: [
            { id: "same", description: "192.168.1.20 and 192.168.1.99 share a network", assertionCode: `assert same_network("192.168.1.20", "192.168.1.99") is True, "192.168.1.20 and 192.168.1.99 should be on the same /24"` },
            { id: "diff", description: "192.168.1.20 and 192.168.2.20 don't", assertionCode: `assert same_network("192.168.1.20", "192.168.2.20") is False, "192.168.1.x and 192.168.2.x are different networks"` },
            { id: "ten", description: "10.0.0.5 and 10.0.1.5 don't", assertionCode: `assert same_network("10.0.0.5", "10.0.1.5") is False, "the third byte differs, so it's a different network"` },
            { id: "self", description: "an address shares a network with itself", assertionCode: `assert same_network("10.0.0.1", "10.0.0.1") is True` },
          ],
          hints: ["Split each address on `\".\"` and keep the first three parts with `[:3]`.", "`return a.split(\".\")[:3] == b.split(\".\")[:3]`"],
        },
        {
          kind: "recap",
          points: [
            "An **IPv4 address** is 4 bytes (32 bits), written as four numbers from 0 to 255.",
            "There are only about 4.3 billion of them; **IPv6** uses 128 bits instead.",
            "**Private** ranges (`10.`, `172.16–31.`, `192.168.`) are reused inside homes; the router's **public** address faces the internet (NAT).",
            "With a **/24**, the first three bytes name the network: same network means send directly, otherwise go via the router.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 4. Routing ───────────────────────────────
    {
      id: "fnd-net-4-routing",
      title: "Routing",
      summary: "Routers forward packets hop by hop using their tables, and find another way when a link breaks.",
      minutes: 8,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "Nobody knows the whole way",
          body: "Your laptop only knows its own network. For anything else, it hands the packet to its **router** (its *default gateway*).\n\nA router is a computer with links into several networks. It reads the packet's **destination IP address** and sends it one step closer: one **hop**. The next router does the same. No router knows the whole path; each only knows the **next hop**.",
        },
        {
          kind: "question",
          title: "The first hop",
          body: "Your laptop, `192.168.1.20`, sends a packet to `203.0.113.80`. Where does the packet go first?",
          question: {
            type: "choice",
            options: ["Straight to 203.0.113.80", "To the home router, the default gateway", "To every device on the LAN", "To the DNS server"],
            answer: 1,
          },
          explanation: "`203.0.113` isn't the laptop's network (`192.168.1`), so it can't deliver directly. Anything for another network goes to the **default gateway**, which forwards it onwards.",
        },
        {
          kind: "explain",
          title: "Hop by hop",
          body: "Here's a small internet: your laptop, five routers and a server. Press **Send**, then **Next hop**, and watch each router's **forwarding table** (below the map) choose where the packet goes. Tap a router to read its table.",
          widget: { type: "net-routes", props: { lockLinks: true } },
        },
        {
          kind: "question",
          title: "Count the routers",
          body: "Send a packet all the way to the server. How many **routers** does it pass through?",
          widget: { type: "net-routes", props: { lockLinks: true }, live: true },
          question: { type: "number", hint: "Send a packet to the server and count every router on the path it takes.", answer: 3 },
          explanation: "You → **R1 → R2 → R4** → server: three routers, four links. Each picked the neighbour with the fewest hops left to the server's network.",
        },
        {
          kind: "explain",
          title: "Forwarding tables",
          body: "A forwarding table maps **destination networks** to the **next hop**:\n\n" +
            text(`
Destination        Next hop   Hops
192.168.1.0/24     R1         2
203.0.113.0/24     R4         1
`) +
            "\n\nRouters build these tables themselves. They constantly swap notes with their neighbours (*routing protocols*), so when a link fails the tables change within moments. The real internet is the same idea at enormous scale: tens of thousands of networks, each run by a different company, announcing what they can reach.",
        },
        {
          kind: "question",
          title: "Read the table",
          body: "R2's table says `203.0.113.0/24 → R4`. A packet for `203.0.113.80` arrives at R2. What does R2 do?",
          question: {
            type: "choice",
            options: ["Sends it to R4", "Asks the server which way to go", "Copies it to all its neighbours to be safe", "Sends it back to R1"],
            answer: 0,
          },
          explanation: "`203.0.113.80` is in the network `203.0.113.0/24`, and the table says that network goes via **R4**. One lookup, one hop, next packet. That's all a router does, millions of times a second.",
        },
        {
          kind: "question",
          title: "A cable gets cut",
          body: "A digger cuts the cable between **R1 and R2**. Break that link, then deliver a packet to the server.",
          widget: { type: "net-routes", props: {} },
          question: { type: "widget", hint: "Break the link between R1 and R2 in the map, then send a packet.", goal: { delivered: true, avoid: "R2", minBroken: 1 } },
          explanation: "With R1–R2 gone, the tables recompute: R1's best way to the server is now **R3**, then R5. The packet still arrives, just by another road. That redundancy is why the internet survives broken cables every day.",
        },
        {
          kind: "question",
          title: "Time to live",
          body: "Every router lowers a number in the packet called the **TTL** (time to live) by 1, and throws the packet away when it reaches 0. Why?",
          question: {
            type: "choice",
            options: [
              "So a packet caught in a routing loop can't circle forever",
              "To measure how fast the network is",
              "To encrypt the packet a little more at each hop",
              "To count how many bytes the packet carries",
            ],
            answer: 0,
          },
          explanation: "If tables briefly disagree, two routers can bounce a packet back and forth. TTL guarantees it dies after at most 64 or so hops instead of clogging the links forever.",
        },
        {
          kind: "question",
          title: "Cut it off",
          body: "How hard is it to disconnect the server? Break links until a packet **can't** reach it.",
          widget: { type: "net-routes", props: {} },
          question: { type: "widget", hint: "Break links around the server until no path reaches it any more.", goal: { dropped: true } },
          explanation: "You had to break **every** route, for example both R4–Server and R5–Server, or both R1–R2 and R1–R3. With no route left, a router drops the packet and reports *destination unreachable*. More links mean more routes to cut.",
        },
        {
          kind: "recap",
          points: [
            "Packets for other networks go to the **default gateway**, your router.",
            "Each router forwards a packet one **hop** closer, using its **forwarding table**: destination network → next hop.",
            "Routers keep their tables up to date with each other, so traffic **reroutes** around broken links.",
            "**TTL** drops by 1 at each router, so lost packets can't loop forever.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 5. Ports ───────────────────────────────
    {
      id: "fnd-net-5-ports",
      title: "Ports",
      summary: "One address, many programs: port numbers pick which program gets each packet.",
      minutes: 6,
      xp: 40,
      steps: [
        {
          kind: "explain",
          title: "One address, many programs",
          body: "An IP address gets a packet to the right **machine**. But one machine runs many programs at once: a browser, a chat app, music, updates.\n\nA **port** is a number that picks the **program**. If the IP address is a building's street address, the port is the flat number. Ports are **16-bit** numbers.",
        },
        {
          kind: "question",
          title: "How many flats?",
          body: "Ports are 16-bit numbers starting at 0. What is the **largest** port number?",
          question: { type: "number", hint: "A port is a 16-bit number, so count the patterns 16 bits can make and subtract one.", answer: 65535 },
          explanation: "16 bits give 2¹⁶ = 65,536 values, so ports run from 0 to **65,535**. Port 0 is reserved, so real programs use 1 to 65,535.",
        },
        {
          kind: "question",
          title: "Sort the post",
          body: "This server runs four programs, each **listening** on its own port. Deliver each incoming packet to the program its destination port belongs to.",
          widget: { type: "net-ports", props: {} },
          question: { type: "widget", hint: "Match each packet's destination port to the program that listens on that port.", goal: { done: true } },
          explanation: "The operating system does exactly this for every packet: read the destination port and hand the data to the program listening there. Nothing listened on 8080, so that packet was **rejected**.",
        },
        {
          kind: "explain",
          title: "Well-known ports",
          body: "Servers listen on agreed numbers so clients know where to knock:\n\n" +
            text(`
80    HTTP   (web pages)
443   HTTPS  (web pages, encrypted)
22    SSH    (log in to another computer)
53    DNS    (look up names)
25    SMTP   (send email between servers)
`) +
            "\n\nThe **client's** end uses a temporary port the operating system picks, something like `51514`. That's why the packets you just sorted came *from* odd-looking ports.",
        },
        {
          kind: "question",
          title: "The labels fell off",
          body: "Same server, but the programs' port numbers are hidden. Deliver the packets using what you know about well-known ports.",
          widget: {
            type: "net-ports",
            props: {
              hidePorts: true,
              packets: [
                { from: "198.51.100.8:52010", port: 22, data: "login as admin" },
                { from: "192.0.2.50:49300", port: 443, data: "encrypted web request" },
                { from: "198.51.100.61:40711", port: 53, data: "where is example.org?" },
                { from: "192.0.2.12:61822", port: 80, data: "GET /about HTTP/1.1" },
              ],
            },
          },
          question: { type: "widget", hint: "Think of which service normally listens on each well-known port: web, secure web, mail, remote login.", goal: { done: true } },
          explanation: "22 is SSH, 443 is HTTPS, 53 is DNS and 80 is plain HTTP. You'll meet 53, 80 and 443 again in the DNS and HTTP lessons.",
        },
        {
          kind: "explain",
          title: "Sockets",
          body: "A **socket** is one end of a conversation: an IP address **plus** a port, like `192.168.1.20:51514`. A connection is named by **both** ends:\n\n" +
            text(`
192.168.1.20:51514  <->  203.0.113.80:443
`) +
            "\n\nPrograms open sockets to talk; the server's program had one socket listening on 443, and a new one for each client that connected. That's what the *socket ↔* lines on each program showed.",
        },
        {
          kind: "question",
          title: "Two tabs, one server",
          body: "Two browser tabs on your laptop (`192.168.1.20`) both talk to `203.0.113.80:443`. How does the laptop keep their replies apart?",
          question: {
            type: "choice",
            options: [
              "Each tab uses a different source port, like 51514 and 51515",
              "The server sends each tab's replies to a different IP address",
              "Only one tab can talk to a server at a time",
              "It can't, so the two pages sometimes mix",
            ],
            answer: 0,
          },
          explanation: "The two connections differ in the **client's port**. `…:51514 ↔ …:443` and `…:51515 ↔ …:443` are different sockets, so every reply lands in the right tab.",
        },
        {
          kind: "question",
          title: "Where to knock",
          body: "Your browser opens `https://shop.example.com`. Which port does it connect to on the server?",
          question: { type: "text", hint: "Every protocol has a default port. Which one does https use?", answer: ["443"], placeholder: "port number" },
          explanation: "`https` means port **443** unless the URL says otherwise. (`http` would mean 80.) You can write a port explicitly, like `http://localhost:3100`.",
        },
        {
          kind: "recap",
          points: [
            "The IP address picks the machine; the **port** (0 to 65,535) picks the program.",
            "Servers **listen** on well-known ports: 80 HTTP, 443 HTTPS, 22 SSH, 53 DNS.",
            "Clients use temporary ports, so many conversations can share one address.",
            "A **socket** is IP address + port; a connection is named by both ends.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 6. TCP and UDP ───────────────────────────────
    {
      id: "fnd-net-6-tcp-udp",
      title: "TCP and UDP",
      summary: "Reliable and in order, or quick and careless: the handshake, ACKs, resends, and when to pick which.",
      minutes: 9,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "Two ways to send",
          body: "Ports belong to the **transport** layer, and it comes in two main flavours:\n\n- **TCP** sets up a **connection**, numbers every byte, confirms what arrived and resends what didn't. You get all the data, in order, or an error.\n- **UDP** sends independent **datagrams** and forgets them. No setup, no confirmations, no resends. Less waiting, no guarantees.",
        },
        {
          kind: "question",
          title: "The three-way handshake",
          body: "Before sending any data, TCP opens the connection. Step through with **no** loss. How many packets go back and forth before the first byte of data?",
          widget: { type: "net-transport", props: { mode: "tcp", loss: 0, fixedLoss: true, segments: 2 }, live: true },
          question: { type: "number", hint: "Count the packets that cross before the first byte of data is sent.", answer: 3 },
          explanation: "**SYN** (\"let's talk, my numbers start here\"), **SYN-ACK** (\"got it, and mine start here\"), **ACK** (\"got yours\"). Three packets, and a full round trip of waiting before the client can send its first byte of data.",
        },
        {
          kind: "explain",
          title: "Numbers and receipts",
          body: "TCP numbers **bytes**, not packets. `seq=101` means *the bytes in this segment start at byte 101*.\n\nThe receiver replies with an **ACK** (acknowledgement) naming the **next byte it expects**: `ack=201` means *I have everything up to byte 200; send 201 next*.\n\nIf the sender hears nothing back in time, a **timeout** fires and it sends the segment again.",
        },
        {
          kind: "question",
          title: "Predict the ACK",
          body: "A segment arrives with `seq=301` carrying **100 bytes**. What `ack` number does the receiver send back?",
          question: { type: "number", hint: "The ACK names the next byte the receiver expects: the sequence number plus the bytes received.", answer: 401 },
          explanation: "The segment holds bytes 301 to 400, so the next byte wanted is **401**. The ACK always points at the first byte the receiver *doesn't* have yet.",
        },
        {
          kind: "question",
          title: "Make TCP work for it",
          body: "Set the link to lose packets and run TCP until it has to **resend** something. (If you're lucky and nothing is lost, press **New run**.)",
          widget: { type: "net-transport", props: { mode: "tcp", loss: 25 } },
          question: { type: "widget", hint: "Raise the loss, then run until TCP has to resend something.", goal: { mode: "tcp", finished: true, minRetransmits: 1 } },
          explanation: "A lost segment, or a lost ACK, means silence. The sender waits for its timeout, then resends. All the bytes arrive in the end, but each loss costs a wait, which is why a bad connection feels slow rather than broken.",
        },
        {
          kind: "question",
          title: "Now UDP",
          body: "Same lossy link, but UDP. Run it until a datagram goes missing.",
          widget: { type: "net-transport", props: { mode: "udp", loss: 25 } },
          question: { type: "widget", hint: "Keep the lossy link, switch to UDP and run until a datagram goes missing.", goal: { mode: "udp", finished: true, someLost: true } },
          explanation: "UDP didn't notice. There was no handshake, no ACKs and no timeout, so the run was quick, but the lost datagram is simply gone. If the program cares, it has to deal with that itself.",
        },
        {
          kind: "question",
          title: "Which are true of UDP?",
          body: "Pick **all** that apply.",
          question: {
            type: "choice",
            options: ["It has no handshake", "It resends lost datagrams", "It guarantees datagrams arrive in order", "It has less waiting and smaller headers than TCP"],
            answer: [0, 3],
          },
          explanation: "UDP skips the handshake and the ACKs, and its header is 8 bytes against TCP's 20 or more. That's all it offers: no resends, no ordering.",
        },
        {
          kind: "question",
          title: "Pick the right one",
          body: "Which of these is the best fit for **UDP**?",
          question: {
            type: "choice",
            options: ["Downloading a bank statement", "A live video call", "Sending an email", "Loading a web page"],
            answer: 1,
          },
          explanation: "In a call, a frame that arrives late is useless: better to skip it and show the next one than to freeze while it's resent. Statements, emails and pages must arrive complete, so they use TCP. DNS's small questions also use UDP; if no answer comes, the client just asks again.",
        },
        {
          kind: "explain",
          title: "Race them",
          body: "Try both protocols at every loss setting. Watch the **Time** and how much data arrives. TCP always delivers everything, but loss makes it slower; UDP stays quick and loses data.\n\n(This TCP sends one segment at a time to keep the picture readable. Real TCP keeps many segments in flight at once.)",
          widget: { type: "net-transport", props: { mode: "choose", loss: 50, segments: 4 } },
        },
        {
          kind: "recap",
          points: [
            "**TCP**: a connection opened by the **SYN, SYN-ACK, ACK** handshake; every byte delivered, in order.",
            "`seq` says where a segment's bytes start; `ack` names the **next byte** expected.",
            "No ACK before the timeout means TCP **resends**: loss costs time, not data.",
            "**UDP**: no handshake, no ACKs, no resends. Use it when late data is useless (calls, games) or questions are tiny (DNS).",
          ],
        },
      ],
    },

    // ─────────────────────────────── 7. DNS ───────────────────────────────
    {
      id: "fnd-net-7-dns",
      title: "DNS",
      summary: "How names like www.example.com become IP addresses: the resolver's walk, and the caches that make it fast.",
      minutes: 8,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "Names for people, numbers for packets",
          body: "People remember `www.example.com`; packets need `203.0.113.80`. The **Domain Name System (DNS)** turns names into addresses, like a phone book for the internet.\n\nNames are read **right to left**, from general to specific:\n\n" +
            text(`
www  .  example  .  com
name    domain      top-level domain (TLD)
`),
        },
        {
          kind: "question",
          title: "Read it backwards",
          body: "In `mail.example.org`, which part is the **top-level domain**?",
          question: { type: "choice", options: ["mail", "example", "org", "mail.example"], answer: 2 },
          explanation: "The TLD is the last part: **org**. `example.org` is the domain someone registered, and `mail` is one name they made inside it.",
        },
        {
          kind: "question",
          title: "Follow a lookup",
          body: "Nobody has looked anything up yet, so every cache is empty. Look up `www.example.com` and step through every stage.",
          widget: { type: "net-dns", props: { noWait: true } },
          question: { type: "widget", hint: "Start the lookup, then press next until the answer comes back.", goal: { done: true, name: "www.example.com", asked: ["root", "tld", "auth"] } },
          explanation: "The browser asks a **resolver**, which does the legwork: a **root** server points it to the **.com** servers, which point it to example.com's **authoritative** server, which finally knows the answer. Each server only knows the next step, a bit like routers.",
        },
        {
          kind: "question",
          title: "Who's asked, in order",
          body: "Put the stages of a lookup with empty caches in order.",
          question: {
            type: "order",
            items: ["The browser checks its own cache", "The browser asks the resolver", "The resolver asks a root server", "The resolver asks a .com TLD server", "The resolver asks example.com's authoritative server"],
          },
          explanation: "From most local to most specific: own cache, resolver, then root → TLD → authoritative. The answer then travels back the same way, and gets **cached** at each stop.",
        },
        {
          kind: "explain",
          title: "Caching and TTL",
          body: "Every DNS answer comes with a **TTL** (time to live) in seconds, like *keep this for 300 s*. Browsers and resolvers **cache** answers for that long, so most lookups never leave your computer.\n\nThe resolver also caches the steps: once it knows where the `.com` servers are, it can skip the root for every other `.com` name.",
        },
        {
          kind: "question",
          title: "The second time is instant",
          body: "Make a lookup of `www.example.com` come straight from the **browser's cache**.",
          widget: { type: "net-dns", props: {} },
          question: { type: "widget", hint: "Do the lookup once, then look up the same name again.", goal: { name: "www.example.com", cacheHit: "browser" } },
          explanation: "The first lookup took about 90 ms; the second took **0 ms**, because the browser kept the answer. If you pressed *Wait 5 minutes*, the 300 s TTL ran out and the walk had to start again.",
        },
        {
          kind: "question",
          title: "Skip the top",
          body: "Get the resolver to find `mail.example.com` **without asking the root or the TLD server**.",
          widget: { type: "net-dns", props: { noWait: true } },
          question: { type: "widget", hint: "Look up www.example.com first; the resolver then remembers who runs example.com.", goal: { name: "mail.example.com", done: true, notAsked: ["root", "tld"] } },
          explanation: "Look up `www.example.com` first. The resolver then remembers that example.com's names live on `ns1.example.com`, so for `mail.example.com` it goes straight there. Caching works at every level of the walk.",
        },
        {
          kind: "question",
          title: "Moving house",
          body: "A site is moving to a new server with a new IP address tomorrow. Its DNS answer has a TTL of **one day**. What happens after the switch?",
          question: {
            type: "choice",
            options: [
              "Everyone reaches the new server instantly",
              "Some visitors keep using the old address for up to a day, until their cached copy expires",
              "DNS refuses to change an address once it's cached",
              "The old server forwards every visitor automatically",
            ],
            answer: 1,
          },
          explanation: "Caches trust an answer for its whole TTL. Sites about to move lower the TTL a few days ahead (say to 60 s), so the change spreads quickly.",
        },
        {
          kind: "question",
          title: "How DNS travels",
          body: "A DNS question and its answer are tiny, often one packet each. What does a typical lookup use?",
          question: { type: "choice", options: ["UDP, port 53", "TCP, port 443", "TCP, port 22", "No transport at all"], answer: 0 },
          explanation: "One small question, one small answer: a TCP handshake would triple the time. So DNS uses **UDP on port 53**, and simply asks again if no reply comes. (Large answers fall back to TCP, also on port 53.)",
        },
        {
          kind: "recap",
          points: [
            "**DNS** turns names into IP addresses. Read names right to left: TLD, domain, name.",
            "A **resolver** walks **root → TLD → authoritative** servers to find an answer.",
            "Answers carry a **TTL**; browsers and resolvers **cache** them, so repeat lookups are instant.",
            "Lookups usually travel over **UDP port 53**.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 8. HTTP ───────────────────────────────
    {
      id: "fnd-net-8-http",
      title: "HTTP",
      summary: "The language of the web: requests and responses, methods, status codes, headers, and cookies.",
      minutes: 9,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "Ask, then answer",
          body: "**HTTP** is what browsers and web servers say to each other, over a TCP connection. It's plain text. A **request** names a **method**, a **path** and the version, then **headers**, a blank line and an optional body:\n\n" +
            text(`
GET /about HTTP/1.1
Host: shop.example.com
Accept: text/html
`) +
            "\n\nThe **response** starts with a **status line**, then headers, a blank line and the body:\n\n" +
            text(`
HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 17

<h1>About us</h1>
`),
        },
        {
          kind: "question",
          title: "Your first request",
          body: "Request the page at `/about` and send it.",
          widget: { type: "net-http", props: { methods: ["GET"], hostToggle: false } },
          question: { type: "widget", hint: "Choose the path /about, then press send.", goal: { status: 200, path: "/about" } },
          explanation: "`GET /about` asks for that page, and **200 OK** means here it is. The body is the HTML your browser would draw.",
        },
        {
          kind: "explain",
          title: "Methods and status codes",
          body: "The **method** says what you want: `GET` fetches something, `POST` sends data (like a form). There are others, such as `PUT` and `DELETE`.\n\nThe **status code**'s first digit says how it went:\n\n" +
            text(`
2xx  success          200 OK
3xx  look elsewhere   301 Moved Permanently
4xx  your mistake     404 Not Found, 401 Unauthorized
5xx  server's fault   500 Internal Server Error
`),
        },
        {
          kind: "question",
          title: "Collect the set",
          body: "Get the server to answer with a **200**, a **301**, a **404** and a **500**.",
          widget: { type: "net-http", props: { methods: ["GET"], hostToggle: false } },
          question: { type: "widget", hint: "Different paths give different statuses. Try several until you have seen all four.", goal: { seen: [200, 301, 404, 500] } },
          explanation: "`/old-about` has moved (301, with a `Location` header saying where), `/nope` doesn't exist (404, a client mistake), and `/api/report` crashed on the server (500). Note that a 404 means the network worked fine: the server answered, it just has nothing at that path.",
        },
        {
          kind: "explain",
          title: "Headers",
          body: "Headers are `Name: value` lines carrying extra facts:\n\n- `Host`: which site you want. One server, one IP address, can host many sites, so this is required.\n- `Content-Type` and `Content-Length`: what kind of body it is, and how many bytes.\n- `Location`: where a moved page went.\n- `Set-Cookie` and `Cookie`: coming next.",
        },
        {
          kind: "question",
          title: "Which site?",
          body: "Switch off the `Host` header and send a request. What does the server say?",
          widget: { type: "net-http", props: { methods: ["GET"] } },
          question: { type: "widget", hint: "Switch the Host header off, then send the request.", goal: { status: 400 } },
          explanation: "**400 Bad Request**: without `Host`, an HTTP/1.1 server can't tell which of its sites you mean, so the request is malformed.",
        },
        {
          kind: "explain",
          title: "Stateless, so cookies",
          body: "HTTP is **stateless**: each request stands alone, and the server doesn't remember the last one. So how does a site know you're logged in?\n\nWhen you log in, the response includes `Set-Cookie: session=7f3a9c`. The browser stores it, and from then on adds `Cookie: session=7f3a9c` to **every** request to that site. The server looks up the session and knows it's you.",
        },
        {
          kind: "question",
          title: "Log in",
          body: "Get into `/account`. You'll need to log in first, with a `POST` to `/login`.",
          widget: { type: "net-http", props: { paths: ["/account", "/login"], hostToggle: false } },
          question: { type: "widget", hint: "Send the POST to /login first, then ask for /account.", goal: { status: 200, path: "/account" } },
          explanation: "Without a cookie, `/account` says **401 Unauthorized**. `POST /login` answered with `Set-Cookie`, and the next `GET /account` carried `Cookie: session=7f3a9c`. The server didn't remember you; the cookie reminded it.",
        },
        {
          kind: "code",
          title: "Write a request by hand",
          body: "HTTP really is just text. Write `build_request(path, host)` that returns a GET request with a `Host` header. HTTP ends each line with `\\r\\n`, and a blank line ends the headers, so the text finishes with `\\r\\n\\r\\n`.\n\nFor `build_request(\"/about\", \"shop.example.com\")` the result is:\n\n" +
            text(`
"GET /about HTTP/1.1\\r\\nHost: shop.example.com\\r\\n\\r\\n"
`),
          language: "python",
          starter: "def build_request(path, host):\n    # request line, Host header, then an empty line\n    return \"GET \" + path\n",
          solution: "def build_request(path, host):\n    return f\"GET {path} HTTP/1.1\\r\\nHost: {host}\\r\\n\\r\\n\"\n",
          tests: [
            {
              id: "about",
              description: "builds the request for /about",
              assertionCode: `assert build_request("/about", "shop.example.com") == "GET /about HTTP/1.1\\r\\nHost: shop.example.com\\r\\n\\r\\n", f"got {build_request('/about', 'shop.example.com')!r}"`,
            },
            {
              id: "root",
              description: "works for / on another host",
              assertionCode: `assert build_request("/", "example.org") == "GET / HTTP/1.1\\r\\nHost: example.org\\r\\n\\r\\n", f"got {build_request('/', 'example.org')!r}"`,
            },
            { id: "end", description: "ends with a blank line", assertionCode: `assert build_request("/x", "a.b").endswith("\\r\\n\\r\\n"), "the request must end with \\\\r\\\\n\\\\r\\\\n"` },
          ],
          hints: ["An f-string keeps it tidy: `f\"GET {path} HTTP/1.1\\r\\n...\"`.", "`return f\"GET {path} HTTP/1.1\\r\\nHost: {host}\\r\\n\\r\\n\"`"],
        },
        {
          kind: "recap",
          points: [
            "An HTTP **request** is a method, a path, headers and an optional body; a **response** is a status line, headers and a body.",
            "`GET` fetches, `POST` sends data.",
            "Status codes: **2xx** success, **3xx** look elsewhere, **4xx** client mistake, **5xx** server fault.",
            "HTTP is **stateless**; `Set-Cookie` and `Cookie` let a server recognise you between requests.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 9. Layers ───────────────────────────────
    {
      id: "fnd-net-9-layers",
      title: "Layers",
      summary: "Each protocol wraps the one above it: encapsulation, the TCP/IP model, and how OSI's seven layers map onto it.",
      minutes: 8,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "Each job on its own layer",
          body: "Every protocol you've met solves **one** problem and relies on the one below it:\n\n- **Application** (HTTP, DNS): *what* to say.\n- **Transport** (TCP, UDP): *which program*, and whether delivery is reliable.\n- **Internet** (IP): *which machine*, across many networks.\n- **Link** (Ethernet, Wi-Fi): to the *next device* on this cable or radio channel.\n\nThis four-layer stack is the **TCP/IP model**.",
        },
        {
          kind: "question",
          title: "Stack them",
          body: "Order the layers from the top (closest to the program) to the bottom (closest to the wire).",
          question: { type: "order", items: ["Application", "Transport", "Internet", "Link"] },
          explanation: "Application on top, then Transport, Internet and Link at the bottom. Each layer only talks to the one directly above and below it.",
        },
        {
          kind: "question",
          title: "Wrap it up",
          body: "Sending works top-down: each layer puts **its own header** in front of what it was handed. This is **encapsulation**. Wrap the HTTP request all the way down into an Ethernet frame.",
          widget: { type: "net-layers", props: { wrapOnly: true, fixedModel: true } },
          question: { type: "widget", hint: "Each layer puts its header in front: HTTP data, then TCP, then IP, then Ethernet.", goal: { depth: 4 } },
          explanation: "HTTP data inside a **TCP segment** (ports), inside an **IP packet** (addresses), inside an **Ethernet frame** (the next device's hardware address, plus a checksum). Like envelopes inside envelopes.",
        },
        {
          kind: "question",
          title: "Count the bytes",
          body: "The HTTP data is **38** bytes. TCP adds a 20-byte header, IP a 20-byte header, and Ethernet a 14-byte header plus a 4-byte checksum. How many bytes is the whole frame?",
          question: { type: "number", hint: "Add the HTTP data and everything each layer puts around it.", answer: 96, unit: "bytes" },
          explanation: "38 + 20 + 20 + 14 + 4 = **96** bytes. 58 of them are wrapping. For tiny messages the headers can outweigh the data; with full 1,500-byte packets they're only a few percent.",
        },
        {
          kind: "question",
          title: "Unwrap it",
          body: "At the other end, the layers work **bottom-up**: each reads its own header, removes it, and hands what's inside to the layer above. Send the frame and unwrap it until the web server has the request.",
          widget: { type: "net-layers", props: { fixedModel: true } },
          question: { type: "widget", hint: "Send the frame, then remove one header at a time, from the outside in.", goal: { delivered: true } },
          explanation: "Link checks the hardware address and checksum, Internet checks the IP address, Transport reads the port (80, the web server), and the Application finally reads `GET /`. Each layer only ever reads its own header.",
        },
        {
          kind: "question",
          title: "What does a router read?",
          body: "A router in the middle of the internet receives this frame. Which headers does it need to read to forward it?",
          question: {
            type: "choice",
            options: [
              "Ethernet and IP: it unwraps the frame, reads the destination IP, and wraps the packet in a new frame for the next link",
              "Only the HTTP request, to see which page you want",
              "Only the TCP port numbers",
              "Every layer, including HTTP",
            ],
            answer: 0,
          },
          explanation: "Routers work on the **Link** and **Internet** layers. The Ethernet frame only reaches the next device, so every router takes the IP packet out and puts it in a fresh frame. It never needs to look at TCP or HTTP.",
        },
        {
          kind: "explain",
          title: "The OSI model",
          body: "You'll also hear about the **OSI model**, a seven-layer reference model. It splits the top and bottom more finely, and people use its numbers as shorthand: *layer 3* means IP, *layer 4* means TCP and UDP, *layer 7* means applications like HTTP. Switch the side panel to **OSI** to compare, and step through again.",
          widget: { type: "net-layers", props: { model: "osi" } },
        },
        {
          kind: "question",
          title: "Which layer?",
          body: "Everything from this module lives on a layer. Tap a card, then tap its layer.",
          widget: {
            type: "pattern-sorter",
            props: {
              buckets: [
                { id: "app", label: "Application", hint: "what to say" },
                { id: "transport", label: "Transport", hint: "which program" },
                { id: "internet", label: "Internet", hint: "which machine" },
                { id: "link", label: "Link", hint: "next device" },
              ],
              items: LAYER_ITEMS,
              answer: LAYER_ANSWER,
            },
          },
          question: { type: "widget", hint: "Ask what each thing does: reach a program, reach a machine, or cross one cable.", goal: { placed: LAYER_ANSWER } },
          explanation: "DNS lookups and HTTP status codes are **Application**. Ports and ACKs are **Transport**. IP addresses and forwarding tables are **Internet**. MAC addresses and Wi-Fi radio are **Link**.",
        },
        {
          kind: "recap",
          points: [
            "The **TCP/IP model**: Application, Transport, Internet, Link.",
            "Sending wraps data in one header per layer (**encapsulation**); receiving unwraps in reverse.",
            "Each layer reads only its own header; routers stop at the Internet layer.",
            "**OSI** has seven layers; *layer 3* = IP, *layer 4* = TCP/UDP, *layer 7* = applications.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 10. Typing a URL ───────────────────────────────
    {
      id: "fnd-net-10-url",
      title: "What happens when you type a URL",
      summary: "Everything at once: URL, DNS, TCP, TLS, HTTP, routing and the response, in order.",
      minutes: 8,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "Taking a URL apart",
          body: "A URL packs several answers into one line:\n\n" +
            text(`
https :// shop.example.com :443 /cart
scheme    host              port  path
`) +
            "\n\nThe **scheme** says which protocol (and so the usual port: 443 for https, 80 for http). The **host** is the name DNS will look up. The **path** is what to ask the server for. The port is usually left out.",
        },
        {
          kind: "question",
          title: "The whole trip",
          body: "You press Enter on `https://shop.example.com/cart`. Step through everything that happens, all the way to the finished page.",
          widget: { type: "net-journey", props: { url: "https://shop.example.com/cart" } },
          question: { type: "widget", hint: "Press next until the page has finished loading.", goal: { finished: true } },
          explanation: "Every lesson of this module, in one go: read the URL, **DNS**, a **TCP** handshake, **TLS**, an **HTTP** request, **IP** routing hop by hop, the response, then more requests for the page's pictures and styles.",
        },
        {
          kind: "question",
          title: "In order",
          body: "Put these stages in the order they happen.",
          question: {
            type: "order",
            items: [
              "Look up shop.example.com's IP address with DNS",
              "Open a TCP connection to port 443 (SYN, SYN-ACK, ACK)",
              "Run the TLS handshake and check the certificate",
              "Send GET /cart",
              "Receive 200 OK with the HTML",
              "Draw the page and request its images and styles",
            ],
          },
          explanation: "You can't connect without an address (DNS first), can't encrypt without a connection (TCP before TLS), and shouldn't send anything private before it's encrypted (TLS before HTTP).",
        },
        {
          kind: "question",
          title: "HTTPS in one step",
          body: "The **S** in HTTPS is **TLS**: a handshake that checks the server's **certificate** (proof, signed by an authority your device trusts, that this really is shop.example.com) and agrees on a secret key. Turn on the **attacker** and try HTTPS to see why the certificate matters.",
          widget: { type: "net-tls", props: { mode: "https" } },
          question: { type: "widget", hint: "Turn on the attacker, choose HTTPS and try to connect.", goal: { mode: "https", attacker: true, blocked: true } },
          explanation: "The attacker could answer the hello, but couldn't produce a certificate for shop.example.com signed by a trusted authority. The check failed and the browser stopped before sending anything. With plain HTTP there's no check at all: try it.",
        },
        {
          kind: "question",
          title: "What the café can see",
          body: "On café Wi-Fi you log in at `https://shop.example.com/login`. What can a snooper on the same Wi-Fi see?",
          question: {
            type: "choice",
            options: [
              "The site's name and IP address, but not the page, the cookie or your password",
              "Everything, including your password",
              "Nothing at all, not even which site you visit",
              "Only your password",
            ],
            answer: 0,
          },
          explanation: "TLS encrypts the HTTP inside, so paths, cookies and passwords are hidden. But the IP and TCP headers must stay readable for routers, and the site's name is usually visible in the TLS hello.",
        },
        {
          kind: "question",
          title: "Already cached",
          body: "You visited the shop a minute ago, and its DNS answer has a TTL of 300 s. Which stage can the browser skip this time?",
          question: { type: "choice", options: ["The DNS lookup", "The TCP handshake", "The TLS certificate check", "The HTTP request"], answer: 0 },
          explanation: "The address is still in the browser's cache, so DNS takes **0 ms**. (If the old connection is still open, the browser can even skip the TCP and TLS handshakes and reuse it.)",
        },
        {
          kind: "question",
          title: "Find the broken layer",
          body: "The page loads, but the logo is missing. The server's log says `GET /logo.png 404`. Which layer has the problem?",
          question: { type: "choice", options: ["Application: the path doesn't exist on the server", "Internet: a router lost the packets", "Link: the Wi-Fi dropped out", "Transport: TCP forgot to resend"], answer: 0 },
          explanation: "A 404 means DNS, TCP, TLS and routing all worked: the server received the request and answered it. The **path** is wrong, which is an application problem. Knowing the layers tells you where to look.",
        },
        {
          kind: "code",
          title: "Split a URL in Python",
          body: "Python's `urllib.parse.urlsplit` takes a URL apart: `u.scheme`, `u.hostname`, `u.port` (`None` when the URL doesn't write one) and `u.path`.\n\nFinish `url_parts(url)` so it returns `(host, port, path)`, filling in the usual port (443 for https, 80 for http) and using `\"/\"` when the path is empty.",
          language: "python",
          starter: "from urllib.parse import urlsplit\n\n\ndef url_parts(url):\n    u = urlsplit(url)\n    # u.scheme, u.hostname, u.port (None if not written), u.path\n    return (u.hostname, u.port, u.path)\n",
          solution: "from urllib.parse import urlsplit\n\n\ndef url_parts(url):\n    u = urlsplit(url)\n    port = u.port or (443 if u.scheme == \"https\" else 80)\n    return (u.hostname, port, u.path or \"/\")\n",
          tests: [
            { id: "https", description: "https://shop.example.com/cart", assertionCode: `assert url_parts("https://shop.example.com/cart") == ("shop.example.com", 443, "/cart"), f"got {url_parts('https://shop.example.com/cart')!r}"` },
            { id: "http", description: "http://example.com/ uses port 80", assertionCode: `assert url_parts("http://example.com/") == ("example.com", 80, "/"), f"got {url_parts('http://example.com/')!r}"` },
            { id: "port", description: "an explicit port wins", assertionCode: `assert url_parts("http://localhost:3100/learn") == ("localhost", 3100, "/learn"), f"got {url_parts('http://localhost:3100/learn')!r}"` },
            { id: "empty", description: "an empty path becomes /", assertionCode: `assert url_parts("https://example.org") == ("example.org", 443, "/"), f"got {url_parts('https://example.org')!r}"` },
          ],
          hints: ["`u.port or 443` gives 443 when `u.port` is `None`. Choose 443 or 80 from `u.scheme`.", "`u.path or \"/\"` gives `\"/\"` when the path is empty."],
        },
        {
          kind: "recap",
          points: [
            "A URL gives the **scheme** (and usual port), the **host** for DNS, and the **path** for HTTP.",
            "The trip: DNS → TCP handshake → TLS → HTTP request → routed hop by hop → response → more requests.",
            "**HTTPS** = HTTP inside TLS: the certificate proves who the server is, and everything inside is encrypted.",
            "When something breaks, the layers tell you where to look: a 404 is the application, a timeout is lower down.",
          ],
        },
      ],
    },
  ],
};
