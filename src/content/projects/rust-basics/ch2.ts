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
      learn: md`### The intercom sends text

A real program rarely knows its data in advance. It reads text from somewhere (a keyboard, a file, another program) and has to make sense of it. Standard input, **stdin**, is the simplest source. In this course the airlock intercom delivers a short script of four lines, and your program reads them one at a time.

~~~rust
let mut line = String::new();
std::io::stdin().read_line(&mut line).expect("could not read a line");
println!("You typed: {}", line.trim());
~~~

Take it apart:

- \`String::new()\` makes an empty, growable piece of text. A \`String\` **owns** its characters (lesson 11 is all about this). It has to be \`mut\` because reading will *add* to it.
- \`std::io::stdin()\` gives access to standard input. \`read_line\` reads up to the next newline and **appends** it to the String you hand over.
- \`&mut line\` means "lend \`read_line\` my String, and let it change it". The \`&mut\` is a **mutable reference**. You will learn the full story in lesson 10; for now read it as "here, you may write into this".
- \`read_line\` returns \`std::io::Result<usize>\`: either the number of bytes it read, or an error. Rust will not let you ignore a possible failure silently. \`.expect("message")\` says: if it failed, stop the program and show this message. That is a sensible reaction when failing means something is badly broken. (Never use it on input a user might simply get wrong. That is what the rest of this lesson is for.)

### Two gotchas of \`read_line\`

1. The text includes the **newline** at the end. \`"Mara Okoye\n"\` is not the same as \`"Mara Okoye"\`. \`line.trim()\` returns the text without whitespace at both ends. (It returns a \`&str\`, a borrowed view into \`line\`. \`.to_string()\` makes an owned copy that you can keep after \`line\` changes. Lesson 11 explains both.)
2. \`read_line\` **appends**. If you read twice into the same String you get both lines glued together. Call \`line.clear()\` before reading the next one, or use a fresh String.

~~~rust
let mut line = String::new();
std::io::stdin().read_line(&mut line).expect("no name");
let diver = line.trim().to_string();

line.clear();                                   // forget the first line
std::io::stdin().read_line(&mut line).expect("no depth");
~~~

### Text is not a number

\`"35"\` is three characters, not the number 35. To convert you use \`parse\`. And converting can **fail**: what is the number in \`"40m"\`?

Many languages answer with an exception that flies up the call stack. Rust has none. Instead the failure is part of the type. \`parse\` returns a **\`Result\`**, an enum with exactly two shapes:

~~~rust
enum Result<T, E> {
    Ok(T),     // it worked, here is the value
    Err(E),    // it failed, here is why
}
~~~

\`"35".parse::<i32>()\` has type \`Result<i32, ParseIntError>\`. You cannot use it as an \`i32\` until you have dealt with the \`Err\` case. That is the whole point: a forgotten error check is a compile error, not a crash in production.

~~~rust
match "35".parse::<i32>() {
    Ok(depth) => println!("depth is {depth}"),
    Err(problem) => println!("not a number: {problem}"),
}
~~~

### \`match\`

\`match\` compares a value against **patterns**, top to bottom, and runs the first arm that fits. \`Ok(depth)\` is a pattern that matches an \`Ok\` and **binds** its content to the name \`depth\`; \`Err(_)\` matches any error and ignores it with \`_\`. Two rules make \`match\` safe:

1. It must be **exhaustive**: every possible value is covered by some arm. Forget \`Err\` and the compiler refuses (E0004: non-exhaustive patterns: \`Err(_)\` not covered).
2. \`match\` is an **expression**. It has a value, so you can write \`let depth = match ... { ... };\`, as long as every arm produces the same type.

~~~rust
let depth: i32 = match text.trim().parse::<i32>() {
    Ok(n) => n,
    Err(_) => {
        println!("not a whole number, using 0");
        0                                   // the last expression of a block is its value
    }
};
~~~

The \`::<i32>\` after \`parse\` is nicknamed the **turbofish**. It tells \`parse\` which type to produce. You can say the same thing with an annotation on the variable (\`let n: i32 = ...\`), but one of the two is required, since \`parse\` can build many types: without it you get *error: type annotations needed*.

### What does an Err look like?

\`{:?}\` shows the full value and \`{}\` the sentence:

~~~text
{:?}  ->  ParseIntError { kind: InvalidDigit }
{}    ->  invalid digit found in string
~~~

The kinds you will meet are \`Empty\` (cannot parse integer from empty string), \`InvalidDigit\`, \`PosOverflow\` (number too large to fit in target type) and \`NegOverflow\`. A trailing newline is an invalid digit, which is why \`trim()\` comes before \`parse()\`.

### A word about \`&\`

From now on, when you send a \`String\` or a \`Vec\` to the board you write a leading \`&\`: \`scene("diver", &diver);\`. Small values such as numbers and booleans can be passed as they are. The \`&\` **lends** the text to \`scene\` instead of handing it over. Without it, \`scene\` would take it away from you and your own code could not use it afterwards. Lesson 9 shows exactly why.

### Common mistakes

- Forgetting \`mut\` on the String: error[E0596]: cannot borrow \`line\` as mutable, as it is not declared as mutable.
- Writing \`read_line(line)\` or \`read_line(&line)\` instead of \`&mut line\`: error[E0308]: mismatched types.
- Not clearing the String between reads.
- Calling \`parse\` on text that still has its newline.
- Using \`.unwrap()\` on a parse of user input. It panics with \`called Result::unwrap() on an Err value\` the first time someone types "12kg".`,
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
      concepts: ["if", "else if", "if as an expression", "bool logic", "match on numbers", "ranges in patterns", "exhaustive match", "blocks as values"],
      learn: md`### \`if\` needs a real bool

~~~rust
if planned_depth > 40 {
    println!("too deep");
} else if planned_depth > 20 {
    println!("mid-water");
} else {
    println!("shallow");
}
~~~

There are no parentheses around the condition. The condition must be a \`bool\`: Rust has no "truthiness", so \`if crew { ... }\` with a number is an error, not a quiet check for zero.

~~~text
error[E0308]: mismatched types
 --> main.rs:3:8
  |
3 |     if crew {
  |        ^^^^ expected \`bool\`, found \`u32\`
~~~

Comparisons (\`==\`, \`!=\`, \`<\`, \`<=\`, \`>\`, \`>=\`) produce bools. Combine them with \`&&\` (and), \`||\` (or) and \`!\` (not). \`&&\` and \`||\` are **short-circuit**: the right side is only evaluated if it is needed. You can only compare values of the **same** type (\`u32\` with \`i32\` is E0308, convert one side with \`as\`).

### \`if\` is an expression

In Rust almost everything produces a value, including \`if\`. That removes the need for a "ternary operator":

~~~rust
let zone = if planned_depth < 10 { "shallow" } else if planned_depth < 30 { "mid-water" } else { "deep" };
~~~

Two rules follow from "it is an expression":

1. **Every branch must produce the same type.** \`if x { 1 } else { "one" }\` is error[E0308]: \`if\` and \`else\` have incompatible types.
2. **An \`if\` used as a value needs an \`else\`**, otherwise there is nothing to produce when the condition is false. Without it you get error[E0317]: \`if\` may be missing an \`else\` clause.

### The last expression is the value, and a \`;\` changes that

A block \`{ ... }\` is itself an expression: its value is its last expression, **the one without a semicolon**. A semicolon turns an expression into a statement that produces nothing (the "unit" value \`()\`).

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

### \`match\`: choose by pattern

In the last lesson you used \`match\` on a \`Result\`. It works on numbers too, and the patterns can be a value, a **range** (\`a..=b\` includes both ends), a list of alternatives with \`|\`, or a catch-all \`_\`.

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

The arms are checked from the top. The compiler also checks that **together they cover every possible value**. That is **exhaustiveness**, one of the best features of the language: delete the \`_\` arm above and Rust points at exactly what you forgot.

~~~text
error[E0004]: non-exhaustive patterns: \`101_u32..=u32::MAX\` not covered
  |
  |     let o2_status = match o2_whole {
  |                           ^^^^^^^^ pattern \`101_u32..=u32::MAX\` not covered
~~~

A **guard** adds an extra condition to a pattern: \`n if n > 100 => "SENSOR FAULT"\`. The guard is run only when the pattern fits, and the compiler cannot count a guarded arm toward exhaustiveness, so you still need a general arm last.

### if or match?

Use \`if\` for a yes/no question or a couple of unrelated conditions. Use \`match\` when you are sorting **one value** into cases, and especially when the cases are numbers, ranges, or (soon) the variants of an enum. A \`match\` tells the reader "these are all the cases" and the compiler agrees.

### Common mistakes

- A condition that is not a \`bool\`. Write the comparison: \`crew > 0\`.
- Different types in the two branches, or a missing \`else\` when you use the \`if\` as a value.
- A semicolon after the value in a branch.
- Overlapping or missing ranges. Mind \`..=\` (inclusive): \`0..=19\` and \`20..=49\` do not overlap or leave gaps.
- Comparing floats to ranges. Patterns work on integers and chars, so convert first (\`oxygen_pct as u32\`) or use \`if\`.`,
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
      concepts: ["loop", "while", "for", "ranges", "step_by", "break with a value", "continue", "labels"],
      learn: md`### Three loops

Rust has three ways to repeat code.

**\`for\`** walks through a sequence. It is the one you will use most.

~~~rust
for marker in 1..=3 {
    println!("marker {marker}");
}
~~~

**\`while\`** repeats as long as a condition holds.

~~~rust
let mut reserve = 87.5;
while reserve > 50.0 {
    reserve -= 12.5;
}
~~~

**\`loop\`** repeats forever, until you \`break\`.

~~~rust
let mut cycles = 0;
loop {
    cycles += 1;
    if cycles == 5 {
        break;
    }
}
~~~

(A loop that never ends is stopped after a few seconds, with a message that your program ran for too long.)

### Ranges

\`1..4\` is the range 1, 2, 3 (it **excludes** the end). \`1..=4\` is 1, 2, 3, 4 (it **includes** the end). They work on integers and chars. Combine them with iterator methods you will meet properly in lesson 16:

~~~rust
for n in (1..=3).rev() { print!("{n} "); }          // 3 2 1
for m in (10..=40).step_by(10) { print!("{m} "); }  // 10 20 30 40
~~~

Why prefer \`for\` over a \`while\` with a counter? Because the loop *cannot get the bounds wrong*. There is no index to forget to increment and no way to run past the end. With a \`for\` over a range or a collection, the loop variable is created fresh for each round and simply disappears afterwards.

### \`break\` can carry a value

Because \`loop\` is an expression, \`break value\` ends the loop **and** says what the loop evaluated to. That is perfect for "keep trying until it works":

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
~~~

(\`while\` and \`for\` cannot carry a value, because they might run zero times and have nothing to produce.)

### \`continue\` and labels

\`continue\` skips to the next round. \`break\` leaves the loop it is in. When you have **nested** loops and want to leave the outer one, give it a **label** that starts with an apostrophe, and break to that label:

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

### Types in loops

A loop counter you declare as \`let mut n = 0;\` is an \`i32\` unless something else forces another type. In \`for row in 1..=3\` the type of \`row\` comes from the range, which in turn is decided by what you use it with. If you assign it into a variable of a particular type, the whole range takes that type.

### Common mistakes

- Off-by-one: \`1..3\` stops at 2. Use \`1..=3\` if you mean it to include 3.
- Forgetting \`mut\` on a counter you change (E0384 again).
- A \`while\` whose condition never changes, so the loop never ends.
- \`break\` outside a loop: error[E0268]: \`break\` outside of a loop or labeled block.
- A \`loop\` whose \`break\` values have different types.
- Comparing floats with \`==\` to end a loop. Floats drift; use \`<=\` or \`>=\`.`,
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

Destructuring is how functions return several values at once (you will do that in lesson 10): the caller gets a tuple and unpacks it. A tuple has a fixed length and its type spells out every part, so \`(i32, i32)\` and \`(i32, i32, i32)\` are different types. Tuples have a Debug format (\`{:?}\` prints \`(12, -4, 42)\`) but no Display, so \`println!("{}", beacon)\` is error[E0277]: \`({integer}, {integer}, {integer})\` doesn't implement \`std::fmt::Display\`. The empty tuple \`()\` is called **unit**. It is the "nothing" value that functions without a result and statements ending in \`;\` produce.

Use a tuple for a small, throw-away grouping. When the parts have meaning that deserves names, you will make a **struct** (lesson 12).

### Arrays: many values of the same type

An **array** holds a fixed number of values of **one** type. Its type is written \`[T; N]\` with the element type and the length, and the length is part of the type.

~~~rust
let readings = [41, 42, 42, 44, 41, 40];      // [i32; 6]
let spare_slots = [0u8; 4];                   // [0, 0, 0, 0]: the value 0, repeated 4 times
println!("{}", readings.len());               // 6
println!("{}", readings[0]);                  // 41
~~~

- Indexes start at **0**, and they must be a \`usize\` (the type of lengths and positions). An \`i32\` index is error[E0277]: the type \`[{integer}]\` cannot be indexed by \`i32\`. Convert with \`as usize\`.
- Arrays are stored right there in the function's memory (the "stack"). That makes them fast, and it is also why their size must be known when the program is compiled. A collection that can grow comes in the next chapter (\`Vec\`).
- If the elements are \`Copy\` types (numbers, bools, chars), the whole array is \`Copy\`: using \`readings\` in a \`for\` loop does not use it up. Lesson 9 explains \`Copy\`.
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
~~~

\`for x in array\` gives you each element. You do not manage an index at all, so you cannot go out of bounds. If you do need the index too, there is \`for (i, x) in readings.iter().enumerate()\`. Lesson 16 explains iterators properly.

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
