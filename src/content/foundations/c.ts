import type { Module } from "../../learn/types.ts";

/**
 * Module: C and memory. Follows bits, "Inside the computer" and Assembly, so addresses, registers,
 * the stack and CALL/RET are already known. No C compiler runs in the browser, so every hands-on
 * step is a widget (memory maps, tracers, playgrounds) with a widget-goal question.
 */
export const cModule: Module = {
  id: "c",
  part: "machine",
  title: "C and memory",
  blurb: "Addresses, pointers, arrays and strings as raw bytes, the stack and the heap, and how code is compiled.",
  icon: "memory",
  lessons: [
    // ── Lesson 1 ──
    {
      id: "fnd-c-1-meet",
      title: "Meet C",
      summary: "A language close to the machine, with types whose sizes you can count in bytes.",
      minutes: 6,
      xp: 50,
      steps: [
        {
          kind: "explain",
          title: "A thin layer over the machine",
          body: "You've seen the CPU run machine code and step through assembly. Writing raw assembly by hand is slow and tied to one chip. **C** sits one thin layer above it: you write readable statements, and a **compiler** turns them into machine code for whatever CPU you target.\n\nC gives you almost nothing you didn't ask for. There's no hidden bookkeeping: when you ask for memory, you get bytes at an address, and it's yours to manage. That's why operating systems, databases and the runtimes of newer languages are written in C.",
        },
        {
          kind: "explain",
          title: "Every C program starts at main",
          body: "When the operating system runs your program, it calls one function: **`main`**. Whatever `main` returns is the program's **exit code** (0 means success).\n\n`printf` writes text to the screen. The `\\n` is a newline, and `%d` is a slot that the next value fills in.\n\n```c\n#include <stdio.h>\n\nint main(void) {\n    printf(\"%d bottles\\n\", 99);\n    return 0;\n}\n```",
        },
        {
          kind: "question",
          title: "Where does it begin?",
          body: "A C program has several functions in it. When you run the program, which one does the operating system call first?",
          question: { type: "choice", options: ["The first one written in the file", "`main`", "The one with the longest name", "All of them at once"], answer: 1 },
          explanation: "The operating system always starts a C program by calling **`main`**. The order functions appear in the file doesn't matter; everything else runs because `main` (directly or indirectly) calls it.",
        },
        {
          kind: "explain",
          title: "Types have fixed sizes",
          body: "In C you declare the **type** of every variable, and each type takes a fixed number of bytes. On a typical 64-bit computer:\n\n- `char` — 1 byte (a single character or small number)\n- `int` — 4 bytes (a whole number)\n- `double` — 8 bytes (a number with a fractional part)\n- a **pointer** — 8 bytes (an address, whatever it points to)\n\nThe operator `sizeof` reports these sizes. `sizeof(int)` is `4`.",
          widget: { type: "cmem-memory", props: { start: 0x1000, length: 16, mode: "explore", vars: [{ name: "c", type: "char", addr: 0x1000, value: "A" }, { name: "n", type: "int", addr: 0x1004, value: 1000 }, { name: "d", type: "double", addr: 0x1008, value: 1.5 }] } },
        },
        {
          kind: "question",
          title: "Count the bytes",
          body: "A struct holds one `char`, one `int` and one `double`, laid out end to end with no gaps. How many bytes is that in total?",
          question: { type: "number", hint: "A char is 1 byte, an int is 4 and a double is 8. Add them up.", answer: 13, unit: "bytes" },
          explanation: "1 (char) + 4 (int) + 8 (double) = **13** bytes. Real compilers often add *padding* so each field starts at a convenient address, but the raw data is 13 bytes.",
        },
        {
          kind: "question",
          title: "Pick the right type",
          body: "You need to store a person's age (a whole number like 34). Which type fits best?",
          question: { type: "choice", options: ["`char`, because it's small", "`int`", "`double`, to be safe", "`pointer`"], answer: 1 },
          explanation: "`int` is the natural choice for a whole number. A `char` only reaches 127 (or 255 unsigned), which is too tight to be safe for arbitrary counts; `double` wastes space and can't represent every value exactly; a pointer holds an address, not a value.",
        },
        {
          kind: "recap",
          points: [
            "C is a compiled language that stays close to the machine: you manage memory yourself.",
            "Every program starts when the operating system calls `main`; its return value is the exit code.",
            "Each type has a fixed size: `char` is 1 byte, `int` is 4, `double` is 8, a pointer is 8.",
            "`sizeof` reports a type's size in bytes.",
          ],
        },
      ],
    },

    // ── Lesson 2 ──
    {
      id: "fnd-c-2-addresses",
      title: "Variables live at addresses",
      summary: "Every variable is bytes at a numbered address. The & operator reads that address.",
      minutes: 7,
      xp: 55,
      steps: [
        {
          kind: "explain",
          title: "Memory is one long row of bytes",
          body: "Think of memory as billions of **bytes** in a row, each with its own number: its **address**. A variable is just a name for some of those bytes. An `int` named `n` is really 4 bytes sitting at some address, say `0x1004`.\n\nTap a byte below to see which variable it belongs to.",
          widget: { type: "cmem-memory", props: { start: 0x1000, length: 16, mode: "explore", vars: [{ name: "x", type: "int", addr: 0x1000, value: 5 }, { name: "y", type: "int", addr: 0x1004, value: 42 }, { name: "ch", type: "char", addr: 0x1008, value: "Q" }] } },
        },
        {
          kind: "explain",
          title: "The & operator: 'address of'",
          body: "Put **`&`** in front of a variable and you get its address instead of its value.\n\n```c\nint x = 5;\nprintf(\"%d\\n\", x);    // 5     the value\nprintf(\"%p\\n\", &x);   // 0x1000  where it lives\n```\n\nThe value is what's stored; the address is where it's stored. They are two different things about the same variable.",
        },
        {
          kind: "question",
          title: "Read the map",
          body: "In the map, the `int` variable `y` sits right after `x`. Each `int` is 4 bytes and `x` starts at `0x1000`. Tap the bytes of **`y`** to confirm where `&y` points.",
          widget: { type: "cmem-memory", props: { start: 0x1000, length: 16, mode: "pick-var", vars: [{ name: "x", type: "int", addr: 0x1000, value: 5 }, { name: "y", type: "int", addr: 0x1004, value: 42 }, { name: "ch", type: "char", addr: 0x1008, value: "Q" }] } },
          question: { type: "widget", hint: "y comes right after x, and x starts at 0x1000 and is 4 bytes long.", goal: { var: "y" }, prompt: "Select y" },
          explanation: "`x` takes bytes `0x1000`–`0x1003`, so `y` starts at **`0x1004`**. `&y` is `0x1004`. Addresses count in bytes, and the next `int` begins 4 bytes along.",
        },
        {
          kind: "question",
          title: "Value or address?",
          body: "`char ch` holds the letter `Q` and lives at address `0x1008`. What does **`&ch`** give you?",
          question: { type: "choice", options: ["The letter `Q`", "The number 81 (Q's code)", "The address `0x1008`", "Nothing; you can't take `&` of a char"], answer: 2 },
          explanation: "`&ch` is the **address** where `ch` lives: `0x1008`. The value `Q` (code 81) is what's *stored* there. `&` always gives you the location, never the contents.",
        },
        {
          kind: "explain",
          title: "Little-endian: bytes stored backwards",
          body: "`int y = 42` stores the number across 4 bytes. Most computers are **little-endian**: the *lowest* byte goes first (at the smallest address). So 42 is stored as `2A 00 00 00`, not `00 00 00 2A`.\n\nYou rarely need to care, but it explains the byte order you'll see in a memory map or a debugger.",
          widget: { type: "cmem-memory", props: { start: 0x1004, length: 8, mode: "explore", vars: [{ name: "y", type: "int", addr: 0x1004, value: 42 }, { name: "z", type: "int", addr: 0x1008, value: 256 }] } },
        },
        {
          kind: "question",
          title: "Spot the low byte",
          body: "`int z = 256` lives at `0x1008`. In little-endian order, 256 is `00 01 00 00`. Tap the single byte that holds the `01`.",
          widget: { type: "cmem-memory", props: { start: 0x1008, length: 8, cols: 4, mode: "pick-byte", vars: [{ name: "z", type: "int", addr: 0x1008, value: 256 }] } },
          question: { type: "widget", hint: "Little-endian puts the smallest byte first. Which of the four bytes holds the 01?", goal: { addr: 0x1009 }, prompt: "Tap the 0x01 byte" },
          explanation: "256 = 1 × 256, and 256 is the value of the *second* byte (each byte up is ×256). So the `01` sits at `0x1009`, one byte above the start. The lowest byte at `0x1008` is `00`.",
        },
        {
          kind: "recap",
          points: [
            "Memory is a row of bytes, each with a numeric address; a variable names some of those bytes.",
            "`&x` gives the **address** of `x`; `x` gives its **value**. They're different facts about the same variable.",
            "The next variable sits `sizeof` bytes further along, so an `int` after `0x1000` starts at `0x1004`.",
            "Most machines are little-endian: a multi-byte number stores its lowest byte at the lowest address.",
          ],
        },
      ],
    },

    // ── Lesson 3 ──
    {
      id: "fnd-c-3-pointers",
      title: "Pointers",
      summary: "A pointer is a variable that holds an address. Dereference it to reach what it points at.",
      minutes: 8,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "A variable that holds an address",
          body: "An address is just a number, so you can store it in a variable. A variable that holds an address is a **pointer**.\n\n```c\nint x = 3;\nint *p = &x;   // p holds the address of x\n```\n\nThe `*` in the declaration says 'this is a pointer to an int'. Now `p` points at `x`. Tap the statements and watch `p`.",
          widget: { type: "cmem-pointer", props: { ptr: { target: null }, actions: ["p=&x", "p=&y", "p=NULL"] } },
        },
        {
          kind: "explain",
          title: "Dereference with *",
          body: "Putting **`*`** in front of a pointer means 'the thing it points at'. This is called **dereferencing**.\n\n- `p` is the address it holds.\n- `*p` is the value at that address.\n- `*p = 5` changes that value, reaching through the pointer.\n\nSo if `p` points at `x`, then `*p = 5` is another way of writing `x = 5`.",
          widget: { type: "cmem-pointer", props: { ptr: { target: "x" }, actions: ["*p=5", "*p+=1", "p=&y"] } },
        },
        {
          kind: "question",
          title: "Reach through the pointer",
          body: "`p` points at `x`. Using only the buttons, make the value of **`x` become 5** by writing *through* the pointer (don't set `x` directly).",
          widget: { type: "cmem-pointer", props: { ptr: { target: "x" }, actions: ["*p=5", "p=&y", "*p+=1", "p=&x"] }, live: true },
          question: { type: "widget", hint: "Use the button that assigns through the pointer (*p = …), not the one that changes x directly.", goal: { values: { x: 5 }, target: "x" }, prompt: "Make x = 5 via *p" },
          explanation: "With `p` pointing at `x`, `*p = 5` stores 5 in the bytes `p` points to, which are `x`'s bytes. The pointer is a second route to the same variable.",
        },
        {
          kind: "question",
          title: "Two views of a pointer",
          body: "`int *p = &x;` and `x` is `3` at address `0x1000`. Which statement is true?",
          question: {
            type: "choice",
            options: ["`p` is 3 and `*p` is `0x1000`", "`p` is `0x1000` and `*p` is 3", "`p` and `*p` are both 3", "`p` and `*p` are both `0x1000`"],
            answer: 1,
          },
          explanation: "`p` holds the **address** `0x1000`; `*p` follows it to the **value** `3`. Mixing these up (using the address as if it were the value) is one of the most common pointer bugs.",
        },
        {
          kind: "explain",
          title: "NULL: a pointer to nothing",
          body: "Sometimes a pointer doesn't point at anything yet. By convention that's **`NULL`**, which is address 0. It's a clear 'no target' marker.\n\nThe danger: dereferencing NULL (`*p` when `p` is NULL) tries to read address 0, which your program doesn't own. The operating system stops the program with a **segmentation fault**. Always check a pointer isn't NULL before following it.",
          widget: { type: "cmem-pointer", props: { ptr: { target: null }, actions: ["p=&x", "*p=5", "p=NULL"] } },
        },
        {
          kind: "question",
          title: "Follow a NULL pointer",
          body: "Set `p` to `NULL`, then try `*p = 5`. What happens in the playground, and why?",
          widget: { type: "cmem-pointer", props: { ptr: { target: "x" }, actions: ["p=NULL", "*p=5", "p=&x"] }, live: true },
          question: { type: "widget", hint: "Set p to NULL first, then try to write through it.", goal: { crashed: true }, prompt: "Trigger the crash" },
          explanation: "`*p` when `p` is NULL reaches for address 0, which no program is allowed to touch, so it crashes with a **segmentation fault**. A pointer is only safe to dereference when it points at real, owned memory.",
        },
        {
          kind: "explain",
          title: "Pointers to pointers (a peek)",
          body: "A pointer is a variable with an address of its own, so you can point at *it* too. `int **pp = &p;` is a pointer to a pointer: `pp` holds `p`'s address, `*pp` is `p` (an address), and `**pp` follows two hops to the value.\n\nYou'll meet this when a function needs to change a pointer the caller holds. Don't worry about using it yet; just notice the pattern: each `*` is one hop.",
          widget: { type: "cmem-pointer", props: { ptr: { target: "x" }, pp: true, actions: ["*p=5", "p=&y"] } },
        },
        {
          kind: "recap",
          points: [
            "A pointer stores an **address**. `int *p = &x;` makes `p` point at `x`.",
            "`*p` dereferences: it reads or writes the value at that address, so `*p = 5` changes `x`.",
            "`p` is the address, `*p` is the value: keep them straight.",
            "`NULL` (address 0) means 'points at nothing'; dereferencing it is a segmentation fault.",
            "Each extra `*` is one more hop: `**pp` follows two pointers.",
          ],
        },
      ],
    },

    // ── Lesson 4 ──
    {
      id: "fnd-c-4-arrays",
      title: "Arrays are contiguous memory",
      summary: "a[i] is just *(a + i). Pointer arithmetic scales by the element size, and nothing stops you going out of bounds.",
      minutes: 8,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "Elements side by side",
          body: "An **array** is a run of same-type values stored back to back. `int nums[4] = {7, 9, 4, 2};` is 4 ints, 16 bytes, one after another. The name `nums` stands for the address of the first element.\n\nStep through the indexes and watch the address climb.",
          widget: { type: "cmem-array", props: { name: "nums", type: "int", base: 0x2000, values: [7, 9, 4, 2] } },
        },
        {
          kind: "explain",
          title: "a[i] is *(a + i)",
          body: "Indexing is defined in terms of pointers. `a[i]` means exactly **`*(a + i)`**: start at the array's address, step `i` elements along, and dereference.\n\nThe key subtlety: `a + i` moves by `i` **elements**, not `i` bytes. For an `int` array, `a + 1` is 4 bytes further; for a `char` array, 1 byte. The compiler scales by the element size for you.",
          widget: { type: "cmem-array", props: { name: "a", type: "int", base: 0x2000, values: [10, 20, 30, 40, 50] } },
        },
        {
          kind: "question",
          title: "Work out the address",
          body: "`int a[5]` starts at `0x2000`. Step to index **3** and read off `&a[3]`.",
          widget: { type: "cmem-array", props: { name: "a", type: "int", base: 0x2000, values: [10, 20, 30, 40, 50] }, live: true },
          question: { type: "widget", hint: "Each int is 4 bytes, so &a[3] is the start plus 3 × 4.", goal: { i: 3 }, prompt: "Go to index 3" },
          explanation: "`&a[3]` = `0x2000 + 3 × 4` = `0x2000 + 12` = **`0x200C`**. Each step is one int (4 bytes), so index 3 is 12 bytes in.",
        },
        {
          kind: "question",
          title: "Scaling by element size",
          body: "`char letters[6]` starts at `0x3000`. What is `&letters[3]`?",
          question: { type: "choice", options: ["`0x300C` (3 × 4)", "`0x3003` (3 × 1)", "`0x3000`", "`0x3006`"], answer: 1 },
          explanation: "A `char` is 1 byte, so `letters + 3` moves just 3 bytes: `0x3000 + 3` = **`0x3003`**. The same index gives a different address depending on the element size.",
        },
        {
          kind: "explain",
          title: "Nothing checks the bounds",
          body: "`int a[5]` has valid indexes 0 to 4. C does **not** check that you stay in range. `a[5]`, `a[8]`, even `a[-1]` all compute an address and read or write it, whatever happens to be there.\n\nReading gives garbage; writing corrupts another variable or crashes. This is the single biggest source of bugs (and attacks) in C. Step past the end below and see what you reach.",
          widget: { type: "cmem-array", props: { name: "a", type: "int", base: 0x2000, values: [10, 20, 30, 40, 50], after: { name: "count", value: 99 }, maxIndex: 6, write: 0 } },
        },
        {
          kind: "question",
          title: "Off the end",
          body: "`int a[5]` is followed in memory by `int count = 99`. Step to index **5** (one past the end) to see what `a[5]` actually reaches.",
          widget: { type: "cmem-array", props: { name: "a", type: "int", base: 0x2000, values: [10, 20, 30, 40, 50], after: { name: "count", value: 99 }, minIndex: 0, maxIndex: 6 }, live: true },
          question: { type: "widget", hint: "Indexes 0 to 4 are inside the array. Step one further.", goal: { i: 5, outOfBounds: true }, prompt: "Go one past the end" },
          explanation: "`a[5]` is the address right after the array, which is where `count` lives. Reading `a[5]` reads `count`; *writing* `a[5]` would overwrite it. C happily lets you, because `a[5]` is just `*(a + 5)`.",
        },
        {
          kind: "question",
          title: "Why loops stop at length − 1",
          body: "You loop over `int a[5]` with `for (int i = 0; i < 5; i++)`. Why is the test `i < 5` and not `i <= 5`?",
          question: {
            type: "choice",
            options: ["Style; either works", "`i <= 5` would read `a[5]`, one element past the end", "C counts arrays from 1", "`<=` is slower than `<`"],
            answer: 1,
          },
          explanation: "Valid indexes are 0 to 4. `i <= 5` would let `i` reach 5 and touch `a[5]`, which is out of bounds. Off-by-one errors like this are classic C bugs; `i < length` keeps you in range.",
        },
        {
          kind: "recap",
          points: [
            "An array is same-type elements stored contiguously; the name is the address of element 0.",
            "`a[i]` is `*(a + i)`: step `i` elements from the start, then dereference.",
            "`a + i` moves by `i × sizeof(element)` bytes, so the address scales with the type.",
            "C never checks bounds: an out-of-range index reads or writes whatever is next in memory.",
            "Loop with `i < length` so you stop at the last valid index, `length − 1`.",
          ],
        },
      ],
    },

    // ── Lesson 5 ──
    {
      id: "fnd-c-5-strings",
      title: "Strings are char arrays",
      summary: "A C string is characters ending in a '\\0'. Lose the terminator and length checks run off the end.",
      minutes: 8,
      xp: 60,
      steps: [
        {
          kind: "explain",
          title: "Text is a char array, plus a marker",
          body: "C has no separate string type. A **string** is just a `char` array whose characters are followed by a special **null terminator**: a byte with value 0, written `'\\0'`.\n\nSo `\"hi\"` takes **three** bytes: `h`, `i`, `\\0`. The `\\0` isn't printed; it's the signal that says 'the text stops here'.",
          widget: { type: "cmem-memory", props: { start: 0x3000, length: 8, showChars: true, mode: "explore", vars: [{ name: "s", type: "char[]", addr: 0x3000, value: "hi" }] } },
        },
        {
          kind: "question",
          title: "Count the bytes",
          body: "How many bytes does the string `\"cat\"` occupy in memory?",
          question: { type: "number", hint: "A C string ends with an extra terminator byte. Count the letters and that one too.", answer: 4, unit: "bytes" },
          explanation: "Three letters plus the `'\\0'` terminator = **4** bytes. Every C string carries that hidden extra byte, which is why a buffer for an n-character string needs room for n + 1.",
        },
        {
          kind: "explain",
          title: "strlen walks to the '\\0'",
          body: "How long is a string? C doesn't store the length anywhere. `strlen` **walks** from the start, counting bytes, and stops when it hits the `'\\0'`. The terminator itself isn't counted.\n\nStep through `strlen` below, one byte at a time.",
          widget: { type: "cmem-string", props: { text: "code", base: 0x3000 } },
        },
        {
          kind: "question",
          title: "Run strlen",
          body: "Walk `strlen` across the string `\"code\"` until it stops. What length does it report?",
          widget: { type: "cmem-string", props: { text: "code", base: 0x3000 }, live: true },
          question: { type: "widget", hint: "strlen counts characters until it meets the terminator, which it does not count.", goal: { done: true, count: 4 }, prompt: "Finish the walk" },
          explanation: "It counts `c`, `o`, `d`, `e` (4) and stops at the `'\\0'` in slot 4. `strlen` is **4**, even though the array uses 5 bytes. Length and storage size are different numbers.",
        },
        {
          kind: "explain",
          title: "The missing terminator",
          body: "Everything depends on that `'\\0'`. If it's missing (say you filled a buffer byte by byte and forgot it), `strlen` has no idea where to stop. It keeps reading past the end of your array into whatever memory comes next, counting until it stumbles on some unrelated 0 byte, or crashes.\n\nRemove the terminator below and run `strlen` again.",
          widget: { type: "cmem-string", props: { text: "code", capacity: 5, terminated: true, toggle: true, after: [0x3f, 0x21, 0x00] } },
        },
        {
          kind: "question",
          title: "What goes wrong without it",
          body: "With no `'\\0'`, `strlen` walks off the end of the 5-byte array. What is the real problem?",
          question: {
            type: "choice",
            options: [
              "It always returns 0",
              "It returns the array's size, 5",
              "It reads memory past the array until it chances on a 0 byte, giving a wrong, unpredictable length",
              "The compiler refuses to build it",
            ],
            answer: 2,
          },
          explanation: "Without a terminator `strlen` can't know where the text ends. It reads past the array into unrelated memory, returning a wrong length that depends on whatever bytes happen to be there, and it may crash. Nothing warns you.",
        },
        {
          kind: "question",
          title: "Size the buffer",
          body: "You want to store the word `\"hello\"` as a C string. What is the smallest `char` array that holds it safely?",
          question: { type: "choice", options: ["`char s[5]`", "`char s[6]`", "`char s[4]`", "`char s[10]` is the only safe size"], answer: 1 },
          explanation: "`\"hello\"` is 5 letters plus the `'\\0'`, so you need **6** bytes: `char s[6]`. `s[5]` has no room for the terminator. Forgetting the +1 is a classic cause of strings that run off the end.",
        },
        {
          kind: "recap",
          points: [
            "A C string is a `char` array ending in a null terminator, the byte `'\\0'`.",
            "`\"hi\"` is 3 bytes: the text plus the hidden `'\\0'`.",
            "`strlen` walks from the start and stops at the `'\\0'`; the length excludes it.",
            "No terminator means length checks read past the array: a wrong, unpredictable answer or a crash.",
            "A buffer for an n-character string needs n + 1 bytes.",
          ],
        },
      ],
    },

    // ── Lesson 6 ──
    {
      id: "fnd-c-6-stack-heap",
      title: "The stack and the heap",
      summary: "Locals live on the stack and vanish on return; malloc gives you heap memory you must free yourself.",
      minutes: 9,
      xp: 70,
      steps: [
        {
          kind: "explain",
          title: "Two places memory comes from",
          body: "A running program keeps its data in two main regions:\n\n- The **stack**: automatic storage for each function call. A function's local variables live in its **frame**, which appears when the function is called and disappears when it returns. Fast and tidy.\n- The **heap**: a big pool you borrow from explicitly when you need memory that outlives a single call, or whose size you only learn at runtime.\n\nYou met the stack and frames in assembly. Let's watch locals come and go.",
          widget: {
            type: "cmem-trace",
            props: {
              title: "main.c",
              code: "int square(int n) {\n    int r = n * n;\n    return r;\n}\n\nint main(void) {\n    int x = 5;\n    int y = square(x);\n    printf(\"%d\\n\", y);\n    return 0;\n}",
              steps: [
                { line: 6, frames: [{ name: "main", vars: [] }] },
                { line: 7, frames: [{ name: "main", vars: [{ name: "x", type: "int", addr: 0x7f40, value: "5" }] }] },
                { line: 1, frames: [{ name: "main", vars: [{ name: "x", type: "int", addr: 0x7f40, value: "5" }] }, { name: "square", vars: [{ name: "n", type: "int", addr: 0x7f20, value: "5" }] }], note: "square(5) is called: a new frame with its own n is pushed." },
                { line: 2, frames: [{ name: "main", vars: [{ name: "x", type: "int", addr: 0x7f40, value: "5" }] }, { name: "square", vars: [{ name: "n", type: "int", addr: 0x7f20, value: "5" }, { name: "r", type: "int", addr: 0x7f24, value: "25" }] }] },
                { line: 3, frames: [{ name: "main", vars: [{ name: "x", type: "int", addr: 0x7f40, value: "5" }] }, { name: "square", vars: [{ name: "n", type: "int", addr: 0x7f20, value: "5" }, { name: "r", type: "int", addr: 0x7f24, value: "25" }] }], note: "square returns 25. Its frame (n and r) is about to be popped." },
                { line: 8, frames: [{ name: "main", vars: [{ name: "x", type: "int", addr: 0x7f40, value: "5" }, { name: "y", type: "int", addr: 0x7f44, value: "25" }] }], note: "Back in main. square's frame is gone; its n and r no longer exist." },
                { line: 9, frames: [{ name: "main", vars: [{ name: "x", type: "int", addr: 0x7f40, value: "5" }, { name: "y", type: "int", addr: 0x7f44, value: "25" }] }], out: "25\n" },
                { line: 10, frames: [{ name: "main", vars: [{ name: "x", type: "int", addr: 0x7f40, value: "5" }, { name: "y", type: "int", addr: 0x7f44, value: "25" }] }] },
              ],
            },
          },
        },
        {
          kind: "question",
          title: "Locals don't outlive their call",
          body: "In the trace, `square` has a local `int r`. After `square` returns and you're back in `main`, what has happened to `r`?",
          question: {
            type: "choice",
            options: ["It's still there, `main` can read it", "Its frame was popped, so `r` no longer exists", "It moved to the heap", "It became a global variable"],
            answer: 1,
          },
          explanation: "`r` lived in `square`'s stack frame. When `square` returned, the frame was popped and `r`'s memory was reclaimed. A function can only hand back a **value** (here, 25); it can't keep its locals alive.",
        },
        {
          kind: "explain",
          title: "The dangling-pointer trap",
          body: "So what if a function returns the **address** of a local? The address is still a number, but the frame it pointed into is gone. The pointer now dangles, aimed at memory that's been reclaimed.\n\n```c\nint *bad(void) {\n    int r = 25;\n    return &r;   // r dies when bad() returns!\n}\n```\n\nUsing the returned pointer is **undefined behaviour**: it might read a stale value, or whatever the next call overwrote.",
        },
        {
          kind: "question",
          title: "Spot the dangle",
          body: "`bad()` returns `&r`, the address of its local `int r`. The caller stores it in `p` and later does `*p`. Why is that a bug?",
          question: {
            type: "choice",
            options: [
              "`&r` is NULL",
              "`r`'s frame is gone after `bad` returns, so `p` points at memory that no longer belongs to `r`",
              "You can never return a pointer in C",
              "`*p` is always 0",
            ],
            answer: 1,
          },
          explanation: "`r` lives in `bad`'s frame, which is popped on return. `p` holds an address into dead stack space. Reading `*p` is undefined: the value may look right by luck, then break when another call reuses those bytes. To return memory that outlives the call, use the heap.",
        },
        {
          kind: "explain",
          title: "malloc and free",
          body: "**`malloc(n)`** borrows `n` bytes from the heap and returns their address (or `NULL` if it can't). That memory stays yours, across any number of returns, until you hand it back with **`free`**.\n\n```c\nint *a = malloc(3 * sizeof(int));  // room for 3 ints\na[0] = 10;\n// ... use a ...\nfree(a);   // give it back\n```\n\nStep through and watch a block appear on the heap and then be freed.",
          widget: {
            type: "cmem-trace",
            props: {
              title: "heap.c",
              code: "int main(void) {\n    int *a = malloc(3 * sizeof(int));\n    a[0] = 10;\n    a[1] = 20;\n    free(a);\n    return 0;\n}",
              steps: [
                { line: 2, frames: [{ name: "main", vars: [{ name: "a", type: "int *", addr: 0x7f40, ptr: 0x5000 }] }], heap: [{ addr: 0x5000, size: 12, label: "int[3]", cells: ["?", "?", "?"], state: "live" }], note: "malloc returned a 12-byte block at 0x5000; a points at it." },
                { line: 3, frames: [{ name: "main", vars: [{ name: "a", type: "int *", addr: 0x7f40, ptr: 0x5000 }] }], heap: [{ addr: 0x5000, size: 12, label: "int[3]", cells: ["10", "?", "?"], state: "live" }] },
                { line: 4, frames: [{ name: "main", vars: [{ name: "a", type: "int *", addr: 0x7f40, ptr: 0x5000 }] }], heap: [{ addr: 0x5000, size: 12, label: "int[3]", cells: ["10", "20", "?"], state: "live" }] },
                { line: 5, frames: [{ name: "main", vars: [{ name: "a", type: "int *", addr: 0x7f40, ptr: 0x5000 }] }], heap: [{ addr: 0x5000, size: 12, label: "int[3]", cells: ["10", "20", "?"], state: "freed" }], note: "free(a) returns the block. a still holds 0x5000, but that memory is no longer yours." },
                { line: 6, frames: [{ name: "main", vars: [{ name: "a", type: "int *", addr: 0x7f40, ptr: 0x5000 }] }], heap: [{ addr: 0x5000, size: 12, label: "int[3]", cells: ["10", "20", "?"], state: "freed" }] },
              ],
            },
          },
        },
        {
          kind: "question",
          title: "A leak",
          body: "A function calls `malloc` and returns without ever calling `free`, and no pointer to the block is kept. The program keeps running. What is this?",
          question: {
            type: "choice",
            options: ["A segmentation fault", "A memory leak: the block stays allocated but can never be reached or freed", "A dangling pointer", "Nothing; the heap clears itself each line"],
            answer: 1,
          },
          explanation: "That's a **memory leak**. The heap block is still marked in use, but no pointer reaches it, so it can never be freed. Leak enough and a long-running program slowly eats all available memory.",
        },
        {
          kind: "question",
          title: "Use-after-free",
          body: "In the trace, after `free(a)` the variable `a` still holds `0x5000`. What's wrong with doing `a[0] = 99` on the next line?",
          question: {
            type: "choice",
            options: [
              "Nothing, the block is still yours",
              "`a` is NULL now",
              "The block was returned to the heap, so writing through `a` is use-after-free: undefined behaviour",
              "It only fails if the block was the last one allocated",
            ],
            answer: 2,
          },
          explanation: "`free` gives the block back to the heap; `a` becomes a **dangling pointer**. Writing through it is **use-after-free**: the heap may have handed those bytes to something else. A common habit is to set `a = NULL` right after `free` so a later misuse fails loudly instead of silently corrupting memory.",
        },
        {
          kind: "recap",
          points: [
            "Stack frames hold a call's locals and are popped on return; those variables then cease to exist.",
            "Returning the address of a local gives a **dangling pointer** into dead stack memory.",
            "`malloc` borrows heap memory that outlives calls; `free` returns it.",
            "Losing the last pointer to a live block is a **memory leak**; using a block after `free` is **use-after-free**.",
            "Every `malloc` needs exactly one matching `free`.",
          ],
        },
      ],
    },

    // ── Lesson 7 ──
    {
      id: "fnd-c-7-wrong",
      title: "When it goes wrong",
      summary: "Segfaults, buffer overflows and undefined behaviour: why C's speed comes with sharp edges.",
      minutes: 9,
      xp: 70,
      steps: [
        {
          kind: "explain",
          title: "C trusts you completely",
          body: "C's power is that it does exactly what you say, with no safety net. The cost is that a mistake isn't caught politely; it corrupts memory or crashes. Three failures account for most C bugs: **invalid memory access**, **buffer overflows**, and **undefined behaviour**. Knowing their shapes is the first defence.",
        },
        {
          kind: "explain",
          title: "Segmentation fault",
          body: "Your program is allowed to touch only the memory the operating system gave it. Reach outside that, and the hardware traps it and the OS kills the program with a **segmentation fault** ('segfault').\n\nThe usual causes: dereferencing a `NULL` pointer, following a dangling pointer, or running far off the end of an array. A segfault is actually the *lucky* outcome, because at least it stops immediately instead of quietly corrupting data.",
        },
        {
          kind: "question",
          title: "Which one segfaults?",
          body: "Which of these is most likely to crash with a segmentation fault?",
          question: {
            type: "choice",
            options: ["`int x = 5; int *p = &x; *p = 6;`", "`int *p = NULL; *p = 6;`", "`int a[3]; a[2] = 9;`", "`char c = 'A'; c = c + 1;`"],
            answer: 1,
          },
          explanation: "`*p = 6` when `p` is `NULL` writes to address 0, which no program owns, so the OS kills it. The others are all in-bounds, valid accesses. (`a[2]` is the last valid index of `a[3]`.)",
        },
        {
          kind: "explain",
          title: "Buffer overflow",
          body: "A **buffer overflow** is writing more into an array than it can hold, so the extra bytes spill into whatever sits next in memory. We saw this with arrays; it matters most with input.\n\n`strcpy(dst, src)` copies bytes until the source's `'\\0'`, with no idea how big `dst` is. If `src` is longer than `dst`, it writes straight past the end. Type a long name below and watch it overwrite the variable next door.",
          widget: { type: "cmem-overflow", props: { size: 8, name: "name", neighbour: "is_admin" } },
        },
        {
          kind: "question",
          title: "Overflow into a neighbour",
          body: "`char name[8]` sits right before `int is_admin = 0`. Type enough characters that the copy overflows `name` and changes `is_admin` away from 0.",
          widget: { type: "cmem-overflow", props: { size: 8, name: "name", neighbour: "is_admin" }, live: true },
          question: { type: "widget", hint: "The array holds 8 bytes. Type more characters than that.", goal: { overflowed: true, changed: true }, prompt: "Overwrite is_admin" },
          explanation: "Once the input is longer than 7 characters (plus its `'\\0'`), the copy runs past `name` and writes into `is_admin`'s bytes. A flag meant to be 0 is now non-zero. This is exactly how overflow bugs become security holes: input chosen by an attacker rewrites data, or even the return address, to seize control. Bounds and length-limited copies are the defence.",
        },
        {
          kind: "question",
          title: "The safe fix",
          body: "Which change stops the overflow regardless of how long the input is?",
          question: {
            type: "choice",
            options: [
              "Make `name` a little bigger, say `char name[16]`",
              "Use a length-limited copy that never writes more than `name` can hold (e.g. `snprintf(name, sizeof name, ...)`)",
              "Put `is_admin` before `name` instead",
              "Set `is_admin = 0` again after the copy",
            ],
            answer: 1,
          },
          explanation: "Only a **bounded copy** is a real fix: it refuses to write more than the buffer's size, so any input is truncated instead of spilling. A bigger buffer just needs a longer input to overflow; reordering variables moves the damage; resetting the flag ignores that the return address and other data are also at risk.",
        },
        {
          kind: "explain",
          title: "Undefined behaviour",
          body: "Some mistakes aren't guaranteed to crash *or* work. The C standard calls them **undefined behaviour** (UB): reading uninitialised memory, signed integer overflow, using a freed pointer, going out of bounds. The compiler is allowed to assume you never do these, so the result can be anything, and it can differ between compilers, optimisation levels, even runs.\n\nThe trap: UB often *seems* to work in testing, then breaks in production. 'It ran fine on my machine' is not evidence that code is correct.",
        },
        {
          kind: "question",
          title: "Why UB is so dangerous",
          body: "A program reads an uninitialised `int` and it happens to print `0` every time you test it. Why is relying on that risky?",
          question: {
            type: "choice",
            options: [
              "Uninitialised ints are always 0, so it's fine",
              "It's undefined behaviour: the value isn't guaranteed, and may change with a different compiler, build or run",
              "It will definitely crash on the next run",
              "Printing always resets memory to 0",
            ],
            answer: 1,
          },
          explanation: "An uninitialised variable holds whatever bytes were already there. Getting `0` is luck, not a rule. Because it's **undefined behaviour**, a new compiler, optimisation flag or unrelated code change can make it something else, turning a hidden bug into a sudden failure. Always initialise before you read.",
        },
        {
          kind: "recap",
          points: [
            "C has no safety net: mistakes corrupt memory or crash rather than being caught.",
            "A **segmentation fault** is the OS stopping you from touching memory you don't own (NULL, dangling, far out of bounds).",
            "A **buffer overflow** writes past an array into its neighbours; with attacker-chosen input it's a security hole. Bounded copies fix it.",
            "**Undefined behaviour** (uninitialised reads, overflow, use-after-free) may appear to work, then break anywhere.",
            "Safer languages exist because these edges are so easy to hit; in C, discipline and tools are your defence.",
          ],
        },
      ],
    },

    // ── Lesson 8 ──
    {
      id: "fnd-c-8-compile",
      title: "From source to program",
      summary: "Preprocess, compile, assemble, link: how one .c file becomes a runnable executable.",
      minutes: 8,
      xp: 65,
      steps: [
        {
          kind: "explain",
          title: "Readable text becomes machine code",
          body: "Your `.c` file is text the CPU can't run. Turning it into an executable is a **pipeline** of four tools, each handing its output to the next:\n\n**source → preprocessor → compiler → assembler → linker → executable**\n\nOne command, `gcc hello.c -o hello`, runs them all for you. Open each stage below to see what it produces.",
          widget: { type: "cmem-pipeline", props: { variant: "ok", mode: "explore" } },
        },
        {
          kind: "question",
          title: "What the preprocessor does",
          body: "Lines starting with `#`, like `#include <stdio.h>` and `#define TIMES 3`, are handled first, before any real compiling. What does the **preprocessor** do with them?",
          question: {
            type: "choice",
            options: [
              "Runs the program",
              "Pastes in the included files and replaces each macro with its text, producing more C",
              "Turns the code into machine instructions",
              "Checks for spelling mistakes in variable names",
            ],
            answer: 1,
          },
          explanation: "The preprocessor is text substitution: it pastes the contents of headers like `stdio.h` where you `#include` them, replaces macros (`TIMES` → `3`), and strips comments. Its output is still C, just expanded, which the compiler then handles.",
        },
        {
          kind: "question",
          title: "Headers vs libraries",
          body: "`#include <stdio.h>` lets you *call* `printf`, but the actual machine code for `printf` lives in the C standard library. Which stage joins your program to that library code?",
          question: { type: "choice", options: ["The preprocessor", "The compiler", "The assembler", "The linker"], answer: 3 },
          explanation: "The **header** only declares what `printf` looks like, so the compiler can check your call. The real code lives in a precompiled library, and the **linker** is the stage that joins your object file to it and fills in `printf`'s address. Header = promise, library = the actual code.",
        },
        {
          kind: "explain",
          title: "Errors come from different stages",
          body: "When a build fails, the stage that complains tells you what kind of mistake it is:\n\n- A **missing header** (`#include <stdoi.h>`) stops the **preprocessor**.\n- A **syntax error** (a missing semicolon) stops the **compiler**.\n- A function you *declared* but never *defined* builds fine until the **linker** can't find its code.\n\nRead the error, tap the stage that reported it.",
          widget: { type: "cmem-pipeline", props: { variant: "syntax", mode: "pick" } },
        },
        {
          kind: "question",
          title: "'undefined reference'",
          body: "You call `square(7)` and declared `int square(int n);` but never wrote the function's body. The build fails with `undefined reference to 'square'`. Which stage reported it?",
          widget: { type: "cmem-pipeline", props: { variant: "link", mode: "pick" } },
          question: { type: "widget", hint: "Which stage joins the separately compiled pieces together and looks for each function's body?", goal: { stage: "link" }, prompt: "Pick the stage" },
          explanation: "The compiler was happy: the declaration promised `square` exists elsewhere. Only the **linker**, trying to join everything into one executable, discovers there's no actual code for `square`. 'undefined reference' almost always means a definition is missing or a library wasn't linked.",
        },
        {
          kind: "question",
          title: "Order the pipeline",
          body: "Put the build stages in the order a `.c` file passes through them.",
          question: { type: "order", items: ["Preprocessor expands #includes and macros", "Compiler translates C to assembly", "Assembler makes machine-code object files", "Linker joins objects and libraries into an executable"] },
          explanation: "Preprocess (expand text) → compile (C to assembly) → assemble (assembly to object code) → link (combine into one executable). Each stage's output is the next stage's input, and a failure at any stage stops the rest.",
        },
        {
          kind: "recap",
          points: [
            "Building C runs a pipeline: preprocess → compile → assemble → link → executable.",
            "The **preprocessor** expands `#include` and `#define` into more C.",
            "The **compiler** turns C into assembly and catches syntax and type errors; the **assembler** makes object files of machine code.",
            "A **header** declares what exists; the **linker** joins your object files to the library code that actually defines it.",
            "Which stage fails tells you the kind of error: missing header, syntax, or 'undefined reference'.",
          ],
        },
      ],
    },
  ],
};
