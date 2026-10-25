import type { Module } from "../../learn/types.ts";

/** Fenced plain-text block (shell sessions, output) for lesson prose. */
const sh = (text: string) => "```text\n" + text.trim() + "\n```";

// ── Starting files shared by several terminal steps ──

const HOME4 = {
  "~/notes.txt": "Shell practice\n",
  "~/.bashrc": "# settings for bash\nexport EDITOR=nano\n",
  "~/.profile": "# runs when you log in\n",
  "~/.hidden_idea.txt": "a secret idea\n",
  "~/projects/site/index.html": "<h1>Hello</h1>\n",
  "~/projects/site/style.css": "h1 { color: green; }\n",
  "~/projects/todo.txt": "finish the site\n",
  "~/photos/cat.jpg": "(a photo of a cat)\n",
  "~/photos/beach.jpg": "(a photo of a beach)\n",
};

const NOTES5 = "Shell practice\nls lists\ncd moves\n";
const HOME5 = {
  "~/notes.txt": NOTES5,
  "~/shopping.txt": "eggs\nbread\n",
  "~/draft.txt": "My first essay.\n",
  "~/docs/": null,
  "~/junk/old1.tmp": "x\n",
  "~/junk/old2.tmp": "y\n",
  "~/junk/cache/data.bin": "z\n",
  "~/keep.txt": "important\n",
};

const LOG = [
  "09:00:01 INFO server started",
  "09:00:04 INFO user ada logged in",
  "09:01:12 WARNING disk 81% full",
  "09:02:30 ERROR could not open config.yml",
  "09:02:31 INFO retrying",
  "09:03:05 INFO user bob logged in",
  "09:04:44 ERROR timeout talking to database",
  "09:05:10 WARNING Disk 90% full",
  "09:05:12 INFO backup started",
  "09:06:00 ERROR backup failed: disk full",
  "09:06:02 INFO user ada logged out",
  "09:07:30 INFO server stopping",
];
const FRUITS = ["banana", "apple", "cherry", "banana", "kiwi", "banana", "cherry", "apple", "banana", "cherry", "banana"];
const HOME6 = {
  "~/server.log": LOG.join("\n") + "\n",
  "~/fruits.txt": FRUITS.join("\n") + "\n",
};

const HOME7 = {
  "~/notes.txt": "my notes\n",
  "~/hello.sh": { content: '#!/bin/bash\necho "Hello from a script!"\n', mode: "644" },
  "~/secret.txt": { content: "my diary: today I learned chmod\n", mode: "644" },
  "~/shared/": { dir: true, group: "team", mode: "775" },
  "~/shared/plan.txt": { content: "team plan\n", group: "team", mode: "664" },
};

const PATHS_TREE = {
  "~/notes.txt": "",
  "~/photos/cat.jpg": "",
  "~/photos/beach.jpg": "",
  "~/projects/site/index.html": "",
  "~/projects/todo.txt": "",
  "/home/bob/music/": null,
  "/etc/hostname": "",
  "/tmp/": null,
};

const SCHED_BASIC = [
  { name: "editor", work: 3 },
  { name: "music", work: 4 },
  { name: "download", work: 5 },
];

/** Operating systems and the Unix shell: what an OS does, processes, files, the shell, pipes, permissions, jobs. */
export const unixModule: Module = {
  id: "unix",
  part: "machine",
  title: "Operating systems and the Unix shell",
  blurb: "What an OS does, processes, files and permissions, and a terminal to practise the shell in.",
  icon: "terminal",
  lessons: [
    // ─────────────────────────────── 1. What an OS does ───────────────────────────────
    {
      id: "fnd-unix-1-os",
      title: "What an operating system does",
      summary: "One machine, many programs: the kernel shares it out, and programs ask it with system calls.",
      minutes: 6,
      xp: 40,
      steps: [
        {
          kind: "explain",
          title: "Many programs, one machine",
          body: "Right now your computer is probably running a browser, a chat app, some music and dozens of helpers in the background. But it has only one set of hardware: a few CPU cores, one block of memory (RAM), one disk, one screen.\n\nSomething has to share all of that out, fairly and safely. That's the job of the **operating system** (OS): Linux, Windows, macOS, Android, iOS.\n\nTap a request and follow where it goes.",
          widget: { type: "unix-kernel", props: { requests: ["save", "sound", "add"] } },
        },
        {
          kind: "question",
          title: "Whose job is it?",
          body: "Which of these are the operating system's job? Pick all that apply.",
          question: {
            type: "choice",
            options: [
              "Deciding which program gets the CPU next",
              "Stopping one program from reading another program's memory",
              "Checking the spelling in your essay",
              "Turning *save this file* into bytes on the disk",
              "Choosing the colours of a game's characters",
            ],
            answer: [0, 1, 3],
          },
          explanation: "The OS **shares out** the CPU, memory, files and devices, and **protects** programs from each other. Spelling and game art are each program's own business: they don't involve anything shared.",
        },
        {
          kind: "explain",
          title: "The kernel",
          body: "The heart of the OS is the **kernel**. It's the one program that runs in **kernel mode**, where it may use any memory and talk to any device.\n\nEverything else, from your browser to the shell you'll meet soon, runs in **user mode**. The CPU itself enforces the difference: it keeps a mode setting inside, and in user mode the instructions that drive hardware directly are refused. If a program tries one anyway, the CPU stops it and hands control to the kernel.\n\nSo a program that wants something shared has to **ask** the kernel.",
        },
        {
          kind: "question",
          title: "Which requests cross the line?",
          body: "Send the **Save notes.txt** request and the **Add 2 + 3** request. Watch which one goes through the kernel.",
          widget: { type: "unix-kernel", props: { requests: ["save", "memory", "key", "add"] }, live: true },
          question: { type: "widget", goal: { tried: ["save", "add"] } },
          explanation: "Saving goes **program → system call → kernel → disk**, because the disk is shared and the kernel has to check the request and organise the bytes. Adding two numbers in the program's own memory needs nobody's permission, so it never leaves user mode.",
        },
        {
          kind: "question",
          title: "A key press",
          body: "A game wants to know which key you just pressed. How does it find out?",
          question: {
            type: "choice",
            options: [
              "It reads the keyboard's electrical signals itself",
              "It makes a system call, and the kernel's keyboard driver hands over the key press",
              "It asks the other programs that are running",
              "It can't: games can only read the mouse",
            ],
            answer: 1,
          },
          explanation: "Programs never drive devices themselves. The keyboard **driver** (kernel code written for that kind of hardware) receives the key, and the game gets it through a system call such as `read()`. One driver serves every program, so no game has to know every keyboard ever made.",
        },
        {
          kind: "explain",
          title: "What a system call is",
          body: "A **system call** is a request from a program to the kernel. In machine code, the program puts a number saying *which* request into a register, the details into other registers, and runs one special instruction (`syscall` on x86-64 chips). The CPU switches to kernel mode and jumps to the kernel.\n\nPrinting `hi` on the screen, for example, comes down to this call:\n\n" +
            sh(`write(1, "hi\\n", 3)    write to output 1 (the terminal) these 3 bytes`) +
            "\n\nPython's `print(\"hi\")` does exactly this underneath. Linux has a few hundred system calls, with names like `open`, `read`, `write`, `mmap` (get memory), `fork` (make a process) and `kill` (send a signal).",
        },
        {
          kind: "question",
          title: "Step by step",
          body: "Put the steps of a system call in order.",
          question: {
            type: "order",
            items: [
              "The program puts the request number and its details in registers",
              "The program runs the `syscall` instruction",
              "The CPU switches to kernel mode and jumps into the kernel",
              "The kernel checks the request is allowed, then does the work",
              "The kernel puts the result in a register and the CPU drops back to user mode",
            ],
          },
          explanation: "Ask, switch, **check**, do, return. The check is the whole point: the kernel can say no. If you try to open a file you aren't allowed to read, `open` returns an error code instead of the file.",
        },
        {
          kind: "question",
          title: "Why ask at all?",
          body: "Why make programs ask the kernel instead of letting them use the hardware directly?",
          question: {
            type: "choice",
            options: [
              "So every request gets checked: one buggy or hostile program can't wipe the disk, read another program's memory or hog a device",
              "Because asking is faster than doing it yourself",
              "Because hardware can only be programmed in assembly",
              "So that only one program can run at a time",
            ],
            answer: 0,
          },
          explanation: "A system call is actually *slower* than an ordinary instruction, because switching modes takes time. We pay that price for **protection and sharing**: one gatekeeper that knows who owns what and keeps everyone out of each other's way.",
        },
        {
          kind: "recap",
          points: [
            "The **operating system** shares the CPU, memory, files and devices between programs and keeps them from interfering with each other.",
            "The **kernel** runs in kernel mode with full control; every other program runs in **user mode**, where the CPU blocks direct use of hardware.",
            "Programs ask the kernel for shared things with **system calls** such as `read`, `write`, `open` and `mmap`.",
            "Plain computation on a program's own memory, like adding two numbers, needs no system call.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 2. Processes ───────────────────────────────
    {
      id: "fnd-unix-2-processes",
      title: "Processes: programs in motion",
      summary: "A program is a file; a process is a running copy. The scheduler gives each one turns on the CPU.",
      minutes: 7,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "Program or process?",
          body: "A **program** is a file on the disk: a list of instructions, sitting still, like a recipe in a book.\n\nA **process** is a program that is **running**. The kernel has loaded its instructions into memory and the CPU is working through them, like a cook actually following the recipe.\n\nPress **Run** a few times.",
          widget: { type: "unix-procs", props: { counter: false } },
        },
        {
          kind: "question",
          title: "Start some",
          body: "Start **two** editors and **one** music player. Quit any extras with ×.",
          widget: { type: "unix-procs", props: { counter: false } },
          question: { type: "widget", goal: { byProgram: { editor: 2, music: 1 } } },
          explanation: "Three processes from two program files. The kernel gave each a **process ID** (PID): a number naming that one running copy. You'll use PIDs to manage processes from the shell later.",
        },
        {
          kind: "question",
          title: "Twice the same program",
          body: "You open the same program twice. What happens to its file on the disk?",
          question: {
            type: "choice",
            options: [
              "It gets copied, so there are now two files",
              "Nothing: it stays one file, and the kernel starts two processes from it",
              "The second launch fails, because a program can only run once",
              "The two launches merge into one process",
            ],
            answer: 1,
          },
          explanation: "The file is only the recipe. Each launch makes a new process with its own memory, its own place in the code and its own PID. (Some apps *choose* to keep a single window, but that's the app deciding, not the OS.)",
        },
        {
          kind: "question",
          title: "Private memory",
          body: "Every process gets memory of its own. Start two editors, then press **+1** on only one of them.",
          widget: { type: "unix-procs", props: { programs: ["editor"] } },
          question: { type: "widget", goal: { separate: true } },
          explanation: "Same program, separate memory: one editor's `clicks` changed and the other's didn't. The kernel and the CPU's memory hardware make sure each process sees only its own memory. That's why one app crashing doesn't drag the others down with it.",
        },
        {
          kind: "explain",
          title: "Taking turns",
          body: "One CPU core runs one stream of instructions at a time. So how do dozens of processes all seem to run at once?\n\nThe kernel's **scheduler** gives each ready process a short **time slice** (a few milliseconds), then pauses it and switches to the next. Each switch is a **context switch**: the kernel saves the paused process's registers and loads the next one's. It happens hundreds of times a second, far too fast to notice.\n\nStep through three processes sharing one CPU. Each tick is a small slice of time.",
          widget: { type: "unix-scheduler", props: { procs: SCHED_BASIC, quantum: 2 } },
        },
        {
          kind: "question",
          title: "When does the editor finish?",
          body: "The editor needs **3** ticks of CPU time, and each process gets **2** ticks per turn. On which tick does the editor finish? Predict, then step through to check.",
          widget: { type: "unix-scheduler", props: { procs: SCHED_BASIC, quantum: 2 }, live: true },
          question: { type: "number", answer: 7 },
          explanation: "The editor runs on ticks 1 and 2, waits while music (3–4) and the download (5–6) have their turns, then finishes on tick **7**. It needed only 3 ticks of CPU but took 7 ticks of real time. Sharing makes each job a little slower, and in return nobody is frozen out.",
        },
        {
          kind: "explain",
          title: "Waiting",
          body: "Most processes spend most of their time **waiting**: for a key press, for the network, for the disk. A waiting process doesn't need the CPU, so the kernel takes it out of the queue until its data arrives.\n\nA process is always in one of three main states:\n\n- **running**: on the CPU right now\n- **ready**: able to run, waiting for its turn\n- **waiting** (or *blocked*): waiting for something else, like the disk\n\nThis time, music reads from the disk after 2 ticks of work. Step through and watch.",
          widget: { type: "unix-scheduler", props: { procs: [{ name: "editor", work: 3 }, { name: "music", work: 4, io: { after: 2, for: 3 } }, { name: "download", work: 4 }], quantum: 2 } },
        },
        {
          kind: "question",
          title: "Meanwhile",
          body: "While music waits for the disk, what does the CPU do?",
          question: {
            type: "choice",
            options: ["Sits idle until the disk answers, then carries on with music", "Runs the other ready processes", "Restarts music from the beginning", "Helps the disk go faster"],
            answer: 1,
          },
          explanation: "In CPU terms, waiting for a disk takes ages: millions of instructions' worth. Running someone else in the meantime is why multitasking makes a computer get *more* done overall, not just share more fairly.",
        },
        {
          kind: "question",
          title: "No time slices",
          body: "Switch the time slice to **Run to finish**, where each process keeps the CPU until it's done, and step through. What happens to the editor, which needs only 2 ticks?",
          widget: {
            type: "unix-scheduler",
            props: { procs: [{ name: "download", work: 6 }, { name: "music", work: 3 }, { name: "editor", work: 2 }], quantum: 2, quanta: [2, "all"] },
            live: true,
          },
          question: {
            type: "choice",
            options: [
              "It waits until the download and music are completely done, so your typing would freeze for a long time",
              "It goes first, because it's the shortest",
              "It runs at the same moment as the download",
              "Nothing changes",
            ],
            answer: 0,
          },
          explanation: "With time slices the editor gets its first turn on tick 5; without them, not until tick 10, after the whole download and music. One long job holding the CPU freezes everything behind it. Time slices are what make a computer feel **responsive**.",
        },
        {
          kind: "recap",
          points: [
            "A **program** is a file of instructions; a **process** is one running copy of it, with its own memory and a **PID**.",
            "The **scheduler** gives ready processes short **time slices** on the CPU and switches between them (context switches).",
            "Processes are **running**, **ready** (waiting their turn) or **waiting** (for the disk, network or keyboard).",
            "While one process waits, others run. That keeps the CPU busy and the computer responsive.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 3. The file system ───────────────────────────────
    {
      id: "fnd-unix-3-files",
      title: "The file system: a tree of folders",
      summary: "Directories form a tree from the root. Absolute and relative paths, . and .., and home (~).",
      minutes: 7,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "Files live in directories",
          body: "A disk is just an enormous row of numbered blocks. The OS's **file system** turns it into something you can use: named **files**, grouped into **directories** (another word for folders), which can hold more directories.\n\nAt the very top sits one directory called the **root**, written `/`. Everything hangs below it, so the whole thing is a **tree** (drawn upside down, with the root at the top).\n\nTap anything to see its path.",
          widget: { type: "unix-paths", props: { files: PATHS_TREE, explore: true, input: false } },
        },
        {
          kind: "question",
          title: "The full path",
          body: "A **path** lists the directories you walk through to reach something, separated by `/`. A path that starts with `/` begins at the root. That's an **absolute path**: it means the same thing wherever you are.\n\nType the absolute path to `cat.jpg`.",
          widget: { type: "unix-paths", props: { files: PATHS_TREE, placeholder: "start with /" } },
          question: { type: "widget", goal: { path: "/home/ada/photos/cat.jpg", absolute: true } },
          explanation: "`/` → `home` → `ada` → `photos` → `cat.jpg`, written `/home/ada/photos/cat.jpg`. Linux and macOS use `/` between names; Windows uses `\\` and drive letters like `C:\\`, but the idea is the same.",
        },
        {
          kind: "question",
          title: "Starting where you are",
          body: "Every process has a **current directory** (or *working directory*): the place it's standing. Yours is marked *you are here*.\n\nA path that **doesn't** start with `/` is a **relative path**: it starts from the current directory. Reach `cat.jpg` with a relative path.",
          widget: { type: "unix-paths", props: { files: PATHS_TREE } },
          question: { type: "widget", goal: { path: "~/photos/cat.jpg", absolute: false, avoid: "~" } },
          explanation: "From `/home/ada`, the relative path `photos/cat.jpg` leads to the same file. Relative paths are shorter, but they depend on where you stand: the same text means something else from another directory.",
        },
        {
          kind: "question",
          title: "Which ones work?",
          body: "You're in `/home/ada/photos`. Which paths point to `/home/ada/photos/beach.jpg`? Pick all that apply.",
          question: { type: "choice", options: ["`beach.jpg`", "`/beach.jpg`", "`photos/beach.jpg`", "`/home/ada/photos/beach.jpg`"], answer: [0, 3] },
          explanation: "`beach.jpg` (relative, from where you are) and the full absolute path both work. `/beach.jpg` means a file directly under the root, and `photos/beach.jpg` would look for a `photos` directory *inside* `photos`.",
        },
        {
          kind: "explain",
          title: "Dot and dot-dot",
          body: "Two special names exist in every directory:\n\n- `.` means *this directory*\n- `..` means *the directory above it* (its parent)\n\nSo from `/home/ada/projects`, `..` is `/home/ada`, and `../photos` is `/home/ada/photos`. Edit the path below and watch each step.",
          widget: { type: "unix-paths", props: { files: PATHS_TREE, cwd: "~/projects", start: "../photos" } },
        },
        {
          kind: "question",
          title: "Climb, then descend",
          body: "Now you're in `site`. Reach `cat.jpg` with a relative path, without using `~`.",
          widget: { type: "unix-paths", props: { files: PATHS_TREE, cwd: "~/projects/site" } },
          question: { type: "widget", goal: { path: "~/photos/cat.jpg", absolute: false, uses: "..", avoid: "~" } },
          explanation: "`../../photos/cat.jpg`: up from `site` to `projects`, up again to `ada`, then down into `photos`. Each `..` climbs one level.",
        },
        {
          kind: "question",
          title: "Where does it lead?",
          body: "You're in `/home/ada/projects/site`. Where does `../../notes.txt` point?",
          question: { type: "choice", options: ["`/home/ada/notes.txt`", "`/home/ada/projects/notes.txt`", "`/home/notes.txt`", "`/notes.txt`"], answer: 0 },
          explanation: "Start in `site`. The first `..` goes to `projects`, the second to `ada`, and `notes.txt` is looked up there: `/home/ada/notes.txt`.",
        },
        {
          kind: "question",
          title: "Home, written ~",
          body: "Each user has a **home directory** for their own files: `/home/ada` for ada, `/home/bob` for bob (on a Mac it's `/Users/ada`). Because it's used so often, the shell lets you write your home as `~`. For ada, `~/photos` is short for `/home/ada/photos`.\n\nWhen **bob** types `~/music`, what absolute path does he mean?",
          question: { type: "text", answer: ["/home/bob/music", "/home/bob/music/"], placeholder: "/…" },
          explanation: "`~` is bob's own home, `/home/bob`, so `~/music` is `/home/bob/music`. The same `~` means a different place for each user.",
        },
        {
          kind: "question",
          title: "Same name twice?",
          body: "Can two files both be called `todo.txt`?",
          question: {
            type: "choice",
            options: [
              "Yes, if they're in different directories: their full paths are different",
              "No, every file name must be unique on the disk",
              "Only if one of them is hidden",
              "Only if they have different sizes",
            ],
            answer: 0,
          },
          explanation: "A file is really known by its **full path**, so `/home/ada/todo.txt` and `/home/ada/projects/todo.txt` are two different files. Names are case-sensitive on Linux, too: `Todo.txt` and `todo.txt` are different files.",
        },
        {
          kind: "recap",
          points: [
            "The file system is a **tree** of directories and files, starting at the **root**, `/`.",
            "An **absolute path** starts with `/` and works from anywhere; a **relative path** starts from the **current directory**.",
            "`.` is the current directory and `..` its parent; `../../x` climbs two levels.",
            "`~` is your **home directory**, `/home/yourname` on Linux.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 4. First shell commands ───────────────────────────────
    {
      id: "fnd-unix-4-shell",
      title: "Your first shell commands",
      summary: "Meet the shell and the prompt, then look around and build: pwd, ls, cd, mkdir, touch.",
      minutes: 8,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "Meet the shell",
          body: "So far you've tapped and pointed. Programmers often drive the OS by typing instead, in a **shell**: a program that reads the command you type, runs it, and shows the result. The most common one on Linux is **bash**, and the window it runs in is the **terminal**.\n\nWhen the shell is ready it shows a **prompt**. `ada@pockett:~$` means: user **ada**, on the computer called **pockett**, in the directory `~`.\n\nType `pwd` (*print working directory*) and press **Enter**.",
          widget: { type: "unix-terminal", props: { files: HOME4, task: "Type `pwd` and press Enter.", suggest: ["pwd"] } },
        },
        {
          kind: "question",
          title: "Read the prompt",
          body: "The prompt says `ada@pockett:~/projects$`. Where are you?",
          question: { type: "choice", options: ["`/home/ada/projects`", "`/projects`", "`/home/pockett/projects`", "On a computer called projects"], answer: 0 },
          explanation: "The part after the colon is the current directory, with your home shortened to `~`. `pockett` is the computer's name (its *hostname*).",
        },
        {
          kind: "question",
          title: "Look around with ls",
          body: "`ls` **lists** what's in a directory. On its own it lists where you are; give it a path to look somewhere else without moving.\n\nList your home directory, then list what's inside `projects` while staying where you are.",
          widget: { type: "unix-terminal", props: { files: HOME4, task: "Run `ls`, then `ls projects`.", solution: ["ls", "ls projects"] } },
          question: { type: "widget", goal: { historyMatches: ["^ls\\s*$", "^ls\\s+(\\./)?projects/?\\s*$"], cwd: "~" } },
          explanation: "`ls` showed the contents of `~`; `ls projects` peeked inside `projects` while you stayed home. Directories show up in blue.",
        },
        {
          kind: "explain",
          title: "Options",
          body: "Most commands take **options** (also called *flags*) that start with `-`:\n\n- `ls -l` gives a **long** listing: permissions, owner, size and date for each entry\n- `ls -a` shows **all** entries, including hidden ones whose names start with a dot\n\nYou can combine them: `ls -la`. Names starting with `.` are only hidden to keep listings tidy; settings files like `.bashrc` live there.",
          widget: { type: "unix-terminal", props: { files: HOME4, suggest: ["ls -l", "ls -a", "ls -la"] } },
        },
        {
          kind: "question",
          title: "Count the hidden ones",
          body: "Use `ls -a`. How many hidden entries are in your home directory, **not** counting `.` and `..`?",
          widget: { type: "unix-terminal", props: { files: HOME4, suggest: ["ls -a"] }, live: true },
          question: { type: "number", answer: 3 },
          explanation: "`.bashrc`, `.hidden_idea.txt` and `.profile`: three. The entries `.` (this directory) and `..` (its parent) appear in every directory's `ls -a` listing.",
        },
        {
          kind: "question",
          title: "Move with cd",
          body: "`cd` (*change directory*) moves you. It takes a relative or an absolute path.",
          widget: { type: "unix-terminal", props: { files: HOME4, task: "Get to `~/projects/site` with `cd`.", solution: ["cd projects/site"] } },
          question: { type: "widget", goal: { cwd: "~/projects/site" } },
          explanation: "Either `cd projects` then `cd site`, or both in one go: `cd projects/site`. The prompt changed to show where you are, and `pwd` would now print `/home/ada/projects/site`.",
        },
        {
          kind: "question",
          title: "Home in one step",
          body: "You're deep inside `site`. Get back to your home directory with **one** command.",
          widget: { type: "unix-terminal", props: { files: HOME4, cwd: "~/projects/site", task: "Go home in a single command. (Used more? Press Reset.)", solution: ["cd"] } },
          question: { type: "widget", goal: { cwd: "~", maxCommands: 1 } },
          explanation: "Any of these works: `cd ../..` (up twice), `cd ~`, `cd /home/ada`, or plain `cd` with nothing after it, which always takes you home. `cd -` jumps back to wherever you were before.",
        },
        {
          kind: "question",
          title: "Make things",
          body: "`mkdir` makes a directory, and `touch` makes an empty file (on a file that exists, it just updates the time it was last changed). Watch the file tree under the terminal.",
          widget: { type: "unix-terminal", props: { files: HOME4, tree: true, task: "Make a directory `drafts` inside `projects`, and an empty file `idea.txt` inside `drafts`.", solution: ["mkdir projects/drafts", "touch projects/drafts/idea.txt"] } },
          question: { type: "widget", goal: { dirs: ["~/projects/drafts"], files: ["~/projects/drafts/idea.txt"] } },
          explanation: "For example `mkdir projects/drafts`, then `touch projects/drafts/idea.txt`. Paths work in every command, not only `cd`, so you never had to move.",
        },
        {
          kind: "question",
          title: "Several levels at once",
          body: "Try `mkdir archive/2026/october`. It fails, because `mkdir` won't create missing parent directories. Look for the option that does (try `mkdir --help`).",
          widget: { type: "unix-terminal", props: { files: HOME4, tree: true, task: "Create `~/archive/2026/october`.", solution: ["mkdir -p archive/2026/october"] } },
          question: { type: "widget", goal: { dirs: ["~/archive/2026/october"] } },
          explanation: "`mkdir -p archive/2026/october` creates every missing directory along the path (*p* for *parents*) and doesn't complain about ones that already exist. Almost every command explains itself with `--help`.",
        },
        {
          kind: "recap",
          points: [
            "The **shell** reads a command, runs it and prints the result; the **prompt** shows user, computer and current directory.",
            "`pwd` prints where you are, `ls` lists (`-l` long, `-a` all, including hidden dot-files), `cd` moves.",
            "`cd` alone goes home; `cd ..` goes up one level.",
            "`mkdir` makes directories (`-p` for missing parents too) and `touch` makes empty files.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 5. Working with files ───────────────────────────────
    {
      id: "fnd-unix-5-files",
      title: "Working with files",
      summary: "Read, write, copy, move and delete: cat, echo, > and >>, cp, mv, rm.",
      minutes: 8,
      xp: 60,
      steps: [
        {
          kind: "question",
          title: "Read a file with cat",
          body: "`cat` prints a file's contents. (The name comes from *concatenate*: give it several files and it prints them one after another.)",
          widget: { type: "unix-terminal", props: { files: HOME5, task: "Show what's in `notes.txt`.", solution: ["cat notes.txt"] } },
          question: { type: "widget", goal: { output: NOTES5 } },
          explanation: "`cat notes.txt` copies the file's bytes to your terminal. It's ideal for short files; for long ones, `head` and `tail` show just the start or the end.",
        },
        {
          kind: "question",
          title: "Write a file with >",
          body: "`echo` prints whatever you give it: `echo hi` prints `hi`. Normally a command's output goes to the screen, but `>` **redirects** it into a file: `echo hi > greeting.txt` creates `greeting.txt` containing `hi`.",
          widget: { type: "unix-terminal", props: { files: HOME5, task: "Create `hello.txt` containing exactly the line `Hello, shell`.", solution: ['echo "Hello, shell" > hello.txt', "cat hello.txt"] } },
          question: { type: "widget", goal: { content: { "~/hello.txt": "Hello, shell\n" } } },
          explanation: "`echo \"Hello, shell\" > hello.txt`. The shell sets up the redirect *before* it starts `echo`, so `echo` doesn't even know its output is going into a file. The quotes are optional here, but they're a good habit for text with spaces or symbols.",
        },
        {
          kind: "question",
          title: "Predict: > again",
          body: "`log.txt` contains the line `first`. You run:\n\n" + sh("echo second > log.txt") + "\n\nWhat's in `log.txt` now?",
          question: { type: "choice", options: ["`second`", "`first` and then `second`", "`first`", "Nothing: you get an error because the file exists"], answer: 0 },
          explanation: "`>` empties the file before writing, so the old contents are gone. Handy and dangerous in equal measure.",
        },
        {
          kind: "question",
          title: "Add to a file with >>",
          body: "`>>` **appends**: it adds to the end of the file instead of replacing it.",
          widget: { type: "unix-terminal", props: { files: HOME5, task: "Add a line `milk` to `shopping.txt` without losing what's there. (Lost it? Press Reset.)", solution: ["echo milk >> shopping.txt", "cat shopping.txt"] } },
          question: { type: "widget", goal: { content: { "~/shopping.txt": "eggs\nbread\nmilk\n" } } },
          explanation: "`echo milk >> shopping.txt` added one line at the end. Programs use `>>` all the time to keep logs. With a single `>` the file would now hold only `milk`.",
        },
        {
          kind: "question",
          title: "Copy with cp",
          body: "`cp SOURCE DEST` **copies** a file.",
          widget: { type: "unix-terminal", props: { files: HOME5, tree: true, task: "Make a backup of `notes.txt` called `notes.bak`.", solution: ["cp notes.txt notes.bak"] } },
          question: { type: "widget", goal: { content: { "~/notes.bak": NOTES5, "~/notes.txt": NOTES5 } } },
          explanation: "`cp notes.txt notes.bak`. Now there are two independent files: changing one leaves the other alone. To copy a whole directory you need `cp -r` (*recursive*).",
        },
        {
          kind: "question",
          title: "Move and rename with mv",
          body: "`mv` **moves** and **renames**. Renaming *is* moving, to a new name.",
          widget: { type: "unix-terminal", props: { files: HOME5, tree: true, task: "Move `draft.txt` into `docs` and call it `essay.txt`, in one command.", solution: ["mv draft.txt docs/essay.txt"] } },
          question: { type: "widget", goal: { files: ["~/docs/essay.txt"], missing: ["~/draft.txt"], content: { "~/docs/essay.txt": "My first essay.\n" } } },
          explanation: "`mv draft.txt docs/essay.txt`. If the destination is an existing directory, as in `mv draft.txt docs`, the file goes inside and keeps its name. Moving within one disk doesn't copy any bytes: the file system just changes which directory lists the file, and under what name.",
        },
        {
          kind: "explain",
          title: "rm: there is no undo",
          body: "`rm` **removes** files. There's **no Trash and no undo**: the file system forgets the name and marks the space as free, ready to be reused by the next file that gets written.\n\nDirectories need `rm -r` (*recursive*: the directory and everything inside it). `rmdir` removes only **empty** directories, which makes it the safer choice when you expect one to be empty.\n\nBe extra careful with `rm -r`, and with `*`, which the shell replaces with every name in the directory: `rm *` deletes everything in it.",
        },
        {
          kind: "question",
          title: "Clean up",
          body: "Plain `rm` refuses to delete a directory. Try it, then do it properly.",
          widget: { type: "unix-terminal", props: { files: HOME5, tree: true, task: "Delete the `junk` directory and everything in it, but keep `keep.txt`.", solution: ["rm -r junk"] } },
          question: { type: "widget", goal: { missing: ["~/junk"], files: ["~/keep.txt"] } },
          explanation: "`rm -r junk`. Plain `rm junk` stops with *Is a directory*, a small safety net. And notice `rm` printed nothing when it worked: Unix tools stay quiet unless something goes wrong.",
        },
        {
          kind: "question",
          title: "Oops",
          body: "You ran `rm report.txt` by mistake. What now?",
          question: {
            type: "choice",
            options: ["Get it back from a backup or from version control (like Git), if you have one", "Look in the Trash", "Press Ctrl+Z to undo", "Run `unrm report.txt`"],
            answer: 0,
          },
          explanation: "The shell has no Trash and no undo, and in a terminal Ctrl+Z means *pause the running program*, not undo. That's why programmers keep their work in version control and back up often.",
        },
        {
          kind: "recap",
          points: [
            "`cat` prints files; `echo` prints text.",
            "`>` sends output into a file, **replacing** it; `>>` **appends** to the end.",
            "`cp` copies (`-r` for directories); `mv` moves and renames.",
            "`rm` deletes for good, with no undo (`-r` for directories); `rmdir` removes only empty ones.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 6. Pipes and filters ───────────────────────────────
    {
      id: "fnd-unix-6-pipes",
      title: "Pipes and filters",
      summary: "Small tools that each do one job, joined with |: head, grep, wc, sort, uniq.",
      minutes: 8,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "Small tools, joined up",
          body: "Unix comes with dozens of small programs that each do **one** job: show the first lines, keep the matching lines, sort, count. Each one reads text in and writes text out.\n\nThe **pipe**, `|`, joins them: the output of the command on the left becomes the input of the command on the right. Neither program knows or cares whether it's talking to a person or to another program.\n\nTry `cat fruits.txt`, then `cat fruits.txt | sort`.",
          widget: { type: "unix-terminal", props: { files: HOME6, suggest: ["cat fruits.txt", "cat fruits.txt | sort"] } },
        },
        {
          kind: "question",
          title: "Just the top: head",
          body: "`head` prints the first lines of its input: 10, unless you give it `-n` and a number.",
          widget: { type: "unix-terminal", props: { files: HOME6, task: "Show only the **first 3 lines** of `server.log`.", solution: ["head -n 3 server.log"] } },
          question: { type: "widget", goal: { output: LOG.slice(0, 3).join("\n") } },
          explanation: "`head -n 3 server.log`. Its partner `tail` prints the *last* lines, which is how people check the newest entries in a log: `tail -n 5 server.log`.",
        },
        {
          kind: "question",
          title: "Find lines: grep",
          body: "`grep PATTERN FILE` prints only the lines that contain the pattern.",
          widget: { type: "unix-terminal", props: { files: HOME6, task: "Show only the lines of `server.log` that contain `ERROR`.", solution: ["grep ERROR server.log"] } },
          question: { type: "widget", goal: { output: LOG.filter((l) => l.includes("ERROR")).join("\n") } },
          explanation: "`grep ERROR server.log` kept 3 of the 12 lines. The odd name comes from an old editor command, *g/re/p*: **g**lobally search for a **r**egular **e**xpression and **p**rint. Patterns can be much fancier than one word.",
        },
        {
          kind: "question",
          title: "Any case: grep -i",
          body: "`grep` is case-sensitive: `disk` doesn't match `Disk`.",
          widget: { type: "unix-terminal", props: { files: HOME6, task: "Find **every** line that mentions disk, in upper or lower case.", solution: ["grep -i disk server.log"] } },
          question: { type: "widget", goal: { output: LOG.filter((l) => /disk/i.test(l)).join("\n") } },
          explanation: "`grep -i disk server.log` (*i* for *ignore case*). Without `-i` you'd miss the `Disk 90% full` warning.",
        },
        {
          kind: "question",
          title: "Count: your first pipe",
          body: "`wc -l` counts lines (*wc* is short for *word count*; without `-l` it shows lines, words and bytes).",
          widget: { type: "unix-terminal", props: { files: HOME6, task: "Use `grep` and `wc -l` joined by a pipe to count the ERROR lines.", solution: ["grep ERROR server.log | wc -l"] } },
          question: { type: "widget", goal: { output: "3", lastCommand: "\\|" } },
          explanation: "`grep ERROR server.log | wc -l` prints `3`. grep's output never reached the screen: it flowed straight into `wc`. You just built a small program out of two others.",
        },
        {
          kind: "question",
          title: "Why sort before uniq?",
          body: "`uniq` removes repeated lines, but only repeats that sit **next to each other**. Why do people write `sort fruits.txt | uniq` rather than just `uniq fruits.txt`?",
          question: {
            type: "choice",
            options: [
              "Sorting puts identical lines next to each other, so `uniq` can catch every repeat",
              "`uniq` crashes on files that aren't sorted",
              "`sort` makes `uniq` faster, but the output is the same",
              "It's just a habit; both give the same output",
            ],
            answer: 0,
          },
          explanation: "In `fruits.txt` no two neighbours match, so `uniq` on its own changes nothing and `banana` still appears five times. After `sort`, all the bananas sit together and collapse into one line.",
        },
        {
          kind: "question",
          title: "Each one once",
          body: "Try `uniq fruits.txt` first to see the problem.",
          widget: { type: "unix-terminal", props: { files: HOME6, task: "Print each fruit **once**, in alphabetical order.", solution: ["sort fruits.txt | uniq"] } },
          question: { type: "widget", goal: { output: "apple\nbanana\ncherry\nkiwi" } },
          explanation: "`sort fruits.txt | uniq`. (`sort -u` does both jobs at once, but pipelines let you combine any tools you like.)",
        },
        {
          kind: "question",
          title: "Most common first",
          body: "`uniq -c` writes how many times each line repeated in front of it, and `sort -rn` sorts as numbers (`-n`), biggest first (`-r`).",
          widget: { type: "unix-terminal", props: { files: HOME6, task: "Show how many of each fruit there are, **most common first**.", solution: ["sort fruits.txt | uniq -c | sort -rn"] } },
          question: { type: "widget", goal: { output: "      5 banana\n      3 cherry\n      2 apple\n      1 kiwi" } },
          explanation: "`sort fruits.txt | uniq -c | sort -rn`: sort to group, count each group, then rank the counts. The same shape answers questions like *which pages get the most visits?* on logs with millions of lines.",
        },
        {
          kind: "question",
          title: "Build a pipeline",
          body: "Put the pieces in order to print the **two** most common words in `words.txt`.",
          question: { type: "order", items: ["`cat words.txt`", "`sort`", "`uniq -c`", "`sort -rn`", "`head -n 2`"] },
          explanation: "Read, group, count, rank, keep the top two: `cat words.txt | sort | uniq -c | sort -rn | head -n 2`. Each tool does one small job, and the pipe does the rest.",
        },
        {
          kind: "recap",
          points: [
            "A **pipe**, `|`, feeds one command's output into the next command's input.",
            "`head` and `tail` keep the first or last lines; `grep` keeps lines that match (`-i` ignores case).",
            "`wc -l` counts lines; `sort` sorts (`-n` numbers, `-r` reverse); `uniq` merges neighbouring repeats (`-c` counts them).",
            "Combining small tools answers big questions: `sort | uniq -c | sort -rn` ranks anything by how often it appears.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 7. Permissions ───────────────────────────────
    {
      id: "fnd-unix-7-permissions",
      title: "Permissions: who may do what",
      summary: "Owners, groups and others; read, write and execute; chmod with letters and numbers.",
      minutes: 8,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "Many users, one machine",
          body: "Unix was built for many people sharing one computer, so every file has an **owner** (a user) and a **group** (a named set of users). Its permissions say what three kinds of people may do with it:\n\n- the **owner**\n- members of the file's **group**\n- **others**: everybody else\n\nRun `whoami`, `groups` and `ls -l` to see who you are and who owns what.",
          widget: { type: "unix-terminal", props: { files: HOME7, groups: ["ada", "team"], suggest: ["whoami", "groups", "ls -l"] } },
        },
        {
          kind: "explain",
          title: "Reading rwx",
          body: "In `ls -l`, the first column is a 10-character string like `-rwxr-x---`. The first character is the type (`-` for a file, `d` for a directory). Then come three sets of three, for the **owner**, the **group** and **others**:\n\n- `r` **read**: look at the contents\n- `w` **write**: change it\n- `x` **execute**: run it as a program\n\nA `-` means *not allowed*. Flip the switches and watch the string and the people below.",
          widget: { type: "unix-perms", props: { mode: "750", name: "deploy.sh", people: true, octal: false } },
        },
        {
          kind: "question",
          title: "Set them",
          body: "Set the permissions so the **owner** can read and write, the **group** can only read, and **others** can do nothing.",
          widget: { type: "unix-perms", props: { mode: "644", name: "report.txt", octal: false } },
          question: { type: "widget", goal: { string: "rw-r-----" } },
          explanation: "`rw-r-----`: owner read and write, group read, others nothing. A common choice for a file you share with your team but not with everyone on the machine.",
        },
        {
          kind: "question",
          title: "Who can do what?",
          body: "`ls -l` shows:\n\n" + sh("-rwxr-x--- 1 ada team 812 Oct 25 09:14 deploy.sh") + "\n\nBob is in the `team` group; Eve isn't. What can they do with `deploy.sh`?",
          question: {
            type: "choice",
            options: [
              "Bob can read and run it but not change it; Eve can't do anything with it",
              "Both can read it, because reading is always allowed",
              "Bob can do everything ada can, since he's in the same group",
              "Eve can run it but not read it",
            ],
            answer: 0,
          },
          explanation: "The group's `r-x` applies to Bob and the others' `---` to Eve. Unix checks just **one** set per person: the owner's set if you own the file, otherwise the group's if you're in its group, otherwise the others' set.",
        },
        {
          kind: "explain",
          title: "Permissions as numbers",
          body: "Writing `rwxr-x---` is long, so permissions are often written as **three digits**, one per class. Each permission has a value, **r = 4, w = 2, x = 1**, and you add up the ones that are on:\n\n- `rwx` = 4 + 2 + 1 = **7**\n- `r-x` = 4 + 1 = **5**\n- `---` = **0**\n\nSo `rwxr-x---` is **750**. Each digit holds exactly three bits, one per letter, so these are *octal* digits (0 to 7), just like the binary you met earlier.",
          widget: { type: "unix-perms", props: { mode: "750", name: "deploy.sh" } },
        },
        {
          kind: "question",
          title: "Your turn",
          body: "What number is `rwxr-xr-x`?",
          widget: { type: "unix-perms", props: { mode: "700", name: "tool.sh" }, live: true },
          question: { type: "number", answer: 755 },
          explanation: "`rwx` = 7, `r-x` = 5, `r-x` = 5, so **755**: the usual setting for programs and scripts. Only the owner can change it, and everyone can read and run it. The other number you'll see everywhere is **644** (`rw-r--r--`), for ordinary files.",
        },
        {
          kind: "question",
          title: "Run a script",
          body: "`chmod` (*change mode*) changes permissions. With letters: `u` is the owning **u**ser, `g` the group, `o` others and `a` all; `+` adds, `-` removes, `=` sets exactly. So `chmod u+x file` lets the owner run it.\n\n`hello.sh` is a **script**: a text file of shell commands. Run it with `./hello.sh` (the `./` means *the one in this directory*). It fails. Fix it and run it again.",
          widget: { type: "unix-terminal", props: { files: HOME7, groups: ["ada", "team"], task: "Make `./hello.sh` run.", suggest: ["./hello.sh", "ls -l hello.sh"], solution: ["chmod u+x hello.sh", "./hello.sh"] } },
          question: { type: "widget", goal: { lastCommand: "^\\./hello\\.sh\\s*$", output: "Hello from a script!" } },
          explanation: "Without `x` the kernel refuses to run the file: *Permission denied*. After `chmod u+x hello.sh` (or `chmod +x`, or `chmod 755`) the script runs. Its first line, `#!/bin/bash`, tells the kernel which program should read the rest.",
        },
        {
          kind: "question",
          title: "Lock it with a number",
          body: "`secret.txt` is `rw-r--r--`, so anyone on this machine can read it.",
          widget: { type: "unix-terminal", props: { files: HOME7, groups: ["ada", "team"], task: "Use `chmod` with a **number** so only you can read and write `secret.txt`.", suggest: ["ls -l secret.txt"], solution: ["chmod 600 secret.txt", "ls -l secret.txt"] } },
          question: { type: "widget", goal: { mode: { "~/secret.txt": "600" } } },
          explanation: "`chmod 600 secret.txt` gives `rw-------`: 6 (4 + 2, read and write) for you, 0 for the group, 0 for others. Some tools insist on this: SSH refuses to use a private key file that other people can read.",
        },
        {
          kind: "question",
          title: "x on a directory",
          body: "Directories have r, w and x too, but they mean something a little different. What does **x** allow on a directory?",
          question: {
            type: "choice",
            options: ["Entering it with `cd` and reaching the files inside", "Running the directory as a program", "Deleting the directory", "Nothing: x is ignored on directories"],
            answer: 0,
          },
          explanation: "On a directory, `r` lets you *list* the names, `w` lets you *create, rename and delete* entries in it, and `x` lets you *enter* it and use paths through it. That's why directories are usually `rwxr-xr-x` (755).",
        },
        {
          kind: "recap",
          points: [
            "Every file has an **owner** and a **group**; permissions are set separately for the owner, the group and **others**.",
            "`r` read, `w` write, `x` execute; `ls -l` shows them as a string like `rwxr-xr-x`.",
            "As numbers, r = 4, w = 2, x = 1 per class: `755` is `rwxr-xr-x`, `644` is `rw-r--r--`, `600` is `rw-------`.",
            "`chmod u+x file` or `chmod 755 file` changes them; a script needs `x` to run as `./script`.",
          ],
        },
      ],
    },

    // ─────────────────────────────── 8. Processes from the shell ───────────────────────────────
    {
      id: "fnd-unix-8-jobs",
      title: "Processes from the shell",
      summary: "ps, background jobs with &, kill and signals, environment variables and PATH.",
      minutes: 8,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "Every command is a process",
          body: "Almost every command you run starts a new **process** (a few, like `cd`, are built into the shell itself). `ps` lists the processes in your terminal: PID, terminal (`TTY`), CPU time used, and command. `ps aux` shows every process on the machine, with its owner, CPU and memory use.\n\nRun `ps` twice and compare the PIDs.",
          widget: { type: "unix-terminal", props: { suggest: ["ps", "ps aux"] } },
        },
        {
          kind: "question",
          title: "A new PID each time",
          body: "In both `ps` listings, `bash` had the same PID but `ps` itself had a different one each time. Why?",
          question: {
            type: "choice",
            options: [
              "Each run of `ps` is a brand-new process, and new processes get new PIDs; bash is the same process the whole time",
              "PIDs change every second",
              "The shell renames processes to keep them secret",
              "`ps` makes up the numbers",
            ],
            answer: 0,
          },
          explanation: "The program file `/usr/bin/ps` stayed the same, but each run made a new process, which got a fresh PID. Your shell keeps its PID because it's one process, waiting for your next command.",
        },
        {
          kind: "question",
          title: "Foreground and background",
          body: "Normally the shell waits for a command to finish before it prompts you again: the command runs in the **foreground**. `sleep 5` does nothing for 5 seconds, and you get no prompt until it ends (press **Ctrl+C** to stop it early).\n\nPut `&` at the end and it runs in the **background** instead: the prompt comes straight back.",
          widget: { type: "unix-terminal", props: { task: "Start `sleep 60 &`, then run `ps` and find it.", suggest: ["sleep 5", "sleep 60 &", "jobs", "ps"], solution: ["sleep 60 &", "ps"] } },
          question: { type: "widget", goal: { running: ["sleep"], lastCommand: "^ps" } },
          explanation: "The shell printed something like `[1] 4378`: job number 1, PID 4378. `jobs` lists the jobs started from this shell, and when a background job ends, the shell reports *Done* at your next prompt.",
        },
        {
          kind: "question",
          title: "Stop a runaway",
          body: "A program called `hog` is using almost all the CPU (see the `%CPU` column of `ps aux`). `kill PID` asks a process to stop.",
          widget: { type: "unix-terminal", props: { procs: [{ pid: 5120, cmd: "hog", args: "./hog --forever", cpu: 99.1, mem: 0.4, time: "00:12:31" }], task: "Find the PID of `hog` and stop it with `kill`.", suggest: ["ps", "ps aux"], solution: ["ps", "kill 5120", "ps"] } },
          question: { type: "widget", goal: { killed: [5120] } },
          explanation: "`kill 5120`. Despite its name, `kill` doesn't destroy anything itself: it sends the process a **signal**, and by default that signal is `TERM`, a polite request to stop.",
        },
        {
          kind: "explain",
          title: "Signals",
          body: "A **signal** is a tiny message the kernel delivers to a process. The ones you'll meet most:\n\n- `TERM` (15): *please stop*. The default for `kill`. A program can catch it and save its work first.\n- `INT` (2): *interrupt*. What **Ctrl+C** sends to the foreground program.\n- `KILL` (9): *stop now*. It can't be caught or ignored: the kernel simply ends the process. `kill -9 PID`.\n- `TSTP`: *pause*. What **Ctrl+Z** sends; `fg` resumes the job in the foreground, `bg` in the background.\n\nTry it: run `sleep 100`, press **Ctrl+Z**, run `jobs`, then `fg`, then **Ctrl+C**.",
          widget: { type: "unix-terminal", props: { suggest: ["sleep 100", "jobs", "fg", "kill -l"] } },
        },
        {
          kind: "question",
          title: "It won't listen",
          body: "This `stuck` program ignores polite requests.",
          widget: { type: "unix-terminal", props: { procs: [{ pid: 6001, cmd: "stuck", args: "./stuck", stubborn: true, cpu: 2.0, time: "00:03:10" }], task: "Make `stuck` (PID 6001) go away.", suggest: ["kill 6001", "ps"], solution: ["kill -9 6001", "ps"] } },
          question: { type: "widget", goal: { killed: [6001] } },
          explanation: "`kill 6001` sends `TERM`, which `stuck` ignores. `kill -9 6001` sends `KILL`, which no process can ignore. Keep it as a last resort: the program gets no chance to clean up, so unsaved work is lost and temporary files stay behind.",
        },
        {
          kind: "explain",
          title: "Environment variables",
          body: "Every process also carries **environment variables**: named settings like `HOME=/home/ada` or `USER=ada`, copied from the process that started it. Before running a command, the shell replaces `$NAME` with that variable's value.\n\nTry `echo $HOME`, `echo $USER` and `env` (which lists them all). `export NAME=value` sets one for this shell and everything it starts.",
          widget: { type: "unix-terminal", props: { suggest: ["echo $HOME", "echo $USER", "env", "export COLOUR=lime", "echo $COLOUR"] } },
        },
        {
          kind: "question",
          title: "Where does ls live?",
          body: "When you type `ls`, how does the shell find the program? It looks through the directories listed in the variable `PATH`, in order, and runs the first file called `ls` it finds. `echo $PATH` shows the list, and `which ls` shows which file `ls` really is.",
          widget: { type: "unix-terminal", props: { task: "Find the full path of the `ls` program.", suggest: ["echo $PATH", "which ls"], solution: ["which ls"] } },
          question: { type: "widget", goal: { outputIncludes: "/usr/bin/ls" } },
          explanation: "`ls` is the file `/usr/bin/ls`: a command is just a program file in one of the `PATH` directories. Builtins like `cd` aren't files at all (`type cd` says *cd is a shell builtin*). They can't be: changing directory has to happen inside the shell's own process.",
        },
        {
          kind: "question",
          title: "Your own command",
          body: "You wrote a script, `~/bin/greet`. Typing `greet` doesn't work yet. It needs execute permission, and `~/bin` needs to be on your `PATH`. Put it at the front with:\n\n" + sh('export PATH="$HOME/bin:$PATH"'),
          widget: {
            type: "unix-terminal",
            props: {
              files: { "~/bin/greet": { content: '#!/bin/bash\necho "Hi, $USER!"\n', mode: "644" } },
              task: "Make typing just `greet` work.",
              suggest: ["greet", "ls -l bin"],
              solution: ["chmod +x ~/bin/greet", 'export PATH="$HOME/bin:$PATH"', "greet"],
            },
          },
          question: { type: "widget", goal: { lastCommand: "^greet\\s*$", output: "Hi, ada!" } },
          explanation: "`chmod +x ~/bin/greet` makes it runnable, and the `export` puts `~/bin` first in the search list. That's all a command is: an executable file somewhere on the `PATH`. To keep the setting in every new terminal, people add that `export` line to `~/.bashrc`.",
        },
        {
          kind: "recap",
          points: [
            "Each command runs as a process; `ps` lists them with their **PIDs**.",
            "`&` runs a command in the **background**; `jobs`, `fg` and `bg` manage jobs; Ctrl+C interrupts and Ctrl+Z pauses.",
            "`kill PID` sends `TERM` (a polite stop); `kill -9 PID` sends `KILL`, which can't be ignored.",
            "**Environment variables** like `HOME` and `PATH` travel with every process; the shell finds commands by searching the `PATH` directories.",
          ],
        },
      ],
    },
  ],
};
