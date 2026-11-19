import type { ConceptLesson, Module } from "../../learn/types.ts";

/** Fenced plain-text block (commands, file contents). */
const sh = (text: string) => "~~~text\n" + text.replace(/^\n+|\s+$/g, "") + "\n~~~";

// ── seeded files ──
const VISITS =
  "08:01 ada /home\n08:03 linus /pricing\n08:07 grace /home\n08:12 alan /docs\n08:15 ada /pricing\n08:21 barbara /signup\n08:30 ken /home\n08:42 grace /docs\n08:55 dennis /pricing\n09:02 ada /signup\n";
const LINES_FILES = { "~/visits.log": VISITS, "~/short.txt": "one\ntwo\nthree\nfour\n", "~/notes.txt": "milk\neggs\nbread" };

const CODES = "AB-1234\nab-1234\nCD-98765\nXEF-1000\nGH-0042\nJK1234\nMN-12a4\nPQ-7777\n";
const TIMES = "09:30\n23:59\n24:00\n7:45\n12:60\n00:00\n19:05\n2:30pm\n";
const APP_LOG =
  "2026-11-02 INFO started\n2026-11-02 WARN disk 81% full\n2026-11-02 ERROR payment failed for order #1042\n2026-11-03 INFO user login\n2026-11-03 error retry scheduled\n2026-11-03 ERROR payment failed for order #1077\n2026-11-04 INFO backup done\n";
const GREP_FILES = { "~/codes.txt": CODES, "~/times.txt": TIMES, "~/app.log": APP_LOG };

const WORDS = "red blue red green\nblue red yellow\nred green blue\n";
const REVIEWS = "Fresh bread! The bread was warm.\nWarm service, fresh coffee.\nThe coffee? Fresh, every day.\n";
const COUNT_FILES = { "~/words.txt": WORDS, "~/reviews.txt": REVIEWS };

const SCORES = "name,team,points\nada,red,12\nlinus,blue,7\ngrace,red,9\nalan,green,15\nbarbara,blue,11\nken,green,4\n";
const MATRIX = "day mon tue wed\ncups 3 5 2\ncakes 1 0 4\n";
const COLUMN_FILES = { "~/scores.csv": SCORES, "~/matrix.txt": MATRIX, "~/spaced.txt": "ada   12\nlinus 7\n" };
const MATRIX_GRID = MATRIX.trim()
  .split("\n")
  .map((l) => l.split(" "));
const TRANSPOSE_CODE = ["{ for (i = 1; i <= NF; i++) a[NR, i] = $i }", "END {", "  for (i = 1; i <= NF; i++) {", "    s = a[1, i]", "    for (j = 2; j <= NR; j++) s = s \" \" a[j, i]", "    print s", "  }", "}"];
const col = (c: number, tone: "active" | "done" | "path") => [0, 1, 2].map((r) => ({ r, c, tone }));

const ACCESS =
  "10.0.0.5 GET /index.html 200 512\n10.0.0.7 GET /about.html 200 1024\n10.0.0.5 GET /missing.png 404 0\n10.0.0.9 POST /login 200 128\n10.0.0.5 GET /index.html 200 512\n10.0.0.7 GET /old.html 404 0\n10.0.0.5 GET /missing.png 404 0\n10.0.0.9 GET /index.html 200 512\n10.0.0.7 GET /index.html 304 0\n";
const SHIPPED = "order 17 shipped 2026-11-18\norder 18 shipped 2026-11-19\norder 21 returned 2026-12-02\n";
const PIPE_FILES = { "~/access.log": ACCESS, "~/shipped.txt": SHIPPED };

const lessons: ConceptLesson[] = [
  // ─────────────────────────────── 1. Reading files and picking lines ───────────────────────────────
  {
    id: "fnd-iv-shell-1-lines",
    title: "Picking lines out of a file",
    summary: "head, tail, sed -n and awk NR: print exactly the lines you want, and what happens when they aren't there.",
    minutes: 10,
    xp: 60,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "Lines by number",
        body:
          "Shell interview questions give you a text file and ask for one line of shell that prints part of it. Lines are numbered from **1**. The tools:\n\n" +
          "| Want | Command |\n|---|---|\n" +
          "| First 3 lines | `head -n 3 file` |\n" +
          "| Last 3 lines | `tail -n 3 file` |\n" +
          "| From line 8 to the end | `tail -n +8 file` |\n" +
          "| Only line 7 | `sed -n '7p' file` or `awk 'NR == 7' file` |\n" +
          "| Lines 4 to 6 | `sed -n '4,6p' file` or `awk 'NR >= 4 && NR <= 6' file` |\n" +
          "| Every even line | `awk 'NR % 2 == 0' file` |\n" +
          "| How many lines | `wc -l < file` |\n\n" +
          "`sed -n` turns off sed's habit of printing every line, so only the lines you `p`rint appear. In awk, `NR` is the current line number, and a condition with no `{ … }` prints the lines where it is true.\n\n" +
          "**How to spot it:** \"print the Nth line\", \"lines M to N\", \"skip the header\", \"if the file has fewer lines, print nothing\".",
        widget: { type: "unix-terminal", props: { files: LINES_FILES, suggest: ["cat visits.log", "head -n 3 visits.log", "awk 'NR == 2' visits.log"] } },
      },
      {
        kind: "question",
        title: "The first three",
        body: "`visits.log` lists page visits, one per line.",
        widget: { type: "unix-terminal", props: { files: LINES_FILES, task: "Print the first 3 lines of `visits.log`.", solution: ["head -n 3 visits.log"] } },
        question: { type: "widget", goal: { output: "08:01 ada /home\n08:03 linus /pricing\n08:07 grace /home" }, hint: "head prints the start of a file; -n says how many lines." },
        explanation: "`head -n 3 visits.log` (or `head -3`). Without `-n`, head prints 10 lines.",
      },
      {
        kind: "question",
        title: "Just line 7",
        body: "Print **only** the 7th line of `visits.log`.",
        widget: { type: "unix-terminal", props: { files: LINES_FILES, task: "Print line 7 of `visits.log` and nothing else.", solution: ["sed -n '7p' visits.log"] } },
        question: { type: "widget", goal: { output: "08:30 ken /home" }, hint: "sed -n with an address and p prints only that line; awk can test NR." },
        explanation: "`sed -n '7p' visits.log` or `awk 'NR == 7' visits.log`. `head -n 7 visits.log | tail -n 1` also works here, but see the next question.",
      },
      {
        kind: "question",
        title: "When line 7 isn't there",
        body: "`short.txt` has only 4 lines: `one`, `two`, `three`, `four`. What does this print?\n\n" + sh("head -n 7 short.txt | tail -n 1"),
        question: {
          type: "choice",
          options: ["Nothing", "`four`", "An error: there is no line 7", "`one`"],
          answer: 1,
          feedback: { 0: "That's what `sed -n '7p'` would print. head doesn't mind a short file: it just gives you all 4 lines.", 2: "Neither tool complains about a short file." },
          hint: "head -n 7 on a 4-line file prints all 4 lines. What is the last of those?",
        },
        explanation: "`head -n 7` prints all 4 lines and `tail -n 1` keeps the last, so it prints **four**, a wrong answer. Problems that say \"print the 7th line, or nothing if there isn't one\" are testing exactly this.",
      },
      {
        kind: "question",
        title: "Nothing is the right answer",
        body: "Print line 7 of `short.txt`, which has no line 7. The correct output is **nothing at all**.",
        widget: { type: "unix-terminal", props: { files: LINES_FILES, task: "Print line 7 of `short.txt` (it has 4 lines, so print nothing).", solution: ["sed -n '7p' short.txt"] } },
        question: { type: "widget", goal: { output: "", lastCommand: "short\\.txt" }, hint: "Use a tool that prints a line only if that line number exists." },
        explanation: "`sed -n '7p' short.txt` and `awk 'NR == 7' short.txt` both print nothing, because they only print a line when they reach line 7.",
      },
      {
        kind: "question",
        title: "A range of lines",
        body: "Print lines 4, 5 and 6 of `visits.log`.",
        widget: { type: "unix-terminal", props: { files: LINES_FILES, task: "Print lines 4 to 6 of `visits.log`.", solution: ["sed -n '4,6p' visits.log"] } },
        question: { type: "widget", goal: { output: "08:12 alan /docs\n08:15 ada /pricing\n08:21 barbara /signup" }, hint: "sed takes a range of addresses: first,last followed by p." },
        explanation: "`sed -n '4,6p' visits.log`, or `awk 'NR >= 4 && NR <= 6' visits.log`, or `head -n 6 visits.log | tail -n 3`.",
      },
      {
        kind: "question",
        title: "From line 8 on",
        body: "Print everything from line 8 to the end of `visits.log`, however long the file is.",
        widget: { type: "unix-terminal", props: { files: LINES_FILES, task: "Print `visits.log` from line 8 to the end.", solution: ["tail -n +8 visits.log"] } },
        question: { type: "widget", goal: { output: "08:42 grace /docs\n08:55 dennis /pricing\n09:02 ada /signup" }, hint: "tail -n with a plus sign means start at that line instead of counting from the end." },
        explanation: "`tail -n +8` starts at line 8. The same trick skips a header: `tail -n +2 data.csv`. (`sed -n '8,$p'` works too; `$` is the last line.)",
      },
      {
        kind: "question",
        title: "Every other line",
        body: "Print the even-numbered lines of `visits.log` (lines 2, 4, 6 …).",
        widget: { type: "unix-terminal", props: { files: LINES_FILES, task: "Print lines 2, 4, 6, 8 and 10 of `visits.log`.", solution: ["awk 'NR % 2 == 0' visits.log"] } },
        question: { type: "widget", goal: { output: "08:03 linus /pricing\n08:12 alan /docs\n08:21 barbara /signup\n08:42 grace /docs\n09:02 ada /signup" }, hint: "In awk, NR is the line number. Which lines have an NR that divides by 2?" },
        explanation: "`awk 'NR % 2 == 0' visits.log`: the condition alone prints each line where it's true. GNU sed can also do it with `sed -n '2~2p'` (start at 2, step 2).",
      },
      {
        kind: "question",
        title: "Counting lines",
        body: "`notes.txt` shows three items, `milk`, `eggs` and `bread`, but the file has no newline after `bread`. Try `wc -l notes.txt`. What number does it print?",
        widget: { type: "unix-terminal", props: { files: LINES_FILES, suggest: ["cat notes.txt", "wc -l notes.txt"] }, live: true },
        question: { type: "number", answer: 2, hint: "wc -l doesn't count lines: it counts newline characters." },
        explanation: "**2**. `wc -l` counts newline characters, and the last line has none. Files written by editors usually end with a newline, but generated ones may not; `awk 'END { print NR }'` counts the last line either way.",
      },
      {
        kind: "recap",
        points: [
          "`head -n N` and `tail -n N` give the first and last N lines; `tail -n +K` starts at line K.",
          "`sed -n 'Np'`, `sed -n 'M,Np'` and `awk 'NR == N'` print exact lines, and nothing if they don't exist.",
          "`head -n N | tail -n 1` gives the wrong line when the file is too short.",
          "`awk 'NR % 2 == 0'` filters by line number; a condition alone prints the matching lines.",
          "`wc -l` counts newlines, so a missing final newline means one less.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 2. grep and regular expressions ───────────────────────────────
  {
    id: "fnd-iv-shell-2-grep",
    title: "grep and regular expressions",
    summary: "Anchors, classes and counts: keep only the lines that match a format exactly.",
    minutes: 12,
    xp: 60,
    level: "Beginner",
    steps: [
      {
        kind: "explain",
        title: "Patterns",
        body:
          "`grep PATTERN file` prints the lines that **contain** a match. Use `grep -E` for *extended* regular expressions, so `+ ? { } | ( )` work without backslashes, and put the pattern in single quotes so the shell leaves it alone.\n\n" +
          "| Pattern | Matches |\n|---|---|\n" +
          "| `.` | any one character |\n" +
          "| `[abc]`, `[0-9]`, `[A-Z]` | one character from the set or range |\n" +
          "| `[^0-9]` | one character **not** in the set |\n" +
          "| `[[:digit:]]`, `[[:alpha:]]` | a digit, a letter |\n" +
          "| `x*`, `x+`, `x?` | 0 or more, 1 or more, 0 or 1 of x |\n" +
          "| `x{4}`, `x{2,3}` | exactly 4, 2 to 3 of x |\n" +
          "| `^`, `$` | the start, the end of the line |\n\n" +
          "A bar inside parentheses gives alternatives: `(am|pm)` matches either.\n\n" +
          "To check that a **whole line** has a format, anchor both ends: `^…$`. Without anchors, `[0-9]{4}` also matches inside `123456`.\n\n" +
          "Useful flags: `-i` ignore case, `-v` print the lines that **don't** match, `-c` count matching lines, `-o` print only the matched text, `-n` add line numbers, `-w` match whole words.\n\n" +
          "**How to spot it:** \"print the valid …\", \"lines that match the format\", \"how many lines contain\", \"extract every …\".",
      },
      {
        kind: "question",
        title: "Which one passes?",
        body: "Booking references must be two capital letters, a dash and four digits, and nothing else on the line.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Testing ^[A-Z]{2}-[0-9]{4}$",
            frames: [
              { array: ["ab-1234", "AB-12345", "XAB-1234", "QZ-0815", "AB-12x4"], code: ["grep -E '^[A-Z]{2}-[0-9]{4}$'"], line: 1, note: "Five candidates. The pattern reads: start, 2 capitals, a dash, 4 digits, end.", pick: { prompt: "Which one matches the whole pattern?", answer: 3 } },
              { highlight: [3], done: [0, 1, 2, 4], line: 1, note: "**QZ-0815** passes. `ab` is lower case, `AB-12345` has a 5th digit before the end, `XAB` has a 3rd letter after the start, `12x4` has a letter where a digit must be." },
              { highlight: [1, 2, 3], done: [0, 4], code: ["grep -E '[A-Z]{2}-[0-9]{4}'"], line: 1, note: "Drop the anchors and `AB-12345` and `XAB-1234` match too: each **contains** a valid code. Anchors turn \"contains\" into \"is\"." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "Check each one against the pattern from left to right: two capitals first, and the line must end right after the 4th digit." },
        explanation: "`^` and `$` pin the match to the whole line. Validation questions almost always need both.",
      },
      {
        kind: "question",
        title: "How many errors?",
        body: "`app.log` writes its level in upper case, but one line says `error` in lower case.",
        widget: { type: "unix-terminal", props: { files: GREP_FILES, task: "Print how many lines of `app.log` contain `error` in any case.", suggest: ["cat app.log"], solution: ["grep -ci error app.log"] } },
        question: { type: "widget", goal: { output: "3" }, hint: "grep has a flag to ignore case and another to count matching lines instead of printing them." },
        explanation: "`grep -ci error app.log` prints **3**: `-i` ignores case and `-c` counts lines. `grep -i error app.log | wc -l` works too.",
      },
      {
        kind: "question",
        title: "Valid booking codes",
        body: "`codes.txt` has one code per line, some of them broken.",
        widget: { type: "unix-terminal", props: { files: GREP_FILES, task: "Print only the lines of `codes.txt` that are valid codes: 2 capital letters, a dash, 4 digits.", suggest: ["cat codes.txt"], solution: ["grep -E '^[A-Z]{2}-[0-9]{4}$' codes.txt"] } },
        question: { type: "widget", goal: { output: "AB-1234\nGH-0042\nPQ-7777" }, hint: "Use grep -E with [A-Z]{2}, a dash and [0-9]{4}, anchored at both ends with ^ and $." },
        explanation: "`grep -E '^[A-Z]{2}-[0-9]{4}$' codes.txt`. Without `-E`, plain grep reads `{` as a literal character unless you write `\\{2\\}`.",
      },
      {
        kind: "question",
        title: "Forgetting the anchors",
        body: "Run the same command on `codes.txt` but **without** `^` and `$`. Which lines appear that shouldn't?",
        question: {
          type: "choice",
          options: ["None: the output is the same", "`ab-1234` and `JK1234`", "`CD-98765` and `XEF-1000`", "Every line in the file"],
          answer: 2,
          feedback: { 0: "Some invalid codes contain a valid one inside them.", 1: "Neither contains two capitals, a dash and four digits in a row." },
          hint: "Look for lines that contain two capitals, a dash and four digits somewhere inside them.",
        },
        explanation: "`CD-98765` contains `CD-9876` and `XEF-1000` contains `EF-1000`, so both slip through. That is why validation needs `^…$`.",
      },
      {
        kind: "question",
        title: "Valid clock times",
        body: "`times.txt` holds times that should be 24-hour `HH:MM`, from `00:00` to `23:59`.",
        widget: { type: "unix-terminal", props: { files: GREP_FILES, task: "Print only the valid `HH:MM` times in `times.txt`.", suggest: ["cat times.txt"], solution: ["grep -E '^([01][0-9]|2[0-3]):[0-5][0-9]$' times.txt"] } },
        question: { type: "widget", goal: { output: "09:30\n23:59\n00:00\n19:05" }, hint: "The hour is either 0 or 1 followed by any digit, or 2 followed by 0 to 3. The minutes are 0 to 5 followed by any digit." },
        explanation: "`grep -E '^([01][0-9]|2[0-3]):[0-5][0-9]$' times.txt`. `[0-9]{2}:[0-9]{2}` would wrongly accept `24:00` and `12:60`; a range of numbers often needs alternatives like `[01][0-9]|2[0-3]`.",
      },
      {
        kind: "question",
        title: "Pull out the order numbers",
        body: "Some lines in `app.log` mention an order like `#1042`.",
        widget: { type: "unix-terminal", props: { files: GREP_FILES, task: "Print every order number in `app.log`, like `#1042`, one per line and nothing else.", solution: ["grep -oE '#[0-9]+' app.log"] } },
        question: { type: "widget", goal: { output: "#1042\n#1077" }, hint: "grep -o prints only the part of the line that matched, not the whole line." },
        explanation: "`grep -oE '#[0-9]+' app.log`. `-o` prints each match on its own line, which also handles lines with several matches.",
      },
      {
        kind: "question",
        title: "Digits only",
        body: "A file has the lines `42.0`, `4 2`, `-42` and `42`. Which line does `grep -E '^[0-9]+$'` print?",
        question: {
          type: "choice",
          options: ["`42.0`", "`4 2`", "`-42`", "`42`"],
          answer: 3,
          feedback: { 0: "The dot is not a digit, and the pattern allows only digits from start to end.", 1: "The space breaks the run of digits.", 2: "The minus sign is not in `[0-9]`." },
          hint: "From the start of the line to the end, every character must be a digit.",
        },
        explanation: "Only **42** is made entirely of digits. To also allow a sign and decimals you would write something like `^-?[0-9]+(\\.[0-9]+)?$`.",
      },
      {
        kind: "recap",
        points: [
          "`grep -E 'pattern' file` prints matching lines; quote patterns in single quotes.",
          "Classes `[0-9]`, `[A-Z]`, `[[:digit:]]`; counts `+ * ? {n} {m,n}`; alternatives `(a|b)`.",
          "Validation needs `^…$`, or a line that merely *contains* a valid value passes.",
          "Ranges of numbers need alternatives: hours are `([01][0-9]|2[0-3])`.",
          "`-i` ignore case, `-v` invert, `-c` count, `-o` only the match.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 3. Counting words ───────────────────────────────
  {
    id: "fnd-iv-shell-3-counting",
    title: "Counting words with tr, sort and uniq",
    summary: "One word per line, then sort | uniq -c | sort -rn: the word-frequency pipeline and its pitfalls.",
    minutes: 12,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "The counting pipeline",
        body:
          "Counting things in text is one pipeline with interchangeable parts:\n\n" +
          sh(`
tr -s ' ' '\\n' < words.txt  |  sort  |  uniq -c  |  sort -rn  |  head -3
 one word per line              group    count      biggest     top 3
                                                    first
`) +
          "\n\n- `tr -s ' ' '\\n'` turns spaces into newlines (`-s` squeezes repeats, so double spaces don't make empty lines). `tr -cs 'A-Za-z' '\\n'` turns every run of non-letters into one newline, which also strips punctuation.\n" +
          "- `tr 'A-Z' 'a-z'` lower-cases, so `The` and `the` count together.\n" +
          "- `uniq -c` only merges **adjacent** equal lines, so `sort` must come first.\n" +
          "- `sort -rn` sorts by number, biggest first. Plain `sort` compares text, so `10` would come before `9`.\n" +
          "- `sort -u` is sort plus de-duplicate; pipe it into `wc -l` to count distinct items.\n" +
          "- `awk '{print $2, $1}'` swaps uniq's `count word` into `word count`.\n\n" +
          "**How to spot it:** \"frequency of each word\", \"most common\", \"top k\", \"how many distinct\", \"sorted by count\".",
      },
      {
        kind: "question",
        title: "Through the pipeline",
        body: "Follow six words through `sort | uniq -c | sort -rn` and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Counting b a b c a b",
            frames: [
              { array: ["b", "a", "b", "c", "a", "b"], code: ["tr -s ' ' '\\n'", "sort", "uniq -c", "sort -rn"], line: 1, note: "After `tr`: one word per line." },
              { array: ["1 b", "1 a", "1 b", "1 c", "1 a", "1 b"], line: 3, note: "If you skipped `sort`, `uniq -c` would only merge neighbours: nothing here is next to its twin, so every count is 1." },
              { array: ["a", "a", "b", "b", "b", "c"], line: 2, note: "With `sort` first, equal words sit together." },
              { array: ["2 a", "3 b", "1 c"], line: 3, note: "`uniq -c` collapses each run and prefixes its length.", pick: { prompt: "Which line will `sort -rn` put first?", answer: 1 } },
              { array: ["3 b", "2 a", "1 c"], highlight: [0], line: 4, note: "Numeric, reversed: **3 b** on top. Add `| head -1` for just the most common word." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer the pick.", hint: "sort -n compares the leading numbers, and -r puts the biggest first." },
        explanation: "The order matters: `sort` before `uniq -c` to group, then `sort -rn` to rank by count.",
      },
      {
        kind: "question",
        title: "One word per line",
        body: "`words.txt` holds colour names separated by spaces, over several lines.",
        widget: { type: "unix-terminal", props: { files: COUNT_FILES, task: "Print the words of `words.txt` one per line, in their original order.", suggest: ["cat words.txt"], solution: ["tr -s ' ' '\\n' < words.txt"] } },
        question: { type: "widget", goal: { output: "red\nblue\nred\ngreen\nblue\nred\nyellow\nred\ngreen\nblue" }, hint: "tr can replace every space with a newline; tr reads its input from a file with <." },
        explanation: "`tr -s ' ' '\\n' < words.txt`. `tr` doesn't take a file name, so the file comes in with `<` (or `cat words.txt | tr …`).",
      },
      {
        kind: "question",
        title: "Why sort first?",
        body: "Why does the pipeline need `sort` before `uniq -c`?",
        question: {
          type: "choice",
          options: ["uniq only reads sorted files and errors otherwise", "uniq -c merges only adjacent equal lines", "sort removes the duplicate words", "It doesn't: sort is only for a tidy output"],
          answer: 1,
          feedback: { 0: "uniq happily reads unsorted input; it just gives the wrong counts.", 2: "Plain sort keeps duplicates; that's `sort -u`." },
          hint: "Think back to the trace: what did uniq -c print when the words were not sorted?",
        },
        explanation: "`uniq` compares each line only with the one before it. Sorting puts equal words next to each other so each word becomes one run.",
      },
      {
        kind: "question",
        title: "How many colours?",
        body: "Count the **distinct** words in `words.txt`.",
        widget: { type: "unix-terminal", props: { files: COUNT_FILES, task: "Print the number of different words in `words.txt`.", solution: ["tr -s ' ' '\\n' < words.txt | sort -u | wc -l"] } },
        question: { type: "widget", goal: { output: "4" }, hint: "One word per line, then sort -u keeps one copy of each, then count the lines." },
        explanation: "`tr -s ' ' '\\n' < words.txt | sort -u | wc -l` prints **4**: red, blue, green, yellow.",
      },
      {
        kind: "question",
        title: "Word frequency",
        body: "Print each word of `words.txt` with how many times it appears, most frequent first, as `word count` lines. (No two words share a count here.)",
        widget: { type: "unix-terminal", props: { files: COUNT_FILES, task: "Print `word count` lines for `words.txt`, most frequent first.", solution: ["tr -s ' ' '\\n' < words.txt | sort | uniq -c | sort -rn | awk '{print $2, $1}'"] } },
        question: { type: "widget", goal: { output: "red 4\nblue 3\ngreen 2\nyellow 1" }, hint: "One word per line, sort, uniq -c, sort -rn, then swap the two columns with awk." },
        explanation: "`tr -s ' ' '\\n' < words.txt | sort | uniq -c | sort -rn | awk '{print $2, $1}'`. When counts tie, `sort -rn` falls back to comparing whole lines; add `-k2` keys if the problem specifies a tie order.",
      },
      {
        kind: "question",
        title: "Real text",
        body: "`reviews.txt` has capital letters and punctuation. `Fresh`, `fresh,` and `fresh` are the same word.",
        widget: { type: "unix-terminal", props: { files: COUNT_FILES, task: "Print the most common word in `reviews.txt` (ignoring case and punctuation) with its count.", suggest: ["cat reviews.txt"], solution: ["tr -cs 'A-Za-z' '\\n' < reviews.txt | tr 'A-Z' 'a-z' | sort | uniq -c | sort -rn | head -1"] } },
        question: { type: "widget", goal: { outputMatches: "^\\s*(3 fresh|fresh 3)$" }, hint: "tr -cs 'A-Za-z' '\\n' splits on anything that isn't a letter; a second tr lower-cases. Then count as before and keep the top line." },
        explanation: "`tr -cs 'A-Za-z' '\\n' < reviews.txt | tr 'A-Z' 'a-z' | sort | uniq -c | sort -rn | head -1` prints `3 fresh`. `-c` complements the set (everything that is *not* a letter) and `-s` squeezes each run into one newline.",
      },
      {
        kind: "question",
        title: "Distinct words, cleaned",
        body: "Ignoring case and punctuation, how many different words does `reviews.txt` contain? Use the terminal to find out.",
        widget: { type: "unix-terminal", props: { files: COUNT_FILES, suggest: ["tr -cs 'A-Za-z' '\\n' < reviews.txt"] }, live: true },
        question: { type: "number", answer: 9, unit: "words", hint: "Clean the words as in the last step, then sort -u and count the lines." },
        explanation: "**9**: bread, coffee, day, every, fresh, service, the, warm, was. `… | tr 'A-Z' 'a-z' | sort -u | wc -l` counts them.",
      },
      {
        kind: "recap",
        points: [
          "`tr -s ' ' '\\n'` gives one word per line; `tr -cs 'A-Za-z' '\\n'` also drops punctuation; `tr 'A-Z' 'a-z'` lower-cases.",
          "`sort | uniq -c` counts, because uniq only merges **adjacent** lines.",
          "`sort -rn` ranks by count; `head -k` keeps the top k; `awk '{print $2, $1}'` swaps the columns.",
          "`sort -u | wc -l` counts distinct items.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 4. Columns with cut and awk ───────────────────────────────
  {
    id: "fnd-iv-shell-4-columns",
    title: "Columns with cut and awk",
    summary: "Pick fields, total a column, group with awk arrays, sort by a field, and transpose a table.",
    minutes: 12,
    xp: 70,
    level: "Intermediate",
    steps: [
      {
        kind: "explain",
        title: "Fields",
        body:
          "Tabular text is lines of **fields**. Two tools pick them out:\n\n" +
          "- `cut -d, -f2 file` prints field 2, splitting on commas. `-f1,3` and `-f2-` pick several. cut splits on **every single** delimiter, so two spaces in a row make an empty field.\n" +
          "- `awk -F, '{print $2}' file` does the same, and more: `$1 … $NF` are the fields, `NF` is how many there are, `NR` the line number. With no `-F`, awk splits on **runs** of spaces and tabs, so ragged columns are fine.\n\n" +
          "awk programs are `condition { action }` pairs, plus `BEGIN { }` before the input and `END { }` after it. Variables start at 0 or empty, and arrays are dictionaries:\n\n" +
          sh(`
awk -F, 'NR > 1 { s += $3 } END { print s }' scores.csv         # total of column 3, skipping the header
awk -F, 'NR > 1 { t[$2] += $3 } END { for (k in t) print k, t[k] }' scores.csv | sort
sort -t, -k3,3nr scores.csv                                      # sort by column 3, as numbers, biggest first
`) +
          "\n\n`for (k in t)` visits keys in no guaranteed order, so pipe the result through `sort` when order matters.\n\n" +
          "**How to spot it:** CSV or space-separated data, \"print the second column\", \"total per\", \"sorted by\", \"transpose\".",
        widget: { type: "unix-terminal", props: { files: COLUMN_FILES, suggest: ["cat scores.csv", "cut -d, -f2 scores.csv", "awk -F, '{print NR, $1}' scores.csv"] } },
      },
      {
        kind: "question",
        title: "Just the names",
        body: "`scores.csv` has a header line `name,team,points` and one player per line.",
        widget: { type: "unix-terminal", props: { files: COLUMN_FILES, task: "Print the `name` column of `scores.csv`, without the header.", solution: ["tail -n +2 scores.csv | cut -d, -f1"] } },
        question: { type: "widget", goal: { output: "ada\nlinus\ngrace\nalan\nbarbara\nken" }, hint: "Skip the first line with tail -n +2 (or awk's NR > 1), then take field 1 split on commas." },
        explanation: "`tail -n +2 scores.csv | cut -d, -f1`, or in one tool: `awk -F, 'NR > 1 {print $1}' scores.csv`.",
      },
      {
        kind: "question",
        title: "Total points",
        body: "Add up the `points` column.",
        widget: { type: "unix-terminal", props: { files: COLUMN_FILES, task: "Print the total of the `points` column of `scores.csv`.", solution: ["awk -F, 'NR > 1 { s += $3 } END { print s }' scores.csv"] } },
        question: { type: "widget", goal: { output: "58" }, hint: "In awk, add $3 to a variable on every line after the header, and print it in an END block." },
        explanation: "`awk -F, 'NR > 1 { s += $3 } END { print s }' scores.csv` prints **58**. (Even without `NR > 1`, the header's `points` counts as 0 in a sum, but skipping it is clearer.)",
      },
      {
        kind: "question",
        title: "Ragged spaces",
        body: "`spaced.txt` contains:\n\n" + sh("ada   12\nlinus 7") + "\n\nWhat does `cut -d' ' -f2 spaced.txt` print on its **first** line?",
        widget: { type: "unix-terminal", props: { files: COLUMN_FILES, suggest: ["cut -d' ' -f2 spaced.txt", "awk '{print $2}' spaced.txt"] }, after: true },
        question: {
          type: "choice",
          options: ["`12`", "`ada`", "An empty line", "An error about the spaces"],
          answer: 2,
          feedback: { 0: "That's what `awk '{print $2}'` gives, because awk splits on runs of spaces.", 1: "`ada` is field 1." },
          hint: "cut treats each single space as a separator. What sits between the first and second space?",
        },
        explanation: "Between the first and second space there is nothing, so field 2 is **empty**. cut is for clean single-character separators; awk's default splitting handles ragged spacing.",
      },
      {
        kind: "question",
        title: "Points per team",
        body: "Total the points for each team.",
        widget: { type: "unix-terminal", props: { files: COLUMN_FILES, task: "Print `team total` lines for `scores.csv`, sorted by team name.", solution: ["awk -F, 'NR > 1 { t[$2] += $3 } END { for (k in t) print k, t[k] }' scores.csv | sort"] } },
        question: { type: "widget", goal: { output: "blue 18\ngreen 19\nred 21" }, hint: "Use an awk array keyed by the team ($2), add $3 into it, print every key in END, and sort the result." },
        explanation: "`awk -F, 'NR > 1 { t[$2] += $3 } END { for (k in t) print k, t[k] }' scores.csv | sort`. The array does the grouping; `sort` fixes the order, since `for (k in t)` promises none.",
      },
      {
        kind: "question",
        title: "Top scorer",
        body: "Find the player with the most points, by sorting on the third column.",
        widget: { type: "unix-terminal", props: { files: COLUMN_FILES, task: "Print only the name of the player with the most points.", solution: ["tail -n +2 scores.csv | sort -t, -k3,3nr | head -n 1 | cut -d, -f1"] } },
        question: { type: "widget", goal: { output: "alan" }, hint: "sort -t, -k3,3nr sorts by field 3 as a number, biggest first. Skip the header first, then keep one line and cut the name." },
        explanation: "`tail -n +2 scores.csv | sort -t, -k3,3nr | head -n 1 | cut -d, -f1`. `-k3,3` limits the key to field 3 only; `n` compares numbers and `r` reverses. awk can do it in one pass too: `awk -F, 'NR > 1 && $3 > m { m = $3; who = $1 } END { print who }'`.",
      },
      {
        kind: "question",
        title: "Transposing a table",
        body: "To transpose, awk stores every cell in `a[row, column]` while reading, then prints column by column at the end. Follow it on `matrix.txt` and answer the picks.",
        widget: {
          type: "iv-trace",
          props: {
            title: "Rows become columns",
            frames: [
              { grid: MATRIX_GRID, cells: [], code: TRANSPOSE_CODE, line: 1, vars: { NR: 0 }, note: "Three lines of four fields each." },
              { cells: [0, 1, 2, 3].map((c) => ({ r: 0, c, tone: "active" as const })), line: 1, vars: { NR: 1, NF: 4 }, note: "Line 1 is read: `a[1,1] = day`, `a[1,2] = mon` … `a[1,4] = wed`." },
              { cells: [0, 1, 2, 3].flatMap((c) => [0, 1, 2].map((r) => ({ r, c, tone: "done" as const }))), line: 3, vars: { NR: 3, NF: 4 }, note: "All three lines stored. In END, output line i is input column i, read top to bottom." },
              { cells: col(0, "path"), line: 6, vars: { i: 1, s: "day cups cakes" }, note: "Output line 1 is column 1: `day cups cakes`." },
              { cells: col(0, "done"), line: 4, vars: { i: 2 }, note: "Now i = 2, and `s` starts from `a[1, 2]`.", pick: { prompt: "Which cell starts output line 2?", answer: "0,1" } },
              { cells: [...col(0, "done"), ...col(1, "path")], line: 6, vars: { i: 2, s: "mon 3 1" }, note: "Output line 2: `mon 3 1`." },
              { cells: [...col(0, "done"), ...col(1, "done")], line: 5, vars: { i: 4 }, note: "Skip ahead to the last output line, i = 4.", pick: { prompt: "Which cell ends the last output line?", answer: "2,3" } },
              { cells: [...col(0, "done"), ...col(1, "done"), ...col(2, "done"), ...col(3, "path")], line: 6, vars: { i: 4, s: "wed 2 4" }, note: "Output line 4: `wed 2 4`. Four output lines of three fields." },
            ],
          },
        },
        question: { type: "widget", goal: { picked: true }, prompt: "Answer both picks.", hint: "Output line i is input column i, read from the first row down to the last." },
        explanation: "A transpose has to see every line before it can print the first output line, so it keeps the whole table in memory: O(rows × columns).",
      },
      {
        kind: "question",
        title: "Transpose it",
        body: "Now run it. In `END`, awk's `NR` is the number of lines read and `NF` still holds the field count of the last line.",
        widget: { type: "unix-terminal", props: { files: COLUMN_FILES, task: "Print `matrix.txt` transposed: column 1 becomes line 1, and so on, fields separated by one space.", suggest: ["cat matrix.txt"], solution: ["awk '{ for (i = 1; i <= NF; i++) a[NR, i] = $i } END { for (i = 1; i <= NF; i++) { s = a[1, i]; for (j = 2; j <= NR; j++) s = s \" \" a[j, i]; print s } }' matrix.txt"] } },
        question: { type: "widget", goal: { output: "day cups cakes\nmon 3 1\ntue 5 0\nwed 2 4" }, hint: "Store each field in a[NR, i]. In END, loop over columns i, build a string from a[1, i] to a[NR, i] with spaces between, and print it." },
        explanation: "`awk '{ for (i = 1; i <= NF; i++) a[NR, i] = $i } END { for (i = 1; i <= NF; i++) { s = a[1, i]; for (j = 2; j <= NR; j++) s = s \" \" a[j, i]; print s } }' matrix.txt`. Starting `s` from the first row avoids a leading space.",
      },
      {
        kind: "recap",
        points: [
          "`cut -d, -fN` for clean delimiters; awk (`$1 … $NF`, `-F`) for everything else, including ragged spaces.",
          "awk: `NR > 1` skips a header, `s += $3` totals, `END { }` prints at the end.",
          "Group with an array, `t[$2] += $3`, and pipe `for (k in t)` through `sort`, because its order isn't defined.",
          "`sort -t, -k3,3nr` sorts by one field, numerically, biggest first.",
          "Transpose by storing `a[NR, i]` and printing column by column in `END`.",
        ],
      },
    ],
  },

  // ─────────────────────────────── 5. Putting pipelines together ───────────────────────────────
  {
    id: "fnd-iv-shell-5-pipelines",
    title: "Putting pipelines together",
    summary: "Filter, extract, normalise, count, rank: build log-analysis one-liners stage by stage.",
    minutes: 12,
    xp: 80,
    level: "Advanced",
    steps: [
      {
        kind: "explain",
        title: "Build it a stage at a time",
        body:
          "Almost every one-liner is the same five stages, each optional:\n\n" +
          "1. **Filter** the lines you care about: `grep`, or an awk condition like `$4 == 404`.\n" +
          "2. **Extract** the field: `cut`, `awk '{print $3}'`, `grep -o`.\n" +
          "3. **Normalise** it: `tr` for case, `sed -E 's/…/…/'` to rewrite.\n" +
          "4. **Count** or total: `sort | uniq -c`, `sort -u | wc -l`, `awk '{ s += $5 } END { print s }'`.\n" +
          "5. **Rank** and trim: `sort -rn | head -n 3`, then `awk` to put columns in the asked-for order.\n\n" +
          "Write it left to right and run it after each `|`, checking the output before adding the next stage. Matching a **field** is safer than matching text anywhere on the line: `grep 404` would also match a 4040-byte response.\n\n" +
          "`sed -E 's/(…)-(…)/\\2-\\1/'` rewrites with groups: `\\1` is whatever the first parentheses matched. Any character can delimit the parts, so `s#a/b#c#` avoids escaping slashes.\n\n" +
          "`&&` runs the next command only if the previous one succeeded, `||` only if it failed: `grep -q ERROR log || echo clean`.\n\n" +
          "Below, `access.log` has fields: IP, method, path, status, bytes.",
        widget: { type: "unix-terminal", props: { files: PIPE_FILES, suggest: ["cat access.log", "cut -d' ' -f1 access.log", "awk '{print $4}' access.log | sort | uniq -c"] } },
      },
      {
        kind: "question",
        title: "Order the stages",
        body: "Put these stages in order to print the 2 IP addresses with the most requests, each with its count.",
        question: {
          type: "order",
          items: ["`cut -d' ' -f1 access.log`", "`sort`", "`uniq -c`", "`sort -rn`", "`head -n 2`"],
          hint: "Extract first, then group so equal values are adjacent, then count, then rank, then trim.",
        },
        explanation: "`cut -d' ' -f1 access.log | sort | uniq -c | sort -rn | head -n 2`: extract, group, count, rank, trim.",
      },
      {
        kind: "question",
        title: "Busiest visitors",
        body: "Now type it, and finish with the columns as `ip count`.",
        widget: { type: "unix-terminal", props: { files: PIPE_FILES, task: "Print the 2 IPs with the most requests in `access.log` as `ip count` lines, busiest first.", solution: ["cut -d' ' -f1 access.log | sort | uniq -c | sort -rn | head -n 2 | awk '{print $2, $1}'"] } },
        question: { type: "widget", goal: { output: "10.0.0.5 4\n10.0.0.7 3" }, hint: "The pipeline from the last step, plus awk '{print $2, $1}' to swap the columns." },
        explanation: "`cut -d' ' -f1 access.log | sort | uniq -c | sort -rn | head -n 2 | awk '{print $2, $1}'`.",
      },
      {
        kind: "question",
        title: "Broken links",
        body: "Find which paths returned **404**, and how often.",
        widget: { type: "unix-terminal", props: { files: PIPE_FILES, task: "Print `path count` for every path that got a 404, most frequent first.", solution: ["awk '$4 == 404 {print $3}' access.log | sort | uniq -c | sort -rn | awk '{print $2, $1}'"] } },
        question: { type: "widget", goal: { output: "/missing.png 2\n/old.html 1" }, hint: "Filter on the status field with awk ($4 == 404), print the path ($3), then count and rank as before." },
        explanation: "`awk '$4 == 404 {print $3}' access.log | sort | uniq -c | sort -rn | awk '{print $2, $1}'`. Testing `$4` checks the status field only.",
      },
      {
        kind: "question",
        title: "Why match the field?",
        body: "Why is `awk '$4 == 404'` safer than `grep 404` for finding failed requests?",
        question: {
          type: "choice",
          options: ["grep also matches 404 in other fields", "grep can't read log files with spaces", "awk runs faster than grep on small files", "grep only matches whole words, not numbers"],
          answer: 0,
          feedback: { 1: "grep reads any text file.", 3: "Plain grep matches anywhere in the line, which is exactly the problem; `-w` would make it match whole words." },
          hint: "Imagine a line whose byte count is 4040, or a path like /404.html.",
        },
        explanation: "`grep 404` would also match a size of `4040` bytes or a path `/err404.png`. `$4 == 404` compares only the status column.",
      },
      {
        kind: "question",
        title: "Bytes served",
        body: "Total the bytes (field 5) of the successful requests (status 200).",
        widget: { type: "unix-terminal", props: { files: PIPE_FILES, task: "Print the total bytes of all status-200 requests in `access.log`.", solution: ["awk '$4 == 200 { s += $5 } END { print s }' access.log"] } },
        question: { type: "widget", goal: { output: "2688" }, hint: "One awk program: a condition on $4, add $5 to a total, print it in END." },
        explanation: "`awk '$4 == 200 { s += $5 } END { print s }' access.log` prints **2688** (512 + 1024 + 128 + 512 + 512).",
      },
      {
        kind: "question",
        title: "Distinct visitors",
        body: "How many different IP addresses appear in the log?",
        widget: { type: "unix-terminal", props: { files: PIPE_FILES, task: "Print the number of distinct IPs in `access.log`.", solution: ["cut -d' ' -f1 access.log | sort -u | wc -l"] } },
        question: { type: "widget", goal: { output: "3" }, hint: "Extract the IP field, keep one copy of each with sort -u, then count lines." },
        explanation: "`cut -d' ' -f1 access.log | sort -u | wc -l` prints **3**. `awk '!seen[$1]++' access.log | wc -l` is a classic alternative that keeps the first line for each IP.",
      },
      {
        kind: "question",
        title: "Rewrite the dates",
        body: "`shipped.txt` has ISO dates like `2026-11-18`. The report needs `18/11/2026`.",
        widget: { type: "unix-terminal", props: { files: PIPE_FILES, task: "Print `shipped.txt` with every date rewritten from `YYYY-MM-DD` to `DD/MM/YYYY`.", suggest: ["cat shipped.txt"], solution: ["sed -E 's#([0-9]{4})-([0-9]{2})-([0-9]{2})#\\3/\\2/\\1#' shipped.txt"] } },
        question: { type: "widget", goal: { output: "order 17 shipped 18/11/2026\norder 18 shipped 19/11/2026\norder 21 returned 02/12/2026" }, hint: "Capture the year, month and day in three groups with sed -E, and write them back as \\3/\\2/\\1. Use # as the delimiter to avoid escaping the slashes." },
        explanation: "`sed -E 's#([0-9]{4})-([0-9]{2})-([0-9]{2})#\\3/\\2/\\1#' shipped.txt`. The groups are numbered by their opening parenthesis, and `#` as the delimiter means the `/` in the output needs no backslash.",
      },
      {
        kind: "question",
        title: "Success or failure",
        body: "No request in `access.log` has status 500. What does this print?\n\n" + sh("grep -q ' 500 ' access.log && echo 'server errors' || echo 'all clear'"),
        widget: { type: "unix-terminal", props: { files: PIPE_FILES, suggest: ["grep -q ' 500 ' access.log && echo 'server errors' || echo 'all clear'"] }, after: true },
        question: {
          type: "choice",
          options: ["`server errors`", "`all clear`", "Both lines", "Nothing, because -q is quiet"],
          answer: 1,
          feedback: { 0: "That runs only if grep found a match.", 2: "`&&` is skipped when grep fails, and `||` runs only then.", 3: "`-q` silences grep, not echo." },
          hint: "grep -q prints nothing but exits with success when it finds a match and failure when it doesn't.",
        },
        explanation: "grep finds no match, so it fails: `&& echo 'server errors'` is skipped and `|| echo 'all clear'` runs. **all clear**.",
      },
      {
        kind: "recap",
        points: [
          "Filter, extract, normalise, count, rank: build the pipeline left to right and run it after each stage.",
          "Match fields (`awk '$4 == 404'`), not text anywhere on the line.",
          "`sort | uniq -c | sort -rn | head` ranks; `sort -u | wc -l` counts distinct; `awk '{ s += $5 } END { print s }'` totals.",
          "`sed -E 's#(…)-(…)#\\2/\\1#'` rewrites with groups; pick a delimiter that isn't in the text.",
          "`&&` runs on success, `||` on failure.",
        ],
      },
    ],
  },
];

export const ivShellModule: Module = {
  id: "iv-shell",
  part: "interview",
  title: "Shell one-liners",
  blurb: "Reading lines, matching patterns, counting words and reshaping columns with grep, sed, awk and friends.",
  icon: "terminal",
  lessons,
};
