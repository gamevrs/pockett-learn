import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { BT, go, js, md } from "./util.ts";

/**
 * Chapter 4: Closing the shift. Sorting and closures, defer/panic/recover, JSON, and the
 * end-of-shift capstone. Lessons 13-16 of the Gopher Post course.
 *
 * Each lesson's solutionAdd is the matching `// L13`..`// L16` slice of the verified full program:
 * package-level declarations above MAIN_DIVIDER, statements for main() below it.
 */

export const chapter4: Chapter = {
  id: "closing-the-shift",
  title: "Closing the shift",
  blurb: "Sort with closures, survive crashes with defer and recover, write the manifest as JSON, then close the shift with a full report.",
  lessons: [
    // ───────────────────────── 13 ─────────────────────────
    {
      id: "go-basics-13-sorting",
      title: "Sorting and closures",
      minutes: 30,
      xp: 120,
      concepts: ["sort.Slice", "less function", "multi-key sort", "function values", "closures", "func parameters"],
      learn: md`### Putting a slice in order

The hub's dispatch office wants the parcels in a different order for different crews: heaviest first for the people who lift, region by region for the people who load vans. Go's \`sort\` package sorts any slice with one call, as long as you say what "comes first" means:

~~~go
weights := []int{2400, 800, 19500, 650}
sort.Slice(weights, func(i, j int) bool {
	return weights[i] > weights[j]
})
fmt.Println(weights) // [19500 2400 800 650]
~~~

\`sort.Slice(s, less)\` takes the slice and a **less function**. Go calls \`less(i, j)\` many times with two *positions* in the slice, and your function answers one question: **should the element at \`i\` go before the element at \`j\`?** Sorting is just asking that question over and over and swapping elements until every answer is yes.

Notice what you do *not* write: a loop, a swap, an algorithm. You describe the order, Go does the work. That is also why the function takes positions and not values: the sorter needs to move elements around, and it moves whatever is at those positions.

### Rules for a good \`less\`

- Use a strict comparison: \`<\` or \`>\`, **not** \`<=\` or \`>=\`. Two equal things must not each claim to come first.
- Be consistent: if \`less(a, b)\` is true then \`less(b, a)\` must be false.
- Look at the slice you are sorting. The closure reads \`weights[i]\`, so it must use the same slice that is being reordered.

### Sorting by more than one key

When two parcels tie on the first key, break the tie with the second. Test the first key for *difference* and only then fall through:

~~~go
sort.Slice(list, func(i, j int) bool {
	if list[i].Region != list[j].Region {
		return list[i].Region < list[j].Region // region A to Z
	}
	return list[i].Grams > list[j].Grams // same region: heaviest first
})
~~~

\`sort.Slice\` is **not stable**: parcels that compare equal may come out in any order. If equal items must keep their original relative order, use \`sort.SliceStable\`, which has the same signature.

### It sorts in place, so copy first

\`sort.Slice\` rearranges the slice you give it. Every other variable looking at the same backing array (lesson 7!) sees the new order too. The manifest order matters to the rest of the hub, so sort a **copy**:

~~~go
byWeight := append([]Parcel(nil), parcels...) // a new slice with its own array
sort.Slice(byWeight, func(i, j int) bool { return byWeight[i].Grams > byWeight[j].Grams })
// parcels is untouched
~~~

\`append([]Parcel(nil), parcels...)\` starts from an empty (nil) slice and appends every element, so Go allocates a fresh array. It is the short idiom for "clone this slice".

### Functions are values

In Go a function is a value like any other. You can store one in a variable, pass one to another function and return one from a function. A function written inline, with no name, is a **function literal**:

~~~go
double := func(n int) int { return n * 2 }
fmt.Println(double(21)) // 42
~~~

The \`less\` argument above is exactly that: a function value you hand to \`sort.Slice\`. You can write your own functions that take functions. A filter keeps whatever a test function approves:

~~~go
func filter(list []Parcel, keep func(Parcel) bool) []Parcel {
	var out []Parcel
	for _, p := range list {
		if keep(p) {
			out = append(out, p)
		}
	}
	return out
}
~~~

The type \`func(Parcel) bool\` reads as "a function that takes a Parcel and returns a bool".

### Closures: functions that remember

A function literal can use variables from the code around it. It does not copy them: it **captures** the variable itself. A function plus the variables it captured is called a **closure**.

~~~go
limit := 4000
isBig := func(p Parcel) bool { return p.Grams > limit }
fmt.Println(isBig(Parcel{Grams: 5000})) // true
limit = 7000
fmt.Println(isBig(Parcel{Grams: 5000})) // false: isBig sees the NEW limit
~~~

Because the variable is shared, not copied, changing \`limit\` later changes what \`isBig\` does. That is a feature when you want it and a surprise when you don't.

A closure can also keep **private state**. This function makes a ticket printer. Each printer gets its own counter, which only that printer can touch:

~~~go
func tagMaker(prefix string) func() string {
	n := 0 // lives on after tagMaker returns
	return func() string {
		n++
		return fmt.Sprintf("%s-%02d", prefix, n)
	}
}

next := tagMaker("SLOT")
fmt.Println(next(), next(), next()) // SLOT-01 SLOT-02 SLOT-03
other := tagMaker("BIN")
fmt.Println(other()) // BIN-01: its own n
~~~

\`%02d\` prints an integer padded with zeros to two digits. Normally a local variable disappears when its function returns; here the returned closure still needs \`n\`, so Go keeps it alive for as long as the closure exists.

### Loop variables and closures (Go 1.22 and later)

Older Go versions shared one loop variable across all iterations, so closures created in a loop all saw its final value, a famous trap. Since Go 1.22 every iteration gets its **own** copy of the variable:

~~~go
var funcs []func() int
for i := 0; i < 3; i++ {
	funcs = append(funcs, func() int { return i })
}
fmt.Println(funcs[0](), funcs[1](), funcs[2]()) // 0 1 2 today (3 3 3 in old Go)
~~~

You will still see old code with a \`i := i\` line to work around this. It is harmless now.

### Compiler messages you may meet

~~~text
cannot use func(i, j int) int {…} (value of type func(i int, j int) int) as func(i int, j int) bool value in argument to sort.Slice
~~~

Your \`less\` must return a \`bool\`, not an \`int\` like some other languages' comparators.

~~~text
ps[i].G < ps[j].G (untyped bool value) is not used
missing return
~~~

You wrote the comparison but forgot the word \`return\` in front of it. A function literal needs \`return\` just like a named function.

### Common mistakes

- Sorting \`parcels\` itself when other code still expects the manifest order. Sort a copy.
- Using \`<=\` in \`less\`. Equal elements then each say they come first and results can be wrong.
- Comparing the wrong slice inside \`less\` (the original instead of the copy you are sorting).
- Expecting a closure to hold a *snapshot* of a captured variable. It holds the variable.
- Forgetting to call the function returned by \`tagMaker\`: \`next\` is the function, \`next()\` is a tag.`,
      mission: md`Two crews, two printouts. The lifting crew wants the **heaviest parcels first** so nobody throws their back out at the end of the shift. The van crew wants parcels grouped **by region**, heaviest first inside each region. And the label printer must stamp each loading slot with a ticket: \`SLOT-01\`, \`SLOT-02\`, and so on.

You will sort copies of the parcel list with \`sort.Slice\`, build a ticket machine out of a closure and write a small \`filter\` that takes a function as an argument. When this lesson passes, the **Sorting racks** light up with both orders and the new tickets.`,
      tasks: [
        "Make two COPIES of parcels with append([]Parcel(nil), parcels...). Sort one heaviest first (byWeight) and the other by region name A to Z, heaviest first inside each region (byRegionThenWeight), both with sort.Slice",
        "Declare tagMaker(prefix string) func() string above the divider (a closure with a private counter, tags like SLOT-01). Make nextTag := tagMaker(\"SLOT\") and call it three times into a []string called tags",
        "Declare filter(list []Parcel, keep func(Parcel) bool) []Parcel above the divider. With limit := 4000, keep the parcels heavier than limit, using a function literal that captures limit",
        "Collect IDs into heavyFirst, regionFirst and bigIDs ([]string each, same order as their parcels). Print them with fmt.Println(heavyFirst, regionFirst, tags, bigIDs), then send byWeight (heavyFirst), byRegion (regionFirst), tags and bigIDs with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───────────
// tagMaker returns a function that hands out PREFIX-01, PREFIX-02, ... on every call.
// Keep the counter in a variable that the returned function captures.
func tagMaker(prefix string) func() string {
	// TODO: declare the counter here, then return a func() string that bumps it
	return func() string { return "" }
}

// filter keeps the parcels for which keep(p) is true, in their original order.
func filter(list []Parcel, keep func(Parcel) bool) []Parcel {
	// TODO
	return nil
}

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 13: sort the parcels and build a ticket machine.
// 1. byWeight and byRegionThenWeight: COPIES of parcels (append([]Parcel(nil), parcels...)),
//    then sort.Slice. Heaviest first; and region A to Z with heaviest first inside a region.
// 2. nextTag := tagMaker("SLOT"); tags := []string{nextTag(), nextTag(), nextTag()}
// 3. limit := 4000, then bigOnes := filter(parcels, func(p Parcel) bool { ... })
// 4. Turn each list into a []string of IDs: heavyFirst, regionFirst, bigIDs.
//    fmt.Println(heavyFirst, regionFirst, tags, bigIDs)
//    scene("byWeight", heavyFirst)  scene("byRegion", regionFirst)  scene("tags", tags)  scene("bigIDs", bigIDs)
`,
      solutionAdd: go`// tagMaker returns a function that hands out PREFIX-01, PREFIX-02, ... on every call.
func tagMaker(prefix string) func() string {
	n := 0
	return func() string {
		n++
		return fmt.Sprintf("%s-%02d", prefix, n)
	}
}

// filter keeps the parcels for which keep(p) is true, in their original order.
func filter(list []Parcel, keep func(Parcel) bool) []Parcel {
	var out []Parcel
	for _, p := range list {
		if keep(p) {
			out = append(out, p)
		}
	}
	return out
}

${MAIN_DIVIDER}

// Lesson 13: sort copies, then closures.
byWeight := append([]Parcel(nil), parcels...)
sort.Slice(byWeight, func(i, j int) bool {
	return byWeight[i].Grams > byWeight[j].Grams
})
byRegionThenWeight := append([]Parcel(nil), parcels...)
sort.Slice(byRegionThenWeight, func(i, j int) bool {
	if byRegionThenWeight[i].Region != byRegionThenWeight[j].Region {
		return byRegionThenWeight[i].Region < byRegionThenWeight[j].Region
	}
	return byRegionThenWeight[i].Grams > byRegionThenWeight[j].Grams
})
nextTag := tagMaker("SLOT")
tags := []string{nextTag(), nextTag(), nextTag()}
limit := 4000
bigOnes := filter(parcels, func(p Parcel) bool { return p.Grams > limit })
var bigIDs []string
for _, p := range bigOnes {
	bigIDs = append(bigIDs, p.ID)
}
var heavyFirst, regionFirst []string
for _, p := range byWeight {
	heavyFirst = append(heavyFirst, p.ID)
}
for _, p := range byRegionThenWeight {
	regionFirst = append(regionFirst, p.ID)
}
fmt.Println(heavyFirst, regionFirst, tags, bigIDs)
scene("byWeight", heavyFirst)
scene("byRegion", regionFirst)
scene("tags", tags)
scene("bigIDs", bigIDs)`,
      explanation:
        "sort.Slice calls your less(i, j) to ask whether the element at i belongs before the one at j. Sorting copies (append([]Parcel(nil), parcels...)) keeps the manifest order intact for later code. The region sort compares regions first and only falls through to the weight when the regions are equal. tagMaker returns a closure that captures its own counter n, so every tagMaker call gets an independent ticket machine. filter takes a function value, and the literal you pass in captures limit by reference.",
      hints: [
        { id: "h1", title: "Copy, then sort", content: "Sorting happens in place, so first make a copy: byWeight := append([]Parcel(nil), parcels...) and then call sort.Slice(byWeight, func(i, j int) bool { ... }). The function answers: should byWeight[i] come before byWeight[j]? For heaviest first that is byWeight[i].Grams > byWeight[j].Grams." },
        { id: "h2", title: "Two keys and a closure", content: "For the region sort, compare regions first: if the two regions differ, return byRegionThenWeight[i].Region < byRegionThenWeight[j].Region. Only when they are equal, return the weight comparison. For tagMaker, write n := 0 and return func() string { n++; return fmt.Sprintf(\"%s-%02d\", prefix, n) }." },
        { id: "h3", title: "filter and the IDs", content: "filter loops with for _, p := range list, and appends p to a result slice when keep(p) is true. Call it with filter(parcels, func(p Parcel) bool { return p.Grams > limit }). Then loop over each sorted slice with for _, p := range ... and append p.ID to a []string." },
      ],
      tests: [
        {
          id: "t1",
          description: "byWeight lists the parcel IDs heaviest first",
          assertionCode: js`
assert(Array.isArray(scene.byWeight), 'Send the sorted IDs with scene("byWeight", heavyFirst);');
assertEqual(scene.byWeight, ["PK-2004", "PK-2010", "PK-2003", "PK-2001", "PK-2012", "PK-2009", "PK-2002", "PK-2005", "PK-2011"], "byWeight (heaviest first: 19500 g, 7300 g, 4100 g ...)");`,
        },
        {
          id: "t2",
          description: "byRegion groups by region name, heaviest first inside each region",
          assertionCode: js`
assert(Array.isArray(scene.byRegion), 'Send the IDs with scene("byRegion", regionFirst);');
assertEqual(scene.byRegion, ["PK-2003", "PK-2012", "PK-2010", "PK-2001", "PK-2005", "PK-2002", "PK-2011", "PK-2004", "PK-2009"], "byRegion (east, north, south, west; heaviest first inside each). Compare the regions first, and only when they are equal compare the weights");`,
        },
        {
          id: "t3",
          description: "tagMaker hands out SLOT-01, SLOT-02, SLOT-03",
          assertionCode: js`
assert(Array.isArray(scene.tags), 'Send the tags with scene("tags", tags);');
assertEqual(scene.tags, ["SLOT-01", "SLOT-02", "SLOT-03"], "tags (call nextTag three times; the counter must live inside tagMaker so it keeps counting between calls)");`,
        },
        {
          id: "t4",
          description: "filter keeps the parcels over 4000 g in manifest order",
          assertionCode: js`
assert(Array.isArray(scene.bigIDs), 'Send the IDs with scene("bigIDs", bigIDs);');
assertEqual(scene.bigIDs, ["PK-2003", "PK-2004", "PK-2010"], "bigIDs (parcels heavier than limit = 4000 g, in the original manifest order, so filter must not reorder)");`,
        },
        {
          id: "t5",
          description: "the four lists are printed on one line",
          assertionCode: js`
const want = "[PK-2004 PK-2010 PK-2003 PK-2001 PK-2012 PK-2009 PK-2002 PK-2005 PK-2011] [PK-2003 PK-2012 PK-2010 PK-2001 PK-2005 PK-2002 PK-2011 PK-2004 PK-2009] [SLOT-01 SLOT-02 SLOT-03] [PK-2003 PK-2004 PK-2010]";
assert(lines.includes(want), "Print the four []string values with one fmt.Println(heavyFirst, regionFirst, tags, bigIDs). Expected the line: " + want);`,
        },
      ],
      unlocks: ["go-sorter"],
      checks: [
        {
          prompt: "You want the heaviest parcel first. Which `less` function does that?",
          question: {
            type: "choice",
            options: [
              "`func(i, j int) bool { return list[i].Grams < list[j].Grams }`",
              "`func(i, j int) bool { return list[i].Grams > list[j].Grams }`",
              "`func(i, j int) int { return list[j].Grams - list[i].Grams }`",
              "`func(i, j int) bool { list[i].Grams > list[j].Grams }`",
            ],
            answer: 1,
          },
          explanation: "`less(i, j)` must say whether element `i` goes BEFORE element `j`. For heaviest first, `i` goes first when it is heavier: `>`. The first option sorts lightest first, the third returns an `int` (Go wants a `bool`) and the fourth has no `return`, so it does not compile.",
        },
        {
          prompt: "What does this print?\n\n~~~go\na := tagMaker(\"A\")\nb := tagMaker(\"B\")\na()\na()\nfmt.Println(b())\n~~~",
          question: { type: "choice", options: ["B-03", "B-01", "B-02", "A-03"], answer: 1 },
          explanation: "Every call to `tagMaker` creates a NEW variable `n` that only the returned closure can see. `a` counted to 2 on its own `n`; `b` starts its own at 0, so its first call gives `B-01`.",
        },
        {
          prompt: "Why does the lesson sort a copy (`append([]Parcel(nil), parcels...)`) instead of `parcels` itself?",
          question: {
            type: "choice",
            options: [
              "sort.Slice refuses to sort a slice that other code uses",
              "sort.Slice reorders the slice IN PLACE, so every other view of that array would change order too",
              "a copy sorts faster",
              "sort.Slice can only sort slices created with append",
            ],
            answer: 1,
          },
          explanation: "Sorting moves elements inside the existing backing array. Anything else reading `parcels` (a later loop, a sub-slice) would suddenly see the new order. A copy has its own array, so the manifest order stays safe.",
        },
      ],
    },

    // ───────────────────────── 14 ─────────────────────────
    {
      id: "go-basics-14-defer",
      title: "Cleanup: defer, panic, recover",
      minutes: 30,
      xp: 120,
      concepts: ["defer", "LIFO order", "named results", "panic", "recover", "runtime panics", "when not to panic"],
      learn: md`### Cleanup that cannot be forgotten

Almost every real task has a "close it down" step: unlock the door, switch the lamp off, close the file. The danger is the early \`return\` or the crash that skips it. Go's answer is \`defer\`: put the cleanup right next to the thing it cleans up, and Go runs it when the surrounding function finishes, however it finishes.

~~~go
func closeHub() {
	fmt.Println("closing")
	defer fmt.Println("lamps off") // postponed
	fmt.Println("checking doors")
}
// closing
// checking doors
// lamps off
~~~

\`defer\` must be followed by a **function call**. Go notes the call, keeps going, and runs it just before \`closeHub\` returns.

### Closing the hub: newest switch-off first

When the hub opens in the morning you start the belts, then the sorter, then the scanners. At night you reverse it, and \`defer\` gives you that order for free: deferred calls pile up like parcels on a pallet, and the one added last comes off first.

~~~go
for i := 1; i <= 3; i++ {
	defer fmt.Println("belt", i, "stopped")
}
// belt 3 stopped
// belt 2 stopped
// belt 1 stopped
~~~

### What the late call remembers

The call itself waits for the end of the function, but the values you hand to it are read at the moment you write \`defer\`. Say a parcel is logged on arrival and then re-weighed:

~~~go
weight := 120
defer fmt.Println("logged weight", weight) // weight is read NOW: 120
weight = 150
// prints: logged weight 120
~~~

If you want whatever the variable holds at the very end, defer a function literal that reads it when it finally runs: \`defer func() { fmt.Println("final weight", weight) }()\`. The \`()\` at the end matters, it is the call.

### Cleanup that edits the receipt

A deferred closure can also reach the function's **named results** (lesson 9) and change what the caller gets back:

~~~go
func closeHub() (steps []string) {
	defer func() { steps = append(steps, "belts stopped") }()
	defer func() { steps = append(steps, "lamps off") }()
	defer func() { steps = append(steps, "doors locked") }()
	steps = append(steps, "closing")
	return steps
}
// ["closing", "doors locked", "lamps off", "belts stopped"]
~~~

The three defers run in reverse, after the \`return\` has set \`steps\` but before the function really leaves. With an *unnamed* result the returned value would already be copied and the deferred code could not change it.

### panic: when the program cannot continue

Most failures are expected: a bad weight, a missing file. Those are **errors**, returned as values (lesson 10). A **panic** is for the other kind: a bug, or a state that should be impossible. It stops the normal flow, runs the deferred calls on the way out of each function, and then crashes the program.

~~~go
func mustRegion(name string) Region {
	r, ok := regionOf[name]
	if !ok {
		panic("mustRegion: unknown region " + name)
	}
	return r
}
~~~

By convention a function that panics instead of returning an error starts with \`Must\`. Use it only where a bad value means the *programmer* made a mistake, such as looking up a name that is hard-coded in the source. For anything a user or a file can get wrong, return an error.

Go also panics by itself when you break a rule at run time:

~~~text
panic: runtime error: index out of range [99] with length 13
panic: runtime error: invalid memory address or nil pointer dereference
panic: assignment to entry in nil map
~~~

An unhandled panic prints the message, a **goroutine trace** and exits with status 2:

~~~text
panic: boom

goroutine 1 [running]:
main.risky()
	main.go:7 +0x59
main.main()
	main.go:16 +0x10b
exit status 2
~~~

Read it from the top: the message, then the call chain with file and line, most recent call first. Deferred calls still run before the crash (a \`defer fmt.Println("cleanup ran")\` would print), which is what makes cleanup reliable.

### recover: catching a panic

\`recover()\` stops a panic and hands you the value that was passed to \`panic\`. It only works **inside a deferred function**. Anywhere else it returns \`nil\` and does nothing.

~~~go
func attempt(task func()) (err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("recovered: %v", r)
		}
	}()
	task()
	return nil
}
~~~

Walk through it. \`attempt\` defers a closure, then runs the task. If the task finishes normally, \`recover()\` returns \`nil\` and nothing happens. If the task panics, Go unwinds the stack, reaches the deferred closure, \`recover()\` returns the panic value, and the closure stores an error in the named result \`err\`. The caller gets a normal error instead of a crash. That is the whole trick, and the reason the result has to be named.

### When NOT to use panic and recover

- **Do not use panic as an exception system.** Go deliberately has none. Returning \`error\` makes every failure visible in the function signature.
- **Do not recover to hide bugs.** A recover that swallows every panic turns a loud crash into silent wrong answers.
- **Do use recover at a boundary**: a web service handling one request, a hub running one parcel's code. One bad task should not take the whole system down, and the error should be logged.
- \`os.Exit(1)\` and \`log.Fatal\` stop the program immediately and **skip deferred calls**. Use them only in \`main\`.

### Common mistakes

- Calling \`recover()\` outside a deferred function. It returns \`nil\` and the panic goes on.
- Writing \`defer func() { ... }\` without the final \`()\`. Go refuses it, a defer needs a call.
- Using an unnamed result and expecting the deferred code to change it.
- Deferring inside a long loop. Defers run when the *function* ends, not the loop iteration, so they pile up.
- Panicking for ordinary bad input.

~~~text
expression in defer must be function call
~~~`,
      mission: md`Closing time at the hub. The shutdown has to happen in the right order whatever else goes wrong: belts stop last, doors lock first. And the hub has an even bigger worry: one bad instruction, such as a van that was never plugged in, a missing chute or a bad index, must not bring the whole sorting floor down.

You will write a \`closeHub\` that uses \`defer\`, a \`mustRegion\` that panics on impossible input and an \`attempt\` wrapper that turns a panic into an ordinary error. When this lesson passes, the **Safety interlock** lights up with the shutdown sequence and the panics it caught.`,
      tasks: [
        "Declare closeHub() (steps []string) above the divider: defer three appends in this code order: \"belts stopped\", \"lamps off\", \"doors locked\". Then append \"closing\" and return steps",
        "Declare mustRegion(name string) Region, which looks the name up in regionOf and panics with \"mustRegion: unknown region \" + name when it is not there",
        "Declare attempt(task func()) (err error): it runs task, and a deferred function uses recover() to set err to fmt.Errorf(\"recovered: %v\", r) when the task panics; otherwise it returns nil",
        "In main: steps := closeHub(), then run these four tasks through attempt and append every non-nil err.Error() to a []string called caught: mustRegion(\"moon\"); a nil *Van calling v.Load(parcels[0]); _ = rows[99]; and an empty func(){}",
        "Print fmt.Println(steps) and fmt.Println(caught), then send closeSteps (steps) and caught with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───────────
// closeHub: three deferred appends, then "closing"; returns the named result steps.
func closeHub() (steps []string) {
	// TODO
	return nil
}

// mustRegion looks a region up and PANICS with "mustRegion: unknown region <name>" if it is missing.
func mustRegion(name string) Region {
	// TODO
	return 0
}

// attempt runs task. If task panics, it returns an error "recovered: <panic value>" instead of crashing.
func attempt(task func()) (err error) {
	// TODO: defer a function that calls recover()
	task()
	return nil
}

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 14: shut down in order, and survive three kinds of panic.
// steps := closeHub()
// var caught []string
// Run these four tasks with attempt(task) and append err.Error() whenever err != nil:
//   func() { mustRegion("moon") }
//   func() { var v *Van; v.Load(parcels[0]) }     (a nil van)
//   func() { _ = rows[99] }                        (an index that does not exist)
//   func() {}                                      (nothing goes wrong)
// fmt.Println(steps)  fmt.Println(caught)
// scene("closeSteps", steps)  scene("caught", caught)
`,
      solutionAdd: go`// closeHub shuts the hub down. Deferred calls run last-in, first-out after the return.
func closeHub() (steps []string) {
	defer func() { steps = append(steps, "belts stopped") }()
	defer func() { steps = append(steps, "lamps off") }()
	defer func() { steps = append(steps, "doors locked") }()
	steps = append(steps, "closing")
	return steps
}

// mustRegion looks a region up and panics if it is missing (a programmer mistake).
func mustRegion(name string) Region {
	r, ok := regionOf[name]
	if !ok {
		panic("mustRegion: unknown region " + name)
	}
	return r
}

// attempt runs task and turns a panic into an ordinary error.
func attempt(task func()) (err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("recovered: %v", r)
		}
	}()
	task()
	return nil
}

${MAIN_DIVIDER}

// Lesson 14: defer, panic and recover.
steps := closeHub()
var caught []string
for _, task := range []func(){
	func() { mustRegion("moon") },
	func() { var v *Van; v.Load(parcels[0]) },
	func() { _ = rows[99] },
	func() {},
} {
	if err := attempt(task); err != nil {
		caught = append(caught, err.Error())
	}
}
fmt.Println(steps)
fmt.Println(caught)
scene("closeSteps", steps)
scene("caught", caught)`,
      explanation:
        "Deferred calls run when the function returns, last one first, so the three defers in code order (belts, lamps, doors) run as doors, lamps, belts after \"closing\" was appended. closeHub needs a named result so the deferred closures can append to what the caller receives. mustRegion panics because a name that is not in the table is a programmer mistake. attempt defers a closure that calls recover(); that works only inside a deferred function, and it stores the panic in the named result err. The fourth task never panics, so caught holds exactly three messages.",
      hints: [
        { id: "h1", title: "Defer order", content: "defer func() { steps = append(steps, \"belts stopped\") }() runs when closeHub returns. Write the three defers first in this order: belts, lamps, doors. Then steps = append(steps, \"closing\") and return steps. The result must be named (steps []string) so the deferred code can change it." },
        { id: "h2", title: "panic and recover", content: "mustRegion: r, ok := regionOf[name]; if !ok { panic(\"mustRegion: unknown region \" + name) }; return r. In attempt, the first statement is defer func() { if r := recover(); r != nil { err = fmt.Errorf(\"recovered: %v\", r) } }(). Then call task() and return nil." },
        { id: "h3", title: "Running the tasks", content: "Put the four functions in a []func(){ ... } and range over it: for _, task := range tasks { if err := attempt(task); err != nil { caught = append(caught, err.Error()) } }. The nil van is declared with var v *Van and then v.Load(parcels[0]) crashes inside Load. _ = rows[99] is an index far past the 13 rows." },
      ],
      tests: [
        {
          id: "t1",
          description: "closeHub runs its deferred steps in last-in, first-out order",
          assertionCode: js`
assert(Array.isArray(scene.closeSteps), 'Send the shutdown log with scene("closeSteps", steps);');
assertEqual(scene.closeSteps, ["closing", "doors locked", "lamps off", "belts stopped"], "closeSteps (defers declared belts, lamps, doors run as doors, lamps, belts, after \"closing\" was appended)");`,
        },
        {
          id: "t2",
          description: "three panics are caught, the fourth task is quiet",
          assertionCode: js`
assert(Array.isArray(scene.caught), 'Send the messages with scene("caught", caught);');
assertEqual(scene.caught.length, 3, "caught should hold 3 messages: the moon lookup, the nil van and the bad index. The empty task must not add one");`,
        },
        {
          id: "t3",
          description: "mustRegion panics with its own message",
          assertionCode: js`
assert(Array.isArray(scene.caught) && scene.caught[0] === "recovered: mustRegion: unknown region moon", 'The first caught message should be exactly: recovered: mustRegion: unknown region moon. Got: ' + (Array.isArray(scene.caught) ? scene.caught[0] : "(nothing)"));`,
        },
        {
          id: "t4",
          description: "the runtime panics (nil van, bad index) are recovered too",
          assertionCode: js`
assert(Array.isArray(scene.caught) && scene.caught.length >= 3, "Run all four tasks through attempt first.");
assert(String(scene.caught[1]).includes("nil pointer dereference"), "Second message should mention a nil pointer dereference (declare var v *Van and call v.Load(parcels[0]))");
assert(String(scene.caught[2]).includes("index out of range [99] with length 13"), "Third message should be 'index out of range [99] with length 13' (use _ = rows[99])");
assert(scene.caught.every((m) => String(m).startsWith("recovered: ")), "Every message should start with 'recovered: '. attempt should build it with fmt.Errorf(\"recovered: %v\", r)");`,
        },
        {
          id: "t5",
          description: "steps and caught are printed",
          assertionCode: js`
assert(lines.includes("[closing doors locked lamps off belts stopped]"), "Print the shutdown steps with fmt.Println(steps). Expected: [closing doors locked lamps off belts stopped]");
assert(lines.some((l) => l.startsWith("[recovered: mustRegion: unknown region moon recovered: runtime error")), "Print the caught messages with fmt.Println(caught). The line should start with [recovered: mustRegion: unknown region moon recovered: runtime error ...");`,
        },
      ],
      unlocks: ["go-safety"],
      checks: [
        {
          prompt: "What does this print?\n\n~~~go\nfor i := 1; i <= 3; i++ {\n\tdefer fmt.Print(i, \" \")\n}\n~~~",
          question: { type: "choice", options: ["1 2 3", "3 2 1", "3 3 3", "nothing, defer cannot be used in a loop"], answer: 1 },
          explanation: "Deferred calls form a stack: the last one deferred runs first. Each defer also evaluated its argument `i` at the moment it was deferred (1, then 2, then 3), so the output is `3 2 1`. Deferring in a loop is legal, but the calls only run when the whole function returns.",
        },
        {
          prompt: "A function reads a hub config file. The file might be missing. How should it report that?",
          question: {
            type: "choice",
            options: [
              "panic(\"config missing\") and let the caller recover",
              "Return an error and let the caller decide what to do",
              "os.Exit(1) straight away",
              "Ignore it and return an empty config",
            ],
            answer: 1,
          },
          explanation: "A missing file is an expected failure, so it is an `error` value in the function's signature. Panics are for bugs and impossible states, `os.Exit` skips deferred cleanup, and silently continuing hides the problem.",
        },
        {
          prompt: "Why does `attempt` declare its result as `(err error)` with a NAME instead of just `error`?",
          question: {
            type: "choice",
            options: [
              "Go requires every function that uses defer to name its results",
              "recover only returns values for named results",
              "The deferred closure must be able to assign to the result after the panic, and only a named result can be reached by name",
              "Named results run faster",
            ],
            answer: 2,
          },
          explanation: "When the task panics, the normal `return` never runs. The deferred closure is the last code to run, and the only way for it to hand an error to the caller is to assign to a result variable it can name. Naming the result gives it that handle.",
        },
      ],
    },

    // ───────────────────────── 15 ─────────────────────────
    {
      id: "go-basics-15-json",
      title: "JSON and struct tags",
      minutes: 30,
      xp: 120,
      concepts: ["encoding/json", "Marshal", "MarshalIndent", "Unmarshal", "struct tags", "omitempty", "exported fields"],
      learn: md`### Why JSON

The sorting floor, a billing system and a driver's phone are different programs. To trade information they need a shared written format that every language can read. For most of the web that format is **JSON**: objects in braces, arrays in brackets, strings, numbers, \`true\`/\`false\` and \`null\`.

~~~json
{"id": "PK-2001", "chute": "A", "kg": 2.4}
~~~

Go's standard library has \`encoding/json\`. You have been using it since lesson 1 without knowing: the \`scene\` helper in your file turns every value into JSON text with \`json.Marshal\`, and the floor reads that text.

### Marshal: Go value to JSON

~~~go
type Entry struct {
	ID    string
	Chute string
	Kg    float64
}

data, err := json.Marshal(Entry{ID: "PK-2001", Chute: "A", Kg: 2.4})
fmt.Println(string(data), err)
// {"ID":"PK-2001","Chute":"A","Kg":2.4} <nil>
~~~

Two things to notice. \`Marshal\` returns **bytes and an error** (the usual Go shape, so always check \`err\`; it fails for things like channels or values with infinite floats). And the keys are \`ID\`, \`Chute\`, \`Kg\`, copied from the field names. Outside Go, JSON keys are usually lower case.

### Struct tags: telling json what to call each field

A **struct tag** is a short string after a field's type, written in backticks. The \`json\` package reads it:

~~~go
type Entry struct {
	ID    string  \`json:"id"\`
	Chute string  \`json:"chute"\`
	Kg    float64 \`json:"kg"\`
}
// {"id":"PK-2001","chute":"A","kg":2.4}
~~~

The compiler ignores tags; only libraries that look for them (through reflection) care. That is also why a typo in a tag is silent: \`json:"chute"\` written as \`josn:"chute"\` is not an error, the tag is just never read. Keep the exact format: key, colon, quoted value, no spaces around the colon.

Options come after a comma:

- \`json:"note,omitempty"\` leaves the key out when the value is empty (\`""\`, \`0\`, \`false\`, nil, an empty slice).
- \`json:"-"\` never writes the field.

~~~go
type Entry struct {
	Note string \`json:"note,omitempty"\` // missing from the output while empty
}
~~~

### Exported fields only

\`encoding/json\` works from outside your package, so it can only see **exported** fields: names that start with a capital letter. A field called \`cache\` is skipped, with no error and no warning:

~~~go
type Entry struct {
	ID    string  \`json:"id"\`
	cache string  // unexported: never appears in the JSON
}
~~~

If a field you expect is missing from the output, the first thing to check is its capitalisation.

### Readable output: MarshalIndent

\`json.MarshalIndent(v, prefix, indent)\` produces the same data over several lines. A prefix of \`""\` and an indent of two spaces is the common choice:

~~~go
data, err := json.MarshalIndent(manifest, "", "  ")
if err != nil {
	fmt.Println("cannot encode:", err)
}
fmt.Println(string(data))
~~~

\`string(data)\` converts the bytes to text for printing. Maps come out with their keys sorted, so the output is the same every time. Go also escapes \`<\`, \`>\` and \`&\` into numeric escape codes (a backslash, a \`u\` and four hex digits), so the JSON is safe to embed in HTML; any JSON reader decodes them back.

### Unmarshal: JSON back into Go

~~~go
var back Manifest
err = json.Unmarshal(data, &back)
~~~

Why the \`&\`? \`Unmarshal\` has to **fill in** your variable. Go passes arguments by copy, so handing over \`back\` would give it a copy to fill, which you would never see. \`&back\` is the variable's *address*, a pointer (you met pointers in lesson 11), so \`Unmarshal\` can write into the real one. Forget it and you get an error value instead of data:

~~~text
json: Unmarshal(non-pointer main.Manifest)
~~~

Bad or mismatched input is reported as an error too, never a crash:

~~~text
unexpected end of JSON input
invalid character 'o' looking for beginning of object key string
json: cannot unmarshal string into Go struct field Entry.kg of type float64
~~~

Matching is by tag name (or field name when there is no tag), ignoring letter case. Keys that are not in your struct are skipped; fields that are not in the JSON stay at their zero value.

If you do not know the shape in advance, decode into \`map[string]any\`. JSON numbers then arrive as \`float64\`, whatever they looked like.

### A round trip as a test

A quick way to trust your encoding is to decode what you just encoded and compare: \`json.Unmarshal(data, &back)\` and then check \`len(back.Entries) == len(m.Entries)\`. It will not catch everything, but it catches the missing-tag and unexported-field mistakes quickly.

### Common mistakes

- Lower-case field names. The data silently disappears from the JSON.
- Forgetting \`&\` in \`Unmarshal\`.
- Ignoring the error from \`Marshal\` or \`Unmarshal\`.
- A typo in the tag name or a space inside the tag.
- Expecting \`omitempty\` to hide a *struct*. Empty structs are not "empty" to it; use a pointer for optional objects.
- Putting a JSON number into an \`int\` field when the data has a fraction (\`2.4\`). That fails with the "cannot unmarshal number" error.`,
      mission: md`Billing wants a copy of the shift's sorted parcels, and the way hubs trade data is a **manifest**: one JSON document with the hub name, the shift, one entry per parcel (its chute, its lane and its weight in kg), the overflow list and the reject count.

You will give the \`Entry\` and \`Manifest\` types their JSON names with struct tags, build the manifest from the parcels and the two routers you wrote in lesson 12, print it nicely indented and decode it again to prove it survived the trip. When this lesson passes, the **Manifest** viewer lights up with your document.`,
      tasks: [
        "Add struct tags above the divider so Entry encodes as id, chute, lane, kg and note (note is omitted when empty), and Manifest as hub, shift, entries, overflow and rejected. The unexported cache field gets no tag",
        "Build entries: one Entry per parcel in parcels, with ID, Chute from byRegion.Route(p), Lane from byWeightRouter.Route(p) and Kg from p.Kg(). Then m := Manifest{Hub: hubName, Shift: shift, Entries: entries, Overflow: overflow, Rejected: rejected}",
        "Encode with json.MarshalIndent(m, \"\", \"  \") into data (check the error), and print string(data). Also compact, _ := json.Marshal(entries[0])",
        "Decode data back into var back Manifest with json.Unmarshal(data, &back), set roundTrip := err == nil && len(back.Entries) == len(m.Entries), and decode the broken text []byte(\"{oops\") into badJSON",
        "Print fmt.Println(string(compact), roundTrip, badJSON) and send manifest (m), jsonBytes (len(data)), roundTrip and compact (string(compact)) with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───────────
// Give the fields JSON names with struct tags, for example:  ID string ${BT}json:"id"${BT}
// Entry:    id, chute, lane, kg, note (omit when empty); cache is private and gets no tag.
// Manifest: hub, shift, entries, overflow, rejected.
type Entry struct {
	ID    string
	Chute string
	Lane  string
	Kg    float64
	Note  string
	cache string
}

type Manifest struct {
	Hub      string
	Shift    int
	Entries  []Entry
	Overflow []string
	Rejected int
}

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 15: write the shift manifest as JSON and read it back.
// 1. var entries []Entry: one per parcel (ID, Chute: byRegion.Route(p), Lane: byWeightRouter.Route(p), Kg: p.Kg())
//    m := Manifest{Hub: hubName, Shift: shift, Entries: entries, Overflow: overflow, Rejected: rejected}
// 2. data, err := json.MarshalIndent(m, "", "  ")   check err, then fmt.Println(string(data))
//    compact, _ := json.Marshal(entries[0])
// 3. var back Manifest; err = json.Unmarshal(data, &back)
//    roundTrip := err == nil && len(back.Entries) == len(m.Entries)
//    badJSON := json.Unmarshal([]byte("{oops"), &back)
// 4. fmt.Println(string(compact), roundTrip, badJSON)
//    scene: manifest (m), jsonBytes (len(data)), roundTrip, compact (string(compact))
`,
      solutionAdd: go`// Entry is one parcel on the manifest. The tags set the JSON names; cache is private, so it is skipped.
type Entry struct {
	ID    string  ${BT}json:"id"${BT}
	Chute string  ${BT}json:"chute"${BT}
	Lane  string  ${BT}json:"lane"${BT}
	Kg    float64 ${BT}json:"kg"${BT}
	Note  string  ${BT}json:"note,omitempty"${BT}
	cache string
}

// Manifest is the document the hub sends at the end of a shift.
type Manifest struct {
	Hub      string   ${BT}json:"hub"${BT}
	Shift    int      ${BT}json:"shift"${BT}
	Entries  []Entry  ${BT}json:"entries"${BT}
	Overflow []string ${BT}json:"overflow"${BT}
	Rejected int      ${BT}json:"rejected"${BT}
}

${MAIN_DIVIDER}

// Lesson 15: the manifest as JSON.
var entries []Entry
for _, p := range parcels {
	entries = append(entries, Entry{ID: p.ID, Chute: byRegion.Route(p), Lane: byWeightRouter.Route(p), Kg: p.Kg()})
}
m := Manifest{Hub: hubName, Shift: shift, Entries: entries, Overflow: overflow, Rejected: rejected}
data, err := json.MarshalIndent(m, "", "  ")
if err != nil {
	fmt.Println("cannot encode:", err)
}
fmt.Println(string(data))
compact, _ := json.Marshal(entries[0])
var back Manifest
err = json.Unmarshal(data, &back)
roundTrip := err == nil && len(back.Entries) == len(m.Entries)
badJSON := json.Unmarshal([]byte("{oops"), &back)
fmt.Println(string(compact), roundTrip, badJSON)
scene("manifest", m)
scene("jsonBytes", len(data))
scene("roundTrip", roundTrip)
scene("compact", string(compact))`,
      explanation:
        "Struct tags rename fields for JSON (json:\"id\"), omitempty drops empty values (the Note stays out of every entry) and an unexported field such as cache is never written. MarshalIndent with a two-space indent gives the readable document; Marshal gives the compact one-line form. Unmarshal needs &back, a pointer, so it can fill your variable, and it reports malformed input as an error: \"{oops\" fails with invalid character 'o' looking for beginning of object key string. Decoding the output and comparing the number of entries is a cheap round-trip check.",
      hints: [
        { id: "h1", title: "Tags", content: "A tag sits after the field type, in backticks: ID string `json:\"id\"`. Do the same for every field you want to rename, and write `json:\"note,omitempty\"` for Note. The private cache field gets no tag at all." },
        { id: "h2", title: "Building the manifest", content: "Loop with for _, p := range parcels and append Entry{ID: p.ID, Chute: byRegion.Route(p), Lane: byWeightRouter.Route(p), Kg: p.Kg()}. Then data, err := json.MarshalIndent(m, \"\", \"  \") (the first string is the prefix, the second the indent). err already exists in main, but data is new, so := is fine." },
        { id: "h3", title: "Decoding", content: "var back Manifest, then err = json.Unmarshal(data, &back): note the & and the plain = (err is not new). badJSON := json.Unmarshal([]byte(\"{oops\"), &back) simply keeps the error value. compact, _ := json.Marshal(entries[0]) gives bytes, so use string(compact) when printing or sending." },
      ],
      tests: [
        {
          id: "t1",
          description: "the manifest has lower-case JSON keys for the hub header",
          assertionCode: js`
const m = scene.manifest;
assert(m && typeof m === "object", 'Send the manifest with scene("manifest", m);');
assert("hub" in m && "shift" in m && "entries" in m && "overflow" in m && "rejected" in m, "The manifest keys should be hub, shift, entries, overflow and rejected. Add struct tags like ${BT}json:\"hub\"${BT} to the Manifest fields. Got keys: " + Object.keys(m).join(", "));
assertEqual(m.hub, "Gopher Post Central Hub", "hub");
assertEqual(m.shift, 1, "shift");`,
        },
        {
          id: "t2",
          description: "every entry is a tagged Entry, and note is omitted while empty",
          assertionCode: js`
const m = scene.manifest;
assert(m && Array.isArray(m.entries), "manifest.entries should be an array: tag the Entries field with json:\"entries\".");
assertEqual(m.entries.length, 9, "entries (one per parcel in the parcels slice)");
assertEqual(m.entries[0], { id: "PK-2001", chute: "A", lane: "standard", kg: 2.4 }, "first entry. Keys must be id, chute, lane, kg (and no note: use omitempty, and leave cache untagged since it is private)");`,
        },
        {
          id: "t3",
          description: "overflow and rejected are carried into the manifest",
          assertionCode: js`
const m = scene.manifest;
assert(m && Array.isArray(m.overflow), "manifest.overflow should be an array: tag Overflow with json:\"overflow\".");
assertEqual(m.overflow, ["PK-2009"], "overflow");
assertEqual(m.rejected, 4, "rejected (the count from lesson 10)");`,
        },
        {
          id: "t4",
          description: "the compact entry and the round trip work",
          assertionCode: js`
assertEqual(scene.compact, '{"id":"PK-2001","chute":"A","lane":"standard","kg":2.4}', "compact (json.Marshal of entries[0], converted with string(...))");
assertEqual(scene.roundTrip, true, "roundTrip (Unmarshal into &back must succeed and give back the same number of entries)");`,
        },
        {
          id: "t5",
          description: "the indented JSON is printed with a two-space indent",
          assertionCode: js`
assert(lines.includes('  "hub": "Gopher Post Central Hub",'), 'Print string(data) where data comes from json.MarshalIndent(m, "", "  "). Expected a line:   "hub": "Gopher Post Central Hub",');
assertEqual(scene.jsonBytes, 1005, "jsonBytes (len(data) of the two-space indented document)");`,
        },
        {
          id: "t6",
          description: "broken JSON is reported as an error, not a crash",
          assertionCode: js`
const want = "{\"id\":\"PK-2001\",\"chute\":\"A\",\"lane\":\"standard\",\"kg\":2.4} true invalid character 'o' looking for beginning of object key string";
assert(lines.includes(want), "Print fmt.Println(string(compact), roundTrip, badJSON) where badJSON := json.Unmarshal([]byte(\"{oops\"), &back). Expected the line: " + want);`,
        },
      ],
      unlocks: ["go-manifest"],
      checks: [
        {
          prompt: "A struct has the field `Note string` with the tag `json:\"note,omitempty\"`. What happens when Note is `\"\"`?",
          question: {
            type: "choice",
            options: ["It is written as \"note\": \"\"", "It is written as \"note\": null", "The note key is left out of the JSON", "Marshal returns an error"],
            answer: 2,
          },
          explanation: "`omitempty` drops a field whose value is empty: an empty string, 0, false, nil or an empty slice or map. Without the option you would get `\"note\": \"\"`.",
        },
        {
          prompt: "The struct has a field `cache string` (no tag). What does `json.Marshal` do with it?",
          question: {
            type: "choice",
            options: [
              "Writes it as \"cache\": \"...\"",
              "Skips it silently, because it starts with a lower-case letter and is not exported",
              "Fails with an error about the unexported field",
              "Writes it as \"Cache\"",
            ],
            answer: 1,
          },
          explanation: "`encoding/json` lives in a different package and can only see exported (capitalised) fields. Unexported ones are skipped with no warning, a classic reason for a field that mysteriously never appears.",
        },
        {
          prompt: "Why is it `json.Unmarshal(data, &back)` and not `json.Unmarshal(data, back)`?",
          question: {
            type: "choice",
            options: [
              "The & makes the decode faster",
              "Go passes arguments by copy, so Unmarshal needs the variable's address to fill in the real one",
              "& converts the bytes to a string",
              "It is only a style convention",
            ],
            answer: 1,
          },
          explanation: "Without `&`, `Unmarshal` would receive a copy of `back` and any data it decoded would be thrown away. It actually refuses and returns `json: Unmarshal(non-pointer main.Manifest)`.",
        },
      ],
    },

    // ───────────────────────── 16 ─────────────────────────
    {
      id: "go-basics-16-shift",
      title: "End of shift",
      minutes: 40,
      xp: 200,
      concepts: ["putting it together", "map lookup by ID", "struct building", "nil maps", "formatted reports", "invariants"],
      learn: md`### Everything you have learned, in one function

Fifteen lessons ago the hub had a console and nothing else. Now it reads a manifest, rejects bad rows with reasons, loads vans, routes with interfaces, survives panics and writes JSON. The last job is the one every shift ends with: a **report** that adds it all up.

This lesson has very little new syntax. It is about *using* what you have, which is the real skill. Here is how to approach a job like this.

### Step 1: write down what goes in and what comes out

\`buildReport\` gets the hub name and shift, the vans (each one knows which parcel IDs it carries), the parcels (so we can look up weights and classes), the overflow list and the reject reasons. It returns a \`Report\`: how many parcels were sorted, how many rejected, how many overflowed, the revenue, the heaviest parcel and a count per chute.

~~~go
func buildReport(hub string, shift int, vans []Van, parcels []Parcel,
	overflow []string, reasons map[string]int) Report
~~~

Writing the signature first is a good habit. Once the inputs and output are fixed, the body is a matter of filling in the blanks.

### Step 2: pick the right data structure

A van only stores parcel *IDs*, but revenue needs each parcel's weight class. You could search the parcels slice for every ID, which is slow and clumsy. A **map from ID to Parcel** turns each lookup into one line (lesson 8):

~~~go
byID := make(map[string]Parcel, len(parcels))
for _, p := range parcels {
	byID[p.ID] = p
}
p := byID["PK-2004"] // the whole Parcel
~~~

\`make(map[string]Parcel, len(parcels))\` pre-sizes the map. The second argument is only a hint, but it avoids re-growing.

### Step 3: walk the vans and accumulate

Only parcels that really sit in a van are **sorted**. The overflow parcel (no room) earns nothing yet. So loop over the vans, then over each van's parcel IDs:

~~~go
for _, v := range vans {
	chute := chuteLabels[regionOf[v.Region]] // "north" -> North -> "A"
	for _, id := range v.Parcels {
		p := byID[id]
		r.Sorted++
		r.PerChute[chute]++
		revenue += feeCents[p.Class()]
	}
}
~~~

Read the chute lookup from the inside out: \`regionOf["north"]\` is a \`Region\` (a map, lesson 8), and that value indexes the \`chuteLabels\` array (lesson 7), giving \`"A"\`. Three earlier lessons in one line.

The fee table maps a weight class to cents. Money in whole cents is an \`int\`, so there are no rounding surprises (lesson 3). A tiny \`money\` function formats the total:

~~~go
func money(cents int) string { return fmt.Sprintf("$%d.%02d", cents/100, cents%100) }
// money(4170) -> "$41.70"
~~~

To find the **heaviest** parcel, remember the biggest weight seen so far and update both it and the ID when a bigger one shows up.

### The nil map trap

\`r.PerChute\` is a map inside a struct. A struct field starts at its zero value, and the zero value of a map is **nil**. Reading from a nil map is fine (you get zero values), but writing to one crashes:

~~~text
panic: assignment to entry in nil map
~~~

So create it before you count into it: \`PerChute: map[string]int{}\` (or \`make\`). This is the most common surprise when a struct holds a map or slice of maps.

### Step 4: print it with columns

\`%-10s\` pads text on the right to 10 characters, which lines labels up; \`%d\` and \`%s\` fill in the values:

~~~go
fmt.Printf("%-10s %d\n", "Sorted", report.Sorted)
fmt.Printf("%-10s %s\n", "Revenue", report.Revenue)
// Sorted     8
// Revenue    $41.70
~~~

Per-chute counts come from a map, whose iteration order is random (lesson 8). Collect the keys, \`sort.Strings\` them, then print, so the report is the same every time.

### Step 5: check yourself with an invariant

A good report can audit itself. Every manifest row ended in exactly one place: in a van (sorted), on the overflow tray, or in the reject bin. So:

~~~go
balanced := report.Sorted+report.Overflow+report.Rejected == len(rows)
~~~

If this is ever \`false\`, a parcel was lost or counted twice, and you want to know before billing does. Checks like this, cheap and written next to the code, catch bugs that no single function's tests notice.

### If something does not work

- Read the **first** compiler error, fix it, build again. Later errors are often echoes of the first.
- \`declared and not used\` means a variable you created is never read. Use it or delete it.
- If a number is wrong, print the intermediate values with \`fmt.Println\` or \`%+v\`. \`fmt.Printf("%+v\n", report)\` shows every field with its name.
- Re-read the lesson that introduced the idea. Everything you need is in lessons 1 to 15.

### Where this leads

You can now read input, make decisions, hold data in slices, maps and structs, write functions, return errors, share behaviour through interfaces, sort, clean up, survive panics and speak JSON. That is the language. What comes next is using it for bigger problems, and the Go path continues with three more projects:

- **Warehouse Ledger** (Intermediate): interfaces in depth, embedding, custom error types with \`errors.As\`, generics, decoding and validating JSON, regular expressions and table-driven tests.
- **Telemetry Pipeline** (Advanced): goroutines and channels, \`select\`, worker pools, mutexes, \`context\` cancellation and timeouts, and how data races happen.
- **REST API** (Professional): \`net/http\` handlers tested without a network, routing, middleware, validation, an in-memory repository and structured logging.`,
      mission: md`Closing time, shift 1. The manager is waiting for the number that matters: how much did the hub earn, what went wrong and are all the parcels accounted for?

This is the capstone. The \`Report\` type, the fee table and the \`money\` formatter are provided. You write \`buildReport\` from the vans, the parcels, the overflow list and the reject reasons, print the report with tidy columns and prove that every manifest row ended up somewhere. When this lesson passes, the **Shift report** lights up and so does the whole sorting floor: every chute, van, belt and bin running on code you wrote.`,
      tasks: [
        "Write the body of buildReport above the divider: build a map byID from parcels, create the Report with Overflow: len(overflow), the given Reasons and an initialised PerChute map, then loop over vans and their Parcels IDs to count Sorted, PerChute[chute], the revenue from feeCents[p.Class()] and the Heaviest ID. Rejected is the sum of the reasons. Revenue is money(revenue)",
        "In main: report := buildReport(hubName, shift, vans, parcels, overflow, reasons)",
        "Print the header ===== Shift 1 report: Gopher Post Central Hub ===== (with report.Shift and report.Hub), then one line each with Printf(\"%-10s %d\\n\", ...) or %s for Sorted, Rejected, Overflow, Revenue and Heaviest, for example Sorted     8 and Revenue    $41.70",
        "Print one line per chute in sorted key order, formatted Chute A    3 (the label, four spaces, the count)",
        "Compute balanced := report.Sorted+report.Overflow+report.Rejected == len(rows), print every manifest line accounted for: true, and send report and balanced with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───────────
// Given to you: the fee table (cents per weight class), the Report type and money().
// Your job: fill in buildReport below.
var feeCents = map[string]int{"Envelope": 120, "Small": 250, "Standard": 480, "Freight": 1500}

// Report is the end-of-shift summary.
type Report struct {
	Hub      string         ${BT}json:"hub"${BT}
	Shift    int            ${BT}json:"shift"${BT}
	Sorted   int            ${BT}json:"sorted"${BT}
	Rejected int            ${BT}json:"rejected"${BT}
	Overflow int            ${BT}json:"overflow"${BT}
	Revenue  string         ${BT}json:"revenue"${BT}
	Heaviest string         ${BT}json:"heaviest"${BT}
	PerChute map[string]int ${BT}json:"perChute"${BT}
	Reasons  map[string]int ${BT}json:"reasons"${BT}
}

func money(cents int) string { return fmt.Sprintf("$%d.%02d", cents/100, cents%100) }

// buildReport totals the shift from the vans, the parcels and the reject reasons.
func buildReport(hub string, shift int, vans []Van, parcels []Parcel, overflow []string, reasons map[string]int) Report {
	// TODO: 1. byID := map from parcel ID to Parcel
	//       2. r := Report{Hub: hub, Shift: shift, Overflow: len(overflow), Reasons: reasons, PerChute: map[string]int{}}
	//       3. for each van, for each ID in v.Parcels: count Sorted and PerChute, add feeCents[p.Class()], track the heaviest
	//       4. Rejected = the sum of reasons, Revenue = money(total)
	return Report{}
}

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 16: close the shift.
// report := buildReport(hubName, shift, vans, parcels, overflow, reasons)
// Print:  ===== Shift 1 report: Gopher Post Central Hub =====
//         Sorted     8     (fmt.Printf("%-10s %d\n", "Sorted", report.Sorted))
//         Rejected / Overflow the same way, then Revenue and Heaviest with %s
//         one line per chute in sorted order:  Chute A    3
// balanced := report.Sorted+report.Overflow+report.Rejected == len(rows)
// fmt.Println("every manifest line accounted for:", balanced)
// scene("report", report)   scene("balanced", balanced)
`,
      solutionAdd: go`// feeCents is what the hub charges to sort one parcel, in cents, by weight class.
var feeCents = map[string]int{"Envelope": 120, "Small": 250, "Standard": 480, "Freight": 1500}

// Report is the end-of-shift summary.
type Report struct {
	Hub      string         ${BT}json:"hub"${BT}
	Shift    int            ${BT}json:"shift"${BT}
	Sorted   int            ${BT}json:"sorted"${BT}
	Rejected int            ${BT}json:"rejected"${BT}
	Overflow int            ${BT}json:"overflow"${BT}
	Revenue  string         ${BT}json:"revenue"${BT}
	Heaviest string         ${BT}json:"heaviest"${BT}
	PerChute map[string]int ${BT}json:"perChute"${BT}
	Reasons  map[string]int ${BT}json:"reasons"${BT}
}

func money(cents int) string { return fmt.Sprintf("$%d.%02d", cents/100, cents%100) }

// buildReport totals the shift from the vans, the parcels and the reject reasons.
func buildReport(hub string, shift int, vans []Van, parcels []Parcel, overflow []string, reasons map[string]int) Report {
	byID := make(map[string]Parcel, len(parcels))
	for _, p := range parcels {
		byID[p.ID] = p
	}
	r := Report{Hub: hub, Shift: shift, Overflow: len(overflow), Reasons: reasons, PerChute: map[string]int{}}
	revenue, heaviest := 0, 0
	for _, v := range vans {
		chute := chuteLabels[regionOf[v.Region]]
		for _, id := range v.Parcels {
			p := byID[id]
			r.Sorted++
			r.PerChute[chute]++
			revenue += feeCents[p.Class()]
			if p.Grams > heaviest {
				heaviest, r.Heaviest = p.Grams, p.ID
			}
		}
	}
	for _, n := range reasons {
		r.Rejected += n
	}
	r.Revenue = money(revenue)
	return r
}

${MAIN_DIVIDER}

// Lesson 16: close the shift.
report := buildReport(hubName, shift, vans, parcels, overflow, reasons)
fmt.Printf("===== Shift %d report: %s =====\n", report.Shift, report.Hub)
fmt.Printf("%-10s %d\n", "Sorted", report.Sorted)
fmt.Printf("%-10s %d\n", "Rejected", report.Rejected)
fmt.Printf("%-10s %d\n", "Overflow", report.Overflow)
fmt.Printf("%-10s %s\n", "Revenue", report.Revenue)
fmt.Printf("%-10s %s\n", "Heaviest", report.Heaviest)
chuteNames := make([]string, 0, len(report.PerChute))
for name := range report.PerChute {
	chuteNames = append(chuteNames, name)
}
sort.Strings(chuteNames)
for _, name := range chuteNames {
	fmt.Printf("Chute %s    %d\n", name, report.PerChute[name])
}
balanced := report.Sorted+report.Overflow+report.Rejected == len(rows)
fmt.Println("every manifest line accounted for:", balanced)
scene("report", report)
scene("balanced", balanced)`,
      explanation:
        "buildReport turns the vans (which only know parcel IDs) into totals. A map from ID to Parcel makes each lookup one line. Only parcels inside a van count as sorted; the overflow parcel earns nothing. The chute label comes from chuteLabels[regionOf[v.Region]], money is kept in whole cents so nothing rounds, and PerChute must be created with map[string]int{} because writing to a nil map panics. The three buckets (sorted 8, overflow 1, rejected 4) add up to the 13 manifest rows, which is the balanced check.",
      hints: [
        { id: "h1", title: "Set up", content: "Start with byID := make(map[string]Parcel, len(parcels)) and a loop that stores byID[p.ID] = p. Then create the result: r := Report{Hub: hub, Shift: shift, Overflow: len(overflow), Reasons: reasons, PerChute: map[string]int{}}. The PerChute map must exist before you add to it." },
        { id: "h2", title: "The loops", content: "for _, v := range vans { chute := chuteLabels[regionOf[v.Region]]; for _, id := range v.Parcels { p := byID[id]; r.Sorted++; r.PerChute[chute]++; revenue += feeCents[p.Class()]; ... } }. Keep a heaviest weight and, when p.Grams is bigger, update it and r.Heaviest = p.ID. Rejected is the sum of the values in reasons." },
        { id: "h3", title: "Printing", content: "fmt.Printf(\"%-10s %d\\n\", \"Sorted\", report.Sorted) pads the label to 10 characters. Collect the keys of report.PerChute into a []string, sort.Strings them, then for each print fmt.Printf(\"Chute %s    %d\\n\", name, report.PerChute[name]). Finally balanced := report.Sorted+report.Overflow+report.Rejected == len(rows)." },
      ],
      tests: [
        {
          id: "t1",
          description: "the report counts sorted, rejected and overflow parcels",
          assertionCode: js`
const r = scene.report;
assert(r && typeof r === "object", 'Send the report with scene("report", report); (and write buildReport so it returns a filled-in Report)');
assertEqual(r.sorted, 8, "report.sorted (parcels inside a van: 9 accepted minus 1 overflow)");
assertEqual(r.rejected, 4, "report.rejected (the sum of the reasons)");
assertEqual(r.overflow, 1, "report.overflow (len(overflow))");`,
        },
        {
          id: "t2",
          description: "revenue and the heaviest parcel are right",
          assertionCode: js`
const r = scene.report;
assert(r && typeof r === "object", 'Send the report with scene("report", report);');
assertEqual(r.revenue, "$41.70", "report.revenue (4 Standard x 480 + 3 Small x 250 + 1 Freight x 1500 = 4170 cents; the overflow parcel earns nothing)");
assertEqual(r.heaviest, "PK-2004", "report.heaviest (the biggest parcel that is in a van)");`,
        },
        {
          id: "t3",
          description: "parcels are counted per chute and rejects per reason",
          assertionCode: js`
const r = scene.report;
assert(r && typeof r === "object", 'Send the report with scene("report", report);');
assertEqual(r.perChute, { A: 3, B: 2, C: 2, D: 1 }, "report.perChute (initialise the map with map[string]int{} before counting; chuteLabels[regionOf[v.Region]] gives the chute letter)");
assertEqual(r.reasons, { "unknown-region": 1, overweight: 1, "bad-weight": 1, malformed: 1 }, "report.reasons (pass the reasons map through unchanged)");
assertEqual(r.hub, "Gopher Post Central Hub", "report.hub");
assertEqual(r.shift, 1, "report.shift");`,
        },
        {
          id: "t4",
          description: "the report is printed in tidy columns",
          assertionCode: js`
assert(lines.includes("===== Shift 1 report: Gopher Post Central Hub ====="), 'Print the header: fmt.Printf("===== Shift %d report: %s =====\\n", report.Shift, report.Hub)');
for (const want of ["Sorted     8", "Rejected   4", "Overflow   1", "Revenue    $41.70", "Heaviest   PK-2004"]) {
  assert(lines.includes(want), 'Missing the line "' + want + '". Use fmt.Printf("%-10s %d\\n", "Sorted", report.Sorted) (and %s for the text values) so the label is padded to 10 characters, then one space.');
}`,
        },
        {
          id: "t5",
          description: "each chute gets a line, in alphabetical order",
          assertionCode: js`
const at = ["Chute A    3", "Chute B    2", "Chute C    2", "Chute D    1"].map((w) => lines.indexOf(w));
assert(at.every((i) => i >= 0), 'Print one line per chute like "Chute A    3" (the word Chute, the label, four spaces, the count): fmt.Printf("Chute %s    %d\\n", name, report.PerChute[name]).');
assert(at.every((v, i) => i === 0 || v > at[i - 1]), "The chute lines must come out A, B, C, D. Map order is random, so collect the keys and sort.Strings them first.");`,
        },
        {
          id: "t6",
          description: "every manifest line is accounted for",
          assertionCode: js`
assertEqual(scene.balanced, true, "balanced (sorted + overflow + rejected must equal len(rows), 13)");
assert(lines.includes("every manifest line accounted for: true"), 'Print: fmt.Println("every manifest line accounted for:", balanced)');`,
        },
      ],
      unlocks: ["go-shift"],
      checks: [
        {
          prompt: "What happens here?\n\n~~~go\nr := Report{}\nr.PerChute[\"A\"]++\n~~~",
          question: {
            type: "choice",
            options: [
              "It works: the map is created automatically on first use",
              "Compile error: PerChute is not initialised",
              "Run-time panic: assignment to entry in nil map",
              "It does nothing, silently",
            ],
            answer: 2,
          },
          explanation: "A map field's zero value is `nil`. Reading a nil map is allowed and gives zero values, but writing panics with `assignment to entry in nil map`. Create the map first: `PerChute: map[string]int{}` or `make(map[string]int)`.",
        },
        {
          prompt: "Why is the hub's money kept as whole cents in an `int` and only formatted as `$41.70` at the very end?",
          question: {
            type: "choice",
            options: [
              "ints are faster than strings",
              "Whole numbers add exactly, while fractional floating-point values can pick up tiny rounding errors",
              "Go has no way to print decimals",
              "The JSON package cannot encode floats",
            ],
            answer: 1,
          },
          explanation: "As you saw with `0.1 + 0.2` in lesson 3, `float64` stores binary approximations. Cents in an `int` are exact, so sums never drift. Format to dollars only for display.",
        },
        {
          prompt: "Why does the report include `balanced := Sorted + Overflow + Rejected == len(rows)`?",
          question: {
            type: "choice",
            options: [
              "The compiler requires every report to be balanced",
              "It audits the logic: each manifest row must end up in exactly one bucket, so a mismatch reveals a lost or double-counted parcel",
              "It makes the report print faster",
              "It sorts the rows",
            ],
            answer: 1,
          },
          explanation: "An invariant is something that must always be true. Checking it costs one line and turns a quiet accounting bug into something you notice immediately. Real systems are full of these self-checks.",
        },
      ],
    },
  ],
};
