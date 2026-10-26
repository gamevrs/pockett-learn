import type { Chapter } from "@/engine/types";
import { MAIN_DIVIDER } from "../../../engine/compose.ts";
import { go, js, md } from "./util.ts";

/**
 * Chapter 2: Decisions and data. Rules with if and switch, the one loop, slices, and maps.
 *
 * Lessons 5 to 8 only append to main's body (7 and 8 also add one package-level lookup table above
 * the MAIN_DIVIDER). They build on lesson 4's parcel label (parcelID, region, grams) and its
 * `scanner`: lesson 6 reads the rest of stdin, keeps it in the string `manifest`, and lessons 7 and 8
 * split that string into `rows` and mine it for lists and tallies.
 */
export const chapter2: Chapter = {
  id: "decisions-and-data",
  title: "Decisions and data",
  blurb: "Teach the gate to decide, read the whole manifest with the only loop Go has, and keep it in slices and maps.",
  lessons: [
    // ───────────────────────── 5 ─────────────────────────
    {
      id: "go-basics-5-gates",
      title: "Gates and rules",
      minutes: 25,
      xp: 100,
      concepts: ["if / else", "init statement", "scope", "switch", "tagless switch", "no fall-through", "&& || !"],
      learn: md`### An \`if\` is a question with a yes or no answer

Every sorting hub is mostly rules: *if the parcel is too heavy, send it to the reject bin; if it is going north, use chute A.* Go writes a rule with \`if\`:

~~~go
if grams > maxGrams {
	fmt.Println("too heavy")
} else if grams > 10000 {
	fmt.Println("freight")
} else {
	fmt.Println("fine")
}
~~~

Three things look different from other languages, and each one is a deliberate choice.

- **No parentheses** around the condition. They are legal, but \`gofmt\` (the standard formatter) removes them.
- **The braces are mandatory**, even for a single statement. Languages that let you skip them have a long history of bugs where someone added a second line to an \`if\` that did not actually belong to it. Go makes that bug impossible.
- **The \`{\` must sit on the same line as the \`if\`, and \`else\` on the same line as the closing \`}\`.** Go's compiler quietly inserts a semicolon at the end of a line that ends in certain tokens, so a brace or an \`else\` on a new line is read as a new statement. You will see exactly these messages:

~~~text
syntax error: unexpected newline, expected { after if clause
syntax error: unexpected keyword else, expected }
~~~

### The condition must be a real bool

Go has no "truthy" values. \`0\`, \`""\` and \`nil\` are not false, they are simply not booleans, and the compiler says so:

~~~go
if grams {          // non-boolean condition in if statement
}
~~~

You have to write the comparison out: \`if grams != 0\`. It is one more word, and it removes a whole class of surprises.

### Combining conditions

\`&&\` means *and*, \`||\` means *or* and \`!\` means *not*. They **short-circuit**: in \`a && b\`, if \`a\` is false then \`b\` is never evaluated, which is what lets you write \`if len(fields) == 3 && fields[2] != ""\` without the second half ever touching a missing element.

~~~go
accepted := class != "Invalid" && class != "Overweight" && chute != "reject"
~~~

### The init statement

An \`if\` may start with a short statement, then a semicolon, then the condition. The variable it declares exists **only inside the \`if\`, its \`else if\` branches and its \`else\`**:

~~~go
if kg := float64(grams) / 1000; kg >= 20 {
	handling = "two-person lift"
} else if kg >= 5 {
	handling = "trolley"
}
fmt.Println(kg)   // undefined: kg
~~~

This is the idiom for "compute something, test it, and then forget it", so a throwaway value does not leak into the rest of \`main\`. You will meet it constantly with errors: \`if err := doThing(); err != nil { ... }\`.

### There is no ternary operator

Other languages have \`condition ? a : b\`. Go does not, and typing it gets you \`invalid character U+003F '?'\`. The language designers kept the feature set small on purpose: nested ternaries are famously hard to read, and an ordinary \`if\` is always clear. The Go way is to set a default and override it:

~~~go
handling := "by hand"
if kg >= 5 {
	handling = "trolley"
}
~~~

### \`switch\`: a tidier chain of ifs

When one value is compared against many options, use a \`switch\`:

~~~go
switch region {
case "north":
	chute = "A"
case "south":
	chute = "B"
default:
	chute = "reject"
}
~~~

- **A case can list several values**: \`case "east", "west":\`.
- **There is no fall-through.** In C, once a case matches, execution rolls into the next case unless you write \`break\`. Go does the opposite: each case ends by itself, so you never write \`break\` just to stop. If you really want the old behaviour, there is a keyword, \`fallthrough\`, and it is rare enough that seeing it in code is a signal to look closely.
- **Cases are checked top to bottom and the first match wins.** The compiler also rejects an obvious duplicate: \`duplicate case "north" (constant of type string) in expression switch\`.
- **\`default\`** runs when nothing else matched. It can appear anywhere, but putting it last reads best.

### The tagless switch

Leave out the value and every \`case\` is a full condition. This is the clean way to write a ladder of ranges:

~~~go
switch {
case grams <= 0:
	class = "Invalid"
case grams < 500:
	class = "Envelope"
case grams < 2000:
	class = "Small"
default:
	class = "Standard"
}
~~~

Because the first true case wins, you order the cases from the most specific to the most general. Reading the ladder above, a parcel of 300 g matches \`< 500\` and stops there, so the \`< 2000\` case never sees it.

A value switch with a mismatched case type is a compile error too: \`switch n { case "four": }\` fails with \`cannot convert "four" (untyped string constant) to type int\`.

### Common mistakes

- Putting \`{\` or \`else\` on a new line.
- Writing \`if x = 5\` when you mean \`==\`. In Go an assignment is not an expression, so this is a syntax error rather than a silent bug.
- Using the init-statement variable after the \`if\` is over (\`undefined: kg\`).
- Ordering tagless cases from general to specific, so the first case swallows everything.
- Expecting a case to fall through. It will not, so write a list (\`case "east", "west":\`) when two values share one body.`,
      mission: md`The label scanner now hands you a parcel: PK-1001, 2400 g, bound for the north. Reading it is not enough. At the end of the belt stands the **sorting gate**, and it has to decide three things: how the parcel must be lifted, which weight class it belongs to, and which chute it should drop into.

Write those rules. When the lesson passes, the **Sorting gate** lights up on the floor: the class badge appears on the scanner arch and chute A starts to glow.`,
      tasks: [
        'Start with handling := "by hand". Then use an if with an init statement, if kg := float64(grams) / 1000; kg >= 20, to set "two-person lift", and an else if (kg >= 5) to set "trolley"',
        'Declare var class string and fill it with a tagless switch: grams <= 0 is "Invalid", under 500 "Envelope", under 2000 "Small", up to 10000 "Standard", up to maxGrams "Freight", anything else "Overweight"',
        'Set chute with a switch on region: "north" is "A", "south" "B", "east" "C", "west" "D", and it starts as "reject" for anything else. Set lane to "mainline", but "coastal" when the region is "east" or "west" (one case with two values)',
        'Declare accepted as a bool: the class is not "Invalid", not "Overweight", and the chute is not "reject". Print PK-1001 -> chute A, Standard, by hand with Printf using the parcelID, chute, class and handling variables',
        "Send handling, class, chute, lane and accepted to the floor with scene(...), using those exact key names",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 5: the sorting gate decides what happens to the parcel from lesson 4.
// grams, region and parcelID already exist above. Add your code below.
// 1. handling := "by hand", then:  if kg := float64(grams) / 1000; kg >= 20 { ... } else if kg >= 5 { ... }
//    "two-person lift" for 20 kg or more, "trolley" for 5 kg or more.
// 2. var class string, then a tagless switch { case grams <= 0: ... } with the weight classes:
//    <= 0 Invalid | < 500 Envelope | < 2000 Small | <= 10000 Standard | <= maxGrams Freight | otherwise Overweight
// 3. chute := "reject", then switch region { case "north": chute = "A" ... } (B south, C east, D west)
//    lane := "mainline", but "coastal" for  case "east", "west":
// 4. accepted := ... (a bool built with && and !=), then print:  PK-1001 -> chute A, Standard, by hand
// 5. scene("handling", handling) and the same for class, chute, lane, accepted.
`,
      solutionAdd: go`// Lesson 5: the sorting gate decides what happens to the parcel.
handling := "by hand"
if kg := float64(grams) / 1000; kg >= 20 {
	handling = "two-person lift"
} else if kg >= 5 {
	handling = "trolley"
}

var class string
switch {
case grams <= 0:
	class = "Invalid"
case grams < 500:
	class = "Envelope"
case grams < 2000:
	class = "Small"
case grams <= 10000:
	class = "Standard"
case grams <= maxGrams:
	class = "Freight"
default:
	class = "Overweight"
}

chute := "reject"
switch region {
case "north":
	chute = "A"
case "south":
	chute = "B"
case "east":
	chute = "C"
case "west":
	chute = "D"
}

lane := "mainline"
switch region {
case "east", "west":
	lane = "coastal"
}

accepted := class != "Invalid" && class != "Overweight" && chute != "reject"

fmt.Printf("%s -> chute %s, %s, %s\n", parcelID, chute, class, handling)
scene("handling", handling)
scene("class", class)
scene("chute", chute)
scene("lane", lane)
scene("accepted", accepted)`,
      explanation:
        "The if with an init statement computes kg for the test and forgets it afterwards, so only handling survives. The tagless switch is a ladder of conditions: the first true case wins, which is why the cases run from smallest to largest weight, and 2400 g lands in Standard. The value switch on region needs no break because Go cases do not fall through, and case \"east\", \"west\" lets two values share one body. Finally accepted combines three tests with && and !=, so one rejected property is enough to turn it false.",
      hints: [
        { id: "h1", title: "Two decisions, two tools", content: "Weights form ranges, so use a switch with no value: switch { case grams <= 0: ... }. A region is one exact word at a time, so use switch region { case \"north\": ... }. Declare class with var class string before its switch so it exists after the closing brace." },
        { id: "h2", title: "The init statement", content: "if kg := float64(grams) / 1000; kg >= 20 { handling = \"two-person lift\" } else if kg >= 5 { handling = \"trolley\" } . Remember the } else if stays on the same line as the closing brace. kg is not available after the if." },
        { id: "h3", title: "The last lines", content: "accepted := class != \"Invalid\" && class != \"Overweight\" && chute != \"reject\" . Print with fmt.Printf(\"%s -> chute %s, %s, %s\\n\", parcelID, chute, class, handling) and then call scene(\"handling\", handling) and so on for the other four values." },
      ],
      tests: [
        {
          id: "t1",
          description: "handling comes from the init-statement if (2.4 kg is carried by hand)",
          assertionCode: js`assertEqual(scene.handling, "by hand", "handling (PK-1001 weighs 2.4 kg, under the 5 kg trolley limit. Send it with scene(\"handling\", handling))");`,
        },
        {
          id: "t2",
          description: "the weight class comes from a tagless switch",
          assertionCode: js`assertEqual(scene.class, "Standard", "class (2400 g is at least 2000 and at most 10000, so Standard. Send it with scene(\"class\", class))");`,
        },
        {
          id: "t3",
          description: "the chute and the lane come from switches on the region",
          assertionCode: js`
assertEqual(scene.chute, "A", "chute (the region is north, so chute A)");
assertEqual(scene.lane, "mainline", "lane (north is not east or west, so mainline)");`,
        },
        {
          id: "t4",
          description: "accepted is a bool",
          assertionCode: js`assertEqual(scene.accepted, true, "accepted (send a bool: class is not Invalid or Overweight and the chute is not reject)");`,
        },
        {
          id: "t5",
          description: "the gate prints its decision",
          assertionCode: js`assert(lines.includes("PK-1001 -> chute A, Standard, by hand"), 'No line is exactly "PK-1001 -> chute A, Standard, by hand". Use fmt.Printf("%s -> chute %s, %s, %s\\n", parcelID, chute, class, handling).');`,
        },
      ],
      unlocks: ["go-gate"],
      checks: [
        {
          prompt: 'What does this print?\n\n~~~go\nx := 1\nswitch x {\ncase 1:\n\tfmt.Println("one")\ncase 2:\n\tfmt.Println("two")\n}\n~~~',
          question: { type: "choice", options: ["one", "one and then two", "two", "Nothing: a break is missing"], answer: 0 },
          explanation: "Go cases do not fall through. Once `case 1` matches and its body has run, the switch is over, with no `break` needed. Only the keyword `fallthrough` would roll on into `case 2`.",
        },
        {
          prompt: "Which of these is a compile error?",
          question: {
            type: "choice",
            options: ["`if (grams > 100) {`", "`if n := len(name); n > 0 {`", "`if grams > 100` followed by `{` on the next line", "`if grams != 0 {`"],
            answer: 2,
          },
          explanation: "Go ends a line that finishes with a name, number or `)` with an automatic semicolon, so the `if` clause is cut off before the brace: `syntax error: unexpected newline, expected { after if clause`. Parentheses around a condition are allowed (gofmt just removes them), and an init statement is perfectly fine.",
        },
        {
          prompt: "After `if kg := float64(grams) / 1000; kg >= 20 { ... } else { ... }`, where can `kg` be used?",
          question: {
            type: "choice",
            options: ["Only inside the if block", "Inside the if block and the else block, but not after the whole statement", "Anywhere later in the function", "Nowhere: it is only part of the condition"],
            answer: 1,
          },
          explanation: "A variable declared in the init statement belongs to the whole `if` / `else if` / `else` chain and disappears when the chain ends. Using it afterwards is `undefined: kg`.",
        },
      ],
    },

    // ───────────────────────── 6 ─────────────────────────
    {
      id: "go-basics-6-loops",
      title: "The only loop",
      minutes: 30,
      xp: 120,
      concepts: ["for", "three-part loop", "condition-only loop", "infinite loop", "break / continue", "range", "runes", "scanner loop"],
      learn: md`### Go has exactly one loop keyword

Other languages give you \`for\`, \`while\`, \`do ... while\` and \`foreach\`. Go has **\`for\`**, and it wears four outfits. That is a design decision: fewer keywords to learn, and one place to look for any kind of repetition.

### 1. The three-part loop

~~~go
for i := 3; i >= 1; i-- {
	fmt.Println("Belt starts in", i)
}
~~~

The parts are an **init** statement (runs once), a **condition** (checked before every pass) and a **post** statement (runs after every pass). \`i--\` is "subtract one" and \`i++\` is "add one". As with \`if\`, there are no parentheses and the braces are required. Notice that \`i\` is declared by the loop itself, so it is gone once the loop ends.

### 2. The condition-only loop: Go's "while"

Leave out the init and the post and you have a \`while\`:

~~~go
count := 10
for count > 0 {
	count -= 3
}
~~~

There is no \`while\` keyword. If you try one, the compiler gets confused in an unhelpful way (\`syntax error: unexpected name x at end of statement\`), because to Go it is just an unknown word followed by something unexpected. Write \`for\` instead.

### 3. The infinite loop

With nothing at all after \`for\`, the loop never ends on its own. You leave it with \`break\`:

~~~go
speed := 0.0
for {
	speed += 0.5
	if speed >= 1.5 {
		break
	}
}
~~~

\`break\` leaves the loop completely. \`continue\` skips the rest of this pass and jumps to the next one. A loop whose condition can never become false is the classic way to hang a program, so whenever you write \`for {\`, point at the \`break\`.

### 4. \`range\`: walk over something

\`range\` hands you each element of a collection. For a **string** it gives you the position and the character:

~~~go
for pos, r := range "PK-1001" {
	fmt.Println(pos, r)   // 0 80, 1 75, 2 45 ...
}
~~~

The \`r\` is a **rune**: Go's word for one Unicode character, stored as a number (80 is the code of \`P\`). Characters written in single quotes are runes too, which is why a digit test looks like \`r >= '0' && r <= '9'\`. Comparing a rune with a double-quoted string fails: \`invalid operation: r >= "0" (mismatched types rune and untyped string)\`.

Why does \`range\` hand out runes and not bytes? Because strings in Go are UTF-8: a letter like \`é\` takes two bytes. Ranging over \`"héy"\` gives positions \`0, 1, 3\` (the \`é\` occupies bytes 1 and 2), while \`len("héy")\` is 4 bytes but only 3 runes. The position is a *byte* position. You will rarely care about this with parcel codes, but it explains a lot of puzzling output later.

Since Go 1.22 you can also range over a **whole number**, which is the tidy way to do something N times, and over a typed constant:

~~~go
for range 3 {
	fmt.Println("beep")
}
for r := range regionCount {   // r is a Region: 0, 1, 2, 3
	fmt.Println("checking chute", r)
}
~~~

If you do not need one of the values, name it \`_\`. An unused index is a compile error: \`declared and not used: i\`.

### Reading until the input ends

The loop you will use most in this course reads standard input line by line. \`scanner.Scan()\` returns \`true\` when it managed to read another line and \`false\` when the input is over, so it is its own loop condition:

~~~go
for scanner.Scan() {
	line := strings.TrimSpace(scanner.Text())
	if line == "" {
		continue          // a blank line on the belt: skip it
	}
	// ...use line...
}
~~~

\`scanner.Scan()\` also returns \`false\` if something went wrong while reading, so careful programs ask \`scanner.Err()\` after the loop. It continues from where lesson 4 stopped: that lesson read the first four lines, so this loop sees the manifest that follows.

### Small details worth knowing

- **\`strings.Fields(line)\`** splits a line on any run of spaces and gives back a list of the words. That list is a *slice*, and you pick words with \`fields[0]\`, \`fields[1]\`... Lesson 7 is all about slices; for now treat it as "numbered words". \`len(fields)\` tells you how many there are.
- **Building a string with \`+=\`** is fine for a few hundred lines. (For huge outputs Go has \`strings.Builder\`.)
- **A \`:=\` inside a loop body declares new variables for that pass.** In the manifest loop, \`weight, err := strconv.Atoi(...)\` creates an *inner* \`err\` that hides the outer one from lesson 4. That is legal and usually exactly what you want, but it is called **shadowing**, and it is worth knowing it is happening.
- **Each pass gets its own copy of the loop variable** (Go 1.22 and later). A closure created in the loop sees that pass's value, not whatever the variable ended on.

### Common mistakes

- An off-by-one in the condition: \`i <= 3\` runs four times starting from 0.
- Forgetting to change the variable the condition tests, so the loop never ends.
- Comparing a rune to a string (\`'0'\` is a rune, \`"0"\` is a string).
- Leaving an unused loop variable (\`for i, r := range s\` when you only use \`r\`).
- Forgetting \`continue\` for blank lines, so they get counted as bad rows.`,
      mission: md`The belt is silent because nobody has started it. Start it with a countdown, ramp the belt up to full speed, and let it swallow the whole manifest that is waiting on standard input: thirteen rows, a blank line, and a couple of rows that nobody can read.

You will count what arrived, add up the weights and keep a copy of every row for the next lesson. When this lesson passes the **Intake belt** starts running on the floor, with the crates it carries.`,
      tasks: [
        'Count down with a three-part for loop, printing Belt starts in 3, Belt starts in 2, Belt starts in 1, and then print Belt running',
        "Ramp up: declare rampSteps := 0 and speed := 0.0, then an infinite for loop that adds 0.5 to speed and 1 to rampSteps and breaks once speed >= beltSpeed",
        "Count the digits in parcelID with for _, r := range parcelID (digits := 0), and print checking chute N for every region with for r := range regionCount (the numbers 0 to 3)",
        "Read the rest of stdin with for scanner.Scan(): trim each line, skip blank ones with continue, count processed++, add the line plus a newline to a manifest string, and split it with strings.Fields. Rows that do not have exactly three fields, or whose last field is not a whole number, add to unreadable and continue. Otherwise add the weight to totalGrams and keep the largest in heaviest",
        "Print processed 13 lines, 2 unreadable, 70060 g in total with Printf, then send processed, unreadable, totalGrams, heaviest, digits and rampSteps with scene(...)",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 6: start the belt and read the manifest. scanner, parcelID, beltSpeed and processed already exist above.
// 1. for i := 3; i >= 1; i-- { ... }  prints  Belt starts in 3 / 2 / 1   then   Belt running
// 2. rampSteps := 0; speed := 0.0; for { speed += 0.5; rampSteps++; if speed >= beltSpeed { break } }
// 3. digits := 0; for _, r := range parcelID { if r >= '0' && r <= '9' { digits++ } }
//    for r := range regionCount { fmt.Println("checking chute", r) }
// 4. manifest := ""; totalGrams := 0; heaviest := 0; unreadable := 0
//    for scanner.Scan() { ... TrimSpace, skip blanks with continue, processed++, manifest += line + "\n",
//    strings.Fields, len(fields) != 3 -> unreadable++, strconv.Atoi on fields[2], totalGrams, heaviest }
// 5. Printf:  processed 13 lines, 2 unreadable, 70060 g in total
//    scene(...) for processed, unreadable, totalGrams, heaviest, digits, rampSteps
`,
      solutionAdd: go`// Lesson 6: start the belt and read the manifest.
for i := 3; i >= 1; i-- {
	fmt.Println("Belt starts in", i)
}
fmt.Println("Belt running")

rampSteps := 0
speed := 0.0
for {
	speed += 0.5
	rampSteps++
	if speed >= beltSpeed {
		break
	}
}

digits := 0
for _, r := range parcelID {
	if r >= '0' && r <= '9' {
		digits++
	}
}
for r := range regionCount {
	fmt.Println("checking chute", r)
}

manifest := ""
totalGrams := 0
heaviest := 0
unreadable := 0
for scanner.Scan() {
	line := strings.TrimSpace(scanner.Text())
	if line == "" {
		continue
	}
	processed++
	manifest += line + "\n"
	fields := strings.Fields(line)
	if len(fields) != 3 {
		unreadable++
		continue
	}
	weight, err := strconv.Atoi(fields[2])
	if err != nil {
		unreadable++
		continue
	}
	totalGrams += weight
	if weight > heaviest {
		heaviest = weight
	}
}

fmt.Printf("processed %d lines, %d unreadable, %d g in total\n", processed, unreadable, totalGrams)
scene("processed", processed)
scene("unreadable", unreadable)
scene("totalGrams", totalGrams)
scene("heaviest", heaviest)
scene("digits", digits)
scene("rampSteps", rampSteps)`,
      explanation:
        "The three-part loop counts down from 3; the infinite for loop ramps the speed by 0.5 per step (0.5, 1.0, 1.5) and breaks on the third, so rampSteps is 3. Ranging over \"PK-1001\" yields runes, and comparing them with the rune literals '0' and '9' finds four digits. The condition-only loop for scanner.Scan() runs once per remaining line: blank lines are skipped with continue, 13 lines are processed, PK-2008 (the weight abc) and PK-2013 (only two fields) are unreadable, and the other 11 weights add up to 70060 g with 31000 g the heaviest. The manifest string keeps every non-blank line for the next lesson.",
      hints: [
        { id: "h1", title: "Which loop is which", content: "Countdown: for i := 3; i >= 1; i-- { }. Ramp-up: a bare for { } with a break inside an if. Digits: for _, r := range parcelID. Manifest: for scanner.Scan() { }, the same shape as a while loop. Declare manifest, totalGrams, heaviest and unreadable BEFORE the loop so they are still there after it." },
        { id: "h2", title: "Inside the manifest loop", content: "line := strings.TrimSpace(scanner.Text()); if line == \"\" { continue }; processed++; manifest += line + \"\\n\"; fields := strings.Fields(line); if len(fields) != 3 { unreadable++; continue }. Then weight, err := strconv.Atoi(fields[2]) and check err != nil the same way." },
        { id: "h3", title: "Totals and printing", content: "After a good weight: totalGrams += weight, and if weight > heaviest { heaviest = weight }. After the loop: fmt.Printf(\"processed %d lines, %d unreadable, %d g in total\\n\", processed, unreadable, totalGrams) and one scene(...) call per value. Digits: if r >= '0' && r <= '9' { digits++ } (single quotes, because r is a rune)." },
      ],
      tests: [
        {
          id: "t1",
          description: "the countdown and the start message are printed in order",
          assertionCode: js`
const want = ["Belt starts in 3", "Belt starts in 2", "Belt starts in 1", "Belt running"];
const at = want.map((w) => lines.indexOf(w));
assert(at.every((i) => i >= 0), 'Print Belt starts in 3, Belt starts in 2, Belt starts in 1 and then Belt running, each on its own line (for i := 3; i >= 1; i-- { fmt.Println("Belt starts in", i) }).');
assert(at.every((v, i) => i === 0 || v > at[i - 1]), "The countdown lines are there but in the wrong order. Count down from 3 to 1.");`,
        },
        {
          id: "t2",
          description: "the ramp-up loop stops at belt speed and the digits are counted",
          assertionCode: js`
assertEqual(scene.rampSteps, 3, "rampSteps (speed grows 0.5, 1.0, 1.5 and the loop breaks when speed >= beltSpeed, so 3 steps)");
assertEqual(scene.digits, 4, "digits (PK-1001 contains the digits 1, 0, 0, 1: test each rune with r >= '0' && r <= '9')");
for (let i = 0; i < 4; i++) assert(lines.includes("checking chute " + i), "Print checking chute " + i + " for every region with for r := range regionCount.");`,
        },
        {
          id: "t3",
          description: "the whole manifest was read",
          assertionCode: js`
assertEqual(scene.processed, 13, "processed (13 non-blank lines are on the manifest. Did you skip blank lines with continue, and keep reading until scanner.Scan() is false?)");
assertEqual(scene.unreadable, 2, "unreadable (PK-2008 has a weight that is not a number and PK-2013 has only two fields)");`,
        },
        {
          id: "t4",
          description: "the weights add up and the heaviest is found",
          assertionCode: js`
assertEqual(scene.totalGrams, 70060, "totalGrams (add the weight of every readable row)");
assertEqual(scene.heaviest, 31000, "heaviest (the largest weight seen so far, updated inside the loop)");`,
        },
        {
          id: "t5",
          description: "the summary line is printed",
          assertionCode: js`assert(lines.includes("processed 13 lines, 2 unreadable, 70060 g in total"), 'No line is exactly "processed 13 lines, 2 unreadable, 70060 g in total". Print it with Printf after the loop, using the processed, unreadable and totalGrams variables.');`,
        },
      ],
      unlocks: ["go-belt"],
      checks: [
        {
          prompt: 'What does this print?\n\n~~~go\nfor i, r := range "héy" {\n\tfmt.Print(i, " ")\n}\n~~~\n\n(the letter `é` takes two bytes in UTF-8)',
          question: { type: "choice", options: ["0 1 2", "0 1 3", "0 2 3", "1 2 3"], answer: 1 },
          explanation: "When you range over a string, the first value is the **byte** position where each character starts. `h` is at 0, `é` at 1 (it uses bytes 1 and 2), and `y` at 3. The second value, the rune, is the whole character.",
        },
        {
          prompt: "Go has no `while` keyword. How do you write \"keep going while `count > 0`\"?",
          question: { type: "choice", options: ["`while count > 0 { ... }`", "`for count > 0 { ... }`", "`loop count > 0 { ... }`", "`for ; count > 0 { ... }` is the only way"], answer: 1 },
          explanation: "A `for` with only a condition is Go's while loop. (The semicolon form `for ; count > 0; {` also compiles, but nobody writes it.)",
        },
        {
          prompt: "Inside the manifest loop you write `weight, err := strconv.Atoi(fields[2])`, although `err` already exists from lesson 4. What happens?",
          question: {
            type: "choice",
            options: [
              "Compile error: err is declared twice",
              "The loop body gets its own new err that hides the outer one (shadowing)",
              "The outer err is overwritten with the new error",
              "It only compiles if you write = instead of :=",
            ],
            answer: 1,
          },
          explanation: "`:=` declares new variables in the current scope. The loop body is a new scope, so both `weight` and `err` are brand new there, and the outer `err` is untouched. Shadowing is legal; it just means the name refers to something else inside the braces.",
        },
      ],
    },

    // ───────────────────────── 7 ─────────────────────────
    {
      id: "go-basics-7-slices",
      title: "Arrays and slices",
      minutes: 35,
      xp: 130,
      concepts: ["arrays", "slices", "append", "len / cap", "slicing", "shared memory", "copy", "make", "strings.Split"],
      learn: md`### Arrays: a fixed row of boxes

An **array** holds a fixed number of values of one type, and the number is part of the type:

~~~go
var gates [4]string                          // four empty strings
labels := [4]string{"A", "B", "C", "D"}      // or write the values
fmt.Println(labels[0], len(labels))          // A 4
~~~

\`[4]string\` and \`[5]string\` are different types, so you cannot assign one to the other (\`cannot use [3]int{…} (value of type [3]int) as [4]int value in variable declaration\`). Indexes start at 0, and a constant index outside the array is caught while compiling: \`invalid argument: index 3 out of bounds [0:3]\`. The length can be any constant, including a typed one like lesson 2's \`regionCount\`, which is what keeps the labels array and the region list in step.

The surprise is that an array is a **value**. Assigning it copies every element:

~~~go
backup := labels
backup[0] = "Z"
fmt.Println(labels[0], backup[0])   // A Z
~~~

Fixed-size arrays are handy for small tables, but most of the time you want a list that can grow. That is a slice.

### Slices: a window onto an array

A **slice** has no size in its type: \`[]int\` is "a list of ints". Under the hood it is a tiny three-part value: a **pointer** to an array of elements, a **length** (\`len\`, how many elements you can see) and a **capacity** (\`cap\`, how many fit in the array before it runs out of room).

~~~go
var ids []string            // nil slice: length 0, nothing allocated yet
weights := []int{300, 800}  // literal
scratch := make([]int, 5)   // length 5, five zeros
~~~

A nil slice is perfectly usable: \`len(ids)\` is 0, you can \`range\` over it and you can append to it. Most Go code starts with \`var ids []string\` and never worries.

### append

~~~go
ids = append(ids, "PK-2001")
ids = append(ids, "PK-2002", "PK-2003")
~~~

\`append\` **returns** the slice, and you must keep the result. If there is spare capacity it writes into the existing array. If the array is full it allocates a bigger one, copies everything across and returns a slice that points at the new array. Throwing the result away is such a common slip that the compiler complains: \`append(s, 4) (value of type []int) is not used\`.

Watching \`cap\` while you append shows the growth: starting from nothing, the capacity of an int slice goes 1, 2, 4, 8, 16. Doubling keeps appending cheap on average. The exact numbers are an implementation detail that Go is free to change, so never write code that depends on them. Treat \`cap\` as a diagnostic.

### Slicing: s[a:b]

\`s[a:b]\` makes a new slice from position \`a\` up to, but not including, \`b\`. \`s[:3]\` is the first three, \`s[3:]\` is everything from the fourth on.

~~~go
weights := []int{2400, 800, 4100, 19500, 650}
first := weights[:3]       // [2400 800 4100]
fmt.Println(len(first), cap(first))   // 3 5
~~~

Look at that capacity. The new slice does not copy anything: it is another window onto **the same array**. Its capacity runs to the end of the array.

### The gotcha: slices share memory

~~~go
view := weights[:3]
view = append(view, -1)   // len 3, cap 5: there is room, so no new array...
fmt.Println(weights)      // [2400 800 4100 -1 650]  <- the original changed!
~~~

Because \`view\` still had spare capacity, \`append\` wrote straight into the shared array and overwrote \`weights[3]\`. Nothing was copied, nothing warned you. Two ways to be safe:

1. **Make a real copy** when you want independence: \`own := make([]int, len(weights)); copy(own, weights)\`. \`copy(dst, src)\` copies as many elements as fit and returns the count.
2. **Cap the window** with a full slice expression \`weights[:3:3]\`. The third number sets the capacity, so the next append has no room and must allocate a fresh array.

The rule of thumb: a slice you got by slicing is a *view*. If you might append to it or change it and the original matters, copy first.

### Looping over a slice

~~~go
for i, w := range weights {
	fmt.Println(i, w)
}
~~~

\`range\` gives the position and a **copy** of each element. Use \`_\` for the one you do not need.

### Splitting a string into a slice

\`strings.Split(text, "\n")\` cuts a string at every separator and returns the pieces as a \`[]string\`. Wrap the text in \`strings.TrimSpace\` first, or the trailing newline leaves an empty piece at the end. This is how the manifest string from lesson 6 becomes a list of rows you can walk over again and again.

### When it goes wrong

Indexing past the end is a **runtime panic**, and the program stops with a message and a line number:

~~~text
panic: runtime error: index out of range [5] with length 3
panic: runtime error: slice bounds out of range [:5] with capacity 3
~~~

Check \`len\` before you index if the data comes from outside.

### Common mistakes

- Calling \`append(s, x)\` and forgetting to assign the result.
- Assuming \`b := a\` copies a slice. It copies the window, not the elements.
- Looping \`for i := 0; i <= len(s); i++\`. The last valid index is \`len(s)-1\`.
- Expecting two slices to compare with \`==\`. They cannot be compared (\`slice can only be compared to nil\`); compare element by element.
- Using the array length as a loop bound after growing the list. Use \`len\`.`,
      mission: md`Lesson 6 left you with a string: the whole manifest, one row per line. A string cannot be sorted into chutes, but a **list** can. Split it into rows, then pull the ids and the weights out into two slices that line up: parcel 3's id and parcel 3's weight sit at the same position.

You will also meet the two ways slices bite: growing capacity, and a window that secretly shares memory. When the lesson passes, the **Parcel queue** lights up: the crates on the belt carry their ids and their sizes come from your weights.`,
      tasks: [
        "Above the divider, declare the package-level array var chuteLabels = [regionCount]string{\"A\", \"B\", \"C\", \"D\"}. In main, make rows with strings.Split(strings.TrimSpace(manifest), \"\\n\")",
        "Walk the rows with range. Skip a row unless it has three fields and a whole-number weight. For each good row append its id (fields[0]) to ids []string and its weight to weights []int, and append cap(weights) to capSteps (start it as []int{})",
        'Copy the array with backup := chuteLabels and set backup[0] = "Z". The original must still say "A"',
        "Show the shared-memory trap on a copy: original := make([]int, len(weights)) then copy(original, weights); head := original[:3]; head = append(head, -1); leaked := original[3]. Then put the weight back (original[3] = weights[3]), cap the window with fixedHead := original[:3:3], append -2 to it, and read untouched := original[3]",
        "Print one summary line with Println: len(rows), len(ids), len(weights), cap(weights), backup[0], chuteLabels[0], leaked, untouched, len(head), cap(head), len(fixedHead), cap(fixedHead). Send rows (as len(rows)), queue (the ids), weights, capSteps, chuteLabels, backupFirst (backup[0]), leaked and untouched with scene(...)",
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// The chute labels live at package level so that later lessons can use them too.
// Declare:  var chuteLabels = [regionCount]string{"A", "B", "C", "D"}

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 7: turn the manifest string into slices. manifest comes from lesson 6.
// 1. rows := strings.Split(strings.TrimSpace(manifest), "\n")
// 2. var ids []string; var weights []int; capSteps := []int{}
//    for _, row := range rows { Fields; need 3 fields and a number in fields[2];
//    ids = append(ids, fields[0]); weights = append(weights, w); capSteps = append(capSteps, cap(weights)) }
// 3. backup := chuteLabels; backup[0] = "Z"
// 4. original := make([]int, len(weights)); copy(original, weights)
//    head := original[:3]; head = append(head, -1); leaked := original[3]      // -1: the original changed!
//    original[3] = weights[3]
//    fixedHead := original[:3:3]; fixedHead = append(fixedHead, -2); untouched := original[3]   // 19500
// 5. fmt.Println(len(rows), len(ids), len(weights), cap(weights), backup[0], chuteLabels[0], leaked, untouched,
//                len(head), cap(head), len(fixedHead), cap(fixedHead))
//    scene: rows (len(rows)), queue (ids), weights, capSteps, chuteLabels, backupFirst (backup[0]), leaked, untouched
`,
      solutionAdd: go`// The chute labels: an array whose length comes from the region constant.
var chuteLabels = [regionCount]string{"A", "B", "C", "D"}

${MAIN_DIVIDER}

// Lesson 7: turn the manifest string into slices.
rows := strings.Split(strings.TrimSpace(manifest), "\n")
var ids []string
var weights []int
capSteps := []int{}
for _, row := range rows {
	fields := strings.Fields(row)
	if len(fields) != 3 {
		continue
	}
	w, err := strconv.Atoi(fields[2])
	if err != nil {
		continue
	}
	ids = append(ids, fields[0])
	weights = append(weights, w)
	capSteps = append(capSteps, cap(weights))
}

// arrays are copied by value
backup := chuteLabels
backup[0] = "Z"

// slices share memory
original := make([]int, len(weights))
copy(original, weights)
head := original[:3]
head = append(head, -1)
leaked := original[3]
original[3] = weights[3]
fixedHead := original[:3:3]
fixedHead = append(fixedHead, -2)
untouched := original[3]

fmt.Println(len(rows), len(ids), len(weights), cap(weights), backup[0], chuteLabels[0], leaked, untouched, len(head), cap(head), len(fixedHead), cap(fixedHead))
scene("rows", len(rows))
scene("queue", ids)
scene("weights", weights)
scene("capSteps", capSteps)
scene("chuteLabels", chuteLabels)
scene("backupFirst", backup[0])
scene("leaked", leaked)
scene("untouched", untouched)`,
      explanation:
        "strings.Split turns the manifest into 13 rows. Appending only the readable rows leaves 11 ids and 11 weights that line up index by index, and recording cap(weights) after each append shows the array growing by doubling. backup := chuteLabels copies the whole array, so changing backup[0] leaves the original at A. head := original[:3] is a window onto the same array with spare capacity, so append(head, -1) writes into original[3] and leaks -1 into the original. Capping the window with original[:3:3] leaves no spare capacity, so append must allocate a new array and the original stays at 19500.",
      hints: [
        { id: "h1", title: "Rows and the two slices", content: "rows := strings.Split(strings.TrimSpace(manifest), \"\\n\"). Declare var ids []string and var weights []int before the loop, and capSteps := []int{}. Inside for _, row := range rows, split with strings.Fields, skip bad rows with continue, then append to all three slices. The package-level array goes ABOVE the divider line, not inside main." },
        { id: "h2", title: "Copy versus window", content: "backup := chuteLabels copies an array. For the slice demo, original := make([]int, len(weights)) followed by copy(original, weights) gives you an independent slice. head := original[:3] is only a window, so after head = append(head, -1) the value original[3] has changed." },
        { id: "h3", title: "The fix and the output", content: "Put the weight back with original[3] = weights[3], then fixedHead := original[:3:3]; fixedHead = append(fixedHead, -2); untouched := original[3] stays 19500. Finish with the long fmt.Println(...) line and a scene(...) call for each value. The scene key for len(rows) is rows and for the ids slice it is queue." },
      ],
      tests: [
        {
          id: "t1",
          description: "the manifest becomes 13 rows and the readable ones become two parallel slices",
          assertionCode: js`
assertEqual(scene.rows, 13, "rows (the manifest has 13 non-blank lines. Send len(rows))");
assertEqual(scene.queue, ["PK-2001", "PK-2002", "PK-2003", "PK-2004", "PK-2005", "PK-2006", "PK-2007", "PK-2009", "PK-2010", "PK-2011", "PK-2012"], "queue (the ids of the 11 readable rows, in order. PK-2008 and PK-2013 are skipped)");
assertEqual(scene.weights, [2400, 800, 4100, 19500, 650, 300, 31000, 1250, 7300, 560, 2200], "weights (the weight of each readable row, in the same order as the ids)");`,
        },
        {
          id: "t2",
          description: "capSteps records the capacity after every append",
          assertionCode: js`
const caps = scene.capSteps;
assert(Array.isArray(caps) && caps.length === 11, "capSteps should have one entry per appended weight (11). Append cap(weights) right after each append(weights, ...).");
assert(caps[0] === 1, "After the first append the capacity of weights is 1.");
assert(caps.every((c, i) => c >= i + 1 && (i === 0 || c >= caps[i - 1])), "A slice's capacity can never be smaller than its length and never shrinks while appending.");
assert(new Set(caps).size < caps.length, "The capacity should stay the same for several appends in a row (the array grows by doubling, not on every append).");`,
        },
        {
          id: "t3",
          description: "an array is copied by value",
          assertionCode: js`
assertEqual(scene.chuteLabels, ["A", "B", "C", "D"], "chuteLabels (declare var chuteLabels = [regionCount]string{\"A\", \"B\", \"C\", \"D\"} above the divider and send it)");
assertEqual(scene.backupFirst, "Z", "backupFirst (backup := chuteLabels copies the array; set backup[0] = \"Z\" and send backup[0])");`,
        },
        {
          id: "t4",
          description: "appending through a window overwrites the original; a capped window does not",
          assertionCode: js`
assertEqual(scene.leaked, -1, "leaked (head := original[:3] shares memory with original, so append(head, -1) writes into original[3]. Read original[3] right after that append)");
assertEqual(scene.untouched, 19500, "untouched (restore original[3] = weights[3] first, then use original[:3:3], whose capacity is 3, so append has to allocate a new array)");`,
        },
        {
          id: "t5",
          description: "the summary line shows lengths, capacities and the demo results",
          assertionCode: js`assert(lines.some((l) => /^13 11 11 \d+ Z A -1 19500 4 \d+ 4 \d+$/.test(l)), "Print one line with fmt.Println(len(rows), len(ids), len(weights), cap(weights), backup[0], chuteLabels[0], leaked, untouched, len(head), cap(head), len(fixedHead), cap(fixedHead)). Its start should read: 13 11 11 <cap> Z A -1 19500 ...");`,
        },
      ],
      unlocks: ["go-queue"],
      checks: [
        {
          prompt: "What does this print?\n\n~~~go\na := [3]int{1, 2, 3}\nb := a\nb[0] = 9\nfmt.Println(a[0])\n~~~",
          question: { type: "choice", options: ["1", "9", "0", "It does not compile"], answer: 0 },
          explanation: "An array is a value, so `b := a` copies all three elements. Changing `b` leaves `a` alone. With a slice instead of an array, both names would point at the same elements and the answer would be 9.",
        },
        {
          prompt: "What does this print?\n\n~~~go\ns := []int{1, 2, 3}\nt := s[:2]\nt = append(t, 99)\nfmt.Println(s)\n~~~",
          question: { type: "choice", options: ["[1 2 3]", "[1 2 99]", "[1 2 3 99]", "It panics"], answer: 1 },
          explanation: "`t` is a window onto the same array as `s` with capacity 3, so there is room for the append and it overwrites the third element of the shared array. This is exactly the trap from the lesson. `s[:2:2]` or a `copy` would avoid it.",
        },
        {
          prompt: "Why must you write `s = append(s, x)` and not just `append(s, x)`?",
          question: {
            type: "choice",
            options: [
              "append may need a bigger array, and the new slice header is returned, not changed in place",
              "append is only a hint to the compiler",
              "Go slices are immutable",
              "Without the assignment the program is slower, but still correct",
            ],
            answer: 0,
          },
          explanation: "A slice is a small header (pointer, length, capacity). `append` cannot change *your* header; it hands back a new one with the larger length, possibly pointing at a freshly allocated array. If you drop the result the compiler stops you with `append(s, x) (value of type []int) is not used`.",
        },
      ],
    },

    // ───────────────────────── 8 ─────────────────────────
    {
      id: "go-basics-8-maps",
      title: "Maps: lookup tables",
      minutes: 30,
      xp: 120,
      concepts: ["map", "comma-ok", "delete", "zero value on a missing key", "random iteration order", "sorting keys", "counting"],
      learn: md`### A map is a lookup table

A slice is found by *position*. A **map** is found by *name*: you give it a key and it gives you the value stored under that key. In Go the type is written \`map[KeyType]ValueType\`.

~~~go
weightOf := map[string]int{
	"PK-2001": 2400,
	"PK-2002": 800,
}
fmt.Println(weightOf["PK-2001"])   // 2400
weightOf["PK-2003"] = 4100         // add (or replace) an entry
fmt.Println(len(weightOf))         // 3
~~~

To start an empty map use a literal with nothing in it (\`map[string]int{}\`) or \`make(map[string]int)\`. Both are ready to use. Lookups and inserts take about the same time however many entries there are, which is why maps are the tool for counting, grouping and routing.

### A missing key is not an error

Asking for a key that is not there returns the **zero value** of the value type: \`0\` for ints, \`""\` for strings, \`false\` for bools.

~~~go
fmt.Println(weightOf["PK-9999"])   // 0
~~~

That is convenient, and it hides a trap: is there a parcel of weight 0, or no parcel? The **comma-ok** form answers it. A lookup can return two values, the value and a bool that says whether the key was present:

~~~go
w, ok := weightOf["PK-9999"]
if !ok {
	fmt.Println("no such parcel")
}
~~~

When you only care about presence, discard the value: \`if _, ok := regionOf[name]; !ok { ... }\`. Combine it with the init statement from lesson 5 and the \`ok\` stays tidily inside the \`if\`.

### Counting with a map

Because a missing key reads as 0, counting needs no setup:

~~~go
tally := map[string]int{}
tally["north"]++     // first time: 0 + 1
tally["north"]++     // 2
~~~

\`tally[name] += w\` adds up weights the same way. This one idiom replaces a surprising amount of code in real programs.

### delete

~~~go
delete(tally, "moon")
~~~

removes the entry. Deleting a key that does not exist is not an error, it just does nothing. It is also safe to delete while you \`range\` over a map.

### Iteration order is random on purpose

~~~go
for name, n := range tally {
	fmt.Println(name, n)
}
~~~

visits every entry exactly once, but **in an order Go deliberately scrambles**, and the order changes from run to run. The Go team did that because programs kept accidentally depending on the order they happened to observe; randomising it makes the bug show up immediately. So if you need a stable order, build it yourself: collect the keys into a slice, sort it, and loop over the slice.

~~~go
keys := make([]string, 0, len(tally))   // length 0, room for len(tally)
for name := range tally {
	keys = append(keys, name)
}
sort.Strings(keys)
for _, name := range keys {
	fmt.Println(name, tally[name])
}
~~~

A pleasant surprise: \`fmt.Println(tally)\` prints a map **sorted by key** (\`map[east:3 north:3 south:2 west:2]\`) because the \`fmt\` package sorts for display. Only \`range\` is random.

### Package-level lookup tables

A table that every part of the program needs, like "which region does this word mean", belongs at the top of the file rather than inside \`main\`. At package level you cannot use \`:=\`, so you write \`var\`:

~~~go
var regionOf = map[string]Region{
	"north": North,
	"south": South,
}
~~~

It reuses the \`Region\` type and the iota constants from lesson 2. Unused package-level variables are never an error, only unused *local* ones are.

### What can be a key

Any type that supports \`==\`: numbers, strings, bools, arrays, structs of those. A slice cannot be a key (\`invalid map key type []int\`) because slices cannot be compared.

### Maps are references

Assigning a map copies a small handle, not the data: after \`other := tally\`, both names refer to the same entries and a change through one shows up in the other. Slices behave this way when they share an array, and maps always do.

### A nil map can be read but not written

~~~go
var m map[string]int   // nil: no map exists yet
fmt.Println(m["x"])    // 0, reading is fine
m["x"] = 1             // panic: assignment to entry in nil map
~~~

Always create the map with a literal or \`make\` before you store into it.

### Common mistakes

- Treating a zero from a missing key as real data. Use comma-ok when it matters.
- Relying on the order of a \`range\` over a map.
- Writing into a nil map.
- Using the wrong key spelling or case (\`"North"\` is not \`"north"\`). Normalise with \`strings.ToLower\` before you look up.
- Forgetting that a map you passed around is shared.`,
      mission: md`The floor has four chutes and the manifest names regions in free text: some right, some in odd capitals, and one that does not exist at all (a parcel for the moon). You need a **lookup table** that turns a region word into a real chute, and a **tally** that counts how many parcels and how many grams are headed to each one.

Unknown regions must not be silently counted as a chute. Set them aside, then print the tally in a stable order. When the lesson passes, the **Chute tally** lights up: each chute shows its parcel count.`,
      tasks: [
        'Above the divider, declare the package-level lookup var regionOf = map[string]Region{"north": North, "south": South, "east": East, "west": West}',
        "Create three empty maps: tally (string to int), gramsBy (string to int) and unknown (string to int). Range over rows; skip a row unless it has three fields and a whole-number weight. Lower-case the region (strings.ToLower(fields[1])) as name and do tally[name]++",
        "Check name with the comma-ok form against regionOf. If it is missing, do unknown[name]++ and continue; otherwise add the weight with gramsBy[name] += w. After the loop, delete every name in unknown from tally",
        "Collect the keys of tally into keys, sort them with sort.Strings and print one line per region as in east   3 parcels, 37300 g using Printf(\"%-6s %d parcels, %d g\\n\", ...)",
        'Read a key that is not there: missing := tally["atlantis"] and _, known := tally["atlantis"]. Print fmt.Println(tally, missing, known). Send tally, gramsBy, unknown, sortedNames (the sorted keys), missing and known with scene(...)',
      ],
      starterAdd: go`// ─── ✏️ YOUR TURN: new declarations ───
// A lookup table that the whole program can use belongs at package level.
// Declare:  var regionOf = map[string]Region{"north": North, "south": South, "east": East, "west": West}

${MAIN_DIVIDER}

// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 8: tally the manifest by region. rows comes from lesson 7.
// 1. tally := map[string]int{}   gramsBy := map[string]int{}   unknown := map[string]int{}
// 2. for _, row := range rows { skip unless 3 fields and a number; name := strings.ToLower(fields[1]); tally[name]++
//    if _, ok := regionOf[name]; !ok { unknown[name]++; continue }   gramsBy[name] += w }
// 3. for name := range unknown { delete(tally, name) }
// 4. keys := make([]string, 0, len(tally)); fill it by ranging over tally; sort.Strings(keys)
//    for _, name := range keys { fmt.Printf("%-6s %d parcels, %d g\n", name, tally[name], gramsBy[name]) }
// 5. missing := tally["atlantis"]; _, known := tally["atlantis"]; fmt.Println(tally, missing, known)
//    scene: tally, gramsBy, unknown, sortedNames (keys), missing, known
`,
      solutionAdd: go`// The lookup table: which Region does a word mean?
var regionOf = map[string]Region{
	"north": North,
	"south": South,
	"east":  East,
	"west":  West,
}

${MAIN_DIVIDER}

// Lesson 8: tally the manifest by region.
tally := map[string]int{}
gramsBy := map[string]int{}
unknown := map[string]int{}
for _, row := range rows {
	fields := strings.Fields(row)
	if len(fields) != 3 {
		continue
	}
	w, err := strconv.Atoi(fields[2])
	if err != nil {
		continue
	}
	name := strings.ToLower(fields[1])
	tally[name]++
	if _, ok := regionOf[name]; !ok {
		unknown[name]++
		continue
	}
	gramsBy[name] += w
}
for name := range unknown {
	delete(tally, name)
}

keys := make([]string, 0, len(tally))
for name := range tally {
	keys = append(keys, name)
}
sort.Strings(keys)
for _, name := range keys {
	fmt.Printf("%-6s %d parcels, %d g\n", name, tally[name], gramsBy[name])
}

missing := tally["atlantis"]
_, known := tally["atlantis"]
fmt.Println(tally, missing, known)
scene("tally", tally)
scene("gramsBy", gramsBy)
scene("unknown", unknown)
scene("sortedNames", keys)
scene("missing", missing)
scene("known", known)`,
      explanation:
        "tally[name]++ works on a brand-new key because a missing key reads as 0. The comma-ok lookup in regionOf tells a real region from an unknown one: moon goes into unknown and is skipped, and since it was counted in tally first, a delete removes it afterwards. Ranging over a map is random, so the keys are copied into a slice and sorted to print east, north, south, west in a stable order. Reading tally[\"atlantis\"] yields 0, and only the comma-ok form tells you that the key is not present (known is false).",
      hints: [
        { id: "h1", title: "Three maps, one lookup table", content: "regionOf goes above the divider as a package-level var with a map literal. Inside main: tally := map[string]int{}, and the same for gramsBy and unknown. In the loop, name := strings.ToLower(fields[1]) and tally[name]++ come first." },
        { id: "h2", title: "Comma-ok and delete", content: "if _, ok := regionOf[name]; !ok { unknown[name]++; continue } and then gramsBy[name] += w. After the loop: for name := range unknown { delete(tally, name) } removes the moon. Check the region before you add to gramsBy so that the moon has no grams." },
        { id: "h3", title: "Stable order", content: "keys := make([]string, 0, len(tally)); for name := range tally { keys = append(keys, name) }; sort.Strings(keys). Print with fmt.Printf(\"%-6s %d parcels, %d g\\n\", name, tally[name], gramsBy[name]). For the last part: missing := tally[\"atlantis\"] and _, known := tally[\"atlantis\"]." },
      ],
      tests: [
        {
          id: "t1",
          description: "parcels are counted per known region and the moon is removed",
          assertionCode: js`
assertEqual(scene.tally, { east: 3, north: 3, south: 2, west: 2 }, "tally (parcels per region name. The moon row must be removed with delete)");
assertEqual(scene.unknown, { moon: 1 }, "unknown (region names that are not in regionOf, with how often they appeared)");`,
        },
        {
          id: "t2",
          description: "grams are added up per known region",
          assertionCode: js`assertEqual(scene.gramsBy, { east: 37300, north: 10350, south: 1360, west: 20750 }, "gramsBy (add each weight to its region with gramsBy[name] += w, only for known regions)");`,
        },
        {
          id: "t3",
          description: "the keys are sorted before printing",
          assertionCode: js`
assertEqual(scene.sortedNames, ["east", "north", "south", "west"], "sortedNames (collect the keys of tally and sort them with sort.Strings)");
const want = ["east   3 parcels, 37300 g", "north  3 parcels, 10350 g", "south  2 parcels, 1360 g", "west   2 parcels, 20750 g"];
const at = want.map((w) => lines.indexOf(w));
assert(at.every((i) => i >= 0), 'Print one line per region with fmt.Printf("%-6s %d parcels, %d g\\n", name, tally[name], gramsBy[name]), for example: east   3 parcels, 37300 g');
assert(at.every((v, i) => i === 0 || v > at[i - 1]), "The region lines should come out in sorted order: east, north, south, west.");`,
        },
        {
          id: "t4",
          description: "a missing key reads as zero, and comma-ok tells the truth",
          assertionCode: js`
assertEqual(scene.missing, 0, 'missing (tally["atlantis"] is not there, so it reads as 0)');
assertEqual(scene.known, false, 'known (_, known := tally["atlantis"] is false because the key is absent)');`,
        },
        {
          id: "t5",
          description: "fmt prints the whole map in sorted key order",
          assertionCode: js`assert(lines.includes("map[east:3 north:3 south:2 west:2] 0 false"), 'No line is exactly "map[east:3 north:3 south:2 west:2] 0 false". Print it with fmt.Println(tally, missing, known).');`,
        },
      ],
      unlocks: ["go-chutes"],
      checks: [
        {
          prompt: 'What does this print?\n\n~~~go\nm := map[string]int{"a": 1}\nfmt.Println(m["b"])\n~~~',
          question: { type: "choice", options: ["0", "It panics: key not found", "<nil>", "It does not compile"], answer: 0 },
          explanation: "Reading a missing key never fails. You get the zero value of the value type, here `0`. To find out whether the key really exists, use the comma-ok form: `v, ok := m[\"b\"]`.",
        },
        {
          prompt: "Which statement about `for k, v := range m` over a map is true?",
          question: {
            type: "choice",
            options: [
              "It visits the keys in the order they were inserted",
              "It visits the keys in sorted order",
              "It visits every entry once, in an order that can differ from run to run",
              "It visits only the first 8 entries",
            ],
            answer: 2,
          },
          explanation: "Go randomises map iteration on purpose so that no program can quietly depend on an order. Collect the keys into a slice and `sort` it when you need a predictable order.",
        },
        {
          prompt: "What happens here?\n\n~~~go\nvar m map[string]int\nm[\"x\"] = 1\n~~~",
          question: { type: "choice", options: ["It compiles and runs; m now has one entry", "It does not compile", "It panics: assignment to entry in nil map", "It silently ignores the assignment"], answer: 2 },
          explanation: "`var m map[string]int` declares a nil map: reading from it works (you get zero values) but writing panics at run time. Create it first with `m = map[string]int{}` or `make(map[string]int)`.",
        },
      ],
    },
  ],
};
