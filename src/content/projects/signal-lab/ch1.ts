import type { Chapter } from "@/engine/types";
import { md, py } from "./util.ts";

/**
 * Chapter 1: Tune the receiver. Plain string work, no regular expressions yet.
 *
 * The raw line format (see the learner's SAMPLE):
 *   <20-char UTC stamp><noise> call @ freq az=.. el=.. snr=.. "message" #checksum <noise>
 * The checksum is the sum of the message's character codes, mod 256, as two hex digits.
 */

export const chapter1: Chapter = {
  id: "tune",
  title: "Tune the receiver",
  blurb: "Slice, strip, split and format text until the noise gives way to a clean readout.",
  lessons: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "signal-lab-1-stamp",
      title: "Slice the stamp",
      minutes: 12,
      xp: 70,
      concepts: ["indexing", "slicing", "negative indexes", "step", "immutability"],
      learn: md`### A string is a row of numbered boxes

Every character in a string has a position called its **index**, and counting starts at **0**.

~~~python
stamp = "2087-03-14T02:17:45Z"
stamp[0]      # '2'
stamp[4]      # '-'
len(stamp)    # 20
stamp[-1]     # 'Z'   negative numbers count from the end
stamp[-2]     # '5'
~~~

Asking for a position that does not exist (\`stamp[20]\`) raises an \`IndexError\`.

### Slicing: \`text[start:stop:step]\`

A slice copies a stretch of the string. **start** is included, **stop is not**, and either can be left out.

~~~python
stamp[:10]     # '2087-03-14'   from the beginning up to (not including) index 10
stamp[11:19]   # '02:17:45'     characters 11 to 18
stamp[11:]     # '02:17:45Z'    from 11 to the end
stamp[-9:]     # '02:17:45Z'    the last nine characters
stamp[:-1]     # '2087-03-14T02:17:45'   everything except the last one
~~~

A handy picture: indexes point at the *gaps between* characters, and a slice cuts at two gaps. That is why \`stamp[11:19]\` has \`19 - 11 = 8\` characters. Unlike a single index, a slice never raises \`IndexError\`: \`stamp[15:999]\` quietly stops at the end.

The optional third number is the **step**. A negative step walks backwards.

~~~python
"A1B2C3"[::2]    # 'ABC'      every 2nd character, from the start
"A1B2C3"[1::2]   # '123'      every 2nd character, starting at index 1
"radar"[::-1]    # 'radar'    reversed
"KX-204"[::-1]   # '402-XK'
~~~

### Strings are immutable

You can read inside a string but never change it in place.

~~~python
code = "KX-204"
code[0] = "Q"            # TypeError: 'str' object does not support item assignment
code = "Q" + code[1:]    # build a NEW string from pieces instead
~~~

The same holds for every string method: \`code.upper()\` returns a new string and leaves \`code\` alone, so you must use the result (\`code = code.upper()\`).

### When slicing is the right tool

Slicing is perfect for **fixed-width** formats, where a field always sits at the same offset, like this 20-character stamp. It is a bad tool when the position changes from line to line; for those we will use \`find\`, \`split\` and, soon, regular expressions.

### Common mistakes

- Off-by-one: the stop index is excluded. \`text[11:19]\`, not \`text[11:18]\`.
- Expecting \`text[0] = "x"\` to work. Rebuild the string instead.
- Writing \`line.strip()\` on its own line and expecting \`line\` to change.`,
      mission: md`Everything the dish hears is logged with a **20-character UTC stamp** in front, followed by whatever came out of the antenna. Because the stamp is fixed-width, slicing is exactly the right tool.

Take the stamp apart, split a call sign, un-weave a probe that interleaves two data streams, and rebuild a line with a corrected date. When this lesson passes, the **Incoming stream** console powers on and your \`read_stamp\` colours the time of every transmission.`,
      tasks: [
        "read_stamp(raw): return a dict with date (\"2087-03-14\"), time (\"02:17:45\") and hour (the int 2)",
        "call_parts(call): return the first two letters and the last three characters, using a negative index",
        "deinterleave(stream): return the even-position and odd-position characters as a pair (\"A1B2C3\" gives (\"ABC\", \"123\"))",
        "restamp(raw, new_date): return the same line with its first 10 characters replaced",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 1: slice the stamp.
# A raw line exactly as the dish logged it. The first 20 characters are the UTC stamp.
SAMPLE = '2087-03-14T02:17:45Z  ~^~  kx-204 @ 1420.405mhz  az=047.5 el=+32.0  snr=18.2dB  "Kepler relay online"  #45 ~^~  '
STAMP_LEN = 20

def read_stamp(raw):
    # return {"date": "2087-03-14", "time": "02:17:45", "hour": 2}
    ...

def call_parts(call):
    # "KX-204" -> ("KX", "204"). Use a negative index for the end.
    ...

def deinterleave(stream):
    # "A1B2C3" -> ("ABC", "123")
    ...

def restamp(raw, new_date):
    # the same line with its first 10 characters (the date) replaced by new_date
    ...`,
      solutionAdd: py`SAMPLE = '2087-03-14T02:17:45Z  ~^~  kx-204 @ 1420.405mhz  az=047.5 el=+32.0  snr=18.2dB  "Kepler relay online"  #45 ~^~  '
STAMP_LEN = 20

def read_stamp(raw):
    return {"date": raw[:10], "time": raw[11:19], "hour": int(raw[11:13])}

def call_parts(call):
    return call[:2], call[-3:]

def deinterleave(stream):
    return stream[::2], stream[1::2]

def restamp(raw, new_date):
    return new_date + raw[10:]`,
      explanation:
        "The stamp always has the same shape, so fixed slices work: [:10] is the date, [11:19] the clock, [11:13] the hour (int() turns the two digits into a number). Negative indexes count from the end, which is how call[-3:] finds the digits no matter how long the prefix is. A step of 2 picks every second character, and starting the slice at 1 picks the other stream. Because strings are immutable, restamp builds a brand new string from the new date plus everything after the old one.",
      hints: [
        { id: "h1", title: "Slice syntax", content: "text[start:stop] includes start and excludes stop. The date is the first 10 characters: raw[:10]. The clock starts at index 11 and ends before index 19." },
        { id: "h2", title: "Hour and call sign", content: "The hour is two characters, raw[11:13], wrapped in int(). For the call sign use call[:2] for the letters and call[-3:] for the last three characters." },
        { id: "h3", title: "Steps and rebuilding", content: "stream[::2] takes every second character from index 0 and stream[1::2] from index 1; return both separated by a comma. For restamp, glue the new date onto raw[10:] with +." },
      ],
      tests: [
        {
          id: "t1",
          description: "read_stamp returns the date, time and hour",
          assertionCode: py`
line = '2087-03-14T02:17:45Z  ~^~  kx-204 @ 1420.405mhz  az=047.5 el=+32.0  snr=18.2dB  "Kepler relay online"  #45 ~^~  '
got = read_stamp(line)
assert isinstance(got, dict), "read_stamp should return a dict with the keys date, time and hour"
assert got.get("date") == "2087-03-14", f"date should be '2087-03-14' (the first 10 characters) but is {got.get('date')!r}"
assert got.get("time") == "02:17:45", f"time should be '02:17:45' (characters 11 to 18) but is {got.get('time')!r}"
assert got.get("hour") == 2 and type(got.get("hour")) is int, f"hour should be the int 2, but is {got.get('hour')!r}. Slice two characters and wrap them in int()"
`,
        },
        {
          id: "t2",
          description: "read_stamp works for any stamp, not just the sample",
          assertionCode: py`
got = read_stamp("2087-12-31T23:59:58Z whatever follows")
assert got.get("date") == "2087-12-31", f"date was {got.get('date')!r}. Use fixed slices so it works for every line"
assert got.get("time") == "23:59:58", f"time was {got.get('time')!r}"
assert got.get("hour") == 23, f"hour was {got.get('hour')!r}; it should be the int 23"
`,
        },
        {
          id: "t3",
          description: "call_parts splits letters from digits, leading zeros kept",
          assertionCode: py`
assert tuple(call_parts("KX-204")) == ("KX", "204"), f"call_parts('KX-204') should be ('KX', '204') but is {call_parts('KX-204')!r}"
assert tuple(call_parts("TN-099")) == ("TN", "099"), f"call_parts('TN-099') should be ('TN', '099') but is {call_parts('TN-099')!r}. Keep it a string so the leading zero survives"
`,
        },
        {
          id: "t4",
          description: "deinterleave splits two woven streams, including odd lengths and empty text",
          assertionCode: py`
assert tuple(deinterleave("A1B2C3")) == ("ABC", "123"), f"deinterleave('A1B2C3') should be ('ABC', '123') but is {deinterleave('A1B2C3')!r}"
assert tuple(deinterleave("A1B2C")) == ("ABC", "12"), f"an odd-length stream has one extra character in the first half: expected ('ABC', '12') but got {deinterleave('A1B2C')!r}"
assert tuple(deinterleave("")) == ("", ""), "an empty stream should give two empty strings"
`,
        },
        {
          id: "t5",
          description: "restamp swaps the date without changing anything else (or the original)",
          assertionCode: py`
original = '2087-03-14T02:17:45Z  ~^~ kx-204 #45'
fixed = restamp(original, "2087-04-01")
assert fixed == '2087-04-01T02:17:45Z  ~^~ kx-204 #45', f"restamp should replace only the first 10 characters but returned {fixed!r}"
assert len(fixed) == len(original), "the new line should be exactly as long as the old one"
assert original == '2087-03-14T02:17:45Z  ~^~ kx-204 #45', "the original string must be untouched; strings are immutable, so build a new one"
`,
        },
      ],
      unlocks: ["sl-stream"],
      checks: [
        {
          prompt: "What does `\"2087-03-14T02:17:45Z\"[11:19]` give?",
          question: { type: "choice", options: ["`02:17:45`", "`02:17:45Z`", "`2:17:4`", "`T02:17:45`"], answer: 0 },
          explanation: "Index 11 is the `0` right after the `T`, and the slice stops *before* index 19, which is the `Z`. Eight characters: `11 .. 18`.",
        },
        {
          prompt: "With `code = \"KX-204\"`, which line raises an error?",
          question: {
            type: "choice",
            options: ["`code = \"Q\" + code[1:]`", "`code[0] = \"Q\"`", "`code[::-1]`", "`code[-1]`"],
            answer: 1,
          },
          explanation: "Strings are immutable, so assigning to a position raises a `TypeError`. The other lines read from the string or build a new one, which is always allowed.",
        },
        {
          prompt: "How many characters are in `\"A1B2C3\"[1::2]`?",
          question: { type: "number", answer: 3 },
          explanation: "Starting at index 1 and taking every second character gives `1`, `2`, `3`: the digits of the woven stream.",
        },
      ],
    },

    // ───────────────────────── 2 ─────────────────────────
    {
      id: "signal-lab-2-scrub",
      title: "Scrub the noise",
      minutes: 14,
      xp: 80,
      concepts: ["strip / lstrip / rstrip", "split + join", "replace", "escape sequences", "raw strings"],
      learn: md`### Methods hand back new strings

The \`strip\` family removes characters from the **ends** of a string.

~~~python
"  hello \n".strip()             # 'hello'      no argument: whitespace
"~^~ hello ~^~".strip("~^ ")     # 'hello'      an argument: a SET of characters
"xxhixx".lstrip("x")             # 'hixx'       left end only
"xxhixx".rstrip("x")             # 'xxhi'       right end only
~~~

The argument is a *set of characters*, not a word. \`"cab".strip("ab")\` returns \`'c'\`: Python keeps peeling \`a\` and \`b\` off either end until it meets something else. To remove one exact prefix or suffix use \`removeprefix\` and \`removesuffix\`:

~~~python
"#45".removeprefix("#")          # '45'
"report.txt".removesuffix(".txt")  # 'report'
~~~

### replace

\`replace(old, new)\` swaps every occurrence; a third argument limits how many.

~~~python
"a-b-c".replace("-", "")       # 'abc'
"a-b-c".replace("-", " ", 1)   # 'a b-c'
~~~

It is case-sensitive and works on literal text, not patterns. That is what regular expressions are for, later on.

### Collapse messy spacing: split, then join

Called with no argument, \`split()\` cuts on **any run of whitespace** (spaces, tabs, newlines) and drops the empty pieces. \`separator.join(list)\` glues strings back together with the separator between them.

~~~python
"a   b\t c".split()                 # ['a', 'b', 'c']
" ".join("a   b\t c".split())       # 'a b c'
"-".join(["KX", "204"])             # 'KX-204'
~~~

Notice that \`join\` is a method of the *separator*. Careful: \`"a  b".split(" ")\` (a space argument) keeps empty strings: \`['a', '', 'b']\`. Plain \`split()\` is almost always what you want for messy text.

One honest caveat: collapsing whitespace also flattens spaces inside a quoted message. Our dish never puts a double space in a message, but a production decoder would only collapse *outside* the quotes.

### Escape sequences and raw strings

A backslash inside a normal string starts an **escape sequence**:

- \`\n\` is a newline, \`\t\` a tab, and \`\r\` a carriage return (old Windows line endings are \`\r\n\`)
- \`\\\` is one literal backslash,\`\"\` is a double quote inside a double-quoted string

That is a problem for Windows-style paths or regular expressions, which are full of backslashes. \`"D:\raw"\` contains a **carriage return**, not a backslash and an r. A **raw string** (prefix \`r\`) turns escapes off:

~~~python
len("D:\raw")     # 5   D  :  <CR>  a  w
len(r"D:\raw")    # 6   D  :  \  r  a  w
print(repr("a\tb"))   # 'a\tb'   repr() shows the escapes instead of acting on them
~~~

A raw string cannot end in a single backslash. You will write nearly every regular expression as \`r"..."\`.

### Common mistakes

- Thinking \`strip("abc")\` removes the text \`abc\`. It removes any of those characters.
- Calling \`line.strip()\` and ignoring the result.
- Splitting on a single space and getting empty strings back.`,
      mission: md`Raw lines arrive wrapped in garbage: \`~^~\` guard marks, a random mix of spaces and tabs, sometimes a \`\r\n\` ending. The stamp is already handled from lesson 1; the rest of the line is the *payload*.

Write the filter that strips the payload clean and squeezes the gaps. The **Clean** column beside the raw stream lights up with your \`scrub\` output, and a noise meter shows what your \`margins\` found at each end.`,
      tasks: [
        "NOISE: a string holding every junk character to peel off: ~ ^ space, tab, carriage return and newline (use escape sequences)",
        "LOG_DIR: a raw string for the archive folder D:\\dish\\raw\\2087",
        "scrub(raw): drop the stamp, strip NOISE from both ends, collapse inner whitespace to single spaces",
        "margins(raw): return (left, right), how many NOISE characters sit at each end of the payload",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 2: scrub the noise.
NOISE = ...      # junk characters: ~ ^ space, tab, carriage return, newline
LOG_DIR = ...    # a RAW string for the archive folder:  D:\dish\raw\2087

def scrub(raw):
    # drop the 20-character stamp, strip NOISE from both ends,
    # then collapse any run of whitespace inside to a single space
    ...

def margins(raw):
    # after the stamp: how many NOISE characters sit at the left end, and at the right end?
    # return (left, right)
    ...`,
      solutionAdd: py`NOISE = "~^ \t\r\n"
LOG_DIR = r"D:\dish\raw\2087"

def scrub(raw):
    payload = raw[STAMP_LEN:].strip(NOISE)
    return " ".join(payload.split())

def margins(raw):
    payload = raw[STAMP_LEN:]
    left = len(payload) - len(payload.lstrip(NOISE))
    right = len(payload) - len(payload.rstrip(NOISE))
    return left, right`,
      explanation:
        "strip(NOISE) removes any of those characters from both ends in one call, so the wrapper marks and the whitespace go together. split() with no argument then cuts on every run of whitespace, and \" \".join(...) stitches the pieces back with single spaces. margins measures how much lstrip and rstrip removed by comparing lengths before and after, which is a neat way to count characters you have just discarded.",
      hints: [
        { id: "h1", title: "The payload", content: "Everything after the stamp is raw[STAMP_LEN:]. Start there: payload = raw[STAMP_LEN:]" },
        { id: "h2", title: "Peel and squeeze", content: "payload.strip(NOISE) removes the junk from both ends. Then \" \".join(text.split()) turns every run of spaces and tabs into one space." },
        { id: "h3", title: "Counting the margins", content: "len(payload) - len(payload.lstrip(NOISE)) is the number of characters removed on the left. Do the same with rstrip for the right. LOG_DIR needs an r in front of the quote: r\"D:\\dish\\raw\\2087\"." },
      ],
      tests: [
        {
          id: "t1",
          description: "NOISE holds ~ ^ space, tab, carriage return and newline",
          assertionCode: py`
assert isinstance(NOISE, str), "NOISE should be a string such as \"~^ \\t\\r\\n\" (that string is made of the junk characters)"
for ch, name in [("~", "tilde"), ("^", "caret"), (" ", "space"), ("\t", "tab"), ("\r", "carriage return"), ("\n", "newline")]:
    assert ch in NOISE, f"NOISE is missing the {name}. Use escape sequences like \\t, \\r and \\n inside the quotes"
`,
        },
        {
          id: "t2",
          description: "LOG_DIR keeps its backslashes (raw string)",
          assertionCode: py`
assert isinstance(LOG_DIR, str), "LOG_DIR should be a string"
assert LOG_DIR == "D:\\dish\\raw\\2087", f"LOG_DIR should be D:, then dish, raw and 2087 separated by single backslashes, but is {LOG_DIR!r}. Put an r before the opening quote"
`,
        },
        {
          id: "t3",
          description: "scrub removes the stamp and the wrapper noise",
          assertionCode: py`
line = '2087-03-14T02:17:45Z  ~^~  kx-204 @ 1420.405mhz  az=047.5 el=+32.0  snr=18.2dB  "Kepler relay online"  #45 ~^~  '
want = 'kx-204 @ 1420.405mhz az=047.5 el=+32.0 snr=18.2dB "Kepler relay online" #45'
got = scrub(line)
assert got == want, f"scrub should give {want!r} but gave {got!r}"
`,
        },
        {
          id: "t4",
          description: "scrub handles tabs and Windows line endings, and keeps letter case",
          assertionCode: py`
line = '2087-03-14T02:18:10Z\t^^  VR-077@1421.200MHZ\taz=134.8   EL=+57.0  SNR=27.1 dB "Beacon 3 nominal"\t#a9 ^^\r\n'
want = 'VR-077@1421.200MHZ az=134.8 EL=+57.0 SNR=27.1 dB "Beacon 3 nominal" #a9'
got = scrub(line)
assert got == want, f"scrub should give {want!r} but gave {got!r}. Strip \\r and \\n too, and do not change any letters"
`,
        },
        {
          id: "t5",
          description: "scrub of a line with only noise (or nothing) is an empty string",
          assertionCode: py`
assert scrub('2087-03-14T02:19:02Z   ~^~  ') == "", "a payload of only noise should scrub to an empty string"
assert scrub('2087-03-14T02:19:02Z') == "", "a line with only a stamp should scrub to an empty string"
`,
        },
        {
          id: "t6",
          description: "margins counts the noise at each end",
          assertionCode: py`
line = '2087-03-14T02:17:45Z  ~^~  kx-204 @ 1420.405mhz  az=047.5 el=+32.0  snr=18.2dB  "Kepler relay online"  #45 ~^~  '
got = tuple(margins(line))
assert got == (7, 6), f"margins should give (7, 6): 7 junk characters before kx-204 and 6 after #45. You returned {got!r}"
assert tuple(margins('2087-03-14T02:17:45Z' + 'KX-204')) == (0, 0), "a clean payload has no noise on either side"
`,
        },
      ],
      unlocks: ["sl-scrub"],
      checks: [
        {
          prompt: "What does `\"cab\".strip(\"ab\")` return?",
          question: { type: "choice", options: ["`c`", "`cab`", "`ab`", "an empty string"], answer: 0 },
          explanation: "`strip` treats its argument as a set of characters and keeps removing them from both ends. On the right it removes `b` then `a`; on the left it stops at once because `c` is not in the set.",
        },
        {
          prompt: "How many characters are in the string `\"a\\tb\"`?",
          question: { type: "number", answer: 3 },
          explanation: "`\\t` is one escape sequence that stands for a single tab character, so the string is `a`, tab, `b`: three characters.",
        },
        {
          prompt: "Why is `r\"D:\\dish\\raw\"` safer than `\"D:\\dish\\raw\"` for a Windows path?",
          question: {
            type: "choice",
            options: [
              "A raw string keeps backslashes as they are instead of reading `\\r`, `\\t` and so on as escapes",
              "A raw string makes the text lower case",
              "A raw string is faster",
              "A raw string cannot be changed",
            ],
            answer: 0,
          },
          explanation: "In a normal string `\\r` becomes a carriage return and would corrupt the path. The `r` prefix switches escape processing off, which is also why regular expressions are written as raw strings.",
        },
      ],
    },

    // ───────────────────────── 3 ─────────────────────────
    {
      id: "signal-lab-3-split",
      title: "Split, search, decide",
      minutes: 16,
      xp: 90,
      concepts: ["lower / upper / casefold", "find / index / count", "split / partition", "startswith / endswith", "isdigit / isalpha", "padding"],
      learn: md`### Case: lower, upper, casefold

~~~python
"Kepler".lower()       # 'kepler'
"Kepler".upper()       # 'KEPLER'
"kx-204".upper()       # 'KX-204'
~~~

When you only need to *compare*, use \`casefold()\`: it is lower-casing made aggressive enough for other alphabets (\`"Straße".casefold() == "STRASSE".casefold()\` is \`True\`, but with \`lower()\` it is \`False\`). The rule is: **normalise both sides the same way**, then compare.

### Finding things

~~~python
msg = "Telemetry burst [ack]"
"burst" in msg                  # True
msg.find("[")                   # 16     index of the first match
msg.find("zzz")                 # -1     not found
msg.index("zzz")                # ValueError: substring not found
msg.count("t")                  # 2      non-overlapping matches (case-sensitive)
msg.startswith("Tele")          # True
msg.endswith(("[ack]", "[ok]")) # True   a tuple means "any of these"
msg.find("t", 10)               # 14     search starting at index 10
~~~

\`find\` returns \`-1\` for "not found", and \`-1\` is also a perfectly valid index (the last character). So \`msg[msg.find("x"):]\` does not fail, it silently slices from the end. **Always test for \`-1\`** before using the result. \`index\` does the same job but raises \`ValueError\` instead.

### split, rsplit and partition

~~~python
"a=1;b=2".split(";")            # ['a=1', 'b=2']
"a=b=c".split("=", 1)           # ['a', 'b=c']     at most 1 split, from the left
"a=b=c".rsplit("=", 1)          # ['a=b', 'c']     ... from the right
"key=value".partition("=")      # ('key', '=', 'value')
"novalue".partition("=")        # ('novalue', '', '')
~~~

\`partition\` always returns exactly three pieces (before, the separator, after) even when the separator is missing, so you can unpack it without a length check. \`rpartition\` does the same from the right end. They are ideal for "cut at the first quote" or "cut at the last quote" jobs:

~~~python
head, _, rest = 'kx-204 "hello there" #45'.partition('"')
message, _, tail = rest.rpartition('"')
# head='kx-204 ', message='hello there', tail=' #45'
~~~

(\`_\` is just a normal variable name that means "I do not need this".)

### Quick character tests

\`isdigit()\`, \`isalpha()\`, \`isalnum()\`, \`isspace()\`, \`isupper()\` answer yes/no about *every* character, and are \`False\` for an empty string. They are for classifying, not for parsing numbers: \`"-5".isdigit()\` and \`"4.5".isdigit()\` are both \`False\`, and a few odd characters such as \`"²"\` count as digits.

### Padding

~~~python
"7".zfill(3)            # '007'
"KX".ljust(6, ".")      # 'KX....'
"KX".rjust(6)           # '    KX'
"hi".center(6, "*")     # '**hi**'
~~~

(Next lesson shows the more flexible f-string way.)

### Common mistakes

- Using \`find\` and forgetting the \`-1\` case.
- Comparing \`"KX-204" == user_input\` without normalising case.
- Calling \`split(" ")\` when you meant \`split()\`.
- Trusting \`isdigit()\` to validate numbers.`,
      mission: md`The cleaned line is a single string like \`kx-204 @ 1420.405mhz az=047.5 el=+32.0 snr=18.2dB "Kepler relay online" #45\`. Before any fancy tools, see how far plain string methods go: cut out the call sign, the quoted message and the claimed checksum; flag beacons; sanity-check a call sign; and pull out the first \`[tag]\` in a message.

The **Message decoder** panel lights up, showing the call sign, message, checksum and badges your functions produce.`,
      tasks: [
        "split_message(clean): return {\"call\": ..., \"message\": ..., \"checksum\": ...}. Use partition and rpartition around the quotes; call sign (the text before the @) in capitals; checksum without the # and in capitals",
        "is_beacon(message): True if the word \"beacon\" appears in any capitalisation",
        "looks_like_call(token): True for two letters, a dash and three digits (KX-204), using only string methods",
        "first_tag(message): the text inside the first [square brackets], or None when there is no complete tag (use find)",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 3: split, search, decide. Use string methods only (no regex yet).

def split_message(clean):
    # 'kx-204 @ 1420.405mhz ... "Kepler relay online" #45'
    #   -> {"call": "KX-204", "message": "Kepler relay online", "checksum": "45"}
    # An empty or odd line must not crash: missing parts become empty strings.
    ...

def is_beacon(message):
    # True if the word "beacon" is in the message, in any capitalisation
    ...

def looks_like_call(token):
    # "KX-204" -> True.  "K-2044", "KX-20A", "KX_204" -> False
    ...

def first_tag(message):
    # "Telemetry burst [ack] [relay]" -> "ack".  No complete [tag] -> None
    ...`,
      solutionAdd: py`def split_message(clean):
    head, _, rest = clean.partition('"')
    message, _, tail = rest.rpartition('"')
    call = head.partition("@")[0].strip().upper()
    return {
        "call": call,
        "message": message,
        "checksum": tail.strip().lstrip("#").upper(),
    }

def is_beacon(message):
    return "beacon" in message.casefold()

def looks_like_call(token):
    return len(token) == 6 and token[:2].isalpha() and token[2] == "-" and token[3:].isdigit()

def first_tag(message):
    start = message.find("[")
    if start == -1:
        return None
    end = message.find("]", start)
    if end == -1:
        return None
    return message[start + 1:end]`,
      explanation:
        "partition on the first quote and rpartition on the last quote isolate the message no matter what it contains, and neither can fail: a missing separator just leaves empty strings. The call sign is whatever sits before the @ in the head (partition on '@' again, because the spacing around it varies), and the tail holds the checksum after stripping spaces and the # marker. casefold() makes the beacon test ignore capitalisation. looks_like_call checks a fixed shape one piece at a time, which works but is clumsy; the next chapter replaces this kind of code with one pattern. first_tag shows the find rule: always check for -1 before slicing.",
      hints: [
        { id: "h1", title: "Cut around the quotes", content: "head, _, rest = clean.partition('\"') cuts at the first quote. Then message, _, tail = rest.rpartition('\"') cuts at the LAST quote. The call sign is whatever comes before the @ in head: head.partition(\"@\")[0]." },
        { id: "h2", title: "Tidy the pieces", content: "The spaces around @ vary, so strip them: head.partition(\"@\")[0].strip().upper(). For the checksum: tail.strip().lstrip(\"#\").upper(). partition never fails, so empty input is safe." },
        { id: "h3", title: "Checks and tags", content: "is_beacon: \"beacon\" in message.casefold(). looks_like_call: combine len(token) == 6, token[:2].isalpha(), token[2] == \"-\" and token[3:].isdigit(). first_tag: find(\"[\"), return None if -1, then find(\"]\", start) and slice between them." },
      ],
      tests: [
        {
          id: "t1",
          description: "split_message pulls out call sign, message and checksum",
          assertionCode: py`
clean = 'kx-204 @ 1420.405mhz az=047.5 el=+32.0 snr=18.2dB "Kepler relay online" #45'
got = split_message(clean)
assert isinstance(got, dict), "split_message should return a dict with the keys call, message and checksum"
assert got.get("call") == "KX-204", f"call should be 'KX-204' (first word, upper case) but is {got.get('call')!r}"
assert got.get("message") == "Kepler relay online", f"message should be the text between the quotes, but is {got.get('message')!r}"
assert got.get("checksum") == "45", f"checksum should be '45' (no #) but is {got.get('checksum')!r}"
`,
        },
        {
          id: "t2",
          description: "checksum letters are upper-cased and the message keeps its own case",
          assertionCode: py`
got = split_message('VR-077@1421.200MHZ az=134.8 EL=+57.0 SNR=27.1 dB "Beacon 3 nominal" #a9')
assert got.get("checksum") == "A9", f"the checksum should be upper case 'A9' but is {got.get('checksum')!r}"
assert got.get("message") == "Beacon 3 nominal", f"do not change the case of the message: got {got.get('message')!r}"
assert got.get("call") == "VR-077"
`,
        },
        {
          id: "t3",
          description: "split_message survives empty and quote-less lines",
          assertionCode: py`
assert split_message("") == {"call": "", "message": "", "checksum": ""}, "an empty line should give three empty strings, not crash"
junk = split_message("### CARRIER LOST ###")
assert junk.get("message") == "" and junk.get("checksum") == "", "a line without quotes has no message and no checksum"
`,
        },
        {
          id: "t4",
          description: "is_beacon ignores capitalisation",
          assertionCode: py`
for text in ["BEACON 7 nominal", "Beacon 3 nominal", "a faint beacon", "beacon"]:
    assert is_beacon(text) is True, f"is_beacon({text!r}) should be True"
for text in ["Telemetry burst [ack]", "", "bacon"]:
    assert is_beacon(text) is False, f"is_beacon({text!r}) should be False"
`,
        },
        {
          id: "t5",
          description: "looks_like_call accepts only LL-DDD",
          assertionCode: py`
for good in ["KX-204", "kx-204", "TN-099"]:
    assert looks_like_call(good) is True, f"looks_like_call({good!r}) should be True"
for bad in ["K-2044", "KX-20A", "KX_204", "", "KX-204 ", "12-ABC", "KX204"]:
    assert looks_like_call(bad) is False, f"looks_like_call({bad!r}) should be False"
`,
        },
        {
          id: "t6",
          description: "first_tag finds the first complete [tag] or returns None",
          assertionCode: py`
assert first_tag("Telemetry burst [ack]") == "ack", "first_tag('Telemetry burst [ack]') should be 'ack'"
assert first_tag("Handoff accepted [ack] [relay]") == "ack", "only the FIRST tag is wanted"
assert first_tag("No tags here") is None, "no brackets at all means None (find returns -1, check for it)"
assert first_tag("broken [ack") is None, "an opening bracket without a closing one is not a tag"
assert first_tag("") is None
`,
        },
      ],
      unlocks: ["sl-decode"],
      checks: [
        {
          prompt: "`\"hello\".find(\"z\")` returns `-1`. Why is that dangerous in `text[text.find(\"z\"):]`?",
          question: {
            type: "choice",
            options: [
              "`-1` is a valid index, so the slice silently starts at the last character instead of failing",
              "It raises an `IndexError`",
              "It returns an empty list",
              "It changes the original string",
            ],
            answer: 0,
          },
          explanation: "A missing match and the last character share the index `-1`, so the bug hides instead of crashing. Always test `if pos == -1:` before using it.",
        },
        {
          prompt: "What does `\"a=b=c\".partition(\"=\")` return?",
          question: { type: "choice", options: ["`('a', '=', 'b=c')`", "`['a', 'b', 'c']`", "`('a=b', '=', 'c')`", "`('a', 'b=c')`"], answer: 0 },
          explanation: "`partition` splits at the **first** separator only and always gives three pieces: before, the separator itself, after. (`rpartition` would give `('a=b', '=', 'c')`.)",
        },
      ],
    },

    // ───────────────────────── 4 ─────────────────────────
    {
      id: "signal-lab-4-format",
      title: "Format the readout",
      minutes: 16,
      xp: 100,
      concepts: ["f-strings", "format specs", "alignment & padding", "precision", "thousands separators", "dates", "ord / hex"],
      learn: md`### f-strings: any expression, plus a format spec

Put \`f\` in front of the quotes and write expressions in braces. After a colon comes a **format spec** that controls how the value is shown:

~~~text
{value : [fill][align][sign][0][width][,][.precision][type]}
~~~

~~~python
freq, snr, call = 1420.405, 18.2, "KX-204"

f"{freq:.1f}"        # '1420.4'         .1f = one decimal place (it rounds)
f"{freq:10.3f}"      # '  1420.405'     width 10, 3 decimals
f"{call:<10}|"       # 'KX-204    |'    < left-align in 10 columns
f"{call:>10}|"       # '    KX-204|'    > right-align
f"{call:^10}|"       # '  KX-204  |'    ^ centre
f"{call:*^10}"       # '**KX-204**'     any fill character before the alignment
f"{snr:+.1f}"        # '+18.2'          + always show the sign
f"{7:03d}"           # '007'            0-pad integers to width 3
f"{1420405000:,}"    # '1,420,405,000'  thousands separator
f"{0.875:.1%}"       # '87.5%'          % multiplies by 100 and adds the sign
f"{181:02X}"         # 'B5'             X = upper-case hexadecimal, 2 digits
f"{181:b}"           # '10110101'       binary
~~~

Strings are left-aligned by default and numbers right-aligned. A width smaller than the text never truncates; it simply has no effect. The width itself can come from a variable with nested braces: \`f"{call:>{width}}"\`.

Other handy pieces: \`{{\` and \`}}\` print literal braces, \`!r\` shows the \`repr\` (quotes and escapes visible, great for debugging), and \`f"{snr=}"\` prints \`snr=18.2\` including the expression itself.

### Dates

Dates have their own spec codes (\`%Y\` year, \`%m\` month, \`%d\` day, \`%H\` \`%M\` \`%S\` clock, \`%b\` month name). \`datetime.strptime(text, format)\` parses text; the same codes work after the colon in an f-string.

~~~python
from datetime import datetime
when = datetime.strptime("2087-03-14T02:17:45Z", "%Y-%m-%dT%H:%M:%SZ")
f"{when:%d %b %Y, %H:%M}"    # '14 Mar 2087, 02:17'
~~~

### Characters are numbers: ord and chr

\`ord("A")\` is \`65\` and \`chr(65)\` is \`"A"\`. Adding up character codes gives a cheap **checksum**: if one letter of a message changes in transit, the total changes. The dish keeps it to one byte with \`total % 256\` and writes two hex digits:

~~~python
sum(ord(c) for c in "Ping") % 256     # 142
f"{142:02X}"                          # '8E'
~~~

### Floating point is approximate

Rounding for *display* belongs in the format spec; rounding to *change a number* uses \`round()\`. Multiplying decimals can leave dust (\`0.1 + 0.2\` is \`0.30000000000000004\`), so convert with \`round(freq * 1_000_000)\` before formatting a whole-number Hz value.

### Common mistakes

- Reusing the same quote type inside an f-string expression on older Pythons.
- Forgetting a width means "no alignment": the spec \`:>\` alone does nothing.
- Using \`:d\` on a float (a \`ValueError\`). Use \`:.0f\`, or \`round()\` first.
- Formatting a number into a string and then trying to do maths on it.`,
      mission: md`Two jobs for the operators. First, **trust**: a checksum that proves a message arrived unharmed. Second, **legibility**: a readout board where call signs, frequencies and signal strengths line up in tidy monospace columns and the date reads like a date.

The **Readout** panel lights up. Every incoming message gets your checksum compared with the one it claims; a corrupted message is flagged the moment it arrives.`,
      tasks: [
        "checksum(message): add up ord() of every character with a loop, take the total mod 256, return two upper-case hex digits",
        "readout(call, freq, snr): call left-aligned in 8 columns, freq right-aligned in 10 with 3 decimals then \" MHz\", snr right-aligned in 8 with a sign and 1 decimal then \" dB\"",
        "hz_text(freq): the frequency in MHz as whole hertz with thousands separators, like \"1,420,405,000 Hz\"",
        "pretty_stamp(stamp): turn \"2087-03-14T02:17:45Z\" into \"14 Mar 2087, 02:17:45 UTC\" with datetime.strptime",
      ],
      starterAdd: py`# ─── ✏️ YOUR TURN ───────────────────────────
# Lesson 4: format the readout.
from datetime import datetime

def checksum(message):
    # sum ord() of every character, take % 256, return two UPPER-case hex digits
    # checksum("Ping") -> "8E"
    ...

def readout(call, freq, snr):
    # readout("KX-204", 1420.405, 18.2) -> "KX-204    1420.405 MHz   +18.2 dB"
    # call: left-aligned, width 8   | freq: right-aligned, width 10, 3 decimals
    # snr: right-aligned, width 8, always signed, 1 decimal
    ...

def hz_text(freq):
    # hz_text(1420.405) -> "1,420,405,000 Hz"
    ...

def pretty_stamp(stamp):
    # pretty_stamp("2087-03-14T02:17:45Z") -> "14 Mar 2087, 02:17:45 UTC"
    ...`,
      solutionAdd: py`from datetime import datetime

def checksum(message):
    total = 0
    for ch in message:
        total += ord(ch)
    return f"{total % 256:02X}"

def readout(call, freq, snr):
    return f"{call:<8}{freq:>10.3f} MHz{snr:>+8.1f} dB"

def hz_text(freq):
    return f"{round(freq * 1_000_000):,} Hz"

def pretty_stamp(stamp):
    when = datetime.strptime(stamp, "%Y-%m-%dT%H:%M:%SZ")
    return f"{when:%d %b %Y, %H:%M:%S} UTC"`,
      explanation:
        "The checksum loop adds the character code of every letter; % 256 keeps one byte; :02X prints it as two upper-case hex digits (zero padded, so 10 becomes 0A, not A). In readout, < and > choose the alignment, the number after them is the column width, .3f and .1f set the decimals and + forces the sign. hz_text rounds first because 1420.405 * 1_000_000 is a float that may carry binary dust, then the comma spec adds separators. pretty_stamp parses with strptime and reuses the very same % codes inside the f-string.",
      hints: [
        { id: "h1", title: "Checksum", content: "Start with total = 0, loop for ch in message: total += ord(ch), then format total % 256 with the spec 02X: f\"{total % 256:02X}\"." },
        { id: "h2", title: "Alignment", content: "f\"{call:<8}{freq:>10.3f} MHz{snr:>+8.1f} dB\". Left of the colon is the value, right of it is the spec. Compare your output with the example in the comment character by character." },
        { id: "h3", title: "Hertz and dates", content: "hz_text: f\"{round(freq * 1_000_000):,} Hz\". pretty_stamp: when = datetime.strptime(stamp, \"%Y-%m-%dT%H:%M:%SZ\") then f\"{when:%d %b %Y, %H:%M:%S} UTC\"." },
      ],
      tests: [
        {
          id: "t1",
          description: "checksum adds character codes mod 256 as two hex digits",
          assertionCode: py`
cases = {"Ping": "8E", "Kepler relay online": "45", "Telemetry burst [ack]": "12", "": "00", "A": "41"}
for text, want in cases.items():
    got = checksum(text)
    assert got == want, f"checksum({text!r}) should be {want!r} but returned {got!r}. Use total % 256 and the format spec 02X"
`,
        },
        {
          id: "t2",
          description: "checksum pads to two digits and detects a changed character",
          assertionCode: py`
assert checksum("a") == "61" and len(checksum("\x01")) == 2, "always return exactly two characters: 1 becomes '01', not '1'"
assert checksum("Beacon 3 nominal") != checksum("Beacon 3 noXinal"), "changing one letter must change the checksum"
`,
        },
        {
          id: "t3",
          description: "readout lines up the columns",
          assertionCode: py`
got = readout("KX-204", 1420.405, 18.2)
want = "KX-204    1420.405 MHz   +18.2 dB"
assert got == want, f"readout should be {want!r} but returned {got!r}"
got2 = readout("TN-099", 1418.3, -3.44)
want2 = "TN-099    1418.300 MHz    -3.4 dB"
assert got2 == want2, f"a negative snr keeps its minus sign and one decimal: expected {want2!r} but got {got2!r}"
`,
        },
        {
          id: "t4",
          description: "hz_text shows whole hertz with thousands separators",
          assertionCode: py`
assert hz_text(1420.405) == "1,420,405,000 Hz", f"hz_text(1420.405) should be '1,420,405,000 Hz' but is {hz_text(1420.405)!r}"
assert hz_text(1417.5) == "1,417,500,000 Hz", f"hz_text(1417.5) should be '1,417,500,000 Hz' but is {hz_text(1417.5)!r}"
`,
        },
        {
          id: "t5",
          description: "pretty_stamp spells the date out",
          assertionCode: py`
got = pretty_stamp("2087-03-14T02:17:45Z")
assert got == "14 Mar 2087, 02:17:45 UTC", f"expected '14 Mar 2087, 02:17:45 UTC' but got {got!r}"
got = pretty_stamp("2087-12-01T23:05:09Z")
assert got == "01 Dec 2087, 23:05:09 UTC", f"days are zero-padded: expected '01 Dec 2087, 23:05:09 UTC' but got {got!r}"
`,
        },
      ],
      unlocks: ["sl-readout"],
      checks: [
        {
          prompt: "What does `f\"{7:03d}\"` produce?",
          question: { type: "text", answer: ["007"], placeholder: "the exact text" },
          explanation: "`03d` means an integer, at least 3 wide, padded with zeros. It is the f-string version of `str(7).zfill(3)`.",
        },
        {
          prompt: "Which spec prints 1420405000 as `1,420,405,000`?",
          question: { type: "choice", options: ["`{n:,}`", "`{n:.3f}`", "`{n:>,}`", "`{n:03d}`"], answer: 0 },
          explanation: "A comma in the spec is the thousands separator. (`{n:>,}` would also add commas but needs a width to right-align anything.)",
        },
        {
          prompt: "Why do we call `round()` before formatting `freq * 1_000_000` as whole hertz?",
          question: {
            type: "choice",
            options: [
              "Floating-point multiplication can leave tiny errors, so we round to the nearest whole number first",
              "Because f-strings cannot format floats",
              "Because round() adds the thousands separators",
              "Because hertz must always be even",
            ],
            answer: 0,
          },
          explanation: "Decimal fractions are stored approximately in binary, so a product can come out as `1420405000.0000002`. Rounding to an integer gives the value you meant.",
        },
      ],
    },
  ],
};
