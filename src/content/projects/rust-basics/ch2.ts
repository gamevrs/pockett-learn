import type { Chapter } from "@/engine/types";
import { js, md, rs } from "./util.ts";

/**
 * Chapter 2: Decisions and loops. Reading input, if and match, loops, and tuples and arrays.
 * Every lesson here only adds statements to the end of main's body.
 */

export const chapter2: Chapter = {
  id: "decisions-and-loops",
  title: "Decisions and loops",
  blurb: "Read input that might be wrong, decide with if and match, repeat with loops, and group values in tuples and arrays.",
  lessons: [
    // ───────────────────────── 4 ─────────────────────────
    {
      id: "rust-basics-4-input",
      title: "Input and Result",
      minutes: 35,
      xp: 110,
      concepts: ["stdin", "read_line", "String", "trim", "parse", "Result", "match", "expect", "turbofish"],
      learn: md`### Text arrives, and it can be wrong

A radio operator hands you a note with a name, a depth and a site written on it. You cannot assume the note is tidy: there may be stray spaces, and the depth might say "40m" instead of "40". A program that receives information from outside has the same problem. The information arrives as **text**, even when it looks like a number, and it may be damaged.

In this course the airlock intercom delivers four lines of text for you to read, one at a time:

~~~text
Mara Okoye
35
deep-ledge
40m
~~~

(Some of them come with extra spaces around them.) You do not type anything: the lines arrive on **standard input**, usually called **stdin**, which is simply "the place a program reads its incoming text from".

### Reading one line

~~~rust
let mut line = String::new();
std::io::stdin().read_line(&mut line).expect("could not read a line");
println!("You got: {}", line.trim());
~~~

With the first line above, this prints \`You got: Mara Okoye\`. Take it apart piece by piece:

- \`String::new()\` makes an **empty piece of text that can grow**. That kind of text is called a \`String\`. We call the box \`line\`, and it needs \`mut\` because reading will add text to it.
- \`std::io::stdin()\` is the way to reach standard input. \`.read_line(...)\` reads up to the next line break and **adds** it to the text you give it.
- \`&mut line\` means "lend my box \`line\` out so that it can be changed". The \`&mut\` is how you let another piece of code write into your variable. Without it, \`read_line\` would have nowhere to put what it read. (Lesson 10 explains borrowing in full.)
- \`read_line\` can fail, so it hands back a **result box**: a box that holds *either* the answer *or* an error. \`.expect("message")\` says: "if the box holds an error, stop the program and show this message; otherwise carry on". Use it only when failing means something is badly broken.
- \`line.trim()\` gives the text without the invisible spaces and line break at both ends. This matters because \`read_line\` keeps the line break, so \`"Mara Okoye\n"\` is not the same as \`"Mara Okoye"\`.

### Keeping a line, and the next one

Two gotchas:

1. \`trim()\` only *looks* at the text inside \`line\`. When you reuse \`line\` for the next read, that look disappears. To **keep** a copy, call \`.to_string()\`, which makes a separate piece of text that belongs to you.
2. \`read_line\` **adds** to what is already there. Read twice into the same \`line\` and you get both lines glued together. Call \`line.clear()\` first to empty it.

~~~rust
let mut line = String::new();
std::io::stdin().read_line(&mut line).expect("no name");
let diver = line.trim().to_string();      // a kept copy: "Mara Okoye"

line.clear();                             // empty the box again
std::io::stdin().read_line(&mut line).expect("no depth");
~~~

### Text is not a number

\`"35"\` is the two characters 3 and 5, not the number thirty-five. To convert, you use \`parse\`. And converting can **fail**: what number is in \`"40m"\`? So \`parse\` hands back another result box, with one of two things in it:

- \`Ok(number)\`: it worked, here is the number.
- \`Err(reason)\`: it failed, here is why.

You cannot use the box as a number until you have looked inside. The tool for looking inside is \`match\`.

### \`match\`, the first time

\`match\` opens the box and has **one branch for each thing that could be inside**. Each branch has a pattern on the left of \`=>\` and what to do on the right. The first pattern that fits runs.

~~~rust
let text = "35";
match text.parse::<i32>() {
    Ok(number) => println!("got {number}"),
    Err(problem) => println!("not a number: {problem}"),
}
~~~

~~~text
got 35
~~~

- \`text.parse::<i32>()\` means "try to turn \`text\` into an \`i32\` whole number". The \`::<i32>\` says which kind of number to build.
- \`Ok(number)\` fits when the box holds a success, and it also gives the name \`number\` to what is inside, for use on the right.
- \`Err(problem)\` fits when the box holds an error, and names the reason \`problem\`.

Change \`text\` to \`"40m"\` and the other branch runs:

~~~text
not a number: invalid digit found in string
~~~

The reason prints as a sentence when you use \`{}\`.

### A match that gives back a number

A \`match\` is a value, like an \`if\`. You can put the number it produces straight into a variable, as long as every branch produces the same type of value:

~~~rust
let depth: i32 = match line.trim().parse::<i32>() {
    Ok(n) => n,
    Err(_) => {
        println!("not a whole number, using 0");
        0
    }
};
~~~

- \`Ok(n) => n\` hands the number back.
- \`Err(_)\`: the underscore means "I do not need to know the reason".
- A branch with braces can do several things. The last line, **without a semicolon**, is the value it hands back.

If the line holds \`35\`, \`depth\` is 35. If it holds \`40m\`, the message prints and \`depth\` is 0. Either way the program keeps running instead of crashing.

### Sending a text to the board

From now on, when you send a \`String\` to the board you write a leading \`&\`: \`scene("diver", &diver);\`. The \`&\` lends the text to \`scene\`. Without it, \`scene\` would take the text away from you and you could not use it afterwards. Lesson 9 shows exactly why.

### Common mistakes

- Forgetting \`mut\` on the String: error[E0596]: cannot borrow \`line\` as mutable, as it is not declared as mutable.
- Writing \`read_line(line)\` or \`read_line(&line)\` instead of \`&mut line\`: error[E0308]: mismatched types.
- Not clearing the String between reads.
- Calling \`parse\` on text that still has its line break. Always \`trim()\` first.

### Going further (optional)

- The result box is an ordinary Rust enum with exactly two shapes, which you will build yourself in lesson 13: \`enum Result<T, E> { Ok(T), Err(E) }\`. \`"35".parse::<i32>()\` has the type \`Result<i32, ParseIntError>\`.
- Printing the error with \`{:?}\` shows its full structure, \`ParseIntError { kind: InvalidDigit }\`; \`{}\` gives the sentence. The kinds you will meet are \`Empty\`, \`InvalidDigit\`, \`PosOverflow\` and \`NegOverflow\` (a number too big for the type). A leftover line break is an invalid digit, which is why \`trim()\` comes before \`parse()\`.
- \`match\` must cover every possible shape. Forget the \`Err\` branch and the compiler refuses to build: E0004, non-exhaustive patterns.
- You can ask for the type with a variable annotation instead of the \`::<i32>\` form (nicknamed the **turbofish**): \`let n: i32 = text.parse().unwrap();\`. One of the two is required, since \`parse\` can build many types.
- \`.unwrap()\` is like \`.expect()\` without a message. On a parse of something a person typed, it stops the program the first time someone types "12kg".`,
      mission: md`The airlock has an intercom, and divers radio in their requests as text: their name, the depth they want, the dive site, and sometimes a bonus depth typed by someone in a hurry. Names come with stray spaces, and one of the numbers contains a typo. The airlock desk must not crash on either.

Read the four lines of the request, clean them up, and parse the depths. When this lesson passes, the **Airlock desk** lights up with the diver, site and depth.`,
      tasks: [
        "Create let mut line = String::new(); and read the first line with std::io::stdin().read_line(&mut line).expect(\"...\"). Store line.trim().to_string() in diver",
        "Call line.clear() and read the second line. Parse it with match line.trim().parse::<i32>() into planned_depth: Ok gives the number, Err prints a message and gives 0",
        "Clear and read the third line into site (trimmed, as an owned String)",
        "Clear and read the fourth line into bad_text, then parse it into bonus_depth. It is \"40m\", so the Err arm must print \"40m\" is not a whole number: invalid digit found in string (use the error in {problem}) and give 0",
        "Print: Dive request: Mara Okoye -> deep-ledge at 35 m",
        "Send diver (&diver), plannedDepth, site (&site), badText (&bad_text) and bonusDepth to the board",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 4: read the airlock's dive request (four lines of input).
// 1. let mut line = String::new();  read_line(&mut line) -> diver = line.trim().to_string()
// 2. line.clear(); read the depth. match line.trim().parse::<i32>() { Ok(depth) => depth, Err(_) => { ...; 0 } }
// 3. line.clear(); read the site into  site  (trimmed)
// 4. line.clear(); read bad_text (it is "40m"); parse it into bonus_depth.
//    In the Err arm: println!("\"{bad_text}\" is not a whole number: {problem}");  and give 0.
// Print:  Dive request: Mara Okoye -> deep-ledge at 35 m
// scene keys: diver, plannedDepth, site, badText, bonusDepth   (lend Strings with &, like &diver)
`,
      solutionAdd: rs`// Lesson 4: the airlock reads a dive request.
let mut line = String::new();
std::io::stdin().read_line(&mut line).expect("could not read the diver name");
let diver = line.trim().to_string();

line.clear();
std::io::stdin().read_line(&mut line).expect("could not read the depth");
let planned_depth: i32 = match line.trim().parse::<i32>() {
    Ok(depth) => depth,
    Err(_) => {
        println!("Depth is not a whole number, using 0");
        0
    }
};

line.clear();
std::io::stdin().read_line(&mut line).expect("could not read the site");
let site = line.trim().to_string();

line.clear();
std::io::stdin().read_line(&mut line).expect("could not read the bonus depth");
let bad_text = line.trim().to_string();
let bonus_depth = match bad_text.parse::<i32>() {
    Ok(n) => n,
    Err(problem) => {
        println!("\"{bad_text}\" is not a whole number: {problem}");
        0
    }
};

println!("Dive request: {diver} -> {site} at {planned_depth} m");

scene("diver", &diver);
scene("plannedDepth", planned_depth);
scene("site", &site);
scene("badText", &bad_text);
scene("bonusDepth", bonus_depth);`,
      explanation:
        "read_line appends the next line, newline included, to a mutable String, so each value is trimmed with trim() and the String is cleared before the next read. parse::<i32>() returns a Result, and match covers both shapes: Ok(depth) hands back the number and Err(_) falls back to 0. Because match is an expression, the whole match becomes the value of the variable. The fourth line is \"40m\", which is not a whole number; the error value prints as invalid digit found in string, and the program carries on with 0 instead of crashing.",
      hints: [
        { id: "h1", title: "Reading a line", content: "let mut line = String::new(); std::io::stdin().read_line(&mut line).expect(\"could not read\"); let diver = line.trim().to_string(); The String must be mut and you pass &mut line. Call line.clear(); before each following read." },
        { id: "h2", title: "Parsing with match", content: "let planned_depth: i32 = match line.trim().parse::<i32>() { Ok(depth) => depth, Err(_) => { println!(\"Depth is not a whole number, using 0\"); 0 } }; Every arm must produce an i32, so the Err arm ends with the expression 0 (no semicolon)." },
        { id: "h3", title: "The bad number", content: "Keep the text first: let bad_text = line.trim().to_string(); then match bad_text.parse::<i32>(). Name the error in the Err arm: Err(problem) => { println!(\"\\\"{bad_text}\\\" is not a whole number: {problem}\"); 0 }  Inside the string, \\\" is a quote mark that belongs to the text." },
      ],
      tests: [
        {
          id: "t1",
          description: "The diver's name is read and trimmed",
          assertionCode: js`assertEqual(scene.diver, "Mara Okoye", 'diver (read the first line, trim it, and send it with scene("diver", &diver);)');`,
        },
        {
          id: "t2",
          description: "The depth is parsed into a number",
          assertionCode: js`assertEqual(scene.plannedDepth, 35, 'plannedDepth (parse the second line with parse::<i32>(); send it with scene("plannedDepth", planned_depth);)');`,
        },
        {
          id: "t3",
          description: "The site name is read and trimmed",
          assertionCode: js`assertEqual(scene.site, "deep-ledge", 'site (clear the String, read the third line, trim it)');`,
        },
        {
          id: "t4",
          description: "A bad number is reported and replaced by 0, without crashing",
          assertionCode: js`
assertEqual(scene.badText, "40m", "badText (the fourth line, trimmed)");
assertEqual(scene.bonusDepth, 0, "bonusDepth (the Err arm must give 0)");
assert(lines.includes('"40m" is not a whole number: invalid digit found in string'), 'Print "40m" is not a whole number: invalid digit found in string  from the Err arm, using {problem} for the last part.');`,
        },
        {
          id: "t5",
          description: "The request summary is printed",
          assertionCode: js`assert(lines.includes("Dive request: Mara Okoye -> deep-ledge at 35 m"), 'No line is exactly "Dive request: Mara Okoye -> deep-ledge at 35 m". Use println!("Dive request: {diver} -> {site} at {planned_depth} m");');`,
        },
      ],
      unlocks: ["rs-airlock"],
      checks: [
        {
          prompt: "What type does `\"35\".parse::<i32>()` return?",
          question: {
            type: "choice",
            options: ["`i32`", "`Result<i32, ParseIntError>`", "`Option<i32>`", "`String`"],
            answer: 1,
          },
          explanation: "Parsing can fail, so the answer is a `Result`: `Ok(35)` on success, `Err(ParseIntError ...)` on failure. You cannot use it as a plain `i32` until you have handled both cases, for example with `match`.",
        },
        {
          prompt: "A line read with `read_line` contains `\"35\\n\"`. What does `parse::<i32>()` do with it, without `trim()`?",
          question: {
            type: "choice",
            options: ["Returns Ok(35), the newline is ignored", "Returns Err with kind InvalidDigit", "Panics immediately", "Returns Ok(0)"],
            answer: 1,
          },
          explanation: "`parse` accepts only the digits (and an optional sign), so the trailing newline is an invalid digit and the result is `Err`. That is why input text is trimmed before it is parsed.",
        },
        {
          prompt: "You call `read_line(&mut line)` three times on the same `String` without ever calling `line.clear()`. What is in `line` at the end?",
          question: {
            type: "choice",
            options: ["Only the third line", "All three lines, one after the other", "Nothing, read_line only works once", "A compile error"],
            answer: 1,
          },
          explanation: "`read_line` **appends** to whatever the String already holds. Clear it between reads, or the second value would be glued to the first.",
        },
      ],
    },

    // ───────────────────────── 5 ─────────────────────────
    {
      id: "rust-basics-5-decisions",
      title: "if and match",
      minutes: 30,
      xp: 110,
      concepts: ["if", "else if", "if as an expression", "bool logic", "match on numbers", "ranges in patterns", "exhaustive match", "blocks as values", "conditions are booleans", "separate ifs vs else-if chain"],
      learn: md`### Why a condition? What does it give back?

Programs constantly have to answer questions: "is the tank below 20%?", "is the hatch sealed?", "did the crew count change?". A **condition** is exactly such a question, written so that the only possible answers are *yes* or *no*. Rust evaluates it to a single value of type \`bool\`: \`true\` or \`false\`. An \`if\` does nothing mysterious. It asks "did I get \`true\`?" and runs its block if so.

You can look at that value yourself, because it is an ordinary value you can store and print:

~~~rust
let tank_pct = 15;
let low = tank_pct < 20;
println!("{low}");
println!("{}", tank_pct == 20);
~~~

~~~text
true
false
~~~

Now the smallest \`if\`: ask the question, and run the braces only when the answer is yes.

~~~rust
if tank_pct < 20 {
    println!("low");
}
~~~

~~~text
low
~~~

There are no parentheses around the condition. Here are the kinds of question you can ask for now:

| Kind | Example | What it asks |
| --- | --- | --- |
| Comparison | \`depth > 40\`, \`crew <= 3\`, \`crew != 0\` | How do two numbers relate? |
| Equality | \`crew == 6\`, \`status == "OK"\` | Are they the same? (text works too, and is case-sensitive) |
| Both true | \`depth <= 40 && pumps_online\` | Are both parts yes? (\`&&\` reads "and") |
| The opposite | \`!pumps_online\` | Is it not so? (\`!\` reads "not") |

A fourth tool joins questions with "or": two vertical bars, so \`depth > 40 || !pumps_online\` is yes when at least one side is yes.

Rust has no "truthiness": a number or a piece of text is never quietly counted as yes or no. You always write the actual question (\`crew > 0\`).

### Conditions together, and conditions in order

Several \`if\` questions can be **independent** (every one is asked), or **tried in order** (the first yes wins). That difference trips up many beginners, so compare the two with \`let o2 = 15;\`:

~~~rust
let o2 = 15;

// separate ifs: every one is asked
if o2 < 50 { println!("low"); }
if o2 < 20 { println!("critical"); }

// an else-if chain: the first true branch wins, the rest are skipped
if o2 < 20 {
    println!("critical");
} else if o2 < 50 {
    println!("low");
} else {
    println!("ok");
}
~~~

~~~text
low
critical
critical
~~~

The first pair prints two lines because both questions are true. The chain prints one line because it stops at the first yes, so put the narrowest test first. \`else\` is the "none of the above" branch. When all the tests are about **one value**, a \`match\` (further down) says it more clearly than a long chain.

### How to pick the condition

1. Say the question in plain words: "is the oxygen in the danger zone?"
2. Turn it into a yes/no test: \`o2 < 20\`.
3. Check the edge value. What should happen at exactly 20? If it counts as danger, you need \`<=\`, not \`<\`.

### A chain with real numbers

~~~rust
if planned_depth > 40 {
    println!("too deep");
} else if planned_depth > 20 {
    println!("mid-water");
} else {
    println!("shallow");
}
~~~

With \`planned_depth\` at 35 the first question says no, the second says yes, so it prints \`mid-water\`. The condition must be a real \`bool\`. \`if crew { ... }\` with a number is an error, not a quiet check for zero:

~~~text
error[E0308]: mismatched types
 --> main.rs:3:8
  |
3 |     if crew {
  |        ^^^^ expected \`bool\`, found \`u32\`
~~~

You can only compare values of the **same** type (\`u32\` with \`i32\` is E0308; convert one side with \`as\`).

### \`if\` gives back a value

An **expression** is a piece of code that produces a value. In Rust almost everything is one, including \`if\`. So you can store the answer of an \`if\` straight in a variable:

~~~rust
let zone = if planned_depth < 10 { "shallow" } else if planned_depth < 30 { "mid-water" } else { "deep" };
println!("{zone}");
~~~

~~~text
deep
~~~

(\`planned_depth\` is 35 here.) Two rules follow:

1. **Every branch must produce the same type.** \`if x { 1 } else { "one" }\` is error[E0308]: \`if\` and \`else\` have incompatible types.
2. **An \`if\` used as a value needs an \`else\`**, otherwise there is nothing to produce when the answer is no. Without it you get error[E0317]: \`if\` may be missing an \`else\` clause.

Write the value in each branch **without** a \`;\` after it. A semicolon would throw the value away (the details are under *Going further*).

### \`match\`: choose by pattern

You met \`match\` briefly in lesson 4, when you opened a result box. Here it gets its full explanation. \`match\` takes one value and compares it with a list of **patterns**, top to bottom, and runs the first one that fits. A pattern can be a single value, a **range** (\`a..=b\` includes both ends), a list of alternatives separated by \`|\`, or the catch-all \`_\`, which means "anything else".

~~~rust
let o2_whole = oxygen_pct as u32;
let o2_status = match o2_whole {
    0..=19 => "CRITICAL",
    20..=49 => "LOW",
    50..=100 => "OK",
    _ => "SENSOR FAULT",          // anything else
};

let watch = match crew {
    0 => "empty station",
    1..=3 => "skeleton crew",
    4 | 5 | 6 => "full watch",
    _ => "crowded",
};
~~~

With \`oxygen_pct\` at 87.5 the cast gives 87, which fits \`50..=100\`, so \`o2_status\` is \`"OK"\`. With \`crew\` at 6, \`watch\` is \`"full watch"\`.

The arms are checked from the top. Rust also checks that **together they cover every possible value**. That is called **exhaustiveness**, and it is one of the best features of the language: delete the \`_\` arm above and the compiler points at exactly what you forgot.

~~~text
error[E0004]: non-exhaustive patterns: \`101_u32..=u32::MAX\` not covered
  |
  |     let o2_status = match o2_whole {
  |                           ^^^^^^^^ pattern \`101_u32..=u32::MAX\` not covered
~~~

### if or match?

Use \`if\` for a yes/no question or a couple of unrelated conditions. Use \`match\` when you are sorting **one value** into cases, especially numbers, ranges, or (soon) the variants of an enum. A \`match\` tells the reader "these are all the cases" and the compiler agrees.

### Common mistakes

- A condition that is not a \`bool\`. Write the comparison: \`crew > 0\`.
- Different types in the two branches, or a missing \`else\` when you use the \`if\` as a value.
- A semicolon after the value in a branch.
- Overlapping or missing ranges. Mind \`..=\` (inclusive): \`0..=19\` and \`20..=49\` do not overlap or leave gaps.
- Comparing floats to ranges. Patterns work on whole numbers and chars, so convert first (\`oxygen_pct as u32\`) or use \`if\`.

### Going further (optional)

**More questions you can ask.** Text and lists have yes/no helpers: \`name.is_empty()\`, \`log.contains("leak")\`, \`tag.starts_with("HX")\`. A range can test a number: \`(20..=49).contains(&o2)\` is the same as \`o2 >= 20 && o2 <= 49\`. \`matches!(crew, 4..=6)\` asks "does this value fit this pattern?". \`&&\` and \`||\` are **short-circuit**: the right side is only worked out if the left side has not already settled the answer.

**The last expression is the value.** A block \`{ ... }\` is itself an expression: its value is its last line, the one **without** a semicolon. A semicolon turns that line into an instruction that produces nothing (the "unit" value \`()\`).

~~~rust
let verdict = if cleared { "GO" } else { "NO-GO" };      // fine
let verdict = if cleared { "GO"; } else { "NO-GO"; };    // mismatched types: expected \`&str\`, found \`()\`
~~~

~~~text
error[E0308]: mismatched types
  |
  |     let verdict = if cleared { "GO"; } else { "NO-GO"; };
  |                                ----^ expected \`&str\`, found \`()\`
  |                                |
  |                                help: remove this semicolon to return this value
~~~

When you see "expected X, found \`()\`", look for a stray semicolon at the end of a block.

**Guards.** A **guard** adds an extra condition to a pattern: \`n if n > 100 => "SENSOR FAULT"\`. The guard is checked only when the pattern fits, and the compiler cannot count a guarded arm toward exhaustiveness, so you still need a general arm last.`,
      mission: md`The alarm board in the control room must tell the crew three things at a glance: which depth zone the dive request is in, whether the oxygen supply is healthy, and how the watch is staffed. Then it combines everything into one verdict: **GO** or **NO-GO**.

You will decide with \`if\`, with \`match\` on a number and with a combination of conditions. When this lesson passes, the **Alarm board** lights up with your decisions.`,
      tasks: [
        "Compute zone with an if / else if / else expression on planned_depth: below 10 is \"shallow\", below 30 is \"mid-water\", otherwise \"deep\"",
        "Turn oxygen_pct into a whole number with as u32, then match it: 0..=19 \"CRITICAL\", 20..=49 \"LOW\", 50..=100 \"OK\", anything else \"SENSOR FAULT\" (o2_status)",
        "Match crew: 0 \"empty station\", 1..=3 \"skeleton crew\", 4 | 5 | 6 \"full watch\", anything else \"crowded\" (watch)",
        "Set let cleared = planned_depth <= 40 && oxygen_pct >= 50.0 && pumps_online; and verdict = if cleared { \"GO\" } else { \"NO-GO\" }",
        "Print four lines: Zone: deep, Oxygen: OK, Watch: full watch, Dive status: GO (use the variables)",
        "Send zone, o2Status, watch, cleared and verdict to the board",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 5: the alarm board decides.
// 1. let zone = if planned_depth < 10 { "shallow" } else if planned_depth < 30 { "mid-water" } else { "deep" };
// 2. let o2_whole = oxygen_pct as u32;  then  let o2_status = match o2_whole { 0..=19 => "CRITICAL", ... _ => "SENSOR FAULT" };
// 3. let watch = match crew { 0 => ..., 1..=3 => ..., 4 | 5 | 6 => ..., _ => ... };
// 4. let cleared = planned_depth <= 40 && oxygen_pct >= 50.0 && pumps_online;
//    let verdict = if cleared { "GO" } else { "NO-GO" };
// Print:  Zone: deep   |   Oxygen: OK   |   Watch: full watch   |   Dive status: GO     (one println! each)
// scene keys: zone, o2Status, watch, cleared, verdict
`,
      solutionAdd: rs`// Lesson 5: the alarm board decides.
let zone = if planned_depth < 10 {
    "shallow"
} else if planned_depth < 30 {
    "mid-water"
} else {
    "deep"
};

let o2_whole = oxygen_pct as u32;
let o2_status = match o2_whole {
    0..=19 => "CRITICAL",
    20..=49 => "LOW",
    50..=100 => "OK",
    _ => "SENSOR FAULT",
};

let watch = match crew {
    0 => "empty station",
    1..=3 => "skeleton crew",
    4 | 5 | 6 => "full watch",
    _ => "crowded",
};

let cleared = planned_depth <= 40 && oxygen_pct >= 50.0 && pumps_online;
let verdict = if cleared { "GO" } else { "NO-GO" };

println!("Zone: {zone}");
println!("Oxygen: {o2_status}");
println!("Watch: {watch}");
println!("Dive status: {verdict}");

scene("zone", zone);
scene("o2Status", o2_status);
scene("watch", watch);
scene("cleared", cleared);
scene("verdict", verdict);`,
      explanation:
        "An if / else if / else chain is an expression, so its value goes straight into zone; every branch is a &str. The oxygen level (87.5) is cast to a whole number (87) so it can be matched against integer ranges, and the _ arm makes the match exhaustive. Crew size 6 falls into the 4 | 5 | 6 arm. The final decision combines three conditions with &&: depth 35 is at most 40, oxygen 87.5 is at least 50 and the pumps are online, so cleared is true and the verdict is GO.",
      hints: [
        { id: "h1", title: "if as a value", content: "let zone = if planned_depth < 10 { \"shallow\" } else if planned_depth < 30 { \"mid-water\" } else { \"deep\" }; The values in the branches have no semicolon, and the whole statement ends with one." },
        { id: "h2", title: "match with ranges", content: "let o2_whole = oxygen_pct as u32; let o2_status = match o2_whole { 0..=19 => \"CRITICAL\", 20..=49 => \"LOW\", 50..=100 => \"OK\", _ => \"SENSOR FAULT\" }; Do the same for crew with 0, 1..=3, 4 | 5 | 6 and _." },
        { id: "h3", title: "The verdict", content: "let cleared = planned_depth <= 40 && oxygen_pct >= 50.0 && pumps_online; let verdict = if cleared { \"GO\" } else { \"NO-GO\" }; Then one println! per line, for example println!(\"Zone: {zone}\");" },
      ],
      tests: [
        {
          id: "t1",
          description: "The depth zone is deep",
          assertionCode: js`
assertEqual(scene.zone, "deep", "zone (planned_depth is 35: below 10 is shallow, below 30 is mid-water, otherwise deep)");
assert(lines.includes("Zone: deep"), 'Print the line "Zone: deep".');`,
        },
        {
          id: "t2",
          description: "The oxygen level is classified with match",
          assertionCode: js`
assertEqual(scene.o2Status, "OK", "o2Status (87.5% as u32 is 87, which is in 50..=100)");
assert(lines.includes("Oxygen: OK"), 'Print the line "Oxygen: OK".');`,
        },
        {
          id: "t3",
          description: "A crew of six is a full watch",
          assertionCode: js`
assertEqual(scene.watch, "full watch", "watch (crew is 6, which matches 4 | 5 | 6)");
assert(lines.includes("Watch: full watch"), 'Print the line "Watch: full watch".');`,
        },
        {
          id: "t4",
          description: "All three conditions together give GO",
          assertionCode: js`
assertEqual(scene.cleared, true, "cleared (planned_depth <= 40 && oxygen_pct >= 50.0 && pumps_online)");
assertEqual(scene.verdict, "GO", "verdict");
assert(lines.includes("Dive status: GO"), 'Print the line "Dive status: GO".');`,
        },
      ],
      unlocks: ["rs-alarms"],
      checks: [
        {
          prompt: "What does this evaluate to?\n\n~~~rust\nlet label = if 7 > 5 { \"big\" } else { \"small\" };\n~~~",
          question: { type: "text", answer: ["big", "\"big\""] },
          explanation: "`if` is an expression, so its value is the value of the branch that runs. Here `7 > 5` is true, so `label` is `\"big\"`. Both branches have the same type, `&str`, which is required.",
        },
        {
          prompt: "Why does this not compile?\n\n~~~rust\nlet crew = 6;\nif crew { println!(\"people aboard\"); }\n~~~",
          question: {
            type: "choice",
            options: [
              "The condition must be a bool; Rust has no truthiness (E0308: expected `bool`, found integer)",
              "println! cannot be used inside if",
              "crew must be declared with mut",
              "if needs parentheses around the condition",
            ],
            answer: 0,
          },
          explanation: "Rust only accepts a real `bool` as a condition. Write the comparison you mean: `if crew > 0 { ... }`.",
        },
        {
          prompt: "A `match` on a `u32` has arms `0..=9`, `10..=99` and `100..=999`. What does the compiler say?",
          question: {
            type: "choice",
            options: [
              "Nothing, it compiles",
              "error[E0004]: non-exhaustive patterns: `1000_u32..=u32::MAX` not covered",
              "A warning that the ranges overlap",
              "It runs, and panics if the value is too large",
            ],
            answer: 1,
          },
          explanation: "A `match` must cover every possible value of the type. Add a final `_ => ...` arm (or a range up to `u32::MAX`) to say what happens to the rest.",
        },
      ],
    },

    // ───────────────────────── 6 ─────────────────────────
    {
      id: "rust-basics-6-loops",
      title: "Loops",
      minutes: 35,
      xp: 120,
      concepts: ["loop", "while", "for", "ranges", "step_by", "break with a value", "continue", "labels", "choosing a loop", "range end is excluded"],
      learn: md`### Repeating a job

Some jobs repeat. Stamp five envelopes. Fill a tank until it is full. Check every seal on the hull. You would not write the same line five hundred times, so you tell the computer "do this again" and say when to stop. That is a **loop**. Each trip through the loop body is called a **lap**.

Rust has three loops. Here is one of each, with what it prints:

~~~rust
for marker in 1..=3 {
    println!("marker {marker}");
}
~~~

~~~text
marker 1
marker 2
marker 3
~~~

**\`for\`** walks through a sequence of values, one lap per value. \`1..=3\` is a **range**: the whole numbers from 1 up to and including 3. \`marker\` is a new variable that holds the current number on each lap.

~~~rust
let mut reserve = 87.5;
while reserve > 50.0 {
    reserve -= 12.5;
}
println!("{reserve}");
~~~

~~~text
50
~~~

**\`while\`** repeats as long as its condition is true. Before every lap it asks the yes/no question again (the same kind of question as in an \`if\`). Here the laps leave \`reserve\` at 75.0, then 62.5, then 50.0, and then the question "is it above 50?" says no, so the loop stops. (A float with no fraction prints as \`50\`.)

~~~rust
let mut cycles = 0;
loop {
    cycles += 1;
    if cycles == 5 {
        break;
    }
}
println!("{cycles}");
~~~

~~~text
5
~~~

**\`loop\`** repeats forever, until something inside says \`break\`. Here \`cycles\` counts 1, 2, 3, 4, 5 and the \`break\` happens on the fifth lap.

### Which loop?

| Situation | Loop |
| --- | --- |
| I know how many times, or I have a range of numbers to walk through | \`for\` |
| I wait until something changes (the tank is full) | \`while\` |
| Repeat until I decide inside, or I need a value out | \`loop\` + \`break\` |

If nothing inside a loop ever makes the \`while\` question turn to "no" (or ever reaches the \`break\`), the loop never ends. pockett stops a program that runs for a few seconds and tells you it ran too long. When that happens, look at the variable the condition depends on and check that something inside the loop changes it.

### Ranges: where the end stops

A range has a start and an end. **\`..\` leaves the end out, \`..=\` includes it.** The number of laps of \`a..b\` is just \`b - a\`.

~~~rust
for n in 0..5 { print!("{n} "); }                  // 0 1 2 3 4
for n in 2..6 { print!("{n} "); }                  // 2 3 4 5
for n in 1..=4 { print!("{n} "); }                 // 1 2 3 4
for n in (0..10).step_by(3) { print!("{n} "); }    // 0 3 6 9
~~~

\`.step_by(3)\` means "jump by 3 instead of by 1". Put parentheses around the range first. The mission uses this shape to mark every ten metres:

~~~rust
for m in (10..=35).step_by(10) { print!("{m} "); }  // 10 20 30
~~~

(40 would be next, but it is past 35, so the loop stops.) A range never counts backwards by itself: \`5..2\` has no laps.

### What happens each lap

~~~rust
let mut tank = 30;
while tank < 60 {
    println!("tank {tank}");
    tank += 10;
}
~~~

| Lap | \`tank\` at the start | Test \`tank < 60\` | Output |
| --- | --- | --- | --- |
| 1 | 30 | true | \`tank 30\` |
| 2 | 40 | true | \`tank 40\` |
| 3 | 50 | true | \`tank 50\` |
| (stop) | 60 | false | loop ends |

### \`break\` and \`continue\`

\`continue\` skips the rest of this lap and starts the next. \`break\` leaves the loop completely. Both are normally guarded by an \`if\`:

~~~rust
for n in 1..=6 {
    if n == 2 { continue; }
    if n == 5 { break; }
    print!("{n} ");
}
~~~

~~~text
1 3 4
~~~

### \`break\` can carry a value

A \`loop\` can hand a value back when it ends: \`break value\` stops the loop **and** says what the loop was worth. That is useful for "keep trying until it works":

~~~rust
let mut cycles = 0;
let mut tank_l = 0;
let full_after = loop {
    cycles += 1;
    tank_l += 15;
    if tank_l >= 100 {
        break cycles;        // the whole loop is worth \`cycles\`
    }
};
println!("{full_after}");
~~~

~~~text
7
~~~

Trace: after lap 6 the tank holds 90, after lap 7 it holds 105, which is at least 100, so the loop breaks with \`cycles\`, which is 7. (\`while\` and \`for\` cannot carry a value, because they might run zero times and have nothing to hand back.)

### Labels: leaving a loop inside a loop

When one loop sits inside another and you want to leave **both**, give the outer loop a **label** that starts with an apostrophe, and break to that label:

~~~rust
'rows: for row in 1..=3 {
    for seal in 1..=4 {
        if row * seal == 6 {
            break 'rows;          // leaves BOTH loops
        }
    }
}
~~~

Without the label, \`break\` would only leave the inner loop and the outer one would keep going.

### Common mistakes

- Off-by-one: \`1..3\` stops at 2. Use \`1..=3\` if you mean it to include 3.
- Forgetting \`mut\` on a counter you change (E0384 again).
- A \`while\` whose condition never changes, so the loop never ends.
- \`break\` outside a loop: error[E0268]: \`break\` outside of a loop or labeled block.
- A \`loop\` whose \`break\` values have different types.
- Comparing floats with \`==\` to end a loop. Floats drift; use \`<=\` or \`>=\`.

### Going further (optional)

- Counting backwards: \`(1..=3).rev()\` walks 3, 2, 1, and \`(0..10).rev().step_by(3)\` gives 9 6 3 0.
- Once you know \`Vec\` (lesson 8), you can loop over the items of a list directly instead of counting positions: \`for lvl in &levels { ... }\` visits each item. \`levels.iter().enumerate()\` gives you each item together with its position. Looping over the items is safer than looping over positions, because there is no position that can run off the end.
- A loop that counts how many items pass a test is just a loop plus an \`if\`: \`let mut low = 0;\`, then inside \`if lvl < 20 { low += 1; }\`.`,
      mission: md`Halcyon's machinery runs in cycles. The descent shaft is marked every ten metres, the oxygen tank drains by a fixed amount per hour until it reaches the reserve line, the ballast pumps fill the trim tank in steps, and the hull has a grid of seals where one of them is leaking.

You will write one loop of each kind. When this lesson passes, the **Ballast pumps** light up with your counts.`,
      tasks: [
        "Use for marker in (10..=planned_depth).step_by(10) to print Passing 10 m, Passing 20 m, Passing 30 m, counting them in markers_passed",
        "Copy oxygen_pct into let mut reserve_pct and use a while loop: while reserve_pct > 50.0, subtract 12.5 and add 1 to hours_to_reserve. Print Reserve reached after 3 h (50.0%)",
        "Use loop with break value: each round adds 15 to ballast_l and 1 to cycles, and breaks with cycles once ballast_l >= 100. Store the result in full_after and print Ballast full after 7 cycles",
        "Search rows 1..=3 and seals 1..=4 with a labelled loop 'rows. The first pair whose product is 6 is the leak: save leak_row and leak_seal, count every check in checked, and break 'rows",
        "Print: Leak found at row 2, seal 3 after 7 checks",
        "Send markersPassed, hoursToReserve, reservePct, fullAfter, checked, leakRow and leakSeal to the board",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 6: loops keep the station cycling.
// 1. for marker in (10..=planned_depth).step_by(10) { println!("Passing {marker} m"); markers_passed += 1; }
// 2. let mut reserve_pct = oxygen_pct;  while reserve_pct > 50.0 { reserve_pct -= 12.5; hours_to_reserve += 1; }
//    println!("Reserve reached after {hours_to_reserve} h ({reserve_pct:.1}%)");
// 3. let full_after = loop { cycles += 1; ballast_l += 15; if ballast_l >= 100 { break cycles; } };
//    println!("Ballast full after {full_after} cycles");
// 4. 'rows: for row in 1..=3 { for seal in 1..=4 { checked += 1; if row * seal == 6 { ...; break 'rows; } } }
//    println!("Leak found at row {leak_row}, seal {leak_seal} after {checked} checks");
// scene keys: markersPassed, hoursToReserve, reservePct, fullAfter, checked, leakRow, leakSeal
`,
      solutionAdd: rs`// Lesson 6: loops keep the station cycling.
let mut markers_passed = 0;
for marker in (10..=planned_depth).step_by(10) {
    println!("Passing {marker} m");
    markers_passed += 1;
}

let mut reserve_pct = oxygen_pct;
let mut hours_to_reserve = 0;
while reserve_pct > 50.0 {
    reserve_pct -= 12.5;
    hours_to_reserve += 1;
}
println!("Reserve reached after {hours_to_reserve} h ({reserve_pct:.1}%)");

let mut cycles = 0;
let mut ballast_l = 0;
let full_after = loop {
    cycles += 1;
    ballast_l += 15;
    if ballast_l >= 100 {
        break cycles;
    }
};
println!("Ballast full after {full_after} cycles");

let mut checked = 0;
let mut leak_row = 0;
let mut leak_seal = 0;
'rows: for row in 1..=3 {
    for seal in 1..=4 {
        checked += 1;
        if row * seal == 6 {
            leak_row = row;
            leak_seal = seal;
            break 'rows;
        }
    }
}
println!("Leak found at row {leak_row}, seal {leak_seal} after {checked} checks");

scene("markersPassed", markers_passed);
scene("hoursToReserve", hours_to_reserve);
scene("reservePct", reserve_pct);
scene("fullAfter", full_after);
scene("checked", checked);
scene("leakRow", leak_row);
scene("leakSeal", leak_seal);`,
      explanation:
        "The for loop walks 10, 20, 30 (35 is not a multiple of 10 and 40 is past the planned depth) and counts three markers. The while loop drains 12.5 per hour from 87.5 until it is no longer above 50.0: 75, 62.5, 50 in three rounds. The loop expression returns the cycle count through break cycles: 7 rounds of 15 litres pass 100. In the nested search the product row * seal first equals 6 at row 2, seal 3, after 4 + 3 = 7 checks, and break 'rows leaves both loops at once.",
      hints: [
        { id: "h1", title: "for with step_by", content: "for marker in (10..=planned_depth).step_by(10) { println!(\"Passing {marker} m\"); markers_passed += 1; } Declare let mut markers_passed = 0; before the loop. The range needs parentheses before .step_by." },
        { id: "h2", title: "while and loop", content: "let mut reserve_pct = oxygen_pct; let mut hours_to_reserve = 0; while reserve_pct > 50.0 { reserve_pct -= 12.5; hours_to_reserve += 1; } For loop: let full_after = loop { cycles += 1; ballast_l += 15; if ballast_l >= 100 { break cycles; } };" },
        { id: "h3", title: "The labelled search", content: "Declare checked, leak_row and leak_seal as mut variables set to 0 first. Then: 'rows: for row in 1..=3 { for seal in 1..=4 { checked += 1; if row * seal == 6 { leak_row = row; leak_seal = seal; break 'rows; } } }" },
      ],
      tests: [
        {
          id: "t1",
          description: "The for loop passes three depth markers",
          assertionCode: js`
assert(lines.includes("Passing 10 m") && lines.includes("Passing 20 m") && lines.includes("Passing 30 m"), "Print Passing 10 m, Passing 20 m and Passing 30 m, one per marker.");
assert(!lines.includes("Passing 40 m"), "Passing 40 m is deeper than the planned 35 m. A range up to planned_depth stops before it.");
assertEqual(scene.markersPassed, 3, "markersPassed");`,
        },
        {
          id: "t2",
          description: "The while loop runs until the reserve line",
          assertionCode: js`
assertEqual(scene.hoursToReserve, 3, "hoursToReserve (87.5 -> 75 -> 62.5 -> 50)");
assertEqual(scene.reservePct, 50, "reservePct");
assert(lines.includes("Reserve reached after 3 h (50.0%)"), 'Print the line "Reserve reached after 3 h (50.0%)" with {reserve_pct:.1}.');`,
        },
        {
          id: "t3",
          description: "loop returns a value with break",
          assertionCode: js`
assertEqual(scene.fullAfter, 7, "fullAfter (7 rounds of 15 litres reach 100: use break cycles;)");
assert(lines.includes("Ballast full after 7 cycles"), 'Print the line "Ballast full after 7 cycles".');`,
        },
        {
          id: "t4",
          description: "The labelled break stops the whole search",
          assertionCode: js`
assertEqual(scene.leakRow, 2, "leakRow");
assertEqual(scene.leakSeal, 3, "leakSeal");
assertEqual(scene.checked, 7, "checked (4 checks in row 1, then 3 in row 2; break 'rows must leave both loops)");
assert(lines.includes("Leak found at row 2, seal 3 after 7 checks"), 'Print the line "Leak found at row 2, seal 3 after 7 checks".');`,
        },
      ],
      unlocks: ["rs-pumps"],
      checks: [
        {
          prompt: "Which numbers does `for n in 1..4` visit?",
          question: {
            type: "choice",
            options: ["1, 2, 3", "1, 2, 3, 4", "0, 1, 2, 3", "2, 3, 4"],
            answer: 0,
          },
          explanation: "`a..b` excludes `b`. To include the end write `1..=4`. Most off-by-one bugs come from mixing these two up.",
        },
        {
          prompt: "What is `x` after this code?\n\n~~~rust\nlet mut n = 0;\nlet x = loop {\n    n += 2;\n    if n > 7 {\n        break n * 10;\n    }\n};\n~~~",
          question: { type: "number", answer: 80 },
          explanation: "`n` goes 2, 4, 6, 8. At 8 the condition is true and the loop breaks with the value `8 * 10`, so `x` is `80`. Only `loop` can break with a value.",
        },
        {
          prompt: "You have a loop inside a loop and want one `break` to leave both. What do you use?",
          question: {
            type: "choice",
            options: ["A label on the outer loop and `break 'label;`", "Two `break` statements in a row", "`return`", "`continue`"],
            answer: 0,
          },
          explanation: "Name the outer loop with a label (`'rows: for ...`) and write `break 'rows;`. A plain `break` only leaves the loop it is directly inside.",
        },
      ],
    },

    // ───────────────────────── 7 ─────────────────────────
    {
      id: "rust-basics-7-sensors",
      title: "Tuples and arrays",
      minutes: 30,
      xp: 110,
      concepts: ["tuple", "destructuring", "tuple fields", "array", "[T; N]", "indexing", "len", "bounds checks", "Copy"],
      learn: md`### Tuples: a few values of different types

A **tuple** groups a fixed number of values, and the values may have different types. You write it with parentheses.

~~~rust
let beacon = (12, -4, 42);                    // (i32, i32, i32): east, north, metres down
let sample = ("coral", 420, true);            // (&str, i32, bool)
~~~

You reach the parts in two ways. By **position** with a dot and an index:

~~~rust
println!("{}", beacon.2);                     // 42
~~~

Or by **destructuring**, which unpacks the whole tuple into names in one step:

~~~rust
let (east, north, below) = beacon;
~~~

A tuple has a fixed length and its type spells out every part, so \`(i32, i32)\` and \`(i32, i32, i32)\` are different types. To print a whole tuple use \`{:?}\`, which prints \`(12, -4, 42)\`. Plain \`{}\` is an error, because a tuple has no single neat everyday text form.

Use a tuple for a small, throw-away grouping. When the parts have meaning that deserves names, you will make a **struct** (lesson 12).

### Arrays: many values of the same type

An **array** holds a fixed number of values of **one** type. Its type is written \`[T; N]\` with the element type and the length, and the length is part of the type.

~~~rust
let readings = [41, 42, 42, 44, 41, 40];      // [i32; 6]
let spare_slots = [0u8; 4];                   // [0, 0, 0, 0]: the value 0, repeated 4 times
println!("{}", readings.len());               // 6
println!("{}", readings[0]);                  // 41
~~~

\`[0u8; 4]\` has the shape \`[value; how_many]\`: it builds an array by repeating one value, here the number 0 typed as a \`u8\`, four times.

- Indexes start at **0**, and they must be a \`usize\` (the type of lengths and positions). An \`i32\` index is error[E0277]: the type \`[{integer}]\` cannot be indexed by \`i32\`. Convert with \`as usize\`.
- The length of an array is fixed when you write the program. A list that can grow comes in the next chapter (\`Vec\`).
- \`{:?}\` prints \`[41, 42, 42, 44, 41, 40]\`. Two arrays of the same type can be compared with \`==\`.

### Bounds checking: no silent out-of-range reads

In C, reading past the end of an array silently returns whatever is in memory next. That is how many security holes begin. In Rust every index is **checked**. If the compiler can tell the index is wrong, it refuses to build:

~~~text
error: this operation will panic at runtime
 --> main.rs:3:20
  |
3 |     println!("{}", readings[9]);
  |                    ^^^^^^^^^^^ index out of bounds: the length is 6 but the index is 9
~~~

When the index only becomes known while running, the program **panics** instead, with an explanation and a line number:

~~~text
thread 'main' panicked at main.rs:5:20:
index out of bounds: the len is 6 but the index is 9
~~~

A panic is Rust's way of stopping a program that has a bug. It is loud, specific, and it never corrupts memory. (In lesson 8 you will meet the safe alternative, \`get\`, which returns an \`Option\`.)

### Looping over an array

~~~rust
let mut total = 0;
for reading in readings {
    total += reading;
}
println!("{total}");
~~~

~~~text
250
~~~

\`for x in array\` gives you each element in turn. You do not manage an index at all, so you cannot go out of bounds. The total grows 41, 83, 125, 169, 210, 250.

### Finding the biggest

To find the biggest reading, keep a variable that remembers the best so far. Start it with the first element, then replace it whenever you meet something bigger:

~~~rust
let mut highest = readings[0];
for reading in readings {
    if reading > highest {
        highest = reading;
    }
}
println!("{highest}");
~~~

~~~text
44
~~~

For the smallest, start with \`readings[0]\` again and flip the comparison to \`reading < lowest\`. For the average, divide the total by how many readings there are, converting both to \`f64\` first (lesson 3): \`total as f64 / readings.len() as f64\`, which is 250 divided by 6, about 41.67.

### Common mistakes

- Using \`0\` instead of \`readings.len()\` when you divide for an average, or forgetting that \`len()\` is a \`usize\` and has to be converted with \`as f64\`.
- Putting different types in one array (\`[1, "two"]\` is a mismatched types error). That is a job for a tuple, or later an enum.
- Thinking indexes start at 1.
- Printing a tuple or an array with \`{}\`. Use \`{:?}\`.`,
      mission: md`The sensor array on the hull reports the depth gauge six times per cycle. The control room needs the highest reading, the lowest, and the average, so it can notice a gauge that drifts. The station also keeps a beacon position, three numbers that belong together: east, north and metres down.

You will hold the readings in an array and the beacon in a tuple. When this lesson passes, the **Sensor array** lights up with your readings.`,
      tasks: [
        "Create let readings = [41, 42, 42, 44, 41, 40]; and loop over it with for reading in readings, computing total, highest and lowest",
        "Compute average = total as f64 / readings.len() as f64",
        "Create let beacon = (12, -4, 42); and destructure it with let (east, north, below) = beacon;",
        "Create let spare_slots = [0u8; 4]; (the repeat syntax)",
        "Print four lines: Readings: [41, 42, 42, 44, 41, 40], Highest 44, lowest 40, average 41.67, Beacon: (12, -4, 42), depth field 42 (use beacon.2) and Spare slots: [0, 0, 0, 0] (4 slots)",
        "Send readings, highest, lowest, average and beacon to the board. For the beacon send the array [east, north, below]",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 7: the sensor array.
// 1. let readings = [41, 42, 42, 44, 41, 40];
//    let mut total = 0; let mut highest = readings[0]; let mut lowest = readings[0];
//    for reading in readings { total += reading; ...update highest and lowest... }
//    let average = total as f64 / readings.len() as f64;
// 2. let beacon = (12, -4, 42);   let (east, north, below) = beacon;
// 3. let spare_slots = [0u8; 4];
// Print:  Readings: [41, 42, 42, 44, 41, 40]                   ({:?} on the array)
//         Highest 44, lowest 40, average 41.67                 ({average:.2})
//         Beacon: (12, -4, 42), depth field 42                 (beacon.2)
//         Spare slots: [0, 0, 0, 0] (4 slots)
// scene keys: readings, highest, lowest, average, beacon      (beacon: send [east, north, below])
`,
      solutionAdd: rs`// Lesson 7: the sensor array.
let readings = [41, 42, 42, 44, 41, 40];
let mut total = 0;
let mut highest = readings[0];
let mut lowest = readings[0];
for reading in readings {
    total += reading;
    if reading > highest {
        highest = reading;
    }
    if reading < lowest {
        lowest = reading;
    }
}
let average = total as f64 / readings.len() as f64;

let beacon = (12, -4, 42);
let (east, north, below) = beacon;

let spare_slots = [0u8; 4];

println!("Readings: {:?}", readings);
println!("Highest {highest}, lowest {lowest}, average {average:.2}");
println!("Beacon: {:?}, depth field {}", beacon, beacon.2);
println!("Spare slots: {:?} ({} slots)", spare_slots, spare_slots.len());

scene("readings", readings);
scene("highest", highest);
scene("lowest", lowest);
scene("average", average);
scene("beacon", [east, north, below]);`,
      explanation:
        "The array has a fixed length of six and one element type, so readings.len() is 6 and the loop visits each element without any index. The running highest and lowest start at the first reading. The average needs both the total and the length converted to f64, because dividing two integers would drop the fraction: 250 / 6 is 41.67. The tuple keeps three related numbers of the same kind together, and destructuring unpacks them in one let; beacon.2 reads the third field. [0u8; 4] repeats the value four times.",
      hints: [
        { id: "h1", title: "The array loop", content: "let readings = [41, 42, 42, 44, 41, 40]; let mut total = 0; let mut highest = readings[0]; let mut lowest = readings[0]; for reading in readings { total += reading; if reading > highest { highest = reading; } if reading < lowest { lowest = reading; } }" },
        { id: "h2", title: "Average and tuple", content: "let average = total as f64 / readings.len() as f64; The length is a usize, so it needs the cast too. let beacon = (12, -4, 42); let (east, north, below) = beacon;" },
        { id: "h3", title: "Printing", content: "Arrays and tuples have no Display, so print them with {:?}: println!(\"Readings: {:?}\", readings); println!(\"Beacon: {:?}, depth field {}\", beacon, beacon.2); For the board: scene(\"beacon\", [east, north, below]);" },
      ],
      tests: [
        {
          id: "t1",
          description: "The readings array is printed and sent",
          assertionCode: js`
assert(lines.includes("Readings: [41, 42, 42, 44, 41, 40]"), 'Print the line "Readings: [41, 42, 42, 44, 41, 40]". An array is printed with {:?}.');
assertEqual(scene.readings, [41, 42, 42, 44, 41, 40], "readings");`,
        },
        {
          id: "t2",
          description: "Highest, lowest and the average",
          assertionCode: js`
assertEqual(scene.highest, 44, "highest");
assertEqual(scene.lowest, 40, "lowest");
assertClose(scene.average, 41.6667, 0.001, "average (250 / 6; convert both the total and len() with as f64)");
assert(lines.includes("Highest 44, lowest 40, average 41.67"), 'Print the line "Highest 44, lowest 40, average 41.67" with {average:.2}.');`,
        },
        {
          id: "t3",
          description: "The beacon tuple is unpacked",
          assertionCode: js`
assertEqual(scene.beacon, [12, -4, 42], 'beacon (destructure the tuple, then scene("beacon", [east, north, below]);)');
assert(lines.includes("Beacon: (12, -4, 42), depth field 42"), 'Print the line "Beacon: (12, -4, 42), depth field 42". The tuple uses {:?} and beacon.2 is the third field.');`,
        },
        {
          id: "t4",
          description: "The repeat syntax builds the spare slots",
          assertionCode: js`assert(lines.includes("Spare slots: [0, 0, 0, 0] (4 slots)"), 'Print the line "Spare slots: [0, 0, 0, 0] (4 slots)". Build the array with [0u8; 4] and use .len() for the 4.');`,
        },
      ],
      unlocks: ["rs-sensors"],
      checks: [
        {
          prompt: "Given `let t = (3, \"reef\", true);`, what is `t.1`?",
          question: { type: "text", answer: ["reef", "\"reef\""] },
          explanation: "Tuple fields are numbered from 0, so `t.0` is `3`, `t.1` is `\"reef\"` and `t.2` is `true`.",
        },
        {
          prompt: "What happens at run time with this code?\n\n~~~rust\nlet readings = [1, 2, 3];\nlet i = 7;\nprintln!(\"{}\", readings[i]);\n~~~",
          question: {
            type: "choice",
            options: [
              "It prints garbage from memory next to the array",
              "It prints 0",
              "The program panics with: index out of bounds: the len is 3 but the index is 7",
              "It prints 3, the last element",
            ],
            answer: 2,
          },
          explanation: "Every index is bounds-checked, so reading past the end is a controlled panic with the exact length and index in the message. (If `i` were written as a literal directly in the index, the compiler would even catch it at build time.)",
        },
        {
          prompt: "Which type is written for an array of five `u8` values?",
          question: { type: "choice", options: ["`[u8; 5]`", "`[5; u8]`", "`(u8, 5)`", "`Vec<u8; 5>`"], answer: 0 },
          explanation: "An array type is `[element type; length]`. The length is part of the type, so `[u8; 5]` and `[u8; 6]` are different types.",
        },
      ],
    },
  ],
};
