import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { go, js, md } from "./util.ts";

/**
 * Chapter 1: Talking to the hub. The skeleton of a Go program, variables and types, arithmetic and
 * conversions, and reading input.
 *
 * Lesson 1's starter and solution carry the whole file: `package main`, one import block with every
 * package the course will use, the provided `scene` helper, a scaffold that keeps unused imports
 * legal until the lesson that really needs them, and `func main()`. From lesson 2 on, a lesson's text
 * may hold package-level declarations above MAIN_DIVIDER (they go before `func main`); what is below
 * the divider (or the whole text when there is no divider) is appended to the end of main's body.
 */

/** The skeleton every lesson builds on (see engine/compose.ts: it must end with the closing brace of main). */
const skeleton = (body: string, marker: string) => go`${marker}package main

import (
	"bufio"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"os"
	"sort"
	"strconv"
	"strings"
)

// Provided by pockett: sends one value to the live sorting floor beside your editor.
// From lesson 2 on you call scene("name", value). Leave this function as it is.
func scene(key string, v any) {
	data, err := json.Marshal(map[string]any{key: v})
	if err != nil {
		fmt.Println("scene: cannot send", key+":", err)
		return
	}
	fmt.Println("@scene " + string(data))
}

// Course scaffold. Go refuses to build a file that imports a package it never uses, but this
// course adds one idea per lesson. Each line below counts as "using" a package (the _ is the
// blank identifier: a name that means "I am deliberately ignoring this value") until the lesson
// that really needs it. You never need to edit this block.
var (
	_ = bufio.NewScanner  // lesson 4
	_ = errors.New        // lesson 10
	_ = math.Round        // lesson 3
	_ = os.Stdin          // lesson 4
	_ = sort.Strings      // lesson 8
	_ = strconv.Atoi      // lesson 4
	_ = strings.TrimSpace // lesson 4
)

func main() {
${body}
}`;

export const chapter1: Chapter = {
  id: "talking-to-the-hub",
  title: "Talking to the hub",
  blurb: "Make the console talk, store values with the right type, let Go do the arithmetic, and read your first parcel label.",
  lessons: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "go-basics-1-hello",
      title: "Hello, hub",
      minutes: 20,
      xp: 70,
      concepts: ["package main", "import", "func main", "fmt.Println", "fmt.Printf", "format verbs", "compiler errors"],
      learn: md`### Every Go program starts in \`package main\`

A complete Go program can be this small:

~~~go
package main

import "fmt"

func main() {
	fmt.Println("Gopher Post Central Hub")
}
~~~

Read it top to bottom:

- **\`package main\`**: Go code lives in *packages*. The package called \`main\` is special: it builds into a program you can run. Every other package name makes a library.
- **\`import "fmt"\`**: you must say which standard-library packages you use. \`fmt\` (short for *format*) prints and formats text.
- **\`func main()\`**: the entry point. The program starts here, runs the statements in order, and ends when \`main\` returns.
- The **braces** are required and the opening \`{\` stays on the same line as \`func\`. Indent with a tab. Go ships one official formatter, \`gofmt\`, so there are no style arguments: every Go file in the world looks the same.
- There are **no semicolons** to type. The compiler adds them at the end of a line for you, which is also why a stray line break in the wrong place is an error.

### The file you start with

The editor opens with a longer file than the little example above, because the whole course is *one growing program*. Look at the top of it:

- The **import block** lists every package this course will use. Packages you do not use yet are kept "in use" by the **scaffold** (\`var ( _ = bufio.NewScanner ... )\`). Go treats an unused import as an error, on purpose: it keeps builds fast and dead dependencies out. The \`_\` is the *blank identifier*, a name that means "I am ignoring this value". You never edit the scaffold, and each package gets a real job in a later lesson.
- The **\`scene\` function** is provided by pockett. From lesson 2 on you call \`scene("name", value)\` and the value appears on the live sorting floor next to your editor. It prints one special line that the floor understands, built with \`encoding/json\`. Leave it alone for now: you will understand every line of it by lesson 15.
- **\`func main()\`** is where you work. Your code goes inside the braces, at the bottom.

### Println, Print and Printf

\`fmt\` has three printing families you will use constantly:

~~~go
fmt.Println("Belts online:", 4)    // Belts online: 4   (spaces between values, newline at the end)
fmt.Print("Belts online: ")        // no newline, no spaces added around strings
fmt.Print(4, 5, "\n")              // 4 5               (a space goes between two non-strings)
fmt.Printf("Parcels today: %d\n", 40+2)   // Parcels today: 42
~~~

\`Println\` is the everyday one. \`Print\` adds a space between two operands only when neither is a string, which is a rule you will forget and then be surprised by, so prefer \`Println\` or \`Printf\`. \`Printf\` takes a **format string** with *verbs* (a \`%\` and a letter) that are replaced by the following arguments, in order. It never adds a newline by itself: write \`\n\` yourself.

### The verbs you will use every day

- \`%d\`: a whole number. \`%s\`: a string. \`%t\`: a bool. \`%f\`: a decimal number (\`%.2f\` keeps two decimals).
- \`%v\`: "the default format for any value". \`%+v\` also shows field names of a struct. \`%T\`: the *type* of the value.
- \`%q\`: a string in double quotes with escapes, perfect for spotting hidden spaces. \`%c\`: a character. \`%x\`: hexadecimal.
- \`%%\`: a literal percent sign.

A number between the \`%\` and the letter sets a minimum **width**; a minus sign makes it left-aligned; a dot sets the **precision**:

~~~go
fmt.Printf("%-8s|%5d|%6.1f%%\n", "North", 12, 87.5)
// North   |   12|  87.5%
~~~

\`%-8s\` pads the string to 8 characters on the right, \`%5d\` pads the number to 5 on the left, \`%6.1f\` is a decimal in 6 characters with one digit after the dot. This is how you line up columns in reports.

### Strings and comments

A string in double quotes understands escapes: \`\n\` (new line), \`\t\` (tab), \`\"\` (a quote that belongs to the text) and \`\\\` (one backslash). Single quotes are a different thing in Go: they hold one *character* (a rune), like \`'G'\`, never text. Everything after \`//\` on a line is a comment.

### When it will not build

Go compiles your whole file first, and if anything is wrong, *nothing runs*. Messages have a fixed shape, *file:line:column: message*:

~~~text
./main.go:5:2: "os" imported and not used
./main.go:9:6: undefined: fmt.println (but have Println)
./main.go:6:2: undefined: Println
./main.go:4:2: undefined: fmt
./main.go:11:17: syntax error: unexpected newline in argument list; possibly missing comma or )
~~~

The sorting floor shows the same message with its line number. Read the first one first: later errors are often just fallout. The compiler stops listing after ten errors.

Not every mistake is caught while building. A wrong verb compiles and prints a visible marker instead:

~~~go
fmt.Printf("%d\n", "hi")          // %!d(string=hi)
fmt.Printf("%d %d\n", 1)          // 1 %!d(MISSING)
fmt.Printf("%d\n", 1, 2)          // 1  then  %!(EXTRA int=2)
~~~

If you ever see \`%!\` in your output, a verb and an argument do not match.

### Common mistakes

- Writing \`fmt.println\`. In Go a name that starts with a capital letter is *exported* (usable from other packages); lower case is private, so \`println\` is not reachable from \`fmt\`.
- Forgetting the \`fmt.\` in front of \`Println\`, or forgetting the import.
- Using single quotes for text: \`'hi'\` is an error (*more than one character in rune literal*).
- Forgetting \`\n\` at the end of a \`Printf\` format.
- Putting the opening brace on its own line: *unexpected semicolon or newline before {*.`,
      mission: md`Welcome to **Gopher Post**, the parcel company that never sleeps. Its newest sorting hub, **Central Hub**, has belts, chutes, vans and a very quiet control room: it has no software yet. You are going to write all of it, lesson by lesson, in one growing Go program.

Every control room starts with a console. Make the hub announce itself, report its belts and its parcel count, and print a tidy status row. When this lesson passes, the **Control console** powers on: everything your program prints appears on the sorting floor, in order.`,
      tasks: [
        "Inside main, print the hub name on its own line with fmt.Println: Gopher Post Central Hub",
        "Use fmt.Print and then fmt.Println so that Belts online: 4 ends up on ONE line",
        "Use fmt.Printf with %d to print Parcels today: 42 (let Go add 40+2 in the argument)",
        "Print the row  North   |   12|  87.5%  with the single format %-8s|%5d|%6.1f%%  and the arguments \"North\", 12, 87.5",
        "Print \"ready\" is a string using %q and %T with the argument \"ready\" twice",
      ],
      starterAdd: skeleton(
        `	// ─── ✏️ YOUR TURN ───────────────────────────
	// Lesson 1: make the hub console talk. Your code goes inside main, right here.
	// 1. fmt.Println the hub name:  Gopher Post Central Hub
	// 2. fmt.Print("Belts online: ") then fmt.Println(4): both land on one line.
	// 3. fmt.Printf("Parcels today: %d\\n", 40+2)
	// 4. One Printf with %-8s|%5d|%6.1f%% (and a \\n) for "North", 12, 87.5
	// 5. fmt.Printf("%q is a %T\\n", "ready", "ready")
	// This first line is a placeholder so the file builds. Replace it with your own.
	fmt.Println("TODO: print the hub name here")`,
        `// ─── ✏️ YOUR TURN: lesson 1, scroll down to func main ───────────────\n`,
      ),
      solutionAdd: skeleton(
        `	// Lesson 1: the hub console talks.
	fmt.Println("Gopher Post Central Hub")
	fmt.Print("Belts online: ")
	fmt.Println(4)
	fmt.Printf("Parcels today: %d\\n", 40+2)
	fmt.Printf("%-8s|%5d|%6.1f%%\\n", "North", 12, 87.5)
	fmt.Printf("%q is a %T\\n", "ready", "ready")`,
        ``,
      ),
      explanation:
        "Println ends the line, Print does not, so Print(\"Belts online: \") followed by Println(4) is one line. Printf fills each verb from the arguments in order: %d takes the number 42 that Go computed from 40+2, %-8s pads \"North\" to eight characters on the right, %5d pads 12 on the left, %6.1f prints 87.5 with one decimal in six characters, and %% prints a real percent sign. %q wraps the string in quotes and %T prints its type, string. Printf never adds a newline, so each format ends with \\n.",
      hints: [
        { id: "h1", title: "Where the code goes", content: "Everything you write goes between the braces of func main(), replacing the TODO line. Each instruction is a call such as fmt.Println(\"Gopher Post Central Hub\"). Go needs no semicolons." },
        { id: "h2", title: "One line from two calls", content: "fmt.Print(\"Belts online: \") prints without moving to a new line, so fmt.Println(4) can finish the same line. For the third line use a verb: fmt.Printf(\"Parcels today: %d\\n\", 40+2)." },
        { id: "h3", title: "The verbs", content: "fmt.Printf(\"%-8s|%5d|%6.1f%%\\n\", \"North\", 12, 87.5) and fmt.Printf(\"%q is a %T\\n\", \"ready\", \"ready\"). Remember the \\n at the end of each format string, and %% for a literal percent sign." },
      ],
      tests: [
        {
          id: "t1",
          description: "The first line printed is the hub name",
          assertionCode: js`assertEqual(lines[0] ?? "(nothing printed yet)", "Gopher Post Central Hub", "Line 1 should be the hub name. Replace the TODO line inside main with fmt.Println(\"Gopher Post Central Hub\")");`,
        },
        {
          id: "t2",
          description: "Belts online: 4 is printed on a single line",
          assertionCode: js`assert(lines.includes("Belts online: 4"), 'No line is exactly "Belts online: 4". Print "Belts online: " with fmt.Print (it stays on the line), then print 4 with fmt.Println so it continues on the same line.');`,
        },
        {
          id: "t3",
          description: "Printf with %d prints Parcels today: 42",
          assertionCode: js`assert(lines.includes("Parcels today: 42"), 'No line is exactly "Parcels today: 42". Use fmt.Printf("Parcels today: %d\\n", 40+2) and do not forget the \\n at the end of the format.');`,
        },
        {
          id: "t4",
          description: "Width, alignment and precision line up the North row",
          assertionCode: js`assert(lines.includes("North   |   12|  87.5%"), 'No line is exactly "North   |   12|  87.5%". Use fmt.Printf("%-8s|%5d|%6.1f%%\\n", "North", 12, 87.5): %-8s pads on the right, %5d pads on the left, %6.1f keeps one decimal and %% prints a percent sign.');`,
        },
        {
          id: "t5",
          description: "%q and %T show the value in quotes and its type",
          assertionCode: js`assert(lines.includes('"ready" is a string'), 'No line is exactly "ready" is a string (with the quote marks). Use fmt.Printf("%q is a %T\\n", "ready", "ready"): %q quotes the string and %T prints its type.');`,
        },
        {
          id: "t6",
          description: "The lines come out in the order of the tasks",
          assertionCode: js`
const want = ["Gopher Post Central Hub", "Belts online: 4", "Parcels today: 42", "North   |   12|  87.5%", '"ready" is a string'];
const at = want.map((w) => lines.indexOf(w));
assert(at.every((i) => i >= 0), "Print all five lines first, then check their order.");
assert(at.every((v, i) => i === 0 || v > at[i - 1]), "The five lines are all there but in a different order. Print them in the order of the tasks.");`,
        },
      ],
      unlocks: ["go-console"],
      checks: [
        {
          prompt: "What does this print?\n\n~~~go\nfmt.Print(\"a\", \"b\", 1, 2, \"c\\n\")\n~~~",
          question: { type: "choice", options: ["a b 1 2 c", "ab1 2c", "ab12c", "a b1 2 c"], answer: 1 },
          explanation: "`Print` adds a space between two operands only when *neither* of them is a string. `\"a\"`, `\"b\"` and `1` are separated by nothing (each pair includes a string), but `1` and `2` are both numbers, so a space goes between them. `Println` always adds spaces, which is why it is the safer everyday choice.",
        },
        {
          prompt: "Which statement prints exactly `Total: 7` and ends the line?",
          question: {
            type: "choice",
            options: [
              "`fmt.Println(\"Total: %d\", 3+4)`",
              "`fmt.Printf(\"Total: %d\\n\", 3+4)`",
              "`fmt.printf(\"Total: %d\\n\", 3+4)`",
              "`fmt.Printf(\"Total: %d\", 3+4)`",
            ],
            answer: 1,
          },
          explanation: "Only `Printf` fills the `%d` verb, and its format ends with `\\n` so the line ends. `Println` would print the percent sign and the verb literally, `fmt.printf` is not exported (lower case) so it does not compile, and the last one prints the right text but never ends the line.",
        },
        {
          prompt: "A file imports `\"os\"` but never uses it. What happens when you build?",
          question: {
            type: "choice",
            options: ["It builds with a warning", "It builds and silently ignores the import", "The build fails: \"os\" imported and not used", "It fails only if the program is run"],
            answer: 2,
          },
          explanation: "Go has no warnings: if something is suspicious enough to flag, it is an error. An unused import stops the build, which keeps dead dependencies out of every program. That is why this course keeps its imports \"in use\" with the scaffold until each package earns its place.",
        },
      ],
    },

    // ───────────────────────── 2 ─────────────────────────
    {
      id: "go-basics-2-variables",
      title: "Variables, types and constants",
      minutes: 30,
      xp: 120,
      concepts: ["var", ":=", "basic types", "zero values", "const", "iota", "named types", "unused variables"],
      learn: md`### A variable is a named box with a type

A **variable** stores a value under a name, and in Go every variable has a **type** that never changes. There are three ways to declare one:

~~~go
var hubName string = "Gopher Post Central Hub"   // the full form: var name type = value
var shift = 1                                    // the type is inferred (int)
beltSpeed := 1.5                                 // short declaration: declare and assign (float64)
~~~

\`:=\` is the one you will type most. It only works **inside a function**, and it needs at least one **new** name on its left side. At the top level of a file (outside any function) you must use \`var\` or \`const\`: \`x := 5\` there is *syntax error: non-declaration statement outside function body*.

To change a variable later, assign with plain \`=\`: \`shift = 2\`. Declaring the same name twice in one scope is an error:

~~~text
./main.go:11:8: no new variables on left side of :=
~~~

### The basic types

- **Whole numbers**: \`int\` (the one to reach for; it is 64 bits wide on today's machines), plus sized types such as \`int8\`, \`int32\`, \`int64\` and the unsigned \`uint\`, \`uint8\` (also called \`byte\`).
- **Decimal numbers**: \`float64\` (the default for a literal like \`1.5\`) and \`float32\`.
- **bool**: \`true\` or \`false\`, in lower case.
- **string**: text in double quotes. It is *immutable* UTF-8.
- **rune**: one character, written in single quotes (\`'G'\`). It is an alias for \`int32\`.

The type is fixed. The compiler checks every assignment before the program ever runs:

~~~go
level := 3
level = "high"
// cannot use "high" (untyped string constant) as int value in assignment

var small int8 = 300
// cannot use 300 (untyped int constant) as int8 value in variable declaration (overflows)
~~~

\`%T\` prints the type of any value, which is a handy way to check what Go inferred.

### Zero values: nothing is ever uninitialised

If you declare a variable without a value, Go gives it the **zero value** of its type: \`0\` for numbers, \`0.0\` for floats, \`false\` for bools, \`""\` for strings and \`nil\` for pointers, slices, maps and a few more. There is no "garbage" memory to trip over.

~~~go
var processed, rejected int   // both are 0
var note string               // ""
var jammed bool               // false
~~~

Good Go code is designed so the zero value is useful: a counter that starts at 0 needs no setup line.

### Go insists you use what you declare

A local variable that is declared but never *used* is a compile error, and so is an unused import:

~~~text
./main.go:16:6: declared and not used: note
~~~

This is a feature, not a nuisance: it finds typos and leftovers. Assigning to a variable does not count as using it, reading it does. Printing it or passing it to \`scene\` counts. The program you are growing will keep every variable in use, and later lessons rely on that.

### Constants and iota

A **constant** is fixed at compile time and cannot be reassigned:

~~~go
const maxGrams = 25000    // untyped: it fits any numeric type that can hold it
~~~

A constant without a type is *untyped*, so \`maxGrams\` can be added to an \`int\`, a \`float64\` or an \`int64\` without any conversion. That flexibility is why constants are not variables.

For a family of related constants Go has **\`iota\`**: inside a \`const ( ... )\` block it starts at 0 and goes up by one for every line, and a line with no expression repeats the previous one.

~~~go
type Region int

const (
	North Region = iota // 0
	South               // 1
	East                // 2
	West                // 3
	regionCount         // 4: not a region, a handy count of how many there are
)
~~~

\`type Region int\` creates a **new type** whose underlying type is \`int\`. A \`Region\` and an \`int\` are different types, so mixing them without a conversion is an error: *cannot use r (variable of int type Region) as int value*. That small wall stops you from passing a chute number where a weight was expected. This pattern, a named integer type plus \`iota\` constants, is how Go does enums. Printing a \`Region\` shows its number for now; lesson 12 teaches it to print its name.

### Names

Names use letters, digits and underscores and cannot start with a digit. A name that starts with a **capital letter** is exported (visible to other packages); lower case is private to the package. Inside a function Go style prefers short \`camelCase\` names like \`beltSpeed\`. Choose names that say what a value means.

### Common mistakes

- Using \`:=\` outside a function, or using it twice for the same name in one scope.
- Declaring a variable and never using it (\`declared and not used\`).
- Expecting \`var x int = 3.9\` to round: a constant with a fraction cannot become an \`int\`.
- Forgetting that \`1.5\` is a \`float64\`, never an \`int\`.
- Writing \`true\`/\`false\` with a capital letter.`,
      mission: md`The hub needs a spec sheet before the first belt moves: its name, shift number, belt speed and whether it is open are four different kinds of data, and each deserves the right type. It also needs a list of delivery regions (North, South, East, West) that the code can count, and counters that start at zero.

You will declare them, print a status row, and send everything to the sorting floor with \`scene(...)\`. When this lesson passes, the **Hub plate** lights up with the hub's name, shift, belt speed and the four chutes.`,
      tasks: [
        "Above main, declare type Region int and a const block with iota: North, South, East, West, then regionCount. Also declare const maxGrams = 25000",
        "In main declare hubName (string, with var and the full form), shift := 1, beltSpeed := 1.5, open := true, and the zero values: var processed, rejected int, var note string, var jammed bool",
        "Print three lines: Gopher Post Central Hub | shift 1 | belt 1.5 m/s | open: true  then  zero values: 0 \"\" false  then  regions: 4 | West is 3  and a fourth line with the types: string int float64 bool (use %T)",
        "Send everything with scene: hubName, shift, beltSpeed, open, maxGrams, regionCount (as int), processed, rejected, note, jammed, plus the maps regionCodes and kinds shown in the starter",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───────────
// Declare the Region type and the iota constants here, and const maxGrams = 25000.

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 2: give the hub a spec sheet. Use the right type for each value.
//   var hubName string = "Gopher Post Central Hub"      (the full form)
//   shift := 1    beltSpeed := 1.5    open := true       (short declarations)
//   var processed, rejected int    var note string    var jammed bool   (zero values)
// Print these four lines (Printf with %s %d %.1f %t, then %q for the empty string, then %T):
//   Gopher Post Central Hub | shift 1 | belt 1.5 m/s | open: true
//   zero values: 0 "" false
//   regions: 4 | West is 3          (Println("regions:", regionCount, "| West is", West))
//   string int float64 bool
// Then send each value to the floor: scene("hubName", hubName) and so on. Also:
//   scene("regionCount", int(regionCount))      (a conversion: lesson 3 explains it)
//   scene("regionCodes", map[string]int{"North": int(North), "South": int(South), "East": int(East), "West": int(West)})
//   scene("kinds", map[string]string{"hubName": fmt.Sprintf("%T", hubName), "shift": ..., "beltSpeed": ..., "open": ...})
// (Maps are lesson 8. For now just copy the shape.)
`,
      solutionAdd: go`// Region is a new type built on int. iota counts up from 0 inside a const block.
type Region int

const (
	North Region = iota // 0
	South               // 1
	East                // 2
	West                // 3
	regionCount         // 4: not a region, just how many there are
)

// maxGrams is the heaviest parcel the hub accepts, in grams.
const maxGrams = 25000

${MAIN_DIVIDER}

// Lesson 2: the hub's spec sheet.
var hubName string = "Gopher Post Central Hub"
shift := 1
beltSpeed := 1.5
open := true
var processed, rejected int // zero values: 0 and 0
var note string             // ""
var jammed bool             // false

fmt.Printf("%s | shift %d | belt %.1f m/s | open: %t\n", hubName, shift, beltSpeed, open)
fmt.Printf("zero values: %d %q %t\n", processed, note, jammed)
fmt.Println("regions:", regionCount, "| West is", West)
fmt.Printf("%T %T %T %T\n", hubName, shift, beltSpeed, open)

scene("hubName", hubName)
scene("shift", shift)
scene("beltSpeed", beltSpeed)
scene("open", open)
scene("maxGrams", maxGrams)
scene("regionCount", int(regionCount))
scene("regionCodes", map[string]int{"North": int(North), "South": int(South), "East": int(East), "West": int(West)})
scene("processed", processed)
scene("rejected", rejected)
scene("note", note)
scene("jammed", jammed)
scene("kinds", map[string]string{
	"hubName":   fmt.Sprintf("%T", hubName),
	"shift":     fmt.Sprintf("%T", shift),
	"beltSpeed": fmt.Sprintf("%T", beltSpeed),
	"open":      fmt.Sprintf("%T", open),
})`,
      explanation:
        "Each value gets the type that fits: string for the name, int for the shift, float64 for 1.5 and bool for open. The unassigned variables get their zero values (0, \"\" and false), which is why the counters need no setup. The const block uses iota, so North is 0, South 1, East 2, West 3 and regionCount is 4, the number of regions. Because Region is its own type, scene needs the explicit int(...) conversion to send it as a plain number. Every variable is used (printed or sent), so the compiler is happy.",
      hints: [
        { id: "h1", title: "The declarations", content: "Above the divider: type Region int, then const ( North Region = iota; South; East; West; regionCount ) with each name on its own line, and const maxGrams = 25000. Below it: var hubName string = \"Gopher Post Central Hub\", then shift := 1, beltSpeed := 1.5, open := true." },
        { id: "h2", title: "Zero values and printing", content: "var processed, rejected int, var note string and var jammed bool need no value. Print with fmt.Printf(\"%s | shift %d | belt %.1f m/s | open: %t\\n\", hubName, shift, beltSpeed, open) and fmt.Printf(\"zero values: %d %q %t\\n\", processed, note, jammed)." },
        { id: "h3", title: "Sending to the floor", content: "scene(\"hubName\", hubName) sends one value. For the Region type convert first: scene(\"regionCount\", int(regionCount)). The two map arguments are in the starter comment: copy their shape and fill in the pieces." },
      ],
      tests: [
        {
          id: "t1",
          description: "The status row shows every value in the right format",
          assertionCode: js`assert(lines.includes("Gopher Post Central Hub | shift 1 | belt 1.5 m/s | open: true"), 'No line is exactly "Gopher Post Central Hub | shift 1 | belt 1.5 m/s | open: true". Use Printf with %s %d %.1f and %t: fmt.Printf("%s | shift %d | belt %.1f m/s | open: %t\\n", hubName, shift, beltSpeed, open)');`,
        },
        {
          id: "t2",
          description: "Zero values and the iota regions are printed",
          assertionCode: js`
assert(lines.includes('zero values: 0 "" false'), 'Print the zero values with fmt.Printf("zero values: %d %q %t\\n", processed, note, jammed). Expected the line: zero values: 0 "" false');
assert(lines.includes("regions: 4 | West is 3"), 'Print fmt.Println("regions:", regionCount, "| West is", West). Expected the line: regions: 4 | West is 3 (if the numbers differ, check the order of the iota constants).');
assert(lines.includes("string int float64 bool"), 'Print the four types with fmt.Printf("%T %T %T %T\\n", hubName, shift, beltSpeed, open). Expected: string int float64 bool');`,
        },
        {
          id: "t3",
          description: "hubName, shift, beltSpeed, open and maxGrams are sent with the right types",
          assertionCode: js`
assertEqual(scene.hubName, "Gopher Post Central Hub", "hubName (scene(\"hubName\", hubName))");
assertEqual(scene.shift, 1, "shift (an int, scene(\"shift\", shift))");
assertEqual(scene.beltSpeed, 1.5, "beltSpeed (a float64 keeps its .5)");
assertEqual(scene.open, true, "open (a bool)");
assertEqual(scene.maxGrams, 25000, "maxGrams (const maxGrams = 25000, then scene(\"maxGrams\", maxGrams))");`,
        },
        {
          id: "t4",
          description: "The iota constants count the regions",
          assertionCode: js`
assertEqual(scene.regionCount, 4, "regionCount (the last constant of the iota block, sent as scene(\"regionCount\", int(regionCount)))");
assertEqual(scene.regionCodes, { North: 0, South: 1, East: 2, West: 3 }, "regionCodes (North, South, East and West must be declared in this order with iota so they count 0 to 3)");`,
        },
        {
          id: "t5",
          description: "Variables without a value start at their zero value",
          assertionCode: js`
assertEqual(scene.processed, 0, "processed (var processed, rejected int, then scene(\"processed\", processed))");
assertEqual(scene.rejected, 0, "rejected (zero value of int)");
assertEqual(scene.note, "", "note (zero value of string is the empty string)");
assertEqual(scene.jammed, false, "jammed (zero value of bool)");`,
        },
        {
          id: "t6",
          description: "kinds lists the inferred type of each variable",
          assertionCode: js`assertEqual(scene.kinds, { hubName: "string", shift: "int", beltSpeed: "float64", open: "bool" }, "kinds: use fmt.Sprintf(\"%T\", value) for each of hubName, shift, beltSpeed and open");`,
        },
      ],
      unlocks: ["go-plate"],
      checks: [
        {
          prompt: "Which line is **not** allowed at the top level of a file, outside any function?",
          question: {
            type: "choice",
            options: ["`const maxGrams = 25000`", "`var hubName = \"Gopher Post\"`", "`shift := 1`", "`type Region int`"],
            answer: 2,
          },
          explanation: "Short declarations with `:=` only work inside a function. At the top level every statement must start with a keyword: `var`, `const`, `type` or `func`. The compiler reports `syntax error: non-declaration statement outside function body`.",
        },
        {
          prompt: "What does this block declare?\n\n~~~go\nconst (\n\tNorth Region = iota\n\tSouth\n\tEast\n)\n~~~",
          question: {
            type: "choice",
            options: ["South is 0 and East is 1", "North is 0, South is 1 and East is 2", "All three are 0", "It does not compile, South needs a value"],
            answer: 1,
          },
          explanation: "`iota` starts at 0 in each const block and rises by one per line. A line with no expression repeats the previous one (type and `iota` included), so `South` is `Region(1)` and `East` is `Region(2)`.",
        },
        {
          prompt: "After `var count int`, what is `count`, and is it a problem to leave it that way?",
          question: {
            type: "choice",
            options: ["It is undefined; reading it is an error", "It is 0, the zero value, and that is perfectly fine", "It is a random leftover value", "It is nil"],
            answer: 1,
          },
          explanation: "Every Go variable starts as its type's zero value: `0`, `0.0`, `false`, `\"\"` or `nil`. There is no uninitialised memory, so a counter that should start at zero needs no setup line.",
        },
      ],
    },

    // ───────────────────────── 3 ─────────────────────────
    {
      id: "go-basics-3-numbers",
      title: "Arithmetic and conversions",
      minutes: 30,
      xp: 120,
      concepts: ["operators", "integer division", "remainder", "type conversion", "math", "float precision", "overflow", "Sprintf"],
      learn: md`### The operators

\`+\`, \`-\`, \`*\`, \`/\` and \`%\` (remainder) do what you expect, with multiplication and division before addition and subtraction. \`x += 5\` means \`x = x + 5\`, and \`x++\` adds one. Careful: \`++\` and \`--\` are **statements** in Go, not expressions, so \`y := x++\` and \`++x\` do not exist. One less way to write confusing code.

### Integer division throws the fraction away

When both sides are whole numbers, \`/\` gives a whole number. The fraction is cut off (truncated toward zero), not rounded. The remainder operator tells you what was cut off, and its sign follows the left side:

~~~go
fmt.Println(7 / 2)      // 3
fmt.Println(-7 / 2)     // -3
fmt.Println(7.0 / 2)    // 3.5   one side has a decimal point
fmt.Println(7 % 2)      // 1
fmt.Println(-7 % 3)     // -1
~~~

\`n % 2 == 0\` tests for even numbers, and \`hour % 24\` wraps around a clock. \`%\` only exists for whole numbers: \`x % 2\` on a \`float64\` is *invalid operation: operator % not defined on x (variable of type float64)*.

### Go never converts numbers for you

This is the biggest surprise for people coming from other languages. A \`float64\` and an \`int\` are different types, and Go refuses to guess:

~~~go
count := 3
ratio := 1.5
total := count * ratio
// invalid operation: count * ratio (mismatched types int and float64)
~~~

You must **convert** one side on purpose with \`TypeName(value)\`:

~~~go
total := float64(count) * ratio      // 4.5
whole := int(total)                  // 4   (a conversion to int truncates, it does not round)
~~~

The same goes between \`int\` and \`int64\`, \`int32\` and the rest: *mismatched types int32 and int64*. Explicitness costs a few characters and removes a whole family of silent bugs. (Untyped **constants** are the exception: \`2 * ratio\` is fine because the literal \`2\` can become a float.) A constant that loses information is rejected outright: \`int(3.9)\` is *cannot convert 3.9 (untyped float constant) to type int*.

### Rounding up with integers

How many vans of 6 do you need for 47 parcels? Plain division says 7, but 7 vans only hold 42. Add \`size - 1\` before dividing to round **up**:

~~~go
vansNeeded := (47 + 6 - 1) / 6   // 8
lastLoad := 47 % 6               // 5 parcels in the last van
~~~

### The math package

\`math.Round\`, \`math.Floor\`, \`math.Ceil\`, \`math.Sqrt\`, \`math.Pow\`, \`math.Abs\`, \`math.MaxInt64\`... all work on \`float64\`. To round to two decimals: \`math.Round(x*100) / 100\`. (This is what the scaffold's \`_ = math.Round\` line was waiting for.)

### Floats are not exact

\`float64\` stores binary fractions, and 0.1 has no exact binary form. Go's *constants* are computed exactly, which hides it: \`fmt.Println(0.1 + 0.2)\` prints \`0.3\` because the compiler adds them as exact numbers. Put the same values in **variables** and the truth appears:

~~~go
tenth, fifth := 0.1, 0.2
fmt.Println(tenth + fifth)   // 0.30000000000000004
~~~

Fine for measurements, wrong for money. Keep money as a whole number of **cents** and format it at the end:

~~~go
fee := 2000                                  // cents
fmt.Sprintf("$%d.%02d", fee/100, fee%100)    // $20.00
~~~

\`fmt.Sprintf\` works exactly like \`Printf\` but returns the text instead of printing it. \`%02d\` pads a number with a leading zero to two digits.

### Overflow

Integer types have a fixed size. Go past the limit while the program runs and the value **wraps around** silently:

~~~go
var tiny int8 = 127
tiny++
fmt.Println(tiny)   // -128
~~~

If the compiler can see the overflow in a constant expression it refuses: *cannot use 300 (untyped int constant) as int8 value in variable declaration (overflows)*. Default \`int\` is 64-bit, so everyday counts will not overflow, but sized types (\`int8\`, \`uint8\`, \`int32\`) and unsigned numbers (\`uint\` minus one wraps to a huge number) deserve respect.

### Dividing by zero

Integer division by zero crashes the program with \`panic: runtime error: integer divide by zero\`. With floats you get \`+Inf\` or \`NaN\` and the program carries on. Check the divisor first. (Dividing by a *constant* zero is caught while building: *invalid operation: division by zero*.)

### Common mistakes

- Dividing two ints and expecting a fraction.
- Converting the *result* instead of an input: \`float64(a / b)\` converts after the fraction is already gone. Write \`float64(a) / float64(b)\`.
- Forgetting that \`int(x)\` truncates: \`int(-2.9)\` is \`-2\`.
- Using \`float64\` for money.
- Mixing \`int\` and \`float64\` (or two different int sizes) without a conversion.`,
      mission: md`The loading bay holds **47 parcels** weighing **156,000 g** in total. Each van carries 6 parcels. How many vans does the dispatcher need, how many parcels ride in the last one, what is the average weight, and what does the trip cost at $2.50 a van?

Real arithmetic is full of traps (integer division, mixed types, imprecise decimals and overflow), so you will walk into each one on purpose and step around it. When this lesson passes, the **Loading bay** lights up with your vans and numbers.`,
      tasks: [
        "Declare bayParcels := 47, vanSize := 6 and bayGrams := 156000. Compute vansNeeded (round UP with integer arithmetic) and lastLoad (the remainder)",
        "Compute avgKg: the average weight in kilograms rounded to 2 decimals. Convert to float64 BEFORE dividing and use math.Round",
        "Compute bayFee := vansNeeded * 250 (cents) and feeText with fmt.Sprintf(\"$%d.%02d\", ...) so it reads $20.00",
        "Show the traps: var tiny int8 = 127 then tiny++, and tenth, fifth := 0.1, 0.2 with floatSum := tenth + fifth",
        "Print the four lines listed in the starter and send bayParcels, vanSize, vansNeeded, lastLoad, avgKg, feeCents (the value of bayFee), feeText, tiny and floatSum with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 3: plan the day's vans. (Every variable you declare must also be used, so send it with scene.)
//   bayParcels := 47    vanSize := 6    bayGrams := 156000
// 1. vansNeeded = vans needed, rounded UP    -> 8    (add vanSize - 1 before dividing)
//    lastLoad   = parcels in the last van    -> 5    (the remainder %)
// 2. avgKg = average weight in kg, 2 decimals -> 3.32  math.Round(float64(bayGrams)/float64(bayParcels)/10) / 100
// 3. bayFee  := vansNeeded * 250               (cents)      feeText := fmt.Sprintf("$%d.%02d", bayFee/100, bayFee%100)
// 4. var tiny int8 = 127 then tiny++      and      tenth, fifth := 0.1, 0.2 then floatSum := tenth + fifth
// Print exactly these four lines:
//   8 vans, last one carries 5 parcels
//   Average 3.32 kg, fee $20.00
//   7 / 2 = 3 | 7.0 / 2 = 3.5 | -7 / 2 = -3       (Println("7 / 2 =", 7/2, "| 7.0 / 2 =", 7.0/2, "| -7 / 2 =", -7/2))
//   0.30000000000000004 -128                      (Println(floatSum, tiny))
// Then scene(...): bayParcels, vanSize, vansNeeded, lastLoad, avgKg, feeCents (send bayFee under this key), feeText, tiny, floatSum
`,
      solutionAdd: go`// Lesson 3: plan the day's vans.
bayParcels := 47
vanSize := 6
bayGrams := 156000

vansNeeded := (bayParcels + vanSize - 1) / vanSize // round up
lastLoad := bayParcels % vanSize
avgKg := math.Round(float64(bayGrams)/float64(bayParcels)/10) / 100
bayFee := vansNeeded * 250 // cents
feeText := fmt.Sprintf("$%d.%02d", bayFee/100, bayFee%100)

var tiny int8 = 127
tiny++ // wraps around silently
tenth, fifth := 0.1, 0.2
floatSum := tenth + fifth

fmt.Printf("%d vans, last one carries %d parcels\n", vansNeeded, lastLoad)
fmt.Printf("Average %.2f kg, fee %s\n", avgKg, feeText)
fmt.Println("7 / 2 =", 7/2, "| 7.0 / 2 =", 7.0/2, "| -7 / 2 =", -7/2)
fmt.Println(floatSum, tiny)

scene("bayParcels", bayParcels)
scene("vanSize", vanSize)
scene("vansNeeded", vansNeeded)
scene("lastLoad", lastLoad)
scene("avgKg", avgKg)
scene("feeCents", bayFee)
scene("feeText", feeText)
scene("tiny", tiny)
scene("floatSum", floatSum)`,
      explanation:
        "(47 + 6 - 1) / 6 rounds integer division up: 52 / 6 = 8, and 47 % 6 = 5 is the last van's load. Converting BOTH sides to float64 before dividing keeps the fraction (156000 / 47 = 3319.1...), and math.Round(x/10)/100 turns grams into kilograms with two decimals, 3.32. The fee is kept in whole cents (2000) and formatted with %d.%02d to read $20.00. Constant arithmetic like 7.0/2 is exact, but 0.1 + 0.2 stored in variables is the binary float 0.30000000000000004, and an int8 that goes past 127 wraps to -128.",
      hints: [
        { id: "h1", title: "Rounding up", content: "Integer division throws the remainder away. To round up add vanSize - 1 first: vansNeeded := (bayParcels + vanSize - 1) / vanSize. The leftover is bayParcels % vanSize." },
        { id: "h2", title: "Convert before dividing", content: "avgKg := math.Round(float64(bayGrams)/float64(bayParcels)/10) / 100. The conversions must be on the numbers going INTO the division. For the fee: bayFee := vansNeeded * 250 and feeText := fmt.Sprintf(\"$%d.%02d\", bayFee/100, bayFee%100)." },
        { id: "h3", title: "The traps", content: "var tiny int8 = 127 followed by tiny++ gives -128 without any error. tenth, fifth := 0.1, 0.2 then floatSum := tenth + fifth gives 0.30000000000000004 (put them in variables; constants are exact). Send the fee under the key \"feeCents\": scene(\"feeCents\", bayFee)." },
      ],
      tests: [
        {
          id: "t1",
          description: "vansNeeded rounds up and lastLoad is the remainder",
          assertionCode: js`
assert(lines.includes("8 vans, last one carries 5 parcels"), 'Print the line "8 vans, last one carries 5 parcels" with fmt.Printf("%d vans, last one carries %d parcels\\n", vansNeeded, lastLoad).');
assertEqual(scene.vansNeeded, 8, "vansNeeded (47 parcels in vans of 6 need 8 vans: round UP, not down to 7)");
assertEqual(scene.lastLoad, 5, "lastLoad (47 % 6)");
assertEqual(scene.bayParcels, 47, "bayParcels");
assertEqual(scene.vanSize, 6, "vanSize");`,
        },
        {
          id: "t2",
          description: "avgKg keeps its fraction and is rounded to 2 decimals",
          assertionCode: js`
assert(typeof scene.avgKg === "number", "Send avgKg with scene(\"avgKg\", avgKg)");
assert(scene.avgKg !== 3, "avgKg is 3, so the division happened between two ints. Convert both sides to float64 before dividing: float64(bayGrams) / float64(bayParcels)");
assertClose(scene.avgKg, 3.32, 0.0001, "avgKg should be 156000 g / 47 parcels, in kilograms, rounded to 2 decimals");`,
        },
        {
          id: "t3",
          description: "The fee is kept in cents and formatted as dollars",
          assertionCode: js`
assertEqual(scene.feeCents, 2000, "feeCents (vansNeeded * 250, an int number of cents sent under the key feeCents)");
assertEqual(scene.feeText, "$20.00", "feeText (fmt.Sprintf(\"$%d.%02d\", cents/100, cents%100))");
assert(lines.includes("Average 3.32 kg, fee $20.00"), 'Print "Average 3.32 kg, fee $20.00" with fmt.Printf("Average %.2f kg, fee %s\\n", avgKg, feeText).');`,
        },
        {
          id: "t4",
          description: "Integer and float division print as the lesson says",
          assertionCode: js`assert(lines.includes("7 / 2 = 3 | 7.0 / 2 = 3.5 | -7 / 2 = -3"), 'Print fmt.Println("7 / 2 =", 7/2, "| 7.0 / 2 =", 7.0/2, "| -7 / 2 =", -7/2). Expected the line: 7 / 2 = 3 | 7.0 / 2 = 3.5 | -7 / 2 = -3');`,
        },
        {
          id: "t5",
          description: "A float sum is inexact and an int8 wraps around",
          assertionCode: js`
assertEqual(scene.floatSum, 0.1 + 0.2, "floatSum (0.1 + 0.2 added from two VARIABLES is 0.30000000000000004)");
assertEqual(scene.tiny, -128, "tiny (an int8 at 127 plus one wraps to -128)");
assert(lines.includes("0.30000000000000004 -128"), 'Print fmt.Println(floatSum, tiny). Expected the line: 0.30000000000000004 -128');`,
        },
      ],
      unlocks: ["go-bay"],
      checks: [
        {
          prompt: "Which expression is `3.5`?",
          question: { type: "choice", options: ["`7 / 2`", "`7.0 / 2`", "`float64(7 / 2)`", "`7 % 2`"], answer: 1 },
          explanation: "The constant `7.0` is untyped and has a decimal point, so the division is done on decimals. `7 / 2` is `3` (both whole), `float64(7 / 2)` converts the already-truncated `3` and `7 % 2` is the remainder `1`.",
        },
        {
          prompt: "Why does this fail to compile?\n\n~~~go\ncount := 3\nratio := 1.5\ntotal := count * ratio\n~~~",
          question: {
            type: "choice",
            options: ["`:=` cannot be used with an expression", "count is not used", "Go has no implicit numeric conversion: int and float64 are different types", "ratio must be declared with var"],
            answer: 2,
          },
          explanation: "`count` is an `int` and `ratio` is a `float64`. Go never converts between them for you, so the compiler reports `mismatched types int and float64`. Write `float64(count) * ratio` to say what you mean.",
        },
        {
          prompt: "What does this print?\n\n~~~go\nvar tiny int8 = 127\ntiny++\nfmt.Println(tiny)\n~~~",
          question: { type: "choice", options: ["128", "127", "-128", "It does not compile"], answer: 2 },
          explanation: "Fixed-size integers wrap around at run time: past `127` an `int8` goes to `-128`, with no error or warning. Only constant expressions the compiler can see (like `var x int8 = 300`) are rejected while building.",
        },
      ],
    },

    // ───────────────────────── 4 ─────────────────────────
    {
      id: "go-basics-4-input",
      title: "Reading input",
      minutes: 30,
      xp: 120,
      concepts: ["bufio.Scanner", "os.Stdin", "strings.TrimSpace", "strings.ToLower", "strconv.Atoi", "error values", "multiple return values"],
      learn: md`### Input is a stream of text

When a program reads input it does not receive "a number" or "a name". It receives **text**, one line at a time, and your job is to clean it and convert it. Hand-typed data is messy: stray spaces, odd capital letters, "24kg" where a number was expected. Reading and validating input is where most real programs spend their effort.

On Gopher Post the scanner at the start of the belt produces a text label for each parcel. Here are the first four lines it sends your program:

~~~text
  PK-1001
  North
2400
24kg
~~~

Spaces around the ID, a capital N with spaces, a good weight, and a bad one.

### \`bufio.Scanner\`: read line by line

\`os.Stdin\` is the program's standard input. A **scanner** from the \`bufio\` package wraps it and hands you one line at a time:

~~~go
scanner := bufio.NewScanner(os.Stdin)
scanner.Scan()                 // read the next line; returns true if there was one
line := scanner.Text()         // the line, without its newline
~~~

\`Scan()\` returns \`false\` when the input has run out (or something went wrong; \`scanner.Err()\` tells you which), and \`Text()\` is then the empty string. In this lesson you will call it four times by hand. In lesson 6 you will use the loop form, \`for scanner.Scan() { ... }\`, which keeps reading until the input ends. A scanner reads lines up to 64 KB; longer lines need \`scanner.Buffer\`, which you will not need here.

### Cleaning text with \`strings\`

The \`strings\` package is your toolbox for text. Strings are immutable, so every function **returns a new string**:

~~~go
strings.TrimSpace("  PK-1001  ")   // "PK-1001"  (both ends; spaces, tabs, newlines)
strings.ToLower("  North ")        // "  north "
strings.ToLower(strings.TrimSpace("  North "))   // "north"  functions nest
~~~

Calling \`strings.TrimSpace(line)\` and ignoring the result does nothing useful. Always keep the return value.

### Converting text to a number: \`strconv.Atoi\`

\`strconv.Atoi\` ("ASCII to integer") turns \`"2400"\` into the number \`2400\`. But what if the text is \`"24kg"\`? Many languages throw an exception. Go's answer is simpler: a function that can fail returns **two values**, the result and an **error**:

~~~go
grams, err := strconv.Atoi("2400")
// grams == 2400, err == nil      nil means "no error"

grams, err = strconv.Atoi("24kg")
// grams == 0, err != nil
// err prints as: strconv.Atoi: parsing "24kg": invalid syntax
~~~

The standard handling is so common that you will write it hundreds of times:

~~~go
if err != nil {
	fmt.Println("cannot read weight:", err)
}
~~~

An \`error\` is an ordinary value you can print, store, compare and pass around. Lesson 10 is entirely about that idea. For now, remember three rules: the error is the *last* return value, \`nil\` means success, and you check it **immediately**.

Atoi is strict. All of these fail with *invalid syntax*: \`""\`, \`" 12"\`, \`"12 "\`, \`"3.5"\`, \`"1_000"\`, \`"0x10"\`. That is why you trim first. A number too big for an \`int\` fails with *value out of range*. On failure the number is \`0\` (or the largest value, for out of range), so never use it without checking the error.

### Two names on the left, and \`_\`

\`grams, err := ...\` declares both names. If you want only the error, throw the number away with the blank identifier: \`_, badErr := strconv.Atoi(text)\`. If you do the opposite and ignore the error, the compiler cannot stop you, but the next person to read the code will be right to worry.

You cannot squeeze two return values into one variable: \`g := strconv.Atoi("24")\` is *assignment mismatch: 1 variable but strconv.Atoi returns 2 values*. And declaring \`err\` without ever reading it is *declared and not used: err*, so make sure your \`if err != nil\` really looks at it.

Another detail: \`:=\` needs at least one **new** name on its left. \`grams, err := ...\` works the first time. A second call in the same scope, \`more, err := ...\`, also works because \`more\` is new (and \`err\` is simply reused). \`err := ...\` twice does not.

### Common mistakes

- Forgetting to trim, then wondering why \`Atoi(" 12")\` fails.
- Calling \`strings.TrimSpace(x)\` without assigning the result.
- Using the number without looking at \`err\`.
- Reading a line, converting it, and comparing in upper case against lower case. Normalise with \`strings.ToLower\` first.
- Expecting \`Scan()\` to give you the line. It gives you a bool; the line is in \`Text()\`.`,
      mission: md`Every parcel that reaches Central Hub is first scanned by a hand-held reader that prints a text label: an ID, a region and a weight. People type those labels, so they contain stray spaces and the occasional typo. Before anything can be sorted, the label must be cleaned and understood.

Read the first parcel label from the input, clean it, convert its weight, and then meet a bad label on purpose: the fourth line says \`24kg\`, and your program must handle it without crashing. When this lesson passes, the **Label scanner** lights up with the clean label and the error message.`,
      tasks: [
        "Create the scanner: scanner := bufio.NewScanner(os.Stdin). Read line 1 and set parcelID to the trimmed text (PK-1001)",
        "Read line 2 and set region to the trimmed, lower-case text (north). Read line 3 and convert it with strconv.Atoi into grams (2400), printing cannot read weight: <err> if err is not nil",
        "Read line 4 into badText (trimmed, 24kg) and convert it with _, badErr := strconv.Atoi(badText)",
        "Print label: PK-1001 | north | 2400 g  and  \"24kg\" -> strconv.Atoi: parsing \"24kg\": invalid syntax  (use %q and %v)",
        "Send parcelID, region, grams, badText and badError (the error's text, from badErr.Error()) with scene",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 4: read the first parcel label. The input has four lines (spaces and capitals included):
//     PK-1001      north      2400      24kg
// 1. scanner := bufio.NewScanner(os.Stdin)
//    scanner.Scan() reads the next line, scanner.Text() returns it. Clean it with strings.TrimSpace.
//    parcelID := trimmed line 1        region := lower-case trimmed line 2 (strings.ToLower)
// 2. grams, err := strconv.Atoi(trimmed line 3)      if err != nil { fmt.Println("cannot read weight:", err) }
// 3. badText := trimmed line 4        _, badErr := strconv.Atoi(badText)
// 4. Print:  label: PK-1001 | north | 2400 g         "24kg" -> strconv.Atoi: parsing "24kg": invalid syntax
//    (Printf with %s %d, and %q for the text and %v for the error)
// 5. scene("parcelID", ...), scene("region", ...), scene("grams", ...), scene("badText", ...), scene("badError", badErr.Error())
`,
      solutionAdd: go`// Lesson 4: read and clean the first parcel label.
scanner := bufio.NewScanner(os.Stdin)

scanner.Scan()
parcelID := strings.TrimSpace(scanner.Text())

scanner.Scan()
region := strings.ToLower(strings.TrimSpace(scanner.Text()))

scanner.Scan()
grams, err := strconv.Atoi(strings.TrimSpace(scanner.Text()))
if err != nil {
	fmt.Println("cannot read weight:", err)
}

scanner.Scan()
badText := strings.TrimSpace(scanner.Text())
_, badErr := strconv.Atoi(badText)

fmt.Printf("label: %s | %s | %d g\n", parcelID, region, grams)
fmt.Printf("%q -> %v\n", badText, badErr)

scene("parcelID", parcelID)
scene("region", region)
scene("grams", grams)
scene("badText", badText)
scene("badError", badErr.Error())`,
      explanation:
        "scanner.Scan() moves to the next line and scanner.Text() returns it. TrimSpace removes the stray spaces and ToLower normalises the region, so \"  North \" becomes \"north\". strconv.Atoi returns the number and an error: for \"2400\" the error is nil, for \"24kg\" it is a value that prints as strconv.Atoi: parsing \"24kg\": invalid syntax. Because the error is a value, the program prints it and carries on instead of crashing, and Error() gives its text for the floor.",
      hints: [
        { id: "h1", title: "Reading a line", content: "scanner := bufio.NewScanner(os.Stdin) once. Then for each line: scanner.Scan() followed by scanner.Text(). Clean with strings.TrimSpace(scanner.Text()). The region also goes through strings.ToLower." },
        { id: "h2", title: "Two return values", content: "grams, err := strconv.Atoi(strings.TrimSpace(scanner.Text())). Then if err != nil { fmt.Println(\"cannot read weight:\", err) } so err is used. For the bad one you only need the error: _, badErr := strconv.Atoi(badText)." },
        { id: "h3", title: "Printing and sending", content: "fmt.Printf(\"label: %s | %s | %d g\\n\", parcelID, region, grams) and fmt.Printf(\"%q -> %v\\n\", badText, badErr). The last scene line is scene(\"badError\", badErr.Error()): Error() returns the message as a string." },
      ],
      tests: [
        {
          id: "t1",
          description: "The label is cleaned: no stray spaces, lower-case region",
          assertionCode: js`
assertEqual(scene.parcelID, "PK-1001", "parcelID (line 1 with the spaces trimmed off: strings.TrimSpace)");
assertEqual(scene.region, "north", "region (line 2 trimmed AND lower-cased: strings.ToLower(strings.TrimSpace(...)))");`,
        },
        {
          id: "t2",
          description: "The good weight is converted to a number",
          assertionCode: js`assertEqual(scene.grams, 2400, "grams (line 3 converted with strconv.Atoi; it must be a number, not the text \"2400\")");`,
        },
        {
          id: "t3",
          description: "The bad weight keeps its text and its error",
          assertionCode: js`
assertEqual(scene.badText, "24kg", "badText (line 4, trimmed)");
assertEqual(scene.badError, 'strconv.Atoi: parsing "24kg": invalid syntax', "badError (send badErr.Error() from _, badErr := strconv.Atoi(badText))");`,
        },
        {
          id: "t4",
          description: "The label row is printed",
          assertionCode: js`assert(lines.includes("label: PK-1001 | north | 2400 g"), 'No line is exactly "label: PK-1001 | north | 2400 g". Use fmt.Printf("label: %s | %s | %d g\\n", parcelID, region, grams).');`,
        },
        {
          id: "t5",
          description: "The error is printed next to the text that caused it",
          assertionCode: js`assert(lines.includes('"24kg" -> strconv.Atoi: parsing "24kg": invalid syntax'), 'No line shows the bad label and its error. Use fmt.Printf("%q -> %v\\n", badText, badErr): %q quotes the text and %v prints the error.');`,
        },
      ],
      unlocks: ["go-scanner"],
      checks: [
        {
          prompt: "`strconv.Atoi(\" 12\")` (with a space in front). What happens?",
          question: {
            type: "choice",
            options: ["It returns 12 and a nil error", "It returns 0 and an invalid syntax error", "It panics and stops the program", "It returns 12 and a warning"],
            answer: 1,
          },
          explanation: "`Atoi` is strict: leading or trailing spaces make the text invalid. It returns `0` and an error value rather than crashing, which is why you trim first and always check `err`.",
        },
        {
          prompt: "Which line really cleans the text?",
          question: {
            type: "choice",
            options: [
              "`strings.TrimSpace(line)`",
              "`line = strings.TrimSpace(line)`",
              "`line.TrimSpace()`",
              "`strings.TrimSpace(&line)`",
            ],
            answer: 1,
          },
          explanation: "Strings are immutable, so `strings.TrimSpace` returns a *new* string and leaves the old one alone. The first option throws that result away. Go has no methods on string values for this, and no need for a pointer: assign the returned value.",
        },
        {
          prompt: "What does it mean when `err == nil` after a call?",
          question: {
            type: "choice",
            options: ["Something went wrong and the result is empty", "The call succeeded: there is no error", "The error has been ignored", "The program must stop"],
            answer: 1,
          },
          explanation: "`nil` is Go's \"nothing here\" value. By convention a function returns `nil` as its error when it worked and a real error value when it did not, so `if err != nil` is the standard way to ask \"did that fail?\".",
        },
      ],
    },
  ],
};
