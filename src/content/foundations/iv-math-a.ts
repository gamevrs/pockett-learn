import type { ConceptLesson } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";
/** Fenced plain-text block (diagrams, tables). */
const txt = (code: string) => "~~~text\n" + code.replace(/^\n+|\s+$/g, "") + "\n~~~";

// ── shared widget data ──
const REVERSE_CODE = ["n, rev = 4071, 0", "while n > 0:", "    digit = n % 10", "    rev = rev * 10 + digit", "    n = n // 10", "return rev"];
const POWER_CODE = ["result, b, e = 1, 3, 13", "while e > 0:", "    if e % 2 == 1:", "        result = result * b", "    b = b * b", "    e = e // 2"];
const POPCOUNT_CODE = ["count = 0", "while x:", "    x = x & (x - 1)", "    count += 1"];
const SIEVE_CODE = [
  "is_prime = [True] * (n + 1)",
  "is_prime[0] = is_prime[1] = False",
  "p = 2",
  "while p * p <= n:",
  "    if is_prime[p]:",
  "        for m in range(p * p, n + 1, p):",
  "            is_prime[m] = False",
  "    p += 1",
];
const SIEVE_GRID = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15],
  [16, 17, 18, 19, 20],
];
/** Grid cell of the number k in SIEVE_GRID. */
const at = (k: number) => ({ r: Math.floor((k - 1) / 5), c: (k - 1) % 5 });
const tone = (ks: number[], t: "active" | "done" | "path" | "wall") => ks.map((k) => ({ ...at(k), tone: t }));
const EVENS = [4, 6, 8, 10, 12, 14, 16, 18, 20];
const PATHS_CODE = ["ways[0][c] = 1 for every c   # top row", "ways[r][0] = 1 for every r   # left column", "ways[r][c] = ways[r-1][c] + ways[r][c-1]"];
const FENCE = {
  nodes: [
    { id: "A", x: 15, y: 86 },
    { id: "B", x: 75, y: 86 },
    { id: "C", x: 85, y: 30 },
    { id: "D", x: 45, y: 58 },
    { id: "E", x: 15, y: 16 },
  ],
  edges: [
    ["A", "B"],
    ["B", "C"],
    ["C", "D"],
    ["D", "E"],
    ["E", "A"],
  ] as [string, string][],
  directed: true,
};
const CROSS_CODE = ["def cross(a, b, c):", "    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)", "# > 0: left turn   < 0: right turn   0: straight"];

export const mathLessonsA: ConceptLesson[] = [
  // ─────────────────────────────── 1. Math ───────────────────────────────
  {
    id: "fnd-iv-math-1-math",
    title: "Arithmetic tricks: digits and fast powers",
    summary: "Peel digits with % and //, mind negatives and overflow, and raise to huge powers in O(log n).",
    minutes: 10,
    xp: 60,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "Numbers as data",
        body:
          "Problems tagged **Math** usually want you to treat a number as data: take it apart, rebuild it, or compute with it without a library doing the work. Two tools cover most of them:\n\n" +
          "- `n % 10` is the **last digit** of n, and `n // 10` **drops** that digit. Loop until n is 0 and you have visited every digit, right to left. That is O(number of digits), which is O(log n).\n" +
          "- **Square-and-multiply** raises a number to a huge power in O(log n) multiplications instead of n.\n\n" +
          "Two traps to know:\n\n" +
          "- In Python, `//` rounds **down**, so `-7 // 2` is `-4` and `-7 % 2` is `1`. Work on `abs(n)` and put the sign back at the end.\n" +
          "- Java, C++ and Go have fixed-size integers: a 32-bit `int` stops at 2,147,483,647 and silently wraps round after that. Python's integers never overflow, but an interviewer may still ask what you would check in another language.\n\n" +
          "**How to spot it:** \"without converting to a string\", \"reverse the digits\", \"sum of digits\", \"without using pow\", \"return the answer modulo 1,000,000,007\".",
      },
      {
        kind: "question",
        title: "Peel the digits",
        body: "Step through reversing 4071. At each stop, tap the digit that comes off next.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Reverse the digits of 4071",
            frames: [
              { array: [4, 0, 7, 1], code: REVERSE_CODE, line: 1, vars: { n: 4071, digit: null, rev: 0 }, note: "Start with `n = 4071` and an empty result, `rev = 0`." },
              { line: 3, note: "`n % 10` is the remainder after dividing by 10.", pick: { prompt: "Which digit does `n % 10` peel off first?", answer: 3 } },
              { highlight: [3], done: [3], line: 5, vars: { n: 407, digit: 1, rev: 1 }, note: "`digit = 1`, `rev = 0 * 10 + 1 = 1`, and `n // 10` drops the digit: `n = 407`." },
              { done: [3], line: 3, note: "Now `n = 407`.", pick: { prompt: "Which digit comes off next?", answer: 2 } },
              { highlight: [2], done: [3, 2], line: 5, vars: { n: 40, digit: 7, rev: 17 }, note: "`rev = 1 * 10 + 7 = 17`, `n = 40`." },
              { highlight: [1], done: [3, 2, 1], line: 5, vars: { n: 4, digit: 0, rev: 170 }, note: "The 0 still counts: multiplying by 10 shifts it in. `rev = 170`, `n = 4`." },
              { highlight: [0], done: [3, 2, 1, 0], line: 6, vars: { n: 0, digit: 4, rev: 1704 }, note: "`n` reached 0, so the loop stops: **1704**. Four digits, four passes." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Dividing by 10 leaves the last digit as the remainder, so digits come off from the right." },
        explanation: "`% 10` reads the last digit and `// 10` throws it away, so the loop walks the digits right to left. Building `rev = rev * 10 + digit` pushes the earlier digits one place left each time, which reverses the order.",
      },
      {
        kind: "explain",
        title: "Square and multiply",
        body:
          "To compute b^e, write e in binary. 13 is `1101`, so 3¹³ = 3⁸ · 3⁴ · 3¹. Keep squaring b (3, 3², 3⁴, 3⁸ …) and multiply it into the result only where e has a 1 bit. Each pass halves e, so the loop runs once per binary digit: **O(log e)**.\n\n" +
          "With a modulus you take `% m` after every multiplication, so the numbers never grow past m². Step through it:",
        widget: {
          type: "iv-trace",
          props: {
            title: "3¹³ by squaring",
            frames: [
              { array: [1, 1, 0, 1], code: POWER_CODE, line: 1, vars: { e: 13, b: 3, result: 1 }, note: "13 is `1101` in binary: 8 + 4 + 1. The arrow will walk the bits from the right." },
              { array: [1, 1, 0, 1], pointers: { bit: 3 }, highlight: [3], line: 4, vars: { e: 13, b: 3, result: 3 }, note: "The lowest bit is 1 (13 is odd), so multiply: `result = 3`, that is 3¹." },
              { pointers: { bit: 3 }, done: [3], line: 6, vars: { e: 6, b: 9, result: 3 }, note: "Square `b` to 9 (3²) and halve `e`: `13 // 2 = 6`." },
              { pointers: { bit: 2 }, highlight: [2], done: [3], line: 3, note: "This bit is 0 (6 is even): no multiply." },
              { pointers: { bit: 2 }, done: [3, 2], line: 6, vars: { e: 3, b: 81, result: 3 }, note: "`b = 81` (3⁴), `e = 3`." },
              { pointers: { bit: 1 }, highlight: [1], done: [3, 2], line: 4, vars: { e: 3, b: 81, result: 243 }, note: "Bit 1: `result = 3 · 81 = 243`, that is 3⁵." },
              { pointers: { bit: 1 }, done: [3, 2, 1], line: 6, vars: { e: 1, b: 6561, result: 243 }, note: "`b = 6561` (3⁸), `e = 1`." },
              { pointers: { bit: 0 }, highlight: [0], done: [3, 2, 1], line: 4, vars: { e: 1, b: 6561, result: 1594323 }, note: "Last bit: `result = 243 · 6561 = 1594323`, which is 3¹³." },
              { done: [3, 2, 1, 0], line: 2, vars: { e: 0, b: 43046721, result: 1594323 }, note: "`e` is 0: done in **4 passes** instead of 12 multiplications." },
            ],
          },
        },
      },
      {
        kind: "question",
        title: "A million",
        body: "Square-and-multiply makes one pass per binary digit of the exponent. How many passes does the loop make for **e = 1,000,000**?",
        question: { type: "number", answer: 20, unit: "passes", hint: "Find the power of two just above a million: 2¹⁰ is about a thousand, so 2²⁰ is about a million." },
        explanation: "2¹⁹ = 524,288 ≤ 1,000,000 < 2²⁰ = 1,048,576, so a million has **20** binary digits and the loop runs 20 times. A plain loop would multiply a million times.",
      },
      {
        kind: "question",
        title: "Rounding down",
        body: "What does Python print for `-7 // 2`?",
        question: {
          type: "choice",
          options: ["`-3`", "`-4`", "`-3.5`", "`3`"],
          answer: 1,
          feedback: { 0: "That is what C and Java give: they round towards zero. Python rounds down.", 2: "`//` is integer division; `/` would give -3.5." },
          hint: "Python's // rounds towards minus infinity, not towards zero.",
        },
        explanation: "Python's `//` rounds **down**, to -4, and `%` follows so that `(-7 // 2) * 2 + (-7 % 2) == -7`, giving `-7 % 2 == 1`. That is why a digit loop on a negative number never reaches 0: `-1 // 10` is `-1`. Take `abs(n)` first.",
      },
      {
        kind: "question",
        title: "Where it overflows",
        body: "In Java, an `int` holds at most 2,147,483,647. A function reverses the digits of an `int`. Which input gives a reversed value too big for an `int`?",
        question: {
          type: "choice",
          options: ["1,234,567,891", "1,463,847,412", "1,000,000,000", "1,000,000,009"],
          answer: 3,
          feedback: {
            0: "Reversed it is 1,987,654,321, which still fits.",
            1: "Reversed it is 2,147,483,641, just under the limit.",
            2: "Reversed it is 1 (the zeros vanish).",
          },
          hint: "Reverse each one and compare the result with 2,147,483,647.",
        },
        explanation: "1,000,000,009 reversed is 9,000,000,001: far past the limit. In Python the number just grows; in Java a careful solution checks `rev > (MAX - digit) / 10` before every `rev * 10 + digit` step.",
      },
      {
        kind: "code",
        title: "Reverse a number",
        body: "A delivery app prints parcel numbers backwards on the label. Write `reverse_number(n)` using arithmetic only (no `str`). Keep the sign: `reverse_number(-345)` is `-543`, and trailing zeros vanish: `reverse_number(1200)` is `21`.",
        language: "python",
        starter: `def reverse_number(n):
    # Peel digits off the end with % 10 and // 10.
    # Work on abs(n), then put the sign back.
    rev = 0
    return rev
`,
        solution: `def reverse_number(n):
    sign = -1 if n < 0 else 1
    n = abs(n)
    rev = 0
    while n > 0:
        rev = rev * 10 + n % 10
        n //= 10
    return sign * rev
`,
        tests: [
          { id: "t1", description: "reverse_number(1234) is 4321", assertionCode: `_r = reverse_number(1234)\nassert _r == 4321, f"reverse_number(1234) should be 4321, got {_r}"` },
          { id: "t2", description: "trailing zeros vanish", assertionCode: `_r = reverse_number(1200)\nassert _r == 21, f"reverse_number(1200) should be 21 (0021 is just 21), got {_r}"` },
          { id: "t3", description: "keeps the sign", assertionCode: `_r = reverse_number(-345)\nassert _r == -543, f"reverse_number(-345) should be -543, got {_r}: reverse abs(n), then put the minus back"` },
          { id: "t4", description: "single digits and zero", assertionCode: `assert reverse_number(7) == 7, f"reverse_number(7) should be 7, got {reverse_number(7)}"\nassert reverse_number(0) == 0, f"reverse_number(0) should be 0, got {reverse_number(0)}"` },
        ],
        hints: ["`n % 10` is the last digit; `rev = rev * 10 + digit` appends it to the result.", "Save the sign first (`-1` or `1`), loop on `abs(n)`, and multiply the sign back at the end."],
      },
      {
        kind: "code",
        title: "Power with a modulus",
        body: "A lock's code is `base ** exp % m`, with an exponent as big as 10¹⁸. Write `power_mod(base, exp, m)` with square-and-multiply, taking `% m` after every multiplication. Don't call `pow` (a check hides it), and remember that everything modulo 1 is 0.",
        language: "python",
        starter: `def power_mod(base, exp, m):
    # Look at exp one bit at a time:
    # multiply when the bit is 1, square base every pass, halve exp.
    result = 1
    return result
`,
        solution: `def power_mod(base, exp, m):
    result = 1 % m
    base %= m
    while exp > 0:
        if exp % 2 == 1:
            result = result * base % m
        base = base * base % m
        exp //= 2
    return result
`,
        tests: [
          { id: "t1", description: "power_mod(3, 13, 1000) is 323", assertionCode: `_r = power_mod(3, 13, 1000)\nassert _r == 323, f"3**13 = 1594323, so power_mod(3, 13, 1000) should be 323, got {_r}"` },
          { id: "t2", description: "power_mod(2, 10, 1000) is 24", assertionCode: `_r = power_mod(2, 10, 1000)\nassert _r == 24, f"2**10 = 1024, so the answer is 24, got {_r}"` },
          { id: "t3", description: "exponent 0 and modulus 1", assertionCode: `_r = power_mod(5, 0, 7)\nassert _r == 1, f"anything to the power 0 is 1, got {_r}"\n_r = power_mod(5, 0, 1)\nassert _r == 0, f"everything modulo 1 is 0, so power_mod(5, 0, 1) should be 0, got {_r}: start from 1 % m"` },
          {
            id: "t4",
            description: "a huge exponent, without pow",
            assertionCode: `import builtins
_real_pow = builtins.pow
_want = _real_pow(7, 10**18, 1_000_000_007)
def _no_pow(*args):
    raise AssertionError("Write the squaring loop yourself instead of calling pow")
builtins.pow = _no_pow
try:
    _r = power_mod(7, 10**18, 1_000_000_007)
finally:
    builtins.pow = _real_pow
assert _r == _want, f"power_mod(7, 10**18, 1_000_000_007) should be {_want}, got {_r}"`,
          },
        ],
        hints: ["Inside the loop: if `exp` is odd, `result = result * base % m`; then `base = base * base % m` and `exp //= 2`.", "Start from `result = 1 % m` so that a modulus of 1 gives 0."],
      },
      {
        kind: "recap",
        points: [
          "`n % 10` reads the last digit and `n // 10` drops it: a digit loop is O(log n).",
          "Python's `//` rounds down (`-7 // 2 == -4`): loop on `abs(n)` and restore the sign.",
          "Fixed-size integers overflow: check before `rev * 10 + digit` in Java or C++.",
          "**Square-and-multiply** computes b^e in O(log e): square every pass, multiply on 1 bits, `% m` after each step.",
          "Spot it: \"without str\", \"reverse the digits\", \"without pow\", \"modulo 1,000,000,007\".",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Bit manipulation ───────────────────────────────
  {
    id: "fnd-iv-math-2-bits",
    title: "Bit manipulation",
    summary: "AND, OR, XOR and shifts; clearing the lowest bit, XOR pairs away, and bit counts by DP.",
    minutes: 10,
    xp: 60,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "The operators",
        body:
          "Every integer is a row of bits, and **bit manipulation** works on all of them at once in O(1). With 12 = `1100` and 10 = `1010`:\n\n" +
          txt(`
12 & 10  = 8     1000   AND: 1 where both are 1
12 | 10  = 14    1110   OR: 1 where either is 1
12 ^ 10  = 6     0110   XOR: 1 where they differ
~12      = -13          NOT: flips every bit (always -x - 1)
3 << 2   = 12    1100   shift left k = multiply by 2^k
13 >> 1  = 6     0110   shift right k = floor-divide by 2^k
`) +
          "\n\nThe tricks interviews lean on:\n\n" +
          "- `x & 1` is 1 for odd x. `x >> k & 1` reads bit k; `x | 1 << k` sets it, `x & ~(1 << k)` clears it, `x ^ 1 << k` flips it.\n" +
          "- `x & (x - 1)` **clears the lowest 1 bit**. So `x > 0 and x & (x - 1) == 0` means x is a power of two.\n" +
          "- `x & -x` keeps **only** the lowest 1 bit.\n" +
          "- `a ^ a == 0` and `a ^ 0 == a`, and XOR doesn't care about order: XOR a list together and every pair cancels.\n\n" +
          "Python integers have no fixed width (a negative number behaves as if it had endless leading 1s), so for 32-bit puzzles mask with `& 0xFFFFFFFF`.\n\n" +
          "**How to spot it:** \"O(1) extra space\", \"every element appears twice except one\", \"power of two\", \"number of 1 bits\", \"without + or *\", subsets of a small set.",
      },
      {
        kind: "question",
        title: "Count the ones",
        body: "`x & (x - 1)` removes the lowest 1 bit, so counting how many times you can do it counts the 1s. Step through it for x = 44 and tap the bit that gets cleared each time.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Counting the 1 bits of 44",
            frames: [
              { array: [1, 0, 1, 1, 0, 0], code: POPCOUNT_CODE, line: 1, vars: { x: 44, binary: "101100", count: 0 }, note: "44 is `101100` (bit 5 on the left, bit 0 on the right)." },
              { line: 3, vars: { x: 44, "x - 1": "101011", count: 0 }, note: "Subtracting 1 turns the lowest 1 into 0 and the 0s below it into 1s.", pick: { prompt: "Which bit does `x & (x - 1)` clear?", answer: 3 } },
              { array: [1, 0, 1, 0, 0, 0], highlight: [3], line: 4, vars: { x: 40, binary: "101000", count: 1 }, note: "`101100 & 101011 = 101000`, which is 40. One 1 gone." },
              { line: 3, vars: { x: 40, "x - 1": "100111", count: 1 }, note: "Again with x = 40.", pick: { prompt: "Which bit goes this time?", answer: 2 } },
              { array: [1, 0, 0, 0, 0, 0], highlight: [2], line: 4, vars: { x: 32, binary: "100000", count: 2 }, note: "`101000 & 100111 = 100000`: x = 32." },
              { array: [0, 0, 0, 0, 0, 0], highlight: [0], line: 2, vars: { x: 0, binary: "0", count: 3 }, note: "`100000 & 011111 = 0`, so the loop stops: **3** ones in 3 passes, however many 0s sit between them." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Look at the rightmost 1 in the row: x - 1 borrows from it." },
        explanation: "This is **Kernighan's trick**: each pass removes exactly one 1 bit, so the loop runs once per set bit, not once per bit position.",
      },
      {
        kind: "question",
        title: "XOR by hand",
        body: "13 is `1101` and 9 is `1001`. Find `13 ^ 9`.",
        question: { type: "number", answer: 4, hint: "XOR puts a 1 only in the positions where the two numbers differ." },
        explanation: "`1101 ^ 1001 = 0100`: they differ only in the 4s place, so the answer is **4**.",
      },
      {
        kind: "question",
        title: "The lowest bit",
        body: "40 is `101000`. What is `40 & -40`?",
        question: {
          type: "choice",
          options: ["40", "32", "8", "-40"],
          answer: 2,
          feedback: { 0: "That would be `40 & 40`. Negating flips the bits above the lowest 1.", 1: "32 is the highest 1 bit, not the lowest." },
          hint: "-x is ~x + 1: it flips every bit above the lowest 1 and keeps that 1.",
        },
        explanation: "`-40` in two's complement is `...010111 + 1 = ...011000`. ANDed with `101000`, only the lowest 1 survives: `001000` = **8**. Fenwick trees use exactly this step.",
      },
      {
        kind: "question",
        title: "Power of two?",
        body: "Which test is true exactly when the integer `x` is a power of two (1, 2, 4, 8 …)?",
        question: {
          type: "choice",
          options: ["`x & (x - 1) == 0`", "`x != 0 and x % 2 == 0`", "`x > 0 and x & 1 == 1`", "`x > 0 and x & (x - 1) == 0`"],
          answer: 3,
          feedback: { 0: "Close, but 0 passes this test too, and 0 is not a power of two.", 1: "That tests for even numbers: 6 is even but not a power of two.", 2: "That tests for positive odd numbers: 3 passes, and 2 fails." },
          hint: "A power of two has exactly one 1 bit. What does clearing it leave, and which number has no 1 bits at all?",
        },
        explanation: "A power of two has a single 1 bit, so clearing it leaves 0. Zero has no 1 bits and would pass on its own, hence the `x > 0` guard.",
      },
      {
        kind: "code",
        title: "The lonely ticket",
        body: "A cinema scans every ticket at the door and again at the exit, so each ticket number appears **twice** in the log, except one ticket whose holder is still inside. Write `lonely_ticket(log)` that returns it, in one pass and O(1) extra memory (no set, no dict).",
        language: "python",
        starter: `def lonely_ticket(log):
    # XOR cancels pairs: a ^ a == 0 and a ^ 0 == a.
    pass
`,
        solution: `def lonely_ticket(log):
    acc = 0
    for t in log:
        acc ^= t
    return acc
`,
        tests: [
          { id: "t1", description: "finds the unpaired ticket", assertionCode: `_r = lonely_ticket([4, 1, 2, 1, 2])\nassert _r == 4, f"lonely_ticket([4, 1, 2, 1, 2]) should be 4, got {_r}"` },
          { id: "t2", description: "a log with one entry", assertionCode: `_r = lonely_ticket([7])\nassert _r == 7, f"lonely_ticket([7]) should be 7, got {_r}"` },
          { id: "t3", description: "negative and zero ticket numbers", assertionCode: `_r = lonely_ticket([-3, 0, 5, -3, 5])\nassert _r == 0, f"lonely_ticket([-3, 0, 5, -3, 5]) should be 0, got {_r}"\n_r = lonely_ticket([-3, 5, -3])\nassert _r == 5, f"lonely_ticket([-3, 5, -3]) should be 5, got {_r}"` },
          { id: "t4", description: "a long log", assertionCode: `_log = list(range(1, 100001)) * 2 + [123456]\n_r = lonely_ticket(_log)\nassert _r == 123456, f"expected 123456, got {_r}"` },
        ],
        hints: ["Start with `acc = 0` and XOR every ticket into it. Each pair cancels to 0, wherever its two halves are."],
      },
      {
        kind: "code",
        title: "Bit counts for a whole range",
        body: "A lamp panel shows the number i in binary, one lamp per bit. Write `lamps_lit(n)` returning a list whose entry i is the number of lit lamps (1 bits) for i = 0 … n. Use the bits you already counted: `i >> 1` is i without its last bit, which you have already worked out, and `i & 1` is that last bit.",
        language: "python",
        starter: `def lamps_lit(n):
    # out[i] = number of 1 bits in i, for i in 0..n
    out = []
    return out
`,
        solution: `def lamps_lit(n):
    out = [0] * (n + 1)
    for i in range(1, n + 1):
        out[i] = out[i >> 1] + (i & 1)
    return out
`,
        tests: [
          { id: "t1", description: "n = 0", assertionCode: `_r = lamps_lit(0)\nassert _r == [0], f"lamps_lit(0) should be [0], got {_r}"` },
          { id: "t2", description: "n = 5", assertionCode: `_r = lamps_lit(5)\nassert _r == [0, 1, 1, 2, 1, 2], f"lamps_lit(5) should be [0, 1, 1, 2, 1, 2], got {_r}"` },
          { id: "t3", description: "powers of two light one lamp", assertionCode: `_r = lamps_lit(16)\nassert isinstance(_r, list) and len(_r) == 17, f"lamps_lit(16) should have 17 entries, got {_r}"\nassert _r[16] == 1 and _r[15] == 4, f"16 is 10000 (1 lamp) and 15 is 1111 (4 lamps); got {_r[16]} and {_r[15]}"` },
          { id: "t4", description: "a long range", assertionCode: `_r = lamps_lit(100000)\nassert isinstance(_r, list) and len(_r) == 100001, "lamps_lit(100000) should have 100001 entries"\n_bad = [i for i in range(0, 100001, 997) if _r[i] != bin(i).count("1")]\nassert not _bad, f"wrong count for i = {_bad[0]}: expected {bin(_bad[0]).count('1')}"` },
        ],
        hints: ["`out[i] = out[i >> 1] + (i & 1)`: the bits of i are the bits of i // 2 plus the last one."],
      },
      {
        kind: "recap",
        points: [
          "`&`, `|`, `^`, `~`, `<<`, `>>` work on every bit at once; `<< k` multiplies and `>> k` floor-divides by 2^k.",
          "`x & (x - 1)` clears the lowest 1 bit; `x & -x` keeps only it; `x > 0 and x & (x - 1) == 0` tests for a power of two.",
          "XOR cancels pairs, which finds the odd one out in O(1) memory.",
          "Bit counts for 0 … n come from `out[i >> 1] + (i & 1)` in O(n).",
          "Spot it: \"O(1) space\", \"appears twice except one\", \"power of two\", \"count the 1 bits\".",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Number theory ───────────────────────────────
  {
    id: "fnd-iv-math-3-number-theory",
    title: "Number theory: gcd, primes and remainders",
    summary: "Euclid's gcd, lcm, the sieve of Eratosthenes and the rules of modular arithmetic.",
    minutes: 12,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Euclid's algorithm",
        body:
          "The **greatest common divisor** gcd(a, b) is the largest number dividing both. Euclid noticed that any divisor of a and b also divides `a % b`, so `gcd(a, b) == gcd(b, a % b)`, and `gcd(a, 0) == a`. For gcd(252, 105):\n\n" +
          "| a | b | a % b |\n|---|---|---|\n| 252 | 105 | 42 |\n| 105 | 42 | 21 |\n| 42 | 21 | 0 |\n| 21 | 0 | stop: **21** |\n\n" +
          py(`
def gcd(a, b):
    while b:
        a, b = b, a % b
    return a
`) +
          "\n\nThe numbers at least halve every two steps, so it runs in **O(log min(a, b))**. The **least common multiple** follows: `lcm(a, b) = a // gcd(a, b) * b` (divide first to keep numbers small).\n\n" +
          "Remainders obey simple rules, which is why answers \"modulo 1,000,000,007\" are easy to keep small: `(a + b) % m == (a % m + b % m) % m`, and the same for `-` and `*`. Division is the exception (next lesson).\n\n" +
          "**How to spot it:** \"divides\", \"common\", \"coprime\", \"happen together again\", \"count primes below n\", \"repeats every k\", \"modulo\".",
      },
      {
        kind: "question",
        title: "The sieve of Eratosthenes",
        body: "To find every prime up to n, cross out the multiples of each prime you meet. Step through it for n = 20 and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Primes up to 20",
            frames: [
              { grid: SIEVE_GRID, cells: tone([1], "wall"), code: SIEVE_CODE, line: 2, note: "Every number starts as *maybe prime*, except 1." },
              { cells: [...tone([1], "wall"), ...tone([2], "active")], line: 6, vars: { p: 2 }, note: "p = 2 is prime. Its smaller multiples have a smaller factor, so crossing starts at p · p.", pick: { prompt: "Which number is crossed out first?", answer: "0,3" } },
              { cells: [...tone([1, ...EVENS], "wall"), ...tone([2], "active")], line: 7, vars: { p: 2 }, note: "4, 6, 8 … 20 are crossed out." },
              { cells: [...tone([1, ...EVENS], "wall"), ...tone([2], "path")], line: 8, vars: { p: "2 → ?" }, note: "Move p on until it lands on a number still standing.", pick: { prompt: "Where does p stop next?", answer: "0,2" } },
              { cells: [...tone([1, ...EVENS, 9, 15], "wall"), ...tone([2], "path"), ...tone([3], "active")], line: 7, vars: { p: 3 }, note: "Cross from 3 · 3 = 9: 9 and 15 go (12 and 18 were already gone)." },
              { cells: [...tone([1, ...EVENS, 9, 15], "wall"), ...tone([2, 3, 5, 7, 11, 13, 17, 19], "path")], line: 4, vars: { p: 5 }, note: "4 is crossed out; at p = 5, 5 · 5 = 25 > 20, so stop. What's left is prime: **2 3 5 7 11 13 17 19**." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Crossing starts at p times p, and p only stops on a number nobody crossed out." },
        explanation: "The sieve does about n · log log n work in total, nearly linear, versus about n · √n for testing every number by trial division. It stops at √n because every crossed-out number up to n has a factor no bigger than √n.",
      },
      {
        kind: "question",
        title: "Euclid by hand",
        body: "Find gcd(84, 36).",
        question: { type: "number", answer: 12, hint: "84 % 36 is 12. Keep going: replace (a, b) with (b, a % b) until b is 0." },
        explanation: "84 % 36 = 12, then 36 % 12 = 0, so gcd = **12**.",
      },
      {
        kind: "question",
        title: "Only the last digit",
        body: "Work out `(1234 × 5678) % 10` without multiplying the big numbers.",
        question: { type: "number", answer: 2, hint: "Take each number modulo 10 first, multiply those, then take modulo 10 again." },
        explanation: "`(1234 % 10) × (5678 % 10) = 4 × 8 = 32`, and `32 % 10` = **2**. The same rule keeps factorials and powers small modulo 1,000,000,007.",
      },
      {
        kind: "question",
        title: "Why stop at √n?",
        body: "The sieve's outer loop stops once `p * p > n`. Why is that safe?",
        question: {
          type: "choice",
          options: ["Primes above √n are rare enough to ignore", "Every composite ≤ n has a factor ≤ √n", "Python lists can't index past √n", "Larger p would cross out primes by mistake"],
          answer: 1,
          feedback: { 0: "They are not rare: there are plenty of primes between √n and n, and the sieve still finds all of them.", 3: "Crossing starts at p · p, so larger p would only find nothing left to cross." },
          hint: "If a number ≤ n splits as a · b with both factors above √n, how big is a · b?",
        },
        explanation: "If c = a · b with both a and b above √n, then c > n. So every composite up to n has a factor of at most √n and was crossed out by the time p passes √n.",
      },
      {
        kind: "code",
        title: "Count the primes",
        body: "Write `count_primes_below(n)`: how many primes are **strictly less** than n? Use a sieve; the last check uses n = 300,000, and trial division is too slow for it.",
        language: "python",
        starter: `def count_primes_below(n):
    # Sieve of Eratosthenes over 0 .. n - 1.
    return 0
`,
        solution: `def count_primes_below(n):
    if n < 3:
        return 0
    is_prime = [True] * n
    is_prime[0] = is_prime[1] = False
    p = 2
    while p * p < n:
        if is_prime[p]:
            for m in range(p * p, n, p):
                is_prime[m] = False
        p += 1
    return sum(is_prime)
`,
        tests: [
          { id: "t1", description: "small n", assertionCode: `for _n, _want in [(0, 0), (1, 0), (2, 0), (3, 1)]:\n    _r = count_primes_below(_n)\n    assert _r == _want, f"count_primes_below({_n}) should be {_want}, got {_r} (2 is the smallest prime)"` },
          { id: "t2", description: "below 10 and 100", assertionCode: `_r = count_primes_below(10)\nassert _r == 4, f"2, 3, 5 and 7 are below 10, so expected 4, got {_r}"\n_r = count_primes_below(100)\nassert _r == 25, f"there are 25 primes below 100, got {_r}"` },
          { id: "t3", description: "strictly below a prime", assertionCode: `_r = count_primes_below(13)\nassert _r == 5, f"below 13 are 2 3 5 7 11 (13 itself doesn't count), got {_r}"` },
          { id: "t4", description: "below 300,000, quickly", assertionCode: `_r = count_primes_below(300_000)\nassert _r == 25997, f"there are 25997 primes below 300,000, got {_r}"` },
        ],
        hints: ["Make a list of n booleans, mark 0 and 1 as not prime, and for each p with `p * p < n` cross out `p*p, p*p + p, …`.", "Count what's left with `sum(is_prime)`."],
      },
      {
        kind: "code",
        title: "Lighthouses in step",
        body: "Lighthouses flash every `periods[i]` seconds and all flash together at time 0. Write `gcd(a, b)` (Euclid) and `all_together(periods)`: the first time after 0 when they all flash at once. Multiplying the periods is not enough: 4 and 6 meet at 12, not 24.",
        language: "python",
        starter: `def gcd(a, b):
    # gcd(a, b) == gcd(b, a % b), and gcd(a, 0) == a
    return 1

def all_together(periods):
    total = 1
    for p in periods:
        total *= p
    return total
`,
        solution: `def gcd(a, b):
    while b:
        a, b = b, a % b
    return a

def all_together(periods):
    total = 1
    for p in periods:
        total = total // gcd(total, p) * p
    return total
`,
        tests: [
          { id: "t1", description: "gcd works", assertionCode: `for _a, _b, _want in [(48, 18, 6), (17, 5, 1), (7, 0, 7), (0, 9, 9)]:\n    _r = gcd(_a, _b)\n    assert _r == _want, f"gcd({_a}, {_b}) should be {_want}, got {_r}"` },
          { id: "t2", description: "4 and 6 meet at 12", assertionCode: `_r = all_together([4, 6])\nassert _r == 12, f"all_together([4, 6]) should be 12, got {_r}: the lcm, not the product"` },
          { id: "t3", description: "one lighthouse, and periods sharing factors", assertionCode: `_r = all_together([5])\nassert _r == 5, f"all_together([5]) should be 5, got {_r}"\n_r = all_together([6, 10, 15])\nassert _r == 30, f"all_together([6, 10, 15]) should be 30, got {_r}"\n_r = all_together([2, 4, 8])\nassert _r == 8, f"all_together([2, 4, 8]) should be 8, got {_r}"` },
          { id: "t4", description: "big periods", assertionCode: `_r = all_together([10**9, 10**9 + 2])\n_want = 10**9 * (10**9 + 2) // 2\nassert _r == _want, f"expected {_want}, got {_r}"` },
        ],
        hints: ["lcm(a, b) = a // gcd(a, b) * b. Fold it over the list: start at 1 and combine one period at a time."],
      },
      {
        kind: "recap",
        points: [
          "**Euclid:** `gcd(a, b) = gcd(b, a % b)`, O(log min(a, b)). `lcm(a, b) = a // gcd(a, b) * b`.",
          "The **sieve** crosses out multiples from p · p and stops at √n: about n log log n work.",
          "`+`, `-` and `*` can be reduced `% m` at every step, so the numbers stay small.",
          "Spot it: \"divides\", \"coprime\", \"together again\", \"count primes\", \"modulo\".",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Combinatorics ───────────────────────────────
  {
    id: "fnd-iv-math-4-combinatorics",
    title: "Combinatorics: counting without listing",
    summary: "Permutations, combinations, Pascal's rule, grid paths, stars and bars, and C(n, k) modulo a prime.",
    minutes: 12,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Which formula?",
        body:
          "**Combinatorics** answers \"how many ways\" without listing them. Choices made one after another **multiply** (3 shirts and 4 trousers: 12 outfits); separate cases **add**. Most questions are one of these:\n\n" +
          "| Situation | Count | Example |\n|---|---|---|\n" +
          "| Order matters, no repeats | n! / (n − k)! | Gold, silver, bronze from 8 runners: 8 · 7 · 6 = 336 |\n" +
          "| Order doesn't matter | C(n, k) = n! / (k! (n − k)!) | 3 toppings from 7: 35 |\n" +
          "| Repeats allowed, order matters | n^k | 4-digit PIN: 10⁴ |\n" +
          "| Arrange with repeated letters | n! / (a! b! …) | Letters of BOOK: 4! / 2! = 12 |\n" +
          "| Identical items into k groups | C(n + k − 1, k − 1) | 10 sweets among 3 kids: 66 |\n\n" +
          "The last row is **stars and bars**: line up 10 stars and 2 bars; the bars split the stars into 3 groups, so you choose 2 bar positions out of 12.\n\n" +
          "**Pascal's rule** `C(n, k) = C(n − 1, k − 1) + C(n − 1, k)` (either item n is chosen or it isn't) builds a table of counts by addition, with no division at all.\n\n" +
          "**How to spot it:** \"how many ways\", \"number of distinct arrangements\", \"paths from top-left to bottom-right\", huge answers \"modulo 1,000,000,007\".",
      },
      {
        kind: "question",
        title: "Paths across a grid",
        body: "A robot walks from the top-left square to the bottom-right, moving only right or down. Each square holds the number of ways to reach it: the square above plus the square to the left. Fill the grid in and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Ways to reach each square",
            frames: [
              {
                grid: [
                  [1, 1, 1, 1],
                  [1, "?", "?", "?"],
                  [1, "?", "?", "?"],
                  [1, "?", "?", "?"],
                ],
                cells: [{ r: 0, c: 0, tone: "active" }],
                code: PATHS_CODE,
                line: 1,
                note: "The top row and the left column can each be reached in only **one** way: a straight line.",
              },
              {
                grid: [
                  [1, 1, 1, 1],
                  [1, 2, 3, 4],
                  [1, "?", "?", "?"],
                  [1, "?", "?", "?"],
                ],
                cells: [
                  { r: 1, c: 1, tone: "active" },
                  { r: 1, c: 2, tone: "active" },
                  { r: 1, c: 3, tone: "active" },
                ],
                line: 3,
                note: "Row 1: `1 + 1 = 2`, `1 + 2 = 3`, `1 + 3 = 4`.",
              },
              { cells: [], line: 3, note: "Now row 2.", pick: { prompt: "Which square will hold 6?", answer: "2,2" } },
              {
                grid: [
                  [1, 1, 1, 1],
                  [1, 2, 3, 4],
                  [1, 3, 6, 10],
                  [1, "?", "?", "?"],
                ],
                cells: [
                  { r: 2, c: 1, tone: "active" },
                  { r: 2, c: 2, tone: "active" },
                  { r: 2, c: 3, tone: "active" },
                ],
                line: 3,
                note: "Row 2: `2 + 1 = 3`, `3 + 3 = 6`, `4 + 6 = 10`.",
              },
              { cells: [], line: 3, note: "And the last row.", pick: { prompt: "In the bottom row, which square will hold 10?", answer: "3,2" } },
              {
                grid: [
                  [1, 1, 1, 1],
                  [1, 2, 3, 4],
                  [1, 3, 6, 10],
                  [1, 4, 10, 20],
                ],
                cells: [{ r: 3, c: 3, tone: "path" }],
                line: 3,
                note: "**20** paths. Check: every path is 3 rights and 3 downs in some order, so it's C(6, 3) = 20. The grid *is* Pascal's triangle, tilted.",
              },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Each square is the one above it plus the one to its left." },
        explanation: "Adding the two neighbours is Pascal's rule. A grid of r rows and c columns has C(r + c − 2, r − 1) paths: you choose which of the r + c − 2 moves go down.",
      },
      {
        kind: "question",
        title: "Pizza toppings",
        body: "A pizza place offers 7 toppings. How many different pizzas have exactly 3 toppings?",
        question: { type: "number", answer: 35, unit: "pizzas", hint: "The order you pick toppings in doesn't matter, so this is C(7, 3)." },
        explanation: "C(7, 3) = 7 · 6 · 5 / (3 · 2 · 1) = 210 / 6 = **35**. Ordered picks would give 210; dividing by 3! removes the orderings of the same 3 toppings.",
      },
      {
        kind: "question",
        title: "Rearranging a word",
        body: "How many different strings can you make by rearranging the letters of **LEVEL**?",
        question: { type: "number", answer: 30, unit: "strings", hint: "Start from 5! and divide by the ways to shuffle the two L's and the two E's among themselves." },
        explanation: "5! / (2! · 2!) = 120 / 4 = **30**. Swapping the two L's (or the two E's) gives the same string, so each distinct string was counted 2 · 2 times.",
      },
      {
        kind: "question",
        title: "Sweets for three",
        body: "10 identical sweets go to 3 children, and a child may get none. How many ways are there to share them?",
        question: {
          type: "choice",
          options: ["120", "59,049", "30", "66"],
          answer: 3,
          feedback: { 0: "C(10, 3) counts choosing 3 sweets, but the sweets are identical; you are choosing where 2 dividers go.", 1: "3¹⁰ treats the sweets as different, but they are identical." },
          hint: "Line up 10 stars and 2 bars: each arrangement is one way to split the stars into 3 groups.",
        },
        explanation: "Stars and bars: choose which 2 of the 12 positions are bars, C(12, 2) = **66**.",
      },
      {
        kind: "question",
        title: "Dividing modulo a prime",
        body: "C(n, k) = n! / (k! (n − k)!) modulo p = 1,000,000,007 (a prime). You can keep the factorials small with `% p`, but then how do you divide?",
        question: {
          type: "choice",
          options: ["Divide the reduced numbers with `//`", "Multiply by the inverse, `pow(b, p - 2, p)`", "Divide first, then take `% p`", "Multiply by `pow(b, p - 1, p)`"],
          answer: 1,
          feedback: { 0: "After `% p` the numbers have lost the information that made the division exact.", 2: "The exact factorials have hundreds of thousands of digits: that's the slow part you wanted to avoid.", 3: "By Fermat's little theorem b^(p−1) ≡ 1, so that multiplies by 1." },
          hint: "Fermat's little theorem says b^(p−1) ≡ 1 (mod p) for a prime p. What times b gives 1, then?",
        },
        explanation: "Since b · b^(p−2) = b^(p−1) ≡ 1, the number `pow(b, p - 2, p)` is b's **modular inverse**. Multiplying by it is division modulo p. (Python 3.8+ also accepts `pow(b, -1, p)`.)",
      },
      {
        kind: "code",
        title: "C(n, k) exactly",
        body: "Write `choose(n, k)` without `math.comb` (a check hides it). Build it one factor at a time, `r = r * (n - i) // (i + 1)`, which stays an exact integer at every step. Return 0 when k > n. Floats are not exact enough: C(60, 30) has 18 digits.",
        language: "python",
        starter: `def choose(n, k):
    # Multiply in (n - i) and divide by (i + 1), for i in range(k).
    return 0
`,
        solution: `def choose(n, k):
    if k < 0 or k > n:
        return 0
    k = min(k, n - k)
    r = 1
    for i in range(k):
        r = r * (n - i) // (i + 1)
    return r
`,
        tests: [
          { id: "t1", description: "choose(5, 2) is 10", assertionCode: `_r = choose(5, 2)\nassert _r == 10, f"choose(5, 2) should be 10, got {_r}"` },
          { id: "t2", description: "the edges", assertionCode: `assert choose(6, 0) == 1, f"choose(6, 0) should be 1 (choose nothing), got {choose(6, 0)}"\nassert choose(6, 6) == 1, f"choose(6, 6) should be 1 (choose everything), got {choose(6, 6)}"\nassert choose(3, 5) == 0, f"choose(3, 5) should be 0 (you can't pick 5 from 3), got {choose(3, 5)}"` },
          {
            id: "t3",
            description: "exact for big values, without math.comb",
            assertionCode: `import math
_real = math.comb
def _no_comb(*args):
    raise AssertionError("Build choose yourself instead of calling math.comb")
math.comb = _no_comb
try:
    _r = choose(60, 30)
finally:
    math.comb = _real
assert _r == 118264581564861424, f"choose(60, 30) should be exactly 118264581564861424, got {_r}: use // not /"`,
          },
        ],
        hints: ["Start with r = 1. For i in range(k): `r = r * (n - i) // (i + 1)`. After step i, r is C(n, i + 1), so the division is always exact."],
      },
      {
        kind: "code",
        title: "Many queries modulo a prime",
        body: "A lottery app answers thousands of questions \"how many ways to pick k of n?\" modulo `MOD = 1_000_000_007`. Write `choose_many(queries)` taking a list of `(n, k)` pairs (n up to 200,000) and returning the answers in order, 0 when k > n. Precompute factorials and inverse factorials **once**, so each answer is two multiplications. The last check sends 5,000 queries.",
        language: "python",
        starter: `MOD = 1_000_000_007

def choose_many(queries):
    # 1. fact[i] = i! % MOD for i up to the largest n
    # 2. inv[i] = the inverse of fact[i], using pow(x, MOD - 2, MOD)
    # 3. C(n, k) = fact[n] * inv[k] * inv[n - k] % MOD
    return []
`,
        solution: `MOD = 1_000_000_007

def choose_many(queries):
    top = max((n for n, _ in queries), default=0)
    fact = [1] * (top + 1)
    for i in range(1, top + 1):
        fact[i] = fact[i - 1] * i % MOD
    inv = [1] * (top + 1)
    inv[top] = pow(fact[top], MOD - 2, MOD)
    for i in range(top, 0, -1):
        inv[i - 1] = inv[i] * i % MOD
    out = []
    for n, k in queries:
        if k < 0 or k > n:
            out.append(0)
        else:
            out.append(fact[n] * inv[k] % MOD * inv[n - k] % MOD)
    return out
`,
        tests: [
          { id: "t1", description: "small queries", assertionCode: `_r = choose_many([(5, 2), (7, 3), (10, 0), (4, 4)])\nassert _r == [10, 35, 1, 1], f"expected [10, 35, 1, 1], got {_r}"` },
          { id: "t2", description: "k bigger than n gives 0", assertionCode: `_r = choose_many([(3, 5), (0, 0)])\nassert _r == [0, 1], f"expected [0, 1], got {_r}"` },
          { id: "t3", description: "reduced modulo MOD", assertionCode: `import math\n_r = choose_many([(100, 50), (1000, 3)])\n_want = [math.comb(100, 50) % 1_000_000_007, math.comb(1000, 3) % 1_000_000_007]\nassert _r == _want, f"expected {_want}, got {_r}"` },
          {
            id: "t4",
            description: "5,000 queries quickly",
            assertionCode: `_qs = [(100000 + (i * 7919) % 100000, (i * 104729) % 100001) for i in range(5000)]
_r = choose_many(_qs)
assert isinstance(_r, list) and len(_r) == 5000, "return one answer per query"
assert _r[1] == 59271690, f"C(107919, 4728) % MOD should be 59271690, got {_r[1]}"
assert sum(_r) % 1_000_000_007 == 245521322, "some answers are wrong: compare a few with math.comb(n, k) % MOD"`,
          },
        ],
        hints: ["Build `fact` up to the largest n. Then `inv[top] = pow(fact[top], MOD - 2, MOD)` and walk down: `inv[i - 1] = inv[i] * i % MOD`.", "Each answer is `fact[n] * inv[k] % MOD * inv[n - k] % MOD`."],
      },
      {
        kind: "recap",
        points: [
          "Steps in sequence multiply; separate cases add.",
          "Ordered: n!/(n−k)!. Unordered: **C(n, k)**. With repeats: n^k. Repeated letters: divide by each group's factorial.",
          "**Stars and bars:** n identical items into k groups is C(n + k − 1, k − 1).",
          "**Pascal's rule** builds counts by addition; grid paths are binomial coefficients.",
          "Modulo a prime p, divide by multiplying with `pow(b, p - 2, p)`; precompute factorials for many queries.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 5. Geometry ───────────────────────────────
  {
    id: "fnd-iv-math-5-geometry",
    title: "Geometry: cross products and areas",
    summary: "Integer-only geometry: turn direction, polygon area with the shoelace formula, and points on a line.",
    minutes: 12,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Stay in integers",
        body:
          "Interview geometry is mostly about **avoiding floats**. Coordinates are integers; keep everything that way and comparisons are exact.\n\n" +
          "- Compare distances **squared**: `dx*dx + dy*dy`, no `sqrt`.\n" +
          "- The **cross product** of a → b and a → c tells you which way the path a → b → c turns:\n\n" +
          py(`
def cross(a, b, c):
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
# > 0: left turn (counter-clockwise), < 0: right turn, 0: on one line
`) +
          "\n\n- The **shoelace formula** gives a polygon's area from its corners in order: add `x_i * y_(i+1) - x_(i+1) * y_i` around the loop, take the absolute value and halve it. It works for any simple polygon, even one with a dent.\n" +
          "- Two axis-aligned rectangles overlap when their x-ranges overlap **and** their y-ranges overlap.\n" +
          "- A slope `dy/dx` is a float; store it as the pair `(dy, dx)` divided by their gcd, with a fixed sign, instead.\n\n" +
          "**How to spot it:** points, rectangles, polygons, \"on the same line\", \"clockwise\", \"convex\", \"area\", \"overlap\".",
      },
      {
        kind: "question",
        title: "Walk the fence",
        body: "A garden fence runs A → B → C → D → E → back to A. At each corner, the sign of `cross(prev, corner, next)` says whether the fence turns left or right. Step through it.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Turns around a fence",
            frames: [
              { graph: FENCE, code: CROSS_CODE, line: 1, vars: { A: "(1,1)", B: "(7,1)", C: "(8,5)", D: "(4,3)", E: "(1,6)" }, note: "Walk the corners in order. A left turn everywhere would mean a convex shape." },
              { graph: { active: ["B"], activeEdges: [["A", "B"], ["B", "C"]] }, line: 2, vars: { corner: "B", cross: 24 }, note: "At B: `(7−1)(5−1) − (1−1)(8−1) = 24`. Positive: a **left** turn." },
              { graph: { active: ["C"], done: ["B"], activeEdges: [["B", "C"], ["C", "D"]] }, line: 2, vars: { corner: "C", cross: 14 }, note: "At C: `(8−7)(3−1) − (5−1)(4−7) = 2 + 12 = 14`. Left again." },
              { graph: { done: ["B", "C"] }, line: 3, vars: {}, note: "One corner bends inwards.", pick: { prompt: "At which corner does the fence turn right?", answer: "D" } },
              { graph: { active: ["D"], done: ["B", "C"], activeEdges: [["C", "D"], ["D", "E"]] }, line: 2, vars: { corner: "D", cross: -18 }, note: "At D: `(4−8)(6−5) − (3−5)(1−8) = −4 − 14 = −18`. Negative: a **right** turn, so the garden is not convex." },
              { graph: { done: ["A", "B", "C", "D", "E"] }, line: 2, vars: { "E": "cross 15", "A": "cross 30", shoelace: 41, area: 20.5 }, note: "E and A turn left. The shoelace sum is −6 + 27 + 4 + 21 − 5 = 41, so the area is **20.5**." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "Picture walking along the fence in order: at which corner do you swing the other way?" },
        explanation: "A polygon is convex exactly when every cross product along it has the same sign. Convex-hull algorithms (Graham scan, monotone chain) are built on this one test.",
      },
      {
        kind: "question",
        title: "Read the sign",
        body: "For points a, b, c, `cross(a, b, c)` comes out as **0**. What does that tell you?",
        question: {
          type: "choice",
          options: ["a, b and c lie on one line", "The path turns left", "b is the midpoint of a and c", "The three points are all equal"],
          answer: 0,
          feedback: { 1: "Left turns give a positive value.", 2: "The midpoint gives 0, but so does any point on the line through a and c." },
          hint: "The cross product is twice the signed area of triangle abc.",
        },
        explanation: "The cross product is twice the triangle's signed area. Zero area means the triangle is flat: the points are **collinear**.",
      },
      {
        kind: "question",
        title: "A triangle's area",
        body: "Find the area of the triangle with corners (1, 1), (5, 1) and (1, 7).",
        question: { type: "number", answer: 12, hint: "It has a horizontal side and a vertical side meeting at (1, 1): half of base times height." },
        explanation: "Base 4, height 6: 4 · 6 / 2 = **12**. The cross product gives the same: `(4)(6) − (0)(0) = 24`, halved.",
      },
      {
        kind: "question",
        title: "Do they overlap?",
        body: "Rectangle P spans x from px1 to px2 and y from py1 to py2 (px1 < px2, py1 < py2); Q likewise. Which test is true exactly when they share some area?",
        question: {
          type: "choice",
          options: ["`px1 < qx1 < px2 and py1 < qy1 < py2`", "`px1 < qx2 and qx1 < px2` (x only)", "`px1 < qx2 and qx1 < px2 and py1 < qy2 and qy1 < py2`", "`px1 < qx2 or qx1 < px2 or py1 < qy2 or qy1 < py2`"],
          answer: 2,
          feedback: { 0: "That only checks whether Q's corner is inside P; Q can overlap P while its corner is outside.", 1: "Two rectangles side by side in x can still be far apart in y.", 3: "With `or`, two rectangles far apart pass as soon as any one comparison holds." },
          hint: "Two intervals overlap when each one starts before the other ends. Rectangles need that in both directions.",
        },
        explanation: "Intervals [a1, a2) and [b1, b2) overlap when `a1 < b2 and b1 < a2`. Rectangles overlap when both their x-intervals and their y-intervals do.",
      },
      {
        kind: "code",
        title: "Area of a plot",
        body: "A surveyor walks round a plot and records its corners in order (clockwise or anticlockwise). Write `polygon_area(points)` with the shoelace formula, where points is a list of `(x, y)` tuples. Return a number (an `int` or `float`); fewer than 3 points have area 0.",
        language: "python",
        starter: `def polygon_area(points):
    # Sum x_i * y_next - x_next * y_i around the loop (the last corner joins the first),
    # then take abs() and halve it.
    pass
`,
        solution: `def polygon_area(points):
    n = len(points)
    if n < 3:
        return 0
    s = 0
    for i in range(n):
        x1, y1 = points[i]
        x2, y2 = points[(i + 1) % n]
        s += x1 * y2 - x2 * y1
    return abs(s) / 2
`,
        tests: [
          { id: "t1", description: "a unit square and a right triangle", assertionCode: `_r = polygon_area([(0, 0), (1, 0), (1, 1), (0, 1)])\nassert _r == 1, f"the unit square has area 1, got {_r}"\n_r = polygon_area([(0, 0), (4, 0), (0, 3)])\nassert _r == 6, f"the 4 by 3 right triangle has area 6, got {_r}"` },
          { id: "t2", description: "a plot with a dent", assertionCode: `_r = polygon_area([(1, 1), (7, 1), (8, 5), (4, 3), (1, 6)])\nassert _r == 20.5, f"the fence from the trace has area 20.5, got {_r}"` },
          { id: "t3", description: "clockwise order still gives a positive area", assertionCode: `_r = polygon_area([(0, 1), (1, 1), (1, 0), (0, 0)])\nassert _r == 1, f"clockwise corners give a negative sum; return its absolute value. Got {_r}"` },
          { id: "t4", description: "fewer than 3 points", assertionCode: `_r = polygon_area([(2, 3), (5, 7)])\nassert _r == 0, f"two points enclose no area, got {_r}"` },
        ],
        hints: ["Use `points[(i + 1) % n]` as the next corner so the last one wraps round to the first.", "Return `abs(total) / 2`."],
      },
      {
        kind: "code",
        title: "Lamp posts in a row",
        body: "A city map lists lamp posts as distinct integer points. Write `most_in_a_row(points)`: the largest number of posts that lie on one straight line. For each post, group the others by **direction**: `(dx, dy)` divided by their gcd, with a fixed sign. Floats fail here: two directions can differ by less than a float can tell apart.",
        language: "python",
        starter: `from math import gcd

def most_in_a_row(points):
    # For each point p, count the other points by reduced direction from p.
    pass
`,
        solution: `from math import gcd

def most_in_a_row(points):
    if len(points) <= 2:
        return len(points)
    best = 0
    for i, (x1, y1) in enumerate(points):
        counts = {}
        for j in range(i + 1, len(points)):
            dx = points[j][0] - x1
            dy = points[j][1] - y1
            g = gcd(dx, dy)
            dx, dy = dx // g, dy // g
            if dx < 0 or (dx == 0 and dy < 0):
                dx, dy = -dx, -dy
            counts[(dx, dy)] = counts.get((dx, dy), 0) + 1
        if counts:
            best = max(best, max(counts.values()) + 1)
    return best
`,
        tests: [
          { id: "t1", description: "no posts, one post, two posts", assertionCode: `assert most_in_a_row([]) == 0, f"no posts: expected 0, got {most_in_a_row([])}"\nassert most_in_a_row([(1, 1)]) == 1, "one post: expected 1"\nassert most_in_a_row([(0, 0), (3, 4)]) == 2, "two posts are always on a line: expected 2"` },
          { id: "t2", description: "a diagonal with a stray post", assertionCode: `_r = most_in_a_row([(0, 0), (1, 1), (2, 2), (3, 5)])\nassert _r == 3, f"(0,0), (1,1), (2,2) are in a row: expected 3, got {_r}"` },
          { id: "t3", description: "vertical lines and opposite directions", assertionCode: `_r = most_in_a_row([(2, 0), (2, 5), (2, -3), (1, 1)])\nassert _r == 3, f"three posts at x = 2: expected 3, got {_r}"\n_r = most_in_a_row([(0, 0), (1, -2), (-1, 2), (5, 5)])\nassert _r == 3, f"(1,-2) and (-1,2) point opposite ways from (0,0) but share its line: expected 3, got {_r}. Fix the sign of (dx, dy)."` },
          { id: "t4", description: "directions too close for floats", assertionCode: `_n = 10**8\n_r = most_in_a_row([(0, 0), (_n, _n + 1), (_n + 1, _n + 2)])\nassert _r == 2, f"these three are not on one line (the cross product is -1), so expected 2, got {_r}. Compare reduced (dx, dy) pairs, not float slopes."` },
          { id: "t5", description: "a bigger map", assertionCode: `_pts = [(i, 2 * i + 1) for i in range(150)] + [(i, i * i) for i in range(3, 150)]\n_r = most_in_a_row(_pts)\nassert _r == 150, f"150 posts lie on y = 2x + 1: expected 150, got {_r}"` },
        ],
        hints: ["Divide (dx, dy) by `gcd(dx, dy)`, then make dx positive (or, when dx is 0, make dy positive), so the same line always gives the same key.", "Count keys in a dict for each starting point; the answer is the biggest count plus 1 (the starting point itself)."],
      },
      {
        kind: "recap",
        points: [
          "Keep geometry in integers: squared distances, cross products, reduced `(dx, dy)` pairs instead of slopes.",
          "`cross(a, b, c)` > 0 is a left turn, < 0 a right turn, 0 collinear. Same sign all round means convex.",
          "**Shoelace:** area = |Σ (x_i · y_(i+1) − x_(i+1) · y_i)| / 2, for any simple polygon.",
          "Rectangles overlap when their x-intervals and y-intervals both overlap.",
          "Points on a line: group by reduced direction in O(n²).",
        ],
      },
    ],
  },
];
