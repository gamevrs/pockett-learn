import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { go, js, md } from "./util.ts";

/**
 * Chapter 3: Building blocks. Functions, returned errors, structs with methods, and a first
 * interface. Every lesson adds package-level declarations above MAIN_DIVIDER and statements below it
 * (see engine/compose.ts): the declarations land before `func main`, the statements at the end of main.
 *
 * Names these lessons rely on from earlier ones: `rows` (lesson 7), `weights` (7), `regionOf` (8),
 * `chuteLabels` (7), `maxGrams` and `Region` (2), `rejected` (2), `hubName`/`shift` (2), `err` (4).
 */
export const chapter3: Chapter = {
  id: "building-blocks",
  title: "Building blocks",
  blurb: "Name your ideas as functions, treat failure as a value, group data into structs and describe behaviour with an interface.",
  lessons: [
    // ───────────────────────── 9 ─────────────────────────
    {
      id: "go-basics-9-functions",
      title: "Functions",
      minutes: 30,
      xp: 120,
      concepts: ["func", "parameters", "multiple return values", "named results", "variadic functions", "scope"],
      learn: md`### The same rule, typed three times

Look at your program from the last four lessons. The weight-class rules from lesson 5 live in a \`switch\`. The "split a manifest row and parse its weight" steps appear in lesson 6, again in lesson 7 and again in lesson 8. Every copy has to be fixed separately when the rules change, and a reader has to re-read each one to check it says the same thing.

A **function** gives an idea a name so you write it once and use it anywhere. It is the single most important tool for keeping a program understandable.

### Anatomy of a function

~~~go
func gramsToKg(g int) float64 {
	return math.Round(float64(g)/10) / 100
}
~~~

- \`func\` starts the declaration, then the **name**, then the **parameters** in parentheses, then the **result type**, then the body in braces.
- In Go the type comes **after** the name: \`g int\`, not \`int g\`. Several parameters of one type can share it: \`func add(a, b int) int\`.
- \`return\` hands a value back to the caller. A function with no result type has nothing after \`return\` (or no \`return\` at all).
- Call it by name: \`kg := gramsToKg(2400)\`.

Package-level functions can be written **in any order**. \`main\` may call a function that appears further down the file. (Local variables are different: they must be declared before use.) In this course your new functions are placed above \`func main\` so you read helpers first, but Go does not care.

### Arguments are copies

When you call a function Go copies each argument into the parameter. Changing the parameter changes only the copy:

~~~go
func double(n int) { n *= 2 }

x := 4
double(x)
fmt.Println(x) // 4
~~~

A slice or a map is a small descriptor that points at shared data, so the *descriptor* is copied but both copies see the same elements. Lesson 7 showed how slices share memory; this is the same effect. Lesson 11 shows how to hand a function a pointer when you really want it to change your value.

### Functions only see their own world

Inside \`parseRow\` you cannot use \`weights\` or \`rows\` from \`main\`. A function sees its parameters, its own local variables and package-level names (constants, types, other functions). Anything else is \`undefined\`. That is a feature: to know what a function depends on you only read its first line.

### Multiple return values

Go functions can return more than one value, and the language leans on it everywhere:

~~~go
func summarize(weights ...int) (count, total, heaviest int) { ... }

n, err := strconv.Atoi("42")      // a value and an error
r, ok := regionOf["north"]        // a value and "was it there?"
~~~

The caller must take **all** the results, or throw one away with the blank identifier \`_\`:

~~~go
firstID, _, firstGrams, firstOK := parseRow(rows[0])   // ignore the region
~~~

Taking the wrong number is a compile error:

~~~text
./main.go:34:10: assignment mismatch: 2 variables but one returns 1 value
~~~

### Named results and the bare return

You may name the results. They then exist inside the function as variables, already set to their **zero values**, and a bare \`return\` sends back whatever they hold:

~~~go
func parseRow(row string) (id, region string, grams int, ok bool) {
	fields := strings.Fields(row)
	if len(fields) != 3 {
		return            // "", "", 0, false: ok is false by default
	}
	n, err := strconv.Atoi(fields[2])
	if err != nil {
		return
	}
	return fields[0], strings.ToLower(fields[1]), n, true
}
~~~

Naming results is great documentation (you can see which \`string\` is the id and which is the region) and gives you free "failure" defaults. Use the bare \`return\` only in short functions. In a long one the reader cannot tell what is being returned, so write the values out.

### Variadic functions

A final parameter written \`...int\` accepts any number of ints, including none. Inside the function it is an ordinary \`[]int\`:

~~~go
func summarize(weights ...int) (count, total, heaviest int) {
	count = len(weights)
	for _, w := range weights {
		total += w
		if w > heaviest {
			heaviest = w
		}
	}
	return
}

summarize(300, 800, 2400)   // pass values one by one
summarize(weights...)       // or spread an existing slice with ...
~~~

\`fmt.Println\` is variadic too: that is why you can give it any number of values.

### Real compiler messages you will meet

~~~text
./main.go:33:18: not enough arguments in call to add
	have (number)
	want (int, int)
./main.go:35:21: cannot use "2" (untyped string constant) as int value in argument to add
./main.go:28:1: missing return
./main.go:33:14: undefined: undefinedThing
~~~

\`missing return\` means some path through the function ends without a \`return\`. The compiler checks every path, including the "else" you forgot.

### Common mistakes

- Writing the same logic in \`main\` *and* in a function and letting them drift apart. Move it, do not copy it.
- Expecting a function to change the caller's \`int\` or \`string\`. It received a copy.
- Using a bare \`return\` in a long function so nobody knows what comes back.
- Calling \`summarize(weights)\` instead of \`summarize(weights...)\`: a slice is not an \`int\`.
- Forgetting that a name you declare but never use is an error: \`declared and not used: x\`.`,
      mission: md`Your manifest code works, but it is a wall of copied loops. Before the hub grows any further, the senior engineer asks you to pull the rules out into named functions: kilograms from grams, the weight class, "read one manifest row" and a batch summary.

When this lesson passes, the **Weigh station** lights up on the sorting floor: the weight classes of the batch, its total, its heaviest parcel and whether a row could be read.`,
      tasks: [
        "Write gramsToKg(g int) float64 (kilograms rounded to 2 decimals with math.Round) and classify(g int) string with the lesson 5 classes: Invalid (0 or less), Envelope (under 500), Small (under 2000), Standard (up to 10000), Freight (up to maxGrams), Overweight (above)",
        "Write parseRow(row string) (id, region string, grams int, ok bool) with NAMED results: split with strings.Fields, require 3 fields, lower-case the region, ok is false when the row is wrong or the weight is not a number",
        "Write the variadic summarize(weights ...int) (count, total, heaviest int)",
        "In main build classCounts (class name -> how many of weights), call summarize(weights...), compute batchKg from the total and call parseRow on rows[0] and rows[7]",
        "Print: PK-2001 2400 true false  (first row's id, grams, ok, then the ok of rows[7]) and then: 11 parcels, 70.06 kg, heaviest 31000 g. Send classCounts, batchCount, batchTotal, batchHeaviest, batchKg, firstOK and badOK with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 9: write the four helper functions here. The signatures are given; the bodies are yours.
func gramsToKg(g int) float64 {
	return 0 // TODO: grams to kilograms, rounded to 2 decimals
}

func classify(g int) string {
	return "" // TODO: Invalid, Envelope, Small, Standard, Freight or Overweight
}

func parseRow(row string) (id, region string, grams int, ok bool) {
	return // TODO: use strings.Fields and strconv.Atoi
}

func summarize(weights ...int) (count, total, heaviest int) {
	return // TODO: loop over weights
}

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 9: put your new functions to work on the data you already have.
// 1. classCounts := map[string]int{}  then count classify(w) for every w in weights.
// 2. batchCount, batchTotal, batchHeaviest := summarize(weights...)
//    batchKg := gramsToKg(batchTotal)
// 3. firstID, _, firstGrams, firstOK := parseRow(rows[0])
//    _, _, _, badOK := parseRow(rows[7])
// 4. Print:  PK-2001 2400 true false      (firstID, firstGrams, firstOK, badOK)
//    Print:  11 parcels, 70.06 kg, heaviest 31000 g
// 5. scene: classCounts, batchCount, batchTotal, batchHeaviest, batchKg, firstOK, badOK`,
      solutionAdd: go`// gramsToKg converts grams to kilograms, rounded to two decimals.
func gramsToKg(g int) float64 {
	return math.Round(float64(g)/10) / 100
}

// classify names the weight class of a parcel (the same rules as the switch in lesson 5).
func classify(g int) string {
	switch {
	case g <= 0:
		return "Invalid"
	case g < 500:
		return "Envelope"
	case g < 2000:
		return "Small"
	case g <= 10000:
		return "Standard"
	case g <= maxGrams:
		return "Freight"
	}
	return "Overweight"
}

// parseRow splits one manifest row. ok is false when the row cannot be read.
func parseRow(row string) (id, region string, grams int, ok bool) {
	fields := strings.Fields(row)
	if len(fields) != 3 {
		return
	}
	n, err := strconv.Atoi(fields[2])
	if err != nil {
		return
	}
	return fields[0], strings.ToLower(fields[1]), n, true
}

// summarize reports how many weights it was given, their total and the heaviest one.
func summarize(weights ...int) (count, total, heaviest int) {
	count = len(weights)
	for _, w := range weights {
		total += w
		if w > heaviest {
			heaviest = w
		}
	}
	return
}

${MAIN_DIVIDER}

// Lesson 9: use the new functions on the data we already collected.
classCounts := map[string]int{}
for _, w := range weights {
	classCounts[classify(w)]++
}
batchCount, batchTotal, batchHeaviest := summarize(weights...)
batchKg := gramsToKg(batchTotal)
firstID, _, firstGrams, firstOK := parseRow(rows[0])
_, _, _, badOK := parseRow(rows[7])
fmt.Println(firstID, firstGrams, firstOK, badOK)
fmt.Printf("%d parcels, %.2f kg, heaviest %d g\n", batchCount, batchKg, batchHeaviest)
scene("classCounts", classCounts)
scene("batchCount", batchCount)
scene("batchTotal", batchTotal)
scene("batchHeaviest", batchHeaviest)
scene("batchKg", batchKg)
scene("firstOK", firstOK)
scene("badOK", badOK)`,
      explanation:
        "classify, parseRow and summarize each hold one idea. parseRow uses named results, so a bare return reports ok=false with empty strings and a zero weight; only the final return fills them in. summarize is variadic, so summarize(weights...) spreads the slice, and inside it weights is just a []int. gramsToKg rounds with math.Round(float64(g)/10)/100. In main the underscore discards results you do not need: parseRow returns four values and you must take all four, even if some are _.",
      hints: [
        { id: "h1", title: "Signatures first", content: "Type comes after the name: func gramsToKg(g int) float64 { ... }. For classify use a tagless switch with return in each case, like lesson 5 but returning the class name; put return \"Overweight\" after the switch so every path returns." },
        { id: "h2", title: "parseRow with named results", content: "Because id, region, grams and ok are named, a bare return already returns their zero values (ok is false). Do: fields := strings.Fields(row); if len(fields) != 3 { return }; n, err := strconv.Atoi(fields[2]); if err != nil { return }; then finish with return fields[0], strings.ToLower(fields[1]), n, true." },
        { id: "h3", title: "summarize and the call sites", content: "Inside summarize, weights is a []int: set count = len(weights), then range over it adding to total and tracking the largest. In main call summarize(weights...) with the three dots. Take all four results of parseRow: firstID, _, firstGrams, firstOK := parseRow(rows[0])." },
      ],
      tests: [
        {
          id: "t1",
          description: "summarize returns the count, total and heaviest weight",
          assertionCode: js`
assert(scene.batchCount !== undefined, "Send batchCount with scene(\"batchCount\", batchCount).");
assertEqual(scene.batchCount, 11, "batchCount (summarize(weights...) should count the 11 readable weights)");
assertEqual(scene.batchTotal, 70060, "batchTotal (the sum of all weights)");
assertEqual(scene.batchHeaviest, 31000, "batchHeaviest (the biggest weight)");`,
        },
        {
          id: "t2",
          description: "gramsToKg rounds to two decimals",
          assertionCode: js`
assert(typeof scene.batchKg === "number", "Send batchKg with scene(\"batchKg\", batchKg).");
assertClose(scene.batchKg, 70.06, 0.0001, "batchKg should be gramsToKg(batchTotal), 70060 g = 70.06 kg");`,
        },
        {
          id: "t3",
          description: "classify names every weight class",
          assertionCode: js`
assert(scene.classCounts && typeof scene.classCounts === "object", "Send classCounts with scene(\"classCounts\", classCounts).");
assertEqual(scene.classCounts, { Envelope: 1, Small: 4, Standard: 4, Freight: 1, Overweight: 1 }, "classCounts (check the class limits: Envelope under 500, Small under 2000, Standard up to 10000, Freight up to 25000, Overweight above)");`,
        },
        {
          id: "t4",
          description: "parseRow says ok for a good row and not ok for a bad one",
          assertionCode: js`
assertEqual(scene.firstOK, true, "firstOK (rows[0] is a good row: PK-2001 north 2400)");
assertEqual(scene.badOK, false, "badOK (rows[7] is PK-2008 south abc, the weight is not a number, so ok must be false)");`,
        },
        {
          id: "t5",
          description: "the two result lines are printed",
          assertionCode: js`
assert(lines.includes("PK-2001 2400 true false"), 'No line is exactly "PK-2001 2400 true false". Print firstID, firstGrams, firstOK and badOK with fmt.Println.');
assert(lines.includes("11 parcels, 70.06 kg, heaviest 31000 g"), 'No line is exactly "11 parcels, 70.06 kg, heaviest 31000 g". Use fmt.Printf("%d parcels, %.2f kg, heaviest %d g\\n", ...).');`,
        },
      ],
      unlocks: ["go-weigh"],
      checks: [
        {
          prompt: "A function is declared as `func pair() (int, string)`. Which line compiles?",
          question: {
            type: "choice",
            options: ["`n := pair()`", "`n, s := pair()`", "`n, s, ok := pair()`", "`var n int = pair()`"],
            answer: 1,
          },
          explanation: "You must take every result. `n := pair()` gives `assignment mismatch: 1 variable but pair returns 2 values`, and asking for three variables from two results fails the same way. If you do not need one, write `n, _ := pair()`.",
        },
        {
          prompt: "What does this print?\n\n~~~go\nfunc double(n int) { n *= 2 }\n\nx := 4\ndouble(x)\nfmt.Println(x)\n~~~",
          question: { type: "choice", options: ["8", "4", "0", "It does not compile"], answer: 1 },
          explanation: "Arguments are copied into the parameters. `double` doubles its own copy of `n` and `x` in the caller stays 4. To change the caller's value you return the new value (`x = double(x)`) or pass a pointer, which lesson 11 covers.",
        },
        {
          prompt: "With `func total(nums ...int) int` and `s := []int{1, 2, 3}`, which call passes the slice's elements?",
          question: {
            type: "choice",
            options: ["`total(s)`", "`total(s...)`", "`total(...s)`", "`total([s])`"],
            answer: 1,
          },
          explanation: "Three dots AFTER a slice spread it into separate arguments: `total(s...)`. `total(s)` tries to pass one `[]int` where an `int` is expected, which is a compile error. Inside `total`, `nums` is an ordinary `[]int`.",
        },
      ],
    },

    // ───────────────────────── 10 ─────────────────────────
    {
      id: "go-basics-10-errors",
      title: "Errors you can hold",
      minutes: 35,
      xp: 140,
      concepts: ["error", "errors.New", "fmt.Errorf", "%w wrapping", "errors.Is", "guard clauses"],
      learn: md`### Why Go has no exceptions

In many languages a failing operation throws an exception that flies up the call stack until something catches it. The function signature gives no hint that it can happen. Go's designers chose the opposite: **a failure is an ordinary value that a function returns**. If \`strconv.Atoi\` can fail, its signature says so:

~~~go
func Atoi(s string) (int, error)
~~~

You cannot forget that failure exists, because the compiler makes you decide what to do with the second result. The price is a few more lines. The reward is that you can read a function top to bottom and see every place it might go wrong.

### What an error is

\`error\` is a tiny built-in interface:

~~~go
type error interface {
	Error() string
}
~~~

Anything with an \`Error() string\` method is an error. The zero value of an interface is \`nil\`, and by convention **\`nil\` means success**.

~~~go
n, err := strconv.Atoi("24kg")
if err != nil {
	fmt.Println("cannot read weight:", err)   // strconv.Atoi: parsing "24kg": invalid syntax
	return
}
~~~

Two rules go with that: check the error *before* using the value, and when there is an error treat the other result as meaningless (most functions return its zero value).

### Making your own errors

\`errors.New\` creates an error value from a message. Create the ones you want to recognise *once*, at package level, and name them \`ErrSomething\`. These are called **sentinel errors**:

~~~go
var (
	ErrOverweight = errors.New("parcel is over the weight limit")
	ErrBadWeight  = errors.New("weight is not a whole number")
)
~~~

Each call to \`errors.New\` makes a *distinct* value, even with identical text. Two sentinels are equal only if they are the very same one. That is exactly what makes them useful as labels.

### Guard clauses: handle trouble first, return early

Deeply nested \`if\` blocks are hard to read. Go style is to deal with each problem immediately and return, so the happy path runs straight down the left edge of the function:

~~~go
func screen(row string) (id, region string, grams int, err error) {
	fields := strings.Fields(row)
	if len(fields) != 3 {
		return id, "", 0, fmt.Errorf("%s: %w", id, ErrMalformed)
	}
	// ... more guards ...
	return id, region, n, nil     // the happy path, last
}
~~~

There is no \`else\` after a \`return\`. Order your guards from the cheapest and most basic ("is the row even shaped right?") to the more specific ("is it too heavy?").

### Adding context with %w

A bare "parcel is over the weight limit" does not say *which* parcel. \`fmt.Errorf\` builds a new message, and the verb \`%w\` (w for wrap) keeps the original error inside it:

~~~go
err := fmt.Errorf("%s: %d g, %w", id, n, ErrOverweight)
fmt.Println(err)    // PK-2007: 31000 g, parcel is over the weight limit
~~~

Use \`%v\` instead and you get the same text but the original error is gone: it has been flattened to a string. Go 1.20 and later allow more than one \`%w\` in a format.

### errors.Is: recognise an error inside a wrapped one

Because wrapping creates a new error value, comparing with \`==\` no longer matches:

~~~go
_, _, _, sample := screen("PK-9999 east 99999")
sample == ErrOverweight            // false: sample is the wrapper
errors.Is(sample, ErrOverweight)   // true: Is walks the chain of wrapped errors
~~~

\`errors.Is(err, target)\` follows the wrapping chain (\`errors.Unwrap\` peels one layer) and answers "is \`target\` anywhere inside?". Always use it for sentinels. A later course in the Go path adds \`errors.As\` for errors that carry data.

### Reading error text

By convention error messages are lower case, with no final full stop, because they get joined into longer messages ("PK-2007: 31000 g, parcel is over the weight limit"). Include the values that help you debug.

### Real compiler messages

~~~text
./main.go:20:9: not enough return values
	have (number)
	want (int, error)
./main.go:39:17: cannot use "boom" (constant of type string) as error value in variable declaration: string does not implement error (missing method Error)
./main.go:37:12: cannot convert "x" (untyped string constant) to type interface{Error() string}
~~~

The last one is what you get from \`if err == "x"\`: an error is not a string. Compare with \`errors.Is\` or look at \`err.Error()\`.

### Common mistakes

- Ignoring an error with \`_\`: \`n, _ := strconv.Atoi(text)\` silently turns "24kg" into \`0\`. Only discard an error when you can say why it cannot matter.
- Using the value before checking \`err\`.
- Wrapping with \`%v\` and then wondering why \`errors.Is\` says false.
- Comparing wrapped errors with \`==\`.
- Writing messages like "Error: Could not parse weight!" Keep them short and lower case.
- Not using a variable you declared: \`declared and not used: err\`. If you really do not care, say so with \`_\`.`,
      mission: md`The sorting hub has an ugly secret: when a row cannot be sorted your program just counts it. The dispatcher wants to know **why**: was it a typo in the weight, a region without a chute, or a parcel too heavy for the belt?

You will build \`screen\`, a function that checks one manifest row and returns a descriptive error, and a reject log that records each failure with a reason code. When this lesson passes the **Reject bin** lights up, showing every refused parcel and its reason.`,
      tasks: [
        "Declare four sentinel errors in one var block: ErrMalformed = errors.New(\"row is not 'id region grams'\"), ErrBadWeight = \"weight is not a whole number\", ErrOverweight = \"parcel is over the weight limit\", ErrUnknownRegion = \"no chute for that region\"",
        "Write screen(row string) (id, region string, grams int, err error) with guard clauses in this order: not exactly 3 fields, weight not a whole number, weight above maxGrams, region not in regionOf. Wrap the matching sentinel with %w and start every message with the id: PK-2013: row is not 'id region grams'  /  PK-2008: weight is not a whole number (strconv.Atoi: parsing \"abc\": invalid syntax)  /  PK-2007: 31000 g, parcel is over the weight limit  /  PK-2006: \"moon\": no chute for that region",
        "In main loop over rows with screen. On an error: rejected++, work out a reason code with errors.Is (malformed, bad-weight, overweight, unknown-region), count it in a reasons map, append map[string]string{\"id\": ..., \"reason\": ..., \"message\": ...} to rejectLog and print REJECT: followed by the error. Otherwise passed++",
        "Compare a wrapped error both ways: _, _, _, sample := screen(\"PK-9999 east 99999\"); sameDirect := sample == ErrOverweight and sameIs := errors.Is(sample, ErrOverweight)",
        "Send rejects (rejectLog), reasons, rejected, passed, sameDirect and sameIs with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 10: declare the four sentinel errors (ErrMalformed, ErrBadWeight, ErrOverweight, ErrUnknownRegion)
// and write screen. The stub below compiles so you can build on it.
func screen(row string) (id, region string, grams int, err error) {
	return // TODO: guard clauses, each returning a wrapped sentinel error
}

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 10: ask WHY each row fails.
// 1. var rejectLog []map[string]string
//    reasons := map[string]int{}
//    passed := 0
// 2. for _, row := range rows { rowID, _, _, rowErr := screen(row) ... }
//    On an error: rejected++, reason code via errors.Is, reasons[reason]++,
//    append {"id": rowID, "reason": reason, "message": rowErr.Error()}, print "REJECT:", rowErr
//    Otherwise passed++.
// 3. _, _, _, sample := screen("PK-9999 east 99999")
//    sameDirect := sample == ErrOverweight     sameIs := errors.Is(sample, ErrOverweight)
// 4. scene: rejects, reasons, rejected, passed, sameDirect, sameIs`,
      solutionAdd: go`// Sentinel errors: each is one distinct value that callers can recognise with errors.Is.
var (
	ErrMalformed     = errors.New("row is not 'id region grams'")
	ErrBadWeight     = errors.New("weight is not a whole number")
	ErrOverweight    = errors.New("parcel is over the weight limit")
	ErrUnknownRegion = errors.New("no chute for that region")
)

// screen checks one manifest row. It returns the parcel's parts, or the first problem it finds.
func screen(row string) (id, region string, grams int, err error) {
	fields := strings.Fields(row)
	if len(fields) == 0 {
		return "", "", 0, ErrMalformed
	}
	id = fields[0]
	if len(fields) != 3 {
		return id, "", 0, fmt.Errorf("%s: %w", id, ErrMalformed)
	}
	region = strings.ToLower(fields[1])
	n, convErr := strconv.Atoi(fields[2])
	if convErr != nil {
		return id, region, 0, fmt.Errorf("%s: %w (%v)", id, ErrBadWeight, convErr)
	}
	if n > maxGrams {
		return id, region, n, fmt.Errorf("%s: %d g, %w", id, n, ErrOverweight)
	}
	if _, known := regionOf[region]; !known {
		return id, region, n, fmt.Errorf("%s: %q: %w", id, region, ErrUnknownRegion)
	}
	return id, region, n, nil
}

${MAIN_DIVIDER}

// Lesson 10: find out WHY each row is refused.
var rejectLog []map[string]string
reasons := map[string]int{}
passed := 0
for _, row := range rows {
	rowID, _, _, rowErr := screen(row)
	if rowErr != nil {
		rejected++
		reason := "other"
		switch {
		case errors.Is(rowErr, ErrMalformed):
			reason = "malformed"
		case errors.Is(rowErr, ErrBadWeight):
			reason = "bad-weight"
		case errors.Is(rowErr, ErrOverweight):
			reason = "overweight"
		case errors.Is(rowErr, ErrUnknownRegion):
			reason = "unknown-region"
		}
		reasons[reason]++
		rejectLog = append(rejectLog, map[string]string{"id": rowID, "reason": reason, "message": rowErr.Error()})
		fmt.Println("REJECT:", rowErr)
		continue
	}
	passed++
}
_, _, _, sample := screen("PK-9999 east 99999")
sameDirect := sample == ErrOverweight
sameIs := errors.Is(sample, ErrOverweight)
scene("rejects", rejectLog)
scene("reasons", reasons)
scene("rejected", rejected)
scene("passed", passed)
scene("sameDirect", sameDirect)
scene("sameIs", sameIs)`,
      explanation:
        "screen is a chain of guard clauses: each problem returns immediately with an error that wraps a sentinel (%w) and starts with the parcel id, so the happy path is the last line. In main, errors.Is finds the sentinel inside the wrapped error to choose the reason code, which a plain == cannot do: sameDirect is false and sameIs is true. The bad-weight message uses %w for the sentinel and %v for the strconv error so the original reason stays visible in the text. Four rows fail, nine pass, and rejected (the counter from lesson 2) finally goes up.",
      hints: [
        { id: "h1", title: "Sentinels and guards", content: "Declare ErrMalformed, ErrBadWeight, ErrOverweight and ErrUnknownRegion with errors.New in a var ( ... ) block. In screen, split with strings.Fields, then use one if per problem and return straight away: if len(fields) != 3 { return id, \"\", 0, fmt.Errorf(\"%s: %w\", id, ErrMalformed) }." },
        { id: "h2", title: "The other three guards", content: "n, convErr := strconv.Atoi(fields[2]); if convErr != nil { ... %w with ErrBadWeight and (%v) with convErr ... }. Then if n > maxGrams { ... fmt.Errorf(\"%s: %d g, %w\", id, n, ErrOverweight) }. For the region use the lookup table: if _, known := regionOf[region]; !known { ... fmt.Errorf(\"%s: %q: %w\", id, region, ErrUnknownRegion) }." },
        { id: "h3", title: "Choosing the reason in main", content: "Use a tagless switch with errors.Is(rowErr, ErrMalformed) and so on, setting reason to malformed, bad-weight, overweight or unknown-region. Then reasons[reason]++ and rejectLog = append(rejectLog, map[string]string{\"id\": rowID, \"reason\": reason, \"message\": rowErr.Error()}). Do not forget continue after printing so passed++ only counts good rows." },
      ],
      tests: [
        {
          id: "t1",
          description: "four rows are rejected and nine pass",
          assertionCode: js`
assertEqual(scene.rejected, 4, "rejected (increase the counter from lesson 2 once per failing row: PK-2006, PK-2007, PK-2008 and PK-2013)");
assertEqual(scene.passed, 9, "passed (13 rows minus the 4 rejected)");`,
        },
        {
          id: "t2",
          description: "each reject carries the right id and reason code",
          assertionCode: js`
assert(Array.isArray(scene.rejects), "Send rejectLog with scene(\"rejects\", rejectLog).");
const got = scene.rejects.map((r) => (r && r.id) + ":" + (r && r.reason));
assertEqual(got, ["PK-2006:unknown-region", "PK-2007:overweight", "PK-2008:bad-weight", "PK-2013:malformed"], "rejects (id:reason in manifest order)");`,
        },
        {
          id: "t3",
          description: "reasons counts one of each",
          assertionCode: js`
assertEqual(scene.reasons, { "unknown-region": 1, overweight: 1, "bad-weight": 1, malformed: 1 }, "reasons (a map from reason code to how many rows)");`,
        },
        {
          id: "t4",
          description: "every REJECT line starts with the parcel id and says why",
          assertionCode: js`
const want = [
  "REJECT: PK-2006: \"moon\": no chute for that region",
  "REJECT: PK-2007: 31000 g, parcel is over the weight limit",
  "REJECT: PK-2008: weight is not a whole number (strconv.Atoi: parsing \"abc\": invalid syntax)",
  "REJECT: PK-2013: row is not 'id region grams'",
];
for (const w of want) assert(lines.includes(w), "Missing the line: " + w + " . Print fmt.Println(\"REJECT:\", rowErr) and build the messages exactly as described in the tasks.");`,
        },
        {
          id: "t5",
          description: "== fails on a wrapped error but errors.Is succeeds",
          assertionCode: js`
assertEqual(scene.sameDirect, false, "sameDirect (the wrapped error is a new value, so == ErrOverweight is false)");
assertEqual(scene.sameIs, true, "sameIs (errors.Is looks inside the wrapper, so it is true; make sure you wrapped with %w, not %v)");`,
        },
      ],
      unlocks: ["go-rejects"],
      checks: [
        {
          prompt: "What does this print?\n\n~~~go\na := errors.New(\"full\")\nb := errors.New(\"full\")\nfmt.Println(a == b)\n~~~",
          question: { type: "choice", options: ["true, the messages match", "false, each errors.New is a distinct value", "It does not compile", "It panics"], answer: 1 },
          explanation: "`errors.New` returns a pointer to a fresh value each time, and `==` compares identity, not text. That is why sentinel errors are created once and shared: `ErrFull` is equal to itself and to nothing else.",
        },
        {
          prompt: "`err := fmt.Errorf(\"load: %v\", ErrFull)`. What is `errors.Is(err, ErrFull)`?",
          question: { type: "choice", options: ["true", "false, %v only copies the text and drops the original error", "It does not compile", "It depends on the message"], answer: 1 },
          explanation: "Only `%w` keeps the wrapped error inside the new one. `%v` flattens it to a string, so `errors.Is` finds nothing. Use `%w` whenever callers might need to recognise the cause.",
        },
        {
          prompt: "Why is `n, _ := strconv.Atoi(text)` risky for input typed by a person?",
          question: {
            type: "choice",
            options: [
              "It does not compile",
              "A parse failure silently becomes the number 0 and the program carries on with wrong data",
              "It is slower",
              "The underscore causes a panic when the text is not a number",
            ],
            answer: 1,
          },
          explanation: "When parsing fails `Atoi` returns `0` and an error. Throwing the error away means \"24kg\" is treated as a real weight of zero. Check the error, or discard it only when you can explain why it cannot matter.",
        },
      ],
    },

    // ───────────────────────── 11 ─────────────────────────
    {
      id: "go-basics-11-structs",
      title: "Structs and methods",
      minutes: 35,
      xp: 140,
      concepts: ["struct", "composite literals", "methods", "value receiver", "pointer receiver", "pointers"],
      learn: md`### When loose variables stop scaling

Right now a parcel is three loose ideas in different places: an id in \`ids\`, a weight in \`weights\`, a region somewhere else. Keep them in step by hand and sooner or later one slice gets out of order with the others. A **struct** groups the pieces that belong together into one value.

~~~go
type Parcel struct {
	ID     string
	Region string
	Grams  int
}
~~~

### Creating and using structs

~~~go
p := Parcel{ID: "PK-2001", Region: "north", Grams: 2400}   // named fields (preferred)
q := Parcel{"PK-2002", "south", 800}                          // positional: breaks when fields change
var empty Parcel                                              // zero value: "", "", 0

p.Grams += 100          // read and assign with a dot
fmt.Println(p.Kg())     // methods use the same dot
~~~

Every field starts at its type's zero value, so a half-filled struct is always usable. Writing field names in the literal is clearer and survives the struct gaining new fields.

Field and type names that start with a **capital letter** are *exported*: visible to other packages and, importantly for this course, to packages such as \`fmt\` and \`encoding/json\` that look inside your struct. A field called \`grams\` would be invisible to the sorting board.

### Methods: functions that belong to a type

A method is a function with a **receiver** written before its name:

~~~go
func (p Parcel) Kg() float64 {
	return gramsToKg(p.Grams)
}

fmt.Println(p.Kg())   // 2.4
~~~

Go has no classes. You declare a type, then declare methods for it anywhere in the same package. This keeps data and the behaviour that goes with it together without any inheritance.

### Pointers in one minute

A variable lives at an address in memory. \`&x\` gives that address, a **pointer**, and \`*p\` follows a pointer back to the value. The type "pointer to Van" is written \`*Van\`. A pointer that points at nothing is \`nil\`.

~~~go
v := Van{Name: "Van 1"}
pv := &v          // pv is a *Van
pv.Loaded = 500   // Go follows the pointer for you; (*pv).Loaded is the long form
fmt.Println(v.Loaded) // 500: same Van
~~~

### Value or pointer receiver?

This is the big decision when you write a method, and it comes from the copy rule you met in lesson 9:

~~~go
// Value receiver: the method gets a COPY of the van.
func (v Van) LoadByValue(p Parcel) bool {
	if p.Grams > v.Free() { return false }
	v.Loaded += p.Grams          // changes the copy only
	return true
}

// Pointer receiver: the method gets the address of the real van.
func (v *Van) Load(p Parcel) bool {
	if p.Grams > v.Free() { return false }
	v.Loaded += p.Grams          // changes the real van
	v.Parcels = append(v.Parcels, p.ID)
	return true
}
~~~

\`LoadByValue\` happily returns \`true\`, but the van it was called on never gains any weight: the change vanished with the copy. This is one of the most common beginner bugs and the compiler cannot warn you, because it is perfectly legal code.

Rules of thumb: use a **pointer receiver** when the method changes the struct (or the struct is large); use a **value receiver** for small read-only types. Pick one style per type and stick to it. When you call \`vans[i].Load(p)\` on an addressable value Go takes the address for you.

### The range-copy trap

~~~go
for _, v := range vans {
	v.Load(p)        // v is a COPY of each van: the real vans never change
}

for i := range vans {
	vans[i].Load(p)  // index into the slice: this changes the real van
}
~~~

\`for _, v := range\` hands you a copy of each element. To modify the elements in place, loop over the index.

### Printing structs

~~~go
fmt.Printf("%v\n", vans[0])    // {Van 1 north 20000 10350 [PK-2001 PK-2005 PK-2010]}
fmt.Printf("%+v\n", vans[0])   // {Name:Van 1 Region:north Limit:20000 Loaded:10350 Parcels:[PK-2001 PK-2005 PK-2010]}
fmt.Printf("%#v\n", vans[0])   // main.Van{Name:"Van 1", ... Parcels:[]string{...}}
~~~

\`%+v\` adds the field names and is the one you will reach for when debugging.

### Real compiler messages

~~~text
./main.go:38:23: unknown field Weight in struct literal of type Parcel
./main.go:39:16: p.Kg undefined (type Parcel has no field or method Kg)
./main.go:31:12: cannot call pointer method Load on Van
~~~

The last one appears if you try to call a pointer method on something that cannot have its address taken, such as a map element (\`vans["a"].Load(p)\` where \`vans\` is a \`map[string]Van\`).

### Common mistakes

- A value receiver on a method that is supposed to change the struct.
- Modifying the loop variable in \`for _, v := range\` and expecting the slice to change.
- Lower-case field names, then wondering why JSON or the board shows nothing.
- Positional struct literals, which silently break when you add a field in the middle.
- Calling a method through a \`nil\` pointer. Methods with a pointer receiver can be called on a \`nil\` pointer but crash as soon as they touch a field, with \`invalid memory address or nil pointer dereference\` (lesson 14 catches one).`,
      mission: md`The courier vans are waiting at the loading dock. Each region has its own van with a weight limit of 20000 g, and the dispatcher wants them loaded automatically. A parcel that does not fit goes to the overflow tray for the next van.

You will model parcels and vans as structs, give them methods, load every accepted parcel onto the van for its region, and prove the value-versus-pointer difference with a trial van. When this lesson passes the **Courier vans** appear on the sorting floor with live load bars.`,
      tasks: [
        "Declare type Parcel struct { ID, Region string; Grams int } (written as three fields) with methods Kg() float64 (use gramsToKg) and Class() string (use classify)",
        "Declare type Van struct { Name, Region string; Limit, Loaded int; Parcels []string } with Free() int (value receiver), Load(p Parcel) bool (POINTER receiver, refuses a parcel that does not fit, otherwise adds its weight and id and returns true) and LoadByValue(p Parcel) bool with the same body but a VALUE receiver",
        "In main build parcels ([]Parcel) from the rows that screen accepts, create four vans (Van 1 north, Van 2 south, Van 3 east, Van 4 west, each Limit 20000) and load every parcel onto the van of its region by indexing vans[i]. Parcels that do not fit go into overflow ([]string of ids)",
        "Make trial := Van{Name: \"Trial\", Limit: 5000}. Call trial.LoadByValue(parcels[0]) and keep trial.Loaded as trialLoaded, then call trial.Load(parcels[0]) and keep trial.Loaded as trialLoadedPtr",
        "Print vans[0] with %+v and send parcels, vans, overflow, trialLoaded and trialLoadedPtr with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 11: declare type Parcel and type Van with their methods here.
// Field names must start with a capital letter so the board can read them.
//   type Parcel struct { ID string; Region string; Grams int }
//   func (p Parcel) Kg() float64
//   func (p Parcel) Class() string
//   type Van struct { Name, Region string; Limit, Loaded int; Parcels []string }
//   func (v Van) Free() int
//   func (v *Van) Load(p Parcel) bool
//   func (v Van) LoadByValue(p Parcel) bool

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 11: load the vans.
// 1. var parcels []Parcel: for each row use screen(row); skip rows with an error;
//    append Parcel{ID: ..., Region: ..., Grams: ...}
// 2. vans := []Van{ {Name: "Van 1", Region: "north", Limit: 20000}, ... south, east, west }
// 3. var overflow []string. For each parcel find the van with the same Region (loop over the INDEX
//    so you change the real van), call Load, and put the id in overflow when it returns false.
// 4. trial := Van{Name: "Trial", Limit: 5000}
//    trial.LoadByValue(parcels[0]); trialLoaded := trial.Loaded
//    trial.Load(parcels[0]);        trialLoadedPtr := trial.Loaded
// 5. fmt.Printf("%+v\n", vans[0])
// 6. scene: parcels, vans, overflow, trialLoaded, trialLoadedPtr`,
      solutionAdd: go`// Parcel is one accepted parcel.
type Parcel struct {
	ID     string
	Region string
	Grams  int
}

// Kg is the weight in kilograms.
func (p Parcel) Kg() float64 { return gramsToKg(p.Grams) }

// Class is the weight class from lesson 9.
func (p Parcel) Class() string { return classify(p.Grams) }

// Van carries parcels for one region.
type Van struct {
	Name    string
	Region  string
	Limit   int // grams
	Loaded  int // grams
	Parcels []string
}

// Free is how many grams still fit. A value receiver is fine: it only reads.
func (v Van) Free() int { return v.Limit - v.Loaded }

// Load puts p on the van if it fits. The pointer receiver lets it change the real van.
func (v *Van) Load(p Parcel) bool {
	if p.Grams > v.Free() {
		return false
	}
	v.Loaded += p.Grams
	v.Parcels = append(v.Parcels, p.ID)
	return true
}

// LoadByValue is the same code with a value receiver: it only changes a copy of the van.
func (v Van) LoadByValue(p Parcel) bool {
	if p.Grams > v.Free() {
		return false
	}
	v.Loaded += p.Grams
	v.Parcels = append(v.Parcels, p.ID)
	return true
}

${MAIN_DIVIDER}

// Lesson 11: turn accepted rows into Parcel values and load the vans.
var parcels []Parcel
for _, row := range rows {
	id, rgn, g, err := screen(row)
	if err != nil {
		continue
	}
	parcels = append(parcels, Parcel{ID: id, Region: rgn, Grams: g})
}
vans := []Van{
	{Name: "Van 1", Region: "north", Limit: 20000},
	{Name: "Van 2", Region: "south", Limit: 20000},
	{Name: "Van 3", Region: "east", Limit: 20000},
	{Name: "Van 4", Region: "west", Limit: 20000},
}
var overflow []string
for _, p := range parcels {
	loaded := false
	for i := range vans {
		if vans[i].Region == p.Region {
			loaded = vans[i].Load(p)
			break
		}
	}
	if !loaded {
		overflow = append(overflow, p.ID)
	}
}
trial := Van{Name: "Trial", Limit: 5000}
trial.LoadByValue(parcels[0])
trialLoaded := trial.Loaded
trial.Load(parcels[0])
trialLoadedPtr := trial.Loaded
fmt.Printf("%+v\n", vans[0])
scene("parcels", parcels)
scene("vans", vans)
scene("overflow", overflow)
scene("trialLoaded", trialLoaded)
scene("trialLoadedPtr", trialLoadedPtr)`,
      explanation:
        "Parcel and Van group related fields; the methods sit beside them. Load has a pointer receiver, so it updates the real van: the west van takes PK-2004 (19500 g) and then refuses PK-2009 (1250 g) because only 500 g remain, so that id goes to overflow. LoadByValue has the same body but works on a copy, so trial.Loaded stays 0 after it, and becomes 2400 only after Load. The inner loop uses the index (vans[i]) because ranging with a value variable would change copies.",
      hints: [
        { id: "h1", title: "The types", content: "type Parcel struct { ID string; Region string; Grams int } (one field per line is the usual style). Van has Name, Region string; Limit, Loaded int; Parcels []string. Start the field names with capital letters. Kg is func (p Parcel) Kg() float64 { return gramsToKg(p.Grams) }." },
        { id: "h2", title: "Receivers", content: "Free reads only, so func (v Van) Free() int { return v.Limit - v.Loaded } is fine. Load must change the van: func (v *Van) Load(p Parcel) bool { if p.Grams > v.Free() { return false }; v.Loaded += p.Grams; v.Parcels = append(v.Parcels, p.ID); return true }. LoadByValue is the same text with (v Van)." },
        { id: "h3", title: "Loading in main", content: "Use for i := range vans { if vans[i].Region == p.Region { loaded = vans[i].Load(p); break } } so you modify the real van, not a copy. If loaded is still false afterwards, append p.ID to overflow. For the trial van call trial.LoadByValue(parcels[0]) first and read trial.Loaded, then call trial.Load(parcels[0]) and read it again." },
      ],
      tests: [
        {
          id: "t1",
          description: "the nine accepted parcels become Parcel structs",
          assertionCode: js`
assert(Array.isArray(scene.parcels), "Send parcels with scene(\"parcels\", parcels).");
const get = (o, k) => (o ? (o[k] !== undefined ? o[k] : o[k.toLowerCase()]) : undefined);
assertEqual(scene.parcels.length, 9, "parcels (rows rejected by screen must be skipped; 9 remain)");
assertEqual(scene.parcels.map((p) => get(p, "ID")), ["PK-2001", "PK-2002", "PK-2003", "PK-2004", "PK-2005", "PK-2009", "PK-2010", "PK-2011", "PK-2012"], "parcel ids (field ID must start with a capital letter so the board can read it)");
assertEqual(get(scene.parcels[3], "Grams"), 19500, "Grams of PK-2004");`,
        },
        {
          id: "t2",
          description: "each van holds the right weight and parcels",
          assertionCode: js`
assert(Array.isArray(scene.vans), "Send vans with scene(\"vans\", vans).");
const get = (o, k) => (o ? (o[k] !== undefined ? o[k] : o[k.toLowerCase()]) : undefined);
assertEqual(scene.vans.length, 4, "vans (four vans)");
assertEqual(scene.vans.map((v) => get(v, "Loaded")), [10350, 1360, 6300, 19500], "Loaded of Van 1..4 (north, south, east, west). Each Load must add the parcel's grams to the real van.");
assertEqual(get(scene.vans[0], "Parcels"), ["PK-2001", "PK-2005", "PK-2010"], "Parcels on Van 1");
assertEqual(get(scene.vans[3], "Parcels"), ["PK-2004"], "Parcels on Van 4 (PK-2009 does not fit after PK-2004)");`,
        },
        {
          id: "t3",
          description: "the parcel that does not fit goes to overflow",
          assertionCode: js`
assertEqual(scene.overflow, ["PK-2009"], "overflow (Load returns false when the parcel is heavier than the free space; the west van has 500 g left)");`,
        },
        {
          id: "t4",
          description: "a value receiver changes a copy, a pointer receiver the real van",
          assertionCode: js`
assertEqual(scene.trialLoaded, 0, "trialLoaded (LoadByValue works on a copy, so trial.Loaded must still be 0 afterwards)");
assertEqual(scene.trialLoadedPtr, 2400, "trialLoadedPtr (Load has a pointer receiver, so trial.Loaded becomes 2400)");`,
        },
        {
          id: "t5",
          description: "vans[0] is printed with field names",
          assertionCode: js`
const want = "{Name:Van 1 Region:north Limit:20000 Loaded:10350 Parcels:[PK-2001 PK-2005 PK-2010]}";
assert(lines.includes(want), "No line is exactly " + want + " . Print it with fmt.Printf(\"%+v\\n\", vans[0]). The fields must be in the order Name, Region, Limit, Loaded, Parcels.");`,
        },
      ],
      unlocks: ["go-vans"],
      checks: [
        {
          prompt: "What does this print?\n\n~~~go\nvans := []Van{{Name: \"a\"}, {Name: \"b\"}}\nfor _, v := range vans {\n\tv.Loaded = 100\n}\nfmt.Println(vans[0].Loaded)\n~~~",
          question: { type: "choice", options: ["100", "0", "It does not compile", "It panics"], answer: 1 },
          explanation: "`v` is a copy of each element, so the assignment changes a throwaway value. To modify the slice's elements use the index: `for i := range vans { vans[i].Loaded = 100 }`.",
        },
        {
          prompt: "You are writing `AddNote(text string)` for `Van`, which appends to a field of the van. Which receiver do you need?",
          question: {
            type: "choice",
            options: ["`(v Van)`, because structs are always shared", "`(v *Van)`, because the method must change the real van", "Either one, they behave the same", "Neither, methods cannot change fields"],
            answer: 1,
          },
          explanation: "A value receiver gets a copy, so the appended note would be lost when the method returns. A pointer receiver gets the address of the real struct. Use pointer receivers for methods that modify, and keep one style per type.",
        },
        {
          prompt: "After `var v Van`, what are `v.Loaded` and `v.Parcels == nil`?",
          question: { type: "choice", options: ["0 and true", "0 and false", "undefined and true", "It does not compile until every field is set"], answer: 0 },
          explanation: "Every field of a zero-value struct holds its own zero value: `0` for ints and `nil` for slices. A nil slice is perfectly usable (you can `append` to it), so structs rarely need a constructor just to be safe.",
        },
      ],
    },

    // ───────────────────────── 12 ─────────────────────────
    {
      id: "go-basics-12-interfaces",
      title: "Interfaces",
      minutes: 30,
      xp: 130,
      concepts: ["interface", "implicit satisfaction", "fmt.Stringer", "polymorphism", "compile-time assertion"],
      learn: md`### Describe what you need, not what you have

The hub is about to get two different ways to decide where a parcel goes: by destination region, and by weight lane. Both take a \`Parcel\` and answer with a string. The code that *uses* a router should not care which kind it is holding, only that it can call \`Route\`.

An **interface** is a named set of method signatures:

~~~go
type Router interface {
	Route(p Parcel) string
}
~~~

Any value whose type has a \`Route(Parcel) string\` method *is* a \`Router\`.

### Implicit satisfaction

In Java or C# a class must say \`implements Router\`. In Go there is **no such keyword**. A type satisfies an interface just by having the methods. Nothing is declared, so the type does not even have to know the interface exists:

~~~go
type RegionRouter struct{}

func (RegionRouter) Route(p Parcel) string {
	r, ok := regionOf[p.Region]
	if !ok {
		return "reject"
	}
	return chuteLabels[r]
}

type WeightRouter struct{ Light, Heavy int }

func (w WeightRouter) Route(p Parcel) string {
	switch {
	case p.Grams < w.Light:
		return "express"
	case p.Grams < w.Heavy:
		return "standard"
	}
	return "freight"
}
~~~

Now one variable can hold either:

~~~go
var byRegion Router = RegionRouter{}
var byWeight Router = WeightRouter{Light: 1000, Heavy: 10000}
byRegion.Route(p)   // "A"
byWeight.Route(p)   // "standard"
~~~

The call is resolved when the program runs, based on the real type inside. That is **polymorphism** without inheritance. Because satisfaction is implicit, the code that *uses* an interface is usually the code that defines it, which keeps interfaces small and tied to a real need. A well-known Go saying is: *accept interfaces, return structs*.

### Keep interfaces small

\`io.Reader\` has one method. \`fmt.Stringer\` has one method. Small interfaces are easy to satisfy and easy to fake in tests. If an interface needs seven methods, ask whether it is describing a single idea.

### fmt.Stringer: teach Println to print your type

The standard library defines:

~~~go
type Stringer interface {
	String() string
}
~~~

\`fmt\` checks for it. If a value has a \`String()\` method, \`Println\`, \`%v\` and \`%s\` use it. Remember \`Region\` from lesson 2? Until now \`fmt.Println(West)\` printed \`3\`. Add a method and it speaks:

~~~go
func (r Region) String() string {
	switch r {
	case North:
		return "North"
	case West:
		return "West"
		// ...
	}
	return "Region(" + strconv.Itoa(int(r)) + ")"
}

fmt.Println(North, West)           // North West
fmt.Printf("%v %d %s\n", South, South, South) // South 1 South
~~~

\`%d\` still shows the number: the verb decides whether \`String\` is consulted. Your lesson 2 and lesson 6 output (the "West is 3" line) now says "West" too.

**A trap:** inside \`String()\`, do not format the receiver with \`%v\` or \`%s\`. \`fmt\` would call \`String()\` again, which calls \`fmt\`, which calls \`String()\`... until the program crashes. Convert to the underlying type first: \`int(r)\`.

Any function can ask for a Stringer, and \`Region\` and \`Parcel\` both qualify without a single declaration:

~~~go
func describe(s fmt.Stringer) string { return "<" + s.String() + ">" }
describe(East)   // <East>
~~~

### Making sure a type really satisfies an interface

If you forget a method, the compiler complains where you *use* the value, which can be far from the type. Pin the promise next to the type with a blank-identifier assertion:

~~~go
var _ Router = RegionRouter{}
var _ Router = WeightRouter{}
~~~

It creates no usable variable. It costs nothing at runtime and fails the build the moment the type stops fitting.

### Real compiler messages

~~~text
./main.go:37:17: cannot use WeightRouter{} (value of struct type WeightRouter) as Router value in variable declaration: WeightRouter does not implement Router (missing method Route)
./main.go:36:17: cannot use Van{} (value of struct type Van) as Loader value in variable declaration: Van does not implement Loader (method Load has pointer receiver)
./main.go:35:4: r.Describe undefined (type Router has no field or method Describe)
./main.go:32:23: cannot use Parcel{} (value of struct type Parcel) as fmt.Stringer value in argument to describe: Parcel does not implement fmt.Stringer (missing method String)
~~~

The second is the subtle one. A method with a **pointer receiver** belongs only to the pointer type. A \`Van\` value does not satisfy the interface, but a \`*Van\` does: write \`var l Loader = &Van{}\`.

### Looking inside an interface

An interface value remembers the concrete type it holds. \`%T\` prints it and a **type assertion** lets you ask:

~~~go
fmt.Printf("%T\n", byRegion)               // main.RegionRouter
if s, ok := byRegion.(fmt.Stringer); ok {   // does it also have String()?
	fmt.Println(s.String())
}
~~~

\`any\` (an alias for \`interface{}\`) is the interface with no methods, so every value fits. Reach for it rarely: you lose the compiler's help. The \`scene\` helper you were given takes an \`any\` because it must send every kind of value.

### Common mistakes

- Making huge interfaces "just in case".
- Looking for an \`implements\` keyword.
- Pointer receivers and value receivers: remember the method set rule above.
- Calling \`fmt.Sprintf("%v", r)\` inside \`r.String()\` and recursing forever.
- Returning an interface when a plain struct would do. Return concrete types, accept interfaces.
- Forgetting that a nil pointer stored in an interface is *not* a nil interface. The interface still has a type, so \`x != nil\` is true. Return a plain \`nil\` when you mean "nothing".`,
      mission: md`The hub manager wants two sorting strategies on the same floor: send each parcel to the chute of its **region**, and also tag it with a **lane** by weight (express, standard or freight) for the conveyor that carries it. Next quarter there will be a third strategy, and you do not want to rewrite the loop each time.

You will define a \`Router\` interface with two implementations, make \`Region\` and \`Parcel\` print nicely with \`String\`, and build a routing table. When this lesson passes the **Routing board** lights up with every parcel's chute and lane.`,
      tasks: [
        "Add func (r Region) String() string for North, South, East and West (anything else: Region(n) built with strconv.Itoa, NOT with %v) and func (p Parcel) String() string that returns PK-2001 (north, 2400 g) style text",
        "Add func describe(s fmt.Stringer) string returning the text wrapped in angle brackets, for example <East>",
        "Declare type Router interface { Route(p Parcel) string } and two implementations: RegionRouter (returns the chuteLabels letter for p.Region via regionOf, or \"reject\") and WeightRouter{Light, Heavy int} (under Light: express, under Heavy: standard, otherwise freight). Add var _ Router = RegionRouter{} and var _ Router = WeightRouter{}",
        "In main hold the two routers in variables of type Router (WeightRouter with Light 1000 and Heavy 10000), build routes (a []map[string]string with id, chute and lane for every parcel) and regionNames (loop for r := range regionCount and call r.String())",
        "Print fmt.Println(North, West, describe(East), parcels[0]) and fmt.Printf(\"%v %d %s\\n\", South, South, South), then send routes and regionNames with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// Lesson 12: declare these here.
//   func (r Region) String() string          North, South, East, West
//   func (p Parcel) String() string          PK-2001 (north, 2400 g)
//   func describe(s fmt.Stringer) string     <East>
//   type Router interface { Route(p Parcel) string }
//   type RegionRouter struct{}               chuteLabels letter or "reject"
//   type WeightRouter struct{ Light, Heavy int }   express / standard / freight
//   var _ Router = RegionRouter{}            compile-time checks
//   var _ Router = WeightRouter{}

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 12: route every parcel two ways.
// 1. var byRegion Router = RegionRouter{}
//    var byWeightRouter Router = WeightRouter{Light: 1000, Heavy: 10000}
// 2. var routes []map[string]string with {"id": p.ID, "chute": byRegion.Route(p), "lane": byWeightRouter.Route(p)}
// 3. var regionNames []string: for r := range regionCount { append r.String() }
// 4. fmt.Println(North, West, describe(East), parcels[0])
//    fmt.Printf("%v %d %s\n", South, South, South)
// 5. scene: routes, regionNames`,
      solutionAdd: go`// String makes Region a fmt.Stringer: Println(North) now prints "North".
func (r Region) String() string {
	switch r {
	case North:
		return "North"
	case South:
		return "South"
	case East:
		return "East"
	case West:
		return "West"
	}
	// Convert to int first: formatting r itself with %v would call String again, forever.
	return "Region(" + strconv.Itoa(int(r)) + ")"
}

// String gives a parcel a one-line description.
func (p Parcel) String() string {
	return fmt.Sprintf("%s (%s, %d g)", p.ID, p.Region, p.Grams)
}

// describe works with anything that has a String method.
func describe(s fmt.Stringer) string { return "<" + s.String() + ">" }

// Router decides where a parcel goes. Any type with this method is a Router.
type Router interface {
	Route(p Parcel) string
}

// RegionRouter sends a parcel to the chute of its destination region.
type RegionRouter struct{}

func (RegionRouter) Route(p Parcel) string {
	r, ok := regionOf[p.Region]
	if !ok {
		return "reject"
	}
	return chuteLabels[r]
}

// WeightRouter picks a conveyor lane by weight.
type WeightRouter struct{ Light, Heavy int }

func (w WeightRouter) Route(p Parcel) string {
	switch {
	case p.Grams < w.Light:
		return "express"
	case p.Grams < w.Heavy:
		return "standard"
	}
	return "freight"
}

// Compile-time proof that both types satisfy Router.
var _ Router = RegionRouter{}
var _ Router = WeightRouter{}

${MAIN_DIVIDER}

// Lesson 12: route every parcel two ways through the Router interface.
var byRegion Router = RegionRouter{}
var byWeightRouter Router = WeightRouter{Light: 1000, Heavy: 10000}
var routes []map[string]string
for _, p := range parcels {
	routes = append(routes, map[string]string{"id": p.ID, "chute": byRegion.Route(p), "lane": byWeightRouter.Route(p)})
}
var regionNames []string
for r := range regionCount {
	regionNames = append(regionNames, r.String())
}
fmt.Println(North, West, describe(East), parcels[0])
fmt.Printf("%v %d %s\n", South, South, South)
scene("routes", routes)
scene("regionNames", regionNames)`,
      explanation:
        "Neither router declares that it is a Router: having Route(Parcel) string is enough, and the var _ lines make the compiler check that promise next to the types. The loop calls Route on the interface values, so adding a third strategy needs no change there. Region.String and Parcel.String make fmt print names (North, PK-2001 (north, 2400 g)), while %d still prints the number 1 for South. String converts with int(r) before formatting, because formatting r itself would call String again.",
      hints: [
        { id: "h1", title: "Stringers", content: "func (r Region) String() string { switch r { case North: return \"North\" ... } return \"Region(\" + strconv.Itoa(int(r)) + \")\" }. For Parcel use fmt.Sprintf(\"%s (%s, %d g)\", p.ID, p.Region, p.Grams). describe(s fmt.Stringer) returns \"<\" + s.String() + \">\"." },
        { id: "h2", title: "Router and its two types", content: "type Router interface { Route(p Parcel) string }. RegionRouter is an empty struct: func (RegionRouter) Route(p Parcel) string { r, ok := regionOf[p.Region]; if !ok { return \"reject\" }; return chuteLabels[r] }. WeightRouter has fields Light and Heavy and a tagless switch comparing p.Grams." },
        { id: "h3", title: "Using the interface", content: "Declare the routers with the interface type: var byRegion Router = RegionRouter{}. Build each route row with a map literal, e.g. map[string]string{\"id\": p.ID, \"chute\": byRegion.Route(p), \"lane\": byWeightRouter.Route(p)}. Range over the typed constant for the names: for r := range regionCount { names = append(names, r.String()) }." },
      ],
      tests: [
        {
          id: "t1",
          description: "Region prints its name through String",
          assertionCode: js`
assertEqual(scene.regionNames, ["North", "South", "East", "West"], "regionNames (call r.String() on each Region from the loop over regionCount; add a String method to Region)");
assert(lines.includes("North West <East> PK-2001 (north, 2400 g)"), 'No line is exactly "North West <East> PK-2001 (north, 2400 g)". Region and Parcel need String methods, and describe(East) should give <East>. Print with fmt.Println(North, West, describe(East), parcels[0]).');`,
        },
        {
          id: "t2",
          description: "%d still prints the number while %v and %s print the name",
          assertionCode: js`
assert(lines.includes("South 1 South"), 'No line is exactly "South 1 South". Print fmt.Printf("%v %d %s\\n", South, South, South): %v and %s use String, %d keeps the number.');`,
        },
        {
          id: "t3",
          description: "RegionRouter sends every parcel to the chute of its region",
          assertionCode: js`
assert(Array.isArray(scene.routes), "Send routes with scene(\"routes\", routes).");
assertEqual(scene.routes.length, 9, "routes (one entry per accepted parcel)");
const chutes = scene.routes.map((r) => r.id + ":" + r.chute);
assertEqual(chutes, ["PK-2001:A", "PK-2002:B", "PK-2003:C", "PK-2004:D", "PK-2005:A", "PK-2009:D", "PK-2010:A", "PK-2011:B", "PK-2012:C"], "chutes (north A, south B, east C, west D, taken from chuteLabels)");`,
        },
        {
          id: "t4",
          description: "WeightRouter picks express, standard or freight",
          assertionCode: js`
assert(Array.isArray(scene.routes), "Send routes with scene(\"routes\", routes).");
const lanes = scene.routes.map((r) => r.id + ":" + r.lane);
assertEqual(lanes, ["PK-2001:standard", "PK-2002:express", "PK-2003:standard", "PK-2004:freight", "PK-2005:express", "PK-2009:standard", "PK-2010:standard", "PK-2011:express", "PK-2012:standard"], "lanes (under 1000 g express, under 10000 g standard, otherwise freight)");`,
        },
      ],
      unlocks: ["go-routers"],
      checks: [
        {
          prompt: "How does a Go type declare that it satisfies an interface?",
          question: {
            type: "choice",
            options: ["With the `implements` keyword", "By embedding the interface in the struct", "It does not declare anything: having the methods is enough", "By registering it with `init()`"],
            answer: 2,
          },
          explanation: "Satisfaction is implicit and checked by the compiler. Any type whose method set contains the interface's methods can be used where the interface is expected, even a type from a package that has never heard of your interface.",
        },
        {
          prompt: "`type Loader interface{ Load(p Parcel) bool }` and `func (v *Van) Load(p Parcel) bool`. What happens with `var l Loader = Van{}`?",
          question: {
            type: "choice",
            options: [
              "It compiles",
              "Compile error: Van does not implement Loader (method Load has pointer receiver)",
              "It compiles but panics at run time",
              "Compile error: Loader is not a type",
            ],
            answer: 1,
          },
          explanation: "A pointer-receiver method belongs to `*Van`, not to `Van`. Use `var l Loader = &Van{}` and the assignment compiles, with the interface holding the address of the real van.",
        },
        {
          prompt: "What goes wrong here?\n\n~~~go\nfunc (r Region) String() string {\n\treturn fmt.Sprintf(\"%v\", r)\n}\n~~~",
          question: {
            type: "choice",
            options: [
              "Nothing, it prints the number",
              "It calls itself endlessly and crashes the program",
              "It does not compile because String must not use fmt",
              "It prints the type name",
            ],
            answer: 1,
          },
          explanation: "`%v` on a value that has a `String` method calls that method, which calls `Sprintf`, which calls `String`... The stack grows until the program dies. Format the underlying number instead: `fmt.Sprintf(\"Region(%d)\", int(r))`.",
        },
      ],
    },
  ],
};
