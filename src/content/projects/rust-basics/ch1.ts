import type { Chapter } from "@/engine/types";
import { js, md, rs } from "./util.ts";

/**
 * Chapter 1: First bubbles. Printing, variables and types, and arithmetic with casts.
 *
 * Lesson 1's starter carries the whole skeleton: the provided helper (`scene` and `Json`) above
 * `fn main()`. From lesson 2 on, lessons only add to main's body (engine/compose.ts).
 */

/** The helper every lesson relies on from lesson 2 on. Items go above main in a Rust file. */
export const SCENE_HELPER = rs`// Provided by pockett: sends values to the live station beside your editor.
// From lesson 2 on you call  scene("name", value);  and build objects with Json::new().with("key", value).
// Leave everything down to fn main() as it is. (Pass a String or a Vec with a leading &, like &name.)
trait ToJson {
    fn to_json(&self) -> String;
}

fn quote(s: &str) -> String {
    let mut out = String::from("\"");
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

impl ToJson for i32 { fn to_json(&self) -> String { self.to_string() } }
impl ToJson for i64 { fn to_json(&self) -> String { self.to_string() } }
impl ToJson for u8 { fn to_json(&self) -> String { self.to_string() } }
impl ToJson for u32 { fn to_json(&self) -> String { self.to_string() } }
impl ToJson for u64 { fn to_json(&self) -> String { self.to_string() } }
impl ToJson for usize { fn to_json(&self) -> String { self.to_string() } }
impl ToJson for bool { fn to_json(&self) -> String { self.to_string() } }
impl ToJson for f64 {
    fn to_json(&self) -> String {
        if self.is_finite() { self.to_string() } else { "null".to_string() }
    }
}
impl ToJson for char { fn to_json(&self) -> String { quote(&self.to_string()) } }
impl ToJson for str { fn to_json(&self) -> String { quote(self) } }
impl ToJson for String { fn to_json(&self) -> String { quote(self) } }
impl<T: ToJson + ?Sized> ToJson for &T { fn to_json(&self) -> String { (**self).to_json() } }
impl<T: ToJson> ToJson for [T] {
    fn to_json(&self) -> String {
        let parts: Vec<String> = self.iter().map(|item| item.to_json()).collect();
        format!("[{}]", parts.join(", "))
    }
}
impl<T: ToJson> ToJson for Vec<T> { fn to_json(&self) -> String { self.as_slice().to_json() } }
impl<T: ToJson, const N: usize> ToJson for [T; N] { fn to_json(&self) -> String { self.as_slice().to_json() } }
impl<T: ToJson> ToJson for Option<T> {
    fn to_json(&self) -> String {
        match self {
            Some(value) => value.to_json(),
            None => "null".to_string(),
        }
    }
}
impl<V: ToJson> ToJson for std::collections::HashMap<String, V> {
    fn to_json(&self) -> String {
        let mut parts: Vec<String> = Vec::new();
        for (key, value) in self {
            parts.push(format!("{}: {}", quote(key), value.to_json()));
        }
        format!("{{{}}}", parts.join(", "))
    }
}

struct Json(Vec<String>);

impl Json {
    fn new() -> Json {
        Json(Vec::new())
    }
    fn with(mut self, key: &str, value: impl ToJson) -> Json {
        self.0.push(format!("{}: {}", quote(key), value.to_json()));
        self
    }
}

impl ToJson for Json {
    fn to_json(&self) -> String {
        format!("{{{}}}", self.0.join(", "))
    }
}

fn scene(key: &str, value: impl ToJson) {
    println!("@scene {{{}: {}}}", quote(key), value.to_json());
}`;

export const chapter1: Chapter = {
  id: "first-bubbles",
  title: "First bubbles",
  blurb: "Make the control room talk, store values with the right type, and let Rust do the arithmetic.",
  lessons: [
    // ───────────────────────── 1 ─────────────────────────
    {
      id: "rust-basics-1-hello",
      title: "Hello, reef",
      minutes: 20,
      xp: 60,
      concepts: ["fn main", "println!", "print!", "format arguments", "{:?}", "{:.2}", "escapes", "compiler errors"],
      learn: md`### A program starts at \`main\`

Every Rust program begins in a function called \`main\`. A **function** is a named block of code: the keyword \`fn\`, a name, parentheses for the inputs (none here), and a body between braces.

~~~rust
fn main() {
    println!("Hello, reef!");
}
~~~

- \`println!\` prints its text and then moves to a **new line**.
- The \`!\` means \`println\` is a **macro**, not an ordinary function. Macros are expanded by the compiler before the program is built, which lets them do things a function cannot, such as checking your format string against the values you pass (more on that below). Whenever you see a name that ends in \`!\`, read it as "the compiler writes some code for me here".
- \`"Hello, reef!"\` is a **string literal**: text between double quotes. Rust text is always UTF-8, so \`"café"\` and \`"🐠"\` are fine.
- Each statement ends with \`;\`. The body of a function is just a list of statements, run from top to bottom.
- The standard style is four spaces of indentation. The compiler does not care, but every Rust programmer you will ever read does.

### Build first, run second

Rust is a **compiled** language. When you press Run, your whole file is handed to the compiler (\`rustc\`) *before anything executes*. If the compiler finds a mistake, nothing runs at all and you get an explanation instead. That feels strict at first, and it is the central deal of Rust: the compiler is fussy before the program runs so that far fewer things go wrong while it runs. By lesson 9 you will see it catch whole families of bugs that other languages only find in production.

A compiler message always has the same shape. Read it top to bottom:

~~~text
error[E0423]: expected function, found macro \`println\`
 --> main.rs:2:5
  |
2 |     println("Hello");
  |     ^^^^^^^ not a function
  |
help: use \`!\` to invoke the macro
~~~

1. **\`error[E0423]\`**: the severity and an **error code**. Every code has a page in the Rust error index, and the station on the right will explain the common ones for you.
2. **\`--> main.rs:2:5\`**: file, line 2, column 5. The line number is yours: pockett never rewrites your file.
3. **The code excerpt**: your own line, with \`^^^^\` carets under the exact spot and a short label.
4. **\`help:\`**: very often the compiler tells you the fix. Read it before you reach for anything else.

(The exact wording changes a little between compiler versions. The code and the idea stay the same.)

### \`print!\` or \`println!\`?

\`println!\` ends the line, \`print!\` does not, so the next print continues on the same line.

~~~rust
print!("Loading");
print!("...");
println!(" done");     // Loading... done
println!("Next line");
~~~

### Format arguments: \`{}\` and \`{:?}\`

The first argument of \`println!\` is a **format string**. Each \`{}\` is a hole that is filled by the next value you pass after it.

~~~rust
println!("Depth {} m, crew {}", 42, 6);   // Depth 42 m, crew 6
~~~

There are two ways to turn a value into text, and you choose with what is inside the braces:

- \`{}\` uses **Display**: the clean, human-facing text. Numbers, strings and chars have it.
- \`{:?}\` uses **Debug**: a programmer-facing view that shows structure. A string prints *with* its quote marks, so you can see exactly what you have. Almost every type has Debug (you will derive it yourself in lesson 12), but many types have no Display because there is no single obvious "nice" text for them.

~~~rust
println!("{}", "B-7");     // B-7
println!("{:?}", "B-7");   // "B-7"
~~~

Inside the braces you can also add instructions after the colon. The one you will use constantly is **precision** for decimals: \`{:.2}\` means "two digits after the point".

~~~rust
println!("{:.2}", 87.5);    // 87.50
println!("{:.0}", 87.6);    // 88   (rounded)
~~~

The compiler checks the holes against the values *at compile time*. Too few or too many is an error, not a crash at run time:

~~~text
error: 1 positional argument in format string, but no arguments were given
 --> main.rs:2:15
  |
2 |     println!("Crew: {}");
  |                     ^^
~~~

### Escapes and literal braces

Inside a string literal, a backslash starts an **escape**: \`\n\` is a new line, \`\t\` a tab, \`\"\` a double quote that belongs to the text, and \`\\\` one backslash. Because \`{\` and \`}\` are special in a format string, write \`{{\` and \`}}\` when you want a real brace:

~~~rust
println!("Pump {{3}} is online");   // Pump {3} is online
~~~

### The helper above \`main\`

Look above \`fn main\` in your file. That block is **provided by pockett**: a tiny \`scene\` function (and a few helpers) that sends values to the live station beside your editor. From lesson 2 on you will call \`scene("name", value);\` and the matching module of the station lights up with your number. Nothing in the helper needs to be understood yet, so leave it alone. By lesson 12 you will know enough Rust to read all of it.

### Common mistakes

- Forgetting the \`!\`: \`println("hi")\` fails with E0423, shown above.
- Single quotes for text. \`'hi'\` is a **char** literal and holds exactly one character: *error: character literal may only contain one codepoint*.
- Forgetting a \`;\`. The error ( *expected \`;\`, found ...* ) is often reported on the line *after* the one that needs it, because the compiler only notices when the next statement starts.
- Putting \`{}\` in the text but no value after it, or the other way round.`,
      mission: md`Welcome to **Halcyon Reef Station**: a small research base bolted to a reef shelf 42 metres below the surface. Six people live and work there. The station has pumps, tanks, drones and a lot of hardware, but its control room has no software yet. You are going to write all of it, one lesson at a time, in a single growing Rust program.

Every control room starts with a console. Make the station announce itself: its name, the crew, depth and pressure, an oxygen reading and a hatch label. When this lesson passes, the **Control room** console powers on and shows everything your program prints, in order.`,
      tasks: [
        "Print the station name on its own line: Halcyon Reef Station",
        "Use print! and then println! so that Crew aboard: 6 ends up on ONE line",
        "Print Depth 42 m, pressure 5.2 bar with println! and two {} holes, passing 42 and 5.2 as the values",
        "Print Oxygen: 87.50% using a {:.2} hole and the value 87.5",
        "Print Hatch label: \"B-7\" with the quote marks, using a {:?} hole",
        "Print Pump {3} is online. The braces are part of the text, so double them in the format string",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 1: make the control room talk. Your code goes inside fn main() at the bottom of this file.
// 1. println! the station name:  Halcyon Reef Station
// 2. print!("Crew aboard: ") and then println!("{}", 6) so both land on ONE line.
// 3. Depth 42 m, pressure 5.2 bar     (two {} holes, two values)
// 4. Oxygen: 87.50%                   ({:.2} with the value 87.5)
// 5. Hatch label: "B-7"                (the quotes come from {:?})
// 6. Pump {3} is online               (write {{ and }} for real braces)
// The block below is the pockett helper. Leave it as it is and scroll down to fn main.

${SCENE_HELPER}

fn main() {
    // This first line is a placeholder so the file builds. Replace it with your own.
    println!("TODO: print the station name here");
}`,
      solutionAdd: rs`// Lesson 1: the control room talks.
${SCENE_HELPER}

fn main() {
    println!("Halcyon Reef Station");
    print!("Crew aboard: ");
    println!("{}", 6);
    println!("Depth {} m, pressure {} bar", 42, 5.2);
    println!("Oxygen: {:.2}%", 87.5);
    println!("Hatch label: {:?}", "B-7");
    println!("Pump {{3}} is online");
}`,
      explanation:
        "print! leaves the cursor where it is and println! ends the line, so print!(\"Crew aboard: \") followed by println!(\"{}\", 6) gives one line. Each {} is filled by the next value, in order. {:.2} formats a float with two decimals (87.5 becomes 87.50), and {:?} is the Debug format, which shows a string with its quote marks. Because { and } mean 'hole' inside a format string, a literal brace is written twice: {{3}} prints {3}.",
      hints: [
        { id: "h1", title: "The first line", content: "Everything goes inside the braces of fn main(), one statement per line, each ending in a semicolon. For example: println!(\"Halcyon Reef Station\"); Delete the placeholder println! when you are done." },
        { id: "h2", title: "One line from two prints", content: "print! does not end the line. print!(\"Crew aboard: \"); println!(\"{}\", 6); A {} hole is filled by the value after the format string, so the 6 goes in the hole." },
        { id: "h3", title: "Holes and braces", content: "println!(\"Depth {} m, pressure {} bar\", 42, 5.2); println!(\"Oxygen: {:.2}%\", 87.5); println!(\"Hatch label: {:?}\", \"B-7\"); And for the last one the braces are doubled: println!(\"Pump {{3}} is online\");" },
      ],
      tests: [
        {
          id: "t1",
          description: "The first line printed is the station name",
          assertionCode: js`assertEqual(lines[0] ?? "(nothing printed yet)", "Halcyon Reef Station", "Line 1 should be the station name");`,
        },
        {
          id: "t2",
          description: "Crew aboard: 6 is printed on a single line",
          assertionCode: js`assert(lines.includes("Crew aboard: 6"), 'No line is exactly "Crew aboard: 6". Use print! for the label (it stays on the line) and then println! for the 6, so they land together.');`,
        },
        {
          id: "t3",
          description: "Depth and pressure come from two {} holes",
          assertionCode: js`assert(lines.includes("Depth 42 m, pressure 5.2 bar"), 'No line is exactly "Depth 42 m, pressure 5.2 bar". Use println!("Depth {} m, pressure {} bar", 42, 5.2);');`,
        },
        {
          id: "t4",
          description: "{:.2} gives two decimals",
          assertionCode: js`assert(lines.includes("Oxygen: 87.50%"), 'No line is exactly "Oxygen: 87.50%". The hole {:.2} prints a float with two digits after the point.');`,
        },
        {
          id: "t5",
          description: "{:?} keeps the quote marks around the hatch label",
          assertionCode: js`assert(lines.includes('Hatch label: "B-7"'), 'No line is exactly Hatch label: "B-7" (with the quote marks). The Debug hole {:?} prints a string with its quotes.');`,
        },
        {
          id: "t6",
          description: "Doubled braces print as real braces",
          assertionCode: js`assert(lines.includes("Pump {3} is online"), 'No line is exactly "Pump {3} is online". In a format string write {{ and }} for a literal brace: println!("Pump {{3}} is online");');`,
        },
        {
          id: "t7",
          description: "The lines come out in the order of the tasks",
          assertionCode: js`
const want = ["Halcyon Reef Station", "Crew aboard: 6", "Depth 42 m, pressure 5.2 bar", "Oxygen: 87.50%", 'Hatch label: "B-7"', "Pump {3} is online"];
const at = want.map((w) => lines.indexOf(w));
assert(at.every((i) => i >= 0), "Print all six lines first, then check their order.");
assert(at.every((v, i) => i === 0 || v > at[i - 1]), "The six lines are all there but in a different order. Print them in the order of the tasks.");`,
        },
      ],
      unlocks: ["rs-console"],
      checks: [
        {
          prompt: "What does this print?\n\n~~~rust\nprint!(\"A\");\nprintln!(\"B\");\nprintln!(\"C\");\n~~~",
          question: {
            type: "choice",
            options: ["AB on one line, then C on the next line", "A, B and C on three separate lines", "ABC on one line", "A on one line, then BC on the next line"],
            answer: 0,
          },
          explanation: "`print!` leaves the cursor where it is, so `B` continues on the same line as `A`. `println!` then ends that line, and `C` is printed on the next one.",
        },
        {
          prompt: "Which statement prints the text `reef` **with** the double quotes around it?",
          question: {
            type: "choice",
            options: [
              "`println!(\"{}\", \"reef\");`",
              "`println!(\"{:?}\", \"reef\");`",
              "`println!(\"{:.2}\", \"reef\");`",
              "`println!(\"{{}}\", \"reef\");`",
            ],
            answer: 1,
          },
          explanation: "`{:?}` is the Debug format, which shows a string the way it would be written in code, quotes included. Plain `{}` prints just `reef`. `{:.2}` is for decimals, and `{{}}` prints the two characters `{}` and then the value is never used, which is a compile error.",
        },
        {
          prompt: "Why does `println!` end in an exclamation mark?",
          question: {
            type: "choice",
            options: [
              "It is a macro that the compiler expands, which is how it can check the format string",
              "It marks the function as dangerous",
              "It makes the text louder",
              "It is optional; println works without it",
            ],
            answer: 0,
          },
          explanation: "A trailing `!` means a **macro**. `println` without the `!` is an error (E0423: expected function, found macro). Because the macro runs at compile time, it can count the holes in your format string and reject a mismatch before the program ever runs.",
        },
      ],
    },

    // ───────────────────────── 2 ─────────────────────────
    {
      id: "rust-basics-2-variables",
      title: "Variables, mutability and types",
      minutes: 30,
      xp: 90,
      concepts: ["let", "immutability", "mut", "shadowing", "i32", "u32", "f64", "bool", "char", "type inference", "overflow"],
      learn: md`### \`let\` makes a variable, and it is read-only

~~~rust
let crew = 6;
println!("{crew} people aboard");
~~~

\`let name = value;\` creates a **binding**. Notice two things. First, you did not write a type: Rust **infers** it from the value (here, \`i32\`). Second, you can put a variable straight inside the braces of a format string: \`{crew}\`. Any plain name works there, and you can still add instructions: \`{oxygen:.1}\`.

By default a binding is **immutable**: once it has a value, it cannot be changed.

~~~rust
let oxygen = 100.0;
oxygen = 87.5;      // error[E0384]: cannot assign twice to immutable variable \`oxygen\`
~~~

~~~text
error[E0384]: cannot assign twice to immutable variable \`oxygen\`
 --> main.rs:3:5
  |
2 |     let oxygen = 100.0;
  |         ------ first assignment to \`oxygen\`
3 |     oxygen = 87.5;
  |     ^^^^^^^^^^^^^ cannot assign twice to immutable variable
  |
help: consider making this binding mutable
  |
2 |     let mut oxygen = 100.0;
  |         +++
~~~

This is deliberate. A value that cannot change is a value you can reason about: when you read a function six months from now, every \`let\` without \`mut\` is a promise that this name means the same thing from top to bottom. When you do need change, you say so, and the word \`mut\` becomes a signpost for readers: *this one moves*.

~~~rust
let mut oxygen = 100.0;
oxygen -= 12.5;         // fine now: 87.5
~~~

Use \`mut\` only when you need it: rustc even has a warning (\`unused_mut\`) for a \`mut\` that is never used.

### Shadowing: a new variable with the old name

You can declare a new \`let\` with the same name. The new binding **shadows** the old one from that point on.

~~~rust
let tanks = 4;
let tanks = tanks * 2;      // a brand-new variable named tanks, equal to 8
~~~

This is not mutation. It is a second variable, and it may even have a different type, which is why shadowing is handy for "same data, new form" steps. An inner block \`{ ... }\` can shadow too, and the outer variable is back after the block ends.

### Scalar types

Rust is **statically typed**: every variable has one type, known at compile time, and it never changes. The built-in single-value ("scalar") types:

- **Signed integers** \`i8 i16 i32 i64 i128 isize\`: whole numbers that may be negative. \`i32\` is the default when you write a plain number like \`42\`.
- **Unsigned integers** \`u8 u16 u32 u64 u128 usize\`: whole numbers from 0 up. The number is the bit width, so \`u8\` holds 0 to 255. \`usize\` is the size of a memory address and is what lengths and indexes use.
- **Floats** \`f32\` and \`f64\`: numbers with a fractional part. \`f64\` is the default.
- **\`bool\`**: \`true\` or \`false\`, lower case. It prints as \`true\` / \`false\`.
- **\`char\`**: one Unicode character in **single quotes**: \`'B'\`, \`'é'\`, \`'🐠'\`. (Text in double quotes is a string, not a char.)

You can write the type yourself after a colon, or attach it to a literal as a suffix:

~~~rust
let crew: u32 = 6;          // an annotation
let depth = 42_i32;         // a suffix; the underscore is just for reading
let ratio = 0.75_f64;
let hatch = 'B';
let pumps_online = true;
~~~

Rust never converts between number types behind your back. \`let x: u32 = -5;\` is an error (an unsigned type cannot hold a negative), and so is \`let y: i32 = 4.5;\`. If you want a conversion, you will ask for it in lesson 3.

### Overflow: what happens past the edge

A \`u8\` can hold 0 to 255. What is \`250 + 10\`? Many languages quietly wrap around to 4. Rust makes you decide:

- With overflow checks on (which is how Rust builds while you are developing, called a **debug build**) a plain \`+\` that overflows **panics**: the program stops with *attempt to add with overflow*. A bug is a loud bug.
- In an optimised **release build** the same \`+\` wraps silently. That is why you should never rely on either behaviour by accident.
- If the compiler can see the overflow at compile time (\`let x: u8 = 255 + 1;\`), it refuses to build: *error: this arithmetic operation will overflow*.

When you *mean* a particular behaviour, say it with a method on the integer. They all exist for every integer type:

~~~rust
let level: u8 = 250;
level.wrapping_add(10);      // 4        wraps around, on purpose
level.saturating_add(10);    // 255      sticks at the maximum
level.checked_add(10);       // None     "there is no valid answer" (an Option, see lesson 14)
~~~

\`{:?}\` prints that last one as \`None\`. For now, read it as "nothing".

### Naming

Variables and functions are \`snake_case\` (\`oxygen_pct\`, \`depth_m\`). Types are \`CamelCase\` (you will meet them in lesson 12). The compiler has warnings for names that break the convention and for variables you create but never use. Put an underscore in front (\`_spare\`) to say "unused on purpose".

### Sending data to the station

The helper from lesson 1 gives you \`scene("key", value)\`. It sends a number, a bool, a char, a text or a list to the board with the name you choose. Small values go straight in: \`scene("crew", crew);\`.

### Common mistakes

- Forgetting \`mut\`: E0384, shown above. The compiler even prints the fixed line.
- Writing \`let crew: u32 = -1;\` or \`let n: i32 = 2.5;\`: error[E0308]: mismatched types.
- Reading a variable before it has a value: \`let x: i32; println!("{x}");\` is error[E0381]: used binding \`x\` isn't initialized.
- Using a name in a different scope: a variable made inside \`{ }\` does not exist after the closing brace (E0425).`,
      mission: md`Every crew member needs to know the station's vital signs, and the control room needs them as data, not as prose. Time to give Halcyon a spec sheet.

You will store the name, crew size, depth, oxygen level, pump status and hatch label with the right types, let the oxygen level drop with \`mut\`, double the tanks with shadowing, and see all three ways to handle an overflowing byte. When this lesson passes, the **Oxygen plant** lights up with your numbers.`,
      tasks: [
        "Declare station = \"Halcyon\", crew: u32 = 6, depth_m: i32 = 42, pumps_online = true and hatch = 'B'",
        "Declare let mut oxygen_pct: f64 = 100.0 and then subtract 12.5 with -= (it becomes 87.5)",
        "Declare let tanks = 4; and then shadow it with let tanks = tanks * 2; (8)",
        "With let sensor_level: u8 = 250 compute wrapped_level (wrapping_add 10), capped_level (saturating_add 10) and checked_level (checked_add 10)",
        "Print: Halcyon | crew 6 | depth 42 m | oxygen 87.5% | pumps true | hatch B  (use the {name} form inside the braces)",
        "Print: Overflow: wrapped 4, capped 255, checked None  (checked_level goes through {:?})",
        "Send station, crew, depthM, oxygenPct, pumpsOnline, hatch, tanks, wrappedLevel and cappedLevel with scene(...)",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 2: give the station a spec sheet. Use the right type for each value.
// let station = "Halcyon";        let crew: u32 = 6;       let depth_m: i32 = 42;
// let mut oxygen_pct: f64 = 100.0;  then  oxygen_pct -= 12.5;
// let pumps_online = true;        let hatch = 'B';
// let tanks = 4;  then shadow it:  let tanks = tanks * 2;
// let sensor_level: u8 = 250;  wrapped_level = sensor_level.wrapping_add(10)
//                              capped_level  = sensor_level.saturating_add(10)
//                              checked_level = sensor_level.checked_add(10)
// println!("{station} | crew {crew} | depth {depth_m} m | oxygen {oxygen_pct}% | pumps {pumps_online} | hatch {hatch}");
// println!("Overflow: wrapped {wrapped_level}, capped {capped_level}, checked {:?}", checked_level);
// Finally call scene("station", station); and so on. The keys are:
// station, crew, depthM, oxygenPct, pumpsOnline, hatch, tanks, wrappedLevel, cappedLevel.
`,
      solutionAdd: rs`// Lesson 2: the station's spec sheet.
let station = "Halcyon";
let crew: u32 = 6;
let depth_m: i32 = 42;
let mut oxygen_pct: f64 = 100.0;
let pumps_online = true;
let hatch = 'B';

oxygen_pct -= 12.5; // the crew has been breathing

let tanks = 4;
let tanks = tanks * 2; // shadowing: a new variable built from the old one

let sensor_level: u8 = 250;
let wrapped_level = sensor_level.wrapping_add(10);
let capped_level = sensor_level.saturating_add(10);
let checked_level = sensor_level.checked_add(10);

println!("{station} | crew {crew} | depth {depth_m} m | oxygen {oxygen_pct}% | pumps {pumps_online} | hatch {hatch}");
println!("Overflow: wrapped {wrapped_level}, capped {capped_level}, checked {:?}", checked_level);

scene("station", station);
scene("crew", crew);
scene("depthM", depth_m);
scene("oxygenPct", oxygen_pct);
scene("pumpsOnline", pumps_online);
scene("hatch", hatch);
scene("tanks", tanks);
scene("wrappedLevel", wrapped_level);
scene("cappedLevel", capped_level);`,
      explanation:
        "Each value gets the type that fits it: u32 for a count that cannot be negative, i32 for a depth, f64 for a decimal, bool, and char in single quotes. oxygen_pct needs mut because it changes; everything else stays immutable. The second let tanks is a new variable that shadows the first. For the byte at 250, wrapping_add(10) wraps to 4, saturating_add(10) stops at 255, and checked_add(10) returns None because there is no valid answer, which {:?} prints as None.",
      hints: [
        { id: "h1", title: "Declaring", content: "The pattern is let name: Type = value; and the type is often optional: let crew: u32 = 6; let depth_m: i32 = 42; A char uses single quotes: let hatch = 'B'; Only oxygen_pct needs the word mut: let mut oxygen_pct: f64 = 100.0;" },
        { id: "h2", title: "Changing and shadowing", content: "oxygen_pct -= 12.5; changes a mut variable. Shadowing is a second let with the same name: let tanks = 4; let tanks = tanks * 2; The second one is a new variable, so it needs no mut." },
        { id: "h3", title: "The byte and the board", content: "let sensor_level: u8 = 250; The annotation matters, because the methods need to know the type. Then sensor_level.wrapping_add(10), .saturating_add(10) and .checked_add(10). For the board: scene(\"crew\", crew); scene(\"hatch\", hatch); and so on." },
      ],
      tests: [
        {
          id: "t1",
          description: "The status line shows every value in the right format",
          assertionCode: js`
const line = lines.find((l) => l.includes("| crew"));
assert(line, "Print a status line like: Halcyon | crew 6 | depth 42 m | oxygen 87.5% | pumps true | hatch B");
assertEqual(line, "Halcyon | crew 6 | depth 42 m | oxygen 87.5% | pumps true | hatch B", "Status line");`,
        },
        {
          id: "t2",
          description: "The station name is sent as text",
          assertionCode: js`assertEqual(scene.station, "Halcyon", 'station (call scene("station", station); with the text "Halcyon")');`,
        },
        {
          id: "t3",
          description: "crew, depth and oxygen have the right values",
          assertionCode: js`
assertEqual(scene.crew, 6, "crew");
assertEqual(scene.depthM, 42, "depthM");
assertEqual(scene.oxygenPct, 87.5, "oxygenPct (100.0 minus 12.5; did you declare it with mut and use -= ?)");`,
        },
        {
          id: "t4",
          description: "A bool, a char and a shadowed value",
          assertionCode: js`
assertEqual(scene.pumpsOnline, true, "pumpsOnline");
assertEqual(scene.hatch, "B", "hatch (a char, written 'B' with single quotes)");
assertEqual(scene.tanks, 8, "tanks (shadow the 4 with let tanks = tanks * 2;)");`,
        },
        {
          id: "t5",
          description: "wrapping_add and saturating_add on a u8 at 250",
          assertionCode: js`
assertEqual(scene.wrappedLevel, 4, "wrappedLevel (250 + 10 wraps around a u8 to 4)");
assertEqual(scene.cappedLevel, 255, "cappedLevel (saturating_add stops at 255)");`,
        },
        {
          id: "t6",
          description: "checked_add reports None and the overflow line is printed",
          assertionCode: js`assert(lines.includes("Overflow: wrapped 4, capped 255, checked None"), 'Print the line "Overflow: wrapped 4, capped 255, checked None". Use {:?} for checked_level so the Option prints as None.');`,
        },
      ],
      unlocks: ["rs-oxygen"],
      checks: [
        {
          prompt: "What happens when you compile this?\n\n~~~rust\nlet depth = 42;\ndepth = 50;\n~~~",
          question: {
            type: "choice",
            options: [
              "It compiles and depth becomes 50",
              "error[E0384]: cannot assign twice to immutable variable `depth`",
              "It compiles but panics when it runs",
              "error: depth must be declared with a type",
            ],
            answer: 1,
          },
          explanation: "Bindings are immutable unless you write `let mut`. The compiler stops you at build time and even suggests the fix: `let mut depth = 42;`.",
        },
        {
          prompt: "After this code, what is `tanks`?\n\n~~~rust\nlet tanks = 4;\nlet tanks = tanks * 2;\n~~~",
          question: { type: "number", answer: 8 },
          explanation: "The second `let` creates a new variable that shadows the first, so from that line on `tanks` is `8`. It is not mutation: the original `4` still exists, it is just hidden by the new name.",
        },
        {
          prompt: "A `u8` holds `250`. Which call returns `None` for `+ 10`?",
          question: {
            type: "choice",
            options: ["`wrapping_add(10)`", "`saturating_add(10)`", "`checked_add(10)`", "`abs()`"],
            answer: 2,
          },
          explanation: "`checked_add` gives back an `Option`: `Some(sum)` when it fits and `None` when it would overflow. `wrapping_add` returns 4 and `saturating_add` returns 255, so those two always produce a number.",
        },
      ],
    },

    // ───────────────────────── 3 ─────────────────────────
    {
      id: "rust-basics-3-numbers",
      title: "Arithmetic and casts",
      minutes: 30,
      xp: 100,
      concepts: ["operators", "integer division", "remainder", "as casts", "float math", "type mismatch", "compound assignment"],
      learn: md`### The operators

\`+\`, \`-\`, \`*\`, \`/\` and \`%\` (remainder) work as you expect, with \`*\`, \`/\`, \`%\` before \`+\` and \`-\`. Use parentheses when the order is not obvious. \`x += 5\` is short for \`x = x + 5\`, and the same shorthand exists for \`-=\`, \`*=\`, \`/=\` and \`%=\`. There is no \`x++\` in Rust; write \`x += 1\`.

~~~rust
println!("{}", 2 + 3 * 4);     // 14
println!("{}", (2 + 3) * 4);   // 20
println!("{}", 17 % 5);        // 2    (17 = 3 * 5 + 2)
~~~

### Integer division throws the fraction away

When **both** sides are integers, \`/\` is integer division: the fraction is cut off (truncated toward zero), not rounded.

~~~rust
println!("{}", 135 / 60);     // 2
println!("{}", 135 % 60);     // 15    the remainder tells you what was cut off
println!("{}", -7 / 2);       // -3
~~~

The pair \`/\` and \`%\` is the right tool for splitting a total into units: 135 minutes is \`135 / 60\` = 2 hours and \`135 % 60\` = 15 minutes.

Dividing an integer by zero is a bug Rust refuses to hide. If the compiler can see it (\`let x = 10 / 0;\`) it is a compile error: *this operation will panic at runtime*. If the zero only arrives while running, the program panics with *attempt to divide by zero*. Floats behave differently: \`1.0 / 0.0\` is \`inf\`, and \`0.0 / 0.0\` is \`NaN\` ("not a number").

### No automatic mixing of types

Rust will not quietly mix number types, because every silent conversion is a place where a value can change meaning.

~~~rust
let crew: u32 = 6;
let oxygen_pct: f64 = 87.5;
let bad = crew + oxygen_pct;
~~~

~~~text
error[E0277]: cannot add \`f64\` to \`u32\`
 --> main.rs:4:20
  |
4 |     let bad = crew + oxygen_pct;
  |                    ^ no implementation for \`u32 + f64\`
~~~

Two different integer types fail too (\`i32 + u32\` is E0308: mismatched types, expected \`i32\`, found \`u32\`). The fix is to convert one side on purpose.

### \`as\`: convert on purpose

\`value as Type\` converts between number types. It always succeeds, so you need to know what it does when the value does not fit:

- **Integer to float** keeps the value (as exactly as the float allows): \`42 as f64\` is \`42.0\`.
- **Float to integer** **truncates** toward zero and **saturates** at the ends: \`3.99 as i32\` is \`3\`, \`-3.99 as i32\` is \`-3\`, \`300.7 as u8\` is \`255\`, and a \`NaN\` becomes \`0\`.
- **Integer to a smaller integer** keeps the low bits, so it **wraps**: \`300_i32 as u8\` is \`44\` (300 − 256), and \`-1_i32 as u32\` is \`4294967295\`.

~~~rust
let depth_m: i32 = 42;
let pressure = depth_m as f64 / 10.0 + 1.0;     // 5.2
let cut = 3.99_f64 as i32;                      // 3
let wrapped = 300_i32 as u8;                    // 44
~~~

\`as\` binds tighter than \`/\`, so \`depth_m as f64 / 10.0\` means \`(depth_m as f64) / 10.0\`. The classic beginner mistake is converting *after* an integer division, when the fraction is already gone: \`(a / b) as f64\` is not \`a as f64 / b as f64\`.

Because \`as\` never complains, it is a quiet place for bugs. Later you will meet \`try_from\`, which returns a \`Result\` when a number does not fit. For the exact, deliberate conversions in this course, \`as\` is the right tool.

### Float methods

Numbers have methods. A few you will use: \`x.abs()\`, \`x.sqrt()\`, \`x.powi(2)\` (integer power), \`x.round()\`, \`x.floor()\`, \`x.ceil()\`, \`a.min(b)\`, \`a.max(b)\`. They need to know the exact type they are working on. \`let n: f64 = 2.0; n.sqrt()\` is fine, but a bare literal such as \`2.pow(3)\` fails with error[E0689]: can't call method \`pow\` on ambiguous numeric type \`{integer}\`. Write \`2_i32.pow(3)\`, or give the variable a type.

### Floats are not exact

\`0.1 + 0.2\` is \`0.30000000000000004\`, in Rust as everywhere, because binary fractions cannot store 0.1 exactly. Use \`{:.2}\` when you display, and never compare two computed floats with \`==\`.

### Common mistakes

- Dividing two integers and expecting a fraction (\`7 / 2\` is 3).
- Casting the *result* of an integer division instead of the inputs.
- Mixing \`u32\` with \`i32\` or \`f64\` (E0308 and E0277). Convert one side with \`as\`.
- Expecting \`as\` to complain: \`-1 as u32\` happily becomes 4294967295.
- Trusting \`300 as u8\`. It is a valid cast and it means 44.`,
      mission: md`The diving schedule depends on arithmetic. Pressure grows by about one bar for every ten metres, a dive log stores minutes but the board shows hours and minutes, and the air supply has to be divided fairly between six divers.

Rust's numeric rules are strict on purpose, so you will walk into each one and then step around it. When this lesson passes, the **Pressure gauge** lights up with your numbers.`,
      tasks: [
        "Compute pressure_bar from depth_m: convert with as f64, divide by 10.0, add 1.0 (5.2 bar at 42 m)",
        "From let dive_minutes: u32 = 135 compute hours (/ 60) and minutes (% 60)",
        "From let tank_litres: u32 = 2000 compute litres_each: f64 by converting BOTH tank_litres and crew with as f64 before dividing",
        "Show three casts: cut_off = 3.99_f64 as i32, wrapped_byte = 300_i32 as u8 and negative_wrap = -1_i32 as u32",
        "Print: Pressure at 42 m: 5.20 bar, then Dive time: 2 h 15 min, then Air per diver: 333.3 L, then Casts: 3, 44, 4294967295",
        "Send pressureBar, hours, minutes, litresEach, cutOff, wrappedByte and negativeWrap to the board",
      ],
      starterAdd: rs`// ─── ✏️ YOUR TURN ───────────────────────────
// Lesson 3: pressure, time and a few casts.
// 1. let pressure_bar = depth_m as f64 / 10.0 + 1.0;                       -> 5.2
// 2. let dive_minutes: u32 = 135;  hours = dive_minutes / 60;  minutes = dive_minutes % 60;
// 3. let tank_litres: u32 = 2000;  litres_each = tank_litres as f64 / crew as f64;   -> 333.33...
// 4. cut_off = 3.99_f64 as i32;   wrapped_byte = 300_i32 as u8;   negative_wrap = -1_i32 as u32;
// Print:  Pressure at 42 m: 5.20 bar      ({pressure_bar:.2})
//         Dive time: 2 h 15 min
//         Air per diver: 333.3 L          ({litres_each:.1})
//         Casts: 3, 44, 4294967295
// scene keys: pressureBar, hours, minutes, litresEach, cutOff, wrappedByte, negativeWrap
`,
      solutionAdd: rs`// Lesson 3: pressure, time and a few casts.
let pressure_bar = depth_m as f64 / 10.0 + 1.0;

let dive_minutes: u32 = 135;
let hours = dive_minutes / 60;
let minutes = dive_minutes % 60;

let tank_litres: u32 = 2000;
let litres_each = tank_litres as f64 / crew as f64;

let cut_off = 3.99_f64 as i32;
let wrapped_byte = 300_i32 as u8;
let negative_wrap = -1_i32 as u32;

println!("Pressure at {depth_m} m: {pressure_bar:.2} bar");
println!("Dive time: {hours} h {minutes} min");
println!("Air per diver: {litres_each:.1} L");
println!("Casts: {cut_off}, {wrapped_byte}, {negative_wrap}");

scene("pressureBar", pressure_bar);
scene("hours", hours);
scene("minutes", minutes);
scene("litresEach", litres_each);
scene("cutOff", cut_off);
scene("wrappedByte", wrapped_byte);
scene("negativeWrap", negative_wrap);`,
      explanation:
        "depth_m is an i32, so it must be converted before it can join float arithmetic: depth_m as f64 / 10.0 + 1.0 is 5.2. Integer division and remainder split 135 minutes into 2 hours and 15 minutes. For the air per diver both operands are converted with as f64, because dividing two integers would have thrown the fraction away (2000 / 6 is 333). The three casts show the rules: a float truncates (3.99 becomes 3), a wider integer wraps into a u8 (300 becomes 44) and -1 as u32 wraps to the largest u32.",
      hints: [
        { id: "h1", title: "Mixing types", content: "depth_m is an i32 and 10.0 is a float, so convert first: let pressure_bar = depth_m as f64 / 10.0 + 1.0; The as binds tighter than the division." },
        { id: "h2", title: "Hours and minutes", content: "Integer division and remainder: let hours = dive_minutes / 60; let minutes = dive_minutes % 60; Both are u32, so no cast is needed there. For the air, convert both sides: tank_litres as f64 / crew as f64" },
        { id: "h3", title: "The casts and the lines", content: "let cut_off = 3.99_f64 as i32; let wrapped_byte = 300_i32 as u8; let negative_wrap = -1_i32 as u32; Print with println!(\"Pressure at {depth_m} m: {pressure_bar:.2} bar\"); and similar for the other lines." },
      ],
      tests: [
        {
          id: "t1",
          description: "Pressure at 42 m is 5.2 bar",
          assertionCode: js`
assertClose(scene.pressureBar, 5.2, 0.0001, "pressureBar (42 as f64 / 10.0 + 1.0)");
assert(lines.includes("Pressure at 42 m: 5.20 bar"), 'Print the line "Pressure at 42 m: 5.20 bar" with {pressure_bar:.2}.');`,
        },
        {
          id: "t2",
          description: "135 minutes is 2 hours 15 minutes",
          assertionCode: js`
assertEqual(scene.hours, 2, "hours (135 / 60 with integers)");
assertEqual(scene.minutes, 15, "minutes (135 % 60)");
assert(lines.includes("Dive time: 2 h 15 min"), 'Print the line "Dive time: 2 h 15 min".');`,
        },
        {
          id: "t3",
          description: "Air per diver keeps its fraction",
          assertionCode: js`
assert(typeof scene.litresEach === "number", 'Send litresEach with scene("litresEach", litres_each);');
assert(scene.litresEach !== 333, "litresEach is 333, so the division happened between two integers. Convert BOTH sides with as f64 first.");
assertClose(scene.litresEach, 333.3333, 0.01, "litresEach (2000 litres shared by 6 divers)");
assert(lines.includes("Air per diver: 333.3 L"), 'Print the line "Air per diver: 333.3 L" with {litres_each:.1}.');`,
        },
        {
          id: "t4",
          description: "A float truncates when cast to an integer",
          assertionCode: js`assertEqual(scene.cutOff, 3, "cutOff (3.99_f64 as i32 truncates, it does not round)");`,
        },
        {
          id: "t5",
          description: "Casting to a smaller or unsigned integer wraps",
          assertionCode: js`
assertEqual(scene.wrappedByte, 44, "wrappedByte (300_i32 as u8 keeps only the low 8 bits)");
assertEqual(scene.negativeWrap, 4294967295, "negativeWrap (-1_i32 as u32)");
assert(lines.includes("Casts: 3, 44, 4294967295"), 'Print the line "Casts: 3, 44, 4294967295".');`,
        },
      ],
      unlocks: ["rs-pressure"],
      checks: [
        {
          prompt: "What does `7 / 2` evaluate to when both numbers are integers?",
          question: { type: "number", answer: 3 },
          explanation: "Integer division truncates toward zero: `7 / 2` is `3`. For `3.5` one side has to be a float: `7.0 / 2.0`, or `7 as f64 / 2.0`. The remainder `7 % 2` is the `1` that was cut off.",
        },
        {
          prompt: "Why does `let total = crew + oxygen_pct;` not compile when `crew` is a `u32` and `oxygen_pct` is an `f64`?",
          question: {
            type: "choice",
            options: [
              "Rust never converts between number types automatically; you must convert one side with `as`",
              "f64 values can only be printed, not added",
              "u32 cannot be added to anything",
              "You must use `+=` instead of `+`",
            ],
            answer: 0,
          },
          explanation: "There is no implicit widening in Rust. The error is E0277 (cannot add `f64` to `u32`). Write `crew as f64 + oxygen_pct` to say which way the conversion should go.",
        },
        {
          prompt: "What is `300_i32 as u8`?",
          question: { type: "number", answer: 44 },
          explanation: "A cast to a narrower integer keeps only the low bits, which is the same as wrapping: 300 - 256 = 44. `as` never reports the loss, so use it only when you know the range, or use `try_from` when you do not.",
        },
      ],
    },
  ],
};
