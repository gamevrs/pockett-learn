import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { BT, go, js, md } from "../go-basics/util.ts";

/**
 * Chapter 4: Real input. Regular expressions, reading the movement log line by line, a table-driven
 * test harness written inside the program, and the capstone that closes the day's books.
 */

/** The opening stock export used by the capstone. Provided as ready-made text in lesson 16. */
const openingStockConst = go`// openingStock is the day's opening stock export from the supplier system.
const openingStock = ${BT}{
  "depot": "Cairn Depot",
  "items": [
    {"sku": "ROP-0412", "name": "Dynamic rope 60 m", "qty": 6, "bin": "A1-03"},
    {"sku": "ROP-0518", "name": "Static line 100 m", "qty": 3, "bin": "A1-04"},
    {"sku": "HAR-0210", "name": "Rescue harness M", "qty": 9, "bin": "B2-01"},
    {"sku": "HEL-0107", "name": "Climbing helmet", "qty": 14, "bin": "B2-05"},
    {"sku": "RAD-0031", "name": "Handheld radio", "qty": 5, "bin": "C1-02"},
    {"sku": "BAT-0880", "name": "Radio battery pack", "qty": 22, "bin": "C1-04"},
    {"sku": "SPL-0044", "name": "Vacuum splint", "qty": 4, "bin": "D3-07"},
    {"sku": "BLK-0150", "name": "Foil blanket", "qty": 40, "bin": "D3-09"}
  ]
}${BT}`;

/** The test tables of lesson 15, provided so the lesson is about the harness. */
const caseTables = go`skuCases := []struct {
	name string
	in   string
	ok   bool
}{
	{"plain", "ROP-0412", true},
	{"with revision", "HAR-0210-B", true},
	{"lowercase", "rop-0412", false},
	{"three digits", "ROP-412", false},
	{"four letters", "ROPE-0412", false},
	{"lowercase revision", "ROP-0412-b", false},
	{"no dash", "ROP0412", false},
	{"leading space", " ROP-0412", false},
	{"trailing junk", "ROP-0412!", false},
	{"empty", "", false},
}
binCases := []struct {
	name string
	in   string
	ok   bool
}{
	{"plain", "A1-03", true},
	{"last aisle", "D6-12", true},
	{"aisle too high", "E1-01", false},
	{"shelf zero", "A0-01", false},
	{"shelf too high", "A7-01", false},
	{"short slot", "A1-3", false},
	{"trailing junk", "B2-05x", false},
	{"lowercase", "a1-03", false},
}`;

export const chapter4: Chapter = {
  id: "real-input",
  title: "Real input",
  blurb: "Check codes with regular expressions, read the movement log line by line, test your own parsers, and close the books.",
  lessons: [
    // ───────────────────────── 13 ─────────────────────────
    {
      id: "go-inventory-13-regexp",
      title: "Regular expressions for codes",
      minutes: 40,
      xp: 160,
      concepts: ["regexp", "MustCompile", "named groups", "FindStringSubmatch", "anchors", "FindAllString", "ReplaceAllString"],
      learn: md`### Codes have a shape

\`ROP-0412\` is three capital letters, a dash and four digits, optionally followed by a dash and a revision letter. A bin code is an aisle \`A\` to \`D\`, a shelf \`1\` to \`6\`, a dash and two digits. You could check each with a pile of \`len\`, \`HasPrefix\` and \`Atoi\` calls, but a **regular expression** states the whole shape in one line.

~~~go
var skuPattern = regexp.MustCompile(\`^(?P<cat>[A-Z]{3})-(?P<num>[0-9]{4})(?:-(?P<rev>[A-Z]))?$\`)
~~~

Read it piece by piece:

- \`^\` and \`$\` anchor the pattern to the **start and end** of the text. Without them the pattern matches *anywhere inside*, so \`ROPE-0412!\` would "contain" a valid-looking code. Forgetting anchors is the number one validation bug.
- \`[A-Z]{3}\` is exactly three capital letters, \`[0-9]{4}\` exactly four digits (\`\d\` also works, matching ASCII digits).
- \`(?P<cat>...)\` is a **named group**: parentheses that remember what they matched, with a name.
- \`(?: ... )?\` is a **non-capturing** group that is optional (\`?\` means zero or one).

### Raw strings and compiling once

Write patterns in backticks (a Go **raw string**). Inside double quotes every backslash must be doubled (\`"\\d+"\`), which is unreadable. And **compile once**, at package level:

~~~go
var skuPattern = regexp.MustCompile(\`...\`)       // compiled when the program starts
~~~

Compiling is comparatively slow; doing it inside a function that runs for every line of a log wastes time on every call. \`MustCompile\` **panics** if the pattern is invalid. That is the right trade for a pattern written in your own source (a broken constant is a programmer error, lesson 7); for a pattern that comes from a user use \`regexp.Compile\`, which returns an error:

~~~text
regexp: Compile(\`^(ABC\`): error parsing regexp: missing closing ): \`^(ABC\`
~~~

### Pulling the pieces out

~~~go
m := skuPattern.FindStringSubmatch("HAR-0210-B")
// m = ["HAR-0210-B", "HAR", "0210", "B"]    whole match, then each group in order
// A group that did not take part gives "" (for "ROP-0412" the last entry is "")
~~~

\`FindStringSubmatch\` returns \`nil\` when there is no match, so test that first. The names come from \`SubexpNames()\` (index 0 is always the empty name for the whole match), which lets you build a map:

~~~go
func groupMap(re *regexp.Regexp, s string) (map[string]string, bool) {
	m := re.FindStringSubmatch(s)
	if m == nil {
		return nil, false
	}
	out := map[string]string{}
	for i, name := range re.SubexpNames() {
		if i > 0 && name != "" {
			out[name] = m[i]
		}
	}
	return out, true
}
~~~

\`re.SubexpIndex("num")\` finds one group's position directly. The strings you get are text, so convert numbers with \`strconv.Atoi\`: the pattern guarantees digits, so you can still check the error.

### Finding and replacing inside text

~~~go
anySKU := regexp.MustCompile(\`\b[A-Z]{3}-[0-9]{4}(?:-[A-Z])?\b\`)
note := "Moved ROP-0412 and HAR-0210-B to B2-04, then BAT-0880 to C1-04."

anySKU.FindAllString(note, -1)            // [ROP-0412 HAR-0210-B BAT-0880]   -1 means "all of them"
anySKU.ReplaceAllString(note, "<SKU>")    // Moved <SKU> and <SKU> to B2-04, then <SKU> to C1-04.
~~~

\`\b\` is a word boundary: it stops the pattern matching in the middle of a longer word. Replacement strings can use \`$1\` or \`$name\` to refer to groups. \`MatchString\` is the plain yes/no test.

### Go's regexp is RE2

Go guarantees **linear-time** matching: no input can make it explode. The price is that some features of other languages do not exist: no back-references (\`\1\`) and no look-ahead or look-behind. If you need those, a regexp is the wrong tool anyway.

### When not to use a regexp

For "does it start with RECEIVE" use \`strings.HasPrefix\`. To split on a character use \`strings.Cut\` or \`strings.Fields\`. Use regexps for **shapes** with optional parts and repeated classes, such as codes, not for parsing structured formats like JSON or HTML.

### Common mistakes

- No \`^\`/\`$\` anchors, so the pattern accepts junk around a valid code.
- Compiling inside a loop or a hot function.
- Double-quoted patterns with single backslashes (\`"\d+"\` is an *unknown escape sequence* error).
- Treating the result of \`FindStringSubmatch\` as non-nil.
- Case: \`[A-Z]\` rejects lower case on purpose; add \`(?i)\` at the start for case-insensitive matching.`,
      mission: md`The movement log will arrive typed by hand: \`rop-0412\`, \`ROP-412\`, \`B3-7\`. Every SKU and every bin code must be checked before it gets near the shelves, and when it passes, split into its parts so the board can show them. Free-text notes also contain SKUs that the stores clerk wants highlighted.

Write the patterns and two parsers, \`ParseSKU\` and \`ParseBin\`. When this lesson passes the **SKU strip** lights up: green when a code is valid, red when it is not, with the named groups split out.`,
      tasks: [
        "Write skuPattern with named groups cat, num and an optional rev (anchored), binPattern with groups aisle (A-D), shelf (1-6) and slot (two digits), and anySKU for finding SKUs inside free text (word boundaries, no anchors); all with regexp.MustCompile at package level",
        "Write func groupMap(re *regexp.Regexp, s string) (map[string]string, bool) using FindStringSubmatch and SubexpNames",
        "Write func ParseSKU(s string) (SKU, error) and func ParseBin(s string) (BinCode, error): on no match return fmt.Errorf(\"%w: %q\", ErrBadSKU, s) (or ErrBadBin); otherwise convert the digits with strconv.Atoi",
        "In main: run the eight skuProbe values and six binProbe values through the parsers, building skuStrip and binStrip rows (value, ok and the parts)",
        "Find all SKUs in the given note with anySKU.FindAllString into skuFound, and mask them with ReplaceAllString into skuMasked",
        "Send skuStrip, binStrip, skuFound and skuMasked with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Provided: the sentinels and the result types the parsers return.
var (
	ErrBadSKU = errors.New("bad SKU")
	ErrBadBin = errors.New("bad bin code")
)

// SKU is a stock code split into its parts: ROP-0412-B is Cat ROP, Num 412, Rev B.
type SKU struct {
	Cat string
	Num int
	Rev string
}

// BinCode is a bin location split into its parts: C1-04 is Aisle C, Shelf 1, Slot 4.
type BinCode struct {
	Aisle string
	Shelf int
	Slot  int
}

// Lesson 13: write these (patterns are compiled ONCE, at package level, in backtick raw strings).
//   var skuPattern = regexp.MustCompile(...)   ^(?P<cat>[A-Z]{3})-(?P<num>[0-9]{4})(?:-(?P<rev>[A-Z]))?$
//   var binPattern = regexp.MustCompile(...)   aisle A-D, shelf 1-6, "-", slot two digits, anchored
//   var anySKU     = regexp.MustCompile(...)   a SKU anywhere in text, with \b word boundaries
//   func groupMap(re *regexp.Regexp, s string) (map[string]string, bool)
//   func ParseSKU(s string) (SKU, error)       func ParseBin(s string) (BinCode, error)

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 13: check the codes.
// 1. skuProbe := []string{"ROP-0412", "HAR-0210-B", "rop-0412", "ROP-412", "ROPE-0412", "ROP-0412-b", "ROP0412", " ROP-0412"}
//    skuStrip rows: {"value": s, "ok": err == nil, "cat": sku.Cat, "num": sku.Num, "rev": sku.Rev}
// 2. binProbe := []string{"A1-03", "D6-12", "E1-01", "A7-01", "A1-3", "B2-05x"}
//    binStrip rows: {"value": s, "ok": err == nil, "aisle": b.Aisle, "shelf": b.Shelf, "slot": b.Slot}
// 3. note := "Moved ROP-0412 and HAR-0210-B to B2-04, then BAT-0880 to C1-04 (ask Sam)."
//    skuFound := anySKU.FindAllString(note, -1)       skuMasked := anySKU.ReplaceAllString(note, "<SKU>")
// 4. scene("skuStrip", skuStrip), scene("binStrip", binStrip), scene("skuFound", skuFound), scene("skuMasked", skuMasked)`,
      solutionAdd: go`// The sentinels and the result types the parsers return.
var (
	ErrBadSKU = errors.New("bad SKU")
	ErrBadBin = errors.New("bad bin code")
)

// SKU is a stock code split into its parts: ROP-0412-B is Cat ROP, Num 412, Rev B.
type SKU struct {
	Cat string
	Num int
	Rev string
}

// BinCode is a bin location split into its parts: C1-04 is Aisle C, Shelf 1, Slot 4.
type BinCode struct {
	Aisle string
	Shelf int
	Slot  int
}

// Patterns are compiled once, when the program starts. The anchors make them match the WHOLE text.
var (
	skuPattern = regexp.MustCompile(${BT}^(?P<cat>[A-Z]{3})-(?P<num>[0-9]{4})(?:-(?P<rev>[A-Z]))?$${BT})
	binPattern = regexp.MustCompile(${BT}^(?P<aisle>[A-D])(?P<shelf>[1-6])-(?P<slot>[0-9]{2})$${BT})
	anySKU     = regexp.MustCompile(${BT}\b[A-Z]{3}-[0-9]{4}(?:-[A-Z])?\b${BT})
)

// groupMap matches s and returns the named groups, or false when there is no match.
func groupMap(re *regexp.Regexp, s string) (map[string]string, bool) {
	m := re.FindStringSubmatch(s)
	if m == nil {
		return nil, false
	}
	out := map[string]string{}
	for i, name := range re.SubexpNames() {
		if i > 0 && name != "" {
			out[name] = m[i]
		}
	}
	return out, true
}

// ParseSKU checks and splits a stock code.
func ParseSKU(s string) (SKU, error) {
	g, ok := groupMap(skuPattern, s)
	if !ok {
		return SKU{}, fmt.Errorf("%w: %q", ErrBadSKU, s)
	}
	num, err := strconv.Atoi(g["num"])
	if err != nil {
		return SKU{}, fmt.Errorf("%w: %q: %v", ErrBadSKU, s, err)
	}
	return SKU{Cat: g["cat"], Num: num, Rev: g["rev"]}, nil
}

// ParseBin checks and splits a bin location.
func ParseBin(s string) (BinCode, error) {
	g, ok := groupMap(binPattern, s)
	if !ok {
		return BinCode{}, fmt.Errorf("%w: %q", ErrBadBin, s)
	}
	shelf, err1 := strconv.Atoi(g["shelf"])
	slot, err2 := strconv.Atoi(g["slot"])
	if err1 != nil || err2 != nil {
		return BinCode{}, fmt.Errorf("%w: %q", ErrBadBin, s)
	}
	return BinCode{Aisle: g["aisle"], Shelf: shelf, Slot: slot}, nil
}

${MAIN_DIVIDER}

// Lesson 13: check the codes.
skuProbe := []string{"ROP-0412", "HAR-0210-B", "rop-0412", "ROP-412", "ROPE-0412", "ROP-0412-b", "ROP0412", " ROP-0412"}
var skuStrip []map[string]any
for _, s := range skuProbe {
	sku, err := ParseSKU(s)
	skuStrip = append(skuStrip, map[string]any{"value": s, "ok": err == nil, "cat": sku.Cat, "num": sku.Num, "rev": sku.Rev})
}
binProbe := []string{"A1-03", "D6-12", "E1-01", "A7-01", "A1-3", "B2-05x"}
var binStrip []map[string]any
for _, s := range binProbe {
	b, err := ParseBin(s)
	binStrip = append(binStrip, map[string]any{"value": s, "ok": err == nil, "aisle": b.Aisle, "shelf": b.Shelf, "slot": b.Slot})
}
note := "Moved ROP-0412 and HAR-0210-B to B2-04, then BAT-0880 to C1-04 (ask Sam)."
skuFound := anySKU.FindAllString(note, -1)
skuMasked := anySKU.ReplaceAllString(note, "<SKU>")
fmt.Println(skuFound)
fmt.Println(skuMasked)

scene("skuStrip", skuStrip)
scene("binStrip", binStrip)
scene("skuFound", skuFound)
scene("skuMasked", skuMasked)`,
      explanation:
        "The anchors ^ and $ make skuPattern match the whole string, so ROPE-0412, ROP-0412-b and a leading space are all rejected; the optional revision is the group (?:-(?P<rev>[A-Z]))? and is empty when absent. groupMap pairs each name from SubexpNames with the matching entry of FindStringSubmatch, skipping index 0 (the whole match). The parsers wrap ErrBadSKU/ErrBadBin with %w so callers can use errors.Is, and convert the digit groups with Atoi. anySKU has no anchors but uses \\b so it finds ROP-0412, HAR-0210-B and BAT-0880 inside the sentence and not B2-04 or C1-04 (those are bin codes, not SKUs). ReplaceAllString swaps each hit for the mask. All three patterns are compiled once, at package level.",
      hints: [
        { id: "h1", title: "The patterns", content: "Use backtick raw strings. SKU: ^(?P<cat>[A-Z]{3})-(?P<num>[0-9]{4})(?:-(?P<rev>[A-Z]))?$ . Bin: ^(?P<aisle>[A-D])(?P<shelf>[1-6])-(?P<slot>[0-9]{2})$ . Free text: \\b[A-Z]{3}-[0-9]{4}(?:-[A-Z])?\\b (no anchors). Declare them with var and regexp.MustCompile at package level." },
        { id: "h2", title: "groupMap", content: "m := re.FindStringSubmatch(s); if m == nil { return nil, false }. Then for i, name := range re.SubexpNames() { if i > 0 && name != \"\" { out[name] = m[i] } }. Index 0 is the whole match and has no name." },
        { id: "h3", title: "Parsers and probes", content: "ParseSKU: g, ok := groupMap(skuPattern, s); if !ok { return SKU{}, fmt.Errorf(\"%w: %q\", ErrBadSKU, s) }; num, _ := strconv.Atoi(g[\"num\"]) (the pattern guarantees digits); return SKU{Cat: g[\"cat\"], Num: num, Rev: g[\"rev\"]}, nil. ParseBin is the same with aisle, shelf and slot." },
      ],
      tests: [
        {
          id: "t1",
          description: "SKUs are accepted or rejected as a whole",
          assertionCode: js`
assert(Array.isArray(scene.skuStrip), "Send the rows with scene(\"skuStrip\", skuStrip).");
assertEqual(scene.skuStrip.map((r) => r.ok), [true, true, false, false, false, false, false, false], "SKU ok flags for ROP-0412, HAR-0210-B, rop-0412, ROP-412, ROPE-0412, ROP-0412-b, ROP0412 and ' ROP-0412' (anchor the pattern with ^ and $)");`,
        },
        {
          id: "t2",
          description: "Named groups split a valid SKU into parts",
          assertionCode: js`
const second = scene.skuStrip[1];
assertEqual([second.cat, second.num, second.rev], ["HAR", 210, "B"], "parts of HAR-0210-B [cat, num, rev] (named groups; convert num with strconv.Atoi)");
assertEqual(scene.skuStrip[0].rev, "", "rev of ROP-0412 (an optional group that did not match is the empty string)");`,
        },
        {
          id: "t3",
          description: "Bin codes are validated and split",
          assertionCode: js`
assert(Array.isArray(scene.binStrip), "Send the rows with scene(\"binStrip\", binStrip).");
assertEqual(scene.binStrip.map((r) => r.ok), [true, true, false, false, false, false], "bin ok flags for A1-03, D6-12, E1-01, A7-01, A1-3 and B2-05x");
assertEqual([scene.binStrip[1].aisle, scene.binStrip[1].shelf, scene.binStrip[1].slot], ["D", 6, 12], "parts of D6-12 [aisle, shelf, slot]");`,
        },
        {
          id: "t4",
          description: "FindAllString and ReplaceAllString work inside free text",
          assertionCode: js`
assertEqual(scene.skuFound, ["ROP-0412", "HAR-0210-B", "BAT-0880"], "skuFound (SKUs only; B2-04 and C1-04 are bin codes)");
assertEqual(scene.skuMasked, "Moved <SKU> and <SKU> to B2-04, then <SKU> to C1-04 (ask Sam).", "skuMasked (ReplaceAllString with <SKU>)");`,
        },
      ],
      unlocks: ["gi-sku"],
      checks: [
        {
          prompt: "`regexp.MustCompile(\"[A-Z]{3}-[0-9]{4}\").MatchString(\"xROPE-0412!\")`. True or false?",
          question: { type: "choice", options: ["true: the pattern matches inside the text", "false: the letters do not fit", "A compile error", "A panic"], answer: 0 },
          explanation: "Without ^ and $ a pattern matches anywhere. OPE-0412 satisfies it. Add anchors to validate a whole string.",
        },
        {
          prompt: "Where should `regexp.MustCompile` for a fixed pattern normally live?",
          question: { type: "choice", options: ["Inside the function that uses it, every call", "At package level, compiled once", "In main only", "In an init loop"], answer: 1 },
          explanation: "Compiling costs time. A package-level variable compiles once at startup. If the pattern is wrong the program panics immediately, which is what you want for a constant in your own source.",
        },
      ],
    },

    // ───────────────────────── 14 ─────────────────────────
    {
      id: "go-inventory-14-log",
      title: "Reading the movement log",
      minutes: 40,
      xp: 160,
      concepts: ["bufio.Scanner", "io.Reader", "io.TeeReader", "line numbers", "error type with Unwrap", "strings.Fields"],
      learn: md`### A log is read one line at a time

Gopher Post read a few lines from standard input. A movement log can be long, and a program should not need all of it in memory to read it. \`bufio.Scanner\` reads a stream **line by line**:

~~~go
sc := bufio.NewScanner(os.Stdin)
for sc.Scan() {
	text := sc.Text()        // the line without its newline
	// ...
}
if err := sc.Err(); err != nil {
	// a read error (not a normal end of input)
}
~~~

\`Scan\` returns false at the end of the input **or on an error**; the loop does not tell you which, so always check \`sc.Err()\` afterwards. A scanner refuses lines longer than 64 KiB by default (*bufio.Scanner: token too long*); if your input can have longer lines, call \`sc.Buffer(make([]byte, 0, 64*1024), 1<<20)\` before scanning.

### Accept an io.Reader

The function that parses the log should not care where the text comes from. \`os.Stdin\`, a file, a network connection and \`strings.NewReader("...")\` are all an \`io.Reader\`. Take the interface:

~~~go
func readLog(r io.Reader) (moves []Movement, errs []error, lines int)
~~~

and a test (lesson 15) can feed it a string. This is "accept interfaces" for the third time in this course; it is how Go programs stay testable.

### Line numbers are part of the message

A bad record is useless without its place. Count lines yourself, including the ones you skip (blank lines and \`#\` comments), so the number matches what someone sees in their editor:

~~~go
line := 0
for sc.Scan() {
	line++
	text := strings.TrimSpace(sc.Text())
	if text == "" || strings.HasPrefix(text, "#") {
		continue
	}
	// ...
}
~~~

Give the error a **type** that carries the place (lesson 7), and let it unwrap to the cause (lesson 6):

~~~go
type ParseError struct {
	Line int
	Text string
	Err  error
}

func (e *ParseError) Error() string { return fmt.Sprintf("line %d: %v (in %q)", e.Line, e.Err, e.Text) }
func (e *ParseError) Unwrap() error { return e.Err }
~~~

\`Unwrap\` means \`errors.Is(err, ErrBadSKU)\` still works through a \`*ParseError\`, while \`errors.As\` retrieves the line number.

### Splitting a line

\`strings.Fields(text)\` splits on any run of white space and never returns empty strings, so double spaces and tabs are harmless. Check the **count** first, then convert each part. A parse function is a chain of small checks, each returning a specific error:

~~~go
f := strings.Fields(text)
if len(f) < 3 || len(f) > 4 {
	return fail(fmt.Errorf("%w: want KIND SKU QTY [BIN], got %d", ErrFields, len(f)))
}
~~~

\`strconv.Atoi\` returns a \`*strconv.NumError\` whose cause is \`strconv.ErrSyntax\` (not a number) or \`ErrRange\` (too big). Wrap your own sentinel (\`ErrBadQty\`) so your callers do not depend on \`strconv\`. Numbers that parse can still be wrong: a quantity must be positive.

### Good messages for good problems

A line-numbered message should contain the line, the reason and the offending text: \`line 12: bad quantity: "x" is not a whole number (in "ISSUE SPL-0044 x")\`. Collect all problems, as in lesson 12, and keep going. One bad line never stops the read.

### stdin is a stream: you read it once

\`os.Stdin\` cannot be rewound. Once a scanner has read it, a second scanner gets nothing. Later lessons need the log again, so copy it as it goes by with \`io.TeeReader\`, a reader that writes everything it reads into a second place:

~~~go
var logCopy strings.Builder
moves, errs, lines := readLog(io.TeeReader(os.Stdin, &logCopy))
// later: readLog(strings.NewReader(logCopy.String()))
~~~

### Common mistakes

- Forgetting \`sc.Err()\`, and so never noticing a failed read.
- Counting only the lines you process, so numbers drift after a blank line.
- Returning on the first bad line when the user needs the full list.
- Reading all of standard input into memory when a scanner would stream it.
- Using \`os.Exit\` or \`return\` in \`main\` on a bad line. Report it and carry on.`,
      mission: md`The day's movement log is on standard input: nineteen lines with comments, a blank line, and several badly typed records. Last week one mistyped quantity went through unnoticed and a harness "went missing". This time every line that cannot be read must be reported with its **line number**, its **text** and the **reason**, and every good line must come out as a clean \`Movement\`.

Write the line reader and the line parser on top of the code from lesson 13. When this lesson passes the **Movement log** lights up.`,
      tasks: [
        "Declare type ParseError struct { Line int; Text string; Err error } with Error() (\"line %d: %v (in %q)\") and Unwrap() on *ParseError",
        "Write func parseMovement(line int, text string) (Movement, error): strings.Fields; 3 or 4 fields else ErrFields (\"%w: want KIND SKU QTY [BIN], got %d\"); the kind (upper-cased) must be in validKinds else ErrBadKind (\"%w: %q\"); the SKU through ParseSKU; the quantity through strconv.Atoi, ErrBadQty (\"%w: %q is not a whole number\") and must be positive (\"%w: %d must be positive\"); an optional fourth field through ParseBin. Every failure is returned as a *ParseError",
        "Write func readLog(r io.Reader) ([]Movement, []error, int) using bufio.Scanner: count every line, skip blank lines and lines starting with #, collect movements and errors, add sc.Err() to the errors, and return the number of lines read",
        "Write func parseClass(err error) string using errors.Is: \"fields\", \"kind\", \"sku\", \"qty\", \"bin\", otherwise \"other\"",
        "In main: read standard input through io.TeeReader into logCopy (a strings.Builder) so later lessons can read the log again, then build logRead: lines, movements (count), moveLines (the Line numbers of good movements) and rejected rows (line, text, class, message, taken from errors.As on *ParseError)",
        "Send logRead with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Provided: the sentinels for a bad line and the set of known movement kinds.
var (
	ErrFields  = errors.New("wrong number of fields")
	ErrBadKind = errors.New("bad movement kind")
	ErrBadQty  = errors.New("bad quantity")
)

var validKinds = map[string]bool{"RECEIVE": true, "ISSUE": true, "RETURN": true, "RETIRE": true}

// Lesson 14: write these.
//   type ParseError struct { Line int; Text string; Err error }     Error() and Unwrap() on *ParseError
//   func parseMovement(line int, text string) (Movement, error)     fields -> kind -> SKU -> qty -> optional bin
//   func readLog(r io.Reader) ([]Movement, []error, int)            bufio.Scanner, line numbers, skip blanks and #
//   func parseClass(err error) string                               "fields" "kind" "sku" "qty" "bin" "other"

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 14: read the movement log from standard input.
// 1. var logCopy strings.Builder
//    movesRead, parseErrs, lineCount := readLog(io.TeeReader(os.Stdin, &logCopy))
// 2. moveLines: the Line of each movement in movesRead
//    rejected rows (map[string]any): for each err in parseErrs, var pe *ParseError; errors.As(err, &pe) ->
//      {"line": pe.Line, "text": pe.Text, "class": parseClass(err), "message": err.Error()}
// 3. scene("logRead", map[string]any{"lines": lineCount, "movements": len(movesRead), "moveLines": moveLines, "rejected": rejected})`,
      solutionAdd: go`// Sentinels for a bad line, and the set of known movement kinds.
var (
	ErrFields  = errors.New("wrong number of fields")
	ErrBadKind = errors.New("bad movement kind")
	ErrBadQty  = errors.New("bad quantity")
)

var validKinds = map[string]bool{"RECEIVE": true, "ISSUE": true, "RETURN": true, "RETIRE": true}

// ParseError says which line of the log was bad, what it said and why.
type ParseError struct {
	Line int
	Text string
	Err  error
}

func (e *ParseError) Error() string { return fmt.Sprintf("line %d: %v (in %q)", e.Line, e.Err, e.Text) }
func (e *ParseError) Unwrap() error { return e.Err }

// parseMovement turns one log line into a Movement, or explains what is wrong with it.
func parseMovement(line int, text string) (Movement, error) {
	fail := func(err error) (Movement, error) {
		return Movement{}, &ParseError{Line: line, Text: text, Err: err}
	}
	f := strings.Fields(text)
	if len(f) < 3 || len(f) > 4 {
		return fail(fmt.Errorf("%w: want KIND SKU QTY [BIN], got %d", ErrFields, len(f)))
	}
	kind := strings.ToUpper(f[0])
	if !validKinds[kind] {
		return fail(fmt.Errorf("%w: %q", ErrBadKind, f[0]))
	}
	if _, err := ParseSKU(f[1]); err != nil {
		return fail(err)
	}
	qty, err := strconv.Atoi(f[2])
	if err != nil {
		return fail(fmt.Errorf("%w: %q is not a whole number", ErrBadQty, f[2]))
	}
	if qty <= 0 {
		return fail(fmt.Errorf("%w: %d must be positive", ErrBadQty, qty))
	}
	m := Movement{Line: line, Kind: kind, SKU: f[1], Qty: qty}
	if len(f) == 4 {
		if _, err := ParseBin(f[3]); err != nil {
			return fail(err)
		}
		m.Bin = f[3]
	}
	return m, nil
}

// readLog reads a movement log from any reader, line by line. A bad line never stops the read.
func readLog(r io.Reader) ([]Movement, []error, int) {
	var moves []Movement
	var errs []error
	sc := bufio.NewScanner(r)
	line := 0
	for sc.Scan() {
		line++
		text := strings.TrimSpace(sc.Text())
		if text == "" || strings.HasPrefix(text, "#") {
			continue
		}
		m, err := parseMovement(line, text)
		if err != nil {
			errs = append(errs, err)
			continue
		}
		moves = append(moves, m)
	}
	if err := sc.Err(); err != nil {
		errs = append(errs, err)
	}
	return moves, errs, line
}

// parseClass names the kind of parsing problem, whatever wrapped it.
func parseClass(err error) string {
	switch {
	case errors.Is(err, ErrFields):
		return "fields"
	case errors.Is(err, ErrBadKind):
		return "kind"
	case errors.Is(err, ErrBadSKU):
		return "sku"
	case errors.Is(err, ErrBadQty):
		return "qty"
	case errors.Is(err, ErrBadBin):
		return "bin"
	}
	return "other"
}

${MAIN_DIVIDER}

// Lesson 14: read the movement log from standard input.
// Standard input can be read only once, so the TeeReader keeps a copy for the later lessons.
var logCopy strings.Builder
movesRead, parseErrs, lineCount := readLog(io.TeeReader(os.Stdin, &logCopy))
var moveLines []int
for _, m := range movesRead {
	moveLines = append(moveLines, m.Line)
}
var rejected []map[string]any
for _, err := range parseErrs {
	var pe *ParseError
	if errors.As(err, &pe) {
		rejected = append(rejected, map[string]any{"line": pe.Line, "text": pe.Text, "class": parseClass(err), "message": err.Error()})
		fmt.Println(err)
	}
}
fmt.Println(lineCount, "lines,", len(movesRead), "movements,", len(parseErrs), "rejected")

scene("logRead", map[string]any{"lines": lineCount, "movements": len(movesRead), "moveLines": moveLines, "rejected": rejected})`,
      explanation:
        "readLog takes an io.Reader, so it works on os.Stdin now and on a string later. The scanner counts every line (including the comment and the blank one, so the numbers match the file), skips blanks and #, and keeps going after a bad line. parseMovement is a chain of small checks, and each failure is wrapped in a *ParseError that carries the line and the text and unwraps to the sentinel, so parseClass can use errors.Is while the board reads the line number with errors.As. The TeeReader copies what the scanner reads into logCopy because stdin cannot be read twice. Of the 19 lines, 17 are data: 11 parse into movements and 6 are rejected (a lower-case SKU, an unknown kind, a quantity that is not a number, a negative quantity, a missing field and a bin code in aisle E).",
      hints: [
        { id: "h1", title: "ParseError", content: "type ParseError struct { Line int; Text string; Err error }. func (e *ParseError) Error() string { return fmt.Sprintf(\"line %d: %v (in %q)\", e.Line, e.Err, e.Text) } and func (e *ParseError) Unwrap() error { return e.Err }. In parseMovement a small helper fail := func(err error) (Movement, error) { return Movement{}, &ParseError{Line: line, Text: text, Err: err} } keeps each check to one line." },
        { id: "h2", title: "readLog", content: "sc := bufio.NewScanner(r); line := 0; for sc.Scan() { line++; text := strings.TrimSpace(sc.Text()); if text == \"\" || strings.HasPrefix(text, \"#\") { continue }; m, err := parseMovement(line, text); ... }. After the loop: if err := sc.Err(); err != nil { errs = append(errs, err) }. Return moves, errs, line." },
        { id: "h3", title: "Reading stdin once", content: "var logCopy strings.Builder; movesRead, parseErrs, lineCount := readLog(io.TeeReader(os.Stdin, &logCopy)). For each error: var pe *ParseError; if errors.As(err, &pe) { ... pe.Line, pe.Text ... }. parseClass is a tagless switch of errors.Is checks: ErrFields, ErrBadKind, ErrBadSKU, ErrBadQty, ErrBadBin." },
      ],
      tests: [
        {
          id: "t1",
          description: "Every line is counted, good ones become movements",
          assertionCode: js`
assert(scene.logRead && typeof scene.logRead === "object", "Send logRead with scene(\"logRead\", ...). Read standard input with readLog(io.TeeReader(os.Stdin, &logCopy)).");
assertEqual(scene.logRead.lines, 19, "lines (the comment, the blank line and every record count: 19 lines)");
assertEqual(scene.logRead.movements, 11, "movements (11 lines parse cleanly)");
assertEqual(scene.logRead.moveLines, [2, 3, 4, 6, 7, 8, 9, 15, 16, 18, 19], "line numbers of the good movements");`,
        },
        {
          id: "t2",
          description: "Bad lines are rejected with their own line numbers",
          assertionCode: js`
const rej = scene.logRead.rejected;
assert(Array.isArray(rej), "rejected must be a list of rows.");
assertEqual(rej.map((r) => r.line), [10, 11, 12, 13, 14, 17], "rejected line numbers (the line number of the ORIGINAL file, counting blank lines and comments)");
assertEqual(rej.map((r) => r.class), ["sku", "kind", "qty", "qty", "fields", "bin"], "classes (use errors.Is on the wrapped sentinel; the *ParseError must unwrap)");`,
        },
        {
          id: "t3",
          description: "Messages name the line, the reason and the text",
          assertionCode: js`
const rej2 = scene.logRead.rejected;
assertEqual(rej2[0].message, 'line 10: bad SKU: "rop-0412" (in "ISSUE rop-0412 1")', "message for line 10");
assertEqual(rej2[2].message, 'line 12: bad quantity: "x" is not a whole number (in "ISSUE SPL-0044 x")', "message for line 12");
assertEqual(rej2[4].message, 'line 14: wrong number of fields: want KIND SKU QTY [BIN], got 2 (in "ISSUE ROP-0518")', "message for line 14");`,
        },
      ],
      unlocks: ["gi-log"],
      checks: [
        {
          prompt: "`for sc.Scan() { ... }` ends. How do you tell a normal end of input from a read error?",
          question: { type: "choice", options: ["Scan returns an error", "Check sc.Err() after the loop", "A panic is raised", "You cannot"], answer: 1 },
          explanation: "Scan only returns true or false. After the loop, sc.Err() is nil for a normal end of input and non-nil if reading failed (or a line was too long).",
        },
        {
          prompt: "Why does `ParseError` have an `Unwrap() error` method?",
          question: { type: "choice", options: ["So fmt can print it", "So errors.Is and errors.As can see the cause inside it", "It is required for every error type", "So it can be sorted"], answer: 1 },
          explanation: "Unwrap links the wrapper to its cause. errors.Is(err, ErrBadSKU) then works even though a *ParseError sits on top, and errors.As(err, &pe) still finds the wrapper itself.",
        },
      ],
    },

    // ───────────────────────── 15 ─────────────────────────
    {
      id: "go-inventory-15-tests",
      title: "Table-driven tests",
      minutes: 40,
      xp: 160,
      concepts: ["table-driven tests", "subtests", "t.Errorf", "t.Run", "edge cases", "got/want", "test harness"],
      learn: md`### Why tests, and why a table

You have written parsers that decide whether a SKU or a bin is valid. Are they right on the awkward inputs: an empty string, a trailing space, a lower-case letter, a code that is *almost* right? Run the program and eyeball the output once, and you will not catch the day somebody "tidies up" the pattern. **Tests** are small programs that check the code and keep checking it.

Go's style for testing many inputs is the **table-driven test**: a slice of cases (name, input, expected result) and one loop that runs each case through the same checking code. Adding a case is one line; the checking logic is written once.

### What a real test file looks like

In a normal Go project this lives in a file ending in \`_test.go\` and you run \`go test\`:

~~~go
package main

import "testing"

func TestParseSKU(t *testing.T) {
	cases := []struct {
		name string
		in   string
		ok   bool
	}{
		{"plain", "ROP-0412", true},
		{"lowercase", "rop-0412", false},
		{"empty", "", false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := ParseSKU(tc.in)
			if (err == nil) != tc.ok {
				t.Errorf("ParseSKU(%q): ok = %t, want %t", tc.in, err == nil, tc.ok)
			}
		})
	}
}
~~~

\`go test -v\` prints one line per case, named \`TestParseSKU/lowercase\`; \`go test -run TestParseSKU/empty\` runs just one. \`t.Errorf\` records a failure and keeps going (so one run shows every failure); \`t.Fatalf\` records it and stops that test. \`go test -cover\` reports how much code the tests reached. The convention is to print **what you did, what you got, what you wanted**, in that order, in the failure message.

### The same thing, inside your program

Your program here cannot run \`go test\`, so you will build the small machine that \`testing\` is, in about thirty lines. It teaches what the real one does:

~~~go
type T struct {
	name   string
	failed bool
	msgs   []string
}

func (t *T) Errorf(format string, args ...any) {
	t.failed = true
	t.msgs = append(t.msgs, fmt.Sprintf(format, args...))
}

type Result struct {
	Name string
	Pass bool
	Msg  string
}

type Suite struct{ Results []Result }

func (r *Suite) Run(name string, f func(t *T)) bool { /* run f, record a Result, print a line */ }
~~~

\`Run\` makes a \`T\`, calls the test function, and records pass or fail. Two details make it trustworthy:

- A test that **panics** must count as a failure, not crash the whole run. Recover inside \`Run\` and call \`t.Errorf("panic: %v", p)\`.
- Names with spaces become underscores, as in the real \`t.Run\`, so \`"leading space"\` is reported as \`ParseSKU/leading_space\`.

### Choosing the cases

A good table includes:

- the **normal** case (it works);
- each **rule** on its own (wrong length, wrong case, wrong separator);
- **boundaries** (the largest valid aisle, the first invalid one);
- the **empty** input and the input with extra white space;
- anything that was ever a **bug**. A failing case that you then fix stays in the table forever.

### A suite that fails on purpose

Tests earn their keep by failing when something is wrong. The starter gives you \`looseSKU\`, a SKU check with a classic mistake: the pattern has no anchors. Run the same table through it. The green \`ParseSKU\` rows and the red \`looseSKU\` rows show what the table can see. When a row is red you decide which side is wrong: the code or the expectation. Here it is the code.

### Common mistakes

- One giant test with many checks: the first failure hides the rest. Use one subtest per case.
- Cases without names, so a failure says "case 7".
- Expected values computed by the same code under test.
- Checking only the happy path.
- Forgetting that a closure in a loop captures the loop variable (fixed in Go 1.22, still a classic in older code).`,
      mission: md`Before the depot trusts the SKU and bin parsers with a real log, the safety officer wants proof. You will write a small **test harness** in your program and run two tables through it: ten SKU cases and eight bin cases against your real parsers, and the same SKU cases against \`looseSKU\`, a sloppy checker someone wrote before you.

When this lesson passes the **Test results** panel lights up with green and red rows.`,
      tasks: [
        "Declare type T struct (name string, failed bool, msgs []string) with func (t *T) Errorf(format string, args ...any) that sets failed and records the formatted message",
        "Declare type Result struct { Name string; Pass bool; Msg string } and type Suite struct { Results []Result } with func (r *Suite) Run(name string, f func(t *T)) bool: replace spaces in the name with underscores, run f with a deferred recover that turns a panic into t.Errorf(\"panic: %v\", p), append a Result (Msg is the messages joined with \"; \"), print --- PASS: name or --- FAIL: name (msg), and return whether it passed",
        "In main use the given skuCases and binCases tables: for each skuCases entry testSuite.Run(\"ParseSKU/\" + tc.name, ...) checking (err == nil) != tc.ok with t.Errorf; the same for ParseBin over binCases; and again for looseSKU over skuCases (named looseSKU/...)",
        "Count failures into failedCount and send tests, a map with results (testSuite.Results), total and failed, with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Provided: a sloppy checker with a classic bug, so the tests have something to find.
var looseSKUPattern = regexp.MustCompile(${BT}[A-Z]{3}-[0-9]{4}${BT})

func looseSKU(s string) bool { return looseSKUPattern.MatchString(s) }

// Lesson 15: write these.
//   type T struct { name string; failed bool; msgs []string }         func (t *T) Errorf(format string, args ...any)
//   type Result struct { Name string; Pass bool; Msg string }
//   type Suite struct { Results []Result }
//   func (r *Suite) Run(name string, f func(t *T)) bool    recover panics, spaces -> underscores, print PASS/FAIL

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 15: run the tables.
// Provided: the two tables (data only; you may add a case of your own to skuCases).
${caseTables}
fmt.Println(len(skuCases), "SKU cases and", len(binCases), "bin cases are ready")

// 1. testSuite := &Suite{}
// 2. for _, tc := range skuCases { testSuite.Run("ParseSKU/"+tc.name, func(t *T) { _, err := ParseSKU(tc.in); if (err == nil) != tc.ok { t.Errorf(...) } }) }
// 3. the same for binCases with ParseBin ("ParseBin/"), and for skuCases with looseSKU ("looseSKU/"): if got := looseSKU(tc.in); got != tc.ok { t.Errorf(...) }
// 4. failedCount: how many Results have Pass == false
//    scene("tests", map[string]any{"results": testSuite.Results, "total": len(testSuite.Results), "failed": failedCount})`,
      solutionAdd: go`// looseSKU is a sloppy checker with a classic bug: the pattern has no anchors.
var looseSKUPattern = regexp.MustCompile(${BT}[A-Z]{3}-[0-9]{4}${BT})

func looseSKU(s string) bool { return looseSKUPattern.MatchString(s) }

// T is a tiny stand-in for testing.T: it remembers whether a test failed and why.
type T struct {
	name   string
	failed bool
	msgs   []string
}

func (t *T) Errorf(format string, args ...any) {
	t.failed = true
	t.msgs = append(t.msgs, fmt.Sprintf(format, args...))
}

// Result is one finished test case.
type Result struct {
	Name string
	Pass bool
	Msg  string
}

// Suite runs named test functions and keeps their results.
type Suite struct{ Results []Result }

// Run behaves like t.Run: one named case, panics count as failures.
func (r *Suite) Run(name string, f func(t *T)) bool {
	t := &T{name: strings.ReplaceAll(name, " ", "_")}
	func() {
		defer func() {
			if p := recover(); p != nil {
				t.Errorf("panic: %v", p)
			}
		}()
		f(t)
	}()
	msg := strings.Join(t.msgs, "; ")
	r.Results = append(r.Results, Result{Name: t.name, Pass: !t.failed, Msg: msg})
	if t.failed {
		fmt.Printf("--- FAIL: %s (%s)\n", t.name, msg)
	} else {
		fmt.Printf("--- PASS: %s\n", t.name)
	}
	return !t.failed
}

${MAIN_DIVIDER}

// Lesson 15: run the tables.
${caseTables}
fmt.Println(len(skuCases), "SKU cases and", len(binCases), "bin cases are ready")
testSuite := &Suite{}
for _, tc := range skuCases {
	testSuite.Run("ParseSKU/"+tc.name, func(t *T) {
		_, err := ParseSKU(tc.in)
		if (err == nil) != tc.ok {
			t.Errorf("ParseSKU(%q): ok = %t, want %t", tc.in, err == nil, tc.ok)
		}
	})
}
for _, tc := range binCases {
	testSuite.Run("ParseBin/"+tc.name, func(t *T) {
		_, err := ParseBin(tc.in)
		if (err == nil) != tc.ok {
			t.Errorf("ParseBin(%q): ok = %t, want %t", tc.in, err == nil, tc.ok)
		}
	})
}
for _, tc := range skuCases {
	testSuite.Run("looseSKU/"+tc.name, func(t *T) {
		if got := looseSKU(tc.in); got != tc.ok {
			t.Errorf("looseSKU(%q) = %t, want %t", tc.in, got, tc.ok)
		}
	})
}
failedCount := 0
for _, res := range testSuite.Results {
	if !res.Pass {
		failedCount++
	}
}
fmt.Printf("%d of %d cases failed\n", failedCount, len(testSuite.Results))
scene("tests", map[string]any{"results": testSuite.Results, "total": len(testSuite.Results), "failed": failedCount})`,
      explanation:
        "T records failures like testing.T, and Suite.Run plays the part of t.Run: it names the case (spaces become underscores), runs the function with a deferred recover so a panic is a failure rather than a crash, stores a Result and prints a PASS or FAIL line. The same table drives three suites: ParseSKU and ParseBin pass every case, while looseSKU, whose pattern has no ^ and $, wrongly accepts ROPE-0412, ROP-0412-b, a leading space and trailing junk, so four rows turn red. That is the table-driven style: the cases are data, the check is written once, and a new bug becomes a new line. In a real project the loop body goes inside func TestParseSKU(t *testing.T) with t.Run(tc.name, ...) and runs with go test -v.",
      hints: [
        { id: "h1", title: "T and Errorf", content: "type T struct { name string; failed bool; msgs []string } and func (t *T) Errorf(format string, args ...any) { t.failed = true; t.msgs = append(t.msgs, fmt.Sprintf(format, args...)) }. The ... lets Errorf take any number of values, like fmt.Printf." },
        { id: "h2", title: "Run", content: "t := &T{name: strings.ReplaceAll(name, \" \", \"_\")}. Call f(t) inside an anonymous function with defer func() { if p := recover(); p != nil { t.Errorf(\"panic: %v\", p) } }() so a panic is recorded. Then append Result{Name: t.name, Pass: !t.failed, Msg: strings.Join(t.msgs, \"; \")} to r.Results and print the PASS/FAIL line." },
        { id: "h3", title: "The loops", content: "for _, tc := range skuCases { testSuite.Run(\"ParseSKU/\"+tc.name, func(t *T) { _, err := ParseSKU(tc.in); if (err == nil) != tc.ok { t.Errorf(\"ParseSKU(%q): ok = %t, want %t\", tc.in, err == nil, tc.ok) } }) }. Repeat for binCases with ParseBin, and for skuCases with looseSKU(tc.in) != tc.ok. Count the failures by ranging over testSuite.Results." },
      ],
      tests: [
        {
          id: "t1",
          description: "The real parsers pass every case in their tables",
          assertionCode: js`
assert(scene.tests && Array.isArray(scene.tests.results), "Send tests with scene(\"tests\", map[string]any{\"results\": testSuite.Results, ...}).");
const res = scene.tests.results;
const sku = res.filter((r) => String(r.Name).startsWith("ParseSKU/"));
const bin = res.filter((r) => String(r.Name).startsWith("ParseBin/"));
assert(sku.length >= 10, "Run every skuCases entry as ParseSKU/<name> (at least 10 cases).");
assert(bin.length >= 8, "Run every binCases entry as ParseBin/<name> (8 cases).");
assert(sku.every((r) => r.Pass) && bin.every((r) => r.Pass), "ParseSKU and ParseBin should pass every case. A red row here means a pattern or a check is wrong.");`,
        },
        {
          id: "t2",
          description: "Subtest names follow the Go style",
          assertionCode: js`
const names = scene.tests.results.map((r) => r.Name);
assert(names.includes("ParseSKU/with_revision") && names.includes("ParseSKU/leading_space"), "Spaces in a case name become underscores, as in t.Run: ParseSKU/with_revision, ParseSKU/leading_space.");
assert(lines.includes("--- PASS: ParseSKU/plain"), 'No line is exactly "--- PASS: ParseSKU/plain". Run should print --- PASS: <name> for a passing case.');`,
        },
        {
          id: "t3",
          description: "The unanchored checker fails exactly where the anchors would have helped",
          assertionCode: js`
const failed = scene.tests.results.filter((r) => !r.Pass).map((r) => r.Name);
for (const n of ["looseSKU/four_letters", "looseSKU/lowercase_revision", "looseSKU/leading_space", "looseSKU/trailing_junk"]) {
  assert(failed.includes(n), "Expected " + n + " to FAIL: looseSKU has no ^ and $, so it accepts it. Run looseSKU over skuCases and report a failure with t.Errorf when the answer differs from tc.ok.");
}
assert(failed.every((n) => String(n).startsWith("looseSKU/")), "Only looseSKU cases should fail; ParseSKU and ParseBin must be green.");
assertEqual(scene.tests.failed, failed.length, "failed (the number of results with Pass false)");`,
        },
        {
          id: "t4",
          description: "A failing case prints its message with got and want",
          assertionCode: js`
assert(lines.some((l) => l.startsWith("--- FAIL: looseSKU/trailing_junk (") && l.includes("want false")), 'Expected a line like --- FAIL: looseSKU/trailing_junk (looseSKU("ROP-0412!") = true, want false). Print the failure message after the name.');`,
        },
      ],
      unlocks: ["gi-tests"],
      checks: [
        {
          prompt: "Why use one subtest (`t.Run`) per case instead of one big loop with several checks inside a single test?",
          question: { type: "choice", options: ["It is required by the compiler", "Each case gets its own name and result, so one failure does not hide the others", "It runs faster", "It avoids imports"], answer: 1 },
          explanation: "Subtests report separately (TestParseSKU/lowercase), can be run on their own with -run, and a failure in one does not stop the rest.",
        },
        {
          prompt: "A table row is red. What is the right first question?",
          question: { type: "choice", options: ["Delete the row", "Is the code wrong, or is the expectation wrong?", "Re-run until it passes", "Comment out the loop"], answer: 1 },
          explanation: "A failing row is information. Decide which side is mistaken. If it is the code, fix it and keep the row as a regression test.",
        },
      ],
    },

    // ───────────────────────── 16 ─────────────────────────
    {
      id: "go-inventory-16-closeout",
      title: "Capstone: close the day's books",
      minutes: 60,
      xp: 260,
      concepts: ["putting it together", "decode + validate + dispatch", "reconciliation", "typed rejections", "tests as a release gate"],
      learn: md`### Everything you have built, in one function chain

Fifteen lessons ago the depot had a shelf and nothing else. Now it has methods, handlers behind an interface, typed errors, generics, a JSON importer, validation, regexps, a line reader and a test harness. The last job is the one every depot does at the end of a day: **close the books**. Start from the opening stock, apply the movement log, set aside everything that was refused, and prove that the shelves add up.

There is very little new syntax in this lesson. The skill is **assembly**: deciding what each piece is responsible for, and joining them with plain data.

### The plan

~~~text
openingStock (JSON)  ──decode + validate──▶  []Item  ─┐
                                                      ├─▶ apply each movement ─▶ closing stock
stdin log ──readLog──▶ []Movement ───────────────────┘          │
        │                                                        ├─▶ rejected: typed badges
        └─▶ parse errors ────────────────────────────────────────┘
closing stock + totals ──▶ reconcile ──▶ report ──▶ tests as the release gate
~~~

Each arrow is a function you already wrote or one short new one:

- \`loadStock(doc string) ([]Item, []error)\` decodes each record with \`decodeItem\`, runs \`Validate\`, and converts good ones to \`Item\` (\`*ri.Qty\` is safe once \`Validate\` has passed). Bad records become errors with their position, wrapped with \`%w\`.
- \`applyMovement(stock, handlers, m)\` is lesson 6's \`process\` with the lesson 7 \`guard\` around the handler, so a panicking handler cannot end the day. A movement may also carry a bin: if it does, the item moves there.
- \`badgeOf(err)\` names each rejection for the board: the **type** found with \`errors.As\` (\`*main.ParseError\`, \`*main.StockError\`, \`*main.PanicError\`) or, when there is only a sentinel, its name.

### Reconciliation: an equation that must hold

The oldest check in bookkeeping:

~~~text
opening + received + returned - issued - retired = closing
~~~

Compute the right-hand side by counting the **actual** shelves after the run, and the left-hand side from the **movements that were applied**. If they differ, a handler lost or invented stock, or you counted a refused movement as applied. Failing the equation is a loud, early way to find such a bug. Write it as a tiny pure function, \`reconcile(...) bool\`, so it can be tested with a table.

### Dispatch through interfaces

The handler table maps each kind to a \`Handler\`. Wrap the issuer in the lesson 4 auditor (\`&Audited{Handler: StrictIssuer{}}\`) to count calls without touching it. Register \`RETURN\` with the same \`Receiver\` as \`RECEIVE\`. Use \`fmt.Sprintf("%T", h)\` to show which concrete type handled a movement; the board draws it.

### Reuse the generics

\`Sum(Map(items, func(it Item) int { return it.Qty }))\` is the total of any stock. One line, no loop to get wrong.

### The release gate

Last, run a **table of tests over the pieces you just wrote** (\`reconcile\`, \`applyMovement\`, \`parseMovement\`) with the lesson 15 harness. A program that reports its own test results before it prints "done" is how real services gate a release. Everything must be green.

### Common mistakes

- Counting a refused movement in the totals.
- Applying movements to the *opening* slice and then comparing it with itself: clone the opening stock first (\`slices.Clone\`), so you still have the "before".
- Mutating a handler's shared state (\`Retirer\`) across lessons without noticing: make a fresh handler table for the capstone.
- Reading standard input a second time and getting nothing. Replay the copy you kept in \`logCopy\`.
- Ending \`main\` early on the first problem. The whole point is to carry on and report.`,
      mission: md`It is the end of the Saturday call-out and Cairn Depot has to close its books. The opening stock is in the supplier export, the day's movements are on standard input, and the depot manager wants three things on one screen: the **closing shelves**, an **inbox of everything refused with the reason**, and a **reconciliation** that proves no unit of gear went missing between the opening and closing counts.

Assemble the whole program. When this lesson passes the **Close-out** lights up and every panel on the board shows real data.`,
      tasks: [
        "Write func loadStock(doc string) ([]Item, []error): Unmarshal into a stockDoc, then for each record decodeItem and Validate; errors are wrapped with fmt.Errorf(\"record %d: %w\", i, err); good records become Item{SKU, Name, Qty: *ri.Qty, Bin}",
        "Write func applyMovement(stock []Item, handlers map[string]Handler, m Movement) error (unknown kind, lookup, guard around h.Handle, then update the item's Bin when the movement has one, all wrapped with the line number as in lesson 6) and func badgeOf(err error) string (errors.As for *ParseError, *StockError and *PanicError using fmt.Sprintf(\"%T\", target); otherwise the sentinel names ErrUnknownSKU / ErrUnknownKind; otherwise \"error\") and func reconcile(opening, received, returned, issued, retired, closing int) bool",
        "In main: openItems, importProblems := loadStock(openingStock); closeStock := slices.Clone(openItems); replay the log with readLog(strings.NewReader(logCopy.String())); closeRetirer := &Retirer{}; the handler table RECEIVE and RETURN: Receiver{}, ISSUE: closeIssuer (&Audited{Handler: StrictIssuer{}}), RETIRE: closeRetirer",
        "Apply every movement: record a lane row (line, kind, sku, qty, handler %T, ok), add to the right total only when applied, and collect each refusal as a Rejection row (line, text, badge, class, message); add every parse error too (text from the *ParseError), then sort the rejections by line with slices.SortFunc",
        "Compute openingTotal and closingTotal with Sum and Map, print the report (renderTable(os.Stdout, closeStock) then one line per total, then Balanced: yes or no) and send shelves (closeStock), lane, inbox (the rejections) and closeout (opening, received, returned, issued, retired, closing, balanced, applied, rejected, audit {calls, failed}) with scene",
        "Run the release gate: a Suite with reconcile cases (4), applyMovement cases (5, on a fresh seedStock() each) and parseMovement cases (4); send gateTests (results, total, failed) with scene and print Release gate: PASS or FAIL",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
${openingStockConst}

// Lesson 16: write these (all the pieces from lessons 2 to 15 are available to you).
//   func loadStock(doc string) ([]Item, []error)       decodeItem + Validate, errors wrapped with the record number
//   func applyMovement(stock []Item, handlers map[string]Handler, m Movement) error
//                                                      like process (lesson 6) but with guard (lesson 7) and a Bin update
//   func badgeOf(err error) string                     "*main.ParseError" "*main.StockError" "*main.PanicError" "ErrUnknownSKU" ...
//   func reconcile(opening, received, returned, issued, retired, closing int) bool
//                                                      opening + received + returned - issued - retired == closing

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 16: close the books.
// 1. openItems, importProblems := loadStock(openingStock)       closeStock := slices.Clone(openItems)
//    movesAll, closeParseErrs, _ := readLog(strings.NewReader(logCopy.String()))     (the stdin copy from lesson 14)
//    closeRetirer := &Retirer{}   closeIssuer := &Audited{Handler: StrictIssuer{}}
//    closeHandlers := map[string]Handler{"RECEIVE": Receiver{}, "RETURN": Receiver{}, "ISSUE": closeIssuer, "RETIRE": closeRetirer}
// 2. for each movement: err := applyMovement(closeStock, closeHandlers, m)
//      closeLane rows: line, kind, sku, qty, handler (%T of closeHandlers[m.Kind]), ok
//      on success add m.Qty to received / returned / issued / retired by m.Kind; applied++
//      on failure a rejection row: line, text (fmt.Sprintf("%s %s %d", m.Kind, m.SKU, m.Qty)), badge badgeOf(err), class (classify(err)), message
//    closeParseErrs: errors.As -> *ParseError: line, text pe.Text, badge badgeOf(err), class parseClass(err), message
//    sort the rejection rows by line (slices.SortFunc + cmp.Compare)
// 3. openingTotal := Sum(Map(openItems, ...)); closingTotal := Sum(Map(closeStock, ...)); balanced := reconcile(...)
//    renderTable(os.Stdout, closeStock) and a few Printf lines; fmt.Println("Balanced:", "yes" or "no")
//    scene("shelves", closeStock) scene("lane", closeLane) scene("inbox", closeInbox) scene("closeout", map[string]any{...})
// 4. gate := &Suite{} with reconcile / applyMovement / parseMovement tables; scene("gateTests", ...); fmt.Println("Release gate:", ...)`,
      solutionAdd: go`${openingStockConst}

// loadStock decodes and validates every record of a stock export.
func loadStock(doc string) ([]Item, []error) {
	var d stockDoc
	if err := json.Unmarshal([]byte(doc), &d); err != nil {
		return nil, []error{err}
	}
	var items []Item
	var errs []error
	for i, raw := range d.Items {
		ri, err := decodeItem(raw)
		if err == nil {
			err = ri.Validate()
		}
		if err != nil {
			errs = append(errs, fmt.Errorf("record %d: %w", i, err))
			continue
		}
		items = append(items, Item{SKU: ri.SKU, Name: ri.Name, Qty: *ri.Qty, Bin: ri.Bin})
	}
	return items, errs
}

// applyMovement runs one movement through its handler, behind the panic guard, with context added at each layer.
func applyMovement(stock []Item, handlers map[string]Handler, m Movement) error {
	h, ok := handlers[m.Kind]
	if !ok {
		return fmt.Errorf("line %d: %q: %w", m.Line, m.Kind, ErrUnknownKind)
	}
	it, err := lookup(stock, m.SKU)
	if err != nil {
		return fmt.Errorf("line %d: %w", m.Line, err)
	}
	if err := guard(h, it, m); err != nil {
		return fmt.Errorf("line %d: %s %s: %w", m.Line, m.Kind, m.SKU, err)
	}
	if m.Bin != "" {
		it.Bin = m.Bin
	}
	return nil
}

// badgeOf names a rejection for the board: its error type, or its sentinel.
func badgeOf(err error) string {
	var pe *ParseError
	var se *StockError
	var pan *PanicError
	switch {
	case errors.As(err, &pe):
		return fmt.Sprintf("%T", pe)
	case errors.As(err, &se):
		return fmt.Sprintf("%T", se)
	case errors.As(err, &pan):
		return fmt.Sprintf("%T", pan)
	case errors.Is(err, ErrUnknownSKU):
		return "ErrUnknownSKU"
	case errors.Is(err, ErrUnknownKind):
		return "ErrUnknownKind"
	}
	return "error"
}

// reconcile checks the bookkeeping equation.
func reconcile(opening, received, returned, issued, retired, closing int) bool {
	return opening+received+returned-issued-retired == closing
}

${MAIN_DIVIDER}

// Lesson 16: close the books.
openItems, importProblems := loadStock(openingStock)
closeStock := slices.Clone(openItems)
movesAll, closeParseErrs, _ := readLog(strings.NewReader(logCopy.String()))
closeRetirer := &Retirer{}
closeIssuer := &Audited{Handler: StrictIssuer{}}
closeHandlers := map[string]Handler{"RECEIVE": Receiver{}, "RETURN": Receiver{}, "ISSUE": closeIssuer, "RETIRE": closeRetirer}
fmt.Println("opening stock:", len(openItems), "lines,", len(importProblems), "problems; log:", len(movesAll), "movements,", len(closeParseErrs), "unreadable lines")

var closeLane, closeInbox []map[string]any
var received, returned, issued, retiredUnits, applied int
for _, m := range movesAll {
	err := applyMovement(closeStock, closeHandlers, m)
	closeLane = append(closeLane, map[string]any{"line": m.Line, "kind": m.Kind, "sku": m.SKU, "qty": m.Qty, "handler": fmt.Sprintf("%T", closeHandlers[m.Kind]), "ok": err == nil})
	if err != nil {
		closeInbox = append(closeInbox, map[string]any{"line": m.Line, "text": fmt.Sprintf("%s %s %d", m.Kind, m.SKU, m.Qty), "badge": badgeOf(err), "class": classify(err), "message": err.Error()})
		continue
	}
	applied++
	switch m.Kind {
	case "RECEIVE":
		received += m.Qty
	case "RETURN":
		returned += m.Qty
	case "ISSUE":
		issued += m.Qty
	case "RETIRE":
		retiredUnits += m.Qty
	}
}
for _, err := range closeParseErrs {
	var pe *ParseError
	if errors.As(err, &pe) {
		closeInbox = append(closeInbox, map[string]any{"line": pe.Line, "text": pe.Text, "badge": badgeOf(err), "class": parseClass(err), "message": err.Error()})
	}
}
slices.SortFunc(closeInbox, func(a, b map[string]any) int { return cmp.Compare(a["line"].(int), b["line"].(int)) })

qtyOf := func(it Item) int { return it.Qty }
openingTotal := Sum(Map(openItems, qtyOf))
closingTotal := Sum(Map(closeStock, qtyOf))
balanced := reconcile(openingTotal, received, returned, issued, retiredUnits, closingTotal)

renderTable(os.Stdout, closeStock)
fmt.Printf("%-9s %4d\n", "Opening", openingTotal)
fmt.Printf("%-9s %+4d\n", "Received", received)
fmt.Printf("%-9s %+4d\n", "Returned", returned)
fmt.Printf("%-9s %+4d\n", "Issued", -issued)
fmt.Printf("%-9s %+4d\n", "Retired", -retiredUnits)
fmt.Printf("%-9s %4d\n", "Closing", closingTotal)
if balanced {
	fmt.Println("Balanced: yes")
} else {
	fmt.Println("Balanced: no")
}

scene("shelves", closeStock)
scene("lane", closeLane)
scene("inbox", closeInbox)
scene("closeout", map[string]any{
	"opening": openingTotal, "received": received, "returned": returned, "issued": issued, "retired": retiredUnits,
	"closing": closingTotal, "balanced": balanced, "applied": applied, "rejected": len(closeInbox),
	"audit": map[string]int{"calls": closeIssuer.Calls, "failed": closeIssuer.Failed},
})

// The release gate: a table of tests over the pieces just written.
gate := &Suite{}
reconcileCases := []struct {
	name                                              string
	open, rec, ret, iss, retd, closing                int
	want                                              bool
}{
	{"balanced", 103, 14, 2, 21, 3, 95, true},
	{"one unit lost", 103, 14, 2, 21, 3, 94, false},
	{"nothing moved", 50, 0, 0, 0, 0, 50, true},
	{"only issues", 10, 0, 0, 10, 0, 0, true},
}
for _, tc := range reconcileCases {
	gate.Run("reconcile/"+tc.name, func(t *T) {
		if got := reconcile(tc.open, tc.rec, tc.ret, tc.iss, tc.retd, tc.closing); got != tc.want {
			t.Errorf("reconcile = %t, want %t", got, tc.want)
		}
	})
}
applyCases := []struct {
	name string
	m    Movement
	want error
}{
	{"receive", Movement{Line: 1, Kind: "RECEIVE", SKU: "ROP-0412", Qty: 1}, nil},
	{"issue", Movement{Line: 2, Kind: "ISSUE", SKU: "ROP-0412", Qty: 2}, nil},
	{"issue too many", Movement{Line: 3, Kind: "ISSUE", SKU: "RAD-0031", Qty: 50}, ErrShort},
	{"unknown sku", Movement{Line: 4, Kind: "ISSUE", SKU: "ZZZ-0000", Qty: 1}, ErrUnknownSKU},
	{"unknown kind", Movement{Line: 5, Kind: "LOAN", SKU: "ROP-0412", Qty: 1}, ErrUnknownKind},
}
for _, tc := range applyCases {
	gate.Run("applyMovement/"+tc.name, func(t *T) {
		err := applyMovement(seedStock(), closeHandlers, tc.m)
		if tc.want == nil && err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if tc.want != nil && !errors.Is(err, tc.want) {
			t.Errorf("error = %v, want one wrapping %v", err, tc.want)
		}
	})
}
parseCases := []struct {
	name string
	text string
	want error
}{
	{"good line", "ISSUE ROP-0412 2", nil},
	{"bad sku", "ISSUE rop-0412 2", ErrBadSKU},
	{"too few fields", "ISSUE ROP-0412", ErrFields},
	{"negative quantity", "RECEIVE ROP-0412 -5", ErrBadQty},
}
for _, tc := range parseCases {
	gate.Run("parseMovement/"+tc.name, func(t *T) {
		_, err := parseMovement(1, tc.text)
		if tc.want == nil && err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if tc.want != nil && !errors.Is(err, tc.want) {
			t.Errorf("error = %v, want one wrapping %v", err, tc.want)
		}
	})
}
gateFailed := 0
for _, res := range gate.Results {
	if !res.Pass {
		gateFailed++
	}
}
scene("gateTests", map[string]any{"results": gate.Results, "total": len(gate.Results), "failed": gateFailed})
if gateFailed == 0 {
	fmt.Println("Release gate: PASS")
} else {
	fmt.Println("Release gate: FAIL")
}`,
      explanation:
        "loadStock reuses decodeItem and Validate and only converts a record to an Item after it is known to be valid (so *ri.Qty is safe). applyMovement is process from lesson 6 with the lesson 7 guard around the handler and a bin update, and badgeOf asks errors.As for the typed errors and errors.Is for the sentinels, so each rejection carries a badge. The closing stock is applied to a clone of the opening items, so the 'before' survives: 103 units to start, +14 received, +2 returned, -21 issued, -3 retired gives 95, and reconcile says yes. Eleven lines parse and nine are applied (the shortage on line 6 and the unknown SKU on line 9 are refused), six lines never parse, so the inbox holds eight refusals sorted by line. The release gate runs 13 table cases through the lesson 15 harness and all are green.",
      hints: [
        { id: "h1", title: "loadStock and applyMovement", content: "loadStock: var d stockDoc; json.Unmarshal; for i, raw := range d.Items { ri, err := decodeItem(raw); if err == nil { err = ri.Validate() }; if err != nil { errs = append(errs, fmt.Errorf(\"record %d: %w\", i, err)); continue }; items = append(items, Item{SKU: ri.SKU, Name: ri.Name, Qty: *ri.Qty, Bin: ri.Bin}) }. applyMovement is process from lesson 6 with guard(h, it, m) instead of h.Handle and, at the end, if m.Bin != \"\" { it.Bin = m.Bin }." },
        { id: "h2", title: "The apply loop", content: "For each movement: err := applyMovement(closeStock, closeHandlers, m). Always append a lane row (ok: err == nil). On error append a rejection row and continue; on success add m.Qty to the total chosen by a switch on m.Kind. Parse errors: var pe *ParseError; if errors.As(err, &pe) { ... pe.Line, pe.Text ... }. Sort: slices.SortFunc(rows, func(a, b map[string]any) int { return cmp.Compare(a[\"line\"].(int), b[\"line\"].(int)) })." },
        { id: "h3", title: "Totals and the gate", content: "qtyOf := func(it Item) int { return it.Qty }; openingTotal := Sum(Map(openItems, qtyOf)). balanced := reconcile(openingTotal, received, returned, issued, retiredUnits, closingTotal). For the gate, make gate := &Suite{} and a table per function; use errors.Is(err, tc.want) for the error cases. Send gateTests like tests: results, total, failed." },
      ],
      tests: [
        {
          id: "t1",
          description: "The books balance: opening plus movements equals closing",
          assertionCode: js`
assert(scene.closeout && typeof scene.closeout === "object", "Send closeout with scene(\"closeout\", ...).");
const c = scene.closeout;
assertEqual([c.opening, c.received, c.returned, c.issued, c.retired, c.closing], [103, 14, 2, 21, 3, 95], "[opening, received, returned, issued, retired, closing] (add only movements that were actually applied; count the closing shelves from the clone)");
assertEqual(c.balanced, true, "balanced (opening + received + returned - issued - retired == closing)");
assert(lines.includes("Balanced: yes"), 'No line is exactly "Balanced: yes". Print it after the report.');`,
        },
        {
          id: "t2",
          description: "The closing shelves reflect only the applied movements",
          assertionCode: js`
const q = (sku) => (scene.shelves || []).find((s) => s.SKU === sku);
assertEqual(["ROP-0412", "ROP-0518", "HAR-0210", "HEL-0107", "RAD-0031", "BAT-0880", "SPL-0044", "BLK-0150"].map((s) => q(s)?.Qty), [10, 2, 8, 12, 3, 20, 0, 40], "closing quantities in shelf order");
assertEqual(q("HAR-0210")?.Bin, "B2-09", "HAR-0210's bin (the RETURN on line 15 named bin B2-09)");`,
        },
        {
          id: "t3",
          description: "Every refusal is in the inbox with a typed badge, ordered by line",
          assertionCode: js`
assert(Array.isArray(scene.inbox), "Send the rejections with scene(\"inbox\", closeInbox).");
assertEqual(scene.inbox.map((r) => r.line), [6, 9, 10, 11, 12, 13, 14, 17], "rejected lines in order (2 refused while applying, 6 unreadable)");
assertEqual(scene.inbox.map((r) => r.badge), ["*main.StockError", "ErrUnknownSKU", "*main.ParseError", "*main.ParseError", "*main.ParseError", "*main.ParseError", "*main.ParseError", "*main.ParseError"], "badges (errors.As for the typed errors, errors.Is for the sentinel)");`,
        },
        {
          id: "t4",
          description: "The lane shows the concrete type that handled each movement",
          assertionCode: js`
assert(Array.isArray(scene.lane), "Send the lane rows with scene(\"lane\", closeLane).");
assertEqual(scene.lane.map((r) => r.line), [2, 3, 4, 6, 7, 8, 9, 15, 16, 18, 19], "lane lines (the 11 movements that parsed)");
assertEqual(scene.lane.map((r) => r.handler), ["main.Receiver", "*main.Audited", "*main.Audited", "*main.Audited", "*main.Retirer", "main.Receiver", "*main.Audited", "main.Receiver", "*main.Audited", "*main.Retirer", "*main.Audited"], "handler types (ISSUE goes through the Audited wrapper; RETURN uses Receiver)");
assertEqual(scene.closeout.audit, { calls: 5, failed: 1 }, "audit (the wrapper was called for 5 issues that found their item; one was short)");`,
        },
        {
          id: "t5",
          description: "The release gate runs your own test table and everything is green",
          assertionCode: js`
assert(scene.gateTests && Array.isArray(scene.gateTests.results), "Send gateTests with scene(\"gateTests\", ...).");
assert(scene.gateTests.results.length >= 13, "Run 4 reconcile, 5 applyMovement and 4 parseMovement cases through the Suite (13 at least).");
assertEqual(scene.gateTests.failed, 0, "gateTests failed (every case should pass)");
assert(lines.includes("Release gate: PASS"), 'No line is exactly "Release gate: PASS". Print it once the gate is green.');`,
        },
      ],
      unlocks: ["gi-close"],
      checks: [
        {
          prompt: "Why clone the opening stock before applying movements?",
          question: { type: "choice", options: ["Clones are faster", "So the opening totals are still available to compare with the closing totals", "Go requires it", "To avoid the race detector"], answer: 1 },
          explanation: "Reconciliation compares before and after. If the movements change the only copy, the 'before' is gone. Item values copy cleanly, so slices.Clone is enough.",
        },
        {
          prompt: "A refused movement must be…",
          question: { type: "choice", options: ["Added to the totals anyway", "Left out of the totals, reported with its reason", "Applied twice", "Ignored silently"], answer: 1 },
          explanation: "Totals describe what happened to the shelves. A refusal changed nothing, so it belongs in the inbox, not in the sums.",
        },
      ],
    },
  ],
};
