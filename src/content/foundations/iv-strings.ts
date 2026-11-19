import type { ConceptLesson, Module } from "../../learn/types.ts";

/** Fenced Python block for lesson prose. */
const py = (code: string) => "~~~python\n" + code.trim() + "\n~~~";
/** Fenced plain-text block (diagrams, tables). */
const txt = (code: string) => "~~~text\n" + code.replace(/^\n+|\s+$/g, "") + "\n~~~";

// ── shared trace data ──
const HASH_CODE = ["h = 0", "for ch in s:", "    h = (h * B + code(ch)) % M", "bucket = h % 5"];
const ROLL_CODE = ["h = value of the first window", "for each next digit d:", "    h = (h - old * 100) * 10 + d", "    if h == target: check the digits"];
const PI_CODE = [
  "pi = [0] * len(p); k = 0",
  "for i in range(1, len(p)):",
  "    while k > 0 and p[i] != p[k]:",
  "        k = pi[k - 1]",
  "    if p[i] == p[k]:",
  "        k += 1",
  "    pi[i] = k",
];
const SA_CODE = [
  "rank = [order of s[i]]; k = 1",
  "while ranks are not all different:",
  "    key(i) = (rank[i], rank[i + k] or -1)",
  "    sort positions by key; give new ranks",
  "    k *= 2",
];

const lessons: ConceptLesson[] = [
  // ─────────────────────────────── 1. Hash functions ───────────────────────────────
  {
    id: "fnd-iv-strings-1-hash-function",
    title: "Hash functions and canonical keys",
    summary: "What makes a good hash, the polynomial string hash, buckets and collisions, and grouping things by a key that ignores what you don't care about.",
    level: "Beginner",
    minutes: 12,
    xp: 60,
    steps: [
      {
        kind: "explain",
        title: "A fingerprint for any value",
        body: "A **hash function** turns any value (a word, a file, a tuple) into a number from a fixed range. A good one is:\n\n- **deterministic**: the same input always gives the same number;\n- **fast**: one pass over the input;\n- **well spread**: similar inputs (`cat`, `cab`) land far apart, so values fill the range evenly.\n\nIt is a fingerprint, not a name: many inputs share each number. When two different inputs get the same hash, that's a **collision**. With more possible inputs than numbers, collisions are certain (the **pigeonhole principle**), so code that uses hashes must still compare the real values when hashes match.\n\nPython's `dict` and `set` hash every key. Strings get a **random salt** each time Python starts, so `hash(\"cat\")` changes between runs: never save it to a file or send it to another program.\n\nSignal words: *group the ones that are the same, have I seen this before?, duplicates, compare big things quickly, find a repeated chunk*.",
      },
      {
        kind: "explain",
        title: "The polynomial string hash",
        body: "The standard string hash treats the text as a number written in base **B**, reduced modulo a big number **M** to keep it small:\n\n" +
          txt(`
h("cab") = (c·B² + a·B + b) mod M
`) +
          "\nYou never compute the powers. **Horner's rule** folds in one character at a time:\n\n" +
          py(`
def poly_hash(s, B=31, M=1_000_000_007):
    h = 0
    for ch in s:
        h = (h * B + ord(ch)) % M
    return h
`) +
          "\n\nEach character's position changes its weight, so `ab` and `ba` hash differently. Pick **M** prime and large (10⁹ + 7 is popular), and **B** larger than the alphabet. Taking `% M` at every step gives the same result as at the end, but keeps the numbers small.",
      },
      {
        kind: "question",
        title: "Into the buckets",
        body: "Hash a few words with a = 1, b = 2, c = 3, …, B = 31 and M = 101, then drop them into a table with 5 buckets (`h % 5`). Tap the bucket each question asks for.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Hashing into 5 buckets",
            frames: [
              { array: ["c", "a", "b"], code: HASH_CODE, line: 1, vars: { s: "cab", h: 0 }, note: "Hash `cab`, starting from h = 0." },
              { highlight: [0], line: 3, vars: { s: "cab", h: 3 }, note: "c: h = (0 × 31 + 3) % 101 = **3**." },
              { highlight: [1], line: 3, vars: { s: "cab", h: 94 }, note: "a: h = (3 × 31 + 1) % 101 = **94**." },
              { highlight: [2], line: 3, vars: { s: "cab", h: 88 }, note: "b: h = (94 × 31 + 2) % 101 = 2916 % 101 = **88**." },
              { array: [null, null, null, null, null], line: 4, vars: { s: "cab", h: 88 }, note: "Now the table: 5 empty buckets, numbered 0 to 4. A key goes in bucket `h % 5`.", pick: { prompt: "h(`cab`) = 88. Which bucket does it go in?", answer: 3 } },
              { array: [null, null, null, "cab", null], highlight: [3], line: 4, note: "88 % 5 = 3: bucket 3." },
              { vars: { s: "dog", h: 74 }, line: 4, note: "The same steps give h(`dog`) = 74.", pick: { prompt: "Which bucket does `dog` go in?", answer: 4 } },
              { array: ["cat", null, null, "cab", "dog"], highlight: [0, 4], vars: { s: "cat", h: 5 }, line: 4, note: "74 % 5 = 4. Then h(`cat`) = 5, and 5 % 5 = 0: bucket 0." },
              { array: ["cat", null, null, "cab ab", "dog"], highlight: [3], vars: { s: "ab", h: 33 }, line: 4, note: "h(`ab`) = 33, and 33 % 5 = 3: a **collision** with `cab`. The bucket keeps a short list of both keys." },
              { highlight: [3], vars: { s: "ba", h: 63 }, line: 4, note: "Look up `ba`: h = 63, bucket 3. The table compares `ba` with `cab` and `ab`: no match, so `ba` isn't there. Same bucket doesn't mean same key." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "The bucket is the remainder when you divide the hash by 5." },
        explanation: "A hash table spends one hash and a short bucket scan per lookup: O(1) on average, as long as the hash spreads keys evenly. Collisions are normal; the real comparison settles them.",
      },
      {
        kind: "question",
        title: "Order matters",
        body: "With the same rule (a = 1, b = 2, B = 31, M = 101), h(`ab`) is 33. Find h(`ba`).",
        question: { type: "number", answer: 63, hint: "Start at 0. Fold in b, then a: h = h × 31 + letter, then take % 101." },
        explanation: "b: 0 × 31 + 2 = 2. a: 2 × 31 + 1 = **63**. The first letter gets multiplied by B once more, so swapping letters changes the hash.",
      },
      {
        kind: "question",
        title: "A lazy hash",
        body: "Someone hashes words by **adding up** their letter values (a = 1, b = 2, …). What's the main problem?",
        question: {
          type: "choice",
          options: ["It can be negative", "Every rearrangement of a word collides", "It's slower than the polynomial hash", "It only works for short words"],
          answer: 1,
          feedback: {
            0: "Adding positive letter values never goes below zero.",
            2: "It's just as fast: one pass. Speed isn't the issue.",
            3: "It works at any length; it just spreads values badly.",
          },
          hint: "Compare the sums for `stop`, `pots` and `tops`.",
        },
        explanation: "Addition ignores order, so `stop`, `pots`, `tops` and `spot` all collide, and the sums of short words bunch into a small range. The polynomial hash weights each position differently.",
      },
      {
        kind: "question",
        title: "Pigeons and holes",
        body: "A table has 1,000 buckets. How many different keys guarantee that at least two of them share a bucket, whatever the hash function?",
        question: { type: "number", answer: 1001, hint: "How many keys can you place before every bucket holds one?" },
        explanation: "1,000 keys could each get their own bucket; the **1,001st** must share. In practice collisions come much sooner: with a random hash, 38 keys already give a better than even chance of one (the **birthday paradox**).",
      },
      {
        kind: "explain",
        title: "Canonical keys",
        body: "Many interview problems are hashing in disguise: decide what makes two things \"the same\", turn each thing into a **canonical key** that is equal exactly when they are, and use a dict.\n\n| Same when… | Key |\n| --- | --- |\n| same letters in any order | `\"\".join(sorted(word))`, or a tuple of 26 letter counts |\n| same set of items | `frozenset(items)` |\n| same shape after a shift (`abc`, `bcd`) | the differences between neighbouring letters, as a tuple |\n| same rows in any order | `tuple(sorted(rows))` |\n\n" +
          py(`
groups = {}
for w in words:
    groups.setdefault(key(w), []).append(w)
list(groups.values())        # dicts keep insertion order
`) +
          "\n\nSorting each word costs O(k log k) for a word of length k; a counts tuple is O(k). Dict keys must be **hashable**: tuples, strings and frozensets are; lists and sets are not.\n\n**Pitfall:** a key that throws away too much. `set(\"abb\")` equals `set(\"ab\")`, so a set key would group `abb` with `ab`.",
      },
      {
        kind: "code",
        title: "Write the polynomial hash",
        body: "Write `poly_hash(s, base, mod)` with Horner's rule, using `ord(ch)` as each character's value. The empty string hashes to 0.\n\n" +
          py(`
poly_hash("abc", 31, 1_000_000_007)   # 97·31² + 98·31 + 99 = 96354
`),
        language: "python",
        starter: `def poly_hash(s, base, mod):
    # h = (h * base + ord(ch)) % mod for each character
    return None
`,
        solution: `def poly_hash(s, base, mod):
    h = 0
    for ch in s:
        h = (h * base + ord(ch)) % mod
    return h
`,
        tests: [
          { id: "t1", description: "the worked example", assertionCode: `_r = poly_hash("abc", 31, 1_000_000_007)\nassert _r == 96354, f"97 * 31 * 31 + 98 * 31 + 99 = 96354, got {_r}"` },
          { id: "t2", description: "reduced modulo a small number", assertionCode: `_r = poly_hash("cab", 31, 101)\nassert _r == 72, f"take % 101 as you go: expected 72, got {_r}"\n_r = poly_hash("", 31, 101)\nassert _r == 0, f"the empty string hashes to 0, got {_r}"` },
          { id: "t3", description: "order changes the hash", assertionCode: `_a, _b = poly_hash("ab", 31, 1000), poly_hash("ba", 31, 1000)\nassert (_a, _b) == (105, 135), f"expected ab -> 105 and ba -> 135, got {_a} and {_b}: the first character is multiplied by the base"` },
          { id: "t4", description: "a longer string", assertionCode: `_r = poly_hash("hello world", 257, 1_000_000_007)\nassert _r == 739570078, f"expected 739570078, got {_r}"` },
        ],
        hints: ["Start with `h = 0` and loop over the characters.", "Each step: `h = (h * base + ord(ch)) % mod`."],
      },
      {
        kind: "code",
        title: "Scrambled labels",
        body: "A warehouse's shelf labels got scrambled: some are the same letters in a different order. Write `group_scrambled(labels)`: group labels that are rearrangements of each other. Return a list of groups, the groups in order of their first label's appearance and each group in input order. Repeats stay in their group.\n\n" +
          py(`
group_scrambled(["tap", "pat", "top", "apt", "pot"])
# [["tap", "pat", "apt"], ["top", "pot"]]
`),
        language: "python",
        starter: `def group_scrambled(labels):
    groups = {}
    # pick a canonical key, then groups.setdefault(key, []).append(label)
    return None
`,
        solution: `def group_scrambled(labels):
    groups = {}
    for label in labels:
        groups.setdefault("".join(sorted(label)), []).append(label)
    return list(groups.values())
`,
        tests: [
          { id: "t1", description: "the example, plus singles", assertionCode: `_r = group_scrambled(["tap", "pat", "top", "apt", "pot", "a", ""])\nassert _r == [["tap", "pat", "apt"], ["top", "pot"], ["a"], [""]], f"expected [['tap', 'pat', 'apt'], ['top', 'pot'], ['a'], ['']], got {_r}"` },
          { id: "t2", description: "same letters, different counts", assertionCode: `_r = group_scrambled(["ab", "abb", "bab", "ba"])\nassert _r == [["ab", "ba"], ["abb", "bab"]], f"abb has two b's, so it is not a rearrangement of ab: expected [['ab', 'ba'], ['abb', 'bab']], got {_r}"` },
          { id: "t3", description: "repeats and an empty list", assertionCode: `_r = group_scrambled(["ab", "ba", "ab"])\nassert _r == [["ab", "ba", "ab"]], f"repeats stay in their group: expected [['ab', 'ba', 'ab']], got {_r}"\n_r = group_scrambled([])\nassert _r == [], f"no labels, no groups: expected [], got {_r}"` },
        ],
        hints: ["A key that is equal exactly for rearrangements: the letters sorted, `\"\".join(sorted(label))`.", "A `set` of letters is too weak a key: it forgets how many of each letter there are."],
      },
      {
        kind: "recap",
        points: [
          "A **hash function** maps any value to a number in a fixed range: deterministic, fast, well spread.",
          "**Collisions** are unavoidable (pigeonhole), and arrive early (birthday paradox): always confirm with a real comparison.",
          "**Polynomial hash** with Horner's rule: `h = (h * B + code(ch)) % M`. Order matters.",
          "Python salts string hashes per run: don't store `hash()` values.",
          "**Canonical keys** turn \"the same in the way I care about\" into dict lookups: sorted letters, counts, frozensets.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. Rolling hash ───────────────────────────────
  {
    id: "fnd-iv-strings-2-rolling-hash",
    title: "Rolling hashes and Rabin-Karp",
    summary: "Sliding a hash along the text in O(1) per step, verifying matches, substring hashes from prefixes, and binary search on length.",
    level: "Intermediate",
    minutes: 13,
    xp: 70,
    steps: [
      {
        kind: "explain",
        title: "Slide the hash",
        body: "To find a pattern of length m in a text of length n, the naive way compares the pattern at every start: O(n × m) in the worst case.\n\n**Rabin-Karp** compares hashes instead. The trick is a **rolling hash**: the hash of the next window comes from the current one in O(1). With the polynomial hash in base B:\n\n" +
          txt(`
next = (current - first_char · B^(m-1)) · B + new_char     (all mod M)
`) +
          "\nRemove the character that leaves (its weight is B^(m−1)), shift everything up one place, add the character that enters. Work out `B^(m-1) % M` once with `pow(B, m - 1, M)`.\n\nWhen the window's hash equals the pattern's, **check the actual characters**: it might be a collision. With a large prime M that's rare, so the expected time is **O(n + m)**.\n\nIn Python, `%` always gives a non-negative result, so the subtraction can't leave you with a negative hash (in Java or C++ you'd add M first).\n\nSignal words: *find a pattern, a repeated chunk of length k, compare many substrings, longest substring that appears twice*.",
      },
      {
        kind: "question",
        title: "Rolling through digits",
        body: "With digits and base 10 (and no modulus), a window's hash is just the number it spells, which makes the rolling step easy to see. We look for `828` in `2718281`. Tap the cell each question asks for.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Rabin-Karp with base 10",
            frames: [
              { array: [2, 7, 1, 8, 2, 8, 1], range: [0, 2], code: ROLL_CODE, line: 1, vars: { target: 828, h: 271 }, note: "The first window spells 271. Not 828.", pick: { prompt: "Sliding right, which digit **enters** the window?", answer: 3 } },
              { range: [1, 3], highlight: [3], line: 3, vars: { target: 828, h: 718 }, note: "(271 − 2 × 100) × 10 + 8 = **718**: drop the 2, shift, add the 8." },
              { range: [2, 4], highlight: [4], line: 3, vars: { target: 828, h: 182 }, note: "(718 − 700) × 10 + 2 = **182**." },
              { range: [2, 4], line: 3, note: "Next slide.", pick: { prompt: "Which digit **leaves** the window?", answer: 2 } },
              { range: [3, 5], highlight: [3, 4, 5], line: 4, vars: { target: 828, h: 828 }, note: "(182 − 100) × 10 + 8 = **828**. The hash matches; the digits really are 8, 2, 8, so it's a match at index 3." },
              { range: [4, 6], done: [3, 4, 5], line: 3, vars: { target: 828, h: 281 }, note: "(828 − 800) × 10 + 1 = 281. End of the text: one match, at **3**." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "The window keeps its length: one digit joins on the right as one leaves on the left." },
        explanation: "Every slide costs the same three operations, whatever the window length. That's what makes rolling hashes O(1) per step.",
      },
      {
        kind: "question",
        title: "One slide",
        body: "In the digits `50391` with window length 3, the first window is 503. Work out the value of the next window (`039`) using the rolling step.",
        question: { type: "number", answer: 39, hint: "Take away the leaving digit times 100, multiply by 10, add the entering digit." },
        explanation: "(503 − 5 × 100) × 10 + 9 = 3 × 10 + 9 = **39**. Leading zeros simply vanish: `039` is the number 39.",
      },
      {
        kind: "question",
        title: "Trust but verify",
        body: "Rabin-Karp's hashes are taken mod a big prime. Why compare the characters when the hashes match?",
        question: {
          type: "choice",
          options: ["To find where the match starts", "Python's `%` can return wrong values", "To make the algorithm O(n + m)", "Different windows can share a hash"],
          answer: 3,
          feedback: {
            0: "The window's position is already known.",
            1: "Python's `%` is exact; integers never overflow.",
            2: "Checking adds work; it's for correctness, not speed.",
          },
          hint: "How many different strings are there, and how many hash values?",
        },
        explanation: "There are far more strings than values below M, so **collisions** exist. A match on hash alone could be a false alarm; checking the m characters makes the answer certain. For extra safety, some solutions keep **two** hashes with different moduli.",
      },
      {
        kind: "explain",
        title: "Any substring in O(1)",
        body: "Store the hash of every **prefix** once, and you can get the hash of any substring without touching its characters:\n\n" +
          py(`
pre = [0] * (n + 1); pw = [1] * (n + 1)
for i, ch in enumerate(s):
    pre[i + 1] = (pre[i] * B + ord(ch)) % M
    pw[i + 1] = pw[i] * B % M

def sub_hash(i, L):                       # hash of s[i:i + L]
    return (pre[i + L] - pre[i] * pw[L]) % M
`) +
          "\n\nThat unlocks **binary search on the length**. \"Is there a substring of length L that appears twice?\" is *monotone*: if a length-L repeat exists, so does a length L − 1 one (drop its last character). So binary search L, and test each length with a set of `sub_hash` values: **O(n log n)** expected in total.\n\nFor `longest_repeat`-style answers, collisions would give a false \"yes\". Use a huge modulus such as **2⁶¹ − 1** (a prime) with a random base, or two hashes.",
      },
      {
        kind: "question",
        title: "Cost of the search",
        body: "With prefix hashes and a set, what is the expected running time of finding the longest substring that appears twice in a text of length n?",
        question: {
          type: "choice",
          options: ["O(n log n)", "O(n²)", "O(n³)", "O(log n)"],
          answer: 0,
          feedback: {
            1: "That's what you'd get trying every length one by one with hashes. Binary search needs only about log n lengths.",
            2: "That's the brute force: every length, every start, and slicing each substring.",
            3: "You still have to look at every start position for each length you try.",
          },
          hint: "How many lengths does the binary search try, and what does each test cost?",
        },
        explanation: "About log₂ n lengths, and each test walks n − L + 1 starts with an O(1) hash each: **O(n log n)** expected.",
      },
      {
        kind: "code",
        title: "Find every match",
        body: "Write `find_all(text, pattern)`: every index where `pattern` starts in `text`, overlaps included, using a rolling hash (don't use `str.find`, `in` or slicing on every window). Compare the characters only when the hashes match. `pattern` is never empty.\n\nSuggested: `B = 256`, `M = 1_000_000_007`, `high = pow(B, m - 1, M)`.",
        language: "python",
        starter: `def find_all(text, pattern):
    n, m = len(text), len(pattern)
    B, M = 256, 1_000_000_007
    # hash the pattern and the first window, then roll
    return None
`,
        solution: `def find_all(text, pattern):
    n, m = len(text), len(pattern)
    B, M = 256, 1_000_000_007
    if m > n:
        return []
    high = pow(B, m - 1, M)
    hp = hw = 0
    for i in range(m):
        hp = (hp * B + ord(pattern[i])) % M
        hw = (hw * B + ord(text[i])) % M
    out = []
    for i in range(n - m + 1):
        if hw == hp and text[i:i + m] == pattern:
            out.append(i)
        if i + m < n:
            hw = ((hw - ord(text[i]) * high) * B + ord(text[i + m])) % M
    return out
`,
        tests: [
          { id: "t1", description: "overlapping matches", assertionCode: `_r = find_all("abababa", "aba")\nassert _r == [0, 2, 4], f"aba starts at 0, 2 and 4 (they overlap): got {_r}"\n_r = find_all("aaaa", "aa")\nassert _r == [0, 1, 2], f"expected [0, 1, 2], got {_r}"` },
          { id: "t2", description: "a match in the very last window", assertionCode: `_r = find_all("xxab", "ab")\nassert _r == [2], f"the last window, starting at 2, matches: got {_r}"` },
          { id: "t3", description: "no match, and a pattern longer than the text", assertionCode: `_r = find_all("xyz", "q")\nassert _r == [], f"expected [], got {_r}"\n_r = find_all("ab", "abc")\nassert _r == [], f"a pattern longer than the text can't match: expected [], got {_r}"` },
          { id: "t4", description: "a long text", assertionCode: `_t = "ab" * 20000 + "abc"\n_r = find_all(_t, "abc")\nassert _r == [40000], f"the only abc starts at 40000, got {_r if _r is None or len(_r) < 5 else _r[:5]}"` },
        ],
        hints: ["Build `hp` (pattern) and `hw` (first window) with the same Horner loop.", "Slide with `hw = ((hw - ord(text[i]) * high) * B + ord(text[i + m])) % M`, but only while `i + m < n`."],
      },
      {
        kind: "code",
        title: "The longest echo",
        body: "Write `longest_repeat(s)`: the length of the longest substring that appears at least twice in `s` (the two copies may overlap). Return 0 if no character repeats.\n\nUse binary search on the length and prefix hashes with `M = 2**61 - 1`. The last test is a 3,060-character DNA string: checking every length one by one with slices is far too slow.\n\n" +
          py(`
longest_repeat("banana")   # 3: "ana" appears at 1 and at 3
longest_repeat("abcd")     # 0
`),
        language: "python",
        starter: `def longest_repeat(s):
    n = len(s)
    M = (1 << 61) - 1
    B = 911382323
    # prefix hashes, then binary search the largest L with a repeat
    return None
`,
        solution: `def longest_repeat(s):
    n = len(s)
    M = (1 << 61) - 1
    B = 911382323
    pre = [0] * (n + 1)
    pw = [1] * (n + 1)
    for i, ch in enumerate(s):
        pre[i + 1] = (pre[i] * B + ord(ch)) % M
        pw[i + 1] = pw[i] * B % M

    def has_repeat(L):
        seen = set()
        for i in range(n - L + 1):
            h = (pre[i + L] - pre[i] * pw[L]) % M
            if h in seen:
                return True
            seen.add(h)
        return False

    lo, hi = 0, max(n - 1, 0)
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if has_repeat(mid):
            lo = mid
        else:
            hi = mid - 1
    return lo
`,
        tests: [
          { id: "t1", description: "small cases", assertionCode: `for _s, _want in [("banana", 3), ("abcd", 0), ("abcabc", 3), ("mississippi", 4)]:\n    _r = longest_repeat(_s)\n    assert _r == _want, f"longest_repeat({_s!r}) should be {_want}, got {_r}"` },
          { id: "t2", description: "overlapping copies count", assertionCode: `_r = longest_repeat("aaaa")\nassert _r == 3, f"aaa appears at 0 and at 1 (overlapping): expected 3, got {_r}"` },
          { id: "t3", description: "empty and single-character strings", assertionCode: `_r = longest_repeat("")\nassert _r == 0, f"an empty string has no repeat: 0, got {_r}"\n_r = longest_repeat("q")\nassert _r == 0, f"one character can't repeat: 0, got {_r}"` },
          { id: "t4", description: "a 3,060-letter DNA string", assertionCode: `import random\n_rng = random.Random(42)\n_s = "".join(_rng.choice("acgt") for _ in range(3000))\n_s = _s[:500] + _s[2000:2060] + _s[500:]\n_r = longest_repeat(_s)\nassert _r == 60, f"a 60-letter chunk was copied into the string, so expected 60, got {_r}"` },
        ],
        hints: ["`has_repeat(L)`: put `(pre[i + L] - pre[i] * pw[L]) % M` for every start `i` into a set; a value seen twice means a repeat.", "Binary search for the largest L where `has_repeat(L)` is True: `mid = (lo + hi + 1) // 2` so the loop always moves."],
      },
      {
        kind: "recap",
        points: [
          "A **rolling hash** updates a window's hash in O(1): remove the old character's weight, shift by B, add the new one.",
          "**Rabin-Karp**: compare window hashes with the pattern's, **verify** on a match. O(n + m) expected.",
          "Precompute `pow(B, m - 1, M)`; Python's `%` is never negative.",
          "**Prefix hashes** give any substring's hash in O(1).",
          "\"Does a repeat of length L exist?\" is monotone, so **binary search on L**: O(n log n).",
          "Guard against collisions with a huge prime modulus (2⁶¹ − 1) or two hashes.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. KMP and Z ───────────────────────────────
  {
    id: "fnd-iv-strings-3-kmp",
    title: "String matching: KMP and the Z-function",
    summary: "The prefix function, matching without ever moving backwards in the text, the Z-array, and finding a string's period.",
    level: "Advanced",
    minutes: 15,
    xp: 80,
    steps: [
      {
        kind: "explain",
        title: "Never look back",
        body: "Naive matching restarts after every mismatch. On a text of `aaaa…a` and the pattern `aaa…ab`, it re-reads almost the whole pattern at every start: **O(n × m)**.\n\n**KMP** (Knuth-Morris-Pratt) never moves backwards in the text. It precomputes, for the pattern, the **prefix function** `pi`:\n\n> `pi[i]` = the length of the longest **proper** prefix of `p[0..i]` that is also a suffix of it.\n\n" +
          txt(`
p   =  a  a  b  a  a  a  b
pi  =  0  1  0  1  2  2  3
`) +
          "\nFor example `pi[6] = 3`: `aabaaab` ends with `aab`, which is also how it starts. After a mismatch, `pi` says how much of the pattern you have *already* matched again, so you continue from there instead of from scratch.\n\nSignal words: *find all occurrences, the longest prefix that is also a suffix, the shortest repeating unit, overlap between the end of one string and the start of another*.",
      },
      {
        kind: "question",
        title: "Build the prefix function",
        body: "Step through `pi` for `aabaaab`. `i` scans the pattern; `k` is the length matched so far, so `p[k]` is the next character it hopes to see. Tap where `k` falls back to on each mismatch.",
        widget: {
          type: "iv-trace",
          props: {
            title: "The prefix function of aabaaab",
            frames: [
              { array: ["a", "a", "b", "a", "a", "a", "b"], pointers: { k: 0, i: 1 }, highlight: [0, 1], code: PI_CODE, line: 6, vars: { pi: "0 1" }, note: "`p[1] == p[0]`: k becomes 1, so `pi[1] = 1`." },
              { pointers: { k: 1, i: 2 }, highlight: [1, 2], line: 4, vars: { pi: "0 1" }, note: "`p[2]` is b but `p[1]` is a: mismatch. Fall back to `k = pi[k - 1]`.", pick: { prompt: "`k = pi[0]`. Which index does `k` point at now?", answer: 0 } },
              { pointers: { k: 0, i: 2 }, highlight: [0, 2], line: 7, vars: { pi: "0 1 0" }, note: "k = 0, and b ≠ a again. `pi[2] = 0`." },
              { pointers: { k: 1, i: 4 }, highlight: [3, 4], line: 6, vars: { pi: "0 1 0 1 2" }, note: "i = 3 matches `p[0]` (k = 1), and i = 4 matches `p[1]` (k = 2)." },
              { pointers: { k: 2, i: 5 }, highlight: [2, 5], line: 4, vars: { pi: "0 1 0 1 2" }, note: "`p[5]` is a but `p[2]` is b: mismatch. Fall back to `k = pi[1]`.", pick: { prompt: "`pi[1]` is 1. Where does `k` point now?", answer: 1 } },
              { pointers: { k: 1, i: 5 }, highlight: [1, 5], line: 6, vars: { pi: "0 1 0 1 2 2" }, note: "Now `p[5] == p[1]`: k becomes 2. `pi[5] = 2`. We kept the `a` we had already matched instead of starting over." },
              { pointers: { k: 2, i: 6 }, highlight: [2, 6], line: 7, vars: { pi: "0 1 0 1 2 2 3" }, note: "`p[6] == p[2]`: k = 3, `pi[6] = 3`. Done: **0 1 0 1 2 2 3**." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "On a mismatch, `k` jumps to `pi[k - 1]`: the longest shorter prefix that still ends here." },
        explanation: "The fallback reuses work: after matching `aa` and failing, the last `a` is still a match for the first `a`, and `pi` knows that without re-reading anything.",
      },
      {
        kind: "question",
        title: "Your turn",
        body: "Work out `pi` for the last position of `abcabcab`: the length of the longest proper prefix of `abcabcab` that is also its suffix.",
        question: { type: "number", answer: 5, hint: "Try the prefixes from longest to shortest: does `abcabcab` end with `abcabca`? With `abcabc`? With `abcab`?" },
        explanation: "`abcab` is both the first five and the last five characters (they overlap in the middle): **5**. The full table is 0 0 0 1 2 3 4 5.",
      },
      {
        kind: "explain",
        title: "Searching with pi",
        body: "The search runs the same loop over the **text**, with `k` = how much of the pattern currently matches:\n\n" +
          py(`
k = 0
for i, ch in enumerate(text):
    while k > 0 and ch != pattern[k]:
        k = pi[k - 1]                  # fall back, never move i back
    if ch == pattern[k]:
        k += 1
    if k == len(pattern):              # a full match ends at i
        found.append(i - k + 1)
        k = pi[k - 1]                  # keep going: matches can overlap
`) +
          "\n\nWhy it is **O(n + m)**: `k` goes up by at most 1 per character, and every fallback makes it smaller. It can't go down more times in total than it went up, so the `while` loop costs O(n) over the whole run.\n\nA neat shortcut: compute `pi` of `pattern + \"#\" + text` (with `#` in neither). Every position where `pi` equals `len(pattern)` ends a match.",
      },
      {
        kind: "question",
        title: "Why linear?",
        body: "The search has a `while` loop inside a `for` loop. Why is it still O(n + m) and not O(n × m)?",
        question: {
          type: "choice",
          options: ["The while loop runs at most once per character", "k rises at most n times; each fallback lowers it", "The pattern is usually short", "pi values are always 0 or 1"],
          answer: 1,
          feedback: {
            0: "One character can trigger several fallbacks in a row; it's the total that's bounded.",
            2: "The bound holds for any pattern length.",
            3: "pi values can be as large as m − 1.",
          },
          hint: "Count how many times `k` can go up over the whole text.",
        },
        explanation: "This is **amortised** analysis: k increases by at most 1 per text character, so at most n times, and each fallback decreases it by at least 1. Total fallbacks ≤ n, total work O(n), plus O(m) to build `pi`.",
      },
      {
        kind: "question",
        title: "The Z-function",
        body: "The **Z-function** is the other classic tool: `z[i]` is the length of the longest common prefix of `s` and `s[i:]` (how far `s` matches itself starting at i). It is also built in O(n), by reusing the rightmost match window found so far. Search `pattern + \"$\" + text` and every `z[i] == len(pattern)` is a match.\n\nFor `s = aabxaab`, find `z[4]`.",
        question: { type: "number", answer: 3, hint: "Line up `s[4:]` under the start of `s` and count matching characters." },
        explanation: "`s[4:]` is `aab`, and `s` starts with `aab`: **3**. The whole array is 7 1 0 0 3 1 0 (by convention `z[0]` is the length). Z and pi solve the same problems; use whichever you can write correctly under pressure.",
      },
      {
        kind: "code",
        title: "KMP search",
        body: "Write `prefix_function(p)` and `kmp_search(text, pattern)`, which returns every start index of `pattern` in `text`, overlaps included. `pattern` is never empty. No `str.find`, `in` or slicing comparisons: let `pi` do the work.",
        language: "python",
        starter: `def prefix_function(p):
    pi = [0] * len(p)
    # k = length matched so far; on a mismatch fall back with k = pi[k - 1]
    return None


def kmp_search(text, pattern):
    pi = prefix_function(pattern)
    found = []
    # scan the text once, never moving backwards
    return None
`,
        solution: `def prefix_function(p):
    pi = [0] * len(p)
    k = 0
    for i in range(1, len(p)):
        while k > 0 and p[i] != p[k]:
            k = pi[k - 1]
        if p[i] == p[k]:
            k += 1
        pi[i] = k
    return pi


def kmp_search(text, pattern):
    pi = prefix_function(pattern)
    found = []
    k = 0
    for i, ch in enumerate(text):
        while k > 0 and ch != pattern[k]:
            k = pi[k - 1]
        if ch == pattern[k]:
            k += 1
        if k == len(pattern):
            found.append(i - k + 1)
            k = pi[k - 1]
    return found
`,
        tests: [
          { id: "t1", description: "the prefix function", assertionCode: `_r = prefix_function("aabaaab")\nassert _r == [0, 1, 0, 1, 2, 2, 3], f"expected [0, 1, 0, 1, 2, 2, 3], got {_r}"\n_r = prefix_function("abcabcab")\nassert _r == [0, 0, 0, 1, 2, 3, 4, 5], f"expected [0, 0, 0, 1, 2, 3, 4, 5], got {_r}"` },
          { id: "t2", description: "matches after a fallback", assertionCode: `_r = kmp_search("aabaaabaaab", "aaab")\nassert _r == [3, 7], f"aaab starts at 3 and 7, got {_r}"` },
          { id: "t3", description: "overlapping matches", assertionCode: `_r = kmp_search("aaaaa", "aa")\nassert _r == [0, 1, 2, 3], f"after a match, fall back with pi so overlaps are found: expected [0, 1, 2, 3], got {_r}"` },
          { id: "t4", description: "whole text, and no match", assertionCode: `_r = kmp_search("abc", "abc")\nassert _r == [0], f"expected [0], got {_r}"\n_r = kmp_search("abc", "d")\nassert _r == [], f"expected [], got {_r}"\n_r = kmp_search("ab", "abc")\nassert _r == [], f"a pattern longer than the text can't match: expected [], got {_r}"` },
        ],
        hints: ["`prefix_function`: the loop from the trace, `for i in range(1, len(p))`, with the `while` fallback and `pi[i] = k`.", "In the search, when `k == len(pattern)`, record `i - k + 1` and set `k = pi[k - 1]`."],
      },
      {
        kind: "code",
        title: "The repeating unit",
        body: "A string is **periodic** when it is some shorter block written out several times: `abcabcabc` is `abc` × 3. Write `smallest_unit(s)`: the length of the shortest block that, repeated a whole number of times, gives `s` (the whole string counts, so the answer is at most `len(s)`). `s` is never empty.\n\nThe prefix function gives it in O(n): with `p = len(s) - pi[-1]`, the answer is `p` if `p` divides `len(s)`, otherwise `len(s)`. A `prefix_function` is in the starter.",
        language: "python",
        starter: `def prefix_function(p):
    pi = [0] * len(p)
    k = 0
    for i in range(1, len(p)):
        while k > 0 and p[i] != p[k]:
            k = pi[k - 1]
        if p[i] == p[k]:
            k += 1
        pi[i] = k
    return pi


def smallest_unit(s):
    return None
`,
        solution: `def prefix_function(p):
    pi = [0] * len(p)
    k = 0
    for i in range(1, len(p)):
        while k > 0 and p[i] != p[k]:
            k = pi[k - 1]
        if p[i] == p[k]:
            k += 1
        pi[i] = k
    return pi


def smallest_unit(s):
    p = len(s) - prefix_function(s)[-1]
    return p if len(s) % p == 0 else len(s)
`,
        tests: [
          { id: "t1", description: "periodic strings", assertionCode: `for _s, _want in [("abab", 2), ("aaaa", 1), ("abcabcabc", 3), ("abaaba", 3)]:\n    _r = smallest_unit(_s)\n    assert _r == _want, f"smallest_unit({_s!r}) should be {_want}, got {_r}"` },
          { id: "t2", description: "a near miss is not periodic", assertionCode: `_r = smallest_unit("abcab")\nassert _r == 5, f"abcab has pi[-1] = 2, but 3 doesn't divide 5, so the unit is the whole string: 5, got {_r}"` },
          { id: "t3", description: "one character", assertionCode: `_r = smallest_unit("x")\nassert _r == 1, f"a single character is its own unit: 1, got {_r}"` },
          { id: "t4", description: "a long string", assertionCode: `_r = smallest_unit("xyz" * 30000)\nassert _r == 3, f"xyz repeated 30,000 times has unit length 3, got {_r}"\n_r = smallest_unit("xyz" * 30000 + "x")\nassert _r == 90001, f"one extra x breaks the pattern: expected 90001, got {_r}"` },
        ],
        hints: ["`p = len(s) - prefix_function(s)[-1]` is the smallest shift that maps the string onto itself.", "That shift only counts as a repeating unit if it divides the length exactly."],
      },
      {
        kind: "recap",
        points: [
          "`pi[i]`: the longest proper prefix of `p[0..i]` that is also its suffix.",
          "On a mismatch, `k = pi[k - 1]`; the text pointer never moves back.",
          "**KMP** is O(n + m): `k` rises at most n times, so the fallbacks are bounded too.",
          "After a full match, `k = pi[k - 1]` to catch overlapping matches.",
          "**Z-function**: `z[i]` = common prefix of `s` and `s[i:]`; search `pattern + \"$\" + text`.",
          "Shortest period: `n - pi[-1]`, if it divides n.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Suffix arrays ───────────────────────────────
  {
    id: "fnd-iv-strings-4-suffix-array",
    title: "Suffix arrays and the LCP array",
    summary: "Sorting every suffix by prefix doubling, Kasai's LCP array, and using them to count distinct substrings and find repeats.",
    level: "Professional",
    minutes: 16,
    xp: 90,
    steps: [
      {
        kind: "explain",
        title: "Every suffix, sorted",
        body: "A **suffix** of `s` is `s[i:]` for some start `i`. The **suffix array** (SA) lists those starts in the alphabetical order of their suffixes:\n\n" +
          txt(`
s = banana
 i   suffix              sorted:  SA  suffix    LCP with the one above
 0   banana                        5   a          -
 1   anana                         3   ana        1
 2   nana                          1   anana      3
 3   ana                           0   banana     0
 4   na                            4   na         0
 5   a                             2   nana       2
`) +
          "\nThe **LCP array** holds the longest common prefix of each pair of neighbours in that order. Together they answer a lot:\n\n- **Search** for a pattern: binary search the SA, O(m log n).\n- **Longest repeated substring**: the largest LCP value (a repeat is a shared prefix of two suffixes, and the longest one is between neighbours).\n- **Number of distinct substrings**: n(n + 1)/2 − sum(LCP), since each suffix adds its prefixes minus the ones its upper neighbour already had.\n- **Longest common substring** of `a` and `b`: build the SA of `a + \"#\" + b` and look at neighbours from different sides.\n\nSignal words: *distinct substrings, longest repeated, k-th smallest substring, many pattern queries on one fixed text*.",
      },
      {
        kind: "explain",
        title: "Prefix doubling and Kasai",
        body: "Sorting the suffixes directly (`sorted(range(n), key=lambda i: s[i:])`) compares strings up to n long: O(n² log n) time and O(n²) memory for the slices. **Prefix doubling** sorts by the first 1, 2, 4, 8, … characters instead:\n\n1. Rank each position by its first character.\n2. With k characters ranked, the first **2k** characters of suffix i are described by the pair `(rank[i], rank[i + k])`, using −1 when `i + k` runs off the end. Sort by the pairs and hand out new ranks; equal pairs share a rank.\n3. Double k until all ranks are different.\n\nThat's log n rounds of an O(n log n) sort: **O(n log² n)** (radix-sorting the pairs gives O(n log n), and SA-IS reaches O(n), but nobody expects those on a whiteboard).\n\n**Kasai's algorithm** builds the LCP array in **O(n)**: visit suffixes in text order (0, 1, 2, …). If suffix i shares h characters with its upper neighbour, suffix i + 1 shares at least h − 1 with its own, so `h` only drops by 1 per step and never restarts from 0.",
      },
      {
        kind: "question",
        title: "Double the prefix",
        body: "Prefix doubling on `banana`. The array shows each position's current **rank**. Tap the position each question asks for.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Prefix doubling on banana",
            frames: [
              { array: ["b", "a", "n", "a", "n", "a"], code: SA_CODE, line: 1, vars: { k: 0 }, note: "Suffix i starts at position i. We sort them without ever slicing." },
              { array: [1, 0, 2, 0, 2, 0], line: 1, vars: { k: 1 }, note: "Rank by the first letter: a = 0, b = 1, n = 2." },
              { line: 3, vars: { k: 1, pairs: "(1,0) (0,2) (2,0) (0,2) (2,0) (0,-1)" }, note: "Pair each rank with the rank 1 place later; position 5 runs off the end and gets −1.", pick: { prompt: "Which position has the smallest pair, so rank 0?", answer: 5 } },
              { array: [2, 1, 3, 1, 3, 0], highlight: [5], line: 4, vars: { k: 2 }, note: "Sorted pairs: (0,−1) → 0; (0,2) at 1 and 3 → 1; (1,0) → 2; (2,0) at 2 and 4 → 3. These rank the first **2** letters." },
              { line: 3, highlight: [1, 3], vars: { k: 2, pairs: "(2,3) (1,1) (3,1) (1,0) (3,-1) (0,-1)" }, note: "Positions 1 and 3 are tied (`an`). Now pair with the rank 2 places later.", pick: { prompt: "Which of positions 1 and 3 is smaller now?", answer: 3 } },
              { array: [3, 2, 5, 1, 4, 0], highlight: [3, 1], line: 4, vars: { k: 4 }, note: "(1,0) < (1,1), so position 3 (`ana`) comes before 1 (`anana`). All ranks differ: stop." },
              { array: [5, 3, 1, 0, 4, 2], line: 5, vars: { SA: "5 3 1 0 4 2", LCP: "1 3 0 0 2" }, note: "Reading positions by rank gives the suffix array **5 3 1 0 4 2**: a, ana, anana, banana, na, nana. Kasai then gives LCP 1 3 0 0 2." },
              { done: [0, 1, 2, 3, 4, 5], line: 5, vars: { substrings: "21 − 6 = 15", "longest repeat": "3 (ana)" }, note: "banana has 6 × 7 / 2 = 21 substring positions; the LCPs add up to 6 duplicates: **15** distinct substrings. The biggest LCP, 3, is the longest repeat." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Pairs compare like words: the first number first, the second only to break a tie, and −1 is the smallest." },
        explanation: "Each round doubles how many characters the ranks describe, so 6 characters needed only 3 rounds (1, 2, 4 ≥ the longest tie). The pairs did all the work, with no string comparisons.",
      },
      {
        kind: "question",
        title: "Sort the suffixes",
        body: "Put the suffixes of `abab` in suffix-array order.",
        question: { type: "order", items: ["ab", "abab", "b", "bab"], hint: "Compare like a dictionary: a prefix of a longer word comes first." },
        explanation: "`ab` < `abab` because `ab` is a prefix of `abab`; then the two that start with `b`. The SA is **2 0 3 1**, and the LCP array is 2 0 1.",
      },
      {
        kind: "question",
        title: "Count the substrings",
        body: "`abab` has n = 4 and LCP array `2 0 1`. Using n(n + 1)/2 − sum(LCP), how many distinct non-empty substrings does it have?",
        question: { type: "number", answer: 7, hint: "4 × 5 / 2 counts every (start, end) pair; subtract the repeats the LCPs count." },
        explanation: "10 − 3 = **7**: a, b, ab, ba, aba, bab, abab. The LCPs counted the duplicate `a`, `ab` and `b`.",
      },
      {
        kind: "question",
        title: "Where's the longest repeat?",
        body: "Why is the longest repeated substring always the **largest value** in the LCP array?",
        question: {
          type: "choice",
          options: ["Suffixes sharing a prefix sit next to each other", "The LCP array is sorted", "The last suffix is always the longest", "Repeats always start at position 0"],
          answer: 0,
          feedback: {
            1: "It isn't: banana's is 1 3 0 0 2.",
            2: "The order is alphabetical, not by length.",
            3: "In banana the longest repeat, ana, starts at 1 and 3.",
          },
          hint: "A repeated substring is a common prefix of two suffixes. Where are those suffixes in sorted order?",
        },
        explanation: "Sorting puts suffixes with a long common prefix **next to each other** (anything between them must share that prefix too). So the best pair is always a neighbouring pair, and its LCP is the largest value.",
      },
      {
        kind: "code",
        title: "Build the suffix array",
        body: "Write `suffix_array(s)` by prefix doubling: rank by character, then sort by `(rank[i], rank[i + k] or -1)` and re-rank, doubling k until every rank is different. Return the list of starts. `suffix_array(\"\")` is `[]`.\n\nTip: `ord(ch)` works as the first rank; after sorting by the key, walk the sorted list and give the next rank only when the key changes.",
        language: "python",
        starter: `def suffix_array(s):
    n = len(s)
    if n == 0:
        return []
    rank = [ord(ch) for ch in s]
    sa = list(range(n))
    k = 1
    # sort by (rank[i], rank[i + k] or -1), re-rank, double k
    return None
`,
        solution: `def suffix_array(s):
    n = len(s)
    if n == 0:
        return []
    rank = [ord(ch) for ch in s]
    sa = list(range(n))
    k = 1
    while True:
        def key(i):
            return (rank[i], rank[i + k] if i + k < n else -1)
        sa.sort(key=key)
        new = [0] * n
        for j in range(1, n):
            new[sa[j]] = new[sa[j - 1]] + (key(sa[j]) != key(sa[j - 1]))
        rank = new
        if rank[sa[-1]] == n - 1:
            return sa
        k *= 2
`,
        tests: [
          { id: "t1", description: "banana", assertionCode: `_r = suffix_array("banana")\nassert _r == [5, 3, 1, 0, 4, 2], f"expected [5, 3, 1, 0, 4, 2] (a, ana, anana, banana, na, nana), got {_r}"` },
          { id: "t2", description: "all the same letter", assertionCode: `_r = suffix_array("aaaa")\nassert _r == [3, 2, 1, 0], f"a shorter run of a's sorts first: expected [3, 2, 1, 0], got {_r}"` },
          { id: "t3", description: "tiny strings", assertionCode: `_r = suffix_array("")\nassert _r == [], f"no suffixes: expected [], got {_r}"\n_r = suffix_array("x")\nassert _r == [0], f"expected [0], got {_r}"\n_r = suffix_array("abab")\nassert _r == [2, 0, 3, 1], f"expected [2, 0, 3, 1], got {_r}"` },
          { id: "t4", description: "2,000 random letters", assertionCode: `import random\n_rng = random.Random(3)\n_s = "".join(_rng.choice("ab") for _ in range(2000))\n_r = suffix_array(_s)\nassert isinstance(_r, list) and len(_r) == 2000, f"expected 2000 starts, got {None if _r is None else len(_r)}"\nassert _r[:5] == [827, 704, 828, 1960, 636] and sum(i * v for i, v in enumerate(_r)) == 2000618863, f"the order is wrong on the long string; it starts {_r[:5]}"` },
        ],
        hints: ["Inside a `while True:` loop, define `key(i)` with the current `rank` and `k`, then `sa.sort(key=key)`.", "New ranks: `new[sa[j]] = new[sa[j - 1]] + (key(sa[j]) != key(sa[j - 1]))`. Stop when the largest rank is n − 1."],
      },
      {
        kind: "code",
        title: "Kasai and distinct substrings",
        body: "Write `lcp_array(s, sa)` with Kasai's algorithm (O(n): visit positions in text order, keep `h`, and lower it by one after each step instead of restarting), and `count_distinct(s)`: the number of distinct non-empty substrings, as n(n + 1)/2 − sum(LCP). For `n` characters the LCP array has `n - 1` entries (empty for `\"\"`).\n\nA simple `suffix_array` is in the starter (the slow slicing version; fine at these sizes).",
        language: "python",
        starter: `def suffix_array(s):
    return sorted(range(len(s)), key=lambda i: s[i:])


def lcp_array(s, sa):
    n = len(s)
    rank = [0] * n
    for r, p in enumerate(sa):
        rank[p] = r
    lcp = [0] * max(n - 1, 0)
    # Kasai: for i in text order, compare suffix i with the one sorted just above it
    return None


def count_distinct(s):
    return None
`,
        solution: `def suffix_array(s):
    return sorted(range(len(s)), key=lambda i: s[i:])


def lcp_array(s, sa):
    n = len(s)
    rank = [0] * n
    for r, p in enumerate(sa):
        rank[p] = r
    lcp = [0] * max(n - 1, 0)
    h = 0
    for i in range(n):
        if rank[i] == 0:
            h = 0
            continue
        j = sa[rank[i] - 1]
        while i + h < n and j + h < n and s[i + h] == s[j + h]:
            h += 1
        lcp[rank[i] - 1] = h
        if h > 0:
            h -= 1
    return lcp


def count_distinct(s):
    n = len(s)
    return n * (n + 1) // 2 - sum(lcp_array(s, suffix_array(s)))
`,
        tests: [
          { id: "t1", description: "the LCP array of banana", assertionCode: `_r = lcp_array("banana", [5, 3, 1, 0, 4, 2])\nassert _r == [1, 3, 0, 0, 2], f"neighbours a/ana share 1, ana/anana 3, then 0, 0, and na/nana 2: expected [1, 3, 0, 0, 2], got {_r}"` },
          { id: "t2", description: "a longer LCP array", assertionCode: `_s = "mississippi"\n_r = lcp_array(_s, sorted(range(len(_s)), key=lambda i: _s[i:]))\nassert _r == [1, 1, 4, 0, 0, 1, 0, 2, 1, 3], f"expected [1, 1, 4, 0, 0, 1, 0, 2, 1, 3], got {_r}"` },
          { id: "t3", description: "distinct substrings", assertionCode: `for _s, _want in [("banana", 15), ("abab", 7), ("aaaa", 4), ("abc", 6), ("", 0)]:\n    _r = count_distinct(_s)\n    assert _r == _want, f"count_distinct({_s!r}) should be {_want}, got {_r}"` },
          { id: "t4", description: "300 random letters", assertionCode: `import random\n_rng = random.Random(5)\n_s = "".join(_rng.choice("ab") for _ in range(300))\n_r = count_distinct(_s)\nassert _r == 42964, f"expected 42964 distinct substrings, got {_r}"` },
        ],
        hints: ["For each `i` with `rank[i] > 0`, let `j = sa[rank[i] - 1]` and extend `h` while `s[i + h] == s[j + h]`.", "Store `lcp[rank[i] - 1] = h`, then `h -= 1` if it's positive. For `rank[i] == 0`, reset `h` to 0."],
      },
      {
        kind: "recap",
        points: [
          "The **suffix array** lists suffix starts in sorted order; the **LCP array** gives neighbours' common prefix lengths.",
          "**Prefix doubling**: sort by `(rank[i], rank[i + k])`, re-rank, double k. O(n log² n).",
          "**Kasai** builds LCP in O(n): `h` drops by at most 1 per step.",
          "Distinct substrings = n(n + 1)/2 − sum(LCP). Longest repeat = max(LCP).",
          "Pattern search on a fixed text: binary search the suffix array, O(m log n).",
          "Slicing every suffix is O(n²) memory: fine for small n, not for big inputs.",
        ],
      },
    ],
  },
];

export const ivStringsModule: Module = {
  id: "iv-strings",
  part: "interview",
  title: "String algorithms and hashing",
  blurb: "Hash functions, rolling hashes, string matching and suffix arrays.",
  icon: "binary",
  lessons,
};
